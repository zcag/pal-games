// World content: biomes, materials, finds (ores, jackpots, artifacts), caches, temperature, planets.
// The numbers are world.md's (with DESIGN.md winning), the looks art.md's. Ids are stable: saves store them.
import type { Find, Material, MaterialKind, PlanetId } from "../types.ts";

// ---------------------------------------------------------------- biomes

/** Nominal top row of each biome slot 0..6, and the end (exclusive) of the last. */
export const BIOME_TOP = [0, 60, 160, 280, 400, 540, 680] as const;
export const WORLD_ROWS = 770; // the designed column; rows 770..H-1 are the floor under the chamber
export const LIFT_X = 24;
export const CHAMBER = { cx: 23.5, cy: 761, rx: 18, ry: 9, seedR: 3 } as const;

export type CaveAlgo = "pockets" | "flat" | "cells" | "automaton" | "tubes" | "rooms" | "polar" | "ashCA" | "bands";
export type DenseShape = "hbands" | "dikes" | "blobs" | "shelves" | "flows" | "slabs" | "spokes" | "sheets" | "longbands";
export type UnbShape = "lump" | "seam" | "blob" | "walk" | "column" | "frame" | "arc" | "nodule";

export interface BaseRule { mat: number; from?: number; to?: number; min?: number; max?: number }

export interface BiomeDef {
  id: number;
  key: string;
  name: string;
  /** Depth slot 0..6: drives 1.9^slot, yield and the biome layer in WorldData. */
  slot: number;
  rows: [number, number];
  typical: number; // typical hardness
  /** The material carving and repairs fall back to (the biome's plain rock). */
  host: number;
  dense: number;
  unb: number;
  boulder: number;
  cache: number;
  /** Base material rules, first match wins (m = material noise in -1..1). */
  base: BaseRule[];
  cave: CaveAlgo;
  open: number; // open target, fraction of interior tiles (noise caves; structures come on top where noted)
  denseShape: DenseShape;
  unbChance: number; // world.md 6 seed chance (documentation; gen derives its rate from unbShare)
  /** Share of the biome's tiles that are unbreakable (world.md 3). */
  unbShare: number;
  unbShape: UnbShape;
  unbSize: [number, number];
  ambient: string;
  backWall: string;
  /** Story beat on first entry. */
  line: string;
  notes: string;
}

// ---------------------------------------------------------------- materials

const M = {
  AIR: 0,
  LOAM: 1, CLAY: 2, GRAVEL: 3, SAND: 4, HARDPAN: 5, GRANITE_BOULDER: 6,
  SHALE: 7, LIMESTONE: 8, GRANITE: 9, TIMBER: 10, RUBBLE: 11, DOLERITE: 12, IRONSTONE: 13,
  GLASSROCK: 14, QUARTZITE: 15, LINING: 16, FUSED_GLASS: 17, BLACK_PRISM: 18,
  MYCELIUM: 19, ROOTSTONE: 20, MOSSBASALT: 21, MUSHROOM: 22, SHELFSTONE: 23, PETRIFIED_ROOT: 24,
  SCORIA: 25, BASALT: 26, CRUST: 27, OBSIDIAN: 28, BASALT_COLUMN: 29, LAVA: 30,
  PACKED_RUBBLE: 31, BRICK: 32, FILL: 33, VAULT_SEAL: 34, CONCRETE: 35, WARD_STONE: 36,
  PRESSURE: 37, CORE_GLASS: 38, HEARTROCK: 39, HUSK: 40, NULL_ROCK: 41,
  ASH_BED: 42, TUFF: 43, CLINKER: 44, WELDED_TUFF: 45, FUSED_SLAG: 46, GEYSER: 47,
  RUST: 48, BANDED: 49, JASPER: 50, MAGNETITE: 51, METEORIC: 52,
  BEDROCK: 53, CAP: 54, PYLON: 55, SEED: 56,
  BOULDER_STONE: 57, BOULDER_CRYSTAL: 58, BOULDER_FUNGAL: 59, BOULDER_MAGMA: 60, BOULDER_RUINS: 61,
  BOULDER_CORE: 62, BOULDER_ASH: 63, BOULDER_BANDED: 64,
  CACHE_CRATE: 65, CACHE_CART: 66, CACHE_GEODE: 67, CACHE_SPORE: 68, CACHE_EMBER: 69, CACHE_COFFER: 70,
  CACHE_SEEDPOD: 71, CACHE_URN: 72, CACHE_STRONGBOX: 73,
} as const;
export const MAT = M;

type Pal = [string, string, string, string];

// Colour helpers (content-time only).
const hx = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (v: number[]) => "#" + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => { const A = hx(a), B = hx(b); return toHex(A.map((x, i) => x + (B[i] - x) * t)); };
const scale = (a: string, k: number) => toHex(hx(a).map((x) => x * k));
/** art.md 3.2: dense = the typical palette shifted one band down (base = typical dark+, light = typical base). */
const densePal = (p: Pal): Pal => [scale(p[0], 0.7), mix(p[0], p[1], 0.3), mix(p[0], p[1], 0.55), p[1]];
/** A boulder: the host rock a touch lighter (it reads as a loose lump, art draws the ring and crack). */
const boulderPal = (p: Pal): Pal => [p[0], mix(p[1], p[3], 0.25), mix(p[2], p[3], 0.3), mix(p[3], "#ffffff", 0.12)];

const P = {
  loam: ["#4a2f1f", "#7a5236", "#8c6040", "#a87650"] as Pal,
  clay: ["#5a3a2e", "#8a5442", "#9a6250", "#b8806a"] as Pal,
  gravel: ["#4e463e", "#74685a", "#82766a", "#9c9080"] as Pal,
  sand: ["#8a7448", "#b89a62", "#c8aa72", "#e0c890"] as Pal,
  shale: ["#34383c", "#5a5e64", "#666a70", "#80848a"] as Pal,
  limestone: ["#5c564c", "#8a8276", "#968e82", "#b0a898"] as Pal,
  granite: ["#4a4446", "#746c6e", "#827a7a", "#a09494"] as Pal,
  timber: ["#3a2414", "#6a4424", "#7a5030", "#96683e"] as Pal,
  rubble: ["#3a3634", "#5e5854", "#6a6460", "#86807a"] as Pal,
  glassrock: ["#2b2944", "#4b4a6b", "#57567a", "#74739a"] as Pal,
  quartzite: ["#4a4a58", "#747486", "#828294", "#a2a2b4"] as Pal,
  lining: ["#3a5a6a", "#6a9aac", "#7aacbe", "#a8dcea"] as Pal,
  mycelium: ["#2a2630", "#4a4452", "#6a6474", "#b8b0c0"] as Pal,
  rootstone: ["#24181a", "#42302c", "#4e3a34", "#6a5246"] as Pal,
  mossbasalt: ["#141816", "#2a302c", "#343a34", "#4a524a"] as Pal,
  mushroom: ["#4a3a5a", "#7a6890", "#8a78a0", "#aa98c0"] as Pal,
  cap: ["#1a4a44", "#2a8a7a", "#3aa894", "#5cffc8"] as Pal,
  scoria: ["#3a1a12", "#6a3426", "#7a3e2e", "#94523c"] as Pal,
  basalt: ["#1e1414", "#3a2a2a", "#47322e", "#5e4038"] as Pal,
  obsidian: ["#0e0c12", "#22202a", "#2c2a36", "#4a4858"] as Pal,
  crust: ["#1a0e0a", "#34201a", "#3e2620", "#5a3428"] as Pal,
  lava: ["#a02a08", "#ff6a1a", "#ff9a3a", "#ffd27a"] as Pal,
  packedRubble: ["#4a3e28", "#7a6842", "#887650", "#a8946a"] as Pal,
  brick: ["#5a5244", "#8a8270", "#968e7c", "#b4ac98"] as Pal,
  fill: ["#56524a", "#827d72", "#8e897e", "#a8a296"] as Pal,
  concrete: ["#4a4844", "#74706a", "#807c76", "#9c9890"] as Pal,
  seal: ["#2a1e10", "#5a4020", "#6a4c28", "#8a6838"] as Pal,
  pressure: ["#2e2438", "#4a3c5a", "#5a4a6c", "#8a78a0"] as Pal,
  coreGlass: ["#2a0810", "#5a1420", "#6a1a2a", "#8a2a3a"] as Pal,
  heartrock: ["#120c0a", "#2a2018", "#34281e", "#4a3a2a"] as Pal,
  ashBed: ["#3a3634", "#5e5854", "#6a645e", "#8a847c"] as Pal,
  tuff: ["#2a2624", "#4a4440", "#57504a", "#6e665e"] as Pal,
  clinker: ["#1e1814", "#3a302a", "#463a32", "#5e5046"] as Pal,
  rust: ["#4a2412", "#8a4a26", "#9a5630", "#b87040"] as Pal,
  banded: ["#2a201c", "#4e3a30", "#5a443a", "#7a5e4e"] as Pal,
  jasper: ["#3a1a16", "#6a3028", "#783830", "#94503e"] as Pal,
  // undiggable (art 3.5)
  graniteBoulder: ["#14161c", "#2a2e38", "#343946", "#4a5262"] as Pal,
  ironstone: ["#12141a", "#24262e", "#2e3038", "#40424c"] as Pal,
  blackPrism: ["#0e0e16", "#1e1e2a", "#282836", "#3a3a4c"] as Pal,
  petrifiedRoot: ["#16120e", "#2c2620", "#36302a", "#4a4238"] as Pal,
  basaltColumn: ["#16181e", "#2c3038", "#363a44", "#4a505c"] as Pal,
  wardStone: ["#0c1614", "#1a2a28", "#223430", "#304642"] as Pal,
  nullRock: ["#060608", "#121216", "#18181e", "#24242c"] as Pal,
  fusedSlag: ["#0c120e", "#1a2620", "#223028", "#2e4034"] as Pal,
  meteoric: ["#121212", "#262624", "#302e2c", "#423e3a"] as Pal,
  bedrock: ["#08080a", "#141418", "#1a1a20", "#26262e"] as Pal,
  geyser: ["#100a08", "#241614", "#2e1c18", "#ff8a2a"] as Pal,
  pylon: ["#1a2a30", "#34505a", "#40606c", "#8ac8ff"] as Pal,
  seed: ["#3a2a1a", "#8a6a3a", "#c8a060", "#fff2c0"] as Pal,
};

