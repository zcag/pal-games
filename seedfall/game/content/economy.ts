// Economy content: prices, upgrades, gates, the Lift, items, modules, research, rigs, perks, prestige, achievements,
// orders. The numbers are progression.md's (revised); DESIGN.md's decisions win (R1 tow, R2 Lift, R4 shards and Seed
// age, R6 radiator and lance, R7 modules, R10 rewards, R14 scope, R16 run length). Every number is a bot starting point.
import type { PlanetId, Stat } from "../types.ts";

// ---------------------------------------------------------------- ore prices (D4)

/** Price per piece of an ore of value tier T: 8 x 1.95^(T-1). */
export const orePrice = (tier: number) => 8 * Math.pow(1.95, tier - 1);
/** An ingot (Smelter) is worth 5.5 pieces. */
export const INGOT_MULT = 5.5;

// ---------------------------------------------------------------- fuel and repair

/** $ per litre by the deepest biome slot reached. */
export const fuelPrice = (bDeep: number) => 0.4 * Math.pow(2.2, bDeep);
/** $ per hull point. */
export const repairPrice = (bDeep: number) => 0.4 * fuelPrice(bDeep);

// ---------------------------------------------------------------- stats (core-loop "Stats")

export const STAT_FX = {
  drill: (L: number) => Math.pow(1.25, L), // P
  thrust: (L: number) => 700 * Math.pow(1.12, L),
  climb: (L: number) => Math.min(36, 8 + 1.4 * L), // R2a (fuel per row stays on vref)
  vref: (L: number) => Math.min(14, 7 + 0.35 * L), // the old climb cap: fuel per row
  drive: (L: number) => Math.min(8, 5 + 0.15 * L),
  tank: (L: number) => 10 * Math.pow(1.2, L),
  hull: (L: number) => 40 * Math.pow(1.2, L),
  cargo: (L: number) => 8 + 4 * L,
  radiator: (L: number) => 120 + 20 * L, // R6
  lamp: (L: number) => Math.min(10, 3.5 + 0.5 * L),
  cone: (L: number) => 40 + 1.5 * L,
};

export interface UpgradeDef { stat: Stat; name: string; base: number; growth: number; cap: number; kind: "gate" | "soft" | "comfort"; text: string }
export const UPGRADES: Record<Stat, UpgradeDef> = {
  drill: { stat: "drill", name: "Drill", base: 120, growth: 1.77, cap: 21, kind: "gate", text: "Digs harder rock, faster." },
  radiator: { stat: "radiator", name: "Radiator", base: 1500, growth: 1.38, cap: 20, kind: "gate", text: "The heat line moves deeper." },
  hull: { stat: "hull", name: "Hull", base: 100, growth: 1.8, cap: 16, kind: "soft", text: "Takes more hits." },
  tank: { stat: "tank", name: "Fuel tank", base: 25, growth: 1.5, cap: 18, kind: "soft", text: "Goes deeper and gets back." },
  engine: { stat: "engine", name: "Engine", base: 100, growth: 1.6, cap: 20, kind: "comfort", text: "Climbs faster with a load." },
  cargo: { stat: "cargo", name: "Cargo bay", base: 40, growth: 1.7, cap: 20, kind: "comfort", text: "Four more slots." },
  lamp: { stat: "lamp", name: "Lamp", base: 150, growth: 1.7, cap: 13, kind: "comfort", text: "Sees further in the dark." },
  scanner: { stat: "scanner", name: "Scanner", base: 400, growth: 2.4, cap: 8, kind: "comfort", text: "Each level adds a feature." },
};
/** Cost of buying level L+1 (before Engineer's Notes). */
export const upgradeCost = (stat: Stat, L: number) => Math.round(UPGRADES[stat].base * Math.pow(UPGRADES[stat].growth, L));

