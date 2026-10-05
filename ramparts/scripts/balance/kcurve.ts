// lives lost per battle by bot knowledge k (same battles), to check the bot gets better with k
import type { TowerId } from "../../game/types.ts";
import { playBattle } from "../../game/bot/battle.ts";
import { loadout } from "../../game/battle/testkit.ts";
import { applyTune } from "./tasks.ts";
applyTune();
const towers = (process.argv[2] ?? "archer,barracks,mage").split(",") as TowerId[];
const act = +(process.argv[3] ?? 1) as 1, n = +(process.argv[4] ?? 30), kind = (process.argv[5] ?? "battle") as "battle";
for (const k of [0.2, 0.4, 0.6, 0.75, 0.9]) {
  let lost = 0, ticks = 0, calls = 0, casts = 0;
  for (let s = 1; s <= n; s++) {
    const l = playBattle({ seed: s * 31, act, kind, floor: 1 + (s % 5), loadout: loadout({ towers, lives: 999, maxLives: 999, relics: ["old-standard"] }) }, { k, seed: s });
    lost += l.result.stats.livesLost; ticks += l.result.ticks!; calls += l.calls; casts += l.casts;
  }
  console.log(`k ${k}: lost ${(lost / n).toFixed(1)}  len ${(ticks / n / 30).toFixed(0)} s  calls ${(calls / n).toFixed(1)}  casts ${(casts / n).toFixed(1)}`);
}
