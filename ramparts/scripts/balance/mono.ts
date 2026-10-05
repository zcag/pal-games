// experiment: one-tower war tables, how much each leaks (lives 999)
import type { TowerId } from "../../game/types.ts";
import { playBattle } from "../../game/bot/battle.ts";
import { loadout } from "../../game/battle/testkit.ts";
const kinds = (process.argv[2] ?? "archer,barracks,mage,bombard,frost,pyre").split(",") as TowerId[];
const k = +(process.argv[3] ?? 0.9);
for (const act of [1, 2, 3, 4] as const) {
  const row: string[] = [];
  for (const t of [...kinds.map((x) => [x]), ["archer", "barracks", "mage"], ["archer", "barracks", "mage", "bombard", "frost", "pyre"]] as TowerId[][]) {
    let lost = 0, n = 0, ticks = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const log = playBattle({ seed: seed * 7919, act, kind: "battle", floor: 3, loadout: loadout({ towers: t, lives: 999, maxLives: 999, relics: ["old-standard"] }) }, { k, seed });
      lost += log.result.stats.livesLost; n++; ticks += log.result.ticks!;
    }
    row.push(`${t.length > 1 ? t.length + "mix" : t[0]}:${(lost / n).toFixed(1)}`);
  }
  console.log(`act ${act}`, row.join("  "));
}
