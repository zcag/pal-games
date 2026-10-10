// Uphill's picture: a calm sky and three dim hill silhouettes behind, the
// ground the wheels touch (the same points as the physics), and in front the
// only bright things: the car, the coins and the fuel cans. Flat 2D on a
// canvas at the screen's pixel ratio; the world is drawn in metres, y up.
import { STEP, ground, noise, profile } from "../game/terrain.ts";
import type { Can, Coin, Pose } from "../game/sim.ts";
import { FEEL } from "../game/sim.ts";
import { SCENES, layers, type Layer, type LookId, type Scene } from "./looks.ts";
import { Fore } from "./fore.ts";
import type { StyleId } from "./paint.ts";

export type Scheme = "light" | "dark";
type Palette = {
  sky: [string, string]; sun: string; far: string; mid: string; near: string;
  ground: string; rim: string; rimDark: string; strata: string; pit: string;
  body: string; bodyDark: string; trim: string; tire: string; hub: string; jacket: string; helmet: string; visor: string;
  coin: string; coinEdge: string; can: string; canEdge: string; post: string; sign: string; signText: string; flag: string; dust: string;
};
const PALETTES: Record<Scheme, Palette> = {
  dark: {
    sky: ["#16222e", "#3a4f5c"], sun: "#e9cf9f", far: "#2c3d49", mid: "#24333d", near: "#1c2930",
    ground: "#2b3527", rim: "#93b35c", rimDark: "#5f7a3a", strata: "#252e21", pit: "#141a14",
    body: "#ff6b3d", bodyDark: "#c2401e", trim: "#f4ead6", tire: "#15191c", hub: "#9aa4ab", jacket: "#2f5d7c", helmet: "#f4ead6", visor: "#1b2329",
    coin: "#ffce47", coinEdge: "#a06a00", can: "#45e0b3", canEdge: "#0e5644", post: "#6b5a46", sign: "#e7dcc6", signText: "#3a3128", flag: "#ffce47", dust: "#a3946e",
  },
  light: {
    sky: ["#8fc3dc", "#f1e6cc"], sun: "#fff3d6", far: "#b9d0cb", mid: "#9dbbb0", near: "#86a897",
    ground: "#6c8848", rim: "#a9cc5c", rimDark: "#55703a", strata: "#617c40", pit: "#3e4f2c",
    body: "#f2522a", bodyDark: "#b23614", trim: "#fff7e8", tire: "#1c2125", hub: "#b8c0c6", jacket: "#2f5d7c", helmet: "#fff7e8", visor: "#1b2329",
    coin: "#ffc531", coinEdge: "#9a6200", can: "#2fd0a2", canEdge: "#0b4d3c", post: "#7a6650", sign: "#fbf3e2", signText: "#3a3128", flag: "#ffb800", dust: "#b9a77d",
  },
};

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: "dust" | "spark" };
export type Float = { x: number; y: number; text: string; life: number; coin?: boolean; sum?: number };
export type Camera = { x: number; y: number; ppm: number; shake: number };
export type Frame = {
  seed: number; pose: Pose; /** Seconds since the driver's head hit the ground, or -1. */ dizzy: number; coins: Coin[]; cans: Can[]; best: number; t: number;
  particles: Particle[]; floats: Float[]; cam: Camera; travel: number[];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class Renderer {
  ctx: CanvasRenderingContext2D;
  w = 0; h = 0; dpr = 1;
  pal: Palette = PALETTES.dark;
  base: Scheme = "dark";
  /** The look's scene, null for Classic; its layers once they are recoloured. */
  scene: Scene | null = null;
  layers: { layers: Layer[]; h: number } | null = null;
  look: LookId = "classic";
  /** The foreground's style (K), and its sprites for the look, the style and the screen's scale. */
  style: StyleId = "cartoon";
  fore: Fore | null = null;
  foreFor(sc: Scene) {
    const px = (this.h / 10) * this.dpr;
    const f = this.fore;
    if (!f || f.scene !== sc || f.style !== this.style || f.px !== px) this.fore = new Fore(this.style, sc, px);
    return this.fore!;
  }
  /** The camera's height, followed slowly: the layers part by how far the camera is off it. */
  yRef: number | null = null;
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }
  scheme(s: Scheme) { this.base = s; this.setLook(this.look); }
  /** A look: Classic follows pal's theme; a scene keeps its own colours, and its pickups and signs take them too. */
  setLook(id: LookId): Promise<void> {
    this.look = id;
    if (id === "classic") { this.scene = null; this.layers = null; this.pal = PALETTES[this.base]; return Promise.resolve(); }
    const scene = SCENES[id];
    this.scene = scene;
    const k = scene.ink;
    this.pal = { ...PALETTES[this.base], post: k.post, sign: k.sign, signText: k.signText, flag: k.flag, dust: k.dust, coin: k.coin, coinEdge: k.coinDark, can: k.can, canEdge: k.canDark };
    return layers(id).then((l) => { if (this.look === id) this.layers = l; });
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
  }

  /** World metres to CSS pixels. */
  sx(f: Frame, x: number) { return this.w / 2 + (x - f.cam.x) * f.cam.ppm; }
  sy(f: Frame, y: number) { return this.h * 0.56 - (y - f.cam.y) * f.cam.ppm; }

  draw(f: Frame) {
    if (this.scene) return this.drawScene(f, this.scene);
    const { ctx, pal } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // Sky.
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(1, pal.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.save();
    if (f.cam.shake > 0) ctx.translate((Math.sin(f.t * 91) * f.cam.shake), (Math.cos(f.t * 77) * f.cam.shake));
    this.sun();
    this.hills(f, 0.1, 0.5, pal.far, 14, 0.3, 11);
    this.hills(f, 0.22, 0.58, pal.mid, 11, 0.42, 23);
    this.hills(f, 0.4, 0.66, pal.near, 9, 0.55, 37);
    this.ground(f);
    this.markers(f);
    for (const c of f.cans) this.can(f, c);
    for (const c of f.coins) if (!c.taken) this.coin(f, c);
    this.particles(f, "dust");
    this.car(f);
    this.particles(f, "spark");
    this.floats(f);
    ctx.restore();
  }

  sun() {
    const { ctx } = this;
    const x = this.w * 0.8, y = this.h * 0.2;
    const r = Math.min(this.w, this.h) * 0.07;
    const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 5);
    glow.addColorStop(0, this.pal.sun + "40");
    glow.addColorStop(1, this.pal.sun + "00");
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    ctx.fillStyle = this.pal.sun;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** A hill silhouette: `f` of the camera's travel, its base at `base` of the height, `amp` metres-ish tall. */
  hills(fr: Frame, f: number, base: number, color: string, amp: number, scale: number, seed: number) {
    const { ctx } = this;
    const ppm = fr.cam.ppm * scale;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, this.h);
    // A little of the camera's height too, so the layers part as you climb.
    const lift = (fr.cam.y * f * 0.5) * ppm;
    for (let px = -8; px <= this.w + 8; px += 6) {
      const u = fr.cam.x * f + (px - this.w / 2) / ppm;
      const y = this.h * base + lift - (noise(seed, u / 30) * amp + noise(seed + 5, u / 9) * amp * 0.25) * ppm * 0.6;
      ctx.lineTo(px, y);
    }
    ctx.lineTo(this.w, this.h);
    ctx.closePath();
    ctx.fill();
  }

  ground(f: Frame) {
    const { ctx, pal } = this;
    const span = this.w / 2 / f.cam.ppm + 2;
    const x0 = Math.floor((f.cam.x - span) / STEP) * STEP, x1 = f.cam.x + span;
    const pts = profile(f.seed, x0, x1);
    const path = (dy: number) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, this.sx(f, p.x), this.sy(f, p.y - dy)));
    };
    const bottom = this.h + 40;
    path(0);
    ctx.lineTo(this.sx(f, pts[pts.length - 1].x), bottom);
    ctx.lineTo(this.sx(f, pts[0].x), bottom);
    ctx.closePath();
    ctx.fillStyle = pal.ground;
    ctx.fill();
    // Strata: the surface again, lower down, so the earth reads as layers that follow the hill.
    ctx.lineJoin = "round";
    ctx.strokeStyle = pal.strata;
    for (const [dy, w] of [[1.3, 0.5], [2.9, 0.8], [5.2, 1.2]] as const) {
      path(dy);
      ctx.lineWidth = w * f.cam.ppm;
      ctx.stroke();
    }
    // The grass rim the wheels roll on, with its darker underside.
    path(0.16);
    ctx.lineWidth = 0.16 * f.cam.ppm;
    ctx.strokeStyle = pal.rimDark;
    ctx.stroke();
    path(0);
    ctx.lineWidth = 0.2 * f.cam.ppm;
    ctx.strokeStyle = pal.rim;
    ctx.stroke();
  }

  /** A post every 100 m with its distance, and a flag where your best run ended. */
  markers(f: Frame) {
    const { ctx, pal } = this;
    const span = this.w / 2 / f.cam.ppm + 3;
    const ppm = f.cam.ppm;
    const post = (x: number, label: string, flag: boolean) => {
      const gx = this.sx(f, x), gy = this.sy(f, ground(f.seed, x));
      ctx.strokeStyle = pal.post;
      ctx.lineWidth = 0.12 * ppm;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - 2.1 * ppm); ctx.stroke();
      if (flag) {
        const wave = Math.sin(f.t * 5) * 0.08 * ppm;
        ctx.fillStyle = pal.flag;
        ctx.beginPath();
        ctx.moveTo(gx, gy - 2.1 * ppm);
        ctx.quadraticCurveTo(gx + 0.6 * ppm, gy - 2.0 * ppm + wave, gx + 1.1 * ppm, gy - 1.85 * ppm);
        ctx.quadraticCurveTo(gx + 0.6 * ppm, gy - 1.6 * ppm - wave, gx, gy - 1.5 * ppm);
        ctx.fill();
      }
      ctx.font = `600 ${Math.max(9, 0.42 * ppm)}px ui-rounded, system-ui, sans-serif`;
      const tw = ctx.measureText(label).width + 0.36 * ppm;
      const th = 0.62 * ppm, ty = flag ? gy - 1.0 * ppm : gy - 2.1 * ppm;
      ctx.fillStyle = pal.sign;
      ctx.beginPath();
      ctx.roundRect(gx - tw / 2, ty - th / 2, tw, th, 0.12 * ppm);
      ctx.fill();
      ctx.fillStyle = pal.signText;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, gx, ty + 0.02 * ppm);
    };
    for (let d = Math.ceil((f.cam.x - 8 - span) / 100) * 100; d < f.cam.x - 8 + span; d += 100) if (d > 0) post(d + 8, `${d} m`, false);
    if (f.best > 20 && Math.abs(f.best + 8 - f.cam.x) < span) post(f.best + 8, "best", true);
  }

  coin(f: Frame, c: Coin) {
    const { ctx, pal } = this;
    const x = this.sx(f, c.x), y = this.sy(f, c.y), r = 0.3 * f.cam.ppm;
    const sx = Math.max(0.18, Math.abs(Math.cos(f.t * 2.6 + c.x * 0.7)));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, 1);
    ctx.fillStyle = pal.coinEdge;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.coin;
    ctx.beginPath(); ctx.arc(0, -r * 0.06, r * 0.84, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.coinEdge;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = r * 0.13;
    ctx.beginPath(); ctx.arc(0, -r * 0.06, r * 0.52, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  can(f: Frame, c: Can) {
    if (c.taken) return;
    const { ctx, pal } = this;
    const ppm = f.cam.ppm;
    const x = this.sx(f, c.x), y = this.sy(f, c.y + Math.sin(f.t * 3 + c.x) * 0.08);
    const w = 0.62 * ppm, h = 0.8 * ppm;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.08);
    // A soft halo so it is found from far off.
    const glow = ctx.createRadialGradient(0, 0, w * 0.3, 0, 0, w * 1.6);
    glow.addColorStop(0, pal.can + "55");
    glow.addColorStop(1, pal.can + "00");
    ctx.fillStyle = glow;
    ctx.fillRect(-w * 1.6, -w * 1.6, w * 3.2, w * 3.2);
    ctx.fillStyle = pal.canEdge;
    ctx.beginPath(); ctx.roundRect(-w / 2 - 0.05 * ppm, -h / 2 - 0.05 * ppm, w + 0.1 * ppm, h + 0.1 * ppm, 0.14 * ppm); ctx.fill();
    ctx.fillStyle = pal.can;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 0.1 * ppm); ctx.fill();
    // The handle and spout.
    ctx.fillStyle = pal.canEdge;
    ctx.fillRect(-w * 0.32, -h / 2 - 0.16 * ppm, w * 0.42, 0.12 * ppm);
    ctx.fillRect(w * 0.18, -h / 2 - 0.2 * ppm, w * 0.16, 0.2 * ppm);
    // A drop.
    ctx.fillStyle = pal.canEdge;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.2);
    ctx.quadraticCurveTo(w * 0.22, h * 0.08, 0, h * 0.2);
    ctx.quadraticCurveTo(-w * 0.22, h * 0.08, 0, -h * 0.2);
    ctx.fill();
    ctx.restore();
  }

  car(f: Frame) {
    const { ctx, pal } = this;
    const p = f.pose, ppm = f.cam.ppm;
    const ca = Math.cos(p.a), sa = Math.sin(p.a);
    const world = (lx: number, ly: number) => ({ x: p.x + lx * ca - ly * sa, y: p.y + lx * sa + ly * ca });
    // Suspension: a strut and a coil from the chassis to each hub, drawn first so the tub sits over it.
    p.wheels.forEach((w, i) => {
      const a = world((i ? 1 : -1) * FEEL.wheel.x, -0.02);
      const ax = this.sx(f, a.x), ay = this.sy(f, a.y), wx = this.sx(f, w.x), wy = this.sy(f, w.y);
      ctx.strokeStyle = pal.tire;
      ctx.lineCap = "round";
      ctx.lineWidth = 0.14 * ppm;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(wx, wy); ctx.stroke();
      const dx = wx - ax, dy = wy - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      ctx.strokeStyle = pal.hub;
      ctx.lineWidth = 0.05 * ppm;
      ctx.beginPath();
      const turns = 7;
      for (let k = 0; k <= turns * 2; k++) {
        const t = 0.12 + (k / (turns * 2)) * 0.62, side = (k % 2 ? 1 : -1) * 0.13 * ppm;
        const x = ax + dx * t + nx * side, y = ay + dy * t + ny * side;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
    for (const w of p.wheels) this.wheel(f, w);

    ctx.save();
    ctx.translate(this.sx(f, p.x), this.sy(f, p.y));
    ctx.scale(ppm, -ppm);
    ctx.rotate(p.a);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    // Roll bar behind the driver.
    ctx.strokeStyle = pal.tire;
    ctx.lineWidth = 0.09;
    ctx.beginPath(); ctx.moveTo(-0.78, 0.2); ctx.lineTo(-0.66, 1.12); ctx.lineTo(-0.36, 1.16); ctx.stroke();
    // The driver: a seat, a jacket, a helmet with its visor looking ahead.
    ctx.fillStyle = pal.jacket;
    ctx.beginPath(); ctx.roundRect(-0.5, 0.18, 0.5, 0.52, 0.14); ctx.fill();
    ctx.strokeStyle = pal.jacket;
    ctx.lineWidth = 0.12;
    ctx.beginPath(); ctx.moveTo(-0.08, 0.55); ctx.lineTo(0.26, 0.5); ctx.stroke();
    ctx.fillStyle = pal.helmet;
    ctx.beginPath(); ctx.arc(-0.18, 0.86, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.visor;
    ctx.beginPath(); ctx.roundRect(-0.12, 0.8, 0.24, 0.14, 0.06); ctx.fill();
    ctx.fillStyle = pal.body;
    ctx.fillRect(-0.42, 0.98, 0.32, 0.06);
    // Windscreen frame and wheel.
    ctx.strokeStyle = pal.tire;
    ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.moveTo(0.62, 0.2); ctx.lineTo(0.4, 0.66); ctx.stroke();
    ctx.strokeStyle = pal.trim;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(0.54, 0.2); ctx.lineTo(0.35, 0.6); ctx.stroke();
    ctx.globalAlpha = 1;
    // The tub: long and low, a darker skirt, a cream stripe, a headlamp.
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(-1.32, 0.24); ctx.lineTo(0.7, 0.24); ctx.lineTo(1.3, 0.1); ctx.lineTo(1.34, -0.12);
    ctx.lineTo(1.2, -0.27); ctx.lineTo(-1.22, -0.27); ctx.lineTo(-1.34, -0.1); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.bodyDark;
    ctx.beginPath();
    ctx.moveTo(-1.31, -0.12); ctx.lineTo(1.33, -0.12); ctx.lineTo(1.2, -0.27); ctx.lineTo(-1.22, -0.27); ctx.closePath();
    ctx.fill();
    // Wheel arches cut into the tub, so the wheels read as tucked under it.
    ctx.fillStyle = pal.tire;
    for (const sx of [-FEEL.wheel.x, FEEL.wheel.x]) { ctx.beginPath(); ctx.arc(sx, -0.3, 0.52, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = pal.trim;
    ctx.fillRect(-1.2, 0.04, 2.2, 0.07);
    ctx.beginPath(); ctx.arc(1.24, 0.02, 0.075, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.bodyDark;
    ctx.fillRect(-1.38, -0.05, 0.1, 0.18);
    ctx.restore();
    if (f.dizzy >= 0) this.stars(f);
  }

  /** Three little stars circling the driver's head once it has hit the ground. */
  stars(f: Frame) {
    const { ctx, pal } = this;
    const hx = this.sx(f, f.pose.head.x), hy = this.sy(f, f.pose.head.y), ppm = f.cam.ppm;
    const grow = Math.min(1, f.dizzy * 3);
    for (let k = 0; k < 3; k++) {
      const a = f.t * 4 + (k / 3) * Math.PI * 2;
      const x = hx + Math.cos(a) * 0.5 * ppm, y = hy - 0.45 * ppm + Math.sin(a) * 0.16 * ppm;
      const r = 0.13 * ppm * grow * (0.75 + 0.25 * Math.sin(a));
      ctx.fillStyle = pal.coin;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r, aa = (i / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
      }
      ctx.fill();
    }
  }

  wheel(f: Frame, w: { x: number; y: number; a: number }) {
    const { ctx, pal } = this;
    const ppm = f.cam.ppm, r = FEEL.wheel.r;
    ctx.save();
    ctx.translate(this.sx(f, w.x), this.sy(f, w.y));
    ctx.scale(ppm, -ppm);
    ctx.rotate(w.a);
    ctx.fillStyle = pal.tire;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // Tread blocks, so the spin is plain to see.
    ctx.fillStyle = "#2c3338";
    for (let k = 0; k < 10; k++) {
      ctx.save(); ctx.rotate((k / 10) * Math.PI * 2);
      ctx.fillRect(r - 0.07, -0.05, 0.07, 0.1);
      ctx.restore();
    }
    ctx.fillStyle = pal.hub;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.tire;
    ctx.lineWidth = 0.05;
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.rotate((k / 3) * Math.PI * 2);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.48, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = pal.body;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  particles(f: Frame, kind: Particle["kind"]) {
    const { ctx } = this;
    for (const p of f.particles) {
      if (p.kind !== kind) continue;
      const t = p.life / p.max;
      ctx.globalAlpha = kind === "dust" ? t * 0.55 : t;
      ctx.fillStyle = p.color === "dust" ? this.pal.dust : p.color === "coin" ? this.pal.coin : p.color === "can" ? this.pal.can : p.color;
      const s = p.size * (kind === "dust" ? lerp(2.2, 1, t) : t) * f.cam.ppm;
      ctx.beginPath(); ctx.arc(this.sx(f, p.x), this.sy(f, p.y), s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  floats(f: Frame) {
    const { ctx, pal } = this;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const fl of f.floats) {
      const t = fl.life;
      ctx.globalAlpha = Math.min(1, t * 2.5);
      ctx.font = `700 ${Math.max(10, 0.46 * f.cam.ppm)}px ui-rounded, system-ui, sans-serif`;
      const x = this.sx(f, fl.x), y = this.sy(f, fl.y + (1 - t) * 1.4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = pal.coinEdge;
      ctx.strokeText(fl.text, x, y);
      ctx.fillStyle = pal.coin;
      ctx.fillText(fl.text, x, y);
    }
    ctx.globalAlpha = 1;
  }

  // ---- the scene looks ------------------------------------------------------------------------------------------

  drawScene(f: Frame, sc: Scene) {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, this.h * 0.7);
    g.addColorStop(0, sc.sky[0]);
    g.addColorStop(1, sc.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.save();
    if (f.cam.shake > 0) ctx.translate(Math.sin(f.t * 91) * f.cam.shake, Math.cos(f.t * 77) * f.cam.shake);
    if (sc.sun) {
      const x = this.w * sc.sun.x, y = this.h * sc.sun.y, r = Math.min(this.w, this.h) * sc.sun.r;
      const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4);
      glow.addColorStop(0, sc.sun.glow + "66");
      glow.addColorStop(1, sc.sun.glow + "00");
      ctx.fillStyle = glow;
      ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      ctx.fillStyle = sc.sun.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    this.parallax(f);
    const fore = this.foreFor(sc);
    const v = { sx: (x: number) => this.sx(f, x), sy: (y: number) => this.sy(f, y), ppm: f.cam.ppm, w: this.w, h: this.h };
    fore.backProps(ctx, v, f.cam.x, f.seed);
    fore.ground(ctx, v, f.cam.x, f.seed);
    this.markers(f);
    for (const c of f.cans) fore.can(ctx, v, c, f.t);
    for (const c of f.coins) if (!c.taken) fore.coin(ctx, v, c, f.t);
    this.particles(f, "dust");
    fore.car(ctx, v, f.pose, f.seed);
    if (f.dizzy >= 0) this.stars(f);
    this.particles(f, "spark");
    this.floats(f);
    ctx.restore();
  }

  /** The layers, back to front: each tiled across and moved by its share of the camera's travel. */
  parallax(f: Frame) {
    const L = this.layers;
    if (!L) return;
    const { ctx } = this;
    // The art's 900 pixels are a little taller than the screen, its top above it, so the far ridges sit high and the trees just over the road.
    const sc = this.scene!;
    const k = (this.h * 1.22) / L.h, top = -this.h * (0.36 - (sc.drop ?? 0));
    this.yRef = this.yRef === null ? f.cam.y : this.yRef + (f.cam.y - this.yRef) * 0.02;
    // The layers move at the unzoomed scale: the zoom follows speed, and scaling the offset by it shifted every layer
    // by the whole run's distance times the change, a jump on each brake.
    const ppm = this.h / 10;
    const dy = Math.max(-0.12, Math.min(0.12, ((f.cam.y - this.yRef) * ppm) / this.h)) * this.h;
    L.layers.forEach((l, i) => {
      const front = i === L.layers.length - 1;
      const b = l.band, tw = b.w * k;
      const off = (((f.cam.x * ppm * l.rate + (l.rate < 0.02 ? f.t * 6 : 0)) % tw) + tw) % tw;
      const y = top + dy * l.rate * 4 + b.y0 * k, hh = (b.y1 - b.y0) * k;
      ctx.globalAlpha = l.alpha;
      for (let x = -off; x < this.w; x += tw) ctx.drawImage(l.canvas, Math.floor(x), y, Math.ceil(tw) + 1, hh);
      if (b.floor) {
        // Under the nearest layer the land darkens toward the ground's colour, so a gap in the road reads as a drop.
        const y0 = y + hh - 1;
        if (front) {
          const g = ctx.createLinearGradient(0, y0, 0, y0 + this.h * 0.35);
          g.addColorStop(0, l.color);
          g.addColorStop(1, sc.ink.ground);
          ctx.fillStyle = g;
        } else ctx.fillStyle = l.color;
        ctx.fillRect(0, y0, this.w, this.h - y0 + 2);
      }
    });
    ctx.globalAlpha = 1;
  }
}
