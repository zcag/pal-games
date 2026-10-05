# Ramparts: design

A tower defense roguelike. Kingdom Rush's towers, soldiers and spells inside a Slay the
Spire run: three acts and a final citadel, a branching map of battles, elites, shops, events,
forges and camps, a war table of towers, boons and relics drafted along the way, and a
meta layer of unlocks, commanders and ascensions that pulls you into one more run.

This file is the design's front page: what the game is, the decisions that hold it together,
and the lead's rulings where the chapters disagreed. The chapters hold every rule and number
and are the source of truth for their area:

| Chapter | Scope |
| --- | --- |
| [`design/systems.md`](design/systems.md) | the battle: loop, gold, threat budget, damage model, statuses, targeting, blocking, the 12 towers and 24 specialisations, the synergy web, enemies and counters, bosses, map generation, spells, sim events, determinism |
| [`design/run-meta.md`](design/run-meta.md) | the run: act maps, nodes, draft and rewards, crowns and lives, relics, events, curses, commanders, renown, unlocks, perks, ascensions, codex, learning curve, hooks |
| [`design/content.md`](design/content.md) | every table with final numbers and flavour: towers, boons, enemies, bosses, waves, relics, curses, events, commanders, ascensions, unlocks, glossary |
| [`design/art.md`](design/art.md) | the look: diorama framing, camera, per-act palettes, readability spec, towers, VFX, lighting, UI, juice list, critic checklist |
| [`design/architecture.md`](design/architecture.md) | code layout and ownership; `game/types.ts` is the contract |

## Pillars

1. **A build you chose.** You start with three towers and end with up to six, but a win is
   carried by two or three core towers made to work together by boons and relics. Every
   reward screen leans you toward a core and always has one wild card that ignores it.
2. **Every tower answers something, every enemy punishes something.** Twelve towers with
   distinct jobs, fifteen enemy roles with counters and anti-counters, fourteen named
   synergies you discover by seeing them happen, one deliberate anti-synergy (fire and ice
   cancel). No battle is solved by one damage type.
3. **Every node is a trade.** Lives against power, crowns now against later, the safe path
   against the elite. Lives are the run's health; leaks are the damage.
4. **Calm stage, loud actors.** A lit low-poly diorama that is beautiful at rest and readable
   in chaos: the road reads first, enemies are the only saturated bodies, projectiles the only
   bright movers, effects stay behind and below. Designed at 720x390, polished at 1440x900.
5. **Every hit lands.** Impact flashes, hitstop on big kills, shatter chimes rising in pitch,
   coins flying to the counter, a horn when an elite arrives; music that swells with the
   pressure of the wave.
6. **Short failures, long wins, always a next thing.** A losing first run takes 12-20
   minutes and always unlocks something; a win takes 30-45. The summary says exactly how close
   you came and what unlocks next.

## The game in one page

**A battle** (systems 1-13). A generated map: a road (single, merging, forked or twin lanes)
from a horde gate to our gate, 9-14 fixed build pads placed so bends and clusters matter, an
air route that cuts the corners. Setup is untimed and shows every enemy role the battle will
send. Space starts wave 1; after each wave spawns, a 10 s countdown runs to the next, which
can be called early for gold. Gold comes from kills, wave income, interest on banked gold
(5%, capped) and call-early bonuses. Towers go L1 -> L2 -> L3 -> one of two
specialisations; soldiers block; two commander spells on Q and W. 8-10 waves, about two
minutes at 1x. A leak costs 1-3 lives (a boss 10). Selling refunds fully in setup, 70% after,
and is disabled during the final wave.

**The towers**: Archer, Barracks, Mage, Bombard, Frost Spire, Pyre (start); Alchemist, Storm
Spire, Beacon, War Banner, Ballista, Thornwood Grove (unlocked). Damage types physical
(armour), magic (ward), fire (only fireproofing; cancels ice), pure (rare). Statuses: slow,
chill -> frozen, burn, oiled -> ignite, marked, hexed, brittle, shred/corrode, stun, root,
revealed, shields. Same effect from two sources: strongest wins; different effects add into
one pool; pools multiply once. Great combos land at 2-3x, never 20x.

