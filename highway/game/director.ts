// Where traffic appears. Traffic Racer drops one random car in a random lane
// every 0.2 s and trusts low numbers to keep the road passable; this plans
// the road ahead in rows instead. A row is a pattern (one car, a pair, a door
// to thread, a staggered line, a slow truck with company, a near wall) placed
// past the far edge of what you can see; every row leaves a lane through it,
// checked against the cars already there; rows come closer together as the
// run goes on, with a breather now and then that the game announces.
//
// Pure: it decides kinds, lanes, gaps and speeds; the caller makes the cars.
//
// A course (a Sprint's fixed road) is the same road for everyone and every
// try: each row draws from its own seed, by its number, the density is the
// course's, rows are planned a fixed distance ahead and checked against the
// rows planned before rather than the live traffic, so how fast you drive
// never changes what comes next.

import { FEEL, CARS, trafficTop, type PlayerCar } from "./content.ts";

export type Spawn = { lane: number; dz: number; heavy: boolean; v0: number; oncoming: boolean };
/** `seed`: on a course, what the caller draws the row's cars from (their models, their drivers). */
export type Row = { z: number; spawns: Spawn[]; pattern: string; seed?: number };
/** A fixed road: its seed, its traffic (0..1, the density a run reaches at full strength), how far ahead rows are
 *  planned, m, and the road its cars are counted over, m (spanOf). */
export type Course = { seed: number; density: number; reach: number; span: number };

export type DirectorOpts = {
  lanes: number; oncomingLanes: number;
  topSpeed: number; // m/s: traffic speeds scale with it (content.ts trafficTop: half of the player's climb)
  rnd: () => number;
  density?: number; // the place's traffic, 1 normal
  course?: Course;
  you?: number; // m/s: your top speed on the world's pace, what a row is checked for walls against (Director.walls)
};

/** A car on the road or planned: where it is, and for the wall check its speed and where you were (`at`) when it was
 *  there. */
export type Occupant = { lane: number; z: number; oncoming: boolean; v?: number; at?: number };

/** A wall: a car in every lane, each within the road you cover on the traffic while you cross a lane (CROSS s, a tap
 *  held) of one in the lane beside it: abreast, a diagonal or a V, no gap to cut. Lanes drive at different speeds, so
 *  cars placed apart drew into one about every 3 s of a packed three-lane road; a car that would make one as you come
 *  up to it is not placed. */
export const CROSS = 0.45;
/** The speeds you are checked at, times your top: at it, and carried past it by a combo. */
const SURGE = [1, 1.12];
/** A car caught up to a slower one keeps this many metres behind it, and 1.35 s more (traffic.ts: its jam gap, a car's
 *  length and its time gap). */
const FOLLOW = 7;

const PATTERNS: { name: string; weight: (d: number) => number; make: (o: DirectorOpts, r: () => number) => { lane: number; dz: number; heavy?: boolean }[] }[] = [
  { name: "single", weight: (d) => 3 - d * 1.5, make: (o, r) => [{ lane: Math.floor(r() * o.lanes), dz: 0 }] },
  { name: "pair", weight: (d) => 1.5 + d, make: (o, r) => { const a = Math.floor(r() * o.lanes); let b = Math.floor(r() * (o.lanes - 1)); if (b >= a) b++; return [{ lane: a, dz: 0 }, { lane: b, dz: (r() - 0.5) * 6 }]; } },
  // two cars a lane apart: the gap between them is the line to take
  { name: "door", weight: (d) => 0.6 + d * 1.5, make: (o, r) => { const a = Math.floor(r() * (o.lanes - 2)); return [{ lane: a, dz: 0 }, { lane: a + 2, dz: (r() - 0.5) * 3 }]; } },
  // a diagonal: weave through it
  { name: "stagger", weight: (d) => 0.5 + d, make: (o, r) => { const up = r() < 0.5, n = Math.min(3, o.lanes - 1), s = Math.floor(r() * (o.lanes - n + 1)); return Array.from({ length: n }, (_, i) => ({ lane: up ? s + i : s + n - 1 - i, dz: i * (14 + r() * 8) })); } },
  // a truck in the slow lanes, a car keeping it company
  { name: "truck", weight: () => 1, make: (o, r) => { const t = Math.floor(r() * Math.min(2, o.lanes)); const c = t + 1 < o.lanes ? t + 1 : t - 1; return r() < 0.6 ? [{ lane: t, dz: 0, heavy: true }, { lane: c, dz: 8 + r() * 16 }] : [{ lane: t, dz: 0, heavy: true }]; } },
  // all lanes but one: find it
  { name: "wall", weight: (d) => Math.max(0, d * 2 - 0.8), make: (o, r) => { const open = Math.floor(r() * o.lanes); return Array.from({ length: o.lanes }, (_, l) => l).filter((l) => l !== open).map((l) => ({ lane: l, dz: (r() - 0.5) * 8 })); } },
];

