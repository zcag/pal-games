// The UI's one window onto the game. Every screen reads this interface and calls its actions; nothing else in
// src/surface/ui touches the rules. dev/ui.ts implements it with a mock; `gameModel(game)` adapts the real Game.
import type { GameView, PodView, Sale, Stat } from "../../game/types.ts";

export interface Result { ok: boolean; why?: string }

export interface UpgradeRow {
  stat: Stat;
  name: string; // "Drill"
  level: number;
  cap: number;
  /** Price of the next level; null at the cap. */
  cost: number | null;
  /** What it does now and at the next level, in plain numbers ("Digs stone in 0.9 s", "Tank 14 L"). */
  now: string;
  next: string;
  /** The pod part's name at the next tier change, when the next level is one ("Carbide auger"). */
  tier?: string;
  /** A gate for the next biome. */
  gate?: boolean;
  /** Why it can't be bought yet ("Opens at Crystal"); absent when it can. */
  locked?: string;
}

export interface LiftSegment { name: string; rows: [number, number]; built: boolean; cost: number; open: boolean; why?: string }

/** A module: owned ones swap for free; unowned ones show a price once open. */
export interface ModuleCard { id: string; name: string; text: string; owned: boolean; cost?: number; open?: boolean; why?: string }

export interface ItemRow {
  key: string; // fuel, repair, dynamite, charge, teleport, coolant, overcharge
  name: string;
  slot: number; // hotbar key 1..7
  count: number;
  carry: number;
  price: number;
  open: boolean;
  why?: string;
  text: string;
  /** Seconds left of a cooldown (Overcharge), 0 when ready. */
  cooldown?: number;
}

export interface ResearchNode {
  id: string;
  name: string;
  branch: "logistics" | "geology" | "engineering" | "automation" | "market" | "expedition" | "planets";
  /** Column in the tree, left to right. */
  col: number;
  cost: number;
  needs: string[];
  state: "bought" | "open" | "locked";
  text: string;
  why?: string;
  /** The module this node unlocks, if any. */
  module?: string;
}

export interface RigRow {
  biome: number;
  name: string;
  level: number;
  cap: number;
  cost: number | null;
  /** $ per minute now and after the next level. */
  yield: number;
  next: number;
  state: "Running" | "Full" | "Stopped" | "Not built";
  open: boolean;
  why?: string;
}

export interface Silo { fill: number; held: number; capHours: number; open: boolean }

export interface LancePart { id: string; name: string; cost: number; owned: boolean; open: boolean; why?: string }
export interface Perk { id: string; name: string; level: number; cap: number; cost: number | null; text: string }
export interface PlanetChoice { id: string; name: string; text: string; mods: string[]; first: boolean; sky: { zenith: string; horizon: string; sunset: string } }

export interface LaunchState {
  open: boolean; // the launch site has opened (Core reached)
  why?: string;
  parts: LancePart[];
  heart: { have: number; need: number };
  /** Shards the launch would give now. */
  shards: number;
  ready: boolean; // everything in place: dock with the Seed
  carries: string[]; // what carries over
  resets: string[];
  planet: PlanetChoice; // the planet you are on
  planets: PlanetChoice[]; // offered at the next launch
  seedAge: number;
  /** After a launch: the planet choice is waiting. */
  choosing: boolean;
}

/** `biome` tints the cell; `hint` says where to look while it is not found ("Crystal caves, 1,600 m and deeper"). */
export interface LogEntry { id: string; name: string; found: boolean; text: string; count?: number; depth?: number; when?: string; find?: number; icon?: string; biome?: number; hint?: string }
export interface LogPage { id: string; name: string; entries: LogEntry[]; reward: string; done: number }

export interface Achievement { id: string; name: string; text: string; done: boolean; reward: string }

export interface Order { find: number; text: string; bonus: string; have: number; need: number; done: boolean }

export interface Suggestion {
  stat?: Stat;
  label: string; // "Drill 6"
  cost: number;
  text: string; // "Digs crystal 18% faster."
  note: string; // "2 of 4 for Fungal"
  dives?: number; // "in about 2 dives" when short
}

export interface NextBiome { name: string; row: number; gates: { label: string; met: boolean }[]; toGo: number; total: number; open: boolean }

export interface Offline { away: number; cap: number; pieces: number; cash: number; data: number; fullFor: number; hint?: string }

export interface CargoRow { find: number; name: string; count: number; value: number; mass: number; ingot?: boolean }

export interface Settings { master: number; music: number; effects: number; muted: boolean }

export interface Market { find: number; mult: number }

export interface Records { deepest: number; bestHaul: number; launches: number; lastHaul: number; perMin: number }

