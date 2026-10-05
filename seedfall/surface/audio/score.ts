// The score as data (design/audio.md section 8.1-8.4): per song its key and mode, tempo, chime pentatonic,
// chord pools, pattern choices, instruments and motif. Pure data plus a few music-theory helpers; no WebAudio.

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygdom: [0, 1, 4, 5, 7, 8, 10],
} as const;
export type Mode = keyof typeof MODES;

/** A motif: [scale degree (0 = tonic, may go below 0 or past 6) or null for a rest, length in sixteenths]. */
export type Motif = [number | null, number][];

export type PadInst = "pad" | "choir" | "organ" | "pwm" | "drive";
export type BassInst = "bass" | "bloop" | "drive" | "pluck";
export type ArpInst = "pluck" | "bell" | "marimba";
export type LeadInst = "whistle" | "triangle" | "brass" | "bell" | "choir" | "hum";
export type SeedInst = "bell" | "glass" | "marimba" | "brass" | "choir" | "lead";
export type Perc = "kick" | "heart" | "shaker" | "brush" | "wood" | "click" | "drip" | "tom" | "taiko" | "tick" | "anvil";

export interface Song {
  id: string;
  /** Tonic as MIDI in the lead's octave. */
  tonic: number;
  mode: Mode;
  bpm: number;
  /** Swing of the off sixteenth (0.5 straight). */
  swing: number;
  /** The chime pentatonic: offsets in semitones from `pentBase` (MIDI). Every offset is in the mode. */
  pent: number[];
  pentBase: number;
  /** Chord progressions as scale degrees (4 chords of 2 bars, or 8 of 1). */
  progs: number[][];
  bass: number[];
  arp: number[];
  perc: number[];
  pad: PadInst;
  padCut: number;
  bassInst: BassInst;
  arpInst: ArpInst;
  lead: LeadInst;
  motif: Motif;
  /** MIDI centre of the pad voicing, and the bass's lowest note. */
  centre: number;
  bassLow: number;
  /** Seed motif (section 8.4): chance per phrase, instrument, level vs the lead (dB), reverb wet, octave shift. */
  seed: { chance: number; inst: SeedInst; db: number; wet: number; oct: number; half?: boolean };
  /** Phrases between breaths. */
  breath: [number, number];
  /** Chances per phrase for the optional layers. */
  odds: { bass: number; arp: number; perc: number; lead: number };
  /** A longer written melody (the town theme), bars of 16 sixteenths. */
  melody?: Motif;
}

/** Bass patterns: R root, F fifth, O octave, - hold, . rest; 16 steps. */
export const BASS = [
  "R-------R-------",
  "R---R---F---R---",
  "R-R-R-R-R-R-R-R-",
  "R-----R-F-----R-",
  "R---------F-----",
  "R--R--R-F--F--O-",
  "R-------F-------",
  "R-R-F-R-O-R-F-R-",
  "R---.---R---.---",
  "R-----------F---",
];

/** Arp patterns: chord-tone indices (0 root, 1 third, 2 fifth, 3 octave), . rest; rate 1 = 16ths, 2 = 8ths. */
export const ARP: { seq: string; rate: 1 | 2; name: string }[] = [
  { seq: "0123", rate: 1, name: "up16" },
  { seq: "3210", rate: 1, name: "down16" },
  { seq: "012321", rate: 1, name: "updown16" },
  { seq: "0213", rate: 1, name: "broken16" },
  { seq: "01020302", rate: 1, name: "pedal16" },
  { seq: "0..2..1.", rate: 1, name: "sparse16" },
  { seq: "0123", rate: 2, name: "up8" },
  { seq: "3210", rate: 2, name: "down8" },
  { seq: "012321", rate: 2, name: "updown8" },
  { seq: "0213", rate: 2, name: "broken8" },
  { seq: "01020302", rate: 2, name: "pedal8" },
  { seq: "0..2.1..", rate: 2, name: "sparse8" },
];

