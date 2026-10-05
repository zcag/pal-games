// The world (design/audio.md section 6): hazard tells found by scanning the tiles around the pod every 0.25 s,
// hazard triggers, blasts, the core pulse, the room size, the cave ambience per biome and its creatures, and
// the artifact-near chime.
import { Kit, Persist, Ticker, clamp, db, lerp, mtof, poisson, range, rnd, startAll } from "./kit.ts";
import type { Graph, Room } from "./graph.ts";
import type { Lookup } from "./content.ts";
import { HAZ, W, type GameView, type PodView } from "../../game/types.ts";
import { SEED, SONGS, BIOME_SONGS, degree, ladder, songFor, type Song } from "./score.ts";

/** First row of each biome (world.md section 2); the core chamber's centre row. */
export const BIOME_ROWS = [0, 60, 160, 280, 400, 540, 680];
export const CHAMBER_ROW = 761;

interface Hiss { srcs: AudioScheduledSourceNode[]; pan: StereoPannerNode }
interface Bed { srcs: AudioScheduledSourceNode[] }

export class WorldSounds {
  private k: Kit;
  private gas: Persist<Hiss>[];
  private dust: Persist<Bed>;
  private lava: Persist<Bed & { pan: StereoPannerNode; out2: GainNode }>;
  private beds: Persist<Bed>[];
  private scanAt = 0;
  private near = {
    gas: [] as { x: number; y: number; d: number }[],
    boulder: null as { x: number; d: number } | null,
    lava: null as { x: number; d: number } | null,
    pocket: null as { x: number; d: number } | null,
    vents: [] as { x: number; d: number }[],
    artifact: null as { x: number; d: number } | null,
    crystal: false,
    falseFloor: false,
  };
  private fluidPrev = new Map<number, number>();
  private glugs: number[] = [];
  private trickleT = new Ticker(() => range(1.5, 3));
  private bubbleT = new Ticker(() => 1 / range(3, 8));
  private emberT = new Ticker(() => poisson(1 / 8));
  private ventT = new Ticker(() => 3);
  private artT = new Ticker(() => 4);
  private chargedVent = -99;
  private crumbled = false;
  private lastLavaTouch = -1;
  private lastRoomChange = -99;
  /** Ambience events: the next time per event kind, and the last event of any kind. */
  private ambNext = new Map<string, number>();
  private ambLast = -99;
  private glyphStep = 0;
  private wasNearCrystal = false;
  private inCloud = false;
  private coreSwell = 1;
  song!: Song;

  constructor(private g: Graph, private look: Lookup) {
    const k = (this.k = g.kit), tells = g.bus.tells, amb = g.bus.amb;
    this.gas = [0, 1].map(() => new Persist<Hiss>(k, tells, (out) => {
      const n = k.noiseSrc("white"), hp = k.filt("highpass", 3500), bp = k.filt("bandpass", 6000, 0.8), am = k.gain(0.83), lfo = k.osc("sine", 0.3), lg = k.gain(0.17), pan = k.panner(0);
      n.connect(hp).connect(bp).connect(am).connect(pan).connect(out);
      lfo.connect(lg).connect(am.gain);
      return { srcs: startAll([n, lfo], k.now), pan };
    }));
    this.dust = new Persist<Bed>(k, tells, (out) => {
      const n = k.noiseSrc("pink"), hp = k.filt("highpass", 1500);
      n.connect(hp).connect(out);
      return { srcs: startAll([n], k.now) };
    });
    this.lava = new Persist(k, tells, (out) => {
      const n = k.noiseSrc("brown"), lp = k.filt("lowpass", 150), pan = k.panner(0), g2 = k.gain(1), out2 = k.gain(1);
      n.connect(lp).connect(g2).connect(pan).connect(out);
      out2.connect(pan);
      return { srcs: startAll([n], k.now), pan, out2 };
    });
    this.beds = BIOME_SONGS.map((_, b) => new Persist<Bed>(k, amb, (out) => this.bed(b, out), 3));
  }

  private pos(x: number, y: number, pod: PodView) {
    const d = Math.hypot(x - pod.x, y - pod.y);
    return { pan: clamp((x - pod.x) / 8, -0.8, 0.8), db: -3 * Math.max(0, d - 1), d };
  }

  // ---- the beds (section 6.1) -------------------------------------------------------------------------------

