// First-run notes (run-meta 9): short, shown once each, dismissable (Enter, click or the x).
import { h, raw, sfx } from "../dom.ts";
import { icon } from "../icons.ts";
import type { Ctx } from "../index.ts";

const shown = new Set<string>();

/** `at` places the note (default: top-right under the band); `inline` puts "Got it" beside the text, a low strip. */
export function note(ctx: Ctx, id: string, text: string, parent: HTMLElement, at: Record<string, string> = { right: "10px", top: "38px" }, inline = false): boolean {
  if (!ctx.settings.tips || shown.has(id) || ctx.profile().notesSeen.has(id)) return false;
  shown.add(id);
  const close = () => { el.style.animation = "toast-out 220ms ease-in forwards"; setTimeout(() => el.remove(), 230); ctx.host.noteSeen(id); sfx("close"); };
  // The top-right corner under the band unless the screen keeps something there (`at`).
  const el = h(`div.note.pn.deep.shadow${inline ? ".inline" : ""}`, { style: at },
    h("div.nt", raw(icon("info", { size: 16 })), h("span", text)),
    h("div.nx", h("button.btn.sec.nonav", { onclick: close, style: { minHeight: "22px", fontSize: "11px", padding: "0 9px" } }, "Got it")));
  setTimeout(() => parent.appendChild(el), 450);
  return true;
}
