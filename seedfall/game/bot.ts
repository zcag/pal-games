// The player-like bot (DESIGN R15): it plays the real Game through `step(dt, input)` with the keys a person has, sees
// only what a person sees (lamp-lit map memory, scanner outlines, glowing ore on screen, the HUD's fuel tick, heat
// and hull), reacts with a delay, routes imperfectly, turns back with some risk-taking, rides the Lift, docks, and
// shops like a person following the UI: mostly the suggestion card, sometimes comfort, research and modules, rigs,
// the lab, the lance, the launch, perks and the planet. Level 1 of R15 is the dive (plan + controller + decisions);
// level 2 is the session (town and shop). `Rec` records what scripts/economy.ts and the tests report.
import { W, H, FLAG, HAZ, STATS, type Input, type GameEvent, type PlanetId, type Stat } from "./types.ts";
import { rng, hash, type Rng } from "./rng.ts";
import { MAT, MATERIALS, FINDS, CHAMBER, biomeDef, piecesPerTile, slotOfRow } from "./content/world.ts";
import {
  STAT_FX, UPGRADES, GATES, ITEMS, MODULES, RESEARCH, rigYield, rigCost, RIG_MAX, LAB_LEVELS, PERKS, HEARTSTONE_NEEDED,
  type ItemId, type ModuleId,
} from "./content/economy.ts";
import { HW, M_EMPTY, fuelRow } from "./pod.ts";
import { frontierRow, valueMult } from "./meta.ts";
import type { Game } from "./game.ts";

// ---------------------------------------------------------------- skills

export interface Skill {
  name: string;
  /** Seconds from a finished step to the next key (a person noticing and pressing). */
  react: number;
  /** Seconds between decisions (what to dig next). */
  think: number;
  /** Turn back when fuel <= the HUD's home tick x margin (+ a small reserve); `spread` is the per-dive variance. */
  margin: number;
  spread: number;
  /** Share of the tank a dive may spend reaching the work row and back. */
  budget: number;
  /** Turn back at this hull share. */
  hullTurn: number;
  /** Rows past the heat line worked in (heat builds slowly there). */
  heatPush: number;
  /** Routing imperfection: per-tile cost noise. */
  noise: number;
  /** Seconds per shop action (reading the card, opening a building). */
  menu: [number, number];
  /** Chance per dock of buying the suggestion at once when affordable. */
  follow: number;
  /** Chance per dock of a comfort level. */
  comfort: number;
  /** Chance per dock of visiting the rig office; payback (minutes) a rig level must beat. */
  rigs: number;
  rigPayback: number;
  /** B presses at most this many times a dock (the card keeps lighting up while cash lasts). */
  presses: number;
  /** Seconds between manual scanner pulses while searching. */
  scanEvery: number;
  /** Respects the goal line's hull gate within this many levels before entering a biome. */
  hullGate: number;
  /** Seconds a dive lasts before the person heads home anyway. */
  maxDive: number;
  /** Chance a hazard tell is missed (digs under a boulder, into gas). */
  slip: number;
  /** Fraction of a turn's fuel misread (casual players sometimes run dry). */
  misjudge: number;
}

export const SKILLS: Record<string, Skill> = {
  casual: {
    name: "casual", react: 0.26, think: 0.7, margin: 1.7, spread: 0.3, budget: 0.4, hullTurn: 0.3, heatPush: 0, noise: 0.35,
    menu: [2.5, 6], follow: 0.75, comfort: 0.3, rigs: 0.35, rigPayback: 7, presses: 3, scanEvery: 20, hullGate: 0, maxDive: 240, slip: 0.25, misjudge: 0.08,
  },
  regular: {
    name: "regular", react: 0.17, think: 0.45, margin: 1.55, spread: 0.18, budget: 0.48, hullTurn: 0.25, heatPush: 2, noise: 0.2,
    menu: [1.5, 4], follow: 0.9, comfort: 0.25, rigs: 0.5, rigPayback: 6, presses: 4, scanEvery: 12, hullGate: 1, maxDive: 330, slip: 0.1, misjudge: 0.03,
  },
  good: {
    name: "good", react: 0.11, think: 0.3, margin: 1.35, spread: 0.1, budget: 0.55, hullTurn: 0.2, heatPush: 4, noise: 0.08,
    menu: [0.8, 2.2], follow: 1, comfort: 0.2, rigs: 0.6, rigPayback: 6, presses: 5, scanEvery: 9, hullGate: 3, maxDive: 400, slip: 0.03, misjudge: 0,
  },
};

/** Strategy variants for the R1 dominance check: turn back at the tick (normal), run dry and tow, or teleport home. */
export type Strategy = "normal" | "tow" | "teleport";

// ---------------------------------------------------------------- the record

export interface Buy { t: number; dock: number; what: string; id: string; level: number; cost: number }
export interface Dive {
  t0: number; t1: number; end: string; maxRow: number; dug: number; ores: number; pieces: number; transit: number;
  value: number; slot: number; frozen: boolean; limit: string; items: number;
  /** Fuel and the HUD's home tick when the dive turned back, and the fuel left on surfacing (the tick's honesty). */
  turnFuel: number; turnHome: number; endFuel: number; turnRow: number;
}
export interface Dock { t: number; sale: number; rigs: number; buys: number; gates: number; stats: Partial<Record<Stat, number>>; earned: number }
export interface RunRec {
  run: number; planet: PlanetId; t0: number; t1: number; launched: boolean;
  /** Seconds from the run's start to first reaching each slot (1..6, 7 = the chamber). */
  reach: number[];
  buys: Buy[]; docks: Dock[]; dives: Dive[];
  wrecks: number; tows: number; teleports: number; sealed: number;
  earned: number; sales: number; rigIncome: number; shards: number;
  /** Ore pieces left per biome slot at the end (and at generation). */
  oreLeft?: number[]; oreStart?: number[];
}
export interface Sample { t: number; row: number; mode: string; fuel: number; home: number; cargo: number; hull: number; heat: number; cash: number }

export class Rec {
  runs: RunRec[] = [];
  samples: Sample[] = [];
  /** Dive time by what the pod was doing (seconds): dig, drive, thrust, air, ride, idle, dead. */
  doing: Record<string, number> = {};
  /** Stalls: 10 s in a dive with the pod within 2 tiles and nothing dug (a bot fault to look at, or a person's dither). */
  stalls: { t: number; mode: string; target: string; x: number; y: number; next: string; note: string }[] = [];
  trace = false;
  log: string[] = [];
  cur(): RunRec { return this.runs[this.runs.length - 1]; }
  note(s: string) { if (this.trace) this.log.push(s); }
}

// ---------------------------------------------------------------- the planner (what a person can see)

const INF = 1e9;
const DIRS: [number, number][] = [[0, 1], [-1, 0], [1, 0], [0, -1]]; // down, left, right, up

