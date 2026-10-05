// The shared contract between the rules (src/game) and the surface (src/surface).
// Owned by the lead. Changing a type here is announced to every agent; add, don't rename.

// ---------------------------------------------------------------- world grid

/** World size. Column 0 and W-1 are bedrock. Row 0 is the surface row (the first solid row);
 * negative rows are sky. */
export const W = 48;
export const H = 776; // rows 0..775: the core chamber sits at the bottom
export const SKY_ROWS = 14; // rows of sky above row 0 the renderer may draw

/** Layers of the world, one byte per tile, index = y * W + x. */
export interface WorldData {
  seed: number;
  planet: PlanetId;
  /** Material id per tile (0 = air). See content/world.ts MATERIALS. */
  mat: Uint8Array;
  /** What the tile holds: 0 nothing, else a FIND id (ore, jackpot or artifact). See content/world.ts FINDS. */
  find: Uint8Array;
  /** Hazard id per tile (0 none). See HAZ. */
  haz: Uint8Array;
  /** The material a tile was made of before it was dug or flowed into: drawn as the back wall when mat is air or liquid. */
  back: Uint8Array;
  /** Bit flags, see FLAG. */
  flag: Uint8Array;
  /** Biome index per row (0..6), after the boundary jitter; per tile because boundaries wander. */
  biome: Uint8Array;
  /** Liquid amount 0..255 for lava tiles (255 = full tile). */
  fluid: Uint8Array;
  /** Column of the mine mouth (spawn). */
  spawnX: number;
  /** Named structures, for the log, the map and the renderer's decor. */
  structures: Structure[];
  /** Caches placed at generation, with their contents (R10). The tile's material is the cache's material. */
  caches?: CacheSpot[];
}

/** A cache tile and what it holds (world.md section 4). `item` is an item key: fuel, repair, dynamite, coolant, charge. */
export interface CacheSpot { x: number; y: number; kind: string; pieces: { find: number; count: number }[]; item?: string }

export const FLAG = {
  /** The tile was opened by the player or a blast (vs a natural cave). */
  DUG: 1,
  /** Seen in lamp light at least once (map memory). */
  SEEN: 2,
  /** Revealed by a scanner pulse (outline through rock). */
  SCANNED: 4,
  /** Natural open space (cave, room) at generation. */
  CAVE: 8,
  /** Part of a structure (rigs never mine it). */
  STRUCT: 16,
  /** A built lift column (research L2). */
  LIFT: 32,
  /** Part of an unmined rich pocket (R10; the scanner shimmer). */
  RICH: 64,
} as const;

export const HAZ = {
  NONE: 0,
  GAS: 1, // gas pocket inside the tile's rock
  SPORE_VENT: 2, // puffball tile that releases spore clouds
  PYLON: 3, // arc pylon (pairs across a gap)
  FALSE_FLOOR: 4, // brick that crumbles when rested on
  LAVA_POCKET: 5, // the tile above a hidden lava pocket glows at its cracks (tell only)
} as const;

export interface Structure { kind: string; x: number; y: number; w: number; h: number; name?: string }

export type PlanetId = "vell" | "cinder" | "glaze" | "mire" | "hollow" | "ferrum" | "orrery";

// ---------------------------------------------------------------- content shapes

export type MaterialKind = "air" | "soil" | "rock" | "unbreakable" | "liquid" | "loose" | "special";

export interface Material {
  id: number;
  key: string;
  name: string;
  biome: number;
  kind: MaterialKind;
  /** Relative hardness (topsoil loam = 1). Unbreakable: Infinity. */
  hardness: number;
  /** dark, base, base2, light (hex). */
  palette: [string, string, string, string];
  /** Drawing pattern key for the terrain shader (see art.md 3.1). */
  pattern: string;
  /** Sound family for drilling: soft, wet, grit, hard, glass, squish, rumble, chisel, hum. */
  sound: string;
  /** Particle colours come from the palette; shake while drilling, trauma per second. */
  shake: number;
  /** Self-glow (HDR intensity, colour) for materials like crystal lining, lava, core glass. */
  glow?: { color: string; hdr: number; radius: number };
  /** The biome's dense material (R12: 2.0x typical). */
  dense?: boolean;
  /** Drill vibration of the pod sprite while digging, Hz (core-loop "Per-material feel"). */
  vib?: number;
  /** A cache container (R10): its theme key. */
  cache?: string;
}

