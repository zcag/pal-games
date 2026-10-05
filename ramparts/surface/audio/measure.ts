// Renders music and effects through the real graph on an OfflineAudioContext
// and measures them: peak, RMS, integrated loudness (BS.1770 K-weighted,
// gated), DC offset, NaN and clipped samples. Used by scripts/audio-check.ts (headless
// Chromium). Sets `window.__measure`.
import type { BattleEvent } from "../../game/types.ts";
import { Audio, type Sting } from "./index.ts";
import { META, LEVEL, SFX_NAMES, TARGET, type Sfx } from "./sfx.ts";
import { ALL_SONGS, validate, type Scene } from "./songs.ts";

export interface Stats {
  peak: number; rms: number; lufs: number; dc: number; nan: number; clip: number; silent: boolean;
  /** RMS (dB) per 5 s window, for music. */
  windows?: number[];
  /** Octave-band levels (63 Hz .. 16 kHz), dB relative to the 500 Hz band. */
  bands?: number[];
  /** RMS (dB) of the last second: anything still sounding there is stuck. */
  tail: number;
  peakVoices?: number;
}

const SR = 44100;
export const BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
/** A typical commercial mix's octave balance, relative to 500 Hz (roughly pink with a gentle top roll-off). */
export const REF = [3, 2.5, 1.5, 0, -2.5, -5, -8, -12, -19];
const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -200);

/** RBJ biquad coefficients for the two K-weighting stages at this sample rate. */
function kweight(sr: number) {
  const shelf = (() => {
    const G = 3.999843853973347, Q = 0.7071752369554196, fc = 1681.974450955533;
    const A = Math.pow(10, G / 40), w = (2 * Math.PI * fc) / sr, al = Math.sin(w) / (2 * Q), c = Math.cos(w), s = 2 * Math.sqrt(A) * al;
    const a0 = (A + 1) - (A - 1) * c + s;
    return [A * ((A + 1) + (A - 1) * c + s) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - s) / a0,
      2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - s) / a0];
  })();
  const hp = (() => {
    const Q = 0.5003270373238773, fc = 38.13547087602444, w = (2 * Math.PI * fc) / sr, al = Math.sin(w) / (2 * Q), c = Math.cos(w), a0 = 1 + al;
    return [(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - al) / a0];
  })();
  return [shelf, hp];
}
function biquad(x: Float32Array, [b0, b1, b2, a1, a2]: number[]) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

export function analyse(b: AudioBuffer, from = 0): Stats {
  const chans = Array.from({ length: b.numberOfChannels }, (_, c) => b.getChannelData(c).subarray(from));
  let peak = 0, sq = 0, nan = 0, clip = 0, dc = 0;
  const n = chans[0].length;
  for (const d of chans) {
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
      const v = d[i];
      if (!Number.isFinite(v)) { nan++; continue; }
      const a = Math.abs(v);
      if (a > peak) peak = a;
      if (a >= 0.999) clip++;
      sq += v * v; sum += v;
    }
    dc = Math.max(dc, Math.abs(sum / d.length));
  }
  // Integrated loudness: 400 ms blocks (75% overlap), absolute gate -70, relative gate -10.
  const [f1, f2] = kweight(b.sampleRate), kw = chans.map((d) => biquad(biquad(d, f1), f2));
  const blk = Math.floor(0.4 * b.sampleRate), hop = Math.floor(blk / 4), blocks: number[] = [];
  for (let s = 0; s + blk <= n; s += hop) {
    let z = 0;
    for (const d of kw) { let m = 0; for (let i = s; i < s + blk; i++) m += d[i] * d[i]; z += m / blk; }
    blocks.push(z);
  }
  const L = (z: number) => -0.691 + 10 * Math.log10(z);
  const abs = blocks.filter((z) => L(z) > -70);
  let lufs = -200;
  if (abs.length) {
    const rel = L(abs.reduce((a, z) => a + z, 0) / abs.length) - 10, g = abs.filter((z) => L(z) > rel);
    if (g.length) lufs = L(g.reduce((a, z) => a + z, 0) / g.length);
  }
  const windows: number[] = [], w = 5 * b.sampleRate;
  for (let s = 0; s + w <= n; s += w) {
    let z = 0;
    for (const d of chans) for (let i = s; i < s + w; i++) z += d[i] * d[i];
    windows.push(Math.round(10 * Math.log10(z / (w * chans.length) + 1e-20) * 10) / 10);
  }
  // Octave bands: two cascaded band-passes per band, on the mid signal.
  const mid = new Float32Array(n);
  for (const d of chans) for (let i = 0; i < n; i++) mid[i] += d[i] / chans.length;
  const bp = (fc: number) => {
    const w = (2 * Math.PI * fc) / b.sampleRate, al = Math.sin(w) / (2 * 1.2), c = Math.cos(w), a0 = 1 + al;
    return [al / a0, 0, -al / a0, (-2 * c) / a0, (1 - al) / a0];
  };
  const pw = BANDS.map((fc) => {
    const y = biquad(biquad(mid, bp(fc)), bp(fc));
    let z = 0;
    for (let i = 0; i < y.length; i++) z += y[i] * y[i];
    return z / y.length + 1e-20;
  });
  const ref = pw[BANDS.indexOf(500)];
  const bands = pw.map((p) => Math.round(10 * Math.log10(p / ref) * 10) / 10);
  let tz = 0;
  const ts = Math.max(0, n - b.sampleRate);
  for (const d of chans) for (let i = ts; i < n; i++) tz += d[i] * d[i];
  const tail = Math.round(10 * Math.log10(tz / ((n - ts) * chans.length) + 1e-20) * 10) / 10;
  const r = (x: number) => Math.round(x * 100) / 100;
  return { peak: r(db(peak)), rms: r(10 * Math.log10(sq / (n * chans.length) + 1e-20)), lufs: r(lufs), dc: Math.round(dc * 1e5) / 1e5, nan, clip, silent: db(peak) < -50, windows, bands, tail };
}

