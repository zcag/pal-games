// Every sound effect, synthesised from a few layered parts (a pitched body, a
// filtered noise, metallic partials, a plucked string). Each recipe builds into
// one voice (a gain the voice manager can steal) and answers its length.
// META sets each effect's category, cooldown and priority; LEVEL trims each to
// its category's loudness (measured with check.ts, peaks in dB).
import { type Engine, type StringKind, mtof } from "./engine.ts";
import * as I from "./inst.ts";

export type Cat = "ui" | "build" | "battle" | "big" | "sting";
type Meta = { cat: Cat; cd: number; pri: number };
const m = (cat: Cat, cd: number, pri: number): Meta => ({ cat, cd, pri });

/** Category, cooldown (ms, a repeat inside it is dropped), priority (a full voice pool steals the lowest). */
export const META = {
  // ui
  hover: m("ui", 40, 4), click: m("ui", 30, 4), back: m("ui", 40, 4), deny: m("ui", 80, 4), open: m("ui", 60, 4),
  close: m("ui", 60, 4), card_flip: m("ui", 50, 4), card_pick: m("ui", 80, 4), coin: m("ui", 45, 2), coins: m("ui", 120, 3),
  buy: m("ui", 100, 4), map_step: m("ui", 60, 4), page: m("ui", 60, 4),
  // build
  build: m("build", 80, 4), upgrade: m("build", 80, 4), specialise: m("build", 150, 4), sell: m("build", 80, 4), rally: m("build", 150, 3),
  // battle
  arrow: m("battle", 40, 1), bolt: m("battle", 55, 1), arcane: m("battle", 45, 1), hex: m("battle", 80, 1),
  shell_fire: m("battle", 70, 1), shell_boom: m("battle", 80, 2), mortar: m("battle", 90, 1), flask: m("battle", 70, 1),
  splash: m("battle", 80, 1), frost: m("battle", 60, 1), freeze: m("battle", 60, 2), shatter: m("battle", 35, 2),
  thaw: m("battle", 150, 1), flame: m("battle", 110, 1), ignite: m("battle", 90, 2), zap: m("battle", 50, 1),
  chain: m("battle", 30, 1), ballista: m("battle", 80, 1), harpoon: m("battle", 100, 1), siege: m("battle", 100, 2),
  thorns: m("battle", 80, 1), root: m("battle", 100, 1), nova: m("battle", 120, 2), aura: m("battle", 400, 0),
  soldier_hit: m("battle", 60, 1), soldier_down: m("battle", 80, 2), soldier_spawn: m("battle", 120, 1), block: m("battle", 70, 1),
  kill_small: m("battle", 35, 2), crit: m("battle", 50, 2), shield_up: m("battle", 100, 1), shield_break: m("battle", 70, 2),
  heal_pulse: m("battle", 200, 1), mark: m("battle", 80, 1), stun: m("battle", 80, 1), sapper_fuse: m("battle", 150, 2),
  tower_disabled: m("battle", 120, 2), summon: m("battle", 300, 2), spell_ready: m("battle", 200, 3), reveal: m("battle", 150, 1),
  split: m("battle", 70, 1), pull: m("battle", 100, 1), grounded: m("battle", 100, 1),
  // big moments
  kill_big: m("big", 60, 3), deadeye: m("big", 80, 3), explode: m("big", 120, 3), leak: m("big", 120, 4),
  lives_low: m("big", 800, 4), wave_horn: m("big", 500, 4), call_early: m("big", 500, 4), meteor: m("big", 100, 4),
  stillness: m("big", 300, 4), judgement: m("big", 200, 4), firebomb: m("big", 150, 3), barrier: m("big", 200, 3),
  boss_roar: m("big", 400, 5), boss_telegraph: m("big", 300, 5), boss_stomp: m("big", 200, 5), burrow: m("big", 400, 5),
  erupt: m("big", 300, 5), war_cry: m("big", 400, 5), breath: m("big", 400, 5), sandstorm: m("big", 600, 4),
  wings: m("big", 500, 4), forge_hammer: m("big", 120, 4), rest: m("big", 500, 4),
  // stingers as effects
  victory: m("sting", 1000, 5), defeat: m("sting", 1000, 5), relic: m("sting", 300, 5), unlock: m("sting", 300, 5),
} satisfies Record<string, Meta>;
export type Sfx = keyof typeof META;
export const SFX_NAMES = Object.keys(META) as Sfx[];

/** Peak level (dBFS, through the master) each category is trimmed to. */
export const TARGET: Record<Cat, number> = { ui: -17, build: -12, battle: -14, big: -8, sting: -7 };

