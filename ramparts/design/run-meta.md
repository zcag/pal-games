# Ramparts: the run and the meta

Owner: run and meta designer. Scope: everything between and around battles. The act maps,
the nodes, the draft, the economy that crosses battles, relics, events, curses, commanders,
renown and unlocks, ascensions, the codex, and the hooks that make "one more run" happen.

Battle rules (tower stats, statuses, enemies, in-battle gold and interest numbers, leak costs)
belong to the systems designer. Where this file needs a battle number it says so and gives a
proposal marked **(proposal, systems)**. Every number here is a first pass for the content
writer and the balance bot, not a final value; what is final is the *shape*: which choices exist
and what they trade against. The proposals are now settled: `content.md` holds the final numbers,
and DESIGN.md's Revision 1 rulings (R1-R34) are applied here.

## Pillars

1. **A build you chose, around two or three towers.** You start with three blueprints and end
   with up to six, but a winning run is carried by two or three *core* towers stacked with
   boons and relics that make them work together. The draft leans you toward a core without
   picking it for you.
2. **Every node is a trade.** Lives against power, crowns now against crowns later, a safe path
   against an elite. No node is free and no node is a trap.
3. **A run you can read.** You see the whole act map, the boss waiting at its end, and what
   each node will cost you. Surprises come from events and elites, never from hidden rules.
4. **Short failures, long wins.** A losing first run ends in 12-20 minutes; a win takes 30-45.
   Every run, won or lost, pays renown toward a visible next unlock.
5. **Worth coming back to.** Six locked towers, four locked commanders, relics and events to
   find, alternate bosses, ten ascensions per commander that each change a rule, a codex to fill.

## The run at a glance

| Act | Setting | Floors | Boss (one of two, rolled at the act start, R21) | Fights on a typical path |
| --- | --- | --- | --- | --- |
| I | Meadow | 6 + boss | Gorrak the Warlord or the Hive Queen | 3 + boss |
| II | Desert ruins | 6 + boss | the Sand Wyrm or the Lich | 3 + boss |
| III | Frozen peaks | 6 + boss | the Frost Colossus or the Pack-Lord | 3 + boss |
| IV | Volcanic citadel | 2 + final boss | the Ember Tyrant | 0-1 + boss |

Total: **12-14 fights** (9-10 battles or elites, 4 bosses). The brief's "~13 battles" holds.

What persists across the run (the **war table**): blueprints (max 6, keys 1-6), boons on those
blueprints, relics, curses, two war-supply slots, lives (current and max), crowns. Everything inside
a battle (gold, built towers, tower levels, specialisations) resets; Setup offers to rebuild the last
battle's towers (the ghost layout, R13).

---

## 1. Act maps

### Layout

The map reads **left to right**: floors are columns, and each floor has up to **4 lanes**
(rows). The whole act is visible at once in 2D, framed by the walnut war table (R31). At 720x390
that is 8 columns of about 80 px and 4 rows of about 70 px, so every node is a big click target
with room for the path lines and a tooltip; Z zooms in on the current floors. At 1440x900 the same
map scales up with more painted scenery around it; the graph does not change.

```
 F1      F2      F3      F4      F5      F6      F7
 [B]─────[?]─────[E]─────[B]─────[S]─────[R]
    ╲            ╱  ╲            ╱         ╲
 [B]─────[B]─────[F]     [T]─────[B]─────[R]─────(BOSS)
             ╲          ╱   ╲            ╱
 [B]─────────[?]─────[B]─────[E]─────[R]
```

- **F1**: 3 battle nodes (2 in act IV, which has its own layout).
- **F2-F5**: the content floors, 3-4 nodes each.
- **F6**: the camp floor. Every node is a **rest**. Every path meets a rest before the boss.
- **F7**: the boss. One node, all F6 nodes connect to it. Its portrait sits there from the
  moment the act opens.

### Generation (seeded)

1. Pick 3 start lanes on F1 (of 4, seeded).
2. Walk **5 paths** from F1 to F6. Path k starts on start lane `k mod 3`. Each step moves to the
   same lane or one lane up or down. A step that would cross an existing edge (lane a->b where
   another edge goes b->a between the same floors) is re-rolled to the same lane.
3. Nodes visited by any path exist; others are empty. Shared nodes merge paths, which is what
   makes forks and joins.
4. Assign node types floor by floor using the table below, then fix violations with the rules
   after it (re-roll the offending node, at most 20 tries, then fall back to battle).

Result: 13-17 nodes per act, each node has 1-3 outgoing edges, and a player meets **4-5 real
forks** per act (a node with 2+ exits that lead to different types).

### Node-type weights per floor (acts I-III)

Weights, not percentages; they are renormalised among the allowed types.

| Floor | Battle | Elite | Event (?) | Shop | Forge | Treasure | Bounty |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | all | - | - | - | - | - | - |
| F2 | 50 | - (act I) / 10 | 30 | - | 0 (act I) / 20 | - | - |
| F3 | 30 | 15 | 25 | 15 | 15 | - | 10 |
| F4 | 25 | 20 | 20 | 10 | 10 | exactly 1 | 15 |
| F5 | 25 | 25 | 15 | 20 | 15 | - | 10 |
| F6 | rest (all nodes) | | | | | | |
| F7 | boss | | | | | | |

Act I F2 has no elite and no forge (the player has had one battle and has nothing to shape yet).
Treasure is not rolled: exactly one F4 node per act becomes a treasure after the rest are rolled,
chosen on a lane that at least two paths share. Every battle-type node also rolls a **theme**
(content.md 6.7) shown on the node.

### Rules the generator enforces

- **No elite directly after an elite** along an edge, and no elite on F2 of act I.
- **At least one F1-to-F6 path with no elite**, and **at least one path with two elites**. The
  greedy route and the safe route both always exist.
- **At least one shop and one forge** reachable in each act. A shop never follows a shop.
- **Act I: at most 2 elite nodes** on the whole map. Acts II-III: 2-4.
- **Events: at most two in a row** on any path.
- **Every node on F5 that is a shop or forge** has a sibling on F5 that is a battle or elite, so
  the last pre-camp choice is always "prepare or fight".
