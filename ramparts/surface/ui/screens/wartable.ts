// The war table drawer (V): towers on their keys with boons and core stars, relics, curses, supplies.
import type { RunState } from "../../../game/types.ts";
import { SUPPLIES, TOWERS, boon, boonTower, curse, relic } from "../content.ts";
import { h, raw } from "../dom.ts";
import { boonIcon, icon, relicGlyph, towerIcon, TOWER_ACCENT } from "../icons.ts";
import type { Ctx } from "../index.ts";
import { tip } from "../tooltip.ts";

let open: (() => void) | null = null;

export function warTable(ctx: Ctx, run: RunState) {
  if (open) { open(); return; }
  const L = run.loadout;
  const towers = h("div.wt-towers", ...Array.from({ length: 6 }, (_, i) => {
    const t = L.towers[i];
    if (!t) return h("div.wt-t.empty", h("span.kbd", String(i + 1)), h("span.sm", "Empty key"));
    const bs = L.boons.filter((b) => boonTower(b, L.boonOn) === t);
    const stars = bs.length >= 5 ? 2 : bs.length >= 3 ? 1 : 0;
    return h("div.wt-t", { "data-nav": "", tabindex: "0", style: { "--ac": TOWER_ACCENT[t] } },
      h("div.wt-h", h("span.kbd", String(i + 1)), raw(towerIcon(t, 22)), h("span.cz", TOWERS[t].name), stars ? h("span.stars", ...Array.from({ length: stars }, () => raw(icon("star", { size: 10, accent: "#FFD36B" })))) : null),
      h("div.wt-b", ...(bs.length ? bs.map((b) => tip(h("span.bchip", { "data-nav": "", tabindex: "0" }, raw(boonIcon(t, 12)), boon(b).name + (L.tempered.includes(b) ? "+" : "")), { title: boon(b).name + (L.tempered.includes(b) ? "+" : ""), glyph: boonIcon(t, 16), line: boon(b).text })) : [h("span.sm.dim", "No boons yet")])));
  }));
  const universal = L.boons.filter((b) => !boonTower(b, L.boonOn));
  const rel = h("div.wt-rel", ...L.relics.map((id) => {
    const R = relic(id);
    return tip(h("div.wt-r", { "data-nav": "", tabindex: "0" }, raw(icon(relicGlyph(id), { size: 20, accent: "#D9B86A" })), h("div", h("div.h3", R.name), h("div.sm", R.text))), { title: R.name, line: R.text, meta: R.downside ? `<span class="c-bad">${R.downside}</span>` : "", flavour: R.flavour });
  }));
  const side = h("div.wt-side",
    h("div.lab", "Relics"), rel,
    universal.length ? h("div.lab", "Boons for any tower") : null,
    universal.length ? h("div.wt-b", ...universal.map((b) => h("span.bchip", raw(boonIcon(null, 12)), boon(b).name))) : null,
    L.curses.length ? h("div.lab", "Curses") : null,
    ...L.curses.map((c) => tip(h("div.wt-c", { "data-nav": "", tabindex: "0" }, raw(icon("curse", { size: 18, accent: "#E05A6A" })), h("div", h("div.h3", curse(c).name), h("div.sm", curse(c).text))), { title: curse(c).name, line: curse(c).text, meta: "A lasting problem until you lift it." })),
    h("div.lab", "War supplies"),
    h("div.wt-sup", ...L.supplies.map((s, i) => h("span.chip", h("span.kbd", i ? "D" : "E"), s ? raw(icon(s, { size: 12, accent: "#C9A45A" })) : null, s ? SUPPLIES[s].name : "Empty"))),
  );
  const el = h("div.wartable.pn.deep.dlg.shadow",
    h("div.wt-top", raw(icon("wartable", { size: 18, accent: "#C9A45A" })), h("span.h2", "War table"), h("span.sp"), h("button.btn.ghost.icon.nonav", { onclick: () => close() }, raw(icon("close", { size: 14 })))),
    h("div.wt-body", towers, side));
  const close = ctx.overlay(h("div.layer.veil", el), (e) => { if (e.key === "v" || e.key === "V") { close(); return true; } return false; }, () => { open = null; });
  open = close;
}
