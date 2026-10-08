// A Sprint's best run, as the best-time search (scripts/sprint.ts) finds it and the page replays it ("watch the
// best run"): a list of choices, one per turn of a player's pace, each the keys a player has: left, right or neither,
// a steering key held for a tap of some length from the turn's start, and gas or brake. The car answers them through
// the same driver aid it gives a player's keys, so the run lands wherever a person's taps would, between lanes as
// often as in them, and corrects the way they do. Both drive a choice here, in the car the search drives (its outline
// from the page's models, surface/cars/hulls.json: the search imports it, the page fetches it), so a replay is the
// run the search timed, step for step.
import { Drive, ROLLING_START, type DriveEvents } from "./drive.ts";
import type { Input } from "./vehicle.ts";
import { CARS } from "./content.ts";
import type { Sprint } from "./sprint.ts";

export const DT = 1 / 120;
/** How a run decides: a choice every `every` s, each felt `delay` s late (the one before holds meanwhile), a steering
 *  key in it held for one of `taps` s (the longest a whole turn). The search's own is a machine's (TAS: four a second,
 *  at once); the best times the stars are drawn from are searched at HUMAN, a person's pace, so a star asks for a
 *  person's driving. */
export type Pace = { every: number; delay: number; taps: number[] };
export const TAS: Pace = { every: 0.25, delay: 0, taps: [0.08, 0.16, 0.25] };
// set (2026-10-08) against a player's three roads (Commuters 53.46 s, Dry Run 64.85): on a person's keys, choosing
// every 0.4 s (taps to 0.1 s) drove Dry Run in 61.4-62.1, three stars out of his reach; this drives 65.92 and 51.02
export const HUMAN: Pace = { every: 0.6, delay: 0.25, taps: [0.2, 0.4, 0.6] };
/** Steps of a span of time. */
export const stepsOf = (s: number) => Math.round(s / DT);
export const PEDALS = [{ throttle: 1, brake: 0 }, { throttle: 0, brake: 1 }];
/** A turn's choice: `key` 0 for no steering, else 1 + 2 * tap + (0 left, 1 right); `pedal` an index into PEDALS. */
export type Choice = { key: number; pedal: number };
/** The steering keys of a pace: none, then each tap left and right. */
export const keysOf = (pace: Pace) => 1 + 2 * pace.taps.length;

/** Each car's outline (hulls.json), by its id. */
export type Hulls = Record<string, { x: number; z: number; hull: [number, number][] }>;

/** A Sprint's run as the search drives it, from before its rolling start. */
export function bestDrive(s: Sprint, hulls: Hulls, events: DriveEvents = {}) {
  const sizes = new Map(Object.entries(hulls));
  const car = CARS.find((c) => c.id === s.car)!, size = sizes.get(car.id)!;
  return new Drive(s.layout, car, size, size.z * 0.58, (id) => sizes.get(id), events, { sprint: { seed: s.seed, length: s.length, density: s.density }, intro: ROLLING_START });
}

/** A pace in steps. */
export const turnOf = (pace: Pace) => ({ every: stepsOf(pace.every), late: stepsOf(pace.delay), taps: pace.taps.map(stepsOf) });
/** The input `i` steps into a turn: the one before's choice till the turn's is felt `late` in, then the turn's (null:
 *  none, on the gas). A key is held from its choice being felt, for its tap. */
export function inputAt(t: ReturnType<typeof turnOf>, prev: Choice | null, cur: Choice | null, i: number): Input {
  const [c, o] = i < t.late ? [prev, i + t.every - t.late] : [cur, i - t.late];
  if (!c) return { ...PEDALS[0], steer: 0 };
  const k = c.key - 1, steer = k >= 0 && o < t.taps[k >> 1] ? (k & 1 ? -1 : 1) : 0;
  return { ...PEDALS[c.pedal], steer };
}

/** The input that drives a run's choices at a pace, step by step from its start: nothing through the rolling start
 *  (the game drives it), then each turn as inputAt has it. The search drives each turn the same way (scripts/sprint.ts). */
export function chooser(d: Drive, choices: Choice[], pace: Pace) {
  const t = turnOf(pace);
  let n = 0;
  return (): Input => {
    if (d.intro > 0) return { throttle: 0, brake: 0, steer: 0 };
    const k = Math.floor(n / t.every), i = n++ % t.every;
    return inputAt(t, choices[k - 1] ?? null, choices[k] ?? null, i);
  };
}

/** Choices as text, one character each (base 36 of key * 2 + pedal), the way they are kept and shipped. */
export const encode = (cs: Choice[]) => cs.map((c) => (c.key * 2 + c.pedal).toString(36)).join("");
export const decode = (s: string): Choice[] => [...s].map((ch) => { const v = parseInt(ch, 36); return { key: v >> 1, pedal: v & 1 }; });
