// Battle map generation (systems 10, Revision 1 R4/R25/R26/R34).
// A road is a self-avoiding walk on a coarse grid (cells 3.2 x 3.0 u), so non-adjacent
// legs are always >= 3 u apart; corners are jittered and rounded. Pads are picked
// greedily from a 0.5 u candidate grid under the tier mix, cluster, coverage, entry,
// exit and air rules. Failed maps reroll (50 tries), then a hand-made fallback.
import { Rng, hash } from "./rng.ts";
import { THEMES, type Act, type BattleMap, type Lane, type Pad, type Vec } from "./types.ts";

export const MAP_W = 32;
export const MAP_H = 18;
const COLS = 10, ROWS = 5, CW = 3.0, CH = 3.6;

/** R4 geometry. */
export const PAD = { size: 1.6, base: 1.4, spacing: 2.0, clear: 1.3, cover: 3.2, cluster: 2.8, backDist: 2.6, air: 3.4 } as const;
export const PATH_LEN: Record<Act, [number, number]> = { 1: [48, 58], 2: [46, 56], 3: [44, 54], 4: [42, 52] };
export const PAD_COUNT: Record<Act, [number, number]> = { 1: [9, 11], 2: [10, 12], 3: [11, 13], 4: [12, 14] };

export type Layout = BattleMap["layout"];
const miss = (_k: string) => null;

export interface MapOptions {
  layout?: Layout;
  /** Extra pads from relics (Ninth Pad +1, Seven Bells +2). */
  bonusPads?: number;
  /** Ninth Pad: one bonus pad on a good bend. */
  ninth?: boolean;
  /** Ascension 7 rubble: gold to clear one pad (R26). */
  rubble?: number;
}

// ---------------------------------------------------------------- polyline helpers
export function makeLane(id: number, points: Vec[], spawn: number, exit: number): Lane {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1]! + dist(points[i - 1]!, points[i]!));
  return { id, points, cum, length: cum[cum.length - 1]!, spawn, exit };
}
const dist = (a: Vec, b: Vec) => Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

/** Position at distance s along a lane. `hint` is a segment index to start from (cached by callers). */
export function laneAt(l: Lane, s: number, out: Vec, hint = 0): number {
  const pts = l.points, cum = l.cum;
  if (s <= 0) { out.x = pts[0]!.x; out.y = pts[0]!.y; return 0; }
  if (s >= l.length) { const p = pts[pts.length - 1]!; out.x = p.x; out.y = p.y; return pts.length - 2; }
  let i = Math.max(0, Math.min(hint, pts.length - 2));
  while (i > 0 && cum[i]! > s) i--;
  while (i < pts.length - 2 && cum[i + 1]! < s) i++;
  const a = pts[i]!, b = pts[i + 1]!, seg = cum[i + 1]! - cum[i]!;
  const t = seg > 0 ? (s - cum[i]!) / seg : 0;
  out.x = a.x + (b.x - a.x) * t; out.y = a.y + (b.y - a.y) * t;
  return i;
}

/** Nearest point on a lane: distance along it and distance to it. */
export function laneNearest(l: Lane, x: number, y: number): { s: number; d: number } {
  let best = Infinity, bs = 0;
  const p = l.points;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i]!, b = p[i + 1]!;
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((x - a.x) * dx + (y - a.y) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = a.x + dx * t - x, qy = a.y + dy * t - y, d2 = qx * qx + qy * qy;
    if (d2 < best) { best = d2; bs = l.cum[i]! + (l.cum[i + 1]! - l.cum[i]!) * t; }
  }
  return { s: bs, d: Math.sqrt(best) };
}

function segDist2(px: number, py: number, a: Vec, b: Vec): number {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - a.x) * dx + (py - a.y) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = a.x + dx * t - px, qy = a.y + dy * t - py;
  return qx * qx + qy * qy;
}

/** The nearest distance to a polyline: the least square, rooted once (the root keeps order, so it is the least distance). */
export function distToPolyline(pts: Vec[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) { const d = segDist2(x, y, pts[i]!, pts[i + 1]!); if (d < best) best = d; }
  return Math.sqrt(best);
}

/** The nearest distance from a spot to some lanes, where it is under `reach` (Infinity past it), for a grid walked a column at a
 *  time: `nearest(lanes, r)(x)(y)`. A column keeps the segments whose box, grown by the reach, spans its x, and a spot measures
 *  those whose grown box spans its y: every segment nearer than the reach is among them, so the least of them is the same
 *  least distToPolyline finds. */
function nearest(lanes: Lane[], reach: number) {
  const r = reach + 0.01, segs: { a: Vec; b: Vec; x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const l of lanes) for (let i = 0; i < l.points.length - 1; i++) {
    const a = l.points[i]!, b = l.points[i + 1]!;
    segs.push({ a, b, x0: Math.min(a.x, b.x) - r, x1: Math.max(a.x, b.x) + r, y0: Math.min(a.y, b.y) - r, y1: Math.max(a.y, b.y) + r });
  }
  return (x: number) => {
    const col = segs.filter((g) => x >= g.x0 && x <= g.x1);
    return (y: number) => {
      let d2 = Infinity;
      for (const g of col) if (y >= g.y0 && y <= g.y1) { const d = segDist2(x, y, g.a, g.b); if (d < d2) d2 = d; }
      return Math.sqrt(d2);
    };
  };
}

/** Samples every `step` u from s0 to s1. */
function sample(l: Lane, s0: number, s1: number, step: number): Vec[] {
  const out: Vec[] = [];
  for (let s = s0; s <= s1 + 1e-9; s += step) { const v = { x: 0, y: 0 }; laneAt(l, s, v); out.push(v); }
  return out;
}

// ---------------------------------------------------------------- grid walk
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const; // E S W N
const cellOf = (i: number, j: number) => j * COLS + i;
const ci = (c: number) => c % COLS;
const cj = (c: number) => Math.floor(c / COLS);
const cx = (i: number) => 2.5 + CW * i;
const cy = (j: number) => 1.8 + CH * j;

