// What outlives a run: the road trip's best times, your cars' paint, Free
// Drive's records. Stored whole in the extension's storage under "save"
// after every change, and synced to the player's account field by field
// (pal.json `sync`): best times `min`, totals `sum`. What is open and which
// cars you have are never stored: game/trip.ts works them out from the best
// times, so two machines can never disagree.
import { CARS, CLASSES, LOCATIONS, MODES, type ModeId, type PlayerCar } from "./content.ts";
import { SPRINTS, REGIONS, sprintOf, type Sprint } from "./sprint.ts";
import { finishSprint, hasCar, nextStop, regionOfCar, regionsOpen, type SprintResult } from "./trip.ts";
import type { Score } from "./score.ts";

export type Best = { score: number; distance: number; combo: number; topSpeed: number };
export type Save = {
  v: 5; // 5: no money, no upgrades: cars come with the trip
  paint: Record<string, string>; // per car, the colour it wears (its own until changed)
  pick: Record<string, string>; // per class: the car its region's Sprints are driven in
  car: string; // Free Drive's car
  location: string; mode: ModeId; // Free Drive's place and mode
  stop: string; // the map's selected stop
  sprints: Record<string, number>; // each Sprint's best time, s
  best: Record<string, Best>; // Free Drive, by mode
  seen: string[]; // moments shown once: a region opened, a car won
  totals: { runs: number; distance: number; misses: number };
  settings: { view: string; music: number; sound: number; units: "kmh" | "mph" };
};

/** A staged moment for the store's pictures (the fixture stores it as "scene"): nothing is saved while one plays. */
export type Scene = { show: "map" | "garage" | "run" | "results"; location?: string; mode?: ModeId; car?: string; paint?: string; speed?: number; warm?: number; sprint?: string; crash?: { you: number; them: number; kind: string; oncoming: boolean } };

export const carOf = (id: string) => CARS.find((c) => c.id === id)!;
export const paintOf = (s: Save, car: PlayerCar) => s.paint[car.id] ?? car.paint;

export function fresh(): Save {
  return {
    v: 5, paint: {}, pick: {}, car: CARS[0].id,
    location: LOCATIONS[0].id, mode: "endless", stop: SPRINTS[0].id, sprints: {}, best: {}, seen: [],
    totals: { runs: 0, distance: 0, misses: 0 },
    settings: { view: "Low", music: 0.6, sound: 1, units: "kmh" },
  };
}

/** The save as it is stored. */
export const stored = (s: Save) => ({ ...s });

/** A stored save, or a fresh one; anything unknown in it is dropped, an older save is carried over. */
export function load(raw: unknown): Save {
  const s = fresh();
  if (!raw || typeof raw !== "object") return s;
  const r = raw as Partial<Save> & { v?: number; owned?: Record<string, { paint?: string }> };
  const v = r.v ?? 2;
  // the Sprints before the road trip (v4) were other roads: their times mean nothing on these
  if (v >= 4 && r.sprints) for (const [id, t] of Object.entries(r.sprints)) if (sprintOf(id) && typeof t === "number" && t > 0) s.sprints[id] = t;
  // a save with money kept its paint on the cars it owned
  if (r.owned) for (const [id, o] of Object.entries(r.owned)) if (CARS.some((c) => c.id === id) && o?.paint) s.paint[id] = o.paint;
  if (r.paint) for (const [id, c] of Object.entries(r.paint)) if (CARS.some((x) => x.id === id) && typeof c === "string") s.paint[id] = c;
  if (r.pick) for (const [cls, id] of Object.entries(r.pick)) if (CLASSES.some((c) => c.id === cls) && CARS.some((c) => c.id === id)) s.pick[cls] = id;
  if (r.car && hasCar(carOf(r.car), s.sprints)) s.car = r.car;
  if (r.mode && MODES.some((m) => m.id === r.mode)) s.mode = r.mode;
  if (r.best) s.best = r.best;
  if (r.stop && sprintOf(r.stop)) s.stop = r.stop; else s.stop = nextStop(s.sprints).id;
  if (r.location && places(s).some((l) => l.id === r.location)) s.location = r.location;
  if (Array.isArray(r.seen)) s.seen = r.seen.filter((x) => typeof x === "string");
  if (r.totals) s.totals = { runs: r.totals.runs ?? 0, distance: r.totals.distance ?? 0, misses: r.totals.misses ?? 0 };
  if (r.settings) {
    const { camera, ...rest } = r.settings as Save["settings"] & { camera?: number };
    s.settings = { ...s.settings, ...rest };
    // the view was once kept by its place in this list
    if (typeof camera === "number" && !rest.view) s.settings.view = ["Chase", "Classic", "Low", "Bumper", "High", "Tower", "Long lens"][camera] ?? "Low";
  }
  return s;
}

/** Free Drive's places: the skies of the open regions. */
export const places = (s: Save) => regionsOpen(s.sprints).map((r) => LOCATIONS.find((l) => l.id === REGIONS[r].place)!);
export const modes = () => MODES;
export const has = (s: Save, car: PlayerCar) => hasCar(car, s.sprints);

/** The car a region's Sprints are driven in: the one picked for its class, else the best of the class you have. */
export function pickFor(s: Save, region: number): PlayerCar | null {
  const cls = REGIONS[region].cls, mine = CARS.filter((c) => regionOfCar(c) === region && has(s, c));
  return mine.find((c) => c.id === s.pick[cls]) ?? mine[mine.length - 1] ?? null;
}

const count = (s: Save, score: Score) => {
  s.totals.runs++;
  s.totals.distance += score.distance;
  s.totals.misses += score.misses;
};

/** A Sprint finished: its stars, the cars it gave you; the save updated. A car new to you drives its class's Sprints. */
export function finishSprintRun(s: Save, sp: Sprint, score: Score): SprintResult {
  const res = finishSprint(sp, score.time, s.sprints);
  for (const c of res.cars) s.pick[REGIONS[regionOfCar(c)].cls] = c.id;
  count(s, score);
  return res;
}

/** A run that ended short of the line still counts its distance. */
export const countRun = (s: Save, score: Score) => count(s, score);

/** A Free Drive run: whether it set the mode's record. */
export function finishFree(s: Save, score: Score, mode: ModeId): { record: boolean } {
  count(s, score);
  const b = s.best[mode];
  const record = !b || score.points > b.score;
  s.best[mode] = {
    score: Math.max(b?.score ?? 0, Math.round(score.points)), distance: Math.max(b?.distance ?? 0, score.distance),
    combo: Math.max(b?.combo ?? 0, score.bestCombo), topSpeed: Math.max(b?.topSpeed ?? 0, score.topSpeed),
  };
  return { record };
}
