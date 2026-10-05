// The music's instruments, all synthesised. Melodic ones take a frequency and a
// length; pads take a chord; drums take a velocity (and the chord's root, for
// the tuned ones). Each writes into `out` (a layer bus of the song playing).
import { type Engine, type StringKind } from "./engine.ts";

export type Mel = (e: Engine, out: AudioNode, t: number, f: number, dur: number, vel: number) => void;
export type Pad = (e: Engine, out: AudioNode, t: number, fs: number[], dur: number, vel: number) => void;
export type Drum = (e: Engine, out: AudioNode, t: number, vel: number, root: number) => void;

const rnd = (a: number) => (Math.random() * 2 - 1) * a;

/** Delayed vibrato: none for the first moment of a note, then creeping in (as a player does). */
function vibrato(e: Engine, t: number, end: number, f: number, rate: number, depth: number, delay: number) {
  const g = e.gain(0);
  g.gain.setValueAtTime(0, t);
  g.gain.setValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(f * depth, Math.max(t + delay + 0.01, Math.min(end, t + delay + 0.6)));
  e.osc("sine", rate + rnd(0.3), t, end + 0.4, g);
  return g;
}

// ---- bowed strings ------------------------------------------------------------------------------------------------

function bowed(e: Engine, out: AudioNode, t: number, f: number, dur: number, vel: number,
  o: { body: number; attack: number; level: number; voices: number; spread: number; noise: number; bright: number }) {
  const end = t + dur, g = e.gain(0);
  e.adsr(g.gain, t, o.attack, o.level * vel, 0.3, 0.8, end, 0.18);
  const hp = e.filt("highpass", 160 * o.body);
  const b1 = e.filt("peaking", 470 * o.body, 1.3, 5);
  const lp = e.filt("lowpass", Math.min(12000, (3500 + 3500 * vel) * o.bright), 0.5);
  // The full body (three resonances) for held notes; short ones get one, which is all the ear catches.
  if (dur > 0.3) hp.connect(b1).connect(e.filt("peaking", 1150 * o.body, 1.8, 3)).connect(e.filt("peaking", 2900 * Math.sqrt(o.body), 1.4, 4)).connect(lp);
  else hp.connect(b1).connect(lp);
  lp.connect(g).connect(out);
  // Short notes skip the vibrato and the bow noise: inaudible there, and they are most of the cost.
  const vib = dur > 0.3 ? vibrato(e, t, end, f, 5.5, 0.0065, Math.min(0.18, dur * 0.3)) : null;
  for (let v = 0; v < o.voices; v++) {
    const k = o.voices === 1 ? 0 : (v / (o.voices - 1)) * 2 - 1;
    const os = e.osc("sawtooth", f, t, end + 0.4, hp, k * o.spread + rnd(2));
    os.frequency.setValueAtTime(f * 0.988, t);
    os.frequency.linearRampToValueAtTime(f, t + 0.06);
    vib?.connect(os.frequency);
  }
  if (o.noise > 0 && dur > 0.15) {
    const nb = e.filt("bandpass", Math.min(9000, f * 3), 1.4), ng = e.gain(0);
    e.adsr(ng.gain, t, 0.02, o.noise * vel, 0.12, 0.4, end, 0.1);
    e.noiseSrc("w", t, end + 0.3, nb);
    nb.connect(ng).connect(hp);
  }
}

export const fiddle: Mel = (e, out, t, f, dur, vel) =>
  bowed(e, out, t, f, dur, vel, { body: 1, attack: 0.035, level: 0.13, voices: 2, spread: 5, noise: 0.05, bright: 1 });
export const violins: Mel = (e, out, t, f, dur, vel) =>
  bowed(e, out, t, f, dur, vel, { body: 1, attack: 0.12, level: 0.09, voices: 3, spread: 10, noise: 0.015, bright: 0.85 });
export const cello: Mel = (e, out, t, f, dur, vel) =>
  bowed(e, out, t, f, dur, vel, { body: 0.45, attack: 0.08, level: 0.16, voices: 2, spread: 6, noise: 0.04, bright: 0.55 });
export const bassBow: Mel = (e, out, t, f, dur, vel) =>
  bowed(e, out, t, f, dur, vel, { body: 0.3, attack: 0.09, level: 0.2, voices: 2, spread: 7, noise: 0.02, bright: 0.35 });
