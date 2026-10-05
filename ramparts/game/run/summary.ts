// The end-of-run summary (run-meta.md 10): result line, path, war table, damage by tower,
// highlights and the "almost won" lines. Every line comes straight from the run's numbers.
import type { Act, ActMap, BoonId, RelicId, RunState, TowerId } from "../types.ts";
import { ACT_NAMES, BOSS_INFO } from "../content/run/map.ts";
import { TOWERS } from "../content/run/towers.ts";
import { boonsOf, type Run } from "./state.ts";

export interface RunSummary {
  won: boolean;
  result: string;
  seed: number;
  /** Each act map with the path taken; `how` colours visited nodes by lives lost. */
  path: { act: Act; map: ActMap; visited: { node: number; how: "clean" | "some" | "many" | "other" }[] }[];
  table: { towers: { tower: TowerId; boons: BoonId[]; tempered: number; stars: number }[]; relics: RelicId[]; curses: string[] };
  damage: { tower: TowerId; damage: number; share: number }[];
  top: TowerId | null;
  highlights: string[];
  almost: string[];
  floors: number;
}

const ROMAN: Record<Act, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

export function resultLine(run: RunState): string {
  const o = run.over;
  if (!o) return "";
  if (o.won) return "Victory at the Ember Citadel";
  const where = `act ${ROMAN[o.act]}, floor ${o.floor}`;
  if (o.boss) return `Fell to ${BOSS_INFO[o.boss].name.replace(/^The /, "the ")}, ${where}`;
  if (o.by === "abandoned") return `Left the road, ${where}`;
  return `Fell to ${o.by ?? "the road"}, ${where}`;
}

export function summary(run: RunState): RunSummary {
  const r = run as Run, o = r.over;
  const maps = r.book.maps.map((m, i) => (i === r.act - 1 ? r.map : m));
  const path = maps.slice(0, r.act).map((map) => ({
    act: map.act, map,
    visited: r.history.filter((h) => h.act === map.act).map((h) => ({
      node: h.node,
      how: h.lost === undefined ? "other" as const : h.lost === 0 ? "clean" as const : h.lost <= 3 ? "some" as const : "many" as const,
    })),
  }));
  const total = Object.values(r.stats.damageBy).reduce((a, b) => a + (b ?? 0), 0);
  const damage = (Object.entries(r.stats.damageBy) as [TowerId, number][])
    .map(([tower, d]) => ({ tower, damage: Math.round(d), share: total ? d / total : 0 }))
    .sort((a, b) => b.damage - a.damage);
  const towers = r.loadout.towers.map((t) => {
    const boons = boonsOf(r, t);
    return { tower: t, boons, tempered: boons.filter((b) => r.loadout.tempered.includes(b)).length, stars: boons.length >= 5 ? 2 : boons.length >= 3 ? 1 : 0 };
  });

  const highlights: string[] = [];
  if (r.stats.biggestHit > 0) highlights.push(`Biggest hit: ${Math.round(r.stats.biggestHit)}.`);
  if (r.book.best.kills > 0) highlights.push(`Most kills in a battle: ${r.book.best.kills}, ${r.book.best.killsAt}.`);
  for (const b of r.book.best.perfectBosses) highlights.push(`${BOSS_INFO[b].name} fell without a single life lost.`);
  if (o?.won && r.loadout.lives <= 3) highlights.push(`Won with ${r.loadout.lives} ${r.loadout.lives === 1 ? "life" : "lives"} left.`);
  else if (r.book.best.closest <= 3) highlights.push(`Closest call: ${r.book.best.closest} ${r.book.best.closest === 1 ? "life" : "lives"} left after a battle.`);
  if (r.book.best.crowns >= 100) highlights.push(`Most crowns held: ${r.book.best.crowns}.`);

  const almost: string[] = [];
  if (o && !o.won && o.boss && o.bossHpLeft !== undefined)
    almost.push(`${BOSS_INFO[o.boss].name} had ${Math.max(1, Math.round(o.bossHpLeft * 100))}% health left.`);
  if (o && !o.won && o.livesShort !== undefined && o.livesShort > 0) {
    const next = r.map.nodes[r.at]?.next.map((id) => r.map.nodes[id]!.kind) ?? [];
    const what = next.includes("rest") ? "reached the camp" : next.includes("boss") ? "reached the boss" : "won that battle";
    almost.push(`${o.livesShort} more ${o.livesShort === 1 ? "life" : "lives"} and you'd have ${what}.`);
  }

  return {
    won: !!o?.won, result: resultLine(r), seed: r.seed, path,
    table: { towers, relics: [...r.loadout.relics], curses: [...r.loadout.curses] },
    damage, top: damage[0]?.tower ?? null,
    highlights: highlights.slice(0, 3), almost, floors: r.book.floors,
  };
}

export const actName = (a: Act) => ACT_NAMES[a];
export const towerName = (t: TowerId) => TOWERS[t].name;
