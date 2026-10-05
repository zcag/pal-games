// Camera trauma (art.md 8.2): offset = 4 art px x trauma^2 x noise(t x 18 Hz) per axis, decay 1.6/s.
// Offset only, never rotation or zoom (R12, R13). The core pulse adds a sway (art 1.2), not trauma.

const h1 = (i: number, s: number) => {
  let h = Math.imul(i | 0, 374761393) + Math.imul(s, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
};
/** Smooth 1D value noise in -1..1. */
const noise1 = (t: number, s: number) => {
  const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
  return h1(i, s) + (h1(i + 1, s) - h1(i, s)) * u;
};

export class Shake {
  trauma = 0;
  /** Seconds since the last core pulse (sway), Infinity when none. */
  private sway = Infinity;
  /** Accessibility: "reduce shake" (art.md 11.5). */
  scale = 1;
  x = 0;
  y = 0;

  add(t: number) { this.trauma = Math.min(1, this.trauma + t); }
  pulse() { this.sway = 0; }

  update(dt: number, t: number) {
    this.trauma = Math.max(0, this.trauma - 1.6 * dt);
    const m = (4 / 16) * this.trauma * this.trauma * this.scale; // tiles
    this.x = m * noise1(t * 18, 11);
    this.y = m * noise1(t * 18, 29);
    if (this.sway < 0.6) {
      this.sway += dt;
      const k = Math.min(1, this.sway / 0.6);
      this.y += (2 / 16) * Math.sin(k * Math.PI * 2) * (1 - k) * this.scale;
    }
  }
}
