// The collection log, achievements, settings, the offline card, the cargo panel and pause.
import { h, num, cash, dur, metres } from "../dom.ts";
import { icon, findIcon, hasIcon, oreSprite, cacheSprite } from "../icons.ts";
import { BIOME_COLORS } from "../hud.ts";
import type { Ctx, ScreenDef } from "../panel.ts";
import type { LogEntry, Offline, Settings, UiModel } from "../model.ts";

// ---------------------------------------------------------------- log

function entryIcon(e: LogEntry, scale: number) {
  if (e.find) return oreSprite(e.find, scale === 3 ? 4 : 3, e.found);
  if (e.icon?.startsWith("cache:")) return cacheSprite(e.icon.slice(6), scale === 3 ? 4 : 3, e.found);
  const ic = e.icon && hasIcon(e.icon) ? e.icon : "relic";
  return e.found ? icon(ic, scale) : icon(ic, scale, { a: "#323b4c", b: "#3e4859", c: "#3e4859", l: "#3e4859", g: "#3e4859", d: "#323b4c" });
}

function logDetail(m: UiModel, tab: number, key?: string): HTMLElement {
  const page = m.log[tab];
  const e = page?.entries.find((x) => `log:${x.id}` === key);
  const box = h("div.ldetail");
  if (!e) return box;
  if (!e.found) { box.append(h("div.lt.q", "Not found yet"), h("div.lx", e.hint ?? "Keep digging.")); return box; }
  box.append(h("div.lt", e.name), h("div.lx", e.text));
  const facts = [e.depth !== undefined ? `First at ${metres(e.depth)}` : "", e.count ? `${num(e.count)} found` : "", e.when ?? ""].filter(Boolean);
  if (facts.length) box.append(h("div.lf.q", facts.join(" · ")));
  return box;
}

export const log: ScreenDef = {
  id: "log",
  title: "Collection log",
  icon: "book",
  size: "wide",
  noBalance: true,
  tabs: (m) => m.log.map((p) => p.name),
  render(c, tab) {
    const page = c.m.log[tab];
    if (!page) return h("div");
    const big = innerHeight >= 700;
    const grid = h("div.lgrid.scroll");
    page.entries.forEach((e) => {
      const tint: Record<string, string> = e.biome !== undefined ? { "--bt": BIOME_COLORS[Math.min(6, e.biome)] } : {};
      grid.append(c.f(h(`div.lcell${e.found ? ".found" : ""}${e.biome !== undefined ? ".tinted" : ""}`, { style: tint }, entryIcon(e, big ? 3 : 2), e.found ? null : h("span.qm", "?"), h("span.ln", e.found ? e.name : "")), `log:${e.id}`));
    });
    const head = h("div.lhead", h("span.n", h("span.b", String(page.done)), h("span.q", ` of ${page.entries.length}`)), h("span.q", page.reward));
    return h("div.logwrap", h("div.lmain", head, grid), h("div.side"));
  },
  select(el, c) {
    const side = el?.closest(".logwrap")?.querySelector(".side");
    if (side) { side.textContent = ""; side.append(logDetail(c.m, currentTab(el!), el?.dataset.f)); }
  },
  hints: () => ["←→↑↓ Choose", "[ ] Page", "⌫ Close"],
};

/** The tab index from the open tab button. */
function currentTab(el: HTMLElement) {
  const tabs = [...el.closest(".scr")!.querySelectorAll(".tab")];
  return Math.max(0, tabs.findIndex((t) => t.classList.contains("on")));
}

// ---------------------------------------------------------------- achievements

export const achievements: ScreenDef = {
  id: "achievements",
  title: "Achievements",
  icon: "medal",
  size: "wide",
  noBalance: true,
  render(c) {
    const list = c.m.achievements;
    const done = list.filter((a) => a.done).length;
    const grid = h("div.agrid.scroll", list.map((a) => c.f(h(`div.ach${a.done ? ".done" : ""}`, icon(a.done ? "medal" : "lock", 2),
      h("div.an", a.name), h("div.ax.q", a.text), h("div.ar", a.reward)), `ach:${a.id}`)));
    return h("div.achwrap", h("div.lhead", h("span.n", h("span.b", String(done)), h("span.q", ` of ${list.length}`))), grid);
  },
  hints: () => ["←→↑↓ Choose", "⌫ Close"],
};

