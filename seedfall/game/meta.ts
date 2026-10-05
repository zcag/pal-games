// Meta: research and modules, rigs and the silo, data, achievements, the collection log, records, prestige (the lance,
// shards, perks, Seed age, planets), offline progress, the daily hooks (market board, supply crate, rested), Ines'
// orders, the guards, the townspeople's lines and story beats, the suggestion card and the next goal.
import { STATS, type PlanetId, type Stat, type WorldData } from "./types.ts";
import { hash } from "./rng.ts";
import { worldSeedFor } from "./gen.ts";
import { FINDS, ORE_IDS, JACKPOT_IDS, BIOMES, CHAMBER, CHAMBER_LINE, planetDef, oreOnPlanet, biomeDef, tempAt, ARTIFACT_IDS } from "./content/world.ts";
import {
  GATES, UPGRADES, researchById, LANCE_PARTS, LIFT_SEGMENTS, HEARTSTONE_NEEDED, ACHIEVEMENTS, DATA, PLANET_ECON, SEED_AGE,
  SILO_HOURS, LAB_RATE, STAT_FX, PACE, rigYield, shardsFor, GUARDS, ORDER_MULT, HEAD_START, ITEM_KEYS, ITEMS, type ItemId,
} from "./content/economy.ts";
import { Live } from "./world.ts";
import { freshPod, HW, addCargo } from "./pod.ts";
import type { Game, GameState } from "./game.ts";

export const SAVE_VERSION = 1;

/** Ines' orders (R10): count (n pieces of an ore), purity (no pieces of an ore, at least half a bay), depth (n pieces of tier >= t). */
export interface Order { id: string; kind: "count" | "purity" | "depth"; find: number; n: number; tier?: number; mult: number; text: string; done?: boolean }
export interface OfflineCard { away: number; counted: number; cap: number; cash: number; data: number; full: boolean }
export interface Log {
  finds: Record<number, { n: number; row: number; t: number }>;
  caches: Record<string, number>;
  places: string[];
  life: string[];
  planets: string[];
  read: number[];
  /** Biome slots whose ore set is complete on some planet: their ore sells +10% everywhere. */
  sets: number[];
  mineThread: boolean;
  wrenLamp: boolean;
}
export interface Records { deepest: Record<string, number>; richestHaul: number; longestDive: number; fastestCore: number; launches: number }
export interface Stats { jackpots: number; relics: number; ingots: number; overcharged: number; blastTiles: number; wrecks: number; tows: number; lastBuy: number }
export interface Suggestion { kind: "upgrade" | "lift" | "lance"; id: string; stat?: Stat; level: number; cost: number; name: string; why: string }
export type Goal =
  | { kind: "biome"; slot: number; name: string; row: number; gates: { stat: Stat | "lift"; have: number; need: number; cost: number }[]; total: number; open: boolean; about?: number }
  | { kind: "lance"; parts: { id: string; name: string; price: number; owned: boolean }[]; heartstone: number; need: number; ready: boolean };

export function freshState(seed: number, planet: PlanetId): GameState {
  const levels = Object.fromEntries(STATS.map((s) => [s, 0])) as Record<Stat, number>;
  const items = Object.fromEntries(ITEM_KEYS.map((k) => [k, 0])) as Record<ItemId, number>;
  return {
    v: SAVE_VERSION, seed, planet, launches: 0, worldSeed: 0, worldFound: [], time: 0, runStart: 0,
    cash: 0, data: 0, shards: 0, earned: 0, levels, research: [], modules: [], unlocked: [], fungalSlot: false, perks: {},
    memory: 0, memoryRate: 0, ordersFilled: 0, divesAtBuy: 0, bandOre: [], mark: null,
    prevIn: { left: false, right: false, up: false, down: false }, warns: {}, boughtHere: [],
    lift: 0, lance: [], plans: false, reached: 0, everReached: 0, deepest: 0, biome: 0, diving: false, dives: 0,
    diveStart: 0, diveItems: 0, diveRecord: false, docked: true, rigs: [0, 0, 0, 0, 0, 0, 0], silo: 0, lab: 0,
    loadout: items, service: { sell: true, fuel: true, repair: true, restock: true },
    orders: [], ordersDocks: 0, orderSeq: 0, day: 0, tz: 0, supplyDay: 0, rested: 0, brokeAt: -1e9, lastNow: 0, offline: null,
    fees: 0, hauls: [], freeTow: false, cleanRun: true, scanCd: 0, pockets: [],
    log: { finds: {}, caches: {}, places: [], life: [], planets: [], read: [], sets: [], mineThread: false, wrenLamp: false },
    achievements: [], records: { deepest: {}, richestHaul: 0, longestDive: 0, fastestCore: 0, launches: 0 },
    stats: { jackpots: 0, relics: 0, ingots: 0, overcharged: 0, blastTiles: 0, wrecks: 0, tows: 0, lastBuy: 0 },
    heard: {}, rand: 0, launch: null, liftCarY: 0,
    pod: freshPod(28, -HW),
  };
}

// ---------------------------------------------------------------- value, rigs, data

