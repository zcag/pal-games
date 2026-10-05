// CPU particles in flat typed arrays (no objects, no per-frame allocation). Each particle
// is drawn as one sprite into the "under" batch (smoke, dust: depth pushed behind units) or
// the "over" batch (sparks, embers, shards). The oldest are recycled when the pool is full.
import type { RGB } from "./gl/common.ts";
import type { Sprites } from "./gl/sprites.ts";
import { C } from "./gl/atlas.ts";

let seed = 0x9e3779b9;
/** Fast seeded random in 0..1 (screenshots repeat exactly). */
export function rnd(): number {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
}
export const rr = (a: number, b: number) => a + (b - a) * rnd();
export function reseed(s: number): void { seed = s >>> 0 || 1; }

export const UNDER = 0, OVER = 1, BODY = 2;
export const F_STRETCH = 1, F_FADEIN = 2, F_BOUNCE = 4, F_GROW = 8;

export interface Preset {
  life: [number, number];
  speed: [number, number];
  /** 0 = isotropic sphere, 1 = upward hemisphere, 2 = flat ring (horizontal), 3 = along dir (cone) */
  shape: 0 | 1 | 2 | 3;
  up?: number;                 // extra upward velocity
  size: [number, number];      // u
  grow?: number;               // end size multiplier
  cell: number | readonly number[];
  c0: RGB; c1?: RGB;           // colour start/end (linear)
  e0?: number; e1?: number;    // intensity start/end
  a?: number;                  // alpha
  k?: number;                  // 0 additive .. 1 normal
  layer?: 0 | 1 | 2;
  grav?: number;               // u/s^2 downward
  drag?: number;               // per second
  spin?: number;               // rad/s range +-
  flags?: number;
  spread?: number;             // cone half angle for shape 3
  jitter?: number;             // position jitter radius
}

const CAP = 6000;
const X = new Float32Array(CAP), Y = new Float32Array(CAP), Z = new Float32Array(CAP);
const VX = new Float32Array(CAP), VY = new Float32Array(CAP), VZ = new Float32Array(CAP);
const AGE = new Float32Array(CAP), LIFE = new Float32Array(CAP), S0 = new Float32Array(CAP), S1 = new Float32Array(CAP);
const ROT = new Float32Array(CAP), VR = new Float32Array(CAP);
const R0 = new Float32Array(CAP), G0 = new Float32Array(CAP), B0 = new Float32Array(CAP);
const R1 = new Float32Array(CAP), G1 = new Float32Array(CAP), B1 = new Float32Array(CAP);
const A = new Float32Array(CAP), KK = new Float32Array(CAP), CELL = new Uint8Array(CAP), LAYER = new Uint8Array(CAP), FL = new Uint8Array(CAP);
const GRAV = new Float32Array(CAP), DRAG = new Float32Array(CAP);
let n = 0, ring = 0;

export function clearParticles(): void { n = 0; }
export function particleCount(): number { return n; }

function slot(): number {
  if (n < CAP) return n++;
  // pool full: overwrite round-robin (the oldest are mostly near the start after compaction)
  ring = (ring + 1) % CAP;
  return ring;
}

/** Budget scale (lowered under load; 200 enemies at 3x must stay smooth). */
export const budget = { scale: 1 };

/**
 * Emit `count` particles of a preset at a world point. `dx, dz` direction for cone shapes (world),
 * `sizeMul` scales size and speed together (bigger bursts for bigger bodies).
 */
export function emit(p: Preset, count: number, x: number, y: number, z: number, sizeMul = 1, dx = 0, dy = 0, dz = 0, tint?: RGB): void {
  const cnt = count < 1 ? (rnd() < count * budget.scale ? 1 : 0) : Math.max(1, Math.round(count * budget.scale));
  const c0 = tint ?? p.c0, c1 = p.c1 ?? c0;
  const e0 = p.e0 ?? 1, e1 = p.e1 ?? e0;
  for (let q = 0; q < cnt; q++) {
    const i = slot();
    const sp = rr(p.speed[0], p.speed[1]) * sizeMul;
    let vx = 0, vy = 0, vz = 0;
    if (p.shape === 3) {
      const l = Math.hypot(dx, dy, dz) || 1;
      const sa = p.spread ?? 0.4;
      const ox = rr(-sa, sa), oy = rr(-sa, sa) * 0.5;
      // rotate the direction by a small yaw (ox) and pitch (oy)
      const c = Math.cos(ox), s = Math.sin(ox);
      vx = ((dx * c - dz * s) / l) * sp; vz = ((dx * s + dz * c) / l) * sp; vy = (dy / l + oy) * sp;
    } else {
      const th = rnd() * Math.PI * 2;
      const u = p.shape === 2 ? 0 : p.shape === 1 ? rnd() : rr(-1, 1);
      const rxy = Math.sqrt(1 - u * u);
      vx = Math.cos(th) * rxy * sp; vz = Math.sin(th) * rxy * sp; vy = u * sp;
    }
    vy += (p.up ?? 0) * sizeMul;
    const j = (p.jitter ?? 0) * sizeMul;
    X[i] = x + (j ? rr(-j, j) : 0); Y[i] = y + (j ? rr(0, j * 0.6) : 0); Z[i] = z + (j ? rr(-j, j) : 0);
    VX[i] = vx; VY[i] = vy; VZ[i] = vz;
    AGE[i] = 0; LIFE[i] = rr(p.life[0], p.life[1]);
    const s = rr(p.size[0], p.size[1]) * sizeMul;
    S0[i] = s; S1[i] = s * (p.grow ?? 1);
    ROT[i] = rnd() * 6.283; VR[i] = p.spin ? rr(-p.spin, p.spin) : 0;
    R0[i] = c0[0] * e0; G0[i] = c0[1] * e0; B0[i] = c0[2] * e0;
    R1[i] = c1[0] * e1; G1[i] = c1[1] * e1; B1[i] = c1[2] * e1;
    A[i] = p.a ?? 1; KK[i] = p.k ?? 0; LAYER[i] = p.layer ?? OVER; FL[i] = p.flags ?? 0;
    const cell = p.cell;
    CELL[i] = typeof cell === "number" ? cell : cell[Math.floor(rnd() * cell.length)];
    GRAV[i] = p.grav ?? 0; DRAG[i] = p.drag ?? 0;
  }
}

