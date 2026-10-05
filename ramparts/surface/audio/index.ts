// Ramparts' sound, one object: `audio`. Call `audio.unlock()` on the first user
// gesture (browsers keep audio silent until then); everything before it is
// remembered (scene, volumes, intensity) and starts on unlock.
//
// Effects are rate limited three ways so a heavy wave never turns to noise: a
// per-effect cooldown (a repeat inside it is dropped), a gain that falls as the
// same effect repeats within 250 ms and as battle voices pile up, and a pool
// of at most 24 voices that steals the least important, oldest one.
import type { BattleEvent, SpecId, TowerId } from "../../game/types.ts";
import { Engine } from "./engine.ts";
import { Music, type Sting } from "./music.ts";
import { type Sfx, META, LEVEL, RECIPES, V } from "./sfx.ts";
import { type Scene, songFor } from "./songs.ts";

export type { Scene } from "./songs.ts";
export type { Sfx } from "./sfx.ts";
export type { Sting } from "./music.ts";

export const VOICES = 24;
type Act = 1 | 2 | 3 | 4;
type Opts = { pan?: number; vol?: number; pitch?: number; x?: number };
/** Internal extras: a delay (s), and repeats inside one voice (a volley). */
type Play = Opts & { delay?: number; n?: number };

const JITTER = { ui: 0.02, build: 0.03, battle: 0.06, big: 0.03, sting: 0 } as const;
/** Shatter chains climb a pentatonic scale. */
const CHAIN = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

export class Audio {
  private e: Engine | null = null;
  private m: Music | null = null;
  private ctx: AudioContext | null = null;
  private vols = { master: 1, music: 1, sfx: 1 };
  private muted = false;
  private want: { s: Scene; act: Act } | null = null;
  private inten = 0;
  private isPaused = false;
  private held = false;
  private spd: 1 | 2 | 3 = 1;
  private last = new Map<string, number>();
  private recent = new Map<Sfx, number[]>();
  private towers = new Map<number, { kind: TowerId; spec: SpecId | null }>();

  /** Creates or resumes the AudioContext; call on the first click or key press (and harmlessly on any later one). */
  unlock() {
    if (!this.ctx) {
      try {
        const ctx = new AudioContext({ latencyHint: "interactive" });
        this.ctx = ctx;
        this.attach(ctx);
        setInterval(() => this.m?.tick(), 40);
        document.addEventListener("visibilitychange", () => {
          if (!this.ctx) return;
          if (document.hidden) void this.ctx.suspend();
          else if (!this.held) void this.ctx.resume();
        });
      } catch { return; }
    }
    if (this.ctx.state !== "running" && !document.hidden && !this.held) this.ctx.resume().catch(() => {});
  }

  /** pal hid the panel (true) or showed it again (false): the sound stops while it is away. */
  hold(on: boolean) {
    this.held = on;
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else if (!document.hidden) this.ctx.resume().catch(() => {});
  }

  /** 0..1 each; the curve is perceptual (squared). */
  setMaster(v: number) { this.vols.master = clamp(v); this.applyVol(); }
  setMusic(v: number) { this.vols.music = clamp(v); this.applyVol(); }
  setSfx(v: number) { this.vols.sfx = clamp(v); this.applyVol(); }
  setMuted(m: boolean) { this.muted = m; this.applyVol(); }

  /** Changes the music; the new piece comes in on a bar line. Battle music turns to the boss's by itself on `boss_spawn`. */
  scene(s: Scene, act: Act) {
    const fight = (x: Scene | undefined) => x === "battle" || x === "boss";
    const was = this.want?.s;
    this.want = { s, act };
    if (fight(s) && !fight(was)) {
      // A fresh battle: forget the last one's towers, start calm.
      this.towers.clear();
      this.intensity(0);
      if (this.m) this.m.level = 0;
    }
    if (this.m && (!fight(s) || !fight(was))) this.m.heart = false;
    this.m?.play(songFor(s, act));
  }

  /** Wave pressure 0..1; smoothed inside (about 2 s), layers change on bar lines. */
  intensity(x: number) {
    this.inten = clamp(x);
    if (this.m) this.m.target = this.inten;
  }
  /** Muffles the music (effects stay clear, for the pause menu's own sounds). */
  paused(p: boolean) {
    if (p === this.isPaused) return;
    this.isPaused = p;
    this.m?.pause(p);
  }
  /** Game speed: the music keeps its tempo; at 2x/3x a few ghost hats are added. */
  speed(m: 1 | 2 | 3) { this.spd = m; if (this.m) this.m.speed = m; }

