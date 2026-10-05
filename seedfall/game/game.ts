// The game: `Game implements GameView`. One fixed step (1/60 s) runs the pod, the live world, the town and the
// periodic checks, and returns that step's events. Every shop action is a method returning { ok, why? }.
import {
  W, H, FLAG, STATS, type GameEvent, type GameView, type Input, type PlanetId, type Stat, type WorldData, type Sale,
} from "./types.ts";
import { hash } from "./rng.ts";
import { generate, richPocket, worldSeedFor } from "./gen.ts";
import {
  MAT, MATERIALS, FINDS, BIOMES, CHAMBER, LIFT_X, tempAt, piecesPerTile, slotOfRow, planetDef, topOre, ORE_IDS, oreOnPlanet,
} from "./content/world.ts";
import {
  STAT_FX, UPGRADES, upgradeCost, ITEMS, ITEM_KEYS, itemPrice, fuelPrice, repairPrice, orePrice, INGOT_MULT, LIFT_SEGMENTS,
  MODULES, MODULE_SLOTS_BASE, researchById, rigCost, RIG_MAX, LAB_LEVELS, LAB_RATE, LAB_FROM, DATA, LANCE_PARTS,
  HEARTSTONE_NEEDED, planetEcon, SEED_AGE, GUARDS, perkById, type ItemId, type ModuleId,
} from "./content/economy.ts";
import { Live, I, type Ent } from "./world.ts";
import {
  freshPod, stepPod, updateLoad, boxFree, HW, fuelRow, addCargo, slotsUsed, teleportLoss, freeSlots, dumpFind, type PodState,
} from "./pod.ts";
import * as meta from "./meta.ts";
import type { Order, OfflineCard, Log, Records, Stats, Suggestion, Goal } from "./meta.ts";
import { serialize, deserialize, setDefaultWorld, type SaveData } from "./save.ts";

export type Result = { ok: true; why?: undefined } | { ok: false; why: string };
const OK: Result = { ok: true };
const no = (why: string): Result => ({ ok: false, why });

export interface GameOpts {
  planet?: PlanetId;
  /** World source (tests and tools inject a small stand-in); defaults to gen.ts's generate. */
  makeWorld?: (seed: number, planet: PlanetId, found: number[]) => WorldData;
  /** Wall clock (ms) and timezone offset (minutes, as Date.getTimezoneOffset) for the daily hooks and offline. */
  now?: number;
  tz?: number;
}

/** Everything that is saved, JSON-safe. */
export interface GameState {
  v: number;
  seed: number;
  planet: PlanetId;
  /** Launches done: the Seed age n. */
  launches: number;
  worldSeed: number;
  worldFound: number[];
  time: number;
  runStart: number;
  cash: number;
  data: number;
  shards: number;
  /** Cash earned this run (sales and rigs): E in the shard formula. */
  earned: number;
  levels: Record<Stat, number>;
  research: string[];
  modules: ModuleId[];
  /** Modules unlocked with data (kept across runs). */
  unlocked: ModuleId[];
  /** Seed Memory: cash still to pay into the silo, and its rate per second. */
  memory: number;
  memoryRate: number;
  /** Last step's held directions (edge detection) and the warning levels last sent: saved so a load steps the same. */
  prevIn: { left: boolean; right: boolean; up: boolean; down: boolean };
  warns: Record<string, number>;
  /** Stats bought since the pod last docked: B never chains levels of one stat at one dock. */
  boughtHere: string[];
  /** The dive count at the last purchase (the stall guard). */
  divesAtBuy: number;
  /** Ore tiles per 10-row band when the world was made (the thin-ore guard). */
  bandOre: number[];
  /** The best unmined vein the depot marks on the map (struggle and thin-ore guards). */
  mark: { x: number; y: number; find: number } | null;
  /** Ines' orders filled (the Regular achievement). */
  ordersFilled: number;
  /** +1 module slot from first reaching Fungal (kept). */
  fungalSlot: boolean;
  perks: Record<string, number>;
  lift: number;
  lance: string[];
  plans: boolean;
  /** Deepest biome slot reached this run (7 = the chamber), and ever. */
  reached: number;
  everReached: number;
  deepest: number;
  biome: number;
  diving: boolean;
  dives: number;
  diveStart: number;
  diveItems: number;
  diveRecord: boolean;
  docked: boolean;
  rigs: number[];
  silo: number;
  lab: number;
  loadout: Record<ItemId, number>;
  service: { sell: boolean; fuel: boolean; repair: boolean; restock: boolean };
  orders: Order[];
  ordersDocks: number;
  orderSeq: number;
  day: number;
  tz: number;
  supplyDay: number;
  rested: number;
  brokeAt: number;
  lastNow: number;
  offline: OfflineCard | null;
  /** Fees taken since the last dock (tow, rebuild), shown on the next sale. */
  fees: number;
  hauls: number[];
  freeTow: boolean;
  cleanRun: boolean;
  scanCd: number;
  pockets: { find: number; tiles: number[] }[];
  log: Log;
  achievements: string[];
  records: Records;
  stats: Stats;
  heard: Record<string, number>;
  rand: number;
  launch: { t: number; shards: number; choices: PlanetId[]; phase: string } | null;
  liftCarY: number;
  pod: PodState;
}

const DOCK_COLS = (spawnX: number) => [spawnX - 1, spawnX + 6] as const;
const TOWN: { id: string; from: number; to: number }[] = [
  { id: "launch", from: 2, to: 6 }, { id: "rigs", from: 8, to: 12 }, { id: "lab", from: 13, to: 15 }, { id: "workshop", from: 16, to: 19 },
  { id: "fuel", from: 20, to: 22 }, { id: "market", from: 31, to: 34 }, { id: "supply", from: 36, to: 38 },
];

export class Game implements GameView {
  s: GameState;
  live: Live;
  opts: GameOpts;
  /** Edge-triggered directions this step. */
  edge = { up: false, down: false, left: false, right: false };
  /** Nearest relic, jackpot or cache within chime range (audio), refreshed every 0.25 s. */
  lure: { x: number; y: number; d: number; kind: "relic" | "jackpot" | "cache" } | null = null;

  private out: GameEvent[] = [];
  /** Continuous damage (lava, heat) summed between its 0.25 s events. */
  private cont: Record<string, number> = {};
  private dist = new Float64Array(W * H);
  private stamp = new Int32Array(W * H);
  private gen = 0;
  private heap = new Heap();

  constructor(s: GameState, live: Live, opts: GameOpts = {}) {
    this.s = s;
    this.live = live;
    this.opts = opts;
    this.refreshStats(false);
    this.homeTick();
  }

  static create(seed: number, opts: GameOpts = {}): Game {
    const planet = opts.planet ?? "vell";
    const s = meta.freshState(seed >>> 0, planet);
    s.worldSeed = worldSeedFor(s.seed, planet, 0);
    const world = (opts.makeWorld ?? defaultWorld)(s.worldSeed, planet, []);
    const live = new Live(world);
    s.pod = freshPod(world.spawnX + 4.5, -HW - 1e-6);
    s.liftCarY = 0;
    s.orders = meta.makeOrders(s, world);
    s.bandOre = meta.bandOre(world);
    const g = new Game(s, live, opts);
    g.refreshStats(true);
    if (opts.now !== undefined) meta.setClock(g, opts.now, opts.tz ?? 0);
    return g;
  }

