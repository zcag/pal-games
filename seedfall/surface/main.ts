// Seedfall: the integration. Loads or starts a game, runs the fixed-step rules and fans their events out to
// fx, audio and ui, then draws. Order per frame (design/ARCHITECTURE.md): input -> game.step -> events ->
// camera -> fx.update -> renderer.frame -> ui.update -> audio.update.
//
// In pal: the save goes through the kit's storage (synced by pal.json's rules; a merged save that arrives is folded
// in, or taken whole when another machine wrote it later), the volumes are pal settings, and the panel owns Escape
// (it leaves, so the game is stored on the way out). A hidden panel stops the clock: the rigs' time while hidden
// comes back as offline progress when it shows again, from the same timestamps a closed game uses.
import type { SurfaceKit } from "@zcag/pal";
import { Game } from "../game/game.ts";
import type { GameEvent } from "../game/types.ts";
import { MATERIALS, FINDS } from "../game/content/world.ts";
import { absorb } from "../game/sync.ts";
import type { SaveData } from "../game/save.ts";
import { Renderer } from "./render/index.ts";
import { Fx } from "./fx/index.ts";
import { Audio } from "./audio/index.ts";
import { Ui } from "./ui/index.ts";
import { gameModel } from "./ui/game-model.ts";
import type { Settings } from "./ui/model.ts";
import { Keys } from "./input.ts";
import { CameraRig } from "./camera.ts";
import { storage } from "./storage.ts";
import type { ScreenId } from "./ui/index.ts";

declare const pal: SurfaceKit;

/**
 * A staged moment for the store's screenshots (fixture.ts writes it to the extension's storage, beside a save it
 * built with the bot): no title card, a screen open; nothing is stored while it shows. Never set by the game.
 */
interface Scene { screen?: ScreenId; tab?: number }

const STEP = 1 / 60;
const canvas = document.getElementById("game") as HTMLCanvasElement;
const root = document.getElementById("ui") as HTMLElement;
const clock = () => ({ now: Date.now(), tz: new Date().getTimezoneOffset() });

await storage.load(["save", "hints", "mix", "scene"]);

function start(saved: unknown): Game {
  if (saved) {
    try { return Game.load(saved, Date.now(), clock()); } catch (e) { console.warn("save could not be loaded, starting fresh", e); }
  }
  return Game.create((Math.random() * 2 ** 31) >>> 0, clock());
}

const scene = storage.get("scene") as Scene | null;
let game = start(storage.get("save"));
const content = { materials: MATERIALS, finds: FINDS };
const renderer = new Renderer(canvas, content);
const fx = new Fx();
const audio = new Audio(content);
/** The overall volume is pal's setting (`volume`); the mix under it (music, effects, mute) is the game's, stored as `mix`. */
type Mix = Pick<Settings, "music" | "effects" | "muted">;
const settings: Settings = { master: 80, music: 60, effects: 80, muted: false, ...(storage.get("mix") as Mix | null) };
const loudness = (s: Record<string, unknown>) => hooks.setSettings({ master: typeof s.volume === "number" ? Math.max(0, Math.min(100, s.volume)) : 80 });

/** Stored only from a real session, never from the screenshots' staged scene. */
const stored = (p: Promise<void>) => void p.catch((e) => console.error("seedfall: storing", e));
const save = () => { if (!scene) stored(pal.storage.set("save", game.save(Date.now()))); };
const hooks = {
  settings,
  hints: { done: (storage.get("hints") as string[] | null) ?? [], save: (done: string[]) => { if (!scene) stored(pal.storage.set("hints", done)); } },
  setSettings(s: Partial<Settings>, store = true) {
    Object.assign(settings, s);
    Object.assign(audio.settings, settings);
    audio.applySettings();
    if (store && ("music" in s || "effects" in s || "muted" in s)) stored(pal.storage.set("mix", { music: settings.music, effects: settings.effects, muted: settings.muted }));
  },
  resetSave() {
    stored(pal.storage.set("save", null));
    stored(pal.storage.set("hints", null));
    hooks.hints.done = [];
    replace(Game.create((Math.random() * 2 ** 31) >>> 0, clock()));
  },
};
loudness(await pal.settings().catch(() => ({})));
pal.onSettings(loudness);

