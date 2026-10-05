// World generation (world.md section 6): one deterministic pass list from a seed.
// Only the seeded streams of rng.ts and the noise below; + - * / floor and sqrt only (no sin/cos/exp/pow).
import { W, H, FLAG, HAZ, type WorldData, type PlanetId, type Structure, type CacheSpot } from "./types.ts";
import { rng, hash, type Rng } from "./rng.ts";
import {
  MAT, MATERIALS, FINDS, BIOMES, CACHES, CACHE_ITEMS, CHAMBER, LIFT_X, ORE_IDS, ARTIFACT_IDS, ARTIFACT_GEN, JACKPOT_IDS, JACKPOT_GEN,
  planetDef, oreOnPlanet, oreGen, oreWeight, piecesPerTile, findByKey, tileHardness, type BiomeDef, type OreGen,
} from "./content/world.ts";

const I = (x: number, y: number) => y * W + x;
const BOTTOM = 769; // last designed row; below it is the floor under the chamber
const KEEP = [21, 27] as const; // protected keep-out columns (structures with contents, caches, artifacts, lava)
const HAZ_KEEP = [22, 26] as const; // no hazard at any depth

// ---------------------------------------------------------------- seeds and noise

/** FNV-1a over the parts: a uint32 seed for a named stream. */
export function hash32(...parts: (number | string)[]): number {
  let h = 0x811c9dc5;
  const s = parts.join(":");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return h >>> 0;
}
/** World seed per planet visit (world.md 6: hash32(saveSeed, planetId, launchCount)). */
export const worldSeedFor = (saveSeed: number, planet: PlanetId, launchCount: number) => hash32(saveSeed, planet, launchCount);

const GX = [1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0], GY = [1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1];
const F2 = 0.3660254037844386, G2 = 0.21132486540518713;
/** 2D simplex noise in about -1..1, permutation shuffled by the pass's stream. */
export function simplex(r: Rng) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), g = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; g[i] = perm[i] % 12; }
  return (x: number, y: number) => {
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, a = 0.5 - x0 * x0 - y0 * y0;
    if (a > 0) { const k = g[ii + perm[jj]]; a *= a; n += a * a * (GX[k] * x0 + GY[k] * y0); }
    a = 0.5 - x1 * x1 - y1 * y1;
    if (a > 0) { const k = g[ii + i1 + perm[jj + j1]]; a *= a; n += a * a * (GX[k] * x1 + GY[k] * y1); }
    a = 0.5 - x2 * x2 - y2 * y2;
    if (a > 0) { const k = g[ii + 1 + perm[jj + 1]]; a *= a; n += a * a * (GX[k] * x2 + GY[k] * y2); }
    return 70 * n;
  };
}
type Noise = ReturnType<typeof simplex>;
const fbm2 = (n: Noise, x: number, y: number) => (n(x, y) + 0.5 * n(x * 2 + 17.1, y * 2 + 3.7)) / 1.5;

/** Worley F1 and F2 (in cell units) for a cell size c. */
function worley(x: number, y: number, c: number, seed: number): [number, number] {
  const cx = Math.floor(x / c), cy = Math.floor(y / c);
  let f1 = 1e9, f2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j;
    const px = (gx + hash(gx, gy, seed, 1)) * c, py = (gy + hash(gx, gy, seed, 2)) * c;
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return [Math.sqrt(f1) / c, Math.sqrt(f2) / c];
}
/** Pseudo-angle around the chamber (world.md 6: no atan2): -1..1 across the upper half, wrapping straight down. */
function polar(x: number, y: number): [number, number] {
  const dx = x - CHAMBER.cx, dy = y - CHAMBER.cy, s = Math.abs(dx) + Math.abs(dy) || 1;
  const a = dy <= 0 ? dx / s : (dx >= 0 ? 2 - dx / s : -2 - dx / s);
  return [a, Math.sqrt(dx * dx + dy * dy)];
}
/** Threshold above which `frac` of the values lie. */
function quantile(vals: Float32Array | number[], frac: number): number {
  if (!vals.length) return Infinity;
  const s = Float32Array.from(vals).sort();
  const k = Math.min(s.length - 1, Math.max(0, Math.floor(s.length * (1 - frac))));
  return s[k];
}

// ---------------------------------------------------------------- context

export interface GenOpts {
  /** Find ids already in the collection log: relics among them are not placed again (A13 always is). */
  found?: Iterable<number>;
  /** Vein size multiplier (the Prospector perk); 1 (default) leaves the world unchanged. Applies to ore veins, not pockets or fair-start stamps. */
  oreMult?: number;
  /** Filled with milliseconds per pass when given (profiling). */
  timing?: Record<string, number>;
}
interface Rect { x: number; y: number; w: number; h: number }
type Pt = { x: number; y: number };

class Ctx {
  mat = new Uint8Array(W * H); find = new Uint8Array(W * H); haz = new Uint8Array(W * H); back = new Uint8Array(W * H);
  flag = new Uint8Array(W * H); biome = new Uint8Array(W * H); fluid = new Uint8Array(W * H);
  /** Biome slot whose base materials a tile uses (the transition band dithers it). */
  mslot = new Uint8Array(W * H);
  bound: Int16Array[] = [];
  structs: Structure[] = []; caches: CacheSpot[] = []; rects: Rect[] = [];
  anchors: Record<string, Pt[]> = {};
  rooms: Rect[] = []; vaults: { r: Rect; seal: Pt }[] = []; lakes: Rect[] = [];
  placedFinds: Pt[] = [];
  oreMult = 1;
  pd; defs: BiomeDef[];
  constructor(public seed: number, public planet: PlanetId) {
    this.pd = planetDef(planet);
    this.defs = this.pd.biomes.map((id) => BIOMES[id]);
  }
  r(pass: string) { return rng(hash32(this.seed, pass)); }
  noise(pass: string) { return simplex(this.r("noise:" + pass)); }
  anchor(k: string, p: Pt) { (this.anchors[k] ??= []).push(p); }
  def(x: number, y: number) { return this.defs[this.biome[I(x, y)]]; }
  slot(x: number, y: number) { return this.biome[I(x, y)]; }
  /** Set a solid tile (keeps back in step unless asked). */
  set(x: number, y: number, m: number, f = 0) { const i = I(x, y); this.mat[i] = m; this.back[i] = m; this.flag[i] |= f; }
  open(x: number, y: number, f: number = FLAG.CAVE) {
    const i = I(x, y);
    if (this.mat[i] === MAT.BEDROCK) return;
    if (this.mat[i] !== 0) this.back[i] = this.mat[i];
    this.mat[i] = 0; this.find[i] = 0; this.haz[i] = 0; this.fluid[i] = 0; this.flag[i] |= f;
  }
  isAir(x: number, y: number) { return this.mat[I(x, y)] === 0; }
  kind(x: number, y: number) { return MATERIALS[this.mat[I(x, y)]].kind; }
  /** Plain rock or soil a find, dense or hazard may go into: not structure, not special, not ore. */
  plain(x: number, y: number) {
    if (x < 1 || x > W - 2 || y < 1 || y > BOTTOM) return false;
    const i = I(x, y), k = MATERIALS[this.mat[i]].kind;
    return (k === "rock" || k === "soil") && !MATERIALS[this.mat[i]].dense && !(this.flag[i] & FLAG.STRUCT) && !this.find[i] && !this.haz[i];
  }
  touchesAir(x: number, y: number) {
    return (x > 0 && this.mat[I(x - 1, y)] === 0) || (x < W - 1 && this.mat[I(x + 1, y)] === 0) || (y > 0 && this.mat[I(x, y - 1)] === 0) || (y < H - 1 && this.mat[I(x, y + 1)] === 0);
  }
  /** Is any tile within Chebyshev distance r matching pred? */
  near(x: number, y: number, r: number, pred: (i: number) => boolean) {
    for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++)
      for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) if (pred(I(xx, yy))) return true;
    return false;
  }
  rectFree(rc: Rect, pad: number) {
    return this.rects.every((o) => rc.x + rc.w + pad <= o.x || o.x + o.w + pad <= rc.x || rc.y + rc.h + pad <= o.y || o.y + o.h + pad <= rc.y);
  }
  /** Rejection sampling for a guaranteed structure's box (world.md 6): 40 tries, then relax the band by 5 rows. */
  spot(r: Rng, band: [number, number], w: number, h: number, keep: boolean, xr: [number, number] = [3, 44 - w + 1]): Pt | null {
    for (let relax = 0; relax <= 30; relax += 5) {
      const lo = Math.max(1, band[0] - relax), hi = Math.min(BOTTOM - h, band[1] - h + 1 + relax);
      for (let t = 0; t < 40; t++) {
        const y = r.int(lo, Math.max(lo, hi));
        let x = r.int(xr[0], xr[1]);
        if (keep && x + w - 1 >= KEEP[0] && x <= KEEP[1]) {
          if (r.chance(0.5) && KEEP[0] - w >= xr[0]) x = r.int(xr[0], KEEP[0] - w);
          else if (KEEP[1] + 1 <= xr[1]) x = r.int(KEEP[1] + 1, xr[1]);
          else continue;
        }
        const rc = { x, y, w, h };
        if (this.rectFree(rc, 4)) return { x, y };
      }
    }
    return null;
  }
}
/** No sand or loose boulder here: the first shaft must never be sealed by a falling tile (rows 0-25 within 8 columns of the mouth, and the mouth's 3 columns down to row 40). */
const noLoose = (x: number, y: number) => (y <= 25 && Math.abs(x - LIFT_X) <= 8) || (y < 40 && Math.abs(x - LIFT_X) <= 3);
const inKeep = (x: number, lo: number = KEEP[0], hi: number = KEEP[1]) => x >= lo && x <= hi;

// ---------------------------------------------------------------- the generator

export function generate(seed: number, planet: PlanetId = "vell", opts: GenOpts = {}): WorldData {
  const g = new Ctx(seed >>> 0, planet);
  g.oreMult = opts.oreMult ?? 1;
  const passes: [string, () => void][] = [
    ["biomes", () => passBiomes(g)], ["base", () => passBase(g)], ["caves", () => passCaves(g)], ["structures", () => passStructures(g)],
    ["floors", () => passSurfaceMats(g)], ["dense", () => passDense(g)], ["unbreakable", () => passUnbreakable(g)], ["ores", () => passOres(g)],
    ["fair", () => passFairOres(g)], ["caches", () => passCaches(g)], ["hazards", () => passHazards(g)],
    ["finds", () => passFinds(g, new Set(opts.found ?? []))], ["checks", () => passChecks(g)],
  ];
  for (const [name, run] of passes) {
    const t = opts.timing ? performance.now() : 0;
    run();
    if (opts.timing) opts.timing[name] = (opts.timing[name] ?? 0) + performance.now() - t;
  }
  return {
    seed: g.seed, planet, mat: g.mat, find: g.find, haz: g.haz, back: g.back, flag: g.flag, biome: g.biome, fluid: g.fluid,
    spawnX: LIFT_X, structures: g.structs, caches: g.caches,
  };
}

// 1. Biome map: boundaries wander +-3 rows; a 6-row band below each dithers the materials.
function passBiomes(g: Ctx) {
  const tops = g.defs.map((d) => d.rows[0]);
  for (let s = 0; s < 7; s++) {
    const n = g.noise("bound" + s), b = new Int16Array(W);
    for (let x = 0; x < W; x++) b[x] = s === 0 ? 0 : tops[s] + Math.max(-3, Math.min(3, Math.round(3.4 * n(x * 0.08, s * 7.31))));
    g.bound[s] = b;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0;
    for (let k = 1; k < 7; k++) if (y >= g.bound[k][x]) s = k;
    const i = I(x, y);
    g.biome[i] = s;
    let ms = s;
    const k = y - g.bound[s][x];
    if (s > 0 && k < 6 && hash(x, y, g.seed, 77) >= (k + 1) / 7) ms = s - 1;
    g.mslot[i] = ms;
  }
}

// 2. Base material: a material noise picks between the biome's materials by row and threshold.
function passBase(g: Ctx) {
  const n = g.noise("base");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y);
    if (x === 0 || x === W - 1 || y === H - 1) { g.mat[i] = g.back[i] = MAT.BEDROCK; continue; }
    const d = g.defs[g.mslot[i]], m = n(x * 0.11, y * 0.11);
    let mat = d.host;
    for (const r of d.base) {
      if (r.from !== undefined && y < r.from) continue;
      if (r.to !== undefined && y > r.to) continue;
      if (r.min !== undefined && m <= r.min) continue;
      if (r.max !== undefined && m >= r.max) continue;
      mat = r.mat; break;
    }
    g.mat[i] = g.back[i] = mat;
  }
}

