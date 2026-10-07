// Sprints: short runs to a finish line on a fixed road (DESIGN.md, "Sprints").
// The road is the same every try (game/director.ts, a course), so it can be
// learned; near misses in a combo push the car past its top speed
// (game/drive.ts, `surge`), so the close line is the fast line. Stars are margins over the best time
// scripts/sprint.ts finds on that road: a search that sees the road the way
// someone who has learned it does, and acts only as often as a player can.
import type { Layout } from "./layout.ts";
import { CLASSES } from "./content.ts";

export type Sprint = {
  id: string; name: string; about: string;
  car: string; // the car its stars are set on: its region's class's first (you drive any of the class you have)
  location: string;
  layout: Layout;
  length: number; // m on the dial
  density: number; // 0..1, the traffic from the first metre
  seed: number;
  best: number; // s: the best time scripts/sprint.ts found (beam 150); 0 until it has
  region: number; // 0..4
  /** A region's last Sprint: a duel with a rival, who drives the search's best line (surface/rivals/<id>.json) to
   *  finish in `rivalTime`; beating it opens the next region and gives you the rival's car. */
  boss?: { rival: string; car: string };
};

/** The road trip: five regions, one a car class, each under its own sky. A region opens when the one before it is
 *  won (its boss beaten); its boss opens at `BOSS_STARS` stars from its Sprints. */
export const REGIONS = [
  { id: "countryside", name: "Countryside", place: "countryside", cls: "city", about: "Where it starts: a quiet morning, a small car." },
  { id: "high-noon", name: "High Noon", place: "midday", cls: "sport", about: "Hot asphalt, busier roads, your first sports cars." },
  { id: "golden-hour", name: "Golden Hour", place: "dusk", cls: "muscle", about: "Long shadows and big engines." },
  { id: "grey-day", name: "Grey Day", place: "overcast", cls: "gt", about: "Flat light, heavy traffic, grand tourers." },
  { id: "night-run", name: "Night Run", place: "night", cls: "super", about: "Headlights only, and the fastest cars there are." },
] as const;
export const BOSS_STARS = 12;

const FOUR: Layout = { lanes: 4, oncoming: 0, median: 0 }, THREE: Layout = { lanes: 3, oncoming: 0, median: 0 };
const TWO_WAY: Layout = { lanes: 2, oncoming: 2, median: 0.4 };
const LANES = { 4: FOUR, 3: THREE, 2: TWO_WAY } as const;

