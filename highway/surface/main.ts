// Highway's page: the road trip's map (home), the garage, Free Drive, the
// run, the pause and the end of a run (DESIGN.md, "The road trip"). The
// extension's storage keeps the save (synced: a merged one sync brings in
// replaces the page's); every finished Free Drive run goes to its mode's
// leaderboard; the panel hiding pauses the run.
import * as THREE from "./vendor/three.js";
import type { SurfaceKit } from "@zcag/pal";
import { Renderer } from "./render.ts";
import { World } from "./world.ts";
import { Run, preloadTraffic, warmTraffic } from "./run.ts";
import { Chase, VIEWS } from "./camera.ts";
import { Car } from "./car.ts";
import { Sound } from "./audio.ts";
import { Garage, type Bay } from "./garage.ts";
import { showMap, hideMap, onPick, onRegion, type MapView } from "./trip.ts";
import { ONE_WAY, TWO_WAY, laneX, type Layout } from "../game/layout.ts";
import { CARS, LOCATIONS, MODES, PAINTS, UPGRADE_MAX, FEEL, topOf, upgradeCost, stats, classOf, type PlayerCar, type Upgrades, type Location } from "../game/content.ts";
import { load, stored, fresh, carOf, buyCar, buyUpgrade, paint, places, pickFor, forSale, finishSprintRun, finishFree, countRun, NO_UP, type Save, type Scene, type FreeResult } from "../game/meta.ts";
import type { Miss } from "../game/score.ts";
import type { End, Packed } from "../game/drive.ts";
import { acrossAt, type Input } from "../game/vehicle.ts";
import { REGIONS, SPRINTS, BOSS_STARS, sprintOf, sprintsOf, starTimes, rivalTime, clock, GHOST_DT, ghostAt, ghostTimeAt, type Ghost, type Sprint } from "../game/sprint.ts";
import { FINISH_PAY, STAR_PAY, bossOf, closed, nextStop, regionOfCar, regionOpen, starsIn, starsOf, totalStars, type SprintPay } from "../game/trip.ts";

declare const pal: SurfaceKit;
const $ = (id: string) => document.getElementById(id)!;
const q = new URLSearchParams(location.search);

const r = new Renderer($("view") as HTMLCanvasElement);
const world = new World(r.gl);
const chase = new Chase(r.camera);
const sound = new Sound();
let garageScene: Garage | null = null;
let save: Save = fresh();
let run: Run | null = null;
let builtFor = "", warmedFor = ""; // the place the world was built for, and the one its traffic's shaders were made for
type State = "loading" | "map" | "garage" | "free" | "run" | "paused" | "over" | "results";
let state: State = "loading";
let names = new Map<string, string>(); // model id to its name, for the crash line

let scene: Scene | null = null;
let trial = false; // ?test: everything open, nothing saved
/** The saved view's place in VIEWS; the first if it is gone. */
const viewOf = (s: Save) => Math.max(0, VIEWS.findIndex((v) => v.name === s.settings.view));
const persist = () => { if (!scene && !trial) pal.storage.set("save", stored(save)).catch((e: unknown) => console.error("highway: save", e)); };
/** Whether the player is signed in to a pal account, asked again on every show; until known, no offer to sign in. */
let signedIn = true;
const account = () => pal.account().then((a) => { signedIn = a?.signedIn !== false; }, () => {});
const layoutOf = (mode: string) => (MODES.find((m) => m.id === mode)?.twoWay ? TWO_WAY : ONE_WAY);
const stars = (n: number) => `<span class="stars">${[1, 2, 3].map((i) => `<i class="${i <= n ? "f" : ""}">★</i>`).join("")}</span>`;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const kmh = (v: number) => (save.settings.units === "mph" ? v * 0.6214 : v);
const unit = () => (save.settings.units === "mph" ? "mph" : "km/h");
const placeOf = (id: string) => LOCATIONS.find((l) => l.id === id)!;

/** What is driven next: a Sprint (in your car for its class) or Free Drive (your Free Drive car, mode and place). */
type Trip = { sprint: Sprint; car: PlayerCar } | null;
let trip: Trip = null;
const sprintNow = () => trip?.sprint ?? null;

// ---------------------------------------------------------------- the road

/** Put a car on the road (building the place first if it changed); `ready` runs once it is placed, before any frame of it is shown.
 *  `demo`: Free Drive's page, the car driving itself behind the sign. */
async function road(demo: boolean, ready?: () => void) {
  const sp = demo ? null : sprintNow();
  const loc: Location = placeOf(sp?.location ?? save.location);
  const layout: Layout = sp?.layout ?? layoutOf(save.mode);
  const key = `${loc.id}/${layout.lanes}/${layout.oncoming}`;
  if (builtFor !== key) {
    veil(true, `Driving to ${loc.name}`);
    run?.dispose();
    run = null;
    await world.build(loc.sky, loc.asphalt, layout);
    builtFor = key;
  }
  run?.dispose();
  const car = sp ? trip!.car : carOf(save.car);
  const owned = save.owned[car.id];
  const player = await Car.load(car.id, owned?.paint ?? car.paint);
  run = new Run(world, layout, player, car, owned?.upgrades ?? NO_UP, events, loc.density, demo || sp ? "endless" : save.mode,
    sp ? { seed: sp.seed, length: sp.length, density: sp.density } : undefined);
  if (demo) run.veh.launch((105 / 3.6) * FEEL.pace);
  run.settle();
  await sprintProps(sp);
  if (warmedFor !== key) { await warmTraffic(world, (sc) => r.warm(sc)); warmedFor = key; }
  chase.reset(run.pose);
  ready?.();
  // lift the sign over a finished picture: the land to the horizon built, every texture on the GPU, a few frames drawn
  world.land.ready(run.veh.z);
  r.upload(world.scene);
  await frames(3);
  veil(false);
}
/** `n` frames drawn, or 700 ms, whichever comes first (a page drawn in software, or not shown, draws slowly or not at all). */
const frames = (n: number) => new Promise<void>((done) => { const tick = () => (--n <= 0 ? done() : requestAnimationFrame(tick)); requestAnimationFrame(tick); setTimeout(done, 700); });

// what the run tells us
let flash = 0, slowmo = 0;
let crashInfo: { you: number; them: number; kind: string; oncoming: boolean } | null = null;
const events = {
  miss(m: Miss) {
    if (state !== "run") return;
    const label = m.double ? "Threaded the gap" : m.grade.name;
    pop(`${label}<small>+${m.points.toLocaleString("en-US")}</small>`, m.oncoming ? "oncoming" : m.double || m.grade.mult > 2 ? "big" : "");
    sound.play("combo_ding", { gain: 0.45, rate: Math.pow(2, Math.min(12, m.combo - 1) / 12) });
    const c = $("combo");
    c.classList.remove("bump");
    void c.offsetWidth;
    c.classList.add("bump");
  },
  pass(n: { kind: string }, gap: number, closing: number, side: number) {
    if (gap > 2.4 || closing < 8) return;
    const heavy = /lct|shvan|lightbody/.test(n.kind);
    sound.play(heavy ? "truck_passby" : gap < 0.8 ? "passby_close" : "passby", { gain: Math.min(1, (2.6 - gap) / 2) * Math.min(1, closing / 30), pan: side * 0.7, rate: 0.9 + closing / 140 });
  },
  bump(j: number, side: number) {
    sound.play(j > 4000 ? "impact_metal" : "bump", { gain: Math.min(1, 0.3 + j / 12000), pan: side * 0.4 });
    chase.hit(side, Math.min(1, j / 8000));
    flash = Math.min(1, flash + j / 20000);
  },
  crash(info: { you: number; them: number; kind: string; oncoming: boolean }) {
    if (state === "free") { setTimeout(() => state === "free" && road(true), 1800); return; }
    ended = "crash";
    state = "over";
    sound.play("crash_heavy", { gain: 1 });
    sound.play("glass_break", { gain: 0.6 });
    chase.hit(0, 1.2);
    chase.lingering = 0.001;
    flash = 1;
    crashInfo = info;
    slowmo = 1.7;
  },
  scrape() { sound.play("impact_metal", { gain: 0.35 }); },
  checkpoint(added: number) { if (state === "run") { banner(`+${added} s`); sound.play("countdown_go", { gain: 0.5 }); } },
  end(why: End) {
    if (state !== "run" || why === "crash") return;
    ended = why;
    state = "over";
    sound.play(why === "line" ? "cash" : why === "time" ? "countdown_beep" : "ui_error", { gain: 0.6 });
    banner(why === "line" ? clock(run!.score.time) : why === "time" ? "Time's up" : "Too slow");
    slowmo = 1.2;
  },
};
let ended: End | null = null;

