// The run layer (run-meta.md, content.md 7-13, DESIGN.md Revision 1).
// Pure and seeded: every action takes a RunState and returns a new one. The UI renders
// `choices(run)` for the current screen and calls `choose(run, key)` (or the named wrappers).
import { Rng, hash } from "../rng.ts";
import type {
  ActMap, BattleArgs, BattleKind, BattleResult, BossId, Card, CommanderId, NodeKind, RunScreen, RunState, TallyLine, TowerId,
} from "../types.ts";
import { COMMANDERS } from "../content/run/commanders.ts";
import { BLESSINGS, BLESSING_CROWNS, BLESSING_LIVES, FIRST_RUN_BLESSINGS, RARE_BLESSING } from "../content/run/blessings.ts";
import { TOWERS } from "../content/run/towers.ts";
import { RELIC } from "../content/run/relics.ts";
import { CURSE, DEBT_CROWNS } from "../content/run/curses.ts";
import { BOON, TROPHY_CROWNS } from "../content/run/boons.ts";
import { SUPPLY } from "../content/run/supplies.ts";
import { BATTLE_THEMES, BOSS_INFO, BOSSES_BY_ACT, BOUNTIES, ELITE_NAMES } from "../content/run/map.ts";
import { EVENT } from "../content/run/events.ts";
import { PERKS } from "../content/run/unlocks.ts";
import { MAX_ASCENSION } from "../content/run/ascensions.ts";
import {
  BATTLE_CROWNS, BOSS_CROWNS, BOSS_HEAL, BOUNTY_EXTRA, CLEAN_CROWNS, COIN_PURSE_CROWNS, FORGE, LEDGER, LEFTOVER_MAX,
  LEFTOVER_RATE, MAX_TOWERS, RELIC_RARITY, REST, SHOP, SKIP_CROWNS, START, SUPPLY_LINES_CROWNS, TREASURE_CROWNS, WIDE_COST_PCT,
} from "../content/run/economy.ts";
import type { Profile } from "../meta.ts";
import { generateAct, rollBoss, themeRoles } from "./map.ts";
import { buildCards, cardCount, rollRelics, randomBoon, boonOffers, blueprintFits, type Source } from "./rewards.ts";
import { basePrice, openShop, restock } from "./shop.ts";
import { eventChoices, resolveEvent, startEvent } from "./events.ts";
import { pickEvent, rollUnknown } from "./unknown.ts";
import { PICKS, cardName, cardText, pickCard, pickHone, pickLift, pickTemper, pickTower, relicDig } from "./picks.ts";
import {
  boonsOf, cardKey, clone, crowns, cursed, end, gainCard, gainRelic, gainSupply, gainTower, has, heal, loseBoon, loseRelic,
  maxLives, owns, perk, randomSupply, removeTower, replaceTower, revealNext, revealUnknown, rng, settle, untempered, type Run,
} from "./state.ts";

export { generateAct, mapProblems, eliteSpan, eliteFree } from "./map.ts";
export { summary, type RunSummary } from "./summary.ts";
export type { Run } from "./state.ts";

// ---------------------------------------------------------------- new run
export interface NewRun { seed: number; commander: CommanderId; ascension: number; profile: Profile; firstRun?: boolean; seeded?: boolean }

export function newRun(o: NewRun): RunState {
  const p = o.profile, cmd = COMMANDERS[o.commander];
  const asc = Math.max(0, Math.min(MAX_ASCENSION, o.ascension, p.ascension[o.commander] ?? 0));
  const towers = uniq([...p.unlocked.towers, ...cmd.towers, ...cmd.brings]);
  const perks = PERKS.filter((k) => p.perks[k.id] === true).map((k) => k.id);
  const seed = o.seed >>> 0;

  // All four acts are made now (bosses roll at each act's start, R21), so reveals just show them.
  const bossRng = new Rng(hash(seed, 77));
  const bosses = ([1, 2, 3, 4] as const).map((a) => rollBoss(bossRng, a));
  const unmet = ([1, 2, 3] as const).flatMap((a) => BOSSES_BY_ACT[a].filter((b) => b !== bosses[a - 1]));
  const champion = bossRng.pick(unmet);
  const maps: ActMap[] = ([1, 2, 3, 4] as const).map((a) =>
    generateAct(hash(seed, 100 + a), a, { ascension: asc, boss: bosses[a - 1]!, champion }));
  if (o.commander === "seer") for (const m of maps) foresee(m);

  const r: Run = {
    seed, commander: o.commander, ascension: asc, act: 1, map: maps[0]!, at: -1, floor: 0,
    loadout: {
      commander: o.commander, towers: [...cmd.towers], boons: [], tempered: [], relics: [], curses: [],
      lives: START.lives, maxLives: START.lives, ascension: asc, supplies: [null, null], perks,
    },
    crowns: START.crowns + (perks.includes("nest-egg") ? START.nestEgg : 0),
    screen: { s: "map" }, history: [],
    stats: { battles: 0, elites: 0, bosses: 0, kills: 0, leaked: 0, damageBy: {}, biggestHit: 0, timeTicks: 0, crownsEarned: 0 },
    pity: 0, seenEvents: [], battleIndex: 0,
    book: {
      firstRun: !!o.firstRun, seeded: !!o.seeded,
      unlocked: { towers, relics: [...p.unlocked.relics], events: [...p.unlocked.events] },
      codexEvents: Object.keys(p.codex.events), codexBosses: Object.keys(p.codex.bosses).filter((b) => p.codex.bosses[b as BossId]!.met > 0) as BossId[],
      codexWins: Object.keys(p.codex.commanders).filter((c) => p.codex.commanders[c as CommanderId]!.wins > 0) as CommanderId[],
      perks, streams: {}, maps, after: [], pending: [], lifts: 0,
      unknown: { battle: 0, shop: 0, treasure: 0 }, revealedNext: false, bossHp: 0, walk: false,
      rerolls: perks.includes("second-look") ? 1 : 0, banishes: perks.includes("strike-off") ? 1 : 0, banished: [], leap: [],
      lastDamage: {}, seen: { boons: [], relics: [], towers: [...cmd.towers] }, choices: [],
      floors: 0, bounties: 0, elitesWon: 0, bossesMet: [], bossesWon: [], lostAct1: 0,
      best: { kills: 0, killsAt: "", crowns: 0, closest: 99, perfectBosses: [] },
      blessingRare: !!p.blessingRare?.[o.commander], rewards: 0, nextGold: 0, promised: null,
    },
  };
  gainRelic(r, cmd.relic);
  for (const w of ["thick-walls", "thicker-walls"]) if (perks.includes(w)) maxLives(r, START.wall, true);
  if (asc >= 4) r.loadout.lives -= START.a4Missing;
  if (asc >= 8) r.loadout.curses.push("doubt");
  if (has(r, "pilgrims-map")) revealUnknown(r);
  r.screen = blessingScreen(r);
  return r;
}

