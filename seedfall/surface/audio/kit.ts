// The building blocks every recipe in design/audio.md names: noise buffers, impulse responses, envelopes,
// one-shot "shots" with voice limits, persistent voices that sleep when silent, and the small instruments
// (thump, crack, bell, fm, tone, noise burst). Works on any BaseAudioContext, so the offline checks render
// exactly what the game plays.

import { clamp, db, lerp, mtof, mulberry, todb } from "./pure.ts";
export { clamp, db, lerp, mtof, mulberry, todb };

/** Randomness for the sound effects (the music has its own seeded stream). */
export let rnd: () => number = Math.random;
export const setRnd = (f: () => number) => { rnd = f; };
export const range = (a: number, b: number, r = rnd) => a + (b - a) * r();
export const pick = <T>(xs: readonly T[], r = rnd) => xs[Math.floor(r() * xs.length)];

export type NoiseKind = "white" | "pink" | "brown";

/** Voice groups and their caps (section 10). `music` counts source nodes, the rest count sounds. */
export type Group = "chime" | "break" | "impact" | "tell" | "amb" | "ui" | "music" | "fx" | "drill";
export const CAPS: Record<Group, number> = { chime: 8, break: 4, impact: 4, tell: 6, amb: 6, ui: 6, music: 24, fx: 10, drill: 6 };
/** At most this many sources sound at once (section 10); over it, the lowest-ranked group gives a voice up. */
export const MAX_SOURCES = 48;
const RANK: Record<Group, number> = { amb: 0, music: 1, ui: 2, chime: 3, drill: 3, break: 4, fx: 4, impact: 5, tell: 6 };

/** One one-shot sound: its sources, its output strip and its end. */
export interface Shot {
  out: GainNode;
  pan: StereoPannerNode | null;
  srcs: AudioScheduledSourceNode[];
  /** Per source [start, end] when known (tone, nz, fm); otherwise the shot's own. */
  spans: ([number, number] | undefined)[];
  at: number;
  end: number;
  group: Group;
  /** Higher survives stealing (fuses, the nearest tell). */
  prio: number;
}

export interface ToneOpts {
  type?: OscillatorType;
  f: number;
  /** Glide target and its time (ms), exponential. */
  f2?: number;
  glide?: number;
  a?: number;
  d?: number;
  db?: number;
  at?: number;
  /** Low-pass on this tone. */
  lp?: number;
  /** Destination inside the shot (a filter), default the shot's strip. */
  to?: AudioNode;
  /** Sustained instead of a decay: [sustain level, hold seconds, release ms]. */
  hold?: [number, number, number];
}

export interface NoiseOpts {
  kind?: NoiseKind;
  type?: BiquadFilterType;
  f: number;
  f2?: number;
  sweep?: number;
  q?: number;
  a?: number;
  d?: number;
  db?: number;
  at?: number;
  /** A second filter in series (e.g. HP then BP). */
  type2?: BiquadFilterType;
  ff?: number;
  q2?: number;
  to?: AudioNode;
  hold?: [number, number, number];
}

export class Kit {
  readonly noise: Record<NoiseKind, AudioBuffer>;
  readonly live: Record<Group, Shot[]>;
  /** The wreck slow motion: new one-shots play at this frequency and rate factor. */
  slow = 1;
  /** Source nodes started and not yet ended (persistent voices included), and its peak; persistent ones alone. */
  sources = 0;
  peakSources = 0;
  persist = 0;
  /** Sounds stolen per group (the debug overlay and the checks read it). */
  stolen: Partial<Record<Group, number>> = {};
  private curves = new Map<string, Float32Array<ArrayBuffer>>();

  constructor(readonly ctx: BaseAudioContext) {
    this.noise = { white: this.makeNoise("white"), pink: this.makeNoise("pink"), brown: this.makeNoise("brown") };
    this.live = { chime: [], break: [], impact: [], tell: [], amb: [], ui: [], music: [], fx: [], drill: [] };
  }

  get now() { return this.ctx.currentTime; }

