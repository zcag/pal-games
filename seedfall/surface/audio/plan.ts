// The music's decisions, kept free of WebAudio so they can be tested over simulated hours (bun test):
// tension and its thinning ladder (8.5), suites and ambience gaps (8.6), phrase choices and breaths (8.3, 8.6),
// lead variations (8.6), and the notes of each bar.
import { ARP, BASS, PERC, SEED, degree, type Motif, type Perc, type Song } from "./score.ts";
import { clamp } from "./pure.ts";

// ---- tension (section 8.5) --------------------------------------------------------------------------------

export interface PodLike { fuel: number; fuelHome: number; hull: number; hullMax: number; heat: number }

/** τ from the pod: the fuel margin to the tick, hull and heat. */
export function tensionOf(p: PodLike) {
  const m = p.fuelHome > 0 && Number.isFinite(p.fuelHome) ? p.fuel / p.fuelHome : p.fuelHome === Infinity ? 0 : 99;
  const tf = clamp((2.0 - m) / (2.0 - 1.05), 0, 1);
  const th = clamp((0.5 - p.hull / Math.max(1e-6, p.hullMax)) / 0.4, 0, 1);
  const tt = clamp((p.heat - 0.5) / 0.5, 0, 1);
  return Math.max(tf, 0.8 * th, 0.8 * tt);
}
export const underHome = (p: PodLike) => p.fuel < p.fuelHome;

/** Drop and return thresholds of the five stages: arp halves, arp stops (perc to kick), lead/seed stop + clock, bass pedal + pad closes, drone. */
export const STAGES: [number, number][] = [[0.25, 0.15], [0.4, 0.3], [0.55, 0.45], [0.7, 0.6], [0.85, 0.75]];

/** The thinning ladder with hysteresis: stages drop on a bar line (stage 5 on the beat), come back one at a time after 2 bars below. */
export class Tension {
  stage = 0;
  under = false;
  tau = 0;
  private below = 0;
  private aboveHome = 0;

  /** Every beat: the drop that crosses 0.85, and going under home, land on the beat. */
  beat(tau: number, under: boolean) {
    this.tau = tau;
    if (tau >= STAGES[4][0] && this.stage < 5) { this.stage = 5; this.below = 0; }
    if (under) { this.under = true; this.aboveHome = 0; }
  }

  /** Every bar line. */
  bar(tau: number, under: boolean) {
    this.tau = tau;
    let up = 0;
    while (up < 5 && tau >= STAGES[up][0]) up++;
    if (up > this.stage) { this.stage = up; this.below = 0; }
    else if (this.stage > 0 && tau < STAGES[this.stage - 1][1]) {
      if (++this.below >= 2) { this.stage--; this.below = 0; }
    } else this.below = 0;
    if (under) { this.under = true; this.aboveHome = 0; }
    else if (this.under && ++this.aboveHome >= 2) this.under = false;
  }
  reset() { this.stage = 0; this.under = false; this.below = 0; this.aboveHome = 0; this.tau = 0; }
}

// ---- suites (section 8.6) ---------------------------------------------------------------------------------

/** Suites of 3-6 minutes, then 1-3 minutes of ambience only (2-5 after 45 minutes of play). */
export class Suites {
  playing = true;
  until: number;
  /** Seconds of play since the session began (or a long pause). */
  constructor(private rng: () => number, now: number, private sessionStart = now) {
    this.until = now + 180 + 180 * rng();
  }
  start(now: number) { this.playing = true; this.until = now + 180 + 180 * this.rng(); }
  /** Advance; returns true when a new suite began at this call. */
  tick(now: number) {
    if (now < this.until) return false;
    if (this.playing) {
      const late = now - this.sessionStart > 45 * 60;
      this.playing = false;
      this.until = now + (late ? 120 + 180 * this.rng() : 60 + 120 * this.rng());
      return false;
    }
    this.start(now);
    return true;
  }
}

// ---- phrases and bars ---------------------------------------------------------------------------------------

export type Layer = "pad" | "bass" | "arp" | "perc" | "lead" | "seed" | "clock";
export type Variant = "written" | "fifth" | "inverted" | "augmented" | "answered";
export const VARIANTS: [Variant, number][] = [["written", 3], ["fifth", 2], ["inverted", 1], ["augmented", 1], ["answered", 2]];

export interface Phrase {
  n: number;
  bars: number;
  prog: number;
  bass: number;
  arp: number;
  perc: number;
  layers: Set<Layer>;
  /** The lead's notes as a motif placed at `leadAt` (bar), or none. */
  lead: Motif | null;
  leadAt: number;
  variant: Variant | null;
  seed: boolean;
  seedAt: number;
  /** "pad": pad only; "silence": nothing (ambience only). */
  breath: "pad" | "silence" | null;
}

