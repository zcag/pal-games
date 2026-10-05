// Sprites built in code at boot (art.md 2, pass 4): a tiny painter with albedo, emissive and normal/flag
// layers, a shelf-packed atlas, and the world's object sprites (boulders, pickups, crates, charges, the
// drone, the Lift cage, the Seed). The pod lives in pod.ts and the town in town.ts.
import { hex, type RGB } from "./look.ts";
import { GF } from "./terrain.ts";

export type Col = string | RGB;
const rgb = (c: Col): RGB => (typeof c === "string" ? hex(c) : c);

/** Emissive groups (the sprite shader scales them): always, night only, per instance, night windows that flick. */
export const GRP = { ALWAYS: 0, NIGHT: 1, INST: 2, WINDOW: 3 } as const;

export interface PxOpt { e?: number; ec?: Col; grp?: number; flags?: number; n?: [number, number]; id?: number }

export class Pix {
  readonly alb: Uint8Array; readonly emi: Uint8Array; readonly nrm: Uint8Array;
  private hasN: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.alb = new Uint8Array(w * h * 4); this.emi = new Uint8Array(w * h * 4); this.nrm = new Uint8Array(w * h * 4); this.hasN = new Uint8Array(w * h);
  }
  in(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  a(x: number, y: number) { return this.in(x, y) ? this.alb[(y * this.w + x) * 4 + 3] : 0; }
  set(x: number, y: number, c: Col, o?: PxOpt) {
    x = Math.round(x); y = Math.round(y);
    if (!this.in(x, y)) return;
    const i = (y * this.w + x) * 4, v = rgb(c);
    this.alb[i] = v[0] * 255; this.alb[i + 1] = v[1] * 255; this.alb[i + 2] = v[2] * 255; this.alb[i + 3] = o?.id !== undefined ? 128 + (o.id & 127) : 255;
    if (o?.e) { const ec = rgb(o.ec ?? c); this.emi[i] = ec[0] * 255; this.emi[i + 1] = ec[1] * 255; this.emi[i + 2] = ec[2] * 255; this.emi[i + 3] = Math.min(255, Math.round(o.e / 8 * 255)); }
    else this.emi.fill(0, i, i + 4);
    this.nrm[i + 2] = o?.grp ?? 0; this.nrm[i + 3] = o?.flags ?? 0;
    if (o?.n) { this.nrm[i] = (o.n[0] * 0.5 + 0.5) * 255; this.nrm[i + 1] = (o.n[1] * 0.5 + 0.5) * 255; this.hasN[y * this.w + x] = 1; }
  }
  /** Palette-index pixel for palette-mapped sprites (index in red). */
  idx(x: number, y: number, k: number) { x = Math.round(x); y = Math.round(y); if (!this.in(x, y)) return; const i = (y * this.w + x) * 4; this.alb[i] = k; this.alb[i + 1] = 0; this.alb[i + 2] = 0; this.alb[i + 3] = 255; }
  rect(x: number, y: number, w: number, h: number, c: Col, o?: PxOpt) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, o); }
  line(x0: number, y0: number, x1: number, y1: number, c: Col, o?: PxOpt) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c, o);
  }
  disc(cx: number, cy: number, r: number, f: (dx: number, dy: number, d: number) => Col | null, o?: PxOpt) {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
      if (d <= r) { const c = f(dx, dy, d); if (c) this.set(x, y, c, o); }
    }
  }
  /** 1 px dark outline round everything drawn (objects, art.md 6.2); never lit. */
  outline(c: Col = "#0b0d12", diag = false) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.a(x, y)) continue;
      if (this.a(x - 1, y) || this.a(x + 1, y) || this.a(x, y - 1) || this.a(x, y + 1) || (diag && (this.a(x - 1, y - 1) || this.a(x + 1, y + 1) || this.a(x + 1, y - 1) || this.a(x - 1, y + 1)))) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], c, { flags: GF.UNLIT });
  }
  /** A faint light rim outside the dark outline, self-lit, so a sprite reads on black rock and on white-hot lava alike. */
  rim(c: Col = "#9aa8c4", e = 0.35) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.a(x, y)) continue;
      if (this.a(x - 1, y) || this.a(x + 1, y) || this.a(x, y - 1) || this.a(x, y + 1)) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], c, { flags: GF.UNLIT, e });
  }
  /** Normals for every pixel without an explicit one: a bevel of the silhouette (art.md 5.1). */
  bevel(depth = 3) {
    const { w, h } = this;
    const dist = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!this.a(x, y)) continue;
      let d = depth;
      for (let r = 1; r <= depth && d === depth; r++) for (let j = -r; j <= r && d === depth; j++) for (let i = -r; i <= r; i++) if (!this.a(x + i, y + j)) { d = Math.min(d, r - 1); break; }
      dist[y * w + x] = d;
    }
    const D = (x: number, y: number) => (this.in(x, y) && this.a(x, y) ? dist[y * w + x] : 0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!this.a(x, y) || this.hasN[y * w + x]) continue;
      let nx = (D(x - 1, y) - D(x + 1, y)) / depth, ny = (D(x, y - 1) - D(x, y + 1)) / depth;
      const l = Math.hypot(nx, ny); if (l > 0.8) { nx *= 0.8 / l; ny *= 0.8 / l; }
      const i = (y * w + x) * 4;
      this.nrm[i] = (nx * 0.5 + 0.5) * 255; this.nrm[i + 1] = (ny * 0.5 + 0.5) * 255;
    }
  }
  /** Copy another Pix in at (ox, oy). */
  blit(p: Pix, ox: number, oy: number) {
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const si = (y * p.w + x) * 4;
      if (!p.alb[si + 3] || !this.in(x + ox, y + oy)) continue;
      const di = ((y + oy) * this.w + x + ox) * 4;
      for (let k = 0; k < 4; k++) { this.alb[di + k] = p.alb[si + k]; this.emi[di + k] = p.emi[si + k]; this.nrm[di + k] = p.nrm[si + k]; }
      this.hasN[(y + oy) * this.w + x + ox] = 1;
    }
  }
}

