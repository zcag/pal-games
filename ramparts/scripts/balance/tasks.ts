// One unit of simulator work (a run, or a learning player's career) and its compact summary.
// Shared by scripts/sim.ts and its workers.
import type { CommanderId, RelicId, TowerId } from "../../game/types.ts";
import { newRun } from "../../game/run/index.ts";
import { gainBoon, gainRelic, gainTower, type Run } from "../../game/run/state.ts";
import { fullProfile } from "../../game/meta.ts";
import { career, playRun, type RunLog } from "../../game/bot/run.ts";
import { ACTS } from "../../game/content/battle/acts.ts";
import { ENEMIES } from "../../game/content/battle/enemies.ts";
import { TOWERS } from "../../game/content/battle/towers.ts";
import { SPELLS, SPELL_NUM } from "../../game/content/battle/spells.ts";

/** Experiments: TUNE='{"acts.2.hpMul":1.2,"enemies.bat.hp":18}' patches content numbers in every worker. */
export function applyTune(json = process.env.TUNE) {
  if (!json) return;
  const roots: Record<string, unknown> = { acts: ACTS, enemies: ENEMIES, towers: TOWERS, spells: SPELLS, spell: SPELL_NUM };
  for (const [path, v] of Object.entries(JSON.parse(json) as Record<string, unknown>)) {
    const ks = path.split(".");
    let o = roots[ks[0]!] as Record<string, unknown>;
    for (const k of ks.slice(1, -1)) o = o[k] as Record<string, unknown>;
    o[ks[ks.length - 1]!] = v;
  }
}
applyTune();

export interface RunTask {
  t: "run";
  persona: string;
  k: number;
  commander: CommanderId;
  asc: number;
  seed: number;
  explore?: number;
  /** Given at the start (lift experiments). */
  grant?: { relics?: RelicId[]; towers?: TowerId[]; boons?: [string, TowerId][] };
  tag?: string;
}
export interface CareerTask { t: "career"; persona: string; seed: number; runs: number }
export type Task = RunTask | CareerTask;

export interface BattleSum {
  act: number; floor: number; kind: string; won: boolean; lost: number; ticks: number; calls: number; casts: number;
  gold: number[]; leakBy: Record<string, number>; built: [TowerId, number, string | null, number, number][]; leaks: number[];
}
export interface RunSum {
  persona: string; commander: CommanderId; asc: number; k: number; seed: number; tag?: string;
  won: boolean; act: number; floor: number; by?: string; boss?: string; bossHpLeft?: number; nodes: number; kinds: string[];
  battles: BattleSum[]; offers: [string, boolean, boolean][]; relics: string[]; boons: string[]; towers: TowerId[];
  bossesMet: string[]; bossesWon: string[];
}
export interface CareerSum { persona: string; seed: number; runs: { n: number; k: number; won: boolean; act: number; floor: number; renown: number; unlocks: string[] }[]; first: RunSum }

export function sumRun(log: RunLog, meta: { persona: string; k: number; seed: number; tag?: string }): RunSum {
  const r = log.run;
  return {
    persona: meta.persona, commander: r.commander, asc: r.ascension, k: meta.k, seed: meta.seed, tag: meta.tag,
    won: !!r.over?.won, act: r.over?.act ?? r.act, floor: r.over?.floor ?? r.floor, by: r.over?.by, boss: r.over?.boss, bossHpLeft: r.over?.bossHpLeft,
    nodes: r.history.length, kinds: r.history.map((h) => h.kind),
    battles: log.battles.map((b) => ({
      act: b.act, floor: b.floor, kind: b.kind, won: b.result.won, lost: b.result.stats.livesLost, ticks: b.result.ticks ?? 0,
      calls: b.calls, casts: b.casts, leakBy: b.leakBy, gold: b.goldAt.map((g) => g ?? 0), leaks: b.waveLeaks.map((x) => x ?? 0),
      built: b.built.map((t) => [t.kind, t.level, t.spec, Math.round(t.damage), t.invested] as [TowerId, number, string | null, number, number]),
    })),
    offers: log.offers.map((o) => [o.key, o.picked, o.explore]),
    relics: [...r.loadout.relics], boons: [...r.loadout.boons], towers: [...r.loadout.towers],
    bossesMet: [...(r.book?.bossesMet ?? [])], bossesWon: [...(r.book?.bossesWon ?? [])],
  };
}

export function runTask(t: Task): RunSum | CareerSum {
  if (t.t === "career") {
    const c = career(t.seed, t.runs, { until: "win" });
    return {
      persona: t.persona, seed: t.seed,
      runs: c.runs.map((x) => ({ n: x.n, k: x.k, won: x.won, act: x.act, floor: x.floor, renown: x.renown, unlocks: x.unlocks })),
      first: sumRun(c.runs[0]!.log, { persona: t.persona, k: c.runs[0]!.k, seed: t.seed }),
    };
  }
  const r = newRun({ seed: t.seed, commander: t.commander, ascension: t.asc, profile: fullProfile() }) as Run;
  for (const id of t.grant?.relics ?? []) gainRelic(r, id);
  for (const id of t.grant?.towers ?? []) if (!r.loadout.towers.includes(id)) gainTower(r, id);
  for (const [b, tw] of t.grant?.boons ?? []) gainBoon(r, b, tw);
  const log = playRun(r, { k: t.k, seed: t.seed, explore: t.explore });
  return sumRun(log, { persona: t.persona, k: t.k, seed: t.seed, tag: t.tag });
}
