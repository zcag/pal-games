// The road trip's map, the game's home (DESIGN.md, "The road trip"): the
// signs over the world seen from above (mapworld.ts draws it on the page's
// canvas): the region top-left, the stars top-right, the stop's card on the
// right, and a pin over each stop on the road, moved every frame to where the
// world says it is. It is its own layer over the page with its own stylesheet;
// the page owns the keys and calls showMap on every change, which updates in
// place and animates: new stars pop, the card swaps, a region's world is held
// as a still while the next is built and cross-faded into.
import { clock } from "../game/sprint.ts";

export type Stop = {
  id: string; name: string; about: string; facts: string;   // facts e.g. "3 lanes · 2.1 km · busy"
  boss?: { rival: string; car: string; time: number };      // a duel: the rival, the car you win, the time to beat (s)
  legend?: { paint: string; name: string; got: boolean };    // a Legend: the paint its first finish gives, and whether you have it
  stars: number; best?: number; times: number[];            // stars earned 0..3, your best (s), the three star times (s)
  closed: string | null;                                    // why it is closed, or null
};
export type Region = { name: string; about: string; open: boolean; why?: string; stars: number; max: number; duelAt: number; next?: string }; // next: the car its stars open next, "Kiri '10 at 8 ★"
export type MapView = { region: number; regions: Region[]; stops: Stop[]; selected: string; stars: number; car: string };

const STAR = `<svg viewBox="0 0 24 24"><path d="M12 1.8l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.3 5.6 21l1.6-7.1L1.8 9.1l7.2-.7z"/></svg>`;
const LOCK = `<svg viewBox="0 0 24 24"><path d="M7 10V7.5a5 5 0 0 1 10 0V10h1.2c.7 0 1.3.6 1.3 1.3v8.4c0 .7-.6 1.3-1.3 1.3H5.8c-.7 0-1.3-.6-1.3-1.3v-8.4c0-.7.6-1.3 1.3-1.3zm2.4 0h5.2V7.5a2.6 2.6 0 0 0-5.2 0z"/></svg>`;
const CROWN = `<svg viewBox="0 0 24 24"><path d="M3 7.5l4.6 3.6L12 4l4.4 7.1L21 7.5l-1.8 10H4.8zM5 19.2h14V21H5z"/></svg>`;
const FLAG = `<svg viewBox="0 0 24 24"><path d="M5 2.5h1.8v19H5z"/><path d="M7.5 3.5h12.5v10H7.5z" fill="#fff"/><path d="M7.5 3.5h3.1v2.5H7.5zm6.2 0h3.1v2.5h-3.1zm-3.1 2.5h3.1v2.5h-3.1zm6.2 0H20v2.5h-3.2zM7.5 8.5h3.1V11H7.5zm6.2 0h3.1V11h-3.1zm-3.1 2.5h3.1v2.5h-3.1zm6.2 0H20v2.5h-3.2z" fill="#16181c"/></svg>`;
const CAR = `<svg viewBox="0 0 24 24"><path d="M5.2 10.2 7 5.8A2 2 0 0 1 8.9 4.5h6.2A2 2 0 0 1 17 5.8l1.8 4.4A2.6 2.6 0 0 1 20.5 12.6v4.2c0 .5-.4.9-.9.9h-1.1v1.4a1.2 1.2 0 0 1-2.4 0v-1.4H7.9v1.4a1.2 1.2 0 0 1-2.4 0v-1.4H4.4a.9.9 0 0 1-.9-.9v-4.2a2.6 2.6 0 0 1 1.7-2.4zm2.2-.3h9.2l-1.3-3.3a.7.7 0 0 0-.7-.5H9.4a.7.7 0 0 0-.7.5zM7 15a1.4 1.4 0 1 0 0-2.8A1.4 1.4 0 0 0 7 15zm10 0a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z"/></svg>`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
/** Words with a dot between, each kept whole on a line. */
const dotted = (parts: string[]) => parts.map((p) => `<span>${p.trim()}</span>`).join(` <i class="sep"></i> `);
const el = (tag: string, cls: string, html = "") => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; };

let root: HTMLElement | null = null, view: MapView | null = null;
let head: HTMLElement, purse: HTMLElement, card: HTMLElement, stops: HTMLElement, plate: HTMLElement, still: HTMLCanvasElement, tag: HTMLElement;
let pickCb: (id: string) => void = () => {}, regionCb: (r: number) => void = () => {};
let cardFor = "", headFor = -1, pinsFor = "", prevStars = new Map<string, number>();

export const onPick = (cb: (id: string) => void) => { pickCb = cb; };
export const onRegion = (cb: (region: number) => void) => { regionCb = cb; };

