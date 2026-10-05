// Tick order step 3: status durations, DoTs, chill decay, immunity windows, zones.
import type { Battle } from "../types.ts";
import { ACTS } from "../content/battle/acts.ts";
import { bv, has, hasB } from "./mods.ts";
import {
  T, X, alive, d2, emit, enemies, hittable, towers, zones, synergy, type ZoneX,
} from "./internal.ts";
import { corrode, damage, mark, root, shred } from "./damage.ts";

const HARD = 30;

export function tickStatuses(b: Battle) {
  const m = X(b).mods;
  const act = ACTS[b.act];
  for (const e of enemies(b)) {
    if (!alive(e)) continue;
    const st = e.st;
    if (st.slowT > 0 && --st.slowT === 0) st.slow = 0;
    e.chillIdle++;
    if (st.chill > 0 && e.chillIdle > e.chillHold) st.chill = Math.max(0, st.chill - 20 / 30);
    if (st.frozen > 0) {
      if (--st.frozen === 0) { st.thaw = T(3); st.stunImmune = Math.max(st.stunImmune, HARD); emit(b, e.x, e.y, { e: "thaw", id: e.id }); }
    } else if (st.thaw > 0) st.thaw--;
    if (e.brittleT > 0 && --e.brittleT === 0) e.shatterPct = 0;
    if (st.numb > 0) st.numb--;
    // burn: ticks every 0.5 s
    if (st.burnT > 0) {
      st.burnT--;
      if (e.burns.length) { for (const q of e.burns) q.t--; e.burns = e.burns.filter((q) => q.t > 0); st.burnDps = e.burns.reduce((s, q) => s + q.dps, 0); }
      if (--e.burnAcc <= 0) {
        e.burnAcc = T(0.5);
        const tw = towers(b).find((t) => t.id === e.burnSrc) ?? null;
        const amt = st.burnDps * 0.5;
        damage(b, e, { amount: amt, type: "fire", tower: tw, area: true, dot: true, ignite: true });
        emit(b, e.x, e.y, { e: "burn_tick", id: e.id, amount: amt });
      }
      if (st.burnT <= 0) { st.burnDps = 0; e.burns.length = 0; e.scorchPct = 0; }
    }
    if (st.oiled > 0) st.oiled--;
    if (st.marked > 0 && --st.marked === 0) { st.markPct = 0; e.markBy = 0; }
    if (e.hexForever && st.hexed < 2) st.hexed = 2;
    if (st.hexed > 0 && --st.hexed === 0) st.hexPct = 0;
    if (e.hexerT > 0) e.hexerT--;
    if (st.shredT > 0 && --st.shredT === 0) { st.shred = 0; st.corrode = 0; }
    if (st.stun > 0) { if (--st.stun === 0) st.stunImmune = Math.max(st.stunImmune, HARD); }
    else if (st.stunImmune > 0) st.stunImmune--;
    if (st.root > 0) { if (--st.root === 0) { st.rootImmune = T(1.5); st.stunImmune = Math.max(st.stunImmune, HARD); e.rootPct = 0; } }
    else if (st.rootImmune > 0) st.rootImmune--;
    if (st.revealed > 0) st.revealed--;
    if (st.chargeT > 0 && --st.chargeT === 0) st.charges = 0;
    if (st.grounded > 0 && --st.grounded === 0 && !e.boss) { e.air = true; emit(b, e.x, e.y, { e: "grounded", id: e.id }); }
    if (st.warcry > 0) st.warcry--;
    if (e.howl > 0) e.howl--;
    // Regenerating affix: 2% a second after 2 s unhurt
    e.regenIdle++;
    if (e.affixes.includes("regenerating") && e.regenIdle > T(2) && st.hexed <= 0 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 / 30);
    // held: Thorn Collar and Deep Roots
    if (e.heldBy) {
      e.heldT++;
      if (has(m, "thorn-collar") && e.heldT % 15 === 0) damage(b, e, { amount: 5 * act.spellMul, type: "phys", area: false });
      if (has(m, "deep-roots") && e.heldT === T(3)) { e.st.revealed = Math.max(e.st.revealed, T(5)); mark(b, e, T(5), 10, null); }
    } else e.heldT = 0;
    if (e.pullT > 0) e.pullT--;
  }
  tickZones(b);
}

