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
else, the cars and their showcases, exists to get you further along the
map. The first cut of progression (driver levels, missions, a cash
ladder, paints by level; history in git) gave no goal that ever ended, and
one strong run bought the top car.

### What you see

- **The map is home.** The game opens on it: the region's own world seen
  from high above the highway, its nine stops (eight Sprints, then a duel)
  pinned along the road, each showing its stars, your car parked at the one
  picked and traffic going by. The stop to play next pulses; the camera
  glides along the road to whichever is picked, and your car drives there.
  Up and down walk the road (its stops run up the screen); the stop's card says
  what it is, the car you will drive, the times its stars need and your best.
  Enter drives.
- **Left and right change region** (the region sign's ‹ ›), the next region's
  world cross-faded in.
  A region not yet open shows dimmed, with what opens it ("Beat Ines").
- **Three tabs on top: Road trip, Garage, Free Drive**, on all three, so
  Free Drive is never a hidden key away. Tab steps through them (shift+tab
  back), a click or G and F go straight there, Backspace comes back to the map.
- **The garage is where a car is picked**, and its sign says what Enter does
  there. From the Garage tab or Free Drive's car, Enter drives the car in
  Free Drive (U makes it its region's car too); from a stop's card ("Your car",
  C) it shows that region's class and Enter makes the car the region's; on a
  car you do not have yet, Enter opens the map on the stop that brings it.
  A run's end offers the next stop, another try (R), the map and the garage.
- **Back from a run, the map opens on the stop just driven**, its new stars
  landing on its pin; when the run finished it (three stars, a duel), the
  pick then glides up the road to the next stop. Jumping straight to the
  next one lost where you had been.
- **The next stop stays in the region while it has one open you have never
  driven** (the Legend a duel's three stars just opened, a stop passed by),
  then goes to the furthest region: winning a duel once skipped its Legend
  for the region it opened.
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
- **A Legend** waits past each duel: the region's hardest road (packed, narrow,
  about a minute), open once the duel has three stars. Its first finish gives
  a Legend paint every car can wear (gold, chrome, copper, pearl, obsidian):
  something to show for it, with no money back in the game.

### Your car and the stars

- **You drive your own car**, any you have of the region's class (the garage
  remembers which, per class; a car new to you takes over).
- **Stars are set in the car you have on reaching the stop**: the latest of
  the region's class come by then (`carAt`, `game/sprint.ts`), the duel and
  the Legend in its last. They were set in the class's first car, and once
  a player had the region's faster cars every three stars came almost free
  (a player's Countryside, 2026-10-08: three stars on all nine, one to ten
  per cent under the best in the Kiri and the Milano, level with it in the
  Compact). Margins are in "Stars" below.

### Cars come with the trip

No money, no prices, no upgrades: the trip is linear, so a second economy
on top of it only blurred it (cash, prices and upgrades were cut on
2026-10-07). Finishing the road is what opens everything:

- **A class's first car comes with its region**: the Compact from the
  start, the others from the duel before (Ines's Tozzo opens High Noon).
- **Its other cars open by the region's Sprints finished**, spread over its
  eight: three cars after 3 and 6, four after 2, 4 and 6 (`stopsForPlace`,
  `game/sprint.ts`). They opened at 8, 16 and 24 of the region's stars, but
  then the car a stop is driven in hung on how well you drove the others, so
  no star time could be set for it; by stops, every stop has its car.
- **A car new to you gets the garage's showcase**: the room dims, the camera
  flies round it, its cover comes off, its title shows; Enter on a duel's
  results goes straight to it.
- **Nothing is stored about it**: what you have is worked out from your best
  times, so two machines never disagree. Each car keeps its paint; every
  colour is free.

### Speed through the trip

Speed is not the reward: past about 250 km/h a car ahead appears too late to
read, and the game turns into reaction time. So the trip starts slow (the
Compact tops out at 120 km/h) and ends at 225 (the Saba), and what a better
car gives is control. Measured at each car's own top speed (scripts/drive.ts
and the table below, `Vehicle` at 1/120 s):

| | Compact (first) | Tozzo (Sport) | Thunderbolt (Muscle) | Stinger (GT) | Saba (last) |
| --- | --- | --- | --- | --- | --- |
| Top speed, km/h | 120 | 145 | 165 | 185 | 225 |
| A lane change at its top | 0.56 s | 0.48 s | 0.43 s | 0.38 s | 0.34 s |
| A car in view before you reach it | 12.7 s | 9.4 s | 7.8 s | 6.6 s | 5.1 s |

So each region is quicker and asks more of you, while the car you earn
for it turns in sharper, settles sooner and brakes harder. Each class also
pulls harder (12% more power a class), so a better car gets back up to
speed after a squeeze sooner. Momentum adds up to 15% on a full chain.

### Free Drive

The four modes (Endless, Two-Way, Time Attack, Speed Trap), with any car
you have, under any open region's sky; each keeps its leaderboard.

### Momentum

A combo is speed. Every near miss in it raises the car's limit past its top
speed (`surge`, `game/drive.ts`): 3 km/h for a Close pass, 5 for Very close,
8 for a Paint trader, 6 more for threading a gap, up to 15% of the top. The
engine does not get you there by itself: past the top, a gentle pull on the
gas takes the car on toward the new limit, firm most of the way and gone at
it (`game/vehicle.ts`), half of it in 2 to 2.7 s in every class, settling at
83 to 86% of it. So speed past the top is earned back over a few seconds of
chain, never a given: lift and you slow as any car does, brake and the surge
bleeds away. It holds while the combo lives (a pass every 4 s) and fades
20 km/h a second once it breaks. (The first cut pushed the car whether you
were on the gas or not, so a run never left its top speed.)

It replaced nitro, a bar near misses filled and Space burnt. Nitro made the
same loop (risk earns speed, speed raises the risk) but asked for a second
key, pressed again and again; momentum is the loop with the arrows alone. A
save from before paid its nitro upgrades back (when there was money).

### The cars

Seventeen cars in five classes, each with its own engine note: City (120 to
135 km/h), Sport (145 to 160), Muscle (165 to 180), GT (185 to 200) and Super
(205 to 225). Every car is sharper and better on the brakes than the one
before (agility 0.96 to 1.70, `handlingOf` in `game/vehicle.ts`), the big
steps between classes, and each class pulls harder than the last. Their
values are fixed. Browsing the garage, each bar marks the car that drives
its region and what this one adds in yellow.

Traffic follows only half of your climb in top speed (Traffic Racer scales it
with yours, so every car meets the same road): a faster car truly outruns it.

### Modes

| Mode | Pays | Rule |
| --- | --- | --- |
| Endless | ×1 | four lanes your way; one crash ends it |
| Two-Way | ×1.2 | the oncoming side scores three times, touching it ends the run |
| Time Attack | ×1.15 | a clock from 60 s; every 2.5 km adds time, a little less each time; the clock and the road left to the next checkpoint sit side by side at one size |
| Speed Trap | ×1.3 | stay above a speed that rises every 10 s; 3 s below it ends the run |

## Sprints

The road trip's stops: short runs to a finish line, each on a fixed road
(`game/sprint.ts`). They began as a five-Sprint prototype, tried before the
map was built on them.

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
- **Stars are margins over a searched best, driven at a person's pace.**
  `scripts/sprint.ts` plays a beam of runs headless, choosing where across
  a player's keys (a tap of left or right, or neither, and gas or brake),
  colliding as the game's outlines (`surface/cars/hulls.json`), and keeps
  the best of each kind of place to be; it knows the road as someone who
  has learned it does, in the car a player has there (`carAt`). It drives as
  a person does (`HUMAN` in `game/bestrun.ts`): a choice every 0.25 s, felt
  0.15 s late, a tap meant to be 0.08, 0.12 or 0.18 s that comes out up to
  30% longer or shorter (fixed by the road and the moment, so it sees where
  a tap left it and fixes it with the next), and a pass under 0.15 m from a
  car a gamble it takes only when it pays (it costs up to a quarter metre
  of road). Of equal choices it takes no key.
  Three stars are that time +2%, two +6% (the road learned), one +15% (a
  good first try), each rounded up to the tenth. Three began at +0%, rounded down: on First Light
  (nothing to slow for, so every flat-out run is within hundredths of the
  best) that was 54.9 s against a best of 54.99, and a player at 55.01
  could not get it.
  - The search at a machine's pace (four choices a second, at once, two
    slots each) drove a TAS: watched, Dry Run's three-star run was inhuman.
    Its margins were +20%, +9%, +3%; before them +30%, +12%, +4% over a
    weaker search with nitro gave two stars on a first try.
  - The pace was set on Dry Run against a player's 64.85 s (the machine:
    61.10). One slot a choice took two seconds a lane change and drove
    75-81 s; two slots every 0.4 s, 0.15 s late, drove 64.61, so that best
    is three stars a quarter second under the player's. A wider beam found
    the same times.
  - It first chose where across the road to be (0.9 m apart) and steered
    there with an analogue wheel, each step's lock worked out to arrive
    without overshoot. Watched, that was a machine too: dead straight, then
    small exact corrections onto each pass. A keyboard has full lock or
    none, so it now drives a player's keys through the same driver aid,
    lands between lanes as a person does, and corrects with taps. Keys
    made it faster, not slower (the driver aid's slides are quick): at 0.4 s
    choices with 0.1 s taps Dry Run went 64.78 to 62.1, three stars beyond
    the player's 64.85. Paces from 0.4 to 0.6 s drove Dry Run 61.4-65.9 and
    Commuters 51.0-51.9 (noisy, not monotone); 0.6 s, 0.25 s late, taps of
    0.2/0.4/0.6 s gave 65.92 and 51.02, the old search's standing against
    his three roads.
  - Watched, that drove like a machine still: it always knew how much to
    turn and whether a pass would make it. Against the player's saved runs
    (`scripts/style.ts` re-drives them and a search's, and compares): they
    tap 70-97 times a minute, most 0.1-0.15 s, a third to a half of them
    fixing the one before; it tapped 26-63, 0.2-0.4 s. Their passes sit a
    median 0.27-0.42 m from the car, a tenth to a quarter under 0.1 m; it
    passed a median 0.03 m off, every pass at the edge since a hair pays as
    a gap does. They do not pass wider to be sure, so a minimum gap is still
    wrong; a pass close in is a cost instead. At 0.4 m, even at 1 m of road
    a pass, it never went under 0.1 m and fell 2-6 s behind them; at 0.15 m
    and a quarter metre it drives First Light 55.02, Three Lanes 60.37 and
    Dry Run 64.28 (theirs 55.23, 60.51, 64.85), passes a median 0.24-0.29 m
    off and taps 61-110 times a minute. Commuters (53.4 against their 51.15)
    is the road they drive better than every setting tried. Checking that a
    tap would survive coming out at either end of its range changed
    nothing, and went.
    At the 0.6 s pace three dense roads (Big Block, Convoy, The Storm) found no
    finish with the usual beam of 30, every run in it crashing; 120 did.
  - Behaviour was tried before margin, against the same player's three
    roads (First Light 55.01, Commuters 53.46, Dry Run 64.85; the search
    54.99, 51.02, 64.78). His gap to it is the near-miss surge: on
    Commuters both are flat out for a kilometre, then its chained passes
    carry it 15-20 km/h past top speed. Planning only 1-3 s ahead (no
    whole-road hindsight) changed little: Commuters 51.0-51.6, Dry Run
    66.7-67.3. A nerve, never passing closer than a gap, could not fit
    both: at 0.1 m Commuters 52.33 (just under him) and Dry Run 74.82 (ten
    seconds over: he threads gaps under 0.1 m there), at 0.31 m 56.17 and
    81.51. A person's edge differs by road, so the margin carries it.
- **Trying again is instant.** R, from the run, the pause or the end; your
  best run drives beside you as a ghost, and the clock shows how far ahead
  or behind it you are at that point of the road.

## Replays

A Sprint can be watched again, because it is deterministic: its road and
traffic come from its seeds and it steps at a fixed 1/120 s, so the inputs
alone drive the same run again, the traffic doing what it did.

- **Your runs.** A Sprint keeps its inputs as a tape of changes (the keys
  held, and the step they changed at: a kilobyte or two a minute). The run
  just driven can be watched from its results ("Watch what happened" after
  a crash); a new best's tape is kept, this machine's, for the map card's
  "Your best".
- **The 3★ run.** The best-time search keeps its winning run's choices,
  and `--write` ships them (`surface/best.json`); the page drives them at
  their pace (`game/bestrun.ts`), in the car it drove, so the 3★ run is
  the run the stars are drawn from. A finish short of the next star offers
  it as the thing to do next.
- **Where they are.** A stop's card has one quiet line, "Watch a replay"
  (R), that opens a panel beside it: your best (or why it is not kept: a
  best from before replays), the 3★ run, and later the record, each with
  its time and its gap to yours; on a stop short of three stars it opens on
  the 3★ run.
- **Watching** is a run with the keys taken away: a strip says what it is,
  F changes speed (1×, 2×, ½×), P pauses, Backspace goes to the map; its
  end says how it compares (the best run's margin over yours, your run's to
  the next star). A replay that strays from its run (the game changed since
  it was driven) says so rather than pretending.
- **Other players' runs** need a replay kept with a score on a board, which
  pal's leaderboards do not do yet.
