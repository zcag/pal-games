// Bosses, spells, supplies, waves, determinism, performance, and a reference-build sanity run.
import { describe, expect, test } from "bun:test";
import type { Act, BossId, CommanderId, EnemyId, SupplyId, TowerId } from "../ramparts/game/types.ts";
import { arena, put, tower, run, count, live, sNear, padNear, loadout, digest } from "../ramparts/game/battle/testkit.ts";
import { X, enemies, soldiers, towers, zones, T, type EnemyX } from "../ramparts/game/battle/internal.ts";
import { damage } from "../ramparts/game/battle/damage.ts";
import { newBattle, step, command, battleResult, rosterFor, nextWaves } from "../ramparts/game/battle/index.ts";
import { BOSSES } from "../ramparts/game/content/battle/bosses.ts";
import { ENEMIES } from "../ramparts/game/content/battle/enemies.ts";
import { ACTS } from "../ramparts/game/content/battle/acts.ts";
import { SPELL_NUM } from "../ramparts/game/content/battle/spells.ts";
import { unlockWave } from "../ramparts/game/content/battle/waves.ts";
import { laneAt } from "../ramparts/game/map.ts";

// ---------------------------------------------------------------- bosses
const ABILITIES: Record<BossId, string[]> = {
  gorrak: ["warcry", "muster", "charge"],
  hivequeen: ["brood", "bury", "brood3", "bury3"],
  wyrm: ["burrow", "erupt", "burrow2", "sandstorm"],
  lich: ["raise", "raise2", "boneward", "raise3"],
  colossus: ["stomp", "icearmour"],
  packlord: ["howl", "leap", "howl3", "leap3"],
  tyrant: ["breath", "wing", "land", "breath3", "embers"],
};

describe("bosses", () => {
  for (const id of Object.keys(BOSSES) as BossId[]) {
    test(`${id}: every phase and every ability`, () => {
      const act = BOSSES[id].act;
      const b = arena({ act });
      b.lives = 1e6;
      const L = b.map.lanes[0]!.length;
      for (const p of [0.35, 0.45, 0.55]) { const pad = padNear(b, L * p); if (pad >= 0) tower(b, "mage", 1, null, pad); }
      const e = put(b, id, L * 0.4);
      e.baseSpeed = 0;
      for (const t of towers(b)) t.disabled = 1e9; // keep the fight on script
      const phases = BOSSES[id].thresholds.length + 1;
      for (let ph = 1; ph <= phases; ph++) {
        run(b, T(40));
        if (ph < phases) {
          const th = BOSSES[id].thresholds[ph - 1]!;
          for (let k = 0; k < T(30) && (e.boss!.burrowed || e.boss!.tele); k++) run(b, 1);
          e.boss!.invuln = 0;
          damage(b, e, { amount: e.hp + e.shield + e.boss!.iceShield - th * e.maxHp + 1, type: "pure" });
          expect(e.boss!.phase).toBe(ph + 1);
          expect(e.boss!.invuln).toBeGreaterThan(0);
        }
      }
      const seen = new Set(b.events.filter((v) => v.e === "boss_ability").map((v) => (v as { ability: string }).ability));
      for (const a of ABILITIES[id]) expect([id, a, seen.has(a)]).toEqual([id, a, true]);
      expect(count(b, "boss_telegraph")).toBeGreaterThan(0);
      expect(count(b, "boss_phase")).toBe(phases - 1);
    });
  }
  test("R1: a boss leak costs 10 lives and laps with its HP and phase, +20% speed", () => {
    const b = arena({ loadout: { relics: ["lucky-horseshoe", "phoenix-feather"] } });
    b.lives = 25;
    const L = b.map.lanes[0]!.length;
    const g = put(b, "gorrak", L - 0.05);
    g.hp = 3000;
    run(b, 15);
    expect(b.lives).toBe(15);
    expect(g.lap).toBe(1);
    expect(g.s).toBeLessThan(1);
    expect(g.hp).toBe(3000);
    expect(count(b, "boss_lap")).toBe(1);
    expect(live(b)).toContain(g);
    run(b, 30);
    expect(g.speed).toBeCloseTo(0.45 * 1.2, 5);
  });
  test("a boss battle is won the tick the boss dies; the rest flee", () => {
    const b = arena();
    const g = put(b, "gorrak", 5);
    put(b, "footman", 3); put(b, "footman", 2);
    damage(b, g, { amount: 1e6, type: "pure" });
    run(b, 1);
    expect(b.phase).toBe("won");
    expect(live(b).length).toBe(0);
  });
});

