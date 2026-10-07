# Highway

Weave through highway traffic at speed. Enter on the palette's row opens it
as a view level whose body is the extension's own page (`surface/`, a
`surface` view node, three.js on WebGL).

## Playing

- **The map** is home: the road trip across five regions (Countryside, High
  Noon, Golden Hour, Grey Day, Night Run), eight Sprints and a duel each.
  Left and right walk the road, up and down change region, Enter drives the
  stop. G opens the garage, F Free Drive; Backspace comes back to the map.
- **A Sprint** is a run to a finish line on a road that is the same every
  try, in your car for the region's class; three stars for the time, a
  ghost of your best beside you, R tries again at once. A duel is the same
  against a rival; win it for their car and the next region.
- **The garage**: every car in its bay, the ones not yours yet under covers
  with what opens them (a region's stars, or its duel). Left and right walk
  the bays, up and down pick car or paint, Enter makes a car the one its
  region's Sprints are driven in. A car new to you gets a showcase.
- **Free Drive**: Endless, Two-Way, Time Attack and Speed Trap with any car
  you own, under any open region's sky; one leaderboard per mode.
- **Driving**: up is the gas, down the brake, left and right steer (WASD
  too). Pass a car close above 80 km/h for a near miss, graded by the gap
  you left (Close, Very close, Paint trader); near misses within four
  seconds build a combo, and a combo pushes you past your top speed.
- **Crashes**: a bump is a bump; hitting something 35 km/h slower than you,
  or anything coming the other way, ends the run. A car collides as its
  shape from above, a little inside what is drawn: a gap you see is a miss.
- C changes the view, P pauses, M mutes.
- **Signed in** to a pal account, the save syncs: best times by `min`,
  totals by `sum`; what is open and which cars you have are worked out from
  the best times, so machines never disagree. A kept run and the ghosts stay on
  their machine.

## How it is built

- `game/`: no DOM. `vehicle.ts` is the car (a dynamic bicycle model: tyre
  slip, load transfer, an engine with gears, a driver aid that holds the
  heading you ask for), `traffic.ts` the drivers (IDM car following, MOBIL
  lane changes, signals), `director.ts` where traffic appears (patterns per
  row, always a lane through; a Sprint's road fixed by its seed), `score.ts`,
  `crash.ts` (outlines and impulses), `content.ts` every number and name,
  `sprint.ts` the road trip's regions and Sprints, `trip.ts` its rules (what
  is open, what a finish pays), `meta.ts` the save.
- `surface/`: the page. `world.ts` builds a place (sky, road, rails, land),
  `terrain.ts` streams the land and plans it (forest, fields or a town each
  side, cuttings and embankments, an overpass every kilometre or two),
  `foliage.ts` makes trees cheap (impostors baked at startup) and the grass,
  `structures.ts` the overpasses, noise barriers, signs and lamp light,
  `run.ts` a run, `camera.ts` the views, `audio.ts` the sound, `trip.ts` the
  map's signs and pins, `mapworld.ts` its world seen from above,
  `garage.ts` the garage, `main.ts` the screens.
- `scripts/drive.ts` measures every car (0 to 100, top speed, braking, a lane
  change); `scripts/trace.ts` traces a lane change step by step;
  `scripts/sprint.ts` searches each Sprint's best time (the stars' anchor)
  and the rivals' lines (`surface/rivals/`).
- `bun host/src/surface.ts highway 8733` serves the page in a
  browser.

## Assets and their licences

- **Cars** (`surface/cars/`): models by DanielZhabotinsky on Sketchfab, CC BY
  4.0, every one credited in `surface/cars/LICENSE.md`.
  `scripts/cars.ts <dir> <out> [ids]` converts the downloaded GLBs (turned to
  face +z, unseen parts removed, textures to shared WebP, glTF JSON with the
  buffer inline, since the page cannot be served binary files).
- **Skies, ground and props** (`surface/env/`): Poly Haven and ambientCG,
  CC0; trees made with EZ-Tree (MIT). `surface/env/LICENSES.md`.
- **Sound** (`surface/audio/`): CC0 engine, road and crash recordings from
  Freesound, Kenney's UI sounds (CC0), music CC0 and CC BY.
  `surface/audio/LICENSES.md` has every credit.
- **Type**: Overpass (SIL OFL 1.1), `surface/font/OFL.txt`.
- **three.js** (MIT): `surface/vendor/three.js`, rebuilt by
  `scripts/vendor.sh`.

## Platforms

macOS and Linux.
