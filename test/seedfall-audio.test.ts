// Checks of the music's decisions without sound: the notes stay in key, the
// variation and fatigue rules hold over simulated hours, tension thins and returns with hysteresis.
import { describe, expect, test } from "bun:test";
import { ARP, BASS, MODES, PERC, SEED, SONGS, degree, ladder, scaleSet, type Song } from "../seedfall/surface/audio/score.ts";
import { Composer, STAGES, Suites, Tension, VARIANTS, motifBars, tensionOf, type Note } from "../seedfall/surface/audio/plan.ts";
import { earth, mulberry, slider, warnSound } from "../seedfall/surface/audio/pure.ts";

const songs = Object.values(SONGS);
const sum = (m: [number | null, number][]) => m.reduce((a, [, l]) => a + l, 0);

describe("score data", () => {
  test("motifs fill whole bars", () => {
    for (const s of songs) {
      expect(sum(s.motif) % 16).toBe(0);
      if (s.melody) expect(sum(s.melody)).toBe(16 * 16);
    }
    expect(sum(SEED)).toBe(40);
  });
  test("chime pentatonics lie in their mode, base is the tonic's pitch class", () => {
    for (const s of songs) {
      const set = scaleSet(s);
      for (let i = 0; i < 16; i++) expect(set.has(ladder(s, i) % 12)).toBe(true);
      expect(s.pentBase % 12).toBe(s.tonic % 12);
    }
  });
  test("patterns are well formed", () => {
    for (const b of BASS) expect(b.length).toBe(16);
    for (const p of PERC) for (const k in p) expect(p[k as keyof typeof p]!.length).toBe(16);
    for (const s of songs) {
      for (const i of [...s.bass]) expect(BASS[i]).toBeDefined();
      for (const i of s.arp) expect(ARP[i]).toBeDefined();
      for (const i of s.perc) expect(PERC[i]).toBeDefined();
      expect(s.progs.length).toBeGreaterThanOrEqual(4);
      for (const pr of s.progs) { expect([4, 8]).toContain(pr.length); for (const d of pr) expect(d >= 0 && d < 7).toBe(true); }
    }
  });
});

/** Compose `minutes` of a song with tension wandering; returns notes and the composer. */
function hour(song: Song, minutes: number, seed: number, tensionWalk = true) {
  const rng = mulberry(seed), c = new Composer(song, rng), t = new Tension();
  c.logOn = true;
  const barSec = 240 / song.bpm, bars = Math.floor((minutes * 60) / barSec);
  const out: { bar: number; notes: Note[]; stage: number; layers: number; arp16: boolean }[] = [];
  let tau = 0;
  for (let b = 0; b < bars; b++) {
    if (tensionWalk) tau = Math.min(1, Math.max(0, tau + (rng() - 0.5) * 0.12));
    t.bar(tau, false);
    const o = c.bar(t, barSec);
    out.push({ bar: b, notes: o.notes, stage: t.stage, layers: o.phrase.layers.size, arp16: o.notes.some((n) => n.layer === "arp") && ARP[o.phrase.arp].rate === 1 });
  }
  return { out, c };
}

describe("music stays in key", () => {
  for (const s of songs) test(`${s.id}: an hour of notes`, () => {
    const set = scaleSet(s), { out } = hour(s, 60, 7);
    let n = 0, bad = 0;
    for (const b of out) for (const x of b.notes) {
      if (x.layer === "perc" || x.layer === "clock") continue;
      n++;
      if (!set.has(((x.midi % 12) + 12) % 12)) bad++;
    }
    expect(n).toBeGreaterThan(500);
    expect(bad).toBe(0);
  });
  test("the Seed motif is 1-5-6-5-3 in every mode", () => {
    for (const s of songs) {
      const pcs = SEED.map(([d]) => degree(s, d!) % 12);
      const m = MODES[s.mode];
      expect(pcs.map((p) => (p - (s.tonic % 12) + 12) % 12)).toEqual([0, m[4], m[5], m[4], m[2]]);
    }
  });
});

