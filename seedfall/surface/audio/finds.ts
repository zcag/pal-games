// Ore pickups and fanfares (design/audio.md section 4): the pentatonic chime ladder with its streak, the tier
// timbres, jackpot and artifact fanfares, cargo full, dropped nuggets, the record chime.
import { Kit, clamp, db, mtof } from "./kit.ts";
import type { Graph } from "./graph.ts";
import type { Music } from "./music.ts";
import { SEED, ladder, type Song } from "./score.ts";

export class Finds {
  private k: Kit;
  streak = 0;
  private lastPickup = -99;
  private lastJackpot = -99;
  private lastRecord = -99;
  song!: Song;
  /** Fundamentals played (MIDI), for the key checks. */
  log: number[] | null = null;

  constructor(private g: Graph, private music: Music) { this.k = g.kit; }

  /** A pickup: `count` notes 50 ms apart, each one streak step up. */
  pickup(tier: number, count: number, pan: number, firstOfKind: boolean) {
    const now = this.k.now;
    for (let i = 0; i < Math.max(1, Math.min(count, 8)); i++) {
      if (now - this.lastPickup <= 1.5) this.streak = Math.min(7, this.streak + 1);
      else this.streak = 0;
      this.lastPickup = now;
      const last = i === Math.min(count, 8) - 1;
      this.chime(tier, this.streak, now + i * 0.05, pan, last && firstOfKind);
    }
  }

  /** One ladder chime (section 4.1). Index past 15 becomes a harmony two steps below. */
  chime(tier: number, streak: number, at: number, pan: number, extra = false) {
    const k = this.k, raw = tier - 1 + streak, idx = Math.min(15, raw);
    const midi = ladder(this.song, idx);
    // -14 dB in the design; 4 dB up so the ladder reads over the music (lab pickups).
    const loud = -10 - Math.max(0, idx - 10);
    const s = k.shot("chime", this.g.bus.fx, at, loud, pan);
    this.voice(s, tier, idx, at, 0);
    if (raw > 15) this.voice(s, tier, idx - 2, at, -6);
    if (extra) this.voice(s, tier, Math.min(16, idx + 1), at + 0.05, -6);
    if (streak >= 7) k.nz(s, { kind: "white", type: "highpass", f: 8000, q: 0.7, a: 1, d: 60, db: -10, at });
    k.fin(s);
    this.log?.push(midi);
    if (tier >= 7) { const w = k.gain(db(6)); s.out.connect(w).connect(this.g.fxWet); }
    if (tier >= 10) {
      // A single echo at 180 ms, -10 dB, panned opposite.
      const e = k.shot("chime", this.g.bus.fx, at + 0.18, loud - 10, -pan || 0.4);
      this.voice(e, tier, idx, at + 0.18, 0);
      k.fin(e);
    }
  }

  /** The tier timbres. */
  private voice(s: ReturnType<Kit["shot"]>, tier: number, idx: number, at: number, gainDb: number) {
    const k = this.k, f = mtof(ladder(this.song, idx));
    if (tier <= 3) {
      k.tone(s, { f, a: 2, d: 180, db: gainDb, at });
      k.tone(s, { type: "triangle", f: 2 * f, a: 2, d: 180, db: gainDb - 14, at });
      return;
    }
    const d = tier <= 6 ? 220 : tier <= 9 ? 320 : 450;
    k.fm(s, f, 2, 1.5, 0.01, 120, 2, d, gainDb, at);
    // A fifth above (the ladder's next-but-two step, so it stays in key).
    if (tier <= 6) k.tone(s, { f: mtof(ladder(this.song, idx + 3)), a: 2, d: d * 0.8, db: gainDb - 12, at });
    if (tier >= 7 && tier <= 9) k.tone(s, { f: 4 * f, a: 2, d: d * 0.7, db: gainDb - 18, at });
    if (tier >= 10) k.tone(s, { f: 3 * f, a: 2, d, db: gainDb - 14, at });
  }

