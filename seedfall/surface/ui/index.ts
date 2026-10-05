// Seedfall's UI: HTML over the canvas (design/art.md section 9).
//
// Wiring (surface/main.ts imports Ui from here and gameModel from ui/model.ts):
//
//   const ui = new Ui(document.getElementById("ui")!, gameModel(game));
//   ui.onSound((kind, opts) => audio.ui(kind, opts));     // names match Audio's UiSound
//   keys.listen((e) => ui.handleKey(e));                 // UI keys first; true swallows
//   // each frame:
//   keys.enabled = !ui.isOpen();                         // panels pause game input
//   ui.events(evs, game);                                // after game.step, with the frame's events
//   ui.update(dt, game, camera, fx.labels);              // last, after the renderer
//   postFx.dim = ui.dim;                                 // the world dims 40% under a panel (set ui.cssDim = false then)
//   // a building door: E -> ui.open("workshop" | "supply" | "lab" | "rigs" | "launch" | "market" | "fuel")
//
import { W, type GameEvent, type GameView } from "../../game/types.ts";
import { worldToScreen, type Camera } from "../view.ts";
import { biomeDef, findById, isUnbreakable, tileHardness } from "../../game/content/world.ts";
import { h, toggle, cash, metres } from "./dom.ts";
import { icon } from "./icons.ts";
import { Hud } from "./hud.ts";
import { Toasts, Labels, TitleCard, Lines, Prompt, LaunchOverlay, type FloatLabel, type Tone } from "./feed.ts";
import { Depot } from "./depot.ts";
import { Panels, type ScreenId, type Sound } from "./panel.ts";
import { SCREENS } from "./screens/index.ts";
import { Intro, Hints } from "./onboarding.ts";
import type { UiModel } from "./model.ts";

export type { ScreenId } from "./panel.ts";
export type { FloatLabel } from "./feed.ts";
export type { UiModel } from "./model.ts";

/** UI sound names, the same as Audio.ui's. */
export type UiSound = "hover" | "click" | "deny" | "open" | "close" | "saleChord" | "collect" | "toast" | "research" | "buy" | "achievement" | "tierUp" | "saleTick";

const DIRS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"]);

export class Ui {
  readonly el: HTMLElement;
  private hud: Hud;
  private toasts = new Toasts();
  private labels = new Labels();
  private title = new TitleCard();
  private lines = new Lines();
  private prompt = new Prompt();
  private launch = new LaunchOverlay();
  private depot: Depot;
  private intro = new Intro();
  private hints: Hints;
  private panels: Panels;
  private scrim = h("div.dimmer");
  private soundFn: (kind: UiSound, opts?: { value?: number; tone?: string; best?: boolean }) => void = () => {};
  private warned = new Set<string>();
  private lastRecord = -99;
  private time = 0;
  private hudRect: DOMRect | null = null;
  private hudRectT = 0;
  /** 0..1, eased: how much the world should dim (PostFx.dim). */
  dim = 0;
  /** Darken the world with a CSS layer too (turn off once PostFx.dim is wired). */
  cssDim = true;

  constructor(root: HTMLElement, public m: UiModel, opts: { intro?: boolean } = {}) {
    this.el = h("div.ui");
    root.append(this.el);
    const sound: Sound = (k, o) => this.soundFn(k as UiSound, o);
    this.hud = new Hud(m);
    this.depot = new Depot(m, this.hud, sound);
    this.panels = new Panels(m, SCREENS, sound, () => this.depot.refresh());
    this.hints = new Hints(m);
    this.el.append(this.labels.el, this.hud.el, this.lines.el, this.title.el, this.prompt.el, this.hints.arrow, this.hints.el, this.depot.el, this.toasts.el, this.scrim, this.panels.el, this.launch.el, this.intro.el);
    this.intro.el.onmousedown = () => this.skipIntro();
    const off = m.takeOffline();
    if (off) this.openOffline(off); // the offline card comes first; the title card would only be in its way
    else if (opts.intro !== false && m.inTown) this.intro.show();
  }

  /** Close the title card (any key or click does it; captures call it to stage a scene). */
  skipIntro() { if (this.intro.dismiss()) { this.soundFn("click"); this.afterIntro(); } }
  private afterIntro() {}

  onSound(fn: (kind: UiSound, opts?: { value?: number; tone?: string; best?: boolean }) => void) { this.soundFn = fn; }

  /** True while a panel holds the keyboard: game input is paused. */
  isOpen() { return this.panels.open || this.launch.active || this.intro.shown; }

