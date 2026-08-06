import * as THREE from 'three';
import { BODY_RADIUS, BODY_VISUAL_HEIGHT } from './bottleProfile';

/**
 * The bottle's print is baked into a CanvasTexture and wrapped around the body,
 * instead of being floated in front of it as flat geometry.
 *
 * Why: a flat text plane only touches a cylinder at the single point directly
 * facing the camera. Everywhere else the surface curves away, so the glyphs
 * visibly detach and overhang the silhouette — which is exactly what was wrong
 * before. A texture is on the surface by definition: it curves with it, takes
 * the same lighting, and disappears round the back like real print.
 *
 * Two maps come out of here:
 *   • albedo    — near-black substrate + white print (sRGB)
 *   • roughness — white body, darker under the print (linear data)
 *
 * The roughness map is what makes the print read as *printed*. Cured ink is
 * glossier than a soft-touch shell, and `roughnessFactor *= texelRoughness.g`,
 * so a 0.42 green under the glyphs turns the material's 0.62 into 0.26 there.
 *
 * Mapping contract (see `remapProfileUVs`):
 *   u = i / segments  →  u = 0 is the +Z face, towards camera
 *   v = (y - yMin) / (yMax - yMin)
 *
 * u = 0 is both the front *and* the geometry seam, so the artwork is drawn
 * centred in the canvas and the texture offset by 0.5. Both seam columns then
 * sample identical pixels and the join is invisible.
 */

/** Soft-touch black: ~1.7% linear. Pure #000 has no gradient left to shade. */
const SUBSTRATE = '#232327';
const PRINT = '#F4F3EF';
const PRINT_DIM = '#8C8C91';

/** Roughness channel. White = leave the material's value alone. */
const ROUGH_BODY = '#ffffff';
const ROUGH_PRINT = '#6b6b6b';
const ROUGH_PRINT_DIM = '#a8a8a8';

const DISPLAY_STACK = '"Archivo", "Arial Narrow", "Helvetica Neue", Arial, sans-serif';

/** The lathe body spans y = 0 .. 2.22; v is remapped across that whole extent. */
const MAPPED_HEIGHT = 2.22;

/** Proportions measured off `src/assets/bottle.png`, as fractions of the
 *  visible body height and diameter, so they survive profile edits. */
const ART = {
  wordmarkTop: 0.105,
  wordmarkBottom: 0.709,
  wordmarkCapHeight: 0.257,
  subtitleY: 0.816,
  subtitleCapHeight: 0.059,
  captionY: 0.863,
  captionCapHeight: 0.052,
};

type Ctx = CanvasRenderingContext2D;

type Palette = {
  substrate: string;
  print: string;
  printDim: string;
};

const ALBEDO_PALETTE: Palette = { substrate: SUBSTRATE, print: PRINT, printDim: PRINT_DIM };
const ROUGHNESS_PALETTE: Palette = {
  substrate: ROUGH_BODY,
  print: ROUGH_PRINT,
  printDim: ROUGH_PRINT_DIM,
};

/** Sets a font whose *measured* cap height matches `targetCap` in device px. */
function setFontForCapHeight(ctx: Ctx, weight: number, targetCap: number, sample: string) {
  let size = targetCap / 0.72;
  ctx.font = `${weight} ${size}px ${DISPLAY_STACK}`;
  const measured = ctx.measureText(sample).actualBoundingBoxAscent;
  if (measured > 0) {
    size *= targetCap / measured;
    ctx.font = `${weight} ${size}px ${DISPLAY_STACK}`;
  }
}

/**
 * Draws tracked-out text a glyph at a time. `ctx.letterSpacing` would be
 * shorter but it folds a trailing space into `measureText`, so hitting an exact
 * target width gets fiddly. Manual advance is deterministic everywhere.
 */
function drawTracked(ctx: Ctx, text: string, cx: number, baseline: number, targetWidth?: number) {
  const chars = [...text];
  const advances = chars.map((c) => ctx.measureText(c).width);
  const natural = advances.reduce((a, b) => a + b, 0);

  const tracking =
    targetWidth !== undefined && chars.length > 1
      ? (targetWidth - natural) / (chars.length - 1)
      : 0;

  let x = cx - (natural + tracking * (chars.length - 1)) / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, baseline);
    x += advances[i] + tracking;
  }
}

/** The small print block that lives on the back of a real bottle. */
function drawBackPanel(ctx: Ctx, pal: Palette, pxPerUnit: number, canvasWidth: number) {
  const panel = document.createElement('canvas');
  panel.width = Math.round(canvasWidth * 0.34);
  panel.height = Math.round(0.42 * pxPerUnit);
  const p = panel.getContext('2d');
  if (!p) return;

  p.fillStyle = pal.substrate;
  p.fillRect(0, 0, panel.width, panel.height);

  p.textAlign = 'left';
  p.textBaseline = 'alphabetic';
  p.fillStyle = pal.printDim;

  const cap = 0.03 * pxPerUnit;
  setFontForCapHeight(p, 600, cap, 'H');
  p.fillText('CHULLAN · MADE IN INDIA · 30ml e', panel.width * 0.14, panel.height * 0.34);
  p.fillText(
    'AQUA · GLYCERIN · SILICA · TOCOPHEROL',
    panel.width * 0.14,
    panel.height * 0.34 + cap * 2.1,
  );

  // A suggestion of a barcode — reads as authentic at product scale.
  const unit = pxPerUnit / 650;
  let x = panel.width * 0.14;
  const barY = panel.height * 0.58;
  const barH = panel.height * 0.26;
  for (let i = 0; i < 34 && x < panel.width * 0.62; i++) {
    const w = ((i * 37) % 3 === 0 ? 3 : 1.5) * unit;
    p.fillRect(x, barY, w, barH);
    x += w + 2.6 * unit;
  }

  // Straddle the wrap seam: the same panel at both canvas edges, so its two
  // halves meet seamlessly on the back of the bottle.
  const y = 0.6 * pxPerUnit;
  ctx.drawImage(panel, -panel.width / 2, y);
  ctx.drawImage(panel, canvasWidth - panel.width / 2, y);
}

