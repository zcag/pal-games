# Seedfall: world, content and story

Owner: world and content. Covers the premise, the town, the seven biomes,
materials, ores, jackpots, caches, artifacts and story, world generation, the
planets' biomes and the collection log. Prices, upgrade costs and stat curves
are progression's; this file gives value **tiers** and **hardness**. Where
this file and DESIGN.md disagree, DESIGN.md wins.

Anchors from BRIEF.md: 48x770 grid, bedrock columns 0 and 47, 1 tile = 10 m,
seven biomes.

Conventions:

- **Row** = tile y, 0 at the surface, growing down. Interior columns are 1-46.
- **Hardness**: topsoil loam = 1.0. The typical rock of biome *b* (0-6) is
  `1.9^b`: 1.0, 1.9, 3.6, 6.9, 13.0, 24.8, 47.0 (D1). Each biome also has one
  **dense** material at 2.0x typical (R12). Dig time is core-loop's.
- **Tier** 1-12 is a value tier; the price is progression's
  `8 x 1.95^(T-1)` (D4), times planet value and Seed age.
- **Yield**: an ore tile gives `1 + floor(b / 2)` pieces: 1 in Topsoil and
  Stone, 2 in Crystal and Fungal, 3 in Magma and Ruins, 4 in the Core (R3).
- **Mass** in kg per piece; cargo mass is `kg / 10 x 1.12^b` (D3).
- **The Lift column** is column 24: the mine mouth, and the column the Lift is
  built down (R2b). Generation keeps it clean (section 6).

---

## 1. Premise

**The planet** is Vell, a cold, quiet rock with one town on it. **The town**
is Gantry, about forty people living around the headframe of a mine that
closed forty years ago. Since then Gantry has sold fuel to ships passing
through and not much else.

**You** are a contract digger. The town pooled its money, bought a used
drilling pod and hired you to open the claim again. You dig because Gantry
needs the money, and because the market pays well for anything that glows.

**What happened forty years ago.** The old miners heard a hum in the deep
shafts. One of them, Wren Aster, went past the bottom of the mine on her own
and never came back. The mine was sealed the next month. Her sister Ida still
runs the observatory on the hill.

**What the core is.** Under every layer, at 7.6 km, sits the Seed: a sphere of
warm, dark living metal about 60 m across (6 tiles). An old people the game
calls the **Sowers** carried it here, planted it, and tended it while the
planet's crust grew over it. The Seed is not a weapon and not a treasure. It
is ready to leave. The Sowers waited too long to lift it, the magma rose, and
they sealed themselves in vaults beside it so it would not be alone.

**The payoff.** You reach the core chamber, wake the Seed and launch it. It
rises up through your own shaft (the Lift column), breaks the surface beside
Gantry and climbs into the sky while the town watches. Fragments shaken loose
on the way up are **core shards** (the prestige currency). Ida's telescope
tracks it to a dim star with a planet: an older world the Sowers seeded long
ago, whose own Seed is now ripe. You follow it.

**The long thread.** In the Ruins sits a stone cradle with a list of worlds
scratched on its rim. The list runs from oldest to newest and ends at the
world it lies on. Each planet you launch from adds a line to your copy. The
first name on the list, worn almost smooth, is a planet for later (Orrery).

### Town of Gantry

Each building has one person. They speak rarely and in short lines. A line
plays when you open the building, at most one new line per visit, chosen from
a small pool that grows with depth reached. The **depot** is the forecourt
between Mo's fuel station and Ines' market, beside the mine mouth; landing
there runs the automatic service (R12, core-loop).

| Building | Person | First line | Voice |
|---|---|---|---|
| Fuel station | Mo Brandt | "Fill her up. Don't come back empty." | Dry, practical, counts litres out loud. |
| Market (assay office) | Ines Vale | "Copper's copper. Bring me something that glows." | Unimpressed until she isn't. Posts the orders (R10). |
| Workshop | Bram Okoro | "Your drill's fine. It's your nerve I worry about." | Old mine fitter, worked with Wren. Builds the Lift. |
| Supply store | Pell | "Charges, patches, fuel cans. Pay first." | Terse, fond of you, won't admit it. |
| Lab | Dr. Sefa Lund | "Every stone has a story. Bring me the strange ones." | Curious, reads artifacts aloud. |
| Rig office | Juno Marsh | "Why dig the same hole twice? Let the rigs do it." | Brisk, likes numbers. |
| Observatory / launch site | Ida Aster | "My sister went down there. I've looked up ever since." | Quiet, patient, the emotional anchor. |

Sample later lines:

- Mo: "Magma, they say. Bring the big tank."
- Ines: "Where did you find this? Never mind. I don't want to know."
- Bram: "Wren used to say the rock talked back. I thought she meant the drill."
- Bram (first Lift segment): "Straight down, no fuel. Don't get used to it."
- Pell: "Coolant's on the left. You'll want it."
- Sefa: "These marks repeat. It's a name, I think. Or a count."
- Juno: "Rig three found a geode. It was very excited about it."
- Ida (after the first launch): "Wren would have liked to see that."

---

## 2. Biomes overview

| # | Biome | Rows | Typical | Dense (2.0x) | New thing to think about |
|---|---|---|---|---|---|
| 0 | Topsoil | 0-59 | 1.0 | Hardpan 2.0 | Fall damage, sand that slides |
| 1 | Stone (the old mines) | 60-159 | 1.9 | Dolerite 3.8 | Loose boulders and cave-ins |
| 2 | Crystal caves | 160-279 | 3.6 | Fused glass 7.2 | Gas pockets |
| 3 | Fungal hollows | 280-399 | 6.9 | Shelfstone 13.8 | Spore clouds, the lamp matters |
| 4 | Magma | 400-539 | 13.0 | Obsidian 26 | Heat and flowing lava |
| 5 | Ancient ruins | 540-679 | 24.8 | Old concrete 49.6 | Arc pylons, false floors |
| 6 | The core | 680-769 | 47.0 | Husk plate 94 | The pulse |

On Cinder, Fungal is replaced by the Ash hollows; on Ferrum, Crystal is
replaced by the Banded deeps (section 7).

Boundaries are not flat lines. Boundary row at column x:
`B + round(3 * noise1(x * 0.08 + seedB))`, so it wanders +-3 rows. A 6-row
transition band below each boundary dithers materials: in band row k (0-5) a
tile takes the lower biome's material with probability `(k + 1) / 7`.

**Temperature** is D2's curve, piecewise linear in row (heat rules are
core-loop's):

| Row | 0 | 160 | 280 | 400 | 540 | 560 | 680 | 770 |
|---|---|---|---|---|---|---|---|---|
| C | 15 | 40 | 90 | 200 | 345 | 300 | 330 | 485 |

Lava within 2 tiles adds +60 C per tile (max 3); the pulse adds +80 C for
1.5 s. The dip at row 560 is the Ruins relief after Magma. A planet's heat
modifier applies only to its own biome's rows (R5).

**Dense materials** (R12) make about 10% of each biome's diggable tiles. They
are placed as bands or blobs with gaps, so a dense patch is a routing choice:
dig around it, or come back with a better drill. Progression's drill gates
assume them. Ores never sit in dense tiles.

---

## 3. Biomes in detail

Every unbreakable tile, whatever its biome look, sits in art's undiggable band
(L 0.10-0.16), has a darker outline and never takes the lamp's edge
highlight. Dense tiles sit in the diggable band but read as their own
material, and D11's dot hatch marks them when the drill is too weak. Ores are
always brighter and more saturated than their host rock. Hazards each have a
tell that appears before they act. **Nothing glows before Crystal except
jackpots** (R11): Topsoil and Stone ores, caches and decor are lit only by the
lamp.

### 0. Topsoil (rows 0-59)

Feeling: morning, roots, easy money. Warm browns under a pale sky. The first
minute should be pure pleasure: fast digging, ore within reach, a short way up.

