// The ground: endless rolling hills from a seed, steeper and bumpier the further
// you get, broken every couple of hundred metres by a placed feature (a kicker
// to jump, a wall to climb, a gap to clear). Pure functions of (seed, x): the
// sim builds its collision chains from `profile`, the page draws the same
// points, so what you see is what the wheels touch.

/** hop: the first, gentle kicker that holding the gas gets over (rough, but upright); jump: one that needs a lean. */
export type FeatureKind = "hop" | "jump" | "wall" | "gap";
export type Feature = { kind: FeatureKind; x: number; end: number };

/** Metres between ground samples; the wheels (0.45 m) roll smoothly over it. */
export const STEP = 0.5;
/** The flat run-up the car starts on. */
export const START_FLAT = 30;
/** How deep a gap's pit is below the take-off side. */
export const PIT = 14;
const GAP_W = 5.5, LIP_H = 2, LIP_L = 10;
const JUMP_H = 2.4, JUMP_L = 11;
const HOP_H = 1.1, HOP_L = 10, HOP_DOWN = 4;
const WALL_H = 6.5, WALL_L = 8, WALL_EASE = 36;

/** A hash of (seed, i) to [-1, 1]: the noise lattice, stateless, so any x is the same whenever it is asked. */
function lattice(seed: number, i: number): number {
  let h = (seed ^ Math.imul(i, 0x27d4eb2d)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** Smooth 1D noise: Catmull-Rom through the lattice, so the slope is continuous too (no kinks for the wheels). */
export function noise(seed: number, x: number): number {
  const i = Math.floor(x), t = x - i;
  const p0 = lattice(seed, i - 1), p1 = lattice(seed, i), p2 = lattice(seed, i + 1), p3 = lattice(seed, i + 2);
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** How tall the hills are at x: gentle at the start, big after a kilometre. */
export const amplitude = (x: number) => 2.6 + Math.min(13, Math.max(0, x - START_FLAT) / 85);
/** The small bumps riding on them: barely there at first, a washboard late. */
export const bumpiness = (x: number) => 0.08 + Math.min(0.55, Math.max(0, x - START_FLAT) / 2400);

/** The hills alone, without the features; 0 at the start and eased in over the run-up. */
function hills(seed: number, x: number): number {
  const a = amplitude(x), b = bumpiness(x);
  const h = a * noise(seed, x / 55) + 0.4 * a * noise(seed + 101, x / 21) + b * noise(seed + 202, x / 3.5);
  const h0 = amplitude(0) * noise(seed, 0) + 0.4 * amplitude(0) * noise(seed + 101, 0) + bumpiness(0) * noise(seed + 202, 0);
  return (h - h0) * smooth((x - START_FLAT * 0.6) / (START_FLAT * 1.4));
}

/**
 * The features of a seed, in order: a gentle hop at 170 m that says the car
 * can fly, the real kicker 230-310 m after it (about 400-500 m in, where
 * leaning is the lesson), the wall, the gap, then any of the three every 150
 * to 260 m.
 */
export function features(seed: number, upTo: number): Feature[] {
  const out: Feature[] = [];
  const first: FeatureKind[] = ["hop", "jump", "wall", "gap"], kinds: FeatureKind[] = ["jump", "wall", "gap"];
  let x = 170, i = 0;
  while (x < upTo) {
    // The first three in a set order so every run meets each early; then any.
    const kind = i < first.length ? first[i] : kinds[Math.floor(((lattice(seed + 7, i) + 1) / 2) * 3) % 3];
    const len = kind === "hop" ? HOP_L + HOP_DOWN : kind === "jump" ? JUMP_L + 1 : kind === "wall" ? WALL_L + WALL_EASE : LIP_L + GAP_W + 1;
    out.push({ kind, x, end: x + len });
    x += len + (i === 0 ? 230 + ((lattice(seed + 9, i) + 1) / 2) * 80 : 150 + ((lattice(seed + 9, i) + 1) / 2) * 110);
    i++;
  }
  return out;
}

/** Feature lookup cache per seed: features are asked for every sample. */
const cache = new Map<number, Feature[]>();
function featuresAt(seed: number, x: number): Feature | undefined {
  let fs = cache.get(seed);
  if (!fs || fs[fs.length - 1].x < x + 500) {
    fs = features(seed, x + 4000);
    cache.set(seed, fs);
  }
  for (const f of fs) if (x >= f.x && x < f.end) return f;
  return undefined;
}

/** What a feature adds to the hills at x (u: metres into it); a gap's pit is not here, see `ground`. */
function bump(f: Feature, u: number): number {
  if (f.kind === "hop") {
    // A low ramp with a rounded lip, and the far side eased down rather than cut: a short flight onto a slope.
    if (u < HOP_L) return HOP_H * smooth(u / HOP_L);
    return HOP_H * (1 - smooth((u - HOP_L) / HOP_DOWN));
  }
  if (f.kind === "jump") {
    // A kicker: eased up, then cut off (the lip) back to the hills in half a metre.
    if (u < JUMP_L) return JUMP_H * Math.pow(u / JUMP_L, 1.6);
    return JUMP_H * (1 - smooth((u - JUMP_L) / 0.5));
  }
  if (f.kind === "wall") {
    if (u < WALL_L) return WALL_H * smooth(u / WALL_L);
    return WALL_H * (1 - smooth((u - WALL_L) / WALL_EASE));
  }
  // gap: a lip to take off from, the pit, and the far side back at the hills.
  if (u < LIP_L) return LIP_H * Math.pow(u / LIP_L, 1.4);
  return 0;
}

/** Whether x is over a gap's pit, and the pit's floor there. */
export function pitAt(seed: number, x: number): { floor: number; from: number; to: number } | undefined {
  const f = featuresAt(seed, x);
  if (!f || f.kind !== "gap") return undefined;
  const from = f.x + LIP_L, to = from + GAP_W;
  if (x < from || x > to) return undefined;
  return { floor: hills(seed, from) - PIT, from, to };
}

/** The ground's height at x, the pits' floors included. */
export function ground(seed: number, x: number): number {
  const pit = pitAt(seed, x);
  if (pit) return pit.floor;
  const f = featuresAt(seed, x);
  return hills(seed, x) + (f ? bump(f, x - f.x) : 0);
}

/** The pits that start in [x0, x1). */
function pitsIn(seed: number, x0: number, x1: number) {
  featuresAt(seed, x1);
  return cache.get(seed)!.filter((f) => f.kind === "gap" && f.x + LIP_L >= x0 && f.x + LIP_L < x1).map((f) => pitAt(seed, f.x + LIP_L + 0.01)!);
}

/**
 * The ground's polyline over [x0, x1]: a point every STEP, and a pit's corners
 * exactly (its walls are vertical). Chunks laid end to end share their end
 * points, so the chains meet without a seam (a pit never straddles a seam:
 * the sim cuts its chunks where the ground is plain).
 */
export function profile(seed: number, x0: number, x1: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const pits = pitsIn(seed, x0, x1);
  for (let k = 0; ; k++) {
    const x = x0 + k * STEP;
    if (x > x1 + 1e-9) break;
    const pit = pits.find((p) => x > p.from - 1e-9 && x < p.to + 1e-9);
    if (pit) continue;
    const next = pits.find((p) => x < p.from && x + STEP > p.from - 1e-9);
    pts.push({ x, y: ground(seed, x) });
    if (next) pts.push({ x: next.from, y: hills(seed, next.from) + LIP_H }, { x: next.from, y: next.floor }, { x: next.to, y: next.floor }, { x: next.to, y: hills(seed, next.to) });
  }
  return pts;
}

/** Whether a chunk may end at x: not inside a feature. */
export const plain = (seed: number, x: number) => !featuresAt(seed, x);