  private bed(b: number, out: GainNode): Bed {
    const k = this.k, now = k.now, srcs: AudioScheduledSourceNode[] = [];
    const n = (kind: "white" | "pink" | "brown") => { const s = k.noiseSrc(kind); srcs.push(s); return s; };
    const o = (f: number, type: OscillatorType = "sine") => { const s = k.osc(type, f); srcs.push(s); return s; };
    const swell = (rate: number, depth: number) => { const g = k.gain(1 - depth), l = o(rate), lg = k.gain(depth); l.connect(lg).connect(g.gain); return g; };
    const song = SONGS[BIOME_SONGS[b]];
    switch (b) {
      case 0: { const s = swell(0.05, 0.4); n("pink").connect(k.filt("lowpass", 250)).connect(k.gain(db(-34))).connect(s).connect(out); break; }
      case 1: n("brown").connect(k.filt("lowpass", 120)).connect(k.gain(db(-36))).connect(out); break;
      case 2: {
        const root = mtof((song.pentBase % 12) + 48);
        o(root).connect(k.gain(db(-38))).connect(out);
        o(root * 1.5).connect(k.gain(db(-41))).connect(out);
        n("white").connect(k.filt("bandpass", 6000, 4)).connect(k.gain(db(-40))).connect(out);
        break;
      }
      case 3: { const s = swell(0.15, 0.5); n("pink").connect(k.filt("bandpass", 400, 1)).connect(k.gain(db(-34))).connect(s).connect(out); break; }
      case 4: { const s = swell(0.1, 0.4); n("brown").connect(k.filt("lowpass", 90)).connect(k.gain(db(-28))).connect(s).connect(out); break; }
      case 5: o(55).connect(k.gain(db(-42))).connect(out); break;
      case 6: { o(27.5).connect(k.gain(db(-30))).connect(out); o(55.4).connect(k.gain(db(-30))).connect(out); break; }
    }
    return { srcs: startAll(srcs, now) };
  }

  /** Bed weights for a row: crossfade over the 10-row band around each boundary. */
  private bedWeights(row: number, biome: number) {
    const w = new Array(7).fill(0);
    if (row < 0) return w;
    w[biome] = 1;
    for (let i = 1; i < BIOME_ROWS.length; i++) {
      const d = row - BIOME_ROWS[i];
      if (Math.abs(d) < 5) { const t = (d + 5) / 10; w.fill(0); w[i - 1] = Math.cos((t * Math.PI) / 2); w[i] = Math.sin((t * Math.PI) / 2); }
    }
    return w;
  }

  // ---- every frame ------------------------------------------------------------------------------------------

