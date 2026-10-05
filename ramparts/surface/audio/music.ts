// The sequencer: plays a song (songs.ts) a bar at a time, a little ahead on the
// audio clock. Each song plays through its own six layer buses (pad, pulse,
// percussion, bass, lead, high); battle songs open them by intensity, the
// others by the bar they enter. A change of song lands on a bar line (or the
// next beat when the bar line is far), the old song fading under the new.
// Stingers are short musical phrases in the key of whatever is playing, and
// duck the music while they sound.
import { type Engine, mtof } from "./engine.ts";
import * as I from "./inst.ts";
import { type Layer, type Slot, type Song, chord, degree, tokens } from "./songs.ts";

const LOOK = 0.3;
const LAYERS: Layer[] = ["pad", "pulse", "perc", "bass", "lead", "high"];
const SLOTS: Slot[] = ["low", "mid", "hi", "acc"];
/** Intensity at which the percussion, the bass and lead, and the high layer come in (each leaves 0.08 lower). */
const UP = [0.3, 0.6, 0.85];

export type Sting = "wave" | "elite" | "boss" | "victory" | "defeat" | "unlock" | "relic" | "phase";

const hum = (a = 0.08) => 1 + (Math.random() * 2 - 1) * a;
/** Each stinger's trim (dB) to peak near -8 dBFS on its own (check.ts --only=sting). */
const STING_DB: Record<Sting, number> = { wave: -9, elite: -8, boss: -10.5, victory: -12, defeat: -5, unlock: -6.3, relic: -1.7, phase: -9.5 };

class Player {
  readonly out: GainNode;
  readonly bus = {} as Record<Layer, GainNode>;
  readonly barLen: number;
  next = 0;
  stopAt = Infinity;
  dead = Infinity;
  tier = 0;
  leadOn = false;
  highOn = false;
  padUntil = 0;
  constructor(e: Engine, readonly song: Song, readonly anchor: number) {
    this.barLen = (song.beats * 60) / song.bpm;
    this.out = e.gain(Math.pow(10, (song.gain ?? 0) / 20));
    this.out.connect(e.musicIn);
    this.out.connect(e.gain(song.verb)).connect(e.mVerb);
    for (const l of LAYERS) { const g = e.gain(0); g.connect(this.out); this.bus[l] = g; }
    const echo = e.gain(song.echo);
    this.bus.lead.connect(echo); this.bus.pulse.connect(echo); echo.connect(e.mDelay);
    e.setDelay((60 / song.bpm) * 0.75);
  }
}

export class Music {
  private players: Player[] = [];
  cur: Player | null = null;
  /** Smoothed intensity, and what it moves toward. */
  level = 0;
  target = 0;
  private lastT = -1;
  heart = false;
  speed = 1;
  stingUntil = 0;
  /** Layers left out (the measuring harness uses it to cost each layer). */
  skip = new Set<Layer>();

  constructor(readonly e: Engine) {}

  /** The tonic (MIDI, 57..68) and whether the music now is in a minor mode, for chimes in key. */
  key() {
    const s = this.cur?.song, k0 = s?.key ?? 62;
    return { k: 57 + ((((k0 - 57) % 12) + 12) % 12), minor: !!s && s.mode[2] === 3 };
  }

  tick() {
    const now = this.e.now();
    const dt = this.lastT < 0 ? 0 : Math.max(0, Math.min(0.5, now - this.lastT));
    this.lastT = now;
    this.level += (this.target - this.level) * (1 - Math.exp(-dt / 0.9));
    for (const p of this.players) {
      for (;;) {
        const t = p.anchor + p.next * p.barLen;
        if (t >= p.stopAt - 1e-3 || t >= now + LOOK) break;
        // After a stall, skip what is past rather than play it late.
        if (t < now - 0.05) { p.next = Math.ceil((now - p.anchor) / p.barLen); continue; }
        this.bar(p, p.next++, t);
      }
    }
    this.players = this.players.filter((p) => {
      if (now < p.dead) return true;
      // A graph change is immediate, not scheduled: offline (the whole render built up front) it would silence the piece from the start.
      if (this.e.clock === null) p.out.disconnect();
      return false;
    });
  }

