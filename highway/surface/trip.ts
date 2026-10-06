// The road trip's map, the game's home (DESIGN.md, "The road trip"): the
// region's painting edge to edge, a road winding through its nine stops, the
// stop's card on the right. It is its own layer over the page with its own
// stylesheet; the page owns the keys and calls showMap on every change, which
// updates in place and animates: regions slide sideways, the marker drives
// along the road to the stop picked, new stars pop, cash counts up.
import { clock } from "../game/sprint.ts";

export type Stop = {
  id: string; name: string; about: string; facts: string;   // facts e.g. "3 lanes · 2.1 km · busy"
  boss?: { rival: string; car: string; time: number };      // a duel: the rival, the car you win, the time to beat (s)
  stars: number; best?: number; times: number[];            // stars earned 0..3, your best (s), the three star times (s)
  pay: { finish: number; stars: number[] };                 // cash a finish pays, and what each new star pays
  closed: string | null;                                    // why it is closed, or null
};
export type Region = { name: string; about: string; art: string; open: boolean; why?: string; stars: number; max: number; duelAt: number };
export type MapView = { region: number; regions: Region[]; stops: Stop[]; selected: string; cash: number; stars: number; car: string };

/** Each region's road, a wave across the map: where each stop sits between the top (-1) and the bottom (1). */
const WAVES = [
  [0.55, -0.15, -0.75, -0.35, 0.4, 0.8, 0.25, -0.5, -0.05],
  [-0.6, 0.05, 0.7, 0.45, -0.3, -0.8, -0.2, 0.55, 0.1],
  [0.7, 0.7, 0.0, -0.7, -0.55, 0.15, 0.75, 0.3, -0.3],
  [-0.15, -0.8, -0.35, 0.45, 0.8, 0.1, -0.6, -0.45, 0.25],
  [0.75, 0.2, -0.55, -0.75, 0.0, 0.6, 0.7, -0.1, -0.45],
];
const SVG = "http://www.w3.org/2000/svg";
const STAR = `<svg viewBox="0 0 24 24"><path d="M12 1.8l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.3 5.6 21l1.6-7.1L1.8 9.1l7.2-.7z"/></svg>`;
const LOCK = `<svg viewBox="0 0 24 24"><path d="M7 10V7.5a5 5 0 0 1 10 0V10h1.2c.7 0 1.3.6 1.3 1.3v8.4c0 .7-.6 1.3-1.3 1.3H5.8c-.7 0-1.3-.6-1.3-1.3v-8.4c0-.7.6-1.3 1.3-1.3zm2.4 0h5.2V7.5a2.6 2.6 0 0 0-5.2 0z"/></svg>`;
const FLAG = `<svg viewBox="0 0 24 24"><path d="M5 2.5h1.8v19H5z"/><path d="M7.5 3.5h12.5v10H7.5z" fill="#fff"/><path d="M7.5 3.5h3.1v2.5H7.5zm6.2 0h3.1v2.5h-3.1zm-3.1 2.5h3.1v2.5h-3.1zm6.2 0H20v2.5h-3.2zM7.5 8.5h3.1V11H7.5zm6.2 0h3.1V11h-3.1zm-3.1 2.5h3.1v2.5h-3.1zm6.2 0H20v2.5h-3.2z" fill="#16181c"/></svg>`;
const CAR = `<svg viewBox="0 0 24 24"><path d="M5.2 10.2 7 5.8A2 2 0 0 1 8.9 4.5h6.2A2 2 0 0 1 17 5.8l1.8 4.4A2.6 2.6 0 0 1 20.5 12.6v4.2c0 .5-.4.9-.9.9h-1.1v1.4a1.2 1.2 0 0 1-2.4 0v-1.4H7.9v1.4a1.2 1.2 0 0 1-2.4 0v-1.4H4.4a.9.9 0 0 1-.9-.9v-4.2a2.6 2.6 0 0 1 1.7-2.4zm2.2-.3h9.2l-1.3-3.3a.7.7 0 0 0-.7-.5H9.4a.7.7 0 0 0-.7.5zM7 15a1.4 1.4 0 1 0 0-2.8A1.4 1.4 0 0 0 7 15zm10 0a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z"/></svg>`;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
/** Words with a dot between, each kept whole on a line. */
const dotted = (parts: string[]) => parts.map((p) => `<span>${p.trim()}</span>`).join(` <i class="sep"></i> `);
const el = (tag: string, cls: string, html = "") => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; };

type Layer = { el: HTMLElement; art: HTMLElement; svg: SVGSVGElement; road: SVGPathElement[]; stops: HTMLElement; plate: HTMLElement;
  pts: { x: number; y: number }[]; lens: number[]; ids: string[] };