  sfx(name: Sfx, o: Opts = {}) { this.play(name, o); }

  stinger(name: Sting) {
    const m = this.m;
    if (!m || !this.live()) return;
    if (!this.cool(`sting:${name}`, 300, m.e.now())) return;
    m.stinger(name);
  }

  /** Turns a step's sim events into sound; `mapW` (u) maps x to stereo pan. */
  battleEvents(evs: BattleEvent[], mapW: number) {
    const X = (x: number) => (mapW > 0 ? Math.max(0, Math.min(1, x / mapW)) : 0.5);
    for (const ev of evs) {
      const x = X(ev.x);
      switch (ev.e) {
        case "pressure": this.intensity(ev.value); break;
        case "wave_start": this.play(ev.early ? "call_early" : "wave_horn", {}); break;
        case "build": case "upgrade": case "specialise":
          this.towers.set(ev.tower, { kind: ev.kind, spec: this.towers.get(ev.tower)?.spec ?? null });
          this.play(ev.e, { x });
          break;
        case "sell": this.towers.delete(ev.tower); this.play("sell", { x }); break;
        case "shoot": this.towers.set(ev.tower, { kind: ev.kind, spec: ev.spec }); this.shoot(ev.kind, ev.spec, x); break;
        case "hit": {
          if (ev.crit) this.play(ev.mult >= 3 ? "deadeye" : "crit", { x });
          const k = this.towers.get(ev.tower)?.kind;
          if (k === "bombard") this.play("shell_boom", { x, vol: ev.big ? 1 : 0.8 });
          else if (k === "alchemist") this.play("splash", { x, vol: 0.8 });
          break;
        }
        case "kill":
          if (ev.boss) { this.play("kill_big", { x, vol: 1.3, pitch: 0.7 }); this.play("explode", { x }); }
          else if (ev.elite || ev.threat >= 3) this.play("kill_big", { x, pitch: ev.elite ? 0.85 : 1 });
          else this.play("kill_small", { x });
          if (ev.bounty > 0) this.play("coin", { x, vol: 0.6 });
          break;
        case "split": this.play("split", { x }); break;
        case "leak": this.play("leak", { x, vol: ev.lives >= 2 ? 1.2 : 1 }); break;
        case "lives_low": this.play("lives_low", {}); if (this.m) this.m.heart = true; break;
        case "freeze": this.play("freeze", { x }); break;
        case "thaw": this.play("thaw", { x, vol: 0.7 }); break;
        case "numb": this.play("frost", { x, vol: 0.5, pitch: 0.8 }); break;
        case "shatter": {
          const c = Math.max(0, Math.min(CHAIN.length - 1, ev.chain));
          this.play("shatter", { x, pitch: Math.pow(2, CHAIN[c] / 12), vol: 1 + 0.06 * c });
          break;
        }
        case "ignite": this.play("ignite", ev.puddle ? { x, vol: 1.15, pitch: 0.85 } : { x }); break;
        case "explode": {
          const s = ev.source.toLowerCase();
          if (/shell|bomb|mortar/.test(s)) this.play("shell_boom", { x });
          else this.play("explode", { x, vol: s.includes("meteor") ? 1.25 : s.includes("sapper") ? 0.7 : 1 });
          break;
        }
        case "shield_up": this.play("shield_up", { x }); break;
        case "shield_break": this.play("shield_break", { x, vol: ev.lightning ? 1.25 : 1 }); break;
        case "hex": this.play("hex", { x, vol: 0.6 }); break;
        case "mark": case "stun": case "root": case "pull": case "grounded": case "reveal": this.play(ev.e, { x }); break;
        case "chain": {
          const hops = Math.min(ev.ids.length, 5);
          for (let i = 0; i < hops; i++) this.play("chain", { x: X(ev.pts[i]?.x ?? ev.x), pitch: 1 + 0.07 * i, delay: 0.03 * i });
          break;
        }
        case "cone": this.play("flame", { x }); break;
        case "nova": this.play("nova", { x }); break;
        case "aura_pulse": this.play("aura", { x }); break;
        case "block": this.play("block", { x }); break;
        case "soldier_down": this.play("soldier_down", { x }); break;
        case "soldier_respawn": this.play("soldier_spawn", { x }); break;
        case "heal_pulse": this.play("heal_pulse", { x }); break;
        case "sapper_plant": this.play("sapper_fuse", { x }); break;
        case "tower_disabled": this.play("tower_disabled", { x }); break;
        case "summon": this.play("summon", { x }); break;
        case "deny": this.play("deny", {}); break;
        case "synergy_first": this.play("unlock", { vol: 0.7 }); break;
        case "spell_cast": this.spell(ev.spell, x); break;
        case "spell_ready": this.play("spell_ready", {}); break;
        case "gold": if (ev.amount >= 10 && !/kill|bounty/.test(ev.reason)) this.play("coins", { vol: 0.7 }); break;
        case "boss_spawn":
          this.play("boss_roar", { x });
          this.stinger("boss");
          if (this.want?.s === "battle") this.scene("boss", this.want.act);
          break;
        case "boss_telegraph": this.play("boss_telegraph", { x }); break;
        case "boss_ability": this.bossAbility(ev.ability, x); break;
        case "boss_phase": this.stinger("phase"); this.play("boss_roar", { x, vol: 0.8 }); break;
        case "victory": case "defeat": this.stinger(ev.e); if (this.m) this.m.heart = false; break;
        default: break;
      }
    }
  }

