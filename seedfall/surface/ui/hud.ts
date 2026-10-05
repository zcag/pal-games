// The dive HUD: fuel (with the get-home tick), hull, cargo, heat, cash, depth, data, the next-goal line, the depth
// gauge on the right edge, the hotbar and the minimap. Updated every frame; text and styles only change on change.
import { FLAG, W, type GameView } from "../../game/types.ts";
import { BIOME_TOP, BIOMES, MATERIALS, findById } from "../../game/content/world.ts";
import { h, setText, toggle, num, clamp } from "./dom.ts";
import { icon } from "./icons.ts";
import { PxText } from "./pfont.ts";
import type { UiModel } from "./model.ts";

/** Biome band colours for the gauge and minimap (art.md section 4 accents, muted). */
export const BIOME_COLORS = ["#8fc85a", "#c8905a", "#7fc8ff", "#5cffc8", "#ff7a2a", "#8affd0", "#fff2c0"];
const ROWS = 770;

interface Bar { el: HTMLElement; fill: HTMLElement; ghost: HTMLElement; last: number }
function bar(color: string): Bar {
  const fill = h("div.fill", { style: { "--c": color } });
  const ghost = h("div.ghost");
  const el = h("div.bar", ghost, fill);
  return { el, fill, ghost, last: -1 };
}
function setBar(b: Bar, v: number) {
  v = clamp(v, 0, 1);
  if (Math.abs(v - b.last) < 0.0005) return;
  b.fill.style.transform = `scaleX(${v})`;
  // A loss leaves a white ghost that drains after it; a gain (and the first value) moves the ghost with the fill.
  if (v < b.last && b.last >= 0) b.ghost.style.transform = `scaleX(${v})`;
  else { b.ghost.style.transition = "none"; b.ghost.style.transform = `scaleX(${v})`; void b.ghost.offsetWidth; b.ghost.style.transition = ""; }
  b.last = v;
}

export type Warn = { text: string; tone: "warn" | "bad" } | null;

export class Hud {
  el: HTMLElement;
  private cluster: HTMLElement;
  private fuel = bar("#ffb35c");
  private hull = bar("#8ab4e8");
  private heat = bar("#ff7a4a");
  private cargo = bar("#c8a070");
  private tick = h("div.tick");
  private liftTick = h("div.lifttick", icon("lift", 1));
  private fuelG: HTMLElement; private hullG: HTMLElement; private heatG: HTMLElement; private cargoG: HTMLElement;
  private cargoTxt = h("span.v.n");
  private cargoTag = h("span.tag");
  private status = h("div.status");
  private cashT = new PxText(2, { color: "#f0d050", shade: "#b08a20", outline: "#05070a" });
  private dataT = new PxText(2, { color: "#8ff0ff", shade: "#3aa0b8", outline: "#05070a" });
  private depthT = new PxText(2, { color: "#eef0f4", shade: "#9aa4b4", outline: "#05070a" });
  private cashEl = this.cashT.el;
  private dataEl = this.dataT.el;
  private depthEl = this.depthT.el;
  private goalEl = h("div.goal");
  private right: HTMLElement;
  private gauge = h("canvas.gauge");
  private gaugeKey = "";
  private hotbar = h("div.hotbar");
  private slots: { el: HTMLElement; cnt: HTMLElement; key: string; count: number }[] = [];
  private hotbarKey = "";
  private everItem = false;
  map = h("canvas.minimap");
  private mapT = 0;
  mapOn: boolean | null = null; // null: by size (on at large sizes)
  heatSeen = 0;
  /** The cash the HUD shows; the depot count-up drives it while a sale ticks. */
  shownCash = 0;
  cashHold = false;
  private coinTarget = h("span");
  warn: Warn = null;

  constructor(private m: UiModel) {
    this.fuelG = h("div.g.fuel", icon("fuel"), h("div.barwrap", this.fuel.el));
    this.fuel.el.append(this.tick, this.liftTick);
    this.hullG = h("div.g.hull", icon("hull"), this.hull.el);
    this.cargoG = h("div.g.cargo", icon("cargo"), this.cargo.el, this.cargoTxt, this.cargoTag);
    this.heatG = h("div.g.heat.off", icon("heat"), this.heat.el);
    this.cluster = h("div.cluster.pn",
      h("div.row", this.fuelG, this.hullG),
      h("div.row", this.cargoG, this.heatG));
    this.right = h("div.readout.pn",
      h("div.r", this.coinTarget, icon("cash"), this.cashEl),
      h("div.r", icon("depth"), this.depthEl),
      h("div.r.dat", icon("data"), this.dataEl));
    this.coinTarget.className = "coins-at";
    this.el = h("div.hud",
      h("div.tl", this.cluster, this.status),
      h("div.tr", this.right, this.goalEl, this.map),
      this.gauge, this.hotbar);
    this.shownCash = m.cash;
  }