/** What scales every sale: Seed age, Market Contacts, Assay (rigs sell at the same rate as ore). */
export const valueMult = (g: Game) =>
  Math.pow(SEED_AGE.value, Math.min(g.s.launches, (SEED_AGE as { cap?: number }).cap ?? Infinity)) * Math.pow(1.25, g.s.perks.contacts ?? 0) * (g.has("G2") ? 1.2 : 1);
export function rigsPerMin(g: Game) {
  let y = 0;
  for (let b = 0; b < 7; b++) y += rigYield(b, g.s.rigs[b] ?? 0);
  if (!y) return 0;
  return y * (g.has("A2") ? 1.5 : 1) * (1 + 0.25 * (g.s.perks.crews ?? 0)) * valueMult(g);
}
/** The heat frontier: the deepest row the radiator covers before the first hotter row (D2, R6). */
export function frontierRow(g: Game) {
  const R = STAT_FX.radiator(g.s.levels.radiator);
  for (let y = 0; y < 770; y++) if (tempAt(y, g.s.planet) > R) return y - 1;
  return 769;
}
/** Data multiplier (the log's Life page: +10% from every source). */
export const dataMult = (g: Game) => (g.s.log.life.length >= 16 ? 1.1 : 1);
const addData = (g: Game, n: number) => { g.s.data += n * dataMult(g); };

// ---------------------------------------------------------------- the log and finds

export function logFind(g: Game, find: number, n: number, row: number) {
  const s = g.s, f = FINDS[find];
  let rec = s.log.finds[find];
  if (!rec) {
    rec = s.log.finds[find] = { n: 0, row, t: s.time };
    if (f.kind === "ore") addData(g, DATA.firstOre(f.tier));
    if (f.kind === "ore" && f.glow) achieve(g, "glow");
    // a biome's ore set complete (on this planet): its ore sells +10% on every planet
    if (f.kind === "ore" && !s.log.sets.includes(f.biome)) {
      const set = ORE_IDS.filter((id) => FINDS[id].biome === f.biome && oreOnPlanet(id, s.planet));
      if (set.every((id) => s.log.finds[id])) { s.log.sets.push(f.biome); g.emit({ t: "toast", text: `${biomeDef(s.planet, f.biome).name}: every ore found. They sell for 10% more.`, tone: "good" }); }
    }
    if (f.kind === "jackpot" && JACKPOT_IDS.every((id) => s.log.finds[id])) { s.shards += 5; g.emit({ t: "toast", text: "Every jackpot found: +5 shards.", tone: "good" }); }
  }
  rec.n += n;
  if (f.kind === "jackpot") { s.stats.jackpots++; addData(g, DATA.jackpot); if (s.stats.jackpots >= 3) achieve(g, "lucky"); }
}
/** A cache opened: the first of each kind pays 10 data, and Sower coffers 10 data each (progression 9, 11). */
export function logCache(g: Game, theme: string) {
  const c = g.s.log.caches;
  if (!c[theme]) addData(g, DATA.cacheKind);
  if (theme === "coffer") addData(g, DATA.coffer);
  c[theme] = (c[theme] ?? 0) + 1;
}
export function seeLife(g: Game, key: string) { if (!g.s.log.life.includes(key)) g.s.log.life.push(key); }
export function visitPlaces(g: Game) {
  const p = g.pod, log = g.s.log;
  for (const st of g.live.w.structures) {
    if (log.places.includes(st.kind)) continue;
    if (p.x >= st.x && p.x <= st.x + st.w && p.y >= st.y && p.y <= st.y + st.h) log.places.push(st.kind);
  }
}

/** Sefa reads a relic carried to the surface (world.md 5): data, the log, and threads' rewards. */
export function readRelic(g: Game, a: number) {
  const s = g.s, f = FINDS[a];
  if (s.log.read.includes(a)) return;
  s.log.read.push(a);
  s.stats.relics++;
  addData(g, DATA.relic(f.biome, f.planet ?? "vell"));
  g.emit({ t: "toast", text: `Sefa reads the ${f.name.toLowerCase()}.`, tone: "quiet" });
  const done = (keys: string[]) => keys.every((k) => s.log.read.some((id) => FINDS[id].key === k));
  if (!s.log.mineThread && done(["A1", "A2", "A3"])) { s.log.mineThread = true; g.emit({ t: "toast", text: "The old mine's story is told: +1 carry on every item.", tone: "good" }); }
  if (!s.log.wrenLamp && done(["A3", "A6", "A9", "A12", "A17", "A19"])) {
    s.log.wrenLamp = true;
    achieve(g, "wrens_path");
    g.refreshStats(false);
    g.emit({ t: "toast", text: "Wren's lamp: your lamp shines one level brighter, every run.", tone: "good" });
  }
  if (s.stats.relics >= 10) achieve(g, "archivist");
  if (s.reached >= 1) achieve(g, "old_mine");
}

// ---------------------------------------------------------------- biomes reached and story beats

