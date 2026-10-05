// The library of short-lived effects: each is a static draw function over a pooled record
// (see core.ts) plus a helper that starts it. Game coordinates in, world space out.
import type { Ctx, Timed } from "./core.ts";
import { C } from "./gl/atlas.ts";
import { D } from "./gl/decals.ts";
import { easeOutBack, easeOutCubic, type RGB } from "./gl/common.ts";
import { K } from "./palette.ts";
import { emit, rnd, rr } from "./particles.ts";
import { P } from "./presets.ts";

// ------------------------------------------------------------ flashes
/** Flash core: a blooming sphere, 120 ms (art 5.2/5.3). Over the scene but brief. */
function flashFn(c: Ctx, f: Timed, t: number): void {
  const a = (1 - t) ** 2;
  const s = f.r * (0.7 + 0.5 * easeOutCubic(t));
  c.over.add(c.wx(f.x), f.z, c.wz(f.y), s * 2, s * 2, C.GLOW, f.col[0] * f.a, f.col[1] * f.a, f.col[2] * f.a, a, 0);
}
export function flash(c: Ctx, x: number, y: number, z: number, r: number, col: RGB = K.warm, intensity = 3, dur = 0.12): Timed {
  const f = c.spawn(flashFn, dur, x, y, z, r); f.col = col; f.a = intensity; return f;
}

/** A light pool on the ground (additive, max 25%). */
function poolFn(c: Ctx, f: Timed, t: number): void {
  c.ground.add(c.wx(f.x), 0.02, c.wz(f.y), f.r, f.r, D.SOFT, 0, f.col[0], f.col[1], f.col[2], f.a * (1 - t), 0, 1.6);
}
export function lightPool(c: Ctx, x: number, y: number, r: number, col: RGB, a = 0.25, dur = 0.35): void {
  const f = c.spawn(poolFn, dur, x, y, 0, r); f.col = col; f.a = Math.min(0.25, a);
}

// ------------------------------------------------------------ ground rings
/** Expanding soft ring: shockwaves, dust rings, aura pulses. a = start radius frac, b = alpha, c = thickness, d = k. */
function waveFn(c: Ctx, f: Timed, t: number): void {
  const e = easeOutCubic(t);
  const r = f.r * (f.a + (1 - f.a) * e);
  c.ground.add(c.wx(f.x), 0.02 + f.z, c.wz(f.y), r, r, D.WAVE, 0, f.col[0], f.col[1], f.col[2], f.b * (1 - t) ** 1.3, f.d, f.c, 0, 0, 0, 0, 0, 0, 0, f.seed);
}
export function wave(c: Ctx, x: number, y: number, r: number, col: RGB, alpha: number, dur: number, from = 0.2, thick = 0.35, k = 0, z = 0): void {
  const f = c.spawn(waveFn, dur, x, y, z, r); f.col = col; f.a = from; f.b = alpha; f.c = thick; f.d = k;
}

/** A decal that just fades: scorch, crater, frost ring, cracks. a = alpha, b = shape, c = k, col2 in pts[0..2]. */
function decalFn(c: Ctx, f: Timed, t: number): void {
  const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  const grow = Math.min(1, (c.T - f.t0) / 0.12);
  const r = f.r * (0.6 + 0.4 * easeOutCubic(grow));
  c.ground.add(c.wx(f.x), 0.011, c.wz(f.y), r, r, f.b, f.d, f.col[0], f.col[1], f.col[2], f.a * fade, f.c, 0, 0, 0, 0, f.pts[0], f.pts[1], f.pts[2], f.pts[3], f.seed);
}
export function decal(c: Ctx, shape: number, x: number, y: number, r: number, col: RGB, alpha: number, dur: number, k = 1, col2?: RGB, a2 = 0, rot = 0): void {
  const f = c.spawn(decalFn, dur, x, y, 0, r); f.col = col; f.a = alpha; f.b = shape; f.c = k; f.d = rot;
  f.pts[0] = col2?.[0] ?? 0; f.pts[1] = col2?.[1] ?? 0; f.pts[2] = col2?.[2] ?? 0; f.pts[3] = a2;
}

