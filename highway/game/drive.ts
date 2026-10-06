// One run's rules, without a picture: your car on the physics, the traffic the
// director plans and the drivers drive, the guardrails, near misses and the
// score, contact and the crash rule. The page (surface/run.ts) draws it; a
// script can play it headless (scripts/economy.ts). It tells whoever listens
// what happened through events.
import { Vehicle, type Input } from "./vehicle.ts";
import { Traffic, crossing, heading, type Npc } from "./traffic.ts";
import { Director, type Course } from "./director.ts";
import { Score, DOUBLE_SURGE, type Miss } from "./score.ts";
import { collide, resolve, type Pt, type Rigid } from "./crash.ts";
import { TRAFFIC, FEEL, spec, topOf, trafficTop, type ModeId, type PlayerCar, type Upgrades } from "./content.ts";
import { laneX, oncomingX, edges, LANE_W, RAIL, type Layout } from "./layout.ts";

/** Closing speed that ends a run (km/h on the dial), as in the original; any touch of an oncoming car does too. */
export const FATAL_KMH = 35;

export type Crash = { you: number; them: number; kind: string; oncoming: boolean };
export type DriveEvents = {
  miss?(m: Miss, n: Npc, side: number): void;
  pass?(n: Npc, gap: number, closing: number, side: number): void;
  bump?(impulse: number, side: number): void;
  crash?(info: Crash): void;
  scrape?(): void;
  checkpoint?(added: number): void;
  end?(why: End): void;
};
/** Why a run ended: a crash, the clock (Time Attack), too slow for too long (Speed Trap), the finish line (a Sprint). */
export type End = "crash" | "time" | "slow" | "line";
/** A Sprint: a fixed road (game/director.ts) `length` m long on the dial, its traffic `density` (0..1) from the start. */
export type SprintRoad = { seed: number; length: number; density: number };

/** A run packed for storage (`Drive.pack`). */
export type Packed = { car: string; up: Upgrades; mode: ModeId; drive: object; veh: object; traffic: object; director: object; score: object };

/** A car's footprint: width and length, m, and where the model is at hand its collision outline (`planform` of
 *  what is drawn, pulled in by `INSET` and `INSET_END`). */
export type Size = { x: number; z: number; hull?: Pt[] };

/** How far inside what is drawn a car collides, m: across and along. A gap the eye sees is a miss, and a
 *  scrape a hair under it is forgiven too (the screen's last pixel of paint is never the reason a run ends). */
export const INSET = 0.08, INSET_END = 0.1;
/** Momentum: the combo pushes at most this share past the top speed, with this much acceleration (m/s², on the dial),
 *  and once it breaks the push fades this many km/h a second. */
