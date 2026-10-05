// End-of-run summary (run-meta 10, art 7.12): result line, the path, the war table, damage by
// tower, highlights, the "almost" lines, the renown tally line by line, the unlock bar and the new
// unlocks. Built from game/run's summary(run) and game/meta's applyRun result; Enter skips.
import type { RunState } from "../../../game/types.ts";
import { summary } from "../../../game/run/index.ts";
import { nextUnlock, type ApplyResult, type Profile } from "../../../game/meta.ts";
import { LEVELS } from "../../../game/content/run/unlocks.ts";
import { COMMANDERS, NODES, TOWERS, relic } from "../content.ts";
import { h, raw, roll, sfx, kbd, wait, roman, pulse } from "../dom.ts";
import { icon, nodeGlyph, relicGlyph, towerIcon, commanderGlyph, TOWER_ACCENT } from "../icons.ts";
import type { Ctx, Screen } from "../index.ts";
import { tip } from "../tooltip.ts";
import { unlockGlyph } from "../profile.ts";

export function summaryScreen(ctx: Ctx, run: RunState, res: ApplyResult, before: Profile): Screen {
  const S = summary(run);
  let skip = false;
  const secs = Math.round(run.stats.timeTicks / 30);
  const head = h("div.su-head",
    h("div.su-r", h(`div.h1${S.won ? ".gold" : ".fell"}`, S.won ? "Victory" : "The ramparts fell"), h("div.su-line", S.result)),
    h("div.su-meta.sm", raw(icon(commanderGlyph(run.commander), { size: 13, accent: "#E3B655" })), ` ${COMMANDERS[run.commander].name}`, run.ascension ? ` · Ascension ${run.ascension}` : "",
      ` · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} · seed ${S.seed}`));
  const path = h("div.su-path", ...S.path.filter((a) => a.visited.length).map((a) => h("div.sp-act", h("span.lab", roman(a.act)),
    ...a.visited.map((v, i) => {
      const k = a.map.nodes[v.node]?.kind ?? "battle";
      return tip(h(`span.sp-n.${v.how}`, { style: { animationDelay: `${i * 40}ms` } }, raw(icon(nodeGlyph(k), { size: 11 }))),
        { title: NODES[k].name, line: v.how === "clean" ? "Nothing got through." : v.how === "some" ? "A few got through." : v.how === "many" ? "Many got through." : "" });
    }))));
  const table = h("div.su-table",
    ...S.table.towers.map((t) => tip(h("span.su-t", { style: { "--ac": TOWER_ACCENT[t.tower] } }, raw(towerIcon(t.tower, 20)), t.stars ? h("span.st", "★".repeat(t.stars)) : null, t.boons.length ? h("span.bc", String(t.boons.length)) : null),
      { title: TOWERS[t.tower].name, line: t.boons.length ? `${t.boons.length} ${t.boons.length === 1 ? "boon" : "boons"}, ${t.tempered} tempered.` : "No boons." })),
    h("span.su-sep"),
    ...S.table.relics.slice(0, 12).map((id) => tip(h("span.su-rl", raw(icon(relicGlyph(id), { size: 15, accent: "#D9B86A" }))), { title: relic(id).name, line: relic(id).text })));
  const bars = h("div.su-bars", ...S.damage.slice(0, 5).map((d, i) => h("div.su-bar", raw(towerIcon(d.tower, 14)), h("span.bn", TOWERS[d.tower].name),
    h("span.bt", h("i", { style: { "--w": `${Math.max(2, d.share * 100 / Math.max(0.01, S.damage[0]!.share))}%`, background: TOWER_ACCENT[d.tower], animationDelay: `${300 + i * 90}ms` } })), h("span.num", d.damage.toLocaleString("en")))));
  if (!S.damage.length) bars.append(h("span.sm.dim", "No damage dealt."));
  const top = S.damage[0] ? `Your ${TOWERS[S.damage[0].tower].name} did ${Math.round(S.damage[0].share * 100)}% of the damage.` : "";
  const highs = h("div.su-high", ...S.highlights.slice(0, 3).map((x) => { const [a, b] = x.replace(/\.$/, "").split(/:\s*/); return h("div.hl.pn.raised", h("div.lab", b ? a! : "Highlight"), h("div.hv", b ?? a!)); }));
  const bossLeft = run.over?.bossHpLeft;
  const almost = S.almost.length ? h("div.su-almost", bossLeft != null ? h("div.al-bar", h("i", { style: { width: `${bossLeft * 100}%` } })) : null, ...S.almost.map((a) => h("span", a))) : null;

  // renown tally and the unlock bar
  const T = res.tally;
  const tally = h("div.su-tally");
  const rTotal = h("span.num.c-brass", "0");
  const barFill = h("i"), barLab = h("span.sm"), lvl = h("span.lv.cz");
  const unlocks = h("div.su-new");
  const setBar = (renown: number, level: number) => {
    const at = level > 0 ? LEVELS[level - 1]! : 0, nxt = LEVELS[level] ?? renown;
    barFill.style.width = `${level >= LEVELS.length ? 100 : Math.min(100, (100 * (renown - at)) / Math.max(1, nxt - at))}%`;
    lvl.textContent = `Level ${level}`;
  };
  setBar(before.renown, before.level);
  const nu = nextUnlock(res.profile);
  barLab.textContent = nu ? `${nu.need} renown to ${nu.name}` : "Every unlock is yours.";
  const again = h("button.btn.big", { onclick: () => { sfx("click"); ctx.host.nav({ to: "again" }); }, "data-first": "" }, raw(icon("flag", { size: 14, accent: "#1a140c" })), "Again", kbd("Enter"));
  const btns = h("div.su-btns", again,
    h("button.btn.sec", { onclick: () => ctx.show({ s: "commander" }) }, "Commander"),
    h("button.btn.sec", { onclick: () => ctx.show({ s: "codex" }) }, raw(icon("codex", { size: 13, accent: "#C9A45A" })), "Codex", kbd("C")),
    h("button.btn.ghost", { onclick: () => ctx.host.nav({ to: "title" }) }, "Menu", kbd("⌫")));
  const left = h("div.su-col",
    h("div.su-sec", h("div.lab", "The road"), path),
    h("div.su-sec", h("div.lab", "War table"), table),
    h("div.su-sec", h("div.lab", "Damage"), top ? h("div.su-top.sm", top) : null, bars));
  const right = h("div.su-col",
    highs, almost,
    h("div.su-sec.su-ren", h("div.su-rh", h("span.lab", "Renown"), raw(icon("renown", { size: 15, accent: "#E3B655" })), rTotal), tally, h("div.su-unlock", lvl, h("div.ub", barFill), barLab), unlocks),
    btns);
  const el = h(`div.summary-scr.table${S.won ? ".won" : ".fell"}`, h("div.tbody.su-body", head, h("div.su-cols", left, right)));
  [path, table, bars, highs, almost].forEach((x, i) => x && (x.style.animationDelay = `${200 + i * 220}ms`));
  (async () => {
    await wait(1300);
    let sum = 0, renown = before.renown, level = before.level;
    for (const l of T.lines) {
      const n = h("span.num");
      tally.append(h("div.tl-row", h("span", l.count > 1 ? `${l.label} (${l.count})` : l.label), h("span.tv", "+", n)));
      sfx("page", { vol: 0.6 });
      if (!skip) await roll(n, 0, l.renown, 280); else n.textContent = String(l.renown);
      sum += l.renown;
      rTotal.textContent = String(sum);
      renown = before.renown + Math.round(sum * T.mult);
      while (level < LEVELS.length && renown >= LEVELS[level]!) { level++; pulse(lvl, "pop"); sfx("unlock"); }
      setBar(renown, level);
      if (!skip) await wait(110);
    }
    if (T.mult > 1) {
      tally.append(h("div.tl-row", h("span", `Ascension ${run.ascension}`), h("span.tv", `x${T.mult.toFixed(1)}`)));
      rTotal.textContent = String(T.total);
      setBar(res.profile.renown, res.profile.level);
    }
    for (const u of res.unlocks) {
      sfx("unlock");
      unlocks.append(tip(h("div.un.pn.raised.flip", raw(icon(unlockGlyph(u.name), { size: 22, accent: "#E3B655" })), h("div", h("div.lab", `New ${u.kind === "relics" ? "relics" : u.kind}`), h("div.cz", u.name))), { title: u.name, line: `Unlocked at renown level ${u.level ?? ""}.` }));
      if (!skip) await wait(500);
    }
    for (const l of res.lines.filter((x) => !/renown to/.test(x))) unlocks.append(h("div.sm.c-brass", l));
  })();
  sfx(S.won ? "victory" : "defeat");
  return {
    el, noAutoFocus: true,
    key(e) {
      const k = e.key.toLowerCase();
      if (k === "enter") { if (!skip) { skip = true; el.classList.add("skip"); return true; } again.click(); return true; }
      if (k === "c") { ctx.show({ s: "codex" }); return true; }
      if (k === "backspace") { ctx.host.nav({ to: "title" }); return true; }
      return false;
    },
    frame() { if (!el.contains(document.activeElement) && !document.querySelector(".ovl")) again.focus(); },
  };
}
