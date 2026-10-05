// The mix (design/audio.md section 2): five buses, the ducks, the earth filter and the room, the glue
// compressor, the master and the limiter, the settings.
//
//   music ─ duck ─ shelf ─ slider ┐
//   ambience ─ duck ─ slider ─────┼→ earth LP → low shelf ─┐
//                └→ room send ──────────────────→ room ────┤
//   effects ─ duck ─ slider ─ muffle ─┬────────────────────┤→ glue → master → master LP → limiter → out
//                                     └→ room send         │
//   tells ─ slider (never ducked) ─────────────────────────┤
//   ui ─ slider ───────────────────────────────────────────┘
import { Kit, db, hold } from "./kit.ts";
import { earth, slider } from "./pure.ts";

export { earth, slider };

export type Bus = "music" | "amb" | "fx" | "tells" | "ui";
export type Room = "tunnel" | "cave" | "hollow";

export interface Settings { master: number; music: number; effects: number; muted: boolean }

/**
 * Bus calibration (dB), measured with the offline lab (check/run.ts --raw) so each bus peaks near its nominal level at
 * full sliders: music -18 dBFS peak (about -30 RMS), effects -10 (blasts -3), tells -8, ui -16, ambience -26.
 */
export const TRIM: Record<Bus, number> = { music: -20, amb: -6, fx: -4, tells: -3, ui: -16 };


interface Duck { bus: Bus | "musicShelf"; depth: number; tauIn: number; tauOut: number; until: number; key: string }

export class Graph {
  readonly kit: Kit;
  /** Bus inputs: everything connects here. */
  readonly bus: Record<Bus, GainNode>;
  /** Where music players connect (before the duck); the music module adds its own reverb before this. */
  private duck: Record<"music" | "amb" | "fx", GainNode>;
  private musicShelf: BiquadFilterNode;
  private vol: Record<Bus, GainNode>;
  private earthLp: BiquadFilterNode;
  private earthShelf: BiquadFilterNode;
  private fxMuffle: BiquadFilterNode;
  private room: { conv: ConvolverNode; g: GainNode; kind: Room }[];
  private roomCur = 0;
  private roomIn: GainNode;
  readonly roomSend: { fx: GainNode; amb: GainNode };
  /** Extra reverb for an effect (blasts' +6/+8 dB send): wet only, follows the effects slider. */
  readonly fxWet: GainNode;
  private wetVol: GainNode;
  readonly glue: DynamicsCompressorNode;
  readonly limiter: DynamicsCompressorNode;
  private master: GainNode;
  private masterLp: BiquadFilterNode;
  private tellMeter: AnalyserNode;
  /** Paused game (a menu over play): effects and tells fade out; the music and the menu loop carry on. */
  private gate: GainNode;
  private gate2: GainNode;
  private meterBuf: Float32Array<ArrayBuffer>;
  private ducks: Duck[] = [];
  private duckState: Record<string, number> = {};
  private irs: Record<Room, AudioBuffer>;
  /** Visible, not muted, the slider: what the master is ramped to. */
  visible = true;
  settings: Settings = { master: 80, music: 60, effects: 80, muted: false };
  /** Effects time constant for the earth filter (surfacing 400 ms, diving 1.5 s, else 250 ms). */
  private earthTau = { tau: 0.25, until: 0 };
  private town = false;

