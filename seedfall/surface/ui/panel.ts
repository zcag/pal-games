// The screen host: one centred panel at a time with a header, tabs, a body and a footer of key hints.
// Navigation is spatial: arrows move to the nearest focusable in that direction (lists, grids and the lab's
// graph alike), Left/Right at an edge switch tabs, Enter activates, number keys pick the nth row, Backspace closes (Escape is pal's: it leaves the game).
import { h, setText, toggle, cash as fmtCash, num } from "./dom.ts";
import { icon } from "./icons.ts";
import { ptext } from "./pfont.ts";
import type { Building, Result, UiModel } from "./model.ts";
import { PEOPLE } from "./model.ts";

export type ScreenId =
  | "workshop" | "supply" | "lab" | "rigs" | "launch" | "market" | "fuel" | "log" | "achievements"
  | "settings" | "offline" | "cargo" | "pause";

export type Sound = (kind: string, opts?: { value?: number; tone?: string; best?: boolean }) => void;

export interface Ctx {
  m: UiModel;
  host: Panels;
  /** Make an element focusable; `act` runs on Enter or click. A Result with ok false denies and shows why. */
  f(el: HTMLElement, key: string, act?: () => Result | void, n?: number): HTMLElement;
  sound: Sound;
}

export interface ScreenDef {
  id: ScreenId;
  title: string;
  icon: string;
  building?: Building;
  tabs?(m: UiModel): string[];
  /** Re-render every so many seconds while open (live numbers). */
  live?: number;
  /** "wide": use the full 880 px at large sizes. "card": a small centred card. */
  size?: "card" | "wide";
  /** Hide the cash/data balance in the header. */
  noBalance?: boolean;
  /** Show the shards balance in the header. */
  shards?: boolean;
  render(c: Ctx, tab: number): HTMLElement;
  hints?(tab: number, sel: HTMLElement | null): string[];
  /** Screen keys run before navigation; return true to swallow. */
  key?(e: KeyboardEvent, c: Ctx, sel: HTMLElement | null): boolean;
  /** The selection moved (detail panes). */
  select?(el: HTMLElement | null, c: Ctx): void;
  /** Called after each render with the selection restored. */
  after?(body: HTMLElement, c: Ctx): void;
  onClose?(c: Ctx): void;
  /** A line that replaces the building person's own when it returns one. */
  line?(m: UiModel): string | null;
}

const acts = new WeakMap<HTMLElement, () => Result | void>();

export class Panels {
  el = h("div.screens");
  private scrim = h("div.scrim");
  private cur: {
    def: ScreenDef; box: HTMLElement; body: HTMLElement; tabsEl: HTMLElement; hintsEl: HTMLElement; statusEl: HTMLElement;
    balEl: HTMLElement; tab: number; sel: string | null; foc: HTMLElement[]; liveT: number; lineEl: HTMLElement;
  } | null = null;
  private confirmBox: { el: HTMLElement; yes: () => void; sel: number } | null = null;
  private statusT = 0;
  private hoverT = 0;
  stack: ScreenId[] = [];
  /** A row only follows the mouse after the mouse really moved (a panel opening under a still pointer selects nothing). */
  private mouseMoved = false;
  ctx: Ctx;

  constructor(public m: UiModel, private defs: Record<ScreenId, ScreenDef>, public sound: Sound, private onChange: () => void) {
    this.el.append(this.scrim);
    window.addEventListener("mousemove", (e: MouseEvent) => { if (e.movementX || e.movementY) this.mouseMoved = true; }, { passive: true });
    this.scrim.onmousedown = () => this.close();
    this.ctx = {
      m, host: this, sound: (k, o) => this.sound(k, o),
      f: (el, key, act, n) => {
        el.dataset.f = key;
        if (n !== undefined) el.dataset.n = String(n);
        if (act) acts.set(el, act);
        el.onmouseenter = () => { if (this.mouseMoved && this.cur && this.selKey() !== key) { this.select(el); if (performance.now() - this.hoverT > 60) { this.hoverT = performance.now(); this.sound("hover"); } } };
        el.onmousedown = (e) => { e.preventDefault(); this.select(el); this.activate(el); };
        return el;
      },
    };
  }

  /** While set, the open screen cannot be closed or swapped (the planet choice after a launch). */
  locked: string | null = null;
  get open() { return !!this.cur; }
  get id(): ScreenId | null { return this.cur?.def.id ?? null; }

