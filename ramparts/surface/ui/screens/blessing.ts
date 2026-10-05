// The run's opening blessing (R23): pick one of three (four after a first win, R27).
import type { RunState } from "../../../game/types.ts";
import { choices } from "../../../game/run/index.ts";
import { BLESSINGS, COMMANDERS } from "../content.ts";
import { h, raw, sfx, kbd } from "../dom.ts";
import { icon, commanderGlyph } from "../icons.ts";
import type { Ctx, Screen } from "../index.ts";
import { runBand } from "./common.ts";
import { note } from "./notes.ts";

export function blessingScreen(ctx: Ctx, run: RunState): Screen {
  const ids = run.screen.s === "blessing" ? run.screen.options.map((o) => o.split(":")[0]!) : [];
  const opts = choices(run);
  let chosen = false;
  const pick = (i: number) => {
    if (chosen || !opts[i]) return;
    chosen = true;
    sfx("card_pick");
    btns.forEach((b, j) => b.classList.add(j === i ? "picked" : "fold"));
    setTimeout(() => ctx.host.choose(opts[i]!.key), 380);
  };
  const btns = opts.map((o, i) => {
    const B = BLESSINGS[ids[i] ?? ""] ?? { glyph: "star" };
    return (h("button.bless.pn.raised", { onclick: () => pick(i), style: { animationDelay: `${80 + i * 90}ms` } },
      h("span.bk", kbd(String(i + 1))),
      h("span.bg", raw(icon(B.glyph, { size: 34, accent: "#E3B655" }))),
      h("span.bn.cz", o.label), h("span.bl", o.text ?? "")));
  });
  const C = COMMANDERS[run.commander];
  const el = h("div.bless-scr.table",
    runBand(ctx, run, "A blessing for the road"),
    h("div.tbody.cen",
      h("div.bless-head", raw(icon(commanderGlyph(run.commander), { size: 24, accent: "#E3B655" })), h("div", h("div.h1", "Before you march"), h("div.sm", `${C.name} takes one gift for the road.`))),
      h("div.bless-row", ...btns)));
  note(ctx, "blessing", "Pick a gift for this run. Every run offers new ones.", el);
  return { el, key(e) { if (/^[1-4]$/.test(e.key)) { pick(+e.key - 1); return true; } return false; } };
}
