// Commander spells (systems 11, content 7.2, R2/R11/R16) and war supplies (R20).
import type { Battle, Command, SpellId, SpellState } from "../types.ts";
import { ACTS } from "../content/battle/acts.ts";
import { COMMANDER_SPELLS, SPELLS, SPELL_NUM as S, SUPPLY_NUM as U } from "../content/battle/spells.ts";
import { has } from "./mods.ts";
import { laneNearest } from "../map.ts";
import { T, X, alive, d2, emit, enemies, hittable, towers, zones, type EnemyX } from "./internal.ts";
import { damage, freeze, numb, root, slow, stun, stunExact } from "./damage.ts";
import { dropReinforcements, snapToRoad } from "./soldiers.ts";
import { addZone, spellProjectile } from "./towers.ts";
import { lightZone } from "./statuses.ts";
import { upgradeTower } from "./commands.ts";

type R = { ok: boolean; reason?: string };

export function initSpells(b: Battle): SpellState[] {
  const [q, w] = COMMANDER_SPELLS[b.loadout.commander];
  return [q, w].map((id, i) => {
    const d = SPELLS[id];
    const total = T(d.cooldown);
    return { id, key: i ? "W" : "Q", cooldown: Math.round(total / 2), total, aim: d.aim, radius: d.radius, casts: 0 } as SpellState;
  });
}

export function tickSpells(b: Battle) {
  const x = X(b);
  for (const s of b.spells) if (s.cooldown > 0) {
    s.cooldown = Math.max(0, s.cooldown - x.mods.spellRate);
    if (s.cooldown === 0) emit(b, 0, 0, { e: "spell_ready", spell: s.id });
  }
  if (x.rallyT > 0) x.rallyT--;
  if (x.hornT > 0) x.hornT--;
  if (x.stormT > 0) x.stormT--;
  if (x.flareT > 0) { x.flareT--; for (const e of enemies(b)) if (e.stealth && alive(e)) e.st.revealed = Math.max(e.st.revealed, 2); }
  for (let i = x.echoQ.length - 1; i >= 0; i--) {
    const q = x.echoQ[i]!;
    if (b.tick < q.tick) continue;
    x.echoQ.splice(i, 1);
    effect(b, q.spell as SpellId, q.x, q.y, undefined, S.echoMul);
  }
}

/** Shorten both cooldowns by the seconds a call-early skipped (systems 11). */
export function skipCooldowns(b: Battle, ticks: number) {
  for (const s of b.spells) s.cooldown = Math.max(0, s.cooldown - ticks);
}

export function cast(b: Battle, c: Extract<Command, { t: "cast" }>): R {
  if (b.phase !== "running") return { ok: false, reason: b.phase === "setup" ? "Spells wait for the first wave." : "The battle is over." };
  const s = b.spells.find((q) => q.key === c.spell);
  if (!s) return { ok: false, reason: "No spell there." };
  if (s.cooldown > 0) return { ok: false, reason: "Not ready yet." };
  const x = X(b);
  const r = effect(b, s.id, c.x ?? 0, c.y ?? 0, c.tower, 1);
  if (!r.ok) return r;
  s.cooldown = s.total;
  s.casts++;
  b.stats.spellsCast++;
  if (b.bounty?.id === "old-ways") b.bounty.ok = false;
  if (has(x.mods, "echo-stone") && !x.echo) {
    x.echo = true;
    if (SPELLS[s.id].damage) x.echoQ.push({ tick: b.tick + T(S.echoDelay), spell: s.id, x: c.x ?? 0, y: c.y ?? 0 });
    else s.cooldown = Math.round(s.total / 2);
  }
  return r;
}