/** Everything the UI reads, refreshed by reading the getters each frame or render. */
export interface UiModel {
  view: GameView;
  cash: number;
  data: number;
  shards: number;
  /** Deepest biome slot reached this run (0..6). */
  reached: number;
  /** Biome name per slot for the planet in play (7 entries). */
  biomes: string[];
  records: Records;
  goal: string;
  suggestion: Suggestion | null;
  next: NextBiome | null;
  upgrades: UpgradeRow[];
  lift: LiftSegment[];
  modules: { slots: number; equipped: (string | null)[]; cards: ModuleCard[]; nextSlot?: string };
  items: ItemRow[];
  tree: ResearchNode[];
  /** Lab building levels that trickle data (progression: 0.5 per min per level). */
  lab: { level: number; cap: number; cost: number | null; rate: number; open: boolean; why?: string };
  rigs: RigRow[];
  silo: Silo;
  launch: LaunchState;
  perks: Perk[];
  log: LogPage[];
  achievements: Achievement[];
  orders: Order[];
  market: Market[];
  /** Ines' price per piece for each ore reached (board multipliers applied). */
  prices: { find: number; price: number }[];
  /** The depot's automatic service, each a toggle (Mo's fuel station). */
  service: { sell: boolean; fuel: boolean; repair: boolean; restock: boolean };
  cargo: CargoRow[];
  settings: Settings;
  /** Unclaimed crate position (wreck or tow), or null. */
  crate: { x: number; y: number } | null;
  /** In the chamber: can the Seed be woken now (E), and if not, why. Null elsewhere. */
  seed: { ok: boolean; why?: string; near: boolean } | null;
  /** Price of a tow right now (one full tank). */
  towFee: number;
  /** First-run facts that retire the onboarding hints (they persist with the save where the rules keep them). */
  tutorial: { dug: boolean; sold: boolean; bought: boolean; entered: boolean };
  /** A first-run hint already learned (kept by the surface's storage). */
  hintDone(id: string): boolean;
  markHint(id: string): void;
  /** Town state: the pod is on the surface. */
  inTown: boolean;
  /** One line from the building's person the first time it opens this visit, or null. */
  line(building: Building): string | null;

  buyUpgrade(stat: Stat): Result;
  buySuggested(): Result;
  buyLift(): Result;
  equip(slot: number, id: string | null): Result;
  buyModule(id: string): Result;
  buyItem(key: string): Result;
  research(id: string): Result;
  buyLab(): Result;
  buildRig(biome: number): Result;
  buyLance(id: string): Result;
  buyPerk(id: string): Result;
  choosePlanet(id: string): Result;
  dump(find: number, all: boolean): Result;
  setService(k: keyof UiModel["service"], on: boolean): void;
  setSettings(s: Partial<Settings>): void;
  resetSave(): void;
  /** Called when the offline card is closed with Collect. */
  collectOffline(): void;
  takeOffline(): Offline | null;
}

export type Building = "workshop" | "supply" | "lab" | "rigs" | "launch" | "market" | "fuel";

export const PEOPLE: Record<Building, string> = {
  workshop: "Bram", supply: "Pell", lab: "Sefa", rigs: "Juno", launch: "Ida", market: "Ines", fuel: "Mo",
};

/** Read-only pod fields the HUD needs, with safe defaults for a missing view. */
export const podOf = (m: UiModel): PodView => m.view.pod;

export type { Sale };

// ---------------------------------------------------------------- plain words for upgrade effects (core-loop's stats)

const TYPICAL = [1.0, 1.9, 3.6, 6.9, 13.0, 24.8, 47.0];
const ROCK = ["soil", "stone", "crystal", "fungal rock", "basalt", "ruins rock", "core rock"];
const SCAN = ["No scanner", "Shows ores", "Shows gas and lava", "Shows loose rock", "Shows ore value", "Pulses on its own", "Lasts twice as long", "Reaches half again as far", "Finds crates and secrets"];
const r1 = (v: number) => (v >= 10 ? Math.round(v).toString() : v.toFixed(1));

/** What a stat does at a level, in plain words and numbers. `biome` is the deepest biome slot reached. */
export function effectText(stat: Stat, L: number, biome: number): string {
  switch (stat) {
    case "drill": {
      const P = 1.25 ** L, H = TYPICAL[Math.min(6, biome)];
      if (H / P <= 2.5) return `Digs ${ROCK[biome]} in ${(0.25 + 0.4 * H / P).toFixed(2)} s`;
      return `${ROCK[biome][0].toUpperCase()}${ROCK[biome].slice(1)} needs drill ${Math.ceil(Math.log(H / 2.5) / Math.log(1.25))}`;
    }
    case "engine": return `Climbs ${Math.round(Math.min(30, 7 + 1.15 * L) * 10)} m/s`;
    case "tank": return `Holds ${r1(10 * 1.2 ** L)} L`;
    case "hull": return `${Math.round(40 * 1.2 ** L)} hull`;
    case "cargo": return `${8 + 4 * L} slots`;
    case "radiator": return `Safe to ${120 + 20 * L} °C`;
    case "lamp": return `Lights ${r1(Math.min(10, 3.5 + 0.5 * L))} tiles`;
    case "scanner": return SCAN[Math.min(8, L)];
  }
}
