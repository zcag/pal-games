// Drilling (design/audio.md section 3): one persistent drill voice (a motor shared by all materials plus a
// family layer per material sound family, crossfaded), the ore's singing ring, breaks, and the two clanks.
import { Kit, clamp, db, mtof, range, rnd, poisson, startAll, Ticker, setTimeoutSafe, type Shot } from "./kit.ts";
import type { Family, Lookup } from "./content.ts";
import { ladder, type Song } from "./score.ts";

interface FamLayer {
  fam: Family;
  g: GainNode;
  srcs: AudioScheduledSourceNode[];
  /** Schedules random grains and events up to `horizon`; rate is 1 + 0.1 p. */
  tick(now: number, horizon: number, rate: number, p: number): void;
}

interface Voice {
  out: GainNode;
  pitch: ConstantSourceNode;
  motor: [OscillatorNode, OscillatorNode];
  motorG: GainNode;
  ring: OscillatorNode;
  ringG: GainNode;
  srcs: AudioScheduledSourceNode[];
  fam: FamLayer | null;
}

export class Drill {
  private v: Voice | null = null;
  private digging = false;
  private digStart = 0;
  private audible = false;
  private stopAt: number | null = null;
  private silentSince = 0;
  private fam: Family = "grit";
  private oreF = 0;
  private lastClank = -1;
  private fm = 92;
  /** The song whose chime pentatonic the glass family and the ore ring use. */
  song!: Song;

  constructor(private k: Kit, private dest: AudioNode, private look: Lookup) {}

  // ---- the persistent voice -----------------------------------------------------------------------------------

  private build(): Voice {
    const k = this.k, now = k.now;
    const out = k.gain(1);
    out.connect(this.dest);
    const pitch = k.ctx.createConstantSource();
    pitch.offset.value = 0;
    const lp = k.filt("lowpass", 700, 1.2), motorG = k.gain(0);
    const a = k.osc("sawtooth", this.fm), b = k.osc("sawtooth", this.fm * 2.01), bg = k.gain(db(-8));
    a.connect(lp); b.connect(bg).connect(lp); lp.connect(motorG).connect(out);
    pitch.connect(a.detune); pitch.connect(b.detune); pitch.connect(lp.detune);
    // The ore ring: a sine with an 8 Hz tremolo of 30%.
    const ring = k.osc("sine", 220), trem = k.osc("sine", 8), tg = k.gain(0.15), rAm = k.gain(0.85), ringG = k.gain(0);
    trem.connect(tg).connect(rAm.gain);
    ring.connect(rAm).connect(ringG).connect(out);
    pitch.connect(ring.detune);
    const srcs = startAll([pitch, a, b, ring, trem], now);
    for (const s of srcs) k.trackPersist(s);
    return { out, pitch, motor: [a, b], motorG, ring, ringG, srcs, fam: null };
  }

  private teardown() {
    const v = this.v;
    if (!v) return;
    const t = this.k.now;
    for (const s of [...v.srcs, ...(v.fam?.srcs ?? [])]) try { s.stop(t + 0.02); } catch { /* stopped */ }
    setTimeoutSafe(() => v.out.disconnect(), 100);
    this.v = null;
  }

  /** Swap the family layer: equal-power crossfade 30 ms, the motor keeps running. */
  private setFamily(fam: Family) {
    const v = this.v!, k = this.k, now = k.now;
    if (v.fam?.fam === fam) return;
    const old = v.fam;
    if (old) {
      old.g.gain.setTargetAtTime(0, now, 0.01);
      for (const s of old.srcs) try { s.stop(now + 0.08); } catch { /* stopped */ }
      setTimeoutSafe(() => old.g.disconnect(), 200);
    }
    const g = k.gain(0);
    g.connect(v.out);
    v.fam = buildFamily(k, fam, g, v.pitch, this.song);
    for (const s of v.fam.srcs) k.trackPersist(s);
    g.gain.setTargetAtTime(1, now, 0.01);
  }