describe("variation and fatigue over an hour", () => {
  const report: string[] = [];
  for (const s of songs) test(`${s.id}`, () => {
    const { out, c } = hour(s, 60, 11);
    const log = c.log;
    // Never one of the last two progressions.
    for (let i = 2; i < log.length; i++) {
      if (s.progs.length > 2) { expect(log[i].prog).not.toBe(log[i - 1].prog); expect(log[i].prog).not.toBe(log[i - 2].prog); }
    }
    // Breaths every 3-5 phrases (Ruins and the night town 2-3).
    const breaths = log.map((l, i) => (l.breath ? i : -1)).filter((i) => i >= 0);
    for (let i = 1; i < breaths.length; i++) {
      const gap = breaths[i] - breaths[i - 1] - 1;
      expect(gap).toBeGreaterThanOrEqual(s.breath[0]);
      expect(gap).toBeLessThanOrEqual(s.breath[1]);
    }
    // At most 4 layers; at most 6 note-ons per beat; no sixteenth arp more than 16 bars in a row.
    let streak = 0, maxStreak = 0, maxBeat = 0;
    for (const b of out) {
      expect(b.layers).toBeLessThanOrEqual(4);
      streak = b.arp16 ? streak + 1 : 0;
      maxStreak = Math.max(maxStreak, streak);
      for (let beat = 0; beat < 4; beat++) maxBeat = Math.max(maxBeat, b.notes.filter((n) => Math.floor(n.step / 4) === beat).length);
    }
    expect(maxStreak).toBeLessThanOrEqual(16);
    expect(maxBeat).toBeLessThanOrEqual(6);
    // Every variant shows up within the hour where the lead plays.
    const counts = new Map<string, number>();
    for (const l of log) if (l.variant) counts.set(l.variant, (counts.get(l.variant) ?? 0) + 1);
    if (s.odds.lead > 0 && !s.melody) for (const [v] of VARIANTS) expect(counts.get(v) ?? 0).toBeGreaterThan(0);
    const seeds = log.filter((l) => l.seed).length, phrases = log.filter((l) => !l.breath).length;
    const progs = new Set(log.map((l) => l.prog)).size;
    report.push(`${s.id.padEnd(9)} phrases ${String(log.length).padStart(3)}  breaths ${String(breaths.length).padStart(2)}  progs used ${progs}/${s.progs.length}  seed ${(seeds / Math.max(1, phrases)).toFixed(2)} (want ${s.seed.chance})  arp16 max ${maxStreak} bars  note-ons/beat max ${maxBeat}  variants ${[...counts].map(([k, v]) => `${k}:${v}`).join(" ")}`);
  });
  test("report", () => { console.log("\n" + report.join("\n")); });
  test("variant weights 3/2/1/1/2 over 20 hours", () => {
    const { c } = hour(SONGS.topsoil, 20 * 60, 5, false);
    const counts = new Map<string, number>();
    for (const l of c.log) if (l.variant) counts.set(l.variant, (counts.get(l.variant) ?? 0) + 1);
    const total = [...counts.values()].reduce((a, b) => a + b, 0), wsum = VARIANTS.reduce((a, [, w]) => a + w, 0);
    for (const [v, w] of VARIANTS) expect(Math.abs((counts.get(v) ?? 0) / total - w / wsum)).toBeLessThan(0.04);
    console.log(`variants over 20 h (${total}): ${VARIANTS.map(([v, w]) => `${v} ${((counts.get(v) ?? 0) / total).toFixed(3)} (want ${(w / wsum).toFixed(3)})`).join(", ")}`);
  });
});

