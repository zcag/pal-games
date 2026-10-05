# Seedfall: design

A mining incremental in the manner of Motherload: fly a drilling pod down
through a planet, haul ore back up, sell, upgrade, go deeper. Under it all sits
the Seed; reaching it and launching it is the prestige, and you follow it to
the next planet. (Made as a standalone game in the repo `deepcore`, ported to pal's
games; the documents in `design/` name that repo's paths: `src/game/` is `game/` here,
`src/surface/` is `surface/`.)

This file is the master design. It holds the pillars, every decision that
settles a conflict between the parts, the scope of v1 and the architecture.
The detail lives in four parts, which are part of this design and must agree
with it (where they disagree, **this file wins**):

| Part | Owns |
| --- | --- |
| [design/core-loop.md](design/core-loop.md) | pod physics, drilling, fuel, hull, cargo, heat, lamp, scanner, hazards' rules, items, pickups, the town turnaround, controls, juice |
| [design/progression.md](design/progression.md) | prices, upgrade levels and costs, consumables, rigs, silo, drones, research, prestige, planets' modifiers, offline, achievements, guards, daily hooks, the dock flow |
| [design/world.md](design/world.md) | premise, town and people, biomes, materials, ores, jackpots, artifacts and story, world generation, planets' looks, the collection log |
| [design/art.md](design/art.md) | rendering pipeline, lighting, tile look, palettes, readability spec, the pod, the town, particles, UI style, performance |

## Pillars

1. **Every dive is a bet.** Fuel, hull, cargo and heat each say "turn back"
   at a different moment; the HUD always says how close each is (the fuel bar
   carries a "fuel to get home" tick).
2. **The pod does what your thumb says.** Snappy on the ground, weight felt
   in the climb; drilling is crunchy, per material.
3. **Danger is told before it bites.** Every hazard has a tell visible or
   audible at least one second or one tile before it hurts.
4. **Losing costs a dive, never a session.** No upgrade is ever lost.
5. **Always a next thing.** A purchase every few minutes, a new biome every
   10-25 minutes, a story thread that pulls down, a reason to launch.
6. **Readable first, then stunning.** Pod > hazards/ores > diggable rock >
   undiggable rock > tunnels > background, in luminance and outline rules
   (art.md section 6). Effects stay behind and dimmer.

## Decisions that settle the parts

