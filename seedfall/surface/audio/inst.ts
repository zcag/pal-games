// The instruments (design/audio.md section 8.2), shared by the music, the fanfares and the UI stings.
// Each adds its sources to a Shot (kit.ts) and extends its end; the caller creates and finishes the shot.
import { Kit, db, rnd, type Shot } from "./kit.ts";
import type { Perc } from "./score.ts";

/** Pad: 3 saws at -7, 0, +7 cents through LP(cutoff, 0.8), env(600, 0, 1, 1800). `voices` 2 drops the centre one. */
export function pad(k: Kit, s: Shot, f: number, at: number, dur: number, cutoff: number, gainDb = 0, voices = 3, cutoffEnd?: number) {
  const lp = k.filt("lowpass", cutoff, 0.8);
  if (cutoffEnd) { lp.frequency.setValueAtTime(cutoff, at); lp.frequency.linearRampToValueAtTime(cutoffEnd, at + dur); }
  const g = k.gain(0);
  lp.connect(g).connect(s.out);
  const det = voices >= 3 ? [-7, 0, 7] : [-7, 7];
  for (const c of det) {
    const o = k.osc("sawtooth", f * k.slow);
    o.detune.value = c;
    const og = k.gain(0.33);
    o.connect(og).connect(lp);
    o.start(at); s.srcs.push(o);
  }
  s.end = Math.max(s.end, k.envHold(g.gain, at, 600, 0, 1, dur, 1800, db(gainDb)));
}

/** Choir pad: sines at f..4f with 5 Hz vibrato of 6 cents through two formants, env(900, 0, 1, 2200). */
export function choir(k: Kit, s: Shot, f: number, at: number, dur: number, gainDb = 0, a = 900, r = 2200) {
  const g = k.gain(0), f1 = k.filt("bandpass", 800, 1), f2 = k.filt("bandpass", 1200, 1), dry = k.gain(0.5);
  const sum = k.gain(1);
  sum.connect(f1).connect(g); sum.connect(f2).connect(g); sum.connect(dry).connect(g);
  g.connect(s.out);
  const vib = k.osc("sine", 5), vg = k.gain(6);
  vib.connect(vg);
  [0, -8, -14, -20].forEach((d, i) => {
    if (f * (i + 1) > 12000) return;
    const o = k.osc("sine", f * (i + 1) * k.slow), og = k.gain(db(d) * 0.5);
    vg.connect(o.detune);
    o.connect(og).connect(sum);
    o.start(at); s.srcs.push(o);
  });
  vib.start(at); s.srcs.push(vib);
  s.end = Math.max(s.end, k.envHold(g.gain, at, a, 0, 1, dur, r, db(gainDb)));
}

/** Reed organ: square + sine 2f through LP(900), env(80, 0, 1, 400). */
export function organ(k: Kit, s: Shot, f: number, at: number, dur: number, gainDb = 0) {
  const lp = k.filt("lowpass", 900, 0.7), g = k.gain(0);
  lp.connect(g).connect(s.out);
  const a = k.osc("square", f * k.slow), b = k.osc("sine", 2 * f * k.slow), ag = k.gain(0.3), bg = k.gain(0.4);
  a.connect(ag).connect(lp); b.connect(bg).connect(lp);
  a.start(at); b.start(at); s.srcs.push(a, b);
  s.end = Math.max(s.end, k.envHold(g.gain, at, 80, 0, 1, dur, 400, db(gainDb)));
}

/** Fungal's detuned "PWM" pad: two squares a few cents apart (their beating is the pulse-width wobble). */
export function pwm(k: Kit, s: Shot, f: number, at: number, dur: number, cutoff: number, gainDb = 0) {
  const lp = k.filt("lowpass", cutoff, 0.9), g = k.gain(0);
  lp.connect(g).connect(s.out);
  for (const c of [-9, 9]) {
    const o = k.osc("square", f * k.slow), og = k.gain(0.28);
    o.detune.value = c;
    o.connect(og).connect(lp);
    o.start(at); s.srcs.push(o);
  }
  s.end = Math.max(s.end, k.envHold(g.gain, at, 500, 0, 1, dur, 1500, db(gainDb)));
}

/** Magma's overdriven low saw pad. */
export function drivePad(k: Kit, s: Shot, f: number, at: number, dur: number, cutoff: number, gainDb = 0) {
  const sh = k.ctx.createWaveShaper(); sh.curve = k.curve("tanh2");
  const lp = k.filt("lowpass", cutoff, 0.8), g = k.gain(0), pre = k.gain(0.7);
  pre.connect(sh).connect(lp).connect(g).connect(s.out);
  for (const c of [-8, 8]) {
    const o = k.osc("sawtooth", f * k.slow); o.detune.value = c;
    o.connect(pre); o.start(at); s.srcs.push(o);
  }
  s.end = Math.max(s.end, k.envHold(g.gain, at, 500, 0, 1, dur, 1400, db(gainDb - 3)));
}