  show(id: ScreenId, tab = 0) {
    this.mouseMoved = false;
    if (this.locked && this.cur && this.cur.def.id !== id) { this.deny(null, this.locked); return; }
    const def = this.defs[id];
    if (this.cur?.def.id === id) { if (tab !== this.cur.tab) { this.cur.tab = tab; this.cur.sel = null; this.render(); } return; }
    const wasOpen = !!this.cur;
    if (this.cur) { this.stack.push(this.cur.def.id); this.cur.def.onClose?.(this.ctx); this.cur.box.remove(); }
    const body = h("div.body");
    const tabsEl = h("div.tabs");
    const hintsEl = h("div.hints");
    const statusEl = h("div.status");
    const balEl = h("div.bal");
    const lineEl = h("div.who");
    const big = innerHeight >= 700;
    const head = h("div.head", h("span.rv.l"), icon(def.icon, 2), h("div.ttl", ptext(def.title, big ? 3 : 2, { color: "#f0f2f6", shade: "#aab2c0", outline: "#05070a" })), lineEl, balEl, h("span.rv.r"));
    const moreEl = h("div.morecue", "▾ more below");
    const box = h(`div.scr.pn.${def.size ?? "std"}.s-${def.id}`, head, tabsEl, body, h("div.foot", hintsEl, moreEl, statusEl));
    const wrap = h("div.sh.scrwrap", box);
    this.el.append(wrap);
    this.cur = { def, box: wrap, body, tabsEl, hintsEl, statusEl, balEl, tab, sel: null, foc: [], liveT: def.live ?? 0, lineEl };
    if (def.building) {
      const line = def.line?.(this.m) ?? this.m.line(def.building);
      if (line) lineEl.append(h("span.nm", PEOPLE[def.building]), h("span", line));
    }
    this.render();
    toggle(this.el, "on", true);
    void wrap.offsetWidth;
    wrap.classList.add("in");
    if (!wasOpen) this.sound("open");
    this.onChange();
  }

  close(all = false) {
    if (!this.cur) return;
    if (this.locked) { this.deny(null, this.locked); return; }
    if (this.confirmBox) { this.confirmBox.el.remove(); this.confirmBox = null; }
    const { box, def } = this.cur;
    def.onClose?.(this.ctx);
    box.classList.remove("in");
    box.classList.add("out");
    setTimeout(() => box.remove(), 140);
    this.cur = null;
    const back = all ? undefined : this.stack.pop();
    if (all) this.stack = [];
    if (back) { this.show(back); this.stack.pop(); return; }
    toggle(this.el, "on", false);
    this.sound("close");
    this.onChange();
  }

  /** Re-render the open screen, keeping the selection and the scroll. */
  render() {
    const c = this.cur;
    if (!c) return;
    const tabs = c.def.tabs?.(this.m) ?? [];
    c.tab = Math.min(c.tab, Math.max(0, tabs.length - 1));
    c.tabsEl.textContent = "";
    toggle(c.tabsEl, "off", tabs.length < 2);
    tabs.forEach((t, i) => {
      const el = h("button.tab", t);
      if (i === c.tab) el.classList.add("on");
      el.onmousedown = (e) => { e.preventDefault(); this.setTab(i); };
      c.tabsEl.append(el);
    });
    const scrolls = [...c.body.querySelectorAll<HTMLElement>(".scroll")].map((s) => s.scrollTop);
    c.body.textContent = "";
    c.body.append(c.def.render(this.ctx, c.tab));
    c.body.querySelectorAll<HTMLElement>(".scroll").forEach((s, i) => (s.scrollTop = scrolls[i] ?? 0));
    c.foc = [...c.body.querySelectorAll<HTMLElement>("[data-f]")];
    const keep = c.foc.find((e) => e.dataset.f === c.sel) ?? c.foc.find((e) => !e.classList.contains("dis")) ?? c.foc[0] ?? null;
    this.select(keep, false);
    this.balance();
    c.def.after?.(c.body, this.ctx);
    // A list that runs past its box says so: a "more" cue at the bottom until it is scrolled to the end.
    const scs = [...c.body.querySelectorAll<HTMLElement>(".scroll")];
    const mark = () => toggle(c.box, "more", scs.some((sc) => sc.scrollHeight - sc.scrollTop - sc.clientHeight > 4));
    scs.forEach((sc) => (sc.onscroll = mark));
    requestAnimationFrame(mark);
  }