const uniq = <T>(xs: T[]) => [...new Set(xs)];

function foresee(m: ActMap) {
  for (const n of m.nodes) if (n.info?.archetypes) n.info.roles = themeRoles(m.act, m.act === 4 ? 6 : n.floor, n.info.archetypes);
}

// ---------------------------------------------------------------- blessing (R23, R27)
function blessingScreen(r: Run): RunScreen {
  const g = rng(r, "blessing");
  const opts: string[] = r.book.firstRun ? [...FIRST_RUN_BLESSINGS] : [];
  for (const b of r.book.firstRun ? [] : g.shuffle([...BLESSINGS])) {
    if (opts.length >= 3) break;
    if (b.id === "relic") {
      const [id] = rollRelics(r, g, 1, { common: 1 });
      if (id) opts.push(`relic:${id}`);
    } else if (b.id === "blueprint") {
      const c = r.book.unlocked.towers.filter((t) => blueprintFits(r, t));
      if (c.length) opts.push(`blueprint:${g.pick(c)}`);
    } else if (b.id === "supplies") {
      const a = randomSupply(g);
      opts.push(`supplies:${a},${randomSupply(g, [a])}`);
    } else opts.push(b.id);
  }
  if (r.book.blessingRare) opts.push(RARE_BLESSING.id);
  return { s: "blessing", options: opts };
}

function blessingChoice(_r: Run, opt: string): Choice {
  const [id, arg] = opt.split(":") as [string, string | undefined];
  const def = id === RARE_BLESSING.id ? RARE_BLESSING : BLESSINGS.find((b) => b.id === id)!;
  let text = def.text;
  if (id === "relic") text = `${RELIC[arg!]!.name}: ${RELIC[arg!]!.text}`;
  if (id === "blueprint") text = `${TOWERS[arg as TowerId].name}: ${TOWERS[arg as TowerId].line}`;
  if (id === "supplies") text = arg!.split(",").map((s) => SUPPLY[s as keyof typeof SUPPLY].name).join(" and ");
  return { key: "", label: def.name, text };
}

function applyBlessing(r: Run, opt: string) {
  const [id, arg] = opt.split(":") as [string, string | undefined];
  if (id === "relic") gainRelic(r, arg!);
  if (id === "blueprint") gainTower(r, arg as TowerId);
  if (id === "swap") pickTower(r, "swap", "Give up a starting tower", {}, () => (r.loadout.towers.length > 1 ? null : "Your only tower"));
  if (id === "lives") maxLives(r, BLESSING_LIVES, true);
  if (id === "crowns") crowns(r, BLESSING_CROWNS);
  if (id === "supplies") for (const s of arg!.split(",")) gainSupply(r, s as keyof typeof SUPPLY);
  if (id === RARE_BLESSING.id) {
    const rs = rollRelics(r, rng(r, "blessing"), 3, { rare: 1 });
    pickCard(r, "A victor's gift: choose a rare relic", rs.map((x): Card => ({ kind: "relic", relic: x, rarity: "rare" })));
  }
}

// ---------------------------------------------------------------- choices
export interface Choice {
  key: string;
  label: string;
  text?: string;
  /** Why it can't be taken (greyed). */
  disabled?: string;
  price?: number;
  card?: Card;
  node?: number;
}