function paint(ctx: Ctx, pal: Palette, width: number, height: number, pxPerUnit: number) {
  ctx.fillStyle = pal.substrate;
  ctx.fillRect(0, 0, width, height);

  /** world y → canvas y. Row 0 is the top of the bottle (flipY is on). */
  const toCanvasY = (worldY: number) => (MAPPED_HEIGHT - worldY) * pxPerUnit;
  /** fraction down the visible body → world y */
  const fromBodyFraction = (f: number) => BODY_VISUAL_HEIGHT * (1 - f);

  const diameter = BODY_RADIUS * 2;
  const centreX = width / 2;

  drawBackPanel(ctx, pal, pxPerUnit, width);

  // ── Wordmark: set vertically, reading top-to-bottom, as on the reference ──
  const wordTop = toCanvasY(fromBodyFraction(ART.wordmarkTop));
  const wordBottom = toCanvasY(fromBodyFraction(ART.wordmarkBottom));
  const wordLength = wordBottom - wordTop;
  const wordCap = ART.wordmarkCapHeight * diameter * pxPerUnit;

  ctx.save();
  ctx.translate(centreX, wordTop);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = pal.print;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  setFontForCapHeight(ctx, 800, wordCap, 'CHULLAN');
  // Rotated, the baseline runs down the bottle and the ascenders point screen
  // right, so shifting the baseline back by half the cap height centres the
  // wordmark on the body's axis.
  drawTracked(ctx, 'CHULLAN', wordLength / 2, wordCap / 2, wordLength);
  ctx.restore();

  // ── Sub-line and caption, set horizontally near the base ──
  ctx.fillStyle = pal.print;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const subCap = ART.subtitleCapHeight * diameter * pxPerUnit;
  setFontForCapHeight(ctx, 700, subCap, 'LUMINOUS MATTE');
  drawTracked(
    ctx,
    'LUMINOUS MATTE',
    centreX,
    toCanvasY(fromBodyFraction(ART.subtitleY)) + subCap / 2,
    0.6 * diameter * pxPerUnit,
  );

  const capCap = ART.captionCapHeight * diameter * pxPerUnit;
  setFontForCapHeight(ctx, 600, capCap, 'FOUNDATION');
  drawTracked(
    ctx,
    'FOUNDATION | 30ml e',
    centreX,
    toCanvasY(fromBodyFraction(ART.captionY)) + capCap / 2,
    0.62 * diameter * pxPerUnit,
  );
}

function configure(texture: THREE.CanvasTexture, anisotropy: number, srgb: boolean) {
  // Colour maps must be tagged sRGB — CanvasTexture defaults to NoColorSpace.
  // The roughness map must NOT be: it's data, not colour.
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  // Puts the artwork's centre on the +Z face and the seam on blank substrate.
  // Both maps need the identical transform, or the print's gloss would land
  // half a bottle away from the print.
  texture.offset.x = 0.5;
  texture.anisotropy = anisotropy;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
}

export type LabelMaps = {
  albedo: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  dispose: () => void;
};

/**
 * @param width  Texture width in px. Rule of thumb: `2π · onscreen_radius · dpr`
 *               — ~1024 for a product card, 2048 for the large showcase.
 * @param maxAnisotropy From `gl.capabilities.getMaxAnisotropy()`.
 */
export function createLabelMaps(width: number, maxAnisotropy: number): LabelMaps {
  const circumference = 2 * Math.PI * BODY_RADIUS;
  const pxPerUnit = width / circumference;
  const height = Math.round(MAPPED_HEIGHT * pxPerUnit);

  // A cylinder is the textbook anisotropic case — u compresses to nothing at
  // the silhouette while v doesn't. Without this the type mushes to grey well
  // before the edge. 8 is the knee; 16 costs bandwidth for no visible gain.
  const anisotropy = Math.min(8, maxAnisotropy);

  const make = (pal: Palette, srgb: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) paint(ctx, pal, width, height, pxPerUnit);
    const texture = new THREE.CanvasTexture(canvas);
    configure(texture, anisotropy, srgb);
    return texture;
  };

  const albedo = make(ALBEDO_PALETTE, true);
  const roughness = make(ROUGHNESS_PALETTE, false);

  return {
    albedo,
    roughness,
    dispose: () => {
      albedo.dispose();
      roughness.dispose();
    },
  };
}