  /** Where flying coins land: the cash readout. */
  cashRect() { return this.cashEl.getBoundingClientRect(); }

  update(dt: number, view: GameView, big: boolean) {
    const m = this.m, p = view.pod;
    // fuel and the tick
    setBar(this.fuel, p.fuel / p.fuelMax);
    const need = p.fuelHome;
    const underground = p.y > 0.5;
    const sealed = underground && !Number.isFinite(need);
    const tickAt = Number.isFinite(need) ? clamp(need / p.fuelMax, 0, 1) : 0;
    this.tick.style.left = `${tickAt * 100}%`;
    this.liftTick.style.left = `${tickAt * 100}%`;
    toggle(this.tick, "off", !underground || !Number.isFinite(need) || need <= 0);
    toggle(this.liftTick, "off", !underground || view.liftDepth <= 0 || !Number.isFinite(need) || p.y <= view.liftDepth);
    const f = p.fuel;
    let fw = 0; // 0 fine, 1 amber tick, 2 head up, 3 turn back, 4 not enough
    if (underground && !m.seed && Number.isFinite(need) && need > 0) fw = f < need ? 4 : f < need * 1.05 ? 3 : f < need * 1.3 ? 2 : f < need * 2 ? 1 : 0;
    toggle(this.tick, "amber", fw === 1 || fw === 2);
    toggle(this.tick, "red", fw >= 3);
    toggle(this.fuelG, "amber", fw === 2);
    toggle(this.fuelG, "red", fw >= 3 || sealed);
    toggle(this.fuelG, "flash", underground && f < p.fuelMax * 0.15);
    // hull
    const hf = p.hull / p.hullMax;
    setBar(this.hull, hf);
    toggle(this.hullG, "amber", hf < 0.5 && hf >= 0.25);
    toggle(this.hullG, "red", hf < 0.25);
    toggle(this.hullG, "crit", hf < 0.1);
    // heat: shows while it is above 0 and for 10 s after
    if (p.heat > 0.005) this.heatSeen = 10; else this.heatSeen = Math.max(0, this.heatSeen - dt);
    toggle(this.heatG, "off", this.heatSeen <= 0);
    setBar(this.heat, p.heat);
    toggle(this.heatG, "red", p.heat > 0.8);
    // cargo: one segment per slot while they fit, then groups of five
    const per = p.cargoMax <= 40 ? 1 : 5;
    this.cargo.el.style.setProperty("--seg", `${(100 / p.cargoMax) * per}%`);
    setBar(this.cargo, p.cargoUsed / p.cargoMax);
    setText(this.cargoTxt, `${p.cargoUsed}/${p.cargoMax}`);
    const full = p.cargoUsed >= p.cargoMax;
    const heavy = p.load >= 3;
    setText(this.cargoTag, full ? "Full" : heavy ? "Heavy" : "");
    toggle(this.cargoG, "full", full);
    toggle(this.cargoG, "heavy", heavy && !full);

    // the status line: the most urgent thing, in plain words
    let w: Warn = null;
    if (sealed) {
      const has = (k: string) => (m.items.find((i) => i.key === k)?.count ?? 0) > 0;
      w = { text: has("dynamite") || has("charge") || has("teleport") ? "Sealed in. Blast a way out, teleport, or Enter for a tow." : "Sealed in. Enter tows the pod home.", tone: "bad" };
    }
    else if (underground && p.fuel <= 0) w = { text: "Out of fuel", tone: "bad" };
    else if (fw === 4) {
      const cell = m.items.find((i) => i.key === "fuel");
      const cells = Math.ceil((need - f) / (p.fuelMax * 0.5));
      w = { text: cell && cell.count >= cells ? `Not enough to get home. ${cells} fuel cell${cells > 1 ? "s" : ""} covers it.` : "Not enough to get home", tone: "bad" };
    } else if (hf < 0.1 && underground) w = { text: "Hull failing", tone: "bad" };
    else if (p.heat > 0.95) w = { text: "Overheating", tone: "bad" };
    else if (fw === 3) w = { text: "Turn back now", tone: "bad" };
    else if (hf < 0.25 && underground) w = { text: "Hull low", tone: "bad" };
    else if (p.heat > 0.8) w = { text: "Too hot. Climb or cool down.", tone: "warn" };
    else if (fw === 2) w = { text: "Head up soon", tone: "warn" };
    this.warn = w;
    setText(this.status, w?.text ?? "");
    toggle(this.status, "bad", w?.tone === "bad");
    toggle(this.status, "on", !!w);

    // readouts
    if (!this.cashHold) {
      const d = m.cash - this.shownCash;
      this.shownCash = Math.abs(d) < 1 ? m.cash : this.shownCash + d * Math.min(1, dt * 10);
    }
    const ps = big ? 3 : 2;
    this.cashT.set(num(this.shownCash), ps);
    this.depthT.set(`${num(Math.max(0, Math.floor(p.y)) * 10)} M`, ps);
    this.dataT.set(num(m.data), ps);
    setText(this.goalEl, m.goal);

    this.updateHotbar(dt);
    this.drawGauge(view);
    const mapOn = (this.mapOn ?? big) && p.y > 0.5;
    toggle(this.map, "off", !mapOn);
    this.mapT -= dt;
    if (mapOn && this.mapT <= 0) { this.mapT = 0.15; this.drawMap(view); }
  }

