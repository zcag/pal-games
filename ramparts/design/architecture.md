# Ramparts: architecture and ownership (lead's file)

## Layers
- `game/` pure rules. No DOM, no three, no Date/Math.random/performance. Deterministic from a seed.
  Runs in bun (tests, sim, bot) and in the page.
  - `rng.ts` seeded Rng (done).
  - `types.ts` THE CONTRACT: ids, content shapes, battle state, run state, events. Lead owns; changes go through the lead.
  - `content/*.ts` data tables (towers, enemies, relics, boons, events, commanders, acts, ascensions, spells).
  - `map.ts` battle map generation (terrain kind per tile, path polylines, pads, decor slots, water).
  - `waves.ts` wave generation from a threat budget.
  - `battle.ts` the 30 Hz battle sim: `newBattle(...)`, `step(b)`, commands (`build`, `upgrade`, `specialise`, `sell`, `callWave`, `cast`, `setTarget`, `rally`).
  - `run.ts` run state: act map generation, node resolution, rewards, shop, events, rest, forge.
  - `meta.ts` profile: renown, unlocks, ascension, codex, history. Pure; persisted by the surface through `surface/storage.ts`.
  - `bot.ts` player-like bot (battle + run decisions) used by `scripts/sim.ts`.
- `surface/` the page. Reads game state, never mutates it except through the commands.
  - `main.ts` app shell + screen state machine + game loop (fixed step accumulator, speed 1/2/3x, pause, hitstop).
  - `render/` three.js: `scene.ts` (renderer, camera fit, lights, post), `world.ts` (terrain, path, pads, water, props, per-act
    atmosphere), `models/` (towers, enemies, soldiers, props geometry), `units.ts` (instanced enemies/soldiers synced to state),
    `towers.ts` (tower objects synced to state, build/upgrade animation), `fx/` (projectiles, particles, flashes, rings, decals).
  - `ui/` DOM overlay: `hud.ts`, `radial.ts` (build/upgrade menu), `screens/*.ts` (title, commander, map, reward, shop, event,
    rest, forge, codex, settings, death, victory), `icons.ts` (procedural SVG glyphs), `style.css`.
  - `audio/` WebAudio synth: `index.ts` (facade), `music.ts`, `sfx.ts`.
  - `storage.ts` the only persistence (done; in pal, the extension's storage, synced by pal.json's rules).

## Conventions
- World units = tiles. Map is W x H tiles (x right, y down in game; three uses x right, z = game y, y up).
- Time in seconds; sim step DT = 1/30. Speeds in tiles/s. Angles in radians.
- Every entity has a numeric `id` unique within a battle (monotonic). The surface keys its objects by id.
- The sim appends to `battle.events` during a step; the surface drains it each frame (`events.length = 0` after reading).
  Events carry positions so the surface never has to look up dead entities.
- Interpolation: entities keep `px, py` (previous step position) so the renderer lerps by the accumulator alpha.
- Content ids are string literal unions (`TowerId`, `EnemyId`, `RelicId`...). Display text lives with the content.
- No file is edited by two agents. Ownership is listed per build agent in its brief.

## Build phase ownership (no file is edited by two agents)
| Agent | Owns |
| --- | --- |
| lead | `game/types.ts`, `surface/render/api.ts`, `surface/main.ts`, `surface/index.html`, `surface/app/**` (glue, game loop, input routing), DESIGN.md, design/architecture.md, README.md |
| doc sweep | `design/systems.md`, `design/run-meta.md`, `design/content.md`, `design/art.md` (bring in line with DESIGN.md Revision 1) |
| battle rules | `game/battle/**`, `game/map.ts`, `game/content/battle/**` (acts, towers, specs, enemies, bosses, waves, spells, supplies' battle effects), battle-side effects of boons/relics/curses/passives/ascensions in `game/battle/mods.ts`, `test/battle*.test.ts`, `test/map*.test.ts` |
| run rules | `game/run/**`, `game/meta.ts`, `game/content/run/**` (boons, relics, curses, events, commanders, ascensions, unlocks, perks, supplies list, blessings, themes), `test/run*.test.ts`, `test/meta*.test.ts` |
| renderer + world art | `surface/render/**` except `fx/` and `api.ts` |
| VFX + juice | `surface/render/fx/**` (projectiles, particles, flashes, decals, rings, statuses, hp bars, damage numbers, hitstop/shake triggers) |
| UI | `surface/ui/**` (HUD, radial, screens, icons, style) |
| audio | `surface/audio/**` |
| balance (later) | `game/bot.ts`, `scripts/sim*.ts`; tunes numbers in `game/content/**` only after the rules agents hand over |

Content ids: lowercase words joined by `-` from the content.md display name ("Glass Bones" ->
`glass-bones`, "Hunter's Whistle" -> `hunters-whistle`). Both rules agents use this rule so ids
agree without coordination.
