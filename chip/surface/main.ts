// Chip's page: one hole, played. The sim (../game/sim.ts) is stepped at a
// fixed 120 Hz behind the frames and its events become sound, puffs and
// words; the camera follows the ball with a little look-ahead and backs
// off as it flies fast, and is never allowed to lose it. The first time
// the page opens it glides from the flag back to the tee, so you have seen
// the hole before you hit. The best score goes through the kit's storage
// (synced); hiding pal's panel pauses a shot in the air.
import type { SurfaceKit } from "@zcag/pal";
import { HOLE, groundAt, type Pt, type Surface } from "../game/hole.ts";
import { DT, ballOf, create, hit, scoreName, step, type Ev, type State } from "../game/sim.ts";
import { DARK, LIGHT, Renderer, type Cam, type Particle } from "./render.ts";
import { setVolume, sound } from "./audio.ts";

declare const pal: SurfaceKit;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const gfx = new Renderer($<HTMLCanvasElement>("#c"));
const mapCanvas = $<HTMLCanvasElement>("#map");
const mapCtx = mapCanvas.getContext("2d")!;

/** How aiming and the meter feel.
 *  Up and down: a tap moves the aim one degree; held, it moves `slow` degrees a second, then after `ramp` s `fast`; Shift `fine`.
 *  The meter rises from empty to full in `fill` s and falls back the same way, eased so it lingers at both ends:
 *  a full drive and a soft putt are the two shots you can repeat by feel. */
const AIM = { tap: 1, slow: 14, fast: 55, ramp: 0.35, fine: 5, min: 0, max: 89 };
const METER = { fill: 0.95 };

let s: State = create();
let angle = 45, facing: 1 | -1 = 1;
let charging = false, phase = 0, power = 0;
let lastPower: number | null = null, lastAngle: number | null = null, lastFacing: 1 | -1 = 1;
let best: number | null = null;
let paused = false;
let intro = 0; // seconds left of the opening glide
const INTRO = 2.6;

const held = new Set<string>();
let aimHeld = 0; // seconds the aim key has been held
let trail: Pt[] = [], lastTrail: Pt[] = [];
let particles: Particle[] = [];
let shake = 0, flagUp = 0;
let throughShown = false;
let t = 0, acc = 0, last = performance.now();
const cam: Cam = { x: HOLE.cup.x - 6, y: HOLE.cup.y + 3, scale: gfx.baseScale() };

// ---- HUD ----------------------------------------------------------------------------------------------------------------

const hud = { strokes: $("#strokes"), best: $("#best"), keys: $("#keys"), banners: $("#banners"), card: $("#card") };

function renderHud() {
  hud.strokes.textContent = String(s.strokes);
  hud.best.textContent = best === null ? "" : `best ${best}`;
  const k = (x: string) => `<kbd>${x}</kbd>`;
  hud.keys.innerHTML =
    s.phase === "holed" ? `${k("space")} play again`
    : s.phase === "fly" && !s.landed ? `${k("←")}${k("→")} spin: back bites, forward runs`
    : s.phase === "aim" && intro <= 0 ? `${k("↑")}${k("↓")} aim <s>·</s> ${k("←")}${k("→")} turn <s>·</s> hold ${k("space")} power <s>·</s> ${k("r")} again`
    : "";
}

