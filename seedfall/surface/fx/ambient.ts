// Ambient particles per biome (art.md 4 atmosphere, 8.1): motes in shafts of light, crystal glints,
// spores, embers, ruin dust, core motes, ash, rust. Rule 6.2.3: alpha <= 0.5, HDR <= 0.8, hidden
// within 10 art px of the pod; one cap for all of them.
import { W, type GameView } from "../../game/types.ts";
import { hex, LAVA_ID, SOLID, biomeKey, type RGB } from "./content.ts";
import { B, PX, spawn } from "./sim.ts";
import { PF, type Particles } from "../view.ts";

export const AMBIENT_CAP = 140;
const SPORE_CAP = 40;

export interface Rect { x0: number; y0: number; x1: number; y1: number }

interface Kind {
  /** spawns per second over a full view */
  rate: number;
  cap: number;
  /** where: any air tile, an air tile against rock (glints), the view's lower edge (rising) */
  at: "air" | "edge";
  c: RGB[];
  add: boolean;
  hdr: number;
  a: number;
  life: [number, number];
  vx: number; vy: number; jitter: number;
  drift?: boolean;
  /** drawn behind tiles (PF.BEHIND) */
  behind?: boolean;
}

const K = (k: Partial<Kind> & Pick<Kind, "c">): Kind => ({ rate: 10, cap: 80, at: "air", add: false, hdr: 0.05, a: 0.35, life: [4, 7], vx: 0, vy: 0, jitter: 0.1, ...k });
const C = (...h: string[]) => h.map(hex);

/** Per biome key: one or two kinds. Non-additive motes are lit by the scene, so they read in light shafts and vanish in the dark. */
const BIOME: Record<string, Kind[]> = {
  topsoil: [K({ c: C("#e8dcc0", "#d8c8a0"), rate: 14, vy: 0.02, jitter: 0.12, drift: true, a: 0.45, hdr: 0.04 })],
  stone: [K({ c: C("#c8c0b0", "#a8a094"), rate: 10, vy: 0.04, jitter: 0.08, drift: true, a: 0.4 }), K({ c: C("#8a8276"), rate: 2, vy: 0.9, jitter: 0.02, a: 0.4, life: [1, 2] })],
  crystal: [K({ c: C("#7fe8ff", "#c58cff", "#e8fbff"), at: "edge", add: true, hdr: 0.8, a: 0.5, rate: 18, cap: 40, life: [0.35, 0.8], jitter: 0 }), K({ c: C("#b8c8e8"), rate: 6, drift: true, a: 0.3, jitter: 0.06 })],
  fungal: [K({ c: C("#5cffc8", "#ff6ad5"), add: true, hdr: 0.6, a: 0.45, rate: 9, cap: SPORE_CAP, vy: -3 * PX, jitter: 0.05, drift: true, life: [5, 8] })],
  // embers stay deep red / dull amber (orange-red is lava's and the hazards'), sparse, dim, behind tiles (review-1 #4)
  magma: [K({ c: C("#8a2a14", "#9a5a2a"), add: true, hdr: 0.35, a: 0.35, rate: 3, cap: 20, vy: -0.5, jitter: 0.2, drift: true, life: [2, 4], behind: true }), K({ c: C("#6a5a54", "#4a403c"), rate: 6, vy: 0.15, jitter: 0.1, drift: true, a: 0.4 })],
  ruins: [K({ c: C("#b8b0a0", "#9c968a"), rate: 9, vy: 0.08, jitter: 0.05, drift: true, a: 0.4 }), K({ c: C("#9ab8ff", "#8affd0"), add: true, hdr: 0.4, a: 0.35, rate: 3, cap: 16, jitter: 0.1, drift: true, life: [3, 5] })],
  core: [K({ c: C("#fff2c0", "#ffd8a0", "#e0c8ff"), add: true, hdr: 0.8, a: 0.45, rate: 16, cap: 80, vy: -0.25, jitter: 0.12, drift: true, life: [3, 6] })],
  ash: [K({ c: C("#8a847c", "#6e665e"), rate: 14, vy: 0.35, jitter: 0.1, drift: true, a: 0.45 }), K({ c: C("#8a2a14"), add: true, hdr: 0.35, a: 0.35, rate: 1, cap: 6, vy: -0.4, jitter: 0.2, life: [1.5, 3], behind: true })],
  banded: [K({ c: C("#a85a30", "#8a4a26"), rate: 8, vy: 0.05, jitter: 0.08, drift: true, a: 0.4 }), K({ c: C("#c8d0d8"), at: "edge", add: true, hdr: 0.6, a: 0.45, rate: 6, cap: 16, life: [0.3, 0.6], jitter: 0 })],
};
const FIREFLY = K({ c: C("#d8ff7a"), add: true, hdr: 0.8, a: 0.5, rate: 4, cap: 14, jitter: 0.35, drift: true, life: [2, 4] });
const EMBER: RGB = hex("#9a3a18");