interface MatSpec {
  key: string; name: string; biome: number; kind: MaterialKind; h: number; pal: Pal; pattern: string; sound: string; vib: number;
  glow?: Material["glow"]; dense?: boolean; cache?: string;
}
const spec: Record<number, MatSpec> = {
  [M.AIR]: { key: "air", name: "Air", biome: -1, kind: "air", h: 0, pal: ["#000000", "#000000", "#000000", "#000000"], pattern: "none", sound: "soft", vib: 0 },
  // 0 Topsoil
  [M.LOAM]: { key: "loam", name: "Loam", biome: 0, kind: "soil", h: 1.0, pal: P.loam, pattern: "roots", sound: "soft", vib: 9 },
  [M.CLAY]: { key: "clay", name: "Clay", biome: 0, kind: "soil", h: 1.3, pal: P.clay, pattern: "streaks", sound: "wet", vib: 9 },
  [M.GRAVEL]: { key: "gravel", name: "Gravel", biome: 0, kind: "soil", h: 1.6, pal: P.gravel, pattern: "pebbles", sound: "grit", vib: 18 },
  [M.SAND]: { key: "sand", name: "Sand", biome: 0, kind: "loose", h: 0.5, pal: P.sand, pattern: "grain", sound: "soft", vib: 9 },
  [M.HARDPAN]: { key: "hardpan", name: "Hardpan", biome: 0, kind: "rock", h: 2.0, pal: densePal(P.loam), pattern: "laminae", sound: "hard", vib: 24, dense: true },
  [M.GRANITE_BOULDER]: { key: "granite_boulder", name: "Granite boulder", biome: 0, kind: "unbreakable", h: Infinity, pal: P.graniteBoulder, pattern: "round", sound: "hard", vib: 0 },
  // 1 Stone
  [M.SHALE]: { key: "shale", name: "Shale", biome: 1, kind: "rock", h: 1.9, pal: P.shale, pattern: "layers", sound: "grit", vib: 18 },
  [M.LIMESTONE]: { key: "limestone", name: "Limestone", biome: 1, kind: "rock", h: 2.2, pal: P.limestone, pattern: "pits", sound: "grit", vib: 18 },
  [M.GRANITE]: { key: "granite", name: "Granite", biome: 1, kind: "rock", h: 2.8, pal: P.granite, pattern: "speckle", sound: "grit", vib: 18 },
  [M.TIMBER]: { key: "timber", name: "Timber", biome: 1, kind: "special", h: 0.6, pal: P.timber, pattern: "planks", sound: "soft", vib: 12 },
  [M.RUBBLE]: { key: "rubble", name: "Rubble", biome: 1, kind: "rock", h: 1.2, pal: P.rubble, pattern: "chunks", sound: "grit", vib: 18 },
  [M.DOLERITE]: { key: "dolerite", name: "Dolerite", biome: 1, kind: "rock", h: 3.8, pal: densePal(P.shale), pattern: "laminae", sound: "hard", vib: 24, dense: true },
  [M.IRONSTONE]: { key: "ironstone", name: "Ironstone", biome: 1, kind: "unbreakable", h: Infinity, pal: P.ironstone, pattern: "seams", sound: "hard", vib: 0 },
  // 2 Crystal
  [M.GLASSROCK]: { key: "glassrock", name: "Glassrock", biome: 2, kind: "rock", h: 3.6, pal: P.glassrock, pattern: "flecks", sound: "glass", vib: 18 },
  [M.QUARTZITE]: { key: "quartzite", name: "Quartzite", biome: 2, kind: "rock", h: 4.3, pal: P.quartzite, pattern: "blocky", sound: "glass", vib: 18 },
  [M.LINING]: { key: "crystal_lining", name: "Crystal lining", biome: 2, kind: "rock", h: 2.4, pal: P.lining, pattern: "translucent", sound: "glass", vib: 18, glow: { color: "#a8dcea", hdr: 0.3, radius: 1 } },
  [M.FUSED_GLASS]: { key: "fused_glass", name: "Fused glass", biome: 2, kind: "rock", h: 7.2, pal: densePal(P.glassrock), pattern: "laminae", sound: "glass", vib: 24, dense: true },
  [M.BLACK_PRISM]: { key: "black_prism", name: "Black prism", biome: 2, kind: "unbreakable", h: Infinity, pal: P.blackPrism, pattern: "prism", sound: "hard", vib: 0 },
  // 3 Fungal
  [M.MYCELIUM]: { key: "mycelium", name: "Mycelium mat", biome: 3, kind: "soil", h: 4.0, pal: P.mycelium, pattern: "threads", sound: "squish", vib: 9 },
  [M.ROOTSTONE]: { key: "rootstone", name: "Rootstone", biome: 3, kind: "rock", h: 6.9, pal: P.rootstone, pattern: "veins", sound: "grit", vib: 18 },
  [M.MOSSBASALT]: { key: "mossbasalt", name: "Mossbasalt", biome: 3, kind: "rock", h: 8.0, pal: P.mossbasalt, pattern: "moss", sound: "grit", vib: 18 },
  [M.MUSHROOM]: { key: "mushroom", name: "Mushroom flesh", biome: 3, kind: "special", h: 1.5, pal: P.mushroom, pattern: "fibres", sound: "squish", vib: 9 },
  [M.SHELFSTONE]: { key: "shelfstone", name: "Shelfstone", biome: 3, kind: "rock", h: 13.8, pal: densePal(P.rootstone), pattern: "laminae", sound: "hard", vib: 24, dense: true },
  [M.PETRIFIED_ROOT]: { key: "petrified_root", name: "Petrified root", biome: 3, kind: "unbreakable", h: Infinity, pal: P.petrifiedRoot, pattern: "grain", sound: "hard", vib: 0 },
  // 4 Magma
  [M.SCORIA]: { key: "scoria", name: "Scoria", biome: 4, kind: "rock", h: 10.0, pal: P.scoria, pattern: "pores", sound: "rumble", vib: 18 },
  [M.BASALT]: { key: "basalt", name: "Basalt", biome: 4, kind: "rock", h: 13.0, pal: P.basalt, pattern: "hexcols", sound: "rumble", vib: 18 },
  [M.CRUST]: { key: "crust", name: "Crust", biome: 4, kind: "rock", h: 11.0, pal: P.crust, pattern: "cracks", sound: "rumble", vib: 18, glow: { color: "#ff6a1a", hdr: 0.9, radius: 1 } },
  [M.OBSIDIAN]: { key: "obsidian", name: "Obsidian", biome: 4, kind: "rock", h: 26.0, pal: P.obsidian, pattern: "facets", sound: "glass", vib: 24, dense: true },
  [M.BASALT_COLUMN]: { key: "basalt_column", name: "Cold basalt column", biome: 4, kind: "unbreakable", h: Infinity, pal: P.basaltColumn, pattern: "columns", sound: "hard", vib: 0 },
  [M.LAVA]: { key: "lava", name: "Lava", biome: 4, kind: "liquid", h: 0, pal: P.lava, pattern: "lava", sound: "rumble", vib: 0, glow: { color: "#ff6a1a", hdr: 2.5, radius: 3.5 } },
  // 5 Ruins
  [M.PACKED_RUBBLE]: { key: "packed_rubble", name: "Packed rubble", biome: 5, kind: "rock", h: 20.0, pal: P.packedRubble, pattern: "chunks", sound: "chisel", vib: 12 },
  [M.BRICK]: { key: "sower_brick", name: "Sower brick", biome: 5, kind: "rock", h: 24.8, pal: P.brick, pattern: "bond", sound: "chisel", vib: 12 },
  [M.FILL]: { key: "fill", name: "Fill", biome: 5, kind: "rock", h: 28.0, pal: P.fill, pattern: "inlay", sound: "chisel", vib: 12 },
  [M.VAULT_SEAL]: { key: "vault_seal", name: "Vault seal", biome: 5, kind: "special", h: 95.0, pal: P.seal, pattern: "disc", sound: "hum", vib: 24 },
  [M.CONCRETE]: { key: "old_concrete", name: "Old concrete", biome: 5, kind: "rock", h: 49.6, pal: P.concrete, pattern: "laminae", sound: "chisel", vib: 24, dense: true },
  [M.WARD_STONE]: { key: "ward_stone", name: "Ward stone", biome: 5, kind: "unbreakable", h: Infinity, pal: P.wardStone, pattern: "frame", sound: "hard", vib: 0 },
  // 6 Core
  [M.PRESSURE]: { key: "pressure_stone", name: "Pressure stone", biome: 6, kind: "rock", h: 47.0, pal: P.pressure, pattern: "swirls", sound: "hum", vib: 24 },
  [M.CORE_GLASS]: { key: "core_glass", name: "Core glass", biome: 6, kind: "rock", h: 60.0, pal: P.coreGlass, pattern: "glass", sound: "glass", vib: 24, glow: { color: "#8a2a3a", hdr: 0.6, radius: 1 } },
  [M.HEARTROCK]: { key: "heartrock", name: "Heartrock", biome: 6, kind: "rock", h: 75.0, pal: P.heartrock, pattern: "goldveins", sound: "hum", vib: 24, glow: { color: "#e0c040", hdr: 0.5, radius: 0.5 } },
  [M.HUSK]: { key: "husk_plate", name: "Husk plate", biome: 6, kind: "rock", h: 94.0, pal: densePal(P.coreGlass), pattern: "bark", sound: "hum", vib: 24, dense: true },
  [M.NULL_ROCK]: { key: "null_rock", name: "Null rock", biome: 6, kind: "unbreakable", h: Infinity, pal: P.nullRock, pattern: "rim", sound: "hard", vib: 0 },
  // 7 Ash hollows (Cinder)
  [M.ASH_BED]: { key: "ash_bed", name: "Ash bed", biome: 7, kind: "soil", h: 2.5, pal: P.ashBed, pattern: "ash", sound: "soft", vib: 9 },
  [M.TUFF]: { key: "tuff", name: "Tuff", biome: 7, kind: "rock", h: 6.9, pal: P.tuff, pattern: "pumice", sound: "grit", vib: 18 },
  [M.CLINKER]: { key: "clinker", name: "Clinker", biome: 7, kind: "rock", h: 8.0, pal: P.clinker, pattern: "lumps", sound: "rumble", vib: 18 },
  [M.WELDED_TUFF]: { key: "welded_tuff", name: "Welded tuff", biome: 7, kind: "rock", h: 13.8, pal: densePal(P.tuff), pattern: "laminae", sound: "hard", vib: 24, dense: true },
  [M.FUSED_SLAG]: { key: "fused_slag", name: "Fused slag", biome: 7, kind: "unbreakable", h: Infinity, pal: P.fusedSlag, pattern: "lumps", sound: "hard", vib: 0 },
  [M.GEYSER]: { key: "geyser", name: "Geyser vent", biome: 7, kind: "unbreakable", h: Infinity, pal: P.geyser, pattern: "vent", sound: "hard", vib: 0, glow: { color: "#ff8a2a", hdr: 0.6, radius: 1 } },
  // 8 Banded deeps (Ferrum)
  [M.RUST]: { key: "rust", name: "Rust", biome: 8, kind: "soil", h: 1.8, pal: P.rust, pattern: "crumble", sound: "grit", vib: 9 },
  [M.BANDED]: { key: "banded_ironstone", name: "Banded ironstone", biome: 8, kind: "rock", h: 3.6, pal: P.banded, pattern: "stripes", sound: "hard", vib: 18 },
  [M.JASPER]: { key: "jasper", name: "Jasper", biome: 8, kind: "rock", h: 4.3, pal: P.jasper, pattern: "waxy", sound: "grit", vib: 18 },
  [M.MAGNETITE]: { key: "magnetite", name: "Magnetite", biome: 8, kind: "rock", h: 7.2, pal: densePal(P.banded), pattern: "laminae", sound: "hard", vib: 24, dense: true },
  [M.METEORIC]: { key: "meteoric_iron", name: "Meteoric iron", biome: 8, kind: "unbreakable", h: Infinity, pal: P.meteoric, pattern: "pitted", sound: "hard", vib: 0 },
  // shared and structure tiles
  [M.BEDROCK]: { key: "bedrock", name: "Bedrock", biome: -1, kind: "unbreakable", h: Infinity, pal: P.bedrock, pattern: "rim", sound: "hard", vib: 0 },
  [M.CAP]: { key: "mushroom_cap", name: "Mushroom cap", biome: 3, kind: "special", h: 1.5, pal: P.cap, pattern: "cap", sound: "squish", vib: 9, glow: { color: "#5cffc8", hdr: 0.8, radius: 2 } },
  [M.PYLON]: { key: "pylon", name: "Arc pylon", biome: 5, kind: "unbreakable", h: Infinity, pal: P.pylon, pattern: "pylon", sound: "hard", vib: 0, glow: { color: "#8ac8ff", hdr: 0.4, radius: 1 } },
  [M.SEED]: { key: "seed", name: "The Seed", biome: 6, kind: "unbreakable", h: Infinity, pal: P.seed, pattern: "seed", sound: "hum", vib: 0, glow: { color: "#ffffff", hdr: 8, radius: 6 } },
  // boulders (loose rock, host x 1.5; core-loop "Loose boulder")
  [M.BOULDER_STONE]: { key: "boulder_stone", name: "Loose boulder", biome: 1, kind: "loose", h: 2.85, pal: boulderPal(P.shale), pattern: "boulder", sound: "grit", vib: 18 },
  [M.BOULDER_CRYSTAL]: { key: "boulder_crystal", name: "Loose boulder", biome: 2, kind: "loose", h: 5.4, pal: boulderPal(P.glassrock), pattern: "boulder", sound: "glass", vib: 18 },
  [M.BOULDER_FUNGAL]: { key: "boulder_fungal", name: "Loose boulder", biome: 3, kind: "loose", h: 10.35, pal: boulderPal(P.rootstone), pattern: "boulder", sound: "grit", vib: 18 },
  [M.BOULDER_MAGMA]: { key: "boulder_magma", name: "Loose boulder", biome: 4, kind: "loose", h: 19.5, pal: boulderPal(P.basalt), pattern: "boulder", sound: "rumble", vib: 18 },
  [M.BOULDER_RUINS]: { key: "boulder_ruins", name: "Loose boulder", biome: 5, kind: "loose", h: 37.2, pal: boulderPal(P.packedRubble), pattern: "boulder", sound: "chisel", vib: 12 },
  [M.BOULDER_CORE]: { key: "boulder_core", name: "Loose boulder", biome: 6, kind: "loose", h: 70.5, pal: boulderPal(P.pressure), pattern: "boulder", sound: "hum", vib: 24 },
  [M.BOULDER_ASH]: { key: "boulder_ash", name: "Loose boulder", biome: 7, kind: "loose", h: 10.35, pal: boulderPal(P.tuff), pattern: "boulder", sound: "grit", vib: 18 },
  [M.BOULDER_BANDED]: { key: "boulder_banded", name: "Loose boulder", biome: 8, kind: "loose", h: 5.4, pal: boulderPal(P.banded), pattern: "boulder", sound: "hard", vib: 18 },
  // caches (R10): 0.8 x the biome's typical hardness; host look comes from `back`, art draws the object
  [M.CACHE_CRATE]: { key: "cache_crate", name: "Crate", biome: 0, kind: "special", h: 0.8, pal: ["#3a2414", "#7a5030", "#8a6040", "#c7a25a"], pattern: "cache", sound: "soft", vib: 12, cache: "crate" },
  [M.CACHE_CART]: { key: "cache_cart", name: "Mine cart", biome: 1, kind: "special", h: 1.52, pal: ["#2a2a30", "#6a6a70", "#7a7a80", "#8a4a32"], pattern: "cache", sound: "hard", vib: 12, cache: "cart" },
  [M.CACHE_GEODE]: { key: "cache_geode", name: "Fossil geode", biome: 2, kind: "special", h: 2.88, pal: ["#4a4438", "#8a8070", "#e8dcc0", "#a8dcea"], pattern: "cache", sound: "glass", vib: 12, cache: "geode", glow: { color: "#a8dcea", hdr: 0.6, radius: 1 } },
  [M.CACHE_SPORE]: { key: "cache_spore", name: "Spore cache", biome: 3, kind: "special", h: 5.52, pal: ["#3a2e1a", "#6a5a3a", "#7a6a48", "#5cffc8"], pattern: "cache", sound: "squish", vib: 9, cache: "spore", glow: { color: "#5cffc8", hdr: 0.7, radius: 1 } },
  [M.CACHE_EMBER]: { key: "cache_ember", name: "Ember chest", biome: 4, kind: "special", h: 10.4, pal: ["#1a1414", "#3a2a2a", "#4a3434", "#ff8a2a"], pattern: "cache", sound: "hard", vib: 12, cache: "ember", glow: { color: "#ff8a2a", hdr: 0.9, radius: 1 } },
  [M.CACHE_COFFER]: { key: "cache_coffer", name: "Sower coffer", biome: 5, kind: "special", h: 19.84, pal: ["#4a4438", "#8a8270", "#968e7c", "#8affd0"], pattern: "cache", sound: "chisel", vib: 12, cache: "coffer", glow: { color: "#8affd0", hdr: 0.8, radius: 1 } },
  [M.CACHE_SEEDPOD]: { key: "cache_seedpod", name: "Seed pod", biome: 6, kind: "special", h: 37.6, pal: ["#24141c", "#4a2a3a", "#5a3446", "#fff2c0"], pattern: "cache", sound: "hum", vib: 24, cache: "seedpod", glow: { color: "#fff2c0", hdr: 0.9, radius: 1 } },
  [M.CACHE_URN]: { key: "cache_urn", name: "Ash urn", biome: 7, kind: "special", h: 5.52, pal: ["#24201c", "#5a5048", "#6a6058", "#ff8a2a"], pattern: "cache", sound: "grit", vib: 12, cache: "urn", glow: { color: "#ff8a2a", hdr: 0.6, radius: 1 } },
  [M.CACHE_STRONGBOX]: { key: "cache_strongbox", name: "Iron strongbox", biome: 8, kind: "special", h: 2.88, pal: ["#1a1c22", "#4a4e58", "#5a5e68", "#c8d0d8"], pattern: "cache", sound: "hard", vib: 12, cache: "strongbox", glow: { color: "#c8d0d8", hdr: 0.5, radius: 1 } },
};