class Heap {
  private k: number[] = []; private v: number[] = [];
  get size() { return this.k.length; }
  clear() { this.k.length = 0; this.v.length = 0; }
  push(key: number, val: number) {
    const k = this.k, v = this.v;
    let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  topKey() { return this.k[0]; }
  pop(): number {
    const k = this.k, v = this.v, top = v[0], lk = k.pop()!, lv = v.pop()!, n = k.length;
    if (n) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = -1, mk = lk;
        if (l < n && k[l] < mk) { m = l; mk = k[l]; }
        if (r < n && k[r] < mk) { m = r; mk = k[r]; }
        if (m < 0) break;
        k[i] = k[m]; v[i] = v[m]; i = m;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

/** Dijkstra over (tile, direction of the last move): a turn costs a moment (a key change, and in the air a hover),
 * so plans come out as a person digs: straight shafts and galleries, not staircases. */
export class Planner {
  /** Best cost per tile (any arrival direction) and the state that reached it. */
  dist = new Float64Array(W * H);
  best = new Int32Array(W * H);
  stamp = new Int32Array(W * H);
  private sd = new Float64Array(W * H * 5);
  private sp = new Int32Array(W * H * 5);
  private ss = new Int32Array(W * H * 5);
  gen = 0;
  private heap = new Heap();
  /** Tiles to avoid for a while (stuck, too hard where unseen), with the time they clear. */
  block = new Map<number, number>();
  turn = 0.5;

  constructor(private bot: Bot) {}

  reached(i: number) { return this.stamp[i] === this.gen && this.dist[i] < INF; }

  /** From the pod's tile over rows [y0, y1]; stops early once `goal` is popped. Returns the goal tile or -1. */
  /** Plans this game second: a person does not re-think more than a few times a second (and a plan that keeps
   * failing must not spin the simulator). */
  private second = -1;
  private count = 0;
  starved = 0;
  run(start: number, y0: number, y1: number, goal?: (i: number) => boolean): number {
    const sec = Math.floor(this.bot.g.time);
    if (sec !== this.second) { this.second = sec; this.count = 0; }
    if (++this.count > 6) { this.starved++; this.gen++; return -1; }
    const dist = this.dist, best = this.best, stamp = this.stamp, sd = this.sd, sp = this.sp, ss = this.ss, heap = this.heap;
    const gen = ++this.gen;
    heap.clear();
    const s0 = start * 5 + 4;
    sd[s0] = 0; sp[s0] = -1; ss[s0] = gen;
    dist[start] = 0; best[start] = s0; stamp[start] = gen;
    heap.push(0, s0);
    const c = this.bot.costs();
    const turn = this.turn;
    while (heap.size) {
      const d = heap.topKey(), st = heap.pop();
      if (d > sd[st]) continue;
      const i = (st / 5) | 0, ld = st % 5;
      if (goal && goal(i)) return i;
      const x = i % W, y = (i / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + DIRS[k][0], ny = y + DIRS[k][1];
        if (nx < 1 || nx > W - 2 || ny < y0 || ny > y1 || ny >= H) continue;
        const j = ny * W + nx;
        let cost = c(i, j, k, ld === 3);
        if (cost >= INF) continue;
        if (ld !== 4 && ld !== k) cost += turn;
        const nd = d + cost, ns = j * 5 + k;
        if (ss[ns] !== gen || nd < sd[ns]) {
          ss[ns] = gen; sd[ns] = nd; sp[ns] = st; heap.push(nd, ns);
          if (stamp[j] !== gen || nd < dist[j]) { stamp[j] = gen; dist[j] = nd; best[j] = ns; }
        }
      }
    }
    return -1;
  }

  path(to: number): number[] {
    const out: number[] = [];
    for (let st = this.best[to]; st >= 0 && out.length < 4000; st = this.sp[st]) out.push((st / 5) | 0);
    return out.reverse();
  }
}

// ---------------------------------------------------------------- the bot

type Mode = "town" | "descend" | "work" | "return" | "launch" | "dead";

interface Target { i: number; kind: "ore" | "dig" | "explore" | "home" | "seed" | "crate" | "flee"; value: number }

export interface BotOpts {
  strategy?: Strategy;
  /** Planets to choose after each launch, in order (default: cinder, ferrum, vell). */
  planets?: PlanetId[];
  rec?: Rec;
}

export class Bot {
  g: Game;
  sk: Skill;
  r: Rng;
  plan: Planner;
  rec: Rec;
  opts: BotOpts;
  mode: Mode = "town";
  /** Current path (tile indices) and where we are in it. */
  path: number[] = [];
  at = 0;
  target: Target | null = null;
  private thinkT = 0;
  private holdOff = 0;
  private stuckT = 0;
  private lastTile = -1;
  private lastProgress = 0;
  private scanT = 0;
  private town: { phase: "pad" | "tally" | "shop" | "leave"; t: number; queue: (() => void)[]; dockN: number } = { phase: "leave", t: 0, queue: [], dockN: 0 };
  private dive: Dive | null = null;
  private diveMargin = 1.3;
  private endWhy = "";
  private workRow = 0;
  private limit = "fuel";
  private lastEnd = "";
  private dockCount = 0;
  private fleeT = 0;
  private sealedT = 0;
  private towWanted = false;
  private item: number | undefined;
  private scan = false;
  private confirm = false;
  private dump = false;
  private launchT = 0;
  private runIdx = 0;
  private stuckN = 0;
  private sampleT = 0;

  constructor(g: Game, skill: Skill, seed: number, opts: BotOpts = {}) {
    this.g = g;
    this.sk = skill;
    this.r = rng(hash(seed, 77, 3) * 4294967296);
    this.plan = new Planner(this);
    this.rec = opts.rec ?? new Rec();
    this.opts = opts;
    this.startRun();
  }

  // ---------------------------------------------------------------- the tick

  /** One tick's input. Call before `g.step(dt, input)`, then `observe` with the step's events. */
  tick(dt: number): Input {
    const g = this.g, p = g.pod;
    this.item = undefined; this.scan = false; this.confirm = false; this.dump = false;
    this.holdOff = Math.max(0, this.holdOff - dt);
    this.commitT = Math.max(0, this.commitT - dt);
    this.thinkT -= dt;
    this.scanT += dt;
    if (this.rec.trace) this.sample(dt);
    if (g.s.launch) return this.launching(dt);
    if (p.dead) { this.mode = "dead"; return none(); }
    if (g.inTown()) {
      if (this.mode !== "town") this.surfaced();
      return this.townTick(dt);
    }
    if (this.mode === "town" || this.mode === "dead") this.startDive();
    if (this.headT >= 0) return this.headTick(dt);
    if (this.dive) this.countDive(dt);
    return this.diveTick(dt);
  }

  observe(ev: GameEvent[]) {
    const g = this.g, run = this.rec.cur();
    for (const e of ev) {
      switch (e.t) {
        case "too_hard": case "unbreakable":
          this.plan.block.set(e.y * W + e.x, g.time + 60);
          this.replan();
          break;
        case "break": if (e.by === "drill" && this.dive) { this.dive.dug++; if (e.find && FINDS[e.find]?.kind === "ore") this.dive.ores++; } break;
        case "pickup": if (this.dive) { this.dive.pieces += e.count; this.dive.value += e.value; } break;
        case "wreck": run.wrecks++; this.endDive("wreck"); break;
        case "rescue": if (e.kind === "tow") { run.tows++; this.endDive("tow"); } break;
        case "teleport": if (e.phase === "done") { run.teleports++; this.endDive("teleport"); } break;
        case "gas_fuse": {
          const p = g.pod;
          if (Math.hypot(e.x + 0.5 - p.x, e.y + 0.5 - p.y) < 3.2 && !this.r.chance(this.sk.slip)) this.flee(e.x, e.y);
          break;
        }
        case "wobble": {
          const p = g.pod;
          if (Math.abs(e.x + 0.5 - p.x) < 1 && e.y < p.y && p.y - e.y < 8 && !this.r.chance(this.sk.slip)) this.flee(e.x, e.y + 0.5, true);
          break;
        }
        case "biome": if (e.first) { const slot = Math.max(1, e.biome); if (!run.reach[slot]) run.reach[slot] = g.time - run.t0; } break;
        case "dock":
          // a dock at the lift head: the stop we wanted, or one we pass through on the way up to town (the rules dock
          // a still car at the head whenever Head Station is researched)
          if (!g.inTown()) { this.visit++; if (this.toHead) { this.headT = this.r.range(1.0, 1.6); this.headBuys = 0; this.toHead = false; this.climbing = false; } }
          this.docked(e.sale.lines.reduce((a, l) => a + l.value, 0), e.sale.rigs);
          break;
        case "buy": {
          if (e.what === "item") break;
          const cost = this.lastCost;
          run.buys.push({ t: g.time - run.t0, dock: this.dockCount, what: e.what, id: e.id, level: e.level, cost });
          const d = run.docks[run.docks.length - 1];
          if (d && (this.mode === "town" || this.headT >= 0) && (e.what === "upgrade" || e.what === "lift" || e.what === "lance")) {
            // workshop purchases (upgrades, Lift, lance); rigs and the lab are their own sink
            d.buys++;
            if (e.what === "upgrade") d.stats[e.id as Stat] = (d.stats[e.id as Stat] ?? 0) + 1;
            if (this.gateBuy) d.gates++;
          }
          break;
        }
      }
    }
    if (g.s.reached >= 7 && !run.reach[7]) run.reach[7] = g.time - run.t0;
  }

  // ---------------------------------------------------------------- runs

  private startRun() {
    const g = this.g;
    this.rec.runs.push({
      run: this.runIdx++, planet: g.s.planet, t0: g.time, t1: g.time, launched: false, reach: [], buys: [], docks: [], dives: [],
      wrecks: 0, tows: 0, teleports: 0, sealed: 0, earned: 0, sales: 0, rigIncome: 0, shards: 0,
      oreStart: orePieces(g),
    });
    this.mode = "town";
    this.town = { phase: "leave", t: 0.5, queue: [], dockN: 0 };
    this.plan.block.clear();
    this.setLoadout();
  }

  private launching(dt: number): Input {
    const g = this.g, L = g.s.launch!;
    this.mode = "launch";
    this.launchT += dt;
    // watch the sequence, then pick a planet like a person reading Ida's offer
    if (L.t >= 19 + this.r.range(this.sk.menu[0], this.sk.menu[1]) * 0 && this.launchT > 22) {
      const run = this.rec.cur();
      run.t1 = g.time; run.launched = true; run.earned = g.s.earned; run.shards = L.shards;
      run.oreLeft = orePieces(g);
      const want = this.opts.planets ?? ["cinder", "ferrum", "vell"];
      const pick = want[(g.s.launches) % want.length];
      const choice = L.choices.includes(pick) ? pick : L.choices[0];
      // the observatory first (shards from this launch), then Ida's planet: Head Start applies to the new world
      this.buyPerks();
      g.choosePlanet(choice);
      this.launchT = 0;
      this.startRun();
    }
    return none();
  }

  /** Close the current run's books (the economy script calls this when it stops a run that did not launch). */
  closeRun() {
    const run = this.rec.cur(), g = this.g;
    if (run.launched) return;
    run.t1 = g.time; run.earned = g.s.earned; run.oreLeft = orePieces(g);
  }

  // ---------------------------------------------------------------- the dive

  private startDive() {
    const g = this.g, run = this.rec.cur();
    this.mode = "descend";
    this.path = []; this.target = null; this.thinkT = 0; this.climbing = false; this.toHead = false;
    this.endWhy = "";
    this.sealedT = 0; this.stuckN = 0; this.giveUps = 0;
    this.towWanted = false;
    // per-dive nerve: some dives the person pushes, some they play safe
    this.diveMargin = Math.max(1.02, this.sk.margin * (1 + this.sk.spread * (this.r.next() * 2 - 1)));
    const { row, why } = this.workLimit();
    this.workRow = row; this.limit = why;
    const frozen = why !== "fuel" && g.s.deepest >= row - 8;
    this.dive = { t0: g.time, t1: 0, end: "", maxRow: 0, dug: 0, ores: 0, pieces: 0, transit: 0, value: 0, slot: 0, frozen, limit: why, items: 0, turnFuel: 0, turnHome: 0, endFuel: 0, turnRow: 0 };
    run.dives.push(this.dive);
    this.rec.note(`${fmt(g.time - run.t0)} dive ${run.dives.length}: work row ${row} (${why}), deepest ${g.s.deepest}, fuel ${g.pod.fuel.toFixed(1)}/${g.pod.fuelMax.toFixed(1)}`);
  }

  private countDive(dt: number) {
    const d = this.dive!, p = this.g.pod;
    const row = Math.floor(p.y);
    if (row > d.maxRow) { d.maxRow = row; d.slot = this.g.live.w.biome[Math.max(0, Math.min(H - 1, row)) * W + Math.max(1, Math.min(W - 2, Math.floor(p.x)))]; }
    if ((this.mode === "descend" || this.mode === "return") && !p.dig) d.transit += dt;
    this.watch(dt);
    const what = p.dig ? "dig" : p.riding ? "ride" : p.thrusting ? "thrust" : !p.grounded ? "air" : Math.abs(p.vx) > 0.1 ? "drive" : this.holdOff > 0 ? "react" : "idle";
    this.rec.doing[what] = (this.rec.doing[what] ?? 0) + dt;
  }

  private watchT = 0;
  private giveUps = 0;
  private watchX = 0;
  private watchY = 0;
  private watchDug = 0;
  private watch(dt: number) {
    const p = this.g.pod, d = this.dive!;
    this.watchT += dt;
    if (this.watchT < 10) return;
    if (Math.hypot(p.x - this.watchX, p.y - this.watchY) < 2 && d.dug === this.watchDug && !p.dead) {
      const nx = this.path[this.at + 1];
      const w = this.g.live.w;
      this.rec.stalls.push({
        t: this.g.time, mode: this.mode, target: this.target?.kind ?? "-", x: p.x, y: p.y,
        next: nx === undefined ? "-" : `${nx % W},${(nx / W) | 0} ${w.mat[nx] ? MATERIALS[w.mat[nx]].key : "open"}`,
        note: `gr ${+p.grounded} rid ${+p.riding} vx ${p.vx.toFixed(1)} vy ${p.vy.toFixed(1)} fuel ${p.fuel.toFixed(0)} home ${p.fuelHome === Infinity ? "inf" : p.fuelHome.toFixed(1)} tow ${+this.towWanted} climb ${+this.climbing}`,
      });
      // getting nowhere (QA N11): a person gives up on that spot, and after a second time on the dive
      this.giveUps++;
      if (this.target) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.plan.block.set(this.target.i + dy * W + dx, this.g.time + 90);
      this.target = null; this.path = []; this.thinkT = 0; this.climbing = false; this.toHead = false;
      if (this.mode === "descend") this.mode = "work";
      if (this.giveUps >= 2 && this.mode !== "return") { this.endDive("stuck"); this.mode = "return"; }
    }
    this.watchT = 0; this.watchX = p.x; this.watchY = p.y; this.watchDug = d.dug;
  }

  private endDive(why: string) {
    if (!this.endWhy) this.endWhy = why;
    if (why === "wreck" || why === "tow" || why === "teleport") this.endWhy = why;
  }

  private surfaced() {
    this.closeDive();
    this.headDocks = 0;
    this.mode = "town";
    this.visit++;
    this.town = { phase: "pad", t: 0, queue: [], dockN: 0 };
    this.path = [];
  }

  private closeDive() {
    const g = this.g, run = this.rec.cur();
    if (this.dive) {
      this.dive.t1 = g.time;
      this.dive.end = this.endWhy || "home";
      this.dive.items = g.s.diveItems;
      this.dive.endFuel = g.pod.fuel;
      this.lastEnd = this.dive.end;
      this.rec.note(`${fmt(g.time - run.t0)}   end ${this.dive.end} after ${(this.dive.t1 - this.dive.t0).toFixed(0)} s, max row ${this.dive.maxRow}, dug ${this.dive.dug}, ores ${this.dive.ores}, $${this.dive.value.toFixed(0)}, transit ${this.dive.transit.toFixed(0)} s`);
      this.dive = null;
    }
  }

  // ---------------------------------------------------------------- Head Station (research L1): docking at the lift head

  private headDocks = 0;
  private toHead = false;
  private headT = -1;
  /** Use the lift head as the dock (sell, refuel, repair, B) and go up to town only every third dock. */
  private useHead() { return this.g.has("L1") && this.g.liftDepth > 0 && this.headDocks < 2 && !this.huntingSeed(); }

  /** Docked at the lift head: the tally, B while it is affordable, then straight back down (a new dive). */
  private headTick(dt: number): Input {
    const g = this.g;
    this.headT -= dt;
    if (this.headT > 0) return none();
    const sg = g.suggestion();
    if (sg && sg.kind !== "lance" && sg.cost <= g.s.cash && this.headBuys < 6 && this.r.chance(this.sk.follow)) {
      if (this.act(sg.cost, true, () => g.buySuggested())) { this.headBuys++; this.headT = this.menuTime(); return none(); }
    }
    this.headT = -1;
    this.closeDive();
    this.headDocks++;
    this.visit++;
    this.startDive();
    return { ...none(), down: true };
  }
  private headBuys = 0;

  /** How deep this dive works and what limits it: the heat line, the drill, the hull gate, the fuel budget. */
  workLimit(): { row: number; why: string } {
    const g = this.g, p = g.pod, s = g.s, P = g.power();
    let row = 769, why = "end";
    const heat = frontierRow(g) + this.sk.heatPush + (g.moduleOn("heatsink") ? 6 : 0);
    if (heat < row) { row = heat; why = "heat"; }
    // the drill: the deepest biome whose ore digs at ratio <= 2.5 (the label names the level a person needs)
    for (let slot = 1; slot <= 6; slot++) {
      const b = biomeDef(s.planet, slot);
      const okOre = (b.typical * 1.15) / P <= 2.5;
      const hullOk = s.levels.hull >= GATES[slot].hull - this.sk.hullGate;
      if (!okOre || !hullOk) {
        // too hard to mine yet: touch the biome once (its first entry opens things), then mine the one above's floor
        const r = okOre ? b.rows[0] : s.reached >= slot ? b.rows[0] - 3 : b.rows[0] + 1;
        if (r < row) { row = r; why = okOre ? "hull" : "drill"; }
        break;
      }
    }
    if (s.reached >= 6 && (s.levels.drill < GATES[7].drill) && 747 < row) { row = 747; why = "drill"; }
    // fuel: the shaft to the work row and the climb back must fit in the budget share of the tank
    const head = g.liftDepth;
    // a person reckons with a fairly full bay on the way back
    const kFull = (M_EMPTY + 0.7 * this.fullMass()) / M_EMPTY;
    const climb = fuelRow(g, kFull) * 1.25;
    const bottom = this.shaftBottom();
    // the goal line says the next biome is open: a person goes to see it, spending more of the tank on the way
    const goal = g.nextGoal();
    const scout = goal.kind === "biome" && goal.open && goal.slot <= 6 && s.reached < goal.slot && s.dives >= 3;
    const budget = (scout ? Math.min(0.75, this.sk.budget + 0.25) : this.sk.budget) * Math.min(p.fuel, p.fuelMax);
    let fuelRowMax = head;
    for (let r = head; r <= 769; r++) {
      const newRows = Math.max(0, r - bottom);
      const slot = slotOfRow(r);
      const h = biomeDef(s.planet, slot).typical / P;
      const digFuel = (0.25 + 0.4 * Math.min(2.5, h)) * (0.12 + 0.04 * h) * 1.15;
      // a new shaft row costs its dig; every row below the head costs its climb back
      const cost = (r - head) * climb + newRows * digFuel;
      if (cost > budget) break;
      fuelRowMax = r;
    }
    if (fuelRowMax < row) { row = fuelRowMax; why = "fuel"; }
    return { row: Math.max(row, Math.min(12, row)), why };
  }

  /** A full bay's mass with the ore around the work row (D3): what the climb back weighs. */
  private fullMass() {
    const g = this.g, slot = slotOfRow(Math.max(0, g.s.deepest));
    let m = 0, n = 0;
    for (const f of FINDS) if (f && f.kind === "ore" && f.biome === slot) { m += f.mass; n++; }
    return g.cargoMax() * (n ? m / n : 1);
  }

  /** The deepest open row of the mine-mouth column (the person's own shaft). */
  private shaftBottom() {
    const g = this.g, x = g.live.w.spawnX;
    let y = 0;
    while (y < H - 1 && !g.live.solid(x, y + 1)) y++;
    return y;
  }

  private diveTick(dt: number): Input {
    const g = this.g, p = g.pod;
    // ripcords and items first (a person glances at the HUD)
    const need = p.fuelHome;
    if (p.fuel <= 0) {
      if (this.opts.strategy !== "tow" || true) { this.confirm = this.r.chance(dt / 1.2); }
      if (p.items.fuel <= 0) this.endDive("tow");
      return this.withExtras(none());
    }
    if (p.items.fuel > 0 && p.itemCd <= 0 && p.fuel < 0.5 * p.fuelMax && need < INF && p.fuel < need * 1.08 + 0.2) this.item = 1;
    else if (p.items.repair > 0 && p.itemCd <= 0 && p.hull < 0.32 * p.hullMax) this.item = 2;
    else if (p.items.coolant > 0 && p.itemCd <= 0 && p.heat > 0.75) this.item = 6;

    // the decision: turn back, keep working, or what to dig next
    if (this.thinkT <= 0) {
      this.thinkT = this.sk.think * this.r.range(0.7, 1.3);
      this.decide();
    }
    if (this.fleeT > 0) this.fleeT -= dt;
    return this.withExtras(this.follow(dt));
  }

  private withExtras(inp: Input): Input {
    if (this.item) inp.item = this.item;
    if (this.scan) inp.scan = true;
    if (this.confirm) inp.confirm = true;
    if (this.dump) inp.dump = true;
    return inp;
  }

  /** Should the dive end? The HUD's tick, the bay, the hull, the heat, boredom. */
  private turnBack(): string | null {
    const g = this.g, p = g.pod, sk = this.sk;
    const need = p.fuelHome;
    if (this.mode === "return") return null;
    if (this.huntingSeed() && this.heartstones() >= HEARTSTONE_NEEDED) return null;
    if (need >= INF) return null; // sealed: handled by the sealed logic
    const st = this.opts.strategy ?? "normal";
    if (st === "normal") {
      const misread = this.r.chance(sk.misjudge * 0.02) ? 0.75 : 1;
      if (p.fuel <= need * this.diveMargin * misread + 0.4) return "fuel";
    } else if (st === "teleport") {
      if (p.items.teleport > 0) { if (p.fuel <= need * 0.35 + 0.2) return "teleport"; }
      else if (p.fuel <= need * this.diveMargin + 0.25) return "fuel";
    } else if (st === "tow") {
      // runs the tank dry on purpose, then calls the tow
      if (p.fuel <= 0.05) return "tow";
    }
    const free = g.cargoMax() - p.cargoUsed;
    if (free <= 0 && !this.huntingSeed()) return "full";
    if (p.hull < sk.hullTurn * p.hullMax) return "hull";
    if (p.heat > 0.85 && p.items.coolant <= 0) return "heat";
    if (this.dive && g.time - this.dive.t0 > sk.maxDive) return "bored";
    return null;
  }

  private decide() {
    const g = this.g, p = g.pod;
    // sealed in: no way home on the HUD
    if (p.fuelHome >= INF && !p.riding) {
      if (this.sealedT === 0) this.rec.cur().sealed++;
      this.sealedT += this.sk.think;
      if (this.sealedT > 2 && this.unseal()) return;
    } else { this.sealedT = 0; this.blastT = 0; }
    if (this.fleeT > 0 && this.target?.kind === "flee") return;

    const why = this.turnBack();
    if (why && this.mode !== "return") {
      if (this.dive) { this.dive.turnFuel = p.fuel; this.dive.turnHome = p.fuelHome; this.dive.turnRow = Math.floor(p.y); }
      this.rec.note(`${fmt(g.time - this.rec.cur().t0)}   turn back: ${why} (fuel ${p.fuel.toFixed(1)}, home ${p.fuelHome.toFixed(1)}, bay ${p.cargoUsed}/${g.cargoMax()}, row ${Math.floor(p.y)})`);
      if (why === "teleport") { this.item = 5; this.endDive("teleport"); this.mode = "return"; return; }
      if (why === "tow") { this.towWanted = true; this.endDive("tow"); }
      else this.endDive(why);
      if (!this.towWanted) { this.mode = "return"; this.target = null; this.path = []; }
    }
    if (this.towWanted) { this.burnToTow(); return; }

    if (this.mode === "return") { if (!this.target || this.target.kind !== "home" || this.blocked()) this.planHome(); return; }
    if (this.huntingSeed() && this.heartstones() >= HEARTSTONE_NEEDED) { this.planSeed(); return; }

    const row = Math.floor(p.y);
    if (this.mode === "descend" && row >= Math.min(this.workRow, this.shaftBottom()) - 1 && !p.riding) this.mode = "work";
    if (this.mode === "descend") { if (!this.target || this.blocked()) this.planDescend(); return; }

    // work: scanner pulse while looking
    if (g.scanLevel() >= 1 && g.s.scanCd <= 0 && this.scanT > this.sk.scanEvery && p.fuel > 1) { this.scan = true; this.scanT = 0; }
    // keep the plan in hand: never drop a dig half-way, keep a find until it is dug, look again at a search target only
    // now and then (new ore may have come into view)
    const busy = this.target && this.path.length && this.at < this.path.length - 1 && !this.blocked();
    if (busy && p.dig) return;
    if (busy && this.target!.kind === "ore" && this.validTarget(this.target!)) return;
    if (busy && (this.target!.kind === "dig" || this.target!.kind === "explore")) { this.planWork(true); return; }
    this.planWork();
  }

  private blocked() { return this.stuckT > 1.6; }

  private blastT = 0;
  /** Sealed in (the HUD says "No way up"): blast up out of it with dynamite, else the teleporter, else run the tank
   * dry for the tow. Returns true while it is handling it. */
  private unseal(): boolean {
    const g = this.g, p = g.pod, w = g.live.w;
    if (g.live.ents.some((e) => e.kind === "charge")) {
      // a charge is lit: get two tiles away from it, below or aside
      if (this.target?.kind !== "flee") {
        const c = g.live.ents.find((e) => e.kind === "charge")!;
        this.flee(c.x, c.y);
      }
      return true;
    }
    if (p.items.dynamite > 0 || p.items.charge > 0) {
      // climb to the top of the pocket, then light it under the seal
      const start = this.podTile(), row = Math.floor(p.y);
      this.plan.run(start, Math.max(0, row - 40), row + 2);
      let top = start;
      for (let y = Math.max(0, row - 40); y <= row; y++) {
        for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (this.plan.reached(i) && w.mat[i] === 0 && this.plan.dist[i] < 20) { top = i; break; } }
        if (top !== start) break;
      }
      if (top !== start && ((top / W) | 0) < row - 0) { this.setPath({ i: top, kind: "dig", value: 0 }, this.plan.path(top)); this.blastT = 0; return true; }
      this.blastT += this.sk.think;
      if (this.blastT > 0.6 && p.itemCd <= 0) { this.item = p.items.dynamite > 0 ? 3 : 4; this.blastT = 0; }
      this.path = []; this.target = null;
      return true;
    }
    if (p.items.teleport > 0 && p.chanT <= 0) { this.item = 5; this.endDive("teleport"); return true; }
    // nothing to blast or jump with: the rules offer the tow (pod only); a person takes it after a look around
    if (this.sealedT > 6 && p.stranded) { this.confirm = true; this.endDive("tow"); }
    return false;
  }

  /** Out of options: thrust until the tank is dry, then call the tow (a sealed shaft without a teleporter). */
  private burnToTow() {
    this.path = []; this.target = null;
    this.mode = "return";
  }

  // ---------------------------------------------------------------- costs (the person's picture of the rock)

  /** Can a person see this tile's material (lamp memory)? */
  seen(i: number) { return (this.g.live.w.flag[i] & FLAG.SEEN) !== 0; }
  /** Does a person know there is a find here (lit, scanned, or glowing on screen)? */
  findKnown(i: number) {
    const w = this.g.live.w, f = w.find[i];
    if (!f) return false;
    if (w.flag[i] & (FLAG.SEEN | FLAG.SCANNED)) return true;
    const fd = FINDS[f];
    if (fd.glow || fd.kind === "jackpot") {
      const p = this.g.pod, x = i % W, y = (i / W) | 0;
      return Math.abs(x + 0.5 - p.x) <= 11 && Math.abs(y + 0.5 - p.y) <= 7;
    }
    return false;
  }

  /** The move-cost function for the planner, closed over this decision's state. */
  costs() {
    const g = this.g, live = g.live, w = live.w, P = g.power(), key = g.hasKey();
    const lx = w.spawnX, lift = g.liftDepth, sk = this.sk, seed = w.seed;
    const heatRow = frontierRow(g) + sk.heatPush + (g.moduleOn("heatsink") ? 6 : 0) + (g.pod.coolant > 0 ? 8 : 0);
    const now = g.time, block = this.plan.block, podRow = Math.floor(g.pod.y) + 1;
    const planet = g.s.planet;
    const typical = [0, 1, 2, 3, 4, 5, 6].map((s) => biomeDef(planet, s).typical);
    // the rail carries the pod if it is riding, or will clamp on entering the column (a pod that left the rail at the
    // head is caught again once it has been below the head or out of the column)
    const pp = g.pod as unknown as { unclamp: boolean };
    const railLive = g.pod.riding || Math.floor(g.pod.x) !== lx || !pp.unclamp || g.pod.y - HW >= lift;
    const solid = (i: number) => { if (i >= W * H) return true; const m = w.mat[i]; return m !== 0 && MATERIALS[m]?.kind !== "liquid"; };
    // fromBelow: the pod arrived in tile i moving up, so the tile under it is open whatever the map says now
    return (i: number, j: number, k: number, fromBelow = false): number => {
      const b = block.get(j);
      if (b !== undefined && b > now) return INF;
      const m = w.mat[j], jx = j % W, jy = (j / W) | 0;
      const liftCol = railLive && jx === lx && jy < lift;
      let c: number;
      if (m === MAT.LAVA) return INF;
      if (m === 0) {
        if (k === 0) c = liftCol ? 0.03 : 0.07;
        else if (k === 3) c = liftCol ? 0.03 : 0.22;
        else c = solid(j + W) || solid(i + W) || liftCol ? 0.2 : 0.9;
        if (!liftCol && jx === lx && jy < lift + 2 && k !== 0 && k !== 3) c += 0.3;
      } else {
        if (k === 3) return INF;
        const known = this.seen(j);
        if (known) {
          if (MATERIALS[m].kind === "unbreakable" || m === MAT.SEED || (w.flag[j] & FLAG.LIFT)) return INF;
        }
        if (k !== 0) {
          // a side dig needs ground under the pod, or the Lift's rail
          const ix = i % W, iy = (i / W) | 0;
          if (!(railLive && ix === lx && iy < lift) && (fromBelow || !solid(i + W))) return INF;
        }
        const h = known ? live.hardness(j, key) : typical[Math.min(6, w.biome[j])] * (w.find[j] && this.findKnown(j) ? 1.15 : 1);
        const ratio = h / P;
        if (ratio > 2.5) return INF;
        c = 0.35 + 0.4 * ratio;
        if (known) {
          if (w.haz[j] === HAZ.GAS) c += 25;
          // timber holds up what is above it (a cave-in); old structures are best left standing
          if (m === MAT.TIMBER) c += 10;
          else if (w.flag[j] & FLAG.STRUCT) c += 3;
          if (w.haz[j] === HAZ.LAVA_POCKET) c += 15;
          if (k !== 0 && jy > 0 && MATERIALS[w.mat[j - W]]?.kind === "loose") c += 6;
          if ((jy > 0 && w.mat[j - W] === MAT.LAVA) || w.mat[j - 1] === MAT.LAVA || w.mat[j + 1] === MAT.LAVA) c += 40;
        }
      }
      // past the heat line: dearer by the row, and closed beyond 10 rows (never the rows the pod is already in: a
      // pod that drifted past it must still be able to plan its way out)
      if (jy > heatRow) { if (jy > heatRow + 10 && jy > podRow) return INF; c += 2 * (jy - heatRow); }
      if (sk.noise) c *= 1 + sk.noise * (hash(jx, jy, seed, 5) - 0.5) * 2 * 0.5;
      return c;
    };
  }

  // ---------------------------------------------------------------- plans

  /** The pod's tile (while a dig moves the pod into its tile, the tile it started from). */
  private podTile() {
    const p = this.g.pod, d = (p as unknown as { dig: { ox: number; oy: number } | null }).dig;
    const x = d ? d.ox : p.x, y = d ? d.oy : p.y;
    return Math.max(0, Math.floor(y)) * W + Math.max(1, Math.min(W - 2, Math.floor(x)));
  }

  private setPath(t: Target, path: number[]) {
    this.target = t; this.path = path; this.at = 0; this.stuckT = 0;
  }

  replan() { this.target = null; this.thinkT = Math.min(this.thinkT, this.sk.react); }

  private planHome() {
    const g = this.g, p = g.pod, lx = g.live.w.spawnX, lift = g.liftDepth;
    const start = this.podTile();
    const y1 = Math.min(H - 1, Math.floor(p.y) + 30);
    const goal = (i: number) => {
      const x = i % W, y = (i / W) | 0;
      if (x === lx && y < Math.max(1, lift)) return g.live.w.mat[i] === 0;
      return y === 0 && g.live.w.mat[i] === 0;
    };
    let end = this.plan.run(start, 0, y1, goal);
    if (end < 0 && this.plan.block.size) { this.plan.block.clear(); end = this.plan.run(start, 0, y1, goal); }
    if (end < 0) { this.path = []; this.target = null; return; }
    this.setPath({ i: end, kind: "home", value: 0 }, this.plan.path(end));
  }

  private planDescend() {
    const g = this.g, p = g.pod;
    const start = this.podTile();
    const y1 = Math.min(H - 1, this.workRow + 2);
    this.plan.run(start, Math.max(0, Math.floor(p.y) - 30), y1);
    // the deepest already-open tile at or above the work row (fall down the shaft first)
    let best = -1, by = -1, bd = INF;
    const lx = g.live.w.spawnX;
    for (let y = y1; y >= Math.max(0, Math.floor(p.y)); y--) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (!this.plan.reached(i) || g.live.w.mat[i] !== 0) continue;
        // the person's own shaft wins unless a side route goes much deeper
        const yy = y - (x === lx ? 0 : 8);
        const d = this.plan.dist[i];
        if (yy > by || (yy === by && d < bd)) { best = i; by = yy; bd = d; }
      }
      if (best >= 0 && by - y > 10) break;
    }
    if (best < 0 || ((best / W) | 0) <= Math.floor(p.y)) { this.mode = "work"; this.planWork(); return; }
    this.setPath({ i: best, kind: "dig", value: 0 }, this.plan.path(best));
  }

