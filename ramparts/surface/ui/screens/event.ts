// Event (art 7.9): a parchment page with a glyph vignette, the title, the prose, and two or three
// choices with plain outcomes; choices you can't take are greyed with the reason. After a choice
// the page shows what happened and a Continue.
import type { RunState } from "../../../game/types.ts";
import { choices } from "../../../game/run/index.ts";
import { event } from "../content.ts";
import { h, raw, sfx, pulse } from "../dom.ts";
import type { Ctx, Screen } from "../index.ts";
import { runBand } from "./common.ts";
import { vignette } from "./vignette.ts";

export function eventScreen(ctx: Ctx, run: RunState): Screen {
  const scr = run.screen as Extract<RunState["screen"], { s: "event" }>;
  const E = event(scr.event);
  const opts = choices(run);
  let done = false;
  const choose = (i: number) => {
    const b = btns[i], c = opts[i];
    if (!b || !c || done) return;
    if (c.disabled) { sfx("deny"); pulse(b, "shake"); return; }
    done = true; sfx("page");
    b.classList.add("chosen");
    setTimeout(() => ctx.host.choose(c.key), 240);
  };
  const btns = opts.map((c, i) => {
    const b = h(`button.ev-c${c.disabled ? ".off" : ""}`, { onclick: () => choose(i), ...(i === 0 && !c.disabled ? { "data-first": "" } : {}) },
      h("span.kbd", String(i + 1)), h("span.ev-l", c.label), c.text ? h("span.ev-h", c.text) : h("span"), c.disabled ? h("span.ev-w", c.disabled) : null);
    return b; // the row already says everything; a tip would only cover the other choices
  });
  const page = h("div.ev-page.pn.paper.shadow",
    h("div.ev-vig", raw(vignette(scr.event, run.act)), h("span.ev-ray")),
    h("div.ev-txt",
      h("div.ev-t", E.name),
      h("div.ev-p", E.prose),
      scr.note ? h("div.ev-n", scr.note) : null,
      h("div.ev-cs", ...btns)));
  const el = h("div.event-scr.table.dim", runBand(ctx, run), h("div.tbody.cen", page));
  return { el, key(e) { if (/^[1-4]$/.test(e.key)) { choose(+e.key - 1); return true; } return false; } };
}
