// Trace one bot battle decision by decision: `bun scripts/sim-trace.ts [--k 0.6] [--act 1] [--floor 1]
// [--seed 1] [--kind battle|elite|boss] [--commander marshal] [--towers archer,barracks,mage] [--first]`.
import type { BattleKind, CommanderId, TowerId } from "../game/types.ts";
import { playBattle } from "../game/bot/battle.ts";
import { loadout } from "../game/battle/testkit.ts";
import { COMMANDERS } from "../game/content/run/commanders.ts";

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1]! : d; };
const k = +arg("k", "0.6"), act = +arg("act", "1") as 1, floor = +arg("floor", "1"), seed = +arg("seed", "1");
const kind = arg("kind", "battle") as BattleKind, commander = arg("commander", "marshal") as CommanderId;
const towers = arg("towers", COMMANDERS[commander].towers.join(",")).split(",") as TowerId[];
const first = process.argv.includes("--first");
const log = playBattle({ seed, act, kind, floor, loadout: loadout({ commander, towers, firstBattle: first, relics: [COMMANDERS[commander].relic] }) }, { k, seed, trace: true });
let w = -1;
for (const l of log.trace) {
  if (l.wave !== w) { w = l.wave; console.log(`-- wave ${w} --`); }
  console.log(`${(l.tick / 30).toFixed(1).padStart(6)}s  g${String(l.gold).padStart(4)} L${String(l.lives).padStart(2)}  ${l.cmd.padEnd(34)} ${l.why}`);
}
const r = log.result;
console.log(`\n${r.won ? "WON" : "LOST"} in ${(r.ticks! / 30).toFixed(0)} s, lives lost ${r.stats.livesLost}, per wave [${log.waveLeaks.map((x) => x ?? 0).join(",")}], gold at waves [${log.goldAt.join(",")}], left ${r.goldLeft}`);
console.log(`actions ${log.actions}, casts ${log.casts}, supplies ${log.supplies}, called early ${log.calls}`);
console.log("towers:", log.built.map((t) => `${t.kind}${t.level}${t.spec ? "/" + t.spec : ""} ${Math.round(t.damage)}`).join(", "));
