// The audio graph every sound plays through, built on any BaseAudioContext so
// the page's live context and an OfflineAudioContext (the measuring harness)
// run the exact same code.
//
//   songs -> musicIn -> duck (stingers) -> muffle (pause) -> musicVol -+
//   stingers -> stingIn, music reverb + ping-pong delay ----^           |
//   voices -> pan -> sfxIn -> sfxVol ------------------------------------+-> mix -> master -> comp -> clip -> out
//                 sfx reverb send ----------------^
//
// The compressor is set as a gentle limiter; the wave shaper after it is a
// soft clipper whose curve never exceeds 0.89 (-1 dBFS), so nothing clips.

export interface Voice {
  out: GainNode;
  srcs: AudioScheduledSourceNode[];
  start: number;
  end: number;
  pri: number;
  name: string;
}

/** Karplus-Strong plucked-string flavours: decay (s to -60 dB at A3), brightness, pick position. */
export const STRINGS = {
  harp: { decay: 3.2, bright: 0.32, pick: 0.28 },
  lute: { decay: 1.6, bright: 0.55, pick: 0.18 },
  oud: { decay: 1.4, bright: 0.78, pick: 0.12 },
  kanun: { decay: 1.9, bright: 0.92, pick: 0.22 },
  pizz: { decay: 0.55, bright: 0.28, pick: 0.3 },
  bass: { decay: 1.8, bright: 0.3, pick: 0.25 },
  twang: { decay: 0.7, bright: 0.85, pick: 0.08 },
} as const;
export type StringKind = keyof typeof STRINGS;

