// Forge, camp, treasure (art 7.9, run-meta 2) and the generic "pick one" screen the run rules raise
// for their sub-steps (hone a tower, temper a boon, lift a curse, a rare boon, a card choice...).
import type { PickOption, RunState } from "../../../game/types.ts";
import { choices, restHeal, type Choice } from "../../../game/run/index.ts";
import { FORGE_GLYPH, REST_GLYPH, SUPPLIES, TOWERS, boon, boonTower, curse, relic } from "../content.ts";
import { h, raw, roll, sfx, kbd, pulse, wait } from "../dom.ts";
import { boonIcon, icon, towerIcon, TOWER_ACCENT } from "../icons.ts";
import type { Ctx, Screen } from "../index.ts";
import { tip } from "../tooltip.ts";
import { cardEl, runBand } from "./common.ts";
import { note } from "./notes.ts";

/** A big choice tile (forge and camp options). */
function choiceTile(i: number, glyph: string, c: Choice, on: () => void) {
  // No tooltip: the tile already shows its name, text and reason, and a tip would cover the heading.
  const b = h(`button.choice.pn.raised${c.disabled ? ".off" : ""}`, { onclick: () => { if (c.disabled) { sfx("deny"); pulse(b, "shake"); return; } on(); } },
    h("span.kbd.ck", String(i + 1)), h("span.cg", raw(icon(glyph, { size: 30, accent: "#E3B655" }))), h("span.cn.cz", c.label), c.text ? h("span.cl", c.text) : null, c.disabled ? h("span.cw.c-bad", c.disabled) : null);
  return b;
}
const numKeys = (tiles: HTMLElement[]) => (e: KeyboardEvent) => { if (/^[1-9]$/.test(e.key) && tiles[+e.key - 1]) { tiles[+e.key - 1]!.click(); return true; } return false; };
const anvil = () => h("div.vig.anvil", raw(icon("forge", { size: 64, accent: "#B8733A" })), h("span.sparks"));
async function strike(v: HTMLElement) { for (let i = 0; i < 3; i++) { sfx("forge_hammer"); pulse(v, "strike"); await wait(200); } }

// ---------------------------------------------------------------- forge
export function forgeScreen(ctx: Ctx, run: RunState): Screen {
  const opts = choices(run);
  const vig = anvil();
  const main = opts.filter((c) => c.key !== "leave");
  const tiles = main.map((c, i) => choiceTile(i, FORGE_GLYPH[c.key] ?? "forge", c, () => { sfx("click"); pulse(vig, "strike"); sfx("forge_hammer"); ctx.host.choose(c.key); }));
  const lv = opts.find((c) => c.key === "leave");
  const el = h("div.forge-scr.table.dim", runBand(ctx, run),
    h("div.tbody.node-body", vig, h("div.fg-stage", h("div.h1", "The Forge"), h("div.sm", "Shape one tower's boons. Choose one."), h("div.choice-row", ...tiles),
      lv ? h("button.btn.ghost.back", { onclick: () => { sfx("back"); ctx.host.choose("leave"); } }, lv.label, kbd("⌫")) : null)));
  return { el, key(e) { if (e.key === "Backspace" && lv) { sfx("back"); ctx.host.choose("leave"); return true; } return numKeys(tiles)(e); } };
}

// ---------------------------------------------------------------- camp
export function restScreen(ctx: Ctx, run: RunState): Screen {
  const L = run.loadout;
  const opts = choices(run);
  const hearts = h("div.hearts", ...Array.from({ length: L.maxLives }, (_, i) => h(`span.hp${i < L.lives ? ".on" : ""}`, raw(icon("life", { size: L.maxLives > 26 ? 10 : 12, accent: "#FF5D5D" })))));
  const vig = h("div.vig.fire", h("span.glow"), raw(icon("rest", { size: 64, accent: "#FF9A50" })), h("span.embers", ...Array.from({ length: 7 }, (_, i) => h("i", { style: { left: `${30 + ((i * 37) % 40)}%`, animationDelay: `${i * 0.37}s` } }))));
  let busy = false;
  const doRest = async () => {
    busy = true;
    const to = Math.min(L.maxLives, L.lives + restHeal(run));
    const hs = hearts.querySelectorAll(".hp");
    for (let i = L.lives; i < to; i++) { hs[i]?.classList.add("on", "fill"); sfx("coin", { pitch: 1 + (i - L.lives) * 0.06, vol: 0.5 }); await wait(100); }
    sfx("rest");
    await wait(300);
    ctx.host.choose("rest");
  };
  const tiles = opts.map((c, i) => choiceTile(i, REST_GLYPH[c.key] ?? "rest", c, () => { if (busy) return; sfx("click"); if (c.key === "rest") void doRest(); else ctx.host.choose(c.key); }));
  const el = h("div.rest-scr.table.night", runBand(ctx, run),
    h("div.tbody.node-body", vig, h("div.fg-stage", h("div.h1", "Camp"), h("div.sm", "A quiet night. Heal, or train. Not both."), hearts, h("div.choice-row", ...tiles))));
  note(ctx, "rest", "A camp waits before every boss. Rest heals; Drill and Fortify make you stronger instead.", el);
  return { el, key: numKeys(tiles) };
}