export function reachBiome(g: Game, slot: number) {
  const s = g.s;
  if (slot <= s.reached) return;
  for (let b = s.reached + 1; b <= slot; b++) {
    s.reached = b;
    s.everReached = Math.max(s.everReached, b);
    if (b <= 6) {
      addData(g, DATA.biome(b));
      const def = biomeDef(s.planet, b);
      if (!s.log.places.includes(def.key)) s.log.places.push(def.key);
      g.emit({ t: "toast", text: def.line, tone: "quiet" });
      const kept = s.perks.keptrigs ?? 0;
      if (kept) s.rigs[b] = Math.max(s.rigs[b] ?? 0, kept);
    } else {
      if (!s.log.places.includes("chamber")) s.log.places.push("chamber");
      g.emit({ t: "toast", text: CHAMBER_LINE, tone: "quiet" });
    }
    if (b === 3 && !s.fungalSlot) { s.fungalSlot = true; g.emit({ t: "toast", text: "Bram: \"Room for one more module. Come and see me.\"", tone: "good" }); }
    if (b === 6 && !s.plans) {
      s.plans = true; // R6: the lance plans are free on first reaching the Core
      g.emit({ t: "toast", text: "Sefa: \"The lance plans. Ida has the site ready.\"", tone: "good" });
      if (!s.records.fastestCore || s.time - s.runStart < s.records.fastestCore) s.records.fastestCore = s.time - s.runStart;
    }
    const ach: Record<number, string> = { 1: "under_grass", 3: "into_dark", 4: "hot_feet", 5: "straight_walls", 6: "heartbeat", 7: "there_it_is" };
    if (ach[b]) achieve(g, ach[b]);
    if (b === 4 && s.cleanRun) achieve(g, "clean_run");
    if (b === 7 && s.levels.cargo < 5) achieve(g, "light_load");
  }
}

// ---------------------------------------------------------------- achievements

export function achieve(g: Game, id: string) {
  const s = g.s;
  if (s.achievements.includes(id)) return;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return;
  s.achievements.push(id);
  addData(g, a.data);
  if (a.shards) s.shards += a.shards;
  g.emit({ t: "achievement", id });
}
export function checkAchievements(g: Game) {
  const s = g.s, st = s.stats;
  if (s.rigs.every((l) => l > 0)) achieve(g, "rig_boss");
  if (s.rigs.some((l) => l >= 10)) achieve(g, "fully_rigged");
  if (st.ingots >= 100) achieve(g, "smith");
  if (st.overcharged >= 50) achieve(g, "overcharged");
  if (st.blastTiles >= 200) achieve(g, "demolition");
  if (s.launches >= 10) achieve(g, "old_seed");
  if (s.log.planets.length >= 3) achieve(g, "tourist");
  if (s.ordersFilled >= 25) achieve(g, "regular");
}
/** Full House: every slot filled by tier 6+ ore at a dock. */
export function fullHouse(g: Game) {
  const p = g.pod;
  let n = 0;
  for (const k in p.cargo) { if (FINDS[+k].tier < 6) return; n += p.cargo[k]; }
  for (const k in p.ingots) { if (FINDS[+k].tier < 6) return; n += p.ingots[k]; }
  if (n >= p.cargoMax) achieve(g, "full_house");
}

// ---------------------------------------------------------------- research and modules

export function researchOpen(g: Game, id: string): true | string {
  const r = researchById(id);
  if (!r) return "No such research.";
  if (r.biome !== undefined && g.s.everReached < r.biome) return `Opens once you reach ${BIOMES[r.biome].name}.`;
  if (r.launches !== undefined && g.s.launches < r.launches) return r.launches > 1 ? `Opens after ${r.launches} launches.` : "Opens after a launch.";
  if (r.planet && g.s.planet !== r.planet) return "Research it on its planet.";
  return true;
}

/** Does buying level L change the pod's look? (progression's gate-aligned tiers, R12/D20.) */
export function tierUp(stat: Stat, L: number) {
  const tiers: Record<Stat, number[]> = {
    drill: [2, 5, 8, 11, 14, 17, 20], radiator: [4, 8, 12, 16, 20], hull: [3, 6, 9, 12, 15, 18], engine: [5, 10, 15, 20],
    tank: [4, 8, 12, 16], cargo: [5, 10, 15, 20], lamp: [4, 8, 12], scanner: [1, 4, 8],
  };
  return tiers[stat].includes(L);
}

// ---------------------------------------------------------------- the suggestion card and the next goal (R7: gates only)

const nextSlot = (g: Game) => Math.min(7, g.s.reached + 1);
const slotName = (g: Game, slot: number) => (slot >= 7 ? "the chamber" : biomeDef(g.s.planet, slot).name);
const GATE_STATS = ["drill", "hull", "radiator"] as const;

