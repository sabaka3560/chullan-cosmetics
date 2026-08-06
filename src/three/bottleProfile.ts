import * as THREE from 'three';

/**
 * Lathe profiles for the CHULLAN foundation bottle.
 *
 * Everything is authored in world units with the base of the bottle sitting on
 * y = 0, matching the proportions measured off `src/assets/bottle.png`:
 *
 *   cap height / body height   = 0.57
 *   cap radius / body radius   = 0.83
 *
 * A revolved profile (rather than a stack of cylinders) is what gives the
 * silhouette its fillets — the soft bottom edge and the domed cap lip are the
 * details that separate "a cylinder" from "a product".
 */

export const BODY_RADIUS = 0.5;
export const BODY_BASE_FILLET = 0.1;
/** Where the straight, printable wall stops and the shoulder begins. */
export const BODY_SHOULDER_Y = 1.84;
/** Height of the body as it reads in the reference photo (silhouette top). */
export const BODY_VISUAL_HEIGHT = 1.95;

const NECK_RADIUS = 0.3;
const NECK_START_Y = 2.0;
const NECK_END_Y = 2.22;

export const CAP_RADIUS = 0.415;
export const CAP_BOTTOM_Y = 1.92;
export const CAP_TOP_Y = 3.06;
const CAP_TOP_FILLET = 0.07;
const CAP_BASE_FILLET = 0.03;

/** Full height of the closed bottle — used for camera framing. */
export const BOTTLE_HEIGHT = CAP_TOP_Y;

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

/** Quadratic bezier sample, used for the shoulder sweep. */
function quad(p0: THREE.Vector2, c: THREE.Vector2, p1: THREE.Vector2, t: number) {
  const it = 1 - t;
  return v2(
    it * it * p0.x + 2 * it * t * c.x + t * t * p1.x,
    it * it * p0.y + 2 * it * t * c.y + t * t * p1.y,
  );
}

/**
 * Appends a quarter-round fillet. `startAngle`/`endAngle` sweep the arc centre
 * at (cx, cy); the first sample is skipped so profiles stay free of duplicate
 * points (duplicates produce zero-area triangles and NaN normals in Lathe).
 */
function fillet(
  out: THREE.Vector2[],
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  steps: number,
) {
  for (let i = 1; i <= steps; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / steps);
    out.push(v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
}

/**
 * Bottle body: filleted base → straight printable wall → shoulder → neck.
 * The profile runs bottom-to-top so Lathe's generated normals face outwards.
 */
export function createBodyProfile(): THREE.Vector2[] {
  const p: THREE.Vector2[] = [];
  const r = BODY_RADIUS;
  const f = BODY_BASE_FILLET;

  p.push(v2(0, 0));
  p.push(v2(r - f, 0));
  fillet(p, r - f, f, f, -Math.PI / 2, 0, 10);

  p.push(v2(r, BODY_SHOULDER_Y));

  const s0 = v2(r, BODY_SHOULDER_Y);
  const sc = v2(r, NECK_START_Y);
  const s1 = v2(NECK_RADIUS, NECK_START_Y);
  for (let i = 1; i <= 14; i++) p.push(quad(s0, sc, s1, i / 14));

  p.push(v2(NECK_RADIUS, NECK_END_Y));
  p.push(v2(0, NECK_END_Y));

  return p;
}

/** Cap: a solid revolve with a soft base rim and a domed top lip. */
export function createCapProfile(): THREE.Vector2[] {
  const p: THREE.Vector2[] = [];
  const r = CAP_RADIUS;

  p.push(v2(0, CAP_BOTTOM_Y));
  p.push(v2(r - CAP_BASE_FILLET, CAP_BOTTOM_Y));
  fillet(p, r - CAP_BASE_FILLET, CAP_BOTTOM_Y + CAP_BASE_FILLET, CAP_BASE_FILLET, -Math.PI / 2, 0, 5);

  p.push(v2(r, CAP_TOP_Y - CAP_TOP_FILLET));
  fillet(p, r - CAP_TOP_FILLET, CAP_TOP_Y - CAP_TOP_FILLET, CAP_TOP_FILLET, 0, Math.PI / 2, 10);

  p.push(v2(0, CAP_TOP_Y));

  return p;
}

/**
 * Lathe hands out `uv.y = pointIndex / (pointCount - 1)`, so a profile with
 * densely-sampled fillets squashes the texture wherever the fillets are. Remap
 * v to the vertex's actual height and the label wraps like a real print.
 *
 * `uv.x` is left alone: Lathe already emits `i / segments` with duplicated seam
 * columns at u = 0 and u = 1, which is exactly the angular mapping we want.
 */
export function remapProfileUVs(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return geometry;

  const min = box.min.y;
  const span = box.max.y - min;
  if (span <= 0) return geometry;

  for (let i = 0; i < position.count; i++) {
    uv.setY(i, (position.getY(i) - min) / span);
  }
  uv.needsUpdate = true;

  return geometry;
}
