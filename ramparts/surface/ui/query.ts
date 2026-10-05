// Battle read helpers the UI uses: a thin layer over game/battle/query.ts (exact costs with every
// discount, ranges with buffs, call bonus, interest cap, wave previews). The UI never computes rules.
import type { Battle, Pad, SpecId, Tower, TowerId, WavePlan } from "../../game/types.ts";
import * as Q from "../../game/battle/query.ts";
import { X } from "../../game/battle/internal.ts";
import { has } from "../../game/battle/mods.ts";
import { ENEMIES } from "../../game/content/battle/enemies.ts";

export interface TowerStats { range: number; damage?: string | number; interval?: number; air: boolean }

const live = (b: Battle | null): b is Battle => !!b && !!X(b);
const mods = (b: Battle) => (live(b) ? X(b).mods : null);

/** Numbers for a tower at a level/spec: the built tower's live range when given, else the previewed one. */
export function statsOf(b: Battle | null, kind: TowerId, level: number, spec: SpecId | null, pad?: Pad, t?: Tower): TowerStats {
  const i = Q.towerInfo(kind, level, spec);
  const range = live(b) ? (t ? Q.rangeOf(b, t) : Q.towerRange(b, kind, level, spec, pad)) : i.range * (pad?.high ? 1.15 : 1);
  const damage = i.damage ? (kind === "pyre" || kind === "thornwood" ? `${Math.round(i.damage)}/s` : Math.round(i.damage * 10) / 10) : undefined;
  return { range: Math.round(range * 10) / 10, damage, interval: i.rate ? Math.round((1 / i.rate) * 100) / 100 : undefined, air: i.reach === "air + ground" };
}

export const buildCost = (b: Battle, kind: TowerId) => Q.buildCost(b, kind);
export const upgradeCost = (b: Battle, t: Tower) => Q.upgradeCost(b, t);
export const specOptions = (b: Battle, t: Tower) => Q.specOptions(b, t).map((o) => ({ spec: o.id, cost: o.cost, twin: o.twin }));
/** Refund, or null while selling is locked (the last wave). */
export const sellValue = (b: Battle, t: Tower) => Q.sellValue(b, t);
export const canSell = (b: Battle) => !b.towers.length || Q.sellValue(b, b.towers[0]!) !== null;
export const clearCost = (_b: Battle, p: Pad) => p.rubble ?? 0;
export const canBuild = (b: Battle, pad: number, kind: TowerId) => Q.canBuild(b, pad, kind);
export const auraTargets = (b: Battle, t: Tower) => Q.auraTargets(b, t);

/** The waves the skull previews (two with Foresight). */
export function nextWaves(b: Battle, n?: number): WavePlan[] { return b.waves.slice(b.next, b.next + (n ?? (mods(b) && has(mods(b)!, "foresight") ? 2 : 1))); }
export const wavePreview = (b: Battle) => Q.nextWaves(b);

export const callBonus = (b: Battle) => Q.callBonus(b);
export const countdownTotal = (b: Battle) => Q.countdownTotal(b);
export const interestCap = (b: Battle) => Q.interestCap(b);

/** Lives a role costs when it gets through. */
export const leakCost = (kind: string, elite = false) => { const l = ENEMIES[kind as keyof typeof ENEMIES]?.leak ?? 1; return elite ? Math.max(3, l) : l; };

export const towerOn = (b: Battle, pad: number) => b.towers.find((t) => t.pad === pad) ?? null;
