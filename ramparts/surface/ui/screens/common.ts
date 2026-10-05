// Pieces every between-battle screen shares: cards, the run band, the mute toggle.
import type { Card, RunState, TowerId } from "../../../game/types.ts";
import { ACTS, DAMAGE, RARITY, SUPPLIES, TOWERS, boon, boonTower, curse, relic } from "../content.ts";
import { h, raw, roman, sfx, kbd, pulse } from "../dom.ts";
import { boonIcon, icon, relicGlyph, towerIcon, TOWER_ACCENT } from "../icons.ts";
import type { Ctx } from "../index.ts";
import { statsOf } from "../query.ts";
import { tip, type TipSpec } from "../tooltip.ts";
import { warTable } from "./wartable.ts";

export function mute(ctx: Ctx) {
  ctx.setSettings({ muted: !ctx.settings.muted });
  if (!ctx.settings.muted) sfx("click");
  document.querySelectorAll(".mutebtn").forEach((b) => { b.innerHTML = icon(ctx.settings.muted ? "mute" : "sound", { size: 15, accent: "#C9A45A" }); pulse(b, "pop"); });
}

export function cardName(c: Card): string {
  return c.kind === "blueprint" ? TOWERS[c.tower].name : c.kind === "boon" ? boon(c.boon).name : c.kind === "relic" ? relic(c.relic).name : SUPPLIES[c.supply].name;
}

/** Plain-words tooltip with the full text of a card (R30: the card body is short, the tip is whole). */
export function cardTip(c: Card): TipSpec {
  if (c.kind === "blueprint") {
    const T = TOWERS[c.tower];
    return { title: T.name, glyph: towerIcon(c.tower, 16), line: T.line, meta: `Adds a tower to your war table, on the next free key. ${DAMAGE[T.dmg].name}: ${DAMAGE[T.dmg].line}`, flavour: T.flavour };
  }
  if (c.kind === "boon") {
    const B = boon(c.boon);
    const who = (B.tower ?? c.tower) ? TOWERS[(B.tower ?? c.tower)!].name : "any tower";
    return { title: B.name, glyph: boonIcon(B.tower ?? c.tower, 16), line: B.text, meta: `A boon for <b>${who}</b>: better for the rest of the run.${B.tempered ? `<br>Tempered (+): ${B.tempered}` : ""}${B.keystone ? "<br>A keystone: changes how the tower works." : ""}` };
  }
  if (c.kind === "supply") { const S = SUPPLIES[c.supply]; return { title: S.name, glyph: icon(c.supply, { size: 16, accent: "#C9A45A" }), line: S.text, meta: "A war supply: one use in battle, on E or D.", flavour: S.flavour }; }
  const R = relic(c.relic);
  return { title: R.name, glyph: icon(relicGlyph(c.relic), { size: 16, accent: "#D9B86A" }), line: R.text, meta: (R.downside ? `<span class="c-bad">${R.downside}</span><br>` : "") + "A lasting effect for the whole run.", flavour: R.flavour };
}

/** A card (art 7.3). `key` adds the hotkey badge. */
export function cardEl(c: Card, o: { key?: string; size?: "small" | "tiny" | ""; onPick?: () => void; extra?: HTMLElement; tempered?: boolean } = {}): HTMLElement {
  const rar = c.rarity;
  let glyph: string, art: string, name: string, type: string, body: string, accent: string, stats: HTMLElement | null = null, dt: HTMLElement | null = null, down = "";
  let cls = "";
  if (c.kind === "blueprint") {
    const T = TOWERS[c.tower];
    accent = TOWER_ACCENT[c.tower];
    glyph = towerIcon(c.tower, 16); art = towerIcon(c.tower, 48); name = T.name; type = "New tower"; body = T.line;
    dt = h("span.dt", { style: { "--dc": DAMAGE[T.dmg].color } }, raw(icon(T.dmg === "none" ? "banner" : T.dmg, { size: 11, accent: DAMAGE[T.dmg].color })), DAMAGE[T.dmg].name);
    const s = statsOf(null, c.tower, 1, null);
    stats = h("div.sr",
      s.damage != null ? h("span.stat", raw(icon("sword", { size: 11 })), h("span.num", String(s.damage))) : null,
      s.interval != null ? h("span.stat", raw(icon("clock", { size: 11 })), h("span.num", `${s.interval}s`)) : null,
      h("span.stat", raw(icon("range", { size: 11, accent: "#EBD08F" })), h("span.num", String(s.range))),
      h("span.stat", raw(icon(s.air ? "air" : "build", { size: 11 }))));
  } else if (c.kind === "boon") {
    const B = boon(c.boon);
    const tw = (B.tower ?? c.tower) as TowerId | null;
    void boonTower;
    accent = tw ? TOWER_ACCENT[tw] : "#6FD88A";
    glyph = boonIcon(tw, 16); art = boonIcon(tw, 48); name = B.name + (o.tempered ? "+" : "");
    type = B.keystone ? "Keystone" : "Boon"; body = B.text;
    dt = h("span.dt", tw ? TOWERS[tw].name : "Any tower");
  } else if (c.kind === "supply") {
    const S = SUPPLIES[c.supply];
    accent = "#C9A45A"; cls = "relic";
    glyph = icon(c.supply, { size: 16, accent }); art = icon(c.supply, { size: 48, accent }); name = S.name; type = "War supply"; body = S.text;
    dt = h("span.dt", "One use");
  } else {
    const R = relic(c.relic);
    accent = "#D9B86A"; cls = "relic";
    glyph = icon(relicGlyph(c.relic), { size: 16, accent }); art = icon(relicGlyph(c.relic), { size: 48, accent }); name = R.name; type = "Relic";
    body = R.text; down = R.downside ?? "";
    dt = h("span.dt", RARITY[rar].name);
  }
  const el = h(`button.card.r-${rar}${cls ? "." + cls : ""}${o.size ? "." + o.size : ""}${down || name.length > 14 ? ".two" : ""}`, { style: { "--ac": accent }, onclick: () => o.onPick?.() },
    h("span.cf"), h("span.cb"),
    h("span.ci",
      h("span.ch", h("span.gt", raw(glyph)), h("span.cn", name), h("span.gem")),
      h("span.art", raw(art), h("span.plate")),
      h("span.ty", type, dt),
      h("span.bd", body),
      down ? h("span.dn", down) : null,
      stats),
    o.key ? h("span.kb", kbd(o.key)) : null,
    o.extra ?? null,
  );
  el.addEventListener("pointerenter", () => sfx("hover"));
  return tip(el, () => cardTip(c));
}