export interface Region { x: number; y: number; w: number; h: number }

/** Shelf-packed RGBA8 x3 atlas. */
export class Atlas {
  readonly size = 1024;
  readonly alb = new Uint8Array(this.size * this.size * 4);
  readonly emi = new Uint8Array(this.size * this.size * 4);
  readonly nrm = new Uint8Array(this.size * this.size * 4);
  private sx = 0; private sy = 0; private sh = 0;
  dirty = true;
  /** Fixed-size slots re-used for sprites rebuilt at runtime (the pod on an upgrade). */
  private slots = new Map<string, Region>();
  alloc(w: number, h: number): Region {
    if (this.sx + w + 1 > this.size) { this.sx = 0; this.sy += this.sh + 1; this.sh = 0; }
    const r = { x: this.sx, y: this.sy, w, h };
    this.sx += w + 1; this.sh = Math.max(this.sh, h);
    if (this.sy + h > this.size) throw new Error("sprite atlas full");
    return r;
  }
  add(p: Pix, slot?: string): Region {
    let r = slot ? this.slots.get(slot) : undefined;
    if (!r || r.w !== p.w || r.h !== p.h) { r = this.alloc(p.w, p.h); if (slot) this.slots.set(slot, r); }
    for (let y = 0; y < p.h; y++) {
      const si = y * p.w * 4, di = ((r.y + y) * this.size + r.x) * 4;
      this.alb.set(p.alb.subarray(si, si + p.w * 4), di);
      this.emi.set(p.emi.subarray(si, si + p.w * 4), di);
      this.nrm.set(p.nrm.subarray(si, si + p.w * 4), di);
    }
    this.dirty = true;
    return r;
  }
}

/** A drawable: an atlas region plus where its anchor sits inside it (art px). */
export interface Spr { r: Region; ox: number; oy: number }
export const spr = (atlas: Atlas, p: Pix, ox = 0, oy = 0, slot?: string): Spr => ({ r: atlas.add(p, slot), ox, oy });

// ---------------------------------------------------------------- object sprites