  play(song: Song) {
    const e = this.e, now = e.now(), cur = this.cur;
    if (cur && cur.song === song) return;
    let at = now + 0.08;
    if (cur) {
      const line = cur.anchor + cur.next * cur.barLen;
      if (line - now <= 1.7) at = line;
      else {
        const beat = cur.barLen / cur.song.beats;
        at = cur.anchor + Math.ceil((now + 0.12 - cur.anchor) / beat) * beat;
      }
      const stinging = this.stingUntil > now;
      if (stinging) at = Math.max(at, this.stingUntil - 0.3);
      this.retire(cur, stinging ? now : at - 0.2, stinging ? Math.min(at, now + 1) : at);
    }
    const p = new Player(e, song, at);
    this.players.push(p);
    this.cur = p;
  }

  stop() {
    if (this.cur) this.retire(this.cur, this.e.now(), this.e.now() + 0.5);
    this.cur = null;
  }

  private retire(p: Player, fadeFrom: number, stopAt: number) {
    p.stopAt = Math.min(p.stopAt, stopAt);
    const g = p.out.gain;
    g.cancelScheduledValues(fadeFrom);
    g.setTargetAtTime(0, Math.max(this.e.now(), fadeFrom), 0.4);
    p.dead = Math.max(fadeFrom, stopAt) + 5;
  }

  pause(on: boolean) {
    const e = this.e, t = e.now(), f = e.muffle.frequency, g = e.musicIn.gain;
    f.cancelScheduledValues(t); f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(on ? 650 : 20000, t + (on ? 0.35 : 0.25));
    g.cancelScheduledValues(t); g.setTargetAtTime(on ? 0.7 : 1, t, 0.1);
  }

  // ---- one bar ------------------------------------------------------------------------------------------------------