const ui = new Ui(root, gameModel(game, hooks), { intro: !scene });
const cam = new CameraRig();
cam.snap(game);
let hidden = false, acc = 0, last = performance.now(), saveT = 0;
ui.cssDim = false; // the renderer dims the world through PostFx.dim
ui.onSound((kind, opts) => audio.ui(kind, opts as never));

/** Another game in place of this one (a reset, or a save another machine wrote later). */
function replace(g: Game) {
  game = g;
  ui.m = gameModel(game, hooks);
  cam.snap(game);
  ui.offline();
}

type Screen = Parameters<Ui["open"]>[0];
const SCREEN_OF: Record<string, Screen | undefined> = {
  launch: "launch", rigs: "rigs", rig: "rigs", silo: "rigs", lab: "lab", workshop: "workshop", fuel: "fuel", market: "market", supply: "supply",
};
const keys = new Keys();
const mute = () => hooks.setSettings({ muted: !settings.muted });
keys.listen((e) => {
  // Escape is the panel's: it leaves the game (stored on the way, below) or closes pal's own action panel.
  if (e.code === "Escape") return false;
  if (e.code === "KeyM" && !ui.isOpen() && e.shiftKey) { mute(); return true; }
  if (ui.handleKey(e)) return true;
  // E at a door opens that building (the depot runs on its own when you land)
  if (e.code === "KeyE" && !e.repeat && !ui.isOpen()) {
    const b = game.building();
    if (b && SCREEN_OF[b]) { ui.open(SCREEN_OF[b]!); return true; }
    // E in the chamber wakes the Seed once everything is ready
    if (!game.inTown() && !game.s.launch && game.canLaunch().ok) { game.launch(); return true; }
  }
  return false;
});
// Leaving with Escape unloads the page: store the game first (before the kit forwards the key).
addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Escape") save(); }, true);
// a click on a building in town opens it too
canvas.addEventListener("click", (e) => {
  if (ui.isOpen() || !game.inTown()) return;
  const b = renderer.buildingAt(e.clientX, e.clientY);
  if (b && SCREEN_OF[b]) ui.open(SCREEN_OF[b]!);
});
const wake = () => { if (!hidden) audio.resume(); };
addEventListener("keydown", wake);
addEventListener("pointerdown", wake);


// ---------------------------------------------------------------- pal: actions, the panel hiding, sync, the board

pal.onAction((id) => {
  if (id === "mute") return mute();
  if (ui.isOpen() && id !== "menu") return;
  if (id === "menu") return ui.isOpen() ? ui.close() : ui.open("pause");
  if (id === "workshop" && game.inTown()) return ui.open("workshop");
  if (id === "cargo") return ui.open("cargo");
  if (id === "log") return ui.open("log");
});

pal.onHidden(() => {
  if (hidden) return;
  hidden = true;
  save();
  audio.background(true);
});
pal.onShown(() => {
  if (!hidden) return;
  hidden = false;
  // The rigs ran while the panel was hidden: that time comes back as offline progress, as after a closed game.
  if (!scene) { game.applyOffline(Date.now()); ui.offline(); }
  last = performance.now();
  audio.background(false);
});

// A merged save from sync. Written later by another machine: take it whole (its world and run are the newer ones).
// Otherwise it is this machine's own save merged with older progress from elsewhere: fold in what is kept for good.
pal.storage.onChange((k, v) => {
  if (k === "hints" && Array.isArray(v)) hooks.hints.done = [...new Set([...hooks.hints.done, ...(v as string[])])];
  if (k === "mix" && v && typeof v === "object") hooks.setSettings(v as Mix, false);
  if (k !== "save" || !v || scene) return;
  const theirs = v as SaveData;
  try {
    if ((theirs.state?.lastNow ?? 0) > game.s.lastNow && !game.s.launch) replace(Game.load(theirs, Date.now(), clock()));
    else { absorb(game.s, theirs.state); game.refreshStats(false); }
  } catch (e) { console.warn("seedfall: a synced save could not be read", e); }
});