// ---------------------------------------------------------------- a Sprint's finish line, your ghost, a duel's rival

let ghosts: Record<string, Ghost> = {}; // each Sprint's best run, this machine's
let recording: Ghost | null = null; // the Sprint being driven, as it goes
let z0 = 0; // where it started
let ghostCar: Car | null = null, ghostFor = "";
let rival: { car: Car; line: Ghost; time: number } | null = null; // a duel's
const finishLine = (() => {
  // a chequered band across the road, 2 m deep
  const c = document.createElement("canvas");
  c.width = 64; c.height = 8;
  const g = c.getContext("2d")!;
  for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? "#111" : "#f4f4f0"; g.fillRect(x * 4, y * 4, 4, 4); }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  m.receiveShadow = true;
  return m;
})();
/** The ghost: unlit and faint, so it reads as a line to follow and never as a car on the road; `GHOST_OPACITY` at
 *  a distance, fading out as it comes within a few car lengths of yours. A duel's rival is the same, warmer and clearer. */
const GHOST_OPACITY = 0.12, RIVAL_OPACITY = 0.3;
let ghostOn = true; // pal's Ghost setting
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: GHOST_OPACITY, depthWrite: false });
const rivalMat = new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: RIVAL_OPACITY, depthWrite: false });

/** Put a Sprint's finish line, your ghost and a duel's rival in the world, or take them out. */
async function sprintProps(sp: Sprint | null) {
  finishLine.removeFromParent();
  if (ghostCar && (!sp || ghostFor !== trip?.car.id)) { ghostCar.dispose(); ghostCar = null; }
  if (rival) { rival.car.dispose(); rival = null; }
  if (!sp || !run) return;
  const w = world.hi - world.lo;
  finishLine.scale.x = w;
  (finishLine.material.map as THREE.Texture).repeat.set(w / 2, 1);
  finishLine.position.set((world.lo + world.hi) / 2, 0.02, run.veh.z + sp.length * FEEL.pace);
  world.scene.add(finishLine);
  if (sp.boss) {
    const line = await fetch(`./rivals/${sp.id}.json`).then((x) => (x.ok ? x.json() : null), () => null) as Ghost | null;
    if (line) {
      const car = await Car.load(sp.boss.car, carOf(sp.boss.car).paint, { shadow: false });
      car.ghost(rivalMat);
      world.scene.add(car.root);
      rival = { car, line, time: rivalTime(sp) };
    }
    return; // a duel shows the rival, not your own best
  }
  if (!ghostCar) {
    ghostCar = await Car.load(trip!.car.id, "#ffffff", { shadow: false });
    ghostFor = trip!.car.id;
    ghostCar.ghost(ghostMat);
  }
  ghostCar.root.visible = false;
  world.scene.add(ghostCar.root);
}

/** The rival's place `t` s in: its line, played at the pace that finishes in its time. */
const rivalAt = (t: number) => ghostAt(rival!.line, (t * rival!.line.time) / rival!.time);

// ---------------------------------------------------------------- input