  /** Flash a hotbar slot (item used) or deny it. */
  pulseSlot(key: string, ok: boolean) {
    const s = this.slots.find((x) => x.key === key);
    if (!s) return;
    s.el.classList.remove("used", "no");
    void s.el.offsetWidth;
    s.el.classList.add(ok ? "used" : "no");
  }
  flashCargo() { this.cargoG.classList.remove("ping"); void this.cargoG.offsetWidth; this.cargoG.classList.add("ping"); }

  private updateHotbar(_dt: number) {
    const items = this.m.items.filter((i) => i.open && (i.key !== "overcharge" || this.m.view.modules.includes("overcharge")));
    if (items.some((i) => i.count > 0) || items.some((i) => i.key === "overcharge")) this.everItem = true;
    toggle(this.hotbar, "off", !this.everItem);
    const key = items.map((i) => i.key).join();
    if (key !== this.hotbarKey) {
      this.hotbarKey = key;
      this.hotbar.textContent = "";
      this.slots = items.map((i) => {
        const cnt = h("span.cnt.n");
        const el = h("div.slot.pn", h("span.k", String(i.slot)), icon(iconOf(i.key), 2), cnt, h("div.cd"));
        this.hotbar.append(el);
        return { el, cnt, key: i.key, count: -1 };
      });
    }
    for (const s of this.slots) {
      const it = items.find((i) => i.key === s.key)!;
      if (it.key === "overcharge") {
        const cd = it.cooldown ?? 0;
        setText(s.cnt, cd > 0 ? `${Math.ceil(cd)}` : "");
        toggle(s.el, "empty", cd > 0);
      } else {
        if (it.count !== s.count) { s.count = it.count; setText(s.cnt, String(it.count)); }
        toggle(s.el, "empty", it.count <= 0);
      }
    }
  }

