// The UiModel over the real rules (src/game/game.ts). This is the only file in the UI that knows the Game's shape.
//   const ui = new Ui(root, gameModel(game, { settings, setSettings, resetSave }));
import type { Game } from "../../game/game.ts";
import { STATS, type PlanetId, type Stat } from "../../game/types.ts";
import { FINDS, ORE_IDS, JACKPOT_IDS, ARTIFACT_IDS, CACHES, BIOMES, PLANETS, CHAMBER, biomeDef, findByKey, oreOnPlanet } from "../../game/content/world.ts";
import {
  UPGRADES, GATES, ITEMS, ITEM_KEYS, LIFT_SEGMENTS, MODULES, RESEARCH, RIG_MAX, rigYield, LAB_LEVELS, LAB_RATE, LAB_FROM,
  LANCE_PARTS, HEARTSTONE_NEEDED, PERKS, ACHIEVEMENTS, PLANET_ECON, INGOT_MULT, fuelPrice, shardsFor, type ItemId, type ModuleId,
} from "../../game/content/economy.ts";
import * as meta from "../../game/meta.ts";
import { effectText, type Building, type LogPage, type ResearchNode, type Result, type Settings, type UiModel } from "./model.ts";

const TIER_NAMES: Partial<Record<Stat, Record<number, string>>> = {
  drill: { 2: "Steel bit", 5: "Carbide auger", 8: "Diamond crown", 11: "Thermal drill", 14: "Sower-steel bit", 17: "Core breaker", 20: "Seed lance" },
  hull: { 3: "Riveted", 6: "Plated", 9: "Ceramic", 12: "Obsidian-clad", 15: "Sower shell", 18: "Starhull" },
  engine: { 5: "Orange flame", 10: "White flame", 15: "Blue flame", 20: "Violet flame" },
  radiator: { 4: "First fins", 8: "Second fins", 12: "Third fins", 16: "Fourth fins", 20: "Fifth fins" },
  tank: { 4: "Side tank", 8: "Second side tank", 12: "Third side tank", 16: "Fourth side tank" },
  cargo: { 5: "Longer bay", 10: "Wide bay", 15: "Deep bay", 20: "Hauler bay" },
  lamp: { 4: "Warm beam", 8: "White beam", 12: "Cold beam" },
  scanner: { 1: "Antenna", 4: "Dish", 8: "Ring dish" },
};
const MODULE_IDS = Object.keys(MODULES) as ModuleId[];
/** The UI's icon keys for modules where they differ from the Game's ids. */
const MOD_ICON: Partial<Record<ModuleId, string>> = { dense: "packing" };
const uiMod = (id: string) => MOD_ICON[id as ModuleId] ?? id;
const gameMod = (id: string) => (MODULE_IDS.find((m) => uiMod(m) === id) ?? id) as ModuleId;
/** Fields the rules are still settling: read them by name so a rename never breaks the UI's build. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const any = (x: unknown) => x as any;
const needsOf = (r: unknown): string[] => any(r).needs ?? [];
const moduleOf = (r: unknown): string | undefined => any(r).module;
/** A gate's name: an upgrade, or the Lift. */
const gateName = (st: string, need: number) => (st === "lift" ? "Lift" : `${UPGRADES[st as Stat]?.name ?? st} ${need}`);
const BUILDINGS: Record<Building, string> = { workshop: "workshop", supply: "supply", lab: "lab", rigs: "rigs", launch: "launch", market: "market", fuel: "fuel" };

export interface SurfaceHooks {
  settings: Settings;
  /** Learned first-run hints, kept by storage.ts (optional: without it they last the session). */
  hints?: { done: string[]; save(done: string[]): void };
  setSettings(s: Partial<Settings>): void;
  resetSave(): void;
}