  update(view: GameView, onSurface: boolean, biome: number, planet: string) {
    const k = this.k, now = k.now, pod = view.pod, tells = this.g.bus.tells;
    if (now >= this.scanAt) { this.scanAt = now + 0.25; this.scan(view, onSurface); }

    // Gas hisses: the nearest two within 3 tiles.
    for (let i = 0; i < 2; i++) {
      const gt = this.near.gas[i];
      if (gt && !onSurface) {
        // design: -32 / -24 / -20 dB at 3 / 2 / 1 tiles, raised 9 dB so the hiss holds 6 dB over the music (lab rule-gas).
        const d = gt.d, gdb = 9 + (d <= 1 ? -20 : d <= 2 ? lerp(-20, -24, d - 1) : lerp(-24, -32, clamp(d - 2, 0, 1)));
        this.gas[i].set(db(gdb), 0.05);
        this.gas[i].v!.pan.pan.setTargetAtTime(clamp((gt.x - pod.x) / 8, -0.8, 0.8), now, 0.05);
      } else this.gas[i].set(0, 0.1);
    }
    // Loose boulders within 3 tiles: pebble trickles and a dust hiss.
    const bo = onSurface ? null : this.near.boulder;
    this.dust.set(bo ? db(-34 + 24 - 3 * Math.max(0, bo.d - 1)) : 0, 0.2); // +24 dB over the design for the mix rule (lab rule-boulder)
    if (bo) for (const at of this.trickleT.due(now, now + 0.1)) {
      const s = k.shot("tell", tells, at, -18 - 3 * Math.max(0, bo.d - 1), clamp((bo.x - pod.x) / 8, -0.8, 0.8), -bo.d);
      const n = 2 + Math.floor(rnd() * 3);
      let t = at;
      for (let i = 0; i < n; i++) { k.nz(s, { kind: "white", f: 2500, q: 2, a: 1, d: 10, at: t }); t += range(0.03, 0.07); }
      k.fin(s);
    }
    // Lava within 8 tiles: bubbles and a low roar, -36 dB at 8 tiles to -18 at 1.
    const lv = onSurface ? null : this.near.lava;
    if (lv) {
      const ldb = 7 + lerp(-18, -36, clamp((lv.d - 1) / 7, 0, 1)); // +7 dB over the design for the mix rule (lab rule-lava)
      this.lava.set(db(ldb), 0.2);
      const v = this.lava.v!;
      v.pan.pan.setTargetAtTime(clamp((lv.x - pod.x) / 8, -0.8, 0.8), now, 0.1);
      for (const at of this.bubbleT.due(now, now + 0.1)) {
        const s = k.shot("amb", v.out2, at, 6);
        const lp = k.filt("lowpass", 900); lp.connect(s.out);
        k.tone(s, { f: 120, f2: 260, glide: 40, a: 2, d: 60, to: lp });
        k.fin(s);
      }
    } else this.lava.set(0, 0.3);
    // Lava-pocket tiles within 2: an ember crackle.
    const pk = onSurface ? null : this.near.pocket;
    if (pk) for (const at of this.emberT.due(now, now + 0.1)) {
      const s = k.shot("tell", tells, at, -26, clamp((pk.x - pod.x) / 8, -0.8, 0.8), -pk.d);
      k.nz(s, { kind: "white", type: "highpass", f: 2500, q: 0.7, a: 0.5, d: 10 });
      k.fin(s);
    }
    // Spore vents within 5 breathe every 3 s (a spore_charge replaces the next breath with a rising one).
    const vent = onSurface ? undefined : this.near.vents[0];
    if (vent) for (const at of this.ventT.due(now, now + 0.1)) {
      if (now - this.chargedVent < 1.5) continue;
      const s = k.shot("tell", tells, at, -30 - 3 * Math.max(0, vent.d - 1), clamp((vent.x - pod.x) / 8, -0.8, 0.8), -vent.d);
      k.nz(s, { kind: "pink", f: 300, q: 2, a: 800, d: 800 });
      k.fin(s);
    }
    // A false floor under the pod crumbles: four short grains over 0.8 s.
    if (this.near.falseFloor && !this.crumbled) {
      this.crumbled = true;
      const s = k.shot("tell", tells, now, -14, 0, 3);
      for (let i = 0; i < 4; i++) k.nz(s, { kind: "white", f: 1500, q: 1, a: 1, d: 40, at: now + i * 0.2 + rnd() * 0.05 });
      k.fin(s);
    } else if (!this.near.falseFloor) this.crumbled = false;
    // Lava entering a tile near the pod: a glug, at most 3 per second.
    // (the scan fills `glugs` with tiles that just filled)
    this.glugs = this.glugs.filter((t) => t > now - 1);

    // Artifact near: the Seed motif's first two notes on the glass bell every 4 s, closer = louder and higher.
    const art = onSurface ? null : this.near.artifact;
    if (art) for (const at of this.artT.due(now, now + 0.1)) {
      const reach = view.modules.includes("ear") ? 20 : 10;
      const t = clamp((art.d - 1) / (reach - 1), 0, 1), steps = Math.floor((reach - art.d) / 3);
      const s = k.shot("amb", this.g.bus.amb, at, lerp(-18, -34, t), clamp((art.x - pod.x) / 8, -0.8, 0.8), 2);
      k.fm(s, mtof(ladder(this.song, 5 + steps)), 3.5, 2, 0.3, 500, 3, 900, 0, at);
      k.fm(s, mtof(ladder(this.song, 8 + steps)), 3.5, 2, 0.3, 500, 3, 900, 0, at + 0.45);
      k.fin(s);
    }

    // Spore clouds: the pod inside one muffles the effects.
    const inCloud = view.entities.some((e) => e.kind === "cloud" && Math.hypot(e.x - pod.x, e.y - pod.y) < (e.r ?? 1));
    if (inCloud !== this.inCloud) { this.inCloud = inCloud; this.g.muffleFx(inCloud); }

    // Beds and ambience events.
    const row = Math.floor(pod.y);
    const w = onSurface ? new Array(7).fill(0) : this.bedWeights(row, biome);
    for (let b = 0; b < 7; b++) {
      let lvl = w[b];
      if (b === 6 && lvl > 0) lvl *= db(12 * clamp((row - 680) / 80, 0, 1)) * this.coreSwell;
      this.beds[b].set(lvl, onSurface ? 0.2 : 0.4);
    }
    if (!onSurface) this.ambience(biome, planet);
    else this.ambLast = now;
  }

