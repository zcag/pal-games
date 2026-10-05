// Town and UI (design/audio.md section 7): the town ambience by day phase, the home sting, the sale (rows,
// count-up ticks, the chord sized by the sale), purchases, tier-ups, research, achievements, toasts, buttons,
// panels and items.
import { Kit, Persist, Ticker, clamp, db, mtof, range, rnd, startAll } from "./kit.ts";
import type { Graph } from "./graph.ts";
import type { Music } from "./music.ts";
import type { Lookup } from "./content.ts";
import { SONGS, degree, ladder } from "./score.ts";
import * as I from "./inst.ts";
import type { Sale } from "../../game/types.ts";

const TOWN = SONGS.town;
/** Mo's fuel station column (art.md 7.2). */
const STATION_X = 21;

export class Town {
  private k: Kit;
  private wind: Persist<{ srcs: AudioScheduledSourceNode[]; lp: BiquadFilterNode }>;
  private gen: Persist<{ srcs: AudioScheduledSourceNode[]; pan: StereoPannerNode }>;
  private windT = new Ticker(() => range(8, 20));
  private birdT = new Ticker(() => range(2, 6));
  private cricketT = new Ticker(() => range(1.2, 3));
  private nightBirdT = new Ticker(() => range(40, 80));
  private lastHover = -1;
  private sales: number[] = [];
  /** The sale's timeline, run from update so Enter can skip to the chord. */
  private sale: { rows: { at: number; tier: number }[]; t0: number; dur: number; ticks: number; total: number; best: boolean; chordAt: number } | null = null;
  private lastTick = -1;
  private tickProgress = 0;
  private lastSaleTotal = 0;
  private lastSaleBest = false;
  /** Fundamentals the UI played (MIDI), for the key checks. */
  log: number[] | null = null;

  constructor(private g: Graph, private music: Music, private look: Lookup) {
    const k = (this.k = g.kit), amb = g.bus.amb;
    this.wind = new Persist(k, amb, (out) => {
      const n = k.noiseSrc("pink"), lp = k.filt("lowpass", 400);
      n.connect(lp).connect(out);
      return { srcs: startAll([n], k.now), lp };
    });
    this.gen = new Persist(k, amb, (out) => {
      const a = k.osc("sawtooth", 50), b = k.osc("sawtooth", 100.3), lp = k.filt("lowpass", 200), am = k.gain(0.9), lfo = k.osc("sine", 0.5), lg = k.gain(0.1), pan = k.panner(0);
      a.connect(lp); b.connect(lp); lp.connect(am).connect(pan).connect(out);
      lfo.connect(lg).connect(am.gain);
      return { srcs: startAll([a, b, lfo], k.now), pan };
    });
  }

  // ---- town ambience (section 7.1) ------------------------------------------------------------------------

  update(onSurface: boolean, phase: number, podX: number) {
    const k = this.k, now = k.now, amb = this.g.bus.amb;
    const night = phase >= 0.78 || phase < 0.2;
    this.wind.set(onSurface ? db(night ? -26 : -30) : 0, onSurface ? 0.15 : 0.2);
    if (this.wind.v) for (const at of this.windT.due(now, now + 0.1)) this.wind.v.lp.frequency.setTargetAtTime(range(250, 600), at, range(3, 6));
    const near = Math.abs(podX - STATION_X) < 4;
    this.gen.set(onSurface ? db(-34 + (near ? 6 : 0)) : 0, 0.3);
    if (this.gen.v) this.gen.v.pan.pan.setTargetAtTime(clamp((STATION_X - podX) / 8, -0.8, 0.8), now, 0.1);
    if (onSurface) {
      // Birds: the dawn chorus 0.22-0.30, daytime calls to 0.75, none from 0.78 to 0.20.
      const dawn = phase >= 0.22 && phase < 0.3, day = phase >= 0.3 && phase < 0.75;
      if (dawn || day) {
        this.birdT.interval = () => (dawn ? range(0.8, 2) : range(2, 6));
        for (const at of this.birdT.due(now, now + 0.1)) this.bird(at, dawn ? -22 : -28);
      }
      // Crickets: in over 0.75-0.82, through the night, out by 0.22.
      const cr = phase >= 0.82 || phase < 0.2 ? 1 : phase >= 0.75 ? (phase - 0.75) / 0.07 : phase < 0.22 ? (0.22 - phase) / 0.02 : 0;
      if (cr > 0.01) for (const at of this.cricketT.due(now, now + 0.1)) this.crickets(at, -30 + 20 * Math.log10(Math.max(0.05, cr)));
      if (night) for (const at of this.nightBirdT.due(now, now + 0.1)) {
        const s = k.shot("amb", amb, at, -30, range(-0.7, 0.7));
        k.tone(s, { f: 400, a: 40, d: 400, at }); k.tone(s, { f: 380, a: 40, d: 400, at: at + 0.6 });
        k.fin(s);
      }
    }
    this.updateSale();
  }