export const MATERIALS: Material[] = [];
for (const [ids, s] of Object.entries(spec)) {
  const id = +ids;
  MATERIALS[id] = {
    id, key: s.key, name: s.name, biome: s.biome, kind: s.kind, hardness: s.h, palette: s.pal, pattern: s.pattern, sound: s.sound,
    shake: 0, // R13: drilling vibrates the sprite and the tile, never the camera
    vib: s.vib,
    ...(s.glow ? { glow: s.glow } : {}),
    ...(s.dense ? { dense: true } : {}),
    ...(s.cache ? { cache: s.cache } : {}),
  };
}
export const MATERIAL_COUNT = MATERIALS.length;

// ---------------------------------------------------------------- biome table

const vellBiomes: BiomeDef[] = [
  {
    id: 0, key: "topsoil", name: "Topsoil", slot: 0, rows: [0, 59], typical: 1.0, host: M.LOAM, dense: M.HARDPAN, unb: M.GRANITE_BOULDER, boulder: M.BOULDER_STONE, cache: M.CACHE_CRATE,
    base: [{ mat: M.LOAM, to: 14 }, { mat: M.LOAM, to: 25, max: 0.05 }, { mat: M.CLAY, to: 36 }, { mat: M.CLAY, to: 50, max: -0.05 }, { mat: M.GRAVEL }],
    cave: "pockets", open: 0.025, denseShape: "hbands", unbChance: 0.002, unbShape: "lump", unbSize: [1, 2], unbShare: 0.005,
    ambient: "#3a3550", backWall: "#2e2018", line: "Ida: \"The old mine closed when I was a girl. Let's see what's left down there.\"",
    notes: "Morning, roots, easy money. Fall damage and sand that slides. Earthworms curl from the lamp; buried bottles, a fossil shell, a cat skull.",
  },
  {
    id: 1, key: "stone", name: "Stone", slot: 1, rows: [60, 159], typical: 1.9, host: M.SHALE, dense: M.DOLERITE, unb: M.IRONSTONE, boulder: M.BOULDER_STONE, cache: M.CACHE_CART,
    base: [{ mat: M.SHALE, to: 79 }, { mat: M.SHALE, to: 119, max: -0.1 }, { mat: M.GRANITE, from: 110, min: 0.25 }, { mat: M.LIMESTONE }],
    cave: "flat", open: 0.06, denseShape: "dikes", unbChance: 0.008, unbShape: "seam", unbSize: [2, 6], unbShare: 0.03,
    ambient: "#1d1e26", backWall: "#24221f", line: "Timber and rails. Nobody has been down here in forty years.",
    notes: "Abandoned work: timber, rusted rails, drips. Loose boulders and cave-ins. Bats in tunnel ceilings, chalk tally marks.",
  },
  {
    id: 2, key: "crystal", name: "Crystal caves", slot: 2, rows: [160, 279], typical: 3.6, host: M.GLASSROCK, dense: M.FUSED_GLASS, unb: M.BLACK_PRISM, boulder: M.BOULDER_CRYSTAL, cache: M.CACHE_GEODE,
    base: [{ mat: M.QUARTZITE, from: 200, min: 0.15 }, { mat: M.GLASSROCK }],
    cave: "cells", open: 0.075, denseShape: "blobs", unbChance: 0.012, unbShape: "blob", unbSize: [2, 5], unbShare: 0.05,
    ambient: "#141530", backWall: "#1a1830", line: "The walls hum back at your drill.",
    notes: "Wonder: the first light that isn't yours. Gas pockets. Glass moths orbit glowing crystals.",
  },
  {
    id: 3, key: "fungal", name: "Fungal hollows", slot: 3, rows: [280, 399], typical: 6.9, host: M.ROOTSTONE, dense: M.SHELFSTONE, unb: M.PETRIFIED_ROOT, boulder: M.BOULDER_FUNGAL, cache: M.CACHE_SPORE,
    base: [{ mat: M.MOSSBASALT, from: 330, min: 0.1 }, { mat: M.ROOTSTONE }],
    cave: "automaton", open: 0.20, denseShape: "shelves", unbChance: 0.010, unbShape: "walk", unbSize: [3, 10], unbShare: 0.06,
    ambient: "#10161a", backWall: "#181220", line: "It's dark. But something down here makes its own light.",
    notes: "Alive and dark: huge hollows, mushroom forests, breathing blue-green light. Spore clouds; the lamp matters.",
  },
  {
    id: 4, key: "magma", name: "Magma", slot: 4, rows: [400, 539], typical: 13.0, host: M.BASALT, dense: M.OBSIDIAN, unb: M.BASALT_COLUMN, boulder: M.BOULDER_MAGMA, cache: M.CACHE_EMBER,
    base: [{ mat: M.SCORIA, to: 430, min: -0.25 }, { mat: M.SCORIA, to: 460, min: 0.1 }, { mat: M.BASALT }],
    cave: "tubes", open: 0.10, denseShape: "flows", unbChance: 0.012, unbShape: "column", unbSize: [3, 8], unbShare: 0.07,
    ambient: "#2a0f08", backWall: "#170d0b", line: "The rock is warm. Then hot. Watch the radiator.",
    notes: "Danger and wealth: heat and flowing lava. Rising embers, cinderlings, a far-off rumble (sound only).",
  },
  {
    id: 5, key: "ruins", name: "Ancient ruins", slot: 5, rows: [540, 679], typical: 24.8, host: M.PACKED_RUBBLE, dense: M.CONCRETE, unb: M.WARD_STONE, boulder: M.BOULDER_RUINS, cache: M.CACHE_COFFER,
    base: [{ mat: M.FILL, from: 600, min: 0.0 }, { mat: M.PACKED_RUBBLE }],
    cave: "rooms", open: 0.07, denseShape: "slabs", unbChance: 0.004, unbShape: "frame", unbSize: [3, 8], unbShare: 0.10,
    ambient: "#0e1214", backWall: "#121815", line: "Straight walls. Square doors. Nobody from Gantry built this.",
    notes: "Awe and quiet: rooms, vaults, glyphs that wake. Arc pylons and false floors. Cooler than Magma.",
  },
  {
    id: 6, key: "core", name: "The core", slot: 6, rows: [680, 769], typical: 47.0, host: M.PRESSURE, dense: M.HUSK, unb: M.NULL_ROCK, boulder: M.BOULDER_CORE, cache: M.CACHE_SEEDPOD,
    base: [{ mat: M.CORE_GLASS, from: 710, min: 0.15 }, { mat: M.PRESSURE }],
    cave: "polar", open: 0.10, denseShape: "spokes", unbChance: 0.015, unbShape: "arc", unbSize: [4, 9], unbShare: 0.08,
    ambient: "#2a2236", backWall: "#1c1424", line: "Your instruments drift. Something below beats, slowly.",
    notes: "Pressure and arrival: rock turns to glass, a heartbeat of light from below. The pulse.",
  },
];