type Curve = number | [t: number, v: number][];
const at = (c: Curve, t: number) => {
  if (typeof c === "number") return c;
  let v = c[0][1];
  for (let i = 0; i < c.length; i++) {
    if (t >= c[i][0]) v = c[i][1];
    if (i + 1 < c.length && t >= c[i][0] && t < c[i + 1][0]) return c[i][1] + ((t - c[i][0]) / (c[i + 1][0] - c[i][0])) * (c[i + 1][1] - c[i][1]);
  }
  return v;
};

async function renderMusic(scene: Scene, act: 1 | 2 | 3 | 4, secs: number, inten: Curve, lowLives: boolean, skip: string[] = []) {
  const ctx = new OfflineAudioContext(2, SR * secs, SR), a = new Audio();
  a.intensity(at(inten, 0));
  a._offline(ctx);
  a._skip(skip);
  a.scene(scene, act);
  if (lowLives) a.battleEvents([{ e: "lives_low", left: 3, tick: 0, x: 0, y: 0 }], 32);
  for (let t = 0; t < secs; t += 0.05) { a.intensity(at(inten, t)); a._advance(t); }
  return ctx.startRendering();
}
async function renderSfx(name: Sfx, dry: boolean) {
  const secs = META[name].cat === "sting" ? 9 : 5, ctx = new OfflineAudioContext(2, SR * secs, SR), a = new Audio();
  a._offline(ctx, { dry });
  a.sfx(name);
  return ctx.startRendering();
}

/** Renders `secs` of a scene's music at an intensity (or a curve of it) and measures it (from the second second). */
export async function music(scene: Scene, act: 1 | 2 | 3 | 4, secs = 20, inten: Curve = 0, lowLives = false) {
  return analyse(await renderMusic(scene, act, secs, inten, lowLives), SR);
}
/** Milliseconds to render `secs` of a piece, optionally without some layers (no analysis). */
export async function cost(scene: Scene, act: 1 | 2 | 3 | 4, secs = 20, inten: Curve = 1, skip: string[] = []) {
  const t = performance.now();
  await renderMusic(scene, act, secs, inten, false, skip);
  return Math.round(performance.now() - t);
}
/** Renders one effect alone. */
export async function sfx(name: Sfx, dry = false) { return analyse(await renderSfx(name, dry)); }

/** A 16-bit stereo WAV, base64. */
function wav(b: AudioBuffer) {
  const n = b.length, data = new DataView(new ArrayBuffer(44 + n * 4)), L = b.getChannelData(0), R = b.getChannelData(1);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); data.setUint32(4, 36 + n * 4, true); str(8, "WAVEfmt "); data.setUint32(16, 16, true);
  data.setUint16(20, 1, true); data.setUint16(22, 2, true); data.setUint32(24, b.sampleRate, true); data.setUint32(28, b.sampleRate * 4, true);
  data.setUint16(32, 4, true); data.setUint16(34, 16, true); str(36, "data"); data.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    data.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    data.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
  }
  const bytes = new Uint8Array(data.buffer);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export async function musicWav(scene: Scene, act: 1 | 2 | 3 | 4, secs = 20, inten: Curve = 0) { return wav(await renderMusic(scene, act, secs, inten, false)); }
export async function sfxWav(name: Sfx) { return wav(await renderSfx(name, false)); }

