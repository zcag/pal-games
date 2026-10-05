// The pod (design/audio.md section 5): continuous voices read from PodView every frame (idle hum, thrust,
// strain, treads, fall wind, heat ticks, teleport channel, the Lift), impacts, the scanner, the warnings.
import { Kit, Persist, Ticker, clamp, db, hold, mtof, poisson, range, rnd, startAll } from "./kit.ts";
import type { Graph } from "./graph.ts";
import type { Lookup } from "./content.ts";
import { ringBell } from "./drill.ts";
import { HAZ, W, type GameView, type PodView } from "../../game/types.ts";
import { SEED, degree, ladder, type Song } from "./score.ts";

type V<T> = Persist<T & { srcs: AudioScheduledSourceNode[] }>;

export { warnSound, type WarnSound } from "./pure.ts";
import { warnSound, type WarnSound } from "./pure.ts";

export class PodSounds {
  private k: Kit;
  private idle: V<{ o: OscillatorNode; lfo: OscillatorNode }>;
  private thrust: V<{ bp: BiquadFilterNode; lp: BiquadFilterNode; t1: OscillatorNode; t2: OscillatorNode; tlp: BiquadFilterNode; tg: GainNode }>;
  private strain: V<{ o: OscillatorNode; am: GainNode }>;
  private tread: V<{ o: OscillatorNode }>;
  private wind: V<{ bp: BiquadFilterNode }>;
  private rush: V<{ lp: BiquadFilterNode }>;
  private boil: V<object>;
  private tele: V<{ a: OscillatorNode; b: OscillatorNode; bp: BiquadFilterNode; trem: OscillatorNode }>;
  private lift: V<{ a: OscillatorNode; b: OscillatorNode; w: OscillatorNode }>;
  private wasThrust = false;
  private wasFuel = true;
  private treadT = new Ticker(() => 1);
  private strainT = new Ticker(() => 1 / 11);
  private heatT = new Ticker(() => 0.6);
  private lastVx = 0;
  private lastCrunch = -1;
  private warns = new Map<string, { sound: WarnSound; every: number; next: number }>();
  private riding = false;
  private liftRow = 0;
  private liftBiome = -1;
  private slowUntil = 0;
  /** The pod took damage this tick (for the blast's muffled ears). */
  hitAt = -1;
  song!: Song;

