// The run map (R31, art 7.10): the whole act at once, a carved slab on the walnut table.
// Floors run left to right; tokens per node kind; inked paths; the blue pin; the boss at the end.
import type { MapNode, RunState } from "../../../game/types.ts";
import { reachable, nodeLabel } from "../../../game/run/index.ts";
import { ACTS, AFFIXES, BOSSES, BOUNTIES, NODES, enemy } from "../content.ts";
import { h, raw, sfx, kbd, clamp } from "../dom.ts";
import { enemyGlyph, icon, nodeGlyph } from "../icons.ts";
import type { Ctx, Screen } from "../index.ts";
import { tip, type TipSpec } from "../tooltip.ts";
import { runBand } from "./common.ts";
import { note } from "./notes.ts";
import { TERRAIN_DEFS, bezierPoints, fog, ground, props, trailPath } from "./terrain.ts";
import { warTable } from "./wartable.ts";

const SVGNS = "http://www.w3.org/2000/svg";

export function mapScreen(ctx: Ctx, run: RunState): Screen {
  const M = run.map;
  const act = run.act;
  const A = ACTS[act];
  const floors = Math.max(...M.nodes.map((n) => n.floor));
  const byId = new Map(M.nodes.map((n) => [n.id, n]));
  const cur = run.at >= 0 ? byId.get(run.at) ?? null : null;
  const reach: MapNode[] = (run.book ? reachable(run) : cur ? cur.next : M.nodes.filter((n) => n.floor === 1).map((n) => n.id)).map((i) => byId.get(i)!).filter(Boolean);
  reach.sort((a, b) => a.lane - b.lane);
  // Everything still ahead of you.
  const ahead = new Set<number>();
  const walk = (n: MapNode) => { for (const i of n.next) if (!ahead.has(i)) { ahead.add(i); walk(byId.get(i)!); } };
  for (const n of reach) { ahead.add(n.id); walk(n); }
  const visited = new Set(M.nodes.filter((n) => n.visited).map((n) => n.id));
  if (cur) visited.add(cur.id);
  const histIds = run.history.filter((x) => x.act === act).map((x) => x.node);
  const takenEdge = new Set<string>();
  for (let i = 1; i < histIds.length; i++) takenEdge.add(`${histIds[i - 1]}>${histIds[i]}`);

  const slab = h(`div.slab.act${act}`);
  const svg = document.createElementNS(SVGNS, "svg");
  svg.classList.add("edges");
  svg.innerHTML = TERRAIN_DEFS;
  const groundG = document.createElementNS(SVGNS, "g");
  const trails = document.createElementNS(SVGNS, "g");
  const propsG = document.createElementNS(SVGNS, "g");
  const fogG = document.createElementNS(SVGNS, "g");
  const lines = document.createElementNS(SVGNS, "g");
  svg.append(groundG, trails, propsG, fogG, lines);
  const pin = h("div.pin", raw(`<svg viewBox="0 0 24 34" width="20" height="28"><path d="M5 33V4" stroke="#2a2018" stroke-width="2.2" stroke-linecap="round"/><path d="M5 4h14l-3.5 5 3.5 5H5z" fill="#3F78D6" stroke="#1c2a48" stroke-width="1.2"/><circle cx="5" cy="3.4" r="2.6" fill="#E3B655" stroke="#6a4a18" stroke-width="1"/></svg>`));
  const shadow = h("div.pinshadow");
  slab.append(svg, shadow, pin);
  const corner = (c: string) => h(`span.fit.${c}`);
  slab.append(corner("tl"), corner("tr"), corner("bl"), corner("br"));

  const tokens = new Map<number, HTMLElement>();
  let busy = false;
  for (const n of M.nodes) {
    const isBoss = n.kind === "boss";
    const k = n.info?.revealed ?? n.kind;
    const isReach = reach.includes(n);
    const state = visited.has(n.id) ? "done" : isReach ? "reach" : ahead.has(n.id) ? "ahead" : "closed";
    const el = h(`button.tok.k-${k}.${state}${isBoss ? ".boss" : ""}${n.id === cur?.id ? ".here" : ""}`, {
      style: { "--rim": isBoss ? A.key : NODES[k].rim },
      tabindex: isReach ? "0" : "-1",
      class: isReach ? "" : "nonav",
      onclick: () => go(n),
    },
      h("span.tf", raw(icon(state === "done" && !isBoss ? "check" : nodeGlyph(k), { size: isBoss ? 30 : 17, accent: isBoss ? A.key : NODES[k].rim }))),
      n.info?.elite ? h("span.tb", raw(icon(enemyGlyph(n.info.elite), { size: 10, accent: "#FF9A5A" }))) : null,
    );
    if (isReach) el.dataset.nav = "";
    el.addEventListener("pointerenter", () => { if (isReach) sfx("hover"); });
    tip(el, () => nodeTip(n, run));
    tokens.set(n.id, el);
    slab.append(el);
  }

  const bossId = M.boss;
  const B = BOSSES[bossId];
  const [m1, m2] = B.tip.split(/(?<=\.)\s+/);
  const bossPanel = h("div.bosspanel.pn.deep",
    h("div.bp-port", { style: { "--k": A.key } }, raw(icon("boss", { size: 40, accent: A.key }))),
    h("div.bp-n.cz", B.name),
    h("div.bp-m", raw(icon("wave", { size: 11 })), h("span", m1)),
    m2 ? h("div.bp-m", raw(icon("wave", { size: 11 })), h("span", m2)) : null,
    h("div.bp-f.sm", "Waits at the end of the act."));
  tip(bossPanel, { title: B.name, glyph: icon("boss", { size: 16, accent: A.key }), line: B.tip, meta: "Costs 10 lives if it gets through. It comes round again until it falls." });

  const legend = h("div.mlegend.sm", kbd("←"), kbd("→"), " choose  ", kbd("Enter"), " go  ", kbd("Z"), " zoom  ", kbd("V"), " war table");
  const body = h("div.tbody.map-body", h("div.slabwrap", slab, bossPanel), legend);
  const el = h("div.map-scr.table", runBand(ctx, run), body);

  // ---------------------------------------------------------------- layout (px from the slab's size)
  const pos = new Map<number, { x: number; y: number }>();
  let zoom = false;
  const layout = () => {
    const W = slab.clientWidth, H = slab.clientHeight;
    if (!W || !H) return;
    const padX = Math.min(46, W * 0.07), padY = Math.min(34, H * 0.11);
    const panelW = bossPanel.offsetWidth + 18;
    const cols = floors;
    const colW = (W - padX - panelW - 34) / Math.max(1, cols - 1);
    const lanes = 4;
    const rowH = (H - padY * 2) / (lanes - 1);
    for (const n of M.nodes) {
      const isBoss = n.kind === "boss";
      const jitter = ((n.id * 37) % 11) / 11 - 0.5;
      const x = padX + (n.floor - 1) * colW + (isBoss ? 0 : jitter * colW * 0.12);
      const y = isBoss ? H / 2 : padY + n.lane * rowH + jitter * rowH * 0.1;
      pos.set(n.id, { x, y });
      const t = tokens.get(n.id)!;
      t.style.left = `${x}px`; t.style.top = `${y}px`;
    }
    svg.setAttribute("width", String(W)); svg.setAttribute("height", String(H));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    drawEdges(); drawTerrain(W, H, padX, colW);
    placePin(cur ? pos.get(cur.id)! : { x: padX * 0.35, y: reach.length ? (reach.reduce((s, n) => s + pos.get(n.id)!.y, 0) / reach.length) : H / 2 });
  };
  const trailPts: { x: number; y: number }[][] = [];
  const drawEdges = () => {
    lines.replaceChildren(); trails.replaceChildren(); trailPts.length = 0;
    for (const n of M.nodes) for (const j of n.next) {
      const a = pos.get(n.id)!, b = pos.get(j)!;
      const p = document.createElementNS(SVGNS, "path");
      const d = trailPath(a, b);
      p.setAttribute("d", d);
      trailPts.push(bezierPoints(a, b));
      const taken = takenEdge.has(`${n.id}>${j}`);
      const open = (cur ? n.id === cur.id : false) && ahead.has(j);
      const fwd = ahead.has(j) && (ahead.has(n.id) || n.id === cur?.id);
      const cls = taken ? "taken" : open ? "open" : fwd ? "ahead" : "closed";
      for (const t of ["tr-edge", "tr-road"]) { const q = document.createElementNS(SVGNS, "path"); q.setAttribute("d", d); q.setAttribute("class", `${t} ${cls}`); trails.append(q); }
      p.setAttribute("class", `e ${cls}`);
      lines.append(p);
      if (open) { const g = p.cloneNode() as SVGPathElement; g.setAttribute("class", "e glow"); lines.insertBefore(g, p); }
    }
    if (!cur) for (const n of reach) {
      const b = pos.get(n.id)!;
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", `M${4},${b.y} L${b.x - 14},${b.y}`);
      p.setAttribute("class", "e open");
      lines.append(p);
    }
  };
  const drawTerrain = (W: number, H: number, padX: number, colW: number) => {
    const reachFloor = reach.length ? Math.max(...reach.map((n) => n.floor)) : floors;
    const fogFrom = reachFloor + 1 < floors ? padX + (reachFloor - 0.5) * colW + colW * 0.5 : null;
    const tin = { act, W, H, seed: run.seed, nodes: [...pos.values()], trails: trailPts, fogFrom };
    groundG.innerHTML = ground(tin);
    propsG.innerHTML = props(tin);
    fogG.innerHTML = fog(tin);
    for (const n of M.nodes) tokens.get(n.id)!.classList.toggle("fog", n.kind !== "boss" && n.floor > reachFloor + 1 && !visited.has(n.id));
  };
  const placePin = (p: { x: number; y: number }) => {
    pin.style.left = `${p.x}px`; pin.style.top = `${p.y}px`;
    shadow.style.left = `${p.x}px`; shadow.style.top = `${p.y}px`;
  };
  const ro = new ResizeObserver(() => layout());
  ro.observe(slab);
  requestAnimationFrame(layout);

  // ---------------------------------------------------------------- choose
  function go(n: MapNode) {
    if (busy) return;
    if (!reach.includes(n)) { sfx("deny"); return; }
    busy = true;
    sfx("map_step");
    const a = cur ? pos.get(cur.id)! : { x: parseFloat(pin.style.left), y: parseFloat(pin.style.top) };
    const b = pos.get(n.id)!;
    const t0 = performance.now(), dur = 600;
    tokens.get(n.id)!.classList.add("chosen");
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
      const hop = Math.abs(Math.sin(k * Math.PI * 2)) * 14 * (1 - k * 0.3);
      pin.style.left = `${x}px`; pin.style.top = `${y - hop}px`;
      shadow.style.left = `${x}px`; shadow.style.top = `${y}px`;
      shadow.style.transform = `translate(-50%, -50%) scale(${1 - hop / 30})`;
      if (k < 1) requestAnimationFrame(step);
      else { sfx("click"); setTimeout(() => ctx.host.choose(`node:${n.id}`), 120); }
    };
    requestAnimationFrame(step);
  }

  let sel = 0;
  const focusReach = (i: number) => {
    if (!reach.length) return;
    sel = (i + reach.length) % reach.length;
    const t = tokens.get(reach[sel].id)!;
    t.focus();
    sfx("hover");
  };
  const setZoom = (z: boolean) => {
    zoom = z;
    const p = reach.length ? pos.get(reach[sel].id)! : { x: slab.clientWidth / 2, y: slab.clientHeight / 2 };
    slab.style.transformOrigin = `${p.x}px ${p.y}px`;
    slab.classList.toggle("zoom", z);
    sfx("page");
  };

  // A low strip at the bottom right, over the key row: the boss portrait holds the right side.
  const low = { right: "10px", bottom: "3px" };
  // One note at a time: the elite one waits for a later visit.
  if (!note(ctx, "map", "Pick a path. The skull at the end is the boss.", body, low, true) && reach.some((n) => n.kind === "elite")) note(ctx, "elite-node", "Elites are hard fights that pay a relic. The icon shows which champion waits there.", body, low, true);

  return {
    el, noAutoFocus: true,
    key(e) {
      const k = e.key;
      if (k === "ArrowUp" || k === "ArrowLeft") { focusReach(sel - 1); return true; }
      if (k === "ArrowDown" || k === "ArrowRight") { focusReach(sel + 1); return true; }
      if (/^[1-4]$/.test(k) && reach[+k - 1]) { focusReach(+k - 1); go(reach[+k - 1]); return true; }
      if (k === "Enter") { const a = document.activeElement as HTMLElement; const n = reach.find((x) => tokens.get(x.id) === a) ?? reach[sel]; if (n) go(n); return true; }
      if (k === "z" || k === "Z") { setZoom(!zoom); return true; }
      if (k === "v" || k === "V") { sfx("open"); warTable(ctx, run); return true; }
      if (k === "Backspace") { ctx.show({ s: "settings" }); return true; }
      return false;
    },
    frame() {
      if (!busy && !el.contains(document.activeElement) && !document.querySelector(".ovl") && reach.length) focusReach(clamp(sel, 0, reach.length - 1));
    },
    destroy() { ro.disconnect(); },
  };
}