  /** The value a person puts on a find tile (pieces x price; relics, caches and jackpots are treats). */
  private valueOf(i: number): number {
    const g = this.g, w = g.live.w, f = w.find[i];
    const slot = Math.min(6, w.biome[i]);
    const top = this.topPiece(slot);
    if (f) {
      const fd = FINDS[f];
      if (fd.kind === "artifact") return 4 * top;
      if (fd.kind === "jackpot") return g.pieceValue(f);
      let v = piecesPerTile(slot) * g.pieceValue(f);
      if (this.huntingSeed() && fd.key === "heartstone" && this.heartstones() < HEARTSTONE_NEEDED) v *= 20;
      return v;
    }
    if (MATERIALS[w.mat[i]]?.cache) return 5 * top;
    return 0;
  }
  private topCache = new Map<number, number>();
  private topPiece(slot: number) {
    const key = slot * 10 + this.g.s.launches;
    let v = this.topCache.get(key);
    if (v === undefined) {
      v = 0;
      for (const f of FINDS) if (f && f.kind === "ore" && f.biome === slot) v = Math.max(v, this.g.pieceValue(f.id));
      this.topCache.set(key, v);
    }
    return v;
  }

  private validTarget(t: Target) {
    const w = this.g.live.w;
    if (t.kind === "ore") return w.mat[t.i] !== 0 && (w.find[t.i] !== 0 || !!MATERIALS[w.mat[t.i]]?.cache);
    return true;
  }

