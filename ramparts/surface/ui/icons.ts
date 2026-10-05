// The procedural glyph set (art 7.4): 24x24, 2 px round strokes in currentColor, an optional
// accent fill layer in var(--ac). No files; every glyph is a few path strings.
import type { BossId, CommanderId, EnemyId, NodeKind, SpecId, SpellId, SupplyId, TowerId } from "../../game/types.ts";

const P = (d: string) => `<path d="${d}"/>`;
/** Accent fill (with the outline stroke on top). */
const A = (d: string) => `<path class="ia" d="${d}"/>`;
/** Solid currentColor fill, no stroke. */
const F = (d: string) => `<path class="if" d="${d}"/>`;
/** Accent stroke. */
const AS = (d: string) => `<path class="as" d="${d}"/>`;
const C = (x: number, y: number, r: number, cls = "") => `<circle cx="${x}" cy="${y}" r="${r}"${cls ? ` class="${cls}"` : ""}/>`;
const dot = (x: number, y: number, r = 1.3) => C(x, y, r, "if");

const flame = "M12 2.5c3.2 3.6 5.5 6.4 5.5 10.2A5.5 5.5 0 0 1 12 18.5a5.5 5.5 0 0 1-5.5-5.8c0-2.4 1.3-4 2.6-5.3.1 1.8.8 2.9 1.9 3.4-.3-2.8.2-5.3 1-8.3z";
const skull = "M12 3a8 8 0 0 0-8 8c0 2.8 1.4 4.6 3 5.6V20.5h10v-3.9c1.6-1 3-2.8 3-5.6a8 8 0 0 0-8-8z";
const heart = "M12 20.5s-8-4.8-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 5.8-8 10.6-8 10.6z";
const star4 = "M12 2.5c.9 5.6 3.9 8.6 9.5 9.5-5.6.9-8.6 3.9-9.5 9.5-.9-5.6-3.9-8.6-9.5-9.5 5.6-.9 8.6-3.9 9.5-9.5z";
const drop = "M12 3c3.5 4.8 6 8 6 11.4a6 6 0 0 1-12 0C6 11 8.5 7.8 12 3z";
const diamond = "M12 3l7 9-7 9-7-9z";
const hexagon = "M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z";
const shieldP = "M12 3l7 2.6v6.2c0 4.4-3 7.4-7 9.2-4-1.8-7-4.8-7-9.2V5.6z";
const eye = "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z";
const swords =
  P("M4 4l10.5 10.5M20 4L9.5 14.5") + AS("M12 17.5l5.5-5.5M6.5 12l5.5 5.5") + P("M15.5 15.5l4 4M8.5 15.5l-4 4");
const coin = A("M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z") + P("M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z");
const crown = A("M4 18l-1.2-10 5 3.6L12 5l4.2 6.6 5-3.6L20 18z") + P("M4 21h16");
const bolt = "M13.5 2L6.5 13.5h5.2L10.5 22l7-11.5h-5.2z";
const spiralP = "M12 12.5a1.5 1.5 0 1 1 1.5-1.5 3 3 0 0 1-3 3A4.5 4.5 0 0 1 6 9.5 6 6 0 0 1 12 3.5a7.5 7.5 0 0 1 7.5 7.5";