export interface Note {
  /** Sixteenth within the bar (fractional for the swing is applied later). */
  step: number;
  layer: Layer;
  midi: number;
  /** Length in sixteenths. */
  len: number;
  /** Gain offset dB (humanised). */
  db: number;
  /** For percussion: which instrument. */
  perc?: Perc;
  accent?: boolean;
}

export interface BarOut {
  notes: Note[];
  phrase: Phrase;
  barInPhrase: number;
  /** The chord's scale degree. */
  chord: number;
  /** A new phrase began at this bar. */
  fresh: boolean;
}

/** The arrangement mask: what the caller allows (crossfades, dive intro, the menu). */
export interface Mask { only?: Set<Layer>; }

const PRIO: Record<Layer, number> = { pad: 0, bass: 1, lead: 2, seed: 2, clock: 3, perc: 4, arp: 5 };

export class Composer {
  phrase!: Phrase;
  barInPhrase = 0;
  phrases = 0;
  private recent: number[] = [];
  private sinceBreath = 0;
  private breathEvery: number;
  private arp16Bars = 0;
  private padPrev: number[] = [];
  /** Town theme: play the full 16-bar melody this visit (every third visit), then fragments. */
  full = false;
  private fullBar = 0;
  /** Log of phrase choices (the checks read it). */
  log: { n: number; prog: number; arp: string; layers: string; variant: string | null; seed: boolean; breath: string | null; bars: number }[] = [];
  logOn = false;

  constructor(readonly song: Song, private rng: () => number) {
    this.breathEvery = this.int(song.breath[0], song.breath[1]);
  }
  private int(a: number, b: number) { return a + Math.floor(this.rng() * (b - a + 1)); }
  private chance(p: number) { return this.rng() < p; }

  /** Plan the next phrase (section 8.3). `barSec` lets a silent breath last 10-20 s. */
  private plan(barSec: number): Phrase {
    const s = this.song, r = this.rng;
    const n = this.phrases++;
    const progPool = s.progs.map((_, i) => i).filter((i) => !this.recent.includes(i));
    const prog = progPool[Math.floor(r() * progPool.length)];
    this.recent.push(prog);
    if (this.recent.length > Math.min(2, s.progs.length - 1)) this.recent.shift();
    let breath: Phrase["breath"] = null;
    let bars = 8;
    if (++this.sinceBreath > this.breathEvery) {
      this.sinceBreath = 0;
      this.breathEvery = this.int(s.breath[0], s.breath[1]);
      breath = this.chance(0.55) ? "pad" : "silence";
      bars = breath === "pad" ? (this.chance(0.5) ? 8 : 16) : Math.max(2, Math.round((10 + 10 * r()) / barSec));
    }
    // Arp: never a sixteenth pattern for more than 16 bars in a row.
    const capped = this.arp16Bars >= 16 - 8 + 1;
    let arpPool = capped ? s.arp.filter((i) => ARP[i].rate === 2) : s.arp;
    if (!arpPool.length) arpPool = s.arp;
    const arp = arpPool[Math.floor(r() * arpPool.length)];
    const layers = new Set<Layer>(["pad"]);
    let lead: Motif | null = null, variant: Variant | null = null, leadAt = 0, seed = false, seedAt = 0;
    if (!breath) {
      if (this.chance(s.odds.bass)) layers.add("bass");
      if (this.chance(s.odds.arp) && !(capped && ARP[arp].rate === 1)) layers.add("arp");
      if (s.perc.length && this.chance(s.odds.perc)) layers.add("perc");
      seed = this.chance(s.seed.chance);
      if (seed) { layers.add("seed"); seedAt = this.chance(0.5) || s.seed.half ? 0 : 4; }
      // The Core's Seed replaces the lead; elsewhere the lead rests where the Seed plays.
      if (!seed && s.odds.lead > 0 && this.chance(s.odds.lead)) {
        const v = this.variant();
        const m = this.leadMotif(v);
        lead = m;
        variant = v;
        const len = motifBars(m);
        leadAt = len >= 8 ? 0 : this.chance(0.5) ? 0 : 8 - len;
        layers.add("lead");
      }
      // At most 4 layers (the Seed counts as one): drop the arp or the percussion.
      while (layers.size > 4) layers.delete(layers.has("perc") && this.chance(0.5) ? "perc" : layers.has("arp") ? "arp" : "perc");
    }
    const ph: Phrase = { n, bars, prog, bass: s.bass[Math.floor(r() * s.bass.length)], arp, perc: s.perc.length ? s.perc[Math.floor(r() * s.perc.length)] : -1, layers, lead, leadAt, variant, seed, seedAt, breath };
    if (this.logOn) this.log.push({ n, prog, arp: ARP[arp].name, layers: [...layers].join(","), variant, seed, breath, bars });
    return ph;
  }