// ---------------------------------------------------------------- settings

// The overall volume is pal's setting (Settings › Extensions › Seedfall); the mix under it is the game's.
const SLIDERS: [keyof Settings, string][] = [["music", "Music"], ["effects", "Effects"]];

function slider(v: number): HTMLElement {
  const el = h("span.slider", h("span.track", h("span.sfill", { style: { width: `${v}%` } }), h("span.knob", { style: { left: `${v}%` } })), h("span.sv.n", String(Math.round(v))));
  return el;
}

export const settings: ScreenDef = {
  id: "settings",
  title: "Settings",
  icon: "gear",
  size: "card",
  noBalance: true,
  render(c) {
    const m = c.m, s = m.settings;
    const rows = SLIDERS.map(([k, name]) => {
      const el = h(`div.row.set${s.muted ? ".muted" : ""}`, h("span.nm", name), slider(s[k] as number));
      el.dataset.slider = k;
      const tr = el.querySelector<HTMLElement>(".track")!;
      tr.onmousedown = (e) => {
        e.preventDefault(); e.stopPropagation();
        const set = (ev: MouseEvent) => { const r = tr.getBoundingClientRect(); m.setSettings({ [k]: Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 100) }); c.host.render(); };
        set(e);
        const mv = (ev: MouseEvent) => set(ev);
        const up = () => { removeEventListener("mousemove", mv); removeEventListener("mouseup", up); c.sound("click"); };
        addEventListener("mousemove", mv); addEventListener("mouseup", up);
      };
      return c.f(el, `set:${k}`);
    });
    const vol = h("div.row.vol", h("span.nm", "Volume"), h("span.q", `${Math.round(s.master)}% · Settings › Extensions › Seedfall`));
    const mute = c.f(h(`div.row.tg${s.muted ? ".on" : ""}`, h("span.nm", "Mute"), h("span.sw", h("i"))), "set:mute", () => m.setSettings({ muted: !s.muted }));
    const reset = c.f(h("div.row.reset", h("span.nm.bad", "Reset save"), h("span.q", "Start over from nothing")), "set:reset", () => {
      c.host.confirm("Erase this save and start over? Everything is lost: upgrades, research, shards and the log.", "Erase", () => m.resetSave());
    });
    return h("div.list.settings", vol, rows, mute, h("div.sep"), reset);
  },
  key(e, c, sel) {
    const k = sel?.dataset.slider as keyof Settings | undefined;
    if (k && (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "KeyA" || e.code === "KeyD")) {
      const v = c.m.settings[k] as number;
      const step = e.shiftKey ? 1 : 10;
      c.m.setSettings({ [k]: Math.max(0, Math.min(100, v + (e.code === "ArrowLeft" || e.code === "KeyA" ? -step : step))) });
      c.sound("hover");
      c.host.render();
      return true;
    }
    return false;
  },
  hints: (_t, sel) => (sel?.dataset.slider ? ["↑↓ Choose", "←→ Change", "⌫ Back"] : ["↑↓ Choose", "Enter Switch", "⌫ Back"]),
};

// ---------------------------------------------------------------- offline

export const offline: ScreenDef & { data: Offline | null } = {
  id: "offline",
  title: "While you were away",
  icon: "away",
  size: "card",
  noBalance: true,
  data: null,
  render(c) {
    const o = offline.data;
    if (!o) return h("div");
    const capped = o.away > o.cap;
    const rows = h("div.away",
      h("div.aw.q", h("span.n", dur(o.away)), capped ? ` · the silo holds ${dur(o.cap)}` : ""),
      h("div.ar", icon("rig", 2), h("span", o.pieces > 0 ? `Rigs mined ${num(o.pieces)} pieces` : "Rigs mined"), h("span.n.cash.b", cash(o.cash))),
      o.data > 0 ? h("div.ar", icon("data", 2), h("span", "Lab"), h("span.n.data.b", `+${num(o.data)} data`)) : null,
      o.fullFor > 0 ? h("div.ah.q", `The silo was full for ${dur(o.fullFor)}.${o.hint ? ` ${o.hint}` : ""}`) : null);
    const btn = c.f(h("button.btn.primary.wide", "Collect"), "collect", () => { c.m.collectOffline(); c.sound("collect"); offline.data = null; c.host.close(); });
    return h("div.offwrap", rows, btn);
  },
  hints: () => ["Enter Collect"],
};

