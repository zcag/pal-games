# QA pass 3

The real-page journey that pass 2 left out, on 2026-10-05, against HEAD `9f2082f`..`c4e64e3` (other agents committed
and edited render, ui and economy files during the pass). Headless Chromium through playwright-core, `--mute-audio`,
one page at a time, real keys and clicks, `window.seedfall` only to stage what would take hours (cash, depth reached,
the Heartstone). Screenshots in `shots-tmp/qa3/`, one `report-*.txt` per run.

The machine was loaded (load average 9 at the start, 65 during the memory run), so every stage is a short scenario
that stages its own start instead of one 2-hour run.

Tools (committed):

- `scripts/qa-journey.ts`: the stages `first`, `screens`, `items`, `lift`, `rescue`, `reload`, `endgame`, `storm`,
  `liftcam`, `nightswap`, `memory`. Reuses `runScenarios` from `qa-page.ts` and the helpers in
  `qa-page-scenarios.ts`; adds an overlap check (text boxes in the open panel, or the HUD, that cross each other), a
  pod-in-rock check that skips the tile being dug, an event counter, and a plain-keys `play()` loop.
  `bun scripts/qa-journey.ts --out shots-tmp/qa3 --only first,lift` (`--size 720` to force a size, `--minutes N` for
  `memory`).
- **Vite HMR reloads the page whenever another agent saves a file**, which broke two of the first runs halfway
  ("Execution context was destroyed", the title card back with the old cash). The script gives the page under test an
  HMR socket that never opens, so the page keeps the code it loaded. Anyone running page QA on this shared tree needs
  the same, or a `bun run build` copy.

Status: the lead's `ac49918` (after this pass's runs) addresses P1-P9 per the lead; `--only nightswap` with lead
times 0.2, 0.8, 2.5 and 5 s now passes (no error, the clock keeps running). The others were not re-run.

Counts (new bugs): **1 blocker, 1 major, 3 minor, 4 polish** (9). By area: audio 1 (P1), camera/main.ts 1 (P2),
rules 1 (P3), fx 1 (P4), ui 5 (P5-P9).

## Journey steps