  private variant(): Variant {
    let t = 0;
    for (const [, w] of VARIANTS) t += w;
    let x = this.rng() * t;
    for (const [v, w] of VARIANTS) { x -= w; if (x < 0) return v; }
    return "written";
  }

  /** The lead motif varied (section 8.6). The town plays its written melody: in full on every third visit. */
  private leadMotif(v: Variant): Motif {
    const s = this.song;
    let m = s.motif;
    if (s.melody) {
      if (this.full) {
        const bars = 8, from = this.fullBar;
        m = sliceBars(s.melody, from, bars);
        this.fullBar = (this.fullBar + bars) % motifBars(s.melody);
        if (this.fullBar === 0) this.full = false;
        return m;
      }
      m = sliceBars(s.melody, 4 * Math.floor(this.rng() * (motifBars(s.melody) / 4)), 4);
    }
    switch (v) {
      case "written": return m;
      case "fifth": return m.map(([d, l]) => [d === null ? null : d + 4, l]);
      case "inverted": { const a = m.find(([d]) => d !== null)?.[0] ?? 0; return m.map(([d, l]) => [d === null ? null : 2 * a - d, l]); }
      case "augmented": return m.map(([d, l]) => [d, l * 2]);
      case "answered": {
        const half = sliceBars(m, 0, Math.max(1, Math.floor(motifBars(m) / 2)));
        const tail: Motif = [];
        // A new 2-bar tail on the pentatonic degrees of the mode (0, 1, 2, 4, 5 of a major-ish scale; for minor modes 0, 2, 3, 4, 6).
        const pentDeg = [0, 1, 2, 4, 5];
        let left = 32, d = 2;
        while (left > 0) {
          const len = Math.min(left, left <= 8 ? left : [2, 4, 4, 6][Math.floor(this.rng() * 4)]);
          d = clamp(d + Math.floor(this.rng() * 5) - 2, 0, 4);
          tail.push([left === len ? 0 : pentDeg[d], len]);
          left -= len;
        }
        return [...half, ...tail];
      }
    }
  }

  /** Compose the next bar. */
  bar(t: Tension, barSec: number, mask: Mask = {}): BarOut {
    let fresh = false;
    if (!this.phrase || this.barInPhrase >= this.phrase.bars) { this.phrase = this.plan(barSec); this.barInPhrase = 0; fresh = true; }
    const ph = this.phrase, b = this.barInPhrase++, s = this.song, r = this.rng;
    const prog = s.progs[ph.prog];
    const chord = prog.length >= 8 ? prog[b % prog.length] : prog[Math.floor(b / 2) % prog.length];
    const chordFresh = prog.length >= 8 || b % 2 === 0;
    const notes: Note[] = [];
    const on = (l: Layer) => ph.layers.has(l) && (!mask.only || mask.only.has(l));
    const hum = () => (r() * 2 - 1) * 1.5;
    const stage = t.stage;
    if (ph.breath === "silence") return { notes, phrase: ph, barInPhrase: b, chord, fresh };

    // Pad: the triad voiced near the centre with the smallest movement.
    if (on("pad") && (chordFresh || b === 0)) {
      const v = this.voice(chord);
      const len = prog.length >= 8 ? 16 : 32;
      for (const m of v) notes.push({ step: 0, layer: "pad", midi: m, len, db: hum() });
    }
    // Bass: roots and fifths on the pattern; a root pedal from stage 4.
    if (on("bass") && !ph.breath) {
      const root = this.bassNote(degree(s, chord)), fifth = this.bassNote(degree(s, chord + 4));
      if (stage >= 4) notes.push({ step: 0, layer: "bass", midi: this.bassNote(s.tonic), len: 16, db: hum() });
      else {
        const pat = BASS[ph.bass];
        for (let i = 0; i < 16; i++) {
          const c = pat[i];
          if (c !== "R" && c !== "F" && c !== "O") continue;
          let len = 1;
          while (i + len < 16 && pat[i + len] === "-") len++;
          notes.push({ step: i, layer: "bass", midi: c === "R" ? root : c === "F" ? fifth : root + 12, len, db: hum() });
        }
      }
    }
    // Arp: chord tones, half density at stage 1, gone from stage 2.
    let arp16 = false;
    if (on("arp") && !ph.breath && stage < 2) {
      const a = ARP[ph.arp], tones = [0, 2, 4, 7].map((x) => degree(s, chord + x, 0));
      arp16 = a.rate === 1;
      let k = 0;
      for (let i = 0; i < 16; i += a.rate, k++) {
        const c = a.seq[k % a.seq.length];
        if (c === ".") continue;
        if (stage >= 1 && k % 2 === 1) continue;
        notes.push({ step: i, layer: "arp", midi: tones[+c], len: a.rate * 2, db: hum() });
      }
    }
    this.arp16Bars = arp16 ? this.arp16Bars + 1 : 0;
    // Percussion: the pattern; from stage 2 only the kick or heartbeat.
    if (on("perc") && !ph.breath && ph.perc >= 0) {
      const pat = PERC[ph.perc];
      for (const k in pat) {
        const inst = k as Perc;
        if (stage >= 2 && inst !== "kick" && inst !== "heart" && inst !== "taiko") continue;
        const p = pat[inst]!;
        for (let i = 0; i < 16; i++) if (p[i] === "x" || p[i] === "X") notes.push({ step: i, layer: "perc", midi: 0, len: 1, perc: inst, accent: p[i] === "X", db: inst === "heart" ? 0 : hum() });
      }
    }
    // Lead and Seed: stop from stage 3.
    if (stage < 3 && !ph.breath) {
      if (on("lead") && ph.lead) this.placeMotif(notes, ph.lead, b - ph.leadAt, "lead", 0, hum);
      if (on("seed") && ph.seed) {
        const m: Motif = s.seed.half ? SEED.map(([d, l]) => [d, l * 2]) : SEED;
        this.placeMotif(notes, m, b - ph.seedAt, "seed", 12 * s.seed.oct, hum);
      }
    }
    // The clock: muted eighths from stage 3.
    if (stage >= 3) for (let i = 0; i < 16; i += 2) notes.push({ step: i, layer: "clock", midi: 0, len: 1, db: -28 + 8 * clamp((t.tau - 0.55) / 0.45, 0, 1) });

    // At most 6 note-ons per beat: keep by priority.
    const out: Note[] = [];
    for (let beat = 0; beat < 4; beat++) {
      const inBeat = notes.filter((n) => Math.floor(n.step / 4) === beat).sort((a, b) => PRIO[a.layer] - PRIO[b.layer]);
      out.push(...inBeat.slice(0, 6));
    }
    return { notes: out, phrase: ph, barInPhrase: b, chord, fresh };
  }