/** Short, driven low strings: the citadel's ostinato. */
export const spicc: Mel = (e, out, t, f, dur, vel) =>
  bowed(e, out, t, f, Math.min(dur, 0.12), vel, { body: 0.4, attack: 0.008, level: 0.2, voices: 2, spread: 9, noise: 0, bright: 0.6 });

// ---- winds ---------------------------------------------------------------------------------------------------------

function wind(e: Engine, out: AudioNode, t: number, f: number, dur: number, vel: number,
  o: { breath: number; scoop: number; vib: number; rate: number; level: number; reed: boolean }) {
  const end = t + dur, g = e.gain(0), lp = e.filt("lowpass", o.reed ? f * 5 : 5200, 0.6);
  e.adsr(g.gain, t, 0.05, o.level * vel, 0.2, 0.86, end, 0.1);
  lp.connect(g).connect(out);
  const vib = vibrato(e, t, end, f, o.rate, o.vib, Math.min(0.22, dur * 0.35));
  const main = e.osc(o.reed ? "square" : "sine", f, t, end + 0.3, lp);
  if (o.scoop) { main.frequency.setValueAtTime(f * (1 - o.scoop), t); main.frequency.exponentialRampToValueAtTime(f, t + 0.08); }
  vib.connect(main.frequency);
  const h = e.gain(o.reed ? 0.25 : 0.12);
  const over = e.osc("triangle", f * 2, t, end + 0.3, h);
  vib.connect(over.frequency);
  h.connect(lp);
  // Breath: noise at the note's pitch, and a chiff on the attack.
  const nb = e.filt("bandpass", f, 9), ng = e.gain(0);
  e.adsr(ng.gain, t, 0.03, o.breath * vel, 0.2, 0.6, end, 0.08);
  e.noiseSrc("w", t, end + 0.2, nb); nb.connect(ng).connect(g);
  const cb = e.filt("bandpass", 2600, 1.1), cg = e.gain(0);
  e.hit(cg.gain, t, o.breath * 0.9 * vel, 0.05, 0.004);
  e.noiseSrc("w", t, t + 0.08, cb); cb.connect(cg).connect(out);
}

export const flute: Mel = (e, out, t, f, dur, vel) =>
  wind(e, out, t, f, dur, vel, { breath: 0.06, scoop: 0, vib: 0.005, rate: 5.2, level: 0.15, reed: false });
export const whistle: Mel = (e, out, t, f, dur, vel) =>
  wind(e, out, t, f, dur, vel, { breath: 0.05, scoop: 0.02, vib: 0.006, rate: 6, level: 0.11, reed: false });
export const ney: Mel = (e, out, t, f, dur, vel) =>
  wind(e, out, t, f, dur, vel, { breath: 0.16, scoop: 0.035, vib: 0.008, rate: 4.6, level: 0.14, reed: false });
export const reed: Mel = (e, out, t, f, dur, vel) =>
  wind(e, out, t, f, dur, vel, { breath: 0.03, scoop: 0.01, vib: 0.004, rate: 5, level: 0.07, reed: true });

// ---- brass ---------------------------------------------------------------------------------------------------------

function brassy(e: Engine, out: AudioNode, t: number, f: number, dur: number, vel: number,
  o: { voices: number; bright: number; attack: number; level: number; sub: number }) {
  const end = t + dur, g = e.gain(0), lp = e.filt("lowpass", f, 1.1), hp = e.filt("highpass", 70);
  e.adsr(g.gain, t, o.attack, o.level * vel, 0.35, 0.82, end, 0.16);
  // The brass bloom: the filter opens on the attack, settles, closes on the release (ramps that end).
  const top = Math.min(14000, f * (2.5 + 6 * vel * o.bright)), peakAt = t + o.attack + 0.04, settle = Math.max(peakAt + 0.01, Math.min(end, peakAt + 0.5));
  lp.frequency.setValueAtTime(f * 1.1, t);
  lp.frequency.linearRampToValueAtTime(top, peakAt);
  lp.frequency.exponentialRampToValueAtTime(top * (settle < peakAt + 0.5 ? 0.8 : 0.65), settle);
  lp.frequency.exponentialRampToValueAtTime(f * 1.1, Math.max(end, settle) + 0.15);
  lp.connect(hp).connect(g).connect(out);
  const vib = dur > 0.4 ? vibrato(e, t, end, f, 5, 0.004, 0.3) : null;
  for (let v = 0; v < o.voices; v++) {
    const k = o.voices === 1 ? 0 : (v / (o.voices - 1)) * 2 - 1;
    const os = e.osc("sawtooth", f, t, end + 0.3, lp, k * 9 + rnd(2));
    os.frequency.setValueAtTime(f * 0.975, t);
    os.frequency.exponentialRampToValueAtTime(f, t + 0.07);
    vib?.connect(os.frequency);
  }
  if (o.sub) {
    const sg = e.gain(0);
    e.adsr(sg.gain, t, o.attack * 1.5, o.sub * vel, 0.3, 0.8, end, 0.15);
    e.osc("sine", f, t, end + 0.3, sg); sg.connect(out);
  }
}

