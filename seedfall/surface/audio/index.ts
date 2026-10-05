// Seedfall's audio: everything synthesised at runtime with WebAudio (design/audio.md).
//
// Wiring (surface/main.ts imports Audio from here and the content from game/content/world.ts):
//
//   const audio = new Audio({ materials: MATERIALS, finds: FINDS });
//   addEventListener("keydown", () => audio.resume());           // and pointerdown: the context needs a gesture
//   // each frame, after game.step:
//   audio.events(evs, game);                                     // every event the rules emitted this frame
//   audio.update(dt, game, { onSurface, inMenu, tension: 0, biome, planet, launching, drop });
//   // UI:
//   audio.ui("hover"); audio.ui("click"); audio.ui("open"); audio.ui("close");
//   audio.ui("saleChord");                                       // Enter skips the count-up: straight to the chord
//   audio.settings.music = 40; audio.applySettings();            // sliders 0-100, muted; save `audio.settings`
//   audio.toggleMute();                                          // the M key
//
// Public API:
//   new Audio(content?)            content: { materials, finds } from content/world.ts (also `setContent`); without it
//                                  every material drills as "grit" and every find chimes as a tier 1 ore.
//   resume()                       call from a user gesture; creates the context on the first call; safe to repeat.
//   events(evs, view)              every GameEvent of the frame.
//   update(dt, view, ctx)          once per rendered frame: continuous sounds, ambience, music state.
//   ui(kind, opts?)                UI sounds: hover click buy deny tierUp research achievement toast saleTick saleChord
//                                  open close stinger collect. opts.value: saleTick progress 0..1, saleChord total,
//                                  stinger biome; opts.tier: a chime tier; opts.tone: toast tone.
//   settings / applySettings()     { master, music, effects, muted }, sliders 0-100 (defaults 80/60/80).
//   toggleMute()                   the M key.
//   debug()                        the F10 overlay's numbers: voices per group, sources, limiter reduction, τ, song,
//                                  phrase, room.
//   attach(ctx, out?)              build on a given context (the offline checks use an OfflineAudioContext).
//
// AudioContextInfo extends the brief with `drop` (Down held in an open column: the auto-braked drop gets a soft
// rush instead of the fall whistle) and `dayPhase` is read from the view. `tension` is combined with the pod's own
// τ (design 8.5) by taking the larger, so passing 0 is fine.
import type { GameEvent, GameView } from "../../game/types.ts";
import { Graph } from "./graph.ts";
import { Lookup, type AudioContent } from "./content.ts";
import { Drill } from "./drill.ts";
import { PodSounds } from "./pod.ts";
import { WorldSounds } from "./world.ts";
import { Town } from "./town.ts";
import { Finds } from "./finds.ts";
import { Music } from "./music.ts";
import { dispatch, Guard, type Parts } from "./events.ts";
import { tensionOf, underHome } from "./plan.ts";
import { SONGS, songFor } from "./score.ts";
import { CAPS, type Group } from "./kit.ts";

export type AudioContextInfo = {
  onSurface: boolean;
  inMenu: boolean;
  /** 0..1; combined with the pod's own tension by max. */
  tension: number;
  biome: number;
  planet: string;
  launching?: boolean;
  /** Down held in an open column (the auto-braked drop): a soft rush instead of the fall whistle. */
  drop?: boolean;
};
export type UiSound = "hover" | "click" | "buy" | "deny" | "tierUp" | "research" | "achievement" | "toast" | "saleTick" | "saleChord" | "open" | "close" | "stinger" | "collect";
export type { AudioContent };

export class Audio {
  settings = { master: 80, music: 60, effects: 80, muted: false };
  private look = new Lookup();
  private p: Parts | null = null;
  private ctx: BaseAudioContext | null = null;
  private guard = new Guard();
  private timer: ReturnType<typeof setInterval> | null = null;
  private planet = "vell";
  private paused = false;
  private onVis = () => this.visibility();

  constructor(content?: AudioContent) { this.look.set(content); }

  setContent(c: AudioContent) { this.look.set(c); }