function reachable(from: number, blocked: Uint8Array, goal: (c: number) => boolean): boolean {
  if (goal(from)) return true;
  const seen = new Uint8Array(COLS * ROWS), q = [from];
  seen[from] = 1;
  while (q.length) {
    const c = q.pop()!;
    for (const [dx, dy] of DIRS) {
      const i = ci(c) + dx, j = cj(c) + dy;
      if (i < 0 || j < 0 || i >= COLS || j >= ROWS) continue;
      const n = cellOf(i, j);
      if (seen[n] || blocked[n]) continue;
      if (goal(n)) return true;
      seen[n] = 1; q.push(n);
    }
  }
  return false;
}

/**
 * Random self-avoiding walk from `start` until `goal`, with `nMin..nMax` steps.
 * `dist` estimates steps left to the goal (for the budget); `bias` weights directions.
 */
function walk(rng: Rng, start: number, startDir: number, goal: (c: number) => boolean, dist: (c: number) => number,
  nMin: number, nMax: number, blocked0: Uint8Array, bias: number[]): number[] | null {
  const blocked = blocked0.slice();
  const path = [start];
  blocked[start] = 1;
  let c = start, dir = startDir;
  for (let steps = 0; steps < nMax; steps++) {
    const opts: { n: number; d: number; w: number }[] = [];
    for (let d = 0; d < 4; d++) {
      if (d === ((dir + 2) & 3)) continue;
      const i = ci(c) + DIRS[d]![0], j = cj(c) + DIRS[d]![1];
      if (i < 0 || j < 0 || i >= COLS || j >= ROWS) continue;
      const n = cellOf(i, j);
      if (blocked[n] && !goal(n)) continue;
      const left = nMax - steps - 1;
      if (dist(n) > left) continue;
      if (goal(n)) { if (steps + 1 < nMin) continue; opts.push({ n, d, w: 1e6 }); continue; }
      blocked[n] = 1;
      const ok = reachable(n, blocked, goal);
      blocked[n] = 0;
      if (!ok) continue;
      let w = bias[d]!;
      if (d === dir) w *= 1.35;
      opts.push({ n, d, w });
    }
    if (!opts.length) return null;
    const o = rng.weighted(opts, (x) => x.w);
    path.push(o.n);
    c = o.n; dir = o.d;
    if (goal(c)) return path;
    blocked[c] = 1;
  }
  return null;
}

// ---------------------------------------------------------------- road shapes
interface Road {
  cells: number[][];          // per lane: cell sequence
  entry: Vec[];               // per lane: edge entry point
  exit: Vec;                  // edge exit point
  spawnOf: number[];          // per lane: spawn index
  spawns: Vec[];
  /** Per lane: [s0, s1] cell index range that is unique to this lane (lane 0: all). */
  unique: [number, number][];
}

function edgePoint(c: number, side: "W" | "E" | "N" | "S"): Vec {
  const i = ci(c), j = cj(c);
  return side === "W" ? { x: 0, y: cy(j) } : side === "E" ? { x: MAP_W, y: cy(j) } : side === "N" ? { x: cx(i), y: 0 } : { x: cx(i), y: MAP_H };
}

function dirOf(a: number, b: number): number {
  const dx = ci(b) - ci(a), dy = cj(b) - cj(a);
  return dx === 1 ? 0 : dy === 1 ? 1 : dx === -1 ? 2 : 3;
}

function runs(cells: number[]): { d: number; n: number }[] {
  const out: { d: number; n: number }[] = [];
  for (let k = 1; k < cells.length; k++) {
    const dx = ci(cells[k]!) - ci(cells[k - 1]!), dy = cj(cells[k]!) - cj(cells[k - 1]!);
    const d = dx === 1 ? 0 : dy === 1 ? 1 : dx === -1 ? 2 : 3;
    if (out.length && out[out.length - 1]!.d === d) out[out.length - 1]!.n++;
    else out.push({ d, n: 1 });
  }
  return out;
}

/** Hairpins: a 1-step connector between two opposite legs of >= 2 steps (one pad covers both). */
export function hairpins(cells: number[]): number {
  const r = runs(cells);
  let n = 0;
  for (let k = 1; k < r.length - 1; k++)
    if (r[k]!.n === 1 && r[k - 1]!.d === ((r[k + 1]!.d + 2) & 3) && r[k - 1]!.n >= 2 && r[k + 1]!.n >= 2) n++;
  return n;
}

function mainLane(rng: Rng, act: Act, layout: Layout): { cells: number[]; j0: number } | null {
  const j0 = rng.int(0, ROWS - 1);
  const [lo, hi0] = PATH_LEN[act];
  const hi = layout === "single" ? hi0 : hi0 - 2;
  const nMin = Math.ceil((lo - 5) / 3.6), nMax = Math.floor((hi - 5) / 3.0);
  const cells = walk(rng, cellOf(0, j0), 0, (c) => ci(c) === COLS - 1, (c) => COLS - 1 - ci(c), nMin, nMax,
    new Uint8Array(COLS * ROWS), [1.0, 1.15, 0.55, 1.15]);
  if (!cells) return null;
  const h = hairpins(cells);
  if (h < 1 || h > 2) return null;
  const r = runs(cells);
  const bends = r.length - 1 + (r[0]!.d !== 0 ? 1 : 0);
  if (bends < 4 || bends > 8) return null;
  // spread over the board: top and bottom rows both used (height >= 70%)
  if (!cells.some((c) => cj(c) === 0) || !cells.some((c) => cj(c) === ROWS - 1)) return null;
  const straight = r.some((x, k) => (x.d === 0 || x.d === 2) ? x.n >= 3 || ((k === 0 || k === r.length - 1) && x.d === 0 && x.n >= 2) : x.n >= 3);
  if (!straight) return null;
  return { cells, j0 };
}

