# Ramparts: content tables

Owner: content writer. These are the final numbers and words an engineer transcribes into
`game/content/*.ts`. Mechanics and formulas come from `systems.md` (battle) and `run-meta.md`
(run and meta); where this file changes one of their numbers, or fills a number they left open,
the call is listed in **Reconciliations** at the end with its reason. Everything else here
follows those two docs as written. DESIGN.md's Revision 1 rulings (R1-R34) are applied throughout;
section 16 lists what they changed.

Writing rules for every player-facing line: plain words, one line, no jargon, no exclamation
marks except the codex toasts. Names are title case; flavour is sentence case and ends with a
full stop.

---

## 0. Conventions

| Thing | Rule |
| --- | --- |
| Distance | **u** (one path width). Ranges are pad centre to enemy centre. |
| Time | seconds; the sim converts with `round(s * 30)` ticks. |
| Damage | fixed per hit. `dps` = damage per second. DoTs tick every 0.5 s unless stated. |
| Percent stats | whole points. Armour 45 = 45% less physical damage. |
| `act` | 1..4. |
| **x act** | the number is multiplied by the act's `spellMul` (1.0 / 1.4 / 1.9 / 2.4). Used for spells and for the few flat-damage relics and boons, so they do not fall off. Ignite (60 + burn) stays flat, as `systems.md` 5.5 says. |
| **x gold** | multiplied by the act's `bountyMul` (1.0 / 1.1 / 1.2 / 1.3), rounded half up. |
| Rounding | gold and crowns: half up. Lives healed: up. HP and damage: floats, shown with `ceil`. |

### 0.1 Stat pools (where every bonus goes)

`systems.md` 4.4 is the rule: the same effect from two sources does not stack (strongest wins);
different effects add into one pool; pools multiply once. Every boon, relic and passive below names
its pool with one of these codes.