/** Per-effect trims in dB (from check.ts --calibrate). */
export const LEVEL: Partial<Record<Sfx, number>> = {
  hover: 11.7, click: 1.9, back: -1.9, deny: -4.8, open: 3, close: 7.8, card_flip: 3.5, card_pick: -3.2,
  coin: -9.3, coins: -15.5, buy: -20, map_step: 2.3, page: 4, build: -10.3, upgrade: 1.1, specialise: -13.7,
  sell: -9.8, rally: -0.9, arrow: 7.6, bolt: 3, arcane: 4.6, hex: -1.7, shell_fire: -4.4, shell_boom: -10.1,
  mortar: -4.4, flask: -1, splash: 2.8, frost: 0.8, freeze: -3.7, shatter: -8.8, thaw: 1, flame: 2.3,
  ignite: -7.9, zap: 2.6, chain: 5.9, ballista: -7.6, harpoon: -7.9, siege: -10.3, thorns: 3.8, root: 2.9,
  nova: -8.3, aura: 2.9, soldier_hit: -1.3, soldier_down: -5.8, soldier_spawn: -2.6, block: -2.7, kill_small: 2.5, crit: 0.9,
  shield_up: -3, shield_break: -4.9, heal_pulse: -5.6, mark: 6.2, stun: 0.6, sapper_fuse: -0.4, tower_disabled: -3.5, summon: -8.1,
  spell_ready: 2.7, reveal: -0.8, split: 0.9, pull: 7.4, grounded: -1.6, kill_big: -0.5, deadeye: -1.9, explode: -8.6,
  leak: -4.8, lives_low: -5.5, wave_horn: -1.8, call_early: -8.3, meteor: 5.3, stillness: -12.1, judgement: -14.8, firebomb: -5.4,
  barrier: -6.3, boss_roar: -21.3, boss_telegraph: 0.3, boss_stomp: -8, burrow: -6.5, erupt: -13.5, war_cry: -2.4, breath: -2.5,
  sandstorm: 4.1, wings: 0.6, forge_hammer: -0.7, rest: -0.5, victory: 1.9, defeat: 0.5, relic: 1.1, unlock: 1.4,
};

type Part = [ratio: number, amp: number, decay: number];
const METAL: Part[] = [[1, 1, 0.18], [2.41, 0.6, 0.12], [3.93, 0.4, 0.08], [5.37, 0.25, 0.05]];
const GLASS: Part[] = [[1, 1, 0.3], [2.32, 0.5, 0.2], [4.25, 0.25, 0.12]];
const COIN: Part[] = [[1, 1, 0.22], [1.48, 0.55, 0.16], [2.31, 0.3, 0.1]];
const ANVIL: Part[] = [[1, 1, 0.7], [2.76, 0.6, 0.4], [5.4, 0.35, 0.2], [8.9, 0.15, 0.1]];

/** A voice under construction: helpers that build into it at time `t`, frequencies scaled by `p`. */
export class V {
  constructor(readonly e: Engine, readonly out: AudioNode, readonly t: number, readonly p: number,
    readonly k: number, readonly speed: number) {}
  at(dt: number) { return new V(this.e, this.out, this.t + dt, this.p, this.k, this.speed); }
  /** A note in the music's key (semitones from its tonic). */
  key(semis: number) { return mtof(this.k + semis); }

