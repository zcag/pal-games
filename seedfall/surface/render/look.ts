// Art direction as data (design/art.md): biome looks, sky keyframes, planets, Lift colours,
// the pattern recipes the terrain shader draws per material, and colour helpers.
// Materials and finds bring their own palettes (content/world.ts); this file only says how to draw them.

export type RGB = [number, number, number];

/** "#rrggbb" to sRGB 0..1. */
export const hex = (h: string): RGB => {
  const n = parseInt(h.replace("#", "").slice(0, 6), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const lin = (c: RGB): RGB => [toLin(c[0]), toLin(c[1]), toLin(c[2])];
export const hexLin = (h: string): RGB => lin(hex(h));
export const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const scale = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
export const smooth = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** Integer hash shared with the shaders (GLSL `hashu`): same input, same output on both sides. */
export function hashu(x: number, y: number, z: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
export const hash01 = (x: number, y: number, z: number) => hashu(x, y, z) / 4294967296;

// ---------------------------------------------------------------- biomes (art.md 4)

export interface BiomeLook {
  ambient: string; amb: number; ambDeep: number;
  back: string; fog: string;
  lift: string; gain: string; shadow: string; high: string;
  ev: number; bloom: number; haze: number; sat: number;
}

export const BIOME_LOOK: BiomeLook[] = [
  { ambient: "#3a3550", amb: 0.45, ambDeep: 0.2, back: "#2e2018", fog: "#1a1420", lift: "#000000", gain: "#ffffff", shadow: "#3a2418", high: "#fff0d0", ev: 1.0, bloom: 0.35, haze: 0, sat: 1.0 },
  { ambient: "#1d1e26", amb: 0.18, ambDeep: 0.18, back: "#24221f", fog: "#121318", lift: "#04050a", gain: "#f4f6ff", shadow: "#141820", high: "#ffe6c0", ev: 1.1, bloom: 0.35, haze: 0, sat: 1.0 },
  { ambient: "#141530", amb: 0.2, ambDeep: 0.2, back: "#1a1830", fog: "#0d0e22", lift: "#06081a", gain: "#e8f4ff", shadow: "#101640", high: "#d8f8ff", ev: 1.15, bloom: 0.4, haze: 0, sat: 1.05 },
  { ambient: "#10161a", amb: 0.2, ambDeep: 0.2, back: "#181220", fog: "#0a1214", lift: "#04100e", gain: "#f8eaff", shadow: "#0a2a26", high: "#ffd8f4", ev: 1.2, bloom: 0.42, haze: 0, sat: 1.05 },
  { ambient: "#2a0f08", amb: 0.22, ambDeep: 0.22, back: "#170d0b", fog: "#1a0804", lift: "#0c0200", gain: "#fff0e0", shadow: "#2a0a04", high: "#fff2c8", ev: 0.9, bloom: 0.42, haze: 0.5, sat: 1.0 },
  { ambient: "#0e1214", amb: 0.18, ambDeep: 0.18, back: "#121815", fog: "#0b1012", lift: "#020806", gain: "#e4fff4", shadow: "#081814", high: "#d0e8ff", ev: 1.2, bloom: 0.38, haze: 0, sat: 0.85 },
  { ambient: "#2a2236", amb: 0.25, ambDeep: 0.6, back: "#1c1424", fog: "#1a0610", lift: "#0a0610", gain: "#ffffff", shadow: "#1a1030", high: "#fff4e0", ev: 0.8, bloom: 0.55, haze: 0.25, sat: 1.0 },
  // Planet biomes (art.md 4.1): Ash hollows (Cinder), Banded deeps (Ferrum).
  { ambient: "#2a1810", amb: 0.2, ambDeep: 0.2, back: "#1a1614", fog: "#140a06", lift: "#080200", gain: "#fff0e0", shadow: "#2a0a04", high: "#ffd8a0", ev: 1.1, bloom: 0.42, haze: 0.2, sat: 1.0 },
  { ambient: "#181c24", amb: 0.2, ambDeep: 0.2, back: "#1c1614", fog: "#0e1012", lift: "#040406", gain: "#f0f4ff", shadow: "#1a1410", high: "#e0e8f0", ev: 1.15, bloom: 0.36, haze: 0, sat: 0.9 },
];

/** Nominal first row of each biome (world.md 2); the real boundary wanders, the per-tile biome map wins. */
export const BIOME_ROWS = [0, 60, 160, 280, 400, 540, 680, 776];

/** Lift segment ends (core-loop: the Lift) and their lamp colours (art.md 7.4). */
export const LIFT_SEGMENTS = [60, 160, 280, 400, 540, 680, 748];
export const LIFT_LIGHT = ["#ffd870", "#ffb35c", "#7fe8ff", "#5cffc8", "#ffd27a", "#8affd0", "#fff2c0"];

// ---------------------------------------------------------------- sky (art.md 7.1)

export interface SkyKey { p: number; zenith: string; horizon: string }
export const SKY_KEYS: SkyKey[] = [
  { p: 0.0, zenith: "#070a1a", horizon: "#1a2140" },
  { p: 0.2, zenith: "#141a3a", horizon: "#6a4a6e" },
  { p: 0.25, zenith: "#3a5a9a", horizon: "#ff9a5a" },
  { p: 0.32, zenith: "#4f8fd8", horizon: "#bfe0f2" },
  { p: 0.5, zenith: "#3f86e0", horizon: "#a8d8f5" },
  { p: 0.68, zenith: "#4a86d0", horizon: "#d8e6e8" },
  { p: 0.75, zenith: "#3a3f7a", horizon: "#ff7a3a" },
  { p: 0.8, zenith: "#1f2350", horizon: "#a04a6a" },
  { p: 0.88, zenith: "#0b1028", horizon: "#24284a" },
  { p: 1.0, zenith: "#070a1a", horizon: "#1a2140" },
];

/** Planet looks (art.md 4.1): a tint toward each planet's sky, its sunset horizon and its night, and grade overrides. */
export interface PlanetLook { noonZ: string; noonH: string; sunsetH: string; night?: string; grade?: Partial<Pick<BiomeLook, "gain" | "shadow" | "high">>; soil?: string }
export const PLANETS: Record<string, PlanetLook> = {
  vell: { noonZ: "#3f86e0", noonH: "#a8d8f5", sunsetH: "#ff7a3a" },
  cinder: { noonZ: "#c0503a", noonH: "#ffb07a", sunsetH: "#ff4a1a", night: "#1a0806", grade: { high: "#ffd8a0", shadow: "#2a0a04", gain: "#fff0e0" }, soil: "#1e1614" },
  ferrum: { noonZ: "#6a7a8a", noonH: "#c8b8a0", sunsetH: "#c86a3a", grade: { gain: "#f0f4ff", high: "#e0e8f0", shadow: "#1a1410" } },
};

// ---------------------------------------------------------------- patterns (art.md 3.1, 3.5)

/** Detail generators the terrain shader knows (`DETAIL_*` in shaders.ts). */
export const DETAIL = {
  NONE: 0, PEBBLES: 1, STREAKS: 2, GRAVEL: 3, GRAIN: 4, LAYERS: 5, PITS: 6, SPECKLE: 7, PLANKS: 8, CHUNKS: 9,
  FLECKS: 10, CELLS: 11, CRYSTAL: 12, THREADS: 13, ROOTVEIN: 14, MOSS: 15, FIBRES: 16, PORES: 17, HEX: 18,
  FACETS: 19, CRACKNET: 20, BRICK: 21, INLAY: 22, SEAL: 23, SWIRL: 24, GLASS: 25, GOLDVEIN: 26, BARK: 27,
  LAVA: 28, CAP: 29, STRIPES: 30, CACHE: 31, PYLON: 32, SEEDT: 33, BOULDER: 34, VENT: 35, WAXY: 36,
  U_ROUND: 40, U_SEAMS: 41, U_PRISM: 42, U_GRAIN: 43, U_COLUMN: 44, U_WARD: 45, U_NULL: 46, U_LUMPS: 47, U_BEDROCK: 48,
} as const;

/** How to draw one pattern: a detail generator, two accent colours, and the accents' emissive HDR. */
export interface Recipe { d: number; a1?: string; a2?: string; e1?: number; e2?: number; f?: number }

/** Pattern keys (Material.pattern) and material keys both resolve here; unknown keys fall back by kind. */
export const RECIPES: Record<string, Recipe> = {
  // content/world.ts pattern keys
  roots: { d: DETAIL.PEBBLES, a1: "#9a8a78", a2: "#c7a25a" },
  pebbles: { d: DETAIL.GRAVEL },
  laminae: { d: DETAIL.LAYERS },
  round: { d: DETAIL.U_ROUND },
  seams: { d: DETAIL.U_SEAMS, a1: "#5a3020" },
  blocky: { d: DETAIL.CELLS },
  translucent: { d: DETAIL.CRYSTAL, a1: "#d8f8ff", e1: 0.3 },
  threads: { d: DETAIL.THREADS, a1: "#c8c0d0" },
  veins: { d: DETAIL.ROOTVEIN, a1: "#9a8070" },
  hexcols: { d: DETAIL.HEX, a1: "#ff5a1a", e1: 0.6 },
  cracks: { d: DETAIL.CRACKNET, a1: "#ff6a1a", e1: 0.9 },
  columns: { d: DETAIL.U_COLUMN },
  bond: { d: DETAIL.BRICK },
  disc: { d: DETAIL.SEAL, a1: "#e0c040" },
  frame: { d: DETAIL.U_WARD, a1: "#6a5a34" },
  swirls: { d: DETAIL.SWIRL, a1: "#fff2c0", e1: 0.9 },
  glass: { d: DETAIL.GLASS, a1: "#ff5a4a", e1: 0.6 },
  goldveins: { d: DETAIL.GOLDVEIN, a1: "#e0c040", e1: 0.5 },
  rim: { d: DETAIL.U_NULL, a1: "#4a3a6a" },
  u_grain: { d: DETAIL.U_GRAIN },
  u_lumps: { d: DETAIL.U_LUMPS, a1: "#2a4a3a" },
  pumice: { d: DETAIL.PITS, a1: "#ff6a1a", e1: 0.5 },
  lumps: { d: DETAIL.CHUNKS },
  crumble: { d: DETAIL.CHUNKS },
  waxy: { d: DETAIL.WAXY },
  pitted: { d: DETAIL.U_LUMPS, a1: "#5a5e66" },
  vent: { d: DETAIL.VENT, a1: "#ff8a2a", e1: 0.8 },
  pylon: { d: DETAIL.PYLON, a1: "#8ac8ff", e1: 0.6 },
  seed: { d: DETAIL.SEEDT },
  boulder: { d: DETAIL.BOULDER },
  // Topsoil
  loam: { d: DETAIL.PEBBLES, a1: "#9a8a78", a2: "#c7a25a" },
  clay: { d: DETAIL.STREAKS },
  gravel: { d: DETAIL.GRAVEL },
  sand: { d: DETAIL.GRAIN },
  hardpan: { d: DETAIL.STREAKS, a1: "#d8c8a0" },
  // Stone
  shale: { d: DETAIL.LAYERS },
  limestone: { d: DETAIL.PITS },
  granite: { d: DETAIL.SPECKLE, a1: "#b88a84", a2: "#2a2628" },
  timber: { d: DETAIL.PLANKS, a1: "#9aa0aa" },
  rubble: { d: DETAIL.CHUNKS },
  dolerite: { d: DETAIL.SPECKLE, a1: "#6a7a70", a2: "#1a201c" },
  // Crystal
  glassrock: { d: DETAIL.FLECKS, a1: "#9ad8ff" },
  quartzite: { d: DETAIL.CELLS },
  lining: { d: DETAIL.CRYSTAL, a1: "#d8f8ff", e1: 0.3 },
  crystal_lining: { d: DETAIL.CRYSTAL, a1: "#d8f8ff", e1: 0.3 },
  fused_glass: { d: DETAIL.SWIRL, a1: "#8a7060" },
  // Fungal
  mycelium: { d: DETAIL.THREADS, a1: "#d8d0dc" },
  rootstone: { d: DETAIL.ROOTVEIN, a1: "#9a8070" },
  mossbasalt: { d: DETAIL.MOSS, a1: "#5a8a4a" },
  moss: { d: DETAIL.MOSS, a1: "#5a8a4a" },
  mushroom: { d: DETAIL.FIBRES },
  fibres: { d: DETAIL.FIBRES },
  cap: { d: DETAIL.CAP, a1: "#5cffc8", e1: 0.8 },
  shelfstone: { d: DETAIL.LAYERS, a1: "#f0ece0" },
  // Magma
  scoria: { d: DETAIL.PORES },
  basalt: { d: DETAIL.HEX, a1: "#ff5a1a", e1: 0.6 },
  obsidian: { d: DETAIL.FACETS, a1: "#e8e8f0" },
  crust: { d: DETAIL.CRACKNET, a1: "#ff6a1a", e1: 0.9 },
  lava: { d: DETAIL.LAVA, a1: "#ff6a1a", a2: "#ffd27a", e1: 1.8, e2: 3.0 },
  // Ruins
  packed_rubble: { d: DETAIL.CHUNKS },
  brick: { d: DETAIL.BRICK },
  sower_brick: { d: DETAIL.BRICK },
  fill: { d: DETAIL.INLAY },
  concrete: { d: DETAIL.INLAY },
  old_concrete: { d: DETAIL.INLAY },
  vault_seal: { d: DETAIL.SEAL, a1: "#e0c040" },
  seal: { d: DETAIL.SEAL, a1: "#e0c040" },
  // Core
  pressure: { d: DETAIL.SWIRL, a1: "#fff2c0", e1: 0.9 },
  pressure_stone: { d: DETAIL.SWIRL, a1: "#fff2c0", e1: 0.9 },
  core_glass: { d: DETAIL.GLASS, a1: "#ff5a4a", e1: 0.6 },
  coreglass: { d: DETAIL.GLASS, a1: "#ff5a4a", e1: 0.6 },
  heartrock: { d: DETAIL.GOLDVEIN, a1: "#e0c040", e1: 0.5 },
  husk: { d: DETAIL.BARK, a1: "#6a2a20" },
  husk_plate: { d: DETAIL.BARK, a1: "#6a2a20" },
  // Planets
  ash: { d: DETAIL.GRAIN, a1: "#ff6a1a", e1: 0.5 },
  ash_bed: { d: DETAIL.GRAIN, a1: "#ff6a1a", e1: 0.5 },
  tuff: { d: DETAIL.PITS, a1: "#ff6a1a", e1: 0.5 },
  clinker: { d: DETAIL.FACETS, a1: "#8a8070" },
  welded_tuff: { d: DETAIL.STREAKS },
  rust: { d: DETAIL.GRAIN, a1: "#a85a30" },
  banded: { d: DETAIL.STRIPES, a1: "#a85a30", a2: "#c8d0d8" },
  banded_ironstone: { d: DETAIL.STRIPES, a1: "#a85a30", a2: "#c8d0d8" },
  jasper: { d: DETAIL.PITS },
  magnetite: { d: DETAIL.STRIPES, a1: "#3a3c44", a2: "#c8d0d8" },
  // Undiggable kinds
  granite_boulder: { d: DETAIL.U_ROUND },
  ironstone: { d: DETAIL.U_SEAMS, a1: "#5a3020" },
  black_prism: { d: DETAIL.U_PRISM },
  prism: { d: DETAIL.U_PRISM },
  petrified_root: { d: DETAIL.U_GRAIN },
  petrified: { d: DETAIL.U_GRAIN },
  cold_basalt: { d: DETAIL.U_COLUMN },
  column: { d: DETAIL.U_COLUMN },
  ward_stone: { d: DETAIL.U_WARD, a1: "#6a5a34" },
  ward: { d: DETAIL.U_WARD, a1: "#6a5a34" },
  null_rock: { d: DETAIL.U_NULL, a1: "#4a3a6a" },
  null: { d: DETAIL.U_NULL, a1: "#4a3a6a" },
  fused_slag: { d: DETAIL.U_LUMPS, a1: "#2a4a3a" },
  slag: { d: DETAIL.U_LUMPS, a1: "#2a4a3a" },
  meteoric_iron: { d: DETAIL.U_LUMPS, a1: "#5a5e66" },
  bedrock: { d: DETAIL.U_BEDROCK },
};

/** The look of an undiggable kind when content gives no palette of its own (art.md 3.5), by biome. */
export const UNDIGGABLE_PAL: [string, string, string, string][] = [
  ["#14161c", "#2a2e38", "#343946", "#4a5262"],
  ["#12141a", "#24262e", "#2e3038", "#40424c"],
  ["#0e0e16", "#1e1e2a", "#282836", "#3a3a4c"],
  ["#16120e", "#2c2620", "#36302a", "#4a4238"],
  ["#16181e", "#2c3038", "#363a44", "#4a505c"],
  ["#0c1614", "#1a2a28", "#223430", "#304642"],
  ["#060608", "#121216", "#18181e", "#24242c"],
  ["#0c120e", "#1a2620", "#223028", "#2e4034"],
  ["#121212", "#262624", "#302e2c", "#423e3a"],
];

// ---------------------------------------------------------------- ores (art.md 3.3)

export const CLASSES = ["speck", "vein", "dendrite", "nugget", "band", "block", "spike", "ring", "gem", "orb", "star", "plate", "drop"] as const;
export type OreClass = (typeof CLASSES)[number];

/** art.md's class per ore when content does not say (`Find.cls` wins). */
export const ORE_CLASS: Record<string, OreClass> = {
  coal: "speck", copper: "vein", tin: "nugget", iron: "band", lead: "block", silver: "dendrite", gold: "nugget",
  quartz: "spike", amethyst: "ring", sapphire: "gem", emerald: "block", sporestone: "vein", jade: "band",
  moonstone: "orb", lumen_amber: "drop", amber: "drop", cinnabar: "spike", platinum: "nugget", fire_opal: "orb", opal: "orb",
  diamond: "star", sower_scrap: "plate", scrap: "plate", orichalcum: "vein", voidstone: "ring", sunglass: "gem",
  heartstone: "orb", stellite: "block", seedglass: "drop", sunstone: "gem", lodestone: "speck",
};

/** Fallback for the 6 coarse OreShape values. */
export const SHAPE_CLASS: Record<string, OreClass> = { nugget: "nugget", vein: "vein", gem: "gem", cluster: "block", orb: "orb", relic: "plate" };

/** Ores with a special treatment in the shader (bit flags in the find table). */
export const FIND_FX: Record<string, number> = { moonstone: 1, voidstone: 2, heartstone: 4, seedglass: 8, moonpearl: 1, seed_tear: 8 };
