// Micro-benchmark: `bun src/surface/fx/bench.ts`. 4096 live particles (mixed behaviours, most colliding)
// simulated against a generated world; then the full Fx.update with the buffer kept full.
import { generate } from "../../game/gen.ts";
import { STATS, type GameView, type PodView } from "../../game/types.ts";
import { PF } from "../view.ts";
import { SOLID, hex } from "./content.ts";
import { B, simulate, spawn } from "./sim.ts";
import { Fx } from "./index.ts";

const world = generate(7);
const pod: PodView = {
  x: 20.5, y: 200.5, vx: 0, vy: 0, facing: 1, grounded: true, thrusting: true, dig: null, fuel: 10, fuelMax: 10, fuelHome: 2,
  hull: 8, hullMax: 40, heat: 0.8, temp: 40, cargoUsed: 4, cargoMax: 12, load: 1.5, invuln: 0, channel: 0, dead: false, stranded: false,
};
const view: GameView = {
  world, takeDirty: () => [], pod, entities: [], time: 0, dayPhase: 0.5,
  levels: Object.fromEntries(STATS.map((s) => [s, 3])) as GameView["levels"], modules: [], liftDepth: 0, tempAt: () => 40,
};
const cam = { x: pod.x, y: pod.y, tilePx: 32, w: 720, h: 390 };

const fill = (fx: Fx) => {
  const ps = fx.particles, c = hex("#a87650");
  const kinds = [B.NONE, B.HOT, B.DRIFT, B.GROW, B.AMBIENT];
  while (ps.n < ps.cap) {
    const k = kinds[ps.n % kinds.length];
    spawn(ps, pod.x + (Math.random() - 0.5) * 20, pod.y + (Math.random() - 0.5) * 12, c, {
      vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 0.5 + Math.random() * 3, grav: 18, drag: 0.4,
      flags: (ps.n % 4 ? PF.COLLIDE : 0) | PF.FADE, aux: k + (k === B.AMBIENT ? 0.4 : 0.3),
    });
  }
};

const fx = new Fx();
const ctx = { mat: world.mat, solid: SOLID, podX: pod.x, podY: pod.y, t: 0 };
const N = 600;
let sum = 0, worst = 0;
for (let i = 0; i < N; i++) {
  fill(fx);
  const t0 = performance.now();
  simulate(fx.particles, 1 / 60, ctx);
  const ms = performance.now() - t0;
  if (i > 60) { sum += ms; worst = Math.max(worst, ms); }
}
console.log(`simulate, 4096 particles: mean ${(sum / (N - 61)).toFixed(3)} ms, worst ${worst.toFixed(3)} ms`);

// the whole update (ambient, thrust, low hull, lights, labels) with the buffer refilled each frame
sum = 0; worst = 0;
for (let i = 0; i < N; i++) {
  fill(fx);
  if (i % 30 === 0) fx.events([{ t: "explode", x: 22, y: 201, r: 2, kind: "charge" }, { t: "pickup", find: 1, count: 3, x: 21, y: 201, value: 9 }], view);
  const t0 = performance.now();
  fx.update(1 / 60, view, cam);
  const ms = performance.now() - t0;
  if (i > 60) { sum += ms; worst = Math.max(worst, ms); }
}
console.log(`Fx.update with 4096 live: mean ${(sum / (N - 61)).toFixed(3)} ms, worst ${worst.toFixed(3)} ms`);
