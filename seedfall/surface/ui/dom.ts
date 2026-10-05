// Tiny DOM and number helpers for the UI. No framework: screens build elements with h() and re-render on change.

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; style?: string | Record<string, string | number> };

/** h("div.row.sel", { onclick }, "text", child) */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K | `${K}.${string}`, attrs?: Attrs | Child, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const [name, ...cls] = (tag as string).split(".");
  const el = document.createElement(name) as HTMLElementTagNameMap[K];
  if (cls.length) el.className = cls.join(" ");
  if (attrs && typeof attrs === "object" && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className += (el.className ? " " : "") + v;
      else if (k === "style") {
        if (typeof v === "string") el.style.cssText = v;
        else for (const [p, s] of Object.entries(v as Record<string, string | number>)) el.style.setProperty(p, String(s));
      } else if (k.startsWith("on")) (el as unknown as Record<string, unknown>)[k] = v;
      else if (k === "html") el.innerHTML = String(v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
  } else if (attrs !== undefined) kids.unshift(attrs as Child);
  add(el, kids);
  return el;
}

function add(el: Node, kids: Child[]) {
  for (const k of kids) {
    if (k === null || k === undefined || k === false) continue;
    if (Array.isArray(k)) add(el, k);
    else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

/** Set text only when it changed (the HUD updates every frame). */
export function setText(el: HTMLElement, s: string) { if (el.textContent !== s) el.textContent = s; }
export function toggle(el: Element, cls: string, on: boolean) { if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on); }

const nf = new Intl.NumberFormat("en-US");
/** 12480 -> "12,480"; large values shorten past a limit ("2.31M"). */
export function num(n: number, limit = 1e7): string {
  n = Math.round(n);
  if (Math.abs(n) < limit) return nf.format(n);
  const units: [number, string][] = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "k"]];
  for (const [v, u] of units) if (Math.abs(n) >= v) return `${(n / v).toFixed(Math.abs(n) >= v * 100 ? 0 : Math.abs(n) >= v * 10 ? 1 : 2)}${u}`;
  return nf.format(n);
}
export const cash = (n: number, limit = 1e7) => `$${num(n, limit)}`;
/** Depth in metres: one tile is 10 m. */
export const metres = (row: number) => `${num(Math.max(0, Math.floor(row)) * 10)} m`;
/** "6 h 10 m", "12 m", "40 s" */
export function dur(s: number): string {
  s = Math.max(0, Math.round(s));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), hr = Math.floor(m / 60);
  return hr ? (m % 60 ? `${hr} h ${m % 60} m` : `${hr} h`) : `${m} m`;
}
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const easeOutCubic = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 3;
