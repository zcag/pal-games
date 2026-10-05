// Every piece of music in the game, as data the sequencer (music.ts) reads a
// bar at a time. All of them grow from one leitmotif, "the ramparts": a rise
// from the fifth below to the tonic and up to the third, a step back down, and
// an answer that climbs to the octave. Each scene restates it in its own mode,
// metre and instruments, so the same tune is golden on the title, folk on the
// meadow, hijaz in the desert, cold in the peaks and molten in the citadel.
//
// Notation. Melodies: space-separated tokens, any number to a bar (8 = eighths,
// 12 = 12/8 eighths, 6 = 3/4 eighths); a token is a scale degree of the song's
// mode (0 the tonic, 7 its octave, negative below, `#`/`b` a semitone off),
// `-` holds, `.` rests. Chords: a token per bar part, a degree (`4`), with `M`
// or `m` to force the third, `^` to add the seventh, or `s1,5,8` for explicit
// semitones. Patterns (one character a step, any count to a bar): pulse digits
// index the chord's arpeggio; bass `r` root, `5` fifth, `3` third, `o` octave;
// drums `x` hit, `o` accent, `g` ghost; `-` holds, `.` rests.
import * as I from "./inst.ts";

export type Layer = "pad" | "pulse" | "perc" | "bass" | "lead" | "high";
export type Slot = "low" | "mid" | "hi" | "acc";
export type Pat = Partial<Record<Slot, string>>;
export type Kit = Record<Slot, I.Drum> & { crash: I.Drum };

export interface Song {
  id: string;
  bpm: number;
  beats: number;
  /** The lead's tonic (MIDI). */
  key: number;
  mode: readonly number[];
  swing?: number;
  chords: string[];
  melody: string[];
  /** The high layer's line: explicit, or a diatonic interval from the melody (2 = a third up, 0 = unison). */
  counter?: string[] | number;
  /** Chord stabs on the high instrument instead of a line. */
  stab?: string;
  bass: string[];
  pulse: string[];
  drums?: { light: Pat; full: Pat; fill?: Pat };
  kit?: Kit;
  pad: I.Pad; padCenter: number; padFixed?: string;
  pulseInst: I.Mel; pulseOct: number;
  bassInst: I.Mel; bassOct: number;
  lead: I.Mel; leadOct: number;
  /** The second time through the form. */
  lead2?: I.Mel; lead2Oct?: number;
  high?: I.Mel; highOct?: number;
  mix: Record<Layer, number>;
  /** The piece's overall trim (dB), leveling every piece to about -20 dBFS RMS. */
  gain?: number;
  verb: number; echo: number;
  /** Battle music: layers follow intensity. Otherwise `enter` says from which bar of the first pass a layer plays. */
  adaptive: boolean;
  floor?: number;
  enter?: Partial<Record<Layer, number>>;
  /** Restate the motif's opening on the pulse instrument while the lead is out. */
  hint?: boolean;
  /** Re-strike long lead notes (an oud's tremolo) on the first pass. */
  trem?: boolean;
  fire?: boolean;
}

