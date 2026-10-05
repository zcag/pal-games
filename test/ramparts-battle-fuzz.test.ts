// Fuzz: random commands, every tower kind, many seeds and acts; step() must never throw.
import { describe, expect, test } from "bun:test";
import type { Act, BattleKind, BossId, CommanderId, SpecId, SupplyId, TowerId } from "../ramparts/game/types.ts";
import { Rng } from "../ramparts/game/rng.ts";
import { newBattle, step, command } from "../ramparts/game/battle/index.ts";
import { TOWERS, TOWER_IDS } from "../ramparts/game/content/battle/towers.ts";
import { loadout } from "../ramparts/game/battle/testkit.ts";

const CMD: CommanderId[] = ["marshal", "alchemist", "seer", "quartermaster", "warden"];
const SUP: SupplyId[] = ["oil-barrel", "frost-flask", "gold-cache", "spike-trap", "war-horn", "masons-kit", "flare", "heavy-bolt", "bell", "lifeblood"];
const RELICS = ["snowglobe", "black-ice", "tidewater-vial", "wildfire-crown", "deadeyes-oath", "overclock", "crowded-banners", "twin-crests", "echo-stone", "prism-lens", "old-oak-seed", "thorn-collar", "long-fuse", "armourers-awl", "cold-iron", "dragonglass", "bubbling-retort", "spyglass"];
const BOONS = ["glass-arrows", "pitch-arrows", "twin-shot", "bait", "fourth-soldier", "shield-wall", "curse-engine", "arc-splinter", "oilshot", "shatterfall", "concussive-shells", "glass-bones", "splinter", "endless-winter", "firewalk", "twin-flasks", "cinder-rain", "scorching", "seeking-sparks", "grounding", "spreading-mark", "hunters-moon", "searchlight", "field-forge", "brave-hearts", "spear-of-dawn", "twin-bolts", "pinning-bolts", "heartwood-bond", "strangling-roots", "thick-briars"];

function fuzz(seed: number, ticks: number) {
  const r = new Rng(seed);
  const act = (1 + (seed % 4)) as Act;
  const kind: BattleKind = (["battle", "elite", "boss"] as const)[seed % 3]!;
  const boss: BossId | undefined = kind === "boss" ? r.pick(({ 1: ["gorrak", "hivequeen"], 2: ["wyrm", "lich"], 3: ["colossus", "packlord"], 4: ["tyrant"] } as Record<Act, BossId[]>)[act]) : undefined;
  const b = newBattle({
    seed, act, kind, floor: 1 + (seed % 5), boss,
    loadout: loadout({
      commander: r.pick(CMD), towers: r.shuffle([...TOWER_IDS]).slice(0, 6), lives: 999, maxLives: 999,
      relics: RELICS.filter(() => r.chance(0.3)), boons: BOONS.filter(() => r.chance(0.3)), tempered: BOONS.filter(() => r.chance(0.1)),
      supplies: [r.pick(SUP), r.pick(SUP)], ascension: r.int(0, 10),
    }),
    quiet: r.chance(0.5),
  });
  b.gold += 3000;
  command(b, { t: "call" });
  for (let i = 0; i < ticks && (b.phase === "running" || b.phase === "lost"); i++) {
    if (r.chance(0.05)) {
      const pad = r.pick(b.map.pads);
      const t = b.towers.length ? r.pick(b.towers) : null;
      switch (r.int(0, 9)) {
        case 0: command(b, { t: "build", pad: pad.id, tower: r.pick(b.loadout.towers) }); break;
        case 1: if (t) command(b, { t: "upgrade", tower: t.id }); break;
        case 2: if (t) command(b, { t: "specialise", tower: t.id, spec: r.pick(TOWERS[t.kind].specs).id as SpecId }); break;
        case 3: if (t && r.chance(0.2)) command(b, { t: "sell", tower: t.id }); break;
        case 4: command(b, { t: "call" }); break;
        case 5: command(b, { t: "cast", spell: r.pick(["Q", "W"] as const), x: r.range(0, 32), y: r.range(0, 18), tower: t?.id }); break;
        case 6: command(b, { t: "supply", slot: r.int(0, 1), x: r.range(0, 32), y: r.range(0, 18) }); break;
        case 7: if (t) command(b, { t: "rally", tower: t.id, x: r.range(0, 32), y: r.range(0, 18) }); break;
        case 8: if (t) command(b, { t: "mode", tower: t.id, mode: r.pick(["first", "strong", "last"] as const) }); break;
        case 9: command(b, { t: "clear", pad: pad.id }); break;
      }
    }
    step(b);
    if (b.events.length > 5000) b.events.length = 0;
  }
  return b;
}

// Seeds 1-12 cover every act and battle kind (seed % 4, seed % 3), four seeds a test;
// `bun ramparts/scripts/sweep.ts` runs 120.
const SEEDS = process.env.RAMPARTS_SWEEP === "1" ? 120 : 12;

describe("fuzz", () => {
  for (let a = 1; a <= SEEDS; a += 4) {
    test(`random commands over seeds ${a}-${a + 3} never throw`, () => {
      for (let s = a; s <= a + 3; s++) {
        try { fuzz(s, 4000); } catch (e) { throw new Error(`seed ${s}: ${(e as Error).stack}`); }
      }
      expect(true).toBe(true);
    }, 300000);
  }
});
void ([] as TowerId[]);