  private drawGauge(view: GameView) {
    const c = this.gauge, dpr = Math.min(2, devicePixelRatio || 1);
    const cw = 12, ch = Math.max(40, c.clientHeight || 300);
    const p = view.pod;
    const crate = this.m.crate;
    const key = `${ch}|${Math.round(p.y * 4)}|${view.liftDepth}|${crate?.y ?? -1}|${this.m.records.deepest}|${dpr}`;
    if (key === this.gaugeKey) return;
    this.gaugeKey = key;
    if (c.width !== cw * dpr || c.height !== Math.round(ch * dpr)) { c.width = cw * dpr; c.height = Math.round(ch * dpr); }
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cw, ch);
    const yOf = (row: number) => Math.round(clamp(row / ROWS, 0, 1) * (ch - 2)) + 1;
    const gx = cw - 5; // the 4 px column
    g.fillStyle = "#000000aa";
    g.fillRect(gx - 1, 0, 6, ch);
    for (let b = 0; b < 7; b++) {
      const y0 = yOf(BIOME_TOP[b]), y1 = b < 6 ? yOf(BIOME_TOP[b + 1]) : ch - 1;
      g.globalAlpha = 0.4; g.fillStyle = BIOME_COLORS[b]; g.fillRect(gx, y0, 4, y1 - y0);
      g.globalAlpha = 1;
    }
    // explored: brighter down to the deepest row
    g.fillStyle = "#ffffff30";
    g.fillRect(gx, 1, 4, yOf(this.m.records.deepest) - 1);
    // the Lift rail and its head bracket
    if (view.liftDepth > 0) {
      const y = yOf(view.liftDepth);
      g.fillStyle = "#9aa4b4";
      g.fillRect(gx, 1, 1, y);
      g.fillRect(gx, y, 4, 1); g.fillRect(gx + 3, y - 2, 1, 3);
    }
    if (crate) { const y = yOf(crate.y); g.fillStyle = "#000"; g.fillRect(gx - 4, y - 2, 5, 5); g.fillStyle = "#ffb35c"; g.fillRect(gx - 3, y - 1, 3, 3); }
    // the pod: a 6x3 marker sticking out to the left
    const py = yOf(Math.max(0, p.y));
    g.fillStyle = "#000"; g.fillRect(gx - 4, py - 2, 9, 5);
    g.fillStyle = "#ffd870"; g.fillRect(gx - 3, py - 1, 7, 3);
  }

  private drawMap(view: GameView) {
    const c = this.map, dpr = Math.min(2, devicePixelRatio || 1);
    const tw = W, th = 64, px = 2;
    const cw = tw * px, ch = th * px;
    if (c.width !== cw * dpr) { c.width = cw * dpr; c.height = ch * dpr; }
    const g = c.getContext("2d")!;
    const wd = view.world, p = view.pod;
    const rows = wd.mat.length / W;
    const top = Math.round(clamp(p.y - th / 2, -4, rows - th));
    const img = g.createImageData(cw * dpr, ch * dpr);
    const s = px * dpr;
    const put = (x: number, y: number, rgb: number[]) => {
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) {
        const o = ((y * s + yy) * cw * dpr + x * s + xx) * 4;
        img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = 255;
      }
    };
    for (let y = 0; y < th; y++) {
      const row = top + y;
      for (let x = 0; x < tw; x++) {
        if (row < 0) { put(x, y, row === -1 ? [96, 140, 70] : [44, 58, 84]); continue; } // the town strip: sky, then grass
        const i = row * W + x;
        // what is on screen around the pod counts as seen: the map never shows less than the view
        const near = Math.abs(x + 0.5 - p.x) <= 12 && Math.abs(row + 0.5 - p.y) <= 8;
        const fl = wd.flag[i] | (near ? FLAG.SEEN : 0), mat = wd.mat[i];
        const tint = BIOME_RGB[BIOME_SLOT[wd.biome[i]] ?? 0];
        let rgb: number[];
        if (fl & FLAG.LIFT) rgb = [216, 222, 232];
        else if (mat && MATERIALS[mat]?.kind === "liquid" && fl & FLAG.SEEN) rgb = [255, 122, 42];
        else if (isOpen(mat) && fl & (FLAG.SEEN | FLAG.DUG)) rgb = [150, 162, 184]; // explored tunnels: light
        else if (fl & FLAG.SEEN) rgb = mixRgb([52, 56, 68], tint, 0.5); // rock you have seen
        else rgb = mixRgb([24, 26, 34], tint, 0.38); // rock not yet seen: the biome's tint, never a black box
        const fd = wd.find[i];
        if (fd && mat && fl & (FLAG.SCANNED | FLAG.SEEN)) rgb = hexRgb(findById(fd)?.colors[1] ?? "#ffffff");
        put(x, y, rgb);
      }
    }
    g.putImageData(img, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.m.crate) {
      const cy = (Math.floor(this.m.crate.y) - top) * px;
      if (cy >= 0 && cy < ch) { g.fillStyle = "#000"; g.fillRect(Math.floor(this.m.crate.x) * px - 2, cy - 2, px + 4, px + 4); g.fillStyle = "#ffb35c"; g.fillRect(Math.floor(this.m.crate.x) * px - 1, cy - 1, px + 2, px + 2); }
    }
    // the pod: a bright dot that blinks
    const sx = Math.floor(p.x) * px, sy = (Math.floor(p.y) - top) * px;
    const on = Math.floor(performance.now() / 300) % 2 === 0;
    g.fillStyle = "#000"; g.fillRect(sx - 3, sy - 3, px + 6, px + 6);
    g.fillStyle = on ? "#ffffff" : "#ffd870"; g.fillRect(sx - 2, sy - 2, px + 4, px + 4);
  }
}

/** Air and liquids are open on the map (lava shows by its own colour below). */
const isOpen = (mat: number) => mat === 0 || MATERIALS[mat]?.kind === "liquid";
const hexRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRgb = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v * (1 - k) + b[i] * k));
/** The map's rock tint per biome: the biome's rock, not its accent (Topsoil is earth, not grass). */
const BIOME_RGB = ["#9a6a40", "#7a808c", "#5a6ac8", "#2aa08a", "#c8501a", "#7a8a4a", "#9a5aa8"].map(hexRgb);
/** Biome id (world.ts BIOMES, 0..8) to its depth slot: the planet biomes take their slot's colour. */
const BIOME_SLOT = BIOMES.map((b) => b.slot);

export const ITEM_ICON: Record<string, string> = {
  fuel: "fuelcell", repair: "repair", dynamite: "dynamite", charge: "charge", teleport: "teleport", coolant: "coolant", overcharge: "overcharge",
};
export const iconOf = (key: string) => ITEM_ICON[key] ?? key;
