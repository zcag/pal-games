// Everything in front of the landscape layers, in the style K picks: the
// ground (its top band, the earth under it with its strata and stones, what
// grows on it), the pines or buttes just behind it, the car, the coins and
// the fuel cans. One set of shapes, finished three ways (paint.ts): Cartoon
// (outlines, cel shade, gloss), Soft (gradients, blurred shade, a shadow
// under the car) and Silhouette (flat fills and a lit rim, like the layers).
//
// Rigid things are drawn once into sprites at the unzoomed scale and only
// placed each frame: the body, the fenders, the wheels, the pickups, the
// props. The ground and the suspension change every frame and are drawn as
// paths: a few bands offset from the same points the wheels touch.
import { STEP, ground, profile } from "../game/terrain.ts";
import type { Can, Coin, Pose } from "../game/sim.ts";
import { FEEL } from "../game/sim.ts";
import type { Ink, Land, Scene } from "./looks.ts";
import { LX, LY, Shape, finish, hash, mix, put, rgba, sprite, type Finish, type Sprite, type StyleId } from "./paint.ts";

type View = { sx: (x: number) => number; sy: (y: number) => number; ppm: number; w: number; h: number };
const R = FEEL.wheel.r, WX = FEEL.wheel.x;

export class Fore {
  F: Finish;
  k: Ink; L: Land;
  body: Sprite; fenders: Sprite; wheel: Sprite; wheelLight: Sprite;
  coinFace: Sprite; coinEdge: Sprite; canSprite: Sprite;
  growth: Sprite[]; stones: Sprite[]; back: Sprite[];

  constructor(public style: StyleId, public scene: Scene, public px: number) {
    const L = (this.L = scene.land);
    this.k = scene.ink;
    this.F = { id: style, ink: L.ink, lw: 0.045, px, shadowInk: L.shadow, lightInk: L.light };
    this.body = sprite(3.6, 2.3, 1.8, 0.8, px, (g) => this.drawBody(g));
    this.fenders = sprite(3.6, 1.6, 1.8, 1.2, px, (g) => this.drawFenders(g));
    this.wheel = sprite(1.16, 1.16, 0.58, 0.58, px, (g) => this.drawWheel(g));
    this.wheelLight = sprite(1.16, 1.16, 0.58, 0.58, px, (g) => this.drawWheelLight(g));
    this.coinFace = sprite(0.76, 0.76, 0.38, 0.38, px, (g) => this.drawCoin(g, false));
    this.coinEdge = sprite(0.76, 0.76, 0.38, 0.38, px, (g) => this.drawCoin(g, true));
    this.canSprite = sprite(1.0, 1.2, 0.5, 0.55, px, (g) => this.drawCan(g));
    this.growth = (L.growth === "desert" ? ["rock", "drytuft", "cactus", "rock2", "drytuft"] : ["tuft", "rock", "flowers", "tuft2", "bush"]).map((kind) => sprite(1.6, 1.4, 0.8, 0.2, px, (g) => this.drawGrowth(g, kind)));
    this.stones = [0, 1, 2].map((i) => sprite(0.9, 0.6, 0.45, 0.3, px, (g) => this.drawStone(g, i)));
    this.back = (scene.props === "pines" ? [0, 1, 2] : [3, 4, 5]).map((i) => sprite(4, 4.4, 2, 0.4, px, (g) => this.drawBack(g, i)));
  }

  private tone(base: string, lit = 0.32, shade = 0.38) { return { base, lit: mix(base, this.L.light, lit), shade: mix(base, this.L.shadow, shade) }; }

  // ---- the car ----------------------------------------------------------------------------------------------------

  /** The tub's outline: a deck behind the seat, the cockpit dipped to a sill, the cowl and hood, the nose, and an arch round each wheel. */
  private tub() {
    const s = new Shape();
    const arch = (cx: number, from: number, to: number) => {
      for (let i = 0; i <= 14; i++) { const a = from + ((to - from) * i) / 14; s.l(cx + Math.cos(a) * 0.56, -0.42 + Math.sin(a) * 0.56); }
    };
    s.m(-1.26, 0.32).l(-0.86, 0.32).q(-0.8, 0.32, -0.76, 0.22).q(-0.72, 0.13, -0.62, 0.13).l(0.22, 0.13).q(0.33, 0.13, 0.36, 0.26)
      .l(0.42, 0.39).l(1.12, 0.35).q(1.32, 0.33, 1.35, 0.16).l(1.37, -0.03);
    arch(WX, Math.atan2(0.39, 0.45), Math.atan2(0.16, -0.537));
    s.l(-0.38, -0.26);
    arch(-WX, Math.atan2(0.16, 0.537), Math.atan2(0.39, -0.4));
    s.l(-1.32, 0.26).q(-1.32, 0.32, -1.26, 0.32).z();
    return s;
  }

