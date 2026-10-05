// The run bot: plays a whole run through choices(run)/choose(run, key) like a person of knowledge k
// (run-meta 9 table), and the battles through the battle bot. A career strings runs together on one
// profile so renown, unlocks and perks accumulate like a player's.
import type { ActMap, Card, CommanderId, NodeKind, RunState, TowerId } from "../types.ts";
import { Rng, hash } from "../rng.ts";
import { battleFor, choices, choose, finishBattle, newRun, type Choice } from "../run/index.ts";
import { cardKey, type Run } from "../run/state.ts";
import { BOON } from "../content/run/boons.ts";
import { RELIC } from "../content/run/relics.ts";
import { TOWERS as RUN_TOWERS, AIR_BLUEPRINTS } from "../content/run/towers.ts";
import { SKIP_CROWNS } from "../content/run/economy.ts";
import { applyRun, newProfile, type Profile } from "../meta.ts";
import { playBattle, type BattleLog } from "./battle.ts";

export interface RunBotOpts {
  k: number;
  seed: number;
  /** Chance a reward pick is made at random (for unbiased card/relic lift estimates). */
  explore?: number;
  /** Always take (force) or never take (skip) this card key when offered. */
  force?: { key: string; mode: "force" | "skip" };
  trace?: boolean;
  /** Trace each battle's decisions too. */
  battleTrace?: boolean;
  /** Stop when the run reaches this act (smoke tests). */
  stopAt?: number;
}

export interface Offer { key: string; picked: boolean; explore: boolean; act: number; source: string }

export interface RunLog {
  run: RunState;
  battles: (BattleLog & { act: number; floor: number; kind: string; node: NodeKind })[];
  offers: Offer[];
  steps: string[];
  /** Relics held at the end (and when each came). */
  relics: string[];
}

const AREA: TowerId[] = ["bombard", "pyre", "storm", "alchemist", "thornwood"];
const RANK: Record<string, number> = { starter: 0, common: 1, shop: 1.5, uncommon: 2, event: 2, rare: 3, boss: 3.5 };

export class RunBot {
  readonly k: number;
  readonly rng: Rng;
  readonly o: RunBotOpts;
  log: RunLog;
  constructor(o: RunBotOpts) {
    this.o = o; this.k = o.k; this.rng = new Rng(hash(o.seed, 0x52b));
    this.log = { run: undefined as never, battles: [], offers: [], steps: [], relics: [] };
  }

  private note(r: RunState, s: string) { if (this.o.trace) this.log.steps.push(`[a${r.act} f${r.floor} L${r.loadout.lives}/${r.loadout.maxLives} c${r.crowns}] ${s}`); }

  // ---------------------------------------------------------------- what the bot thinks things are worth
  private dmgShare(r: RunState, t: TowerId): number {
    const d = r.stats.damageBy, tot = Object.values(d).reduce((a, x) => a + (x ?? 0), 0);
    if (!tot) return r.loadout.towers.indexOf(t) === 0 ? 0.4 : 0.3;
    return (d[t] ?? 0) / tot;
  }
  core(r: RunState): TowerId {
    return [...r.loadout.towers].sort((a, b) => this.dmgShare(r, b) - this.dmgShare(r, a))[0] ?? r.loadout.towers[0]!;
  }
  weakest(r: RunState): TowerId {
    return [...r.loadout.towers].sort((a, b) => this.dmgShare(r, a) - this.dmgShare(r, b))[0]!;
  }
  /** Real air cover: a Frost Spire reaches flyers but kills too slowly to stop a swarm (k-scaled knowledge). */
  private hasAir(r: RunState, towers = r.loadout.towers) { return towers.some((t) => RUN_TOWERS[t].air && !(t === "frost" && this.k >= 0.5)); }