const keys = new Set<string>();
let muted = false;
window.addEventListener("keydown", (e: KeyboardEvent) => {
  const k = e.key.toLowerCase();
  if (e.metaKey || e.ctrlKey) return;
  sound.start();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "backspace"].includes(k)) e.preventDefault();
  if (!e.repeat) onKey(k);
  keys.add(k);
});
// the key hints are buttons too, and a sign's line is picked by clicking it
document.addEventListener("click", (e) => {
  const el = e.target as HTMLElement;
  const key = el.closest<HTMLElement>("[data-key]")?.dataset.key;
  if (key) { sound.start(); onKey(key); return; }
  const at = el.closest<HTMLElement>("[data-row]")?.dataset.row;
  if (at && state === "garage") { row = +at; drawGarage(); }
  if (at && state === "free") { freeRow = +at; drawFree(); }
});
window.addEventListener("keyup", (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

function input(): Input {
  const k = (...n: string[]) => n.some((x) => keys.has(x));
  return {
    throttle: k("arrowup", "w") ? 1 : 0,
    brake: k("arrowdown", "s") ? 1 : 0,
    steer: (k("arrowleft", "a") ? 1 : 0) - (k("arrowright", "d") ? 1 : 0),
  };
}

const dir = (k: string) => (k === "arrowleft" || k === "a" ? -1 : k === "arrowright" || k === "d" ? 1 : 0);
const vdir = (k: string) => (k === "arrowup" || k === "w" ? -1 : k === "arrowdown" || k === "s" ? 1 : 0);

function onKey(k: string) {
  if (k === "m") { muted = !muted; sound.setVolume(muted ? 0 : save.settings.sound); return; }
  if (state === "map") { mapKey(k); return; }
  if (state === "garage") { garageKey(k); return; }
  if (state === "free") { freeKey(k); return; }
  // a Sprint is tried again at once, from anywhere in it
  if (k === "r" && trip && (state === "run" || state === "paused" || state === "over" || state === "results")) { drive(); return; }
  if (state === "run" && intro > 0) { intro = Math.min(intro, 0.001); return; }
  if (state === "run") {
    if (k === "c") { chase.view = (chase.view + 1) % VIEWS.length; save.settings.view = VIEWS[chase.view].name; persist(); hint(`${VIEWS[chase.view].name} view`); }
    if (k === "p" || k === "enter") pause();
    return;
  }
  if (state === "paused") {
    if (k === "p" || k === "enter") resume();
    if (k === "q") giveUp();
    return;
  }
  if (state === "results") {
    if (trip) {
      if (k === "enter" || k === " " || k === "backspace") openMap();
      if (k === "g") openGarage();
      return;
    }
    if (k === "enter" || k === " ") drive();
    if (k === "backspace") openMap();
    if (k === "f") openFree();
    if (k === "g") openGarage();
  }
}

// ---------------------------------------------------------------- the map (home)

let mapRegion = 0;

/** The map's picture of where you are: the region shown, its stops, the selected one. */
function mapView(): MapView {
  const times = save.sprints;
  const sel = sprintOf(save.stop)!;
  const car = pickFor(save, mapRegion);
  return {
    region: mapRegion,
    regions: REGIONS.map((g, i) => ({
      name: g.name, about: g.about, art: `./map/${g.id}.webp`, open: regionOpen(i, times),
      why: regionOpen(i, times) ? undefined : `Win the duel in ${REGIONS[i - 1].name}`,
      stars: starsIn(i, times), max: sprintsOf(i).length * 3, duelAt: BOSS_STARS,
    })),
    stops: sprintsOf(mapRegion).map((s) => ({
      id: s.id, name: s.boss ? `Duel: ${s.name}` : s.name, about: s.about, facts: factsOf(s),
      boss: s.boss && { rival: s.boss.rival, car: carOf(s.boss.car).name, time: rivalTime(s) },
      stars: starsOf(s, times), best: times[s.id], times: s.best ? starTimes(s) : [],
      pay: { finish: FINISH_PAY[s.region], stars: [1, 2, 3].map((n) => STAR_PAY[s.region] * n) },
      closed: closed(s, times),
    })),
    selected: sel.region === mapRegion ? sel.id : sprintsOf(mapRegion)[0].id,
    cash: save.cash, stars: totalStars(times), car: car?.name ?? "none yet",
  };
}
const traffic = (d: number) => (d < 0.2 ? "light traffic" : d < 0.45 ? "steady" : d < 0.7 ? "busy" : "packed");
const factsOf = (s: Sprint) => `${s.layout.oncoming ? "Two-Way" : `${s.layout.lanes} lanes`} · ${(s.length / 1000).toFixed(1)} km · ${traffic(s.density)}`;

/** Home: the map, on the stop to play next (or the one last picked), a newly opened region slid to and named. */
function openMap(at?: Sprint) {
  state = "map";
  trip = null;
  hideSigns();
  const s = at ?? sprintOf(save.stop) ?? nextStop(save.sprints);
  save.stop = s.id;
  mapRegion = s.region;
  // a region opened since the map was last seen: go there
  const fresh = REGIONS.findIndex((g, i) => regionOpen(i, save.sprints) && !save.seen.includes(`region:${g.id}`));
  if (fresh > 0) { mapRegion = fresh; save.stop = sprintsOf(fresh)[0].id; banner(`${REGIONS[fresh].name} is open`); sound.play("bell_ding", { gain: 0.6 }); }
  for (const [i, g] of REGIONS.entries()) if (regionOpen(i, save.sprints) && !save.seen.includes(`region:${g.id}`)) save.seen.push(`region:${g.id}`);
  persist();
  sound.setEngine(null);
  showMap(mapView());
}
onPick((id) => { if (state !== "map") return; if (save.stop === id) mapKey("enter"); else { save.stop = id; persist(); sound.play("ui_select", { gain: 0.4 }); showMap(mapView()); } });
onRegion((i) => { if (state === "map") { mapRegion = i; save.stop = sprintsOf(i)[0].id; showMap(mapView()); } });

function mapKey(k: string) {
  const list = sprintsOf(mapRegion), at = Math.max(0, list.findIndex((s) => s.id === save.stop));
  if (dir(k)) { save.stop = list[(at + dir(k) + list.length) % list.length].id; sound.play("ui_select", { gain: 0.4 }); }
  else if (vdir(k)) {
    mapRegion = THREE.MathUtils.clamp(mapRegion - vdir(k), 0, REGIONS.length - 1);
    const open = sprintsOf(mapRegion).find((s) => !closed(s, save.sprints) && starsOf(s, save.sprints) < 3);
    save.stop = (open ?? sprintsOf(mapRegion)[0]).id;
    sound.play("ui_select", { gain: 0.4 });
  } else if (k === "enter" || k === " ") {
    const s = sprintOf(save.stop)!, car = pickFor(save, s.region);
    if (closed(s, save.sprints) || !car || !s.best) { sound.play("ui_error", { gain: 0.5 }); return; }
    trip = { sprint: s, car };
    persist();
    drive();
    return;
  } else if (k === "g") { openGarage(); return; }
  else if (k === "f") { openFree(); return; }
  else return;
  persist();
  showMap(mapView());
}

// ---------------------------------------------------------------- the garage

let row = 0;
let browse = 0; // the car shown, owned or not
const ROWS = ["car", "paint", "speed", "handling", "brakes"] as const;
const shownCar = () => CARS[browse];
const tag = (price: number) => `<em class="${save.cash >= price ? "can" : "no"}">${money(price)}</em>`;
const pips = (n: number) => Array.from({ length: UPGRADE_MAX }, (_, i) => `<i class="${i < n ? "f" : ""}"></i>`).join("");

/** How a car stands in the garage: yours, for sale, or not yet (and what opens it). */
function bayOf(car: PlayerCar): Bay {
  return { id: car.id, state: save.owned[car.id] ? "owned" : forSale(save, car) ? "for-sale" : "locked", paint: save.owned[car.id]?.paint ?? car.paint };
}
/** What opens a locked car: its region, or the duel that wins it. */
function opensWith(car: PlayerCar) {
  const duel = SPRINTS.find((s) => s.boss?.car === car.id);
  return duel ? `Win it from ${duel.boss!.rival}` : `Opens with ${REGIONS[regionOfCar(car)].name}`;
}

async function openGarage(focus?: string) {
  state = "loading";
  hideSigns();
  hideMap();
  veil(true, "Opening the garage");
  browse = Math.max(0, CARS.findIndex((c) => c.id === (focus ?? pickFor(save, sprintOf(save.stop)?.region ?? 0)?.id ?? save.car)));
  row = 0;
  // the bay looked at first is the first loaded, with its neighbours
  if (!garageScene) { garageScene = new Garage(r); garageScene.focus(shownCar().id, true); await garageScene.build(CARS.map(bayOf)); }
  else for (const c of CARS) if (!(bayOf(c).state === "owned" && !save.seen.includes(`car:${c.id}`))) garageScene.setState(c.id, bayOf(c).state);
  garageScene.focus(shownCar().id, true);
  r.finish.cut = true;
  state = "garage";
  veil(false);
  drawGarage();
  sound.setEngine(null);
  // a car won in a duel and not yet seen: it is revealed now
  for (const c of CARS) if (save.owned[c.id] && SPRINTS.some((s) => s.boss?.car === c.id) && !save.seen.includes(`car:${c.id}`)) {
    browse = CARS.indexOf(c); garageScene.focus(c.id); drawGarage();
    save.seen.push(`car:${c.id}`); persist();
    sound.play("cash", { gain: 0.6 });
    await garageScene.reveal(c.id);
    break;
  }
}

function drawGarage() {
  const car = shownCar(), owned = save.owned[car.id], up = owned?.upgrades ?? NO_UP, bay = bayOf(car);
  // browsing another car: each bar shows what it gains on the one this class drives in yellow; on an upgrade's row,
  // what its next level adds to this car
  const k = ROWS[row] as keyof Upgrades, next = owned && k in up && up[k] < UPGRADE_MAX;
  const st = stats(car, next ? { ...up, [k]: up[k] + 1 } : up);
  const region = regionOfCar(car), mineCar = pickFor(save, region);
  const mine = next ? stats(car, up) : mineCar && mineCar !== car ? stats(mineCar, save.owned[mineCar.id].upgrades) : null;
  const bar = (v: number, was?: number) => `<i class="${was === undefined ? "" : v > was + 0.05 ? "up" : "cmp"}" style="--v:${v.toFixed(2)};--w:${Math.min(v, was ?? v).toFixed(2)};--was:${(was ?? 0).toFixed(2)}"></i>`;
  const sel = (key: string) => `${ROWS[row] === key ? " on" : ""}" data-row="${ROWS.indexOf(key as (typeof ROWS)[number])}`;
  const upRow = (key: keyof Upgrades, label: string) => {
    const lv = up[key], max = lv >= UPGRADE_MAX;
    const price = !owned ? "" : max ? "<em>Full</em>" : tag(upgradeCost(car, lv));
    return `<div class="row${sel(key)}"><span>${label}</span><div class="val"><span class="pips">${pips(lv)}</span>${price}</div></div>`;
  };
  const picked = owned && mineCar === car;
  const carTag = owned ? `<em>${picked ? "In use" : "Yours"}</em>` : bay.state === "for-sale" ? tag(car.price) : `<em class="lock">Locked</em>`;
  // the colours either side of the one it wears, nine at a time
  const at = Math.max(0, PAINTS.indexOf(owned?.paint ?? car.paint)), win = Array.from({ length: 9 }, (_, i) => PAINTS[(at - 4 + i + PAINTS.length) % PAINTS.length]);
  const swatches = win.map((c) => `<i style="background:${c}" class="${(owned?.paint ?? car.paint) === c ? "on" : ""}"></i>`).join("");
  const action = !owned ? (bay.state === "for-sale" ? "Buy it" : opensWith(car)) : ROWS[row] === "car" ? (picked ? "Your car for " + REGIONS[region].name : `Drive it in ${REGIONS[region].name}`) : ROWS[row] === "paint" ? "Any colour, free" : "Upgrade";
  $("garage").innerHTML = `
    <div class="sign">
      <div class="head"><b>Garage</b><span>${money(save.cash)}</span></div>
      <div class="rows">
        <div class="row${sel("car")}"><span>${classOf(car).name}</span><div class="val"><span class="arrows">${car.name}</span>${carTag}</div></div>
        <div class="bars">
          <span>Top speed</span>${bar(st.speed, mine?.speed)}
          <span>Pickup</span>${bar(st.accel, mine?.accel)}
          <span>Handling</span>${bar(st.handling, mine?.handling)}
          <span>Brakes</span>${bar(st.brakes, mine?.brakes)}
        </div>
        <div class="row${sel("paint")}"><span>Paint</span><div class="val"><span class="swatches">${owned ? swatches : ""}</span></div></div>
        ${upRow("speed", "Engine")}
        ${upRow("handling", "Handling")}
        ${upRow("brakes", "Brakes")}
      </div>
      <div class="drive">
        <div><div class="go">${action}</div><div class="best">${Math.round(kmh(topOf(car, up)))} ${unit()} top</div></div>
        <div class="keys"><button data-key="enter"><kbd>enter</kbd> ${!owned ? "buy" : ROWS[row] === "car" ? "use" : "upgrade"}</button><br><button data-key="backspace"><kbd>⌫</kbd> map</button></div>
      </div>
    </div>`;
  $("garage").hidden = false;
}

/** The garage's tags over its bays: a price, what opens a car, or nothing for yours. */
function drawTags() {
  if (!garageScene) return;
  const html = garageScene.labels().filter((l) => l.visible && l.id !== shownCar().id).map((l) => {
    const car = carOf(l.id), b = bayOf(car);
    const text = b.state === "owned" ? (pickFor(save, regionOfCar(car)) === car ? "★" : "") : b.state === "for-sale" ? money(car.price) : `🔒 ${opensWith(car).replace(/^Opens with /, "")}`;
    return text ? `<div class="bay-tag ${b.state}" style="left:${l.x}px;top:${l.y}px">${text}</div>` : "";
  }).join("");
  $("tags").innerHTML = html;
}

async function garageKey(k: string) {
  const car = shownCar(), owned = save.owned[car.id];
  const what = ROWS[row];
  if (vdir(k)) row = (row + vdir(k) + ROWS.length) % ROWS.length;
  else if (dir(k)) {
    const d = dir(k);
    if (what === "car") { browse = (browse + d + CARS.length) % CARS.length; garageScene?.focus(shownCar().id); sound.play("ui_select", { gain: 0.5 }); }
    else if (what === "paint" && owned) {
      const i = PAINTS.indexOf(owned.paint);
      paint(save, car, PAINTS[(i + d + PAINTS.length) % PAINTS.length]);
      garageScene?.paint(car.id, owned.paint);
      persist();
    } else return;
  } else if (k === "enter" || k === " ") {
    let ok = false;
    if (what === "car" && !owned) {
      ok = buyCar(save, car);
      if (ok) {
        save.pick[REGIONS[regionOfCar(car)].cls] = car.id; // a new car drives its class's Sprints
        save.seen.push(`car:${car.id}`);
        persist();
        drawGarage();
        sound.play("cash", { gain: 0.6 });
        await garageScene?.reveal(car.id);
        return;
      }
    } else if (what === "car") { save.pick[REGIONS[regionOfCar(car)].cls] = car.id; ok = true; }
    else if (what === "speed" || what === "handling" || what === "brakes") ok = !!owned && buyUpgrade(save, car, what);
    sound.play(ok ? (what === "car" ? "ui_confirm" : "cash") : "ui_error", { gain: 0.6 });
    if (ok) persist();
  } else if (k === "backspace" || k === "g") { openMap(); return; }
  else if (k === "f") { openFree(); return; }
  else return;
  drawGarage();
}

// ---------------------------------------------------------------- Free Drive

let freeRow = 0;
const FREE_ROWS = ["car", "mode", "place"] as const;

/** Free Drive: your car driving itself behind a sign where you pick the car, the mode and the sky. */
async function openFree() {
  state = "loading";
  trip = null;
  hideSigns();
  hideMap();
  if (!save.owned[save.car]) save.car = CARS.find((c) => save.owned[c.id])!.id;
  await road(true);
  state = "free";
  sound.setEngine(carOf(save.car).engine);
  drawFree();
}

function drawFree() {
  const car = carOf(save.car), mode = MODES.find((m) => m.id === save.mode)!, loc = placeOf(save.location);
  const best = save.best[save.mode];
  const sel = (k: string) => `${FREE_ROWS[freeRow] === k ? " on" : ""}" data-row="${FREE_ROWS.indexOf(k as (typeof FREE_ROWS)[number])}`;
  $("free").innerHTML = `
    <div class="sign">
      <div class="head"><b>Free Drive</b><span>${money(save.cash)}</span></div>
      <div class="rows">
        <div class="row${sel("car")}"><span>${classOf(car).name}</span><div class="val"><span class="arrows">${car.name}</span></div></div>
        <div class="row${sel("mode")}"><span>Mode</span><div class="val"><span class="arrows">${mode.name}</span></div></div>
        <div class="row${sel("place")}"><span>Place</span><div class="val"><span class="arrows">${loc.name}</span></div></div>
        <div class="about">${mode.about}</div>
      </div>
      <div class="drive">
        <div><div class="go">Drive</div><div class="best">${best ? `Best ${best.score.toLocaleString("en-US")} in ${(best.distance / 1000).toFixed(1)} km` : `Pays ${money(FINISH_PAY[regionOfCar(car)] * mode.cash)} a minute`}</div></div>
        <div class="keys"><button data-key=" "><kbd>space</kbd> drive</button><br><button data-key="backspace"><kbd>⌫</kbd> map</button></div>
      </div>
    </div>`;
  $("free").hidden = false;
}

async function freeKey(k: string) {
  const what = FREE_ROWS[freeRow];
  if (vdir(k)) freeRow = (freeRow + vdir(k) + FREE_ROWS.length) % FREE_ROWS.length;
  else if (dir(k)) {
    const d = dir(k);
    if (what === "car") {
      const mine = CARS.filter((c) => save.owned[c.id]), i = mine.findIndex((c) => c.id === save.car);
      save.car = mine[(i + d + mine.length) % mine.length].id;
      const model = await Car.load(save.car, save.owned[save.car].paint);
      if (state !== "free" || !run) { model.dispose(); return; }
      run.setPlayer(model, carOf(save.car), save.owned[save.car].upgrades);
      sound.setEngine(carOf(save.car).engine);
    } else if (what === "mode") {
      const i = MODES.findIndex((m) => m.id === save.mode);
      save.mode = MODES[(i + d + MODES.length) % MODES.length].id;
      await road(true);
    } else {
      const open = places(save), i = open.findIndex((l) => l.id === save.location);
      save.location = open[(i + d + open.length) % open.length].id;
      await road(true);
    }
    sound.play("ui_select", { gain: 0.5 });
    persist();
  } else if (k === " " || k === "enter") { drive(); return; }
  else if (k === "backspace" || k === "f") { openMap(); return; }
  else if (k === "g") { openGarage(save.car); return; }
  else return;
  drawFree();
}

function hideSigns() { for (const id of ["garage", "free", "card", "hud"]) $(id).hidden = true; $("tags").innerHTML = ""; }

// ---------------------------------------------------------------- the run

let musicOn = false;
/** A run's opening: the road holds still while the camera comes round from beside the car to behind it, counting down;
 *  the clock starts at Go. Any key skips it. `intro` is the seconds left of it. */
const INTRO = 2;
let intro = 0;
/** Start a run: the trip's Sprint, else Free Drive. The last frame stays up until the run is ready, then it cuts to it;
 *  `prep` runs on the new run before its first frame (a kept run unpacked into it). */
async function drive(prep?: () => void) {
  const sp = sprintNow(), car = trip?.car ?? carOf(save.car);
  state = "loading"; // nothing drawn while the car is swapped: the last frame holds
  crashInfo = null;
  ended = null;
  hideMap();
  await road(false, () => {
    hideSigns();
    chase.view = viewOf(save);
    if (q.has("launch")) { run!.veh.launch((+q.get("launch")! / 3.6) * FEEL.pace); run!.settle(); } // ?launch=<km/h>: start a run at a speed, for trying the feel
    prep?.();
    chase.reset(run!.pose);
    state = "run";
    intro = prep || scene ? 0 : INTRO;
    hud();
    $("hud").hidden = false;
  });
  sound.setEngine(car.engine);
  if (!musicOn) { musicOn = true; sound.playMusic(); }
  $("unit").textContent = unit();
  if (sp) {
    recording = { x: [], z: [], yaw: [], time: 0 };
    z0 = run!.veh.z;
    banner(sp.boss ? `${sp.boss.rival}` : sp.name);
    $("modebox").hidden = false;
    hint(sp.boss ? `Beat ${sp.boss.rival} to the line` : save.sprints[sp.id] ? "" : save.totals.runs < 2 ? "Arrows to drive. Chain near misses to go past your top speed; R tries again" : "");
    return;
  }
  recording = null;
  const mode = MODES.find((m) => m.id === save.mode)!;
  banner(mode.id === "endless" ? placeOf(save.location).name : mode.name);
  $("modebox").hidden = mode.id !== "time" && mode.id !== "trap";
  hint("");
}

function pause() {
  state = "paused";
  sound.suspend();
  const sp = sprintNow();
  card(`<h2>Paused</h2><div class="why">${!run ? "" : sp ? `${clock(run.score.time)}, ${(run.drive.toLine / 1000).toFixed(1)} km to go` : `${Math.round(run.score.points).toLocaleString("en-US")} points so far`}</div>
    <div class="keys" style="margin-top:12px"><button data-key="enter"><kbd>enter</kbd> carry on</button>${sp ? `<button data-key="r"><kbd>r</kbd> try again</button>` : ""}<button data-key="q"><kbd>q</kbd> ${sp ? "back to the map" : "end the run"}</button></div>`);
}
function resume() { state = "run"; $("card").hidden = true; sound.start(); last = performance.now(); }
function giveUp() { if (trip) { if (run) { countRun(save, run.score); persist(); } openMap(trip.sprint); } else if (run) { crashInfo = null; results(); } }

function results() {
  if (!run) return;
  if (trip) { sprintResults(); return; }
  state = "results";
  keepRun(); // a finished run is not carried over
  $("hud").hidden = true;
  const s = run.score;
  const res = finishFree(save, s, save.mode, carOf(save.car));
  persist();
  post(save.mode, Math.round(s.points), res.record);
  card(`<div class="sprint-end free-end">
      <div class="headline"><h2>${Math.round(s.points).toLocaleString("en-US")} points</h2>${res.record && s.points > 0 ? `<span class="plate">New best for ${MODES.find((m) => m.id === save.mode)!.name}</span>` : ""}</div>
      <div class="why ${crashInfo ? "crash" : ""}">${whyEnded()}</div>
      <dl>${tally(res)}</dl>
    </div>
    <div class="keys"><button data-key="enter"><kbd>enter</kbd> drive again</button><button data-key="backspace"><kbd>⌫</kbd> map</button><button data-key="g"><kbd>g</kbd> garage</button></div>`);
}
const tally = (res: FreeResult) => res.lines.map((l) => `<dt>${l.label}</dt><dd>${money(l.amount)}</dd>`).join("") + `<dt class="total">Earned</dt><dd class="total">${money(res.cash)}</dd>`;
function whyEnded() {
  const what = crashInfo ? names.get(crashInfo.kind) ?? "car" : "";
  return ended === "time" ? "Time's up" : ended === "slow" ? "Too slow for too long" : crashInfo
    ? crashInfo.oncoming ? `Head-on with ${article(what)} ${what} at ${Math.round(kmh(crashInfo.you))} ${unit()}` : `Into ${article(what)} ${what}: you at ${Math.round(kmh(crashInfo.you))}, it at ${Math.round(kmh(crashInfo.them))} ${unit()}`
    : "You pulled over";
}

/** The end of a Sprint: the time, its stars and what they paid, a duel's outcome; or how far it got. */
function sprintResults() {
  const sp = trip!.sprint, d = run!.drive;
  state = "results";
  $("hud").hidden = true;
  const keys = `<div class="keys"><button data-key="r"><kbd>r</kbd> try again</button><button data-key="enter"><kbd>enter</kbd> map</button><button data-key="g"><kbd>g</kbd> garage</button></div>`;
  const targets = (time?: number) => `<div class="targets">${starTimes(sp).map((t, i) => `<div class="${time !== undefined && time <= t ? "got" : ""}">${stars(i + 1)}<b>${clock(t)}</b></div>`).join("")}</div>`;
  if (d.ended !== "line") {
    if (!scene && !trial) { countRun(save, run!.score); persist(); }
    const what = crashInfo ? names.get(crashInfo.kind) ?? "car" : "";
    card(`<div class="sprint-end"><h2>${crashInfo ? "Crashed" : "Stopped"}</h2>
      <div class="why crash">${crashInfo ? (crashInfo.oncoming ? `Head-on with ${article(what)} ${what}` : `Into ${article(what)} ${what}`) + `, ${((sp.length - d.toLine) / 1000).toFixed(1)} of ${(sp.length / 1000).toFixed(1)} km` : ""}</div>
      ${targets()}</div>${keys}`);
    showBoard(sp);
    return;
  }
  const time = d.score.time, before = save.sprints[sp.id];
  const pay: SprintPay = scene || trial ? { lines: [], cash: 0, stars: 0, before: 0, record: false } : finishSprintRun(save, sp, d.score);
  if (pay.record && recording) { recording.time = time; ghosts[sp.id] = recording; pal.storage.set("ghosts", ghosts).catch((e: unknown) => console.error("highway: ghost", e)); }
  // the next stop to play is selected for the map
  save.stop = (closed(sp, save.sprints) === null && pay.stars < 3 && !sp.boss ? sp : nextStop(save.sprints)).id;
  persist();
  const duel = pay.duel, next = starTimes(sp).find((t) => time > t);
  const headline = duel ? (duel.won ? `You beat ${sp.boss!.rival}` : `${sp.boss!.rival} was ${(time - rivalTime(sp)).toFixed(2)} s faster`)
    : pay.stars > pay.before ? (pay.stars - pay.before === 1 ? "A new star" : `${pay.stars - pay.before} new stars`)
    : next ? `${(time - next).toFixed(2)} s from the next star` : "Every star";
  const reward = duel?.car ? `<div class="reward">${duel.car.name} is yours${duel.opened ? `, and ${duel.opened} is open` : ""}</div>` : duel?.opened ? `<div class="reward">${duel.opened} is open</div>` : "";
  card(`<div class="sprint-end">
      <div class="headline"><h2>${clock(time)}</h2>${pay.record && before ? `<span class="plate">New best, ${(before - time).toFixed(2)} s faster</span>` : pay.record ? `<span class="plate">First finish</span>` : ""}</div>
      <div class="big">${stars(pay.stars)}</div>
      <div class="why">${headline}${!pay.record && before ? `. Your best is ${clock(before)}` : ""}</div>
      ${reward}
      <dl>${pay.lines.map((l) => `<dt>${l.label}</dt><dd>${money(l.amount)}</dd>`).join("")}<dt class="total">Earned</dt><dd class="total">${money(pay.cash)}</dd></dl>
      ${targets(time)}</div>${keys}`);
  if (duel?.won) sound.play("bell_ding", { gain: 0.7 });
  // your time on its board first, so the board read after it has it
  void post(`sprint/${sp.id}`, Math.round(time * 100) / 100, pay.record).then(() => showBoard(sp));
  if (pay.stars > pay.before) post("stars", totalStars(save.sprints), true, false);
}

/** A Sprint's board beside its results: the five best times, and yours below them if it is not among them. */
function showBoard(sp: Sprint) {
  if (scene || trial) return;
  pal.leaderboard(`sprint/${sp.id}`).then((b) => {
    const at = document.querySelector("#card .sign");
    if (state !== "results" || trip?.sprint !== sp || !at || !b.board) return;
    const row = (r: { rank: number; name: string; value: number; me: boolean }) => `<li class="${r.me ? "me" : ""}"><b>${r.rank}</b><span>${r.me ? "You" : r.name}</span><em>${clock(r.value)}</em></li>`;
    const top = b.rows.slice(0, 5), me = b.me && !top.some((r) => r.me) ? b.me : null;
    at.classList.add("with-board");
    at.insertAdjacentHTML("beforeend", `<aside class="board"><h3>Best times</h3>${top.length ? `<ol>${top.map(row).join("")}${me ? `<li class="gap">…</li>${row(me)}` : ""}</ol>` : `<p>No times yet. Finish it to be the first.</p>`}</aside>`);
  }).catch(() => {});
}

/** A score to its board (a Free Drive mode's points, a Sprint's time, the trip's stars); once the board answers, where it
 *  stands under the results card's headline (and, signed out after a best, the offer to keep it). */
function post(board: string, value: number, record: boolean, show = true) {
  if (scene || trial || value <= 0) return Promise.resolve();
  return pal.score(board, value).then((r) => {
    if (!show || state !== "results" || !r?.rank || !r.total) return;
    const keep = !signedIn && record ? ` · <a class="signin">Sign in to keep your scores</a>` : "";
    document.querySelector("#card .headline")?.insertAdjacentHTML("beforeend", `<span class="standing">#${r.rank.toLocaleString("en-US")} of ${r.total.toLocaleString("en-US")}${keep}</span>`);
  }).catch((e: unknown) => console.error("highway: score", e));
}
document.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest(".signin")) void pal.signIn().catch(() => {}); });

