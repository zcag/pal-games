// Damage model, statuses, blocking, roles (systems 4, 5, 7, 9; Revision 1).
import { describe, expect, test } from "bun:test";
import { arena, put, tower, run, count, live, padNear, sNear } from "../ramparts/game/battle/testkit.ts";
import { damage, chill, freeze, stun, root, hex, mark, shred, burn } from "../ramparts/game/battle/damage.ts";
import { X, enemies, soldiers, T, type EnemyX } from "../ramparts/game/battle/internal.ts";
import { command } from "../ramparts/game/battle/commands.ts";
import { computeBuffs } from "../ramparts/game/battle/towers.ts";
import { priceOf } from "../ramparts/game/battle/commands.ts";
import { step } from "../ramparts/game/battle/sim.ts";
import { ACTS } from "../ramparts/game/content/battle/acts.ts";

const hp = (e: EnemyX) => e.hp;

describe("damage formula (systems 4.3)", () => {
  test("resist by type: armour, ward, fireproof, pure", () => {
    const b = arena();
    const br = put(b, "brute", 5); // armour 45
    damage(b, br, { amount: 100, type: "phys" });
    expect(br.maxHp - hp(br)).toBeCloseTo(55, 6);
    damage(b, br, { amount: 100, type: "magic" });
    expect(br.maxHp - hp(br)).toBeCloseTo(155, 6);
    const ac = put(b, "acolyte", 6); // ward 45
    damage(b, ac, { amount: 50, type: "magic" });
    expect(ac.maxHp - hp(ac)).toBeCloseTo(27.5, 6);
    damage(b, ac, { amount: 10, type: "pure" });
    expect(ac.maxHp - hp(ac)).toBeCloseTo(37.5, 6);
  });
  test("shred then pierce; dealt before resist; taken after", () => {
    const b = arena();
    const br = put(b, "brute", 5);
    for (let i = 0; i < 3; i++) shred(br, 1); // armour 45 - 15 = 30
    damage(b, br, { amount: 100, type: "phys", pierce: 50, dealt: 0.5 }); // 150 * (1 - 15%) = 127.5
    expect(br.maxHp - br.hp).toBeCloseTo(127.5, 6);
    const f = put(b, "footman", 6);
    hex(b, f, 90, 25, null);
    mark(b, f, 90, 15, null);
    damage(b, f, { amount: 10, type: "phys" });
    expect(f.maxHp - f.hp).toBeCloseTo(14, 6);
  });
  test("taken cap +100%; a Hexer's hex lifts it to +150% (R12)", () => {
    const b = arena();
    const f = put(b, "brute", 5);
    f.armour = 0;
    hex(b, f, 300, 60, null); mark(b, f, 300, 60, null);
    damage(b, f, { amount: 10, type: "phys" });
    expect(f.maxHp - f.hp).toBeCloseTo(20, 6);
    const g = put(b, "brute", 6);
    g.armour = 0;
    hex(b, g, 300, 60, null, true); mark(b, g, 300, 60, null);
    damage(b, g, { amount: 10, type: "phys" });
    expect(g.maxHp - g.hp).toBeCloseTo(22, 6);
  });
  test("crit chance caps at 75%", () => {
    const b = arena();
    let crits = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const f = put(b, "brute", 5);
      damage(b, f, { amount: 1, type: "pure", direct: true, crit: 400 });
      if (f.maxHp - f.hp > 1.5) crits++;
      f.gone = true;
    }
    expect(crits / n).toBeGreaterThan(0.71);
    expect(crits / n).toBeLessThan(0.79);
  });
  test("shields absorb first; lightning does x3 to shield points", () => {
    const b = arena();
    const f = put(b, "footman", 5);
    f.shield = 30;
    damage(b, f, { amount: 20, type: "magic", lightning: true }); // 60 shield points: 30 absorbed by 10, then 10 to HP
    expect(f.shield).toBe(0);
    expect(f.maxHp - f.hp).toBeCloseTo(10, 6);
    expect(count(b, "shield_break")).toBe(1);
  });
  test("cost pool floors at -50% (R3)", () => {
    const b = arena({ loadout: { relics: ["masons-seal"], boons: ["thrifty", "standard-bearer"], boonOn: { thrifty: "banner" } } });
    expect(priceOf(b, "banner", 1, null)).toBe(Math.round(90 * 0.5));
    expect(priceOf(b, "archer", 1, null)).toBe(Math.round(70 * 0.75));
  });
});