  // ---- events -----------------------------------------------------------------------------------------------

  start(mat: number, find: number, drillLevel: number) {
    const k = this.k, now = k.now;
    this.fam = this.look.family(mat);
    const f = this.look.find(find);
    this.oreF = f ? mtof(ladder(this.song, Math.min(15, f.tier - 1))) / 2 : 0;
    this.fm = 92 * Math.pow(2, Math.floor(drillLevel / 3) / 12);
    this.digging = true;
    this.digStart = now;
    this.stopAt = null;
    if (this.audible && this.v) {
      // Continuing from the last dig: no spin-up, just the family.
      this.setFamily(this.fam);
      this.setRing();
    }
  }

  private setRing() {
    const v = this.v!, now = this.k.now;
    if (this.oreF) v.ring.frequency.setTargetAtTime(this.oreF, now, 0.01);
    v.ringG.gain.setTargetAtTime(this.oreF ? db(-34) : 0, now, 0.02);
  }

  private spinUp() {
    if (!this.v) this.v = this.build();
    const v = this.v, k = this.k, now = k.now;
    this.audible = true;
    this.setFamily(this.fam);
    this.setRing();
    for (const [i, o] of v.motor.entries()) {
      const f = this.fm * (i ? 2.01 : 1);
      o.frequency.cancelScheduledValues(now);
      o.frequency.setValueAtTime(f * 0.7, now);
      o.frequency.exponentialRampToValueAtTime(f, now + 0.12);
    }
    v.motorG.gain.cancelScheduledValues(now);
    v.motorG.gain.setTargetAtTime(db(-22), now, 0.08 / 3);
    v.out.gain.cancelScheduledValues(now);
    v.out.gain.setTargetAtTime(1, now, 0.01);
  }

  private spinDown() {
    const v = this.v, k = this.k, now = k.now;
    this.audible = false;
    this.digging = false;
    this.stopAt = null;
    this.silentSince = now;
    if (!v) return;
    for (const o of v.motor) { o.frequency.cancelScheduledValues(now); o.frequency.setTargetAtTime(o.frequency.value / 2, now, 0.08); }
    v.out.gain.cancelScheduledValues(now);
    v.out.gain.setTargetAtTime(0, now, 0.25 / 4);
    v.ringG.gain.setTargetAtTime(0, now, 0.05);
  }

  cancel() { if (this.audible) this.spinDown(); else this.digging = false; }

  /** A drill break: crack + family tail. Called with the break event; spin-down follows unless a dig starts within 120 ms. */
  brk(mat: number, pan: number, by: "drill" | "blast" | "drone" | "fall") {
    if (by === "blast" || by === "fall") return;
    const k = this.k, now = k.now;
    const fam = this.look.family(mat);
    const s = k.shot("break", this.dest, now, by === "drone" ? -14 : this.look.hard(mat) ? 2 : 0, pan);
    const save = k.slow;
    k.slow *= 1 + (rnd() * 2 - 1) * 0.03;
    k.crack(s, -6);
    breakTail(k, s, fam, this.song);
    k.slow = save;
    k.fin(s);
    if (by === "drill") { this.stopAt = now + 0.12; this.digging = false; }
  }

  /** Too hard (dull clank) or unbreakable (ring); at most one per 400 ms, panned to the side pressed. */
  clank(kind: "too_hard" | "unbreakable", pan: number) {
    const k = this.k, now = k.now;
    if (now - this.lastClank < 0.4) return;
    this.lastClank = now;
    const s = k.shot("impact", this.dest, now, -8, pan);
    if (kind === "too_hard") {
      const lp = k.filt("lowpass", 1500, 0.7);
      lp.connect(s.out);
      k.tone(s, { f: 180, f2: 162, glide: 120, a: 1, d: 120, db: -6, to: lp });
      k.tone(s, { f: 270, f2: 243, glide: 120, a: 1, d: 120, db: -6, to: lp });
      k.nz(s, { kind: "white", f: 1000, q: 2, a: 0.5, d: 15, to: lp });
    } else {
      ringBell(k, s, 620, 1);
      k.nz(s, { kind: "white", f: 1000, q: 2, a: 0.5, d: 15 });
    }
    k.fin(s);
  }

