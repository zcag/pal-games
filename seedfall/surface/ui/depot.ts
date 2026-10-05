// The depot card after a dock (progression.md section 11): the sell count-up with a row per ore, the rigs line,
// fuel and repair, the total and best haul, the summary line, the suggestion card with B, the next-biome bar,
// Ines' orders and the market board. It sits on the left, clear of the pod on the pad, and never takes input
// except B, Enter (skip) and U; a direction key closes it and drives.
import type { Sale } from "../../game/types.ts";
import { findById } from "../../game/content/world.ts";
import { h, num, cash, clamp, easeOutCubic, toggle } from "./dom.ts";
import { icon, findIcon } from "./icons.ts";
import { PxText, ptext } from "./pfont.ts";
import type { UiModel } from "./model.ts";
import type { Hud } from "./hud.ts";
import type { Sound } from "./panel.ts";

const ROW_GAP = 0.06;

export class Depot {
  el = h("div.depot.sh");
  private card = h("div.pn.dcard");
  private sale: Sale | null = null;
  private t = 0;
  private dur = 0;
  private rowsAt = 0;
  private rows: HTMLElement[] = [];
  private totalT = new PxText(3, { color: "#f0d050", shade: "#b08a20", outline: "#05070a" });
  private get totalEl() { return this.totalT.el; }
  private totalWrap = h("div.total");
  private before = 0;
  private done = true;
  private news = new Map<number, number>();
  private coins = h("div.coins");
  shown = false;

  constructor(private m: UiModel, private hud: Hud, private sound: Sound) {
    this.el.append(this.card);
  }

  private ps() { return innerHeight >= 700 ? 4 : 3; }

  /** First pickups of the dive, so their rows get the "New" stamp: find id -> data gained. */
  noteNew(find: number, data: number) { this.news.set(find, data); }

  open(sale: Sale) {
    this.sale = sale;
    this.t = 0;
    this.rowsAt = sale.lines.length * ROW_GAP + 0.05;
    const total = Math.max(0, sale.total);
    this.dur = total > 0 ? Math.min(1.6, 0.6 + 0.25 * Math.log10(Math.max(1, total))) : 0;
    this.before = this.m.cash - sale.total;
    this.done = false;
    this.hud.cashHold = true;
    this.hud.shownCash = this.before;
    this.build();
    this.shown = true;
    this.el.classList.remove("out");
    this.el.classList.add("on");
  }

  close() {
    if (!this.shown) return;
    this.finish(false);
    this.shown = false;
    this.el.classList.remove("on");
    this.el.classList.add("out");
    this.news.clear();
  }

  /** Enter: jump to the end of the count-up. */
  skip(): boolean {
    if (!this.shown || this.done) return false;
    this.sound("saleChord");
    this.t = this.rowsAt + this.dur;
    return true;
  }

  /** Re-read the suggestion, the next-biome bar and the orders (after a purchase). */
  refresh() { if (this.shown) this.buildLower(); }

  private lower = h("div.lower");

  private build() {
    const s = this.sale!, m = this.m;
    this.card.textContent = "";
    this.rows = [];
    const tally = h("div.tally");
    const lines = s.lines;
    if (lines.length > 6) tally.classList.add("two");
    for (const l of lines) {
      const f = findById(l.find);
      const nw = this.news.get(l.find);
      const two = lines.length > 6;
      const r = h("div.srow", findIcon(l.find, 2), two ? null : h("span.nm", f?.name ?? "Ore"), h("span.x.n.q", `x${l.count}`),
        nw !== undefined ? h("span.new", nw > 0 && !two ? `New · +${nw} data` : "New") : null, h("span.val.n", cash(l.value)));
      r.title = f?.name ?? "";
      tally.append(r); this.rows.push(r);
    }
    if (!lines.length) tally.append(h("div.srow.empty.q", "Nothing to sell"));
    const extra = h("div.extra");
    if (s.rigs > 0) { const r = h("div.srow.rigs", icon("rig"), h("span.nm", "Rigs"), h("span.val.n.cash", cash(s.rigs))); extra.append(r); this.rows.push(r); }
    const costs: string[] = [];
    if (Math.round(Math.abs(s.fuel))) costs.push(`Fuel −${cash(Math.abs(s.fuel))}`);
    if (Math.round(Math.abs(s.repair))) costs.push(`Repair −${cash(Math.abs(s.repair))}`);
    if (Math.round(Math.abs(s.items))) costs.push(`Restock −${cash(Math.abs(s.items))}`);
    if (Math.round(Math.abs(s.fee))) costs.push(`Fee −${cash(Math.abs(s.fee))}`);
    if (costs.length) { const r = h("div.srow.costs.q", costs.join(" · ")); extra.append(r); this.rows.push(r); }
    this.totalWrap = h("div.total", ptext(s.total >= 0 ? "+" : "-", this.ps(), { color: "#f0d050", shade: "#b08a20", outline: "#05070a" }), icon("cash", 2), this.totalEl, s.best ? h("span.best", "Best haul") : null);
    this.totalT.set(num(0), this.ps());
    const r = m.records;
    const sum = h("div.summary.q", `${cash(r.perMin)}/min · best ${cash(r.bestHaul)}`);
    this.card.append(h("div.dhead", h("span.t", "Depot"), h("span.q", "Sold")), tally, extra, this.totalWrap, sum, this.lower, this.coins);
    this.buildLower();
  }