  tone(type: OscillatorType, f0: number, f1: number, len: number, vol: number, o: { a?: number; dest?: AudioNode; det?: number } = {}) {
    const e = this.e, t = this.t, a = o.a ?? 0.002, g = e.gain(0);
    const osc = e.osc(type, f0 * this.p, t, t + a + len + 0.05, g, o.det ?? 0);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * this.p), t + a + len);
    e.hit(g.gain, t, vol, len, a);
    g.connect(o.dest ?? this.out);
    return osc;
  }
  hiss(f0: number, f1: number, len: number, vol: number, o: { type?: BiquadFilterType; q?: number; a?: number; color?: "w" | "p" | "b"; dest?: AudioNode } = {}) {
    const e = this.e, t = this.t, a = o.a ?? 0.002, fl = e.filt(o.type ?? "bandpass", Math.min(18000, f0 * this.p), o.q ?? 1), g = e.gain(0);
    if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(Math.min(18000, f1 * this.p), t + a + len);
    e.hit(g.gain, t, vol, len, a);
    e.noiseSrc(o.color ?? "w", t, t + a + len + 0.05, fl);
    fl.connect(g).connect(o.dest ?? this.out);
    return fl;
  }
  /** Inharmonic partials: metal, glass, coins, bells. */
  ring(f: number, parts: Part[], vol: number, scale = 1) {
    const e = this.e, t = this.t;
    for (const [r, a, d] of parts) {
      const g = e.gain(0), dd = d * scale;
      e.hit(g.gain, t, vol * a, dd);
      e.osc("sine", f * r * this.p, t, t + dd + 0.05, g);
      g.connect(this.out);
    }
  }
  string(kind: StringKind, f: number, vol: number, len: number) {
    const e = this.e, { buf, rate } = e.string(kind, f * this.p), g = e.gain(vol);
    e.fade(g.gain, vol, this.t + len, 0.15);
    e.src(buf, this.t, this.t + len + 0.3, g, rate);
    g.connect(this.out);
  }
  /** A falling sine struck hard: kicks, thuds, booms. */
  thump(f0: number, f1: number, len: number, vol: number) { return this.tone("sine", f0, f1, len, vol, { a: 0.003 }); }
  /** A run of tiny clicks spread over `span`. */
  crackle(n: number, span: number, vol: number, lo = 1800, hi = 5000) {
    for (let i = 0; i < n; i++) this.at(Math.random() * span).hiss(lo + Math.random() * (hi - lo), lo, 0.008 + Math.random() * 0.01, vol * (0.4 + 0.6 * Math.random()), { q: 2.5 });
  }
  /** Sends the voice to the effects reverb. */
  verb(x: number) { this.out.connect(this.e.gain(x)).connect(this.e.sVerb); }
  /** Amplitude flutter on a node: `depth` of its level wobbling at `rate`. */
  flutter(rate: number, depth: number, len: number) {
    const e = this.e, am = e.gain(1 - depth), lfo = e.gain(depth);
    e.osc("sine", rate, this.t, this.t + len + 0.1, lfo); lfo.connect(am.gain);
    am.connect(this.out);
    return am;
  }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function coin(v: V, vol = 1) {
  v.ring(2350, COIN, 0.35 * vol);
  v.at(0.045).ring(2980, COIN, 0.25 * vol);
  v.hiss(7000, 7000, 0.01, 0.1 * vol, { type: "highpass" });
}
function knock(v: V, f: number, vol: number) {
  v.thump(f * 1.6, f, 0.07, 0.4 * vol);
  v.hiss(f * 3.6, f * 3.6, 0.04, 0.25 * vol, { q: 3 });
}
function zap(v: V, f: number, len: number, vol: number, band: number) {
  const e = v.e, bp = e.filt("bandpass", band * v.p, 1.5), g = e.gain(0), o = e.osc("sawtooth", f * v.p, v.t, v.t + len + 0.05, bp);
  const n = e.gain(f * 0.7);
  e.noiseSrc("w", v.t, v.t + len + 0.05, n); n.connect(o.frequency);
  e.hit(g.gain, v.t, vol, len);
  bp.connect(g).connect(v.out);
  v.hiss(4000, 4000, 0.025, vol * 1.4, { type: "highpass" });
}
function fm(v: V, fc0: number, fc1: number, ratio: number, idx0: number, idx1: number, len: number, vol: number, a = 0.004) {
  const e = v.e, t = v.t, g = e.gain(0), mg = e.gain(idx0 * fc0 * v.p);
  const car = e.osc("sine", fc0 * v.p, t, t + a + len + 0.05, g), mod = e.osc("sine", fc0 * ratio * v.p, t, t + a + len + 0.05, mg);
  car.frequency.exponentialRampToValueAtTime(fc1 * v.p, t + a + len);
  mod.frequency.exponentialRampToValueAtTime(fc1 * ratio * v.p, t + a + len);
  mg.gain.exponentialRampToValueAtTime(Math.max(1, idx1 * fc1 * v.p), t + a + len);
  mg.connect(car.frequency);
  e.hit(g.gain, t, vol, len, a);
  g.connect(v.out);
}
/** Fire: pink noise through a low-pass that swells, fluttering. */
function roar(v: V, lo: number, hi: number, end: number, len: number, vol: number, a: number, rate = 19) {
  const e = v.e, t = v.t, lp = e.filt("lowpass", lo, 0.8), g = e.gain(0);
  lp.frequency.setValueAtTime(lo, t);
  lp.frequency.exponentialRampToValueAtTime(hi, t + Math.max(0.02, a));
  lp.frequency.exponentialRampToValueAtTime(end, t + len);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(vol * 0.001, t + len);
  e.noiseSrc("p", t, t + len + 0.05, lp);
  lp.connect(g).connect(v.flutter(rate, 0.3, len));
}
function boom(v: V, size: number) {
  v.thump(90 / Math.sqrt(size), 30, 0.45 * size, 1);
  v.hiss(3500, 140, 0.6 * size, 0.9, { type: "lowpass", color: "p", a: 0.003 });
  v.hiss(1400, 500, 0.12, 0.35, { q: 1 });
  v.crackle(4 + Math.round(4 * size), 0.35 * size, 0.25, 1500, 4000);
}

