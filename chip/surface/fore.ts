// Everything in front of the landscape layers, in the style K picks: the
// ground (turf by surface over earth with its strata and stones, sandstone
// where the land stands up), the pond, the Needle, the cup and the flag, the
// ball and the golfer who hits it. One set of shapes finished three ways
// (paint.ts): Cartoon (outlines, cel shade, gloss), Soft (gradients and
// blurred shade) and Silhouette (flat fills and a lit rim, like the layers).
//
// The hole never moves, but the camera zooms, so the ground is drawn as
// paths each frame from the same points the ball bounces on; the golfer's
// parts, the ball and the small things growing on the hole are sprites,
// drawn once and placed.
import { HOLE, NEEDLE, groundAt, type Surface } from "../game/hole.ts";
import type { Flat } from "./looks.ts";
import { LX, LY, Shape, finish, hash, mix, put, rgba, sprite, type Finish, type Sprite, type StyleId } from "./paint.ts";

export type View = { sx: (x: number) => number; sy: (y: number) => number; s: number; w: number; h: number; left: number; right: number };
/** The golfer: where he stands (the ball he is to hit), which way, and the swing (the meter's power while charging, then the shot). */
export type Golfer = { x: number; facing: 1 | -1; power: number; charging: boolean; /** Seconds since the hit, or -1. */ since: number; hitPower: number; alpha: number; t: number };

/** The ground's tones, worked out from a look's colours. */
type Land = { soil: string[]; rock: string[]; shade: string; light: string; ink: string };

const ROCK_X: [number, number][] = [[-60, -7.6], [69.4, 150]];
/** The golfer's size against a real one: a little big, so he reads at the panel's scale. */
const G = 1.15;

export class Fore {
  F: Finish; L: Land;
  ball: Sprite; legs: Sprite; torso: Sprite; head: Sprite; arms: Sprite; club: Sprite;
  growth: Sprite[]; stones: Sprite[]; marker: Sprite;

  constructor(public style: StyleId, public flat: Flat, public px: number) {
    const f = flat;
    this.L = {
      soil: [mix(f.earth, f.rockLit, 0.7), mix(f.earth, f.rock, 0.55), f.earth, mix(f.earth, f.shade, 0.45)],
      rock: [mix(f.rockLit, f.light, 0.14), f.rockLit, f.rock, mix(f.rock, f.shade, 0.35)],
      shade: f.shade, light: f.light, ink: mix(f.earth, f.shade, 0.6),
    };
    this.F = { id: style, ink: this.L.ink, lw: 0.04, px, shadowInk: f.shade, lightInk: f.light };
    this.ball = sprite(0.7, 0.7, 0.35, 0.35, px * 2, (g) => this.drawBall(g));
    this.legs = sprite(1.2, 1.2, 0.6, 0.1, px, (g) => this.drawLegs(g));
    this.torso = sprite(1.0, 1.0, 0.5, 0.3, px, (g) => this.drawTorso(g));
    this.head = sprite(0.7, 0.7, 0.35, 0.35, px, (g) => this.drawHead(g));
    this.arms = sprite(0.8, 0.9, 0.4, 0.75, px, (g) => this.drawArms(g));
    this.club = sprite(0.5, 1.1, 0.2, 1.0, px, (g) => this.drawClub(g));
    this.marker = sprite(0.4, 0.4, 0.2, 0.1, px, (g) => {
      finish(g, new Shape().circle(0, 0.11, 0.12), this.F, this.tone(mix("#f4efe6", f.light, 0.2)), { cel: 0.04, rim: 0.02 });
      g.fillStyle = "#e8473b"; g.beginPath(); g.arc(0.01, 0.12, 0.05, 0, Math.PI * 2); g.fill();
    });
    const desert = f.set === "canyon";
    this.growth = (desert ? ["shrub", "rock", "tuft", "cactus", "rock2"] : ["pine", "rock", "tuft", "flowers", "pine"]).map((k) => sprite(1.6, 1.8, 0.8, 0.2, px, (g) => this.drawGrowth(g, k)));
    this.stones = [0, 1, 2].map((i) => sprite(0.9, 0.6, 0.45, 0.3, px, (g) => this.drawStone(g, i)));
  }

  private tone(base: string, lit = 0.32, shade = 0.38) { return { base, lit: mix(base, this.L.light, lit), shade: mix(base, this.L.shade, shade) }; }
  private turf(s: Surface): [string, string, string] {
    const c = this.flat.surface[s] || this.flat.surface.fairway;
    return [mix(c, this.L.light, 0.22), c, mix(c, this.L.shade, 0.3)];
  }

  // ---- the ground -------------------------------------------------------------------------------------------------