function nodeTip(n: MapNode, run: RunState): TipSpec {
  const k = n.kind === "event" && n.info?.revealed && !n.visited ? n.info.revealed : n.kind;
  const N = NODES[k];
  if (k === "boss") { const B = BOSSES[n.info?.boss ?? run.map.boss]; return { title: nodeLabel(n.kind, n.info), glyph: icon("boss", { size: 16, accent: ACTS[run.act].key }), line: B.tip, meta: "The act's end. Costs 10 lives if it gets through." }; }
  const rows: HTMLElement[] = [];
  const roles = n.info?.roles ?? [];
  if (roles.length) rows.push(...roles.slice(0, 6).map((r) => h("span.stat", raw(icon(enemyGlyph(r), { size: 13 })), h("span.sm", enemy(r).name))));
  let line = N.tip;
  if (n.info?.elite) line = `${n.kind === "elite" ? "" : "An elite waits on the last wave. "}<b>${enemy(n.info.elite).name}</b>: ${enemy(n.info.elite).line}${n.info.affixes?.length ? ` <span class="c-bad">${n.info.affixes.map((a) => AFFIXES[a]?.name ?? a).join(", ")}.</span>` : ""}${n.kind === "elite" ? " A relic if it falls." : ""}`;
  if (n.info?.bounty) { const B = BOUNTIES[n.info.bounty]; line = `Goal: <b>${B?.name ?? n.info.bounty}</b>. ${B?.line ?? ""} Meet it for a second reward.`; }
  return {
    title: n.info?.name ?? (n.info?.revealed ? `? (${N.name})` : N.name), glyph: icon(nodeGlyph(k), { size: 16, accent: N.rim }), line,
    rows, meta: [n.info?.theme ?? "", `Floor ${n.floor}`].filter(Boolean).join(" · "),
  };
}
