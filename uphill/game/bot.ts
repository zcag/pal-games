// A driver for the tests, the tuning script and the store pictures. `careful`
// drives like someone who has played a while: easy on the gas over a crest or
// when the nose comes up, and in the air it leans the car to meet the ground
// it will land on. `novice` drives on the gas and lets go in the air;
// `careless` holds the gas and never leans.
import { ground } from "./terrain.ts";
import { forward, type Input, type State } from "./sim.ts";

/** careless: the gas held, always. novice: the gas on the ground, nothing in the air. careful: as below. */
export type Style = "careful" | "novice" | "careless";

/** The ground's angle at x (rad). */
const slope = (seed: number, x: number) => Math.atan2(ground(seed, x + 0.8) - ground(seed, x - 0.8), 1.6);

export function decide(s: State, style: Style): Input {
  if (style === "careless") return { gas: true, brake: false };
  if (style === "novice") return { gas: s.touching[0] || s.touching[1], brake: false };
  const c = s.chassis, p = c.getPosition(), a = c.getAngle(), w = c.getAngularVelocity();
  const v = c.getLinearVelocity();
  const air = !(s.touching[0] || s.touching[1]);
  if (air) {
    // Where it comes down: a rough ballistic guess, then lean to that ground's angle, damped by the spin.
    let x = p.x, y = p.y, vy = v.y;
    for (let k = 0; k < 120 && y > ground(s.seed, x) + 0.7; k++) { x += v.x / 30; vy -= 10 / 30; y += vy / 30; }
    const target = slope(s.seed, x);
    const err = target - (a + w * 0.28);
    if (Math.abs(err) < 0.06) return { gas: false, brake: false };
    return err > 0 ? { gas: true, brake: false } : { gas: false, brake: true };
  }
  const fwd = forward(s);
  const rel = a - slope(s.seed, p.x);
  // Nose up past ~35 degrees from the ground: lift off so it falls back onto the front wheel.
  if (rel > 0.62 || (rel > 0.4 && w > 0.8)) return { gas: false, brake: rel > 0.85 };
  // Over a crest that drops away, at speed: ease off rather than launch.
  const ahead = slope(s.seed, p.x + 4) - slope(s.seed, p.x);
  if (fwd > 9 && ahead < -0.35) return { gas: false, brake: false };
  return { gas: true, brake: false };
}