/** Percussion patterns: per instrument, 16 steps, x hit, X accent. */
export type PercPattern = Partial<Record<Perc, string>>;
export const PERC: PercPattern[] = [
  /* 0 topsoil */ { kick: "x.......x.......", shaker: "..x...x...x...x.", wood: "....x.......x..." },
  /* 1 */ { kick: "x.....x...x.....", shaker: "x.x.x.x.x.x.x.x.", wood: "............x..." },
  /* 2 */ { kick: "x.......x...x...", shaker: "..xx..x...xx..x.", wood: "....x.......x.x." },
  /* 3 */ { kick: "x...............", shaker: "..x...x...x...x." },
  /* 4 stone */ { kick: "x.......x.......", drip: "...x.....x....x." },
  /* 5 */ { kick: "x...........x...", drip: "..x...x.x...x..." },
  /* 6 */ { kick: "x...............", drip: "x..x..x...x..x.." },
  /* 7 */ { kick: "x.......x.......", wood: "....x.......x..." },
  /* 8 fungal */ { kick: "x.......x.......", click: "..x.x...x.x.x..." },
  /* 9 */ { kick: "x.....x.........", click: "x.xx..x.x.xx..x." },
  /* 10 */ { kick: "x.......x..x....", click: "..x...x...x...xx" },
  /* 11 */ { kick: "x...x...x...x...", click: "......x.......x." },
  /* 12 magma */ { taiko: "X.......x.......", tom: "....x.x.....x.xx" },
  /* 13 */ { taiko: "X..x..x.x.......", tom: "....x.......x..." },
  /* 14 */ { taiko: "X.......x.x.....", tom: "..x.x.x...x.x.x." },
  /* 15 */ { taiko: "X...x...x...x...", tom: "..x.......x....x" },
  /* 16 ruins */ { tick: "x..............." },
  /* 17 */ { tick: "x.......x......." },
  /* 18 */ { kick: "x...............", tick: "........x......." },
  /* 19 */ { tick: "....x.......x..." },
  /* 20 core */ { heart: "X..x............", shaker: "..x...x...x...x." },
  /* 21 */ { heart: "X..x....x..x....", shaker: "....x.......x..." },
  /* 22 */ { heart: "X..x............", brush: "....x.......x..." },
  /* 23 */ { heart: "X..x.......x....", shaker: "x.x.x.x.x.x.x.x." },
  /* 24 town day */ { kick: "x.......x.......", brush: "....x.......x..." },
  /* 25 */ { kick: "x.....x...x.....", brush: "....x.......x.x." },
  /* 26 */ { kick: "x.......x.......", brush: "x...x...x...x...", shaker: "..x...x...x...x." },
  /* 27 */ { brush: "....x.......x...", wood: "x..........x...." },
  /* 28 ferrum stone */ { kick: "x.......x.......", anvil: "....x.......x..." },
  /* 29 */ { kick: "x...........x...", anvil: "......x.......x.", drip: "..x.......x....." },
];

/** The Seed motif in scale degrees: 1 - 5 - 6 - 5 - 3, durations 2, 1, 1, 2, 4 beats. */
export const SEED: Motif = [[0, 8], [4, 4], [5, 4], [4, 8], [2, 16]];

const TOPSOIL_MOTIF: Motif = [
  [4, 4], [2, 2], [4, 2], [5, 4], [4, 4],
  [2, 4], [1, 2], [0, 2], [1, 8],
  [4, 4], [2, 2], [4, 2], [7, 4], [5, 4],
  [4, 6], [2, 2], [0, 8],
];
const TOWN_MELODY: Motif = [
  [0, 4], [2, 4], [4, 6], [2, 2], [3, 4], [2, 4], [1, 8], [1, 4], [2, 4], [3, 6], [4, 2], [2, 16],
  [0, 4], [2, 4], [4, 6], [5, 2], [7, 6], [5, 2], [4, 8], [3, 4], [4, 4], [2, 4], [1, 4], [0, 16],
  [4, 4], [5, 4], [7, 8], [5, 4], [4, 4], [2, 8], [3, 4], [2, 4], [1, 4], [2, 4], [4, 16],
  [0, 4], [2, 4], [4, 6], [5, 2], [7, 4], [8, 4], [7, 8], [5, 4], [4, 4], [3, 4], [1, 4], [0, 16],
];

const base = {
  swing: 0.5,
  breath: [3, 5] as [number, number],
  odds: { bass: 0.85, arp: 0.7, perc: 0.75, lead: 0.55 },
};