export const brass: Mel = (e, out, t, f, dur, vel) => brassy(e, out, t, f, dur, vel, { voices: 3, bright: 1, attack: 0.045, level: 0.085, sub: 0.03 });
/** Short chord stabs: a lighter section. */
export const stabs: Mel = (e, out, t, f, dur, vel) => brassy(e, out, t, f, dur, vel, { voices: 2, bright: 0.9, attack: 0.03, level: 0.1, sub: 0 });
export const horn: Mel = (e, out, t, f, dur, vel) => brassy(e, out, t, f, dur, vel, { voices: 2, bright: 0.42, attack: 0.09, level: 0.15, sub: 0.07 });

// ---- plucked -------------------------------------------------------------------------------------------------------

const BODY: Record<StringKind, (e: Engine) => [AudioNode, AudioNode]> = {
  harp: (e) => { const a = e.filt("lowpass", 5000, 0.5), b = e.filt("peaking", 300, 1, 3); a.connect(b); return [a, b]; },
  lute: (e) => { const a = e.filt("peaking", 420, 1.2, 5), b = e.filt("lowpass", 5200, 0.6); a.connect(b); return [a, b]; },
  oud: (e) => { const a = e.filt("peaking", 240, 1, 6), b = e.filt("peaking", 1500, 2, 4); a.connect(b); return [a, b]; },
  kanun: (e) => { const a = e.filt("highshelf", 3000, 0.7, 4), b = e.filt("peaking", 800, 1.5, 2); a.connect(b); return [a, b]; },
  pizz: (e) => { const a = e.filt("lowpass", 2200, 0.6), b = e.filt("peaking", 350, 1, 4); a.connect(b); return [a, b]; },
  bass: (e) => { const a = e.filt("lowpass", 1100, 0.7), b = e.filt("peaking", 120, 1, 3); a.connect(b); return [a, b]; },
  twang: (e) => { const a = e.filt("peaking", 900, 2, 6); return [a, a]; },
};

export function pluck(kind: StringKind, level: number, ring = 1.6): Mel {
  return (e, out, t, f, dur, vel) => {
    const { buf, rate } = e.string(kind, f);
    const natural = buf.duration / rate, stop = Math.min(natural, Math.max(0.2, dur * ring));
    const g = e.gain(0), [a, b] = BODY[kind](e);
    g.gain.setValueAtTime(level * vel, t);
    e.fade(g.gain, level * vel, t + stop, 0.2);
    b.connect(g).connect(out);
    e.src(buf, t, t + stop + 0.35, a, rate);
  };
}
export const harp = pluck("harp", 0.34, 3);
export const lute = pluck("lute", 0.3);
export const oud = pluck("oud", 0.3);
export const kanun = pluck("kanun", 0.2, 2);
export const pizz = pluck("pizz", 0.42);
export const bassPluck: Mel = (e, out, t, f, dur, vel) => {
  pluck("bass", 0.5, 1)(e, out, t, f, dur, vel);
  const g = e.gain(0);
  e.adsr(g.gain, t, 0.005, 0.22 * vel, 0.25, 0.6, t + dur * 0.9, 0.08);
  e.osc("sine", f, t, t + dur + 0.2, g); g.connect(out);
};
/** The citadel's bass: two saws through a resonant low-pass that snaps open, and a sine under it. */
export const bassSynth: Mel = (e, out, t, f, dur, vel) => {
  const end = t + dur, g = e.gain(0), lp = e.filt("lowpass", 200, 4);
  lp.frequency.setValueAtTime(f * 9, t); lp.frequency.exponentialRampToValueAtTime(f * 2.5, t + Math.min(dur, 0.35));
  e.adsr(g.gain, t, 0.006, 0.14 * vel, 0.2, 0.75, end, 0.06);
  for (const d of [-8, 8]) e.osc("sawtooth", f, t, end + 0.2, lp, d);
  lp.connect(g).connect(out);
  const s = e.gain(0);
  e.adsr(s.gain, t, 0.006, 0.2 * vel, 0.2, 0.85, end, 0.06);
  e.osc("sine", f, t, end + 0.2, s); s.connect(out);
};