/** Every glyph's inner markup. */
const G: Record<string, string> = {
  // ---------------------------------------------------------------- towers
  archer: P("M7 2.5c6.5 3.2 6.5 15.8 0 19") + P("M7 2.5v19") + P("M3.5 12h15") + A("M16 8.5l4.5 3.5-4.5 3.5z") + P("M3.5 12l-1.5-2M3.5 12l-1.5 2"),
  barracks: P("M3.5 3.5l17 17M20.5 3.5l-17 17") + A("M12 5.5l6 2.2v5.1c0 3.8-2.6 6.2-6 7.7-3.4-1.5-6-3.9-6-7.7V7.7z") + P("M12 9v7"),
  mage: P("M12 13v9") + P("M8.5 22h7") + A("M12 2l4.2 5.5L12 13l-4.2-5.5z") + P("M6 8.5c-1.6 1.6-1.6 3.4 0 5M18 8.5c1.6 1.6 1.6 3.4 0 5"),
  bombard: A("M11 7.5a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6z") + P("M15.2 9.6l2.6-2.6") + P("M17.5 6.5c.6-1.6 1.8-2.3 3.5-2.4") + P("M8 12a3.4 3.4 0 0 1 2.4-1.6"),
  frost: P("M12 1.8l10.2 10.2L12 22.2 1.8 12z") + AS("M12 6.5v11M7.2 9.2l9.6 5.6M7.2 14.8l9.6-5.6") + AS("M10.5 7.5L12 9l1.5-1.5M10.5 16.5L12 15l1.5 1.5"),
  alchemist: P("M9.5 2.5h5") + P("M10.5 2.5v5.8a7 7 0 1 0 3 0V2.5") + A("M5.6 15.4h12.8a6.6 6.6 0 0 1-12.8 0z") + C(10, 12.5, 0.9, "if") + C(13.5, 11, 0.7, "if"),
  pyre: A(flame.replace("M12 2.5", "M12 1.5")) + P("M4 13.5h16l-2.6 4.4H6.6z") + P("M8 18l-2 4M16 18l2 4M12 18v4"),
  storm: P("M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8z") + A(bolt),
  beacon: P("M8.6 22l1.4-11.5h4L15.4 22z") + A("M9 5.5h6v5H9z") + P("M8.5 5.5L12 2.5l3.5 3") + P("M2.5 6l3 1.2M21.5 6l-3 1.2M3 10.5h3M18 10.5h3") + P("M8.6 22h6.8"),
  banner: P("M6.5 2v13.5") + A("M6.5 3h12l-3.2 3.7 3.2 3.8h-12z") + P("M4 17.2c0-1.2 3.6-2 8-2s8 .8 8 2v3.3c0 1.2-3.6 2-8 2s-8-.8-8-2z") + P("M4 17.2c0 1.2 3.6 2 8 2s8-.8 8-2"),
  ballista: P("M2.5 10c3.5-3.4 15.5-3.4 19 0") + P("M2.5 10l9.5 4.5 9.5-4.5") + P("M12 6v16") + A("M12 2l2.6 4.2H9.4z") + P("M9 20h6"),
  thornwood: P("M12 3.2a8.8 8.8 0 1 1 0 17.6 8.8 8.8 0 0 1 0-17.6z") + P("M12 1v2.2M12 20.8V23M1 12h2.2M20.8 12H23M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6") + P("M12 18v-5") + A("M12 6.2a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z"),

  // ---------------------------------------------------------------- spec badges (drawn small in a corner disc)
  "b-marksmen": P(eye) + C(12, 12, 2.6, "if"),
  "b-volley": P("M4 20L18 6M8 20L20 8M4 16L16 4") + A("M18 3h3v3zM20 5.5h2.5V8zM14 2h3v3z"),
  "b-paladins": P("M4 9c0-2.2 3.6-4 8-4s8 1.8 8 4-3.6 4-8 4-8-1.8-8-4z") + A("M12 14l1.6 3.3 3.6.5-2.6 2.5.6 3.6L12 22.2"),
  "b-blademasters": P("M5 3l10 15M19 3L9 18") + AS("M12 15l-4 4M12 15l4 4"),
  "b-arcanist": P("M8 8a3 3 0 1 1 4 4M12 12a3 3 0 1 1 4 4M5 5l1.5 1.5M17.5 17.5L19 19") + A("M3 3h3v3H3zM18 18h3v3h-3z"),
  "b-hexer": P(hexagon) + A("M6.5 12s2-3.5 5.5-3.5 5.5 3.5 5.5 3.5-2 3.5-5.5 3.5-5.5-3.5-5.5-3.5z") + C(12, 12, 1.5, "if"),
  "b-mortar": P("M3 20C5 6 19 6 21 20") + A("M19 14.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"),
  "b-shrapnel": A("M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z") + P("M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"),
  "b-glacier": P("M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z") + A("M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"),
  "b-shatter": A("M10 3l-5 8 4 1-2 9 7-11-4-1 3-6z") + P("M15 13l5 2M16 18l4 3M17 8l4-2"),
  "b-acid": A(drop) + P("M9.5 15a2.5 2.5 0 0 0 2.5 2.5"),
  "b-naphtha": A(drop) + P("M12 10.5c1.6 1.8 2.5 3 2.5 4.4a2.5 2.5 0 0 1-5 0c0-1.4.9-2.6 2.5-4.4z"),
  "b-inferno": A("M12 1.5c4.2 4.4 7.2 8 7.2 12.4A7.2 7.2 0 0 1 12 21.5a7.2 7.2 0 0 1-7.2-7.6c0-3 1.7-5.2 3.4-6.9.2 2.3 1 3.7 2.4 4.4-.4-3.6.3-6.8 1.4-9.9z"),
  "b-firestorm": AS(spiralP) + P("M19.5 11c0 4.2-3.4 8-7.5 8"),
  "b-tempest": A("M7 17a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8a4.5 4.5 0 0 1 .5 9z") + P("M8 20l-1 2M12 20l-1 2M16 20l-1 2"),
  "b-overload": A("M12 2l1.8 4.6L18.5 7l-3.7 3 1.2 4.8L12 12.2 8 14.8l1.2-4.8L5.5 7l4.7-.4z") + P("M5 17l1 2.5L8.5 20l-2.5.8L5 23l-.9-2.2L1.5 20l2.6-.5zM19 16l.8 2 2 .6-2 .7-.8 1.9-.7-1.9-2-.7 2-.6z"),
  "b-lighthouse": A("M3 21l9-13 9 13z") + P("M12 2v3M5 5l2 2M19 5l-2 2"),
  "b-huntersmark": A(diamond) + P("M12 7l3.8 5L12 17l-3.8-5z"),
  "b-wardrums": P("M4 8c0-1.7 3.6-3 8-3s8 1.3 8 3v8c0 1.7-3.6 3-8 3s-8-1.3-8-3z") + A("M4 8c0 1.7 3.6 3 8 3s8-1.3 8-3c0-1.7-3.6-3-8-3s-8 1.3-8 3z") + P("M4 8l4 9.5M20 8l-4 9.5"),
  "b-treasury": coin + P("M12 9.5v5"),
  "b-harpoon": P("M12 2v13") + A("M12 22a5 5 0 0 1-5-5h3l2 2 2-2h3a5 5 0 0 1-5 5z") + P("M7 17l-2-2.5M17 17l2-2.5"),
  "b-siegebolt": P("M2 12h16") + A("M17 7.5l5 4.5-5 4.5z") + P("M2 12l2-3M2 12l2 3M6 12l2-3M6 12l2 3"),
  "b-bramble": P("M4 20C8 14 9 9 12 3M12 3c3 6 4 11 8 17") + A("M8 13l-3-1 2.5-1.5zM16 13l3-1-2.5-1.5zM10 8L7.5 6.5 10 5.5zM14 8l2.5-1.5L14 5.5z"),
  "b-treant": A("M12 2.5c4.4 0 8 3 8 7.5 0 3-1.2 5-3 6.5V21H7v-4.5c-1.8-1.5-3-3.5-3-6.5 0-4.5 3.6-7.5 8-7.5z") + `<path class="iv" d="M8 10.5h2.5M13.5 10.5H16M9.5 15.5c1.5.8 3.5.8 5 0"/>`,
  "b-plus": P("M12 5v14M5 12h14"),

  // ---------------------------------------------------------------- enemies
  footman: A("M4.5 15.5a7.5 7.5 0 0 1 15 0z") + P("M2.5 15.5h19") + P("M12 8v12") + P("M9 20.5h6"),
  runner: A("M7.5 3.5v10.5L4 18.5h11.5c2 0 3-1 3-2.2l-6.5-2.3V3.5z") + P("M9.5 7.5c3-3 8-3.2 11.5-1.4-2.6.2-4.4.9-5.6 1.9 1.8-.1 3.5.2 4.6.9-2.6.3-5.2 1.1-7 2.2") + P("M4 21.5h14"),
  brute: A("M2.5 15c0-5.4 4.2-8.5 9.5-8.5s9.5 3.1 9.5 8.5l-3.4 2.2c-.9-3.3-3-5.4-6.1-5.4s-5.2 2.1-6.1 5.4z") + C(12, 4.5, 2.2) + dot(6.5, 12) + dot(17.5, 12) + P("M8 21h8"),
  acolyte: A("M12 2.5c-5 0-7.2 6-7.2 11.2V21h14.4v-7.3C19.2 8.5 17 2.5 12 2.5z") + F("M8.8 14c0-2.4 1.4-4.6 3.2-4.6s3.2 2.2 3.2 4.6v1.8H8.8z") + P("M12 5.2l1.2 1.4L12 8 10.8 6.6z"),
  shieldbearer: A("M5.5 2.5h13V15c0 3.2-3 5.4-6.5 6.6-3.5-1.2-6.5-3.4-6.5-6.6z") + P("M12 4v15.5") + C(12, 10, 2.2, "if"),
  shaman: P("M12 9.5v13") + P("M12 9.5c-1-3.2-3-5.3-6.5-6.5M8.3 6.3L5.6 7.5M12 9.5c1-3.2 3-5.3 6.5-6.5M15.7 6.3l2.7 1.2") + A("M12 7.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z"),
  splitter: A("M2.5 15.5c0-4.3 2.9-7.3 6.3-7.3 1.9 0 3.2 1.1 3.2 3 0-1.9 1.3-3 3.2-3 3.4 0 6.3 3 6.3 7.3 0 3-2.1 5-5 5-2 0-3.4-1-4.5-2.3-1.1 1.3-2.5 2.3-4.5 2.3-2.9 0-5-2-5-5z") + P("M12 11.5v8") + dot(7.5, 14) + dot(16.5, 14),
  shade: A("M5 21.5V10a7 7 0 0 1 14 0v11.5l-2.3-2-2.3 2-2.4-2-2.3 2-2.4-2z") + `<circle class="iv" cx="9.5" cy="11" r="1.4"/><circle class="iv" cx="14.5" cy="11" r="1.4"/>`,
  swarmling: A("M12 7.5c3 0 5 2.8 5 6.5s-2 7-5 7-5-3.3-5-7 2-6.5 5-6.5z") + C(12, 5, 2.2) + P("M7.5 11l-3.5-2M7 14.5H3M7.5 18l-3.5 2M16.5 11l3.5-2M17 14.5h4M16.5 18l3.5 2M12 9v12"),
  sapper: C(7, 5, 2.4) + P("M7.5 8.5L6.3 15l3.2 6.5M6.3 15l-3.3 5.5M7.2 10.5L11 13") + A("M15 9a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z") + P("M18.2 10.2l2-2.6") + AS("M21 5.2l.6 1.6"),
  bat: A("M1.5 7.5c3.2.1 5.3 2.2 6.3 5.2 1.1-.8 2.5-1.2 4.2-1.2s3.1.4 4.2 1.2c1-3 3.1-5.1 6.3-5.2-.9 3.3-1 6.4-3.2 9.3-1.1-1-2.8-1.2-4-.3L12 14.5l-3.3 2c-1.2-.9-2.9-.7-4 .3C2.5 13.9 2.4 10.8 1.5 7.5z") + P("M10.2 11.6l.9-2.1.9 1.9.9-1.9.9 2.1"),
  drake: A("M1.5 9.5l7.5 2.5 3-5.5 3 5.5 7.5-2.5-5.8 6.5H14l-2 5.5-2-5.5H7.3z") + P("M12 6.5c.5-2 1.8-3.4 3.6-3.9-.6 1.1-.8 2-.7 2.9"),
  juggernaut: A("M7 8.5a5 5 0 0 1 10 0v6l-2 6.5H9l-2-6.5z") + P("M7 9C3.4 7.8 2 11.4 3.8 13.4s4.6.4 3.6-2M17 9c3.6-1.2 5 2.4 3.2 4.4s-4.6.4-3.6-2") + dot(10, 12, 1.1) + dot(14, 12, 1.1) + P("M10.5 17.5h3"),
  warlock: A("M3 13.5h8.5v8H3z") + P("M7.25 13.5v8") + P("M15 6.5h5v6.5h-5z") + P("M17.5 3.2v3.3") + AS("M17.5 8.6v2.2") + P("M14 2.5h7"),
  matron: A("M12 8a7 7 0 1 1 0 14 7 7 0 0 1 0-14z") + C(12, 4.6, 2.6) + dot(9.5, 14) + dot(14.5, 13) + dot(12, 17.5) + dot(15.8, 17),
  boss: A(skull) + P("M5.2 7C2.6 6.5 1.6 3.8 2.3 1.8c1 1.6 2.6 2.4 4.6 2.4M18.8 7c2.6-.5 3.6-3.2 2.9-5.2-1 1.6-2.6 2.4-4.6 2.4") + `<circle class="iv" cx="9" cy="11.5" r="1.8"/><circle class="iv" cx="15" cy="11.5" r="1.8"/>` + P("M10 20.5v-2.2M14 20.5v-2.2"),

  // ---------------------------------------------------------------- statuses
  slow: AS(spiralP) + P("M3 19.5h18"),
  chill: P("M12 3v18M12 3l-2 2M12 3l2 2M12 21l-2-2M12 21l2-2") + AS("M12 12l7.5-4.3M12 12l7.5 4.3M17.3 6.4l.3 2.7M17.3 17.6l.3-2.7"),
  frozen: A("M4 7.8l8-4.3 8 4.3v8.4l-8 4.3-8-4.3z") + P("M4 7.8l8 4.3 8-4.3M12 12.1v8.4"),
  burn: A(flame) + P("M8 21.5h8"),
  oiled: A(drop) + P("M9.2 14.5a2.8 2.8 0 0 0 2.8 2.8"),
  marked: A(diamond) + P("M12 9v6M9 12h6"),
  hexed: P(hexagon) + A("M6.5 12s2-3.5 5.5-3.5 5.5 3.5 5.5 3.5-2 3.5-5.5 3.5-5.5-3.5-5.5-3.5z") + C(12, 12, 1.4, "if"),
  shred: A("M4 5h16v8c0 4-3.6 6.6-8 8-4.4-1.4-8-4-8-8z") + `<path class="iv" d="M12 5l-2 5 3.2 2.5L11 21"/>`,
  stun: A("M12 3.5l1.6 3.4 3.7.5-2.7 2.5.7 3.7L12 11.8l-3.3 1.8.7-3.7-2.7-2.5 3.7-.5z") + P("M4 17.5c2.4 2.4 13.6 2.4 16 0") + C(5.5, 13.5, 1, "if") + C(18.5, 13.5, 1, "if"),
  revealed: P(eye) + A("M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"),
  shield: A(hexagon) + P("M12 7l4.3 2.5v5L12 17l-4.3-2.5v-5z"),
  rooted: P("M12 2.5v8") + AS("M12 10.5c-4 0-6.5 2-6.5 4.5S8 19 10.5 18s1.6-4.2-.8-3.6M12 10.5c4 0 6.5 2 6.5 4.5S16 19 13.5 18s-1.6-4.2.8-3.6") + P("M3 21.5h18"),
  numb: A("M4 7.8l8-4.3 8 4.3v8.4l-8 4.3-8-4.3z") + P("M8 12h8"),

  // ---------------------------------------------------------------- damage and defence
  phys: P("M18.5 3.5l1.9 0 .1 1.9-9.5 9.5-2-2z") + AS("M6 12.5l5.5 5.5") + P("M8.5 15.5l-4.5 4.5M4 18l2 2"),
  magic: A(star4),
  fire: A(flame) + P("M9.5 21.5h5"),
  pure: A("M12 2l4 6.5-4 13.5-4-13.5z") + P("M8 8.5h8M3 6l2 1M21 6l-2 1M3.5 13l1.8-.5M20.5 13l-1.8-.5"),
  armour: A("M3.5 7.5c3-1 6-2.5 8.5-4.5 2.5 2 5.5 3.5 8.5 4.5v4c0 4.6-3.4 8-8.5 9.8-5.1-1.8-8.5-5.2-8.5-9.8z") + P("M3.5 11.5h17"),
  ward: P("M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z") + A("M12 7.5l1.5 3h3l-2.5 2 1 3.2-3-1.9-3 1.9 1-3.2-2.5-2h3z"),
  fireproof: A(shieldP) + P("M12 7.5c1.8 2 3 3.5 3 5.3a3 3 0 0 1-6 0c0-1.8 1.2-3.3 3-5.3z"),

  // ---------------------------------------------------------------- currencies and run
  gold: coin,
  crown,
  life: A(heart),
  renown: P("M7 21C2.5 17.5 2 10.5 5 5M17 21c4.5-3.5 5-10.5 2-16") + A("M5.5 9.5L3 8.5M4.5 13.5L2 13.5M6 17l-2.2.8M18.5 9.5l2.5-1M19.5 13.5H22M18 17l2.2.8M12 3l1.4 2.9 3.1.4-2.3 2.1.6 3.1L12 10l-2.8 1.5.6-3.1-2.3-2.1 3.1-.4z"),
  wave: A(skull) + `<circle class="iv" cx="9" cy="11.5" r="1.8"/><circle class="iv" cx="15" cy="11.5" r="1.8"/>` + P("M10 20.5v-2.2M14 20.5v-2.2"),
  interest: coin + P("M12 9.5v5M10 11.5l2-2 2 2"),
  heartpip: F(heart),

  // ---------------------------------------------------------------- map nodes
  battle: swords,
  elite: A("M6 21v-7.5a6 6 0 0 1 12 0V21z") + P("M6 16h12M10 16v5M14 16v5") + P("M6.2 11.5C3 10.6 1.8 6.8 2.8 3.5c.9 2.8 2.7 4.3 5 5M17.8 11.5c3.2-.9 4.4-4.7 3.4-8-.9 2.8-2.7 4.3-5 5"),
  shop: A("M8 7.5h8l-1.3 2c4.3 2 5.4 6.2 4.3 9-.8 2-3 3-7 3s-6.2-1-7-3c-1.1-2.8 0-7 4.3-9z") + P("M8 7.5L6.8 3.8l5.2 1 5.2-1L16 7.5") + P("M12 12.5v5.5M10 14h3.2a1.2 1.2 0 0 1 0 2.4h-2.4a1.2 1.2 0 0 0 0 2.4H14"),
  event: P("M8.5 8.5a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.3-1.5 2.6v.7") + F("M12 17.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"),
  forge: A("M2.5 6.5h15c0 2.3 1.6 3.8 4 3.8v1.6H16c-1.2 0-2 .9-2 2v1.6H8.2V14c0-1.2-.8-2-2-2-2.5 0-3.7-2-3.7-5.5z") + P("M7.5 20.5h9M9 15.5l-1.5 5M15 15.5l1.5 5"),
  rest: A("M12 2.5c2.2 2.8 4.5 4.6 4.5 7.6a4.5 4.5 0 0 1-9 0c0-2 1-3.3 2.2-4.4.1 1.6.7 2.4 1.5 2.7-.2-2.2 0-3.9.8-5.9z") + P("M3.5 20.5l17-4.5M3.5 16l17 4.5"),
  camp: "",
  boss_node: "",
  treasure: A("M3 10.5h18v10H3z") + P("M3 10.5c0-3 2-5 5-5h8c3 0 5 2 5 5") + P("M3 13.5h18") + F("M10.6 12.2h2.8v3.6h-2.8z"),
  bounty: swords + A("M17 14.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z") + P("M15.5 18.5l1 1 2-2"),
  ambush: swords,

  // ---------------------------------------------------------------- commanders
  marshal: P("M5 19L17 7") + A("M15.5 4l4.5 4.5-2.2 2.2-4.5-4.5z") + P("M3.5 20.5l2-2M6 16l2 2") + AS("M19 15l.8 1.6 1.7.3-1.3 1.2.3 1.8-1.5-.8-1.5.8.3-1.8-1.3-1.2 1.7-.3z"),
  "c-alchemist": P("M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8z") + P("M12 1v2.6M12 20.4V23M1 12h2.6M20.4 12H23M4.2 4.2l1.9 1.9M17.9 17.9l1.9 1.9M4.2 19.8l1.9-1.9M17.9 6.1l1.9-1.9") + A("M10.6 7.5h2.8v2.7l2.8 4.6a1.4 1.4 0 0 1-1.2 2.2H9a1.4 1.4 0 0 1-1.2-2.2l2.8-4.6z"),
  seer: A("M15 3.2A9 9 0 1 0 20.8 15 7.4 7.4 0 0 1 15 3.2z") + P("M8 12.5s1.5-2.6 4-2.6 4 2.6 4 2.6-1.5 2.6-4 2.6-4-2.6-4-2.6z") + C(12, 12.5, 1, "if"),
  quartermaster: A("M3.5 8.5h17v12h-17z") + P("M3.5 8.5l2.5-4.5h12l2.5 4.5M3.5 8.5l17 12M20.5 8.5l-17 12") + P("M12 11.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"),
  warden: A(shieldP) + P("M12 17v-6.5M12 10.5c-2.4 0-3.6-1.6-3.6-3.6 2.4 0 3.6 1.6 3.6 3.6zM12 12.5c2.4 0 3.6-1.6 3.6-3.6-2.4 0-3.6 1.6-3.6 3.6z"),

  // ---------------------------------------------------------------- spells
  reinforcements: A("M3 13a4.5 4.5 0 0 1 9 0z") + A("M12 13a4.5 4.5 0 0 1 9 0z") + P("M2 13h20M7.5 13v7M16.5 13v7") + P("M12 3v4M10 5h4"),
  meteor: A("M15 9a5 5 0 1 1 0 10 5 5 0 0 1 0-10z") + P("M11.3 10.6L3 2.5M10 13.5L5 9M13.5 9.6L9 4.5"),
  firebomb: A(flame.replace("M12 2.5", "M12 2")) + P("M5 21.5h14"),
  tarpit: A("M2.5 16.5c0-2.5 4.3-4.5 9.5-4.5s9.5 2 9.5 4.5S17.2 21 12 21s-9.5-2-9.5-4.5z") + P("M9 9.5a1.6 1.6 0 1 1 0 .1M14.5 6.5a2 2 0 1 1 0 .1M12 3.5v.1"),
  stillness: P("M6 2.5h12M6 21.5h12") + A("M7 2.5c0 5 5 6.5 5 9.5s-5 4.5-5 9.5h10c0-5-5-6.5-5-9.5s5-4.5 5-9.5z") + P("M9 18.5h6"),
  judgement: A("M12 2l2.6 9.5L12 22l-2.6-10.5z") + P("M4 4l3.5 3.5M20 4l-3.5 3.5M2.5 11h3.5M21.5 11H18M7 19.5h10"),
  requisition: P("M5 3.5h10l4 4v13H5z") + P("M15 3.5v4h4M8 9.5h5M8 13h8") + A("M14.5 14.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"),
  rally: A("M3.5 9.5L18 4v14L3.5 12.5z") + P("M18 4c2 1 3 3.5 3 7s-1 6-3 7M7 13l1 6.5h3l-1-5.7"),
  barrier: A("M2.5 21V12c0-2 1.5-3 3-3s3 1 3 3c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4c0-2 1.5-3 3-3s3 1 3 3v9z") + P("M2.5 21h19M6 14v7M12 13v8M18 14v7"),
  bramblesurge: P("M3 21.5h18") + A("M12 21.5L9 9.5l3-7 3 7z") + A("M6 21.5L3 13l4 3zM18 21.5l3-8.5-4 3z") + P("M10 13l-2.2-1M14 13l2.2-1M10.6 17l-2-.6M13.4 17l2-.6"),

  // ---------------------------------------------------------------- supplies
  "oil-barrel": A("M6 4.5c0-1 2.7-1.5 6-1.5s6 .5 6 1.5v15c0 1-2.7 1.5-6 1.5s-6-.5-6-1.5z") + P("M6 4.5c0 1 2.7 1.5 6 1.5s6-.5 6-1.5M6 9.5c0 1 2.7 1.5 6 1.5s6-.5 6-1.5M6 14.5c0 1 2.7 1.5 6 1.5s6-.5 6-1.5") + F("M12 12.5c1 1.2 1.6 2 1.6 2.7a1.6 1.6 0 0 1-3.2 0c0-.7.6-1.5 1.6-2.7z"),
  "frost-flask": P("M9.5 2.5h5M10.5 2.5v5.8a7 7 0 1 0 3 0V2.5") + AS("M12 11.5v7M9 13.2l6 3.6M9 16.8l6-3.6"),
  "gold-cache": A("M4 16c0-1 3.6-2 8-2s8 1 8 2v3c0 1-3.6 2-8 2s-8-1-8-2z") + A("M5.5 10.5c0-1 2.9-2 6.5-2s6.5 1 6.5 2v3.2c0 1-2.9 2-6.5 2s-6.5-1-6.5-2z") + A("M7.5 5.2c0-1 2-1.7 4.5-1.7s4.5.7 4.5 1.7v3.2c0 1-2 1.7-4.5 1.7s-4.5-.7-4.5-1.7z"),
  "spike-trap": P("M2.5 20.5h19") + A("M4 20.5l2-9 2 9zM10 20.5l2-12 2 12zM16 20.5l2-9 2 9z"),
  "war-horn": A("M3 8c5 1 10 1 15-2.5 1 4 1.5 9 0 14C13 16 8 15 3 16z") + P("M3 8v8M18 5.5c2 0 3.5 3 3.5 7s-1.5 7-3.5 7"),
  "masons-kit": P("M14.5 9.5L4 20") + A("M12 3.5l7.5 7.5-2.5 2.5L9.5 6z") + P("M19 3.5L21 5.5"),
  flare: P("M12 22V12") + A("M9.5 12h5l-.8-6.5h-3.4z") + AS("M12 1.5v1.6M7.5 3.5l1 1.2M16.5 3.5l-1 1.2"),
  "heavy-bolt": P("M3 21L17 7") + A("M15 3l6 6-3.5.5L14.5 6.5z") + P("M3 21l-.5-3.5M3 21l3.5.5M6 18l-.5-3.5M6 18l3.5.5"),
  bell: A("M12 3c4 0 6 3 6 7v5l2 3H4l2-3v-5c0-4 2-7 6-7z") + P("M10 21h4M12 1.5V3"),
  lifeblood: P("M9 2.5h6M10 2.5v4L6.5 12a6.5 6.5 0 1 0 11 0L14 6.5v-4") + A("M12 11.5c-1.7-1.6-4.2-.4-4.2 1.7 0 2.4 4.2 4.8 4.2 4.8s4.2-2.4 4.2-4.8c0-2.1-2.5-3.3-4.2-1.7z"),

  // ---------------------------------------------------------------- relic families
  "r-ring": P("M12 8.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z") + A("M12 2.5l3 3.2-3 3.2-3-3.2z"),
  "r-horn": A("M3 15c4-1 8-4 10-9l3 1.5c-1 4-1 8.5 1.5 12.5-5 0-10-2-14.5-5z") + P("M13 6c1-1.5 2.5-2.5 4-2.5"),
  "r-lantern": P("M9 4.5h6M12 2v2.5") + A("M8 6.5h8l-1 11H9z") + P("M7 20.5h10M9 17.5l-1 3M15 17.5l1 3") + C(12, 12, 1.6, "if"),
  "r-coin": coin + P("M12 9.5v5"),
  "r-seed": A("M12 3c4 3 6 7 6 11a6 6 0 0 1-12 0c0-4 2-8 6-11z") + P("M12 9v10M12 13l-2.5-2M12 16l2.5-2"),
  "r-glass": A("M12 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14z") + P("M7 21.5h10M9.5 17l-.5 4.5M14.5 17l.5 4.5") + P("M9 7.5a3.6 3.6 0 0 1 2.5-1.4"),
  "r-bell": A("M12 3c4 0 6 3 6 7v5l2 3H4l2-3v-5c0-4 2-7 6-7z") + P("M10 21h4"),
  "r-feather": A("M19.5 3C11 3.5 6 9.5 5.5 18.5L19.5 3z") + P("M4 20.5L15 9.5M9 12h4.5M7.5 15.5h4"),
  "r-key": P("M8 4a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z") + A("M11.2 11.5l8.8 8.8-2 2-1.6-1.6-1.5 1.5-1.6-1.6 1.5-1.5-5.2-5.2z"),
  "r-scroll": A("M6 4h11a2 2 0 0 1 2 2v12a3 3 0 0 1-3 3H6z") + P("M6 4a2 2 0 0 0-2 2v2h2M9 9h7M9 12.5h7M9 16h4"),
  "r-drum": P("M4 8c0-1.7 3.6-3 8-3s8 1.3 8 3v8c0 1.7-3.6 3-8 3s-8-1.3-8-3z") + A("M4 8c0 1.7 3.6 3 8 3s8-1.3 8-3c0-1.7-3.6-3-8-3S4 6.3 4 8z") + P("M4 8l4 9.5M20 8l-4 9.5"),
  "r-crest": A(shieldP) + P("M12 3v18M5 11h14"),
  "r-candle": A("M8.5 11h7v10.5h-7z") + AS("M12 2.5c1.6 1.9 2.6 3.2 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.4 1-2.7 2.6-4.6z") + P("M6 21.5h12"),
  "r-hammer": P("M14.5 9.5L4 20") + A("M12 3.5l7.5 7.5-2.5 2.5L9.5 6z"),
  "r-gem": A("M6 3.5h12l3.5 5L12 21 2.5 8.5z") + P("M2.5 8.5h19M9 3.5l-2 5L12 21l5-12.5-2-5"),
  "r-banner": P("M5.5 2v20") + A("M5.5 3h13v11l-6.5-3-6.5 3z"),
  "r-map": A("M3 5.5l6-2 6 2 6-2v15l-6 2-6-2-6 2z") + P("M9 3.5v15M15 5.5v15"),
  "r-shard": A("M12 2l5 7-2 13h-6L7 9z") + P("M7 9h10M12 2v20"),
  "r-coil": P("M5 6h14M5 18h14") + AS("M7 6c-3 1.5 13 3 10 4.5S4 12 7 13.5s13 3 10 4.5"),
  "r-eye": P(eye) + A("M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"),
  "r-planks": A("M3 7l17-3 1 4-17 3zM3 13l17-3 1 4-17 3z") + P("M7 6v12M16 4.5v12") + F("M6.5 9a.8.8 0 1 1 0 .1M15.5 7.5a.8.8 0 1 1 0 .1"),
  "r-chest": A("M3 10.5h18v10H3z") + P("M3 10.5c0-3 2-5 5-5h8c3 0 5 2 5 5M3 13.5h18") + F("M10.6 12.2h2.8v3.6h-2.8z"),
  "r-horseshoe": A("M6 4h3.5v8a2.5 2.5 0 0 0 5 0V4H18v8a6 6 0 0 1-12 0z") + F("M7.7 6.5a.7.7 0 1 1 0 .1M16.3 6.5a.7.7 0 1 1 0 .1M7.9 10.5a.7.7 0 1 1 0 .1M16.1 10.5a.7.7 0 1 1 0 .1"),
  "r-bread": A("M4 13c0-4 3.6-7 8-7s8 3 8 7v5H4z") + P("M8 9.5l1.5 3M12 8.5v3.5M16 9.5l-1.5 3"),
  "r-purse": A("M6 9.5h12l1.5 9.5c.2 1.3-.8 2-2 2h-11c-1.2 0-2.2-.7-2-2z") + P("M8 9.5c0-3 1.8-5.5 4-5.5s4 2.5 4 5.5M9 9.5l3-2 3 2"),
  "r-globe": A("M12 3a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15z") + P("M8 21h8M10 18l-1 3M14 18l1 3") + `<path class="iv" d="M12 7v7M9 9l6 3M15 9l-6 3"/>`,
  "r-pot": A("M5 9h14l-1 9c-.1 1.6-1.4 3-3 3H9c-1.6 0-2.9-1.4-3-3z") + P("M4 9h16M9 9V6.5c0-1 1-1.5 3-1.5s3 .5 3 1.5V9") + AS("M10 3c.5-1 1.5-1 2 0M13 2.5c.5-1 1.5-1 2 0"),
  "r-awl": P("M4 20l8-8") + A("M12 12l3-3 2 2-3 3z") + P("M17 11l3.5-6.5L14 8"),
  "r-fuse": AS("M15 8c2-2 3-4 6-5") + A("M10 9a6 6 0 1 1 0 12 6 6 0 0 1 0-12z") + P("M13.2 10l1.8-1.8"),
  "r-collar": P("M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z") + A("M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z") + P("M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.5 4.5l2 2M17.5 17.5l2 2M4.5 19.5l2-2M17.5 6.5l2-2"),
  "r-stone": A("M5 15c-1-4 1-9 6-10 5-1 9 2 9 7s-3 8-8 8c-3 0-6-2-7-5z") + `<path class="iv" d="M9 12c1-1.5 3-1.5 4 0s3 1.5 4 0M9 15.5c1-1.5 3-1.5 4 0"/>`,
  "r-spyglass": A("M3 15l12-7 2.5 4.5-12 7z") + P("M15 8l2-1.2 2.6 4.4-2.1 1.3M7 18.5l1.5 3") + C(19, 7, 1.2, "if"),
  "r-shutters": A("M4 4h16v16H4z") + P("M12 4v16M4 9h16M4 15h16") + F("M10.3 11.2h3.4v1.6h-3.4z"),
  "r-pad": A("M3 15c0-2.5 4-4.5 9-4.5s9 2 9 4.5-4 4.5-9 4.5-9-2-9-4.5z") + P("M12 13v4M10 15h4") + AS("M12 3v4M9 5l3-2 3 2"),
  "r-vial": P("M10 2.5h4M10.5 2.5v5L7 15a5.5 5.5 0 1 0 10 0l-3.5-7.5v-5") + A("M7.3 14.5h9.4a5.2 5.2 0 0 1-9.4 0z") + AS("M10 17c1 1 3 1 4 0"),
  "r-prism": A("M12 3l8 15H4z") + P("M2 9l7 4M14.5 12.5l7.5-2M14.8 14l7 3"),
  "r-ingot": A("M3 16l3-7h12l3 7z") + P("M6 9l1.5 7M18 9l-1.5 7") + AS("M14 4l1 2M18 3l-1 2.5"),
  "r-crownfire": crown + AS("M12 1.5c1 1.2 1.5 2 1.5 2.8a1.5 1.5 0 0 1-3 0c0-.8.5-1.6 1.5-2.8z"),
  "r-seal": A("M12 3l2.2 2 3-.5.7 3 2.6 1.6-1.3 2.7 1.3 2.7-2.6 1.6-.7 3-3-.5L12 21l-2.2-2-3 .5-.7-3-2.6-1.6 1.3-2.7-1.3-2.7 2.6-1.6.7-3 3 .5z") + P("M9 12h6M12 9v6"),
  "r-gear": `<circle cx="12" cy="12" r="7.6" class="ia" stroke-width="3.6" stroke-dasharray="2.9 3.07"/>` + C(12, 12, 6) + C(12, 12, 2.2, "if"),
  "r-sun": A("M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z") + P("M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"),
  "r-hollowcrown": P("M4 18l-1.2-10 5 3.6L12 5l4.2 6.6 5-3.6L20 18zM4 21h16") + AS("M8 15h8"),
  "r-clock": A("M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z") + `<path class="iv" d="M12 8v4.5l3 2"/>` + P("M9 2h6M19 5l1.5-1.5"),
  "r-abacus": P("M4 3v18M20 3v18M4 7h16M4 12h16M4 17h16") + F("M7 5.6h2.4v2.8H7zM12 5.6h2.4v2.8H12zM9.5 10.6h2.4v2.8H9.5zM14.5 15.6h2.4v2.8h-2.4zM6.5 15.6h2.4v2.8H6.5z"),
  "r-crate": A("M3.5 8.5h17v12h-17z") + P("M3.5 8.5l2.5-4.5h12l2.5 4.5M3.5 8.5l17 12M20.5 8.5l-17 12"),
  "r-spade": P("M12 2.5v11") + A("M8 13.5h8v3a4 4 0 0 1-8 0z") + P("M9.5 3h5"),
  "r-bellows": A("M4 9l11-4 4 7-4 7-11-4z") + P("M19 12h3M7 10.5v3M10 9.5v5"),
  "r-whistle": A("M3 10h11a4.5 4.5 0 1 1 0 9H8a5 5 0 0 1-5-5z") + P("M14 10V7h4") + F("M14 13a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"),
  "r-stormglass": A("M12 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14z") + `<path class="iv" d="M13 6l-3 5h3l-2 4"/>` + P("M7 21.5h10M9.5 17l-.5 4.5M14.5 17l.5 4.5"),
  "r-ledger": A("M5 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5z") + P("M5 3v18M9 8h6M9 11.5h6M9 15h3"),
  "r-heart": A(heart) + `<path class="iv" d="M12 9v8M12 12l-2.5-2M12 14.5l2.5-2"/>`,
  "r-retort": A("M5 12a5 5 0 1 0 10 0 5 5 0 0 0-10 0z") + P("M13.5 8.5L20 4l1.5 1.5") + AS("M8 9c.5-1 1.5-1 2 0M11 7.5c.5-1 1.5-1 2 0"),
  curse: A("M12 2.5c-5 0-8 3.6-8 8 0 3 1.6 4.7 3 5.5v4.5h10V16c1.4-.8 3-2.5 3-5.5 0-4.4-3-8-8-8z") + `<path class="iv" d="M8.5 9.5l2 2M10.5 9.5l-2 2M13.5 9.5l2 2M15.5 9.5l-2 2"/>` + P("M10 20.5v-2M14 20.5v-2"),

  // ---------------------------------------------------------------- ui
  speed: P("M4 6l6 6-6 6M12 6l6 6-6 6"),
  speed1: P("M9 6l6 6-6 6"),
  speed2: P("M5.5 6l6 6-6 6M12.5 6l6 6-6 6"),
  speed3: P("M2.5 6l6 6-6 6M9 6l6 6-6 6M15.5 6l6 6-6 6"),
  pause: P("M8 5v14M16 5v14"),
  play: A("M7 4.5l13 7.5-13 7.5z"),
  gear: `<circle cx="12" cy="12" r="8.2" stroke-width="3.4" stroke-dasharray="2.9 3.54"/>` + C(12, 12, 6.2) + C(12, 12, 2.4),
  upgrade: P("M6 13l6-6 6 6") + AS("M6 19l6-6 6 6"),
  sell: coin + `<path class="iv" d="M8.5 12h7"/>`,
  flag: P("M6 21.5V3") + A("M6 3.5h12l-2.6 4.2L18 12H6z"),
  info: P("M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z") + P("M12 11v6") + F("M12 6.4a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z"),
  close: P("M6 6l12 12M18 6L6 18"),
  codex: A("M3.5 5c3-1.2 6-1 8.5 1 2.5-2 5.5-2.2 8.5-1v14c-3-1.2-6-1-8.5 1-2.5-2-5.5-2.2-8.5-1z") + P("M12 6v14"),
  ascension: A(flame) + P("M12 22v-5M9.5 19.5L12 17l2.5 2.5"),
  target: P("M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15z") + P("M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5") + C(12, 12, 1.4, "if"),
  wartable: P("M3 3.5h18v17H3z") + A("M8.5 18.5v-7l-1-1V7h2v1.5h1.5V7h2v1.5h1.5V7h2v3.5l-1 1v7z"),
  sound: A("M3.5 9h3.5l5-4v14l-5-4H3.5z") + P("M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.3a8 8 0 0 1 0 11.4"),
  mute: A("M3.5 9h3.5l5-4v14l-5-4H3.5z") + P("M15.5 9.5l5 5M20.5 9.5l-5 5"),
  back: P("M10 5l-7 7 7 7M3 12h18"),
  next: P("M14 5l7 7-7 7M21 12H3"),
  check: P("M4.5 12.5l5 5 10-11"),
  lock: A("M5 10.5h14v10.5H5z") + P("M8 10.5V7.5a4 4 0 0 1 8 0v3") + `<path class="iv" d="M12 14.5v3"/>`,
  star: A("M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z"),
  reroll: P("M19.5 8.5A8 8 0 0 0 5 7.5M4.5 15.5A8 8 0 0 0 19 16.5") + A("M19.5 3.5v5h-5zM4.5 20.5v-5h5z"),
  banish: P("M5 3.5h14v17H5z") + AS("M3 21L21 3"),
  skip: P("M5 5.5l8 6.5-8 6.5zM14 5.5l8 6.5-8 6.5"),
  map: A("M3 5.5l6-2 6 2 6-2v15l-6 2-6-2-6 2z") + P("M9 3.5v15M15 5.5v15"),
  hammer: P("M14.5 9.5L4 20") + A("M12 3.5l7.5 7.5-2.5 2.5L9.5 6z"),
  quit: P("M14 4.5h5.5v15H14") + P("M10 8l-4 4 4 4M6 12h10"),
  keyboard: P("M2.5 6.5h19v11h-19z") + P("M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7 14h10"),
  air: P("M3 13c3-5 6-6 9-3 3-3 6-2 9 3") + P("M12 10v9"),
  sword: P("M18.5 3.5l1.9 0 .1 1.9-9.5 9.5-2-2z") + AS("M6 12.5l5.5 5.5") + P("M8.5 15.5l-4.5 4.5"),
  range: P("M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z") + `<path d="M12 12l6.4-6.4" class="as"/>` + C(12, 12, 1.4, "if"),
  clock: P("M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z") + P("M12 7v5l3.5 2"),
  new: A("M12 2.5l2.4 4.6 5.1-.9-1.6 4.9 3.6 3.7-5.1.9-.4 5.2L12 18l-4 2.9-.4-5.2-5.1-.9 3.6-3.7-1.6-4.9 5.1.9z"),
  ghost: P("M5 21V10a7 7 0 0 1 14 0v11l-2.3-2-2.3 2-2.4-2-2.3 2-2.4-2z") + P("M9 11h.01M15 11h.01"),
  build: P("M3 21h18") + A("M6 21V11l2-1V7h2v2h4V7h2v3l2 1v10z"),
};
G.camp = G.rest;
G.boss_node = G.boss;
G.heal = G.life;
G.chilled = G.chill;
G.stealth = G.shade;
G.healer = G.shaman;
G.elite_badge = G.elite;

