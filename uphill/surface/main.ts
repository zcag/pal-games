// Uphill's page: the run, the camera, the effects and the end card. The rules
// (../game/sim.ts) step at a fixed 60 a second and the picture is drawn
// between two steps, so it is smooth on any display. The best distance goes
// through the kit's storage (synced: the larger wins); hiding pal's panel
// pauses the run.
import type { SurfaceKit } from "@zcag/pal";
import { DT, STAGE as SEED, create, drain, forward, over, pose, step, travel, type End, type Input, type Pose, type State } from "../game/sim.ts";
import { ground } from "../game/terrain.ts";
import { KEYS } from "../game/keys.ts";
import { decide, type Style } from "../game/bot.ts";
import { Renderer, type Camera, type Float, type Particle, type Scheme } from "./render.ts";
import { LOOKS, SCENES, type LookId } from "./looks.ts";
import { STYLES, STYLE_NAMES, type StyleId } from "./paint.ts";
import { Sound } from "./audio.ts";

declare const pal: SurfaceKit;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const canvas = $<HTMLCanvasElement>("#game");
const gfx = new Renderer(canvas);
const sound = new Sound();

let s: State = create(SEED);
let prev: Pose = pose(s), cur: Pose = pose(s);
let best = 0;
let paused = false, hidden = false;
/** A store picture holds its moment (`scene`, below). */
let frozen = false;
let shownEnd = false;
/** Steered by the bot (`?bot=1`, the store pictures), not the keys. */
const params = new URLSearchParams(location.search);
let autopilot = params.has("bot");
const keys = { gas: false, brake: false };
const particles: Particle[] = [];
const floats: Float[] = [];
const cam: Camera = { x: cur.x, y: cur.y, ppm: 28, shake: 0 };
let look = 0, zoom = 1, wall = 0, acc = 0, last = performance.now(), lowWarned = false, coinN = 0;

// ---- the run ----------------------------------------------------------------------------------------------------

function settle(st: State) {
  // A second of standing still, so the car sits on its springs before the first frame.
  for (let i = 0; i < 50; i++) step(st, { gas: false, brake: false });
  drain(st);
}

function restart() {
  s = create(SEED);
  settle(s);
  prev = cur = pose(s);
  particles.length = floats.length = 0;
  shownEnd = false;
  lowWarned = false;
  coinN = 0;
  cam.x = cur.x + 2; cam.y = cur.y;
  look = 2;
  $("#end").hidden = true;
  $("#hint").classList.remove("gone");
  paused = false;
  syncHud();
}

let style: Style = "careful";
const input = (): Input => (autopilot ? decide(s, style) : { gas: keys.gas, brake: keys.brake });

function tick() {
  prev = cur;
  step(s, input());
  cur = pose(s);
  for (const e of drain(s)) {
    if (e.type === "coin") {
      coinN++;
      sound.coin(coinN);
      // A row of coins adds up in one number over the last one taken.
      const f = floats.find((f) => f.coin && f.life > 0.75);
      if (f) { f.sum! += e.value; f.text = `+${f.sum}`; f.x = e.x; f.y = e.y + 0.5; f.life = 1; }
      else floats.push({ x: e.x, y: e.y + 0.5, text: `+${e.value}`, life: 1, coin: true, sum: e.value });
      burst(e.x, e.y, "coin", 5, 3, 0.09);
    } else if (e.type === "fuel") {
      sound.fuel();
      burst(e.x, e.y, "can", 14, 5, 0.12);
      flashGauge();
      lowWarned = false;
    } else if (e.type === "land") {
      sound.land(e.hit);
      for (const w of cur.wheels) burst(w.x, w.y - 0.4, "dust", Math.round(3 + e.hit * 1.5), 1.5 + e.hit * 0.25, 0.22, true);
      if (e.hit > 6) cam.shake = Math.min(7, (e.hit - 5) * 1.3);
    } else if (e.type === "flip") {
      sound.bonus();
      toast(e.n > 1 ? `${e.n}× flip  +${e.bonus}` : `Flip  +${e.bonus}`);
    } else if (e.type === "air") {
      sound.bonus();
      toast(`Air time ${e.t.toFixed(1)} s  +${e.bonus}`);
    } else if (e.type === "end") {
      if (e.why === "crash" || e.why === "fell") { sound.crash(); cam.shake = 6; }
      else if (e.why === "fuel") sound.empty();
    }
  }
  // Dust from the driven wheel when it is pushing on the ground.
  const fwd = forward(s);
  // Dust only where the tyre works: pulling away, climbing hard, or spinning faster than the car goes.
  const slip = Math.abs(s.wheels[0].getAngularVelocity()) * 0.46 - Math.abs(fwd);
  if (s.touching[0] && input().gas && !s.ended && (slip > 1.2 || Math.abs(fwd) < 4)) {
    const w = cur.wheels[0];
    if (Math.random() < 0.35) particles.push({ x: w.x - 0.3, y: w.y - 0.38, vx: -1 - Math.random() * 1.5 - fwd * 0.1, vy: 0.6 + Math.random() * 1.2, life: 0.6, max: 0.6, size: 0.13 + Math.random() * 0.1, color: "dust", kind: "dust" });
  }
  if (s.fuel < 0.22 && !lowWarned && s.fuel > 0) { lowWarned = true; sound.low(); }
}