  private balance() {
    const c = this.cur!;
    c.balEl.textContent = "";
    if (c.def.noBalance) return;
    if (c.def.shards) c.balEl.append(h("span.bi", icon("shard"), h("span.n.shard", num(this.m.shards))));
    else {
      c.balEl.append(h("span.bi", icon("cash"), h("span.n.cash", num(this.m.cash))));
      if (c.def.id === "lab" || this.m.data > 0) c.balEl.append(h("span.bi", icon("data"), h("span.n.data", num(this.m.data))));
    }
  }

  private setTab(i: number) {
    const c = this.cur!;
    const n = c.def.tabs?.(this.m).length ?? 1;
    i = (i + n) % n;
    if (i === c.tab) return;
    c.tab = i; c.sel = null;
    this.sound("click");
    c.body.classList.remove("swap"); void c.body.offsetWidth; c.body.classList.add("swap");
    this.render();
  }

  private selKey() { return this.cur?.sel ?? null; }
  get selected(): HTMLElement | null { return this.cur?.foc.find((e) => e.dataset.f === this.cur!.sel) ?? null; }

  select(el: HTMLElement | null, scroll = true) {
    const c = this.cur;
    if (!c) return;
    for (const e of c.foc) toggle(e, "sel", e === el);
    c.sel = el?.dataset.f ?? null;
    if (el && scroll) el.scrollIntoView({ block: "nearest", inline: "nearest" });
    c.def.select?.(el, this.ctx);
    const hints = c.def.hints?.(c.tab, el) ?? ["Enter Choose", "⌫ Close"];
    c.hintsEl.textContent = "";
    for (const t of hints) {
      const [k, ...rest] = t.split(" ");
      c.hintsEl.append(h("span.hint", h("kbd", k), rest.join(" ")));
    }
  }

  activate(el: HTMLElement | null) {
    if (!el) return;
    const act = acts.get(el);
    if (!act) return;
    const r = act();
    if (r && !r.ok) this.deny(el, r.why);
    else { this.sound("click"); if (r) this.flashStatus("", ""); }
    if (this.cur) this.render();
    this.onChange();
  }

  deny(el: HTMLElement | null, why?: string) {
    this.sound("deny");
    if (el) { el.classList.remove("deny"); void el.offsetWidth; el.classList.add("deny"); }
    if (why) this.flashStatus(why, "bad");
  }

  flashStatus(text: string, tone: string) {
    const c = this.cur;
    if (!c) return;
    setText(c.statusEl, text);
    c.statusEl.className = `status ${tone}`;
    c.statusEl.classList.remove("in"); void c.statusEl.offsetWidth; c.statusEl.classList.add("in");
    this.statusT = 3;
  }

  confirm(text: string, yes: string, act: () => void) {
    const c = this.cur;
    if (!c) return;
    const no = h("button.btn", "Keep it");
    const ok = h("button.btn.danger", yes);
    const el = h("div.confirm", h("div.pn.cbox", h("div.ct", text), h("div.cb", no, ok)));
    const set = (i: number) => { this.confirmBox!.sel = i; toggle(no, "sel", i === 0); toggle(ok, "sel", i === 1); };
    no.onmousedown = (e) => { e.preventDefault(); this.cancelConfirm(); };
    ok.onmousedown = (e) => { e.preventDefault(); this.confirmBox?.yes(); };
    no.onmouseenter = () => set(0); ok.onmouseenter = () => set(1);
    this.confirmBox = { el, sel: 0, yes: () => { el.remove(); this.confirmBox = null; act(); this.sound("click"); if (this.cur) this.render(); this.onChange(); } };
    c.box.querySelector(".scr")!.append(el);
    set(0);
    this.sound("open");
  }
  private cancelConfirm() { this.confirmBox?.el.remove(); this.confirmBox = null; this.sound("close"); }

  update(dt: number) {
    const c = this.cur;
    if (!c) return;
    if (this.statusT > 0 && (this.statusT -= dt) <= 0) c.statusEl.classList.remove("in");
    if (c.def.live && (c.liveT -= dt) <= 0) { c.liveT = c.def.live; this.render(); }
  }

