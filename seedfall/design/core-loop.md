# Seedfall: core loop

The moment-to-moment game: flying the pod, drilling, fuel, hull, cargo, heat,
lamp, scanner, hazards' rules, items, modules in the dive, pickups, the Lift,
the turnaround in town, controls and juice. DESIGN.md's decisions (D1-D20,
R1-R15) win over this file. Every number is a starting point for the bot
(R15); the formulas are the contract. Units: tiles (1 tile = 10 m), seconds,
tiles/s. The rules tick at a fixed 60 Hz in `src/game/`.

Pillars are DESIGN.md's. This part adds one: **back in the mine in under 20
seconds**. Town is a pit stop, not a menu crawl.

## Stats: level 0 and growth

L is the stat's level (0 = starting pod). Progression prices the levels and
sets the caps; these say what a level does.

| Stat | Value at L | L0 | Cap | Why |
| --- | --- | --- | --- | --- |
| Drill power P | 1.25^L | 1.0 | L21 (108) | ~3 levels per biome match the 1.9x hardness step (D1) |
| Engine thrust T | 700 x 1.12^L (mass.tiles/s^2) | 700 | L20 (6,750) | must outgrow cargo mass |
| Climb cap V_up | min(30, 7 + 1.15L) tiles/s (R2a) | 7 | 30 at L20 | a loaded Core climb takes seconds, not minutes |
| Drive cap V_x | min(8, 5 + 0.15L) tiles/s (engine L) | 5 | 8 at L20 | faster than 8 overshoots ore you meant to dig |
| Fuel tank F | 10 x 1.2^L litres | 10 | L18 (266) | the frontier climb grows with depth and load |
| Hull H_max | 40 x 1.2^L HP | 40 | L20 (1,530) | hazard damage grows 1.6x per biome |
| Cargo C | 8 + 4L slots | 8 | L20 (88) | linear: ore value and pieces per tile already grow |
| Radiator R | 120 + 20L degrees C (R6) | 120 | L20 (520) | the heat frontier moves 12-22 rows per level |
| Lamp radius r_l | min(10, 3.5 + 0.5L) tiles (R12) | 3.5 | L13 (10) | 10 tiles covers the view |
| Lamp cone half-angle | 40 + 1.5L degrees (R12) | 40 | L13 (59.5) | a wider cone reads more of the route |
| Scanner | see Scanner | none | L8 | each level adds a feature |

**Ore mass per piece** (D3): `m_piece = world kg / 10 x 1.12^b`. Examples:
Copper 1.0, Lead 2.8, Platinum 2.83, Cinnabar 2.20, Fire opal 1.10, Diamond
0.94, Heartstone 2.37, Stellite 1.97, Seedglass 0.39. The bot re-measures them
(R12).

## Pod physics

The pod is a 0.875 x 0.875 tile box (14 of 16 art px tall), so it fits a
1-tile tunnel with 1 px to spare each side.

### Mass

```
m_empty = 20
m       = m_empty + sum(m_piece over cargo)
k_m     = m / m_empty            // load factor, 1.0 empty
```

Full L0 bay of topsoil ore: ~7.2, k_m 1.36. A Core haul of 100 pieces
(cargo L18 + Dense Packing): ~207, k_m 11.3.

### Vertical

| Quantity | Value | Why |
| --- | --- | --- |
| Gravity g | 16 tiles/s^2 | a 3-tile drop takes 0.6 s: falling feels committed |
| Fall cap (free fall) | 12 tiles/s | fall damage stays a real thing off your own shaft |
| Fast drop | see below: 25 tiles/s with auto-brake | travel down your own column is quick and safe (R2c) |
| Thrust accel (Up held) | a_up = max(T/m - g, 1.5) | the floor stops "too heavy to move" softlocks |
| Climb cap | V_up x k_m^-0.5, floor 1.5 | weight is felt as a slower climb |
| Above a cap | velocity eases to it at 20 tiles/s^2 | caps feel like a limit, not a wall |
| Releasing Up mid-air | gravity only | hovering is a skill |

L0 empty: a_up 19, cap 7. L0 full (k_m 1.36): a_up 9.7, cap 6.0.
"Overloaded" shows on the cargo meter when T/m < g + 3.

Vertical collision is swept (one ray per tick) since 25 tiles/s is 0.42
tile per tick.

### Fast drop and auto-brake (R2c)