/** Spec -> badge glyph and accent (art 4.3). */
export const SPEC_ACCENT: Record<SpecId, string> = {
  marksmen: "#C9D86A", volley: "#F2A83C", paladins: "#F1E3B0", blademasters: "#E0505A", arcanist: "#9FB8FF", hexer: "#B26BFF",
  mortar: "#E2752F", shrapnel: "#C8CED6", glacier: "#9BE3FF", shatter: "#D8F4FF", acid: "#B6F24A", naphtha: "#FF8A2A",
  inferno: "#FF4A1E", firestorm: "#7FD0FF", tempest: "#8FB4FF", overload: "#D8C8FF", lighthouse: "#FFF1C2", huntersmark: "#F2C14E",
  wardrums: "#E35D6A", treasury: "#FFD36B", harpoon: "#AFC0CC", siegebolt: "#D2DAE0", bramble: "#C2577A", treant: "#6FC27A",
};
export const SPEC_TOWER: Record<SpecId, TowerId> = {
  marksmen: "archer", volley: "archer", paladins: "barracks", blademasters: "barracks", arcanist: "mage", hexer: "mage",
  mortar: "bombard", shrapnel: "bombard", glacier: "frost", shatter: "frost", acid: "alchemist", naphtha: "alchemist",
  inferno: "pyre", firestorm: "pyre", tempest: "storm", overload: "storm", lighthouse: "beacon", huntersmark: "beacon",
  wardrums: "banner", treasury: "banner", harpoon: "ballista", siegebolt: "ballista", bramble: "thornwood", treant: "thornwood",
};