// ---------------------------------------------------------------- HUD bits

/** "a" or "an" before a car's name, by its sound: an LCT, an Asti, a Kiri. */
const article = (w: string) => (/^[A-Z]{2}/.test(w) ? /^[AEFHILMNORSX]/.test(w) : /^[aeiou]/i.test(w)) ? "an" : "a";
function card(html: string) { $("card").innerHTML = `<div class="sign">${html}</div>`; $("card").hidden = false; }
function pop(html: string, cls = "") {
  const el = document.createElement("div");
  el.className = `pop plate ${cls}`;
  el.innerHTML = html;
  $("pops").append(el);
  setTimeout(() => el.remove(), 1150);
  while ($("pops").children.length > 3) $("pops").firstElementChild!.remove();
}
function banner(text: string) {
  for (const old of document.querySelectorAll(".banner")) old.remove();
  const el = document.createElement("div");
  el.className = "banner";
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 1400);
}
let hintTimer = 0;
function hint(text: string) {
  const h = $("hint");
  h.textContent = text;
  h.classList.toggle("gone", !text);
  window.clearTimeout(hintTimer);
  if (text) hintTimer = window.setTimeout(() => h.classList.add("gone"), 5000);
}
function veil(on: boolean, msg?: string) {
  if (msg) $("loadmsg").textContent = msg;
  $("loading").classList.toggle("gone", !on);
}