  /** Restore a save (any version), then apply offline progress up to `now`. */
  static load(obj: unknown, now?: number, opts: GameOpts = {}): Game {
    const { s, live } = deserialize(obj, opts.makeWorld ?? defaultWorld);
    const g = new Game(s, live, opts);
    if (now !== undefined) meta.applyOffline(g, now, opts.tz ?? s.tz);
    g.homeTick(); // the way home is known before the first warning check
    return g;
  }

  save(now?: number): SaveData {
    if (now !== undefined) this.s.lastNow = now;
    return serialize(this);
  }

  // ---------------------------------------------------------------- GameView

  get world() { return this.live.w; }
  takeDirty() { return this.live.takeDirty(); }
  get pod() { return this.s.pod; }
  get entities(): readonly Ent[] { return this.live.ents; }
  get time() { return this.s.time; }
  get dayPhase() { return (this.s.time / 600 + 0.3) % 1; }
  get levels() { return this.s.levels; }
  get modules(): readonly string[] { return this.s.modules; }
  get liftDepth() { return this.s.lift > 0 ? LIFT_SEGMENTS[this.s.lift - 1].end : 0; }
  tempAt(row: number) { return tempAt(row, this.s.planet); }

  // ---------------------------------------------------------------- the step

  step(dt: number, input: Input): GameEvent[] {
    const s = this.s, p = this.pod;
    const prev = s.prevIn;
    this.edge = { up: input.up && !prev.up, down: input.down && !prev.down, left: input.left && !prev.left, right: input.right && !prev.right };
    const q0 = Math.floor(s.time * 4);
    s.time += dt;
    s.scanCd = Math.max(0, s.scanCd - dt);
    if (s.launch) { meta.stepLaunch(this, dt); s.prevIn = held(input); return this.flush(); }
    stepPod(this, input, dt);
    this.live.step(this, dt);
    this.storm(dt);
    this.syncCar();
    if (!p.dead) this.track();
    this.town(input);
    // rigs feed the silo and the lab trickles data while you play
    s.silo += (meta.rigsPerMin(this) / 60) * dt;
    s.data += (s.lab * LAB_RATE * meta.dataMult(this) / 60) * dt;
    if (this.has("A3")) s.data += (s.rigs.filter((l) => l >= 5).length * DATA.scoutsPer10Min / 600) * dt;
    if (s.memory > 0) { const pay = Math.min(s.memory, (s.memoryRate * dt)); s.memory -= pay; s.silo += pay; }
    if (Math.floor(s.time * 4) !== q0) this.quarter();
    if (Math.floor(s.time) !== Math.floor(s.time - dt)) meta.checkAchievements(this);
    s.prevIn = held(input);
    return this.flush();
  }

  /** Events since the last step (shop actions between steps arrive with the next step). */
  private flush() { const out = this.out; this.out = []; return out; }
  emit(e: GameEvent) {
    if (e.t === "buy") { this.s.stats.lastBuy = this.s.time; this.s.divesAtBuy = this.s.dives; if (e.what === "upgrade") this.s.boughtHere.push(e.id); }
    this.out.push(e);
  }

  /** Every 0.25 s: the fuel tick, warnings, map memory, the chime lure, places. */
  private quarter() {
    const p = this.pod;
    for (const source in this.cont) { const a = this.cont[source]; this.emit({ t: "damage", amount: a, source, frac: a / p.hullMax }); }
    this.cont = {};
    this.homeTick();
    if (p.y > 0 && !p.dead) this.live.see(p.x, p.y, p.lamp + (this.has("G1") ? 1 : 0));
    this.warnings();
    this.findLure();
    if (this.s.docked && this.inTown() && p.fuel < 0.05 * p.fuelMax) this.brokeGuard();
    meta.visitPlaces(this);
    // passive scanner pulse every 10 s from level 5 (D10)
    if (this.scanLevel() >= 5 && p.y > 0 && Math.floor(this.s.time / 10) !== Math.floor((this.s.time - 0.25) / 10)) this.scanPulse(true);
  }

  // ---------------------------------------------------------------- derived stats

  /** Recompute tank, hull and cargo maxima after levels or modules change (keeps current fuel and hull). */
  refreshStats(fill: boolean) {
    const p = this.pod, L = this.s.levels;
    const fm = STAT_FX.tank(L.tank), hm = STAT_FX.hull(L.hull);
    if (fill) { p.fuel = fm; p.hull = hm; }
    else { p.fuel = Math.min(fm, p.fuel); p.hull = Math.min(hm, p.hull); }
    p.fuelMax = fm; p.hullMax = hm;
    p.cargoMax = this.cargoMax();
    p.lamp = STAT_FX.lamp(this.lampLevel());
    updateLoad(this);
  }
  cargoMax() { return Math.floor(STAT_FX.cargo(this.s.levels.cargo) * (this.moduleOn("dense") ? 1.25 : 1)); }
  power() { return STAT_FX.drill(this.s.levels.drill); }
  gravity() { return planetEcon(this.s.planet).gravity; }
  lampLevel() { return this.s.levels.lamp + (this.s.log.wrenLamp ? 1 : 0); }
  scanLevel() { return this.s.levels.scanner; }
  has(id: string) { return this.s.research.includes(id); }
  moduleOn(id: ModuleId) { return this.s.modules.includes(id); }
  moduleSlots() { return MODULE_SLOTS_BASE + (this.s.fungalSlot ? 1 : 0) + (this.has("E2") ? 1 : 0); }
  hasKey() { return this.s.log.finds[findId("A13")] !== undefined; }
  /** Hazard damage scale at a row: D_b = 1.6^b, times 1.08^n for the Seed age (R4). */
  hazardScale(row: number) { return Math.pow(1.6, slotOfRow(Math.max(0, row))) * Math.pow(SEED_AGE.hazard, this.s.launches) * (this.has("E3") ? 0.85 : 1); }
  /** Falls and bumps: absolute damage, halved by Shock Struts. */
  impactScale() { return this.has("E4") ? 0.5 : 1; }
  bDeep() { return Math.min(6, this.s.reached); }
  padX() { return this.live.w.spawnX + 4.5; }
  inTown() { return this.pod.y < 0 && !this.pod.dead; }
  liftCar(y: number) { this.s.liftCarY = y; }
  /** The Lift's car is an entity (kind "lift", y = the car's centre) once a segment is built. */
  private syncCar() {
    if (!this.liftDepth) return;
    let car = this.live.ents.find((e) => e.kind === "lift");
    if (!car) car = this.live.add("lift", this.live.w.spawnX + 0.5, Math.max(HW, this.s.liftCarY));
    car.y = Math.max(HW, Math.min(this.liftDepth - HW, this.s.liftCarY));
  }
  rand() { return hash(this.s.rand++, 17, this.s.seed); }

  /** The price of one piece (D4: tier price x planet value x Seed age x bonuses x today's board). */
  pieceValue(find: number) {
    const f = FINDS[find];
    if (!f || f.kind === "artifact") return 0;
    let v = orePrice(f.tier) * (f.kind === "jackpot" ? f.mult ?? 1 : 1);
    // the planet's own biome sells higher (Cinder x1.3, Ferrum x1.2); Seed age x1.3^n
    if (f.biome === planetDef(this.s.planet).own) v *= planetEcon(this.s.planet).ownValue;
    v *= Math.pow(SEED_AGE.value, Math.min(this.s.launches, (SEED_AGE as { cap?: number }).cap ?? Infinity));
    v *= Math.pow(1.25, this.s.perks.contacts ?? 0);
    if (this.has("G2")) v *= 1.2;
    if (this.has("G4") && f.kind === "ore" && topOre(f.biome, this.s.planet) === find) v *= 1.5;
    if (f.kind === "ore" && this.s.log.sets.includes(f.biome)) v *= 1.1;
    v *= meta.boardMult(this, find);
    return v;
  }

