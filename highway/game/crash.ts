// Contact between two cars seen from above: oriented boxes, separating-axis
// test, and an impulse at the contact that changes both cars' speeds and
// spins them about their centres. Road frame: x across (+ left), z along.
//
// A car is its planform where it has one: the outline of the model as seen
// from above (`planform`, the convex hull of its vertices), not the box
// around it. A box has corners a car does not: a nose or a tail is up to
// 0.35 m each side narrower than the widest point, so two boxes touched
// where the screen showed a gap. A car without one (the headless scripts)
// is its box.
import * as F from "./fmath.ts";

/** A point in a car's own frame: r across (+ right of a car heading +z, which is +x), f along (+ forward), m. */
export type Pt = [r: number, f: number];
export type Box = { x: number; z: number; yaw: number; w: number; l: number; hull?: Pt[] }; // yaw 0 = along +z
export type Contact = { nx: number; nz: number; depth: number; px: number; pz: number }; // normal from b to a

function axes(b: Box) {
  const c = F.cos(b.yaw), s = F.sin(b.yaw);
  return { fx: s, fz: c, rx: c, rz: -s }; // forward and right unit vectors
}
/** The outline in the car's frame: its hull, else the box's corners. */
const outline = (b: Box): Pt[] => b.hull ?? [[b.w / 2, b.l / 2], [-b.w / 2, b.l / 2], [-b.w / 2, -b.l / 2], [b.w / 2, -b.l / 2]];
function corners(b: Box): [number, number][] {
  const { fx, fz, rx, rz } = axes(b);
  return outline(b).map(([r, f]) => [b.x + fx * f + rx * r, b.z + fz * f + rz * r]);
}
/** Each edge's normal: the axes a separating line can lie across. */
function normals(c: [number, number][]): [number, number][] {
  return c.map(([x, z], i) => { const [x2, z2] = c[(i + 1) % c.length]; const ex = x2 - x, ez = z2 - z, n = F.hypot(ex, ez) || 1; return [ez / n, -ex / n] as [number, number]; });
}

/** The contact if the boxes overlap, else null. */
export function collide(a: Box, b: Box): Contact | null {
  if (Math.abs(a.z - b.z) > (a.l + b.l) / 2 + 1 || Math.abs(a.x - b.x) > (a.l + b.l) / 2 + 1) return null;
  const ca = corners(a), cb = corners(b);
  let best = Infinity, nx = 0, nz = 0;
  for (const [ax, az] of [...normals(ca), ...normals(cb)]) {
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
    for (const [x, z] of ca) { const p = x * ax + z * az; minA = Math.min(minA, p); maxA = Math.max(maxA, p); }
    for (const [x, z] of cb) { const p = x * ax + z * az; minB = Math.min(minB, p); maxB = Math.max(maxB, p); }
    const o = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (o <= 0) return null;
    if (o < best) {
      best = o;
      const d = (a.x - b.x) * ax + (a.z - b.z) * az;
      nx = d >= 0 ? ax : -ax; nz = d >= 0 ? az : -az;
    }
  }
  // the contact point: the deepest corner of either box inside the other, else the midpoint
  let px = (a.x + b.x) / 2, pz = (a.z + b.z) / 2, deepest = -Infinity;
  for (const [x, z] of ca) { const d = -((x - b.x) * nx + (z - b.z) * nz); if (inside(cb, x, z) && d > deepest) { deepest = d; px = x; pz = z; } }
  for (const [x, z] of cb) { const d = (x - a.x) * nx + (z - a.z) * nz; if (inside(ca, x, z) && d > deepest) { deepest = d; px = x; pz = z; } }
  return { nx, nz, depth: best, px, pz };
}

/** Whether a point is inside a convex outline (given in either winding), with 5 cm to spare. */
function inside(c: [number, number][], x: number, z: number) {
  let sign = 0;
  for (let i = 0; i < c.length; i++) {
    const [x1, z1] = c[i], [x2, z2] = c[(i + 1) % c.length], ex = x2 - x1, ez = z2 - z1, n = F.hypot(ex, ez) || 1;
    const d = (ex * (z - z1) - ez * (x - x1)) / n;
    if (Math.abs(d) <= 0.05) continue;
    if (sign && Math.sign(d) !== sign) return false;
    sign = Math.sign(d);
  }
  return true;
}