const ashHollows: BiomeDef = {
  id: 7, key: "ash", name: "Ash hollows", slot: 3, rows: [280, 399], typical: 6.9, host: M.TUFF, dense: M.WELDED_TUFF, unb: M.FUSED_SLAG, boulder: M.BOULDER_ASH, cache: M.CACHE_URN,
  base: [{ mat: M.CLINKER, from: 330, min: 0.1 }, { mat: M.TUFF }],
  cave: "ashCA", open: 0.17, denseShape: "sheets", unbChance: 0.010, unbShape: "lump", unbSize: [2, 4], unbShare: 0.06,
  ambient: "#1a0c08", backWall: "#1a1412", line: "Ash, all the way down. Something here breathes fire on a schedule.",
  notes: "A hollow world that breathes fire on a timetable: geysers. Ash motes fall; fire beetles run from the lamp.",
};
const bandedDeeps: BiomeDef = {
  id: 8, key: "banded", name: "Banded deeps", slot: 2, rows: [160, 279], typical: 3.6, host: M.BANDED, dense: M.MAGNETITE, unb: M.METEORIC, boulder: M.BOULDER_BANDED, cache: M.CACHE_STRONGBOX,
  base: [{ mat: M.RUST, min: 0.6 }, { mat: M.JASPER, from: 210, min: 0.15 }, { mat: M.BANDED }],
  cave: "bands", open: 0.10, denseShape: "longbands", unbChance: 0.010, unbShape: "nodule", unbSize: [1, 3], unbShare: 0.05,
  ambient: "#141210", backWall: "#1e1612", line: "Iron in stripes. Your scanner doesn't like it.",
  notes: "Heavy and striped; the scanner goes quiet in magnetic storms. Rust mites scatter from the lamp.",
};
/** All biome defs by id (0..6 Vell, 7 Ash hollows, 8 Banded deeps). */
export const BIOMES: BiomeDef[] = [...vellBiomes, ashHollows, bandedDeeps];

