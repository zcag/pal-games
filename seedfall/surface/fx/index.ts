// VFX and juice (art.md 8, core-loop Juice, DESIGN R11/R13): particles per event, ambient particles,
// camera trauma and hitstop, dynamic lights from effects, PostFx, world-space floating labels.
//
// Frame order (main.ts): game.step (skipped while fx.hitstop > 0) -> fx.events(evs, game) -> camera ->
// fx.update(dt, game, cam) -> renderer.frame(game, cam, fx) -> ui (labels).
import { W, type GameEvent, type GameView, type PodView } from "../../game/types.ts";
import { PF, Particles, type Camera, type Light, type PostFx } from "../view.ts";
import { Ambient, type Rect } from "./ambient.ts";
import { CACHE_ACCENT, LAVA_ID, LODESTONE_ID, SOLID, findFx, hex, lin, matFx, mix, type MatFx, type RGB } from "./content.ts";
import type { RenderExtras, Tell } from "../render/index.ts";
import { Shake } from "./shake.ts";
import { B, PX, simulate, spawn, stamp, type SimCtx } from "./sim.ts";

export { Particles };

/** World-space floating text; the UI positions it with worldToScreen and draws it as HTML. */
export interface FloatLabel {
  id: number;
  text: string;
  /** Tiles. */
  x: number;
  y: number;
  /** CSS colour. */
  color: string;
  alpha: number;
  /** Seconds alive / lifetime. */
  age: number;
  life: number;
  tone: "ore" | "warn" | "bad" | "quiet";
  /** Merge key ("ore:12"): a new label with the same key within 1 s adds to this one. */
  key?: string;
  count?: number;
}

/** A flying ore piece: the renderer may draw the find's 5x5 class icon here (fx also stamps a 5x5 stand-in). */
export interface FxIcon { x: number; y: number; find: number; a: number; grey: number; ring: number }

/** Pod sprite flashes the renderer applies (art 5.3 hit, 8.1 cargo flash, 8.3 upgrade). */
export interface PodFx { white: number; red: number; cargo: number; hop: number; lava: number; squash: number }

const R = Math.random;
const hexLinC = (h: string) => lin(hex(h));
const rr = (a: number, b: number) => a + (b - a) * R();
const ri = (a: number, b: number) => Math.floor(rr(a, b + 1));
/** Event coordinates: integer = a tile index (use its centre), fractional = a world position. */
const cx = (v: number) => (Number.isInteger(v) ? v + 0.5 : v);
const smooth = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

const C = {
  white: hex("#ffffff"), spark: hex("#ffe0a0"), blue: hex("#e8f4ff"), arc: hex("#8ac8ff"), red: hex("#ff4a3a"),
  smoke: hex("#5a5a60"), dark: hex("#0b0d12"), gas: hex("#c8e04a"), gasHot: hex("#e8ffb0"), spore: hex("#b8f0a0"),
  violet: hex("#e0c8ff"), tele: hex("#c9a0ff"), grey: hex("#6a6a70"), lostA: hex("#b0a890"), gold: hex("#ffe890"),
  pulse: hex("#ffd8a0"), scan: hex("#7fe8ff"), steam: hex("#d8d8d0"), ember: hex("#b04a1c"), blastSmoke: hex("#7a746e"),
  storm: hex("#9a6aff"), stormHi: hex("#c8b8ff"), steel: hex("#8a94a8"), steelHi: hex("#e0e8ff"),
  boom: hex("#fff4d6"), seed: hex("#fff2c0"), rail: hex("#ffd870"),
};
const L_STORM = hexLinC("#7a5aff");
/** Upgrade accents per stat (art 5.2 / 8.3). */
const ACCENT: Record<string, RGB> = {
  drill: hex("#b8c0cc"), engine: hex("#ffa040"), tank: hex("#5ad88a"), hull: hex("#ffd870"), cargo: hex("#ffd870"),
  radiator: hex("#8ac8ff"), lamp: hex("#fff6e8"), scanner: hex("#7fe8ff"),
};
/** Engine flame by tier (art 5.2): inner, mid, tip. */
const FLAME: RGB[][] = [
  ["#ffd27a", "#ff6a2a", "#c03a1a"], ["#fff0c0", "#ffa040", "#ff6a2a"], ["#ffffff", "#fff4d0", "#ffa040"],
  ["#ffffff", "#8ac8ff", "#4a7aff"], ["#ffffff", "#c08aff", "#7a4aff"],
].map((t) => t.map(hex));

type Curve = "exp" | "fade" | "pulse" | "hold";
interface TLight { x: number; y: number; r: number; c: RGB; i: number; age: number; dur: number; curve: Curve; force: boolean; pod: boolean }
interface Ring { x: number; y: number; r0: number; r1: number; age: number; dur: number; c: RGB; hdr: number; a: number; step: number; ease: boolean }
interface Piece { x: number; y: number; vx: number; vy: number; ox: number; oy: number; fx: number; fy: number; age: number; delay: number; pop: number; find: number; c: RGB; glint: RGB; lost: boolean; px: number; py: number }
interface Fuse { x: number; y: number; age: number; dur: number; lx: number; ly: number }
interface Arc { x1: number; y1: number; x2: number; y2: number; age: number; dur: number; fire: boolean; pts: number[]; roll: number }
interface Outline { x: number; y: number; age: number; dur: number; c: RGB }
interface Emitter { x: number; y: number; age: number; dur: number; every: number; acc: number; fn: (x: number, y: number, k: number) => void }

export class Fx {
  particles = new Particles(4096);
  lights: Light[] = [];
  post: PostFx = { flash: 0, flashColor: [1, 1, 1], aberration: 0, haze: 0, dim: 0, vignettePulse: 0, wash: 0 };
  /** Camera offset in tiles this frame. */
  shake = { x: 0, y: 0 };
  /** Seconds the integration should freeze game steps (art 8.2: 50 ms). */
  hitstop = 0;
  /** Game time scale the integration applies (the wreck's 1.2 s slow-mo at 0.3x). */
  timeScale = 1;
  labels: FloatLabel[] = [];
  icons: FxIcon[] = [];
  pod: PodFx = { white: 0, red: 0, cargo: 0, hop: 0, lava: 0, squash: 0 };

  private t = 0;
  private trauma = new Shake();
  private amb = new Ambient();
  private tl: TLight[] = [];
  private rings: Ring[] = [];
  private pieces: Piece[] = [];
  private fuses: Fuse[] = [];
  private arcs: Arc[] = [];
  private outlines: Outline[] = [];
  private emitters: Emitter[] = [];
  private bands: { y: number; age: number }[] = [];
  private flashPeak = 0; private flashAge = 0; private flashDur = 0.1;
  private aberrT = 0; private hitPulse = 0; private hazeT = 0; private slowmo = 0;
  private washPeak = 0; private washAge = 0; private washIn = 0; private washOut = 0.4;
  private digAcc = 0; private thrustT = 0; private smokeT = 0; private sparkT = 0; private lavaT = 0;
  private lift = false; private liftAcc = 0;
  private tele: { age: number; lost: boolean; arrive: number } | null = null;
  private tooHardAt = new Map<number, number>();
  private labelId = 0;
  private sim: SimCtx = { mat: new Uint8Array(0), solid: SOLID, podX: 0, podY: 0, t: 0 };
  private rect: Rect = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private lightPool: Light[] = [];

  private scanS: { x: number; y: number; r: number; age: number } | null = null;
  private pulseAge = -1;
  private sporeCh: { x: number; y: number; age: number }[] = [];
  private ex: RenderExtras & { tells: Tell[] } = { tells: [], pod: {} };

  /**
   * What the renderer draws from fx-tracked state (RenderExtras): the scan wave, hazard tells (fuse, spore charge,
   * arcs), the pulse clock and the pod's flashes. The integration merges its own fields (riding, drop, door, pad).
   */
  renderExtras(): RenderExtras {
    const ex = this.ex, t = ex.tells;
    t.length = 0;
    for (const f of this.fuses) if (f.age <= f.dur) t.push({ kind: "fuse", x: f.x, y: f.y, k: Math.min(1, f.age / f.dur) });
    for (const c of this.sporeCh) t.push({ kind: "spore", x: c.x, y: c.y, k: Math.min(1, c.age / 0.5) });
    for (const a of this.arcs) {
      const kind = a.fire ? "arc" : "arc_charge", k = a.fire ? 1 : Math.min(1, a.age / a.dur);
      t.push({ kind, x: a.x1, y: a.y1, k, x2: a.x2, y2: a.y2 }, { kind, x: a.x2, y: a.y2, k, x2: a.x1, y2: a.y1 });
    }
    ex.scan = this.scanS;
    ex.pulse = this.pulseAge;
    const q = this.pod;
    // hurt 1 = the hit's 50% red mix for 120 ms; continuous lava/heat is capped at 0.4 (a 20% mix, review-1 #3)
    ex.pod = { flash: q.white > 0 ? 1 : 0, hurt: Math.max(q.red > 0 ? 1 : 0, Math.min(0.4, q.lava * 0.4)), squash: q.squash };
    return ex;
  }

  /** Reduce-shake setting (art.md 11.5), 0..1. */
  set shakeScale(v: number) { this.trauma.scale = v; }

  // ------------------------------------------------------------------ events