export const TOWER_ACCENT: Record<TowerId, string> = {
  archer: "#E6B85C", barracks: "#4A86E0", mage: "#8E6CF2", bombard: "#E2752F", frost: "#86DBFF", alchemist: "#A6E04A",
  pyre: "#FF5A2A", storm: "#7FA2FF", beacon: "#FFE6A0", banner: "#D94A5E", ballista: "#B7C2CC", thornwood: "#4FAE5C",
};

const ENEMY_GLYPH: Partial<Record<EnemyId, string>> = {
  slime: "splitter", slimelet: "splitter", skeleton: "footman", risen: "footman", shard: "splitter", sandling: "swarmling",
  brood: "swarmling", pup: "runner", "ember-runner": "runner", "ember-drake": "drake",
  gorrak: "boss", wyrm: "boss", colossus: "boss", tyrant: "boss", hivequeen: "boss", lich: "boss", packlord: "boss",
};
export const enemyGlyph = (k: EnemyId) => ENEMY_GLYPH[k] ?? k;

const NODE_GLYPH: Partial<Record<NodeKind, string>> = { boss: "boss_node", camp: "rest" };
export const nodeGlyph = (k: NodeKind) => NODE_GLYPH[k] ?? k;
export const commanderGlyph = (c: CommanderId) => (c === "alchemist" ? "c-alchemist" : c);
export const spellGlyph = (s: SpellId) => s;
export const supplyGlyph = (s: SupplyId) => s;
export const bossGlyph = (_b: BossId) => "boss";