  open(screen: ScreenId, tab = 0) {
    if (this.intro.shown) this.intro.dismiss();
    if (screen !== "offline" && screen !== "pause" && this.depot.shown && screen !== "cargo") this.depot.close();
    this.panels.show(screen, tab);
  }
  close() { this.panels.close(true); }
  get screen(): ScreenId | null { return this.panels.id; }

  toast(text: string, tone: Tone = "good", ic?: string) { this.toasts.push(text, tone, ic); if (tone !== "quiet") this.soundFn("toast", { tone }); }
  say(text: string, who?: string) { this.lines.say(text, who); }

  /** The offline card, when the rules have one waiting (after a load, or the panel shown again). */
  offline() { const off = this.m.takeOffline(); if (off && !this.panels.open && !this.launch.active) { if (this.intro.shown) this.intro.dismiss(); this.openOffline(off); } }

  private openOffline(off: NonNullable<ReturnType<UiModel["takeOffline"]>>) {
    (SCREENS.offline as unknown as { data: unknown }).data = off;
    this.panels.show("offline");
  }

  handleKey(e: KeyboardEvent): boolean {
    // A key that closes the title card does nothing else, except a direction key, which also drives.
    if (this.intro.shown) { this.skipIntro(); if (!DIRS.has(e.code) || e.code === "Space") return true; }
    if (this.launch.active) return true;
    if (this.panels.open) {
      if (e.code === "Tab" && this.panels.id === "cargo") { this.panels.close(); return true; }
      if (e.code === "KeyP" && this.panels.id === "pause") { this.panels.close(); return true; }
      if (e.code === "KeyU" && !this.panels.locked && this.panels.id !== "workshop" && this.m.inTown && this.panels.id !== "offline") { this.open("workshop"); return true; }
      return this.panels.key(e);
    }
    if (e.repeat && !DIRS.has(e.code)) return false;
    const town = this.m.inTown;
    if (this.depot.shown) {
      if (e.code === "Enter" && this.depot.skip()) return true;
      if (DIRS.has(e.code)) { this.depot.close(); return false; }
    }
    switch (e.code) {
      case "KeyB":
        if (!town) return false;
        { const r = this.m.buySuggested(); if (!r.ok) { this.soundFn("deny"); if (r.why) this.toast(r.why, "quiet"); } this.depot.refresh(); }
        return true;
      case "KeyU": if (!town) return false; this.open("workshop"); return true;
      case "Tab": this.open("cargo"); return true;
      case "KeyM": this.hud.mapOn = !(this.hud.mapOn ?? innerHeight >= 700); this.soundFn("click"); return true;
      case "Backspace":
        if (this.depot.shown) { this.depot.close(); return true; }
        return false;
      case "KeyP": this.open("pause"); return true;
      case "KeyL": this.open("log"); return true;
    }
    return false;
  }