  constructor(readonly ctx: BaseAudioContext, out: AudioNode = ctx.destination) {
    const k = (this.kit = new Kit(ctx));
    // WebAudio's compressor adds automatic makeup gain (pow(1 / full-range gain, 0.6)): about +1.7 dB for the limiter and
    // +5.8 dB for the glue. Fixed gains after each take it back out, so the chain is unity below threshold and the
    // limiter's ceiling stays under -1 dBFS (measured with the lab).
    this.limiter = ctx.createDynamicsCompressor();
    setComp(this.limiter, -3, 20, 0, 0.001, 0.08);
    this.limiter.connect(k.gain(db(-makeup(-3, 20, 0)))).connect(out);
    this.masterLp = k.filt("lowpass", 20000, 0.7);
    // A DC blocker: the deep booms (50 to 25 Hz glides) otherwise leave an infrasonic offset (lab busiest).
    this.masterLp.connect(k.filt("highpass", 20, 0.7)).connect(this.limiter);
    this.master = k.gain(0);
    this.master.connect(this.masterLp);
    this.glue = ctx.createDynamicsCompressor();
    // -12 dB at 2:1 rather than the design's -16 at 2.5: at -16 the glue pulled blasts to within 3 dB of the drill (lab blasts).
    setComp(this.glue, -12, 2, 6, 0.01, 0.18);
    this.glue.connect(k.gain(db(-makeup(-12, 2, 6)))).connect(this.master);

    // Earth filter: music and ambience only.
    this.earthLp = k.filt("lowpass", 20000, 0.707);
    this.earthShelf = k.filt("lowshelf", 200, 0.707);
    this.earthShelf.gain.value = 0;
    this.earthLp.connect(this.earthShelf).connect(this.glue);

    // Room: two convolvers crossfading.
    this.irs = { tunnel: k.ir(0.6, 6000), cave: k.ir(1.6, 6000), hollow: k.ir(3.2, 6000) };
    this.room = [0, 1].map((i) => {
      const conv = ctx.createConvolver();
      conv.buffer = this.irs[i ? "cave" : "tunnel"];
      const g = k.gain(i ? 0 : 1);
      conv.connect(g).connect(this.glue);
      return { conv, g, kind: (i ? "cave" : "tunnel") as Room };
    });
    this.roomIn = k.gain(0.5);
    for (const r of this.room) this.roomIn.connect(r.conv);
    this.roomSend = { fx: k.gain(0), amb: k.gain(0) };
    this.roomSend.fx.connect(this.roomIn);
    this.roomSend.amb.connect(this.roomIn);
    this.fxWet = k.gain(db(-14));
    this.wetVol = k.gain(1);
    this.fxWet.connect(this.wetVol).connect(this.roomIn);

    this.bus = { music: k.gain(), amb: k.gain(), fx: k.gain(), tells: k.gain(), ui: k.gain() };
    this.gate2 = k.gain(1);
    this.vol = { music: k.gain(), amb: k.gain(), fx: k.gain(), tells: k.gain(), ui: k.gain() };
    this.duck = { music: k.gain(), amb: k.gain(), fx: k.gain() };
    this.musicShelf = k.filt("highshelf", 5000, 0.707);
    this.musicShelf.gain.value = 0;
    this.bus.music.connect(this.duck.music).connect(this.musicShelf).connect(this.vol.music).connect(this.earthLp);
    this.bus.amb.connect(this.duck.amb).connect(this.vol.amb).connect(this.earthLp);
    this.vol.amb.connect(this.roomSend.amb);
    this.fxMuffle = k.filt("lowpass", 20000, 0.707);
    this.bus.fx.connect(this.gate2).connect(this.duck.fx).connect(this.vol.fx).connect(this.fxMuffle).connect(this.glue);
    this.fxMuffle.connect(this.roomSend.fx);
    this.tellMeter = ctx.createAnalyser();
    this.tellMeter.fftSize = 512;
    this.meterBuf = new Float32Array(new ArrayBuffer(512 * 4));
    this.bus.tells.connect(this.tellMeter);
    this.gate = k.gain(1);
    this.bus.tells.connect(this.gate).connect(this.vol.tells).connect(this.glue);
    this.bus.ui.connect(this.vol.ui).connect(this.glue);
    this.applySettings(0.005);
  }

  get now() { return this.ctx.currentTime; }