  constructor(private g: Graph, private look: Lookup) {
    const k = (this.k = g.kit), fx = g.bus.fx, tells = g.bus.tells;
    this.idle = new Persist(k, fx, (out) => {
      const o = k.osc("triangle", 55), lp = k.filt("lowpass", 300), lfo = k.osc("sine", 0.2), lg = k.gain(3);
      lfo.connect(lg).connect(o.detune);
      o.connect(lp).connect(out);
      return { srcs: startAll([o, lfo], k.now), o, lfo };
    });
    this.thrust = new Persist(k, fx, (out) => {
      const n = k.noiseSrc("pink"), bp = k.filt("bandpass", 440, 0.9), lp = k.filt("lowpass", 4000), ng = k.gain(db(-16));
      n.connect(bp).connect(lp).connect(ng).connect(out);
      const t1 = k.osc("sawtooth", 70), t2 = k.osc("sawtooth", 71), tlp = k.filt("lowpass", 280, 1.5), tg = k.gain(db(-20) * 0.5);
      t1.connect(tlp); t2.connect(tlp); tlp.connect(tg).connect(out);
      return { srcs: startAll([n, t1, t2], k.now), bp, lp, t1, t2, tlp, tg };
    });
    this.strain = new Persist(k, fx, (out) => {
      const o = k.osc("sawtooth", 108), n = k.noiseSrc("pink"), bp = k.filt("bandpass", 180, 3), am = k.gain(1), og = k.gain(0.3), lp = k.filt("lowpass", 1400);
      o.connect(og).connect(lp).connect(am); n.connect(bp).connect(am); am.connect(out);
      return { srcs: startAll([o, n], k.now), o, am };
    });
    this.tread = new Persist(k, fx, (out) => {
      const o = k.osc("sawtooth", 55), lp = k.filt("lowpass", 400);
      o.connect(lp).connect(out);
      return { srcs: startAll([o], k.now), o };
    });
    this.wind = new Persist(k, fx, (out) => {
      const n = k.noiseSrc("white"), bp = k.filt("bandpass", 600, 6);
      n.connect(bp).connect(out);
      return { srcs: startAll([n], k.now), bp };
    });
    this.rush = new Persist(k, fx, (out) => {
      const n = k.noiseSrc("pink"), lp = k.filt("lowpass", 600);
      n.connect(lp).connect(out);
      return { srcs: startAll([n], k.now), lp };
    });
    this.boil = new Persist(k, tells, (out) => {
      const n = k.noiseSrc("pink"), bp = k.filt("bandpass", 2500, 1);
      n.connect(bp).connect(out);
      return { srcs: startAll([n], k.now) };
    });
    this.tele = new Persist(k, fx, (out) => {
      const a = k.osc("sawtooth", 110), b = k.osc("sawtooth", 110 * 1.006), bp = k.filt("bandpass", 220, 4), tg = k.gain(0.7), trem = k.osc("sine", 4), trg = k.gain(0.3);
      a.connect(bp); b.connect(bp); bp.connect(tg).connect(out);
      trem.connect(trg).connect(tg.gain);
      const sh = k.noiseSrc("white"), hp = k.filt("highpass", 5000), shg = k.gain(0.15);
      sh.connect(hp).connect(shg).connect(out);
      return { srcs: startAll([a, b, trem, sh], k.now), a, b, bp, trem };
    });
    this.lift = new Persist(k, fx, (out) => {
      const a = k.osc("sawtooth", 82), b = k.osc("sawtooth", 164), lp = k.filt("lowpass", 900), mg = k.gain(db(-18) * 0.6);
      a.connect(lp); b.connect(lp); lp.connect(mg).connect(out);
      const w = k.osc("sine", 1240), wg = k.gain(db(-30));
      w.connect(wg).connect(out);
      return { srcs: startAll([a, b, w], k.now), a, b, w };
    });
  }

  private pos(x: number, pod: PodView) { return clamp((x - pod.x) / 8, -0.8, 0.8); }

  // ---- every frame ------------------------------------------------------------------------------------------

