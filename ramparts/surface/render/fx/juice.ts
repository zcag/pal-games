// Hitstop, screen shake budget and slow motion (art 5.4). The lead's loop reads `hitstop()`
// (ms left: skip sim steps while > 0) and `slowmo` (multiply sim dt). The fx clock itself
// stops during hitstop and slows with slow motion, so particles freeze with the scene.
import type { Stage } from "../api.ts";

export class Juice {
  shakeScale = 1;
  speed = 1;
  private stopUntil = 0;
  private lastStop = -9;
  private trauma = 0;
  private slowT0 = -9; private slowDur = 0; private slowMin = 1;
  private RT = 0;
  constructor(private stage: Stage) {}

  /**
   * Freeze the scene for `ms`. At most one per 400 ms; at 2x/3x only boss events, halved.
   * `prio` hitstops (boss kill, run-ending leak) override the 400 ms gap.
   */
  hitstop(ms: number, boss = false, prio = false): void {
    if (this.speed > 1) { if (!boss) return; ms *= 0.5; }
    if (!prio && this.RT - this.lastStop < 0.4) return;
    this.lastStop = this.RT;
    this.stopUntil = Math.max(this.stopUntil, this.RT + ms / 1000);
  }
  /** ms of hitstop left. */
  stopLeft(): number { return Math.max(0, (this.stopUntil - this.RT) * 1000); }

  /** Add trauma; the running sum is capped at 0.6 (art 5.4), scaled by the setting. */
  shake(t: number): void {
    const room = Math.max(0, 0.6 - this.trauma);
    const add = Math.min(t, room);
    if (add <= 0 || this.shakeScale <= 0) return;
    this.trauma += add;
    this.stage.shake(add * this.shakeScale);   // shakeScale stays 1 when the stage scales it itself
  }

  /** Slow motion: dips to `min` and eases back to 1 over `dur` seconds. */
  slow(min: number, dur: number): void { this.slowT0 = this.RT; this.slowDur = dur; this.slowMin = min; }
  get slowmo(): number {
    const a = this.RT - this.slowT0;
    if (a >= this.slowDur) return 1;
    const t = a / this.slowDur;
    // hold the dip for the first 30%, then ease back
    const back = t < 0.3 ? 0 : ((t - 0.3) / 0.7) ** 2;
    return this.slowMin + (1 - this.slowMin) * back;
  }

  /** Real-time tick; returns the fx clock scale for this frame. */
  tick(RT: number, dt: number): number {
    this.RT = RT;
    this.trauma = Math.max(0, this.trauma - 1.6 * dt);
    return RT < this.stopUntil ? 0 : this.slowmo;
  }
  reset(): void { this.stopUntil = 0; this.trauma = 0; this.slowT0 = -9; }
}