// 3. Caves, per biome algorithm; thresholds are set per world from the noise's histogram so each biome hits its open target.
function passCaves(g: Ctx) {
  for (let s = 0; s < 7; s++) {
    const d = g.defs[s];
    const tiles: number[] = [];
    for (let y = 1; y <= BOTTOM; y++) for (let x = 1; x < W - 1; x++) if (g.biome[I(x, y)] === s) tiles.push(I(x, y));
    const r = g.r("caves" + s), n = g.noise("caves" + s), n2 = g.noise("cavegate" + s);
    const score = new Float32Array(tiles.length);
    const byNoise = (f: (x: number, y: number) => number, target: number) => {
      tiles.forEach((i, k) => (score[k] = f(i % W, (i / W) | 0)));
      const t = quantile(score, target);
      tiles.forEach((i, k) => { if (score[k] > t && score[k] > -1e8) g.open(i % W, (i / W) | 0); });
    };
    switch (d.cave) {
      case "pockets": byNoise((x, y) => (y < 6 || Math.abs(x - LIFT_X) < 2 ? -1e9 : fbm2(n, x * 0.09, y * 0.09 * 1.4)), d.open); break;
      case "flat": byNoise((x, y) => fbm2(n, x * 0.07, y * 0.07 * 1.6), d.open); break;
      case "bands": byNoise((x, y) => fbm2(n, x * 0.06, y * 0.06 * 3.0), d.open); break;
      case "rooms": byNoise((x, y) => fbm2(n, x * 0.09, y * 0.09 * 1.5), d.open); break;
      case "tubes":
        byNoise((x, y) => (y < 404 ? -1e9 : fbm2(n, x * 0.08, y * 0.08 * 1.3)), d.open);
        worms(g, r, s, r.int(6, 8), [14, 36], 0.7, true);
        break;
      case "cells":
        byNoise((x, y) => {
          const gate = n2(x * 0.05, y * 0.05);
          if (gate < 0.05) return -1e9;
          const [f1, f2] = worley(x, y * 1.15, 7, g.seed ^ 0x5a5a);
          return f1 - f2 + 0.15 * gate;
        }, d.open);
        break;
      case "polar":
        byNoise((x, y) => {
          if (y > 748) return -1e9;
          const [a, rr] = polar(x, y);
          return n(a * 6, rr * 0.12) + 0.3 * n2(x * 0.1, y * 0.1);
        }, d.open);
        break;
      case "automaton": case "ashCA": {
        const ash = d.cave === "ashCA";
        cellular(g, r, s, tiles, (x, y) => n2(x * 0.03, y * 0.03), ash ? 0.44 : 0.47, ash ? 0.62 : 0.5, ash ? 1.6 : 1.0);
        break;
      }
    }
  }
}

/** Cellular automaton hollows: fill inside a noise-gated region, 5 smoothing steps (wall if >= 5 of 8 neighbours). */
function cellular(g: Ctx, r: Rng, _s: number, tiles: number[], gate: (x: number, y: number) => number, fill: number, region: number, flat: number) {
  const gv = new Float32Array(tiles.length);
  tiles.forEach((i, k) => (gv[k] = gate(i % W, ((i / W) | 0) * flat)));
  const gt = quantile(gv, region);
  let wall = new Uint8Array(W * H).fill(1);
  const inside = new Uint8Array(W * H);
  tiles.forEach((i, k) => { inside[i] = 1; if (gv[k] > gt && r.next() >= fill) wall[i] = 0; });
  let y0 = H, y1 = 0;
  for (const i of tiles) { const y = (i / W) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  for (let step = 0; step < 5; step++) {
    const nw = wall.slice();
    for (let y = y0; y <= y1; y++) for (let x = 1; x < W - 1; x++) {
      const i = I(x, y);
      if (!inside[i]) continue;
      let c = 0;
      for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if ((j || k) && wall[I(x + k, y + j)]) c++;
      nw[i] = c >= 5 ? 1 : c <= 3 ? 0 : wall[i];
    }
    wall = nw;
  }
  // Flat hollows (Ash): no air run taller than 5; the ceiling comes down to it.
  if (flat > 1) for (let x = 1; x < W - 1; x++) {
    let run = 0;
    for (let y = y1; y >= y0; y--) {
      const i = I(x, y);
      if (inside[i] && !wall[i]) { run++; if (run > 5) wall[i] = 1; } else run = 0;
    }
  }
  for (const i of tiles) if (!wall[i]) g.open(i % W, (i / W) | 0);
}

/** Worms: horizontal-biased walks (Stone mine tunnels are structures, Magma lava tubes are caves). */
function worms(g: Ctx, r: Rng, s: number, count: number, len: [number, number], straight: number, tall: boolean) {
  for (let w = 0; w < count; w++) {
    const d = g.defs[s];
    let x = r.int(4, 43), y = r.int(d.rows[0] + 6, d.rows[1] - 6), dir = r.chance(0.5) ? 1 : -1;
    const L = r.int(len[0], len[1]), h2 = tall && r.chance(0.5);
    for (let k = 0; k < L; k++) {
      if (x < 2 || x > W - 3 || g.slot(x, y) !== s) break;
      g.open(x, y);
      if (h2 && y > 1) g.open(x, y - 1);
      if (r.next() < straight) x += dir; else y += r.chance(0.5) ? 1 : -1;
    }
  }
}

// 4. Structures, guaranteed ones first, with the Lift keep-out.
function passStructures(g: Ctx) {
  const r = g.r("structures");
  const own = g.pd.own;
  // Mine mouth: column 24, rows 0-3 open, timber rim.
  for (let y = 0; y <= 3; y++) { g.open(LIFT_X, y, FLAG.DUG | FLAG.STRUCT); g.set(LIFT_X - 1, y, MAT.TIMBER, FLAG.STRUCT); g.set(LIFT_X + 1, y, MAT.TIMBER, FLAG.STRUCT); }
  g.structs.push({ kind: "mouth", x: LIFT_X - 1, y: 0, w: 3, h: 4, name: "Mine mouth" });
  g.rects.push({ x: LIFT_X - 1, y: 0, w: 3, h: 4 });

  coreChamber(g, r);
  if (own !== 2) { singingChamber(g, r); starGeode(g, r); } else forge(g, r);
  if (own !== 3) greatHollow(g, r); else ventHall(g, r);
  cartRoom(g, r);
  kiln(g, r);
  ruins(g, r);
  approach(g, r);
  mineTunnels(g, r);
  shafts(g, r);
  if (own !== 2) geodes(g, r);
  lavaLakes(g, r);
  if (own !== 3) mushrooms(g, r);
  scorchedPocket(g, r);
}

function box(g: Ctx, x0: number, y0: number, w: number, h: number, wall: number, corner: number, back: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
    const isCorner = (x === x0 || x === x0 + w - 1) && (y === y0 || y === y0 + h - 1);
    if (edge) g.set(x, y, isCorner ? corner : wall, FLAG.STRUCT);
    else { g.open(x, y, FLAG.CAVE | FLAG.STRUCT); g.back[I(x, y)] = back; }
  }
}
function door(g: Ctx, x: number, y0: number, h: number) { for (let y = y0; y < y0 + h; y++) g.open(x, y, FLAG.CAVE | FLAG.STRUCT); }

function coreChamber(g: Ctx, r: Rng) {
  const { cx, cy, rx, ry, seedR } = CHAMBER;
  for (let y = cy - ry - 3; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const dx = x - cx, dy = y - cy;
    const e = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry), e2 = (dx * dx) / ((rx + 2) * (rx + 2)) + (dy * dy) / ((ry + 2) * (ry + 2));
    if (e < 1) { g.open(x, y, FLAG.CAVE | FLAG.STRUCT); g.back[I(x, y)] = MAT.HEARTROCK; }
    else if (e2 < 1 || (y > cy && e2 < 1.25)) g.set(x, y, MAT.HEARTROCK, FLAG.STRUCT);
  }
  for (let y = cy - seedR - 1; y <= cy + seedR + 1; y++) for (let x = 18; x <= 29; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= seedR * seedR + 0.5) g.set(x, y, MAT.SEED, FLAG.STRUCT);
  }
  // Cradle under the Seed, down to the floor.
  for (let y = cy + seedR; y < H - 1; y++) for (let x = 22; x <= 25; x++) if (g.isAir(x, y)) g.set(x, y, MAT.BRICK, FLAG.STRUCT);
  g.structs.push({ kind: "chamber", x: Math.floor(cx - rx), y: cy - ry, w: rx * 2, h: ry * 2 + 1, name: "Core chamber" });
  g.structs.push({ kind: "seed", x: Math.floor(cx - seedR), y: cy - seedR, w: seedR * 2 + 1, h: seedR * 2 + 1, name: "The Seed" });
  g.rects.push({ x: 3, y: cy - ry - 2, w: 42, h: H - (cy - ry - 2) });
  // A19 on a pedestal at the edge beside an old pod frame; the Seed tear in the ring beside it.
  const side = r.chance(0.5) ? -1 : 1, px = Math.round(cx + side * (rx - 5));
  let fy = cy;
  while (g.isAir(px, fy + 1)) fy++;
  g.set(px, fy, MAT.PRESSURE, FLAG.STRUCT);
  g.anchor("chamber", { x: px, y: fy });
  g.structs.push({ kind: "pod_frame", x: px + side * 2 - (side < 0 ? 1 : 0), y: fy - 1, w: 2, h: 2, name: "An old pod" });
  const tx = side < 0 ? Math.round(cx + rx + 1) : Math.round(cx - rx - 1);
  g.anchor("ring", { x: tx, y: cy });
}

function singingChamber(g: Ctx, r: Rng) {
  const p = g.spot(r, [190, 230], 11, 7, true);
  if (!p) return;
  box(g, p.x, p.y, 11, 7, MAT.LINING, MAT.LINING, MAT.LINING);
  for (const cx of [p.x + 2, p.x + 8]) for (let y = p.y + 2; y <= p.y + 5; y++) g.set(cx, y, MAT.LINING, FLAG.STRUCT);
  g.set(p.x + 5, p.y + 5, MAT.LINING, FLAG.STRUCT);
  g.anchor("singing", { x: p.x + 5, y: p.y + 5 });
  g.rects.push({ x: p.x, y: p.y, w: 11, h: 7 });
  g.structs.push({ kind: "singing_chamber", x: p.x, y: p.y, w: 11, h: 7, name: "The singing chamber" });
}

/** An elliptical hollow with a crystal lining; returns the lining tiles. */
function geode(g: Ctx, cx: number, cy: number, rx: number, ry: number): Pt[] {
  const lining: Pt[] = [];
  for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
    if (x < 1 || x > W - 2) continue;
    const dx = x - cx, dy = y - cy;
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1) { g.open(x, y, FLAG.CAVE | FLAG.STRUCT); g.back[I(x, y)] = MAT.LINING; }
    else if ((dx * dx) / ((rx + 1) * (rx + 1)) + (dy * dy) / ((ry + 1) * (ry + 1)) < 1) { g.set(x, y, MAT.LINING, FLAG.STRUCT); lining.push({ x, y }); }
  }
  return lining.filter((p) => g.mat[I(p.x, p.y)] === MAT.LINING);
}

function starGeode(g: Ctx, r: Rng) {
  const rx = 7, ry = 6, p = g.spot(r, [240 - ry, 275 + ry], rx * 2 + 3, ry * 2 + 3, true);
  if (!p) return;
  const cx = p.x + rx + 1, cy = p.y + ry + 1;
  const lining = geode(g, cx, cy, rx, ry);
  const sap = findByKey("sapphire")!.id, em = findByKey("emerald")!.id;
  for (const t of lining) if (t.x !== LIFT_X && r.chance(0.6)) g.find[I(t.x, t.y)] = r.chance(0.5) ? sap : em;
  for (let y = cy; y <= cy + ry; y++) if (g.isAir(cx, y)) g.set(cx, y, MAT.LINING, FLAG.STRUCT);
  g.anchor("star_geode", { x: cx, y: cy });
  for (const t of lining) if (t.y >= 250) g.anchor("near_star", t);
  g.rects.push({ x: p.x, y: p.y, w: rx * 2 + 3, h: ry * 2 + 3 });
  g.structs.push({ kind: "star_geode", x: p.x, y: p.y, w: rx * 2 + 3, h: ry * 2 + 3, name: "The star geode" });
}

