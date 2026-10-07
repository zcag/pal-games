// A Sprint's best run, as the best-time search (scripts/sprint.ts) finds it and the page replays it ("watch the
// best run"): a list of choices, one a quarter second (a player's pace), each where across the road to steer for
// (slots GRID apart) and gas or brake. Both drive a choice here, in the car the search drives (its outline from
// the page's models, surface/cars/hulls.json: the search imports it, the page fetches it), so a replay is the run the search
// timed, step for step.
import { Drive, ROLLING_START, type DriveEvents } from "./drive.ts";
import type { Input } from "./vehicle.ts";
import { steerToward } from "./bot.ts";
import { CARS } from "./content.ts";
import { edges } from "./layout.ts";
import type { Sprint } from "./sprint.ts";

export const DT = 1 / 120;
export const GRID = 0.9;
/** How a run decides: a choice every `every` s, each felt `delay` s late (the one before holds meanwhile), each at
 *  most `moves` slots from the last. The search's own is a machine's (TAS: four a second, at once); the best times
 *  the stars are drawn from are searched at HUMAN, a person's pace, so a star asks for a person's driving. */
export type Pace = { every: number; delay: number; moves: number };
export const TAS: Pace = { every: 0.25, delay: 0, moves: 2 };
// set on Dry Run (2026-10-08) against a player's 64.85 s: the machine drives it in 61.10, this in 64.61. Slower paces
// were far off (one slot a choice: 75-81 s, a lane change taking two seconds); a wider beam found the same times.
export const HUMAN: Pace = { every: 0.4, delay: 0.15, moves: 2 };
/** Steps of a span of time. */
export const stepsOf = (s: number) => Math.round(s / DT);
export const PEDALS = [{ throttle: 1, brake: 0 }, { throttle: 0, brake: 1 }];
export type Choice = { slot: number; pedal: number };

/** Each car's outline (hulls.json), by its id. */
export type Hulls = Record<string, { x: number; z: number; hull: [number, number][] }>;

/** A Sprint's run as the search drives it, from before its rolling start. */
export function bestDrive(s: Sprint, hulls: Hulls, events: DriveEvents = {}) {
  const sizes = new Map(Object.entries(hulls));
  const car = CARS.find((c) => c.id === s.car)!, size = sizes.get(car.id)!;
  return new Drive(s.layout, car, size, size.z * 0.58, (id) => sizes.get(id), events, { sprint: { seed: s.seed, length: s.length, density: s.density }, intro: ROLLING_START });
}

/** Where across the road a slot is, and how many there are, for a road and its car. */
export function slotsOf(s: Sprint, d: Drive) {
  const [lo, hi] = edges(s.layout), half = d.size.x / 2 + 0.2;
  return { xOf: (i: number) => lo + half + i * GRID, last: Math.floor((hi - lo - 2 * half) / GRID), at: (x: number) => Math.round((x - lo - half) / GRID) };
}

/** What a choice does to the car at this moment. */
export const inputOf = (d: Drive, xOf: (i: number) => number, c: Choice): Input => ({ ...PEDALS[c.pedal], steer: steerToward(d, xOf(c.slot)) });

/** The input that drives a run's choices at a pace, step by step from its start: nothing through the rolling
 *  start (the game drives it), then each choice from `delay` into its turn to `delay` into the next (before the
 *  first, the lane it started in, on the gas). The search drives each turn the same way (scripts/sprint.ts). */
export function chooser(s: Sprint, d: Drive, choices: Choice[], pace: Pace) {
  const { xOf, at } = slotsOf(s, d), every = stepsOf(pace.every), late = stepsOf(pace.delay);
  let n = 0, start: Choice | null = null;
  return (): Input => {
    if (d.intro > 0) return { throttle: 0, brake: 0, steer: 0 };
    start ??= { slot: at(d.veh.x), pedal: 0 };
    const k = Math.floor(n / every), held = n % every < late;
    n++;
    return inputOf(d, xOf, (held ? (k ? choices[k - 1] : start) : choices[k]) ?? choices[choices.length - 1]);
  };
}

/** Choices as text, one character each (base 36 of slot * 2 + pedal), the way they are kept and shipped. */
export const encode = (cs: Choice[]) => cs.map((c) => (c.slot * 2 + c.pedal).toString(36)).join("");
export const decode = (s: string): Choice[] => [...s].map((ch) => { const v = parseInt(ch, 36); return { slot: v >> 1, pedal: v & 1 }; });
