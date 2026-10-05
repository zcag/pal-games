// Light grids at tile resolution (art.md 2.3): skylight swept down open shafts, and static emitters
// (glowing ores, lava, crystal lining, glowcaps, lanterns, the Lift's lamps) spread by a short march
// that loses more through rock than through air. Both cover a 48-column window of rows around the
// camera and are sampled bilinearly by the light pass.
import { FLAG, H, SKY_ROWS, W, type WorldData } from "../../game/types.ts";
import { KIND, type Tables } from "./content.ts";
import { LIFT_LIGHT, LIFT_SEGMENTS, hash01, hexLin, type RGB } from "./look.ts";

export const GRID_ROWS = 72;

export class Grids {
  /** First tile row of the window (may be negative: sky rows). */
  top = -9999;
  readonly sky = new Float32Array(W * GRID_ROWS * 4);
  readonly emit = new Float32Array(W * GRID_ROWS * 4);
  skyDirty = true;
  emitDirty = true;
  private skyAt = -1e9;
  private liftDepth = -1;

  constructor(private t: Tables) {}

  /** Keep the camera row inside the window; returns true when the textures need an upload. */
  update(w: WorldData, camRow: number, viewRows: number, skyCol: RGB, time: number, liftDepth: number, dirty: number[]): boolean {
    const want = Math.floor(camRow - GRID_ROWS / 2);
    const lo = camRow - viewRows / 2 - 6, hi = camRow + viewRows / 2 + 6;
    if (lo < this.top || hi > this.top + GRID_ROWS) { this.top = Math.max(-SKY_ROWS, Math.min(H - GRID_ROWS, want)); this.skyDirty = this.emitDirty = true; }
    for (const i of dirty) {
      const y = Math.floor(i / W);
      if (y >= this.top - 5 && y < this.top + GRID_ROWS + 5) { this.emitDirty = true; if (y < this.top + GRID_ROWS && this.top < 140) this.skyDirty = true; }
    }
    if (liftDepth !== this.liftDepth) { this.liftDepth = liftDepth; this.emitDirty = true; }
    if (this.top < 140 && time - this.skyAt > 2) this.skyDirty = true;
    let up = false;
    if (this.skyDirty) { this.sweepSky(w, skyCol); this.skyAt = time; this.skyDirty = false; up = true; }
    if (this.emitDirty) { this.spreadEmitters(w, liftDepth); this.emitDirty = false; up = true; }
    return up;
  }

  private solid(w: WorldData, x: number, y: number) {
    if (x < 0 || x >= W || y >= H) return true;
    if (y < 0) return false;
    const k = this.t.matInfo[w.mat[y * W + x]]?.kind ?? 0;
    return k === KIND.DIG || k === KIND.UNDIG;
  }
  private dens(w: WorldData, x: number, y: number) {
    if (x < 0 || x >= W || y >= H) return 1;
    if (y < 0) return 0;
    return this.t.matInfo[w.mat[y * W + x]]?.density ?? 0;
  }

  /** Skylight: row 0 air gets the sky; x0.97 per tile down through air, x0.70 sideways, x0.35 into rock, x exp(-row/22). */
  private sweepSky(w: WorldData, sky: RGB) {
    this.sky.fill(0);
    if (this.top > 140) return;
    const prev = new Float32Array(W * 3), cur = new Float32Array(W * 3);
    const fall = Math.exp(-1 / 22);
    const bottom = Math.min(H, this.top + GRID_ROWS);
    for (let y = -SKY_ROWS; y < bottom; y++) {
      for (let x = 0; x < W; x++) {
        const s = this.solid(w, x, y);
        for (let c = 0; c < 3; c++) cur[x * 3 + c] = y < 0 ? (s ? sky[c] * 0.35 : sky[c]) : prev[x * 3 + c] * (s ? 0.35 : 0.97) * fall;
      }
      for (let pass = 0; pass < 2; pass++) for (let k = 1; k < W; k++) {
        const x = pass ? W - 1 - k : k, px = pass ? x + 1 : x - 1;
        const f = this.solid(w, x, y) ? 0.6 : 0.7;
        for (let c = 0; c < 3; c++) cur[x * 3 + c] = Math.max(cur[x * 3 + c], cur[px * 3 + c] * f);
      }
      // A solid tile passes light on only if it came from above through air (no glowing through ground).
      for (let x = 0; x < W; x++) if (y >= 0 && this.solid(w, x, y)) for (let c = 0; c < 3; c++) prev[x * 3 + c] = cur[x * 3 + c] * 0.15; else for (let c = 0; c < 3; c++) prev[x * 3 + c] = cur[x * 3 + c];
      const gy = y - this.top;
      if (gy >= 0 && gy < GRID_ROWS) for (let x = 0; x < W; x++) { const o = (gy * W + x) * 4; this.sky[o] = cur[x * 3]; this.sky[o + 1] = cur[x * 3 + 1]; this.sky[o + 2] = cur[x * 3 + 2]; this.sky[o + 3] = 1; }
    }
  }

