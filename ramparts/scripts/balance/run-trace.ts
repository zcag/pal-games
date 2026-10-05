// one bot run, step by step: bun scripts/balance/run-trace.ts [commander] [k] [seed] [asc]
import type { CommanderId } from "../../game/types.ts";
import { newRun } from "../../game/run/index.ts";
import { fullProfile } from "../../game/meta.ts";
import { playRun } from "../../game/bot/run.ts";
import { applyTune } from "./tasks.ts";
applyTune();
const [c = "marshal", k = "0.6", seed = "1", asc = "0"] = process.argv.slice(2);
const log = playRun(newRun({ seed: +seed, commander: c as CommanderId, ascension: +asc, profile: fullProfile() }), { k: +k, seed: +seed, trace: true });
console.log(log.steps.join("\n"));
for (const b of log.battles) console.log(`a${b.act} f${b.floor} ${b.kind.padEnd(6)} ${b.result.won ? "won " : "LOST"} lost ${b.result.stats.livesLost} ${(b.result.ticks! / 30).toFixed(0)}s  ${JSON.stringify(b.leakBy)}  ${b.built.map((t) => `${t.kind}${t.level}${t.spec ? "/" + t.spec : ""}`).join(" ")}`);
console.log(log.run.over, log.run.loadout.towers, log.run.loadout.boons.length, "boons", log.run.loadout.relics);