  /** Sliders and mute, live (mute ramps over 40 ms, never a jump). Tells keep a floor of music - 6 dB. */
  applySettings(tau = 0.04 / 3) {
    const s = this.settings, t = this.now;
    const m = slider(s.music), e = slider(s.effects);
    const tells = s.effects <= 0 ? 0 : Math.max(e, m * db(-6));
    const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, t, tau);
    set(this.vol.music, m * db(TRIM.music));
    set(this.vol.amb, e * db(TRIM.amb));
    set(this.vol.fx, e * db(TRIM.fx));
    set(this.wetVol, e * db(TRIM.fx));
    set(this.vol.ui, e * db(TRIM.ui));
    set(this.vol.tells, tells * db(TRIM.tells));
    this.setMaster(tau);
  }
  setMaster(tau = 0.04 / 3) {
    const s = this.settings;
    this.master.gain.setTargetAtTime(s.muted || !this.visible ? 0 : slider(s.master), this.now, tau);
  }

  // ---- ducks (section 2.2): the deepest wins, never the sum -------------------------------------------------

  /** Duck a bus by `depth` dB for `hold` s (attack and release in ms). Same key replaces. */
  duckBus(key: string, bus: Duck["bus"], depth: number, inMs: number, outMs: number, holdS: number) {
    const until = this.now + holdS;
    const d = this.ducks.find((x) => x.key === key && x.bus === bus);
    if (d) { d.until = Math.max(d.until, until); d.depth = Math.min(d.depth, depth); return; }
    this.ducks.push({ key, bus, depth, tauIn: inMs / 3000, tauOut: outMs / 3000, until });
  }

  private updateDucks() {
    const now = this.now;
    for (const bus of ["music", "amb", "fx", "musicShelf"] as const) {
      let depth = 0, tau = 0.2;
      for (const d of this.ducks) if (d.bus === bus && d.until > now && d.depth < depth) { depth = d.depth; tau = d.tauIn; }
      const prev = this.duckState[bus] ?? 0;
      if (depth > prev) {
        // Releasing: use the release of the duck that just ended.
        const ended = this.ducks.filter((d) => d.bus === bus && d.until <= now).sort((a, b) => b.until - a.until)[0];
        tau = ended?.tauOut ?? 0.2;
      }
      if (depth !== prev) {
        if (bus === "musicShelf") this.musicShelf.gain.setTargetAtTime(depth, now, tau);
        else this.duck[bus].gain.setTargetAtTime(db(depth), now, tau);
        this.duckState[bus] = depth;
      }
    }
    this.ducks = this.ducks.filter((d) => d.until > now - 5);
  }

  /** Short-term level of the tells bus (dB), for the "any tell active" duck. */
  tellLevel() {
    this.tellMeter.getFloatTimeDomainData(this.meterBuf);
    let s = 0;
    for (let i = 0; i < this.meterBuf.length; i++) s += this.meterBuf[i] * this.meterBuf[i];
    return 10 * Math.log10(s / this.meterBuf.length + 1e-12);
  }

  // ---- the earth filter and the room (section 2.5) ---------------------------------------------------------

  surfaceTransition(up: boolean) {
    this.earthTau = { tau: up ? 0.4 / 3 : 1.5 / 3, until: this.now + (up ? 0.4 : 1.5) };
  }

  /** Every frame: earth filter by row, ducks, the tell duck. */
  update(row: number, onSurface: boolean, menu: boolean) {
    const now = this.now;
    const tau = now < this.earthTau.until ? this.earthTau.tau : 0.25;
    const [lp, shelf] = menu ? [1200, 0] : onSurface ? [20000, 0] : earth(row);
    const lpParam = this.earthLp.frequency;
    if (Math.abs(lpParam.value - lp) > 1) lpParam.setTargetAtTime(lp, now, tau);
    this.earthShelf.gain.setTargetAtTime(shelf, now, tau);
    if (onSurface !== this.town) {
      this.town = onSurface;
      const s = onSurface ? 0 : 1;
      this.roomSend.fx.gain.setTargetAtTime(s * db(-14), now, onSurface ? 0.2 : 0.5);
      this.roomSend.amb.gain.setTargetAtTime(s * db(-8), now, onSurface ? 0.2 : 0.5);
    }
    if (this.tellLevel() > -40) {
      this.duckBus("tell", "music", -6, 30, 600, 0.05);
      this.duckBus("tell", "musicShelf", -6, 30, 600, 0.05);
      this.duckBus("tell", "amb", -4, 30, 600, 0.05);
    }
    this.updateDucks();
  }

  /** Change the room; equal-power crossfade over 1.5 s between the two convolvers. */
  setRoom(kind: Room) {
    if (this.room[this.roomCur].kind === kind) return;
    const now = this.now, next = 1 - this.roomCur, r = this.room[next];
    if (r.kind !== kind) {
      // Reload the idle convolver (it is silent: its gain is 0 unless a fade is still running).
      const fresh = this.ctx.createConvolver();
      fresh.buffer = this.irs[kind];
      this.roomIn.disconnect(r.conv);
      r.conv.disconnect();
      fresh.connect(r.g);
      this.roomIn.connect(fresh);
      r.conv = fresh;
      r.kind = kind;
    }
    const steps = 32, up = new Float32Array(steps), down = new Float32Array(steps);
    for (let i = 0; i < steps; i++) { const x = i / (steps - 1); up[i] = Math.sin((x * Math.PI) / 2); down[i] = Math.cos((x * Math.PI) / 2); }
    const cur = this.room[this.roomCur];
    hold(cur.g.gain, now); hold(r.g.gain, now);
    cur.g.gain.setValueCurveAtTime(down, now + 0.005, 1.5);
    r.g.gain.setValueCurveAtTime(up, now + 0.005, 1.5);
    this.roomCur = next;
  }
  get roomKind() { return this.room[this.roomCur].kind; }

  // ---- master effects ---------------------------------------------------------------------------------------

  /** Blast at the pod: master LP to 500 Hz in 15 ms, hold 500 ms, open over 700 ms. */
  muffledEars() {
    const p = this.masterLp.frequency, t = this.now;
    hold(p, t);
    p.exponentialRampToValueAtTime(500, t + 0.015);
    p.setValueAtTime(500, t + 0.515);
    p.exponentialRampToValueAtTime(20000, t + 1.215);
  }
  /** Wreck: master LP 20 kHz to 400 Hz and -12 dB over 1.2 s, back over 1.5 s. */
  wreckDip() {
    const p = this.masterLp.frequency, t = this.now;
    hold(p, t);
    p.exponentialRampToValueAtTime(400, t + 1.2);
    p.exponentialRampToValueAtTime(20000, t + 2.7);
    this.duckBus("wreck", "music", -12, 1200, 1500, 1.2);
    this.duckBus("wreck", "amb", -12, 1200, 1500, 1.2);
    this.duckBus("wreck", "fx", -12, 1200, 1500, 1.2);
  }
  /** A menu over the game: the world's sounds hold their breath. */
  pause(on: boolean) {
    for (const g of [this.gate, this.gate2]) g.gain.setTargetAtTime(on ? 0 : 1, this.now, on ? 0.06 : 0.15);
  }
  /** Spore cloud: effects LP 2.5 kHz while inside. */
  muffleFx(on: boolean) {
    this.fxMuffle.frequency.setTargetAtTime(on ? 2500 : 20000, this.now, 0.08);
  }

  /** Limiter gain reduction (dB, negative), for the debug overlay and the checks. */
  get reduction() { return this.limiter.reduction; }
}

/** The makeup gain (dB) Chromium's DynamicsCompressor applies: 0.6 x the reduction a full-scale input gets (knee ignored). */
export function makeup(threshold: number, ratio: number, knee: number) {
  void knee;
  const out = threshold + (0 - threshold) / ratio;
  return -out * 0.6;
}

function setComp(c: DynamicsCompressorNode, thr: number, ratio: number, knee: number, att: number, rel: number) {
  c.threshold.value = thr; c.ratio.value = ratio; c.knee.value = knee; c.attack.value = att; c.release.value = rel;
}

