// The road trip's rules (DESIGN.md, "The road trip"): which regions and stops
// are open, what a finished Sprint earns, and what a duel won gives. Pure: it
// reads a save's best times and writes nothing but what `finishSprint` pays.
import { CARS, CLASSES, type PlayerCar } from "./content.ts";
import { REGIONS, BOSS_STARS, SPRINTS, sprintsOf, starsFor, rivalTime, type Sprint } from "./sprint.ts";

/** What the trip needs from a save: the best time of each Sprint, s. */
export type Times = Record<string, number>;

/** Cash a finish pays every time, by region, and what each star pays the first time it is earned (★ once this, ★★
 *  twice, ★★★ three times): a region's stars pay for most of its class's cars. Tuned in scripts/trip.ts. */
export const FINISH_PAY = [150, 300, 500, 700, 900];
export const STAR_PAY = [250, 600, 1200, 1500, 2000];

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

/** Why a stop is closed (null when it is open): its region, the Sprints before it, or the duel's stars. The first
 *  three Sprints of a region are open, each finished opens the next, so a hard one can be left for later. */
export function closed(s: Sprint, times: Times): string | null {
  if (!regionOpen(s.region, times)) return `Win the duel in ${REGIONS[s.region - 1].name}`;
  if (s.boss) { const have = starsIn(s.region, times); return have >= BOSS_STARS ? null : `${BOSS_STARS} stars in ${REGIONS[s.region].name} (you have ${have})`; }
  const list = sprintsOf(s.region), k = list.indexOf(s);
  const done = list.filter((x) => !x.boss && times[x.id]).length;
  return done >= k - 2 ? null : `Finish ${k - 2 - done} more here`;
}

/** The stop to play next: the first open one without every star in the furthest open region, else the first open. */
export function nextStop(times: Times) {
  const open = regionsOpen(times);
  for (const r of [...open].reverse()) {
    const s = sprintsOf(r).find((x) => !closed(x, times) && starsOf(x, times) < (x.boss ? 1 : 3) && !(x.boss && won(r, times)));
    if (s) return s;
  }
  return sprintsOf(0)[0];
}

export type SprintPay = {
  lines: { label: string; amount: number }[];
  cash: number;
  stars: number; before: number; // stars now and before this run
  record: boolean;
  duel?: { won: boolean; car?: PlayerCar; opened?: string }; // a duel: won, the rival's car if it is new to you, the region it opened
};

/** What a finished Sprint earns against the best times before it (`times` is updated). */
export function finishSprint(s: Sprint, time: number, times: Times, owned: (id: string) => boolean): SprintPay {
  const before = starsOf(s, times), wasWon = s.boss ? won(s.region, times) : false;
  const record = !times[s.id] || time < times[s.id];
  if (record) times[s.id] = time;
  const stars = starsOf(s, times);
  const lines = [{ label: "Finished", amount: FINISH_PAY[s.region] }];
  for (let n = before + 1; n <= stars; n++) lines.push({ label: `${"★".repeat(n)} for the first time`, amount: STAR_PAY[s.region] * n });
  const pay: SprintPay = { lines, cash: 0, stars, before, record };
  if (s.boss) {
    const nowWon = won(s.region, times);
    pay.duel = { won: nowWon && time < rivalTime(s) };
    if (nowWon && !wasWon) {
      const car = CARS.find((c) => c.id === s.boss!.car)!;
      if (!owned(car.id)) pay.duel.car = car;
      else lines.push({ label: `${car.name}, already yours: half its price`, amount: Math.round(car.price / 2) });
      if (s.region + 1 < REGIONS.length) pay.duel.opened = REGIONS[s.region + 1].name;
    }
  }
  pay.cash = lines.reduce((a, l) => a + l.amount, 0);
  return pay;
}