function geodes(g: Ctx, r: Rng) {
  const n = r.int(8, 12), am = findByKey("amethyst")!.id, sap = findByKey("sapphire")!.id;
  for (let k = 0; k < n; k++) {
    const ry = r.int(2, 4), rx = Math.round(ry * 1.3), w = rx * 2 + 3, h = ry * 2 + 3;
    const p = g.spot(r, [165, 275], w, h, true);
    if (!p) continue;
    const cx = p.x + rx + 1, cy = p.y + ry + 1;
    const lining = geode(g, cx, cy, rx, ry);
    for (const t of lining) {
      if (r.chance(0.4)) g.find[I(t.x, t.y)] = t.y < 230 ? am : sap;
      if (t.y >= 200 && t.y <= 260) g.anchor("geode", t);
    }
    g.rects.push({ x: p.x, y: p.y, w, h });
    g.structs.push({ kind: "geode", x: p.x, y: p.y, w, h });
  }
}

function greatHollow(g: Ctx, r: Rng) {
  const rx = 12, ry = 7, w = rx * 2 + 1, h = ry * 2 + 1;
  const p = g.spot(r, [320, 370], w, h, false, [3, 44 - w + 1]);
  if (!p) return;
  const cx = p.x + rx, cy = p.y + ry;
  const inE = (x: number, y: number) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return dx * dx + dy * dy < 1; };
  // Ellipse with a noisy edge, then one smoothing step.
  const n = g.noise("hollow");
  const cells: Pt[] = [];
  for (let y = p.y - 1; y <= p.y + h; y++) for (let x = p.x - 1; x <= p.x + w; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy + 0.25 * n(x * 0.25, y * 0.25) < 1) cells.push({ x, y });
  }
  for (const c of cells) if (c.x > 1 && c.x < W - 2) g.open(c.x, c.y, FLAG.CAVE | FLAG.STRUCT);
  void inE;
  // Floor centre (outside the Lift's keep-out): A8's glowing node.
  let ax = cx;
  if (inKeep(ax)) ax = cx < LIFT_X ? KEEP[0] - 1 : KEEP[1] + 1;
  let fy = cy;
  while (fy < cy + ry + 3 && g.isAir(ax, fy + 1)) fy++;
  if (g.isAir(ax, fy)) fy++;
  g.anchor("great_hollow", { x: ax, y: fy });
  g.rects.push({ x: p.x, y: p.y, w, h });
  g.structs.push({ kind: "great_hollow", x: p.x, y: p.y, w, h, name: "The great hollow" });
}

function cartRoom(g: Ctx, r: Rng) {
  const p = g.spot(r, [110, 150], 7, 5, true);
  if (!p) return;
  for (let y = p.y; y < p.y + 4; y++) for (let x = p.x; x < p.x + 7; x++) { g.open(x, y, FLAG.CAVE | FLAG.STRUCT); }
  for (let x = p.x; x < p.x + 7; x++) g.set(x, p.y + 4, MAT.TIMBER, FLAG.STRUCT);
  g.set(p.x + 3, p.y + 4, g.defs[1].host, FLAG.STRUCT);
  g.anchor("cart_room", { x: p.x + 3, y: p.y + 4 });
  g.rects.push({ x: p.x, y: p.y, w: 7, h: 5 });
  g.structs.push({ kind: "cart_room", x: p.x, y: p.y, w: 7, h: 4, name: "The cart room" });
}

/** A Sower hall: brick walls, ward stone corners, doorways both sides; returns the box. */
function hall(g: Ctx, p: Pt, w: number, h: number, back = MAT.BRICK) {
  box(g, p.x, p.y, w, h, MAT.BRICK, MAT.WARD_STONE, back);
  door(g, p.x, p.y + h - 3, 2);
  door(g, p.x + w - 1, p.y + h - 3, 2);
}

function kiln(g: Ctx, r: Rng) {
  const w = 12, h = 7, p = g.spot(r, [480, 520], w, h, true);
  if (!p) return;
  hall(g, p, w, h);
  const host = g.defs[4].host;
  g.set(p.x + 6, p.y + h - 2, host, FLAG.STRUCT);
  g.anchor("kiln_pedestal", { x: p.x + 6, y: p.y + h - 2 });
  const wx = r.chance(0.5) ? p.x + 3 : p.x + w - 4;
  g.anchor("kiln_wall", { x: wx, y: p.y });
  g.rects.push({ x: p.x, y: p.y, w, h });
  g.structs.push({ kind: "kiln", x: p.x, y: p.y, w, h, name: "The Kiln" });
}

function ventHall(g: Ctx, r: Rng) {
  const w = 10, h = 6, p = g.spot(r, [330, 370], w, h, true);
  if (!p) return;
  hall(g, p, w, h);
  const fy = p.y + h - 1, vx = p.x + 4;
  g.set(vx, fy, MAT.GEYSER, FLAG.STRUCT);
  g.set(vx - 1, fy - 1, MAT.CLINKER, FLAG.STRUCT);
  g.set(vx + 1, fy - 1, MAT.CLINKER, FLAG.STRUCT);
  g.anchor("vent_cone", { x: vx + 1, y: fy - 1 });
  g.set(p.x + 7, fy - 1, g.defs[3].host, FLAG.STRUCT);
  g.anchor("vent_pedestal", { x: p.x + 7, y: fy - 1 });
  g.anchor("vent_wall", { x: p.x + 2, y: p.y });
  g.rects.push({ x: p.x, y: p.y, w, h });
  g.structs.push({ kind: "vent_hall", x: p.x, y: p.y, w, h, name: "The vent hall" });
}

function forge(g: Ctx, r: Rng) {
  const w = 10, h = 6, p = g.spot(r, [220, 260], w, h, true);
  if (!p) return;
  hall(g, p, w, h);
  const fy = p.y + h - 2;
  g.set(p.x + 5, fy, g.defs[2].host, FLAG.STRUCT);
  g.anchor("forge_centre", { x: p.x + 5, y: fy });
  g.set(p.x + 2, fy, g.defs[2].host, FLAG.STRUCT);
  g.anchor("forge_pedestal", { x: p.x + 2, y: fy });
  g.anchor("forge_wall", { x: p.x + 7, y: p.y });
  g.rects.push({ x: p.x, y: p.y, w, h });
  g.structs.push({ kind: "forge", x: p.x, y: p.y, w, h, name: "The forge" });
}

/** A sealed vault: 5x4 interior, ward stone walls, one seal; the floor holds Orichalcum and maybe a pedestal find. */
function vault(g: Ctx, r: Rng, x0: number, y0: number, sealSide: "top" | "left" | "right" | "bottom", key: string) {
  box(g, x0, y0, 7, 6, MAT.WARD_STONE, MAT.WARD_STONE, MAT.BRICK);
  const ori = findByKey("orichalcum")!.id, host = MAT.PACKED_RUBBLE;
  const floor: Pt[] = [];
  for (let y = y0 + 3; y <= y0 + 4; y++) for (let x = x0 + 1; x <= x0 + 5; x++) { g.set(x, y, host, FLAG.STRUCT); floor.push({ x, y }); }
  const ped = { x: x0 + 3, y: y0 + 3 };
  g.anchor(key, ped);
  const n = r.int(6, 9);
  const rest = floor.filter((p) => p.x !== ped.x || p.y !== ped.y);
  for (let k = 0; k < n && rest.length; k++) { const t = rest.splice(Math.floor(r.next() * rest.length), 1)[0]; g.find[I(t.x, t.y)] = ori; }
  const seal = sealSide === "top" ? { x: x0 + 3, y: y0 } : sealSide === "bottom" ? { x: x0 + 3, y: y0 + 5 } : sealSide === "left" ? { x: x0, y: y0 + 2 } : { x: x0 + 6, y: y0 + 2 };
  g.set(seal.x, seal.y, MAT.VAULT_SEAL, FLAG.STRUCT);
  const rc = { x: x0, y: y0, w: 7, h: 6 };
  g.vaults.push({ r: rc, seal });
  g.rects.push(rc);
  g.structs.push({ kind: "vault", x: x0, y: y0, w: 7, h: 6, name: "A sealed vault" });
}

function carveLine(g: Ctx, a: Pt, b: Pt, tall: boolean, skip: (x: number, y: number) => boolean) {
  const carve = (x: number, y: number) => {
    for (const yy of tall ? [y, y - 1] : [y]) if (!skip(x, yy) && g.mat[I(x, yy)] !== MAT.BEDROCK) { g.open(x, yy, FLAG.CAVE | FLAG.STRUCT); g.back[I(x, yy)] = MAT.BRICK; }
  };
  let x = a.x, y = a.y;
  while (x !== b.x) { carve(x, y); x += Math.sign(b.x - x); }
  while (y !== b.y) { carve(x, y); y += Math.sign(b.y - y); }
  carve(x, y);
}