  /** Sources sounding now by the schedule: the persistent voices plus one-shot sources whose span covers now. */
  sounding() {
    const now = this.now;
    let n = this.persist;
    for (const g in this.live) for (const x of this.live[g as Group]) x.srcs.forEach((_, i) => { const sp = x.spans[i]; if ((sp ? sp[0] : x.at) <= now && (sp ? sp[1] : x.end) > now) n++; });
    return n;
  }

  private makeNoise(kind: NoiseKind) {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * 2), fade = Math.floor(sr * 0.01);
    const g = new Float32Array(n + fade), r = mulberry(kind === "white" ? 11 : kind === "pink" ? 23 : 37);
    if (kind === "white") for (let i = 0; i < g.length; i++) g[i] = r() * 2 - 1;
    else if (kind === "pink") {
      // Paul Kellet's refined filter.
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < g.length; i++) {
        const w = r() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        g[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < g.length; i++) { last = (last + 0.02 * (r() * 2 - 1)) / 1.02; g[i] = last; }
    }
    // No DC, peak 0.9; the head is crossfaded with the tail's continuation, so the loop seam is continuous.
    let mean = 0, peak = 0;
    for (let i = 0; i < g.length; i++) mean += g[i];
    mean /= g.length;
    for (let i = 0; i < g.length; i++) { g[i] -= mean; peak = Math.max(peak, Math.abs(g[i])); }
    const b = this.ctx.createBuffer(1, n, sr), d = b.getChannelData(0), k = 0.9 / peak;
    for (let i = 0; i < n; i++) d[i] = g[i] * k;
    for (let i = 0; i < fade; i++) { const w = i / fade; d[i] = (g[n + i] * (1 - w) + g[i] * w) * k; }
    return b;
  }

  /** A stereo impulse response: decaying decorrelated noise, low-passed by a one-pole while generating. */
  ir(seconds: number, lpHz = 6000, power = 2.6) {
    const sr = this.ctx.sampleRate, len = Math.floor(sr * seconds);
    const b = this.ctx.createBuffer(2, len, sr);
    const a = Math.exp((-2 * Math.PI * lpHz) / sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c), r = mulberry(101 + c * 977 + Math.round(seconds * 10));
      let y = 0;
      for (let i = 0; i < len; i++) {
        y = (1 - a) * (r() * 2 - 1) + a * y;
        d[i] = y * Math.pow(1 - i / len, power) * 2.2;
      }
    }
    return b;
  }

  /** WaveShaper curves are built once (section 10). */
  curve(kind: "tanh2" | "hard") {
    let c = this.curves.get(kind);
    if (!c) {
      c = new Float32Array(new ArrayBuffer(4096 * 4));
      for (let i = 0; i < 4096; i++) {
        const x = (i / 4095) * 2 - 1;
        c[i] = kind === "tanh2" ? Math.tanh(2 * x) / Math.tanh(2) : clamp(x * 4, -0.6, 0.6);
      }
      this.curves.set(kind, c);
    }
    return c;
  }

  // ---- nodes ----------------------------------------------------------------------------------------------

  gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  filt(type: BiquadFilterType, f: number, q = 0.707) {
    const b = this.ctx.createBiquadFilter();
    b.type = type; b.frequency.value = Math.min(f, this.ctx.sampleRate * 0.45); b.Q.value = q;
    return b;
  }
  panner(p: number) { const s = this.ctx.createStereoPanner(); s.pan.value = clamp(p, -1, 1); return s; }

  /** A source started at `at`, counted while it runs. */
  track(src: AudioScheduledSourceNode) {
    this.sources++;
    this.peakSources = Math.max(this.peakSources, this.sources);
    src.addEventListener("ended", () => { this.sources--; });
    return src;
  }
  /** A persistent voice's source (counted against the global cap, never stolen). */
  trackPersist(src: AudioScheduledSourceNode) {
    this.persist++;
    src.addEventListener("ended", () => { this.persist--; });
    return this.track(src);
  }
  /** One-shot sources sounding at time t (scheduled ones count from their start). */
  private overlapAt(t: number, only?: Group) {
    let n = 0;
    for (const g in this.live) {
      if (only && g !== only) continue;
      for (const x of this.live[g as Group]) n += this.srcsAt(x, t);
    }
    return n;
  }
  private srcsAt(x: Shot, t: number) {
    let n = 0;
    for (let i = 0; i < x.srcs.length; i++) { const sp = x.spans[i]; const a = sp ? sp[0] : x.at, e = sp ? sp[1] : x.end; if (a <= t + 0.05 && e > t) n++; }
    return n;
  }
  osc(type: OscillatorType, f: number) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; return o;
  }
  noiseSrc(kind: NoiseKind, rate = 1) {
    const b = this.ctx.createBufferSource();
    b.buffer = this.noise[kind]; b.loop = true; b.playbackRate.value = rate;
    return b;
  }

  // ---- envelopes (section 9: nothing sets .value on a sounding parameter) -----------------------------------

  /** One-shot env(a, d): linear attack to `peak`, exponential decay to silence. Returns the end time. */
  env(p: AudioParam, at: number, aMs: number, dMs: number, peak = 1, lowFreq = false) {
    const a = Math.max(lowFreq ? 5 : 1, aMs) / 1000, d = Math.max(10, dMs) / 1000;
    p.setValueAtTime(0, at);
    p.linearRampToValueAtTime(peak, at + a);
    p.exponentialRampToValueAtTime(Math.max(1e-7, peak * 1e-4), at + a + d);
    p.linearRampToValueAtTime(0, at + a + d + 0.005);
    return at + a + d + 0.005;
  }
  /**
   * A held envelope: linear attack to `peak`, linear decay to `s x peak`, hold until `hold` s after the start, then an
   * exponential release over `rMs` to -60 dB and a 5 ms linear tail to 0. Every segment starts from the value the
   * curve has at that moment, so a note released mid-attack never jumps. Returns the end time.
   */
  envHold(p: AudioParam, at: number, aMs: number, dMs: number, s: number, hold: number, rMs: number, peak = 1) {
    const a = Math.max(1, aMs) / 1000, d = Math.max(0, dMs) / 1000, r = Math.max(10, rMs) / 1000;
    const rel = at + Math.max(0.002, hold);
    const sus = peak * s;
    p.setValueAtTime(0, at);
    let v: number;
    if (rel <= at + a) { v = (peak * (rel - at)) / a; p.linearRampToValueAtTime(v, rel); }
    else {
      p.linearRampToValueAtTime(peak, at + a);
      if (d > 0 && rel <= at + a + d) { v = peak + ((sus - peak) * (rel - at - a)) / d; p.linearRampToValueAtTime(v, rel); }
      else { v = d > 0 ? sus : peak; if (d > 0) p.linearRampToValueAtTime(sus, at + a + d); p.setValueAtTime(v, rel); }
    }
    if (v > 1e-6) p.exponentialRampToValueAtTime(Math.max(1e-7, v * 1e-3), rel + r);
    else p.linearRampToValueAtTime(0, rel + r);
    p.linearRampToValueAtTime(0, rel + r + 0.005);
    return rel + r + 0.005;
  }
  /** Move a sounding parameter from wherever it is (cancel and hold). */
  ramp(p: AudioParam, v: number, tau: number, at = this.now) {
    hold(p, at);
    p.setTargetAtTime(v, at, Math.max(0.005, tau));
  }

  // ---- shots ------------------------------------------------------------------------------------------------

  /** A one-shot strip: gain (dB) and pan into `dest`. Fill it with tone/nz/thump/bell, then `fin`. */
  shot(group: Group, dest: AudioNode, at: number, gainDb = 0, pan = 0, prio = 0): Shot {
    const out = this.gain(db(gainDb));
    let p: StereoPannerNode | null = null;
    if (Math.abs(pan) > 0.01) { p = this.panner(pan); out.connect(p).connect(dest); } else out.connect(dest);
    return { out, pan: p, srcs: [], spans: [], at: Math.max(at, this.now), end: at, group, prio };
  }

  /**
   * Stops every source 20 ms after its own envelope, frees the strip when the last one ends, and enforces the group
   * cap and then the global one.
   */
  fin(s: Shot) {
    let lastSrc: AudioScheduledSourceNode | null = null, lastStop = -1;
    s.srcs.forEach((src, i) => {
      const stop = (s.spans[i]?.[1] ?? s.end) + 0.02;
      this.track(src); src.stop(stop);
      if (stop > lastStop) { lastStop = stop; lastSrc = src; }
    });
    if (lastSrc) (lastSrc as AudioScheduledSourceNode).addEventListener("ended", () => { s.out.disconnect(); s.pan?.disconnect(); });
    const now = this.now;
    for (const g in this.live) { const l = this.live[g as Group]; for (let i = l.length - 1; i >= 0; i--) if (l[i].end < now) l.splice(i, 1); }
    const list = this.live[s.group];
    list.push(s);
    // Only sounds that overlap this one count (one-shots are scheduled ahead); music counts sources.
    const over = (x: Shot) => x.end > s.at && x.at <= s.at + 0.05;
    const count = () => (s.group === "music" ? this.overlapAt(s.at, "music") : list.reduce((n, x) => n + (over(x) ? 1 : 0), 0));
    while (list.length > 1 && count() > CAPS[s.group]) {
      // Steal the lowest priority, then the one nearest its end (the quietest: usually already releasing).
      let vi = -1;
      for (let i = 0; i < list.length; i++) {
        const x = list[i];
        if (x === s || !over(x)) continue;
        if (vi < 0 || x.prio < list[vi].prio || (x.prio === list[vi].prio && x.end < list[vi].end)) vi = i;
      }
      if (vi < 0 || list[vi].prio > s.prio) break;
      this.steal(list[vi]);
      list.splice(vi, 1);
      this.stolen[s.group] = (this.stolen[s.group] ?? 0) + 1;
    }
    // The global cap, checked at every start inside the shot: steal across groups, the lowest rank first (ambience,
    // then music, ui, ...), never a louder rank than this shot's.
    const starts = new Set<number>([s.at]);
    for (const sp of s.spans) if (sp) starts.add(sp[0]);
    for (const t of starts) this.capAt(s, t);
    return s;
  }

  private capAt(s: Shot, at: number) {
    while (this.persist + this.overlapAt(at) > MAX_SOURCES) {
      let vg: Group | null = null, vi = -1;
      for (const g in this.live) {
        const l = this.live[g as Group];
        for (let i = 0; i < l.length; i++) {
          const x = l[i];
          if (x === s || !this.srcsAt(x, at)) continue;
          const v = vg ? this.live[vg][vi] : null;
          if (!v || RANK[x.group] < RANK[v.group] || (RANK[x.group] === RANK[v.group] && (x.prio < v.prio || (x.prio === v.prio && x.end < v.end)))) { vg = g as Group; vi = i; }
        }
      }
      if (!vg || RANK[vg] > RANK[s.group]) break;
      this.steal(this.live[vg][vi]);
      this.live[vg].splice(vi, 1);
      this.stolen[vg] = (this.stolen[vg] ?? 0) + 1;
    }
  }

  /** A short release (10 ms; 40 ms for music, whose pads are long and loud), then stop. */
  steal(s: Shot) {
    const t = this.now, g = s.out.gain, r = s.group === "music" ? 0.04 : 0.01;
    hold(g, t);
    g.linearRampToValueAtTime(0, t + r);
    for (const src of s.srcs) try { src.stop(t + r + 0.005); } catch { /* not started or stopped */ }
    s.end = Math.min(s.end, t + r);
  }

  private start(s: Shot, src: AudioScheduledSourceNode, at: number, offset?: number, end?: number) {
    if (src instanceof AudioBufferSourceNode) src.start(at, offset ?? 0); else src.start(at);
    s.srcs.push(src);
    s.spans[s.srcs.length - 1] = end === undefined ? undefined : [at, end];
  }

  /** An oscillator with an env into the shot. */
  tone(s: Shot, o: ToneOpts) {
    const at = o.at ?? s.at, f = o.f * this.slow;
    const src = this.osc(o.type ?? "sine", f);
    if (o.f2 !== undefined) {
      src.frequency.setValueAtTime(f, at);
      src.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2 * this.slow), at + (o.glide ?? o.d ?? 100) / 1000);
    }
    const g = this.gain(0);
    let head: AudioNode = src;
    if (o.lp) { const l = this.filt("lowpass", o.lp); src.connect(l); head = l; }
    head.connect(g).connect(o.to ?? s.out);
    const peak = db(o.db ?? 0);
    const end = o.hold
      ? this.envHold(g.gain, at, o.a ?? 2, 0, o.hold[0], o.hold[1], o.hold[2], peak)
      : this.env(g.gain, at, o.a ?? (f < 100 ? 5 : 1), o.d ?? 100, peak, f < 100);
    this.start(s, src, at, undefined, end);
    s.end = Math.max(s.end, end);
    return { src, g, end };
  }

  /** A noise burst through one or two filters, optionally swept. */
  nz(s: Shot, o: NoiseOpts) {
    const at = o.at ?? s.at;
    const src = this.noiseSrc(o.kind ?? "white", this.slow);
    const f1 = this.filt(o.type ?? "bandpass", o.f * this.slow, o.q ?? 1);
    if (o.f2 !== undefined) {
      f1.frequency.setValueAtTime(o.f * this.slow, at);
      f1.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2 * this.slow), at + (o.sweep ?? o.d ?? 100) / 1000);
    }
    let head: AudioNode = f1;
    src.connect(f1);
    if (o.type2) { const f2 = this.filt(o.type2, (o.ff ?? 1000) * this.slow, o.q2 ?? 1); f1.connect(f2); head = f2; }
    const g = this.gain(0);
    head.connect(g).connect(o.to ?? s.out);
    const peak = db(o.db ?? 0);
    const end = o.hold
      ? this.envHold(g.gain, at, o.a ?? 2, 0, o.hold[0], o.hold[1], o.hold[2], peak)
      : this.env(g.gain, at, o.a ?? 1, o.d ?? 100, peak);
    this.start(s, src, at, rnd() * 1.8, end);
    s.end = Math.max(s.end, end);
    return { src, filter: f1, g, end };
  }

  /** thump(f0 to f1, ms): a sine with an exponential pitch drop and env(5, ms). */
  thump(s: Shot, f0: number, f1: number, ms: number, gainDb = 0, at = s.at) {
    return this.tone(s, { f: f0, f2: f1, glide: ms * 0.6, a: 5, d: ms, db: gainDb, at });
  }

  /** The shared crack: white noise high-passed, env(0.5, ms). */
  crack(s: Shot, gainDb = -6, hp = 2000, ms = 8, at = s.at) {
    return this.nz(s, { kind: "white", type: "highpass", f: hp, q: 0.7, a: 0.5, d: ms, db: gainDb, at });
  }

  /** An inharmonic or harmonic bell: partials as [ratio, decay ms, dB]. */
  bell(s: Shot, f: number, partials: [number, number, number][], gainDb = 0, at = s.at) {
    for (const [r, d, g] of partials) if (f * r < this.ctx.sampleRate * 0.45) this.tone(s, { f: f * r, a: 1, d, db: gainDb + g, at });
  }

  /** FM: carrier f, modulator ratio x f, index falling from i0 to i1 over idxMs; env(a, d) or held. */
  fm(s: Shot, f: number, ratio: number, i0: number, i1: number, idxMs: number, a: number, d: number, gainDb = 0, at = s.at, hold?: [number, number, number]) {
    const fc = f * this.slow;
    const car = this.osc("sine", fc), mod = this.osc("sine", fc * ratio), mg = this.gain(0);
    mg.gain.setValueAtTime(i0 * fc * ratio, at);
    mg.gain.exponentialRampToValueAtTime(Math.max(0.01, i1 * fc * ratio), at + idxMs / 1000);
    mod.connect(mg).connect(car.frequency);
    const g = this.gain(0);
    car.connect(g).connect(s.out);
    const peak = db(gainDb);
    const end = hold ? this.envHold(g.gain, at, a, 0, hold[0], hold[1], hold[2], peak) : this.env(g.gain, at, a, d, peak);
    this.start(s, car, at, undefined, end); this.start(s, mod, at, undefined, end);
    s.end = Math.max(s.end, end);
    return end;
  }

  /** Short helper: one shot holding one tone. */
  blip(group: Group, dest: AudioNode, o: ToneOpts & { pan?: number }) {
    const s = this.shot(group, dest, o.at ?? this.now, 0, o.pan ?? 0);
    this.tone(s, o);
    return this.fin(s);
  }
}