/**
 * Gates to enter a biome slot (1..6 = Stone..Core, 7 = the chamber), progression section 3:
 * entry drill (the biome's ore at ratio <= 2.2; the chamber's heartrock ring at 2.5), the hull, and the radiator
 * whose frontier clears the biome's top (Ruins: L12 opens all of it; the chamber: L18, or L17 with Heat Sink).
 */
export const GATES: { drill: number; hull: number; radiator: number }[] = [
  { drill: 0, hull: 0, radiator: 0 },
  { drill: 0, hull: 0, radiator: 0 },
  { drill: 3, hull: 1, radiator: 0 },
  { drill: 6, hull: 5, radiator: 0 },
  { drill: 9, hull: 7, radiator: 4 },
  { drill: 12, hull: 9, radiator: 12 },
  { drill: 15, hull: 11, radiator: 12 },
  { drill: 16, hull: 11, radiator: 18 },
];
/** The pace drill of a biome slot: its dense rock (2.0x) at ratio <= 2.5. */
export const PACE = [0, 2, 5, 8, 11, 14, 17];

// ---------------------------------------------------------------- items (core-loop "Items"; progression section 4)

export type ItemId = "fuel" | "repair" | "dynamite" | "charge" | "teleport" | "coolant";
export const ITEM_KEYS: ItemId[] = ["fuel", "repair", "dynamite", "charge", "teleport", "coolant"];
export interface ItemDef { id: ItemId; key: number; name: string; k: number; carry: number; from: number; text: string }
export const ITEMS: Record<ItemId, ItemDef> = {
  fuel: { id: "fuel", key: 1, name: "Fuel cell", k: 1.5, carry: 3, from: 0, text: "Half a tank, any time." },
  repair: { id: "repair", key: 2, name: "Repair kit", k: 2, carry: 3, from: 0, text: "Patches 40% of the hull." },
  dynamite: { id: "dynamite", key: 3, name: "Dynamite", k: 2, carry: 5, from: 1, text: "Clears a 3x3 of what your drill could dig." },
  charge: { id: "charge", key: 4, name: "Big charge", k: 8, carry: 1, from: 2, text: "A wide blast, one drill level early." },
  teleport: { id: "teleport", key: 5, name: "Teleporter", k: 24, carry: 1, from: 2, text: "Home with the cargo. 30% is lost in the jump." },
  coolant: { id: "coolant", key: 6, name: "Coolant", k: 3, carry: 2, from: 3, text: "Heat to zero, no heat for 20 s." },
};
/** Item unit price by the deepest biome reached: k x $10 x 2.9^b. */
export const itemPrice = (id: ItemId, bDeep: number) => Math.round(ITEMS[id].k * 10 * Math.pow(2.9, bDeep));

// ---------------------------------------------------------------- the Lift (R2b; progression "The Lift")

/** Segments: rows [top, end) of the column, on sale once the `onSale` slot (7 = the chamber) is reached. */
export const LIFT_SEGMENTS = [
  { name: "Topsoil", top: 0, end: 60, onSale: 1, price: 60 },
  { name: "Stone", top: 60, end: 160, onSale: 1, price: 210 },
  { name: "Crystal", top: 160, end: 280, onSale: 3, price: 1500 },
  { name: "Fungal", top: 280, end: 400, onSale: 4, price: 7000 },
  { name: "Magma", top: 400, end: 540, onSale: 5, price: 35000 },
  { name: "Ruins", top: 540, end: 680, onSale: 6, price: 107000 },
  { name: "Core", top: 680, end: 748, onSale: 7, price: 180000 },
];

// ---------------------------------------------------------------- modules (R7; progression section 5)