// ---------------------------------------------------------------- planets

export interface PlanetDef {
  id: PlanetId;
  name: string;
  /** Biome id per slot 0..6. */
  biomes: number[];
  /** Slot of the planet's own biome (-1 on Vell). */
  own: number;
  unique?: string; // unique ore key
  /** Progression's modifiers, as data (progression.md section 5; R4/R5). */
  value: number; // ore value multiplier
  gravity: number;
  heat: number; // temperature multiplier on the planet's own biome rows only (R5)
  oreCount: number; // vein-count multiplier for the whole column
  scanner: number; // scanner level delta
  hazard: string;
  /** Per-ore overrides of the vein table on this planet (veins 0 = absent). */
  ores?: Record<string, Partial<OreGen>>;
  sky: { zenith: string; horizon: string; sunset: string };
}

export const PLANETS: Record<"vell" | "cinder" | "ferrum", PlanetDef> = {
  vell: { id: "vell", name: "Vell", biomes: [0, 1, 2, 3, 4, 5, 6], own: -1, value: 1, gravity: 1, heat: 1, oreCount: 1, scanner: 0, hazard: "", sky: { zenith: "#3f86e0", horizon: "#a8d8f5", sunset: "#ff7a3a" } },
  cinder: {
    id: "cinder", name: "Cinder", biomes: [0, 1, 2, 7, 4, 5, 6], own: 3, unique: "sunstone", value: 1.2, gravity: 1, heat: 1.3, oreCount: 1, scanner: 0, hazard: "geysers",
    ores: { sporestone: { veins: 0 }, lumen_amber: { veins: 0 }, jade: { veins: 28 } },
    sky: { zenith: "#c0503a", horizon: "#ffb07a", sunset: "#ff4a1a" },
  },
  ferrum: {
    id: "ferrum", name: "Ferrum", biomes: [0, 1, 8, 3, 4, 5, 6], own: 2, unique: "lodestone", value: 1, gravity: 1.3, heat: 1, oreCount: 1.4, scanner: -1, hazard: "magnetic storms",
    ores: { emerald: { veins: 0 }, amethyst: { form: "vein", veins: 12, size: [2, 4] }, sapphire: { form: "scattered", veins: 14, size: [1, 3] }, quartz: { veins: 18 } },
    sky: { zenith: "#6a7a8a", horizon: "#c8b8a0", sunset: "#c86a3a" },
  },
};
export const planetDef = (p: PlanetId): PlanetDef => (PLANETS as Record<string, PlanetDef>)[p] ?? PLANETS.vell;

// ---------------------------------------------------------------- temperature (D2, R5)

const TEMP: [number, number][] = [[0, 15], [160, 40], [280, 90], [400, 200], [540, 345], [560, 300], [680, 330], [770, 485]];
/** Ambient degrees C at a row (D2), with the planet's heat modifier on its own biome's rows only (R5). Lava and the pulse are the rules'. */
export function tempAt(row: number, planet: PlanetId = "vell"): number {
  let t = TEMP[TEMP.length - 1][1];
  if (row <= 0) t = TEMP[0][1];
  else for (let i = 1; i < TEMP.length; i++) {
    const [r1, c1] = TEMP[i];
    if (row <= r1) { const [r0, c0] = TEMP[i - 1]; t = c0 + ((c1 - c0) * (row - r0)) / (r1 - r0); break; }
  }
  const pd = planetDef(planet);
  if (pd.own >= 0 && pd.heat !== 1) {
    const b = BIOMES[pd.biomes[pd.own]];
    if (row >= b.rows[0] && row <= b.rows[1]) t *= pd.heat;
  }
  return t;
}

// ---------------------------------------------------------------- ores

export type OreForm = "vein" | "cluster" | "scattered" | "pocket";
export interface OreGen {
  form: OreForm;
  veins: number;
  size: [number, number];
  /** Pocket ores also seed on these open structures' walls. */
  pocket?: "geode" | "hollow" | "lake" | "room" | "vault";
}
interface OreSpec extends OreGen {
  key: string; name: string; text: string; rows: [number, number]; peak: number; kg: number; tier: number;
  cls: string; colors: [string, string, string]; glow?: Find["glow"]; planet?: PlanetId;
}