// ---------------------------------------------------------------- cargo

export const cargo: ScreenDef = {
  id: "cargo",
  title: "Cargo",
  icon: "cargo",
  size: "card",
  noBalance: true,
  render(c) {
    const m = c.m, p = m.view.pod;
    const rows = m.cargo.map((r, i) => {
      const el = h("div.row.crow", findIcon(r.find, 2), h("span.nm", r.name, r.ingot ? h("span.tag", "Ingot") : null), h("span.n.cnt", `x${r.count}`),
        h("span.n.q", `${num(r.mass * r.count * 10)} kg`), h("span.n.cash", cash(r.value * r.count)),
        h("button.dump", { title: "Dump one (shift: all)" }, "Dump"));
      const btn = el.querySelector<HTMLElement>(".dump")!;
      btn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); const res = m.dump(r.find, e.shiftKey); if (!res.ok) c.host.deny(el, res.why); else c.sound("click"); c.host.render(); };
      return c.f(el, `cargo:${r.find}`, () => m.dump(r.find, false), i < 9 ? i + 1 : undefined);
    });
    const value = m.cargo.reduce((s, r) => s + r.value * r.count, 0);
    const list = rows.length ? h("div.list.scroll.cargo", rows) : h("div.empty.q", "The bay is empty.");
    return h("div.cargowrap", list, h("div.ctot", h("span", h("span.b.n", `${p.cargoUsed}/${p.cargoMax}`), h("span.q", " slots")), h("span.q", p.load >= 3 ? "Heavy: climbs slow and burns more" : p.load >= 1.8 ? "Loaded" : "Light"), h("span.n.cash.b", cash(value))));
  },
  key(e, c, sel) {
    if ((e.code === "Enter" || e.code === "KeyX") && e.shiftKey && sel?.dataset.f?.startsWith("cargo:")) {
      const r = c.m.dump(Number(sel.dataset.f.slice(6)), true);
      if (!r.ok) c.host.deny(sel, r.why); else c.sound("click");
      c.host.render();
      return true;
    }
    if (e.code === "KeyX") { c.host.activate(sel); return true; }
    return false;
  },
  hints: () => ["↑↓ Choose", "Enter Dump one", "⇧Enter Dump all", "Tab Close"],
};

// ---------------------------------------------------------------- pause

const KEYS: [string, string][] = [
  ["← → ↓", "Drive and drill"], ["↑", "Thrust"], ["1-7", "Items"], ["Q", "Scan"], ["X", "Dump one"], ["E", "Enter a building"],
  ["B", "Buy the suggestion"], ["U", "Workshop"], ["Tab", "Cargo"], ["M", "Map"], ["L", "Log"], ["P", "Pause"], ["⇧M", "Sound"],
];

export const pause: ScreenDef = {
  id: "pause",
  title: "Paused",
  icon: "pause",
  size: "card",
  noBalance: true,
  render(c) {
    const items: [string, string, () => void][] = [
      ["Resume", "pod", () => c.host.close()],
      ["Collection log", "book", () => c.host.show("log")],
      ["Achievements", "medal", () => c.host.show("achievements")],
      ["Settings", "gear", () => c.host.show("settings")],
    ];
    const menu = h("div.menu", items.map(([name, ic, act], i) => c.f(h("div.row.mi", icon(ic, 2), h("span.nm", name)), `pause:${i}`, act, i + 1)));
    const keys = h("div.keys", KEYS.map(([k, t]) => h("div.kr", h("kbd", k), h("span.q", t))));
    return h("div.pausewrap", menu, keys);
  },
  hints: () => ["↑↓ Choose", "Enter Open", "⌫ Resume"],
};

export type { Ctx };
