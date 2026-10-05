// Title screen (art 7.11): RAMPARTS in brass over the golden-hour castle; the menu.
import { h, raw, sfx, kbd } from "../dom.ts";
import { icon } from "../icons.ts";
import type { Ctx, Screen } from "../index.ts";
import { tip } from "../tooltip.ts";
import { COMMANDERS } from "../content.ts";

export function titleScreen(ctx: Ctx): Screen {
  const P = ctx.profile();
  const saved = ctx.host.savedRun();
  const letters = "RAMPARTS".split("").map((c, i) => h("span", { style: { animationDelay: `${300 + i * 40}ms` } }, c));
  const logo = h("div.logo", h("div.lt", { "data-t": "RAMPARTS" }, ...letters), h("div.ls", "A tower defense of the long road"));
  const asc = P.commanders[P.last]?.maxAscension ?? 0;
  const btn = (label: string, glyph: string, on: () => void, extra?: HTMLElement | null, first = false) =>
    h(`button.btn${first ? "" : ".sec"}.big.wide.mbtn`, { onclick: () => { sfx("click"); on(); }, ...(first ? { "data-first": "" } : {}) }, raw(icon(glyph, { size: 15, accent: first ? "#1a140c" : "#C9A45A" })), h("span.ml", label), extra ?? null);
  const items: HTMLElement[] = [];
  if (saved) items.push(tip(btn("Continue run", "play", () => ctx.host.nav({ to: "continue" }), h("span.mx", `Act ${saved.act}`), true), { title: "Continue run", line: `${COMMANDERS[saved.commander].name}, act ${saved.act}, floor ${saved.floor}. ${saved.loadout.lives} lives, ${saved.crowns} crowns.` }));
  items.push(tip(btn("New run", "flag", () => ctx.show({ s: "commander" }), asc ? h("span.chip.asc", raw(icon("ascension", { size: 11, accent: "#FF9A5A" })), String(asc)) : null, !saved), { title: "New run", line: saved ? "Starts over. Your saved run will be lost." : "Choose a commander and march." }));
  items.push(tip(btn("Codex", "codex", () => ctx.show({ s: "codex" }), h("span.mx", `${P.codex.pct}%`)), { title: "Codex", line: "Everything you have met, and how much is left." }));
  items.push(btn("Settings", "gear", () => ctx.show({ s: "settings" })));
  const level = h("div.renown", raw(icon("renown", { size: 14, accent: "#E3B655" })),
    h("span", `Renown level ${P.level}`),
    P.nextUnlock ? h("span.dim", ` · ${P.nextUnlock.need} to ${P.nextUnlock.name}`) : null,
    h("div.rbar", h("i", { style: { width: `${Math.min(100, (100 * (P.renown - P.levelAt)) / Math.max(1, P.nextAt - P.levelAt))}%` } })));
  const el = h("div.title-scr",
    h("div.tleft", logo, h("div.menu", ...items), level),
    h("div.tfoot.sm", kbd("↑"), kbd("↓"), " choose  ", kbd("Enter"), " go  ", kbd("M"), " mute"));
  return { el };
}
