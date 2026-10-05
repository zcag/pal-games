// Ida's launch site and observatory: the lance parts, the Heartstone, the shards a launch would give, what carries
// over; the perk shop (paid in shards); and after a launch, the choice of the next world.
import { findByKey } from "../../../game/content/world.ts";
import { h, num } from "../dom.ts";
import { icon, findIcon, planetDisc } from "../icons.ts";
import { pips, priceEl, type ScreenDef } from "../panel.ts";
import { ptext } from "../pfont.ts";

const PART_ICON: Record<string, string> = { frame: "frame", coil: "coil", head: "head" };

export const launch: ScreenDef = {
  id: "launch",
  title: "Launch site",
  icon: "seed",
  building: "launch",
  size: "wide",
  shards: true,
  line: (m) => (m.launch.choosing ? "Wren would have liked to see that." : null),
  tabs: (m) => (m.launch.choosing ? ["Launch", "Perks", "Next world"] : ["Launch", "Perks"]),
  render(c, tab) {
    const m = c.m, L = m.launch;
    if (tab === 1) {
      const list = h("div.list.scroll.perks");
      m.perks.forEach((p, i) => {
        const can = p.cost !== null && m.shards >= p.cost;
        list.append(c.f(h(`div.row.perk${can ? "" : ".dis"}`, h("span.k.q", i < 9 ? String(i + 1) : ""), icon("perk", 2), h("span.nm", p.name),
          pips(p.level, p.cap), h("span.fx.q", p.text), h("span.buy", priceEl(p.cost, m.shards, "shard"))), `perk:${p.id}`, () => m.buyPerk(p.id), i < 9 ? i + 1 : undefined));
      });
      return list;
    }
    if (tab === 2) {
      const grid = h("div.worlds");
      L.planets.forEach((p, i) => grid.append(c.f(h("div.world", planetDisc(p.sky, 32, innerHeight >= 700 ? 3 : 2), h("div.wn", p.name, p.first ? h("span.tag", "New") : null),
        h("div.wt.q", p.text), h("div.wm", ...p.mods.map((x) => h("div", x)))), `world:${p.id}`, () => m.choosePlanet(p.id), i + 1)));
      return h("div.worldwrap", h("div.q.lead", "Ida: \"It's headed for a dim star. There's a planet there. Older than ours. Want to follow it?\""), grid);
    }
    if (!L.open) return h("div.closed", icon("lock", 3), h("div", L.why ?? "Reach the Core first."));
    const parts = h("div.parts", h("div.sh2", "The lance"));
    L.parts.forEach((p, i) => {
      const can = !p.owned && p.open && m.cash >= p.cost;
      parts.append(c.f(h(`div.row.part${p.owned ? ".owned" : can ? "" : ".dis"}`, h("span.k.q", String(i + 1)), icon(PART_ICON[p.id] ?? "gear", 2), h("span.nm", p.name),
        h("span.buy", p.owned ? h("span.price.max.good", "Built") : p.open ? priceEl(p.cost, m.cash) : h("span.price.max", p.why ?? "Locked"))), `part:${p.id}`, () => m.buyLance(p.id), i + 1));
    });
    const hs = findByKey("heartstone")?.id ?? 0;
    const hearts = h("div.hearts", h("div.sh2", "Heartstone"), h("div.hrow", ...Array.from({ length: L.heart.need }, (_, i) => h(`span.hs${i < L.heart.have ? ".have" : ""}`, findIcon(hs, 2, i >= L.heart.have)))),
      h("div.q", `${Math.min(L.heart.have, L.heart.need)} of ${L.heart.need} in the bay`));
    const status = L.ready ? h("div.ready.good", "Ready. Dock with the Seed in the chamber.")
      : h("div.ready.q", "Build the lance, bring the Heartstone, then dock with the Seed.");
    const left = h("div.lcol", h("div.planet", planetDisc(L.planet.sky, 32, innerHeight >= 700 ? 3 : 2), h("div.pn2", L.planet.name), h("div.q", L.seedAge ? `Seed age ${L.seedAge}` : "Home")));
    const mid = h("div.mcol", parts, hearts, status);
    const right = h("div.rcol",
      h("div.shbig", h("div.q", "A launch now gives"), h("div.sv", icon("shard", 3), ptext(num(L.shards), innerHeight >= 700 ? 5 : 4, { color: "#e8d8ff", shade: "#9a70d8", outline: "#05070a" })), h("div.q", "core shards")),
      h("div.keeps", h("div.sh2", "Carries over"), ...L.carries.map((x) => h("div.ck", icon("check", 1), x)), h("div.sh2", "Starts over"), ...L.resets.map((x) => h("div.ck.q", x))));
    return h("div.launchwrap", left, mid, right);
  },
  hints: (tab) => (tab === 0 ? ["↑↓ Choose", "Enter Build", "→ Perks", "⌫ Close"] : tab === 1 ? ["↑↓ Choose", "Enter Buy", "⌫ Close"] : ["←→ Choose", "Enter Go there"]),
};