| # | Step | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Fresh save shows the title card | Pass | `first-720-01-title.png` |
| 2 | Holding Down on the pad closes the card and drives into the mine | Pass | x 28.5 y -0.44 -> x 24.5 y 4.5 |
| 3 | First dive: arrow keys dig to the nearest real ore (copper / coal at row 4) | Pass | cargo 1 |
| 4 | Fly up (Up + steering), land on the pad, sale card | Pass | `first-720-04-sale-card.png`, cash $8-12 |
| 5 | B buys the suggested upgrade | Pass | tank 0 -> 1 |
| 6 | U opens the workshop | Pass | |
| 7 | E at each of the 7 doors, driven there with the arrows | Pass, 7/7 | |
| 8 | A click on each building opens it | Pass, 7/7 | (the rigs building's hit box is `rig` / `silo`) |
| 9 | Every screen and tab at 720x390 and 1440x900, arrows + Enter + mouse on tabs and rows | Pass (once HMR was blocked) | `screens-*`; findings P5, P6 |
| 10 | Items 1, 2, 6 use one each; 3 opens tiles; 4 big charge; Q pulses (cooldown 0 -> 7.4 s); 5 teleports home | Pass | `items-720-*` |
| 11 | A module: unlocked in the lab's Modules tab (Enter), fitted by a click in the workshop | Pass | Vein Tracer fitted |
| 12 | Lift: the row reached with the arrows, Enter buys 2 segments, Down at the mouth rides, Up returns to the forecourt | Pass, but P2 | `lift-720-*` |
| 13 | Drive west and back east across the mouth with the Lift built (qa-2 N2) | Pass | x 28.5 -> 15.5 -> 28.7, never clamped |
| 14 | Sealed in, no items: the prompt names Enter and the fee (qa-2 N4), Enter tows, the cargo stays as a crate | Pass | `rescue-720-01-sealed.png` |
| 15 | A wreck: crate left, pod rebuilt at the depot ($49 fee), touching the crate takes the cargo back | Pass | cargo 0 -> 3, crates left 0 |
| 16 | Reload mid-dive: the pod is where the autosave had it; no title card eats a key (qa-2 N9) | Pass | y 33.56 -> 33.56 |
| 17 | Saved timestamp -6 h: offline card ("Rigs mined $26,550, the silo was full for 4 h"), Enter collects and closes | Pass | `reload-720-02-offline-card.png` |
| 18 | Lance parts bought with keys 1-3 in the launch site UI | Pass | lance frame, coil, head |
| 19 | 5 Heartstone, E in the chamber wakes the Seed; the launch reaches the planet choice in ~20 s | Pass | `endgame-720-04..08` |
| 20 | Esc on the planet choice: the panel stays (qa-2 N3) | Pass | `endgame-720-10-choose-after-esc.png` |
| 21 | A click on Cinder lands there (launches 1, 20 shards) | Pass | |
| 22 | Perks tab by the arrow key, Enter buys a perk | Pass | 20 -> 0 shards (Rig Crews, the row under the mouse) |
| 23 | Cinder: geysers fire next to the pod (22 geyser events in 10 s), 2 min of digging in the Ash hollows | Pass, no pod-in-rock with the dig tile excluded | `endgame-720-14..22` |
| 24 | Second launch; arrows + Enter pick Ferrum | Pass | choices `vell, ferrum` |
| 25 | Ferrum: storm warned 3 s before, blows (2 storms in 100 s), tug never puts the pod in rock | Pass, but P4 | `storm-720-07..09` |
| 26 | Console errors throughout | **Fail**: one `pageerror` (P1), in `endgame` and reproduced alone | |
| 27 | 20-minute session, heap after a forced GC | see "Memory" | |

## qa-2 items

| Item | Status |
| --- | --- |
| N1 stale bay count after the launch | Not seen: the HUD reads 0/8 on Cinder and Ferrum after each launch |
| N2 the Lift clamps the pod at the mouth | Fixed (step 13) |
| N3 Esc on the planet choice | Fixed (step 20) |
| N4 sealed-in prompt hides the tow | Fixed: "Enter Tow the pod home · fee $13 · the cargo stays"; with items it lists 3 / 4 / 5 instead |
| N6 "Fuel −$0" | Not seen in 3 sale cards |
| N7 depot card covers the B hint | Fixed: the hint sits to the right of the card (`rescue-720-04-rebuilt.png`) |
| N8 module cards cut at 720 | Fixed: full names and descriptions (`screens-720-02-workshop-t1.png`) |
| N9 the title card's key confirms a tow | Fixed by no title card on a reload with a save |
| N10, N11 | Not re-checked (soak / bot items) |
| Q22 "Cargo bay 3" into its pips | Fixed: "Cargo bay 4" then the pips |
| Q23 drill line wording | Reads "Core rock needs drill 14" (the next gate); fine |
| Q24 purple shards text | Fixed: shard prices are purple chips with dark text, readable |
| Not covered in qa-2: Ferrum storm tug into rock | Not reproduced: 100 s hovering next to lodestone through 2 storms, no overlap |

## New bugs

### P1. The town's day/night music swap right after surfacing freezes the game for good (blocker, audio)
- Repro: `bun scripts/qa-journey.ts --out shots-tmp/qa3 --only nightswap`. Dive, set the clock to 0.8 s before dusk
  (`g.s.time = 299.2`, `dayPhase` 0.8 is time 300 mod 600), surface. The same error showed once in the `endgame` run (many surfacings there; the moment was not isolated).
- Actual: `TypeError: Cannot read properties of undefined (reading 'bars')`. `s.time` stays at 300.02 from then on,
  keys do nothing, the picture stops. The town song was made at surfacing (`makePlayer(song, now + 1.2)`) and has no
  phrase yet when the night key arrives; `music.ts:321` reads `cur.comp.phrase.bars` without the guard line 173 has.
- Why it is a blocker: the throw happens inside `frame()` in `main.ts` before `requestAnimationFrame(frame)` and the
  autosave at its end, so the main loop stops for good and nothing after the last autosave is kept unless the tab
  is hidden. Dusk and dawn come every 10 minutes, and surfacing a second or two before either is enough.
- Expected: the swap waits for the phrase (`!cur.comp.phrase ||` as on line 173).
- Suspect: `src/surface/audio/music.ts:321` (audio). For the lead: `main.ts` could call `requestAnimationFrame(frame)`
  first, or wrap fx/audio/ui in a try, so that no subsystem can stop the game.

### P2. Riding the Lift, the camera loses the pod (major, camera / main.ts)
- Repro: `--only liftcam`. 4 segments, Down at the mouth for 4.4 s, then Up.
- Actual: at 720x390 the pod is off screen in **430 of 574** riding frames (worst 7.7 tiles from the camera centre,
  the view is 6.1 tiles half-height); at 1440x900 in 69 of 585 (8.6 vs 8). `lift-720-03-lift-ride-down.png` and
  `liftcam-720-02-ride-down-1.png` show the shaft and the pod's lamp glow at the bottom edge, no pod.
- Why: the camera is a critically damped spring with omega 9; at constant speed it trails by 2v/omega, which is 13
  tiles at the Lift's 60 tiles/s, against 3 tiles of look-ahead. It came with `9f2082f` (40 -> 60 tiles/s).
- Expected: the pod stays on screen (art.md: the pod reads first).
- Suspect: `src/surface/camera.ts` `update` (stiffer spring or a clamp that keeps the pod inside the view while
  `riding`, or while |vy| is high: the R2c drop at 25 tiles/s trails by 5.5 tiles too).

### P3. "Turn back now" next to "Sealed in" (minor, rules)
- `screens-1440-21-hud-dive.png`: the fuel toast says "Turn back now" while the prompt says the pod is sealed in and
  cannot. `game.ts:635` sets the home warning to 3 whenever `fuelHome` is Infinity.
- Expected: no fuel warning while sealed in (the sealed-in prompt is the warning).

### P4. A magnetic storm shows nothing while it blows (minor, fx)
- `storm-720-07..09`: during the storm the screen looks like any other moment; only the toast 3 s before ("A
  magnetic storm is coming.") and audio mark it. With sound off, a player cannot tell when it starts tugging or ends.
  No `storm` handler exists in `src/surface/fx/` or `src/surface/render/` (only `audio/`).
- Expected: a visible state for the 10 s (tint, static, particles drawn to lodestone, or a HUD chip).

### P5. The "▾ more" badge covers the row text under it (polish, ui)
- `screens-720-09-market.png` ("Platinum" -> "Platinu▾ more"), `endgame-720-12-perks.png` ("Shard Lens" text).
  The badge should sit in the panel's foot gap or the row under it should pad. `ui/panel.ts` / `style.css`.

### P6. Perk descriptions cut at 720 (polish, ui)
- `screens-720-08-launch-t1.png`: "One more of every item; start with 2 fuel cells and 2 re…" and "10% of the last
  run's earnings, paid int…". The perk text is what a player buys on. `ui/screens/launch.ts` `.perk .fx`: wrap to two
  lines at 720, as the module cards do now.

### P7. Ida's pre-lance line on the planet choice (polish, ui)
- `endgame-720-10-choose-after-esc.png`: the head says "The plans say three parts and five heartbeats. Bring them."
  while the panel is about choosing the next world. `ui/screens/launch.ts` / the people lines.

### P8. Scroll lists give no sign of more rows in the achievements and the log (polish, ui)
- `screens-720-17-achievements.png`: 15 of 30 cards show, the 5th row is cut, no "more" badge (the market and perks
  have one). Same for the log's relic grid.

### P9. The 720 depot card hides the whole HUD block (polish, ui)
- `first-720-04-sale-card.png`: the card covers the fuel, hull and cargo bars while it is up. The sale is the moment
  to look at them least, so this is a feel note more than a bug; the top-right cash and depth stay visible.

## Memory

`--only memory --minutes 20`: 20 rounds of play (40 s of digging, a trip through the depot, U / L / Tab opened and
closed), JS heap sampled through CDP `Performance.getMetrics` after `HeapProfiler.collectGarbage`. The loaded machine
made the 20 rounds take **15 minutes** of wall time, not 20.

| min | heap MB (after GC) | DOM nodes | listeners |
| --- | --- | --- | --- |
| 0 | 8.0 | 155 | 52 |
| 0.8 | 8.8 | 242 | 81 |
| 3 | 9.7 | 266 | 114 |
| 6 | 10.0 | 251 | 132 |
| 9 | 10.2 | 248 | 111 |
| 12 | 10.3 | 248 | 100 |
| 15 | 10.3 | 248 | 109 |

Flat: +1.5 MB over 14 minutes, levelling off after minute 6 (likely the save's dug-tile diff growing); nodes and
listeners swing with the open panels and toasts and do not climb. No console errors in the session.

## Feel notes

1. **The first minutes work end to end with only the keys the hints name.** Down on the pad drives in, the first ore
   is 1-3 tiles from the shaft, Up and steering land on the pad, the sale card counts up, B buys the tank. Every door
   opens with E and with a click.
2. **"Sealed in" fires in any closed pocket, even next to diggable rock** (`items-720-05-items-hud.png`: drill 8 in
   Stone, gold one tile to the right, "Sealed in: 3 Dynamite · 4 Big charge · 5 Teleport home"). In normal play the
   way you dug in stays open, so a player sees it mostly after sand or a cave-in closes the tunnel, where it is right.
   But the prompt never says "or dig out", so it reads as "you are stuck" when the pod is not.
3. **The Lift at 60 tiles/s** is fast enough that the ride is a blur with the pod off screen (P2). With the camera
   fixed it will feel good; the ride down to row 137 took 2.2 s.
4. **After a launch the perks panel opens under the mouse**, and the row under the pointer is selected, so an Enter
   buys whatever the mouse happens to rest on (here Rig Crews instead of the first row).
5. **Storms are hard to read** (P4): the tug is 0.5 tiles/s and stops at rock; in 2 storms beside lodestone the pod
   moved 0.05 tiles. Easy to miss entirely.

## Top issues

1. P1 the night-swap music throw stops the game loop for good (blocker, audio; main.ts should not let it)
2. P2 the camera loses the pod on the Lift (major, camera)
3. P3 "Turn back now" while sealed in (minor, rules)
4. P4 storms invisible while they blow (minor, fx)
5. P6 perk text cut at 720 (polish, ui)

## Not covered this pass

N10 (long-soak step spikes) and N11 (bot dithering) need the soak, not the page. A single uninterrupted 2-hour
journey from a fresh save was not run: each stage stages its own start. Touch / gamepad were out of scope.