/** A rune circle that draws in, spins and fades. */
function sigilFn(c: Ctx, f: Timed, t: number): void {
  const draw = Math.min(1, t / 0.35);
  const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
  const i = f.a;
  c.ground.add(c.wx(f.x), 0.022, c.wz(f.y), f.r, f.r, D.SIGIL, 0, f.col[0] * i, f.col[1] * i, f.col[2] * i, 0.85 * fade, 0.3, draw, 0, c.T * 0.8, 0, 0, 0, 0, 0, f.seed);
}
export function sigil(c: Ctx, x: number, y: number, r: number, col: RGB, dur = 0.9, intensity = 1.2): void {
  const f = c.spawn(sigilFn, dur, x, y, 0, r); f.col = col; f.a = intensity;
}

/** Heal pulse ring; broken (gaps, jitter) when the target was hexed. */
function healFn(c: Ctx, f: Timed, t: number): void {
  const r = f.r * (0.3 + 0.7 * easeOutCubic(t));
  c.ground.add(c.wx(f.x), 0.02, c.wz(f.y), r, r, D.HEAL, f.b ? t * 3 : 0, f.col[0] * 1.2, f.col[1] * 1.2, f.col[2] * 1.2, 0.3 * (1 - t), 0.3, 0, f.b, 0, 0, 0, 0, 0, 0, f.seed);
}
export function healRing(c: Ctx, x: number, y: number, r: number, broken: boolean): void {
  const f = c.spawn(healFn, 0.6, x, y, 0, r); f.col = broken ? K.hex : K.heal; f.b = broken ? 1 : 0;
}

// ------------------------------------------------------------ lightning
/**
 * Jagged polyline through world points (f.pts, f.n points); regenerated every 40 ms, 120 ms at
 * full, then an 80 ms after-image at 30% (art 5.1). The brightest thing in the game: emissive 4.
 */
const JAG = new Float32Array(64 * 3);
let jh = 1;
function jr(): number { jh = (jh * 48271) % 2147483647; return (jh % 10000) / 10000 - 0.5; }
function boltFn(c: Ctx, f: Timed, _t: number, age: number): void {
  const life = f.dur;
  const after = age > life - 0.08;
  const a = after ? 0.3 * (1 - (age - (life - 0.08)) / 0.08) : 1;
  const frameSeed = Math.floor(age / 0.04) + f.seed * 13;
  const col = f.col;
  for (let s = 0; s + 1 < f.n; s++) {
    const ax = f.pts[s * 3], ay = f.pts[s * 3 + 1], az = f.pts[s * 3 + 2];
    const bx = f.pts[s * 3 + 3], by = f.pts[s * 3 + 4], bz = f.pts[s * 3 + 5];
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    const segs = Math.max(4, Math.min(12, Math.round(len * 3)));
    // perpendiculars
    let px = -(bz - az), pz = bx - ax; const pl = Math.hypot(px, pz) || 1; px /= pl; pz /= pl;
    jh = ((frameSeed * 7919 + s * 104729) % 1_000_003) + 1;
    for (let k = 0; k <= segs; k++) {
      const u = k / segs, env = Math.sin(u * Math.PI);
      const off = k === 0 || k === segs ? 0 : jr() * 0.5 * env * Math.min(1.2, len * 0.25);
      JAG[k * 3] = ax + (bx - ax) * u + px * off;
      JAG[k * 3 + 1] = ay + (by - ay) * u + jr() * 0.25 * env;
      JAG[k * 3 + 2] = az + (bz - az) * u + pz * off;
    }
    for (let k = 0; k < segs; k++) {
      const x0 = JAG[k * 3], y0 = JAG[k * 3 + 1], z0 = JAG[k * 3 + 2], x1 = JAG[k * 3 + 3], y1 = JAG[k * 3 + 4], z1 = JAG[k * 3 + 5];
      c.lines.seg(x0, y0, z0, x1, y1, z1, 0.16 * f.r, 5, 1, 0, col[0] * 1.1, col[1] * 1.1, col[2] * 1.3, 0.6 * a);
      c.lines.seg(x0, y0, z0, x1, y1, z1, 0.04 * f.r, 1.6, 0.35, 0, 4, 4, 4, a);
    }
  }
}
export function lightning(c: Ctx, pts: Float32Array, n: number, col: RGB = K.storm, width = 1, dur = 0.2): void {
  const f = c.spawn(boltFn, dur, 0, 0, 0, width);
  f.pts.set(pts.subarray(0, Math.min(n, 16) * 3)); f.n = Math.min(n, 16); f.col = col;
}

