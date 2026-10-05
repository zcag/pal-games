// The battle HUD (art 7.6 + R29) and all battle input: top band (lives, gold, crowns, wave, skull,
// next-wave strip, bounty, boss bar, speed, pause), bottom corners (spells, war table keys,
// supplies, relics), the radial menu, pad picking, aiming, and the battle keys (R28).
import type { Battle, BattleEvent, Enemy, Pad, RunState, SpellState, Tower, TowerId, WavePlan } from "../../game/types.ts";
import { focus as F } from "../render/api.ts";
import { BADGES, BOSSES, BOUNTIES, SPELLS, SUPPLIES, TOWERS, ACTS, STATUSES, enemy, relic, boon, boonTower } from "./content.ts";
import { h, pulse, raw, sfx, text, toggle, kbd } from "./dom.ts";
import { enemyGlyph, icon, relicGlyph, towerIcon, TOWER_ACCENT, SPEC_ACCENT } from "./icons.ts";
import type { Ctx } from "./index.ts";
import { buildCost, callBonus, countdownTotal, interestCap, leakCost, nextWaves, statsOf, towerOn } from "./query.ts";
import { Radial, statRows, costLine } from "./radial.ts";
import { hide as hideTip, showAt, tip, type TipSpec } from "./tooltip.ts";
import { warTable } from "./screens/wartable.ts";

const TOP = 30, BOTTOM = 42;
type Aim = { kind: "spell"; key: "Q" | "W"; r: number } | { kind: "supply"; slot: number; r: number } | { kind: "rally"; tower: number; r: number }
  /** A spell cast on one of your towers (Requisition): `tower` is the one picked so far. */
  | { kind: "tower"; key: "Q" | "W"; tower: number; r: number };
/** Spells aimed at a tower rather than the road. */
const TOWER_SPELLS = new Set(["requisition"]);

export class Hud {
  el = h("div.layer.hud");
  private top = h("div.hband.live");
  private bot = h("div.hbot");
  private b: Battle | null = null;
  private run: RunState | undefined;
  radial: Radial;
  private speed: 1 | 2 | 3 = 1;
  private armed: TowerId | null = null;
  private aim: Aim | null = null;
  private kbPad: number | null = null;
  private hoverPad: number | null = null;
  private hoverEnemy: number | null = null;
  private lastPick: { cx: number; cy: number } | null = null;
  private seenRoles = new Set<string>();
  private alt = false;
  private sig = "";
  private enemyTipT = 0;

  // top band parts
  private livesN = h("span.num"); private livesEl: HTMLElement;
  private goldN = h("span.num"); private goldEl: HTMLElement; private goldIc: HTMLElement; private intChip = h("span.int");
  private crownN = h("span.num"); private crownEl: HTMLElement;
  private waveN = h("span.num"); private waveLab = h("span.lab", "Wave"); private waveEl: HTMLElement;
  private skull: HTMLElement; private skullRing: SVGCircleElement; private skullBonus = h("span.sb");
  private strip = h("div.strip");
  private bountyEl = h("div.hbounty.chip");
  private bossEl = h("div.bossbar");
  private bossFill = h("div.bf"); private bossName = h("div.bn.cz"); private bossTele = h("div.bt", "!"); private bossNotches = h("div.bnotch");
  private speedBtns: HTMLButtonElement[] = [];
  private pauseBtn: HTMLButtonElement;
  // bottom parts
  private spellsEl = h("div.spells.live");
  private keysEl = h("div.wkeys.live");
  private supEl = h("div.sups.live");
  private ghostEl = h("div.ghostoffer.live");
  private relicsEl = h("div.relics.live");
  private aimHint = h("div.aimhint.pn.deep");

  constructor(private ctx: Ctx) {
    this.radial = new Radial(ctx);
    this.radial.onRally = (t) => this.startAim({ kind: "rally", tower: t.id, r: 0.6 });
    // ---- top band
    this.livesEl = tip(h("div.stat.lives", raw(icon("life", { size: 15, accent: "#FF5D5D" })), this.livesN, h("span.unit", "lives")), () => ({ title: "Lives", glyph: icon("life", { size: 16, accent: "#FF5D5D" }), line: "Lost when enemies reach your gate. At zero the run ends.", meta: this.run ? `${Math.max(0, this.b?.lives ?? 0)} of ${this.run.loadout.maxLives}` : "" }));
    this.goldIc = h("span.gi", { "data-coin-target": "" }, raw(icon("gold", { size: 15, accent: "#FFD36B" })));
    this.goldEl = tip(h("div.stat.gold", this.goldIc, this.goldN, h("span.unit", "gold"), this.intChip), () => ({ title: "Gold", glyph: icon("gold", { size: 16, accent: "#FFD36B" }), line: "Spent on towers in this battle. Gone when it ends.", meta: `Interest: each wave, 5% of the gold you hold, up to ${this.b ? interestCap(this.b) : 20}.` }));
    this.crownEl = tip(h("div.stat.crowns", raw(icon("crown", { size: 14, accent: "#B89CFF" })), this.crownN, h("span.unit", "crowns")), { title: "Crowns", glyph: icon("crown", { size: 16, accent: "#B89CFF" }), line: "Kept all run. Spent at shops and some events." });
    const ringSvg = `<svg class="sring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" class="bg"/><circle cx="18" cy="18" r="15.5" class="fg" pathLength="100"/></svg>`;
    this.skull = tip(h("button.skull.live", { onclick: () => this.call() }, raw(ringSvg), h("span.sk", raw(icon("wave", { size: 18, accent: "#E9DEC4" }))), this.skullBonus, h("span.kb", kbd("Space"))), () => this.skullTip());
    this.skullRing = this.skull.querySelector(".fg") as SVGCircleElement;
    this.waveEl = tip(h("div.wave", this.waveLab, this.waveN), () => ({ title: "Waves", glyph: icon("wave", { size: 16 }), line: this.b?.theme ? `This battle: <b>${this.b.theme}</b>.` : "Survive every wave to win the battle.", meta: this.b ? ACTS[this.b.act].trait ?? "" : "" }));
    this.bossEl.append(h("div.brow", this.bossTele, this.bossName), h("div.btrack", this.bossFill, this.bossNotches));
    tip(this.bossEl, () => { const bs = this.bossOf(); return bs?.boss ? { title: BOSSES[bs.boss.id].name, glyph: icon("boss", { size: 16, accent: "#FF6B5B" }), line: BOSSES[bs.boss.id].tip, meta: "Costs 10 lives if it gets through, then comes round again." } : null; });
    tip(this.bountyEl, () => { const bo = this.b?.bounty; if (!bo) return null; const B = BOUNTIES[bo.id]; return { title: `Bounty: ${B?.name ?? bo.id}`, glyph: icon("bounty", { size: 16, accent: "#E3B655" }), line: B?.line ?? "", meta: bo.ok ? '<span class="c-good">Still on.</span> Meet it for a second reward.' : '<span class="c-bad">Failed.</span> The battle still pays as normal.' }; });
    const centre = h("div.hc", this.waveEl, this.skull, this.strip, this.bossEl, this.bountyEl);
    const speeds = h("div.speed.seg", ...([1, 2, 3] as const).map((n) => {
      const b = h<HTMLButtonElement>("button", { onclick: () => this.setSpeed(n) }, `${n}x`);
      this.speedBtns.push(b);
      return b;
    }));
    tip(speeds, { title: "Speed", glyph: icon("speed", { size: 16 }), line: "1x, 2x or 3x.", keys: ["F"] });
    this.pauseBtn = tip(h<HTMLButtonElement>("button.pausebtn.btn.sec.icon", { onclick: () => ctx.pause(true) }, raw(icon("pause", { size: 15 }))), { title: "Pause", line: "Volume, settings, quit.", keys: ["P"] });
    this.top.append(h("div.hl", this.livesEl, this.goldEl, this.crownEl), centre, h("div.hr", speeds, this.pauseBtn));
    // ---- bottom corners
    // One tray: spells | towers | supplies. The ghost offer sits left of it in setup; relics in the corner.
    this.bot.append(h("div.bl", this.ghostEl), h("div.tray", this.spellsEl, h("span.tsep"), this.keysEl, h("span.tsep"), this.supEl), h("div.br", this.relicsEl));
    this.el.append(this.top, this.bot, this.radial.el, this.aimHint);
    this.el.style.display = "none";
    this.bindPointer();
  }