function build() {
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = new URL("./trip.css", import.meta.url).href;
  link.onload = () => { framed = null; }; // measured again with the card styled
  document.head.append(link);
  root = el("div", "trip-map gone");
  root.innerHTML = `<canvas class="still"></canvas><div class="tint"></div><div class="shade"></div><div class="stops"></div><div class="shut"></div>
    <div class="region sign"></div><div class="purse"></div><div class="card-slot"></div>
    <div class="hints"><button data-key="arrowright"><kbd>←→</kbd> stops</button><button data-key="arrowdown"><kbd>↑↓</kbd> regions</button><button data-key="enter"><kbd>enter</kbd> drive</button><button data-key="g"><kbd>g</kbd> garage</button><button data-key="f"><kbd>f</kbd> free drive</button></div>`;
  document.body.append(root);
  head = root.querySelector(".region")!; purse = root.querySelector(".purse")!; card = root.querySelector(".card-slot")!;
  stops = root.querySelector(".stops")!; plate = root.querySelector(".shut")!; still = root.querySelector(".still")!;
  tag = el("div", "tag", `${CAR}<b></b>`);
  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const stop = t.closest<HTMLElement>("[data-stop]");
    if (stop) { e.stopPropagation(); pickCb(stop.dataset.stop!); return; }
    const step = t.closest<HTMLElement>("[data-step]");
    if (step) { e.stopPropagation(); regionCb(Math.max(0, Math.min((view?.regions.length ?? 1) - 1, view!.region + +step.dataset.step!))); }
  });
}

/** Where the picked stop is framed, as fractions of the page: the middle of the room left of the card, a little low
 *  (measured when the card or the page's size changes, not every frame). */
let framed: { x: number; y: number } | null = null;
export function framing() {
  if (framed) return framed;
  if (!root) return { x: 0.4, y: 0.64 };
  const W = innerWidth, fs = parseFloat(getComputedStyle(root).fontSize) || 13;
  const open = !!view?.regions[view.region]?.open;
  const right = open ? (card.firstElementChild as HTMLElement | null)?.offsetWidth ?? fs * 16.2 : 0;
  return (framed = { x: (W - right - fs * 1.2) / 2 / W, y: 0.64 });
}
addEventListener("resize", () => { framed = null; });

/** The pins over the world: each stop's place on the page this frame (from mapworld.ts), or null to hide them all
 *  (the world being built). Nearer pins draw larger and over farther ones. */
export function pinsAt(at: ({ x: number; y: number; depth: number } | null)[] | null) {
  if (!root) return;
  stops.classList.toggle("off", !at);
  if (!at) return;
  const pins = stops.querySelectorAll<HTMLElement>("[data-stop]");
  const k = view ? view.stops.findIndex((s) => s.id === view!.selected) : -1, ref = at[k]?.depth ?? at.find((p) => p)?.depth ?? 80;
  pins.forEach((b, i) => {
    const p = at[i];
    if (!p) { b.style.visibility = "hidden"; return; }
    b.style.visibility = "";
    const s = Math.max(0.55, Math.min(1.08, ref / p.depth));
    b.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
    b.style.zIndex = String(1000 - Math.round(p.depth));
  });
}

/** Hold the picture: the canvas as it is now (right after a frame was drawn), else a dark page, over the world while
 *  it changes; `reveal` cross-fades it away. */
export function hold(canvas?: HTMLCanvasElement) {
  if (!root) build();
  if (canvas) {
    still.width = canvas.width; still.height = canvas.height;
    still.getContext("2d")!.drawImage(canvas, 0, 0);
  } else { still.width = still.height = 1; }
  root!.classList.toggle("dark", !canvas);
  still.classList.remove("going"); still.classList.add("on");
  pinsAt(null);
}
export function reveal() {
  if (!root || !still.classList.contains("on")) return;
  still.classList.add("going"); still.classList.remove("on");
  root.classList.remove("dark");
}

function badge(s: Stop, k: number) {
  const won = !!s.boss && s.best !== undefined && s.best < s.boss.time;
  const cls = ["stop", s.boss ? "duel" : "", s.legend ? "duel legend" : "", s.closed ? "closed" : s.best !== undefined ? "played" : "fresh", s.stars === 3 || won ? "gold" : ""];
  const face = s.closed ? LOCK : s.boss ? (won ? FLAG : `<b>${esc(s.boss.rival)}</b>`) : s.legend ? CROWN : `<b>${k + 1}</b>`;
  const before = prevStars.get(s.id) ?? s.stars;
  const stars = [0, 1, 2].map((n) => `<i class="${n < s.stars ? "f" : ""}${n >= before && n < s.stars ? " new" : ""}" style="--n:${n}">${STAR}</i>`).join("");
  return { cls: cls.filter(Boolean).join(" "), html: `<i class="foot"></i><i class="stem"></i><span class="head"><span class="disc">${face}</span><span class="st">${stars}</span></span>` };
}

