// Screen-space juice owned by the UI: banners, toasts, edge tints (art 8). One full-screen tint at a time.
import { h, raw } from "./dom.ts";

export class Fx {
  private layer = h("div.layer.fx");
  private toasts = h("div.toasts");
  private edgeEl = h("div.edge");
  private bannerEl: HTMLElement | null = null;
  private low = false;

  constructor(root: HTMLElement, _scale: () => number) {
    this.layer.append(this.edgeEl, this.toasts);
    root.appendChild(this.layer);
  }

  banner(t1: string, t2 = "", cls = "", keyColour?: string, ms = 1600) {
    this.bannerEl?.remove();
    const b = h(`div.banner${cls ? "." + cls.split(" ").join(".") : ""}`, h("div.b1", t1), t2 ? h("div.b2", t2) : null, h("div.bl"));
    if (keyColour) b.style.setProperty("--bk", keyColour);
    b.querySelectorAll<HTMLElement>(".b1,.b2,.bl").forEach((e) => (e.style.animationDuration = `${ms}ms`));
    this.layer.appendChild(b);
    this.bannerEl = b;
    setTimeout(() => { if (this.bannerEl === b) this.bannerEl = null; b.remove(); }, ms + 100);
  }

  private queue: [string, string, string][] = [];
  private showing = false;
  /** One compact note at a time, docked bottom-left above the tray; the rest wait their turn. */
  toast(glyph: string, t1: string, t2 = "", ms = 4000) {
    if (this.queue.length >= 4) this.queue.shift();
    this.queue.push([glyph, t1, t2]);
    if (!this.showing) this.next(ms);
  }
  private next(ms: number) {
    const it = this.queue.shift();
    if (!it) { this.showing = false; return; }
    this.showing = true;
    const t = h("div.toast.pn.deep", raw(it[0]), h("div", h("div.t1", it[1]), it[2] ? h("div.t2", it[2]) : null));
    this.toasts.replaceChildren(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => { t.remove(); this.next(ms); }, 320); }, this.queue.length ? Math.min(ms, 2600) : ms);
  }

  /** Lives lost: a red edge for 800 ms (overrides the low-lives pulse). */
  hit() {
    this.edgeEl.classList.remove("low", "hit");
    void this.edgeEl.offsetWidth;
    this.edgeEl.classList.add("hit");
    setTimeout(() => { this.edgeEl.classList.remove("hit"); if (this.low) this.edgeEl.classList.add("low"); }, 820);
  }
  lowLives(on: boolean) {
    if (on === this.low) return;
    this.low = on;
    if (!this.edgeEl.classList.contains("hit")) this.edgeEl.classList.toggle("low", on);
  }
  /** Which corner toasts dock in (bl default; the HUD moves them off the road and gates). */
  dock(corner: "bl" | "br" | "tl" | "tr") { this.toasts.dataset.at = corner; }
  clear() { this.lowLives(false); this.bannerEl?.remove(); this.toasts.replaceChildren(); this.queue = []; this.showing = false; }
  frame(_dt: number) { /* CSS-driven */ }
}