function road(rng: Rng, act: Act, layout: Layout): Road | null {
  const m = mainLane(rng, act, layout);
  if (!m) return miss("main");
  const main = m.cells;
  const base: Road = { cells: [main], entry: [edgePoint(main[0]!, "W")], exit: edgePoint(main[main.length - 1]!, "E"), spawnOf: [0], spawns: [edgePoint(main[0]!, "W")], unique: [[0, main.length - 1]] };
  if (layout === "single") return base;
  const onMain = new Uint8Array(COLS * ROWS);
  for (const c of main) onMain[c] = 1;
  if (layout === "merge") {
    // join at 40-60% of the main lane's cells; the branch enters from the top, bottom or left edge
    const sp0 = base.spawns[0]!;
    for (let t = 0; t < 16; t++) {
      const k = Math.round(main.length * rng.range(0.4, 0.6));
      const J = main[k]!;
      const side = rng.pick(["N", "S", "W"] as const);
      const starts: number[] = [];
      if (side === "W") { for (let j = 0; j < ROWS; j++) { const c = cellOf(0, j); if (!onMain[c] && Math.abs(cy(j) - sp0.y) >= 6) starts.push(c); } }
      else for (let i = 1; i < COLS - 2; i++) {
        const c = cellOf(i, side === "N" ? 0 : ROWS - 1);
        const ep = edgePoint(c, side);
        if (!onMain[c] && dist(ep, sp0) >= 6) starts.push(c);
      }
      if (!starts.length) continue;
      const s0 = rng.pick(starts);
      const blocked = onMain.slice(); blocked[J] = 0;
      const branch = walk(rng, s0, side === "N" ? 1 : side === "S" ? 3 : 0, (c) => c === J, (c) => Math.abs(ci(c) - ci(J)) + Math.abs(cj(c) - cj(J)),
        Math.max(3, k - 6), Math.max(4, k - 2), blocked, [1, 1, 1, 1]);
      if (!branch) continue;
      const lane2 = [...branch.slice(0, -1), ...main.slice(k)];
      const sp = edgePoint(s0, side);
      return { ...base, cells: [main, lane2], entry: [base.entry[0]!, sp], spawnOf: [0, 1], spawns: [base.spawns[0]!, sp], unique: [[0, main.length - 1], [0, branch.length - 1]] };
    }
    return miss("m-branch");
  }
  // fork: split at 25-45%, a detour of 3-5 steps rejoining 2-3 cells later
  for (let tries = 0; tries < 12; tries++) {
    const a = Math.round(main.length * rng.range(0.25, 0.45)), b = a + rng.int(2, 3);
    if (b >= main.length - 3) continue;
    const blocked = onMain.slice(); blocked[main[b]!] = 0;
    const B = main[b]!;
    const det = walk(rng, main[a]!, dirOf(main[a - 1]!, main[a]!), (c) => c === B, (c) => Math.abs(ci(c) - ci(B)) + Math.abs(cj(c) - cj(B)),
      b - a + 2, b - a + 4, blocked, [1, 1, 1, 1]);
    if (!det || det.length < 4) continue;
    const lane2 = [...main.slice(0, a), ...det.slice(0, -1), ...main.slice(b)];
    return { ...base, cells: [main, lane2], entry: [base.entry[0]!, base.entry[0]!], spawnOf: [0, 0], unique: [[0, main.length - 1], [a, a + det.length - 1]] };
  }
  return null;
}

/** Cell walk -> rounded polyline; corners get a small deterministic per-cell jitter. */
function polyline(cells: number[], entry: Vec, exit: Vec, jit: Float64Array): { pts: Vec[]; cellS: number[] } {
  const raw: Vec[] = [entry, ...cells.map((c) => ({ x: cx(ci(c)), y: cy(cj(c)) })), exit];
  const ucum = [0];
  for (let k = 1; k < raw.length; k++) ucum.push(ucum[k - 1]! + dist(raw[k - 1]!, raw[k]!));
  const cellS = cells.map((_, k) => ucum[k + 1]!);
  // corners only (the grid makes collinearity exact before jitter)
  const keep: Vec[] = [raw[0]!];
  const keepCell: number[] = [-1];
  for (let k = 1; k < raw.length - 1; k++) {
    const a = raw[k - 1]!, p = raw[k]!, b = raw[k + 1]!;
    const cross = (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x);
    if (Math.abs(cross) > 1e-9) { keep.push({ x: p.x + jit[cells[k - 1]! * 2]!, y: p.y + jit[cells[k - 1]! * 2 + 1]! }); keepCell.push(cells[k - 1]!); }
  }
  keep.push(raw[raw.length - 1]!);
  // gates follow the neighbouring corner along their edge so the first and last legs stay straight
  const g0 = keep[0]!, n0 = keep[1]!;
  if (keep.length > 2) keep[0] = g0.x === 0 || g0.x === MAP_W ? { x: g0.x, y: n0.y } : { x: n0.x, y: g0.y };
  const gl = keep[keep.length - 1]!, nl = keep[keep.length - 2]!;
  if (keep.length > 2) keep[keep.length - 1] = gl.x === 0 || gl.x === MAP_W ? { x: gl.x, y: nl.y } : { x: nl.x, y: gl.y };
  // staircases (a left then a right turn one cell apart) get a diagonal jog: 45° bends
  for (let k = 1; k < keep.length - 2; k++) {
    const a = keep[k - 1]!, p = keep[k]!, q = keep[k + 1]!, c = keep[k + 2]!;
    const c1 = (p.x - a.x) * (q.y - p.y) - (p.y - a.y) * (q.x - p.x);
    const c2 = (q.x - p.x) * (c.y - q.y) - (q.y - p.y) * (c.x - q.x);
    if (dist(p, q) < 3.9 && c1 * c2 < 0 && dist(a, p) > 2.4 && dist(q, c) > 2.4) {
      const d1 = Math.min(1.6, dist(a, p) * 0.4), d2 = Math.min(1.6, dist(q, c) * 0.4);
      const p1 = { x: p.x + (a.x - p.x) * (d1 / dist(a, p)), y: p.y + (a.y - p.y) * (d1 / dist(a, p)) };
      const q1 = { x: q.x + (c.x - q.x) * (d2 / dist(q, c)), y: q.y + (c.y - q.y) * (d2 / dist(q, c)) };
      keep.splice(k, 2, p1, q1);
      k++;
    }
  }
  // middle-length legs bow gently sideways (the longest leg stays straight for Siege Bolts)
  let longest = 0;
  for (let k = 1; k < keep.length; k++) longest = Math.max(longest, dist(keep[k - 1]!, keep[k]!));
  for (let k = 1; k < keep.length; k++) {
    const a = keep[k - 1]!, c = keep[k]!, l = dist(a, c);
    if (l < 4.5 || l >= longest - 1e-9 || k === 1 || k === keep.length - 1) continue;
    const j = jit[((k * 7) % jit.length)]! * 1.6; // deterministic, -0.56..0.56
    const nx = -(c.y - a.y) / l, ny = (c.x - a.x) / l;
    keep.splice(k, 0, { x: (a.x + c.x) / 2 + nx * j, y: (a.y + c.y) / 2 + ny * j });
    k++;
  }
  // round every corner with a wide quadratic bezier, sampled densely so it reads as a curve
  const out: Vec[] = [keep[0]!];
  for (let k = 1; k < keep.length - 1; k++) {
    const a = keep[k - 1]!, p = keep[k]!, b = keep[k + 1]!;
    const la = dist(a, p), lb = dist(p, b);
    const r = Math.min(1.8, la * 0.45, lb * 0.45);
    const p0 = { x: p.x + (a.x - p.x) * (r / la), y: p.y + (a.y - p.y) * (r / la) };
    const p2 = { x: p.x + (b.x - p.x) * (r / lb), y: p.y + (b.y - p.y) * (r / lb) };
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, u = 1 - t;
      out.push({ x: u * u * p0.x + 2 * u * t * p.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p.y + t * t * p2.y });
    }
  }
  out.push(keep[keep.length - 1]!);
  return { pts: out, cellS };
}