/**
 * Freeze a parameter at its current value from `t` on (cancelAndHoldAtTime, with the fallback). An explicit
 * setValueAtTime anchors the next ramp: on a parameter that was never automated, cancelAndHold inserts no event, and a
 * ramp scheduled after it would then start from time 0 (the measured click when voices were stolen).
 */
export function hold(p: AudioParam, t: number) {
  const v = p.value;
  if (typeof p.cancelAndHoldAtTime === "function") p.cancelAndHoldAtTime(t); else p.cancelScheduledValues(t);
  p.setValueAtTime(v, t);
}

/**
 * A persistent voice (section 10): built on demand, its level moved with setTargetAtTime, and torn down after
 * 5 s at zero so silent voices cost nothing.
 */
export class Persist<T extends { srcs: AudioScheduledSourceNode[] }> {
  v: T | null = null;
  out: GainNode | null = null;
  level = 0;
  private zeroAt = 0;
  constructor(private kit: Kit, private dest: AudioNode, private build: (out: GainNode) => T, private sleep = 5) {}

  get on() { return this.v !== null; }

  /** Target level (linear) with time constant tau. Builds the voice when it must sound. */
  set(lin: number, tau = 0.03) {
    const k = this.kit, now = k.now;
    if (lin > 1e-5 && !this.v) {
      this.out = k.gain(0);
      this.out.connect(this.dest);
      this.v = this.build(this.out);
      for (const s of this.v.srcs) k.trackPersist(s);
    }
    if (!this.out) return;
    if (Math.abs(lin - this.level) > 1e-5 || lin === 0) {
      if (lin !== this.level) this.out.gain.setTargetAtTime(lin, now, Math.max(0.005, tau));
      if (lin <= 1e-5 && this.level > 1e-5) this.zeroAt = now;
      this.level = lin <= 1e-5 ? 0 : lin;
    }
    if (this.level === 0 && now - this.zeroAt > Math.max(this.sleep, tau * 8)) this.kill();
  }

