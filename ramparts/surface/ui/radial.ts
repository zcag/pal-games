// The radial menu around a build spot (art 7.5): fixed slots per key on an empty spot; upgrade,
// specialise, sell, target and rally around a built tower; a side plate with the tower's numbers.
import type { Battle, Pad, SpecId, TargetMode, Tower, TowerId } from "../../game/types.ts";
import { focus as F } from "../render/api.ts";
import { DAMAGE, SPECS, TOWERS } from "./content.ts";
import { add, clamp, h, pulse, raw, roman, sfx, text, toggle } from "./dom.ts";
import { icon, specIcon, towerIcon, TOWER_ACCENT, SPEC_ACCENT } from "./icons.ts";
import type { Ctx } from "./index.ts";
import { buildCost, canSell, clearCost, sellValue, specOptions, statsOf, towerOn, upgradeCost } from "./query.ts";
import { showAt, hide as hideTip, type TipSpec } from "./tooltip.ts";

/** Ring radius in UI px: tighter at 720x390, art 7.5's 48 when there is room. */
let R = 42;
const MODES: TargetMode[] = ["first", "strong", "last"];
export const MODE_NAME: Record<TargetMode, string> = { first: "First", strong: "Strongest", last: "Last" };

type Opt = {
  id: string; el: HTMLElement; ang: number; key?: string;
  cost?: () => number | null; enabled: () => boolean; act: () => void; tip: () => TipSpec; preview?: () => void;
};

export class Radial {
  el = h("div.radial");
  private ring = h("div.rr");
  private plate = h("div.rplate.pn.deep");
  private opts: Opt[] = [];
  pad: number | null = null;
  private b: Battle | null = null;
  private hot: Opt | null = null;
  private specArm: SpecId | null = null;
  private sellAt = 0;
  private pos = { x: 0, y: 0 };
  /** Set by the HUD: start rally aim. */
  onRally: (t: Tower) => void = () => {};

  constructor(private ctx: Ctx) {
    this.el.append(this.ring, this.plate);
    this.el.addEventListener("contextmenu", (e) => { e.preventDefault(); this.close(); });
  }

  get open() { return this.pad != null; }
  tower(): Tower | null { return this.b && this.pad != null ? towerOn(this.b, this.pad) : null; }

  show(b: Battle, pad: number) {
    this.b = b;
    const reopen = this.pad === pad;
    this.pad = pad;
    this.specArm = null; this.sellAt = 0;
    this.build(reopen);
    F.selectedPad = pad;
    hideTip();
    sfx("open");
  }

  close() {
    if (this.pad == null) return;
    this.pad = null; this.hot = null; this.specArm = null;
    F.selectedPad = null; F.tower = null; F.ring = null;
    this.el.classList.remove("on");
    this.el.classList.add("closing");
    hideTip();
    setTimeout(() => { if (this.pad == null) { this.el.classList.remove("closing"); this.ring.replaceChildren(); } }, 110);
  }

  /** Rebuild the options (after a build/upgrade/spec the menu stays on the same spot). */
  refresh() { if (this.b && this.pad != null) this.build(true); }

  private build(quiet: boolean) {
    R = this.ctx.root.classList.contains("roomy") ? 50 : 42;
    this.el.classList.toggle("compact", R < 48);
    const b = this.b!, pad = b.map.pads[this.pad!];
    const t = towerOn(b, pad.id);
    this.opts = [];
    this.ring.replaceChildren();
    if (pad.rubble && !t) this.rubbleOpts(b, pad);
    else if (!t) this.buildOpts(b, pad);
    else this.towerOpts(b, pad, t);
    F.tower = t?.id ?? null;
    for (const o of this.opts) this.ring.appendChild(o.el);
    this.el.classList.toggle("tower", !!t);
    this.el.classList.remove("closing");
    if (!quiet) { this.el.classList.remove("on"); void this.el.offsetWidth; }
    this.el.classList.add("on");
    this.opts.forEach((o, i) => o.el.style.setProperty("--d", `${i * 20}ms`));
    this.plateFor(b, pad, t);
    this.restRing();
    this.place();
    this.frame(b);
  }