export const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  mixo: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  hijaz: [0, 1, 4, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const;

/** Semitones from the tonic of a scale degree. */
export const degree = (mode: readonly number[], d: number) => 12 * Math.floor(d / 7) + mode[((d % 7) + 7) % 7];

export type Tok = { d: number; acc: number } | "-" | ".";
export const tokens = (line: string): Tok[] => line.trim().split(/\s+/).map((s) => {
  if (s === "-" || s === ".") return s;
  const m = /^(-?\d+)([#b]?)$/.exec(s);
  if (!m) throw new Error(`songs: bad token ${s}`);
  return { d: Number(m[1]), acc: m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0 };
});

/** A chord token's tones in semitones from the tonic, root first. */
export function chord(mode: readonly number[], tok: string): number[] {
  if (tok.startsWith("s")) return tok.slice(1).split(",").map(Number);
  const m = /^(-?\d+)([#b]?)([Mm]?)(\^?)$/.exec(tok);
  if (!m) throw new Error(`songs: bad chord ${tok}`);
  const d = Number(m[1]), acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0, r = degree(mode, d) + acc;
  const third = m[3] === "M" ? 4 : m[3] === "m" ? 3 : degree(mode, d + 2) - degree(mode, d);
  const fifth = acc ? 7 : degree(mode, d + 4) - degree(mode, d);
  const out = [r, r + third, r + fifth];
  if (m[4]) out.push(r + degree(mode, d + 6) - degree(mode, d));
  return out;
}

// ---- the leitmotif ------------------------------------------------------------------------------------------------

const M = [
  "-3 - 0 - - 1 2 -", "4 - - - 3 2 1 -", "2 - - 1 0 - -1 -", "0 - - - - - . .",
  "2 - 4 - 7 - - 6", "5 - - 4 3 - 2 -", "1 - - 2 3 - 1 -", "4 - - - - - . .",
];
const MC = ["0", "4", "5 4", "0", "0", "3", "1", "4"];
const M_END = ["3 - 2 - 1 - -1 -", "0 - - - - - - -"];
const MOTIF = [...M, ...M.slice(0, 6), ...M_END];
const MOTIF_C = [...MC, ...MC.slice(0, 4), "0", "3", "1 4", "0"];

// ---- kits ---------------------------------------------------------------------------------------------------------

export const KITS = {
  meadow: { low: I.bodhran, mid: I.frame, hi: I.shaker, acc: I.tambourine, crash: I.crash },
  desert: { low: I.doum, mid: I.tek, hi: I.riq, acc: I.tambourine, crash: I.crash },
  peaks: { low: I.taiko, mid: I.rim, hi: I.iceTick, acc: I.timpani, crash: I.crash },
  citadel: { low: I.taiko, mid: I.snare, hi: I.hat, acc: I.anvil, crash: I.crash },
  march: { low: I.timpani, mid: I.snare, hi: I.shaker, acc: I.crash, crash: I.crash },
  brush: { low: I.softKick, mid: I.brush, hi: I.shaker, acc: I.tambourine, crash: I.crash },
} satisfies Record<string, Kit>;

// ---- scenes -------------------------------------------------------------------------------------------------------

const TITLE: Song = {
  id: "title", bpm: 66, beats: 4, key: 62, mode: MODES.major, gain: -4.5,
  chords: ["0", "5", "3", "4", ...MOTIF_C],
  melody: [".", ".", ".", ".", ...MOTIF],
  counter: 2,
  bass: ["r---r---"], pulse: ["01234321"],
  pad: I.strings, padCenter: 62, pulseInst: I.harp, pulseOct: -12, bassInst: I.cello, bassOct: -24,
  lead: I.horn, leadOct: 0, lead2: I.violins, lead2Oct: 12, high: I.violins, highOct: 0,
  mix: { pad: 0.9, pulse: 0.75, perc: 0, bass: 0.55, lead: 1, high: 0.5 },
  verb: 0.45, echo: 0.12, adaptive: false,
  enter: { pad: 0, pulse: 0, bass: 2, lead: 0, high: 12 },
};

const MAP_MEL = [
  "-3 - 0 1 2 - - -", "1 - 0 - -1 - -3 -", "-2 - - -1 0 - 1 -", "2 - - - - - . .",
  "4 - 3 2 3 - - -", "2 - 1 - 0 - -1 -", "-2 - 0 - -1 - -3 -", "-1 - - - - - . .",
  "-3 - 0 1 2 - - -", "1 - 0 - -1 - -3 -", "-2 - - -1 0 - 1 -", "2 - - - 4 - - -",
  "5 - 4 - 2 - 3 -", "2 - 1 - 0 - -1 -", "0 - - 1 -1 - - -", "0 - - - - - . .",
];
const MAP_C = ["0", "4", "3", "0", "4^", "0", "1 4", "4", "0", "4", "3", "0", "3", "0", "5 4", "0"];
const MAP_C_HIJAZ = ["0", "1", "3", "0", "0", "0", "3 0", "6", "0", "1", "3", "0", "3", "0", "0 6", "0"];

function mapSong(act: 1 | 2 | 3 | 4): Song {
  const base: Song = {
    id: `map${act}`, bpm: 84, beats: 4, key: 62, mode: MODES.mixo, gain: -3.5,
    chords: MAP_C, melody: MAP_MEL,
    bass: ["r...5..."], pulse: ["0.12.12."],
    pad: I.strings, padCenter: 60, pulseInst: I.lute, pulseOct: -12, bassInst: I.pizz, bassOct: -24,
    lead: I.flute, leadOct: 0, lead2: I.lute, lead2Oct: 0,
    mix: { pad: 0.55, pulse: 0.8, perc: 0, bass: 0.7, lead: 0.85, high: 0 },
    verb: 0.35, echo: 0.15, adaptive: false,
    enter: { pad: 0, pulse: 0, bass: 0, lead: 2 },
  };
  if (act === 2) return { ...base, gain: -2.5, key: 64, mode: MODES.hijaz, chords: MAP_C_HIJAZ, pulseInst: I.kanun, lead: I.ney, lead2: I.oud, pad: I.drone, padCenter: 64, padFixed: "0" };
  if (act === 3) return { ...base, key: 59, mode: MODES.minor, pulseInst: I.celesta, pulseOct: 0, pulse: ["0...2.4."], lead: I.flute, leadOct: 12, lead2: I.glass, lead2Oct: 12, padCenter: 59 };
  if (act === 4) return { ...base, gain: -2, key: 60, mode: MODES.harmonic, pulseInst: I.pizz, lead: I.reed, lead2: I.cello, lead2Oct: -12, padCenter: 57 };
  return base;
}

// Act 1, Meadow: D mixolydian in 12/8, a jig with twin fiddles; the tin whistle takes the tune the second time.
const MEADOW: Song = {
  id: "meadow", bpm: 92, beats: 4, key: 62, mode: MODES.mixo, gain: -5,
  chords: ["0", "6", "3", "0", "0", "6", "3", "4M", "0", "6", "3", "0", "5", "3", "6", "0"],
  melody: [
    "-3 - 0 - - 1 2 - - 1 2 3", "4 - - 3 - - 1 - 3 6 - -", "5 - 4 3 - 2 3 - 5 7 - -", "4 - - 2 - 0 -3 - - - . .",
    "2 - 4 7 - - 7 6 7 8 - -", "7 - 6 3 - 6 8 - - 6 - -", "7 - - 5 - 3 5 - 4 3 - 2", "4 - - - - - - - - . . .",
    "-3 - 0 - - 1 2 - - 1 2 3", "4 - - 3 - - 1 - 3 6 - -", "5 - 4 3 - 2 3 - 5 7 - -", "4 - - 2 - 0 2 - 4 7 - -",
    "5 - - 7 - - 9 - - 8 - 7", "7 - 5 3 - 5 7 - - 10 - -", "8 - - 7 - 6 7 - 6 4 - -", "7 - - - - - - - - . . .",
  ],
  counter: -2,
  bass: ["r.....5....."], pulse: ["0.21.20.21.2"],
  drums: {
    light: { low: "x.....x.....", hi: "..x..x..x..x" },
    full: { low: "x..x..x..x.g", mid: "...x.....x..", hi: "x.gx.gx.gx.g", acc: "......x....." },
    fill: { low: "x..x..x.....", mid: "...x..xgxxgx", hi: "x.gx.gx.gx.g" },
  },
  kit: KITS.meadow,
  pad: I.strings, padCenter: 60, pulseInst: I.lute, pulseOct: -12, bassInst: I.bassPluck, bassOct: -24,
  lead: I.fiddle, leadOct: 0, lead2: I.whistle, lead2Oct: 12, high: I.fiddle, highOct: 0,
  mix: { pad: 0.7, pulse: 0.75, perc: 0.9, bass: 0.85, lead: 1, high: 0.55 },
  verb: 0.28, echo: 0.1, adaptive: true, hint: true,
};

// Act 2, Desert: E hijaz over a maqsum, an oud that trills its long notes, strings doubling it in unison when it swells.
const DESERT: Song = {
  id: "desert", bpm: 100, beats: 4, key: 64, mode: MODES.hijaz, gain: -1,
  chords: ["0", "0", "0", "1 0", "3", "6", "1", "0", "0", "0", "0", "1 0", "3", "1", "6", "0"],
  melody: [
    "-3 - 0 - - 1 2 -", "3 - 2 1 2 - 1 -", "2 - 1 2 4 - 2 -", "1 - 0 - - - . .",
    "3 - 5 - 7 - 5 -", "6 - 5 - 3 - 1 -", "5 - 4 3 1 - 3 -", "2 - 1 - 0 - - -",
    "4 - 7 - - 8 9 -", "10 - 9 8 9 - 8 -", "9 - 8 7 6 - 7 -", "8 - 7 - - - . .",
    "3 - - 4 5 - 4 3", "1 - 3 - 5 - 3 -", "6 - 5 - 3 - 1 -", "2 - 1 - 0 - - -",
  ],
  counter: 0,
  bass: ["r.......r.....5."], pulse: ["0..2..0.1..2..0."],
  drums: {
    light: { low: "x.......x.......", mid: "..x...x.....x..." },
    full: { low: "x.......x..x....", mid: "..x...x.....x.x.", hi: "x.g.x.g.x.g.x.gg" },
    fill: { low: "x.......x.x.x.x.", mid: "..x...x.xxxxxxxx", hi: "x.g.x.g.x.g.x.gg" },
  },
  kit: KITS.desert,
  pad: I.drone, padCenter: 64, padFixed: "0", pulseInst: I.kanun, pulseOct: -12, bassInst: I.bassPluck, bassOct: -24,
  lead: I.oud, leadOct: 0, lead2: I.ney, lead2Oct: 0, high: I.violins, highOct: 0,
  mix: { pad: 0.8, pulse: 0.6, perc: 1, bass: 0.8, lead: 1, high: 0.55 },
  verb: 0.3, echo: 0.14, adaptive: true, hint: true, trem: true,
};

// Act 3, Peaks: B minor, slow and wide; a cello sings over bells like ice, a flute takes it high the second time.
const PEAKS: Song = {
  id: "peaks", bpm: 76, beats: 4, key: 59, mode: MODES.minor, gain: -8,
  chords: ["0", "4", "2", "6", "0", "3", "5", "4", "0", "4", "2", "0", "5", "2", "3 4M", "0"],
  melody: [
    "-3 - 0 - - 1 2 -", "4 - - - 3 2 1 -", "2 - - 1 0 - -1 -", "-1 - - - - - . .",
    "4 - 2 - 0 - 2 4", "5 - 3 - 0 - 3 5", "7 - 6 5 4 - 2 -", "4 - - - - - . .",
    "-3 - 0 - - 1 2 -", "4 - - - 3 2 1 -", "2 - - 1 0 - -1 -", "0 - - - - - . .",
    "7 - - 6 5 - 4 -", "4 - - 2 1 - 2 -", "3 - 2 - 1 - -1# -", "0 - - - - - - -",
  ],
  counter: 2,
  bass: ["r-------", "r---5---"], pulse: ["0...4...2...4..."],
  drums: {
    light: { low: "x...............", hi: "....x.......x..." },
    full: { low: "x.......x.......", mid: "....x.......x...", hi: "..x...x...x...x.", acc: "x..............." },
    fill: { low: "x.......x...x.x.", mid: "....x.......x...", acc: "x...........xxxx" },
  },
  kit: KITS.peaks,
  pad: I.strings, padCenter: 57, pulseInst: I.glass, pulseOct: 12, bassInst: I.bassBow, bassOct: -24,
  lead: I.cello, leadOct: 0, lead2: I.flute, lead2Oct: 12, high: I.violins, highOct: 12,
  mix: { pad: 0.75, pulse: 0.85, perc: 0.85, bass: 0.7, lead: 1, high: 0.45 },
  verb: 0.5, echo: 0.2, adaptive: true, hint: true,
};

// Act 4, Citadel: C harmonic minor at a gallop; brass carries the motif over taiko, spiccato low strings and anvils.
const CITADEL: Song = {
  id: "citadel", bpm: 132, beats: 4, key: 60, mode: MODES.harmonic, gain: -10,
  chords: ["0", "4", "5 4", "4", "0", "5", "3", "4", "0", "4", "5 4", "0", "5", "3", "s1,5,8 4", "0"],
  melody: [
    "-3 - 0 - - 1 2 -", "4 - - - 3 2 1 -", "2 - - 1 0 - -1 -", "-1 - - - - - . .",
    "4 - 5 4 2 - 0 -", "5 - 7 5 2 - 0 -", "3 - 5 3 0 - 3 -", "4 - - 6 4 - - -",
    "-3 - 0 - - 1 2 -", "4 - - - 3 2 1 -", "2 - - 1 0 - -1 -", "0 - - - - - . .",
    "7 - - 5 7 - 9 -", "10 - - 9 7 - 5 -", "5 - - 3 6 - 4 -", "0 - - - - - - -",
  ],
  stab: "x..x..x.........",
  bass: ["r.......r...r..."], pulse: ["0.00.00.0.00.00."],
  drums: {
    light: { low: "x.......x.......", hi: "..x...x...x...x." },
    full: { low: "x..x..x.x..x..x.", mid: "....x.......x...", hi: "x.x.x.x.x.x.x.x.", acc: "............x..." },
    fill: { low: "x..x..x.x.......", mid: "....x...x.xxxxxx", hi: "x.x.x.x.x.x.x.x." },
  },
  kit: KITS.citadel,
  pad: I.strings, padCenter: 55, pulseInst: I.spicc, pulseOct: -12, bassInst: I.bassSynth, bassOct: -24,
  lead: I.brass, leadOct: 0, lead2: I.violins, lead2Oct: 12, high: I.stabs, highOct: 0,
  mix: { pad: 0.85, pulse: 0.6, perc: 1, bass: 0.85, lead: 1, high: 0.6 },
  verb: 0.3, echo: 0.08, adaptive: true, hint: true,
};

/** A boss's music: the act's own, darker, a choir under it, heavier drums, never without its bass and lead. */
function boss(s: Song, o: Partial<Song>): Song {
  return {
    ...s, id: `${s.id}-boss`, bpm: Math.round(s.bpm * 1.06), pad: I.choir, padFixed: undefined, floor: 0.62,
    kit: { ...s.kit!, low: I.boom, acc: I.timpani }, lead: I.brass, lead2: s.lead, lead2Oct: s.leadOct, hint: false,
    mix: { ...s.mix, pad: 0.8, perc: 1, high: 0.65 }, ...o,
  };
}
const BOSS = {
  1: boss(MEADOW, { gain: -4, mode: MODES.dorian, chords: ["0", "6", "3", "0", "0", "6", "3", "4", "0", "6", "3", "0", "5", "3", "6", "0"], high: I.fiddle }),
  2: boss(DESERT, { gain: -4, trem: false, high: I.violins, counter: 7 }),
  3: boss(PEAKS, { gain: -5, mode: MODES.phrygian, chords: ["0", "4", "2", "6", "0", "3", "5", "4", "0", "4", "2", "0", "5", "2", "3 4M", "0"] }),
  4: boss(CITADEL, { gain: -8, bpm: 140, lead2: I.brass, lead2Oct: 12 }),
} as const;

// Shop: G major with a swing, a clarinet and pizzicato, brushes.
const SHOP: Song = {
  id: "shop", bpm: 104, beats: 4, key: 67, mode: MODES.major, swing: 0.2, gain: -2.5,
  chords: ["0", "3", "4", "0", "5", "1", "4", "0", "0", "3", "4", "0", "0", "4", "5 4", "0"],
  melody: [
    "-3 . 0 1 2 . 0 .", "3 . 2 1 0 . -2 .", "-1 . 1 . 4 . 3 2", "0 - - . -3 . . .",
    "2 . 0 . -2 . 0 .", "1 . 3 . 5 - 4 3", "4 . 1 . -1 . 1 .", "0 - - - . . . .",
    "-3 . 0 1 2 . 0 .", "3 . 2 1 0 . -2 .", "-1 . 1 . 4 . 3 2", "0 - - . -3 . . .",
    "4 . 5 4 2 . 0 .", "3 . 4 3 1 . -1 .", "0 . 2 . 1 . -1 .", "0 - - - . . . .",
  ],
  bass: ["r...5..."], pulse: [".2.1.2.1"],
  drums: { light: { low: "x...x...", mid: "..x...x.", hi: "g.x.g.x." }, full: { low: "x...x...", mid: "..x...x.", hi: "g.x.g.x." } },
  kit: KITS.brush,
  pad: I.warm, padCenter: 64, pulseInst: I.pizz, pulseOct: -12, bassInst: I.bassPluck, bassOct: -24,
  lead: I.reed, leadOct: 0, lead2: I.glock, lead2Oct: 12,
  mix: { pad: 0.5, pulse: 0.6, perc: 0.6, bass: 0.75, lead: 0.9, high: 0 },
  verb: 0.25, echo: 0.1, adaptive: false,
  enter: { pad: 0, pulse: 0, bass: 0, perc: 0, lead: 0 },
};

// Camp: A major in three, a harp by the fire, the flute's motif, a cello answering it.
const CAMP: Song = {
  id: "camp", bpm: 84, beats: 3, key: 69, mode: MODES.major, gain: -3,
  chords: ["0", "4", "5", "0", "3", "0", "1", "4", "0", "4", "5", "0", "3", "0", "4", "0"],
  melody: [
    "-3 - 0 - 1 2", "4 - - 3 2 1", "2 - 1 0 - -1", "0 - - - - -",
    "3 - 5 - 3 2", "2 - 4 - 2 0", "1 - 3 - 5 -", "4 - - - - -",
    "-3 - 0 - 1 2", "4 - - 3 2 1", "2 - 1 0 - -1", "0 - - - - -",
    "5 - 7 - 5 4", "4 - 2 - 0 -", "1 - - 2 -1 -", "0 - - - - -",
  ],
  bass: ["r...5."], pulse: ["012321"],
  pad: I.warm, padCenter: 64, pulseInst: I.harp, pulseOct: -12, bassInst: I.bassPluck, bassOct: -24,
  lead: I.flute, leadOct: 0, lead2: I.cello, lead2Oct: -12,
  mix: { pad: 0.5, pulse: 0.8, perc: 0, bass: 0.6, lead: 0.85, high: 0 },
  verb: 0.35, echo: 0.12, adaptive: false, fire: true,
  enter: { pad: 0, pulse: 0, bass: 2, lead: 4 },
};

// Victory: the motif in full, brass over strings, a march.
const VICTORY: Song = {
  id: "victory", bpm: 92, beats: 4, key: 62, mode: MODES.major, gain: -8.5,
  chords: MOTIF_C, melody: MOTIF, counter: 2,
  bass: ["r---5---"], pulse: ["01234321"],
  drums: { light: { low: "x...x...", acc: "x......." }, full: { low: "x...x...", mid: "..x.x.xx", acc: "x......." }, fill: { low: "x...x...", mid: "x.xxx.xxxxxxxxxx" } },
  kit: KITS.march,
  pad: I.strings, padCenter: 62, pulseInst: I.harp, pulseOct: -12, bassInst: I.bassBow, bassOct: -24,
  lead: I.brass, leadOct: 0, lead2: I.violins, lead2Oct: 12, high: I.violins, highOct: 12,
  mix: { pad: 0.8, pulse: 0.7, perc: 0.75, bass: 0.7, lead: 1, high: 0.45 },
  verb: 0.4, echo: 0.1, adaptive: false,
  enter: { pad: 0, pulse: 0, bass: 0, perc: 0, lead: 0, high: 8 },
};

// Defeat: the motif in D minor, falling short of its peak; a cello, a bell tolling.
const DEFEAT: Song = {
  id: "defeat", bpm: 60, beats: 4, key: 62, mode: MODES.minor, gain: -8.5,
  chords: ["0", "0", "5", "4", "0", "0", "5 4M", "0"],
  melody: [
    "-3 - 0 - - 1 2 -", "1 - - - 0 - - -", "-1 - - - -2 - - -", "-3 - - - - - - -",
    "-3 - 0 - - -1 -2 -", "-3 - - - -4 - - -", "-5 - - - -6 - - -", "-7 - - - - - . .",
  ],
  bass: ["r-------"], pulse: ["0......."],
  pad: I.strings, padCenter: 57, pulseInst: I.tubular, pulseOct: -12, bassInst: I.bassBow, bassOct: -24,
  lead: I.cello, leadOct: -12, lead2: I.flute, lead2Oct: 12,
  mix: { pad: 0.7, pulse: 0.6, perc: 0, bass: 0.6, lead: 1, high: 0 },
  verb: 0.55, echo: 0.15, adaptive: false,
  enter: { pad: 0, pulse: 0, bass: 0, lead: 1 },
};

const BATTLE = { 1: MEADOW, 2: DESERT, 3: PEAKS, 4: CITADEL } as const;
const MAPS = { 1: mapSong(1), 2: mapSong(2), 3: mapSong(3), 4: mapSong(4) } as const;

export type Scene = "title" | "map" | "battle" | "boss" | "shop" | "camp" | "victory" | "defeat";

export function songFor(s: Scene, act: 1 | 2 | 3 | 4): Song {
  switch (s) {
    case "title": return TITLE;
    case "map": return MAPS[act];
    case "battle": return BATTLE[act];
    case "boss": return BOSS[act];
    case "shop": return SHOP;
    case "camp": return CAMP;
    case "victory": return VICTORY;
    case "defeat": return DEFEAT;
  }
}

/** Fails loudly on a malformed song (run by the check). */
export function validate(s: Song) {
  if (s.chords.length !== s.melody.length) throw new Error(`${s.id}: ${s.chords.length} chords for ${s.melody.length} bars`);
  for (const c of s.chords) for (const t of c.split(/\s+/)) chord(s.mode, t);
  for (const l of s.melody) { const ts = tokens(l); if (ts[0] === "-") throw new Error(`${s.id}: a bar may not start with a hold: ${l}`); }
  if (Array.isArray(s.counter) && s.counter.length !== s.melody.length) throw new Error(`${s.id}: counter length`);
}
export const ALL_SONGS = (): Song[] => [TITLE, ...Object.values(MAPS), ...Object.values(BATTLE), ...Object.values(BOSS), SHOP, CAMP, VICTORY, DEFEAT];
