// Commander select: five commanders, an ascension picker per commander (R26), Start.
import type { CommanderId } from "../../../game/types.ts";
import { ASCENSIONS, COMMANDERS, COMMANDER_IDS, SPELLS, TOWERS, commanderRelic } from "../content.ts";
import { h, raw, sfx, kbd, pulse, roman } from "../dom.ts";
import { commanderGlyph, icon, towerIcon, relicGlyph } from "../icons.ts";
import type { Ctx, Screen } from "../index.ts";
import { tip } from "../tooltip.ts";
import { focus } from "../nav.ts";

export function commanderScreen(ctx: Ctx): Screen {
  const P = ctx.profile();
  let sel: CommanderId = P.commanders[P.last]?.unlocked ? P.last : "marshal";
  const asc: Partial<Record<CommanderId, number>> = {};
  for (const c of COMMANDER_IDS) asc[c] = P.commanders[c]?.maxAscension ?? 0;

  const list = h("div.cmd-list");
  const detail = h("div.cmd-detail.pn.deep");
  const tiles = COMMANDER_IDS.map((c, i) => {
    const C = COMMANDERS[c], st = P.commanders[c];
    const locked = !st?.unlocked;
    const el = h(`button.cmd-tile${locked ? ".locked" : ""}`, { onclick: () => select(c), onfocus: () => select(c, true) },
      h("span.cg", raw(icon(locked ? "lock" : commanderGlyph(c), { size: 26, accent: locked ? "#5a5a66" : "#E3B655" }))),
      h("span.cn.cz", locked ? "?" : C.name.replace("The ", "")),
      st?.wins ? h("span.cw", raw(icon("star", { size: 9, accent: "#FFD36B" })), String(st.wins)) : null,
      h("span.ck", kbd(String(i + 1))));
    list.append(el);
    return el;
  });

  function render() {
    const C = COMMANDERS[sel], st = P.commanders[sel];
    const locked = !st?.unlocked;
    const a = asc[sel] ?? 0, maxA = st?.maxAscension ?? 0;
    const A = ASCENSIONS[a];
    const prev = h("button.btn.sec.icon.ab", { disabled: a <= 0 || locked ? "" : null, onclick: () => setAsc(a - 1) }, "‹");
    const next = h("button.btn.sec.icon.ab", { disabled: a >= maxA || locked ? "" : null, onclick: () => setAsc(a + 1) }, "›");
    const ascRow = tip(h("div.asc-row", h("span.lab", "Ascension"), prev, h("span.asc-v", raw(icon("ascension", { size: 14, accent: a ? "#FF9A5A" : "#8C8678" })), h("b.num", a ? roman(a) : "0"), h("span.an", A.name)), next),
      () => ({ title: a ? `Ascension ${a}: ${A.name}` : "No ascension", glyph: icon("ascension", { size: 16, accent: "#FF9A5A" }), line: a ? ASCENSIONS.slice(1, a + 1).map((x, i) => `${i + 1}. ${x.rule}`).join("<br>") : "The war as it comes. Win to unlock Ascension 1.", meta: maxA < 10 ? `Win at ${maxA ? `Ascension ${maxA}` : "no ascension"} to unlock the next.` : "", keys: ["←", "→"] }));
    const sec = (label: string, ...kids: (HTMLElement | null)[]) => h("div.cd-sec", h("div.lab", label), ...kids);
    detail.replaceChildren(
      h("div.cd-main",
        h("div.cd-hero",
          h("div.cd-port", raw(icon(locked ? "lock" : commanderGlyph(sel), { size: 72, accent: "#E3B655" }))),
          h("div.h2", C.name),
          h("div.sm", locked ? "Locked" : C.title),
          locked ? null : h("span.chip.cd-diff", `${C.difficulty[0]!.toUpperCase()}${C.difficulty.slice(1)}`),
          st?.runs ? h("div.sm.cd-rec", `${st.runs} runs · ${st.wins} wins`) : null),
        h("div.cd-body",
          h("div.cd-line", C.line),
          h("div.flav.sm", `"${C.flavour}"`),
          locked ? h("div.cd-lock", raw(icon("lock", { size: 14 })), h("span", C.unlock)) : null,
          sec("Starting towers", h("div.cd-tw", ...C.towers.map((t, i) => tip(h("div.cd-t", h("span.kbd", String(i + 1)), raw(towerIcon(t, 26)), h("div", h("b", TOWERS[t].name), h("div.sm", TOWERS[t].line))), { title: TOWERS[t].name, glyph: towerIcon(t, 16), line: TOWERS[t].line })))),
          sec("Spells", h("div.cd-sp", ...C.spells.map((sp, i) => h("div.cd-s", h("span.kbd", i ? "W" : "Q"), h("span.sgl", raw(icon(sp, { size: 20, accent: "#FFC07A" }))), h("div", h("b", SPELLS[sp].name), h("span.sm", ` every ${SPELLS[sp].cd} s`), h("div.sm", SPELLS[sp].line)))))),
          h("div.cd-two",
            sec("Relic", h("div.cd-r", raw(icon(relicGlyph(commanderRelic(sel)), { size: 18, accent: "#D9B86A" })), h("div", h("b", C.relic), h("div.sm", C.relicText)))),
            sec("Gift", h("div.cd-r", raw(icon("star", { size: 18, accent: "#E3B655" })), h("div", h("b", C.passive), h("div.sm", C.passiveText))))))),
      h("div.cd-foot", ascRow, h("button.btn.big.go", { disabled: locked ? "" : null, onclick: start }, raw(icon("flag", { size: 15, accent: "#1a140c" })), "March", kbd("Enter"))),
    );
    tiles.forEach((t, i) => t.classList.toggle("on", COMMANDER_IDS[i] === sel));
  }
  function select(c: CommanderId, fromFocus = false) {
    if (c === sel && fromFocus) return;
    sel = c; render();
    if (!fromFocus) sfx("click");
  }
  function setAsc(v: number) {
    const maxA = P.commanders[sel]?.maxAscension ?? 0;
    const nv = Math.max(0, Math.min(maxA, v));
    if (nv === asc[sel]) { sfx("deny"); return; }
    asc[sel] = nv; sfx("page"); render();
    pulse(detail.querySelector(".asc-v")!, "pop");
  }
  function start() {
    if (!P.commanders[sel]?.unlocked) { sfx("deny"); return; }
    sfx("card_pick");
    ctx.host.nav({ to: "new", commander: sel, ascension: asc[sel] ?? 0 });
  }
  render();
  const el = h("div.cmd-scr.table",
    h("div.band.live", h("button.btn.ghost.icon", { onclick: () => ctx.show({ s: "title" }) }, raw(icon("back", { size: 14 }))), h("span.title", "Choose a commander")),
    h("div.tbody.cmd-body", list, detail));
  return {
    el, noAutoFocus: true,
    key(e) {
      const k = e.key;
      if (/^[1-5]$/.test(k)) { const c = COMMANDER_IDS[+k - 1]; select(c); focus(tiles[+k - 1]); return true; }
      if (k === "ArrowLeft" && document.activeElement?.closest(".cmd-detail")) { setAsc((asc[sel] ?? 0) - 1); return true; }
      if (k === "ArrowRight" && document.activeElement?.closest(".cmd-detail")) { setAsc((asc[sel] ?? 0) + 1); return true; }
      if (k === "ArrowUp" || k === "ArrowDown") {
        const i = COMMANDER_IDS.indexOf(sel);
        const j = (i + (k === "ArrowDown" ? 1 : -1) + 5) % 5;
        select(COMMANDER_IDS[j]); focus(tiles[j]); return true;
      }
      if (k === "ArrowRight" || k === "ArrowLeft") { setAsc((asc[sel] ?? 0) + (k === "ArrowRight" ? 1 : -1)); return true; }
      if (k === "Enter") { start(); return true; }
      if (k === "Backspace") { ctx.show({ s: "title" }); sfx("back"); return true; }
      return false;
    },
    frame() { if (!list.contains(document.activeElement) && !detail.contains(document.activeElement) && document.activeElement === document.body) tiles[COMMANDER_IDS.indexOf(sel)].focus(); },
  };
}