  private opt(o: Omit<Opt, "el"> & { glyph: string; accent?: string; big?: boolean; label?: string; cls?: string }): Opt {
    const x = Math.cos((o.ang * Math.PI) / 180) * R, y = Math.sin((o.ang * Math.PI) / 180) * R;
    const el = h(`button.ro${o.big ? ".big" : ""}${o.cls ? "." + o.cls : ""}.live`, { style: { "--x": `${x}px`, "--y": `${y}px`, "--ac": o.accent ?? "" } },
      h("span.rb", raw(o.glyph)),
      o.key ? h("span.rk", o.key) : null,
      h("span.rc"),
    );
    const opt: Opt = { ...o, el };
    el.addEventListener("pointerenter", () => this.hover(opt));
    el.addEventListener("pointerleave", () => { if (this.hot === opt) this.hover(null); });
    el.addEventListener("focus", () => this.hover(opt));
    el.addEventListener("click", (e) => { e.stopPropagation(); this.press(opt); });
    this.opts.push(opt);
    return opt;
  }

  private buildOpts(b: Battle, pad: Pad) {
    const keys = b.loadout.towers;
    for (let i = 0; i < 6; i++) {
      const kind = keys[i];
      const ang = -90 + i * 60;
      if (!kind) {
        const el = h("span.ro.empty", { style: { "--x": `${Math.cos((ang * Math.PI) / 180) * R}px`, "--y": `${Math.sin((ang * Math.PI) / 180) * R}px` } }, h("span.rb"), h("span.rk", String(i + 1)));
        this.opts.push({ id: "empty" + i, el, ang, enabled: () => false, act: () => {}, tip: () => ({ title: "Empty key", line: "Win towers from rewards to fill your war table." }) });
        continue;
      }
      const T = TOWERS[kind];
      this.opt({
        id: kind, ang, key: String(i + 1), glyph: towerIcon(kind, 18), accent: TOWER_ACCENT[kind],
        cost: () => buildCost(b, kind),
        enabled: () => b.gold >= buildCost(b, kind),
        act: () => this.ctx.host.command({ t: "build", pad: pad.id, tower: kind }),
        preview: () => this.ringFor(pad, kind, 1, null),
        tip: () => {
          const s = statsOf(b, kind, 1, null, pad);
          return { title: T.name, glyph: towerIcon(kind, 16), line: T.line, rows: statRows(kind, s), meta: costLine(buildCost(b, kind), b.gold), keys: [String(i + 1)] };
        },
      });
    }
  }

  private rubbleOpts(b: Battle, pad: Pad) {
    this.opt({
      id: "clear", ang: -90, key: "Enter", glyph: icon("hammer", { size: 18, accent: "#C9A45A" }), cost: () => clearCost(b, pad),
      enabled: () => b.gold >= clearCost(b, pad), act: () => this.ctx.host.command({ t: "clear", pad: pad.id }),
      tip: () => ({ title: "Clear the rubble", glyph: icon("hammer", { size: 16 }), line: "Pay to clear this spot, then build on it.", meta: costLine(clearCost(b, pad), b.gold) }),
    });
  }

