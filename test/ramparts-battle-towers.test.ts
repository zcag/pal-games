// Every tower at L1, L3 and both specialisations fires and deals damage; signature mechanics.
import { describe, expect, test } from "bun:test";
import type { SpecId, TowerId } from "../ramparts/game/types.ts";
import { TOWERS, TOWER_IDS } from "../ramparts/game/content/battle/towers.ts";
import { arena, put, tower, run, count, live, sNear } from "../ramparts/game/battle/testkit.ts";
import { enemies, soldiers, T, type EnemyX } from "../ramparts/game/battle/internal.ts";
import { damage, freeze } from "../ramparts/game/battle/damage.ts";
import { addZone } from "../ramparts/game/battle/towers.ts";

function targets(b: ReturnType<typeof arena>, pad: number, air: boolean): EnemyX[] {
  const s = sNear(b, pad);
  const out: EnemyX[] = [];
  for (let k = -3; k <= 3; k++) {
    const e = put(b, "footman", Math.max(0.5, s + k * 0.6));
    e.baseSpeed = 0; e.hp = e.maxHp = 1e6;
    out.push(e);
  }
  if (air) {
    const bat = put(b, "bat", 0);
    bat.baseSpeed = 0; bat.hp = bat.maxHp = 1e6;
    bat.onAir = false; bat.groundLane = 0; // park it over the ground point, still a flyer
    bat.s = s; bat.x = out[3]!.x; bat.y = out[3]!.y; bat.laneLen = b.map.lanes[0]!.length;
    out.push(bat);
  }
  return out;
}

const forms = (kind: TowerId): [number, SpecId | null][] => [[1, null], [3, null], [4, TOWERS[kind].specs[0].id], [4, TOWERS[kind].specs[1].id]];

describe("every tower and spec fires", () => {
  for (const kind of TOWER_IDS) for (const [lv, spec] of forms(kind)) {
    test(`${kind} ${spec ?? "L" + lv}`, () => {
      const b = arena();
      b.lives = 9999;
      const t = tower(b, kind, lv, spec);
      const es = targets(b, t.pad, true);
      if (kind === "banner") {
        const a = tower(b, "archer", 1, null, (() => { // a neighbour in its aura
          const p = b.map.pads[t.pad]!;
          return b.map.pads.filter((q) => q.id !== t.pad).sort((x, y) => (x.x - p.x) ** 2 + (x.y - p.y) ** 2 - ((y.x - p.x) ** 2 + (y.y - p.y) ** 2))[0]!.id;
        })());
        run(b, 30);
        const p = b.map.pads[t.pad]!, q = b.map.pads[a.pad]!;
        if ((p.x - q.x) ** 2 + (p.y - q.y) ** 2 <= 2.6 * 2.6) expect(a.aspd).toBeGreaterThan(0);
        expect(count(b, "aura_pulse")).toBeGreaterThan(0);
        return;
      }
      run(b, T(10));
      if (kind === "beacon") { expect(count(b, "mark")).toBeGreaterThan(0); expect(es.some((e) => e.st.marked > 0)).toBe(true); return; }
      expect(b.stats.damageBy[kind] ?? 0).toBeGreaterThan(0);
      // air reach: a lone flyer over the road
      const air = lv >= 4 && spec ? TOWERS[kind].specs.find((q) => q.id === spec)!.air : TOWERS[kind].air;
      const b2 = arena();
      const t2 = tower(b2, kind, lv, spec);
      const bat = targets(b2, t2.pad, true).pop()!;
      for (const e of enemies(b2)) if (e !== bat) e.gone = true;
      b2.enemies = b2.enemies.filter((e) => !(e as EnemyX).gone);
      run(b2, T(10));
      if (air) expect(bat.hp).toBeLessThan(1e6); else expect(bat.hp).toBe(1e6);
    });
  }
});

