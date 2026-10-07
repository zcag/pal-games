// The road trip's rules (DESIGN.md, "The road trip"): which regions and stops
// are open, which cars you have, and what a finished Sprint or a duel won
// gives. Pure: everything comes from a save's best times, so nothing open or
// owned is ever stored and two machines can never disagree.
import { CARS, CLASSES, type PlayerCar } from "./content.ts";
import { REGIONS, BOSS_STARS, SPRINTS, sprintsOf, starsFor, rivalTime, type Sprint } from "./sprint.ts";

/** What the trip needs from a save: the best time of each Sprint, s. */
export type Times = Record<string, number>;

/** Stars in its region that open a class's k-th car (the first comes with the region: the Compact from the start,
 *  the others from the duel before): the second at 8, the third at 16, the fourth at 24. */
export const CAR_STARS = 8;

export const bossOf = (region: number) => SPRINTS.find((s) => s.region === region && s.boss)!;
/** The stars a time earns on a Sprint; none before its best time is known. */
export const starsOf = (s: Sprint, times: Times) => (times[s.id] && s.best ? starsFor(s, times[s.id]) : 0);
export const starsIn = (region: number, times: Times) => sprintsOf(region).reduce((a, s) => a + starsOf(s, times), 0);
export const totalStars = (times: Times) => SPRINTS.reduce((a, s) => a + starsOf(s, times), 0);
/** A duel is won once its time beats the rival's. */
export const won = (region: number, times: Times) => { const b = bossOf(region); return !!times[b.id] && !!b.best && times[b.id] < rivalTime(b); };

/** Regions open in order: the first, then each once the duel before it is won. */
export const regionOpen = (region: number, times: Times) => region === 0 || won(region - 1, times);
export const regionsOpen = (times: Times) => REGIONS.map((_, i) => i).filter((i) => regionOpen(i, times));
/** The car class a region drives, and whether a car's class is open (its region is). */
export const classOfRegion = (region: number) => CLASSES.find((c) => c.id === REGIONS[region].cls)!;
export const regionOfCar = (car: PlayerCar) => {
  const at = CARS.indexOf(car);
  return [...CLASSES].map((c, i) => [c, i] as const).reverse().find(([c]) => at >= CARS.findIndex((x) => x.id === c.from))![1];
};
/** A car's place in its class: 0 for the first. */
const placeInClass = (car: PlayerCar) => CARS.indexOf(car) - CARS.findIndex((c) => c.id === classOfRegion(regionOfCar(car)).from);
/** The stars its region needs for a car (0 for a class's first, which comes with the region). */
export const starsForCar = (car: PlayerCar) => placeInClass(car) * CAR_STARS;
/** Whether you have a car: its region is open and its stars there are in. */
export const hasCar = (car: PlayerCar, times: Times) => regionOpen(regionOfCar(car), times) && starsIn(regionOfCar(car), times) >= starsForCar(car);
export const carsHad = (times: Times) => CARS.filter((c) => hasCar(c, times));
/** What a car you do not have yet needs, in words. */
export function carNeeds(car: PlayerCar): string {
  const r = regionOfCar(car), duel = SPRINTS.find((s) => s.boss?.car === car.id);
  return duel ? `Beat ${duel.boss!.rival} in ${REGIONS[duel.region].name}` : `${starsForCar(car)} stars in ${REGIONS[r].name}`;
}

/** Why a stop is closed (null when it is open): its region, the Sprints before it, or the duel's stars. The first
 *  three Sprints of a region are open, each finished opens the next, so a hard one can be left for later. */
export function closed(s: Sprint, times: Times): string | null {
  if (!regionOpen(s.region, times)) return `Win the duel in ${REGIONS[s.region - 1].name}`;
  if (!s.best) return "Not ready yet: its star times are still being set";
  if (s.boss) { const have = starsIn(s.region, times); return have >= BOSS_STARS ? null : `${BOSS_STARS} stars in ${REGIONS[s.region].name} (you have ${have})`; }
  if (s.legend) return starsOf(bossOf(s.region), times) >= 3 ? null : `Three stars on the duel with ${bossOf(s.region).boss!.rival}`;
  const list = sprintsOf(s.region), k = list.indexOf(s);
  const done = list.filter((x) => !x.boss && !x.legend && times[x.id]).length;
  return done >= k - 2 ? null : `Finish ${k - 2 - done} more here`;
}

/** The Legend paints you have: every Legend finished gives its own. */
export const legendPaints = (times: Times) => SPRINTS.filter((s) => s.legend && times[s.id]).map((s) => s.legend!);

/** The stop to play next: the first open one without every star in the furthest open region, else the first open. */
export function nextStop(times: Times) {
  const open = regionsOpen(times);
  for (const r of [...open].reverse()) {
    const s = sprintsOf(r).find((x) => !closed(x, times) && starsOf(x, times) < (x.boss ? 1 : 3) && !(x.boss && won(r, times)));
    if (s) return s;
  }
  return sprintsOf(0)[0];
}

export type SprintResult = {
  stars: number; before: number; // stars now and before this run
  record: boolean;
  cars: PlayerCar[]; // cars this run gave you: a duel's, or a class's next for the stars it brought
  paint?: { paint: string; name: string }; // a Legend's paint, the first time it is finished
  duel?: { won: boolean; opened?: string }; // a duel: won, and the region it opened
};

/** What a finished Sprint gives against the best times before it (`times` is updated). */
export function finishSprint(s: Sprint, time: number, times: Times): SprintResult {
  const before = starsOf(s, times), had = carsHad(times), wasWon = s.boss ? won(s.region, times) : false, first = !times[s.id];
  const record = !times[s.id] || time < times[s.id];
  if (record) times[s.id] = time;
  const res: SprintResult = { stars: starsOf(s, times), before, record, cars: carsHad(times).filter((c) => !had.includes(c)) };
  if (s.legend && first) res.paint = s.legend;
  if (s.boss) {
    res.duel = { won: time < rivalTime(s) };
    if (won(s.region, times) && !wasWon && s.region + 1 < REGIONS.length) res.duel.opened = REGIONS[s.region + 1].name;
  }
  return res;
}