function ruins(g: Ctx, r: Rng) {
  const CW = 12, CH = 10, Y0 = 545, ROWS = 13, COLS = 4;
  const used = new Uint8Array(COLS * ROWS);
  const cellOf = (x: number, y: number) => [Math.min(COLS - 1, Math.floor((x - 1) / CW)), Math.floor((y - Y0) / CH)];
  const markRect = (rc: Rect) => {
    const [a, b] = cellOf(rc.x, rc.y), [c, d] = cellOf(rc.x + rc.w - 1, rc.y + rc.h - 1);
    for (let j = b; j <= d; j++) for (let i = a; i <= c; i++) if (j >= 0 && j < ROWS) used[j * COLS + i] = 1;
  };
  // The Nursery and its vault (vault 2) under its floor.
  const nw = 16, nh = 8, np = g.spot(r, [620, 652], nw, nh + 5, true);
  if (np) {
    hall(g, np, nw, nh);
    g.anchor("nursery_wall", { x: np.x + (r.chance(0.5) ? 4 : nw - 5), y: np.y });
    g.rects.push({ x: np.x, y: np.y, w: nw, h: nh });
    g.structs.push({ kind: "nursery", x: np.x, y: np.y, w: nw, h: nh, name: "The Nursery" });
    g.rooms.push({ x: np.x, y: np.y, w: nw, h: nh });
    const vx = np.x + Math.floor((nw - 7) / 2), vy = np.y + nh - 1;
    g.rects.pop();
    vault(g, r, vx, vy, "top", "vault2");
    g.rects.push({ x: np.x, y: np.y, w: nw, h: nh });
    markRect({ x: np.x, y: np.y, w: nw, h: nh + 5 });
  }
  // Rooms on the macro grid.
  const cells: number[] = [];
  for (let k = 0; k < COLS * ROWS; k++) if (!used[k]) cells.push(k);
  for (let k = cells.length - 1; k > 0; k--) { const j = Math.floor(r.next() * (k + 1)); const t = cells[k]; cells[k] = cells[j]; cells[j] = t; }
  const nRooms = r.int(10, 14);
  const roomAt = new Map<number, Rect>();
  for (const k of cells) {
    if (roomAt.size >= nRooms) break;
    const ci = k % COLS, cj = Math.floor(k / COLS);
    const cx0 = Math.max(3, 1 + ci * CW), cx1 = Math.min(44, ci * CW + CW), cy0 = Y0 + cj * CH, cy1 = Math.min(677, cy0 + CH - 1);
    const maxW = cx1 - cx0 + 1, maxH = cy1 - cy0 + 1;
    if (maxW < 8) continue;
    const iw = r.int(6, Math.min(11, maxW - 2)), ih = r.int(4, Math.min(6, maxH - 2));
    const x = r.int(cx0, cx1 - iw - 1), y = r.int(cy0, cy1 - ih - 1);
    const rc = { x, y, w: iw + 2, h: ih + 2 };
    if (!g.rectFree(rc, 1)) continue;
    box(g, x, y, iw + 2, ih + 2, MAT.BRICK, MAT.WARD_STONE, MAT.BRICK);
    roomAt.set(k, rc);
    used[k] = 2;
    g.rooms.push(rc);
    g.structs.push({ kind: "room", x, y, w: iw + 2, h: ih + 2 });
  }
  // L-shaped corridors join each room to its two nearest neighbours; half get a ward stone roof.
  const centre = (rc: Rect) => ({ x: rc.x + Math.floor(rc.w / 2), y: rc.y + rc.h - 2 });
  const inVault = (x: number, y: number) => g.vaults.some((o) => x >= o.r.x && x < o.r.x + o.r.w && y >= o.r.y && y < o.r.y + o.r.h);
  const isCorner = (x: number, y: number) => g.mat[I(x, y)] === MAT.WARD_STONE || inVault(x, y);
  const rooms = [...g.rooms], joined = new Set<string>();
  for (let a = 0; a < rooms.length; a++) {
    const A = centre(rooms[a]);
    const near = rooms.map((b, k) => ({ k, d: Math.abs(centre(b).x - A.x) + Math.abs(centre(b).y - A.y) * 1.3 })).filter((o) => o.k !== a).sort((p, q) => p.d - q.d).slice(0, 2);
    for (const { k, d } of near) {
      const key = a < k ? `${a}-${k}` : `${k}-${a}`;
      if (joined.has(key) || d > 40) continue;
      joined.add(key);
      const B = centre(rooms[k]), tall = r.chance(0.4);
      carveLine(g, A, B, tall, isCorner);
      g.structs.push({ kind: "corridor", x: Math.min(A.x, B.x), y: Math.min(A.y, B.y), w: Math.abs(A.x - B.x) + 1, h: Math.abs(A.y - B.y) + 1 });
      if (r.chance(0.5)) for (let x = Math.min(A.x, B.x); x <= Math.max(A.x, B.x); x++) {
        const y = A.y - (tall ? 2 : 1);
        if (!(g.flag[I(x, y)] & FLAG.STRUCT) && g.kind(x, y) === "rock" && x % 7 !== 0) g.set(x, y, MAT.WARD_STONE);
      }
    }
  }
  // Vaults 1, 3 and 4 in free cells, the seal facing the nearest room, a short passage to it.
  for (const key of ["vault1", "vault3", "vault4"]) {
    let done = false;
    for (let t = 0; t < 80 && !done; t++) {
      const k = r.int(0, COLS * ROWS - 1);
      if (used[k]) continue;
      const ci = k % COLS, cj = Math.floor(k / COLS);
      const cx0 = Math.max(3, 1 + ci * CW), cx1 = Math.min(44, ci * CW + CW) - 6;
      let x = r.int(cx0, Math.max(cx0, cx1));
      if (x + 6 >= KEEP[0] && x <= KEEP[1]) x = x < LIFT_X ? KEEP[0] - 7 : KEEP[1] + 1;
      const y = Y0 + cj * CH + r.int(1, 3);
      if (x < 3 || x + 6 > 44 || y + 6 > 677 || y < 560) continue;
      const rc = { x, y, w: 7, h: 6 };
      if (!g.rectFree(rc, 2)) continue;
      // Face the nearest room.
      let best: Rect | null = null, bd = 1e9;
      for (const rm of g.rooms) { const d = Math.abs(rm.x + rm.w / 2 - (x + 3.5)) + Math.abs(rm.y + rm.h / 2 - (y + 3)); if (d < bd) { bd = d; best = rm; } }
      const dx = best ? best.x + best.w / 2 - (x + 3.5) : 1, dy = best ? best.y + best.h / 2 - (y + 3) : 0;
      // Never a seal on the floor side: the pod cannot drill up into it.
      const side = Math.abs(dx) >= Math.abs(dy) || dy > 0 ? (dx < 0 ? "left" : "right") : "top";
      vault(g, r, x, y, side, key);
      used[k] = 3;
      const v = g.vaults[g.vaults.length - 1];
      if (best) {
        const out = { x: v.seal.x + (side === "left" ? -1 : side === "right" ? 1 : 0), y: v.seal.y + (side === "top" ? -1 : 0) };
        const tgt = centre(best);
        if (side === "left" || side === "right") carveLine(g, out, tgt, false, inVault);
        else carveLine(g, out, { x: out.x, y: tgt.y }, false, inVault), carveLine(g, { x: out.x, y: tgt.y }, tgt, false, inVault);
      }
      done = true;
    }
  }
  // The first room below the boundary holds the door-key (A13): a floor tile outside the keep-out.
  const first = g.rooms.filter((rm) => rm.y >= 543).sort((a, b) => a.y - b.y)[0];
  if (first) {
    let fx = first.x + 2;
    if (inKeep(fx)) fx = first.x + first.w - 3;
    if (inKeep(fx)) fx = first.x + 1;
    g.set(fx, first.y + first.h - 1, MAT.PACKED_RUBBLE, FLAG.STRUCT);
    g.anchor("first_room", { x: fx, y: first.y + first.h - 1 });
  }
}

function approach(g: Ctx, r: Rng) {
  let x = r.chance(0.5) ? r.int(8, 18) : r.int(30, 40), y = 700;
  const pts: Pt[] = [];
  for (let k = 0; k < 400; k++) {
    const inside = g.isAir(x, y) && (g.flag[I(x, y)] & FLAG.STRUCT) && y > 740;
    if (inside) break;
    if (g.mat[I(x, y)] !== MAT.SEED && g.mat[I(x, y)] !== MAT.BEDROCK) { g.open(x, y); pts.push({ x, y }); if (r.chance(0.35) && x + 1 < W - 1) g.open(x + 1, y); }
    const v = r.next();
    if (v < 0.6) y++; else if (v < 0.8) x = Math.max(2, x - 1); else x = Math.min(W - 3, x + 1);
    if (y > CHAMBER.cy) break;
  }
  g.structs.push({ kind: "approach", x: Math.min(...pts.map((p) => p.x)), y: 700, w: 1 + Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)), h: (pts.at(-1)?.y ?? 700) - 699, name: "The approach" });
}

function mineTunnels(g: Ctx, r: Rng) {
  const n = r.int(4, 6);
  const plugs: Pt[] = [];
  for (let k = 0; k < n; k++) {
    // The first two are pinned: one in A1's band (70-105), one ending deep (130-155) for the Motherlode.
    const band: [number, number] = k === 0 ? [72, 104] : k === 1 ? [132, 155] : [65, 155];
    const y0 = r.int(band[0], band[1]);
    let x = r.int(4, 43), y = y0, dir = x < LIFT_X ? 1 : -1;
    if (k === 1) { x = r.int(4, 12); dir = 1; if (r.chance(0.5)) { x = r.int(35, 43); dir = -1; } }
    const L = r.int(12, 30), tall = r.chance(0.25), tiles: Pt[] = [];
    for (let s = 0; s < L; s++) {
      if (x < 3 || x > 44 || g.slot(x, y) !== 1 || y > 157) break;
      if (k === 1 && inKeep(x + dir * 2)) break;
      g.open(x, y, FLAG.CAVE | FLAG.STRUCT); tiles.push({ x, y });
      if (tall) g.open(x, y - 1, FLAG.CAVE | FLAG.STRUCT);
      const ceil = y - (tall ? 2 : 1);
      if (s % 4 === 2 && g.kind(x, ceil) === "rock") g.set(x, ceil, MAT.TIMBER, FLAG.STRUCT);
      if (r.next() < 0.85) x += dir; else y += r.chance(0.5) ? 1 : -1;
    }
    if (tiles.length < 6) continue;
    const end = tiles[tiles.length - 1];
    for (const t of tiles) { if (t.y >= 70 && t.y <= 110 && !inKeep(t.x)) { g.anchor("tunnel_wall", { x: t.x, y: t.y + 1 }); g.anchor("tunnel_wall", { x: t.x, y: t.y - (tall ? 2 : 1) }); } }
    const plugged = k !== 1 && (r.chance(0.3) || (k === n - 1 && !plugs.length));
    if (plugged && !inKeep(end.x)) {
      for (const t of tiles.slice(-2)) { g.set(t.x, t.y, MAT.RUBBLE, FLAG.STRUCT); if (tall) g.set(t.x, t.y - 1, MAT.RUBBLE, FLAG.STRUCT); }
      plugs.push(end);
    } else if (end.y >= 130 && end.y <= 158 && !inKeep(end.x + dir)) g.anchor("tunnel_end", { x: end.x + dir, y: end.y });
    const xs = tiles.map((t) => t.x), ys = tiles.map((t) => t.y);
    g.structs.push({ kind: "tunnel", x: Math.min(...xs), y: Math.min(...ys) - (tall ? 1 : 0), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 + (tall ? 1 : 0) });
  }
  for (const p of plugs) g.anchor("plug", p);
}

function shafts(g: Ctx, r: Rng) {
  const n = r.int(1, 2);
  let deepest: Pt | null = null;
  for (let k = 0; k < n; k++) {
    const len = r.int(10, 25), x = r.chance(0.5) ? r.int(4, 18) : r.int(30, 43), y0 = r.int(70, 150 - len);
    for (let y = y0; y < y0 + len; y++) g.open(x, y, FLAG.CAVE | FLAG.STRUCT);
    g.structs.push({ kind: "shaft", x, y: y0, w: 1, h: len });
    if (!deepest || y0 + len > deepest.y) deepest = { x, y: y0 + len };
  }
  if (deepest) for (let y = Math.max(140, deepest.y + 1); y <= 158; y++) g.anchor("below_shaft", { x: deepest.x, y });
}

function lavaLakes(g: Ctx, r: Rng) {
  const n = r.int(3, 5);
  for (let k = 0, tries = 0; k < n && tries < n * 3; tries++) {
    // The first is the wide one (10+); a lake that finds no room retries smaller.
    const w = k === 0 ? Math.max(10, r.int(10, 18) - tries * 2) : Math.max(6, r.int(6, 18) - tries), hh = Math.max(5, Math.round(w / 2.2) + 1), rx = w / 2, ry = hh / 2;
    const p = g.spot(r, [415, 535], w + 2, hh + 2, true);
    if (!p) continue;
    k++;
    const cx = p.x + 1 + rx - 0.5, cy = p.y + 1 + ry - 0.5;
    const lavaTop = p.y + 1 + Math.floor(hh * 0.6);
    for (let y = p.y + 1; y <= p.y + hh; y++) for (let x = p.x + 1; x <= p.x + w; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy >= 1.05) continue;
      g.open(x, y, FLAG.CAVE | FLAG.STRUCT);
      if (y >= lavaTop) { const i = I(x, y); g.mat[i] = MAT.LAVA; g.fluid[i] = 255; }
    }
    // Crust where the roof is within 2 tiles of the lava.
    for (let x = p.x + 1; x <= p.x + w; x++) {
      let top = -1;
      for (let y = p.y; y <= p.y + hh + 1; y++) if (g.mat[I(x, y)] === MAT.LAVA) { top = y; break; }
      if (top < 0) continue;
      let gap = 0;
      for (let y = top - 1; y >= p.y && g.isAir(x, y); y--) gap++;
      if (gap <= 2) { const i = I(x, top); g.mat[i] = MAT.CRUST; g.fluid[i] = 0; }
    }
    const rc = { x: p.x, y: p.y, w: w + 2, h: hh + 2 };
    g.lakes.push(rc); g.rects.push(rc);
    g.structs.push({ kind: "lava_lake", x: rc.x, y: rc.y, w: rc.w, h: rc.h });
  }
  // The deepest lake holds the Phoenix diamond on its floor.
  const deep = [...g.lakes].sort((a, b) => b.y + b.h - (a.y + a.h))[0];
  if (deep) {
    const cx = deep.x + Math.floor(deep.w / 2);
    let y = deep.y;
    while (y < deep.y + deep.h + 2 && (g.isAir(cx, y) || g.mat[I(cx, y)] === MAT.LAVA || g.mat[I(cx, y)] === MAT.CRUST)) y++;
    if (y === deep.y) while (y < deep.y + deep.h + 2 && !(g.mat[I(cx, y)] === MAT.LAVA)) y++;
    while (g.mat[I(cx, y)] === MAT.LAVA) y++;
    g.anchor("lake_floor", { x: cx, y });
  }
}