  /** A card's worth in "crowns-ish" points (skip pays ~1 point per 10 crowns). */
  cardValue(r: RunState, c: Card): number {
    const k = this.k, ts = r.loadout.towers;
    switch (c.kind) {
      case "blueprint": {
        let v = 3 + RANK[c.rarity]! * 0.8;
        if (!this.hasAir(r) && RUN_TOWERS[c.tower].air) v += 7;
        // shades from act II: something that sees them (Beacon, Thornwood) or area that finds them
        if (k >= 0.5 && !ts.some((t) => t === "beacon" || t === "thornwood") && (c.tower === "beacon" || c.tower === "thornwood")) v += 3 * k;
        if (k >= 0.5 && !ts.some((t) => AREA.includes(t)) && AREA.includes(c.tower)) v += 3 * k;
        v += RUN_TOWERS[c.tower].partners.filter((p) => ts.includes(p)).length * 1.2 * k;
        v += ts.filter((t) => RUN_TOWERS[t].partners.includes(c.tower)).length * 0.8 * k;
        if (ts.length >= 4) v -= (ts.length - 3) * 2.5 * (0.5 + k);
        if (ts.length >= 6) v -= 4;
        return v;
      }
      case "boon": {
        const b = BOON[c.boon];
        let v = 2 + RANK[c.rarity]! * 1.4 + (b?.keystone ? 1 : 0);
        if (c.boon === "watchful" && k >= 0.5 && !ts.some((t) => t === "beacon" || t === "thornwood")) v += 2;
        const t = c.tower ?? b?.tower ?? null;
        if (t) {
          const share = this.dmgShare(r, t);
          v *= (1 - k) + k * (0.4 + 2.2 * share);
          if (!ts.includes(t)) v *= 0.4;
        }
        return v;
      }
      case "relic": {
        const d = RELIC[c.relic];
        let v = 4 + RANK[c.rarity]! * 1.2;
        if (d?.towers.length) v += d.towers.some((t) => ts.includes(t)) ? 2 * k : -3 * k;
        if (d?.downside) v -= 1.5 * k;
        return v;
      }
      case "supply": return 2;
    }
  }

  private skipValue(r: RunState): number { return SKIP_CROWNS[r.act] / 10 * (0.5 + this.k); }

  // ---------------------------------------------------------------- screens
  choose(run: RunState, opts: Choice[]): string {
    const r = run as Run, s = r.screen, k = this.k;
    const live = opts.filter((o) => !o.disabled);
    const pick = (o: Choice | undefined, why: string) => { const c = o ?? live[0] ?? opts[0]!; this.note(r, `${s.s}: ${c.label}${why ? ` (${why})` : ""}`); return c.key; };
    switch (s.s) {
      case "blessing": return pick(this.blessing(r, live), "blessing");
      case "map": return pick(this.path(r, live), "");
      case "reward": return this.reward(r, live, pick);
      case "replace": {
        const weak = this.weakest(r);
        return pick(live.find((o) => o.key === `replace:${weak}`) ?? live.find((o) => o.key === "keep"), "replace the weakest");
      }
      case "shop": return this.shop(r, live, pick);
      case "event": return pick(this.event(r, live), "");
      case "forge": {
        const has = (key: string) => live.find((o) => o.key === key);
        if (k < 0.4) return pick(live.find((o) => o.key !== "leave") ?? has("leave"), "first thing");
        const coreBoons = r.loadout.boons.filter((b) => (r.loadout.boonOn?.[b] ?? BOON[b]?.tower) === this.core(r) && !r.loadout.tempered.includes(b)).length;
        if (k >= 0.75 && coreBoons >= 2 && has("temper")) return pick(has("temper"), "temper the core's boons");
        return pick(has("hone") ?? has("temper") ?? has("leave"), "hone the core");
      }
      case "rest": {
        const has = (key: string) => live.find((o) => o.key === key);
        const frac = r.loadout.lives / r.loadout.maxLives;
        if (k < 0.4) return pick(has("rest") ?? live[0], "always rest");
        if (k < 0.75) return pick(frac < 0.6 ? has("rest") : has("drill") ?? has("fortify") ?? has("rest"), "");
        const bossNext = r.floor >= 6;
        return pick(frac < (bossNext ? 0.8 : 0.65) ? has("rest") : has("drill") ?? has("dig") ?? has("fortify") ?? has("rest"), "lives for the boss");
      }
      case "treasure": return pick(live[0], "");
      case "pick": return pick(this.pickScreen(r, live), "");
      default: return pick(live[0], "");
    }
  }

  private blessing(r: Run, live: Choice[]): Choice | undefined {
    const s = r.screen as Extract<RunState["screen"], { s: "blessing" }>;
    if (this.k < 0.4) return this.rng.pick(live);
    const val = (opt: string): number => {
      const [id, arg] = opt.split(":");
      const noAir = !this.hasAir(r);
      switch (id) {
        case "blueprint": return 5 + (noAir && AIR_BLUEPRINTS.includes(arg as TowerId) ? 6 : 0) + (this.k >= 0.75 ? 1 : 0);
        case "relic": return 5.5;
        case "rare-relic": return 9;
        case "lives": return 6 + (this.k < 0.75 ? 1 : 0);
        case "crowns": return 4.5;
        case "supplies": return 3.5;
        case "swap": return this.k >= 0.75 ? 5 : 2;
      }
      return 0;
    };
    let best: Choice | undefined, bv = -1;
    live.forEach((c) => { const i = Number(c.key.split(":")[1]); const v = val(s.options[i]!) + this.rng.range(0, 1.5 * (1 - this.k)); if (v > bv) { bv = v; best = c; } });
    return best;
  }