  /** Every 0.25 s: tiles around the pod for the tells, the room, and the artifact. */
  private scan(view: GameView, onSurface: boolean) {
    const w = view.world, pod = view.pod, now = this.k.now;
    const n = this.near;
    n.gas = []; n.boulder = null; n.lava = null; n.pocket = null; n.vents = []; n.artifact = null; n.crystal = false; n.falseFloor = false;
    if (onSurface) { this.g.setRoom("tunnel"); return; }
    const px = pod.x, py = pod.y, H = w.mat.length / W;
    const reach = view.modules.includes("ear") ? 20 : 10;
    let open = 0, crystals = 0;
    const R = Math.max(8, reach);
    for (let ty = Math.max(0, Math.floor(py - R)); ty <= Math.min(H - 1, Math.floor(py + R)); ty++) {
      for (let tx = Math.max(0, Math.floor(px - R)); tx <= Math.min(W - 1, Math.floor(px + R)); tx++) {
        const i = ty * W + tx, cx = tx + 0.5, cy = ty + 0.5, d = Math.hypot(cx - px, cy - py);
        const mat = w.mat[i], haz = w.haz[i], fl = w.fluid[i];
        if (d <= 4 && mat === 0) open++;
        if (d <= 3) {
          if (haz === HAZ.GAS) n.gas.push({ x: cx, y: cy, d });
          if (this.look.kind(mat) === "loose" && ty + 1 < H && w.mat[i + W] === 0 && (!n.boulder || d < n.boulder.d)) n.boulder = { x: cx, d };
          if (this.look.crystal(mat)) crystals++;
        }
        if (d <= 2 && haz === HAZ.LAVA_POCKET && (!n.pocket || d < n.pocket.d)) n.pocket = { x: cx, d };
        if (d <= 5 && haz === HAZ.SPORE_VENT) n.vents.push({ x: cx, d });
        if (d <= 8 && (fl > 0 || this.look.kind(mat) === "liquid") && (!n.lava || d < n.lava.d)) n.lava = { x: cx, d };
        if (d <= 5) {
          const prev = this.fluidPrev.get(i) ?? fl;
          if (prev === 0 && fl > 0 && this.glugs.length < 3) { this.glugs.push(now); this.glug(cx, cy, pod); }
          this.fluidPrev.set(i, fl);
        }
        if (d <= reach && w.find[i]) {
          const f = this.look.find(w.find[i]);
          if (f?.kind === "artifact" && (!n.artifact || d < n.artifact.d)) n.artifact = { x: cx, d };
        }
      }
    }
    if (this.fluidPrev.size > 400) this.fluidPrev.clear();
    n.gas.sort((a, b) => a.d - b.d);
    n.vents.sort((a, b) => a.d - b.d);
    n.crystal = crystals >= 5;
    const below = Math.floor(py + 0.6) * W + Math.floor(px);
    n.falseFloor = pod.grounded && w.haz[below] === HAZ.FALSE_FLOOR;
    // The room: forced hollow in the big structures.
    const big = w.structures.some((s) => /hollow|chamber|room|vault|hall|nursery|furnace/i.test(s.kind) && px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h);
    const room: Room = big || open > 30 ? "hollow" : open >= 12 ? "cave" : "tunnel";
    if (room !== this.g.roomKind && now - this.lastRoomChange > 1.6) { this.lastRoomChange = now; this.g.setRoom(room); }
  }

  private glug(x: number, y: number, pod: PodView) {
    const k = this.k, p = this.pos(x, y, pod);
    const s = k.shot("tell", this.g.bus.tells, k.now, -18 + p.db, p.pan, -p.d);
    k.tone(s, { f: 90, f2: 140, glide: 120, a: 5, d: 120 });
    k.fin(s);
  }

  // ---- ambience events --------------------------------------------------------------------------------------