  /** What to dig next. `keep`: a search or shaft plan is in hand; only a find in view replaces it. */
  private planWork(keep = false) {
    const g = this.g, p = g.pod, w = g.live.w;
    const start = this.podTile();
    const row = Math.floor(p.y);
    // hunting the last Heartstone: the person searches the whole Core, not just around the pod
    const hunt = this.huntingSeed() && this.heartstones() < HEARTSTONE_NEEDED;
    const y0 = hunt ? Math.min(Math.max(0, row - 22), 670) : Math.max(0, row - 22), y1 = Math.min(H - 1, Math.max(row + 16, this.workRow + 3));
    this.plan.run(start, y0, y1);
    const free = g.cargoMax() - p.cargoUsed;
    // 1. a find in view, worth its way
    let best = -1, bs = 0;
    for (let y = y0; y <= y1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!this.plan.reached(i)) continue;
      const cache = !!MATERIALS[w.mat[i]]?.cache && (w.flag[i] & (FLAG.SEEN | FLAG.SCANNED)) !== 0;
      if (!cache && !this.findKnown(i)) continue;
      if (w.mat[i] === 0) continue;
      const f = w.find[i];
      if (free <= 0 && !(f && FINDS[f].kind === "artifact")) continue;
      let v = this.valueOf(i);
      if (f && FINDS[f].kind === "ore") v = Math.min(v, (v / piecesPerTile(Math.min(6, w.biome[i]))) * Math.max(1, free));
      const s = v / (this.plan.dist[i] + 1.5);
      if (s > bs) { bs = s; best = i; }
    }
    // the crate from a tow or wreck: the bay's worth, if it is near
    const crate = g.live.ents.find((e) => e.kind === "crate");
    if (crate && free > 0) {
      const ci = Math.floor(crate.y) * W + Math.floor(crate.x);
      if (ci >= 0 && ci < W * H && this.plan.reached(ci)) {
        let v = 0;
        for (const k in crate.cargo ?? {}) v += (crate.cargo![+k]) * g.pieceValue(+k);
        const s = v / (this.plan.dist[ci] + 1.5);
        if (s > bs) { bs = s; best = ci; }
      }
    }
    // expected yield of digging on: a find is worth a detour while it beats ~what searching pays
    const expect = this.expectRate();
    // plunging: well above the work row, a person heads for the bottom and takes only what is on the way
    // (only on the way to a richer biome: within its own biome a person takes what the lamp shows)
    const plunge = row < this.workRow - 4 && !hunt && slotOfRow(Math.max(0, row)) < slotOfRow(this.workRow);
    if (best >= 0 && plunge && this.plan.dist[best] > 4) best = -1;
    if (best >= 0 && bs >= expect * 0.25) { this.setPath({ i: best, kind: "ore", value: bs }, this.plan.path(best)); return; }
    if (keep) return;

