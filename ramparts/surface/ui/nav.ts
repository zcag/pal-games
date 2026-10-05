// Keyboard navigation for every non-battle screen: arrows move focus to the nearest focusable
// element in that direction, Enter/Space activate, Tab cycles. Screens only add number hotkeys.
import { sfx } from "./dom.ts";

export const NAV_SEL = "button:not([disabled]):not(.nonav), [data-nav]:not([disabled]), input[type=range]";

function centre(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
}
/** Laid out and shown (layout size, so cards mid flip-in still count). */
const visible = (el: Element) => {
  const e = el as HTMLElement;
  return (e.offsetWidth > 0 || e.getClientRects().length > 0) && getComputedStyle(el).visibility !== "hidden";
};

export function focusables(root: Element): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(NAV_SEL)].filter(visible);
}

/** Move focus from the active element toward `dir`; returns true if focus moved. */
export function spatial(root: Element, dir: "up" | "down" | "left" | "right"): boolean {
  const items = focusables(root);
  if (!items.length) return false;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !root.contains(cur) || !items.includes(cur)) { focus(pickFirst(root, items)); return true; }
  const a = centre(cur);
  const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  let best: HTMLElement | null = null, bs = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const b = centre(el);
    const vx = b.x - a.x, vy = b.y - a.y;
    const along = vx * dx + vy * dy;
    if (along <= 2) continue;
    const across = Math.abs(vx * dy - vy * dx);
    // Overlapping rows/columns win: penalise the perpendicular offset heavily.
    const s = along + across * 2.4;
    if (s < bs) { bs = s; best = el; }
  }
  if (best) { focus(best); return true; }
  return false;
}

/** The control a screen starts on: [data-first], else the first one outside the top band. */
export function pickFirst(root: Element, items = focusables(root)): HTMLElement {
  const f = root.querySelector<HTMLElement>("[data-first]");
  if (f && visible(f)) return f;
  return items.find((el) => !el.closest(".band")) ?? items[0]!;
}

export function focus(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.focus({ preventDefault: false } as FocusOptions);
  sfx("hover");
}

/** Default key handling for a screen container; returns true when the key was used. */
export function navKey(root: Element, e: KeyboardEvent): boolean {
  const k = e.key;
  if (k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight") {
    const cur = document.activeElement as HTMLInputElement | null;
    if (cur?.type === "range" && (k === "ArrowLeft" || k === "ArrowRight")) return false;
    spatial(root, ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" } as const)[k]);
    return true;
  }
  if (k === "Tab") {
    const items = focusables(root);
    if (!items.length) return true;
    const i = items.indexOf(document.activeElement as HTMLElement);
    focus(items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]);
    return true;
  }
  if (k === "Enter" || k === " ") {
    const cur = document.activeElement as HTMLElement | null;
    if (cur && root.contains(cur) && cur !== document.body && !cur.closest(".band")) { cur.click(); return true; }
    if (cur && cur.closest(".band") && k === "Enter") { cur.click(); return true; }
    const first = pickFirst(root);
    if (first) { focus(first); return true; }
  }
  return false;
}
