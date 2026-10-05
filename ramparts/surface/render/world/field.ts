// The slab's shared geometry facts: road distance field, slab boundary, terrain height, clearances.
// World coords (three): X right, Z = game y, map centre at the origin (api.ts toWorld).
import * as THREE from "../../vendor/three.js";
import type { BattleMap, Vec } from "../../../game/types.ts";

export const ROAD_HALF = 0.5;     // road core half-width (u): one path width is 1 u
export const ROAD_EDGE = 0.26;    // trodden edge band (art 2.2)
export const PAD_R = 0.8;         // R4: pad 1.6 u across
export const MARGIN = 1.5;        // dressing beyond the playable rect (art 1.1)
export const CORNER = 1.8;

export function hash2(x: number, y: number) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
export function noise2(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(x: number, y: number) { return noise2(x, y) * 0.55 + noise2(x * 2.03 + 7.1, y * 2.03 + 7.1) * 0.3 + noise2(x * 4.1 + 3.3, y * 4.1 + 3.3) * 0.15; }

/** Seeded rng for world dressing (separate from the rules' rng). */
export function mulberry(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RoadEnd { x: number; z: number; dx: number; dz: number; kind: "spawn" | "exit" }

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax, vz = bz - az, wx = px - ax, wz = pz - az;
  const l2 = vx * vx + vz * vz;
  let t = l2 > 0 ? (wx * vx + wz * vz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = px - ax - vx * t, dz = pz - az - vz * t;
  return Math.sqrt(dx * dx + dz * dz);
}

export class Field {
  readonly w: number; readonly h: number;
  readonly W2: number; readonly H2: number;
  readonly x0: number; readonly z0: number;
  readonly res = 0.1;
  readonly nx: number; readonly nz: number;
  readonly road: Float32Array;
  readonly roads: THREE.Vector2[][] = [];
  readonly ends: RoadEnd[] = [];
  readonly pads: { x: number; z: number; high: boolean }[] = [];
  readonly pools: { x: number; z: number; r: number }[] = [];
  /** Extra flat clearings (props, gates) the height function also flattens. */
  readonly flats: { x: number; z: number; r: number; y: number }[] = [];
  /** A stream from a pool to the slab edge (planned by water.planStream before the ground is built). */
  stream?: { pts: { x: number; z: number }[]; w: number; n: { x: number; z: number } };
  /** Occupied circles for dressing placement. */
  readonly taken: { x: number; z: number; r: number }[] = [];

  constructor(public map: BattleMap) {
    this.w = map.w; this.h = map.h;
    this.W2 = map.w / 2 + MARGIN; this.H2 = map.h / 2 + MARGIN;
    this.x0 = -this.W2 - 1; this.z0 = -this.H2 - 1;
    this.nx = Math.ceil((this.W2 * 2 + 2) / this.res) + 1;
    this.nz = Math.ceil((this.H2 * 2 + 2) / this.res) + 1;
    const toW = (p: Vec) => new THREE.Vector2(p.x - map.w / 2, p.y - map.h / 2);
    for (const lane of map.lanes) {
      const pts = lane.points.map(toW);
      if (pts.length < 2) continue;
      // extend both ends out through the slab edge, so the road meets the gates
      const ext = (a: THREE.Vector2, b: THREE.Vector2, kind: RoadEnd["kind"]) => {
        const d = this.edgeNormal(a) ?? a.clone().sub(b).normalize();
        const out = a.clone().add(d.clone().multiplyScalar(MARGIN + 1.5));
        const key = `${kind}${Math.round(a.x * 10)},${Math.round(a.y * 10)}`;
        if (!this.ends.some((e) => `${e.kind}${Math.round(e.x * 10)},${Math.round(e.z * 10)}` === key)) this.ends.push({ x: a.x, z: a.y, dx: d.x, dz: d.y, kind });
        return out;
      };
      const head = ext(pts[0]!, pts[1]!, "spawn"), tail = ext(pts[pts.length - 1]!, pts[pts.length - 2]!, "exit");
      this.roads.push(smoothRoad([head, ...pts, tail]));
    }
    for (const p of map.pads) this.pads.push({ x: p.x - map.w / 2, z: p.y - map.h / 2, high: !!p.high });
    for (const wv of map.water) this.pools.push({ x: wv.x - map.w / 2, z: wv.y - map.h / 2, r: wv.r });
    this.road = new Float32Array(this.nx * this.nz);
    this.computeRoad();
  }

  /** Outward normal of the playable edge a point sits on, if it sits on one. */
  private edgeNormal(p: THREE.Vector2): THREE.Vector2 | null {
    const hw = this.w / 2, hh = this.h / 2, e = 0.6;
    const c: [number, THREE.Vector2][] = [
      [Math.abs(p.x + hw), new THREE.Vector2(-1, 0)], [Math.abs(p.x - hw), new THREE.Vector2(1, 0)],
      [Math.abs(p.y + hh), new THREE.Vector2(0, -1)], [Math.abs(p.y - hh), new THREE.Vector2(0, 1)],
    ];
    c.sort((a, b) => a[0] - b[0]);
    return c[0]![0] < e ? c[0]![1] : null;
  }

  private computeRoad() {
    const segs: number[] = [];
    for (const r of this.roads) for (let i = 0; i + 1 < r.length; i++) segs.push(r[i]!.x, r[i]!.y, r[i + 1]!.x, r[i + 1]!.y);
    const { nx, nz, res, x0, z0 } = this;
    for (let j = 0; j < nz; j++) {
      const z = z0 + j * res;
      for (let i = 0; i < nx; i++) {
        const x = x0 + i * res;
        let best = 99;
        for (let s = 0; s < segs.length; s += 4) {
          // cheap reject on the bounding box
          const ax = segs[s]!, az = segs[s + 1]!, bx = segs[s + 2]!, bz = segs[s + 3]!;
          if (x < Math.min(ax, bx) - best || x > Math.max(ax, bx) + best || z < Math.min(az, bz) - best || z > Math.max(az, bz) + best) continue;
          const d = segDist(x, z, ax, az, bx, bz);
          if (d < best) best = d;
        }
        this.road[j * nx + i] = best;
      }
    }
  }

  dRoad(x: number, z: number) {
    const fx = (x - this.x0) / this.res, fz = (z - this.z0) / this.res;
    const i = Math.max(0, Math.min(this.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(this.nz - 2, Math.floor(fz)));
    const tx = Math.min(1, Math.max(0, fx - i)), tz = Math.min(1, Math.max(0, fz - j));
    const r = this.road, n = this.nx;
    const a = r[j * n + i]!, b = r[j * n + i + 1]!, c = r[(j + 1) * n + i]!, d = r[(j + 1) * n + i + 1]!;
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  dPad(x: number, z: number) {
    let best = 99;
    for (const p of this.pads) best = Math.min(best, Math.hypot(x - p.x, z - p.z));
    return best;
  }

  /** Slab boundary: signed distance (negative inside), a rounded rectangle with a gentle wobble. */
  sdf(x: number, z: number) {
    const qx = Math.abs(x) - this.W2 + CORNER, qz = Math.abs(z) - this.H2 + CORNER;
    const o = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - CORNER;
    return o - (noise2(x * 0.3 + 11, z * 0.3 + 5) - 0.5) * 0.7 * this.wobbleMask(x, z);
  }
  private wobbleMask(x: number, z: number) {
    let m = 1;
    for (const e of this.ends) m = Math.min(m, Math.min(1, Math.hypot(x - e.x - e.dx * MARGIN, z - e.z - e.dz * MARGIN) / 2.5));
    return m;
  }

  /** Move a point onto the boundary along the gradient (for points outside). */
  snap(x: number, z: number): [number, number] {
    for (let k = 0; k < 4; k++) {
      const d = this.sdf(x, z);
      if (d <= 0) break;
      const e = 0.01, gx = (this.sdf(x + e, z) - this.sdf(x - e, z)) / (2 * e), gz = (this.sdf(x, z + e) - this.sdf(x, z - e)) / (2 * e);
      const gl = Math.hypot(gx, gz) || 1;
      x -= (gx / gl) * d; z -= (gz / gl) * d;
    }
    return [x, z];
  }

  inPlay(x: number, z: number, pad = 0) { return Math.abs(x) < this.w / 2 - pad && Math.abs(z) < this.h / 2 - pad; }

  /** Terrain height: gentle noise, flat (0) under the road and pads, dipping under water, rolling off at the lip. */
  height(x: number, z: number) {
    const inside = this.inPlay(x, z);
    let h = (fbm(x * 0.16 + 3, z * 0.16 + 9) - 0.42) * (inside ? 0.5 : 0.8) * (this.map.theme === "desert" ? 1.8 : 1);
    if (!inside) {
      const out = Math.max(Math.abs(x) - this.w / 2, Math.abs(z) - this.h / 2);
      h += Math.min(out, 1) * 0.12;
    }
    const dr = this.dRoad(x, z) - ROAD_HALF - ROAD_EDGE;
    let m = THREE.MathUtils.smoothstep(dr, 0.05, 1.25);
    for (const p of this.pads) {
      const d = Math.hypot(x - p.x, z - p.z);
      m = Math.min(m, THREE.MathUtils.smoothstep(d, PAD_R + 0.15, PAD_R + 1.3));
    }
    for (const f of this.flats) {
      const d = Math.hypot(x - f.x, z - f.z);
      const k = THREE.MathUtils.smoothstep(d, f.r, f.r + 0.8);
      h = h * k + f.y * (1 - k);
      m = Math.max(m, 1 - k);
    }
    h *= m;
    for (const w of this.pools) {
      const d = Math.hypot(x - w.x, z - w.z);
      if (d < w.r + 0.5) h = Math.min(h, -0.42 * (1 - THREE.MathUtils.smoothstep(d, w.r * 0.35, w.r + 0.35)) + h * THREE.MathUtils.smoothstep(d, w.r - 0.2, w.r + 0.5));
    }
    if (this.stream) {
      const p = this.stream.pts;
      let d = 99;
      for (let i = 0; i + 1 < p.length; i++) d = Math.min(d, segDist(x, z, p[i]!.x, p[i]!.z, p[i + 1]!.x, p[i + 1]!.z));
      const k = THREE.MathUtils.smoothstep(d, this.stream.w / 2 - 0.1, this.stream.w / 2 + 0.45);
      h = h * k + -0.3 * (1 - k);
    }
    const s = this.sdf(x, z);
    if (s > -0.5) h -= (s + 0.5) * 0.18;
    return h;
  }

  /** Free space at a point: min distance to road edge, pads and taken circles. */
  clearance(x: number, z: number) {
    let c = this.dRoad(x, z) - ROAD_HALF - ROAD_EDGE;
    c = Math.min(c, this.dPad(x, z) - PAD_R);
    for (const t of this.taken) c = Math.min(c, Math.hypot(x - t.x, z - t.z) - t.r);
    for (const w of this.pools) c = Math.min(c, Math.hypot(x - w.x, z - w.z) - w.r - 0.2);
    if (this.stream) for (const p of this.stream.pts) c = Math.min(c, Math.hypot(x - p.x, z - p.z) - this.stream.w / 2 - 0.15);
    c = Math.min(c, -this.sdf(x, z));
    return c;
  }

  take(x: number, z: number, r: number) { this.taken.push({ x, z, r }); }

  /** The road distance field as a half-float texture for the ground shader. */
  roadTexture(): { tex: THREE.DataTexture; box: THREE.Vector4 } {
    const data = new Uint16Array(this.nx * this.nz);
    for (let i = 0; i < data.length; i++) data[i] = THREE.DataUtils.toHalfFloat(Math.min(this.road[i]!, 60));
    const tex = new THREE.DataTexture(data, this.nx, this.nz, THREE.RedFormat, THREE.HalfFloatType);
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    const box = new THREE.Vector4(this.x0 - this.res / 2, this.z0 - this.res / 2, 1 / (this.nx * this.res), 1 / (this.nz * this.res));
    return { tex, box };
  }
}

/** Resample a polyline at 0.2 u and relax it (moving average, ends pinned): generator corners
 *  become soft curves for drawing; the walked line stays within ~0.3 u, inside the road's edge band. */
function smoothRoad(pts: THREE.Vector2[]): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!, n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.2));
    for (let k = 0; k < n; k++) out.push(a.clone().lerp(b, k / n));
  }
  out.push(pts[pts.length - 1]!.clone());
  let cur = out;
  for (let it = 0; it < 3; it++) {
    const nxt = cur.map((p) => p.clone());
    for (let i = 3; i < cur.length - 3; i++) {
      const s = new THREE.Vector2();
      for (let k = -3; k <= 3; k++) s.add(cur[i + k]!);
      nxt[i] = s.multiplyScalar(1 / 7);
    }
    cur = nxt;
  }
  return cur;
}
