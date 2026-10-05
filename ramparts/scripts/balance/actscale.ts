// experiment: lives lost per battle by act against health and gold scales (battle bot, no boons)
// HP="1,0.8" GOLD="1,1.5" ACTS="2,3" K=0.6 TOWERS=... N=16 bun scripts/balance/actscale.ts
import type { Act, TowerId } from "../../game/types.ts";
import { ACTS } from "../../game/content/battle/acts.ts";
import { playBattle } from "../../game/bot/battle.ts";
import { loadout } from "../../game/battle/testkit.ts";
import { applyTune } from "./tasks.ts";
applyTune();
const towers = (process.env.TOWERS ?? "archer,barracks,mage,bombard,frost").split(",") as TowerId[];
const k = +(process.env.K ?? 0.6), n = +(process.env.N ?? 16);
const list = (s: string | undefined, d: string) => (s ?? d).split(",").map(Number);
for (const act of list(process.env.ACTS, "1,2,3,4") as Act[]) {
  const a = ACTS[act], h0 = a.hpMul, s0 = a.spellMul, g0 = a.bountyMul, st0 = a.startGold;
  for (const gm of list(process.env.GOLD, "1")) {
    const row: string[] = [];
    for (const m of list(process.env.HP, "1")) {
      a.hpMul = h0 * m; a.spellMul = s0 * m; a.bountyMul = g0 * gm; a.startGold = Math.round(st0 * gm);
      let lost = 0;
      for (let s = 1; s <= n; s++) lost += playBattle({ seed: s * 31, act, kind: "battle", floor: 1 + (s % 5), loadout: loadout({ towers, lives: 999, maxLives: 999, relics: ["old-standard"] }) }, { k, seed: s }).result.stats.livesLost;
      row.push(`hp ${(h0 * m).toFixed(2)}: ${(lost / n).toFixed(1)}`);
    }
    a.hpMul = h0; a.spellMul = s0; a.bountyMul = g0; a.startGold = st0;
    console.log(`act ${act} gold x${gm}  ${row.join("  ")}`);
  }
}