/** Light an oil puddle (fire patch; Naphtha explodes; touching puddles light next tick). */
export function lightZone(b: Battle, z: ZoneX) {
  if (z.lit || !z.oil) return;
  const m = X(b).mods;
  z.lit = true; z.oil = false; z.lightAt = -1;
  z.kind = "fire";
  z.dps = 20;
  const tw = towers(b).find((t) => t.id === z.from) ?? null;
  const fw = hasB(m, "alchemist", "firewalk");
  const extra = bv(m, "alchemist", "firewalk", 0, T(2));
  if (z.explosive) {
    emit(b, z.x, z.y, { e: "explode", r: 1.4, source: "naphtha", damage: 90 });
    for (const e of enemies(b)) if (hittable(e) && !e.air && d2(e.x, e.y, z.x, z.y) <= 1.4 * 1.4) damage(b, e, { amount: 90, type: "fire", tower: tw, area: true });
    z.dps = 25; z.ticks = T(4) + extra; z.total = z.ticks;
  } else {
    z.ticks = Math.max(z.ticks > 1e8 ? T(4) : z.ticks, T(3)) + extra;
    z.total = Math.max(z.total > 1e8 ? z.ticks : z.total, z.ticks);
  }
  emit(b, z.x, z.y, { e: "ignite", id: 0, puddle: true });
  synergy(b, "Wildfire", z.x, z.y);
  const reach = fw ? bv(m, "alchemist", "firewalk", 2.5, 3.5) : 0;
  for (const o of zones(b)) {
    if (o === z || !o.oil || o.lit || o.lightAt >= 0) continue;
    const dd = Math.sqrt(d2(o.x, o.y, z.x, z.y));
    if (dd <= o.r + z.r || dd <= reach) o.lightAt = b.tick + 1;
  }
}

function tickZones(b: Battle) {
  const x = X(b), m = x.mods, act = ACTS[b.act];
  const es = enemies(b);
  for (const e of es) e.zslow = 0;
  const zs = zones(b);
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i]!;
    if (z.lightAt >= 0 && b.tick >= z.lightAt) lightZone(b, z);
    const age = z.total - z.ticks;
    const tw = towers(b).find((t) => t.id === z.from) ?? null;
    const r2 = z.r * z.r;
    for (const e of es) {
      if (!hittable(e) || e.air) continue;
      if (d2(e.x, e.y, z.x, z.y) > r2) continue;
      const ez = e;
      switch (z.kind) {
        case "oil": case "acid": case "tar":
          if (z.oil) { ez.zslow = Math.max(ez.zslow, e.boss && z.kind === "tar" ? z.tarBoss : z.slow); e.st.oiled = Math.max(e.st.oiled, T(4)); }
          if (z.acid) {
            if (age % 15 === 0) damage(b, e, { amount: z.dps * 0.5, type: "magic", tower: tw, area: true });
            if (age % 30 === 0) { shred(e, 1, 10); corrode(e, 1, 10); synergy(b, "Sunder", e.x, e.y); }
          }
          if (tw && tw.kind === "alchemist" && !z.acid && hasB(m, "alchemist", "caustic-oil") && age % 45 === 0) {
            shred(e, 1); if (bv(m, "alchemist", "caustic-oil", 0, 1)) corrode(e, 1);
          }
          break;
        case "fire": case "burning":
          if (age % 15 === 0) damage(b, e, { amount: z.dps * 0.5, type: "fire", tower: tw, area: true });
          break;
        case "crater": ez.zslow = Math.max(ez.zslow, z.slow); break;
        case "spikes":
          if (!e.spikeHit.includes(z.id) && z.charges > 0) {
            e.spikeHit.push(z.id); z.charges--;
            damage(b, e, { amount: z.dmg, type: "phys", area: true, by: 0 });
            if (z.charges <= 0) z.ticks = 0;
          }
          break;
        case "bramble":
          if (z.roots && root(b, e, T(1.5))) { z.roots = false; z.ticks = 0; }
          break;
      }
    }
    // burning ground lights oil it touches
    if ((z.kind === "fire" || z.kind === "burning") && age === 0) for (const o of zs) if (o !== z && o.oil && !o.lit && o.lightAt < 0 && d2(o.x, o.y, z.x, z.y) <= (o.r + z.r) * (o.r + z.r)) o.lightAt = b.tick + 1;
    z.ticks--;
  }
  for (let i = zs.length - 1; i >= 0; i--) if (zs[i]!.ticks <= 0) {
    const z = zs[i]!;
    zs.splice(i, 1);
    for (const t of towers(b)) { const k = t.puddles.indexOf(z.id); if (k >= 0) t.puddles.splice(k, 1); }
  }
  void act;
}