  // ================================================================ lifecycle
  show(b: Battle, run?: RunState) {
    const fresh = this.b !== b;
    this.b = b; this.run = run;
    this.el.style.display = "";
    if (fresh) {
      this.radial.close(); this.armed = null; this.aim = null; this.kbPad = null; this.hoverPad = null;
      F.pad = null; F.ring = null; F.aim = null; F.rally = null; F.tower = null; F.selectedPad = null;
      this.setSpeed(this.ctx.settings.speed, true);
      this.sig = "";
      this.ctx.fx.clear();
      for (const r of b.roster) if (this.ctx.profile().codex.seen.enemies?.has(r)) this.seenRoles.add(r);
    }
    this.frame(b, 0);
  }
  hide() {
    if (this.el.style.display === "none") return;
    this.el.style.display = "none";
    this.radial.close();
    this.aim = null; F.aim = null; F.pad = null; F.ring = null; F.rally = null;
    this.ctx.fx.clear();
  }
  insets(s: number) { return this.b && this.el.style.display !== "none" ? { top: TOP * s, right: 0, bottom: (this.ctx.root.classList.contains("roomy") ? 56 : BOTTOM) * s, left: 0 } : { top: 0, right: 0, bottom: 0, left: 0 }; }
  goldPoint(_s: number) { const r = this.goldIc.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  private coinT = 0;
  /** A flying coin reached the counter (VFX): a small pop, at most every 70 ms. */
  coinLanded(_value: number) {
    const now = performance.now();
    if (now - this.coinT < 70) return;
    this.coinT = now;
    pulse(this.goldIc, "coin-hit");
    pulse(this.goldN, "pop");
  }
  denyGold() { pulse(this.goldN, "flash-bad"); pulse(this.goldEl, "shake"); }

  // ================================================================ per frame
  frame(b: Battle, _dt: number) {
    this.b = b;
    const run = this.run;
    text(this.livesN, Math.max(0, b.lives));
    text(this.goldN, b.gold);
    const cap = interestCap(b);
    const interest = Math.min(cap, Math.floor(b.gold * 0.05));
    const showInt = interest > 0 && (b.phase === "setup" || b.phase === "running");
    text(this.intChip, showInt ? `+${interest}` : "");
    toggle(this.intChip, "on", showInt);
    text(this.crownN, run?.crowns ?? 0);
    toggle(this.crownEl, "hidden", !run);
    const setup = b.phase === "setup";
    text(this.waveLab, setup ? "Setup" : "Wave");
    text(this.waveN, setup ? "" : `${Math.min(b.next, b.waves.length)}/${b.waves.length}`);
    // skull
    const total = countdownTotal(b);
    const p = setup ? 1 : b.countdown < 0 ? 0 : 1 - b.countdown / total;
    this.skullRing.style.strokeDashoffset = String(100 - p * 100);
    const bonus = callBonus(b);
    const moreWaves = b.next < b.waves.length;
    text(this.skullBonus, setup ? "Start" : bonus > 0 && moreWaves ? `+${bonus}` : "");
    toggle(this.skull, "ready", setup || (b.countdown >= 0 && moreWaves));
    toggle(this.skull, "gone", !moreWaves && !setup);
    toggle(this.skull, "start", setup);
    // boss bar or the next-wave strip
    const boss = this.bossOf();
    toggle(this.bossEl, "on", !!boss);
    toggle(this.strip, "off", !!boss);
    if (boss?.boss) {
      const B = BOSSES[boss.boss.id];
      text(this.bossName, B.name);
      this.bossFill.style.width = `${(100 * Math.max(0, boss.hp)) / boss.maxHp}%`;
      toggle(this.bossTele, "on", !!boss.boss.tele);
      if (this.bossNotches.childElementCount === 0) for (const f of [2 / 3, 1 / 3]) this.bossNotches.append(h("i", { style: { left: `${f * 100}%` } }));
    }
    const sig = `${b.next}|${b.phase}|${b.waves.length}|${boss ? 1 : 0}`;
    if (sig !== this.sig) { this.sig = sig; this.buildStrip(b); this.buildKeys(b); this.buildRelics(); }
    // bounty
    toggle(this.bountyEl, "on", !!b.bounty);
    if (b.bounty) { toggle(this.bountyEl, "fail", !b.bounty.ok); }
    // speed
    this.speedBtns.forEach((x, i) => toggle(x, "on", i + 1 === this.speed));
    // bottom: keys affordability, spells, supplies
    this.keysEl.querySelectorAll<HTMLElement>(".wk[data-t]").forEach((el) => {
      const kind = el.dataset.t as TowerId;
      const c = buildCost(b, kind);
      text(el.querySelector(".wc")!, c);
      toggle(el, "short", b.gold < c);
      toggle(el, "armed", this.armed === kind);
    });
    this.spellFrame(b);
    this.supplyFrame(b);
    this.ghostFrame(b);
    this.radial.frame(b);
    // the hovered/focused pad and rings
    const aimT = this.aim?.kind === "tower" ? b.towers.find((t) => t.id === (this.aim as { tower: number }).tower) : null;
    F.pad = aimT ? aimT.pad : this.aim ? null : this.hoverPad ?? this.kbPad;
    if (!this.radial.open) this.restingRing(b);
    F.allRanges = this.alt;
    // enemy tooltip follows the enemy
    if (this.hoverEnemy != null && (this.enemyTipT += _dt) > 0.25) { this.enemyTipT = 0; this.showEnemyTip(); }
    this.ctx.fx.lowLives(b.lives <= 5 && b.phase === "running");
    toggle(this.aimHint, "on", !!this.aim);
  }

  private restingRing(b: Battle) {
    const pid = this.hoverPad ?? this.kbPad;
    if (pid == null || this.aim) { F.ring = null; F.tower = null; return; }
    const pad = b.map.pads[pid];
    const t = towerOn(b, pid);
    if (t) {
      const s = statsOf(b, t.kind, t.level, t.spec, pad, t);
      F.ring = { x: pad.x, y: pad.y, r: s.range, ground: !s.air, accent: t.spec ? SPEC_ACCENT[t.spec] : TOWER_ACCENT[t.kind] };
      F.tower = t.id;
    } else if (this.armed) {
      const s = statsOf(b, this.armed, 1, null, pad);
      F.ring = { x: pad.x, y: pad.y, r: s.range, ground: !s.air, accent: TOWER_ACCENT[this.armed] };
      F.tower = null;
    } else { F.ring = null; F.tower = null; }
  }

  private bossOf(): Enemy | null {
    return this.b?.enemies.find((e) => e.boss && e.hp > 0) ?? null;
  }

  // ================================================================ strip: next wave or who's coming
  private buildStrip(b: Battle) {
    this.strip.replaceChildren();
    if (b.phase === "setup") {
      const lab = h("span.lab.sl", "Who's coming");
      this.strip.append(lab);
      for (const r of b.roster.slice(0, 9)) this.strip.append(this.roleIcon(r, 0, false));
      tip(lab, { title: "Who's coming", line: "Every enemy this battle will send.", meta: [b.theme ? `Theme: <b>${b.theme}</b>.` : "", ACTS[b.act].trait ?? ""].join(" ") });
      return;
    }
    const waves = nextWaves(b, b.loadout.commander === "seer" ? 2 : 1);
    if (!waves.length) { this.strip.append(h("span.lab.sl", "Last wave")); return; }
    waves.forEach((w, wi) => {
      if (wi) this.strip.append(h("span.wsep"));
      const by = new Map<string, { n: number; elite: boolean }>();
      for (const g of w.groups) { const k = by.get(g.kind) ?? { n: 0, elite: false }; k.n += g.count; k.elite ||= !!g.elite; by.set(g.kind, k); }
      const roles = [...by.entries()].sort((a, c) => leakCost(c[0], c[1].elite) - leakCost(a[0], a[1].elite) || c[1].n - a[1].n).slice(0, wi ? 3 : 6);
      for (const [kind, { n, elite }] of roles) this.strip.append(this.roleIcon(kind, n, elite));
      if (!wi && w.badges.length) this.strip.append(h("span.badges", ...w.badges.filter((x) => x !== "new" || true).slice(0, 3).map((bd) => tip(h("span.bd", raw(icon(BADGES[bd]?.glyph ?? "info", { size: 11 }))), { title: BADGES[bd]?.name ?? bd }))));
    });
  }

  private roleIcon(kind: string, n: number, elite: boolean) {
    const L = leakCost(kind, elite);
    const el = h(`span.role${elite ? ".elite" : ""}`, raw(icon(enemyGlyph(kind as Enemy["kind"]), { size: 16, accent: elite ? "#FF9A5A" : "#E9DEC4" })),
      n ? h("span.rn", String(n)) : null,
      h("span.pips", ...Array.from({ length: Math.min(L, 3) }, () => raw(icon("heartpip", { size: 6 })))));
    return tip(el, () => ({ title: enemy(kind).name + (elite ? " (elite)" : ""), glyph: icon(enemyGlyph(kind as Enemy["kind"]), { size: 16 }), line: enemy(kind).line, meta: `Costs <span class="c-life">${L} ${L === 1 ? "life" : "lives"}</span> if it gets through.${n ? ` ${n} in this wave.` : ""}` }));
  }

  private skullTip(): TipSpec | null {
    const b = this.b;
    if (!b) return null;
    if (b.phase === "setup") return { title: "Start", glyph: icon("wave", { size: 16 }), line: "Start the first wave when you are ready. Setup has no timer.", keys: ["Space"] };
    const w = nextWaves(b, 1)[0];
    if (!w) return { title: "Last wave", line: "Hold on: this is the last one." };
    const bonus = callBonus(b);
    return { title: `Next wave: ${w.index + 1}`, glyph: icon("wave", { size: 16 }), line: "What comes next, and the bonus for calling it now.", meta: bonus ? `Call early for <span class="c-gold">+${bonus} gold</span>.` : "", extra: waveRow(w), keys: ["Space"] };
  }

  // ================================================================ war table keys, spells, supplies, relics
  private buildKeys(b: Battle) {
    this.keysEl.replaceChildren();
    const towers = b.loadout.towers;
    const boons = b.loadout.boons;
    for (let i = 0; i < 6; i++) {
      const kind = towers[i];
      if (!kind) { this.keysEl.append(h("div.wk.empty", h("span.wkk", String(i + 1)))); continue; }
      const n = boons.filter((x) => boonTower(x, b.loadout.boonOn) === kind).length;
      const stars = n >= 5 ? 2 : n >= 3 ? 1 : 0;
      const el = h("button.wk", { "data-t": kind, style: { "--ac": TOWER_ACCENT[kind] }, onclick: () => this.pressKey(i) },
        h("span.wkk", String(i + 1)), raw(towerIcon(kind, 20)), h("span.wc.num"),
        stars ? h("span.stars", ...Array.from({ length: stars }, () => raw(icon("star", { size: 7, accent: "#FFD36B" })))) : null,
        h("span.wn", TOWERS[kind].name));
      tip(el, () => {
        const pid = this.radial.pad ?? this.kbPad ?? this.hoverPad;
        const pad = pid != null ? this.b!.map.pads[pid] : undefined;
        const s = statsOf(this.b, kind, 1, null, pad);
        if (pad && !towerOn(this.b!, pad.id)) F.ring = { x: pad.x, y: pad.y, r: s.range, ground: !s.air, accent: TOWER_ACCENT[kind] };
        const bn = boons.filter((x) => boonTower(x, b.loadout.boonOn) === kind).map((x) => boon(x).name);
        return { title: TOWERS[kind].name, glyph: towerIcon(kind, 16), line: TOWERS[kind].line, rows: statRows(kind, s), meta: costLine(buildCost(this.b!, kind), this.b!.gold) + (bn.length ? `<br>Boons: ${bn.join(", ")}` : ""), keys: [String(i + 1)] };
      });
      this.keysEl.append(el);
    }
  }

  private spellFrame(b: Battle) {
    if (this.spellsEl.childElementCount !== b.spells.length) {
      this.spellsEl.replaceChildren(...b.spells.map((sp) => {
        const S = SPELLS[sp.id];
        const el = h("button.spell", { "data-k": sp.key, onclick: () => this.castKey(sp.key) },
          h("span.sg", raw(icon(sp.id, { size: 20, accent: "#FFC07A" }))), h("span.sw"), h("span.st.num"), h("span.skk", kbd(sp.key)), h("span.sn", S.name));
        return tip(el, () => ({ title: S.name, glyph: icon(sp.id, { size: 16, accent: "#FFC07A" }), line: S.line, meta: this.spell(sp.key)!.cooldown > 0 ? `Ready in ${Math.ceil(this.spell(sp.key)!.cooldown / 30)} s.` : b.phase === "setup" ? "Ready once the first wave starts." : '<span class="c-good">Ready.</span> ' + (sp.aim === "instant" || sp.aim === "auto" ? "Casts at once." : "Aim, then click or Enter."), keys: [sp.key] }));
      }));
    }
    for (const sp of b.spells) {
      const el = this.spellsEl.querySelector<HTMLElement>(`[data-k="${sp.key}"]`)!;
      const p = sp.total ? sp.cooldown / sp.total : 0;
      el.style.setProperty("--p", String(p));
      const ready = sp.cooldown <= 0 && b.phase !== "setup";
      text(el.querySelector(".st")!, sp.cooldown > 0 ? Math.ceil(sp.cooldown / 30) : "");
      if (ready && !el.classList.contains("ready")) { el.classList.add("ready"); pulse(el, "ping"); }
      else if (!ready) el.classList.remove("ready");
      toggle(el, "aiming", (this.aim?.kind === "spell" || this.aim?.kind === "tower") && this.aim.key === sp.key);
      toggle(el, "locked", b.phase === "setup");
      toggle(el, "cool", sp.cooldown > 0);
    }
  }

  private supplyFrame(b: Battle) {
    const sup = supplies(b);
    const sig = sup.join(",");
    if (this.supEl.dataset.sig !== sig) {
      this.supEl.dataset.sig = sig;
      this.supEl.replaceChildren(...[0, 1].map((i) => {
        const id = sup[i];
        const key = i === 0 ? "E" : "D";
        const el = h(`button.sup${id ? "" : ".empty"}`, { onclick: () => this.useSupply(i) }, id ? raw(icon(id, { size: 18, accent: "#C9A45A" })) : h("span.sock", key), id ? h("span.skk", kbd(key)) : null);
        return tip(el, () => (id ? { title: SUPPLIES[id].name, glyph: icon(id, { size: 16, accent: "#C9A45A" }), line: SUPPLIES[id].line, meta: "A war supply: one use.", keys: [key] } : { title: "Empty supply slot", line: "War supplies come from elites, shops, events and chests." }));
      }));
    }
    this.supEl.querySelectorAll(".sup").forEach((el, i) => toggle(el, "aiming", this.aim?.kind === "supply" && this.aim.slot === i));
  }

  private buildRelics() {
    const rel = this.run?.loadout.relics ?? this.b?.loadout.relics ?? [];
    this.relicsEl.replaceChildren();
    if (!rel.length) return;
    const col = h("div.rcol");
    for (const id of rel) {
      const R = relic(id);
      col.append(tip(h("span.ri", { "data-nav": "" }, raw(icon(relicGlyph(id), { size: 16, accent: "#D9B86A" }))), { title: R.name, glyph: icon(relicGlyph(id), { size: 16, accent: "#D9B86A" }), line: R.text, meta: R.downside ? `<span class="c-bad">${R.downside}</span>` : "", flavour: R.flavour }));
    }
    const btn = tip(h("button.rbtn", { onclick: () => this.openWarTable() }, raw(icon("r-gem", { size: 15, accent: "#D9B86A" })), h("span.num", String(rel.length))), { title: "Relics and war table", line: "Hover to see your relics. Click for the whole war table.", keys: ["V"] });
    this.relicsEl.append(col, btn);
  }

  private ghostFrame(b: Battle) {
    const g = b.loadout.ghost;
    const show = b.phase === "setup" && !!g?.length && b.towers.length === 0;
    if (show && !this.ghostEl.childElementCount) {
      this.ghostEl.append(tip(h("button.btn.sec.gbtn", { onclick: () => { this.ctx.host.command({ t: "ghost" }); sfx("build"); } }, raw(icon("ghost", { size: 14 })), h("span", "Last layout"), kbd("Enter")),
        { title: "Your last layout", glyph: icon("ghost", { size: 16 }), line: "Builds your last battle's towers on matching spots, as far as your gold goes.", keys: ["Enter"] }));
    }
    toggle(this.ghostEl, "on", show);
    toggle(this.spellsEl, "under", show);
  }

  private openWarTable() {
    if (!this.run) return;
    sfx("open");
    warTable(this.ctx, this.run);
  }

  // ================================================================ actions
  private call() {
    const b = this.b;
    if (!b) return;
    if (b.next >= b.waves.length && b.phase !== "setup") { sfx("deny"); return; }
    this.ctx.host.command({ t: "call" });
    pulse(this.skull, "burst");
    sfx("click");
  }

  setSpeed(n: 1 | 2 | 3, quiet = false) {
    this.speed = n;
    this.ctx.host.setSpeed(n);
    try { /* audio follows the game speed */ (void 0); } catch { /* */ }
    if (!quiet) { sfx("click"); const btn = this.speedBtns[n - 1]; if (btn) pulse(btn, "pop"); }
  }

  private spell(key: "Q" | "W"): SpellState | undefined { return this.b?.spells.find((s) => s.key === key); }

  private castKey(key: "Q" | "W") {
    const b = this.b, sp = this.spell(key);
    if (!b || !sp) return;
    if (this.aim?.kind === "spell" && this.aim.key === key) { this.cancelAim(); return; }
    if (sp.cooldown > 0 || b.phase === "setup") {
      sfx("deny");
      const el = this.spellsEl.querySelector(`[data-k="${key}"]`);
      if (el) pulse(el, "shake");
      return;
    }
    if (TOWER_SPELLS.has(sp.id)) {
      const t = this.radial.tower();
      if (t) { this.ctx.host.command({ t: "cast", spell: key, tower: t.id }); this.radial.close(); return; }
      if (!b.towers.length) { sfx("deny"); return; }
      if (this.aim?.kind === "tower" && this.aim.key === key) { this.cancelAim(); return; }
      this.startAim({ kind: "tower", key, tower: 0, r: 1.1 });
      return;
    }
    if (sp.aim === "instant" || sp.aim === "auto") {
      const t = this.radial.tower();
      this.ctx.host.command({ t: "cast", spell: key, tower: t?.id });
      return;
    }
    this.startAim({ kind: "spell", key, r: sp.radius || 0.8 });
  }

  /** A toast in the first corner clear of the road and the gates (bottom-left above the tray when it is). */
  private toast(b: Battle, glyph: string, t1: string, t2: string) {
    const W = innerWidth, H = innerHeight, bot = this.ctx.root.classList.contains("roomy") ? 62 : 48, w = 250, ht = 64;
    const zones = { bl: [0, H - bot - ht, w, H - bot], br: [W - w, H - bot - ht, W, H - bot], tl: [0, 34, w, 34 + ht], tr: [W - w, 34, W, 34 + ht] } as const;
    const pts: { x: number; y: number }[] = [];
    for (const l of b.map.lanes) for (let i = 1; i < l.points.length; i++) {
      const a = l.points[i - 1]!, c = l.points[i]!, n = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) / 0.5));
      for (let k = 0; k < n; k++) pts.push({ x: a.x + (c.x - a.x) * k / n, y: a.y + (c.y - a.y) * k / n });
    }
    for (const g of [...b.map.spawns, ...b.map.exits]) for (let k = 0; k < 12; k++) for (const r of [0, 1, 2]) pts.push({ x: g.x + Math.cos(k * Math.PI / 6) * r, y: g.y + Math.sin(k * Math.PI / 6) * r });
    const scr = pts.map((p) => this.ctx.host.toScreen(p.x, p.y)).filter((p): p is { x: number; y: number } => !!p);
    const hits = (z: readonly number[]) => scr.filter((p) => p.x > z[0]! - 8 && p.x < z[2]! + 8 && p.y > z[1]! - 8 && p.y < z[3]! + 8).length;
    const best = (Object.keys(zones) as (keyof typeof zones)[]).map((k) => ({ k, n: hits(zones[k]) })).reduce((a, c) => (c.n < a.n ? c : a));
    this.ctx.fx.dock(best.k);
    this.ctx.fx.toast(glyph, t1, t2);
  }

  private useSupply(slot: number) {
    const b = this.b;
    if (!b) return;
    const id = supplies(b)[slot];
    if (!id) { sfx("deny"); return; }
    if (this.aim?.kind === "supply" && this.aim.slot === slot) { this.cancelAim(); return; }
    if (!SUPPLIES[id].aim) { this.ctx.host.command({ t: "supply", slot }); sfx("click"); return; }
    this.startAim({ kind: "supply", slot, r: SUPPLIES[id].r || 0.6 });
  }

  private startAim(a: Aim) {
    const b = this.b!;
    this.radial.close();
    this.armed = null;
    this.aim = a;
    // Rally starts at the current rally point; the rest under the mouse, or at the focused pad, or the road's middle.
    const rt = a.kind === "rally" ? b.towers.find((t) => t.id === a.tower) : null;
    let p = rt ? rt.rally ?? nearestRoad(b, b.map.pads[rt.pad]!.x, b.map.pads[rt.pad]!.y) : this.lastPick ? this.ctx.host.pick(this.lastPick.cx, this.lastPick.cy) : null;
    if (!p) { const pid = this.kbPad ?? this.hoverPad; p = pid != null ? { x: b.map.pads[pid].x, y: b.map.pads[pid].y } : lanePoint(b, 0.4); }
    this.setAim(p.x, p.y);
    const what = a.kind === "spell" || a.kind === "tower" ? SPELLS[this.spell(a.key)!.id].name : a.kind === "supply" ? SUPPLIES[supplies(b)[a.slot]!].name : "Rally point";
    const how = a.kind === "rally" ? " Arrows move · Enter sets" : a.kind === "tower" ? " Pick a tower: click it, or arrows and Enter." : " Click the road, or Enter.";
    this.aimHint.replaceChildren(h("b", what), h("span", how), h("span.dim", a.kind === "rally" ? " · ⌫ cancels" : " ⌫ cancels."));
    sfx("open");
  }
  private setAim(x: number, y: number) {
    const a = this.aim, b = this.b;
    if (!a || !b) return;
    if (a.kind === "tower") {
      let best: Tower | null = null, bd = 1.6;
      for (const t of b.towers) { const p = b.map.pads[t.pad]!; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = t; } }
      if (!best && a.tower) return;
      a.tower = best?.id ?? 0;
      const p = best ? b.map.pads[best.pad]! : null;
      F.aim = p ? { x: p.x, y: p.y, r: a.r, ok: true } : { x, y, r: 0.4, ok: false };
      return;
    }
    const near = distToRoad(b, x, y);
    const ok = a.kind === "rally" ? near <= 1.6 : near <= 2.4;
    if (a.kind === "rally") { F.rally = { x, y }; F.aim = { x, y, r: a.r, ok }; }
    else F.aim = { x, y, r: a.r, ok };
  }
  private confirmAim() {
    const a = this.aim, at = F.aim;
    if (!a || !at) return;
    if (!at.ok) { sfx("deny"); return; }
    if (a.kind === "tower") this.ctx.host.command({ t: "cast", spell: a.key, tower: a.tower });
    else if (a.kind === "spell") this.ctx.host.command({ t: "cast", spell: a.key, x: at.x, y: at.y });
    else if (a.kind === "supply") this.ctx.host.command({ t: "supply", slot: a.slot, x: at.x, y: at.y });
    else { this.ctx.host.command({ t: "rally", tower: a.tower, x: at.x, y: at.y }); sfx("rally"); }
    this.aim = null; F.aim = null; F.rally = null;
  }
  /** Tower aim: the nearest of your towers in that direction. */
  private stepTowerAim(dx: number, dy: number) {
    const b = this.b!, a = this.aim as Extract<Aim, { kind: "tower" }>;
    const cur = b.towers.find((t) => t.id === a.tower);
    const from = cur ? b.map.pads[cur.pad]! : { x: b.map.w / 2, y: b.map.h / 2 };
    const L = Math.hypot(dx, dy);
    let best: Tower | null = null, bs = Infinity;
    for (const t of b.towers) {
      if (t === cur) continue;
      const p = b.map.pads[t.pad]!, vx = p.x - from.x, vy = p.y - from.y;
      const along = (vx * dx + vy * dy) / L;
      if (cur && along <= 0.3) continue;
      const s = Math.abs(along) + Math.abs(vx * dy - vy * dx) / L * 1.8;
      if (s < bs) { bs = s; best = t; }
    }
    if (!best) { sfx("deny"); return; }
    const p = b.map.pads[best.pad]!;
    a.tower = 0;
    this.setAim(p.x, p.y);
    sfx("hover");
  }
  private cancelAim() { this.aim = null; F.aim = null; F.rally = null; sfx("back"); }

  /** 1-6: build on the focused spot, or pick the tower and then click a spot. */
  private pressKey(i: number) {
    const b = this.b;
    if (!b) return;
    const kind = b.loadout.towers[i];
    if (!kind) { sfx("deny"); return; }
    const pid = this.kbPad ?? null;
    if (pid != null && !towerOn(b, pid) && !b.map.pads[pid].rubble) { this.build(pid, kind); return; }
    this.armed = this.armed === kind ? null : kind;
    sfx(this.armed ? "click" : "back");
  }
  private build(pad: number, kind: TowerId) {
    const b = this.b!;
    if (b.gold < buildCost(b, kind)) { sfx("deny"); this.denyGold(); const el = this.keysEl.querySelector(`[data-t="${kind}"]`); if (el) pulse(el, "shake"); return; }
    this.ctx.host.command({ t: "build", pad, tower: kind });
    this.armed = null;
  }

  private openPad(pid: number) {
    const b = this.b!;
    if (this.armed && !towerOn(b, pid) && !b.map.pads[pid].rubble) { this.build(pid, this.armed); return; }
    this.radial.show(b, pid);
  }

  // ================================================================ keys (R28)
  key(e: KeyboardEvent): boolean {
    const b = this.b;
    if (!b) return false;
    const k = e.key, lk = k.toLowerCase();
    if (k === "Alt") { this.alt = true; return true; }
    // Backspace (Esc in the original; Escape is the panel's) priority: cancel aim > close radial > pause (R28)
    if (k === "Backspace") {
      if (this.aim) { this.cancelAim(); return true; }
      if (this.radial.open) { this.radial.close(); sfx("close"); return true; }
      if (this.armed) { this.armed = null; sfx("back"); return true; }
      this.ctx.pause(true); return true;
    }
    if (e.repeat && k !== "ArrowLeft" && k !== "ArrowRight" && k !== "ArrowUp" && k !== "ArrowDown") return true;
    if (this.aim) {
      const at = F.aim!;
      const step = e.shiftKey ? 1.2 : 0.45;
      const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k];
      if (mv && this.aim.kind === "tower") { this.stepTowerAim(mv[0], mv[1]); return true; }
      if (mv) { this.setAim(at.x + mv[0], at.y + mv[1]); return true; }
      if (k === "Enter") { this.confirmAim(); return true; }
      if (lk === "q" || lk === "w") { this.castKey(k.toUpperCase() as "Q" | "W"); return true; }
    }
    if (this.radial.open && this.radial.key(e)) return true;
    switch (lk) {
      case " ": this.call(); return true;
      case "f": this.setSpeed(((this.speed % 3) + 1) as 1 | 2 | 3); return true;
      case "p": this.ctx.pause(true); return true;
      case "q": case "w": this.castKey(k.toUpperCase() as "Q" | "W"); return true;
      case "e": this.useSupply(0); return true;
      case "d": this.useSupply(1); return true;
      case "v": this.openWarTable(); return true;
      case "u": case "x": case "t": case "r": {
        const pid = this.kbPad ?? this.hoverPad;
        if (pid != null && towerOn(b, pid)) { this.radial.show(b, pid); this.radial.key(e); }
        return true;
      }
      case "enter": {
        const pid = this.kbPad ?? this.hoverPad;
        if (pid != null) { this.openPad(pid); return true; }
        if (b.phase === "setup" && b.loadout.ghost?.length && !b.towers.length) { this.ctx.host.command({ t: "ghost" }); sfx("build"); return true; }
        this.movePad(null);
        return true;
      }
      case "tab": this.cyclePad(e.shiftKey ? -1 : 1); return true;
      case "arrowleft": this.movePad([-1, 0]); return true;
      case "arrowright": this.movePad([1, 0]); return true;
      case "arrowup": this.movePad([0, -1]); return true;
      case "arrowdown": this.movePad([0, 1]); return true;
    }
    if (/^[1-6]$/.test(k)) { this.pressKey(+k - 1); return true; }
    return false;
  }
  keyUp(e: KeyboardEvent) { if (e.key === "Alt") { this.alt = false; e.preventDefault(); } }

  private padsSorted(b: Battle): Pad[] { return [...b.map.pads].sort((a, c) => a.x - c.x || a.y - c.y); }
  private cyclePad(d: number) {
    const b = this.b!, ps = this.padsSorted(b);
    const i = ps.findIndex((p) => p.id === this.kbPad);
    this.setKbPad(ps[(i + d + ps.length) % ps.length].id);
  }
  /** Arrow keys: the nearest spot in that direction (by angle and distance). */
  private movePad(dir: [number, number] | null) {
    const b = this.b!;
    const cur = this.kbPad ?? this.hoverPad;
    if (cur == null || !dir) {
      // Start at the spot nearest the screen centre.
      const c = { x: b.map.w / 2, y: b.map.h / 2 };
      const p = b.map.pads.reduce((a, q) => (Math.hypot(q.x - c.x, q.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? q : a));
      this.setKbPad(p.id);
      return;
    }
    const a = b.map.pads[cur];
    let best: Pad | null = null, bs = Infinity;
    for (const p of b.map.pads) {
      if (p.id === cur) continue;
      const vx = p.x - a.x, vy = p.y - a.y;
      const along = vx * dir[0] + vy * dir[1];
      if (along <= 0.3) continue;
      const across = Math.abs(vx * dir[1] - vy * dir[0]);
      const s = along + across * 1.8;
      if (s < bs) { bs = s; best = p; }
    }
    if (best) this.setKbPad(best.id); else sfx("deny");
  }
  private setKbPad(id: number) {
    this.kbPad = id;
    this.hoverPad = null;
    if (this.radial.open && this.radial.pad !== id) this.radial.close();
    sfx("hover");
    this.padTip(id);
  }

  private padTip(id: number | null) {
    const b = this.b;
    if (id == null || !b || this.radial.open || b.phase === "won" || b.phase === "lost") { if (!this.radial.open) hideTip(); return; }
    const pad = b.map.pads[id];
    const p = this.ctx.host.toScreen(pad.x, pad.y, 0);
    if (!p) return;
    const s = this.ctx.scale();
    const t = towerOn(b, id);
    const spec: TipSpec = t
      ? { title: t.spec ? `${TOWERS[t.kind].name}: ${t.spec}` : `${TOWERS[t.kind].name} ${["", "I", "II", "III"][t.level] ?? ""}`, glyph: towerIcon(t.kind, 16), line: "Click or Enter for upgrades.", keys: ["Enter", "U", "X"] }
      : pad.rubble ? { title: "Rubble", glyph: icon("hammer", { size: 16 }), line: `Clear it for ${pad.rubble} gold, then build.`, keys: ["Enter"] }
      : { title: pad.high ? "High ground" : "Build spot", glyph: icon("build", { size: 16, accent: "#C9A45A" }), line: pad.high ? "Where a tower can stand. Towers here reach 15% further." : "Where a tower can stand.", keys: ["Enter", "1-6"] };
    showAt(spec, { x: p.x / s - 14, y: p.y / s - 14, w: 28, h: 28 });
  }

  // ================================================================ pointer
  private bindPointer() {
    const isUi = (t: EventTarget | null) => !!(t as Element | null)?.closest?.(".live, button, [data-nav], .ovl");
    addEventListener("pointermove", (e: PointerEvent) => {
      if (!this.b || this.el.style.display === "none" || this.ctx.root.querySelector(".ovl")) return;
      this.lastPick = { cx: e.clientX, cy: e.clientY };
      if (isUi(e.target)) { if (this.hoverPad != null) { this.hoverPad = null; } return; }
      const p = this.ctx.host.pick(e.clientX, e.clientY);
      if (this.aim) { if (p) this.setAim(p.x, p.y); return; }
      const pad = p ? nearestPad(this.b, p.x, p.y, 1.1) : null;
      if (pad?.id !== this.hoverPad) {
        this.hoverPad = pad?.id ?? null;
        if (pad) { this.kbPad = null; sfx("hover"); }
        if (!this.radial.open) this.padTip(this.hoverPad);
      }
      const en = !pad && p ? nearestEnemy(this.b, p.x, p.y, 0.7) : null;
      if ((en?.id ?? null) !== this.hoverEnemy) { this.hoverEnemy = en?.id ?? null; if (en) this.showEnemyTip(); else if (!pad && !this.radial.open) hideTip(); }
    });
    addEventListener("pointerdown", (e: PointerEvent) => {
      if (!this.b || this.el.style.display === "none" || this.ctx.root.querySelector(".ovl")) return;
      if (isUi(e.target)) return;
      if (e.button === 2) { this.rightCancel(); return; }
      if (e.button !== 0) return;
      const p = this.ctx.host.pick(e.clientX, e.clientY);
      if (this.aim) { if (p) { this.setAim(p.x, p.y); this.confirmAim(); } return; }
      const pad = p ? nearestPad(this.b, p.x, p.y, 1.1) : null;
      if (pad) { this.openPad(pad.id); return; }
      if (this.radial.open) { this.radial.close(); sfx("close"); }
      else if (this.armed) { this.armed = null; sfx("back"); }
    });
    addEventListener("contextmenu", (e) => { if (this.b && this.el.style.display !== "none") e.preventDefault(); });
  }
  private rightCancel() {
    if (this.aim) this.cancelAim();
    else if (this.radial.open) { this.radial.close(); sfx("close"); }
    else if (this.armed) { this.armed = null; sfx("back"); }
  }

  private showEnemyTip() {
    const b = this.b, id = this.hoverEnemy;
    const en = b?.enemies.find((x) => x.id === id && x.hp > 0);
    if (!b || !en || b.phase === "won" || b.phase === "lost") { this.hoverEnemy = null; hideTip(); return; }
    const p = this.ctx.host.toScreen(en.x, en.y, en.z + 0.6);
    if (!p) return;
    const s = this.ctx.scale();
    showAt(enemyPanel(en), { x: p.x / s - 12, y: p.y / s - 12, w: 24, h: 24 });
  }

  /** The battle is over: close menus and drop any pad or enemy tooltip. */
  private endBattle() {
    this.radial.close();
    this.hoverPad = null; this.hoverEnemy = null; this.kbPad = null;
    hideTip();
  }

  // ================================================================ events
  onEvents(evs: readonly BattleEvent[], b: Battle) {
    for (const ev of evs) {
      switch (ev.e) {
        case "wave_start":
          pulse(this.waveN, "pop");
          this.ctx.fx.banner(`Wave ${ev.wave + 1}`, ev.early && ev.bonus ? `Called early: +${ev.bonus} gold` : ev.wave + 1 === b.waves.length ? "The last wave" : "", "small", ACTS[b.act].key, 1200);
          if (ev.interest > 0) pulse(this.intChip, "pop");
          break;
        case "gold":
          if (ev.amount > 0) pulse(this.goldN, "pop"); else pulse(this.goldN, "flash-bad");
          break;
        case "build": case "upgrade": case "specialise": case "sell":
          pulse(this.goldN, ev.e === "sell" ? "flash-good" : "flash-bad");
          if (this.radial.open) setTimeout(() => this.radial.refresh(), 0);
          break;
        case "deny": this.denyGold(); sfx("deny"); break;
        case "leak":
          pulse(this.livesEl, "shake"); pulse(this.livesN, "flash-bad"); this.ctx.fx.hit();
          break;
        case "synergy_first":
          this.toast(b, icon("star", { size: 18, accent: "#FFD36B" }), ev.name, "A new synergy, found in battle.");
          break;
        case "spawn":
          if (!this.seenRoles.has(ev.kind) && !BOSSES[ev.kind as keyof typeof BOSSES]) {
            this.seenRoles.add(ev.kind);
            this.toast(b, icon(enemyGlyph(ev.kind), { size: 18, accent: "#E9DEC4" }), `New: ${enemy(ev.kind).name}`, enemy(ev.kind).line);
          }
          { const en = b.enemies.find((x) => x.id === ev.id); if (en?.elite) this.ctx.fx.banner("An elite approaches", enemy(en.kind).name, "small", "#FF9A5A", 1400); }
          break;
        case "boss_spawn": this.ctx.fx.banner(BOSSES[ev.boss].name, "", "boss", ACTS[b.act].key, 1500); this.bossNotches.replaceChildren(); break;
        case "boss_phase": pulse(this.bossEl, "shake"); break;
        case "boss_telegraph": pulse(this.bossTele, "pop"); break;
        case "spell_ready": break;
        case "victory": this.endBattle(); this.ctx.fx.banner("Battle won", "", "", "#FFD36B", 1800); break;
        case "defeat": this.endBattle(); this.ctx.fx.banner("The gate has fallen", "", "lost", "#FF5D5D", 2200); break;
        case "tower_disabled": if (this.radial.open) this.radial.refresh(); break;
      }
    }
  }
}