/** Pluck: triangle + saw (-12 dB) through an LP closing 4000 to 600 Hz over 200 ms, env(2, 400). */
export function pluck(k: Kit, s: Shot, f: number, at: number, gainDb = 0, d = 400) {
  const lp = k.filt("lowpass", 4000, 0.8), g = k.gain(0);
  lp.frequency.setValueAtTime(4000, at);
  lp.frequency.exponentialRampToValueAtTime(600, at + 0.2);
  lp.connect(g).connect(s.out);
  const a = k.osc("triangle", f * k.slow), b = k.osc("sawtooth", f * k.slow), bg = k.gain(db(-12));
  a.connect(lp); b.connect(bg).connect(lp);
  a.start(at); b.start(at); s.srcs.push(a, b);
  s.end = Math.max(s.end, k.env(g.gain, at, 2, d, db(gainDb)));
}

/** Marimba: sine f with a 4f strike (env(1, 60), -10 dB), main env(2, 350). */
export function marimba(k: Kit, s: Shot, f: number, at: number, gainDb = 0, d = 350) {
  k.tone(s, { f, a: 2, d, db: gainDb, at });
  if (f * 4 < 16000) k.tone(s, { f: f * 4, a: 1, d: 60, db: gainDb - 10, at });
}

/** FM bell: modulator 2f (glass: 3.5f), index 2 falling to 0.3 over 500 ms, env(2, 1200). */
export function bell(k: Kit, s: Shot, f: number, at: number, gainDb = 0, glass = false, d = 1200) {
  return k.fm(s, f, glass ? 3.5 : 2, 2, 0.3, 500, 2, d, gainDb, at);
}

/** Bass: sine + triangle (-6 dB) through LP(400), env(5, 300, 0.6, 150). */
export function bass(k: Kit, s: Shot, f: number, at: number, dur: number, gainDb = 0) {
  const lp = k.filt("lowpass", 400, 0.7), g = k.gain(0);
  lp.connect(g).connect(s.out);
  const a = k.osc("sine", f * k.slow), b = k.osc("triangle", f * k.slow), bg = k.gain(db(-6));
  a.connect(lp); b.connect(bg).connect(lp);
  a.start(at); b.start(at); s.srcs.push(a, b);
  s.end = Math.max(s.end, k.envHold(g.gain, at, 5, 300, 0.6, dur, 150, db(gainDb)));
}

/** Magma bass: saw through tanh x2, LP enveloped 300 to 900 Hz. */
export function driveBass(k: Kit, s: Shot, f: number, at: number, dur: number, gainDb = 0) {
  const sh = k.ctx.createWaveShaper(); sh.curve = k.curve("tanh2");
  const lp = k.filt("lowpass", 300, 1.2), g = k.gain(0);
  lp.frequency.setValueAtTime(300, at);
  lp.frequency.linearRampToValueAtTime(900, at + 0.03);
  lp.frequency.setTargetAtTime(300, at + 0.03, 0.08);
  const o = k.osc("sawtooth", f * k.slow);
  o.connect(sh).connect(lp).connect(g).connect(s.out);
  o.start(at); s.srcs.push(o);
  s.end = Math.max(s.end, k.envHold(g.gain, at, 5, 200, 0.7, dur, 120, db(gainDb - 4)));
}

/** Fungal bloop bass: LP env 1200 to 200 Hz over 150 ms, pitch dropping a semitone in 40 ms. */
export function bloop(k: Kit, s: Shot, f: number, at: number, dur: number, gainDb = 0) {
  const lp = k.filt("lowpass", 1200, 4), g = k.gain(0);
  lp.frequency.setValueAtTime(1200, at);
  lp.frequency.exponentialRampToValueAtTime(200, at + 0.15);
  const o = k.osc("triangle", f * k.slow * Math.pow(2, 1 / 12));
  o.frequency.setValueAtTime(f * k.slow * Math.pow(2, 1 / 12), at);
  o.frequency.exponentialRampToValueAtTime(f * k.slow, at + 0.04);
  const sub = k.osc("sine", f * k.slow);
  o.connect(lp).connect(g); sub.connect(g);
  g.connect(s.out);
  o.start(at); sub.start(at); s.srcs.push(o, sub);
  s.end = Math.max(s.end, k.envHold(g.gain, at, 5, 150, 0.5, Math.min(dur, 0.4), 120, db(gainDb)));
}