function burst(x: number, y: number, color: string, n: number, speed: number, size: number, ground = false) {
  for (let i = 0; i < n; i++) {
    const a = ground ? Math.PI * (0.1 + Math.random() * 0.8) : Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, size: size * (0.6 + Math.random() * 0.8), color, kind: color === "dust" ? "dust" : "spark" });
  }
}

let toastTimer = 0;
function toast(text: string) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 1400);
}
function flashGauge() {
  const el = $("#fuel");
  el.classList.remove("fill");
  void el.offsetWidth;
  el.classList.add("fill");
}

// ---- frame ------------------------------------------------------------------------------------------------------

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => a + (Math.atan2(Math.sin(b - a), Math.cos(b - a))) * t;
const blend = (a: Pose, b: Pose, t: number): Pose => ({
  x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), a: lerpAngle(a.a, b.a, t),
  wheels: a.wheels.map((w, i) => ({ x: lerp(w.x, b.wheels[i].x, t), y: lerp(w.y, b.wheels[i].y, t), a: lerpAngle(w.a, b.wheels[i].a, t) })),
  head: { x: lerp(a.head.x, b.head.x, t), y: lerp(a.head.y, b.head.y, t) },
});

function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (paused || hidden || frozen) { sound.engine(0, 0, false); draw(1, 0); syncHud(); return; }
  wall += dt;
  acc += dt;
  let n = 0;
  while (acc >= DT && n < 6) { tick(); acc -= DT; n++; }
  if (n === 6) acc = 0;
  const alpha = acc / DT;
  for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= (p.kind === "dust" ? 1.5 : 7) * dt; p.vx *= 1 - dt * 1.5; }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
  for (const f of floats) f.life -= dt * 1.1;
  for (let i = floats.length - 1; i >= 0; i--) if (floats[i].life <= 0) floats.splice(i, 1);

  // The engine: rpm from the driven wheel, throttle from the keys.
  const rpm = Math.abs(s.wheels[0].getAngularVelocity());
  const gas = input().gas && s.fuel > 0 && !s.ended ? 1 : 0;
  sound.engine(rpm, gas, s.fuel > 0 && !s.ended);
  draw(alpha, dt);

  if (over(s) && !shownEnd && s.t - s.endedAt > (s.ended === "fuel" ? 0.3 : 0.75)) showEnd(s.ended!);
  syncHud();
}

/** The camera follows: look ahead the way the car is going, pull out with speed and in the air. */
function follow(p: Pose, dt: number) {
  const v = s.chassis.getLinearVelocity();
  // Once the run is over, the wreck moves left of centre, clear of the card on the right.
  const aim = s.ended && s.endedAt >= 0 ? (gfx.w / 2 - Math.min(170, gfx.w * 0.25)) / cam.ppm : Math.max(-3, Math.min(7, v.x * 0.5));
  look = lerp(look, aim, 1 - Math.exp(-dt * (s.ended ? 2.5 : 1.6)));
  const air = !(s.touching[0] || s.touching[1]);
  const speed = Math.hypot(v.x, v.y);
  const z = 1 / (1 + Math.max(0, speed - 6) * 0.016 + (air && s.air > 0.35 ? 0.12 : 0));
  zoom = lerp(zoom, z, 1 - Math.exp(-dt * (z < zoom ? 2.2 : 1.1)));
  const tx = p.x + look;
  // Height: between the car and the ground ahead of it, so a climb shows where it goes.
  const ty = lerp(p.y, ground(SEED, tx + 6), 0.3) + 0.8;
  // Never back while the car goes forward (or forward while it backs): the look-ahead pulling in on a brake moved the camera, and the land with it, the wrong way.
  const nx = lerp(cam.x, tx, 1 - Math.exp(-dt * 6));
  cam.x = !s.ended && (nx - cam.x) * v.x < 0 && Math.abs(v.x) > 0.3 ? cam.x : nx;
  cam.y = lerp(cam.y, ty, 1 - Math.exp(-dt * 4.5));
  cam.shake = Math.max(0, cam.shake - dt * 22);
  cam.ppm = (gfx.h / 10) * zoom;
}