// ---------------------------------------------------------------- treasure
export function treasureScreen(ctx: Ctx, run: RunState): Screen {
  const scr = run.screen as Extract<RunState["screen"], { s: "treasure" }>;
  let opened = false, taken = false;
  const chest = h("button.chest", { "data-first": "", onclick: () => void open() }, h("span.lid"), h("span.box"), h("span.lock"), h("span.light"));
  const reveal = h("div.tr-reveal");
  const crownsN = h("span.num.c-crown", "0");
  const take = h("button.btn.big", { onclick: () => doTake() }, "Take it all", kbd("Enter"));
  const hint = h("div.tr-hint.sm", kbd("Enter"), " open");
  const open = async () => {
    if (opened) return doTake();
    opened = true;
    chest.classList.add("open");
    hint.style.visibility = "hidden";
    sfx("card_flip");
    await wait(380);
    sfx("relic");
    reveal.replaceChildren(
      cardEl({ kind: "relic", relic: scr.relic, rarity: relic(scr.relic).rarity }, {}),
      h("div.tr-loot",
        h("div.tr-cr", raw(icon("crown", { size: 16, accent: "#B89CFF" })), h("span", "+"), crownsN, h("span.sm", " crowns")),
        scr.supply ? tip(h("div.tr-cr", raw(icon(scr.supply, { size: 16, accent: "#C9A45A" })), h("span", SUPPLIES[scr.supply].name)), { title: SUPPLIES[scr.supply].name, line: SUPPLIES[scr.supply].text, meta: "A war supply: one use in battle (E / D)." }) : null),
      take);
    reveal.querySelector(".card")!.classList.add("flip-in");
    reveal.classList.add("on");
    void roll(crownsN, 0, scr.crowns, 600, (v) => { if (v % 4 === 0) sfx("coin", { vol: 0.5 }); });
    requestAnimationFrame(() => take.focus());
  };
  const doTake = () => { if (taken) return; taken = true; sfx("card_pick"); ctx.host.choose("open"); };
  const el = h("div.treasure-scr.table.dim", runBand(ctx, run),
    h("div.tbody.cen", h("div.h1", "Treasure"), h("div.sm", "A chest by the road, still locked. Not for long."), h("div.tr-stage", chest, reveal), hint));
  return { el, key(e) { if (e.key === "Enter") { void open(); return true; } return false; } };
}