const rateOf = (k: number) => (k ** 3 * 1e-6 + (k >= 100 ? (k * k) / 3000 : 0)) * 25;
const distance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}<small>km</small>` : `${Math.ceil(m / 10) * 10}<small>m</small>`);
function hud() {
  if (!run) return;
  const s = run.score, v = run.veh, k = v.kmh / FEEL.pace, sp = sprintNow(), d = run.drive;
  if (sp) {
    // the clock, and against the rival or your best where they were at this point of the road
    $("score").querySelector("b")!.textContent = clock(s.time);
    const dz = run.veh.z - z0;
    const against = rival ? { at: ghostTimeAt(rival.line, dz), scale: rival.time / rival.line.time, who: sp.boss!.rival } : ghosts[sp.id] ? { at: ghostTimeAt(ghosts[sp.id], dz), scale: 1, who: "your best" } : null;
    const split = against && against.at !== null ? s.time - against.at * against.scale : null;
    $("rate").innerHTML = split === null ? "" : `<em class="${split <= 0 ? "ahead" : "behind"}">${split <= 0 ? "−" : "+"}${Math.abs(split).toFixed(2)}</em> on ${against!.who}`;
  } else {
    $("score").querySelector("b")!.textContent = Math.round(s.points).toLocaleString("en-US");
    $("rate").textContent = k >= 60 ? `+${Math.round(rateOf(k))} a second` : "Faster for points";
  }
  $("speed").textContent = String(Math.round(kmh(k)));
  $("gear").textContent = v.shifting > 0 ? "·" : String(v.gear);
  ($("rpm") as HTMLElement).style.setProperty("--rpm", String(v.rpm / v.spec.redline));
  $("dist").textContent = `${(s.distance / 1000).toFixed(1)} km`;
  $("earn").textContent = s.misses ? `${s.misses} near miss${s.misses > 1 ? "es" : ""}` : "";
  const c = $("combo");
  c.hidden = !s.combo;
  // the combo, and what it is worth past the top speed
  if (s.combo) { c.querySelector("b")!.innerHTML = `Combo ×${s.combo}${d.surge >= 1 ? ` <small>+${Math.round(kmh(d.surge))} ${unit()}</small>` : ""}`; c.style.setProperty("--left", String(s.comboLeft / 4)); }
  $("gauge").classList.toggle("surging", k > topOf(d.car, d.up) + 1);
  const cell = (value: string, label: string, low = false) => `<div><b class="${low ? "low" : ""}">${value}</b><span>${label}</span></div>`;
  if (sp) {
    if (rival) { $("modebox").innerHTML = cell(distance(d.toLine), "to the line") + cell(clock(rival.time), `to beat ${sp.boss!.rival}`, rival.time - s.time < 5); return; }
    const want = starTimes(sp).slice().reverse().find((t) => t > s.time) ?? null, n = want === null ? 0 : starTimes(sp).indexOf(want) + 1;
    $("modebox").innerHTML = cell(distance(d.toLine), "to the line") + cell(want === null ? "–" : clock(want), n ? `for ${"★".repeat(n)}` : "no stars left", want !== null && want - s.time < 5);
    return;
  }
  // Time Attack: the clock and the road left to the next checkpoint, the same size side by side
  if (d.mode === "time") $("modebox").innerHTML = cell(d.clock.toFixed(1), "seconds", d.clock < 10) + cell(distance(Math.max(0, d.toCheckpoint)), `to the next +${d.bonus} s`);
  if (d.mode === "trap") $("modebox").innerHTML = cell(String(Math.round(kmh(d.floor))), d.under > 0 ? `Speed up: ${(3 - d.under).toFixed(1)} s` : `Stay above, ${unit()}`, d.under > 0);
}

// ---------------------------------------------------------------- the loop

const STEP = 1 / 120;
let acc = 0, last = performance.now(), t = 0, lastGear = 1;
let drawn: State = "loading"; // the state the last frame was drawn in

/** Free Drive's car drives itself: the lane with the most room, steered smoothly into. */
let autoLane = 1;
/** Free Drive's driver, and a staged scene's (`bold`: it holds its speed, changes lanes sooner and never brakes; nothing touches in a scene). */
function autopilot(target = 108, bold = false): Input {
  const rn = run!, v = rn.veh, L = rn.layout;
  // seconds until it would reach the car ahead in a lane (Infinity when the lane is clear), or -1 when
  // a car is alongside in it, which rules that lane out
  const ttc = (l: number) => {
    let t = Infinity;
    for (const n of rn.traffic.cars) {
      if (n.oncoming || n.hit || (n.lane !== l && n.from !== l)) continue;
      const gap = n.z - v.z - (n.length + rn.player.size.z) / 2;
      if (gap < -6) continue;
      if (gap < 2 && l !== autoLane) return -1;
      t = Math.min(t, Math.max(0, gap) / Math.max(0.5, v.u - n.v));
    }
    return t;
  };
  const here = ttc(autoLane);
  if (here < (bold ? 4.5 : 3)) for (const l of [autoLane - 1, autoLane + 1]) if (l >= 0 && l < L.lanes && ttc(l) > Math.max(here, ttc(autoLane)) + 0.5) autoLane = l;
  // the key sets how fast the car crosses: a sideways speed that shrinks as the lane's centre comes
  // near, so it moves over decisively and settles instead of weaving
  const dx = laneX(L, autoLane) - v.x;
  const across = acrossAt(v.spec, v.u); // what full steering gives at this speed
  const steer = THREE.MathUtils.clamp(THREE.MathUtils.clamp(dx * 2.2, -9, 9) / across, -1, 1);
  const boxed = !bold && ttc(autoLane) < 1.3;
  return { throttle: !boxed && v.kmh / FEEL.pace < target ? 1 : 0, brake: boxed ? 1 : 0, steer };
}

/** One frame of a run's opening: the camera from low beside the car's nose round to its chase view, a beep a half
 *  second, Go at the end. Nothing on the road moves. */
const from = new THREE.Vector3(), aim = new THREE.Quaternion(), start = new THREE.Quaternion();
function opening(dt: number) {
  const before = intro;
  intro = Math.max(0, intro - dt);
  run!.draw(0, 1);
  const pose = run!.pose, cam = r.camera;
  chase.update(dt, pose, (world.lo + world.hi) / 2); // where the camera ends up
  const to = cam.position.clone();
  aim.copy(cam.quaternion);
  // round the car on an arc, from in front of it on the right to where the chase view sits, never cutting past it
  const end = { a: Math.atan2(to.x - pose.x, to.z - pose.z), d: Math.hypot(to.x - pose.x, to.z - pose.z), h: to.y };
  const k = 1 - intro / INTRO, e = k * k * (3 - 2 * k);
  const a0 = 0.6, a1 = end.a < a0 ? end.a + Math.PI * 2 : end.a;
  const ang = a0 + (a1 - a0) * e, dist = 7 + (end.d - 7) * e, h = 1.0 + (end.h - 1.0) * e;
  from.set(pose.x + 7 * Math.sin(a0), 1.0, pose.z + 7 * Math.cos(a0));
  cam.position.copy(from);
  cam.lookAt(pose.x, 0.8, pose.z);
  start.copy(cam.quaternion);
  cam.position.set(pose.x + dist * Math.sin(ang), h, pose.z + dist * Math.cos(ang));
  cam.quaternion.slerpQuaternions(start, aim, e);
  for (const at of [1.5, 1.0, 0.5]) if (before > at && intro <= at) { banner(String(Math.round(at * 2))); sound.play("countdown_beep", { gain: 0.5 }); }
  if (intro <= 0) { banner("Go"); sound.play("countdown_go", { gain: 0.6 }); last = performance.now(); }
  hud();
  r.render(world.scene, { speed: 0, hit: 0, dim: 0 });
}

/** A ghost car to where its line is `time` s in, fading as it nears your car. */
function placeGhost(car: Car, p: { x: number; z: number; yaw: number }, mat: THREE.MeshBasicMaterial, full: number) {
  car.root.position.set(p.x, 0, z0 + p.z);
  car.root.rotation.y = p.yaw * FEEL.yaw;
  const near = Math.hypot(p.x - run!.veh.x, z0 + p.z - run!.veh.z);
  mat.opacity = full * THREE.MathUtils.clamp((near - 5) / 15, 0, 1);
}

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (state === "loading" || state === "map") return; // the map covers everything: nothing to draw under it
  if (state === "garage") { garageScene?.frame(dt); drawTags(); return; }
  if (!run) return;
  if (state === "paused") { r.render(world.scene, { dim: 0.35 }); return; }
  if (state === "run" && intro > 0) { opening(dt); return; }
  if (slowmo > 0) { slowmo -= dt; dt *= 0.25; if (slowmo <= 0 && state === "over") results(); }
  t += dt;
  acc += dt;
  const inp = state === "free" ? autopilot() : state === "run" || state === "over" ? (scene ? autopilot(scene.speed ?? 170, true) : input()) : { throttle: 0, brake: 0.2, steer: 0 };
  const t0 = performance.now();
  while (acc >= STEP) {
    run.step(STEP, inp);
    acc -= STEP;
    // a Sprint's run, kept as a line through time: the ghost of a new best
    if (recording && state === "run" && run.score.time >= recording.z.length * GHOST_DT) { const v = run.veh; recording.x.push(+v.x.toFixed(2)); recording.z.push(+(v.z - z0).toFixed(2)); recording.yaw.push(+v.yaw.toFixed(3)); }
  }
  const live = state === "run" || state === "over", at = run.score.time + acc;
  // your best run's ghost, beside you; a duel's rival ahead or behind
  if (ghostCar) {
    const g = sprintNow() ? ghosts[sprintNow()!.id] : null;
    ghostCar.root.visible = ghostOn && !!g && live && at < g.time + 1;
    if (g && ghostCar.root.visible) placeGhost(ghostCar, ghostAt(g, at), ghostMat, GHOST_OPACITY);
  }
  if (rival) {
    rival.car.root.visible = live && at < rival.time + 2;
    if (rival.car.root.visible) placeGhost(rival.car, rivalAt(at), rivalMat, RIVAL_OPACITY);
  }
  const t1 = performance.now();
  run.draw(dt, acc / STEP);
  const v = run.veh, pose = run.pose;
  const t2 = performance.now();
  world.follow(pose.z);
  const t3 = performance.now();
  if (state === "free") {
    // a car-advert orbit around your car as it drives
    const a = t * 0.1 + 2.4, d = 8.6;
    r.camera.position.set(pose.x + Math.sin(a) * d, 1.5 + Math.sin(t * 0.21) * 0.25, pose.z + Math.cos(a) * d);
    // aim to the car's left on screen, so it stands clear of the sign
    const right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    r.camera.lookAt(new THREE.Vector3(pose.x, 0.75, pose.z).addScaledVector(right, -2.1));
    r.camera.fov = 38;
    r.camera.updateProjectionMatrix();
  } else chase.update(dt, pose, (world.lo + world.hi) / 2);
  sound.drive(v.rpm, v.shifting > 0 ? 0 : v.throttle, v.u, Math.max(v.slipFront, v.slipRear), v.spec.redline);
  sound.loop("scrape_metal", run.scraping > 0 ? 0.55 : 0);
  if (v.gear !== lastGear) { if (v.gear > lastGear && state === "run") sound.play("gear_change", { gain: 0.3 }); lastGear = v.gear; }
  if (state === "run") hud();
  flash = Math.max(0, flash - dt * 1.6);
  if (state !== drawn) { r.finish.cut = true; drawn = state; } // a new view: the blur must not smear the old one into it
  r.render(world.scene, { speed: state === "free" ? 0 : Math.max(0, (v.u - 30) / 45), hit: flash, dim: state === "results" ? 0.3 : 0 });
  // ?perf: a frame over 20 ms says where its time went
  if (q.has("perf")) { const t4 = performance.now(); if (t4 - t0 > 20) console.warn(`slow frame, ${r.gl.info.programs?.length} shaders, ${(t4 - t0).toFixed(1)}ms: step ${(t1 - t0).toFixed(1)} draw ${(t2 - t1).toFixed(1)} world ${(t3 - t2).toFixed(1)} render ${(t4 - t3).toFixed(1)}`); }
}

// ---------------------------------------------------------------- boot

pal.onAction((id: string) => {
  if (id === "pause") { if (state === "run") pause(); else if (state === "paused") resume(); }
  if (id === "mute") onKey("m");
  if (id === "give-up" && (state === "run" || state === "paused")) giveUp();
  if (id === "start-over" && state !== "loading") startOver();
});
pal.onHidden(() => { if (state === "run") pause(); sound.suspend(); keepRun(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) keepRun(); });
addEventListener("pagehide", keepRun);

/** A fresh save, keeping the settings, and back to the map. */
async function startOver() {
  if (trial || scene) return;
  const settings = save.settings;
  save = fresh();
  save.settings = settings;
  ghosts = {};
  pal.storage.set("ghosts", {}).catch(() => undefined);
  ended = null; crashInfo = null;
  pal.storage.set("run", null).catch(() => undefined);
  garageScene?.dispose(); garageScene = null;
  openMap();
  hint("Started over");
}

/** A Free Drive run being driven is kept in storage while the page is hidden, so closing pal (which may drop the page) loses
 *  nothing. A Sprint is a minute: it is not kept. */
type Kept = Packed & { location: string };
function keepRun() {
  if (scene || trial) return;
  const live = run && (state === "run" || state === "paused") && !run.over && !trip;
  const kept: Kept | null = live ? { ...run!.drive.pack(), location: save.location } : null;
  pal.storage.set("run", kept).catch((e: unknown) => console.error("highway: keep", e));
}
/** Back on the road where a kept run left off, paused. */
async function carryOn(k: Kept) {
  await drive(() => { run!.drive.unpack(k); run!.settle(); });
  hint("");
  pause();
}
pal.onShown(() => { if (state !== "paused") sound.start(); last = performance.now(); account(); });
// A save sync merged with another machine's: take it, so the next change writes onto it rather than over it.
pal.storage.onChange((k, v) => {
  if (k === "ghosts" && v && typeof v === "object") { ghosts = v as Record<string, Ghost>; return; }
  if (k !== "save" || scene || trial) return;
  const vol = save.settings.sound;
  save = load(v);
  save.settings.sound = vol; // the volume is this machine's setting (pal's Volume)
  if (state === "map") showMap(mapView());
  if (state === "garage") drawGarage();
  if (state === "free") drawFree();
});
pal.onSettings((s: Record<string, unknown>) => {
  if (typeof s.volume === "number") { save.settings.sound = s.volume / 100; sound.setVolume(muted ? 0 : save.settings.sound); }
  if (typeof s.ghost === "boolean") ghostOn = s.ghost;
});

// `?dev`: the page's state on window.hw, so a headless check can look inside
if (q.has("dev")) Object.assign(window, { hw: { get run() { return run; }, get save() { return save; }, get state() { return state; }, get camera() { return r.camera; }, get world() { return world; }, r, THREE } });

/** Play a staged scene: the map, the garage, a Free Drive run already going, or its end; a Sprint with `sprint`. */
async function stage(sc: Scene) {
  if (sc.location) save.location = sc.location;
  if (sc.mode) save.mode = sc.mode;
  if (sc.car) {
    save.car = sc.car;
    save.owned[sc.car] ??= { upgrades: { ...NO_UP }, paint: sc.paint ?? carOf(sc.car).paint };
    if (sc.paint) save.owned[sc.car].paint = sc.paint;
  }
  if (sc.show === "map") { if (sc.sprint) save.stop = sc.sprint; return openMap(); }
  if (sc.show === "garage") return openGarage(sc.car);
  const sp = sc.sprint ? sprintOf(sc.sprint) : null;
  trip = sp ? { sprint: sp, car: carOf(save.car) } : null;
  await drive();
  // the run, played forward by the driver, then shown live
  run!.veh.launch(((sc.speed ?? 170) / 3.6) * 0.9 * FEEL.pace);
  if (!sp) run!.director.time = 50; // a minute in: busy, with the gaps a driver at speed threads
  run!.drive.ghost = true; // played forward and on while the picture is taken: no crash may end it
  for (let i = 0; i < (sc.warm ?? 6) * 120; i++) { run!.step(1 / 120, autopilot(sc.speed ?? 170, true)); if (i % 60 === 0) run!.draw(1 / 2); }
  run!.settle();
  chase.reset(run!.pose);
  if (sc.show === "results") { crashInfo = sc.crash ?? null; results(); }
}

(async () => {
  pal.ready(); // the loading sign is ours to show: reveal the page at once
  scene = ((await pal.storage.get("scene").catch(() => null)) as Scene | null) ?? null;
  save = load(await pal.storage.get("save").catch(() => null));
  ghosts = ((await pal.storage.get("ghosts").catch(() => null)) as Record<string, Ghost> | null) ?? {};
  account();
  let kept = scene ? null : ((await pal.storage.get("run").catch(() => null)) as Kept | null);
  if (kept && save.owned[kept.car] && places(save).some((l) => l.id === kept!.location) && !(kept as { sprint?: unknown }).sprint) {
    save.car = kept.car; save.mode = kept.mode; save.location = kept.location;
  } else kept = null;
  if (q.has("test")) {
    // a test drive: every car yours and every region open, nothing written back
    trial = true;
    save.cash = 2_000_000;
    for (const c of CARS) save.owned[c.id] ??= { upgrades: { ...NO_UP }, paint: c.paint };
    for (const [i] of REGIONS.entries()) save.sprints[bossOf(i).id] ??= 1;
  }
  const settings = (await pal.settings().catch(() => ({}))) as Record<string, unknown>;
  if (typeof settings.volume === "number") save.settings.sound = settings.volume / 100;
  if (typeof settings.ghost === "boolean") ghostOn = settings.ghost;
  sound.volume = save.settings.sound;
  names = new Map((await fetch("./cars/cars.json").then((x) => x.json())).map((c: { id: string; name: string }) => [c.id, c.name]));
  const loc = placeOf(save.location);
  veil(true, "Loading the road");
  await world.build(loc.sky, loc.asphalt, layoutOf(save.mode));
  builtFor = `${loc.id}/${layoutOf(save.mode).lanes}/${layoutOf(save.mode).oncoming}`;
  await preloadTraffic((f) => (($("loading").querySelector("em") as HTMLElement).style.width = `${Math.round(f * 100)}%`));
  chase.view = viewOf(save);
  frame(); // the loop runs behind the sign, so it lifts over a drawn road
  veil(false);
  if (scene) await stage(scene);
  else if (kept) await carryOn(kept);
  else if (q.has("drive")) await drive();
  else openMap();
})();