/** Mushroom forests: every Fungal hollow whose floor spans 8 or more columns grows giant mushrooms 3-7 tall every 3-5 tiles. */
function mushrooms(g: Ctx, r: Rng) {
  const caps: Pt[] = [];
  const comp = new Int32Array(W * H).fill(-1);
  const inHollow = (x: number, y: number) => y >= 282 && y <= 398 && g.isAir(x, y) && g.slot(x, y) === 3;
  let nc = 0;
  for (let y0 = 282; y0 <= 398; y0++) for (let x0 = 1; x0 < W - 1; x0++) {
    if (!inHollow(x0, y0) || comp[I(x0, y0)] >= 0) continue;
    // Flood the hollow; per column keep its lowest floor tile (air with rock under it).
    const floorY = new Int16Array(W).fill(-1), stack = [I(x0, y0)];
    comp[stack[0]] = nc;
    while (stack.length) {
      const i = stack.pop()!, x = i % W, y = (i / W) | 0;
      const below = g.mat[I(x, y + 1)];
      if (below && MATERIALS[below].kind !== "liquid" && y > floorY[x]) floorY[x] = y;
      for (const j of [i - 1, i + 1, i - W, i + W]) { const xx = j % W, yy = (j / W) | 0; if (comp[j] < 0 && inHollow(xx, yy)) { comp[j] = nc; stack.push(j); } }
    }
    nc++;
    let x = 1;
    while (x < W - 1) {
      if (floorY[x] < 0) { x++; continue; }
      let e = x;
      while (e + 1 < W - 1 && floorY[e + 1] >= 0 && Math.abs(floorY[e + 1] - floorY[e]) <= 2) e++;
      if (e - x + 1 >= 8) for (let mx = x + 1 + r.int(0, 2); mx <= e - 1; mx += r.int(3, 5)) {
        if (mx === LIFT_X) continue;
        const fy = floorY[mx], h = r.int(3, 7);
        // Tallest stalk up to h whose column is clear and whose 3-wide cap row is clear, with a tile of headroom.
        let hh = 0;
        for (let k = 3; k <= h; k++) {
          let ok = true;
          for (let j = 0; j <= k && ok; j++) ok = g.isAir(mx, fy - j);
          ok &&= g.isAir(mx - 1, fy - k + 1) && g.isAir(mx + 1, fy - k + 1) && g.isAir(mx - 1, fy - k) && g.isAir(mx + 1, fy - k);
          if (ok) hh = k; else if (hh) break;
        }
        if (hh < 3) continue;
        for (let k = 0; k < hh - 1; k++) g.set(mx, fy - k, MAT.MUSHROOM, FLAG.STRUCT);
        const cy = fy - hh + 1;
        for (let k = -1; k <= 1; k++) g.set(mx + k, cy, MAT.CAP, FLAG.STRUCT);
        g.structs.push({ kind: "mushroom", x: mx - 1, y: cy, w: 3, h: hh });
        if (!inKeep(mx) && !inKeep(mx - 1) && !inKeep(mx + 1)) caps.push({ x: mx, y: cy });
        if (fy >= 359 && !inKeep(mx)) g.anchor("under_mushroom", { x: mx, y: fy + 1 });
      }
      x = e + 1;
    }
  }
  // Two Moonpearl caps, spread apart.
  for (let k = caps.length - 1; k > 0; k--) { const j = Math.floor(r.next() * (k + 1)); const t = caps[k]; caps[k] = caps[j]; caps[j] = t; }
  const pick = caps.slice(0, 1);
  for (const c of caps) if (pick.length < 2 && Math.abs(c.y - pick[0].y) + Math.abs(c.x - pick[0].x) > 12) pick.push(c);
  for (const c of pick) g.anchor("cap", c);
}

/** The Fallen star's scorched pocket (rows 30-58). */
function scorchedPocket(g: Ctx, r: Rng) {
  const p = g.spot(r, [30, 56], 3, 3, true);
  if (!p) return;
  g.open(p.x, p.y + 1); g.open(p.x + 1, p.y + 1); g.open(p.x + 1, p.y);
  g.set(p.x + 1, p.y + 2, g.mat[I(p.x + 1, p.y + 2)] || g.defs[0].host, FLAG.STRUCT);
  g.anchor("scorched", { x: p.x + 1, y: p.y + 2 });
  g.rects.push({ x: p.x, y: p.y, w: 3, h: 3 });
  g.structs.push({ kind: "scorched", x: p.x, y: p.y, w: 3, h: 3 });
}

/** Floors: mycelium mat on Fungal hollow floors and edges, ash beds on Ash hollow floors. */
function passSurfaceMats(g: Ctx) {
  const r = g.r("surface");
  for (let y = 281; y <= 399; y++) for (let x = 1; x < W - 1; x++) {
    const i = I(x, y), d = g.defs[g.biome[i]];
    if (d.slot !== 3 || !g.plain(x, y)) continue;
    const floor = g.isAir(x, y - 1), edge = g.touchesAir(x, y);
    if (d.id === 7) { if (floor || (g.isAir(x, y - 2) && r.chance(0.5))) g.set(x, y, MAT.ASH_BED); }
    else if (floor || (edge && r.chance(0.35))) g.set(x, y, MAT.MYCELIUM);
  }
}

// 5. Dense material: ~10% of each biome's diggable tiles, shaped per biome.
function passDense(g: Ctx) {
  const mouth = (x: number, y: number) => y < 12 && Math.abs(x - LIFT_X) <= 3;
  for (let s = 0; s < 7; s++) {
    const d = g.defs[s], n = g.noise("dense" + s), r = g.r("dense" + s);
    const tiles: number[] = [];
    let diggable = 0;
    for (let y = 1; y <= BOTTOM; y++) for (let x = 1; x < W - 1; x++) {
      const i = I(x, y);
      if (g.biome[i] !== s) continue;
      if (g.mat[i] && MATERIALS[g.mat[i]].kind !== "unbreakable" && MATERIALS[g.mat[i]].kind !== "liquid") diggable++;
      if (g.plain(x, y) && !mouth(x, y) && !(s === 0 && y < 12)) tiles.push(i);
    }
    const target = Math.round(diggable * 0.1);
    if (d.denseShape === "slabs") {
      let placed = 0;
      for (let t = 0; t < 400 && placed < target; t++) {
        const w = r.int(3, 6), h = r.int(2, 4), x0 = r.int(2, W - 2 - w), y0 = r.int(d.rows[0] + 2, d.rows[1] - h);
        const rc = { x: x0, y: y0, w, h };
        if (g.rooms.some((o) => !(rc.x + rc.w + 1 <= o.x || o.x + o.w + 1 <= rc.x || rc.y + rc.h + 1 <= o.y || o.y + o.h + 1 <= rc.y))) continue;
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (g.plain(x, y) && g.biome[I(x, y)] === s) { g.set(x, y, d.dense); placed++; }
      }
      continue;
    }
    const f = (x: number, y: number): number => {
      switch (d.denseShape) {
        case "hbands": return n(x * 0.025, y * 0.35);
        case "dikes": return n((x + 0.3 * y) * 0.35, y * 0.04);
        case "blobs": return -worley(x, y, 9, g.seed ^ 0x77)[0];
        case "shelves": return n(x * 0.05, y * 0.4) + (g.isAir(x, y - 1) || g.isAir(x, y - 2) ? 0.25 : 0);
        case "flows": return n((x + y) * 0.05, (x - y) * 0.3);
        case "spokes": { const [a, rr] = polar(x, y); return n(a * 12, rr * 0.03); }
        case "sheets": return n(x * 0.06, y * 0.3);
        case "longbands": return n(x * 0.03, y * 0.5);
        default: return 0;
      }
    };
    const v = new Float32Array(tiles.length);
    tiles.forEach((i, k) => (v[k] = f(i % W, (i / W) | 0)));
    const t = quantile(v, Math.min(0.95, target / Math.max(1, tiles.length)));
    tiles.forEach((i, k) => { if (v[k] > t) g.set(i % W, (i / W) | 0, d.dense); });
  }
  // Routing rule: any dense run longer than 12 gets a 2-tile gap of host rock.
  for (let y = 1; y <= BOTTOM; y++) {
    let run = 0;
    for (let x = 1; x < W - 1; x++) {
      if (MATERIALS[g.mat[I(x, y)]].dense) { run++; if (run > 12) { g.set(x, y, g.def(x, y).host); if (x + 1 < W - 1 && MATERIALS[g.mat[I(x + 1, y)]].dense) g.set(x + 1, y, g.def(x + 1, y).host); run = 0; } }
      else run = 0;
    }
  }
}

// 6. Unbreakable rock: seeds grown to each biome's shape, then capped.
function passUnbreakable(g: Ctx) {
  const mouth = (x: number, y: number) => y < 12 && Math.abs(x - LIFT_X) <= 3;
  const ok = (x: number, y: number) => g.plain(x, y) && !mouth(x, y) && !(g.biome[I(x, y)] === 0 && y < 20);
  for (let s = 0; s < 7; s++) {
    const d = g.defs[s], r = g.r("unb" + s);
    // Seed rate from the biome's target share: what is still missing, over the eligible tiles, per mean seam size.
    // Growth that runs into rock it may not take falls short, so up to three rounds top it up.
    for (let round = 0; round < 3; round++) {
      let all = 0, have = 0, elig = 0;
      for (let y = 1; y <= BOTTOM; y++) for (let x = 1; x < W - 1; x++) {
        if (g.biome[I(x, y)] !== s) continue;
        all++;
        if (MATERIALS[g.mat[I(x, y)]].kind === "unbreakable") have++;
        else if (ok(x, y)) elig++;
      }
      if (have >= d.unbShare * all * 0.95) break;
      const chance = Math.max(0, d.unbShare * all - have) / ((d.unbSize[0] + d.unbSize[1]) / 2) / Math.max(1, elig);
      for (let y = 1; y <= BOTTOM; y++) for (let x = 1; x < W - 1; x++) {
        if (g.biome[I(x, y)] !== s || !ok(x, y) || !r.chance(chance)) continue;
        const size = r.int(d.unbSize[0], d.unbSize[1]);
        const tiles: Pt[] = [{ x, y }];
        let cx = x, cy = y, dir = r.chance(0.5) ? 1 : -1, vy = r.chance(0.5) ? 1 : -1;
        const [, r0] = polar(x, y);
        for (let k = 1, tries = 0; k < size && tries < size * 4; tries++) {
          let nx = cx, ny = cy;
          switch (d.unbShape) {
            case "seam": case "frame": nx += dir; if (d.unbShape === "seam" && r.chance(0.2)) ny += r.chance(0.5) ? 1 : -1; break;
            case "column": ny += vy; break;
            case "walk": if (r.chance(0.6)) nx += dir; else ny += vy; if (r.chance(0.2)) dir = -dir; break;
            case "arc": {
              let best = 1e9;
              for (const [ddx, ddy] of [[dir, 0], [dir, -1], [dir, 1], [0, -1], [0, 1]]) {
                const [, rr] = polar(cx + ddx, cy + ddy);
                const sc = Math.abs(rr - r0) + (ddx === 0 ? 0.3 : 0);
                if (sc < best) { best = sc; nx = cx + ddx; ny = cy + ddy; }
              }
              break;
            }
            default: { const t = tiles[Math.floor(r.next() * tiles.length)]; nx = t.x + r.int(-1, 1); ny = t.y + r.int(-1, 1); }
          }
          if (!ok(nx, ny) || g.biome[I(nx, ny)] !== s || tiles.some((p) => p.x === nx && p.y === ny)) {
            if (d.unbShape === "seam" || d.unbShape === "frame" || d.unbShape === "walk") dir = -dir;
            if (d.unbShape === "column") vy = -vy;
            continue;
          }
          tiles.push({ x: nx, y: ny }); cx = nx; cy = ny; k++;
        }
        if (d.id === 0 && tiles.length > 2) tiles.length = 2;
        for (const t of tiles) g.set(t.x, t.y, d.unb);
      }
    }
  }
  // Caps: no row over 45% unbreakable, no horizontal run over 14 (structure walls included, gaps cut in plain ones).
  for (let y = 1; y <= BOTTOM; y++) {
    let cnt = 0, run = 0;
    for (let x = 1; x < W - 1; x++) {
      const i = I(x, y), u = MATERIALS[g.mat[i]].kind === "unbreakable" && g.mat[i] !== MAT.SEED;
      if (u) {
        cnt++; run++;
        const struct = !!(g.flag[i] & FLAG.STRUCT);
        if ((run > 14 || cnt > 46 * 0.45) && !struct) { g.set(x, y, g.def(x, y).host); run = 0; cnt--; }
      } else run = 0;
    }
  }
  // Routing rule part 2: dense plus unbreakable under 60% of a row.
  for (let y = 1; y <= BOTTOM; y++) {
    let c = 0;
    for (let x = 1; x < W - 1; x++) { const m = MATERIALS[g.mat[I(x, y)]]; if (m.dense || (m.kind === "unbreakable" && !(g.flag[I(x, y)] & FLAG.STRUCT))) c++; }
    for (let x = 1; x < W - 1 && c >= 46 * 0.6; x += 3) if (MATERIALS[g.mat[I(x, y)]].dense) { g.set(x, y, g.def(x, y).host); c--; }
  }
}