export function gameModel(g: Game, hooks: SurfaceHooks): UiModel {
  const s = () => g.s;
  const pod = () => g.pod;
  const hs = () => findByKey("heartstone")?.id ?? 0;
  const col = new Map<string, number>();
  /** A node's column: its depth in the prerequisites, or without them its rank in its branch by opening biome and cost. */
  const depth = (id: string): number => {
    if (col.has(id)) return col.get(id)!;
    const r = RESEARCH.find((x) => x.id === id)!;
    const needs = needsOf(r);
    const key = (x: typeof r) => (x.biome ?? 0) * 1e5 + (x.launches ?? 0) * 1e4 + x.cost;
    const d = needs.length ? 1 + Math.max(...needs.map(depth)) : RESEARCH.filter((x, i) => x.branch === r.branch && !needsOf(x).length && (key(x) < key(r) || (key(x) === key(r) && i < RESEARCH.indexOf(r)))).length;
    col.set(id, d);
    return d;
  };
  /** A biome as it reads mid-sentence: "Stone", "the Crystal caves", "the core". */
  const slotName = (slot: number) => {
    if (slot >= 7) return "the chamber";
    const n = biomeDef(s().planet, slot).name;
    return n.startsWith("The ") ? `the ${n.slice(4)}` : n.includes(" ") ? `the ${n}` : n;
  };
  const lastDiveMin = () => Math.max(0.25, (s().time - s().diveStart) / 60);

  const learned = new Set(hooks.hints?.done ?? []);
  const m: UiModel = {
    get view() { return g; },
    get cash() { return s().cash; },
    get data() { return s().data; },
    get shards() { return s().shards; },
    get reached() { return Math.min(6, s().reached); },
    get biomes() { return [0, 1, 2, 3, 4, 5, 6].map((b) => biomeDef(s().planet, b).name); },
    get records() {
      const h = s().hauls, last = h[h.length - 1] ?? 0;
      return { deepest: s().deepest, bestHaul: s().records.richestHaul, launches: s().records.launches, lastHaul: last, perMin: last / lastDiveMin() };
    },
    get goal() {
      const t = this.tutorial;
      if (this.seed?.ok) return "Wake the Seed: press E";
      if (!t.sold) return "Dig down and bring ore back to the pad";
      if (!t.bought) return "Buy your first upgrade at the workshop";
      const gl = g.nextGoal();
      if (gl.kind === "lance") {
        const part = gl.parts.find((x) => !x.owned);
        if (gl.ready) return "Ready. Dock with the Seed in the chamber.";
        return part ? `The lance: ${part.name} $${Math.round(part.price).toLocaleString("en-US")} · Heartstone ${Math.min(gl.heartstone, gl.need)}/${gl.need}` : `Bring ${gl.need} Heartstone · ${Math.min(gl.heartstone, gl.need)}/${gl.need}`;
      }
      if (gl.open) return `${gl.name} is open. Dig past ${(gl.row * 10).toLocaleString("en-US")} m.`;
      const miss = gl.gates.filter((x) => x.have < x.need).map((x) => gateName(x.stat, x.need));
      const toGo = Math.max(0, gl.total - s().cash);
      return `${gl.name}: ${miss.join(", ")}${toGo > 0 ? ` · $${Math.round(toGo).toLocaleString("en-US")} to go` : ""}`;
    },
    get suggestion() {
      const sg = g.suggestion();
      if (!sg) return null;
      const last = this.records.lastHaul;
      const short = sg.cost - s().cash;
      return { stat: sg.stat, label: sg.name, cost: sg.cost, text: sg.why, note: "", dives: short > 0 && last > 0 ? Math.max(1, Math.ceil(short / last)) : undefined };
    },
    get next() {
      const gl = g.nextGoal();
      if (gl.kind === "lance") {
        const total = gl.parts.filter((x) => !x.owned).reduce((a, x) => a + x.price, 0);
        return { name: "The lance", row: 750, gates: [...gl.parts.map((x) => ({ label: x.name.replace(/^Lance /, ""), met: x.owned })), { label: `Heartstone ${gl.need}`, met: gl.heartstone >= gl.need }], toGo: Math.max(0, total - s().cash), total: Math.max(1, total), open: gl.ready };
      }
      return { name: gl.name, row: gl.row, gates: gl.gates.map((x) => ({ label: gateName(x.stat, x.need), met: x.have >= x.need })), toGo: Math.max(0, gl.total - s().cash), total: Math.max(1, gl.total), open: gl.open };
    },
    get upgrades() {
      const next = Math.min(7, s().reached + 1), gate = GATES[next] as Record<string, number>;
      const b = Math.min(6, s().reached);
      return STATS.map((st) => {
        const L = s().levels[st], cap = g.upgradeCap(st);
        return {
          stat: st, name: UPGRADES[st].name, level: L, cap, cost: L >= cap ? null : g.upgradePrice(st),
          now: effectText(st, L, b), next: effectText(st, L + 1, b), tier: TIER_NAMES[st]?.[L + 1], gate: (gate[st] ?? 0) > L,
        };
      });
    },
    get lift() {
      return LIFT_SEGMENTS.map((seg, i) => ({
        name: `${seg.name} segment`, rows: [seg.top, seg.end] as [number, number], built: i < s().lift,
        cost: i === s().lift ? g.liftPrice() : seg.price, open: s().everReached >= seg.onSale || s().reached >= seg.onSale,
        why: `Opens at ${slotName(seg.onSale)}`,
      }));
    },
    get modules() {
      const slots = g.moduleSlots();
      const eq: (string | null)[] = Array.from({ length: slots }, (_, i) => (s().modules[i] ? uiMod(s().modules[i]) : null));
      const node = (id: ModuleId) => RESEARCH.find((r) => moduleOf(r) === id);
      const owned = (id: ModuleId) => (any(g).moduleOwned ? any(g).moduleOwned(id) : g.moduleUnlocked(id));
      return {
        slots, equipped: eq,
        cards: MODULE_IDS.map((id) => {
          const d = any(MODULES[id]);
          const opens: number | undefined = d.opens;
          return {
            id: uiMod(id), name: d.name, text: d.text, owned: owned(id),
            ...(d.cost !== undefined ? { cost: any(g).modulePrice ? any(g).modulePrice(id) : d.cost, open: opens === undefined || s().everReached >= opens } : {}),
            why: opens !== undefined ? `Opens at ${slotName(opens)}` : `Research ${node(id)?.name ?? "it"} at the lab`,
          };
        }),
        nextSlot: !s().fungalSlot ? "Opens in the Fungal hollows" : slots < 4 ? `Research ${RESEARCH.find((r) => /module/i.test(r.text) && /slot/i.test(r.text))?.name ?? "it"} at the lab` : undefined,
      };
    },
    get items() {
      const p = pod();
      const rows = ITEM_KEYS.map((id) => ({
        key: id, name: ITEMS[id].name, slot: ITEMS[id].key, count: p.items[id] ?? 0, carry: g.carry(id), price: g.itemPrice(id),
        open: g.itemOpen(id), why: `On sale from ${slotName(ITEMS[id].from)}`, text: ITEMS[id].text,
      }));
      return [...rows, { key: "overcharge", name: "Overcharge", slot: 7, count: g.moduleOn("overcharge") ? 1 : 0, carry: 1, price: 0, open: g.moduleOn("overcharge"), text: MODULES.overcharge.text, cooldown: p.overchargeCd }];
    },
    get tree() {
      return RESEARCH.map((r): ResearchNode => {
        const open = g.researchOpen(r.id);
        const state = g.has(r.id) ? "bought" : open === true ? "open" : "locked";
        const mod = moduleOf(r);
        return { id: r.id, name: r.name, branch: r.branch as ResearchNode["branch"], col: depth(r.id), cost: r.cost, needs: needsOf(r), state, text: r.text, ...(open !== true && state === "locked" ? { why: open } : {}), ...(mod ? { module: uiMod(mod) } : {}) };
      });
    },
    get lab() {
      const L = s().lab;
      return { level: L, cap: LAB_LEVELS.length, cost: L >= LAB_LEVELS.length ? null : g.labPrice(), rate: LAB_RATE * L, open: s().reached >= LAB_FROM, why: `Opens at ${slotName(LAB_FROM)}` };
    },
    get rigs() {
      const reached = s().reached;
      return [0, 1, 2, 3, 4, 5, 6].map((b) => {
        const l = s().rigs[b] ?? 0;
        return {
          biome: b, name: biomeDef(s().planet, b).name, level: l, cap: RIG_MAX, cost: l >= RIG_MAX ? null : g.rigPrice(b),
          yield: rigYield(b, l), next: rigYield(b, l + 1), state: l ? "Running" : "Not built", open: g.rigsOpen() && b <= reached,
          why: g.rigsOpen() ? `Reach ${slotName(b)} first` : `Opens at ${slotName(1)}`,
        } as const;
      });
    },
    get silo() {
      const hours = meta.siloHours(g), rate = meta.rigsPerMin(g);
      return { fill: rate > 0 ? Math.min(1, s().silo / (rate * 60 * hours)) : 0, held: s().silo, capHours: hours, open: g.has("A1") };
    },
    get launch() {
      const S = s();
      const planet = (id: PlanetId) => {
        const P = PLANETS[id as "vell"], E = any(PLANET_ECON[id as "vell"]);
        const value: number = E.value ?? E.ownValue ?? 1;
        const mods = [value !== 1 ? `Ore worth ${Math.round((value - 1) * 100)}% more${E.ownValue ? " in its own biome" : ""}` : "", E.gravity !== 1 ? `Gravity ${E.gravity}` : "", P.hazard ? `${P.hazard[0].toUpperCase()}${P.hazard.slice(1)}` : "", P.unique ? findByKey(P.unique)?.name ?? "" : ""].filter(Boolean);
        const own = P.own >= 0 ? BIOMES[P.biomes[P.own]] : null;
        return { id, name: P.name, text: own ? `${own.name}: ${own.line}` : "Home.", mods, first: !S.log.planets.includes(id), sky: P.sky };
      };
      const lens = (1 + 0.1 * (S.perks.lens ?? 0)) * (g.has("X3") ? 1.2 : 1);
      const gl = g.nextGoal();
      return {
        open: S.plans || S.reached >= 6, why: "The launch site opens when you reach the Core.",
        parts: LANCE_PARTS.map((p, i) => ({ id: p.id, name: p.name, cost: g.lancePrice(p.id), owned: S.lance.includes(p.id), open: S.plans && (i === 0 || S.lance.includes(LANCE_PARTS[i - 1].id)), why: S.plans ? "Build the part before it" : "Reach the Core" })),
        heart: { have: pod().cargo[hs()] ?? 0, need: HEARTSTONE_NEEDED },
        shards: S.launch?.shards ?? shardsFor(S.earned, S.launches, lens, !S.log.planets.includes(S.planet)),
        ready: gl.kind === "lance" && gl.ready,
        carries: ["Research and data", "Shards and perks", "The log and achievements", "Records"],
        resets: ["Cash and upgrades", "Rigs, items and the Lift", "The world: a new one"],
        planet: planet(S.planet), planets: (S.launch?.choices ?? meta.planetChoices(g)).map(planet), seedAge: S.launches,
        choosing: S.launch?.phase === "choose",
      };
    },
    get perks() {
      return PERKS.map((p) => { const L = s().perks[p.id] ?? 0, c = p.cost(L); return { id: p.id, name: p.name, level: L, cap: p.max, cost: L >= p.max || !Number.isFinite(c) ? null : c, text: p.text }; });
    },
    get log() {
      const S = s(), lf = S.log.finds;
      const page = (id: string, name: string, entries: LogPage["entries"], reward: string): LogPage => ({ id, name, entries, reward, done: entries.filter((e) => e.found).length });
      const where = (fid: number) => {
        const f = FINDS[fid];
        const place = f.planet && f.planet !== s().planet ? `on ${PLANETS[f.planet as "vell"]?.name ?? f.planet}` : `in ${slotName(f.biome)}`;
        return `Found ${place}${f.rows ? `, ${(f.rows[0] * 10).toLocaleString("en-US")} m and deeper` : ""}.`;
      };
      const entry = (fid: number) => ({ id: `f${fid}`, name: FINDS[fid].name, text: FINDS[fid].text, found: !!lf[fid], find: fid, count: lf[fid]?.n, depth: lf[fid]?.row, biome: FINDS[fid].biome, hint: where(fid) });
      return [
        page("ores", "Ores", ORE_IDS.map(entry), "A biome's full set: its ore sells 10% higher"),
        page("finds", "Finds", [...JACKPOT_IDS.map(entry), ...CACHES.map((c) => ({ id: `c${c.key}`, name: c.name, text: `A cache of the ${BIOMES[c.biome].name}.`, found: !!S.log.caches[c.key], count: S.log.caches[c.key], icon: `cache:${c.key}`, biome: BIOMES[c.biome].slot, hint: `Found in ${slotName(BIOMES[c.biome].slot)}.` }))], "Each kind found: data"),
        page("relics", "Relics", ARTIFACT_IDS.map((id) => ({ ...entry(id), found: !!lf[id] || S.log.read.includes(id) })), "A thread complete: a lasting gift"),
        page("places", "Places", S.log.places.map((p, i) => ({ id: `p${i}`, name: p, text: "Found and named.", found: true, icon: "depth" })), "All of them: the map shows named places"),
        page("life", "Life", S.log.life.map((l) => ({ id: `l${l}`, name: l[0].toUpperCase() + l.slice(1).replace(/_/g, " "), text: "Seen in the lamp.", found: true, icon: "perk" })), "All of them: 10% more data"),
        page("planets", "Planets", (Object.keys(PLANET_ECON) as PlanetId[]).map((id) => ({ id: `w${id}`, name: PLANETS[id as "vell"].name, text: S.log.planets.includes(id) ? "Launched from." : id === S.planet ? "Here now." : "Not yet.", found: S.log.planets.includes(id) || id === S.planet, icon: "planet" })), "Each first visit: shards"),
      ];
    },
    get achievements() {
      return ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name, text: a.text, done: s().achievements.includes(a.id), reward: `+${a.data} data${a.shards ? `, ${a.shards} shards` : ""}` }));
    },
    get orders() {
      const c = pod().cargo;
      // Short phrasing that keeps the ore in view (QA Q15): the condition first, the bonus apart.
      return s().orders.map((o) => {
        const k = any(o).kind as string, name = FINDS[o.find]?.name ?? "";
        const text = k === "count" ? `${o.n} ${name} in one haul` : k === "purity" || k === "without" ? `No ${name}, half a bay or more` : k === "depth" ? `${o.n} pieces of tier ${any(o).tier ?? ""}+ in one haul` : o.text.replace(/:.*$/, "");
        const used = Object.values(c).reduce((a: number, n) => a + (n as number), 0);
        return {
          find: o.find, text, bonus: k === "count" ? `x${o.mult}` : `+${Math.round((o.mult - 1) * 100)}%`,
          have: k === "count" ? c[o.find] ?? 0 : k === "depth" ? used : c[o.find] ? 0 : 1, need: k === "count" || k === "depth" ? o.n : 1, done: !!o.done,
        };
      });
    },
    get market() { return meta.board(g); },
    get prices() { return ORE_IDS.filter((id) => oreOnPlanet(id, s().planet) && FINDS[id].biome <= s().reached).map((id) => ({ find: id, price: g.pieceValue(id) })); },
    get service() { return s().service; },
    get cargo() {
      const p = pod(), rows: UiModel["cargo"] = [];
      for (const k of Object.keys(p.cargo).map(Number)) if (p.cargo[k] > 0) rows.push({ find: k, name: FINDS[k].name, count: p.cargo[k], value: g.pieceValue(k), mass: FINDS[k].mass });
      for (const k of Object.keys(p.ingots).map(Number)) if (p.ingots[k] > 0) rows.push({ find: k, name: FINDS[k].name, count: p.ingots[k], value: g.pieceValue(k) * INGOT_MULT, mass: FINDS[k].mass * 5, ingot: true });
      return rows.sort((a, b) => b.value - a.value);
    },
    get settings() { return hooks.settings; },
    get crate() { const e = g.entities.find((x) => x.kind === "crate"); return e ? { x: e.x, y: e.y } : null; },
    get seed() {
      const p = pod();
      const d = Math.hypot(p.x - CHAMBER.cx, p.y - CHAMBER.cy);
      if (p.y < CHAMBER.cy - CHAMBER.ry - 2 || d > CHAMBER.rx + 2) return null;
      const r = any(g).canLaunch ? any(g).canLaunch() : { ok: false, why: "" };
      return { ok: !!r.ok, why: r.ok ? undefined : r.why, near: d <= CHAMBER.seedR + 2.5 };
    },
    get towFee() { return s().freeTow ? 0 : Math.round(fuelPrice(g.bDeep()) * pod().fuelMax); },
    get inTown() { return g.inTown(); },
    get tutorial() {
      const S = s();
      return {
        dug: S.deepest > 1 || S.dives > 0,
        sold: S.hauls.length > 0 || S.records.richestHaul > 0 || S.launches > 0,
        bought: STATS.some((st) => S.levels[st] > 0) || S.lift > 0 || S.research.length > 0 || S.launches > 0,
        entered: Object.keys(S.heard ?? {}).length > 0,
      };
    },
    hintDone: (id) => learned.has(id),
    markHint(id) { if (learned.has(id)) return; learned.add(id); hooks.hints?.save([...learned]); },
    line(b) { return g.talk(BUILDINGS[b])?.text ?? null; },

    buyUpgrade: (st) => g.buyUpgrade(st),
    buySuggested: () => g.buySuggested(),
    buyLift: () => g.buyLift(),
    buyModule: (id) => (any(g).buyModule ? any(g).buyModule(gameMod(id)) : { ok: false, why: "Not on sale yet." }),
    equip(slot, id) {
      const cur = s().modules[slot];
      if (!id) return cur ? g.unequipModule(cur as ModuleId) : { ok: true };
      const gid = gameMod(id);
      if (cur && cur !== gid) { const r = g.unequipModule(cur as ModuleId); if (!r.ok) return r; }
      return g.equipModule(gid);
    },
    buyItem: (key) => g.buyItem(key as ItemId),
    research: (id) => g.buyResearch(id),
    buyLab: () => g.buyLab(),
    buildRig: (b) => g.buildRig(b),
    buyLance: (id) => g.buyLancePart(id),
    buyPerk: (id) => g.buyPerk(id),
    choosePlanet: (id) => g.choosePlanet(id as PlanetId),
    dump(find, all): Result {
      const fn = (g as unknown as { dump?: (f: number, all: boolean) => Result }).dump;
      return fn ? fn.call(g, find, all) : { ok: false, why: "Press X to dump the cheapest piece." };
    },
    setService: (k, on) => { g.setService(k, on); },
    setSettings: (x) => hooks.setSettings(x),
    resetSave: () => hooks.resetSave(),
    collectOffline: () => { g.collectOffline(); },
    takeOffline() {
      const c = s().offline;
      if (!c || c.away < 300) return null;
      return { away: c.away, cap: c.cap, pieces: 0, cash: c.cash, data: c.data, fullFor: c.full ? Math.max(0, c.away - c.cap) : 0, hint: c.full && !g.has("A5") ? (g.has("A1") ? "Deep Silo at the lab holds 8 h." : "Silo at the lab holds 4 h.") : undefined };
    },
  };
  return m;
}
