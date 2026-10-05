# Ramparts: what's left (next round)

State on 2026-10-05: complete and playable (3 acts + citadel, 12 towers, 15 enemy roles, 7 bosses,
91 boons, 52 relics, 30 events, 5 commanders, 10 ascensions), 270 rule tests green. Visual reviews
scored it ~6/10: good-looking, not yet awe-inspiring. Balance only partly hit. Numbers and method in
`design/balance.md`; the bot and sim are in `scripts/`.

## Balance (measured misses, ~60 seeded runs per case)
- **Archer carries 68% of all damage** (target ≤ ~25%). Partly the bot's build habits (partners pay
  more damage per gold), so first make the bot build like a person who spreads roles, then re-measure,
  then tune the Archer and its partners.
- **Synergies add only +1–32%** over the same gold without them (target +40–100%). Frost→shatter,
  oil→fire, marks→crits must feel like *the* reason to draft; this is the game's hook.
- **Winning run is ~54 min** (target 30–45): fewer battles per act, or shorter waves late.
- **Commanders trail the Marshal by 12–23 points** (target within 8).
- **Expert win rate 45 / 37 / 12%** at ascension 0 / 5 / 10 (target 80 / 50 / 15–25).
- **Specialisation picks are near-automatic**: Glass Arrows, Spyglass and Cinder Rain over 90%.
- **Walls**: the Hive Queen and the Ember Tyrant.
- A learning player has won by run 8 in 97% of cases (target 60–75%): too easy for learners, too hard
  for experts. Flatten that.

## Visuals and readability (second visual review)
- Enemies too small at 720x390: scale units up, stronger silhouettes and outlines.
- Projectiles and range rings barely read mid-fight: brighter, bigger, a trail per projectile type.
- Act III: the road has weak contrast on snow. Act IV: lava outshines the units.
- Battle lighting is flatter than the title vista's: bring the title's light, sky and atmosphere into
  battles.
- Menu screens sit on a plain wood texture; put the 3D world (blurred or in motion) behind them.
- Coins can float near the sky edge.

## Untested
- The commanders other than the Marshal, the ascension rules in play, curses, and the forge options
  and spells one by one.
- A full run without cheats through the real UI (the QA run used free towers and fast waves).
- The audio was checked by measurement only and never listened to.

## Known rough edges
- Reloading mid-battle restarts that battle from setup (the lives you'd lost stay lost).

## Left out on purpose (candidates)
- A daily siege, maps with two exits, replaying a past run's path, gold borders in the codex.
