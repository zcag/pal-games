# QA pass 2

Tested against HEAD `5297dc2` with the economy agent's uncommitted `bot.ts` / `economy.ts` in the tree (they break 4
unit tests and `tsc` on bot.ts:336; HEAD alone is 148/148 green), on 2026-10-05. The machine was heavily loaded and
the pass was cut short twice, so the full page journey (point 2 of the brief) is only partly done; what was not
covered is listed at the end.

Tools (all committed):

- `test/qa-2.test.ts`: regression guards for the qa-1 items pass 1 left without a test, and `test.failing` repros
  for N1 and N2. `test/qa-bugs.test.ts` (Q1-Q7) is all plain `test` now and green.
- `scripts/qa-soak.ts`: now also flags `no-progress-20min` (no earnings, depth, level, lift or launch for 20 game
  minutes), `pod-still-120s` (in the mine, not moving), `town-10min`, prints the worst step's context, and with
  `--bot` prints each run (planet, minutes, minutes to each biome, wrecks, tows, sealed, shards), dive endings and
  the bot's stalls.
- `scripts/qa-lib.ts`: the rock checks skip the launch (the pod rides the Seed up through rock by design).
- `scripts/qa-page-scenarios.ts`: new scenarios `chooseesc` and `reload2`; helpers exported for reuse.

Soak coverage: 3 skills x 4-6 seeds x 360 game minutes (about 100 launches across Vell, Cinder and Ferrum), then 5 x
90 min of bot play and 2 x 60 min of the QA pilot. Invariants (NaN, ranges, cargo, items, events, entities) held
everywhere. With the launch excluded, no pod-in-rock episodes remained in the 90-minute runs.

Counts (new bugs): **1 blocker, 3 major, 3 minor, 3 polish** (10). By area: ui 5 (N3, N4, N6, N7, N8),
rules 2 (N1, N2), integration/main.ts 1 (N9), perf/rules 1 (N10), bot 1 (N11).

## qa-1 items