const ORES: OreSpec[] = [
  { key: "coal", name: "Coal", text: "Black and dusty. Burns well, sells cheap.", rows: [2, 59], peak: 15, form: "vein", veins: 14, size: [4, 8], kg: 8, tier: 1, cls: "Speck", colors: ["#2a2c36", "#aab4c8", "#e8f0ff"] },
  { key: "copper", name: "Copper", text: "Green-orange flecks. The old town ran on this.", rows: [3, 90], peak: 25, form: "vein", veins: 18, size: [3, 6], kg: 10, tier: 1, cls: "Vein", colors: ["#b85a28", "#ff9a5a", "#ffe0c0"] },
  { key: "tin", name: "Tin", text: "Dull silver nubs, soft enough to dent with a thumb.", rows: [18, 75], peak: 45, form: "cluster", veins: 12, size: [2, 4], kg: 9, tier: 2, cls: "Nugget", colors: ["#8a9098", "#c8ccd2", "#ffffff"] },
  { key: "iron", name: "Iron", text: "Rust-red and heavy. Bram calls it honest work.", rows: [55, 160], peak: 95, form: "vein", veins: 20, size: [4, 7], kg: 12, tier: 2, cls: "Band", colors: ["#8a4a32", "#c87a52", "#ffd8b8"] },
  { key: "lead", name: "Lead", text: "Very heavy, not worth much. Think before you carry it.", rows: [70, 160], peak: 120, form: "cluster", veins: 10, size: [3, 6], kg: 22, tier: 2, cls: "Block", colors: ["#5a6070", "#9aa2b4", "#e0e8f8"] },
  { key: "silver", name: "Silver", text: "Bright threads in grey stone. Ines smiles a little.", rows: [85, 180], peak: 130, form: "vein", veins: 12, size: [2, 5], kg: 11, tier: 3, cls: "Dendrite", colors: ["#a8b4c4", "#e8f0fa", "#ffffff"] },
  { key: "gold", name: "Gold", text: "Buttery yellow nuggets. The reason the old mine dug this deep.", rows: [115, 190], peak: 150, form: "scattered", veins: 18, size: [1, 2], kg: 16, tier: 4, cls: "Nugget", colors: ["#e0c040", "#fff07a", "#fffbe0"] },
  { key: "quartz", name: "Quartz", text: "Clear points in clusters. Catches the lamp nicely.", rows: [160, 250], peak: 185, form: "cluster", veins: 16, size: [3, 5], kg: 6, tier: 3, cls: "Spike", colors: ["#b8c8d8", "#f0f8ff", "#ffffff"], glow: { color: "#e8f4ff", hdr: 0.5, radius: 1.0 } },
  { key: "amethyst", name: "Amethyst", text: "Violet crystal, usually inside a geode.", rows: [165, 229], peak: 200, form: "pocket", pocket: "geode", veins: 0, size: [1, 1], kg: 7, tier: 4, cls: "Ring", colors: ["#6a2aa8", "#c080ff", "#ecd0ff"], glow: { color: "#c080ff", hdr: 1.2, radius: 1.5 } },
  { key: "sapphire", name: "Sapphire", text: "Deep blue, cold to the touch.", rows: [200, 280], peak: 240, form: "scattered", pocket: "geode", veins: 10, size: [1, 3], kg: 8, tier: 5, cls: "Gem", colors: ["#1a3aa0", "#5a9aff", "#c0d8ff"], glow: { color: "#5a9aff", hdr: 1.3, radius: 1.5 } },
  { key: "emerald", name: "Emerald", text: "Green fire in pale rock. Rare and worth the trip.", rows: [235, 290], peak: 265, form: "scattered", veins: 10, size: [1, 2], kg: 8, tier: 6, cls: "Block", colors: ["#128a50", "#32e08a", "#b0ffd8"], glow: { color: "#32e08a", hdr: 1.4, radius: 1.5 } },
  { key: "sporestone", name: "Sporestone", text: "Stone soaked with fungus. It glows when you breathe on it.", rows: [280, 370], peak: 310, form: "vein", veins: 16, size: [4, 8], kg: 5, tier: 5, cls: "Vein", colors: ["#1a6a5a", "#5cffc8", "#e0fff4"], glow: { color: "#5cffc8", hdr: 0.9, radius: 1.5 } },
  { key: "jade", name: "Jade", text: "Smooth green stone under the mushroom floors.", rows: [290, 400], peak: 340, form: "cluster", veins: 12, size: [2, 5], kg: 10, tier: 5, cls: "Band", colors: ["#2a7a4a", "#7ad8a0", "#e0fff0"] },
  { key: "moonstone", name: "Moonstone", text: "Milky blue with a light that moves inside it.", rows: [320, 405], peak: 365, form: "pocket", pocket: "hollow", veins: 0, size: [1, 1], kg: 7, tier: 6, cls: "Orb", colors: ["#6a8ab8", "#d0e4ff", "#ffffff"], glow: { color: "#d0e4ff", hdr: 1.6, radius: 2.0 } },
  { key: "lumen_amber", name: "Lumen amber", text: "Old resin with spores trapped inside, still lit.", rows: [350, 410], peak: 385, form: "scattered", veins: 12, size: [1, 2], kg: 4, tier: 7, cls: "Drop", colors: ["#b0701a", "#ffc04a", "#fff0c0"], glow: { color: "#ffc04a", hdr: 1.8, radius: 2.0 } },
  { key: "cinnabar", name: "Cinnabar", text: "Red crystals. Ines handles it with gloves.", rows: [400, 490], peak: 430, form: "vein", veins: 24, size: [3, 6], kg: 14, tier: 6, cls: "Spike", colors: ["#a01828", "#ff7a6a", "#ffd0c8"] },
  { key: "platinum", name: "Platinum", text: "Grey and plain until you weigh it.", rows: [420, 540], peak: 470, form: "cluster", veins: 18, size: [2, 4], kg: 18, tier: 7, cls: "Nugget", colors: ["#8a98a6", "#d8e8f4", "#ffffff"] },
  { key: "fire_opal", name: "Fire opal", text: "Orange flame caught in glass.", rows: [450, 545], peak: 500, form: "scattered", pocket: "lake", veins: 15, size: [1, 3], kg: 7, tier: 8, cls: "Orb", colors: ["#b04a10", "#ff9a3a", "#fff0b0"], glow: { color: "#ff9a3a", hdr: 2.0, radius: 2.5 } },
  { key: "diamond", name: "Diamond", text: "Hard, small, perfect. The heat made these.", rows: [490, 550], peak: 525, form: "scattered", veins: 15, size: [1, 1], kg: 6, tier: 9, cls: "Star", colors: ["#a8c8d8", "#f0fcff", "#ffffff"], glow: { color: "#f0fcff", hdr: 0.8, radius: 1.0 } },
  { key: "sower_scrap", name: "Sower scrap", text: "Bent pieces of a metal nobody here can make.", rows: [540, 640], peak: 570, form: "cluster", pocket: "room", veins: 21, size: [2, 4], kg: 15, tier: 8, cls: "Plate", colors: ["#5a6a6a", "#a8bcb8", "#e8fff8"] },
  { key: "orichalcum", name: "Orichalcum", text: "Gold-red alloy. The Sowers built their doors with it.", rows: [560, 680], peak: 610, form: "vein", pocket: "vault", veins: 18, size: [3, 5], kg: 14, tier: 9, cls: "Vein", colors: ["#b0602a", "#ffb050", "#fff0c8"], glow: { color: "#ffc860", hdr: 0.7, radius: 1.0 } },
  { key: "voidstone", name: "Voidstone", text: "Light as cork, darker than shadow. Light bends around it.", rows: [600, 690], peak: 650, form: "scattered", veins: 15, size: [1, 2], kg: 3, tier: 10, cls: "Ring", colors: ["#3a2a5a", "#b080ff", "#f0e0ff"], glow: { color: "#b080ff", hdr: 1.0, radius: 1.0 } },
  { key: "sunglass", name: "Sunglass", text: "Warm glass made by the Sowers' kilns, still warm.", rows: [570, 680], peak: 630, form: "cluster", veins: 12, size: [2, 3], kg: 6, tier: 9, cls: "Gem", colors: ["#c08a20", "#ffe070", "#fffbe0"], glow: { color: "#ffe070", hdr: 1.8, radius: 2.0 } },
  { key: "heartstone", name: "Heartstone", text: "Red stone that beats with the core, slower than yours.", rows: [680, 769], peak: 720, form: "vein", veins: 18, size: [3, 6], kg: 12, tier: 10, cls: "Orb", colors: ["#8a1020", "#ff4a5a", "#ffd0d0"], glow: { color: "#ff4a5a", hdr: 1.6, radius: 2.0 } },
  { key: "stellite", name: "Stellite", text: "White metal that hums. Sefa says it fell, long ago.", rows: [700, 769], peak: 740, form: "cluster", veins: 12, size: [2, 3], kg: 10, tier: 11, cls: "Block", colors: ["#b8c0d0", "#f4f8ff", "#ffffff"], glow: { color: "#f4f8ff", hdr: 2.0, radius: 2.5 } },
  { key: "seedglass", name: "Seedglass", text: "Clear as water, a speck of the Seed inside.", rows: [730, 769], peak: 755, form: "scattered", veins: 9, size: [1, 1], kg: 2, tier: 12, cls: "Drop", colors: ["#8ac8d8", "#f0ffff", "#ffffff"], glow: { color: "#f0ffff", hdr: 2.5, radius: 3.0 } },
  { key: "sunstone", name: "Sunstone", text: "Gold light that never cooled. It is warmer than the rock around it.", rows: [320, 410], peak: 370, form: "vein", veins: 20, size: [2, 4], kg: 9, tier: 7, cls: "Gem", colors: ["#c86a10", "#ffb040", "#fff0c0"], glow: { color: "#ffb040", hdr: 1.8, radius: 2.0 }, planet: "cinder" },
  { key: "lodestone", name: "Lodestone", text: "Black iron that turns to face you. Keep it away from the scanner.", rows: [220, 285], peak: 260, form: "cluster", veins: 16, size: [3, 5], kg: 20, tier: 6, cls: "Speck", colors: ["#1a1c22", "#8a94a8", "#e0e8ff"], planet: "ferrum" },
];

const CLS_SHAPE: Record<string, Find["shape"]> = { Nugget: "nugget", Vein: "vein", Dendrite: "vein", Gem: "gem", Star: "gem", Orb: "orb", Drop: "orb" };

/** Slot of a nominal row. */
export function slotOfRow(row: number): number {
  let s = 0;
  for (let i = 1; i < BIOME_TOP.length; i++) if (row >= BIOME_TOP[i]) s = i;
  return s;
}
/** Pieces per ore tile in a biome slot (R3). */
export const piecesPerTile = (slot: number) => 1 + Math.floor(slot / 2);
const massFactor = (slot: number) => { let f = 1; for (let i = 0; i < slot; i++) f *= 1.12; return f; };
/** Cargo mass per piece (D3): kg / 10 x 1.12^b. */
export const massOf = (kg: number, slot: number) => Math.round((kg / 10) * massFactor(slot) * 1000) / 1000;

// ---------------------------------------------------------------- finds table

export const FINDS: Find[] = [];
/** Generation data per ore find id. */
export const ORE_GEN: Record<number, OreGen & { peak: number }> = {};
export const ORE_IDS: number[] = [];