export type ModuleId = "magnet" | "heatsink" | "afterburner" | "overcharge" | "recycler" | "smelter" | "dense" | "tracer" | "ear" | "drone";
export interface ModuleDef { id: ModuleId; name: string; cost: number; opens: number; text: string }
export const MODULES: Record<ModuleId, ModuleDef> = {
  tracer: { id: "tracer", name: "Vein Tracer", cost: 100, opens: 1, text: "Breaking ore outlines the rest of its vein for 10 s." },
  magnet: { id: "magnet", name: "Magnet Coil", cost: 150, opens: 2, text: "Pulls loose pieces from 3 tiles, and a crate's contents." },
  dense: { id: "dense", name: "Dense Packing", cost: 250, opens: 2, text: "25% more cargo slots." },
  ear: { id: "ear", name: "Prospector's Ear", cost: 300, opens: 2, text: "Relic, jackpot and cache chimes reach 20 tiles." },
  heatsink: { id: "heatsink", name: "Heat Sink", cost: 300, opens: 3, text: "Heat fills 30% slower and cools twice as fast." },
  drone: { id: "drone", name: "Helper Drone", cost: 400, opens: 3, text: "A drone mines an ore tile near the pod every 6 s." },
  smelter: { id: "smelter", name: "Smelter", cost: 450, opens: 3, text: "5 pieces of one ore fuse into an ingot: 1 slot, 5.5x the value." },
  afterburner: { id: "afterburner", name: "Afterburner", cost: 400, opens: 4, text: "Double-tap Up: a 1.5 s burst of climb for 3% of the tank." },
  recycler: { id: "recycler", name: "Fuel Recycler", cost: 500, opens: 4, text: "Drilling burns 40% less fuel." },
  overcharge: { id: "overcharge", name: "Overcharge", cost: 900, opens: 5, text: "Key 7: the next 8 tiles dig at a quarter of the effort." },
};
export const MODULE_IDS = Object.keys(MODULES) as ModuleId[];
/** Slots: 2 at the start, +1 on first reaching Fungal, +1 from Module Rack. */
export const MODULE_SLOTS_BASE = 2;

// ---------------------------------------------------------------- research (progression section 7: 20 nodes)

export interface ResearchDef {
  id: string; name: string; branch: string; cost: number;
  /** Biome slot first reached (any run) that opens it. */
  biome?: number; launches?: number; planet?: PlanetId; text: string;
}
export const RESEARCH: ResearchDef[] = [
  { id: "G1", name: "Ore Sense", branch: "geology", cost: 20, text: "Ore shows one tile beyond the lamp." },
  { id: "G2", name: "Assay", branch: "geology", cost: 150, biome: 1, text: "All ore sells for 20% more." },
  { id: "G3", name: "Deep Survey", branch: "geology", cost: 300, biome: 3, text: "The scanner pulse shows caches and the rich pocket from 40 rows." },
  { id: "G4", name: "Gem Cutting", branch: "geology", cost: 700, biome: 4, text: "Each biome's top ore sells for 50% more." },
  { id: "L1", name: "Head Station", branch: "logistics", cost: 300, biome: 3, text: "The lift head sells, refuels and repairs; B buys the suggested gate there." },
  { id: "L2", name: "Recall Beacon", branch: "logistics", cost: 300, biome: 2, text: "The teleporter jumps in 1.5 s, and you carry one more." },
  { id: "L3", name: "Bandolier", branch: "logistics", cost: 250, biome: 1, text: "Carry 2 more of each item (1 more big charge)." },
  { id: "E1", name: "Momentum", branch: "engineering", cost: 60, biome: 1, text: "Each tile of an unbroken chain digs 8% faster, up to 32%." },
  { id: "E2", name: "Module Rack", branch: "engineering", cost: 450, biome: 3, text: "One more module slot." },
  { id: "E3", name: "Reinforced Frame", branch: "engineering", cost: 300, biome: 4, text: "Hazards do 15% less damage." },
  { id: "E4", name: "Shock Struts", branch: "engineering", cost: 150, biome: 2, text: "Falls and bumps do half the damage." },
  { id: "A1", name: "Silo", branch: "automation", cost: 80, biome: 1, text: "The silo holds 4 hours of rig output." },
  { id: "A2", name: "Rig Foreman", branch: "automation", cost: 400, biome: 2, text: "Rigs yield 50% more." },
  { id: "A3", name: "Rig Scouts", branch: "automation", cost: 600, biome: 3, text: "Rigs at level 5+ find 1 data per 10 minutes." },
  { id: "A4", name: "Deep Silo", branch: "automation", cost: 1200, biome: 4, text: "The silo holds 4 hours more; the lab works offline at full rate." },
  { id: "K1", name: "Ledger", branch: "market", cost: 300, biome: 3, text: "Ines shows 3 orders, refreshed every 2 docks." },
  { id: "X1", name: "Star Charts", branch: "expedition", cost: 600, launches: 1, text: "The launch offer shows each planet in full, and adds the one just left." },
  { id: "X2", name: "Seed Resonance", branch: "expedition", cost: 1000, launches: 2, text: "20% more shards." },
  { id: "P1", name: "Flame Skimmer", branch: "planets", cost: 600, planet: "cinder", text: "The first 2 s of lava contact cost heat, not hull." },
  { id: "P2", name: "Shielded Scanner", branch: "planets", cost: 600, planet: "ferrum", text: "Storms halve the scanner's radius instead of blanking it." },
];
export const researchById = (id: string) => RESEARCH.find((r) => r.id === id);