/** The gates of the next step down: the next biome's entry drill, hull and radiator, and the Lift segment on sale. */
export function stepGates(g: Game) {
  const s = g.s, next = nextSlot(g);
  const gate = { ...GATES[next] };
  if (next === 7 && g.moduleOn("heatsink")) gate.radiator -= 1; // L17 with Heat Sink reaches the Seed
  // the radiator that clears every row down to the next biome's top on this planet (Cinder's heat counts)
  if (next < 7) {
    const top = biomeDef(s.planet, next).rows[0];
    let hot = 0;
    for (let y = 0; y <= top; y++) hot = Math.max(hot, tempAt(y, s.planet));
    gate.radiator = Math.max(0, Math.ceil((hot - 120) / 20 - 1e-9));
  }
  const out: { stat: Stat | "lift"; have: number; need: number; cost: number }[] = [];
  for (const st of GATE_STATS) {
    const need = Math.min(gate[st], g.upgradeCap(st));
    if (need <= 0) continue;
    let cost = 0;
    for (let L = s.levels[st]; L < need; L++) cost += Math.round(UPGRADES[st].base * Math.pow(UPGRADES[st].growth, L) * (1 - 0.06 * (s.perks.engineer ?? 0)));
    out.push({ stat: st, have: s.levels[st], need, cost });
  }
  if (g.liftOnSale()) out.push({ stat: "lift", have: s.lift, need: s.lift + 1, cost: g.liftPrice() });
  return { next, out };
}

/**
 * The suggestion card (progression 15, R7): the cheapest missing gate of the next step down (drill, hull, radiator
 * level or Lift segment); in the Core a lance part when it is cheaper; at the chamber the lance first; otherwise the
 * best-payback comfort level. Never a module.
 */
export function suggestion(g: Game): Suggestion | null {
  const s = g.s;
  const { next, out } = stepGates(g);
  // one level of a stat per dock: a stat bought since docking is not suggested again (B can't chain it)
  const fresh = (st: string) => !s.boughtHere.includes(st);
  const missing = stalled(g) ? [] : out.filter((x) => x.have < x.need && fresh(String(x.stat)));
  const part = s.plans ? LANCE_PARTS.find((l) => !s.lance.includes(l.id)) : undefined;
  const lance = part ? { kind: "lance" as const, id: part.id, level: s.lance.length + 1, cost: g.lancePrice(part.id), name: part.name, why: "A part of the Core Lance, to wake the Seed." } : null;
  if (lance && s.reached >= 7) return lance;
  let best: Suggestion | null = null;
  const met = out.filter((x) => x.have >= x.need).length;
  for (const m of missing) {
    const sg: Suggestion = m.stat === "lift"
      ? { kind: "lift", id: "lift", level: s.lift + 1, cost: m.cost, name: `Lift: ${LIFT_SEGMENTS[s.lift].name}`, why: `Rides ${LIFT_SEGMENTS[s.lift].end - LIFT_SEGMENTS[s.lift].top} rows down for free. ${met} of ${out.length} for ${slotName(g, next)}.` }
      : { kind: "upgrade", id: m.stat, stat: m.stat, level: s.levels[m.stat] + 1, cost: g.upgradePrice(m.stat), name: `${UPGRADES[m.stat].name} ${s.levels[m.stat] + 1}`, why: `${UPGRADES[m.stat].text} ${met} of ${out.length} for ${slotName(g, next)}.` };
    if (!best || sg.cost < best.cost) best = sg;
  }
  if (lance && (!best || lance.cost < best.cost)) return lance;
  if (best) return best;
  // nothing gates the next step: the best payback, approximated as price over a stat's weight in $/min
  // (the drill counts most while it is under the next biome's pace level: it speeds every tile)
  const weight: Partial<Record<Stat, number>> = { drill: s.levels.drill < PACE[Math.min(6, next)] ? 3 : 0, cargo: 1.5, tank: 1, engine: 1 };
  let comfort: Suggestion | null = null, score = Infinity;
  for (const st of ["drill", "cargo", "tank", "engine"] as const) {
    if (!weight[st] || s.levels[st] >= g.upgradeCap(st) || !fresh(st)) continue;
    const c = g.upgradePrice(st);
    if (c / weight[st]! < score) { score = c / weight[st]!; comfort = { kind: "upgrade", id: st, stat: st, level: s.levels[st] + 1, cost: c, name: `${UPGRADES[st].name} ${s.levels[st] + 1}`, why: UPGRADES[st].text }; }
  }
  return comfort;
}

export function nextGoal(g: Game): Goal {
  const s = g.s;
  if (s.reached >= 7) {
    const hs = FINDS.findIndex((f) => f?.key === "heartstone");
    const have = g.pod.cargo[hs] ?? 0;
    const parts = LANCE_PARTS.map((l) => ({ id: l.id, name: l.name, price: g.lancePrice(l.id), owned: s.lance.includes(l.id) }));
    return { kind: "lance", parts, heartstone: have, need: HEARTSTONE_NEEDED, ready: parts.every((x) => x.owned) && have >= HEARTSTONE_NEEDED };
  }
  const { next, out } = stepGates(g);
  const gates = out.filter((x) => x.stat !== "lift" || x.have < x.need);
  const total = gates.reduce((a, x) => a + (x.have < x.need ? x.cost : 0), 0);
  const row = next >= 7 ? 750 : biomeDef(s.planet, next).rows[0];
  const goal: Goal = { kind: "biome", slot: next, name: slotName(g, next), row, gates, total, open: gates.every((x) => x.stat === "lift" || x.have >= x.need) };
  if (stalled(g)) goal.about = aboutDives(g, total);
  return goal;
}

