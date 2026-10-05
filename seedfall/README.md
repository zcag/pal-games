# Seedfall

A mining incremental in the manner of Motherload. Fly a drilling pod down
through the planet Vell, haul ore back up to the town of Gantry, sell it,
upgrade, and go deeper: topsoil, the old mines, crystal caves, fungal
hollows, magma, the ruins of the Sowers, and the core. At the bottom sits the
Seed. Wake it and launch it, and follow it to the next planet with core
shards that buy permanent perks.

Everything is made in code: the lit pixel art (WebGL2), the music and sound
(WebAudio), the world (seeded generation). Enter on the palette's row opens it
as a view level whose body is the extension's own page (`surface/`, a
`surface` view node); with `store.play` it also runs in a browser on
play.cagdas.io.

The whole design, and why each part is there: [DESIGN.md](DESIGN.md) and
`design/`. What is left for the next round: [NEXT.md](NEXT.md).

## Controls

| Key | Action |
| --- | --- |
| Left / Right, A / D | drive; hold against rock to drill sideways |
| Down, S | drill down; on the pad, drive into the mine; over an open shaft, a fast drop that brakes itself |
| Up, W, Space | thrust |
| 1-6 | items: fuel cell, repair kit, dynamite, big charge, teleporter, coolant |
| 7 | Overcharge (module) |
| Q | scanner pulse |
| X | dump the cheapest ore |
| E | enter a building; in the core chamber, wake the Seed |
| B | buy the suggested upgrade (in town) |
| U | workshop |
| Tab | cargo |
| M | map |
| L | collection log |
| P | pause menu: the log, achievements, settings |
| Backspace | close a menu |
| Shift+M | mute |
| Mouse | every menu; click a building in town to open it |

Escape is pal's: it leaves the game, which is stored on the way out.
Landing on the depot pad by the mine sells the cargo, refuels and repairs on
its own.

## In pal

- **The save** is the extension's storage (`surface/storage.ts`), written
  every 10 s, after a sale or a purchase, when the panel hides and when
  Escape leaves. Saves are versioned (`game/save.ts` migrates older ones).
- **Offline progress** runs off the save's timestamp: a game opened again,
  or a panel shown again after it was hidden, credits the rigs and the lab
  for the time away (capped by the silo), as the "While you were away"
  card. Nothing steps while the panel is hidden.
- **Sync**, signed in to a pal account (`game/sync.ts`, the same rules as
  `pal.json`'s `sync`): the world, the pod, cash, upgrades and the silo go
  with whichever machine wrote last; achievements, the collection log,
  research and unlocked modules, perks, shards and records merge so neither
  machine loses them. A merged save that arrives while the game runs is
  folded in (or taken whole when another machine wrote it later).
- **Settings**: Volume is pal's (Settings › Extensions › Seedfall); music,
  effects and mute stay in the game's own settings (`mix`, synced as the
  latest).
- **The board**: the fastest run from its start to the Core, in play time.

## Code

- `game/`: the rules. Pure TypeScript, deterministic from a seed, fixed
  60 Hz step, no DOM. `game.ts` is the entry (`Game`), `gen.ts` builds
  worlds, `content/` holds the data, `bot.ts` is the player-like bot,
  `sync.ts` what syncs.
- `surface/`: everything the player sees and hears: `render/` (WebGL2),
  `fx/` (particles, shake), `ui/` (HTML over the canvas), `audio/`
  (WebAudio), `main.ts` (the loop and pal's kit).
- `fixture.ts`: the store screenshots, staged from a save the bot played.
- Tests: `test/seedfall.test.ts` (pal's side: sync, the board) and
  `test/seedfall-*.test.ts` (the rules, world generation, the bot, audio
  decisions, QA regressions).

Tools (from this directory):

```sh
bun scripts/economy.ts              # the economy simulator: bots play whole runs, reports pacing targets
bun scripts/economy.ts --trace      # one bot's dive log
bun scripts/map.ts --seed 1         # a generated world as a PNG
bun scripts/qa-soak.ts              # long invariant-checked sessions
bun scripts/qa-chaos.ts             # random inputs against the invariants
```

In a browser: `bun ../.pal/host/src/surface.ts . 8811` from here, then
`http://<host>:8811/surface/index.html` (`?dev` adds `window.seedfall`, the
debug hooks).

## Credits and licences

All art, music, sound, text and code were made for it. No third-party
assets are used. Fonts are the system font stack plus a pixel font drawn in
code.
