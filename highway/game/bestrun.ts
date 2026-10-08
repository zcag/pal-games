// A Sprint's best run, as the best-time search (scripts/sprint.ts) finds it and the page replays it ("watch the
// best run"): a list of choices, one per turn of a player's pace, each the keys a player has: left, right or neither,
// a steering key tapped from the turn's start (never quite as long as meant), and gas or brake. The car answers them through
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
 *  key in it meant to be held for one of `taps` s. A press comes out up to `err` of itself longer or shorter than
 *  meant (slipOf), so a run has to see where a tap left it and fix it with the next. A pass closer than `risk[0]` m
 *  is a gamble, costing the search up to `risk[1]` m of road (scripts/sprint.ts): a person cannot place a car to the
 *  centimetre. The search's own is a machine's (TAS: exact, at once, fearless); the best times the stars are drawn
 *  from are searched at HUMAN, a person's pace, so a star asks for a person's driving. */
export type Pace = { every: number; delay: number; taps: number[]; err: number; risk: [number, number] };
export const TAS: Pace = { every: 0.25, delay: 0, taps: [0.08, 0.16, 0.25], err: 0, risk: [0, 0] };
// set (2026-10-08) against a player's saved runs (scripts/_style.ts): his taps (70-97 a minute, most 0.1-0.15 s, a third
// to a half of them fixing the one before) and his passes (median 0.27-0.42 m from the car, a tenth to a quarter under
// 0.1). Without the risk the search passed a median 0.03 m off; at 0.4 m it never went under 0.1 and fell 2-6 s behind
export const HUMAN: Pace = { every: 0.25, delay: 0.15, taps: [0.08, 0.12, 0.18], err: 0.3, risk: [0.15, 0.25] };
/** Steps of a span of time. */
export const stepsOf = (s: number) => Math.round(s / DT);
export const PEDALS = [{ throttle: 1, brake: 0 }, { throttle: 0, brake: 1 }];
/** A turn's choice: `key` 0 for no steering, else 1 + 2 * tap + (0 left, 1 right); `pedal` an index into PEDALS. */
export type Choice = { key: number; pedal: number };
/** A choice as pressed: the steering key (+1 left, -1 right, 0 none) held `hold` steps, and the pedal. */
export type Press = { steer: number; hold: number; pedal: number };
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
export const turnOf = (pace: Pace) => ({ every: stepsOf(pace.every), late: stepsOf(pace.delay), taps: pace.taps.map((x) => x / DT), err: pace.err });
type Turn = ReturnType<typeof turnOf>;
/** How far turn `k`'s press comes out from what was meant, -1 to 1: fixed by the road and the turn, so a replay
 *  presses as the search did. */
export function slipOf(seed: number, k: number) {
  let h = Math.imul(seed ^ Math.imul(k + 1, 0x9e3779b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 31 - 1;
}
/** A choice pressed `slip` (-1 to 1) of the way to its longest or shortest. */
export function pressOf(t: Turn, c: Choice, slip: number): Press {
  const k = c.key - 1;
  return k < 0 ? { steer: 0, hold: 0, pedal: c.pedal } : { steer: k & 1 ? -1 : 1, hold: Math.round(t.taps[k >> 1] * (1 + t.err * slip)), pedal: c.pedal };
}
/** The input `i` steps into a turn: the one before's press till the turn's is felt `late` in, then the turn's (null:
 *  none, on the gas). A key is held from its press being felt, for its hold. */
export function inputAt(t: Turn, prev: Press | null, cur: Press | null, i: number): Input {
  const [c, o] = i < t.late ? [prev, i + t.every - t.late] : [cur, i - t.late];
  if (!c) return { ...PEDALS[0], steer: 0 };
  return { ...PEDALS[c.pedal], steer: o < c.hold ? c.steer : 0 };
}

/** The input that drives a run's choices at a pace, step by step from its start: nothing through the rolling start
 *  (the game drives it), then each turn as inputAt has it. The search drives each turn the same way (scripts/sprint.ts). */
export function chooser(d: Drive, choices: Choice[], pace: Pace) {
  const t = turnOf(pace), seed = d.sprint!.seed, press = (k: number) => (choices[k] ? pressOf(t, choices[k], slipOf(seed, k)) : null);
  let n = 0;
  return (): Input => {
    if (d.intro > 0) return { throttle: 0, brake: 0, steer: 0 };
    const k = Math.floor(n / t.every), i = n++ % t.every;
    return inputAt(t, press(k - 1), press(k), i);
  };
}

/** Choices as text, one character each (base 36 of key * 2 + pedal), the way they are kept and shipped. */
export const encode = (cs: Choice[]) => cs.map((c) => (c.key * 2 + c.pedal).toString(36)).join("");
export const decode = (s: string): Choice[] => [...s].map((ch) => { const v = parseInt(ch, 36); return { key: v >> 1, pedal: v & 1 }; });