// ---------------------------------------------------------------- daily hooks (progression 10): market board, supply crate, rested

const boardCache = new WeakMap<Game, { key: string; ores: Map<number, number> }>();
/** Today's market board: 2 ores from reached biomes sell x1.5 and x2. Seeded from the save and the local day. */
export function boardMult(g: Game, find: number) {
  const s = g.s;
  if (!s.day) return 1;
  const key = `${s.day}:${s.reached}:${s.planet}`;
  let b = boardCache.get(g);
  if (!b || b.key !== key) {
    const pool = ORE_IDS.filter((id) => oreOnPlanet(id, s.planet) && FINDS[id].biome <= Math.min(6, s.reached));
    const ores = new Map<number, number>();
    for (const [k, m] of [[0, 1.5], [1, 2]] as const) {
      for (let t = 0; t < 8 && pool.length; t++) {
        const id = pool[Math.floor(hash(s.seed, s.day, k, t) * pool.length)];
        if (!ores.has(id)) { ores.set(id, m); break; }
      }
    }
    b = { key, ores };
    boardCache.set(g, b);
  }
  return b.ores.get(find) ?? 1;
}
export function board(g: Game) {
  const out: { find: number; mult: number }[] = [];
  for (const id of ORE_IDS) { const m = boardMult(g, id); if (m > 1) out.push({ find: id, mult: m }); }
  return out;
}
export function newDay(_g: Game) { /* the board is derived from the day; nothing to roll */ }
export function supplyCrate(g: Game) {
  const s = g.s, p = g.pod;
  if (!s.day || s.supplyDay === s.day) return;
  s.supplyDay = s.day;
  for (const id of ["fuel", "repair", "dynamite"] as ItemId[]) if (g.itemOpen(id) && p.items[id] < g.carry(id)) p.items[id]++;
  g.emit({ t: "toast", text: "Pell left a supply crate on the pad.", tone: "good" });
}
export function setClock(g: Game, now: number, tz: number) {
  const s = g.s;
  s.tz = tz;
  const day = Math.floor((now - tz * 60000) / 86400000);
  if (day > s.day) s.day = day;
  if (!s.lastNow) s.lastNow = now;
}

// ---------------------------------------------------------------- offline (progression 7)

export const siloHours = (g: Game) =>
  (g.has("A4") ? SILO_HOURS.deep : g.has("A1") ? SILO_HOURS.silo : SILO_HOURS.base) + SILO_HOURS.perPerk * (g.s.perks.widersilo ?? 0);

/** Offline progress up to `now`: rigs fill the silo and the lab trickles data, both capped by the silo's hours. */
export function applyOffline(g: Game, now: number, tz: number): OfflineCard | null {
  const s = g.s;
  const last = s.lastNow;
  setClock(g, now, tz);
  s.lastNow = now;
  if (!last) return null;
  const away = Math.max(0, (now - last) / 1000); // a clock set backwards counts as 0
  const cap = siloHours(g) * 3600;
  const counted = Math.min(away, cap);
  const cash = (rigsPerMin(g) * counted) / 60;
  const data = (s.lab * LAB_RATE * (g.has("A4") ? 1 : 0.5) * counted) / 60;
  s.silo += cash;
  s.data += data;
  if (away >= GUARDS.restedAway) s.rested = GUARDS.restedDives;
  if (away < 300 || (cash <= 0 && data <= 0)) return null;
  const card: OfflineCard = { away, counted, cap, cash, data, full: away > cap && cash > 0 };
  if (s.offline) { card.cash += s.offline.cash; card.data += s.offline.data; card.full ||= s.offline.full; }
  s.offline = card;
  return card;
}

// ---------------------------------------------------------------- Ines' orders (R10)

export function makeOrders(s: GameState, world: WorldData): Order[] {
  const out: Order[] = [];
  const top = Math.min(6, s.reached);
  const pool = ORE_IDS.filter((id) => oreOnPlanet(id, world.planet) && FINDS[id].biome <= top);
  if (!pool.length) return out;
  const r = (k: number) => hash(s.seed, s.orderSeq, k, 31);
  const ledger = s.research.includes("K1");
  const bay = 8 + 4 * s.levels.cargo;
  // weighted to the frontier: the deepest biome reached (and the one above it)
  const near = pool.filter((id) => FINDS[id].biome >= top - 1);
  const front = pool.filter((id) => FINDS[id].biome === top);
  const kinds: Order["kind"][] = ["count", "purity", "depth"];
  const first = Math.floor(r(0) * 3);
  for (let k = 0; k < (ledger ? 3 : GUARDS.orders); k++) {
    const kind = kinds[(first + k) % 3], id = `o${s.orderSeq}${"abc"[k]}`;
    if (kind === "count") {
      const ore = near[Math.floor(r(1) * near.length)];
      const share = 1 / Math.max(1, near.filter((o) => FINDS[o].biome === FINDS[ore].biome).length);
      const n = Math.max(4, Math.round(0.3 * share * bay * 2));
      out.push({ id, kind, find: ore, n, mult: ORDER_MULT.count, text: `${n} ${FINDS[ore].name} in one haul: x1.6 on them.` });
    } else if (kind === "purity") {
      const band = front.length ? front : near;
      const cheap = band.reduce((a, b) => (FINDS[b].tier < FINDS[a].tier || (FINDS[b].tier === FINDS[a].tier && FINDS[b].mass > FINDS[a].mass) ? b : a));
      out.push({ id, kind, find: cheap, n: 0, mult: ORDER_MULT.purity, text: `A haul of at least half a bay with no ${FINDS[cheap].name}: +20%.` });
    } else {
      // never met by any few pieces: above the lowest tier on offer, and at least 4 of them (QA feel 4)
      const tiers = pool.map((o) => FINDS[o].tier);
      const tier = Math.max(Math.min(...tiers) + 1, Math.max(...near.map((o) => FINDS[o].tier)) - 1);
      const n = Math.max(4, Math.round(0.4 * bay));
      out.push({ id, kind, find: 0, n, tier, mult: ORDER_MULT.depth, text: `A haul of ${n} pieces of tier ${tier} or better: +15%.` });
    }
  }
  s.orderSeq++;
  return out;
}