  private spreadEmitters(w: WorldData, liftDepth: number) {
    const g = this.emit;
    g.fill(0);
    const add = (ex: number, ey: number, c: RGB, I: number, R: number) => {
      const r = Math.ceil(R);
      for (let ty = ey - r; ty <= ey + r; ty++) {
        const gy = ty - this.top;
        if (gy < 0 || gy >= GRID_ROWS) continue;
        for (let tx = ex - r; tx <= ex + r; tx++) {
          if (tx < 0 || tx >= W) continue;
          const dx = tx - ex, dy = ty - ey, d = Math.hypot(dx, dy);
          if (d > R) continue;
          // March from the emitter out, skipping its own tile: air x0.62 per tile, rock x0.25.
          let depth = 0;
          const n = Math.max(1, Math.ceil(d * 3));
          for (let k = 1; k <= n; k++) {
            const f = k / n, px = Math.floor(ex + 0.5 + dx * f), py = Math.floor(ey + 0.5 + dy * f);
            if (px === ex && py === ey) continue;
            const de = this.dens(w, px, py);
            depth += (d / n) * (0.478 + 0.908 * de);
          }
          const win = 1 - (d / R) * (d / R);
          const v = I * Math.exp(-depth) * win * win;
          const o = (gy * W + tx) * 4;
          g[o] += c[0] * v; g[o + 1] += c[1] * v; g[o + 2] += c[2] * v; g[o + 3] = 1;
        }
      }
    };
    const y0 = Math.max(0, this.top - 4), y1 = Math.min(H, this.top + GRID_ROWS + 4);
    for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const mi = this.t.matInfo[w.mat[i]];
      if (mi?.glow) {
        // Lava: only tiles with an open or non-lava neighbour above spread light (the lake's skin), else it floods the grid.
        if (mi.kind === KIND.LIQUID) {
          // The lake's skin casts the light (3-4 tiles of bounce onto the rock above and around); the depths are dim.
          const skin = y === 0 || this.t.matInfo[w.mat[i - W]]?.kind !== KIND.LIQUID;
          if (skin) add(x, y, mi.glow.c, mi.glow.i * 0.75, 4.5);
          else if ((x + y) % 3 === 0) add(x, y, mi.glow.c, mi.glow.i * 0.15, 2);
        } else add(x, y, mi.glow.c, mi.glow.i * 0.6, mi.glow.r);
      }
      const f = w.find[i];
      if (f) { const fi = this.t.findInfo[f]; if (fi?.glow) add(x, y, fi.glow.c, fi.glow.i * 0.5, fi.glow.r); }
      // Decor lights, same hashes as the terrain shader's backWall().
      if (w.mat[i] === 0 && !(w.flag[i] & FLAG.LIFT)) {
        const b = w.biome[i], hd = hash01(x + 64, y + 64, 900);
        if (b === 1 && hd < 0.07 && this.solid(w, x, y - 1)) add(x, y, LANTERN, 2.0, 4.5);
        if (b === 3 && w.planet !== "cinder" && hd < 0.45 && this.solid(w, x, y + 1)) {
          const ci = hash01(x + 64, y + 64, 923);
          add(x, y, ci < 0.6 ? CAP_T : ci < 0.85 ? CAP_P : CAP_Y, 0.55, 2);
        }
      }
    }
    // The Lift: paired lamps every 4 rows in the segment's colour; the head's floodlight shines down.
    if (liftDepth > 0) {
      const lx = w.spawnX;
      for (let y = Math.max(1, y0 - (y0 % 4) + 1); y < Math.min(liftDepth, y1); y += 4) {
        let s = 0; while (s < 6 && y >= LIFT_SEGMENTS[s]) s++;
        add(lx, y, LIFT_C[s], 0.9, 2);
      }
      if (liftDepth - 1 >= y0 && liftDepth - 1 < y1) { add(lx, liftDepth, WHITE, 1.0, 3); add(lx, liftDepth + 1, WHITE, 0.6, 3); }
    }
  }
}

const LANTERN = hexLin("#ffb35c"), CAP_T = hexLin("#5cffc8"), CAP_P = hexLin("#9e80ff"), CAP_Y = hexLin("#ffd84a"), WHITE = hexLin("#fff4e0");
const LIFT_C = LIFT_LIGHT.map(hexLin);
