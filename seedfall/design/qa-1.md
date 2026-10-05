# QA pass 1

Tested against HEAD `d9fa5f6` plus the uncommitted work in the tree at the time (bot.ts, ui, render), on
2026-10-05. The tools:

- `bun scripts/qa-soak.ts [--seeds 1,2,3] [--minutes 60] [--boost 1] [--bot casual]`: plays for a long time using the
  QA pilot (human-like keys and a person's shopping), or the economy bot with `--bot`. Every step it checks the
  invariants. It also does a live vs loaded save round trip, reloads with hours away, and measures step time.
  `QA_TRACE=1` adds the last 24 steps to the first issue of each kind.
- `bun scripts/qa-chaos.ts [--trials 40] [--secs 40]`: drops a kitted pod into random caves in every biome of
  Vell, Cinder and Ferrum, then mashes held keys, items 1-7, scan, dump and confirm. It reports invariant breaks and
  which hazards it exercised.
- `bun scripts/qa-page.ts [--only first,buildings,keys,reload,drytow,launch,fps] [--size 720,1440]`: runs the real
  page in headless muted Chromium. Scenarios are in `scripts/qa-page-scenarios.ts`. Screenshots go to `shots-tmp/qa/`.
- `test/qa-bugs.test.ts`: one `test.failing` per rules bug below. When a fix makes one pass, it goes red; that is
  the cue to turn it into a plain `test`.

Invariants that held over about 10 hours of soak and chaos (3 planets, all 7 biomes): no NaN or Infinity in the pod
or state; cash, data and shards never negative; fuel, hull and heat in range; cargo never over capacity; item counts
within carry; events well-formed; entities bounded; same seed and same inputs give the same hash; save -> load gives
the same hash. Step time was 1-2 us on average, with a worst case of 3 ms on a 50%-dug world (the home tick is
1.8 ms there). The 2 s in lava at 1440x900 ran at 60 fps.

Counts: **6 blocker, 5 major, 9 minor, 5 polish** (25). By area: rules 10 (Q1-3, 5, 6, 13, 16, 19, 20, 26), ui 10
(Q9, 12, 14, 15, 17, 18, 21-24), integration/main.ts 4 (Q8, 10, 11, 25), fx 1 (Q4, also needs a rules change).

---

## Blockers

### Q1. A tow with an empty wallet strands the pod in town forever (rules)
- Repro: `bun test test/qa-bugs.test.ts -t Q1`. In play: dive with little fuel and no cash, run dry, press Enter
  for the tow. Every soak seed hit this within 3-15 minutes. The casual economy bot hit it 32 times in 2 hours.
  It also reproduces in the page (`--only drytow`).
- Expected: after a tow, the pod can always refuel and dive. Core-loop says "the broke guard covers the next fuel".
- Actual: `tow()` takes the fee (cash goes to 0) and `home(false)` leaves fuel at 0. `dock()` then skips the broke
  guard because Ida already covered a tank in the last 10 minutes. With 0 fuel the engine is cut and the pod cannot
  drive. `dock()` runs only on arrival (`s.docked` stays true), so even after the 10 minutes nothing refuels it.
  Reloading does not help either, because `docked` is saved.
- Suspect: `src/game/game.ts` `tow()` / `home()` / `town()` / `dock()`. Possible fixes: the tow delivers a minimum
  of fuel, the guard re-checks while the pod is docked dry, or the fee never leaves the player below a tank's price.

### Q2. Running dry in the middle of a dig squeezes the pod up through solid rock to the surface (rules)
- Repro: `bun test test/qa-bugs.test.ts -t Q2`. In the page (`--only drytow`), the pod popped out at the far east of
  town within 2 s (`shots-tmp/qa/drytow-720-01-out-of-fuel.png`).
- Actual: `drill()` cancels the dig when `engine` is false, but it does not put the pod back at `ox, oy`. The pod is
  left partly inside the target tile. The `moveX`/`moveY` push-out then moves it one tile up and one tile right
  every step, through rock, until it reaches air. Usually that is the surface, off the depot, with 0 fuel, so it
  lands in the Q1 lock. It is also a free trip home with the cargo.
- Suspect: `src/game/pod.ts` `drill()`, the `!engine` branch. It should restore `p.x = d.ox; p.y = d.oy` like the
  other cancels. A push-out that never moves the pod more than a fraction of a tile would be a good guard too.

### Q8. Nothing in the page can start the launch (integration/main.ts, ui)
- Repro: `bun scripts/qa-page.ts --only launch`. Build the lance, put 5 Heartstone in the bay, stand on the Seed
  (`canLaunch()` is `{ok: true}`), then press E, Enter, Space or B. Nothing happens.
- Actual: no code in `src/surface` calls `game.launch()`, and `Input` has no launch action.
- Suspect: `src/surface/main.ts` and `ui/index.ts`. A prompt at the Seed ("Enter: wake the Seed") calling
  `game.launch()` would fix it.

### Q9. After a launch, the game is stuck on "Core shards" forever (ui + rules contract)
- Repro: the same scenario, with `seedfall.game.launch()` forced. The sequence plays (wake, rise, break, sky, shards,
  wash). It then holds on the shards screen with the pod stuck to the Seed in the sky, and every key is swallowed
  (`shots-tmp/qa/launch-720-08-launch-keys.png`).
- Actual: `ui/game-model.ts` sets `choosing` only when `launch.phase === "choose"`, but the rules never emit that
  phase. The overlay ends only on `"done"`, which `prestige()` emits only after `choosePlanet`. `choosePlanet` is
  reachable only from the "Next world" tab, and that tab only shows when `choosing` is true. That is a deadlock.
  The UI's phase texts also expect `surface` and `climb`, which the rules do not emit (they emit `break`, `sky`,
  `wash`).