  // ---- mapping helpers ----------------------------------------------------------------------------------------------

  private shoot(kind: TowerId, spec: SpecId | null, x: number) {
    switch (kind) {
      case "archer": this.play(spec === "marksmen" ? "bolt" : "arrow", { x, n: spec === "volley" ? 3 : 1 }); break;
      case "mage": this.play(spec === "hexer" ? "hex" : "arcane", { x }); break;
      case "bombard": this.play(spec === "mortar" ? "mortar" : "shell_fire", { x }); break;
      case "frost": this.play("frost", { x }); break;
      case "alchemist": this.play("flask", { x }); break;
      case "pyre": this.play("flame", { x }); break;
      case "storm": this.play("zap", { x }); break;
      case "ballista": this.play(spec === "harpoon" ? "harpoon" : spec === "siegebolt" ? "siege" : "ballista", { x }); break;
      case "thornwood": this.play("thorns", { x }); break;
      default: break; // barracks, beacon, banner: their soldiers and auras speak instead
    }
  }

  private spell(spell: string, x: number) {
    switch (spell) {
      case "reinforcements": this.play("rally", {}); this.play("soldier_spawn", { x, delay: 0.15 }); break;
      case "meteor": this.play("meteor", { x }); break;
      case "firebomb": this.play("firebomb", { x }); break;
      case "tarpit": this.play("splash", { x, pitch: 0.55, vol: 1.3 }); break;
      case "stillness": this.play("stillness", {}); break;
      case "judgement": this.play("judgement", { x }); break;
      case "requisition": this.play("coins", {}); break;
      case "rally": this.play("rally", {}); this.play("aura", { delay: 0.2 }); break;
      case "barrier": this.play("barrier", { x }); break;
      case "bramblesurge": this.play("root", { x }); this.play("thorns", { x, delay: 0.1 }); break;
      default: break;
    }
  }

  private bossAbility(ability: string, x: number) {
    const a = ability.toLowerCase();
    if (a.includes("cry")) this.play("war_cry", { x });
    else if (a.includes("muster") || a.includes("summon")) { this.play("summon", { x }); this.play("rally", { pitch: 0.8 }); }
    else if (a.includes("charge")) { this.play("boss_stomp", { x, pitch: 1.3 }); this.play("boss_roar", { x, vol: 0.6 }); }
    else if (a.includes("burrow")) this.play("burrow", { x });
    else if (a.includes("erupt") || a.includes("surface")) this.play("erupt", { x });
    else if (a.includes("sand")) this.play("sandstorm", {});
    else if (a.includes("stomp")) this.play("boss_stomp", { x });
    else if (/armou?r|ice|shield/.test(a)) this.play("shield_up", { x, pitch: 0.6, vol: 1.4 });
    else if (a.includes("breath") || a.includes("flame")) this.play("breath", { x });
    else if (/wing|fly|take/.test(a)) { this.play("wings", { x }); this.play("boss_roar", { x, vol: 0.6 }); }
    else if (a.includes("land")) { this.play("grounded", { x, vol: 1.3 }); this.play("boss_stomp", { x, vol: 0.7 }); }
    else if (a.includes("molten")) this.play("boss_roar", { x });
    else this.play("boss_stomp", { x });
  }