// Traffic Racer's density, measured from its code: 5 cars in the 140 m ahead of you at the start,
// one more every 27 s, up to 14. (It then drops back to 6; a breather now and then does that job here.)
const SPAN = 140, START = 5, MOST = 14, RAMP = 27;

/** The band of speeds the traffic keeps, dial km/h, on a road whose traffic tops out at `top` (content.ts trafficTop):
 *  the original's, always slower than you, more so in a faster car. */
export const band = (top: number) => [9 + top / 5.7, 51.5 + top / 5.5] as const;
/** How fast a car closes on its road's traffic, dial km/h: its top speed less the band's middle (speed()). */
const closing = (car: PlayerCar) => { const [lo, hi] = band(trafficTop(car)); return car.top - (lo + (hi - lo) * 0.575); };
/** The road a course counts its cars over, m: SPAN in the first car, longer as a car closes on traffic faster, so a
 *  road's traffic comes at you as often in every car (2.5 times as long in the fastest). Cars per metre alone made
 *  a Night Run road meet a car twice as often as the Countryside's busiest, each read in half the time. */
export const spanOf = (car: PlayerCar) => (SPAN * closing(car)) / closing(CARS[0]);

export class Director {
  frontier = 0; // the z the next row goes at
  time = 0; // seconds into the run
  /** A lane kept free up to a point: the start, so a run never opens with a car in your lane. */
  spare: { lane: number; until: number } | null = null;
  breather = 0; // metres of open road left in a breather
  // a course: rows planned so far (each draws from its own seed) and the spawns they placed
  rows = 0; rowSeed = 1; planned: Occupant[] = [];
  constructor(public o: DirectorOpts) {}

  /** The open road's draws, or on a course the current row's. */
  private rnd() { return this.o.course ? (this.rowSeed = (this.rowSeed * 16807) % 2147483647) / 2147483647 : this.o.rnd(); }

  /** How dense the road is now, 0..1: busy from the first second, at full strength after ~4 km; a course's own all along. */
  density() {
    const c = this.o.course;
    return (c ? c.density : Math.min(1, (this.time / RAMP / (MOST - START)) * (this.o.density ?? 1))) * (this.breather > 0 ? 0.3 : 1);
  }

  /** Cars wanted in the 140 m ahead (a course's span): 5, then one more every 27 s, up to 14. */
  cap() { return START + (MOST - START) * this.density(); }

  /** The speed a driver in a lane wants: below yours, faster to the left, trucks slowest. */
  private speed(lane: number, heavy: boolean, oncoming: boolean) {
    const r = () => this.rnd(), top = this.o.topSpeed * 3.6;
    if (oncoming) return ((50 + r() * 25) / 3.6) * FEEL.pace;
    const [lo, hi] = band(top);
    const k = this.o.lanes > 1 ? lane / (this.o.lanes - 1) : 0.5;
    const kmh = heavy ? Math.min(hi, lo + (hi - lo) * 0.35 + r() * 8) : lo + (hi - lo) * (0.15 + 0.6 * k + r() * 0.25);
    return (kmh / 3.6) * FEEL.pace; // the band is in dial km/h; the world goes by at the pace
  }

  /** Plan rows until the frontier is far enough ahead of the player. */
  plan(playerZ: number, playerV: number, cars: Occupant[]): Row[] {
    const rows: Row[] = [], c = this.o.course;
    const reach = playerZ + (c ? c.reach : Math.max(320, playerV * 7)); // past where you can make anything out
    if (this.frontier < playerZ + 45) this.frontier = playerZ + 45; // the first cars close enough to matter at once
    // the rows planned so far, kept until you are past where they were placed: a wall is made of cars placed rows apart
    if (c) { this.planned = this.planned.filter((p) => p.z > this.frontier - c.reach - 50); cars = this.planned; }
    else cars = cars.map((x) => ({ ...x, at: x.at ?? playerZ }));
    while (this.frontier < reach) {
      if (c) this.rowSeed = seedOf(c.seed, this.rows++);
      const d = this.density();
      const row = this.row(this.frontier, d, cars, playerZ);
      if (c) row.seed = seedOf(c.seed ^ 0x5bd1e995, this.rows);
      if (row.spawns.length) rows.push(row);
      for (const s of row.spawns) cars.push({ lane: s.lane, z: row.z + s.dz, oncoming: s.oncoming, v: s.v0, at: this.at(row.z, playerZ) });
      // the next row: spaced so the 140 m ahead (a course's span) holds the cars the moment calls for
      const ours = row.spawns.filter((s) => !s.oncoming).length || 1;
      const gap = ((c?.span ?? SPAN) * ours / this.cap()) * (0.75 + this.rnd() * 0.5);
      this.frontier += gap;
      if (this.breather > 0) this.breather -= gap;
      else if (d > 0.5 && this.rnd() < 0.025) this.breather = 600;
    }
    return rows;
  }