/** Air route: the ground lane pulled toward its spawn-exit chord until 65-80% of its length, then smoothed. */
export function airRoute(id: number, l: Lane): Lane {
  const n = Math.max(8, Math.round(l.length));
  const base: Vec[] = [];
  for (let k = 0; k <= n; k++) { const v = { x: 0, y: 0 }; laneAt(l, (l.length * k) / n, v); base.push(v); }
  const A = base[0]!, B = base[n]!;
  // Pulled and smoothed in flat arrays, the 25 tries of the search sharing two buffers (a Vec per point per try was a quarter
  // of a map's making); the same sums in the same order, so the same route.
  const bufs = [new Float64Array((n + 1) * 16), new Float64Array((n + 1) * 16)]; // three halvings: 8 points a point, x and y
  const pullSmooth = (al: number): { p: Float64Array; m: number } => {
    let p = bufs[0]!, m = n + 1;
    for (let k = 0; k <= n; k++) {
      const b = base[k]!, t = k / n, qx = A.x + (B.x - A.x) * t, qy = A.y + (B.y - A.y) * t;
      p[k * 2] = b.x + (qx - b.x) * al; p[k * 2 + 1] = b.y + (qy - b.y) * al;
    }
    for (let it = 0; it < 3; it++) {
      const q = p === bufs[0] ? bufs[1]! : bufs[0]!;
      let o = 0;
      q[o++] = p[0]!; q[o++] = p[1]!;
      for (let k = 0; k < m - 1; k++) {
        const ax = p[k * 2]!, ay = p[k * 2 + 1]!, bx = p[k * 2 + 2]!, by = p[k * 2 + 3]!;
        q[o++] = ax * 0.75 + bx * 0.25; q[o++] = ay * 0.75 + by * 0.25;
        q[o++] = ax * 0.25 + bx * 0.75; q[o++] = ay * 0.25 + by * 0.75;
      }
      q[o++] = p[(m - 1) * 2]!; q[o++] = p[(m - 1) * 2 + 1]!;
      p = q; m = o / 2;
    }
    return { p, m };
  };
  const len = ({ p, m }: { p: Float64Array; m: number }) => {
    let s = 0;
    for (let k = 1; k < m; k++) { const dx = p[(k - 1) * 2]! - p[k * 2]!, dy = p[(k - 1) * 2 + 1]! - p[k * 2 + 1]!; s += Math.sqrt(dx * dx + dy * dy); }
    return s;
  };
  let lo = 0, hi = 1, al = 1;
  if (len(pullSmooth(1)) < 0.72 * l.length) {
    for (let it = 0; it < 24; it++) {
      const mid = (lo + hi) / 2, L = len(pullSmooth(mid));
      al = mid;
      if (L > 0.72 * l.length) lo = mid; else hi = mid;
    }
  }
  const { p, m } = pullSmooth(al);
  const best: Vec[] = [];
  for (let k = 0; k < m; k++) best.push({ x: p[k * 2]!, y: p[k * 2 + 1]! });
  // thin to ~1 u spacing
  const thin: Vec[] = [best[0]!];
  for (let k = 1; k < best.length - 1; k++) if (dist(thin[thin.length - 1]!, best[k]!) >= 0.8) thin.push(best[k]!);
  thin.push(best[best.length - 1]!);
  return makeLane(id, thin, l.spawn, l.exit);
}

// ---------------------------------------------------------------- pads
interface Cand { x: number; y: number; score: number; air: number }