export const SONGS: Record<string, Song> = {
  town: {
    ...base, id: "town", tonic: 74, mode: "ionian", bpm: 80, pent: [0, 2, 4, 7, 9], pentBase: 62,
    progs: [[0, 3, 0, 4], [0, 5, 1, 4], [3, 4, 0, 0], [0, 2, 5, 3], [1, 4, 0, 5], [0, 3, 4, 3]],
    bass: [0, 1, 3, 6], arp: [6, 9, 10, 11, 8, 5], perc: [24, 25, 26, 27],
    pad: "pad", padCut: 1600, bassInst: "bass", arpInst: "pluck", lead: "hum",
    motif: TOWN_MELODY.slice(0, 12), melody: TOWN_MELODY, centre: 62, bassLow: 38,
    seed: { chance: 0, inst: "bell", db: -14, wet: 0.8, oct: 1 },
  },
  townNight: {
    ...base, id: "townNight", tonic: 74, mode: "ionian", bpm: 60, pent: [0, 2, 4, 7, 9], pentBase: 62,
    progs: [[0, 3, 0, 3], [0, 5, 3, 4], [3, 0, 5, 0], [0, 2, 3, 0]],
    bass: [0, 4, 6, 9], arp: [11, 5, 11, 5, 10, 11], perc: [],
    pad: "pad", padCut: 1100, bassInst: "bass", arpInst: "pluck", lead: "bell",
    motif: TOWN_MELODY.slice(0, 12), melody: TOWN_MELODY, centre: 60, bassLow: 38,
    seed: { chance: 0, inst: "glass", db: -10, wet: 0.8, oct: 1 },
    breath: [2, 3], odds: { bass: 0.5, arp: 0.5, perc: 0, lead: 0.3 },
  },
  topsoil: {
    ...base, id: "topsoil", tonic: 74, mode: "ionian", bpm: 92, pent: [0, 2, 4, 7, 9], pentBase: 62,
    progs: [[0, 4, 5, 3], [0, 3, 0, 4], [5, 3, 0, 4], [3, 0, 1, 4], [0, 5, 3, 4], [0, 2, 3, 4], [0, 3, 5, 4, 0, 3, 1, 4], [0, 4, 5, 2, 3, 0, 3, 4]],
    bass: [1, 3, 5, 6], arp: [0, 2, 3, 6, 9, 11], perc: [0, 1, 2, 3],
    pad: "pad", padCut: 1800, bassInst: "bass", arpInst: "pluck", lead: "whistle",
    motif: TOPSOIL_MOTIF, centre: 62, bassLow: 38,
    seed: { chance: 0, inst: "bell", db: -14, wet: 0.8, oct: 1 },
  },
  stone: {
    ...base, id: "stone", tonic: 57, mode: "dorian", bpm: 84, pent: [0, 3, 5, 7, 10], pentBase: 57,
    progs: [[0, 3, 0, 3], [0, 6, 3, 0], [0, 2, 3, 6], [0, 3, 6, 0], [0, 4, 3, 0], [2, 3, 0, 0], [0, 6, 2, 3, 0, 6, 3, 0]],
    bass: [0, 3, 8, 9], arp: [6, 7, 9, 10, 11, 5], perc: [4, 5, 6, 7],
    pad: "organ", padCut: 900, bassInst: "pluck", arpInst: "pluck", lead: "triangle",
    motif: [[0, 6], [2, 2], [3, 8], [4, 4], [3, 4], [2, 8], [0, 6], [2, 2], [5, 4], [4, 4], [3, 4], [2, 4], [0, 8]],
    centre: 57, bassLow: 33,
    seed: { chance: 0.05, inst: "bell", db: -14, wet: 0.8, oct: 1 },
  },
  crystal: {
    ...base, id: "crystal", tonic: 64, mode: "lydian", bpm: 76, pent: [0, 2, 4, 7, 9], pentBase: 64,
    progs: [[0, 1, 0, 1], [0, 1, 4, 0], [0, 4, 1, 5], [0, 1, 5, 4], [5, 1, 0, 4], [0, 2, 1, 0], [0, 1, 0, 1, 5, 1, 4, 0]],
    bass: [0, 4, 6, 9], arp: [0, 2, 3, 4, 8, 10], perc: [],
    pad: "choir", padCut: 2400, bassInst: "bass", arpInst: "bell", lead: "bell",
    motif: [[0, 4], [4, 4], [3, 8], [4, 4], [5, 4], [6, 8], [7, 8], [6, 4], [4, 4], [3, 8], [4, 8]],
    centre: 64, bassLow: 40,
    seed: { chance: 0.1, inst: "glass", db: -10, wet: 0.7, oct: 1 },
    odds: { bass: 0.7, arp: 0.9, perc: 0, lead: 0.5 },
  },
  fungal: {
    ...base, id: "fungal", tonic: 59, mode: "aeolian", bpm: 70, swing: 0.58, pent: [0, 3, 5, 7, 10], pentBase: 59,
    progs: [[0, 5, 2, 6], [0, 3, 0, 4], [0, 6, 5, 6], [5, 6, 0, 0], [0, 3, 5, 4], [0, 2, 6, 3], [0, 5, 3, 4, 0, 5, 6, 0]],
    bass: [1, 3, 5, 7], arp: [0, 3, 4, 5, 9, 10], perc: [8, 9, 10, 11],
    pad: "pwm", padCut: 1300, bassInst: "bloop", arpInst: "marimba", lead: "triangle",
    motif: [[0, 3], [2, 3], [4, 2], [3, 4], [2, 4], [1, 6], [0, 2], [-1, 8], [0, 3], [2, 3], [4, 2], [5, 4], [4, 4], [2, 6], [1, 2], [0, 8]],
    centre: 59, bassLow: 35,
    seed: { chance: 0.15, inst: "marimba", db: -8, wet: 0.6, oct: 0, half: true },
  },
  magma: {
    ...base, id: "magma", tonic: 64, mode: "phrygian", bpm: 100, pent: [0, 3, 5, 7, 10], pentBase: 52,
    progs: [[0, 1, 0, 1], [0, 1, 2, 1], [0, 5, 1, 0], [0, 3, 1, 0], [5, 1, 0, 0], [0, 6, 1, 0], [0, 1, 0, 1, 3, 1, 5, 1]],
    bass: [2, 7, 2, 5], arp: [6, 7, 9, 10, 0, 3], perc: [12, 13, 14, 15],
    pad: "drive", padCut: 1100, bassInst: "drive", arpInst: "pluck", lead: "brass",
    motif: [[0, 2], [0, 2], [1, 4], [0, 8], [3, 4], [2, 4], [1, 8], [0, 2], [0, 2], [1, 4], [4, 4], [3, 4], [2, 4], [1, 4], [0, 8]],
    centre: 55, bassLow: 28,
    seed: { chance: 0.2, inst: "brass", db: -6, wet: 0.5, oct: -2 },
    odds: { bass: 0.95, arp: 0.5, perc: 0.85, lead: 0.55 },
  },
  ruins: {
    ...base, id: "ruins", tonic: 67, mode: "dorian", bpm: 66, pent: [0, 3, 5, 7, 10], pentBase: 55,
    progs: [[0, 3, 0, 3], [0, 6, 0, 6], [0, 2, 3, 0], [0, 4, 6, 0], [3, 0, 6, 0], [0, 3, 6, 3], [0, 6, 3, 0, 2, 6, 0, 0]],
    bass: [0, 4, 8, 9], arp: [5, 11, 6, 11, 10, 5], perc: [16, 17, 18, 19],
    pad: "choir", padCut: 1600, bassInst: "bass", arpInst: "bell", lead: "bell",
    motif: [[0, 8], [4, 8], [3, 12], [null, 4], [2, 8], [5, 8], [4, 12], [null, 4]],
    centre: 60, bassLow: 31,
    seed: { chance: 0.35, inst: "choir", db: -3, wet: 0.5, oct: 0 },
    breath: [2, 3], odds: { bass: 0.6, arp: 0.5, perc: 0.4, lead: 0.5 },
  },
  core: {
    ...base, id: "core", tonic: 69, mode: "lydian", bpm: 96, pent: [0, 2, 4, 7, 9], pentBase: 57,
    progs: [[0, 1, 0, 1], [0, 1, 5, 4], [0, 4, 1, 0], [0, 2, 1, 4], [5, 1, 4, 0], [0, 1, 4, 5], [0, 1, 0, 1, 5, 4, 1, 0]],
    bass: [0, 1, 6, 3], arp: [0, 2, 3, 6, 8, 4], perc: [20, 21, 22, 23],
    pad: "pad", padCut: 2400, bassInst: "bass", arpInst: "bell", lead: "whistle",
    motif: [[0, 4], [2, 4], [4, 8], [3, 8], [4, 8], [5, 4], [4, 4], [2, 8], [1, 8], [0, 8]],
    centre: 64, bassLow: 33,
    seed: { chance: 0.6, inst: "lead", db: 0, wet: 0.3, oct: 0 },
  },
  /** Cinder's stretched Magma: C Phrygian dominant at 104. */
  cinder: {
    ...base, id: "cinder", tonic: 60, mode: "phrygdom", bpm: 104, pent: [0, 4, 5, 7, 10], pentBase: 48,
    progs: [[0, 1, 0, 1], [0, 3, 1, 0], [0, 6, 1, 0], [3, 1, 0, 0], [0, 1, 3, 1], [0, 6, 3, 1]],
    bass: [2, 7, 2, 5], arp: [6, 7, 9, 10, 0, 3], perc: [12, 13, 14, 15],
    pad: "drive", padCut: 1200, bassInst: "drive", arpInst: "pluck", lead: "brass",
    motif: [[0, 2], [1, 2], [2, 4], [1, 8], [0, 4], [-1, 4], [0, 8], [4, 2], [5, 2], [4, 4], [2, 8], [1, 4], [0, 12]],
    centre: 55, bassLow: 36,
    seed: { chance: 0.2, inst: "brass", db: -6, wet: 0.5, oct: -2 },
    odds: { bass: 0.95, arp: 0.5, perc: 0.85, lead: 0.55 },
  },
};