| Item | Status | Evidence |
| --- | --- | --- |
| Q1 tow with empty wallet strands the pod | Fixed | `qa-bugs` Q1; page `drytow`: fuel 2.5 L after the tow, the pod drives |
| Q2 dry mid-dig squeezes through rock | Fixed | `qa-bugs` Q2; `qa-2` Q2 on 5 real seeds |
| Q3 resumed dig clips | Fixed | `qa-bugs` Q3 |
| Q4 damage event every tick | Fixed | `qa-bugs` Q4; page `fps`: 8 damage events in 2 s of lava, shake 0.11, 60 fps |
| Q5 prev input / warns not saved | Fixed | `qa-2` Q5. A different save divergence remains: N1 |
| Q6 magnet through rock, ingot + piece per pull | Fixed | `qa-bugs` Q6, `qa-2` Q6 |
| Q7 Seed wakes only from its top | Fixed | `qa-2` Q7 (the nearest chamber floor tile qualifies) |
| Q8 nothing starts the launch | Fixed | page `launch`: E at the Seed starts it |
| Q9 launch deadlocks on shards | Fixed | page `launch`: reaches `choose`, the Next world tab opens. But see N3 |
| Q10 pause does not pause | Fixed | page `keys`: clock holds under Esc |
| Q11 runs 2-3 unreachable | Fixed | page `launch`: Cinder chosen, `launches` 1, the pod drives |
| Q12 arrows do not close panels | Fixed by decision (R12 revised: arrows navigate, Esc closes). `core-loop.md` Controls/turnaround tables still say "any direction key (closes and drives)": doc out of date |
| Q13 perch on the mouth lip | Fixed | `qa-2` Q13, Q13b (Down on the pad drives in) |
| Q14 market list cut | Fixed | grid scrolls (`buildings-720-11`); polish: nothing shows that more rows are below |
| Q15 order text cut | Fixed | "No Copper, half a bay or more" fits at 720 |
| Q16 $0 offline card, free Night Shift | Fixed | `qa-2` Q16, Q16b |
| Q17 "0 pieces" on the offline card | Fixed | `shots-tmp/qa2/reload2-720-02-offline-card.png` |
| Q18 title card over offline card, eats a key | Fixed | `reload2`: the card shows first, one Enter collects. See N9 for the other side of passing keys through |
| Q19 depth record / lab kept over a launch | Fixed by decision | `qa-2` Q19 (the next planet's record and the lab reset) |
| Q20 town floor diggable | Fixed (forecourt row 0 and the mouth lining) | `qa-2` Q20; the rest of the town floor stays diggable, as decided |
| Q21 stale fuel warnings in town | Fixed | `qa-2` Q21 |
| Q22 "Cargo bay 3" into its pips | Not re-checked | |
| Q23 drill line wording | Not re-checked | |
| Q24 purple shards text | Not re-checked | |
| Q25 404 on load | Fixed | no console errors or 404s in any page run |
| Q26 crate floats | Fixed | `qa-2` Q26, Q26b |
| Feel 1 early dives burn out | Partly | bots reach Stone in 3-10 min; the QA pilot (no upgrades bought fast) still did 117 free tows in 60 min with $0 on seed 21, never stuck but never progressing |
| Feel 2 cave-in seals the first shaft | Fixed (gen `d5f0f9b`) | not seen again |
| Feel 3 pixel-precise shaft entry | Fixed | Down on the pad drives in |
| Feel 4 early orders free | Fixed | early orders are now "4 Copper in one haul", "No Copper, half a bay or more" |
| Feel 5 Seed wake guess | Fixed | prompt "E Wake the Seed" from the chamber floor |
| Feel 6 panels do not pause | Fixed | Q10 |

## New bugs

### N3. Esc on the planet choice strands the run in the sky (blocker, ui)
- Repro: `bun scripts/qa-page.ts --only chooseesc`. Wake the Seed, wait for the "Next world" panel, press Esc.
- Expected: the choice cannot be dismissed, or E/Enter brings it back.
- Actual: the panel closes; `launch.phase` stays `choose` forever, the pod hangs beside the Seed over the town, the
  HUD comes back saying "Dig down and bring ore back to the pad" and "5/88" cargo (N1). E, Enter and Esc do not
  reopen it; U opens the workshop (`m.inTown` is true at y < 0). `shots-tmp/qa2/chooseesc-720-02-after-esc.png`,
  `-03-after-keys.png`. Only a mouse click on the launch site building might reopen it (not verified); a keyboard
  player is locked, and the state is saved.
- Suspect: `ui/index.ts` `launchPhase` (`panels.show("launch", 2)`) and `ui/panel.ts` close on Esc/scrim; also
  `main.ts` E handler (`game.building()` is null in the air). Make the choose panel modal, or let E/Enter/Esc reopen it
  while `phase === "choose"`.

### N2. With the Lift built, the pod cannot drive across the mine mouth (major, rules)
- Repro: `bun test test/qa-2.test.ts -t N2` (failing). In play: buy the first Lift segment, then from the pad drive
  left toward the fuel station, workshop, lab, rigs or launch site (all west of the mouth).
- Actual: after ~0.9 s the pod clamps to the rail at the top (`riding`, y -0.37) and stops. Left and Right do nothing
  (2 s held: x unchanged). Holding Up throws it ~13 tiles into the sky (y -13.1) and drops it back at the pad. Down
  rides down. A person has to fly over the mouth every time; the QA pilot sat there for 40 game minutes (seed 22,
  `town-10min`).
- Expected (core-loop "The Lift"): at the top the pod is set onto the forecourt, and Left/Right leaves the rail where
  the side tile is open.
- Suspect: `src/game/pod.ts` rail clamping at row < 0 / leaving the rail at the top landing.

### N4. "Sealed in" with no items never mentions the tow (major, ui)
- Repro: be sealed in (no open path home) with no dynamite, charge or teleporter. The rules offer the tow after 1 s
  (`pod.ts:219`, toast "Sealed in. Call a tow? (pod only)").
- Actual: the prompt says "Sealed in / Blast a way out or teleport." and the HUD line says the same; neither says
  Enter calls a tow. The player is told to do two things they cannot do. The bots were sealed in 0-6 times per run.
- Suspect: `ui/index.ts` `promptFor` (the `ways` empty branch) and `ui/hud.ts:138`: show "<kbd>Enter</kbd> Tow the
  pod home · fee ..." when `p.stranded`.

### N10. Single steps of 220-300 ms in the long soaks (major until explained, rules/perf)
- In the 360-minute soaks, 9 of 15 seeds had a worst `game.step` of 136-300 ms (others 17-75 ms). Those runs had 3
  soaks in parallel on a loaded machine and did not record where; in the 90-minute reruns with the context printed
  the worst was 47 ms at an ordinary moment (no launch, no event), so this may be GC or machine load. A 250 ms step
  is a visible hitch at 60 fps.
- Next: rerun `bun scripts/qa-soak.ts --bot good --minutes 360 --seeds 1,3` alone and read the `worst step at` line.

### N1. The launch leaves the bay count stale (minor, rules)
- Repro: `bun test test/qa-2.test.ts -t N1` (failing). `launch()` removes 5 Heartstone from `pod.cargo` but not from
  `cargoUsed`/`load` (11 shown for 6 pieces). Visible as "5/88" in the HUD after N3, and it is why every soak had
  `save-roundtrip` divergences (live minus loaded = exactly 5) during launches.
- Suspect: `meta.launch` / `Game.launch`: call `updateLoad` after taking the Heartstone.

### N9. Keys passed through the title card act at once after a reload (minor, integration/main.ts + ui)
- Pass 1's `reload` scenario, rerun: the pod had run dry before the autosave; after the reload the Enter that
  dismissed the title card also confirmed the tow ("Towed home · fee $19", `shots-tmp/qa2/p1/reload-720-01-reloaded.png`).
  The first key after a load should only dismiss the card when a prompt is up, or the prompt should need a second
  press.
- Suspect: `ui/index.ts` `handleKey` (`skipIntro` then fall through) and `input.ts` (Enter -> `confirm`).

### N11. The bot dithers in place for minutes (minor, bot)
- `soak2-casual` seed 11: 6 stalls in 4 minutes at 19.5,541-562 ("work/ore", flying up and down, home tick ~1);
  seed 12: 6 stalls at 39.4,310.6 over 60 s, fuel 37 -> 24, the next tile open. Regular seed 3 (360 min) had 127
  stalls. No rules trap found behind them (the pod could move each time). For the economy agent.

### N6. Depot card "Fuel −$0" (polish, ui)
- Fuel under $0.50 shows "Fuel −$0" (`first-720-05-depot-card.png`). `ui/depot.ts:100`: hide it or show cents.

### N7. The depot card covers the "B buys the suggested upgrade" hint (polish, ui)
- `shots-tmp/qa2/p1/first-720-05-depot-card.png`: the hint bar sits behind the card, only "...suggested upgrade:
  Cargo bay 1" is readable. `ui/onboarding.ts` placement vs `ui/depot.ts`.

### N8. Workshop module cards cut names and descriptions at 720 (polish, ui)
- `shots-tmp/qa2/chooseesc-720-03-after-keys.png`: "Dense Pac…", "Prospector…", "Helper Dro…", "Fuel Recycl…", and
  every description ends in "…". The description is what a player needs to pick a module. `ui/screens/workshop.ts`.

## Feel problems

1. **Shards explode across launches.** Bots on 360 minutes reach 2-17k shards a launch by run 10-14 (casual seed 1:
   59, 49, 68, 101, 359, 1608) and cash in the hundreds of millions; late runs take 10-20 minutes, so the perks run
   out of things to buy. Seed age x1.3^n on value compounds into the shard formula. For the economy agent.
2. **Ferrum and Cinder runs end in tows.** Casual seed 1 run 5 (Ferrum): 9 tows; regular seed 4 run 4 (Cinder): 5;
   good seed 1 run 11 (Ferrum): 3 wrecks. Vell runs rarely tow. The planets' own biomes punish the fuel tick more
   than Vell's.
3. **Reaching the west buildings with the Lift** (N2) will read as the pod "sticking" to the mouth.
4. **The title card passing keys** (N9) makes the first key after a load do something the player did not mean.

## Top 10

1. N3 Esc on the planet choice strands the run (blocker, ui)
2. N2 the Lift clamps the pod at the mouth; no driving to the west buildings (major, rules)
3. N4 sealed-in prompt hides the tow (major, ui)
4. N10 220-300 ms steps in long soaks, unexplained (major, perf)
5. N1 stale bay count after the launch, save divergence (minor, rules)
6. N9 the title card's key also confirms a tow (minor, integration)
7. N11 bot dithering (minor, bot)
8. N8 module cards cut at 720 (polish, ui)
9. N7 depot card covers the hint (polish, ui)
10. N6 "Fuel −$0" (polish, ui)

## Not covered this pass

The scripted full journey in the page (title -> first dive -> sale -> B/U/E/clicks -> every screen at both sizes ->
items, scanner, modules -> Lift purchase and ride -> sealed-in tow -> wreck and crate recovery -> lance bought in the
launch site UI -> perks -> a few minutes on Cinder geysers and Ferrum storms), memory growth over a long page session,
and Q22-Q24. Pass 1's `buildings` scenario's row click times out on its own selector (`#ui .row` picks a hidden row);
use `[data-f=...]` keys next time. The Ferrum storm tug (`game.ts storm()`) checks only the pod's centre row for rock,
which could pull the pod into a ceiling or floor; one 0.32-tile clip at 16.6,273 (banded ironstone) in a Ferrum run of
the long soak points that way but was not reproduced.
