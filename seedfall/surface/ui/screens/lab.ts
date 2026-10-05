// Sefa's lab: the research tree as a node graph, left to right by tier, one row per branch; arrows walk it.
import { h, num, cash } from "../dom.ts";
import { icon } from "../icons.ts";
import { moduleIcon, moduleCard } from "./workshop.ts";
import { priceEl, type Ctx, type ScreenDef } from "../panel.ts";
import type { ResearchNode, UiModel } from "../model.ts";

const BRANCHES: ResearchNode["branch"][] = ["geology", "logistics", "engineering", "automation", "market", "expedition", "planets"];
const BRANCH_NAME: Record<string, string> = { logistics: "Logistics", geology: "Geology", engineering: "Pod", automation: "Rigs", market: "Market", expedition: "Seed", planets: "Planets" };

function geometry(rows: number) {
  const big = innerHeight >= 700;
  const tight = !big && rows > 6;
  return { node: big ? 50 : tight ? 24 : 28, gx: big ? 46 : 22, gy: big ? 20 : tight ? 6 : 8, left: big ? 110 : 70 };
}

function nodeEl(c: Ctx, n: ResearchNode, x: number, y: number, size: number): HTMLElement {
  const ic = n.module ? moduleIcon(n.module) : n.branch;
  const can = n.state === "open" && c.m.data >= n.cost;
  const el = h(`div.node.${n.state}${can ? ".can" : ""}`, { style: { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` } },
    icon(ic, size >= 48 ? 4 : size >= 40 ? 3 : 2),
    n.state === "locked" ? h("span.lk", icon("lock", 1)) : null,
    n.state === "bought" ? h("span.ok", icon("check", 1)) : null);
  return c.f(el, `node:${n.id}`, () => {
    if (n.state === "bought") return { ok: false, why: "Already researched" };
    const r = c.m.research(n.id);
    if (r.ok) c.sound("research");
    return r;
  });
}

function graph(c: Ctx): HTMLElement {
  const m = c.m;
  const rows = BRANCHES.filter((b) => m.tree.some((n) => n.branch === b));
  const g = geometry(rows.length);
  const cols = Math.max(1, ...m.tree.map((n) => n.col + 1));
  const W = g.left + cols * (g.node + g.gx), H = rows.length * (g.node + g.gy);
  const pos = new Map<string, { x: number; y: number }>();
  const used = new Map<string, number>();
  for (const n of m.tree) {
    const r = rows.indexOf(n.branch);
    const k = `${r}:${n.col}`;
    const stack = used.get(k) ?? 0;
    used.set(k, stack + 1);
    pos.set(n.id, { x: g.left + n.col * (g.node + g.gx), y: r * (g.node + g.gy) + stack * 0 });
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(W)); svg.setAttribute("height", String(H));
  svg.classList.add("links");
  const half = g.node / 2;
  for (const n of m.tree) {
    const b = pos.get(n.id)!;
    // Without prerequisites, a branch still reads as a line: link each node to the one before it.
    const prev = m.tree.filter((x) => x.branch === n.branch && x.col === n.col - 1).map((x) => x.id);
    for (const need of n.needs.length ? n.needs : prev) {
      const a = pos.get(need);
      if (!a) continue;
      const from = m.tree.find((x) => x.id === need)!;
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const x1 = a.x + g.node, y1 = a.y + half, x2 = b.x, y2 = b.y + half, mx = Math.round((x1 + x2) / 2) + 0.5;
      p.setAttribute("d", y1 === y2 ? `M${x1} ${y1 + 0.5}H${x2}` : `M${x1} ${y1 + 0.5}H${mx}V${y2 + 0.5}H${x2}`);
      p.setAttribute("class", from.state === "bought" ? (n.state === "bought" ? "done" : "lit") : "");
      svg.append(p);
    }
  }
  const box = h("div.graph", { style: { width: `${W}px`, height: `${H}px` } }, svg);
  rows.forEach((b, r) => box.append(h("div.branch", { style: { top: `${r * (g.node + g.gy)}px`, height: `${g.node}px`, width: `${g.left - 8}px` } }, BRANCH_NAME[b])));
  for (const n of m.tree) { const p = pos.get(n.id)!; box.append(nodeEl(c, n, p.x, p.y, g.node)); }
  return h("div.graphwrap.scroll", box);
}

function detail(m: UiModel, id?: string): HTMLElement {
  const n = m.tree.find((x) => `node:${x.id}` === id);
  const box = h("div.ndetail");
  if (!n) return box;
  const big = innerHeight >= 700;
  const art = h(`div.nart.${n.state}`, icon(n.module ? moduleIcon(n.module) : n.branch, big ? 7 : 4));
  const state = n.state === "bought" ? h("span.good", "Researched") : n.state === "locked" ? h("span.q", "Locked") : priceEl(n.cost, m.data, "data");
  box.append(art, h("div.nt", n.name), h("div.nb.q", BRANCH_NAME[n.branch]), h("div.nc", state), h("div.nx", n.text));
  if (n.module) box.append(h("div.nm", icon(moduleIcon(n.module), 1), " Adds a module"));
  const needs = h("div.nn", h("div.nh.q", "Needs"));
  for (const x of n.needs) {
    const d = m.tree.find((y) => y.id === x);
    needs.append(h(`div.need${d?.state === "bought" ? ".met" : ""}`, icon(d?.state === "bought" ? "check" : "lock", 1), d?.name ?? x));
  }
  if (n.state === "locked" && n.why) needs.append(h("div.need", icon("lock", 1), n.why.replace(/\.$/, "")));
  if (n.state !== "bought" && n.cost > 0) needs.append(h(`div.need${m.data >= n.cost ? ".met" : ""}`, icon(m.data >= n.cost ? "check" : "data", 1), `${num(n.cost)} data`));
  if (needs.childElementCount > 1) box.append(needs);
  return box;
}

export const lab: ScreenDef = {
  id: "lab",
  title: "Lab",
  icon: "data",
  building: "lab",
  size: "wide",
  tabs: () => ["Research", "Modules"],
  render(c, tab) {
    const m = c.m, L = m.lab;
    if (tab === 1) return h("div.mods", h("div.mh.q", "Unlock a module with data, then fit it at the workshop."), h("div.cards.scroll", m.modules.cards.map((x) => moduleCard(c, x, "lab"))));
    const can = L.open && L.cost !== null && m.cash >= L.cost;
    const labRow = c.f(h(`div.labrow${can ? "" : ".dis"}`, icon("data", 2),
      h("span", h("span.b", "Sefa's bench"), h("span.q.n", L.level ? `  level ${L.level} · ${num(L.rate)} data a minute` : "  makes data while you dig")),
      h("span.buy", L.open ? priceEl(L.cost, m.cash) : h("span.price.max", L.why ?? "Locked"))), "lab", () => m.buyLab());
    return h("div.labwrap", labRow, h("div.labmain", graph(c), h("div.side")));
  },
  select(el, c) {
    const side = el?.closest(".scr")?.querySelector(".labmain > .side");
    if (side) { side.textContent = ""; side.append(el?.dataset.f === "lab" ? h("div.ndetail", h("div.nt", "Sefa's bench"), h("div.nx", `Each level makes data while you dig, and half as much while you are away.`), h("div.nc", c.m.lab.cost === null ? h("span.q", "Max") : priceEl(c.m.lab.cost, c.m.cash))) : detail(c.m, el?.dataset.f)); }
  },
  hints: (t, sel) => (t === 1 ? ["←→↑↓ Choose", "Enter Unlock", "⌫ Close"] : ["←→↑↓ Choose", sel?.dataset.f === "lab" ? "Enter Build" : "Enter Research", "PgDn Modules", "⌫ Close"]),
};

export { cash };