export function curseCard(id: string): HTMLElement {
  const C = curse(id);
  const el = h("div.card.curse.tiny.r-boss", { "data-nav": "", tabindex: "0", style: { "--rc": "#8a2f3e" } }, h("span.cf"), h("span.cb"),
    h("span.ci", h("span.ch", h("span.gt", raw(icon("curse", { size: 16, accent: "#E05A6A" }))), h("span.cn", C.name)), h("span.art", raw(icon("curse", { size: 40, accent: "#E05A6A" }))), h("span.ty", "Curse")));
  return tip(el, { title: C.name, glyph: icon("curse", { size: 16, accent: "#E05A6A" }), line: C.text, meta: "A lasting problem until you lift it.", flavour: C.flavour });
}

/** The run's top band: act, lives, crowns, relics, war table (V), mute. */
export function runBand(ctx: Ctx, run: RunState, title?: string, extra?: HTMLElement[]): HTMLElement {
  const A = ACTS[run.act];
  const lives = tip(h("div.stat", raw(icon("life", { size: 14, accent: "#FF5D5D" })), h("span.num", `${run.loadout.lives}`), h("span.unit", `/ ${run.loadout.maxLives}`)), { title: "Lives", glyph: icon("life", { size: 16, accent: "#FF5D5D" }), line: "Lost when enemies reach your gate. At zero the run ends." });
  const crowns = tip(h("div.stat.crowns", raw(icon("crown", { size: 14, accent: "#B89CFF" })), h("span.num.c-crown", String(run.crowns))), { title: "Crowns", glyph: icon("crown", { size: 16, accent: "#B89CFF" }), line: "Kept all run. Spent at shops and some events." });
  const relics = h("div.brel", ...run.loadout.relics.slice(0, 8).map((id) => {
    const R = relic(id);
    return tip(h("span.ri", raw(icon(relicGlyph(id), { size: 15, accent: "#D9B86A" }))), { title: R.name, glyph: icon(relicGlyph(id), { size: 16, accent: "#D9B86A" }), line: R.text, meta: R.downside ? `<span class="c-bad">${R.downside}</span>` : "", flavour: R.flavour });
  }), run.loadout.relics.length > 8 ? h("span.sm", `+${run.loadout.relics.length - 8}`) : null);
  const wt = tip(h("button.btn.sec.wtbtn", { onclick: () => { sfx("open"); warTable(ctx, run); } }, raw(icon("wartable", { size: 14, accent: "#C9A45A" })), h("span.wl", "War table"), kbd("V")), { title: "War table", line: "Your towers, boons, relics and curses for this run.", keys: ["V"] });
  const m = tip(h("button.btn.ghost.icon.mutebtn", { onclick: () => mute(ctx) }, raw(icon(ctx.settings.muted ? "mute" : "sound", { size: 15, accent: "#C9A45A" }))), { title: "Sound", line: "Mute or unmute.", keys: ["M"] });
  return h("div.band.live",
    h("span.title", title ?? `${A.title}: ${A.name}`),
    h("span.sp"), ...(extra ?? []), lives, crowns, relics, wt, m);
}

/** The table screen frame: walnut table, band, body. */
export function tableScreen(cls: string, band: HTMLElement | null, ...body: HTMLElement[]): HTMLElement {
  return h(`div.${cls}.table`, band, h("div.tbody", ...body));
}

export const lvl = roman;