  events(evs: GameEvent[], view: GameView): void {
    const pod = view.pod;
    for (const e of evs) {
      switch (e.t) {
        case "dig_start": this.digAcc = 0.1; break;
        case "break": this.onBreak(e.x, e.y, e.mat, e.find, e.by, view); break;
        case "too_hard": this.onTooHard(e.x, e.y, e.need, false, view); break;
        case "unbreakable": this.onTooHard(e.x, e.y, 0, true, view); break;
        case "pickup": this.onPickup(e.find, e.count, cx(e.x), cx(e.y)); break;
        case "nugget": this.onNugget(e.find, cx(e.x), cx(e.y)); break;
        case "cargo_full": this.label(pod.x, pod.y - 0.9, "Cargo full", "#ffb35c", "warn", 1); this.pod.cargo = 0.25; break;
        case "land": this.onLand(e.speed, pod, view); break;
        case "bump": this.onBump(e.speed, e.damage, e.axis, pod); break;
        case "damage": this.onDamage(e.frac, e.source, pod); break;
        case "wreck": this.onWreck(cx(e.x), cx(e.y), view); break;
        case "rescue": if (e.kind === "tow") this.sparks(pod.x, pod.y - 0.45, 2, C.spark, 3, -Math.PI / 2, 0.8); break;
        case "gas_fuse": {
          // the light sits on the tile's open face: from inside the rock the renderer's occlusion would swallow it
          const x = cx(e.x), y = cx(e.y), d = this.openDir(Math.floor(x), Math.floor(y), view);
          this.fuses.push({ x, y, age: 0, dur: 0.8 * Math.pow(Math.max(1, pod.load), 0.25), lx: x + Math.cos(d) * 0.6, ly: y + Math.sin(d) * 0.6 });
          break;
        }
        case "explode": this.onExplode(cx(e.x), cx(e.y), e.r, e.kind, view); break;
        case "wobble": this.onWobble(cx(e.x), cx(e.y), e.mat); break;
        case "fall_land": this.onFallLand(cx(e.x), cx(e.y), e.mat, pod); break;
        case "lava_touch": this.onLava(pod); break;
        case "spore": this.onSpore(cx(e.x), cx(e.y)); break;
        case "spore_charge": this.onSporeCharge(cx(e.x), cx(e.y)); break;
        case "arc": this.onArc(e); break;
        case "pulse": this.onPulse(); break;
        case "scan": this.scanS = { x: cx(e.x), y: cx(e.y), r: e.r, age: 0 }; this.ring(cx(e.x), cx(e.y), 0.3, e.r, e.r / 25, C.scan, 1.2, 0.7, 3, false); this.ring(cx(e.x), cx(e.y), 0.1, e.r - 0.35, e.r / 25, C.scan, 0.8, 0.3, 4, false); this.light(cx(e.x), cx(e.y), 2.5, C.scan, 1.0, 0.25, "fade"); break;
        case "teleport": this.onTeleport(e.phase, pod); break;
        case "lift": this.onLift(e.phase, pod); break;
        case "cache": this.onCache(cx(e.x), cx(e.y), e.theme); break;
        case "buy": this.onBuy(e.id, !!e.tierUp, pod); break;
        case "launch": this.onLaunch(e.phase); break;
        case "storm": this.onStorm(e.on, pod); break;
        default: break;
      }
    }
  }

  // ------------------------------------------------------------------ update

  update(dt: number, view: GameView, cam: Camera): void {
    this.t += dt;
    const pod = view.pod;
    const hw = cam.w / cam.tilePx / 2 + 1, hh = cam.h / cam.tilePx / 2 + 1;
    this.rect.x0 = cam.x - hw; this.rect.x1 = cam.x + hw; this.rect.y0 = cam.y - hh; this.rect.y1 = cam.y + hh;

    // Hitstop freezes the particles with the game (the burst hangs, then flies); shake and flashes run on.
    const frozen = this.hitstop > 0;
    this.hitstop = Math.max(0, this.hitstop - dt);
    if (this.slowmo > 0) { this.slowmo -= dt; this.timeScale = this.slowmo > 0 ? 0.3 : 1; }
    const sdt = frozen ? 0 : dt * (this.slowmo > 0 ? 0.3 : 1);

    const s = this.sim;
    s.mat = view.world.mat; s.podX = pod.x; s.podY = pod.y; s.t = this.t;
    const ambLive = simulate(this.particles, sdt, s);

    if (sdt > 0) {
      this.amb.update(this.particles, sdt, view, this.rect, ambLive);
      this.dig(sdt, view);
      this.thrust(sdt, view);
      this.hullFx(sdt, pod);
      this.entities(sdt, view);
      this.channel(sdt, pod);
      if (this.stormOn || this.stormBurst > 0) this.storm(sdt, view);
      if (this.lift && Math.abs(pod.vy) > 8) { this.liftAcc += sdt; if (this.liftAcc > 0.12) { this.liftAcc = 0; this.railSparks(pod, 1); } }
      for (let i = this.emitters.length - 1; i >= 0; i--) {
        const m = this.emitters[i];
        m.age += sdt; m.acc += sdt;
        while (m.acc >= m.every) { m.acc -= m.every; m.fn(m.x, m.y, m.age / m.dur); }
        if (m.age >= m.dur) this.emitters.splice(i, 1);
      }
    }
    this.updatePieces(sdt, pod);
    this.stampRings(sdt);
    this.stampFuses(sdt, view);
    this.stampArcs(sdt);
    this.stampOutlines(sdt);
    this.stampBands(sdt);

    if (this.scanS) { this.scanS.age += dt; if (this.scanS.age > this.scanS.r / 25 + 1.5) this.scanS = null; }
    if (this.pulseAge >= 0) this.pulseAge += dt;
    for (let i = this.sporeCh.length - 1; i >= 0; i--) if ((this.sporeCh[i].age += dt) > 0.6) this.sporeCh.splice(i, 1);
    this.trauma.update(dt, this.t);
    this.shake.x = this.trauma.x; this.shake.y = this.trauma.y;
    this.postFx(dt, view);
    this.podFx(dt);
    this.buildLights(dt, view);
    this.updateLabels(dt);
  }

  // ------------------------------------------------------------------ emit helpers

  /** Chips: 1-2 px in a material's shades, gravity 300 px/s^2, bounce 0.3 (art 8.1). */
  private chips(x: number, y: number, m: MatFx, n: number, dir: number, spread: number, v0: number, v1: number, size = 1) {
    for (let i = 0; i < n; i++) {
      const a = dir + rr(-spread, spread), v = rr(v0, v1);
      const u = R(), c = m.pal[u < 0.1 ? 0 : u < 0.4 ? 1 : u < 0.7 ? 2 : 3];
      spawn(this.particles, x + rr(-0.12, 0.12), y + rr(-0.12, 0.12), c, {
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rr(0.6, 1.2), size: R() < 0.35 ? size + 1 : size, hdr: 0.12,
        flags: PF.COLLIDE | PF.FADE, grav: 300 * PX, drag: 0.4,
      });
    }
  }
  /** Dust: 2-3 px, mix(light, fog, .5), alpha 0.35, grows 1 px, life 0.8 s (art 8.1). */
  private dust(x: number, y: number, c: RGB, n: number, v: number, dir = -Math.PI / 2, spread = Math.PI, a = 0.35, life = 0.8) {
    for (let i = 0; i < n; i++) {
      const ang = dir + rr(-spread, spread), sp = rr(0.2, 1) * v;
      spawn(this.particles, x + rr(-0.2, 0.2), y + rr(-0.15, 0.15), c, {
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: rr(life * 0.75, life * 1.25), size: ri(2, 3), a, hdr: 0.1,
        flags: PF.FADE, drag: 3, grav: -0.3, aux: B.GROW + 0.16,
      });
    }
  }
  /** Sparks: 1 px, 60-120 px/s, gravity 200, life 0.25 s; hot ones cool toward red (art 8.1). */
  private sparks(x: number, y: number, n: number, c: RGB, hdr: number, dir = -Math.PI / 2, spread = Math.PI, hot = true, speed = 1, life = 0.25) {
    for (let i = 0; i < n; i++) {
      const a = dir + rr(-spread, spread), v = rr(60, 120) * PX * speed;
      spawn(this.particles, x, y, c, {
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rr(life * 0.7, life * 1.4), hdr, flags: PF.ADD | PF.COLLIDE | (hot ? 0 : PF.FADE),
        grav: 200 * PX, aux: hot ? B.HOT : 0,
      });
    }
  }
  private smoke(x: number, y: number, n: number, c: RGB, a: number, life: number, size: [number, number], v = 0.6) {
    for (let i = 0; i < n; i++) {
      const ang = rr(0, Math.PI * 2), sp = rr(0.2, 1) * v;
      spawn(this.particles, x + rr(-0.3, 0.3), y + rr(-0.3, 0.3), c, {
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.3, life: rr(life * 0.7, life * 1.2), size: ri(size[0], size[1]), a, hdr: 0.06,
        flags: PF.FADE, drag: 1.8, grav: -0.5, aux: B.GROW + 0.2,
      });
    }
  }
  private light(x: number, y: number, r: number, c: RGB, i: number, dur: number, curve: Curve, force = false, pod = false) {
    this.tl.push({ x, y, r, c: lin(c), i, age: 0, dur, curve, force, pod });
  }
  private ring(x: number, y: number, r0: number, r1: number, dur: number, c: RGB, hdr: number, a: number, step: number, ease = true) {
    this.rings.push({ x, y, r0, r1, age: 0, dur, c, hdr, a, step, ease });
  }
  private flash(peak: number, c: RGB, dur = 0.1) {
    const cur = this.flashPeak * Math.max(0, 1 - this.flashAge / this.flashDur);
    if (peak < cur) return;
    this.flashPeak = peak; this.flashAge = 0; this.flashDur = dur;
    this.post.flashColor = [c[0], c[1], c[2]];
  }
  private hit(s: number) { this.hitstop = Math.max(this.hitstop, s); }
  private label(x: number, y: number, text: string, color: string, tone: FloatLabel["tone"], life: number, key?: string, count?: number) {
    if (key) {
      const l = this.labels.find((q) => q.key === key && q.age < 1);
      if (l) { l.count = (l.count ?? 0) + (count ?? 0); l.text = text.replace(/^\+\d+/, `+${l.count}`); l.age = 0; l.x = x; l.y = y; return; }
    }
    this.labels.push({ id: ++this.labelId, text, x, y, color, alpha: 1, age: 0, life, tone, key, count });
    if (this.labels.length > 12) this.labels.shift();
  }