function banner(text: string, sub = "", cls = "") {
  const el = document.createElement("div");
  el.className = `banner ${cls}`;
  el.innerHTML = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ""}`;
  hud.banners.append(el);
  setTimeout(() => el.remove(), 2400);
}

function showCard() {
  const diff = s.strokes - HOLE.par;
  const name = scoreName(s.strokes, HOLE.par);
  const isBest = best === null || s.strokes < best;
  hud.card.innerHTML = `
    <div class="name ${diff < 0 ? "good" : ""}">${name}</div>
    <div class="line">${s.strokes} ${s.strokes === 1 ? "stroke" : "strokes"} on a par ${HOLE.par}${isBest && best !== null ? " · a new best" : best !== null ? ` · best ${best}` : ""}</div>
    <div class="keys"><kbd>space</kbd> play again</div>`;
  hud.card.hidden = false;
  if (isBest) {
    best = s.strokes;
    pal.storage.set("best", best).catch((e) => console.error("chip: save", e));
  }
}

// ---- the game -----------------------------------------------------------------------------------------------------------

function restart() {
  s = create();
  angle = lastAngle ?? 45; facing = lastFacing;
  charging = false; power = 0;
  trail = []; lastTrail = []; particles = [];
  flagUp = 0; throughShown = false;
  hud.card.hidden = true;
  renderHud();
}

function shoot() {
  charging = false;
  if (power < 0.01) { power = 0; return; } // a tap of Space is not a shot
  lastPower = power; lastAngle = angle; lastFacing = facing;
  lastTrail = trail; trail = [];
  hit(s, { angle, facing, power });
  throughShown = false;
  if (power > 0.9) shake = 0.6 * power;
  power = 0;
  renderHud();
}

/** The spin the held arrows ask for: back (+1) is the arrow away from where the ball is going. */
function spinInput(): number {
  const dir = (held.has("ArrowRight") ? 1 : 0) - (held.has("ArrowLeft") ? 1 : 0);
  if (!dir) return 0;
  const vx = ballOf(s).vx;
  return -dir * (vx >= 0 ? 1 : -1);
}

const SURFACE_PUFF: Record<Surface, string[]> = {
  tee: ["#6fbf55", "#9ad67c"], fairway: ["#6fbf55", "#9ad67c"], rough: ["#3f8237", "#5a9a4a"],
  sand: ["#efd9a2", "#e2c98a", "#f6e6be"], green: ["#8fd768", "#b3e891"], rock: ["#c98256", "#e0a27a", "#8b5a3c"],
};

function puff(x: number, y: number, n: number, colors: string[], speed: number, kind: Particle["kind"] = "dot") {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.15 + 0.7 * Math.random()), v = speed * (0.3 + 0.7 * Math.random());
    particles.push({ x, y, vx: Math.cos(a) * v * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.5, age: 0, size: 1.5 + Math.random() * 2, color: colors[i % colors.length], kind });
  }
}

function onEvent(e: Ev) {
  const b = ballOf(s);
  switch (e.type) {
    case "hit":
      sound.hit(e.power);
      puff(b.x, b.y - 0.15, Math.round(3 + 8 * e.power), SURFACE_PUFF.fairway, 2 + 4 * e.power);
      break;
    case "bounce":
      sound.bounce(e.surface, e.speed);
      if (e.speed > 1.5) puff(b.x, b.y - 0.15, Math.min(14, Math.round(e.speed * (e.surface === "sand" ? 1.4 : 0.6))), SURFACE_PUFF[e.surface], Math.min(6, e.speed * (e.surface === "sand" ? 0.45 : 0.25)));
      if (e.surface === "rock" && e.speed > 12) shake = Math.max(shake, 0.4);
      break;
    case "water":
      sound.splash();
      for (let i = 0; i < 26; i++) particles.push({ x: b.x, y: HOLE.water[0].y1, vx: (Math.random() - 0.5) * 5, vy: 3 + Math.random() * 6, life: 0.7 + Math.random() * 0.4, age: 0, size: 1.6 + Math.random() * 1.8, color: Math.random() < 0.5 ? "#bfe6f3" : "#ffffff", kind: "drop" });
      banner("Splash", "in the pond · a stroke added");
      break;
    case "lost":
      banner("Lost", "out of play · a stroke added");
      break;
    case "back":
      sound.back();
      lastTrail = trail; trail = [];
      renderHud();
      break;
    case "rest":
      lastTrail = trail; trail = [];
      renderHud();
      break;
    case "cup": {
      const diff = s.strokes - HOLE.par;
      sound.cup(diff);
      const c = HOLE.cup;
      const colors = ["#e8473b", "#f6c343", "#4e8fe0", "#9be15d", "#ffffff", "#c56cf0"];
      const n = diff <= -1 ? 90 : diff === 0 ? 50 : 18;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.25 + 0.5 * Math.random()), v = 5 + Math.random() * 9;
        particles.push({ x: c.x, y: c.y + 0.2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.6 + Math.random() * 1.2, age: 0, size: 2 + Math.random() * 2.5, color: colors[i % colors.length], kind: "confetti" });
      }
      particles.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: 0.9, age: 0, size: 3.5, color: "#ffffff", kind: "ring" });
      flagUp = 1;
      lastTrail = trail; trail = [];
      setTimeout(showCard, 700);
      renderHud();
      break;
    }
  }
}

// ---- the camera ---------------------------------------------------------------------------------------------------------

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function moveCamera(dt: number) {
  const b = ballOf(s), base = gfx.baseScale();
  const viewW = gfx.w / cam.scale, viewH = gfx.h / cam.scale;
  let tx: number, ty: number, scale = base, tau = 0.45;
  if (intro > 0) {
    // The opening: from the flag back down the hole to the tee.
    const u = ease(1 - intro / INTRO);
    tx = HOLE.cup.x - 6 + (b.x + 8 - (HOLE.cup.x - 6)) * u;
    ty = HOLE.cup.y + 3 + (b.y + 2.5 - (HOLE.cup.y + 3)) * u;
    cam.x = tx; cam.y = ty; cam.scale = base * (0.8 + 0.2 * u);
    return;
  }
  if (s.phase === "fly") {
    // Ahead of the ball, and back far enough to keep the ground it will come down on in view (to a point).
    const sp = Math.hypot(b.vx, b.vy);
    tx = b.x + Math.max(-0.3 * viewW, Math.min(0.3 * viewW, b.vx * 0.35));
    const ahead = Math.max(-8, Math.min(95, tx)), gy = Math.min(groundAt(HOLE, b.x), groundAt(HOLE, ahead));
    const above = Math.max(0, b.y - gy);
    // The ground near the bottom when the ball's height allows, else the ball near the top.
    ty = Math.max(gy - 4 + viewH / 2, b.y + 4 - viewH / 2);
    scale = Math.max(base * 0.55, Math.min(base / (1 + sp / 80), (gfx.h * 0.85) / (above + 9)));
    tau = 0.25;
  } else if (s.phase === "holed") {
    tx = HOLE.cup.x; ty = HOLE.cup.y + 3;
    scale = base * 1.15;
    tau = 0.8;
  } else {
    // Aiming: room ahead the way the shot goes, up as well as along.
    const a = (angle * Math.PI) / 180;
    tx = b.x + facing * (0.06 + 0.16 * Math.cos(a)) * viewW;
    ty = b.y + 1.5 + 0.28 * Math.sin(a) * viewH;
  }
  const k = 1 - Math.exp(-dt / tau);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
  cam.scale += (scale - cam.scale) * (1 - Math.exp(-dt / 0.6));
  // Never lose the ball: keep it 50 px inside the edges whatever the smoothing says.
  const mx = (gfx.w / 2 - 50) / cam.scale, my = (gfx.h / 2 - 50) / cam.scale;
  cam.x = Math.max(b.x - mx, Math.min(b.x + mx, cam.x));
  cam.y = Math.max(b.y - my, Math.min(b.y + my, cam.y));
}

// ---- the loop -----------------------------------------------------------------------------------------------------------

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) update(dt);
  draw();
  requestAnimationFrame(frame);
}

function update(dt: number) {
  t += dt;
  if (intro > 0) { intro = Math.max(0, intro - dt); if (intro === 0) renderHud(); }

  if (s.phase === "aim" && intro <= 0) {
    const dir = (held.has("ArrowUp") ? 1 : 0) - (held.has("ArrowDown") ? 1 : 0);
    if (dir) {
      aimHeld += dt;
      const rate = held.has("Shift") ? AIM.fine : aimHeld > AIM.ramp ? AIM.fast : aimHeld > 0.18 ? AIM.slow : 0;
      angle = Math.max(AIM.min, Math.min(AIM.max, angle + dir * rate * dt));
    } else aimHeld = 0;
    if (charging) {
      const before = phase % (2 * Math.PI);
      phase += (Math.PI / METER.fill) * dt;
      const after = phase % (2 * Math.PI);
      if (before < Math.PI && after >= Math.PI) sound.top();
      power = (1 - Math.cos(phase)) / 2;
    }
  }

  // The sim, at its own fixed steps.
  acc += dt;
  while (acc >= DT) {
    acc -= DT;
    const was = s.phase;
    step(s, spinInput());
    if (s.phase === "fly" || was === "fly") {
      const b = ballOf(s);
      trail.push([b.x, b.y]);
      // Through the Needle's arch.
      if (!throughShown && b.x > 72 && b.x < 73.2 && b.y > 14 && b.y < 16.8) { throughShown = true; banner("Through the Needle", "", "gold"); }
    }
    for (const e of s.events) onEvent(e);
    s.events.length = 0;
    if (was === "fly" && s.phase !== "fly") renderHud();
  }
  if (s.phase === "fly" && s.landed && hud.keys.innerHTML.includes("spin")) renderHud();

  for (const p of particles) {
    p.age += dt;
    if (p.kind === "ring") continue;
    p.vy -= (p.kind === "confetti" ? 6 : 14) * dt;
    if (p.kind === "confetti") { p.vx *= 1 - 1.6 * dt; p.vy = Math.max(p.vy, -2.2); }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  particles = particles.filter((p) => p.age < p.life);
  shake = Math.max(0, shake - dt * 4);
  flagUp = Math.max(0, flagUp - dt * 0.25);

  const b = ballOf(s);
  sound.wind(s.phase === "fly" ? Math.min(1, Math.hypot(b.vx, b.vy) / 32) : 0);
  moveCamera(dt);
}

function draw() {
  const b = ballOf(s);
  const flying = s.phase === "fly";
  gfx.draw({
    t,
    cam,
    ball: { x: b.x, y: b.y, angle: b.angle, w: b.w, hidden: false, alpha: s.phase === "penalty" ? Math.max(0, 1 - s.timer * 2) : 1 },
    aim: s.phase === "aim" && intro <= 0 ? { angle, facing, power, charging, last: lastPower, lastAngle, lastFacing } : null,
    spin: flying && !s.landed && Math.abs(b.w) > 2 ? { w: b.w, back: b.w * b.vx > 0 } : null,
    trail,
    lastTrail: s.phase === "aim" ? lastTrail : [],
    particles,
    flagUp,
    shake,
  });
  gfx.map(mapCtx, [b.x, b.y], 150, 30);
}

// ---- input --------------------------------------------------------------------------------------------------------------

const GAME_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Shift", "r", "R"]);

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!GAME_KEYS.has(e.key)) return;
  e.preventDefault();
  held.add(e.key === "R" ? "r" : e.key);
  if (e.repeat) return;
  if (intro > 0) { intro = 0; renderHud(); if (e.key !== " ") return; }
  if (e.key === "r" || e.key === "R") return restart();
  if (s.phase === "holed") { if (e.key === " ") restart(); return; }
  if (s.phase !== "aim") return;
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    angle = Math.max(AIM.min, Math.min(AIM.max, Math.round(angle) + (e.key === "ArrowUp" ? AIM.tap : -AIM.tap)));
    aimHeld = 0;
  }
  if (e.key === "ArrowLeft" && facing === 1) facing = -1;
  if (e.key === "ArrowRight" && facing === -1) facing = 1;
  if (e.key === " " && !charging) { charging = true; phase = 0; power = 0; }
});

window.addEventListener("keyup", (e) => {
  held.delete(e.key === "R" ? "r" : e.key);
  if (e.key === "Shift") held.delete("Shift");
  if (e.key === " " && charging) shoot();
});

window.addEventListener("blur", () => { held.clear(); if (charging) { charging = false; power = 0; } });

pal.onAction((id) => { if (id === "again") restart(); });
pal.onHidden(() => { held.clear(); charging = false; power = 0; paused = true; sound.suspend(); });
pal.onShown(() => { paused = false; last = performance.now(); });
pal.onTheme((scheme) => { gfx.look = scheme === "dark" ? DARK : LIGHT; });
pal.onSettings((v) => setVolume(Number((v as { volume?: number }).volume ?? 70) / 100));
pal.storage.onChange((key, value) => { if (key === "best" && typeof value === "number") { best = value; renderHud(); } });

// ---- start --------------------------------------------------------------------------------------------------------------

async function start() {
  const theme = document.documentElement.dataset.theme;
  gfx.look = theme === "dark" || (!theme && matchMedia("(prefers-color-scheme: dark)").matches) ? DARK : LIGHT;
  const settings = (await pal.settings().catch(() => ({}))) as { volume?: number };
  setVolume(Number(settings.volume ?? 70) / 100);
  const b = await pal.storage.get("best").catch(() => null);
  best = typeof b === "number" ? b : null;
  const params = new URLSearchParams(location.search);
  // ?intro=0 starts at the tee (the headless checks); otherwise the glide plays.
  intro = params.get("intro") === "0" ? 0 : INTRO;
  if (intro <= 0) { const p = ballOf(s); cam.x = p.x + 0.2 * gfx.w / cam.scale; cam.y = p.y + 2.5; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  mapCanvas.width = 150 * dpr; mapCanvas.height = 30 * dpr;
  mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mapCanvas.style.width = "150px"; mapCanvas.style.height = "30px";
  renderHud();
  requestAnimationFrame((n) => { last = n; frame(n); requestAnimationFrame(() => pal.ready()); });
}

// For the headless checks: the shot's state, read from outside.
(window as unknown as { __chip: () => unknown }).__chip = () => { const b = ballOf(s); return { phase: s.phase, strokes: s.strokes, x: b.x, y: b.y, angle, facing, lastPower, power }; };

void start();
