// Bram's workshop: eight upgrades with level pips and plain-number effects, the Lift, and the Modules tab.
import { h, cash } from "../dom.ts";
import { icon, podPreview } from "../icons.ts";
import { BIOME_COLORS } from "../hud.ts";
import { pips, priceEl, type Ctx, type ScreenDef } from "../panel.ts";
import type { ModuleCard, UiModel, UpgradeRow } from "../model.ts";

const MODULE_ICON: Record<string, string> = {
  magnet: "magnet", heatsink: "heatsink", afterburner: "afterburner", overcharge: "overcharge", recycler: "recycler",
  smelter: "smelter", packing: "packing", tracer: "tracer", ear: "ear", drone: "drone",
};
export const moduleIcon = (id: string) => MODULE_ICON[id] ?? "gear";

let armed = 0; // the socket a full rack swaps into

/** The part of `next` that differs from `now`: "Digs rock in 0.71 s" -> "0.57 s". */
export function tail(now: string, next: string): string {
  const a = now.split(" "), b = next.split(" ");
  let i = 0;
  while (i < a.length - 1 && i < b.length - 1 && a[i] === b[i]) i++;
  return b.slice(i).join(" ");
}

function upgradeRow(c: Ctx, u: UpgradeRow, i: number): HTMLElement {
  const m = c.m;
  const maxed = u.cost === null;
  const can = !maxed && !u.locked && m.cash >= (u.cost ?? 0);
  const el = h(`div.row.up${can ? "" : ".dis"}${maxed ? ".maxed" : ""}`,
    h("span.k.q", String(i + 1)),
    icon(u.stat, 2),
    h("span.nm", u.name, h("span.lv.n.q", ` ${u.level}`)),
    pips(u.level, u.cap),
    h("span.fx", maxed || u.now === u.next ? h("span.q", u.now) : u.locked ? h("span.q", u.locked) : [h("span.q", u.now), h("span.arr", " → "), h("span.nx", tail(u.now, u.next))]),
    h("span.tags", u.gate && !maxed ? h("span.tag.gate", "Gate") : null, u.tier && !maxed ? h("span.tag.tier", u.tier) : null),
    h("span.buy", u.locked ? h("span.price.max", "Locked") : priceEl(u.cost, m.cash)));
  return c.f(el, `up:${u.stat}`, () => m.buyUpgrade(u.stat), i + 1);
}

function liftRow(c: Ctx): HTMLElement {
  const m = c.m;
  const segs = m.lift;
  const next = segs.find((s) => !s.built);
  const col = h("span.liftcol");
  segs.forEach((s, i) => col.append(h(`i${s.built ? ".built" : s === next ? ".next" : ""}`, { style: { "--bc": BIOME_COLORS[i] }, title: s.name })));
  const can = !!next && next.open && m.cash >= next.cost;
  const el = h(`div.row.up.lift${can ? "" : ".dis"}${next ? "" : ".maxed"}`,
    h("span.k.q", "9"),
    icon("lift", 2),
    h("span.nm", "Lift"),
    col,
    h("span.fx", next ? (next.open ? [h("span.q", "Down to "), h("span.nx", `${(next.rows[1] * 10).toLocaleString("en-US")} m`), h("span.q", ` through the ${next.name.replace(/ segment$/, "")}`)] : h("span.q", next.why ?? "")) : h("span.q", "Runs the whole way down")),
    h("span.buy", next ? (next.open ? priceEl(next.cost, m.cash) : h("span.price.max", "Locked")) : h("span.price.max", "Built")));
  return c.f(el, "lift", () => m.buyLift(), 9);
}

/** Before and after: the level now, the step the next purchase adds, and the cap. */
function stepBar(level: number, cap: number): HTMLElement {
  const k = (n: number) => `${(Math.min(n, cap) / cap) * 100}%`;
  return h("div.stepbar", h("i.now", { style: { width: k(level) } }), level < cap ? h("i.add", { style: { left: k(level), width: k(1) } }) : null);
}

function detail(m: UiModel, key: string | undefined): HTMLElement {
  const box = h("div.detail");
  const stat = key?.startsWith("up:") ? key.slice(3) : null;
  box.append(h("div.podview", podPreview(key === "lift" ? null : stat, innerHeight >= 700 ? 8 : 4)));
  if (!key) return box;
  if (key === "lift") {
    const segs = m.lift, built = segs.filter((x) => x.built).length, next = segs.find((s) => !s.built);
    box.append(h("div.dt", "Lift", h("span.q.n", `  ${built} of ${segs.length}`)), stepBar(built, segs.length),
      h("div.dd.q", "Rides the mine-mouth column at 40 tiles a second, both ways. No fuel, no heat, no harm. The fuel tick measures the way to its head."));
    if (next) box.append(h("div.dd", h("span.q", "Next "), `down to ${(next.rows[1] * 10).toLocaleString("en-US")} m`), h("div.dd.q", next.open ? "" : next.why ?? ""));
    return box;
  }
  const u = m.upgrades.find((x) => `up:${x.stat}` === key);
  if (!u) return box;
  box.append(h("div.dt", u.name, h("span.q.n", `  ${u.level} of ${u.cap}`)), stepBar(u.level, u.cap),
    h("div.cmp", h("div", h("span.q", "Now"), h("span", u.now)), u.cost !== null ? h("div.nx", h("span.q", "Next"), h("span", u.next)) : null));
  if (u.cost !== null) box.append(h("div", u.tier ? h("div.dd.tier", `New look: ${u.tier}`) : null, u.gate ? h("div.dd.gate", "A gate for the next biome") : null));
  return box;
}