// ---------------------------------------------------------------- helpers
/** The battle's own supply slots (used ones go null in the sim), else the loadout's. */
const supplies = (b: Battle) => b.supplies ?? b.loadout.supplies;
function nearestPad(b: Battle, x: number, y: number, max: number): Pad | null {
  let best: Pad | null = null, bd = max;
  for (const p of b.map.pads) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
  return best;
}
function nearestEnemy(b: Battle, x: number, y: number, max: number): Enemy | null {
  let best: Enemy | null = null, bd = max;
  for (const e of b.enemies) { if (e.hp <= 0 || (e.stealth && !e.st.revealed)) continue; const d = Math.hypot(e.x - x, e.y - y) - (e.boss ? 0.6 : 0); if (d < bd) { bd = d; best = e; } }
  return best;
}
/** The nearest point on any road, and how far it is. */
function nearestRoad(b: Battle, x: number, y: number): { x: number; y: number; d: number } {
  let best = { x, y, d: Infinity };
  for (const l of b.map.lanes) for (let i = 1; i < l.points.length; i++) {
    const a = l.points[i - 1], c = l.points[i];
    const dx = c.x - a.x, dy = c.y - a.y, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L));
    const px = a.x + dx * t, py = a.y + dy * t, d = Math.hypot(px - x, py - y);
    if (d < best.d) best = { x: px, y: py, d };
  }
  return best;
}
const distToRoad = (b: Battle, x: number, y: number) => nearestRoad(b, x, y).d;
function lanePoint(b: Battle, f: number) {
  const l = b.map.lanes[0];
  const s = l.length * f;
  for (let i = 1; i < l.points.length; i++) if (l.cum[i] >= s) {
    const k = (s - l.cum[i - 1]) / (l.cum[i] - l.cum[i - 1] || 1);
    return { x: l.points[i - 1].x + (l.points[i].x - l.points[i - 1].x) * k, y: l.points[i - 1].y + (l.points[i].y - l.points[i - 1].y) * k };
  }
  return l.points[0];
}