const RELIC_FAMILY: [RegExp, string][] = [
  [/ring|band|seal|signet/, "r-ring"], [/horn|whistle|trumpet/, "r-horn"], [/lantern|lamp|light|sun/, "r-lantern"],
  [/coin|purse|mint|ledger|chest|abacus|crate|toll/, "r-coin"], [/seed|oak|root|heart|wood|acorn/, "r-seed"],
  [/glass|globe|lens|vial|orb|eye|prism/, "r-glass"], [/bell/, "r-bell"], [/feather|phoenix|wing/, "r-feather"],
  [/key|lock/, "r-key"], [/map|chart/, "r-map"], [/scroll|book|page|pact|letter/, "r-scroll"], [/drum/, "r-drum"],
  [/crest|shield|standard|banner|flag/, "r-crest"], [/candle|fuse|ember|torch|retort|bellows|pot/, "r-candle"],
  [/hammer|awl|spade|anvil|shutter|plank|engine/, "r-hammer"], [/crown|gem|stone|jewel|ice|iron|dragonglass/, "r-gem"],
  [/coil|copper|spring/, "r-coil"], [/shard|arrow|bolt|spear/, "r-shard"],
];
/** Each relic's own picture; unknown relics fall back to a family by name, then a stable hash. */
const RELIC_ART: Record<string, string> = {
  "spare-planks": "r-planks", "war-chest": "r-chest", "lucky-horseshoe": "r-horseshoe", "field-rations": "r-bread", "coin-purse": "r-purse",
  "signal-horn": "r-horn", snowglobe: "r-globe", "copper-coil": "r-coil", "grease-pot": "r-pot", "marching-drum": "r-drum",
  "black-ice": "r-shard", "storm-glass": "r-stormglass", "hunters-whistle": "r-whistle", "armourers-awl": "r-awl", "long-fuse": "r-fuse",
  "thorn-collar": "r-collar", "echo-stone": "r-stone", spyglass: "r-spyglass", "iron-shutters": "r-shutters", "pilgrims-map": "r-map",
  "ninth-pad": "r-pad", "tidewater-vial": "r-vial", "prism-lens": "r-prism", "cold-iron": "r-ingot", "old-oak-seed": "r-seed",
  "twin-crests": "r-crest", "phoenix-feather": "r-feather", dragonglass: "r-gem", "deadeyes-oath": "r-eye", "wildfire-crown": "r-crownfire",
  "royal-mint": "r-coin", "masons-seal": "r-seal", "siege-engine": "r-gear", "sun-disc": "r-sun", "seven-bells": "r-bell",
  "hollow-crown": "r-hollowcrown", "pact-of-embers": "r-scroll", "crowded-banners": "r-banner", overclock: "r-clock",
  "guild-seal": "r-ring", abacus: "r-abacus", "merchants-bell": "r-bell", "smugglers-crate": "r-crate", "wayfarers-spade": "r-spade", bellows: "r-bellows",
  "old-standard": "r-banner", "bubbling-retort": "r-retort", "third-eye": "r-eye", ledger: "r-ledger", heartwood: "r-heart",
  "votive-candle": "r-candle", "widows-hammer": "r-hammer",
};
export function relicGlyph(id: string): string {
  if (RELIC_ART[id]) return RELIC_ART[id];
  const s = id.toLowerCase();
  for (const [re, g] of RELIC_FAMILY) if (re.test(s)) return g;
  const fam = ["r-ring", "r-gem", "r-scroll", "r-glass", "r-crest", "r-bell", "r-key"];
  let n = 0;
  for (const ch of s) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return fam[n % fam.length];
}