- Suspect: `src/surface/ui/index.ts` `launchPhase` and `ui/game-model.ts` `choosing`, or `meta.stepLaunch`
  (emit `choose` after `wash`). Agree on one list of phases in types.ts.

### Q10. "Paused" does not pause (integration/main.ts)
- Repro: `--only keys`. Press Esc in the mine: the pause panel shows "Paused", but `game.s.time` goes 6.7 -> 7.4 in
  0.8 s. Fuel burns, heat climbs, lava and fuses keep going.
- The same is true for every panel opened in the mine: Tab (cargo), L (log), achievements, settings. A player
  reading the log underground loses fuel and can wreck.
- Suspect: `src/surface/main.ts`. `paused` is set only by the debug hook. It should pause while the pause screen is
  open, and probably while any panel is open below row 0.

### Q11. Planet choice and world change not reachable means runs 2-3 cannot be played in the page (integration)
This follows from Q8 and Q9. It is listed separately because both have to be fixed before any prestige feature
can be tried in the page. Forcing `choosePlanet` from the console does work: the new world loads, the town
re-renders under Cinder's sky, the Launch site opens on the Perks tab, and shards can be spent.

## Major

### Q4. Lava and heat send a `damage` event every tick, so the camera shakes all the time and sparks spam (rules + fx)
- Repro: `bun test test/qa-bugs.test.ts -t Q4` (60 events per second). In the page (`--only fps`): 2 s in lava gave
  132 damage events, camera shake up to 0.30 tiles, and 171 particles.