  events(evs: readonly GameEvent[], view: GameView) {
    const m = this.m;
    this.hints.events(evs);
    for (const e of evs) {
      switch (e.t) {
        case "dock": this.depot.open(e.sale); break;
        case "dive": this.depot.close(); this.warned.clear(); break;
        case "biome": {
          const name = m.biomes[e.biome] ?? "";
          if (e.first) {
            this.title.show(name, metres(view.pod.y));
            const line = biomeDef(view.world.planet, e.biome)?.line;
            if (line) { const mm = /^(\w+): "(.*)"$/.exec(line); if (mm) this.lines.say(mm[2], mm[1], 4); else this.lines.say(line, undefined, 4); }
          } else this.toasts.push(name, "quiet", undefined, `biome${e.biome}`);
          break;
        }
        case "find": {
          const f = findById(e.find);
          if (!f || !e.first) break;
          if (f.kind === "ore") { this.toasts.pushFind(e.find, `New ore: ${f.name}`); this.depot.noteNew(e.find, 5 * f.tier); }
          else if (f.kind === "jackpot") this.toasts.pushFind(e.find, `${f.name}. A rare find.`);
          else this.toasts.pushFind(e.find, `${f.name}. Sefa will want to see it.`);
          break;
        }
        case "achievement": {
          const a = m.achievements.find((x) => x.id === e.id);
          this.toasts.push(`Achievement · ${a?.name ?? e.id}`, "good", "medal");
          break;
        }
        // the tow offer has its own prompt; the toast would only repeat it
        case "toast": if (!/^(Sealed in|Out of fuel)\b.*tow/i.test(e.text)) this.toasts.push(e.text, e.tone ?? "good"); break;
        case "record":
          if (this.time - this.lastRecord > 20) { this.lastRecord = this.time; this.toasts.push(`Deepest yet · ${metres(e.row)}`, "quiet", "depth", "record"); }
          break;
        case "buy":
          if (e.tierUp) { const u = m.upgrades.find((x) => x.stat === e.id); this.toasts.push(u?.tier ?? `${e.id} ${e.level}`, "good", e.id); }
          this.depot.refresh();
          if (this.panels.open) this.panels.render();
          break;
        case "order": if (e.done) this.toasts.push("Order filled", "good", "order", `order${e.id}`); break;
        case "surface": this.toasts.clear(["warn", "bad"]); this.warned.clear(); break;
        case "warn":
          if (e.level >= 2 && !this.warned.has(e.what) && !m.seed && !m.inTown && Number.isFinite(view.pod.fuelHome)) {
            this.warned.add(e.what);
            const text = { fuel: "Fuel low", hull: "Hull low", heat: "Running hot", home: "Turn back now" }[e.what];
            this.toasts.push(text, e.level >= 3 ? "bad" : "warn", e.what === "home" ? "fuel" : e.what);
          }
          if (e.level === 0) this.warned.delete(e.what);
          break;
        case "wreck": this.toasts.push("Wrecked. The cargo is in a crate.", "bad", "cargo"); break;
        case "rescue": this.toasts.clear(["warn", "bad"]); this.warned.clear(); this.toasts.push(e.kind === "tow" ? `Towed home · fee ${cash(e.fee)}` : `Pod rebuilt · fee ${cash(e.fee)}`, "quiet"); break;
        case "item": this.hud.pulseSlot(e.item, e.ok); if (!e.ok && e.why) this.toasts.push(e.why, "quiet", undefined, `item${e.why}`); break;
        case "cargo_full": this.hud.flashCargo(); break;
        case "launch": this.launchPhase(e.phase, view); break;
        default: break;
      }
    }
  }

  private launchPhase(phase: string, _view: GameView) {
    const L = this.launch;
    if (!L.active) { this.panels.close(true); this.depot.close(); L.start(); }
    L.phase = phase;
    // The rules' phases, in order: wake, rise, break, sky, shards, wash, choose, done.
    const texts: Record<string, [string, string]> = {
      wake: ["The Seed wakes", ""],
      break: ["Gantry", "The town stands outside."],
      sky: ["", "Ida: \"Wren would have liked to see that.\""],
      shards: ["Core shards", ""],
      wash: ["", ""],
    };
    const t = texts[phase];
    if (t) L.set(t[0], t[1]);
    if (phase === "shards") L.count(this.m.launch.shards);
    if (phase === "choose") { L.end(); this.holdChoice(); }
    if (phase === "done") { L.end(); this.panels.locked = null; this.panels.close(true); }
  }

  /** After a launch the rules wait on a planet: keep the choice open and impossible to dismiss until one is picked. */
  private holdChoice() {
    this.panels.locked = null;
    if (this.panels.id !== "launch") { if (this.panels.open) this.panels.close(true); this.panels.show("launch", 2); }
    else this.panels.show("launch", 2);
    this.panels.locked = "Choose a world to follow the Seed.";
  }

  update(dt: number, view: GameView, cam: Camera, labels: readonly FloatLabel[]) {
    this.time += dt;
    if (this.m.launch.choosing && !this.launch.active && (!this.panels.locked || this.panels.id !== "launch")) this.holdChoice();
    if (!this.m.launch.choosing && this.panels.locked) this.panels.locked = null;
    const big = innerHeight >= 700;
    const m = this.m;
    toggle(this.hud.el, "town", m.inTown);
    toggle(this.el, "depot-on", this.depot.shown);
    toggle(this.el, "modal", this.panels.open);
    toggle(this.el, "intro-on", this.intro.shown);
    toggle(this.hud.el, "hide", this.launch.active);
    this.hud.update(dt, view, big);
    this.depot.update(dt);
    this.toasts.update(dt);
    this.labels.update(labels, cam);
    this.title.update(dt);
    this.lines.update(dt);
    this.panels.update(dt);
    this.launch.update(dt);
    if (this.launch.active && this.launch.phase === "rise") {
      const row = Math.max(0, cam.y);
      const b = [0, 60, 160, 280, 400, 540, 680].filter((r) => row >= r).length - 1;
      if (this.launch.phase === "rise") this.launch.set(m.biomes[b] ?? "", metres(row));
    }
    if (this.intro.shown && view.pod.y > 0.5) this.intro.dismiss();
    // Fade the top-left cluster while the pod (or the tiles just around it) is under it.
    if ((this.hudRectT -= dt) <= 0) { this.hudRectT = 0.5; this.hudRect = this.hud.el.querySelector(".tl")!.getBoundingClientRect(); }
    const ps = worldToScreen(cam, view.pod.x, view.pod.y), r = this.hudRect, pad = cam.tilePx * 1.5;
    toggle(this.el, "hud-behind", !!r && !this.panels.open && ps.x > r.left - pad && ps.x < r.right + pad && ps.y > r.top - pad && ps.y < r.bottom + pad);
    const pr = this.promptFor(view);
    this.prompt.set(pr);
    toggle(this.el, "prompting", !!pr);
    this.hints.update(dt, view, !!pr || this.panels.open || this.launch.active || this.intro.shown, cam, this.depot.shown ? this.depot.el.firstElementChild!.getBoundingClientRect() : null);
    const target = this.panels.open ? 1 : 0;
    this.dim += (target - this.dim) * Math.min(1, dt * 12);
    this.scrim.style.opacity = this.cssDim ? (this.dim * 0.4).toFixed(3) : "0";
  }