| Material | Hardness | Rows | Colour |
|---|---|---|---|
| Loam | 1.0 | 0-25 | Warm mid brown, darker flecks, root threads |
| Clay | 1.3 | 15-50 | Red-brown, smooth with horizontal streaks |
| Gravel | 1.6 | 35-59 | Grey-brown, pebbled |
| Sand | 0.5 | pockets | Pale ochre, falls |
| **Hardpan** (dense) | 2.0 | 12-59, horizontal bands 1-2 thick | Pale dusty tan, cemented, hairline cracks |

- **Unbreakable:** *Granite boulder*. Round-cornered blue-grey lump. 0.5% of
  tiles, rows 20+ only, never in a group larger than 2.
- **Caves:** almost none. Small air pockets only.
- **Structures:** the *mine mouth* (column 24, rows 0-3, pre-dug, timber rim).
- **Caches:** *crates*, 4.
- **Hazards:** fall damage (core-loop), sand pockets that slide into space you
  open. Nothing that hurts on its own.
- **Life and decor:** roots hanging into pockets, earthworms that curl away
  from the lamp, buried bottles and cans, a fossil shell or two, a cat skull.

### 1. Stone, the old mines (rows 60-159)

Feeling: abandoned work. Grey stone, timber, rusted rails, a lantern hook with
no lantern. Quiet except for drips. The first sign that people came before you.

| Material | Hardness | Rows | Colour |
|---|---|---|---|
| Shale | 1.9 | 60-120 | Slate grey, thin layered lines |
| Limestone | 2.2 | 80-159 | Pale warm grey, soft pits |
| Granite | 2.8 | 110-159 | Speckled grey and pink |
| Timber | 0.6 | mine structures | Brown planks, nail heads |
| Rubble | 1.2 | collapsed tunnels | Loose broken grey, darker gaps |
| **Dolerite** (dense) | 3.8 | dikes, near-vertical, 1-2 wide, 8-25 long | Dark green-grey, fine grain, no layering |

- **Unbreakable:** *Ironstone*. Dark blue-black with rust-coloured seams.
  3% of tiles, in seams 2-6 tiles long, mostly horizontal.
- **Caves:** natural caves ~7% open, plus mine tunnels.
- **Structures:** *mine tunnels* (4-6; horizontal, 1 tall with a 25% chance of
  2, 12-30 long, timber posts every 4 tiles, rails; 30% end in a rubble plug);
  *vertical shafts* (1-2, 1 wide, 10-25 tall, ladder decor); the *cart room*
  (exactly 1, 7x4, rows 110-150, an overturned cart and a dead lantern; A2).
- **Caches:** *mine carts*, 7 (a cart tipped into the rock, a tarp over it).
- **Hazards (new): loose boulders.** A boulder tile (round, light grey, a
  visible crack and a 1-pixel shadow under it) falls when the tile under it is
  removed, after a 0.6 s rumble and dust. Removing a timber post collapses
  the 2 tiles above it into rubble after 1 s.
- **Life and decor:** bats in tunnel ceilings (scatter from the lamp), water
  drips, cobwebs, rusted tools, chalk tally marks on walls.

### 2. Crystal caves (rows 160-279)

Feeling: wonder. The first light that isn't yours. Angular caves, crystal
clusters that catch the lamp and throw coloured specks. The walls answer the
drill with a faint chime.

| Material | Hardness | Rows | Colour |
|---|---|---|---|
| Glassrock | 3.6 | 160-279 | Dusky blue-grey, faint glassy sheen |
| Quartzite | 4.3 | 200-279 | Milky white-grey, blocky |
| Crystal lining | 2.4 | geode walls | Translucent pale cyan, faint self-glow |
| **Fused glass** (dense) | 7.2 | blobs, radius 2-4 | Smoky brown glass, swirled, dull |

- **Unbreakable:** *Black prism*. Near-black faceted tile with sharp diagonal
  facets, the only non-reflective thing in the biome. 5%, in clusters of 2-5.
- **Caves:** ~12% open, faceted.
- **Structures:** *geodes* (8-12, elliptical hollows of radius 2-5 lined with
  crystal and ore); the *star geode* (exactly 1, radius 6, rows 240-275, lined
  with Sapphire and Emerald, the Starheart at its centre); the *singing
  chamber* (exactly 1, 9x5, rows 190-230, tall crystal columns; A4).
- **Caches:** *fossil geodes*, 8 (a fist-sized stone egg, split by the drill).
- **Hazards (new): gas pockets.** 1-3 tile clusters of gas inside rock. Tell:
  a hairline yellow-green crack on the tile face, a slow seep of dim
  particles in lamp light, a soft hiss within 3 tiles. Only drilling a gas
  tile itself triggers it (R12): a fuse of `0.8 x k_m^0.25` s (longer when
  loaded), then a blast of radius 2. No push. Blast damage is core-loop's.
  The scanner shows them as yellow dots.
- **Life and decor:** glass moths that orbit glowing crystals, refracted
  light specks on walls, chimes when the pod passes big clusters.

### 3. Fungal hollows (rows 280-399)

Feeling: alive and dark. Huge open hollows, mushroom forests taller than the
pod, soft blue-green light that breathes. The light is patchy and the spaces
are big.

| Material | Hardness | Rows | Colour |
|---|---|---|---|
| Mycelium mat | 4.0 | hollow floors and edges | Off-white threads over dark soil |
| Rootstone | 6.9 | 280-399 | Dark umber with pale root veins |
| Mossbasalt | 8.0 | 330-399 | Near-black, green moss specks |
| Mushroom flesh | 1.5 | giant stalks and caps | Pale violet stalk, glowing teal cap |
| **Shelfstone** (dense) | 13.8 | horizontal shelves 1-2 thick, often just under hollow floors | Bone-white, layered, mineralised fungus |

- **Unbreakable:** *Petrified root*. Knotted dark brown-grey, twisting grain.
  6%, in curving runs of 3-10.
- **Caves:** ~22% open, big rounded hollows.
- **Structures:** *mushroom forests* (in every hollow with a floor width of 8
  or more: giant mushrooms 3-7 tall every 3-5 tiles, stalks diggable); the
  *great hollow* (exactly 1, at least 20x12, rows 320-370; A8 as glowing lines
  on its floor); *Moonpearl caps* (2 giant mushrooms whose cap hides a
  Moonpearl).
- **Caches:** *spore caches*, 8 (a sealed puffball, faint teal).
- **Hazards (new): spore clouds.** Spore vents (a swollen, pulsing puffball
  tile) release a cloud every 6-12 s: a 2-tile-radius pale green haze that
  drifts upward at 0.5 tiles/s for 5 s. Inside it the hull takes slow damage
  and the lamp radius halves. Clouds are lit from within and drawn behind
  tiles.
- **Life and decor:** glowcaps that brighten when the pod is near, jellyshroom
  caps that pulse slowly, drifting spores, cave crickets (sound only), slime
  trails that shine in the lamp.

### 4. Magma (rows 400-539)

Feeling: danger and wealth. Red and black, shimmering air, lava light from
below. Every dive is a race against the radiator.

| Material | Hardness | Rows | Colour |
|---|---|---|---|
| Scoria | 10.0 | 400-460 | Rust-red, porous holes |
| Basalt | 13.0 | 400-539 | Charcoal with faint red cracks |
| Crust | 11.0 | lava lake tops | Black skin over orange, cracked |
| **Obsidian** (dense) | 26.0 | diagonal flow bands 2-3 thick | Black glass, sharp white highlight |

- **Unbreakable:** *Cold basalt column*. Hexagonal grey columns, vertical
  lines, cool blue-grey against the reds. 7%, in vertical runs of 3-8.