function effect(b: Battle, id: SpellId, x: number, y: number, tower: number | undefined, mul: number): R {
  const sm = ACTS[b.act].spellMul * mul;
  const d = SPELLS[id];
  const inR = (e: EnemyX, r: number) => d2(e.x, e.y, x, y) <= r * r;
  switch (id) {
    case "reinforcements": {
      const p = snapToRoad(b, x, y);
      if (!p) return { ok: false, reason: "Drop them on the road." };
      dropReinforcements(b, p, 2, S.reinfHp * sm, S.reinfArmour, S.reinfDmg * sm, T(S.reinfS));
      x = p.x; y = p.y;
      break;
    }
    case "meteor": spellProjectile(b, "meteor", x, y, S.meteorDmg * sm, d.radius, T(S.meteorDelay), S.meteorBurn * sm); break;
    case "firebomb": {
      const z = addZone(b, "oil", x, y, d.radius, T(S.firebombS), 0, { oil: true, slow: 0.25 });
      for (const e of enemies(b)) if (hittable(e) && inR(e, d.radius)) {
        if (!e.air) e.st.oiled = Math.max(e.st.oiled, T(4));
        damage(b, e, { amount: S.firebombDmg * sm * (e.air ? S.airMul : 1), type: "fire", area: true, by: -1 });
      }
      lightZone(b, z);
      z.ticks = T(S.firebombS); z.total = z.ticks;
      break;
    }
    case "tarpit": addZone(b, "tar", x, y, d.radius, T(S.tarS), 0, { oil: true, slow: S.tarSlow / 100, tarBoss: S.tarBossSlow / 100 }); break;
    case "stillness":
      for (const e of enemies(b)) {
        if (!hittable(e)) continue;
        if (e.kind === "colossus") continue;
        if (e.boss) numb(b, e, T(S.stillS));
        else forceFreeze(b, e, e.elite ? T(S.stillElite) : T(S.stillS));
      }
      break;
    case "judgement": {
      let best: EnemyX | null = null;
      for (const e of enemies(b)) if (hittable(e) && (!best || e.hp + e.shield > best.hp + best.shield)) best = e;
      if (!best) return { ok: false, reason: "No target." };
      x = best.x; y = best.y;
      damage(b, best, { amount: S.judgeDmg * sm, type: "pure", by: -1 });
      if (alive(best)) stunExact(b, best, best.boss ? T(S.judgeBossStun) : T(S.judgeStun));
      break;
    }
    case "requisition": {
      const t = towers(b).find((q) => q.id === tower);
      if (!t) return { ok: false, reason: "Choose a tower." };
      if (t.level >= 3) return { ok: false, reason: "Already at its last level." };
      const r = upgradeTower(b, t, -0.5);
      if (!r.ok) return r;
      x = t.x; y = t.y;
      break;
    }
    case "rally": X(b).rallyT = T(S.rallyS); break;
    case "barrier": {
      const p = snapToRoad(b, x, y);
      if (!p) return { ok: false, reason: "Put it on the road." };
      x = p.x; y = p.y;
      const ls = b.map.lanes.map((l) => { const n = laneNearest(l, x, y); return n.d < 1.0 ? n.s : -1; });
      addZone(b, "barrier", x, y, d.radius, T(S.barrierS), 0, { ls });
      break;
    }
    case "bramblesurge":
      for (const e of enemies(b)) {
        if (!hittable(e) || !inR(e, d.radius)) continue;
        damage(b, e, { amount: S.surgeDmg * sm * (e.air ? S.airMul : 1), type: "phys", area: true, by: -1 });
        if (!alive(e) || e.air) continue;
        if (e.boss || e.kind === "juggernaut") slow(e, S.surgeSlow / 100, T(S.surgeRoot));
        else root(b, e, T(S.surgeRoot));
      }
      break;
  }
  emit(b, x, y, { e: "spell_cast", spell: id, r: d.radius });
  return { ok: true };
}

/** Stillness / Frost Flask: freeze ignoring the meter (respects Thawing), elites included. */
function forceFreeze(b: Battle, e: EnemyX, ticks: number) {
  if (e.st.thaw > 0 || e.st.stunImmune > 0 || e.noChill) return;
  const was = e.elite;
  e.elite = false;
  freeze(b, e, ticks);
  e.elite = was;
}

// ---------------------------------------------------------------- war supplies (R20)
export function useSupply(b: Battle, c: Extract<Command, { t: "supply" }>): R {
  const x = X(b);
  const id = x.supplies[c.slot];
  if (!id) return { ok: false, reason: "That slot is empty." };
  if (b.phase === "won" || b.phase === "lost") return { ok: false, reason: "The battle is over." };
  const sm = ACTS[b.act].spellMul, gm = ACTS[b.act].bountyMul;
  let px = c.x ?? 0, py = c.y ?? 0, r = 0;
  switch (id) {
    case "oil-barrel": r = 1.2; addZone(b, "oil", px, py, r, T(U.oilS), 0, { oil: true, slow: 0.25 }); break;
    case "frost-flask":
      r = 1.5;
      for (const e of enemies(b)) if (hittable(e) && d2(e.x, e.y, px, py) <= r * r) { if (e.boss || e.elite) numb(b, e, T(U.flaskFreeze)); else forceFreeze(b, e, T(U.flaskFreeze)); }
      break;
    case "gold-cache": { const g = Math.round(U.gold * gm); b.gold += g; b.stats.goldEarned += g; emit(b, 0, 0, { e: "gold", amount: g, reason: "supply" }); break; }
    case "spike-trap": {
      const p = snapToRoad(b, px, py);
      if (!p) return { ok: false, reason: "Put it on the road." };
      px = p.x; py = p.y; r = 0.6;
      addZone(b, "spikes", px, py, r, T(U.spikeS), 0, { charges: U.spikeCount, dmg: U.spikeDmg * sm });
      break;
    }
    case "war-horn": x.hornT = T(U.hornS); break;
    case "masons-kit": for (const t of towers(b)) if (t.disabled > 0) { t.disabled = 0; emit(b, t.x, t.y, { e: "tower_enabled", tower: t.id, ticks: 0 }); } break;
    case "flare": x.flareT = T(U.flareS); for (const e of enemies(b)) if (e.stealth && alive(e)) { e.st.revealed = Math.max(e.st.revealed, 2); emit(b, e.x, e.y, { e: "reveal", id: e.id }); } break;
    case "heavy-bolt": {
      let best: EnemyX | null = null;
      for (const e of enemies(b)) if (hittable(e) && (!best || e.hp + e.shield > best.hp + best.shield)) best = e;
      if (!best) return { ok: false, reason: "No target." };
      px = best.x; py = best.y;
      damage(b, best, { amount: U.boltDmg * sm, type: "pure", by: -1 });
      break;
    }
    case "bell": for (const e of enemies(b)) if (hittable(e)) { if (e.boss) stunExact(b, e, T(0.4)); else stun(b, e, T(U.bellStun)); } break;
    case "lifeblood": b.lives = Math.min(Math.max(b.lives, b.loadout.maxLives), b.lives + U.lives); break;
  }
  x.supplies[c.slot] = null;
  b.supplies = [...x.supplies];
  emit(b, px, py, { e: "supply_used", supply: id, r });
  return { ok: true };
}

export { zones };
