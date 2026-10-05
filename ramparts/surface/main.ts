// The app shell: stage + fx + ui + audio wired to the rules. Owns the run/profile
// lifecycle, saving, and the fixed-step battle loop (speed, pause, hitstop, slow motion).
// In pal: the save is the extension's storage (surface/storage.ts; synced, and taken back when
// sync brings a newer one), the volumes are pal's settings, the panel hiding pauses a battle,
// the panel's actions arrive as `pal.onAction`, and a won run posts its ascension to the board.
import type { SurfaceKit } from "@zcag/pal";
import { DT, THEMES, type Act, type Battle, type BattleEvent, type Command, type RunState, type TowerId } from "../game/types.ts";
import { newBattle, step, command as battleCommand, battleResult } from "../game/battle/index.ts";
import { newRun, choose as runChoose, battleFor, finishBattle } from "../game/run/index.ts";
import { newProfile, fullProfile, migrate, applyRun, codexRecord, seenTutorial, withSettings, type Profile, type BattleCodex } from "../game/meta.ts";
import { createStage } from "./render/stage.ts";
import { focus } from "./render/api.ts";
import { createFx } from "./render/fx/index.ts";
import { mountUi, type UiHost, type Nav, type Settings } from "./ui/index.ts";
import { audio } from "./audio/index.ts";
import { storage } from "./storage.ts";
import { KEYS } from "../progress.ts";
import { palVolumes } from "./ui/settings.ts";
import type { Scene } from "./scene.ts";

declare const pal: SurfaceKit;

/** The saved run's shape; a run saved by another shape is dropped rather than misread. */
const RUN_VERSION = 1;
type SavedRun = { v: number; run: RunState };

await storage.load(KEYS);
const scene = storage.get("scene", null) as Scene | null;
const runOf = (v: unknown) => { const r = v as SavedRun | null; return r && r.v === RUN_VERSION && r.run ? r.run : null; };

const canvas = document.getElementById("view") as HTMLCanvasElement;
const stage = createStage(canvas);
const fx = createFx(stage);

let profile: Profile = (() => { try { return migrate(storage.get<unknown>("profile", null)); } catch { return newProfile(); } })();
let run: RunState | null = runOf(storage.get<unknown>("run", null));
let battle: Battle | null = null;
let paused = false;
let speed: 1 | 2 | 3 = 1;
let acc = 0;
let endAt = -1;          // real time (s) when the finished battle hands back to the run
let codex: BattleCodex = {};
let shownAct = 0;       // the act card shows once when an act's map first opens

const saveProfile = () => storage.set("profile", profile);
const keepRun = (r: RunState) => storage.set("run", { v: RUN_VERSION, run: r } satisfies SavedRun);
const saveRun = () => (run ? keepRun(run) : storage.remove("run"));

// ------------------------------------------------------------------ host
const host: UiHost = {
  command(c: Command) {
    if (!battle) return;
    if (c.t === "call" || c.t === "cast" || c.t === "build") audio.unlock();
    battleCommand(battle, c);
  },
  pick: (cx, cy) => stage.pick(cx, cy),
  toScreen: (x, y, z) => stage.toScreen(x, y, z),
  setSpeed(s) { speed = s; fx.speed = s; audio.speed(s); },
  setPaused(p) { paused = p; audio.paused(p); stage.fx.pause = p ? 1 : 0; },
  choose(key) {
    if (!run) return;
    run = runChoose(run, key);
    saveRun();
    showRun();
  },
  nav(n: Nav) { nav(n); },
  profile: () => profile,
  savedRun: () => (run && !run.over ? run : null),
  applySettings(s: Settings) {
    fx.shakeScale = s.shake; stage.shakeScale = s.shake; fx.numbers = s.numbers; speed = s.speed; fx.speed = s.speed;
    profile = withSettings(profile, s as unknown as Record<string, unknown>); saveProfile();
  },
  noteSeen(id) { profile = seenTutorial(profile, id); saveProfile(); },
};

const ui = mountUi(document.getElementById("ui")!, host);
fx.coinTarget = () => ui.goldPoint();
fx.onCoin = (v) => ui.coinLanded(v);
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => audio.unlock(), { once: false, passive: true });