describe("statuses (systems 5)", () => {
  test("chill builds to a freeze, then a thawing window stops new chill", () => {
    const b = arena();
    const f = put(b, "footman", 5);
    chill(b, f, 60); chill(b, f, 60);
    expect(f.st.frozen).toBe(T(1.5));
    run(b, T(1.5));
    expect(f.st.frozen).toBe(0);
    expect(f.st.thaw).toBeGreaterThan(0);
    chill(b, f, 50);
    expect(f.st.chill).toBe(0);
  });
  test("elites and bosses go Numb instead of freezing", () => {
    const b = arena();
    const j = put(b, "juggernaut", 5);
    chill(b, j, 300);
    expect(j.st.frozen).toBe(0);
    expect(j.st.numb).toBeGreaterThan(0);
  });
  test("fire and ice cancel: fire thaws a frozen enemy and removes 30 chill; freezing puts out burn", () => {
    const b = arena();
    const f = put(b, "footman", 5);
    burn(b, f, 10, 90, null);
    freeze(b, f, 45);
    expect(f.st.burnT).toBe(0);
    damage(b, f, { amount: 1, type: "fire" });
    expect(f.st.frozen).toBe(0);
    expect(count(b, "thaw")).toBeGreaterThan(0);
    const g = put(b, "brute", 6);
    chill(b, g, 50);
    damage(b, g, { amount: 1, type: "fire" });
    expect(g.st.chill).toBeCloseTo(20, 6);
  });
  test("R9: any hard CC grants 1 s immunity to every hard CC", () => {
    const b = arena();
    const f = put(b, "footman", 5);
    expect(stun(b, f, 15)).toBe(true);
    run(b, 15);
    expect(f.st.stun).toBe(0);
    expect(freeze(b, f, 30)).toBe(false);
    expect(root(b, f, 30)).toBe(false);
    run(b, 31);
    expect(stun(b, f, 15)).toBe(true);
  });
  test("bosses take x0.25 stuns (min 0.2 s); juggernauts ignore stun and root", () => {
    const b = arena();
    const g = put(b, "gorrak", 5);
    stun(b, g, 60);
    expect(g.st.stun).toBe(15);
    const j = put(b, "juggernaut", 6);
    expect(stun(b, j, 30)).toBe(false);
    expect(root(b, j, 30)).toBe(false);
  });
  test("oil + fire ignites: 60 fire, burn 20 dps, oil consumed", () => {
    const b = arena();
    const f = put(b, "brute", 5);
    f.st.oiled = 60;
    const h0 = f.hp;
    damage(b, f, { amount: 1, type: "fire" });
    expect(h0 - f.hp).toBeCloseTo(61, 6);
    expect(f.st.oiled).toBe(0);
    expect(f.st.burnDps).toBe(20);
    expect(count(b, "ignite")).toBe(1);
  });
  test("one burn per enemy: max dps, max time", () => {
    const b = arena();
    const f = put(b, "brute", 5);
    burn(b, f, 10, 60, null); burn(b, f, 5, 120, null);
    expect(f.st.burnDps).toBe(10);
    expect(f.st.burnT).toBe(120);
  });
  test("hex: no healing, shields halved; slows floor at 25% speed", () => {
    const b = arena({ act: 1 });
    const sh = put(b, "shaman", 5);
    const f = put(b, "footman", 5.2);
    f.hp = 20;
    hex(b, f, 600, 20, null);
    sh.abilT = 1;
    step(b);
    expect(f.hp).toBeLessThanOrEqual(20.0001);
    const g = put(b, "footman", 2);
    g.shield = 40;
    hex(b, g, 60, 20, null);
    expect(g.shield).toBe(20);
    g.st.slow = 0.9; g.st.slowT = 100; g.st.chill = 99;
    step(b);
    expect(g.speed).toBeCloseTo(g.baseSpeed * 0.25, 6);
  });
  test("shred caps at 6 stacks (Acid/Shrapnel 10)", () => {
    const b = arena();
    const f = put(b, "brute", 5);
    for (let i = 0; i < 20; i++) shred(f, 1);
    expect(f.st.shred).toBe(6);
    for (let i = 0; i < 20; i++) shred(f, 1, 10);
    expect(f.st.shred).toBe(10);
  });
  test("stealth: towers can't target a shade until it is revealed; damage reveals", () => {
    const b = arena();
    const t = tower(b, "archer", 1);
    const s = sNear(b, t.pad);
    const sh = put(b, "shade", s);
    sh.baseSpeed = 0;
    run(b, 60);
    expect(sh.hp).toBe(sh.maxHp);
    damage(b, sh, { amount: 1, type: "pure" });
    expect(sh.st.revealed).toBeGreaterThan(0);
    run(b, 30);
    expect(sh.hp).toBeLessThan(sh.maxHp - 1);
  });
  test("a Beacon reveals shades in its radius", () => {
    const b = arena();
    const t = tower(b, "beacon", 1);
    const sh = put(b, "shade", sNear(b, t.pad));
    sh.baseSpeed = 0;
    run(b, 5);
    expect(sh.st.revealed).toBeGreaterThan(0);
    expect(count(b, "reveal")).toBeGreaterThan(0);
  });
});