  private buildLower() {
    const m = this.m;
    this.lower.textContent = "";
    if (m.orders.length) {
      const ord = h("div.orders", h("div.oh", icon("order", 1), h("span", "Ines' orders")));
      for (const o of m.orders) {
        ord.append(h(`div.ord${o.done ? ".done" : ""}`, o.find ? findIcon(o.find, 2) : icon("order", 2), h("span.ot", o.text), h("span.ob", o.done ? "Done" : o.bonus)));
      }
      this.lower.append(ord);
    }
    const sg = m.suggestion;
    if (sg) {
      const can = m.cash >= sg.cost;
      this.lower.append(h(`div.sug${can ? ".can" : ""}`,
        h("div.sl", h("div.st", h("span.b", sg.label), h("span.n.cash", ` · ${cash(sg.cost)}`)), h("div.sx", sg.text, sg.note ? h("span.sn.q", ` ${sg.note}`) : null)),
        h("div.sb", can ? h("span.key", h("kbd", "B"), "Buy") : h("span.q.n", sg.dives ? `in about ${sg.dives} dive${sg.dives > 1 ? "s" : ""}` : `${cash(sg.cost - m.cash)} more`))));
    }
    const nb = m.next;
    if (nb) {
      const fill = nb.open ? 1 : clamp(1 - nb.toGo / Math.max(1, nb.total), 0, 1);
      const label = nb.open ? h("span", `${nb.name} is open. Dig past ${num(nb.row * 10)} m.`)
        : h("span", h("span.b", nb.name), ...nb.gates.map((g) => h(`span.gate${g.met ? ".met" : ""}`, " · ", g.label, g.met ? " ✓" : "")), nb.toGo > 0 ? h("span.n.q", ` · ${cash(nb.toGo)} to go`) : null);
      this.lower.append(h(`div.next${nb.open ? ".open" : ""}`, h("div.nf", { style: { transform: `scaleX(${fill})` } }), h("div.nt", label)));
    }
    if (m.market.length) {
      this.lower.append(h("div.market.q", h("span", "Today"), ...m.market.map((x) => h("span.mk", findIcon(x.find, 1), `${findById(x.find)?.name ?? ""} x${x.mult}`))));
    }
  }

  update(dt: number) {
    if (!this.shown || this.done || !this.sale) return;
    this.t += dt;
    const s = this.sale;
    const shownRows = Math.min(this.rows.length, Math.floor(this.t / ROW_GAP) + 1);
    this.rows.forEach((r, i) => toggle(r, "in", i < shownRows));
    const k = this.dur > 0 ? easeOutCubic((this.t - this.rowsAt) / this.dur) : 1;
    const v = this.t < this.rowsAt ? 0 : Math.max(0, s.total) * k;
    this.totalT.set(num(v), this.ps());
    this.hud.shownCash = this.before + (this.t < this.rowsAt ? 0 : s.total * k);
    if (this.t >= this.rowsAt + this.dur) this.finish(true);
  }

  private finish(fly: boolean) {
    if (this.done) return;
    this.done = true;
    this.rows.forEach((r) => r.classList.add("in"));
    if (this.sale) this.totalT.set(num(Math.max(0, this.sale.total)), this.ps());
    this.totalWrap.classList.add("land");
    this.hud.cashHold = false;
    this.hud.shownCash = this.m.cash;
    if (fly && this.sale && this.sale.total > 0) this.flyCoins(Math.round(clamp(6 + Math.log10(this.sale.total), 6, 12)));
  }

  /** Coins fly from the total to the HUD cash. */
  private flyCoins(n: number) {
    const from = this.totalEl.getBoundingClientRect(), to = this.hud.cashRect(), base = this.el.parentElement!.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const c = icon("cash", 2);
      c.classList.add("coin");
      const x0 = from.left - base.left + (Math.random() - 0.5) * 30, y0 = from.top - base.top + (Math.random() - 0.5) * 10;
      const x1 = to.left - base.left - 14, y1 = to.top - base.top + to.height / 2 - 9;
      c.style.left = `${x0}px`; c.style.top = `${y0}px`;
      c.animate([
        { transform: "translate(0,0) scale(1)", opacity: 0 },
        { transform: `translate(${(x1 - x0) * 0.3}px, ${(y1 - y0) * 0.1 - 30}px) scale(1.2)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${x1 - x0}px, ${y1 - y0}px) scale(0.8)`, opacity: 1 },
      ], { duration: 520 + i * 40, delay: i * 35, easing: "cubic-bezier(.5,0,.6,1)", fill: "forwards" }).onfinish = () => c.remove();
      this.el.parentElement!.append(c);
    }
  }
}
