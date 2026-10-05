import { describe, expect, test } from "bun:test";
import { newRun } from "../ramparts/game/run/index.ts";
import { fullProfile, newProfile } from "../ramparts/game/meta.ts";
import { playRun } from "../ramparts/game/bot/run.ts";
import { playBattle } from "../ramparts/game/bot/battle.ts";
import { loadout } from "../ramparts/game/battle/testkit.ts";

// The rest of the seeds and the "most of the time" rate run in `bun ramparts/scripts/sweep.ts`.
const FULL = process.env.RAMPARTS_SWEEP === "1";

describe("balance bot", () => {
  test("a seeded run replays exactly and always ends", () => {
    const go = (seed: number) => playRun(newRun({ seed, commander: "marshal", ascension: 0, profile: newProfile(), firstRun: true }), { k: 0.4, seed });
    const a = go(3), b = go(3);
    expect(JSON.stringify(a.run.history)).toBe(JSON.stringify(b.run.history));
    expect(a.run.over).toBeDefined();
    expect(a.battles.length).toBeGreaterThan(0);
    for (const seed of FULL ? [4, 5] : []) expect(go(seed).run.over).toBeDefined();
  }, 60_000);

  test.if(FULL)("a decent bot clears act I with the Marshal most of the time", () => {
    let through = 0;
    // ~80% clear act I (80 seeds, design/balance.md); 16 seeds keep this a guard, not a coin flip
    const seeds = Array.from({ length: 16 }, (_, i) => 11 + i);
    for (const seed of seeds) {
      const log = playRun(newRun({ seed, commander: "marshal", ascension: 0, profile: fullProfile() }), { k: 0.6, seed, stopAt: 2 });
      if (log.run.act >= 2 && !log.run.over) through++;
    }
    expect(through).toBeGreaterThanOrEqual(10);
  }, 120_000);

  test("knowing more leaks less: an expert beats a novice on the same act I battles", () => {
    let novice = 0, expert = 0;
    for (const seed of [1, 2, 3, 4]) {
      const args = { seed: seed * 53, act: 1 as const, kind: "battle" as const, floor: 2, loadout: loadout({ towers: ["archer", "barracks", "mage"], lives: 99, maxLives: 99 }) };
      novice += playBattle(args, { k: 0.2, seed }).result.stats.livesLost;
      expert += playBattle(args, { k: 0.9, seed }).result.stats.livesLost;
    }
    expect(expert).toBeLessThanOrEqual(novice);
  }, 60_000);
});
