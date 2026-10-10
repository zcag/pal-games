// Draws the hole, side on, on a 2D canvas: a calm sky and two layers of
// country behind (they move slower than the hole, for depth), the ground cut
// like paper with a band of its surface along the top (mown stripes on the
// fairway and the green, tufts in the rough, stipple in the sand, strata in
// the rock), the pond, the Needle and its arch, the flag, and the ball,
// which is white, outlined and never smaller than a few pixels, so it reads
// first wherever it is. Everything else that is only for the eye (the aim,
// the meter, the spin, trails, puffs, confetti) is drawn here too, from
// what the page hands over in a Frame.
import { HOLE, NEEDLE, groundAt, type Hole, type Pt, type Surface } from "../game/hole.ts";
import { R } from "../game/sim.ts";
import { layersFor, type Flat } from "./looks.ts";

export type Look = {
  sky: [string, string]; sun: string; sunGlow: string; cloud: string;
  far: string; mid: string; midTree: string;
  earth: string; earthDeep: string; stone: string; stoneDeep: string; archBack: string; strata: string; edge: string;
  surface: Record<Surface, [string, string]>;
  water: [string, string]; waterHi: string;
  ball: string; ballEdge: string; shadow: string; flag: string; pole: string; cup: string;
  ink: string; dim: string; meter: [string, string, string]; back: string; top: string; stars: boolean;
};

/** Afternoon: a cream horizon under a pale blue sky, sage hills, terracotta stone. */
export const LIGHT: Look = {
  sky: ["#a9d3e3", "#f6ead2"], sun: "#fff4d6", sunGlow: "rgba(255, 236, 190, 0.55)", cloud: "rgba(255, 255, 255, 0.78)",
  far: "#bcd0c4", mid: "#93b79c", midTree: "#7aa384",
  earth: "#6f4e34", earthDeep: "#5a3e29", stone: "#c98256", stoneDeep: "#a9643f", archBack: "#8a4f33", strata: "rgba(90, 40, 20, 0.22)", edge: "rgba(28, 38, 30, 0.55)",
  surface: {
    tee: ["#5fae49", "#68b752"], fairway: ["#5fae49", "#69b853"], rough: ["#3f8237", "#46893c"],
    sand: ["#efd9a2", "#e6cd90"], green: ["#86d05f", "#8fd768"], rock: ["#c98256", "#c98256"],
  },
  water: ["#4aa3c4", "#2c6f93"], waterHi: "rgba(255, 255, 255, 0.55)",
  ball: "#ffffff", ballEdge: "#1b2630", shadow: "rgba(20, 30, 20, 0.28)", flag: "#e8473b", pole: "#f4f1ea", cup: "#1d1a17",
  ink: "#1b2630", dim: "rgba(27, 38, 48, 0.55)", meter: ["#9be15d", "#f6c343", "#f2613f"], back: "#4e8fe0", top: "#f08a2c", stars: false,
};

/** Dusk: a deep blue sky with a moon, the land darker, the ball still white. */
export const DARK: Look = {
  sky: ["#1b2140", "#4a3f63"], sun: "#f3ecd8", sunGlow: "rgba(200, 190, 255, 0.18)", cloud: "rgba(150, 150, 200, 0.18)",
  far: "#33385a", mid: "#2a3f45", midTree: "#22363a",
  earth: "#3b2a22", earthDeep: "#2e211b", stone: "#8a5a45", stoneDeep: "#6f4535", archBack: "#4f3126", strata: "rgba(0, 0, 0, 0.28)", edge: "rgba(0, 0, 0, 0.6)",
  surface: {
    tee: ["#3f7f3e", "#458745"], fairway: ["#3f7f3e", "#468846"], rough: ["#2c5c32", "#316337"],
    sand: ["#b7a37a", "#ab976d"], green: ["#5aa250", "#61a957"], rock: ["#8a5a45", "#8a5a45"],
  },
  water: ["#2d6b8c", "#173d57"], waterHi: "rgba(200, 230, 255, 0.4)",
  ball: "#ffffff", ballEdge: "#0b1016", shadow: "rgba(0, 0, 0, 0.4)", flag: "#ff5a4a", pole: "#e9e4da", cup: "#0b0908",
  ink: "#eef2f7", dim: "rgba(238, 242, 247, 0.55)", meter: ["#9be15d", "#f6c343", "#ff6b4a"], back: "#7fb6ff", top: "#ffa24a", stars: true,
};

export type Cam = { x: number; y: number; scale: number };

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; color: string; kind: "dot" | "confetti" | "drop" | "ring" };

export type Frame = {
  t: number;
  cam: Cam;
  ball: { x: number; y: number; angle: number; w: number; hidden: boolean; alpha: number };
  /** Aiming: the angle and facing, the meter, the last shot's power and aim. */
  aim: { angle: number; facing: 1 | -1; power: number; charging: boolean; last: number | null; lastAngle: number | null; lastFacing: 1 | -1 } | null;
  /** Spin shown round the ball (rad/s, signed) and whether it is backspin; null when none. */
  spin: { w: number; back: boolean } | null;
  trail: Pt[];
  lastTrail: Pt[];
  particles: Particle[];
  /** How far the flag is lowered into the cup's celebration, 0..1. */
  flagUp: number;
  shake: number;
};