export function choices(run: RunState): Choice[] {
  const r = run as Run, s = r.screen;
  switch (s.s) {
    case "blessing": return s.options.map((o, i) => ({ ...blessingChoice(r, o), key: `bless:${i}` }));
    case "map": return mapChoices(r);
    case "battle": return [];
    case "reward": return rewardChoices(r, s);
    case "replace": return [
      ...r.loadout.towers.map((t) => ({ key: `replace:${t}`, label: `Replace ${TOWERS[t].name}`, text: replaceText(r, t) })),
      { key: "keep", label: "Keep my towers" },
    ];
    case "shop": return shopChoices(r, s);
    case "event": {
      if (s.done) return [{ key: "continue", label: "Continue", ...(s.note ? { text: s.note } : {}) }];
      return eventChoices(r, s).map(({ choice, disabled }) => ({ key: `choice:${choice.id}`, label: choice.label, text: choice.text, ...(disabled ? { disabled } : {}) }));
    }
    case "forge": return forgeChoices(r);
    case "rest": return restChoices(r, s);
    case "treasure": return [{ key: "open", label: "Open the chest", text: `${RELIC[s.relic]!.name}, ${s.crowns} crowns${s.supply ? `, ${SUPPLY[s.supply].name}` : ""}` }];
    case "pick": return [
      ...s.options.map((o, i) => ({ key: `pick:${i}`, label: o.label, ...(o.text ? { text: o.text } : {}), ...(o.card ? { card: o.card } : {}), ...(o.disabled ? { disabled: o.disabled } : {}) })),
      ...(s.skip ? [{ key: "skip", label: s.skip }] : []),
    ];
    case "over": return [];
  }
}

function replaceText(r: Run, t: TowerId): string {
  const n = boonsOf(r, t).length;
  return n ? `Its ${n} ${n === 1 ? "boon is" : "boons are"} lost: +${n * 10} crowns.` : "It has no boons.";
}

/** The nodes you may move to now. */
export function reachable(run: RunState): number[] {
  const r = run as Run;
  if (r.book.leap.length) return r.book.leap;
  if (r.at < 0) return r.map.nodes.filter((n) => n.floor === 1).map((n) => n.id);
  return r.map.nodes[r.at]!.next;
}

function mapChoices(r: Run): Choice[] {
  return reachable(r).map((id) => {
    const n = r.map.nodes[id]!;
    return { key: `node:${id}`, label: nodeLabel(n.kind, n.info), text: nodeLine(r, n), node: id };
  });
}

const KIND_LABEL: Record<NodeKind, string> = {
  battle: "Battle", elite: "Elite", boss: "Boss", event: "?", shop: "Shop", forge: "Forge", rest: "Camp", treasure: "Treasure", bounty: "Bounty", camp: "Camp",
};

export function nodeLabel(kind: NodeKind, info?: { name?: string; boss?: BossId; champion?: boolean }): string {
  if (info?.name) return info.name;
  if (kind === "boss" && info?.boss) return info.champion ? `Champion of the Citadel: ${BOSS_INFO[info.boss].name}` : BOSS_INFO[info.boss].name;
  return KIND_LABEL[kind];
}

/** One-line tooltip for a node (run-meta.md 2). */
export function nodeLine(_run: RunState, n: ActMap["nodes"][number]): string {
  const i = n.info ?? {};
  const roles = i.roles?.length ? ` Who's coming: ${i.roles.join(", ")}.` : "";
  switch (n.kind) {
    case "battle": return `Battle: crowns and a reward.${i.theme ? ` ${i.theme}` : ""}${i.elite ? ` An elite ${ELITE_NAMES[i.elite]} waits on the last wave.` : ""}${roles}`;
    case "bounty": return `Bounty: ${BOUNTIES.find((b) => b.id === i.bounty)?.line ?? ""} Meet it for a second reward.${i.theme ? ` ${i.theme}` : ""}${roles}`;
    case "elite": return `Elite: ${ELITE_NAMES[i.elite!] ?? "an elite"}${i.affixes?.length ? ` (${i.affixes.join(", ")})` : ""}. A relic and a better card.${i.theme ? ` ${i.theme}` : ""}${roles}`;
    case "boss": return `${nodeLabel(n.kind, i)}: ${BOSS_INFO[i.boss!]?.line ?? ""}`;
    case "event": return i.revealed ? `?: holds ${KIND_LABEL[i.revealed] === "?" ? "an event" : `a ${KIND_LABEL[i.revealed].toLowerCase()}`}.` : "?: something on the road.";
    case "shop": return "Shop: spend crowns on towers, boons, relics and supplies.";
    case "forge": return "Forge: shape one tower's boons.";
    case "rest": return "Camp: heal, or train.";
    case "camp": return "The Last Camp: a shop, then one camp choice.";
    case "treasure": return "Treasure: a relic and a few crowns, free.";
  }
}