  private ambience(biome: number, planet: string) {
    const k = this.k, now = k.now, amb = this.g.bus.amb;
    const ev = (key: string, mean: number, play: () => void) => {
      let t = this.ambNext.get(key);
      if (t === undefined) { t = now + poisson(mean); this.ambNext.set(key, t); }
      if (now >= t) {
        this.ambNext.set(key, now + poisson(mean));
        if (now - this.ambLast >= 1.5) { this.ambLast = now; play(); }
      }
    };
    const pan = () => range(-0.8, 0.8);
    const sh = (gainDb: number, p = pan(), at = now) => k.shot("amb", amb, at, gainDb, p);
    const song = songFor(biome, planet);
    switch (biome) {
      case 0:
        ev("creak", 20, () => { const s = sh(-28); const bp = k.filt("bandpass", 170, 3); bp.connect(s.out); k.tone(s, { type: "sawtooth", f: 180, f2: 160, glide: 600, a: 100, d: 600, to: bp }); k.fin(s); });
        ev("worm", 40, () => { const s = sh(-32); k.nz(s, { kind: "white", f: 2000, q: 2, a: 100, d: 300 }); k.fin(s); });
        break;
      case 1:
        ev("drip", 6, () => {
          const p = pan();
          [0, 0.19, 0.41].forEach((dt, i) => { const s = sh(-26 - 8 * i, i ? -p * 0.6 : p, now + dt); k.tone(s, { f: 900, f2: 1600, glide: 15, a: 1, d: 60 }); k.fin(s); });
        });
        ev("timber", 25, () => { const s = sh(-30); const bp = k.filt("bandpass", 220, 6); bp.connect(s.out); k.tone(s, { type: "sawtooth", f: 140, f2: 120, glide: 900, a: 200, d: 900, to: bp }); k.fin(s); });
        ev("bat", 30, () => { const s = sh(-30); for (let i = 0; i < 8; i++) k.nz(s, { kind: "white", f: 1200, q: 2, a: 1, d: 25, at: now + i / 20 }); k.fin(s); });
        break;
      case 2: {
        const chimes = () => {
          const s = sh(-26), n = 3 + Math.floor(rnd() * 4);
          let t = now;
          for (let i = 0; i < n; i++) { k.fm(s, mtof(ladder(song, 5 + Math.floor(rnd() * 7))), 3.5, 2, 0.3, 500, 2, 900, -2, t); t += range(0.07, 0.14); }
          k.fin(s);
        };
        if (this.near.crystal && !this.wasNearCrystal && now - this.ambLast >= 1.5) { this.ambLast = now; chimes(); }
        this.wasNearCrystal = this.near.crystal;
        ev("chimes", 15, chimes);
        ev("moth", 30, () => { const s = sh(-34); for (let i = 0; i < 10; i++) k.nz(s, { kind: "pink", f: 2400, q: 1, a: 2, d: 20, at: now + i * 0.035 }); k.fin(s); });
        break;
      }
      case 3:
        ev("crickets", 8, () => {
          const p = pan();
          for (const [v, dt] of [[0, 0], [1, range(0.7, 1.2)]] as const) {
            const s = sh(-30, v ? -p : p, now + dt), len = range(0.3, 0.6), f = 4200 * (v ? 1.04 : 1);
            for (let t = 0; t < len; t += 1 / 18) k.tone(s, { f, a: 2, d: 15, at: now + dt + t });
            k.fin(s);
          }
        });
        ev("pop", 12, () => { const s = sh(-28); k.tone(s, { f: 500, f2: 150, glide: 60, a: 2, d: 80 }); k.fin(s); });
        ev("glowcap", 20, () => { const s = sh(-30); k.tone(s, { f: mtof(ladder(song, 5 + Math.floor(rnd() * 5))), a: 300, d: 900 }); k.fin(s); });
        break;
      case 4:
        ev("rumble", 60, () => { const s = sh(-18, 0); k.nz(s, { kind: "brown", type: "lowpass", f: 60, q: 0.7, a: 800, d: 2500 }); k.fin(s); });
        ev("skitter", 20, () => { const s = sh(-30); for (let i = 0; i < 5; i++) k.nz(s, { kind: "white", type: "highpass", f: 3000, q: 0.7, a: 0.5, d: 10, at: now + i * range(0.03, 0.06) }); k.fin(s); });
        ev("ember", 6, () => { const s = sh(-32); k.nz(s, { kind: "white", f: 1800, q: 1, a: 0.5, d: 30 }); k.fin(s); });
        ev("bubble", 4, () => { const s = sh(-40); k.tone(s, { f: 120, f2: 260, glide: 40, a: 2, d: 60, lp: 900 }); k.fin(s); });
        break;
      case 5:
        ev("glyph", 8, () => {
          const s = sh(-28), base = this.glyphStep++ % 5;
          for (let i = 0; i < 3; i++) {
            const f = mtof(ladder(song, 5 + base + i)), at = now + i * 0.6;
            k.tone(s, { f, a: 300, hold: [1, 0.5, 900], at });
            k.tone(s, { f: f * 1.5, a: 300, hold: [1, 0.5, 900], db: -6, at });
          }
          k.fin(s);
        });
        ev("dust", 20, () => { const s = sh(-34); k.nz(s, { kind: "pink", type: "highpass", f: 2000, q: 0.7, a: 300, d: 1500 }); k.fin(s); });
        ev("clock", 90, () => { const s = sh(-26); k.tone(s, { f: 1900, a: 0.5, d: 18 }); k.fin(s); });
        break;
      case 6:
        ev("mote", 10, () => { const s = sh(-32); k.tone(s, { f: 2637, f2: 2960, glide: 1200, a: 400, d: 1200 }); k.fin(s); });
        break;
    }
  }