for (const o of ORES) {
  const id = FINDS.length + 1;
  const slot = slotOfRow(o.peak);
  FINDS[id] = {
    id, key: o.key, name: o.name, kind: "ore", biome: slot, tier: o.tier, mass: massOf(o.kg, slot),
    shape: CLS_SHAPE[o.cls] ?? "cluster", cls: o.cls, colors: o.colors, text: o.text, rows: o.rows,
    ...(o.glow ? { glow: o.glow } : {}), ...(o.planet ? { planet: o.planet } : {}),
  };
  ORE_GEN[id] = { form: o.form, veins: o.veins, size: o.size, peak: o.peak, ...(o.pocket ? { pocket: o.pocket } : {}) };
  ORE_IDS.push(id);
}

interface JackpotSpec { key: string; name: string; slot: number; count: number; mult: number; text: string; where: string; rows?: [number, number]; cls: string; colors: [string, string, string]; glow: NonNullable<Find["glow"]>; planet?: PlanetId }
const JACKPOTS: JackpotSpec[] = [
  { key: "fallen_star", name: "Fallen star", slot: 0, count: 1, mult: 10, rows: [30, 58], where: "scorched", text: "A meteorite, still warm. It came from above, the wrong way.", cls: "Nugget", colors: ["#4a3a30", "#fff0c0", "#ffffff"], glow: { color: "#fff0c0", hdr: 2.0, radius: 3.0 } },
  { key: "strongbox", name: "Buried strongbox", slot: 0, count: 2, mult: 6, rows: [10, 55], where: "embed", text: "Somebody's savings, forty years buried.", cls: "Block", colors: ["#4a4e58", "#e0c040", "#fff8d0"], glow: { color: "#e0c040", hdr: 1.2, radius: 2.0 } },
  { key: "motherlode", name: "Motherlode nugget", slot: 1, count: 1, mult: 10, rows: [130, 158], where: "tunnel_end", text: "The nugget the old mine was looking for. They stopped one tile short.", cls: "Nugget", colors: ["#e0c040", "#fff07a", "#fffbe0"], glow: { color: "#fff07a", hdr: 1.4, radius: 2.5 } },
  { key: "payroll", name: "Payroll chest", slot: 1, count: 1, mult: 6, where: "plug", text: "Last month's wages. Nobody came to collect.", cls: "Block", colors: ["#6a4424", "#ffd84a", "#fff8d0"], glow: { color: "#ffd84a", hdr: 1.2, radius: 2.0 } },
  { key: "starheart", name: "Starheart", slot: 2, count: 1, mult: 10, where: "star_geode", text: "A crystal that holds a star's light. It never dims.", cls: "Star", colors: ["#bff8ff", "#ffffff", "#ffffff"], glow: { color: "#bff8ff", hdr: 3.0, radius: 4.0 } },
  { key: "moonpearl", name: "Moonpearl", slot: 3, count: 2, mult: 8, where: "cap", text: "The mushroom grew around it for a thousand years.", cls: "Orb", colors: ["#c8d4f0", "#e8f0ff", "#ffffff"], glow: { color: "#e8f0ff", hdr: 2.0, radius: 3.0 } },
  { key: "phoenix_diamond", name: "Phoenix diamond", slot: 4, count: 1, mult: 10, where: "lake_floor", text: "A diamond born in fire. It is cool to touch.", cls: "Star", colors: ["#ffb060", "#fff4d0", "#ffffff"], glow: { color: "#ffb060", hdr: 2.5, radius: 3.5 } },
  { key: "sower_crown", name: "Sower crown", slot: 5, count: 1, mult: 10, where: "vault4", text: "A ring of six points. Too big for a human head.", cls: "Ring", colors: ["#e0c040", "#b080ff", "#fff8d0"], glow: { color: "#e0c040", hdr: 2.0, radius: 3.0 } },
  { key: "seed_tear", name: "Seed tear", slot: 6, count: 1, mult: 8, where: "ring", text: "A drop the Seed let fall. It is still moving inside.", cls: "Drop", colors: ["#fff2c0", "#ffffff", "#ffffff"], glow: { color: "#fff2c0", hdr: 3.0, radius: 4.0 } },
  { key: "ember_heart", name: "Ember heart", slot: 3, count: 1, mult: 10, where: "vent_cone", text: "A geyser's last breath, caught and cooled. It still flickers.", cls: "Orb", colors: ["#c84a10", "#ffb040", "#fff0c0"], glow: { color: "#ff8a2a", hdr: 2.5, radius: 3.5 }, planet: "cinder" },
  { key: "iron_seed", name: "Iron seed", slot: 2, count: 1, mult: 10, where: "forge_centre", text: "A ball of iron as round as a Seed. It turns slowly to face the core.", cls: "Orb", colors: ["#3a3e48", "#a8b4c8", "#e0e8ff"], glow: { color: "#a8b4c8", hdr: 2.0, radius: 3.0 }, planet: "ferrum" },
];
/** The biome's top ore by tier (D5 jackpot base), per slot on Vell. */
export function topOre(slot: number, planet: PlanetId = "vell"): number {
  let best = 0;
  for (const id of ORE_IDS) {
    const f = FINDS[id];
    if (f.biome !== slot || !oreOnPlanet(id, planet)) continue;
    if (!best || f.tier > FINDS[best].tier) best = id;
  }
  return best;
}
export const JACKPOT_GEN: Record<number, { count: number; where: string; rows?: [number, number] }> = {};
export const JACKPOT_IDS: number[] = [];
for (const j of JACKPOTS) {
  const id = FINDS.length;
  const top = ORES.filter((o) => slotOfRow(o.peak) === j.slot && !o.planet).reduce((a, o) => (o.tier > a.tier ? o : a));
  FINDS[id] = {
    id, key: j.key, name: j.name, kind: "jackpot", biome: j.slot, tier: top.tier, mult: j.mult, mass: massOf(top.kg, j.slot),
    shape: CLS_SHAPE[j.cls] ?? "cluster", cls: j.cls, colors: j.colors, glow: j.glow, text: j.text, ...(j.rows ? { rows: j.rows } : {}), ...(j.planet ? { planet: j.planet } : {}),
  };
  JACKPOT_GEN[id] = { count: j.count, where: j.where, ...(j.rows ? { rows: j.rows } : {}) };
  JACKPOT_IDS.push(id);
}

// ---------------------------------------------------------------- artifacts (world.md section 5 and 7)

