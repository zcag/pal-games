// Onboarding: a quiet title card over the town on load ("Seedfall", "Press any key"), and first-run hints that
// teach the loop one at a time and retire once the player has done the thing.
import type { GameEvent, GameView } from "../../game/types.ts";
import { h, toggle } from "./dom.ts";
import { logo } from "./pfont.ts";
import { worldToScreen, type Camera } from "../view.ts";
import type { UiModel } from "./model.ts";

export class Intro {
  el = h("div.intro.title-intro");
  shown = false;
  show() {
    // The pixel logo over open sky, no box: above the headframe's top at both sizes.
    this.el.textContent = "";
    this.el.append(h("div.in-logo", logo(innerHeight >= 700 ? 9 : 5)), h("div.in-key", "Press any key"));
    this.shown = true; this.el.classList.add("on");
  }
  dismiss() { if (!this.shown) return false; this.shown = false; this.el.classList.remove("on"); return true; }
}

interface Hint {
  id: string;
  /** HTML with <kbd> keys. */
  text: string | ((m: UiModel) => string);
  when(m: UiModel, v: GameView, s: Session): boolean;
  done(m: UiModel, v: GameView, s: Session): boolean;
  /** Seconds to show at most (otherwise until done). */
  secs?: number;
}

interface Session { thrusted: boolean; scanned: boolean; usedItem: boolean; fullAt: number; t: number }

const under = (v: GameView) => v.pod.y > 0.5;

const HINTS: Hint[] = [
  { id: "dig", text: "Hold <kbd>↓</kbd> to dig", when: (m, v) => !m.tutorial.dug && !m.tutorial.sold && v.pod.y < 3, done: (m, v) => m.tutorial.dug || v.pod.y > 2 },
  { id: "fly", text: "Hold <kbd>↑</kbd> to fly. <kbd>←</kbd> <kbd>→</kbd> dig sideways", when: (m, v) => under(v) && v.pod.y > 2 && !m.tutorial.sold, done: (_m, _v, s) => s.thrusted },
  { id: "sell", text: "Fly back up and land on the pad by the mine to sell",
    when: (m, v) => under(v) && !m.tutorial.sold && (v.pod.cargoUsed >= 3 || v.pod.fuel < v.pod.fuelMax * 0.6), done: (m) => m.tutorial.sold },
  { id: "buy", text: (m) => (m.suggestion && m.cash >= m.suggestion.cost ? `<kbd>B</kbd> buys the suggested upgrade: ${m.suggestion.label}` : "<kbd>E</kbd> at a door goes inside. The workshop sells upgrades"),
    when: (m) => m.inTown && m.tutorial.sold && !m.tutorial.bought, done: (m) => m.tutorial.bought },
  { id: "enter", text: "<kbd>E</kbd> at a door goes inside: workshop, supply, lab", when: (m) => m.inTown && m.tutorial.bought && !m.tutorial.entered, done: (m) => m.tutorial.entered },
  { id: "scan", text: "<kbd>Q</kbd> scans for ore through the rock", when: (m, v) => under(v) && m.view.levels.scanner >= 1, done: (_m, _v, s) => s.scanned },
  { id: "items", text: "<kbd>1</kbd>-<kbd>6</kbd> use items in the dive", when: (m, v) => under(v) && m.items.some((i) => i.key !== "overcharge" && i.count > 0), done: (_m, _v, s) => s.usedItem },
  { id: "full", text: "The bay is full. <kbd>Tab</kbd> shows the cargo, <kbd>X</kbd> drops the cheapest piece",
    when: (_m, v, s) => under(v) && s.fullAt > 0 && s.t - s.fullAt < 6, done: (_m, _v, s) => s.fullAt > 0 && s.t - s.fullAt >= 6, secs: 6 },
];

export class Hints {
  el = h("div.prompt.pn.hintbar");
  /** A small bouncing arrow over the mine shaft while the first hint shows. */
  arrow = h("div.shaftarrow");
  private s: Session = { thrusted: false, scanned: false, usedItem: false, fullAt: 0, t: 0 };
  private cur: Hint | null = null;
  private wait = 0;
  private shownFor = 0;
  private html = "";

  constructor(private m: UiModel) {}

  events(evs: readonly GameEvent[]) {
    for (const e of evs) {
      if (e.t === "scan") this.s.scanned = true;
      else if (e.t === "item" && e.ok) this.s.usedItem = true;
      else if (e.t === "cargo_full" && !this.m.hintDone("full")) this.s.fullAt = this.s.t;
    }
  }

  /** `quiet`: something else holds the bottom of the screen (a prompt, a panel, the depot card). */
  update(dt: number, v: GameView, quiet: boolean, cam?: Camera, card?: DOMRect | null) {
    const s = this.s, m = this.m;
    s.t += dt;
    if (v.pod.thrusting && under(v)) s.thrusted = true;
    if (this.cur && this.cur.done(m, v, s)) { m.markHint(this.cur.id); this.cur = null; }
    if (this.cur && this.cur.secs && (this.shownFor += dt) > this.cur.secs) { m.markHint(this.cur.id); this.cur = null; }
    if (this.cur && !this.cur.when(m, v, s)) this.cur = null;
    if (!this.cur) {
      const next = HINTS.find((x) => !m.hintDone(x.id) && x.when(m, v, s) && !x.done(m, v, s)) ?? null;
      if (next) { this.cur = next; this.wait = 0.8; this.shownFor = 0; }
    }
    if (this.wait > 0) this.wait -= dt;
    const on = !!this.cur && this.wait <= 0 && !quiet;
    if (this.cur) {
      const html = typeof this.cur.text === "string" ? this.cur.text : this.cur.text(m);
      if (html !== this.html) { this.html = html; this.el.innerHTML = html; }
    }
    toggle(this.el, "on", on);
    // In town the hint sits above the pod (never over the shaft); in the dive it sits at the bottom.
    const town = v.pod.y < 0.5 && !!cam;
    toggle(this.el, "above", town);
    if (town && cam) {
      const p = worldToScreen(cam, v.pod.x, v.pod.y);
      // keep clear of the depot card: centre the hint in the space to its right when they would overlap
      const half = this.el.offsetWidth / 2 + 8;
      const x = card && p.x - half < card.right ? Math.max(p.x, card.right + half) : p.x;
      this.el.style.left = `${Math.min(cam.w - half, x).toFixed(0)}px`;
      this.el.style.top = `${(p.y - cam.tilePx * 1.7).toFixed(0)}px`;
    } else { this.el.style.left = ""; this.el.style.top = ""; }
    const showArrow = on && this.cur?.id === "dig" && town && !!cam;
    toggle(this.arrow, "on", showArrow);
    if (showArrow && cam) {
      const a = worldToScreen(cam, v.world.spawnX + 0.5, -0.9);
      this.arrow.style.left = `${a.x.toFixed(0)}px`;
      this.arrow.style.top = `${a.y.toFixed(0)}px`;
    }
  }
}
