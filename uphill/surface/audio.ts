// Uphill's sound, all synthesized: an engine whose pitch follows the wheels
// and opens up on the gas, a thump for every landing (louder the harder), a
// chime for coins, a rising run for fuel, a crunch for the end. Nothing plays
// until the first key (the browser's rule), and hiding the panel suspends it.

export class Sound {
  ctx: AudioContext | null = null;
  master!: GainNode;
  eng?: { a: OscillatorNode; b: OscillatorNode; filter: BiquadFilterNode; gain: GainNode };
  volume = 0.7;
  muted = false;

  start() {
    if (this.ctx) { if (this.ctx.state === "suspended") void this.ctx.resume(); return; }
    const ctx = (this.ctx = new AudioContext());
    this.master = ctx.createGain();
    this.master.gain.value = this.level();
    this.master.connect(ctx.destination);
    const a = ctx.createOscillator(), b = ctx.createOscillator();
    a.type = "sawtooth"; b.type = "square";
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass"; filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const bg = ctx.createGain();
    bg.gain.value = 0.45;
    a.connect(filter); b.connect(bg); bg.connect(filter); filter.connect(gain); gain.connect(this.master);
    a.start(); b.start();
    this.eng = { a, b, filter, gain };
  }
  level() { return this.muted ? 0 : this.volume * 0.9; }
  setVolume(v: number) { this.volume = v; if (this.ctx) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.05); }
  toggle() { this.muted = !this.muted; this.setVolume(this.volume); return this.muted; }
  suspend() { void this.ctx?.suspend(); }

  /** Every frame: rpm from the wheels (rad/s), the throttle 0..1, whether the engine runs at all. */
  engine(rpm: number, throttle: number, running: boolean) {
    if (!this.ctx || !this.eng) return;
    const t = this.ctx.currentTime, e = this.eng;
    const f = 34 + Math.min(40, rpm) * 2.9 + throttle * 10;
    // A slight wobble, so it idles like a little two-stroke and not a test tone.
    const wob = 1 + Math.sin(t * 31) * 0.015;
    e.a.frequency.setTargetAtTime(f * wob, t, 0.04);
    e.b.frequency.setTargetAtTime(f * 0.5, t, 0.04);
    e.filter.frequency.setTargetAtTime(240 + throttle * 900 + rpm * 18, t, 0.06);
    e.gain.gain.setTargetAtTime(running ? 0.05 + throttle * 0.06 : 0, t, running ? 0.08 : 0.4);
  }

  private env(node: AudioNode, peak: number, attack: number, decay: number, when = 0) {
    const ctx = this.ctx!, t = ctx.currentTime + when, g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    node.connect(g); g.connect(this.master);
    return t;
  }
  private tone(type: OscillatorType, from: number, to: number, peak: number, decay: number, when = 0) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    const t = this.env(o, peak, 0.005, decay, when);
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + decay);
    o.start(t); o.stop(t + decay + 0.05);
  }
  private noise(peak: number, decay: number, cutoff: number) {
    if (!this.ctx) return;
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * (decay + 0.05)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter();
    src.buffer = buf; lp.type = "lowpass"; lp.frequency.value = cutoff;
    src.connect(lp);
    const t = this.env(lp, peak, 0.004, decay);
    src.start(t);
  }

  land(hit: number) {
    const k = Math.min(1, hit / 9);
    if (k < 0.08) return;
    this.tone("sine", 110, 38, 0.25 + k * 0.45, 0.18 + k * 0.12);
    this.noise(0.05 + k * 0.18, 0.12 + k * 0.1, 500);
  }
  coin(n: number) { this.tone("square", 1318, 1320, 0.05, 0.06); this.tone("square", 1760 + (n % 5) * 60, 1762, 0.05, 0.12, 0.05); }
  fuel() { [523, 659, 784, 1046].forEach((f, i) => this.tone("triangle", f, f, 0.13, 0.12, i * 0.06)); }
  bonus() { [784, 988, 1175, 1568].forEach((f, i) => this.tone("square", f, f, 0.05, 0.1, i * 0.05)); }
  crash() { this.noise(0.4, 0.45, 1400); this.tone("sine", 140, 30, 0.5, 0.5); }
  empty() { this.tone("triangle", 330, 160, 0.12, 0.5); }
  low() { this.tone("sine", 880, 880, 0.06, 0.08); this.tone("sine", 660, 660, 0.06, 0.08, 0.12); }
}
