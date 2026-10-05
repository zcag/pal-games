// Run economy numbers (content.md 11 with R17, R18; run-meta.md 3-4).
import type { Act, NodeKind, Rarity } from "../../types.ts";

export const START = { crowns: 30, lives: 20, nestEgg: 25, wall: 2, a4Missing: 4 };

/** Crowns per battle by act; elites x2; +5 with no lives lost. */
export const BATTLE_CROWNS: Record<Act, number> = { 1: 12, 2: 16, 3: 20, 4: 24 };
export const CLEAN_CROWNS = 5;
export const BOSS_CROWNS: Record<Act, number> = { 1: 40, 2: 55, 3: 70, 4: 0 };
export const SKIP_CROWNS: Record<Act, number> = { 1: 10, 2: 14, 3: 18, 4: 22 };
/** R17: leftover gold per crown by act, max 12. Ledger: 5 per crown, max 20. */
export const LEFTOVER_RATE: Record<Act, number> = { 1: 10, 2: 14, 3: 18, 4: 22 };
export const LEFTOVER_MAX = 12;
export const LEDGER = { rate: 5, max: 20 };
export const SUPPLY_LINES_CROWNS = 3;
export const COIN_PURSE_CROWNS = 6;
export const REPLACED_BOON_CROWNS = 10;

export type Weights = Partial<Record<Rarity, number>>;

/** Card rarity by source (11.3); rare gets + pity. */
export const CARD_RARITY: Record<"battle" | "elite" | "boss" | "ambush" | "shop", Weights> = {
  battle: { common: 62, uncommon: 33, rare: 5 },
  elite: { uncommon: 75, rare: 25 },
  boss: { rare: 100 },
  ambush: { common: 40, uncommon: 50, rare: 10 },
  shop: { common: 55, uncommon: 35, rare: 10 },
};
export const SLOT_C_RELIC = 0.04;
export const SLOT_C_BLUEPRINT = 0.3;
export const RELIC_RARITY: Record<"wild" | "elite" | "treasure" | "shop" | "dig" | "event", Weights> = {
  wild: { common: 55, uncommon: 35, rare: 10 },
  elite: { common: 45, uncommon: 40, rare: 15 },
  treasure: { common: 55, uncommon: 35, rare: 10 },
  shop: { common: 45, uncommon: 40, rare: 15 },
  dig: { common: 50, uncommon: 35, rare: 15 },
  event: { common: 50, uncommon: 35, rare: 15 },
};
/** Slot B blueprint share by blueprints owned (3, 4, 5, 6). */
export const SLOT_B_BLUEPRINT: Record<number, number> = { 3: 0.8, 4: 0.55, 5: 0.35, 6: 0.15 };
export const CORE = { perBoon: 0.75, cap: 4, hot: 0.5, hotShare: 0.15 };
export const SYNERGY_WEIGHT = 2.5;
export const RELIC_TAG_WEIGHT = 3;
export const MAX_CARDS = 5;
export const MAX_TOWERS = 6;
/** R18: blueprints 5 and 6 each raise every L1 cost by 5%. */
export const WIDE_COST_PCT = 5;

export const SHOP = {
  blueprint: { common: 50, uncommon: 75, rare: 110 } as Weights,
  boon: { common: 40, uncommon: 60, rare: 90 } as Weights,
  relic: { common: 110, uncommon: 150, rare: 200, shop: 130, boss: 150 } as Weights,
  counts: { blueprints: 2, boons: 3, relics: 2, shopRelics: 1, supplies: 2 },
  mend: { price: 40, lives: 5 },
  lift: { price: 60, step: 20 },
  restock: 25,
  roll: 0.1,
  floor: 0.5,
  mods: { guildSeal: -20, supplyLines: -15, hollowCrown: 100, mirage: -50 },
};

export const REST = { pct: 35, a5Pct: 25, rations: 4, fortify: 2 };
export const BOSS_HEAL = { frac: 1 / 2, a5Frac: 1 / 3 };
export const TREASURE_CROWNS = [15, 25] as const;

/** ? node outcome chances (11.8), base and pity step, in points. */
export const UNKNOWN = {
  event: 75,
  battle: { base: 10, step: 10 },
  shop: { base: 8, step: 3 },
  treasure: { base: 7, step: 2 },
  bellMul: 3,
  actEvent: 0.4,
  unseenMul: 2,
  merchantShare: 1 / 12,
};

/** Map node-type weights per floor (run-meta.md 1), acts I-III. */
export const FLOOR_WEIGHTS: Record<number, Partial<Record<NodeKind, number>>> = {
  2: { battle: 50, elite: 10, event: 30, forge: 20 },
  3: { battle: 30, elite: 15, event: 25, shop: 15, forge: 15, bounty: 10 },
  4: { battle: 25, elite: 20, event: 20, shop: 10, forge: 10, bounty: 15 },
  5: { battle: 25, elite: 25, event: 15, shop: 20, forge: 15, bounty: 10 },
};

export const FORGE = { hone: 3, honeBellows: 4, temper: 2, temperBellows: 3, recast: 3, recastMin: 4, hone_rarity: { common: 40, uncommon: 45, rare: 15 } as Weights };

export const BOUNTY_EXTRA = { relicChance: 0.25, relics: 2 };