**The enemies**: footman, runner, brute, acolyte, shieldbearer, shaman, splitter, shade,
swarmling, sapper, bat, drake; elites juggernaut, warlock, matron with affixes from act 2;
bosses Gorrak the Warlord, the Sand Wyrm, the Frost Colossus and the Ember Tyrant, each with
telegraphed phases that test a different part of a build. Silhouette = role in every act;
each act renames and recolours them and adds one trait (desert armour, cold-blooded peaks,
fireproof citadel).

**A run** (run-meta 1-7). Acts I-III: a left-to-right map of 7 floors, 4 lanes: battles
first, then battles, elites, events (?), shops, forges, bounties and one treasure, a floor of
camps, the boss. Act IV: the Ash Road or the Gatehouse, the Last Camp, the Ember Tyrant.
About 13 fights and 44 real decisions in ~38 minutes. Rewards: pick 1 of 3 cards (boons,
blueprints, rarely a relic) after battles; relics from elites; boss relics with real downsides.
94 boons (7 per tower including a keystone, plus 10 universal), 45+ relics, 18 events, 8
curses, 5 commanders with a starting relic, a passive and two spells.

**The meta** (run-meta 8-10). Renown from every run fills a 20-level unlock track (towers,
commanders, relics, events, small perks), with something new on each of the first six runs.
Ascensions 1-10 each add one rule. A codex of everything met, run history, a daily siege,
seeds.

**The look** (art). Each battle is a floating slab of land with layered cliff edges, hanging
roots, a waterfall off the edge, clouds below; a 30° camera pitched 57°; one warm low sun,
cool fill, soft shadows, neutral tone mapping and restrained bloom. Meadow -> Desert ruins ->
Frozen peaks -> Volcanic citadel, each with its own palette, particles, props and enemy key
colour. UI in dark blue enamel with brass frames, Cinzel and Nunito Sans, never over the
playable area. The run map is a carved model of the act on a walnut table.

## Lead rulings (where chapters disagreed or left a question open)

| Question | Ruling | Why |
| --- | --- | --- |
| Battle difficulty by floor (run-meta asks systems) | content.md's floor factor 0.90-1.10 (boss 1.00) | averages 1.0 so systems' totals hold |
| Normal battle wave count | 7 / 8 / 9 / 9 by act, elites +1 (revision R13) | setup time was missing from the budget |
| Selling in the final wave | disabled | leftover-gold crowns can't be farmed by selling out |
| Firestorm hits air | yes, kept; the balance bot watches Pyre's win share | Pyre needs an answer to the Tyrant's flight like every other core |
| Treasury + Quartermaster | allowed; Ledger's 5:1 conversion keeps its 20-crown cap | the cap bounds the loop |
| Which pool a boon adds into | content.md tags every boon with its pool; no boon multiplies outside the pools | keeps systems' caps meaningful |
| Damage numbers | art's rule: crits, big hits, shatter/explosion totals, boss hits; max 10 on screen | readability first |
| Daily Siege and seeds | in scope after the core run; seed shown on the summary from day one | |

## Balance targets (measured by `scripts/sim.ts`; results in README)

- Learning-player persona: run 1 dies in act I (45-60%) or II (30-45%); first win by run 8 for
  60-75% of players, median run 5-6.
- Decent bot (k 0.6) wins 35-50% at A0; expert (k 0.9) 80% / 50% / 15-25% at A0 / A5 / A10.
- No tower's win share as top damage outside 5-15%; no card or relic picked under 10% or over
  70% when offered; no relic lifts win rate by more than 8 points.
- Battle length 2:00-3:15 at 1x; a run 30-45 minutes counting setup (30 s per battle).
- Each spec's share when its tower is specialised: 35-65%. A tower built 2+ times in half the
  battles of more than 60% of winning runs is flagged (catches blockers that never top damage).
- Dead picks judged by win rate when forced vs skipped, not only by the bot's own pick rate.

## Controls

| Key | Battle | Outside battle |
| --- | --- | --- |
| 1-6 | build that tower on the focused pad (or pick it, then click a pad) | pick a card / choice |
| Space | start wave 1 / call the next wave early | |
| U / X / T / R | upgrade / sell / cycle target mode / move rally | |
| 1 / 2 on an L3 tower | choose a specialisation | |
| Q / W | commander spells (aim with mouse or arrows, Enter casts) | |
| Arrows, Tab | move between pads | move on the map / between items |
| F | speed 1x / 2x / 3x | |
| P | pause (menu with mute, shake, numbers, speed) | |
| Backspace | cancel aim > close radial > pause | back |
| Enter | confirm | confirm / go |
| M | mute | mute |

