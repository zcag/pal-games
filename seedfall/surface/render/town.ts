// Gantry, the town on row 0 (art.md 7.2-7.3): every building drawn in code from corrugated metal and
// timber with a 1 px dark outline, a lit pictogram sign, a door that glows while the pod is in front of
// it, windows that light at night, the depot forecourt with its pad, and the headframe over the mouth.
import { GF } from "./terrain.ts";
import { Atlas, GRP, Pix, spr, type Spr } from "./sprites.ts";

export interface TownItem { id: string; s: Spr; x: number; y: number; layer?: number; hit?: boolean; frames?: Spr[]; fps?: number; seed?: number }
export interface Town { items: TownItem[]; doors: Record<string, [number, number]> }

const ICON: Record<string, string[]> = {
  drop: ["...#...", "..###..", ".#####.", ".##+##.", "###+###", ".#####.", "..###.."],
  coin: ["..###..", ".#+++#.", "#++#++#", "#+###+#", "#++#++#", ".#+++#.", "..###.."],
  wrench: ["#.#....", "###....", ".###...", "..###..", "...###.", "....###", ".....##"],
  crate: ["#######", "#+#+#+#", "#######", "#+#+#+#", "#######", "#+#+#+#", "#######"],
  flask: ["..###..", "...#...", "...#...", "..#+#..", ".#+++#.", "#+++++#", "#######"],
  gear: ["..#.#..", ".#####.", "##+++##", ".#+#+#.", "##+++##", ".#####.", "..#.#.."],
  rocket: ["...#...", "..###..", "..#+#..", "..###..", ".#####.", "##.#.##", "#..#..#"],
};

const OUT = "#0b0d12";

/** A sign: 11x9 board, 7x7 pictogram in the accent; paint by day, lit (HDR 1.4) at night. */
function sign(p: Pix, x: number, y: number, icon: string, accent: string) {
  p.rect(x, y, 11, 9, "#22252e"); p.rect(x, y, 11, 1, "#3a3e4a");
  ICON[icon].forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === "#") p.set(x + 2 + i, y + 1 + j, accent, { e: 1.4, grp: GRP.NIGHT });
    else if (ch === "+") p.set(x + 2 + i, y + 1 + j, "#f0f0e8", { e: 1.0, grp: GRP.NIGHT });
  }));
}
/** Windows 2x3: dark glass by day, warm light at night that flicks off now and then. */
let winId = 0;
function win(p: Pix, x: number, y: number) {
  p.rect(x - 1, y - 1, 4, 5, "#2a2620");
  const id = winId++;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) p.set(x + i, y + j, j === 0 && i === 0 ? "#6a8aa8" : "#2a3a4a", { e: 1.8, ec: j === 0 ? "#ffe0a0" : "#ffc670", grp: GRP.WINDOW, id });
}
/** Door 6x9 that glows while the pod is in front of it. */
function door(p: Pix, x: number, y: number) {
  p.rect(x - 1, y - 1, 8, 10, "#1a1c22");
  for (let j = 0; j < 9; j++) for (let i = 0; i < 6; i++) p.set(x + i, y + j, j < 1 ? "#3a3e48" : "#2a2e38", { e: 1.2, ec: "#ffd8a0", grp: GRP.INST });
  p.set(x + 4, y + 5, "#c8a040");
}
/** Corrugated metal: vertical ribs every 2 px, a lit rib and a shaded one, rust low down. */
function corrugated(p: Pix, x: number, y: number, w: number, h: number, base: string, light: string, dark: string, rust = 0.12) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const rib = (x + i) % 3;
    let c = rib === 0 ? light : rib === 1 ? base : dark;
    if (j > h - 4 && ((i * 7 + j * 13) % 11) / 11 < rust * 3) c = "#7a4a2a";
    if ((i * 13 + j * 7) % 37 === 0) c = "#8a5a3a";
    p.set(x + i, y + j, c);
  }
}
/** Timber: planks 4 px tall with gaps and nail px. */
function planks(p: Pix, x: number, y: number, w: number, h: number, a = "#7a5030", b = "#6a4424", d = "#3a2414") {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const row = Math.floor(j / 4), ly = j % 4, joint = (i + row * 9) % 17 === 0;
    p.set(x + i, y + j, ly === 3 || joint ? d : (row % 2 ? a : b));
    if (ly === 1 && (i + row * 9) % 17 === 2) p.set(x + i, y + j, "#9aa0aa");
  }
}
function roof(p: Pix, x: number, y: number, w: number, c = "#3a3e48", hi = "#5a606c") { p.rect(x, y, w, 3, c); p.rect(x, y, w, 1, hi); }

