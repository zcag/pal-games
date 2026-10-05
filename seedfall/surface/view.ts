// Shared surface-side contracts: the camera, dynamic lights and the particle buffer.
// Owned by the lead. FX writes lights and particles; the renderer reads them; the UI maps world to screen.

/** Camera in tile units (centre of the view) plus the scale the renderer chose this frame. */
export interface Camera {
  x: number;
  y: number;
  /** CSS pixels per tile (renderer sets it on resize). */
  tilePx: number;
  /** Canvas size in CSS px. */
  w: number;
  h: number;
}

export const worldToScreen = (c: Camera, x: number, y: number) => ({ x: (x - c.x) * c.tilePx + c.w / 2, y: (y - c.y) * c.tilePx + c.h / 2 });

export interface Light {
  /** Position in tiles. */
  x: number;
  y: number;
  /** Radius in tiles. */
  r: number;
  /** Linear RGB 0..1 and intensity (HDR). */
  color: [number, number, number];
  i: number;
  /** Cone direction (radians, 0 = right, pi/2 = down) and half-angle; omit for an omni light. */
  dir?: number;
  half?: number;
  /** Lights flagged force always get a slot (explosions, flashes). */
  force?: boolean;
}

/** Particle layout: STRIDE floats each. The FX module simulates; the renderer draws the first `n`. */
export const P = { X: 0, Y: 1, VX: 2, VY: 3, LIFE: 4, MAX: 5, SIZE: 6, R: 7, G: 8, B: 9, A: 10, HDR: 11, FLAGS: 12, DRAG: 13, GRAV: 14, AUX: 15 } as const;
export const STRIDE = 16;
/** FLAGS bits */
export const PF = { ADD: 1, COLLIDE: 2, BEHIND: 4, FADE: 8, SHRINK: 16 } as const;

export class Particles {
  readonly data: Float32Array;
  n = 0;
  constructor(readonly cap = 4096) { this.data = new Float32Array(cap * STRIDE); }
  /** Returns the base offset of a new particle, or -1 when full. Position in tiles, size in art px. */
  spawn(): number {
    if (this.n >= this.cap) return -1;
    const o = this.n++ * STRIDE;
    this.data.fill(0, o, o + STRIDE);
    return o;
  }
  kill(i: number) {
    const last = --this.n;
    if (i !== last) this.data.copyWithin(i * STRIDE, last * STRIDE, last * STRIDE + STRIDE);
  }
}

/** Full-view post effects the FX and UI modules drive; the renderer applies them in its final pass. */
export interface PostFx {
  flash: number; // white add 0..1
  flashColor: [number, number, number];
  aberration: number; // art px 0..1
  haze: number; // heat haze amplitude 0..1
  dim: number; // menu dim 0..1 (art.md 9.4)
  vignettePulse: number; // red low-hull pulse 0..1
  wash: number; // white-out for launch / teleport 0..1
}