function draw(alpha: number, dt: number) {
  const p = blend(prev, cur, alpha);
  if (dt > 0) follow(p, dt);
  cam.ppm = (gfx.h / 10) * zoom;
  gfx.draw({ seed: SEED, pose: p, dizzy: s.ended === "crash" ? s.t - s.endedAt : -1, coins: s.coins, cans: s.cans, best, t: wall, particles, floats, cam, travel: travel(s) });
}

// ---- HUD and the end card ----------------------------------------------------------------------------------------

const fmt = (n: number) => Math.floor(n).toLocaleString("en-US");
let hudKey = "";
function syncHud() {
  const k = `${Math.floor(s.dist)}|${Math.round(s.fuel * 200)}|${s.coinsTaken}|${best}`;
  if (k === hudKey) return;
  hudKey = k;
  $("#dist").textContent = `${fmt(s.dist)} m`;
  $("#best").textContent = best > 0 ? `best ${fmt(best)} m` : "";
  $("#coins b").textContent = fmt(s.coinsTaken);
  const bar = $("#fuel i");
  bar.style.width = `${(s.fuel * 100).toFixed(1)}%`;
  $("#fuel").classList.toggle("low", s.fuel < 0.22);
}

const WHY: Record<End, string> = { crash: "Driver down", fuel: "Out of fuel", fell: "Into the gap" };
function showEnd(why: End) {
  shownEnd = true;
  const record = s.dist > best + 0.5;
  if (record) { best = Math.floor(s.dist); void pal.storage.set("best", best); }
  $("#why").textContent = WHY[why];
  $("#end-dist").textContent = `${fmt(s.dist)} m`;
  $("#end-note").textContent = record ? (best > 50 ? "A new best" : "") : `Best ${fmt(best)} m, ${fmt(best - s.dist)} m further`;
  $("#end-coins").textContent = fmt(s.coinsTaken);
  $("#end").hidden = false;
  $("#end").classList.toggle("record", record);
}

// ---- the look ----------------------------------------------------------------------------------------------------

let lookId: LookId = "forest";
/** A look's colours on the canvas, and the HUD's over its sky (Classic's follows pal's theme). */
function applyLook(id: LookId) {
  lookId = id;
  void gfx.setLook(id);
  if (id === "classic") delete document.documentElement.dataset.hud;
  else document.documentElement.dataset.hud = SCENES[id].hud;
}
let lookTimer = 0;
/** The look's or the style's name, briefly, at the top. */
function say(html: string) {
  const el = $("#look");
  el.innerHTML = html;
  el.classList.add("show");
  clearTimeout(lookTimer);
  lookTimer = window.setTimeout(() => el.classList.remove("show"), 1600);
}
function nextLook() {
  const id = LOOKS[(LOOKS.indexOf(lookId) + 1) % LOOKS.length];
  applyLook(id);
  void pal.storage.set("look", id);
  say(`${id === "classic" ? "Classic" : SCENES[id].name} <span><kbd>L</kbd> next look</span>`);
}
/** K: the next style for everything in front of the landscape, on any look but Classic, which keeps its own drawing. */
function nextStyle() {
  const id = STYLES[(STYLES.indexOf(gfx.style) + 1) % STYLES.length];
  gfx.style = id;
  void pal.storage.set("style", id);
  say(`${STYLE_NAMES[id]} <span>${lookId === "classic" ? "on the other looks; Classic keeps its own" : "<kbd>K</kbd> next style"}</span>`);
}

// ---- keys -------------------------------------------------------------------------------------------------------

