// The camera: a critically damped spring on the pod with look-ahead (art.md 1.2, core-loop camera).
import type { GameView } from "../game/types.ts";
import { W } from "../game/types.ts";
import type { Camera } from "./view.ts";
import { CHAMBER } from "../game/content/world.ts";

export class CameraRig implements Camera {
  x = 24; y = -3; tilePx = 32; w = 720; h = 390;
  private vx = 0; private vy = 0;
  private lx = 0; private ly = 0;

  snap(view: GameView) { const t = this.target(view); this.x = t.x; this.y = t.y; this.vx = this.vy = 0; }

  private target(view: GameView) {
    const p = view.pod;
    const surface = p.y < 0.5;
    // look-ahead: facing and velocity, eased so it never jerks
    const ax = surface ? 0 : Math.max(-2, Math.min(2, p.vx * 0.3)) + p.facing * 1.0;
    let ay = Math.max(-3, Math.min(3, p.vy * 0.3));
    if (surface) ay = -3; // show the town above the pod
    else if (p.vy < -3) ay -= 2;
    else if (p.vy > 6) ay += 2;
    else ay += 1.5; // the work is below you
    this.lx += (ax - this.lx) * 0.08;
    this.ly += (ay - this.ly) * 0.08;
    let tx = p.x + this.lx, ty = p.y + this.ly;
    // in the core chamber, frame the Seed: pull the view toward the chamber's centre
    const k = Math.max(0, Math.min(1, (p.y - (CHAMBER.cy - CHAMBER.ry - 6)) / 6));
    if (k > 0) { tx += (CHAMBER.cx - tx) * 0.6 * k; ty += (CHAMBER.cy - ty) * 0.75 * k; }
    return { x: tx, y: ty };
  }

  update(dt: number, view: GameView) {
    const t = this.target(view);
    const w = 9; // omega
    // critically damped spring
    const ax = w * w * (t.x - this.x) - 2 * w * this.vx;
    const ay = w * w * (t.y - this.y) - 2 * w * this.vy;
    this.vx += ax * dt; this.vy += ay * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    // fast travel (the Lift, a fast drop) outruns the spring: keep the pod inside the view with a margin (QA P2)
    const pod = view.pod, mh = this.h / this.tilePx / 2 - 2, mw = this.w / this.tilePx / 2 - 2;
    if (mh > 0) { if (pod.y - this.y > mh) { this.y = pod.y - mh; this.vy = Math.max(this.vy, pod.vy); } else if (this.y - pod.y > mh) { this.y = pod.y + mh; this.vy = Math.min(this.vy, pod.vy); } }
    if (mw > 0) { if (pod.x - this.x > mw) this.x = pod.x - mw; else if (this.x - pod.x > mw) this.x = pod.x + mw; }
    // never show past the bedrock walls
    const half = this.w / this.tilePx / 2;
    const lo = half - 0.5, hi = W - half + 0.5;
    this.x = lo > hi ? W / 2 : Math.max(lo, Math.min(hi, this.x));
    const halfH = this.h / this.tilePx / 2;
    this.y = Math.max(-12 + halfH, this.y);
  }
}