  update(view: GameView, drop: boolean) {
    const k = this.k, now = k.now, p = view.pod, eng = view.levels.engine ?? 0;
    if (k.slow !== 1 && now > this.slowUntil) k.slow = 1;
    // Idle hum; at 0 fuel it winds down an octave over 1.2 s and stops.
    const fuel = p.fuel > 0 && !p.dead;
    if (fuel) {
      if (!this.wasFuel && this.idle.v) this.idle.v.o.frequency.setTargetAtTime(55, now, 0.1);
      this.idle.set(db(-34), 0.2);
    } else if (this.wasFuel && this.idle.v) {
      this.idle.v.o.frequency.setTargetAtTime(27.5, now, 0.4);
      this.idle.set(0, 0.4);
    } else this.idle.set(0, 0.4);
    this.wasFuel = fuel;

    // Thrust: rocket and turbine pitched by climb speed; engine level adds 1.5 dB and 10% LP per 4 levels.
    const f0 = Math.min(340, 70 + 9 * Math.max(0, -p.vy)), steps = Math.floor(eng / 4);
    const on = p.thrusting && fuel;
    if (on) {
      this.thrust.set(db(1.5 * steps), 0.04 / 3);
      const v = this.thrust.v!;
      v.bp.frequency.setTargetAtTime(300 + 2 * f0, now, 0.03);
      v.lp.frequency.setTargetAtTime(4000 * (1 + 0.1 * steps), now, 0.03);
      v.t1.frequency.setTargetAtTime(f0, now, 0.025);
      v.t2.frequency.setTargetAtTime(f0 * 1.015, now, 0.025);
      v.tlp.frequency.setTargetAtTime(4 * f0 * (1 + 0.1 * steps), now, 0.03);
    } else {
      this.thrust.set(0, 0.04);
      if (this.wasThrust) { const s = k.shot("fx", this.g.bus.fx, now, -20); k.nz(s, { kind: "pink", type: "lowpass", f: 600, q: 0.7, a: 2, d: 150 }); k.fin(s); }
    }
    this.wasThrust = on;

    // Strain above load 4: a beating overtone with a flickering flame.
    if (on && p.load > 4) {
      this.strain.set(db(clamp(-40 + 6 * (p.load - 4), -40, -16)), 0.05);
      const v = this.strain.v!;
      v.o.frequency.setTargetAtTime(1.5 * f0 + 3, now, 0.025);
      for (const at of this.strainT.due(now, now + 0.1)) v.am.gain.setTargetAtTime(range(0.7, 1), at, 0.01);
    } else this.strain.set(0, 0.05);

    // Treads: clacks at 3 |vx| per second, a motor; a brake squeak on a fast stop.
    const vx = Math.abs(p.vx);
    if (p.grounded && vx > 0.2) {
      this.tread.set(db(-24), 0.02);
      this.tread.v!.o.frequency.setTargetAtTime(55 * (1 + vx / 8), now, 0.03);
      this.treadT.interval = () => 1 / (3 * vx);
      for (const at of this.treadT.due(now, now + 0.1)) { const s = k.shot("fx", this.g.bus.fx, at, -24); k.nz(s, { kind: "white", f: 900, q: 3, a: 1, d: 10 }); k.fin(s); }
    } else {
      this.tread.set(0, 0.02);
      this.treadT.reset();
      if (p.grounded && this.lastVx > 4) { const s = k.shot("fx", this.g.bus.fx, now, -30); k.tone(s, { f: 1800, f2: 1500, glide: 80, a: 5, d: 80 }); k.fin(s); }
    }
    this.lastVx = p.grounded ? vx : 0;

    // Falling: the whistle says "this will hurt"; the auto-braked drop gets a soft rush instead.
    if (p.vy > 9 && !p.grounded && !drop && !this.riding) {
      this.wind.set(db(clamp(-40 + (26 / 3) * (p.vy - 9), -40, -14)), 0.03);
      this.wind.v!.bp.frequency.setTargetAtTime(600 + 120 * (p.vy - 9), now, 0.03);
    } else this.wind.set(0, 0.05);
    if (p.vy > 2 && drop && !this.riding) {
      this.rush.set(db(-26), 0.08);
      this.rush.v!.lp.frequency.setTargetAtTime(300 + 40 * p.vy, now, 0.05);
    } else this.rush.set(0, 0.1);

    // Heat ticks above 0.75 (tells bus); a boil hiss at full.
    if (p.heat > 0.75 && !p.dead) {
      const mean = 0.6 - (0.48 * (p.heat - 0.75)) / 0.25;
      this.heatT.interval = () => poisson(Math.max(0.12, mean));
      for (const at of this.heatT.due(now, now + 0.1)) {
        const s = k.shot("tell", this.g.bus.tells, at, -18, (rnd() - 0.5) * 0.6);
        k.nz(s, { kind: "white", f: 3500, q: 10, a: 0.5, d: 25 });
        k.fin(s);
      }
    }
    this.boil.set(p.heat >= 0.99 && !p.dead ? db(-24) : 0, 0.1);

    // The teleport channel: pitch 110 to 880 Hz, tremolo 4 to 16 Hz, louder as it rises; the music ducks.
    const c = p.channel;
    if (c > 0) {
      this.tele.set(db(-20 + 12 * c), 0.03);
      const v = this.tele.v!, f = 110 * Math.pow(8, c);
      v.a.frequency.setTargetAtTime(f, now, 0.03);
      v.b.frequency.setTargetAtTime(f * 1.006, now, 0.03);
      v.bp.frequency.setTargetAtTime(2 * f, now, 0.03);
      v.trem.frequency.setTargetAtTime(4 + 12 * c, now, 0.03);
      this.g.duckBus("tele", "music", -Math.min(9, 3 * Math.floor(c / 0.25 + 1e-6)), 50, 400, 0.1);
    } else this.tele.set(0, 0.03);

    // The Lift: motor and whine pitched by speed, a clack every 5 rows, a ding per biome boundary.
    if (this.riding) {
      const sp = clamp(Math.abs(p.vy) / 40, 0.05, 1.5);
      const v = this.lift.v;
      if (v) {
        v.a.frequency.setTargetAtTime(82 * sp, now, 0.05);
        v.b.frequency.setTargetAtTime(164 * sp, now, 0.05);
        v.w.frequency.setTargetAtTime(1240 * sp, now, 0.05);
      }
      const r5 = Math.floor(p.y / 5);
      if (r5 !== this.liftRow) { this.liftRow = r5; const s = k.shot("fx", this.g.bus.fx, now, -22); k.nz(s, { kind: "white", f: 700, q: 3, a: 1, d: 20 }); k.fin(s); }
      const row = Math.floor(p.y), b = row >= 0 && row < view.world.biome.length / W ? view.world.biome[row * W + Math.floor(p.x)] : -1;
      if (b !== this.liftBiome && this.liftBiome >= 0 && b >= 0) { const s = k.shot("fx", this.g.bus.fx, now, -20); k.tone(s, { f: 1568, a: 2, d: 300 }); k.fin(s); }
      this.liftBiome = b;
    }

    // Repeating warnings.
    for (const [, w] of this.warns) if (w.every > 0 && now >= w.next) { this.warn(w.sound); w.next = now + w.every; }
  }