  // ---------------------------------------------------------------- path
  private nodeScore(r: Run, kind: NodeKind, lives: number, crowns: number, floor: number): number {
    const frac = lives / r.loadout.maxLives, k = this.k;
    switch (kind) {
      case "battle": return 3 - (frac < 0.35 ? 2 : 0);
      case "elite": return frac >= (k >= 0.75 ? 0.75 : 0.6) ? 5 : frac >= 0.45 ? -1 : -8;
      case "bounty": return 4 - (frac < 0.35 ? 2 : 0);
      case "shop": return crowns >= 100 ? 6 : crowns >= 60 ? 2.5 : 0;
      case "forge": return 3 + (floor >= 5 ? 1.5 : 0);
      case "rest": case "camp": return (1 - frac) * 10 + 1;
      case "event": return 2.5;
      case "treasure": return 6;
      case "boss": return 0;
    }
  }

  private path(r: Run, live: Choice[]): Choice | undefined {
    if (live.length <= 1 || this.k < 0.4) return this.rng.pick(live);
    const m = r.map, lives = r.loadout.lives, crowns = r.crowns;
    if (this.k < 0.75) {
      let best: Choice | undefined, bv = -Infinity;
      for (const c of live) { const n = m.nodes[c.node!]!; const v = this.nodeScore(r, n.kind, lives, crowns, n.floor) + this.rng.range(0, 1); if (v > bv) { bv = v; best = c; } }
      return best;
    }
    // experts plan the act: best total over the rest of the map (lives and crowns drift along the way)
    const memo = new Map<number, number>();
    const go = (id: number, lv: number, cr: number): number => {
      const n = m.nodes[id]!;
      const key = id;
      if (memo.has(key)) return memo.get(key)!;
      const here = this.nodeScore(r, n.kind, lv, cr, n.floor);
      const lv2 = Math.max(1, lv - (n.kind === "elite" ? 3 : n.kind === "battle" || n.kind === "bounty" ? 1.5 : 0) + (n.kind === "rest" ? r.loadout.maxLives * 0.3 : 0));
      const cr2 = cr + (n.kind === "battle" ? 15 : n.kind === "elite" ? 30 : 0) - (n.kind === "shop" ? 80 : 0);
      const best = n.next.length ? Math.max(...n.next.map((x) => go(x, lv2, Math.max(0, cr2)))) : 0;
      memo.set(key, here + 0.9 * best);
      return here + 0.9 * best;
    };
    let best: Choice | undefined, bv = -Infinity;
    for (const c of live) { const v = go(c.node!, lives, crowns); if (v > bv) { bv = v; best = c; } }
    return best;
  }

  // ---------------------------------------------------------------- rewards
  private reward(r: Run, live: Choice[], pick: (o: Choice | undefined, why: string) => string): string {
    const s = r.screen as Extract<RunState["screen"], { s: "reward" }>;
    const cards = live.filter((o) => (o.key.startsWith("card:") || o.key.startsWith("relic:")) && o.card);
    const skip = live.find((o) => o.key === "skip");
    const source = s.source ?? "battle";
    const record = (picked: Choice | undefined, explore: boolean) => {
      for (const c of cards) this.log.offers.push({ key: cardKey(c.card!), picked: c === picked, explore, act: r.act, source });
    };
    if (!cards.length) return pick(skip ?? live[0], "");
    // forced experiments
    const f = this.o.force;
    if (f) {
      const hit = cards.find((c) => cardKey(c.card!) === f.key);
      if (hit && f.mode === "force") { record(hit, false); return pick(hit, "forced"); }
    }
    const pool = f?.mode === "skip" ? cards.filter((c) => cardKey(c.card!) !== f.key) : cards;
    if (!pool.length) { record(undefined, false); return pick(skip, "forced skip"); }
    if (this.o.explore && this.rng.chance(this.o.explore)) {
      const c = this.rng.pick(pool);
      record(c, true);
      return pick(c, "explore");
    }
    let best: Choice | undefined, bv = -Infinity;
    if (this.k < 0.4) {
      // novices take the shiniest card
      for (const c of pool) { const v = RANK[c.card!.rarity]! + this.rng.range(0, 0.9); if (v > bv) { bv = v; best = c; } }
      record(best, false);
      return pick(best, "highest rarity");
    }
    for (const c of pool) { const v = this.cardValue(r, c.card!) * Math.exp(this.rng.range(-1, 1) * 0.6 * (1 - this.k)); if (v > bv) { bv = v; best = c; } }
    const relicScreen = !s.cards.length;
    if (this.k >= 0.75 && !relicScreen && skip && bv < this.skipValue(r) + 2) { record(undefined, false); return pick(skip, "nothing fits"); }
    record(best, false);
    return pick(best, `worth ${bv.toFixed(1)}`);
  }