// ---------------------------------------------------------------- rigs, silo, lab (progression sections 6, 7)

export const RIG_MAX = 10;
/** A rig's level-1 yield per site, $/min (avg piece x pieces per tile). */
export const RIG_BASE = [9.5, 24, 171, 322, 1500, 4700, 18900];
export const rigYield = (b: number, l: number) => (l <= 0 ? 0 : RIG_BASE[b] * Math.pow(1.5, l - 1));
/** Build or upgrade a rig at site b from level l to l+1: 3 x the level-1 yield x 1.65^l. */
export const rigCost = (b: number, l: number) => Math.round(2 * RIG_BASE[b] * Math.pow(1.6, l));
/** Offline cap in hours: base 2, Silo 4, Deep Silo 8, + 2 per Wider Silo. */
export const SILO_HOURS = { base: 2, silo: 4, deep: 8, perPerk: 2 };
export const LAB_LEVELS = [500, 3000, 15000, 80000, 400000];
export const LAB_RATE = 0.5; // data per minute per level
export const LAB_FROM = 2; // the lab opens when Crystal is reached

// ---------------------------------------------------------------- data sources (progression section 7)

export const DATA = {
  firstOre: (tier: number) => 5 * tier,
  relic: (slot: number, planet: PlanetId) => (planet !== "vell" ? 50 : 10 + 10 * Math.max(1, slot)), // 20..70 Stone..Core
  biome: (slot: number) => 25 * slot,
  depthPer100m: 2,
  jackpot: 30,
  cacheKind: 10,
  order: 5,
  coffer: 10,
  scoutsPer10Min: 1,
};

// ---------------------------------------------------------------- prestige (D8, R4, R6)

export const LANCE_PARTS = [
  { id: "frame", name: "Lance frame", price: 70000 },
  { id: "coil", name: "Lance coil", price: 140000 },
  { id: "head", name: "Lance head", price: 230000 },
];
export const HEARTSTONE_NEEDED = 5;
/** Core shards for a launch (R4). E = cash earned this run, n = Seed age, lens = Shard Lens level, mult = other bonuses. */
export function shardsFor(E: number, n: number, lens: number, firstFromPlanet: boolean, mult = 1) {
  // E is taken at Seed age 0's prices: the age's x1.3^n on value would otherwise compound into the shards (a run
  // later in the chain earns more cash for the same work), and shards would explode; the age's own reward is the
  // (1 + 0.2 n), so shards rise about 20% a run
  const En = Math.max(0, E) / Math.pow(SEED_AGE.value, Math.min(n, SEED_AGE.cap ?? n));
  return Math.floor(12 * Math.pow(En / 1e6, 0.6) * (1 + 0.2 * n) * (1 + 0.1 * lens) * mult) + 10 + (firstFromPlanet ? 5 : 0);
}
/** Seed age (R4): value x1.3^n, but only the first `cap` launches count for value (late runs stay a run); hazard
 * damage x1.08^n uncapped. */