- Actual: `hurt(..., impulse=false)` emits on every step. `fx/index.ts` `onDamage` adds 0.2+ trauma, a red flash,
  white and red pod tints, and 4-8 sparks on every one of them. That breaks R13 ("shake only for breaks, impacts and
  blasts") and the "lava contact: tint orange, steam" design. Audio already filters lava, heat and spores.
- Suspect: `src/surface/fx/index.ts` `onDamage` (skip lava, heat and spore sources). It would also help if the rules
  rate-limited continuous damage events in `game.ts` `hurt` (for example, sum them and emit every 0.25 s).

### Q12. Arrow keys do not close a panel and drive (ui vs R12)
- Repro: `--only first`. Open the workshop with U, then hold Right. Right switches to the Modules tab, and the pod
  stays put.
- R12 and core-loop say: "direction keys close a panel and drive". The panels use the arrows for navigation, so one
  of the two has to give. Up/Down navigating and Left/Right closing would keep the spirit of R12. Suspect:
  `ui/panel.ts`.

### Q13. The pod perches on the lip of the mine mouth and Down does nothing (rules, feel)
- Repro: `Game.create(42)`, step 38 times with Left held (about 625-650 ms), 20 idle steps, then hold Down. The pod stops at x 24.86-24.94. It is over the 1-wide mouth but overlaps the edge by more than the
  0.2-tile corner forgiveness, so it does not fall in. Down targets column 24, which is air, so nothing happens and
  there is no feedback. This happened in the page run (`first-720`, "holding Down at the mouth digs" failed once).
  Releasing at x 25.1-26.1 instead digs into the mouth's timber lining (column 25).
- Also, the pod spawns at exactly x = 28.0, on a tile boundary, so Down there does nothing (the column test needs
  |dx| <= 0.45). The first hint says to drive to the shaft first, so this is minor on its own.
- Suspect: `src/game/pod.ts` `target()` / the corner rule. Down while grounded over a column that is open below the
  pod's centre could ease the pod into it.

### Q14. The market's price list is cut off at 720x390 and cannot be scrolled with keys (ui)
- `shots-tmp/qa/buildings-720-11-door-market.png`: 11 of the ores show, and Emerald is the last row. ↑↓ moves only
  through the orders. The overflow check lists the rest as off-screen (Jade ... Seedglass), and at 1440 Sower scrap
  onward is off-screen too.
- Suspect: `ui/screens/town.ts`, the market. It needs to scroll or use two columns.

### Q15. Order text is cut at both sizes, and the ore name is the part that gets cut (ui)
- "A haul of at least half a bay with no Co..." (the depot card, the market and the workshop goal line, 720 and
  1440). The ore in the condition is the information a player needs. Suspect: `ui/depot.ts`, `ui/screens/town.ts`:
  shorter phrasing, or wrap to two lines.

## Minor

- **Q3 (rules, `pod.ts` drill resume).** A down dig released by a sideways nudge and then resumed keeps its
  progress. On the first resumed step the pod drops by that progress while it is still off-centre, so it clips into
  the next tile (up to 0.24 tile seen in the soak, for a few frames). `bun test test/qa-bugs.test.ts -t Q3`.
  Resuming should restart the slide-in from the current y, or centre the pod first.
- **Q5 (rules, `save.ts`/`game.ts`).** `prev` (the last step's input, for edge detection) and `warns` are not
  saved. A game saved while Up is held diverges from its live twin within 60 steps (`lastUp`). After a page reload
  the warnings re-fire. This is harmless in play, but it breaks the bot's and tests' determinism across
  save/load. `-t Q5`.
- **Q6 (rules, `game.ts recoverCrate`).** The Magnet Coil pulls a crate's contents from 3 tiles through solid rock.
  Nuggets need a clear line, crates do not. Also, `if (!touch && ingots[k] >= 0) break;` is always true, so each
  pull takes one ingot and one piece. `-t Q6`.
- **Q16 (rules, `meta.applyOffline`).** With no rigs and no lab, 3 hours away still gives an offline card worth $0
  marked `full: true`. Collecting it awards **Night Shift** ("Collect a full silo") and its 15 data for nothing.
  Repro: `Game.load(save, now + 3 h)` on a fresh game. Fix: no card when nothing accrued, and `full` only when the
  silo had output.
- **Q17 (ui, offline card).** The card says "Rigs mined **0 pieces**" next to $53,100
  (`shots-tmp/qa/reload-720-02-offline-card.png` after Enter). `OfflineCard` has no piece count, so the line should
  not show one.
- **Q18 (ui).** The title card ("Press any key") also shows over the offline card and the "Sealed in" prompt after a
  reload, and swallows the first key. A player pressing Enter to collect has to press it twice.
- **Q19 (rules, `meta.prestige`).** Progression's reset table says "depth records for this planet" reset.
  `records.deepest[planet]` is kept, so replaying a planet (Star Charts) pays no depth data. `s.lab` (a cash
  building) is also kept across launches, and neither table mentions it. That needs a decision.
- **Q20 (rules).** The town floor is diggable everywhere, including the depot forecourt (pad x 28.3 + Down digs a
  shaft at column 28) and the mine mouth's timber lining. A hole in the pad changes where the Lift's top drop and a
  tow land. It needs a decision: town tiles unbreakable, or accept it.
- **Q21 (ui).** The stale fuel toasts ("Fuel low", "Turn back now") stay up in town after a Q2 pop-out, and "Turn
  back now" shows while standing on the Seed. The warn ladder should clear on reaching town.

## Polish

- **Q22.** Workshop at 720 and 1440: "Cargo bay 3" runs into its pip bar (spill 69 > 63 px). `ui/screens/workshop.ts`.
- **Q23.** Workshop drill line: "Too weak for core rock -> rock" reads oddly (drill 3, Core reached).
- **Q24.** The launch's "+15 shards" text is purple over the derrick and hard to read
  (`launch-720-07-launch-5.png`).
- **Q25.** One 404 on every page load (a missing resource, probably the favicon).
- **Q26.** A crate left from a wreck or tow in mid-air floats where the pod was. It has no gravity, unlike nuggets.

## Feel problems a player would hit

1. **Early dives burn out.** Starting with 10 L, a new player who digs around near the mouth turns home at rows
   4-20. Combined with Q1, many first sessions end in a dead pod. The casual economy bot was still in Stone after
   2 bot-hours on two seeds (`--bot casual --minutes 120`). That is far from R16's pacing, and something for the
   economy agent.
2. **Cave-ins seal the only shaft early.** On the first dive in the page, a loose tile fell into the 1-wide shaft
   at row 10 (`first-720-05-going-home.png`), with no fuel to spare to dig around it. A first-time player will read
   this as a bug.
3. **Pixel-precise entry into a 1-wide shaft** (Q13) is fiddly on a keyboard, and gives no feedback when it misses.
4. **Early orders are free.** "A haul of 3 pieces of tier 1 or better: +15%" is met by any 3 pieces at the start, so
   it is not a decision (`meta.makeOrders`, depth order: tier = max - 1 = 1).
5. **Waking the Seed needs a guess**: within 5 tiles of its centre, and no floor beside it qualifies (the nearest
   floor that is not on the Seed is 8.8+ tiles away; `test/qa-bugs.test.ts` Q7 records this). Only standing on top
   of the Seed works. The prompt should say so, or the radius should cover the chamber floor by the stalk.
6. **A panel that does not pause** (Q10) punishes reading the log or settings underground.

## Top 10

1. Q1 soft lock after a tow with no cash (blocker, rules)
2. Q2 running dry mid-dig squeezes the pod through rock to the surface (blocker, rules)
3. Q8 nothing starts the launch (blocker, integration)
4. Q9 the launch deadlocks on "Core shards" (blocker, ui/rules)
5. Q10 the pause menu does not pause (blocker, main.ts)
6. Q4 continuous damage events cause constant shake and spark spam (major, fx/rules)
7. Q13 perching on the mouth lip, Down does nothing (major, rules)
8. Q14 market price list cut and not scrollable (major, ui)
9. Q12 direction keys do not close panels (major, ui)
10. Q16 a $0 offline card awards Night Shift (minor, rules)

## Not covered yet

Audio was not checked by ear (headless and muted). The collect key on the offline card is now in the scenario but
was not re-run after the Q18 finding. Ferrum storms and Cinder geysers were exercised by the chaos runner (5 storms,
197 geyser events) with no invariant breaks, but there was no geyser or arc damage on contact. Gas blasts from
drilling a gas tile were not hit at random; the rules' unit tests cover them on a flat world.