/** Coverage samples: shared road parts once. */
function unionSamples(lanes: Lane[], unique: [number, number][]): Vec[] {
  const out: Vec[] = [];
  lanes.forEach((l, i) => { const [a, b] = unique[i]!; out.push(...sample(l, a, b, 0.5)); });
  return out;
}

function scoreAt(x: number, y: number, samples: Vec[]): number {
  let n = 0;
  const r2 = PAD.cover * PAD.cover;
  for (const s of samples) { const dx = s.x - x, dy = s.y - y; if (dx * dx + dy * dy <= r2) n++; }
  return n * 0.5;
}

export function tierOf(score: number): Pad["tier"] { return score >= 10 ? "prime" : score >= 6 ? "good" : "back"; }

function placePads(rng: Rng, act: Act, lanes: Lane[], unique: [number, number][], air: Lane[]): Pad[] | null {
  const samples = unionSamples(lanes, unique);
  const entry: Vec[] = [], exits: Vec[][] = [];
  for (const l of lanes) { entry.push(...sample(l, 0, 4, 0.25)); exits.push(sample(l, l.length - 8, l.length, 0.25)); }
  const r2 = PAD.cover * PAD.cover;
  const near2 = (s: Vec, c: Vec) => (s.x - c.x) * (s.x - c.x) + (s.y - c.y) * (s.y - c.y) <= r2;
  const cands: Cand[] = [];
  // Each test below is a distance under a reach (the road's under PAD.backDist, a sample's under PAD.cover, the air route's under
  // PAD.air), so a spot looks only at what lies within that reach of its column, taken once per column as the grid is walked:
  // the same answers, without measuring the whole map from every spot (a map is placed many times over before one passes, and
  // this loop was most of a battle's start). A distance past its reach comes back Infinity, which no test tells apart.
  const road = nearest(lanes, PAD.backDist), sky = nearest(air, PAD.air);
  const cover = (pts: Vec[]) => { const r = PAD.cover + 0.01; return (x: number) => pts.filter((s) => s.x >= x - r && s.x <= x + r); };
  const sampleCol = cover(samples), entryCol = cover(entry);
  for (let x = 1.0; x <= MAP_W - 1.0 + 1e-9; x += 0.5) {
    const roadAt = road(x), skyAt = sky(x), near = sampleCol(x), ent = entryCol(x);
    for (let y = 1.0; y <= MAP_H - 1.0 + 1e-9; y += 0.5) {
      const d = roadAt(y);
      if (d < PAD.clear) continue;
      const c = { x, y };
      if (ent.some((s) => near2(s, c))) continue;
      const score = scoreAt(x, y, near);
      if (score > 16 || score < 3) continue;
      if (score < 6 && d < PAD.backDist) continue;
      cands.push({ x, y, score, air: skyAt(y) });
    }
  }
  const [cMin, cMax] = PAD_COUNT[act];
  const n = rng.int(cMin, cMax);
  const nPrime = rng.int(2, 3), nBack = act >= 3 ? 3 : rng.int(2, 3);
  const chosen: Cand[] = [];
  const free = (c: Cand) => chosen.every((p) => (p.x - c.x) * (p.x - c.x) + (p.y - c.y) * (p.y - c.y) >= PAD.spacing * PAD.spacing - 1e-9);
  const noise = () => rng.next() * 0.8;
  const isPrime = (c: Cand) => c.score >= 10;
  const covered = new Uint8Array(samples.length);
  const add = (c: Cand) => { chosen.push(c); samples.forEach((s, i) => { if (near2(s, c)) covered[i] = 1; }); };
  const gain = (c: Cand) => { let g = 0; for (let i = 0; i < samples.length; i++) if (!covered[i] && near2(samples[i]!, c)) g++; return g * 0.5; };
  const best = (pool: Cand[], key: (c: Cand) => number): Cand | null => {
    let b: Cand | null = null, bk = -Infinity;
    for (const c of pool) { if (!free(c)) continue; const k = key(c) + noise(); if (k > bk) { bk = k; b = c; } }
    return b;
  };
  // 1. primes at distinct bends, one near the air route when possible
  const primes = cands.filter(isPrime);
  for (let k = 0; k < nPrime; k++) {
    const airHas = chosen.some((c) => c.air <= PAD.air);
    const c = best(primes.filter((p) => chosen.every((q) => dist(p, q) >= 3.5)), (p) => p.score + (!airHas && p.air <= PAD.air ? 3 : 0));
    if (!c) break;
    add(c);
  }
  if (chosen.length < 2) return miss("primes");
  // 2. two clusters: a centre with two more pads within 2.8 (sharing at most one pad)
  const centres: Cand[] = [];
  const clusterAt = (centre: Cand): boolean => {
    const near = cands.filter((c) => !isPrime(c) && dist(c, centre) <= PAD.cluster && dist(c, centre) >= PAD.spacing && free(c))
      .map((c) => ({ c, k: c.score + noise() })).sort((a, b) => b.k - a.k);
    const pick: Cand[] = [];
    for (const { c } of near) { if (pick.every((p) => dist(p, c) >= PAD.spacing)) pick.push(c); if (pick.length === 2) break; }
    if (pick.length < 2) return false;
    pick.forEach(add);
    centres.push(centre);
    return true;
  };
  for (const p of rng.shuffle([...chosen])) { if (centres.length >= 2) break; clusterAt(p); }
  const pool = rng.shuffle(cands.filter((c) => !isPrime(c) && c.score >= 6));
  for (const c of pool) {
    if (centres.length >= 2) break;
    if (!free(c) || centres.some((q) => dist(q, c) < 5)) continue;
    add(c);
    if (!clusterAt(c)) { chosen.pop(); covered.fill(0); chosen.forEach((q) => samples.forEach((s, i) => { if (near2(s, q)) covered[i] = 1; })); }
  }
  if (centres.length < 2) return miss("clusters");
  const others = cands.filter((c) => !isPrime(c));
  // 3. exit guards: >= 2 pads cover the last 8 u of each lane
  for (const ex of exits) {
    const guards = others.filter((q) => ex.some((s) => near2(s, q)));
    while (chosen.filter((c) => ex.some((s) => near2(s, c))).length < 2) {
      const c = best(guards, (q) => q.score);
      if (!c) return miss("exit");
      add(c);
    }
  }
  // 4. air route: >= 3 pads within 3.4
  while (chosen.filter((c) => c.air <= PAD.air).length < 3) {
    const c = best(others.filter((q) => q.air <= PAD.air && q.score >= 6), (q) => gain(q) + q.score * 0.2);
    if (!c) return miss("air");
    add(c);
  }
  // 5. back pads, spread out
  let nb = chosen.filter((c) => c.score < 6).length;
  const backs = cands.filter((c) => c.score < 6);
  while (nb < nBack) {
    const c = best(backs.filter((q) => chosen.every((p) => dist(p, q) >= 3)), (q) => q.score);
    if (!c) break;
    add(c); nb++;
  }
  // 6. good pads by marginal coverage until the count, and past it (to the act max) while coverage < 78%
  const goods = cands.filter((c) => c.score >= 6 && c.score < 10);
  while (chosen.length < cMax) {
    const cov = covered.reduce((a, b) => a + b, 0) / samples.length;
    if (chosen.length >= n && cov >= 0.78) break;
    const c = best(goods, (q) => gain(q) + q.score * 0.15);
    if (!c) break;
    add(c);
  }
  if (chosen.length < cMin || chosen.length > cMax) return miss("count");
  return chosen.map((c, i) => ({ id: i, x: c.x, y: c.y, score: c.score, tier: tierOf(c.score) }));
}