- A node type that a relic or ascension changes (Merchant's Bell, Ascension 1) is applied
  *before* these rules, so the rules still hold.

### The act-IV map

A fixed shape, not a graph:

| Floor | Nodes | Choice |
| --- | --- | --- |
| F1 | **The Ash Road** (battle) or **the Gatehouse** (elite) | Safe fight, or an elite for one last relic. |
| F2 | **The Last Camp** | One node that is both a shop and a rest: shop first, then pick one rest option. |
| F3 | **The Ember Tyrant** | Final boss. |

Short on purpose. Act IV is the payoff, not a fourth grind.

### How many choices a run asks of you

| Kind | Per act (I-III) | Act IV | Run total |
| --- | --- | --- | --- |
| Path forks | 4-5 | 1 | ~14 |
| Reward picks (card, relic) | 5-6 | 2 | ~18 |
| Node choices (shop, event, rest, forge) | 3-4 | 2 | ~12 |
| **Total meaningful decisions** | **~13** | **5** | **~44** |

About one decision every 50 seconds, on top of everything that happens inside battles.

### Time budget

Assumptions (R13): a normal battle is 7 / 8 / 9 / 9 waves by act (about 2:20-2:50 at 1x), an
elite one more, an act boss 7 waves plus the boss wave (about 3 min), the final boss 8 plus the
boss (about 4.2 min). Players play later waves at 2x, so the real time is about 0.75 of the 1x
time. **Every battle also has ~30 s of setup**, which the first budget left out.

| Part | Count on a typical winning path | Time each (real, setup included) | Total |
| --- | --- | --- | --- |
| Battles and bounties | 7 | 1.9 min | 13.3 min |
| Elites | 2.5 | 2.2 min | 5.5 min |
| Act bosses | 3 | 2.75 min | 8.3 min |
| Final boss | 1 | 3.7 min | 3.7 min |
| Reward screens | 14 | 15 s | 3.5 min |
| Events, shops, forges, treasure | 7 | 35 s | 4.1 min |
| Rests and the Last Camp | 4 | 20 s | 1.3 min |
| Blessing, map choices, act transitions | 4 acts | 30 s | 2.0 min |
| **Total** | | | **~42 min** |

Range: a fast player on 3x with few events, ~32 min; a careful player at 1x with every elite,
~48 min. A first run that dies in act I lasts 10-14 min, in act II 18-24 min.

---

## 2. Node types

Every node shows its icon and a one-line tooltip on hover or when selected by arrows ("Battle:
crowns and a reward. Footmen and runners."). Battle and elite nodes show the enemy roles of
that map on hover, so the path choice can account for what your build handles badly.

| Node | Icon | Offers | Costs / risk |
| --- | --- | --- | --- |
| **Battle** | crossed swords | Crowns, a card reward (pick 1 of 3) | Lives you leak |
| **Bounty** | crossed swords + seal | A battle with a posted condition; meet it for a second card reward or a relic | Lives, and the condition may cost you power in the battle |
| **Elite** | horned helm | Crowns x2, a war supply, a card reward at uncommon or better, and a relic (pick 1 of 2) if every elite died | An elite enemy in the waves: big leak cost |
| **Boss** | the boss portrait | Crowns, boss relic (pick 1 of 3) or rare relic, heal, three rare cards | 10 lives each time it gets through, and it comes round again |
| **Event (?)** | question mark | A story choice; or now and then a battle, shop or treasure | Depends on choices |
| **Shop** | coin scale | Buy blueprints, boons, relics, war supplies, services | Crowns |
| **Forge** | anvil | Shape one tower's boons | The node you didn't take |
| **Rest** | campfire | Heal, or train | Can't do both |
| **Treasure** | chest | A relic, a war supply and a few crowns, free | Only that it took a floor |

### Battle

A fresh generated map with the act's enemies, led by the node's theme ("Raiders: rush and swarm").
Rewards: crowns (see Economy) and a card reward. Battles in the same act get harder by floor: the
whole threat budget is multiplied by a floor factor, 0.90 on F1 rising to 1.10 on F5 (content.md 1).

### Bounty

A battle with a condition posted on the node, visible before you choose it. Meet it and the
reward screen has a second pick (another card reward, or at 25% a relic choice of 2 commons).
Fail it and the battle is a normal battle. Conditions are always things a player controls:

| Bounty | Condition |
| --- | --- |
| Clean sweep | Leak nothing. |
| Few hands | Build on at most 5 pads. |
| No sell | Never sell a tower. |
| Quick march | Call at least 5 waves early. |
| Old ways | Cast no commander spell. |
| Lean purse | Never hold more than 300 gold (330 / 360 / 390 in acts II-IV). |
| Single file | Use at most 3 different towers. |
| Hold the gate | No enemy reaches the last third of the path. |

The HUD shows the condition and a mark that turns red the moment it fails, so the player knows
whether to keep straining for it.

### Elite

One of the three elites (juggernaut, warlock, matron) plus an act-specific escort, mid and late
waves. The map shows *which* elite sits on the node from the start of the act, so a player with
no answer to unblockable juggernauts can route around it. Rewards: crowns x2, a war supply, a card
reward with no commons, and **only if every elite of the battle died** (R5) pick 1 of 2 relics
(rarity: common 45, uncommon 40, rare 15). An elite that got through cost 3 lives and its relic.

Elites are the main source of relics. A path with two elites finishes the act with about two
more relics than the safe path: that is the core risk-reward of the map.

### Boss

The act's boss on its own map. Acts I-III each roll one of two bosses when the act opens (R21);
the boss and its two headline mechanics are shown on the map from that moment ("Gorrak: war cry
speeds nearby enemies; calls footmen at two thirds health"). A boss that gets through costs 10
lives and comes round again, faster, until it dies (R1). Rewards:

- Crowns: 40 / 55 / 70 by act.
- **Heal half of your missing lives** (rounded up). Changed from the brief's flat heal so a
  player near death gets real help and a healthy player gets little: it keeps the run alive
  without rewarding leaks.
- Acts I and II: **boss relic, pick 1 of 3** (or take none). Act III: **rare relic, pick 1 of 3**
  (a boss relic downside going into the final fight is a bad surprise, not a decision).
- A card reward of **three rares**.
- Then the next act's map is revealed (see hooks).

### Event (?)

Shown as "?" on the map. When entered it rolls:

| Outcome | Base chance | Pity |
| --- | --- | --- |
| Event | 75% | |
| Battle (an ambush; card reward includes one uncommon or better) | 10% | +10% each ? that wasn't a battle, resets on battle |
| Shop | 8% | +3% each ? that wasn't a shop |
| Treasure | 7% | +2% each ? that wasn't a treasure |

Events have their own section below.

### Shop

A merchant's stall. One visit, buy anything you can afford, leave.

| Slot | Count | Price (crowns) |
| --- | --- | --- |
| Blueprints (towers you don't own, synergy-weighted) | 2 | common 50, uncommon 75, rare 110 |
| Boons (for towers you own, core-weighted) | 3 | common 40, uncommon 60, rare 90 |
| Relics | 2 random tier + 1 shop-tier | common 110, uncommon 150, rare 200, shop 130 |
| War supplies | 2 | common 20, uncommon 28, rare 35 |
| **Sale**: one card at half price | marked | |
| Mend: heal 5 lives | once | 40 |
| Lift a curse | once per shop | 60, +20 each time in the run |
| Restock: replace all unbought cards, relics and supplies | once | 25 |

Prices vary by a seeded +-10%. One random card is on sale. Buying a blueprint with 6 owned
asks which blueprint it replaces (same flow as the reward screen).

Why a single restock and not unlimited: a restock is a gamble with real crowns, and limiting it
keeps the shop from becoming a slot machine that wins every run.

### Forge

The build-shaping node: the place to turn a tower into a core. Pick one of:

- **Hone**: choose one of your towers, see 3 of its boons (rarity: common 40, uncommon 45,
  rare 15), take one.
- **Temper**: upgrade two boons you own to their tempered (+) version.
- **Recast**: replace one blueprint with a tower of your choice from 3 offered. The old
  tower's boons are lost; you get 10 crowns per boon lost. Only offered when you own 4+
  blueprints.

A forge and a battle on the same floor is the purest "prepare or fight" choice: the forge
gives a sure, targeted boon; the battle gives crowns, a random card and a risk.

### Rest

Every F6 node, and the Last Camp. Pick **one**:

| Option | Effect | Available |
| --- | --- | --- |
| **Rest** | Heal 35% of max lives (7 of 20), rounded up | always |
| **Drill** | Temper one boon | always |
| **Fortify** | +2 max lives (not healed) | always |
| **Dig** | Find a relic (common 50, uncommon 35, rare 15) | with Wayfarer's Spade |
| **Pray** | Lift one curse | with Votive Candle |
| **Scout** | See the next act's map now and choose your F1 start lane | from unlock level 11 |

Fortify is there so a full-health player still has a real choice besides Drill: lives now,
max lives later. A player at 18/20 should drill; at 9/20 should rest; at 15/20 it is a real
question, which is the point.

### Treasure

A chest. Opens to one relic (common 55, uncommon 35, rare 10), one war supply and 15-25 crowns.
Exactly one per act on F4. Its lane is chosen so it is on a shared path, making it a pull toward
the middle of the map that the player weighs against what's around it.

---

## 3. Draft and rewards

### The blessing (run start, R23)

Every run opens on a pick of 3 blessings drawn from six: a common relic, a 4th blueprint, trade a
starting tower for a rare boon, +8 max lives, 60 crowns, two war supplies (exact rules in
content.md 11.11). It is the run's first decision and leans it before the first battle. Run 1's
three are fixed (Lucky Horseshoe, +8 max lives, 60 crowns). After a commander's first win, its
next run's blessing adds a fourth card: choose 1 of 3 rare relics (R27).

### Card kinds

A **card** is either:

- a **Blueprint**: a tower you don't own. Picking it adds the tower to the war table (next free
  key). With 6 owned, picking one asks which blueprint to replace; the replaced tower's boons
  are lost and pay 10 crowns each. The 5th and the 6th blueprint each add +5% to every L1 cost
  (R18), so a sixth tower is a choice, not a free win.
- a **Boon**: a run upgrade for one tower you own. Each boon is unique per run. Most boons have
  a **tempered (+)** version, gained at forges and rests.
- a **Relic** (rare in normal rewards, see slot C below).

### Boon structure

Each of the 12 towers has **7 boons**: 4 common (numbers and small behaviours), 2 uncommon (a new
behaviour), 1 rare **keystone** (a rule change, often a cross-tower synergy). Frost Spire adds a
second rare, Endless Winter (a cap-lifter, R19); War Banner lost War Tax (R16). Plus **7
universal boons** that go on any tower. That is 91 boons in total, all in content.md 3 with their
numbers and pools; this table shows one example per tier.

| Tower | Common (example) | Uncommon (example) | Keystone (rare) | Keystone needs |
| --- | --- | --- | --- | --- |
| Archer | Barbed Tips: +2 damage per arrow | Twin Shot: every 5th arrow is shot twice | **Glass Arrows**: arrows on frozen enemies burst for physical damage around them | Frost Spire |
| Barracks | Drilled: soldiers +25% health | Shield Wall: each soldier hit adds 1 shred | **Bait**: held enemies take +30% from splash, cones, puddles and burns | Bombard or Pyre or Alchemist |
| Mage | Focus: +15% damage | Lingering Hex: bolts hex for 1 s | **Curse Engine**: its hex lasts until death | none |
| Bombard | Heavy Shot: +20% splash radius | Oilshot: shells leave oil where they land | **Shatterfall**: shells on frozen enemies freeze those nearby | Frost Spire |
| Frost Spire | Deep Cold: chill +25% | Frozen Mark: frozen enemies are also marked | **Glass Bones**: its freezes make enemies Brittle, like Shatter; plus the rare **Endless Winter**: shatter chains have no limit | none |
| Alchemist | Thick Oil: puddles last 50% longer | Caustic Oil: puddles shred armour | **Firewalk**: a Pyre cone lights puddles, and lit puddles light their neighbours | Pyre |
| Pyre | Hotter: burn +2 dps | Backdraft: +25% damage to enemies held by soldiers | **Cinder Rain**: burning deaths throw embers that light oil | Alchemist |
| Storm Spire | Copper Wire: +1 chain target | Seeking Sparks: chains prefer chilled, oiled or shielded enemies | **Grounding**: the last jump stuns for 0.5 s | none |
| Beacon | Wider Light: +20% radius | Spreading Mark: marks jump on death | **Hunter's Moon**: crits on marked enemies deal at least x2.5 for every tower | Archer or Ballista |
| War Banner | Louder Drums: +5% aura attack speed | Brave Hearts: towers in aura can't be disabled for more than 3 s | **Field Forge**: banners stack, the two best auras add (a cap-lifter) | none |
| Ballista | Long Draw: +15% range | Pinning Bolts: bolts root small enemies for 0.6 s | **Spear of Dawn**: bolts that kill keep flying to the next target | none |
| Thornwood | Sharper Thorns: +3 thorn dps | Long Roots: roots last 0.5 s longer | **Heartwood Bond**: a soldier in its aura who would die falls to 1 HP and can't be hurt for 3 s, once per life | Barracks |

Universal boons (any tower): Veteran (built at L2 for L1 plus half of L2; never with Siege
Engine), Thrifty (costs 15% less), Overseer (L3 costs 40% less), Watchful (reveals stealth in
range), Rangefinder (+10% range), Steadfast (+25% damage to bosses), Trophy (+3 crowns after each
battle in which this tower dealt the most damage). Cut in R16: Sapper-proof, Bounty, Last Stand.

**No dead picks**: a boon is offered only if it can work. A keystone whose "needs" tower you
don't own is never offered. A universal boon is never offered for a tower that can't use it
(Watchful on Beacon, which already reveals).

### Reward screen

After every battle: crowns are paid first (a quick tally), then three cards.

The three slots are built, not drawn blindly:

| Slot | What it can be | Steering |
| --- | --- | --- |
| **A** | A boon for a tower you own | Weighted toward your core (below) |
| **B** | A blueprint (while you own < 6) or a second boon | Blueprints weighted toward synergy with your core |
| **C**, the wild card | Anything from the full pool: a blueprint, a boon for a tower you own (R6), or a relic (4%) | Uniform by rarity; ignores your core |

Slot C is the anti-railroad: one choice on every screen is not shaped by your core, so a better
idea can always walk in; its boons are still only for towers you own, so it is never a dead
card. Slot A and B are what make builds form.

**Air in battle 2** (R2): a commander that starts with no air reach (the Alchemist, the Warden)
always finds an air blueprint (Archer, Mage, Frost Spire or Storm Spire, whichever are unlocked) in
slot B of its first reward. **Run 1's first reward** is fixed (R13): Frost Spire, Bombard and Glass
Bones.

**Blueprint vs boon split for slot B**, by blueprints owned: 3 owned 80/20, 4 owned 55/45, 5
owned 35/65, 6 owned 15/85 (a blueprint at 6 is a replacement offer). A typical run reaches its
5th tower in act I, its 6th in act II, and spends act III deepening.

**Core weighting.** Each owned tower's weight for slot A is `1 + 0.75 x (boons it has)`, capped
at 4. A tower that has been built in the last battle and dealt at least 15% of the damage gets
+0.5. So after two boons on Frost Spire, it is offered about twice as often as a fresh tower,
which pulls you toward a core of 2-3 without ever locking the others out.

**Synergy weighting** for blueprints: each tower has 2-3 partners (table below). A blueprint is
weighted 1, or 2.5 if it is a partner of one of your towers with 2+ boons.

| Tower | Partners (synergy the brief names) |
| --- | --- |
| Archer | Beacon (marks, crits), Frost Spire (shatter), War Banner |
| Barracks | Bombard, Pyre (hold them in splash and flame), Thornwood |
| Mage | any (hex helps everything); weighted toward Storm Spire, Beacon |
| Bombard | Barracks, Frost Spire, Alchemist (shred) |
| Frost Spire | Ballista, Bombard, Archer (shatter + physical), Storm Spire (conductive chill) |
| Alchemist | Pyre (oil + fire), Bombard, Barracks |
| Pyre | Alchemist, Barracks, Thornwood |
| Storm Spire | Frost Spire, Mage, Beacon |
| Beacon | Archer, Ballista, Mage |
| War Banner | Archer, Mage, Ballista (fast attackers love speed) |
| Ballista | Frost Spire, Beacon, Alchemist (shred) |
| Thornwood | Barracks, Pyre, Bombard |

**Rarity** for cards, per screen:

| Source | Common | Uncommon | Rare |
| --- | --- | --- | --- |
| Battle / bounty | 62 | 33 | 5 + pity |
| Elite | 0 | 75 | 25 + pity |
| Boss | 0 | 0 | 100 |
| Event ambush | 40 | 50 | 10 + pity |

**Pity**: a hidden rare bonus starts at 0 and rises by 1 for every common card shown; it resets
to 0 when a rare is shown. After about 15 commons the next screen is near-guaranteed to have a
rare somewhere. This is StS's rule and it works.

**Skip**: always allowed. Skip pays **10 crowns** (act I), 14 (II), 18 (III), 22 (IV). Skipping is a
real option for a build that is already where it wants to be, and it feeds the shop.

**Reroll**: no free rerolls at the start. The meta perk *Second Look* gives one reroll per act;
the Seer's relic gives a 4th card instead. Rerolls replace all three cards and roll the slot
structure again.

**Banish**: from the meta perk *Strike Off* (unlock level 16): once per act, cross one card off
for the rest of the run. Banishing a blueprint removes it from all offers, shops included.

### How a build forms: an example

Marshal starts with Archer, Barracks, Mage (a later run, so the first reward is not the fixed
one). Battle 1 slot B offers Frost Spire (partner of Archer). The player takes it. Battle 2 offers
Deep Cold (Frost) in slot C and Barbed Tips (Archer) in slot A; the player takes Deep Cold. Frost now has 1 boon, and Archer and Ballista
(Frost's partners) climb in the offers. Elite 1 gives Black Ice (relic, frost). By the act I
boss, Frost has 3 boons, Archer 1, and Ballista (once unlocked) has been offered twice. The run is now "frost
and shatter with physical damage", with Barracks holding and Mage as a backup. Nobody picked
that for the player; it was leaned toward each step.

---

## 4. Economy across the run

### Crowns

| Source | Amount |
| --- | --- |
| Start of run | 30 (perks raise it) |
| Battle (act I / II / III / IV) | 12 / 16 / 20 / 24 |
| No leaks in the battle | +5 |
| Leftover battle gold | 1 crown per 10 / 14 / 18 / 22 gold held when the last enemy dies (by act), max +12 (R17) |
| Treasury | +1 per wave it stood through, outside that cap (R11) |
| Bounty met | its extra reward, no crowns |
| Elite | 2x the battle amount, +5 if no leaks |
| Boss | 40 / 55 / 70 |
| Treasure | 15-25 |
| Skipping a card | 10 / 14 / 18 / 22 |
| Events | -40 to +60 (a +60 bet in the Snowed-In Inn) |
| Blessing: a full purse | +60 once |
| Recast or replaced blueprint | 10 per boon lost |

**Expected income** on a typical winning path: act I ~110, act II ~150, act III ~180, act IV
~50. **About 490 crowns a run** (the act-scaled leftover rate trims a little late, Treasury and the
blessing can add some back). Sinks, a typical run: 3-4 shop visits (one relic and two cards
each costs ~210; a war supply 20-35), a curse lift or a heal, an event or two that costs crowns. Crowns are always a
little short: a shop visit forces "the relic or two boons", never "everything".

Crowns don't earn interest. Interest belongs to battle gold, where it is a moment-to-moment
decision; adding it to crowns would reward skipping shops, which is the opposite of what the
shop is for. (A relic that wants this, Dragon's Hoard, was cut for that reason.)

### Leftover gold

When the last enemy of a battle dies, held gold converts to crowns at 10 / 14 / 18 / 22 gold per
crown by act, up to 12 (R17), so late-act gold piles don't flood the shop. **Selling is disabled
once the final wave has started** (settled) so the conversion can't be gamed by selling
everything at the end. This makes the last two waves a real choice: spend to be safe, or bank for
the shop. The Quartermaster's Ledger converts at 5:1 in every act, up to 20.

### War supplies (R20)

Two one-use slots on the war table, fired in battle with **E** and **D**: oil barrel, frost
flask, gold cache, spike trap, war horn, mason's kit, flare, heavy bolt, bell, lifeblood
(numbers in content.md 11.10). Every elite reward and treasure gives one, every shop sells two
(20-35 crowns), some events and the blessing give them. Two slots make them a small standing
decision: spend the bell now, or keep it for the boss.

### Lives

Lives are the run's health. Start **20 / 20 max**.

| Lose lives | Amount (systems 1.3) |
| --- | --- |
| A footman, runner, swarmling, bat, splitter child or summon leaks | 1 |
| A brute, acolyte, shieldbearer, shaman, splitter, shade, sapper or drake leaks | 2 |
| An elite leaks | 3 |
| A boss leaks | 10, and it comes round again, faster, until it dies (R1) |
| Events and curses | as written |

| Gain lives | Amount |
| --- | --- |
| Rest | 35% of max (7 at 20) |
| Boss kill | half of missing, rounded up |
| Shop: Mend | 5 for 40 crowns, once per shop |
| Lifeblood (war supply) | 2 |
| Blessing: strong walls | +8 max, healed |
| Last Camp rest | as Rest |
| Marshal's Old Standard | 1 after a battle with 0-1 leaks |
| Relics and events | as written |

**Max lives** grow from Fortify (+2), events, the Warden, some relics. There is no ceiling;
in practice a run ends between 18 and 30 max.

### Healing math (why the numbers above)

A novice leaks about 3 lives a fight in act I and 4-6 in act II. With 20 lives and one rest and
one boss heal in act I, that player reaches the act I boss with about 10, and a boss with one
leak (10 lives) ends the run. That is the "first run dies in act I or II" target, and it comes
from leaks, not from a wall.

A decent player leaks 0-1 per battle and 2-4 per elite. Healing per act is ~7 (rest) plus ~half
of missing (boss): enough to take two elites per act and arrive at the final boss with 12-18.

### The greed decisions

Every one of these is a deliberate trade the player feels:

| Decision | Greedy side | Safe side |
| --- | --- | --- |
| Call the next wave early | Gold bonus now, faster battle | Time to build and see the wave |
| Bank gold for interest | More gold over the battle | Towers now, fewer leaks now |
| Final waves: spend or bank | Up to 12 crowns | A tower that saves a life |
| Use a supply now or keep it | Safety this wave | The boss or an elite |
| Elite node | A relic, double crowns | A battle with smaller leaks |
| Bounty node | A second reward | The condition costs power in the fight |
| Rest: Drill or Fortify | Power or max lives | Heal now |
| Skip a card | 10-22 crowns | A card that may help |
| Shop: Mend vs a relic | Power for the rest of the run | 5 lives now |
| Events that trade lives | Rare boons and relics | Nothing lost |
| Boss relics | Big power | A real downside |

---

## 5. Relics

**45 pool relics** (10 common, 10 uncommon, 10 rare, 9 boss, 6 shop), plus 2 event-only relics and
5 commander starting relics that are not in the pool. Each relic does one thing you can say in a
line. Commons are allowed to be plain; from uncommon up most relics bend a rule. Exact numbers,
prices, unlock levels and flavour: content.md 8.

Tags: **frost**, **fire** (oil and fire), **block** (soldiers, holding), **mark** (beacon,
crits), **hex** (mage), **storm**, **econ** (gold, crowns), **spell**, **tall** (few strong
towers), **wide** (many towers), **all**.

Relics tagged to towers are 3x as likely to be offered while you own one of those towers, and
are never offered when you have 6 blueprints and none of them is a tagged tower.

### Common (10)

| Relic | Effect | Tags | Note |
| --- | --- | --- | --- |
| Spare Planks | The first tower you build each battle is free (up to 100 gold). | all | Strong in act I, fades. |
| War Chest | Start each battle with 40 more gold (x gold). | all | |
| Lucky Horseshoe | The first enemy to leak each battle costs no lives (never an elite or a boss). | all | The novice's friend. |
| Field Rations | Rest heals 4 more lives. | all | |
| Coin Purse | +6 crowns after every battle with no leaks. | econ | |
| Signal Horn | The call-early bonus is doubled for waves 2-4. | econ | |
| Snowglobe | Wave 1, and a boss's escort, walk in chilled. | frost | |
| Copper Coil | Storm Spire chains reach one more enemy. | storm | |
| Grease Pot | Alchemist puddles are 30% larger. | fire | |
| Marching Drum | Soldiers reach their rally point twice as fast and come back 25% sooner. | block | |

### Uncommon (10)

| Relic | Effect | Tags | Note |
| --- | --- | --- | --- |
| Black Ice | Frozen enemies take 25% more damage from everything. | frost | Never in the same run as Cold Iron. |
| Storm Glass | Storm Spires deal +60% to chilled or frozen enemies. | storm, frost | The brief's "conductive chill". |
| Hunter's Whistle | Marked enemies drop 3 more gold when they die. | mark, econ | |
| Armourer's Awl | Shred lowers ward as much as armour. | hex, fire | Makes Acid and Shrapnel feed Mage. |
| Long Fuse | Bombard shells leave a 2 s fire where they land; it lights oil. | fire | Bombard joins the oil build. |
| Thorn Collar | Enemies held by a soldier take 10 physical a second (x act). | block | |
| Echo Stone | The first damage spell each battle is cast twice (the echo at 60%); a non-damage spell gets half its cooldown back instead. | spell | Reworked in R16. |
| Spyglass | Archers and Ballistas gain 15% range and see stealthed enemies in range. | mark | Answers shades without a Beacon. |
| Iron Shutters | A tower can't be disabled for more than 2 s. | all | Answers sappers. |
| Pilgrim's Map | You can see what each ? node holds before choosing it. | all | Map planning; quietly strong. |

### Rare (10)

| Relic | Effect | Tags | Note |
| --- | --- | --- | --- |
| The Ninth Pad | Every map has one extra build pad, on a good bend (never the best). | wide, all | Pads are power. Rare, and never in a shop. |
| Tidewater Vial | Chilled enemies count as oiled: fire ignites them, Naphtha explodes them. | frost, fire | Bridges the two biggest builds. Watch frost+fire win rate. |
| Prism Lens | Beacon marks also hex. | mark, hex | |
| Cold Iron | Physical damage ignores armour on frozen enemies. | frost | Never in the same run as Black Ice. |
| Old Oak Seed | When a soldier falls, a bramble grows there and roots the next enemy for 1.5 s. | block | |
| Twin Crests | Once per battle, the first tower you specialise may also buy the other specialisation (full price). | tall | Watch on Arcanist+Hexer Mage. |
| Phoenix Feather | The first time your lives reach 0, you go back to 8. Then it crumbles. Not on a boss or elite leak. | all | Safety; not a power pick. |
| Dragonglass | Fire ignores fireproofing. | fire | R15: Pyre's answer to act IV. |
| Deadeye's Oath | Crits on marked enemies deal x5, from every tower. | mark | Cap-lifter (R19). |
| Wildfire Crown | Burns from up to 3 different sources stack on one enemy. | fire | Cap-lifter (R19). |

### Boss (9), offered 3 at a time after the act I and act II bosses

Each has a downside you will feel. A boss relic is the biggest single decision in the run.

| Relic | Upside | Downside | Tags | Note |
| --- | --- | --- | --- | --- |
| Royal Mint | Start each battle with 150 more gold (x gold). | Kills give 15% less gold. | econ, tall | Front-loads: great with an opener build. |
| Mason's Seal | Building and upgrading cost 25% less. | Specialisations cost 50% more. | wide | |
| Siege Engine | Every tower is built at L2, for L1 plus half of L2. | You can't call waves early; Veteran is never offered. | all | R3: no more free L2s. |
| Sun Disc | Commander spells recharge twice as fast. | You can't Rest at rest nodes (Drill and Fortify only). | spell | |
| Seven Bells | Two extra build pads on every map. | Every wave has 15% more enemies. | wide | |
| Hollow Crown | Reward screens show 1 more card. | Shop prices are doubled. | all | |
| Pact of Embers | +6 max lives, and heal to full now. | Every leak costs 1 more life (not elites or bosses). | all | For players who don't leak; deadly for those who do. |
| Crowded Banners | Towers gain 10% attack speed per tower within 2.8 u. | Towers with no neighbour lose 30%. | wide | Rewards dense pad clusters; map-dependent. |
| Overclock | Towers attack 25% faster; the attack-speed cap is +200%. | Every attacking tower has 1 u less range. | tall | Cap-lifter (R19). |

### Shop (6), only sold in shops

| Relic | Effect | Tags |
| --- | --- | --- |
| Guild Seal | Shop prices 20% lower; the restock is free. | econ |
| Abacus | Gold interest cap doubled. | econ |
| Merchant's Bell | ? nodes are 3x as likely to be shops; shops carry one more relic. | econ |
| Smuggler's Crate | Skipping a card gives a random boon for your tower with the most boons instead of crowns. | tall |
| Wayfarer's Spade | Rest nodes offer Dig: find a relic. | all |
| Bellows | Forge Hone shows 4 boons; Temper upgrades 3. | tall |

### Event-only (2)

| Relic | Effect | From |
| --- | --- | --- |
| Votive Candle | Rest nodes offer Pray: lift a curse. | The Crossroads Shrine |
| Widow's Hammer | Each Temper also tempers one random other boon. | The Smith's Widow |

### Coverage check

| Archetype | Relics that enable it |
| --- | --- |
| Frost and shatter | Snowglobe, Black Ice, Cold Iron, Storm Glass, Tidewater Vial |
| Oil and fire | Grease Pot, Long Fuse, Tidewater Vial, Armourer's Awl, Dragonglass, Wildfire Crown |
| Hold the line (block) | Marching Drum, Thorn Collar, Old Oak Seed |
| Marks and crits | Hunter's Whistle, Spyglass, Prism Lens, Deadeye's Oath |
| Hex | Armourer's Awl, Prism Lens |
| Storm | Copper Coil, Storm Glass |
| Economy / Banner | Coin Purse, Signal Horn, Hunter's Whistle, Royal Mint, Abacus, Guild Seal |
| Spells | Echo Stone, Sun Disc |
| Tall (few strong) | Twin Crests, Smuggler's Crate, Bellows, Royal Mint, Overclock |
| Wide (many towers) | Ninth Pad, Seven Bells, Mason's Seal, Crowded Banners |

Every archetype has at least two relics, and no archetype has more than six tower-specific
ones, so a build gets help without one build getting all the help.

### Dominance watch list (for the sim)

Flag in balance review if any relic's pick rate is over 70% when offered, or its win-rate lift
over 8 points. **Cap-lifters** (Field Forge, Hexer, Endless Winter, Deadeye's Oath, Wildfire
Crown, Overclock) are judged by win-rate lift instead, at most 15 points (R19).

1. **Siege Engine**: applied lever: L2 now costs L1 plus half of L2 (R3). Next lever: "waves come
   15% faster".
2. **The Ninth Pad / Seven Bells**: pads are the scarcest thing in a battle. Applied: the extra
   pad is placed on a good bend, never the best.
3. **Frost stacking** (Black Ice + Cold Iron + Brittle + Shatter): applied: Black Ice and Cold Iron
   never appear in the same run.
4. **Spare Planks** in act I. Applied: free only up to 100 gold; next lever 70.
5. **Echo Stone with Sun Disc**: applied: the echo is at 60%, damage spells only (R16).
6. **Twin Crests on Mage**: Arcanist chains + Hexer. Lever: excluded for one tower if the sim
   shows it.
7. **Royal Mint**: reworked to +150 x gold and -15% bounty (R16); watch it with Treasury.

---

## 6. Events

**30 events** (R22): 12 any act, 6 for each of acts I-III; 28 in the pool at the start, 2
unlocked at renown level 7. Plain, quiet prose: two or three short sentences beside a glyph
vignette, then choices. Each choice says what it does in plain numbers; there are no hidden
outcomes, except where a gamble says it is one. Act-specific events appear only in their act. Full
text and exact outcomes: content.md 10.

Choices show greyed with the reason when they can't be taken ("You have no curse").

### Curses

Some events give a **curse**: a card on the war table that does something bad until it is lifted
(shop, Pray, some events). Curses don't take a blueprint key. Each is worth about -60 to -80
crowns over a run (R14).

| Curse | Effect |
| --- | --- |
| Debt | Lose 10 crowns after each battle. |
| Doubt | Setup is timed: wave 1 starts by itself after 20 s. |
| Haunted | A shade joins waves 3, 6 and 9 of every battle. |
| Rust | L3 upgrades cost 20% more. |
| Leaking Roof | Every leak costs 1 more life, at most +3 a battle (not elites or bosses). |
| Cold Hands | Your first tower each battle costs 50% more. |
| Dread | Bosses start with 15% more health. |
| Toll | Each shop visit costs 15 crowns to enter. |

### The thirty

| Event | Act | The trade, in one line |
| --- | --- | --- |
| The Crossroads Shrine | any | lives for a rare boon; crowns to lift a curse; the Votive Candle with the curse Toll |
| The Old Battlefield | any | press your luck: search again for crowns, the risk rising each time |
| The Tinker's Cart | any | trade a boon up a rarity, or a mystery relic for crowns |
| A Deserter | any | a blueprint, the ? map, or 3 lives |
| The Gambler's Table | any | crowns or lives on a coin-flip |
| The Smith's Widow | any | temper two boons, or the Widow's Hammer |
| Refugees on the Road | any | crowns for max lives, or a short battle with no card |
| The Wandering Bard | any | crowns to weaken the next boss, or see the next act's map |
| The Overturned Wagon | any | two war supplies, or three and crowns for 2 lives |
| The Recruiting Sergeant | any | crowns for an uncommon boon, or lives for a temper |
| The Wandering Merchant (unlocked) | any from act II | a boss relic for crowns and lives, or a rare boon |
| The Ruined Chapel (unlocked) | any from act II | lift every curse for max lives, or two relics with two curses |
| The Miller's Fire | I | lives for the Pyre blueprint, or a Frost boon |
| Bees in the Orchard | I | heal 6, or lives for the Thornwood blueprint |
| The Harvest Fair | I | crowns if you own an Archer or Ballista; supplies; heal |
| The Scarecrow | I | a common relic with Haunted, or a life to lift a curse |
| The Ford | I | crowns for battle gold, a risky bridge, or a life |
| The Lost Patrol | I | the Barracks blueprint, max lives, or two supplies |
| The Sunken Vault | II | a rare relic with Debt, or crowns |
| The Mirage Market | II | a half-price shop that keeps your most expensive buy |
| The Sphinx | II | two boons on one tower, one lost from another |
| The Dry Well | II | lives for an uncommon relic, or crowns for lives |
| The Caravan Master | II | supplies for crowns, sell a tower for 70, or the ? map |
| The Buried King | II | lives for a rare boon, or a tempered common one |
| The Frozen Knight | III | lives for a rare relic, or an uncommon one with Cold Hands |
| The Avalanche Pass | III | skip a floor (+20 crowns), a paid Hone, or heal |
| The Hermit | III | a blueprint for two rare boons, or the next act's map |
| The Ice Bridge | III | a risky crossing for crowns, a Frost boon with Cold Hands |
| The Ember Shrine | III | heal 6, a boon for a rare relic, or lives for the Pyre blueprint |
| The Snowed-In Inn | III | a 40-crown bet, a round that tempers two boons, or heal |

### Event rules

- An event is seen at most once a run.
- Act-specific events are 40% of ? rolls in their act; the rest come from "any act".
- An event the codex hasn't seen is weighted 2x (new players see variety first).

---

## 7. Commanders

Five commanders. Each changes **what you start with**, **how you play**, and **what you want to
draft**. Spells are Q and W; the systems designer defines exact numbers, this table fixes the
concept and the role.

| | Marshal | Alchemist | Seer | Quartermaster | Warden |
| --- | --- | --- | --- | --- | --- |
| **Unlock** | open | renown level 4 | reach act III once | renown level 13 | renown level 6 (R27) |
| **Starting towers** | Archer, Barracks, Mage | Alchemist, Pyre, Bombard | Mage, Frost Spire, Archer (R27) | Archer, Bombard, War Banner | Barracks, Thornwood, Archer (balance.md) |
| **Starting relic** | Old Standard | Bubbling Retort | Third Eye | Ledger | Heartwood |
| **Passive** | Drillmaster | Volatile | Foresight | Supply Lines | Deep Roots |
| **Q** | Reinforcements | Firebomb | Stillness | Requisition | Barrier |
| **W** | Meteor | Tar Pit | Judgement | Rally | Bramble Surge |
| **Plays as** | balanced, learn-the-game | area denial, combo | control, knowledge | greed, tempo | hold the line |
| **Difficulty** | easy | medium | medium | hard | easy-medium |

### Marshal (open)

The default commander and the teacher: every damage type in the start, a forgiving relic, and
spells that fix mistakes.

- **Old Standard**: after a battle with 0 or 1 leaks, heal 1 life.
- **Drillmaster**: the first upgrade you buy each battle is free.
- **Q Reinforcements**: two soldiers drop where you click and hold for 10 s.
- **W Meteor**: a burning rock lands where you click after a 1 s warning circle.
- **Wants**: anything; leans toward the brief's starter synergies (Frost + Archer, Barracks +
  Bombard).

### Alchemist (renown level 4)

Starts with the oil and fire combo already in hand. Wins by making enemies walk through a kill
zone, loses to flyers (Bombard and Alchemist are ground only), so the draft must find air cover.

- **Bubbling Retort**: each battle starts with 3 oil puddles on the path's longest straight.
- **Volatile**: oiled enemies take 15% more fire damage; burning kills give 1 more gold.
- **Q Firebomb**: oils and lights an area.
- **W Tar Pit**: a large pool that slows heavily and oils for 6 s.
- **Wants**: Archer or Storm Spire for air (its first reward always offers one, R2), Barracks to
  hold enemies in the fire.

### Seer (reach act III once)

The drafting commander. More cards to choose from and more to see; spells that stop time and
remove the single worst threat. She starts with Archer, not Beacon (R27); reaching act III still
unlocks the Beacon with her.

- **Third Eye**: card rewards show 4 cards.
- **Foresight**: you can see the enemy roles of every battle and elite node before choosing it,
  and the skull shows two waves ahead instead of one.
- **Q Stillness**: freeze every enemy for 3 s.
- **W Judgement**: a pure damage strike on the enemy with the most health.
- **Wants**: Ballista (more physical to pair with frost), Storm Spire (conductive chill), Beacon
  (marks for her Archer).

### Quartermaster (renown level 13)

The greedy commander: weaker start, much stronger economy. Rewards calling early and banking;
punishes a player who doesn't.

- **Ledger**: leftover gold converts at 5:1 in every act (not 10-22:1), up to 20 crowns.
- **Supply Lines**: shops are 15% cheaper; +3 crowns per battle.
- **Q Requisition**: the selected tower gains its next level (not a specialisation) at 50% of
  the price; 30 s cooldown (R11).
- **W Rally**: every tower attacks 40% faster for 8 s; 40 s cooldown.
- **Wants**: Banner's Treasury spec (+25% bounty and a crown a wave), Hunter's Whistle, a strong
  carry to spend Requisition on.
- Harder because the start has no magic damage and the gold edge needs early calls.

### Warden (renown level 6)

The blocker commander: soldiers, roots and thorns, enemies that never reach the end. He unlocks at
renown level 6 (R27), so he is a mid-learning reward rather than a first-win prize, and brings
Thornwood Grove with him.

- **Heartwood**: +6 max lives (start 26 / 26).
- **Deep Roots**: soldiers heal when not fighting; enemies held by a soldier for 3 s are
  revealed and marked.
- **Q Barrier**: a wall of roots across the path for 4 s.
- **W Bramble Surge**: roots every enemy in a wide circle for 2 s.
- **Wants**: Pyre (more on the held crowd), Archer or Ballista for flyers (nothing in the start
  hits air; his first reward always offers an air tower, R2), Mage for warded acolytes.

### Commander rules

- Choose before the run starts. Your last commander is pre-selected; Enter starts at once.
- Each commander climbs its own ascensions 1-10 (R26): a win with a commander unlocks the next
  level for that commander only, shown as a small crown with a number on its card.
- A commander's starting towers unlock with the commander (see the unlock track).

---

## 8. Meta progression

### Renown

Earned at the end of every run, won or lost. Shown as a tally on the summary screen, one line
at a time.

| Source | Renown |
| --- | --- |
| Each floor cleared (any node) | 2 |
| Each elite defeated | 6 |
| Each act boss defeated | 15 |
| Final boss defeated (win) | 30 |
| Each bounty met | 2 |
| Run with no lives lost in act I | 5 |
| First time meeting a boss | 10 (once each) |
| First win with a commander | 20 (once each) |

Then multiplied by `1 + 0.1 x ascension`.

**Typical runs**: dies on the act I boss: ~30. Dies in act II: ~50-60. Dies in act III: ~85-100.
Win at A0: ~150. Win at A5: ~225.

### Unlock track

Renown levels are cumulative. Every level unlocks one named thing, shown on the summary
screen's progress bar with the next unlock's name and icon ("Next: Storm Spire, 34 renown to
go"). Seeing the *name* of the next thing is the hook.

**Starting content**: towers Archer, Barracks, Mage, Bombard, Frost Spire, Pyre; commander
Marshal; 29 of the 45 pool relics (detail below the table); 28 events.

| Lvl | Total renown | Unlock | Why it pulls you back |
| --- | --- | --- | --- |
| 1 | 25 | **Alchemist** tower | Oil + Pyre: the first combo, right after run 1 |
| 2 | 60 | Relics: Black Ice, Long Fuse, Wildfire Crown | New tricks for towers you know |
| 3 | 100 | Perk: **Thick Walls**, +2 max lives | The game gets kinder as you learn it |
| 4 | 150 | **Alchemist** commander | A new way to start |
| 5 | 210 | **Storm Spire** tower | Answers shields; conductive chill |
| 6 | 280 | **Warden** commander, with Thornwood Grove (R27) | A third way to start, and a new tower |
| 7 | 360 | Events: the Wandering Merchant, the Ruined Chapel | |
| 8 | 450 | Perk: **Second Look**, one card reroll per act | First draft-control tool |
| 9 | 550 | **Beacon** tower | Answers shades; marks and crits |
| 10 | 660 | Relics: Prism Lens, Twin Crests, Storm Glass, Deadeye's Oath | |
| 11 | 780 | Perk: **Scout**, rest option to see the next act early | |
| 12 | 910 | **War Banner** tower | |
| 13 | 1050 | **Quartermaster** commander | |
| 14 | 1200 | **Ballista** tower | |
| 15 | 1360 | Relics: Old Oak Seed, Cold Iron, Seven Bells, Crowded Banners, Overclock | |
| 16 | 1530 | Perk: **Strike Off**, one banish per act | |
| 17 | 1710 | Perk: **Nest Egg**, +25 starting crowns | |
| 18 | 1900 | Relics: Tidewater Vial, Pact of Embers, Bellows, Dragonglass | |
| 19 | 2100 | Perk: **Thicker Walls**, +2 max lives | |
| 20 | 2310 | The title "Warden of the Ramparts" | Completion |

Not on the renown track (milestones, shown in the codex with their condition):

| Unlock | Condition |
| --- | --- |
| Seer (+ Beacon) | Reach act III once |
| Ascension 1 for a commander | That commander's first win (R26) |
| Ascension n+1 for a commander | A win at ascension n with that commander |
| A rare-relic card in the next blessing | A commander's first win (R27) |

**Starting pool details**: all 10 commons; 7 of 10 uncommons (locked: Black Ice, Long Fuse at
level 2, Storm Glass at 10); 2 of 10 rares (The Ninth Pad, Phoenix Feather; the other eight unlock
at 2, 10, 15 and 18); 5 of 9 boss relics (locked: Seven Bells, Crowded Banners, Overclock at 15,
Pact of Embers at 18); 5 of 6 shop relics (Bellows at 18). The rule behind the choice: **every
locked relic is a rule-bender for a tower you already have**, so it feels like a new trick, not a
missing piece.

**Early unlocks skip ahead.** A commander brings its starting towers with it (the Seer brings
Beacon, the Warden brings Thornwood Grove). When the track later reaches an item that is already
unlocked, that level unlocks the next item on the track instead, so no level is ever empty.

**Pacing**: about 2300 renown over the track. A player averaging 40 a run for the first 4
runs and 100-150 after reaches level 10 around run 9 and level 20 around run 20-24. Something
unlocks on **every one of the first 6 runs**, and at least every second run after that until
level 20.

### Small permanent perks

Perks are deliberately small (together worth about one extra relic): they make the curve
gentler, not the player stronger than the content.

| Perk | Effect |
| --- | --- |
| Thick Walls | +2 max lives |
| Second Look | One card reroll per act |
| Scout | Rest option: see the next act's map and choose your start lane |
| Strike Off | One banish per act |
| Nest Egg | +25 starting crowns |
| Thicker Walls | +2 max lives |

Perks can be turned off in the run setup for players who want the clean game.

### Ascensions

Each commander climbs its own ten (R26): a win at level n with a commander unlocks n+1 for that
commander. Each level **adds one rule** and keeps all lower ones. Each changes how you play, not
only how big the numbers are. Exact rules: content.md 12.

| A | Name | Rule | What it changes |
| --- | --- | --- | --- |
| 1 | Hard Roads | One more elite per act; at least one elite stands between F1 and every shop (the elite-free path still exists, but it has no shop). | Shopping costs a risk. |
| 2 | Lean Coffers | Battle gold interest cap is halved. | Banking is weaker; build earlier. |
| 3 | Veteran Foes | One wave per battle carries an affix from the elites' list (Hasted, Plated, Runed or Many), shown on the skull. | Read the skull; one-damage-type builds suffer. |
| 4 | Wounded | Start with 16 / 20 lives. | The first rest is a real question. |
| 5 | Short Rest | Rest heals 25% of max; boss heals a third of missing. | Lives are tighter all run; leaks matter more. |
| 6 | Seasoned Elites | Elites carry 2 affixes from act I. | Elite nodes need a real answer from the first act. |
| 7 | Rubble | One pad per map is rubble until you pay 60 gold to clear it. | The best spot costs a tower's worth of gold. |
| 8 | Ill Omen | Start the run with the curse Doubt. | First waves need a plan from second one. |
| 9 | Swift Tides | The timer between waves is 20% shorter; the call-early bonus is halved. | Less time to think, less reward for greed. |
| 10 | The Tyrant's Guard | Act IV's Last Camp is replaced by a battle against a champion of an earlier boss you did not meet; the champion and the Tyrant carry a third mechanic (their Fury). | A second boss to beat with no camp between. |

### The codex

A book with tabs: **Towers, Boons, Relics, Enemies, Bosses, Events, Commanders, Runs**.
Unseen entries are silhouettes with "?", so the book shows exactly how much is left.

| Tab | Tracked | Completion hook |
| --- | --- | --- |
| Towers | Built count, kills, damage dealt, wins with it as top damage, each specialisation tried | (later: gold card for both specs used in a win) |
| Boons | Seen, taken, tempered | All boons of a tower taken at least once: its keystone art shows in full |
| Relics | Seen, taken, wins holding it | (later: gold card when taken in a win) |
| Enemies | Met, killed, leaked, worst leak, acts met in (one name per role, R32) | Killed 100: a short line of lore |
| Bosses | Met, defeated, fastest kill, ascension beaten at (all seven) | (later: border marks at A5 and A10) |
| Events | Seen, each choice taken | Every choice of an event taken once: the event shows its full story |
| Commanders | Runs, wins, best ascension, favourite towers | (later: portrait border at A10) |
| Runs | Run history (below) | |

The codex shows overall completion as a percentage on the title screen. There are no rewards
for completion beyond lore lines: the codex is a map of what is left, not a second grind. **Gold
borders are later** (R34).

### Run history and stats

The last **50 runs**, newest first, each with: commander, ascension, seed, result ("fell to the
Sand Wyrm, act II", "victory"), time, floor reached, the war table at the end (towers with boon
counts, relics), top damage tower, renown earned. Replaying a past run's path on its act maps is
**later** (R34).

Totals: runs, wins, win rate by commander, best ascension, fastest win, longest streak, most
lives at a win, most used tower, most picked relic.

### The Daily Siege (later, R34)

Not in v1. When it ships: one seed a day for everyone, a fixed commander and two modifiers
(content.md 13.4), perks off, one counted attempt a day, a score of floors, bosses and speed, and
the host's leaderboard once the game is ported.

### Seeds

Every run has a visible seed (six letters), shown on the summary from day one. A run can be
started from a seed; seeded runs give renown but don't count toward ascension unlocks.

---

## 9. The first run and the learning curve

Target (brief): first run usually dies in act I-II; a decent player wins around run 3-8;
ascensions ramp.

### What the first run looks like

- **Commander**: the Marshal (the only one). **Blessing**: fixed for run 1: Lucky Horseshoe,
  +8 max lives or 60 crowns. **Towers**: Archer, Barracks, Mage, which cover ground, air, armour
  and ward. The first battle (6 waves, 320 start gold, R13) teaches building and upgrading with
  just those three.
- **Act I map**: F1-F2 are battles and events only, so the first elite is at F3 at the
  earliest. The first reward screen is fixed: **Frost Spire, Bombard and Glass Bones** (the
  starter synergies and a keystone to want), so the first draft choice is a real one.
- **First run tutorial notes** appear once each, short and dismissable: on the first map ("Pick
  a path. The skull at the end is the boss."), first reward ("Take one. New towers go on keys
  1-6."), first elite node, first rest, first boss relic.
- From the second battle on, Setup offers the **ghost layout** (last battle's towers rebuilt on
  matching pads), so placement is learned once, not redone every battle.
- Expected outcome: a new player leaks 2-4 lives per battle, arrives at the act I boss (Gorrak
  or the Hive Queen) with 8-12 lives and loses to the war cry rush or the brood, or scrapes past
  and dies in act II. Renown
  ~30-55, which **always** unlocks the Alchemist tower (level 1 at 25), so the next run already
  has something new.

### Where the curve comes from

Three things each give part of the improvement between run 1 and the first win:

| Source | Share of the gain | How |
| --- | --- | --- |
| **Player learning** | ~60% | Placement at bends, upgrading over spreading, calling early, reading the skull, drafting a core, taking elites only when healthy. |
| **Unlocks** | ~25% | Alchemist (oil + fire), Storm Spire (shields), Beacon (shades) widen answers; the Alchemist and Seer commanders are stronger starts for some players; the relic unlocks are rule-benders. |
| **Perks** | ~15% | +2 max lives at level 3, a reroll per act at 7. |

A player who stops learning still crawls forward through unlocks and perks, so nobody hits a
hard wall; a player who learns fast wins on run 3-4 with almost nothing unlocked.

### What the balance bot must model

The bot plays `game/` headless. For the run layer it needs a **knowledge level** `k` from 0 to 1
that controls every decision, and it must earn renown and unlocks exactly like a player.

| Decision | k = 0.2 (novice) | k = 0.6 (decent) | k = 0.9 (expert) |
| --- | --- | --- | --- |
| Pad choice | random among free pads | best pad by path coverage 70% of the time | best pad always, support adjacency counted |
| Upgrades | spread across towers | finishes 2 towers to L3 before building more | specialises the core first |
| Call early | never | when the current wave is half dead and no leak risk | whenever safe, and banks for interest |
| Path | random fork | avoids elites below 50% lives, seeks shops with 100+ crowns | plans the whole act: elites at high lives, forge before boss |
| Card pick | highest rarity | prefers boons on its top-damage tower, partners of its core | values cards by simulated build score; skips when nothing fits |
| Rest | always Rest | Rest below 60%, else Drill | Rest/Drill/Fortify by expected lives at the boss |
| Shop | buys the first thing it can afford | relic if it fits a tag, else core boons | plans crowns for the next shop and lifts curses |
| Events | random choice | avoids life costs below 50% | takes risks when the payoff fits the build |
| Spells and supplies | cast on cooldown at the nearest enemy; supplies at once | cast on clumps and leaks; supplies in trouble | holds both for boss mechanics |
| Blessing | random | the one that covers its start's gap (air, lives) | by expected run value |

**Learning model**: `k(run) = min(0.75, 0.2 + 0.09 x (run - 1)) + noise(0.05)` for the "learning
player" persona; it gains renown and unlocks as it goes. Other personas: fixed k 0.2 (stays
novice), 0.6 (decent, everything unlocked), 0.9 (expert, for ascension tuning).

**Targets the sim checks** (1000 seeded runs per persona, per commander):

| Check | Target |
| --- | --- |
| Learning player, run 1: died in act I | 45-60% |
| Learning player, run 1: died in act II | 30-45% |
| Learning player, run 1: win | < 3% |
| Learning player: first win by run 8 | 60-75% of simulated players |
| Learning player: median first win | run 5-6 |
| Decent (k 0.6) win rate at A0 | 35-50% |
| Expert (k 0.9) win rate at A0 / A5 / A10 | 80% / 50% / 15-25% |
| Each ascension lowers expert win rate by | 4-10 points, no step over 15 |
| Run length (win, k 0.6, mixed speed) | 30-45 min sim-estimated |
| Any tower's share of wins as top-damage tower | 5-15% (12 towers, none dominant) |
| Any card or relic: pick rate when offered | 10-70% (below 10% = dead pick, above 70% = must-pick) |
| Win-rate lift from holding any one relic | < 8 points |
| Each commander's win rate (k 0.6) | within 8 points of the Marshal (Quartermaster may sit 5 below) |
| Each alternate boss vs its pair (k 0.6) | death rate within 5 points |
| Cap-lifter win-rate lift | at most 15 points (R19) |

The bot's card-value function also produces the **"no dead picks"** report: every card's pick
rate and its win rate when picked against when skipped.

---

## 10. Hooks

### Things to look forward to inside a run

- **The boss at the end of the map.** From the first second of an act, the boss portrait (one of
  the act's two, rolled at the act start) sits at the right edge with its two headline mechanics. Every path choice is also "how do I get ready
  for that". Hovering shows which of your towers answer it ("Frost Spire: freeze slows the war
  cry rush").
- **The next act preview.** After each boss, the next act's map rolls in from the right, with
  its boss portrait and its elites marked, while the boss relic choice is still open. You pick
  the boss relic knowing what's coming.
- **The treasure in the middle.** One chest per act on F4: a reason to bend the path.
- **Elites you can name.** Elite nodes show which elite they hold, so "I'll take the warlock but
  not the juggernaut" is a plan. Battle nodes show their theme ("Raiders: rush and swarm").
- **A rare event.** The Wandering Merchant and the Ruined Chapel are rare and unlockable; their
  first appearance has a soft chime and a gold frame on the event.
- **Supplies in the pocket.** Two war-supply slots carried from battle to battle: a bell saved
  for the boss is a plan you made two floors ago.
- **The rare card glow.** Rare cards flip in last with a brighter edge; a keystone that
  completes a pair you hold ("Tidewater Vial: you have Frost Spire and Pyre") says so.
- **Core marks.** A tower with 3+ boons gets a small star on its key; at 5+ two stars. Watching
  your core grow is a visible thread through the run.
- **Bounties.** A clear, optional goal in an ordinary battle.
- **The Last Camp.** Act IV's single camp is a quiet beat before the end: the music drops, the
  whole war table is laid out once, and you make the final preparation.

### The end-of-run summary

One screen, in this order, each part arriving in turn (Enter skips the animation):

1. **The result line.** "Victory at the Ember Citadel" or "Fell to the Sand Wyrm, act II,
   floor 4".
2. **The path.** The four act maps side by side, small, with your path traced and each node
   coloured by how it went (no leaks, some, many).
3. **Your war table.** Towers with their boons and stars, relics, curses.
4. **Damage by tower**, a bar for each, with the top tower named ("Your Frost Spire froze 612
   enemies").
5. **Three highlights**, chosen from the run's stats: biggest single hit, most kills in a wave,
   a perfect boss, the closest call ("won with 1 life"), most crowns held.
6. **Renown tally**, line by line, then the **unlock bar** filling, with the name and icon of
   the next unlock and how much is left.
7. Buttons: **Again** (Enter: same commander, new seed), Change commander, Codex, Menu.

### "Almost won" signals

When a run ends close to something, the summary says so plainly, once:

- Died to a boss: "The Sand Wyrm had 14% health left." (shown as a bar with the gap marked)
- Died in a battle: "2 more lives and you'd have reached the camp."
- New furthest floor: "Your furthest yet: act III, floor 2."
- Close to an unlock: "12 renown to Storm Spire."
- Close to an ascension: on a win, the next ascension's rule appears ("Next: Ascension 4,
  Wounded").

These are the strongest pull to press Enter again, and they must be **true**: they come
straight from the run's numbers, never invented.

### Keys outside battle (720x390)

| Screen | Keys |
| --- | --- |
| Map | Left / right arrows: pick the next node among the reachable ones; up / down: move between lanes; Enter: go; Z: zoom in on the current floors; V: war table; Tab: cycle focus; M: mute (R28) |
| Reward | 1-3 (or 1-4): pick; S: skip; R: reroll; Enter confirms |
| Shop | Arrows between items; Enter buy; Esc leave |
| Rest / forge / event | 1-3: choose; Enter confirm |
| Summary | Enter: again; C: codex; Esc: menu |

Every node, card and choice has a tooltip on hover and on keyboard focus.

---

## Changes from the brief, and why

| Brief | Here | Why |
| --- | --- | --- |
| Boss: "heal" | Heal half of missing lives | Helps the struggling run more than the strong one; keeps the novice curve alive without rewarding leaks. |
| Elite: "relic pick" | Pick 1 of 2 relics, plus a card with no commons | A pick needs two options; the card makes elites clearly worth more than battles. |
| Battle reward: "rarely relic" | 4% in the wild slot only | Relics stay the elite's reward; the wild slot keeps surprise alive. |
| Node list | Added **bounty** and **treasure**; event nodes are "?" that can roll a battle, shop or treasure | Bounties add optional goals to plain battles; treasure gives the map a pull; "?" keeps events uncertain. |
| ~6 floors | 5 content floors + a rest floor + the boss | A guaranteed rest before every boss without losing a content floor. |
| Act IV "short" | Fixed 3-node act: road or gatehouse, the Last Camp (shop and rest), the final boss | A payoff, not another map. |
| 4 commanders | 5: added the **Warden** (blocking), unlocked at renown level 6 | Blocking was the only archetype with no commander; the first win now unlocks Ascension 1 for that commander and a rare-relic blessing instead (R27). |
| Battles 8-12 waves | Normal battles at 7 / 8 / 9 / 9 waves by act, elites +1, bosses 7 + boss (R13) | 13 fights at 12 waves runs past 50 minutes, and setup time counts. |
| (not in brief) | **Curses** | Gives events and the boss relic tier a currency of risk besides lives. |
| (not in brief) | Selling disabled during the final wave | Stops sell-everything abuse of leftover-gold conversion (settled). |
| 4 bosses | 7: acts I-III roll one of two (R21) | Runs differ from the first act on, and boss prep becomes a map read. |
| (not in brief) | A blessing at run start, war supplies, battle themes (R20, R23, R24) | More to choose and more to see in every run. |
| (not in brief) | 6 starting towers named: Archer, Barracks, Mage, Bombard, Frost Spire, Pyre | Covers every damage type and two of the brief's synergies (frost + physical, blockers + splash) at the start; oil + fire completes with the first unlock. |

## For the other designers

- **Systems**: (settled) battle tier by floor, leak costs, interest, call-early bonus, selling
  during the final wave, the bounty conditions' tracking, the ascension 3, 6, 7 and 9 rules, the
  spell and supply numbers, and the boons table's battle effects.
- **Art**: the act map (left to right, 4 lanes, the whole act in 2D on the walnut table), node
  icons including the bounty, boss portraits for all seven bosses, theme labels, the card frames
  by rarity and kind, core stars on tower keys, curse cards, supply glyphs, the codex silhouettes,
  the summary screen.
- **Content writer**: every relic, boon, event and curse above needs its final numbers and a
  line of flavour; keep each effect to one line and the prose quiet.
