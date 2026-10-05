# Seedfall: architecture and file ownership (build phase)

Several agents build in parallel. **Each owns files exclusively**; never edit a
file another agent owns. If you need a change in someone else's file, write
it in your final report (the lead relays it) and work around it meanwhile
(an adapter in your own files).

Read first: `DESIGN.md` (decisions win), the part docs in `design/`, and the
shared contracts `src/game/types.ts` and `src/surface/view.ts` (owned by the
lead; add a field by asking, never rename).

## Tooling

- bun + Vite + TypeScript (strict). `bun run check` (tsc), `bun test`,
  `bun run dev` (vite on 0.0.0.0:5277; the host is `hornet`, so
  `http://hornet:5277/`), `bun run build` (single self-contained
  `dist/index.html` via vite-plugin-singlefile).
- Headless captures: `bun scripts/shot.ts --url ... --w 720 --h 390 --out
  shots-tmp/x.png [--save save.json] [--eval js] [--keys k:ms,...] [--fps]`
  (playwright-core, Chromium with `--mute-audio`). Never make sound; run one
  capture at a time; never open a visible browser window.
- No runtime dependencies unless the lead agrees. No external assets: all art
  and audio are generated in code. No `prefers-reduced-motion` handling,
  ever.
- Commit your own files in small logical commits with concise messages
  (`git add <your files>`; never `git add -A`, others are working in the same
  tree). No co-author lines. Never push.

## Modules and owners

| Area | Owner | Files |
| --- | --- | --- |
| Shared contracts, integration, main loop, input, camera, `index.html` | lead | `src/game/types.ts`, `src/surface/view.ts`, `src/surface/main.ts`, `src/surface/input.ts`, `src/surface/camera.ts`, `index.html`, `vite.config.ts`, `package.json` |
| World content and generation | world agent | `src/game/content/world.ts` (biomes, materials, finds: ores, jackpots, artifacts, caches; temperature curve; planets' world changes), `src/game/gen.ts`, `test/gen.test.ts`, `scripts/map.ts` (renders a generated world to PNG for checking) |
| Rules and sim | rules agent | `src/game/content/economy.ts` (prices, upgrades, items, modules, research, perks, achievements, orders), `src/game/world.ts` (the live world: tile edits, falling, lava, gas, hazards' timers), `src/game/pod.ts`, `src/game/game.ts` (`Game implements GameView`, the step, events, the town and shop actions), `src/game/meta.ts` (research, prestige, achievements, log, daily, offline), `src/game/save.ts`, `test/rules*.test.ts` |
| Renderer and lighting | render agent | `src/surface/render/**` (WebGL2 pipeline, terrain shader, light grids, dynamic lights, sky and parallax, town buildings, sprite atlas incl. the pod and its tiers, entities, particle drawing, bloom, tone map, grade, post) |
| VFX and juice | fx agent | `src/surface/fx/**` (particle simulation and emitters per event, ambient particles per biome, camera shake and hitstop, dynamic lights from effects, PostFx drive, world-space floating labels' data) |
| UI and screens | ui agent | `src/surface/ui/**`, `src/surface/style.css` (HUD, depth gauge, minimap, hotbar, toasts, the depot card and sell count-up, workshop with modules, supply, lab tree, rig office, launch site and perks, log, achievements, settings, offline card, title cards, launch overlay, pause) |
| Audio | audio agent | `src/surface/audio/**` (per `design/audio.md`) |
| Economy simulator and bot | economy agent | `src/game/bot.ts`, `scripts/economy.ts`, `test/bot.test.ts` |
| Storage | lead | `src/surface/storage.ts` (the only place that touches localStorage) |

## Contracts

- `src/game/` has **no DOM, no WebGL, no Date.now / Math.random**: time
  comes in through `step(dt)` and an explicit `now` for offline progress;
  randomness through `src/game/rng.ts` seeded streams. Fixed step 1/60 s.
- `Game` implements `GameView` (types.ts). Each `step(dt, input)` returns the
  `GameEvent[]` of that step; the surface fans them out to fx, audio and ui.
- Surface frame order (main.ts): input -> `game.step` (fixed steps,
  accumulator) -> events to fx/audio/ui -> camera -> `fx.update` (particles,
  lights, shake, PostFx) -> `renderer.frame(game, camera, fx)` -> `ui.update`.
- The renderer owns the canvas size and sets `camera.tilePx`, `w`, `h`; the
  camera position is the lead's (spring + lead + shake from fx).
- World-space labels (e.g. "+3 Iron", "Too hard. Drill 7 needed.") are HTML,
  positioned by the UI with `worldToScreen`.
- Saves: `game.save()` returns a JSON-safe object with `v` (version);
  `Game.load(obj, now)` migrates older versions and applies offline progress.
  Storage goes through `src/surface/storage.ts` only.
- Debug hooks: in dev and in captures, `window.seedfall` exposes the game,
  `teleport(x, y)`, `give(cash)`, `set(stat, level)`, `reveal()`, and
  `pause()`, so captures can stage any biome.