/**
 * Fill Ines' orders on a sale (R10): bonuses folded into the sale's lines (a count order on its ore's line, a haul
 * order spread over the haul), each capped at 25% of the haul it pays on; +5 data each. Returns the filled ids.
 */
export function applyOrders(g: Game, lines: { find: number; count: number; value: number }[]): number {
  const s = g.s, done: string[] = [];
  let total = 0;
  const haul = lines.reduce((a, l) => a + l.value, 0);
  const pieces = lines.reduce((a, l) => a + l.count, 0);
  const cap = GUARDS.orderCap * haul;
  for (const o of s.orders) {
    if (o.done) continue;
    let bonus = 0;
    if (o.kind === "count") {
      const line = lines.find((l) => l.find === o.find);
      if (line && line.count >= o.n) { bonus = Math.min(cap, (o.mult - 1) * line.value); line.value += bonus; }
    } else {
      const ok = o.kind === "purity"
        ? !lines.some((l) => l.find === o.find) && pieces >= g.cargoMax() / 2
        : lines.filter((l) => FINDS[l.find].tier >= (o.tier ?? 0)).reduce((a, l) => a + l.count, 0) >= o.n;
      if (ok && haul > 0) {
        bonus = Math.min(cap, (o.mult - 1) * haul);
        for (const l of lines) l.value += (bonus * l.value) / haul;
      }
    }
    if (bonus > 0) { total += bonus; o.done = true; done.push(o.id); s.ordersFilled++; addData(g, DATA.order); g.emit({ t: "order", id: o.id, done: true }); }
  }
  const every = s.research.includes("K1") ? 2 : GUARDS.ordersEvery;
  if (++s.ordersDocks >= every || !s.orders.length) { s.ordersDocks = 0; s.orders = makeOrders(s, g.live.w); }
  return total;
}

// ---------------------------------------------------------------- guards

/** The struggle guard: 3 hauls in a row under half the last-5 average make the next tow free. */
/** The stall guard: no purchase in 3 dives or 8 minutes switches the card to the best payback. */
export const stalled = (g: Game) => g.s.dives - g.s.divesAtBuy >= STALL.dives || g.s.time - g.s.stats.lastBuy >= STALL.seconds;
const STALL = { dives: 3, seconds: 480 };
/** About how many dives (at the last hauls' average) until `cost` is affordable. */
export function aboutDives(g: Game, cost: number) {
  const h = g.s.hauls, avg = h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0;
  const left = cost - g.s.cash;
  return left <= 0 ? 0 : avg > 0 ? Math.ceil(left / avg) : Infinity;
}

/** Ore tiles per 10-row band of a world (the thin-ore guard's baseline). */
export function bandOre(w: WorldData): number[] {
  const out = new Array(78).fill(0);
  for (let i = 0; i < w.find.length; i++) if (w.find[i] && FINDS[w.find[i]].kind === "ore") out[Math.floor(i / 48 / 10)]++;
  return out;
}
/** The thin-ore guard (progression 12): every reached band under a third of its starting ore while a gate is unaffordable. */
export function thinOre(g: Game) {
  const s = g.s;
  if (!s.bandOre.length || s.deepest < 10) return false;
  const sg = suggestion(g);
  if (!sg || sg.cost <= s.cash) return false;
  const now = bandOre(g.live.w);
  for (let b = 0; b <= Math.floor(s.deepest / 10); b++) if (s.bandOre[b] > 0 && now[b] >= s.bandOre[b] / 3) return false;
  return true;
}
/** The depot marks the best unmined vein in reach on the map: the most valuable ore tile above the deepest row. */
export function markVein(g: Game) {
  const s = g.s, w = g.live.w;
  let best: { x: number; y: number; find: number } | null = null, bv = 0;
  for (let y = 0; y <= Math.min(769, s.deepest + 10); y++) for (let x = 1; x < 47; x++) {
    const f = w.find[y * 48 + x];
    if (!f || FINDS[f].kind !== "ore") continue;
    const v = g.pieceValue(f);
    if (v > bv) { bv = v; best = { x, y, find: f }; }
  }
  if (best && (!s.mark || s.mark.x !== best.x || s.mark.y !== best.y)) g.emit({ t: "toast", text: `Ines marked a ${FINDS[best.find].name} vein on your map.`, tone: "good" });
  s.mark = best;
}

