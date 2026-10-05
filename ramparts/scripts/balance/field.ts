// Field check of tower strength: small war tables in real act battles (lives 999). For each table:
// lives lost, and per tower kind its share of the damage, damage per gold (act-health normalised) and
// the gold put into it. Checks the bot's stream table (game/bot/thru.ts) against what towers do in battle.
//   TABLES="archer,barracks;mage,archer,barracks" K=0.6 N=12 ACTS=1,2,3 bun scripts/balance/field.ts
import type { TowerId } from "../../game/types.ts";
import { playBattle } from "../../game/bot/battle.ts";
import { loadout } from "../../game/battle/testkit.ts";
import { ACTS } from "../../game/content/battle/acts.ts";
import { applyTune } from "./tasks.ts";
applyTune();
const tables = (process.env.TABLES ?? "archer,barracks;mage,archer,barracks;bombard,archer,barracks;storm,archer,barracks;pyre,archer,barracks;alchemist,archer,barracks;ballista,archer,barracks;thornwood,archer,barracks;frost,archer,barracks").split(";").map((t) => t.split(",") as TowerId[]);
const n = +(process.env.N ?? 12), k = +(process.env.K ?? 0.6);
const acts = (process.env.ACTS ?? "1,2,3").split(",").map(Number) as (1 | 2 | 3 | 4)[];
console.log(`k ${k}, ${n} battles per cell; per act: lives lost | kind share dmg-per-gold gold-per-battle`);
for (const tb of tables) {
  const row: string[] = [];
  for (const act of acts) {
    let lost = 0, all = 0;
    const by = new Map<TowerId, { d: number; g: number }>();
    for (let s = 1; s <= n; s++) {
      const l = playBattle({ seed: s * 7919 + act, act, kind: "battle", floor: 1 + (s % 3), loadout: loadout({ towers: tb, lives: 999, maxLives: 999, relics: ["old-standard"] }) }, { k, seed: s });
      lost += l.result.stats.livesLost;
      for (const b of l.built) { const d = b.damage / ACTS[act].hpMul; all += d; const x = by.get(b.kind) ?? { d: 0, g: 0 }; x.d += d; x.g += b.invested; by.set(b.kind, x); }
    }
    row.push(`act${act} ${(lost / n).toFixed(1).padStart(4)} | ${tb.filter((t) => by.has(t)).map((t) => { const x = by.get(t)!; return `${t.slice(0, 5)} ${(100 * x.d / all).toFixed(0)}% ${(x.d / Math.max(1, x.g)).toFixed(1)} ${Math.round(x.g / n)}`; }).join(", ")}`);
  }
  console.log(tb.join("+").padEnd(26), row.join("   "));
}