In pal, Escape belongs to the panel: it leaves the game, and leaving pauses a battle. Backspace
does what Esc did in the standalone game (R28's order below), and the volumes are pal's settings for
the game (volume, music, effects).

## Revision 1: rulings on the design critique

An independent critic reviewed every chapter (findings P0/P1/P2). These rulings **override the
chapters** wherever they differ; the chapters are being swept to match. Numbers here are final
first-pass values for the build and the balance bot.

### Exploits and traps (fixed before any tuning)
- **R1 Boss leaks loop.** A boss reaching our gate costs 10 lives, re-enters at its horde gate with
  its HP and phase, +20% speed per lap. The battle ends only when the boss dies. Lucky Horseshoe,
  Leaking Roof, Pact of Embers and Phoenix-style effects never apply to bosses or elites.
- **R2 Air in battle 2.** A commander with no air reach is always offered an air blueprint (Archer,
  Mage, Frost, Storm) in slot B of its first reward. Act I bats max 10 on floors 2-3. Circle spells
  (Meteor, Firebomb, Bramble Surge, Tar Pit) hit flyers at 50% (slows/roots never).
- **R3 Cost stacking.** Veteran, Overseer, Siege Engine and every discount route through the `cost`
  pool, -50% per purchase floor. Overseer: L3 costs 40% less. Siege Engine: towers built at L2 for
  L1 + half the L2 cost; no calling early. Veteran never offered with Siege Engine.
- **R4 Pad geometry.** Pad 1.6 u across, tower base 1.4 u, pads >= 2.0 u apart, >= 1.3 u from the
  path centre line. Clusters: >= 3 pads within 2.8 u of one pad.
- **R5 Elite relic** only if every elite of the battle died; otherwise the card reward only.
- **R6 Wild slot** boons only for owned towers.
- **R7 Tyrant flight** lands at its take-off path point + at most 6 u.
- **R8 Lobbed prediction** is a straight line along the enemy's current heading, so fast enemies
  dodge shells at bends ("Bombards like straights").
- **R9 Cross-CC**: any hard CC (stun, root, freeze, pull) grants 1 s immunity to all hard CC.
- **R10 Summons** give no gold after the last wave has spawned.

### Balance reworks
- **R11 Treasury** (spec cost 1.8c): +25% bounty in aura, and +1 crown per wave it stood through,
  paid after the battle outside the leftover cap. **Quartermaster Q Requisition**: the selected
  tower gains one level (not specialisation) at 50% of its cost, 30 s cooldown. **Rally** 8 s / 40 s.
- **R12 Specs**: Shrapnel shred cap 10 (its own), Firestorm hits air at 50%, **Hex raises the
  damage-taken cap to +150% on hexed enemies** (Hexer's unique job). Paladins hold 2 only above 50% HP.
- **R13 Pacing**: normal battles 7 / 8 / 9 / 9 waves by act, elites +1, boss battles 7 + boss wave
  (act IV 8 + boss). Run 1 battle 1: 6 waves, 320 start gold. The first reward of run 1 shows Frost
  Spire, Bombard and Glass Bones. **Ghost layout**: Setup offers "your last battle's towers on matching
  pads" (Enter accepts, only towers you can afford, in priority order).
- **R14 Curses** worth -60 to -80 crowns a run: Cold Hands = your first tower each battle costs +50%;
  Debt = -10 crowns per battle; Leaking Roof = every leak +1 life, max +3 per battle; Toll = 15
  crowns per shop; Dread = bosses +15% HP; Doubt = setup timed at 20 s; Rust and Haunted as written.
- **R15 Fireproof** 25% on act IV natives, 30% on the Tyrant. New rare relic **Dragonglass**: fire
  ignores fireproof. **Colossus** Numbs at 800 chill instead of full immunity.
- **R16 Cuts**: Last Stand, Sapper-proof, Bounty (boon), War Tax, Gilded Ledger, Hexed Candle.
  **Reworks**: Royal Mint +150 x gold, -15% bounty; Snowglobe also chills the boss escort; War Chest
  +40 x gold; Field Forge = banners stack (the two best auras add); Echo Stone = first damage spell
  cast twice at 60%, non-damage spells instead recharge 50% at once; Glass Arrows physical; Crossroads
  candle gives Toll, not Haunted; Avalanche "Go quietly" also +20 crowns; Mirage Market loses the most
  expensive item, shown up front.
- **R17 Leftover gold** converts at 1 crown per 10 / 14 / 18 / 22 gold by act, max 12.
- **R18 Blueprints 5 and 6** each raise every L1 cost by 5% (owning six is a choice).

### Breakable builds (what players chase)
- **R19 Cap-lifters**: six rares lift one cap each, judged by win-rate lift (<= 15 points), not by a
  damage ceiling: **Field Forge** (banners stack), **Hexer** (taken cap +150%), **Endless Winter**
  (rare Frost boon: shatter chains have no limit and each link +10%), **Deadeye's Oath** (rare relic:
  crits on marked x5), **Wildfire Crown** (rare relic: burns stack up to 3 sources), **Overclock**
  (boss relic: attack-speed cap +200%, towers overheat: -1 range).

### More to do and see
- **R20 War supplies**: 2 consumable slots (keys **E** and **D**), 10 kinds: oil barrel (puddle r 1.2),
  frost flask (freeze r 1.5), gold cache (+60 x gold), spike trap (60 phys x act on the next 8
  passing), war horn (+30% attack speed 8 s), mason's kit (ends every disable), flare (reveal all 10
  s), heavy bolt (300 x act pure to the strongest), bell (stun all for 1.5 s), lifeblood (+2 lives).
  Elites drop one, shops sell two (20-35 crowns), events and treasure grant them, the blessing can.