// ---- bells ---------------------------------------------------------------------------------------------------------

type Partials = [ratio: number, amp: number, decay: number][];
const BELLS: Record<string, Partials> = {
  glock: [[1, 1, 1.1], [2.76, 0.32, 0.4], [5.4, 0.12, 0.18], [8.93, 0.05, 0.09]],
  celesta: [[1, 1, 1.4], [2, 0.22, 0.5], [3, 0.07, 0.25], [4.1, 0.04, 0.12]],
  tubular: [[1, 1, 3], [2, 0.45, 2.2], [3, 0.3, 1.5], [4.16, 0.25, 1.1], [5.43, 0.14, 0.7], [0.5, 0.12, 2.4]],
  glass: [[1, 1, 2.2], [1.004, 0.6, 2.2], [2.01, 0.25, 1.1], [3, 0.1, 0.6], [4.2, 0.06, 0.3]],
};
export function bell(kind: keyof typeof BELLS, level: number): Mel {
  return (e, out, t, f, dur, vel) => {
    const g = e.gain(level * vel), p = BELLS[kind];
    g.connect(out);
    const len = Math.max(0.4, Math.min(dur * 2.5, 4));
    for (const [r, a, d] of p) {
      const fr = f * r;
      if (fr > 16000) continue;
      const pg = e.gain(0), dd = Math.min(d * (r > 1 ? Math.pow(440 / f, 0.3) : 1), len);
      e.hit(pg.gain, t, a, dd, 0.002);
      e.osc("sine", fr, t, t + dd + 0.05, pg); pg.connect(g);
    }
  };
}
export const glock = bell("glock", 0.11);
export const celesta = bell("celesta", 0.14);
export const tubular = bell("tubular", 0.09);
export const glass = bell("glass", 0.1);

// ---- pads ----------------------------------------------------------------------------------------------------------

export const strings: Pad = (e, out, t, fs, dur, vel) => {
  const end = t + dur, g = e.gain(0), lp = e.filt("lowpass", 2400 + 2600 * vel, 0.5), hp = e.filt("highpass", 140);
  e.adsr(g.gain, t, Math.min(0.6, dur * 0.3), (0.12 / Math.sqrt(fs.length)) * vel, dur * 0.5, 0.9, end, 0.9);
  lp.connect(hp).connect(g).connect(out);
  const lfo = e.gain(7);
  e.osc("sine", 4.8 + rnd(0.4), t, end + 1, lfo);
  for (const f of fs) for (const d of [-10, 0, 9]) lfo.connect(e.osc("sawtooth", f, t, end + 1, lp, d + rnd(3)).detune);
};
export const choir: Pad = (e, out, t, fs, dur, vel) => {
  const end = t + dur, g = e.gain(0);
  e.adsr(g.gain, t, Math.min(0.7, dur * 0.35), (0.5 / Math.sqrt(fs.length)) * vel, dur * 0.5, 0.9, end, 1);
  g.connect(out);
  const lfo = e.gain(9);
  e.osc("sine", 5 + rnd(0.3), t, end + 1.2, lfo);
  for (const f of fs) {
    const src = e.gain(1);
    for (const d of [-7, 6]) lfo.connect(e.osc("sawtooth", f, t, end + 1.2, src, d + rnd(3)).detune);
    // "Ah": three formants in parallel.
    for (const [ff, a, q] of [[700, 1, 7], [1150, 0.55, 9], [2600, 0.22, 12]] as const) {
      const bp = e.filt("bandpass", ff, q), fg = e.gain(a);
      src.connect(bp).connect(fg).connect(g);
    }
  }
};
export const warm: Pad = (e, out, t, fs, dur, vel) => {
  const end = t + dur, g = e.gain(0), lp = e.filt("lowpass", 900 + 500 * vel, 0.6);
  e.adsr(g.gain, t, Math.min(0.9, dur * 0.35), (0.11 / Math.sqrt(fs.length)) * vel, dur * 0.5, 0.9, end, 1.1);
  lp.connect(g).connect(out);
  for (const f of fs) { e.osc("sawtooth", f, t, end + 1.2, lp, -6); e.osc("triangle", f, t, end + 1.2, lp, 5); }
};
/** A tanpura-like drone on the chord's root and fifth, a filter slowly breathing through its overtones. */
export const drone: Pad = (e, out, t, fs, dur, vel) => {
  const end = t + dur, g = e.gain(0), root = Math.min(...fs) / 2;
  e.adsr(g.gain, t, Math.min(1, dur * 0.3), 0.07 * vel, dur, 1, end, 1.2);
  const bp = e.filt("bandpass", root * 4, 2.5), lfo = e.gain(root * 2.5);
  e.osc("sine", 0.23, t, end + 1.3, lfo); lfo.connect(bp.frequency);
  const lp = e.filt("lowpass", 1400);
  for (const f of [root, root * 1.5, root * 2]) for (const d of [-5, 5]) e.osc("sawtooth", f, t, end + 1.3, lp, d);
  lp.connect(bp).connect(g); lp.connect(e.gain(0.35)).connect(g);
  g.connect(out);
};