const BAND = 0.62;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  w = 0; h = 0; dpr = 1;
  look: Look = LIGHT;
  /** A look drawn flat over a recoloured landscape (looks.ts); null is the hand-drawn look above. */
  flat: Flat | null = null;
  private layers: HTMLCanvasElement[] | null = null;
  private layersKey = "";
  private hole: Hole = HOLE;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    if (this.flat) this.setFlat(this.flat);
  }

  /** Puts a flat look on (null: the hand-drawn one); its layers are recoloured for this height, the old ones kept until then. */
  setFlat(f: Flat | null) {
    this.flat = f;
    if (!f) { this.layers = null; this.layersKey = ""; return; }
    const key = `${f.set}:${f.layers.join()}:${Math.round(this.h * this.dpr)}`;
    if (key === this.layersKey) return;
    this.layersKey = key;
    layersFor(f, Math.round(this.h * this.dpr)).then((ls) => { if (this.layersKey === key) this.layers = ls; }).catch((e) => console.error(e));
  }

  /** Pixels per metre for this viewport: about 17 m of height in view. */
  baseScale() { return Math.max(14, this.h / 17); }

  draw(f: Frame) {
    const { ctx } = this;
    const cam = f.cam;
    const sx = (x: number) => (x - cam.x) * cam.scale + this.w / 2 + shakeX;
    const sy = (y: number) => this.h / 2 - (y - cam.y) * cam.scale + shakeY;
    const shakeX = f.shake ? (hash(f.t * 60) - 0.5) * 4 * f.shake : 0, shakeY = f.shake ? (hash(f.t * 60 + 9) - 0.5) * 4 * f.shake : 0;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.flat) {
      this.flatSky(f, this.flat);
      this.flatBackdrop(cam, this.flat);
      this.archBack(sx, sy, this.flat.earth);
      this.flatGround(f, this.flat, sx, sy);
      this.flatWater(f, this.flat, sx, sy);
      this.flatNeedle(this.flat, sx, sy);
    } else {
      this.sky(f);
      this.backdrop(f, cam);
      // The arch's far side, behind the ball as it goes through.
      this.archBack(sx, sy, this.look.archBack);
      this.ground(f, sx, sy);
      this.water(f, sx, sy);
      this.needle(sx, sy);
    }
    this.flag(f, sx, sy);

    // The last shot, faint, while aiming the next; the shot in the air, brighter.
    this.trail(f.lastTrail, sx, sy, 0.22);
    this.trail(f.trail, sx, sy, 0.55);
    this.particles(f, sx, sy, false);
    if (f.aim) this.aiming(f, sx, sy);
    this.ballDraw(f, sx, sy);
    this.particles(f, sx, sy, true);
    this.flagPointer(f, sx, sy);
  }

  private sky(f: Frame) {
    const { ctx, look: L, w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, L.sky[0]); g.addColorStop(1, L.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (L.stars) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 40; i++) {
        const x = (hash(i) * w * 1.3 - f.cam.x * 0.6) % (w * 1.3), y = hash(i + 50) * h * 0.55;
        const tw = 0.5 + 0.5 * Math.sin(f.t * 1.5 + i);
        ctx.globalAlpha = 0.3 + 0.5 * tw;
        ctx.fillRect((x + w * 1.3) % (w * 1.3), y, 1.2, 1.2);
      }
      ctx.globalAlpha = 1;
    }
    // The sun (the moon at dusk), low and soft, barely moving.
    const sx = w * 0.78 - f.cam.x * 0.4, sy = h * 0.3 - (f.cam.y - 6) * 0.3;
    const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, h * 0.45);
    glow.addColorStop(0, L.sunGlow); glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = L.sun;
    ctx.beginPath(); ctx.arc(sx, sy, h * 0.07, 0, Math.PI * 2); ctx.fill();
  }

  /** Far mesas and nearer hills with round trees, each layer moving slower than the hole; clouds drifting. */
  private backdrop(f: Frame, cam: Cam) {
    const { ctx, look: L, w, h } = this;
    // Clouds.
    ctx.fillStyle = L.cloud;
    for (let i = 0; i < 6; i++) {
      const span = w + 400;
      const x = ((hash(i + 3) * span - cam.x * cam.scale * 0.08 + f.t * (4 + 3 * hash(i))) % span + span) % span - 200;
      const y = h * (0.08 + 0.25 * hash(i + 9)) - (cam.y - 6) * cam.scale * 0.05;
      const s = 18 + 26 * hash(i + 21);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 2.2, s * 0.55, 0, 0, Math.PI * 2);
      ctx.ellipse(x - s * 0.9, y + s * 0.1, s * 1.1, s * 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(x + s * 0.6, y - s * 0.25, s * 1.0, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Each layer is farther off: it moves `k` as fast as the hole and is drawn `k` as big, its foot at the horizon.
    const horizon = h * 0.62 + (cam.y - 6) * cam.scale * 0.12;
    const layer = (k: number, color: string, shape: (x: number) => number, trees?: string) => {
      const sc = cam.scale * k, px = cam.x * k;
      const toY = (v: number) => horizon - v * sc;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = -10; x <= w + 10; x += 6) ctx.lineTo(x, toY(shape(px + (x - w / 2) / sc)));
      ctx.lineTo(w + 10, h); ctx.closePath(); ctx.fill();
      if (!trees) return;
      ctx.fillStyle = trees;
      const x0 = px - w / 2 / sc - 4, x1 = px + w / 2 / sc + 4;
      for (let i = Math.floor(x0 / 6); i <= x1 / 6; i++) {
        if (hash(i) < 0.5) continue;
        const wx = i * 6 + hash(i + 7) * 3;
        const x = (wx - px) * sc + w / 2, y = toY(shape(wx)) + 2;
        const r = (0.9 + hash(i + 2) * 0.7) * sc;
        ctx.fillRect(x - 1, y - r * 1.3, 2, r * 1.4);
        ctx.beginPath(); ctx.arc(x, y - r * 1.6, r, 0, Math.PI * 2); ctx.fill();
      }
      // The ground of the layer runs on below its line to the bottom of the screen.
    };
    // Far mesas: flat tops and steep sides, echoing the hole's.
    layer(0.22, L.far, (x) => {
      const cell = Math.floor(x / 34), u = x / 34 - cell;
      const top = 14 + hash(cell) * 14;
      if (hash(cell + 40) < 0.45) return 4 + 3 * Math.sin(x * 0.09) + 2 * Math.sin(x * 0.031);
      const edge = 0.14, up = u < edge ? u / edge : u > 1 - edge ? (1 - u) / edge : 1;
      return 4 + (top - 4) * Math.min(1, up * 1.5);
    });
    layer(0.45, L.mid, (x) => 3 + 2.6 * Math.sin(x * 0.06) + 1.4 * Math.sin(x * 0.15 + 1), L.midTree);
  }

  // ---- the flat looks: a sky, the recoloured layers, and the hole in flat fills of the same palette ----

  private flatSky(f: Frame, F: Flat) {
    const { ctx, w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, F.sky[0]); g.addColorStop(1, F.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (F.stars) {
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 46; i++) {
        const span = w * 1.4, x = ((hash(i) * span - f.cam.x * 0.5) % span + span) % span, y = hash(i + 50) * h * 0.5;
        ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(f.t * 1.3 + i));
        ctx.fillRect(x, y, 1.2, 1.2);
      }
      ctx.globalAlpha = 1;
    }
    if (F.sun) {
      const sx = w * F.sun.x - f.cam.x * 0.25, sy = h * F.sun.y - (f.cam.y - 6) * 0.25;
      const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, h * 0.5);
      glow.addColorStop(0, F.sun.glow); glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = F.sun.color;
      ctx.beginPath(); ctx.arc(sx, sy, h * F.sun.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** The layers, farthest first, each tiled across and moving `rate` as fast as the hole; a camera going up lowers them a little. */
  private flatBackdrop(cam: Cam, F: Flat) {
    const ls = this.layers;
    if (!ls) return;
    const { ctx, w, h } = this;
    // At the unzoomed scale: the camera zooms with the shot, and scaling the offset by it slid every layer by the
    // hole's distance times the change.
    const ref = this.baseScale();
    for (let i = ls.length - 1; i >= 0; i--) {
      const img = ls[i], rate = F.rates[i];
      const lw = img.width / this.dpr, lh = img.height / this.dpr;
      const bottom = h * 1.12 + (cam.y - 8) * ref * rate * 0.7;
      const top = bottom - lh;
      const off = (((cam.x * ref * rate) % lw) + lw) % lw;
      // Whole device pixels and a pixel of overlap, so no hairline shows where a tile meets the next.
      const snap = (v: number) => Math.round(v * this.dpr) / this.dpr;
      for (let x = -off; x < w; x += lw) ctx.drawImage(img, snap(x), snap(top), snap(lw) + 1 / this.dpr, snap(lh));
      if (bottom < h) { ctx.fillStyle = F.layers[i]; ctx.fillRect(0, bottom - 1, w, h - bottom + 1); }
    }
  }

  private flatGround(f: Frame, F: Flat, sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx, w } = this;
    const g = this.hole.ground;
    const left = f.cam.x - w / 2 / f.cam.scale - 2, right = f.cam.x + w / 2 / f.cam.scale + 2;
    const floor = Math.min(-30, f.cam.y - 40);
    ctx.beginPath();
    ctx.moveTo(sx(g[0][0]), sy(floor));
    for (const [x, y] of g) ctx.lineTo(sx(x), sy(y));
    ctx.lineTo(sx(g[g.length - 1][0]), sy(floor));
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = F.earth;
    ctx.fillRect(0, 0, this.w, this.h);
    // Stone where the land stands up: the wall behind the tee, and the mesa with its lit face.
    ctx.fillStyle = F.rock;
    for (const [x0, x1] of [[-60, -7.6], [69.4, 150]]) if (x1 > left && x0 < right) ctx.fillRect(sx(Math.max(x0, left)), 0, sx(Math.min(x1, right)) - sx(Math.max(x0, left)), this.h);
    ctx.fillStyle = F.rockLit;
    ctx.fillRect(sx(69.4), 0, sx(70.9) - sx(69.4), this.h);
    ctx.fillRect(sx(-8.6), 0, sx(-7.6) - sx(-8.6), this.h);
    // Each surface a flat band along the top: thin on the short grass, deeper in the rough and the sand.
    for (let i = 0; i + 1 < g.length; i++) {
      const s = this.hole.surfaces[i];
      if (s === "rock") continue;
      const [x0, y0] = g[i], [x1, y1] = g[i + 1];
      if (x1 < left || x0 > right || x1 <= x0) continue;
      if (y0 < this.hole.cup.y - 0.01 && Math.abs(x0 - this.hole.cup.x) < this.hole.cup.w) continue;
      const depth = s === "sand" ? 0.7 : s === "rough" ? 0.5 : 0.34;
      ctx.fillStyle = F.surface[s];
      ctx.beginPath();
      ctx.moveTo(sx(x0), sy(y0 + 0.05)); ctx.lineTo(sx(x1), sy(y1 + 0.05));
      ctx.lineTo(sx(x1), sy(y1 - depth)); ctx.lineTo(sx(x0), sy(y0 - depth)); ctx.closePath(); ctx.fill();
      if (s === "rough") {
        // A few blades standing up, so the long grass reads apart from the fairway.
        for (let u = Math.ceil(x0 / 0.55) * 0.55; u < x1; u += 0.55) {
          const yy = y0 + ((y1 - y0) * (u - x0)) / (x1 - x0), hh = 0.16 + 0.16 * hash(u * 7.7);
          ctx.beginPath(); ctx.moveTo(sx(u - 0.09), sy(yy)); ctx.lineTo(sx(u + 0.02), sy(yy + hh)); ctx.lineTo(sx(u + 0.09), sy(yy)); ctx.closePath(); ctx.fill();
        }
      }
    }
    for (const mx of [1.6, 4.4]) {
      ctx.fillStyle = "#f4efe6"; ctx.beginPath(); ctx.arc(sx(mx), sy(5 + 0.1), Math.max(2.2, 0.11 * f.cam.scale), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    const c = this.hole.cup;
    ctx.fillStyle = "#0d0b0a";
    ctx.fillRect(sx(c.x - c.w / 2), sy(c.y), c.w * f.cam.scale, c.d * f.cam.scale);
  }

  private flatWater(f: Frame, F: Flat, sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx } = this;
    for (const w of this.hole.water) {
      const xl = 40.25, xr = 53.75, top = w.y1;
      ctx.fillStyle = F.water[1];
      ctx.beginPath();
      ctx.moveTo(sx(xl), sy(top));
      for (let x = xl; x <= xr; x += 0.5) ctx.lineTo(sx(x), sy(top + 0.04 * Math.sin(x * 1.3 + f.t * 2)));
      ctx.lineTo(sx(xr), sy(w.y0)); ctx.lineTo(sx(xl), sy(w.y0)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = F.water[0];
      ctx.fillRect(sx(xl), sy(top) - 1, sx(xr) - sx(xl), Math.max(3, 0.28 * f.cam.scale));
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      for (let i = 0; i < 6; i++) {
        const x = xl + 1 + ((hash(i) * 11 + f.t * (0.3 + hash(i + 3) * 0.4)) % 11.5), y = top - 0.5 - hash(i + 5) * 1.4, len = 0.4 + 0.8 * hash(i + 8);
        ctx.fillRect(sx(x), sy(y), (Math.min(xr - 0.3, x + len) - x) * f.cam.scale, 1.5);
      }
    }
  }

  /** The Needle in two flat tones, its lit side on the right as the landscape's spires have. */
  private flatNeedle(F: Flat, sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx } = this;
    const path = () => { ctx.beginPath(); NEEDLE.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, sx(x), sy(y))); ctx.closePath(); };
    path(); ctx.fillStyle = F.rock; ctx.fill();
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = F.rockLit;
    ctx.beginPath(); ctx.moveTo(sx(72.6), sy(15)); ctx.lineTo(sx(74), sy(15)); ctx.lineTo(sx(74), sy(27)); ctx.lineTo(sx(72.3), sy(27)); ctx.lineTo(sx(72.9), sy(21)); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  private archBack(sx: (x: number) => number, sy: (y: number) => number, color: string) {
    const { ctx } = this;
    ctx.fillStyle = color;
    // The arch's far legs and the shade under its span.
    ctx.beginPath();
    ctx.moveTo(sx(70.2), sy(14)); ctx.lineTo(sx(70.2), sy(17.4)); ctx.lineTo(sx(73.8), sy(17.4)); ctx.lineTo(sx(73.8), sy(14));
    ctx.lineTo(sx(73.2), sy(14)); ctx.quadraticCurveTo(sx(73.1), sy(16.4), sx(71.9), sy(16.5)); ctx.quadraticCurveTo(sx(70.8), sy(16.4), sx(70.8), sy(14));
    ctx.closePath(); ctx.fill();
  }

  private ground(f: Frame, sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx, look: L, w } = this;
    const g = this.hole.ground;
    const left = f.cam.x - w / 2 / f.cam.scale - 2, right = f.cam.x + w / 2 / f.cam.scale + 2;
    const floor = Math.min(-30, f.cam.y - 40);
    // The body: earth, with stone under the mesa and at the walls.
    ctx.beginPath();
    ctx.moveTo(sx(g[0][0]), sy(floor));
    for (const [x, y] of g) ctx.lineTo(sx(x), sy(y));
    ctx.lineTo(sx(g[g.length - 1][0]), sy(floor));
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const body = ctx.createLinearGradient(0, sy(14), 0, sy(-14));
    body.addColorStop(0, L.earth); body.addColorStop(1, L.earthDeep);
    ctx.fillStyle = body;
    ctx.fillRect(0, 0, this.w, this.h);
    // Stone: the left wall, the mesa and the backstop.
    const stone = (x0: number, x1: number) => {
      x0 = Math.max(x0, left); x1 = Math.min(x1, right);
      if (x1 <= x0) return;
      const sg = ctx.createLinearGradient(0, sy(27), 0, sy(0));
      sg.addColorStop(0, L.stone); sg.addColorStop(1, L.stoneDeep);
      ctx.fillStyle = sg;
      ctx.fillRect(sx(x0), 0, sx(x1) - sx(x0), this.h);
      this.strata(x0, x1, -12, 27, sx, sy);
    };
    stone(-60, -7.6);
    stone(69.4, 150);
    // The surface band along the top of each run.
    for (let i = 0; i + 1 < g.length; i++) {
      const s = this.hole.surfaces[i];
      if (s === "rock") continue;
      const [x0, y0] = g[i], [x1, y1] = g[i + 1];
      if (x1 < left || x0 > right || x1 <= x0) continue;
      if (y0 < this.hole.cup.y - 0.01 && Math.abs(x0 - this.hole.cup.x) < this.hole.cup.w) continue; // the cup's floor
      this.band(s, x0, y0, x1, y1, sx, sy, f);
    }
    ctx.restore();
    // The cup: dark inside, a white rim.
    const c = this.hole.cup;
    ctx.fillStyle = L.cup;
    ctx.fillRect(sx(c.x - c.w / 2), sy(c.y), (c.w) * f.cam.scale, c.d * f.cam.scale);
    // A crisp edge along the whole top, the thing the eye follows.
    ctx.beginPath();
    for (let i = 0; i < g.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, sx(g[i][0]), sy(g[i][1]));
    ctx.strokeStyle = L.edge; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.stroke();
  }

  private strata(x0: number, x1: number, y0: number, y1: number, sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx, look: L } = this;
    ctx.strokeStyle = L.strata; ctx.lineWidth = 1.2;
    for (let y = Math.ceil(y0); y < y1; y += 1.3) {
      ctx.beginPath();
      for (let x = Math.floor(x0 / 1.5) * 1.5; x <= x1 + 1.5; x += 1.5) {
        const yy = y + 0.25 * Math.sin(x * 0.9 + y * 3.1) + 0.15 * Math.sin(x * 2.3);
        ctx.lineTo(sx(x), sy(yy));
      }
      ctx.stroke();
    }
  }

  private band(s: Surface, x0: number, y0: number, x1: number, y1: number, sx: (x: number) => number, sy: (y: number) => number, f: Frame) {
    const { ctx, look: L } = this;
    const [a, b] = L.surface[s];
    const at = (x: number) => y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    const poly = (u0: number, u1: number, depth: number) => {
      ctx.beginPath();
      ctx.moveTo(sx(u0), sy(at(u0) + 0.05)); ctx.lineTo(sx(u1), sy(at(u1) + 0.05));
      ctx.lineTo(sx(u1), sy(at(u1) - depth)); ctx.lineTo(sx(u0), sy(at(u0) - depth)); ctx.closePath();
    };
    // A darker lip under the band: the cut edge of the turf.
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    poly(x0, x1, BAND + 0.16); ctx.fill();
    ctx.fillStyle = a;
    poly(x0, x1, BAND); ctx.fill();
    if (s === "fairway" || s === "green" || s === "tee") {
      // Mown stripes, wider on the fairway.
      const stripe = s === "green" ? 1 : 2.2;
      ctx.fillStyle = b;
      for (let u = Math.floor(x0 / stripe) * stripe; u < x1; u += stripe * 2) {
        const u0 = Math.max(x0, u), u1 = Math.min(x1, u + stripe);
        if (u1 > u0) { poly(u0, u1, BAND); ctx.fill(); }
      }
    } else if (s === "rough") {
      ctx.strokeStyle = b; ctx.lineWidth = 1.4; ctx.lineCap = "round";
      for (let u = Math.ceil(x0 / 0.35) * 0.35; u < x1; u += 0.35) {
        const hh = 0.18 + 0.2 * hash(u * 7.7), lean = (hash(u * 3.3) - 0.5) * 0.18 + 0.05 * Math.sin(f.t * 1.6 + u);
        ctx.beginPath(); ctx.moveTo(sx(u), sy(at(u))); ctx.lineTo(sx(u + lean), sy(at(u) + hh)); ctx.stroke();
      }
    } else if (s === "sand") {
      ctx.fillStyle = b;
      for (let u = x0; u < x1; u += 0.13) {
        const d = hash(u * 13.1) * BAND;
        ctx.fillRect(sx(u + hash(u * 5.1) * 0.1), sy(at(u) - d), 1.3, 1.3);
      }
    }
    if (s === "tee") {
      // The tee markers either side of where you stand.
      for (const mx of [1.6, 4.4]) {
        ctx.fillStyle = "#f4f1ea"; ctx.beginPath(); ctx.arc(sx(mx), sy(5 + 0.12), Math.max(2.5, 0.13 * this.ctxScale(sx)), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = L.flag; ctx.beginPath(); ctx.arc(sx(mx), sy(5 + 0.12), Math.max(1.4, 0.07 * this.ctxScale(sx)), 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  private ctxScale(sx: (x: number) => number) { return sx(1) - sx(0); }

  private water(f: Frame, sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx, look: L } = this;
    for (const w of this.hole.water) {
      const g = ctx.createLinearGradient(0, sy(w.y1), 0, sy(w.y0));
      g.addColorStop(0, L.water[0]); g.addColorStop(1, L.water[1]);
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.92;
      // The water's top follows a gentle swell; its sides end where the banks rise through the surface.
      const top = w.y1;
      const xl = 40.25, xr = 53.75;
      ctx.beginPath();
      ctx.moveTo(sx(xl), sy(top));
      for (let x = xl; x <= xr; x += 0.5) ctx.lineTo(sx(x), sy(top + 0.05 * Math.sin(x * 1.3 + f.t * 2)));
      ctx.lineTo(sx(xr), sy(w.y0)); ctx.lineTo(sx(xl), sy(w.y0)); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = L.waterHi; ctx.lineWidth = 1.5; ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const x = xl + 1 + ((hash(i) * 11 + f.t * (0.4 + hash(i + 3) * 0.5)) % 11.5);
        const y = top - 0.25 - hash(i + 5) * 1.6;
        const len = 0.5 + hash(i + 8);
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(f.t * 1.2 + i * 2);
        ctx.beginPath(); ctx.moveTo(sx(x), sy(y)); ctx.lineTo(sx(Math.min(xr - 0.3, x + len)), sy(y)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  private needle(sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx, look: L } = this;
    const path = () => { ctx.beginPath(); NEEDLE.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, sx(x), sy(y))); ctx.closePath(); };
    path();
    const g = ctx.createLinearGradient(sx(70.3), 0, sx(73.7), 0);
    g.addColorStop(0, L.stone); g.addColorStop(1, L.stoneDeep);
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); path(); ctx.clip(); this.strata(70, 74, 16, 27, sx, sy); ctx.restore();
    path(); ctx.strokeStyle = L.edge; ctx.lineWidth = 1.6; ctx.stroke();
  }

  private flag(f: Frame, sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx, look: L } = this;
    const c = this.hole.cup, x = sx(c.x), base = sy(c.y), top = sy(c.y + 2.6), s = f.cam.scale;
    ctx.strokeStyle = this.flat ? (this.flat.ink === "dark" ? "#2b2622" : "#f1ece4") : L.pole; ctx.lineWidth = Math.max(2, 0.07 * s);
    ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, top); ctx.stroke();
    // The pennant waves; after a hole it rises and flutters harder.
    const len = 1.1 * s, hgt = 0.62 * s, up = f.flagUp;
    ctx.fillStyle = L.flag;
    ctx.beginPath();
    ctx.moveTo(x, top);
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const u = i / n, wave = Math.sin(f.t * (5 + 6 * up) - u * 4) * u * (0.12 + 0.12 * up) * s;
      ctx.lineTo(x + u * len, top + (hgt / 2) * u + wave);
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n, wave = Math.sin(f.t * (5 + 6 * up) - u * 4) * u * (0.12 + 0.12 * up) * s;
      ctx.lineTo(x + u * len, top + hgt - (hgt / 2) * u + wave);
    }
    ctx.closePath(); ctx.fill();
  }

  private trail(pts: Pt[], sx: (x: number) => number, sy: (y: number) => number, alpha: number) {
    if (pts.length < 2) return;
    const { ctx, look: L } = this;
    ctx.fillStyle = L.ball;
    for (let i = 0; i < pts.length; i += 3) {
      ctx.globalAlpha = alpha * (0.3 + 0.7 * (i / pts.length));
      ctx.beginPath(); ctx.arc(sx(pts[i][0]), sy(pts[i][1]), 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private ballRadius(f: Frame) { return Math.max(5.5, R * f.cam.scale * 1.15); }

  private ballDraw(f: Frame, sx: (x: number) => number, sy: (y: number) => number) {
    const b = f.ball;
    if (b.hidden) return;
    const { ctx, look: L } = this;
    const r = this.ballRadius(f), x = sx(b.x), y = sy(b.y);
    // Its shadow on the ground under it, fading with height.
    const gy = groundAt(this.hole, b.x), hgt = b.y - R - gy;
    if (hgt > 0.05 && hgt < 9 && b.x > -8 && b.x < 95) {
      ctx.fillStyle = L.shadow;
      ctx.globalAlpha = (1 - hgt / 9) * b.alpha;
      ctx.beginPath(); ctx.ellipse(x, sy(gy), r * (1.1 + hgt * 0.05), r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = L.ball;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = L.ballEdge; ctx.stroke();
    // A seam that turns with the ball, so its spin shows.
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = "rgba(27, 38, 48, 0.35)"; ctx.lineWidth = 1.4;
    const a = -b.angle;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.stroke();
    ctx.restore();
    // Spin put on in the air: a curved arrow round the ball, blue for back, orange for top, as long as the spin.
    if (f.spin && Math.abs(f.spin.w) > 2) {
      const amt = Math.min(1, Math.abs(f.spin.w) / 40), ccw = f.spin.w > 0;
      const rr = r + 5, span = amt * Math.PI * 1.4, start = -Math.PI / 2;
      ctx.strokeStyle = f.spin.back ? L.back : L.top; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath();
      // Canvas angles run clockwise; counter-clockwise spin draws the arc the other way.
      const s0 = start + (f.t * (ccw ? -1 : 1) * 6) % (Math.PI * 2);
      ctx.arc(x, y, rr, s0, s0 + (ccw ? -span : span), ccw);
      ctx.stroke();
      const e = s0 + (ccw ? -span : span), ex = x + Math.cos(e) * rr, ey = y + Math.sin(e) * rr;
      const dir = e + (ccw ? -Math.PI / 2 : Math.PI / 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(dir) * 4.5, ey + Math.sin(dir) * 4.5);
      ctx.lineTo(ex + Math.cos(dir + 2.5) * 4, ey + Math.sin(dir + 2.5) * 4);
      ctx.lineTo(ex + Math.cos(dir - 2.5) * 4, ey + Math.sin(dir - 2.5) * 4);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private aiming(f: Frame, sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx, look: L } = this;
    const a = f.aim!, b = f.ball, x = sx(b.x), y = sy(b.y), r = this.ballRadius(f);
    const dot = (ang: number, facing: number, alpha: number, n: number) => {
      const rad = (ang * Math.PI) / 180, dx = Math.cos(rad) * facing, dy = -Math.sin(rad);
      for (let i = 0; i < n; i++) {
        const d = r + 7 + i * 9;
        ctx.globalAlpha = alpha * (1 - i / (n + 1));
        ctx.beginPath(); ctx.arc(x + dx * d, y + dy * d, 2.6 - i * 0.18, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      return [x + dx * (r + 7 + n * 9 + 8), y + dy * (r + 7 + n * 9 + 8)];
    };
    // The last shot's aim, faint, to aim this one against.
    if (a.lastAngle !== null && (a.lastAngle !== a.angle || a.lastFacing !== a.facing)) { ctx.fillStyle = L.dim; dot(a.lastAngle, a.lastFacing, 0.5, 7); }
    ctx.fillStyle = L.ball;
    ctx.strokeStyle = L.ballEdge;
    const [tx, ty] = dot(a.angle, a.facing, 1, 7);
    ctx.font = "700 11px ui-rounded, 'SF Pro Rounded', system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(0,0,0,0.55)";
    const label = `${Math.round(a.angle)}°`;
    ctx.strokeText(label, tx, ty); ctx.fillText(label, tx, ty);

    // The meter, upright behind the ball: it fills with the power, ticks at the quarters, marks the last shot's.
    const mh = 54, mw = 9, mx = x - a.facing * (r + 16) - mw / 2, my = y - mh / 2 - 6;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(ctx, mx - 2, my - 2, mw + 4, mh + 4, 6); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, mx, my, mw, mh, 4.5); ctx.fill();
    if (a.charging || a.power > 0) {
      const g = ctx.createLinearGradient(0, my + mh, 0, my);
      g.addColorStop(0, L.meter[0]); g.addColorStop(0.6, L.meter[1]); g.addColorStop(1, L.meter[2]);
      ctx.fillStyle = g;
      const fh = Math.max(2, a.power * mh);
      ctx.save(); roundRect(ctx, mx, my, mw, mh, 4.5); ctx.clip();
      ctx.fillRect(mx, my + mh - fh, mw, fh);
      ctx.restore();
      if (a.power > 0.985) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; roundRect(ctx, mx - 1, my - 1, mw + 2, mh + 2, 5.5); ctx.stroke(); }
    }
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (const q of [0.25, 0.5, 0.75]) ctx.fillRect(mx + 2, my + mh * (1 - q), mw - 4, 1);
    if (a.last !== null) {
      ctx.fillStyle = "#fff";
      const ly = my + mh * (1 - a.last);
      ctx.beginPath(); ctx.moveTo(mx - 5, ly - 3.5); ctx.lineTo(mx - 1, ly); ctx.lineTo(mx - 5, ly + 3.5); ctx.closePath(); ctx.fill();
    }
  }

  private particles(f: Frame, sx: (x: number) => number, sy: (y: number) => number, front: boolean) {
    const { ctx } = this;
    for (const p of f.particles) {
      if ((p.kind === "confetti" || p.kind === "ring") !== front) continue;
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.5));
      ctx.fillStyle = p.color;
      if (p.kind === "ring") {
        ctx.strokeStyle = p.color; ctx.lineWidth = 3 * k;
        ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), (1 - k * k) * p.size * f.cam.scale, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === "confetti") {
        ctx.save(); ctx.translate(sx(p.x), sy(p.y)); ctx.rotate(p.age * 8 + p.size * 10);
        ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.size * (p.kind === "drop" ? 1 : 0.6 + 0.6 * (1 - k)), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Off screen, the flag is pointed to from the edge, with how far it is. */
  private flagPointer(f: Frame, sx: (x: number) => number, sy: (y: number) => number) {
    const { ctx, look: L, w, h } = this;
    const c = this.hole.cup, fx = sx(c.x), fy = sy(c.y + 1.4);
    if (fx > 12 && fx < w - 12 && fy > 12 && fy < h - 12) return;
    const cx = w / 2, cy = h / 2, dx = fx - cx, dy = fy - cy;
    const k = Math.min((w / 2 - 26) / Math.abs(dx || 1e-6), (h / 2 - 26) / Math.abs(dy || 1e-6));
    // Kept clear of the corners, where the words are.
    const px = Math.max(34, Math.min(w - 34, cx + dx * k)), py = Math.max(96, Math.min(h - 56, cy + dy * k)), ang = Math.atan2(fy - py, fx - px);
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(ang);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(19, 0); ctx.lineTo(13, -5); ctx.lineTo(13, 5); ctx.closePath(); ctx.fill();
    ctx.rotate(-ang);
    // A little flag.
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-4, 7); ctx.lineTo(-4, -7); ctx.stroke();
    ctx.fillStyle = L.flag;
    ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(5, -4); ctx.lineTo(-4, -1); ctx.closePath(); ctx.fill();
    ctx.restore();
    const dist = Math.round(Math.abs(c.x - f.ball.x));
    ctx.font = "700 10px ui-rounded, 'SF Pro Rounded', system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const ty = py + (py > h / 2 ? -24 : 24), tx = Math.min(w - 22, Math.max(22, px + (px > w / 2 ? -2 : 2)));
    ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(0,0,0,0.65)"; ctx.strokeText(`${dist} m`, tx, ty);
    ctx.fillStyle = "#fff"; ctx.fillText(`${dist} m`, tx, ty);
  }

  /** The hole in profile, small, top centre: where the ball is against the flag. */
  map(ctx2: CanvasRenderingContext2D, ball: Pt, w: number, h: number) {
    const L = this.look, g = this.hole.ground;
    const x0 = -10, x1 = 103, y0 = -7, y1 = 30;
    const mx = (x: number) => ((x - x0) / (x1 - x0)) * w, my = (y: number) => h - ((y - y0) / (y1 - y0)) * h;
    ctx2.clearRect(0, 0, w, h);
    ctx2.fillStyle = "rgba(10, 20, 28, 0.22)";
    ctx2.beginPath(); ctx2.roundRect(0, 0, w, h, 6); ctx2.fill();
    ctx2.fillStyle = L.stars ? "rgba(220, 225, 240, 0.45)" : "rgba(255,255,255,0.6)";
    ctx2.beginPath(); ctx2.moveTo(mx(x0), h);
    for (const [x, y] of g) ctx2.lineTo(mx(Math.min(x1, x)), my(Math.max(y0, y)));
    ctx2.lineTo(mx(x1), h); ctx2.closePath(); ctx2.fill();
    ctx2.beginPath(); NEEDLE.forEach(([x, y], i) => (i ? ctx2.lineTo : ctx2.moveTo).call(ctx2, mx(x), my(y))); ctx2.closePath(); ctx2.fill();
    for (const wr of this.hole.water) { ctx2.fillStyle = this.flat ? this.flat.water[0] : L.water[0]; ctx2.fillRect(mx(wr.x0), my(wr.y1), mx(wr.x1) - mx(wr.x0), my(wr.y0) - my(wr.y1)); }
    const c = this.hole.cup;
    ctx2.fillStyle = L.flag; ctx2.fillRect(mx(c.x), my(c.y + 4), 2, my(c.y) - my(c.y + 4));
    ctx2.beginPath(); ctx2.moveTo(mx(c.x) + 2, my(c.y + 4)); ctx2.lineTo(mx(c.x) + 7, my(c.y + 3.2)); ctx2.lineTo(mx(c.x) + 2, my(c.y + 2.4)); ctx2.fill();
    ctx2.fillStyle = "#fff"; ctx2.strokeStyle = L.ballEdge; ctx2.lineWidth = 1;
    ctx2.beginPath(); ctx2.arc(mx(Math.max(x0, Math.min(x1, ball[0]))), my(Math.max(y0, Math.min(y1, ball[1]))), 2.6, 0, Math.PI * 2); ctx2.fill(); ctx2.stroke();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
