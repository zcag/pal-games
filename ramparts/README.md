# Ramparts

A tower defense roguelike. You build Kingdom Rush-style towers, soldiers and commander spells,
and you play them inside a Slay the Spire-style run. A run has three acts and a final citadel.
Each act is a branching map of battles, elites, shops, events, forges and camps. Along the way you
draft a war table of up to six towers, plus boons and relics. The world is a lit low-poly 3D
diorama, and all of its music and sound is synthesised.

Ported into pal from the standalone game (2026-10-05): the rules, look and balance are as they
were; what changed is what a pal surface needs (below).

- `DESIGN.md` is the front page of the design: pillars, the rulings, controls and balance targets.
  Each chapter in `design/` covers one area in full: `systems.md` (battle), `run-meta.md` (run and
  meta), `content.md` (every number and line of text), `art.md` (look), `balance.md` (tuning log and
  measurements) and `architecture.md` (code layout).
- `NEXT.md` is what's left for the next round.

## In pal

- The page is `surface/index.html`, served file by file (`.ts` transpiled one at a time, no
  bundler): three.js is one vendored module, `surface/vendor/three.js` (`scripts/vendor.sh`
  rebuilds it from `package.json`'s version), and the two fonts are in `surface/font/`.
- Saving goes through the kit's storage (`surface/storage.ts`, read once at start): `profile`
  (renown, unlocks, codex, history), `run` (the run in progress, with a version) and `settings`.
  Signed in, they sync by the rules in `pal.json`, which `game/sync.ts` builds from the content
  (`bun ramparts/scripts/sync-rules.ts` writes them after content changes; a test fails when they
  drift): counts add up, records keep the best, unlocks and history are a union, the run is the
  latest.
- A won run posts its ascension to the `ascension` board.
- Volume, music and effects are pal's settings for the game; M mutes, from anywhere.
- Escape is the panel's: it leaves, and leaving (or hiding the panel) pauses a battle and stops
  the sound. Backspace does what Esc did: cancel an aim, close the radial, leave a shop, go back.
- `bun .pal/host/src/surface.ts ramparts 8791` serves the page in a browser;
  `?battle=1..4&kind=battle|elite|boss&seed=N&towers=archer,frost,...` jumps straight into a
  battle, and `window.__game` exposes state for headless checks.

## Controls

| Key | Battle | Outside battle |
| --- | --- | --- |
| Mouse | click a pad for the build menu, click a tower for upgrade/sell/target | click cards, nodes, choices |
| 1-6 | build that tower on the focused pad | pick a card or choice |
| Arrows, Tab | move between pads | move on the map or between items |
| Space | start wave 1, or call the next wave early for gold | |
| U / X / T / R | upgrade / sell (press twice) / cycle target mode / move the rally point | |
| 1 / 2 in the open menu on an L3 tower | choose a specialisation | |
| Q / W | commander spells (aim with mouse or arrows, Enter casts, Backspace cancels) | |
| E / D | war supplies | |
| Alt (hold) | show every tower's range | |
| F | speed 1x / 2x / 3x | |
| P | pause (mute, shake, damage numbers) | |
| Backspace | cancel aim, close the menu, pause | back |
| V | | war table |
| Z | | zoom the run map |
| M | mute | mute |

## Code

- `game/`: pure, deterministic rules (seeded, 30 Hz fixed step, no DOM).
  - `battle/`, `map.ts`, `content/battle/`: the battle sim, maps and waves.
  - `run/`, `meta.ts`, `content/run/`: the run, renown, unlocks and codex; `sync.ts` the merge rules.
  - `bot/`: a player-like bot with a knowledge level, used by the balance simulator.
- `surface/`: the page.
  - `render/`: three.js stage, world, models, units and towers.
  - `render/fx/`: projectiles, particles, status overlays, hitstop and shake.
  - `ui/`: DOM HUD, radial menu, every screen, SVG glyphs.
  - `audio/`: WebAudio synth music and effects.
  - `main.ts`: the app shell, the loop and pal's hooks.
  - `storage.ts`: the only persistence.
- `scripts/`:
  - `sim.ts` and `balance/`: the balance simulator and its probes.
  - `sweep.ts`: the full-strength rule sweeps the test suite samples.
  - `audio-check.ts`: measures every song and effect offline in headless Chromium.
- `fixture.ts`: the store screenshots (`make shots EXT=ramparts`).
- Tests: `test/ramparts-*.test.ts` (`make test NAMES=ramparts`).

## Credits and licences

- Code, models, textures, music and sound: made for this project. Everything is procedural or
  synthesised; no third-party art or audio is used.
- Fonts: [Cinzel](https://fonts.google.com/specimen/Cinzel) (Natanael Gama) and
  [Nunito Sans](https://fonts.google.com/specimen/Nunito+Sans) (Vernon Adams, Jacques Le Bailly,
  Manvel Shmavonyan, Alexei Vanyashin), SIL Open Font License 1.1 (`surface/font/OFL-*.txt`).
- Libraries: [three.js](https://threejs.org) (MIT).