| Code | Pool | Combine | Cap |
| --- | --- | --- | --- |
| `base` | the tower's own numbers (damage, chill, dps, radius, count) before anything else | adds | none |
| `dealt` | damage dealt % on that tower (step 1 of the formula) | adds | none |
| `taken:<status>` | a damage-taken status on the enemy; one value per status (max of sources) | statuses add into TAKEN | +100% total; **+150% on an enemy hexed by a Hexer** (R12) |
| `aspd` | attack speed %: best banner aura in reach, plus boons, relics, Rally, War Horn | adds on top of the best aura (Field Forge: the two best auras add) | +100% (Overclock: +200%) |
| `range` | range or radius %, including high ground's +15% | adds | +40% |
| `slow` | slow % on an enemy | max of all | speed never below 25% |
| `critC` | crit chance | adds | 75% |
| `critM` | crit multiplier | highest wins | (Deadeye's Oath: x5 on marked) |
| `shred` / `corrode` | stacks of -5 armour / -5 ward | adds | 6 stacks (Acid and Shrapnel 10, their own) |
| `pierce` | % of armour ignored (after shred) | adds | 100% |
| `wardIgnore` | flat ward points ignored (after corrode) | adds | |
| `dur` | a status or effect duration | adds (seconds) | |
| `cost` | gold cost % of one purchase (build, each upgrade, spec): every discount and surcharge lives here (Thrifty, Veteran, Overseer, Siege Engine, Mason's Seal, Standard Bearer, Requisition, Cold Hands, Rust, the 5th and 6th blueprint) | adds | **-50% per purchase** (R3) |
| `gold` | battle gold: start gold, bounty %, wave income, interest rate and cap % | adds | |
| `run` | crowns, lives, prices, rewards (run layer) | adds | prices never below 50% of base |
| `rule` | a rule change; not a number pool | | |

**Free purchases** (Spare Planks, Drillmaster) are not pool entries: they pay whatever the purchase
costs after the pool, so they never stack below zero and never stack with each other.

**Cap-lifters** (R19): six rares each lift one cap, judged by win-rate lift (<= 15 points), not by a
damage ceiling: Field Forge (banners stack), Hexer (taken cap +150%), Endless Winter (shatter chains
have no limit), Deadeye's Oath (marked crits x5), Wildfire Crown (burns stack up to 3 sources),
Overclock (attack-speed cap +200%).

---

## 1. Acts

| Act | Name (UI) | Mood line (act card) | Boss (one rolled at the act start, shown on the map) | `hpMul` | `bountyMul` | `spellMul` | Threat base `B` | Start gold | Interest cap | Waves (battle / elite / boss) | Countdown `G` | Act trait |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I | The Meadow | Hay, wildflowers and an old road. The calm before. | Gorrak the Warlord or the Hive Queen | 1.0 | 1.0 | 1.0 | 10 | 260 | 20 | 7 / 8 / 7 + boss | 10 s | none |
| II | The Desert Ruins | Bleached stone and a buried empire, under a white sun. | The Sand Wyrm or the Lich | 1.4 | 1.1 | 1.4 | 14 | 330 | 25 | 8 / 9 / 7 + boss | 10 s | **Sun-hardened**: brutes heavy armour (65), shieldbearers medium (45). |
| III | The Frozen Peaks | Thin air, pale noon, and snow that never melts. | The Frost Colossus or the Pack-Lord | 1.9 | 1.2 | 1.9 | 19 | 400 | 30 | 9 / 10 / 7 + boss | 9 s | **Cold-blooded**: chill gained -25%; fire taken +20%. |
| IV | The Ember Citadel | Ash on the wind. The enemy's own door. | The Ember Tyrant (always) | 2.4 | 1.3 | 2.4 | 24 | 470 | 35 | 9 / 10 / 8 + boss | 9 s | **Fireproof**: natives take 25% less fire (Tyrant 30%); chill gained +25%. |

Boss rolls use the run's `map` stream at the act start (50 / 50). **Run 1's first battle** has 6
waves and 320 start gold (R13); every later first battle follows the table.

Act trait text on the battle roster, exactly: "Sun-hardened: their brutes and shieldbearers wear
heavier armour." / "Cold-blooded: they chill slowly and burn easily." / "Fireproof: they shrug off
fire, but the cold bites them."

**Battle tier by floor** (the open "proposal, systems" in `run-meta.md` 2): a battle's whole threat
budget is multiplied by its floor factor.

| Floor | F1 | F2 | F3 | F4 | F5 | Boss (F7) | Act IV Ash Road / Gatehouse | Act IV boss |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Floor factor | 0.90 | 0.95 | 1.00 | 1.05 | 1.10 | 1.00 | 1.05 | 1.00 |

Event ambushes use the floor's factor. Bounty nodes use their floor's factor.

**Pacing** (R13): with 7 / 8 / 9 / 9 waves a normal battle runs ~2:20 / ~2:35 / ~2:45 / ~2:50 at 1x
with no early calls, plus about 30 s of setup; elites add one wave (~17 s).

---

## 2. Towers

### 2.1 Overview

| Key | Tower | Base cost `c` | Damage | Reach | Default target | Unlocked | Blueprint rarity | Build menu line (<= 60 chars) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| archer | Archer | 70 | physical | air + ground | First | start | common | Fast arrows at air and ground. Cheap and steady. |
| barracks | Barracks | 70 | physical (melee) | ground (blocks) | n/a (rally) | start | common | Three soldiers block the road. Ground only. |
| mage | Mage | 100 | magic | air + ground | First | start | common | Magic bolts that ignore armour. Hits air too. |
| bombard | Bombard | 125 | physical splash | ground | First | start | common | Slow shells that blast groups. Ground only. |
| frost | Frost Spire | 100 | magic + chill | air + ground | First | start | uncommon | Chills and freezes. Little damage, lots of time. |
| pyre | Pyre | 100 | fire | ground | First | start | uncommon | Short flame cone. Fire ignores armour and ward. |
| alchemist | Alchemist | 100 | magic + oil | ground | First | renown level 1 | uncommon | Lobs oil: slows the road and feeds fire. |
| storm | Storm Spire | 125 | magic chain | air + ground | First | renown level 5 | rare | Lightning jumps between enemies. Breaks shields. |
| beacon | Beacon | 90 | none (support) | air + ground | Strongest (marks) | renown level 9, or with the Seer | rare | Shows hidden enemies and marks them for crits. |
| banner | War Banner | 90 | none (support) | aura | n/a | renown level 12 | uncommon | Nearby towers attack faster. Deals no damage. |
| ballista | Ballista | 120 | physical, pierce | air + ground | Strongest | renown level 14 | rare | Long-range bolts that punch through armour. |
| thornwood | Thornwood Grove | 100 | physical aura + root | ground | First (root) | with the Warden (renown level 6) | uncommon | Thorns hurt all nearby; roots hold one in place. |

**Cost curve** (every tower): L1 `c`, L2 `1.1c`, L3 `1.6c`, specialisation `2.4c` (Treasury
`1.8c`, R11), rounded to 5. Every discount or surcharge adds into the `cost` pool, floored at -50% of
each purchase (R3). **A 5th and a 6th blueprint each add +5% to every L1 cost** (`cost`; R18), so
owning six is a choice. Build 0.6 s, upgrade 0.4 s, sell 0.3 s (tower inactive meanwhile). Sell
refund: 100% of spent gold during Setup, 70% after; **no selling once the last wave has started**
(Reconciliations). Selling takes a second press of X within 1.5 s (R28).

Target modes on every attacking tower: **First** (closest to its exit), **Strongest** (most HP +
shield), **Last** (furthest from its exit). `T` cycles them.

Projectile kinds: **homing** (always hits a living target), **lobbed** (lands at a predicted spot:
`position + speed x flight time` in a straight line along the enemy's current heading, R8, so fast
enemies dodge shells at bends: "Bombards like straights"), **instant** (no travel), **cone/aura** (no
projectile). Projectile speeds live only in this file (R33).

**High ground** (R25): one pad per map (two from act III) stands raised; a tower on it gets +15%
range (`range`, inside the +40% cap). **Rubble** (ascension 7): one pad per map is rubble until you
pay 60 gold to clear it (0.6 s, any time, no refund).

**Ghost layout** (R13): from a run's second battle, Setup offers "your last battle's towers on
matching pads": Enter accepts. Each tower of the last battle is matched to a free pad of the same tier
and coverage rank and rebuilt at L1, in order of the gold it had invested, skipping any you can't
afford when its turn comes; upgrades stay yours to buy.

### 2.2 Archer

*Flavour:* "Good bows, steady hands, and a roof against the rain."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 70 (70) | 80 (150) | 110 (260) |
| Damage | 8 physical | 12 physical | 17 physical |
| Attack interval | 0.70 s | 0.65 s | 0.60 s |
| DPS (single, before resist) | 11.4 | 18.5 | 28.3 |
| Range | 3.4 | 3.6 | 3.8 |
| Reach | air + ground | air + ground | air + ground |
| Projectile | homing arrow, 14 u/s | same | same |
| Crit | 5% x2.0 | 5% x2.0 | 5% x2.0 |

| Spec (cost 170, cumulative 430) | Marksmen | Volley |
| --- | --- | --- |
| Flavour | "One arrow, chosen with care." | "Look up. Then run." |
| Damage | 46 physical | 3 arrows x 9 physical, at 3 different targets; with fewer targets the spare arrows hit the same ones at half damage |
| Attack interval | 1.15 s | 0.60 s |
| Range | 4.8 | 3.8 |
| Reach | air + ground | air + ground (Arrow Rain too) |
| Projectile | homing bolt, 22 u/s | homing arrows, 14 u/s |
| Crit | 20% x2.5; **Deadeye**: crits on Marked enemies x3.5 | 5% x2.0 (each arrow rolls) |
| Pierce | 30% | 0 |
| Mechanic | Deadeye (above) | **Arrow Rain** every 5th attack: 8 arrows x 12 physical over 1.0 s, each strikes one random enemy (air or ground) inside r 1.2 around the densest point in range; one enemy takes at most 3 Rain arrows; Rain arrows can crit |
| Default target | Strongest | First |
| Spec line (radial tooltip) | "A sniper. Big crits, best on marked foes." | "Three arrows at once, and a rain of them." |

### 2.3 Barracks

*Flavour:* "They signed up for the bread. They stay for each other."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 70 (70) | 80 (150) | 110 (260) |
| Soldiers | 3 | 3 | 3 |
| Soldier HP | 60 | 90 | 130 |
| Soldier armour / ward | 0 / 0 | 15 / 0 | 30 / 0 |
| Soldier damage | 5 physical / 1.0 s | 8 / 1.0 s | 12 / 1.0 s |
| Respawn | 10 s | 9 s | 8 s |
| Holds | 1 each | 1 each | 1 each |
| Rally range (from pad) | 2.6 | 2.6 | 2.6 |
| Engage radius (around rally) | 1.4 | 1.4 | 1.4 |
| Soldier move speed | 2.2 u/s | 2.2 | 2.2 |
| Regen | 10% max HP/s after 2 s out of combat | same | same |

| Spec (cost 170, cumulative 430) | Paladins | Blademasters |
| --- | --- | --- |
| Flavour | "The road ends here, and so do you." | "Two blades each, and no patience." |
| Soldier HP | 240 | 160 |
| Armour / ward | 45 / 30 | 25 / 0 |
| Damage | 16 physical / 1.0 s | 16 physical / 0.8 s, crit 10% x2.0 |
| Holds | **2 each above 50% HP**, 1 below (R12) | 1 each |
| Respawn | 8 s | 8 s |
| Mechanic | **Lay on Hands**: once per life, at < 30% HP, heal to full. Regen 15% max HP/s after 2 s out of combat | **Dodge** 30% of melee hits. **Whirl** every 4 s: 30 physical to every ground enemy within 0.9 u + 1 shred each |
| Spec line | "Holy walls. Each one stops two." | "Blockers who kill. Their whirl cracks armour." |

### 2.4 Mage

*Flavour:* "Old words, spoken quickly."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 100 (100) | 110 (210) | 160 (370) |
| Damage | 24 magic | 38 magic | 54 magic |
| Attack interval | 1.5 s | 1.4 s | 1.3 s |
| DPS | 16.0 | 27.1 | 41.5 |
| Range | 3.2 | 3.3 | 3.5 |
| Reach | air + ground | air + ground | air + ground |
| Projectile | homing bolt, 10 u/s | same | same |

| Spec (cost 240, cumulative 610) | Arcanist | Hexer |
| --- | --- | --- |
| Flavour | "Why hit one when the spell can travel?" | "It doesn't kill you. It makes everything else kill you." |
| Damage | 70 magic, **chains 2 jumps** (jump 1.8 u, -25% each: 70 / 53 / 39) | 60 magic |
| Attack interval | 1.3 s | 1.2 s |
| Range | 3.8 | 3.6 |
| Projectile | homing bolt, 12 u/s; jumps instant | homing bolt, 10 u/s |
| Mechanic | **Arcane Burst** every 4th bolt: 50 magic in r 1.0 at the first target (splash, linear to 50% at edge) | **Hex** 5 s on hit: +25% damage taken (all types), cannot be healed, shields on it halved. Every 3rd bolt hexes all within 1.2 u of the target. **Curse Spread**: a hexed enemy dying passes hex (5 s) to the 2 nearest within 1.5 u. **An enemy hexed by a Hexer has its damage-taken cap raised to +150%** (R12; other hex sources keep +100%) |
| Default target | First | Strongest |
| Spec line | "Bolts leap to two more foes." | "Hexed foes take more from everyone." |

Hex by level for any Mage hex source (Lingering Hex boon): L1 20%, L2 22%, L3 25%, Hexer 25%.

### 2.5 Bombard

*Flavour:* "Loud, slow, and very sure of itself."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 125 (125) | 140 (265) | 200 (465) |
| Damage | 28 physical | 44 physical | 66 physical |
| Splash radius | 1.0 | 1.1 | 1.2 |
| Splash falloff | 100% at centre, linear to 50% at edge | same | same |
| Attack interval | 2.6 s | 2.5 s | 2.4 s |
| Range | 3.0 | 3.2 | 3.4 |
| Reach | ground | ground | ground |
| Projectile | lobbed shell, flight 1.0 s | same | same |

| Spec (cost 300, cumulative 765) | Mortar | Shrapnel |
| --- | --- | --- |
| Flavour | "From the back row, with love." | "Everything near the bang gets a piece." |
| Damage | 120 physical, splash r 1.4 | 56 physical, splash r 1.1; **+2 shred** on everything hit |
| Attack interval | 3.2 s | 2.0 s |
| Range | 4.6 | 3.4 |
| Projectile | lobbed, flight 1.4 s | lobbed, flight 0.9 s |
| Mechanic | **Crater**: 3 s, 30% slow in r 1.0 where it lands | **Bomblets**: 4 per shell, scattered within 1.2 u, each 18 physical in r 0.6 + 1 shred. Shrapnel's own shred cap is **10 stacks** (R12) |
| Spec line | "Huge range, huge blast. Leaves a slowing crater." | "Cracks armour on everything it hits." |

### 2.6 Frost Spire

*Flavour:* "The cold does the work. The spire just points."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 100 (100) | 110 (210) | 160 (370) |
| Damage | 5 magic | 8 magic | 12 magic |
| Chill per hit | 18 | 22 | 26 |
| Attack interval | 1.0 s | 0.9 s | 0.8 s |
| Chill per second | 18 | 24.4 | 32.5 |
| Range | 3.0 | 3.1 | 3.3 |
| Reach | air + ground | air + ground | air + ground |
| Projectile | homing shard, 12 u/s | same | same |
| Freeze | 1.5 s, then Thawing 3 s | same | same |

| Spec (cost 240, cumulative 610) | Glacier | Shatter |
| --- | --- | --- |
| Flavour | "Winter, on a small scale." | "Ice is just glass that hasn't broken yet." |
| Bolts | as L3 (12 magic, 26 chill, 0.8 s) | 20 magic, 40 chill, 0.8 s |
| Range | 3.3 | 3.3 |
| Mechanic | **Nova** every 3.5 s: 35 chill + 30 magic to everything within 2.4 u of the tower (air and stealthed too). Its freezes last **2.0 s** | Its freezes make **Brittle**: +50% physical taken for the freeze + 1 s. A Brittle enemy that dies **shatters**: 25% of its max HP as pure damage in r 1.2 + 30 chill. A shatter that kills another Brittle enemy chains; **a chain stops after 4 links** (Endless Winter lifts it) |
| Spec line | "Pulses cold around itself. Freezes last longer." | "Frozen foes take more from arrows and bolts, and burst." |

Chill rules (systems 5.2): freezeAt 60 tiny / 100 small / 150 heavy / 250 elite; decays 20/s after
1.5 s without new chill; chill counts as a slow of `40% x meter / freezeAt`.

### 2.7 Alchemist

*Flavour:* "Smells terrible. Works wonderfully."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 100 (100) | 110 (210) | 160 (370) |
| Flask damage | 15 magic, r 0.9 splash | 24 magic | 36 magic |
| Attack interval | 2.4 s | 2.2 s | 2.0 s |
| Range | 3.0 | 3.1 | 3.3 |
| Reach | ground | ground | ground |
| Projectile | lobbed flask, flight 0.8 s | same | same |
| Oil puddle | r 0.9, 4 s | r 0.9, 5 s | r 0.9, 6 s |
| Puddle effect | 25% slow inside; **Oiled** while inside + 4 s | same | same |
| Max puddles per tower | 3 (oldest goes) | 3 | 3 |

| Spec (cost 240, cumulative 610) | Acid | Naphtha |
| --- | --- | --- |
| Flavour | "Eats through plate, and through charms." | "Mind the drip." |
| Flasks | as L3 | as L3 |
| Puddles | acid, 7 s; still oil (slow, Oiled) | as L3 |
| Mechanic | Inside acid: **15 magic dps, 1 shred and 1 corrode per second** (Acid's own cap 10 each) | When one of its puddles is lit it **explodes once**: 90 fire in r 1.4, then burns as a fire patch for 4 s at 25 fire dps. Every **4th flask is a firebomb** that lights its own puddle on landing |
| Spec line | "Acid strips armour and ward alike." | "Its oil explodes. Every fourth flask lights itself." |

Ignite (systems 5.5, unchanged): an Oiled enemy hit by any fire loses Oiled, takes **60 fire** and
**burn 20 dps for 4 s**; a puddle it stands in becomes a fire patch (20 fire dps) for its remaining
time (min 3 s). Touching puddles light one tick apart.

### 2.8 Pyre

*Flavour:* "Keep your hands inside the wall."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 100 (100) | 110 (210) | 160 (370) |
| Cone | 70°, toward its target, ticks every 0.2 s | same | same |
| Cone damage | 10 fire dps | 16 fire dps | 25 fire dps |
| Burn | 5 dps, 3 s | 8 dps, 3 s | 12 dps, 3 s |
| Range | 2.2 | 2.3 | 2.4 |
| Reach | ground | ground | ground |
| Ignites oil | yes | yes | yes |

| Spec (cost 240, cumulative 610) | Inferno | Firestorm |
| --- | --- | --- |
| Flavour | "It gets hotter the longer you stand there." | "Fire from the sky, for once on our side." |
| Damage | cone 36 fire dps; burn 18 dps, 4 s | every 2.5 s, **3 fireballs** at 3 different targets (repeat if fewer): 40 fire in r 0.8 + burn 10 dps 4 s |
| Range | 2.6 | 3.8 |
| Reach | ground | **air + ground** (fireballs hit flyers at **50%**, R12); burning ground is ground only |
| Projectile | cone | lobbed fireball, flight 0.9 s |
| Mechanic | **Heat**: +15% damage per second on the same primary target, up to +120%; resets on retarget (adds into `dealt`) | **Burning ground** where a fireball lands: 3 s, 15 fire dps, r 0.8; lights oil |
| Default target | Strongest | First |
| Spec line | "A melting beam for big targets." | "Fireballs that reach far, and hit flyers." |

### 2.9 Storm Spire

*Flavour:* "Copper, rain and a bad temper."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 125 (125) | 140 (265) | 200 (465) |
| Damage (first target) | 30 magic | 44 magic | 62 magic |
| Targets (first + jumps) | 2 | 3 | 4 |
| Jump | 1.6 u, -25% per jump | same | same |
| Attack interval | 1.7 s | 1.6 s | 1.5 s |
| Range | 3.0 | 3.1 | 3.3 |
| Reach | air + ground | air + ground | air + ground |
| Projectile | instant | instant | instant |

All Storm damage: **x3 against shield points** (leftover to HP at /3). **Conductive**: against
Chilled or Frozen targets +30% damage (`dealt`), and jumps from them reach 2.4 u.

| Spec (cost 300, cumulative 765) | Tempest | Overload |
| --- | --- | --- |
| Flavour | "The sky is full of it today." | "Hold still. You won't have a choice." |
| Damage | 64 magic, **6 jumps** (7 targets) | 84 magic, 3 jumps (4 targets) |
| Attack interval | 1.3 s | 1.6 s |
| Range | 3.3 | 3.3 |
| Mechanic | **Static Field** every 4 s: 50 magic to every flyer within 3.5 u | each hit adds a **Charge** (5 s); at 3 Charges the enemy is **stunned 1.5 s** (bosses 0.4 s) and discharges 40 magic in r 1.0; Charges reset |
| Spec line | "Long chains, and a field that shocks flyers." | "Every third hit stuns and sparks." |

### 2.10 Beacon

*Flavour:* "Nothing hides from a good lamp."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 90 (90) | 100 (190) | 145 (335) |
| Radius | 3.0 | 3.2 | 3.4 |
| Reveal | stealthed enemies in radius (+1 s after leaving) | same | same |
| Mark | the strongest unmarked enemy in radius, every 3.0 s, for 5 s | every 2.5 s | every 2.0 s |
| Marked | +20% crit chance against (`critC`), +8% taken | +12% taken | +15% taken |
| Reach | air + ground | air + ground | air + ground |

| Spec (cost 215, cumulative 550) | Lighthouse | Hunter's Mark |
| --- | --- | --- |
| Flavour | "Shine on the ones who shoot." | "One bell for every head." |
| Radius | 3.8 | 3.6 |
| Mark | as L3 | **3 marks at once** (elites and bosses first), refreshed every 2.0 s, **+30% taken** |
| Mechanic | Towers on pads within 3.0 u (pad to pad): **+15% range** and **+10% crit chance**. A beam sweeps the radius every 3 s and marks everything it crosses (L3 value) | When a marked enemy dies the mark jumps at once to the nearest unmarked enemy in radius. A kill on a marked enemy pays **+2 gold** (x gold) |
| Spec line | "Nearby towers reach further and crit more." | "Marks three foes. Marked kills pay gold." |

### 2.11 War Banner

*Flavour:* "Stand under it and you stand a little taller."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 90 (90) | 100 (190) | 145 (335) |
| Aura (pad to pad; soldiers by rally point) | 2.6 | 2.6 | 2.6 |
| Attack speed in aura (`aspd`, banner) | +10% | +14% | +18% |

Banners never stack: each tower and soldier takes the best banner aura in reach (Field Forge, the
Banner keystone, adds the two best).

| Spec | War Drums (cost 215, cumulative 550) | Treasury (cost **160**, cumulative **495**; R11) |
| --- | --- | --- |
| Flavour | "Boom. Boom. Faster now." | "The war pays for itself, if you count carefully." |
| Aura | 2.8 | 2.6 |
| Effect | **+25% attack speed and +15% damage dealt** (`dealt`); soldiers in aura +25% damage and double regen | +18% attack speed; kills by towers in its aura give **+25% bounty** (`gold`); **+1 crown for every wave that starts while it stands**, paid after the battle outside the leftover-gold cap (`run`). Treasuries do not stack with each other: the bounty bonus and the crown count once however many stand |
| Spec line | "Faster and harder hits for the whole cluster." | "More gold for kills nearby, and a crown each wave." |

### 2.12 Ballista

*Flavour:* "Built to hit the castle. Hits you instead."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 120 (120) | 130 (250) | 190 (440) |
| Damage | 50 physical | 80 physical | 115 physical |
| Pierce | 50% | 50% | 50% |
| Attack interval | 2.6 s | 2.5 s | 2.4 s |
| DPS | 19.2 | 32.0 | 47.9 |
| Range | 4.4 | 4.7 | 5.0 |
| Reach | air + ground | air + ground | air + ground |
| Projectile | homing bolt, 22 u/s | same | same |

| Spec (cost 290, cumulative 730) | Harpoon | Siege Bolt |
| --- | --- | --- |
| Flavour | "Come here." | "It does not stop for the first one." |
| Damage | 170 physical, pierce 50% | 130 physical, **ignores all armour** |
| Attack interval | 2.6 s | 3.2 s |
| Range | 5.0 | 5.6 |
| Projectile | homing harpoon, 20 u/s | straight bolt, 28 u/s, flies the full range in a line through its target, hitting every enemy it passes (air and ground, within 0.4 u of the line) |
| Mechanic | every 3rd shot **pulls** the target 2.5 u back along its path over 0.3 s; a flyer is **Grounded** 4 s instead; juggernauts and bosses get 60% slow for 1 s instead | the line (above) |
| Default target | Strongest | Strongest |
| Spec line | "Drags big foes back, and pulls flyers down." | "A bolt through the whole line. No armour helps." |

### 2.13 Thornwood Grove

*Flavour:* "The old wood remembers every boot."

| | L1 | L2 | L3 |
| --- | --- | --- | --- |
| Cost (cumulative) | 100 (100) | 110 (210) | 160 (370) |
| Aura radius | 2.0 | 2.1 | 2.2 |
| Thorns | 6 physical dps to every ground enemy inside (ticks 0.5 s) | 10 dps | 15 dps |
| Root | every 6.0 s, the First root-able enemy in the aura, 1.2 s | every 5.5 s, 1.4 s | every 5.0 s, 1.6 s |
| Reach | ground (hits stealthed) | same | same |

| Spec (cost 240, cumulative 610) | Bramble | Ancient Treant |
| --- | --- | --- |
| Flavour | "Every step costs something." | "It was asleep for three hundred years. It is awake now." |
| Aura | r 2.6, 22 physical dps | as L3 (r 2.2, 15 dps) |
| Mechanic | 20% slow inside; 1 shred per 2 s inside; **roots 3** enemies every 5 s for 1.6 s | summons a **Treant**: HP 800, armour 35, **holds 3**, slam every 2.0 s for 50 physical in r 1.0, regen 2% max HP/s after 2 s out of combat, respawn 15 s, rally within 2.2 u of the pad |
| Spec line | "A thorny zone that slows, cracks and roots." | "A giant guardian that holds three at once." |

### 2.14 DPS per gold (sanity check)

Model: a clump of 5 enemies 0.6 u apart on a straight path, pad 1.3 u from the path (the closest
R4 allows). **Single** = output on one target; **group** = total output on the clump (splash with
falloff, chain falloff, cone hits 2.5, aura hits all 5, line hits 3). **Coverage** = path length in range relative to a
3.2 u tower (`chord(r) / chord(3.2)`), because a range is part of what gold buys. Melee output is
halved (walking, dying, respawning). Per 100 gold uses cumulative cost x coverage. Towers are compared
with their own class at the same purchase step (single-target towers on single, area towers on
group); Frost and Barracks are control and are not judged on damage. Crits at base chance included.

| Tower | Class | Cumulative gold | Single DPS | Group DPS | Coverage | Single per 100 g | Group per 100 g | vs class median | Flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Archer L1 | single | 70 | 12.0 | 12.0 | 1.07 | 18.4 | 18.4 | 1.00 |  |
| Archer L2 | single | 150 | 19.4 | 19.4 | 1.15 | 14.8 | 14.8 | 1.00 |  |
| Archer L3 | single | 260 | 29.8 | 29.8 | 1.22 | 14.0 | 14.0 | 1.00 |  |
| Marksmen | single | 430 | 52.0 | 52.0 | 1.58 | 19.1 | 19.1 | 1.41 |  |
| Volley | area | 430 | 44.1 | 80.9 | 1.22 | 12.5 | 23.0 | 1.06 |  |
| Barracks L1 | control | 70 | 15.0 | 15.0 | 0.77 x0.5 | 8.3 | 8.3 | - | utility |
| Barracks L2 | control | 150 | 24.0 | 24.0 | 0.77 x0.5 | 6.2 | 6.2 | - | utility |
| Barracks L3 | control | 260 | 36.0 | 36.0 | 0.77 x0.5 | 5.3 | 5.3 | - | utility |
| Paladins | control | 430 | 48.0 | 48.0 | 0.77 x0.5 | 4.3 | 4.3 | - | utility |
| Blademasters | control | 430 | 73.5 | 115.5 | 0.77 x0.5 | 6.6 | 10.3 | - | utility |
| Mage L1 | single | 100 | 16.0 | 16.0 | 1.00 | 16.0 | 16.0 | 0.87 |  |
| Mage L2 | single | 210 | 27.1 | 27.1 | 1.04 | 13.4 | 13.4 | 0.90 |  |
| Mage L3 | single | 370 | 41.5 | 41.5 | 1.11 | 12.5 | 12.5 | 0.89 |  |
| Arcanist | area | 610 | 63.5 | 147.6 | 1.22 | 12.7 | 29.5 | 1.36 |  |
| Hexer | single | 610 | 50.0 | 50.0 | 1.15 | 9.4 | 9.4 | 0.70 |  |
| Bombard L1 | area | 125 | 10.8 | 25.8 | 0.92 | 8.0 | 19.1 | 1.00 |  |
| Bombard L2 | area | 265 | 17.6 | 43.2 | 1.00 | 6.6 | 16.3 | 1.00 |  |
| Bombard L3 | area | 465 | 27.5 | 96.3 | 1.07 | 6.4 | 22.3 | 1.29 |  |
| Mortar | area | 765 | 37.5 | 139.3 | 1.51 | 7.4 | 27.5 | 1.27 |  |
| Shrapnel | area | 765 | 37.0 | 111.9 | 1.07 | 5.2 | 15.7 | 0.73 |  |
| Frost L1 | control | 100 | 5.0 | 5.0 | 0.92 | 4.6 | 4.6 | - | utility |
| Frost L2 | control | 210 | 8.9 | 8.9 | 0.96 | 4.1 | 4.1 | - | utility |
| Frost L3 | control | 370 | 15.0 | 15.0 | 1.04 | 4.2 | 4.2 | - | utility |
| Glacier | control | 610 | 15.0 | 57.9 | 1.04 | 2.6 | 9.8 | - | utility |
| Shatter | control | 610 | 25.0 | 25.0 | 1.04 | 4.3 | 4.3 | - | utility |
| Alchemist L1 | area | 100 | 6.3 | 14.6 | 0.92 | 5.8 | 13.5 | 0.71 |  |
| Alchemist L2 | area | 210 | 10.9 | 25.5 | 0.96 | 5.0 | 11.7 | 0.72 |  |
| Alchemist L3 | area | 370 | 18.0 | 42.0 | 1.04 | 5.0 | 11.8 | 0.68 |  |
| Acid | area | 610 | 31.0 | 82.3 | 1.04 | 5.3 | 14.0 | 0.65 |  |
| Naphtha | area | 610 | 59.3 | 161.3 | 1.04 | 10.1 | 27.4 | 1.27 |  |
| Pyre L1 | area | 100 | 15.0 | 37.5 | 0.61 | 9.1 | 22.8 | 1.19 |  |
| Pyre L2 | area | 210 | 24.0 | 60.0 | 0.65 | 7.4 | 18.5 | 1.14 |  |
| Pyre L3 | area | 370 | 37.0 | 92.5 | 0.69 | 6.9 | 17.2 | 1.00 |  |
| Inferno | single | 610 | 97.2 | 178.2 | 0.77 | 12.3 | 22.5 | 0.91 |  |
| Firestorm | area | 610 | 63.0 | 156.8 | 1.22 | 12.6 | 31.4 | 1.45 |  |
| Storm L1 | area | 125 | 17.6 | 30.9 | 0.92 | 13.0 | 22.9 | 1.20 |  |
| Storm L2 | area | 265 | 27.5 | 63.6 | 0.96 | 10.0 | 23.1 | 1.42 |  |
| Storm L3 | area | 465 | 41.3 | 113.0 | 1.04 | 9.2 | 25.2 | 1.46 |  |
| Tempest | area | 765 | 49.2 | 150.2 | 1.04 | 6.7 | 20.4 | 0.94 |  |
| Overload | area | 765 | 52.5 | 143.6 | 1.04 | 7.1 | 19.5 | 0.90 |  |
| Ballista L1 | single | 120 | 19.2 | 19.2 | 1.44 | 23.0 | 23.0 | 1.25 |  |
| Ballista L2 | single | 250 | 32.0 | 32.0 | 1.54 | 19.8 | 19.8 | 1.33 |  |
| Ballista L3 | single | 440 | 47.9 | 47.9 | 1.65 | 18.0 | 18.0 | 1.28 |  |
| Harpoon | single | 730 | 65.4 | 65.4 | 1.65 | 14.8 | 14.8 | 1.09 |  |
| Siege Bolt | area | 730 | 40.6 | 121.9 | 1.86 | 10.4 | 31.1 | 1.44 |  |
| Thornwood L1 | area | 100 | 6.0 | 30.0 | 0.52 | 3.1 | 15.6 | 0.82 |  |
| Thornwood L2 | area | 210 | 10.0 | 50.0 | 0.56 | 2.7 | 13.4 | 0.82 |  |
| Thornwood L3 | area | 370 | 15.0 | 75.0 | 0.61 | 2.5 | 12.3 | 0.71 |  |
| Bramble | area | 610 | 22.0 | 110.0 | 0.77 | 2.8 | 13.9 | 0.64 |  |
| Treant | area | 610 | 40.0 | 135.0 | 0.61 | 4.0 | 13.4 | 0.62 |  |

Class medians (per 100 gold, coverage-weighted): single-target L1 18.4, L2 14.8, L3 14.0, spec 13.5;
area L1 19.1, L2 16.3, L3 17.2, spec 21.7. Every attacking tower sits inside 0.6x-1.5x of its class
median after the changes listed in Reconciliations (before them: Marksmen 1.58x, Storm L2/L3 1.60x
and 1.90x, Siege Bolt 1.66x, Treant 0.59x; at R4's 1.3 u pad distance the Treant fell to 0.59x again
and its slam went 45 -> 50). Notes on the ones near an edge, all deliberate:

- **Storm L3 1.46x, Firestorm 1.45x, Siege Bolt 1.44x, Storm L2 1.42x**: the model's clump is their
  best case. Firestorm pays with fireproof act IV, the fire/ice rule and half damage to flyers;
  Storm's single-target output is 0.6x of a Mage per gold; Siege Bolt counts 3 enemies per line,
  which only a straight gives.
- **Marksmen 1.41x**: range 4.8 buys coverage, not damage; its raw single DPS (52) is below the L3
  Mage's per gold. Deadeye with a Beacon is a named S synergy (40-100% over the pair) and sits on top.
- **Hexer 0.70x, Shrapnel 0.73x, Acid 0.65x, Bramble 0.64x, Treant 0.62x, Alchemist 0.68-0.72x**: each
  trades damage for a team effect the model does not count (hex +25% for every tower and a +150%
  taken cap, shred/corrode up to -50 armour or -50 ward, slows, roots, a 800 HP blocker that holds 3).
- **Barracks, Frost Spire**: control towers. Their worth is the time they buy, measured by the bot
  as leaks prevented per gold, not here.
- Support (Beacon, War Banner) is worth a share of the towers around it: an L1 Banner beside three
  L2 towers (~60 group DPS) adds ~6 DPS for 90 gold; War Drums beside four L3s adds ~45% to them.

---

## 3. Boons

91 boons: 7 per tower (4 common, 2 uncommon, 1 keystone rare; Frost Spire has a second rare,
Endless Winter, and War Banner one uncommon after War Tax was cut) and 7 universal. Each boon is
unique per run. **Tempered (+)** versions come from forges, rests and some events; a tempered boon
replaces its base numbers (where a row has no tempered rule, tempered = +50% of the boon's numbers,
R34). A boon applies to every copy of that tower built in a battle, at every
level and both specs unless it says otherwise. "Needs" = the keystone is offered only while you own
that blueprint (`run-meta.md` "no dead picks").

Card text is the Effect column, exactly. The Pool column is for the engineer.

### 3.1 Archer

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Barbed Tips | common | Arrows deal +2 damage (Volley arrows and Arrow Rain +1). | +3 (Volley +2) | `base` | "Small hooks. Big difference." |
| Taut Strings | common | +12% attack speed. | +18% | `aspd` | "Wax the string, mind your fingers." |
| High Perch | common | +12% range. | +18% | `range` | "Higher roof, wider view." |
| Keen Eyes | common | +6% crit chance. | +10% | `critC` | "Aim for the gap in the helmet." |
| Twin Shot | uncommon | Every 5th arrow is shot twice at the same target (Marksmen: every 4th shot; Volley: every 5th volley). | every 4th (Marksmen 3rd, Volley 4th) | `rule` | "Two arrows, one breath." |
| Pitch Arrows | uncommon | Every 4th arrow is lit: it deals fire instead of physical, burns 6 dps for 2 s and ignites oil. | every 3rd, burn 8 dps | `rule` | "Dip, light, loose." |
| Glass Arrows | rare (keystone) | Needs Frost Spire. An arrow that hits a Frozen enemy bursts for 20 physical damage (x act) to every enemy within 0.8 u. | 30 (x act), r 1.0 | `rule` | "The ice breaks. So does what's inside." |

### 3.2 Barracks

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Drilled | common | Soldiers +25% max HP. | +40% | `base` | "Up at dawn, every day." |
| Whetstones | common | Soldiers deal +25% damage. | +40% | `dealt` | "Sharp swords end fights sooner." |
| Quick Muster | common | Soldiers respawn 30% faster. | 45% | `base` | "The next one is already lacing his boots." |
| Long Reach | common | Rally range +1.0 u and engage radius +0.4 u. | +1.5 u / +0.6 u | `base` | "They'll go a bit further for you." |
| Shield Wall | uncommon | Each soldier hit adds 1 shred to its target. | 2 shred per hit | `shred` | "Shields first, then the hammer." |
| Fourth Soldier | uncommon | This Barracks keeps 4 soldiers. | the 4th is a Sergeant: +50% HP and damage | `base` | "There's always room for one more." |
| Bait | rare (keystone) | Needs Bombard, Pyre or Alchemist. Enemies held by these soldiers are Baited: +30% damage taken from splash, cones, puddles, fire patches and burns. | +40% | `taken:baited` | "Stand still. It's for your own good." |

### 3.3 Mage

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Focus | common | +15% damage. | +22% | `dealt` | "Breathe, then speak the word." |
| Quickened Runes | common | +10% attack speed; bolts fly 50% faster. | +15%; 80% faster | `aspd`, `base` | "Shorter words, same meaning." |
| Rune Breaker | common | Bolts ignore 15 ward. | 25 ward | `wardIgnore` | "Every charm has a seam." |
| Opening Bolt | common | The first bolt this Mage fires at an enemy deals +50% damage. | +80% | `dealt` (conditional) | "First impressions matter." |
| Lingering Hex | uncommon | Bolts hex for 1 s (20/22/25% by level; Hexer: its hex lasts 1 s longer). | 2 s (Hexer +2 s) | `taken:hex`, `dur` | "A little curse, left behind." |
| Arc Splinter | uncommon | Bolts burst on hit for 30% of their damage in r 0.8. | 45% | `rule` | "It doesn't stop at the skin." |
| Curse Engine | rare (keystone) | Bolts hex for 2 s, and hex from this Mage never wears off while the enemy lives. | its hex also slows 10% | `rule`, `taken:hex` | "Some words, once spoken, stay." |

### 3.4 Bombard

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Heavy Shot | common | +20% splash radius. | +30% | `range` (radius) | "More powder, wider hole." |
| Black Powder | common | +15% damage. | +22% | `dealt` | "The good stuff, from the east." |
| Quick Fuse | common | Shells fly 30% faster (fewer misses). | 45% faster | `base` | "Less waiting, more bang." |
| Rapid Loader | common | +12% attack speed. | +18% | `aspd` | "Swab, load, fire, again." |
| Oilshot | uncommon | Shells leave an oil puddle (r 0.9, 4 s) where they land; at most 2 per Bombard. | 3 puddles, 6 s | `rule` | "Some of it doesn't go off. That's the point." |
| Concussive Shells | uncommon | Enemies within 0.4 u of the impact are stunned for 0.4 s. | 0.6 s, within 0.5 u | `rule` | "The ringing lasts longer than the bang." |
| Shatterfall | rare (keystone) | Needs Frost Spire. A shell that lands on a Frozen enemy freezes every other enemy in its splash for 1.0 s (respects Thawing; elites go Numb). | 1.5 s | `rule` | "Cold travels fast through a crowd." |

### 3.5 Frost Spire

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Deep Cold | common | Chill +25%. | +40% | `base` | "Colder than the north wind." |
| Long Winter | common | Its freezes last +0.5 s. | +0.8 s | `dur` | "Spring is late this year." |
| Frostbite | common | +4 magic damage per hit (Nova +10). | +6 (Nova +15) | `base` | "Cold enough to sting." |
| Lingering Cold | common | Chill from this spire starts to fade after 3 s instead of 1.5 s. | 4.5 s | `dur` | "It gets into your bones and stays." |
| Frozen Mark | uncommon | Enemies it freezes are Marked for the freeze + 2 s (+20% crit chance against, +10% taken). | + 3 s, +12% taken | `taken:mark`, `critC` | "A clear target, standing very still." |
| Splinter | uncommon | Each shard also chills the nearest other enemy within 1.2 u for half its chill. | full chill | `rule` | "Ice never breaks cleanly." |
| Glass Bones | rare (keystone) | This spire's freezes make enemies Brittle (+50% physical taken, freeze + 1 s), like Shatter. With Shatter, its shatter bursts deal 35% of max HP instead of 25%. | Brittle lasts freeze + 2 s | `taken:brittle`, `rule` | "Frozen through, and fragile as a cup." |
| Endless Winter | rare (cap-lifter, R19) | Shatter chains started by this spire have no link limit, and each link deals 10% more than the one before. | each link +15% | `rule` | "One crack, and the whole lake goes." |

### 3.6 Alchemist

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Thick Oil | common | Puddles last 50% longer. | 80% | `dur` | "Stir slowly. It sets." |
| Wide Flasks | common | Puddle radius +25%. | +40% | `range` (radius) | "Bigger bottles, bigger spills." |
| Sticky Tar | common | Puddle slow 35% instead of 25%. | 40% | `slow` | "Like walking through honey." |
| Strong Brew | common | Flasks deal +25% damage. | +40% | `dealt` | "Double the recipe." |
| Caustic Oil | uncommon | Its puddles add 1 shred per 1.5 s to enemies inside (Acid keeps its own rate). | also 1 corrode per 1.5 s | `shred`, `corrode` | "It eats leather first, then iron." |
| Twin Flasks | uncommon | Every 3rd throw lobs 2 flasks at 2 different targets. | every 2nd | `rule` | "Two hands, two bottles." |
| Firewalk | rare (keystone) | Needs Pyre. A Pyre cone touching a puddle lights it, and a lit puddle lights every other puddle within 2.5 u. | 3.5 u; patches burn 2 s longer | `rule` | "One spark, and the road is a river of flame." |

### 3.7 Pyre

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Hotter | common | Burn +2 dps. | +4 dps | `base` | "More coal, less mercy." |
| Wide Nozzle | common | Cone 90° instead of 70° (Firestorm: fireball radius +0.2). | 110° (+0.3) | `base` | "Spread it around." |
| Long Flame | common | +12% range. | +18% | `range` | "A longer reach than it looks." |
| Slow Burn | common | Burns last 1.5 s longer. | 2.5 s | `dur` | "Embers keep their grudges." |
| Backdraft | uncommon | +25% damage to enemies held by soldiers. | +40% | `dealt` (conditional) | "Pinned in place, and in the heat." |
| Scorching | uncommon | Burning enemies are Scorched: +10% damage taken from everything. | +15% | `taken:scorched` | "Blistered armour gives way." |
| Cinder Rain | rare (keystone) | Needs Alchemist. An enemy that dies burning throws 3 embers within 2.0 u: each deals 15 fire (x act) in r 0.5 and lights any puddle it lands in. | 5 embers | `rule` | "The fire spreads by itself now." |

### 3.8 Storm Spire

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Copper Wire | common | +1 chain target. | +2 | `base` | "Give it somewhere to go." |
| Long Arc | common | Jumps reach +0.5 u. | +0.8 u | `base` | "It leaps further on a wet day." |
| Capacitor | common | +15% damage. | +22% | `dealt` | "Store it up, let it out." |
| Quick Coils | common | +12% attack speed. | +18% | `aspd` | "The hum gets higher." |
| Seeking Sparks | uncommon | Jumps prefer Chilled, Oiled or shielded enemies, and the first jump loses no damage. | the first two jumps lose none | `rule` | "Lightning knows where it wants to be." |
| Sky Arcs | uncommon | +35% damage to flyers. | +50% | `dealt` (conditional) | "Nothing up there to hide behind." |
| Grounding | rare (keystone) | The last target of each chain is stunned for 0.5 s (bosses 0.2 s). | 0.8 s | `rule` | "The bolt ends in the feet." |

### 3.9 Beacon

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Wider Light | common | +20% radius. | +30% | `range` | "Trim the wick, open the shutters." |
| Quick Signal | common | Marks 25% more often. | 40% | `base` | "Flash, flash, flash." |
| Long Mark | common | Marks last 7 s instead of 5 s. | 9 s | `dur` | "Once seen, never lost." |
| Bright Mark | common | Marked enemies take +5% more damage. | +8% | `taken:mark` | "A brighter ring, a bigger target." |
| Spreading Mark | uncommon | When a marked enemy dies, its mark jumps to the nearest unmarked enemy in radius (Hunter's Mark: to 2). | jumps to the nearest within 3 u even outside the radius | `rule` | "The hunt moves on." |
| Searchlight | uncommon | Revealed enemies stay revealed 4 s after leaving the radius, and revealing a stealthed enemy marks it. | 6 s | `dur`, `rule` | "Once you've seen it, you can't unsee it." |
| Hunter's Moon | rare (keystone) | Needs Archer or Ballista. Crits against marked enemies deal at least x2.5 for every tower, and marked enemies give +10% more crit chance. | +15% crit chance | `critM`, `critC` | "Under this moon, every shot finds its mark." |

### 3.10 War Banner

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Louder Drums | common | Aura attack speed +5% (L1 10% becomes 15%). | +8% | `aspd` (banner value) | "Hit the skin harder." |
| Tall Pole | common | Aura +20% radius. | +30% | `range` | "Seen from every wall." |
| War Song | common | Towers in aura +5% damage; soldiers in aura +20% damage. | +8% / +30% | `dealt` | "Everyone knows the words." |
| Standard Bearer | common | This Banner costs 20% less to build, upgrade and specialise. | 30% | `cost` | "The cloth is cheap. The courage is free." |
| Brave Hearts | uncommon | Towers in aura can't be disabled for more than 3 s. | 2 s | `rule` | "Back to your post. Now." |
| Field Forge | rare (keystone, cap-lifter) | Banners stack: a tower in this Banner's aura adds the two best banner auras in reach instead of taking the best. | and this Banner's aura +0.4 u | `aspd` (rule) | "A smith behind every banner, and a banner behind every smith." |

### 3.11 Ballista

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Long Draw | common | +15% range. | +22% | `range` | "Wind it tighter." |
| Heavy Bolts | common | +15% damage. | +22% | `dealt` | "An iron head on an oak shaft." |
| Winch | common | +12% attack speed. | +18% | `aspd` | "Two cranks quicker." |
| Steel Tips | common | Pierce +15 points (50% becomes 65%). | +25 | `pierce` | "Made for plate." |
| Pinning Bolts | uncommon | Bolts root non-elite ground enemies for 0.6 s. | 1.0 s | `rule` | "Nailed to the road." |
| Twin Bolts | uncommon | Every 3rd shot fires a second bolt at the next enemy (by its target mode) for 60% damage. | 80% | `rule` | "Two strings, two bolts." |
| Spear of Dawn | rare (keystone) | A bolt that kills flies on to the nearest enemy within 3 u at 70% damage, up to 2 more times. | up to 3 more times | `rule` | "It doesn't stop at the first. It never did." |

### 3.12 Thornwood Grove

| Boon | Rarity | Effect | Tempered (+) | Pool | Flavour |
| --- | --- | --- | --- | --- | --- |
| Sharper Thorns | common | Thorns +3 dps (Bramble +4). | +5 (Bramble +7) | `base` | "Longer spines, deeper cuts." |
| Wide Grove | common | Aura +15% radius. | +25% | `range` | "The wood creeps outward." |
| Quick Roots | common | Roots 20% more often. | 30% | `base` | "Restless roots." |
| Thick Briars | common | Enemies in the aura are slowed 10%. | 15% | `slow` | "Every step snags." |
| Long Roots | uncommon | Roots last 0.5 s longer. | 0.8 s | `dur` | "Deeper in, harder out." |
| Strangling Roots | uncommon | Rooted enemies take 20% more damage. | 30% | `taken:rooted` | "Held tight, and squeezed." |
| Heartwood Bond | rare (keystone) | Needs Barracks. A soldier inside its aura who would die falls to 1 HP instead and can't be hurt for 3 s; once per soldier life. | 5 s, then heals 30% | `rule` | "The grove will not let them fall. Not yet." |

### 3.13 Universal boons (any tower)

Offered as "Boon: Tower" (one card names one tower). Not offered where it can't work (listed).

| Boon | Rarity | Effect | Tempered (+) | Pool | Not offered on | Flavour |
| --- | --- | --- | --- | --- | --- | --- |
| Veteran | uncommon | This tower is built at L2, paying its L1 cost plus half its L2 cost. | and its L3 costs 20% less | `rule`, `cost` | never while you hold Siege Engine (R3) | "They've done this before." |
| Thrifty | common | This tower costs 15% less (build, upgrades, specialisation). | 22% | `cost` | | "Same tower, cheaper nails." |
| Overseer | uncommon | This tower's L3 upgrade costs 40% less. | and its specialisation costs 15% less | `cost` | | "Someone who knows the trade." |
| Watchful | common | This tower reveals stealthed enemies in its range (Barracks: its engage radius). | and deals +10% damage to revealed enemies | `rule`, `dealt` | Beacon | "Eyes open, always." |
| Rangefinder | common | +10% range (Barracks: rally range). | +15% | `range` | | "Measured twice, built once." |
| Steadfast | uncommon | +25% damage to bosses. | +40% | `dealt` (conditional) | Beacon, War Banner | "Big ones fall too." |
| Trophy | common | +3 crowns after each battle in which this tower dealt the most damage. | +5 | `run` | Beacon, War Banner | "Hang it over the door." |

Support towers and Barracks: Steadfast and Trophy are offered on Barracks (soldier damage counts).
`dealt` boons on a Banner or Beacon would do nothing, hence the exclusions. Cut in R16: Last Stand,
Sapper-proof, Bounty (and War Tax from the Banner).

---

## 4. Enemies

### 4.1 Roster (act I base numbers)

The Role column is the enemy's one display name in every act (R32); acts recolour it (4.3).
HP scales with `hpMul`; armour, ward, speed and melee damage do not (melee scales x act, see below).
Bounty = `round(threat x 5 x bountyMul)`. **Summons** (anything an enemy raises, births or calls:
Risen, Matron births, boss adds) pay their bounty only until the last wave has spawned, then
0 (R10); splitter children are not summons. Melee is physical unless marked magic; it hits one
soldier unless stated. **Melee damage to soldiers is x act** (soldiers keep their stats, so act IV
enemies hit 2.4x as hard; that is what Paladins and Drilled are for).

| Key | Role | HP | Speed (u/s) | Armour | Ward | Threat | Bounty (act I / II / III / IV) | Leak | Melee vs soldiers (dmg / interval = dps) | freezeAt | Flying | Blockable | Trait |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| footman | Footman | 60 | 1.1 | 0 | 0 | 1 | 5 / 6 / 6 / 7 | 1 | 5 / 1.0 s = 5 | 100 | no | yes | baseline |
| runner | Runner | 35 | 2.0 | 0 | 0 | 0.8 | 4 / 4 / 5 / 5 | 1 | 3 / 0.8 s = 3.8 | 100 | no | yes, slips | keeps 50% speed for 0.5 s after a soldier engages it |
| brute | Brute | 240 | 0.7 | 45 (act II: 65) | 0 | 3 | 15 / 17 / 18 / 20 | 2 | 20 / 1.5 s = 13.3, **cleaves 2 soldiers** | 150 | no | yes | heavy |
| acolyte | Acolyte | 90 | 0.95 | 0 | 45 | 2 | 10 / 11 / 12 / 13 | 2 | 6 / 1.0 s = 6 **magic** | 100 | no | yes | warded |
| shieldbearer | Shieldbearer | 150 | 0.8 | 25 (act II: 45) | 0 | 3 | 15 / 17 / 18 / 20 | 2 | 8 / 1.2 s = 6.7 | 150 | no | yes | shields allies |
| shaman | Shaman | 100 | 0.9 | 0 | 25 | 3 | 15 / 17 / 18 / 20 | 2 | 4 / 1.0 s = 4 | 100 | no | yes | heals allies |
| splitter | Splitter | 110 | 0.8 | 0 | 0 | 3 | 15 / 17 / 18 / 20 | 2 | 6 / 1.0 s = 6 | 100 | no | yes | splits on death |
| slime | Slime (splitter child) | 40 | 1.1 | 0 | 0 | 0 | 2 flat | 1 | 4 / 1.0 s = 4 | 60 | no | yes | splits on death |
| slimelet | Slimelet (slime child) | 12 | 1.4 | 0 | 0 | 0 | 1 flat | 1 | 2 / 0.8 s = 2.5 | 60 | no | yes | |
| shade | Shade | 70 | 1.3 | 0 | 25 | 2 | 10 / 11 / 12 / 13 | 2 | 8 / 0.8 s = 10 | 100 | no | only while revealed | stealth |
| swarmling | Swarmling | 14 | 1.5 | 0 | 0 | 0.3 | 2 / 2 / 2 / 2 | 1 | 2 / 0.6 s = 3.3 | 60 | no | yes | comes in clumps |
| sapper | Sapper | 110 | 1.2 | 25 | 0 | 3 | 15 / 17 / 18 / 20 | 2 | 6 / 1.0 s = 6 | 100 | no | yes | disables a tower |
| bat | Bat | 22 | 1.6 | 0 | 0 | 0.6 | 3 / 3 / 4 / 4 | 1 | none | 60 | **yes** | no | flyer swarm |
| drake | Drake | 420 | 0.8 | 25 | 25 | 6 | 30 / 33 / 36 / 39 | 2 | none | 150 | **yes** | no | big flyer |
| risen | Risen (warlock summon) | 42 | 1.1 | 0 | 0 | 0 | 1 flat | 1 | 3.5 / 1.0 s = 3.5 | 100 | no | yes | footman x0.7 |
| juggernaut | Juggernaut (elite) | 1500 | 0.6 | 65 | 0 | 15 | 75 / 83 / 90 / 98 | 3 | knocks each soldier it touches back 1 u for 25 (x act) | 250 | no | **never** | immune to root, pull (60% slow 1 s instead), stun |
| warlock | Warlock (elite) | 950 | 0.75 | 0 | 65 | 14 | 70 / 77 / 84 / 91 | 3 | 15 / 1.2 s = 12.5 **magic** | 250 | no | yes | summons Risen |
| matron | Matron (elite) | 1200 | 0.6 | 25 | 25 | 14 | 70 / 77 / 84 / 91 | 3 | 12 / 1.0 s = 12 | 250 | no | yes | births swarmlings |

Act IV natives (every role above in act IV, and the Tyrant's adds) are **fireproof 25%** (R15).

### 4.2 Role mechanics (exact)

| Role | Parameter | Value |
| --- | --- | --- |
| Runner | slip | after a soldier engages it, it keeps moving at 50% speed for 0.5 s before it stops |
| Brute | cleave | each swing hits its held soldier and one other soldier within 0.8 u |
| Shieldbearer | shield aura | radius 1.6, every 8.0 s (first pulse 2.0 s after spawn): each ally in range without a shield gets one worth `min(30% of its max HP, 150 x hpMul)`; never itself; hexed allies get half; shields don't stack and never expire on their own |
| Shaman | heal pulse | radius 2.0, every 4.0 s (first 2.0 s after spawn): allies heal 8% of their max HP, the shaman itself 4%; hexed allies are skipped |
| Splitter | split | on death: 2 slimes at its path position ±0.3 u; each slime on death: 2 slimelets. Children keep the parent's statuses except Frozen and Marked |
| Shade | stealth | can't be targeted or blocked unless Revealed (Beacon radius + 1 s, any damage 1.5 s, Watchful, Spyglass, Deep Roots, Searchlight) |
| Swarmling | clumps | groups of at most 16; per-wave cap 20 (act I), 28 (act II), 36 (acts III-IV) |
| Sapper | plant | when its path position comes within 2.0 u of a pad with a tower, it stops and plants for 1.2 s, then that tower is **disabled 6 s**. Cancelled if it is blocked, stunned, frozen or dies during the plant. Picks the most-invested tower in reach. Once per sapper |
| Bat | flock | per-wave cap as swarmlings, except **act I floors 2-3: 10** (R2); follows the air route; weaves ±0.3 u (cosmetic) |
| Drake | flyer | air route, flies at 2.0 u altitude (cosmetic) |
| Juggernaut | unblockable | walks through soldiers; each soldier touched is knocked 1 u back and takes 25 (x act); stun and root immune; Harpoon gives 60% slow 1 s |
| Warlock | summon | every 7.0 s (first 4.0 s after spawn) it stops and channels 1.5 s (rune circle), then raises 3 Risen beside it. Any hard CC during the channel (stun, root, freeze, pull) cancels it and resets the 7 s timer |
| Matron | brood | every 4.0 s births 2 swarmlings at her side (no threat, swarmling bounty until the last wave has spawned); on death bursts 8 swarmlings. Births count toward nothing in the budget |

### 4.3 One name, act looks

One name per role in every act (R32): the Role column of 4.1. The silhouette never changes (art.md
3.3); each act recolours the cloth to its key colour and swaps one trim, and the codex notes which
acts a role was met in. Act trims: **I** rust cloth, leather and straw; **II** teal cloth, bronze
plates, sun-bleached wraps; **III** crimson cloth, fur collars, frost on the metal; **IV** bone armour
and masks on obsidian bodies.

| Role | Look note (all acts) |
| --- | --- |
| Footman | round helm, small round shield |
| Runner | thin, leaning, a trailing scarf |
| Brute | huge steel shoulder plates, tiny head |
| Acolyte | tall hooded robe, violet rune halo |
| Shieldbearer | tall tower shield with a cyan gem |
| Shaman | hunched, antlers, green-lit staff |
| Splitter / Slime / Slimelet | wobbling jelly with a dark core; children are smaller copies (not in act I) |
| Shade | footless ragged cloak, two eye dots (not in act I) |
| Swarmling | tiny four-legged imp, big head |
| Sapper | crouched, bomb pack with a lit fuse (not in act I) |
| Bat | V wings, small body |
| Drake | long neck, wide wings, tail (not in act I) |
| Risen | footman shape, grey and cracked |
| Juggernaut | siege golem with a ram head, crown rim |
| Warlock | robed, book and skull lantern in orbit |
| Matron | swollen brood sack, small head |

Boss adds keep their own names: Sandling (the Wyrm's slimes), Ice Shard (the Colossus), Ember
Drake and Ember Runner (the Tyrant), Broodling (the Hive Queen), Pup (the Pack-Lord); the Lich
raises Risen.

**Codex lines** (one plain sentence each; the enemy tooltip uses the same line):

| Role | Line |
| --- | --- |
| Footman | "Walks the road and fights whoever stops it." |
| Runner | "Fast and frail. Slips past soldiers for a moment." |
| Brute | "Heavy armour. Magic, fire and shred get through it." |
| Acolyte | "Wards turn aside magic. Arrows and fire do fine." |
| Shieldbearer | "Shields nearby allies. Lightning breaks shields fast." |
| Shaman | "Heals nearby allies. A hex stops the healing." |
| Splitter | "Splits in two when it dies, and again." |
| Shade | "Unseen until a Beacon finds it or it is hurt." |
| Swarmling | "Tiny and many. Splash and chains clear them." |
| Sapper | "Stops by a tower and plants a charge. Block it." |
| Bat | "Flies the short way. Only air towers reach it." |
| Drake | "A big flyer with light armour and wards." |
| Risen | "Raised by a warlock. Weak, but there are three." |
| Juggernaut | "Can't be stopped, held, rooted or stunned." |
| Warlock | "Raises the dead. Stun it while it chants." |
| Matron | "Births swarmlings as she walks, and more when she dies." |

### 4.4 Elites and affixes

Elites come in elite nodes (one at wave `ceil(N/2)`, one on the last wave; acts III-IV two on the
last wave), on top of the wave budget, and in acts III-IV normal battles on F4-F5 (and act IV's
Ash Road) a **30% chance** of one elite with no affix on the last wave (shown on the node).
Which elite sits on an elite node is rolled when the act map is made and shown on the node. An
elite's relic is paid only if every elite of the battle died (R5).

| Act | Affixes per elite (ascension 6: at least 2 from act I) | Elite weights (juggernaut / warlock / matron) |
| --- | --- | --- |
| I | 0 | 35 / 35 / 30 |
| II | 1 | 33 / 33 / 34 |
| III | 1 | 33 / 33 / 34 |
| IV | 2 | 34 / 33 / 33 |

**One affix list** for elites and ascension 3's wave affix (R32). On an A3 wave the affix applies to
every enemy in that wave, with the wave number where it differs; elite-only affixes never roll on a
wave, and Many never rolls on an elite.

| Affix | Icon | On an elite | On an A3 wave | Not rolled on |
| --- | --- | --- | --- | --- |
| Hasted | winged foot | +40% speed | +20% speed | |
| Plated | steel plate | armour one tier up (0 -> 25 -> 45 -> 65 -> 80 cap) | same | |
| Runed | rune ring | ward one tier up (same tiers) | same | |
| Vengeful | broken tower | on death, disables the nearest tower for 4 s | elite only | |
| Regenerating | green drop | heals 2% max HP per second after 2 s without taking damage | elite only | |
| Warleader | horn | allies within 2.0 u move 20% faster | elite only | |
| Brood | sack | drops 2 footmen (act stats) at 75%, 50% and 25% HP | elite only | Matron |
| Many | twin skulls | wave only | the wave's budget x1.30 | |

Two affixes are never the same; Plated and Runed never roll together.

### 4.5 Effective HP and pressure (sanity check)

Effective HP = HP / (1 - resist) per damage type with act traits applied (act II armour tiers, act
III fire +20%, act IV fireproof 25%). **Pressure per threat** = the lowest effective HP x speed /
threat (air units x 1/0.72 for the shorter air route; splitter counts its whole family at each
body's speed): how much damage-time a threat point demands from a defence that brings the right
answer. Elites sit on top of the budget and are not compared.

**Act 1** (hpMul 1)

| Role | HP | Armour / ward | vs Physical | vs Magic | vs Fire | vs Pure | Pressure per threat | Flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Footman | 60 | 0 / 0 | 60 | 60 | 60 | 60 | 66 | 1.08x |
| Runner | 35 | 0 / 0 | 35 | 35 | 35 | 35 | 88 | 1.43x |
| Brute | 240 | 45 / 0 | 436 | 240 | 240 | 240 | 56 | 0.92x |
| Acolyte | 90 | 0 / 45 | 90 | 164 | 90 | 90 | 43 | 0.70x |
| Shieldbearer | 150 | 25 / 0 | 200 | 150 | 150 | 150 | 40 | 0.66x |
| Shaman | 100 | 0 / 25 | 100 | 133 | 100 | 100 | 30 | LOW 0.49x |
| Splitter (family) | 238 | 0 / 0 | 238 | 238 | 238 | 238 | 81 | 1.33x |
| Shade | 70 | 0 / 25 | 70 | 93 | 70 | 70 | 46 | 0.75x |
| Swarmling | 14 | 0 / 0 | 14 | 14 | 14 | 14 | 70 | 1.15x |
| Sapper | 110 | 25 / 0 | 147 | 110 | 110 | 110 | 44 | 0.72x |
| Bat | 22 | 0 / 0 | 22 | 22 | 22 | 22 | 81 | 1.34x |
| Drake | 420 | 25 / 25 | 560 | 560 | 420 | 420 | 78 | 1.28x |
| Juggernaut | 1500 | 65 / 0 | 4286 | 1500 | 1500 | 1500 | 60 | elite, on top of budget |
| Warlock | 950 | 0 / 65 | 950 | 2714 | 950 | 950 | 51 | elite, on top of budget |
| Matron | 1200 | 25 / 25 | 1600 | 1600 | 1200 | 1200 | 51 | elite, on top of budget |

Median pressure per threat (non-elites): 61.

**Act 2** (hpMul 1.4)

| Role | HP | Armour / ward | vs Physical | vs Magic | vs Fire | vs Pure | Pressure per threat | Flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Footman | 84 | 0 / 0 | 84 | 84 | 84 | 84 | 92 | 1.08x |
| Runner | 49 | 0 / 0 | 49 | 49 | 49 | 49 | 123 | 1.43x |
| Brute | 336 | 65 / 0 | 960 | 336 | 336 | 336 | 78 | 0.92x |
| Acolyte | 126 | 0 / 45 | 126 | 229 | 126 | 126 | 60 | 0.70x |
| Shieldbearer | 210 | 45 / 0 | 382 | 210 | 210 | 210 | 56 | 0.66x |
| Shaman | 140 | 0 / 25 | 140 | 187 | 140 | 140 | 42 | LOW 0.49x |
| Splitter (family) | 333 | 0 / 0 | 333 | 333 | 333 | 333 | 113 | 1.33x |
| Shade | 98 | 0 / 25 | 98 | 131 | 98 | 98 | 64 | 0.75x |
| Swarmling | 20 | 0 / 0 | 20 | 20 | 20 | 20 | 98 | 1.15x |
| Sapper | 154 | 25 / 0 | 205 | 154 | 154 | 154 | 62 | 0.72x |
| Bat | 31 | 0 / 0 | 31 | 31 | 31 | 31 | 114 | 1.34x |
| Drake | 588 | 25 / 25 | 784 | 784 | 588 | 588 | 109 | 1.28x |
| Juggernaut | 2100 | 65 / 0 | 6000 | 2100 | 2100 | 2100 | 84 | elite, on top of budget |
| Warlock | 1330 | 0 / 65 | 1330 | 3800 | 1330 | 1330 | 71 | elite, on top of budget |
| Matron | 1680 | 25 / 25 | 2240 | 2240 | 1680 | 1680 | 72 | elite, on top of budget |

Median pressure per threat (non-elites): 85.

**Act 3** (hpMul 1.9)

| Role | HP | Armour / ward | vs Physical | vs Magic | vs Fire | vs Pure | Pressure per threat | Flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Footman | 114 | 0 / 0 | 114 | 114 | 95 | 114 | 105 | 1.08x |
| Runner | 67 | 0 / 0 | 67 | 67 | 55 | 67 | 139 | 1.43x |
| Brute | 456 | 45 / 0 | 829 | 456 | 380 | 456 | 89 | 0.92x |
| Acolyte | 171 | 0 / 45 | 171 | 311 | 143 | 171 | 68 | 0.70x |
| Shieldbearer | 285 | 25 / 0 | 380 | 285 | 238 | 285 | 63 | 0.66x |
| Shaman | 190 | 0 / 25 | 190 | 253 | 158 | 190 | 48 | LOW 0.49x |
| Splitter (family) | 452 | 0 / 0 | 452 | 452 | 377 | 452 | 128 | 1.33x |
| Shade | 133 | 0 / 25 | 133 | 177 | 111 | 133 | 72 | 0.75x |
| Swarmling | 27 | 0 / 0 | 27 | 27 | 22 | 27 | 111 | 1.15x |
| Sapper | 209 | 25 / 0 | 279 | 209 | 174 | 209 | 70 | 0.72x |
| Bat | 42 | 0 / 0 | 42 | 42 | 35 | 42 | 129 | 1.34x |
| Drake | 798 | 25 / 25 | 1064 | 1064 | 665 | 798 | 123 | 1.28x |
| Juggernaut | 2850 | 65 / 0 | 8143 | 2850 | 2375 | 2850 | 95 | elite, on top of budget |
| Warlock | 1805 | 0 / 65 | 1805 | 5157 | 1504 | 1805 | 81 | elite, on top of budget |
| Matron | 2280 | 25 / 25 | 3040 | 3040 | 1900 | 2280 | 81 | elite, on top of budget |

Median pressure per threat (non-elites): 97.

**Act 4** (hpMul 2.4)

| Role | HP | Armour / ward | vs Physical | vs Magic | vs Fire | vs Pure | Pressure per threat | Flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Footman | 144 | 0 / 0 | 144 | 144 | 192 | 144 | 158 | 1.08x |
| Runner | 84 | 0 / 0 | 84 | 84 | 112 | 84 | 210 | 1.43x |
| Brute | 576 | 45 / 0 | 1047 | 576 | 768 | 576 | 134 | 0.92x |
| Acolyte | 216 | 0 / 45 | 216 | 393 | 288 | 216 | 103 | 0.70x |
| Shieldbearer | 360 | 25 / 0 | 480 | 360 | 480 | 360 | 96 | 0.66x |
| Shaman | 240 | 0 / 25 | 240 | 320 | 320 | 240 | 72 | LOW 0.49x |
| Splitter (family) | 571 | 0 / 0 | 571 | 571 | 761 | 571 | 195 | 1.33x |
| Shade | 168 | 0 / 25 | 168 | 224 | 224 | 168 | 109 | 0.75x |
| Swarmling | 34 | 0 / 0 | 34 | 34 | 45 | 34 | 168 | 1.15x |
| Sapper | 264 | 25 / 0 | 352 | 264 | 352 | 264 | 106 | 0.72x |
| Bat | 53 | 0 / 0 | 53 | 53 | 71 | 53 | 196 | 1.34x |
| Drake | 1008 | 25 / 25 | 1344 | 1344 | 1344 | 1008 | 249 | HIGH 1.70x |
| Juggernaut | 3600 | 65 / 0 | 10286 | 3600 | 4800 | 3600 | 144 | elite, on top of budget |
| Warlock | 2280 | 0 / 65 | 2280 | 6514 | 3040 | 2280 | 122 | elite, on top of budget |
| Matron | 2880 | 25 / 25 | 3840 | 3840 | 3840 | 2880 | 165 | elite, on top of budget |

Median pressure per threat (non-elites): 146.

Flags, all deliberate:

- **Shaman 0.49x** (every act): its threat pays for the healing (8% of max HP to every ally in 2 u
  every 4 s; in a Healer ball that is ~25 effective HP per second). It is meant to die first; the
  counter table's answer is focus or a hex.
- **Runner 1.43x**: speed is the test, and its HP is tiny, so slows and soldiers cut its pressure in
  half; without them it is the leak role by design.
- **Drake 1.70x in act IV only**: act IV's fireproofing (25%) takes fire's edge as its cheap answer,
  which is the act's point (the Tyrant's air check); in acts I-III it is 1.28x. Dragonglass removes
  fireproofing for one relic slot.
- **Brute vs physical** (436 / 960 / 829 / 1047 effective HP) is 1.8-2.9x its best answer on purpose:
  it is the armour test. Before the change, the act II splitter family (130 + 2x45 + 4x15) sat at
  1.6x; it is now 110 / 40 / 12 (1.33x).
- Bats moved from threat 0.5 to 0.6 (1.65x -> 1.34x): the short air route made them the hardest
  threat point in the game for any build without good air reach.

---

## 5. Bosses

Seven bosses: acts I-III each roll one of two at the act start (shown on the map from the first
second, R21); act IV is always the Ember Tyrant.

| Act | Boss | Alternative | Body |
| --- | --- | --- | --- |
| I | Gorrak the Warlord (5.1) | the Hive Queen (5.5) | Matron body, boss size |
| II | the Sand Wyrm (5.2) | the Lich (5.6) | Warlock body, boss size |
| III | the Frost Colossus (5.3) | the Pack-Lord (5.7) | Runner body, XL boss size |
| IV | the Ember Tyrant (5.4) | none | |

Shared rules (systems 9.8): slows at half strength; stun x0.25 (min 0.2 s), then the shared 1 s
hard-CC immunity (R9); immune to root and pull (Harpoon: 60% slow 1 s); a full chill meter gives
**Numb** (50% slow 2 s, meter resets), the Colossus included; hex, mark, shred, burn and crits work
fully. **Invulnerable 1.0 s** at each phase threshold (damage that tick is discarded).

**Leaks loop** (R1): a boss that reaches our gate costs **10 lives** and re-enters at its horde gate
with its HP and phase (statuses cleared), **+20% speed per lap** (lap 2 x1.2, lap 3 x1.4, adding);
the lap count shows on the boss bar. The battle is won only when the boss dies; at that moment
every enemy still on the map flees (no lives lost, no bounty). Lucky Horseshoe, Leaking Roof, Pact
of Embers and Phoenix Feather never apply to a boss or elite leak: a boss leak costs exactly 10, an
elite leak exactly 3, and a boss or elite leak that ends the run is final.

No bounty from the boss itself; its adds are summons and pay nothing once the boss wave has spawned
(R10). Every telegraph is at least 1.5 s, uninterruptible, and fires a `boss_telegraph` event. First
ability timers start when the boss spawns. HP below is ascension 0 and final (it already includes
`hpMul`). Curse Dread +15% HP, the Bard's song -10% (both add into one HP %).

The boss wave is the battle's last: the boss spawns first, its escort (budget `0.6 x B`) 3 s later.

### 5.1 Gorrak the Warlord (act I)

| Stat | Value |
| --- | --- |
| HP | 5,000 |
| Armour / ward / fireproof | 30 / 0 / 0 |
| Speed | 0.45 u/s |
| Blockable | yes; melee 60 physical / 1.5 s, hits 2 soldiers |
| Chill meter (Numb at) | 400 |
| Leak | 10 |
| Intro line (nameplate) | "Gorrak the Warlord. Your fields will feed my army." |
| Death line | "Gorrak falls. His banner goes down with him." |
| Map tooltip (two headline mechanics) | "War cry speeds nearby enemies. Calls footmen at two thirds health." |

| Phase | HP | Ability | First | Every | Telegraph | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 100-66% | **War Cry** | 6 s | 12 s | 1.5 s: axe raised, red ring r 3.0 | allies in the ring +50% speed for 4 s and all their slows and chill cleared |
| 2 | 66-33% | War Cry | continues | 12 s | as above | as above |
| 2 | | **Muster** | 4 s after the phase starts | 14 s | 2.0 s: plants a banner at his feet | 4 footmen + 2 runners (act stats, summons: no bounty) appear at the banner |
| 3 | < 33% | War Cry | continues | 12 s | as above | as above |
| 3 | | **Charge** | 3 s after the phase starts | 10 s | 1.5 s: scrapes the ground; an arrow shows 4 u ahead on the path | runs 4 u along the path at 3 u/s, unblockable; every soldier touched is knocked aside 1 u and takes 40 |

Escort: Warband (footman 60 / runner 20 / brute 20). Muster stops in phase 3.

### 5.2 The Sand Wyrm (act II)

| Stat | Value |
| --- | --- |
| HP | 9,000 |
| Armour / ward / fireproof | 0 / 45 / 0 |
| Speed | 0.6 u/s walking; 1.2 u/s underground |
| Blockable | only while surfaced, and it **shoves**: a held Wyrm keeps moving at 50% and pushes the soldier along; melee 40 / 1.5 s vs its holder |
| Chill meter (Numb at) | 500 |
| Leak | 10 |
| Intro line | "The Sand Wyrm. The ground itself is hungry." |
| Death line | "The Wyrm sinks for the last time. The sand goes still." |
| Map tooltip | "Burrows under your towers and bursts out. Calls a sandstorm at half health." |

| Phase | HP | Ability | First | Every | Telegraph | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 100-50% | **Burrow** | 8 s | 15 s | 1.5 s dust spiral as it dives | travels 6 s underground along the path at 1.2 u/s (7.2 u): untargetable, unhittable, can't be blocked; a sand ripple shows the route; a ring marks the surfacing point **2.0 s ahead**. Diving **clears all its statuses** |
| 1 | | **Erupt** (on surfacing) | | each Burrow | the surfacing ring (2.0 s) | towers within 1.5 u of the point disabled 3 s; soldiers within 1.5 u thrown 1 u and take 30 |
| 2 | < 50% | Burrow + Erupt | 4 s after the phase starts | 12 s | as above | as above, and each surfacing spits **2 Sandlings** (act II slimes: 56 HP, 1.1 u/s, leak 1, summons) |
| 2 | | **Sandstorm** | 6 s after the phase starts | 20 s | 2.0 s: the sky darkens | all tower range -20% for 6 s (applied after the +40% range cap) |

If it reaches the exit underground, it surfaces there, leaks and laps. Escort: acolyte 60 / shade 40.

### 5.3 The Frost Colossus (act III)

| Stat | Value |
| --- | --- |
| HP | 16,000 |
| Armour / ward / fireproof | 55 / 25 / 0 (act III fire +20% applies) |
| Speed | 0.35 u/s (phase 3: 0.5) |
| Blockable | **never** |
| Chill meter (Numb at) | **800** (R15; act III chill -25% applies) |
| Leak | 10 |
| Intro line | "The Frost Colossus. The mountain has come down to meet you." |
| Death line | "The Colossus cracks from the core and falls as snow." |
| Map tooltip | "Stomps freeze nearby towers. Grows ice armour that lightning and fire break." |

| Phase | HP | Ability | First | Every | Telegraph | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 100-60% | **Stomp** | 5 s | 10 s | 2.0 s: foot raised, icy ring r 2.4 around it | towers in the ring frozen (disabled) 4 s; soldiers in it frozen 4 s and take 60 |
| 2 | 60-25% | Stomp | continues | 10 s | as above | as above |
| 2 | | **Ice Armour** | at the phase start | regrows 20 s after it breaks | 2.0 s frosting | a 2,500 shield; lightning x3 and fire x2 against it; a hex on it halves it at once |
| 3 | < 25% | Stomp, Ice Armour | continue | | | speed 0.5; every Stomp sheds 3 **Ice Shards** (swarmling bodies: 57 HP, 1.5 u/s, can't be chilled, leak 1, summons) |

Escort: brute 40 / shieldbearer 30 / footman 30. The map guarantees 3 stomp-safe pads (>= 2.6 u
from the path).

### 5.4 The Ember Tyrant (act IV, final)

| Stat | Value |
| --- | --- |
| HP | 26,000 |
| Armour / ward / fireproof | 30 / 30 / **30** (R15) |
| Speed | 0.5 u/s walking; 1.2 u/s flying; phase 3: 0.65 |
| Blockable | while walking; melee 120 / 2.0 s |
| Chill meter (Numb at) | 600 (act IV chill +25% applies) |
| Leak | 10 |
| Intro line | "The Ember Tyrant. You came all this way to burn." |
| Death line | "The Tyrant's fire goes out. The citadel is quiet at last." |
| Map tooltip | "Breathes fire on your towers. Takes to the air: bring air defence." |

| Phase | HP | Ability | First | Every | Telegraph | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 100-66% | **Flame Breath** | 6 s | 11 s | 1.5 s: head rears; a cone 3 u x 60° shows, aimed at the densest group of towers in reach | towers in the cone disabled 3 s; soldiers in it die (respawn as normal) |
| 2 | 66-33% | **Takes Wing** | at the phase start | 30 s | lift-off is the roar; landing: shadow and ring **2.0 s ahead** | a flyer for 15 s on the air route at 1.2 u/s; only air reach hits it; drops 2 **Ember Drakes** (act IV drakes at half HP: 504, fireproof 25, leak 2, summons) on take-off; lands back on the path **at most 6 u past its take-off point** (R7: if the air route carries it further, it lands at take-off + 6 u) and walks |
| 2 | | Flame Breath | while walking | 11 s | as above | as above |
| 3 | < 33% | **Molten** | at the phase start | | 1.0 s invulnerable roar (the phase change) | armour and ward drop to 0 (fireproof stays 30); speed 0.65 |
| 3 | | Flame Breath | 3 s after the phase starts | 8 s | as above | as above |
| 3 | | **Embers** | 4 s after the phase starts | 8 s | 1.5 s: cracks glow at its feet | 2 Ember Runners (act IV runners: 84 HP, fireproof 25, summons) |

If it reaches the exit in the air, it leaks and laps (re-entering on foot). Escort: drake 40 /
runner 30 / acolyte 30.

### 5.5 The Hive Queen (act I, alternative)

| Stat | Value |
| --- | --- |
| HP | 5,000 |
| Armour / ward / fireproof | 25 / 25 / 0 |
| Speed | 0.45 u/s (phase 3: 0.6) |
| Blockable | yes; melee 40 / 1.5 s vs its holder; her births go on while she is held |
| Chill meter (Numb at) | 400 |
| Leak | 10 |
| Intro line | "The Hive Queen. The meadow hums for her now." |
| Death line | "The Hive Queen goes still. The humming stops." |
| Map tooltip | "Births bats and swarmlings as she walks. Her brood bursts from the road ahead." |

| Phase | HP | Ability | First | Every | Telegraph | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 100-60% | **Brood** | 5 s | 9 s | 1.5 s: the sack swells and glows; a green ring r 1.2 at her side | 4 swarmlings and 2 bats (act stats, summons) at her side; the bats join the air route at its nearest point |
| 2 | 60-30% | Brood | continues | 9 s | as above | as above |
| 2 | | **Buried Brood** | 3 s after the phase starts | 14 s | 2.0 s: three mounds rise on the road 4, 6 and 8 u ahead of her, each ringed (r 0.8) | each mound bursts into 3 **Broodlings** (30 HP, 1.3 u/s, no armour, freezeAt 60, leak 1, summons) |
| 3 | < 30% | Brood | 2 s after the phase starts | 6 s | as above | 4 swarmlings and 3 bats |
| 3 | | Buried Brood | continues | 10 s | as above | as above |

Answers: air reach for the bats (R2 makes sure the draft offered it), area for the swarmlings,
coverage ahead of the kill box for the Buried Brood, single-target damage to finish her. Escort:
swarmling 50 / runner 30 / footman 20.

### 5.6 The Lich (act II, alternative)

| Stat | Value |
| --- | --- |
| HP | 8,500 |
| Armour / ward / fireproof | 0 / 65 / 0 (phase 3: ward 45) |
| Speed | 0.5 u/s |
| Blockable | yes; melee 35 magic / 1.2 s |
| Chill meter (Numb at) | 500 |
| Leak | 10 |
| Intro line | "The Lich. Nothing that falls near me stays down." |
| Death line | "The Lich crumbles, and the dead lie still at last." |
| Map tooltip | "Raises fallen enemies near it. Wraps itself in bone that lightning and hexes break." |

| Phase | HP | Ability | First | Every | Telegraph | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 100-60% | **Raise Dead** | 6 s | 10 s | 1.5 s: staff raised; a violet ring r 3.0 round it | every enemy that died inside the ring in the last 10 s rises there as a Risen (act stats: 59 HP; summons), at most 8, most recent first |
| 2 | 60-30% | Raise Dead | continues | 8 s | as above | as above |
| 2 | | **Bone Ward** | at the phase start | regrows 16 s after it breaks | 2.0 s: bones knit round it | a 2,000 shield; lightning x3 against it (as every shield); a hex on it halves it at once |
| 3 | < 30% | **Grave Tide** | at the phase start | | 1.0 s invulnerable roar (the phase change) | ward drops to 45; Bone Ward stops; Raise Dead every 6 s with a r 4.0 ring and at most 12; Risen raised in phase 3 move 30% faster |

Answers: physical over magic (ward 65), Storm and Hexer for the Bone Ward, and killing the waves and
escort away from it, or fast, so the ring has nothing to raise. Escort: acolyte 50 / footman 50.

### 5.7 The Pack-Lord (act III, alternative)

| Stat | Value |
| --- | --- |
| HP | 14,000 |
| Armour / ward / fireproof | 25 / 25 / 0 (act III fire +20% applies) |
| Speed | 0.7 u/s (phase 3: 0.9) |
| Blockable | yes, but it slips like a runner (keeps 50% speed for 0.5 s after a soldier engages it); melee 70 / 1.0 s, cleaves 2 soldiers |
| Chill meter (Numb at) | 600 (act III chill -25% applies) |
| Leak | 10 |
| Intro line | "The Pack-Lord. Run, and we run faster." |
| Death line | "The Pack-Lord falls. The howling scatters into the snow." |
| Map tooltip | "Howls to speed its pack and call more. Leaps ahead along the road." |

| Phase | HP | Ability | First | Every | Telegraph | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 100-60% | **Howl** | 5 s | 12 s | 1.5 s: head raised; a crimson ring r 3.5 | allies in the ring +40% speed for 5 s, their slows and chill cleared; 4 **Pups** join at its side (runner bodies: 100 HP, 2.0 u/s, no armour, freezeAt 100, leak 1, summons) |
| 2 | 60-30% | Howl | continues | 12 s | as above | as above |
| 2 | | **Leap** | 3 s after the phase starts | 10 s | 1.5 s: it crouches; an arrow and a landing ring (r 1.2) show 5 u ahead on the path | jumps 5 u along the path in 0.5 s, unblockable in the air; soldiers in the landing ring take 50 and are knocked aside 1 u; every hold on it breaks. Within 5 u of our gate it lands on the gate (a leak) |
| 3 | < 30% | **Frenzy** | at the phase start | | 1.0 s invulnerable roar (the phase change) | speed 0.9; Howl every 8 s with 6 Pups; Leap every 7 s |

Answers: slows spread along the road (a Howl clears the ones near it, so one choke fails), area for
the pups, damage deep along the path (Leap skips the first kill box), soldiers buy little. Escort:
runner 50 / brute 25 / shade 25.

### 5.8 Fury: the third mechanic (ascension 10)

From ascension 10 the champion (5.9) carries its Fury, and so does the Ember Tyrant. (Revision 1
moved ascension 6 to elite affixes, R26.)

| Boss | Name | Effect |
| --- | --- | --- |
| Gorrak | **Shield Wall** | every Muster also brings 2 shieldbearers, and Gorrak gains a 600 shield (lightning x3 against it) |
| Sand Wyrm | **Buried Pad** | Sandstorm also happens in phase 1 (every 20 s, first at 12 s), and each Sandstorm buries the most-invested tower within 6 u of the Wyrm: disabled for the storm's 6 s |
| Frost Colossus | **Shard Rain** | every Stomp in phases 1-2 sheds 2 ice shards (phase 3 stays 3) |
| Hive Queen | **Winged Brood** | every Brood births 2 more bats, and Buried Brood raises a fourth mound 10 u ahead |
| Lich | **Death's Door** | the first time it would die it falls, then rises after a 2.0 s telegraph (invulnerable, a violet column) with 20% HP and Bone Ward at full |
| Pack-Lord | **Shadow Pack** | every Howl also calls 2 shades (stealthed), and Leap reaches 7 u |
| Ember Tyrant | **Second Flight** | at 15% HP it takes wing once more for 10 s and drops 2 more Ember Drakes |

### 5.9 The Tyrant's Guard champion (ascension 10)

Replaces the Last Camp. One of the act I-III bosses this run did **not** meet (seeded from the
three, shown on the map from the start of act IV), with **x1.6 its own HP** (Gorrak 8,000, Hive
Queen 8,000, Wyrm 14,400, Lich 13,600, Colossus 25,600, Pack-Lord 22,400), act IV fireproofing
(25%), and its phases and Fury unchanged. The battle has 6 waves (act IV budget, node 0.9) before the
champion; escort `0.6 x 24`. Name: "Champion of the Citadel: <boss>". Intro: "<boss> stands again,
wearing the Tyrant's colours." No camp follows; the Tyrant comes next.

---

## 6. Waves

### 6.1 Budget

```
T(w) = B[act] x (1 + 0.15 x (w - 1)) x node x floor x shape(w) x ascension
shape(w) = 1.30 on the last wave of a normal or elite battle
           1.20 on waves 4 and 8 (unless last)
           0.85 on waves 5 and 9 (the wave after a 1.20)
           1.00 otherwise
node     = 1.00 battle and bounty, 1.15 elite, 0.90 boss (pre-boss waves), 1.00 event ambush
floor    = section 1 floor factor
ascension: Seven Bells x1.15; A3 "Many" wave x1.30 (they multiply, both are one wave's size)
```

Waves per battle (R13): normal 7 / 8 / 9 / 9 by act, elite one more, boss 7 + the boss wave (act IV
8 + boss); run 1's first battle 6. In boss battles no pre-boss wave counts as "last"; act IV's wave 8
gets 1.20. The boss wave spends only its escort budget `0.6 x B`.

| Battle (node 1, floor 1.00) | Waves | Wave 1 | Wave 5 | Last | Total threat |
| --- | --- | --- | --- | --- | --- |
| Act I | 7 | 10.0 | 13.6 | 24.7 | 107.7 |
| Act II | 8 | 14.0 | 19.0 | 37.3 | 180.1 |
| Act III | 9 | 19.0 | 25.8 | 54.3 | 294.9 |
| Act IV | 9 | 24.0 | 32.6 | 68.6 | 372.5 |
| Elite (I / II / III / IV) | 8 / 9 / 10 / 10 | | | | 147.9 / 249.9 / 384.2 / 485.3 (elites on top) |
| Boss (I / II / III / IV), escort included | 7 / 7 / 7 / 8 + boss | | | | 97.8 / 136.9 / 185.8 / 287.9 |

**Fill** (deterministic, `waves` RNG only for the archetype pick and affixes):

1. Drop roles the wave cannot use yet (6.2), renormalise the archetype's weights.
2. Exact count per role `n = T x weight / sum(weights) / threat`; take the floor of each.
3. Add one unit to each role in order of largest fractional part (ties: larger weight first) while
   total threat stays <= `1.05 x T`.
4. If the core role is below the archetype's minimum, raise it to the minimum, then remove non-core
   units cheapest first until total <= `1.05 x T` (or none left).
5. Small-body caps: swarmlings and bats each at most 20 / 28 / 36 / 36 per wave (acts I-IV), **bats
   at most 10 on act I floors 2-3** (R2); the threat over the cap is spent on the archetype's
   highest-weight other role (rounded).

**Groups**: one group per role, core role first, then by weight; groups of more than 16 split into
16s. A role seen for the first time this run comes first as an **intro group** of up to 4, with the
rest straight after it. Each group starts 2.0 s after the previous group's last unit; units in a
group are spaced by the archetype's spacing. If the whole wave would take more than 10 s, spacing is
scaled down (min 0.25 s) and then the group gaps (min 1.5 s); under 5 s, spacing is scaled up. A
wave the floors can't fit in 10 s simply takes longer (act IV's biggest take ~23 s); the countdown
starts only after its last unit, so nothing stacks. Grand assault interleaves its three parts group
by group (first group of each part in order, then the second of each, and so on).

### 6.2 Enemy pool and unlock order

Earliest wave a role may appear. A role is also gated by floor, so the first acts teach one thing at
a time. Later acts carry everything over.

| Role | Act I F1 | Act I F2 | Act I F3+ (and boss) | Act II F1 | Act II F2 | Act II F3+ (and boss) | Acts III-IV |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Footman | w1 | w1 | w1 | w1 | w1 | w1 | w1 |
| Runner | w2 | w2 | w2 | w1 | w1 | w1 | w1 |
| Brute | w3 | w3 | w3 | w1 | w1 | w1 | w1 |
| Swarmling | w4 (inside Rush only) | w3 | w3 | w1 | w1 | w1 | w1 |
| Acolyte | w5 | w5 | w5 | w1 | w1 | w1 | w1 |
| Bat | never (no flyers in a run's first battle) | w4 | w4 | w1 | w1 | w1 | w1 |
| Shieldbearer | | w6 | w6 | w1 | w1 | w1 | w1 |
| Shaman | | | w7 | w2 | w2 | w2 | w1 |
| Splitter | | | | w2 | w2 | w1 | w1 |
| Drake | | | | w4 | w4 | w3 | w1 |
| Shade | | | | | w3 | w2 | w1 |
| Sapper | | | | | | w3 | w1 |

The first battle of a run is always act I F1 (the start lanes are all battles), so "no flyers in
battle 1" holds. Event ambushes use their floor's column.

### 6.3 Archetypes

| Archetype | Core (minimum) | Weights | Spacing | Answers it asks for |
| --- | --- | --- | --- | --- |
| March | footman | footman 70, runner 15, brute 15 | 0.8 s | coverage |
| Rush | runner | runner 60, swarmling 30, footman 10 | 0.35 s | slows, blockers, fast towers |
| Armoured push | brute (2) | brute 45, shieldbearer 20, footman 35 | 1.0 s | magic, shred, pierce, fire |
| Swarm | swarmling (12) | swarmling 70, runner 15, footman 15 | 0.25 s | area damage |
| Air swarm | bat (6) | bat 75, footman 25 | 0.4 s | air reach |
| Warded column | acolyte (3) | acolyte 55, footman 30, shaman 15 | 0.9 s | physical, fire |
| Shield wall | shieldbearer (2) | shieldbearer 30, brute 35, footman 35 (clumped: group gap 1.0 s) | 0.9 s | Storm, Hexer, focus |
| Healer ball | shaman (2) | shaman 25, acolyte 25, footman 50 (clumped) | 0.6 s | Hexer, burst, splash |
| Slime flood | splitter (3) | splitter 60, swarmling 40 | 1.0 s | splash after the split |
| Stealth raid | shade (4) | shade 60, sapper 25, runner 15 | 0.9 s | reveal, area |
| Siege | sapper (2) | sapper 35, brute 35, shieldbearer 30 | 1.0 s | blocking, spreading out |
| Sky raid | drake (1) | drake 50, bat 50 | 1.2 s | big air |
| Two fronts | two other archetypes at 50% each, on different spawns or fork branches | | as theirs | covering both lanes |
| Grand assault | last wave only: three different archetypes at one third each, interleaved | | 0.6 s | everything |

An archetype is eligible only when its core role is unlocked for that wave, and never the same as
the previous wave. Two fronts needs a merge or fork map (twin lanes are later, R34).

### 6.4 Archetype weights per act

| Archetype | Act I | Act II | Act III | Act IV |
| --- | --- | --- | --- | --- |
| March | 30 | 10 | 6 | 5 |
| Rush | 20 | 10 | 9 | 8 |
| Armoured push | 18 | 13 | 12 | 12 |
| Swarm | 15 (not in battle 1) | 8 | 9 | 8 |
| Air swarm | forced, see below | 8 | 8 | 9 |
| Warded column | 9 | 12 | 11 | 11 |
| Shield wall | 5 | 8 | 10 | 10 |
| Healer ball | 3 | 6 | 8 | 8 |
| Slime flood | | 8 | 8 | 7 |
| Stealth raid | | 7 | 8 | 8 |
| Siege | | 6 | 8 | 9 |
| Sky raid | | 6 | 8 | 12 |
| Two fronts | | 8 (if layout) | 10 (if layout) | 10 (if layout) |

A battle's **theme** (6.7) triples its two archetypes' weights before the pick.

**Guarantees** (placed first, on random eligible waves, before the weighted picks fill the rest; the
last wave is always Grand assault):

| Act | Guaranteed waves per battle |
| --- | --- |
| I | from F2 on: exactly one Air swarm, on a wave from 4 to N-1. No other air. |
| II-IV | at least one wave leaning on each of: **armour** (Armoured push, Shield wall or Siege), **ward** (Warded column or Healer ball), **air** (Air swarm or Sky raid), and **stealth or shields** (Stealth raid or Shield wall; one Shield wall can count for armour or shields, not both) |
| IV | at least two air waves (the Tyrant's act) |

The battle roster (systems 9.6) lists every role the generated waves use, plus the act trait.

### 6.5 Worked examples

These are the exact outputs of the fill rules above for a given archetype sequence (the sequence is
what the `waves` RNG would pick; the counts follow from it). Use them as test fixtures.

#### Act I, floor 1 battle (every run's first battle, from run 2)

B 10, node 1, floor 0.9, 7 waves, start gold 260. Nothing seen yet this run.

| Wave | Budget T | Archetype | Groups in spawn order (count x role) | Threat spent | Spawn time | Bounty |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 9.0 | March | 4 footman (intro), 5 footman | 9.0 | 7.6 s | 45 |
| 2 | 10.3 | Rush | 4 runner (intro), 7 runner, 2 footman | 10.8 | 7.5 s | 54 |
| 3 | 11.7 | Armoured push | 2 brute (intro), 6 footman | 12.0 | 8.0 s | 60 |
| 4 | 15.7 | Rush | 12 runner, 4 swarmling (intro), 12 swarmling, 2 footman | 16.4 | 11.0 s | 90 |
| 5 | 12.2 | Warded column | 4 acolyte (intro), 4 footman | 12.0 | 7.4 s | 60 |
| 6 | 15.8 | Armoured push | 3 brute, 7 footman | 16.0 | 10.0 s | 80 |
| 7 | 22.2 | Grand assault (Rush, Armoured push, Warded column) | 5 runner, 2 brute, 3 acolyte, 8 swarmling, 1 footman, 1 footman, 1 footman | 21.4 | 12.5 s | 111 |

Total threat 97.6; bounty 500 gold (before elite/boss bounty).

#### Run 1, battle 1 (the tutorial battle, R13)

B 10, node 1, floor 0.9, 6 waves, start gold 320. Nothing seen yet.

| Wave | Budget T | Archetype | Groups in spawn order (count x role) | Threat spent | Spawn time | Bounty |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 9.0 | March | 4 footman (intro), 5 footman | 9.0 | 7.6 s | 45 |
| 2 | 10.3 | Rush | 4 runner (intro), 7 runner, 2 footman | 10.8 | 7.5 s | 54 |
| 3 | 11.7 | Armoured push | 2 brute (intro), 6 footman | 12.0 | 8.0 s | 60 |
| 4 | 15.7 | Rush | 12 runner, 4 swarmling (intro), 12 swarmling, 2 footman | 16.4 | 11.0 s | 90 |
| 5 | 12.2 | Warded column | 4 acolyte (intro), 4 footman | 12.0 | 7.4 s | 60 |
| 6 | 20.5 | Grand assault (Rush, Armoured push, March) | 5 runner, 2 brute, 5 footman, 7 swarmling, 1 footman, 2 runner, 1 footman | 20.7 | 13.0 s | 107 |

Total threat 80.9; bounty 416 gold (before elite/boss bounty).

#### Act II, floor 3 elite (Warlock, Regenerating)

B 14, node 1.15, floor 1, 9 waves. Every role seen.

| Wave | Budget T | Archetype | Groups in spawn order (count x role) | Threat spent | Spawn time | Bounty |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 16.1 | Slime flood | 3 splitter, 16 swarmling, 6 swarmling | 15.6 | 10.0 s | 95 |
| 2 | 18.5 | Armoured push | 3 brute, 7 footman, 1 shieldbearer | 19.0 | 10.0 s | 110 |
| 3 | 20.9 | Warded column | 6 acolyte, 6 footman, 1 shaman | 21.0 | 10.0 s | 119 |
| 4 | 28.0 | Sky raid | 2 drake, 16 bat, 8 bat | 26.4 | 10.0 s | 138 |
| 5 | 21.9 | Stealth raid | 6 shade, 2 sapper, 5 runner **+ 1 Warlock (Regenerating)** | 22.0 | 10.0 s | 120 |
| 6 | 28.2 | Shield wall | 3 shieldbearer, 3 brute, 10 footman | 28.0 | 10.0 s | 162 |
| 7 | 30.6 | Siege | 4 sapper, 3 brute, 3 shieldbearer | 30.0 | 10.0 s | 170 |
| 8 | 39.6 | Healer ball | 3 shaman, 16 footman, 4 footman, 5 acolyte | 39.0 | 10.5 s | 226 |
| 9 | 46.0 | Grand assault (Armoured push, Sky raid, Stealth raid) | 2 brute, 1 drake, 5 shade, 6 footman, 13 bat, 1 sapper, 1 shieldbearer, 3 runner **+ 1 Warlock (Regenerating)** | 44.2 | 16.5 s | 243 |

Total threat 245.2; bounty 1383 gold (before elite/boss bounty).

#### Act I boss: Gorrak the Warlord

B 10, node 0.9, floor 1, 7 waves + boss wave. Every act I role seen except the shaman.

| Wave | Budget T | Archetype | Groups in spawn order (count x role) | Threat spent | Spawn time | Bounty |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 9.0 | March | 9 footman | 9.0 | 6.4 s | 45 |
| 2 | 10.3 | Rush | 11 runner, 2 footman | 10.8 | 5.8 s | 54 |
| 3 | 11.7 | Armoured push | 2 brute, 6 footman | 12.0 | 8.0 s | 60 |
| 4 | 15.7 | Swarm | 16 swarmling, 4 swarmling, 9 runner, 2 footman | 15.2 | 11.2 s | 86 |
| 5 | 12.2 | Air swarm | 16 bat, 3 footman | 12.6 | 8.8 s | 63 |
| 6 | 15.8 | Shield wall | 2 shieldbearer, 2 brute, 4 footman | 16.0 | 8.5 s | 80 |
| 7 | 17.1 | Healer ball | 2 shaman (intro), 7 footman, 2 acolyte | 17.0 | 8.8 s | 85 |
| Boss | 6.0 escort | Warband escort | **Gorrak the Warlord**, then 4 footman, 2 runner | 5.6 | boss first, escort 3 s after | 28 + boss |

Total threat 98.2; bounty 501 gold (before elite/boss bounty).

#### Act II boss: the Sand Wyrm

B 14, node 0.9, floor 1, 7 waves + boss wave. Every role seen.

| Wave | Budget T | Archetype | Groups in spawn order (count x role) | Threat spent | Spawn time | Bounty |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 12.6 | Warded column | 4 acolyte, 5 footman | 13.0 | 8.3 s | 74 |
| 2 | 14.5 | Slime flood | 3 splitter, 16 swarmling, 4 swarmling | 15.0 | 10.0 s | 91 |
| 3 | 16.4 | Armoured push | 2 brute, 6 footman, 1 shieldbearer | 15.0 | 10.0 s | 87 |
| 4 | 21.9 | Sky raid | 2 drake, 16 bat, 2 bat | 22.8 | 10.0 s | 120 |
| 5 | 17.1 | Stealth raid | 5 shade, 1 sapper, 4 runner | 16.2 | 10.0 s | 88 |
| 6 | 22.1 | Healer ball | 2 shaman, 11 footman, 3 acolyte | 23.0 | 10.0 s | 133 |
| 7 | 23.9 | Siege | 3 sapper, 3 brute, 2 shieldbearer | 24.0 | 9.0 s | 136 |
| Boss | 8.4 escort | Sand escort | **the Sand Wyrm**, then 2 acolyte, 2 shade | 8.0 | boss first, escort 3 s after | 44 + boss |

Total threat 137.0; bounty 773 gold (before elite/boss bounty).

#### Act III boss: the Frost Colossus

B 19, node 0.9, floor 1, 7 waves + boss wave. Every role seen.

| Wave | Budget T | Archetype | Groups in spawn order (count x role) | Threat spent | Spawn time | Bounty |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 17.1 | Armoured push | 2 brute, 6 footman, 1 shieldbearer | 15.0 | 10.0 s | 90 |
| 2 | 19.7 | Rush | 15 runner, 16 swarmling, 4 swarmling, 2 footman | 20.0 | 12.8 s | 127 |
| 3 | 22.2 | Warded column | 6 acolyte, 7 footman, 1 shaman | 22.0 | 10.0 s | 132 |
| 4 | 29.8 | Sky raid | 2 drake, 16 bat, 9 bat | 27.0 | 10.0 s | 172 |
| 5 | 23.3 | Shield wall | 2 shieldbearer, 3 brute, 9 footman | 24.0 | 10.0 s | 144 |
| 6 | 29.9 | Slime flood | 6 splitter, 16 swarmling, 16 swarmling, 4 swarmling | 28.8 | 14.0 s | 180 |
| 7 | 32.5 | Siege | 4 sapper, 4 brute, 3 shieldbearer | 33.0 | 10.0 s | 198 |
| Boss | 11.4 escort | Frost escort | **the Frost Colossus**, then 1 brute, 1 shieldbearer, 4 footman | 10.0 | boss first, escort 3 s after | 60 + boss |

Total threat 179.8; bounty 1103 gold (before elite/boss bounty).

#### Act IV boss: the Ember Tyrant

B 24, node 0.9, floor 1, 8 waves + boss wave. Every role seen.

| Wave | Budget T | Archetype | Groups in spawn order (count x role) | Threat spent | Spawn time | Bounty |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 21.6 | Sky raid | 1 drake, 16 bat, 3 bat | 17.4 | 10.0 s | 115 |
| 2 | 24.8 | Armoured push | 4 brute, 9 footman, 1 shieldbearer | 24.0 | 10.0 s | 163 |
| 3 | 28.1 | Warded column | 8 acolyte, 9 footman, 1 shaman | 28.0 | 10.0 s | 187 |
| 4 | 37.6 | Swarm | 16 swarmling, 16 swarmling, 4 swarmling, 16 runner, 12 runner, 6 footman | 39.2 | 23.5 s | 254 |
| 5 | 29.4 | Stealth raid | 9 shade, 2 sapper, 6 runner | 28.8 | 10.0 s | 187 |
| 6 | 37.8 | Shield wall | 4 shieldbearer, 4 brute, 14 footman | 38.0 | 10.0 s | 258 |
| 7 | 41.0 | Healer ball | 4 shaman, 16 footman, 5 footman, 5 acolyte | 43.0 | 11.0 s | 292 |
| 8 | 53.1 | Air swarm | 16 bat, 16 bat, 4 bat, 16 footman, 16 footman, 1 footman | 54.6 | 23.2 s | 375 |
| Boss | 14.4 escort | Ember escort | **the Ember Tyrant**, then 1 drake, 6 runner, 2 acolyte | 14.8 | boss first, escort 3 s after | 95 + boss |

Total threat 287.8; bounty 1926 gold (before elite/boss bounty).

Reading them: an act I F1 battle spends ~98 threat for 500 gold of bounty; with 260 start gold, 72
of wave pay and ~75 interest that is ~900 gold, in line with systems.md's 960-1,060 for a floor-1.00
act I battle. Run 1's tutorial battle is smaller (81 threat) and richer at the start (320 gold).
Every role obeys the unlock table (6.2): no shieldbearer before wave 6 and no shaman before wave 7
in act I, no shaman on wave 1 in act II. The act II elite's two warlocks are on top of its 245
threat (~1,380 gold); the escorts of the bosses are deliberately small so the boss is the story. In
act IV the Tyrant battle has two air waves (Sky raid, Air swarm), so a ground-only war table sees
the problem before the boss arrives. Spawn times over 10 s are the floors at work (6.1).

### 6.6 Wave affixes (ascension 3, Veteran Foes)

From ascension 3, one wave per battle (`waves` RNG, any wave from 3 to the last-but-one) carries one
affix for every enemy in it, shown on the skull. It rolls from the one affix list in 4.4 (R32): Hasted
(+20% on a wave), Plated, Runed or Many (budget x1.30).

### 6.7 Battle themes (R24)

Every battle node (battle, bounty, elite, ambush, the Ash Road and the Gatehouse; not boss battles)
rolls a theme when the act map is made, with the `map` stream. A theme names two archetypes whose
weights are **x3** in that battle; guarantees still come first and eligibility still applies. The
node tooltip and the battle roster show it as "Name: what it brings".

| Act | Theme | Archetypes x3 | Node line |
| --- | --- | --- | --- |
| I | Raiders | Rush, Swarm | "Raiders: rush and swarm." |
| I | Vanguard | March, Armoured push | "Vanguard: a long column with brutes." |
| I | Iron Line | Armoured push, Shield wall | "Iron Line: armour and shields." |
| I | Hedge Coven | Warded column, Healer ball | "Hedge Coven: wards and healers." |
| I | Levy | March, Rush | "Levy: many feet, little armour." |
| II | Tomb Robbers | Stealth raid, Siege | "Tomb Robbers: unseen, with charges." |
| II | Sun Court | Warded column, Healer ball | "Sun Court: wards and healers." |
| II | Bronze Legion | Armoured push, Shield wall | "Bronze Legion: heavy plate." |
| II | Sky Hunters | Sky raid, Air swarm | "Sky Hunters: drakes and bats." |
| II | Sand Flood | Slime flood, Swarm | "Sand Flood: slimes and swarms." |
| III | Avalanche | Rush, Slime flood | "Avalanche: fast and many." |
| III | Night Raid | Stealth raid, Rush | "Night Raid: hidden and quick." |
| III | Iron Pass | Shield wall, Siege | "Iron Pass: shields and sappers." |
| III | Frost Wings | Sky raid, Air swarm | "Frost Wings: the sky is full." |
| III | Ice Coven | Warded column, Healer ball | "Ice Coven: wards and healers." |
| IV | Ash Wings | Sky raid, Air swarm | "Ash Wings: the sky is full." |
| IV | Obsidian Legion | Armoured push, Shield wall | "Obsidian Legion: heavy plate." |
| IV | Cinder Swarm | Swarm, Slime flood | "Cinder Swarm: slimes and swarms." |
| IV | Smoke Raid | Stealth raid, Siege | "Smoke Raid: unseen, with charges." |
| IV | Ember Coven | Warded column, Healer ball | "Ember Coven: wards and healers." |

Act I themes on F1 still obey F1's unlocks (Raiders there is Rush with swarmlings from wave 4).

---

## 7. Commanders and spells

### 7.1 Commanders

| | Marshal | Alchemist | Seer | Quartermaster | Warden |
| --- | --- | --- | --- | --- | --- |
| Key | marshal | alchemist | seer | quartermaster | warden |
| Unlock | open | renown level 4 | reach act III once | renown level 13 | renown level 6 (R27) |
| Brings unlocked | | | Beacon tower | | Thornwood Grove tower |
| Start lives | 20 / 20 | 20 / 20 | 20 / 20 | 20 / 20 | 26 / 26 (Heartwood) |
| Start crowns | 30 | 30 | 30 | 30 | 30 |
| Starting towers (keys 1-3) | Archer, Barracks, Mage | Alchemist, Pyre, Bombard | Mage, Frost Spire, Archer (R27) | Archer, Bombard, War Banner | Barracks, Thornwood Grove, Archer (balance.md) |
| Starting relic | Old Standard | Bubbling Retort | Third Eye | Ledger | Heartwood |
| Passive | Drillmaster | Volatile | Foresight | Supply Lines | Deep Roots |
| Q | Reinforcements | Firebomb | Stillness | Requisition | Barrier |
| W | Meteor | Tar Pit | Judgement | Rally | Bramble Surge |
| Difficulty (card) | easy | medium | medium | hard | easy-medium |
| Card line | "Every kind of damage, and spells that fix mistakes." | "Oil and fire from the first battle. Find air cover." | "Sees what is coming and stops time." | "Gold now, gold later, if you can hold." | "Nothing gets through, on foot or on the wing." |
| Flavour | "She has lost battles. Never twice the same way." | "He has fewer eyebrows every year." | "She saw this war before it started." | "Every arrow has a price, and he knows it." | "He was a forester before the war. He still is." |

**Starting relics** (not in the pool):

| Relic | Effect | Flavour |
| --- | --- | --- |
| Old Standard | After a battle with 0 or 1 lives lost, heal 1 life. | "Faded, patched, still flying." |
| Bubbling Retort | Each battle starts with 3 oil puddles (r 0.9) on the path's longest straight. They stay until lit; once lit they burn 4 s as fire patches. | "It never quite stops simmering." |
| Third Eye | Card rewards show 4 cards. | "It sees the choice you'd have missed." |
| Ledger | Leftover battle gold turns into crowns at 5:1 (not 10:1), up to 20 (not 12). | "Every coin in its column." |
| Heartwood | +6 max lives (start 26 / 26). | "A slice of the oldest tree, still warm." |

**Passives**:

| Passive | Effect | Pool |
| --- | --- | --- |
| Drillmaster | The first upgrade you buy each battle is free (L1 to L2 or L2 to L3; not a specialisation). | free purchase (0.1), not `cost` |
| Volatile | Oiled enemies take +15% fire damage; burning kills give +1 gold (x gold). | `taken:oiled` (fire only), `gold` |
| Foresight | See the enemy roles of every battle and elite node on the map; the skull shows the next two waves. | `rule` |
| Supply Lines | Shop prices -15%; +3 crowns after every battle. | `run` |
| Deep Roots | Soldiers start regenerating 0.5 s after leaving combat (not 2 s). An enemy held by a soldier for 3 s is Revealed and Marked (+20% crit chance against, +10% taken) for 5 s. | `rule`, `taken:mark` |

### 7.2 Spells

Both spells start each battle 50% charged; no casting in Setup; cooldowns run on sim time; calling a
wave early shortens both cooldowns by the seconds skipped. Spell damage x act. Q/W aims (reticle),
click or Enter casts, Esc cancels; instant spells cast on the key. **Circle spells (Meteor, Firebomb,
Tar Pit, Bramble Surge) hit flyers for 50% of their damage; their slows, oil and roots never touch
flyers** (R2).

| Spell | Commander | Target | Cooldown | Effect | Flavour |
| --- | --- | --- | --- | --- | --- |
| Reinforcements | Marshal Q | path point | 18 s | 2 soldiers drop and hold for 10 s: HP 90, armour 15, 8 physical / 1.0 s (HP and damage x act); normal blocking | "Two good men, right where you need them." |
| Meteor | Marshal W | circle r 1.4 | 40 s | after a 1.0 s warning circle: 220 fire in r 1.4 (x act) and burn 20 dps for 3 s (x act); ignites oil | "Look up." |
| Firebomb | Alchemist Q | circle r 1.4 | 25 s | lays an oil puddle (r 1.4, 6 s) and lights it at once: 80 fire (x act) to everyone inside, each of them ignites (60 fire + burn 20 dps 4 s, flat), and the puddle burns as a fire patch for the rest of its 6 s | "Oil first. Then the match." |
| Tar Pit | Alchemist W | circle r 2.0 | 40 s | a pool for 6 s: 50% slow inside (max rule; bosses 25%), Oiled while inside + 4 s; fire lights it into a fire patch | "Thick, black, and very flammable." |
| Stillness | Seer Q | instant, all enemies | 60 s | every enemy is Frozen 3 s (ignores freezeAt, respects Thawing and the hard-CC immunity; elites 1.5 s; bosses Numb 3 s). Fire still thaws; Brittle only if a Shatter spire hits them | "For a moment, nothing moves." |
| Judgement | Seer W | auto: the enemy with the most HP | 30 s | 350 pure (x act) + stun 1 s (bosses 0.25 s); interrupts a warlock's chant | "The sky chooses." |
| Requisition | Quartermaster Q | a tower (the selected one; aim moves between towers) | 30 s | the tower gains its next level (L1 to L2 or L2 to L3, never a specialisation) for 50% of that upgrade's price (`cost` -50%, so other discounts add nothing); usable while you can pay the half (R11) | "Sign here." |
| Rally | Quartermaster W | instant | 40 s | all towers and soldiers +40% attack speed for 8 s (`aspd`, on top of banners; cap +100%) | "Double time, everyone." |
| Barrier | Warden Q | path point | 35 s | a wall of roots across the path for 4 s: blocks every ground enemy (holds any number); juggernauts and bosses break it after 1 s | "The road is closed." |
| Bramble Surge | Warden W | circle r 2.2 | 40 s | roots every ground enemy inside for 2 s (respects root immunity; juggernauts and bosses get 50% slow 2 s instead) and 30 physical (x act) | "The ground grabs back." |

**By act** (x act applied):

| Spell number | Act I | Act II | Act III | Act IV |
| --- | --- | --- | --- | --- |
| Reinforcements soldier HP / damage | 90 / 8 | 126 / 11.2 | 171 / 15.2 | 216 / 19.2 |
| Meteor impact / burn dps | 220 / 20 | 308 / 28 | 418 / 38 | 528 / 48 |
| Firebomb impact (plus flat ignite 60 + 80 burn) | 80 | 112 | 152 | 192 |
| Judgement | 350 | 490 | 665 | 840 |
| Bramble Surge | 30 | 42 | 57 | 72 |

Spell check (systems 11: one spell over a battle is worth ~60-80% of an L2 tower). A 2:20 act I
battle (7 waves) with no early calls: Meteor (ready at 20 s, then every 40 s) lands 4 times (20, 60,
100, 140 s); on a clump that is 4 x 220 x 3.7 (splash) + burn ~960 = ~4,200 damage against an L2
Bombard's ~6,050 group damage, **~70%**. Judgement lands 5 times: 1,750 pure on the biggest target
against an L2 Mage's ~3,800, **~46%**, which its stun, its pure type and its aim (always the biggest
threat, through any ward) make up for. Reinforcements (8 casts x 2 soldiers x 10 s) holds ~16
soldier-blocks a battle, a little more than an L2 Barracks' work. Requisition (5 casts) saves ~250-350
gold of upgrades; Rally (4 casts) is 32 s of +40% for every tower. Stillness is the strongest effect on
the list on purpose (systems 11).

---

## 8. Relics

45 pool relics (10 common, 10 uncommon, 10 rare, 9 boss, 6 shop), 2 event-only, 5 starting. Prices
are shop base prices before modifiers (section 11). "Unlock" is the renown level that adds it to the
pool (start = in the pool from the first run). Tagged relics are 3x as likely while you own a
tagged tower. **Black Ice and Cold Iron exclude each other**: once one is taken, the other is not
offered that run (run-meta's dominance lever 3, applied).

### 8.1 Common (10), price 110

| Key | Relic | Effect | Tags | Unlock | Flavour |
| --- | --- | --- | --- | --- | --- |
| spare_planks | Spare Planks | The first tower you build each battle is free (its L1 cost after discounts, up to 100 gold; a free purchase, 0.1). | all | start | "Left over from last time. There's always some left over." |
| war_chest | War Chest | Start each battle with +40 gold (x gold). | all | start | "Heavier than it looks." |
| lucky_horseshoe | Lucky Horseshoe | The first enemy to get through each battle costs no lives (never an elite or a boss, R1). | all | start | "Nailed over the gate, points up." |
| field_rations | Field Rations | Rest heals 4 more lives. | all | start | "Hard bread, honest cheese." |
| coin_purse | Coin Purse | +6 crowns after every battle with no lives lost. | econ | start | "It jingles when you do well." |
| signal_horn | Signal Horn | The call-early bonus is doubled for waves 2, 3 and 4. | econ | start | "One blast: come on, then." |
| snowglobe | Snowglobe | Enemies of wave 1, and a boss's escort, enter with their chill at 80% (a 32% slow); it starts fading after 6 s. | frost | start | "Shake it and the first ones shiver." |
| copper_coil | Copper Coil | Storm Spire chains reach 1 more enemy. | storm | start | "Wound tight, still humming." |
| grease_pot | Grease Pot | Alchemist puddles are 30% larger. | fire | start | "Don't ask what's in it." |
| marching_drum | Marching Drum | Soldiers move twice as fast to their rally point and respawn 25% sooner. | block | start | "Left, right, left, faster." |

### 8.2 Uncommon (10), price 150

| Key | Relic | Effect | Tags | Unlock | Flavour |
| --- | --- | --- | --- | --- | --- |
| black_ice | Black Ice | Frozen enemies take 25% more damage from everything (`taken:frozen`). | frost | level 2 | "Dark ice is the hardest kind." |
| storm_glass | Storm Glass | Storm Spires deal +60% damage to Chilled or Frozen enemies (`dealt`, adds with Conductive). | storm, frost | level 10 | "The weather in the glass is always a storm." |
| hunters_whistle | Hunter's Whistle | Marked enemies drop 3 more gold (x gold) when they die. | mark, econ | start | "Two short notes: dinner." |
| armourers_awl | Armourer's Awl | Every shred stack also lowers ward by 5. | hex, fire | start | "A tool for opening things." |
| long_fuse | Long Fuse | Bombard shells leave fire where they land: 2 s, r 0.8, 15 fire dps; it lights oil. | fire | level 2 | "Lit early, lands late." |
| thorn_collar | Thorn Collar | Enemies held by a soldier take 10 physical damage a second (x act). | block | start | "It hurts more to push against it." |
| echo_stone | Echo Stone | The first damage spell you cast each battle is cast again 1 s later at 60% strength (same spot). The first non-damage spell instead gets 50% of its cooldown back at once. | spell | start | "Say it once. Hear it twice." |
| spyglass | Spyglass | Archers and Ballistas get +15% range and reveal stealthed enemies in their range. | mark | start | "Brass, cracked, still true." |
| iron_shutters | Iron Shutters | No tower can be disabled for more than 2 s. | all | start | "Bolted from the inside." |
| pilgrims_map | Pilgrim's Map | You can see what each ? node holds before you choose it. | all | start | "Someone walked this way before, and wrote it down." |

### 8.3 Rare (10), price 200 (The Ninth Pad never in shops)

| Key | Relic | Effect | Tags | Unlock | Flavour |
| --- | --- | --- | --- | --- | --- |
| ninth_pad | The Ninth Pad | Every map has one extra build pad, on a good bend (coverage 6-10 u, never the best pad). | wide, all | start | "Someone left a foundation here. Lucky." |
| tidewater_vial | Tidewater Vial | Chilled enemies count as Oiled: fire ignites them (the ignite uses up their chill) and Naphtha's explosions catch them. | frost, fire | level 18 | "Sea water, cold as a grave, burns like lamp oil." |
| prism_lens | Prism Lens | Beacon marks also hex (+20% taken, no healing, shields halved) for the mark's duration. | mark, hex | level 10 | "Light, bent into a curse." |
| cold_iron | Cold Iron | Physical damage ignores all armour on Frozen enemies. | frost | level 15 | "Old iron hates the cold, and what lives in it." |
| old_oak_seed | Old Oak Seed | When a soldier falls, a bramble grows there and roots the next ground enemy to pass for 1.5 s. | block | level 15 | "Plant it where someone brave fell." |
| twin_crests | Twin Crests | Once per battle, the first tower you specialise may also buy the other specialisation at full price: it gains that spec's mechanic and keeps the first spec's stats. | tall | level 10 | "Two houses, one shield." |
| phoenix_feather | Phoenix Feather | The first time your lives reach 0, they return to 8. Then it crumbles. Not when a boss or elite leak takes the last life (R1). | all | start | "Warm to the touch, for now." |
| dragonglass | Dragonglass | Fire damage ignores fireproofing (R15). | fire | level 18 | "Black glass from a dragon's bed. Fire remembers it." |
| deadeyes_oath | Deadeye's Oath | Crits against Marked enemies deal x5, from every tower (`critM`; cap-lifter, R19). | mark | level 10 | "Swear it on the string: one shot, one end." |
| wildfire_crown | Wildfire Crown | Burns stack: an enemy can carry burns from up to 3 different towers or spells at once, each ticking on its own (cap-lifter, R19). | fire | level 2 | "It sits on no head. It burns all the same." |

### 8.4 Boss (9), offered 3 at a time after the act I and act II bosses; never sold (except the Wandering Merchant, 150 crowns + 3 lives)

| Key | Relic | Upside | Downside | Tags | Unlock | Flavour |
| --- | --- | --- | --- | --- | --- | --- |
| royal_mint | Royal Mint | Start each battle with +150 gold (x gold). | Kills give 15% less gold (`gold`). | econ, tall | start | "Stamped with a face nobody likes." |
| masons_seal | Mason's Seal | Building and upgrading cost 25% less. | Specialisations cost 50% more. | wide | start | "Square, level, plumb." |
| siege_engine | Siege Engine | Every tower is built at L2, for its L1 cost plus half its L2 cost (`cost`, R3). | You can't call waves early. Veteran is never offered. | all | start | "Assembled on site. Slowly." |
| sun_disc | Sun Disc | Commander spells recharge twice as fast. | You can't choose Rest at rest nodes (Drill and Fortify only). | spell | start | "Bright enough to see the spells coming back." |
| seven_bells | Seven Bells | Two extra build pads on every map. | Every wave is 15% bigger (threat x1.15). | wide | level 15 | "They ring for the dead, and the dead come." |
| hollow_crown | Hollow Crown | Card rewards show 1 more card. | Shop prices +100%. | all | start | "It fits anyone. That's the trouble." |
| pact_of_embers | Pact of Embers | +6 max lives, and heal to full now. | Every leak costs 1 more life (not elites or bosses, R1). | all | level 18 | "Signed in something warmer than ink." |
| crowded_banners | Crowded Banners | Towers gain +10% attack speed for each tower on a pad within 2.8 u (`aspd`). | Towers with no tower within 2.8 u attack 30% slower. | wide | level 15 | "Shoulder to shoulder, or not at all." |
| overclock | Overclock | Towers attack 25% faster, and the attack-speed cap is +200% instead of +100% (cap-lifter, R19). | Towers overheat: every attacking tower has 1 u less range (after the % pool). | tall | level 15 | "Run it hot. Run it until it glows." |

### 8.5 Shop (6), price 130, only sold in shops

| Key | Relic | Effect | Tags | Unlock | Flavour |
| --- | --- | --- | --- | --- | --- |
| guild_seal | Guild Seal | Shop prices 20% lower; the restock is free. | econ | start | "Members pay less. Members always pay less." |
| abacus | Abacus | The gold interest cap is doubled (+100%). | econ | start | "Click, click, profit." |
| merchants_bell | Merchant's Bell | ? nodes are 3x as likely to be shops; shops carry one more relic. | econ | start | "Ring it and someone with a cart appears." |
| smugglers_crate | Smuggler's Crate | Skipping a card gives a random boon for your tower with the most boons instead of crowns. | tall | start | "No questions, no receipts." |
| wayfarers_spade | Wayfarer's Spade | Rest nodes offer Dig: find a relic (common 50, uncommon 35, rare 15). | all | start | "Every campsite has something buried under it." |
| bellows | Bellows | Forge Hone shows 4 boons; Temper upgrades 3. | tall | level 18 | "Breathe on the coals and they remember." |

### 8.6 Event-only (2)

| Key | Relic | Effect | From | Flavour |
| --- | --- | --- | --- | --- |
| votive_candle | Votive Candle | Rest nodes offer Pray: lift a curse. | The Crossroads Shrine | "Someone else's prayer. You carry it now." |
| widows_hammer | Widow's Hammer | Each Temper also tempers one random other boon. | The Smith's Widow | "Worn smooth where his hand was." |

---

## 9. Curses

A curse is a card on the war table; it takes no blueprint key. Lifted at a shop (60 crowns, +20
each time in the run), by Pray (Votive Candle), or by events. Each is worth about -60 to -80 crowns
over a run (R14).

| Key | Curse | Effect | Flavour |
| --- | --- | --- | --- |
| debt | Debt | Lose 10 crowns after each battle (never below 0). | "The vault keeps its own accounts." |
| doubt | Doubt | Setup is timed: wave 1 starts by itself 20 s after a battle opens. | "No time to think it through." |
| haunted | Haunted | A shade (act stats, outside the budget, 0 bounty) joins waves 3, 6 and 9 of every battle. | "Something follows you from camp to camp." |
| rust | Rust | L3 upgrades cost 20% more (`cost`). | "Everything you build creaks a little." |
| leaking_roof | Leaking Roof | Every enemy that gets through costs 1 more life, at most +3 per battle (never on an elite or a boss). | "Always the same corner." |
| cold_hands | Cold Hands | Your first tower each battle costs 50% more (`cost`). | "Fingers that won't work in the morning." |
| dread | Dread | Bosses start with 15% more health. | "They've heard you're coming." |
| toll | Toll | Entering a shop costs 15 crowns (all you have, if less). | "There's a man at every gate now." |

---

## 10. Events

30 events (R22): 12 any act, 6 for each of acts I-III. 28 are in the pool from the start; the
Wandering Merchant and the Ruined Chapel unlock at renown level 7 (R27). Each shows its text beside a
glyph vignette (art.md 7.9). A choice that grants war supplies with both slots full asks which to
keep. An event is seen at most once a run. Act events are 40% of ? rolls in their act; the rest come from "any act". An event the codex
hasn't seen is weighted 2x. A choice that can't be taken shows greyed with its reason in brackets.
Random outcomes use the run's `events` RNG stream (seeded from run seed + node). Crowns and lives in
outcomes are flat (no act scaling) unless stated.

### Any act

**1. The Crossroads Shrine** (`crossroads_shrine`)
> A small stone shrine stands where four roads meet. Candles burn inside it, though no one is near.
> The wax is still soft.

| Choice | Outcome |
| --- | --- |
| Pray | Lose 3 lives. Choose a rare boon for one of your towers (pick 1 of 3). |
| Leave a coin | Pay 25 crowns. Lift a curse; if you have none, heal 5 lives. [Not enough crowns] |
| Take a candle | Gain the Votive Candle. Gain the curse Toll. |

**2. The Old Battlefield** (`old_battlefield`)
> Rusted helms lie in the long grass, a whole line of them, all facing the same way. Something glints
> under a broken shield. Crows watch from a dead tree.

| Choice | Outcome |
| --- | --- |
| Search | 75%: gain 20 crowns, and you may search again. 25%: something wounded wakes; lose 2 lives and the event ends. Each search adds 15 points to the risk (25, 40, 55, 70%). The third success also finds a random uncommon relic. |
| Leave | Nothing. |

**3. The Tinker's Cart** (`tinkers_cart`)
> A cart full of springs, lenses and little brass wheels. The tinker says he can make anything better,
> for a price. He has not stopped talking since you arrived.

| Choice | Outcome |
| --- | --- |
| Trade up | Give up one common or uncommon boon. Choose 1 of 2 boons one rarity higher for the same tower. [No boon to trade] |
| Mystery crate | Pay 40 crowns. Gain a random relic: common 60%, uncommon 40%. [Not enough crowns] |
| Move on | Nothing. |

**4. A Deserter** (`deserter`)
> A soldier in a torn tabard steps out of the trees with his hands open. "Their side is losing," he
> says. "I'd rather be on yours."

| Choice | Outcome |
| --- | --- |
| Take him in | Gain a random unlocked blueprint you don't own. With 6, choose one to replace (its boons pay 10 crowns each). |
| Ask for his map | See what every ? node on this act's map holds. |
| Send him away | Heal 3 lives. |

**5. The Gambler's Table** (`gamblers_table`)
> Three cups and a dried pea, on a barrel by the road. The man behind it smiles too much.

| Choice | Outcome |
| --- | --- |
| Bet 30 crowns | 45%: gain 75 crowns (you pay 30 either way; +45 net). 55%: lose the 30. [Not enough crowns] |
| Bet a life | 50%: a random uncommon boon for one of your towers. 50%: lose 3 lives. |
| Watch, then leave | Nothing. |

**6. The Smith's Widow** (`smiths_widow`)
> Her husband's forge has been cold since the spring. She looks at your towers for a long time, then
> offers to light it once more.

| Choice | Outcome |
| --- | --- |
| Temper two boons | Temper two boons of your choice, free. [No boons to temper] |
| Take his hammer | Gain the Widow's Hammer. |

**7. Refugees on the Road** (`refugees`)
> A line of carts, children asleep on the sacks. They have walked a long way. They ask for nothing.

| Choice | Outcome |
| --- | --- |
| Give 30 crowns | +3 max lives and heal 3 lives. [Not enough crowns] |
| Walk with them | Your next battle has 2 fewer waves and gives no card reward (crowns as normal). |
| Pass by | Nothing. |

**8. The Wandering Bard** (`wandering_bard`)
> He has heard of you, he says, and could make you famous. His lute has three strings left.

| Choice | Outcome |
| --- | --- |
| Pay him 20 crowns | The next boss starts with 10% less health. [Not enough crowns] |
| Ask for a song of the road | See the next act's map and boss now. [Not in act IV] |
| Tell him to go | Nothing. |

**9. The Overturned Wagon** (`overturned_wagon`)
> A supply wagon lies on its side in the ditch, one wheel still turning. The crates are stencilled
> with our own crest. Nobody is guarding them.

| Choice | Outcome |
| --- | --- |
| Take what you can carry | Gain two random war supplies. |
| Right the wagon | Lose 2 lives. Gain three random war supplies and 15 crowns. |
| Leave it for its owners | Nothing. |

**10. The Recruiting Sergeant** (`recruiting_sergeant`)
> A sergeant with a drum and a list of names sits on a milestone. "I can find you men," he says,
> "or I can make the ones you have better."

| Choice | Outcome |
| --- | --- |
| Hire a crew | Pay 35 crowns. Choose a tower: it gains a random uncommon boon. [Not enough crowns] |
| Drill your own | Lose 2 lives. Temper one boon of your choice. [No boons to temper] |
| Decline | Nothing. |

### Act I: Meadow

**11. The Miller's Fire** (`millers_fire`)
> The mill is burning. The miller is on the roof, waving his hat, and the ladder is on fire too.

| Choice | Outcome |
| --- | --- |
| Climb up | Lose 3 lives. Gain the Pyre blueprint (if you own it, a random Pyre boon instead) and 30 crowns. |
| Fetch water | If you own a Frost Spire, gain a random Frost Spire boon; otherwise gain 15 crowns. |
| Keep going | Nothing. |

**12. Bees in the Orchard** (`bees`)
> The old orchard hums. A hive as big as a barrel hangs from the biggest tree, and the honey drips
> into the grass.

| Choice | Outcome |
| --- | --- |
| Take the honey | Heal 6 lives. |
| Take the whole hive | Lose 4 lives. Gain the Thornwood Grove blueprint (if you own it, two random Thornwood boons; if it is still locked, two random boons for your towers). |

**13. The Harvest Fair** (`harvest_fair`)
> Bunting between the barns, a pig on a spit, and a shooting contest with a silver prize. Nobody here
> seems to know there is a war.

| Choice | Outcome |
| --- | --- |
| Enter the contest | If you own an Archer or a Ballista, gain 40 crowns; otherwise gain 15 crowns. |
| Buy at the stalls | Pay 25 crowns. Gain two random war supplies. [Not enough crowns] |
| Rest a while | Heal 4 lives. |

**14. The Scarecrow** (`scarecrow`)
> A scarecrow stands in an empty field in a good new coat, its eyes stitched shut. The crows won't
> come near it. Neither will the wind.

| Choice | Outcome |
| --- | --- |
| Take its coat | Gain a random common relic. Gain the curse Haunted. |
| Burn it | Lose 1 life. Lift a curse; if you have none, gain 20 crowns. |
| Leave it standing | Nothing. |

**15. The Ford** (`the_ford`)
> The river is high and brown. A ferryman waits with a flat boat; a mile upstream an old bridge still
> stands, mostly.

| Choice | Outcome |
| --- | --- |
| Pay the ferryman | Pay 20 crowns. Your next battle starts with +60 gold (x gold). [Not enough crowns] |
| Take the bridge | Gain 15 crowns from what washed up. 40%: a plank gives way; lose 3 lives. |
| Wade across | Lose 1 life. |

**16. The Lost Patrol** (`lost_patrol`)
> Four of our own soldiers, mud to the knees, sheltering under a hedge. Their captain is gone. They
> ask who is in charge now.

| Choice | Outcome |
| --- | --- |
| Take them on | Gain the Barracks blueprint (if you own it, a random Barracks boon). |
| Send them home | +2 max lives and heal 2 lives. |
| Arm them and march on | Pay 15 crowns. Gain a Spike Trap and a War Horn. [Not enough crowns] |

### Act II: Desert ruins

**17. The Sunken Vault** (`sunken_vault`)
> A stone door in the sand, half buried. Old words are cut above it: "What is taken is paid for."

| Choice | Outcome |
| --- | --- |
| Open it | Gain a random rare relic. Gain the curse Debt. |
| Mark it and move on | Gain 25 crowns. |

**18. The Mirage Market** (`mirage_market`)
> Stalls shimmer in the heat, too bright to be real. Everything on them is half price. The merchants
> don't cast shadows.

| Choice | Outcome |
| --- | --- |
| Shop | A full shop at half price (services included). The stall says it up front: when you leave, the most expensive thing you bought turns to sand and is lost. |
| Walk past | Nothing. |

**19. The Sphinx** (`sphinx`)
> It doesn't ask a riddle. It asks which of your towers you trust most, and waits.

| Choice | Outcome |
| --- | --- |
| Name one | Choose a tower: it gains two random boons (common 60, uncommon 35, rare 5). One other tower with a boon loses one boon (random). |
| Name none | Nothing happens. The sphinx looks disappointed. |

**20. The Dry Well** (`dry_well`)
> A well in the ruins, its rope long gone. Far below something glints, and a cold breath rises from
> the dark.

| Choice | Outcome |
| --- | --- |
| Climb down | Lose 3 lives. Gain a random uncommon relic. |
| Drop a coin and wish | Pay 10 crowns. Heal 4 lives. [Not enough crowns] |
| Move on | Nothing. |

**21. The Caravan Master** (`caravan_master`)
> Forty camels and one tired man with a ledger. He sells to both sides, and says so cheerfully.

| Choice | Outcome |
| --- | --- |
| Buy his oil | Pay 30 crowns. Gain two Oil Barrels and a Frost Flask (choose which to keep if your slots are full). [Not enough crowns] |
| Sell him a tower | Remove one blueprint and its boons. Gain 70 crowns. [Need 4 blueprints] |
| Ask about the road | See what every ? node on this act's map holds. |

**22. The Buried King** (`buried_king`)
> A stone king's head, tall as a house, half sunk in the sand. Its mouth is open, and the wind moans
> through it.

| Choice | Outcome |
| --- | --- |
| Dig out its hands | Lose 2 lives. Choose a rare boon for one of your towers (pick 1 of 3). |
| Read the words on its brow | Choose a tower: it gains a random common boon, already tempered. |
| Leave it to the sand | Nothing. |

### Act III: Frozen peaks

**23. The Frozen Knight** (`frozen_knight`)
> A knight stands in the ice, sword raised, eyes open. The ice around his heart is thinner than the
> rest.

| Choice | Outcome |
| --- | --- |
| Thaw him | Lose 4 lives. Gain a random rare relic. |
| Take the sword | Gain a random uncommon relic. Gain the curse Cold Hands. |
| Leave him to the cold | Nothing. |

**24. The Avalanche Pass** (`avalanche_pass`)
> Snow hangs over the narrow pass like a held breath. One loud word would bring it down.

| Choice | Outcome |
| --- | --- |
| Go quietly | Gain 20 crowns. Skip the next floor: move to any node two floors ahead that a path reaches from here (never past the rest floor). |
| Dig through the old road | Pay 30 crowns. Hone at a forge here (see 3 boons for one tower, take one). [Not enough crowns] |
| Wait it out | Heal 4 lives. |

**25. The Hermit** (`hermit`)
> An old man lives in a cave lined with maps, most of them of places that no longer exist. He asks
> what you would give up to win.

| Choice | Outcome |
| --- | --- |
| A tower | Remove one blueprint and its boons (no crowns). Two other towers each gain a rare boon (pick 1 of 3 for each). [Need 3 blueprints] |
| Time | See the next act's map and its elites now. |
| Nothing | He nods and gives you tea. Heal 2 lives. |

**26. The Ice Bridge** (`ice_bridge`)
> A bridge of clear ice spans the gorge. Soldiers are frozen inside it, all walking the same way.

| Choice | Outcome |
| --- | --- |
| Cross quickly | 70%: gain 25 crowns from a frozen purse. 30%: the ice cracks; lose 4 lives. |
| Cut one free | Gain a random Frost Spire boon (if you don't own a Frost Spire, its blueprint). Gain the curse Cold Hands. |
| Go around | Lose 1 life. |

**27. The Ember Shrine** (`ember_shrine`)
> A shrine to some fire god, high in the snow, its brazier still lit. The warmth is the first you
> have felt in days.

| Choice | Outcome |
| --- | --- |
| Warm your hands | Heal 6 lives. |
| Feed it a boon | Lose one boon of your choice. Gain a random rare relic. [No boon] |
| Take a coal | Lose 2 lives. Gain the Pyre blueprint (if you own it, a random Pyre boon). |

**28. The Snowed-In Inn** (`snowed_inn`)
> An inn half buried in drift, smoke from the chimney. Inside, veterans of every side play cards and
> pretend not to know each other.

| Choice | Outcome |
| --- | --- |
| Join the game | Bet 40 crowns. 50%: win 100 (+60 net). 50%: lose the 40. [Not enough crowns] |
| Buy a round | Pay 20 crowns. Temper two random boons. [Not enough crowns] |
| Sleep by the fire | Heal 5 lives. |

### Unlocked (renown level 7), any act from act II

**29. The Wandering Merchant** (`wandering_merchant`, weight: one in 12 event rolls)
> A cart pulled by a white ox, with no driver. Everything on it shines oddly, as if lit from inside.

| Choice | Outcome |
| --- | --- |
| Buy the boss relic | A random boss relic you don't own, for 150 crowns and 3 lives. [Not enough crowns] |
| Buy a rare boon | 80 crowns: choose 1 of 3 rare boons for your towers. [Not enough crowns] |
| Leave | Nothing. |

**30. The Ruined Chapel** (`ruined_chapel`)
> A roofless chapel. Snow, or sand, lies in the aisle, but the altar is clean, as if someone still
> tends it.

| Choice | Outcome |
| --- | --- |
| Leave your curses here | Lift all curses. Lose 1 max life per curse lifted. [You have no curse] |
| Take the reliquary | Gain two random relics (common 50, uncommon 35, rare 15). Gain two random curses. |

---

## 11. Economy and nodes

### 11.1 Crowns

| Source | Amount |
| --- | --- |
| Start of run | 30 (+25 with Nest Egg; +60 from the blessing's purse) |
| Battle or bounty, act I / II / III / IV | 12 / 16 / 20 / 24 |
| No lives lost in that battle | +5 |
| Leftover battle gold | 1 crown per 10 / 14 / 18 / 22 gold held when the last enemy dies, by act, max +12 (R17; Ledger: 1 per 5 in every act, max 20) |
| Treasury | +1 per wave that started while a Treasury stood, outside the leftover cap (R11) |
| Elite | 2x the act's battle amount (24 / 32 / 40 / 48), +5 if no lives lost (paid whether or not every elite died) |
| Boss | 40 / 55 / 70 (act IV: the run ends) |
| Treasure | 15-25 (seeded, uniform) |
| Skipping a card | 10 / 14 / 18 / 22 by act |
| Replaced or recast blueprint | 10 per boon lost |
| Supply Lines | +3 per battle |
| Coin Purse | +6 per battle with no lives lost |

### 11.2 Shop

| Slot | Count | Base price (crowns) |
| --- | --- | --- |
| Blueprints (towers you don't own; synergy-weighted) | 2 | common 50, uncommon 75, rare 110 |
| Boons (towers you own; core-weighted) | 3 | common 40, uncommon 60, rare 90 |
| Relics | 2 from the common/uncommon/rare pool (45 / 40 / 15) + 1 shop relic | common 110, uncommon 150, rare 200, shop 130 |
| Sale | one card, marked | half price |
| Mend | once | 40 for 5 lives |
| Lift a curse | once per shop | 60, +20 each time in the run |
| War supplies (11.10) | 2 | common 20, uncommon 28, rare 35 |
| Restock | once | 25 (free with Guild Seal) |

Every price gets a seeded **±10%** roll, then the modifiers, which **add** into one percentage:

| Modifier | Change |
| --- | --- |
| Guild Seal | -20% |
| Supply Lines (Quartermaster) | -15% |
| Hollow Crown | +100% |
| Mirage Market | -50% |

`price = round(base x roll x (1 + sum of modifiers))`, never below 50% of base. Example: a 150
uncommon relic rolled 1.05 with Guild Seal and Supply Lines = 150 x 1.05 x 0.65 = 102 crowns. Toll
(15 crowns) is paid on entering, not a price modifier.

### 11.3 Rewards

| Source | Common | Uncommon | Rare | Notes |
| --- | --- | --- | --- | --- |
| Battle / bounty card | 62 | 33 | 5 + pity | pity +1 per common shown, reset on a rare |
| Elite card | 0 | 75 | 25 + pity | pick 1 of 2 relics (common 45, uncommon 40, rare 15) **only if every elite of the battle died** (R5); always one war supply |
| Boss card | 0 | 0 | 100 | 3 rares; acts I-II: boss relic pick 1 of 3; act III: rare relic pick 1 of 3; heal half of missing lives (A5: a third), rounded up |
| Event ambush card | 40 | 50 | 10 + pity | |
| Slot C relic chance | 4% | | | relic rarity 55 / 35 / 10 |

Slots: **A** a boon for an owned tower (core-weighted); **B** a blueprint or a second boon; **C**
the wild card, any rarity-weighted card from the whole pool, but its boons are only for towers you
own (R6). Slot B blueprint vs boon split by blueprints owned: 3 owned 80/20, 4: 55/45, 5: 35/65, 6:
15/85. **Air in battle 2** (R2): a commander whose war table has no air reach (Archer, Mage, Frost
Spire, Storm Spire, Ballista) gets an unlocked air blueprint from Archer, Mage, Frost Spire or
Storm Spire in slot B of its first reward. **Run 1's first reward** is fixed (R13): Frost Spire,
Bombard and Glass Bones; taking Glass Bones without a Frost Spire puts Frost Spire in slot B of the
next reward.
Core weight for slot A: `1 + 0.75 x boons on the tower` (max 4), +0.5 if built last battle with >= 15%
of its damage. Synergy weight for blueprints: 2.5 if a partner of a tower with 2+ boons, else 1.
Card count: 3, +1 Third Eye, +1 Hollow Crown (max 5; keys 1-5).

### 11.4 Bounty conditions

Meet it: a second pick (75% another card reward, 25% a relic choice of 2 commons).

| Key | Bounty | Condition (HUD line) |
| --- | --- | --- |
| clean_sweep | Clean Sweep | "Lose no lives." |
| few_hands | Few Hands | "Build on at most 5 pads." |
| no_sell | No Sell | "Never sell a tower." |
| quick_march | Quick March | "Call at least 5 waves early." |
| old_ways | Old Ways | "Cast no spell." |
| lean_purse | Lean Purse | "Never hold more than 300 gold." (x gold: 300 / 330 / 360 / 390) |
| single_file | Single File | "Use at most 3 different towers." |
| hold_the_gate | Hold the Gate | "Let nothing reach the last third of the road." |

### 11.5 Forge

Pick one:

| Option | Effect | Numbers |
| --- | --- | --- |
| Hone | Choose a tower; see 3 of its boons, take one | rarity common 40, uncommon 45, rare 15; Bellows: 4 boons |
| Temper | Temper two boons you own | Bellows: 3; Widow's Hammer: each temper also tempers one random other |
| Recast | Replace one blueprint with a tower from 3 offered (unlocked, not owned) | 10 crowns per boon lost; only with 4+ blueprints |

### 11.6 Rest (F6 nodes, the Last Camp)

Pick one:

| Option | Effect | Available |
| --- | --- | --- |
| Rest | Heal 35% of max lives, rounded up (A5: 25%); Field Rations +4 | always (not with Sun Disc) |
| Drill | Temper one boon | always |
| Fortify | +2 max lives (not healed) | always |
| Dig | Find a relic (common 50, uncommon 35, rare 15) | Wayfarer's Spade |
| Pray | Lift one curse | Votive Candle |
| Scout | See the next act's map now and choose your F1 start lane | perk Scout (level 11) |

### 11.7 Treasure

One relic (common 55, uncommon 35, rare 10), 15-25 crowns and one war supply.

### 11.8 ? nodes

| Outcome | Base chance | Pity |
| --- | --- | --- |
| Event | 75% | |
| Ambush battle (card reward has one uncommon or better) | 10% | +10 points per ? that wasn't a battle; resets on a battle |
| Shop | 8% | +3 points per ? that wasn't a shop (Merchant's Bell: x3) |
| Treasure | 7% | +2 points per ? that wasn't a treasure |

Chances renormalise to 100% after pity.

### 11.9 Lives

Start 20 / 20 (Warden 26; A4 16 / 20; Thick Walls and Thicker Walls +2 max each; the blessing's +8
max). Leaks cost 1 / 2 / 3 / 10 as section 4.1; a boss that gets through costs 10 and comes round
again (R1). Gains: Rest 35% of max; boss kill half of missing (rounded up); Mend 5 for 40 crowns;
Lifeblood 2; Old Standard 1 after a battle with 0-1 lost; Fortify +2 max.

### 11.10 War supplies (R20)

Two consumable slots on the war table, used in battle with **E** and **D** (any time, Setup and
pause included; aimed ones aim like spells). One use each; the slot empties. Sources: one in every
elite reward, two in every shop, one in every treasure, some events, the blessing. Random draws are
common 50 / uncommon 35 / rare 15. With both slots full, a new supply asks which to keep. Damage is
x act; flyers take half from the circle ones, like spells (R2).

| Key | Supply | Rarity | Price | Aim | Effect | Flavour |
| --- | --- | --- | --- | --- | --- | --- |
| oil-barrel | Oil Barrel | common | 20 | circle r 1.2 | an oil puddle r 1.2 for 8 s: 25% slow and Oiled inside; fire lights it like any puddle | "Roll it, crack it, step back." |
| gold-cache | Gold Cache | common | 20 | instant | +60 gold (x gold) | "Buried by someone who meant to come back." |
| spike-trap | Spike Trap | common | 20 | path point | the next 8 ground enemies to pass the point take 60 physical (x act) each | "Mind the road." |
| lifeblood | Lifeblood | common | 20 | instant | heal 2 lives (not above max) | "Drink it before the fighting, not after." |
| frost-flask | Frost Flask | uncommon | 28 | circle r 1.5 | every enemy inside is Frozen 2 s (ignores freezeAt; respects Thawing and the hard-CC immunity; elites and bosses Numb 2 s); flyers too | "Winter, corked." |
| war-horn | War Horn | uncommon | 28 | instant | all towers and soldiers +30% attack speed for 8 s (`aspd`, adds with Rally; the cap holds) | "One long note, and every arm moves faster." |
| masons-kit | Mason's Kit | uncommon | 28 | instant | ends every disable on your towers at once (sappers, stomps, breath, Erupt, Vengeful) | "Hammer, wedge, and a stubborn man." |
| flare | Flare | uncommon | 28 | instant | every stealthed enemy is Revealed for 10 s | "Red light, and nowhere to hide." |
| heavy-bolt | Heavy Bolt | rare | 35 | auto: the enemy with the most HP | 300 pure (x act) | "Saved for the one that matters." |
| bell | Bell | rare | 35 | instant | stuns every enemy for 1.5 s (bosses 0.4 s; respects the hard-CC immunity; interrupts channels) | "Everyone stops to look. Everyone." |

### 11.11 The blessing (R23)

Every run starts with a pick of 3 blessings drawn (seeded) from these 6. Run 1's three are fixed:
A relic (Lucky Horseshoe), Strong Walls, A Full Purse. After a commander's first win, its next run's
blessing shows a fourth card: choose 1 of 3 rare relics (R27).

| Blessing | Effect |
| --- | --- |
| A Relic | a random common relic from the pool, named on the card |
| A Fourth Tower | a random unlocked blueprint you don't start with, named on the card (key 4) |
| Trade a Tower | give up one starting blueprint (your choice); choose a rare boon for one of the other two (pick 1 of 3) |
| Strong Walls | +8 max lives, healed |
| A Full Purse | +60 crowns |
| Supplies | two random war supplies, named on the card |

---

## 12. Ascensions

**Per commander** (R26): each commander climbs its own 1-10. A commander's first win unlocks its
Ascension 1, and a win at n unlocks n+1 for that commander. Each level adds one rule and keeps all
lower ones. Renown is multiplied by `1 + 0.1 x ascension`.

| A | Name | Rule (exact) | Card line |
| --- | --- | --- | --- |
| 1 | Hard Roads | Each act map gets 1 more elite node (acts II-III max 5, act I max 3); every path from F1 to a shop passes an elite (the elite-free path still exists, without a shop). | "Shopping costs a fight." |
| 2 | Lean Coffers | Interest cap -50% (adds with Abacus +100%: cap x (1 + sum)). | "Banking pays less." |
| 3 | Veteran Foes | One wave per battle (from wave 3, never the last) carries an affix for all its enemies: Hasted, Plated, Runed or Many (4.4, 6.6). Shown on the skull. | "Read the skull." |
| 4 | Wounded | Start with 16 / 20 lives (Warden 22 / 26). | "You start hurt." |
| 5 | Short Rest | Rest heals 25% of max lives; a boss heals a third of missing lives. | "Rest is shorter." |
| 6 | Seasoned Elites | Every elite carries at least 2 affixes, from act I (4.4). | "Elites come prepared." |
| 7 | Rubble | One pad per map (a prime pad, seeded) is rubble until you pay 60 gold to clear it. | "Clear the ground first." |
| 8 | Ill Omen | Start the run with the curse Doubt. | "No time to set up." |
| 9 | Swift Tides | The countdown between waves is 20% shorter (10 s -> 8 s, 9 s -> 7.2 s); the call-early bonus is halved. | "Less time between waves." |
| 10 | The Tyrant's Guard | Act IV's Last Camp becomes a battle against a champion of an earlier boss you did not meet (5.9), and the champion and the Tyrant carry their Fury (5.8); the Tyrant comes straight after. | "A second boss, no camp between." |

---

## 13. Meta progression

### 13.1 Renown

| Source | Renown |
| --- | --- |
| Each floor cleared (any node) | 2 |
| Each elite defeated | 6 |
| Each act boss defeated | 15 |
| Final boss defeated | 30 |
| Each bounty met | 2 |
| No lives lost in act I | 5 |
| First time meeting each boss | 10 (once each) |
| First win with each commander | 20 (once each) |

Total x `(1 + 0.1 x ascension)`, rounded half up. Seeded runs give renown but don't unlock ascensions.

### 13.2 Unlock track

| Level | Total renown | Unlock | Kind |
| --- | --- | --- | --- |
| 1 | 25 | Alchemist | tower |
| 2 | 60 | Black Ice, Long Fuse, Wildfire Crown | relics |
| 3 | 100 | Thick Walls | perk |
| 4 | 150 | The Alchemist | commander |
| 5 | 210 | Storm Spire | tower |
| 6 | 280 | The Warden (brings Thornwood Grove) | commander (R27) |
| 7 | 360 | The Wandering Merchant, the Ruined Chapel | events |
| 8 | 450 | Second Look | perk |
| 9 | 550 | Beacon | tower |
| 10 | 660 | Prism Lens, Twin Crests, Storm Glass, Deadeye's Oath | relics |
| 11 | 780 | Scout | perk |
| 12 | 910 | War Banner | tower |
| 13 | 1050 | The Quartermaster | commander |
| 14 | 1200 | Ballista | tower |
| 15 | 1360 | Old Oak Seed, Cold Iron, Seven Bells, Crowded Banners, Overclock | relics |
| 16 | 1530 | Strike Off | perk |
| 17 | 1710 | Nest Egg | perk |
| 18 | 1900 | Tidewater Vial, Pact of Embers, Bellows, Dragonglass | relics |
| 19 | 2100 | Thicker Walls | perk |
| 20 | 2310 | The title "Warden of the Ramparts" | completion |

Milestones (not on the track): **Seer** (and Beacon) on reaching act III; **Ascension 1 for a
commander** on its first win, **Ascension n+1** on a win at n with that commander (R26); a commander's
first win also adds a rare-relic card to its next blessing (R27). When the track reaches something
already unlocked, that level unlocks the next item on the track instead.

Start: towers Archer, Barracks, Mage, Bombard, Frost Spire, Pyre; commander Marshal; 29 of the 45
pool relics (all 10 commons; 7 of 10 uncommons; The Ninth Pad and Phoenix Feather of the rares; 5 of 9
boss relics; 5 of 6 shop relics); 28 events.

### 13.3 Perks

Can be turned off in run setup.

| Key | Perk | Effect | Line |
| --- | --- | --- | --- |
| thick_walls | Thick Walls | +2 max lives | "Stone on stone." |
| second_look | Second Look | One card reroll per act (replaces all cards and re-rolls the slots) | "Let me see that again." |
| scout | Scout | Rest option: see the next act's map now and choose your F1 start lane | "Send a rider ahead." |
| strike_off | Strike Off | One banish per act: cross a card off for the rest of the run (a banished blueprint leaves shops too) | "Not that one. Never that one." |
| nest_egg | Nest Egg | +25 starting crowns | "Put a little aside." |
| thicker_walls | Thicker Walls | +2 max lives | "And another course of stone." |

### 13.4 The Daily Siege (later, R34)

Not in v1. Kept for when it ships: one seed a day, a fixed commander and one modifier from each
column, perks off, score `10 x floors cleared + 50 x bosses + 2 x max(0, 45 - minutes)`.

| Kind | Modifier | Rule |
| --- | --- | --- |
| kind | Veterans | Every tower is built at L2. |
| kind | Rich Roads | +100 start gold every battle. |
| kind | Open Hands | Card rewards show 4 cards. |
| kind | Long Nights | Rest heals 50%. |
| hard | No Shops | Shop nodes become battles. |
| hard | Double Elites | Elite nodes have two elites per elite slot. |
| hard | Bounty Board | Every battle is a bounty; failing one costs 2 lives. |
| hard | Thin Walls | Start with 12 / 20 lives. |

---

## 14. Glossary of player-facing words

Every screen uses these words and no others. Left: the code term. Middle: what the UI says. Right:
the one-line tooltip or codex line.

### 14.1 Run and battle

| Code term | UI word | Line |
| --- | --- | --- |
| lives | **Lives** | "Lost when enemies reach your gate. At zero the run ends." |
| gold | **Gold** | "Spent on towers in this battle. Gone when it ends." |
| crowns | **Crowns** | "Kept all run. Spent at shops and some events." |
| renown | **Renown** | "Earned every run. Unlocks new towers, commanders and more." |
| interest | **Interest** | "Each wave, 5% of the gold you hold, up to a cap." |
| wave income | **Wave pay** | "A little gold at the start of every wave." |
| call early | **Call early** | "Start the next wave now for bonus gold." |
| leak | **Got through** (verb: "got through"; never "leak") | "An enemy reached your gate and cost lives." |
| setup | **Setup** | "Build before the first wave. Selling refunds everything." |
| war table | **War table** | "Your towers, boons, relics and curses for this run." |
| blueprint | **Tower card** (on rewards: "New tower") | "Adds a tower to your war table, on the next free key." |
| boon | **Boon** | "Makes one of your towers better for the rest of the run." |
| tempered | **Tempered (+)** | "A stronger version of a boon." |
| keystone | **Keystone** (rare boons) | "A rare boon that changes how a tower works." |
| relic | **Relic** | "A lasting effect for the whole run." |
| curse | **Curse** | "A lasting problem until you lift it." |
| pad | **Build spot** | "Where a tower can stand." |
| specialisation | **Specialise** / the spec's name | "Choose one of two final forms." |
| rally point | **Rally point** | "Where soldiers stand guard." |
| battle roster | **Who's coming** | "Every enemy this battle will send." |
| skull | **Next wave** | "What comes next, and the bonus for calling it now." |
| elite | **Elite** | "A champion with special traits. Costs 3 lives if it gets through." |
| boss | **Boss** | "Costs 10 lives each time it gets through, then comes round again, faster." |
| boss lap | **Lap** (on the boss bar) | "How many times the boss has come round." |
| floor | **Floor** | "One step along the act map." |
| act | **Act** | "Act I: The Meadow" style titles. |
| ascension | **Ascension** | "One more rule against you. Win to unlock the next." |
| node types | **Battle, Bounty, Elite, Boss, ?, Shop, Forge, Camp (rest), Treasure** | the node tooltips in run-meta.md 2 |
| rest options | **Rest, Drill, Fortify, Dig, Pray, Scout** | section 11.6 |
| forge options | **Hone, Temper, Recast** | section 11.5 |
| skip | **Skip** (shows the crowns) | "Take crowns instead of a card." |
| war supply | **Supply** (keys E, D) | "Used once in battle, then gone." |
| blessing | **Blessing** | "A gift to start the run. Pick one." |
| battle theme | the theme's name ("Raiders") | "Who leads this battle, and what they bring." |
| high ground | **High ground** | "A raised build spot. Towers here reach 15% further." |
| rubble | **Rubble** | "Clear it for 60 gold before you can build here." |
| ghost layout | **Last layout** ("Enter: rebuild") | "Your last battle's towers, rebuilt on matching spots." |

### 14.2 Tower stats

| Code term | UI word | Line |
| --- | --- | --- |
| damage | **Damage** | "Per hit." |
| attack interval | **Attack speed**, shown as "every 0.7 s" | "Time between attacks." |
| aspd bonus | **Attack speed +N%** | "Attacks more often." |
| range | **Range** | "How far it reaches." |
| splash radius | **Blast** | "Hits everything near the impact." |
| reach (air/ground) | **Hits air** / **Ground only** | "Ground-only towers can't hit flyers." |
| target mode | **Target: First / Strongest / Last** | "First: closest to your gate. Strongest: most health. Last: furthest back." |
| crit | **Critical hit** (chance %, x multiplier) | "Sometimes hits much harder." |
| pierce | **Pierce N%** | "Ignores part of the armour." |
| chains | **Jumps** | "Leaps to nearby enemies, weaker each jump." |
| aura | **Aura** | "Affects everything around it." |
| disabled | **Disabled** | "Can't attack for a moment." |
| level | **I, II, III** | |

### 14.3 Damage types and defences

| Code term | UI word | Colour | Line |
| --- | --- | --- | --- |
| physical | **Physical** | white | "Blocked by armour." |
| magic | **Magic** | violet | "Blocked by wards." |
| fire | **Fire** | orange | "Ignores armour and wards. Only fireproof foes resist it." |
| pure | **Pure** | gold | "Nothing blocks it." |
| armour | **Armour** (light, medium, heavy) | | "Cuts physical damage by 25, 45 or 65%." |
| ward | **Ward** (light, medium, heavy) | | "Cuts magic damage by 25, 45 or 65%." |
| fireproof | **Fireproof** | | "Cuts fire damage." |

### 14.4 Statuses (enemy)

| Code term | UI word | Line |
| --- | --- | --- |
| slow | **Slowed** | "Moves slower. Slows don't add up: the strongest counts." |
| chill | **Chilled** | "Slowed by cold. Enough cold freezes it." |
| frozen | **Frozen** | "Can't move or fight." |
| thawing | **Thawing** | "Just unfroze. Can't be chilled for a moment." |
| numb | **Numb** | "Too big to freeze. Slowed instead." |
| burn | **Burning** | "Takes fire damage over time." |
| oiled | **Oiled** | "Fire will make it burst into flame." |
| marked | **Marked** | "Takes more damage and is easier to crit." |
| hexed | **Hexed** | "Takes more damage from everything. Can't be healed." |
| brittle | **Brittle** | "Frozen and fragile. Takes more physical damage, shatters on death." |
| shred | **Cracked armour** | "Armour lowered for a while." |
| corrode | **Worn ward** | "Ward lowered for a while." |
| stun | **Stunned** | "Can't move, fight or cast." |
| root | **Rooted** | "Can't move, but still fights." |
| revealed | **Revealed** | "A hidden enemy that towers can now see." |
| stealth | **Hidden** | "Towers can't aim at it until it is revealed." |
| shield | **Shielded** | "Extra health that breaks first. Lightning breaks it fast." |
| pulled | **Pulled back** | |
| grounded | **Grounded** | "A flyer forced down. Ground towers and soldiers can reach it." |
| held | **Held** | "Stopped by a soldier." |
| baited | **Baited** | "Takes more from blasts, flames and puddles." |
| scorched | **Scorched** | "Takes a little more damage from everything." |
| immunity window | (pale flash, no word) | codex: "Right after a freeze, stun, root or pull, none of them can happen again for a moment." |

Rules the codex states in these exact words: "Fire and ice cancel." "Same effect twice: the strongest
counts." "Different effects add up." "Soldiers stop one enemy each." "Flyers ignore soldiers."

---

## 15. Reconciliations

Every place this file departs from, or decides for, `systems.md`, `run-meta.md` or `art.md`. All
of them are now applied in those chapters too. Rows a Revision 1 ruling later changed say so in their
"Now" cell; section 16 lists every Revision 1 change.

### Towers (tuning to the power curve and the 0.6x-1.5x band, section 2.14)

| # | What | Was | Now | Why |
| --- | --- | --- | --- | --- |
| 1 | Volley | 3 arrows x 14, repeating on one target; Rain 8 x 15 | 3 x 9, spare arrows at half damage; Rain 8 x 12, max 3 per enemy | full repeats made the swarm spec out-damage Marksmen on one target (110 vs 59 dps); now 44 vs 52 |
| 2 | Marksmen | 50 dmg / 1.1 s | 46 / 1.15 s | 1.58x its class median; now 1.39x |
| 3 | Blademasters | 24 / 0.8 s | 16 / 0.8 s | 90 melee dps at 430 gold broke "soldier damage stays modest" |
| 4 | Mage L2 / L3 | 40 / 62 | 38 / 54 | systems' numbers ran 1.79x / 2.98x of L1 against the 1.65 / 2.5 curve; Mage is a named dominance risk |
| 5 | Arcanist | 90 dmg, 3 jumps, Burst 60 | 70 dmg, 2 jumps, Burst 50 | ~190 group dps was 2x every other spec |
| 6 | Bombard L2 / L3 | 48 / 76, r 1.0 | 44 / 66, r 1.0 / 1.1 / 1.2 | on-curve damage; a growing blast keeps the splash tower ahead of chains at L3 |
| 7 | Mortar | 150, 3.0 s | 120, 3.2 s | 1.6x area median with its back-pad coverage |
| 8 | Shrapnel | 70, bomblets 25 | 56, bomblets 18 | same; shred is its value |
| 9 | Naphtha | explosion 120, patch 5 s x 30, firebomb every 3rd | 90, 4 s x 25, every 4th | flat ignite on top made it ~1.8x in act I |
| 10 | Pyre | cone 12 / 19 / 30 | 10 / 16 / 25 | unresisted area was 2.07x raw at L1 |
| 11 | Inferno | cone 50 | 36 | Heat x2.2 already makes it the boss melter |
| 12 | Firestorm | 60 + burn 15, ground 20 | 40 + burn 10, ground 15; **keeps air**, at 50% to flyers (R12) | lead's open question: air stays (the brief lists it), the damage paid for it |
| 13 | Storm | 48 / 72, -20% per jump; Tempest 80; Overload 110 | 44 / 62, -25%; Tempest 64; Overload 84 | L3 chains were 1.9x the area median |
| 14 | Ballista | 55 / 88 / 135; Harpoon 140; Siege 180 / 3.0 s | 50 / 80 / 115; Harpoon 170; Siege 130 / 3.2 s | long range already buys 1.4-1.6x coverage; Harpoon was below L3 (no spec power) |
| 15 | Thornwood L2 / L3 | 9 / 14 dps | 10 / 15 | on-curve (1.67 / 2.5) |
| 16 | Paladins regen | "15 HP/s out of combat" | 15% max HP/s out of combat | the general rule is a percentage; 15 flat was less than the base 10% |
| 17 | Target modes | art: four (first / last / strongest / closest) | three: First, Strongest, Last | systems 6.1 is the mechanic; T cycles three |
| 18 | Tower unlock rarity | not set | blueprints: common 4, uncommon 5, rare 3 (2.1) | shop prices and reward rolls need it |

### Enemies, waves and bosses

| # | What | Was | Now | Why |
| --- | --- | --- | --- | --- |
| 19 | Splitter family | 130 / 45 / 15 | 110 / 40 / 12 | 1.6x the pressure median per threat; now 1.33x |
| 20 | Bat threat | 0.5 | 0.6 (bounty unchanged, 3) | the shorter air route made bats the hardest threat point |
| 21 | Small-body caps | none | swarmlings and bats max 20 / 28 / 36 / 36 per wave | a 1.2x act I Swarm wave filled to 40+ swarmlings |
| 22 | Battle tier by floor | "proposal, systems", open | floor factor 0.90-1.10 (section 1) | averages 1.0, so systems' battle totals still hold |
| 23 | Act I unlocks | by wave only | also by floor: F1 no bats, no shieldbearer, no shaman, no Swarm archetype; F2 adds bats and shieldbearers; F3 shamans | one new thing at a time for the first battle with the Marshal's three towers |
| 24 | Act II new roles | "+ splitter, shade, sapper, drake" | by floor (6.2) | same reason |
| 25 | Grand assault | three archetypes at 40% each | one third each | 120% on top of the 1.3 last-wave shape double-counted the climax |
| 26 | Last wave | Grand assault "from last wave" | always Grand assault (normal and elite battles) | a fixed finale reads well; boss battles end on the boss wave instead |
| 27 | Elites in act III-IV battles | "at most once" | 30% on F4-F5 and the Ash Road, shown on the node | a number the generator can use; no hidden surprise |
| 28 | Melee vs soldiers | not scaled | x act | soldiers keep fixed stats; unscaled act IV melee would make blocking free |
| 29 | Boss chill meter | "full meter gives Numb", no value | Gorrak 400, Wyrm 500, Colossus 800 (R15, was immune), Tyrant 600; Hive Queen 400, Lich 500, Pack-Lord 600 | needed to implement Numb |
| 30 | Boss bounty | not set | none | the battle ends; gold has no use after |
| 31 | Gorrak phase 3 | lists Charge only | War Cry continues; Muster stops | keeps phase 3 a race, not a flood |
| 32 | Colossus phase 3 | Ice Armour not mentioned | Ice Armour keeps regrowing | Storm/Pyre stay useful to the end |
| 33 | Tyrant phase 2 | breath not mentioned | breathes while walking | phase 2 should keep the tower-spreading lesson |
| 34 | Boss telegraph sizes | art: war cry ring 6 u, stomp ring 5 u, 1200 ms windups, a "fire dive" | systems: war cry r 3.0, stomp r 2.4, >= 1.5 s, Flame Breath (art redrawn) | the decal must match the mechanic |
| 35 | Warlock summons | art: swarmlings rise | Risen (footman x0.7), systems 9.2 (art fixed) | the mechanic doc owns it; Matron is the swarmling birther |
| 36 | Ice shards, Sandlings (were "Jellies"), Ember adds | partly specified | full stats in 5.x | needed for the sim |
| 37 | Thorn Collar | 8 pure / s | 10 physical / s (x act) | systems 4.1 keeps pure to shatter and Judgement; flat damage needs act scaling |

### Boons and relics

| # | What | Was | Now | Why |
| --- | --- | --- | --- | --- |
| 38 | Frost keystone "Brittle" | +40% physical on frozen, "stacks with Shatter" | **Glass Bones**: gives Shatter's Brittle (+50%) to any freeze; Shatter bursts 35% | same status from two sources must not stack (systems 4.4); the old name was the status's name |
| 39 | Storm common "Conductor" | name | **Copper Wire** | "Conductor" is a named synergy |
| 40 | Banner keystone "Muster" | name | **Field Forge** (R16 reworked it: banners stack) | "Muster" is Gorrak's ability |
| 41 | Barracks "Shield wall: held enemies lose their armour" | full armour removal | each soldier hit adds 1 shred | removing 65 armour outright beat every shred source; shred is bounded and visible |
| 42 | Pyre uncommon "flames pass through soldiers" | | **Backdraft**: +25% vs held | Pyre never hurt soldiers, so the example did nothing |
| 43 | Beacon keystone Hunter's Moon | "marked take crits from every tower" | crits vs marked at least x2.5 and +10% crit chance | every tower already crits marked enemies (+20%) |
| 44 | Heartwood Bond | soldiers can't die while the Grove stands | fall to 1 HP, untouchable 3 s, once per life | an unkillable blocker holds forever; that is a lock, not a boon |
| 45 | Archer Barbed Tips | +1 damage | +2 | +1 was 6% at L3: a dead pick |
| 46 | Trophy | +1 crown | +3 | +1 was a dead pick |
| 47 | Universal boon rarities | not set | 4 common, 3 uncommon (after R16 cut three) | |
| 48 | Storm Glass | "double damage" vs chilled | +60% (`dealt`) | x2 would multiply against the stacking rule; +60% with Conductive is x1.9 |
| 49 | Spare Planks | free first tower | free up to 100 gold | run-meta's lever, set to cover any L1 except Bombard/Storm |
| 50 | Echo Stone | cast twice | the echo is at 60%, damage spells only; a non-damage spell gets 50% of its cooldown back (R16) | run-meta's lever vs Sun Disc spam |
| 51 | Black Ice / Cold Iron | both offered | exclude each other | run-meta's lever 3; frost had four stacking pieces |
| 52 | Snowglobe | "walks in chilled" | chill at 80%, fades after 6 s | an exact rule |
| 53 | Glass Arrows, Cinder Rain, Thorn Collar | flat damage | x act | otherwise dead by act III |
| 54 | Hollow Crown + Third Eye | not covered | they add: max 5 cards | |
| 55 | Shop price modifiers | each stated alone | add into one %, floor 50% of base | Hollow Crown with Guild Seal would otherwise depend on order |
| 56 | Interest cap modifiers | each stated alone | add into one % (Abacus +100, A2 -50; Gilded Ledger cut in R16) | same |

### Run, events, meta

| # | What | Was | Now | Why |
| --- | --- | --- | --- | --- |
| 57 | Selling | systems: 70% any time after Setup; run-meta: none in the final wave (proposal) | no selling once the last wave has started | run-meta's reason (leftover-gold conversion) holds; systems listed it as its to confirm |
| 58 | Doubt | "first wave starts 5 s early" | Setup is timed: wave 1 starts after 20 s | Setup is untimed, so "5 s early" had nothing to be early against |
| 59 | Haunted | "a shade every third wave" | waves 3, 6, 9; outside the budget; 0 bounty | exact, and no farming |
| 60 | Marshal spells | art: "Rally the guard", "Arrow rain" | Reinforcements, Meteor (art renamed) | run-meta and systems agree |
| 61 | Commanders | art: four | five (Warden; art has his glyph) | run-meta adds him |
| 62 | Bees, locked Thornwood | not covered | two random boons instead | no locked content leaks through events |
| 63 | Deep Roots mark | "revealed and marked" | marked at +10% taken, 5 s | needed a value; below a Beacon's on purpose |
| 64 | Deserter blueprint | "random you don't own" | from unlocked towers only | same as 62 |
| 65 | Quartermaster + Treasury | open | allowed (lead); Ledger keeps 5:1 and its 20 cap. R11 reworked both: Treasury pays +1 crown a wave outside the cap, Requisition buys a level at half price instead of gold | the cap bounds the gold loop; Treasury's crowns are bounded by the wave count (7-10) |
| 66 | Skip crowns, act IV | not given | 22 | the 10 / 14 / 18 pattern |
| 67 | Daily Siege | modifiers named by example | 8 exact modifiers and a score; the siege itself is later (R34) | needed to build it |
| 68 | Title at level 20 | "a title" | "Warden of the Ramparts" | |

---

## 16. Revision 1 changes

What the sweep to DESIGN.md's Revision 1 (R1-R34) changed, one line per change.

### content.md
- R1: bosses loop on a leak (10 lives, +20% speed per lap, battle ends when the boss dies, the rest flee); leak modifiers and Phoenix Feather skip boss and elite leaks (5, 8, 11.9, 14).
- R2: act I bats max 10 on floors 2-3; circle spells and supplies hit flyers at 50%; an air blueprint in the first reward of a commander with no air (4.2, 6.1, 7.2, 11.3).
- R3: one `cost` pool per purchase, floor -50%; Veteran and Siege Engine build L2 for L1 + half L2, Overseer -40% on L3; free purchases are not pool entries (0.1, 2.1, 3.13, 8.4).
- R4 / R25 / A7: pad 1.6 u, base 1.4 u, high ground +15% range, rubble 60 gold; the DPS model moved to 1.3 u, medians and ratios recomputed, Treant slam 45 -> 50 to stay in band (2.1, 2.13, 2.14).
- R5 / R6: elite relic only if every elite died; wild-slot boons only for owned towers (4.4, 11.3).
- R7 / R8 / R9 / R10: Tyrant lands within 6 u of take-off; lobbed shots predict along the current heading; one 1 s hard-CC immunity; summons pay nothing after the last wave has spawned (2.1, 4.1, 4.2, 5.4, 14.4).
- R11: Treasury spec 160 (1.8c), +25% bounty and +1 crown a wave; Requisition buys a level at half price, 30 s; Rally 8 s / 40 s; Requisition row dropped from the by-act table (2.11, 7.2, 11.1).
- R12: Shrapnel shred cap 10, Firestorm 50% to flyers, a Hexer's hex lifts the taken cap to +150%, Paladins hold 2 only above 50% HP (0.1, 2.3-2.8).
- R13: waves 7 / 8 / 9 / 9 (elite +1, boss 7 + boss, act IV 8 + boss), run 1's first battle 6 waves and 320 gold, fixed first reward, ghost layout; threat totals table added (1, 2.1, 6.1, 11.3).
- R13 / P1-20: worked waves regenerated by script from the fill rules and the unlock table (no early shieldbearers or shamans), with real spawn times and interleaved Grand assaults; run 1's tutorial battle added (6.5).
- R14: curse numbers (Debt 10, Leaking Roof every leak max +3, Cold Hands +50% cost, Dread 15%, Toll 15) (9).
- R15: act IV fireproof 25% (Tyrant 30%, adds 25%), act 4 fire column recomputed, Colossus Numbs at 800, Dragonglass added (1, 4.1, 4.5, 5.3, 5.4, 8.3).
- R16: Last Stand, Sapper-proof, Bounty, War Tax, Gilded Ledger and Hexed Candle cut; Royal Mint, Snowglobe, War Chest, Field Forge, Echo Stone, Glass Arrows, Crossroads, Avalanche and Mirage Market reworked (3, 8, 10).
- R17 / R18: leftover gold 1 crown per 10 / 14 / 18 / 22 gold by act; the 5th and 6th blueprint each +5% on L1 costs (2.1, 11.1).
- R19: six cap-lifters named in 0.1; Endless Winter (Frost rare), Deadeye's Oath and Wildfire Crown (rare relics), Overclock (boss relic) added; Shatter chains capped at 4 links so Endless Winter has a cap to lift (2.6, 3.5, 8.3, 8.4).
- R20: ten war supplies with rarity, price, aim, effect and flavour; shops, elites, treasure, events and the blessing give them (11.2, 11.7, 11.10).
- R21: the Hive Queen, the Lich and the Pack-Lord with full phase tables, lines and escorts; Fury moved to ascension 10 and written for all seven; the champion is a boss the run did not meet (1, 5.5-5.9).
- R22: 12 new events (2 any act, 4 act I, 3 act II, 3 act III) to 30, numbering redone, unlocks at level 7 (10).
- R23 / R24: the blessing (6 options, run 1 fixed); 20 named battle themes, 5 per act, x3 weight (6.7, 11.11).
- R26 / R27: ascensions per commander; A6 Seasoned Elites, A7 Rubble; Warden at level 6, events at 7 and the track shifted (Beacon 9, Banner 12, Quartermaster 13, Ballista 14), Seer starts with Archer; relic unlock levels and the starting pool (29 of 45) redone (7.1, 12, 13.2).
- R32: one name per role, act names dropped for an act look note; one affix list for elites and A3 waves (4.3, 4.4, 6.6).
- R34: Daily Siege marked later; twin lanes dropped from Two fronts; tempered default +50%; perks no longer mention the siege (6.3, 13.4).
- P2-13 and sweeps: boon count 91 (7 universal), relic count 45; glossary words for supplies, blessing, theme, high ground, rubble, ghost layout, lap; Crowded Banners reach 2.6 -> 2.8 u to match R4's cluster radius; reconciliation rows updated where a ruling changed them (14, 15).

### systems.md
- Numbers synced to content.md (Mage, Arcanist, Bombard, Mortar, Shrapnel, Naphtha, Pyre, Inferno, Firestorm, Storm, Tempest, Overload, Ballista, Harpoon, Siege Bolt, Thornwood, Treant, Paladins, Blademasters, Volley, Marksmen, splitter family, bat threat).
- Waves 7 / 8 / 9 / 9 with the threat table, pacing and gold expectations redone; floor factor in T(w); run 1 tutorial battle (R13).
- Boss leak loop, summons' gold, leak-modifier exclusions (R1, R10); selling disabled in the last wave and X twice (R28).
- Hard-CC immunity (R9), lobbed prediction (R8), flyers at 50% from circle spells and supplies (R2), Firestorm 50% to air (R12).
- Stacking table with every cap-lifter, the cost pool and high ground (R3, R19, R25); Hexer's +150% cap and Shrapnel's shred cap (R12).
- Unlocks by floor, themes, Grand assault one third, Two fronts without twin lanes, the next-wave strip with heart pips (R24, R29, R34).
- Elites: 30% chance in act III-IV battles, one affix list, A6, relic only if all died (R5, R26, R32).
- Seven bosses: Colossus Numbs at 800, Tyrant fireproof 30% and landing within 6 u, Sandlings, plus the Hive Queen, Lich and Pack-Lord (R7, R15, R21).
- Pads 1.6 u, >= 1.3 u from the path, >= 2.0 u apart, clusters 2.8 u, high ground and rubble; twin lanes later (R4, R25, R26, R34).
- Requisition and Rally reworked, Echo Stone rule, war supplies section, `supply_used` and `boss_lap` events, new commands; the open questions for the lead marked settled (R11, R16, R20).

### run-meta.md
- Alternate bosses on the run-at-a-glance and boss node; war table carries supplies; ghost layout; whole act visible in 2D with Z zoom (R13, R20, R21, R31).
- Act I F2 forge weight 0 (P2-13); themes on battle nodes; floor factor replaces the proposal (R24).
- Time budget redone with 7-9 waves and 30 s setup per battle: ~42 min (R13).
- Elite reward (supply; relic only if all elites died), boss loop, shop supplies and restock, treasure supply, Lean Purse by act (R1, R5, R20).
- Blessing section; boon table rewritten to content.md's names (91 boons, 7 universal); slot C owned towers only; air blueprint for no-air commanders; run 1's fixed reward; R18 surcharge; skip 22 in act IV (R6, R2, R13, R16, R18, R23).
- Economy: leftover rate by act, Treasury crowns, war supplies, exact leak table, new greed decisions (R11, R17, R20).
- Relics rewritten to the 45-relic pool with cuts, reworks, four new relics and the cap-lifter rule in the watch list (R15, R16, R19).
- Events: 30 listed in one table with curses at R14 numbers; full text left to content.md (R14, R22).
- Commanders: Seer starts with Archer, Warden at level 6, Requisition and Rally, per-commander ascensions (R11, R26, R27).
- Unlock track, milestones and starting pool redone; A6 and A7 replaced; codex gold borders, run-history path replay and the Daily Siege marked later; seeds without the daily score (R26, R27, R34).
- First run: fixed blessing, 6-wave first battle, fixed first reward, ghost layout; bot table adds supplies and the blessing; keys Z / V / Tab / M (R13, R23, R28).

### art.md
- Content.md 15's reconciliations applied: Marshal's spells are Reinforcements and Meteor, five commanders (Warden glyph), three target modes, warlocks raise Risen, war cry r 3.0 / stomp r 2.4, every telegraph >= 1.5 s, no Tyrant fire dive (Flame Breath and Takes Wing), Volley fires 3 arrows plus Arrow Rain, the shop has no "remove a boon", a bounty node icon.
- Projectile speed column deleted; speeds come only from content.md (R33); a Firestorm row added; Shrapnel and Arcanist rows corrected.
- Boss table rewritten to the mechanics' radii and times, with the Hive Queen, Lich and Pack-Lord, boss glyphs and the lap look (R1, R21).
- War supplies: glyphs and in-world looks, HUD slots E and D (R20).
- Pads 1.6 u, tower base 1.4 u; high-ground, rubble and ghost-layout pad states (R4, R13, R25).
- HUD top band holds the skull, the 6-icon strip with heart pips, the bounty chip and the boss bar (R29); radial specs via U, sell on a second press, Esc order, Alt ranges (R28).
- Cards 116 px when 5 show, body <= 80 characters with the full text in a tooltip, art windows are SVG glyphs; relic, event, curse and spell glyph sets (R30, R34).
- Run map is a 2D painted act map on the walnut table, all of it on screen, with theme labels and the bounty token (R24, R31).
- Camera breathing off below 900 px width (R33); one enemy name per role with act trims (R32); event glyph vignettes, blessing screen, shop supplies row, hard-CC immunity flash, Treasury crown chip, juice rows for supplies, laps, rubble and the ghost layout.