// ------------------------------------------------------------------ navigation
function nav(n: Nav) {
  switch (n.to) {
    case "title": title(); break;
    case "continue": if (run) showRun(); else title(); break;
    case "new": startRun(n.commander, n.ascension); break;
    case "again": if (run) startRun(run.commander, run.ascension); else title(); break;
    case "abandon": abandon(); break;
    case "codex": ui.showScreen({ s: "codex" }); break;
    case "settings": ui.showScreen({ s: "settings" }); break;
  }
}

let onTitle = false;
function title() {
  battle = null; endAt = -1; onTitle = true;
  stage.setMap(null, "meadow");
  audio.scene("title", 1);
  ui.showScreen({ s: "title" });
}

function startRun(commander: RunState["commander"], ascension: number) {
  shownAct = 0; onTitle = false;
  const seed = (Math.random() * 2 ** 32) >>> 0;
  run = newRun({ seed, commander, ascension, profile, firstRun: (profile as unknown as { runs?: number }).runs === 0 || profile.history.length === 0 });
  saveRun();
  showRun();
}

function abandon() {
  if (!run) return title();
  battle = null;
  run = { ...run, over: run.over ?? { won: false, act: run.act, floor: run.floor, by: "abandoned" }, screen: { s: "over" } };
  finishRun();
}

function showRun() {
  if (!run) return title();
  onTitle = false;
  if (run.over || run.screen.s === "over") return finishRun();
  if (run.screen.s === "battle") return startBattle();
  battle = null; endAt = -1;
  const act = run.act as Act;
  stage.setMap(null, THEMES[act]);
  if (run.screen.s === "map" && run.at < 0 && shownAct !== act) {
    shownAct = act;
    ui.showScreen({ s: "act", act });
    audio.scene("map", act);
    setTimeout(() => { if (run && run.act === act && !battle) ui.showScreen({ s: "run", run }); }, 2200);
    return;
  }
  const s = run.screen.s;
  audio.scene(s === "shop" ? "shop" : s === "rest" ? "camp" : "map", act);
  ui.showScreen({ s: "run", run });
}

function startBattle() {
  if (!run) return;
  const args = battleFor(run);
  battle = newBattle(args);
  codex = { met: [], killed: {}, leaked: {}, built: {}, towerKills: {}, specs: [] };
  acc = 0; endAt = -1; paused = false;
  stage.setMap(battle.map, battle.map.theme);
  audio.scene("battle", battle.act);
  ui.showScreen({ s: "battle", battle, run });
}

function finishRun() {
  if (!run) return title();
  const before = profile;
  const result = applyRun(profile, run, Date.now());
  profile = result.profile; saveProfile();
  const done = run;
  storage.remove("run");
  onTitle = false;
  // A won run's ascension on the board (a seeded run is not a free one, so it does not count).
  if (done.over?.won && !done.book?.seeded) pal.score("ascension", done.ascension).catch(() => undefined);
  battle = null;
  audio.scene(done.over?.won ? "victory" : "defeat", done.act as Act);
  stage.setMap(null, THEMES[done.act as Act]);
  ui.showScreen({ s: "summary", run: done, result, before });
}

// ------------------------------------------------------------------ codex facts from events
function noteEvents(b: Battle, evs: readonly BattleEvent[]) {
  const inc = <K extends string>(o: Partial<Record<K, number>>, k: K) => { o[k] = (o[k] ?? 0) + 1; };
  for (const e of evs) {
    if (e.e === "spawn" && !codex.met!.includes(e.kind)) codex.met!.push(e.kind);
    else if (e.e === "kill") {
      inc(codex.killed!, e.kind);
      const t = b.towers.find((x) => x.id === e.by);
      if (t) inc(codex.towerKills!, t.kind);
      if (e.boss && e.kind !== "footman") codex.bossTicks = { boss: e.kind as never, ticks: b.tick };
    } else if (e.e === "leak") {
      inc(codex.leaked!, e.kind);
      // Lives lost stay lost if the page reloads mid-battle (the battle itself restarts from setup).
      if (run && !devMode) keepRun({ ...run, loadout: { ...run.loadout, lives: Math.max(1, e.left) } });
    }
    else if (e.e === "build") inc(codex.built!, e.kind as TowerId);
    else if (e.e === "specialise") {
      const t = b.towers.find((x) => x.id === e.tower);
      if (t?.spec) codex.specs!.push({ tower: t.kind, spec: t.spec });
    }
  }
}

