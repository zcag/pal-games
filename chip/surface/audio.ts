// Every sound is made here with WebAudio, nothing recorded: the club (a
// click and a thump, sharper and louder with the power), a bounce per
// surface (a thud on grass, a click on rock, a puff in sand), the splash,
// the cup's rattle and a few notes for a good score, the tick at the top of
// the power meter, and a faint wind under it all.
import type { Surface } from "../game/hole.ts";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wind: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
let volume = 0.7;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  if (volume <= 0) return null;
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return null; }
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
  if (volume <= 0) stopWind();
}

/** A burst of noise through a filter, shaped by an attack and a decay. */
function noise(at: number, dur: number, gain: number, type: BiquadFilterType, freq: number, q = 1, sweepTo?: number) {
  const c = ctx!, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuf;
  f.type = type;
  f.frequency.setValueAtTime(freq, at);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
  f.Q.value = q;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at, Math.random() * 1.5);
  src.stop(at + dur + 0.02);
}

/** A sine (or other) blip with a pitch drop. */
function tone(at: number, dur: number, gain: number, freq: number, to = freq, type: OscillatorType = "sine") {
  const c = ctx!, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to !== freq) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.02);
}

export const sound = {
  /** The club on the ball: a putt is a soft tock, a drive a crack with a thump under it. */
  hit(power: number) {
    const c = ac(); if (!c) return;
    const t = c.currentTime, p = Math.max(0.05, power);
    noise(t, 0.03 + 0.04 * p, 0.25 + 0.5 * p, "highpass", 1800 + 2500 * p, 0.7);
    tone(t, 0.07 + 0.05 * p, 0.25 + 0.35 * p, 700 + 900 * p, 400 + 300 * p, "triangle");
    if (p > 0.45) tone(t, 0.16, 0.5 * p, 140, 60);
    if (p > 0.8) noise(t + 0.01, 0.5, 0.06 * p, "bandpass", 900, 0.6, 300); // the air it pushes
  },
  bounce(surface: Surface, speed: number) {
    const c = ac(); if (!c) return;
    const t = c.currentTime, v = Math.min(1, speed / 18);
    if (v < 0.03) return;
    switch (surface) {
      case "rock":
        tone(t, 0.05, 0.35 * v + 0.05, 1900 + 500 * Math.random(), 1200, "triangle");
        noise(t, 0.04, 0.3 * v, "highpass", 3000);
        break;
      case "sand":
        noise(t, 0.18 + 0.1 * v, 0.35 * v + 0.05, "bandpass", 700, 0.8, 300);
        break;
      default: {
        const soft = surface === "rough" ? 0.7 : 1;
        tone(t, 0.09, (0.45 * v + 0.04) * soft, 150 + 60 * v, 70);
        noise(t, 0.06, 0.18 * v * soft, "lowpass", surface === "green" ? 1400 : 900);
      }
    }
  },
  splash() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    noise(t, 0.7, 0.5, "lowpass", 3000, 0.5, 350);
    noise(t, 0.25, 0.3, "highpass", 2500);
    for (let i = 0; i < 6; i++) tone(t + 0.15 + i * 0.07 + Math.random() * 0.05, 0.06, 0.08, 500 + Math.random() * 600, 900 + Math.random() * 500);
  },
  /** Into the cup: the drop and the rattle, then notes as good as the score (diff: strokes against par). */
  cup(diff: number) {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    tone(t, 0.12, 0.4, 260, 200, "triangle");
    for (let i = 0; i < 3; i++) tone(t + 0.07 + i * 0.05 * (1 + i * 0.4), 0.04, 0.18 / (i + 1), 1100 - i * 120, 900, "triangle");
    const notes = diff <= -2 ? [523, 659, 784, 1047, 1319] : diff === -1 ? [523, 659, 784, 1047] : diff === 0 ? [523, 659, 784] : [392, 494];
    notes.forEach((f, i) => { tone(t + 0.35 + i * 0.09, 0.5, 0.16, f, f, "sine"); tone(t + 0.35 + i * 0.09, 0.3, 0.05, f * 2, f * 2, "triangle"); });
  },
  /** The power meter at its very top: a quiet tick to time a full drive by ear. */
  top() {
    const c = ac(); if (!c) return;
    tone(c.currentTime, 0.04, 0.07, 2400, 2400, "sine");
  },
  /** A ball lost or in the water coming back to where it was hit. */
  back() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    tone(t, 0.18, 0.09, 330, 440, "sine");
  },
  /** The wind: noise through a slowly wandering band, louder while the ball flies fast. */
  wind(level: number) {
    const c = ac(); if (!c) return;
    if (!wind) {
      const src = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
      src.buffer = noiseBuf; src.loop = true;
      filter.type = "bandpass"; filter.frequency.value = 500; filter.Q.value = 0.6;
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(master!);
      src.start();
      wind = { src, gain, filter };
    }
    const t = c.currentTime;
    wind.gain.gain.setTargetAtTime(0.012 + 0.07 * level, t, 0.25);
    wind.filter.frequency.setTargetAtTime(380 + 900 * level + 80 * Math.sin(t * 0.37), t, 0.3);
  },
  suspend() { if (ctx && ctx.state === "running") void ctx.suspend(); },
};

function stopWind() {
  if (!wind) return;
  try { wind.src.stop(); } catch { /* already */ }
  wind = null;
}