export const SEED_AGE: { value: number; hazard: number; cap?: number } = { value: 1.3, hazard: 1.08, cap: 4 };

/** Planet modifiers (progression section 8): value of the planet's own biome's ores, ore mass, gravity. Heat is world's tempAt. */
export interface PlanetEcon { ownValue: number; mass: number; gravity: number }
export const PLANET_ECON: Record<"vell" | "cinder" | "ferrum", PlanetEcon> = {
  vell: { ownValue: 1, mass: 1, gravity: 1 },
  cinder: { ownValue: 1.3, mass: 1, gravity: 1 },
  ferrum: { ownValue: 1.2, mass: 1.3, gravity: 1 },
};
export const planetEcon = (p: PlanetId): PlanetEcon => PLANET_ECON[p as "vell"] ?? PLANET_ECON.vell;

export interface PerkDef { id: string; name: string; max: number; cost: (L: number) => number; text: string }
const fixed = (xs: number[]) => (L: number) => xs[L] ?? Infinity;
export const PERKS: PerkDef[] = [
  { id: "headstart", name: "Head Start", max: 5, cost: fixed([5, 10, 20, 50, 100]), text: "Start each run with the kit for the next biome down." },
  { id: "contacts", name: "Market Contacts", max: 10, cost: (L) => Math.round(8 * Math.pow(1.8, L)), text: "Ore sells for 25% more, compounding." },
  { id: "keptrigs", name: "Kept Rigs", max: 3, cost: fixed([12, 40, 120]), text: "Each rig site restarts at this level when reached." },
  { id: "engineer", name: "Engineer's Notes", max: 5, cost: (L) => Math.round(10 * Math.pow(1.6, L)), text: "Workshop prices 6% lower per level." },
  { id: "prospector", name: "Prospector", max: 3, cost: fixed([15, 45, 135]), text: "8% more ore tiles in each new world." },
  { id: "crews", name: "Rig Crews", max: 3, cost: fixed([20, 60, 180]), text: "Rigs yield 25% more each." },
  { id: "widersilo", name: "Wider Silo", max: 3, cost: fixed([10, 30, 90]), text: "The silo holds 2 hours more." },
  { id: "pockets", name: "Deep Pockets", max: 1, cost: fixed([20]), text: "One more of every item; start with 2 fuel cells and 2 repair kits." },
  { id: "drillmastery", name: "Drill Mastery", max: 2, cost: fixed([30, 90]), text: "The drill goes one level higher." },
  { id: "lens", name: "Shard Lens", max: 5, cost: (L) => Math.round(20 * Math.pow(1.7, L)), text: "10% more shards." },
  { id: "memory", name: "Seed Memory", max: 1, cost: fixed([50]), text: "10% of the last run's earnings, paid into the silo over the first 30 minutes." },
];
export const perkById = (id: string) => PERKS.find((p) => p.id === id);
/** Head Start kits: level k starts at slot k with these levels and Lift segments. */
export const HEAD_START = [
  null,
  { drill: 2, hull: 0, radiator: [0, 0], tank: 2, engine: 1, cargo: 1, lift: 1 },
  { drill: 5, hull: 2, radiator: [0, 0], tank: 4, engine: 3, cargo: 3, lift: 2 },
  { drill: 8, hull: 4, radiator: [0, 1], tank: 6, engine: 5, cargo: 5, lift: 3 },
  { drill: 11, hull: 6, radiator: [5, 7], tank: 8, engine: 8, cargo: 7, lift: 4 },
  { drill: 14, hull: 9, radiator: [12, 12], tank: 10, engine: 11, cargo: 9, lift: 5 },
];

// ---------------------------------------------------------------- achievements (progression section 11)