// ---- drums ---------------------------------------------------------------------------------------------------------

/** A sine that falls in pitch, struck: kick drums, toms, a heart. */
function thump(e: Engine, out: AudioNode, t: number, f0: number, f1: number, fall: number, vol: number, len: number) {
  const g = e.gain(0), o = e.osc("sine", f0, t, t + len + 0.05, g);
  o.frequency.exponentialRampToValueAtTime(f1, t + fall);
  e.hit(g.gain, t, vol, len, 0.003);
  g.connect(out);
}
function burst(e: Engine, out: AudioNode, t: number, type: BiquadFilterType, f: number, q: number, vol: number, len: number, color: "w" | "p" | "b" = "w") {
  const fl = e.filt(type, f, q), g = e.gain(0);
  e.hit(g.gain, t, vol, len, 0.001);
  e.noiseSrc(color, t, t + len + 0.05, fl); fl.connect(g).connect(out);
}

export const bodhran: Drum = (e, out, t, v) => { thump(e, out, t, 118, 62, 0.1, 0.5 * v, 0.3); burst(e, out, t, "bandpass", 900, 1, 0.12 * v, 0.05); };
export const frame: Drum = (e, out, t, v) => { burst(e, out, t, "bandpass", 1800, 0.8, 0.28 * v, 0.13); thump(e, out, t, 260, 180, 0.05, 0.14 * v, 0.08); };
export const shaker: Drum = (e, out, t, v) => {
  const fl = e.filt("highpass", 6500), g = e.gain(0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.014); g.gain.exponentialRampToValueAtTime(0.0002, t + 0.09);
  e.noiseSrc("w", t, t + 0.12, fl); fl.connect(g).connect(out);
};
export const tambourine: Drum = (e, out, t, v) => {
  shaker(e, out, t, v * 0.7, 0);
  for (const f of [7600, 10400]) burst(e, out, t + rnd(0.004) + 0.004, "bandpass", f, 7, 0.22 * v, 0.2);
};
export const doum: Drum = (e, out, t, v) => { thump(e, out, t, 105, 74, 0.08, 0.55 * v, 0.45); burst(e, out, t, "lowpass", 400, 0.7, 0.08 * v, 0.04); };
export const tek: Drum = (e, out, t, v) => { burst(e, out, t, "bandpass", 3400, 1.3, 0.34 * v, 0.05); thump(e, out, t, 950, 720, 0.03, 0.1 * v, 0.04); };
export const riq: Drum = (e, out, t, v) => {
  for (const k of [0, 0.011]) { burst(e, out, t + k, "bandpass", 8200, 4, 0.14 * v, 0.1); burst(e, out, t + k, "highpass", 9500, 0.7, 0.06 * v, 0.06); }
};
export const taiko: Drum = (e, out, t, v) => {
  thump(e, out, t, 82, 46, 0.12, 0.75 * v, 0.7);
  thump(e, out, t, 160, 100, 0.06, 0.18 * v, 0.25);
  burst(e, out, t, "lowpass", 600, 0.7, 0.2 * v, 0.1, "p");
};
export const boom: Drum = (e, out, t, v) => { taiko(e, out, t, v, 0); thump(e, out, t, 52, 30, 0.6, 0.45 * v, 1.3); };
export const timpani: Drum = (e, out, t, v, root) => {
  let f = root; while (f > 120) f /= 2; while (f < 62) f *= 2;
  const g = e.gain(1); g.connect(out);
  for (const [r, a, d] of [[1, 0.5, 1.4], [1.5, 0.18, 0.8], [2, 0.1, 0.6], [2.5, 0.05, 0.4]] as const) {
    const pg = e.gain(0), o = e.osc("sine", f * r * 1.012, t, t + d + 0.05, pg);
    o.frequency.exponentialRampToValueAtTime(f * r, t + 0.12);
    e.hit(pg.gain, t, a * v, d, 0.003); pg.connect(g);
  }
  burst(e, out, t, "lowpass", 900, 0.7, 0.12 * v, 0.04);
};
export const snare: Drum = (e, out, t, v) => {
  burst(e, out, t, "bandpass", 2000, 0.7, 0.32 * v, 0.17);
  burst(e, out, t, "highpass", 5000, 0.7, 0.1 * v, 0.1);
  thump(e, out, t, 210, 165, 0.04, 0.22 * v, 0.08);
};
export const brush: Drum = (e, out, t, v) => {
  const fl = e.filt("bandpass", 3000, 0.6), g = e.gain(0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0002, t + 0.22);
  e.noiseSrc("w", t, t + 0.25, fl); fl.connect(g).connect(out);
};
export const softKick: Drum = (e, out, t, v) => thump(e, out, t, 95, 52, 0.08, 0.45 * v, 0.3);
export const hat: Drum = (e, out, t, v) => {
  const bp = e.filt("bandpass", 9500, 1.4), hp = e.filt("highpass", 7000), g = e.gain(0);
  e.hit(g.gain, t, 0.2 * v, 0.045);
  e.noiseSrc("w", t, t + 0.07, bp);
  bp.connect(hp).connect(g).connect(out);
};
export const crash: Drum = (e, out, t, v) => {
  burst(e, out, t, "highpass", 4800, 0.7, 0.16 * v, 1.9);
  burst(e, out, t, "bandpass", 8800, 2, 0.06 * v, 1.2);
};
export const iceTick: Drum = (e, out, t, v) => {
  const g = e.gain(0); e.hit(g.gain, t, 0.06 * v, 0.06);
  e.osc("sine", 3150 + rnd(80), t, t + 0.08, g); g.connect(out);
  burst(e, out, t, "highpass", 8500, 0.7, 0.04 * v, 0.03);
};
export const rim: Drum = (e, out, t, v) => { thump(e, out, t, 1150, 1000, 0.02, 0.16 * v, 0.05); burst(e, out, t, "bandpass", 2100, 4, 0.1 * v, 0.03); };
export const anvil: Drum = (e, out, t, v) => {
  const g = e.gain(v * 0.1); g.connect(out);
  for (const [r, a, d] of [[1, 1, 0.5], [2.76, 0.6, 0.3], [5.4, 0.35, 0.15]] as const) {
    const pg = e.gain(0); e.hit(pg.gain, t, a, d); e.osc("sine", 1250 * r, t, t + d + 0.05, pg); pg.connect(g);
  }
};
export const heart: Drum = (e, out, t, v) => {
  const lp = e.filt("lowpass", 180); lp.connect(out);
  thump(e, lp, t, 70, 42, 0.08, 0.7 * v, 0.2);
  thump(e, lp, t + 0.2, 64, 40, 0.08, 0.5 * v, 0.2);
};
export const crackle: Drum = (e, out, t, v) => {
  for (let i = 0; i < 6; i++) if (Math.random() < 0.7) burst(e, out, t + Math.random() * 0.9, "bandpass", 1800 + Math.random() * 3000, 2, 0.06 * v * Math.random(), 0.012);
};
