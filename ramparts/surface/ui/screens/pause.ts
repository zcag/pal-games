// Pause menu (art 7.8) and the settings rows it shares with the Settings screen. The volumes are
// pal's settings (ui/settings.ts), so the rows start at Mute.
import { h, raw, sfx, kbd } from "../dom.ts";
import { icon } from "../icons.ts";
import type { Ctx } from "../index.ts";
import type { Settings } from "../host.ts";
import { tip } from "../tooltip.ts";
import { codexScreen } from "./codex.ts";

export function settingsRows(ctx: Ctx): HTMLElement {
  const S = ctx.settings;
  const slider = (key: "shake", label: string, line: string) => {
    const val = h("span.sv.num", `${Math.round(S[key] * 100)}`);
    const inp = h<HTMLInputElement>("input.rng", { type: "range", min: "0", max: "100", step: "5", value: String(Math.round(S[key] * 100)), "aria-label": label });
    const set = () => { inp.style.setProperty("--v", `${inp.value}%`); val.textContent = inp.value; };
    set();
    inp.addEventListener("input", () => { set(); ctx.setSettings({ [key]: +inp.value / 100 } as Partial<Settings>); });
    inp.addEventListener("change", () => sfx("click"));
    return tip(h("label.srow", h("span.sl", label), inp, val), { title: label, line, keys: ["←", "→"] });
  };
  const toggleRow = (key: "muted" | "numbers" | "tips", label: string, line: string) => {
    const t = h("span.tog" + (S[key] ? ".on" : ""));
    const b = h("button.srow.tg", { "data-set": key, onclick: () => { ctx.setSettings({ [key]: !S[key] } as Partial<Settings>); sfx("click"); } }, h("span.sl", label), t);
    return tip(b, { title: label, line });
  };
  const speed = h("div.seg", ...([1, 2, 3] as const).map((n) => h(`button${S.speed === n ? ".on" : ""}`, { onclick: (e: Event) => { ctx.setSettings({ speed: n }); (e.currentTarget as HTMLElement).parentElement!.querySelectorAll("button").forEach((x, i) => x.classList.toggle("on", i + 1 === n)); sfx("click"); } }, `${n}x`)));
  return h("div.srows",
    toggleRow("muted", "Mute", "Silence everything. M works anywhere. Volume, music and effects are in pal's settings for Ramparts."),
    slider("shake", "Screen shake", "How hard big hits shake the view."),
    toggleRow("numbers", "Damage numbers", "Numbers over big hits, crits and bosses."),
    tip(h("div.srow", h("span.sl", "Starting speed"), speed), { title: "Starting speed", line: "The speed each battle starts at." }),
    toggleRow("tips", "First-run notes", "Short notes the first time you see something."),
  );
}

/** Opens the pause overlay; `resume` closes it (the host resumes the sim). */
export function pauseMenu(ctx: Ctx, resume: () => void): () => void {
  let confirming = false;
  const quit = h("button.btn.ghost.wide", { onclick: () => {
    if (!confirming) { confirming = true; quit.classList.add("danger"); quit.querySelector("span")!.textContent = "Quit? Press again"; sfx("click"); return; }
    close(); ctx.host.nav({ to: "abandon" });
  } }, raw(icon("quit", { size: 14 })), h("span", "Quit run"));
  tip(quit, { title: "Quit run", line: "Ends the run here. It counts as a loss, and you keep the renown." });
  const panel = h("div.pause.pn.deep.dlg.shadow",
    h("div.ph", h("span.h1", "Paused")),
    h("div.pb",
      settingsRows(ctx),
      h("div.pbtn",
        h("button.btn.big.wide", { "data-first": "", onclick: () => close() }, raw(icon("play", { size: 14, accent: "#1a140c" })), "Resume", kbd("P")),
        h("button.btn.sec.wide", { onclick: () => { const c = codexScreen(ctx, undefined, () => closeC()); c.el.classList.add("scr"); const closeC = ctx.overlay(c.el, c.key); } }, raw(icon("codex", { size: 14, accent: "#C9A45A" })), "Codex"),
        quit,
        h("div.keys.sm",
          h("div", kbd("Space"), " next wave"), h("div", kbd("1-6"), " build"), h("div", kbd("U"), kbd("X"), kbd("T"), " upgrade, sell, target"),
          h("div", kbd("Q"), kbd("W"), " spells  ", kbd("E"), kbd("D"), " supplies"), h("div", kbd("F"), " speed  ", kbd("Alt"), " all ranges"))),
    ));
  const close = ctx.overlay(h("div.layer.veil.pausebg", panel), (e) => {
    if (e.key === "p" || e.key === "P") { close(); return true; }
    return false;
  }, () => resume());
  return close;
}