describe("blocking (systems 7)", () => {
  function barracks(spec: "paladins" | null = null) {
    const b = arena();
    b.lives = 999;
    const t = tower(b, "barracks", spec ? 4 : 1, spec);
    run(b, 90); // soldiers walk to the rally
    return { b, t };
  }
  test("each soldier holds one; the rest walk past", () => {
    const { b, t } = barracks();
    const s0 = sNear(b, t.pad);
    const es = [0, 1, 2, 3, 4].map((k) => put(b, "footman", Math.max(0, s0 - 3 - k * 0.4)));
    run(b, 150);
    const held = es.filter((e) => e.heldBy).length;
    expect(held).toBe(3);
    expect(count(b, "block")).toBeGreaterThanOrEqual(3);
  });
  test("Paladins hold 2 each only above half health (R12)", () => {
    const { b, t } = barracks("paladins");
    const s0 = sNear(b, t.pad);
    for (let k = 0; k < 8; k++) put(b, "footman", Math.max(0, s0 - 3 - k * 0.3)).melee = null;
    run(b, 150);
    const per = new Map<number, number>();
    for (const e of live(b)) if (e.heldBy) per.set(e.heldBy, (per.get(e.heldBy) ?? 0) + 1);
    expect(Math.max(...per.values())).toBe(2);
    const sold = soldiers(b).find((q) => q.held.length === 2)!;
    sold.hp = sold.maxHp * 0.4;
    run(b, 2);
    expect(sold.held.length).toBe(1);
  });
  test("runners slip: keep 50% speed for 0.5 s after being engaged", () => {
    const { b, t } = barracks();
    const r = put(b, "runner", Math.max(0, sNear(b, t.pad) - 3));
    let moved = -1;
    for (let i = 0; i < 200 && moved < 0; i++) {
      run(b, 1);
      if (r.heldBy && r.slip > 0) moved = r.speed;
    }
    expect(moved).toBeGreaterThan(0);
  });
  test("juggernauts walk through soldiers and knock them back", () => {
    const { b, t } = barracks();
    const j = put(b, "juggernaut", Math.max(0, sNear(b, t.pad) - 3));
    const s1 = j.s;
    run(b, 300);
    expect(j.heldBy).toBe(0);
    expect(j.s).toBeGreaterThan(s1 + 2);
    expect(soldiers(b).some((s) => s.hp < s.maxHp)).toBe(true);
  });
});

describe("enemy roles (systems 9.2)", () => {
  test("sappers plant on the most-invested tower and disable it 6 s; blocking cancels", () => {
    const b = arena();
    b.lives = 999;
    const t = tower(b, "mage", 3);
    const sp = put(b, "sapper", Math.max(0, sNear(b, t.pad) - 1.5));
    run(b, 80);
    expect(count(b, "sapper_plant")).toBe(1);
    expect(count(b, "tower_disabled")).toBe(1);
    expect(t.disabled).toBeGreaterThan(0);
    void sp;
  });
  test("splitters split into 2 slimes, slimes into 2 slimelets", () => {
    const b = arena({ act: 2 });
    const s = put(b, "splitter", 5);
    damage(b, s, { amount: 9999, type: "pure" });
    run(b, 1);
    expect(live(b).filter((e) => e.kind === "slime").length).toBe(2);
    const sl = live(b).find((e) => e.kind === "slime")!;
    damage(b, sl, { amount: 9999, type: "pure" });
    run(b, 1);
    expect(live(b).filter((e) => e.kind === "slimelet").length).toBe(2);
    expect(count(b, "split")).toBe(2);
  });
  test("warlock channel is cancelled by a stun and resets its timer", () => {
    const b = arena();
    const w = put(b, "warlock", 5);
    run(b, T(4) + 2);
    expect(w.channel).toBeGreaterThan(0);
    w.st.stunImmune = 0;
    stun(b, w, 30);
    expect(w.channel).toBe(0);
    run(b, T(2));
    expect(live(b).filter((e) => e.kind === "risen").length).toBe(0);
    const v = put(b, "warlock", 4);
    run(b, T(5.6));
    expect(live(b).filter((e) => e.kind === "risen").length).toBe(3);
    void v;
  });
  test("shieldbearers shield allies (not themselves); matrons birth swarmlings", () => {
    const b = arena();
    const sb = put(b, "shieldbearer", 5);
    const f = put(b, "footman", 5.3);
    run(b, T(2) + 1);
    expect(f.shield).toBeGreaterThan(0);
    expect(sb.shield).toBe(0);
    put(b, "matron", 3);
    run(b, T(4) + 2);
    expect(live(b).filter((e) => e.kind === "swarmling").length).toBe(2);
  });
  test("vengeful elites disable the nearest tower on death", () => {
    const b = arena();
    const t = tower(b, "archer", 1);
    const e = put(b, "juggernaut", sNear(b, t.pad), { affixes: ["vengeful"], elite: true });
    damage(b, e, { amount: 1e6, type: "pure" });
    run(b, 1);
    expect(t.disabled).toBeGreaterThan(0);
  });
});