/** Lead: triangle or sine (whistle), 5.5 Hz vibrato fading in after 300 ms, 40 ms portamento from `from`. Brass: saw through an LP env 600 - 2400 - 1200. */
export function lead(k: Kit, s: Shot, kind: "whistle" | "triangle" | "brass" | "hum", f: number, at: number, dur: number, gainDb = 0, from = 0) {
  const o = k.osc(kind === "brass" ? "sawtooth" : kind === "triangle" ? "triangle" : "sine", f * k.slow);
  if (from > 0) { o.frequency.setValueAtTime(from * k.slow, at); o.frequency.exponentialRampToValueAtTime(f * k.slow, at + 0.04); }
  const vib = k.osc("sine", 5.5), vg = k.gain(0);
  vg.gain.setValueAtTime(0, at); vg.gain.setValueAtTime(0, at + 0.3); vg.gain.linearRampToValueAtTime(kind === "whistle" ? 18 : 12, at + 0.6);
  vib.connect(vg).connect(o.detune);
  const g = k.gain(0);
  let head: AudioNode = o;
  if (kind === "brass") {
    const lp = k.filt("lowpass", 600, 2);
    lp.frequency.setValueAtTime(600, at);
    lp.frequency.linearRampToValueAtTime(2400, at + 0.08);
    lp.frequency.setTargetAtTime(1200, at + 0.08, 0.1);
    o.connect(lp); head = lp;
  } else if (kind === "hum") {
    // A hummed lead: a sine with a soft vowel formant.
    const bp = k.filt("bandpass", 500, 1.2), t = k.osc("triangle", f * k.slow), tg = k.gain(0.5);
    t.connect(tg).connect(bp);
    vg.connect(t.detune);
    const mix = k.gain(1); o.connect(mix); bp.connect(mix); head = mix;
    t.start(at); s.srcs.push(t);
  }
  head.connect(g).connect(s.out);
  o.start(at); vib.start(at); s.srcs.push(o, vib);
  s.end = Math.max(s.end, k.envHold(g.gain, at, kind === "brass" ? 20 : 30, 100, 0.8, dur, 150, db(gainDb)));
}

/** Percussion (section 8.2). */
export function perc(k: Kit, s: Shot, kind: Perc, at: number, gainDb = 0, accent = false) {
  const a = accent ? 3 : 0;
  switch (kind) {
    case "kick": case "heart": k.tone(s, { f: 120, f2: 45, glide: 60, a: 1, d: 250, db: gainDb + a, at }); break;
    case "tom": { const f0 = [160, 110][Math.floor(rnd() * 2)]; k.thump(s, f0, f0 * 0.6, 220, gainDb - 2 + a, at); k.nz(s, { kind: "pink", f: 300, q: 1, a: 1, d: 40, db: gainDb - 8, at }); break; }
    case "taiko": k.thump(s, 70, 45, 400, gainDb + a, at); k.nz(s, { kind: "pink", f: 300, q: 1, a: 1, d: 40, db: gainDb - 6, at }); break;
    case "shaker": k.nz(s, { kind: "white", type: "highpass", f: 6000, q: 0.7, a: 8, d: 50, db: gainDb - 6 + a, at }); break;
    case "brush": k.nz(s, { kind: "pink", f: 3000, q: 0.6, a: 40, d: 120, db: gainDb - 4 + a, at }); break;
    case "wood": case "click":
      k.tone(s, { f: kind === "wood" ? 1100 : 1700, a: 0.5, d: 25, db: gainDb - 4, at });
      k.nz(s, { kind: "white", f: kind === "wood" ? 1100 : 1700, q: 8, a: 0.5, d: 10, db: gainDb - 2, at });
      break;
    case "drip": k.tone(s, { f: 900, f2: 1600, glide: 15, a: 1, d: 60, db: gainDb - 4, at }); break;
    case "tick": k.tone(s, { f: 1900, a: 0.5, d: 18, db: gainDb - 6, at }); break;
    case "anvil": k.bell(s, 1240, [[1, 260, 0], [2.76, 160, -6], [5.4, 90, -12]], gainDb - 8, at); break;
  }
}

/** The tension clock: a muted click, HP(5000), env(0.5, 4). */
export function clockClick(k: Kit, s: Shot, at: number, gainDb: number) {
  k.nz(s, { kind: "white", type: "highpass", f: 5000, q: 0.7, a: 0.5, d: 4, db: gainDb, at });
}
