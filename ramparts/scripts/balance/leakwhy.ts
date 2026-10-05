// which waves and roles leak: per archetype and per enemy kind (expert, six towers)
import type { TowerId } from "../../game/types.ts";
import { newBattle, step } from "../../game/battle/index.ts";
import { BattleBot } from "../../game/bot/battle.ts";
import { loadout } from "../../game/battle/testkit.ts";
import { ACTS } from "../../game/content/battle/acts.ts";
import { applyTune } from "./tasks.ts";
applyTune();
const towers = (process.env.TOWERS ?? "archer,barracks,mage,bombard,frost,pyre").split(",") as TowerId[];
const act = +(process.argv[2] ?? 2) as 2, n = +(process.argv[3] ?? 16), k = +(process.env.K ?? 0.9);
if (process.env.HPM) ACTS[act].hpMul *= +process.env.HPM;
const byArch = new Map<string, [number, number]>(), byKind = new Map<string, number>();
for (let s = 1; s <= n; s++) {
  const b = newBattle({ seed: s * 31, act, kind: "battle", floor: 1 + (s % 5), loadout: loadout({ towers, lives: 999, maxLives: 999 }) });
  const bot = new BattleBot(b, { k, seed: s });
  while (b.phase === "setup" || b.phase === "running") {
    bot.tick(); step(b);
    for (const e of b.events) if (e.e === "leak") {
      byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + e.lives);
      const w = b.waves[Math.max(0, b.next - 1)]!; const a = byArch.get(w.archetype) ?? [0, 0]; a[0] += e.lives; byArch.set(w.archetype, a);
    }
    b.events.length = 0;
  }
  for (const w of b.waves) { const a = byArch.get(w.archetype) ?? [0, 0]; a[1]++; byArch.set(w.archetype, a); }
}
console.log("leaked lives per wave of archetype (count):", [...byArch].sort((a, c) => c[1][0] - a[1][0]).map(([k, [l, c]]) => `${k} ${(l / c).toFixed(1)} (${c})`).join(", "));
console.log("lives by kind per battle:", [...byKind].sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k} ${(v / n).toFixed(1)}`).join(", "));
