// Event vignettes: a small layered SVG scene (sky, far hills, ground, a lit motif, foreground)
// in the act's palette, one motif per event family.
import type { Act } from "../../../game/types.ts";

const SKY: Record<Act, [string, string, string, string, string]> = {
  // sky top, horizon, far hills, near ground, ground shade
  1: ["#3c5a8c", "#f2c48a", "#6f8c64", "#5e7a44", "#3f5530"],
  2: ["#5a86b0", "#f7dcae", "#c9a676", "#c49a62", "#8a6a42"],
  3: ["#4a5f86", "#e8d6c8", "#a8b6c4", "#dfe6ec", "#9aa8b4"],
  4: ["#2a1a1e", "#c85a32", "#4a2a24", "#3a2622", "#1e1412"],
};

const MOTIF: Record<string, string> = {
  shrine: `<path d="M44 106V76l16-13 16 13v30z" fill="#4a4038"/><path d="M40 77l20-17 20 17" fill="none" stroke="#2e2620" stroke-width="3"/><rect x="53" y="84" width="14" height="22" fill="#1c1612"/><circle cx="60" cy="92" r="9" fill="#ffcf7a" opacity=".35"/><rect x="58.5" y="91" width="3" height="7" fill="#f2e6c8"/><path d="M60 86c1.6 2 2 3 0 5-2-2-1.6-3 0-5z" fill="#ffd36b"/>`,
  battle: `<path d="M30 106l6-24M36 82l-4 1M44 106l-2-28M42 78h-4M76 106l3-22M88 106l-5-26" stroke="#3a3430" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M52 100a7 7 0 0 1 14 0z" fill="#5a5048"/><path d="M68 104a6 6 0 0 1 12 0z" fill="#4a423c"/><path d="M96 70l4-8 4 8" fill="none" stroke="#2a2420" stroke-width="2"/><circle cx="100" cy="74" r="2" fill="#2a2420"/>`,
  cart: `<rect x="34" y="78" width="46" height="18" rx="2" fill="#6a4a30"/><path d="M34 78c6-14 40-14 46 0" fill="#d8c8a0"/><circle cx="44" cy="99" r="7" fill="none" stroke="#2e2218" stroke-width="2.5"/><circle cx="72" cy="99" r="7" fill="none" stroke="#2e2218" stroke-width="2.5"/><path d="M80 88l14 6" stroke="#4a3424" stroke-width="2.5"/><circle cx="56" cy="82" r="3" fill="#e3b655"/>`,
  well: `<ellipse cx="60" cy="90" rx="18" ry="6" fill="#5e5650"/><rect x="42" y="90" width="36" height="14" fill="#6e665e"/><ellipse cx="60" cy="90" rx="13" ry="4" fill="#1a2430"/><path d="M44 90V66M76 90V66M40 68l20-10 20 10" stroke="#4a3424" stroke-width="3" fill="none"/><path d="M60 66v14" stroke="#2a2018" stroke-width="1.2"/><rect x="56" y="78" width="8" height="6" fill="#6a4a30"/>`,
  forge: `<path d="M38 88h34c0 5 3 8 9 8v4H38c0-6-2-12 0-12z" fill="#3a3632"/><rect x="50" y="96" width="14" height="10" fill="#2a2622"/><circle cx="66" cy="80" r="10" fill="#ff8a3a" opacity=".35"/><path d="M62 72l10-12M66 74l12-4M58 74l-4-10" stroke="#ffd36b" stroke-width="1.5" stroke-linecap="round"/>`,
  sphinx: `<path d="M26 106c0-10 6-14 18-14h30l6-12c2-5 10-5 12 0l4 10v16z" fill="#c9a66e"/><path d="M84 80c0-6 3-10 6-10s6 4 6 10" fill="#b8955e"/><path d="M90 74l-3 6h6z" fill="#3a2a1c"/>`,
  tomb: `<path d="M34 106V70a26 26 0 0 1 52 0v36z" fill="#6a6058"/><path d="M46 106V78a14 14 0 0 1 28 0v28z" fill="#140e0c"/><circle cx="60" cy="90" r="5" fill="#9ae0ff" opacity=".35"/><path d="M30 106h60" stroke="#3a3430" stroke-width="3"/>`,
  storm: `<path d="M20 50a12 12 0 0 1 14-12 16 16 0 0 1 30-4 12 12 0 0 1 22 8 10 10 0 0 1 4 20H24a10 10 0 0 1-4-12z" fill="#3a4258"/><path d="M58 62l-8 18h8l-6 20 16-24h-8l6-14z" fill="#ffe680"/>`,
  ice: `<path d="M40 106l8-34 8 34zM54 106l10-46 10 46zM70 106l7-28 7 28z" fill="#d8f2ff" stroke="#7fb8d8" stroke-width="1.2"/><path d="M64 60v46" stroke="#9fd0ea" stroke-width="1"/>`,
  fire: `<path d="M44 92h32l-4 8H48z" fill="#3a3430"/><path d="M48 100l-4 6M72 100l4 6" stroke="#3a3430" stroke-width="2.5"/><path d="M60 58c8 9 12 15 12 22a12 12 0 0 1-24 0c0-5 3-9 6-12 0 5 2 7 4 8-1-6 0-12 2-18z" fill="#ff7a2a"/><path d="M60 72c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z" fill="#ffd36b"/>`,
  bard: `<circle cx="56" cy="70" r="6" fill="#3a2e28"/><path d="M48 106l2-26c0-4 3-6 6-6s6 2 6 6l2 26z" fill="#5a3a4a"/><ellipse cx="70" cy="88" rx="7" ry="9" fill="#a8743c"/><path d="M70 80l10-14" stroke="#6a4424" stroke-width="2.5"/><path d="M84 66c3 0 4 3 2 5M90 74c3 0 4 3 2 5" stroke="#f2e6c8" stroke-width="1.2" fill="none"/>`,
  road: `<path d="M50 106L58 64h4l8 42z" fill="#b39a6a"/><circle cx="66" cy="78" r="2.4" fill="#2a2420"/><path d="M64 81h4v8h-4z" fill="#2a2420"/><circle cx="56" cy="88" r="2.8" fill="#2a2420"/><path d="M53 91h6v10h-6z" fill="#2a2420"/>`,
  lantern: `<path d="M60 106V62M60 62h12" stroke="#3a3028" stroke-width="2.5"/><rect x="66" y="64" width="10" height="14" rx="2" fill="#2a2420"/><circle cx="71" cy="71" r="10" fill="#ffd36b" opacity=".35"/><rect x="68" y="67" width="6" height="8" fill="#ffd88a"/>`,
};
const FAMILY: [RegExp, string][] = [
  [/shrine|chapel|candle|altar|prayer|hermit/, "shrine"], [/battle|deserter|patrol|sergeant|knight/, "battle"], [/merchant|cart|tinker|market|caravan|wagon|fair|gambler/, "cart"],
  [/well|ford|spring|bridge|vault/, "well"], [/smith|forge|widow/, "forge"], [/sphinx|riddle/, "sphinx"], [/tomb|crypt|king|grave/, "tomb"],
  [/storm|lightning/, "storm"], [/snow|ice|frost|avalanche|inn/, "ice"], [/fire|ember|ash|miller/, "fire"], [/bard|song/, "bard"],
  [/refugee|road|scarecrow|orchard|bees/, "road"],
];