  ground(ctx: CanvasRenderingContext2D, v: View) {
    const { L, F } = this;
    const g = HOLE.ground, surf = HOLE.surfaces, cup = HOLE.cup;
    const floor = -40;
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(v.sx(g[0][0]), v.sy(floor));
      for (const [x, y] of g) ctx.lineTo(v.sx(x), v.sy(y));
      ctx.lineTo(v.sx(g[g.length - 1][0]), v.sy(floor));
      ctx.closePath();
    };
    /** Everything under the surface moved down by d, filled. */
    const below = (d: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(v.sx(g[0][0]), v.sy(floor));
      for (const [x, y] of g) ctx.lineTo(v.sx(x), v.sy(y - d));
      ctx.lineTo(v.sx(g[g.length - 1][0]), v.sy(floor));
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
    };
    ctx.save();
    outline();
    ctx.clip();
    // The earth.
    if (F.id === "flat") {
      below(0, L.soil[1]);
      below(2.2, mix(L.soil[2], L.soil[3], 0.4));
    } else if (F.id === "soft") {
      for (let i = 0; i < 9; i++) below(i === 0 ? 0 : 0.5 + i * i * 0.14, mix(L.soil[0], L.soil[3], i / 8));
    } else {
      below(0, L.soil[0]);
      below(1.1, L.soil[1]);
      below(1.45, mix(L.soil[1], L.soil[2], 0.6));
      below(2.6, L.soil[1]);
      below(3.6, L.soil[2]);
      below(4.0, mix(L.soil[2], L.soil[3], 0.6));
      below(5.6, L.soil[3]);
    }
    // Stones in it.
    if (F.id !== "flat") {
      for (let c = Math.floor(v.left / 1.7); c * 1.7 < v.right; c++) {
        if (hash(c * 3.7 + 1.1) < 0.45) continue;
        const x = c * 1.7 + hash(c + 0.5) * 1.7, d = 0.9 + hash(c * 1.3 + 2) * 5;
        if (x > 40 && x < 54 && d < 3) continue;
        put(ctx, this.stones[Math.floor(hash(c + 7.7) * 3)], v.sx(x), v.sy(groundAt(HOLE, x) - d), (hash(c + 3) - 0.5) * 0.8, v.s * (0.8 + 0.6 * hash(c + 5)));
      }
    }
    // Stone where the land stands up: the wall behind the tee, and the mesa: sandstone in bands.
    for (const [x0, x1] of ROCK_X) {
      const a = Math.max(x0, v.left), b = Math.min(x1, v.right);
      if (b <= a) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(v.sx(a), 0, v.sx(b) - v.sx(a), v.h); ctx.clip();
      this.sandstone(ctx, v, a, b, -14, 28);
      ctx.restore();
    }
    // Light and shade along the rock's faces: lit where they face the sun, darker where they turn from it.
    for (let i = 0; i + 1 < g.length; i++) {
      if (surf[i] !== "rock") continue;
      const [x0, y0] = g[i], [x1, y1] = g[i + 1];
      if (Math.max(x0, x1) < v.left || Math.min(x0, x1) > v.right) continue;
      const len = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      const lit = nx * LX + ny * LY;
      const d = 0.45;
      ctx.beginPath();
      ctx.moveTo(v.sx(x0), v.sy(y0)); ctx.lineTo(v.sx(x1), v.sy(y1)); ctx.lineTo(v.sx(x1 - nx * d), v.sy(y1 - ny * d)); ctx.lineTo(v.sx(x0 - nx * d), v.sy(y0 - ny * d)); ctx.closePath();
      ctx.fillStyle = lit > 0.2 ? rgba(L.rock[0], F.id === "flat" ? 1 : 0.8) : rgba(L.shade, 0.3);
      ctx.fill();
    }
    // The turf along the top of each run, by surface.
    const isCup = (i: number) => g[i][1] < cup.y - 0.01 && Math.abs(g[i][0] - cup.x) < cup.w;
    const n = g.length;
    const nrm: [number, number][] = g.map((_, i) => {
      // Averaged over this point's turf segments only, so a band does not lean into a wall.
      let ax = 0, ay = 0;
      for (const j of [i - 1, i]) {
        if (j < 0 || j + 1 >= n || surf[j] === "rock") continue;
        const dx = g[j + 1][0] - g[j][0], dy = g[j + 1][1] - g[j][1], len = Math.hypot(dx, dy) || 1;
        ax += -dy / len; ay += dx / len;
      }
      const len = Math.hypot(ax, ay) || 1;
      return [ax / len, ay / len];
    });
    const quad = (i: number, u0: number, u1: number, d0: number, d1: number) => {
      const [x0, y0] = g[i], [x1, y1] = g[i + 1], [ax, ay] = nrm[i], [bx, by] = nrm[i + 1];
      const p = (u: number, d: number) => { const nx = ax + (bx - ax) * u, ny = ay + (by - ay) * u; return [v.sx(x0 + (x1 - x0) * u - nx * d), v.sy(y0 + (y1 - y0) * u - ny * d)]; };
      const a = p(u0, d0), b = p(u1, d0), c = p(u1, d1), e = p(u0, d1);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.closePath();
    };
    const depth = (s: Surface) => (s === "sand" ? 0.7 : s === "rough" ? 0.5 : 0.36);
    for (let i = 0; i + 1 < n; i++) {
      const s = surf[i];
      if (s === "rock" || isCup(i)) continue;
      const [x0] = g[i], [x1] = g[i + 1];
      if (x1 < v.left || x0 > v.right || x1 <= x0) continue;
      const [lt, md, dk] = this.turf(s), D = depth(s);
      const fill = (u0: number, u1: number, d0: number, d1: number, color: string) => { ctx.beginPath(); quad(i, u0, u1, d0, d1); ctx.fillStyle = color; ctx.fill(); };
      if (F.id === "cartoon" && s !== "sand") {
        // A band whose lower edge hangs in lobes, a darker lip under it.
        const every = 0.55;
        const lobe = (extra: number, color: string) => {
          ctx.beginPath();
          const steps = Math.max(2, Math.ceil((x1 - x0) / 0.08));
          for (let k = 0; k <= steps; k++) { const u = k / steps; const [a, b] = this.at(i, u, nrm, 0); k ? ctx.lineTo(v.sx(a), v.sy(b)) : ctx.moveTo(v.sx(a), v.sy(b)); }
          for (let k = steps; k >= 0; k--) {
            const u = k / steps, x = x0 + (x1 - x0) * u, w = (((x / every) % 1) + 1) % 1;
            const [a, b] = this.at(i, u, nrm, D * 0.75 + extra + 0.13 * Math.sqrt(Math.max(0, Math.sin(w * Math.PI))));
            ctx.lineTo(v.sx(a), v.sy(b));
          }
          ctx.closePath(); ctx.fillStyle = color; ctx.fill();
        };
        lobe(0.07, mix(dk, L.shade, 0.35));
        lobe(0, md);
      } else if (F.id === "soft") {
        fill(0, 1, -0.02, D + 0.22, rgba(L.shade, 0.35));
        fill(0, 1, -0.02, D + 0.1, rgba(L.shade, 0.3));
        fill(0, 1, -0.02, D, dk);
        fill(0, 1, -0.02, D * 0.75, md);
        fill(0, 1, -0.02, D * 0.3, mix(md, lt, 0.5));
        fill(0, 1, -0.02, 0.06, lt);
      } else {
        fill(0, 1, -0.02, D * 0.8, md);
        if (F.id === "flat") fill(0, 1, -0.02, 0.06, mix(lt, L.light, 0.3));
      }
      // Mown stripes on the short grass, wider on the fairway.
      if (s === "fairway" || s === "green" || s === "tee") {
        const stripe = s === "green" ? 0.9 : 1.8;
        ctx.beginPath();
        for (let x = Math.floor(x0 / stripe / 2) * stripe * 2; x < x1; x += stripe * 2) {
          const u0 = Math.max(0, (x - x0) / (x1 - x0)), u1 = Math.min(1, (x + stripe - x0) / (x1 - x0));
          if (u1 > u0) quad(i, u0, u1, 0.06, D * (F.id === "cartoon" ? 0.72 : 0.7));
        }
        ctx.fillStyle = rgba(L.light, F.id === "flat" ? 0.08 : 0.12); ctx.fill();
      }
      if (s === "sand") {
        ctx.fillStyle = rgba(L.shade, 0.25);
        for (let x = x0; x < x1; x += 0.11) {
          const u = (x - x0) / (x1 - x0), [a, b] = this.at(i, u, nrm, 0.1 + hash(x * 13.1) * D * 0.7);
          ctx.fillRect(v.sx(a), v.sy(b), Math.max(1, v.s * 0.05), Math.max(1, v.s * 0.05));
        }
      }
      if (F.id === "cartoon" || F.id === "soft" || s === "rough") {
        // A fringe of blades along the top: taller in the rough, a few on the short grass.
        const step = s === "rough" ? 0.12 : s === "sand" ? 99 : 0.2;
        ctx.beginPath();
        for (let x = Math.ceil(x0 / step) * step; x < x1; x += step) {
          const u = (x - x0) / (x1 - x0), [a, b] = this.at(i, u, nrm, 0);
          const r = hash(x * 9.1), hh = (s === "rough" ? 0.12 + 0.2 * r : 0.03 + 0.06 * r * r), lean = (hash(x * 3.7) - 0.4) * 0.12;
          ctx.moveTo(v.sx(a - 0.04), v.sy(b - 0.02)); ctx.quadraticCurveTo(v.sx(a), v.sy(b + hh * 0.6), v.sx(a + lean), v.sy(b + hh)); ctx.lineTo(v.sx(a + 0.04), v.sy(b - 0.02));
        }
        ctx.fillStyle = s === "rough" ? (F.id === "flat" ? md : mix(md, lt, 0.4)) : lt;
        ctx.fill();
      }
    }
    // Tee markers either side of where you stand.
    for (const mx of [1.6, 4.4]) put(ctx, this.marker, v.sx(mx), v.sy(5), 0, v.s);
    ctx.restore();
    // What grows on the hole, kept off the tee, the cup and the pond.
    for (let c = Math.floor(v.left / 1.9); c * 1.9 < v.right; c++) {
      if (hash(c * 5.3 + 0.7) < 0.45) continue;
      const x = c * 1.9 + hash(c + 0.2) * 1.2;
      if (x < 7 || x > 94 || (x > 39 && x < 55) || Math.abs(x - cup.x) < 3 || (x > 69 && x < 75.5) || (x > 75.5 && x < 78.5)) continue;
      const k = Math.floor(hash(c * 2.1 + 4) * this.growth.length);
      put(ctx, this.growth[k], v.sx(x), v.sy(groundAt(HOLE, x) - 0.05), 0, v.s * (0.7 + 0.4 * hash(c + 11)));
    }
    // The cup: a dark hole, its white liner just under the lip.
    ctx.fillStyle = mix(L.shade, "#000000", 0.6);
    ctx.fillRect(v.sx(cup.x - cup.w / 2), v.sy(cup.y), cup.w * v.s, cup.d * v.s);
    ctx.fillStyle = mix("#f4efe6", L.light, 0.2);
    ctx.fillRect(v.sx(cup.x - cup.w / 2), v.sy(cup.y - 0.04), cup.w * v.s, Math.max(1.5, 0.1 * v.s));
    // The edge the eye follows, in the cartoon.
    if (F.id === "cartoon") {
      ctx.beginPath();
      for (let i = 0; i < n; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, v.sx(g[i][0]), v.sy(g[i][1]));
      ctx.strokeStyle = F.ink; ctx.lineWidth = Math.max(1.5, F.lw * v.s * 1.2); ctx.lineJoin = "round"; ctx.stroke();
    }
  }

  /** The point `d` under segment i at u along it, along the turf's normals. */
  private at(i: number, u: number, nrm: [number, number][], d: number): [number, number] {
    const g = HOLE.ground, [x0, y0] = g[i], [x1, y1] = g[i + 1], [ax, ay] = nrm[i], [bx, by] = nrm[i + 1];
    const nx = ax + (bx - ax) * u, ny = ay + (by - ay) * u;
    return [x0 + (x1 - x0) * u - nx * d, y0 + (y1 - y0) * u - ny * d];
  }

  /** Sandstone in level bands with wavy edges and a crack or two, across x0..x1 between heights y0 and y1. */
  private sandstone(ctx: CanvasRenderingContext2D, v: View, x0: number, x1: number, y0: number, y1: number) {
    const { L, F } = this;
    ctx.fillStyle = L.rock[2];
    ctx.fillRect(v.sx(x0), v.sy(y1), v.sx(x1) - v.sx(x0), v.sy(y0) - v.sy(y1));
    let k = 0;
    for (let y = y0; y < y1; y += 1.25 + 0.6 * hash(y * 0.7)) {
      const h = 0.35 + 0.5 * hash(y * 1.9 + 2);
      const edge = (yy: number, seed: number) => { const pts: [number, number][] = []; for (let x = Math.floor(x0 / 1.2) * 1.2; x <= x1 + 1.2; x += 1.2) pts.push([x, yy + 0.12 * Math.sin(x * 0.9 + seed) + 0.08 * Math.sin(x * 2.3 + seed * 2)]); return pts; };
      const top = edge(y + h, y), bot = edge(y, y + 3);
      ctx.beginPath();
      top.forEach(([x, yy], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, v.sx(x), v.sy(yy)));
      for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(v.sx(bot[i][0]), v.sy(bot[i][1]));
      ctx.closePath();
      ctx.fillStyle = k++ % 2 ? (F.id === "flat" ? L.rock[2] : L.rock[3]) : L.rock[1];
      ctx.fill();
      if (F.id === "cartoon") {
        ctx.beginPath(); top.forEach(([x, yy], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, v.sx(x), v.sy(yy)));
        ctx.strokeStyle = rgba(L.shade, 0.35); ctx.lineWidth = Math.max(1, v.s * 0.05); ctx.stroke();
      }
    }
    if (F.id !== "flat") {
      ctx.strokeStyle = rgba(L.shade, 0.3); ctx.lineWidth = Math.max(1, v.s * 0.05); ctx.lineCap = "round";
      ctx.beginPath();
      for (let c = Math.floor(x0 / 2.3); c * 2.3 < x1; c++) {
        if (hash(c * 4.1) < 0.4) continue;
        const x = c * 2.3 + hash(c) * 2, y = y0 + hash(c + 1) * (y1 - y0), len = 0.8 + hash(c + 2) * 1.6;
        ctx.moveTo(v.sx(x), v.sy(y)); ctx.lineTo(v.sx(x + 0.15), v.sy(y - len * 0.5)); ctx.lineTo(v.sx(x - 0.05), v.sy(y - len));
      }
      ctx.stroke();
    }
  }

  /** The Needle: sandstone like the mesa, lit down its right side, shaded down its left. */
  needle(ctx: CanvasRenderingContext2D, v: View) {
    const { L, F } = this;
    const path = () => { ctx.beginPath(); NEEDLE.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, v.sx(x), v.sy(y))); ctx.closePath(); };
    if (F.id === "cartoon") { path(); ctx.strokeStyle = F.ink; ctx.lineWidth = Math.max(2, F.lw * v.s * 2.4); ctx.lineJoin = "round"; ctx.stroke(); }
    ctx.save(); path(); ctx.clip();
    this.sandstone(ctx, v, 70, 74, 16, 27);
    ctx.fillStyle = F.id === "flat" ? L.rock[0] : rgba(L.rock[0], 0.75);
    ctx.beginPath(); ctx.moveTo(v.sx(72.7), v.sy(16.8)); ctx.lineTo(v.sx(74), v.sy(16.8)); ctx.lineTo(v.sx(74), v.sy(27)); ctx.lineTo(v.sx(72.2), v.sy(27)); ctx.lineTo(v.sx(72.9), v.sy(22)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(L.shade, F.id === "soft" ? 0.25 : 0.3);
    ctx.beginPath(); ctx.moveTo(v.sx(70), v.sy(16.8)); ctx.lineTo(v.sx(70.95), v.sy(16.8)); ctx.lineTo(v.sx(70.75), v.sy(22)); ctx.lineTo(v.sx(71.3), v.sy(27)); ctx.lineTo(v.sx(70), v.sy(27)); ctx.closePath(); ctx.fill();
    if (F.id === "soft") {
      const gr = ctx.createLinearGradient(0, v.sy(16.8), 0, v.sy(18.4));
      gr.addColorStop(0, rgba(L.shade, 0.45)); gr.addColorStop(1, rgba(L.shade, 0));
      ctx.fillStyle = gr; ctx.fillRect(v.sx(70), v.sy(18.4), v.sx(74) - v.sx(70), v.sy(16.8) - v.sy(18.4));
    }
    ctx.restore();
  }

  /** The far side of the arch, behind the ball as it goes through. */
  archBack(ctx: CanvasRenderingContext2D, v: View) {
    ctx.fillStyle = mix(this.L.rock[3], this.L.shade, 0.35);
    ctx.beginPath();
    ctx.moveTo(v.sx(70.2), v.sy(14)); ctx.lineTo(v.sx(70.2), v.sy(17.4)); ctx.lineTo(v.sx(73.8), v.sy(17.4)); ctx.lineTo(v.sx(73.8), v.sy(14));
    ctx.lineTo(v.sx(73.2), v.sy(14)); ctx.quadraticCurveTo(v.sx(73.1), v.sy(16.4), v.sx(71.9), v.sy(16.5)); ctx.quadraticCurveTo(v.sx(70.8), v.sy(16.4), v.sx(70.8), v.sy(14));
    ctx.closePath(); ctx.fill();
  }

  // ---- the pond ---------------------------------------------------------------------------------------------------

  water(ctx: CanvasRenderingContext2D, v: View, t: number) {
    const { F, L } = this;
    const [hi, lo] = this.flat.water;
    for (const w of HOLE.water) {
      const xl = 40.25, xr = 53.75, top = w.y1;
      const surface = () => { for (let x = xl; x <= xr + 0.01; x += 0.4) ctx.lineTo(v.sx(x), v.sy(top + 0.05 * Math.sin(x * 1.3 + t * 2) + 0.03 * Math.sin(x * 3.1 - t * 2.6))); };
      ctx.beginPath(); ctx.moveTo(v.sx(xl), v.sy(w.y0)); surface(); ctx.lineTo(v.sx(xr), v.sy(w.y0)); ctx.closePath();
      if (F.id === "flat") ctx.fillStyle = lo;
      else { const gr = ctx.createLinearGradient(0, v.sy(top), 0, v.sy(w.y0)); gr.addColorStop(0, hi); gr.addColorStop(1, mix(lo, L.shade, F.id === "soft" ? 0.35 : 0.2)); ctx.fillStyle = gr; }
      ctx.globalAlpha = F.id === "soft" ? 0.94 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      // The sky's light on the top of the water: a band, its edge moving with the ripples.
      ctx.save();
      ctx.beginPath(); ctx.moveTo(v.sx(xl), v.sy(top - 0.35)); surface(); ctx.lineTo(v.sx(xr), v.sy(top - 0.35)); ctx.closePath();
      ctx.fillStyle = F.id === "flat" ? hi : rgba(mix(hi, L.light, 0.4), 0.7);
      ctx.fill();
      ctx.restore();
      if (F.id !== "flat") {
        ctx.beginPath(); ctx.moveTo(v.sx(xl), v.sy(top)); surface();
        ctx.strokeStyle = F.id === "cartoon" ? F.ink : rgba(L.light, 0.8); ctx.lineWidth = Math.max(1.2, v.s * (F.id === "cartoon" ? 0.06 : 0.05)); ctx.stroke();
      }
      // Glints drifting across.
      ctx.fillStyle = rgba(L.light, F.id === "flat" ? 0.4 : 0.55);
      for (let i = 0; i < 7; i++) {
        const x = xl + 0.8 + ((hash(i) * 11 + t * (0.3 + hash(i + 3) * 0.4)) % 11.8), y = top - 0.6 - hash(i + 5) * 1.6, len = 0.4 + 0.8 * hash(i + 8);
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 2);
        ctx.beginPath(); ctx.roundRect(v.sx(x), v.sy(y), (Math.min(xr - 0.3, x + len) - x) * v.s, Math.max(1.2, v.s * 0.06), 1); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- the flag ---------------------------------------------------------------------------------------------------

  flag(ctx: CanvasRenderingContext2D, v: View, t: number, up: number, color: string) {
    const { F, L } = this;
    const c = HOLE.cup, x = v.sx(c.x), base = v.sy(c.y - 0.1), top = v.sy(c.y + 2.6), s = v.s;
    const pw = Math.max(2.2, 0.08 * s);
    if (F.id === "cartoon") { ctx.strokeStyle = F.ink; ctx.lineWidth = pw + 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, top - 1); ctx.stroke(); }
    ctx.lineCap = "butt";
    // The pole: white, edged dark where there is no outline, so it stands out on a pale sky too.
    if (F.id !== "cartoon") { ctx.strokeStyle = rgba(L.ink, F.id === "flat" ? 0.9 : 0.55); ctx.lineWidth = pw + 1.6; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, top); ctx.stroke(); }
    ctx.strokeStyle = mix("#f4efe6", L.light, 0.2); ctx.lineWidth = pw;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, top); ctx.stroke();
    if (F.id !== "flat") { ctx.strokeStyle = rgba(L.shade, 0.35); ctx.lineWidth = pw * 0.4; ctx.beginPath(); ctx.moveTo(x - pw * 0.3, base); ctx.lineTo(x - pw * 0.3, top); ctx.stroke(); }
    ctx.fillStyle = mix("#f4efe6", L.light, 0.2); ctx.beginPath(); ctx.arc(x, top, pw * 0.75, 0, Math.PI * 2); ctx.fill();
    // The pennant waves; after a hole it rises and flutters harder. Its folds are a gradient that runs with the wave.
    const len = 1.15 * s, hgt = 0.66 * s, n = 10, speed = 5 + 6 * up, amp = (0.12 + 0.12 * up) * s;
    const wave = (u: number) => Math.sin(t * speed - u * 4) * u * amp;
    ctx.beginPath();
    ctx.moveTo(x, top);
    for (let i = 0; i <= n; i++) { const u = i / n; ctx.lineTo(x + u * len, top + (hgt / 2) * u + wave(u)); }
    for (let i = n; i >= 0; i--) { const u = i / n; ctx.lineTo(x + u * len, top + hgt - (hgt / 2) * u + wave(u)); }
    ctx.closePath();
    if (F.id === "cartoon") { ctx.strokeStyle = F.ink; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.stroke(); }
    const gr = ctx.createLinearGradient(x, 0, x + len, 0);
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, k = Math.cos(t * speed - u * 4) * u;
      gr.addColorStop(u, k > 0 ? mix(color, L.light, F.id === "flat" ? 0.12 * Math.sign(k) : 0.25 * k) : mix(color, L.shade, F.id === "flat" ? 0.18 : 0.35 * -k));
    }
    ctx.fillStyle = gr;
    ctx.fill();
  }

  // ---- the ball ---------------------------------------------------------------------------------------------------

  private drawBall(g: CanvasRenderingContext2D) {
    const { F } = this;
    const white = mix("#ffffff", this.L.light, 0.15);
    finish(g, new Shape().circle(0, 0, 0.25), F, { base: white, lit: "#ffffff", shade: mix(white, this.L.shade, 0.32) }, { cel: 0.07, rim: 0.04, gloss: 0.8, lw: 0.9 });
    if (F.id !== "flat") {
      g.fillStyle = rgba(this.L.shade, 0.12);
      for (const [x, y] of [[-0.1, 0.05], [0.0, -0.08], [0.08, 0.02], [-0.06, -0.14], [0.12, -0.1], [-0.15, -0.04]]) { g.beginPath(); g.arc(x, y, 0.025, 0, Math.PI * 2); g.fill(); }
    }
    if (F.id === "flat") { g.strokeStyle = rgba(this.L.shade, 0.6); g.lineWidth = 0.03; g.beginPath(); g.arc(0, 0, 0.24, 0, Math.PI * 2); g.stroke(); }
  }

  /** The ball, `r` pixels across, with a mark that turns with it so its spin shows. */
  ballAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number) {
    put(ctx, this.ball, x, y, 0, r / 0.25 / (this.F.id === "cartoon" ? 1.08 : 1));
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = rgba(this.L.shade, 0.35); ctx.lineWidth = Math.max(1, r * 0.22); ctx.lineCap = "round";
    const a = -angle;
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, a - 0.5, a + 0.5); ctx.stroke();
    ctx.restore();
  }

  // ---- the golfer -------------------------------------------------------------------------------------------------
  // Face on, as golf is drawn side on: feet apart, the ball by the front foot, the arms and the club one lever
  // swung round the shoulders. Drawn for facing right; facing left is the mirror.

  private skin = "#eab38e";
  private drawLegs(g: CanvasRenderingContext2D) {
    const { F, flat } = this;
    const tr = this.tone(flat.trousers, 0.3, 0.35);
    finish(g, new Shape().tube(-0.09, 0.84, -0.17, 0.46, 0.15).tube(-0.17, 0.46, -0.2, 0.1, 0.13).tube(0.09, 0.84, 0.16, 0.46, 0.15).tube(0.16, 0.46, 0.19, 0.1, 0.13).rect(-0.16, 0.7, 0.32, 0.2, 0.06), F, tr, { cel: 0.05, rim: 0.02 });
    const shoe = this.tone(mix("#f4efe6", flat.light, 0.1), 0.2, 0.3);
    finish(g, new Shape().rect(-0.32, 0.0, 0.22, 0.1, 0.05).rect(0.12, 0.0, 0.22, 0.1, 0.05), F, shoe, { cel: 0.03, rim: 0.015 });
  }
  private drawTorso(g: CanvasRenderingContext2D) {
    const { F, flat } = this;
    // Hips at the origin: a polo shirt, broad at the shoulders, a collar.
    const s = new Shape().m(-0.17, -0.02).q(-0.21, 0.3, -0.23, 0.5).q(-0.24, 0.6, -0.14, 0.62).l(0.14, 0.62).q(0.24, 0.6, 0.23, 0.5).q(0.21, 0.3, 0.17, -0.02).z();
    // Short sleeves, round over the shoulders.
    s.circle(-0.2, 0.52, 0.085).circle(0.2, 0.52, 0.085);
    finish(g, s, F, this.tone(flat.shirt, 0.3, 0.38), { cel: 0.08, rim: 0.03 });
    g.fillStyle = mix(flat.shirt, "#ffffff", 0.55);
    g.beginPath(); g.moveTo(-0.08, 0.62); g.lineTo(0, 0.52); g.lineTo(0.08, 0.62); g.closePath(); g.fill();
    g.fillStyle = rgba(this.L.shade, 0.3); g.fillRect(-0.17, 0.0, 0.34, 0.05);
  }
  private drawHead(g: CanvasRenderingContext2D) {
    const { F, flat } = this;
    finish(g, new Shape().tube(0, -0.2, 0, -0.08, 0.09), F, this.tone(this.skin, 0.2, 0.3), { cel: 0.02, rim: 0.01 });
    finish(g, new Shape().circle(0, 0, 0.15), F, this.tone(this.skin, 0.25, 0.3), { cel: 0.05, rim: 0.025 });
    // A cap, its peak out toward the ball.
    const cap = new Shape().m(-0.155, 0.02).q(-0.16, 0.17, 0, 0.17).q(0.16, 0.17, 0.155, 0.02).z();
    finish(g, cap, F, this.tone(mix(flat.shirt, "#ffffff", 0.75), 0.25, 0.3), { cel: 0.04, rim: 0.02 });
    finish(g, new Shape().rect(0.05, 0.0, 0.17, 0.05, 0.025), F, this.tone(flat.shirt, 0.25, 0.3), { cel: 0.015, rim: 0.01 });
    g.fillStyle = mix(this.skin, this.L.shade, 0.6);
    g.beginPath(); g.arc(0.06, -0.04, 0.018, 0, Math.PI * 2); g.fill();
  }
  private drawArms(g: CanvasRenderingContext2D) {
    const { F, flat } = this;
    // From the shoulders (origin) down to the hands on the grip, 0.6 below.
    finish(g, new Shape().tube(-0.15, -0.03, -0.02, -0.56, 0.1).tube(0.15, -0.03, 0.02, -0.56, 0.1), F, this.tone(this.skin, 0.25, 0.3), { cel: 0.03, rim: 0.015 });
    finish(g, new Shape().circle(0, -0.6, 0.065), F, this.tone(mix("#f4efe6", flat.light, 0.1), 0.2, 0.3), { cel: 0.02, rim: 0.01 });
  }
  private drawClub(g: CanvasRenderingContext2D) {
    const { F } = this;
    // From the grip (origin) down the shaft to the head.
    const grip = this.tone("#2a2a2e", 0.25, 0.2), steel = this.tone("#c9ced6", 0.4, 0.4);
    finish(g, new Shape().tube(0, 0.04, 0, -0.84, 0.035), F, steel, { cel: 0.01, rim: 0.006, lw: 0.6 });
    finish(g, new Shape().tube(0, 0.06, 0, -0.18, 0.05), F, grip, { cel: 0.01, rim: 0.01, lw: 0.6 });
    finish(g, new Shape().m(-0.03, -0.8).l(0.16, -0.86).q(0.2, -0.88, 0.18, -0.93).l(-0.02, -0.93).q(-0.05, -0.9, -0.03, -0.8).z(), F, steel, { cel: 0.03, rim: 0.015, lw: 0.6 });
  }

  /** The arms' swing for this moment (radians, 0 down to the ball, positive back), and the club's cock against them. */
  static swing(gf: Golfer): { arm: number; cock: number } {
    const back = (p: number) => 0.15 + p * 2.45;
    if (gf.since < 0) {
      const a = gf.charging || gf.power > 0 ? back(gf.power) : 0.04 * Math.sin(gf.t * 1.7);
      return { arm: a, cock: Math.min(1, Math.max(0, a / 1.7)) * 1.9 };
    }
    // The downswing to the ball in a blink, through it, and a held finish; a putt's finish mirrors its short backswing.
    const from = back(gf.hitPower), to = -Math.max(0.5, Math.min(2.5, from * 1.05));
    const t = gf.since;
    let a: number;
    if (t < 0.08) { const u = t / 0.08; a = from * (1 - u * u); }
    else if (t < 0.4) { const u = (t - 0.08) / 0.32; a = to * (1 - (1 - u) * (1 - u)); }
    else a = to + (t > 1.6 ? Math.min(1, (t - 1.6) / 0.6) * 0.35 * -to * 0.5 : 0);
    const cock = a > 0 ? Math.min(1, a / 1.7) * 1.9 : -Math.min(1, -a / 1.8) * 1.3;
    return { arm: a, cock };
  }

  golfer(ctx: CanvasRenderingContext2D, v: View, gf: Golfer) {
    if (gf.alpha <= 0) return;
    const { arm, cock } = Fore.swing(gf);
    const gx = gf.x - gf.facing * 0.27 * G, gy = Math.max(groundAt(HOLE, gx), groundAt(HOLE, gf.x) - 0.25);
    const k = v.s * G;
    ctx.save();
    ctx.globalAlpha = gf.alpha;
    ctx.translate(v.sx(gx), v.sy(gy));
    ctx.scale(gf.facing, 1);
    // Local metres from the feet, y up, as the sprites are.
    const at = (x: number, y: number) => [x * k, -y * k] as const;
    const hips = 0.86, tilt = -arm * 0.07 - 0.04;
    const sh = [-Math.sin(tilt) * 0.55, hips + Math.cos(tilt) * 0.55];
    // Club angle (y-up, counter-clockwise): the arms' angle and the cock; at address it runs out to the ball.
    const armA = -arm, clubA = armA + 0.33 - cock;
    const hx = sh[0] + Math.sin(armA) * 0.6, hy = sh[1] - Math.cos(armA) * 0.6;
    const behind = Math.abs(arm) > 1.35;
    const clubAt = () => put(ctx, this.club, ...at(hx, hy), clubA, k);
    if (behind) clubAt();
    put(ctx, this.legs, ...at(0, 0), 0, k);
    put(ctx, this.torso, ...at(0, hips - 0.02), tilt, k);
    if (!behind) clubAt();
    put(ctx, this.arms, ...at(sh[0], sh[1]), armA, k);
    put(ctx, this.head, ...at(sh[0] * 1.15 + 0.03, sh[1] + 0.2), tilt * 0.5, k);
    ctx.restore();
  }

  // ---- what grows on the hole -------------------------------------------------------------------------------------

  private drawStone(g: CanvasRenderingContext2D, i: number) {
    const L = this.L;
    const w = [0.34, 0.24, 0.18][i], h = [0.2, 0.17, 0.12][i];
    const s = new Shape().m(-w, -h * 0.3).q(-w, h, -w * 0.1, h).q(w * 0.9, h * 1.05, w, -h * 0.1).q(w * 0.8, -h, 0, -h).q(-w * 0.9, -h, -w, -h * 0.3).z();
    const base = mix(L.soil[0], L.rock[1], 0.5);
    finish(g, s, this.F, { base, lit: mix(base, L.light, 0.25), shade: mix(L.soil[1], L.shade, 0.2) }, { cel: h * 0.5, rim: 0.03 });
  }

  private drawGrowth(g: CanvasRenderingContext2D, kind: string) {
    const { F, L, flat } = this;
    const green = flat.surface.rough;
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
    };
    if (kind === "tuft") blades(7, 0.4, 0.32, this.tone(green, 0.35, 0.35));
    else if (kind === "rock") { rock(0.4, 0.32, L.rock[2]); g.translate(0.44, 0); rock(0.17, 0.14, L.rock[1]); }
    else if (kind === "rock2") rock(0.3, 0.4, mix(L.rock[2], L.rock[1], 0.4));
    else if (kind === "shrub") {
      const s = new Shape().circle(-0.22, 0.18, 0.2).circle(0.04, 0.28, 0.25).circle(0.28, 0.16, 0.18).rect(-0.42, -0.05, 0.86, 0.22, 0.05);
      finish(g, s, F, this.tone(mix(green, "#9a9a6a", 0.45), 0.3, 0.35), { cel: 0.1, rim: 0.035 });
    } else if (kind === "cactus") {
      const s = new Shape().tube(0, -0.05, 0, 0.82, 0.2).tube(-0.26, 0.3, -0.26, 0.58, 0.13).tube(-0.26, 0.3, -0.05, 0.3, 0.13).tube(0.24, 0.42, 0.24, 0.66, 0.12).tube(0.24, 0.42, 0.05, 0.42, 0.12);
      finish(g, s, F, this.tone(mix("#6f8a52", green, 0.3), 0.3, 0.38), { cel: 0.06, rim: 0.025 });
    } else if (kind === "pine") {
      const s = new Shape();
      for (let t = 0; t < 3; t++) { const y0 = 0.15 + t * 0.3, w = 0.42 - t * 0.1; s.m(-w, y0).l(0, y0 + 0.55).l(w, y0).q(0, y0 + 0.06, -w, y0).z(); }
      s.rect(-0.05, -0.05, 0.1, 0.25);
      finish(g, s, F, this.tone(mix(green, flat.rock, 0.35), 0.3, 0.4), { cel: 0.12, rim: 0.035 });
    } else if (kind === "flowers") {
      blades(5, 0.28, 0.3, this.tone(green, 0.35, 0.35));
      for (const [x, y, c] of [[-0.12, 0.4, "#f6f1e4"], [0.06, 0.5, "#f4c64a"], [0.2, 0.36, "#e98aa0"]] as [number, number, string][]) {
        g.strokeStyle = green; g.lineWidth = 0.025; g.beginPath(); g.moveTo(x * 0.5, 0); g.lineTo(x, y); g.stroke();
        const fl = new Shape();
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; fl.circle(x + Math.cos(a) * 0.045, y + Math.sin(a) * 0.045, 0.04); }
        finish(g, fl, F, this.tone(c, 0.3, 0.25), { cel: 0.02, rim: 0.01, soft: 0.01, lw: 0.5 });
      }
    }
  }
}