  // ------------------------------------------------------------------ drilling

  /** The contact face of a tile seen from the pod: point and outward normal angle. */
  private face(tx: number, ty: number, pod: PodView, progress = 0) {
    const dx = tx + 0.5 - pod.x, dy = ty + 0.5 - pod.y;
    const into = smooth(0.15, 1, progress);
    if (Math.abs(dy) > Math.abs(dx) && dy > 0) return { x: tx + 0.5, y: ty + into - 0.02, n: -Math.PI / 2, along: 0 };
    if (Math.abs(dy) > Math.abs(dx)) return { x: tx + 0.5, y: ty + 1 - into + 0.02, n: Math.PI / 2, along: 0 };
    if (dx > 0) return { x: tx + into - 0.02, y: ty + 0.5, n: Math.PI, along: 1 };
    return { x: tx + 1 - into + 0.02, y: ty + 0.5, n: 0, along: 1 };
  }

  /** Every dig tick (0.1 s): 1-2 chips from the contact edge, 20-50 px/s, plus the material's extra. */
  private dig(dt: number, view: GameView) {
    const d = view.pod.dig;
    if (!d) { this.digAcc = 0; return; }
    this.digAcc += dt;
    if (this.digAcc < 0.1) return;
    this.digAcc -= 0.1;
    const m = matFx(d.mat), f = this.face(d.x, d.y, view.pod, d.progress);
    // away from the face: a down dig sprays out of both sides of the drill cone (under the pod's treads), a side dig
    // back over the treads
    const down = f.n === -Math.PI / 2, side = R() < 0.5 ? -1 : 1;
    const off = rr(-0.35, 0.35);
    const x = down ? view.pod.x + side * rr(4, 6) * PX : f.x, y = down ? d.y - PX : f.y + off;
    const dir = down ? -Math.PI / 2 + side * rr(0.6, 1.1) : f.n === Math.PI / 2 ? Math.PI / 2 : f.n + (f.n === 0 ? -0.5 : 0.5);
    this.chips(x, y, m, ri(1, 2), dir, down ? 0.15 : 0.9, down ? 50 * PX : 20 * PX, down ? 75 * PX : 50 * PX, m.chip);
    if (R() < 0.35) this.dust(x, y, m.dust, 1, 0.6, dir, 0.8, 0.3, 0.7);
    this.extra(x, y, m, dir, 1, view.world.find[d.y * W + d.x]);
  }

  private extra(x: number, y: number, m: MatFx, dir: number, k: number, find: number) {
    switch (m.extra) {
      case "sparks": if (R() < 0.6 * k + 0.2) this.sparks(x, y, ri(1, 2) * k, C.white, 2.0, dir, 0.8); break;
      case "violet": this.sparks(x, y, ri(1, 2) * k, C.violet, 1.8, dir, 0.9, false, 0.8, 0.3); break;
      case "shards":
        for (let i = 0; i < ri(1, 2) * k; i++) spawn(this.particles, x, y, mix(m.pal[3], C.white, 0.3), {
          vx: Math.cos(dir) * rr(1, 3) + rr(-1, 1), vy: Math.sin(dir) * rr(1, 3) - 0.5, life: rr(0.4, 0.8), hdr: 0.6, flags: PF.ADD | PF.COLLIDE | PF.FADE, grav: 250 * PX,
        });
        break;
      case "embers": if (R() < 0.5) this.sparks(x, y, k, C.ember, 0.9, dir, 0.9, true, 0.5, 0.6); break;
      case "squares": this.chips(x, y, m, k, dir, 0.7, 1, 2.5, 2); break;
      case "spores":
        spawn(this.particles, x, y, m.pal[3], { vx: rr(-0.4, 0.4), vy: -rr(0.2, 0.5), life: rr(0.8, 1.4), hdr: 0.3, a: 0.6, flags: PF.FADE, drag: 1, aux: B.DRIFT + R() * 0.99 });
        break;
      case "clumps": break; // the 2 px chips are the clumps
      default: break;
    }
    if (find) {
      const ff = findFx(find);
      if (ff && R() < 0.7) spawn(this.particles, x, y, R() < 0.5 ? ff.light : ff.glint, {
        vx: Math.cos(dir) * rr(1.2, 3), vy: Math.sin(dir) * rr(1.2, 3) - 0.4, life: rr(0.4, 0.9), hdr: 0.7, flags: PF.ADD | PF.COLLIDE | PF.FADE, grav: 250 * PX,
      });
    }
  }

  private onBreak(tx: number, ty: number, mat: number, find: number, by: string, view: GameView) {
    const m = matFx(mat), x = tx + 0.5, y = ty + 0.5;
    const blast = by === "blast", drone = by === "drone";
    if (blast) {
      // flung out from the blast centre, scattered over the tile (never a grid of tile centres)
      const b = this.lastBlast, d = Math.hypot(x - b.x, y - b.y) || 1;
      const dir = d > 0.1 ? Math.atan2(y - b.y, x - b.x) : -Math.PI / 2;
      for (let i = 0; i < ri(3, 5); i++) {
        const a = dir + rr(-0.5, 0.5), v = rr(4, 9) / Math.sqrt(d);
        spawn(this.particles, x + rr(-0.45, 0.45), y + rr(-0.45, 0.45), m.pal[ri(1, 3)], { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: rr(0.6, 1.3), size: ri(1, 3), hdr: 0.12, flags: PF.COLLIDE | PF.FADE, grav: 18, drag: 0.8 });
      }
      if (R() < 0.6) this.dust(x + rr(-0.3, 0.3), y + rr(-0.3, 0.3), m.dust, 1, 2.5, dir, 0.6, 0.35, 1.0);
      return;
    }
    const n = drone ? ri(4, 7) : ri(6, 14);
    const dir = this.openDir(tx, ty, view);
    this.chips(x, y, m, n, dir, Math.PI * 0.6, 2, 5.5, m.chip);
    this.dust(x, y, m.dust, 4, 1.8, dir, 1.2);
    this.extra(x, y, m, dir, 2, find);
    if (!drone) {
      this.trauma.add(find ? 0.1 : m.dense ? 0.12 : 0.08);
      // the pop: a short light in the rock's light shade (the cracks' white frame is the terrain's)
      this.light(x, y, 1.8, m.glow ?? mix(m.pal[3], C.white, 0.5), m.glow || find ? 1.1 : 0.7, 0.12, "fade");
    }
    if (!find) return;
    const ff = findFx(find);
    if (!ff) return;
    // the pieces' 2-frame white flash and a fleck spray in the ore's colours
    for (let i = 0; i < 6; i++) spawn(this.particles, x + rr(-0.3, 0.3), y + rr(-0.3, 0.3), i < 2 ? C.white : ff.glint, {
      vx: rr(-2.5, 2.5), vy: rr(-4, -1.5), life: rr(0.3, 0.6), hdr: 1.2, flags: PF.ADD | PF.FADE | PF.COLLIDE, grav: 250 * PX,
    });
    this.light(x, y, 2, ff.glow ?? ff.light, 1.4, 0.2, "fade");
    if (ff.big) this.hit(0.05);
    if (ff.jackpot) {
      this.light(x, y, 5, ff.glow ?? C.gold, 3.0, 0.6, "pulse", true);
      this.sparks(x, y, 24, C.gold, 2.2, -Math.PI / 2, Math.PI, false, 1.3, 0.6);
      this.ring(x, y, 0.2, 2.2, 0.4, C.gold, 2.0, 0.8, 2);
    }
  }

  /** Direction out of a tile toward its open neighbours (up when it has none, or air all round). */
  private openDir(tx: number, ty: number, view: GameView) {
    const mat = view.world.mat;
    let dx = 0, dy = 0;
    const air = (x: number, y: number) => y < 0 || (x > 0 && x < W - 1 && !SOLID[mat[y * W + x]]);
    if (air(tx - 1, ty)) dx -= 1; if (air(tx + 1, ty)) dx += 1; if (air(tx, ty - 1)) dy -= 1; if (air(tx, ty + 1)) dy += 1;
    return dx === 0 && dy === 0 ? -Math.PI / 2 : Math.atan2(dy - 0.6, dx);
  }