export type FindKind = "ore" | "jackpot" | "artifact";
export type OreShape = "nugget" | "vein" | "gem" | "cluster" | "orb" | "relic";

export interface Find {
  id: number;
  key: string;
  name: string;
  kind: FindKind;
  biome: number;
  /** Value tier 1..12 (ores); jackpots carry a multiplier of the biome's top ore instead. */
  tier: number;
  /** Multiplier for jackpots (x the biome's top ore price). */
  mult?: number;
  /** Mass per piece in pod mass units (see core-loop.md; world kg / 10 x 1.12^biome). */
  mass: number;
  shape: OreShape;
  /** base, light, glint (hex). */
  colors: [string, string, string];
  glow?: { color: string; hdr: number; radius: number };
  /** Collection log line / artifact text. */
  text: string;
  /** art.md 3.3 shape class (Speck, Vein, Dendrite, Nugget, Band, Block, Spike, Ring, Gem, Orb, Star, Plate, Drop). */
  cls?: string;
  /** Row band where it generates (ores, artifacts with a band). */
  rows?: [number, number];
  /** Only on this planet (unique ores, planet jackpots and relics). */
  planet?: PlanetId;
  /** Story thread of an artifact: mine, wren or sowers. */
  thread?: string;
}

// ---------------------------------------------------------------- input

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Edge-triggered actions for this tick (true only on the tick they were pressed). */
  item?: number; // 1..7
  scan?: boolean;
  dump?: boolean;
  interact?: boolean;
  confirm?: boolean;
}

// ---------------------------------------------------------------- the pod as the surface sees it

export type Stat = "drill" | "engine" | "tank" | "hull" | "cargo" | "radiator" | "lamp" | "scanner";
export const STATS: Stat[] = ["drill", "engine", "tank", "hull", "cargo", "radiator", "lamp", "scanner"];

export interface PodView {
  /** Centre position in tiles (x right, y down; row 0 is the surface row). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  grounded: boolean;
  thrusting: boolean;
  /** Current dig, if any. */
  dig: { x: number; y: number; dir: "left" | "right" | "down"; progress: number; mat: number } | null;
  fuel: number;
  fuelMax: number;
  /** Fuel needed to reach the surface by the cheapest known path; Infinity when sealed in. */
  fuelHome: number;
  hull: number;
  hullMax: number;
  heat: number; // 0..1
  temp: number; // ambient degrees C at the pod
  cargoUsed: number;
  cargoMax: number;
  /** Load factor k_m (1 = empty). */
  load: number;
  /** Seconds left of invulnerability, teleport channel, etc. */
  invuln: number;
  channel: number; // teleport channel progress 0..1 (0 = none)
  dead: boolean;
  stranded: boolean;
  /** Spore-cloud blindness: seconds the lamp stays halved (storms are game.storming() and the storm event). */
  blind?: number;
  /** Lamp radius in tiles (after fuel dimming). */
  lamp?: number;
  /** Fuel burn now, litres per second. */
  burn?: number;
  riding?: boolean;
  /** Items carried by id. */
  items?: Record<string, number>;
  /** Cargo by find id. */
  cargo?: Record<number, number>;
}

// ---------------------------------------------------------------- events (rules -> surface)