  // ---- hazard triggers ----------------------------------------------------------------------------------------

  gasFuse(x: number, y: number, fuse: number, pod: PodView) {
    const k = this.k, now = k.now, p = this.pos(x, y, pod), f = Math.max(0.3, fuse);
    const s = k.shot("tell", this.g.bus.tells, now, p.db, p.pan, 99);
    const n = k.nz(s, { kind: "white", f: 1500, f2: 7000, sweep: f * 1000, q: 1.5, a: f * 900, d: 80, db: -6 });
    n.g.gain.cancelScheduledValues(now);
    n.g.gain.setValueAtTime(0, now);
    n.g.gain.linearRampToValueAtTime(db(-18), now + 0.02);
    n.g.gain.exponentialRampToValueAtTime(db(-6), now + f);
    n.g.gain.linearRampToValueAtTime(0, now + f + 0.03);
    const t = k.tone(s, { f: 300, f2: 1200, glide: f * 1000, a: 10, hold: [1, f, 30], db: -18 });
    // Tremolo accelerating 6 to 20 Hz.
    const lfo = k.osc("sine", 6), lg = k.gain(0.5), am = k.gain(0.5);
    lfo.frequency.setValueAtTime(6, now);
    lfo.frequency.linearRampToValueAtTime(20, now + f);
    t.g.disconnect(); t.g.connect(am).connect(s.out);
    lfo.connect(lg).connect(am.gain);
    lfo.start(now); s.srcs.push(lfo);
    s.end = Math.max(s.end, now + f + 0.05);
    k.fin(s);
    this.g.duckBus("fuse", "music", -6, 30, 600, f);
  }

  /** A blast; `podHit` when the pod took damage in the same tick (muffled ears). */
  explode(x: number, y: number, kind: "gas" | "dynamite" | "charge", pod: PodView, podHit: boolean) {
    const k = this.k, now = k.now, p = this.pos(x, y, pod);
    const s = k.shot("impact", this.g.bus.fx, now, Math.max(-24, p.db), p.pan, 9);
    const wet = k.gain(db(kind === "charge" ? 8 : 6));
    s.out.connect(wet).connect(this.g.fxWet);
    if (kind === "gas") {
      k.tone(s, { f: 80, f2: 30, glide: 600, a: 5, d: 600, db: -2 });
      k.nz(s, { kind: "white", type: "lowpass", f: 6000, f2: 300, sweep: 700, q: 0.7, a: 2, d: 700, db: -6 });
      for (let i = 0; i < 8; i++) k.nz(s, { kind: "white", f: range(1500, 4000), q: 2, a: 0.5, d: 15, db: -14, at: now + 0.05 + rnd() * 0.3 });
    } else if (kind === "dynamite") {
      k.crack(s, -2, 1000, 5);
      k.tone(s, { f: 70, f2: 35, glide: 500, a: 5, d: 500, db: -3 });
      k.nz(s, { kind: "white", type: "lowpass", f: 5000, f2: 250, sweep: 500, q: 0.7, a: 2, d: 500, db: -6 });
    } else {
      k.tone(s, { f: 50, f2: 25, glide: 1200, a: 5, d: 1200, db: 0 });
      k.nz(s, { kind: "brown", type: "lowpass", f: 120, q: 0.7, a: 50, d: 1000, db: -6 });
      k.nz(s, { kind: "white", type: "highpass", f: 1500, q: 0.7, a: 0.5, d: 300, db: -8 });
    }
    k.fin(s);
    if (p.d <= 6) { this.g.duckBus("blast", "music", -10, 10, 1200, 0.3); this.g.duckBus("blast", "amb", -10, 10, 1200, 0.3); }
    if (podHit) {
      this.g.muffledEars();
      const e = k.shot("fx", this.g.bus.fx, now, -32);
      k.tone(e, { f: 4000, a: 20, d: 1500 });
      k.fin(e);
    }
  }