  private onTooHard(tx: number, ty: number, need: number, unb: boolean, view: GameView) {
    const i = ty * W + tx, last = this.tooHardAt.get(i) ?? -99;
    const f = this.face(tx, ty, view.pod);
    const m = matFx(view.world.mat[i]);
    // sparks kick up off the face so they arc over the pod instead of into its hull
    const up = f.along ? -Math.PI / 2 + (f.n === 0 ? 0.55 : -0.55) : f.n;
    const sy = f.along ? f.y - 3 * PX : f.y;
    if (unb) this.sparks(f.x, sy, ri(6, 9), C.blue, 2.4, up, 0.6, false, 1.1, 0.3);
    else { this.sparks(f.x, sy, ri(5, 8), C.spark, 2.0, up, 0.6, true, 1, 0.3); this.outlines.push({ x: tx, y: ty, age: 0, dur: 0.3, c: C.red }); }
    this.dust(f.x, f.y, m.dust, 2, 0.8, f.n, 0.7, 0.3, 0.5);
    this.light(f.x, f.y, 1.4, unb ? C.blue : C.spark, 1.2, 0.08, "fade");
    if (this.t - last < 5) return;
    this.tooHardAt.set(i, this.t);
    const text = unb ? "Can't be drilled." : `${m.name}: too hard. Drill ${need}.`;
    this.label(tx + 0.5, ty - 0.3, text, unb ? "#8a94a8" : "#ff8a7a", unb ? "quiet" : "bad", 1.5);
  }

  // ------------------------------------------------------------------ pieces (ore pop and magnet, art 8.1)

  private onPickup(find: number, count: number, x: number, y: number) {
    const ff = findFx(find);
    if (!ff) return;
    const n = Math.min(count, 8);
    const pop = ff.jackpot ? 0.18 + 0.4 : 0.18;
    for (let k = 0; k < n; k++) {
      const fan = (k - (n - 1) / 2) * 0.35;
      this.pieces.push({ x, y, vx: 0, vy: 0, ox: x, oy: y, fx: fan, fy: ff.jackpot ? -10 * PX - 0.3 : -0.4, age: 0, delay: k * 0.04, pop, find, c: ff.light, glint: ff.glint, lost: false, px: x, py: y });
    }
    const key = `ore:${find}`;
    this.label(x, y - (ff.jackpot ? 1.4 : 0.6), `+${count} ${ff.name}`, `rgb(${ff.light.map((v) => Math.round(v * 255)).join(",")})`, "ore", 0.7, key, count);
  }

  private onNugget(find: number, x: number, y: number) {
    const ff = findFx(find);
    if (!ff) return;
    // the piece hops once onto the floor, a puff and a glint (the nugget entity itself is the renderer's)
    spawn(this.particles, x, y - 0.2, ff.light, { vx: rr(-1, 1), vy: -3.5, life: 0.5, size: 2, hdr: 0.4, flags: PF.COLLIDE | PF.FADE, grav: 22 });
    this.dust(x, y + 0.35, hex("#8a8276"), 2, 0.7, -Math.PI / 2, 1.2, 0.3, 0.5);
    this.sparks(x, y, 3, ff.glint, 1.4, -Math.PI / 2, 1.2, false, 0.5, 0.25);
  }

  private updatePieces(dt: number, pod: PodView) {
    this.icons.length = 0;
    const ps = this.particles;
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.age += dt;
      p.px = p.x; p.py = p.y;
      let grey = 0;
      if (p.lost) {
        p.vy += 6 * dt; p.vx *= 1 - 3 * dt; p.vy *= 1 - 2 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        grey = Math.min(1, p.age / 0.25);
        if (p.age > 0.45) {
          for (let k = 0; k < 6; k++) spawn(ps, p.x + rr(-0.12, 0.12), p.y + rr(-0.12, 0.12), C.grey, { vx: rr(-0.6, 0.6), vy: rr(-0.5, 0.5), life: rr(0.6, 1.1), flags: PF.COLLIDE | PF.FADE, grav: 12 });
          this.pieces.splice(i, 1);
          continue;
        }
      } else if (p.age < p.pop) {
        const k = Math.min(1, p.age / 0.18);
        const e = 1 - (1 - k) * (1 - k);
        p.x = p.ox + p.fx * e; p.y = p.oy + p.fy * e;
        if (p.age > 0.18) p.y += Math.sin((p.age - 0.18) * 9) * 0.03; // the jackpot hangs and breathes
      } else {
        // magnet curve: vel += (pod - p) * k dt, cap 300 px/s. art.md's k = 14 takes ~0.42 s from a tile away;
        // 30 lands in ~0.29 s, nearer core-loop's 0.12 s fly-in while keeping the curve
        p.vx += (pod.x - p.x) * 30 * dt; p.vy += (pod.y - p.y) * 30 * dt;
        const sp = Math.hypot(p.vx, p.vy), cap = 300 * PX;
        if (sp > cap) { p.vx *= cap / sp; p.vy *= cap / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        const d = Math.hypot(pod.x - p.x, pod.y - p.y);
        if (d < 0.35 || p.age > 2) {
          this.pod.cargo = 1 / 60;
          for (let k = 0; k < 3; k++) spawn(ps, pod.x + rr(-0.3, 0.3), pod.y + rr(-0.3, 0.2), p.glint, { vx: rr(-1, 1), vy: rr(-2, -0.5), life: 0.2, hdr: 1.4, flags: PF.ADD | PF.FADE });
          this.light(pod.x, pod.y, 1.5, p.c, 0.8, 0.12, "fade", false, true);
          this.pieces.splice(i, 1);
          continue;
        }
        // 3 px trail in its light colour, HDR 1.2
        const steps = Math.min(4, Math.ceil(Math.hypot(p.x - p.px, p.y - p.py) * 16));
        for (let k = 1; k <= steps; k++) {
          const u = k / (steps + 1);
          spawn(ps, p.px + (p.x - p.px) * u, p.py + (p.y - p.py) * u, p.c, { life: 0.05, hdr: 1.2, a: 0.8, flags: PF.ADD | PF.FADE });
        }
      }
      // the stand-in icon: a 5x5 outline, a 3x3 body and a glint pixel; a white ring during the pop
      const c = grey ? mix(C.lostA, C.grey, grey) : p.c;
      stamp(ps, p.x, p.y, C.dark, 1, 0, false, 5);
      stamp(ps, p.x, p.y, c, 1, grey ? 0 : 0.35, false, 3);
      if (!grey) stamp(ps, p.x - PX, p.y - PX, p.glint, 1, 1.2, true, 1);
      const ring = p.lost ? 0 : Math.max(0, 1 - p.age / 0.25);
      if (ring > 0) this.stampCircle(p.x, p.y, 4 * PX, C.white, ring, 1.2, 1.5, true);
      this.icons.push({ x: p.x, y: p.y, find: p.find, a: 1, grey, ring });
    }
  }

  // ------------------------------------------------------------------ pod: thrust, landing, damage, hull

  private thrust(dt: number, view: GameView) {
    const pod = view.pod;
    if (!pod.thrusting) { this.thrustT = 0; return; }
    this.thrustT += dt;
    const lv = view.levels.engine ?? 0;
    const pal = FLAME[lv >= 20 ? 4 : lv >= 15 ? 3 : lv >= 10 ? 2 : lv >= 5 ? 1 : 0];
    const flip = pod.facing < 0;
    const heavy = pod.load > 4;
    for (const col of [3, 8]) {
      const c = flip ? 15 - col : col;
      const x = pod.x - 0.5 + (c + 0.5) / 16, y = pod.y + 7 / 16 + PX;
      for (let k = 0; k < 2; k++) {
        const u = R();
        spawn(this.particles, x + rr(-0.6, 0.6) * PX, y, u < 0.3 ? pal[0] : u < 0.75 ? pal[1] : pal[2], {
          vx: pod.vx * 0.3 + rr(-0.5, 0.5), vy: pod.vy * 0.3 + rr(3, 6) * (heavy ? rr(0.6, 1) : 1), life: rr(0.1, 0.17), size: u < 0.3 ? 2 : 1,
          hdr: u < 0.3 ? 3.0 : u < 0.75 ? 1.6 : 0.8, flags: PF.ADD | PF.FADE | PF.SHRINK | PF.COLLIDE,
        });
      }
    }
    // smoke after 0.3 s of thrust
    if (this.thrustT > 0.3) {
      this.smokeT += dt;
      if (this.smokeT > 0.06) {
        this.smokeT = 0;
        spawn(this.particles, pod.x + rr(-0.3, 0.3), pod.y + 0.7, C.smoke, { vx: rr(-0.5, 0.5), vy: rr(0.5, 1.5), life: rr(0.6, 1.0), size: 2, a: 0.3, flags: PF.FADE, drag: 2.5, grav: -1.5, aux: B.GROW + 0.25 });
      }
    }
  }

  private onLand(speed: number, pod: PodView, view: GameView) {
    if (speed <= 4) return;
    this.trauma.add(Math.min(0.5, Math.max(0, (speed - 4) / 12)));
    this.squashT = 0;
    const fy = pod.y + 7 / 16;
    const ti = Math.floor(fy + 0.3) * W + Math.floor(pod.x);
    const m = matFx(view.world.mat[ti] || view.world.back[ti]);
    const n = Math.round(3 + Math.min(1, (speed - 4) / 8) * 4);
    for (const side of [-1, 1]) this.dust(pod.x + side * 0.4, fy - PX, mix(m.dust, m.pal[3], 0.5), n, 2.2 + speed * 0.12, side > 0 ? -0.15 : Math.PI + 0.15, 0.3, 0.5, 0.8);
    if (speed > 8) this.chips(pod.x, fy, m, ri(3, 6), -Math.PI / 2, 1.1, 1.5, 3.5, m.chip);
  }