- **Caves:** ~15% open: lava tubes (long horizontal worms) and pockets.
- **Structures:** *lava lakes* (3-5, at least 1 of width 10+; lava fills the
  bottom 40% of a cave, a crust lid where the roof is low); *the Kiln*
  (exactly 1, a 12x7 Sower furnace hall at rows 480-520, Sower brick half sunk
  in basalt; A10 and A11; the first sight of the Sowers' building style); the
  *Phoenix pool* (the deepest lava lake holds the Phoenix diamond on its
  floor).
- **Caches:** *ember chests*, 9 (a Sower bronze box, warm red seams).
- **Hazards (new): heat and lava.** Heat per D2. Lava is a liquid (D12): it
  flows into tiles you open at 1 tile per 0.5 s down and 1 tile per 1.5 s
  sideways (R12), up to its volume, and crusts into basalt after 15 s of
  standing still. Contact damage is core-loop's. Lava pockets (1-4 enclosed
  tiles) release when breached; tell: the tile above glows orange at its
  cracks, and the heat gauge rises as you approach.
- **Life and decor:** rising embers, heat shimmer, cinderlings (tiny
  salamander lights that crawl along ceilings and scatter), a far-off rumble
  (sound only; the camera never shakes for it, R13).

### 5. Ancient ruins (rows 540-679)

Feeling: awe and quiet. Straight walls, square doors, carved glyphs that wake
as you pass. Cooler than Magma. Somebody built this, and it still works a
little.

| Material | Hardness | Rows | Colour |
|---|---|---|---|
| Packed rubble | 20.0 | 540-679 | Sand-gold broken stone |
| Sower brick | 24.8 | room walls | Warm pale stone, precise joints, faint glyph grooves |
| Fill | 28.0 | 600-679 | Smooth greige, rebar-like inlay lines |
| Vault seal | 95.0 | vault doors | Dark bronze disc on stone, gold ring inlay |
| **Old concrete** (dense) | 49.6 | rectangular slabs 3-6 x 2-4 between rooms | Pale cold grey, form-board marks, square edges |

- **Unbreakable:** *Ward stone*. Deep teal-black stone framed with a thin dim
  gold line; it frames rooms and corridors, so unbreakable reads as
  architecture. 10%, mostly on room corners and corridor roofs.
- **Caves:** ~18% open, built: rooms and corridors on a grid.
- **Structures:** *rooms* (10-14, 6-11 wide, 4-6 tall, brick walls, ward
  stone corners, doorways 1-2 wide); *sealed vaults* (4, 5x4 interior, one
  vault seal each; D9: hardness 95, the door-key A13 drops it to 25; contents:
  one artifact each (A15, A16, A17) or the Sower crown, plus 6-10 Orichalcum
  per vault); *the Nursery* (exactly 1, 16x8, rows 620-660, the cradle; A14
  on its wall, A16 in its vault).
- **Caches:** *Sower coffers*, 9 (a small stone box with a gold-ringed lid).
- **Hazards (new): arc pylons.** Pairs facing each other across a 1-6 tile
  gap. Every 4 s they arc for 1 s, after a 0.4 s visible charge-up glow.
  Timing, not avoidance. Also *false floors*: brick floor tiles with a faint
  seam that crumble 0.8 s after the pod rests on them.
- **Life and decor:** dust motes in shafts of glyph light, glyphs that light
  amber in sequence as the pod passes, statues of six-fingered figures,
  dormant cables, a stopped water clock.

### 6. The core (rows 680-769)

Feeling: pressure and arrival. Rock turns to glass, a slow heartbeat of light
comes from below. Everything points down.

| Material | Hardness | Rows | Colour |
|---|---|---|---|
| Pressure stone | 47.0 | 680-769 | Deep violet-grey, compressed swirls |
| Core glass | 60.0 | 710-769 | Dark red glass, internal glow that pulses with the beat |
| Heartrock | 75.0 | ring around the chamber | Near-black with gold veins |
| **Husk plate** (dense) | 94.0 | radial spokes 2 wide, pointing at the chamber | Warm black-red, bark-like curved grain (old shed husk) |

- **Unbreakable:** *Null rock*. Pure flat black with a faint violet rim. 8%,
  in arcs concentric to the chamber. In the Core it also gets art's 2 px
  outline and diagonal hatch (R11).
- **Caves:** ~14% open, radial cracks pointing at the chamber.
- **Structures:** *the core chamber* (rows 750-769, an ellipse 36 wide x 18
  tall centred on column 23.5, row 761; open air, heartrock floor; the Seed,
  radius 3, rests on a Sower cradle at its centre; A19 on a pedestal at the
  edge beside the frame of an old pod); the *approach* (exactly 1 descending
  crack from row 700 to the chamber roof, so the last 50 rows are never a
  pure grind).
- **Caches:** *seed pods*, 6 (a hard dark capsule, like a Seed in miniature).
- **Hazards (new): the pulse.** Every 10 s the Seed beats. A ring of light
  travels up from the chamber at 40 tiles/s. When it passes the pod: +80 C
  for 1.5 s (D2) and a slow screen sway (D7). **No push.** A dive here is
  planned in beats against the radiator.
- **Life and decor:** rock flakes that drift with the beat, motes that orbit
  the chamber, the heartbeat light on every surface.

---

## 4. Ores

26 ores on Vell, plus one unique ore per planet biome (Sunstone, Lodestone):
28 in v1. Ore tile hardness = host rock x 1.15. Shapes are art's (R11, every
ore gets a shape class distinct within its biome); the colour family below is
the second channel, and within a biome no two ores share one.

Vein forms (generation): **scattered** (single tiles or pairs), **vein**
(random walk), **cluster** (compact blob), **pocket** (on the walls of geodes,
hollows, lake rims or rooms).

### Ore table

Vein counts in Magma, Ruins and Core are x1.5 the earlier table (R3).