// ---------------------------------------------------------------- validation
/** Every constraint of systems 10 / R4 a map must pass. Returns the failures (empty = valid). */
export function checkMap(m: BattleMap): string[] {
  const f: string[] = [];
  const [lo, hi] = PATH_LEN[m.act];
  m.lanes.forEach((l, i) => {
    const min = m.layout === "merge" && i > 0 ? lo * 0.75 : lo;
    if (l.length < min - 1e-6 || l.length > hi * (i > 0 ? 1.15 : 1)) f.push(`lane ${i} length ${l.length.toFixed(1)}`);
    if (dist(l.points[0]!, l.points[l.points.length - 1]!) < 6) f.push("spawn too close to exit");
    const p0 = l.points[0]!, p1 = l.points[l.points.length - 1]!;
    const onEdge = (p: Vec) => p.x <= 1e-6 || p.y <= 1e-6 || p.x >= m.w - 1e-6 || p.y >= m.h - 1e-6;
    if (!onEdge(p0) || !onEdge(p1)) f.push(`lane ${i} gate off the edge`);
  });
  // self-distance: samples more than 6 u apart along the lane stay >= 2.2 u apart
  for (const l of m.lanes) {
    const s = sample(l, 0, l.length, 0.5);
    for (let a = 0; a < s.length; a++) for (let b = a + 14; b < s.length; b++)
      if (dist(s[a]!, s[b]!) < 2.2 - 1e-6 && Math.abs(a - b) * 0.5 > 3.6) { f.push("road touches itself"); a = s.length; break; }
  }
  // a lane's own stretch keeps 2.2 u from the other lanes, away from where it splits or joins
  for (let i = 1; i < m.lanes.length; i++) {
    const s = sample(m.lanes[i]!, 0, m.lanes[i]!.length, 0.5);
    const own = s.map((v) => m.lanes.slice(0, i).every((q) => distToPolyline(q.points, v.x, v.y) > 0.3));
    const junctions = s.filter((_, k) => k > 0 && own[k] !== own[k - 1]);
    if (own[0]) junctions.push(s[0]!);
    for (let k = 0; k < s.length; k++) {
      if (!own[k] || junctions.some((j) => dist(j, s[k]!) < 3.0)) continue;
      const d = Math.min(...m.lanes.slice(0, i).map((q) => distToPolyline(q.points, s[k]!.x, s[k]!.y)));
      if (d < 2.2) { f.push(`lane ${i} runs alongside another`); break; }
    }
  }
  // spread over the board: bounding box >= 80% wide, >= 70% tall; road or pads in all four quadrants
  const pts = m.lanes.flatMap((l) => l.points);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  if (Math.max(...xs) - Math.min(...xs) < 0.8 * m.w) f.push("road too narrow");
  if (Math.max(...ys) - Math.min(...ys) < 0.7 * m.h) f.push("road too flat");
  const marks: Vec[] = [...roadSamples(m), ...m.pads];
  for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    if (!marks.some((p) => (p.x < m.w / 2) === !qx && (p.y < m.h / 2) === !qy)) f.push(`quadrant ${qx}${qy} empty`);
  }
  // longest straight >= 7
  let longest = 0;
  for (const l of m.lanes) for (let i = 1; i < l.points.length; i++) longest = Math.max(longest, dist(l.points[i - 1]!, l.points[i]!));
  if (longest < 7) f.push(`no long straight (${longest.toFixed(1)})`);
  const pads = m.pads.filter((p) => !p.bonus);
  const [cMin, cMax] = PAD_COUNT[m.act];
  if (pads.length < cMin || pads.length > cMax) f.push(`pad count ${pads.length}`);
  for (const p of m.pads) {
    for (const l of m.lanes) if (distToPolyline(l.points, p.x, p.y) < PAD.clear - 1e-6) f.push(`pad ${p.id} on the road`);
    for (const q of m.pads) if (q.id < p.id && dist(p, q) < PAD.spacing - 1e-6) f.push(`pads ${q.id}/${p.id} too close`);
    if (p.x < 0.8 || p.y < 0.8 || p.x > m.w - 0.8 || p.y > m.h - 0.8) f.push(`pad ${p.id} off the map`);
    if (p.score > 16) f.push(`god pad ${p.id}`);
  }
  const prime = pads.filter((p) => p.tier === "prime").length, back = pads.filter((p) => p.tier === "back").length;
  if (prime < 2 || prime > 3) f.push(`prime pads ${prime}`);
  if (back < 2 || back > 4) f.push(`back pads ${back}`);
  for (const p of pads.filter((q) => q.tier === "back")) if (minRoad(m, p) < PAD.backDist - 1e-6) f.push(`back pad ${p.id} too near`);
  // clusters: two pads each with >= 2 others within 2.8, sharing at most one pad
  const sets: number[][] = [];
  for (const p of pads) {
    const near = pads.filter((q) => q !== p && dist(p, q) <= PAD.cluster + 1e-6).map((q) => q.id);
    if (near.length >= 2) sets.push([p.id, ...near]);
  }
  const twoClusters = sets.some((a, i) => sets.some((b, j) => j > i && a.filter((x) => b.includes(x)).length <= 1));
  if (!twoClusters) f.push("fewer than 2 clusters");
  // entry gap, exit guard, coverage, air
  const r = PAD.cover;
  for (const l of m.lanes) {
    const ent = sample(l, 0, 4, 0.25);
    if (m.pads.some((p) => ent.some((s) => dist(s, p) <= r - 1e-6))) f.push(`pad covers lane ${l.id} entry`);
    const ex = sample(l, l.length - 8, l.length, 0.25);
    const guards = pads.filter((p) => ex.some((s) => dist(s, p) <= r)).length;
    if (guards < 2) f.push(`exit guard ${guards}`);
  }
  const all = roadSamples(m);
  const cov = all.filter((s) => pads.some((p) => dist(s, p) <= r)).length / all.length;
  if (cov < 0.75) f.push(`coverage ${(cov * 100).toFixed(0)}%`);
  for (const a of m.air) {
    const near = pads.filter((p) => distToPolyline(a.points, p.x, p.y) <= PAD.air);
    if (near.length < 3 || !near.some((p) => p.tier === "prime")) f.push(`air route pads ${near.length}`);
    const ground = m.lanes.find((l) => l.spawn === a.spawn)!;
    const ratio = a.length / ground.length;
    if (ratio < 0.6 || ratio > 0.82) f.push(`air ratio ${ratio.toFixed(2)}`);
  }
  if (m.act >= 3 && pads.filter((p) => minRoad(m, p) >= PAD.backDist).length < 3) f.push("stomp-safe pads");
  const high = m.pads.filter((p) => p.high).length;
  if (high !== (m.act >= 3 ? 2 : 1)) f.push(`high ground ${high}`);
  return f;
}