/** Step and draw. `dt` fx seconds (0 during hitstop: they hold still but still draw). */
export function drawParticles(dt: number, under: Sprites, over: Sprites, body: Sprites): void {
  let i = 0;
  while (i < n) {
    AGE[i] += dt;
    if (AGE[i] >= LIFE[i]) {
      // swap-remove
      const j = --n;
      if (i !== j) copy(j, i);
      continue;
    }
    const d = DRAG[i];
    if (d > 0) { const f = Math.max(0, 1 - d * dt); VX[i] *= f; VY[i] *= f; VZ[i] *= f; }
    VY[i] -= GRAV[i] * dt;
    X[i] += VX[i] * dt; Y[i] += VY[i] * dt; Z[i] += VZ[i] * dt;
    if (Y[i] < 0.02 && (FL[i] & F_BOUNCE)) { Y[i] = 0.02; VY[i] = -VY[i] * 0.3; VX[i] *= 0.6; VZ[i] *= 0.6; }
    ROT[i] += VR[i] * dt;
    const t = AGE[i] / LIFE[i];
    const s = S0[i] + (S1[i] - S0[i]) * (FL[i] & F_GROW ? 1 - (1 - t) * (1 - t) : t);
    let a = A[i] * (t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1);
    if (FL[i] & F_FADEIN) a *= Math.min(1, t * 6);
    const r = R0[i] + (R1[i] - R0[i]) * t, g = G0[i] + (G1[i] - G0[i]) * t, b = B0[i] + (B1[i] - B0[i]) * t;
    const batch = LAYER[i] === UNDER ? under : LAYER[i] === BODY ? body : over;
    if (FL[i] & F_STRETCH) {
      const v = Math.hypot(VX[i], VY[i], VZ[i]);
      const sl = batch.add(X[i], Y[i], Z[i], s * (1 + v * 0.06) * 2.2, s * 0.5, CELL[i] === C.SPARK ? C.STREAK : CELL[i], r, g, b, a, KK[i], 0, 0);
      batch.axisOf(sl, VX[i], VY[i], VZ[i]);
    } else batch.add(X[i], Y[i], Z[i], s, s, CELL[i], r, g, b, a, KK[i], ROT[i], 0);
    i++;
  }
}

function copy(j: number, i: number): void {
  X[i] = X[j]; Y[i] = Y[j]; Z[i] = Z[j]; VX[i] = VX[j]; VY[i] = VY[j]; VZ[i] = VZ[j];
  AGE[i] = AGE[j]; LIFE[i] = LIFE[j]; S0[i] = S0[j]; S1[i] = S1[j]; ROT[i] = ROT[j]; VR[i] = VR[j];
  R0[i] = R0[j]; G0[i] = G0[j]; B0[i] = B0[j]; R1[i] = R1[j]; G1[i] = G1[j]; B1[i] = B1[j];
  A[i] = A[j]; KK[i] = KK[j]; CELL[i] = CELL[j]; LAYER[i] = LAYER[j]; FL[i] = FL[j]; GRAV[i] = GRAV[j]; DRAG[i] = DRAG[j];
}

/** Dev: a few live particles (position, velocity, age/life, cell). */
export function debugParticles(cell: number, max = 6): string[] {
  const out: string[] = [];
  for (let i = 0; i < n && out.length < max; i++) if (CELL[i] === cell) out.push([X[i], Y[i], Z[i], VX[i], VY[i], VZ[i], AGE[i], LIFE[i], S0[i]].map((v) => v.toFixed(2)).join(" "));
  return out;
}