  // ---------------------------------------------------------------- shop
  private shop(r: Run, live: Choice[], pick: (o: Choice | undefined, why: string) => string): string {
    const k = this.k, leave = live.find((o) => o.key === "leave");
    const frac = r.loadout.lives / r.loadout.maxLives;
    const mend = live.find((o) => o.key === "mend"), lift = live.find((o) => o.key === "lift");
    const buys = live.filter((o) => o.key.startsWith("buy:") && o.card && (o.price ?? 0) <= r.crowns);
    if (k < 0.4) return pick(buys[0] ?? leave, "first thing I can afford");
    if (lift && k >= 0.6) return pick(lift, "lift the curse");
    if (mend && frac < (k >= 0.75 ? 0.6 : 0.5)) return pick(mend, "mend");
    let best: Choice | undefined, bv = -Infinity;
    for (const o of buys) {
      if (o.card!.kind === "supply" && k < 0.6) continue;
      if (o.card!.kind === "relic" && k < 0.75 && RELIC[(o.card as Extract<Card, { kind: "relic" }>).relic]?.towers.length && !RELIC[(o.card as Extract<Card, { kind: "relic" }>).relic]!.towers.some((t) => r.loadout.towers.includes(t))) continue;
      const v = this.cardValue(r, o.card!) / Math.max(20, o.price!) * 100;
      if (v > bv) { bv = v; best = o; }
    }
    // buy while it is worth the crowns (experts keep some for the next shop)
    const keep = k >= 0.75 ? 30 : 0;
    if (best && bv >= (k >= 0.75 ? 8 : 6) && r.crowns - best.price! >= keep) return pick(best, `value ${bv.toFixed(1)} per 100 crowns`);
    return pick(leave, "done");
  }

  // ---------------------------------------------------------------- events and picks
  private event(r: Run, live: Choice[]): Choice | undefined {
    if (live.length === 1) return live[0];
    if (this.k < 0.4) return this.rng.pick(live);
    const frac = r.loadout.lives / r.loadout.maxLives;
    const score = (c: Choice): number => {
      const t = `${c.label} ${c.text ?? ""}`;
      let v = 0;
      const lose = /[Ll]ose (\d+) li/.exec(t), pay = /[Pp]ay (\d+) crowns/.exec(t), gain = /(?:[Gg]ain|[Ff]ind) (\d+) crowns/.exec(t), heal = /[Hh]eal (\d+)/.exec(t);
      if (lose) v -= +lose[1]! * (frac < 0.5 ? 3 : 1.2) * (this.k >= 0.75 ? 0.8 : 1);
      if (pay) v -= +pay[1]! / 12;
      if (gain) v += +gain[1]! / 12;
      if (heal) v += +heal[1]! * (1 - frac) * 1.5;
      if (/relic/i.test(t)) v += 4;
      if (/rare boon/i.test(t)) v += 4; else if (/boon/i.test(t)) v += 2.5;
      if (/curse/i.test(t) && !/[Ll]ift/.test(t)) v -= 4;
      if (/[Ll]ift a curse/.test(t) && r.loadout.curses.length) v += 4;
      if (/max lives/i.test(t)) v += 2;
      if (/^Nothing\.?$/.test(c.text ?? "")) v += 0.2;
      if (frac < 0.5 && lose && this.k < 0.75) v -= 10;
      return v + this.rng.range(0, 1.5 * (1 - this.k));
    };
    return live.reduce((a, c) => (score(c) > score(a) ? c : a), live[0]!);
  }