- Holding **Down while airborne** over an open column (the tile under the
  pod's centre column is open) adds 24 tiles/s^2 downward (total 40) up to a
  cap of **25 tiles/s**. The shaft-centring ease (below) keeps the pod on the
  column.
- **Auto-brake:** the rules know the first solid tile or liquid surface below.
  When it is 3 tiles away, the engine fires down-to-up at 100 tiles/s^2; the
  pod lands at 3 tiles/s or less, so a braked drop never deals fall damage.
  Over lava the brake stops the pod 1 tile above the surface and hands control
  back (normal gravity).
- Burn: idle only (gravity does the work; the brake is a few frames of thrust,
  charged as thrust).
- Times: 40 rows in 2.0 s, 188 rows in 7.9 s.
- Releasing Down returns to free fall (cap 12, damage rules apply). Why: the
  safe fast drop is a held intent, not a default that hides fall damage.

### Horizontal

| Quantity | Ground | Air | Why |
| --- | --- | --- | --- |
| Accel | 40 / k_m^0.5 | 14 / k_m^0.5 | heavy loads steer slower, never mushy |
| Max speed | V_x x k_m^-0.25 | same | drive feel stays snappy |
| Release | stops at 60 tiles/s^2 (~0.08 s) | drag 2/s | no ice on the ground; air keeps a little drift |
| Reverse | stops at 60 then accelerates | air accel x1.5 | turning around is instant |

Corner forgiveness: when moving vertically and overlapping a tile corner by
0.2 tile or less, nudge sideways at 6 tiles/s instead of stopping. Falling or
thrusting in a 1-wide shaft eases x to the column centre at 8 tiles/s. Why:
threading your own shaft must never snag.

### Landing, falls and bumps

```
v_safe      = 9 tiles/s                                  // free fall of 2.5 tiles
fall_damage = 5 x (v_impact - v_safe) x k_m^0.5  HP      if v_impact > v_safe
```

| Free fall from rest | Impact | Damage empty (L0 hull 40) |
| --- | --- | --- |
| 2 tiles | 8.0 | 0 |
| 3 tiles | 9.8 | 4 |
| 4.5 tiles or more | 12 (cap) | 15 |

Fall damage is absolute: the hull outgrows it by mid game, a power fantasy
worth having; the deep game hurts through hazards. A rising wind whistle above
9 tiles/s is the tell.

Wall and ceiling bumps above 7 tiles/s deal `2 x (v - 7)` HP and bounce with
restitution 0.2; below 7 the pod stops with a thud.

### Camera

art.md section 1 owns the camera: critically damped follow (omega 9/s), a
1.5-tile look-ahead, sub-pixel split, clamps. **No rotation and no zoom, ever**
(R12). Shake is an offset only (`4 art px x trauma^2`, art's model) and comes
only from **breaks, impacts and blasts** (R13); the trauma per event is in
Juice. Drilling never shakes the camera: it vibrates the pod sprite and the
tile.

The loop asks of the camera: in the mine, bias 1.5 tiles down when not
climbing (the work is below); while climbing (v_y < -3), bias 2 tiles up; in
town, frame 3 tiles above the pod.

## Drilling

### Rules

- Drill **left, right, down**. Never up. Never airborne.
- Down: grounded on the target tile, |v_x| < 2; the pod snaps to the column
  centre over 0.08 s (must be within 0.45 tile).
- Left/right: grounded (the Lift's rail counts), side tile solid, pressing
  into it.
- **Engage delay 0.10 s** against the tile before drilling starts. Why:
  bumping a wall while driving never starts a dig.
- **Chain dig:** holding the direction when a tile breaks starts the next
  qualifying tile at once. One press digs a shaft.
- **Buffer:** a direction pressed in the last 0.15 s of a dig is queued.
- Releasing cancels; progress decays at 2x the rate it was gained.
- Thrust during a dig cancels it.

### Timing

```
ratio = H / P
t_dig = 0.25 + 0.40 x ratio  seconds    if ratio <= 2.5
too hard                                if ratio >  2.5
```

| ratio | t_dig | Feels like |
| --- | --- | --- |
| 0.25 | 0.35 s | slicing through |
| 0.6 | 0.49 s | brisk |
| 1.0 | 0.65 s | the baseline |
| 1.9 | 1.01 s | slow; time to upgrade |
| 2.5 | 1.25 s | a grind, but possible |

The 0.25 s floor keeps every tile a beat.

### Hardness and the dense material (D1, R12)

World's per-material table is the source. Each biome has one **dense**
material at **2.0x** its typical rock in about 10% of tiles; ore tiles are
host x 1.15 and sit in typical rock, never in dense. The drill gates are read
off the dense material:

| Biome b | Typical 1.9^b | Dense 2.0x | Drill to dig typical | Drill to dig dense (the gate) |
| --- | --- | --- | --- | --- |
| 0 Topsoil | 1.0 | 2.0 | L0 | L0 |
| 1 Stone | 1.9 | 3.8 | L0 | L2 |
| 2 Crystal | 3.6 | 7.2 | L2 | L5 |
| 3 Fungal | 6.9 | 13.7 | L5 | L8 |
| 4 Magma | 13.0 | 26.1 | L8 | L11 |
| 5 Ruins | 24.8 | 49.5 | L11 | L14 |
| 6 Core | 47.0 | 94 (core shell) | L14 | L17 |

Heartrock 75 needs L16; vault seals 95 need L17 (25 with A13, L8). Why dense
at 2.0x: a player one level short can still work the biome by routing around
dense tiles, which is a choice; at the gate the whole biome opens.

### Moving into the tile

```
offset = smoothstep(0.15, 1.0, progress) x 1 tile   toward the tile
```

The first 15% is the bite (no movement). The pod slides in as the tile
crumbles and snaps to the tile centre on the break.

**Drill vibration (R13), sprite and tile only:** the pod sprite jitters
perpendicular to the drill direction by 1 art px at the material's rate
(below); the target tile jitters 1 art px at 30 Hz from crack stage 3. The
camera does not move.

### Too hard (D11)

- **On contact** (pressing 0.10 s): the bit bites, the pod sprite bounces back
  0.15 tile, a dull clank, sparks, a thin red outline on the tile for 0.3 s,
  and a label for 1.5 s naming the material and the fix: **"Obsidian: too
  hard. Drill 11."** (the lowest level whose P makes ratio <= 2.5 for that
  tile's H). Unbreakable tiles ring instead and say **"Can't be drilled."**
  At most once per tile per 5 s.
- **Ahead of contact:** within 2 tiles of the pod, every lit tile the current
  drill cannot dig carries a sparse dot hatch (art draws it). In practice that
  is the dense material of a biome you are under-drilled for, so the player
  sees the routing problem before bumping it.

### Per-material feel

Hardness comes from world's table; these are the feel intents (audio.md owns
the voices).

| Class | Sprite vibration | Sound | Particles |
| --- | --- | --- | --- |
| Soil, fungal mat | 9 Hz | soft crunch / squish | brown crumbs / drifting spores |
| Clay | 9 Hz | wet squelch-crunch | ochre clumps |
| Typical rock | 18 Hz | gritty grind | grey grit |
| Dense material | 24 Hz | high grind, metallic overtone | grit + white sparks |
| Crystal rock | 18 Hz | glassy tink over the grind | tinted shards |
| Basalt, obsidian | 18 Hz | deep rumble grind | black grit + embers |
| Ruin brick, concrete | 12 Hz (chisel knocks) | stone knocks at 6 Hz | tan dust, square chips |
| Core shell, heartrock | 24 Hz | resonant hum under the grind | white-violet sparks |
| Ore tiles | host's | host + a pitched ring by value tier | host grit + ore flecks |

## Ore yield, pickups and loose pieces

**Pieces per ore tile (R3):** `n = 1 + floor(b / 2)`: Topsoil and Stone 1,
Crystal and Fungal 2, Magma and Ruins 3, Core 4. One piece = one slot. Why:
deep supply quadruples without clutter on screen, and late bays fill again.

- On a break, the tile's n pieces pop up 0.4 tile in a fan (0.18 s), then fly
  into the pod over 0.12 s, staggered 0.05 s.
- If fewer than n slots are free, the pieces that do not fit drop as **loose
  pieces** on the tile's floor: one pile per tile, drawn with a small count.
  They stay for the rest of the game (saved).
- **Magnet:** 1.5 tiles (3 with Magnet Coil), through open tiles only. It
  pulls loose pieces one per 0.05 s while slots are free; dumped pieces are
  destroyed, so it never grabs them back.
- **Chime:** one per tile, pitched by value tier, with n - 1 quick grace
  notes up the pentatonic ladder (audio.md). Streak: each tile within 1.5 s of
  the last raises the base a step, up to +7, reset after 1.5 s.
- Label: "+3 Platinum" rises 0.6 tile and fades over 0.7 s; the same ore
  within 1 s merges ("+9 Platinum").
- **Bay full:** the first overflow pile bounces once, the bay icon flashes
  white twice, "Cargo full" for 1 s, a low thud. After that, ore drops
  silently until something is dumped or sold.

## Fuel

Burn is a base plus the current activity.

| State | Burn (L/s) | Why |
| --- | --- | --- |
| Idle below row 0 | 0.04 | standing still in the mine is never free |
| On the surface, or riding the Lift | 0 | town and the Lift are never a drain |
| Driving | 0.10 | |
| Drilling | 0.12 + 0.04 x ratio | harder digs cost more, rewarding drill upgrades twice |
| Fast drop | 0.04 | gravity does the work |
| Thrusting | see below | the cost of a heavy load lands here |
| Heat at 100% | x1.5 on all of the above | overheating is felt in fuel too |

**Thrust burn is per row (R2a).** The cost of climbing one row is fixed by load
and engine level; burn per second scales with the speed you climb at:

```
v_ref(L)  = min(14, 7 + 0.35L) x k_m^-0.5            // the old climb cap
fuel_row  = (0.04 + 0.21 x k_m^0.5) / v_ref          // litres per row climbed
burn/s    = max(0.04 + 0.21 x k_m^0.5, fuel_row x v_up)
```

Hovering costs the first term; climbing at the new cap costs more per second
but the same per row, so a faster engine buys time, never fuel tension away.
The engine's level still lowers fuel_row (through v_ref) up to L20. Mass is
D16's lever: the bot tunes the `k_m^0.5` exponent here before ore mass, never
the tank.

A typical L0 minute (40% drilling, 25% thrust, 25% driving, 10% idle) burns
~0.17 L/s: the 10 L tank lasts ~60 s, the brief's first dive.

### Fuel to the lift head

Every 0.25 s the rules compute the cheapest way **home**: any row-0 tile, or
any tile of the Lift column at or above its head (R2b).

```
path     = BFS over opened tiles (4-neighbour) to the nearest home tile
up_rows  = rows climbed along the path; side = tiles driven
need     = 1.2 x ( up_rows x fuel_row(k_m) + side / V_x x 0.10 )
```

The 1.2 margin covers acceleration and steering. Rows travelled by fast drop
or the Lift cost nothing. No path (a cave-in sealed it): "No way up".

### HUD and warnings

The fuel bar has a **tick at `need`**: left of it is fuel to get home, the
rest is fuel to spend. A small lift icon at the tick says home is the lift
head, not the surface, once a segment exists.

| Condition | Shown | Sound |
| --- | --- | --- |
| fuel < need x 2.0 | tick turns amber | |
| fuel < need x 1.3 | bar pulses amber, "Head up soon" | soft double beep once |
| fuel < need x 1.05 | bar red, "Turn back now" | beep every 2 s |
| fuel < need | "Not enough to get home" + fuel cells that would cover it | low tone once |
| fuel < 15% of tank | bar flashes | beep every 1 s |
| No way up | path icon red, "Sealed in: blast a way out or teleport" | low tone once |

### Empty tank: the tow (R1)

At 0 L the engine cuts (no thrust, drive or drill; lamp at 50%). With fuel
cells aboard: "Use a fuel cell (1)". Otherwise, after 1 s: **"Out of fuel.
Call a tow? (pod only)"** (Enter):

- The **pod alone** is lifted to the depot (3 s skippable cable animation).
- **The cargo stays** where the pod ran dry, as a **crate** under the wreck
  crate rule (Hull: Destruction). Artifacts carried go home with the pod (D15).
- **Fee: the price of one full tank** at the current tank level, taken from
  cash (it may go to 0; progression's broke guard covers the next fuel).
- Why: running dry costs the haul until a recovery dive and a tank's price,
  so it never beats turning back at the tick (R1's bot check), and nothing
  permanent is lost.

## Hull

### Damage

b = biome index. Hazard damage scales with `D_b = 1.6^b` (1, 1.6, 2.6, 4.1,
6.6, 10.5, 16.8); Seed age adds x1.08^n (R4).

| Source | Damage | Notes |
| --- | --- | --- |
| Fall | 5 x (v - 9) x k_m^0.5 | absolute; never on a braked drop |
| Wall/ceiling bump | 2 x (v - 7) | absolute |
| Gas blast | 14 x D_b x max(0, 1 - d/2), d = tiles from the gas tile | see Hazards |
| Falling boulder | 10 x D_b per hit | 0.6 s wobble first |
| Lava contact | 9 x D_b per second | plus heat +40%/s |
| Overheat (heat 100%) | 3% of H_max per second | a timer at any hull level |
| Own dynamite / big charge | 20% / 35% of H_max | a fixed lesson, not depth-scaled |

Invulnerability after a hit: 0.4 s. A point-blank gas blast costs about 30% of
a hull kept at pace (L0: 14/40; Magma at hull L11: 92/297): three mistakes are
a wreck, two are a scare.

### Repair

Automatic at the depot (toggle) or in the workshop. Price per HP is
progression's, cheap enough that repair is never a reason to skip a dive.
Repair kits in the dive (item 2).

### Low hull

| Hull | Shown | Sound |
| --- | --- | --- |
| < 50% | bar amber | |
| < 25% | bar red, slow red vignette pulse (alpha 0.12) | creak every 3 s |
| < 10% | faster pulse (alpha 0.2), sparks from the pod | alarm chirp every 1.5 s |

### Destruction: the wreck (D15)

At 0 HP the pod bursts (flash, 1.2 s slow-mo at 0.3x), then:

- **Cargo goes into a crate** at that spot, marked on the map, with an edge
  arrow on the HUD. Touch it on a later dive to recover **100%** (it counts
  against the bay; overflow drops as loose pieces). **One crate at a time**,
  shared with the tow: a new crate replaces an unclaimed one.
- Artifacts carried are kept and go to the lab.
- The pod is rebuilt at the depot, hull and fuel full, all upgrades, modules
  and items kept. Rebuild fee per progression (10% of cash, capped at the lost
  cargo's value; free with an empty bay).

## Cargo

- Capacity in **slots** (8 + 4L, x1.25 with Dense Packing); one piece = one
  slot. Value and mass vary per ore (D3): slots are what you plan around, mass
  is what you feel.
- **Full** = slots used == C; the bay icon fills segment by segment and pulses
  at full.
- **Dumping:** X drops the lowest-value piece (ties: heaviest); it crumbles
  and is gone. The cargo panel (Tab) lists contents by ore; a row's dump
  button drops one, shift-click all of that ore.
- Ingots (Smelter) are one slot each and are dumped last.

## Heat

One gauge. Pressure is not separate: the radiator covers both in the fiction.

```
T(row)  = D2's curve, piecewise linear between
          (0,15) (160,40) (280,90) (400,200) (540,345) (560,300) (680,330) (770,485)
T_eff   = T(row) + 60 x (lava tiles within 2 tiles, max 3) + 80 during a core pulse (1.5 s)
over    = T_eff - R
heat%  += over / 20 per second         if over > 0      (x0.7 with Heat Sink)
heat%  -= 8 per second                 if over <= 0     (16 with Heat Sink; floor 0)
```

A planet's heat modifier applies to its own biome's rows only (R5).

**The heat frontier**: the deepest row where T <= R, per radiator level.

| L | R | Frontier row | | L | R | Frontier row |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 120 | 312 | | 11 | 340 | 535 (the Magma floor band 536-542 peaks at 345) |
| 1 | 140 | 334 | | 12 | 360 | 697 (all of Ruins) |
| 2 | 160 | 356 | | 13 | 380 | 709 |
| 3 | 180 | 378 | | 14 | 400 | 720 |
| 4 | 200 | 400 (Fungal bottom) | | 15 | 420 | 732 |
| 5 | 220 | 419 | | 16 | 440 | 743 (Core) |
| 6 | 240 | 438 | | 17 | 460 | 755 |
| 7 | 260 | 457 | | 18 | 480 | 767 |
| 8 | 280 | 477 | | 19 | 500 | all (485 at 770) |
| 9 | 300 | 496 | | 20 | 520 | chamber with pulse margin |
| 10 | 320 | 515 | | | | |

Gates (D2 in new levels): Fungal bottom L4, Magma floor and Ruins L12, Core
L16, chamber L20. The frontier moves 22 rows per level in Fungal, 19 in Magma,
12 in the Core: every purchase is "one more dive, deeper".

At 40 C over, heat fills in 50 s; at 100 over, in 20 s. At 100%: 3% of H_max
per second and fuel x1.5. The gauge appears once T_eff > R - 30 and hides 10 s
after it is back at 0. Why: a player can dip below the frontier as a timed
sprint, a choice rather than a wall.

## Lamp and darkness

- Below row 4 the only light is the lamp, emissive things and art's lights.
- Lamp: a cone of radius r_l and half-angle `40 + 1.5L` degrees in the facing
  direction (art tilts it 15 degrees down; straight down when drilling down or
  falling), plus an all-round glow of 0.45 x r_l. Facing is the last
  horizontal input.
- **What light does for play:** tile types, non-emissive ore, the too-hard
  hatch and visual hazard tells show only when lit. Unlit tiles are
  silhouettes; emissive ore shows anywhere on screen.
- L0 (3.5) shows two tiles of tell ahead of the drill: enough to stop. Ore
  Sense, the first research node (by dive 3, R13), covers the early dark.
- At 0 fuel the lamp is at 50% radius.

## Scanner (D10)

A pulse on **Q**: a ring expands at 25 tiles/s to r_s, revealing outlines that
persist through rock and stay on the map.

```
r_s(L)      = 4 + 2L tiles         (L >= 1)
reveal time = 6 + 0.5L s on screen, then kept on the map
cooldown 8 s; cost 0.2 L
```

| Level | Adds |
| --- | --- |
| 1 | ores (outline only), caches, the rich pocket's shimmer |
| 2 | gas and lava pockets |
| 3 | loose boulders and unstable ceilings |
| 4 | ore value tier as outline colour |
| 5 | passive pulse every 10 s, free |
| 6 | reveals last 2x; the map remembers values |
| 7 | radius x1.5 |
| 8 | crates and secrets (world) |

## Hazards

Every hazard has a tell a careful player sees or hears in time.

| Hazard | Tell | What it does | Counter |
| --- | --- | --- | --- |
| **Gas pocket** (R12) | host rock with a faint shimmer and 1-2 hairline yellow-green cracks (lit); a hiss within 3 tiles even in the dark; scanner L2 | **only drilling the gas tile itself** (or a blast in range) lights it: a fuse of `0.8 x k_m^0.25` s (0.8 empty, 1.25 at k_m 6, 1.47 at k_m 11) with a hiss and green swell, then a blast of **radius 2** that clears tiles with H <= P. **No push.** Digging next to it is safe. | stop drilling it, or get 2 tiles away during the fuse; a heavier pod gets a longer fuse because it moves slower |
| **Lava** (D12, R12) | open lava glows far; hidden pockets bleed orange through cracks in lamp light and raise T_eff +60 per tile within 2 | contact 9 x D_b HP/s and +40% heat/s. A fluid: into opened tiles at **1 tile per 0.5 s down, 1 per 1.5 s sideways**, up to its volume; crusts to basalt after 15 s still | dig around pockets; give it a sump below; thrust out (contact ends at once) |
| **Loose boulder / cave-in** | cracked outline, dust trickle and rattle within 3 tiles; 0.6 s wobble when its support goes | falls at gravity, 10 x D_b on hit, settles as a boulder tile (host x 1.5); can seal your shaft | don't dig under it, or step aside in the wobble; dynamite clears a sealed shaft |
| **Spore cloud** (world) | pale green puffs drift from fungal walls | blinds: the lamp drops to 50% for 4 s; no damage | wait it out, scanner outlines |
| **Arc pylons** (world) | pylons hum and spark 1 s before each arc | an arc across the gap: 8 x D_b on contact | time the gap |
| **The core pulse** (D7) | the Seed's glow swells 1 s before | T_eff +80 for 1.5 s, a screen sway (offset, no push) | radiator margin, Heat Sink, coolant |
| **Unbreakable rock** | art's look, a ringing clank | blocks, never damages | route around |

Creatures are scenery (D6): they react to the lamp and never hurt.

Placement is world's; the loop requires **no hazard within 2 tiles of the
Lift column at rows 0-10**, **no gas pocket adjacent to another** (no chain
blasts), and lava and gas blasts never pass the Lift's casing.

## Explosives and Overcharge (R8)

Explosives save time and cover area; they never move a gate by more than one
level, and nothing but the drill opens vault seals early except the A13 key.

| Tool | Clears | Notes |
| --- | --- | --- |
| Dynamite (item 3) | radius 1 (3x3), tiles with **H <= 2.5P** | exactly what the drill could dig; a fast way through a band or out of a sealed shaft |
| Big charge (item 4) | radius 2.5 (21 tiles), **H <= 3.2P** | one drill level early (1.25 x 2.5 = 3.1) |
| Overcharge (module, key 7) | the next 8 tiles you drill: `ratio := max(0.25, ratio / 4)`, **only where ratio <= 5** | 45 s cooldown; never vault seals, core shell or heartrock |

Ore in a blast drops as loose pieces (the tile's full n). Blasts trigger gas
pockets and loose boulders in range. Overcharge's ratio <= 5 means it digs up
to 2x the normal limit (about three levels early) for 8 tiles: a punch through
one dense band, not a key.

## Items (hotkeys 1-6)

Instant unless noted; 0.5 s shared cooldown. Prices and carry limits are
progression's; "tank" means a full tank's price at the current level.

| Key | Item | Effect | Decision it creates |
| --- | --- | --- | --- |
| 1 | Fuel cell | +50% of tank (capped at full) | range vs safety |
| 2 | Repair kit | +40% of H_max | push through a hazard band or turn home |
| 3 | Dynamite | 2 s fuse, see Explosives; 20% H_max to the pod within 1.5 tiles | blast out of a sealed shaft, open a seam fast |
| 4 | Big charge | 3 s fuse, see Explosives; 35% H_max within 3 tiles | one level early, or open a cavern for lava to drain |
| 5 | **Teleporter** (R1) | 2.5 s channel (a hit cancels and keeps the item), then pod and cargo warp to the depot; **30% of the pieces are lost** (ceil, cheapest per piece first, an ingot ranked by its own value) | a ripcord with a price: worth it only when the way home is sealed or the hull is about to go |
| 6 | Coolant | heat to 0%, no gain for 20 s | dip below the frontier, cross a lava band |

Left out: flares (the lamp and scanner do light), a drill boost (speed is not
a decision), an up-drill charge (breaks "you cannot dig up").

## Modules in the dive (R7)

Research unlocks modules; the pod has **2 slots** at the start, +1 on first
reaching Fungal, +1 from research. Swapped free in the workshop, never in the
dive. The suggestion card and B never pick a module.

| Module | What it does in the loop | Why take it |
| --- | --- | --- |
| **Magnet Coil** | magnet radius 1.5 -> 3 tiles; also pulls a crate's contents from 3 tiles | blasting and overflow come back to you |
| **Heat Sink** | heat fills x0.7; cooling 8 -> 16 %/s | longer sprints below the frontier, pulse-proof in the Core |
| **Afterburner** | double-tap Up: 1.5 s at climb cap x1.6 (max 30) and a_up +50%, costs 3% of tank, 8 s cooldown | a heavy pod escapes lava, a boulder or a gas fuse |
| **Overcharge** | key 7, see Explosives | one dense band early |
| **Fuel Recycler** | drilling burn x0.6 | long frontier dives; fuel planets |
| **Smelter** | 5 pieces of one ore fuse into an ingot 2 s after the fifth arrives: 1 slot, worth 5.5x, mass unchanged | slot-dense hauls; you pick the ore to stack |
| **Dense Packing** | slots x1.25 | late bays that fill in 25 Core tiles |
| **Vein Tracer** | breaking an ore tile outlines the rest of its vein for 10 s | no scanner pulse needed to follow a seam |
| **Prospector's Ear** | relic, jackpot and cache chimes reach 20 tiles (from 10) and show on the pulse | detours you can plan |
| **Helper Drone** | follows the pod and mines one ore tile within 4 tiles every 6 s at the pod's P, into the bay (progression owns the rest) | more pieces per minute at the price of a slot |

## Caches and the rich pocket (R10)

- **Caches**: one themed tile per about 15 rows in every biome (crate, mine
  cart, fossil geode, spore cache, ember chest, Sower coffer, seed pod), in
  typical rock. Found by lamp (a distinct object tile), the scanner (L1, a
  boxed outline), or the chime within 10 tiles (20 with Prospector's Ear).
  **Opened by drilling** it: hardness 0.8x the biome's typical rock, so the
  biome's entry drill always opens it. It bursts with a small fanfare; cash is
  banked at once (it cannot be lost), ore pieces go to the bay (overflow drops
  as loose pieces), an item goes to its slot if carry allows, otherwise its
  price as cash. Contents and values are progression's.
- **Rich pocket**: when a dive starts (the pod leaves row 0 or the Lift's top),
  one vein of the pocket's biome is seeded at **x2 size** in unopened rock
  within 25 rows below the deepest row reached, outside structures. The
  scanner pulse paints it with a faint shimmer; the shimmer also shows in lamp
  light. An untouched pocket reverts to rock when the next dive starts; a
  partly mined one stays as plain ore. Why: every descent has something to
  find just past where you have been.

## The Lift (R2b)

An elevator in the **mine-mouth column** (the spawn column), bought at the
workshop in run 1, one segment per biome; each costs about one gate level and
is on sale once you have reached the next biome (the Core segment once you
reach the chamber).

| Segment | Rows | On sale when |
| --- | --- | --- |
| Topsoil | 0-60 | Stone reached |
| Stone | 60-160 | Crystal reached |
| Crystal | 160-280 | Fungal reached |
| Fungal | 280-400 | Magma reached |
| Magma | 400-540 | Ruins reached |
| Ruins | 540-680 | Core reached |
| Core | 680-748 | chamber reached (stops above the heartrock ring) |

- **Building** carves the column through anything, structures and unbreakable
  included, and lines it with a casing that lava, gas and blasts never pass.
  The **head** is the bottom of the deepest segment.
- **Entering:** drop into the column from the mouth, or drive into it from a
  side tunnel at any row at or above the head. The pod clamps to the rail in
  0.1 s (a clunk).
- **Riding:** hold Up or Down: **40 tiles/s** both ways, accelerating at 80
  tiles/s^2; release and the pod holds where it is. No fuel, no gravity, no
  damage, no heat gain (R2b: safe). 680 rows take 17.5 s.
- **Leaving:** press Left or Right where the side tile is open and the pod
  drives off; or drill sideways from the rail (the rail counts as ground) to
  open a new level at any depth. At the top, the pod is set onto the depot
  forecourt and the service runs. At the head, Down releases the pod into the
  column below, which is your own shaft: holding Down there is a fast drop.
- **The fuel tick measures the way to the head** (Fuel to the lift head). Why:
  the bet moves to the frontier, the part of the column without a lift, and
  transit stops being the dive.

## The surface and turnaround

Town spans the 48-tile surface. The **mine mouth** is the open pit at the
spawn column, rows 0-2 (world), where the Lift's top landing sits. The
**depot** is the forecourt between Mo's fuel station and Ines' market, beside
the mouth (R12); the workshop, supply store, lab, rig office and launch site
are further out.

| Action | How | Time |
| --- | --- | --- |
| Land on the depot | touch down on the forecourt, or arrive by Lift | |
| Depot service | automatic: **sell all -> refuel -> repair -> restock items**, each a toggle; a 1.0 s tally (any key skips); Ines' orders show on the depot card | 1.0 s |
| Buy the suggested upgrade | **B** anywhere in town (the suggestion card's gate pick, never a module) | instant |
| Workshop | **U** from anywhere in town opens it in place | 0.2 s |
| Cargo panel | **Tab** | |
| Enter a building | stand at its door, E | 0.2 s |
| Leave a panel | Esc (arrows navigate inside panels); the depot card also closes on any direction key and drives | instant |

If cash is short, the depot does what it can in order (sell, fuel, repair)
and says what it skipped. Why: you can always refuel after selling.

**Turnaround (experienced player, one upgrade):** Lift arrives at the depot
0 s, service skipped 0.5 s, B or U and a pick 1-6 s, Down into the mouth
1 s: **3-8 s**. With no lift yet: drift from the mouth to the forecourt
1.5 s, the same 2-7 s, drop in 1 s.

## Controls

| Key | Action |
| --- | --- |
| Left/Right, A/D | drive; hold against a tile to drill sideways; leave the Lift |
| Down, S | drill down (grounded); fast drop (airborne over an open column); ride the Lift down |
| Up, W, Space | thrust; ride the Lift up; double-tap: Afterburner |
| 1-6 | items |
| 7 | Overcharge (module) |
| Q | scanner pulse |
| X | dump the lowest-value piece |
| E | enter a building (crates and caches are automatic) |
| B | buy the suggested upgrade (town) |
| U | workshop (town) |
| Tab | cargo panel |
| M | map |
| Enter | confirm prompts (tow, fuel cell) |
| Esc | close panel / pause |
| Mouse | menus and panels; never needed in the dive |

## Juice

Camera trauma 0..1 (art's model, offset only); shake only on breaks, impacts
and blasts. Flash alpha is over the view. Effects stay behind and dimmer than
the pod, tiles and hazards.

| Event | Camera trauma | Visual | Sound |
| --- | --- | --- | --- |
| Drilling | 0 | sprite and tile vibration, debris stream | material loop, pitch up 10% over the dig |
| Tile break | +0.10 (+0.18 dense) | 8-14 debris, cracks flash white 1 frame | crack + material tail |
| Ore break | +0.12 | pieces fan out, 2-frame white flash on them | value-tier chime + grace notes |
| Too hard | 0 | sprite bounces 0.15 tile, sparks, red outline 0.3 s | dull clank |
| Unbreakable | 0 | blue-white sparks | ringing clank |
| Thrust | 0 | flame by thrust; flickers when heavy | engine roar, strain overtone at k_m > 4 |
| Fast drop / brake | 0 / landing rule | speed lines; downward flame on the brake | wind; brake roar |
| Landing | clamp((v - 4) / 12, 0, 0.5) | squash 1.25 x 0.8 for 0.08 s, dust | thump by v |
| Fall damage | +0.4 | red flash 0.1 alpha | metal crunch |
| Wall bump (damage) | +0.25 | squash on that axis, sparks | clang |
| Gas fuse | 0 | green swell, cracks glow | rising hiss |
| Gas blast | 0.6 at centre, falls with distance | white-green flash 0.12 alpha, ring, tiles fly | boom, muffled ears 0.5 s if hit |
| Boulder wobble | 0 | +-2 art px at 10 Hz, dust | rattle |
| Boulder lands | 0.3 within 4 tiles | dust cloud | heavy thud |
| Lava contact | 0 | pod tints orange, steam | sizzle |
| Heat > 75% | 0 | shimmer at the view edges, hull glows faint red | ticking |
| Dynamite / big charge | 0.5 / 0.8 | flash 0.2 / 0.3, shockwave ring, chunks | crack-boom / deep boom |
| Core pulse | 0 (a sway: offset, art) | the Seed's glow swells | deep beat |
| Lift clamp / arrival | 0.1 | rail sparks | clunk |
| Teleport | 0 | rising light lines 2.5 s, flash 0.5 on warp | rising tone, whoosh |
| Cache opened | +0.1 | burst, coins or pieces | small fanfare |
| Cargo full | 0 | bay icon flashes twice | low thud |
| Wreck | 1.0 | 1.2 s slow-mo, burst, flash 0.4 | big crunch |
| Surfacing | 0 | light floods in over 0.4 s | town ambience, "home" sting |
| Sale tally | 0 | numbers count up, coins pop | rising ticks, chord sized by the sale |
| Upgrade bought | 0 | pod flashes, the stat's bar sweeps | two-note chime |
| New biome | 0 | name fades in 2 s | stinger in the biome's key |
| Depth record | 0 | "Deepest yet" marker | soft chime |

## A minute of play

### The first dive (L0 everything, 10 L)

- **0:00** Pod on the depot forecourt. Hint: "Down to dig." Drive 1 tile into
  the mouth: a 3-row drop (0.6 s), no damage.
- **0:02** Hold Down: dirt at 0.49 s a tile, a smooth chain. Row 6: the lamp
  catches copper to the right.
- **0:06** Right: 0.1 s engage, two dirt tiles, the copper (ratio 1.15, 0.71 s).
  Pop, chime, "+1 Copper". Two more beside it, the chime rising.
- **0:15** Back to the shaft, down. Row 14: rock slows the rhythm. A cracked
  tile up-left drips dust: a loose boulder. Hint: "Loose rock falls when you
  dig under it."
- **0:25** Digging under it: the rattle, a step right, the thud. Or not: 10 HP,
  a red flash, a cheap lesson.
- **0:35** Row 22, bay 6/8. The tick sits at ~1.3 L of the 4.7 left
  (22 rows x 0.048 L x 1.2): the bay is today's limit. Two iron pieces: 8/8.
- **0:45** Hold Up: cap 6.0 against 7 empty. 22 rows in ~4 s; light floods in.
- **0:52** Land on the forecourt: sale, refuel, and the first upgrade is
  affordable. **About a minute to the first upgrade.**

### A magma dive (mid game, lift to row 280)

Pod: drill L12 (P 14.6), engine L11 (T 2,435, climb cap 19.7), tank L10
(62 L), hull L11 (297), cargo L10 (48), radiator L8 (280 C, frontier row
477), lamp L8, scanner L4; modules Heat Sink, Magnet Coil, Afterburner. The
Lift reaches 280; the Fungal segment is next on the list. The player's shaft
continues below the head to row 468. Items: 2 fuel cells, 1 repair kit,
3 dynamite, 1 coolant.

- **0:00** Off the forecourt into the Lift: 280 rows at 40, 7.5 s.
- **0:08** Down at the head: fast drop 188 rows in 7.9 s, braked at 468. Fuel
  barely moves; the tick now measures 188 rows of climb.
- **0:16** T(470) = 272: the gauge fades in. Basalt at ratio 0.89 (0.61 s).
  Q: a platinum cluster 10 tiles right at rows 474-478, a lava pocket's orange
  outline just above it.
- **0:20** Plan: tunnel one row **below** the seam, leaving a 3-tile sump to
  the left. A tile breaks into the pocket's edge: lava comes down at 1 tile per
  0.5 s, so the player has a beat to step aside; it fills the sump and stops.
- **0:40** Mining the seam beside the pool: T_eff 272 + 120 = 392, 112 over,
  heat +3.9%/s with Heat Sink. Coolant at 60%, 20 s window. Each platinum tile
  gives 3 pieces; the chimes climb.
- **1:20** A cinnabar vein back toward the column, then fire opal on a lava
  lake's rim further down (the gauge comes and goes).
- **2:40** Bay 42/48 (15 Cinnabar, 12 Platinum, 9 Fire opal, 6 Diamond:
  82.6 mass, k_m 5.1, T/m 23.8). Fuel 34 L of 62. The tick: 199 rows to the
  head at 0.108 L a row, need 26 L, so 34 / 26 = 1.31: amber, "Head up soon".
  One more platinum pair in scan range, 8 rows down at 487 (T 290, just past
  the frontier).
- **The bet:** taking it fills the bay (48/48, k_m 6.0, T/m 20.4, just above
  "Overloaded") and costs ~1.5 L; the need rises to ~31 L against ~32.5 left:
  red, "Turn back now". A fuel cell (+31 L) makes it safe and costs a slice of
  the six pieces' value; skipping leaves $2.6k of platinum. Running dry is no
  escape hatch: a tow leaves the whole bay in a crate at row ~400 and costs a
  tank. The player takes the pair, burns a cell, climbs 207 rows in 26 s at
  8 tiles/s (1.0 L/s), and rides home in 7.5 s. Transit: 7.5 + 7.9 + 2.3
  (driving to the column) + 26 + 7.5 = 51 s of a ~3.4-minute dive, 25%.
  Buying the Fungal segment would take the climb to 87 rows.

### A Core dive (late run 1, full Lift)

Pod: drill L17 (P 44.4), engine L20 (climb cap 30), tank L16 (185 L), hull
L18 (1,065), cargo L18 + Dense Packing (100 slots), radiator L16 (frontier
743); modules Dense Packing, Heat Sink, Magnet Coil, Afterburner. Lift head at
748.

| Leg | How | Seconds |
| --- | --- | --- |
| Forecourt to the rail | 1 tile | 0.5 |
| Down to row 718 | Lift, 40 tiles/s | 18.4 |
| Out to the Heartstone vein | drive 6 tiles along a side tunnel opened on an earlier dive | 1.0 |
| **Mining** | ~25 ore tiles (4 pieces each) and ~110 rock tiles at 0.67-1.1 s, aiming, two pulses | ~125 |
| Climb back 15 rows | k_m 11.3, cap 8.9 | 1.8 |
| Drive back 6 tiles | loaded V_x 4.4 | 1.6 |
| Up to row 0 | Lift | 18.4 |
| **Total** | transit 41.7 s of 167 s | **25%** |

The haul: 56 Heartstone, 36 Stellite, 8 Seedglass (mass 207). Fuel used: ~16 L
drilling, ~3 L climbing, ~2 L driving: 21 L of 185. The dive ends on a full
bay (25 Core tiles), with the pulse (T 395 at row 718, +80 for 1.5 s: 35 over,
~1.8% heat each with Heat Sink, more below the frontier at 743) and hull the
live meters. Without the Core segment (head 680) the
climb is 38 rows (4.5 s) and transit 44 s: both under R2's 30% and 45 s.

## The tension curve of a dive

Why "can I make it back?" stays real at every stage:

1. **Home is the lift head.** The Lift is always one biome behind: a segment
   goes on sale only once you reach the biome below it, and costs a gate
   level. So the frontier biome, the one with the best ore, is the one you
   climb out of under your own fuel.
2. **The climb's cost grows with load and depth below the head.** fuel_row
   rises roughly linearly with load (`k_m^0.5` twice: more burn, slower
   reference climb). Every piece makes the way home dearer, exactly when the
   bay is most valuable. A faster engine shortens the climb, never its fuel.
3. **Down is cheap and fast.** The Lift and the fast drop make it easy to go
   too deep; the tick says so.
4. **Four clocks, in turn.** Early: cargo (8 slots). Middle: fuel at the
   frontier. Deep: heat (sprints past the frontier, the pulse) and hull; cargo
   again, since 3-4 pieces a tile fill a bay in 16-25 tiles. Each stage's tight
   meter is a different purchase.
5. **Ripcords cost more than turning back.** Fuel cells, repair kits and
   coolant buy a bad bet out at a price; the tow leaves the haul behind as a
   crate and costs a tank; the teleporter keeps 70%. Bot check (R1): no
   strategy that ends dives on a tow or a teleport earns more per minute.
6. **Transit is never the dive** (R2): at most 30% of any dive, at most 45 s
   late. The worked dives give 25% (Magma, no Fungal segment) and 25% (Core).

HUD (top-left, compact at 720x390): fuel bar with the home tick and lift icon,
hull bar, cargo segments ("Overloaded" near the thrust floor), heat gauge when
relevant, depth in metres. Items 1-6 and the Overcharge key bottom-centre,
dimmed when empty or cooling.

## Open questions

- **Progression:** with the Lift, the tank's late job is the frontier climb
  plus heat's x1.5 (the Core dive above uses 21 L of 185). Re-derive the tank
  gates against "deepest frontier row minus lift head", not the surface; the
  bot's D16 share (at most 60% of late dives on fuel) will fall, which is
  allowed.
- **Progression:** Lift segment prices ("about one gate level") and whether
  the Core segment exists in run 1 or is the lance frame's companion.
- **World:** the Lift column (spawn column 23 or 24) carves through whatever
  structure it meets (the Kiln, a ruins room): keep structures off it, or let
  it cut them?
- **World:** core pulse period, spore cloud and arc pylon numbers above are
  placeholders until world.md states them.
- **Audio:** the per-tile chime with n - 1 grace notes must stay consonant at
  4 pieces and a +7 streak.
