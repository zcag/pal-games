// Plays the hole with the bot and prints the route it finds: the plain one
// (no shot through the Needle's arch from the tee), and the trick (the tee
// shot through it). The routes go into game/routes.ts, which the tests replay.
//   bun chip/scripts/solve.ts
import { HOLE } from "../game/hole.ts";
import { best, play, robust, type Play } from "../game/bot.ts";
import { R } from "../game/sim.ts";

function route(first?: Play) {
  let lie: [number, number] = [HOLE.tee[0], HOLE.tee[1] + R];
  const shots: Play[] = [];
  for (let n = 0; n < 8; n++) {
    // Only a putt (from within 4 m) may be chosen for dropping; a longer shot is chosen for where it leaves the ball.
    const near = Math.hypot(lie[0] - HOLE.cup.x, lie[1] - HOLE.cup.y) < 4;
    const pick = n === 0 && first ? { shot: first, outcome: play(HOLE, lie, first), cost: robust(HOLE, lie, first) } : best(HOLE, lie, { noHole: !near });
    shots.push(pick.shot);
    console.log(`  ${n + 1}. ${JSON.stringify(pick.shot)} -> ${pick.outcome.holed ? "holed" : pick.outcome.at.map((v) => v.toFixed(2)).join(", ")}${pick.outcome.penalty ? " (penalty)" : ""} worst-near ${pick.cost.toFixed(2)}`);
    if (pick.outcome.holed) break;
    lie = pick.outcome.at;
  }
  return shots;
}

console.log("plain (the tee shot kept short of the mesa):");
// The plain tee shot: the best one that stays below the cliff.
let tee: Play | null = null, teeCost = Infinity;
for (let a = 10; a <= 70; a++) for (let p = 40; p <= 100; p += 2) {
  const shot: Play = { angle: a, facing: 1, power: p / 100, spin: 0 };
  const o = play(HOLE, [HOLE.tee[0], HOLE.tee[1] + R], shot);
  if (o.penalty || o.at[0] > 70) continue;
  // A degree and a few hundredths off, as a hand plays it, it still stays below the cliff (not through the arch).
  const near = [-1, 0, 1].flatMap((da) => [-0.02, 0, 0.02].map((dp) => play(HOLE, [HOLE.tee[0], HOLE.tee[1] + R], { ...shot, angle: a + da, power: Math.min(1, shot.power + dp) })));
  if (near.some((n) => n.penalty || n.at[0] <= 58 || n.at[0] >= 70.6)) continue;
  const c = Math.abs(o.at[0] - 64);
  if (c < teeCost) { teeCost = c; tee = shot; }
}
const plain = route(tee!);
console.log("trick (through the arch):");
// The trick as a person plays it: full power (the meter lingers at its top), and the angle found by trying.
// The window is the run of whole-degree... half-degree angles whose drive ends on the mesa; the route starts from its middle.
const lie: [number, number] = [HOLE.tee[0], HOLE.tee[1] + R];
const window: number[] = [];
for (let a = 20; a <= 70; a += 0.5) {
  const o = play(HOLE, lie, { angle: a, facing: 1, power: 1, spin: 0 });
  if (!o.penalty && o.at[0] > 70.6 && o.at[1] > 13) window.push(a);
}
console.log(`  full power through the arch: ${window.join(", ")} degrees`);
const through: Play = { angle: window[Math.floor(window.length / 2)], facing: 1, power: 1, spin: 0 };
const trick = route(through);

console.log(`\n// game/routes.ts\nexport const PLAIN: Play[] = ${JSON.stringify(plain)};\nexport const TRICK: Play[] = ${JSON.stringify(trick)};\nexport const WINDOW = ${JSON.stringify(window)};`);