const ksCache = new Map<string, { buf: AudioBuffer; f: number }>();

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Engine {
  readonly ctx: BaseAudioContext;
  /** A manual clock for offline rendering; null = the context's own. */
  clock: number | null = null;
  readonly master: GainNode;
  readonly musicVol: GainNode;
  readonly sfxVol: GainNode;
  readonly musicIn: GainNode;
  /** Stingers: past the ducking, still under the pause muffle and the music volume. */
  readonly stingIn: GainNode;
  readonly duck: GainNode;
  readonly muffle: BiquadFilterNode;
  readonly sfxIn: GainNode;
  readonly mVerb: GainNode;
  readonly sVerb: GainNode;
  readonly mDelay: GainNode;
  private delays: DelayNode[] = [];
  readonly white: AudioBuffer;
  readonly pink: AudioBuffer;
  readonly brown: AudioBuffer;
  /** Sources created while a voice is being built are collected here, so a stolen voice can stop them. */
  sink: AudioScheduledSourceNode[] | null = null;
  voices: Voice[] = [];
  peakVoices = 0;

  constructor(ctx: BaseAudioContext, opts: { dry?: boolean } = {}) {
    this.ctx = ctx;
    const g = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    this.master = g(1);
    const mix = g(1);
    mix.connect(this.master);
    if (opts.dry) this.master.connect(ctx.destination);
    else {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.2;
      const clip = ctx.createWaveShaper();
      const n = 2048, curve = new Float32Array(n), knee = 0.62, room = 0.89 - knee;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
        curve[i] = Math.sign(x) * (a < knee ? a : knee + room * Math.tanh((a - knee) / room));
      }
      clip.curve = curve; clip.oversample = "2x";
      this.master.connect(comp).connect(clip).connect(ctx.destination);
    }

    this.musicVol = g(0.7); this.musicVol.connect(mix);
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = "lowpass"; this.muffle.frequency.value = 20000; this.muffle.Q.value = 0.6;
    // A little air on the music (a gentle high shelf), as a mastering engineer would add.
    const air = this.filt("highshelf", 8500, 0.7, 3);
    this.muffle.connect(air).connect(this.musicVol);
    this.duck = g(1); this.duck.connect(this.muffle);
    this.musicIn = g(1); this.musicIn.connect(this.duck);
    this.stingIn = g(1); this.stingIn.connect(this.muffle);
    this.sfxVol = g(0.9); this.sfxVol.connect(mix);
    this.sfxIn = g(1); this.sfxIn.connect(this.sfxVol);

    this.white = this.noise(2, 2, "w");
    this.pink = this.noise(1, 3, "p");
    this.brown = this.noise(1, 3, "b");

    // Reverbs: decorrelated noise tails, darkening as they decay (air absorption).
    const mv = ctx.createConvolver(); mv.buffer = this.ir(3.2, 2.4, 0.012);
    const mhp = this.filt("highpass", 180);
    this.mVerb = g(1); this.mVerb.connect(mhp).connect(mv).connect(this.muffle);
    const sv = ctx.createConvolver(); sv.buffer = this.ir(1.6, 3.2, 0.006);
    const shp = this.filt("highpass", 250);
    this.sVerb = g(1); this.sVerb.connect(shp).connect(sv).connect(this.sfxVol);

    // Ping-pong delay for leads and plucks, tempo-synced by the music.
    this.mDelay = g(1);
    const [l, r] = [ctx.createDelay(2), ctx.createDelay(2)];
    const lp = this.filt("lowpass", 3200), merge = ctx.createChannelMerger(2);
    this.mDelay.connect(lp).connect(l);
    l.connect(g(0.38)).connect(r); r.connect(g(0.38)).connect(l);
    l.connect(merge, 0, 0); r.connect(merge, 0, 1);
    merge.connect(this.muffle);
    this.delays = [l, r];
    this.setDelay(0.34);
  }

  now() { return this.clock ?? this.ctx.currentTime; }

  setDelay(seconds: number) {
    const t = this.now();
    for (const d of this.delays) d.delayTime.setTargetAtTime(Math.min(1.9, seconds), t, 0.05);
  }

  // ---- buffers ------------------------------------------------------------------------------------------------------

  private noise(channels: number, seconds: number, color: "w" | "p" | "b") {
    const ctx = this.ctx, b = ctx.createBuffer(channels, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    for (let c = 0; c < channels; c++) {
      const d = b.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (color === "w") d[i] = w;
        else if (color === "p") {
          // Paul Kellet's pink filter.
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      }
      // Crossfade the loop seam so a looping noise never clicks.
      const f = Math.min(2000, d.length >> 3);
      for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[d.length - f + i] * (1 - k); }
    }
    return b;
  }

  private ir(seconds: number, decay: number, pre: number) {
    const ctx = this.ctx, sr = ctx.sampleRate, len = Math.floor(sr * seconds), b = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let y = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        // The tail darkens: a one-pole low-pass that closes as time goes on.
        const a = 0.9 * Math.exp(-t * 0.9) + 0.12;
        y += a * ((Math.random() * 2 - 1) - y);
        const env = t < pre ? t / pre : Math.exp(-(t - pre) * decay);
        d[i] = y * env;
      }
    }
    return b;
  }

  /** A plucked-string note (Karplus-Strong, rendered once per pitch and cached), tuned exactly by playback rate. */
  string(kind: StringKind, f: number): { buf: AudioBuffer; rate: number } {
    const sr = this.ctx.sampleRate, midi = Math.round(69 + 12 * Math.log2(f / 440));
    const key = `${kind}:${midi}:${sr}`;
    let hit = ksCache.get(key);
    if (!hit) {
      const p = STRINGS[kind], fm = mtof(midi);
      // Higher strings ring shorter, as real ones do.
      const decay = p.decay * Math.pow(220 / fm, 0.35);
      const len = Math.min(4, decay * 1.1 + 0.05);
      const P = sr / fm, N = Math.max(2, Math.floor(P - 0.5)), fGen = sr / (N + 0.5);
      const n = Math.floor(len * sr), out = new Float32Array(n), ring = new Float32Array(N), ex = new Float32Array(N);
      let y = 0;
      const a = 0.12 + 0.88 * p.bright;
      for (let i = 0; i < N; i++) { y += a * ((Math.random() * 2 - 1) - y); ex[i] = y; }
      const d = Math.max(1, Math.round(p.pick * N));
      let mean = 0;
      for (let i = 0; i < N; i++) { ring[i] = ex[i] - 0.9 * ex[(i + d) % N]; mean += ring[i]; }
      mean /= N;
      let pk = 0;
      for (let i = 0; i < N; i++) { ring[i] -= mean; pk = Math.max(pk, Math.abs(ring[i])); }
      for (let i = 0; i < N; i++) ring[i] /= pk || 1;
      const loss = Math.pow(10, -3 / (decay * fGen));
      let idx = 0;
      for (let i = 0; i < n; i++) {
        const cur = ring[idx], nx = idx + 1 === N ? 0 : idx + 1;
        out[i] = cur;
        ring[idx] = loss * 0.5 * (cur + ring[nx]);
        idx = nx;
      }
      // Fade the last 30 ms so a buffer that ends early never clicks.
      const fl = Math.min(n, Math.floor(sr * 0.03));
      for (let i = 0; i < fl; i++) out[n - 1 - i] *= i / fl;
      const buf = this.ctx.createBuffer(1, n, sr);
      buf.getChannelData(0).set(out);
      hit = { buf, f: fGen };
      ksCache.set(key, hit);
    }
    return { buf: hit.buf, rate: f / hit.f };
  }

  // ---- node helpers -------------------------------------------------------------------------------------------------

  gain(v = 1) { const n = this.ctx.createGain(); n.gain.value = v; return n; }
  filt(type: BiquadFilterType, f: number, q = 0.7, db = 0) {
    const n = this.ctx.createBiquadFilter();
    n.type = type; n.frequency.value = f; n.Q.value = q; n.gain.value = db;
    return n;
  }
  pan(p: number) { const n = this.ctx.createStereoPanner(); n.pan.value = Math.max(-1, Math.min(1, p)); return n; }

  private keep<T extends AudioScheduledSourceNode>(n: T) { this.sink?.push(n); return n; }

  osc(type: OscillatorType, f: number, t: number, end: number, out: AudioNode, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(Math.max(1, f), t); o.detune.value = detune;
    o.connect(out); o.start(t); o.stop(end);
    return this.keep(o);
  }
  src(buf: AudioBuffer, t: number, end: number, out: AudioNode, rate = 1, loop = false, offset = 0) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.loop = loop; s.playbackRate.value = rate;
    s.connect(out); s.start(t, offset); s.stop(end);
    return this.keep(s);
  }
  /** Looping noise of a colour from a random offset. */
  noiseSrc(color: "w" | "p" | "b", t: number, end: number, out: AudioNode, rate = 1) {
    const b = color === "w" ? this.white : color === "p" ? this.pink : this.brown;
    return this.src(b, t, end, out, rate, true, Math.random() * (b.duration - 0.1));
  }

  /** Attack, decay to sustain, release from `end`. Every segment is a ramp that ends: an open-ended
   *  setTargetAtTime keeps Chromium computing the param per sample for the note's whole life. */
  adsr(p: AudioParam, t: number, a: number, peak: number, d: number, sus: number, end: number, r: number) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    let hold = peak;
    const dEnd = Math.min(end, t + a + d);
    if (dEnd > t + a + 0.001) {
      hold = peak * (1 - (1 - sus) * ((dEnd - t - a) / d));
      p.linearRampToValueAtTime(hold, dEnd);
    }
    const rs = Math.max(end, t + a, dEnd);
    p.setValueAtTime(Math.max(1e-4, hold), rs);
    p.exponentialRampToValueAtTime(1e-4, rs + Math.max(0.02, r));
    p.setValueAtTime(0, rs + Math.max(0.02, r) + 0.001);
  }
  /** Holds a param until `t`, then fades it to silence over `len`. */
  fade(p: AudioParam, from: number, t: number, len: number) {
    p.setValueAtTime(from, t);
    p.linearRampToValueAtTime(0, t + len);
  }
  /** A quick attack and an exponential fall to silence over `len`. */
  hit(p: AudioParam, t: number, peak: number, len: number, a = 0.002) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.exponentialRampToValueAtTime(Math.max(1e-5, peak * 0.001), t + a + len);
    p.setValueAtTime(0, t + a + len + 0.001);
  }

  // ---- voices -------------------------------------------------------------------------------------------------------

  live(now = this.now()) {
    if (this.voices.length) this.voices = this.voices.filter((v) => v.end > now);
    return this.voices;
  }
  /** Fades a voice out in a few milliseconds and stops its sources. */
  kill(v: Voice, now = this.now()) {
    const g = v.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 0.012);
    for (const s of v.srcs) try { s.stop(now + 0.02); } catch { /* already stopped */ }
    v.end = now;
    this.voices = this.voices.filter((x) => x !== v);
  }
}
