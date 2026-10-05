// The codex (run-meta 8): a book with tabs. Unseen entries are silhouettes with "?", so the book
// shows exactly how much is left. Focusing an entry opens its page on the right.
import type { BossId, CommanderId, EnemyId, TowerId } from "../../../game/types.ts";
import { BOSSES, BOON_IDS, COMMANDERS, COMMANDER_IDS, EVENT_IDS, RARITY, RELIC_IDS, SPECS, TOWERS, TOWER_IDS, boon, enemy, event, relic } from "../content.ts";
import { h, raw, sfx, kbd } from "../dom.ts";
import { boonIcon, commanderGlyph, enemyGlyph, icon, relicGlyph, specIcon, towerIcon } from "../icons.ts";
import type { Ctx, Screen } from "../index.ts";
import { focus } from "../nav.ts";

type Entry = { id: string; name: string; glyph: string; seen: boolean; body: () => (HTMLElement | null)[] };
const TABS = ["towers", "boons", "relics", "enemies", "bosses", "events", "commanders", "runs"] as const;
const TAB_NAME: Record<string, string> = { towers: "Towers", boons: "Boons", relics: "Relics", enemies: "Enemies", bosses: "Bosses", events: "Events", commanders: "Commanders", runs: "Runs" };
const TAB_GLYPH: Record<string, string> = { towers: "archer", boons: "b-plus", relics: "r-gem", enemies: "footman", bosses: "boss", events: "event", commanders: "marshal", runs: "map" };
const ROLES: EnemyId[] = ["footman", "runner", "brute", "acolyte", "shieldbearer", "shaman", "splitter", "shade", "swarmling", "sapper", "bat", "drake", "juggernaut", "warlock", "matron"];
const stats = (pairs: [string, string | number | null | undefined][]) => h("div.cx-stats", ...pairs.filter(([, v]) => v != null).map(([k, v]) => h("div", h("span.lab", k), h("b", String(v)))));
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;