const rr = (a: number, b: number) => a + (b - a) * Math.random();

export class Ambient {
  private acc = new Float32Array(4);
  /** estimated live count per kind (spawns decayed by the mean life), for the per-kind caps */
  private est = new Float32Array(4);

  /** `live` is the count of ambient particles alive (from the simulation). */
  update(ps: Particles, dt: number, view: GameView, r: Rect, live: number) {
    const w = view.world, pod = view.pod;
    const row = Math.max(0, Math.min(w.biome.length / W - 1, Math.floor(pod.y)));
    const slot = w.biome[row * W + Math.max(0, Math.min(W - 1, Math.floor(pod.x)))];
    let kinds = BIOME[biomeKey(w.planet, slot)] ?? BIOME.topsoil;
    const night = view.dayPhase < 0.22 || view.dayPhase > 0.8;
    if (pod.y < 1.5) kinds = night ? [FIREFLY] : []; // in town: fireflies at night (art 7.3), the sky is the renderer's
    const area = Math.max(1, (r.x1 - r.x0) * (r.y1 - r.y0)) / (23 * 13);
    for (let k = 0; k < kinds.length && k < 4; k++) {
      const kd = kinds[k];
      this.est[k] *= Math.exp(-dt / ((kd.life[0] + kd.life[1]) / 2));
      this.acc[k] += kd.rate * area * dt;
      while (this.acc[k] >= 1) {
        this.acc[k] -= 1;
        if (live >= AMBIENT_CAP || this.est[k] >= kd.cap) { this.acc[k] = 0; break; }
        if (this.one(ps, kd, view, r, pod.y < 1.5)) { live++; this.est[k]++; }
      }
    }
    this.lava(ps, dt, view, r);
  }

  private one(ps: Particles, kd: Kind, view: GameView, r: Rect, town: boolean): boolean {
    const w = view.world, pod = view.pod;
    for (let tries = 0; tries < 4; tries++) {
      const x = rr(r.x0, r.x1), y = town ? rr(-5, 0) : rr(r.y0, r.y1);
      const tx = Math.floor(x), ty = Math.floor(y);
      if (tx < 1 || tx >= W - 1) continue;
      if (ty >= 0 && SOLID[w.mat[ty * W + tx]]) continue;
      const dx = x - pod.x, dy = y - pod.y;
      if (dx * dx + dy * dy < 1) continue; // never spawn on the pod
      let px = x, py = y;
      if (kd.at === "edge") {
        // a glint sits on a rock face next to this air tile
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const s = nb[(Math.random() * 4) | 0];
        if (ty + s[1] < 0 || !SOLID[w.mat[(ty + s[1]) * W + tx + s[0]]]) continue;
        px = s[0] ? tx + (s[0] > 0 ? 0.97 : 0.03) : x;
        py = s[1] ? ty + (s[1] > 0 ? 0.97 : 0.03) : y;
      }
      const c = kd.c[(Math.random() * kd.c.length) | 0];
      spawn(ps, px, py, c, {
        vx: kd.vx + rr(-kd.jitter, kd.jitter), vy: kd.vy + rr(-kd.jitter, kd.jitter) * 0.5, life: rr(kd.life[0], kd.life[1]),
        a: 0, hdr: kd.hdr, flags: (kd.add ? PF.ADD : 0) | (kd.behind ? PF.BEHIND : 0),
        aux: (kd.drift ? B.AMBIENT_DRIFT : B.AMBIENT) + Math.min(0.5, kd.a) * 0.999,
      });
      return true;
    }
    return false;
  }

  /** Lava embers (art 8.1, thinned by review-1 #4): 1 px rising 8-16 px/s, sine drift, life 2-4 s, 1 per surface
   *  tile per 2 s, dim deep red, behind tiles. */
  private lava(ps: Particles, dt: number, view: GameView, r: Rect) {
    if (LAVA_ID < 0) return;
    const w = view.world, mat = w.mat;
    const y0 = Math.max(1, Math.floor(r.y0)), y1 = Math.min(w.mat.length / W - 1, Math.ceil(r.y1));
    const x0 = Math.max(1, Math.floor(r.x0)), x1 = Math.min(W - 2, Math.ceil(r.x1));
    if (y0 > y1) return;
    const p = dt / 2;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (mat[y * W + x] !== LAVA_ID || mat[(y - 1) * W + x] !== 0) continue;
      if (Math.random() > p) continue;
      const fill = w.fluid[y * W + x] / 255 || 1;
      spawn(ps, x + Math.random(), y + 1 - fill, EMBER, {
        vy: -rr(8, 16) * PX, vx: rr(-0.1, 0.1), life: rr(2, 4), hdr: 0.4, a: 0.5, flags: PF.ADD | PF.FADE | PF.BEHIND, aux: B.DRIFT + Math.random() * 0.999,
      });
    }
  }
}