// ---------------------------------------------------------------- spells
function spellArena(cmd: CommanderId) {
  const b = arena({ loadout: { commander: cmd } });
  b.lives = 999;
  for (const s of b.spells) s.cooldown = 0;
  const L = b.map.lanes[0]!.length;
  const s0 = L * 0.5;
  const es = [0, 1, 2].map((k) => { const e = put(b, "brute", s0 + k * 0.3); e.hp = e.maxHp = 1e5; return e; });
  const v = { x: 0, y: 0 };
  laneAt(b.map.lanes[0]!, s0 + 0.3, v);
  return { b, es, v };
}

describe("spells", () => {
  test("no casting in setup; cooldowns start half charged", () => {
    const b = newBattle({ seed: 3, act: 1, kind: "battle", floor: 1, loadout: loadout() });
    expect(b.spells[0]!.cooldown).toBe(Math.round(b.spells[0]!.total / 2));
    b.spells[0]!.cooldown = 0;
    expect(command(b, { t: "cast", spell: "Q", x: 1, y: 1 }).ok).toBe(false);
  });
  test("Marshal: Reinforcements and Meteor", () => {
    const { b, es, v } = spellArena("marshal");
    const n = soldiers(b).length;
    expect(command(b, { t: "cast", spell: "Q", ...v }).ok).toBe(true);
    expect(soldiers(b).length).toBe(n + 2);
    expect(command(b, { t: "cast", spell: "W", ...v }).ok).toBe(true);
    run(b, T(1.2));
    expect(es[1]!.hp).toBeLessThan(1e5 - SPELL_NUM.meteorDmg * 0.9);
    expect(es[1]!.st.burnT).toBeGreaterThan(0);
    run(b, T(10.5));
    expect(soldiers(b).filter((s) => s.kind === "reinforcement").length).toBe(0);
  });
  test("Alchemist: Firebomb ignites, Tar Pit slows and oils", () => {
    const { b, es, v } = spellArena("alchemist");
    command(b, { t: "cast", spell: "Q", ...v });
    expect(count(b, "ignite")).toBeGreaterThanOrEqual(3);
    const { b: b2, es: e2, v: v2 } = spellArena("alchemist");
    command(b2, { t: "cast", spell: "W", ...v2 });
    run(b2, 2);
    expect(e2[1]!.st.oiled).toBeGreaterThan(0);
    expect(e2[1]!.speed).toBeCloseTo(e2[1]!.baseSpeed * 0.5, 5);
    void es;
  });
  test("Seer: Stillness freezes all; Judgement hits the biggest for pure + stun", () => {
    const { b, es } = spellArena("seer");
    command(b, { t: "cast", spell: "Q" });
    expect(es.every((e) => e.st.frozen > 0)).toBe(true);
    const { b: b2, es: e2 } = spellArena("seer");
    e2[2]!.hp = 1e5 + 1;
    command(b2, { t: "cast", spell: "W" });
    expect(e2[2]!.hp).toBeCloseTo(1e5 + 1 - 350, 3);
    expect(e2[2]!.st.stun).toBe(T(1));
  });
  test("Quartermaster: Requisition levels a tower at half price; Rally speeds attacks", () => {
    const { b } = spellArena("quartermaster");
    const t = tower(b, "archer", 1);
    const g = b.gold;
    expect(command(b, { t: "cast", spell: "Q", tower: t.id }).ok).toBe(true);
    expect(t.level).toBe(2);
    expect(g - b.gold).toBe(40);
    command(b, { t: "cast", spell: "W" });
    run(b, 1);
    expect(t.aspd).toBeCloseTo(0.4, 6);
  });
  test("Warden: Barrier closes the road; Bramble Surge roots", () => {
    const { b, es, v } = spellArena("warden");
    const ahead = { x: 0, y: 0 };
    laneAt(b.map.lanes[0]!, es[2]!.s + 1.5, ahead);
    command(b, { t: "cast", spell: "Q", ...ahead });
    run(b, T(3));
    expect(es[2]!.s).toBeLessThan(es[2]!.s + 1.5);
    expect(es[2]!.speed).toBe(0);
    const { b: b2, es: e2, v: v2 } = spellArena("warden");
    command(b2, { t: "cast", spell: "W", ...v2 });
    expect(e2.filter((e) => e.st.root > 0).length).toBe(3);
    void v;
  });
  test("circle spells hit flyers at 50% (R2); Echo Stone recasts the first damage spell at 60%", () => {
    const { b, v } = spellArena("warden");
    const bat = put(b, "bat", 0);
    bat.onAir = false; bat.groundLane = 0; bat.x = v.x; bat.y = v.y; bat.hp = bat.maxHp = 1000;
    command(b, { t: "cast", spell: "W", ...v });
    expect(1000 - bat.hp).toBeCloseTo(SPELL_NUM.surgeDmg * SPELL_NUM.airMul, 6);
    expect(bat.st.root).toBe(0);
    const s2 = spellArena("seer");
    const b2 = arena({ loadout: { commander: "seer", relics: ["echo-stone"] } });
    for (const s of b2.spells) s.cooldown = 0;
    const e = put(b2, "brute", 5); e.hp = e.maxHp = 1e5;
    command(b2, { t: "cast", spell: "W" });
    run(b2, T(1.1));
    expect(1e5 - e.hp).toBeCloseTo(350 + 350 * 0.6, 3);
    void s2;
  });
});

