// Reward (art 7.9, 7.12, run-meta 3): the battle's crowns tally rolls in line by line, then pick one
// of three (or more) cards; skip for crowns, reroll and strike off when owned. Relic screens (elite,
// bonus, boss with the next act rolling in) use the same frame. Also "war table full" (replace).
import type { Card, RunState } from "../../../game/types.ts";
import { choices, nextMap } from "../../../game/run/index.ts";
import { ACTS, BOSSES, TOWERS, boonTower } from "../content.ts";
import { h, raw, roll, sfx, kbd, pulse, wait } from "../dom.ts";
import { icon, towerIcon, TOWER_ACCENT } from "../icons.ts";
import type { Ctx, Screen, ScreenSpec } from "../index.ts";
import { tip } from "../tooltip.ts";
import { cardEl, runBand } from "./common.ts";
import { note } from "./notes.ts";

type Reward = Extract<RunState["screen"], { s: "reward" }>;
const TITLES: Record<string, string> = { battle: "Battle won", bounty: "Battle won", ambush: "Ambush beaten", elite: "Elite defeated", boss: "Boss defeated", bonus: "Bounty met" };

export function rewardScreen(ctx: Ctx, run: RunState, boss: boolean): Screen {
  let r = run;
  let scr = r.screen as Reward;
  let done = false, banishMode = false;
  const header = h("div.rw-head");
  const row = h("div.rw-row");
  const foot = h("div.rw-foot");
  const tallyEl = h("div.rw-tally");
  const crownsBand = () => document.querySelector<HTMLElement>(".band .crowns .num");

  const opts = () => choices(r);
  const keyOf = (prefix: string) => opts().find((c) => c.key.startsWith(prefix));
  const pick = (i: number) => {
    if (done) return;
    const cards = [...row.querySelectorAll<HTMLElement>(".card")];
    if (!cards[i]) return;
    const relicMode = !scr.cards.length;
    if (banishMode && !relicMode) {
      banishMode = false; row.classList.remove("banishing");
      sfx("page"); pulse(cards[i], "shake");
      cards[i].classList.add("fold");
      setTimeout(() => ctx.host.choose(`banish:${i}`), 200);
      return;
    }
    done = true;
    sfx(relicMode ? "relic" : "card_pick");
    cards.forEach((c, j) => c.classList.add(j === i ? "picked" : "fold"));
    setTimeout(() => ctx.host.choose(relicMode ? `relic:${i}` : `card:${i}`), 420);
  };
  const skip = () => {
    if (done || !keyOf("skip")) return;
    done = true; sfx("back");
    row.querySelectorAll(".card").forEach((c) => c.classList.add("fold"));
    setTimeout(() => ctx.host.choose("skip"), 220);
  };
  const reroll = () => { if (!keyOf("reroll") || done) return; sfx("card_flip"); row.querySelectorAll(".card").forEach((c) => c.classList.add("fold")); setTimeout(() => ctx.host.choose("reroll"), 200); };
  const banish = () => { if (!keyOf("banish")) return; banishMode = !banishMode; row.classList.toggle("banishing", banishMode); sfx("click"); };

  function render(flip: boolean) {
    row.replaceChildren(); foot.replaceChildren(); header.replaceChildren();
    const relics = scr.relics ?? [];
    const relicMode = !scr.cards.length;
    if (relicMode && relics.length) {
      header.append(h("div.h1", boss ? "Choose a boss relic" : "Take a relic"), h("div.sm", boss ? "Strong, with a price. Read the red line." : "A lasting effect for the whole run."));
      relics.forEach((id, i) => {
        const c = opts().find((x) => x.key === `relic:${i}`)?.card ?? ({ kind: "relic", relic: id, rarity: boss ? "boss" : "uncommon" } as Card);
        row.append(cardEl(c, { key: String(i + 1), onPick: () => pick(i) }));
      });
    } else if (scr.cards.length) {
      header.append(h("div.h1", scr.extra ? "A second reward" : "Choose one"));
      scr.cards.forEach((c, i) => row.append(cardEl(c, { key: String(i + 1), onPick: () => pick(i) })));
      row.classList.toggle("five", scr.cards.length >= 4);
    } else header.append(h("div.h1", TITLES[scr.source ?? "battle"] ?? "Onward"));
    const sk = keyOf("skip");
    if (sk) {
      const crowns = /\+(\d+)/.exec(sk.label)?.[1];
      foot.append(tip(h(`button.btn.${relicMode || crowns ? "sec" : "big"}`, { onclick: skip, ...(!relics.length && !scr.cards.length ? { "data-first": "" } : {}) }, crowns ? raw(icon("crown", { size: 14, accent: "#B89CFF" })) : null, crowns ? `Skip for +${crowns} crowns` : sk.label, kbd(relicMode && !relics.length ? "Enter" : "S")),
        { title: sk.label, line: crowns ? "Take crowns instead of a card." : relicMode ? "Go on without a relic." : "" }));
    }
    const rr = keyOf("reroll");
    if (rr) foot.append(tip(h("button.btn.sec", { onclick: reroll }, raw(icon("reroll", { size: 14, accent: "#C9A45A" })), "Reroll", kbd("R")), { title: "Reroll", line: rr.text ?? "" }));
    if (keyOf("banish")) foot.append(tip(h("button.btn.sec", { onclick: banish }, raw(icon("banish", { size: 14, accent: "#FF6B5B" })), "Strike off", kbd("B")), { title: "Strike off", line: "Press, then pick a card: it is never offered again this run." }));
    const cards = [...row.querySelectorAll<HTMLElement>(".card")];
    cards.forEach((c, i) => {
      c.style.setProperty("--rot", `${(i - (cards.length - 1) / 2) * 4}deg`);
      if (flip) { c.classList.add("flip-in"); c.style.animationDelay = `${100 + i * 110 + (c.classList.contains("r-rare") ? 160 : 0)}ms`; }
    });
    if (flip) cards.forEach((c, i) => setTimeout(() => sfx(c.classList.contains("r-rare") ? "relic" : "card_flip"), 100 + i * 110));
    requestAnimationFrame(() => (cards[Math.floor((cards.length - 1) / 2)] ?? foot.querySelector<HTMLElement>("button"))?.focus());
  }

  // The crowns tally first (when this is the first screen after a battle), then the choice.
  const tally = scr.tally ?? [];
  let tallyDone = !tally.length;
  const playTally = async () => {
    const total = h("span.num.c-crown", "0");
    tallyEl.replaceChildren(h("div.tl-h", h("span.cz", TITLES[scr.source ?? "battle"] ?? "Battle won"), h("span.tl-l")),
      h("div.tl-lines"), h("div.tl-sum", raw(icon("crown", { size: 15, accent: "#B89CFF" })), h("span", "+"), total, h("span.sm", "crowns")));
    const lines = tallyEl.querySelector(".tl-lines")!;
    let sum = 0;
    await wait(250);
    for (const t of tally) {
      const n = h("span.num");
      const v = t.crowns != null ? h(`span.tv${t.crowns < 0 ? ".c-bad" : ""}`, t.crowns < 0 ? "" : "+", n, raw(icon("crown", { size: 10, accent: "#B89CFF" })))
        : h("span.tv.c-good", `+${t.lives}`, raw(icon("life", { size: 10, accent: "#FF5D5D" })));
      lines.append(h("div.tl-row", h("span", t.label), v));
      sfx("page", { vol: 0.6 });
      if (t.crowns != null) {
        if (!tallyDone) await roll(n, 0, t.crowns, 320, (x) => { if (x % 2 === 0) sfx("coin", { vol: 0.4, pitch: 1 + Math.abs(x) * 0.012 }); }); else n.textContent = String(t.crowns);
        const from = sum; sum += t.crowns;
        void roll(total, from, sum, tallyDone ? 0 : 260);
        const cb = crownsBand(); if (cb) pulse(cb, "pop");
      }
      if (!tallyDone) await wait(130);
    }
    tallyDone = true;
  };
  if (tally.length) void playTally();
  render(true);

  const preview = boss && r.act < 4 ? nextActPreview(r) : null;
  const el = h(`div.reward-scr.table.dim${boss ? ".boss" : ""}`, runBand(ctx, r), h("div.tbody.rw-body", tally.length ? tallyEl : null, h("div.rw-main", header, row, foot), preview));
  if (!boss && scr.cards.length) note(ctx, "reward", "Take one. New towers go on keys 1-6.", el);
  if (boss) note(ctx, "bossrelic", "Boss relics are strong but have a price. Read the red line.", el);
  return {
    el, noAutoFocus: true,
    key(e) {
      const k = e.key.toLowerCase();
      if (/^[1-5]$/.test(k)) { pick(+k - 1); return true; }
      if (k === "s") { skip(); return true; }
      if (k === "enter" && !row.querySelector(".card")) { skip(); return true; }
      if (k === "r") { reroll(); return true; }
      if (k === "b") { banish(); return true; }
      return false;
    },
    update(spec: ScreenSpec) {
      if (spec.s !== "run" || spec.run.screen.s !== "reward") return false;
      const s2 = spec.run.screen;
      // Reroll / strike off: the same reward with new cards, flipped in place.
      const same = s2.source === scr.source && !s2.tally?.length && s2.cards.length > 0 && scr.cards.length > 0 && !!s2.extra === !!scr.extra;
      if (!same) return false;
      r = spec.run; scr = s2; done = false; render(true);
      return true;
    },
  };
}

