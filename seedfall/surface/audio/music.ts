// The adaptive score (design/audio.md section 8): players that schedule a song's bars on the audio clock
// (25 ms pump, 100-150 ms ahead), tension thinning, crossfades between songs, suites and gaps, the Core's pulse
// lock, the menu loop, stingers and the launch cue. Decisions live in plan.ts; this file only plays them.
import { Kit, Persist, clamp, db, hold, mtof, mulberry, rnd, startAll, type Shot } from "./kit.ts";
import type { Graph } from "./graph.ts";
import * as I from "./inst.ts";
import { Composer, Suites, Tension, type Layer, type Mask, type Note } from "./plan.ts";
import { BIOME_SONGS, SEED, SONGS, degree, droneInterval, ladder, songFor, type Motif, type Song } from "./score.ts";

/** Layer trims (dB) inside the music bus, tuned by the offline checks for a -18 dBFS peak at full slider. */
const LAYER_DB: Record<Layer, number> = { pad: -15, bass: -9, arp: -17, perc: -11, lead: -11, seed: -11, clock: 0 };
const LOOK = 0.12;

interface Player {
  song: Song;
  comp: Composer;
  dry: GainNode;
  wet: GainNode;
  delay: GainNode;
  fade: GainNode[];
  nextBar: number;
  bars: number;
  queue: { t: number; n: Note }[];
  /** Layers allowed for the first bars (crossfade intro, dive, a new suite), and how many bars. */
  mask: Mask;
  maskBars: number;
  out: boolean;
  dead: number;
  lastLead: { f: number; end: number };
}

export interface MusicTarget { menu: boolean; town: boolean; night: boolean; biome: number; planet: string; launching: boolean }

export class Music {
  readonly k: Kit;
  readonly tension = new Tension();
  readonly suites: Suites;
  readonly rng: () => number;
  players: Player[] = [];
  private bus: GainNode;
  private trim: GainNode;
  private verbSend: GainNode;
  private delaySend: GainNode;
  private delays: DelayNode[];
  private drone: Persist<{ srcs: AudioScheduledSourceNode[]; a: OscillatorNode; b: OscillatorNode; wob: GainNode }>;
  private droneSong = "";
  /** Song chosen per biome over the last 8 s (crossfades are not reversed within 8 s). */
  private history: { t: number; key: string }[] = [];
  private lastSwitch = -99;
  private townVisits = 0;
  private pulse: { at: number } | null = null;
  private menuSeedAt = 0;
  /** Logs for the checks. */
  logOn = false;
  noteLog: { t: number; song: string; layer: Layer | "drone" | "cue"; midi: number }[] = [];
  /** τ and fuel-under-home as last read. */
  tau = 0;
  under = false;

  constructor(readonly g: Graph, seed = (Math.random() * 2 ** 32) >>> 0) {
    this.k = g.kit;
    this.rng = mulberry(seed);
    const k = this.k;
    this.suites = new Suites(this.rng, k.now);
    this.trim = k.gain(1);
    this.bus = k.gain(1);
    this.bus.connect(this.trim).connect(g.bus.music);
    // The music's own reverb (2.4 s, HP 300, send -10 dB) and a ping-pong delay (dotted eighth, fb 0.35, BP 600-5000).
    const verb = g.ctx.createConvolver();
    verb.buffer = k.ir(2.4, 6000);
    this.verbSend = k.gain(db(-10));
    const hp = k.filt("highpass", 300, 0.7);
    this.verbSend.connect(hp).connect(verb).connect(this.trim);
    this.delaySend = k.gain(db(-12));
    const lo = k.filt("highpass", 600, 0.7), hi = k.filt("lowpass", 5000, 0.7);
    const l = g.ctx.createDelay(2), r = g.ctx.createDelay(2), merge = g.ctx.createChannelMerger(2);
    const fb1 = k.gain(0.35), fb2 = k.gain(0.35);
    this.delaySend.connect(lo).connect(hi).connect(l);
    l.connect(fb1).connect(r); r.connect(fb2).connect(l);
    l.connect(merge, 0, 0); r.connect(merge, 0, 1);
    merge.connect(this.trim);
    this.delays = [l, r];
    this.bus.connect(this.verbSend);
    this.drone = new Persist(k, this.bus, (out) => {
      const lp = k.filt("lowpass", 300, 0.7), a = k.osc("sawtooth", 55), b = k.osc("sawtooth", 58), wobL = k.osc("sine", 0.3), wob = k.gain(0);
      wobL.connect(wob); wob.connect(a.detune); wob.connect(b.detune);
      const ag = k.gain(0.5), bg = k.gain(0.4);
      a.connect(ag).connect(lp); b.connect(bg).connect(lp); lp.connect(out);
      return { srcs: startAll([a, b, wobL], k.now), a, b, wob };
    });
  }