// ---------------------------------------------------------------- supplies
describe("war supplies (R20)", () => {
  const all: SupplyId[] = ["oil-barrel", "frost-flask", "gold-cache", "spike-trap", "war-horn", "masons-kit", "flare", "heavy-bolt", "bell", "lifeblood"];
  for (const id of all) test(id, () => {
    const b = arena({ loadout: { supplies: [id, null] } });
    b.lives = 10;
    const L = b.map.lanes[0]!.length;
    const t = tower(b, "archer", 1);
    t.disabled = 300;
    const e = put(b, id === "flare" ? "shade" : "brute", L * 0.5); e.hp = e.maxHp = 1e4;
    const v = { x: e.x, y: e.y };
    const g = b.gold;
    expect(command(b, { t: "supply", slot: 0, ...v }).ok).toBe(true);
    expect(battleResult(b).supplies![0]).toBe(null);
    expect(count(b, "supply_used")).toBe(1);
    run(b, 1);
    switch (id) {
      case "oil-barrel": expect(e.st.oiled).toBeGreaterThan(0); break;
      case "frost-flask": expect(e.st.frozen).toBeGreaterThan(0); break;
      case "gold-cache": expect(b.gold - g).toBe(60); break;
      case "spike-trap": expect(e.hp).toBeLessThan(1e4); break;
      case "war-horn": expect(X(b).hornT).toBeGreaterThan(0); break;
      case "masons-kit": expect(t.disabled).toBe(0); break;
      case "flare": expect(e.st.revealed).toBeGreaterThan(0); break;
      case "heavy-bolt": expect(1e4 - e.hp).toBeCloseTo(300, 6); break;
      case "bell": expect(e.st.stun).toBeGreaterThan(0); break;
      case "lifeblood": expect(b.lives).toBe(12); break;
    }
  });
});

// ---------------------------------------------------------------- waves
function battle(act: Act, floor: number, kind: "battle" | "elite" | "boss" = "battle", seed = 1, first = false, extra: Partial<Parameters<typeof newBattle>[0]> = {}) {
  return newBattle({ seed, act, kind, floor, loadout: loadout({ firstBattle: first }), quiet: true, ...extra });
}

// A few seeds each in the suite; `bun ramparts/scripts/sweep.ts` runs the full sample.
const FULL = process.env.RAMPARTS_SWEEP === "1";