// Dev/QA: ?battle=<act>&kind=battle|elite|boss&seed=&towers=a,b,c&boss=&gold= jumps straight into a battle.
function devBattle(q: URLSearchParams) {
  const act = Math.min(4, Math.max(1, +(q.get("battle") || 1))) as Act;
  const seed = +(q.get("seed") || 7);
  const r = newRun({ seed, commander: (q.get("commander") as RunState["commander"]) || "marshal", ascension: +(q.get("asc") || 0), profile: fullProfile() });
  const loadout = { ...r.loadout };
  if (q.get("towers")) loadout.towers = q.get("towers")!.split(",") as TowerId[];
  if (q.get("relics")) loadout.relics = q.get("relics")!.split(",");
  const kind = (q.get("kind") || "battle") as "battle" | "elite" | "boss";
  const BOSS: Record<number, string> = { 1: "gorrak", 2: "wyrm", 3: "colossus", 4: "tyrant" };
  battle = newBattle({ seed, act, kind, floor: kind === "boss" ? 7 : 3, loadout, boss: kind === "boss" ? ((q.get("boss") || BOSS[act]) as never) : undefined, gold: +(q.get("gold") || 0) || undefined });
  devMode = true;
  codex = { met: [], killed: {}, leaked: {}, built: {}, towerKills: {}, specs: [] };
  stage.setMap(battle.map, battle.map.theme);
  audio.scene("battle", act);
  ui.showScreen({ s: "battle", battle });
}
let devMode = false;

function endBattle() {
  if (devMode) { devMode = false; battle = null; return title(); }
  if (!run || !battle) return;
  const res = battleResult(battle);
  profile = codexRecord(profile, codex); saveProfile();
  run = finishBattle(run, res);
  saveRun();
  battle = null;
  focus.pad = focus.selectedPad = focus.tower = null; focus.ring = focus.aim = focus.rally = null;
  showRun();
}

// ------------------------------------------------------------------ loop
let last = performance.now() / 1000;
let lastIns = "";
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now() / 1000;
  const dt = Math.min(0.1, now - last);
  last = now;
  const b = battle;
  if (b) {
    if (!paused && b.phase !== "setup" && fx.hitstop() <= 0) {
      acc += dt * speed * fx.slowmo;
      let n = 0;
      while (acc >= DT && n < 6 && (b.phase === "running" || b.phase === "won" || b.phase === "lost")) {
        step(b); acc -= DT; n++;
        if (fx.hitstop() > 0) { acc = 0; break; }
      }
      if (n === 6) acc = 0;
    } else if (b.phase === "setup") acc = 0;
    if ((b.phase === "won" || b.phase === "lost") && endAt < 0) endAt = now + (b.phase === "won" ? 2.6 : 3.4);
  }
  const evs = b ? b.events.slice() : [];
  stage.frame(b, b ? Math.min(1, acc / DT) : 0, dt, now);
  if (b && evs.length) {
    noteEvents(b, evs);
    ui.onEvents(evs, b);
    audio.battleEvents(evs, b.map.w);
    b.events.length = 0;
  }
  ui.frame(b, dt);
  const ins = ui.insets(), key = `${ins.top},${ins.right},${ins.bottom},${ins.left}`;
  if (key !== lastIns) { lastIns = key; stage.setInsets(ins); }
  if (b && endAt > 0 && now >= endAt && !paused) { endAt = -1; endBattle(); }
}

function resize() {
  const ins = ui.insets();
  stage.setInsets(ins);
  stage.resize(innerWidth, innerHeight, Math.min(2, devicePixelRatio || 1));
}
addEventListener("resize", resize);
resize();

const s0 = storage.get<Partial<Settings>>("settings", {});
if (s0.shake != null) { fx.shakeScale = s0.shake; stage.shakeScale = s0.shake; }
if (s0.numbers != null) fx.numbers = s0.numbers;
if (s0.speed) { speed = s0.speed; fx.speed = s0.speed; }