let root: HTMLElement | null = null, layers: Layer[] = [], view: MapView | null = null;
let head: HTMLElement, purse: HTMLElement, card: HTMLElement, marker: HTMLElement;
let pickCb: (id: string) => void = () => {}, regionCb: (r: number) => void = () => {};
let shown = -1, cardFor = "", headFor = -1, prevStars = new Map<string, number>(), cashShown = 0, cashTween = 0;
let at = { region: -1, len: 0 }, drive = 0;

export const onPick = (cb: (id: string) => void) => { pickCb = cb; };
export const onRegion = (cb: (region: number) => void) => { regionCb = cb; };

function build() {
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = new URL("./trip.css", import.meta.url).href;
  document.head.append(link);
  root = el("div", "trip-map gone");
  root.innerHTML = `<div class="world"></div><div class="shade"></div><div class="region sign"></div>
    <div class="purse"></div><div class="card-slot"></div>
    <div class="hints"><button data-key="arrowright"><kbd>←→</kbd> stops</button><button data-key="arrowdown"><kbd>↑↓</kbd> regions</button><button data-key="enter"><kbd>enter</kbd> drive</button><button data-key="g"><kbd>g</kbd> garage</button><button data-key="f"><kbd>f</kbd> free drive</button></div>`;
  document.body.append(root);
  head = root.querySelector(".region")!; purse = root.querySelector(".purse")!; card = root.querySelector(".card-slot")!;
  marker = el("div", "marker", `<span class="tag">${CAR}<b></b></span>`);
  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const stop = t.closest<HTMLElement>("[data-stop]");
    if (stop) { e.stopPropagation(); pickCb(stop.dataset.stop!); return; }
    const step = t.closest<HTMLElement>("[data-step]");
    if (step) { e.stopPropagation(); regionCb(Math.max(0, Math.min((view?.regions.length ?? 1) - 1, view!.region + +step.dataset.step!))); }
  });
  window.addEventListener("resize", () => { if (view) { layout(); place(true); } });
}

function layerFor(): Layer {
  const L = el("div", "layer"), art = el("div", "art"), svg = document.createElementNS(SVG, "svg") as SVGSVGElement;
  svg.classList.add("road");
  const road = ["shadow", "edge", "tar", "dash"].map((c) => { const p = document.createElementNS(SVG, "path"); p.classList.add(c); svg.append(p); return p; });
  const stops = el("div", "stops"), plate = el("div", "shut");
  L.append(art, svg, stops, plate);
  root!.querySelector(".world")!.append(L);
  return { el: L, art, svg, road, stops, plate, pts: [], lens: [], ids: [] };
}

/** A smooth road through the points (Catmull-Rom as cubic Béziers), from the first point to the k-th. */
function roadPath(p: { x: number; y: number }[], upTo = p.length - 1) {
  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < upTo; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(p.length - 1, i + 2)];
    const f = (n: number) => n.toFixed(1);
    d += `C${f(b.x + (c.x - a.x) / 6)},${f(b.y + (c.y - a.y) / 6)} ${f(c.x - (e.x - b.x) / 6)},${f(c.y - (e.y - b.y) / 6)} ${f(c.x)},${f(c.y)}`;
  }
  return d;
}

/** Where the road and its stops go on each layer, for the page's size now. */
function layout() {
  const W = root!.clientWidth, H = root!.clientHeight, fs = parseFloat(getComputedStyle(root!).fontSize);
  const cardW = (card.firstElementChild as HTMLElement | null)?.offsetWidth ?? fs * 16;
  layers.forEach((L, r) => {
    const open = view!.regions[r]?.open;
    const x0 = fs * 3.4, x1 = W - (open ? cardW + fs * 3.4 : fs * 3), y0 = fs * 5.4, y1 = H - fs * 3.6;
    const mid = (y0 + y1) / 2, amp = (y1 - y0) / 2, wave = WAVES[r % WAVES.length];
    const hb = head.getBoundingClientRect(), under = hb.bottom + fs * 3.8; // stops below the region's sign, with room for the tag
    const stops = wave.map((v, i) => {
      const x = x0 + (x1 - x0) * (i / 8) ** 0.97, y = mid + amp * v;
      return { x, y: x < hb.right + fs * 1.5 ? Math.max(y, under) : y };
    });
    const pts = [{ x: -fs * 3, y: stops[0].y + amp * 0.4 }, ...stops, { x: W + fs * 4, y: stops[8].y - amp * 0.6 }];
    L.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const d = roadPath(pts);
    L.road.forEach((p) => p.setAttribute("d", d));
    L.pts = stops;
    L.lens = stops.map((_, k) => { L.road[0].setAttribute("d", roadPath(pts, k + 1)); return L.road[0].getTotalLength(); });
    L.road[0].setAttribute("d", d);
    L.stops.querySelectorAll<HTMLElement>("[data-stop]").forEach((b, k) => { b.style.left = `${stops[k].x}px`; b.style.top = `${stops[k].y}px`; });
  });
}