/** Road samples every 0.5 u, parts shared by several lanes counted once. */
export function roadSamples(m: BattleMap): Vec[] {
  const out: Vec[] = [];
  m.lanes.forEach((l, i) => {
    for (const s of sample(l, 0, l.length, 0.5))
      if (i === 0 || m.lanes.slice(0, i).every((q) => distToPolyline(q.points, s.x, s.y) > 0.3)) out.push(s);
  });
  return out;
}

function minRoad(m: BattleMap, p: Vec): number {
  let d = Infinity;
  for (const l of m.lanes) d = Math.min(d, distToPolyline(l.points, p.x, p.y));
  return d;
}

// ---------------------------------------------------------------- generation
// Hand-made fallbacks (cells as [col, row]); lane 2 listed in full, `u` = its unique cell range.
const FB_MAIN: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [4, 4], [4, 3], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2]];
const FALLBACK: Record<"merge" | "fork", { lane2: [number, number][]; u: [number, number]; side: "W" | "S" }> = {
  merge: { lane2: [[9, 4], [8, 4], [7, 4], [6, 4], [5, 4], [5, 3], ...FB_MAIN.slice(9)], u: [0, 6], side: "S" },
  fork: { lane2: [...FB_MAIN.slice(0, 11), [5, 3], [6, 3], [7, 3], ...FB_MAIN.slice(13)], u: [11, 15], side: "W" },
};

function fallbackRoad(layout: Layout): Road {
  const main = FB_MAIN.map(([i, j]) => cellOf(i, j));
  const base: Road = { cells: [main], entry: [edgePoint(main[0]!, "W")], exit: edgePoint(main[main.length - 1]!, "E"), spawnOf: [0], spawns: [edgePoint(main[0]!, "W")], unique: [[0, main.length - 1]] };
  if (layout !== "merge" && layout !== "fork") return base;
  const fb = FALLBACK[layout];
  const lane2 = fb.lane2.map(([i, j]) => cellOf(i, j));
  if (layout === "merge") {
    const sp = edgePoint(lane2[0]!, "S");
    return { ...base, cells: [main, lane2], entry: [base.entry[0]!, sp], spawnOf: [0, 1], spawns: [base.spawns[0]!, sp], unique: [base.unique[0]!, fb.u] };
  }
  return { ...base, cells: [main, lane2], entry: [base.entry[0]!, base.entry[0]!], spawnOf: [0, 0], unique: [base.unique[0]!, fb.u] };
}