const SURGE_MAX = 0.15, SURGE_PUSH = 6, SURGE_FADE = 20;
/** How far off its lane's centre a driver keeps (at most, m), and how far it drifts about that. */
const SIDE = 0.33, DRIFT = 0.12;
/** Time Attack's checkpoints are this far apart on the dial, m. */
const CHECKPOINT_M = 2500;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class Drive {
  mode: ModeId;
  veh: Vehicle;
  traffic: Traffic;
  director: Director;
  score = new Score();
  over = false;
  scraping = 0;
  ended: End | null = null;
  ghost = false; // nothing touches: a staged scene for the store's pictures
  /** Momentum: km/h past the top speed the combo is worth; it holds while the combo lives and fades once it breaks. */
  surge = 0;
  // Time Attack: the clock and the next checkpoint (m on the dial); Speed Trap: the floor and time under it
  clock = 60; checkpoints = 0; floor = 0; under = 0;
  /** The body on its springs (squat, dive, lean), for the car and the camera. */
  spring = { pitch: 0, pitchV: 0, roll: 0, rollV: 0 };
  /** A Sprint's road, else the open road. */
  sprint: SprintRoad | null;
  private seed: number;
  private pace = FEEL.pace; // the pace the car's physics were made at

  constructor(public layout: Layout, public car: PlayerCar, public up: Upgrades, public size: Size, wheelbase: number,
    private sizeOf: (id: string) => Size | undefined, public events: DriveEvents = {}, o: { density?: number; seed?: number; mode?: ModeId; sprint?: SprintRoad } = {}) {
    this.mode = o.mode ?? "endless";
    this.sprint = o.sprint ?? null;
    this.seed = o.seed ?? Math.floor(Math.random() * 2147483646) + 1;
    this.veh = new Vehicle(spec(car, up, wheelbase));
    this.veh.x = laneX(layout, Math.min(1, layout.lanes - 1));
    this.veh.launch((100 / 3.6) * FEEL.pace);
    this.traffic = new Traffic(layout.lanes, layout.oncoming);
    // a Sprint plans its rows as far ahead as the car can see at its fastest, so every speed meets the same road
    const course: Course | undefined = this.sprint ? { seed: this.sprint.seed, density: this.sprint.density, reach: Math.max(320, (this.veh.spec.top ?? 60) * 1.25 * 7) } : undefined;
    this.director = new Director({ lanes: layout.lanes, oncomingLanes: layout.oncoming, topSpeed: trafficTop(car, up) / 3.6, rnd: () => this.rnd(), density: o.density ?? 1, course });
    this.director.spare = { lane: Math.min(1, layout.lanes - 1), until: 150 };
  }

  /** The run as plain data, to carry it over a reload: pal may drop a hidden page, and the page saves this when it hides. */
  pack(): Packed {
    const data = (o: object, skip: string[] = []) => JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !skip.includes(k)))));
    return {
      car: this.car.id, up: this.up, mode: this.mode,
      drive: data(this, ["layout", "car", "up", "size", "sizeOf", "events", "veh", "traffic", "director", "score", "mode"]),
      veh: data(this.veh, ["spec"]), traffic: data(this.traffic), director: data(this.director, ["o"]), score: data(this.score),
    };
  }

  /** Carry on from `pack()`; the car and mode must be the ones it was packed with. */
  unpack(p: Packed) {
    Object.assign(this, p.drive);
    Object.assign(this.veh, p.veh);
    Object.assign(this.traffic, p.traffic);
    Object.assign(this.director, p.director);
    Object.assign(this.score, p.score);
  }

  rnd() { return (this.seed = (this.seed * 16807) % 2147483647) / 2147483647; }

  /** Swap the car, keeping where and how fast it goes (the garage's browsing, an upgrade bought). */
  setCar(car: PlayerCar, up: Upgrades, size: Size, wheelbase: number) {
    const old = this.veh;
    this.car = car; this.up = up; this.size = size;
    this.veh = new Vehicle(spec(car, up, wheelbase));
    this.veh.x = old.x; this.veh.z = old.z;
    this.veh.launch(old.u * (FEEL.pace / this.pace));
    this.pace = FEEL.pace;
  }

  /** The most a combo can push past the top speed, km/h: 15% of it. */
  get surgeMax() { return topOf(this.car, this.up) * SURGE_MAX; }

  /** A Sprint's metres left to the line. */
  get toLine() { return this.sprint ? Math.max(0, this.sprint.length - this.score.distance) : 0; }

  /** What a car collides as: its outline (`Size.hull`, inset already), else its box pulled in by the insets. */
  private outline(s: Size): { w: number; l: number; hull?: Pt[] } {
    return s.hull ? { w: s.x, l: s.z, hull: s.hull } : { w: s.x - 2 * INSET, l: s.z - 2 * INSET_END };
  }

  /** Time Attack: metres on the dial to the next checkpoint (one every 2.5 km), and the seconds it adds: 30, 27,
   *  24 ... never under 12. */
  get toCheckpoint() { return (this.checkpoints + 1) * CHECKPOINT_M - this.score.distance; }
  get bonus() { return Math.max(12, 30 - 3 * this.checkpoints); }

  get kmh() { return this.veh.kmh / FEEL.pace; }

  /** Which of our lanes the car is in, and whether it is over the centre line. */
  lanePos() {
    const lane = Math.round((this.veh.x - laneX(this.layout, 0)) / LANE_W);
    return { lane: clamp(lane, 0, this.layout.lanes - 1), oncoming: this.layout.oncoming > 0 && this.veh.x > 0 };
  }

  private pickKind(heavy: boolean, rnd: () => number) {
    const list = TRAFFIC.filter((t) => !!t.heavy === heavy);
    let r = rnd() * list.reduce((a, t) => a + t.weight, 0);
    for (const t of list) if ((r -= t.weight) <= 0) return t;
    return list[0];
  }

  /** End the run, once. */
  private finish(why: End) {
    if (this.over) return;
    this.over = true;
    this.ended = why;
    this.events.end?.(why);
  }

  step(dt: number, input: Input) {
    const v = this.veh, L = this.layout, ev = this.events;
    if (this.over) input = { throttle: 0, brake: 0.3, steer: 0 };
    // momentum: the combo's surge pushes the car on past its top speed; a broken combo lets it fade
    if (!this.score.combo || this.over) this.surge = Math.max(0, this.surge - SURGE_FADE * dt);
    v.over = (this.surge / 3.6) * FEEL.pace;
    v.boost = this.surge > 0 ? SURGE_PUSH * FEEL.pace : 0;
    v.step(dt, input);

    // the guardrails
    const [lo, hi] = edges(L);
    const lim = (hi - lo) / 2 + RAIL - this.size.x / 2, mid = (hi + lo) / 2;
    if (Math.abs(v.x - mid) > lim) {
      v.x = mid + Math.sign(v.x - mid) * lim;
      v.v *= -0.3; v.yaw *= 0.5; v.r *= 0.5; v.u *= 1 - 1.2 * dt;
      if (this.scraping <= 0) ev.scrape?.();
      this.scraping = 0.15;
      this.score.breakCombo();
    }
    this.scraping = Math.max(0, this.scraping - dt);

    // traffic: plan, drive, place
    if (!this.over) this.director.time += dt;
    const rows = this.director.plan(v.z, v.u, this.traffic.cars.map((n) => ({ lane: n.lane, z: n.z, oncoming: n.oncoming })));
    for (const row of rows) {
      // a course's row draws its cars from its own seed, so the same row always brings the same cars
      let rs = row.seed ?? 0;
      const r = row.seed ? () => (rs = (rs * 16807) % 2147483647) / 2147483647 : () => this.rnd();
      for (const s of row.spawns) {
        const kind = s.heavy ? this.pickKind(true, r) : this.pickKind(r() < 0.12, r);
        const size = this.sizeOf(kind.id);
        if (!size) continue;
        this.traffic.add({ kind: kind.id, length: size.z, width: size.x, z: row.z + s.dz, v: s.v0, lane: s.lane, v0: s.v0, T: 1.1 + r() * 0.6, a: kind.heavy ? 0.8 : 1.4, b: 2.5, oncoming: s.oncoming, politeness: 0.3 + r() * 0.4,
          side: (r() * 2 - 1) * SIDE, phase: r() * Math.PI * 2, cooldown: 1.5 + r() * 6 });
      }
    }
    const lp = this.lanePos();
    this.traffic.step(dt, { z: v.z, v: v.u, lane: lp.lane, length: this.size.z });
    for (const n of this.traffic.cars) {
      if (n.hit) continue;
      const at = (l: number) => (n.oncoming ? oncomingX(L, l) : laneX(L, l));
      // nobody drives dead centre: each keeps to its own side of its lane and drifts about it, so the line between two
      // lanes is open between some pairs and shut between others, never a lane of its own
      n.x = at(n.from) + (at(n.lane) - at(n.from)) * crossing(n) + n.side + DRIFT * Math.sin(this.score.time * 0.35 + n.phase);
    }

    // passing: near misses and the whoosh
    const kmh = this.kmh;
    for (const n of this.traffic.cars) {
      if (n.hit || n.passed || n.z > v.z) continue;
      n.passed = true;
      const gap = Math.abs(n.x - v.x) - (n.width + this.size.x) / 2;
      const closing = v.u - (n.oncoming ? -n.v : n.v);
      const side = n.x > v.x ? -1 : 1; // -1: it went by on the left of the screen
      ev.pass?.(n, gap, closing, side);
      if (this.over) continue;
      const m = this.score.pass(gap, kmh, n.oncoming || lp.oncoming);
      if (m) {
        this.surge = Math.min(this.surgeMax, this.surge + m.grade.surge + (m.double ? DOUBLE_SURGE : 0));
        ev.miss?.(m, n, side);
      }
    }

    // contact (none for a staged run, which plays on while a picture is taken)
    if (!this.ghost) for (const n of this.traffic.cars) {
      // the cars as they are drawn: the player turned FEEL.yaw of its heading, the traffic into its lane change
      const nyaw = heading(n, (l) => (n.oncoming ? oncomingX(L, l) : laneX(L, l)));
      const c = collide({ x: v.x, z: v.z, yaw: v.yaw * FEEL.yaw, ...this.outline(this.size) }, { x: n.x, z: n.z, yaw: nyaw, ...this.outline(this.sizeOf(n.kind) ?? { x: n.width, z: n.length }) });
      if (!c) continue;
      const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
      const me: Rigid = { x: v.x, z: v.z, vx: v.u * sy + v.v * cy, vz: v.u * cy - v.v * sy, r: v.r, m: v.spec.mass, I: (v.spec.mass * (this.size.z ** 2 + this.size.x ** 2)) / 12 };
      const nm = TRAFFIC.find((t) => t.id === n.kind)?.heavy ? 5500 : 1400;
      const nvz = n.hit ? n.v * (n.oncoming ? -1 : 1) : n.oncoming ? -n.v : n.v;
      const them: Rigid = { x: n.x, z: n.z, vx: n.hit?.vx ?? 0, vz: nvz, r: n.hit?.r ?? 0, m: nm, I: (nm * (n.length ** 2 + n.width ** 2)) / 12 };
      const closing = Math.abs((me.vx - them.vx) * c.nx + (me.vz - them.vz) * c.nz) * 3.6;
      const j = resolve(me, them, c);
      v.x = me.x; v.z = me.z; v.r = me.r;
      v.u = Math.max(0, me.vx * sy + me.vz * cy);
      const fatal = closing / FEEL.pace >= FATAL_KMH || n.oncoming;
      if (fatal) { v.v = me.vx * cy - me.vz * sy; v.knocked = 2; } // the run is over: the tyres slide it to a stop
      else { v.v = clamp(me.vx * cy - me.vz * sy, -4, 4); v.r = 0; } // a shove sideways your steering soaks up
      n.x = them.x; n.z = them.z;
      n.v = Math.abs(them.vz);
      n.hit = { vx: them.vx, yaw: nyaw, r: them.r };
      n.signal = 0;
      if (!this.over && fatal) {
        ev.crash?.({ you: Math.round(kmh), them: Math.round((n.v * 3.6) / FEEL.pace), kind: n.kind, oncoming: n.oncoming });
        this.finish("crash");
      } else ev.bump?.(j, n.x > v.x ? -1 : 1);
    }
    this.traffic.remove((n) => n.z < v.z - 70 || n.z > v.z + 1000);

    // the body on its springs: squat, dive, and a lean with the steering as the original's does
    // (4 degrees + 0.05 per km/h at full lock, times `lean`)
    const sp = this.spring;
    const pitchT = clamp(-v.ax * 0.0045, -0.05, 0.05);
    const rollT = v.knocked > 0 ? clamp(v.ay * 0.0055, -0.06, 0.06) : v.steer * ((4 + 0.05 * kmh) * Math.PI / 180) * FEEL.lean;
    sp.pitchV += ((pitchT - sp.pitch) * 120 - sp.pitchV * 11) * dt; sp.pitch += sp.pitchV * dt;
    sp.rollV += ((rollT - sp.roll) * 110 - sp.rollV * 10) * dt; sp.roll += sp.rollV * dt;

    if (this.over) return;
    this.score.tick(dt, kmh, lp.oncoming);

    // the modes' own rules
    if (this.sprint) {
      if (this.score.distance >= this.sprint.length) this.finish("line");
    } else if (this.mode === "time") {
      this.clock -= dt;
      if (this.toCheckpoint <= 0) {
        const added = this.bonus;
        this.checkpoints++;
        this.clock += added;
        ev.checkpoint?.(added);
      }
      if (this.clock <= 0) { this.clock = 0; this.finish("time"); }
    } else if (this.mode === "trap") {
      // 90 km/h for the first 10 s, then 5 more every 10 s
      this.floor = 90 + 5 * Math.floor(this.score.time / 10);
      this.under = kmh < this.floor ? this.under + dt : Math.max(0, this.under - dt * 2);
      if (this.under >= 3) this.finish("slow");
    }
  }
}