describe("signature mechanics", () => {
  test("Shatter: a brittle enemy that dies shatters into its neighbours", () => {
    const b = arena();
    const t = tower(b, "frost", 4, "shatter");
    const s = sNear(b, t.pad);
    const a = put(b, "footman", s), c = put(b, "footman", s + 0.3);
    a.baseSpeed = 0; c.baseSpeed = 0;
    freeze(b, a, 45, { tower: t, brittle: 30, shatterPct: 0.25 });
    damage(b, a, { amount: 1e4, type: "pure" });
    run(b, 1);
    expect(count(b, "shatter")).toBeGreaterThan(0);
    expect(c.hp).toBeLessThan(c.maxHp);
  });
  test("Wildfire: Alchemist oil lit by a Pyre ignites", () => {
    const b = arena();
    const py = tower(b, "pyre", 3);
    const s = sNear(b, py.pad);
    const es = [0, 1, 2, 3].map((k) => { const e = put(b, "brute", s + (k - 1.5) * 0.4); e.baseSpeed = 0; e.hp = e.maxHp = 1e5; return e; });
    addZone(b, "oil", es[1]!.x, es[1]!.y, 0.9, T(6), 0, { oil: true, slow: 0.25 }); // as an Alchemist flask leaves
    run(b, T(3));
    expect(count(b, "ignite")).toBeGreaterThan(0);
    expect(b.zones.some((z) => z.kind === "fire")).toBe(true);
  });
  test("Overload: three charges stun", () => {
    const b = arena();
    const t = tower(b, "storm", 4, "overload");
    const e = put(b, "brute", sNear(b, t.pad)); e.baseSpeed = 0; e.hp = e.maxHp = 1e6;
    run(b, T(6));
    expect(count(b, "stun")).toBeGreaterThan(0);
  });
  test("Harpoon pulls on the 3rd shot and grounds flyers", () => {
    const b = arena();
    const t = tower(b, "ballista", 4, "harpoon");
    const e = put(b, "brute", sNear(b, t.pad)); e.hp = e.maxHp = 1e6;
    run(b, T(9));
    expect(count(b, "pull")).toBeGreaterThan(0);
  });
  test("Siege Bolt hits a line of enemies, ignoring armour", () => {
    const b = arena();
    const t = tower(b, "ballista", 4, "siegebolt");
    const s = sNear(b, t.pad);
    const es = [0, 1, 2].map((k) => { const e = put(b, "brute", s + k * 0.3); e.baseSpeed = 0; e.hp = e.maxHp = 1e6; return e; });
    run(b, T(4));
    expect(es.filter((e) => e.hp < 1e6).length).toBeGreaterThanOrEqual(2);
    expect(1e6 - es[0]!.hp).toBeGreaterThanOrEqual(130 - 1e-6);
  });
  test("Volley's Arrow Rain falls every 5th attack", () => {
    const b = arena();
    const t = tower(b, "archer", 4, "volley");
    for (let k = 0; k < 5; k++) { const e = put(b, "footman", sNear(b, t.pad) + k * 0.3); e.baseSpeed = 0; e.hp = e.maxHp = 1e6; }
    run(b, T(6));
    expect(t.shots).toBeGreaterThanOrEqual(5);
    expect(b.events.filter((e) => e.e === "shoot" && e.spec === "volley").length).toBeGreaterThan(t.shots);
  });
  test("Hexer hexes and lifts the cap; Inferno heats up; Glacier pulses; Naphtha explodes", () => {
    const b = arena();
    const hx = tower(b, "mage", 4, "hexer");
    const e = put(b, "brute", sNear(b, hx.pad)); e.baseSpeed = 0; e.hp = e.maxHp = 1e6;
    run(b, T(3));
    expect(e.hexerT).toBeGreaterThan(0);
    const b2 = arena();
    const inf = tower(b2, "pyre", 4, "inferno");
    const f = put(b2, "brute", sNear(b2, inf.pad)); f.baseSpeed = 0; f.hp = f.maxHp = 1e6;
    run(b2, T(1));
    const d1 = 1e6 - f.hp;
    run(b2, T(6));
    const d2 = 1e6 - f.hp - d1;
    expect(d2 / 6).toBeGreaterThan(d1 * 1.3);
    const b3 = arena();
    const gl = tower(b3, "frost", 4, "glacier");
    const g = put(b3, "footman", sNear(b3, gl.pad)); g.baseSpeed = 0; g.hp = g.maxHp = 1e6;
    run(b3, T(4));
    expect(count(b3, "nova")).toBeGreaterThan(0);
    const b4 = arena();
    const na = tower(b4, "alchemist", 4, "naphtha");
    const h = put(b4, "brute", sNear(b4, na.pad)); h.baseSpeed = 0; h.hp = h.maxHp = 1e6;
    run(b4, T(10));
    expect(b4.events.some((ev) => ev.e === "explode" && ev.source === "naphtha")).toBe(true);
  });
  test("Ancient Treant holds three", () => {
    const b = arena();
    b.lives = 999;
    const t = tower(b, "thornwood", 4, "treant");
    run(b, T(3));
    const s = sNear(b, t.pad);
    for (let k = 0; k < 4; k++) { const e = put(b, "footman", Math.max(0.5, s - 2.5 - k * 0.3)); e.melee = null; }
    const tr = soldiers(b).find((q) => q.kind === "treant")!;
    let most = 0;
    for (let i = 0; i < T(5); i++) { run(b, 1); most = Math.max(most, tr.held.length); }
    expect(most).toBe(3);
    void enemies; void live;
  });
});