    // 2. deeper, to the work row
    if (row < this.workRow - 1) {
      let tgt = -1, td = INF;
      const yt = Math.min(y1, this.workRow);
      for (let y = yt; y >= Math.max(row + 1, yt - 3); y--) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (!this.plan.reached(i)) continue;
        const d = this.plan.dist[i] + (x === w.spawnX ? 0 : 6) + Math.abs(x - p.x) * 0.6;
        if (d < td) { td = d; tgt = i; }
      }
      if (tgt >= 0) { this.setPath({ i: tgt, kind: "dig", value: 0 }, this.plan.path(tgt)); return; }
    }

    // 3. search: open up unseen rock around the work row
    let ex = -1, es = 0;
    const lo = Math.max(y0, Math.min(row, this.workRow) - 8), hi = Math.min(y1, Math.max(row, this.workRow) + 2);
    for (let y = lo; y <= hi; y += 2) for (let x = 2; x < W - 2; x += 2) {
      const i = y * W + x;
      if (!this.plan.reached(i)) continue;
      let un = 0;
      for (let dy = -3; dy <= 3; dy += 2) for (let dx = -3; dx <= 3; dx += 2) {
        const xx = x + dx, yy = y + dy;
        if (xx < 1 || xx > W - 2 || yy < 0 || yy >= H) continue;
        if (!this.seen(yy * W + xx)) un++;
      }
      if (!un) continue;
      const s = (un * (1 + 0.3 * this.r.next())) / (this.plan.dist[i] + 3);
      if (s > es) { es = s; ex = i; }
    }
    if (ex >= 0) { this.setPath({ i: ex, kind: "explore", value: 0 }, this.plan.path(ex)); return; }
    // nothing at all: go home
    this.endDive("empty");
    this.mode = "return";
    this.planHome();
  }

  /** A rough $ per planner-second a person expects from searching here (pieces per tile x price x hit rate). */
  private expectRate() {
    const g = this.g, slot = Math.min(6, g.live.w.biome[this.podTile()]);
    return (this.topPiece(slot) * 0.5 * piecesPerTile(slot) * 0.1);
  }

  private huntingSeed() { return this.g.s.lance.length >= 3 && this.g.s.reached >= 6; }
  private heartstones() {
    const hs = FINDS.findIndex((f) => f?.key === "heartstone");
    return this.g.pod.cargo[hs] ?? 0;
  }

  private planSeed() {
    const g = this.g, p = g.pod;
    const start = this.podTile();
    const goal = (i: number) => {
      const x = i % W, y = (i / W) | 0;
      return g.live.w.mat[i] === 0 && Math.hypot(x + 0.5 - CHAMBER.cx, y + 0.5 - CHAMBER.cy) <= CHAMBER.seedR + 1.6;
    };
    const end = this.plan.run(start, Math.max(0, Math.floor(p.y) - 40), H - 1, goal);
    if (end < 0) { this.planWork(); return; }
    this.setPath({ i: end, kind: "seed", value: 0 }, this.plan.path(end));
    if (g.canLaunch().ok) g.launch();
  }

  /** Get away from a lit fuse or a wobbling boulder: the nearest reachable open tile out of its reach. */
  private flee(fx: number, fy: number, boulder = false) {
    const g = this.g, p = g.pod;
    const start = this.podTile();
    const row = Math.floor(p.y);
    const goal = (i: number) => {
      const x = i % W, y = (i / W) | 0;
      if (g.live.w.mat[i] !== 0) return false;
      if (boulder) return x !== Math.floor(fx) && g.live.solid(x, y + 1);
      return Math.hypot(x + 0.5 - fx, y + 0.5 - fy) >= 3.2;
    };
    const end = this.plan.run(start, Math.max(0, row - 6), Math.min(H - 1, row + 6), goal);
    if (end < 0) return;
    this.setPath({ i: end, kind: "flee", value: 0 }, this.plan.path(end));
    this.fleeT = boulder ? 1.5 : 2.2;
    this.holdOff = this.sk.react * 0.6;
  }

  // ---------------------------------------------------------------- the controller (plan step -> keys)

  private follow(dt: number): Input {
    const g = this.g, p = g.pod;
    if (this.towWanted) {
      // a sealed or empty pod: thrust the tank dry, then the tow
      return { ...none(), up: p.fuel > 0 };
    }
    if (p.chanT > 0) return none();
    // falling fast (a fast drop, a long fall): only the auto-brake can stop it now, and it needs Down held
    // (unless thrust can still stop it above the floor: then the plan below may brake for a turn)
    if (!p.grounded && !p.riding && p.vy > 13) {
      const col = Math.floor(p.x);
      let fy = Math.floor(p.y) + 1;
      while (fy < H && !g.live.solid(col, fy)) fy++;
      const aUp = Math.max(1.5, STAT_FX.thrust(g.s.levels.engine) / (M_EMPTY * p.load) - 16 * g.gravity());
      if ((p.vy * p.vy) / (1.4 * aUp) > fy - p.y - 2) return { ...none(), down: true };
    }
    const cur = this.podTile();
    // progress watch
    const prog = p.dig ? p.dig.progress : 0;
    if (cur !== this.lastTile || prog > this.lastProgress + 1e-4) { this.stuckT = 0; this.lastTile = cur; } else this.stuckT += dt;
    this.lastProgress = prog;
    if (this.stuckT > 1.6) {
      const nx = this.path[this.at + 1];
      if (nx !== undefined && g.live.w.mat[nx] !== 0) this.plan.block.set(nx, g.time + 20);
      this.target = null; this.path = [];
      this.stuckT = 0;
      this.thinkT = 0;
      this.stuckN++;
      return this.wiggle();
    }
    if (this.toHead && this.mode === "return") return this.goHead();
    if (this.climbing && this.mode === "return") return this.goUp();
    if (!this.path.length) return this.idleControl();
    // where are we on the path?
    let k = -1;
    for (let j = Math.max(0, this.at - 2); j < Math.min(this.path.length, this.at + 6); j++) if (this.path[j] === cur) { k = j; }
    if (k < 0) k = this.path.indexOf(cur);
    if (k < 0) {
      // off the path (a fall, a bump): think again soon
      if (!p.dig) { this.thinkT = Math.min(this.thinkT, this.sk.react); this.target = this.mode === "return" ? null : this.target; this.path = []; }
      return p.dig ? hold(p.dig.dir) : this.idleControl();
    }
    if (k !== this.at) {
      const d0 = this.at + 1 < this.path.length ? dirOf(this.path[this.at], this.path[this.at + 1]) : -1;
      const d1 = k + 1 < this.path.length ? dirOf(this.path[k], this.path[k + 1]) : -1;
      if (d0 !== d1) this.holdOff = Math.max(this.holdOff, this.sk.react * this.r.range(0.6, 1.4));
      this.at = k;
    }
    if (k >= this.path.length - 1) return this.arrived();
    const next = this.path[k + 1];
    const dir = dirOf(cur, next);
    // a dig in progress: keep it if it is the next tile; let a chained dig into the wrong tile go
    if (p.dig) {
      const di = p.dig.y * W + p.dig.x;
      if (di === next) return hold(p.dig.dir);
      return none();
    }
    if (this.holdOff > 0) return this.hoverOnly(cur);
    return this.move(cur, next, dir, k);
  }

  private wiggle(): Input {
    const r = this.r.int(0, 2);
    return { left: r === 0, right: r === 1, up: r === 2, down: false };
  }

  /** No plan: hold still (or keep from falling while airborne in a shaft). */
  private idleControl(): Input {
    const p = this.g.pod;
    if (p.riding || p.grounded) return none();
    return none();
  }

  /** Between keys: on the ground, nothing; in the air, keep the thumb on thrust to hold the row. */
  private hoverOnly(cur: number): Input {
    const p = this.g.pod;
    if (p.grounded || p.riding) return none();
    const below = cur + W;
    if (below < W * H && this.g.live.solid(below % W, (below / W) | 0)) return none();
    return this.holdRow((cur / W) | 0);
  }

  private climbing = false;
  private commitT = 0;
  private arrived(): Input {
    const t = this.target;
    this.path = [];
    if (t?.kind === "seed") { if (this.g.canLaunch().ok) this.g.launch(); }
    // at the top of a sealed pocket: light the dynamite here, under the seal (unseal() then gets clear of it)
    const p = this.g.pod;
    if (p.fuelHome >= INF && (p.items.dynamite > 0 || p.items.charge > 0) && p.itemCd <= 0 && !this.g.live.ents.some((e) => e.kind === "charge")) this.item = p.items.dynamite > 0 ? 3 : 4;
    if (this.mode === "return" && t?.kind === "home") {
      if (this.useHead()) { this.toHead = true; return this.goHead(); }
      this.climbing = true; return this.goUp();
    }
    this.target = null;
    this.thinkT = Math.min(this.thinkT, this.sk.react);
    return none();
  }

  /** On the Lift with Head Station: ride down to the head and stop there (the dock runs when the car is still). */
  private goHead(): Input {
    const g = this.g, p = g.pod, lx = g.live.w.spawnX;
    if (!p.riding) {
      // not clamped yet: drift onto the column (a pod that left the rail at the head below is not caught: go up)
      if (Math.floor(p.x) === lx && (p as unknown as { unclamp: boolean }).unclamp) { this.toHead = false; this.climbing = true; return this.goUp(); }
      return { ...none(), ...this.centerX(lx + 0.5, !p.grounded), up: !p.grounded && this.trackY(Math.floor(p.y) + 0.5) };
    }
    const bottom = g.liftDepth - HW - 1e-6;
    // still at the head and no dock event (nothing to sell, or the dock already ran): carry on as docked
    if (Math.abs(p.y - bottom) < 0.05 && Math.abs(p.vy) < 0.05 && g.s.docked) {
      this.visit++; this.headT = this.r.range(0.6, 1.2); this.headBuys = 0; this.toHead = false; this.climbing = false;
      return none();
    }
    return this.liftTo(bottom);
  }

  /** At the home tile: ride the Lift up, or thrust up out of the mouth. */
  private goUp(): Input {
    const p = this.g.pod, off = this.g.live.w.spawnX + 0.5 - p.x;
    this.path = [];
    return { ...none(), up: true, left: !p.riding && off < -0.12, right: !p.riding && off > 0.12 };
  }

  private move(cur: number, next: number, dir: number, k: number): Input {
    const g = this.g, p = g.pod, w = g.live.w;
    const nx = next % W, cx = cur % W, cy = (cur / W) | 0;
    const solid = (i: number) => g.live.solid(i % W, (i / W) | 0);
    const lx = w.spawnX;
    // riding the Lift: up/down to the row where the path leaves the column, then sideways
    if (p.riding) {
      if (dir === 1 || dir === 2) {
        const rest = cy + 1 - HW;
        if (Math.abs(rest - p.y) > 0.25 || Math.abs(p.vy) > 2) return this.liftTo(rest);
        return { ...none(), left: dir === 1, right: dir === 2 };
      }
      // the run of vertical steps: stop where it ends
      let e = k + 1;
      while (e + 1 < this.path.length && dirOf(this.path[e], this.path[e + 1]) === dir && this.path[e + 1] % W === lx) e++;
      const ey = (this.path[e] / W) | 0;
      const leaves = e < this.path.length - 1 || ey >= g.liftDepth - 1;
      if (dir === 0 && ey >= g.liftDepth - 1) {
        // to the head, braking (leaving the rail at 40 tiles/s lands hard on a floor just below it), then off the rail
        const bottom = g.liftDepth - HW - 1e-6;
        if (p.y < bottom - 0.05 || Math.abs(p.vy) > 2) return this.liftTo(bottom);
        return { ...none(), down: true };
      }
      if (!leaves) return { ...none(), up: dir === 3, down: dir === 0 };
      return this.liftTo(ey + 1 - HW);
    }
    if (solid(next)) {
      if (dir === 3) { this.replan(); return none(); }
      if (dir === 0) {
        const off = cx + 0.5 - p.x;
        if (!p.grounded) return none(); // settle first
        if (Math.abs(off) > 0.3 || Math.abs(p.vx) > 1.5) return this.steerX(cx + 0.5, true);
        return { ...none(), down: true };
      }
      // a side dig needs a floor (or the rail); the map changed since the plan (a cave-in, a crust): plan again
      if (!solid(cur + W) && !p.riding) {
        // in the Lift's column: settle onto the rail first (it clamps a centred pod)
        if (cx === lx && cy < g.liftDepth) return { ...none(), ...this.centerX(lx + 0.5, true), up: this.trackY(cy + 0.5) };
        this.path = []; this.target = null; this.thinkT = Math.max(this.thinkT, this.sk.react); return none();
      }
      if (!p.grounded) return none();
      return { ...none(), left: dir === 1, right: dir === 2 };
    }
    // open tile: the run of steps in this direction ends at a waypoint; fly there and stop where the path turns
    let e = k + 1;
    while (e + 1 < this.path.length && dirOf(this.path[e], this.path[e + 1]) === dir && !solid(this.path[e + 1]) && e - k < 12) e++;
    const wp = this.path[e], wx = wp % W, wy = (wp / W) | 0;
    const turnAfter = e + 1 < this.path.length ? dirOf(wp, this.path[e + 1]) : -1;
    const side = { left: dir === 1, right: dir === 2 };
    if (dir === 1 || dir === 2) {
      if (p.grounded || solid(cur + W)) {
        // driving along a floor: brake to stop on the column where the path turns up or down, or ends
        if ((turnAfter === 0 || turnAfter === 3 || turnAfter < 0) && Math.abs(wx + 0.5 - p.x) < 1.6) return { ...none(), ...this.centerX(wx + 0.5, !p.grounded) };
        return { ...none(), ...side };
      }
      // in the air beside an opening: hold the row (a hair high when the next tile has a floor whose corner would
      // push a sinking pod back), go across only when steady
      const ledge = solid(next + W);
      const ty = cy + (ledge ? 0.47 : 0.5);
      const v = { ...none(), up: this.trackY(ty) };
      // once steady, commit to the crossing for a moment (re-centring half-way only bounces off the corner)
      if (ledge && Math.abs(p.y - ty) < 0.08 && p.vy < 0.3 && p.vy > -0.8) this.commitT = 0.5;
      if (ledge && this.commitT <= 0) return { ...v, ...this.centerX(cx + 0.5, true) };
      return { ...v, ...((turnAfter === 0 || turnAfter === 3) && Math.abs(wx + 0.5 - p.x) < 1.6 ? this.centerX(wx + 0.5, true) : side) };
    }
    // vertical: centre on the column, then go; stop at the waypoint's row if the path turns sideways there
    const tx = (dir === 3 ? nx : cx) + 0.5;
    if (p.grounded && dir === 3 && (Math.abs(tx - p.x) > 0.15 || Math.abs(p.vx) > 0.8)) return { ...none(), ...this.centerX(tx, false) };
    const steer = this.centerX(tx, !p.grounded);
    const stops = turnAfter === 1 || turnAfter === 2;
    if (dir === 0) {
      // already dropping fast: stay on Down and let the auto-brake set it on the floor (thrust cannot stop it in time)
      if (p.vy > 13 && !stops) return { ...none(), down: true, ...steer };
      // a long fall to a floor: the fast drop and its brake; else fall and catch the row
      if (!stops || solid(wp + W)) return { ...none(), down: e - k >= 3 || !stops, ...steer };
      return { ...none(), up: this.trackY(wy + (solid(this.path[e + 1] + W) ? 0.47 : 0.5)), ...steer };
    }
    if (!stops) return { ...none(), up: true, ...steer };
    return { ...none(), up: this.trackY(wy + (solid(this.path[e + 1] + W) ? 0.47 : 0.5)), ...steer };
  }

  /** Thrust or not, to bring the pod's centre to y and hold it there (braking: gravity going up, thrust coming down). */
  private trackY(ty: number): boolean {
    const g = this.g, p = g.pod;
    const err = ty - p.y; // + = target below
    const aUp = Math.max(1.5, STAT_FX.thrust(g.s.levels.engine) / (M_EMPTY * p.load) - 16 * g.gravity());
    const vd = err > 0 ? Math.min(10, Math.sqrt(2 * 0.6 * aUp * err)) : -Math.min(12, Math.sqrt(2 * 12 * -err));
    return p.vy > vd;
  }

  /** Left/right to bring the pod to x and stop there (braking profile; a lighter touch in the air). */
  private centerX(x: number, air: boolean): { left?: boolean; right?: boolean } {
    const p = this.g.pod, dx = x - p.x;
    if (Math.abs(dx) < 0.06 && Math.abs(p.vx) < 0.4) return {};
    const vd = Math.sign(dx) * Math.min(air ? 3 : 4, Math.sqrt(2 * (air ? 10 : 40) * Math.abs(dx)) * 0.8);
    if (p.vx < vd - 0.15) return { right: true };
    if (p.vx > vd + 0.15) return { left: true };
    return {};
  }

  /** Drive toward x on the ground without running past it (no drilling into walls: taps only while not touching). */
  private steerX(x: number, gentle: boolean): Input {
    const p = this.g.pod, dx = x - p.x;
    const vd = Math.sign(dx) * Math.min(gentle ? 1.5 : 4, Math.sqrt(2 * 40 * Math.abs(dx)) * 0.7);
    if (Math.abs(dx) < 0.05 && Math.abs(p.vx) < 0.5) return none();
    if (p.vx < vd - 0.2) return { ...none(), right: true };
    if (p.vx > vd + 0.2) return { ...none(), left: true };
    return none();
  }

  /** Hover at a row (pod centre aimed just above the row's resting height): thrust bang-bang on a braking profile. */
  private holdRow(row: number, off = 0.5): Input { return { ...none(), up: this.trackY(row + off) }; }

  /** On the Lift: approach a resting height with 80 tiles/s^2 of braking. */
  private liftTo(y: number): Input {
    const p = this.g.pod, err = y - p.y;
    const vd = Math.sign(err) * Math.min(40, Math.sqrt(2 * 70 * Math.abs(err)));
    if (Math.abs(err) < 0.05 && Math.abs(p.vy) < 1) return none();
    if (p.vy < vd - 0.5) return { ...none(), down: true };
    if (p.vy > vd + 0.5) return { ...none(), up: true };
    return none();
  }

  // ---------------------------------------------------------------- town (level 2: the session)

  private townTick(dt: number): Input {
    const g = this.g, p = g.pod, T = this.town;
    const pad = g.padX();
    T.t -= dt;
    if (T.phase === "pad") {
      if (g.s.docked && p.grounded) { T.phase = "tally"; T.t = this.r.range(1.0, 1.6); this.arrive(); return none(); }
      // fly over to the forecourt and set down
      const dx = pad - 0.5 - p.x;
      const up = p.y > -1.6 && Math.abs(dx) > 0.6 ? true : p.vy > 2.5;
      if (Math.abs(dx) < 0.4) return { ...none(), up: p.vy > 3 };
      return { ...none(), up, left: dx < 0 && p.vx > Math.max(-5, dx * 3), right: dx > 0 && p.vx < Math.min(5, dx * 3) };
    }
    if (T.phase === "tally") {
      if (T.t <= 0) { T.phase = "shop"; T.queue = this.shopPlan(); T.t = this.menuTime(); }
      return none();
    }
    if (T.phase === "shop") {
      if (T.t > 0) return none();
      const act = T.queue.shift();
      if (act) { act(); T.t = this.menuTime(); return none(); }
      T.phase = "leave"; T.t = this.sk.react;
      return none();
    }
    // leave: drive to the mine mouth and drop in
    if (T.t > 0) return none();
    const mx = g.live.w.spawnX + 0.5;
    if (p.riding) return { ...none(), down: true };
    const dx = mx - p.x;
    if (Math.abs(dx) < 0.06) return { ...none(), down: true };
    const vd = Math.sign(dx) * Math.min(5, Math.sqrt(2 * 40 * Math.abs(dx)) * 0.6);
    if (p.vx < vd - 0.15) return { ...none(), right: true };
    if (p.vx > vd + 0.15) return { ...none(), left: true };
    return none();
  }

  private menuTime() { return this.r.range(this.sk.menu[0], this.sk.menu[1]); }

  /** The sale of this town visit (the dock event comes in the step the pod lands). */
  private docked(sales: number, rigs: number) {
    const g = this.g, run = this.rec.cur();
    run.sales += sales;
    run.rigIncome += rigs;
    const d = this.arrive();
    d.sale += sales; d.rigs += rigs; d.earned = g.s.earned;
  }
  private visit = 0;
  private visitDock = -1;
  /** A town visit's one dock record, whatever the sale. */
  private arrive() {
    const g = this.g, run = this.rec.cur();
    if (this.visitDock !== this.visit || !run.docks.length) {
      this.visitDock = this.visit;
      this.dockCount++;
      run.docks.push({ t: g.time - run.t0, sale: 0, rigs: 0, buys: 0, gates: 0, stats: {}, earned: g.s.earned });
    }
    return run.docks[run.docks.length - 1];
  }

  private lastCost = 0;
  private gateBuy = false;
  private act(cost: number, gate: boolean, f: () => { ok: boolean }) {
    this.lastCost = cost; this.gateBuy = gate;
    const r = f();
    this.gateBuy = false;
    return r.ok;
  }

  /** What the person does at this dock, as a queue of actions with menu time between them. */
  private shopPlan(): (() => void)[] {
    const g = this.g, sk = this.sk, r = this.r, q: (() => void)[] = [];
    // 1. the suggestion card (B), while it stays affordable
    const follow = r.chance(sk.follow);
    let bought = 0;
    const suggest = () => {
      const sg = g.suggestion();
      if (!sg || sg.cost > g.s.cash || bought >= sk.presses) return;
      if (this.act(sg.cost, true, () => g.buySuggested())) { bought++; q.unshift(suggest); }
    };
    if (follow) q.push(suggest);
    // 2. the lab glows: research and modules
    q.push(() => this.research());
    // 3. comfort: what the last dive asked for. Stuck at the heat line with no gate on the card (a planet's own hot
    // biome), a person buys the radiator anyway: its card says the heat line moves deeper
    if (this.limit === "heat" && g.s.deepest >= this.workRow - 10 && r.chance(0.85)) q.push(() => {
      const c = g.upgradePrice("radiator");
      if (c <= g.s.cash && g.s.levels.radiator < g.upgradeCap("radiator")) this.act(c, false, () => g.buyUpgrade("radiator"));
    });
    if (r.chance(sk.comfort)) q.push(() => this.comfortBuy());
    // 4. the rig office
    if (g.rigsOpen() && r.chance(sk.rigs)) q.push(() => this.rigBuy());
    // 5. the lab building, now and then
    if (g.s.reached >= 2 && r.chance(0.08)) q.push(() => { const c = g.labPrice(); if (c < 0.12 * g.s.cash) this.act(c, false, () => g.buyLab()); });
    q.push(() => { this.setLoadout(); this.fitModules(); });
    if (!follow) q.push(suggest);
    return q;
  }

  private comfortBuy() {
    const g = this.g, s = g.s;
    const w: Partial<Record<Stat, number>> = { cargo: 1, tank: 1, engine: 0.6, lamp: 0.4, scanner: s.levels.scanner < 1 && s.reached >= 1 ? 1.2 : 0.25, hull: 0.3 };
    if (this.lastEnd === "full") w.cargo = 3;
    if (this.lastEnd === "fuel" || this.lastEnd === "tow") { w.tank = 3; w.engine = 1; }
    if (this.lastEnd === "hull" || this.lastEnd === "wreck") w.hull = 2.5;
    const sg = g.suggestion();
    let best: Stat | null = null, bs = Infinity;
    for (const st of STATS) {
      if (!w[st] || s.levels[st] >= g.upgradeCap(st)) continue;
      const c = g.upgradePrice(st);
      if (c > s.cash) continue;
      // a person holds back when the gate is close: comfort only if it is small next to the gate, or the gate is far
      if (sg && sg.cost > s.cash && c > 0.2 * sg.cost && sg.cost < 2.5 * s.cash) continue;
      const score = c / w[st]!;
      if (score < bs) { bs = score; best = st; }
    }
    if (best) this.act(g.upgradePrice(best), false, () => g.buyUpgrade(best!));
  }

  private rigBuy() {
    const g = this.g, s = g.s, sk = this.sk;
    let spent = 0;
    for (let n = 0; n < 3; n++) {
      let bb = -1, bp = Infinity;
      for (let b = 0; b <= Math.min(6, s.reached); b++) {
        const l = s.rigs[b] ?? 0;
        if (l >= RIG_MAX) continue;
        const gain = (rigYield(b, l + 1) - rigYield(b, l)) * valueMult(g) * (g.has("A2") ? 1.5 : 1);
        const pay = rigCost(b, l) / gain;
        if (pay < bp) { bp = pay; bb = b; }
      }
      if (bb < 0 || bp > sk.rigPayback) return;
      const c = g.rigPrice(bb);
      if (spent + c > 0.35 * (s.cash + spent)) return;
      if (this.act(c, false, () => g.buildRig(bb))) spent += c; else return;
    }
  }

  private static ORDER = ["G1", "A1", "tracer", "G2", "E1", "dense", "drone", "L1", "L3", "E4", "A2", "heatsink", "E2", "G3", "K1", "E3", "G4",
    "smelter", "magnet", "recycler", "afterburner", "L2", "ear", "A3", "A4", "overcharge", "X1", "X2", "P1", "P2"];
  private research() {
    const g = this.g;
    for (let n = 0; n < 2; n++) {
      const id = Bot.ORDER.find((x) => (x in MODULES ? !g.moduleUnlocked(x as ModuleId) && g.s.everReached >= MODULES[x as ModuleId].opens : !g.has(x) && g.researchOpen(x) === true));
      if (!id) return;
      const cost = id in MODULES ? MODULES[id as ModuleId].cost : RESEARCH.find((x) => x.id === id)!.cost;
      if (g.s.data < cost) return;
      const ok = id in MODULES ? g.buyModule(id as ModuleId).ok : g.buyResearch(id).ok;
      if (!ok) return;
    }
  }

  /** Fill free module slots by the person's preference for this planet and depth. */
  private fitModules() {
    const g = this.g, s = g.s;
    const late = s.reached >= 4;
    const pref: ModuleId[] = s.planet === "cinder"
      ? ["heatsink", "tracer", "drone", "dense", "recycler", "smelter"]
      : s.planet === "ferrum" ? ["dense", "tracer", "smelter", "drone", "heatsink", "magnet"]
      : late ? ["tracer", "dense", "drone", "heatsink", "smelter", "magnet"] : ["tracer", "dense", "drone", "smelter", "magnet", "heatsink"];
    const want = pref.filter((m) => g.moduleUnlocked(m)).slice(0, g.moduleSlots());
    if (g.pod.cargoUsed === 0) for (const m of [...s.modules]) if (!want.includes(m)) g.unequipModule(m);
    for (const m of want) if (!s.modules.includes(m) && s.modules.length < g.moduleSlots()) g.equipModule(m);
  }

  private setLoadout() {
    const g = this.g, s = g.s, name = this.sk.name;
    g.setLoadout("fuel", s.reached >= 1 ? 1 : 0);
    g.setLoadout("dynamite", s.reached >= 1 ? (name === "casual" ? 2 : 3) : 0);
    g.setLoadout("repair", s.reached >= 2 ? (name === "casual" ? 2 : 1) : 0);
    g.setLoadout("coolant", s.reached >= 4 && name !== "casual" ? 1 : 0);
    g.setLoadout("teleport", (this.opts.strategy === "teleport" && s.reached >= 2) || (name === "good" && s.reached >= 5) ? 1 : 0);
  }

  /** After a launch: shards into perks (Head Start first, then the cheapest of Market Contacts, Kept Rigs, Engineer's Notes). */
  private buyPerks() {
    const g = this.g;
    for (let n = 0; n < 20; n++) {
      const hs = PERKS.find((x) => x.id === "headstart")!;
      const L = g.s.perks.headstart ?? 0;
      if (L < 5 && hs.cost(L) <= g.s.shards) { g.buyPerk("headstart"); continue; }
      let best: string | null = null, bc = Infinity;
      for (const id of ["contacts", "keptrigs", "engineer", "headstart"]) {
        const pk = PERKS.find((x) => x.id === id)!, l = g.s.perks[id] ?? 0;
        if (l >= pk.max) continue;
        const c = pk.cost(l);
        if (c < bc) { bc = c; best = id; }
      }
      if (!best || bc > g.s.shards) return;
      g.buyPerk(best);
    }
  }

  // ---------------------------------------------------------------- trace

  private sample(dt: number) {
    this.sampleT += dt;
    if (this.sampleT < 1) return;
    this.sampleT = 0;
    const g = this.g, p = g.pod;
    this.rec.samples.push({ t: g.time, row: Math.floor(p.y), mode: this.mode, fuel: p.fuel, home: p.fuelHome, cargo: p.cargoUsed, hull: p.hull / p.hullMax, heat: p.heat, cash: g.s.cash });
  }
}