  // ---------------------------------------------------------------- contact with the pod

  podOverlaps(x0: number, y0: number, x1: number, y1: number) {
    const p = this.pod;
    if (p.dead) return false;
    return p.x + HW > x0 && p.x - HW < x1 && p.y + HW > y0 && p.y - HW < y1;
  }

  /** Damage the hull. Impulse hits respect the 0.4 s invulnerability and cancel a teleport channel. */
  hurt(amount: number, source: string, impulse = true) {
    const p = this.pod;
    if (p.dead || p.riding || amount <= 0 || this.inTown()) return;
    if (impulse) {
      if (p.invuln > 0) return;
      p.invuln = 0.4;
      if (p.chanT > 0) { p.chanT = 0; p.channel = 0; this.emit({ t: "teleport", phase: "cancel" }); }
    }
    p.hull = Math.max(0, p.hull - amount);
    // continuous damage (lava, heat) is summed and sent every 0.25 s; hits are sent at once
    if (impulse || p.hull <= 0) this.emit({ t: "damage", amount: amount + (this.cont[source] ?? 0), source, frac: (amount + (this.cont[source] ?? 0)) / p.hullMax });
    if (impulse || p.hull <= 0) delete this.cont[source];
    else this.cont[source] = (this.cont[source] ?? 0) + amount;
    if (p.hull <= 0) this.wreck();
  }

  /** A blast near the pod: gas by distance and depth, own explosives a fixed share (core-loop "Hull"). */
  blastPod(cx: number, cy: number, kind: "gas" | "dynamite" | "charge") {
    const p = this.pod, d = Math.hypot(p.x - cx, p.y - cy);
    if (kind === "gas") this.hurt(14 * this.hazardScale(Math.floor(cy)) * Math.max(0, 1 - d / 2), "gas");
    else if (kind === "dynamite" && d <= 1.5) this.hurt(0.2 * p.hullMax, "dynamite");
    else if (kind === "charge" && d <= 3) this.hurt(0.35 * p.hullMax, "charge");
  }

  /** The core pulse (D7): a beat every 10 s; the ring reaches the pod's row at 40 tiles/s and adds 80 C for 1.5 s. */
  pulseCheck(dt: number) {
    const p = this.pod, row = Math.floor(p.y), t = this.s.time;
    if (row < 600) return;
    if (Math.floor(t / 10) !== Math.floor((t - dt) / 10)) this.emit({ t: "pulse" });
    if (row < 680) return;
    const delay = Math.max(0, CHAMBER.cy - row) / 40;
    if (Math.floor((t - delay) / 10) !== Math.floor((t - dt - delay) / 10)) p.pulseHeat = 1.5;
  }

  // ---------------------------------------------------------------- finds into the bay

  /** A tile the drill or the drone broke: its pieces, cache, timber or relic. */
  collect(i: number, mat: number, find: number) {
    const x = i % W, y = (i / W) | 0;
    if (find) {
      const f = FINDS[find];
      this.gain(find, f.kind === "ore" ? piecesPerTile(this.live.w.biome[i]) : 1, x, y);
      if (f.kind === "ore" && this.moduleOn("tracer")) {
        const tiles = this.live.vein(i, find);
        for (const j of tiles) this.live.setFlag(j, FLAG.SCANNED);
        if (tiles.length) this.live.reveals.push({ tiles, until: this.s.time + 10 });
      }
    }
    if (MATERIALS[mat]?.cache) this.openCache(i, x, y, true);
    if (mat === MAT.TIMBER) this.live.timberCollapse(this, i);
  }

  /** n pieces of a find reach the pod: into the bay while slots are free, the rest left lying. */
  gain(find: number, n: number, x: number, y: number) {
    const p = this.pod, f = FINDS[find], log = this.s.log;
    const first = log.finds[find] === undefined;
    if (f.kind === "artifact") {
      if (!p.artifacts.includes(find)) p.artifacts.push(find);
      meta.logFind(this, find, 1, y);
      this.emit({ t: "find", find, first });
      this.emit({ t: "toast", text: `Found: ${f.name}`, tone: "good" });
      return;
    }
    const take = Math.min(n, Math.max(0, freeSlots(this)));
    if (take > 0) {
      addCargo(p.cargo, find, take);
      this.emit({ t: "pickup", find, count: take, x, y, value: take * this.pieceValue(find) });
      meta.logFind(this, find, take, y);
      if (first || f.kind === "jackpot") this.emit({ t: "find", find, first });
    }
    const rest = n - take;
    if (rest > 0) {
      this.live.drop(x, y, find, rest);
      this.emit({ t: "nugget", find, x, y });
      if (!p.fullTold) { p.fullTold = true; this.emit({ t: "cargo_full", x, y }); }
    }
    updateLoad(this);
  }

  /** A cache cracks open (R10): pieces to the bay (or loose), an item to its slot or its price as cash. */
  openCache(i: number, x: number, y: number, toBay: boolean) {
    const spot = this.live.w.caches?.find((c) => c.x === x && c.y === y);
    const theme = spot?.kind ?? MATERIALS[this.live.w.back[i]]?.cache ?? "crate";
    this.emit({ t: "cache", x, y, theme });
    meta.logCache(this, theme);
    if (!spot) return;
    for (const pc of spot.pieces) {
      if (toBay) this.gain(pc.find, pc.count, x, y);
      else this.live.drop(x, y, pc.find, pc.count);
    }
    const item = spot.item as ItemId | undefined;
    if (item && ITEMS[item]) {
      if (this.pod.items[item] < this.carry(item)) this.pod.items[item]++;
      else { this.s.cash += itemPrice(item, this.bDeep()); }
    }
  }

  /** Touch a crate to recover it; the Magnet Coil pulls its contents from 3 tiles, one piece at a time. */
  recoverCrate(e: Ent, touch: boolean) {
    const p = this.pod, cargo = e.cargo ?? {}, ingots = e.ingots ?? {};
    const x = Math.floor(e.x), y = Math.floor(e.y);
    // a touch takes all that fits; the magnet pulls one unit (an ingot or a piece) per pull
    let pulled = false;
    for (const k of Object.keys(ingots).map(Number)) {
      while (ingots[k] > 0 && freeSlots(this) > 0 && (touch || !pulled)) { addCargo(p.ingots, k, 1); ingots[k]--; pulled = true; }
    }
    for (const k of Object.keys(cargo).map(Number)) {
      if (!touch && pulled) break;
      const take = Math.min(cargo[k], Math.max(0, freeSlots(this)), touch ? Infinity : 1);
      if (take > 0) { addCargo(p.cargo, k, take); cargo[k] -= take; pulled = true; this.emit({ t: "pickup", find: k, count: take, x, y, value: take * this.pieceValue(k) }); }
    }
    for (const k in cargo) if (cargo[k] <= 0) delete cargo[k];
    for (const k in ingots) if (ingots[k] <= 0) delete ingots[k];
    if (touch) {
      for (const k in cargo) this.live.drop(x, y, +k, cargo[k]);
      for (const k in ingots) this.live.drop(x, y, +k, ingots[k] * 5);
      this.live.remove(e);
    } else {
      p.magnetT = 0.05;
      if (!Object.keys(cargo).length && !Object.keys(ingots).length) this.live.remove(e);
    }
    updateLoad(this);
  }