// 7. Ores.
function oreOk(g: Ctx, x: number, y: number, pocket = false) {
  if (x < 1 || x > W - 2 || y < 1 || y > BOTTOM || x === LIFT_X) return false;
  const i = I(x, y), m = MATERIALS[g.mat[i]];
  if (g.find[i] || g.haz[i] || m.dense) return false;
  if (m.kind !== "rock" && m.kind !== "soil") return false;
  if (g.flag[i] & FLAG.STRUCT) return pocket && (g.mat[i] === MAT.BRICK || g.mat[i] === MAT.LINING);
  return true;
}
/** Grow one vein from a seed by the ore's form; returns the tiles placed. */
function growVein(g: Ctx, r: Rng, id: number, form: OreGen["form"], size: number, sx: number, sy: number, ok: (x: number, y: number) => boolean): Pt[] {
  const tiles: Pt[] = [{ x: sx, y: sy }];
  g.find[I(sx, sy)] = id;
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let k = 1, fails = 0; k < size && fails < 12;) {
    let from = tiles[tiles.length - 1];
    let dx = 0, dy = 0;
    if (form === "vein") { if (r.chance(0.25)) from = r.pick(tiles); [dx, dy] = r.pick(N4); }
    else if (form === "cluster" || form === "pocket") { from = r.pick(tiles); dx = r.int(-1, 1); dy = r.int(-1, 1); }
    else { from = tiles[0]; [dx, dy] = r.pick(N4); }
    const nx = from.x + dx, ny = from.y + dy;
    if ((dx || dy) && ok(nx, ny)) { g.find[I(nx, ny)] = id; tiles.push({ x: nx, y: ny }); k++; } else fails++;
  }
  return tiles;
}
/** A seed row by the ore's triangular weight. */
function oreRow(r: Rng, id: number): number {
  const f = FINDS[id];
  for (let t = 0; t < 100; t++) { const y = r.int(f.rows![0], Math.min(BOTTOM, f.rows![1])); if (r.next() < oreWeight(id, y)) return y; }
  return ORE_GEN_PEAK(id);
}
const ORE_GEN_PEAK = (id: number) => oreGen(id, "vell").peak;

function passOres(g: Ctx) {
  const mul = g.pd.oreCount;
  for (const id of ORE_IDS) {
    if (!oreOnPlanet(id, g.planet)) continue;
    const gen = oreGen(id, g.planet), r = g.r("ore:" + FINDS[id].key);
    const veins = Math.round(gen.veins * mul);
    // Pocket seeds on open structures' walls.
    const wallSeeds: Pt[] = [];
    if (gen.pocket === "room" || gen.pocket === "hollow" || gen.pocket === "lake") {
      const f = FINDS[id];
      for (let y = Math.max(1, f.rows![0]); y <= Math.min(BOTTOM, f.rows![1]); y++) for (let x = 1; x < W - 1; x++) {
        if (!oreOk(g, x, y, gen.pocket === "room")) continue;
        const i = I(x, y);
        let hit = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = I(x + dx, y + dy);
          if (gen.pocket === "lake") hit ||= g.mat[j] === MAT.LAVA;
          else if (gen.pocket === "room") hit ||= g.mat[j] === 0 && !!(g.flag[j] & FLAG.STRUCT) && g.slot(x, y) === 5;
          else hit ||= g.mat[j] === 0 && !!(g.flag[j] & FLAG.CAVE) && g.slot(x, y) === 3;
        }
        if (hit && oreWeight(id, y) > 0) wallSeeds.push({ x, y });
        void i;
      }
    }
    if (gen.pocket === "hollow") {
      // Moonstone: about 20 hollow wall tiles in its band.
      const n = Math.round(20 * mul);
      for (let k = 0; k < n && wallSeeds.length; k++) {
        const t = wallSeeds.splice(Math.floor(r.next() * wallSeeds.length), 1)[0];
        if (r.next() < 0.3 + oreWeight(id, t.y)) g.find[I(t.x, t.y)] = id; else k--;
      }
      continue;
    }
    if (gen.pocket === "lake") for (const t of wallSeeds) if (r.chance(0.15)) g.find[I(t.x, t.y)] = id;
    for (let v = 0; v < veins; v++) {
      const rolled = r.int(gen.size[0], gen.size[1]);
      const size = g.oreMult === 1 ? rolled : Math.max(1, Math.round(rolled * g.oreMult));
      let seed: Pt | null = null;
      if (gen.pocket === "room" && wallSeeds.length && r.chance(0.5)) seed = r.pick(wallSeeds);
      for (let t = 0; t < 20 && !seed; t++) { const y = oreRow(r, id), x = r.int(1, W - 2); if (oreOk(g, x, y)) seed = { x, y }; }
      if (!seed || !oreOk(g, seed.x, seed.y, true)) continue;
      growVein(g, r, id, gen.form, size, seed.x, seed.y, (x, y) => oreOk(g, x, y));
    }
  }
}

/** Fair-start ores (world.md 6 checks 2, 3, 5), stamped right after the ore pass so caches and hazards keep clear of them. */
function passFairOres(g: Ctx) {
  const r = g.r("fair");
  const count = (id: number, x0: number, x1: number, y0: number, y1: number) => {
    let c = 0;
    for (let y = y0; y <= y1; y++) for (let x = Math.max(1, x0); x <= Math.min(W - 2, x1); x++) if (g.find[I(x, y)] === id) c++;
    return c;
  };
  const stamp = (id: number, x0: number, x1: number, y0: number, y1: number, size: number, form: OreGen["form"]) => {
    for (let t = 0; t < 60; t++) {
      const x = r.int(x0, x1), y = r.int(y0, y1);
      if (!oreOk(g, x, y)) continue;
      const placed = growVein(g, r, id, form, size, x, y, (xx, yy) => xx >= x0 && xx <= x1 && yy >= y0 && yy <= y1 && oreOk(g, xx, yy));
      if (placed.length >= Math.min(size, 3)) return placed.length;
    }
    return 0;
  };
  const cu = findByKey("copper")!.id, coal = findByKey("coal")!.id, tin = findByKey("tin")!.id;
  // Starter vein: 6 Copper in rows 3-10 within 6 columns of the mouth, 2 of them on the first screen (rows <= 7).
  for (let k = 0; k < 4 && count(cu, LIFT_X - 6, LIFT_X + 6, 3, 10) < 6; k++) stamp(cu, LIFT_X - 6, LIFT_X + 6, 3, 10, 6, "vein");
  for (let k = 0; k < 4 && count(cu, LIFT_X - 6, LIFT_X + 6, 3, 7) < 2; k++) stamp(cu, LIFT_X - 6, LIFT_X + 6, 3, 7, 3, "vein");
  for (let k = 0; k < 4 && count(coal, LIFT_X - 12, LIFT_X + 12, 2, 8) < 4; k++) stamp(coal, LIFT_X - 12, LIFT_X + 12, 2, 8, 5, "vein");
  if (count(tin, 1, W - 2, 18, 22) < 2) stamp(tin, 3, 44, 18, 22, 3, "cluster");
  // First ore pays: 8 tiles of each biome's first ore in its first 20 rows within 10 columns of the mouth.
  const first: Record<number, string> = { 1: "iron", 2: "quartz", 3: g.pd.own === 3 ? "jade" : "sporestone", 4: "cinnabar", 5: "sower_scrap", 6: "heartstone" };
  for (let s = 1; s <= 6; s++) {
    const id = findByKey(first[s])!.id, top = g.defs[s].rows[0];
    for (let k = 0; k < 6 && count(id, LIFT_X - 10, LIFT_X + 10, top, top + 19) < 8; k++) stamp(id, LIFT_X - 10, LIFT_X + 10, top + 1, top + 19, 5, oreGen(id, g.planet).form === "scattered" ? "cluster" : oreGen(id, g.planet).form);
  }
}

// 8. Caches: one per 15-row slice of each biome.
function passCaches(g: Ctx) {
  const r = g.r("caches");
  for (let s = 0; s < 7; s++) {
    const d = g.defs[s], cd = CACHES[d.id];
    const end = s === 6 ? 745 : d.rows[1]; // the Core's caches stay out of the chamber
    const span = end - d.rows[0] + 1, n = cd.count, slice = span / n;
    for (let k = 0; k < n; k++) {
      const y0 = Math.floor(d.rows[0] + k * slice), y1 = Math.floor(d.rows[0] + (k + 1) * slice) - 1;
      const touch = r.chance(0.7);
      let spot: Pt | null = null;
      for (let t = 0; t < 120 && !spot; t++) {
        const y = r.int(Math.max(2, y0), y1), x = r.int(3, 44);
        if (inKeep(x) || g.biome[I(x, y)] !== s || !g.plain(x, y)) continue;
        if (touch && t < 90) {
          let adj = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = I(x + dx, y + dy); adj ||= g.mat[j] === 0 || !!(g.flag[j] & FLAG.STRUCT); }
          if (!adj) continue;
        }
        spot = { x, y };
      }
      if (!spot) continue;
      const i = I(spot.x, spot.y);
      g.back[i] = g.mat[i]; g.mat[i] = cd.mat;
      g.caches.push({ x: spot.x, y: spot.y, kind: cd.key, ...cacheContents(g.seed, g.planet, s, spot.x, spot.y) });
    }
  }
}

/** What a cache holds (world.md 4): 3 x yield pieces from the upper half of the biome's tiers whose band covers the row; 1 in 3 an item. */
export function cacheContents(seed: number, planet: PlanetId, slot: number, x: number, y: number): { pieces: { find: number; count: number }[]; item?: string } {
  const r = rng(hash32(seed, "cache", x, y));
  const ores = ORE_IDS.filter((id) => oreOnPlanet(id, planet) && FINDS[id].biome === slot);
  const tiers = [...new Set(ores.map((id) => FINDS[id].tier))].sort((a, b) => a - b);
  const cut = tiers.length ? tiers[Math.floor(tiers.length / 2)] : 0;
  let cand = ORE_IDS.filter((id) => oreOnPlanet(id, planet) && oreWeight(id, y) > 0 && FINDS[id].tier >= cut);
  if (!cand.length) cand = ores.filter((id) => FINDS[id].tier >= cut);
  if (!cand.length) cand = ores;
  const n = 3 * piecesPerTile(slot), counts = new Map<number, number>();
  for (let k = 0; k < n; k++) {
    let tot = 0;
    for (const id of cand) tot += 0.2 + oreWeight(id, y);
    let v = r.next() * tot, pick = cand[0];
    for (const id of cand) { v -= 0.2 + oreWeight(id, y); if (v <= 0) { pick = id; break; } }
    counts.set(pick, (counts.get(pick) ?? 0) + 1);
  }
  const pieces = [...counts].map(([find, count]) => ({ find, count }));
  if (r.next() < 1 / 3) return { pieces, item: r.pick(slot < 4 ? CACHE_ITEMS.shallow : CACHE_ITEMS.deep) };
  return { pieces };
}

