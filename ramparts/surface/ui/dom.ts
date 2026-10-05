// Tiny DOM helpers: element builder, number roll-ups, sound shortcuts.
import { audio, type Sfx } from "../audio/index.ts";

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; style?: string | Record<string, string | number> };

/** `h("div.panel.wide", { onclick }, kids...)`: tag plus dotted classes, attributes, children. */
export function h<T extends HTMLElement = HTMLElement>(sel: string, attrs?: Attrs | Child, ...kids: Child[]): T {
  const [tag, ...cls] = sel.split(".");
  const el = document.createElement(tag || "div") as T;
  if (cls.length) el.className = cls.join(" ");
  if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) kids.unshift(attrs as Child);
  else if (attrs) setAttrs(el, attrs as Attrs);
  add(el, kids);
  return el;
}

export function setAttrs(el: HTMLElement, a: Attrs) {
  for (const [k, v] of Object.entries(a)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = (el.className ? el.className + " " : "") + v;
    else if (k === "style" && typeof v === "object") for (const [sk, sv] of Object.entries(v as Record<string, string | number>)) { if (sk.startsWith("--")) el.style.setProperty(sk, String(sv)); else (el.style as unknown as Record<string, string | number>)[sk] = sv; }
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else if (k === "html") el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
}

export function add(el: Node, kids: Child[]) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) add(el, k);
    else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

/** Inline SVG/HTML markup as an element. */
export function raw(html: string, sel = "span"): HTMLElement { return h(sel, { html }); }

export function clear(el: Element) { while (el.firstChild) el.removeChild(el.firstChild); }

/** Sets text only when it changed (the HUD calls this every frame). */
export function text(el: HTMLElement, s: string | number) {
  const v = String(s);
  if (el.textContent !== v) el.textContent = v;
}
export function toggle(el: Element, cls: string, on: boolean) {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

/** Restart a CSS animation class (pop, shake, flash). */
export function pulse(el: Element, cls: string) {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

export function sfx(name: Sfx, o?: { pan?: number; vol?: number; pitch?: number }) {
  try { audio.sfx(name, o); } catch { /* audio not ready */ }
}

/** Counts a number up in `el` over `ms` (easeOutCubic); `tick` fires on every whole step change. */
export function roll(el: HTMLElement, from: number, to: number, ms = 600, tick?: (v: number) => void, fmt = (v: number) => String(v)): Promise<void> {
  return new Promise((done) => {
    const t0 = performance.now();
    let last = from;
    el.textContent = fmt(from);
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const v = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
      if (v !== last) { last = v; el.textContent = fmt(v); tick?.(v); }
      if (k < 1) requestAnimationFrame(step); else done();
    };
    if (ms <= 0 || from === to) { el.textContent = fmt(to); done(); } else requestAnimationFrame(step);
  });
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const roman = (n: number) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] ?? String(n);
export const fmtS = (ticks: number) => (ticks / 30).toFixed(ticks < 300 ? 1 : 0);

/** A keyboard key chip ("Q", "Esc"). */
export const kbd = (k: string) => h("span.kbd", k);