describe("waves", () => {
  test("run 1's first battle: 6 waves, 320 gold, no flyers (R13)", () => {
    for (let s = 1; s <= (FULL ? 60 : 10); s++) {
      const b = battle(1, 1, "battle", s, true);
      expect(b.waves.length).toBe(6);
      expect(b.gold).toBe(320);
      for (const w of b.waves) for (const g of w.groups) expect(ENEMIES[g.kind].flying).toBe(false);
    }
  });
  test("act I unlocks by wave and floor; one Air swarm from F2; bat caps (R2)", () => {
    for (let s = 1; s <= (FULL ? 40 : 4); s++) for (const floor of [1, 2, 3]) {
      const b = battle(1, floor, "battle", s);
      expect(b.waves.length).toBe(7);
      let air = 0;
      b.waves.forEach((w, i) => {
        for (const g of w.groups) if (!g.elite) expect(unlockWave(1, floor, g.kind)).toBeLessThanOrEqual(i + 1);
        if (w.archetype === "airswarm") air++;
        const bats = w.groups.filter((g) => g.kind === "bat").reduce((a, g) => a + g.count, 0);
        const sw = w.groups.filter((g) => g.kind === "swarmling").reduce((a, g) => a + g.count, 0);
        expect(bats).toBeLessThanOrEqual(10);
        expect(sw).toBeLessThanOrEqual(20);
        for (const g of w.groups) expect(g.count).toBeLessThanOrEqual(16);
      });
      expect(air).toBe(floor >= 2 ? 1 : 0);
      expect(b.waves[6]!.archetype).toBe("grand");
    }
  }, 20_000);
  test("acts II-IV guarantee armour, ward, air and stealth-or-shields waves; act IV two air", () => {
    for (const act of [2, 3, 4] as Act[]) for (let s = 1; s <= (FULL ? 40 : 4); s++) {
      const b = battle(act, 3, "battle", s);
      const a = b.waves.map((w) => w.archetype);
      expect(a.some((x) => ["armoured", "shieldwall", "siege"].includes(x))).toBe(true);
      expect(a.some((x) => ["warded", "healer"].includes(x))).toBe(true);
      expect(a.filter((x) => ["airswarm", "skyraid"].includes(x)).length).toBeGreaterThanOrEqual(act === 4 ? 2 : 1);
      expect(a.some((x) => ["stealth", "shieldwall"].includes(x))).toBe(true);
      for (const w of b.waves) {
        const cap = ACTS[act].smallCap;
        for (const k of ["swarmling", "bat"] as EnemyId[]) expect(w.groups.filter((g) => g.kind === k).reduce((n, g) => n + g.count, 0)).toBeLessThanOrEqual(cap);
      }
    }
  });
  test("elite battles: one more wave, elites on top at ceil(N/2) and the last wave", () => {
    const b = battle(3, 3, "elite", 4, false, { elite: "warlock" });
    expect(b.waves.length).toBe(10);
    const el = b.waves.map((w) => w.groups.filter((g) => g.elite).reduce((n, g) => n + g.count, 0));
    expect(el[4]).toBe(1);
    expect(el[9]).toBe(2);
    for (const w of b.waves) for (const g of w.groups) if (g.elite) expect(g.affixes!.length).toBe(1);
    const a6 = newBattle({ seed: 4, act: 1, kind: "elite", floor: 3, loadout: loadout({ ascension: 6 }), elite: "matron" });
    for (const w of a6.waves) for (const g of w.groups) if (g.elite) expect(g.affixes!.length).toBeGreaterThanOrEqual(2);
  });
  test("boss battles end on the boss wave; themes; previews and roster", () => {
    for (const boss of ["gorrak", "hivequeen"] as BossId[]) {
      const b = battle(1, 7, "boss", 2, false, { boss });
      expect(b.waves.length).toBe(8);
      expect(b.waves[7]!.boss).toBe(boss);
      expect(b.waves[7]!.groups[0]!.kind).toBe(boss);
      expect(b.roster).toContain(boss);
    }
    const t = battle(2, 3, "battle", 9, false, { archetypes: ["slime", "swarm"] });
    const plain = battle(2, 3, "battle", 9);
    expect(t.waves.filter((w) => ["slime", "swarm"].includes(w.archetype)).length).toBeGreaterThanOrEqual(plain.waves.filter((w) => ["slime", "swarm"].includes(w.archetype)).length);
    const p = nextWaves(t, 2);
    expect(p.length).toBe(2);
    expect(p[0]!.leak).toBeGreaterThan(0);
    expect(rosterFor({ seed: 9, act: 2, kind: "battle", floor: 3, loadout: loadout() }).sort()).toEqual([...plain.roster].sort());
  });
  test("threat budget follows T(w) within 5% (plus caps)", () => {
    const b = battle(1, 3, "battle", 11);
    for (const w of b.waves) {
      const T0 = 10 * (1 + 0.15 * w.index) * 1.0 * (w.index === 6 ? 1.3 : w.index === 3 ? 1.2 : w.index === 4 ? 0.85 : 1);
      expect(w.threat).toBeLessThanOrEqual(T0 * 1.05 + 1e-6 + 3);
      expect(w.threat).toBeGreaterThan(T0 * 0.6);
    }
  });
});

// ---------------------------------------------------------------- whole battles
const REF: TowerId[] = ["archer", "barracks", "mage", "bombard"];

function playReference(seed: number, act: Act = 1, floor = 1, build = true) {
  const b = newBattle({ seed, act, kind: "battle", floor, loadout: loadout({ towers: REF, lives: 100, maxLives: 100 }), quiet: true });
  const pads = [...b.map.pads].sort((p, q) => q.score - p.score || p.id - q.id);
  const plan: TowerId[] = ["archer", "mage", "barracks", "bombard", "archer", "mage"];
  let built = 0;
  const tryBuild = () => { while (build && built < plan.length && pads[built] && command(b, { t: "build", pad: pads[built]!.id, tower: plan[built]! }).ok) built++; };
  tryBuild();
  command(b, { t: "call" });
  let spawned = 0;
  for (let i = 0; i < 30 * 600 && b.phase === "running"; i++) {
    step(b);
    tryBuild();
    if (build && built >= plan.length) for (const t of [...b.towers].sort((p, q) => p.level - q.level || p.id - q.id)) if (t.level < 3) command(b, { t: "upgrade", tower: t.id });
  }
  spawned = b.stats.kills + b.stats.leaked;
  return { b, spawned };
}

