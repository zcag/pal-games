// war tables against act battles: TABLES="archer,mage;archer,barracks,mage" COMMANDER=seer ACT=1 bun scripts/balance/tables.ts
import type { CommanderId, TowerId } from "../../game/types.ts";
import { playBattle } from "../../game/bot/battle.ts";
import { loadout } from "../../game/battle/testkit.ts";
import { COMMANDERS } from "../../game/content/run/commanders.ts";
import { applyTune } from "./tasks.ts";
applyTune();
const n = +(process.env.N ?? 24), act = +(process.env.ACT ?? 1) as 1, c = (process.env.COMMANDER ?? "marshal") as CommanderId;
const ks = (process.env.KS ?? "0.6").split(",").map(Number);
for (const tb of (process.env.TABLES ?? "archer,mage").split(";")) {
  const row: string[] = [];
  for (const k of ks) {
    let lost = 0; const by: Record<string, number> = {};
    for (let s = 1; s <= n; s++) {
      const l = playBattle({ seed: s * 53, act, kind: "battle", floor: 1 + (s % 3), loadout: loadout({ commander: c, towers: tb.split(",") as TowerId[], relics: [COMMANDERS[c].relic], lives: 999, maxLives: 999 }) }, { k, seed: s });
      lost += l.result.stats.livesLost; for (const [kk, v] of Object.entries(l.leakBy)) by[kk] = (by[kk] ?? 0) + v;
    }
    row.push(`k${k} ${(lost / n).toFixed(1)} (${Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([kk, v]) => `${kk} ${(v / n).toFixed(1)}`).join(", ")})`);
  }
  console.log(`${c} ${tb.padEnd(28)} ${row.join("  ")}`);
}
