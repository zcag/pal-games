// The DOM layer: damage numbers (crisp text at any DPR), coins flying to the HUD gold counter,
// and full-screen tints (leak edge flash, Stillness flash). One fixed, click-through layer over
// the page; everything pooled, positions written as transforms only.
import type { DamageType } from "../../../game/types.ts";
import type { Stage } from "../api.ts";
import { DMG_CSS } from "./palette.ts";

const CSS = `
.rfx{position:fixed;inset:0;pointer-events:none;z-index:30;overflow:hidden;contain:strict}
.rfx-n{position:absolute;left:0;top:0;font:900 11px/1 "Nunito Sans",system-ui,sans-serif;font-variant-numeric:tabular-nums;
  white-space:nowrap;-webkit-text-stroke:2px #1C1512;paint-order:stroke fill;will-change:transform,opacity;letter-spacing:.01em}
.rfx-c{position:absolute;left:0;top:0;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;will-change:transform;
  background:radial-gradient(circle at 38% 34%,#FFF3C4 0 18%,#FFD36B 30% 58%,#B88A2E 62% 100%);box-shadow:0 0 0 1px rgba(28,21,18,.55)}
.rfx-e{position:absolute;inset:0;opacity:0;will-change:opacity}
`;

interface Num { el: HTMLDivElement; on: boolean; v: number; type: DamageType; crit: boolean; born: number; pop: number; x: number; y: number; z: number; early: number; text: string; t0: number }
interface Coin { el: HTMLDivElement; on: boolean; v: number; born: number; sx: number; sy: number; hx: number; hy: number; big: number; spin: number; delay: number }

export class Dom {
  readonly root: HTMLDivElement;
  private nums: Num[] = [];
  private coins: Coin[] = [];
  private edge: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private edgeT = -9; private flashT = -9; private flashDur = 0.3; private flashA = 0;
  private rect = { x: 0, y: 0 };
  coinTarget: (() => { x: number; y: number } | null) | null = null;
  onCoin: ((value: number) => void) | null = null;
  numbers = true;
  /** The stage's post controls, when it has them: the leak tint goes through its edge red instead of the DOM. */
  post: { red: number } | null = null;

  constructor(private stage: Stage) {
    if (!document.getElementById("rfx-style")) {
      const st = document.createElement("style"); st.id = "rfx-style"; st.textContent = CSS; document.head.appendChild(st);
    }
    this.root = document.createElement("div");
    this.root.className = "rfx";
    this.edge = document.createElement("div"); this.edge.className = "rfx-e";
    this.edge.style.boxShadow = "inset 0 0 70px 18px rgba(192,32,26,.9)";
    this.flashEl = document.createElement("div"); this.flashEl.className = "rfx-e";
    this.root.append(this.edge, this.flashEl);
    for (let i = 0; i < 48; i++) {
      const el = document.createElement("div"); el.className = "rfx-c"; el.style.display = "none"; this.root.appendChild(el);
      this.coins.push({ el, on: false, v: 0, born: 0, sx: 0, sy: 0, hx: 0, hy: 0, big: 1, spin: 0, delay: 0 });
    }
    for (let i = 0; i < 10; i++) {
      const el = document.createElement("div"); el.className = "rfx-n"; el.style.display = "none"; this.root.appendChild(el);
      this.nums.push({ el, on: false, v: 0, type: "phys", crit: false, born: 0, pop: 0, x: 0, y: 0, z: 0, early: 0, text: "", t0: 0 });
    }
    document.body.appendChild(this.root);
  }

  dispose(): void { this.root.remove(); }

  /** A damage number at a game point (gx, gy) and height h. */
  number(RT: number, gx: number, gy: number, h: number, v: number, type: DamageType, crit: boolean): void {
    if (!this.numbers || v < 1) return;
    // a new number within 0.4 u of a live one merges into it (adds and re-pops)
    for (const n of this.nums) {
      const d = Math.hypot(n.x - gx, n.y - gy);
      if (n.on && !n.early && n.type === type && (d < 0.4 || (d < 1.4 && RT - n.t0 < 0.1)) && RT - n.born < 0.45) {
        n.v += v; if (crit && !n.crit) { n.crit = true; n.el.style.color = "#FFD36B"; } n.pop = RT; n.born = RT - 0.09; return;
      }
    }
    let slot: Num | null = null, live = 0, oldest: Num | null = null;
    for (const n of this.nums) {
      if (!n.on) { slot ??= n; continue; }
      live++;
      if (!oldest || n.born < oldest.born) oldest = n;
    }
    if (!slot) slot = oldest!;
    else if (live >= 9 && oldest && !oldest.early) oldest.early = RT;   // max 10: the oldest fades early
    slot.on = true; slot.v = v; slot.type = type; slot.crit = crit; slot.born = RT; slot.pop = RT;
    slot.x = gx; slot.y = gy; slot.z = h; slot.early = 0; slot.t0 = RT;
    slot.el.style.display = "";
    slot.el.style.color = crit ? "#FFD36B" : DMG_CSS[type];
    slot.el.style.webkitTextStroke = type === "pure" || crit ? "2px #5A3A08" : "2px #1C1512";
  }