function socket(c: Ctx, i: number, id: string | null, card?: ModuleCard): HTMLElement {
  const el = h(`div.sock${id ? ".full" : ""}${i === armed ? ".armed" : ""}`,
    h("span.sk.q", `Slot ${i + 1}`),
    id ? icon(moduleIcon(id), 3) : h("span.empty"),
    h("span.sn", card?.name ?? "Empty"));
  return c.f(el, `sock:${i}`, () => {
    armed = i;
    if (id) return c.m.equip(i, null);
  });
}

/** A module card. In the workshop it fits or empties; at the lab ("lab") it unlocks with data. */
export function moduleCard(c: Ctx, card: ModuleCard, at: "workshop" | "lab" = "workshop"): HTMLElement {
  const m = c.m;
  const slot = m.modules.equipped.indexOf(card.id);
  const forSale = !card.owned && card.open && card.cost !== undefined;
  const lab = at === "lab";
  const el = h(`div.mcard${card.owned ? (lab ? ".owned" : "") : forSale ? ".sale" : ".dis.locked"}${slot >= 0 && !lab ? ".on" : ""}`,
    h("div.mi", card.owned || forSale ? icon(moduleIcon(card.id), 3) : icon("lock", 2)),
    h("div.mt", card.name),
    h("div.mx.q", card.owned || forSale ? card.text : card.why ?? "Not yet"),
    forSale ? h("div.mp", lab ? priceEl(card.cost!, m.data, "data") : h("span.q", "Unlock it at the lab")) : null,
    lab && card.owned ? h("div.mp.good", "Unlocked") : null,
    slot >= 0 && !lab ? h("div.mslot.n", String(slot + 1)) : null);
  return c.f(el, `mod:${card.id}`, () => {
    if (lab) { if (card.owned) return { ok: false, why: "Fit it at the workshop" }; if (!forSale) return { ok: false, why: card.why ?? "Not yet" }; const r = m.buyModule(card.id); if (r.ok) c.sound("research"); return r; }
    if (forSale) return { ok: false, why: "Unlock it at the lab" };
    if (!card.owned) return { ok: false, why: card.why ?? "Not yet" };
    if (slot >= 0) return m.equip(slot, null);
    const free = m.modules.equipped.findIndex((x) => !x);
    const at = free >= 0 && free < m.modules.slots ? free : Math.min(armed, m.modules.slots - 1);
    return m.equip(at, card.id);
  });
}

export const workshop: ScreenDef = {
  id: "workshop",
  title: "Workshop",
  icon: "drill",
  building: "workshop",
  size: "wide",
  tabs: () => ["Upgrades", "Modules"],
  render(c, tab) {
    const m = c.m;
    if (tab === 0) {
      const list = h("div.list.scroll.ups", m.upgrades.map((u, i) => upgradeRow(c, u, i)), liftRow(c));
      return h("div.split", h("div.side"), list);
    }
    const n = m.modules.slots;
    const socks = h("div.socks");
    for (let i = 0; i < n; i++) {
      const id = m.modules.equipped[i] ?? null;
      socks.append(socket(c, i, id, m.modules.cards.find((x) => x.id === id)));
    }
    if (m.modules.nextSlot) socks.append(h("div.sock.lockedslot", h("span.sk.q", `Slot ${n + 1}`), icon("lock", 2), h("span.sn.q", m.modules.nextSlot)));
    const cards = h("div.cards.scroll", m.modules.cards.map((x) => moduleCard(c, x)));
    return h("div.mods", h("div.mh.q", "Owned modules swap for free. Pick a card to fit it, a slot to empty it."), socks, cards);
  },
  select(el, c) {
    const side = el?.closest(".split")?.querySelector(".side");
    if (side) { side.textContent = ""; side.append(detail(c.m, el?.dataset.f)); }
  },
  hints(tab, sel) {
    if (tab === 1) return ["←→↑↓ Choose", sel?.classList.contains("sock") ? "Enter Empty slot" : sel?.classList.contains("sale") ? "Enter Buy" : "Enter Fit", "⌫ Close"];
    return ["↑↓ Choose", "Enter Buy", "1-9 Buy", "→ Modules", "⌫ Close"];
  },
};

export { cash };