  get now() { return this.k.now; }
  private barSec(s: Song) { return 240 / s.bpm; }
  get current() { return this.players.find((p) => !p.out) ?? null; }

  // ---- players ---------------------------------------------------------------------------------------------

  private makePlayer(song: Song, at: number, mask: Mask = {}, maskBars = 0): Player {
    const k = this.k;
    const dry = k.gain(1), wet = k.gain(0), delay = k.gain(1);
    const fd = k.gain(1), fw = k.gain(1), fl = k.gain(1);
    dry.connect(fd).connect(this.bus);
    wet.connect(fw).connect(this.verbSend);
    delay.connect(fl).connect(this.delaySend);
    const comp = new Composer(song, this.rng);
    comp.logOn = this.logOn;
    if (song.melody && song.id === "town") comp.full = this.townVisits % 3 === 1;
    for (const d of this.delays) d.delayTime.setValueAtTime(0.75 * (60 / song.bpm), Math.max(this.now, at));
    const p: Player = { song, comp, dry, wet, delay, fade: [fd, fw, fl], nextBar: at, bars: 0, queue: [], mask, maskBars, out: false, dead: 0, lastLead: { f: 0, end: 0 } };
    this.players.push(p);
    return p;
  }

  /** The outgoing song drops all but its pad and releases over `secs` (equal power over the first 2/3). */
  private release(p: Player, secs: number) {
    if (p.out) return;
    p.out = true;
    p.mask = { only: new Set<Layer>(["pad"]) };
    p.maskBars = 1e9;
    const t = this.now, steps = 24, curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) curve[i] = Math.cos(((i / (steps - 1)) * Math.PI) / 2);
    for (const f of p.fade) {
      hold(f.gain, t);
      f.gain.setValueCurveAtTime(curve, t + 0.01, secs * (2 / 3));
      f.gain.setValueAtTime(0, t + 0.02 + secs * (2 / 3));
    }
    p.dead = t + secs + 2.5;
    // Notes already queued past the fade are dropped; pads that ring release naturally.
    p.queue = p.queue.filter((q) => q.n.layer === "pad");
  }

  private stopAll(secs: number) { for (const p of this.players) this.release(p, secs); }

  /** Fade the trim: the menu plays 6 dB down; the launch silences the score. */
  private setTrim(v: number, tau: number) { this.trim.gain.setTargetAtTime(v, this.now, tau); }

  // ---- the clock -------------------------------------------------------------------------------------------

  /** Compose bars and schedule notes up to `LOOK` ahead. Called every frame and from a 25 ms timer. */
  pump() {
    const now = this.now;
    for (const p of this.players) {
      const bs = this.barSec(p.song);
      // After a stall (a hidden tab), skip what is past rather than play it all at once.
      if (p.nextBar < now - bs) p.nextBar = now + 0.05;
      while (p.nextBar < now + LOOK + 0.05) {
        if (!p.out) this.composeBar(p, bs);
        p.nextBar += bs;
      }
      const due = p.queue.filter((q) => q.t < now + LOOK);
      if (due.length) {
        p.queue = p.queue.filter((q) => q.t >= now + LOOK);
        for (const q of due) this.render(p, q.n, Math.max(q.t, now + 0.005));
      }
    }
    // Retire released players.
    for (const p of this.players) if (p.out && p.dead && now > p.dead) { for (const f of p.fade) f.disconnect(); }
    this.players = this.players.filter((p) => !(p.out && p.dead && now > p.dead));
  }

  private composeBar(p: Player, bs: number) {
    const s = p.song;
    let t0 = p.nextBar;
    // The Core locks its downbeats to the pulse's arrival: at most a sixteenth of drift per bar.
    if (s.id === "core" && this.pulse) {
      const grid = bs, e = ((((t0 - this.pulse.at) % grid) + grid * 1.5) % grid) - grid / 2;
      const six = bs / 16, shift = clamp(-e, -six, six);
      t0 += shift; p.nextBar += shift;
    }
    // A suite ends at a phrase end: the song releases and only the ambience plays.
    if (!this.suites.playing && (!p.comp.phrase || p.comp.barInPhrase >= p.comp.phrase.bars)) { this.release(p, 4); return; }
    this.tension.bar(this.tau, this.under);
    const mask = p.maskBars > 0 ? p.mask : {};
    if (p.maskBars > 0) p.maskBars--;
    const out = p.comp.bar(this.tension, bs, mask);
    p.bars++;
    const six = bs / 16;
    for (const n of out.notes) {
      const sw = n.step % 2 === 1 ? (s.swing - 0.5) * 2 : 0;
      const pitched = n.layer !== "perc" && n.layer !== "clock";
      const jitter = pitched ? (rnd() * 2 - 1) * 0.008 : 0;
      p.queue.push({ t: t0 + (n.step + sw) * six + jitter, n });
    }
  }

  private render(p: Player, n: Note, t: number) {
    // Fuel under home: everything stops but the drone and the clock.
    if (this.tension.under && n.layer !== "clock") return;
    const k = this.k, s = p.song, six = this.barSec(s) / 16, dur = n.len * six;
    const prio = n.layer === "pad" ? 0 : n.layer === "lead" || n.layer === "seed" || n.layer === "bass" ? 2 : 1;
    const sh = k.shot("music", p.dry, t, n.db + LAYER_DB[n.layer], 0, prio);
    const f = mtof(n.midi);
    if (this.logOn && n.layer !== "perc" && n.layer !== "clock") this.noteLog.push({ t, song: s.id, layer: n.layer, midi: n.midi });
    const busy = k.live.music.reduce((a, x) => a + (x.end > t ? x.srcs.length : 0), 0);
    switch (n.layer) {
      case "pad": {
        const cut = this.tension.stage >= 4 ? Math.min(s.padCut, 2400 - 1800 * this.tension.tau) : s.padCut * (1 + 0.2 * Math.sin(2 * Math.PI * 0.07 * t));
        this.padNote(sh, s, f, t, dur, cut, busy > 16 ? 2 : 3);
        break;
      }
      case "bass":
        if (s.bassInst === "drive") I.driveBass(k, sh, f, t, dur);
        else if (s.bassInst === "bloop") I.bloop(k, sh, f, t, dur);
        else if (s.bassInst === "pluck") I.pluck(k, sh, f, t, -2, 500);
        else I.bass(k, sh, f, t, dur);
        break;
      case "arp":
        if (s.arpInst === "bell") I.bell(k, sh, f, t, -4, false, 700);
        else if (s.arpInst === "marimba") I.marimba(k, sh, f, t);
        else I.pluck(k, sh, f, t);
        sh.out.connect(p.delay);
        break;
      case "lead": {
        const from = p.lastLead.end > t - 0.05 ? p.lastLead.f : 0;
        this.leadNote(sh, s, f, t, dur, from);
        p.lastLead = { f, end: t + dur };
        sh.out.connect(p.delay);
        break;
      }
      case "seed": this.seedNote(sh, p, s, f, t, dur); break;
      case "perc": I.perc(k, sh, n.perc!, t, 0, n.accent); break;
      case "clock": I.clockClick(k, sh, t, 0); break;
    }
    k.fin(sh);
  }

  private padNote(sh: Shot, s: Song, f: number, t: number, dur: number, cut: number, voices: number) {
    const k = this.k;
    if (s.pad === "choir") I.choir(k, sh, f, t, dur, 2);
    else if (s.pad === "organ") I.organ(k, sh, f, t, dur, 2);
    else if (s.pad === "pwm") I.pwm(k, sh, f, t, dur, cut);
    else if (s.pad === "drive") I.drivePad(k, sh, f, t, dur, cut);
    else I.pad(k, sh, f, t, dur, cut, 0, voices);
  }

  private leadNote(sh: Shot, s: Song, f: number, t: number, dur: number, from: number) {
    const k = this.k;
    if (s.lead === "bell") I.bell(k, sh, f, t, -2, false, Math.max(600, dur * 1000));
    else if (s.lead === "choir") I.choir(k, sh, f, t, dur, 0, 200, 600);
    else I.lead(k, sh, s.lead, f, t, dur, 0, from);
  }

  private seedNote(sh: Shot, p: Player, s: Song, f: number, t: number, dur: number) {
    const k = this.k, d = s.seed.db;
    sh.out.gain.value *= db(d);
    p.wet.gain.setValueAtTime(s.seed.wet * 1.4, t);
    sh.out.connect(p.wet);
    switch (s.seed.inst) {
      case "bell": I.bell(k, sh, f, t, 0, false, 1600); break;
      case "glass": I.bell(k, sh, f, t, 0, true, 1600); break;
      case "marimba": I.marimba(k, sh, f, t, 0, 600); break;
      case "brass": I.lead(k, sh, "brass", f, t, dur, -2); break;
      case "choir": I.choir(k, sh, f, t, dur, 0, 250, 900); break;
      case "lead": I.lead(k, sh, "whistle", f, t, dur, 0); I.bell(k, sh, f * 2, t, -8, false, 900); break;
    }
  }

  // ---- what plays ------------------------------------------------------------------------------------------

  /** Every frame: tension, the target song, crossfades, suites, the drone, the menu's Seed. */
  update(target: MusicTarget, tau: number, under: boolean, dayPhase: number) {
    const now = this.now;
    if (target.launching) { this.updateDrone(0, false); this.pump(); return; }
    // Tension (τ is 0 in town and the menus): the beat-level drops every frame, the bar-level ones in composeBar.
    const quiet = target.town || target.menu;
    this.tau = quiet ? 0 : tau;
    this.under = quiet ? false : under;
    this.tension.beat(this.tau, this.under);
    if (!this.current) this.tension.bar(this.tau, this.under);
    // Suites and gaps.
    if (this.suites.tick(now)) this.resumeSuite();

    const key = this.songKey(target, dayPhase);
    this.follow(key, target);
    this.updateDrone(this.tension.stage >= 5 || this.tension.under ? 1 : 0, this.tension.under);
    // The menu: the Seed motif once every 90 s on the glass bell.
    if (target.menu && now - this.menuSeedAt > 90) { this.menuSeedAt = now; this.motif(SONGS.menu, SEED, now + 1, "glass", this.bus, -14, 12); }
    this.pump();
  }

  private songKey(t: MusicTarget, phase: number) {
    if (t.menu) return "menu";
    if (t.town) return phase >= 0.8 || phase < 0.2 ? "townNight" : "town";
    return songFor(t.biome, t.planet).id;
  }

  /** Follow the wanted song: anti-bounce across biome boundaries, crossfade rules per kind of change. */
  private follow(key: string, _t: MusicTarget) {
    const now = this.now;
    this.history.push({ t: now, key });
    while (this.history.length && this.history[0].t < now - 8) this.history.shift();
    const cur = this.current;
    if (cur && cur.song.id === key) return;
    if (!cur && !this.suites.playing) return;
    const mine = (id: string) => BIOME_SONGS.includes(id) || id === "cinder" || id === "ferrum";
    if (cur && mine(cur.song.id) && mine(key)) {
      // Biome change: not reversed within 8 s; follow where the pod spent most of those 8 s.
      if (now - this.lastSwitch < 8) return;
      const tally = new Map<string, number>();
      for (let i = 1; i < this.history.length; i++) tally.set(this.history[i].key, (tally.get(this.history[i].key) ?? 0) + (this.history[i].t - this.history[i - 1].t));
      let best = key, most = -1;
      for (const [k, v] of tally) if (v > most) { best = k; most = v; }
      if (best === cur.song.id) return;
      key = best;
    }
    const song = SONGS[key];
    if (!song) return;
    this.lastSwitch = now;
    const pad = new Set<Layer>(["pad"]), padBass = new Set<Layer>(["pad", "bass"]);
    if (!cur) { this.makePlayer(song, now + 0.1, { only: pad }, 4); return; }
    const from = cur.song.id;
    if (key === "menu" || from === "menu") {
      this.release(cur, 2);
      this.makePlayer(song, now + 0.3, { only: pad }, 4);
      this.setTrim(key === "menu" ? db(-6) : 1, 0.5);
    } else if (key === "town" || key === "townNight") {
      if (from === "town" || from === "townNight") {
        // Day and night swap at a phrase end, crossfading over 4 bars.
        if (!cur.comp.phrase || cur.comp.barInPhrase < cur.comp.phrase.bars) { this.lastSwitch = -99; return; }
        this.release(cur, 4 * this.barSec(cur.song));
        this.makePlayer(song, cur.nextBar, { only: padBass }, 4);
      } else {
        // Surfacing: the mine song fades out over 2 s and the town theme starts on its first phrase.
        this.release(cur, 2);
        this.townVisits++;
        this.makePlayer(song, now + 1.2);
      }
    } else if (from === "town" || from === "townNight") {
      // Diving: the town fades over 3 s; the Topsoil song starts at its first phrase, pad only for 4 bars.
      this.release(cur, 3);
      this.makePlayer(song, now + 0.5, { only: pad }, 4);
    } else {
      // Biome: the incoming song starts on the next bar line, pad and bass only for its first phrase; the outgoing releases over 6 s.
      this.release(cur, 6);
      this.makePlayer(song, Math.max(cur.nextBar, now + 0.05), { only: padBass }, 8);
    }
  }

  /** A new suite starts with a pad fade, never on a hit. */
  private resumeSuite() {
    const cur = this.current;
    if (cur) { cur.mask = { only: new Set<Layer>(["pad"]) }; cur.maskBars = 4; }
  }
  /** A biome entry or surfacing always starts a suite. */
  startSuite() {
    const wasGap = !this.suites.playing;
    this.suites.start(this.now);
    if (wasGap) this.resumeSuite();
  }

  private updateDrone(on: number, wobble: boolean) {
    const cur = this.current;
    const s = cur?.song ?? SONGS.topsoil;
    if (on && this.drone.v && this.droneSong !== s.id) {
      const root = mtof(s.tonic % 12 + 36);
      this.drone.v.a.frequency.setTargetAtTime(root, this.now, 0.5);
      this.drone.v.b.frequency.setTargetAtTime(root * Math.pow(2, droneInterval(s) / 12), this.now, 0.5);
    }
    if (on && !this.drone.v) {
      this.drone.set(1e-4);
      const root = mtof(s.tonic % 12 + 36);
      this.drone.v!.a.frequency.value = root;
      this.drone.v!.b.frequency.value = root * Math.pow(2, droneInterval(s) / 12);
    }
    this.droneSong = s.id;
    if (this.drone.v) this.drone.v.wob.gain.setTargetAtTime(wobble ? 10 : 0, this.now, 0.3);
    this.drone.set(on ? db(-22) : 0, on ? 0.5 : 0.8);
    if (on && this.logOn && rnd() < 0.01) this.noteLog.push({ t: this.now, song: s.id, layer: "drone", midi: s.tonic % 12 + 36 });
  }

  // ---- events --------------------------------------------------------------------------------------------

  /** The core beat: when it reaches the pod (s, audio time); the Core realigns its next downbeats to it. */
  onPulse(arrival: number) { this.pulse = { at: arrival }; }

  /** Play a motif once on an instrument into `dest` (stingers, the menu's Seed, the launch). */
  motif(song: Song, m: Motif, at: number, inst: "glass" | "bell" | "lead" | "brass" | "choir" | "marimba" | "whistle" | "triangle" | "hum", dest: AudioNode, gainDb: number, shift = 0, bpm = song.bpm, bars = 99) {
    const k = this.k, six = 15 / bpm;
    let pos = 0, end = at;
    for (const [d, l] of m) {
      if (pos >= bars * 16) break;
      if (d !== null) {
        const midi = degree(song, d) + shift, f = mtof(midi), t = at + pos * six, dur = l * six;
        const sh = k.shot("music", dest, t, gainDb, 0, 3);
        if (inst === "glass" || inst === "bell") I.bell(k, sh, f, t, 0, inst === "glass", 1400);
        else if (inst === "choir") I.choir(k, sh, f, t, dur, 0, 200, 800);
        else if (inst === "marimba") I.marimba(k, sh, f, t, 0, 500);
        else I.lead(k, sh, inst === "lead" ? "whistle" : inst, f, t, dur, 0);
        k.fin(sh);
        if (this.logOn) this.noteLog.push({ t, song: song.id, layer: "cue", midi });
        end = t + dur;
      }
      pos += l;
    }
    return end;
  }

  /** A chord on the song's pad instrument (fanfare stabs, sale chords, cadences). Degrees relative to the song's tonic. */
  chord(song: Song, degrees: number[], at: number, dur: number, dest: AudioNode, gainDb: number, oct = -1) {
    const k = this.k;
    for (const d of degrees) {
      const midi = degree(song, d, oct), f = mtof(midi);
      const sh = k.shot("music", dest, at, gainDb - 4, 0, 3);
      if (song.pad === "choir") I.choir(k, sh, f, at, dur, 0, 200, 900);
      else if (song.pad === "organ") I.organ(k, sh, f, at, dur);
      else I.pad(k, sh, f, at, dur, Math.max(1600, song.padCut), 0, 2);
      // The fanfares want a quick attack: a soft pluck under the pad gives the stab its front.
      I.pluck(k, sh, f, at, -6, 500);
      k.fin(sh);
      if (this.logOn) this.noteLog.push({ t: at, song: song.id, layer: "cue", midi });
    }
  }

  /** Biome entry stinger (section 7.2): the root drone fades in over 400 ms, then the lead motif's first bar. */
  stinger(song: Song, dest: AudioNode) {
    const k = this.k, t = this.now + 0.05;
    const root = mtof(song.tonic - 24);
    const sh = k.shot("music", dest, t, -14, 0, 3);
    k.tone(sh, { f: root, a: 400, hold: [1, 2.4, 600], db: 0 });
    k.tone(sh, { f: root * 1.5, a: 400, hold: [1, 2.4, 600], db: -6 });
    k.fin(sh);
    const inst = song.lead === "bell" ? "bell" : song.lead;
    this.motif(song, song.motif, t + 0.45, inst, dest, -2, 0, song.bpm, 1);
  }

  // ---- the launch (section 8.7) --------------------------------------------------------------------------

  launchCue(phase: string, dest: AudioNode, fxDest: AudioNode) {
    const k = this.k, now = this.now, p = phase.toLowerCase();
    if (p.includes("wake")) {
      this.stopAll(1.5);
      const sh = k.shot("fx", fxDest, now, -10);
      k.nz(sh, { kind: "pink", f: 200, f2: 4000, sweep: 3000, q: 2, a: 2500, d: 600 });
      k.fin(sh);
    } else if (p.includes("rise")) {
      this.stopAll(0.5);
      const core = SONGS.core;
      // A sustained A pedal and a choir pad brightening over 12 s.
      const ped = k.shot("music", dest, now, -12, 0, 5);
      k.tone(ped, { f: 55, a: 800, hold: [1, 12, 1500] });
      k.tone(ped, { f: 110, type: "triangle", a: 800, hold: [1, 12, 1500], db: -8 });
      k.fin(ped);
      for (const d of [0, 4, 7]) {
        const sh = k.shot("music", dest, now, -16, 0, 5);
        I.pad(k, sh, mtof(degree(core, d, -1)), now, 12, 600, 0, 2, 4000);
        k.fin(sh);
      }
      // One bar of each biome's lead motif, bottom to top, every 1.7 s, in its own key and instrument.
      [...BIOME_SONGS].reverse().forEach((id, i) => {
        const s = SONGS[id];
        this.motif(s, s.motif, now + 0.2 + i * 1.7, s.lead === "bell" ? "bell" : s.lead, dest, -6, 0, Math.max(120, s.bpm * 1.5), 1);
      });
    } else if (p.includes("break") || p.includes("surface") || p.includes("climb")) {
      // Break the surface: a sub boom, one beat of silence, then the climb: the Seed motif in full, A Lydian, every
      // instrument, at 80: the only loud statement of it. (The rules emit "surface"; "climb" alone skips the boom.)
      const climbOnly = p.includes("climb");
      if (!climbOnly) {
        this.stopAll(0.2);
        const sh = k.shot("fx", fxDest, now, -2);
        k.thump(sh, 50, 25, 1200, 0);
        k.nz(sh, { kind: "brown", type: "lowpass", f: 140, q: 0.7, a: 30, d: 900, db: -6 });
        k.fin(sh);
      }
      const core = SONGS.core, bpm = 80, beat = 60 / bpm, at = now + (climbOnly ? 0.05 : beat);
      this.chord(core, [0, 2, 4], at, 10 * beat, dest, -6, -1);
      const sh = k.shot("music", dest, at, -6, 0, 5);
      I.bass(k, sh, mtof(core.tonic - 36), at, 10 * beat, 0);
      k.fin(sh);
      this.motif(core, SEED, at, "whistle", dest, -2, 0, bpm);
      this.motif(core, SEED, at, "bell", dest, -6, 12, bpm);
      this.motif(core, SEED, at, "choir", dest, -8, -12, bpm);
      this.motif(core, SEED, at, "brass", dest, -10, -12, bpm);
    } else if (p.includes("observ") || p.includes("choose") || p.includes("done") || p.includes("end")) {
    }
  }

  /** One shard chime on the top of the Core's ladder (rate limited by the caller). */
  shard(dest: AudioNode, i: number, at = this.now) {
    const k = this.k, f = mtof(ladder(SONGS.core, 10 + (i % 6)));
    const sh = k.shot("chime", dest, at, -18, Math.sin(i * 2.1) * 0.7);
    k.tone(sh, { f, a: 2, d: 300, at });
    k.tone(sh, { f: f * 2, a: 2, d: 150, db: -10, at });
    k.fin(sh);
  }

  /** For the debug overlay. */
  info() {
    const c = this.current;
    return { song: c?.song.id ?? "-", phrase: c?.comp.phrase?.n ?? -1, bar: c?.comp.barInPhrase ?? 0, stage: this.tension.stage, under: this.tension.under, tau: this.tau, suite: this.suites.playing, players: this.players.length };
  }
}