export function vignette(eventId: string, act: Act): string {
  const fam = FAMILY.find(([re]) => re.test(eventId))?.[1] ?? "lantern";
  const [top, hor, far, near, shade] = SKY[act];
  const id = `v${Math.round(Math.random() * 1e9)}`;
  return `<svg viewBox="0 0 120 140" preserveAspectRatio="xMidYMid slice" class="vig-svg">
  <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".72" stop-color="${hor}"/></linearGradient>
  <radialGradient id="${id}l" cx=".55" cy=".62" r=".5"><stop offset="0" stop-color="#fff2c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff2c8" stop-opacity="0"/></radialGradient></defs>
  <rect width="120" height="140" fill="url(#${id}s)"/>
  <circle cx="88" cy="40" r="10" fill="${act === 4 ? "#ff9a5a" : "#fff4d8"}" opacity=".7"/>
  <path d="M0 84q20-14 40-6t40-4 40 6v60H0z" fill="${far}" opacity=".85"/>
  <path d="M0 100q30-8 60-2t60-2v44H0z" fill="${near}"/>
  <rect width="120" height="140" fill="url(#${id}l)"/>
  ${MOTIF[fam]}
  <path d="M0 112q30-4 60 0t60 0v28H0z" fill="${shade}"/>
  <path d="M8 112l2-6 2 6M18 113l1-5 2 5M100 112l2-7 2 7M110 113l1-5 2 5" stroke="${shade}" stroke-width="1.5" fill="none"/>
</svg>`;
}