export function struggle(g: Game, _sales: number) {
  const h = g.s.hauls;
  if (h.length < 5) return;
  const avg = h.reduce((a, b) => a + b, 0) / h.length;
  if (h.slice(-3).every((x) => x < 0.5 * avg)) g.s.freeTow = true;
}

// ---------------------------------------------------------------- the townspeople (world.md 1)

const LINES: Record<string, { who: string; lines: { at: number; text: string }[] }> = {
  fuel: { who: "Mo", lines: [
    { at: 0, text: "Fill her up. Don't come back empty." },
    { at: 1, text: "Ten litres, twelve, fourteen. You're burning more down there." },
    { at: 3, text: "Magma, they say. Bring the big tank." },
    { at: 5, text: "I don't ask what's down there. I count the litres." },
  ] },
  market: { who: "Ines", lines: [
    { at: 0, text: "Copper's copper. Bring me something that glows." },
    { at: 2, text: "Now that glows. Fine. I'm impressed." },
    { at: 4, text: "Where did you find this? Never mind. I don't want to know." },
    { at: 6, text: "Nobody has ever sold me anything like this." },
  ] },
  workshop: { who: "Bram", lines: [
    { at: 0, text: "Your drill's fine. It's your nerve I worry about." },
    { at: 1, text: "Wren used to say the rock talked back. I thought she meant the drill." },
    { at: 3, text: "Swap the modules here, any time. Free. Don't tell Juno." },
    { at: 5, text: "Those walls are square. Rock doesn't come square." },
  ] },
  supply: { who: "Pell", lines: [
    { at: 0, text: "Charges, patches, fuel cans. Pay first." },
    { at: 3, text: "Coolant's on the left. You'll want it." },
    { at: 5, text: "Take a teleporter. Don't argue." },
  ] },
  lab: { who: "Sefa", lines: [
    { at: 0, text: "Every stone has a story. Bring me the strange ones." },
    { at: 2, text: "These marks repeat. It's a name, I think. Or a count." },
    { at: 5, text: "Six fingers. Every carving. Six." },
  ] },
  rigs: { who: "Juno", lines: [
    { at: 0, text: "Why dig the same hole twice? Let the rigs do it." },
    { at: 2, text: "Rig three found a geode. It was very excited about it." },
    { at: 4, text: "The numbers are good. The numbers are always good." },
  ] },
  launch: { who: "Ida", lines: [
    { at: 0, text: "My sister went down there. I've looked up ever since." },
    { at: 6, text: "The plans say three parts and five heartbeats. Bring them." },
    { at: 7, text: "She found it, didn't she." },
  ] },
};
/** A building's line on opening it: at most one new line per visit, from a pool that grows with depth. */
export function talk(g: Game, building: string): { who: string; text: string } | null {
  const b = LINES[building];
  if (!b) return null;
  const pool = b.lines.filter((l) => l.at <= g.s.reached);
  const h = g.s.heard[building] ?? 0;
  const k = Math.min(h, pool.length - 1);
  if (h < pool.length) g.s.heard[building] = h + 1;
  if (g.s.launches > 0 && building === "launch") return { who: b.who, text: "Wren would have liked to see that." };
  return { who: b.who, text: pool[k].text };
}
export function say(g: Game, building: string, text?: string) {
  if (!text) return;
  g.emit({ t: "toast", text: `${LINES[building]?.who ?? ""}: "${text}"`, tone: "quiet" });
}

// ---------------------------------------------------------------- prestige (D8, R4, R6)

/** The planets Ida offers after a launch: the unlocked ones other than the one just left; Star Charts adds it. */
export function planetChoices(g: Game): PlanetId[] {
  const all = Object.keys(PLANET_ECON) as PlanetId[];
  return all.filter((p) => p !== g.s.planet || g.has("X1"));
}

export function launch(g: Game) {
  const s = g.s, p = g.pod;
  const hs = FINDS.findIndex((f) => f?.key === "heartstone");
  // the lance takes 5 Heartstone: pieces first, then any ingot (5 each)
  let need = HEARTSTONE_NEEDED;
  const take = Math.min(need, p.cargo[hs] ?? 0);
  addCargo(p.cargo, hs, -take); need -= take;
  while (need > 0 && (p.ingots[hs] ?? 0) > 0) { addCargo(p.ingots, hs, -1); addCargo(p.cargo, hs, Math.max(0, 5 - need)); need -= 5; }
  const sowers = s.log.planets.filter((pl) => sowersDone(g, pl as PlanetId)).length;
  const first = !s.log.planets.includes(s.planet);
  const shards = shardsFor(s.earned, s.launches, s.perks.lens ?? 0, first, (g.has("X2") ? 1.2 : 1) * (1 + 0.05 * sowers));
  s.shards += shards;
  s.records.launches++;
  if (first) s.log.planets.push(s.planet);
  s.launch = { t: 0, shards, choices: planetChoices(g), phase: "wake" };
  g.live.add("seed", CHAMBER.cx, CHAMBER.cy, { r: CHAMBER.seedR });
  g.emit({ t: "launch", phase: "wake" });
  achieve(g, "seedfall");
  if (s.time - s.runStart < 1800) achieve(g, "speedrun");
  checkAchievements(g);
}
const sowersDone = (g: Game, planet: PlanetId) =>
  ARTIFACT_IDS.filter((id) => FINDS[id].thread === "sowers" && (FINDS[id].planet ?? "vell") === planet).every((id) => g.s.log.read.includes(id));