- **R21 Alternate bosses**: each of acts I-III rolls one of two bosses at the act start, shown on the
  map: act I Gorrak or **the Hive Queen** (matron body; births bats and swarmlings, burrows her brood
  into the road), act II the Sand Wyrm or **the Lich** (warlock body; raises the dead that fall,
  ward 65 shield phases), act III the Frost Colossus or **the Pack-Lord** (runner body XL; howls
  hasted packs, leaps ahead along the path). Act IV is always the Ember Tyrant.
- **R22 Events**: 30 at launch (12 any act, 6 per act I-III). Text plus a glyph vignette.
- **R23 Blessing**: each run starts with a pick of 3 from: a common relic, a 4th blueprint, swap a
  starting tower for a rare boon, +8 max lives, 60 crowns, two war supplies.
- **R24 Named battle themes**: every battle node rolls a theme with 2 archetypes at x3 weight
  ("Raiders: rush and swarm"), shown on the node.
- **R25 High ground**: 1 pad per map (2 from act III) gives +15% range; drawn as a raised pad.
- **R26 Ascension per commander** (StS-style): each commander climbs its own 1-10. A4 stays; A6
  becomes "elites carry 2 affixes from act I"; A7 becomes "one pad per map is rubble until you pay
  60 gold to clear it"; the rest as written.
- **R27 Warden** unlocks at renown level 6 (events move to 7); the first win gives Ascension 1 for that
  commander and a rare relic choice for the next run's blessing. **Seer** starts with Archer instead
  of Beacon (Beacon stays unlocked by the Seer).

### Clarity and UX
- **R28 Keys**: specialisations only inside the open radial (U on an L3 opens the choice, 1/2 picks);
  M mute everywhere, Z zooms the run map; Tab only cycles focus, V shows the war table; Esc priority:
  cancel aim > close radial > pause; X sells on a second press within 1.5 s; **Alt** (hold) shows
  every tower's range; E/D war supplies.
- **R29 HUD**: the top band holds the skull, a 6-icon next-wave strip (with heart pips for leak
  cost), the bounty chip and, during boss waves, the boss bar. Nothing over the playable rect.
- **R30 Cards**: 116 px wide when 5 show; card body <= 80 characters, full text in the tooltip.
- **R31 Run map**: the whole act visible at once in 2D, framed by the walnut table.
- **R32 Names**: one name per enemy role (act natives are recoloured; the codex notes the act).
  One affix list for elites and ascension waves.
- **R33** Camera breathing off below 900 px width. Projectile speeds come only from content.

### Scope for v1
- **R34** All 12 towers and 24 specs, 5 commanders, all boons with numbers in content.md minus
  R16's cuts (tempered = +50% of the boon's numbers unless content wrote a rule), ~45 relics, 30
  events, 8 curses, 10 supplies, 7 bosses, single/merge/fork lanes. **Deferred**: twin lanes, the
  daily siege, run-history path replay, codex gold borders. Relics, events and cards use the SVG
  glyph set.
