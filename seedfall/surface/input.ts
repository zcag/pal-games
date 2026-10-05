// Keyboard to Input. Held directions are sampled every fixed step; actions are edges consumed once.
import type { Input } from "../game/types.ts";

const DIR: Record<string, "left" | "right" | "up" | "down"> = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  ArrowUp: "up", KeyW: "up", Space: "up", ArrowDown: "down", KeyS: "down",
};

export class Keys {
  held = { left: false, right: false, up: false, down: false };
  private edges: Partial<Input> = {};
  /** When false (a panel is open), game input is ignored but listeners still get keys. */
  enabled = true;
  private listeners: ((e: KeyboardEvent) => boolean | void)[] = [];

  constructor(target: Window = window) {
    target.addEventListener("keydown", (e) => this.down(e));
    target.addEventListener("keyup", (e) => { const d = DIR[e.code]; if (d) this.held[d] = false; });
    target.addEventListener("blur", () => { this.held = { left: false, right: false, up: false, down: false }; });
  }

  /** UI listeners run first; returning true swallows the key. */
  listen(fn: (e: KeyboardEvent) => boolean | void) { this.listeners.push(fn); }

  private down(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    for (const l of this.listeners) if (l(e)) { e.preventDefault(); return; }
    const d = DIR[e.code];
    if (d) { e.preventDefault(); this.held[d] = true; return; }
    if (e.repeat || !this.enabled) return;
    const n = /^Digit([1-7])$/.exec(e.code);
    if (n) this.edges.item = +n[1];
    else if (e.code === "KeyQ") this.edges.scan = true;
    else if (e.code === "KeyX") this.edges.dump = true;
    else if (e.code === "KeyE") this.edges.interact = true;
    else if (e.code === "Enter") this.edges.confirm = true;
    else return;
    e.preventDefault();
  }

  /** The input for one fixed step; edges are consumed by the first step that reads them. */
  take(): Input {
    if (!this.enabled) { this.edges = {}; return { left: false, right: false, up: false, down: false }; }
    const i: Input = { ...this.held, ...this.edges };
    this.edges = {};
    return i;
  }
}