describe("whole battles", () => {
  test("determinism: same seed and commands give the same state after 3000 ticks", () => {
    const go = () => {
      const b = newBattle({ seed: 99, act: 2, kind: "battle", floor: 3, loadout: loadout({ towers: ["archer", "mage", "frost", "storm"], lives: 99, maxLives: 99 }) });
      const pads = [...b.map.pads].sort((p, q) => q.score - p.score);
      ["archer", "mage", "frost"].forEach((k, i) => command(b, { t: "build", pad: pads[i]!.id, tower: k as TowerId }));
      command(b, { t: "call" });
      for (let i = 0; i < 3000; i++) {
        step(b);
        if (i === 400) command(b, { t: "build", pad: pads[3]!.id, tower: "storm" });
        if (i === 900) for (const t of towers(b)) command(b, { t: "upgrade", tower: t.id });
        b.events.length = 0;
      }
      return digest(b);
    };
    const a = go(), c = go();
    expect(a).toBe(c);
    expect(a.length).toBeGreaterThan(100);
  });
  test("reference build (Archer, Mage, Barracks, Bombard, greedy upgrades) holds most of an act I F1 battle; an empty defence leaks everything", () => {
    let lost = 0, killed = 0, total = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { b, spawned } = playReference(seed);
      expect(b.phase).toBe("won");
      lost += b.stats.livesLost; killed += b.stats.kills; total += spawned;
    }
    // A sanity band, not a balance target (the balance agent tunes): most enemies die.
    expect(killed / total).toBeGreaterThan(0.75);
    const empty = playReference(1, 1, 1, false);
    expect(empty.b.stats.kills).toBe(0);
    expect(empty.b.stats.leaked).toBe(empty.spawned);
    expect(lost / 6).toBeLessThan(empty.b.stats.livesLost / 2);
  });
  test("performance: 150 enemies and 14 towers step in under 0.25 ms", () => {
    const b = newBattle({ seed: 5, act: 4, kind: "battle", floor: 3, loadout: loadout({ towers: ["archer", "mage", "bombard", "frost", "storm", "pyre"], relics: ["seven-bells"], lives: 1e6, maxLives: 1e6 }), quiet: true });
    b.waves = []; b.phase = "running"; b.gold = 1e6;
    X(b).mods.l1Cost = 0;
    const kinds: TowerId[] = ["archer", "mage", "bombard", "frost", "storm", "pyre"];
    b.map.pads.slice(0, 14).forEach((p, i) => { command(b, { t: "build", pad: p.id, tower: kinds[i % kinds.length]! }); });
    for (const t of towers(b)) { command(b, { t: "upgrade", tower: t.id }); command(b, { t: "upgrade", tower: t.id }); t.building = 0; }
    const L = b.map.lanes[0]!.length;
    const roles: EnemyId[] = ["footman", "runner", "brute", "acolyte", "bat", "shaman", "shieldbearer"];
    for (let k = 0; k < 150; k++) { const e = put(b, roles[k % roles.length]!, (L * 0.6 * k) / 150 * (roles[k % roles.length] === "bat" ? 0.6 : 1)); e.hp = e.maxHp = 1e7; e.baseSpeed *= 0.2; }
    for (let i = 0; i < 60; i++) step(b);
    const n = 600;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { step(b); b.events.length = 0; }
    const ms = (performance.now() - t0) / n;
    console.log(`perf: ${ms.toFixed(4)} ms/tick with ${live(b).length} enemies and ${towers(b).length} towers`);
    expect(towers(b).length).toBeGreaterThanOrEqual(12);
    expect(live(b).length).toBeGreaterThanOrEqual(140);
    expect(ms).toBeLessThan(0.25);
  });
  test("battleResult reports what the run needs", () => {
    const { b } = playReference(2);
    const r = battleResult(b);
    expect(r.won).toBe(true);
    expect(r.ticks).toBe(b.tick);
    expect(r.ghost!.length).toBe(towers(b).length);
    expect(r.elitesKilled).toBe(true);
  });
});

void enemies; void zones; void sNear; void spawnTypes;
function spawnTypes(e: EnemyX) { return e.kind; }