  private drawBody(g: CanvasRenderingContext2D) {
    const { F, k } = this;
    const frame = this.tone(k.frame, 0.25, 0.3);
    // The spare wheel on the tail, the roll hoop and the seat, behind the driver.
    finish(g, new Shape().circle(-1.38, 0.34, 0.27), F, this.tone(k.tire, 0.18, 0.3), { cel: 0.08 });
    finish(g, new Shape().circle(-1.38, 0.34, 0.13), F, this.tone(k.hub), { cel: 0.04 });
    finish(g, new Shape().tube(-0.97, 0.28, -0.86, 1.15, 0.08).tube(-0.86, 1.15, -0.56, 1.2, 0.08).tube(-0.88, 1.06, -1.24, 0.3, 0.07), F, frame, { cel: 0.03, rim: 0.02 });
    finish(g, new Shape().rect(-0.72, 0.1, 0.26, 0.74, 0.1), F, this.tone(mix(k.frame, k.body, 0.18), 0.2, 0.3), { cel: 0.07 });
    // The driver: a jacket, the arm out to the wheel, a glove on it.
    const jacket = this.tone(k.driver, 0.22, 0.3);
    finish(g, new Shape().m(-0.45, 0.12).l(-0.48, 0.52).q(-0.47, 0.72, -0.27, 0.73).l(-0.12, 0.71).q(0.02, 0.67, 0.02, 0.5).l(-0.02, 0.12).z(), F, jacket, { cel: 0.1 });
    finish(g, new Shape().tube(0.1, 0.7, 0.23, 0.42, 0.055).tube(0.19, 0.5, 0.38, 0.33, 0.045), F, frame, { cel: 0.02, rim: 0.012 });
    finish(g, new Shape().tube(-0.2, 0.6, 0.03, 0.42, 0.13).tube(0.03, 0.42, 0.17, 0.56, 0.115), F, this.tone(mix(k.driver, k.helmet, 0.12), 0.25, 0.3), { cel: 0.04, rim: 0.02 });
    finish(g, new Shape().circle(0.18, 0.57, 0.065), F, frame, { cel: 0.02, rim: 0.015 });
    // The windscreen: a frame and a pane, leaning back.
    const glass = new Shape().pts([[0.35, 0.37], [0.46, 0.37], [0.29, 0.85], [0.2, 0.85]]);
    g.fillStyle = rgba(mix(this.L.light, "#a8d8f0", 0.6), this.style === "flat" ? 0.35 : 0.42);
    g.fill(glass.p);
    g.save(); g.clip(glass.p); g.fillStyle = "rgba(255,255,255,0.5)"; g.fill(new Shape().pts([[0.3, 0.5], [0.36, 0.5], [0.3, 0.7], [0.26, 0.7]]).p); g.restore();
    finish(g, new Shape().tube(0.45, 0.36, 0.28, 0.86, 0.055).tube(0.18, 0.86, 0.3, 0.86, 0.05), F, frame, { cel: 0.02, rim: 0.015 });
    // The tub.
    const tub = this.tub();
    finish(g, tub, F, { base: k.body, lit: F.id === "soft" ? mix(k.body, k.bodyLight, 0.6) : k.bodyLight, shade: k.bodyDark }, { cel: 0.08, rim: 0.045, gloss: 0.7 });
    g.save();
    g.clip(tub.p);
    // A rocker panel along the bottom in the dark tone, a stripe above it, the door's seams and a roundel.
    if (this.style !== "soft") { g.fillStyle = mix(k.bodyDark, this.L.shadow, this.style === "flat" ? 0 : 0.15); g.fillRect(-1.5, -0.4, 3, 0.22); }
    g.fillStyle = this.style === "flat" ? k.bodyLight : k.helmet;
    g.fillRect(-1.4, -0.02, 2.9, 0.055);
    g.fillRect(-1.4, 0.06, 2.9, 0.022);
    g.strokeStyle = rgba(this.L.shadow, 0.45); g.lineWidth = 0.02;
    g.beginPath(); g.moveTo(-0.66, 0.13); g.lineTo(-0.66, -0.24); g.moveTo(0.3, 0.2); g.lineTo(0.3, -0.24); g.stroke();
    g.beginPath(); g.moveTo(0.18, 0.04); g.lineTo(0.06, 0.04); g.lineWidth = 0.03; g.stroke();
    for (const x of [0.72, 0.82, 0.92]) { g.beginPath(); g.moveTo(x, 0.17); g.lineTo(x + 0.04, 0.26); g.lineWidth = 0.03; g.stroke(); }
    g.restore();
    finish(g, new Shape().circle(-0.18, -0.09, 0.12), F, this.tone(k.helmet, 0.2, 0.2), { cel: 0.03, rim: 0.015 });
    g.fillStyle = k.bodyDark;
    star(g, -0.18, -0.09, 0.075);
    if (this.style === "cartoon") { g.strokeStyle = this.F.ink; g.lineWidth = this.F.lw; g.stroke(tub.p); }
    // Bumpers, the skid plate, the exhaust, the lamps.
    finish(g, new Shape().rect(1.26, -0.08, 0.26, 0.15, 0.06), F, frame, { cel: 0.05, rim: 0.02 });
    finish(g, new Shape().rect(-1.52, -0.04, 0.26, 0.15, 0.06), F, frame, { cel: 0.05, rim: 0.02 });
    finish(g, new Shape().rect(-0.42, -0.33, 0.84, 0.09, 0.04), F, frame, { cel: 0.03, rim: 0.015 });
    finish(g, new Shape().tube(-1.48, -0.13, -1.2, -0.1, 0.075), F, this.tone(k.hub, 0.3, 0.35), { cel: 0.025, rim: 0.015 });
    finish(g, new Shape().circle(1.22, 0.2, 0.085), F, this.tone(k.frame), { cel: 0.02, rim: 0.01 });
    finish(g, new Shape().circle(1.225, 0.205, 0.058), F, { base: "#fff3cc", lit: "#ffffff", shade: "#f2d48a" }, { cel: 0.02, rim: 0.01, outline: false });
    finish(g, new Shape().rect(-1.35, 0.13, 0.07, 0.13, 0.02), F, { base: "#ff5a3c", lit: "#ffa08a", shade: "#c02a18" }, { cel: 0.02, rim: 0.01 });
    // The helmet, last: light, a stripe of the car's colour over the crown, the visor dark across the front.
    const hx = -0.18, hy = 0.86;
    const helmet = new Shape().circle(hx, hy, 0.25);
    finish(g, helmet, F, this.tone(k.helmet, 0.3, 0.3), { cel: 0.08, rim: 0.03, gloss: 0.6, outline: false });
    g.save(); g.clip(helmet.p);
    g.fillStyle = k.body;
    g.fillRect(hx - 0.3, hy + 0.12, 0.6, 0.075);
    const visor = new Shape().rect(hx + 0.04, hy - 0.11, 0.3, 0.19, 0.08);
    finish(g, visor, F, { base: k.visor, lit: mix(k.visor, "#9fd0ff", 0.45), shade: k.visor }, { cel: 0.03, rim: 0.035, outline: false });
    g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 0.025;
    g.beginPath(); g.moveTo(hx + 0.12, hy + 0.04); g.lineTo(hx + 0.2, hy + 0.04); g.stroke();
    g.restore();
    if (this.style === "cartoon") { g.strokeStyle = this.F.ink; g.lineWidth = this.F.lw; g.stroke(helmet.p); }
  }

