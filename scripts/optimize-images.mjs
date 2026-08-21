import sharp from 'sharp';
import { readdir, stat, rename } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Re-encodes the photography in `src/assets/` in place.
 *
 * This exists because the generated product images arrive at roughly four times
 * the weight they need. The generator writes JPEG at near-lossless quality, so
 * the first three came in at 526, 570 and 592 kB; at quality 85 they are 115,
 * 131 and 148 kB with no visible difference. The hero is `fetchPriority="high"`
 * and decodes before anything else paints, so that difference is the largest
 * single lever on what a phone on a slow connection waits for.
 *
 * Run it after dropping new artwork in, before committing:
 *
 *     npm run optimize-images
 *
 * It is safe to run twice. Re-encoding an already-encoded file at the same
 * quality is close to a no-op, and anything that would not get meaningfully
 * smaller is skipped rather than rewritten — so a repeat run does not quietly
 * grind the same images down a generation at a time.
 *
 *
 * WHY 4:4:4 CHROMA
 *
 * The default 4:2:0 halves the colour resolution, which is invisible on most
 * photographs and very visible on these: every one is thin gold lettering on a
 * near-black ground, which is precisely the high-contrast coloured edge that
 * subsampling smears. Full chroma costs a few kB and keeps the wordmark crisp.
 *
 *
 * WHY PNG IS LEFT ALONE
 *
 * `bottle.png` and `tube.png` would shrink by ~45% as quantised PNG, but they
 * are smooth dark gradients and quantisation bands them — and `bottle.png` is
 * the poster the 3D stage shows before WebGL mounts, so the banding would be on
 * screen. Converting them to JPEG is the real fix and needs their imports
 * changed, so it is a deliberate edit rather than something this script should
 * do behind your back.
 */

const DIR = 'src/assets';
const QUALITY = 85;
/** Below this, the rewrite is not worth the churn in git history. */
const MIN_SAVING = 0.1;

const kb = (bytes) => `${Math.round(bytes / 1024)} kB`;

const files = (await readdir(DIR)).filter((name) => /\.jpe?g$/i.test(name));
if (files.length === 0) {
  console.log('No JPEGs in', DIR);
  process.exit(0);
}

let before = 0;
let after = 0;
let rewritten = 0;

for (const name of files) {
  const path = join(DIR, name);
  const original = (await stat(path)).size;

  const encoded = await sharp(path)
    .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();

  before += original;

  if (1 - encoded.length / original < MIN_SAVING) {
    after += original;
    console.log(`  ${name.padEnd(30)} ${kb(original).padStart(8)}  already optimised`);
    continue;
  }

  // Written beside the original and renamed over it, so an interrupted run
  // cannot leave a half-written image where a valid one used to be.
  const temporary = `${path}.tmp`;
  await sharp(encoded).toFile(temporary);
  await rename(temporary, path);

  after += encoded.length;
  rewritten += 1;
  const saved = Math.round(100 - (encoded.length / original) * 100);
  console.log(
    `  ${name.padEnd(30)} ${kb(original).padStart(8)} -> ${kb(encoded.length).padStart(8)}  (${saved}% smaller)`,
  );
}

console.log(
  `\n${rewritten} of ${files.length} rewritten — ${kb(before)} -> ${kb(after)}, saved ${kb(before - after)}`,
);
