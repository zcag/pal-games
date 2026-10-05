// elites and bosses at battle level: lives lost, and how much of it is the elite/boss itself
import type { BossId, EnemyId, TowerId } from "../../game/types.ts";
import { newBattle, step } from "../../game/battle/index.ts";
import { BattleBot } from "../../game/bot/battle.ts";
import { loadout } from "../../game/battle/testkit.ts";
import { applyTune } from "./tasks.ts";
applyTune();
const towers = (process.env.TOWERS ?? "archer,barracks,mage,bombard").split(",") as TowerId[];
const k = +(process.env.K ?? 0.6), n = +(process.env.N ?? 12), act = +(process.env.ACT ?? 1) as 1;
const cases: [string, "elite" | "boss", EnemyId | BossId][] = (process.env.CASES ?? "elite:juggernaut,elite:warlock,elite:matron,boss:gorrak,boss:hivequeen").split(",").map((c) => { const [a, b] = c.split(":"); return [c, a as "elite", b as EnemyId]; });
for (const [name, kind, who] of cases) {
  let lost = 0, big = 0, won = 0, ticks = 0, hpLeft = 0;
  for (let s = 1; s <= n; s++) {
    const b = newBattle({ seed: s * 131, act, kind, floor: 4, loadout: loadout({ towers, lives: 20, maxLives: 20 }), ...(kind === "boss" ? { boss: who as BossId } : { elite: { kind: who as EnemyId, affixes: [] } }) });
    const bot = new BattleBot(b, { k, seed: s });
    while (b.phase === "setup" || b.phase === "running") { bot.tick(); step(b); for (const e of b.events) if (e.e === "leak" && (e.kind === who)) big += e.lives; b.events.length = 0; }
    lost += b.stats.livesLost; if (b.phase === "won") won++; ticks += b.tick;
    const bo = b.enemies.find((e) => e.boss); if (bo && b.phase !== "won") hpLeft += bo.hp / bo.maxHp;
  }
  console.log(`${name.padEnd(16)} won ${won}/${n}  lives lost ${(lost / n).toFixed(1)} (of which the ${who} ${(big / n).toFixed(1)})  ${(ticks / n / 30).toFixed(0)} s${kind === "boss" ? `  boss hp left when lost ${(hpLeft / Math.max(1, n - won) * 100).toFixed(0)}%` : ""}`);
}
if (process.env.WHO) {
  const b = newBattle({ seed: 131, act, kind: "boss", floor: 7, loadout: loadout({ towers, lives: 99, maxLives: 99 }), boss: process.env.WHO as BossId });
  const bot = new BattleBot(b, { k, seed: 1, trace: true });
  const leaks = new Map<string, number>();
  while (b.phase === "setup" || b.phase === "running") { bot.tick(); step(b); for (const e of b.events) if (e.e === "leak") leaks.set(`w${b.next} ${e.kind}`, (leaks.get(`w${b.next} ${e.kind}`) ?? 0) + e.lives); b.events.length = 0; }
  for (const t of bot.log.trace) if (!t.cmd.startsWith("cast") && !t.cmd.startsWith("rally")) console.log((t.tick / 30).toFixed(0), t.gold, t.lives, t.cmd, t.why);
  console.log([...leaks].join("  "), b.phase, b.towers.map((t) => `${t.kind}${t.level}${t.spec ?? ""}:${Math.round(t.stats.damage)}`).join(" "));
}