// ---------------------------------------------------------------- choose
export function choose(run: RunState, key: string): RunState {
  const r = clone(run);
  const [k, arg] = key.split(/:(.*)/s) as [string, string | undefined];
  const s = r.screen;
  if (r.over) return r;
  const legal = choices(run).find((c) => c.key === key);
  if (!legal) throw new Error(`"${key}" is not a choice on the ${s.s} screen`);
  if (legal.disabled) throw new Error(`"${key}": ${legal.disabled}`);

  switch (s.s) {
    case "blessing": applyBlessing(r, s.options[Number(arg)]!); settle(r, null); break;
    case "map": enter(r, Number(arg)); break;
    case "reward": onReward(r, s, k, arg); break;
    case "replace": onReplace(r, s, k, arg); break;
    case "shop": onShop(r, s, k, Number(arg)); break;
    case "event": {
      if (k === "continue") { settle(r, null); break; }
      const next = resolveEvent(r, s, arg!);
      if (next && !next.done) settle(r, next);
      else { if (next) r.book.pending.unshift(next); settle(r, null); }
      break;
    }
    case "forge": onForge(r, k); break;
    case "rest": onRest(r, k); break;
    case "treasure": gainRelic(r, s.relic); crowns(r, s.crowns); if (s.supply) gainSupply(r, s.supply); settle(r, null); break;
    case "pick": {
      if (k !== "skip") { const o = s.options[Number(arg)]!; PICKS[s.act]!(r, o, s); }
      settle(r, null);
      break;
    }
    default: throw new Error(`nothing to choose on ${s.s}`);
  }
  afterSettle(r);
  return r;
}

/** When the queue runs dry after a boss, the next act begins. */
function afterSettle(r: Run) {
  if (r.over || r.screen.s !== "map") return;
  const here = r.map.nodes[r.at];
  if (here?.kind === "boss" && here.visited && !here.info?.champion && !r.book.leap.length) nextAct(r);
}

function nextAct(r: Run) {
  r.book.maps[r.act - 1] = r.map;
  r.act = (r.act + 1) as RunState["act"];
  r.map = r.book.maps[r.act - 1]!;
  r.at = -1; r.floor = 0;
  r.book.revealedNext = false;
  r.book.rerolls = perk(r, "second-look") ? 1 : 0;
  r.book.banishes = perk(r, "strike-off") ? 1 : 0;
  if (has(r, "pilgrims-map")) revealUnknown(r);
}

// wrappers the UI and tests can call by name
export const chooseBlessing = (run: RunState, i: number) => choose(run, `bless:${i}`);
export const moveTo = (run: RunState, nodeId: number) => choose(run, `node:${nodeId}`);
export const pickCard_ = (run: RunState, i: number) => choose(run, run.screen.s === "reward" && !run.screen.cards.length ? `relic:${i}` : run.screen.s === "pick" ? `pick:${i}` : `card:${i}`);
export { pickCard_ as pickCard };
export const skip = (run: RunState) => choose(run, "skip");
export const reroll = (run: RunState) => choose(run, "reroll");
export const banish = (run: RunState, i: number) => choose(run, `banish:${i}`);
export const buy = (run: RunState, i: number) => choose(run, `buy:${i}`);
export const leave = (run: RunState) => choose(run, "leave");

// ---------------------------------------------------------------- entering a node
function enter(r: Run, id: number) {
  const n = r.map.nodes[id]!;
  r.at = id; r.floor = n.floor; n.visited = true; r.book.leap = [];
  r.history.push({ act: r.act, node: id, kind: n.kind, leaked: 0 });
  const fight = (kind: BattleKind) => {
    if (kind === "boss" && n.info?.boss && !r.book.bossesMet.includes(n.info.boss)) r.book.bossesMet.push(n.info.boss);
    settle(r, { s: "battle", node: id, kind });
  };
  if (n.kind !== "battle" && n.kind !== "elite" && n.kind !== "bounty" && n.kind !== "boss") r.book.floors++;
  switch (n.kind) {
    case "battle": case "elite": case "bounty": case "boss": return fight(n.kind);
    case "event": {
      const k = n.info?.revealed ?? rollUnknown(r);
      (n.info ??= {}).revealed = k;
      if (k === "battle") {
        r.book.floors--;
        const t = rng(r, "map").pick(BATTLE_THEMES[r.act]);
        Object.assign(n.info, { theme: t.line, archetypes: [...t.archetypes] });
        if (r.commander === "seer" && n.info.archetypes) n.info.roles = themeRoles(r.act, n.floor, n.info.archetypes);
        return fight("ambush");
      }
      if (k === "shop") return settle(r, openShop(r));
      if (k === "treasure") return settle(r, treasure(r));
      const ev = pickEvent(r);
      return settle(r, ev ? startEvent(r, ev) : treasure(r));
    }
    case "shop": return settle(r, openShop(r));
    case "forge": return settle(r, { s: "forge" });
    case "rest": return settle(r, restScreen(r));
    case "treasure": return settle(r, treasure(r));
    case "camp": r.book.pending.push(openShop(r, { camp: true })); return settle(r, restScreen(r));
  }
}

function treasure(r: Run): RunScreen {
  const g = rng(r, "treasure");
  const [relic] = rollRelics(r, g, 1, RELIC_RARITY.treasure, (id) => ["common", "uncommon", "rare"].includes(RELIC[id]!.rarity));
  return { s: "treasure", relic: relic ?? "war-chest", crowns: g.int(TREASURE_CROWNS[0], TREASURE_CROWNS[1]), supply: randomSupply(g) };
}

