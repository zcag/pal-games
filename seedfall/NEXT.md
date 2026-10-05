# Seedfall (repo: deepcore): what's left (next round)

State on 2026-10-05: complete and playable (a town, seven biomes to the core, 26 ores, 31 relics, the
Seed, prestige to Cinder and Ferrum, 14 perks, rigs, the Lift, research, orders), 165 tests green, 60
fps in magma at 1440x900. Pacing is measured with bots (`scripts/`, numbers in `DESIGN.md` and
`design/`).

## Pacing (measured misses)
- **Travel is 36–38% of a dive** (target 30%); late dives spend ~70 s in transit (target 45 s). Levers:
  the Lift's reach and cost, engine speed, the teleporter's price.
- **Longest stretch with nothing worth buying is ~8 min** (target 6). Find it in the sim and put a
  purchase or an order there.
- **The skilled bot's late prestige runs drop to 14–18 min** (target 20–30): scale the planets' depth
  or the shard curve.

## Correctness
- The "boxed in" prompt decides you can dig out from the drill level only; it ignores planet age and
  Overcharge, so it can be wrong late in a run.

## Visuals
- The last round of visual and UI fixes did not get a fourth independent look: squint-test every
  biome at 720x390 again.
- The latest storm visuals (particles and lights only) were checked only in the effects harness.
- The UI screenshots in `screenshots/ui-r1…r3` came from a test harness with a painted backdrop;
  re-shoot them from the real game.

## Audio
- Checked offline only (peaks, clicks, keys, voice counts) and never listened to.

## Out of scope for this version (candidates)
- The planets Glaze, Mire, Hollow and Orrery, twin drones, gamepad support, colour-blind filters.
