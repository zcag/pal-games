// Pell's supply store, Juno's rig office, Ines' market and Mo's fuel station.
import { findById } from "../../../game/content/world.ts";
import { h, cash } from "../dom.ts";
import { icon, findIcon } from "../icons.ts";
import { iconOf } from "../hud.ts";
import { pips, priceEl, type ScreenDef } from "../panel.ts";

export const supply: ScreenDef = {
  id: "supply",
  title: "Supply",
  icon: "repair",
  building: "supply",
  render(c) {
    const m = c.m;
    const items = m.items.filter((i) => i.key !== "overcharge");
    const grid = h("div.items");
    items.forEach((it) => {
      const full = it.count >= it.carry;
      const can = it.open && !full && m.cash >= it.price;
      const el = h(`div.item${can ? "" : ".dis"}${it.open ? "" : ".locked"}`,
        h("span.k.q", String(it.slot)),
        h("div.ii", it.open ? icon(iconOf(it.key), 3) : icon("lock", 2)),
        h("div.it", it.name),
        h("div.ix.q", it.open ? it.text : it.why ?? ""),
        it.open ? h("div.carry", ...Array.from({ length: it.carry }, (_, k) => h(k < it.count ? "i.on" : "i"))) : null,
        h("div.ib",
          it.open ? h("span.own.n", h("span", String(it.count)), h("span.q", ` / ${it.carry}`)) : h("span"),
          it.open ? (full ? h("span.price.max", "Full") : priceEl(it.price, m.cash)) : h("span.price.max", "Locked")));
      el.dataset.repeat = "1";
      grid.append(c.f(el, `item:${it.key}`, () => m.buyItem(it.key), it.slot));
    });
    return grid;
  },
  hints: () => ["←→↑↓ Choose", "Enter Buy one", "1-6 Buy", "⌫ Close"],
};

export const rigs: ScreenDef = {
  id: "rigs",
  title: "Rig office",
  icon: "rig",
  building: "rigs",
  live: 1,
  render(c) {
    const m = c.m;
    const list = h("div.list.scroll.rigs");
    m.rigs.forEach((r, i) => {
      const maxed = r.cost === null;
      const can = r.open && !maxed && m.cash >= (r.cost ?? 0);
      const built = r.level > 0;
      const st = r.state;
      const el = h(`div.row.rig${can ? "" : ".dis"}${built ? "" : ".unbuilt"}`,
        h("span.k.q", String(i + 1)),
        icon("rig", 2),
        h("span.nm", r.name),
        pips(r.level, r.cap),
        built ? h("span.out", h(`span.ob.${st === "Running" ? "run" : st === "Full" ? "full" : "stop"}`, h("i", { style: { "--d": `${(3.4 - 0.22 * r.level).toFixed(2)}s` } })), h("span.n", `${cash(r.yield)}/min`))
          : h("span.out.q", r.open ? `Makes ${cash(r.next)}/min` : r.why ?? "Not reached"),
        h(`span.st.${st === "Running" ? "good" : st === "Full" ? "warn" : "q"}`, built ? st : ""),
        h("span.buy", r.open ? priceEl(r.cost, m.cash, "cash", "Max") : h("span.price.max", "Locked")));
      list.append(c.f(el, `rig:${r.biome}`, () => m.buildRig(r.biome), i + 1));
    });
    const s = m.silo;
    const silo = h(`div.silo${s.open ? "" : ".q"}`, icon("silo", 2),
      h("span.nm", "Silo"),
      h("div.bar.wide", h("div.fill", { style: { "--c": "#e0c040", transform: `scaleX(${s.fill})` } })),
      h("span.n", s.open ? `${cash(s.held)} held · holds ${s.capHours} h` : "Research Silo at the lab"));
    return h("div.rigwrap", list, silo);
  },
  hints: (_t, sel) => ["↑↓ Choose", sel?.classList.contains("unbuilt") ? "Enter Build" : "Enter Upgrade", "⌫ Close"],
};

export const market: ScreenDef = {
  id: "market",
  title: "Market",
  icon: "cash",
  building: "market",
  size: "wide",
  render(c) {
    const m = c.m;
    const orders = h("div.orders.big", h("div.sh2", "Ines' orders"));
    for (const o of m.orders) {
      orders.append(c.f(h(`div.ord${o.done ? ".done" : ""}`, o.find ? findIcon(o.find, 2) : icon("order", 2), h("span.ot", o.text),
        h("span.op.n.q", `${Math.min(o.have, o.need)}/${o.need}`), h("span.ob", o.done ? "Done" : o.bonus)), `ord:${o.find}:${o.text}`));
    }
    if (!m.orders.length) orders.append(h("div.q", "No orders today."));
    const today = h("div.today", h("span.sh2", "Today"), ...m.market.map((x) => h("span.mk", findIcon(x.find, 2), h("span", findById(x.find)?.name ?? ""), h("span.mult", `x${x.mult}`))));
    // Every ore reached, in a grid that scrolls: arrows walk it, the selection scrolls into view.
    const prices = h("div.pgrid.scroll", ...m.prices.map((p) => {
      const f = findById(p.find);
      const boost = m.market.find((x) => x.find === p.find);
      return c.f(h(`div.pr${boost ? ".boost" : ""}`, findIcon(p.find, 2), h("span.nm", f?.name ?? ""), h(`span.n${boost ? ".cash" : ""}`, cash(p.price))), `price:${p.find}`);
    }));
    return h("div.marketwrap", orders, m.market.length ? today : null, h("div.sh2", "Prices per piece"), prices);
  },
  hints: () => ["←→↑↓ Choose", "⌫ Close"],
};

export const fuel: ScreenDef = {
  id: "fuel",
  title: "Fuel station",
  icon: "fuel",
  building: "fuel",
  size: "card",
  render(c) {
    const m = c.m;
    const rows: [keyof typeof m.service, string, string][] = [
      ["sell", "Sell the haul", "Everything in the bay, at Ines' prices"],
      ["fuel", "Refuel", "Fill the tank"],
      ["repair", "Repair", "Mend the hull"],
      ["restock", "Restock", "Top up items you carried"],
    ];
    return h("div.list.svc", h("div.q.lead", "On landing at the depot, in this order:"), rows.map(([k, name, text], i) =>
      c.f(h(`div.row.tg${m.service[k] ? ".on" : ""}`, h("span.k.q", String(i + 1)), h("span.sw", h("i")), h("span.nm", name), h("span.q", text)),
        `svc:${k}`, () => { m.setService(k, !m.service[k]); }, i + 1)));
  },
  hints: () => ["↑↓ Choose", "Enter Switch", "⌫ Close"],
};