  /** The one crate (wreck or tow): a new one replaces an unclaimed one (D15). */
  private crate() {
    const p = this.pod;
    this.live.ents = this.live.ents.filter((e) => e.kind !== "crate");
    if (!slotsUsed(p)) return;
    const c = this.live.add("crate", Math.floor(p.x) + 0.5, Math.floor(p.y) + 0.5, { cargo: { ...p.cargo }, ingots: { ...p.ingots } });
    this.live.settle(c);
    p.cargo = {}; p.ingots = {}; p.smelt = {};
  }
  private cargoValue() {
    const p = this.pod;
    let v = 0;
    for (const k in p.cargo) v += p.cargo[k] * this.pieceValue(+k);
    for (const k in p.ingots) v += p.ingots[k] * this.pieceValue(+k) * INGOT_MULT;
    return v;
  }

  // ---------------------------------------------------------------- rescues (R1, D15)

  wreck() {
    const p = this.pod;
    if (p.dead) return;
    const lost = this.cargoValue();
    this.emit({ t: "wreck", x: p.x, y: p.y });
    if (p.dig) p.dig = null;
    this.crate();
    p.dead = true; p.deadT = 1.2; p.vx = 0; p.vy = 0; p.chanT = 0; p.channel = 0;
    this.s.stats.wrecks++;
    this.s.cleanRun = false;
    this.s.fees += 0;
    (p as PodState & { lost?: number }).lost = lost;
  }
  /** After the wreck's burst: the pod is rebuilt at the depot, hull and fuel full; fee 10% of cash, capped at the lost cargo. */
  rebuild() {
    const p = this.pod;
    const lost = (p as PodState & { lost?: number }).lost ?? 0;
    delete (p as PodState & { lost?: number }).lost;
    const fee = Math.round(Math.min(GUARDS.rebuildShare * this.s.cash, lost));
    this.s.cash -= fee;
    this.s.fees += fee;
    this.home(true);
    this.emit({ t: "rescue", kind: "wreck", fee });
  }
  /** Out of fuel (R1): the pod alone is towed to the depot; the cargo stays as a crate; the fee is a full tank. */
  tow() {
    const p = this.pod;
    let fee = Math.round(fuelPrice(this.bDeep()) * p.fuelMax);
    if (this.s.freeTow) { fee = 0; this.s.freeTow = false; }
    this.crate();
    this.s.cash = Math.max(0, this.s.cash - fee);
    this.s.fees += fee;
    this.s.stats.tows++;
    this.s.cleanRun = false;
    this.home(false);
    this.emit({ t: "rescue", kind: "tow", fee });
  }
  /** The teleporter's jump: pod and cargo home, 30% of the pieces lost (R1). */
  teleportHome() {
    const p = this.pod;
    p.items.teleport = Math.max(0, p.items.teleport - 1);
    const lost = teleportLoss(this);
    this.home(false);
    this.emit({ t: "teleport", phase: "done", lost });
  }
  /** Put the pod on the depot forecourt. */
  private home(full: boolean) {
    const p = this.pod;
    p.dead = false; p.deadT = 0; p.stranded = false; p.strandT = 0;
    p.x = this.padX(); p.y = -HW - 1e-6; p.vx = 0; p.vy = 0;
    p.dig = null; p.engage = null; p.riding = false; p.drop = false; p.heat = 0; p.chanT = 0; p.channel = 0;
    p.invuln = 0; p.fullTold = false; p.burst = 0; p.lavaT = 0;
    if (full) { p.fuel = p.fuelMax; p.hull = p.hullMax; }
    // a rescue always leaves fuel to reach the dig face again: at least a quarter tank
    p.fuel = Math.max(p.fuel, RESCUE_FUEL * p.fuelMax);
    this.s.docked = false;
    updateLoad(this);
    this.homeTick();
  }

  // ---------------------------------------------------------------- depth, biomes, the dive

  private track() {
    const s = this.s, p = this.pod, live = this.live;
    const row = Math.floor(p.y);
    if (!s.diving && p.y > 0.5) this.diveStart();
    if (s.diving && p.y < 0) this.surfaceUp();
    if (row < 0) return;
    if (row > s.deepest) {
      s.deepest = row;
      // depth record data: 2 per new 100 m (10 rows) of the planet's record
      const prev = s.records.deepest[s.planet] ?? 0;
      if (row > prev) {
        const gain = Math.floor(row / 10) - Math.floor(prev / 10);
        if (gain > 0) s.data += gain * DATA.depthPer100m * meta.dataMult(this);
        s.records.deepest[s.planet] = row;
        if (!s.diveRecord && prev > 20) { s.diveRecord = true; this.emit({ t: "record", row }); }
      }
    }
    const slot = live.w.biome[I(Math.max(1, Math.min(W - 2, Math.floor(p.x))), Math.min(H - 1, row))];
    if (slot !== s.biome) {
      const first = slot > s.reached;
      s.biome = slot;
      this.emit({ t: "biome", biome: slot, first });
      if (first) meta.reachBiome(this, slot);
    }
    if (s.reached === 6 && row >= 748 && Live.inChamber(p.x, p.y)) meta.reachBiome(this, 7);
  }

  private diveStart() {
    const s = this.s;
    s.diving = true;
    s.dives++;
    s.diveStart = s.time;
    s.diveItems = 0;
    s.diveRecord = false;
    s.docked = false;
    this.pod.fullTold = false;
    this.emit({ t: "dive" });
    if (s.dives === 1 && s.launches === 0) this.emit({ t: "toast", text: biomeLine(s.planet), tone: "quiet" });
    this.rollPocket();
  }

  private surfaceUp() {
    const s = this.s, p = this.pod;
    s.diving = false;
    const len = s.time - s.diveStart;
    if (len > (s.records.longestDive ?? 0)) s.records.longestDive = len;
    if (len > 240 && s.diveItems === 0) meta.achieve(this, "deep_breath");
    this.emit({ t: "surface" });
    // relics go to Sefa at the lab
    for (const a of p.artifacts) meta.readRelic(this, a);
    p.artifacts = [];
  }

  /**
   * The dive's rich pocket (R10): an untouched pocket reverts to rock and a partly mined one stays as plain ore
   * (core-loop; progression's pick), then one is rolled (world.md 4's placement) and trimmed to 15% of the bay
   * (progression 9). A frozen frontier (the heat line within 15 rows of the deepest row) gets none.
   */
  private rollPocket() {
    const s = this.s, w = this.live.w;
    for (const pk of s.pockets) {
      const untouched = pk.tiles.every((i) => w.find[i] === pk.find && w.mat[i] !== 0);
      for (const i of pk.tiles) {
        if (w.flag[i] & FLAG.RICH) { w.flag[i] &= ~FLAG.RICH; this.live.dirty(i); }
        if (untouched && w.find[i] === pk.find) w.find[i] = 0;
      }
    }
    s.pockets = [];
    // the thin-ore guard: everything reachable is mined thin while a gate is unaffordable: the pocket rolls in the
    // deepest reached band, past the frozen-frontier rule
    const thin = meta.thinOre(this);
    if (!thin && meta.frontierRow(this) < s.deepest + 15) return;
    const pk = richPocket(w, s.dives, thin ? Math.max(0, s.deepest - 26) : s.deepest, this.power());
    if (!pk) return;
    const n = piecesPerTile(Math.min(6, slotOfRow((pk.tiles[0] / W) | 0)));
    const keep = Math.max(1, Math.floor((GUARDS.pocketShare * this.cargoMax()) / n));
    pk.tiles = pk.tiles.slice(0, keep);
    for (const i of pk.tiles) { w.find[i] = pk.find; w.flag[i] |= FLAG.RICH; this.live.dirty(i); }
    s.pockets.push(pk);
  }

