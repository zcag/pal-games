// A flick: hold left until the car crosses at full speed, then right; how long until it moves the other way.
//   bun highway/scripts/flick.ts
import { Vehicle } from "../game/vehicle.ts";
import { CARS, CLASSES, FEEL, spec } from "../game/content.ts";
const dt = 1 / 120;
// each class's first car, the way the road trip hands them out
for (const car of CLASSES.map((c) => CARS.find((x) => x.id === c.from)!).concat(CARS[CARS.length - 1])) {
  const v = new Vehicle(spec(car, 2.6));
  v.launch((160 / 3.6) * FEEL.pace);
  for (let i = 0; i < 60; i++) v.step(dt, { throttle: 0.5, brake: 0, steer: 1 });
  const x0 = v.x; let t = 0, turned = 0, peak = v.x;
  while (t < 1.5 && !turned) { v.step(dt, { throttle: 0.5, brake: 0, steer: -1 }); t += dt; peak = Math.max(peak, v.x); if (v.x < peak - 0.05) turned = t; }
  console.log(`${car.id.padEnd(16)} turns back after ${(turned * 1000).toFixed(0)} ms, drifts on ${(peak - x0).toFixed(2)} m`);
}