  /** The keys of the neighbouring tiles (left, right, down) the current drill could dig, or "". */
  private canDigOut(view: GameView): string {
    const p = view.pod, w = view.world, P = 1.25 ** view.levels.drill;
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    const keys: string[] = [];
    for (const [dx, dy, k] of [[-1, 0, "←"], [1, 0, "→"], [0, 1, "↓"]] as const) {
      const x = tx + dx, y = ty + dy;
      if (x < 1 || x >= W - 1 || y < 0) continue;
      const i = y * W + x, mat = w.mat[i];
      if (!mat || isUnbreakable(mat)) continue;
      if (tileHardness(mat, w.find[i]) / P <= 2.5) keys.push(k);
    }
    return keys.join(" ");
  }

  private promptFor(view: GameView): { text: string; sub?: string; tone?: Tone; channel?: number } | null {
    const p = view.pod, m = this.m;
    if (this.panels.open || this.launch.active) return null;
    const seed = m.seed;
    if (seed && !p.dead) {
      if (seed.ok) return { text: "The Seed is ready", sub: "<kbd>E</kbd> Wake the Seed", tone: "good" };
      const why = seed.why === "Dock against the Seed." ? "Stand on the Seed to wake it." : seed.why;
      if (why) return { text: "The Seed", sub: why, tone: "quiet" };
    }
    if (p.dead) return { text: "Wrecked", sub: "The pod is rebuilt at the depot. The cargo waits in a crate.", tone: "bad" };
    if (p.channel > 0) return { text: "Teleporting", sub: "A hit cancels it.", channel: p.channel };
    const under = p.y > 0.5;
    if (under && p.fuel <= 0) {
      const cells = m.items.find((i) => i.key === "fuel")?.count ?? 0;
      if (cells > 0) return { text: "Out of fuel", sub: `<kbd>1</kbd> Use a fuel cell · ${cells} left`, tone: "warn" };
      return { text: "Out of fuel. Call a tow?", sub: `<kbd>Enter</kbd> Tow the pod home · fee ${cash(m.towFee)} · the cargo stays as a crate`, tone: "bad" };
    }
    if (under && (p.stranded || !Number.isFinite(p.fuelHome))) {
      const it = (k: string) => (m.items.find((i) => i.key === k)?.count ?? 0) > 0;
      const ways = [it("dynamite") ? "<kbd>3</kbd> Dynamite" : "", it("charge") ? "<kbd>4</kbd> Big charge" : "", it("teleport") ? "<kbd>5</kbd> Teleport home" : ""].filter(Boolean);
      const fee = m.towFee > 0 ? ` · fee ${cash(m.towFee)}` : "";
      // a neighbouring tile the drill can take means the pod is boxed in, not stuck: say so first
      const dig = this.canDigOut(view);
      if (dig) ways.unshift(`<kbd>${dig}</kbd> Dig out`);
      const tow = p.stranded ? (dig ? `<kbd>Enter</kbd> Tow home${fee}` : `<kbd>Enter</kbd> Tow the pod home${fee} · the cargo stays`) : "";
      return { text: dig ? "Boxed in" : "Sealed in", sub: [...ways, tow].filter(Boolean).join(" · ") || "No way up. A tow is offered in a moment.", tone: "warn" };
    }
    return null;
  }
}

export { icon };