  // ---------------------------------------------------------------- fuel to the lift head (core-loop)

  /** Every 0.25 s: the cheapest way home by Dijkstra over opened tiles; up costs fuel_row, sideways side / V_x x 0.10. */
  homeTick() {
    const p = this.pod;
    if (p.y < 0 || p.riding || p.dead) { p.fuelHome = 0; return; }
    const sx = Math.max(0, Math.min(W - 1, Math.floor(p.x))), sy = Math.max(0, Math.min(H - 1, Math.floor(p.y)));
    const up = fuelRow(this, p.load), side = 0.1 / STAT_FX.drive(this.s.levels.engine);
    const w = this.live.w, dist = this.dist, stamp = this.stamp, heap = this.heap;
    const gen = ++this.gen;
    const home = (i: number) => i < W || (w.flag[i] & FLAG.LIFT) !== 0;
    const start = I(sx, sy);
    heap.clear();
    dist[start] = 0; stamp[start] = gen;
    heap.push(0, start);
    let best = Infinity;
    while (heap.size) {
      const d = heap.topKey(), i = heap.pop();
      if (d > dist[i]) continue;
      if (home(i)) { best = d; break; }
      const x = i % W;
      const relax = (j: number, c: number) => {
        if (j < 0 || j >= W * H || w.mat[j] !== 0) return;
        const nd = d + c;
        if (stamp[j] !== gen || nd < dist[j]) { stamp[j] = gen; dist[j] = nd; heap.push(nd, j); }
      };
      relax(i - W, up);
      relax(i + W, 0);
      if (x > 0) relax(i - 1, side);
      if (x < W - 1) relax(i + 1, side);
    }
    p.fuelHome = best === Infinity ? Infinity : 1.2 * best;
  }

  private warnings() {
    const p = this.pod;
    const lv: Record<string, number> = { fuel: 0, hull: 0, heat: 0, home: 0 };
    if (p.y >= 0 && !p.dead) {
      const need = p.fuelHome;
      // sealed in: the sealed-in prompt is the warning, not "Turn back now" (QA P3)
      lv.home = need === Infinity ? 0 : p.fuel < need ? 3 : p.fuel < need * 1.05 ? 2 : p.fuel < need * 1.3 ? 1 : 0;
      lv.fuel = p.fuel <= 0 ? 3 : p.fuel < 0.15 * p.fuelMax ? 2 : 0;
      lv.heat = p.heat >= 1 ? 3 : p.heat > 0.75 ? 2 : p.heat > 0.4 ? 1 : 0;
    }
    const hf = p.hull / p.hullMax;
    lv.hull = p.dead ? 0 : hf < 0.1 ? 3 : hf < 0.25 ? 2 : hf < 0.5 ? 1 : 0;
    for (const what of ["fuel", "hull", "heat", "home"] as const) {
      if ((this.s.warns[what] ?? 0) !== lv[what]) { this.s.warns[what] = lv[what]; this.emit({ t: "warn", what, level: lv[what] }); }
    }
  }

  private findLure() {
    const p = this.pod, w = this.live.w;
    this.lure = null;
    if (p.y < 0) return;
    const r = this.moduleOn("ear") ? 20 : 10;
    let bd = r + 1e-9;
    for (let y = Math.max(0, Math.floor(p.y - r)); y <= Math.min(H - 1, Math.floor(p.y + r)); y++) for (let x = 1; x < W - 1; x++) {
      if (Math.abs(x - p.x) > r) continue;
      const i = I(x, y), f = w.find[i];
      const kind = f && FINDS[f].kind === "artifact" ? "relic" : f && FINDS[f].kind === "jackpot" ? "jackpot" : MATERIALS[w.mat[i]]?.cache ? "cache" : null;
      if (!kind) continue;
      const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
      if (d < bd) { bd = d; this.lure = { x, y, d, kind }; }
    }
  }

  // ---------------------------------------------------------------- Ferrum's magnetic storms (world.md 7)

  /** Is a storm blowing now (Ferrum, in its own biome's rows)? 10 s every 60-90 s; told 3 s before. */
  storming(t = this.s.time) {
    const pd = planetDef(this.s.planet);
    if (this.s.planet !== "ferrum") return false;
    const rows = BIOMES[pd.biomes[pd.own]].rows, row = this.pod.y;
    if (row < rows[0] || row > rows[1]) return false;
    const k = Math.floor(t / 75), start = k * 75 + hash(k, 0, this.s.seed, 9) * 55;
    return t >= start && t < start + 10;
  }
  private storm(dt: number) {
    const p = this.pod;
    if (this.s.planet !== "ferrum") return;
    if (this.storming(this.s.time + 3) && !this.storming(this.s.time + 3 - dt)) this.emit({ t: "toast", text: "A magnetic storm is coming.", tone: "warn" });
    const on = this.storming(), was = this.storming(this.s.time - dt);
    if (on !== was) this.emit({ t: "storm", on });
    if (!this.storming() || p.grounded || p.dig || p.riding) return;
    // lodestone within 3 tiles tugs the pod at up to 0.5 tiles/s
    const lode = FINDS.findIndex((f) => f?.key === "lodestone");
    let bx = 0, by = 0, bd = 3.01;
    for (let y = Math.floor(p.y) - 3; y <= Math.floor(p.y) + 3; y++) for (let x = Math.floor(p.x) - 3; x <= Math.floor(p.x) + 3; x++) {
      if (x < 0 || x >= W || y < 0 || y >= H || this.live.w.find[I(x, y)] !== lode) continue;
      const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
      if (d < bd) { bd = d; bx = x + 0.5; by = y + 0.5; }
    }
    if (bd > 3 || bd < 0.6) return;
    const nx = p.x + ((bx - p.x) / bd) * 0.5 * dt, ny = p.y + ((by - p.y) / bd) * 0.5 * dt;
    if (boxFree(this, nx, ny)) { p.x = nx; p.y = ny; }
  }

  // ---------------------------------------------------------------- the scanner (D10)

  scanPulse(passive: boolean): Result {
    const p = this.pod, L = this.scanLevel();
    if (L < 1) return no("No scanner yet.");
    if (p.y < 0) return no("Nothing to scan in town.");
    if (!passive) {
      if (this.s.scanCd > 0) return no("The scanner is recharging.");
      if (p.fuel < 0.2) return no("Not enough fuel.");
      p.fuel -= 0.2;
      this.s.scanCd = 8;
    }
    let r = (4 + 2 * L) * (L >= 7 ? 1.5 : 1);
    if (this.storming()) {
      if (!this.has("P2")) { this.emit({ t: "scan", x: p.x, y: p.y, r: 0, passive }); return no("The storm swallows the pulse."); }
      r /= 2;
    }
    const pockets = new Set(this.s.pockets.flatMap((pk) => pk.tiles));
    const tiles = this.live.scan(p.x, p.y, r, L, pockets);
    // Deep Survey: caches and the rich pocket show from 40 rows
    if (this.has("G3")) tiles.push(...this.live.survey(p.y, 40, pockets));
    const keep = (6 + 0.5 * L) * (L >= 6 ? 2 : 1);
    if (tiles.length) this.live.reveals.push({ tiles, until: this.s.time + keep });
    this.emit({ t: "scan", x: p.x, y: p.y, r, passive });
    return OK;
  }