  private bar(p: Player, n: number, t0: number) {
    const e = this.e, s = p.song, form = s.melody.length, fb = n % form, pass = Math.floor(n / form), L = p.barLen;

    let on: Record<Layer, boolean>;
    if (s.adaptive) {
      const x = Math.max(this.level, s.floor ?? 0);
      let tier = p.tier;
      while (tier < 3 && x >= UP[tier]) tier++;
      while (tier > 0 && x < UP[tier - 1] - 0.08) tier--;
      if (tier === 3 && p.tier < 3 && n > 0 && s.kit) s.kit.crash(e, p.bus.perc, t0, 0.7, 0);
      p.tier = tier;
      // The lead and the high layer enter on a phrase (four bars), and leave at once.
      if (fb % 4 === 0 || tier < 2) p.leadOn = tier >= 2;
      if (fb % 4 === 0 || tier < 3) p.highOn = tier >= 3;
      on = { pad: true, pulse: true, perc: tier >= 1, bass: tier >= 2, lead: p.leadOn, high: p.highOn };
    } else {
      const en = s.enter ?? {};
      const has = (l: Layer) => en[l] !== undefined && (pass > 0 || fb >= en[l]!);
      on = { pad: has("pad"), pulse: has("pulse"), perc: has("perc"), bass: has("bass"), lead: has("lead"), high: has("high") };
    }
    for (const l of this.skip) on[l] = false;
    for (const l of LAYERS) p.bus[l].gain.setTargetAtTime(on[l] ? s.mix[l] : 0, Math.max(0, t0 - 0.01), on[l] ? 0.02 : L * 0.12);

    const segs = s.chords[fb].split(/\s+/), cs = segs.map((c) => chord(s.mode, c));
    const chordAt = (x: number) => cs[Math.min(cs.length - 1, Math.floor(x * cs.length + 1e-9))];
    const pc = (x: number) => ((x % 12) + 12) % 12;
    const voice = (c: number[], center: number) => c.map((x) => {
      let m = s.key + x;
      while (m < center - 6) m += 12;
      while (m >= center + 6) m -= 12;
      return m;
    }).sort((a, b) => a - b);
    const arp = (c: number[]) => c.map((x) => pc(c[0]) + x - c[0]).sort((a, b) => a - b);
    const when = (i: number, steps: number) => {
      const st = L / steps, sw = s.swing && (steps === 8 || steps === 16) && i % 2 === 1 ? s.swing * st : 0;
      return t0 + i * st + sw;
    };
    const lvl = s.adaptive ? this.level : 0.6;

    // ---- pad: a chord held across identical bars
    if (on.pad && n >= p.padUntil) {
      let k = 1;
      if (s.padFixed || segs.length === 1) while (k < 4 && fb + k < form && (s.padFixed || s.chords[fb + k] === s.chords[fb])) k++;
      p.padUntil = n + k;
      const v = 0.75 + 0.25 * lvl;
      if (s.padFixed) s.pad(e, p.bus.pad, t0, voice(chord(s.mode, s.padFixed), s.padCenter).map(mtof), k * L, v);
      else if (segs.length === 1) s.pad(e, p.bus.pad, t0, voice(cs[0], s.padCenter).map(mtof), k * L, v);
      else cs.forEach((c, i) => s.pad(e, p.bus.pad, t0 + (i * L) / cs.length, voice(c, s.padCenter).map(mtof), L / cs.length, v));
    }

    // ---- pulse: the chord broken into a pattern
    if (on.pulse) {
      const pat = s.pulse[fb % s.pulse.length], st = L / pat.length, v = 0.7 + 0.3 * Math.min(1, lvl * 1.3);
      for (let i = 0; i < pat.length; i++) {
        const ch = pat[i];
        if (ch < "0" || ch > "9") continue;
        let len = 1;
        while (pat[i + len] === "-") len++;
        const a = arp(chordAt(i / pat.length)), k = Number(ch);
        const m = s.key + s.pulseOct + a[k % a.length] + 12 * Math.floor(k / a.length);
        s.pulseInst(e, p.bus.pulse, when(i, pat.length) + Math.random() * 0.004, mtof(m), len * st, v * (i === 0 ? 1 : 0.82) * hum());
      }
    }

    // ---- bass
    if (on.bass) {
      const pat = s.bass[fb % s.bass.length], st = L / pat.length;
      for (let i = 0; i < pat.length; i++) {
        const ch = pat[i];
        if (!"r53o".includes(ch)) continue;
        let len = 1;
        while (pat[i + len] === "-") len++;
        const c = chordAt(i / pat.length);
        const off = ch === "5" ? c[2] - c[0] : ch === "3" ? c[1] - c[0] : ch === "o" ? 12 : 0;
        s.bassInst(e, p.bus.bass, when(i, pat.length), mtof(s.key + s.bassOct + pc(c[0]) + off), len * st * 0.95, (i === 0 ? 0.95 : 0.85) * hum(0.05));
      }
    }

    // ---- percussion
    if (on.perc && s.drums && s.kit) {
      const kit = s.kit, d = s.drums, tier = s.adaptive ? p.tier : pass > 0 ? 3 : 1;
      const pats = d.fill && fb % 8 === 7 ? d.fill : tier >= 3 ? d.full : d.light;
      const rootHz = mtof(s.key - 24 + pc(cs[0][0]));
      for (const slot of SLOTS) {
        const pat = pats[slot];
        if (!pat) continue;
        for (let i = 0; i < pat.length; i++) {
          const ch = pat[i];
          if (ch === "." || ch === "-") continue;
          kit[slot](e, p.bus.perc, when(i, pat.length), (ch === "x" ? 1 : ch === "o" ? 0.8 : 0.35) * hum(0.1), rootHz);
        }
      }
      if (tier >= 3 && fb % 8 === 0 && (s.adaptive ? n > 0 : true)) kit.crash(e, p.bus.perc, t0, 0.5, 0);
      // Faster game speed: a few more ghost notes on the offbeats, nothing else.
      if (this.speed > 1 && s.adaptive) for (let i = 1; i < s.beats * 2; i += 2) kit.hi(e, p.bus.perc, t0 + (i * L) / (s.beats * 2), 0.12 * (this.speed - 1), rootHz);
    }

    // ---- a heartbeat under a battle with few lives left
    if (this.heart && s.adaptive && this.level > 0.12) {
      const g = e.gain(0.9); g.connect(p.out);
      I.heart(e, g, t0, 1, 0);
      I.heart(e, g, t0 + L / 2, 0.85, 0);
    }
    if (s.fire && on.pad) for (let i = 0; i < 2; i++) I.crackle(e, p.bus.pad, t0 + Math.random() * L * 0.6, 1.2, 0);

    // ---- lead (the second pass may hand it to another instrument), or the motif hinted on the pulse
    const second = pass % 2 === 1 && !!s.lead2;
    if (on.lead) this.line(s, s.melody[fb], second ? s.lead2! : s.lead, s.key + (second ? s.lead2Oct ?? s.leadOct : s.leadOct), t0, L, p.bus.lead, 1, !!s.trem && !second, 0);
    else if (s.hint && s.adaptive && fb % 8 < 2 && on.pulse) this.line(s, s.melody[fb], s.pulseInst, s.key + s.leadOct, t0, L, p.bus.pulse, 0.55, false, 0);

    // ---- high: chord stabs, or a counter line
    if (on.high && s.high) {
      if (s.stab) {
        const pat = s.stab, st = L / pat.length;
        for (let i = 0; i < pat.length; i++) if (pat[i] === "x") {
          for (const m of voice(chordAt(i / pat.length), s.padCenter + 12)) s.high(e, p.bus.high, when(i, pat.length), mtof(m), st * 1.6, 0.85 * hum());
        }
      } else if (Array.isArray(s.counter)) this.line(s, s.counter[fb], s.high, s.key + (s.highOct ?? 0), t0, L, p.bus.high, 0.85, false, 0);
      else if (typeof s.counter === "number") this.line(s, s.melody[fb], s.high, s.key + (s.highOct ?? 0), t0, L, p.bus.high, 0.8, false, s.counter);
    }
  }

