// The audio's pure functions (no WebAudio): the units, the seeded generator, the slider law, the earth filter and the
// warning ladder. kit.ts, graph.ts and pod.ts re-export them; the tests import them from here.

export const db = (d: number) => (d <= -120 ? 0 : Math.pow(10, d / 20));
export const todb = (g: number) => (g <= 1e-6 ? -120 : 20 * Math.log10(g));
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A seeded generator (mulberry32), so the music's choices and the checks are reproducible. */
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Slider to gain (section 2.4): 0 is silence, else dB = -40 (1 - v/100)^1.6. */
export const slider = (v: number) => (v <= 0 ? 0 : db(-40 * Math.pow(1 - clamp(v, 0, 100) / 100, 1.6)));

/** The earth filter by row (section 2.5): [LP cutoff, low shelf dB]. */
export function earth(row: number): [number, number] {
  if (row < 0) return [20000, 0];
  if (row < 30) { const t = row / 30; return [lerp(20000, 9000, t), lerp(0, 2, t)]; }
  if (row < 400) { const t = (row - 30) / 370; return [9000 * Math.pow(3200 / 9000, t), lerp(2, 4, t)]; }
  if (row < 680) return [3200, 4];
  const t = clamp((row - 680) / 90, 0, 1);
  return [3200 * Math.pow(14000 / 3200, t), lerp(4, 6, t)];
}

/** Warning sounds by what and level (section 5.3). The rules' ladder: 1 amber, 2 red, 3 critical; home 4 = sealed in. */
export type WarnSound = "homeDouble" | "homeBeep" | "homeLow" | "fuelBeep" | "sealed" | "creak" | "alarm" | null;
export function warnSound(what: string, level: number): { sound: WarnSound; every: number } {
  if (level <= 0) return { sound: null, every: 0 };
  switch (what) {
    case "home": return level >= 4 ? { sound: "sealed", every: 0 } : level === 3 ? { sound: "homeLow", every: 0 } : level === 2 ? { sound: "homeBeep", every: 2 } : { sound: "homeDouble", every: 0 };
    case "fuel": return level >= 2 ? { sound: "fuelBeep", every: 1 } : { sound: null, every: 0 };
    case "hull": return level >= 3 ? { sound: "alarm", every: 1.5 } : level === 2 ? { sound: "creak", every: 3 } : { sound: null, every: 0 };
    default: return { sound: null, every: 0 }; // heat: the continuous ticks carry it
  }
}
