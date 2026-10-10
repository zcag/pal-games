// How far each kind of driver gets, and how: `bun uphill/scripts/feel.ts [seeds] [style]`.
// Prints, per run, the distance, why it ended, the coins, the flips and the
// worst landing, and the physics' sanity (the largest speed and spin seen).
import { create, step, drain, over, FEEL } from "../game/sim.ts";
import { decide, type Style } from "../game/bot.ts";

// FEEL={"comDrop":0.1} overrides the tuning for a sweep.
if (process.env.FEEL) Object.assign(FEEL, JSON.parse(process.env.FEEL));
const seeds = (process.argv[2] ?? "1").split(",").map(Number);
const styles: Style[] = process.argv[3] ? [process.argv[3] as Style] : ["careless", "novice", "careful"];
for (const style of styles) for (const seed of seeds) {
  const s = create(seed);
  let maxV = 0, maxW = 0, flips = 0, hardest = 0, cans = 0, lands = 0;
  const t0 = performance.now();
  for (let i = 0; i < 60 * 60 * 6 && !over(s); i++) {
    step(s, decide(s, style));
    maxV = Math.max(maxV, Math.hypot(s.chassis.getLinearVelocity().x, s.chassis.getLinearVelocity().y));
    maxW = Math.max(maxW, Math.abs(s.chassis.getAngularVelocity()));
    for (const e of drain(s)) {
      if (e.type === "flip") flips += e.n;
      if (e.type === "fuel") cans++;
      if (e.type === "land") { lands++; hardest = Math.max(hardest, e.hit); }
    }
  }
  console.log(`${style.padEnd(9)} seed ${seed}: ${s.dist.toFixed(0).padStart(5)} m  ${String(s.ended).padEnd(6)} t ${s.t.toFixed(0)}s  avg ${(s.dist / s.t).toFixed(1)} m/s  coins ${s.coinsTaken}  cans ${cans}  flips ${flips}  landings ${lands} hardest ${hardest.toFixed(1)}  max v ${maxV.toFixed(1)} w ${maxW.toFixed(1)}  (${(performance.now() - t0).toFixed(0)} ms)`);
}