  /** Coins pop from a world point and fly to the counter. */
  coinsAt(RT: number, x: number, y: number, z: number, count: number, value: number, burst = 1, hop = true): void {
    const p = this.stage.toScreen(x, y, z);
    if (!p) { this.onCoin?.(value); return; }
    this.coinsFrom(RT, p.x + this.rect.x, p.y + this.rect.y, count, value, burst, hop);
  }
  coinsFrom(RT: number, sx: number, sy: number, count: number, value: number, burst = 1, hop = true): void {
    if (count <= 0) return;
    // no counter to fly to: no coins (the HUD still shows the gold)
    if (!this.coinTarget?.()) { this.onCoin?.(value); return; }
    let inFlight = 0;
    for (const c of this.coins) if (c.on) inFlight++;
    // over 20 in flight, merge into bigger coins
    let n = count, big = 1;
    if (inFlight > 20) { n = Math.max(1, Math.ceil(count / 3)); big = 1.4; }
    // past 32 in flight new value rides on the coins already flying (the counter still gets it all)
    if (inFlight >= 32) {
      for (const c of this.coins) if (c.on) { c.v += value; c.big = Math.min(1.8, c.big + 0.1); return; }
    }
    const per = value / n;
    for (let i = 0; i < n; i++) {
      const c = this.coins.find((k) => !k.on);
      if (!c) { this.onCoin?.(per * (n - i)); return; }
      const a = Math.random() * Math.PI * 2, d = (6 + Math.random() * 10) * burst;
      Object.assign(c, { on: true, v: per, born: hop ? RT : RT - 0.25, sx, sy, hx: sx + Math.cos(a) * d, hy: sy - 8 - Math.random() * 10 * burst, big, spin: Math.random() * 6, delay: i * (hop ? 0.03 : 0.07) });
      c.el.style.display = "";
    }
  }

  edgeFlash(RT: number): void { this.edgeT = RT; }
  flash(RT: number, css: string, alpha: number, dur: number): void {
    this.flashT = RT; this.flashDur = dur; this.flashA = alpha;
    this.flashEl.style.background = css;
  }

  update(RT: number, ui: number): void {
    const cr = this.stage.renderer.domElement.getBoundingClientRect();
    this.rect.x = cr.left; this.rect.y = cr.top;
    // damage numbers: pop 1.4 -> 1.0 in 90 ms (easeOutBack), rise 18 px over 650 ms, fade the last 200 ms
    for (const n of this.nums) {
      if (!n.on) continue;
      const age = RT - n.born;
      const life = n.early ? Math.min(0.6 - age, 0.2 - (RT - n.early)) : 0.6 - age;
      if (life <= 0) { n.on = false; n.el.style.display = "none"; continue; }
      const p = this.stage.toScreen(n.x, n.y, n.z);
      if (!p) { n.el.style.opacity = "0"; continue; }
      const pa = Math.min(1, (RT - n.pop) / 0.09);
      const back = 1 + 2.70158 * (pa - 1) ** 3 + 1.70158 * (pa - 1) ** 2;
      const pop = 1.3 - 0.3 * back;
      const rise = 12 * ui * (1 - (1 - Math.min(1, age / 0.6)) ** 3);
      const alpha = Math.min(1, life / 0.2);
      const size = (n.crit ? 8.5 : n.v >= 500 ? 9.5 : 7) * ui;
      const text = Math.round(n.v) + (n.crit ? "!" : "");
      if (text !== n.text) { n.el.textContent = text; n.text = text; }
      n.el.style.fontSize = `${size}px`;
      n.el.style.opacity = String(alpha);
      n.el.style.transform = `translate(${(p.x + cr.left).toFixed(1)}px,${(p.y + cr.top - rise).toFixed(1)}px) translate(-50%,-100%) scale(${pop.toFixed(3)})`;
    }
    // coins: hop 250 ms, then arc to the counter 450 ms (easeInCubic)
    const tgt = this.coinTarget?.() ?? null;
    for (const c of this.coins) {
      if (!c.on) continue;
      const age = RT - c.born - c.delay;
      if (age < 0) { c.el.style.opacity = "0"; continue; }
      c.el.style.opacity = "1";
      let x: number, y: number, s = c.big * ui;
      if (age < 0.25) {
        const t = age / 0.25;
        x = c.sx + (c.hx - c.sx) * t; y = c.sy + (c.hy - c.sy) * t - Math.sin(t * Math.PI) * 10 * ui;
      } else if (tgt) {
        const t = Math.min(1, (age - 0.25) / 0.45), e = t * t * t;
        const mx = (c.hx + tgt.x) / 2, my = Math.min(c.hy, tgt.y) - 40 * ui;
        x = (1 - e) * (1 - e) * c.hx + 2 * (1 - e) * e * mx + e * e * tgt.x;
        y = (1 - e) * (1 - e) * c.hy + 2 * (1 - e) * e * my + e * e * tgt.y;
        s *= 1 - 0.3 * e;
        if (t >= 1) { c.on = false; c.el.style.display = "none"; this.onCoin?.(c.v); continue; }
      } else {
        // no counter given: drift up and fade
        const t = Math.min(1, (age - 0.25) / 0.4);
        x = c.hx; y = c.hy - t * 14 * ui;
        c.el.style.opacity = String(1 - t);
        if (t >= 1) { c.on = false; c.el.style.display = "none"; this.onCoin?.(c.v); continue; }
      }
      const spin = Math.abs(Math.cos(RT * 9 + c.spin));
      c.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(s * (0.35 + 0.6 * spin)).toFixed(3)},${s.toFixed(3)})`;
    }
    // leak: red edge tint 300 ms in, 500 ms out (art 5.3)
    const ea = RT - this.edgeT;
    const eo = ea < 0.3 ? ea / 0.3 : ea < 0.8 ? 1 - (ea - 0.3) / 0.5 : 0;
    if (this.post) this.post.red = eo; else this.edge.style.opacity = (eo * 0.28).toFixed(3);
    const fa = RT - this.flashT;
    this.flashEl.style.opacity = fa < this.flashDur ? (this.flashA * (1 - fa / this.flashDur) ** 2).toFixed(3) : "0";
  }

  clear(): void {
    for (const n of this.nums) { n.on = false; n.el.style.display = "none"; }
    for (const c of this.coins) { c.on = false; c.el.style.display = "none"; }
  }
}