// 9. Hazards, with intro ramps.
function passHazards(g: Ctx) {
  const nearCache = (x: number, y: number, d: number) => g.caches.some((c) => Math.abs(c.x - x) <= d && Math.abs(c.y - y) <= d);
  const base = (x: number, y: number) => y > 8 && !inKeep(x, HAZ_KEEP[0], HAZ_KEEP[1]) && x >= 1 && x <= W - 2 && y <= BOTTOM && !nearCache(x, y, 3);
  /** Intro ramp: the first 20 rows of the biome that introduces it: half density, tell visible from an open tile, >= 8 tiles from the Lift. */
  const ramp = (r: Rng, x: number, y: number, top: number) => y >= top + 20 || (r.chance(0.5) && g.touchesAir(x, y) && Math.abs(x - LIFT_X) >= 8);
  const slotTop = (s: number) => g.defs[s].rows[0];

  // Sand pockets (Topsoil): 6 blobs of 3-8, clear of the starter vein.
  {
    const r = g.r("sand");
    const cu = findByKey("copper")!.id;
    for (let b = 0, t = 0; b < 6 && t < 200; t++) {
      const x = r.int(2, W - 3), y = r.int(9, 55);
      if (!base(x, y) || noLoose(x, y) || !g.plain(x, y) || g.biome[I(x, y)] !== 0 || !ramp(r, x, y, 0)) continue;
      if (g.near(x, y, 2, (i) => g.find[i] === cu && ((i / W) | 0) <= 10)) continue;
      const size = r.int(3, 8), tiles: Pt[] = [{ x, y }];
      for (let k = 0; k < 30 && tiles.length < size; k++) {
        const f = r.pick(tiles), nx = f.x + r.int(-1, 1), ny = f.y + r.int(-1, 1);
        if (base(nx, ny) && !noLoose(nx, ny) && g.plain(nx, ny) && g.biome[I(nx, ny)] === 0 && !tiles.some((p) => p.x === nx && p.y === ny)) tiles.push({ x: nx, y: ny });
      }
      for (const p of tiles) g.set(p.x, p.y, MAT.SAND);
      b++;
    }
  }
  // Loose boulders, over a diggable tile; never rows 60-64.
  {
    const r = g.r("boulders");
    const rate = [0, 0.006, 0.003, 0.002, 0.002, 0.001, 0];
    for (let y = 65; y <= 679; y++) for (let x = 1; x < W - 1; x++) {
      const s = g.slot(x, y);
      if (!rate[s] || !r.chance(rate[s]) || !base(x, y) || noLoose(x, y) || !g.plain(x, y)) continue;
      const below = g.mat[I(x, y + 1)];
      if (!below || MATERIALS[below].kind === "unbreakable" || MATERIALS[below].kind === "liquid") continue;
      if (s === 1 && !ramp(r, x, y, slotTop(1))) continue;
      g.set(x, y, g.defs[s].boulder);
    }
  }
  // Gas pockets: 1-3 tiles, never touching another pocket, clear of structures and caches, never over lava.
  {
    const r = g.r("gas");
    const rate = [0, 0, 0.004, 0.002, 0.005, 0.002, 0];
    for (let y = 165; y <= 679; y++) for (let x = 1; x < W - 1; x++) {
      const s = g.slot(x, y);
      if (!rate[s] || !r.chance(rate[s])) continue;
      const okGas = (xx: number, yy: number) => base(xx, yy) && g.plain(xx, yy) && !nearCache(xx, yy, 3) && g.mat[I(xx, yy + 1)] !== MAT.LAVA
        && !g.near(xx, yy, 3, (i) => !!(g.flag[i] & FLAG.STRUCT) && g.mat[i] === 0) && !g.near(xx, yy, 2, (i) => g.haz[i] === HAZ.GAS);
      if (!okGas(x, y) || (s === 2 && !ramp(r, x, y, slotTop(2)))) continue;
      const n = r.int(1, 3), tiles: Pt[] = [{ x, y }];
      g.haz[I(x, y)] = HAZ.GAS;
      for (let k = 0; k < 6 && tiles.length < n; k++) {
        const f = r.pick(tiles), [dx, dy] = r.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        const nx = f.x + dx, ny = f.y + dy;
        if (base(nx, ny) && g.plain(nx, ny) && !nearCache(nx, ny, 3) && g.mat[I(nx, ny + 1)] !== MAT.LAVA) { g.haz[I(nx, ny)] = HAZ.GAS; tiles.push({ x: nx, y: ny }); }
      }
    }
  }
  // Spore vents (Fungal) or geysers (Cinder's Ash hollows): 1 per 8 rows on hollow floors or walls, 4 apart.
  {
    const r = g.r("vents");
    const d = g.defs[3], geyser = d.id === 7;
    const cand: Pt[] = [];
    for (let y = 285; y <= 399; y++) for (let x = 1; x < W - 1; x++) {
      if (g.slot(x, y) !== 3 || !base(x, y) || !g.plain(x, y)) continue;
      if (geyser ? !g.isAir(x, y - 1) || inKeep(x) : !g.touchesAir(x, y)) continue;
      cand.push({ x, y });
    }
    const want = Math.round(120 / 8), placed: Pt[] = [];
    for (let t = 0; t < 600 && placed.length < want && cand.length; t++) {
      const p = r.pick(cand);
      if (placed.some((q) => Math.abs(q.x - p.x) < 4 && Math.abs(q.y - p.y) < 4)) continue;
      if (!g.plain(p.x, p.y) || !ramp(r, p.x, p.y, slotTop(3))) continue;
      if (geyser) g.set(p.x, p.y, MAT.GEYSER); else g.haz[I(p.x, p.y)] = HAZ.SPORE_VENT;
      placed.push(p);
    }
  }
  // Lava pockets: 1-4 enclosed tiles; the tile above shows the tell.
  {
    const r = g.r("lavapockets");
    const rate = [0, 0, 0, 0, 0.004, 0.001, 0];
    for (let y = 420; y <= 679; y++) for (let x = 2; x < W - 2; x++) {
      const s = g.slot(x, y);
      if (!rate[s] || !r.chance(rate[s]) || inKeep(x - 0) || inKeep(x - 1) || inKeep(x + 1)) continue;
      const n = r.int(1, 4), tiles: Pt[] = [{ x, y }];
      for (let k = 1; k < n; k++) { const f = tiles[k - 1]; tiles.push(r.chance(0.6) ? { x: f.x + 1, y: f.y } : { x: f.x, y: f.y + 1 }); }
      const set = new Set(tiles.map((p) => I(p.x, p.y)));
      const fine = tiles.every((p) => base(p.x, p.y) && !inKeep(p.x) && g.plain(p.x, p.y) && !nearCache(p.x, p.y, 3)) && tiles.every((p) =>
        [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => set.has(I(p.x + dx, p.y + dy)) || (MATERIALS[g.mat[I(p.x + dx, p.y + dy)]].kind !== "air" && MATERIALS[g.mat[I(p.x + dx, p.y + dy)]].kind !== "liquid" && !g.haz[I(p.x + dx, p.y + dy)])));
      const top = tiles.reduce((a, p) => (p.y < a.y ? p : a));
      if (!fine || !g.plain(top.x, top.y - 1)) continue;
      for (const p of tiles) { const i = I(p.x, p.y); g.back[i] = g.mat[i]; g.mat[i] = MAT.LAVA; g.fluid[i] = 255; }
      for (const p of tiles) if (!set.has(I(p.x, p.y - 1)) && g.plain(p.x, p.y - 1)) g.haz[I(p.x, p.y - 1)] = HAZ.LAVA_POCKET;
    }
  }
  // Arc pylons: 1 pair per 3 rooms, across gaps 1-6 wide in rooms and corridors; never across a seal or the Lift.
  {
    const r = g.r("pylons");
    const want = Math.max(1, Math.floor(g.rooms.length / 3)), cand: [Pt, Pt][] = [];
    for (let y = 546; y <= 678; y++) for (let x = 1; x < W - 2; x++) {
      if (g.isAir(x, y) || !g.isAir(x + 1, y)) continue;
      let e = x + 1;
      while (e < W - 1 && g.isAir(e, y)) e++;
      const gap = e - x - 1;
      if (gap < 1 || gap > 6) continue;
      if (!(g.flag[I(x + 1, y)] & FLAG.STRUCT)) continue;
      if (x <= HAZ_KEEP[1] && e >= HAZ_KEEP[0]) continue;
      const okEnd = (p: Pt) => { const m = g.mat[I(p.x, p.y)]; return (m === MAT.BRICK || g.plain(p.x, p.y)) && !g.near(p.x, p.y, 1, (i) => g.mat[i] === MAT.VAULT_SEAL) && !g.find[I(p.x, p.y)]; };
      const a = { x, y }, b = { x: e, y };
      if (okEnd(a) && okEnd(b)) cand.push([a, b]);
    }
    const placed: Pt[] = [];
    for (let t = 0; t < 400 && placed.length < want && cand.length; t++) {
      const [a, b] = r.pick(cand);
      if (placed.some((p) => Math.abs(p.y - a.y) < 8 && Math.abs(p.x - a.x) < 12)) continue;
      if (a.y < 560 && Math.min(Math.abs(a.x - LIFT_X), Math.abs(b.x - LIFT_X)) < 8) continue;
      for (const p of [a, b]) { g.set(p.x, p.y, MAT.PYLON, FLAG.STRUCT); g.haz[I(p.x, p.y)] = HAZ.PYLON; }
      g.structs.push({ kind: "pylons", x: a.x, y: a.y, w: b.x - a.x + 1, h: 1 });
      placed.push(a);
    }
  }
  // False floors: 2-4 per room floor in at most half the rooms, over open space below.
  {
    const r = g.r("falsefloors");
    for (const rm of g.rooms) {
      if (rm.y < 556 || !r.chance(0.5)) continue;
      const fy = rm.y + rm.h - 1, want = r.int(2, 4);
      let n = 0;
      for (let x = rm.x + 1; x < rm.x + rm.w - 1 && n < want; x++) {
        if (inKeep(x, HAZ_KEEP[0], HAZ_KEEP[1]) || g.mat[I(x, fy)] !== MAT.BRICK || !g.isAir(x, fy - 1)) continue;
        let d = 1;
        while (d <= 3 && !g.isAir(x, fy + d)) d++;
        if (d > 3 || !(g.flag[I(x, fy + d)] & FLAG.STRUCT)) continue;
        let blocked = false;
        for (let k = 1; k < d; k++) { const m = MATERIALS[g.mat[I(x, fy + k)]]; if (m.kind === "unbreakable" || m.kind === "special" || g.find[I(x, fy + k)]) blocked = true; }
        if (blocked) continue;
        for (let k = 1; k < d; k++) g.open(x, fy + k);
        g.haz[I(x, fy)] = HAZ.FALSE_FLOOR;
        n++;
      }
    }
  }
}

// 10. Artifacts and jackpots.
function passFinds(g: Ctx, found: Set<number>) {
  const r = g.r("finds");
  const hazNear = (x: number, y: number) => g.near(x, y, 2, (i) => g.haz[i] !== 0 || g.mat[i] === MAT.GEYSER || g.mat[i] === MAT.LAVA);
  const embedOk = (x: number, y: number) => !inKeep(x) && g.plain(x, y) && !hazNear(x, y);
  const lastRows: number[] = [];
  const put = (id: number, p: Pt, art: boolean) => {
    const i = I(p.x, p.y), d = g.def(p.x, p.y);
    if (!g.mat[i] || MATERIALS[g.mat[i]].kind === "liquid") g.set(p.x, p.y, d.host, FLAG.STRUCT);
    if (art && MATERIALS[g.mat[i]].hardness > d.typical * 1.25) g.set(p.x, p.y, d.host);
    g.find[i] = id; g.haz[i] = 0;
    g.placedFinds.push(p);
    if (art) lastRows.push(p.y);
  };
  const embed = (_id: number, rows: [number, number], pred: (x: number, y: number) => boolean = () => true): Pt | null => {
    for (let pass = 0; pass < 3; pass++) for (let t = 0; t < 300; t++) {
      const y = r.int(rows[0], rows[1]), x = r.int(3, 44);
      if (!embedOk(x, y) || !pred(x, y)) continue;
      if (pass === 0 && lastRows.some((ly) => Math.abs(ly - y) < 15)) continue;
      return { x, y };
    }
    return null;
  };
  const fromAnchor = (k: string, rows?: [number, number]): Pt | null => {
    const list = (g.anchors[k] ?? []).filter((p) => !inKeep(p.x) && p.x > 0 && p.x < W - 1 && (!rows || (p.y >= rows[0] && p.y <= rows[1])));
    const good = list.filter((p) => !g.find[I(p.x, p.y)] && !hazNear(p.x, p.y) && MATERIALS[g.mat[I(p.x, p.y)]].kind !== "unbreakable");
    return good.length ? r.pick(good) : list.length ? r.pick(list) : null;
  };
  const near = (m: number) => (x: number, y: number) => g.near(x, y, 1, (i) => g.mat[i] === m);
  const own = g.pd.own;
  for (const id of ARTIFACT_IDS) {
    const f = FINDS[id], a = ARTIFACT_GEN[id];
    if (f.planet && f.planet !== g.planet) continue;
    if (!f.planet && g.planet !== "vell") {
      if (f.key !== "A13" && (f.thread === "wren" || f.biome === own)) continue;
    }
    if (f.key !== "A13" && found.has(id)) continue;
    let p: Pt | null = null;
    const rows = a.rows ?? [g.defs[f.biome].rows[0], g.defs[f.biome].rows[1]];
    switch (a.where) {
      case "embed": p = a.host ? (MATERIALS[a.host].dense ? embed(id, rows, near(a.host)) : embed(id, rows, (x, y) => g.mat[I(x, y)] === a.host) ?? embed(id, rows)) : embed(id, rows); break;
      case "wall": p = embed(id, rows, (x, y) => g.near(x, y, 1, (i) => !!(g.flag[i] & FLAG.CAVE) && g.mat[i] === 0)) ?? embed(id, rows); break;
      case "tunnel_wall": case "geode": case "near_star": case "below_shaft": case "under_mushroom": p = fromAnchor(a.where, rows) ?? embed(id, rows); break;
      default: p = fromAnchor(a.where) ?? embed(id, rows);
    }
    if (p) put(id, p, true);
  }
  for (const id of JACKPOT_IDS) {
    const f = FINDS[id], j = JACKPOT_GEN[id];
    if (f.planet && f.planet !== g.planet) continue;
    if (!f.planet && f.biome === own) continue;
    for (let k = 0; k < j.count; k++) {
      let p: Pt | null = null;
      if (j.where === "embed") p = embed(id, j.rows!);
      else {
        p = fromAnchor(j.where);
        if (!p && j.where === "tunnel_end") p = embed(id, j.rows!, (x, y) => g.near(x, y, 1, (i) => !!(g.flag[i] & FLAG.STRUCT) && g.mat[i] === 0)) ?? embed(id, j.rows!);
        if (!p && j.where === "plug") p = embed(id, [130, 158]);
        if (!p) p = embed(id, j.rows ?? [g.defs[f.biome].rows[0] + 5, g.defs[f.biome].rows[1] - 5]);
      }
      if (p) {
        put(id, p, false);
        const list = g.anchors[j.where] ?? [], at = list.findIndex((q) => q.x === p!.x && q.y === p!.y);
        if (at >= 0) list.splice(at, 1);
      }
    }
  }
}