  /** Keys while a screen is open. Always swallows: game input is paused. */
  key(e: KeyboardEvent): boolean {
    const c = this.cur;
    if (!c) return false;
    if (this.confirmBox) {
      const cb = this.confirmBox;
      if (e.code === "Backspace") this.cancelConfirm();
      else if (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "Tab") { cb.sel = 1 - cb.sel; (cb.el.querySelectorAll(".btn")[cb.sel] as HTMLElement).dispatchEvent(new MouseEvent("mouseenter")); this.sound("hover"); }
      else if (e.code === "Enter" || e.code === "Space") { if (cb.sel === 1) cb.yes(); else this.cancelConfirm(); }
      return true;
    }
    const sel = this.selected;
    if (c.def.key?.(e, this.ctx, sel)) return true;
    const dir = ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" } as Record<string, string>)[e.code];
    if (dir) {
      const next = this.nearest(sel, dir);
      if (next) { this.select(next); this.sound("hover"); }
      else if (dir === "left" || dir === "right") { if ((c.def.tabs?.(this.m).length ?? 0) > 1) this.setTab(c.tab + (dir === "left" ? -1 : 1)); }
      return true;
    }
    if (e.code === "Enter" || e.code === "Space") { if (!e.repeat || sel?.dataset.repeat) this.activate(sel); return true; }
    if (e.code === "Backspace") { this.close(); return true; }
    if (e.code === "PageDown" || e.code === "BracketRight") { this.setTab(c.tab + 1); return true; }
    if (e.code === "PageUp" || e.code === "BracketLeft") { this.setTab(c.tab - 1); return true; }
    const n = /^Digit([1-9])$/.exec(e.code);
    if (n) {
      const el = c.foc.find((x) => x.dataset.n === n[1]);
      if (el) { this.select(el); this.activate(el); }
      return true;
    }
    return true;
  }

  /** Spatial navigation: the closest focusable whose centre lies in that direction. */
  private nearest(from: HTMLElement | null, dir: string): HTMLElement | null {
    const c = this.cur!;
    const list = c.foc.filter((e) => e.offsetParent !== null);
    if (!from) return list[0] ?? null;
    const a = from.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best: HTMLElement | null = null, bs = Infinity;
    for (const e of list) {
      if (e === from) continue;
      const b = e.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      let main: number, side: number;
      if (dir === "down") { main = b.top - a.bottom + 0.5 * (by - ay); side = Math.abs(bx - ax) - (a.width + b.width) / 4; if (by <= ay + 2) continue; }
      else if (dir === "up") { main = a.top - b.bottom + 0.5 * (ay - by); side = Math.abs(bx - ax) - (a.width + b.width) / 4; if (by >= ay - 2) continue; }
      else if (dir === "right") { main = b.left - a.right + 0.5 * (bx - ax); side = Math.abs(by - ay) - (a.height + b.height) / 4; if (bx <= ax + 2) continue; }
      else { main = a.left - b.right + 0.5 * (ax - bx); side = Math.abs(by - ay) - (a.height + b.height) / 4; if (bx >= ax - 2) continue; }
      const s = Math.max(0, main) + 3 * Math.max(0, side);
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }
}

/** A price button's content: the price, and when short the gap in grey ("$1,200 more"). */
export function priceEl(cost: number | null, have: number, unit: "cash" | "data" | "shard" = "cash", done = "Max"): HTMLElement {
  if (cost === null) return h("span.price.max", done);
  const fmt = (n: number) => (unit === "cash" ? fmtCash(n) : num(n));
  const ic = unit === "cash" ? null : icon(unit === "data" ? "data" : "shard", 1);
  if (have >= cost) return h(`span.price.ok.${unit}`, ic, h("span.n", fmt(cost)));
  return h(`span.price.short.${unit}`, h("span.p", ic, h("span.n", fmt(cost))), h("span.more.n", `${fmt(cost - have)} more`));
}

/** Level pips: filled up to `level`, the next one marked. */
export function pips(level: number, cap: number, gate?: number): HTMLElement {
  const el = h("span.pips");
  for (let i = 0; i < cap; i++) {
    const p = h("i");
    if (i < level) p.className = "on";
    else if (i === level) p.className = "next";
    if (gate !== undefined && i === gate - 1 && i >= level) p.classList.add("gate");
    el.append(p);
  }
  return el;
}