  // ---- the voice pool -----------------------------------------------------------------------------------------------

  private live() { return !!this.e && (!this.ctx || this.ctx.state === "running"); }

  private cool(key: string, ms: number, at: number) {
    const last = this.last.get(key);
    if (last !== undefined && (at - last) * 1000 < ms && at >= last) return false;
    this.last.set(key, at);
    return true;
  }

  private play(name: Sfx, o: Play) {
    const e = this.e, m = this.m;
    if (!e || !m || !this.live()) return;
    const meta = META[name], now = e.now(), at = now + 0.005 + (o.delay ?? 0);
    if (!this.cool(name, meta.cd, at)) return;
    if (meta.cat === "sting") { m.stinger(name as Sting, "sfx", Math.pow(10, (LEVEL[name] ?? 0) / 20) * (o.vol ?? 1)); return; }

    const rec = (this.recent.get(name) ?? []).filter((x) => at - x < 0.25);
    rec.push(at);
    this.recent.set(name, rec);
    const live = e.live(now);
    let busy = 0;
    for (const v of live) if (META[v.name as Sfx]?.cat === "battle") busy++;
    let vol = (o.vol ?? 1) * Math.pow(10, (LEVEL[name] ?? 0) / 20) / Math.sqrt(1 + 0.5 * (rec.length - 1));
    if (meta.cat === "battle") vol /= 1 + 0.03 * busy;

    if (live.length >= VOICES) {
      let victim = live[0];
      for (const v of live) if (v.pri < victim.pri || (v.pri === victim.pri && v.start < victim.start)) victim = v;
      if (victim.pri > meta.pri) return;
      e.kill(victim, now);
    }

    const out = e.gain(vol), pan = e.pan(o.pan ?? (o.x !== undefined ? (clamp(o.x) * 2 - 1) * 0.8 : 0));
    out.connect(pan).connect(e.sfxIn);
    const p = (o.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * JITTER[meta.cat]);
    const srcs: AudioScheduledSourceNode[] = [];
    e.sink = srcs;
    let len = 0;
    try {
      const k = m.key().k;
      for (let i = 0; i < (o.n ?? 1); i++) len = Math.max(len, i * 0.05 + RECIPES[name](new V(e, out, at + i * 0.05, p * (1 + 0.04 * i), k, this.spd)));
    } finally { e.sink = null; }
    e.voices.push({ out, srcs, start: at, end: at + len + 0.05, pri: meta.pri, name });
    e.peakVoices = Math.max(e.peakVoices, e.voices.length);
  }

  private applyVol() {
    const e = this.e;
    if (!e) return;
    const t = e.now(), sq = (v: number) => v * v;
    e.master.gain.setTargetAtTime(this.muted ? 0 : sq(this.vols.master), t, 0.03);
    e.musicVol.gain.setTargetAtTime(sq(this.vols.music), t, 0.05);
    e.sfxVol.gain.setTargetAtTime(sq(this.vols.sfx), t, 0.05);
  }

  private attach(ctx: BaseAudioContext, opts?: { dry?: boolean }) {
    this.e = new Engine(ctx, opts);
    this.m = new Music(this.e);
    this.applyVol();
    this.m.target = this.m.level = this.inten;
    this.m.speed = this.spd;
    if (this.isPaused) this.m.pause(true);
    if (this.want) this.m.play(songFor(this.want.s, this.want.act));
    this.m.tick();
  }

  // ---- for the measuring harness (measure.ts) and the audition page ---------------------------------------------------

  /** Builds the whole graph on an offline context, its clock driven by `_advance`. */
  _offline(ctx: OfflineAudioContext, opts?: { dry?: boolean }) {
    this.ctx = null;
    this.last.clear(); this.recent.clear();
    this.e = null; this.m = null;
    this.attach(ctx, opts);
    this.e!.clock = 0;
  }
  _skip(layers: string[]) { if (this.m) this.m.skip = new Set(layers as never[]); }
  _advance(t: number) { if (this.e) { this.e.clock = t; this.m!.tick(); } }
  _stats() { return { voices: this.e?.live().length ?? 0, peakVoices: this.e?.peakVoices ?? 0, level: this.m?.level ?? 0 }; }
  get _ctx(): BaseAudioContext | null { return this.e?.ctx ?? null; }
}

const clamp = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

export const audio = new Audio();
