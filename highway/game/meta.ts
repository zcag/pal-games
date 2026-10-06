// What outlives a run: cash, the garage, the road trip's best times, Free
// Drive's records. Stored whole in the extension's storage under "save"
// after every change, and synced to the player's account field by field
// (pal.json `sync`): cash and totals `sum`, upgrades `max`, best times `min`.
// What is open (regions, stops, car classes) is never stored: game/trip.ts
// works it out from the best times, so two machines can never disagree.
import { CARS, CLASSES, LOCATIONS, MODES, UPGRADE_MAX, upgradeCost, type ModeId, type PlayerCar, type Upgrades } from "./content.ts";
import { SPRINTS, REGIONS, sprintOf, type Sprint } from "./sprint.ts";
import { FINISH_PAY, finishSprint, nextStop, regionOfCar, regionOpen, regionsOpen, type SprintPay } from "./trip.ts";
import type { Score } from "./score.ts";

export type Owned = { upgrades: Upgrades; paint: string };
export type Best = { score: number; distance: number; combo: number; topSpeed: number };
export type Save = {
  v: 4; // 4: the road trip (levels, XP, missions and paid paints gone)
  cash: number;
  owned: Record<string, Owned>;
  pick: Record<string, string>; // per class: the car its region's Sprints are driven in
  car: string; // Free Drive's car
  location: string; mode: ModeId; // Free Drive's place and mode
  stop: string; // the map's selected stop
  sprints: Record<string, number>; // each Sprint's best time, s
  best: Record<string, Best>; // Free Drive, by mode
  seen: string[]; // moments shown once: a region opened, a car won
  totals: { runs: number; distance: number; misses: number; cash: number };
  settings: { view: string; music: number; sound: number; units: "kmh" | "mph" };
};

/** A staged moment for the store's pictures (the fixture stores it as "scene"): nothing is saved while one plays. */
export type Scene = { show: "map" | "garage" | "run" | "results"; location?: string; mode?: ModeId; car?: string; paint?: string; speed?: number; warm?: number; sprint?: string; crash?: { you: number; them: number; kind: string; oncoming: boolean } };

export const NO_UP: Upgrades = { speed: 0, handling: 0, brakes: 0 };
export const carOf = (id: string) => CARS.find((c) => c.id === id)!;
const own = (car: PlayerCar): Owned => ({ upgrades: { ...NO_UP }, paint: car.paint });

export function fresh(): Save {
  const first = CARS[0];
  return {
    v: 4, cash: 0, owned: { [first.id]: own(first) }, pick: {}, car: first.id,
    location: LOCATIONS[0].id, mode: "endless", stop: SPRINTS[0].id, sprints: {}, best: {}, seen: [],
    totals: { runs: 0, distance: 0, misses: 0, cash: 0 },
    settings: { view: "Low", music: 0.6, sound: 1, units: "kmh" },
  };
}

/** The save as it is stored. */
export const stored = (s: Save) => ({ ...s });

/** A stored save, or a fresh one; anything unknown in it is dropped, an older save is carried over. */
export function load(raw: unknown): Save {
  const s = fresh();
  if (!raw || typeof raw !== "object") return s;
  const r = raw as Partial<Save> & { v?: number };
  const v = r.v ?? 2;
  if (typeof r.cash === "number") s.cash = Math.max(0, Math.floor(r.cash));
  if (r.owned) for (const [id, o] of Object.entries(r.owned)) {
    const car = CARS.find((c) => c.id === id);
    if (!car) continue;
    const { nitro = 0, ...up } = o.upgrades as Upgrades & { nitro?: number };
    s.owned[id] = { upgrades: { ...NO_UP, ...up }, paint: o.paint ?? car.paint };
    // a save from before momentum: the nitro levels bought are paid back, once
    if (v < 3) for (let l = 0; l < nitro; l++) s.cash += upgradeCost(car, l);
  }
  if (r.pick) for (const [cls, id] of Object.entries(r.pick)) if (s.owned[id] && CLASSES.some((c) => c.id === cls)) s.pick[cls] = id;
  if (r.car && s.owned[r.car]) s.car = r.car;
  if (r.mode && MODES.some((m) => m.id === r.mode)) s.mode = r.mode;
  if (r.best) s.best = r.best;
  // the Sprints before the road trip were other roads: their times mean nothing on these
  if (v >= 4 && r.sprints) for (const [id, t] of Object.entries(r.sprints)) if (sprintOf(id) && typeof t === "number" && t > 0) s.sprints[id] = t;
  if (r.stop && sprintOf(r.stop)) s.stop = r.stop; else s.stop = nextStop(s.sprints).id;
  if (r.location && places(s).some((l) => l.id === r.location)) s.location = r.location;
  if (Array.isArray(r.seen)) s.seen = r.seen.filter((x) => typeof x === "string");
  if (r.totals) s.totals = { ...s.totals, ...r.totals };
  if (r.settings) {
    const { camera, ...rest } = r.settings as Save["settings"] & { camera?: number };
    s.settings = { ...s.settings, ...rest };
    // the view was once kept by its place in this list
    if (typeof camera === "number" && !rest.view) s.settings.view = ["Chase", "Classic", "Low", "Bumper", "High", "Tower", "Long lens"][camera] ?? "Low";
  }
  return s;
}