type Recipe = (v: V) => number;
export const RECIPES: Record<Sfx, Recipe> = {
  // ---- ui
  hover: (v) => { v.tone("triangle", 1250, 1150, 0.03, 0.12); v.hiss(2400, 2400, 0.018, 0.07, { q: 3 }); return 0.06; },
  click: (v) => { v.tone("triangle", 720, 560, 0.07, 0.3); v.tone("sine", 1440, 1400, 0.05, 0.08); v.hiss(3000, 3000, 0.012, 0.1, { q: 1.5 }); return 0.1; },
  back: (v) => { v.tone("triangle", 620, 600, 0.06, 0.25); v.at(0.065).tone("triangle", 440, 430, 0.09, 0.25); return 0.18; },
  deny: (v) => {
    const lp = v.e.filt("lowpass", 600); lp.connect(v.out);
    v.tone("square", 150, 140, 0.07, 0.25, { dest: lp }); v.at(0.09).tone("square", 128, 120, 0.09, 0.25, { dest: lp });
    return 0.22;
  },
  open: (v) => { v.hiss(700, 3800, 0.16, 0.22, { q: 1.2, a: 0.06 }); v.tone("sine", 440, 660, 0.14, 0.08, { a: 0.03 }); return 0.25; },
  close: (v) => { v.hiss(3800, 700, 0.14, 0.2, { q: 1.2, a: 0.01 }); v.tone("sine", 620, 400, 0.12, 0.08); return 0.2; },
  card_flip: (v) => { v.hiss(500, 5000, 0.13, 0.25, { q: 1.6, a: 0.05 }); v.at(0.05).hiss(3000, 1500, 0.06, 0.1, { q: 2 }); return 0.2; },
  card_pick: (v) => {
    v.thump(170, 65, 0.16, 0.6); v.hiss(1200, 400, 0.06, 0.2, { type: "lowpass" });
    I.glock(v.e, v.out, v.t + 0.02, v.key(24) * v.p, 0.8, 0.7);
    return 0.6;
  },
  coin: (v) => { coin(v); return 0.35; },
  coins: (v) => { for (let i = 0; i < 6; i++) coin(new V(v.e, v.out, v.t + Math.random() * 0.35, v.p * rand(0.9, 1.25), v.k, 1), 0.7); return 0.7; },
  buy: (v) => {
    for (let i = 0; i < 3; i++) coin(new V(v.e, v.out, v.t + i * 0.06, v.p * rand(0.95, 1.2), v.k, 1), 0.7);
    const s = v.at(0.17); s.thump(130, 60, 0.15, 0.7); s.hiss(1500, 1500, 0.05, 0.3, { type: "lowpass" });
    return 0.6;
  },
  map_step: (v) => { v.tone("sine", 520, 360, 0.06, 0.35); v.hiss(950, 950, 0.04, 0.2, { q: 5 }); return 0.1; },
  page: (v) => { v.hiss(2500, 5500, 0.09, 0.15, { q: 0.8, a: 0.03 }); v.at(0.07).hiss(4500, 2000, 0.1, 0.12, { q: 0.8, a: 0.02 }); return 0.2; },

  // ---- build
  build: (v) => {
    for (const [i, at] of [0, 0.12, 0.24].entries()) { const h = v.at(at); knock(h, 190 + i * 12, 1); h.ring(2100, METAL, 0.05); }
    const d = v.at(0.36); d.thump(110, 48, 0.3, 0.8); d.hiss(900, 200, 0.35, 0.35, { type: "lowpass", color: "p" });
    return 0.8;
  },
  upgrade: (v) => {
    v.ring(900, METAL, 0.25, 1.4); v.thump(140, 70, 0.12, 0.5);
    [12, 16, 19, 24].forEach((d, i) => I.glock(v.e, v.out, v.t + 0.05 + i * 0.07, v.key(d) * v.p, 0.8, 0.85));
    v.verb(0.2);
    return 1;
  },
  specialise: (v) => {
    for (const d of [0, 4, 7, 12]) I.brass(v.e, v.out, v.t, v.key(d - 12) * v.p, 0.6, 1);
    I.timpani(v.e, v.out, v.t, 1, v.key(-12));
    I.glock(v.e, v.out, v.t + 0.12, v.key(24) * v.p, 1, 1);
    v.at(0.1).hiss(6000, 9000, 0.9, 0.08, { type: "highpass", a: 0.3 });
    v.verb(0.35);
    return 1.5;
  },
  sell: (v) => {
    for (let i = 0; i < 8; i++) coin(new V(v.e, v.out, v.t + i * 0.055 + Math.random() * 0.02, v.p * (1.25 - i * 0.04), v.k, 1), 0.6);
    v.hiss(900, 200, 0.45, 0.5, { type: "lowpass", color: "b" });
    for (const at of [0.05, 0.16, 0.3]) knock(v.at(at), rand(150, 220), 0.6);
    return 0.8;
  },
  rally: (v) => { I.horn(v.e, v.out, v.t, v.key(-5) * v.p, 0.12, 0.9); I.horn(v.e, v.out, v.t + 0.13, v.key(0) * v.p, 0.38, 1); v.verb(0.3); return 0.8; },

  // ---- battle
  arrow: (v) => { v.hiss(4200, 1500, 0.09, 0.5, { q: 2.5, a: 0.006 }); v.tone("triangle", 240, 200, 0.05, 0.12); return 0.12; },
  bolt: (v) => { v.string("twang", 150, 0.35, 0.2); v.hiss(3000, 1100, 0.1, 0.45, { q: 2 }); v.hiss(4000, 4000, 0.008, 0.3, { type: "highpass" }); return 0.25; },
  arcane: (v) => { fm(v, 900, 1500, 2, 1.5, 0.2, 0.22, 0.25); v.hiss(6000, 6000, 0.2, 0.08, { type: "highpass", a: 0.05 }); v.tone("sine", 220, 330, 0.15, 0.1); return 0.3; },
  hex: (v) => {
    const e = v.e, lp = e.filt("lowpass", 900, 3), g = e.gain(0), lfo = e.gain(400);
    e.osc("sine", 7, v.t, v.t + 0.5, lfo); lfo.connect(lp.frequency);
    for (const r of [1, 1.414]) { const o = e.osc("sawtooth", 240 * r * v.p, v.t, v.t + 0.5, lp); o.frequency.exponentialRampToValueAtTime(190 * r * v.p, v.t + 0.4); }
    e.hit(g.gain, v.t, 0.2, 0.35, 0.03); lp.connect(g).connect(v.out);
    v.tone("sine", 110, 100, 0.3, 0.15);
    return 0.45;
  },
  shell_fire: (v) => { v.thump(150, 55, 0.22, 0.9); v.hiss(2500, 300, 0.2, 0.55, { type: "lowpass", color: "p" }); v.hiss(3000, 3000, 0.01, 0.2, { type: "highpass" }); return 0.3; },
  shell_boom: (v) => { boom(v, 1); return 0.8; },
  mortar: (v) => { v.tone("sine", 190, 75, 0.3, 0.9); v.hiss(420, 220, 0.25, 0.5, { q: 3 }); v.hiss(2000, 2000, 0.05, 0.15, { type: "highpass" }); return 0.4; },
  flask: (v) => { v.hiss(700, 2200, 0.14, 0.25, { q: 1.5, a: 0.04 }); v.at(0.03).ring(3300, GLASS, 0.18, 0.6); return 0.3; },
  splash: (v) => {
    v.hiss(1500, 250, 0.32, 0.7, { type: "lowpass", color: "p", a: 0.004 });
    for (let i = 0; i < 5; i++) { const f = rand(250, 600); v.at(rand(0, 0.18)).tone("sine", f, f * 1.8, 0.035, 0.15); }
    return 0.45;
  },
  frost: (v) => {
    v.ring(2600, [[1, 1, 0.35], [2.71, 0.4, 0.2], [5.1, 0.15, 0.1]], 0.22);
    v.hiss(5000, 8000, 0.25, 0.15, { type: "highpass", a: 0.02 }); v.tone("sine", 1200, 1900, 0.12, 0.1);
    return 0.45;
  },
  freeze: (v) => {
    v.crackle(10, 0.16, 0.45, 3000, 7000);
    v.at(0.05).ring(1700, GLASS, 0.15, 1.6); v.hiss(6000, 6000, 0.25, 0.12, { type: "highpass", a: 0.03 });
    return 0.6;
  },
  shatter: (v) => {
    v.hiss(3000, 9000, 0.2, 0.7, { type: "highpass" });
    for (let i = 0; i < 7; i++) v.at(rand(0, 0.08)).ring(rand(1800, 5500), GLASS, 0.14, 0.8);
    for (let i = 0; i < 4; i++) v.at(rand(0.1, 0.3)).ring(rand(2500, 6000), GLASS, 0.06, 0.6);
    v.thump(220, 90, 0.1, 0.5);
    return 0.6;
  },
  thaw: (v) => { v.hiss(5000, 1800, 0.5, 0.2, { q: 0.8, a: 0.06 }); v.at(0.3).tone("sine", 1300, 800, 0.06, 0.12); return 0.6; },
  flame: (v) => { roar(v, 700, 1600, 700, 0.4, 0.5, 0.06); v.crackle(3, 0.3, 0.2); return 0.45; },
  ignite: (v) => { roar(v, 200, 3200, 500, 0.6, 0.9, 0.1, 23); v.thump(90, 40, 0.35, 0.7); v.crackle(4, 0.4, 0.25); return 0.8; },
  zap: (v) => { zap(v, 1100, 0.12, 0.3, 2600); v.tone("square", 90, 90, 0.1, 0.05); return 0.18; },
  chain: (v) => { zap(v, 1500, 0.07, 0.22, 3800); return 0.1; },
  ballista: (v) => {
    v.thump(115, 55, 0.2, 0.8); v.hiss(750, 750, 0.06, 0.5, { q: 3 });
    v.string("bass", 82, 0.5, 0.4); v.hiss(1600, 600, 0.25, 0.25, { a: 0.02 });
    return 0.5;
  },
  harpoon: (v) => {
    RECIPES.ballista(v);
    const e = v.e, bp = e.filt("bandpass", 1500 * v.p, 4); bp.connect(v.out);
    v.tone("sawtooth", 900, 280, 0.45, 0.15, { dest: bp });
    v.at(0.1).crackle(6, 0.3, 0.2, 2500, 3500);
    return 0.6;
  },
  siege: (v) => { RECIPES.ballista(v); v.hiss(3000, 3000, 0.04, 0.7, { type: "highpass" }); v.thump(70, 30, 0.5, 0.6); return 0.7; },
  thorns: (v) => { v.hiss(2400, 2400, 0.14, 0.3, { q: 0.9, a: 0.01 }); v.crackle(4, 0.1, 0.3, 4000, 6000); return 0.2; },
  root: (v) => {
    const e = v.e, bp = e.filt("bandpass", 650 * v.p, 5), g = e.gain(0), lfo = e.gain(9);
    const o = e.osc("sawtooth", 75 * v.p, v.t, v.t + 0.55, bp);
    e.osc("sine", 11, v.t, v.t + 0.55, lfo); lfo.connect(o.frequency);
    e.hit(g.gain, v.t, 0.5, 0.45, 0.05); bp.connect(g).connect(v.out);
    v.thump(110, 55, 0.2, 0.5); v.hiss(400, 400, 0.3, 0.4, { type: "lowpass", color: "b" });
    return 0.55;
  },
  nova: (v) => {
    v.hiss(5000, 700, 0.6, 0.6, { type: "lowpass", a: 0.01 });
    for (let i = 0; i < 4; i++) v.ring(rand(1400, 2800), GLASS, 0.1, 1.3);
    v.thump(140, 60, 0.35, 0.45); v.verb(0.25);
    return 0.7;
  },
  aura: (v) => {
    for (const d of [12, 16, 19]) v.tone("sine", v.key(d), v.key(d), 0.45, 0.05, { a: 0.12 });
    v.tone("sine", v.key(-12), v.key(-12), 0.5, 0.08, { a: 0.1 });
    return 0.6;
  },
  soldier_hit: (v) => { v.ring(820, METAL, 0.3); v.hiss(4000, 4000, 0.015, 0.3, { type: "highpass" }); return 0.25; },
  soldier_down: (v) => {
    const e = v.e, g = e.gain(1); g.connect(v.out);
    for (const [f, q] of [[600, 3], [1100, 4]] as const) { const bp = e.filt("bandpass", f, q); bp.connect(g); v.tone("sawtooth", 190, 110, 0.2, 0.3, { a: 0.01, dest: bp }); }
    const d = v.at(0.1); d.thump(95, 50, 0.2, 0.5); d.hiss(600, 600, 0.2, 0.2, { type: "lowpass", color: "p" });
    return 0.4;
  },
  soldier_spawn: (v) => {
    v.thump(220, 130, 0.09, 0.4); v.hiss(450, 450, 0.06, 0.3, { q: 3 });
    for (const at of [0.15, 0.28, 0.41]) { const s = v.at(at); s.hiss(900, 900, 0.04, 0.25, { type: "lowpass" }); s.thump(140, 90, 0.04, 0.15); }
    return 0.5;
  },
  block: (v) => { v.ring(1150, METAL, 0.3); v.hiss(3200, 3200, 0.04, 0.35); v.thump(170, 90, 0.08, 0.35); return 0.3; },
  kill_small: (v) => {
    v.tone("sine", 560, 170, 0.09, 0.45); v.hiss(1300, 1300, 0.05, 0.25);
    v.hiss(1200, 400, 0.15, 0.2, { type: "lowpass", color: "p", a: 0.01 });
    return 0.2;
  },
  crit: (v) => { v.ring(2500, [[1, 1, 0.25], [1.5, 0.5, 0.18], [2.6, 0.25, 0.1]], 0.3); v.hiss(5000, 5000, 0.01, 0.3, { type: "highpass" }); return 0.3; },
  shield_up: (v) => { fm(v, 500, 1100, 3.5, 0.6, 0.1, 0.35, 0.2, 0.1); v.hiss(6000, 6000, 0.3, 0.07, { type: "highpass", a: 0.2 }); return 0.5; },
  shield_break: (v) => {
    v.hiss(4000, 4000, 0.12, 0.6, { type: "highpass" });
    for (const f of [1800, 2650, 4100]) v.ring(f, GLASS, 0.15);
    v.thump(320, 120, 0.06, 0.35);
    return 0.45;
  },
  heal_pulse: (v) => {
    [12, 16, 19].forEach((d, i) => I.celesta(v.e, v.out, v.t + i * 0.035, v.key(d) * v.p, 0.9, 0.8));
    v.hiss(5000, 5000, 0.4, 0.04, { type: "highpass", a: 0.15 });
    return 1;
  },
  mark: (v) => { v.ring(1760, [[1, 1, 0.45], [2, 0.4, 0.3], [3, 0.15, 0.2]], 0.2); v.tone("sine", 880, 880, 0.3, 0.06); return 0.5; },
  stun: (v) => {
    v.thump(420, 200, 0.07, 0.4);
    [31, 28, 24].forEach((d, i) => I.glock(v.e, v.out, v.t + 0.05 + i * 0.06, v.key(d) * v.p, 0.5, 0.7));
    return 0.6;
  },
  sapper_fuse: (v) => {
    v.hiss(4200, 3600, 1, 0.14, { q: 2, a: 0.05 });
    const lp = v.e.filt("lowpass", 3000); lp.connect(v.out);
    for (let i = 0; i < 6; i++) v.at(0.1 + i * 0.16).tone("square", 1600, 1600, 0.01, 0.12, { dest: lp });
    return 1.1;
  },
  tower_disabled: (v) => {
    v.thump(125, 48, 0.25, 0.7); v.hiss(2200, 200, 0.3, 0.5, { type: "lowpass", color: "p" });
    const lp = v.e.filt("lowpass", 1400); lp.connect(v.out);
    v.tone("sawtooth", 420, 55, 0.5, 0.12, { dest: lp }); v.crackle(4, 0.3, 0.2);
    return 0.7;
  },
  summon: (v) => {
    I.choir(v.e, v.out, v.t, [-12, -11, -5].map((d) => v.key(d) * v.p), 0.9, 0.9);
    v.hiss(220, 220, 0.9, 0.5, { type: "lowpass", color: "b", a: 0.3 });
    v.hiss(400, 2500, 0.6, 0.15, { q: 1, a: 0.55 });
    v.verb(0.3);
    return 1.6;
  },
  spell_ready: (v) => { I.tubular(v.e, v.out, v.t, v.key(12) * v.p, 1, 0.8); I.tubular(v.e, v.out, v.t + 0.08, v.key(19) * v.p, 1, 0.5); return 1.6; },
  reveal: (v) => {
    v.hiss(5000, 5000, 0.35, 0.1, { type: "highpass", a: 0.2 });
    I.glock(v.e, v.out, v.t + 0.15, v.key(24) * v.p, 0.5, 0.5); I.glock(v.e, v.out, v.t + 0.25, v.key(31) * v.p, 0.5, 0.4);
    return 0.7;
  },
  split: (v) => {
    v.hiss(1200, 300, 0.15, 0.5, { type: "lowpass", color: "p" });
    v.tone("sine", 300, 700, 0.08, 0.3); v.at(0.06).tone("sine", 260, 600, 0.08, 0.25);
    return 0.3;
  },
  pull: (v) => {
    const bp = v.e.filt("bandpass", 1400 * v.p, 5); bp.connect(v.out);
    v.tone("sawtooth", 280, 900, 0.25, 0.2, { dest: bp }); v.crackle(5, 0.2, 0.2, 2500, 3500);
    return 0.35;
  },
  grounded: (v) => { v.thump(130, 45, 0.3, 0.8); v.hiss(900, 150, 0.4, 0.5, { type: "lowpass", color: "p" }); return 0.5; },

  // ---- big moments
  kill_big: (v) => {
    v.thump(170, 42, 0.4, 1); v.hiss(1000, 300, 0.3, 0.5, { q: 1 }); v.tone("sine", 320, 90, 0.12, 0.4);
    I.glock(v.e, v.out, v.t + 0.05, v.key(24), 0.6, 0.6); I.glock(v.e, v.out, v.t + 0.05, v.key(31), 0.6, 0.45);
    v.verb(0.2);
    return 1;
  },
  deadeye: (v) => {
    v.hiss(2200, 2200, 0.045, 1, { type: "highpass", a: 0.001 }); v.thump(130, 48, 0.3, 0.8);
    v.ring(3100, [[1, 1, 0.7], [1.5, 0.4, 0.4], [2.6, 0.2, 0.2]], 0.25); v.verb(0.3);
    return 0.9;
  },
  explode: (v) => { boom(v, 1.8); v.thump(50, 28, 1, 0.5); v.verb(0.2); return 1.4; },
  leak: (v) => {
    v.thump(75, 32, 0.7, 1); v.hiss(500, 100, 0.6, 0.7, { type: "lowpass", color: "b" });
    v.at(0.02).hiss(2500, 2500, 0.07, 0.5, { type: "highpass" });
    const lp = v.e.filt("lowpass", 600); lp.connect(v.out);
    for (const f of [110, 116.5]) v.tone("sawtooth", f, f * 0.94, 0.55, 0.12, { a: 0.03, dest: lp });
    v.verb(0.2);
    return 1;
  },
  lives_low: (v) => {
    const lp = v.e.filt("lowpass", 200); lp.connect(v.out);
    v.tone("sine", 70, 42, 0.2, 0.9, { dest: lp, a: 0.003 }); v.at(0.22).tone("sine", 64, 40, 0.2, 0.65, { dest: lp, a: 0.003 });
    return 0.5;
  },
  wave_horn: (v) => {
    const f = v.key(-12) * v.p;
    I.horn(v.e, v.out, v.t, f * 0.75, 0.32, 0.85);
    I.brass(v.e, v.out, v.t + 0.32, f, 1.25, 1); I.horn(v.e, v.out, v.t + 0.32, f / 2, 1.25, 0.9);
    v.at(0.3).hiss(800, 800, 1.2, 0.04, { q: 0.8, a: 0.2 });
    v.verb(0.5);
    return 2.2;
  },
  call_early: (v) => {
    const f = v.key(-12) * v.p;
    I.brass(v.e, v.out, v.t, f, 0.55, 1); I.horn(v.e, v.out, v.t, f / 2, 0.55, 0.9);
    for (let i = 0; i < 4; i++) coin(new V(v.e, v.out, v.t + 0.12 + i * 0.07, rand(0.95, 1.25), v.k, 1), 0.6);
    v.verb(0.4);
    return 1.1;
  },
  meteor: (v) => {
    const len = 0.95 / v.speed;
    v.tone("sine", 1700, 260, len, 0.14, { a: 0.1 });
    v.hiss(150, 900, len, 0.5, { type: "lowpass", color: "p", a: len * 0.8 });
    return len + 0.2;
  },
  stillness: (v) => {
    v.hiss(800, 7000, 0.05, 0.45, { type: "highpass", a: 0.5 });
    [12, 19, 24, 28].forEach((d) => I.glass(v.e, v.out, v.t + 0.55, v.key(d), 2, 0.9));
    const s = v.at(0.55); s.thump(90, 40, 0.9, 0.5); s.hiss(6000, 6000, 1.2, 0.1, { type: "highpass" });
    v.verb(0.5);
    return 2.6;
  },
  judgement: (v) => {
    I.choir(v.e, v.out, v.t, [0, 7, 12].map((d) => v.key(d)), 0.4, 0.8);
    const s = v.at(0.35);
    s.hiss(1800, 1800, 0.05, 1, { type: "highpass", a: 0.001 }); s.hiss(700, 90, 1.4, 0.9, { type: "lowpass", color: "b" });
    s.thump(90, 32, 0.6, 0.8); I.tubular(v.e, v.out, s.t, v.key(12), 1.2, 0.6);
    v.verb(0.4);
    return 2.2;
  },
  firebomb: (v) => {
    v.hiss(3000, 3000, 0.12, 0.5, { type: "highpass" });
    for (let i = 0; i < 4; i++) v.at(rand(0, 0.05)).ring(rand(2000, 5000), GLASS, 0.12, 0.7);
    RECIPES.ignite(v.at(0.05));
    return 0.9;
  },
  barrier: (v) => {
    RECIPES.root(v);
    v.hiss(300, 300, 0.6, 0.6, { type: "lowpass", color: "b", a: 0.1 });
    for (const at of [0, 0.09, 0.18]) v.at(at).thump(110, 50, 0.15, 0.6);
    v.at(0.2).hiss(2500, 2500, 0.03, 0.3, { type: "highpass" });
    return 0.8;
  },
  boss_roar: (v) => {
    const e = v.e, t = v.t, g = e.gain(0), sum = e.gain(1), am = v.flutter(27, 0.4, 1.7);
    for (const [ff, q] of [[520, 3], [950, 4]] as const) sum.connect(e.filt("bandpass", ff, q)).connect(g);
    for (const f of [68, 71, 102]) {
      const o = e.osc("sawtooth", f * 0.8 * v.p, t, t + 1.8, sum);
      o.frequency.exponentialRampToValueAtTime(f * 1.15 * v.p, t + 0.35);
      o.frequency.exponentialRampToValueAtTime(f * 0.7 * v.p, t + 1.6);
    }
    const breath = e.filt("bandpass", 1100, 1);
    e.noiseSrc("w", t, t + 1.8, breath); breath.connect(e.gain(0.25)).connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(2.2, t + 0.12); g.gain.setTargetAtTime(1.4, t + 0.2, 0.3); g.gain.setTargetAtTime(0, t + 1.2, 0.15);
    g.connect(am);
    v.thump(50, 38, 1.5, 0.6);
    v.verb(0.35);
    return 2.2;
  },
  boss_telegraph: (v) => {
    const e = v.e, lp = e.filt("lowpass", 1400), am = v.flutter(9, 0.5, 1.2); lp.connect(am);
    for (const d of [0, 6]) v.tone("square", 440 + d, 660 + d, 1.1, 0.08, { a: 0.3, dest: lp });
    v.tone("sine", 110, 165, 1.1, 0.25, { a: 0.3 });
    return 1.3;
  },
  boss_stomp: (v) => {
    v.thump(62, 26, 0.9, 1); v.hiss(500, 70, 1, 0.9, { type: "lowpass", color: "b", a: 0.003 });
    for (let i = 0; i < 5; i++) v.at(rand(0.02, 0.1)).ring(rand(1500, 4000), GLASS, 0.1);
    v.hiss(3000, 3000, 0.06, 0.5, { type: "highpass" }); v.verb(0.3);
    return 1.3;
  },
  burrow: (v) => {
    const am = v.flutter(13, 0.5, 1.7);
    v.hiss(500, 160, 1.6, 0.8, { type: "lowpass", color: "b", a: 0.15, dest: am });
    v.tone("sine", 85, 38, 1.4, 0.4, { a: 0.1 }); v.hiss(3000, 3000, 1.2, 0.12, { q: 0.8, a: 0.3 });
    return 1.8;
  },
  erupt: (v) => {
    v.hiss(200, 600, 0.05, 0.6, { type: "lowpass", color: "b", a: 0.3 });
    const s = v.at(0.3); s.thump(75, 30, 0.6, 1); s.hiss(3500, 200, 0.8, 0.8, { type: "lowpass", color: "p" }); s.hiss(3000, 3000, 0.6, 0.25, { type: "highpass" });
    v.verb(0.25);
    return 1.3;
  },
  war_cry: (v) => {
    const e = v.e, g = e.gain(1); g.connect(v.out);
    const bps = ([[750, 4], [1250, 5]] as const).map(([f, q]) => { const b = e.filt("bandpass", f, q); b.connect(g); return b; });
    for (const f of [180, 220, 270]) for (const bp of bps) {
      const o = v.tone("sawtooth", f, f * 0.85, 1, 0.45, { a: 0.05, dest: bp });
      o.frequency.exponentialRampToValueAtTime(f * 1.25 * v.p, v.t + 0.5);
    }
    I.brass(e, v.out, v.t + 0.1, v.key(-12), 0.9, 0.9); v.thump(80, 46, 0.6, 0.8); v.verb(0.35);
    return 1.4;
  },
  breath: (v) => {
    roar(v, 500, 3200, 1200, 1.7, 1, 0.35, 21);
    const lp = v.e.filt("lowpass", 280); lp.connect(v.out);
    v.tone("sawtooth", 62, 55, 1.6, 0.25, { a: 0.2, dest: lp });
    return 2;
  },
  sandstorm: (v) => {
    const e = v.e, bp = e.filt("bandpass", 500, 0.7), g = e.gain(0), am = v.flutter(0.7, 0.4, 2.7);
    bp.frequency.setValueAtTime(500, v.t); bp.frequency.exponentialRampToValueAtTime(1400, v.t + 1.2); bp.frequency.exponentialRampToValueAtTime(600, v.t + 2.6);
    g.gain.setValueAtTime(0, v.t); g.gain.linearRampToValueAtTime(0.6, v.t + 0.8); g.gain.setTargetAtTime(0, v.t + 1.8, 0.25);
    e.noiseSrc("p", v.t, v.t + 2.7, bp); bp.connect(g).connect(am);
    v.hiss(2200, 2600, 2.2, 0.05, { q: 12, a: 0.8 });
    return 2.8;
  },
  wings: (v) => {
    for (const at of [0, 0.32, 0.64]) { const s = v.at(at); s.hiss(380, 380, 0.22, 0.8, { type: "lowpass", color: "p", a: 0.07 }); s.thump(70, 45, 0.2, 0.35); }
    return 1;
  },
  forge_hammer: (v) => {
    v.ring(1100, ANVIL, 0.45); v.thump(140, 60, 0.1, 0.5); v.hiss(6000, 6000, 0.18, 0.2, { type: "highpass" }); v.verb(0.25);
    return 0.9;
  },
  rest: (v) => {
    I.strings(v.e, v.out, v.t, [-12, -8, -5, 0].map((d) => v.key(d)), 1.6, 0.7);
    [-12, -8, -5, 0, 4, 7].forEach((d, i) => I.harp(v.e, v.out, v.t + i * 0.09, v.key(d), 1.4, 0.8));
    v.verb(0.3);
    return 2.6;
  },
  // Played through the music's stinger, into the effects bus (index.ts routes these).
  victory: () => 0, defeat: () => 0, relic: () => 0, unlock: () => 0,
};