  wobble(x: number, y: number, pod: PodView) {
    const k = this.k, now = k.now, p = this.pos(x, y, pod);
    const s = k.shot("tell", this.g.bus.tells, now, p.db, p.pan, -p.d + 1);
    for (let i = 0; i < 6; i++) k.nz(s, { kind: "white", f: 700, q: 2, a: 2, d: 40, db: -16 + i * 1.2, at: now + i / 10 });
    k.tone(s, { f: 60, a: 100, hold: [1, 0.5, 100], db: -14 });
    k.fin(s);
  }

  fallLand(x: number, y: number, pod: PodView) {
    const k = this.k, now = k.now, p = this.pos(x, y, pod);
    const s = k.shot("impact", this.g.bus.fx, now, p.db, p.pan);
    k.thump(s, 55, 30, 300, -3);
    k.nz(s, { kind: "brown", type: "lowpass", f: 400, q: 0.7, a: 2, d: 400, db: -4 });
    for (let i = 0; i < 5; i++) k.nz(s, { kind: "white", f: range(1500, 3500), q: 2, a: 0.5, d: 12, db: -16, at: now + 0.04 + rnd() * 0.25 });
    k.fin(s);
  }

  /** The lava sizzle and steam; repeats at most every 400 ms while in contact. */
  lavaTouch() {
    const now = this.k.now;
    if (now - this.lastLavaTouch < 0.4) return;
    this.lastLavaTouch = now;
    this.sizzle(now, -6);
  }
  sizzle(at: number, gainDb: number) {
    const k = this.k, s = k.shot("tell", this.g.bus.tells, at, gainDb, 0, 4);
    const n = k.nz(s, { kind: "white", type: "highpass", f: 2000, q: 0.7, a: 5, d: 400 });
    const am = k.gain(0.6), lfo = k.noiseSrc("white", 0.0007), lfoG = k.gain(0.4);
    n.g.disconnect(); n.g.connect(am).connect(s.out);
    lfo.connect(lfoG).connect(am.gain);
    lfo.start(at); s.srcs.push(lfo);
    k.nz(s, { kind: "pink", f: 3000, q: 1, a: 10, d: 800, db: -8, at: at + 0.1 });
    k.fin(s);
  }

  spore(x: number, y: number, pod: PodView) {
    const k = this.k, now = k.now, p = this.pos(x, y, pod);
    const s = k.shot("tell", this.g.bus.tells, now, p.db, p.pan, -p.d);
    k.nz(s, { kind: "pink", f: 500, f2: 250, sweep: 300, q: 1.5, a: 20, d: 300, db: -10 });
    k.nz(s, { kind: "white", type: "highpass", f: 4000, q: 0.7, a: 100, d: 1500, db: -26 });
    k.fin(s);
  }

  /** The vent swells before it puffs: a rising last breath instead of the fixed rhythm. */
  sporeCharge(x: number, y: number, pod: PodView) {
    const k = this.k, now = k.now, p = this.pos(x, y, pod);
    this.chargedVent = now;
    const s = k.shot("tell", this.g.bus.tells, now, -22 + p.db, p.pan, 3);
    k.nz(s, { kind: "pink", f: 300, f2: 700, sweep: 1000, q: 2, a: 900, d: 150 });
    k.fin(s);
  }