/** Whether a car can be bought: its class's region is open. */
export const forSale = (s: Save, car: PlayerCar) => regionOpen(regionOfCar(car), s.sprints);
/** Free Drive's places: the skies of the open regions. */
export const places = (s: Save) => regionsOpen(s.sprints).map((r) => LOCATIONS.find((l) => l.id === REGIONS[r].place)!);
export const modes = () => MODES;

/** The car a region's Sprints are driven in: the one picked for its class, else the best of the class you own. */
export function pickFor(s: Save, region: number): PlayerCar | null {
  const cls = REGIONS[region].cls, mine = CARS.filter((c) => s.owned[c.id] && regionOfCar(c) === region);
  return mine.find((c) => c.id === s.pick[cls]) ?? mine[mine.length - 1] ?? null;
}

/** Buy a car: true if it went through. A first car of its class becomes that class's Sprint car. */
export function buyCar(s: Save, car: PlayerCar) {
  if (s.owned[car.id] || s.cash < car.price || !forSale(s, car)) return false;
  s.cash -= car.price;
  s.owned[car.id] = own(car);
  return true;
}

export function buyUpgrade(s: Save, car: PlayerCar, kind: keyof Upgrades) {
  const o = s.owned[car.id];
  if (!o || o.upgrades[kind] >= UPGRADE_MAX) return false;
  const cost = upgradeCost(car, o.upgrades[kind]);
  if (s.cash < cost) return false;
  s.cash -= cost;
  o.upgrades[kind]++;
  return true;
}

/** Paint a car you own: every colour is free. */
export function paint(s: Save, car: PlayerCar, color: string) {
  const o = s.owned[car.id];
  if (!o) return false;
  o.paint = color;
  return true;
}

const count = (s: Save, score: Score) => {
  s.totals.runs++;
  s.totals.distance += score.distance;
  s.totals.misses += score.misses;
};

/** A Sprint finished: its pay, a duel's car; the save updated. */
export function finishSprintRun(s: Save, sp: Sprint, score: Score): SprintPay {
  const pay = finishSprint(sp, score.time, s.sprints, (id) => !!s.owned[id]);
  if (pay.duel?.car) s.owned[pay.duel.car.id] = own(pay.duel.car);
  s.cash += pay.cash;
  s.totals.cash += pay.cash;
  count(s, score);
  return pay;
}

/** A run that ended short of the line still counts its distance. */
export const countRun = (s: Save, score: Score) => count(s, score);

/** What a Free Drive run paid and whether it set the mode's record. */
export type FreeResult = { lines: { label: string; amount: number }[]; cash: number; record: boolean };

/** Free Drive pays like a finish does, by the minute, in the region of the car you drive, times the mode's rate. */
export function finishFree(s: Save, score: Score, mode: ModeId, car: PlayerCar): FreeResult {
  const m = MODES.find((x) => x.id === mode)!;
  const minutes = score.time / 60;
  const cash = Math.round(FINISH_PAY[regionOfCar(car)] * minutes * m.cash);
  const lines = [{ label: `${Math.floor(minutes)}:${String(Math.round((minutes % 1) * 60)).padStart(2, "0")} on the road${m.cash !== 1 ? `, ${m.name} ×${m.cash}` : ""}`, amount: cash }];
  s.cash += cash;
  s.totals.cash += cash;
  count(s, score);
  const b = s.best[mode];
  const record = !b || score.points > b.score;
  s.best[mode] = {
    score: Math.max(b?.score ?? 0, Math.round(score.points)), distance: Math.max(b?.distance ?? 0, score.distance),
    combo: Math.max(b?.combo ?? 0, score.bestCombo), topSpeed: Math.max(b?.topSpeed ?? 0, score.topSpeed),
  };
  return { lines, cash, record };
}