export interface ObjectSprites {
  boulder: Spr[]; nugget: Spr[]; crate: Spr; beacon: Spr; dynamite: Spr; bigCharge: Spr; drone: Spr;
  cage: Spr; cable: Spr; seed: Spr[]; cradle: Spr; podFrame: Spr; spark: Spr;
}

/** Boulders and nuggets are palette-mapped: index 0..3 = the material's (or find's) palette, 8 = outline. */
export function buildObjects(atlas: Atlas): ObjectSprites {
  // Boulder: 14 px round rock, 2 px dark ring, a crack, 1 px drop shadow (art.md 3.6). Two looks.
  const boulder = [0, 1].map((v) => {
    const p = new Pix(16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 7.5, d = Math.hypot(dx, dy * 1.05);
      if (d > 7) continue;
      let k = d > 5.6 ? 0 : (dx + dy < -3 ? 3 : dx + dy < 2 ? 2 : 1);
      if (v && ((x * 7 + y * 3) % 11 === 0)) k = Math.max(0, k - 1);
      p.idx(x, y, k);
    }
    for (let i = 0; i < 5; i++) p.idx(6 + i - (i > 2 ? 1 : 0), 4 + i + v, 0);
    for (let x = 4; x < 12; x++) if (!p.a(x, 15)) p.idx(x, 15, 8);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (!p.a(x, y) && (p.a(x - 1, y) || p.a(x + 1, y) || p.a(x, y - 1))) p.idx(x, y, 8);
    p.bevel(3);
    return spr(atlas, p, 8, 8);
  });
  // Loose pieces: 7x7 class-ish icons, palette-mapped to the find (0 base, 1 light, 2 glint, 8 outline).
  const icons = ["..##...", ".#++#..", "#+++##.", "#++###.", ".####..", "..##...", "......."];
  const nug = new Pix(7, 7);
  icons.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") nug.idx(x, y, 0); if (ch === "+") nug.idx(x, y, 1); }));
  nug.idx(2, 2, 2);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (!nug.a(x, y) && (nug.a(x - 1, y) || nug.a(x + 1, y) || nug.a(x, y - 1) || nug.a(x, y + 1))) nug.idx(x, y, 8);
  nug.bevel(2);
  const nugget = [spr(atlas, nug, 3, 3)];
  // Wreck crate 14x12 with a beacon (art.md 8.1).
  const cr = new Pix(16, 16);
  cr.rect(1, 3, 14, 12, "#4a4e58"); cr.rect(1, 3, 14, 1, "#7a808c"); cr.rect(1, 3, 1, 12, "#6a707c");
  cr.rect(1, 8, 14, 1, "#2e3038"); cr.line(2, 4, 14, 14, "#3a3e48"); cr.rect(6, 1, 4, 2, "#2a2c34");
  cr.outline(); cr.bevel(2);
  const crate = spr(atlas, cr, 8, 15);
  const bc = new Pix(2, 2); bc.rect(0, 0, 2, 2, "#ffb35c", { e: 1.3, grp: GRP.INST });
  const beacon = spr(atlas, bc, 1, 1);
  // Dynamite stick and the big charge, each with a fuse spark that the instance lights.
  const dy = new Pix(6, 10); dy.rect(1, 3, 4, 7, "#c8302a"); dy.rect(1, 3, 1, 7, "#ff6a5a"); dy.rect(1, 6, 4, 1, "#e8d8a0"); dy.set(3, 2, "#3a3030"); dy.set(3, 1, "#3a3030"); dy.set(4, 0, "#ffd870", { e: 3, grp: GRP.INST }); dy.outline(); dy.bevel(2);
  const dynamite = spr(atlas, dy, 3, 9);
  const bg = new Pix(12, 12); bg.disc(6, 7, 4.6, (dx, dyy) => (dx + dyy < -2 ? "#5a5e6a" : "#3a3e48")); bg.rect(4, 6, 4, 2, "#ffd870"); bg.set(6, 1, "#3a3030"); bg.set(7, 0, "#ffd870", { e: 3, grp: GRP.INST }); bg.outline(); bg.bevel(3);
  const bigCharge = spr(atlas, bg, 6, 11);
  // Helper drone 5x4 with a 1 px lamp.
  const dr = new Pix(7, 6); dr.rect(1, 1, 5, 3, "#5a5e6a"); dr.rect(1, 1, 5, 1, "#9aa2b4"); dr.set(5, 2, "#e8fbff", { e: 2.5 }); dr.set(2, 4, "#5ad88a", { e: 1.0 }); dr.set(4, 4, "#5ad88a", { e: 1.0 }); dr.set(0, 0, "#9aa2b4"); dr.set(6, 0, "#9aa2b4"); dr.outline(); dr.bevel(2);
  const drone = spr(atlas, dr, 3, 3);
  // Lift cage 16x16: roof beam with a sheave, side bars, a cross brace (art.md 7.4).
  const cg = new Pix(18, 18);
  const steel = "#9aa4b4", dark = "#5a6272";
  cg.rect(1, 1, 16, 2, steel); cg.rect(1, 1, 16, 1, "#c8d0dc"); cg.disc(9, 1.5, 1.6, () => "#c8ccd2");
  cg.rect(1, 3, 2, 14, steel); cg.rect(15, 3, 2, 14, dark); cg.rect(1, 3, 1, 14, "#c8d0dc");
  cg.line(3, 4, 14, 15, "#4a5262"); cg.line(14, 4, 3, 15, "#4a5262");
  cg.rect(1, 16, 16, 1, steel);
  cg.outline(); cg.bevel(1);
  const cage = spr(atlas, cg, 9, 9);
  const cb = new Pix(1, 1); cb.set(0, 0, "#c8ccd2");
  const cable = spr(atlas, cb, 0, 0);
  // The Seed (review #7): hand-built at ~5 tiles radius. A husk of overlapping plates, glowing cracks between them
  // onto a hot core, a bright rim inside a dark outline, roots into the cradle; 4 frames of a slow pulse.
  const seed = buildSeed(atlas);
  // The Sower cradle under it, and the frame of an old pod beside A19.
  const cd = new Pix(80, 14);
  for (let x = 0; x < 80; x++) { const k = Math.abs(x - 40) / 40; const top = Math.round(k * k * 9); for (let y = top; y < 14; y++) cd.set(x, y, y === top ? "#b4ac98" : (x % 8 === 0 ? "#5a5244" : "#8a8270")); }
  cd.rect(30, 11, 20, 1, "#e0c040"); cd.outline(); cd.bevel(2);
  const cradle = spr(atlas, cd, 40, 0);
  const pf = new Pix(16, 14); pf.rect(0, 3, 12, 8, "#3a3634"); pf.rect(2, 0, 6, 3, "#2a2c34"); pf.rect(1, 11, 11, 2, "#2a2c34"); pf.set(13, 7, "#4a4440"); pf.set(12, 6, "#4a4440");
  for (let y = 4; y < 10; y++) for (let x = 1; x < 11; x++) if ((x + y) % 3) pf.alb[(y * pf.w + x) * 4 + 3] = 0;
  pf.outline(); pf.bevel(1);
  const podFrame = spr(atlas, pf, 8, 13);
  const sp = new Pix(1, 1); sp.set(0, 0, "#ffffff", { e: 2 });
  const spark = spr(atlas, sp, 0, 0);
  return { boulder, nugget, crate, beacon, dynamite, bigCharge, drone, cage, cable, seed, cradle, podFrame, spark };
}

