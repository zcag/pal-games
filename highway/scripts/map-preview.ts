// The road trip's map with made-up saves: /scripts/map-preview.html?s=<scenario>, or window.preview(name).
// Arrows walk it as the page will; the best times are invented (length at about 150 km/h), as the real ones
// come from scripts/sprint.ts.
import { showMap, onPick, onRegion, type MapView, type Stop } from "../surface/trip.ts";
import { REGIONS, SPRINTS, BOSS_STARS, sprintsOf, starTimes, rivalTime } from "../game/sprint.ts";
import { FINISH_PAY, STAR_PAY, closed, starsOf, starsIn, totalStars, regionOpen, type Times } from "../game/trip.ts";
import { CARS } from "../game/content.ts";

for (const s of SPRINTS) (s as { best: number }).best = Math.round((s.length / 41.5) * 10) / 10;
const carName = (id: string) => CARS.find((c) => c.id === id)!.name;
const traffic = (d: number) => (d < 0.2 ? "light" : d < 0.45 ? "steady" : d < 0.65 ? "busy" : "packed");
const lanes = (s: (typeof SPRINTS)[number]) => (s.layout.oncoming ? "Two-Way" : `${s.layout.lanes} lanes`);
/** A time that earns n stars on a Sprint (0: a finish outside the one-star time). */
const timeFor = (s: (typeof SPRINTS)[number], n: number) => { const t = starTimes(s); return n ? t[n - 1] - 0.4 : t[0] + 3.1; };

const SAVES: Record<string, { times: Times; region: number; pick?: string; cash: number }> = {};
const c = sprintsOf(0), h = sprintsOf(1);
const partial: Times = {};
[3, 2, 1, 2].forEach((n, i) => (partial[c[i].id] = timeFor(c[i], n)));
SAVES.partial = { times: partial, region: 0, pick: c[4].id, cash: 3150 };
SAVES.closed = { times: partial, region: 0, pick: c[7].id, cash: 3150 };
const duel: Times = { ...partial };
[3, 2, 2, 3, 1, 2, 1].forEach((n, i) => (duel[c[i].id] = timeFor(c[i], n)));
SAVES.duel = { times: duel, region: 0, pick: c[8].id, cash: 8420 };
const on: Times = { ...duel, [c[8].id]: rivalTime(c[8]) - 1.2 };
[2, 1, 0].forEach((n, i) => (on[h[i].id] = timeFor(h[i], n)));
SAVES.region = { times: on, region: 2, cash: 12900 };
SAVES.next = { times: on, region: 1, cash: 12900 };
const tour: Times = { ...on };
for (let r = 1; r < 5; r++) { const l = sprintsOf(r); [3, 2, 2, 1, 3, 0, 2, 1].forEach((n, i) => (tour[l[i].id] = timeFor(l[i], n))); if (r < 4) tour[l[8].id] = rivalTime(l[8]) - 1; }
SAVES.grey = { times: tour, region: 3, cash: 61200 };
SAVES.night = { times: tour, region: 4, pick: sprintsOf(4)[8].id, cash: 61200 };
SAVES.slide = { times: on, region: 0, cash: 12900 };

let cur = SAVES.partial, region = 0, selected = "";
function view(): MapView {
  const t = cur.times, list = sprintsOf(region);
  const stops: Stop[] = list.map((s) => ({
    id: s.id, name: s.name, about: s.about, facts: `${lanes(s)} · ${(s.length / 1000).toFixed(1)} km · ${traffic(s.density)}`,
    boss: s.boss && { rival: s.boss.rival, car: carName(s.boss.car), time: rivalTime(s) },
    stars: starsOf(s, t), best: t[s.id], times: starTimes(s),
    pay: { finish: FINISH_PAY[s.region], stars: [1, 2, 3].map((n) => STAR_PAY[s.region] * n) }, closed: closed(s, t),
  }));
  return {
    region, selected, cash: cur.cash, stars: totalStars(t), car: ["Kiri '10", "Tozzo '98", "Thunderbolt '96", "Stinger '96", "Roadster '00"][region],
    regions: REGIONS.map((r, i) => ({ name: r.name, about: r.about, art: `../surface/map/${r.id}.webp`, open: regionOpen(i, t),
      why: i ? `Win the duel in ${REGIONS[i - 1].name}` : undefined, stars: starsIn(i, t), max: 24, duelAt: BOSS_STARS })),
    stops,
  };
}
const first = () => { const v = view(); return v.stops.find((s) => !s.closed && s.stars < 3 && !s.boss)?.id ?? v.stops[0].id; };
const draw = () => showMap(view());
function preview(name: string) { cur = SAVES[name]; region = cur.region; selected = cur.pick ?? first(); draw(); }
function go(r: number) { if (r < 0 || r >= REGIONS.length) return; region = r; selected = first(); draw(); }
onPick((id) => { selected = id; draw(); });
onRegion(go);
addEventListener("keydown", (e) => {
  const ids = view().stops.map((s) => s.id), k = ids.indexOf(selected);
  if (e.key === "ArrowRight" && k < ids.length - 1) { selected = ids[k + 1]; draw(); }
  if (e.key === "ArrowLeft" && k > 0) { selected = ids[k - 1]; draw(); }
  if (e.key === "ArrowDown") go(region + 1);
  if (e.key === "ArrowUp") go(region - 1);
  if (e.key === "c") { cur.cash += 750; draw(); }
});
Object.assign(window, { preview, go });
preview(new URLSearchParams(location.search).get("s") ?? "partial");
