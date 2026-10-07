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

export const CHOICE = 0.25, DT = 1 / 120;
/** A choice holds for this many steps. */
export const EVERY = Math.round(CHOICE / DT);
export const GRID = 0.9;
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

/** The input that drives a run's choices, step by step from its start: nothing through the rolling start (the
 *  game drives it), then each choice for EVERY steps. */
export function chooser(s: Sprint, d: Drive, choices: Choice[]) {
  const { xOf } = slotsOf(s, d);
  let n = 0;
  return (): Input => {
    if (d.intro > 0) return { throttle: 0, brake: 0, steer: 0 };
    const c = choices[Math.min(choices.length - 1, Math.floor(n++ / EVERY))];
    return inputOf(d, xOf, c);
  };
}

/** Choices as text, one character each (base 36 of slot * 2 + pedal), the way they are kept and shipped. */
export const encode = (cs: Choice[]) => cs.map((c) => (c.slot * 2 + c.pedal).toString(36)).join("");
export const decode = (s: string): Choice[] => [...s].map((ch) => { const v = parseInt(ch, 36); return { slot: v >> 1, pedal: v & 1 }; });