// ---------------------------------------------------------------- battle hand-off
/** Everything battle's newBattle() needs for the current node. */
export function battleFor(run: RunState): BattleArgs {
  const r = run as Run, s = r.screen;
  if (s.s !== "battle") throw new Error("not on a battle");
  const n = r.map.nodes[s.node]!, i = n.info ?? {};
  const loadout = structuredClone(r.loadout);
  if (r.book.firstRun && r.battleIndex === 0) loadout.firstBattle = true;
  const args: BattleArgs = { seed: hash(r.seed, 1000 + r.battleIndex), act: r.act, kind: s.kind, floor: n.floor, loadout };
  if (s.kind === "boss" && i.boss) { args.boss = i.boss; if (r.book.bossHp && !i.champion) args.bossHpPct = r.book.bossHp; if (i.champion) args.champion = true; }
  if (i.theme) { args.theme = i.theme; args.archetypes = [...(i.archetypes ?? [])]; }
  if (s.kind === "bounty" && i.bounty) args.bounty = i.bounty;
  if (i.elite) args.elite = { kind: i.elite, affixes: [...(i.affixes ?? [])] };
  if (r.book.walk && s.kind !== "boss") args.fewerWaves = 2;
  if (r.book.nextGold) args.gold = r.book.nextGold;
  return args;
}

/** Apply a battle's outcome: lives, stats, crowns tally, then the reward screens (or the end). */
export function finishBattle(run: RunState, res: BattleResult): RunState {
  const r = clone(run), s = r.screen;
  if (s.s !== "battle") throw new Error("not on a battle");
  const n = r.map.nodes[s.node]!, kind = s.kind;
  const lost = Math.max(0, r.loadout.lives - res.livesLeft);
  r.loadout.lives = Math.max(0, res.livesLeft);
  if (res.supplies) r.loadout.supplies = [...res.supplies];
  if (res.ghost) r.loadout.ghost = res.ghost;
  if (res.phoenixUsed) loseRelic(r, "phoenix-feather");
  r.battleIndex++;
  const st = r.stats;
  st.battles++; st.kills += res.stats.kills; st.leaked += res.leaked; st.timeTicks += res.ticks ?? 0;
  st.biggestHit = Math.max(st.biggestHit, res.stats.biggestHit);
  for (const [t, d] of Object.entries(res.stats.damageBy)) st.damageBy[t as TowerId] = (st.damageBy[t as TowerId] ?? 0) + (d ?? 0);
  r.book.lastDamage = { ...res.stats.damageBy };
  const h = r.history[r.history.length - 1]!;
  h.leaked = res.leaked; h.lost = lost; h.won = res.won;
  if (r.act === 1) r.book.lostAct1 += lost;
  if (res.stats.kills > r.book.best.kills) { r.book.best.kills = res.stats.kills; r.book.best.killsAt = `act ${r.act}, floor ${n.floor}`; }
  const wasWalk = r.book.walk;
  if (kind !== "boss") r.book.walk = false;
  r.book.nextGold = 0;

  if (!res.won || r.loadout.lives <= 0) {
    const boss = kind === "boss" ? n.info?.boss : undefined;
    const by = boss ? BOSS_INFO[boss].name : kind === "elite" ? `an elite ${ELITE_NAMES[n.info?.elite ?? "juggernaut"] ?? ""}`.trim() : kind === "ambush" ? "an ambush" : "a battle";
    end(r, false, by, { ...(boss ? { boss } : {}), ...(res.bossHpLeft !== undefined ? { bossHpLeft: res.bossHpLeft } : {}), ...(res.livesShort !== undefined ? { livesShort: res.livesShort } : {}) });
    return r;
  }

  r.book.floors++;
  r.book.best.closest = Math.min(r.book.best.closest, r.loadout.lives);
  if (kind === "elite") { st.elites++; r.book.elitesWon++; }
  if (kind === "boss") {
    st.bosses++;
    if (n.info?.boss) { r.book.bossesWon.push(n.info.boss); if (lost === 0) r.book.best.perfectBosses.push(n.info.boss); }
    if (!n.info?.champion) r.book.bossHp = 0;
    if (r.act === 4 && !n.info?.champion) { end(r, true); return r; }
  }

  // crowns, paid first as a tally
  const tally: TallyLine[] = [];
  const pay = (label: string, c: number) => { if (c) { crowns(r, c); tally.push({ label, crowns: c }); } };
  if (kind === "boss") pay("Boss", BOSS_CROWNS[r.act]);
  else pay(kind === "elite" ? "Elite" : "Battle", BATTLE_CROWNS[r.act] * (kind === "elite" ? 2 : 1));
  if (lost === 0 && kind !== "boss") pay("No lives lost", CLEAN_CROWNS);
  const ledger = has(r, "ledger");
  const rate = ledger ? LEDGER.rate : LEFTOVER_RATE[r.act], cap = ledger ? LEDGER.max : LEFTOVER_MAX;
  pay("Leftover gold", Math.min(cap, Math.floor(Math.max(0, res.goldLeft) / rate)));
  pay("Treasury", res.treasury ?? 0);
  if (r.commander === "quartermaster") pay("Supply Lines", SUPPLY_LINES_CROWNS);
  if (lost === 0 && has(r, "coin-purse")) pay("Coin Purse", COIN_PURSE_CROWNS);
  const top = topTower(res.stats.damageBy);
  if (top && r.loadout.boons.includes("trophy") && r.loadout.boonOn?.trophy === top) pay("Trophy", TROPHY_CROWNS[r.loadout.tempered.includes("trophy") ? 1 : 0]);
  if (cursed(r, "debt")) { const d = Math.min(r.crowns, DEBT_CROWNS); if (d) { crowns(r, -d); tally.push({ label: "Debt", crowns: -d }); } }
  if (has(r, "old-standard") && lost <= 1) { const hl = heal(r, 1); if (hl) tally.push({ label: "Old Standard", lives: hl }); }
  if (kind === "boss") {
    const missing = r.loadout.maxLives - r.loadout.lives;
    const hl = heal(r, Math.ceil(missing * (r.ascension >= 5 ? BOSS_HEAL.a5Frac : BOSS_HEAL.frac)));
    if (hl) tally.push({ label: "The boss falls", lives: hl });
  }
  const paid = tally.reduce((a, t) => a + (t.crowns ?? 0), 0);
  const skipC = SKIP_CROWNS[r.act];

  // reward screens
  const rewards: RunScreen[] = [];
  const relicScreen = (relics: string[], source: "elite" | "boss" | "bonus"): RunScreen => ({ s: "reward", cards: [], relics, crowns: 0, skip: 0, source });
  if (kind === "boss" && !n.info?.champion) {
    revealNext(r);
    const table = r.act <= 2 ? { boss: 1 } : { rare: 1 };
    const rs = rollRelics(r, rng(r, "reward"), 3, table, (id) => RELIC[id]!.rarity === (r.act <= 2 ? "boss" : "rare"));
    if (rs.length) rewards.push(relicScreen(rs, "boss"));
  }
  if (kind === "elite") gainSupply(r, randomSupply(rng(r, "reward")));
  if (kind === "elite" && res.elitesKilled) {
    const rs = rollRelics(r, rng(r, "reward"), 2, RELIC_RARITY.elite, (id) => ["common", "uncommon", "rare"].includes(RELIC[id]!.rarity));
    if (rs.length) rewards.push(relicScreen(rs, "elite"));
  }
  const source: Source = kind === "boss" ? "boss" : kind === "elite" ? "elite" : kind === "ambush" ? "ambush" : "battle";
  if (!wasWalk || kind === "boss") rewards.push({ s: "reward", cards: buildCards(r, source), crowns: 0, skip: skipC, source: kind === "bounty" ? "bounty" : source });
  else rewards.push({ s: "reward", cards: [], crowns: 0, skip: 0, source });
  if (kind === "bounty" && res.bountyOk) {
    r.book.bounties++;
    if (rng(r, "reward").chance(BOUNTY_EXTRA.relicChance)) {
      const rs = rollRelics(r, rng(r, "reward"), BOUNTY_EXTRA.relics, { common: 1 }, (id) => RELIC[id]!.rarity === "common");
      if (rs.length) rewards.push(relicScreen(rs, "bonus"));
    } else rewards.push({ s: "reward", cards: buildCards(r, "battle"), crowns: 0, skip: skipC, extra: true, source: "bonus" });
  }
  // the crowns tally shows on the first screen, whichever it is
  const head = rewards[0] as Reward;
  head.tally = tally; head.crowns = paid;
  r.book.pending.push(...rewards.filter((x) => !(x.s === "reward" && !x.cards.length && !x.relics?.length && !x.tally?.length)));
  settle(r, null);
  afterSettle(r);
  return r;
}