function badge(s: Stop, k: number) {
  const won = !!s.boss && s.best !== undefined && s.best < s.boss.time;
  const cls = ["stop", s.boss ? "duel" : "", s.closed ? "closed" : s.best !== undefined ? "played" : "fresh", s.stars === 3 || won ? "gold" : ""];
  const face = s.closed ? LOCK : s.boss ? (won ? FLAG : `<b>${esc(s.boss.rival)}</b>`) : `<b>${k + 1}</b>`;
  const before = prevStars.get(s.id) ?? s.stars;
  const stars = [0, 1, 2].map((n) => `<i class="${n < s.stars ? "f" : ""}${n >= before && n < s.stars ? " new" : ""}" style="--n:${n}">${STAR}</i>`).join("");
  return { cls: cls.filter(Boolean).join(" "), html: `<span class="disc">${face}</span><span class="st">${stars}</span>` };
}

function drawStops(L: Layer, v: MapView) {
  const ids = v.stops.map((s) => s.id);
  if (ids.join() !== L.ids.join()) {
    L.stops.innerHTML = ""; L.ids = ids;
    v.stops.forEach((s, k) => { const b = el("button", "stop"); b.dataset.stop = s.id; b.style.setProperty("--k", String(k)); L.stops.append(b); });
  }
  L.stops.querySelectorAll<HTMLElement>("[data-stop]").forEach((b, k) => {
    const s = v.stops[k], { cls, html } = badge(s, k);
    const want = `${cls}${s.id === v.selected ? " sel" : ""}`;
    if (b.className !== want) b.className = want;
    if (b.dataset.html !== html) { b.innerHTML = html; b.dataset.html = html; }
    b.title = s.name;
  });
}

function drawHead(v: MapView) {
  const R = v.regions[v.region], duel = v.stops.find((s) => s.boss);
  const pips = v.regions.map((r, i) => `<i class="${i === v.region ? "on" : r.open ? "open" : ""}"></i>`).join("");
  const need = R.open && duel?.closed ? `<div class="need">${LOCK}<span>The duel opens at ${R.duelAt} ★</span></div>` : "";
  head.innerHTML = `<div class="nav"><button data-step="-1" ${v.region === 0 ? "disabled" : ""}>‹</button><span class="dots">${pips}</span><button data-step="1" ${v.region === v.regions.length - 1 ? "disabled" : ""}>›</button></div>
    <h1>${esc(R.name)}</h1><div class="count">${R.open ? `<b>${R.stars}</b> / ${R.max} <span class="s">★</span>` : `<span class="blurb">${esc(R.about)}</span>`}</div>${need}`;
  if (headFor !== v.region) { head.classList.remove("in"); void head.offsetWidth; head.classList.add("in"); headFor = v.region; }
}

function drawPurse(v: MapView) {
  purse.innerHTML = `<span class="tally">${STAR}<b>${v.stars}</b></span><span class="cash">${money(cashShown)}</span>`;
  if (Math.round(cashShown) === v.cash) return;
  cancelAnimationFrame(cashTween);
  const from = cashShown, t0 = performance.now(), dur = Math.min(1400, 300 + Math.abs(v.cash - from) / 6);
  const cash = purse.querySelector(".cash")!;
  if (v.cash > from) cash.classList.add("up");
  const tick = (t: number) => {
    const a = Math.min(1, (t - t0) / dur), e = 1 - (1 - a) ** 3;
    cashShown = from + (v.cash - from) * e; cash.textContent = money(cashShown);
    if (a < 1) cashTween = requestAnimationFrame(tick); else cash.classList.remove("up");
  };
  cashTween = requestAnimationFrame(tick);
}