const GAS = new Set<string>(KEYS.gas), BRAKE = new Set<string>(KEYS.brake);
addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const c = e.code;
  if (GAS.has(c) || BRAKE.has(c)) {
    e.preventDefault();
    sound.start();
    if (GAS.has(c)) keys.gas = true; else keys.brake = true;
    if (paused) paused = false;
    frozen = false;
    if (!s.ended) $("#hint").classList.add("gone");
    autopilot = false;
    return;
  }
  if (e.repeat) return;
  if (c === "KeyR" || (c === "Space" && over(s))) { e.preventDefault(); sound.start(); restart(); return; }
  if (c === "Space") { e.preventDefault(); return; }
  if (c === "KeyP") { if (!over(s)) paused = !paused; showPause(); return; }
  if (c === "KeyM") { sound.toggle(); return; }
  if (c === "KeyL") { nextLook(); return; }
  if (c === "KeyK") { nextStyle(); return; }
});
addEventListener("keyup", (e: KeyboardEvent) => {
  if (GAS.has(e.code)) keys.gas = false;
  if (BRAKE.has(e.code)) keys.brake = false;
});
addEventListener("blur", () => { keys.gas = keys.brake = false; });

function showPause() {
  $("#paused").hidden = !(paused && !hidden && !over(s));
}

pal.onAction((id) => {
  if (id === "again") restart();
  else if (id === "pause") { paused = !paused; showPause(); }
  else if (id === "mute") sound.toggle();
  else if (id === "look") nextLook();
  else if (id === "style") nextStyle();
});
pal.onHidden(() => { hidden = true; keys.gas = keys.brake = false; if (!over(s) && s.started) paused = true; sound.suspend(); });
pal.onShown(() => { hidden = false; last = performance.now(); showPause(); if (!paused) sound.start(); });

const applySettings = (v: Record<string, unknown>) => {
  const vol = typeof v.volume === "number" ? v.volume : 70;
  sound.setVolume(vol / 100);
};
pal.onSettings(applySettings);
const scheme = (): Scheme => (document.documentElement.dataset.theme === "light" ? "light" : document.documentElement.dataset.theme === "dark" ? "dark" : matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
pal.onTheme((sc) => gfx.scheme(sc));
pal.storage.onChange((key, value) => {
  if (key === "best" && typeof value === "number" && value > best) best = value;
  if (key === "look" && LOOKS.includes(value as LookId)) applyLook(value as LookId);
  if (key === "style" && STYLES.includes(value as StyleId)) gfx.style = value as StyleId;
});

// ---- start ------------------------------------------------------------------------------------------------------

new ResizeObserver(() => gfx.resize()).observe(canvas);
gfx.resize();
gfx.scheme(scheme());
/**
 * A store picture's moment (the fixture's `scene` in storage): the bot drives
 * there in an instant, `to` metres in (or until the run ends), then the
 * picture holds; `drive` keeps it driving, `end` lets the end card come up.
 */
type Scene = { to: number; style?: Style; hold?: boolean; end?: boolean };
function stage(sc: Scene) {
  autopilot = true;
  style = sc.style ?? "careful";
  $("#hint").classList.add("gone");
  for (let i = 0; i < 60 * 600 && s.dist < sc.to && !over(s); i++) { tick(); follow(cur, DT); for (const p of particles) { p.life -= DT; p.x += p.vx * DT; p.y += p.vy * DT; } for (const f of floats) f.life -= DT * 1.1; }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
  for (let i = floats.length - 1; i >= 0; i--) if (floats[i].life <= 0) floats.splice(i, 1);
  if (sc.end) for (let i = 0; i < 60 * 3 && !shownEnd; i++) { tick(); follow(cur, DT); if (over(s) && s.t - s.endedAt > 0.75) showEnd(s.ended!); }
  prev = cur;
  frozen = !!sc.hold;
}

(async () => {
  const [b, set, scene, lk, st] = await Promise.all([pal.storage.get("best"), pal.settings(), pal.storage.get("scene").catch(() => null), pal.storage.get("look").catch(() => null), pal.storage.get("style").catch(() => null)]);
  if (typeof b === "number") best = b;
  if (STYLES.includes(st as StyleId)) gfx.style = st as StyleId;
  // The layers are recoloured before the first frame, so the page never opens on an empty sky.
  applyLook(LOOKS.includes(lk as LookId) ? (lk as LookId) : "forest");
  await gfx.setLook(lookId);
  applySettings(set);
  restart();
  if (scene) stage(scene as Scene);
  if (autopilot) $("#hint").classList.add("gone");
  last = performance.now();
  requestAnimationFrame(frame);
  requestAnimationFrame(() => pal.ready());
})();

// For a headless check: the run's numbers.
(window as unknown as { uphill: unknown }).uphill = { get s() { return s; }, get best() { return best; }, get cam() { return cam; } };