  // ---- every frame ------------------------------------------------------------------------------------------

  update(dig: { progress: number; mat: number } | null) {
    const k = this.k, now = k.now;
    if (this.stopAt !== null && now >= this.stopAt && !dig) this.spinDown();
    if (dig && this.digging && !this.audible && now - this.digStart >= 0.12) this.spinUp();
    if (!dig && this.audible && this.stopAt === null && !this.digging) this.spinDown();
    const v = this.v;
    if (!v) return;
    if (!this.audible) {
      if (now - this.silentSince > 5) this.teardown();
      return;
    }
    const p = clamp(dig?.progress ?? 1, 0, 1), rate = 1 + 0.1 * p;
    v.pitch.offset.setTargetAtTime(1200 * Math.log2(rate), now, 0.03);
    if (this.oreF) v.ringG.gain.setTargetAtTime(db(-34 + 12 * p), now, 0.03);
    v.fam?.tick(now, now + 0.1, rate, p);
  }

  get active() { return this.audible; }
}

/** The unbreakable ring: partials 1, 2.76, 5.40, 8.93 with decays 900/500/300/150 ms x `decay` and 0/-6/-12/-18 dB. */
export function ringBell(k: Kit, s: Shot, f: number, decay: number) {
  k.bell(s, f, [[1, 900 * decay, 0], [2.76, 500 * decay, -6], [5.4, 300 * decay, -12], [8.93, 150 * decay, -18]]);
}

/** The family's break tail (section 3.2). */
export function breakTail(k: Kit, s: Shot, fam: Family, song: Song) {
  switch (fam) {
    case "soft":
      k.nz(s, { kind: "brown", type: "lowpass", f: 900, f2: 300, sweep: 120, q: 0.7, a: 2, d: 120 });
      k.thump(s, 90, 50, 80, -10);
      break;
    case "wet": k.nz(s, { kind: "pink", f: 800, f2: 200, sweep: 150, q: 4, a: 2, d: 150, db: -2 }); break;
    case "hard":
      k.nz(s, { kind: "white", f: 1200, q: 0.8, a: 1, d: 180, db: -4 });
      k.thump(s, 70, 45, 120, -6);
      k.bell(s, 2350, [[1, 220, 0], [1.47, 180, -4], [2.1, 140, -8]], -18);
      break;
    case "glass": {
      const n = 3 + Math.floor(rnd() * 3), top = 5 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) k.tone(s, { f: mtof(ladder(song, top + 5 - i) + 12), a: 2, d: 180, db: -14, at: s.at + i * 0.025 });
      k.nz(s, { kind: "white", type: "highpass", f: 3000, q: 0.7, a: 1, d: 90, db: -12 });
      break;
    }
    case "squish":
      k.tone(s, { f: 600, f2: 150, glide: 60, a: 1, d: 80, db: -10 });
      k.nz(s, { kind: "pink", f: 500, q: 1, a: 5, d: 200, db: -14 });
      break;
    case "rumble":
      k.thump(s, 55, 30, 300, -6);
      k.nz(s, { kind: "brown", type: "lowpass", f: 200, q: 0.7, a: 5, d: 1000, db: -8 });
      break;
    case "chisel":
      for (let i = 0; i < 3; i++) {
        const at = s.at + i * 0.03;
        k.nz(s, { kind: "white", f: 2200 * (i % 2 ? 1.05 : 0.95), q: 4, a: 1, d: 25, db: -10, at });
        k.tone(s, { f: 520 * (i % 2 ? 1.05 : 0.95), a: 1, d: 30, db: -16, at });
      }
      k.nz(s, { kind: "pink", type: "lowpass", f: 1500, q: 0.7, a: 2, d: 250, db: -12, at: s.at + 0.09 });
      break;
    case "hum": k.bell(s, 110, [[1, 1400, 0], [2, 1100, -4], [3, 800, -8], [4.2, 500, -12]], -10); break;
    case "grit": default:
      k.nz(s, { kind: "white", f: 1200, q: 0.8, a: 1, d: 180, db: -6 });
      k.thump(s, 70, 45, 120, -8);
      break;
  }
}