  private bird(at: number, gainDb: number) {
    const k = this.k, s = k.shot("amb", this.g.bus.amb, at, gainDb, range(-0.8, 0.8)), sp = Math.floor(rnd() * 3);
    if (sp === 0) {
      const n = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) k.tone(s, { f: 3000, f2: 5000, glide: 40, a: 2, d: 45, at: at + i * 0.09 });
    } else if (sp === 1) {
      const t = k.tone(s, { f: 2400, a: 20, d: 300, at });
      const m = k.osc("sine", 25), mg = k.gain(400);
      m.connect(mg).connect(t.src.frequency); m.start(at); s.srcs.push(m);
    } else {
      k.tone(s, { f: 2200, a: 10, hold: [1, 0.14, 30], at });
      k.tone(s, { f: 1800, a: 10, hold: [1, 0.14, 30], at: at + 0.16 });
    }
    k.fin(s);
  }

  private crickets(at: number, gainDb: number) {
    const k = this.k;
    for (const [v, dt] of [[0, 0], [1, range(0.5, 1)]] as const) {
      const s = k.shot("amb", this.g.bus.amb, at + dt, gainDb, v ? 0.5 : -0.5), len = range(0.3, 0.6);
      for (let t = 0; t < len; t += 1 / 18) k.tone(s, { f: 4600 * (v ? 1.03 : 1), a: 2, d: 15, at: at + dt + t });
      k.fin(s);
    }
  }

  // ---- surfacing ------------------------------------------------------------------------------------------

  /** Home sting: V then I on a soft pluck, 160 ms apart, with a warm pad swell. */
  homeSting() {
    const k = this.k, now = k.now, ui = this.g.bus.ui;
    const s = k.shot("ui", ui, now, -14);
    for (const [d, dt] of [[4, 0], [7, 0.16]] as const) { const m = degree(TOWN, d, -1); I.pluck(k, s, mtof(m), now + dt, 0, 600); this.log?.push(m); }
    for (const d of [0, 2, 4]) { const m = degree(TOWN, d, -1); I.pad(k, s, mtof(m), now, 0.4, 1600, -10, 2); this.log?.push(m); }
    k.fin(s);
  }

  // ---- the sale (section 7.2) -----------------------------------------------------------------------------

  /** A dock: rows every 60 ms, then the count-up ticks, then the chord. The UI can skip to the chord. */
  dock(sale: Sale) {
    const now = this.k.now;
    const rows = sale.lines.map((l, i) => ({ at: now + i * 0.06, tier: this.look.find(l.find)?.tier ?? 1 }));
    const t0 = now + rows.length * 0.06 + 0.05;
    const total = Math.max(0, sale.total);
    const dur = total > 0 ? Math.min(1.6, 0.6 + 0.25 * Math.log10(Math.max(1, total))) : 0;
    this.sale = { rows, t0, dur, ticks: 0, total, best: sale.best, chordAt: t0 + dur };
    this.lastSaleTotal = total;
    this.lastSaleBest = sale.best;
  }

  private updateSale() {
    const sl = this.sale;
    if (!sl) return;
    const k = this.k, now = k.now, ui = this.g.bus.ui;
    while (sl.rows.length && sl.rows[0].at <= now + 0.05) {
      const r = sl.rows.shift()!;
      const s = k.shot("ui", ui, Math.max(now, r.at), -22);
      const m = ladder(TOWN, Math.min(15, r.tier - 1));
      k.tone(s, { f: mtof(m), a: 2, d: 90 });
      k.fin(s);
      this.log?.push(m);
    }
    // Count-up ticks: the UI may drive them (saleTick with progress); otherwise the timeline does, about 20/s.
    if (now >= sl.t0 && now < sl.chordAt && now - this.lastTick >= 0.05) this.tick((now - sl.t0) / Math.max(0.01, sl.dur));
    if (now >= sl.chordAt) { this.chord(sl.total, sl.best); this.sale = null; }
  }

  /** A count-up tick at progress 0..1: the pitch walks up two octaves of the town pentatonic. At most 25 per second. */
  tick(progress: number) {
    const k = this.k, now = k.now;
    if (now - this.lastTick < 0.04) return;
    this.lastTick = now;
    this.tickProgress = progress;
    const m = ladder(TOWN, Math.round(clamp(progress, 0, 1) * 10));
    const s = k.shot("ui", this.g.bus.ui, now, -24);
    k.tone(s, { f: mtof(m + 12), a: 1, d: 8 });
    k.fin(s);
    this.log?.push(m + 12);
  }

  /** Skip the count-up: straight to the chord. */
  skip() { if (this.sale) { this.sale.rows = []; this.sale.chordAt = this.k.now; this.updateSale(); } }

  /** The final chord sized by total / the median of the last 10 sales; the best adds a flourish and a coin shower. */
  chord(total = this.lastSaleTotal, best = this.lastSaleBest) {
    const k = this.k, now = k.now, ui = this.g.bus.ui;
    const sorted = [...this.sales].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : total;
    this.sales.push(total);
    if (this.sales.length > 10) this.sales.shift();
    const size = median > 0 ? total / median : 1;
    let len: number;
    if (size < 0.7) { len = 0.6; this.music.chord(TOWN, [0, 4], now, len, ui, -10, -1); }
    else if (size <= 1.8) { len = 1.2; this.music.chord(TOWN, [0, 2, 4, 7], now, len, ui, -10, -1); }
    else {
      len = 2;
      this.music.chord(TOWN, [0, 4, 7, 9, 11], now, len, ui, -10, -1);
      const s = k.shot("ui", ui, now, -12);
      I.bass(k, s, mtof(degree(TOWN, 0, -3)), now, len, 0);
      for (let i = 0; i < 4; i++) I.bell(k, s, mtof(ladder(TOWN, 10 + i)), now + 0.1 + i * 0.05, -10, false, 900);
      k.fin(s);
    }
    if (best) {
      const s = k.shot("ui", ui, now + 0.15, -12);
      for (let i = 0; i < 6; i++) { const m = ladder(TOWN, 5 + i); I.bell(k, s, mtof(m), now + 0.15 + i * 0.07, 0, false, 500); this.log?.push(m); }
      k.fin(s);
      this.coins(now + 0.3, 12, 0.6);
    }
    this.g.duckBus("sale", "music", -6, 50, 600, len);
  }

  private coins(at: number, n: number, over: number) {
    const k = this.k, s = k.shot("ui", this.g.bus.ui, at, -18);
    for (let i = 0; i < n; i++) k.tone(s, { f: range(3000, 6000), a: 1, d: 60, at: at + (i / n) * over + rnd() * 0.03 });
    k.fin(s);
  }

  // ---- shop, research, achievements, toasts, buttons ------------------------------------------------------

  buy() {
    const k = this.k, now = k.now, s = k.shot("ui", this.g.bus.ui, now, -12);
    for (const [d, dt] of [[0, 0], [4, 0.08]] as const) { const m = degree(TOWN, d, -1); k.fm(s, mtof(m), 2, 2, 0.3, 300, 2, 300, 0, now + dt); this.log?.push(m); }
    k.fin(s);
  }

  tierUp() {
    const k = this.k, now = k.now, ui = this.g.bus.ui, s = k.shot("ui", ui, now, -10);
    [0, 2, 4, 7].forEach((d, i) => { const m = degree(TOWN, d, -1); I.bell(k, s, mtof(m), now + i * 0.07, 0, false, 700); this.log?.push(m); });
    k.nz(s, { kind: "white", f: 300, f2: 3000, sweep: 300, q: 1.5, a: 150, d: 150, db: -12 });
    k.fin(s);
    this.music.chord(TOWN, [0, 2, 4], now + 0.28, 1.2, ui, -12, -1);
  }

  research() {
    const k = this.k, now = k.now, ui = this.g.bus.ui;
    for (let i = 0; i < 4; i++) {
      const m = ladder(TOWN, 5 + i), at = now + i * 0.09;
      // Ping-pong echo: 240 ms, feedback 0.35.
      for (let e = 0; e < 3; e++) {
        const s = k.shot("ui", ui, at + e * 0.24, -12 + 20 * Math.log10(Math.pow(0.35, e)), e === 0 ? 0 : e % 2 ? -0.6 : 0.6);
        I.bell(k, s, mtof(m), at + e * 0.24, 0, true, 500);
        k.fin(s);
      }
      this.log?.push(m);
    }
  }

  achievement() {
    const k = this.k, now = k.now, ui = this.g.bus.ui;
    const s = k.shot("ui", ui, now, -12);
    I.bell(k, s, mtof(ladder(TOWN, 10)), now, 0, false, 900);
    k.fin(s);
    this.music.chord(TOWN, [3, 5, 7], now + 0.15, 0.55, ui, -12, -1);
    this.music.chord(TOWN, [0, 2, 4], now + 0.75, 0.6, ui, -12, -1);
  }

  toast(tone: string) {
    const k = this.k, now = k.now, ui = this.g.bus.ui;
    if (tone === "quiet") return;
    const s = k.shot("ui", ui, now, -26);
    if (tone === "warn") k.tone(s, { type: "triangle", f: 660, a: 2, d: 80 });
    else {
      const [a, b] = tone === "bad" ? [81, 76] : [88, 93]; // A5 E5 / E6 A6
      k.tone(s, { f: mtof(a), a: 2, d: 40 }); k.tone(s, { f: mtof(b), a: 2, d: 60, at: now + 0.045 });
    }
    k.fin(s);
  }

  hover() {
    const k = this.k, now = k.now;
    if (now - this.lastHover < 0.06) return;
    this.lastHover = now;
    const s = k.shot("ui", this.g.bus.ui, now, -36);
    k.nz(s, { kind: "white", type: "highpass", f: 2000, q: 0.7, a: 0.5, d: 10 });
    k.tone(s, { f: 3000, a: 1, d: 15 });
    k.fin(s);
  }
  click() { this.k.blip("ui", this.g.bus.ui, { f: 1200, a: 1, d: 25, db: -28 }); }
  deny() { this.k.blip("ui", this.g.bus.ui, { type: "square", f: 150, a: 2, d: 80, db: -24, lp: 600 }); }
  panel(open: boolean) {
    const k = this.k, s = k.shot("ui", this.g.bus.ui, k.now, -30);
    k.nz(s, { kind: "pink", f: open ? 1500 : 1000, q: 1, a: 10, d: 120 });
    k.fin(s);
  }
  collect() { this.coins(this.k.now, 8, 0.4); }

  /** Item used: fuel cell gurgle, repair kit ratchet, coolant hiss; dynamite and charges use their fuses (world). */
  item(name: string) {
    const k = this.k, now = k.now, s = k.shot("ui", this.g.bus.ui, now, -16);
    if (/fuel/i.test(name)) for (let i = 0; i < 6; i++) k.nz(s, { kind: "brown", f: 800 * range(0.7, 1.3), q: 4, a: 5, d: 50, at: now + i * 0.05 });
    else if (/repair|kit|patch/i.test(name)) for (let i = 0; i < 3; i++) { k.nz(s, { kind: "white", f: 2500, q: 3, a: 0.5, d: 20, at: now + i * 0.12 }); k.tone(s, { f: 900, a: 1, d: 30, db: -10, at: now + i * 0.12 }); }
    else if (/cool/i.test(name)) k.nz(s, { kind: "white", type: "highpass", f: 3000, f2: 1200, sweep: 600, q: 0.7, a: 10, d: 600 });
    else k.tone(s, { f: 1200, a: 1, d: 25, db: -6 });
    k.fin(s);
  }

  get saleRunning() { return this.sale !== null; }
  get progress() { return this.tickProgress; }
}
