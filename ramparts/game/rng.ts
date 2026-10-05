// Seeded randomness. Every random choice in the rules goes through an Rng so a
// seed replays a run exactly (sim, bot, tests, daily runs).

/** mulberry32: small, fast, good enough for games. State is one uint32. */
export class Rng {
  s: number;
  constructor(seed: number) { this.s = seed >>> 0 || 0x9e3779b9; }
  /** [0, 1) */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number) { return a + (b - a) * this.next(); }
  int(a: number, b: number) { return a + Math.floor(this.next() * (b - a + 1)); }
  chance(p: number) { return this.next() < p; }
  pick<T>(xs: readonly T[]): T { return xs[Math.floor(this.next() * xs.length)]!; }
  /** Pick by weight; weights need not sum to 1. */
  weighted<T>(xs: readonly T[], w: (x: T) => number): T {
    let total = 0;
    for (const x of xs) total += Math.max(0, w(x));
    let r = this.next() * total;
    for (const x of xs) if ((r -= Math.max(0, w(x))) < 0) return x;
    return xs[xs.length - 1]!;
  }
  shuffle<T>(xs: T[]): T[] {
    for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [xs[i], xs[j]] = [xs[j]!, xs[i]!]; }
    return xs;
  }
  /** A child stream, so adding draws in one system does not shift another. */
  fork(salt: number): Rng { return new Rng(hash(this.s, salt)); }
}

export function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x85ebca6b, 0xcc9e2d51) ^ Math.imul(b + 0x27d4eb2f, 0x165667b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