  // ---- one-shots ----------------------------------------------------------------------------------------------

  land(speed: number, damage: number, frac: number) {
    if (speed <= 3) return;
    const k = this.k, s = k.shot("impact", this.g.bus.fx, k.now, Math.min(-6, -24 + 2.2 * (speed - 3)));
    k.thump(s, 110, 45, 90, 0);
    k.nz(s, { kind: "brown", type: "lowpass", f: 600, q: 0.7, a: 1, d: 60, db: -4 });
    k.fin(s);
    if (damage > 0) this.crunch(frac);
  }

  /** Metal crunch: gain -12 + 10 min(1, 3 frac) dB. */
  crunch(frac: number, extraDb = 0) {
    const k = this.k, now = k.now;
    if (now - this.lastCrunch < 0.4) return;
    this.lastCrunch = now;
    this.hitAt = now;
    // 6 dB under the design's -12 + 10 min(1, 3 frac): three sines and a noise band sum hot (lab impacts).
    const s = k.shot("impact", this.g.bus.fx, now, -18 + 10 * Math.min(1, frac * 3) + extraDb);
    k.nz(s, { kind: "white", f: 1500, q: 1, a: 1, d: 150 });
    [310, 467, 803].forEach((f, i) => k.tone(s, { f, a: 1, d: [80, 140, 200][i], db: -6 }));
    k.thump(s, 60, 50, 150, -2);
    k.fin(s);
  }

  bump(speed: number, damage: number, frac: number) {
    const k = this.k, now = k.now;
    if (damage <= 0) { const s = k.shot("impact", this.g.bus.fx, now, -18); k.thump(s, 140, 90, 50, 0); k.fin(s); return; }
    const s = k.shot("impact", this.g.bus.fx, now, -8);
    ringBell(k, s, 400, 0.5);
    k.fin(s);
    this.crunch(frac);
    void speed;
  }

  /** Hull hit from a hazard: the crunch plus a source layer (lava sizzle, arc zap tail); spores are silent. */
  hazardHit(source: string, frac: number, world: { sizzle(at: number, gainDb: number): void; zapTail(): void }) {
    if (/spore/i.test(source)) return;
    if (this.k.now - this.lastCrunch < 0.4) return;
    this.crunch(frac);
    if (/lava|heat|fire/i.test(source)) world.sizzle(this.k.now, -10);
    if (/arc|pylon|zap/i.test(source)) world.zapTail();
  }

  wreck() {
    const k = this.k, now = k.now;
    this.lastCrunch = -1;
    this.crunch(1, 2); // the crunch at 0 dB
    const s = k.shot("impact", this.g.bus.fx, now, -10);
    k.nz(s, { kind: "white", type: "lowpass", f: 8000, f2: 200, sweep: 1200, q: 0.7, a: 2, d: 1200 });
    k.thump(s, 40, 32, 900, 0);
    k.fin(s);
    this.g.wreckDip();
    // Everything after it plays at half rate for the slow motion.
    k.slow = 0.5;
    this.slowUntil = now + 1.2;
  }