  // ---------------------------------------------------------------- the town and the depot

  /** The building the pod stands at, if any (art.md 7.2's columns). */
  building(): string | null {
    const p = this.pod;
    if (!this.inTown() || !p.grounded) return null;
    const x = Math.floor(p.x);
    const [a, b] = DOCK_COLS(this.live.w.spawnX);
    if (x >= a && x <= b && x !== this.live.w.spawnX) return "depot";
    return TOWN.find((t) => x >= t.from && x <= t.to)?.id ?? null;
  }

  /** The broke guard: an empty bay and no cash for half a tank: Ida covers half a tank, once per 10 minutes.
   * Checked on docking and again every 0.25 s while the pod sits docked and dry (QA Q1). */
  private brokeGuard() {
    const s = this.s, p = this.pod;
    if (slotsUsed(p) || s.cash >= 0.5 * p.fuelMax * fuelPrice(this.bDeep()) || p.fuel >= 0.5 * p.fuelMax || s.time - s.brokeAt < GUARDS.brokeEvery) return;
    p.fuel = 0.5 * p.fuelMax;
    s.brokeAt = s.time;
    this.emit({ t: "toast", text: "Ida covers half a tank.", tone: "quiet" });
  }

  /** Is the pod stopped at the lift head (Head Station's dock, research L1)? */
  atHead() {
    const p = this.pod;
    return this.has("L1") && p.riding && this.liftDepth > 0 && p.y >= this.liftDepth - HW - 0.01 && Math.abs(p.vy) < 0.01;
  }

  private town(_inp: Input) {
    const s = this.s, p = this.pod;
    const onDepot = this.building() === "depot", head = this.atHead();
    if ((onDepot || head) && !s.docked) { s.docked = true; this.dock(head); }
    else if (!onDepot && !head && s.docked && !(this.inTown() && p.grounded && Math.floor(p.x) === this.live.w.spawnX)) s.docked = false;
  }

  /** The depot service (core-loop, progression 15): sell all, refuel, repair, restock; each a toggle. At the lift head
   * (Head Station) the same runs without the rigs. */
  dock(head = false) {
    const s = this.s, p = this.pod;
    s.boughtHere = [];
    meta.newDay(this);
    const arrivedFuel = p.fuel, arrivedHull = p.hull / p.hullMax;
    const used = slotsUsed(p), fullBay = used >= p.cargoMax && used > 0;
    const sale: Sale = { lines: [], rigs: 0, fuel: 0, repair: 0, items: 0, fee: s.fees, total: 0, best: false };
    s.fees = 0;
    let sales = 0;
    // the lance's Heartstone is never sold while the Seed waits: up to 5 stay aboard once the plans are known
    const hs = findId("heartstone");
    const keep = s.plans ? Math.min(p.cargo[hs] ?? 0, HEARTSTONE_NEEDED) : 0;
    if (s.service.sell && used - keep > 0) {
      const rested = s.rested > 0 ? GUARDS.restedBonus : 1;
      const ids = new Set([...Object.keys(p.cargo), ...Object.keys(p.ingots)].map(Number));
      for (const k of ids) {
        const pieces = (p.cargo[k] ?? 0) - (k === hs ? keep : 0), ingots = p.ingots[k] ?? 0;
        if (pieces + ingots <= 0) continue;
        const value = (pieces + ingots * INGOT_MULT) * this.pieceValue(k) * rested;
        sale.lines.push({ find: k, count: pieces + ingots * 5, value });
      }
      sale.orders = meta.applyOrders(this, sale.lines);
      for (const l of sale.lines) sales += l.value;
      sale.lines.sort((a, b) => a.value - b.value);
      if (s.rested > 0) s.rested--;
      meta.fullHouse(this);
      p.cargo = keep ? { [hs]: keep } : {}; p.ingots = {}; p.smelt = {}; p.fullTold = false;
      s.cash += sales;
      s.earned += sales;
      if (sales > (s.records.richestHaul ?? 0)) { sale.best = s.records.richestHaul > 0; s.records.richestHaul = sales; }
      s.hauls.push(sales);
      if (s.hauls.length > 5) s.hauls.shift();
      meta.struggle(this, sales);
      if (s.freeTow || meta.thinOre(this)) meta.markVein(this);
      if (fullBay) meta.achieve(this, "first_haul");
    }
    if (s.silo >= 1 && !head) {
      sale.rigs = Math.floor(s.silo);
      s.silo -= sale.rigs;
      s.cash += sale.rigs;
      s.earned += sale.rigs;
    }
    const fp = fuelPrice(this.bDeep());
    if (used === 0) this.brokeGuard();
    const skipped: string[] = [];
    if (s.service.fuel && p.fuel < p.fuelMax) {
      const litres = Math.min(p.fuelMax - p.fuel, s.cash / fp);
      if (litres < p.fuelMax - p.fuel - 1e-6) skipped.push("fuel");
      p.fuel += litres;
      sale.fuel = litres * fp;
      s.cash -= sale.fuel;
    }
    if (s.service.repair && p.hull < p.hullMax) {
      const rp = repairPrice(this.bDeep());
      const hp = Math.min(p.hullMax - p.hull, s.cash / rp);
      if (hp < p.hullMax - p.hull - 1e-6) skipped.push("repair");
      p.hull += hp;
      sale.repair = hp * rp;
      s.cash -= sale.repair;
    }
    if (s.service.restock) {
      for (const id of ITEM_KEYS) {
        const want = Math.min(s.loadout[id] ?? 0, this.carry(id));
        if (!this.itemOpen(id)) continue;
        while (p.items[id] < want) {
          const price = itemPrice(id, this.bDeep());
          if (s.cash < price) { skipped.push(ITEMS[id].name); break; }
          s.cash -= price; sale.items += price; p.items[id]++;
        }
      }
    }
    meta.supplyCrate(this);
    s.cash = Math.max(0, s.cash);
    sale.total = sales + sale.rigs - sale.fuel - sale.repair - sale.items;
    if (arrivedFuel < 1 && used > 0) meta.achieve(this, "close_call");
    if (arrivedHull < 0.05 && used > 0) meta.achieve(this, "scrape");
    if (sale.lines.length || sale.rigs || sale.fuel > 0.005 || sale.repair > 0.005 || sale.items || sale.fee) this.emit({ t: "dock", sale });
    if (skipped.length) this.emit({ t: "toast", text: `Not enough cash: skipped ${skipped.join(", ")}.`, tone: "warn" });
    updateLoad(this);
    meta.checkAchievements(this);
  }

  // ---------------------------------------------------------------- shop actions

  /** Shop actions work in town; B's gates also at the lift head with Head Station. */
  private viaB = false;
  private shopping(): Result | null {
    if (this.s.launch) return no("The Seed is rising.");
    if (!this.inTown() && !(this.viaB && this.atHead())) return no("Only in town.");
    return null;
  }

