// The full-strength rule sweeps: the suite checks a small sample of seeds per rule to stay inside
// pal's per-test time budget; this runs the same tests with the full samples (RAMPARTS_SWEEP=1):
// 500 maps per act and layout plus their fallback rate, 120 fuzzed battles, every wave guarantee
// over 40-60 seeds, 2000 act maps per act and ascension, the reward odds and 1500 war tables,
// and the balance bot's act I clear rate.
//
//   bun ramparts/scripts/sweep.ts      a few minutes; exits non-zero when a rule fails
import { join } from "node:path";

const root = join(import.meta.dir, "../..");
const files = ["map", "run-map", "battle-fuzz", "battle-flow", "bot", "run-rewards"].map((f) => `./test/ramparts-${f}.test.ts`);
console.log(`sweeping ${files.join(", ")} with the full samples:
  500 maps per act and layout and their fallback rate under 5%, 120 fuzzed battles,
  the wave guarantees over 40-60 seeds, 2000 act maps per act and ascension,
  the reward odds and 1500 war tables, the bot clearing act I most of the time`);
const p = Bun.spawnSync(["bun", "test", "--timeout", "600000", ...files], {
  cwd: root, env: { ...process.env, RAMPARTS_SWEEP: "1" }, stdout: "inherit", stderr: "inherit",
});
process.exit(p.exitCode ?? 1);