  /** The flares over the wheels: drawn over them, so a wheel pushed up into its arch tucks under. */
  private drawFenders(g: CanvasRenderingContext2D) {
    const { k, F } = this;
    for (const cx of [-WX, WX]) {
      const s = new Shape();
      const a0 = 0.32, a1 = Math.PI - 0.32;
      for (let i = 0; i <= 16; i++) { const a = a0 + ((a1 - a0) * i) / 16; s.l(cx + Math.cos(a) * 0.66, -0.42 + Math.sin(a) * 0.66); }
      for (let i = 16; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / 16; s.l(cx + Math.cos(a) * 0.55, -0.42 + Math.sin(a) * 0.55); }
      s.z();
      finish(g, s, F, this.tone(mix(k.frame, k.bodyDark, 0.35), 0.3, 0.3), { cel: 0.04, rim: 0.025 });
    }
  }

  private drawWheel(g: CanvasRenderingContext2D) {
    const { k, F } = this;
    const tire = k.tire, tread = mix(tire, this.L.light, 0.12);
    const ink = F.id === "cartoon" ? F.ink : null;
    // Lugs round the tread, standing proud of it, so the spin is plain from far off.
    const lugs = new Shape();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const r0 = R - 0.06, r1 = R + 0.035, w = 0.055;
      lugs.pts([[c * r0 - s * w, s * r0 + c * w], [c * r1 - s * w * 0.8, s * r1 + c * w * 0.8], [c * r1 + s * w * 0.8, s * r1 - c * w * 0.8], [c * r0 + s * w, s * r0 - c * w]]);
    }
    g.fillStyle = F.id === "flat" ? tire : tread;
    g.fill(lugs.p);
    if (ink) { g.strokeStyle = ink; g.lineWidth = F.lw * 0.8; g.stroke(lugs.p); }
    const t = new Shape().circle(0, 0, R - 0.01);
    g.fillStyle = tire; g.fill(t.p);
    if (ink) { g.strokeStyle = ink; g.lineWidth = F.lw; g.stroke(t.p); }
    g.strokeStyle = mix(tire, this.L.light, 0.1); g.lineWidth = 0.025;
    g.beginPath(); g.arc(0, 0, 0.36, 0, Math.PI * 2); g.stroke();
    // The rim: a dish, five spokes cut through it, a cap in the car's colour and its bolts.
    const rim = new Shape().circle(0, 0, 0.285);
    g.fillStyle = k.hub; g.fill(rim.p);
    g.fillStyle = mix(k.hub, this.L.shadow, 0.55);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
      const h = new Shape();
      const p = (r: number, da: number) => [Math.cos(a + da) * r, Math.sin(a + da) * r];
      h.pts([p(0.12, -0.22), p(0.235, -0.3), p(0.245, 0), p(0.235, 0.3), p(0.12, 0.22)]);
      g.fill(h.p);
    }
    g.strokeStyle = mix(k.hub, this.L.shadow, 0.3); g.lineWidth = 0.02;
    g.beginPath(); g.arc(0, 0, 0.265, 0, Math.PI * 2); g.stroke();
    if (ink) { g.strokeStyle = ink; g.lineWidth = F.lw * 0.8; g.stroke(rim.p); }
    g.fillStyle = k.body;
    g.beginPath(); g.arc(0, 0, 0.085, 0, Math.PI * 2); g.fill();
    if (ink) { g.strokeStyle = ink; g.lineWidth = F.lw * 0.6; g.stroke(); }
    g.fillStyle = mix(k.hub, this.L.shadow, 0.5);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.02, 0, Math.PI * 2); g.fill(); }
  }

  /** The light on a wheel, which does not turn with it. */
  private drawWheelLight(g: CanvasRenderingContext2D) {
    const { F } = this;
    const t = new Shape().circle(0, 0, R + 0.03);
    g.save(); g.clip(t.p);
    if (F.id === "soft") {
      const gr = g.createRadialGradient(R * 0.45, R * 0.45, 0.05, 0, 0, R * 1.1);
      gr.addColorStop(0, rgba(this.L.light, 0.28)); gr.addColorStop(0.55, rgba(this.L.light, 0)); gr.addColorStop(0.8, rgba(this.L.shadow, 0)); gr.addColorStop(1, rgba(this.L.shadow, 0.5));
      g.fillStyle = gr; g.fill(t.p);
    } else {
      const p = new Path2D(); p.addPath(new Shape().circle(0, 0, R).p); p.addPath(new Shape().circle(-LX * 0.05, -LY * 0.05, R).p);
      g.fillStyle = rgba(this.L.light, F.id === "flat" ? 0.22 : 0.18); g.fill(p, "evenodd");
      g.fillStyle = rgba(this.L.light, 0.35);
      const q = new Path2D(); q.addPath(new Shape().circle(0, 0, 0.285).p); q.addPath(new Shape().circle(-LX * 0.04, -LY * 0.04, 0.285).p);
      g.fill(q, "evenodd");
    }
    if (F.id === "cartoon") {
      g.strokeStyle = "rgba(255,255,255,0.42)"; g.lineWidth = 0.035; g.lineCap = "round";
      g.beginPath(); g.arc(0, 0, R - 0.07, 0.25, 1.05); g.stroke();
    }
    g.restore();
  }

  /** The car: the body, then the coilovers and arms, the wheels on them, the flares over the wheels; and a soft shadow under it all. */
  car(ctx: CanvasRenderingContext2D, v: View, p: Pose, seed: number) {
    const { k, F } = this;
    const ca = Math.cos(p.a), sa = Math.sin(p.a);
    const world = (lx: number, ly: number) => ({ x: p.x + lx * ca - ly * sa, y: p.y + lx * sa + ly * ca });
    if (F.id !== "flat") {
      // The shadow on the ground, smaller and fainter as the car leaves it.
      const gy = ground(seed, p.x), lift = Math.max(0, p.y - gy - 0.7);
      const a = Math.max(0, 1 - lift / 5) * (F.id === "soft" ? 0.38 : 0.26);
      if (a > 0.01) {
        const x = v.sx(p.x), y = v.sy(gy), rx = (1.6 - Math.min(0.6, lift * 0.12)) * v.ppm, ry = 0.2 * v.ppm;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rx);
        gr.addColorStop(0, rgba(this.L.shadow, a)); gr.addColorStop(0.7, rgba(this.L.shadow, a * 0.6)); gr.addColorStop(1, rgba(this.L.shadow, 0));
        ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
        ctx.fillStyle = gr; ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
        ctx.restore();
      }
    }
    put(ctx, this.body, v.sx(p.x), v.sy(p.y), p.a, v.ppm);
    // The suspension, in screen pixels: a trailing arm to the belly, and a coilover from the hub up to the body.
    const ppm = v.ppm, ink = F.id === "cartoon" ? F.ink : null;
    const line = (pts: { x: number; y: number }[], w: number, color: string) => {
      ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(v.sx(q.x), v.sy(q.y)) : ctx.moveTo(v.sx(q.x), v.sy(q.y))));
      if (ink) { ctx.strokeStyle = ink; ctx.lineWidth = (w + F.lw * 1.6) * ppm; ctx.stroke(); }
      ctx.strokeStyle = color; ctx.lineWidth = w * ppm; ctx.stroke();
    };
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    p.wheels.forEach((w, i) => {
      const side = i ? 1 : -1;
      const hub = { x: w.x, y: w.y }, pivot = world(side * 0.3, -0.24), mount = world(side * 0.6, 0.2);
      line([pivot, hub], 0.1, k.frame);
      const mid = (t: number) => ({ x: hub.x + (mount.x - hub.x) * t, y: hub.y + (mount.y - hub.y) * t });
      line([hub, mid(0.62)], 0.045, k.hub);
      line([mid(0.45), mount], 0.11, F.id === "flat" ? k.frame : mix(k.frame, k.hub, 0.25));
      // The spring, a coil wound round the damper.
      const a = { x: v.sx(hub.x), y: v.sy(hub.y) }, b = { x: v.sx(mount.x), y: v.sy(mount.y) };
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, half = 0.085 * ppm;
      ctx.beginPath();
      const turns = 6;
      for (let j = 0; j <= turns * 2; j++) {
        const t = 0.22 + (j / (turns * 2)) * 0.7, s = j % 2 ? 1 : -1;
        const x = a.x + dx * t + nx * half * s, y = a.y + dy * t + ny * half * s;
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      if (ink) { ctx.strokeStyle = ink; ctx.lineWidth = 0.075 * ppm; ctx.stroke(); }
      ctx.strokeStyle = this.style === "flat" ? mix(k.coin, k.frame, 0.2) : k.coin; ctx.lineWidth = 0.04 * ppm; ctx.stroke();
    });
    for (const w of p.wheels) {
      put(ctx, this.wheel, v.sx(w.x), v.sy(w.y), w.a, ppm);
      put(ctx, this.wheelLight, v.sx(w.x), v.sy(w.y), 0, ppm);
    }
    put(ctx, this.fenders, v.sx(p.x), v.sy(p.y), p.a, ppm);
  }

  // ---- coins and cans ---------------------------------------------------------------------------------------------

  private drawCoin(g: CanvasRenderingContext2D, edge: boolean) {
    const { k, F } = this;
    const r = 0.3;
    if (edge) {
      // The coin's rim seen as it turns: the dark gold, set behind the face.
      g.fillStyle = mix(k.coinDark, this.L.shadow, 0.2);
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
      if (F.id === "cartoon") { g.strokeStyle = F.ink; g.lineWidth = F.lw; g.stroke(); }
      return;
    }
    finish(g, new Shape().circle(0, 0, r), F, { base: k.coinDark, lit: mix(k.coin, "#ffffff", 0.35), shade: mix(k.coinDark, this.L.shadow, 0.25) }, { cel: 0.06, rim: 0.04 });
    finish(g, new Shape().circle(0, 0, r * 0.76), F, { base: k.coin, lit: mix(k.coin, "#ffffff", 0.5), shade: mix(k.coin, k.coinDark, 0.6) }, { cel: 0.08, rim: 0.03, gloss: 0.8, outline: false });
    g.fillStyle = mix(k.coinDark, k.coin, 0.25);
    star(g, 0, -0.005, r * 0.42);
    g.fillStyle = rgba("#ffffff", 0.45);
    star(g, 0.012, 0.012, r * 0.42 * 0.86);
  }

  coin(ctx: CanvasRenderingContext2D, v: View, c: Coin, t: number) {
    const x = v.sx(c.x), y = v.sy(c.y);
    const turn = Math.cos(t * 2.6 + c.x * 0.7), sx = Math.max(0.12, Math.abs(turn));
    // The rim shows on the side the coin turns away from.
    const off = Math.sign(Math.sin(t * 2.6 + c.x * 0.7) * turn || 1) * (1 - sx) * 0.07 * v.ppm;
    put(ctx, this.coinEdge, x + off, y, 0, v.ppm, sx);
    put(ctx, this.coinFace, x - off * 0.3, y, 0, v.ppm, sx);
  }

  private drawCan(g: CanvasRenderingContext2D) {
    const { k, F } = this;
    const w = 0.62, h = 0.8;
    const body = new Shape().m(-w / 2, -h / 2 + 0.06).q(-w / 2, -h / 2, -w / 2 + 0.06, -h / 2).l(w / 2 - 0.06, -h / 2).q(w / 2, -h / 2, w / 2, -h / 2 + 0.06)
      .l(w / 2, h / 2 - 0.2).l(w / 2 - 0.2, h / 2).l(-w / 2 + 0.06, h / 2).q(-w / 2, h / 2, -w / 2, h / 2 - 0.06).z();
    const tone = { base: k.can, lit: mix(k.can, "#ffffff", 0.35), shade: k.canDark };
    // The handle and the spout, behind the body's top.
    finish(g, new Shape().rect(-0.27, h / 2 - 0.04, 0.34, 0.16, 0.05), F, tone, { cel: 0.03, rim: 0.02 });
    g.fillStyle = F.id === "cartoon" ? F.ink : k.canDark;
    g.beginPath(); g.roundRect(-0.21, h / 2 + 0.02, 0.22, 0.06, 0.03); g.fill();
    finish(g, new Shape().pts([[0.12, h / 2 - 0.08], [0.2, h / 2 + 0.12], [0.3, h / 2 + 0.06], [0.24, h / 2 - 0.15]]), F, this.tone(k.frame), { cel: 0.03, rim: 0.015 });
    finish(g, body, F, tone, { cel: 0.12, rim: 0.04, gloss: 0.6 });
    // The pressed X down its side, and a drop.
    g.save(); g.clip(body.p);
    g.strokeStyle = rgba(k.canDark, 0.75); g.lineWidth = 0.045;
    g.beginPath(); g.moveTo(-0.2, -0.28); g.lineTo(0.2, 0.18); g.moveTo(0.2, -0.28); g.lineTo(-0.2, 0.18); g.stroke();
    g.strokeStyle = rgba(this.L.light, 0.35); g.lineWidth = 0.02;
    g.beginPath(); g.moveTo(-0.19, -0.255); g.lineTo(0.19, 0.18); g.stroke();
    g.restore();
    g.fillStyle = this.L.light;
    g.beginPath(); g.moveTo(0, 0.02); g.quadraticCurveTo(0.09, -0.1, 0, -0.14); g.quadraticCurveTo(-0.09, -0.1, 0, 0.02); g.fill();
  }

  can(ctx: CanvasRenderingContext2D, v: View, c: Can, t: number) {
    if (c.taken) return;
    const x = v.sx(c.x), y = v.sy(c.y + Math.sin(t * 3 + c.x) * 0.08);
    const glow = ctx.createRadialGradient(x, y, 0.15 * v.ppm, x, y, 1.1 * v.ppm);
    glow.addColorStop(0, rgba(this.k.can, 0.4)); glow.addColorStop(1, rgba(this.k.can, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - 1.1 * v.ppm, y - 1.1 * v.ppm, 2.2 * v.ppm, 2.2 * v.ppm);
    put(ctx, this.canSprite, x, y, 0.08, v.ppm);
  }

  // ---- the ground -------------------------------------------------------------------------------------------------

  private drawStone(g: CanvasRenderingContext2D, i: number) {
    const L = this.L;
    const w = [0.34, 0.24, 0.18][i], h = [0.2, 0.17, 0.12][i];
    const s = new Shape().m(-w, -h * 0.3).q(-w, h, -w * 0.1, h).q(w * 0.9, h * 1.05, w, -h * 0.1).q(w * 0.8, -h, 0, -h).q(-w * 0.9, -h, -w, -h * 0.3).z();
    const base = mix(L.soil[0], L.stone[1], 0.5);
    finish(g, s, this.F, { base, lit: mix(base, L.light, 0.3), shade: mix(L.soil[1], L.shadow, 0.2) }, { cel: h * 0.5, rim: 0.03 });
  }

  /** Small things on the ground, drawn on a sprite with the ground at y = 0: tufts, rocks, flowers, a bush; in the desert dry grass and a cactus. */
  private drawGrowth(g: CanvasRenderingContext2D, kind: string) {
    const { F, L } = this;
    const top = this.tone(L.top[1], 0.35, 0.35);
    const blades = (n: number, hgt: number, spread: number, tone: { base: string; lit: string; shade: string }) => {
      const s = new Shape();
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1)) * 2 - 1, x0 = u * spread * 0.45, tip = u * spread, hh = hgt * (1 - Math.abs(u) * 0.35) * (0.85 + 0.3 * hash(i * 3.1 + n));
        s.m(x0 - 0.035, -0.04).q(x0 + tip * 0.3, hh * 0.6, x0 + tip, hh).q(x0 + tip * 0.2, hh * 0.5, x0 + 0.035, -0.04).z();
      }
      finish(g, s, F, tone, { cel: 0.03, rim: 0.015, soft: 0.02, lw: 0.45 });
    };
    const rock = (w: number, h: number, base: string) => {
      const s = new Shape().m(-w, -0.05).q(-w * 1.05, h * 0.7, -w * 0.35, h).q(w * 0.4, h * 1.15, w * 0.85, h * 0.45).q(w * 1.05, 0.05, w, -0.05).z();
      finish(g, s, F, this.tone(base, 0.35, 0.4), { cel: h * 0.4, rim: 0.035 });
      if (F.id !== "flat") { g.strokeStyle = rgba(L.shadow, 0.35); g.lineWidth = 0.02; g.beginPath(); g.moveTo(-w * 0.1, h * 0.8); g.lineTo(w * 0.1, h * 0.45); g.lineTo(w * 0.05, h * 0.2); g.stroke(); }
    };
    if (kind === "tuft") blades(7, 0.42, 0.34, top);
    else if (kind === "tuft2") { blades(5, 0.3, 0.26, this.tone(L.top[2], 0.3, 0.3)); g.translate(0.2, 0); blades(5, 0.36, 0.24, top); }
    else if (kind === "rock") { rock(0.42, 0.34, L.stone[1]); g.translate(0.46, 0); rock(0.18, 0.15, L.stone[0]); }
    else if (kind === "rock2") rock(0.3, 0.42, mix(L.stone[1], L.stone[0], 0.4));
    else if (kind === "flowers") {
      blades(5, 0.3, 0.3, top);
      for (const [x, y, c] of [[-0.12, 0.42, "#f6f1e4"], [0.06, 0.52, "#f4c64a"], [0.2, 0.38, "#f6f1e4"]] as [number, number, string][]) {
        g.strokeStyle = L.top[2]; g.lineWidth = 0.025; g.beginPath(); g.moveTo(x * 0.5, 0); g.lineTo(x, y); g.stroke();
        const flower = new Shape();
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; flower.circle(x + Math.cos(a) * 0.045, y + Math.sin(a) * 0.045, 0.04); }
        finish(g, flower, F, this.tone(mix(c, L.top[0], 0.15), 0.3, 0.25), { cel: 0.02, rim: 0.01, soft: 0.01, lw: 0.5 });
        g.fillStyle = mix("#e09a2a", L.shadow, 0.1); g.beginPath(); g.arc(x, y, 0.025, 0, Math.PI * 2); g.fill();
      }
    } else if (kind === "bush") {
      const s = new Shape().circle(-0.24, 0.2, 0.22).circle(0.04, 0.32, 0.28).circle(0.3, 0.18, 0.2);
      s.rect(-0.45, -0.05, 0.92, 0.25, 0.05);
      finish(g, s, F, this.tone(mix(L.top[2], L.top[1], 0.3), 0.3, 0.35), { cel: 0.12, rim: 0.04 });
    } else if (kind === "drytuft") blades(8, 0.36, 0.42, this.tone(mix(L.top[0], "#d9c48c", 0.5), 0.3, 0.35));
    else if (kind === "cactus") {
      const green = mix("#6f8a52", L.top[2], 0.25);
      const s = new Shape().tube(0, -0.05, 0, 0.82, 0.2).tube(-0.26, 0.3, -0.26, 0.58, 0.13).tube(-0.26, 0.3, -0.05, 0.3, 0.13).tube(0.24, 0.42, 0.24, 0.66, 0.12).tube(0.24, 0.42, 0.05, 0.42, 0.12);
      finish(g, s, F, this.tone(green, 0.3, 0.38), { cel: 0.06, rim: 0.025 });
      g.strokeStyle = rgba(L.shadow, 0.3); g.lineWidth = 0.015;
      g.beginPath(); g.moveTo(0.03, 0.05); g.lineTo(0.03, 0.82); g.stroke();
    }
  }

  /** The pines or buttes standing just behind the road, a step darker than the nearest layer. */
  private drawBack(g: CanvasRenderingContext2D, i: number) {
    const { F, L, k } = this;
    const base = mix(k.props, L.soil[2], 0.12);
    if (i < 3) {
      const H = [3.4, 2.8, 3.9][i], W = [1.0, 0.85, 1.1][i];
      const s = new Shape();
      for (let t = 0; t < 4; t++) {
        const y0 = H * (0.12 + t * 0.19), y1 = y0 + H * (0.42 - t * 0.04), w = W * (1 - t * 0.2);
        s.m(-w, y0).l(-w * 0.12, y1 - (y1 - y0) * 0.1).q(0, y1 + 0.05, w * 0.12, y1 - (y1 - y0) * 0.1).l(w, y0).q(w * 0.5, y0 + 0.12, 0, y0 + 0.04).q(-w * 0.5, y0 + 0.12, -w, y0).z();
      }
      s.rect(-0.1, -0.4, 0.2, H * 0.3);
      finish(g, s, F, { base, lit: mix(base, L.light, 0.16), shade: mix(base, L.shadow, 0.35) }, { cel: 0.3, rim: 0.06, soft: 0.25, outline: false });
    } else {
      // A pile of weathered boulders, the near cousins of the buttes behind.
      const piles = [[[-0.9, 0.5, 0.75], [0.1, 0.75, 0.95], [0.95, 0.4, 0.6]], [[-0.4, 0.55, 0.8], [0.5, 0.35, 0.55]], [[-1.0, 0.35, 0.55], [-0.2, 0.9, 1.0], [0.8, 0.6, 0.75], [1.4, 0.25, 0.4]]][i - 3];
      const s = new Shape();
      for (const [x, y, r] of piles) s.m(x - r, -0.4).q(x - r * 1.05, y + r * 0.55, x - r * 0.2, y + r * 0.7).q(x + r * 0.75, y + r * 0.72, x + r, y).q(x + r * 1.05, -0.1, x + r * 0.9, -0.4).z();
      finish(g, s, F, { base, lit: mix(base, L.light, 0.16), shade: mix(base, L.shadow, 0.35) }, { cel: 0.35, rim: 0.07, soft: 0.25, outline: false });
    }
  }

  backProps(ctx: CanvasRenderingContext2D, v: View, camX: number, seed: number) {
    const span = v.w / 2 / v.ppm + 6, cell = 7;
    for (let c = Math.floor((camX - span) / cell); c * cell < camX + span; c++) {
      const h = hash(c * 1.7 + 0.3);
      if (h < 0.45) continue;
      const x = c * cell + h * cell * 0.6;
      const size = 0.8 + ((h * 7.13) % 1) * 0.5;
      put(ctx, this.back[Math.floor(hash(c + 9.1) * 3)], v.sx(x), v.sy(ground(seed, x) - 0.3), 0, v.ppm * size);
    }
  }

  /**
   * The ground: bands offset down from the surface (along its normal near
   * the top, straight down for the deep strata), the stones set in it, and
   * what grows on top.
   */
  ground(ctx: CanvasRenderingContext2D, v: View, camX: number, seed: number) {
    const { L, F } = this;
    const span = v.w / 2 / v.ppm + 2;
    const x0 = Math.floor((camX - span) / STEP) * STEP, x1 = camX + span;
    const pts = profile(seed, x0, x1);
    const n = pts.length;
    // Normals, averaged over the two segments at each point.
    const nx = new Float64Array(n), ny = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      nx[i] = dy / len; ny[i] = -dx / len;
    }
    const bottom = v.h + 40;
    const along = (d: number, normal: boolean) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = normal ? pts[i].x + nx[i] * d : pts[i].x, y = normal ? pts[i].y + ny[i] * d : pts[i].y - d;
        i ? ctx.lineTo(v.sx(x), v.sy(y)) : ctx.moveTo(v.sx(x), v.sy(y));
      }
    };
    const below = (d: number, color: string, normal = true) => {
      along(d, normal);
      ctx.lineTo(v.sx(pts[n - 1].x), bottom); ctx.lineTo(v.sx(pts[0].x), bottom); ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
    };
    /** A band whose lower edge hangs in lobes (the cartoon turf), `d` deep with lobes `lobe` deeper, every `every` metres. */
    const lobes = (d: number, lobe: number, every: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(v.sx(pts[0].x), v.sy(pts[0].y));
      for (let i = 1; i < n; i++) ctx.lineTo(v.sx(pts[i].x), v.sy(pts[i].y));
      for (let i = n - 1; i > 0; i--) {
        const a = pts[i], b = pts[i - 1];
        for (let s = 0; s < 5; s++) {
          const t = s / 5, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
          const nnx = nx[i] + (nx[i - 1] - nx[i]) * t, nny = ny[i] + (ny[i - 1] - ny[i]) * t;
          const u = (((x / every) % 1) + 1) % 1, dd = d + lobe * Math.sqrt(Math.max(0, Math.sin(u * Math.PI)));
          ctx.lineTo(v.sx(x + nnx * dd), v.sy(y + nny * dd));
        }
      }
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
    };
    // The earth, in strata that follow the hill.
    if (F.id === "flat") {
      // Two tones and a lit rim: the ground as one more layer of the landscape, the nearest.
      below(0, mix(L.top[0], L.light, 0.35));
      below(0.05, L.top[1]);
      below(0.2, mix(L.soil[1], L.soil[2], 0.4));
      below(2.4, mix(L.soil[2], L.soil[3], 0.5), false);
    } else if (F.id === "soft") {
      // Light falling off into the earth: many close steps that read as one gradient, a dark seam under the turf.
      below(0, mix(L.top[0], L.light, 0.3));
      below(0.04, L.top[0]);
      below(0.09, mix(L.top[0], L.top[1], 0.6));
      below(0.16, L.top[1]);
      below(0.23, mix(L.top[1], L.top[2], 0.7));
      below(0.3, mix(L.soil[2], L.shadow, 0.45));
      below(0.36, mix(L.soil[1], L.shadow, 0.3));
      below(0.44, mix(L.soil[0], L.shadow, 0.14));
      for (let i = 0; i < 9; i++) below(0.56 + i * i * 0.1, mix(L.soil[0], L.soil[3], (i + 0.5) / 9), i > 1 ? false : true);
    } else {
      below(0, L.soil[0]);
      below(1.2, L.soil[1], false);
      below(1.5, mix(L.soil[1], L.soil[2], 0.55), false);
      below(2.9, L.soil[1], false);
      below(4.0, L.soil[2], false);
      below(4.4, mix(L.soil[2], L.soil[3], 0.6), false);
      below(6.0, L.soil[3], false);
    }
    // Stones set in the earth, scrolling with it.
    const cell = 1.6;
    for (let c = Math.floor(x0 / cell); c * cell < x1; c++) {
      const h = hash(c * 3.7 + 1.1);
      if (h < (F.id === "flat" ? 1 : 0.4)) continue;
      const x = c * cell + hash(c + 0.5) * cell, d = 0.75 + hash(c * 1.3 + 2) * 4.5;
      const s = this.stones[Math.floor(hash(c + 7.7) * 3)];
      put(ctx, s, v.sx(x), v.sy(ground(seed, x) - d), (hash(c + 3) - 0.5) * 0.8, v.ppm * (0.8 + 0.6 * hash(c + 5)));
    }
    // The top band.
    if (F.id === "cartoon") {
      lobes(0.3, 0.1, 0.6, mix(L.top[2], L.shadow, 0.35));
      lobes(0.24, 0.1, 0.6, L.top[1]);
      along(0.06, true);
      ctx.strokeStyle = L.top[0]; ctx.lineWidth = 0.07 * v.ppm; ctx.lineJoin = "round"; ctx.stroke();
      along(-0.01, true);
      ctx.strokeStyle = F.ink; ctx.lineWidth = 0.05 * v.ppm; ctx.stroke();
    } else if (F.id === "soft") {
      // A fringe of blades along the top, the grass catching the light.
      ctx.beginPath();
      for (let i = 0; i + 1 < n; i++) {
        const a = pts[i], b = pts[i + 1];
        for (let t = 0; t < 1; t += 1 / 6) {
          const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, r = hash(x * 9.1), hh = 0.04 + 0.13 * r * r, lean = (hash(x * 3.7) - 0.3) * 0.08;
          ctx.moveTo(v.sx(x - 0.035), v.sy(y - 0.02)); ctx.quadraticCurveTo(v.sx(x), v.sy(y + hh * 0.6), v.sx(x + lean), v.sy(y + hh)); ctx.lineTo(v.sx(x + 0.035), v.sy(y - 0.02));
        }
      }
      ctx.fillStyle = mix(L.top[0], L.light, 0.15); ctx.fill();
    }
    // What grows on top: one thing or none every 1.3 m, the same things in the same places every run.
    const g2 = 1.3;
    for (let c = Math.floor(x0 / g2); c * g2 < x1; c++) {
      const h = hash(c * 5.3 + 0.7);
      if (h < 0.5) continue;
      const x = c * g2 + hash(c + 0.2) * g2 * 0.7;
      const i = Math.floor(hash(c * 2.1 + 4) * this.growth.length);
      const gy = ground(seed, x), slope = Math.atan((ground(seed, x + 0.3) - ground(seed, x - 0.3)) / 0.6);
      put(ctx, this.growth[i], v.sx(x), v.sy(gy - 0.03), slope * 0.5, v.ppm * (0.75 + 0.45 * hash(c + 11)));
    }
  }
}

/** A five-pointed star, filled, at (x, y) in the current units. */
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}