| # | Ore | Collection log line | Rows | Peak | Form | Veins | Size | kg | Tier | Colour family | Glow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Coal | Black and dusty. Burns well, sells cheap. | 2-59 | 15 | Vein | 14 | 4-8 | 8 | 1 | black, matte | no |
| 2 | Copper | Green-orange flecks. The old town ran on this. | 3-90 | 25 | Vein | 18 | 3-6 | 10 | 1 | orange with verdigris green | no |
| 3 | Tin | Dull silver nubs, soft enough to dent with a thumb. | 18-75 | 45 | Cluster | 12 | 2-4 | 9 | 2 | dull pale grey | no |
| 4 | Iron | Rust-red and heavy. Bram calls it honest work. | 55-160 | 95 | Vein | 20 | 4-7 | 12 | 2 | rust red-brown | no |
| 5 | Lead | Very heavy, not worth much. Think before you carry it. | 70-160 | 120 | Cluster | 10 | 3-6 | 22 | 2 | dark blue-grey | no |
| 6 | Silver | Bright threads in grey stone. Ines smiles a little. | 85-180 | 130 | Vein | 12 | 2-5 | 11 | 3 | bright cold white | no |
| 7 | Gold | Buttery yellow nuggets. The reason the old mine dug this deep. | 115-190 | 150 | Scattered | 18 | 1-2 | 16 | 4 | yellow `#e0c040` (greener than the pod) | no |
| 8 | Quartz | Clear points in clusters. Catches the lamp nicely. | 160-250 | 185 | Cluster | 16 | 3-5 | 6 | 3 | clear white | faint white |
| 9 | Amethyst | Violet crystal, usually inside a geode. | 165-229 | 200 | Pocket (geodes) | - | - | 7 | 4 | violet | violet |
| 10 | Sapphire | Deep blue, cold to the touch. | 200-280 | 240 | Pocket (geodes) + scattered | 10 | 1-3 | 8 | 5 | deep blue | blue |
| 11 | Emerald | Green fire in pale rock. Rare and worth the trip. | 235-290 | 265 | Scattered | 10 | 1-2 | 8 | 6 | bright green | green |
| 12 | Sporestone | Stone soaked with fungus. It glows when you breathe on it. | 280-370 | 310 | Vein | 16 | 4-8 | 5 | 5 | teal | teal |
| 13 | Jade | Smooth green stone under the mushroom floors. | 290-400 | 340 | Cluster | 12 | 2-5 | 10 | 5 | deep olive green, waxy | no |
| 14 | Moonstone | Milky blue with a light that moves inside it. | 320-405 | 365 | Pocket (hollows) | - | - | 7 | 6 | milky pale blue | pale blue |
| 15 | Lumen amber | Old resin with spores trapped inside, still lit. | 350-410 | 385 | Scattered | 12 | 1-2 | 4 | 7 | honey amber | amber |
| 16 | Cinnabar | Red crystals. Ines handles it with gloves. | 400-490 | 430 | Vein | 24 | 3-6 | 14 | 6 | scarlet (brighter than scoria) | no |
| 17 | Platinum | Grey and plain until you weigh it. | 420-540 | 470 | Cluster | 18 | 2-4 | 18 | 7 | warm steel grey, matte | no |
| 18 | Fire opal | Orange flame caught in glass. | 450-545 | 500 | Pocket (lake rims) + scattered | 15 | 1-3 | 7 | 8 | orange, faceted | orange |
| 19 | Diamond | Hard, small, perfect. The heat made these. | 490-550 | 525 | Scattered | 15 | 1 | 6 | 9 | ice white, faceted | faint white |
| 20 | Sower scrap | Bent pieces of a metal nobody here can make. | 540-640 | 570 | Pocket (rooms) + scattered | 21 | 2-4 | 15 | 8 | dark bronze-grey | no |
| 21 | Orichalcum | Gold-red alloy. The Sowers built their doors with it. | 560-680 | 610 | Vein + vault | 18 | 3-5 | 14 | 9 | red-gold | dim gold |
| 22 | Voidstone | Light as cork, darker than shadow. Light bends around it. | 600-690 | 650 | Scattered | 15 | 1-2 | 3 | 10 | black with violet rim | violet rim |
| 23 | Sunglass | Warm glass made by the Sowers' kilns, still warm. | 570-680 | 630 | Cluster | 12 | 2-3 | 6 | 9 | lemon yellow glass | yellow |
| 24 | Heartstone | Red stone that beats with the core, slower than yours. | 680-769 | 720 | Vein (radial) | 18 | 3-6 | 12 | 10 | deep red | red pulse |
| 25 | Stellite | White metal that hums. Sefa says it fell, long ago. | 700-769 | 740 | Cluster | 12 | 2-3 | 10 | 11 | white metal | white |
| 26 | Seedglass | Clear as water, a speck of the Seed inside. | 730-769 | 755 | Scattered | 9 | 1 | 2 | 12 | clear, prismatic | prismatic |
| 27 | Sunstone (Cinder) | Gold light that never cooled. It is warmer than the rock around it. | 320-410 | 370 | Vein | 20 | 2-4 | 9 | 7 | gold-orange | gold |
| 28 | Lodestone (Ferrum) | Black iron that turns to face you. Keep it away from the scanner. | 220-285 | 260 | Cluster | 16 | 3-5 | 20 | 6 | black with blue sheen | no |

Notes:

- **Lead and Voidstone are cargo decisions** (D3): Lead is heavy and cheap,
  Voidstone light and rich. Lodestone is heavy and mid-value, Ferrum's own
  weight problem.
- **Bands overlap biome edges by 10-30 rows**, so the next biome's first ore
  is a teaser at the bottom of the current one.
- **Glow starts in Crystal** (R11): the first glowing ore is a moment. Glow
  colours stay apart from hazard tells (gas yellow-green, lava and geysers
  orange on a crack or vent, spores pale green; Fire opal's orange is on a
  bright faceted shape, never a crack).
- **Pockets:** a geode's lining tiles become ore with 40% chance, Amethyst
  above row 230 and Sapphire from row 230 (10 geodes x ~25 lining tiles,
  about 60 Amethyst and 40 Sapphire), plus the star geode (~44 lining, 60%
  Sapphire/Emerald). Moonstone: 3% of hollow wall tiles in its band (~20).
  Fire opal: 15% of lava lake rim tiles (~8) on top of its scattered veins.
  Orichalcum: 6-10 per vault (~32) on top of its veins.
- **The Lift column holds no ore** (section 6).

### Ore share per biome (what the table produces)

Diggable tiles = rows x 46 x (1 - open - unbreakable). Ore tiles are the
expected veins x mean size, split between biomes by each ore's triangular
row weight (section 6), so spill across a boundary counts where it lands.
Pieces = tiles x yield. Rounded.

| Biome | Diggable tiles | Ore tiles (largest parts) | Share | Yield | Pieces |
|---|---|---|---|---|---|
| Topsoil | 60 x 46 x (1 - .025 - .005) = 2,677 | Coal 84, Copper 70, Tin 31, Iron 4 = 189 | 7.0% | 1 | 189 |
| Stone | 100 x 46 x (1 - .09 - .03) = 4,048 | Iron 106, Lead 45, Silver 38, Gold 19, Copper 11, Tin 5 = 225 | 5.6% | 1 | 225 |
| Crystal | 120 x 46 x (1 - .12 - .05) = 4,582 | Amethyst 75, Quartz 64, Sapphire 65, Emerald 13, Gold/Silver 12 = 229 | 5.0% | 2 | 457 |
| Fungal | 120 x 46 x (1 - .22 - .06) = 3,974 | Sporestone 96, Jade 42, Moonstone 20, Lumen amber 15, Emerald 2 = 175 | 4.4% | 2 | 350 |
| Magma | 140 x 46 x (1 - .15 - .07) = 5,023 | Cinnabar 108, Platinum 54, Fire opal 37, Diamond 13, Lumen amber 3 = 215 | 4.3% | 3 | 645 |
| Ruins | 140 x 46 x (1 - .18 - .10) = 4,637 | Orichalcum 104, Sower scrap 63, Sunglass 30, Voidstone 21, Diamond/Fire opal 3 = 221 | 4.8% | 3 | 662 |
| Core | 90 x 46 x (1 - .26 - .08) = 2,720 (open includes the chamber, ~509 tiles) | Heartstone 81, Stellite 30, Seedglass 9, Voidstone 2 = 122 | 4.5% | 4 | 486 |
| Ash hollows (Cinder) | 120 x 46 x (1 - .18 - .06) = 4,195 | Jade 98, Sunstone 56, Moonstone 20, Emerald 2 = 176 | 4.2% | 2 | 352 |
| Banded deeps (Ferrum) | 120 x 46 x (1 - .10 - .05) = 4,692 | Quartz 72, Lodestone 60, Amethyst 36, Sapphire 28, Gold/Silver 12 = 207 | 4.4% | 2 | 414 |

Deeper ore is rarer per tile but each tile gives more pieces. Against
progression's run-1 sales (about 208 pieces in Magma, 311 in Ruins, 265 in
the Core with the 5 Heartstone), about 68%, 53% and 45% is left at launch,
above R3's 30%, before caches and rich pockets. Planet ore modifiers
(progression) come on top. The bot measures the real numbers (D17).

### Jackpot finds

Rare one-offs with a fanfare (sound sting, a light flash, a log entry). Each
is a single tile that reads as special: larger sprite inside its tile, strong
glow (the one exception to "no glow before Crystal"), a slow sparkle. Value =
the biome's top ore piece price x the multiplier, x6 to x10 (D5: about 3
hauls at its depth at most).

| Find | Biome | Per world | Where | x top ore | Log line |
|---|---|---|---|---|---|
| Fallen star | Topsoil | 1 | rows 30-58, inside a small scorched pocket | x10 | A meteorite, still warm. It came from above, the wrong way. |
| Buried strongbox | Topsoil | 2 | rows 10-55 | x6 | Somebody's savings, forty years buried. |
| Motherlode nugget | Stone | 1 | rows 130-158, end of a mine tunnel | x10 | The nugget the old mine was looking for. They stopped one tile short. |
| Payroll chest | Stone | 1 | inside a rubble plug | x6 | Last month's wages. Nobody came to collect. |
| Starheart | Crystal | 1 | centre of the star geode | x10 | A crystal that holds a star's light. It never dims. |
| Moonpearl | Fungal | 2 | inside a giant mushroom cap | x8 | The mushroom grew around it for a thousand years. |
| Phoenix diamond | Magma | 1 | floor of the deepest lava lake | x10 | A diamond born in fire. It is cool to touch. |
| Sower crown | Ruins | 1 | the 4th vault | x10 | A ring of six points. Too big for a human head. |
| Seed tear | Core | 1 | heartrock ring, beside the chamber | x8 | A drop the Seed let fall. It is still moving inside. |