// region, id, name, about, lanes (2 is Two-Way), km, traffic (0..1), seed. The kilometres are sized from each road's
// searched pace for a best time of 50 to 70 s (80 for the long ones, 70 for a duel), so a retry stays quick.
type Row = [number, string, string, string, 4 | 3 | 2, number, number, number];
const ROWS: Row[] = [
  [0, "first-light", "First Light", "Four lanes, hardly anyone about. Learn the road.", 4, 1.9, 0.05, 1101],
  [0, "three-lanes", "Three Lanes", "One lane fewer than you are used to.", 3, 2.1, 0.3, 3303],
  [0, "commuters", "Commuters", "Four lanes and everyone going to work.", 4, 1.75, 0.3, 2202],
  [0, "long-haul", "Long Haul", "The long one. Keep the chain going.", 4, 2.85, 0.2, 1505],
  [0, "farm-road", "Farm Road", "Two lanes each way. Touch the oncoming side and it's over.", 2, 1.9, 0.2, 1404],
  [0, "hedgerows", "Hedgerows", "Busy four lanes.", 4, 2.45, 0.4, 1707],
  [0, "squeeze", "Squeeze", "Three lanes, packed. Find the way through.", 3, 2.05, 0.45, 1606],
  [0, "last-light", "Last Light", "Three lanes and the evening traffic.", 3, 2.25, 0.5, 1808],
  [1, "heat-haze", "Heat Haze", "Four lanes, open road.", 4, 2.3, 0.4, 2101],
  [1, "dry-run", "Dry Run", "Three lanes, steady traffic.", 3, 2.5, 0.5, 2104],
  [1, "old-road", "The Old Road", "Two lanes each way, and a quicker car to keep off the other side.", 2, 2.05, 0.35, 4404],
  [1, "noon-rush", "Noon Rush", "Lunchtime. Everyone is out.", 4, 2.7, 0.65, 2102],
  [1, "long-straight", "Long Straight", "A long, straight road. Hold your nerve.", 4, 3.4, 0.4, 2107],
  [1, "white-lines", "White Lines", "Three lanes, busy.", 3, 2.8, 0.55, 2106],
  [1, "overtaker", "Overtaker", "Two-Way, busy.", 2, 2.5, 0.6, 2105],
  [1, "glare", "Glare", "Packed four lanes.", 4, 2.75, 0.65, 5505],
  [2, "big-block", "Big Block", "Four lanes, light traffic.", 4, 2.65, 0.35, 3101],
  [2, "canyon-run", "Canyon Run", "Three lanes, steady.", 3, 2.8, 0.45, 3103],
  [2, "head-on", "Head-On", "Two-Way. The oncoming side ends it.", 2, 2.35, 0.45, 3104],
  [2, "sundown", "Sundown", "Busy and getting busier.", 4, 3.1, 0.6, 3102],
  [2, "the-mile", "The Mile", "Long and steady. Do not drop the chain.", 4, 3.85, 0.5, 3107],
  [2, "low-sun", "Low Sun", "Three lanes, heavy.", 3, 3.3, 0.6, 3106],
  [2, "dust", "Dust", "Two-Way and busy.", 2, 2.85, 0.6, 3108],
  [2, "rush-hour", "Rush Hour", "Packed four lanes.", 4, 3.15, 0.75, 3105],
  [3, "overcast", "Overcast", "Four lanes, grey and busy.", 4, 2.95, 0.5, 4101],
  [3, "drizzle", "Drizzle", "Three lanes, steady traffic.", 3, 3.15, 0.55, 4102],
  [3, "b-road", "B-Road", "Two-Way at speed.", 2, 2.65, 0.55, 4104],
  [3, "motorway", "Motorway", "Four lanes, packed.", 4, 3.45, 0.75, 4103],
  [3, "grand-tour", "Grand Tour", "The longest road in the region.", 4, 4.35, 0.6, 4106],
  [3, "convoy", "Convoy", "Three lanes, heavy.", 3, 3.7, 0.7, 4105],
  [3, "fog-line", "Fog Line", "Two-Way, busy.", 2, 3.2, 0.7, 4108],
  [3, "slipstream", "Slipstream", "Four lanes, packed, long.", 4, 3.45, 0.85, 4107],
  [4, "neon", "Neon", "Four lanes under the lights.", 4, 3.3, 0.6, 5101],
  [4, "midnight", "Midnight", "Three lanes, steady.", 3, 3.6, 0.65, 5102],
  [4, "high-beams", "High Beams", "Two-Way at night.", 2, 3, 0.65, 5104],
  [4, "red-lights", "Red Lights", "Packed four lanes.", 4, 3.9, 0.85, 5103],
  [4, "all-night", "All Night", "The longest road of the trip.", 4, 4.85, 0.7, 5106],
  [4, "tunnel-vision", "Tunnel Vision", "Three lanes, heavy.", 3, 4.15, 0.85, 5105],
  [4, "graveyard", "Graveyard Shift", "Two-Way, packed.", 2, 3.6, 0.8, 5108],
  [4, "afterburn", "Afterburn", "Everything at once.", 4, 3.9, 0.95, 5107],
  // the duels: a rival in the next class's first car
  [0, "duel-ines", "Ines", "Ines drives a Tozzo and wants it to stay that way. Beat her to the line and it is yours.", 4, 2.45, 0.4, 1909],
  [1, "duel-mika", "Mika", "Mika has a Thunderbolt and no patience. Beat him and it is yours.", 4, 2.95, 0.6, 2909],
  [2, "duel-rook", "Rook", "Rook's Stinger has never been passed. Be the first.", 4, 3.35, 0.7, 3909],
  [3, "duel-vega", "Vega", "Vega races a Roadster for money. Take hers.", 4, 3.75, 0.8, 4909],
  [4, "duel-kaz", "Kaz", "Kaz is the fastest driver on the road. The last race.", 4, 4.2, 0.9, 5909],
];
/** The best times scripts/sprint.ts found, each on the region's first car, stock (beam 150). */
const BEST: Record<string, number> = {
  "first-light": 54.99,
  "three-lanes": 60.34,
  "commuters": 51.35,
  "long-haul": 80.33,
  "farm-road": 54.99,
  "hedgerows": 69.67,
  "squeeze": 59.02,
  "last-light": 64.47,
  "heat-haze": 56.57,
  "dry-run": 61.1,
  "old-road": 51.17,
  "noon-rush": 65.34,
  "long-straight": 80.82,
  "white-lines": 68.41,
  "overtaker": 60.94,
  "glare": 66.45,
  "big-block": 57.05,
  "canyon-run": 60.07,
  "head-on": 51.17,
  "sundown": 65.77,
  "the-mile": 80.49,
  "low-sun": 69.92,
  "dust": 60.81,
  "rush-hour": 66.64,
  "overcast": 56.92,
  "drizzle": 61.04,
  "b-road": 51.58,
  "motorway": 65.84,
  "grand-tour": 80.89,
  "convoy": 70.21,
  "fog-line": 61.13,
  "slipstream": 67.67,
  "neon": 55.91,
  "midnight": 61.05,
  "high-beams": 51.11,
  "red-lights": 65.53,
  "all-night": 80.86,
  "tunnel-vision": 70.49,
  "graveyard": 60.53,
  "afterburn": 65.71,
  "duel-ines": 69.67,
  "duel-mika": 70.84,
  "duel-rook": 70.95,
  "duel-vega": 70.89,
  "duel-kaz": 70.28,
};
const RIVALS: Record<string, { rival: string; car: string }> = {
  "duel-ines": { rival: "Ines", car: "tozzo-98" }, "duel-mika": { rival: "Mika", car: "thunderbolt-96" },
  "duel-rook": { rival: "Rook", car: "stinger-96" }, "duel-vega": { rival: "Vega", car: "roadster-00" }, "duel-kaz": { rival: "Kaz", car: "saba-v12-95" },
};

export const SPRINTS: Sprint[] = ROWS.map(([region, id, name, about, lanes, km, density, seed]) => ({
  id, name, about, car: CLASSES.find((c) => c.id === REGIONS[region].cls)!.from, location: REGIONS[region].place,
  layout: LANES[lanes], length: km * 1000, density, seed, best: BEST[id] ?? 0, region, boss: RIVALS[id],
}));

/** A region's Sprints in order, its boss last. */
export const sprintsOf = (region: number) => SPRINTS.filter((s) => s.region === region && !s.boss).concat(SPRINTS.filter((s) => s.region === region && s.boss));
/** A boss's rival finishes here: between the one- and two-star times. */
export const rivalTime = (s: Sprint) => Math.round(((starTimes(s)[0] + starTimes(s)[1]) / 2) * 10) / 10;

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