  /** Jackpot (2.4 s): an I chord stab, a sub thump, 8 ladder notes up, a held shimmer. Short version within 10 s. */
  jackpot(tier: number) {
    const k = this.k, now = k.now, short = now - this.lastJackpot < 10;
    this.lastJackpot = now;
    const fx = this.g.bus.fx, base = clamp(tier - 1, 0, 7);
    if (!short) {
      this.music.chord(this.song, [0, 2, 4], now, 0.5, fx, -8, 0);
      const s = k.shot("impact", fx, now, -6);
      k.thump(s, 50, 40, 400, 0);
      k.fin(s);
    }
    const t0 = now + (short ? 0 : 0.25);
    for (let i = 0; i < 8; i++) {
      const midi = ladder(this.song, Math.min(15, base + i)), at = t0 + i * 0.06;
      const s = k.shot("chime", fx, at, -12, (i / 7) * 1.2 - 0.6, 5);
      k.fm(s, mtof(midi), 2, 1.5, 0.01, 120, 2, 450, 0, at);
      k.tone(s, { f: 3 * mtof(midi), a: 2, d: 450, db: -14, at });
      k.fin(s);
      this.log?.push(midi);
    }
    if (!short) {
      const at = t0 + 8 * 0.06;
      for (const j of [0, 1]) {
        const midi = ladder(this.song, Math.min(15, base + 6 + j)), s = k.shot("chime", fx, at, -16, j ? 0.4 : -0.4, 5);
        k.tone(s, { f: mtof(midi), a: 30, hold: [1, 0.3, 1200] });
        k.fin(s);
        this.log?.push(midi);
      }
      this.duck(-8, 2.4);
    }
  }

  /** Artifact (3.5 s): root and fifth drone under the Seed motif on the glass bell, long reverb. Hushed. */
  artifact() {
    const k = this.k, now = k.now, fx = this.g.bus.fx, song = this.song;
    const root = mtof(song.tonic - 24);
    const s = k.shot("fx", fx, now, -16, 0, 5);
    k.tone(s, { f: root, a: 400, hold: [1, 2.2, 1500] });
    k.tone(s, { f: root * 1.5, a: 400, hold: [1, 2.2, 1500], db: -4 });
    k.fin(s);
    const wet = k.gain(db(10)), dest = k.gain(1);
    dest.connect(fx); dest.connect(wet).connect(this.g.fxWet);
    this.music.motif(song, SEED, now + 0.3, "glass", dest, -10, 0, 96);
    this.duck(-12, 3.5);
  }

  private duck(music: number, len: number) {
    this.g.duckBus("fanfare", "music", music, 80, 1500, len);
    this.g.duckBus("fanfare", "amb", -6, 80, 1500, len);
    this.g.duckBus("fanfare", "fx", -3, 80, 1500, len);
  }

  cargoFull() {
    const k = this.k, now = k.now, s = k.shot("tell", this.g.bus.tells, now, -6, 0, 5);
    k.thump(s, 70, 45, 180, 0);
    k.nz(s, { kind: "brown", type: "lowpass", f: 300, q: 0.7, a: 2, d: 80 });
    for (const dt of [0.2, 0.29]) k.tone(s, { type: "square", f: 110, a: 2, d: 60, lp: 600, db: -6, at: now + dt });
    k.fin(s);
  }

  nugget(pan: number) {
    const k = this.k, now = k.now, s = k.shot("fx", this.g.bus.fx, now, -18, pan);
    k.tone(s, { f: 900, f2: 600, glide: 50, a: 1, d: 50 });
    k.tone(s, { f: 900, f2: 600, glide: 50, a: 1, d: 50, db: -6, at: now + 0.14 });
    k.fin(s);
  }

  record() {
    const k = this.k, now = k.now;
    if (now - this.lastRecord < 20) return;
    this.lastRecord = now;
    const s = k.shot("ui", this.g.bus.ui, now, -22);
    k.tone(s, { f: mtof(ladder(this.song, 7)), a: 2, d: 400 });
    k.fin(s);
  }

  /** Streak decays after 1.5 s without a pickup. */
  update() { if (this.k.now - this.lastPickup > 1.5) this.streak = 0; }
}