// ---------------------------------------------------------------- pick one (the rules' sub-steps)
export function pickScreen(ctx: Ctx, run: RunState): Screen {
  const scr = run.screen as Extract<RunState["screen"], { s: "pick" }>;
  const L = run.loadout;
  const forgeish = /hone|temper|recast|drill/.test(scr.act);
  let done = false;
  const vig = forgeish ? anvil() : scr.act === "lift" ? h("div.vig.candle", raw(icon("r-candle", { size: 56, accent: "#FFC07A" }))) : null;
  const choose = async (i: number, el: HTMLElement) => {
    const o = scr.options[i];
    if (!o || done) return;
    if (o.disabled) { sfx("deny"); pulse(el, "shake"); return; }
    done = true;
    el.classList.add(o.card ? "picked" : "chosen");
    if (scr.act.startsWith("temper") && vig) { el.classList.add("struck"); await strike(vig); }
    else sfx(o.card?.kind === "relic" ? "relic" : "card_pick");
    setTimeout(() => ctx.host.choose(`pick:${i}`), o.card ? 380 : 120);
  };
  const tiles = scr.options.map((o, i) => optionEl(o, i, L.boonOn, (el) => void choose(i, el)));
  const cards = scr.options.every((o) => o.card);
  const towers = scr.options.every((o) => o.tower && !o.card);
  const body = cards ? h("div.rw-row", ...tiles) : towers ? h("div.pick-row", ...tiles) : h("div.pick-grid", ...tiles);
  if (cards) tiles.forEach((c, i) => { c.classList.add("flip-in"); c.style.animationDelay = `${80 + i * 100}ms`; });
  const skipBtn = scr.skip ? h("button.btn.ghost", { onclick: () => { sfx("back"); ctx.host.choose("skip"); } }, scr.skip, kbd("⌫")) : null;
  const el = h("div.pick-scr.table.dim", runBand(ctx, run),
    h("div.tbody.node-body", vig, h("div.fg-stage", h("div.h1", scr.title), scr.text ? h("div.sm", scr.text) : null, body, skipBtn)));
  return {
    el,
    key(e) {
      if (/^[1-9]$/.test(e.key) && tiles[+e.key - 1]) { void choose(+e.key - 1, tiles[+e.key - 1]!); return true; }
      if ((e.key === "Backspace" || e.key === "s" || e.key === "S") && skipBtn) { skipBtn.click(); return true; }
      return false;
    },
  };
}

/** One option of a pick screen, drawn by what it carries. */
function optionEl(o: PickOption, i: number, boonOn: Record<string, string> | undefined, on: (el: HTMLElement) => void): HTMLElement {
  const off = o.disabled ? ".off" : "";
  let el: HTMLElement;
  if (o.card) el = cardEl(o.card, { key: String(i + 1), onPick: () => on(el) });
  else if (o.tower) {
    const t = o.tower;
    el = h(`button.pk-t.pn.raised${off}`, { style: { "--ac": TOWER_ACCENT[t] }, onclick: () => on(el) }, h("span.kbd", String(i + 1)), raw(towerIcon(t, 28)), h("span.cz", o.label), h("span.sm", o.disabled ?? o.text ?? ""));
    tip(el, { title: o.label, glyph: towerIcon(t, 16), line: TOWERS[t].line, meta: o.disabled ? `<span class="c-bad">${o.disabled}</span>` : o.text ?? "" });
  } else if (o.boon) {
    const B = boon(o.boon), tw = boonTower(o.boon, boonOn as never);
    el = h(`button.pk-b.pn.raised${off}`, { onclick: () => on(el) }, h("span.kbd", String(i + 1)), raw(boonIcon(tw, 20)), h("span.pt", h("span.bn", o.label), h("span.sm", o.text ?? B.text)));
    tip(el, { title: o.label, glyph: boonIcon(tw, 16), line: B.text, meta: B.tempered ? `Tempered (+): ${B.tempered}` : "" });
  } else if (o.curse) {
    el = h(`button.pk-b.pn.raised${off}`, { onclick: () => on(el) }, h("span.kbd", String(i + 1)), raw(icon("curse", { size: 20, accent: "#E05A6A" })), h("span.pt", h("span.bn", o.label), h("span.sm", o.text ?? curse(o.curse).text)));
    tip(el, { title: o.label, glyph: icon("curse", { size: 16, accent: "#E05A6A" }), line: curse(o.curse).text, meta: "A lasting problem until you lift it." });
  } else if (o.supply) {
    el = h(`button.pk-b.pn.raised${off}`, { onclick: () => on(el) }, h("span.kbd", String(i + 1)), raw(icon(o.supply, { size: 20, accent: "#C9A45A" })), h("span.pt", h("span.bn", o.label), h("span.sm", o.text ?? SUPPLIES[o.supply].text)));
    tip(el, { title: o.label, glyph: icon(o.supply, { size: 16 }), line: SUPPLIES[o.supply].text });
  } else {
    el = h(`button.pk-b.pn.raised${off}`, { onclick: () => on(el) }, h("span.kbd", String(i + 1)), raw(icon("star", { size: 18, accent: "#E3B655" })), h("span.pt", h("span.bn", o.label), h("span.sm", o.disabled ?? o.text ?? "")));
    tip(el, { title: o.label, line: o.text ?? "", meta: o.disabled ? `<span class="c-bad">${o.disabled}</span>` : "" });
  }
  if (!o.card) el.dataset.tipAt = "below";
  return el;
}
