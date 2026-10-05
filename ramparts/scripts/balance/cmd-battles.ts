// each commander's starting war table in act I battles (floors 1-3), lives lost by k
import type { CommanderId } from "../../game/types.ts";
import { playBattle } from "../../game/bot/battle.ts";
import { loadout } from "../../game/battle/testkit.ts";
import { COMMANDERS, COMMANDER_IDS } from "../../game/content/run/commanders.ts";
import { applyTune } from "./tasks.ts";
applyTune();
const n = +(process.env.N ?? 24), act = +(process.env.ACT ?? 1) as 1;
for (const c of COMMANDER_IDS as CommanderId[]) {
  const row: string[] = [];
  for (const k of [0.2, 0.6, 0.9]) {
    let lost = 0, by: Record<string, number> = {};
    for (let s = 1; s <= n; s++) {
      const l = playBattle({ seed: s * 53, act, kind: "battle", floor: 1 + (s % 3), loadout: loadout({ commander: c, towers: [...COMMANDERS[c].towers], relics: [COMMANDERS[c].relic], lives: 999, maxLives: 999 }) }, { k, seed: s });
      lost += l.result.stats.livesLost;
      for (const [kk, v] of Object.entries(l.leakBy)) by[kk] = (by[kk] ?? 0) + v;
    }
    row.push(`k${k} ${(lost / n).toFixed(1)}`);
    if (k === 0.6) row.push(`(${Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([kk, v]) => `${kk} ${(v / n).toFixed(1)}`).join(", ")})`);
  }
  console.log(c.padEnd(14), COMMANDERS[c].towers.join(",").padEnd(26), row.join("  "));
}
