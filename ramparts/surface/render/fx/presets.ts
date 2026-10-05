// Particle presets. Over-layer things (sparks, embers, shards) are small and brief; under-layer
// things (smoke, dust) are big and soft and always sit behind units (depth pushed).
import { C } from "./gl/atlas.ts";
import { BODY, F_BOUNCE, F_FADEIN, F_GROW, F_STRETCH, OVER, UNDER, type Preset } from "./particles.ts";
import { K } from "./palette.ts";

export const P = {
  spark: { life: [0.12, 0.24], speed: [2.5, 5], shape: 0, up: 1, size: [0.07, 0.11], grow: 0.4, cell: C.SPARK, c0: K.white, e0: 2.2, e1: 1, grav: 9, drag: 3, layer: BODY, flags: F_STRETCH } as Preset,
  sparkBig: { life: [0.2, 0.38], speed: [3.5, 7], shape: 1, up: 1.5, size: [0.1, 0.16], grow: 0.3, cell: C.SPARK, c0: K.white, e0: 2.6, e1: 1.2, grav: 10, drag: 2, flags: F_STRETCH } as Preset,
  star: { life: [0.25, 0.4], speed: [1.5, 3], shape: 0, size: [0.18, 0.26], grow: 0.2, cell: C.SPARK, c0: K.gold, e0: 2.4, e1: 1, drag: 4, spin: 6 } as Preset,
  ember: { life: [0.5, 1.0], speed: [0.2, 0.6], shape: 1, up: 0.9, size: [0.05, 0.08], grow: 0.3, cell: C.DOT, c0: K.fireCore, c1: K.fireDeep, e0: 2, e1: 1, drag: 1, jitter: 0.15 } as Preset,
  flame: { life: [0.28, 0.45], speed: [0.1, 0.4], shape: 1, up: 1.1, size: [0.22, 0.32], grow: 0.35, cell: C.FLAME, c0: K.fireHot, c1: K.fireDeep, e0: 1.8, e1: 0.9, a: 0.95, jitter: 0.12 } as Preset,
  coneFlame: { life: [0.34, 0.5], speed: [4.5, 6.5], shape: 3, spread: 0.36, up: 0.5, size: [0.2, 0.3], grow: 3.4, cell: C.SMOKE, c0: K.fireCore, c1: K.fireDeep, e0: 2.0, e1: 0.9, a: 0.85, k: 0.12, drag: 1.0, spin: 3, flags: F_GROW } as Preset,
  coneSmoke: { life: [0.5, 0.8], speed: [2.5, 4], shape: 3, spread: 0.3, up: 0.6, size: [0.3, 0.4], grow: 2.4, cell: C.SMOKE, c0: K.smoke, a: 0.38, k: 1, layer: UNDER, drag: 2.5, flags: F_FADEIN | F_GROW } as Preset,
  fireball: { life: [0.24, 0.4], speed: [0.9, 2.4], shape: 0, up: 0.7, size: [0.42, 0.62], grow: 1.8, cell: C.GLOW, c0: K.fireball, c1: K.fireDark, e0: 1.9, e1: 0.7, drag: 4, flags: F_GROW } as Preset,
  smoke: { life: [0.7, 1.0], speed: [0.3, 0.8], shape: 1, up: 0.5, size: [0.4, 0.6], grow: 2.0, cell: C.SMOKE, c0: K.smoke, a: 0.5, k: 1, layer: UNDER, drag: 1.5, spin: 0.6, flags: F_FADEIN | F_GROW, jitter: 0.2 } as Preset,
  smokeThin: { life: [0.9, 1.4], speed: [0.1, 0.3], shape: 1, up: 0.5, size: [0.2, 0.3], grow: 2.4, cell: C.SMOKE, c0: K.smokeLight, a: 0.3, k: 1, layer: UNDER, spin: 0.5, flags: F_FADEIN | F_GROW } as Preset,
  dust: { life: [0.45, 0.7], speed: [0.8, 1.6], shape: 2, up: 0.25, size: [0.25, 0.4], grow: 2.0, cell: C.SMOKE, c0: K.dust, a: 0.42, k: 1, layer: UNDER, drag: 3, spin: 0.8, flags: F_FADEIN | F_GROW } as Preset,
  debris: { life: [0.5, 0.75], speed: [2, 4], shape: 1, up: 2.5, size: [0.06, 0.1], cell: C.CHUNK, c0: K.scorch, a: 1, k: 1, grav: 14, spin: 12, flags: F_BOUNCE } as Preset,
  ice: { life: [0.45, 0.7], speed: [2, 4.2], shape: 1, up: 1.5, size: [0.1, 0.18], cell: C.SHARD, c0: K.iceCore, e0: 1.5, e1: 1, a: 1, k: 0.6, grav: 12, spin: 14, flags: F_BOUNCE } as Preset,
  frostMote: { life: [0.5, 0.9], speed: [0.05, 0.2], shape: 0, up: -0.3, size: [0.05, 0.08], cell: C.DOT, c0: K.ice, e0: 1.1, a: 0.85, k: 0.4, jitter: 0.2 } as Preset,
  frostPuff: { life: [0.35, 0.6], speed: [0.6, 1.6], shape: 2, up: 0.2, size: [0.25, 0.35], grow: 1.8, cell: C.SMOKE, c0: K.ice, a: 0.35, k: 0.8, layer: UNDER, drag: 3, flags: F_FADEIN | F_GROW } as Preset,
  steam: { life: [0.6, 0.9], speed: [0.1, 0.3], shape: 1, up: 0.6, size: [0.18, 0.26], grow: 2.2, cell: C.SMOKE, c0: K.cloth, a: 0.3, k: 1, layer: UNDER, flags: F_FADEIN | F_GROW } as Preset,
  magic: { life: [0.2, 0.35], speed: [1.5, 3], shape: 0, size: [0.08, 0.12], grow: 0.3, cell: C.DOT, c0: K.violetCore, c1: K.violet, e0: 2, e1: 1, drag: 4, layer: BODY } as Preset,
  hexMote: { life: [0.4, 0.6], speed: [0.2, 0.6], shape: 1, up: 0.5, size: [0.07, 0.1], cell: C.DOT, c0: K.hex, e0: 1.3, drag: 2 } as Preset,
  green: { life: [0.5, 0.8], speed: [0.2, 0.5], shape: 1, up: 0.8, size: [0.06, 0.09], cell: C.DOT, c0: K.heal, e0: 1.2, drag: 1, jitter: 0.2 } as Preset,
  glass: { life: [0.35, 0.55], speed: [1.5, 3.2], shape: 1, up: 1, size: [0.07, 0.11], cell: C.SHARD, c0: K.glass, e0: 1.2, k: 0.5, grav: 12, spin: 14, flags: F_BOUNCE } as Preset,
  acidSplash: { life: [0.3, 0.5], speed: [1.2, 2.6], shape: 1, up: 1.2, size: [0.07, 0.11], cell: C.DROP, c0: K.acid, e0: 1, k: 0.7, grav: 12 } as Preset,
  oilSplash: { life: [0.3, 0.5], speed: [1.2, 2.6], shape: 1, up: 1.2, size: [0.08, 0.12], cell: C.DROP, c0: K.oil, k: 1, grav: 12 } as Preset,
  coinGlint: { life: [0.3, 0.5], speed: [0.5, 1.4], shape: 1, up: 0.8, size: [0.1, 0.16], grow: 0.2, cell: C.SPARK, c0: K.gold, e0: 1.6, drag: 3, spin: 4 } as Preset,
  goldDust: { life: [0.6, 1.0], speed: [0.1, 0.4], shape: 1, up: 0.9, size: [0.05, 0.08], cell: C.DOT, c0: K.gold, e0: 1.4, drag: 1, jitter: 0.5 } as Preset,
  stormSpark: { life: [0.1, 0.2], speed: [2, 5], shape: 0, size: [0.06, 0.1], grow: 0.3, cell: C.SPARK, c0: K.stormCore, e0: 3, e1: 1.5, drag: 5, flags: F_STRETCH } as Preset,
  leaf: { life: [0.6, 1.0], speed: [0.8, 2], shape: 1, up: 1.2, size: [0.1, 0.15], cell: C.LEAF, c0: K.moss, k: 1, grav: 4, drag: 2, spin: 8 } as Preset,
  thornChip: { life: [0.4, 0.6], speed: [1, 2.5], shape: 1, up: 1.5, size: [0.08, 0.12], cell: C.THORN, c0: K.root, k: 1, grav: 10, spin: 10 } as Preset,
  wisp: { life: [0.25, 0.32], speed: [0, 0.1], shape: 1, up: 4, size: [0.22, 0.3], grow: 0.2, cell: C.GLOW, c0: K.white, e0: 0.9, a: 0.7, k: 0.3, drag: 6 } as Preset,
  hexShard: { life: [0.35, 0.55], speed: [1.5, 3], shape: 0, size: [0.12, 0.18], grow: 0.5, cell: C.HEX, c0: K.shield, e0: 1.3, k: 0.4, grav: 6, spin: 10 } as Preset,
  sand: { life: [0.5, 0.9], speed: [1.5, 3.2], shape: 1, up: 2, size: [0.2, 0.32], grow: 1.8, cell: C.SMOKE, c0: [0.62, 0.5, 0.3], a: 0.55, k: 1, layer: UNDER, grav: 3, drag: 1.5, flags: F_GROW | F_FADEIN } as Preset,
  heart: { life: [0.7, 1.0], speed: [0.2, 0.5], shape: 1, up: 1.4, size: [0.16, 0.22], cell: C.HEART, c0: [1, 0.12, 0.15], e0: 1.4, drag: 1.5 } as Preset,
  light: { life: [0.5, 0.9], speed: [0.05, 0.2], shape: 1, up: 1.8, size: [0.06, 0.1], cell: C.DOT, c0: K.gold, e0: 1.8, jitter: 0.3 } as Preset,
} satisfies Record<string, Preset>;
export { BODY, OVER, UNDER };