/** The board: the fastest run from its start to the Core, in play time. */
let core = game.s.records.fastestCore;
const postCore = () => { if (core > 0) void pal.score("core", Math.round(core * 100) / 100).catch(() => {}); };

// ---------------------------------------------------------------- the loop

const frameEvents: GameEvent[] = [];

/** One subsystem throwing must never stop the loop (QA P3-1): log it once per kind and carry on. */
const seen = new Set<string>();
function guard(name: string, fn: () => void) {
  try { fn(); } catch (e) {
    const k = name + String(e);
    if (!seen.has(k)) { seen.add(k); console.error(`${name}:`, e); }
  }
}

function frame(t: number) {
  requestAnimationFrame(frame);
  const realDt = Math.min(0.1, (t - last) / 1000);
  last = t;
  if (hidden) return;
  keys.enabled = !ui.isOpen();
  frameEvents.length = 0;

  // panels and the title card stop the clock (reading the log underground must not burn fuel); the launch runs on
  const frozen = ui.isOpen() && !game.s.launch;
  if (!frozen) {
    if (fx.hitstop > 0) fx.hitstop = Math.max(0, fx.hitstop - realDt);
    else acc += realDt * fx.timeScale;
    let n = 0;
    while (acc >= STEP && n++ < 6) {
      acc -= STEP;
      for (const e of game.step(STEP, keys.take())) frameEvents.push(e);
    }
    if (n >= 6) acc = 0;
  }

  if (frameEvents.length) {
    guard("fx", () => fx.events(frameEvents, game));
    guard("audio", () => audio.events(frameEvents, game));
    guard("ui", () => ui.events(frameEvents, game));
    // a sale, a purchase, a launch: worth storing at once
    if (frameEvents.some((e) => e.t === "dock" || e.t === "buy" || (e.t === "launch" && e.phase === "done"))) saveT = 10;
  }
  if (game.s.records.fastestCore !== core) { core = game.s.records.fastestCore; if (!scene) postCore(); }

  cam.update(realDt, game);
  guard("fx", () => fx.update(realDt, game, cam));
  fx.post.dim = ui.dim;
  // shake rides on the camera for this frame only (tiles)
  cam.x += fx.shake.x; cam.y += fx.shake.y;
  const pod = game.pod;
  renderer.frame(game, cam, fx, {
    ...fx.renderExtras(),
    door: game.building(),
    pod: { ...fx.renderExtras().pod, riding: !!pod.riding, drop: !!(pod as { drop?: boolean }).drop },
  });
  guard("ui", () => ui.update(realDt, game, cam, fx.labels));
  cam.x -= fx.shake.x; cam.y -= fx.shake.y;

  guard("audio", () => audio.update(realDt, game, {
    onSurface: pod.y < 0.5,
    inMenu: ui.isOpen(),
    tension: 0,
    biome: game.world.biome[Math.max(0, Math.min(game.world.biome.length - 1, Math.floor(pod.y)))] ?? 0,
    planet: game.world.planet,
    launching: !!game.s.launch,
    drop: !!(pod as { drop?: boolean }).drop,
  }));

  saveT += realDt;
  if (saveT >= 10) { saveT = 0; save(); }
}

addEventListener("resize", () => renderer.resize());
addEventListener("pagehide", save);

// ---------------------------------------------------------------- the store screenshots' staged moment

if (scene?.screen) ui.open(scene.screen, scene.tab ?? 0);

requestAnimationFrame((t) => {
  last = t;
  frame(t);
  requestAnimationFrame(() => pal.ready());
});

// ---------------------------------------------------------------- debug hooks (?dev)

declare global { interface Window { seedfall: unknown } }
if (new URLSearchParams(location.search).has("dev")) window.seedfall = {
  get game() { return game; },
  ui, fx, audio, renderer, cam,
  teleport: (x: number, y: number) => { game.teleport(x, y); cam.snap(game); },
  give: (cash: number) => { game.s.cash += cash; },
  set: (stat: Parameters<Game["set"]>[0], level: number) => game.set(stat, level),
  reveal: () => (game as unknown as { reveal?: () => void }).reveal?.(),
  save,
  snap: () => cam.snap(game),
};