| # | Question | Decision |
| --- | --- | --- |
| D1 | Hardness anchor | Typical rock of biome b is `1.9^b` (1 .. 47). The hardest diggable things (core shell, heartrock ring) reach ~75-100; vault seals 95. World's per-material table is the source. |
| D2 | Temperature | One curve, piecewise linear in row: (0, 15), (160, 40), (280, 90), (400, 200), (540, 345), (560, 300), (680, 330), (770, 485) degrees C; lava within 2 tiles +60 each (max 3); the core pulse +80 for 1.5 s. Radiator `R = 120 + 40L` (10 levels). Gates: Fungal bottom R2, Magma R4 then R6 at its floor, Ruins R6 (a relief after Magma, as world.md wants), Core R8, chamber R10. Heat rules are core-loop's. |
| D3 | Cargo | Slots (core-loop). Mass is per ore (world.md's kg / 10, times `1.12^b`), and drives climb speed and thrust burn, so Lead (heavy, cheap) and Voidstone (light, rich) are real choices. |
| D4 | Ore prices | `8 x 1.95^(T-1)` by world's tier (progression). Planet value and Seed age multiply. |
| D5 | Jackpots | Capped at about 3 hauls at their depth: x6 to x10 the biome's top ore, not x20-30. The fanfare stays. |
| D6 | Creatures | Scenery only (bats, glass moths, cinderlings, crickets): they react to the lamp and never hurt. Hurting things follow the hazard rules. |
| D7 | The core pulse | Heat spike and a screen sway, **no push** (a push would fight the drilling feel). |
| D8 | Waking the Seed | Research Core Lance Plans, buy the lance in three parts at the launch site (from Core entry), bring 5 Heartstone, dock with the Seed. |
| D9 | Vault seals | Hardness 95 (a lure for the end of the run or the next); the Sower door-key (A13) drops them to 25. |
| D10 | Scanner | A pulse on Q (from scanner level 1); passive pulse every 10 s from level 5. Outlines persist on the map. |
| D11 | Too hard | Told on contact (bounce, clank, label naming the drill level) and, within 2 tiles of the pod, a sparse dot hatch on tiles the current drill cannot dig. |
| D12 | Lava | Cellular flow into opened tiles (down fast, sideways slow), up to its volume; it crusts into basalt after 15 s of standing still. |
| D13 | Day cycle | 10 minutes, always running, including while underground. |
| D14 | Overcharge | Key 7 (research E6). |
| D15 | Wreck | Cargo goes into a wreck crate you can recover; artifacts carried are kept (they weigh nothing and go to the lab on the next surfacing). |
| D16 | Late dives end on fuel | Accepted as the deep-game tension (progression Q1), but the bot must show at most 60% of late dives ending on fuel; the lever is the thrust-burn mass exponent, then ore mass, never the tank. |
| D17 | Ore hit rate | The 18%-of-tiles and 1-row-per-3-tiles assumptions are replaced by what the bot measures in the real world. |
| D18 | Rigs | Mine plain rock only, never structures; unlock at first reaching Stone. |
| D19 | Title | **Seedfall** (world.md section 9). It names the payoff and the loop. |
| D20 | Pod tiers | The pod is 16x14 art px. Drill bit, hull plating and engine flame change on the pod; tank, cargo, radiator fins, lamp and scanner as small parts; when a part has more tiers than pixels, the extra tiers go to its glow and colour. |

## Decisions after review 1 (design/review-1.md)

These supersede anything in the parts. The parts have been revised to match.

| # | Finding | Decision |
| --- | --- | --- |
| R1 | The tow beats turning back | A tow brings back **the pod only**: the cargo stays where it ran dry, as a crate (the wreck-crate rule). The fee is the price of one full tank. The **teleporter** brings pod and cargo home but **30% of the pieces are lost in the jump** (the cheapest ones first). Bot check: no strategy that ends dives on a tow or a teleport earns more per minute than turning back at the tick. |
| R2 | Transit dominates late dives | (a) Climb cap `min(30, 7 + 1.15 L) x k_m^-0.5` tiles/s while thrust burn per **row** stays as before (burn per second scales with speed), so the fuel tick math is unchanged. (b) **The Lift**: an elevator in the mine-mouth column, bought at the workshop in run 1 one segment per biome (Topsoil to Stone, ... ; each segment about one gate level's price, available once that biome is reached). It carves its column through anything, rides at 40 tiles/s both ways, costs no fuel and is safe. The fuel tick measures the way to the **lift head** (the deepest built segment), not to the surface. (c) In a column that is open below you, holding Down drops at up to 25 tiles/s and brakes on its own 3 tiles above the floor (no fall damage when braking). Target: transit at most 30% of any dive, late transit at most 45 s. |
| R3 | Deep biomes run out of ore | Ore tiles yield `1 + floor(b / 2)` pieces (b = biome; Core 4). Vein counts in Magma, Ruins and Core x1.5. The bot plays the real finite world and reports ore left per biome at launch (target at least 30%). |
| R4 | Prestige is flat | Targets (bot minutes): run 2 at most 60% of run 1, run 4 at most 45 min, a replayed planet at most 30 min. Seed age multiplies **value only** (x1.3^n) and hazard damage mildly (x1.08^n); no hardness scaling, so Drill Mastery is optional comfort. Head Start has 5 levels (up to the Ruins gates). Market Contacts is x1.25 compounding. Shards `= floor(12 x (E / 1M)^0.6 x (1 + 0.2 n) x lens) + 10 (+5 first launch from a planet)`. Each planet replaces one mid-column biome with its own (unique ore, hazard and 6 relics), so the fast part is familiar and the slow part is new. |
| R5 | Run 2 on Cinder cannot finish | Planet heat modifiers apply only to the planet's own biome rows. The simulator asserts every planet offered at launch has a reachable chamber. |
| R6 | Frozen depth late; the lance wait | Radiator: **20 levels of +20 C** (`R = 120 + 20L`), growth 1.4, so the heat frontier moves 10-15 rows per purchase. Lance total ~$380k (frame 60k, coil 120k, head 200k); the 5 Heartstone are the real gate. **Lance plans are free**: unlocked when you first reach the Core biome (Sefa reads the Seed husk A18 if found). Target: depth-frozen time at most 20% of a run, no single freeze over 6 bot minutes. |
| R7 | The shop is a checklist | **Pod modules**: research unlocks modules; the pod has module slots (2 at the start, +1 at Fungal, +1 from research), swapped for free in the workshop. Modules: Magnet Coil, Heat Sink, Dense Packing, Afterburner, Smelter, Helper Drone, Prospector's Ear, Overcharge, Vein Tracer, Fuel Recycler. The suggestion card suggests gates only and never a module. |
| R8 | Explosives bypass gates | Dynamite clears `H <= 2.5P` (time and area, not depth). Big charge `H <= 3.2P` (one level early). Overcharge (module): `ratio := max(0.25, ratio / 4)`, only where `ratio <= 5`; never vault seals or the core shell. |
| R9 | No audio design | `design/audio.md` is written by the audio owner before building: synth voice per material, a pentatonic chime ladder by tier, biome music that thins as fuel nears the tick, a mix budget (tells above music), master, music and effects volumes and mute. |
| R10 | Thin short-term hooks | **Ines' orders**: 2 orders on the depot card, refreshed every 3 docks ("6 Sapphire in one haul: x1.6 on them", "a haul with no Lead: +20%"); they replace daily contracts. **Caches** in every biome, about 1 per 15 rows, themed (crate, mine cart, fossil geode, spore cache, ember chest, Sower coffer, seed pod). A **rich pocket** each dive: one seeded vein at x2 size within 25 rows below your deepest row, shown with a faint shimmer in the scanner. |
| R11 | Readability bands overlap | Bands (final L): back wall 0.03-0.06, far rock 0.02-0.05, undiggable 0.10-0.16, diggable 0.24-0.38, ores and hazards 0.55-0.85, pod highlights 0.6-0.95. The squint check compares p90 of the lower layer with p10 of the upper one. In the Core, undiggable rock gets a 2 px outline plus the diagonal hatch. Every one of the 26 ores is mapped to a shape class (world.md), distinct within a biome. Gold is `#e0c040` (greener than the pod's `#d8a030`); nothing glows before Crystal except jackpots. |
| R12 | Contradictions | Heat: D2/R6 only. Camera: art.md (no rotation or zoom ever; shake is offset only). Gas: drilling the gas tile itself starts a fuse of `0.8 x k_m^0.25` s, blast radius 2, no push. Lava: 1 tile per 0.5 s down, 1 per 1.5 s sideways. Pulse: no push. Pod tiers: progression's gate-aligned table, art draws it. Lamp: radius `min(10, 3.5 + 0.5L)` (core-loop), cone half-angle `40 + 1.5L` degrees (art's look). Town: the **depot** is the forecourt between Mo's fuel station and Ines' market; landing there runs the automatic service. Keys: `B` buys the suggested upgrade (base feature), `U` opens the workshop from anywhere in town, `Tab` the cargo panel; direction keys close the depot card and drive; inside building panels the arrows navigate and Esc closes (QA Q12). Hardness: each biome has one **dense** material at 2.0x typical in about 10% of its tiles (the drill gates assume it). Ore mass per D3, re-measured by the bot. |
| R13 | Feel risks | Camera shake only for breaks, impacts and blasts; drilling vibrates the pod sprite and the tile, not the camera. Auto-brake (R2c). Ore Sense is the first research node, affordable by dive 3. |
| R14 | Scope | v1 planets: **Vell, Cinder (heat), Ferrum (dense ore, magnetic storms)**. Glaze, Mire, Hollow and Orrery are later. Research tree about 20 nodes plus the modules (Waystation and Ore Chute are folded into the Lift; Twin Drones and handicap contracts are later). Daily contracts become Ines' orders; the market board, supply crate, rested bonus, offline card and silo stay. |
| R15 | The bot | Two levels: a scripted dive runner on the real rules that measures per-biome statistics (pieces per minute, transit share, damage, fuel endings), and a session simulator that plays full runs through the real shop with that runner. |
| R16 | Run 1 length (progression.md Q1) | The model launches run 1 at ~60 bot minutes (perfect play); humans are 1.5-2x slower. Target for the real bot: **first launch at 80-110 bot minutes** (2-3 h for a person), reached by depth goals rather than price walls (caches, rich pockets, relics, orders and the frozen-depth limit of R6 stay). The economy agent tunes it with the real bot. |

## Scope of v1

In: all seven biomes with their materials, ores, structures, hazards
(sand, boulders and cave-ins, gas, spore clouds, heat, flowing lava, arc
pylons, false floors, the pulse), jackpots, the 19 artifacts and story beats,
the town and its seven people, all eight upgrades, the six items plus
Overcharge, the scanner, rigs and silo, drones, the research tree,
prestige (lance, launch sequence, shards, perks), Cinder and Ferrum beyond
Vell (R14), Seed age, the Lift, pod modules, Ines' orders, caches and rich
pockets, offline progress, achievements, the
collection log, the daily market board, supply crate and rested bonus, master volume and mute, settings.

Later (not v1): planets Glaze, Mire, Hollow and Orrery; Twin Drones; handicap contracts; the weekly survey mini-world; colour-blind simulation
filters (the shape-class rule for ores is in v1); gamepad.

## Architecture

- `game/`: the rules. No DOM, no WebGL, deterministic from a seed, stepped
  at a fixed 60 Hz. It emits typed events (`dig`, `break`, `pickup`, `damage`,
  `explode`, ...) that the surface turns into sound, particles and UI.
- `surface/`: rendering (WebGL2), UI (HTML over the canvas), audio
  (WebAudio), input, the main loop, storage; pal's game page (`index.html`).
- `scripts/economy.ts`: a headless simulator: player-like bots play the real
  rules from a fresh save and spend through the real shop; it reports the
  targets in progression.md section 9.
- Saves: one versioned JSON through `surface/storage.ts` into pal's storage
  for the extension, autosave every 10 s, after a sale or a purchase, when the
  panel hides and when Escape leaves; the world is regenerated from its seed
  and the save keeps only the difference. Signed in, it syncs by pal.json's
  rules (`game/sync.ts`): the world and the run go with the machine that wrote
  last, what is kept for good (achievements, the log, research, perks, shards,
  records) merges.

## Measured pacing (the economy simulator, final tuning)

`bun scripts/economy.ts --bots 5 --runs 10 --threads 8`: player-like bots
(`game/bot.ts`, human reaction delays, only what a person can see) play
the real rules from fresh saves through the real shop. Casual / regular /
good bot:

| Metric | Target | Result |
| --- | --- | --- |
| First upgrade | about 1 min | 30 / 27 / 23 s |
| Docks with a purchase in the first hour | 20+ | 23 / 25 / 23 |
| Purchases per dock, p90 / max | 4 / 6 | 4-5 / 5-6; at most 2 levels of one stat |
| Regular bot, minutes per biome | new biome every 10-20 min early | Stone 3.5, Crystal 13, Fungal 9, Magma 24, Ruins 10, Core and chamber 20 |
| First launch | 80-110 bot min (R16; 2-3 h for a person) | 101 / 84 / 89 |
| Runs 2-10 (regular) | faster each run, late runs 20-30 | 60, 47, 33, 31, 24, 24, 21, 26, 23 |
| Shards per run (regular) | rise each run | 43 rising to about 200 by run 10 |
| Tows and wrecks | rare | median 0-1 per run on every planet |
| Ore left in the emptiest biome at launch | 30%+ | 43-50% |
| Idle share of income | 15-30% | 21-27% |
| Soft locks | 0 | 0 |

Misses kept on record: transit is 36-38% of a dive (target 30%; most of it is
the bot climbing back through winding tunnels with a heavy bay); the longest
stretch without a purchase is about 8 minutes (target 6); the good bot's
late runs drop to 14-18 minutes. Tuning log: the top of `scripts/economy.ts`.