/**
 * A model's outline from above: the convex hull of its vertices (r, f),
 * counter-clockwise, cut to at most `max` points by dropping the one that
 * changes the area least, then pulled in by `inset` m across and `insetEnd`
 * m along on every side (scaled toward the centre, so it stays convex):
 * what is drawn, a hair inside it.
 */
export function planform(pts: Pt[], inset = 0, insetEnd = inset, max = 16): Pt[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [], upper: Pt[] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of [...p].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  while (hull.length > max) {
    let k = 0, least = Infinity;
    hull.forEach((q, i) => { const a = Math.abs(cross(hull[(i + hull.length - 1) % hull.length], q, hull[(i + 1) % hull.length])); if (a < least) { least = a; k = i; } });
    hull.splice(k, 1);
  }
  const hw = Math.max(...hull.map((q) => Math.abs(q[0]))), hl = Math.max(...hull.map((q) => Math.abs(q[1])));
  const sr = hw > inset ? 1 - inset / hw : 1, sf = hl > insetEnd ? 1 - insetEnd / hl : 1;
  const out = hull.map(([r, f]): Pt => [+(r * sr).toFixed(3), +(f * sf).toFixed(3)]);
  return out.filter((q, i) => { const n = out[(i + 1) % out.length]; return q[0] !== n[0] || q[1] !== n[1]; }); // rounding can make two one
}

/** A body that takes impulses: world velocity, yaw rate, mass and yaw inertia. */
export type Rigid = { x: number; z: number; vx: number; vz: number; r: number; m: number; I: number };

/** Push two bodies apart and exchange an impulse at the contact (restitution e, friction mu). */
export function resolve(a: Rigid, b: Rigid, c: Contact, e = 0.15, mu = 0.35) {
  const rax = c.px - a.x, raz = c.pz - a.z, rbx = c.px - b.x, rbz = c.pz - b.z;
  // velocity of each body at the contact (yaw rate about the vertical; v = w x r in 2D)
  const vax = a.vx + a.r * raz, vaz = a.vz - a.r * rax;
  const vbx = b.vx + b.r * rbz, vbz = b.vz - b.r * rbx;
  const rvx = vax - vbx, rvz = vaz - vbz;
  const vn = rvx * c.nx + rvz * c.nz;
  // separate them, by mass
  const total = a.m + b.m;
  a.x += c.nx * c.depth * (b.m / total); a.z += c.nz * c.depth * (b.m / total);
  b.x -= c.nx * c.depth * (a.m / total); b.z -= c.nz * c.depth * (a.m / total);
  if (vn > 0) return 0; // already parting
  const cross = (rx: number, rz: number, nx: number, nz: number) => rx * nz - rz * nx;
  const ra = cross(rax, raz, c.nx, c.nz), rb = cross(rbx, rbz, c.nx, c.nz);
  const k = 1 / a.m + 1 / b.m + (ra * ra) / a.I + (rb * rb) / b.I;
  const j = (-(1 + e) * vn) / k;
  apply(a, c.nx * j, c.nz * j, rax, raz);
  apply(b, -c.nx * j, -c.nz * j, rbx, rbz);
  // friction along the contact, capped by Coulomb
  const tx = rvx - vn * c.nx, tz = rvz - vn * c.nz, tl = F.hypot(tx, tz);
  if (tl > 1e-4) {
    const ux = tx / tl, uz = tz / tl;
    const rat = cross(rax, raz, ux, uz), rbt = cross(rbx, rbz, ux, uz);
    const kt = 1 / a.m + 1 / b.m + (rat * rat) / a.I + (rbt * rbt) / b.I;
    const jt = Math.min(tl / kt, mu * j);
    apply(a, -ux * jt, -uz * jt, rax, raz);
    apply(b, ux * jt, uz * jt, rbx, rbz);
  }
  return j; // the impulse, N s: how hard it was
}

function apply(b: Rigid, jx: number, jz: number, rx: number, rz: number) {
  b.vx += jx / b.m; b.vz += jz / b.m;
  b.r -= (rx * jz - rz * jx) / b.I;
}