export type GameEvent =
  | { t: "dig_start"; x: number; y: number; dir: "left" | "right" | "down"; mat: number; find: number }
  | { t: "dig_cancel"; x: number; y: number }
  | { t: "break"; x: number; y: number; mat: number; find: number; by: "drill" | "blast" | "drone" | "fall" }
  | { t: "too_hard"; x: number; y: number; need: number }
  | { t: "unbreakable"; x: number; y: number }
  | { t: "pickup"; find: number; count: number; x: number; y: number; value: number }
  | { t: "cargo_full"; x: number; y: number }
  | { t: "nugget"; find: number; x: number; y: number } // a piece left lying (bay full / blast)
  | { t: "land"; speed: number; damage: number }
  | { t: "bump"; speed: number; damage: number; axis: "x" | "y" }
  | { t: "damage"; amount: number; source: string; frac: number }
  | { t: "wreck"; x: number; y: number }
  | { t: "rescue"; kind: "wreck" | "tow"; fee: number }
  | { t: "gas_fuse"; x: number; y: number }
  | { t: "explode"; x: number; y: number; r: number; kind: "gas" | "dynamite" | "charge" }
  | { t: "wobble"; x: number; y: number; mat: number }
  | { t: "fall_land"; x: number; y: number; mat: number }
  | { t: "lava_touch" }
  | { t: "spore"; x: number; y: number }
  | { t: "arc"; x1: number; y1: number; x2: number; y2: number; phase: "charge" | "fire" }
  | { t: "pulse" } // the core beats
  | { t: "scan"; x: number; y: number; r: number; passive?: boolean }
  | { t: "item"; item: string; ok: boolean; why?: string }
  | { t: "teleport"; phase: "start" | "cancel" | "done"; lost?: number }
  | { t: "biome"; biome: number; first: boolean }
  | { t: "record"; row: number }
  | { t: "surface" } // crossed up through row 0
  | { t: "dive" } // left the surface
  /** Warning ladder: level 0 clears, 1 amber (heads-up), 2 red (turn back / low), 3 critical (not enough to get home, hull < 10%, heat full). */
  | { t: "warn"; what: "fuel" | "hull" | "heat" | "home"; level: number }
  | { t: "lift"; phase: "start" | "stop" } // the pod starts or stops riding the lift
  | { t: "spore_charge"; x: number; y: number } // a spore vent swells before it puffs (the tell)
  | { t: "cache"; x: number; y: number; theme: string } // a cache cracked open
  | { t: "order"; id: string; done: boolean } // one of Ines' orders filled at a dock
  | { t: "dock"; sale: Sale }
  | { t: "buy"; what: string; id: string; level: number; tierUp?: boolean }
  | { t: "find"; find: number; first: boolean } // first pickup of an ore type, a jackpot or an artifact
  | { t: "achievement"; id: string }
  | { t: "toast"; text: string; tone?: "good" | "warn" | "bad" | "quiet" }
  | { t: "storm"; on: boolean } // Ferrum's magnetic storm
  | { t: "geyser"; x: number; y: number; phase: "charge" | "fire" } // Cinder
  /** Launch phases in order: wake, rise, break, sky, shards (count), wash, done. */
  | { t: "launch"; phase: string; count?: number };

export interface Sale {
  lines: { find: number; count: number; value: number }[];
  rigs: number;
  fuel: number; // cost (negative cash)
  repair: number;
  items: number;
  fee: number;
  total: number;
  best: boolean;
  /** Ines' order bonuses included in the lines, for display. */
  orders?: number;
}

// ---------------------------------------------------------------- the read model the surface draws from

export type EntityKind =
  | "boulder" // a loose rock or sand tile falling or wobbling (mat says which)
  | "nugget" // a loose ore piece lying or bouncing (find says which)
  | "crate" // wreck or tow crate holding cargo
  | "cache" // an opened cache popping (cosmetic)
  | "drone" // helper drone
  | "cloud" // spore or gas cloud (r = radius in tiles)
  | "charge" // placed dynamite or big charge (t = fuse left)
  | "lift" // the lift car (y = car position)
  | "seed"; // the Seed during the launch

export interface Entity {
  id: number;
  kind: EntityKind;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  mat?: number;
  find?: number;
  /** Kind-specific timer: fuse left, wobble time, age. */
  t?: number;
  r?: number;
  /** Pile count (nuggets lying together). */
  n?: number;
}

/** Everything the renderer, effects and HUD need to draw a frame; the rules' Game implements it. */
export interface GameView {
  world: WorldData;
  /** Tile indices changed since the last call (the renderer re-uploads them). */
  takeDirty(): number[];
  pod: PodView;
  entities: readonly Entity[];
  /** Game seconds since the save began (drives animation clocks that must survive reloads). */
  time: number;
  /** 0..1, 0 = midnight (DESIGN D13: 10 minute cycle). */
  dayPhase: number;
  levels: Record<Stat, number>;
  modules: readonly string[];
  /** Deepest row the lift reaches (0 = no lift). The lift runs in column world.spawnX. */
  liftDepth: number;
  /** Ambient temperature at a row (DESIGN D2). */
  tempAt(row: number): number;
}