/** The launch plays on its own clock (world.md 5): wake, rise up the Lift column, break the surface, the sky, shards,
 * the wash; then Ida's planet choice (choosePlanet works at any phase) and "done". */
export function stepLaunch(g: Game, dt: number) {
  const L = g.s.launch!;
  const t0 = L.t;
  L.t += dt;
  const phases: [number, string][] = [[2, "rise"], [14, "break"], [15.5, "sky"], [17, "shards"], [19, "wash"], [20.5, "choose"]];
  for (const [at, name] of phases) if (t0 < at && L.t >= at) {
    L.phase = name;
    g.emit(name === "shards" ? { t: "launch", phase: name, count: L.shards } : { t: "launch", phase: name });
  }
  const seed = g.live.ents.find((e) => e.kind === "seed");
  if (seed) {
    const k = Math.max(0, Math.min(1, (L.t - 2) / 12));
    seed.y = CHAMBER.cy + (-12 - CHAMBER.cy) * k * k;
    g.pod.y = seed.y + CHAMBER.seedR + HW;
    g.pod.x = g.live.w.spawnX + 0.5;
  }
}

/** Follow the Seed: a new world on the chosen planet; upgrades, cash, rigs and items reset; research, data, shards,
 * perks, the log, achievements and records persist (progression 5). */
export function prestige(g: Game, planet: PlanetId, makeWorld: (seed: number, planet: PlanetId, found: number[]) => WorldData) {
  const s = g.s;
  const E = s.earned;
  s.launches++;
  s.planet = planet;
  s.worldSeed = worldSeedFor(s.seed, planet, s.launches);
  s.worldFound = Object.keys(s.log.finds).map(Number).filter((id) => FINDS[id].kind === "artifact").sort((a, b) => a - b);
  const world = makeWorld(s.worldSeed, planet, s.worldFound);
  g.live = new Live(world);
  for (const st of STATS) s.levels[st] = 0;
  const kit = HEAD_START[s.perks.headstart ?? 0];
  if (kit) {
    s.levels.drill = kit.drill; s.levels.hull = kit.hull; s.levels.tank = kit.tank; s.levels.engine = kit.engine; s.levels.cargo = kit.cargo;
    s.levels.radiator = kit.radiator[planet === "cinder" ? 1 : 0];
  }
  // Seed Memory pays 10% of the last run's E into the silo over the first 30 minutes
  s.cash = 0;
  s.memory = s.perks.memory ? 0.1 * E : 0;
  s.memoryRate = s.memory / GUARDS.memoryOver;
  s.earned = 0;
  // the planet's depth record and the lab (a cash building) reset with the run (QA Q19 decisions)
  s.records.deepest[planet] = 0; s.lab = 0;
  s.lift = 0; s.lance = []; s.plans = false; s.reached = 0; s.deepest = 0; s.biome = 0; s.diving = false; s.dives = 0;
  s.docked = true; s.rigs = [0, 0, 0, 0, 0, 0, 0]; s.silo = 0; s.pockets = []; s.launch = null; s.fees = 0; s.hauls = [];
  s.freeTow = false; s.cleanRun = true; s.runStart = s.time; s.ordersDocks = 0; s.liftCarY = 0; s.rested = 0;
  if (s.perks.keptrigs) s.rigs[0] = s.perks.keptrigs;
  s.pod = freshPod(world.spawnX + 4.5, -HW - 1e-6);
  if (s.perks.pockets) { s.pod.items.fuel = 2; s.pod.items.repair = 2; }
  s.orders = makeOrders(s, world);
  s.bandOre = bandOre(world); s.mark = null; s.divesAtBuy = 0; s.stats.lastBuy = s.time;
  // Head Start rebuilds the Lift to its kit and counts its biomes as reached
  if (kit) {
    for (let k = 0; k < kit.lift; k++) g.live.buildLift(g, LIFT_SEGMENTS[k].top, LIFT_SEGMENTS[k].end);
    s.lift = kit.lift;
    s.reached = s.perks.headstart ?? 0;
    for (let b = 1; b <= s.reached; b++) if (s.perks.keptrigs) s.rigs[b] = s.perks.keptrigs;
  }
  g.refreshStats(true);
  g.homeTick();
  g.emit({ t: "launch", phase: "done" });
  g.emit({ t: "toast", text: `Ida: "${planetDef(planet).name}. Older than ours. Let's see what's left down there."`, tone: "quiet" });
}

export { ITEMS };