  private onBump(speed: number, damage: number, axis: "x" | "y", pod: PodView) {
    if (speed < 4) return;
    const sx = axis === "x" ? Math.sign(pod.vx || pod.facing) * -1 : 0;
    const x = pod.x + (axis === "x" ? -sx * 0.5 : 0), y = pod.y + (axis === "y" ? -0.45 : 0);
    const n = axis === "x" ? Math.PI * (sx > 0 ? 0 : 1) : Math.PI / 2;
    this.dust(x, y, C.smoke, 2, 1, n, 0.6, 0.25, 0.5);
    if (damage > 0) { this.sparks(x, y, ri(5, 9), C.spark, 2.2, n, 0.8); this.trauma.add(0.25); }
  }

  private onDamage(frac: number, source: string, pod: PodView) {
    // lava and overheating hurt every step: a capped red tint (podFx.lava), never the 2-frame white hit flash
    if (source === "lava" || source === "heat") { this.pod.lava = 1; return; }
    this.trauma.add(0.2 + 0.6 * frac);
    this.flash(source === "fall" ? 0.1 : 0.12, hex("#ff4a3a"), 0.12);
    this.pod.white = 2 / 60; this.pod.red = 2 / 60 + 0.12;
    this.hitPulse = 1;
    if (frac >= 0.1) this.aberrT = 0.15;
    if (frac > 0.15) this.hit(0.05);
    this.sparks(pod.x, pod.y, ri(4, 8), C.spark, 2.0, -Math.PI / 2, Math.PI);
  }

  private hullFx(dt: number, pod: PodView) {
    const f = pod.hullMax > 0 ? pod.hull / pod.hullMax : 1;
    if (pod.dead || f >= 0.25) { this.smokeT2 = 0; return; }
    this.smokeT2 += dt; this.sparkT += dt;
    if (this.smokeT2 > 0.4) {
      this.smokeT2 = 0;
      spawn(this.particles, pod.x + rr(-0.3, 0.2), pod.y - 0.35, C.smoke, { vx: rr(-0.2, 0.2) - pod.facing * 0.3, vy: -rr(0.6, 1.0), life: rr(0.8, 1.2), size: 1, a: 0.5, flags: PF.FADE, drag: 1, aux: B.GROW + 0.15 });
    }
    if (this.sparkT > (f < 0.1 ? 0.5 : 1.5)) {
      this.sparkT = 0;
      this.sparks(pod.x + rr(-0.3, 0.3), pod.y + rr(-0.2, 0.2), f < 0.1 ? 3 : 1, C.spark, 2.0);
    }
  }
  private smokeT2 = 0;
  private squashT = 9;

  private onWreck(x: number, y: number, view: GameView) {
    this.trauma.add(1);
    this.flash(0.4, C.white, 0.25);
    this.slowmo = 1.2; this.timeScale = 0.3;
    this.hit(0.05);
    this.light(x, y, 5, C.boom, 4, 0.8, "exp", true);
    this.sparks(x, y, 30, C.spark, 2.5, -Math.PI / 2, Math.PI, true, 1.4, 0.5);
    this.chips(x, y, matFx(view.world.back[Math.floor(y) * W + Math.floor(x)] || 1), 12, -Math.PI / 2, Math.PI, 2, 6, 2);
    for (let i = 0; i < 14; i++) spawn(this.particles, x, y, i % 3 ? hex("#d8a030") : hex("#4a4e58"), { vx: rr(-5, 5), vy: rr(-7, -1), life: rr(0.8, 1.5), size: ri(1, 3), flags: PF.COLLIDE | PF.FADE, grav: 18 });
    this.smoke(x, y, 10, C.blastSmoke, 0.45, 1.6, [4, 7]);
    this.ring(x, y, 0.2, 2.8, 0.35, C.white, 2.0, 0.8, 2);
  }

  // ------------------------------------------------------------------ hazards

