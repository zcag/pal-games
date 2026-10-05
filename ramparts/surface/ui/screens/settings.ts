// Settings screen (from the title or the map): the same rows as the pause menu.
import { h, raw, sfx, kbd } from "../dom.ts";
import { icon } from "../icons.ts";
import type { Ctx, Screen } from "../index.ts";
import { settingsRows } from "./pause.ts";

export function settingsScreen(ctx: Ctx): Screen {
  const back = () => { sfx("back"); ctx.host.nav({ to: "title" }); };
  const panel = h("div.settings.pn.deep.dlg.shadow",
    h("div.ph", h("span.h1", "Settings")),
    settingsRows(ctx),
    h("div.st-foot", h("button.btn.big", { onclick: back }, raw(icon("back", { size: 14, accent: "#1a140c" })), "Done", kbd("⌫"))));
  const el = h("div.settings-scr.table", panel);
  return { el, key(e) { if (e.key === "Backspace") { back(); return true; } return false; } };
}