// 11. Fair start, connectivity and the Lift column; repaired, never rerolled.
/** Reach from the mouth: down, left, right through any passable tile; up only into open air. */
export function reach(world: Pick<WorldData, "mat">, pass: (i: number) => boolean, start = I(LIFT_X, 0)): Uint8Array {
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
  let h = 0, t = 0;
  seen[start] = 1; q[t++] = start;
  while (h < t) {
    const i = q[h++], x = i % W;
    const step = (j: number) => { if (!seen[j] && pass(j)) { seen[j] = 1; q[t++] = j; } };
    if (i + W < W * H) step(i + W);
    if (x > 0) step(i - 1);
    if (x < W - 1) step(i + 1);
    if (i >= W && world.mat[i - W] === 0) step(i - W);
  }
  return seen;
}
const passable = (mat: Uint8Array) => (i: number) => { const k = MATERIALS[mat[i]].kind; return k !== "unbreakable" && k !== "liquid"; };
const passableRouting = (mat: Uint8Array) => (i: number) => { const m = MATERIALS[mat[i]]; return m.kind !== "unbreakable" && m.kind !== "liquid" && !m.dense; };

function passChecks(g: Ctx) {
  // 1, 4: the mouth; no hazard above row 8 or in the Lift's columns; no unbreakable or dense near the mouth above row 12.
  for (let y = 0; y <= 3; y++) g.open(LIFT_X, y, FLAG.DUG | FLAG.STRUCT);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y);
    if (g.haz[i] && (y <= 8 || inKeep(x, HAZ_KEEP[0], HAZ_KEEP[1]))) g.haz[i] = 0;
    if (inKeep(x) && (g.mat[i] === MAT.LAVA || g.mat[i] === MAT.GEYSER) && y < 750) { g.set(x, y, g.def(x, y).host); g.fluid[i] = 0; }
    if (inKeep(x) && g.haz[i] === HAZ.LAVA_POCKET) g.haz[i] = 0;
    if (y < 12 && Math.abs(x - LIFT_X) <= 3 && (MATERIALS[g.mat[i]].dense || (MATERIALS[g.mat[i]].kind === "unbreakable" && x > 0 && x < W - 1))) g.set(x, y, g.def(x, y).host);
    if (noLoose(x, y) && MATERIALS[g.mat[i]].kind === "loose") g.set(x, y, g.def(x, y).host);
    // 9: column 24 holds no ore, cache or artifact.
    if (x === LIFT_X && y < 750) {
      if (g.find[i]) g.find[i] = 0;
      if (MATERIALS[g.mat[i]].cache) { g.mat[i] = g.back[i] || g.def(x, y).host; g.caches = g.caches.filter((c) => c.x !== x || c.y !== y); }
    }
  }
  // 6: connectivity to the chamber, every find, cache and seal.
  const targets = (): number[] => {
    const t: number[] = [I(Math.round(CHAMBER.cx - 8), CHAMBER.cy)];
    for (const p of g.placedFinds) t.push(I(p.x, p.y));
    for (const c of g.caches) t.push(I(c.x, c.y));
    for (const v of g.vaults) t.push(I(v.seal.x, v.seal.y));
    // The tile in front of each seal first, so a repair walk arrives from outside the vault.
    for (const v of g.vaults) {
      const sx = v.seal.x, sy = v.seal.y;
      t.unshift(sy === v.r.y ? I(sx, sy - 1) : sx === v.r.x ? I(sx - 1, sy) : I(sx + 1, sy));
    }
    return t;
  };
  carveUntil(g, () => reach(g, passable(g.mat)), targets, false);
  // 7: routing: treating dense as wall, each biome's bottom row is still reachable.
  const bottoms = () => g.defs.slice(0, 6).map((d) => {
    const y = d.rows[1];
    for (let x = 2; x < W - 2; x++) if (!inKeep(x, 23, 25) && passableRouting(g.mat)(I(x, y))) return I(x, y);
    return I(10, y);
  });
  carveUntil(g, () => reach(g, passableRouting(g.mat)), bottoms, true);
}

/** Repair: from the reached tile nearest a missed target, carve toward it, turning walls into the biome's host rock. */
function carveUntil(g: Ctx, bfs: () => Uint8Array, targets: () => number[], dense: boolean) {
  const tries = new Map<number, number>();
  for (let iter = 0; iter < 40; iter++) {
    const seen = bfs();
    const missing = targets().filter((i) => !seen[i] && (tries.get(i) ?? 0) < 3);
    if (!missing.length) return;
    const t = missing[0], tx = t % W, ty = (t / W) | 0;
    tries.set(t, (tries.get(t) ?? 0) + 1);
    const vaultAt = (xx: number, yy: number) => g.vaults.some((v) => xx >= v.r.x && xx < v.r.x + v.r.w && yy >= v.r.y && yy < v.r.y + v.r.h);
    const fix = (xx: number, yy: number) => {
      const i = I(xx, yy), m = MATERIALS[g.mat[i]];
      if (g.mat[i] === MAT.SEED || g.mat[i] === MAT.BEDROCK || g.mat[i] === MAT.VAULT_SEAL || g.mat[i] === MAT.PYLON || vaultAt(xx, yy)) return;
      if (m.kind === "unbreakable" || m.kind === "liquid" || (dense && m.dense)) { g.set(xx, yy, g.def(xx, yy).host); g.fluid[i] = 0; g.haz[i] = 0; }
    };
    // Walk legs: down then across, or across then down; the nearest reached tile whose walk stays out of the vaults.
    const legs = (x0: number, y0: number, downFirst: boolean) => {
      const pts: Pt[] = [];
      let x = x0, y = y0;
      if (downFirst) { while (y < ty) pts.push({ x, y: ++y }); while (x !== tx) pts.push({ x: (x += Math.sign(tx - x)), y }); }
      else { while (x !== tx) pts.push({ x: (x += Math.sign(tx - x)), y }); while (y < ty) pts.push({ x, y: ++y }); }
      return pts;
    };
    const cands: [number, number][] = [];
    for (let i = 0; i < W * H; i++) {
      if (!seen[i]) continue;
      const y = (i / W) | 0;
      if (y <= ty) cands.push([Math.abs((i % W) - tx) + (ty - y), i]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    let path: Pt[] | null = null;
    for (const [, i] of cands.slice(0, 300)) {
      for (const df of [true, false]) {
        const p = legs(i % W, (i / W) | 0, df);
        if (p.slice(0, -1).every((q) => !vaultAt(q.x, q.y))) { path = p; break; }
      }
      if (path) break;
    }
    if (!path) continue;
    for (const q of path) { fix(q.x, q.y); if (dense && q.x + 1 < W - 1) fix(q.x + 1, q.y); }
  }
}

// ---------------------------------------------------------------- the rich pocket (R10)

/**
 * The dive's rich pocket: one vein of one ore at x2 its table's maximum size, within 25 rows below the deepest row,
 * in untouched plain rock the current drill can dig. Pure: returns the tiles to stamp (find ids), or null.
 * The caller keeps the "at most 2 unmined pockets" rule and saves the stamped tiles.
 */
export function richPocket(world: WorldData, diveCount: number, deepestRow: number, drillPower: number): { find: number; tiles: number[] } | null {
  const r = rng(hash32(world.seed, "pocket", diveCount));
  const { mat, find, haz, flag } = world;
  let reached: Uint8Array | null = null;
  const P = drillPower;
  const host = (x: number, y: number, id: number) => {
    if (x < 1 || x > W - 2 || y < 1 || y > 748 || inKeep(x, HAZ_KEEP[0], HAZ_KEEP[1])) return false;
    const i = I(x, y), m = MATERIALS[mat[i]];
    if (find[i] || haz[i] || m.dense || (flag[i] & (FLAG.DUG | FLAG.STRUCT | FLAG.LIFT)) || (m.kind !== "rock" && m.kind !== "soil")) return false;
    return tileHardness(mat[i], id) <= 2.5 * P;
  };
  const clear = (x: number, y: number) => {
    for (let j = -3; j <= 3; j++) for (let k = -3; k <= 3; k++) {
      const xx = x + k, yy = y + j;
      if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
      const i = I(xx, yy);
      if (haz[i] || mat[i] === MAT.LAVA || mat[i] === MAT.GEYSER) return false;
    }
    return true;
  };
  const ores = ORE_IDS.filter((id) => oreOnPlanet(id, world.planet));
  for (let lo = Math.max(1, deepestRow + 1); lo <= 748; lo += 25) {
    const hi = Math.min(748, lo + 24);
    const row = r.int(lo, hi);
    let tot = 0;
    for (const id of ores) tot += oreWeight(id, row);
    if (tot <= 0) continue;
    let v = r.next() * tot, id = ores[0];
    for (const o of ores) { v -= oreWeight(o, row); if (v <= 0) { id = o; break; } }
    const gen = oreGen(id, world.planet);
    for (let t = 0; t < 40; t++) {
      const x = r.int(1, W - 2), y = Math.min(hi, Math.max(lo, row + r.int(-2, 2)));
      if (!host(x, y, id) || !clear(x, y)) continue;
      reached ??= reach(world, (i) => { const m = MATERIALS[mat[i]]; return m.kind !== "unbreakable" && m.kind !== "liquid" && (mat[i] === 0 || tileHardness(mat[i]) <= 2.5 * P); });
      if (!reached[I(x, y)]) continue;
      const size = 2 * gen.size[1], tiles = [I(x, y)], set = new Set(tiles);
      const form = gen.form === "pocket" || gen.form === "scattered" ? "cluster" : gen.form;
      for (let k = 0, fails = 0; tiles.length < size && fails < 30; k++) {
        const from = form === "vein" && !r.chance(0.25) ? tiles[tiles.length - 1] : r.pick(tiles);
        const fx = from % W, fy = (from / W) | 0;
        const [dx, dy] = form === "vein" ? r.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]) : [r.int(-1, 1), r.int(-1, 1)];
        const nx = fx + dx, ny = fy + dy, ni = I(nx, ny);
        if ((dx || dy) && !set.has(ni) && host(nx, ny, id) && clear(nx, ny)) { tiles.push(ni); set.add(ni); } else fails++;
      }
      return { find: id, tiles };
    }
  }
  return null;
}

// ---------------------------------------------------------------- stats (tests, the map script, the bot)

/** Per biome slot: interior tiles, open, unbreakable, dense, diggable, ore tiles and pieces. */
export function worldStats(world: WorldData) {
  const out = Array.from({ length: 7 }, () => ({ tiles: 0, open: 0, unb: 0, dense: 0, diggable: 0, ore: 0, pieces: 0, byOre: {} as Record<string, number> }));
  for (let y = 0; y <= BOTTOM; y++) for (let x = 1; x < W - 1; x++) {
    const i = I(x, y), s = out[world.biome[i]], m = MATERIALS[world.mat[i]];
    s.tiles++;
    if (world.mat[i] === 0 || m.kind === "liquid") s.open++;
    else if (m.kind === "unbreakable") s.unb++;
    else { s.diggable++; if (m.dense) s.dense++; }
    const f = FINDS[world.find[i]];
    if (f?.kind === "ore") { s.ore++; s.pieces += piecesPerTile(world.biome[i]); s.byOre[f.key] = (s.byOre[f.key] ?? 0) + 1; }
  }
  return out;
}