/** `n` battle events inside one second, over act-4 battle music at full intensity. */
export async function stress(n = 200, secs = 4) {
  const ctx = new OfflineAudioContext(2, SR * secs, SR), a = new Audio();
  a.intensity(1);
  a._offline(ctx);
  a.scene("battle", 4);
  const kinds = ["archer", "mage", "bombard", "frost", "alchemist", "pyre", "storm", "ballista", "thornwood", "archer", "archer", "bombard"] as const;
  const specs = [null, "volley", null, "mortar", null, null, "tempest", "siegebolt", null, "marksmen", null, "shrapnel"] as const;
  const base = { tick: 0, y: 5 };
  const pre: unknown[] = kinds.map((k, i) => ({ ...base, x: 2 + i * 2.5, e: "build", tower: i + 1, pad: i, kind: k, level: 1, gold: 0 }));
  a.battleEvents(pre as BattleEvent[], 32);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
  const make = (): unknown => {
    const x = Math.random() * 32, r = Math.random(), tw = 1 + Math.floor(Math.random() * kinds.length), ev = { ...base, x };
    if (r < 0.4) return { ...ev, e: "shoot", tower: tw, kind: kinds[tw - 1], spec: specs[tw - 1], target: 1, tx: x, ty: 5 };
    if (r < 0.62) return { ...ev, e: "hit", target: 1, amount: 30, type: "phys", crit: Math.random() < 0.15, mult: pick([1.5, 2, 3.5]), shield: 0, big: Math.random() < 0.3, tower: tw };
    if (r < 0.77) return { ...ev, e: "kill", id: 1, kind: "footman", by: tw, bounty: 3, overkill: 0, threat: pick([1, 1, 1, 3]), elite: Math.random() < 0.05, boss: false };
    if (r < 0.82) return { ...ev, e: "chain", tower: tw, ids: [1, 2, 3, 4], pts: [{ x, y: 5 }, { x: x + 1, y: 5 }, { x: x + 2, y: 5 }, { x: x + 3, y: 5 }] };
    if (r < 0.87) return { ...ev, e: "shatter", id: 1, chain: Math.floor(Math.random() * 6), damage: 50, r: 1 };
    if (r < 0.9) return { ...ev, e: "ignite", id: 1, puddle: Math.random() < 0.5 };
    if (r < 0.93) return { ...ev, e: "explode", r: 1.5, source: pick(["shell", "naphtha", "meteor"]), damage: 80 };
    if (r < 0.96) return { ...ev, e: "block", soldier: 1, id: 1 };
    return { ...ev, e: pick(["freeze", "stun", "root", "mark", "hex"]), id: 1 };
  };
  const steps = 30;
  for (let s = 0; s < steps; s++) {
    const t = 0.5 + s / steps;
    a._advance(t);
    const batch = Array.from({ length: Math.round(n / steps) }, make);
    a.battleEvents(batch as BattleEvent[], 32);
  }
  for (let t = 1.5; t < secs; t += 0.05) a._advance(t);
  const st = analyse(await ctx.startRendering());
  return { ...st, peakVoices: a._stats().peakVoices };
}

/** One continuous render through the scenes: title, map, a battle rising, the boss arriving, a phase, victory; then a shop and a defeat. */
export async function journey(secs = 75, skip: number[] = []) {
  const ctx = new OfflineAudioContext(2, SR * secs, SR), a = new Audio();
  a._offline(ctx);
  const ev = (e: Record<string, unknown>) => a.battleEvents([{ tick: 0, x: 16, y: 5, ...e } as BattleEvent], 32);
  const cues: [number, () => void][] = [
    [0, () => a.scene("title", 1)], [7, () => a.scene("map", 1)], [14, () => a.scene("battle", 1)],
    [16, () => ev({ e: "wave_start", wave: 0, early: false, bonus: 0, interest: 0, income: 0 })],
    [20, () => a.intensity(0.5)], [26, () => a.intensity(0.9)],
    [30, () => ev({ e: "boss_spawn", id: 9, boss: "gorrak" })],
    [38, () => ev({ e: "boss_phase", id: 9, boss: "gorrak", phase: 2 })],
    [40, () => a.paused(true)], [43, () => a.paused(false)],
    [46, () => { ev({ e: "victory" }); a.scene("victory", 1); }],
    [56, () => a.scene("shop", 1)], [64, () => { ev({ e: "defeat" }); a.scene("defeat", 1); }],
  ];
  let next = 0;
  for (let t = 0; t < secs; t += 0.05) {
    while (next < cues.length && cues[next][0] <= t) { a._advance(t); if (!skip.includes(next)) cues[next][1](); next++; }
    a._advance(t);
  }
  return analyse(await ctx.startRendering());
}

/** One stinger on the music route, alone. */
export async function sting(name: Sting) {
  const secs = 9, ctx = new OfflineAudioContext(2, SR * secs, SR), a = new Audio();
  a._offline(ctx);
  a.stinger(name);
  return analyse(await ctx.startRendering());
}

export function songs() {
  const ids: string[] = [];
  for (const s of ALL_SONGS()) { validate(s); ids.push(s.id); }
  return ids;
}

export const api = { music, cost, sfx, sting, stress, journey, songs, musicWav, sfxWav, names: SFX_NAMES, meta: META, target: TARGET, level: LEVEL };
(globalThis as unknown as { __measure: typeof api }).__measure = api;