function nextActPreview(r: RunState): HTMLElement {
  const act = (r.act + 1) as 2 | 3 | 4;
  const A = ACTS[act];
  const m = nextMap(r);
  const B = m ? BOSSES[m.boss] : null;
  return h("div.nextact.pn.deep",
    h("div.lab", "Next"),
    h("div.na-t.cz", `${A.title}: ${A.name}`),
    h("div.na-l", { style: { background: `linear-gradient(90deg, transparent, ${A.key}, transparent)` } }),
    h("div.sm", A.mood),
    B ? h("div.na-b", raw(icon("boss", { size: 18, accent: A.key })), h("div", h("div.cz", B.name), h("div.sm", B.tip))) : null,
    A.trait ? h("div.na-tr", raw(icon("info", { size: 12 })), h("span", A.trait)) : null);
}

/** War table full: choose which tower the new tower card replaces (its boons pay 10 crowns each). */
export function replaceScreen(ctx: Ctx, run: RunState): Screen {
  const scr = run.screen as Extract<RunState["screen"], { s: "replace" }>;
  const opts = choices(run);
  const L = run.loadout;
  const tiles = L.towers.map((t, i) => {
    const o = opts.find((x) => x.key === `replace:${t}`);
    const n = L.boons.filter((b) => boonTower(b, L.boonOn) === t).length;
    const el = h("button.rp-t.pn.raised", { style: { "--ac": TOWER_ACCENT[t] }, onclick: () => choose(`replace:${t}`) },
      h("span.kbd", String(i + 1)), raw(towerIcon(t, 28)), h("span.cz", TOWERS[t].name), h("span.sm", n ? `${n} boon${n > 1 ? "s" : ""}: +${n * 10}` : "No boons"));
    return tip(el, { title: o?.label ?? TOWERS[t].name, glyph: towerIcon(t, 16), line: o?.text ?? "" });
  });
  const choose = (k: string) => { sfx(k === "keep" ? "back" : "card_pick"); ctx.host.choose(k); };
  const el = h("div.replace-scr.table.dim", runBand(ctx, run),
    h("div.tbody.cen",
      h("div.h1", "Your war table is full"),
      h("div.sm", "Six towers is the most you can carry. Choose one to give up, or keep your table."),
      h("div.rp-row", h("div.rp-new", cardEl(scr.card, { size: "small" }), h("div.rp-arrow", "›")), h("div.rp-grid", ...tiles)),
      h("button.btn.ghost", { onclick: () => choose("keep") }, opts.find((x) => x.key === "keep")?.label ?? "Keep my towers", kbd("⌫"))));
  return {
    el,
    key(e) {
      if (/^[1-6]$/.test(e.key) && L.towers[+e.key - 1]) { choose(`replace:${L.towers[+e.key - 1]}`); return true; }
      if (e.key === "Backspace") { choose("keep"); return true; }
      return false;
    },
  };
}