const q0 = new URLSearchParams(location.search);
if (scene) {
  const sb = scene.battle;
  devBattle(new URLSearchParams({ battle: String(sb.act), kind: sb.kind ?? "battle", seed: String(sb.seed), towers: [...new Set(sb.towers.map((t) => t[0]))].join(","), ...(sb.boss ? { boss: sb.boss } : {}) }));
  stageScene({ towers: sb.towers, waves: sb.waves, ticks: sb.ticks, lives: sb.lives });
} else if (q0.get("battle")) devBattle(q0); else title();
requestAnimationFrame(frame);
requestAnimationFrame(() => pal.ready());

/** Dev scene for captures: build towers on the best pads (free), start waves, fast-forward. */
function stageScene(o: { towers?: [TowerId, number, string?][]; ticks?: number; waves?: number; gold?: number; lives?: number }) {
  const b = battle; if (!b) return "no battle";
  b.gold = 1e6;
  if (o.lives) b.lives = 1e6;   // a picture of a fight still going (`lives` after it), not of the leaks the fast-forward took
  const pads = [...b.map.pads].sort((a, c) => c.score - a.score);
  (o.towers ?? []).forEach(([kind, level, spec], i) => {
    const pad = pads[i]; if (!pad) return;
    battleCommand(b, { t: "build", pad: pad.id, tower: kind });
    const t = b.towers.find((x) => x.pad === pad.id); if (!t) return;
    for (let l = 1; l < Math.min(level, 3); l++) battleCommand(b, { t: "upgrade", tower: t.id });
    if (level >= 4 && spec) battleCommand(b, { t: "specialise", tower: t.id, spec: spec as never });
  });
  for (let w = 0; w < (o.waves ?? 1); w++) {
    battleCommand(b, { t: "call" });
    for (let i = 0; i < 400 && b.phase === "running" && b.countdown < 0; i++) step(b);
  }
  for (let i = 0; i < (o.ticks ?? 0) && b.phase === "running"; i++) { step(b); if (b.events.length > 400) b.events.splice(0, b.events.length - 200); }
  b.gold = o.gold ?? 640;
  if (o.lives) b.lives = o.lives;
  for (const t of b.towers) t.building = 0;
  b.events.length = 0;   // the fast-forward's events are history; the live loop shows what happens next
  return { enemies: b.enemies.length, towers: b.towers.length, wave: b.next, phase: b.phase };
}

// ------------------------------------------------------------------ pal
// The panel's actions (index.ts ACTIONS) are the game's own keys, pressed for the player.
const press = (key: string) => dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
pal.onAction((id) => {
  if (id === "pause") press("p");
  else if (id === "mute") press("m");
  else if (id === "speed") press("f");
  else if (id === "quit" && run && !run.over) { if (ui.paused) ui.pause(false); host.nav({ to: "abandon" }); }
});
// Hiding the panel (Escape leaves the level) pauses a battle and stops the sound until it is back.
pal.onHidden(() => { if (battle && !ui.paused && battle.phase !== "won" && battle.phase !== "lost") ui.pause(true); audio.hold(true); });
pal.onShown(() => { audio.hold(false); last = performance.now() / 1000; });
const volumes = (p: Record<string, unknown>) => palVolumes(ui.settings, p ?? {});
volumes(await pal.settings().catch(() => ({})));
pal.onSettings(volumes);
// Another machine's progress, merged by sync: the profile is taken at once (a run that ends here adds
// to it); a run only while nothing is being played, so a battle in progress is never swapped out.
storage.onChange((k, v) => {
  if (k === "profile") { try { profile = migrate(v); } catch { return; } if (onTitle && ui.kind === "title") ui.showScreen({ s: "title" }); }
  else if (k === "run" && onTitle && !battle) { run = runOf(v); if (ui.kind === "title") ui.showScreen({ s: "title" }); }
});

// Test hooks for the headless checks (scripts, fixture.ts): read-only state and a few drivers.
(window as unknown as Record<string, unknown>).__game = {
  get run() { return run; }, get battle() { return battle; }, get profile() { return profile; }, stage, ui, host,
  setProfile(p: Profile) { profile = p; saveProfile(); },
  step(n: number) { if (battle) for (let i = 0; i < n && (battle.phase === "running"); i++) step(battle); },
  endNow() { endBattle(); },
  scene: stageScene,
};