// ---------------------------------------------------------------- helpers

const none = (): Input => ({ left: false, right: false, up: false, down: false });
const hold = (d: "left" | "right" | "down"): Input => ({ left: d === "left", right: d === "right", up: false, down: d === "down" });
const dirOf = (a: number, b: number) => {
  const d = b - a;
  return d === W ? 0 : d === -1 ? 1 : d === 1 ? 2 : d === -W ? 3 : -1;
};
export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Ore pieces left per biome slot (R3's "ore left at launch"). */
export function orePieces(g: Game): number[] {
  const w = g.live.w, out = [0, 0, 0, 0, 0, 0, 0];
  for (let i = W; i < W * H; i++) {
    const f = w.find[i];
    if (!f || FINDS[f]?.kind !== "ore" || w.mat[i] === 0) continue;
    const b = Math.min(6, w.biome[i]);
    out[b] += piecesPerTile(b);
  }
  return out;
}

/** Play `g` with `bot` for `seconds` of game time (or until `stop`), 60 Hz. */
export function play(g: Game, bot: Bot, seconds: number, stop?: () => boolean) {
  const dt = 1 / 60, n = Math.round(seconds * 60);
  for (let k = 0; k < n; k++) {
    const ev = bot.g.step(dt, bot.tick(dt));
    bot.observe(ev);
    if (stop && k % 30 === 0 && stop()) break;
  }
  void g;
}

export { ITEMS, UPGRADES, LAB_LEVELS, STAT_FX };
export type { ItemId };