export function codexScreen(ctx: Ctx, tab0?: string, onBack?: () => void): Screen {
  const V = ctx.profile();
  const P = ctx.host.profile();
  const C = P.codex;
  const seen = (k: string) => V.codex.seen[k] ?? new Set<string>();
  let tab = (TABS as readonly string[]).includes(tab0 ?? "") ? tab0! : "towers";
  const grid = h("div.cx-grid");
  const page = h("div.cx-page.pn.paper");
  const tabsEl = h("div.cx-tabs");

  const entries = (t: string): Entry[] => {
    const s = seen(t);
    switch (t) {
      case "towers": return TOWER_IDS.map((id: TowerId) => ({ id, name: TOWERS[id].name, glyph: towerIcon(id, 26), seen: s.has(id), body: () => {
        const x = C.towers[id];
        return [h("p", TOWERS[id].line), h("p.flav", `"${TOWERS[id].flavour}"`),
          h("div.cx-specs", ...TOWERS[id].specs.map((sp) => h("div.cx-spec", raw(specIcon(sp, 22)), h("div", h("b", SPECS[sp].name + (x?.specs.includes(sp) ? " ✓" : "")), h("div", SPECS[sp].line))))),
          x ? stats([["Built", x.built], ["Kills", x.kills.toLocaleString("en")], ["Damage", Math.round(x.damage).toLocaleString("en")], ["Top in a win", x.topWins]]) : null];
      } }));
      case "boons": return BOON_IDS.map((id) => { const B = boon(id); return { id, name: B.name, glyph: boonIcon(B.tower, 24), seen: s.has(id), body: () => [h("p", B.text), B.tempered ? h("p", h("b", "Tempered: "), B.tempered) : null, h("p.sm", B.tower ? `For the ${TOWERS[B.tower].name}.` : "For any one tower."), B.flavour ? h("p.flav", `"${B.flavour}"`) : null,
        C.boons[id] ? stats([["Seen", C.boons[id]!.seen], ["Taken", C.boons[id]!.taken], ["Tempered", C.boons[id]!.tempered]]) : null] }; });
      case "relics": return RELIC_IDS.map((id) => { const R = relic(id); return { id, name: R.name, glyph: icon(relicGlyph(id), { size: 24, accent: "#B8862A" }), seen: s.has(id), body: () => [h("p", R.text), R.downside ? h("p.bad", R.downside) : null, h("p.sm", RARITY[R.rarity].name), R.flavour ? h("p.flav", `"${R.flavour}"`) : null,
        C.relics[id] ? stats([["Seen", C.relics[id]!.seen], ["Taken", C.relics[id]!.taken], ["Wins", C.relics[id]!.wins]]) : null] }; });
      case "enemies": return ROLES.map((id) => ({ id, name: enemy(id).name, glyph: icon(enemyGlyph(id), { size: 24, accent: "#8A3A2A" }), seen: s.has(id), body: () => {
        const x = C.enemies[id];
        return [h("p", enemy(id).line), x ? stats([["Met", x.met], ["Slain", x.killed], ["Got through", x.leaked]]) : null];
      } }));
      case "bosses": return (Object.keys(BOSSES) as BossId[]).map((id) => ({ id, name: BOSSES[id].name, glyph: icon("boss", { size: 26, accent: "#8A2A2A" }), seen: s.has(id), body: () => {
        const x = C.bosses[id];
        return [h("p", BOSSES[id].tip), h("p.sm", `Act ${["", "I", "II", "III", "IV"][BOSSES[id].act]}`), x ? stats([["Met", x.met], ["Defeated", x.defeated], ["Fastest", x.fastest != null ? mmss(x.fastest / 30) : "-"], ["Beaten at", x.ascBeaten ? `A${x.ascBeaten}` : "-"]]) : null];
      } }));
      case "events": return EVENT_IDS.map((id) => { const E = event(id); return { id, name: E.name, glyph: icon(E.glyph ?? "event", { size: 24, accent: "#8A6A30" }), seen: s.has(id), body: () => [h("p", E.prose), C.events[id] ? h("p.sm", `Seen ${C.events[id]!.seen} times; ${C.events[id]!.choices.length} choices tried.`) : null] }; });
      case "commanders": return COMMANDER_IDS.map((id: CommanderId) => ({ id, name: COMMANDERS[id].name, glyph: icon(commanderGlyph(id), { size: 26, accent: "#8A6A30" }), seen: V.commanders[id].unlocked, body: () => {
        const D = COMMANDERS[id], st = V.commanders[id];
        return [h("p", D.line), h("p.flav", `"${D.flavour}"`), h("div.cx-tw", ...D.towers.map((t) => raw(towerIcon(t, 20)))), h("p", h("b", D.passive + ": "), D.passiveText), h("p", h("b", D.relic + ": "), D.relicText),
          stats([["Runs", st.runs], ["Wins", st.wins], ["Ascension", st.maxAscension]])];
      } }));
    }
    return [];
  };

  const showPage = (e: Entry | null, t: string) => {
    if (!e) { page.replaceChildren(h("div.cx-empty", "Choose an entry.")); return; }
    page.replaceChildren(
      h("div.cx-ph", h("span.cx-pg", raw(e.seen ? e.glyph : icon("info", { size: 24 }))), h("div.cx-pt", e.seen ? e.name : "Not yet met")),
      h("div.cx-pb", ...(e.seen ? e.body() : [h("p", t === "commanders" ? COMMANDERS[e.id as CommanderId].unlock : "You haven't met this yet. Keep marching.")])));
  };

  const renderRuns = () => {
    const H = P.history;
    const showRun = (i: number) => {
      const r = H[i]!;
      page.replaceChildren(h("div.cx-ph", h("span.cx-pg", raw(icon(commanderGlyph(r.commander), { size: 24, accent: "#8A6A30" }))), h("div.cx-pt", r.won ? "Victory" : "Fell")),
        h("div.cx-pb", h("p", r.result), h("p", `${COMMANDERS[r.commander].name}${r.ascension ? `, ascension ${r.ascension}` : ""}.`),
          h("div.cx-tw", ...r.towers.map((t) => raw(towerIcon(t.tower, 20)))),
          stats([["Time", mmss(r.ticks / 30)], ["Renown", r.renown], ["Seed", r.seed], ["Top", r.top ? TOWERS[r.top].name : "-"]])));
    };
    grid.replaceChildren(...H.map((r, i) => h("button.cx-run", { onfocus: () => showRun(i), onpointerenter: () => showRun(i) },
      h(`span.rr-res.${r.won ? "won" : "fell"}`, r.won ? "Victory" : "Fell"), raw(icon(commanderGlyph(r.commander), { size: 16, accent: "#E3B655" })),
      h("span.sm", r.won ? "Won the war" : `Act ${r.act}, floor ${r.floor}`), r.ascension ? h("span.chip", raw(icon("ascension", { size: 10, accent: "#FF9A5A" })), String(r.ascension)) : null)));
    if (!H.length) { grid.append(h("div.sm.dim", "No runs yet.")); showPage(null, "runs"); }
    else showRun(0);
    const t = P.totals;
    page.append(stats([["Runs", t.runs], ["Wins", t.wins], ["Best streak", t.bestStreak], ["Fastest win", t.fastestWin != null ? mmss(t.fastestWin / 30) : "-"]]));
  };

  const render = (focusGrid = false) => {
    tabsEl.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    if (tab === "runs") renderRuns();
    else {
      const es = entries(tab);
      grid.replaceChildren(...es.map((e) => h(`button.cx-e${e.seen ? "" : ".unseen"}`, { onfocus: () => showPage(e, tab), onpointerenter: () => showPage(e, tab) },
        h("span.cg", raw(e.glyph)), h("span.cn", e.seen ? e.name : "?"))));
      showPage(es.find((e) => e.seen) ?? es[0] ?? null, tab);
    }
    if (focusGrid) requestAnimationFrame(() => focus(grid.querySelector<HTMLElement>("button")));
  };
  TABS.forEach((t, i) => {
    const cnt = h("span.cnt");
    if (t !== "runs") { const es = entries(t); cnt.textContent = `${es.filter((e) => e.seen).length}/${es.length}`; }
    tabsEl.append(h("button.cx-tab", { "data-tab": t, onclick: () => { tab = t; sfx("page"); render(); } }, raw(icon(TAB_GLYPH[t]!, { size: 14, accent: "#C9A45A" })), h("span.tn", TAB_NAME[t]!), cnt, h("span.kbd.tk", String(i + 1))));
  });
  render();
  const back = () => { sfx("back"); if (onBack) onBack(); else ctx.host.nav({ to: "title" }); };
  const el = h("div.codex-scr.table",
    h("div.band.live", h("button.btn.ghost.icon", { onclick: back }, raw(icon("back", { size: 14 }))), h("span.title", "Codex"), h("span.sp"), h("span.sm", `${V.codex.pct}% complete`), h("span.cx-hint.sm", kbd("1-8"), " tabs  ", kbd("⌫"), " back")),
    h("div.tbody.cx-body", tabsEl, h("div.cx-book", h("div.cx-left", grid), page)));
  return {
    el,
    key(e) {
      if (/^[1-8]$/.test(e.key)) { tab = TABS[+e.key - 1]!; sfx("page"); render(true); return true; }
      if (e.key === "Backspace") { back(); return true; }
      return false;
    },
  };
}