export interface AchievementDef { id: string; name: string; text: string; data: number; shards?: number }
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_haul", name: "First Haul", text: "Sell a full bay.", data: 10 },
  { id: "under_grass", name: "Under the Grass", text: "Reach row 60.", data: 10 },
  { id: "old_mine", name: "Old Mine", text: "Reach Stone and find a relic.", data: 15 },
  { id: "glow", name: "Glow", text: "Pick up a glowing ore.", data: 15 },
  { id: "into_dark", name: "Into the Dark", text: "Reach the Fungal hollows.", data: 20 },
  { id: "hot_feet", name: "Hot Feet", text: "Reach Magma.", data: 25 },
  { id: "straight_walls", name: "Straight Walls", text: "Reach the Ruins.", data: 30 },
  { id: "heartbeat", name: "Heartbeat", text: "Reach the Core.", data: 40 },
  { id: "there_it_is", name: "There It Is", text: "Reach the chamber.", data: 50 },
  { id: "seedfall", name: "Seedfall", text: "Launch the Seed.", data: 50, shards: 2 },
  { id: "close_call", name: "Close Call", text: "Dock with under 1 litre of fuel.", data: 15 },
  { id: "scrape", name: "Scrape", text: "Dock with under 5% hull.", data: 15 },
  { id: "full_house", name: "Full House", text: "Dock with every slot filled by tier 6+ ore.", data: 25 },
  { id: "deep_breath", name: "Deep Breath", text: "A dive over 4 minutes without an item.", data: 20 },
  { id: "clean_run", name: "Clean Run", text: "Reach Magma with no wreck or tow this run.", data: 30 },
  { id: "rig_boss", name: "Rig Boss", text: "A rig in every biome.", data: 30 },
  { id: "fully_rigged", name: "Fully Rigged", text: "A rig at level 10.", data: 40 },
  { id: "night_shift", name: "Night Shift", text: "Collect a full silo.", data: 15 },
  { id: "lucky", name: "Lucky", text: "Find 3 jackpots.", data: 30 },
  { id: "archivist", name: "Archivist", text: "Read 10 relics.", data: 40 },
  { id: "wrens_path", name: "Wren's Path", text: "Follow Wren to the end.", data: 60 },
  { id: "smith", name: "Smith", text: "Smelt 100 ingots.", data: 30 },
  { id: "overcharged", name: "Overcharged", text: "Break 50 dense tiles with Overcharge.", data: 25 },
  { id: "demolition", name: "Demolition", text: "Clear 200 tiles with explosives.", data: 25 },
  { id: "speedrun", name: "Speedrun", text: "Launch within 30 minutes of a run's start.", data: 50, shards: 3 },
  { id: "tourist", name: "Tourist", text: "Launch from all 3 planets.", data: 50, shards: 5 },
  { id: "old_seed", name: "Old Seed", text: "Reach Seed age 10.", data: 100, shards: 10 },
  { id: "regular", name: "Regular", text: "Fill 25 of Ines' orders.", data: 40 },
  { id: "light_load", name: "Light Load", text: "Reach the chamber with cargo below level 5.", data: 40 },
  { id: "liftwright", name: "Liftwright", text: "Build every Lift segment in one run.", data: 40 },
];

// ---------------------------------------------------------------- rewards and guards (progression sections 9, 12, 14)

export const GUARDS = {
  brokeEvery: 600, // s between "Ida covers it" refuels
  rebuildShare: 0.1, // wreck rebuild fee: 10% of cash, capped at the lost cargo's value
  teleportLoss: 0.3,
  restedAway: 6 * 3600,
  restedDives: 3,
  restedBonus: 1.25,
  orders: 2, ordersEvery: 3, // Ledger: 3 orders every 2 docks
  orderCap: 0.25, // an order's bonus is at most 25% of the haul it pays on
  pocketShare: 0.15, // a rich pocket is trimmed to 15% of the bay
  memoryOver: 1800, // Seed Memory pays over the first 30 minutes
};
export const ORDER_MULT = { count: 1.6, purity: 1.2, depth: 1.15 };