  private pickScreen(r: Run, live: Choice[]): Choice | undefined {
    const s = r.screen as Extract<RunState["screen"], { s: "pick" }>;
    const act = s.act;
    const negative = ["recast-old", "hermit-remove", "sell-tower", "swap"].includes(act);
    const opt = (c: Choice) => s.options[Number(c.key.split(":")[1])];
    const towersHere = live.filter((c) => c.key.startsWith("pick:") && opt(c)?.tower);
    if (towersHere.length) {
      if (act === "recast-new") return live.reduce((a, c) => (this.cardValue(r, { kind: "blueprint", tower: opt(c)!.tower!, rarity: RUN_TOWERS[opt(c)!.tower!].rarity }) > this.cardValue(r, { kind: "blueprint", tower: opt(a)!.tower!, rarity: RUN_TOWERS[opt(a)!.tower!].rarity }) ? c : a), towersHere[0]!);
      const want = negative ? this.weakest(r) : this.core(r);
      if (this.k < 0.4) return this.rng.pick(towersHere);
      return towersHere.find((c) => opt(c)!.tower === want) ?? towersHere[0];
    }
    const cards = live.filter((c) => c.key.startsWith("pick:") && c.card);
    if (cards.length) {
      if (this.k < 0.4) return cards.reduce((a, c) => (RANK[c.card!.rarity]! > RANK[a.card!.rarity]! ? c : a), cards[0]!);
      return cards.reduce((a, c) => (this.cardValue(r, c.card!) > this.cardValue(r, a.card!) ? c : a), cards[0]!);
    }
    const boons = live.filter((c) => c.key.startsWith("pick:") && opt(c)?.boon);
    if (boons.length) {
      const val = (c: Choice) => { const b = opt(c)!.boon!; const t = r.loadout.boonOn?.[b] ?? BOON[b]?.tower; return t ? this.dmgShare(r, t) : 0.2; };
      const lose = act === "tinker-give" || act === "feed-boon";
      return boons.reduce((a, c) => ((lose ? val(c) < val(a) : val(c) > val(a)) ? c : a), boons[0]!);
    }
    return live.find((c) => c.key.startsWith("pick:")) ?? live[0];
  }

  // ---------------------------------------------------------------- the whole run
  play(start: RunState): RunLog {
    let run = start;
    for (let i = 0; i < 4000 && !run.over && !(this.o.stopAt && run.act >= this.o.stopAt); i++) {
      if (run.screen.s === "battle") {
        const args = battleFor(run);
        const node = run.map.nodes[run.screen.node]!;
        const log = playBattle(args, { k: this.k, seed: hash(this.o.seed, 1000 + run.battleIndex), trace: this.o.battleTrace });
        this.log.battles.push({ ...log, act: run.act, floor: node.floor, kind: run.screen.kind, node: node.kind });
        this.note(run, `battle ${run.screen.kind} f${node.floor}: ${log.result.won ? "won" : "lost"}, lost ${run.loadout.lives - log.result.livesLeft} lives`);
        run = finishBattle(run, log.result);
      } else {
        const opts = choices(run);
        if (!opts.length) throw new Error(`stuck on ${run.screen.s}`);
        run = choose(run, this.choose(run, opts));
      }
    }
    this.log.run = run;
    this.log.relics = [...run.loadout.relics];
    return this.log;
  }
}

export function playRun(start: RunState, o: RunBotOpts): RunLog { return new RunBot(o).play(start); }

// ---------------------------------------------------------------- careers
/** run-meta 9: k(run) = min(0.75, 0.2 + 0.09 (run - 1)) + noise(0.05). */
export function learningK(run: number, g: Rng): number {
  return Math.max(0.05, Math.min(0.95, Math.min(0.75, 0.2 + 0.09 * (run - 1)) + g.range(-0.05, 0.05)));
}

export interface CareerRun { n: number; k: number; won: boolean; act: number; floor: number; log: RunLog; renown: number; unlocks: string[] }

/** A learning player's first `runs` runs on a fresh profile, renown and unlocks carrying over. */
export function career(seed: number, runs: number, o: { commander?: CommanderId; until?: "win"; k?: (n: number, g: Rng) => number } = {}): { runs: CareerRun[]; profile: Profile } {
  let p = newProfile();
  const g = new Rng(hash(seed, 0xca5));
  const out: CareerRun[] = [];
  for (let n = 1; n <= runs; n++) {
    const k = (o.k ?? learningK)(n, g);
    const rs = hash(seed, n);
    const r0 = newRun({ seed: rs, commander: o.commander ?? "marshal", ascension: 0, profile: p, firstRun: n === 1 });
    const log = playRun(r0, { k, seed: rs });
    const res = applyRun(p, log.run);
    p = res.profile;
    out.push({ n, k, won: !!log.run.over?.won, act: log.run.over?.act ?? log.run.act, floor: log.run.over?.floor ?? log.run.floor, log, renown: res.tally.total, unlocks: res.unlocks.map((u) => u.name) });
    if (o.until === "win" && log.run.over?.won) break;
  }
  return { runs: out, profile: p };
}

export type { ActMap };
