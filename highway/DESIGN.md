# Highway: design

What the game is for and why each part is the way it is, so a change to one
can be judged against the rest. Numbers live in `game/content.ts`; the
reference is Traffic Racer (SK Games), whose code we read (v4.0 and v2.5) for
its numbers, not its assets.

## Pillars

1. **Speed is the dial.** Points grow with the cube of speed and near misses
   only count above 100 km/h, so going faster and passing closer are one
   decision.
2. **The car does what your thumb says.** A key press shows on screen at
   once; letting go ends the move where you let go.
3. **Readable traffic.** You are always the fastest thing on the road; other
   drivers keep gaps, signal and change lanes when it is safe; a row never
   blocks every lane.
4. **It looks real.** Textured cars, photographed skies, PBR road and land;
   the motion keeps a real car's shape (it yaws into a move, leans, settles).

## Feel

`FEEL` in `game/content.ts`; the control itself is `Vehicle.step` (the arcade
branch), the body's lean is in `surface/run.ts`, the views in
`surface/camera.ts`.

| | Traffic Racer | Ours | Why |
| --- | --- | --- | --- |
| Pace | the world scrolls 1.66 times the dial | 1.4 | true scale feels slow; 1.66 makes realistic cars read as toys |
| Crossing speed | about 8.4 m/s at 100 km/h, 13 at 200 | 5.5 m/s + 7% of the speed: about 10 at 100, 13 at 200 on the dial | dodging grows more urgent, not harder, with speed |
| Steering ramp | 0.17 s to full | the same | a tap nudges, holding commits |
| Letting go | the sideways motion stops in about 0.2 s | about 0.3 s, no overshoot | a lane change ends where you let go |
| Heading on screen | input times (3 + 0.035 per km/h) degrees | 85% of the real heading (about 8 at 160) | the car points into the move, never a drift |
| Body lean | input times (4 + 0.05 per km/h) degrees, 12 at 160 | 45% of that, on a soft spring | 12 degrees looks cartoonish on realistic cars |
| Camera | rigid, 38.5 degrees, about 12 m back, 28 down, on the centre line | rigid, low behind the car (2.3 m up, 6.4 m back, 50 degrees), following three quarters of the way; C cycles six others (Chase, Classic, Bumper, High, Tower, Long lens) | the road rushes at you; a steady frame to judge a turn against |

The tyre model (slip angles, load transfer) only takes over for 0.9 s after a
knock, so a bump still sends the car sliding.

## Traffic

Density is Traffic Racer's: 5 cars in the 140 m ahead at the start, one more
every 27 s, up to 14 (it then drops to 6; our breathers do that job). Speeds
are its band, 9 + top/5.7 to 51.5 + top/5.5 km/h, from a top speed halfway
between the first car's and yours (Progression, Cars),
faster lanes to the left, trucks slower. Where it drops cars at random,
`game/director.ts` plans rows (a single car, a pair, a door to thread, a
diagonal, a truck with company, a near wall) and never closes every lane; the
first 150 m keep your lane clear. Drivers follow with IDM and change lanes by
MOBIL, signalling first (`game/traffic.ts`).

## Scoring and crashes

Its rules, measured: points per second from speed (v³·10⁻⁶ + v²/3000 past
100 km/h, times 25); a near miss is a pass under about 1 m above 100 km/h,
graded here by the gap (Close, Very close, Paint trader); combos within 4 s;
the oncoming lane pays three times; two passes within 0.15 s pay 2500. A hit
ends the run when the closing speed is 35 km/h or more, or the car was
coming the other way.