// ---- family layers (section 3.2) -----------------------------------------------------------------------------

function buildFamily(k: Kit, fam: Family, g: GainNode, pitch: ConstantSourceNode, song: Song): FamLayer {
  const srcs: AudioScheduledSourceNode[] = [];
  const now = k.now;
  const det = (...ps: AudioParam[]) => { for (const p of ps) pitch.connect(p); };
  const noise = (kind: "white" | "pink" | "brown") => { const n = k.noiseSrc(kind); det(n.detune); srcs.push(n); return n; };
  const osc = (type: OscillatorType, f: number) => { const o = k.osc(type, f); det(o.detune); srcs.push(o); return o; };
  const filt = (type: BiquadFilterType, f: number, q = 0.707) => { const b = k.filt(type, f, q); det(b.detune); return b; };
  /** grit: white → HP(300) → BP(bp, 1.2), square AM at `am` Hz depth 40%; optional brown body → LP(250) at -22 dB. */
  const grit = (bp: number, am: number, level: number, body: boolean) => {
    const n = noise("white"), hp = filt("highpass", 300), b = filt("bandpass", bp, 1.2), amg = k.gain(0.8), lfo = osc("square", am), lg = k.gain(0.2), lv = k.gain(db(level));
    n.connect(hp).connect(b).connect(amg).connect(lv).connect(g);
    lfo.connect(lg).connect(amg.gain);
    if (body) { const bn = noise("brown"), lp = filt("lowpass", 250), bg = k.gain(db(-22)); bn.connect(lp).connect(bg).connect(g); }
  };
  const shotInto = (at: number, gainDb: number) => k.shot("drill", g, at, gainDb);
  let tick: FamLayer["tick"] = () => {};

  switch (fam) {
    case "soft": {
      const n = noise("brown"), lp = filt("lowpass", 700, 0.7), gr = k.gain(0.7), lv = k.gain(db(-16));
      n.connect(lp).connect(gr).connect(lv).connect(g);
      const t = new Ticker(() => 1 / 14);
      tick = (now, h, rate) => { t.interval = () => 1 / (14 * rate); for (const at of t.due(now, h)) gr.gain.setTargetAtTime(range(0.4, 1), at, 0.012); };
      break;
    }
    case "wet": {
      const n = noise("pink"), bp = filt("bandpass", 400, 3), lfo = osc("sine", 5), lg = k.gain(150), lv = k.gain(db(-17));
      n.connect(bp).connect(lv).connect(g);
      lfo.connect(lg).connect(bp.frequency);
      const t = new Ticker(() => 1 / range(3, 5));
      tick = (now, h, rate) => {
        for (const at of t.due(now, h)) { const s = shotInto(at, -22); k.tone(s, { f: 180 * rate, f2: 120 * rate, glide: 40, a: 3, d: 40 }); k.fin(s); }
      };
      break;
    }
    case "grit": grit(1800, 22, -16, true); break;
    case "hard": {
      grit(3200, 30, -15, false);
      const og = k.gain(0.6), lv = k.gain(db(-26));
      osc("sine", 2350).connect(og); osc("sine", 3410).connect(og);
      og.connect(lv).connect(g);
      const fl = new Ticker(() => 1 / 12), sp = new Ticker(() => poisson(1 / 25));
      tick = (now, h, rate) => {
        for (const at of fl.due(now, h)) og.gain.setTargetAtTime(range(0.2, 1), at, 0.02);
        for (const at of sp.due(now, h)) { const s = shotInto(at, -24); k.nz(s, { kind: "white", type: "highpass", f: 4000 * rate, q: 0.7, a: 0.5, d: 10 }); k.fin(s); }
      };
      break;
    }
    case "glass": {
      grit(1800, 22, -19, false);
      const t = new Ticker(() => range(0.09, 0.16));
      tick = (now, h) => {
        for (const at of t.due(now, h)) {
          const pc = (song.pentBase + song.pent[Math.floor(rnd() * song.pent.length)]) % 12;
          const midi = 84 + pc + (rnd() < 0.5 ? 0 : 12);
          const s = shotInto(at, -22); k.tone(s, { f: mtof(midi), a: 2, d: 180 }); k.fin(s);
        }
      };
      break;
    }
    case "squish": {
      const n = noise("pink"), lp = filt("lowpass", 900), bp = filt("bandpass", 500, 4), lfo = osc("sine", 3), lg = k.gain(200), lv = k.gain(db(-12));
      n.connect(lp).connect(bp).connect(lv).connect(g);
      lfo.connect(lg).connect(bp.frequency);
      const t = new Ticker(() => poisson(1 / 6));
      tick = (now, h, rate) => { for (const at of t.due(now, h)) { const s = shotInto(at, -24); k.tone(s, { f: 300 * rate, f2: 500 * rate, glide: 30, a: 2, d: 40 }); k.fin(s); } };
      break;
    }
    case "rumble": {
      const n = noise("brown"), lp = filt("lowpass", 180), lv = k.gain(db(-14));
      n.connect(lp).connect(lv).connect(g);
      const sub = osc("sine", 45), am = k.gain(0.5), lfo = osc("sine", 9), lg = k.gain(0.5), sv = k.gain(db(-18));
      sub.connect(am).connect(sv).connect(g); lfo.connect(lg).connect(am.gain);
      grit(900, 22, -22, false);
      const t = new Ticker(() => poisson(1 / 12));
      tick = (now, h) => { for (const at of t.due(now, h)) { const s = shotInto(at, -26); k.nz(s, { kind: "white", type: "highpass", f: 3000, q: 0.7, a: 0.5, d: 10 }); k.fin(s); } };
      break;
    }
    case "chisel": {
      grit(900, 22, -26, false);
      const t = new Ticker(() => 1 / 6);
      let alt = 1;
      tick = (now, h, rate) => {
        t.interval = () => 1 / (6 * rate);
        for (const at of t.due(now, h)) {
          alt = -alt;
          const m = rate * (1 + alt * 0.05), s = shotInto(at, 0);
          k.nz(s, { kind: "white", f: 2200 * m, q: 4, a: 1, d: 25, db: -12 });
          k.tone(s, { f: 520 * m, a: 1, d: 30, db: -16 });
          k.fin(s);
        }
      };
      break;
    }
    case "hum": {
      grit(1800, 22, -18, false);
      // The hum sits 6 dB under the design's figures: with its +8 dB swell it otherwise peaks 6 dB over the other families (lab drill-hum).
      const r = 55, bp = filt("bandpass", 2 * r, 8), hg = k.gain(db(-10)), post = k.gain(1);
      const mk = (f: number, d: number) => { const o = osc("sine", f), og = k.gain(db(d)); o.connect(og).connect(bp); };
      mk(r, -16); mk(2 * r + 0.7, -20); mk(3 * r - 0.5, -26);
      // The band-pass eats level; a direct path keeps the fundamental present.
      const direct = osc("sine", r), dg = k.gain(db(-26));
      direct.connect(dg).connect(post);
      bp.connect(hg).connect(post);
      post.connect(g);
      tick = (now, _h, _r, p) => post.gain.setTargetAtTime(db(8 * p), now, 0.05);
      break;
    }
  }
  startAll(srcs, now);
  return { fam, g, srcs, tick };
}