/** Ferrum's stretched Stone: A Dorian with anvil percussion. */
SONGS.ferrum = { ...SONGS.stone, id: "ferrum", perc: [28, 29, 4, 7] };
/** The menus: the town night material (the music module muffles it and plays only pad and pluck). */
SONGS.menu = { ...SONGS.townNight, id: "menu", odds: { bass: 0, arp: 0.6, perc: 0, lead: 0 }, breath: [3, 4] };

export const BIOME_SONGS = ["topsoil", "stone", "crystal", "fungal", "magma", "ruins", "core"];

/** The song for a biome on a planet (section 8.1: Cinder's Magma, Ferrum's Stone). */
export function songFor(biome: number, planet: string) {
  if (planet === "cinder" && biome === 4) return SONGS.cinder;
  if (planet === "ferrum" && biome === 1) return SONGS.ferrum;
  return SONGS[BIOME_SONGS[Math.max(0, Math.min(6, biome))]];
}

// ---- theory -------------------------------------------------------------------------------------------------

/** MIDI of scale degree `d` (any integer) above the song's tonic, shifted by octaves. */
export function degree(song: Song, d: number, oct = 0) {
  const m = MODES[song.mode], o = Math.floor(d / 7), i = ((d % 7) + 7) % 7;
  return song.tonic + m[i] + 12 * (o + oct);
}
/** Pitch classes of the song's mode. */
export function scaleSet(song: Song) {
  const t = song.tonic % 12;
  return new Set(MODES[song.mode].map((x) => (t + x) % 12));
}
/** The triad on degree d: pitch classes (root, third, fifth). */
export function triad(song: Song, d: number) {
  return [0, 2, 4].map((x) => degree(song, d + x) % 12);
}
/** The chime ladder (section 4.1): MIDI of ladder index i (0..15) on the song's pentatonic. */
export function ladder(song: Song, i: number) {
  const n = song.pent.length;
  return song.pentBase + song.pent[((i % n) + n) % n] + 12 * Math.floor(i / n);
}
/** The tension drone's second note: a flat second, or a tritone in Lydian keys (section 8.5). */
export const droneInterval = (song: Song) => (song.mode === "lydian" ? 6 : 1);