function waveRow(w: WavePlan): HTMLElement {
  const by = new Map<string, number>();
  for (const g of w.groups) by.set(g.kind, (by.get(g.kind) ?? 0) + g.count);
  return h("div.wrow", ...[...by].map(([k, n]) => h("span.stat", raw(icon(enemyGlyph(k as Enemy["kind"]), { size: 14 })), h("span.num", String(n)))));
}

/** The enemy hover panel (art 7.7): role, name, HP, armour/ward, statuses, one line. */
export function enemyPanel(en: Enemy): HTMLElement {
  const E = enemy(en.kind);
  const st = en.st;
  const active: [string, string, number][] = [];
  if (st.frozen > 0) active.push(["frozen", "frozen", st.frozen]); else if (st.chill > 0) active.push(["chill", "chill", 0]);
  if (st.burnT > 0) active.push(["burn", "burn", st.burnT]);
  if (st.oiled > 0) active.push(["oiled", "oiled", st.oiled]);
  if (st.marked > 0) active.push(["marked", "marked", st.marked]);
  if (st.hexed > 0) active.push(["hexed", "hexed", st.hexed]);
  if (st.shred > 0) active.push(["shred", "shred", st.shredT]);
  if (st.stun > 0) active.push(["stun", "stun", st.stun]);
  if (st.root > 0) active.push(["rooted", "rooted", st.root]);
  if (st.slowT > 0) active.push(["slow", "slow", st.slowT]);
  if (en.shield > 0) active.push(["shield", "shield", 0]);
  const hp = Math.max(0, en.hp) / en.maxHp;
  return h("div.etip",
    h("div.tt", raw(icon(enemyGlyph(en.kind), { size: 16, accent: en.elite || en.boss ? "#FF9A5A" : "#E9DEC4" })), h("span", E.name + (en.elite ? " (elite)" : ""))),
    h("div.ehp", h("i", { style: { width: `${hp * 100}%` } }), en.shield > 0 ? h("i.sh", { style: { width: `${Math.min(1, en.shield / en.maxHp) * 100}%` } }) : null, h("span.num", `${Math.ceil(en.hp)} / ${Math.ceil(en.maxHp)}`)),
    h("div.row",
      en.armour ? h("span.stat", raw(icon("armour", { size: 12, accent: "#C8CED6" })), h("span.num", String(en.armour))) : null,
      en.ward ? h("span.stat", raw(icon("ward", { size: 12, accent: "#CDA8FF" })), h("span.num", String(en.ward))) : null,
      en.fireproof ? h("span.stat", raw(icon("fireproof", { size: 12, accent: "#FFB15A" })), h("span.num", String(en.fireproof))) : null,
      en.air ? h("span.stat", raw(icon("air", { size: 12 })), h("span.sm", "Flying")) : null,
      en.affixes.length ? h("span.sm", en.affixes.join(", ")) : null),
    active.length ? h("div.sts", ...active.map(([g, n, tks]) => h("span.st", { style: { "--c": STATUSES[n].color } }, raw(icon(g, { size: 11, accent: STATUSES[n].color })), h("span", STATUSES[n].name), tks ? h("i", { style: { width: `${Math.min(1, tks / 120) * 100}%` } }) : null))) : null,
    h("div.tl", E.line),
  );
}