  private towerOpts(b: Battle, pad: Pad, t: Tower) {
    const T = TOWERS[t.kind];
    const up = upgradeCost(b, t);
    if (t.level < 3 && up != null) {
      this.opt({
        id: "upgrade", ang: -90, key: "U", glyph: icon("upgrade", { size: 18, accent: "#EBD08F" }), accent: "#EBD08F",
        cost: () => upgradeCost(b, t), enabled: () => { const c = upgradeCost(b, t); return c != null && b.gold >= c; },
        act: () => this.ctx.host.command({ t: "upgrade", tower: t.id }),
        preview: () => this.ringFor(pad, t.kind, t.level + 1, null, t),
        tip: () => {
          const a = statsOf(b, t.kind, t.level, null, pad), n = statsOf(b, t.kind, t.level + 1, null, pad);
          return { title: `Upgrade to ${roman(t.level + 1)}`, glyph: icon("upgrade", { size: 16 }), line: `${T.name} gets stronger.`, extra: diffRows(a, n), meta: costLine(upgradeCost(b, t) ?? 0, b.gold), keys: ["U"] };
        },
      });
    } else if (t.level === 3) {
      specOptions(b, t).forEach(({ spec }, i) => {
        this.opt({
          id: spec, ang: i === 0 ? -132 : -48, key: String(i + 1), big: true, glyph: specIcon(spec, 22), accent: SPEC_ACCENT[spec], cls: "spec",
          cost: () => specOptions(b, t)[i]?.cost ?? null, enabled: () => b.gold >= (specOptions(b, t)[i]?.cost ?? Infinity),
          act: () => this.ctx.host.command({ t: "specialise", tower: t.id, spec }),
          preview: () => this.ringFor(pad, t.kind, 4, spec, t),
          tip: () => {
            const n = statsOf(b, t.kind, 4, spec, pad);
            return {
              title: SPECS[spec].name, glyph: specIcon(spec, 16), line: `${SPECS[spec].line} ${SPECS[spec].mechanic}`, rows: statRows(t.kind, n), wide: true,
              meta: (this.specArm === spec ? "<b>Click again to choose it.</b> " : `One of two final forms. Press ${i + 1} to choose it. `) + costLine(specOptions(b, t)[i]?.cost ?? 0, b.gold),
              keys: [String(i + 1)],
            };
          },
        });
      });
    }
    if (t.kind === "barracks" || t.spec === "treant") {
      this.opt({
        id: "rally", ang: 12, key: "R", glyph: icon("flag", { size: 18, accent: "#3F78D6" }), accent: "#4A86E0", enabled: () => true,
        act: () => { this.onRally(t); },
        tip: () => ({ title: "Rally point", glyph: icon("flag", { size: 16, accent: "#3F78D6" }), line: "Where soldiers stand guard. Click the road to move it.", keys: ["R"] }),
      });
    }
    if (!T.support || t.kind === "beacon") {
      this.opt({
        id: "mode", ang: 168, key: "T", glyph: icon("target", { size: 18, accent: "#EBD08F" }), enabled: () => t.kind !== "barracks",
        act: () => {
          const m = MODES[(MODES.indexOf(t.mode) + 1) % MODES.length];
          this.ctx.host.command({ t: "mode", tower: t.id, mode: m });
          t.mode = m; // shown at once; the sim confirms on the next tick
          sfx("click");
          this.plateFor(b, pad, t);
        },
        tip: () => ({ title: `Target: ${MODE_NAME[t.mode]}`, glyph: icon("target", { size: 16 }), line: "First: closest to your gate. Strongest: most health. Last: furthest back.", keys: ["T"] }),
      });
    }
    this.opt({
      id: "sell", ang: 90, key: "X", glyph: icon("sell", { size: 18, accent: "#FFD36B" }), cls: "sell",
      cost: () => sellValue(b, t), enabled: () => canSell(b),
      act: () => this.ctx.host.command({ t: "sell", tower: t.id }),
      tip: () => canSell(b)
        ? { title: this.sellAt ? "Sell? Press again" : "Sell", glyph: icon("sell", { size: 16 }), line: b.phase === "setup" ? "Selling in setup refunds everything." : "Refunds 70% of what you spent.", meta: `<span class="c-gold">+${sellValue(b, t) ?? 0} gold</span>`, keys: ["X", "X"] }
        : { title: "Can't sell now", line: "No selling once the last wave has started." },
    });
  }

  private plateFor(b: Battle, pad: Pad, t: Tower | null) {
    this.plate.replaceChildren();
    toggle(this.plate, "on", !!t);
    if (!t) return;
    const T = TOWERS[t.kind];
    const s = statsOf(b, t.kind, t.level, t.spec, pad, t);
    const name = t.spec ? SPECS[t.spec].name : T.name;
    const notches = h("div.lv", ...[1, 2, 3].map((n) => h(`span${t.level >= n ? ".on" : ""}`, roman(n))), t.spec ? h("span.on.sp", raw(icon("star", { size: 10, accent: "#FFD36B" }))) : null);
    add(this.plate, [
      h("div.pt", raw(t.spec ? specIcon(t.spec, 18) : towerIcon(t.kind, 18)), h("span.cz", name)),
      notches,
      h("div.ps", ...statRows(t.kind, s)),
      h("div.pm", h("span.lab", "Kills"), h("b.num", String(t.stats.kills)), T.support || t.kind === "barracks" ? null : h("span.md", MODE_NAME[t.mode])),
      t.disabled > 0 ? h("div.pd.c-bad", `Disabled ${Math.ceil(t.disabled / 30)} s`) : null,
    ]);
  }