function drawCard(v: MapView) {
  const R = v.regions[v.region], k = v.stops.findIndex((x) => x.id === v.selected), s = v.stops[k];
  if (!R.open || !s) { card.innerHTML = ""; cardFor = ""; return; }
  const times = s.times.map((t, n) => `<div class="${n < s.stars ? "got" : ""}"><span>${"★".repeat(n + 1)}</span><b>${clock(t)}</b></div>`).join("");
  const pay = [`Finish ${money(s.pay.finish)}`, ...s.pay.stars.map((p, n) => `<b class="${n < s.stars ? "paid" : ""}">${"★".repeat(n + 1)} ${money(p)}</b>`)];
  const best = s.best !== undefined ? `Your best <b>${clock(s.best)}</b>` : `Not driven yet`;
  const body = s.boss
    ? `<div class="duelbox"><div><span>Rival</span><b>${esc(s.boss.rival)}</b></div><div><span>Time to beat</span><b>${clock(s.boss.time)}</b></div><div><span>Win</span><b>${esc(s.boss.car)}</b></div></div>`
    : `<div class="times">${times}</div>`;
  const foot = s.closed ? `<div class="why">${LOCK}<span>${esc(s.closed)}</span></div>`
    : `<button class="go" data-key="enter"><kbd>enter</kbd><span>${s.boss ? "Race" : "Drive"}</span></button>`;
  card.innerHTML = `<div class="sign card${s.boss ? " is-duel" : ""}${s.closed ? " is-closed" : ""}">
    <div class="eyebrow">${dotted([s.boss ? "The duel" : `Stop ${k + 1} of ${v.stops.length - 1}`, esc(R.name)])}</div>
    <div class="title"><h2>${esc(s.name)}</h2><span class="st">${[0, 1, 2].map((n) => `<i class="${n < s.stars ? "f" : ""}">${STAR}</i>`).join("")}</span></div>
    <p class="blurb">${esc(s.about)}</p>
    <div class="spec">${dotted(esc(s.facts).split("·"))}</div>
    <div class="you"><span>${CAR}Your car <b>${esc(v.car)}</b></span><span class="mine">${best}</span></div>
    ${body}
    <div class="pay">${dotted(pay)}</div>
    ${foot}</div>`;
  if (cardFor !== s.id) { const c = card.firstElementChild!; c.classList.add(cardFor ? "swap" : "rise"); cardFor = s.id; }
}

/** The marker over the selected stop: driven along the road to it, or set there at once. */
function place(now = false) {
  const v = view!, L = layers[v.region], k = v.stops.findIndex((s) => s.id === v.selected);
  if (!v.regions[v.region].open || k < 0 || !L.lens.length) { marker.classList.add("off"); return; }
  marker.classList.remove("off");
  if (marker.parentElement !== L.stops) { L.stops.append(marker); now = true; }
  marker.querySelector("b")!.textContent = v.stops[k].name;
  marker.classList.toggle("duel", !!v.stops[k].boss);
  const path = L.road[2], to = L.lens[k];
  const put = (len: number, lift: number) => {
    const p = path.getPointAtLength(len);
    marker.style.transform = `translate(${p.x}px, ${p.y}px)`;
    marker.style.setProperty("--lift", String(lift));
    // the tag stays on the page near its edges
    const half = tag.offsetWidth / 2, W = root!.clientWidth, pad = 6;
    marker.style.setProperty("--nudge", `${Math.max(pad + half - p.x, Math.min(0, W - pad - half - p.x))}px`);
  };
  const tag = marker.querySelector<HTMLElement>(".tag")!;
  cancelAnimationFrame(drive);
  if (now || at.region !== v.region) { at = { region: v.region, len: to }; put(to, 1); return; }
  const from = at.len, t0 = performance.now(), dur = Math.min(900, 260 + Math.abs(to - from) * 0.9);
  marker.classList.add("moving");
  const tick = (t: number) => {
    const a = Math.min(1, (t - t0) / dur), e = a < 0.5 ? 4 * a ** 3 : 1 - (-2 * a + 2) ** 3 / 2;
    at.len = from + (to - from) * e;
    put(at.len, Math.min(1, Math.abs(at.len - to) < 1 ? 1 : 0.35 + 0.65 * Math.abs(1 - 2 * a)));
    if (a < 1) drive = requestAnimationFrame(tick); else marker.classList.remove("moving");
  };
  drive = requestAnimationFrame(tick);
}

export function showMap(v: MapView) {
  if (!root) build();
  const first = !view || root!.classList.contains("gone");
  if (!view) cashShown = v.cash;
  view = v;
  while (layers.length < v.regions.length) layers.push(layerFor());
  layers.forEach((L, r) => {
    const R = v.regions[r];
    if (L.art.dataset.src !== R.art) { L.art.style.backgroundImage = `url("${R.art}")`; L.art.dataset.src = R.art; }
    L.el.classList.toggle("closed", !R.open);
    L.el.classList.toggle("here", r === v.region);
    L.el.style.setProperty("--off", String(r - v.region));
    L.plate.innerHTML = R.open ? "" : `<div class="sign">${LOCK}<b>${esc(R.name)}</b><span>${esc(R.why ?? "Not open yet")}</span></div>`;
  });
  root!.classList.toggle("closed-region", !v.regions[v.region].open);
  drawHead(v); drawPurse(v); drawCard(v);
  drawStops(layers[v.region], v);
  layout();
  if (first) { root!.classList.remove("gone"); root!.hidden = false; }
  place(first || shown !== v.region && at.region !== v.region);
  shown = v.region;
  prevStars = new Map(v.stops.map((s) => [s.id, s.stars]));
}

export function hideMap() {
  if (!root) return;
  root.classList.add("gone");
  cancelAnimationFrame(drive);
}