On Cinder and Ferrum the replaced biome's jackpot is replaced too:
**Ember heart** (Cinder, 1, inside the vent hall's main geyser cone, x10,
"A geyser's last breath, caught and cooled. It still flickers.") and **Iron
seed** (Ferrum, 1, at the centre of the forge, x10, "A ball of iron as
round as a Seed. It turns slowly to face the core."). Every planet keeps the
counts and rolls new positions.

### Caches (R10)

A cache is a themed 1-tile container in rock, about 1 per 15 rows of every
biome (51 on Vell). It digs at 0.8x the host's typical hardness and shows on
the scanner as a small square. Drilling it opens it: its contents go into
cargo like ore; what does not fit stays in the open cache to come back for.

| Biome | Cache | Count | Holds |
|---|---|---|---|
| Topsoil | Crate | 4 | 3 pieces |
| Stone | Mine cart | 7 | 3 pieces |
| Crystal | Fossil geode | 8 | 6 pieces |
| Fungal | Spore cache | 8 | 6 pieces |
| Magma | Ember chest | 9 | 9 pieces |
| Ruins | Sower coffer | 9 | 9 pieces |
| Core | Seed pod | 6 | 12 pieces |
| Ash hollows | Ash urn | 8 | 6 pieces |
| Banded deeps | Iron strongbox | 8 | 6 pieces |

Pieces = `3 x (1 + floor(b / 2))`, rolled from the ores whose band covers the
cache's row, upper half of the biome's tiers only (a cache is worth opening).
One cache in three also holds one item: a fuel cell, repair kit or dynamite
above Magma; coolant or a big charge from Magma down; never a teleporter.
Before Crystal a cache does not glow; from Crystal on it may carry a faint
glow in its theme colour.

### The rich pocket (R10)

Each dive rolls one rich pocket: a vein of one ore at x2 its table's maximum
size, within 25 rows below the deepest row reached, shown on the scanner
with a faint shimmer.

- **Deterministic:** rolled when the pod leaves the depot, from its own
  stream `mulberry32(hash32(worldSeed, "pocket", diveCount))`; `diveCount` is
  saved, and the save keeps the pocket's tiles as part of the world's
  difference. Reloading never rerolls it.
- **Placement:** pick the row uniformly in `[deepest + 1, deepest + 25]`
  (clamped above row 748), then the ore by the ore weights at that row (the
  planet's unique ore included), then a seed tile by up to 40 tries. Grow it
  with the ore's form into plain host rock only.
- **Fair:** host tiles must be untouched, diggable by the current drill (not
  dense, not unbreakable, no structure); the pocket keeps 3 tiles from any gas,
  lava, vent or pylon and stays out of columns 22-26; its seed must be reached
  by the connectivity check from a tile the player has opened. If 40 tries
  fail, the next row band down is tried; if the world has nothing fair, no
  pocket that dive.
- **Not a pile-up:** at most 2 unmined pockets at a time; while 2 stand, no
  new one rolls. A pocket stays until mined.

---

## 5. Artifacts and story

19 artifacts on Vell in three threads: **the old mine** (what Gantry lost),
**Wren** (a person to follow down), **the Sowers** (what the core is).
Artifacts weigh nothing and take no cargo; carried ones survive a wreck
(D15) and go to Sefa at the lab when you surface. Sefa reads each one aloud
the first time (text in the log).

| # | Name | Biome, rows | Placement | Text |
|---|---|---|---|---|
| A1 | Foreman's tally board | Stone, 70-110 | Embedded in a mine tunnel wall | Shift counts for the last week of the old mine. The numbers stop on a Thursday. In the margin, in pencil: "it hums". |
| A2 | Cracked lantern | Stone, cart room | On the cart room floor | A miner's lamp, warm in the hand. The glass is etched from the inside, fine lines, like something sang at it. |
| A3 | Letter never sent | Stone, 140-159 | Embedded in rock below the deepest shaft | "Ida, don't come down. The rock under the bottom shaft isn't rock. It's a wall. Somebody built it. - Wren" |
| A4 | Singing quartz | Crystal, singing chamber | Pedestal of crystal | Tap it and it plays back a sound: slow voices counting. The count goes down. |
| A5 | Glass tablet | Crystal, 200-260 | Inside a geode | Thin as paper, harder than steel. The same short mark repeats on every line, like a name said over and over. |
| A6 | Wren's pick | Crystal, 250-279 | Embedded in rock, near the star geode | A rock pick with W.A. burned into the handle, wedged in on purpose. It points down. |
| A7 | Six-fingered hand | Fungal, 290-340 | Embedded in a hollow wall | A stone hand with six fingers, grown over with mycelium. The fungus has fed on it gently for a very long time. |
| A8 | Spore map | Fungal, great hollow | The great hollow floor (pick up the central glowing node) | The fungus grew along something buried. From above, its lines are a map of rooms far below. |
| A9 | Wren's journal, page 12 | Fungal, 360-399 | Under a giant mushroom | "Day nine. The light down here follows the pod. I think it has been waiting for someone to follow it." |
| A10 | Heat-sealed urn | Magma, the Kiln | Pedestal | Inside: ash, and a smooth seed the size of a fist. It is cold, here, in all this heat. |
| A11 | Bronze plate | Magma, the Kiln | Wall of the Kiln | A picture: a round thing in a cradle, small figures around it, and a dotted line from it up into the stars. |
| A12 | Melted badge | Magma, 500-539 | Embedded in obsidian | A dig licence, half melted. "Wren Aster, Gantry, No. 31." She made it this far. |
| A13 | Sower door-key | Ruins, 545-580 | In the first room below the boundary | A ring of dark metal. Every vault seal down here has a hollow exactly its size. (Vault seals drop to hardness 25, D9.) |
| A14 | Nursery frieze | Ruins, the Nursery | Nursery wall | Small figures carry a glowing ball from world to world. Each world is drawn smaller and older than the last. |
| A15 | Keeper's last order | Ruins, vault 1 | Vault pedestal | Sefa's best reading: "When it is ready, do not keep it. Lift it. We waited, and the fire came up to meet us." |
| A16 | The cradle list | Ruins, Nursery vault | Vault pedestal | A stone cradle, shaped for something round. On its rim, a list of worlds. The last line is this one. Below it, a blank line. |
| A17 | Wren's note in the vault | Ruins, vault 3 | Vault floor | "I opened one, Ida. They didn't die down here. They lay down beside it so it wouldn't be alone." |
| A18 | Seed husk | Core, 690-740 | Embedded in pressure stone | A curved plate shed by the core, like bark. Warm. It beats about once every ten seconds. |
| A19 | Wren's last note | Core chamber | Pedestal beside an old pod frame | "It isn't a weapon and it isn't treasure. It's a seed, and it wants to go. I can't lift it alone. Tell Ida I saw the stars from underneath." |

On Cinder and Ferrum the Wren thread does not repeat. Relics already in the
log are not placed again, except the door-key (A13), which lies in the same
place on every planet because the vaults need it. Each planet's own biome
holds its 6 relics (section 7).

### How the player knows one is near

- **Sound:** within 10 tiles (20 with Prospector's Ear), a soft two-note
  chime every 4 s; pitch and volume rise as distance falls. The only
  positional "you are close" cue in the game.
- **Scanner:** shows artifacts in range as a pale gold diamond, drawn over
  ore and hazard dots.
- **Sight:** in lamp light the tile has a slow gold glint (a reflection, not
  a glow); on a pedestal from Crystal down it has its own soft light.
- **Vaults** show on the scanner as a gold outline from 20 tiles away, even
  sealed, so the player sees the lure early.

### Story beats on first entry

One line each, shown quietly at the top of the screen for 4 s, no pause.

| Biome | Line |
|---|---|
| Topsoil (first dive) | Ida: "The old mine closed when I was a girl. Let's see what's left down there." |
| Stone | "Timber and rails. Nobody has been down here in forty years." |
| Crystal | "The walls hum back at your drill." |
| Fungal | "It's dark. But something down here makes its own light." |
| Magma | "The rock is warm. Then hot. Watch the radiator." |
| Ruins | "Straight walls. Square doors. Nobody from Gantry built this." |
| Core | "Your instruments drift. Something below beats, slowly." |
| Core chamber | "There it is." |
| Ash hollows (Cinder) | "Ash, all the way down. Something here breathes fire on a schedule." |
| Banded deeps (Ferrum) | "Iron in stripes. Your scanner doesn't like it." |

### The launch (prestige moment)

1. Wake the Seed per D8: the lance plans unlock on first reaching the Core
   (R6), the lance is bought in three parts at Ida's launch site, and you
   bring 5 Heartstone and dock against the Seed.
2. The Seed cracks its husk, light floods the chamber, the pod is carried
   along as it rises up the Lift column. The camera follows it up through the
   biomes in about 12 seconds, each flashing past in its colours: a replay of
   the run.
3. It breaks the surface beside Gantry, hangs for a beat, then climbs. The
   town stands outside. Ida: "Wren would have liked to see that."
4. Shards rain down, counted on screen.
5. Observatory. Ida: "It's headed for a dim star. There's a planet there.
   Older than ours. Want to follow it?" Then the planet choice (section 7).

---

## 6. World generation

The whole world is generated at once (48x770 = 36,960 tiles; target under
50 ms).

### Determinism

- One `worldSeed` (uint32) per planet visit:
  `hash32(saveSeed, planetId, launchCount)`.
- Each pass has its own stream: `rng(pass) = mulberry32(hash32(worldSeed,
  passName))`. Passes never share a stream, so tuning one pass never moves
  another pass's output. The rich pocket has its own per-dive stream
  (section 4).
- Noise: OpenSimplex2 (2D) with a permutation table shuffled by the pass's
  rng. Only + - * / and Math.floor in the generation path, never
  Math.sin/cos/atan2/exp/pow, so a seed produces the same world in every
  browser and in the bot. Angles around the chamber use a pseudo-angle
  (`dy / (|dx| + |dy|)` by quadrant), not atan2.
- Fixed iteration order: passes in the order below, tiles in row-major order.

### Pass order

1. **Biome map.** Boundaries with jitter and transition bands; the planet's
   biome replaces its slot (section 7).
2. **Base material.** Per biome, a material noise `m = simplex(x*0.11,
   y*0.11)` picks between that biome's materials by row range and thresholds
   (e.g. Stone: shale if m < -0.1 and row < 120, granite if m > 0.25 and row
   >= 110, limestone otherwise).
3. **Caves.**
4. **Structures**, guaranteed ones first, with the Lift keep-out.
5. **Dense material.**
6. **Unbreakable rock.**
7. **Ores.**
8. **Caches.**
9. **Hazards.**
10. **Artifacts and jackpots.**
11. **Fair-start, connectivity and Lift checks, repair.**

### Caves per biome

`n(x,y)` = fractal simplex (2 octaves, gain 0.5) unless noted, y scaled by
`s_y` to stretch caves horizontally. Open targets are fractions of interior
tiles; tune thresholds against them with a histogram at build time.

| Biome | Algorithm | Frequency | Condition | Open target | Shape |
|---|---|---|---|---|---|
| Topsoil | simplex | 0.09, s_y 1.4 | n > 0.72, row >= 6 | 2-3% | Small pockets, 1-4 tiles |
| Stone | simplex + worms | 0.07, s_y 1.6 | n > 0.62 | 7% + tunnels | Flat, wide caves; worms are mine tunnels |
| Crystal | cellular (Worley F2-F1) | cell size 7 | F2-F1 < 0.12, and simplex(0.05) > 0.1 | 12% | Faceted, crack-like |
| Fungal | cellular automaton | init fill 47% where simplex(0.03) > -0.2 | 5 steps: wall if >= 5 of 8 neighbours are wall | 22% | Big round hollows |
| Magma | worms + simplex | simplex 0.08 | n > 0.66 | 15% | Lava tubes, round pockets |
| Ruins | room grid | macro cell 12 x 10 | see structures | 18% | Rectangles, corridors |
| Core | polar noise | simplex on (pseudo-angle x 6, radius x 0.12) around the chamber centre | n > 0.6 | 14% | Radial cracks |
| Ash hollows | cellular automaton | init fill 44% where simplex(0.03) > -0.1 | 5 steps, as Fungal | 18% | Lower, flatter hollows with ash floors |
| Banded deeps | simplex | 0.06, s_y 3.0 | n > 0.66 | 10% | Long flat caves along the bands |

Worms (Stone tunnels, Magma tubes): start at a random interior point, walk
with heading changing by +-15 degrees per step, snapped to the grid (stay
horizontal with 85% chance per step in Stone, 70% in Magma), carve 1 tile
(Stone, 25% of tunnels 2 tall) or 1-2 tall (Magma). Stop at unbreakable or
the biome edge.

### Structures and the Lift column

Guaranteed structures are placed first, by rejection sampling inside their
row band (up to 40 tries, then relax the band by 5 rows and retry). Each stays
>= 3 tiles from columns 0/47 and >= 4 tiles from another structure.

**The Lift keep-out** (R2b). The Lift carves column 24 through anything, from
the mine mouth to the chamber roof, so:

- Structures with contents, seals or liquid (cart room, geodes, the star
  geode, singing chamber, Moonpearl caps, lava lakes, the Kiln, vaults, the
  Nursery, the vent hall, the forge) and every cache, artifact and jackpot
  keep columns 21-27 clear. The Lift never cuts one.
- Big open structures (the great hollow, Ruins rooms) may straddle it: the
  Lift cuts their roof and floor and its cage rides through the open air.
  Linear ones (mine tunnels, vertical shafts, lava tubes, Ruins corridors,
  the approach crack) may cross it: the Lift opens a doorway where they meet.
- The core chamber contains column 24 by design: the Lift's last segment
  stops at the chamber roof.
- No hazard of any kind in columns 22-26 at any depth, and no lava, lava
  pocket or geyser within 3 columns (21-27), so a ride is always safe.
- No ore, cache or artifact in column 24 itself. Dense and unbreakable tiles
  may sit in it; the player routes around them until the Lift carves them.

| Structure | Count | Rows | Size | Notes |
|---|---|---|---|---|
| Mine mouth | 1 | 0-3 | 1 wide | Column 24, pre-dug, timber rim |
| Mine tunnels | 4-6 | 65-155 | 12-30 long | Timber post every 4 tiles; 30% end in a rubble plug |
| Vertical shafts | 1-2 | 70-150 | 1 x 10-25 | Ladder decor |
| Cart room | 1 | 110-150 | 7x4 | A2 |
| Geodes | 8-12 | 165-275 | radius 2-5 ellipse, x radius 1.3x y radius | 1-tile crystal lining; 40% of lining becomes Amethyst (above 230) or Sapphire |
| Singing chamber | 1 | 190-230 | 9x5 | A4 |
| Star geode | 1 | 240-275 | radius 6 | Lining 60% Sapphire/Emerald; Starheart at centre |
| Great hollow | 1 | 320-370 | >= 20x12 | Ellipse, then CA-smoothed; A8 |
| Mushroom forests | per hollow | 280-399 | stalks 3-7 tall | Every hollow floor width >= 8 |
| Lava lakes | 3-5 | 415-535 | width 6-18 | Bottom 40% of the cave; crust where the roof is <= 2 tiles above lava |
| The Kiln | 1 | 480-520 | 12x7 | Sower brick; A10, A11 |
| Ruins rooms | 10-14 | 545-675 | 6-11 x 4-6 | On the macro grid, 70% of cells get a room; L-shaped corridors (1-2 tall) join neighbours |
| Sealed vaults | 4 | 560-675 | 5x4 interior | Wall all round, 1 seal on a side facing a room or corridor |
| The Nursery | 1 | 620-660 | 16x8 | A14; its vault holds A16 |
| Approach crack | 1 | 700-750 | 1-2 wide | Random walk biased down (60% down, 20% left, 20% right) |
| Core chamber | 1 | 750-769 | 36x18 ellipse | Seed radius 3 at (23.5, 761); heartrock ring 2 thick |
| Vent hall (Cinder) | 1 | 330-370 | 10x6 | Sower hall around a big geyser; C3, C5; Ember heart in the cone |
| The forge (Ferrum) | 1 | 220-260 | 10x6 | Sower forge hall, anvil and cold hearth; F2, F6; Iron seed at centre |

### Dense material

Placed after structures, never on a structure tile, the mine mouth or within
3 columns of it above row 12. Per biome a stretched noise `d` picks the
shape, and a tile is dense where `d > t_b`, with `t_b` tuned by histogram to
10% of the biome's diggable tiles:

| Biome | Noise | Shape |
|---|---|---|
| Topsoil | simplex(x*0.04, y*0.35), rows 12+ | horizontal bands |
| Stone | simplex((x + 0.3y)*0.35, y*0.04) | near-vertical dikes |
| Crystal | Worley F1 < r, cell 9 | blobs |
| Fungal | simplex(x*0.05, y*0.4) | shelves |
| Magma | simplex((x + y)*0.05, (x - y)*0.3) | diagonal flows |
| Ruins | 3-6 x 2-4 rectangles in macro cells with no room | slabs |
| Core | polar simplex (pseudo-angle x 12, radius x 0.03) | radial spokes |
| Ash hollows | simplex(x*0.06, y*0.3) | thick sheets (welded tuff) |
| Banded deeps | simplex(x*0.03, y*0.5) | long horizontal bands (magnetite) |

Routing rule: in any row, dense plus unbreakable stays under 60% of interior
tiles, and any dense run longer than 12 tiles gets a 2-tile gap of host rock.

### Unbreakable rock

- Seeds: per-tile chance by biome: Topsoil 0.002 (rows 20+), Stone 0.008,
  Crystal 0.012, Fungal 0.010, Magma 0.012, Ruins by rule (room corners, 50%
  of corridor roofs, vault walls), Core 0.015, Ash hollows 0.010, Banded deeps
  0.010.
- Growth to the shapes in section 3 (Topsoil max 2; Stone horizontal seam
  2-6; Crystal blob 2-5; Fungal curving walk 3-10; Magma vertical run 3-8;
  Core arcs around the chamber 4-9; Ash hollows lumps 2-4; Banded deeps
  nodules 1-3).
- Caps: no row more than 45% unbreakable; no horizontal run longer than 14;
  none within 3 columns of the mine mouth above row 12; never on a tile an
  ore or artifact holds.

### Ores

For each ore, for each vein: pick a seed tile inside its band, weighted by a
triangular curve peaking at its peak row
(`w(y) = 1 - |y - peak| / max(peak - start, end - peak)`); reject if the tile
is air, unbreakable, dense, another ore or in column 24; retry up to 20
times. Growth, size uniform in the table's range:

- **Vein:** next tile is a random 4-neighbour of the last placed, with 25%
  chance to branch from any earlier tile of the vein.
- **Cluster:** a random 8-neighbour of any tile already in the cluster.
- **Scattered:** the seed, plus 1 neighbour if size is 2.
- **Pocket:** only on tiles touching the named open structure, at the rates
  in section 4.

Ores never replace unbreakable, dense, structure decor or artifacts.

### Caches

One per 15-row slice of each biome (round(rows / 15)): a random row in the
slice, a random column in 3-44 outside 21-27, on a diggable non-dense tile
that is not ore, >= 3 tiles from any hazard. 70% of caches touch air or a
structure wall, so most are found by looking and the rest by the scanner.

### Hazards

Every hazard has an **intro ramp**: in the first 20 rows of the biome that
introduces it, it appears at half density and only where its tell is visible
from an adjacent open tile, and its first instance is >= 8 tiles horizontally
from the Lift column. No hazard above row 8 or in columns 22-26.

| Hazard | Rows | Density | Rules |
|---|---|---|---|
| Sand pocket | 8-59 | 6 blobs of 3-8 | Not within 2 tiles of the starter vein |
| Boulder | 62-679 | Stone 0.006/tile, Crystal 0.003, Fungal 0.002, Magma 0.002, Ruins 0.001 | Only over a diggable tile; never rows 60-64 |
| Gas pocket | 165-679 | Crystal 0.004, Fungal 0.002, Magma 0.005, Ruins 0.002 | 1-3 tiles; pockets never touch each other (no chain blasts); never within 3 tiles of a structure entrance, artifact or cache; never directly above lava |
| Spore vent | 285-399 | 1 per 8 rows | On hollow floors or walls; >= 4 tiles from another vent |
| Lava lake | 415-535 | see structures | No lava above row 415 |
| Lava pocket | 420-679 | Magma 0.004, Ruins 0.001 | 1-4 tiles, fully enclosed by rock |
| Arc pylons | 545-679 | 1 pair per 3 rooms | Across gaps 1-6 wide; never across a vault seal |
| False floor | 560-679 | 2-4 per room floor, at most 1 room in 2 | Over a room or corridor below |
| Pulse | 680-769 | global | +80 C for 1.5 s, sway; no push |
| Geyser (Cinder) | 285-399 | 1 per 8 rows | On cave floors; >= 4 tiles from another; never under an artifact or cache |
| Magnetic storm (Ferrum) | 160-279 | global, every 60-90 s | Lodestone outside columns 20-28 |

### Artifacts and jackpots

Each is placed in its band, at least 15 rows from the previous artifact,
outside columns 21-27, never on unbreakable or dense, never inside a hazard's
area, and on a tile the connectivity check reaches. Embedded artifacts touch
at least one other diggable tile so the chime leads somewhere real.

### Fair-start and connectivity

Checked after all passes; repaired, not rerolled, so a seed always works.

1. The mine mouth is column 24, rows 0-3 open.
2. **Starter vein:** at least 6 Copper tiles within rows 3-10 and 6 columns
   of the mouth (never column 24), at least 2 visible on the first screen. If
   missing, stamp a 6-tile vein at a valid spot in that box.
3. At least 4 Coal tiles within rows 2-8, and 1 Tin cluster by row 22.
4. No hazard above row 8 or in columns 22-26; no unbreakable or dense within 3
   columns of the mouth above row 12.
5. **First ore pays:** at least 8 tiles of each biome's first ore in its first
   20 rows within 10 columns of the mouth (Iron, Quartz, Sporestone,
   Cinnabar, Sower scrap, Heartstone; Jade on Cinder, Quartz on Ferrum).
6. **Connectivity:** BFS from the mouth moving down, left and right through
   any non-unbreakable tile (liquid excluded) reaches row 760, and every
   artifact, cache and vault seal. If not, carve from the deepest reached row
   by turning unbreakable into typical rock along a walk biased down.
7. **Routing:** the same BFS treating dense as wall also reaches each
   biome's bottom row, so dense rock is a detour, never a wall. If not, cut a
   2-tile gap in the blocking dense run (to typical rock).
8. **Return:** every open structure larger than 20 tiles has a way up the pod
   can fly (an air column to its roof or a diggable roof tile).
9. **Lift column:** walk column 24 from row 0 to the chamber roof; any
   protected structure, cache, artifact, jackpot, hazard or lava the keep-out
   missed is moved by re-running its placement.

---

## 7. Planets (prestige)

v1 has three planets (R14): Vell, Cinder and Ferrum. Each keeps Vell's
seven-layer column (the familiar, fast part) and replaces one mid-column
biome with its own (the new, slow part): its materials, unique ore, hazard,
named place, jackpot and 6 relics (R4). Gravity, value and modifiers are
progression's; a planet's heat modifier applies only to its own biome's rows
(R5). After a launch Ida offers the unlocked planets other than the one just
left.

The cradle list runs oldest to newest. Vell's list (A16) ends at Vell, with
Cinder and above it Ferrum among the lines before. On an older world the list
ends at that world, and below it, cut later and less evenly, the next world
the Sowers went on to plant. The log's copy gains a line per launch.

### Cinder: the Ash hollows (rows 280-399, replaces Fungal)

Look: red-orange sky, black soil, an orange grade over the familiar biomes.
Feeling: a hollow world that breathes fire on a timetable.

| Material | Hardness | Rows | Colour |
|---|---|---|---|
| Ash bed | 2.5 | hollow floors | Soft grey ash, footprints of drifting embers |
| Tuff | 6.9 | 280-399 | Dusty grey-brown, pumice flecks |
| Clinker | 8.0 | 330-399 | Black-brown, glassy lumps |
| **Welded tuff** (dense) | 13.8 | thick sheets | Dark grey, fused flat streaks |

- **Unbreakable:** *Fused slag*. Black-green glass lumps, 6%.
- **Ores:** Jade (T5, 28 veins: it takes Sporestone's place), Moonstone (T6,
  hollow walls), **Sunstone** (T7, unique, gold glow). Sporestone and Lumen
  amber do not occur. Colour families: olive green, milky pale blue,
  gold-orange.
- **Hazard: geysers.** A vent (a cracked black cone with an orange core) on a
  cave floor erupts every 8 s for 1.5 s: a 1-wide column of fire straight up,
  up to 6 tiles or the first solid tile. Tell: for 1 s before, the core
  brightens and spits sparks and a hiss rises. Vents are unbreakable. Damage
  and heat are core-loop's.
- **Named place:** the vent hall (structures table). **Cache:** ash urns.
  **Life:** fire beetles that run from the lamp.

| # | Relic | Rows | Placement | Text |
|---|---|---|---|---|
| C1 | Charred tally | 285-305 | Embedded in tuff | The counting marks again, the ones the singing quartz played on Vell. Here they reach zero, and then start over. |
| C2 | Glazed bowl | 300-325 | In a hollow wall | A bowl glazed by fire from below. Six finger marks were pressed into the clay before it set. |
| C3 | Vent chart | vent hall | Wall | Lines scratched around every vent in the hall, a time beside each. They learned when the fire would come, and walked between. |
| C4 | Walking frieze | 340-365 | Embedded in clinker | The figures carry the ball again, but here none of them lie down. They walk away from the cradle toward a small star low on the horizon. |
| C5 | Cinder's cradle list | vent hall | Pedestal | The cradle list, shorter than Vell's. The last carved line is this world. Below it, cut fast and less evenly, one more name. Sefa reads it as Vell. |
| C6 | Keeper's word | 380-399 | Embedded in clinker | Sefa's best reading: "We leave it planted and go on. Whoever comes: it will know when it is ready. Lift it then." |

### Ferrum: the Banded deeps (rows 160-279, replaces Crystal)

Look: rust and steel, a metallic grade. Feeling: heavy, striped, and the
scanner you rely on goes quiet.

| Material | Hardness | Rows | Colour |
|---|---|---|---|
| Rust | 1.8 | pockets | Crumbly orange-brown |
| Banded ironstone | 3.6 | 160-279 | Grey and rust stripes |
| Jasper | 4.3 | 210-279 | Dull brick red, waxy |
| **Magnetite** (dense) | 7.2 | long horizontal bands | Black, metallic sheen, fine stripes |

- **Unbreakable:** *Meteoric iron*. Pitted dark grey nodules, 5%.
- **Ores:** Quartz (T3, 18 veins), Amethyst (T4, 12 veins of 2-4: no geodes
  here, it grows in the bands' cracks), Sapphire (T5, 14 scattered),
  **Lodestone** (T6, unique, heavy). Emerald does not occur. Colour families:
  clear white, violet, deep blue, black with blue sheen.
- **Hazard: magnetic storms and lodestone.** While the pod is in these rows,
  every 60-90 s a storm blows for 10 s: the scanner pulse returns nothing
  (outlines already on the map stay). Tell: 3 s before, scanner outlines
  flicker and a crackle rises. During a storm, any Lodestone within 3 tiles
  tugs the pod toward it at up to 0.5 tiles/s, never while drilling or
  landed. Outside storms Lodestone is inert. Mining it removes the tug.
- **Named place:** the forge (structures table). **Cache:** iron strongboxes.
  **Life:** rust mites that scatter from the lamp.

| # | Relic | Rows | Placement | Text |
|---|---|---|---|---|
| F1 | Sounding rod | 165-185 | Driven into ironstone | A Sower rod hammered into the bands. It still hums, at the pitch of the core. They used the iron to listen. |
| F2 | Forge plate | the forge | Wall | Six-fingered hands pressed into the plate while it was soft. Two of them are small. Children helped. |
| F3 | Compass ring | 200-225 | Embedded in jasper | A lodestone set in a ring. Its needle does not point north. It points at the Seed, wherever you carry it. |
| F4 | Storm count | 225-250 | In a cave wall | Rows of marks with a gap between each, like the storms you have been counting. Beside the last row, a hand pressed flat: wait. |
| F5 | Ferrum's cradle list | 255-279 | Embedded in magnetite | The cradle list again, older still. It ends at this world, and below it, in another hand, Cinder. The first line is worn almost smooth. |
| F6 | Small cradle | the forge | Pedestal | A cradle half forged, too small for any Seed you have seen. Sefa thinks the first Seed was small, and each one since has grown a little. |

### Later (not v1)

- **Glaze:** white-blue, cold; Brine caverns, Frost opal, icicles.
- **Mire:** teal haze; flooded tunnels, Bog amber, water that slows the pod.
- **Hollow:** pale lavender, two moons; low gravity, Driftstone, floating
  rocks.
- **Orrery:** gold and deep blue; long Sower cities, Sower glass, wardens.
  The first, worn name on the cradle list.

---

## 8. Collection log

Seven categories. Every entry shows as a dark silhouette until found, then
name, log line, first-found depth and date, total count. Completion rewards
are progression's. Counts are for v1 (Vell, Cinder, Ferrum).

| Category | Entries |
|---|---|
| Ores | 28: Vell's 26, Sunstone, Lodestone |
| Finds | 11 jackpots (Vell's 9, Ember heart, Iron seed) and 9 cache kinds (counts tracked) |
| Relics | 31: Vell's 19 grouped by thread (the old mine A1-A3; Wren A3, A6, A9, A12, A17, A19; the Sowers the rest), Cinder's 6, Ferrum's 6 |
| Places | 9 biomes and 15 named places (cart room, singing chamber, star geode, great hollow, the Kiln, the Nursery, core chamber, vent hall, the forge, a vault, a geode, a mine tunnel, a lava lake, a mushroom forest, a ruins room) |
| Life | 18 (worm, bat, glass moth, glowcap, jellyshroom, cricket, cinderling, fire beetle, rust mite, ...); seen = in lamp light for 2 s |
| Planets | 3, with the cradle list as a page, one line per launch |
| Records | Deepest row, richest single haul, longest dive, fastest core, launches |

---

## 9. Open questions

1. **Core-loop:** does lava treat a built Lift column as a wall? Generation
   keeps lava 3 columns away, but a player can open a path to it.
2. **Progression:** do caches and the rich pocket need their own value check
   against the jackpot cap and the 1.7x biome-entry guard? Their pieces are
   ordinary ore, so I expect not.
3. **Progression:** Cinder's Ash hollows have 3 ore tiers (5-7) and Ferrum's
   Banded deeps 4 (3-6); check the price ladder across each replaced biome.
4. **Art:** shape classes for Sunstone and Lodestone, and the dense
   materials' textures inside the diggable band.