  private ringFor(pad: Pad, kind: TowerId, level: number, spec: SpecId | null, cur?: Tower) {
    const n = statsOf(this.b, kind, level, spec, pad);
    const a = cur ? statsOf(this.b, cur.kind, cur.level, cur.spec, pad, cur) : null;
    F.ring = { x: pad.x, y: pad.y, r: a ? a.range : n.range, ground: !n.air, next: a ? n.range : undefined, accent: spec ? SPEC_ACCENT[spec] : TOWER_ACCENT[kind] };
  }

  private hover(o: Opt | null) {
    this.hot = o;
    this.opts.forEach((x) => toggle(x.el, "hot", x === o));
    if (!o) { hideTip(); this.restRing(); return; }
    sfx("hover");
    o.preview ? o.preview() : this.restRing();
    // Anchor to the whole ring so the tip never sits over the other options.
    const m = R + 26;
    showAt(o.tip(), { x: this.pos.x - m, y: this.pos.y - m, w: 2 * m, h: 2 * m });
  }

  private restRing() {
    const b = this.b, t = this.tower();
    if (!b || this.pad == null) return;
    const pad = b.map.pads[this.pad];
    if (t) { const s = statsOf(b, t.kind, t.level, t.spec, pad, t); F.ring = { x: pad.x, y: pad.y, r: s.range, ground: !s.air, accent: t.spec ? SPEC_ACCENT[t.spec] : TOWER_ACCENT[t.kind] }; }
    else F.ring = null;
  }

  /** `direct`: a key press (1/2, Enter) picks a final form at once; a click arms it first. */
  private press(o: Opt, direct = false) {
    if (!o.enabled()) {
      sfx("deny");
      pulse(o.el, "shake");
      const c = o.el.querySelector(".rc");
      if (c) pulse(c, "flash-bad");
      this.ctx.hud.denyGold();
      return;
    }
    const t = this.tower();
    if (o.el.classList.contains("spec") && !direct) {
      if (this.specArm !== o.id) {
        this.specArm = o.id as SpecId;
        this.opts.forEach((x) => toggle(x.el, "armed", x === o));
        sfx("click");
        this.hover(o);
        return;
      }
    }
    if (o.id === "sell") {
      const now = performance.now();
      if (now - this.sellAt > 1500) {
        this.sellAt = now;
        toggle(o.el, "armed", true);
        sfx("click");
        this.hover(o);
        setTimeout(() => { if (performance.now() - this.sellAt >= 1500) { toggle(o.el, "armed", false); this.sellAt = 0; } }, 1520);
        return;
      }
      this.sellAt = 0;
    }
    o.act();
    if (o.id === "sell" || (!t && o.id !== "clear")) this.close();
    else setTimeout(() => this.refresh(), 0);
    void t;
  }

  /** Keys while open; returns true if used. */
  key(e: KeyboardEvent): boolean {
    if (this.pad == null) return false;
    const k = e.key.toLowerCase();
    const byKey = (key: string) => this.opts.find((o) => o.key?.toLowerCase() === key);
    if (/^[1-6]$/.test(k)) { const o = byKey(k); if (o) { this.focusOpt(o); this.press(o, true); } else sfx("deny"); return true; }
    if (k === "u") { const o = byKey("u") ?? this.opts.find((x) => x.el.classList.contains("spec")); if (o) { this.focusOpt(o); if (o.id === "upgrade") this.press(o); } return true; }
    if (k === "x" || k === "t" || k === "r") { const o = byKey(k); if (o) { this.focusOpt(o); this.press(o); } return true; }
    if (k === "enter" || k === " ") {
      if (k === " ") return false;
      const o = this.hot ?? (this.specArm ? this.opts.find((x) => x.id === this.specArm) : null) ?? byKey("enter");
      if (o) this.press(o, true);
      return true;
    }
    if (k === "arrowleft" || k === "arrowright" || k === "arrowup" || k === "arrowdown" || k === "tab") {
      const live = this.opts.filter((o) => o.el.tagName === "BUTTON");
      if (!live.length) return true;
      const dir = { arrowleft: 180, arrowright: 0, arrowup: -90, arrowdown: 90 }[k as "arrowleft"];
      let next: Opt;
      if (k === "tab" || dir === undefined) next = live[(live.indexOf(this.hot ?? live[live.length - 1]) + (e.shiftKey ? -1 : 1) + live.length) % live.length];
      else next = live.reduce((best, o) => (angDist(o.ang, dir) < angDist(best.ang, dir) && o !== this.hot ? o : best), live.find((o) => o !== this.hot) ?? live[0]);
      this.focusOpt(next);
      return true;
    }
    return false;
  }