  kill() {
    if (!this.v) return;
    const t = this.kit.now;
    for (const s of this.v.srcs) try { s.stop(t + 0.02); } catch { /* stopped */ }
    const out = this.out!;
    setTimeoutSafe(() => out.disconnect(), 100);
    this.v = null; this.out = null; this.level = 0;
  }
}

/** setTimeout when there is one (an offline render may have no timers that matter; disconnecting late is harmless). */
export function setTimeoutSafe(f: () => void, ms: number) {
  if (typeof setTimeout === "function") setTimeout(f, ms); else f();
}

/** Starts sources built inside a Persist voice. */
export function startAll(srcs: AudioScheduledSourceNode[], at: number) {
  for (const s of srcs) {
    if (s instanceof AudioBufferSourceNode) s.start(at, rnd() * 1.8); else s.start(at);
  }
  return srcs;
}

/**
 * JS-scheduled random events for continuous voices: call `due(now, horizon)` each frame; it yields the times
 * of events that fall before the horizon, spaced by `interval()` seconds.
 */
export class Ticker {
  next = -1;
  constructor(public interval: () => number) {}
  *due(now: number, horizon: number) {
    if (this.next < now - 0.5) this.next = now + this.interval() * rnd();
    while (this.next < horizon) { const t = Math.max(this.next, now); yield t; this.next += Math.max(0.005, this.interval()); }
  }
  reset() { this.next = -1; }
}

/** A Poisson interval with the given mean (s). */
export const poisson = (mean: number) => -Math.log(1 - rnd() * 0.999) * mean;