function topTower(d: Partial<Record<TowerId, number>>): TowerId | null {
  let best: TowerId | null = null, v = 0;
  for (const [t, x] of Object.entries(d)) if ((x ?? 0) > v) { v = x ?? 0; best = t as TowerId; }
  return best;
}

// ---------------------------------------------------------------- reward screen
type Reward = Extract<RunScreen, { s: "reward" }>;

function rewardChoices(r: Run, s: Reward): Choice[] {
  const out: Choice[] = [];
  s.cards.forEach((c, i) => out.push({ key: `card:${i}`, label: cardName(c), text: cardText(c) + blueprintNote(r, c), card: c }));
  (s.relics ?? []).forEach((id, i) => {
    const c: Card = { kind: "relic", relic: id, rarity: RELIC[id]!.rarity };
    out.push({ key: `relic:${i}`, label: cardName(c), text: cardText(c), card: c });
  });
  if (s.cards.length) {
    const smug = has(r, "smugglers-crate");
    out.push({ key: "skip", label: smug ? "Skip: a boon instead" : `Skip: +${s.skip} crowns` });
    if (r.book.rerolls > 0) out.push({ key: "reroll", label: "Reroll", text: "Replace every card (once this act)." });
    if (r.book.banishes > 0) s.cards.forEach((c, i) => out.push({ key: `banish:${i}`, label: `Strike off ${cardName(c)}`, text: "Never offered again this run." }));
  } else out.push({ key: "skip", label: s.relics?.length ? "Take none" : "Continue" });
  return out;
}

/** R18: a 5th or 6th tower raises every L1 cost; a 7th asks for a replacement. */
function blueprintNote(r: Run, c: Card): string {
  if (c.kind !== "blueprint") return "";
  const n = r.loadout.towers.length;
  if (n >= MAX_TOWERS) return " Your war table is full: it replaces one.";
  if (n >= 4) return ` Your tower number ${n + 1}: every L1 costs ${WIDE_COST_PCT}% more.`;
  return "";
}