  private line(s: Song, line: string, inst: I.Mel, base: number, t0: number, L: number, out: AudioNode, vel: number, trem: boolean, shift: number) {
    const ts = tokens(line), st = L / ts.length;
    for (let i = 0; i < ts.length; i++) {
      const tk = ts[i];
      if (tk === "-" || tk === ".") continue;
      let len = 1;
      while (ts[i + len] === "-") len++;
      const f = mtof(base + degree(s.mode, tk.d + shift) + tk.acc);
      const sw = s.swing && (ts.length === 8 || ts.length === 16) && i % 2 === 1 ? s.swing * st : 0;
      const t = t0 + i * st + sw + Math.random() * 0.005;
      const v = vel * (i === 0 ? 1 : i % 2 ? 0.84 : 0.93) * hum(0.05);
      if (trem && len >= 3) {
        const sub = st / 2;
        for (let k = 0; k < len * 2; k++) inst(this.e, out, t + k * sub, f, sub * 1.05, v * (k === 0 ? 1 : 0.5 + 0.12 * Math.random()));
      } else inst(this.e, out, t, f, len * st * 0.96, v);
    }
  }

  // ---- stingers -----------------------------------------------------------------------------------------------------

  /** Plays a stinger now, into the music (default) or the effects; answers its length in seconds. */
  stinger(name: Sting, to: "music" | "sfx" = "music", vol = 1): number {
    const e = this.e, t = e.now() + 0.03, { k } = this.key(), f = mtof;
    const out = e.gain(vol * Math.pow(10, STING_DB[name] / 20)), wet = e.gain(0.3);
    out.connect(to === "music" ? e.stingIn : e.sfxIn);
    out.connect(wet).connect(to === "music" ? e.mVerb : e.sVerb);
    const shimmer = (at: number, len: number, v: number) => {
      const hp = e.filt("highpass", 6500), g = e.gain(0);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(v, at + len * 0.4); g.gain.exponentialRampToValueAtTime(1e-4, at + len);
      e.noiseSrc("w", at, at + len + 0.05, hp); hp.connect(g).connect(out);
    };
    let len = 2;
    switch (name) {
      case "wave":
        I.horn(e, out, t, f(k - 5), 0.2, 0.85);
        I.horn(e, out, t + 0.24, f(k), 0.95, 1);
        I.horn(e, out, t + 0.24, f(k + 4), 0.95, 0.6);
        I.timpani(e, out, t + 0.24, 1, f(k));
        I.crash(e, out, t + 0.24, 0.35, 0);
        len = 1.8;
        break;
      case "elite":
        for (const m of [k - 12, k - 9, k - 5]) I.brass(e, out, t, f(m), 1.1, 1);
        I.tubular(e, out, t, f(k - 24), 2.4, 1.2);
        I.taiko(e, out, t, 1, 0);
        len = 2.4;
        break;
      case "boss":
        I.boom(e, out, t, 1, 0);
        I.boom(e, out, t + 0.55, 0.9, 0);
        for (const m of [k - 12, k - 11]) I.brass(e, out, t + 0.55, f(m), 1.6, 1);
        I.choir(e, out, t + 0.3, [k - 12, k - 9, k - 5].map(f), 2.4, 1);
        len = 3.2;
        break;
      case "victory": {
        for (const at of [0, 0.13, 0.26]) I.brass(e, out, t + at, f(k - 5), 0.1, 0.8);
        I.brass(e, out, t + 0.4, f(k), 0.42, 1);
        I.brass(e, out, t + 0.87, f(k + 4), 0.2, 0.9);
        for (const m of [k + 7, k + 4, k]) I.brass(e, out, t + 1.1, f(m), 1.6, m === k + 7 ? 1 : 0.75);
        I.strings(e, out, t + 0.4, [k - 12, k - 8, k - 5, k].map(f), 2.8, 1);
        for (let i = 0; i < 10; i++) I.timpani(e, out, t + i * 0.04, 0.15 + 0.05 * i, f(k - 12));
        I.timpani(e, out, t + 0.4, 1, f(k - 12));
        I.timpani(e, out, t + 1.1, 1, f(k - 12));
        I.crash(e, out, t + 1.1, 0.7, 0);
        [12, 16, 19, 24].forEach((d, i) => I.glock(e, out, t + 1.1 + i * 0.07, f(k + d), 1, 0.8));
        shimmer(t + 0.9, 2.5, 0.03);
        len = 4;
        break;
      }
      case "defeat":
        I.strings(e, out, t, [k - 24, k - 12, k - 9, k - 5].map(f), 3.6, 0.85);
        [3, 2, 0, -2, -4].forEach((d, i) => I.horn(e, out, t + i * 0.55, f(k + d), 0.52, 0.8 - i * 0.05));
        I.horn(e, out, t + 2.75, f(k - 5), 1.5, 0.7);
        I.tubular(e, out, t, f(k - 12), 2, 1);
        I.tubular(e, out, t + 1.65, f(k - 12), 2, 0.8);
        I.boom(e, out, t, 0.6, 0);
        len = 4.6;
        break;
      case "unlock":
        [0, 2, 4, 7, 9, 12, 14, 16, 19, 21].forEach((d, i) => I.harp(e, out, t + i * 0.045, f(k - 12 + d), 1.4, 0.75 + i * 0.02));
        [12, 16, 19, 24].forEach((d, i) => I.glock(e, out, t + 0.5 + i * 0.03, f(k + d), 1.2, 0.9));
        shimmer(t, 1.8, 0.04);
        len = 2.6;
        break;
      case "relic":
        [0, 4, 7, 11, 14, 19].forEach((d, i) => I.celesta(e, out, t + i * 0.085, f(k + d), 1.4, 0.9));
        I.choir(e, out, t, [k - 12, k - 5, k + 4].map(f), 1.8, 0.6);
        shimmer(t + 0.2, 2, 0.035);
        len = 2.6;
        break;
      case "phase":
        I.boom(e, out, t, 1, 0);
        for (const m of [k - 12, k - 11, k - 6]) I.brass(e, out, t, f(m), 1, 1);
        I.choir(e, out, t + 0.1, [k - 12, k - 6].map(f), 1.6, 0.8);
        I.timpani(e, out, t + 0.5, 0.9, f(k - 12));
        len = 2.2;
        break;
    }
    const d = e.duck.gain;
    d.cancelScheduledValues(t);
    d.setTargetAtTime(0.35, t, 0.04);
    d.setTargetAtTime(1, t + len * 0.75, 0.5);
    this.stingUntil = Math.max(this.stingUntil, t + len);
    return len;
  }
}
