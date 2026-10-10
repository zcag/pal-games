# Uphill

A hill-climb driving game: a little buggy over endless hills, as far as the fuel
goes. Parked (pal-games/parked.txt): kept here while it is a prototype, never
published.

## How it plays

- ↑ gas, ↓ brake then reverse (W and S too). On the ground the gas sits the car
  back and the brake tips it forward; in the air the same keys lean it, which is
  the skill: land every crest on both wheels.
- The run ends when the driver's helmet touches the ground, the car drops into a
  gap, or the fuel runs out (once the car has rolled to a stop). There is no
  "stuck" ending: a stalled car can back up and try again, and one on its side
  is righted by the right lean or tips onto the helmet (tried at 90 and 126
  degrees either way), so nothing waits on a car that cannot move. R or Space drives again; P pauses; M mutes.
- L cycles the looks: Forest, Desert, Dusk and Classic (`look`, synced as the
  latest; Forest when none is set).
- Fuel burns with time (a full tank is 30 s on the gas, a third longer coasting);
  cans along the road fill it, each a little further on than the last (190 m,
  then 232, 276 ... apart). Coins come in rows of five, 5 each, 25 past 500 m,
  100 past 1 km; a flip on landing pays 50 × flips², a long jump 50 a second.
- One stage (`STAGE` in game/sim.ts), the same road every run, so it can be
  learnt; a flag marks your best distance on it. Only the best is stored
  (`best`, synced by max).

## How it is made

- `game/terrain.ts`: the ground as pure functions of (seed, x): Catmull-Rom
  noise in three octaves, taller (2.6 m, +1 m every 85 m, to 15.6 m) and bumpier
  further out. A gentle hop at 170 m that the gas held gets over (0.3-0.5 s of
  air, landed upright on all ten seeds tried), the real kicker 400-500 m in
  (where leaning is the lesson), then the wall and the gap, then any of the
  three every 150-260 m. `profile` gives the polyline the physics and the picture both
  use.
- `game/sim.ts`: planck.js (Box2D, MIT, vendored by `scripts/vendor.sh` into
  `game/vendor/`) at a fixed 60 Hz: a chassis with the driver's helmet as a solid
  fixture, two wheels on sprung wheel joints (3.6 Hz, 0.62 damping), rear-biased
  drive (11 and 4 N m, 26 rad/s top, about 12 m/s). Ground is laid in 60 m chain
  chunks with ghost vertices and let go 150 m behind. Everything that matters
  comes out as events (coin, fuel, land, flip, air, end).
- `game/bot.ts`: three drivers for tuning and tests. `scripts/feel.ts [seeds]`
  prints how far each gets; `FEEL='{"lean":15}'` overrides the tuning for a
  sweep.
- `surface/`: a 2D canvas (render.ts) drawn between physics steps, the camera
  looking ahead and pulling out with speed and in the air; synthesized sound
  (audio.ts); the HUD and end card in HTML.
- The looks (`surface/looks.ts`): PWL's flat landscape layers (CC0, credited in
  `surface/art/README.md`), stored as tone masks by `scripts/art.ts` (232 KB for
  ten layers) and recoloured per look once, then tiled as parallax at 1.5-20% of
  the road's speed. The ground, the props behind the road, the car and the
  pickups are drawn flat in the same no-outline style, the car in the scene's
  one strong colour. A scene's colours are its own, not pal's theme; the HUD
  takes its text colour from the scene's sky (`data-hud`). Classic is the first
  look, drawn as before and following pal's theme.

## Tuning (stage 7, 2026-10-10)

| driver | what it does | gets to |
| --- | --- | --- |
| careless | holds the gas, never leans | 455 m (over the hop, flips at the kicker at 441) |
| novice | gas on the ground, lets go in the air | 608 m (goes over at the wall at 607) |
| careful | eases off over crests and when the nose rises, leans to the landing | 1,554 m (out of fuel) |

Over ten seeds: careless 420-623 m (mean 484), novice 496-951 (mean 686),
careful 1,119-1,865 (mean 1,428). Nothing tunnels (a wheel sinks 1 cm at most on the
hardest landings), the car rests without jitter, and a run's step is about
30 µs.

## Open

- The careful bot leans perfectly; a person's best runs are untested.
- The sound was checked for errors only, never listened to.