export function buildTown(atlas: Atlas): Town {
  const items: TownItem[] = [];
  const doors: Record<string, [number, number]> = {};
  const add = (id: string, col: number, p: Pix, o: Partial<TownItem> = {}, outline = true) => {
    if (outline) p.outline(OUT);
    p.bevel(2);
    const s = spr(atlas, p, 0, p.h);
    items.push({ layer: 2, hit: true, ...o, id, s, x: col * 16 + (o.x ?? 0), y: o.y ?? 0 });
    return s;
  };

  // Launch site (Ida), cols 2-6, 5x6: a gantry tower, an observatory dome with a telescope on top, floodlights.
  {
    const p = new Pix(80, 100);
    const st = "#6a7280", sl = "#9aa4b4", sd = "#3e4650";
    // pad and base
    p.rect(0, 92, 80, 8, "#5a5652"); p.rect(0, 92, 80, 1, "#8a847c");
    // gantry lattice, 2 legs with X bracing
    for (const lx of [8, 26]) p.rect(lx, 20, 3, 72, st), p.rect(lx, 20, 1, 72, sl);
    for (let y = 22; y < 90; y += 10) { p.line(11, y, 25, y + 9, sd); p.line(25, y, 11, y + 9, sd); p.rect(11, y, 15, 1, st); }
    p.rect(6, 18, 24, 3, st); p.rect(6, 18, 24, 1, sl);
    // floodlights on the gantry top
    p.rect(5, 15, 4, 3, "#2a2c34"); p.set(6, 16, "#fff4e0", { e: 2.0, grp: GRP.NIGHT }); p.set(7, 16, "#fff4e0", { e: 2.0, grp: GRP.NIGHT });
    p.rect(27, 15, 4, 3, "#2a2c34"); p.set(28, 16, "#fff4e0", { e: 2.0, grp: GRP.NIGHT }); p.set(29, 16, "#fff4e0", { e: 2.0, grp: GRP.NIGHT });
    // the observatory: a building with a dome and a slit, a telescope poking out
    planks(p, 38, 56, 38, 36, "#8a6a4a", "#7a5a3a", "#3a2a1c");
    roof(p, 36, 53, 42);
    p.disc(57, 53, 17, (dx, dy) => (dy > 0 ? null : dx + dy < -8 ? "#c8ccd2" : dx > 6 ? "#7a808c" : "#a8aeb8"));
    for (let y = 36; y < 53; y++) p.set(55, y, "#22252e"), p.set(56, y, "#22252e");
    p.line(56, 42, 70, 30, "#c8ccd2"); p.line(56, 43, 70, 31, "#5a606c"); p.rect(69, 28, 3, 3, "#2a2c34"); p.set(70, 29, "#9ad8ff", { e: 1.2, grp: GRP.NIGHT });
    win(p, 44, 64); win(p, 68, 64);
    door(p, 54, 83);
    sign(p, 62, 74, "rocket", "#ffffff");
    add("launch", 2, p, { x: -8 });
    doors.launch = [2 * 16 - 8 + 57, -5];
  }
  // Rig office (Juno), cols 8-10, 3x3, with the derrick at 11 pumping slowly and the silo at 12.
  {
    const p = new Pix(48, 50);
    corrugated(p, 1, 12, 46, 38, "#6a5a7a", "#8a7a9a", "#4a3e58");
    roof(p, 0, 9, 48, "#3a3448", "#5a5068");
    p.rect(4, 2, 10, 7, "#4a4458"); p.rect(4, 2, 10, 1, "#6a6478"); // a rooftop box
    win(p, 6, 20); win(p, 14, 20); win(p, 34, 20); win(p, 40, 20);
    door(p, 21, 41);
    sign(p, 30, 30, "gear", "#c58cff");
    add("rig", 8, p);
    doors.rig = [8 * 16 + 24, -5];
    // derrick: an A-frame with a walking beam, 4 frames
    const frames: Spr[] = [];
    for (let f = 0; f < 4; f++) {
      const d = new Pix(16, 80);
      d.line(2, 79, 7, 8, "#5a5e6a"); d.line(13, 79, 8, 8, "#5a5e6a"); d.line(3, 79, 8, 8, "#8a8e9a");
      for (let y = 20; y < 79; y += 12) d.rect(3 + Math.floor((79 - y) / 16), y, 10 - Math.floor((79 - y) / 8), 1, "#4a4e58");
      const a = Math.sin(f / 4 * Math.PI * 2) * 3;
      d.line(1, 10 + a, 15, 10 - a, "#c58c3a"); d.rect(14, 9 - a, 2, 4, "#8a5a2a");
      d.line(15, 12 - a, 15, 78, "#2a2c34");
      d.rect(5, 74, 8, 6, "#3a3e48");
      d.outline(OUT); d.bevel(1);
      frames.push(spr(atlas, d, 0, 80));
    }
    items.push({ id: "derrick", s: frames[0], frames, fps: 2, x: 11 * 16, y: 0, layer: 2 });
    const s = new Pix(16, 64);
    p.rect(0, 0, 0, 0, "#000");
    for (let y = 4; y < 64; y++) for (let x = 1; x < 15; x++) s.set(x, y, x < 4 ? "#c8ccd2" : x > 11 ? "#6a707c" : "#9aa2b0");
    s.disc(8, 5, 7, (dx, dy) => (dy > 0 ? null : dx < -2 ? "#d8dce4" : "#a8aeb8"));
    for (let y = 30; y < 62; y++) s.set(7, y, "#5ad88a", { e: 0.6 });
    s.rect(7, 29, 3, 1, "#2a2c34");
    for (let y = 10; y < 62; y += 9) s.rect(1, y, 14, 1, "#7a808c");
    items.push({ id: "silo", s: spr(atlas, (s.outline(OUT), s.bevel(3), s), 0, 64), x: 12 * 16, y: 0, layer: 2, hit: true });
  }
  // Lab (Sefa), cols 13-15, 3x4: a dome with a slit, a blinking antenna.
  {
    const frames: Spr[] = [];
    for (let f = 0; f < 2; f++) {
      const p = new Pix(48, 72);
      p.rect(1, 40, 46, 32, "#c8ccd2"); for (let x = 1; x < 47; x += 6) p.rect(x, 40, 1, 32, "#a8aeb8"); p.rect(1, 40, 46, 2, "#e8ecf0");
      p.disc(24, 40, 20, (dx, dy) => (dy > 0 ? null : dx + dy < -10 ? "#e8ecf0" : dx > 8 ? "#8a9098" : "#b8bec8"));
      for (let y = 21; y < 40; y++) p.set(27, y, "#1e2a3a"), p.set(28, y, "#1e2a3a");
      p.line(14, 22, 14, 6, "#7a808c"); p.set(14, 5, f ? "#ff5a4a" : "#3a2020", { e: f ? 2.0 : 0 });
      win(p, 7, 50); win(p, 38, 50);
      door(p, 21, 63);
      sign(p, 31, 54, "flask", "#7fe8ff");
      p.outline(OUT); p.bevel(3);
      frames.push(spr(atlas, p, 0, 72));
    }
    items.push({ id: "lab", s: frames[0], frames, fps: 1, x: 13 * 16, y: 0, layer: 2, hit: true });
    doors.lab = [13 * 16 + 24, -5];
  }
  // Workshop (Bram), cols 16-19, 4x3: roll-shutter door, a crane arm, a chimney.
  {
    const p = new Pix(64, 58);
    corrugated(p, 1, 14, 62, 44, "#7a6a50", "#9a8a6a", "#5a4a34");
    roof(p, 0, 11, 64, "#4a3a2a", "#6a5a44");
    p.rect(48, 0, 6, 11, "#5a5e6a"); p.rect(48, 0, 6, 1, "#7a808c"); p.rect(49, 2, 4, 1, "#3a3e48");
    // roll shutter
    p.rect(6, 30, 30, 28, "#4a4e58"); for (let y = 30; y < 58; y += 2) p.rect(6, y, 30, 1, "#6a707c");
    p.rect(6, 29, 30, 1, "#2a2c34");
    // crane arm over the left
    p.line(2, 14, 2, 5, "#ff9a3a"); p.line(2, 5, 22, 5, "#ff9a3a"); p.line(3, 6, 21, 6, "#a8601c"); p.line(20, 6, 20, 16, "#c8ccd2"); p.rect(19, 16, 3, 2, "#5a5e6a");
    win(p, 42, 22); win(p, 54, 22);
    door(p, 44, 49);
    sign(p, 50, 34, "wrench", "#ff9a3a");
    add("workshop", 16, p);
    doors.workshop = [16 * 16 + 32, -5];
  }
  // Fuel station (Mo), cols 20-22, 3x2: a flat canopy on 2 posts reaching over the forecourt's left edge, 2 pumps.
  {
    const p = new Pix(64, 40);
    planks(p, 1, 14, 30, 26, "#8a5a3a", "#7a4a2a", "#3a2214");
    roof(p, 0, 11, 32, "#3a2a24", "#5a443a");
    p.rect(0, 2, 62, 4, "#e84a3a"); p.rect(0, 2, 62, 1, "#ff8a7a"); p.rect(0, 5, 62, 1, "#8a2a20");
    for (let x = 4; x < 60; x += 8) p.set(x, 3, "#fff0e0", { e: 1.0, grp: GRP.NIGHT });
    p.rect(34, 6, 2, 34, "#9aa4b4"); p.rect(58, 6, 2, 34, "#9aa4b4"); p.rect(34, 6, 1, 34, "#c8d0dc");
    // two pumps whose hoses face the pad
    for (const px of [38, 49]) {
      p.rect(px, 24, 7, 16, "#c8302a"); p.rect(px, 24, 7, 1, "#ff6a5a"); p.rect(px + 1, 27, 5, 4, "#e8f0f0", { e: 0.8, grp: GRP.NIGHT });
      p.line(px + 7, 30, px + 9, 36, "#1a1a1a");
    }
    win(p, 6, 22);
    door(p, 16, 31);
    sign(p, 4, 29 - 2, "drop", "#e84a3a");
    add("fuel", 20, p);
    doors.fuel = [20 * 16 + 20, -5];
  }
  // Depot forecourt, cols 23-30: concrete apron, oil stains, joints, the service pad 26-29, the mouth's chevron edge.
  {
    const p = new Pix(128, 4);
    for (let x = 0; x < 128; x++) for (let y = 0; y < 4; y++) {
      if (x >= 16 && x < 32) continue; // the mouth (col 24)
      const n = ((x * 7 + y * 13) % 29) / 29;
      let c = y === 0 ? "#8a847c" : y === 3 ? "#5a5652" : n > 0.93 ? "#6a6460" : "#76706a";
      if (x % 24 === 0 && y > 0) c = "#4a4644";
      if (((x - 70) ** 2) / 30 + (y - 1) ** 2 < 1.5 || ((x - 100) ** 2) / 12 + (y - 2) ** 2 < 1) c = "#4a4644";
      p.set(x, y, c, { n: [0, -0.6] });
    }
    // mouth edge chevrons
    for (let x = 12; x < 16; x++) p.set(x, 0, (x >> 1) % 2 ? "#ffd870" : "#1a1a1a");
    for (let x = 32; x < 36; x++) p.set(x, 0, (x >> 1) % 2 ? "#ffd870" : "#1a1a1a");
    const s = spr(atlas, p, 0, 0);
    items.push({ id: "apron", s, x: 23 * 16, y: 0, layer: 2 });
    // the pad marks (lit when landing)
    const q = new Pix(64, 2);
    for (const cx of [0, 60]) { q.rect(cx, 0, 4, 1, "#ffd870", { e: 1.0, grp: GRP.INST }); }
    q.rect(0, 1, 1, 1, "#ffd870", { e: 1.0, grp: GRP.INST }); q.rect(63, 1, 1, 1, "#ffd870", { e: 1.0, grp: GRP.INST });
    for (let i = 0; i < 6; i++) { q.set(26 + i, i % 2 ? 1 : 0, "#ffd870", { e: 1.0, grp: GRP.INST }); q.set(37 - i, i % 2 ? 1 : 0, "#ffd870", { e: 1.0, grp: GRP.INST }); }
    items.push({ id: "pad", s: spr(atlas, q, 0, 0), x: 26 * 16, y: 1, layer: 4, hit: true });
    doors.depot = [27.5 * 16, -5];
  }
  // Headframe over the mouth, cols 23-25, 5 tall: a steel A-frame leaning over the shaft, a back strut,
  // a platform and a big sheave wheel whose spokes turn while the Lift or a tow runs (4 frames).
  {
    const frames: Spr[] = [];
    for (let f = 0; f < 4; f++) {
      const p = new Pix(56, 86);
      const st = "#9aa4b4", sd = "#5a6272", hi = "#c8d0dc";
      // two front legs straddling the mouth, converging to the head
      p.line(6, 85, 22, 18, st); p.line(7, 85, 23, 18, sd);
      p.line(41, 85, 26, 18, st); p.line(40, 85, 25, 18, sd);
      // back strut to the right
      p.line(52, 85, 30, 22, sd); p.line(53, 85, 31, 22, st);
      // cross braces
      for (const y of [32, 48, 64, 78]) { const k = (85 - y) / 67; const xl = Math.round(6 + 16 * k), xr = Math.round(41 - 15 * k); p.rect(xl, y, xr - xl + 1, 1, sd); p.line(xl, y, xr, y + 13 > 85 ? 85 : y + 13, "#4a5262"); }
      // platform with a rail
      p.rect(14, 18, 24, 3, st); p.rect(14, 18, 24, 1, hi); for (let x = 14; x < 38; x += 4) p.rect(x, 14, 1, 4, sd); p.rect(14, 14, 24, 1, sd);
      // the sheave wheel
      p.disc(24, 9, 8.5, (dx, dy, d) => (d > 7.2 ? (dx + dy < -2 ? hi : st) : d < 1.8 ? "#2a2c34" : null));
      for (let k = 0; k < 6; k++) { const a = (k / 6 + f / 24) * Math.PI * 2; p.line(24 + Math.cos(a) * 2, 9 + Math.sin(a) * 2, 24 + Math.cos(a) * 7, 9 + Math.sin(a) * 7, sd); }
      p.line(24, 18, 24, 85, "#c8ccd2");
      // one aviation light on top of the wheel's axle post
      p.set(24, 0, "#ff5a4a", { e: 1.6, grp: GRP.NIGHT });
      p.outline(OUT); p.bevel(1);
      frames.push(spr(atlas, p, 0, 86));
    }
    items.push({ id: "headframe", s: frames[0], frames, fps: 0, x: 23 * 16 - 4, y: 0, layer: 2 });
  }
  // Market (Ines), cols 31-34, 4x3: a wide striped awning over the forecourt's right edge, ore crates, a scale.
  {
    const p = new Pix(80, 52);
    planks(p, 17, 12, 62, 40, "#9a8a6a", "#8a7a5a", "#4a3e2a");
    roof(p, 16, 9, 64, "#4a3e2a", "#6a5e44");
    for (let x = 0; x < 64; x++) for (let y = 16; y < 22; y++) p.set(x, y + (x < 18 ? 0 : 0), Math.floor(x / 6) % 2 ? "#e0c040" : "#f4ecd8");
    for (let x = 0; x < 64; x++) if (x % 6 < 3) p.set(x, 22, Math.floor(x / 6) % 2 ? "#a88a20" : "#c8c0a8");
    p.rect(2, 22, 1, 30, "#7a808c");
    // crates of ore and a scale under the awning
    for (const [cx, cy, c] of [[4, 42, "#8a4a32"], [11, 44, "#b85a28"], [6, 36, "#c8ccd2"]] as [number, number, string][]) { p.rect(cx, cy, 8, 8, "#7a5030"); p.rect(cx, cy, 8, 1, "#a87650"); p.rect(cx + 1, cy - 1, 6, 2, c); }
    p.rect(24, 40, 2, 12, "#5a5e6a"); p.line(18, 40, 32, 38, "#c8a040"); p.rect(17, 41, 4, 1, "#c8a040"); p.rect(30, 39, 4, 1, "#c8a040");
    win(p, 40, 28); win(p, 66, 28);
    door(p, 52, 43);
    sign(p, 58, 30, "coin", "#e0c040");
    add("market", 31, p, { x: -16 });
    doors.market = [31 * 16 + 30, -5];
  }
  // Supply store (Pell), cols 36-38, 3x2: a shed, stacked crates, barrels.
  {
    const p = new Pix(56, 36);
    planks(p, 1, 10, 38, 26, "#6a7a5a", "#5a6a4a", "#2a3420");
    roof(p, 0, 7, 40, "#3a4430", "#566248");
    for (const [cx, cy] of [[40, 28], [48, 28], [44, 20]]) { p.rect(cx, cy, 8, 8, "#7a5030"); p.rect(cx, cy, 8, 1, "#a87650"); p.line(cx, cy, cx + 7, cy + 7, "#5a3a20"); }
    for (const bx of [3, 9]) { p.rect(bx, 26, 5, 10, "#4a5a6a"); p.rect(bx, 28, 5, 1, "#2a3440"); p.rect(bx, 33, 5, 1, "#2a3440"); p.rect(bx, 26, 1, 10, "#6a7a8a"); }
    door(p, 25, 27);
    sign(p, 14, 14, "crate", "#8ac85a");
    add("supply", 36, p);
    doors.supply = [36 * 16 + 28, -5];
  }
  // A windsock at 42 (3 frames) and grass tufts on the open ground.
  {
    const frames: Spr[] = [];
    for (let f = 0; f < 3; f++) {
      const p = new Pix(16, 40);
      p.rect(2, 4, 1, 36, "#9aa4b4");
      for (let k = 0; k < 10; k++) { const y = 5 + Math.round(Math.sin(k * 0.6 + f * 2.1) * 1 + k * 0.25 * (2 - f * 0.5)); p.set(3 + k, y, Math.floor(k / 2) % 2 ? "#f4ecd8" : "#e84a3a"); p.set(3 + k, y + 1, Math.floor(k / 2) % 2 ? "#c8c0a8" : "#a83a2a"); }
      p.outline(OUT); p.bevel(1);
      frames.push(spr(atlas, p, 0, 40));
    }
    items.push({ id: "windsock", s: frames[0], frames, fps: 3, x: 42 * 16, y: 0, layer: 2 });
  }
  void GF;
  return { items, doors };
}