  private focusOpt(o: Opt) { o.el.focus({ preventScroll: true }); this.hover(o); }

  /** Keeps the menu on its spot (the camera can move) and the costs current. */
  frame(b: Battle) {
    if (this.pad == null) return;
    this.b = b;
    if (!towerOn(b, this.pad) !== !this.el.classList.contains("tower") && this.opts.length) this.build(true);
    const t = this.tower();
    for (const o of this.opts) {
      if (o.el.tagName !== "BUTTON") continue;
      const c = o.cost?.();
      const rc = o.el.querySelector<HTMLElement>(".rc")!;
      if (c == null) { if (rc.textContent) rc.textContent = ""; }
      else text(rc, (o.id === "sell" ? "+" : "") + c);
      const ok = o.enabled();
      toggle(o.el, "off", !ok);
      toggle(o.el, "short", !ok && c != null && o.id !== "sell");
    }
    if (t && this.plate.classList.contains("on")) {
      const d = this.plate.querySelector(".pd");
      if ((t.disabled > 0) !== !!d) this.plateFor(b, b.map.pads[this.pad], t);
    }
    this.place();
  }

  private place() {
    if (!this.b || this.pad == null) return;
    const pad = this.b.map.pads[this.pad];
    const p = this.ctx.host.toScreen(pad.x, pad.y, 0.3);
    if (!p) return;
    const s = this.ctx.scale();
    const root = this.ctx.root;
    const W = root.clientWidth, H = root.clientHeight;
    const m = 6 + R + 22;
    const x = clamp(p.x / s, m, W - m), y = clamp(p.y / s, 30 + m - 6, H - m - 8);
    if (Math.abs(x - this.pos.x) > 0.5 || Math.abs(y - this.pos.y) > 0.5) {
      this.pos = { x, y };
      this.el.style.transform = `translate(${x}px, ${y}px)`;
    }
    // The tower's plate docks to the screen edge on the far side from the menu, clear of the ring.
    const pw = this.plate.offsetWidth || 132, ph = this.plate.offsetHeight || 90;
    const left = x > W / 2;
    const px = left ? 8 : W - pw - 8;
    const py = clamp(y - ph / 2, 36, H - ph - 50);
    this.plate.style.left = `${px - x}px`;
    this.plate.style.top = `${py - y}px`;
  }
}

const angDist = (a: number, b: number) => { const d = Math.abs(((a - b + 540) % 360) - 180); return d; };

export function statRows(kind: TowerId, s: ReturnType<typeof statsOf>): HTMLElement[] {
  const T = TOWERS[kind];
  const out: HTMLElement[] = [];
  if (s.damage != null) out.push(h("span.stat", raw(icon(T.dmg === "none" ? "sword" : T.dmg, { size: 12, accent: DAMAGE[T.dmg].color })), h("span.num", String(s.damage))));
  if (s.interval != null) out.push(h("span.stat", raw(icon("clock", { size: 12 })), h("span.num", `${s.interval}s`)));
  out.push(h("span.stat", raw(icon("range", { size: 12, accent: "#EBD08F" })), h("span.num", String(s.range))));
  out.push(h("span.stat.reach", raw(icon(s.air ? "air" : "build", { size: 12 })), h("span.sm", s.air ? "Hits air" : "Ground only")));
  return out;
}

function diffRows(a: ReturnType<typeof statsOf>, n: ReturnType<typeof statsOf>): HTMLElement {
  const row = (g: string, lab: string, x?: string | number, y?: string | number) =>
    x == null || y == null || x === y ? null : h("div.diff", raw(icon(g, { size: 12 })), h("span.sm", lab), h("span.num.dim", String(x)), h("span.ar", "›"), h("span.num.c-good", String(y)));
  return h("div.diffs", row("sword", "Damage", a.damage, n.damage), row("clock", "Every", a.interval && `${a.interval}s`, n.interval && `${n.interval}s`), row("range", "Range", a.range, n.range));
}

export function costLine(cost: number, gold: number) {
  return cost <= gold ? `<span class="c-gold">${cost} gold</span>` : `<span class="c-bad">${cost} gold</span> <span class="dim">(you have ${gold})</span>`;
}