// ------------------------------------------------------------ beams and columns
/** A vertical light column (specialise, reinforcements, judgement): RAY sprite, alpha <= 0.5. */
function columnFn(c: Ctx, f: Timed, t: number): void {
  const inT = Math.min(1, t / 0.15), out = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
  const a = f.a * inT * out;
  const h = f.b;
  c.over.add(c.wx(f.x), h * 0.5, c.wz(f.y), f.r * 2 * (0.6 + 0.4 * inT), h, C.RAY, f.col[0] * f.c, f.col[1] * f.c, f.col[2] * f.c, a, 0, 0, 0, f.col[0], f.col[1], f.col[2]);
  c.ground.add(c.wx(f.x), 0.02, c.wz(f.y), f.r * 2.2, f.r * 2.2, D.SOFT, 0, f.col[0], f.col[1], f.col[2], 0.25 * a, 0, 1.4);
}
export function column(c: Ctx, x: number, y: number, r: number, h: number, col: RGB, alpha = 0.5, dur = 0.9, intensity = 1): void {
  const f = c.spawn(columnFn, dur, x, y, 0, r); f.col = col; f.a = alpha; f.b = h; f.c = intensity;
}

/** A beam from the sky onto a point (judgement): lines + ground burst. */
function skyBeamFn(c: Ctx, f: Timed, t: number): void {
  const X = c.wx(f.x), Z = c.wz(f.y);
  const a = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9;
  const w = f.r * (1 - t * 0.6);
  c.lines.seg(X, 0, Z, X + 0.6, 12, Z - 1.2, w * 2.2, 6, 1, 0, f.col[0] * 1.6, f.col[1] * 1.6, f.col[2] * 1.6, 0.5 * a);
  c.lines.seg(X, 0, Z, X + 0.6, 12, Z - 1.2, w * 0.5, 2, 0.4, 0, 3.2, 3.2, 3.0, a);
}
export function skyBeam(c: Ctx, x: number, y: number, w: number, col: RGB, dur = 0.45): void {
  const f = c.spawn(skyBeamFn, dur, x, y, 0, w); f.col = col;
}

// ------------------------------------------------------------ chunks (kill bursts)
/**
 * One low-poly chunk on a ballistic arc: analytic, no state. Flies ~600 ms, rests, then sinks.
 * x/y/z start (world), a/b/c velocity, d spin, r size.
 */
function chunkFn(c: Ctx, f: Timed, _t: number, age: number): void {
  const fly = Math.min(age, 0.6);
  const g = 14;
  let y = f.z + f.b * fly - 0.5 * g * fly * fly;
  let x = f.x + f.a * fly, z = f.y + f.c * fly;
  const ground = f.r * 0.5;
  if (y < ground) {
    // find the landing time and stop there
    const disc = f.b * f.b + 2 * g * (f.z - ground);
    const tl = (f.b + Math.sqrt(Math.max(0, disc))) / g;
    x = f.x + f.a * tl; z = f.y + f.c * tl; y = ground;
  }
  const sink = age > 0.7 ? (age - 0.7) / (f.dur - 0.7) : 0;
  y -= sink * f.r * 1.6;
  const rot = f.d * Math.min(age, 0.6);
  const s = f.r * (1 - sink * 0.4);
  c.chunk.add(x, y, z, rot, rot * 0.7, rot * 0.3, s, s * 0.8, s, f.col[0], f.col[1], f.col[2], 1, 0, 0.25);
}
export function chunks(c: Ctx, X: number, Y: number, Z: number, n: number, size: number, body: RGB, key: RGB, spd = 1): void {
  for (let i = 0; i < n; i++) {
    const f = c.spawn(chunkFn, 1.0, X, Z, Y, size * rr(0.6, 1.1));
    const a = rnd() * Math.PI * 2, s = rr(1.2, 2.6) * spd;
    f.a = Math.cos(a) * s; f.c = Math.sin(a) * s; f.b = rr(2.5, 4.5) * Math.sqrt(spd); f.d = rr(-12, 12);
    f.col = i % 3 === 0 ? key : body;
  }
}

