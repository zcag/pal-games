// Drive a whole run with a chooser and a battle function: used by tests, and a starting point
// for the balance bot's run layer.
import type { BattleArgs, BattleResult, RunState } from "../types.ts";
import { battleFor, choices, choose, finishBattle, type Choice } from "./index.ts";

export interface Driver {
  /** Pick a choice key on the current screen. */
  choose: (run: RunState, options: Choice[]) => string;
  /** Play the battle (or stub it). */
  battle: (args: BattleArgs, run: RunState) => BattleResult;
  maxSteps?: number;
  onStep?: (run: RunState) => void;
}

export function drive(start: RunState, d: Driver): RunState {
  let run = start;
  for (let i = 0; i < (d.maxSteps ?? 5000) && !run.over; i++) {
    if (run.screen.s === "battle") run = finishBattle(run, d.battle(battleFor(run), run));
    else {
      const opts = choices(run);
      if (!opts.length) throw new Error(`stuck on ${run.screen.s}`);
      run = choose(run, d.choose(run, opts));
    }
    d.onStep?.(run);
  }
  return run;
}

/** A plain chooser: the first choice that isn't greyed, preferring `prefer` keys/prefixes in order. */
export function firstChoice(prefer: string[] = []) {
  return (_run: RunState, opts: Choice[]): string => {
    const live = opts.filter((o) => !o.disabled);
    for (const p of prefer) { const o = live.find((x) => x.key === p || x.key.startsWith(p)); if (o) return o.key; }
    return (live[0] ?? opts[0]!).key;
  };
}

/** A stub battle: won (or lost) with `leaks` lives lost and some gold left. */
export function stubBattle(o: { leaks?: number; won?: boolean; gold?: number; damage?: Partial<Record<string, number>> } = {}) {
  return (args: BattleArgs): BattleResult => {
    const lives = args.loadout.lives - (o.leaks ?? 0);
    const won = (o.won ?? true) && lives > 0;
    const towers = args.loadout.towers;
    return {
      won, livesLeft: Math.max(0, lives), leaked: o.leaks ?? 0, goldLeft: o.gold ?? 100,
      stats: {
        leaked: o.leaks ?? 0, livesLost: o.leaks ?? 0, kills: 40, goldEarned: 500, calledEarly: 0, spellsCast: 2, sold: 0,
        damageBy: o.damage ?? Object.fromEntries(towers.map((t, i) => [t, 1000 * (towers.length - i)])), biggestHit: 120, maxPads: 6, maxGold: 300,
      },
      bountyOk: true, elitesKilled: true, ghost: [], ticks: 30 * 150,
    };
  };
}