function onReward(r: Run, s: Reward, k: string, arg?: string) {
  if (k === "card") {
    const c = s.cards[Number(arg)]!;
    // R13: Glass Bones without a Frost Spire promises the Frost Spire in the next reward's slot B
    if (c.kind === "boon" && c.tower && !owns(r, c.tower) && BOON[c.boon]?.tower) r.book.promised = c.tower;
    gainCard(r, c, "reward");
    // a full war table: the replace screen comes first and this reward stays behind it
    if (r.book.pending.some((p) => p.s === "replace")) return settle(r, s);
    return settle(r, null);
  }
  if (k === "relic") { gainRelic(r, s.relics![Number(arg)]!); return settle(r, null); }
  if (k === "skip") {
    if (s.cards.length) {
      if (has(r, "smugglers-crate")) {
        const t = [...r.loadout.towers].sort((a, b) => boonsOf(r, b).length - boonsOf(r, a).length)[0]!;
        const c = randomBoon(r, rng(r, "reward"), [t], { common: 62, uncommon: 33, rare: 5 });
        if (c) gainCard(r, c); else crowns(r, s.skip);
      } else crowns(r, s.skip);
    }
    return settle(r, null);
  }
  if (k === "reroll") {
    r.book.rerolls--;
    const src = s.source === "bounty" || s.source === "bonus" ? "battle" : (s.source ?? "battle") as Source;
    r.book.rewards++; // never the first-reward rules again
    return settle(r, { ...s, cards: buildCards(r, src) });
  }
  if (k === "banish") {
    r.book.banishes--;
    const i = Number(arg);
    r.book.banished.push(cardKey(s.cards[i]!));
    return settle(r, { ...s, cards: s.cards.filter((_, j) => j !== i) });
  }
}

function onReplace(r: Run, s: Extract<RunScreen, { s: "replace" }>, k: string, arg?: string) {
  if (k === "keep") return settle(r, null);
  if (s.card.kind !== "blueprint") return settle(r, null);
  const old = arg as TowerId;
  if (s.from === "shop") {
    const shop = r.book.after.find((x) => x.s === "shop") as Extract<RunScreen, { s: "shop" }> | undefined;
    const item = shop?.stock[s.index ?? -1];
    if (item) { crowns(r, -item.price); item.sold = true; }
  }
  replaceTower(r, old, s.card.tower);
  if (s.from === "reward") {
    const i = r.book.after.findIndex((x) => x.s === "reward");
    if (i >= 0) r.book.after.splice(i, 1);
  }
  settle(r, null);
}

// ---------------------------------------------------------------- shop
type Shop = Extract<RunScreen, { s: "shop" }>;

function shopChoices(r: Run, s: Shop): Choice[] {
  const out: Choice[] = s.stock.map((it, i) => ({
    key: `buy:${i}`, label: cardName(it.card), text: cardText(it.card) + blueprintNote(r, it.card) + (it.sale ? " On sale." : ""),
    price: it.price, card: it.card,
    ...(it.sold ? { disabled: "Sold" } : r.crowns < it.price ? { disabled: "Not enough crowns" } : buyBlock(r, it.card) ? { disabled: buyBlock(r, it.card)! } : {}),
  }));
  const sv = s.services ?? { mend: null, lift: null, restock: null };
  const grey = (p: number | null, extra: string | null = null) => (p === null ? "Used" : r.crowns < p ? "Not enough crowns" : extra);
  const add = (key: string, label: string, text: string, p: number | null, extra: string | null = null) => {
    const d = grey(p, extra);
    out.push({ key, label, text, ...(p !== null ? { price: p } : {}), ...(d ? { disabled: d } : {}) });
  };
  add("mend", "Mend", `Heal ${SHOP.mend.lives} lives.`, sv.mend, r.loadout.lives >= r.loadout.maxLives ? "Lives are full" : null);
  add("lift", "Lift a curse", "Remove one curse.", r.loadout.curses.length ? sv.lift : null, r.loadout.curses.length ? null : "You have no curse");
  add("restock", "Restock", "Replace every card and relic you haven't bought.", sv.restock);
  out.push({ key: "leave", label: s.camp ? "To the fire" : "Leave", ...(s.mirage ? { text: "The most expensive thing you bought turns to sand." } : {}) });
  return out;
}

function buyBlock(r: Run, c: Card): string | null {
  if (c.kind === "supply" && !r.loadout.supplies.includes(null) && r.loadout.supplies.length >= 2) return "Your packs are full";
  if (c.kind === "boon" && r.loadout.boons.includes(c.boon)) return "Owned";
  if (c.kind === "relic" && has(r, c.relic)) return "Owned";
  if (c.kind === "blueprint" && owns(r, c.tower)) return "Owned";
  return null;
}