/** Placement keys gen.ts resolves: embed (in a typical tile of the band), wall (a wall tile touching a cave), or a named anchor. */
interface ArtifactSpec { key: string; name: string; slot: number; rows?: [number, number]; where: string; thread: string; text: string; planet?: PlanetId; host?: number }
const ARTIFACTS: ArtifactSpec[] = [
  { key: "A1", name: "Foreman's tally board", slot: 1, rows: [70, 110], where: "tunnel_wall", thread: "mine", text: "Shift counts for the last week of the old mine. The numbers stop on a Thursday. In the margin, in pencil: \"it hums\"." },
  { key: "A2", name: "Cracked lantern", slot: 1, where: "cart_room", thread: "mine", text: "A miner's lamp, warm in the hand. The glass is etched from the inside, fine lines, like something sang at it." },
  { key: "A3", name: "Letter never sent", slot: 1, rows: [140, 159], where: "below_shaft", thread: "wren", text: "\"Ida, don't come down. The rock under the bottom shaft isn't rock. It's a wall. Somebody built it. - Wren\"" },
  { key: "A4", name: "Singing quartz", slot: 2, where: "singing", thread: "sowers", text: "Tap it and it plays back a sound: slow voices counting. The count goes down." },
  { key: "A5", name: "Glass tablet", slot: 2, rows: [200, 260], where: "geode", thread: "sowers", text: "Thin as paper, harder than steel. The same short mark repeats on every line, like a name said over and over." },
  { key: "A6", name: "Wren's pick", slot: 2, rows: [250, 279], where: "near_star", thread: "wren", text: "A rock pick with W.A. burned into the handle, wedged in on purpose. It points down." },
  { key: "A7", name: "Six-fingered hand", slot: 3, rows: [290, 340], where: "wall", thread: "sowers", text: "A stone hand with six fingers, grown over with mycelium. The fungus has fed on it gently for a very long time." },
  { key: "A8", name: "Spore map", slot: 3, where: "great_hollow", thread: "sowers", text: "The fungus grew along something buried. From above, its lines are a map of rooms far below." },
  { key: "A9", name: "Wren's journal, page 12", slot: 3, rows: [360, 399], where: "under_mushroom", thread: "wren", text: "\"Day nine. The light down here follows the pod. I think it has been waiting for someone to follow it.\"" },
  { key: "A10", name: "Heat-sealed urn", slot: 4, where: "kiln_pedestal", thread: "sowers", text: "Inside: ash, and a smooth seed the size of a fist. It is cold, here, in all this heat." },
  { key: "A11", name: "Bronze plate", slot: 4, where: "kiln_wall", thread: "sowers", text: "A picture: a round thing in a cradle, small figures around it, and a dotted line from it up into the stars." },
  { key: "A12", name: "Melted badge", slot: 4, rows: [500, 539], where: "embed", host: M.OBSIDIAN, thread: "wren", text: "A dig licence, half melted. \"Wren Aster, Gantry, No. 31.\" She made it this far." },
  { key: "A13", name: "Sower door-key", slot: 5, rows: [545, 580], where: "first_room", thread: "sowers", text: "A ring of dark metal. Every vault seal down here has a hollow exactly its size." },
  { key: "A14", name: "Nursery frieze", slot: 5, where: "nursery_wall", thread: "sowers", text: "Small figures carry a glowing ball from world to world. Each world is drawn smaller and older than the last." },
  { key: "A15", name: "Keeper's last order", slot: 5, where: "vault1", thread: "sowers", text: "Sefa's best reading: \"When it is ready, do not keep it. Lift it. We waited, and the fire came up to meet us.\"" },
  { key: "A16", name: "The cradle list", slot: 5, where: "vault2", thread: "sowers", text: "A stone cradle, shaped for something round. On its rim, a list of worlds. The last line is this one. Below it, a blank line." },
  { key: "A17", name: "Wren's note in the vault", slot: 5, where: "vault3", thread: "wren", text: "\"I opened one, Ida. They didn't die down here. They lay down beside it so it wouldn't be alone.\"" },
  { key: "A18", name: "Seed husk", slot: 6, rows: [690, 740], where: "embed", thread: "sowers", text: "A curved plate shed by the core, like bark. Warm. It beats about once every ten seconds." },
  { key: "A19", name: "Wren's last note", slot: 6, where: "chamber", thread: "wren", text: "\"It isn't a weapon and it isn't treasure. It's a seed, and it wants to go. I can't lift it alone. Tell Ida I saw the stars from underneath.\"" },
  { key: "C1", name: "Charred tally", slot: 3, rows: [285, 305], where: "embed", host: M.TUFF, planet: "cinder", thread: "sowers", text: "The counting marks again, the ones the singing quartz played on Vell. Here they reach zero, and then start over." },
  { key: "C2", name: "Glazed bowl", slot: 3, rows: [300, 325], where: "wall", planet: "cinder", thread: "sowers", text: "A bowl glazed by fire from below. Six finger marks were pressed into the clay before it set." },
  { key: "C3", name: "Vent chart", slot: 3, where: "vent_wall", planet: "cinder", thread: "sowers", text: "Lines scratched around every vent in the hall, a time beside each. They learned when the fire would come, and walked between." },
  { key: "C4", name: "Walking frieze", slot: 3, rows: [340, 365], where: "embed", host: M.CLINKER, planet: "cinder", thread: "sowers", text: "The figures carry the ball again, but here none of them lie down. They walk away from the cradle toward a small star low on the horizon." },
  { key: "C5", name: "Cinder's cradle list", slot: 3, where: "vent_pedestal", planet: "cinder", thread: "sowers", text: "The cradle list, shorter than Vell's. The last carved line is this world. Below it, cut fast and less evenly, one more name. Sefa reads it as Vell." },
  { key: "C6", name: "Keeper's word", slot: 3, rows: [380, 399], where: "embed", host: M.CLINKER, planet: "cinder", thread: "sowers", text: "Sefa's best reading: \"We leave it planted and go on. Whoever comes: it will know when it is ready. Lift it then.\"" },
  { key: "F1", name: "Sounding rod", slot: 2, rows: [165, 185], where: "embed", host: M.BANDED, planet: "ferrum", thread: "sowers", text: "A Sower rod hammered into the bands. It still hums, at the pitch of the core. They used the iron to listen." },
  { key: "F2", name: "Forge plate", slot: 2, where: "forge_wall", planet: "ferrum", thread: "sowers", text: "Six-fingered hands pressed into the plate while it was soft. Two of them are small. Children helped." },
  { key: "F3", name: "Compass ring", slot: 2, rows: [200, 225], where: "embed", host: M.JASPER, planet: "ferrum", thread: "sowers", text: "A lodestone set in a ring. Its needle does not point north. It points at the Seed, wherever you carry it." },
  { key: "F4", name: "Storm count", slot: 2, rows: [225, 250], where: "wall", planet: "ferrum", thread: "sowers", text: "Rows of marks with a gap between each, like the storms you have been counting. Beside the last row, a hand pressed flat: wait." },
  { key: "F5", name: "Ferrum's cradle list", slot: 2, rows: [255, 279], where: "embed", host: M.MAGNETITE, planet: "ferrum", thread: "sowers", text: "The cradle list again, older still. It ends at this world, and below it, in another hand, Cinder. The first line is worn almost smooth." },
  { key: "F6", name: "Small cradle", slot: 2, where: "forge_pedestal", planet: "ferrum", thread: "sowers", text: "A cradle half forged, too small for any Seed you have seen. Sefa thinks the first Seed was small, and each one since has grown a little." },
];
export const ARTIFACT_GEN: Record<number, { where: string; rows?: [number, number]; host?: number }> = {};
export const ARTIFACT_IDS: number[] = [];
for (const a of ARTIFACTS) {
  const id = FINDS.length;
  FINDS[id] = {
    id, key: a.key, name: a.name, kind: "artifact", biome: a.slot, tier: 0, mass: 0, shape: "relic", cls: "Relic",
    colors: ["#8a7a4a", "#e8d8a0", "#fff8e0"], text: a.text, thread: a.thread, ...(a.rows ? { rows: a.rows } : {}), ...(a.planet ? { planet: a.planet } : {}),
  };
  ARTIFACT_GEN[id] = { where: a.where, ...(a.rows ? { rows: a.rows } : {}), ...(a.host ? { host: a.host } : {}) };
  ARTIFACT_IDS.push(id);
}

// ---------------------------------------------------------------- caches (R10)

export interface CacheDef { key: string; name: string; biome: number; mat: number; count: number; pieces: number }
/** Per biome id: count = round(rows / 15), pieces = 3 x (1 + floor(b / 2)). */
export const CACHES: CacheDef[] = BIOMES.map((b) => ({
  key: MATERIALS[b.cache].cache!, name: MATERIALS[b.cache].name, biome: b.id, mat: b.cache,
  count: Math.round((b.rows[1] - b.rows[0] + 1) / 15), pieces: 3 * piecesPerTile(b.slot),
}));
/** Items a cache may hold (one cache in three): above Magma / from Magma down. Never a teleporter. */
export const CACHE_ITEMS = { shallow: ["fuel", "repair", "dynamite"], deep: ["coolant", "charge"] } as const;

// ---------------------------------------------------------------- lookups

const byKey = new Map<string, number>();
FINDS.forEach((f) => f && byKey.set(f.key, f.id));
const matByKey = new Map<string, number>();
MATERIALS.forEach((m) => matByKey.set(m.key, m.id));

export const materialById = (id: number): Material => MATERIALS[id] ?? MATERIALS[0];
export const materialByKey = (key: string): Material | undefined => MATERIALS[matByKey.get(key) ?? -1];
export const findById = (id: number): Find | undefined => FINDS[id];
export const findByKey = (key: string): Find | undefined => FINDS[byKey.get(key) ?? -1];
export const biomeDef = (planet: PlanetId, slot: number): BiomeDef => BIOMES[planetDef(planet).biomes[slot]];

/** Is this find generated on this planet? (planet-only finds, and ores a planet removes.) */
export function oreOnPlanet(id: number, planet: PlanetId): boolean {
  const f = FINDS[id];
  if (!f) return false;
  if (f.planet && f.planet !== planet) return false;
  const ov = planetDef(planet).ores?.[f.key];
  return !(ov && ov.veins === 0);
}
/** The vein table entry for an ore on a planet (overrides applied, oreCount not applied). */
export function oreGen(id: number, planet: PlanetId): OreGen & { peak: number } {
  const g = ORE_GEN[id];
  const ov = planetDef(planet).ores?.[FINDS[id].key];
  return ov ? { ...g, ...ov } : g;
}
/** Triangular row weight of an ore (world.md section 6), 0 outside its band. */
export function oreWeight(id: number, row: number): number {
  const f = FINDS[id], g = ORE_GEN[id];
  if (!f?.rows || row < f.rows[0] || row > f.rows[1]) return 0;
  const span = Math.max(g.peak - f.rows[0], f.rows[1] - g.peak) || 1;
  return Math.max(0, 1 - Math.abs(row - g.peak) / span);
}
export const isSolid = (mat: number) => mat !== 0 && MATERIALS[mat].kind !== "liquid";
export const isUnbreakable = (mat: number) => MATERIALS[mat]?.kind === "unbreakable";
export const isDense = (mat: number) => !!MATERIALS[mat]?.dense;
/** Hardness of a tile: ore tiles are host x 1.15 (world.md section 4). */
export const tileHardness = (mat: number, find = 0) => {
  const h = MATERIALS[mat]?.hardness ?? 0;
  return find && FINDS[find]?.kind === "ore" ? h * 1.15 : h;
};
/** Story beats on first entry to a biome id, plus the chamber. */
export const CHAMBER_LINE = "There it is.";