  upgradePrice(stat: Stat) {
    return Math.round(upgradeCost(stat, this.s.levels[stat]) * (1 - 0.06 * (this.s.perks.engineer ?? 0)));
  }
  upgradeCap(stat: Stat) { return UPGRADES[stat].cap + (stat === "drill" ? this.s.perks.drillmastery ?? 0 : 0); }
  buyUpgrade(stat: Stat): Result {
    const bad = this.shopping();
    if (bad) return bad;
    if (!STATS.includes(stat)) return no("No such upgrade.");
    const L = this.s.levels[stat];
    if (L >= this.upgradeCap(stat)) return no("Already at the top level.");
    const cost = this.upgradePrice(stat);
    if (this.s.cash < cost) return no("Not enough cash.");
    this.s.cash -= cost;
    this.s.levels[stat] = L + 1;
    const p = this.pod, of = p.fuelMax, oh = p.hullMax;
    this.refreshStats(false);
    p.fuel += p.fuelMax - of;
    p.hull += p.hullMax - oh;
    this.emit({ t: "buy", what: "upgrade", id: stat, level: L + 1, tierUp: meta.tierUp(stat, L + 1) });
    return OK;
  }

  /** B: buy the suggestion card's pick (gates only, R7). */
  buySuggested(): Result {
    const sg = this.suggestion();
    if (!sg) return no("Nothing to suggest.");
    this.viaB = sg.kind !== "lance";
    try {
      if (sg.kind === "upgrade") return this.buyUpgrade(sg.stat!);
      if (sg.kind === "lift") return this.buyLift();
      return this.buyLancePart(sg.id);
    } finally { this.viaB = false; }
  }
  suggestion(): Suggestion | null { return meta.suggestion(this); }
  nextGoal(): Goal { return meta.nextGoal(this); }

  liftPrice() { const seg = LIFT_SEGMENTS[this.s.lift]; return seg ? Math.round(seg.price * (1 - 0.06 * (this.s.perks.engineer ?? 0))) : Infinity; }
  /** Is the next Lift segment on sale (the biome below it reached)? */
  liftOnSale() { const seg = LIFT_SEGMENTS[this.s.lift]; return !!seg && this.s.reached >= seg.onSale; }
  buyLift(): Result {
    const bad = this.shopping();
    if (bad) return bad;
    const seg = LIFT_SEGMENTS[this.s.lift];
    if (!seg) return no("The Lift is complete.");
    if (this.s.reached < seg.onSale) return no(`On sale once you reach ${seg.onSale >= 7 ? "the chamber" : BIOMES[planetDef(this.s.planet).biomes[seg.onSale]].name}.`);
    const cost = this.liftPrice();
    if (this.s.cash < cost) return no("Not enough cash.");
    this.s.cash -= cost;
    this.live.buildLift(this, seg.top, seg.end);
    this.s.lift++;
    this.emit({ t: "buy", what: "lift", id: seg.name, level: this.s.lift });
    if (this.s.lift === LIFT_SEGMENTS.length) meta.achieve(this, "liftwright");
    meta.say(this, "workshop", this.s.lift === 1 ? "Straight down, no fuel. Don't get used to it." : undefined);
    return OK;
  }

  carry(id: ItemId) {
    let c = ITEMS[id].carry;
    if (this.has("L3")) c += id === "charge" ? 1 : id === "teleport" ? 0 : 2;
    if (id === "teleport" && this.has("L2")) c += 1;
    if (this.s.perks.pockets) c += 1;
    if (this.s.log.mineThread) c += 1;
    return c;
  }
  itemOpen(id: ItemId) { return this.s.reached >= ITEMS[id].from; }
  itemPrice(id: ItemId) { return itemPrice(id, this.bDeep()); }
  buyItem(id: ItemId, n = 1): Result {
    const bad = this.shopping();
    if (bad) return bad;
    if (!ITEMS[id]) return no("No such item.");
    if (!this.itemOpen(id)) return no("Not sold yet.");
    for (let k = 0; k < n; k++) {
      if (this.pod.items[id] >= this.carry(id)) return k ? OK : no("You can't carry more.");
      const price = this.itemPrice(id);
      if (this.s.cash < price) return k ? OK : no("Not enough cash.");
      this.s.cash -= price;
      this.pod.items[id]++;
      this.emit({ t: "buy", what: "item", id, level: this.pod.items[id] });
    }
    return OK;
  }
  /** The restock target the depot buys up to (0 = never). */
  setLoadout(id: ItemId, n: number): Result {
    if (!ITEMS[id]) return no("No such item.");
    this.s.loadout[id] = Math.max(0, Math.min(this.carry(id), Math.floor(n)));
    return OK;
  }
  setService(key: keyof GameState["service"], on: boolean): Result { this.s.service[key] = on; return OK; }

  /** The cargo panel: drop one piece of a find (or all of it). Works anywhere. */
  dump(find: number, all = false): Result {
    return dumpFind(this, find, all) ? OK : no("None aboard.");
  }

  moduleUnlocked(id: ModuleId) { return this.s.unlocked.includes(id); }
  /** Unlock a module at the lab with data (R7; it opens when its biome is first reached). */
  buyModule(id: ModuleId): Result {
    const m = MODULES[id];
    if (!m) return no("No such module.");
    if (this.s.unlocked.includes(id)) return no("Already unlocked.");
    if (this.s.everReached < m.opens) return no(`Opens once you reach ${BIOMES[m.opens].name}.`);
    if (this.s.data < m.cost) return no("Not enough data.");
    this.s.data -= m.cost;
    this.s.unlocked.push(id);
    this.emit({ t: "buy", what: "module", id, level: 0 });
    return OK;
  }
  equipModule(id: ModuleId): Result {
    const bad = this.shopping();
    if (bad) return bad;
    if (!MODULES[id]) return no("No such module.");
    if (!this.moduleUnlocked(id)) return no("Research it first.");
    if (this.s.modules.includes(id)) return OK;
    if (this.s.modules.length >= this.moduleSlots()) return no("No free module slot.");
    this.s.modules.push(id);
    this.refreshStats(false);
    this.emit({ t: "buy", what: "module", id, level: 1 });
    return OK;
  }
  unequipModule(id: ModuleId): Result {
    const bad = this.shopping();
    if (bad) return bad;
    if (slotsUsed(this.pod) > 0 && id === "dense") return no("Empty the bay first.");
    this.s.modules = this.s.modules.filter((m) => m !== id);
    this.refreshStats(false);
    return OK;
  }

  researchOpen(id: string) { return meta.researchOpen(this, id); }
  buyResearch(id: string): Result {
    const r = researchById(id);
    if (!r) return no("No such research.");
    if (this.has(id)) return no("Already done.");
    const why = meta.researchOpen(this, id);
    if (why !== true) return no(why);
    if (this.s.data < r.cost) return no("Not enough data.");
    this.s.data -= r.cost;
    this.s.research.push(id);
    this.refreshStats(false);
    this.emit({ t: "buy", what: "research", id, level: 1 });
    return OK;
  }