function buildSeed(atlas: Atlas): Spr[] {
  // An irregular bulb, pointed at the top like a seed: a translucent dark shell, an embryo of light inside
  // that swells with the pulse, veins from it to the shell, a lit rim, and roots that grip the cradle and
  // reach sideways toward the chamber walls. Sized to fit a 12-tile 720 view with headroom (review 2 #7).
  const R = 52, W = 260, Hh = 180, cx = W / 2, cy = 90;
  const radius = (a: number) => R * (1 + 0.07 * Math.sin(3 * a + 1.1) + 0.04 * Math.sin(5 * a + 0.3));
  const frames: Spr[] = [];
  for (let f = 0; f < 4; f++) {
    const pulse = [0.0, 0.5, 1.0, 0.5][f];
    const p = new Pix(W, Hh);
    // roots: down into the cradle and out to both walls, tapering, a lit seam every few px
    const roots: [number, number, number][] = [[-0.5, 1.0, 70], [0.0, 1.0, 80], [0.5, 1.0, 70], [-1.0, 0.35, 120], [1.0, 0.35, 120], [-1.0, 0.0, 115], [1.0, 0.05, 110], [-0.25, 1.0, 75], [0.3, 1.0, 85]];
    roots.forEach(([dx, dy, len], k) => {
      let x = cx + dx * R * 0.6, y = cy + R * 0.55 + (dy < 0.5 ? -10 : 0);
      let vx = dx, vy = dy;
      for (let j = 0; j < len; j++) {
        vx += Math.sin(j * 0.13 + k * 2.1) * 0.08; vy += 0.012;
        const l = Math.hypot(vx, vy); vx /= l; vy /= l;
        x += vx; y += vy;
        const wd = Math.max(1, Math.round(4 * (1 - j / len)));
        for (let d = 0; d < wd; d++) {
          const seam = (j + k * 5) % 9 === 0;
          if (!p.a(Math.round(x), Math.round(y + d))) p.set(x, y + d, seam ? "#ffcf80" : d === 0 ? "#5a3422" : "#2e1a12", seam ? { e: 0.8 + pulse, grp: GRP.INST } : { n: [0, -0.4] });
        }
      }
    });
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      // a bulb drawn up to a blunt point at the top, slightly lopsided
      const a = Math.atan2(dy, dx), rr = Math.hypot(dx, dy);
      const up = Math.max(0, -Math.sin(a));
      const Ra = radius(a) * (1 + 0.42 * Math.pow(up, 5) - 0.06 * Math.pow(Math.max(0, Math.sin(a)), 2));
      const inTip = false;
      if (rr > Ra) continue;
      const k = Math.min(1, rr / Ra), nz = Math.sqrt(Math.max(0, 1 - k * k));
      if (k > 0.965 || (inTip && rr > Ra * 0.95)) { p.set(x, y, "#1a0c08", { flags: GF.UNLIT }); continue; }
      const lit = Math.max(0, -0.55 * (dx / Ra) - 0.6 * (dy / Ra) + 0.55 * nz);
      if (k > 0.9) { p.set(x, y, lit > 0.35 ? "#ffe2a8" : "#b8743c", { e: 0.9 + 0.5 * pulse, ec: "#ffc880", grp: GRP.INST }); continue; }
      // the embryo: a glowing kernel low in the bulb, swelling with the pulse
      const ex = dx / (R * (0.3 + 0.05 * pulse)), ey = (dy - R * 0.12) / (R * (0.42 + 0.05 * pulse));
      const ek = ex * ex + ey * ey;
      if (ek < 1) {
        const band = ek < 0.25 ? 0 : ek < 0.6 ? 1 : 2;
        p.set(x, y, ["#fffbe8", "#ffe39a", "#ffb24a"][band], { e: [4.5, 3.0, 1.8][band] * (0.75 + 0.25 * pulse), grp: GRP.INST });
        continue;
      }
      // veins from the embryo to the shell
      const va = Math.atan2(dy - R * 0.12, dx);
      const vein = Math.abs(Math.sin(va * 4 + Math.sin(rr * 0.09) * 0.7)) < 0.09 + 0.05 * pulse;
      if (vein) { p.set(x, y, "#ff9a4a", { e: 1.4 + pulse, grp: GRP.INST }); continue; }
      // the translucent shell: dark amber, lit band on the upper left, warmer toward the embryo
      const warm = Math.max(0, 1 - Math.sqrt(ek) / 2.2);
      const tone = Math.min(3, Math.floor(lit * 3.2 + warm * 1.5));
      const pal = ["#200e0a", "#3a1a10", "#582a16", "#7e4220"];
      p.set(x, y, pal[tone], { n: [dx / Ra * 0.8, dy / Ra * 0.8], e: 0.12 + 0.45 * warm * (0.6 + 0.4 * pulse), ec: "#ff8a3a", grp: GRP.INST });
    }
    frames.push(spr(atlas, p, Math.round(cx), Math.round(cy), `seed-${f}`));
  }
  return frames;
}
