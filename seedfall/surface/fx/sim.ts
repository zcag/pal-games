// Particle spawning and simulation over the shared buffer (view.ts). Positions in tiles, velocities in
// tiles/s, gravity in tiles/s^2, size in art px. AUX holds a behaviour code (integer part) and a
// per-particle parameter (fraction). The renderer applies FADE and SHRINK from LIFE / MAX.
import { H, W } from "../../game/types.ts";
import { P, PF, STRIDE, type Particles } from "../view.ts";
import type { RGB } from "./content.ts";

/** Behaviours (AUX integer part). */
export const B = {
  NONE: 0,
  /** Fire spark: cools toward red as it dies (art 8.1 sparks `#ffe0a0` HDR 2 -> `#ff6a1a` 0.6). */
  HOT: 1,
  /** Sine drift sideways; fraction = phase. */
  DRIFT: 2,
  /** Grows; fraction x 8 = art px per second. */
  GROW: 3,
  /** Ambient: alpha = fraction x sin(pi k), hidden within 10 art px of the pod (art 6.2.3). */
  AMBIENT: 4,
  /** Ambient and drifting. */
  AMBIENT_DRIFT: 5,
  /** A one-frame stamp (rings, arcs, outlines): never simulated, dies next frame. */
  STAMP: 6,
} as const;

/** art px -> tiles */
export const PX = 1 / 16;

export interface SpawnOpts {
  vx?: number; vy?: number; life: number; size?: number; a?: number; hdr?: number; flags?: number; drag?: number; grav?: number; aux?: number;
}

export function spawn(ps: Particles, x: number, y: number, c: RGB, o: SpawnOpts): number {
  const off = ps.spawn();
  if (off < 0) return -1;
  const d = ps.data;
  d[off + P.X] = x; d[off + P.Y] = y;
  d[off + P.VX] = o.vx ?? 0; d[off + P.VY] = o.vy ?? 0;
  d[off + P.LIFE] = o.life; d[off + P.MAX] = o.life;
  d[off + P.SIZE] = o.size ?? 1;
  d[off + P.R] = c[0]; d[off + P.G] = c[1]; d[off + P.B] = c[2];
  d[off + P.A] = o.a ?? 1; d[off + P.HDR] = o.hdr ?? 0;
  d[off + P.FLAGS] = o.flags ?? 0; d[off + P.DRAG] = o.drag ?? 0; d[off + P.GRAV] = o.grav ?? 0; d[off + P.AUX] = o.aux ?? 0;
  return off;
}

/** A dot visible for exactly the coming frame (rings, arcs, outlines, piece heads). */
export function stamp(ps: Particles, x: number, y: number, c: RGB, a: number, hdr: number, add: boolean, size = 1) {
  return spawn(ps, x, y, c, { life: 1e-4, size, a, hdr, flags: add ? PF.ADD : 0, aux: B.STAMP });
}

export interface SimCtx {
  mat: Uint8Array;
  solid: Uint8Array;
  podX: number;
  podY: number;
  t: number;
}

/**
 * One step. Collision (COLLIDE): axis-separated against solid tiles, bounce 0.3 (fraction kept in
 * `bounce`), ground friction. Returns the count of live ambient particles.
 */
export function simulate(ps: Particles, dt: number, cx: SimCtx, bounce = 0.3): number {
  const d = ps.data, mat = cx.mat, solid = cx.solid, px = cx.podX, py = cx.podY;
  let amb = 0;
  let i = 0;
  while (i < ps.n) {
    const o = i * STRIDE;
    const aux = d[o + P.AUX];
    const kind = aux | 0;
    let life = d[o + P.LIFE] - dt;
    if (life <= 0 || kind === B.STAMP) { ps.kill(i); continue; }
    d[o + P.LIFE] = life;
    let vx = d[o + P.VX], vy = d[o + P.VY] + d[o + P.GRAV] * dt;
    const drag = d[o + P.DRAG];
    if (drag > 0) { const k = 1 / (1 + drag * dt); vx *= k; vy *= k; }
    let x = d[o + P.X], y = d[o + P.Y];
    if (kind !== 0) {
      const frac = aux - kind;
      const k = life / d[o + P.MAX];
      if (kind === B.HOT) {
        d[o + P.G] *= 1 - 4 * dt; d[o + P.B] *= 1 - 8 * dt; d[o + P.HDR] *= 1 - 4.5 * dt;
      } else if (kind === B.DRIFT || kind === B.AMBIENT_DRIFT) {
        x += Math.sin(life * 2.3 + frac * 6.283) * 0.12 * dt * (kind === B.DRIFT ? 3 : 1);
      } else if (kind === B.GROW) {
        d[o + P.SIZE] += frac * 8 * dt;
      }
      if (kind === B.AMBIENT || kind === B.AMBIENT_DRIFT) {
        amb++;
        const dx = x - px, dy = y - py;
        d[o + P.A] = dx * dx + dy * dy < 0.39 ? 0 : frac * Math.sin(3.14159 * k);
      }
    }
    let nx = x + vx * dt, ny = y + vy * dt;
    if (d[o + P.FLAGS] & 2 /* COLLIDE */) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const inside = iy >= 0 && iy < H && ix >= 0 && ix < W && solid[mat[iy * W + ix]] === 1;
      if (!inside) {
        const tx = Math.floor(nx);
        if (tx < 0 || tx >= W || (iy >= 0 && iy < H && solid[mat[iy * W + tx]] === 1)) { vx = -vx * bounce; nx = x; }
        const ty = Math.floor(ny), cx2 = Math.floor(nx);
        if (ty >= H || (ty >= 0 && solid[mat[ty * W + cx2]] === 1)) {
          // a bounce loses a third of its slide; resting on the floor rolls to a stop over ~0.3 s
          if (vy > 0) { if (vy > 1.2) { vx *= 0.7; vy = -vy * bounce; } else { vx *= 1 - Math.min(1, 7 * dt); vy = 0; } } else vy = -vy * bounce;
          ny = y;
        }
      }
    }
    d[o + P.X] = nx; d[o + P.Y] = ny; d[o + P.VX] = vx; d[o + P.VY] = vy;
    i++;
  }
  return amb;
}
