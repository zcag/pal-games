# Seedfall: progression and economy

Owner: progression and incremental systems. Covers ore prices, upgrade levels
and costs, the Lift's prices, consumables and ripcord prices, pod modules,
rigs and the silo, research, prestige (the lance, shards, perks, planets, Seed
age), reward cadence (Ines' orders, caches, rich pockets), offline progress,
achievements, the guards, daily hooks and the dock flow.

DESIGN.md's decisions (D1-D20, R1-R15) win over this file. Stat effects are
core-loop's, materials, ores, caches and planets' content are world's. Every
number is a starting point for the bot (R15); the formulas and rules are the
contract.

**How the numbers were made.** A first-pass model (a throwaway script, not in
the repo; `scripts/economy.ts` replaces it) plays run 1 and runs 2-4 dive by
dive:

- **World:** finite and persistent. Ore tiles per 10-row band from world's
  vein table with R3 (yield `n_b = 1 + floor(b/2)`, veins x1.5 from Magma
  down); mined bands deplete.
- **Hit rate** (D17): ore tiles found per tile dug = the band's remaining ore
  density x a steering factor: 1.3, +0.1 Ore Sense, +0.4 scanner L1 and +0.1
  per further level, +0.02 per lamp level, cap 2.6; Vein Tracer x1.15. Deep,
  that is about 10% of tiles dug.
- **Physics:** dig time and burn per core-loop. Climb `min(30, 7 + 1.15L) x
  k_m^-0.5` with burn per row at the old reference cap (R2a). Lift 40 tiles/s
  plus 1.5 s to board. Fast drop 25 tiles/s. Dock 4 s, +3-6 s when buying.
- **The bot plunges:** each dive it picks the 30-row band with the best $/min
  it can reach (heat frontier +6 rows, +20 with Heat Sink; drill entry level;
  hull gate). It digs the shaft there and mines until the bay is full, the
  fuel tick says go, or 4 minutes pass.
- **Buying:** gates first (cheapest first), then at most one comfort level
  per town visit if it pays back in 6 minutes (3 while a gate is missing),
  then 35% of income into rigs. With Head Station it visits town every third
  dock. Research follows a fixed order.
- **Rewards:** one rich pocket per dive, trimmed to 15% of the bay. Caches as
  6 average pieces, 60% found. Ines' orders as +5% on sales.
- **Runs 2-4:** shards buy Head Start first, then the cheapest of Market
  Contacts and Kept Rigs.

The bot never explores, reads, wrecks or fumbles. A human takes **1.5 to 2x**
its time.

---

## 1. Economy curve

### Ore prices (D4)

```
price(T) = 8 x 1.95^(T-1)          x planet value x 1.3^n (Seed age)
T:  1   2   3   4    5    6    7    8     9    10    11     12
$:  8  16  30  60  115  225  440  860  1670  3260  6360  12400
```

Why 1.95: each biome's ores sit about 1.5 tiers above the last, so a piece is
worth about 2.7x more per biome, close to how fast gate prices climb.

### Supply per biome (R3) and what run 1 sells

Pieces and tiles are world's (section 4, "Ore share per biome"). Average piece
is weighted by world's tiles. The model's supply was within 12% of these.

| Biome | Ores (tier) | Ore tiles | n per tile | Pieces | Avg piece | Avg tile | Supply value | Run 1 sells | Left at launch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 Topsoil | Coal 1, Copper 1, Tin 2 | 189 | 1 | 189 | $9.5 | $9.5 | $1.8k | ~14 | 93% |
| 1 Stone | Iron 2, Lead 2, Silver 3, Gold 4 | 225 | 1 | 225 | $22 | $22 | $4.9k | ~16 | 93% |
| 2 Crystal | Quartz 3, Amethyst 4, Sapphire 5, Emerald 6 | 229 | 2 | 457 | $76 | $152 | $35k | ~55 | 88% |
| 3 Fungal | Sporestone 5, Jade 5, Moonstone 6, Lumen amber 7 | 175 | 2 | 350 | $157 | $313 | $55k | ~75 | 79% |
| 4 Magma | Cinnabar 6, Platinum 7, Fire opal 8, Diamond 9 | 215 | 3 | 645 | $479 | $1.4k | $309k | ~230 | 65% |
| 5 Ruins | Sower scrap 8, Orichalcum 9, Sunglass 9, Voidstone 10 | 221 | 3 | 662 | $1.6k | $4.8k | $1.05M | ~65 | 90% |
| 6 Core | Heartstone 10, Stellite 11, Seedglass 12 | 122 | 4 | 486 | $4.7k | $18.8k | $2.28M | ~185 | 62% |
| Ash hollows (Cinder) | Jade 5, Moonstone 6, Sunstone 7 | 176 | 2 | 352 | $232 | $464 | $82k | | |
| Banded deeps (Ferrum) | Quartz 3, Amethyst 4, Sapphire 5, Lodestone 6 | 208 | 2 | 414 | $104 | $208 | $43k | | |

Plus about 110 rich-pocket pieces (section 9), mostly from Magma down. Every
biome keeps well over R3's 30%. The Ruins stay 90% full because the plunging
bot crosses them on the way to the 4x richer Core. Their ore and sealed vaults
are the next run's lure.

Within a biome a tile in the bottom quarter is worth about 1.5x one in the top
quarter, because the higher tiers sit deeper. From the bottom of one biome to
the top of the next, a **piece** rises at most 1.7x. A haul is slot-limited,
so a haul's value rises at most 1.7x too, even where pieces per tile step up
(Crystal, Magma, Core).

### Cash per minute and dive shape (model, run 1)

| Biome | Dives | Active $/min | Avg haul | Dive length | Transit (share) | Ends on fuel |
| --- | --- | --- | --- | --- | --- | --- |
| Topsoil | 2 | 57-70 | $80 | 72 s | 9 s (12%) | 1 of 2 |
| Stone | 4 | 101-129 | $149 | 73 s | 19 s (26%) | 4 of 4 |
| Crystal | 5 | 580-1,224 | $1.4k | 86 s | 26 s (30%) | 5 of 5 |
| Fungal | 4 | 1.7k-2.5k | $4.6k | 126 s | 31 s (24%) | 4 of 4 |
| Magma | 8 | 5.0k-11.4k | $21k | 143 s | 46 s (32%) | 4 of 8 |
| Ruins | 2 | 31k-38k | $86k | 150 s | 46 s (30%) | 0 of 2 |
| Core | 5 | 80k-121k | $232k | 148 s | 43 s (29%) | 1 of 5 |

Early dives end on fuel (a 10-30 L tank against the frontier climb). From
Magma down most end on a full bay, because 3-4 pieces a tile fill it in 15-25
ore tiles (D16: 33% of late dives end on fuel, under the 60% cap).

### Fuel and repair

```
fuel per litre = 0.4 x 2.2^b_deep        (b_deep = deepest biome reached)
repair per HP  = 0.4 x fuel per litre
```

| b_deep | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| $/litre | 0.40 | 0.88 | 1.94 | 4.26 | 9.37 | 20.6 | 45.4 |
| Full tank / haul (model) | 5% | 6% | 2% | 2% | 1.1% | 0.7% | 0.6% |

Fuel's job is the tick (range), not cost. A full tank is also the tow fee
(section 4).

---

## 2. Projected timeline

### Run 1 on Vell (model output)

Min is the dock where the purchase happens. Row is the deepest row after the
next dive.

| Min | Row | Biome | Active $/min | Idle $/min | Bought (level after) |
| --- | --- | --- | --- | --- | --- |
| 0:00 | 40 | Topsoil | 57 | | first dive |
| 1:13 | 60 | Topsoil | 70 | | Drill 1 ($75): **first upgrade** |
| 2:24 | 90 | **Stone** | 101 | 9 | Drill 2 ($126, Steel bit), Lift Topsoil segment ($80), Cargo 1, first rig; Ore Sense, Silo |
| 4:54 | 140 | Stone | 118 | 57 | Hull 1-2 |
| 6:00 | 160 | Stone | 129 | 57 | Drill 3 |
| 7:12 | 170 | **Crystal** | 580 | 57 | Lift Stone segment ($210), Cargo 3; Vein Tracer, Assay |
| 8:30 | 210 | Crystal | 796 | 86 | Drill 4-5 (**Carbide auger**), Tank 1 |
| 10:00 | 240 | Crystal | 963 | 152 | Scanner 1 ($400) |
| 11:30 | 270 | Crystal | 1,107 | 152 | Hull 3-4, Drill 6-7 |
| 14:24 | 310 | **Fungal** | 1,721 | 485 | Lift Crystal segment ($1.0k), Cargo 4; third module slot; Dense Packing |
| 16:18 | 340 | Fungal | 2,187 | 599 | **Radiator 1** ($850), Drill 8 (**Diamond crown**), Tank 3 |
| 18:24 | 360 | Fungal | 2,139 | 1,049 | Radiator 2, Hull 5-6, Engine 1 |
| 20:30 | 380 | Fungal | 2,462 | 1,220 | Radiator 3, Drill 9 |
| 22:48 | 420 | **Magma** | 4,991 | 1,574 | Radiator 4-5; Helper Drone |
| 25:06 | 440 | Magma | 7,736 | 1,710 | Radiator 6, Lift Fungal segment ($4.8k), Drill 10 |
| 27:30 | 460 | Magma | 9,307 | 2,072 | Radiator 7, Drill 11 (**Thermal drill**) |
| 29:42 | 480 | Magma | 9,459 | 4,424 | Radiator 8, Tank 5 |
| 31:54 | 500 | Magma | 9,646 | 4,424 | Radiator 9, Hull 7-9 |
| 34:12 | 520 | Magma | 9,960 | 5,707 | Radiator 10 |
| 36:36 | 520 | Magma | 8,115 | 7,106 | Drill 12, Lamp 1 |
| 39:24 | 540 | Magma | 11,393 | 7,921 | Radiator 11 |
| 41:54 | 600 | **Ruins** | 30,695 | 7,921 | Lift Magma segment ($22.6k), **Radiator 12** (all Ruins); Head Station |
| 44:18 | 670 | Ruins | 37,624 | 9,044 | Drill 13-14 (**Sower-steel bit**), Cargo 7 |
| 46:54 | 700 | **Core** | 81,761 | 9,044 | Hull 10-11, Drill 15; lance plans (free) |
| 49:36 | 740 | Core | 107,308 | 9,044 | Radiator 13-14, Lift Ruins segment ($107k) |
| 51:36 | 740 | Core | 79,773 | 17,599 | Lance frame + coil ($180k), Radiator 15; Heat Sink |
| 54:48 | 760 | **Chamber** | 121,217 | 17,599 | Radiator 16, Drill 16 (heartrock): reaches the Seed with Heat Sink |
| 59:44 | | **Launch** | | | Lance head ($200k), Radiator 17, 5 Heartstone; **+33 shards** |

Totals: 30 dives, $2.05M earned (sales 75%, rigs 15%, caches 10%), launch at
**60 bot minutes, about 1.5-2 h for a human**. Biome times (bot min): Topsoil
2.4, Stone 4.8, Crystal 7.2, Fungal 10.7, Magma 16.8, Ruins 7.8, Core and
chamber 10.1.

### Runs 2-4 (R4)

| Run | Planet | n | Perks played with | Bot min | vs run 1 | E | Shards | Shards/h | Modules most used (share of dives) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Vell | 0 | none | 59.7 | 100% | $2.05M | 33 | 33 | Vein Tracer 80%, Dense Packing 53%, Helper Drone 47%, Heat Sink 10% |
| 2 | Cinder | 1 | Head Start II | 36.8 | **62%** | $2.06M | 37 | 60 | Vein Tracer 100%, Helper Drone 100%, Dense Packing 61%, **Heat Sink 56%**, Magnet Coil 22%, Smelter 17% |
| 3 | Ferrum | 2 | Head Start II, Market Contacts II, Kept Rigs I | 32.3 | 54% | $8.05M | 73 | 136 | **Dense Packing 100%**, Vein Tracer 100%, Helper Drone 83%, **Smelter 67%**, Heat Sink 33% |
| 4 | Vell (replay) | 3 | Head Start III, Market Contacts II, Kept Rigs I, Prospector I, Shard Lens I | 28.6 | **48%** | $8.72M | 87 | 183 | Vein Tracer, Dense Packing, Helper Drone 100%, Heat Sink 46%, Smelter 46% |

Against R4: run 2 is 62% of run 1 (target 60%, at the line), run 4 is 29
minutes (target 45), and the replayed planet is 29 minutes (target 30).
Compression comes from Head Start skipping the familiar biomes, value x1.3^n
times Market Contacts against fixed workshop prices, and research kept. The
new biome takes the time: on Cinder the radiator race starts at row 283
instead of 313. Every offered planet reached its chamber (R5).

### Sensitivity

| Change | Run 1 | Frozen depth |
| --- | --- | --- |
| Hit rate x0.7 | 72 min | 21%, longest 8.3 min |
| Hit rate x1.3 | 55 min | 0% |
| Workshop prices x1.3 (indicative sweep) | ~+10 min | ~25% |
| Workshop prices x1.6 (indicative sweep) | ~+30 min | ~40% |

**The run's length is capped by R6, not by ore.** A plunging player stands at
the deepest row it can reach. Depth moves only when a depth gate is bought:
a radiator level, a biome entry, drill 16. So the run is about (number of
depth steps) x (time to afford each), and pricing the steps higher turns the
extra time straight into frozen depth. To make run 1 longer within R6, add
depth steps, not price.

---

## 3. Upgrades

### Prices

```
cost(stat, L -> L+1) = base x growth^L
```

| Stat | Cap | Base | Growth | L1 | L5 | L10 | Last | Total | Kind |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Drill | 21 | 75 | 1.68 | 75 | 597 | 8.0k | 2.41M | 5.9M | **gate** (hardness) |
| Radiator | 20 | 850 | 1.40 | 850 | 3.3k | 17.6k | 508k | 1.78M | **gate** (heat), R6 |
| Hull | 16 | 100 | 1.80 | 100 | 1.0k | 19.8k | 668k | 1.5M | **soft gate** (hazards) |
| Fuel tank | 18 | 30 | 1.50 | 30 | 152 | 1.2k | 29.6k | 89k | **soft gate** (frontier climb) |
| Engine | 20 | 100 | 1.65 | 100 | 741 | 9.1k | 1.36M | 3.4M | comfort (climb, overload) |
| Cargo | 20 | 40 | 1.60 | 40 | 262 | 2.7k | 302k | 806k | comfort (haul size) |
| Lamp | 13 | 150 | 1.70 | 150 | 1.3k | 17.8k | 87k | 212k | comfort (planning) |
| Scanner | 8 | 400 | 2.40 | 400 | 13.3k | | 184k | 314k | comfort (a feature per level) |

Why each growth:

- **Drill, 1.68.** About 3 levels per biome. The cheap base makes the first
  upgrade one haul. 1.68 puts drill 16, the chamber's level, at $180k, about 2
  minutes of Core income.
- **Radiator, 1.4 over 20 levels (R6).** Each level is +20 C, 12-22 rows of
  frontier: "one more dive, 15 rows deeper". At 1.4 the Magma ladder (L5-L11)
  costs $3.3k-$24.6k a level against $5k-$11k a minute. It is the one stat under the
  1.45 floor because its levels are half-size.
- **Hull, 1.8; cap 16.** About 2.5 levels per biome against hazards growing
  1.6x per biome. The cap is lower than core-loop's 20 because late levels are
  only for high Seed age (hazard x1.08^n).
- **Tank, 1.5.** Cheap on purpose: with the Lift its job is the frontier
  climb, and fuel is the tension.
- **Engine, 1.65; cargo, 1.6.** The two comfort stats with the most effect
  late (overload, haul size). Cargo slots are linear, so its price grows
  slower.
- **Lamp, 1.7; scanner, 2.4.** Each scanner level is a feature.

Engineer's Notes (perk) takes 6% per level off all of these.

### Gates per biome (recomputed against world's hardnesses)

Entry is the drill at which the biome's ore (host x1.15) digs at ratio 2.2 or
less, about 1.1 s a tile. Dense tiles (R12, 2.0x typical) are routed around
until the **pace** level digs them (ratio 2.5 or less). The model's bot pays
12% more tiles while it routes.

| Biome | Typical H | Dense (world) | Entry drill | Pace drill | Hull | Radiator | Tank (model owned) | Lift segment on sale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stone (60) | 1.9 | Dolerite 3.8 | 0 | 2 | 0 | 0 | 0 | Topsoil, $80 |
| Crystal (160) | 3.6 | Fused glass 7.2 | 3 | 5 | 2 | 0 | 0-1 | Stone, $210 |
| Fungal (280) | 6.9 | Shelfstone 13.8 | 6 | 8 | 4 | 0 at its top; L4 for its floor (row 400) | 2-3 | Crystal, $1.0k |
| Magma (400) | 13.0 | Obsidian 26 | 9 | 11 | 6 | L4 at its top; L11 + a heat dip for its floor | 4 | Fungal, $4.8k |
| Ruins (540) | 24.8 | Old concrete 49.6 | 12 | 14 | 9 | L12 opens all of it | 6 | Magma, $22.6k |
| Core (680) | 47.0 | Husk plate 94 | 15 | 17 | 11 | L12 to row 698, then +1 per 12 rows | 6 | Ruins, $107k |
| Chamber (750) | heartrock 75 | | 16 (ring) | | 11 | L17 + Heat Sink, or L18 | 6 | Core, $180k (chamber reached) |

```
entry(b) = ceil( ln(1.15 x 1.9^b / 2.2) / ln 1.25 )
pace(b)  = ceil( ln(2.0  x 1.9^b / 2.5) / ln 1.25 )
```

Vault seals (95) want drill 17 (D9), or A13's key (25). Drill 18-21 is
comfort in run 1 and a dig-time speedup at high Seed age. Hull gates are soft:
an under-hulled pod wrecks more.

### The radiator ladder (R6)

`R = 120 + 20L`. Frontier is the first row hotter than R on D2's curve.

| L | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19-20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C | 120 | 140 | 160 | 180 | 200 | 220 | 240 | 260 | 280 | 300 | 320 | 340 | 360 | 380 | 400 | 420 | 440 | 460 | 480 | 500-520 |
| Frontier, Vell | 313 | 335 | 357 | 379 | 401 | 420 | 439 | 458 | 478 | 497 | 516 | 536 | 698 | 710 | 721 | 733 | 744 | 756 | 768 | all |
| Frontier, Cinder | 283 | 300 | 317 | 333 | 350 | 367 | 384 | 458 | 478 | ... as Vell | | | | | | | | | | |

In D2's old radiator levels: Fungal floor old R2 = L4; Magma floor old R6 =
L12; Core old R8 = L16; chamber old R10 = L20. L12 is the Ruins relief: it
covers the Magma floor (345 C) and all of the Ruins (at most 330 C). L19-20
are margin for lava (+60 C a tile) and the pulse (+80 C). The model's bot never
froze over 3.2 minutes on this ladder.

### The Lift (R2b)

Workshop purchases in run 1, one segment per biome, on sale once the next
biome is reached. A segment costs **the drill level that opens the biome just
reached** (its entry level), so "about one gate level":

| Segment | Rows | On sale when | Price |
| --- | --- | --- | --- |
| Topsoil | 0-60 | Stone reached | $80 |
| Stone | 60-160 | Crystal reached | $210 |
| Crystal | 160-280 | Fungal reached | $1,000 |
| Fungal | 280-400 | Magma reached | $4,760 |
| Magma | 400-540 | Ruins reached | $22,600 |
| Ruins | 540-680 | Core reached | $107,000 |
| Core | 680-748 | chamber reached | $180,000 |

The suggestion card offers segments as gates. Segments reset at launch, and
Head Start rebuilds them. The bot buys each one on its first dock in the new
biome. The Core segment is not in the model. It is comfort for the Heartstone
hunt and cheap in later runs (value x1.3^n).

### Per-level effects (core-loop's, as modelled)

| Stat | Effect at L |
| --- | --- |
| Drill | P = 1.25^L; dig 0.25 + 0.40 x H/P s; too hard above ratio 2.5 |
| Engine | thrust 700 x 1.12^L; climb cap min(30, 7 + 1.15L) x k_m^-0.5; burn per row as before (R2a) |
| Tank | 10 x 1.2^L litres |
| Hull | 40 x 1.2^L HP |
| Cargo | 8 + 4L slots |
| Radiator | 120 + 20L C |
| Lamp | radius min(10, 3.5 + 0.5L), cone half-angle 40 + 1.5L |
| Scanner | a feature per level, L1-L8 |

### How the pod shows it (D20; art draws these)

| Part | Changes at level | Names |
| --- | --- | --- |
| Drill bit | 0, 2, 5, 8, 11, 14, 17, 20 | Iron bit, Steel bit, Carbide auger, Diamond crown, Thermal drill, Sower-steel bit, Core breaker, Seed lance |
| Radiator fins | 4, 8, 12, 16, 20 | one fin pair each, blue toward white (L4 Fungal floor, L12 Ruins, L16 Core) |
| Hull plating | 3, 6, 9, 12, 15 | Riveted, Plated, Ceramic, Obsidian-clad, Sower shell |
| Engine flame | 5, 10, 15, 20 | orange, white, blue, violet |
| Fuel tank | 4, 8, 12, 16 | a side tank each |
| Cargo bay | 5, 10, 15, 20 | the hull widens toward the back |
| Lamp | 4, 8, 12 | beam tint warm, white, cold |
| Scanner | 1, 4, 8 | antenna, dish, ring dish |

The drill changes at its pace gates, so each new bit is the one the next biome
asks for.

---

## 4. Consumables and ripcords (R1, R8)

```
unit U = $10 x 2.9^b_deep      (10, 29, 84, 244, 707, 2051, 5948)
price  = k x U
```

| Item | k | Topsoil | Magma | Core | Carry (+research) | Sold from |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Fuel cell | 1.5 | 15 | 1.1k | 8.9k | 3 (5) | start |
| 2 Repair kit | 2 | 20 | 1.4k | 11.9k | 3 (5) | start |
| 3 Dynamite (H <= 2.5P) | 2 | 20 | 1.4k | 11.9k | 5 (7) | Stone reached |
| 4 Big charge (H <= 3.2P) | 8 | | 5.7k | 47.6k | 1 (2) | Crystal reached |
| 5 Teleporter | **8** | | 5.7k | 47.6k | 1 (2) | Crystal reached |
| 6 Coolant | 3 | | 2.1k | 17.8k | 2 (4) | Fungal reached |

- **Tow** (R1, core-loop): pod only; the cargo stays as a crate (wreck-crate
  rule). Fee = one full tank at the current price ($9 at L0 in Stone, $1.4k
  with a 30 L tank in the Core). The struggle guard's free tow is also pod
  only.
- **Teleporter** (R1): pod and cargo home, 30% of the pieces lost (cheapest
  first). Price k = 8.

**Dominance check (model, run 1, every other late dock).** Turning back at
the tick is compared with (a) mining the climb reserve too, then teleporting,
and (b) running dry, towing, and recovering the crate on the next dive:

| Biome | Haul | Time a teleport saves | Value lost (30% cheapest) | Break-even k | Tow rate / turn-back rate |
| --- | --- | --- | --- | --- | --- |
| Crystal | $3.0k-3.4k | 7 s | 30% | below 0 | 0.84-0.97 |
| Magma | $6.4k-18k | 14-34 s | 14% | up to 2.4 | 0.82-0.91 |
| Ruins | $71k | 21 s | 17% | 3.4 | 0.92 |
| Core | $130k-232k | 5-30 s | 21% | up to 1.6 | 0.84-0.95 |

The highest break-even is k = 3.4, so k = 8 keeps the teleporter a rescue
(sealed shaft, hull about to go), never a habit. The tow never beats turning
back. The bot asserts both every run (section 13).

---

## 5. Pod modules (R7)

Research unlocks a module; the workshop swaps them for free (core-loop has the
in-dive rules and effects). **Slots: 2 at the start, +1 on first reaching
Fungal, +1 from Module Rack (research), so 4 at most.** The suggestion card
and B never pick a module. Ten modules for four slots: each loadout gives up
six modules, and each planet rewards a different six.

| Module | Unlock (data, opens at) | Gives (core-loop) | Best when | Planet that wants it | Model use: Vell / Cinder / Ferrum |
| --- | --- | --- | --- | --- | --- |
| Vein Tracer | 100, Stone | vein outline on break | seams in the dark, no pulse | Ferrum (storms blank the scanner) | 80 / 100 / 100% |
| Magnet Coil | 150, Crystal | magnet 1.5 -> 3 tiles | explosives, overflow, crates | Ferrum (heavy Lodestone overflow) | 0 / 22 / 6% |
| Dense Packing | 250, Crystal | slots x1.25 | bay-limited dives (Magma down) | Ferrum (ore x1.4) | 53 / 61 / 100% |
| Prospector's Ear | 300, Crystal | chimes reach 20 tiles | relic, cache and vault hunting | Vell (19 relics, vaults) | not valued by the model |
| Heat Sink | 300, Fungal | heat x0.7, cooling x2 | sprints past the frontier, the chamber | Cinder (heat from row 283) | 10 / 56 / 33% |
| Helper Drone | 400, Fungal | an ore tile per 6 s | long mining stretches | everywhere (see open questions) | 47 / 100 / 83% |
| Smelter | 450, Fungal | 5 pieces -> 1 ingot slot x5.5 | cheap common ore, heavy bays | Ferrum (Lodestone, mass x1.3) | 0 / 17 / 67% |
| Afterburner | 400, Magma | 1.5 s burst climb | escaping lava, geysers, fuses | Cinder (geysers) | not valued |
| Fuel Recycler | 500, Magma | drilling burn x0.6 | fuel-ended frontier dives | Cinder (heat x1.5 burn) | 0-5% |
| Overcharge | 900, Ruins | key 7, ratio / 4 where <= 5 | a dense band before the pace drill | Vell's Ruins and Core entries | not in run 1 |

Why it is a build choice: the cargo trio (Dense Packing, Smelter, Magnet
Coil), the heat pair (Heat Sink, Fuel Recycler) and the finder pair (Vein
Tracer, Prospector's Ear) compete for the same 3-4 slots. The planet's own
biome sets which pressure is worst: heat on Cinder, slots and mass on Ferrum,
relics and dense bands on Vell. Target: no module on more than 75% of a
planet's dives. The model misses this for Vein Tracer and Helper Drone (open
questions).

---

## 6. Automation

### Rigs

Unlock on first reaching Stone (D18). One site per reached biome. A rig mines
plain rock only and never depletes the world's ore.

```
yield(b, l)          = avg_piece_b x n_b x 1.5^(l-1)   $/min   (l = 1..10)
cost(b, l -> l+1)    = 3 x avg_piece_b x n_b x 1.65^l
```

| Site | Build | L1 | L5 | L10 |
| --- | --- | --- | --- | --- |
| Topsoil | $28 | 9/min | 48 | 361 |
| Stone | $72 | 24 | 121 | 919 |
| Crystal | $514 | 171 | 867 | 6.6k |
| Fungal | $966 | 322 | 1.6k | 12.4k |
| Magma | $4.5k | 1.5k | 7.6k | 57k |
| Ruins | $14k | 4.7k | 24k | 180k |
| Core | $57k | 18.9k | 96k | 726k |

A new rig pays back in 3 minutes; each further level adds 50% yield for 65%
more cost, so maxing them is a slow sink. Run 1 ends with rigs at
[10, 10, 9, 8, 5, 3, 0] making $17.6k/min, **14% of income** over the last 15
minutes (target 15-30%, at the line), and 15% of the run's earnings. Rigs and
the silo sell on every dock as their own line ("Rigs $2,140").

### Silo

Holds rig output while you are away: 2 h, 4 h with Silo (research), 8 h with
Deep Silo, plus up to 6 h from Wider Silo. Every dock empties it.

The Helper Drone is a module now (section 5). Twin Drones are later (R14).

---

## 7. Research

### Data sources

| Source | Data | Run 1 |
| --- | --- | --- |
| First pickup of each ore | 5 x tier | ~775 |
| Relics read by Sefa | 20 / 30 / 40 / 50 / 60 / 70 by biome (Stone to Core); 50 each on Cinder and Ferrum | ~600 (70% found) |
| Biome first entry (per run) | 25 x b | 525 |
| Depth record (per planet) | 2 per new 100 m | 154 |
| Jackpots | 30 each | ~150 |
| Lab (cash building, from Crystal) | 0.5/min per level; levels $500, $3k, $15k, $80k, $400k | ~60 |
| Achievements | 10-100 | ~200 |
| Ines' orders | 5 each | ~50 |
| Sower coffers (Ruins caches) | 10 each | ~50 |
| Rig Scouts (research) | 1 per 10 min per rig at level 5+ | |

That is about **2,500 data in run 1**; the model counts the first five rows
(about 2,200) and spends 1,760. Later runs earn 1,200-1,800: the planet's
first pickups and 6 relics, biome entries, depth records on a new planet.

### The tree: 20 nodes and 10 modules

Prerequisites after the cost. A node opens when its biome is first reached.

**Geology**

| # | Node | Data | Opens | Effect | Why |
| --- | --- | --- | --- | --- | --- |
| G1 | Ore Sense | 20 | start | ores 1 tile beyond the lamp glint | affordable by dive 3 (R13) |
| G2 | Assay | 150 | Stone | +20% all ore prices | the one flat bonus, early on purpose |
| G3 | Deep Survey | 300 | Fungal | the pulse shows caches and the rich pocket from 40 rows | turns R10's rewards into routes |
| G4 | Gem Cutting | 700 | Magma | each biome's top-tier ore x1.5 | rare ore becomes the target |

**Logistics**

| # | Node | Data | Opens | Effect | Why |
| --- | --- | --- | --- | --- | --- |
| L1 | Head Station | 400 | Magma | the lift head sells, refuels, repairs, and B buys the suggested gate there | Waystation and Ore Chute folded into the Lift (R14): town only for the workshop, rigs, lab and lance |
| L2 | Recall Beacon | 300 | Crystal | teleporter channel 2.5 -> 1.5 s, carry +1 | a sealed-in rescue that works |
| L3 | Bandolier | 250 | Stone | item carry +2 (+1 big charge) | |

**Engineering**

| # | Node | Data | Opens | Effect | Why |
| --- | --- | --- | --- | --- | --- |
| E1 | Momentum | 60 | Stone | each tile of an unbroken chain digs 8% faster, to 32% | rewards straight confident shafts |
| E2 | Module Rack | 450 | Fungal | +1 module slot | the fourth slot is a real build |
| E3 | Reinforced Frame | 300 | Magma | hazard damage -15% | answers Seed age's x1.08^n |
| E4 | Shock Struts | 150 | Crystal | fall and bump damage -50% | |

**Automation**

| # | Node | Data | Opens | Effect |
| --- | --- | --- | --- | --- |
| A1 | Silo | 80 | Stone | offline cap 2 -> 4 h; silo gauge in town |
| A2 | Rig Foreman | 400 | Crystal | rigs x1.5 |
| A3 | Rig Scouts | 600 | Fungal | rigs at level 5+ find 1 data per 10 min |
| A4 | Deep Silo | 1200 | Magma | offline cap +4 h; lab trickle offline at 100% |

**Market**

| # | Node | Data | Opens | Effect |
| --- | --- | --- | --- | --- |
| K1 | Ledger | 300 | Fungal | Ines shows 3 orders, refreshed every 2 docks |

**Expedition and planets**

| # | Node | Data | Opens | Effect |
| --- | --- | --- | --- | --- |
| X1 | Star Charts | 600 | 1 launch | the launch offer shows each planet's biome, unique ore, relics left and modifiers, and adds the planet just left |
| X2 | Seed Resonance | 1000 | 2 launches | +20% shards |
| P1 | Flame Skimmer | 600 | on Cinder | the first 2 s of lava or geyser contact cost heat, not hull |
| P2 | Shielded Scanner | 600 | on Ferrum | storms halve the scanner radius instead of blanking it |

**Modules** (section 5): Vein Tracer 100, Magnet Coil 150, Dense Packing 250,
Prospector's Ear 300, Heat Sink 300, Helper Drone 400, Afterburner 400,
Smelter 450, Fuel Recycler 500, Overcharge 900.

Cut: Express Pad (B is a base feature, R12), Waystation, Ore Chute and Second
Waystation (folded into the Lift and Head Station), Shaft Lift (the Lift is a
workshop purchase), Core Lance Plans (free, R6), Twin Drones and Contracts
(later, R14).

The tree costs about 12,200 data (nodes 8,460, modules 3,750). Run 1 buys, in
the model's order: Ore Sense, Silo, Vein Tracer, Assay, Momentum, Dense
Packing, Helper Drone, Head Station, Heat Sink; Module Rack is next. The tree
completes in about 6 runs.

---

## 8. Prestige: the Seed, shards, perks, planets

### Waking the Seed (D8, R6)

1. **Lance plans are free**: unlocked on first reaching the Core (Sefa reads
   the Seed husk A18 if you have it). No data, no node.
2. **The lance** is sold in three parts at the launch site from Core entry:
   frame $60k, coil $120k, head $200k (**$380k**). The suggestion card ranks
   them with the gates by price, so the frame and coil come in the Core's
   middle. At the chamber the head jumps to the top.
3. **5 Heartstone** from the bay: the real gate (R6).
4. Dock with the Seed in the chamber (drill 16 for the heartrock ring;
   radiator L17 with Heat Sink, or L18) and confirm.

In the model the lance costs about 4 minutes of Core income. The bot docks 5
minutes after first reaching the chamber, earning the head on the way. The
longest freeze of the run is 3.2 minutes (R6: at most 6).

### What resets, what persists

| Resets | Persists |
| --- | --- |
| Cash, all 8 upgrades, Lift segments, rig levels, items carried, the world, depth records for this planet | Research and modules unlocked, unspent data, shards and perks, the collection log, achievements, records, cosmetics, daily state |

Why: research is the "how I play" layer. Buying the drill again is the
descent.

### Seed age (R4)

`n` = launches done. It scales the next world:

```
ore value   x 1.3^n
hazard dmg  x 1.08^n
shards      x (1 + 0.2 n)
hardness    unchanged (no drill gate ever moves; Drill Mastery is comfort)
```

Value grows against fixed workshop prices: that is the compression.

### Shards (R4)

```
shards = floor( 12 x (E / 1,000,000)^0.6 x (1 + 0.2 n) x (1 + 0.1 x lens) ) + 10
       + 5 on the first launch from a planet
E = cash earned this run (sales, rigs, caches); n = Seed age
```

| Run | Planet | n | E | Shards |
| --- | --- | --- | --- | --- |
| 1 | Vell | 0 | $2.05M | 18 + 15 = **33** |
| 2 | Cinder | 1 | $2.06M | 22 + 15 = **37** |
| 3 | Ferrum | 2 | $8.05M | 58 + 15 = **73** |
| 4 | Vell (replay) | 3 | $8.72M | 77 + 10 = **87** |

Why E^0.6: farming a run longer pays a little more, while launching and taking
the next run's value x1.3 pays a lot more.

### Perks (the observatory, paid in shards)

| Perk | Levels | Cost | Effect | Why |
| --- | --- | --- | --- | --- |
| Head Start | 5 | 10 / 20 / 45 / 90 / 160 | start with the kit for Stone / Crystal / Fungal / Magma / Ruins (table below) | skips the familiar column, never the new biome |
| Market Contacts | 10 | 8 x 1.6^L (8, 13, 20, 33, 52, ...) | ore price **x1.25 each, compounding** | the plain number, now strong (R4) |
| Kept Rigs | 3 | 12 / 40 / 120 | each rig site restarts at level 1 / 2 / 3 when reached | idle income from minute 3 |
| Engineer's Notes | 5 | 10 x 1.6^L | workshop prices -6% each | |
| Prospector | 3 | 15 / 45 / 135 | ore tiles +8% each (veins grow) | more supply per world |
| Rig Crews | 3 | 20 / 60 / 180 | rig yield +25% each | |
| Wider Silo | 3 | 10 / 30 / 90 | offline cap +2 h each | |
| Deep Pockets | 1 | 20 | +1 carry on every item; start with 2 fuel cells and 2 repair kits | |
| Drill Mastery | 2 | 30 / 90 | drill cap +1 | comfort only (R4) |
| Shard Lens | 5 | 20 x 1.7^L | +10% shards each | |
| Seed Memory | 1 | 50 | 10% of last run's E paid into the silo over the first 30 minutes | the opener without a one-dock spree |

About 3,300 shards in all. Cut: Lance Discount (the lance is no wait),
Radiator Mastery (R5 makes it unnecessary), Second Drone (the drone is a
module).

**Head Start kits** (radiator: the level whose frontier clears the biome's top
on that planet):

| Level | Starts at | Drill | Hull | Radiator (Vell / Cinder) | Tank | Engine | Cargo | Lift |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I | Stone | 2 | 0 | 0 / 0 | 2 | 1 | 1 | Topsoil |
| II | Crystal | 5 | 2 | 0 / 0 | 4 | 3 | 3 | to Stone |
| III | Fungal | 8 | 4 | 0 / 1 | 6 | 5 | 5 | to Crystal |
| IV | Magma | 11 | 6 | 5 / 7 | 8 | 8 | 7 | to Fungal |
| V | Ruins | 14 | 9 | 12 / 12 | 10 | 11 | 9 | to Magma |

### Planets (R4, R5, R14)

v1 has Vell, Cinder and Ferrum. Each keeps Vell's column and replaces one
mid-column biome with its own (world section 7): the fast part is familiar,
the slow part is new. After a launch Ida offers the unlocked planets other
than the one just left; both open at the first launch.

| Planet | Its biome (world) | Modifiers (this doc) | Unique ore | Plays like | Modules it favours | Planet node |
| --- | --- | --- | --- | --- | --- | --- |
| Vell | none | baseline | | the story run; vaults and relics | Prospector's Ear, Overcharge, Heat Sink at the chamber | |
| Cinder | Ash hollows, rows 280-399 (for Fungal) | heat x1.3 **on rows 280-399 only** (R5); ore value x1.3 in those rows | Sunstone T7 | a radiator race from row 283; L7 opens Magma | Heat Sink, Afterburner, Fuel Recycler | Flame Skimmer |
| Ferrum | Banded deeps, rows 160-279 (for Crystal) | ore tiles x1.4 everywhere; ore mass x1.3 (no gravity change: modifiers only, R14); storms in its rows; ore value x1.2 in its rows | Lodestone T6 | dense and heavy: bays fill fast, climbs strain | Dense Packing, Smelter, Vein Tracer | Shielded Scanner |

**R5 assertion** (simulator): for every planet offered at a launch, a bot
holding exactly the perks the player owns reaches the chamber. Cinder's heat
stops at row 399, so its chamber gates equal Vell's. Both passed in the model.

Price ladder across the replaced biomes (world's question 3): the Ash hollows
average $232 a piece (tiers 5-7, x1.3 value) against Fungal's $157; the
Banded deeps $104 (tiers 3-6, x1.2) against Crystal's $76. Across each edge
the entry guard holds: the bottom of Crystal (Sapphire $115, Emerald $225)
meets Jade at $150 at the top of the Ash hollows, and the bottom of Stone
(Gold $60) meets Quartz at $36 at the top of the Banded deeps. Below them the
pieces fall back to Magma's and Fungal's ladders, which is fine (no burst).

---

## 9. Reward cadence (R10)

Daily contracts are gone. Three mid-frequency rewards replace them; each is
bounded by the burst guards (section 12).

### Ines' orders

Two orders on the depot card, refreshed every 3 docks (Ledger: 3 orders,
every 2 docks). Ores are drawn from biomes reached, weighted to the current
frontier.

| Kind | Example | Reward |
| --- | --- | --- |
| Count | "6 Sapphire in one haul" (N = 30% of that ore's expected share of a full bay at the frontier, at least 3) | x1.6 on those pieces |
| Purity | "a haul with no Lead" (the band's cheapest ore) | +20% on the haul |
| Depth | "a haul of 20 pieces of tier 8+" | +15% on the haul |

Every order also pays +5 data. **Cap: an order's bonus is at most 25% of the
haul it pays on.** In the model orders add 5% to sales. Why: a reason this dive
differs from the last, priced like a good seam, never like a jackpot.

### Caches

Contents and counts are world's: about 1 per 15 rows, `3 x n_b` pieces of the
biome's upper tiers, one in three with an item. Progression adds: **Sower
coffers (Ruins) also give 10 data**, and the cap below. Pieces take bay slots,
so a cache improves a haul and never adds one. Value check (world's question
2): a Core seed pod holds 12 pieces of Stellite or Seedglass, about $93k,
against a $232k haul (40%). A Magma ember chest is about 9 x $1.2k = $11k
against $21k (50%, on the cheaper side of the cap). The model valued a cache
at 6 average pieces. World's are about 2x that from Magma down, which
shortens run 1 by an estimated 3-5%.

### Rich pocket

One per dive (world places it, core-loop shows it). Progression's rule: the
pocket is **trimmed to at most 15% of the bay** in pieces after it is rolled
(world's x2 maximum size could fill a Core bay alone). The model gives one per
dive only when the pod can reach 15+ rows past its deepest row, about 110
pieces in run 1. A frozen frontier gets no pocket. That is deliberate: the
pocket pulls you deeper, so it should not reward standing still.

### Jackpots

World's x6-x10 of the biome's top ore, at most 3 hauls (D5). Each pays +30
data the first time.

---

## 10. Offline progress

| Accrues | Rate | Cap |
| --- | --- | --- |
| Rig output into the silo | 100% of yield | silo cap: 2 / 4 / 8 h, up to 14 h with Wider Silo III |
| Lab data | 50% (100% with Deep Silo) | same cap |
| Daily rollover | market board, supply crate | once per local day |
| Not accrued | hauls, drones, interest | |

```
elapsed = clamp(now - lastSave, 0, silo_cap)      // a clock set backwards counts as 0
silo    = sum over rigs of yield x elapsed
```

On return a quiet card comes before the town:

> While you were away · 6 h 10 m (the silo holds 4 h)
> Rigs mined · **$184,200** · Lab **+62 data**
> The silo was full for 2 h 10 m. Deep Silo at the lab holds 8 h.
> [Collect]

[Collect] runs the sale count-up, then shows the suggestion. Under 5 minutes
away: no card. Scale: at the end of run 1 rigs make $17.6k/min, so 2 h is
about $2.1M, about 20 minutes of Core play: a good return, and a dive still
beats a minute away.

---

## 11. Achievements and the collection log

### Achievements (30)

Data unless marked; shards are rare and small.

| # | Name | Condition | Reward |
| --- | --- | --- | --- |
| 1 | First Haul | sell a full bay | 10 |
| 2 | Under the Grass | reach row 60 | 10 |
| 3 | Old Mine | reach Stone and find a relic | 15 |
| 4 | Glow | pick up a glowing ore | 15 |
| 5 | Into the Dark | reach Fungal | 20 |
| 6 | Hot Feet | reach Magma | 25 |
| 7 | Straight Walls | reach Ruins | 30 |
| 8 | Heartbeat | reach the Core | 40 |
| 9 | There It Is | reach the chamber | 50 |
| 10 | Seedfall | launch the Seed | 50 + 2 shards |
| 11 | Close Call | dock with under 1 L of fuel | 15 |
| 12 | Scrape | dock with under 5% hull | 15 |
| 13 | Full House | dock with every slot tier 6+ | 25 |
| 14 | Deep Breath | a dive over 4 minutes without an item | 20 |
| 15 | Clean Run | reach Magma with no wreck or tow this run | 30 |
| 16 | Rig Boss | a rig in every biome | 30 |
| 17 | Fully Rigged | a rig at level 10 | 40 |
| 18 | Night Shift | collect a full silo | 15 |
| 19 | Lucky | find 3 jackpots | 30 |
| 20 | Archivist | read 10 relics | 40 |
| 21 | Wren's Path | the Wren thread complete | 60 + pod trail "Wren's lamp" |
| 22 | Smith | smelt 100 ingots | 30 |
| 23 | Overcharged | break 50 dense tiles with Overcharge | 25 |
| 24 | Demolition | clear 200 tiles with explosives | 25 |
| 25 | Speedrun | launch in under 30 minutes | 50 + 3 shards |
| 26 | Tourist | launch from all 3 planets | 50 + 5 shards |
| 27 | Old Seed | reach Seed age 10 | 100 + 10 shards |
| 28 | Regular | fill 25 of Ines' orders | 40 + pod paint |
| 29 | Light Load | reach the chamber with cargo below L5 | 40 + pod paint |
| 30 | Liftwright | build every Lift segment in one run | 40 |

### Collection log rewards (categories are world's)

| Completing | Reward | Why |
| --- | --- | --- |
| One biome's ore set (per planet) | that biome's ore +10% on every planet | a reason to dig the rare top tier |
| All 28 ores | pod paint "Assay" | |
| Each jackpot or cache kind, first time | +30 / +10 data | |
| All 11 jackpots | pod trail "Starfall", +5 shards | |
| The old mine thread (A1-A3) | +1 carry on every item | |
| The Wren thread | Wren's lamp: lamp +1 level free every run | story pays in play |
| A planet's Sower relics (6 on Cinder, Ferrum) | +5% shards, stacking | relics matter for prestige |
| All places | the map shows named places' outlines from the start of a run | |
| All life | +10% data from every source | |
| Records | none: the observatory wall | |

---

## 12. Guards against dead walls and bursts

| Guard | Rule | Why |
| --- | --- | --- |
| Next goal visible | the HUD line shows the next biome's missing gates with their total, or the lance part | never "what now" |
| Cheap thing in reach | tank, cargo and lamp grow 1.5-1.7, so some upgrade is always within 3 hauls | a small yes at every dock |
| Gate bundle | the gates for biome b+1 cost 5-15 minutes of biome b income | a biome is not 2 minutes or 60 |
| Entry jump | a piece is worth at most 1.7x more from the bottom of b to the top of b+1; hauls are slot-limited, so hauls obey it too | a first deeper dive cannot buy 5 upgrades |
| Price growth floor | every stat >= 1.45 per level, except the radiator (1.4, half-size levels, R6) | one haul cannot buy 3 levels of a stat |
| Jackpot | at most 3 hauls (D5) | a party, not a skip |
| Ines' order | bonus at most 25% of its haul | |
| Cache | contents at most 50% of a typical haul at its depth; pieces take slots | |
| Rich pocket | trimmed to 15% of the bay | not a free bay every dive |
| Offline | the silo cap | |
| Lance | three parts from Core entry, $380k, plans free (R6) | no wait at the end |
| Broke | bay empty and cash below half a tank: refuel to 50% free ("Ida covers it"), once per 10 min | never stuck in town |
| Struggle | 3 dives netting under 50% of the last-5 average: the next tow is free (pod only, R1), and the depot marks the nearest unmined vein | a bad streak never spirals |
| Stall | no purchase in 3 dives or 8 minutes: the suggestion switches to the best payback and the goal line shows "about N dives" | |
| **Thin ore** (new, R3) | if every reachable band is under a third of its starting ore while a gate is unaffordable, the next rich pocket rolls in the deepest reached band (ignoring the 25-row rule) and the depot marks the best unmined vein | the finite world never strands a run. One model sweep with 1.25x prices did strand: the bot mined out everything above the Core before affording its entry |
| Run 2+ opener | Head Start skips biomes, never hands out cash; Seed Memory pays through the silo over 30 min | perks speed the climb without a one-dock spree |

---

## 13. What the simulator must check (R15)

Run 1 on Vell, no perks, the real bot on the real rules (R15's two levels),
200 players across skills. "First pass" is this doc's model.

| Metric | Target | First pass |
| --- | --- | --- |
| Time to first upgrade | <= 75 s | 73 s |
| Docks with a purchase in the first hour | >= 20 | 29 |
| Gap between purchases, median / max | <= 2.5 / <= 6 min | 2.2 / 4.4 |
| Purchases per dock, p90 / max | <= 4 / <= 6 | 4 / 5 |
| Levels of one stat in one dock | <= 2 | **3** (hull at a biome edge; fix: suggest one hull level per dock from mid-biome) |
| Time per biome: Stone, Crystal, Fungal, Magma, Ruins, Core + chamber | 3-8, 6-14, 8-20, 12-24, 6-20, 8-20 | 4.8, 7.2, 10.7, 16.8, 7.8, 10.1 |
| First launch | bot 60-100 min; humans 2-3 h | **60** (humans 1.5-2 h: short of the brief; see open questions) |
| Run 2 / run 1 | <= 60% | **62%** |
| Run 4 | <= 45 min | 29 |
| A replayed planet | <= 30 min | 29 (Vell, run 4) |
| Shards per hour | rises every run | 33, 60, 136, 183 |
| **Transit share of a dive** | <= 30% | median 29%, p90 39%, max 40% (**misses**: the first dives into a biome before its segment, and town trips from the Core floor) |
| **Late transit** (Ruins, Core) | <= 45 s | median 37 s, max 64 s (**misses** on town trips from row 760; Head Station dives meet it) |
| **Ore left at launch, every biome** | >= 30% | lowest 62% (Core); Ruins 90% |
| **Depth-frozen time** | <= 20% of the run, no freeze over 6 min | 10%, longest 3.2 min |
| **Tow / teleport dominance** | no strategy that ends dives on a tow or teleport beats turning back | tow 0.82-0.97x of turning back; teleport break-even k <= 3.4 vs price k = 8 |
| Late dives ending on fuel | <= 60% (D16) | 33% |
| Module spread | no module on > 75% of a planet's dives | **misses**: Vein Tracer 80-100%, Helper Drone 47-100% |
| Chamber reachable on every offered planet (R5) | always | Cinder, Ferrum: yes |
| Idle share of income at launch, run 1 / run 5 | 15-30% / <= 40% | 14% / not run |
| Dive length, early / late | 40-90 s / <= 5 min | 72 s (Topsoil, Stone) / 148 s |
| Fuel plus repair, share of income | <= 8% | ~6% early, under 1% late (fuel only; repair not modelled) |
| Wrecks per hour, regular bot | 0.3-1 | not modelled |
| Hit rate per biome (D17) | measured, feeds this table | model: density x 1.3-2.6, about 10% deep |

---

## 14. Daily and returning hooks

Seeded from the local date (`hash(saveSeed, yyyymmdd)`). Offline, never
punishing a missed day.

| Hook | What | Why |
| --- | --- | --- |
| Market board | 2 ores from reached biomes sell x1.5 and x2 today | gives today's dives a target |
| Supply crate | first dock of the day: a fuel cell, a repair kit and a dynamite | a small hello |
| Rested | away 6 h or more: the next 3 dives sell +25% | coming back feels good, on top of the silo |

Ines' orders (section 9) replace daily contracts (R14). The weekly survey is
later. No streaks, no "you missed yesterday". A clock set backwards rolls
nothing over and counts as 0 offline time.

---

## 15. The dock flow

1. **Land at the depot** (the forecourt between Mo's fuel station and Ines'
   market) or ride the Lift to its top. The service runs: sell, refuel,
   repair, restock.
2. **Sell count-up**, 1.0-1.5 s, any key skips. One row per ore type (icon,
   `x12`, value), rarest last, a chime per row by tier. Then "Rigs $2,140",
   "Order: 6 Sapphire x1.6 +$1,310", "Fuel -$42", "Repair -$18" in grey. New
   ore gets a stamp ("New · +40 data"); a record haul reads "Best haul" in
   gold.
3. **Summary:** `+$1,240 this dive · $822/min · best $1,410`.
4. **Ines' orders**: two lines under the summary, a tick on any just filled.
5. **One suggestion card:**

   > **Radiator 10** · $17,600
   > The heat line moves 19 rows deeper. 1 of 2 for the Magma floor.
   > [B] Buy   (or "in about 2 dives")

   It picks only gates: the cheapest missing drill, hull or radiator level or
   Lift segment for the next step down; in the Core, a lance part when it is
   cheaper; at the chamber, the lance first. Otherwise the best-payback
   upgrade. **Never a module** (R7). It never offers what cannot be used yet
   (no radiator before Fungal is in sight, no lance before the Core). Plain
   words: "19 rows deeper" is fine; "R = 300" is not.
6. **Next step bar:** `Magma floor · Radiator 11 · Drill 12 ✓ · Hull 9 ✓ ·
   $24,600 to go`, filling with cash. When met: "The Magma floor is open."
7. **Leaving:** any direction key closes the panel and drives. **B** buys the
   suggestion anywhere in town, **U** opens the workshop anywhere in town,
   **Tab** the cargo panel (R12). Buildings' signs glow when something new is
   affordable.

**At the lift head** (Head Station): steps 1-6 run the same at the head,
without rigs, the workshop, the lab or the lance. A dock with nothing to buy
takes about 3 s; with the suggested buy, about 4 s.

---

## Open questions

**DESIGN**

1. **Run length against R6.** With plunging play, run 1 is about 60 bot
   minutes (humans 1.5-2 h). Raising prices lengthens it only by freezing
   depth: x1.3 adds about 10 minutes at about 25% frozen time, x1.6 adds about
   30 at about 40%. R6 and the brief's 2-4 h cannot both hold with today's
   number of depth steps. Options: accept about 2 h for a first launch; or add
   depth steps that are not price walls (Ruins vault and Nursery goals before
   the Core opens, more dense bands per biome). My pick: accept about 2 h and
   let the replayed planets carry the long tail.
2. **Late transit** misses 45 s only on town trips from the Core floor (the
   Lift alone is 2 x 17 s there). A 60 tiles/s Lift, or counting Head Station
   docks as the norm, meets it.

**Core-loop**

3. **Vein Tracer and Helper Drone** sit in 80-100% of the model's dives. I
   propose Vein Tracer's outline at 5 s (from 10) and the drone at one tile
   per 8 s (from 6), then re-measure the 75% spread target.
4. **Rich pocket lifetime.** World keeps up to 2 unmined pockets; core-loop
   reverts an untouched one each dive. The model assumed one per dive. Pick
   one; I prefer core-loop's (no stockpiling), with the 15% trim from this
   doc either way.
5. The Core Lift segment is priced at $180k (drill 16), on sale at the
   chamber: comfort for the Heartstone hunt, not part of run 1's critical
   path.

**World**

6. Cache contents (`3 x n` upper-tier pieces) run about 2x the model's
   assumption from Magma down. They are within the 50% cap. Confirm the
   upper-half tier rule stays, or use all tiers to halve them.
**Art**

7. Radiator fins change at 4, 8, 12, 16 and 20 (five pairs for 20 levels).
