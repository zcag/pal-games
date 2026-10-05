// Shop (art 7.9, run-meta 2): a merchant's velvet cloth with cards and crown price chips; sold
// cards get a stamp; services: mend, lift a curse, restock. Arrows move, Enter buys, Backspace leaves.
import type { RunState } from "../../../game/types.ts";
import { choices, type Choice } from "../../../game/run/index.ts";
import { h, raw, sfx, kbd, pulse } from "../dom.ts";
import { icon } from "../icons.ts";
import type { Ctx, Screen, ScreenSpec } from "../index.ts";
import { tip } from "../tooltip.ts";
import { cardEl, runBand } from "./common.ts";

type Shop = Extract<RunState["screen"], { s: "shop" }>;
const SVC: Record<string, string> = { mend: "life", lift: "curse", restock: "reroll" };

export function shopScreen(ctx: Ctx, run: RunState): Screen {
  let r = run;
  const stockEl = h("div.sh-stock");
  const svcEl = h("div.sh-svc");
  const leaveEl = h("div.sh-leave");
  const price = (p: number, sale: boolean) => h(`span.price${sale ? ".sale" : ""}`, raw(icon("crown", { size: 11, accent: "#B89CFF" })), String(p), sale ? h("span.sl", "Sale") : null);

  function renderStock(flip: boolean) {
    const s = r.screen as Shop;
    const opts = choices(r);
    const old = [...stockEl.querySelectorAll<HTMLElement>(".sh-item")];
    if (!flip && old.length === s.stock.length) {
      s.stock.forEach((it, i) => {
        const w = old[i]!;
        const why = opts.find((c) => c.key === `buy:${i}`)?.disabled;
        if (it.sold && !w.classList.contains("sold")) {
          w.classList.add("sold");
          const c = w.querySelector(".card")!;
          c.classList.add("sold");
          c.append(h("span.stamp", h("span", "Sold")));
          sfx("buy");
        }
        w.classList.toggle("poor", !it.sold && !!why);
        w.dataset.why = why ?? "";
      });
      return;
    }
    stockEl.replaceChildren(...s.stock.map((it, i) => {
      const why = opts.find((c) => c.key === `buy:${i}`)?.disabled;
      const card = cardEl(it.card, { size: "tiny", onPick: () => buy(i) });
      if (it.sold) { card.classList.add("sold"); card.append(h("span.stamp", h("span", "Sold"))); }
      const w = h(`div.sh-item${it.sold ? ".sold" : ""}${!it.sold && why ? ".poor" : ""}`, { "data-why": why ?? "" }, card, price(it.price, it.sale));
      if (flip) { card.classList.add("flip-in"); card.style.animationDelay = `${60 + i * 45}ms`; }
      return w;
    }));
  }
  function buy(i: number) {
    const s = r.screen as Shop;
    const w = stockEl.querySelectorAll<HTMLElement>(".sh-item")[i];
    if (!s.stock[i] || s.stock[i]!.sold || !w) return;
    if (w.dataset.why) {
      sfx("deny"); pulse(w, "shake");
      if (/crowns/.test(w.dataset.why)) { const c = document.querySelector<HTMLElement>(".band .crowns .num"); if (c) pulse(c, "flash-bad"); }
      return;
    }
    sfx("coins");
    ctx.host.choose(`buy:${i}`);
  }
  const svcBtn = (c: Choice) => {
    const b = h(`button.svc${c.disabled ? ".off" : ""}`, { onclick: () => { if (c.disabled) { sfx("deny"); pulse(b, "shake"); return; } sfx("buy"); ctx.host.choose(c.key); } },
      raw(icon(SVC[c.key] ?? "info", { size: 18, accent: c.key === "lift" ? "#E05A6A" : "#C9A45A" })), h("span.sn", c.label), c.price != null ? h("span.price", raw(icon("crown", { size: 11, accent: "#B89CFF" })), String(c.price)) : null);
    return tip(b, { title: c.label, glyph: icon(SVC[c.key] ?? "info", { size: 16 }), line: c.text ?? "", meta: c.disabled ? `<span class="c-bad">${c.disabled}</span>` : "" });
  };
  function renderSvc() {
    const opts = choices(r);
    svcEl.replaceChildren(h("div.lab", "Services"), ...opts.filter((c) => SVC[c.key]).map(svcBtn));
    const lv = opts.find((c) => c.key === "leave")!;
    leaveEl.replaceChildren(tip(h("button.btn.big.wide", { onclick: leave }, raw(icon("next", { size: 14, accent: "#1a140c" })), lv.label, kbd("⌫")), { title: lv.label, line: lv.text ?? "Back to the road." }));
  }
  const leave = () => { sfx("back"); ctx.host.choose("leave"); };
  renderStock(true); renderSvc();
  const s0 = r.screen as Shop;
  const el = h("div.shop-scr.table.dim", runBand(ctx, run, s0.camp ? "The Last Camp" : s0.mirage ? "The Mirage Market" : "The Merchant"),
    h("div.tbody.sh-body",
      h("div.velvet", h("div.vel-h", h("span.h2", "Wares"), h("span.sm", s0.mirage ? "Half price. The dearest thing you buy turns to sand." : "Click to buy. Crowns only.")), stockEl),
      h("div.sh-side.pn.deep", svcEl, h("div.sp"), leaveEl)));
  return {
    el,
    key(e) { if (e.key === "Backspace") { leave(); return true; } return false; },
    update(spec: ScreenSpec) {
      if (spec.s !== "run" || spec.run.screen.s !== "shop") return false;
      const prev = (r.screen as Shop).stock.map((x) => JSON.stringify(x.card)).join();
      r = spec.run;
      const restocked = (r.screen as Shop).stock.map((x) => JSON.stringify(x.card)).join() !== prev;
      el.querySelector(".band")?.replaceWith(runBand(ctx, r, (r.screen as Shop).camp ? "The Last Camp" : "The Merchant"));
      renderStock(restocked); renderSvc();
      return true;
    },
  };
}