  rescue(kind: "wreck" | "tow") {
    const k = this.k, now = k.now;
    if (kind === "wreck") { this.teleport("done"); return; }
    const s = k.shot("fx", this.g.bus.fx, now, -20);
    k.tone(s, { type: "sawtooth", f: 140, f2: 220, glide: 3000, a: 50, hold: [1, 2.9, 100], lp: 800 });
    for (let t = 0; t < 3; t += 0.12) k.nz(s, { kind: "white", f: 2500, q: 3, a: 0.5, d: 10, db: -6, at: now + t });
    k.fin(s);
  }

  teleport(phase: "start" | "cancel" | "done") {
    const k = this.k, now = k.now;
    if (phase === "cancel") {
      const v = this.tele.v;
      if (v) { for (const o of [v.a, v.b]) { hold(o.frequency, now); o.frequency.setTargetAtTime(o.frequency.value / 2, now, 0.1); } }
      const s = k.shot("fx", this.g.bus.fx, now, -14);
      k.nz(s, { kind: "white", f: 3000, q: 1, a: 1, d: 300 });
      k.fin(s);
    } else if (phase === "done") {
      const s = k.shot("fx", this.g.bus.fx, now, -8);
      k.nz(s, { kind: "pink", f: 4000, f2: 200, sweep: 450, q: 2, a: 300, d: 150 });
      k.thump(s, 80, 55, 200, -2, now + 0.45);
      k.fin(s);
    }
  }

  liftEvent(phase: "start" | "stop", pod: PodView) {
    const k = this.k, now = k.now;
    if (phase === "start") {
      this.riding = true;
      this.liftRow = Math.floor(pod.y / 5);
      this.liftBiome = -1;
      const s = k.shot("fx", this.g.bus.fx, now, -12);
      k.thump(s, 120, 90, 60, 0);
      k.fin(s);
      this.lift.set(1, 0.4 / 3);
    } else {
      this.riding = false;
      const s = k.shot("fx", this.g.bus.fx, now, -24);
      k.tone(s, { f: 2100, f2: 1800, glide: 200, a: 10, d: 200 });
      k.thump(s, 120, 90, 60, 12, now + 0.2);
      k.fin(s);
      this.lift.set(0, 0.05);
    }
  }

  /** Scanner: ping, sweep, and the ring crossing what it reveals (section 5.2). */
  scan(x: number, y: number, r: number, view: GameView, passive: boolean) {
    const k = this.k, now = k.now, tells = this.g.bus.fx, off = passive ? -8 : 0, pod = view.pod;
    const s = k.shot("fx", tells, now, off);
    k.tone(s, { f: 1760, a: 3, d: 400, db: -12 });
    const dur = Math.max(0.2, r / 25);
    k.nz(s, { kind: "white", f: 3000, f2: 600, sweep: dur * 1000, q: 6, a: 5, d: dur * 1000, db: -14 });
    k.fin(s);
    const w = view.world, ores: { d: number; x: number; tier: number }[] = [], dangers: { d: number; x: number }[] = [], relics: { d: number; x: number }[] = [];
    const H = w.mat.length / W;
    for (let ty = Math.max(0, Math.floor(y - r)); ty <= Math.min(H - 1, Math.ceil(y + r)); ty++)
      for (let tx = Math.max(0, Math.floor(x - r)); tx <= Math.min(W - 1, Math.ceil(x + r)); tx++) {
        const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
        if (d > r) continue;
        const i = ty * W + tx, f = w.find[i], h = w.haz[i];
        if (f) { const fi = this.look.find(f); if (fi?.kind === "artifact") relics.push({ d, x: tx }); else if (fi) ores.push({ d, x: tx, tier: fi.tier }); }
        if (h === HAZ.GAS || h === HAZ.LAVA_POCKET) dangers.push({ d, x: tx });
      }
    for (const e of view.entities) if (e.kind === "crate") { const d = Math.hypot(e.x - x, e.y - y); if (d <= r) relics.push({ d, x: e.x }); }
    ores.sort((a, b) => a.d - b.d);
    for (const o of ores.slice(0, 8)) {
      const p = k.shot("chime", this.g.bus.fx, now + o.d / 25, -26 + off, this.pos(o.x, pod));
      k.tone(p, { f: mtof(ladder(this.song, Math.min(15, o.tier - 1))), a: 2, d: 120 });
      k.fin(p);
    }
    dangers.sort((a, b) => a.d - b.d);
    for (const o of dangers.slice(0, 4)) {
      const p = k.shot("tell", this.g.bus.tells, now + o.d / 25, -22 + off, this.pos(o.x, pod));
      k.tone(p, { type: "triangle", f: 330, a: 2, d: 90 });
      k.tone(p, { type: "triangle", f: 330, a: 2, d: 90, at: now + o.d / 25 + 0.06 });
      k.fin(p);
    }
    for (const o of relics.slice(0, 3)) {
      const p = k.shot("chime", this.g.bus.fx, now + o.d / 25, -20 + off, this.pos(o.x, pod));
      k.fm(p, mtof(degree(this.song, SEED[0][0]!, 1)), 3.5, 2, 0.3, 500, 3, 900);
      k.fin(p);
    }
  }