  rigsOpen() { return this.s.reached >= 1; }
  rigPrice(b: number) { return rigCost(b, this.s.rigs[b] ?? 0); }
  buildRig(b: number): Result {
    const bad = this.shopping();
    if (bad) return bad;
    if (!this.rigsOpen()) return no("Rigs open once you reach Stone.");
    if (b < 0 || b > 6 || b > this.s.reached) return no("Reach that biome first.");
    if ((this.s.rigs[b] ?? 0) >= RIG_MAX) return no("Already at the top level.");
    const cost = this.rigPrice(b);
    if (this.s.cash < cost) return no("Not enough cash.");
    this.s.cash -= cost;
    this.s.rigs[b] = (this.s.rigs[b] ?? 0) + 1;
    this.emit({ t: "buy", what: "rig", id: String(b), level: this.s.rigs[b] });
    return OK;
  }
  labPrice() { return LAB_LEVELS[this.s.lab] ?? Infinity; }
  buyLab(): Result {
    const bad = this.shopping();
    if (bad) return bad;
    if (this.s.reached < LAB_FROM) return no("The lab opens once you reach the Crystal caves.");
    if (this.s.lab >= LAB_LEVELS.length) return no("Already at the top level.");
    const cost = this.labPrice();
    if (this.s.cash < cost) return no("Not enough cash.");
    this.s.cash -= cost;
    this.s.lab++;
    this.emit({ t: "buy", what: "lab", id: "lab", level: this.s.lab });
    return OK;
  }

  lancePrice(id: string) {
    const part = LANCE_PARTS.find((l) => l.id === id);
    return part ? part.price : Infinity;
  }
  buyLancePart(id: string): Result {
    const bad = this.shopping();
    if (bad) return bad;
    if (!this.s.plans) return no("Reach the Core for the lance plans.");
    const k = LANCE_PARTS.findIndex((l) => l.id === id);
    if (k < 0) return no("No such part.");
    if (this.s.lance.includes(id)) return no("Already built.");
    if (k > 0 && !this.s.lance.includes(LANCE_PARTS[k - 1].id)) return no(`Build the ${LANCE_PARTS[k - 1].name.toLowerCase()} first.`);
    const cost = this.lancePrice(id);
    if (this.s.cash < cost) return no("Not enough cash.");
    this.s.cash -= cost;
    this.s.lance.push(id);
    this.emit({ t: "buy", what: "lance", id, level: this.s.lance.length });
    return OK;
  }

  buyPerk(id: string): Result {
    const perk = perkById(id);
    if (!perk) return no("No such perk.");
    const L = this.s.perks[id] ?? 0;
    if (L >= perk.max) return no("Already at the top level.");
    const cost = perk.cost(L);
    if (this.s.shards < cost) return no("Not enough shards.");
    this.s.shards -= cost;
    this.s.perks[id] = L + 1;
    this.emit({ t: "buy", what: "perk", id, level: L + 1 });
    return OK;
  }

  /** Can the pod wake the Seed now? (D8: lance complete, 5 Heartstone aboard, docked against the Seed.) */
  canLaunch(): Result {
    if (this.s.launch) return no("Already launching.");
    if (this.s.lance.length < LANCE_PARTS.length) return no("Build the lance first.");
    if (this.heartstone() < HEARTSTONE_NEEDED) return no(`Bring ${HEARTSTONE_NEEDED} Heartstone.`);
    const p = this.pod;
    if (!Live.inChamber(p.x, p.y) && Math.hypot(p.x - CHAMBER.cx, p.y - CHAMBER.cy) > CHAMBER.seedR + 2) return no("Come down into the chamber, beside the Seed.");
    return OK;
  }
  /** Heartstone aboard, counting any ingot (from an older save) as 5. */
  heartstone() { const hs = findId("heartstone"); return (this.pod.cargo[hs] ?? 0) + 5 * (this.pod.ingots[hs] ?? 0); }
  launch(): Result {
    const ok = this.canLaunch();
    if (!ok.ok) return ok;
    meta.launch(this);
    updateLoad(this);
    return OK;
  }
  choosePlanet(planet: PlanetId): Result {
    if (!this.s.launch) return no("Launch the Seed first.");
    if (!this.s.launch.choices.includes(planet)) return no("Ida's telescope can't find that one.");
    meta.prestige(this, planet, this.opts.makeWorld ?? defaultWorld);
    return OK;
  }

  collectOffline(): Result {
    const card = this.s.offline;
    if (!card) return no("Nothing waiting.");
    this.s.cash += this.s.silo;
    this.s.earned += this.s.silo;
    this.s.silo = 0;
    this.s.offline = null;
    if (card.full) meta.achieve(this, "night_shift");
    return OK;
  }
  /** The surface's clock: daily hooks roll over on a new local day. */
  setClock(now: number, tz = 0) { meta.setClock(this, now, tz); }
  applyOffline(now: number) { return meta.applyOffline(this, now, this.s.tz); }
  /** A townsperson's line on opening their building (at most one new line per visit). */
  talk(building: string) { return meta.talk(this, building); }
  /** The surface reports a creature seen in lamp light for 2 s (the log's Life page). */
  seeLife(key: string) { meta.seeLife(this, key); }

  // ---------------------------------------------------------------- debug helpers (window.seedfall)

  teleport(x: number, y: number) {
    const p = this.pod;
    p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.dig = null; p.engage = null; p.riding = false; p.dead = false;
    if (p.y > 0.5 && !this.s.diving) { this.s.diving = true; this.s.diveStart = this.s.time; }
    this.homeTick();
  }
  give(cash: number) { this.s.cash += cash; }
  giveData(n: number) { this.s.data += n; }
  giveItem(id: ItemId, n = 1) { this.pod.items[id] = Math.min(this.carry(id), this.pod.items[id] + n); }
  set(stat: Stat, level: number) {
    this.s.levels[stat] = Math.max(0, Math.min(this.upgradeCap(stat), Math.floor(level)));
    this.refreshStats(true);
  }
  setReached(slot: number) { this.s.reached = Math.max(this.s.reached, slot); this.s.everReached = Math.max(this.s.everReached, slot); }
  reveal() { for (let i = 0; i < W * H; i++) this.live.setFlag(i, FLAG.SEEN | FLAG.SCANNED); }

  /** A stable hash of the whole state and world (determinism tests, the bot). */
  stateHash(): number {
    let h = 2166136261;
    const mix = (v: number) => { h ^= v; h = Math.imul(h, 16777619) >>> 0; };
    const str = JSON.stringify(this.s, (_k, v) => (v === Infinity ? "inf" : v));
    for (let i = 0; i < str.length; i++) mix(str.charCodeAt(i));
    const w = this.live.w;
    for (const arr of [w.mat, w.find, w.haz, w.flag, w.fluid, w.back]) for (let i = 0; i < arr.length; i++) mix(arr[i]);
    const e = JSON.stringify(this.live.ents);
    for (let i = 0; i < e.length; i++) mix(e.charCodeAt(i));
    return h >>> 0;
  }
}

/** A binary min-heap of (key, value) pairs. */
class Heap {
  private k: number[] = [];
  private v: number[] = [];
  get size() { return this.k.length; }
  clear() { this.k.length = 0; this.v.length = 0; }
  topKey() { return this.k[0]; }
  push(key: number, val: number) {
    const k = this.k, v = this.v;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop(): number {
    const k = this.k, v = this.v, top = v[0];
    const lk = k.pop()!, lv = v.pop()!;
    const n = k.length;
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

/** A rescue (tow, teleport, wreck) leaves at least this share of a tank (QA Q1: never a dead pod in town). */
const RESCUE_FUEL = 0.25;
const held = (i: Input) => ({ left: !!i.left, right: !!i.right, up: !!i.up, down: !!i.down });
const biomeLine = (planet: PlanetId) => BIOMES[planetDef(planet).biomes[0]].line;
const findId = (key: string) => FINDS.findIndex((f) => f?.key === key);
export const defaultWorld = (seed: number, planet: PlanetId, found: number[]) => generate(seed, planet, { found });
setDefaultWorld(defaultWorld);
export { ORE_IDS, oreOnPlanet, LIFT_X };
