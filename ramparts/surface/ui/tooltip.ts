// One tooltip for the whole UI. Elements register a content builder; it shows on mouse hover and
// on keyboard focus, on the side toward the screen centre (below first for `data-tip-at="below"`),
// clamped inside the view.
import { h, raw } from "./dom.ts";

export interface TipSpec {
  title: string; glyph?: string;                 // glyph = icon markup
  line?: string; meta?: string;                  // one plain line; a dimmer second line
  rows?: (HTMLElement | string)[];               // stat chips
  keys?: string[];                               // hotkeys shown at the bottom
  flavour?: string; extra?: HTMLElement;
  wide?: boolean;
}
type Builder = () => TipSpec | HTMLElement | null;

const reg = new WeakMap<Element, Builder>();
let tipEl: HTMLElement | null = null;
let rootEl: HTMLElement | null = null;
let current: Element | null = null;
let scale = () => 1;
/** Focus shows a tooltip only when the keyboard moved it (not on a screen's auto-focus). */
let keyboard = false;

export function initTips(root: HTMLElement, s: () => number) {
  rootEl = root; scale = s;
  tipEl = h("div.tip.pn.deep");
  root.appendChild(tipEl);
  root.addEventListener("pointerover", (e) => { const t = find(e.target); if (t && t !== current) show(t); else if (!t && current && !isFocusTip()) hide(); });
  root.addEventListener("pointerleave", () => { if (!isFocusTip()) hide(); });
  addEventListener("keydown", (e: KeyboardEvent) => { if (!e.repeat) keyboard = true; }, true);
  addEventListener("pointerdown", () => { keyboard = false; }, true);
  addEventListener("pointermove", (e: PointerEvent) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) keyboard = false; }, true);
  root.addEventListener("focusin", (e) => { const t = find(e.target); if (t && keyboard) show(t); });
  root.addEventListener("focusout", () => { if (current && document.activeElement !== current) hide(); });
  root.addEventListener("pointerdown", () => { if (current && !(current as HTMLElement).dataset.tipStick) hide(); });
}
const isFocusTip = () => !!current && document.activeElement === current;
function find(t: EventTarget | null): Element | null {
  let el = t as Element | null;
  while (el && el !== rootEl) { if (reg.has(el)) return el; el = el.parentElement; }
  return null;
}

/** Register a tooltip for `el`. */
export function tip<T extends Element>(el: T, b: Builder | TipSpec | string): T {
  reg.set(el, typeof b === "function" ? b : () => (typeof b === "string" ? { title: b } : b));
  return el;
}

export function render(s: TipSpec | HTMLElement): HTMLElement[] {
  if (s instanceof HTMLElement) return [s];
  const out: HTMLElement[] = [h("div.tt", s.glyph ? raw(s.glyph) : null, h("span", s.title))];
  if (s.line) out.push(h("div.tl", { html: s.line }));
  if (s.meta) out.push(h("div.tm", { html: s.meta }));
  if (s.rows?.length) out.push(h("div.row", ...s.rows));
  if (s.extra) out.push(s.extra);
  if (s.flavour) out.push(h("div.flav", `"${s.flavour}"`));
  if (s.keys?.length) out.push(h("div.tk", ...s.keys.map((k) => h("span.kbd", k))));
  return out;
}

export function show(el: Element, at?: { x: number; y: number; w?: number; h?: number }) {
  const b = reg.get(el);
  if (!b || !tipEl || !rootEl) return;
  const spec = b();
  if (!spec) return hide();
  current = el;
  tipEl.replaceChildren(...render(spec));
  tipEl.style.maxWidth = (spec as TipSpec).wide ? "260px" : "";
  place(at ?? rectOf(el), (el as HTMLElement).dataset?.tipAt === "below");
}

/** Show a tooltip for a non-DOM anchor (a pad, an enemy) at a box in UI px. */
export function showAt(spec: TipSpec | HTMLElement, box: { x: number; y: number; w?: number; h?: number }) {
  if (!tipEl) return;
  current = null;
  tipEl.replaceChildren(...render(spec));
  tipEl.style.maxWidth = "";
  place(box);
}

export function hide() {
  current = null;
  tipEl?.classList.remove("on");
}

/** An element's box in UI px (the root is zoomed). */
export function rectOf(el: Element) {
  const r = el.getBoundingClientRect(), s = scale();
  return { x: r.left / s, y: r.top / s, w: r.width / s, h: r.height / s };
}

/** `below`: the anchor has a heading or keys above it (choice tiles), so try below it first. */
function place(a: { x: number; y: number; w?: number; h?: number }, below = false) {
  if (!tipEl || !rootEl) return;
  const W = rootEl.clientWidth, H = rootEl.clientHeight, m = 6, gap = 7;
  const aw = a.w ?? 0, ah = a.h ?? 0;
  tipEl.style.left = "0px"; tipEl.style.top = "0px";
  const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  const cx = a.x + aw / 2, cy = a.y + ah / 2;
  let x: number, y: number;
  // Prefer below for things in the top half, above for the bottom half; sideways when there is no room.
  if (below && a.y + ah + gap + th <= H - m) y = a.y + ah + gap;
  else if (cy < H / 2) y = a.y + ah + gap; else y = a.y - th - gap;
  x = cx - tw / 2;
  if (y < m || y + th > H - m) {
    y = cy - th / 2;
    x = cx < W / 2 ? a.x + aw + gap : a.x - tw - gap;
  }
  x = Math.max(m, Math.min(W - tw - m, x));
  y = Math.max(m, Math.min(H - th - m, y));
  tipEl.style.left = `${Math.round(x)}px`;
  tipEl.style.top = `${Math.round(y)}px`;
  tipEl.classList.add("on");
}

export const refreshTip = () => { if (current) show(current); };