  /** Call from a user gesture (first key/click); safe to call repeatedly. */
  resume() {
    if (typeof AudioContext === "undefined") return;
    if (!this.ctx) {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      this.attach(ctx);
      // The sequencer also runs on a 25 ms timer, so the music keeps going when frames stall.
      this.timer = setInterval(() => this.p?.music.pump(), 25);
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.onVis);
    }
    const ctx = this.ctx as AudioContext;
    if (ctx.state === "suspended" && !this.away && (typeof document === "undefined" || !document.hidden)) void ctx.resume();
  }

  /** Build the whole graph on a context (an OfflineAudioContext for the checks). */
  attach(ctx: BaseAudioContext, out: AudioNode = ctx.destination, seed?: number) {
    this.ctx = ctx;
    const g = new Graph(ctx, out);
    g.settings = this.settings;
    const music = new Music(g, seed);
    const finds = new Finds(g, music);
    this.p = {
      g, look: this.look, music, finds,
      drill: new Drill(g.kit, g.bus.fx, this.look),
      pod: new PodSounds(g, this.look),
      world: new WorldSounds(g, this.look),
      town: new Town(g, music, this.look),
    };
    this.setSong(SONGS.topsoil);
    this.applySettings();
    return this.p;
  }

  /** Feed every event the rules emitted this frame. */
  events(evs: readonly GameEvent[], view: GameView) {
    if (!this.p || !evs.length) return;
    dispatch(this.p, evs, view, this.guard, this.planet);
  }

  /** Once per rendered frame: continuous sounds (engine, drill loop, ambience, music state). */
  update(dt: number, view: GameView, info: AudioContextInfo) {
    const p = this.p;
    if (!p) return;
    void dt;
    this.planet = info.planet;
    const pod = view.pod, onSurface = info.onSurface;
    const song = onSurface ? SONGS.town : songFor(info.biome, info.planet);
    this.setSong(song);
    if (info.inMenu !== this.paused) { this.paused = info.inMenu; p.g.pause(info.inMenu); }
    p.g.update(pod.y, onSurface, info.inMenu);
    const tau = Math.max(info.tension || 0, tensionOf(pod));
    p.music.update(
      { menu: info.inMenu, town: onSurface, night: view.dayPhase >= 0.8 || view.dayPhase < 0.2, biome: info.biome, planet: info.planet, launching: !!info.launching },
      tau, underHome(pod), view.dayPhase,
    );
    p.drill.update(pod.dig);
    p.pod.update(view, !!info.drop);
    p.world.update(view, onSurface || !!info.launching, info.biome, info.planet);
    p.town.update(onSurface, view.dayPhase, pod.x);
    p.finds.update();
  }

  private setSong(s: typeof SONGS.topsoil) {
    const p = this.p!;
    p.drill.song = p.finds.song = p.pod.song = p.world.song = s;
  }

  ui(kind: UiSound, opts: { value?: number; tier?: number; tone?: string; best?: boolean } = {}) {
    const p = this.p;
    if (!p) return;
    const t = p.town;
    switch (kind) {
      case "hover": t.hover(); break;
      case "click": t.click(); break;
      case "buy": t.buy(); break;
      case "deny": t.deny(); break;
      case "tierUp": if (this.guard.ok("tierUp", p.g.now, 1.5)) t.tierUp(); break;
      case "research": t.research(); break;
      case "achievement": if (this.guard.ok("ach", p.g.now, 3)) t.achievement(); break;
      case "toast": t.toast(opts.tone ?? "good"); break;
      case "saleTick": t.tick(opts.value ?? t.progress); break;
      case "saleChord": if (t.saleRunning) t.skip(); else t.chord(opts.value, opts.best); break;
      case "open": t.panel(true); break;
      case "close": t.panel(false); break;
      case "stinger": { const b = opts.value ?? 0; if (this.guard.ok(`stinger${b}`, p.g.now)) p.music.stinger(songFor(b, this.planet), p.g.bus.ui); break; }
      case "collect": t.collect(); break;
    }
    void opts.tier;
  }

  applySettings() {
    if (!this.p) return;
    this.p.g.settings = this.settings;
    this.p.g.applySettings();
  }

  toggleMute() { this.settings.muted = !this.settings.muted; this.applySettings(); }

  /** "Quiet when the window is in the background": ramp out over 200 ms then suspend; back over 300 ms. pal's panel
   * hiding says so too (`background(true)`), since a hidden panel does not hide the document. */
  private away = false;
  private visibility() { if (typeof document !== "undefined") this.background(document.hidden); }
  background(hidden: boolean) {
    const ctx = this.ctx as AudioContext | null, p = this.p;
    this.away = hidden;
    if (!ctx || !p) return;
    if (hidden) {
      p.g.visible = false;
      p.g.setMaster(0.2 / 3);
      setTimeout(() => { if (this.away) void ctx.suspend(); }, 220);
    } else {
      void ctx.resume().then(() => { p.g.visible = true; p.g.setMaster(0.3 / 3); });
    }
  }

  /** The audio debug overlay's numbers (section 10). */
  debug() {
    const p = this.p;
    if (!p) return null;
    const k = p.g.kit, now = k.now, voices: Partial<Record<Group, number>> = {};
    for (const gk of Object.keys(CAPS) as Group[]) voices[gk] = k.live[gk].filter((s) => s.end > now && s.at <= now).length;
    return { voices, sources: k.sources, peakSources: k.peakSources, stolen: { ...k.stolen }, limiter: p.g.reduction, room: p.g.roomKind, music: p.music.info(), streak: p.finds.streak };
  }

  /** The parts, for the offline checks. */
  get parts() { return this.p; }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVis);
    void (this.ctx as AudioContext | null)?.close?.();
    this.ctx = null; this.p = null;
  }
}