  /** Q during a Ferrum storm: a detuned buzz. */
  scanBlind() {
    const k = this.k, s = k.shot("fx", this.g.bus.fx, k.now, -16);
    k.tone(s, { type: "square", f: 220, a: 5, d: 250, lp: 2000 });
    k.tone(s, { type: "square", f: 233, a: 5, d: 250, lp: 2000 });
    k.fin(s);
  }

  // ---- warnings ---------------------------------------------------------------------------------------------

  warnEvent(what: string, level: number) {
    const w = warnSound(what, level), key = what;
    const prev = this.warns.get(key);
    if (!w.sound) { this.warns.delete(key); return; }
    if (prev && prev.sound === w.sound) return;
    // The 1 s fuel beep replaces the 2 s home beep; the alarm replaces the creak (same key or explicit).
    if (w.sound === "fuelBeep") { const h = this.warns.get("home"); if (h?.sound === "homeBeep") h.every = 0; }
    this.warn(w.sound);
    this.warns.set(key, { ...w, next: this.k.now + w.every });
  }

  private warn(s: WarnSound) {
    const k = this.k, now = k.now, bus = this.g.bus.tells;
    const sh = k.shot("tell", bus, now, 0, 0, 5);
    switch (s) {
      case "homeDouble": k.tone(sh, { f: 880, a: 5, d: 70, db: -16 }); k.tone(sh, { f: 880, a: 5, d: 70, db: -16, at: now + 0.09 }); break;
      case "homeBeep": k.tone(sh, { type: "triangle", f: 988, a: 5, d: 90, db: -14 }); break;
      case "homeLow": k.tone(sh, { f: 220, f2: 196, glide: 500, a: 20, d: 500, db: -12 }); k.tone(sh, { f: 165, a: 20, d: 500, db: -14 }); break;
      case "fuelBeep": k.tone(sh, { f: 1175, a: 3, d: 60, db: -14 }); break;
      case "sealed": k.tone(sh, { f: 147, a: 20, d: 700, db: -12 }); k.tone(sh, { f: 156, a: 20, d: 700, db: -12 }); break;
      case "creak": {
        k.nz(sh, { kind: "pink", f: 200, f2: 140, sweep: 650, q: 12, a: 80, d: 650, db: -10 });
        const o = k.tone(sh, { f: 70, a: 80, d: 650, db: -16 });
        const lfo = k.osc("sine", 3), lg = k.gain(6);
        lfo.connect(lg).connect(o.src.frequency);
        lfo.start(now); sh.srcs.push(lfo);
        break;
      }
      case "alarm":
        for (const at of [now, now + 0.11]) k.tone(sh, { type: "square", f: 1320, f2: 990, glide: 70, a: 2, d: 70, db: -14, lp: 3000, at });
        break;
    }
    k.fin(sh);
  }

  get onLift() { return this.riding; }
}