function onShop(r: Run, s: Shop, k: string, i: number) {
  const sv = (s.services ??= { mend: null, lift: null, restock: null });
  if (k === "buy") {
    const it = s.stock[i]!;
    if (it.card.kind === "blueprint" && r.loadout.towers.length >= MAX_TOWERS) {
      gainTower(r, it.card.tower, "shop", it.price, i); // raises the replace screen; paid on replace
      return settle(r, s);
    }
    crowns(r, -it.price); it.sold = true;
    gainCard(r, it.card, "shop");
    return settle(r, s);
  }
  if (k === "mend") { crowns(r, -sv.mend!); heal(r, SHOP.mend.lives); sv.mend = null; return settle(r, s); }
  if (k === "lift") { crowns(r, -sv.lift!); r.book.lifts++; sv.lift = null; pickLift(r); return settle(r, s); }
  if (k === "restock") { crowns(r, -sv.restock!); sv.restock = null; restock(r, s); return settle(r, s); }
  if (k === "leave") {
    if (s.mirage) {
      const bought = s.stock.filter((x) => x.sold).sort((a, b) => b.price - a.price)[0];
      if (bought) sand(r, bought.card);
    }
    return settle(r, null);
  }
}

/** The Mirage Market takes back its most expensive sale. */
function sand(r: Run, c: Card) {
  if (c.kind === "blueprint") removeTower(r, c.tower, false);
  else if (c.kind === "boon") loseBoon(r, c.boon);
  else if (c.kind === "relic") loseRelic(r, c.relic);
  else { const j = r.loadout.supplies.indexOf(c.supply); if (j >= 0) r.loadout.supplies[j] = null; }
}

// ---------------------------------------------------------------- forge
function forgeChoices(r: Run): Choice[] {
  const t = has(r, "bellows") ? FORGE.temperBellows : FORGE.temper;
  const canHone = r.loadout.towers.some((x) => boonOffers(r, [x]).length);
  const canRecast = r.loadout.towers.length >= FORGE.recastMin && r.book.unlocked.towers.some((x) => blueprintFits(r, x));
  return [
    { key: "hone", label: "Hone", text: `Choose a tower, see ${has(r, "bellows") ? FORGE.honeBellows : FORGE.hone} of its boons, take one.`, ...(canHone ? {} : { disabled: "Nothing left to offer" }) },
    { key: "temper", label: "Temper", text: `Temper ${t} of your boons.`, ...(untempered(r).length ? {} : { disabled: "No boons to temper" }) },
    { key: "recast", label: "Recast", text: "Replace one tower with one of 3 others. Its boons are lost: 10 crowns each.", ...(canRecast ? {} : { disabled: r.loadout.towers.length < FORGE.recastMin ? "Needs 4 tower cards" : "No tower to recast into" }) },
    { key: "leave", label: "Leave" },
  ];
}

function onForge(r: Run, k: string) {
  if (k === "hone") pickHone(r);
  if (k === "temper") pickTemper(r, has(r, "bellows") ? FORGE.temperBellows : FORGE.temper);
  if (k === "recast") pickTower(r, "recast-old", "Recast which tower?");
  settle(r, null);
}

// ---------------------------------------------------------------- rest
function restScreen(r: Run): RunScreen {
  const o = ["rest", "drill", "fortify"];
  if (has(r, "wayfarers-spade")) o.push("dig");
  if (has(r, "votive-candle")) o.push("pray");
  if (perk(r, "scout")) o.push("scout");
  return { s: "rest", options: o };
}

export function restHeal(r: RunState): number {
  return Math.ceil(r.loadout.maxLives * (r.ascension >= 5 ? REST.a5Pct : REST.pct) / 100) + (has(r, "field-rations") ? REST.rations : 0);
}

function restChoices(r: Run, s: Extract<RunScreen, { s: "rest" }>): Choice[] {
  const text: Record<string, [string, string, string | null]> = {
    rest: ["Rest", `Heal ${restHeal(r)} lives.`, has(r, "sun-disc") ? "The Sun Disc forbids it" : null],
    drill: ["Drill", "Temper one boon.", untempered(r).length ? null : "No boons to temper"],
    fortify: ["Fortify", `+${REST.fortify} max lives (not healed).`, null],
    dig: ["Dig", "Find a relic.", null],
    pray: ["Pray", "Lift a curse.", r.loadout.curses.length ? null : "You have no curse"],
    scout: ["Scout", "See the next act's map now.", r.act >= 4 || r.book.revealedNext ? "Nothing ahead to see" : null],
  };
  return s.options.map((o) => { const [label, t, d] = text[o]!; return { key: o, label, text: t, ...(d ? { disabled: d } : {}) }; });
}

function onRest(r: Run, k: string) {
  if (k === "rest") heal(r, restHeal(r));
  if (k === "drill") pickTemper(r, 1);
  if (k === "fortify") maxLives(r, REST.fortify);
  if (k === "dig") relicDig(r);
  if (k === "pray") pickLift(r);
  if (k === "scout") revealNext(r);
  settle(r, null);
}

// ---------------------------------------------------------------- reads for the UI
/** The next act's map, when something has revealed it. */
export function nextMap(run: RunState): ActMap | null {
  const r = run as Run;
  return r.book.revealedNext && r.act < 4 ? r.book.maps[r.act]! : null;
}

export function curseLine(id: string) { return CURSE[id]?.text ?? ""; }
export function eventInfo(id: string) { const e = EVENT[id]!; return { name: e.name, text: e.text }; }
export { basePrice, cardName, cardText, cardCount };