describe("suites", () => {
  test("3-6 min suites, 1-3 min gaps, 2-5 min after 45 minutes", () => {
    const s = new Suites(mulberry(3), 0);
    let state = true, since = 0;
    const suites: number[] = [], gaps: { len: number; at: number }[] = [];
    for (let t = 0; t < 3 * 3600; t++) {
      s.tick(t);
      if (s.playing !== state) {
        if (state) suites.push(t - since); else gaps.push({ len: t - since, at: since });
        state = s.playing; since = t;
      }
    }
    for (const l of suites) { expect(l).toBeGreaterThanOrEqual(180); expect(l).toBeLessThanOrEqual(361); }
    for (const g of gaps) {
      if (g.at < 45 * 60) { expect(g.len).toBeGreaterThanOrEqual(60); expect(g.len).toBeLessThanOrEqual(181); }
      else { expect(g.len).toBeGreaterThanOrEqual(120); expect(g.len).toBeLessThanOrEqual(301); }
    }
    console.log(`suites over 3 h: ${suites.length} (mean ${(suites.reduce((a, b) => a + b, 0) / suites.length / 60).toFixed(1)} min), gaps ${gaps.length} (before 45 min mean ${(avg(gaps.filter((g) => g.at < 2700).map((g) => g.len)) / 60).toFixed(1)} min, after ${(avg(gaps.filter((g) => g.at >= 2700).map((g) => g.len)) / 60).toFixed(1)} min)`);
  });
});
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

describe("tension", () => {
  test("τ from the pod", () => {
    const base = { fuel: 100, fuelHome: 50, hull: 100, hullMax: 100, heat: 0 };
    expect(tensionOf(base)).toBeCloseTo(0, 5); // twice home
    expect(tensionOf({ ...base, fuel: 52.5 })).toBeCloseTo(1, 5); // at the tick
    expect(tensionOf({ ...base, hull: 10 })).toBeCloseTo(0.8, 5);
    expect(tensionOf({ ...base, heat: 1 })).toBeCloseTo(0.8, 5);
  });
  test("drops on the bar, returns one stage per 2 bars below", () => {
    const t = new Tension();
    t.bar(0.5, false);
    expect(t.stage).toBe(2);
    t.bar(0.9, false);
    expect(t.stage).toBe(5);
    // Hovering just above a return threshold never flaps.
    for (let i = 0; i < 5; i++) { t.bar(0.76, false); expect(t.stage).toBe(5); }
    // Below 0.75 for one bar: no change; second bar: back one stage.
    t.bar(0.7, false); expect(t.stage).toBe(5);
    t.bar(0.7, false); expect(t.stage).toBe(4);
    // Then one at a time, 2 bars each.
    const seq: number[] = [];
    for (let i = 0; i < 10; i++) { t.bar(0, false); seq.push(t.stage); }
    expect(seq).toEqual([4, 3, 3, 2, 2, 1, 1, 0, 0, 0]);
  });
  test("crossing 0.85 lands on the beat; fuel under home is immediate and needs 2 bars to clear", () => {
    const t = new Tension();
    t.beat(0.86, false); expect(t.stage).toBe(5);
    t.beat(0.5, true); expect(t.under).toBe(true);
    t.bar(0.5, false); expect(t.under).toBe(true);
    t.bar(0.5, false); expect(t.under).toBe(false);
  });
  test("stage thresholds", () => { expect(STAGES.map((s) => s[0])).toEqual([0.25, 0.4, 0.55, 0.7, 0.85]); });
});

describe("mix helpers", () => {
  test("sliders", () => {
    expect(slider(0)).toBe(0);
    expect(slider(100)).toBeCloseTo(1, 5);
    expect(20 * Math.log10(slider(50))).toBeCloseTo(-40 * Math.pow(0.5, 1.6), 3);
  });
  test("earth filter", () => {
    expect(earth(-3)[0]).toBe(20000);
    expect(earth(30)[0]).toBeCloseTo(9000, 0);
    expect(earth(500)).toEqual([3200, 4]);
    expect(earth(770)[0]).toBeCloseTo(14000, 0);
  });
  test("warnings map the rules' ladder", () => {
    expect(warnSound("home", 1).sound).toBe("homeDouble");
    expect(warnSound("home", 2)).toEqual({ sound: "homeBeep", every: 2 });
    expect(warnSound("home", 3).sound).toBe("homeLow");
    expect(warnSound("home", 4).sound).toBe("sealed");
    expect(warnSound("fuel", 2)).toEqual({ sound: "fuelBeep", every: 1 });
    expect(warnSound("hull", 3)).toEqual({ sound: "alarm", every: 1.5 });
    expect(warnSound("hull", 0).sound).toBe(null);
  });
  test("motif lengths", () => { expect(motifBars(SONGS.topsoil.motif)).toBe(4); });
});
