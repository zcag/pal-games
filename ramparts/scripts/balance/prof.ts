import { playBattle } from "../../game/bot/battle.ts";
import { loadout } from "../../game/battle/testkit.ts";
const t0 = performance.now(); let ticks = 0;
for (let s = 1; s <= 10; s++) { const l = playBattle({ seed: s, act: 2, kind: "battle", floor: 3, loadout: loadout({ towers: ["archer", "barracks", "mage", "bombard", "frost", "pyre"], lives: 999, maxLives: 999 }) }, { k: 0.9, seed: s }); ticks += l.result.ticks!; }
console.log(((performance.now() - t0) / 10).toFixed(0), "ms/battle", ticks / 10, "ticks");