  /** Where you are taken to be as a row at `z` is planned: on a course a fixed reach behind it, so what it places never
   *  depends on how you drive; else where you are. */
  private at(z: number, playerZ: number) { return this.o.course ? z - this.o.course.reach : playerZ; }

  /** Whether `c` would make a wall with `cars` as you come up to it (from 150 m off to 30 m), you at your top speed or
   *  a combo's past it (SURGE). */
  private walls(c: Occupant, cars: Occupant[]) {
    return !!this.o.you && this.o.lanes >= 3 && SURGE.some((k) => this.wallAt(c, cars, this.o.you! * k));
  }
  private wallAt(c: Occupant, cars: Occupant[], u: number) {
    const L = this.o.lanes;
    if (c.v === undefined || c.v >= u) return false;
    const own = [...cars.filter((x) => !x.oncoming && x.v !== undefined && x.at !== undefined), c];
    const meet = (c.z - (c.v * c.at!) / u) / (1 - c.v / u); // where you draw level with it
    const mean = own.reduce((a, x) => a + x.v!, 0) / own.length, span = Math.min(30, Math.max(6, (u - mean) * CROSS));
    const at = new Map<Occupant, number>();
    for (let P = meet - 150; P <= meet - 30; P += 15) {
      // everyone where they will be, a lane a queue: a car that catches a slower one falls in behind it
      for (let l = 0; l < L; l++) {
        const lane = own.filter((x) => x.lane === l).map((x) => ({ x, z: x.z + (x.v! * (P - x.at!)) / u })).sort((a, b) => b.z - a.z);
        for (let i = 0; i < lane.length; i++) {
          if (i) lane[i].z = Math.min(lane[i].z, lane[i - 1].z - FOLLOW - lane[i - 1].x.v! * 1.35);
          at.set(lane[i].x, lane[i].z);
        }
      }
      const cz = at.get(c)!;
      // a chain from c to each edge of the road, each car within span of one in the next lane
      const chain = (z: number, lane: number, side: number): boolean =>
        lane < 0 || lane >= L || own.some((x) => x !== c && x.lane === lane && Math.abs(at.get(x)! - z) < span && chain(at.get(x)!, lane + side, side));
      if (chain(cz, c.lane - 1, -1) && chain(cz, c.lane + 1, 1)) return true;
    }
    return false;
  }

  private row(z: number, d: number, cars: Occupant[], playerZ: number): Row {
    const r = () => this.rnd();
    const total = PATTERNS.reduce((a, p) => a + Math.max(0, p.weight(d)), 0);
    let pick = r() * total, p = PATTERNS[0];
    for (const x of PATTERNS) { pick -= Math.max(0, x.weight(d)); if (pick <= 0) { p = x; break; } }
    let spawns = p.make(this.o, r).map((s) => ({ ...s, heavy: !!s.heavy }));
    // never close the road: count the lanes this row and nearby cars block
    const blocked = (extra: typeof spawns) => {
      const set = new Set<number>();
      for (const c of cars) if (!c.oncoming && Math.abs(c.z - z) < 28) set.add(c.lane);
      for (const s of extra) set.add(s.lane);
      return set;
    };
    while (spawns.length && blocked(spawns).size >= this.o.lanes) spawns.pop();
    if (this.spare && z < this.spare.until) spawns = spawns.filter((s) => s.lane !== this.spare!.lane);
    // and keep clear of a car already in the same spot
    spawns = spawns.filter((s) => !cars.some((c) => !c.oncoming && c.lane === s.lane && Math.abs(c.z - (z + s.dz)) < 14));
    // and never one that would make a wall by the time you reach it
    const out: Spawn[] = [], at = this.at(z, playerZ), placed = (s: Spawn): Occupant => ({ lane: s.lane, z: z + s.dz, oncoming: false, v: s.v0, at });
    for (const s of spawns) {
      const o: Spawn = { lane: s.lane, dz: s.dz, heavy: s.heavy, v0: this.speed(s.lane, s.heavy, false), oncoming: false };
      if (!this.walls(placed(o), [...cars, ...out.map(placed)])) out.push(o);
    }
    // the other carriageway, on a two-way road: steady oncoming traffic
    if (this.o.oncomingLanes && r() < 0.35 + d * 0.5) {
      const lane = Math.floor(r() * this.o.oncomingLanes), heavy = r() < 0.2;
      out.push({ lane, dz: r() * 20, heavy, v0: this.speed(lane, heavy, true), oncoming: true });
    }
    return { z, spawns: out, pattern: p.name };
  }
}

/** A row's seed on a course: the course's and the row's number, mixed. */
export function seedOf(seed: number, i: number) {
  let h = (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i + 1, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  return (h % 2147483646) + 1;
}
