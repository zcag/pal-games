// Sprints: short runs to a finish line on a fixed road (DESIGN.md, "Sprints").
// The road is the same every try (game/director.ts, a course), so it can be
// learned; near misses in a combo push the car past its top speed
// (game/drive.ts, `surge`), so the close line is the fast line. Stars are margins over the best time
// scripts/sprint.ts finds on that road: a search that sees the road the way
// someone who has learned it does, and acts only as often as a player can.
import type { Layout } from "./layout.ts";
import { CARS, CLASSES } from "./content.ts";
import { spanOf } from "./director.ts";

export type Sprint = {
  id: string; name: string; about: string;
  car: string; // the car its stars are set on: the latest of its class you have on reaching it (carAt)
  location: string;
  layout: Layout;
  length: number; // m on the dial
  density: number; // 0..1, the traffic from the first metre
  span: number; // m its cars are counted over: longer in a faster stop's car, so its traffic comes as often (director.ts spanOf)
  seed: number;
  best: number; // s: the best time scripts/sprint.ts found; 0 until it has
  region: number; // 0..4
  /** A region's last Sprint: a duel with a rival, who drives the search's best line (surface/rivals/<id>.json) to
   *  finish in `rivalTime`; beating it opens the next region and gives you the rival's car. */
  boss?: { rival: string; car: string };
  /** A region's Legend: its hardest road, open once its duel has three stars; the first finish gives a paint every car
   *  can wear. */
  legend?: { paint: string; name: string };
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
/** A region's Sprints, before its duel and Legend. */
export const REGION_STOPS = 8;

/** A class's cars, first to last. */
export function carsOfClass(cls: string) {
  const i = CLASSES.findIndex((c) => c.id === cls), from = (k: number) => (k < CLASSES.length ? CARS.findIndex((x) => x.id === CLASSES[k].from) : CARS.length);
  return CARS.slice(from(i), from(i + 1));
}
/** How many of its region's Sprints finished give a class's `place`th car (0, its first, comes with the region): the
 *  others spread over the Sprints, three cars after 3 and 6, four after 2, 4 and 6. */
export const stopsForPlace = (place: number, cars: number) => Math.ceil((REGION_STOPS * place) / cars);
/** The car a region's stop is driven in with `done` of its Sprints finished: the latest of its class come by then. A
 *  stop's stars are set on it (its Sprints in order before it; every one before its duel and Legend). */
export function carAt(region: number, done: number) {
  const cars = carsOfClass(REGIONS[region].cls);
  return cars.filter((_, p) => stopsForPlace(p, cars.length) <= done).at(-1)!.id;
}

const FOUR: Layout = { lanes: 4, oncoming: 0, median: 0 }, THREE: Layout = { lanes: 3, oncoming: 0, median: 0 };
const TWO_WAY: Layout = { lanes: 2, oncoming: 2, median: 0.4 };
const LANES = { 4: FOUR, 3: THREE, 2: TWO_WAY } as const;

// region, id, name, about, lanes (2 is Two-Way), km, traffic (0..1), seed. The kilometres are sized from each road's
// searched pace for a best time of 40 to 55 s (60 for the long ones, 55 for a duel; a stop about 48 s), so a retry
// stays quick: they were a quarter longer, a stop about a minute, and a run felt long by the later regions.
// The traffic is what comes at you, not cars per metre (each road's span grows with its car's speed: director.ts
// spanOf), and every region keeps to about the Countryside's (the search passes 47-106 cars a minute in each),
// a Legend the busiest of its region. Region on region at once faster and busier (High Noon 0.35 to 0.65, Night Run 0.6 to 1, cars per
// metre) had the best-time search passing 150 cars a minute in Night Run, each read in under two seconds
// (2026-10-09), where a player managed a hundred.
type Row = [number, string, string, string, 4 | 3 | 2, number, number, number];
const ROWS: Row[] = [
  [0, "first-light", "First Light", "Four lanes, hardly anyone about. Learn the road.", 4, 1.45, 0.05, 1101],
  [0, "three-lanes", "Three Lanes", "One lane fewer than you are used to.", 3, 1.6, 0.3, 3303],
  [0, "commuters", "Commuters", "Four lanes and everyone going to work.", 4, 1.35, 0.3, 2202],
  [0, "long-haul", "Long Haul", "The long one. Keep the chain going.", 4, 2.2, 0.2, 1505],
  [0, "farm-road", "Farm Road", "Two lanes each way. Touch the oncoming side and it's over.", 2, 1.45, 0.2, 1404],
  [0, "hedgerows", "Hedgerows", "Busy four lanes.", 4, 1.9, 0.4, 1707],
  [0, "squeeze", "Squeeze", "Three lanes, packed. Find the way through.", 3, 1.6, 0.45, 1606],
  [0, "last-light", "Last Light", "Three lanes and the evening traffic.", 3, 1.75, 0.5, 1808],
  [1, "heat-haze", "Heat Haze", "Four lanes, open road.", 4, 1.75, 0.3, 2101],
  [1, "dry-run", "Dry Run", "Three lanes, steady traffic.", 3, 1.9, 0.4, 2104],
  [1, "old-road", "The Old Road", "Two lanes each way, and a quicker car to keep off the other side.", 2, 1.6, 0.25, 4404],
  [1, "noon-rush", "Noon Rush", "Lunchtime. Everyone is out.", 4, 2.1, 0.55, 2102],
  [1, "long-straight", "Long Straight", "A long, straight road. Hold your nerve.", 4, 2.6, 0.3, 2107],
  [1, "white-lines", "White Lines", "Three lanes, busy.", 3, 2.15, 0.45, 2106],
  [1, "overtaker", "Overtaker", "Two-Way, busy.", 2, 1.9, 0.5, 2105],
  [1, "glare", "Glare", "Packed four lanes.", 4, 2.1, 0.55, 5505],
  [2, "big-block", "Big Block", "Four lanes, light traffic.", 4, 2.05, 0.3, 3101],
  [2, "canyon-run", "Canyon Run", "Three lanes, steady.", 3, 2.15, 0.38, 3103],
  [2, "head-on", "Head-On", "Two-Way. The oncoming side ends it.", 2, 1.8, 0.38, 3104],
  [2, "sundown", "Sundown", "Busy and getting busier.", 4, 2.4, 0.49, 3102],
  [2, "the-mile", "The Mile", "Long and steady. Do not drop the chain.", 4, 2.95, 0.41, 3107],
  [2, "low-sun", "Low Sun", "Three lanes, heavy.", 3, 2.55, 0.49, 3106],
  [2, "dust", "Dust", "Two-Way and busy.", 2, 2.2, 0.49, 3108],
  [2, "rush-hour", "Rush Hour", "Packed four lanes.", 4, 2.45, 0.6, 3105],
  [3, "overcast", "Overcast", "Four lanes, grey and busy.", 4, 2.25, 0.3, 4101],
  [3, "drizzle", "Drizzle", "Three lanes, steady traffic.", 3, 2.45, 0.34, 4102],
  [3, "b-road", "B-Road", "Two-Way at speed.", 2, 2.05, 0.34, 4104],
  [3, "motorway", "Motorway", "Four lanes, packed.", 4, 2.65, 0.51, 4103],
  [3, "grand-tour", "Grand Tour", "The longest road in the region.", 4, 3.35, 0.39, 4106],
  [3, "convoy", "Convoy", "Three lanes, heavy.", 3, 2.85, 0.47, 4105],
  [3, "fog-line", "Fog Line", "Two-Way, busy.", 2, 2.45, 0.47, 4108],
  [3, "slipstream", "Slipstream", "Four lanes, packed, long.", 4, 2.65, 0.6, 4107],
  [4, "neon", "Neon", "Four lanes under the lights.", 4, 2.55, 0.35, 5101],
  [4, "midnight", "Midnight", "Three lanes, steady.", 3, 2.75, 0.39, 5102],
  [4, "high-beams", "High Beams", "Two-Way at night.", 2, 2.3, 0.39, 5104],
  [4, "red-lights", "Red Lights", "Packed four lanes.", 4, 3, 0.56, 5103],
  [4, "all-night", "All Night", "The longest road of the trip.", 4, 3.75, 0.44, 5106],
  [4, "tunnel-vision", "Tunnel Vision", "Three lanes, heavy.", 3, 3.2, 0.56, 5105],
  [4, "graveyard", "Graveyard Shift", "Two-Way, packed.", 2, 2.75, 0.52, 5108],
  [4, "afterburn", "Afterburn", "Everything at once.", 4, 3, 0.65, 5107],
  // the duels: a rival in the next class's first car
  [0, "duel-ines", "Ines", "Her sister wants the empty house too. Get there first, and her Tozzo is yours.", 4, 1.9, 0.4, 1909],
  [1, "duel-mika", "Mika", "Her ex, 'just passing by' in a Thunderbolt. Beat him and it is yours.", 4, 2.25, 0.5, 2909],
  [2, "duel-rook", "Rook", "The neighbour has your plate. Outrun his Stinger and he saw nothing.", 4, 2.6, 0.55, 3909],
  [3, "duel-vega", "Vega", "Her cousin has the spare key and a Roadster. First one there gets the couch.", 4, 2.9, 0.6, 4909],
  // the Legends: each region's hardest road, open with three stars on its duel
  [0, "legend-harvest", "Harvest Rush", "The Countryside at its worst: three lanes, packed tight.", 3, 1.85, 0.9, 1990],
  [1, "legend-mirage", "Mirage", "Two-Way at noon, packed on both sides.", 2, 2.25, 0.75, 2990],
  [2, "legend-red-sky", "Red Sky", "Three packed lanes with the sun in your eyes.", 3, 2.6, 0.8, 3990],
  [3, "legend-storm", "The Storm", "Two-Way in the grey, nose to tail both ways.", 2, 2.85, 0.8, 4990],
  [4, "legend-long-night", "The Long Night", "Everything the trip has thrown at you, at once.", 3, 3.25, 0.85, 5990],
  [4, "duel-kaz", "Kaz", "Her dad, home from the airport early. Beat him to the driveway.", 4, 3.25, 0.65, 5909],
];
/** The roads' version: a run kept as its keys (a replay) plays out as it did only on the roads it was driven on, so
 *  this goes up with any change to where a road's traffic is placed or how it drives (2: no walls). */
export const ROADS = 2;
/** A road's own version where it changed since (4: the Saba V12 '95 upgraded, the car these are driven in, at 230 km/h). */
const ROAD: Record<string, number> = { graveyard: 4, afterburn: 4, "legend-long-night": 4, "duel-kaz": 4 };
export const roadsOf = (id: string) => ROAD[id] ?? ROADS;

/** The best times scripts/sprint.ts found, each in its stop's car (carAt). */
const BEST: Record<string, number> = {
  "first-light": 42.99,
  "three-lanes": 46.99,
  "commuters": 40.87,
  "long-haul": 61.44,
  "farm-road": 42.64,
  "hedgerows": 55.62,
  "squeeze": 43.96,
  "last-light": 47.46,
  "heat-haze": 44.78,
  "dry-run": 48.33,
  "old-road": 40.53,
  "noon-rush": 51.21,
  "long-straight": 59.27,
  "white-lines": 50.02,
  "overtaker": 44.3,
  "glare": 48.52,
  "big-block": 45.46,
  "canyon-run": 47.46,
  "head-on": 40.26,
  "sundown": 51.73,
  "the-mile": 62.33,
  "low-sun": 53.66,
  "dust": 46.5,
  "rush-hour": 51.12,
  "overcast": 44.85,
  "drizzle": 48.29,
  "b-road": 41.4,
  "motorway": 49.43,
  "grand-tour": 60.74,
  "convoy": 53.33,
  "fog-line": 44.51,
  "slipstream": 47.68,
  "neon": 44.03,
  "midnight": 47.17,
  "high-beams": 40.11,
  "red-lights": 50.02,
  "all-night": 61.18,
  "tunnel-vision": 52.79,
  "graveyard": 41.53,
  "afterburn": 44.84,
  "duel-ines": 52.22,
  "duel-mika": 51.32,
  "duel-rook": 53.8,
  "duel-vega": 51.43,
  "legend-harvest": 49.79,
  "legend-mirage": 51.5,
  "legend-red-sky": 53.41,
  "legend-storm": 51.47,
  "legend-long-night": 48.65,
  "duel-kaz": 48.46,
};
const RIVALS: Record<string, { rival: string; car: string }> = {
  "duel-ines": { rival: "Ines", car: "tozzo-98" }, "duel-mika": { rival: "Mika", car: "thunderbolt-96" },
  "duel-rook": { rival: "Rook", car: "stinger-96" }, "duel-vega": { rival: "Vega", car: "roadster-00" }, "duel-kaz": { rival: "Kaz", car: "saba-v12-95" },
};

const LEGENDS: Record<string, { paint: string; name: string }> = {
  "legend-harvest": { paint: "#d4af37", name: "Legend gold" }, "legend-mirage": { paint: "#cfd3d8", name: "Legend chrome" },
  "legend-red-sky": { paint: "#b5651d", name: "Legend copper" }, "legend-storm": { paint: "#f4f1e6", name: "Legend pearl" },
  "legend-long-night": { paint: "#101114", name: "Legend obsidian" },
};

export const SPRINTS: Sprint[] = ROWS.map(([region, id, name, about, lanes, km, density, seed], i) => {
  const car = carAt(region, RIVALS[id] || LEGENDS[id] ? REGION_STOPS : ROWS.slice(0, i).filter((r) => r[0] === region && !RIVALS[r[1]] && !LEGENDS[r[1]]).length);
  return { id, name, about, location: REGIONS[region].place, car, layout: LANES[lanes], length: km * 1000, density, span: spanOf(CARS.find((c) => c.id === car)!),
    seed, best: BEST[id] ?? 0, region, boss: RIVALS[id], legend: LEGENDS[id] };
});

/** A region's stops in order: its Sprints, its duel, its Legend. */
export const sprintsOf = (region: number) => {
  const here = SPRINTS.filter((s) => s.region === region);
  return [...here.filter((s) => !s.boss && !s.legend), ...here.filter((s) => s.boss), ...here.filter((s) => s.legend)];
};
/** A boss's rival finishes here: between the one- and two-star times. */
export const rivalTime = (s: Sprint) => Math.round(((starTimes(s)[0] + starTimes(s)[1]) / 2) * 10) / 10;

export const sprintOf = (id: string) => SPRINTS.find((s) => s.id === id);

/** How much slower than the best time each star allows: one for a clean finish, two once the road is learned,
 *  three for the best time's own driving. The best time is a person's pace (game/bestrun.ts, HUMAN), not the
 *  machine's: three stars ask for driving a person can do, on a road they have learned. Three is +2%: what a
 *  person's consistency costs, which no search setting modelled (DESIGN.md, "Stars"). */
export const STAR_MARGIN = [0.15, 0.06, 0.02] as const;
/** The times for one, two and three stars, s: to the tenth, rounded up, so the run they come from makes them (rounded
 *  down, three stars on First Light were 54.9 s against its best 54.99). */
export const starTimes = (s: Sprint) => STAR_MARGIN.map((m) => Math.ceil(s.best * (1 + m) * 10 - 1e-9) / 10);
/** Stars a time earns: 0 to 3. */
export const starsFor = (s: Sprint, time: number) => starTimes(s).filter((t) => time <= t).length;

/** A clock's time, m:ss.d. */
export const clock = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

/** A run as a line through time, for a ghost: its place every `GHOST_DT` s, z from the start. */
export const GHOST_DT = 0.1;
export type Ghost = { x: number[]; z: number[]; yaw: number[]; time: number };
/** A ghost as it is stored: each line in fixed point (cm, cm, milliradians), as its changes (enc), in base 36. As arrays of numbers, pal's storage (written one value a line) took ~20 kB a road and filled its 256 kB
 *  cap with a dozen roads' ghosts; every write after that, the save's too, was refused. */
export type PackedGhost = { time: number; line: string };
const SCALE = [100, 100, 1000], ORDER = [1, 2, 1]; // z, along the road at a steady pace, as its change of pace
/** Fixed-point values as differences of order `n`, in base 36, a run of zeros written ~count. */
function enc(a: number[], n: number) {
  let d = a;
  for (let k = 0; k < n; k++) { const p = d; d = p.map((v, i) => (i ? v - p[i - 1] : v)); }
  const out: string[] = [];
  for (let i = 0; i < d.length; ) {
    let j = i; while (j < d.length && d[j] === 0) j++;
    if (j - i > 1) { out.push(`~${(j - i).toString(36)}`); i = j; } else out.push(d[i++].toString(36));
  }
  return out.join(",");
}
function dec(s: string, n: number) {
  let d: number[] = [];
  for (const t of s ? s.split(",") : []) if (t[0] === "~") d.push(...new Array(parseInt(t.slice(1), 36)).fill(0)); else d.push(parseInt(t, 36));
  for (let k = 0; k < n; k++) { let acc = 0; d = d.map((v) => (acc += v)); }
  return d;
}
export function packGhost(g: Ghost): PackedGhost {
  return { time: g.time, line: [g.x, g.z, g.yaw].map((a, k) => enc(a.map((v) => Math.round(v * SCALE[k])), ORDER[k])).join(";") };
}
/** A stored ghost back, packed or (as kept before) as arrays; null when it is neither. */
export function unpackGhost(raw: unknown): Ghost | null {
  const r = raw as Partial<PackedGhost & Ghost> | null;
  if (!r || typeof r !== "object" || typeof r.time !== "number") return null;
  if (Array.isArray(r.x) && Array.isArray(r.z) && Array.isArray(r.yaw)) return { x: r.x, z: r.z, yaw: r.yaw, time: r.time };
  if (typeof r.line !== "string") return null;
  const [x, z, yaw] = r.line.split(";").map((part, k) => dec(part, ORDER[k]).map((v) => v / SCALE[k]));
  return x && z && yaw ? { x, z, yaw, time: r.time } : null;
}

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