A hit is what the screen shows. A car collides as its outline from above
(the convex hull of the model's vertices), pulled in 8 cm across and 10 cm
along, and turned the way it is drawn: yours at 85% of its heading
(`FEEL.yaw`), a car changing lanes into its move. The first cut used the box
around each model, whose corners stick out 6 to 35 cm past a tapered nose or
tail (20 cm typically), so cutting past a car's tail with a gap on screen
still ended the run (`game/crash.ts`, `test/highway-crash.test.ts`).

The guardrail is no lane. A car's side can go 30 cm past the outer lane's
line (`RAIL`, `game/layout.ts`), less than the 0.9 m a car in that lane
leaves, so a car against the rail overlaps the outer lane's traffic. It used
to stop 1.55 m out: floored along the rail, you passed every outer-lane car
about 0.65 m off without touching, each one a Very close near miss, and runs
of a ×277 combo paid for the top car.

## The road trip

The game is a road trip across five regions, and the map is where you play
it. Free Drive (the four endless modes) is an extra beside it. Everything
else, the cars, the upgrades and the cash, exists to get you further along
the map. The first cut of progression (driver levels, missions, a cash
ladder, paints by level; history in git) gave no goal that ever ended, and
one strong run bought the top car.

### What you see

- **The map is home.** The game opens on it: the current region painted
  edge to edge, a road winding through its nine stops (eight Sprints, then a
  duel), each stop showing its stars. The stop to play next pulses. Left
  and right walk the road; the stop's card says what it is, the car you
  will drive, the times its stars need and your best. Enter drives.
- **Up and down change region.** A region not yet open shows dimmed, with
  what opens it ("Beat Ines").
- **G is the garage, F is Free Drive**, from the map, and Escape comes back.
  A run's end offers the next stop, another try (R), the map and the garage.
- **A first launch drops you on the first stop** with one line: Enter to
  drive. Nothing else is explained until it matters.

### A region

- **One car class each**: Countryside drives City cars, High Noon Sport,
  Golden Hour Muscle, Grey Day GT, Night Run Super. Each is its own sky and
  its own traffic, busier region by region.
- **Eight Sprints, opening as you go.** The first three are open; each one
  you finish opens the next, so you can skip a hard one but always have a
  next stop. Their roads vary: four lanes, three, Two-Way, light or packed,
  2.5 to 6 km, about a minute each.
- **The duel** opens at 12 of the region's 24 stars: a race against a rival
  who drives the best line on that road (the search's, slowed to finish
  between the one- and two-star times). Beat them and you win their car,
  the next class's first, and the next region opens with it.
- **The last duel** (Kaz, Night Run) ends the trip; every region stays open
  to collect its stars.

### Your car and the stars

- **You drive your own car**, any you own of the region's class (the
  garage remembers which, per class). You always have one: you start with
  the Compact, and each duel gives you the next class's first car.
- **Stars are set against the class's first car, stock** (the Compact, the
  Tozzo, the Thunderbolt, the Stinger, the Roadster), as margins over the
  best time a search finds on that road: +20% (★, a good first try), +9%
  (★★, the road learned), +3% (★★★, near-perfect). A better car or
  upgrades make them easier: that is what cash is for. Three stars in the
  stock first car stays the hardest way to play.

### Cash, cars, upgrades

- **One currency.** A finish pays a little every time, so you are never
  stuck; a star pays its bonus the first time you earn it. Both grow
  region by region, sized so a region's stars pay for most of its cars and
  some upgrades (`scripts/economy.ts`).
- **Cars** of a class are for sale once its region is open; the first comes
  free from the duel before it. Seventeen in all, prices unchanged.
- **Upgrades**: engine, handling, brakes, five levels each. An engine level
  is +3% of the car's top speed (+15% full), so upgrading is worth the same
  in every class. Every colour is free.

### Speed through the trip

Momentum (below) adds up to 15% on a full chain. From a stock Compact on a
full chain (about 182 km/h) to a tuned Saba (about 476), each region 30 to
50 km/h quicker than the one before; a tuned car overlaps the next class's
stock first car only a little.

### Free Drive

The four modes (Endless, Two-Way, Time Attack, Speed Trap), with any car
you own, under any open region's sky; each keeps its leaderboard. It pays
like a finish does, by the minute, so it is a place to play, not the way
to earn.

### Momentum

A combo is speed. Every near miss in it pushes the car on past its top speed
(`surge`, `game/drive.ts`): 3 km/h for a Close pass, 5 for Very close, 8 for
a Paint trader, 6 more for threading a gap, up to a quarter of the top speed.
It holds while the combo lives (a pass every 4 s) and fades 20 km/h a second
once it breaks. The HUD's combo says what it is worth, and the speed glows
while you are past your top.

It replaced nitro, a bar near misses filled and Space burnt. Nitro made the
same loop (risk earns speed, speed raises the risk) but asked for a second
key, pressed again and again; momentum is the loop with the arrows alone. A
save from before pays its nitro upgrades back.

### Cars and upgrades

Seventeen cars in five classes, each with its own engine note: City (158 to 182
km/h), Sport (200 to 230), Muscle (245 to 275), GT (290 to 310) and Super (325
to 360). Every car is quicker, sharper and better on the brakes than the one
before, and the big jumps are between classes (measured, `game/vehicle.ts`):

| | Compact (first) | Asti (top Sport) | Saba (top Super) |
| --- | --- | --- | --- |
| 100 to 150 km/h | 17.3 s | 4.5 s | 2.4 s |
| A lane change at 160 | 0.54 s | 0.43 s | 0.34 s |
| A flick turned back | 0.21 s | 0.16 s | 0.13 s |
| Braking 160 to 100 | 1.02 s | 0.92 s | 0.81 s |