  /** Notes of the motif that start in bar `rel` of it. */
  private placeMotif(out: Note[], m: Motif, rel: number, layer: Layer, shift: number, hum: () => number) {
    if (rel < 0) return;
    let pos = 0;
    for (const [d, len] of m) {
      const bar = Math.floor(pos / 16);
      if (bar === rel && d !== null) out.push({ step: pos % 16, layer, midi: degree(this.song, d) + shift, len, db: hum() });
      pos += len;
      if (bar > rel) break;
    }
  }

  private bassNote(m: number) {
    const low = this.song.bassLow;
    let x = m;
    while (x < low) x += 12;
    while (x >= low + 12) x -= 12;
    return x;
  }

  /** Smooth voice leading: of the triad's voicings within the centre's octave, the one closest to the last. */
  private voice(chord: number) {
    const s = this.song;
    const pcs = [0, 2, 4].map((x) => degree(s, chord + x));
    const cands: number[][] = [];
    for (let inv = 0; inv < 3; inv++) {
      const v = pcs.map((m, i) => (i < inv ? m + 12 : m)).sort((a, b) => a - b);
      for (let o = -2; o <= 2; o++) {
        const w = v.map((m) => m + 12 * o);
        const mid = (w[0] + w[2]) / 2;
        if (Math.abs(mid - s.centre) <= 7) cands.push(w);
      }
    }
    if (!cands.length) cands.push(pcs);
    const prev = this.padPrev;
    let best = cands[0], bestCost = Infinity;
    for (const c of cands) {
      const cost = prev.length ? c.reduce((a, m, i) => a + Math.abs(m - prev[i]), 0) : Math.abs((c[0] + c[2]) / 2 - s.centre);
      if (cost < bestCost) { best = c; bestCost = cost; }
    }
    this.padPrev = best;
    return best;
  }

  /** Bars a phrase-planned silent breath lasts (the music engine checks it). */
  get silent() { return this.phrase?.breath === "silence"; }
}

export const motifBars = (m: Motif) => Math.ceil(m.reduce((a, [, l]) => a + l, 0) / 16);

/** Bars `from` .. `from + n` of a motif. */
export function sliceBars(m: Motif, from: number, n: number): Motif {
  const out: Motif = [];
  let pos = 0;
  for (const [d, l] of m) {
    const bar = Math.floor(pos / 16);
    if (bar >= from && bar < from + n) out.push([d, l]);
    pos += l;
  }
  return out;
}