function build(rng: Rng, act: Act, layout: Layout, rd: Road, seed: number, flipX: boolean, flipY: boolean): BattleMap | null {
  const jit = new Float64Array(COLS * ROWS * 2);
  for (let k = 0; k < jit.length; k++) jit[k] = (rng.next() - 0.5) * 0.7;
  const lanes: Lane[] = [];
  const unique: [number, number][] = [];
  rd.cells.forEach((cells, i) => {
    const { pts, cellS } = polyline(cells, rd.entry[i]!, rd.exit, jit);
    const tr = pts.map((p) => ({ x: flipX ? MAP_W - p.x : p.x, y: flipY ? MAP_H - p.y : p.y }));
    const l = makeLane(i, tr, rd.spawnOf[i]!, 0);
    lanes.push(l);
    const [a, b] = rd.unique[i]!;
    unique.push(i === 0 ? [0, l.length] : [Math.max(0, (a > 0 ? cellS[a]! : 0) - 0.5), Math.min(l.length, (cellS[Math.min(b, cellS.length - 1)] ?? l.length) - 1.0)]);
  });
  const spawns = rd.spawns.map((p) => ({ x: flipX ? MAP_W - p.x : p.x, y: flipY ? MAP_H - p.y : p.y }));
  for (let i = 0; i < lanes.length; i++) { const p = lanes[i]!.points[0]!; spawns[rd.spawnOf[i]!] = { x: p.x, y: p.y }; }
  const e = lanes[0]!.points[lanes[0]!.points.length - 1]!;
  const air: Lane[] = [];
  spawns.forEach((_, si) => { const l = lanes.find((q) => q.spawn === si)!; air.push(airRoute(si, l)); });
  const pads = placePads(rng, act, lanes, unique, air);
  if (!pads) return null;
  const m: BattleMap = { seed, act, theme: THEMES[act], w: MAP_W, h: MAP_H, layout, lanes, air, spawns, exits: [{ x: e.x, y: e.y }], pads, water: [] };
  // high ground (R25): 1 pad, 2 from act III; never the best pad
  const byScore = [...pads].sort((a, b) => b.score - a.score || a.id - b.id);
  const highPool = byScore.slice(1).filter((p) => p.tier !== "back");
  rng.shuffle(highPool);
  for (let k = 0; k < (act >= 3 ? 2 : 1) && k < highPool.length; k++) highPool[k]!.high = true;
  return m;
}

/** Water hints: pools away from the road and pads (cosmetic). */
function addWater(rng: Rng, m: BattleMap) {
  const n = rng.int(1, 3);
  for (let t = 0; t < 60 && m.water.length < n; t++) {
    const x = rng.range(2, m.w - 2), y = rng.range(2, m.h - 2), r = rng.range(0.7, 1.5);
    if (m.lanes.some((l) => distToPolyline(l.points, x, y) < r + 1.2)) continue;
    if (m.pads.some((p) => dist(p, { x, y }) < r + 1.2)) continue;
    if (m.water.some((w) => dist(w, { x, y }) < w.r + r + 1)) continue;
    m.water.push({ x, y, r });
  }
}

export function pickLayout(rng: Rng, act: Act): Layout {
  if (act === 1) return rng.chance(0.3) ? "merge" : "single";
  return rng.weighted<Layout>(["single", "merge", "fork"], (l) => (l === "single" ? 50 : 25));
}

/** Generate a battle map. `seed` is the battle's map stream seed. */
export function generateMap(seed: number, act: Act, opt: MapOptions = {}): BattleMap & { fallback?: boolean } {
  const rng = new Rng(hash(seed, 0x6d6170));
  const layout = opt.layout ?? pickLayout(rng, act);
  let m: BattleMap | null = null;
  let fallback = false;
  for (let tries = 0; tries < 50 && !m; tries++) {
    let rd: Road | null = null;
    for (let k = 0; k < 60 && !rd; k++) rd = road(rng, act, layout);
    if (!rd) continue;
    const fx = rng.chance(0.5), fy = rng.chance(0.5);
    for (let k = 0; k < 4 && !m; k++) {
      m = build(rng, act, layout, rd, seed, fx, fy);
      if (m && checkMap(m).length) m = null;
    }
  }
  if (!m) {
    fallback = true;
    const frng = new Rng(hash(seed, 0xfa11));
    for (let t = 0; t < 200 && !m; t++) {
      m = build(frng, act, layout, fallbackRoad(layout), seed, false, false);
      if (m && checkMap(m).length) m = null;
    }
    if (!m) {
      // last resort: accept a fallback that fails a soft rule rather than no map
      for (let t = 0; t < 200 && !m; t++) m = build(frng, act, layout, fallbackRoad(layout), seed, false, false);
    }
  }
  const map = m!;
  const extra = new Rng(hash(seed, 0xb0b0));
  addBonusPads(extra, map, opt);
  if (opt.rubble) {
    const pool = map.pads.filter((p) => !p.bonus && p.tier === "prime");
    extra.pick(pool).rubble = opt.rubble;
  }
  addWater(extra, map);
  return fallback ? Object.assign(map, { fallback: true }) : map;
}

function addBonusPads(rng: Rng, m: BattleMap, opt: MapOptions) {
  let n = opt.bonusPads ?? 0;
  if (!n) return;
  const samples = roadSamples(m);
  const best = Math.max(...m.pads.map((p) => p.score));
  const cands: Pad[] = [];
  for (let x = 1.0; x <= m.w - 1; x += 0.5) for (let y = 1.0; y <= m.h - 1; y += 0.5) {
    if (m.lanes.some((l) => distToPolyline(l.points, x, y) < PAD.clear)) continue;
    if (m.pads.some((p) => dist(p, { x, y }) < PAD.spacing)) continue;
    const ent = m.lanes.some((l) => sample(l, 0, 4, 0.5).some((s) => dist(s, { x, y }) <= PAD.cover));
    if (ent) continue;
    const score = scoreAt(x, y, samples);
    if (score < 3 || score > 16 || score >= best) continue;
    cands.push({ id: 0, x, y, score, tier: tierOf(score), bonus: true });
  }
  while (n-- > 0) {
    const pool = cands.filter((c) => m.pads.every((p) => dist(p, c) >= PAD.spacing));
    const ninth = opt.ninth && !m.pads.some((p) => p.bonus);
    const good = pool.filter((c) => c.score >= 6 && c.score <= 10);
    const from = ninth && good.length ? good : pool;
    if (!from.length) return;
    from.sort((a, b) => b.score - a.score);
    const pick = from[Math.min(from.length - 1, rng.int(0, 3))]!;
    m.pads.push({ ...pick, id: m.pads.length });
  }
}
