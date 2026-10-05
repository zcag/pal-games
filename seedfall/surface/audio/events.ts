// The one switch from GameEvent to sounds (design/audio.md section 11), with the coalescing rules of
// section 10: one blast instead of the breaks it caused, a tick's pickups as one run, one crunch per hit.
import { W, type GameEvent, type GameView } from "../../game/types.ts";
import { clamp } from "./kit.ts";
import type { Graph } from "./graph.ts";
import type { Lookup } from "./content.ts";
import type { Drill } from "./drill.ts";
import type { PodSounds } from "./pod.ts";
import type { WorldSounds } from "./world.ts";
import type { Town } from "./town.ts";
import type { Finds } from "./finds.ts";
import type { Music } from "./music.ts";
import { songFor } from "./score.ts";

export interface Parts { g: Graph; look: Lookup; drill: Drill; pod: PodSounds; world: WorldSounds; town: Town; finds: Finds; music: Music }

/** Never retrigger the same stinger, fanfare or chord within 10 s of itself (section 8.6). */
export class Guard {
  private last = new Map<string, number>();
  ok(key: string, now: number, gap = 10) {
    const t = this.last.get(key);
    if (t !== undefined && now - t < gap) return false;
    this.last.set(key, now);
    return true;
  }
}

export function dispatch(p: Parts, evs: readonly GameEvent[], view: GameView, guard: Guard, planet: string) {
  if (!evs.length) return;
  const pod = view.pod, now = p.g.now;
  const pan = (x: number) => clamp((x - pod.x) / 8, -0.8, 0.8);
  // Look-ahead over the tick: blasts, impacts, first finds.
  const blast = evs.some((e) => e.t === "explode");
  const impact = evs.some((e) => (e.t === "land" || e.t === "bump") && e.damage > 0);
  const podHit = evs.some((e) => e.t === "damage");
  const firsts = new Set<number>();
  for (const e of evs) if (e.t === "find" && e.first && p.look.find(e.find)?.kind === "ore") firsts.add(e.find);
  let breaks = 0;
  // Pickups in one tick become one run.
  const picks = evs.filter((e): e is Extract<GameEvent, { t: "pickup" }> => e.t === "pickup");
  if (picks.length) {
    const best = picks.reduce((a, b) => ((p.look.find(b.find)?.tier ?? 1) > (p.look.find(a.find)?.tier ?? 1) ? b : a));
    const tier = p.look.find(best.find)?.tier ?? 1, count = picks.reduce((n, e) => n + Math.max(1, e.count), 0);
    p.finds.pickup(tier, count, pan(best.x), picks.some((e) => firsts.has(e.find)));
  }

  for (const e of evs) {
    switch (e.t) {
      case "dig_start": p.drill.start(e.mat, e.find, view.levels.drill ?? 0); break;
      case "dig_cancel": p.drill.cancel(); break;
      case "break":
        if (e.by === "blast" || (blast && e.by !== "drill")) break;
        if (e.by === "fall") { p.world.fallLand(e.x + 0.5, e.y + 0.5, pod); break; }
        if (breaks++ < 2) p.drill.brk(e.mat, pan(e.x + 0.5), e.by);
        break;
      case "too_hard": case "unbreakable": p.drill.clank(e.t, pan(e.x + 0.5) || (pod.facing * 0.4)); break;
      case "pickup": break; // above
      case "cargo_full": p.finds.cargoFull(); break;
      case "nugget": p.finds.nugget(pan(e.x)); break;
      case "land": p.pod.land(e.speed, e.damage, e.damage / Math.max(1, pod.hullMax)); break;
      case "bump": p.pod.bump(e.speed, e.damage, e.damage / Math.max(1, pod.hullMax)); break;
      case "damage":
        // The rules' sources: bump, fall (impacts), gas, dynamite, charge (blasts: the boom covers them), boulder, arc,
        // and the continuous ones every tick: lava (drives the sizzle's 400 ms repeat), heat and spores (silent drips).
        if (/impact|fall|land|bump|crash/i.test(e.source)) { if (!impact) p.pod.crunch(e.frac); }
        else if (/lava/i.test(e.source)) p.world.lavaTouch();
        else if (/heat|spore|cloud/i.test(e.source)) break;
        else if (!/blast|explo|gas|dynamite|charge/i.test(e.source)) p.pod.hazardHit(e.source, e.frac, p.world);
        break;
      case "wreck": p.pod.wreck(); break;
      case "rescue": p.pod.rescue(e.kind); break;
      case "gas_fuse": p.world.gasFuse(e.x + 0.5, e.y + 0.5, 0.8 * Math.pow(Math.max(1, pod.load), 0.25), pod); break;
      case "explode": p.world.explode(e.x, e.y, e.kind, pod, podHit); break;
      case "wobble": p.world.wobble(e.x + 0.5, e.y + 0.5, pod); break;
      case "fall_land": p.world.fallLand(e.x + 0.5, e.y + 0.5, pod); break;
      case "lava_touch": p.world.lavaTouch(); break;
      case "spore": p.world.spore(e.x + 0.5, e.y + 0.5, pod); break;
      case "spore_charge": p.world.sporeCharge(e.x + 0.5, e.y + 0.5, pod); break;
      case "arc": p.world.arc(e.x1 + 0.5, e.y1 + 0.5, e.x2 + 0.5, e.y2 + 0.5, e.phase, pod); break;
      case "pulse": {
        const b = view.world.biome[clamp(Math.floor(pod.y), 0, view.world.biome.length / W - 1) * W + clamp(Math.floor(pod.x), 0, W - 1)] ?? 0;
        p.music.onPulse(p.world.pulse(pod, b));
        break;
      }
      // r 0: a Ferrum storm swallowed the pulse (the rules emit that instead of a refusal sound).
      case "scan": if (e.r <= 0) p.pod.scanBlind(); else p.pod.scan(e.x, e.y, e.r, view, !!(e as { passive?: boolean }).passive); break;
      case "item":
        if (!e.ok) { p.town.deny(); break; }
        if (/dynamite/i.test(e.item)) p.world.fuse("dynamite");
        else if (/charge/i.test(e.item)) p.world.fuse("charge");
        else p.town.item(e.item);
        break;
      case "teleport": p.pod.teleport(e.phase); break;
      case "lift": p.pod.liftEvent(e.phase, pod); break;
      case "biome":
        p.music.startSuite();
        if (e.first && guard.ok(`stinger${e.biome}`, now)) p.music.stinger(songFor(e.biome, planet), p.g.bus.ui);
        break;
      case "record": p.finds.record(); break;
      case "surface":
        p.g.surfaceTransition(true);
        p.music.startSuite();
        if (guard.ok("home", now, 4)) p.town.homeSting();
        break;
      case "dive": p.g.surfaceTransition(false); break;
      // Home 3 with no way up at all is "sealed in" (the rules give it the same level).
      case "warn": p.pod.warnEvent(e.what, e.what === "home" && e.level === 3 && pod.fuelHome === Infinity ? 4 : e.level); break;
      case "cache": p.world.cache(e.x + 0.5, e.y + 0.5, pod); break;
      case "order": if (e.done) p.town.buy(); break;
      case "dock": p.town.dock(e.sale); break;
      case "buy": if (e.tierUp) { if (guard.ok("tierUp", now, 1.5)) p.town.tierUp(); } else p.town.buy(); break;
      case "find": {
        const f = p.look.find(e.find);
        if (f?.kind === "jackpot") p.finds.jackpot(f.tier || 8);
        else if (f?.kind === "artifact" && guard.ok(`artifact`, now)) p.finds.artifact();
        break;
      }
      case "achievement": if (guard.ok(`ach`, now, 3)) p.town.achievement(); break;
      case "toast": p.town.toast(e.tone ?? "good"); break;
      case "launch": {
        const ph = e.phase.toLowerCase();
        if (ph.includes("wake")) p.world.launchSwell(true);
        if (ph.includes("observ") || ph.includes("choose") || ph.includes("done") || ph.includes("end")) p.world.launchSwell(false);
        if (ph.startsWith("shard")) {
          const n = Math.min(40, Math.max(1, (e as { count?: number }).count ?? (ph === "shard" ? 1 : 12)));
          for (let i = 0; i < n; i++) p.music.shard(p.g.bus.ui, i, now + i * 0.05);
        } else p.music.launchCue(ph, p.g.bus.music, p.g.bus.fx);
        break;
      }
    }
  }
}