  arc(x1: number, y1: number, x2: number, y2: number, phase: "charge" | "fire", pod: PodView) {
    const k = this.k, now = k.now, p = this.pos((x1 + x2) / 2, (y1 + y2) / 2, pod);
    if (phase === "charge") {
      const s = k.shot("tell", this.g.bus.tells, now, p.db, p.pan, 4);
      const bp = k.filt("bandpass", 400, 5); bp.connect(s.out);
      const t = k.tone(s, { type: "sawtooth", f: 50, f2: 200, glide: 400, a: 10, hold: [1, 0.4, 40], db: -10, to: bp });
      t.g.gain.cancelScheduledValues(now);
      t.g.gain.setValueAtTime(0, now);
      t.g.gain.linearRampToValueAtTime(db(-24), now + 0.01);
      t.g.gain.exponentialRampToValueAtTime(db(-10), now + 0.4);
      t.g.gain.linearRampToValueAtTime(0, now + 0.45);
      let tt = 0;
      while (tt < 0.4) { k.nz(s, { kind: "white", type: "highpass", f: 3000, q: 0.7, a: 0.5, d: 8, db: -16, at: now + tt }); tt += 1 / lerp(5, 40, tt / 0.4); }
      k.fin(s);
    } else this.zap(now, p.db, p.pan, 1);
  }
  zapTail() { this.zap(this.k.now, -8, 0, 0.3); }
  private zap(at: number, gainDb: number, pan: number, len: number) {
    const k = this.k, s = k.shot("impact", this.g.bus.fx, at, gainDb - 6, pan, 4);
    k.crack(s, 0, 2000, 8, at);
    const sh = k.ctx.createWaveShaper(); sh.curve = k.curve("hard");
    const bp = k.filt("bandpass", 1800, 1), am = k.gain(0.7), mix = k.gain(1);
    mix.connect(sh).connect(bp).connect(am).connect(s.out);
    k.tone(s, { type: "square", f: 100, a: 5, hold: [1, len, 60], to: mix });
    k.nz(s, { type: "highpass", f: 200, q: 0.5, a: 2, hold: [1, len, 60], to: mix, db: -4 });
    const lfo = k.noiseSrc("white", 0.0007), lg = k.gain(0.3);
    lfo.connect(lg).connect(am.gain); lfo.start(at); s.srcs.push(lfo);
    k.fin(s);
  }

  /** The core beat: lub-dub now (level by depth), the whoomp when the ring passes the pod. Returns the arrival time. */
  pulse(pod: PodView, biome: number) {
    const k = this.k, now = k.now;
    const level = biome >= 6 ? -12 : biome === 5 ? -30 : biome === 4 ? -40 : -99;
    if (level > -90) {
      const s = k.shot("fx", this.g.bus.fx, now, level);
      k.thump(s, 48, 40, 160, 0);
      k.thump(s, 42, 36, 200, 0, now + 0.14);
      k.fin(s);
    }
    const arrival = now + Math.max(0, (CHAMBER_ROW - pod.y) / 40);
    if (biome >= 5 || pod.y > 500) {
      const s = k.shot("fx", this.g.bus.fx, arrival, -8);
      k.nz(s, { kind: "pink", type: "lowpass", f: 200, f2: 2000, sweep: 450, q: 0.7, a: 50, d: 400 });
      k.fin(s);
      this.sizzle(arrival, -18);
    }
    return arrival;
  }

  /** Item fuses: dynamite's 2 s sparkler, the big charge's 3 s beeps rising 2/s to 6/s. */
  fuse(kind: "dynamite" | "charge") {
    const k = this.k, now = k.now, s = k.shot("tell", this.g.bus.tells, now, -16, 0, 99);
    if (kind === "dynamite") {
      k.nz(s, { kind: "white", f: 4000, q: 2, a: 20, hold: [1, 2, 50] });
      for (let t = 0; t < 2; t += poisson(0.05)) k.nz(s, { kind: "white", type: "highpass", f: 5000, q: 0.7, a: 0.5, d: 8, db: -4, at: now + t });
    } else {
      let t = 0;
      while (t < 3) { k.tone(s, { f: 660, a: 2, d: 40, at: now + t }); t += 1 / lerp(2, 6, t / 3); }
    }
    k.fin(s);
  }

  /** The launch's wake: the hum and the Core bed swell 12 dB over 3 s. */
  launchSwell(on: boolean) { this.coreSwell = on ? db(12) : 1; }

  /** A cache cracked open: a soft break, a little shimmer of the ladder. */
  cache(x: number, y: number, pod: PodView) {
    const k = this.k, now = k.now, p = this.pos(x, y, pod);
    const s = k.shot("fx", this.g.bus.fx, now, -10 + Math.max(-12, p.db), p.pan);
    k.nz(s, { kind: "brown", type: "lowpass", f: 900, f2: 300, sweep: 120, q: 0.7, a: 2, d: 150 });
    for (let i = 0; i < 4; i++) k.tone(s, { f: mtof(ladder(this.song, 6 + i)), a: 2, d: 250, db: -10, at: now + 0.06 + i * 0.06 });
    k.fin(s);
  }

  /** For checks: what the last scan found. */
  get nearby() { return this.near; }
}

/** The glass-bell Seed note used by the scanner and fanfares. */
export function seedNote(song: Song, i: number, oct = 1) { return mtof(degree(song, SEED[i][0]!, oct)); }
