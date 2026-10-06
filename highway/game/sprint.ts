// Sprints: short runs to a finish line on a fixed road (DESIGN.md, "Sprints").
// The road is the same every try (game/director.ts, a course), so it can be
// learned; near misses in a combo push the car past its top speed
// (game/drive.ts, `surge`), so the close line is the fast line. Stars are margins over the best time
// scripts/sprint.ts finds on that road: a search that sees the road the way
// someone who has learned it does, and acts only as often as a player can.
import type { Layout } from "./layout.ts";
import type { Upgrades } from "./content.ts";

export type Sprint = {
  id: string; name: string; about: string;
  car: string; up: Upgrades; // the car every try is driven in
  location: string;
  layout: Layout;
  length: number; // m on the dial
  density: number; // 0..1, the traffic from the first metre
  seed: number;
  best: number; // s: the best time scripts/sprint.ts found (beam 150, 2026-10-06)
};

const STOCK: Upgrades = { speed: 0, handling: 0, brakes: 0 };

export const SPRINTS: Sprint[] = [
  { id: "first-light", name: "First Light", about: "Four lanes, light traffic. Learn the road.", car: "compact-07", up: STOCK, location: "countryside", layout: { lanes: 4, oncoming: 0, median: 0 }, length: 3000, density: 0.35, seed: 1101, best: 56.57 },
  { id: "commuters", name: "Commuters", about: "Four lanes, busy. Every gap counts.", car: "kiri-10", up: STOCK, location: "midday", layout: { lanes: 4, oncoming: 0, median: 0 }, length: 3500, density: 0.8, seed: 2202, best: 61.35 },
  { id: "three-lanes", name: "Three Lanes", about: "One lane fewer, and trucks in two of them.", car: "milano-95", up: STOCK, location: "overcast", layout: { lanes: 3, oncoming: 0, median: 0 }, length: 3000, density: 0.6, seed: 3303, best: 49.78 },
  { id: "old-road", name: "The Old Road", about: "Two lanes each way. Touch the oncoming side and it's over.", car: "tozzo-98", up: STOCK, location: "dusk", layout: { lanes: 2, oncoming: 2, median: 0.4 }, length: 3500, density: 0.55, seed: 4404, best: 52.53 },
  { id: "after-dark", name: "After Dark", about: "Night, heavy traffic, a fast car. The hard one.", car: "asti-stradale-89", up: STOCK, location: "night", layout: { lanes: 4, oncoming: 0, median: 0 }, length: 4500, density: 0.95, seed: 5505, best: 59.31 },
];

export const sprintOf = (id: string) => SPRINTS.find((s) => s.id === id);

/** How much slower than the best time each star allows: one for a clean finish, two once the road is learned,
 *  three for a near-perfect run. */
export const STAR_MARGIN = [0.2, 0.09, 0.03] as const;
/** The times for one, two and three stars, s (to the tenth, rounded down so the shown time is enough). */
export const starTimes = (s: Sprint) => STAR_MARGIN.map((m) => Math.floor(s.best * (1 + m) * 10) / 10);
/** Stars a time earns: 0 to 3. */
export const starsFor = (s: Sprint, time: number) => starTimes(s).filter((t) => time <= t).length;

/** A clock's time, m:ss.d. */
export const clock = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

/** A run as a line through time, for a ghost: its place every `GHOST_DT` s, z from the start. */
export const GHOST_DT = 0.1;
export type Ghost = { x: number[]; z: number[]; yaw: number[]; time: number };

/** Where a ghost is `t` s in: between its two nearest samples. */
export function ghostAt(g: Ghost, t: number) {
  const f = Math.max(0, Math.min(g.z.length - 1, t / GHOST_DT)), i = Math.min(g.z.length - 2, Math.floor(f)), a = f - i;
  const lerp = (v: number[]) => (i < 0 ? v[0] : v[i] * (1 - a) + v[i + 1] * a);
  return { x: lerp(g.x), z: lerp(g.z), yaw: lerp(g.yaw) };
}

/** The ghost's time when it was `dz` m down the road: what the split against it compares to; null past its finish. */
export function ghostTimeAt(g: Ghost, dz: number) {
  const z = g.z;
  if (dz <= z[0]) return 0;
  let lo = 0, hi = z.length - 1;
  if (dz >= z[hi]) return null;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (z[m] < dz) lo = m; else hi = m; }
  const a = (dz - z[lo]) / Math.max(1e-6, z[hi] - z[lo]);
  return (lo + a) * GHOST_DT;
}
