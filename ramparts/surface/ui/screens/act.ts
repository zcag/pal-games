// Act card (art 7.13): "Act II: The Desert Ruins" in Cinzel on enamel-900 with a line in the act's key colour.
import { ACTS } from "../content.ts";
import { h } from "../dom.ts";
import type { Ctx, Screen } from "../index.ts";

export function actScreen(_ctx: Ctx, act: 1 | 2 | 3 | 4): Screen {
  const A = ACTS[act];
  const el = h("div.act-scr", { style: { "--k": A.key } },
    h("div.ac-t", A.title), h("div.ac-n", A.name), h("div.ac-l"), h("div.ac-m", A.mood));
  return { el, noAutoFocus: true };
}