Three upgrades per car (engine, handling, brakes), five levels each: a
full set takes a car about half a class up. The garage shows the gain before
you pay: browsing another car, each bar marks yours and shows what it adds in
yellow; on an upgrade's row, what its next level adds.

Traffic follows only half of your climb in top speed (Traffic Racer scales it
with yours, so every car meets the same road): a faster car truly outruns it,
passes more cars a minute, and near misses pay more the faster you pass (×2 at
300 km/h). A better car is worth more money, not only more points.

Prices and the XP curve come from `scripts/economy.ts`, which plays thousands of
real runs with a bot of four skills (`game/bot.ts`) and pays careers through
`meta.finish`. The bot drives as a player does: it dodges by lanes, brakes only
when boxed in, and dares a speed over the traffic that grows with how quickly
its car changes lanes. It is a careful player (about 80 to 110 km/h on
average), so real play runs ahead of these numbers. What a minute pays in
Endless, measured:

| | Compact | Asti (Sport) | Saba (Super) |
| --- | --- | --- | --- |
| a good player | $436 | $637 | $754 |
| near misses a minute | 7.5 | 11.5 | 12.7 |

Cars run $2,500 to $56,000; upgrades cost 6% of the car's price (at least $800, so a
first run buys two or three, not a set), half again a
level. Simulated at 40 minutes a day:

| | regular | good |
| --- | --- | --- |
| First purchase | after run 1 | after run 1 |
| Something to buy | every 1 to 2 runs in the first 3 h, 3 to 5 after | the same |
| Into Sport / Muscle / GT / Super | 0.5 / 2.7 / 7.4 / 13 h | 0.4 / 1.5 / 4 / 7 h |
| The top car | about 18 h | about 9 h |
| Two-Way, Time Attack, Speed Trap, Night Run | 4 min, 14 min, 1.1 h, 1.8 h | 10 min, 15 min, 40 min, 53 min |
| Paint collections (levels 15, 20, 25) | 3, 7, 14 h | 1.4, 3, 6 h |

What it found and changed: a combo paid its square (12·c²), so short, wild
Two-Way runs out-earned everything; it now pays 30 per step. Near misses on
oncoming cars paid double cash on top of triple points; they pay triple
points only. Every car once earned about the same a minute (traffic kept pace
with your top speed, and cars barely differed); the classes, traffic that
falls behind a faster car, and near misses that pay with speed fixed that.

### Modes

| Mode | Opens | Rule |
| --- | --- | --- |
| Endless | at once | four lanes your way; one crash ends it |
| Two-Way | level 2 | the oncoming side pays three times, touching it ends the run |
| Time Attack | level 5 | a clock from 60 s; every 2.5 km adds time, a little less each time; the clock and the road left to the next checkpoint sit side by side at one size |
| Speed Trap | level 10 | stay above a speed that rises every 10 s; 3 s below it ends the run |

## Sprints

A prototype of levels, tried before a map is built on them: five short runs
to a finish line, each on a fixed road with its own car (`game/sprint.ts`).

- **The same road every try.** A Sprint's traffic is a course
  (`game/director.ts`): each row draws from its own seed by its number, rows
  are planned a fixed distance ahead and checked against the rows planned
  before, not the live traffic, so how fast you drive never changes what
  comes next (`test/highway.test.ts`). It can be learned, which is what
  makes a hard one fair.
- **The time is the clock.** Near misses help through momentum, so the
  close line is the fast one. Taking time off for them was tried and
  dropped: a search that sits on the line between two lanes takes a Paint
  trader off nearly every car (137 near misses in 3 km, 31 s of credit on a
  60 s clock), so the stars would have measured a skill no person has.
- **Stars are margins over a searched best.** `scripts/sprint.ts` plays a
  beam of runs headless, choosing every 0.25 s where across the road to
  steer for (half-lane steps) and gas, lift or brake, colliding as the
  game's outlines (`scripts/hulls.json`), and keeps the best
  of each kind of place to be; it knows the road as someone who has learned
  it does. One star is +20% on its time (a good first try), two +9% (the
  road learned), three +3% (near-perfect). Its best runs keep one combo the
  whole way, about two near misses a second. The first margins (+30%, +12%,
  +4%, over a weaker search with nitro) gave two stars on a first try.
- **Trying again is instant.** R, from the run, the pause or the end; your
  best run drives beside you as a ghost, and the clock shows how far ahead
  or behind it you are at that point of the road.