export interface IconOpts { size?: number; accent?: string; cls?: string; title?: string }

/** SVG markup for a glyph. `accent` fills the accent layer; color comes from the context. */
export function icon(name: string, o: IconOpts = {}): string {
  const body = G[name] ?? G.info;
  const sz = o.size ?? 24;
  const sw = sz <= 18 ? 2.3 : sz >= 36 ? 1.7 : 2;
  const style = o.accent ? ` style="--ac:${o.accent}"` : "";
  return `<svg class="ic${o.cls ? " " + o.cls : ""}" viewBox="0 0 24 24" width="${sz}" height="${sz}" stroke-width="${sw.toFixed(2)}"${style} aria-hidden="true">${body}</svg>`;
}

/** A tower glyph with a spec (or "plus" for boons) badge in the lower-right corner. */
export function badged(base: string, badge: string, o: IconOpts & { badgeAccent?: string } = {}): string {
  const sz = o.size ?? 24;
  const style = o.accent ? ` style="--ac:${o.accent}"` : "";
  const bAc = o.badgeAccent ? ` style="--ac:${o.badgeAccent}"` : "";
  return `<svg class="ic${o.cls ? " " + o.cls : ""}" viewBox="0 0 24 24" width="${sz}" height="${sz}" stroke-width="2"${style} aria-hidden="true">` +
    `<g transform="translate(-1 -1) scale(.86)">${G[base] ?? ""}</g>` +
    `<circle cx="17.6" cy="17.6" r="6.6" class="ibg"/>` +
    `<g transform="translate(12.2 12.2) scale(.45)" stroke-width="3.4"${bAc}>${G[badge] ?? ""}</g></svg>`;
}

export const specIcon = (s: SpecId, size = 24) => badged(SPEC_TOWER[s], "b-" + s, { size, accent: TOWER_ACCENT[SPEC_TOWER[s]], badgeAccent: SPEC_ACCENT[s] });
export const towerIcon = (t: TowerId, size = 24) => icon(t, { size, accent: TOWER_ACCENT[t] });
export const boonIcon = (t: TowerId | null, size = 24) => (t ? badged(t, "b-plus", { size, accent: TOWER_ACCENT[t], badgeAccent: "#6FD88A" }) : icon("star", { size, accent: "#6FD88A" }));

export const GLYPHS = Object.keys(G);