  private lastBlast = { x: 0, y: 0 };
  private onExplode(x: number, y: number, r: number, kind: "gas" | "dynamite" | "charge", view: GameView) {
    const pod = view.pod;
    this.lastBlast.x = x; this.lastBlast.y = y;
    const d = Math.hypot(pod.x - x, pod.y - y);
    const base = kind === "gas" ? 0.6 : kind === "dynamite" ? 0.5 : 0.8;
    this.trauma.add(base / (1 + d / 4));
    const near = 1 / (1 + d / 8);
    if (kind === "gas") this.flash(0.12 * near, hex("#e8ffd0"), 0.15);
    else this.flash((kind === "dynamite" ? 0.2 : 0.3) * near, C.white, 0.15);
    if (kind === "charge" || d < 3) { this.hit(0.05); this.aberrT = 0.15; }
    this.fuses = this.fuses.filter((f) => Math.hypot(f.x - x, f.y - y) > 0.6);
    const big = kind === "charge" ? 1.3 : 1;
    // light I 6, radius 5 tiles, exp(-8t), forced
    this.light(x, y, 5 * big, kind === "gas" ? hex("#e0ffa0") : C.boom, 6, 0.6, "exp", true);
    // 1 frame white disc, radius 12 px, HDR 4 (a big soft point; the renderer dithers sizes over 5 px)
    stamp(this.particles, x, y, C.white, 1, 4, true, Math.round(24 * big));
    spawn(this.particles, x, y, kind === "gas" ? C.gasHot : C.boom, { life: 0.08, size: Math.round(16 * big), hdr: 2.5, a: 0.9, flags: PF.ADD | PF.FADE | PF.SHRINK });
    // 1 px shock ring to 40 px in 0.3 s (the big charge's to 52), a warm inner one trailing it
    this.ring(x, y, 0.3, 40 * PX * big, 0.3, C.white, 2.5, 0.9, 1.5);
    this.ring(x, y, 0.2, 28 * PX * big, 0.3, kind === "gas" ? C.gas : C.spark, 1.5, 0.35, 3);
    const m = matFx(view.world.back[Math.floor(y) * W + Math.floor(x)] || 1);
    // 30 debris (chunks), 20 sparks, 10 smoke (1.5 s)
    for (let i = 0; i < Math.round(30 * big); i++) {
      const a = rr(0, Math.PI * 2), v = rr(4, 10) * big;
      spawn(this.particles, x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, m.pal[ri(0, 3)], { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: rr(0.7, 1.4), size: ri(1, 3), flags: PF.COLLIDE | PF.FADE, grav: 18, drag: 0.6 });
    }
    this.sparks(x, y, Math.round(20 * big), C.spark, 2.4, -Math.PI / 2, Math.PI, true, 1.8, 0.45);
    if (kind === "gas") {
      // gas release: a green cloud, 30 particles 3-4 px, alpha 0.35, over 1.2 s
      for (let i = 0; i < 30; i++) { const a = rr(0, Math.PI * 2), v = rr(0.5, 2.5); spawn(this.particles, x, y, C.gas, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3, life: rr(0.8, 1.2), size: ri(3, 4), a: 0.35, flags: PF.FADE, drag: 2, grav: -0.4, aux: B.GROW + 0.2 }); }
      this.light(x, y, 2, C.gas, 0.6, 1.2, "fade");
    }
    this.smoke(x, y, Math.round(12 * big), kind === "gas" ? mix(C.blastSmoke, C.gas, 0.35) : C.blastSmoke, 0.45, 1.5, [5, 9], 1.6);
    this.emitters.push({ x, y, age: 0, dur: 0.6, every: 0.05, acc: 0, fn: (ex, ey, k) => { if (R() < 1 - k) this.sparks(ex + rr(-r, r) * 0.6, ey + rr(-r, r) * 0.6, 1, C.ember, 1.0, -Math.PI / 2, 1.2, true, 0.6, 0.5); } });
  }

  private stampFuses(dt: number, view: GameView) {
    for (let i = this.fuses.length - 1; i >= 0; i--) {
      const f = this.fuses[i];
      f.age += dt;
      if (f.age > f.dur + 0.4) { this.fuses.splice(i, 1); continue; }
      const k = Math.min(1, f.age / f.dur);
      // the closing ring and the swell are the terrain's (renderExtras().tells); fx seeps green motes and spills the light
      if (R() < 0.3 + k * 0.6) spawn(this.particles, f.x + rr(-0.45, 0.45), f.y + rr(-0.45, 0.45), k > 0.7 ? C.gasHot : C.gas, { vx: rr(-0.3, 0.3), vy: -rr(0.3, 1.2), life: rr(0.3, 0.7), hdr: 0.6 + k, a: 0.8, flags: PF.ADD | PF.FADE });
    }
    void view;
  }

  private onWobble(x: number, y: number, mat: number) {
    const m = matFx(mat);
    // trembles 0.6 s with dust trickling from its underside (the sprite shake is the renderer's)
    this.emitters.push({ x, y, age: 0, dur: 0.6, every: 0.04, acc: 0, fn: (ex, ey) => {
      spawn(this.particles, ex + rr(-0.45, 0.45), ey + 0.5, R() < 0.5 ? m.dust : m.pal[2], { vy: rr(0.2, 1), life: rr(0.5, 0.9), a: 0.7, flags: PF.COLLIDE | PF.FADE, grav: 8 });
    } });
    this.dust(x, y - 0.5, m.dust, 2, 0.4, -Math.PI / 2, 1.5, 0.3, 0.6);
  }

  private onFallLand(x: number, y: number, mat: number, pod: PodView) {
    const m = matFx(mat);
    const d = Math.hypot(pod.x - x, pod.y - y);
    this.trauma.add(d <= 4 ? 0.25 : 0.25 * Math.max(0, 1 - (d - 4) / 4));
    for (const side of [-1, 1]) this.dust(x + side * 0.45, y + 0.4, m.dust, 6, 2.6, side > 0 ? -0.1 : Math.PI + 0.1, 0.35, 0.4, 1.0);
    this.dust(x, y, m.dust, 4, 0.8, -Math.PI / 2, 1.2, 0.3, 1.1);
    this.chips(x, y + 0.4, m, ri(4, 7), -Math.PI / 2, 1.2, 1.5, 3.5, 2);
  }

  private onLava(pod: PodView) {
    this.pod.lava = 1;
    if (this.t - this.lavaT < 0.08) return;
    this.lavaT = this.t;
    // sizzle steam off the hull and a few hot sparks
    for (let i = 0; i < 3; i++) spawn(this.particles, pod.x + rr(-0.45, 0.45), pod.y + rr(0, 0.4), C.steam, { vx: rr(-0.4, 0.4), vy: -rr(1, 2.2), life: rr(0.5, 0.9), size: ri(2, 3), a: 0.35, hdr: 0.1, flags: PF.FADE, drag: 1.5, grav: -1, aux: B.GROW + 0.3 });
    this.sparks(pod.x + rr(-0.4, 0.4), pod.y + 0.4, 1, C.ember, 1.2, -Math.PI / 2, 0.8, true, 0.6, 0.4);
  }

  private onSpore(x: number, y: number) {
    // a 2-tile pale green haze, drawn behind tiles, lit from within, drifting up
    for (let i = 0; i < 30; i++) {
      const a = rr(0, Math.PI * 2), v = rr(0.3, 1.8);
      spawn(this.particles, x, y, C.spore, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, life: rr(0.9, 1.4), size: ri(3, 4), a: 0.35, hdr: 0.3, flags: PF.FADE | PF.BEHIND, drag: 1.6, grav: -0.3, aux: B.GROW + 0.3 });
    }
    for (let i = 0; i < 8; i++) spawn(this.particles, x + rr(-0.6, 0.6), y + rr(-0.6, 0.6), hex("#5cffc8"), { vx: rr(-0.3, 0.3), vy: -rr(0.2, 0.6), life: rr(1.5, 3), hdr: 0.6, a: 0.5, flags: PF.ADD | PF.FADE, aux: B.DRIFT + R() * 0.99 });
    this.light(x, y, 2.5, C.spore, 0.6, 1.2, "pulse");
  }
  private onSporeCharge(x: number, y: number) {
    this.sporeCh.push({ x, y, age: 0 });
    this.light(x, y, 1.5, C.spore, 0.9, 0.5, "hold");
    for (let i = 0; i < 4; i++) spawn(this.particles, x + rr(-0.4, 0.4), y + rr(-0.4, 0.1), C.spore, { vy: -rr(0.3, 0.7), life: rr(0.4, 0.7), hdr: 0.9, a: 0.6, flags: PF.ADD | PF.FADE });
  }

  private onArc(e: Extract<GameEvent, { t: "arc" }>) {
    const a: Arc = { x1: cx(e.x1), y1: cx(e.y1), x2: cx(e.x2), y2: cx(e.y2), age: 0, dur: e.phase === "fire" ? 1 : 0.4, fire: e.phase === "fire", pts: [], roll: 0 };
    this.arcs.push(a);
    if (a.fire) for (const [px, py] of [[a.x1, a.y1], [a.x2, a.y2]]) this.sparks(px, py, 6, C.blue, 2.5, -Math.PI / 2, Math.PI, false, 1.2, 0.25);
  }
  private stampArcs(dt: number) {
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i];
      a.age += dt;
      if (a.age >= a.dur) { this.arcs.splice(i, 1); continue; }
      if (!a.fire) {
        // charge-up: the posts spit sparks, faster as it nears the arc
        const k = a.age / a.dur;
        for (const [px, py] of [[a.x1, a.y1], [a.x2, a.y2]]) if (R() < 0.2 + k * 0.6) spawn(this.particles, px + rr(-0.2, 0.2), py + rr(-0.35, 0.35), C.arc, { vx: rr(-1.5, 1.5), vy: rr(-1.5, 1.5), life: 0.12, hdr: 1.5 + k, flags: PF.ADD | PF.FADE });
        continue;
      }
      // the arc: a jagged 1-2 px line, HDR 3.0, re-rolled every 2 frames
      if ((a.roll -= dt) <= 0 || !a.pts.length) {
        a.roll = 2 / 60;
        const len = Math.hypot(a.x2 - a.x1, a.y2 - a.y1), n = Math.max(3, Math.round(len * 3));
        const nx = -(a.y2 - a.y1) / len, ny = (a.x2 - a.x1) / len;
        a.pts = [];
        for (let k = 0; k <= n; k++) {
          const u = k / n, j = k === 0 || k === n ? 0 : rr(-4, 4) * PX * Math.sin(u * Math.PI);
          a.pts.push(a.x1 + (a.x2 - a.x1) * u + nx * j, a.y1 + (a.y2 - a.y1) * u + ny * j);
        }
        if (R() < 0.5) { const k = ri(1, n - 1); this.sparks(a.pts[k * 2], a.pts[k * 2 + 1], 1, C.blue, 2, -Math.PI / 2, Math.PI, false, 0.6, 0.15); }
      }
      const fade = 1 - Math.max(0, (a.age - a.dur + 0.15) / 0.15);
      for (let k = 0; k + 3 < a.pts.length; k += 2) this.stampLine(a.pts[k], a.pts[k + 1], a.pts[k + 2], a.pts[k + 3], C.blue, fade, 3.0, k % 4 === 0);
    }
  }

  private onPulse() {
    this.pulseAge = 0;
    this.trauma.pulse();
    this.hazeT = 1.5;
    this.bands.push({ y: 761, age: 0 });
  }
  private stampBands(dt: number) {
    const r = this.rect;
    for (let i = this.bands.length - 1; i >= 0; i--) {
      const b = this.bands[i];
      b.age += dt; b.y -= 40 * dt;
      if (b.y < r.y0 - 2 || b.age > 3) { this.bands.splice(i, 1); continue; }
      if (b.y > r.y1 + 1) continue;
      // the band's light is the renderer's (same row: 761 - 40 t); fx adds its crest, a sparse line of motes kicked up as it passes
      for (let x = r.x0; x < r.x1; x += 5 * PX) stamp(this.particles, x + ((b.age * 97 + x * 13) % 1) * 3 * PX, b.y, C.pulse, 0.35, 1.5, true, 1);
      if (R() < 0.8) spawn(this.particles, rr(r.x0, r.x1), b.y, C.pulse, { vy: -rr(1, 3), vx: rr(-0.5, 0.5), life: rr(0.3, 0.6), hdr: 0.8, a: 0.6, flags: PF.ADD | PF.FADE });
    }
  }

  private onTeleport(phase: "start" | "cancel" | "done", pod: PodView) {
    if (phase === "start") { this.tele = { age: 0, lost: false, arrive: 0 }; return; }
    if (phase === "cancel") {
      this.tele = null;
      this.sparks(pod.x, pod.y, 8, C.tele, 1.6, -Math.PI / 2, Math.PI, false, 0.7, 0.3);
      return;
    }
    // warp: white flash 0.5 and arrival with the lines falling
    this.washPeak = 0.5; this.washAge = 0; this.washIn = 0; this.washOut = 0.45;
    this.tele = { age: 2.5, lost: true, arrive: 0.6 };
    this.light(pod.x, pod.y, 3, C.tele, 2, 0.5, "fade", true, true);
  }
  private channel(dt: number, pod: PodView) {
    const t = this.tele;
    if (!t) return;
    if (t.arrive > 0) {
      // arrival: lines fall onto the pod
      t.arrive -= dt;
      for (let k = 0; k < 3; k++) this.teleLine(pod.x + (R() < 0.5 ? -1 : 1) * rr(0.45, 0.9), pod.y - rr(0.8, 2), 6);
      if (t.arrive <= 0) this.tele = null;
      return;
    }
    t.age += dt;
    const prog = pod.channel > 0 ? pod.channel : Math.min(1, t.age / 2.5);
    const n = 1 + prog * 3;
    // lines rise in a band round the pod, not through it
    for (let k = 0; k < n; k++) if (R() < 0.6) this.teleLine(pod.x + (R() < 0.5 ? -1 : 1) * rr(0.45, 0.9), pod.y + rr(-0.2, 0.6), -rr(3, 6) * (0.6 + prog));
    // the last 0.5 s: the lost 30% burst out, grey and crumble (R1)
    if (!t.lost && prog >= 0.8) {
      t.lost = true;
      const lost = Math.min(12, Math.round(pod.cargoUsed * 0.3));
      for (let k = 0; k < lost; k++) {
        const a = -Math.PI / 2 + rr(-1.3, 1.3), v = rr(3, 5);
        this.pieces.push({ x: pod.x, y: pod.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ox: 0, oy: 0, fx: 0, fy: 0, age: 0, delay: k * 0.03, pop: 0, find: 0, c: C.lostA, glint: C.white, lost: true, px: pod.x, py: pod.y });
      }
      if (lost > 0) this.label(pod.x, pod.y + 0.9, `-${lost}`, "#ff5a4a", "bad", 1.2);
    }
    if (prog >= 1 && pod.channel === 0 && t.age > 3) this.tele = null;
  }
  /** A rising (vy < 0) or falling light line: a short stack of additive px moving together. */
  private teleLine(x: number, y: number, vy: number) {
    const len = ri(3, 6), life = rr(0.25, 0.45);
    for (let k = 0; k < len; k++) spawn(this.particles, x, y + k * PX * Math.sign(-vy), C.tele, { vy, life, hdr: k === 0 ? 2.0 : 1.2, a: 1 - k / len, flags: PF.ADD | PF.FADE });
  }

  private onLift(phase: "start" | "stop", pod: PodView) {
    this.lift = phase === "start";
    this.railSparks(pod, 5);
  }
  private railSparks(pod: PodView, n: number) {
    for (const side of [-1, 1]) this.sparks(pod.x + side * 0.45, pod.y + rr(-0.3, 0.3), n, C.spark, 2.0, side < 0 ? Math.PI : 0, 1.0, true, 0.8);
  }

  private onCache(x: number, y: number, theme: string) {
    const acc = CACHE_ACCENT[theme] ?? C.gold;
    this.trauma.add(0.1);
    this.sparks(x, y - 0.3, 8, acc, 2.0, -Math.PI / 2, 1.2, false, 1.2, 0.5);
    this.ring(x, y, 0.2, 1.4, 0.3, acc, 1.6, 0.8, 2);
    this.light(x, y, 2.5, acc, 1.5, 0.4, "pulse");
    // the lid pops 2 px
    for (let i = 0; i < 6; i++) spawn(this.particles, x + rr(-0.4, 0.4), y - 0.4, mix(acc, C.white, 0.2), { vx: rr(-1.5, 1.5), vy: -rr(2, 4), life: rr(0.5, 0.9), size: ri(1, 2), hdr: 0.4, flags: PF.COLLIDE | PF.FADE, grav: 18 });
  }

  private onBuy(id: string, tierUp: boolean, pod: PodView) {
    const acc = ACCENT[id] ?? C.rail;
    this.pod.white = 2 / 60; this.pod.hop = 2;
    this.sparks(pod.x, pod.y - 0.2, tierUp ? 24 : 16, acc, 2.0, -Math.PI / 2, Math.PI * 0.75, false, 1.0, 0.5);
    this.ring(pod.x, pod.y, 0.4, tierUp ? 2.2 : 1.4, tierUp ? 0.4 : 0.3, acc, 1.8, 0.8, 2);
    if (tierUp) { this.light(pod.x, pod.y, 3, acc, 2.0, 0.5, "pulse", false, true); this.ring(pod.x, pod.y, 0.2, 1.4, 0.35, C.white, 1.5, 0.5, 2); }
  }

  // ------------------------------------------------------------------ Ferrum's magnetic storm (qa-3 P4)

  private stormOn = false; private stormBurst = 0; private stormArc = 0; private stormScan = 0;
  private lodes: number[] = [];
  private onStorm(on: boolean, pod: PodView) {
    this.stormOn = on;
    this.stormBurst = 0.35; // a burst of static as it starts and as it ends
    this.ring(pod.x, pod.y, on ? 0.3 : 2.6, on ? 3 : 0.4, 0.45, C.storm, 1.2, 0.6, 2);
    this.sparks(pod.x, pod.y - 0.5, on ? 10 : 6, C.arc, 1.8, -Math.PI / 2, Math.PI * 0.8, false, 1, 0.35);
    this.light(pod.x, pod.y, 4, C.storm, on ? 1.2 : 0.7, 0.4, "pulse");
  }
  private storm(dt: number, view: GameView) {
    const ps = this.particles, pod = view.pod, r = this.rect;
    this.stormBurst = Math.max(0, this.stormBurst - dt);
    this.stormArc = Math.max(0, this.stormArc - dt);
    // static: flickering 1 px scan-line fragments, dim, never within 1.5 tiles of the pod
    const n = this.stormBurst > 0 ? 40 : this.stormOn ? 9 : 0;
    for (let k = 0; k < n; k++) {
      const y = Math.floor(rr(r.y0, r.y1) * 16) / 16, x0 = rr(r.x0, r.x1), len = ri(3, 10);
      if (Math.abs(y - pod.y) < 1.5 && Math.abs(x0 - pod.x) < 1.5 + len * PX) continue;
      const a = (this.stormBurst > 0 ? 0.5 : 0.3) * rr(0.5, 1);
      for (let j = 0; j < len; j++) spawn(ps, x0 + j * PX, y, j % 3 ? C.storm : C.stormHi, { life: rr(0.03, 0.09), a, hdr: 0.45, flags: PF.ADD });
    }
    if (!this.stormOn) return;
    // metallic motes stream into lodestone near the pod (it pulls in the storm)
    if ((this.stormScan -= dt) <= 0) {
      this.stormScan = 0.5;
      this.lodes.length = 0;
      const w = view.world, tx = Math.floor(pod.x), ty = Math.floor(pod.y), rows = w.find.length / W;
      if (LODESTONE_ID > 0) for (let y = ty - 7; y <= ty + 7; y++) for (let x = tx - 10; x <= tx + 10; x++)
        if (y >= 0 && y < rows && x > 0 && x < W - 1 && w.find[y * W + x] === LODESTONE_ID) this.lodes.push(x, y);
    }
    const nl = this.lodes.length / 2;
    for (let k = 0; k < (nl ? 4 : 2); k++) {
      if (R() > 0.7) continue;
      let tx: number, ty: number;
      if (nl) { const i = ri(0, nl - 1); tx = this.lodes[i * 2] + 0.5; ty = this.lodes[i * 2 + 1] + 0.5; }
      else { tx = pod.x + rr(-8, 8); ty = pod.y + rr(-5, 5); }
      const a = rr(0, Math.PI * 2), d = rr(1.2, 3), sp = rr(1.2, 2.2);
      const sx = tx + Math.cos(a) * d, sy = ty + Math.sin(a) * d;
      if (Math.hypot(sx - pod.x, sy - pod.y) < 1) continue;
      spawn(ps, sx, sy, R() < 0.5 ? C.steel : C.steelHi, {
        vx: nl ? -Math.cos(a) * sp : rr(-0.3, 0.3), vy: nl ? -Math.sin(a) * sp : rr(-0.3, 0.3), life: nl ? (d - 0.4) / sp : rr(0.8, 1.5),
        a: 0.6, hdr: 0.5, flags: PF.ADD | PF.FADE,
      });
    }
    // the antenna crackles: a spark now and then, a short arc flicker
    if (R() < dt * 4) {
      const ax = pod.x - pod.facing * 0.2, ay = pod.y - 0.55;
      this.sparks(ax, ay, ri(1, 3), C.arc, 1.6, -Math.PI / 2, 1.2, false, 0.6, 0.2);
      this.stormArc = 0.06;
    }
    if (this.stormArc > 0) { const ax = pod.x - pod.facing * 0.2, ay = pod.y - 0.55; for (let j = 0; j < 4; j++) stamp(ps, ax + rr(-2, 2) * PX, ay - j * PX, j & 1 ? C.white : C.arc, 0.8, 1.6, true); }
  }

  private onLaunch(phase: string) {
    // the Seed breaks the surface: white wash over 1.2 s (art 9.3)
    if (/break|surface|wash/.test(phase)) { this.washPeak = 1; this.washAge = 0; this.washIn = 1.2; this.washOut = 1.0; }
  }

  // ------------------------------------------------------------------ entities: clouds, charges, nuggets, boulders, drone, Seed

  private entAcc = 0;
  private entities(dt: number, view: GameView) {
    this.entAcc += dt;
    const tick = this.entAcc >= 1 / 30;
    if (tick) this.entAcc = 0;
    const r = this.rect;
    for (const e of view.entities) {
      if (e.x < r.x0 - 2 || e.x > r.x1 + 2 || e.y < r.y0 - 2 || e.y > r.y1 + 2) continue;
      if (e.kind === "cloud" && tick && R() < 0.25) {
        // the haze is the renderer's; fx lets a few spores fall out of it
        const rad = e.r ?? 2, a = rr(0, Math.PI * 2), d = Math.sqrt(R()) * rad * 0.8;
        spawn(this.particles, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, (e.mat ?? 0) === 1 ? C.gas : C.spore, { vx: rr(-0.2, 0.2), vy: -rr(0.1, 0.3), life: rr(1, 2), hdr: 0.5, a: 0.6, flags: PF.ADD | PF.FADE, aux: B.DRIFT + R() * 0.99 });
      } else if (e.kind === "charge" && tick) {
        spawn(this.particles, e.x + 0.15, e.y - 0.4, C.spark, { vx: rr(-1.5, 1.5), vy: -rr(1, 2.5), life: 0.15, hdr: 2.0, flags: PF.ADD | PF.FADE, grav: 10, aux: B.HOT });
      } else if (e.kind === "boulder" && (e.vy ?? 0) > 2 && tick && R() < 0.5) {
        const m = matFx(e.mat ?? 0);
        spawn(this.particles, e.x + rr(-0.4, 0.4), e.y - 0.4, m.dust, { vy: -0.3, life: 0.5, size: 2, a: 0.3, flags: PF.FADE, drag: 2, aux: B.GROW + 0.2 });
      } else if (e.kind === "seed" && tick) {
        for (let k = 0; k < 3; k++) spawn(this.particles, e.x + rr(-0.6, 0.6), e.y + rr(0, 1), C.seed, { vx: rr(-0.5, 0.5), vy: rr(1, 4), life: rr(0.3, 0.6), hdr: 2.5, flags: PF.ADD | PF.FADE });
      }
    }
  }

  // ------------------------------------------------------------------ stamps

  private stampCircle(x: number, y: number, r: number, c: RGB, a: number, hdr: number, step: number, add: boolean) {
    const rr2 = this.rect;
    const n = Math.min(720, Math.max(8, Math.ceil((Math.PI * 2 * r * 16) / step)));
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2, px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
      if (px < rr2.x0 || px > rr2.x1 || py < rr2.y0 || py > rr2.y1) continue;
      stamp(this.particles, px, py, c, a, hdr, add);
    }
  }
  private stampLine(x1: number, y1: number, x2: number, y2: number, c: RGB, a: number, hdr: number, thick: boolean) {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 16));
    for (let k = 0; k < n; k++) {
      const u = k / n, x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u;
      stamp(this.particles, x, y, k & 1 ? C.white : c, a, hdr, true);
      if (thick && k % 3 === 0) stamp(this.particles, x, y + PX, C.arc, a * 0.5, hdr * 0.5, true);
    }
  }
  private stampRings(dt: number) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const g = this.rings[i];
      g.age += dt;
      if (g.age >= g.dur) { this.rings.splice(i, 1); continue; }
      const k = g.age / g.dur, e = g.ease ? 1 - (1 - k) * (1 - k) : k;
      this.stampCircle(g.x, g.y, g.r0 + (g.r1 - g.r0) * e, g.c, g.a * (1 - k * k), g.hdr, g.step, true);
    }
  }
  private stampOutlines(dt: number) {
    for (let i = this.outlines.length - 1; i >= 0; i--) {
      const o = this.outlines[i];
      o.age += dt;
      if (o.age >= o.dur) { this.outlines.splice(i, 1); continue; }
      const a = 1 - o.age / o.dur;
      for (let p = 0; p < 16; p++) {
        const u = (p + 0.5) * PX;
        stamp(this.particles, o.x + u, o.y + 0.5 * PX, o.c, a, 1.1, true);
        stamp(this.particles, o.x + u, o.y + 1 - 0.5 * PX, o.c, a, 1.1, true);
        stamp(this.particles, o.x + 0.5 * PX, o.y + u, o.c, a, 1.1, true);
        stamp(this.particles, o.x + 1 - 0.5 * PX, o.y + u, o.c, a, 1.1, true);
      }
    }
  }

  // ------------------------------------------------------------------ post, pod flashes, lights, labels

  private postFx(dt: number, view: GameView) {
    const p = this.post, pod = view.pod;
    this.flashAge += dt;
    const fk = Math.max(0, 1 - this.flashAge / this.flashDur);
    p.flash = this.flashPeak * fk * fk;
    this.aberrT = Math.max(0, this.aberrT - dt);
    p.aberration = this.aberrT > 0 ? 1 : 0;
    // heat haze: Magma 0.5 (1.0 within 3 tiles of lava), the Core 0.25, the pulse +0.5 for 1.5 s, overheating from 75%
    const w = view.world, tx = Math.floor(pod.x), ty = Math.floor(pod.y);
    const row = Math.max(0, Math.min(w.mat.length / W - 1, ty));
    const slot = w.biome[row * W + Math.max(0, Math.min(W - 1, tx))];
    let haze = slot === 4 ? 0.5 : slot === 6 ? 0.25 : 0;
    if (slot >= 4 && LAVA_ID >= 0) {
      let lava = false;
      for (let y = ty - 3; y <= ty + 3 && !lava; y++) for (let x = tx - 3; x <= tx + 3; x++) if (y >= 0 && y < w.mat.length / W && x >= 0 && x < W && w.mat[y * W + x] === LAVA_ID) { lava = true; break; }
      if (lava) haze = 1;
    }
    if (this.hazeT > 0) { this.hazeT -= dt; haze += 0.5 * Math.min(1, this.hazeT / 0.4); }
    if (pod.heat > 0.75) haze = Math.max(haze, (pod.heat - 0.75) / 0.25);
    p.haze += (Math.min(1, haze) - p.haze) * Math.min(1, dt * 4);
    // low hull: slow red pulse below 25% (alpha 0.12), faster below 10% (0.2); a hit adds a pulse
    const f = pod.hullMax > 0 ? pod.hull / pod.hullMax : 1;
    let vp = 0;
    if (!pod.dead && f < 0.25) { const fast = f < 0.1; vp = (fast ? 0.36 : 0.22) * (0.5 + 0.5 * Math.sin(this.t * Math.PI * 2 * (fast ? 1.6 : 0.8))); }
    this.hitPulse = Math.max(0, this.hitPulse - dt / 0.4);
    p.vignettePulse = Math.max(vp, 0.5 * this.hitPulse * this.hitPulse);
    // wash: teleport warp and the launch
    this.washAge += dt;
    if (this.washPeak > 0) {
      const a = this.washAge;
      p.wash = a < this.washIn ? this.washPeak * (a / this.washIn) : this.washPeak * Math.max(0, 1 - (a - this.washIn) / this.washOut);
      if (a > this.washIn + this.washOut) this.washPeak = 0;
    } else p.wash = 0;
  }

  private podFx(dt: number) {
    const q = this.pod;
    q.white = Math.max(0, q.white - dt); q.red = Math.max(0, q.red - dt);
    q.cargo = Math.max(0, q.cargo - dt); q.hop = Math.max(0, q.hop - dt * 12); q.lava = Math.max(0, q.lava - dt * 3);
    this.squashT += dt;
    q.squash = this.squashT < 2 / 60 ? 1 : this.squashT < 4 / 60 ? 0.5 : 0;
  }

  private buildLights(dt: number, view: GameView) {
    const out = this.lights, pod = view.pod;
    let n = 0;
    const put = (x: number, y: number, r: number, c: RGB, i: number, force = false) => {
      if (i <= 0.01) return;
      const l = (this.lightPool[n] ??= { x: 0, y: 0, r: 0, color: [0, 0, 0], i: 0 });
      l.x = x; l.y = y; l.r = r; l.color[0] = c[0]; l.color[1] = c[1]; l.color[2] = c[2]; l.i = i; l.force = force;
      out[n++] = l;
    };
    for (let k = this.tl.length - 1; k >= 0; k--) {
      const L = this.tl[k];
      L.age += dt;
      if (L.age >= L.dur) { this.tl.splice(k, 1); continue; }
      const u = L.age / L.dur;
      const i = L.curve === "exp" ? L.i * Math.exp(-8 * L.age) : L.curve === "fade" ? L.i * (1 - u) : L.curve === "pulse" ? L.i * Math.sin(Math.PI * u) : L.i;
      put(L.pod ? pod.x : L.x, L.pod ? pod.y : L.y, L.r, L.c, i, L.force);
    }
    // gas fuses: a green swell HDR 0.4 -> 2.0 (a hazard tell, forced)
    for (const f of this.fuses) { const k = Math.min(1, f.age / f.dur); put(f.lx, f.ly, 1.8 + k, lin(C.gas), (0.4 + 1.6 * k * k) * (0.85 + 0.15 * Math.sin(this.t * 40)), true); }
    for (const a of this.arcs) put((a.x1 + a.x2) / 2, (a.y1 + a.y2) / 2, a.fire ? 3 : 1.5, lin(C.arc), a.fire ? 2 * (0.8 + 0.2 * R()) : 0.5 + a.age / a.dur, a.fire);
    if (this.stormOn) {
      // a slow blue-violet pulse on the rock round the pod (lighting, never a screen overlay over the pod)
      const k = 0.5 + 0.5 * Math.sin(this.t * 2.4);
      put(pod.x - 4, pod.y - 2, 8, L_STORM, 0.3 + 0.3 * k);
      put(pod.x + 4, pod.y + 1, 8, L_STORM, 0.3 + 0.3 * (1 - k));
      if (this.stormArc > 0) put(pod.x, pod.y - 0.6, 1.5, lin(C.arc), 0.8);
    }
    if (this.tele && this.tele.arrive <= 0) put(pod.x, pod.y, 2.5, lin(C.tele), 0.5 + Math.min(1, this.tele.age / 2.5));
    // entities: clouds lit from within, nuggets' omni (art 8.1 pickup), charge fuses, the Seed (the drone's lamp and the
    // thrust flame's light are the renderer's)
    const r = this.rect;
    for (const e of view.entities) {
      if (e.x < r.x0 - 3 || e.x > r.x1 + 3 || e.y < r.y0 - 3 || e.y > r.y1 + 3) continue;
      if (e.kind === "cloud") put(e.x, e.y, (e.r ?? 2) + 1, lin((e.mat ?? 0) === 1 ? C.gas : C.spore), 0.5);
      else if (e.kind === "nugget") { const ff = findFx(e.find ?? 0); if (ff) put(e.x, e.y, 1.5, lin(ff.glow ?? ff.light), 0.6); }
      else if (e.kind === "charge") put(e.x, e.y - 0.3, 1.5, lin(C.ember), 0.7 + 0.3 * R());
      else if (e.kind === "seed") put(e.x, e.y, 8, lin(C.seed), 6, true);
    }
    // keep the strongest 20 (the renderer has 24 slots and the pod lamp is slot 0)
    out.length = n;
    if (n > 20) { out.sort((a, b) => (b.force ? 1e9 : 0) + b.i * b.r * b.r - ((a.force ? 1e9 : 0) + a.i * a.r * a.r)); out.length = 20; }
  }

  private updateLabels(dt: number) {
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const l = this.labels[i];
      l.age += dt;
      if (l.age >= l.life + 0.3) { this.labels.splice(i, 1); continue; }
      // "+3 Platinum" rises 0.6 tile and fades over 0.7 s; warnings hold, then fade
      if (l.tone === "ore") { l.y -= (0.6 / 0.7) * dt; l.alpha = 1 - smooth(0.35, 1, l.age / l.life); }
      else { l.y -= 0.15 * dt; l.alpha = 1 - smooth(l.life, l.life + 0.3, l.age); }
    }
  }
}
