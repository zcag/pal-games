// VFX and juice for the battle (design/art.md 3.5-3.9, 5). `createFx(stage)` registers the fx
// render systems on the stage and returns the knobs the lead wires:
//   fx.hitstop()   ms of hitstop left: skip sim steps while > 0 (the scene freezes, UI and audio go on)
//   fx.slowmo      sim time scale for boss phases and the battle's end (1 = normal)
//   fx.speed       set to the game speed (1/2/3): at 2x/3x only boss events hitstop, halved
//   fx.shakeScale  settings slider 0..1 (the stage's own shake must not scale again)
//   fx.numbers     damage numbers on/off
//   fx.coinTarget  () => {x, y} in viewport css px (the HUD gold counter) or null
//   fx.onCoin      (value) => void, called as each coin lands (tick + pulse the counter)
import type { Battle, BattleEvent, BattleMap, Theme } from "../../../game/types.ts";
import type { RenderSystem, Stage } from "../api.ts";
import { Ctx } from "./core.ts";
import { syncViewport } from "./gl/common.ts";
import { Dom } from "./dom.ts";
import { handleEvents, pulsed, type Hub } from "./events.ts";
import { Juice } from "./juice.ts";
import { bars, clearOverlays, drawOverlays } from "./overlays.ts";
import { budget, clearParticles, drawParticles, particleCount, reseed } from "./particles.ts";
import { drawProjectiles, resetProjectiles } from "./projectiles.ts";
import { drawAirRoute, drawFocus, drawTelegraphs, drawTowers, drawZones, sapped } from "./world.ts";

export { bodyFx } from "./overlays.ts";

export interface Fx {
  /** ms of hitstop left; the loop skips sim steps while > 0. */
  hitstop(): number;
  /** Sim time scale (slow motion on boss phase / victory / defeat). */
  readonly slowmo: number;
  speed: number;
  shakeScale: number;
  numbers: boolean;
  coinTarget: (() => { x: number; y: number } | null) | null;
  onCoin: ((value: number) => void) | null;
  /** Last frame's cost of the fx systems in ms (CPU), and live counts. */
  readonly stats: { ms: number; particles: number; timed: number; sprites: number; decals: number; lines: number };
  dispose(): void;
  /** Dev: batches with a NaN in this frame's instances. */
  findNaN(): string[];
}

export function createFx(stage: Stage): Fx {
  const c = new Ctx(stage);
  const dom = new Dom(stage);
  const juice = new Juice(stage);
  const post = (stage as Stage & { fx?: { red: number } }).fx;
  if (post && typeof post.red === "number") dom.post = post;
  const hub: Hub = { c, dom, juice };
  for (const o of c.objects()) stage.scene.add(o);
  stage.scene.add(bars.mesh);
  // the renderer's stage scales shake by its own setting: route the knob there so it is applied once
  const stageShake = typeof (stage as Stage & { shakeScale?: number }).shakeScale === "number";
  const stats = { ms: 0, particles: 0, timed: 0, sprites: 0, decals: 0, lines: 0 };
  let lastRT = -1;
  let slowAvg = 0;

  const sys: RenderSystem = {
    name: "fx",
    onMap(_s: Stage, map: BattleMap | null, theme: Theme) {
      c.setMap(map, theme);
      clearParticles(); clearOverlays(); resetProjectiles(); sapped.clear(); pulsed.clear();
      dom.clear(); juice.reset();
      reseed(map ? map.seed : 1);
    },
    onEvents(_s: Stage, evs: readonly BattleEvent[], b: Battle) {
      c.b = b;
      for (const ev of evs) if (ev.e === "sapper_plant") sapped.set(ev.tower, c.T);
      handleEvents(hub, evs, b);
    },
    update(_s: Stage, b: Battle | null, alpha: number, dt: number, t: number) {
      const t0 = performance.now();
      const vp = syncViewport(stage.renderer, t);
      c.vw = vp.w; c.vh = vp.h; c.ui = vp.ui;
      bars.uDpr.value = stage.renderer.getPixelRatio();
      const realDt = lastRT < 0 ? dt : Math.min(0.1, Math.max(0, t - lastRT));
      lastRT = t;
      juice.speed = c.speed;
      const scale = juice.tick(t, realDt);
      c.RT = t; c.dt = realDt * scale; c.T += c.dt;
      c.b = b; c.alpha = alpha;
      c.begin();
      if (b && c.map) {
        drawZones(c, b);
        drawTelegraphs(c, b);
        drawTowers(c, b);
        drawProjectiles(c, b);
        drawOverlays(c, b);
        drawAirRoute(c, b);
      } else { bars.begin(); bars.end(); }
      drawFocus(c, b);
      c.drawTimed();
      drawParticles(c.dt, c.under, c.over, c.body);
      c.end();
      dom.update(t, c.ui);
      const ms = performance.now() - t0;
      stats.ms = ms;
      // budget: thin the particles when the fx frame gets expensive (200 enemies at 3x)
      slowAvg = slowAvg * 0.95 + ms * 0.05;
      const crowd = Math.min(1, Math.max(0.35, 60 / Math.max(1, b?.enemies.length ?? 0)));
      budget.scale = Math.min(crowd, slowAvg > 3 ? 0.5 : slowAvg > 2 ? 0.75 : 1);
      stats.particles = particleCount(); stats.timed = c.liveCount();
      stats.sprites = c.under.n + c.over.n + c.body.n; stats.decals = c.ground.n; stats.lines = c.lines.n;
    },
  };
  stage.add(sys);

  const fx: Fx = {
    hitstop: () => juice.stopLeft(),
    get slowmo() { return juice.slowmo; },
    get speed() { return c.speed; }, set speed(v: number) { c.speed = v; },
    get shakeScale() { return stageShake ? (stage as Stage & { shakeScale: number }).shakeScale : juice.shakeScale; },
    set shakeScale(v: number) { if (stageShake) (stage as Stage & { shakeScale: number }).shakeScale = v; else juice.shakeScale = v; },
    get numbers() { return dom.numbers; }, set numbers(v: boolean) { dom.numbers = v; },
    get coinTarget() { return dom.coinTarget; }, set coinTarget(f) { dom.coinTarget = f; },
    get onCoin() { return dom.onCoin; }, set onCoin(f) { dom.onCoin = f; },
    stats,
    findNaN: () => [...c.findNaN(), ...(bars.n && hasNaN(bars) ? ["bars"] : [])],
    dispose() {
      for (const o of c.objects()) stage.scene.remove(o);
      stage.scene.remove(bars.mesh);
      dom.dispose();
    },
  };
  return fx;
}

function hasNaN(o: { mesh: { geometry: unknown } }): boolean {
  const g = o.mesh.geometry as { attributes: Record<string, { array: ArrayLike<number> }> };
  for (const a of Object.values(g.attributes)) for (let i = 0; i < a.array.length; i++) if (!Number.isFinite(a.array[i]!)) return true;
  return false;
}