function drawStops(v: MapView) {
  const ids = v.stops.map((s) => s.id).join();
  if (ids !== pinsFor) {
    stops.innerHTML = ""; pinsFor = ids;
    v.stops.forEach((s, k) => { const b = el("button", "pin"); b.dataset.stop = s.id; b.style.setProperty("--k", String(k)); b.style.visibility = "hidden"; stops.append(b); });
  }
  stops.querySelectorAll<HTMLElement>("[data-stop]").forEach((b, k) => {
    const s = v.stops[k], { cls, html } = badge(s, k);
    const want = `pin ${cls}${s.id === v.selected ? " sel" : ""}`;
    if (b.className !== want) b.className = want;
    if (b.dataset.html !== html) { b.innerHTML = html; b.dataset.html = html; }
    b.title = s.name;
  });
  // the picked one carries its name, over the pin
  const k = v.stops.findIndex((s) => s.id === v.selected), sel = stops.querySelectorAll<HTMLElement>("[data-stop]")[k];
  if (sel && v.regions[v.region].open) { tag.querySelector("b")!.textContent = v.stops[k].name; if (tag.parentElement !== sel) sel.append(tag); }
  else tag.remove();
}

function drawHead(v: MapView) {
  const R = v.regions[v.region], duel = v.stops.find((s) => s.boss);
  const pips = v.regions.map((r, i) => `<i class="${i === v.region ? "on" : r.open ? "open" : ""}"></i>`).join("");
  const need = (R.open && duel?.closed ? `<div class="need">${LOCK}<span>The duel opens at ${R.duelAt} ★</span></div>` : "")
    + (R.open && R.next ? `<div class="need next">${CAR}<span>${esc(R.next)}</span></div>` : "");
  head.innerHTML = `<div class="nav"><button data-step="-1" ${v.region === 0 ? "disabled" : ""}>‹</button><span class="dots">${pips}</span><button data-step="1" ${v.region === v.regions.length - 1 ? "disabled" : ""}>›</button></div>
    <h1>${esc(R.name)}</h1><div class="count">${R.open ? `<b>${R.stars}</b> / ${R.max} <span class="s">★</span>` : `<span class="blurb">${esc(R.about)}</span>`}</div>${need}`;
  if (headFor !== v.region) { head.classList.remove("in"); void head.offsetWidth; head.classList.add("in"); headFor = v.region; }
}

function drawPurse(v: MapView) {
  purse.innerHTML = `<span class="tally">${STAR}<b>${v.stars}</b></span>`;
}

function drawCard(v: MapView) {
  const R = v.regions[v.region], k = v.stops.findIndex((x) => x.id === v.selected), s = v.stops[k];
  if (!R.open || !s) { card.innerHTML = ""; cardFor = ""; return; }
  const times = s.times.map((t, n) => `<div class="${n < s.stars ? "got" : ""}"><span>${"★".repeat(n + 1)}</span><b>${clock(t)}</b></div>`).join("");
  const best = s.best !== undefined ? `Your best <b>${clock(s.best)}</b>` : `Not driven yet`;
  const body = s.boss
    ? `<div class="duelbox"><div><span>Rival</span><b>${esc(s.boss.rival)}</b></div><div><span>Time to beat</span><b>${clock(s.boss.time)}</b></div><div><span>Win</span><b>${esc(s.boss.car)}</b></div></div>`
    : `<div class="times">${times}</div>` + (s.legend ? `<div class="legendpaint"><i style="background:${s.legend.paint}"></i><span>${s.legend.got ? "Yours:" : "Finish it for"} <b>${esc(s.legend.name)}</b>, a paint for every car</span></div>` : "");
  const foot = s.closed ? `<div class="why">${LOCK}<span>${esc(s.closed)}</span></div>`
    : `<button class="go" data-key="enter"><kbd>enter</kbd><span>${s.boss ? "Race" : "Drive"}</span></button>`;
  card.innerHTML = `<div class="sign card${s.boss ? " is-duel" : ""}${s.closed ? " is-closed" : ""}">
    <div class="eyebrow">${dotted([s.boss ? "The duel" : s.legend ? "The Legend" : `Stop ${k + 1} of ${v.stops.filter((x) => !x.boss && !x.legend).length}`, esc(R.name)])}</div>
    <div class="title"><h2>${esc(s.name)}</h2><span class="st">${[0, 1, 2].map((n) => `<i class="${n < s.stars ? "f" : ""}">${STAR}</i>`).join("")}</span></div>
    <p class="blurb">${esc(s.about)}</p>
    <div class="spec">${dotted(esc(s.facts).split("·"))}</div>
    <div class="you"><span>${CAR}Your car <b>${esc(v.car)}</b></span><span class="mine">${best}</span></div>
    ${body}
    ${foot}</div>`;
  if (cardFor !== s.id) { const c = card.firstElementChild!; c.classList.add(cardFor ? "swap" : "rise"); cardFor = s.id; }
}

export function showMap(v: MapView) {
  if (!root) build();
  view = v;
  const R = v.regions[v.region];
  plate.innerHTML = R.open ? "" : `<div class="sign">${LOCK}<b>${esc(R.name)}</b><span>${esc(R.why ?? "Not open yet")}</span></div>`;
  root!.classList.toggle("closed-region", !R.open);
  drawHead(v); drawPurse(v); drawCard(v); drawStops(v);
  framed = null;
  root!.classList.remove("gone"); root!.hidden = false;
  prevStars = new Map(v.stops.map((s) => [s.id, s.stars]));
}

export function hideMap() {
  if (!root) return;
  root.classList.add("gone");
}