// ------------------------------------------------------------ spikes (frost nova, bramble, barrier)
/** Spikes popping up along a ring: a = count, b = height, col; easeOutBack up, sink at the end. */
function spikesFn(c: Ctx, f: Timed, t: number): void {
  const n = f.a | 0;
  const up = easeOutBack(Math.min(1, t / 0.25)), down = t > 0.6 ? (t - 0.6) / 0.4 : 0;
  const h = f.b * up * (1 - down);
  if (h <= 0.01) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + f.seed;
    const rr2 = f.r * (0.92 + 0.12 * Math.sin(i * 7.3 + f.seed));
    const x = c.wx(f.x) + Math.cos(a) * rr2, z = c.wz(f.y) + Math.sin(a) * rr2;
    const hh = h * (0.7 + 0.3 * Math.sin(i * 3.1 + f.seed * 2));
    c.spike.add(x, 0, z, a, Math.cos(a) * 0.25, Math.sin(a) * 0.25, hh * 0.18, hh, hh * 0.18, f.col[0], f.col[1], f.col[2], 1, f.c, 0.8);
  }
}
export function spikes(c: Ctx, x: number, y: number, r: number, n: number, h: number, col: RGB, em = 0, dur = 0.7): void {
  const f = c.spawn(spikesFn, dur, x, y, 0, r); f.a = n; f.b = h; f.col = col; f.c = em;
}

// ------------------------------------------------------------ emitters
/** Calls an emitter every `rate` seconds for its duration: build sparkle, burning fields, sky motes. */
type Emit = (c: Ctx, f: Timed, t: number) => void;
const EMITTERS: Emit[] = [];
function emitterFn(c: Ctx, f: Timed, t: number): void {
  if (c.T < f.e) return;
  f.e = c.T + f.d;
  EMITTERS[f.id](c, f, t);
}
export function emitter(c: Ctx, which: Emit, dur: number, rate: number, x: number, y: number, r = 0, col: RGB = K.gold): Timed {
  let id = EMITTERS.indexOf(which);
  if (id < 0) { id = EMITTERS.length; EMITTERS.push(which); }
  const f = c.spawn(emitterFn, dur, x, y, 0, r); f.id = id; f.d = rate; f.e = 0; f.col = col; return f;
}

/** Stamp for the hexer: a rune sigil under the target. */
export function runeStamp(c: Ctx, x: number, y: number): void { sigil(c, x, y, 0.55, K.hex, 0.6, 1.3); }

/** Sprite that pops and fades in place (crit star, "!", glyph flashes). a = size, b = intensity. */
function popFn(c: Ctx, f: Timed, t: number): void {
  const s = f.a * (t < 0.25 ? easeOutBack(t / 0.25) : 1);
  const al = t > 0.5 ? 1 - (t - 0.5) / 0.5 : 1;
  c.over.add(c.wx(f.x), f.z, c.wz(f.y), s, s, f.id, f.col[0] * f.b, f.col[1] * f.b, f.col[2] * f.b, al, f.c, f.d + t * f.e, f.r);
}
export function pop(c: Ctx, cell: number, x: number, y: number, z: number, size: number, col: RGB, intensity = 1.5, dur = 0.35, k = 0, px = false, spin = 0): void {
  const f = c.spawn(popFn, dur, x, y, z, px ? 1 : 0); f.id = cell; f.a = size; f.col = col; f.b = intensity; f.c = k; f.d = rnd() * 0.5; f.e = spin;
}

/** Rising light motes in a disc (build sparkle, auras). */
export const sparkleEmit: Emit = (c, f) => {
  const a = rnd() * Math.PI * 2, r = f.r * Math.sqrt(rnd());
  emit(P.light, 1, c.wx(f.x) + Math.cos(a) * r, 0.2 + rnd() * 0.6, c.wz(f.y) + Math.sin(a) * r, 1, 0, 0, 0, f.col);
};
export const smokeEmit: Emit = (c, f) => { emit(P.smokeThin, 1, c.wx(f.x) + rr(-0.2, 0.2), f.z + 0.1, c.wz(f.y) + rr(-0.2, 0.2), 1.3); };
export const flameEmit: Emit = (c, f) => {
  const a = rnd() * Math.PI * 2, r = f.r * Math.sqrt(rnd());
  emit(P.flame, 1, c.wx(f.x) + Math.cos(a) * r, 0.05, c.wz(f.y) + Math.sin(a) * r, 0.9);
};