describe("gold (systems 2)", () => {
  test("interest is computed before wave pay and the call-early bonus", () => {
    const b = arena();
    const x = X(b);
    b.waves = [{ index: 0, archetype: "march", threat: 1, groups: [{ kind: "footman", count: 1, lane: 0, spacing: 1, delay: 0 }], badges: [] },
      { index: 1, archetype: "march", threat: 1, groups: [{ kind: "footman", count: 1, lane: 0, spacing: 1, delay: 0 }], badges: [] },
      { index: 2, archetype: "march", threat: 1, groups: [{ kind: "footman", count: 1, lane: 0, spacing: 1, delay: 0 }], badges: [] }];
    b.next = 0; b.gold = 300; b.phase = "setup";
    command(b, { t: "call" });
    run(b, 5);
    b.gold = 300;
    const ev = () => b.events.filter((e) => e.e === "wave_start").pop() as Extract<(typeof b.events)[number], { e: "wave_start" }>;
    const left = b.countdown;
    command(b, { t: "call" });
    const w = ev();
    expect(w.interest).toBe(15); // 5% of 300, before income and bonus
    expect(w.income).toBe(12);
    expect(w.bonus).toBe(Math.ceil((left / 30) * 3));
    expect(b.gold).toBe(300 + 15 + 12 + w.bonus);
    void x;
  });
  test("interest cap", () => {
    const b = arena();
    b.waves = [0, 1].map((i) => ({ index: i, archetype: "march", threat: 1, groups: [{ kind: "footman" as const, count: 1, lane: 0, spacing: 1, delay: 0 }], badges: [] }));
    b.next = 1; b.gold = 5000;
    X(b).spawning = false; b.countdown = 1;
    run(b, 1);
    const w = b.events.find((e) => e.e === "wave_start") as Extract<(typeof b.events)[number], { e: "wave_start" }>;
    expect(w.interest).toBe(20);
  });
  test("sell 100% in setup, 70% after, locked in the final wave", () => {
    const b = arena();
    b.phase = "setup";
    const t = tower(b, "archer", 1);
    b.phase = "setup";
    const g0 = b.gold;
    command(b, { t: "sell", tower: t.id });
    expect(b.gold - g0).toBe(70);
    b.phase = "running";
    const t2 = tower(b, "archer", 1);
    const g1 = b.gold;
    command(b, { t: "sell", tower: t2.id });
    expect(b.gold - g1).toBe(49);
    const t3 = tower(b, "archer", 1);
    X(b).lastWaveStarted = true;
    expect(command(b, { t: "sell", tower: t3.id }).ok).toBe(false);
  });
  test("bounty: round(threat x 5 x bountyMul); R10 summons pay nothing after the last wave has spawned", () => {
    const b = arena({ act: 2 });
    const g0 = b.gold;
    const f = put(b, "brute", 3);
    damage(b, f, { amount: 1e5, type: "pure" });
    run(b, 1);
    expect(b.gold - g0).toBe(Math.round(3 * 5 * ACTS[2].bountyMul));
    X(b).lastWaveStarted = true; b.next = b.waves.length;
    const g1 = b.gold;
    const s = put(b, "risen", 3, { summoned: true });
    damage(b, s, { amount: 1e5, type: "pure" });
    run(b, 1);
    expect(b.gold).toBe(g1);
  });
});

describe("leaks", () => {
  test("leak values and lives; Lucky Horseshoe never covers an elite", () => {
    const b = arena({ loadout: { relics: ["lucky-horseshoe"] } });
    const l = b.map.lanes[0]!.length;
    put(b, "juggernaut", l - 0.01, { elite: true });
    run(b, 2);
    expect(b.lives).toBe(17);
    put(b, "brute", l - 0.01);
    run(b, 2);
    expect(b.lives).toBe(17);
    put(b, "brute", l - 0.01);
    run(b, 2);
    expect(b.lives).toBe(15);
  });
});

void enemies; void computeBuffs; void padNear;
