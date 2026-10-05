# Ramparts: battle systems

Owner: systems designer. Scope: everything that happens inside one battle, precisely enough to
build a deterministic 30 Hz sim in `game/`. The run layer (map nodes, relics, boons, events,
shops, commanders, ascension) is `run-meta.md`; the art is its own doc. Where they plug in here
it is named as a **hook**. Numbers are first pass: the content writer turns them into
`design/content.md` tables and the headless bot tunes them. Intent is stated next to each
number so a tuning change can be judged against it. DESIGN.md's Revision 1 rulings (R1-R34) are
applied here; `content.md` holds the final numbers, and where a number below differs, content.md wins.

Design rules this doc follows:

- **A rule you can learn by watching.** Every effect has a visible tell (tint, icon, number
  colour, sound) and one plain sentence in the codex. No hidden rolls except crits.
- **Strong synergies, linear stacking.** Same-kind bonuses never multiply with themselves;
  different kinds multiply once. A great combo is 2-3x, never 20x.
- **Every tower answers something, every enemy punishes something.** The counter table is
  the balance spine; the bot checks it.
- **Fixed numbers.** Tower damage is a fixed value per hit (no damage ranges). The only
  combat roll is the crit. It keeps the bot honest and the numbers readable.

---

## 0. Units and conventions

| Thing | Unit | Notes |
| --- | --- | --- |
| Distance | **u** (one path width) | Playfield is 32 x 18 u. A pad is 1.6 u across; a tower base 1.4 u (R4). |
| Time | ticks, 30 per second | Every duration below in seconds is `round(s * 30)` ticks. |
| Speed | u/s | Footman 1.1 u/s is the reference walker. |
| Range | u, pad centre to enemy centre | Circles. Aura ranges between towers are pad centre to pad centre. |
| Damage over time | per second, applied in ticks | DoTs tick every 0.5 s (15 ticks) unless stated. |
| Percent stats | whole percent points | Armour 45 means 45% physical reduction. |
| Act scaling | `act` = 1..4 | Act 4 is the short volcanic act. |

Per-act multipliers used throughout:

| | Act 1 Meadow | Act 2 Desert | Act 3 Peaks | Act 4 Citadel | Intent |
| --- | --- | --- | --- | --- | --- |
| `hpMul` enemy HP | 1.0 | 1.4 | 1.9 | 2.4 | tougher bodies |
| `B` threat base (wave 1) | 10 | 14 | 19 | 24 | more bodies per wave |
| `bountyMul` | 1.0 | 1.1 | 1.2 | 1.3 | gold grows slower than threat |
| `spellMul` spell damage | 1.0 | 1.4 | 1.9 | 2.4 | spells have no gold upgrades, so they track `hpMul` |
| Start gold | 260 | 330 | 400 | 470 | two or three L1 towers |
| Interest cap | 20 | 25 | 30 | 35 | |
| Waves (normal battle; elite +1; boss 7 + boss, act IV 8 + boss) | 7 | 8 | 9 | 9 | setup time is part of the run budget (R13) |

Total enemy toughness per battle grows about 5.5x from act 1 to act 4 (bodies x HP); battle
gold grows about 3x. Gold buys ~2.5x power (upgrades lose efficiency, 8.1), so the run (boons,
relics, a wider war table, synergies) must supply ~2.2x. That gap is the roguelike's
progression and the first thing the bot measures (13.5).

---

## 1. The battle loop

### 1.1 Phases

```
SETUP (untimed) --Space--> WAVE 1 spawning --> countdown --> WAVE 2 ... --> LAST WAVE --> CLEAR --> VICTORY
                                     \______ Space (call early) ______/
lives <= 0 at any tick --> DEFEAT
```

1. **Setup.** The map, the lanes, all pads (high ground and rubble marked, 10.3), the battle's
   **theme** and the **battle roster** (every enemy role this battle will send, 9.6) are shown.
   Gold = start gold. No clock runs (curse Doubt: 20 s); the skull at each spawn used by wave 1
   pulses. Build, upgrade, sell (full refund here), clear rubble, move rally points, use war
   supplies; from a run's second battle, Enter accepts the **ghost layout** (last battle's towers on
   matching pads, content 2.1). Spells cannot be cast. Space starts wave 1.
2. **Wave spawning.** A wave is a list of groups; each group spawns its enemies at a fixed
   spacing (9.5). A wave spawns over 5-10 s; the biggest late waves take longer (content 6.1).
3. **Countdown.** When the **last enemy of the current wave has spawned**, the next-wave timer
   starts at `G` = 10 s (acts 1-2) / 9 s (acts 3-4). At 0 the next wave starts by itself. Waves
   overlap freely: there is no "wave cleared" gate.
4. **Call early.** During a countdown, Space (or clicking a skull) starts the next wave now and
   pays the call-early bonus. Not possible while a wave is still spawning, so Space spam cannot
   stack three waves into one.
5. **Last wave.** After the last wave has started, selling is disabled. After it has spawned there
   is no countdown; the skull becomes a banner. The battle ends when no enemy is alive or pending
   (splitter children, summons being channelled and burrowed bosses all count as alive).
6. **Victory** when the last wave has spawned and nothing is alive; in a boss battle, the tick the
   boss dies (everything left flees, R1). **Defeat** on the tick lives
   reach 0, even mid-wave: the sim emits `defeat`, keeps stepping 60 ticks so the last leak plays
   out in the surface's slow motion, then stops.

Building, upgrading, selling, rally moves, target-mode changes and spell aiming all work at any
time, **including while paused** (13.1).

### 1.2 Pacing target

| Battle | Waves | No early calls (1x) | Typical (half called early) |
| --- | --- | --- | --- |
| Act 1 battle | 7 | ~2:20 | ~1:55 |
| Act 3 battle | 9 | ~2:45 | ~2:15 |
| Elite | +1 wave | +17 s | |
| Boss | 7 (act IV 8) + boss wave | ~2:20 + boss fight (60-90 s) | |

A wave cycle is spawn (~7 s) + countdown (10 s) ≈ 17 s. The last wave adds 25-35 s to clear. Setup
is not counted here; `run-meta.md`'s budget adds ~30 s of setup per battle (R13). Run 1's first
battle has 6 waves and 320 start gold.

### 1.3 Leaks and lives

An enemy that reaches the exit is removed, pays no bounty, and costs **lives = its leak value**
(a boss is not removed: it loops, below):

| Leak | Who |
| --- | --- |
| 1 | footman, runner, swarmling, bat, splitter children, summons, boss adds |
| 2 | brute, acolyte, shieldbearer, shaman, splitter (whole), shade, sapper, drake |
| 3 | elites (juggernaut, warlock, matron) |
| 10 | bosses |

**Boss leaks loop** (R1): a boss at our gate costs 10 lives and re-enters at its horde gate with its
HP and phase (statuses cleared), +20% speed per lap; the battle ends only when it dies. Leak-cost
modifiers (Lucky Horseshoe, Leaking Roof, Pact of Embers) and Phoenix Feather never apply to a boss
or elite leak.

Lives are run HP (start 20). Leaks are the run's damage: a first run dies by leaks across acts
1-2, not in one battle. Bot target: an average act-1 battle by a new-player bot leaks 1-3 lives;
a decent bot leaks 0-1.

---

## 2. Gold

All gold is integer; every formula rounds half up.

| Source | When | Amount | Intent |
| --- | --- | --- | --- |
| Start gold | Setup | 260 / 330 / 400 / 470 by act | two or three L1 towers |
| Bounty | enemy dies (any cause: towers, soldiers, spells, shatters) | `round(threat * 5 * bountyMul)`; summons (Risen, births, boss adds) pay nothing once the last wave has spawned (R10) | ~55% of battle gold |
| Wave income | each wave start from wave 2 | `round(12 * bountyMul)` | a floor for builds that kill slowly |
| Interest | each wave start from wave 2, computed **before** wave income and call-early bonus are added | `min(cap, floor(gold * 5%))` | rewards banking ~400 gold |
| Call-early bonus | when you call early | `ceil(remaining_s * 3 * bountyMul)` | up to ~30 gold per wave |
| Sell | X, pressed twice within 1.5 s (R28) | 100% of spent in Setup, 70% after, **disabled once the last wave has started** | free experimenting before wave 1, no mid-battle build-and-sell trick, no selling out for crowns |

**Interest vs calling early** is the intended tension: interest wants gold left unspent, calling
early pays only if the defence already holds, and it costs build time. Interest is computed on gold
held at the instant the wave starts, so calling early neither dodges nor double-counts it.

Expected act-1 battle gold (7 waves, ~108 threat at floor 1.00): bounty ~540 + wave income 72 + start
260 + interest ~85 + call-early 0-100 ≈ **960-1,060**. Act 4 (9 waves, ~373 threat) ≈ **3,300**.

Leftover gold converts to crowns per `run-meta.md` (1 crown per 10 / 14 / 18 / 22 gold by act, max
12, R17). That is a second reason to bank, and it is why interest is capped low. A Treasury pays +1
crown per wave it stood through, outside that cap (R11).

Hooks: relics, boons and commander passives modify start gold, bounty %, interest rate/cap, sell %
and wave income by adding into the formulas above (additive percent pools), never by multiplying each
other.

---

## 3. Threat budget per wave

Each enemy has a **threat** cost (9.1). Wave `w` of a battle in act `a`:

```
T(w) = B[a] * (1 + 0.15 * (w - 1)) * node * floor * shape(w)
shape(w) = 1.30 on the last wave
           1.20 on every 4th wave (4, 8) unless last
           0.85 on the wave right after a 1.20 wave   (a breather)
           1.00 otherwise
node     = 1.00 battle, 1.15 elite, 0.90 boss (pre-boss waves)
floor    = 0.90-1.10 by floor (content.md 1)
```

| Act (floor 1.00) | Wave 1 | Wave 5 | Last | Battle total |
| --- | --- | --- | --- | --- |
| 1 (7 waves) | 10 | 13.6 (breather) | 24.7 | ~108 |
| 2 (8 waves) | 14 | 19.0 | 37.3 | ~180 |
| 3 (9 waves) | 19 | 25.8 | 54.3 | ~295 |
| 4 (9 waves) | 24 | 32.6 | 68.6 | ~373 |

- **Elite nodes**: 1 more wave than a battle; the elite unit(s) come **on top** of the budget (their
  threat is not spent from `T`), at wave `ceil(N/2)` and on the last wave (acts 3-4: two on the last
  wave).
- **Boss nodes**: waves 1..N at `node 0.9` (N = 7 in acts 1-3, 8 in act 4), then the **boss wave**: the
  boss plus an escort of `0.6 * B[a]` threat. The boss's own summons are not budgeted.
- **First battle of a run**: no flyers (several commanders start with no air reach; `run-meta.md`
  gives them battle 1 to find it, and R2 guarantees an air blueprint in their first reward). First air
  wave of a run is battle 2, wave 4 at the earliest; act I floors 2-3 send at most 10 bats a wave.

Ascension hooks: the A3 wave affix (Many: x1.30), A6 elite affixes, A9 countdown. They plug in as extra
factors here; content.md 12 owns which.

---

## 4. Damage model

### 4.1 Types

| Type | Reduced by | Who deals it | Number colour |
| --- | --- | --- | --- |
| **Physical** | armour | Archer, Barracks, Bombard, Ballista, Thornwood, Treant | white |
| **Magic** | ward | Mage, Frost, Storm, Alchemist | violet |
| **Fire** | fireproof only (act-4 natives 25%, Ember Tyrant 30%; Dragonglass ignores it) | Pyre, ignite, Naphtha, Meteor, Firebomb | orange |
| **Pure** | nothing (shields still absorb it) | Shatter burst, Judgement, Heavy Bolt | gold |

Fire skips armour and ward on purpose: it is the universal answer, paid for with short range,
ground-only reach, the fire/ice conflict (5.3) and act-4 fireproofing. Pure is rare on purpose so it
stays exciting.

### 4.2 Resist tiers

Armour and ward are percent reductions in fixed tiers so the player can learn them by sight (the
enemy's plate / rune glow grows per tier):

| Tier | Value | Tell |
| --- | --- | --- |
| none | 0 | |
| light | 25 | small plate / faint runes |
| medium | 45 | plate / runes |
| heavy | 65 | full plate / bright runes |

Bosses and elites may sit between tiers (30, 55). Hard cap 80.

### 4.3 The formula

One hit, in this order:

```
1. raw    = base * (1 + DEALT)              DEALT: sum of tower-side bonuses (War Drums, boons, relics)
2. crit   = direct hits only: if roll < critChance then raw *= critMult   (default 2.0)
3. resist   physical: armourEff = max(0, armour - 5 * shredStacks) * (1 - pierce)
                      raw *= (1 - armourEff / 100)
            magic:    wardEff = max(0, ward - 5 * corrodeStacks)
                      raw *= (1 - wardEff / 100)
            fire:     raw *= (1 - fireproof / 100)
            pure:     unchanged
4. taken  = raw * (1 + min(cap, TAKEN))      TAKEN: sum of distinct damage-taken statuses (4.4); cap 1.00,
                                             1.50 on an enemy hexed by a Hexer (R12)
5. shield   absorbs first (lightning x3 vs shield points, fire x2 vs ice armour; 5.10)
6. HP    -= remainder; overkill = max(0, -HP) is reported, never carried over
```

`pierce` (Ballista 50%, Marksmen 30%) applies after shred: shred armour to 30, then pierce halves it
to 15.

### 4.4 Stacking rules

The rule a player learns: **the same effect from two sources does not stack, the strongest wins;
different effects add into one pool; the pools multiply.**

| Effect | Combine rule | Cap (cap-lifter, R19) |
| --- | --- | --- |
| Damage-taken statuses (hex, mark, brittle) | each status: max of its sources; different statuses **add** into `TAKEN` | +100% (Hexer's hex: +150%) |
| Damage-dealt bonuses (War Drums, boons, relics) | **add** into `DEALT` | none (content keeps it bounded) |
| Attack-speed auras (banners) | best aura in reach (Field Forge: the two best add); Rally, War Horn, boons and relics add on top | +100% total (Overclock: +200%) |
| Slows (oil, chill, crater, bramble, Tar Pit) | **max** of all slows | speed never below 25% of base |
| Crit chance | adds (tower base + marked + Lighthouse + boons) | 75% |
| Crit multiplier | highest that applies (2.0; Marksmen 2.5; Deadeye 3.5; Deadeye's Oath 5 on marked) | |
| Shred / corrode | stacks add, 5 points each | 6 stacks (Acid and Shrapnel: 10, their own) |
| Burn | one burn per enemy: max dps, max remaining duration | (Wildfire Crown: up to 3 burns from different sources) |
| Shatter chains | breadth-first, one link per kill | 4 links (Endless Winter: none, +10% per link) |
| Stun / root / freeze / pull | do not stack or extend; one shared 1 s immunity window (5.9) | |
| Range bonuses (incl. high ground +15%) | add | +40% |
| Gold cost of one purchase | every discount and surcharge adds into `cost` (R3) | -50% per purchase |

A cap-lifter is judged by the win-rate lift it gives (<= 15 points), not by the damage ceiling.

Example: Hexer (+25%) + Hunter's Mark (+30%) + Shatter brittle (+50%, physical only) on a frozen,
hexed, marked brute is physical taken x2.0 (capped; x2.5 if the hex is a Hexer's), not x2.84. With War Drums (+15% dealt) and a
Marksmen crit on a marked target (x3.5), that one bolt is a big, fair moment, not a broken one.

### 4.5 Crits

- Only **direct hits** crit: a projectile or melee strike against its own target, including each
  Volley arrow, each chain jump, each Siege Bolt pass. Splash, auras, DoTs, puddles, ignite and
  shatter bursts never crit.
- Base crit chance: Archer 5%, Marksmen 20%, Blademasters 10%, everyone else 0%. Marked adds +20% to
  every direct hit against that enemy; Lighthouse adds +10% to towers in its aura. So a Mage hitting a
  marked enemy crits 20% of the time: the Beacon makes crits a team effect.
- The roll uses the `combat` RNG stream (13.2), one draw per direct hit, in entity order.

---

## 5. Statuses

Every status has an icon over the enemy's health bar and a body tint. Durations refresh; they do not
add, unless stated.

| Status | Source | Effect | Duration / stacking | Bosses |
| --- | --- | --- | --- | --- |
| Slow | oil, crater, bramble, Tar Pit | speed x(1 - s) | max of slows, floor 25% speed | half strength |
| Chill | Frost, Glacier nova, shatter | meter 0..freezeAt; counts as a slow of 40% x meter/freezeAt | decays 20/s after 1.5 s without new chill | builds Numb instead |
| Frozen | chill meter full, Stillness, Frost Flask | cannot move or attack | 1.5 s (Glacier 2.0), then Thawing | never; Numb |
| Thawing | after Frozen | no chill can build | 3 s | |
| Numb | elite/boss meter full | 50% slow | 2 s, meter resets | |
| Burn | Pyre, ignite, fireballs, fire patches | fire dps | one burn: max dps, max remaining time (Wildfire Crown: 3 sources) | full |
| Oiled | standing in oil | primes ignite; puddle also slows 25% while inside | 4 s after leaving the oil | full |
| Marked | Beacon | +20% crit chance against; +8/12/15% taken (Hunter's Mark 30%) | 5 s, max | full |
| Hexed | Hexer (and Lingering Hex, Curse Engine, Prism Lens) | +20/22/25% taken (all types); cannot be healed; shields on it halved; a Hexer's hex raises the taken cap to +150% | 5 s, max | full |
| Brittle | frozen by a Shatter spire | +50% **physical** taken; dies → shatters | freeze + 1 s | never frozen |
| Shred | Shrapnel, Blademasters, Bramble, Acid | -5 armour per stack | 6 stacks (Acid and Shrapnel 10), one 6 s timer refreshed by any new stack | full |
| Corrode | Acid only | -5 ward per stack | as shred | full |
| Stun | Overload, Judgement, Bell | no move, no attack, channels interrupted | then 1 s immune to all hard CC (R9) | x0.25 duration |
| Root | Thornwood, Bramble, Bramble Surge | no move; still fights and casts | then 1 s immune to all hard CC | immune |
| Revealed | Beacon, any damage, Flare | stealthed enemy can be targeted and blocked | in reveal source + 1 s; damage reveals 1.5 s | n/a |
| Shield | Shieldbearer, Colossus ice armour | absorbs damage before HP | 5.10 | |
| Pulled | Harpoon | moved 2.5 u back along its path over 0.3 s | instant, then 1 s immune to all hard CC | 60% slow 1 s instead |
| Grounded | Harpoon on a flyer | the flyer is a ground unit: blockable, ground towers hit it | 4 s | |

### 5.1 Slow

`speed = baseSpeed * (1 - max(all slows))`, floor 25% of base. CC (frozen, stunned, rooted, blocked)
sets speed 0 and is not a slow. Chill is a slow source, so oil (25%) on a half-chilled enemy (20%) gives
25%, not 45%. This keeps frost + oil + crater from locking a lane; the combo pays through damage
synergies instead.

### 5.2 Chill and freeze

- Each enemy has `freezeAt` (9.1): 60 tiny, 100 small, 150 heavy, 250 elite; bosses never freeze.
- A frost hit adds its chill to the meter (nothing during Thawing). Meter >= freezeAt: Frozen for 1.5 s,
  meter resets to 0, then Thawing 3 s.
- One L1 Frost Spire (18 chill/s) freezes a footman about every 10 s: 5.5 s build + 1.5 s frozen + 3 s
  thaw. Two spires roughly halve the build; the thaw window stops perma-freeze.
- Frozen flyers hover in place.
- Elites at a full meter get **Numb** (50% slow 2 s), the meter resets, no Thawing. Bosses Numb the same
  way, the Frost Colossus too at 800 chill (R15).

### 5.3 Fire and ice cancel

One visible rule: **fire damage on a Frozen enemy ends the freeze at once** (`thaw` event, steam),
**every fire hit removes 30 chill**, and **freezing an enemy puts out its burn**. The codex says "Fire
and ice cancel." A Pyre and a Frost Spire can share a map; they should not share a stretch of path. It
is the one deliberate anti-synergy, and it is what stops fire from being the best partner for
everything.

### 5.4 Burn

One burn per enemy: a new burn sets `dps = max(old, new)` and `remaining = max(old, new)`. Two Pyres on
one spot do not double the burn; they double the cone. Wildfire Crown (a cap-lifter) lets burns from up
to 3 different sources tick side by side. Burn ticks every 0.5 s, cannot crit, is fire
(fireproof reduces it).

### 5.5 Oil and ignite

- An Alchemist puddle is a circle on the path (r 0.9). Ground enemies inside: 25% slow and **Oiled**;
  Oiled lasts 4 s after leaving.
- **Ignite**: an Oiled enemy takes **any fire damage** → Oiled is consumed, the enemy takes **60 fire**
  and gets **burn 20 dps for 4 s**; if it stands in a puddle, the puddle becomes a **fire patch** for its
  remaining time (min 3 s): 20 fire dps to every ground enemy in it, which ignites every Oiled enemy that
  enters. Touching puddles chain-ignite one tick apart (a visible ripple).
- Naphtha's oil is stronger (8.3). Ignite damage is flat (no act scaling): a big early burst that settles
  into "good" by act 3 unless boons raise it (hook).

### 5.6 Marked

The Beacon picks; 5 s; +20% crit chance against and +8/12/15% taken (Hunter's Mark 30%). One mark per
enemy (max wins). A white ring on the ground under it also reads as "focus this one".

### 5.7 Hexed

+20/22/25% taken by Mage level (Hexer spec 25%). **Cannot be healed. A shield granted to a hexed enemy is
half size, and hexing a shielded enemy halves its shield at once.** Hex is the general amplifier and the
hard answer to healer balls. **A Hexer's hex raises that enemy's damage-taken cap to +150%** (R12): the
Hexer's own job, and the one cap the whole team can push through.

### 5.8 Shred and corrode

Stacks of -5 armour (shred) or -5 ward (corrode, Acid only). Max 6 stacks (Acid and Shrapnel raise their own
cap to 10).
Any new stack refreshes the shared 6 s timer; on expiry all stacks drop at once (the cracked-armour icon
blinks for the last second). Armour never goes below 0.

### 5.9 Stun, root and immunity windows

- **Hard CC** is stun, root, freeze and pull. When any of them ends, the enemy is **immune to all hard CC for
  1 s** (R9), so two CC towers chain into a lock only with gaps. Thawing (no chill for 3 s) still follows a
  freeze on top of that.
- **Stun**: no move, no attack, interrupts channels (the warlock's summon). Boss telegraphs are **not**
  interruptible (9.8). Bosses take x0.25 duration (min 0.2 s) and still get the window.
- **Root**: no movement; it can still fight a soldier and cast. Flyers, juggernauts and bosses are immune.
- Immunity windows show as a short pale flash on the enemy, so "why didn't it freeze/stun" is answerable by
  eye.

### 5.10 Shields

- Shieldbearer aura (r 1.6): every 8 s, each ally in range without a shield gets one worth
  `min(30% of its max HP, 150 * hpMul)`. A shieldbearer never shields itself. Shields don't stack; a new
  grant only fills an empty shield.
- **Lightning (Storm) does x3 to shield points**: a 48 hit removes 144 shield; leftover goes to HP at /3.
- **Fire does x2 to the Frost Colossus's ice armour** (that shield only).
- Hexed: granted at half size; hexing a shielded enemy halves its shield.
- Shields absorb every damage type including pure. Drawn as a pale dome.

### 5.11 Stealth and reveal

- Shades are **stealthed**: towers cannot pick them as targets, soldiers do not block them.
- They **can be hit** by anything that does not need them as a target: splash and shells aimed at others,
  chain jumps (a chain can jump to a stealthed enemy in jump range), auras (Thornwood, Glacier nova, Static
  Field), puddles, fire patches, spells.
- **Revealed** by: a Beacon's radius (+1 s after leaving), any damage (1.5 s), relic/commander hooks (Warden's
  Deep Roots, the Watchful boon). Revealed shades are normal targets and can be blocked.
- So shades punish a defence of pure single-target towers, and are answered by a Beacon, any area damage,
  or a soldier line next to an aura.

---

## 6. Targeting and reach

### 6.1 Modes

Every attacking tower has a mode the player can change: **First** (least remaining path distance to its
exit; the default), **Strongest** (highest current HP + shield), **Last** (most remaining distance). Cycle with
**T** (new hotkey, section 14) or the target chip in the radial menu; the mode shows as a small icon on the
tower's base so it reads in play.

Defaults: First for Archer, Mage, Bombard, Frost, Alchemist, Pyre, Storm, Thornwood's root. Strongest for
Ballista, Marksmen, Hexer, Inferno, Beacon marks. Holding **Alt** shows every tower's range at once (R28).

### 6.2 Rules

- Re-evaluate the target on **every attack** (cones and beams: every 0.5 s). Cheap at <200 enemies, and
  predictable: a tower always shoots what its mode says.
- **Overkill guard**: single-target homing towers skip an enemy whose HP is already covered by projectiles
  in flight from any tower (the sim keeps `pendingDamage` per enemy, using the hit's expected post-resist
  damage without crit). It removes most visible waste without making towers psychic.
- Ties break by lowest entity id.
- **Reach**: ground-only towers never target flyers and their splash never hits flyers. Grounded flyers
  count as ground for 4 s. Circle spells and supplies (Meteor, Firebomb, Tar Pit, Bramble Surge, Oil
  Barrel, Frost Flask) hit flyers for 50% of their damage; their slows, oil and roots never touch flyers
  (R2).
- **Projectiles**: homing ones (arrows, bolts, frost shards; lightning is instant) always hit a target that
  is alive when they arrive; if it died they fly to its last position and fizzle. **Lobbed** shots (Bombard,
  Alchemist, Firestorm) aim at a predicted point: `position + velocity * flightTime` in a **straight line
  along the enemy's current heading** (R8), using its speed when fired, and land there. Fast enemies
  dodge them at bends and anything that changes speed mid-flight can too ("Bombards like straights").
  A ground shadow shows where. Lobbed shots are not counted in `pendingDamage`. Projectile speeds are
  content.md's alone (R33).

### 6.3 Air vs ground reach

| Tower | Ground | Air |
| --- | --- | --- |
| Archer, Mage, Frost, Storm, Ballista, Beacon (all levels and specs) | yes | yes |
| Volley's Arrow Rain | yes | yes |
| Pyre Firestorm | yes | yes, at 50% damage (R12) |
| Bombard, Alchemist, Pyre (base, Inferno), Thornwood, Barracks, Treant | yes | no |

Five of ten attacking towers reach air at L1. `run-meta.md` gives the Alchemist and Warden commanders no
air in their start on purpose; this doc keeps air out of a run's first battle (section 3) so the draft can
fix it.

---

## 7. Blocking

### 7.1 Soldiers

- A Barracks keeps **3 soldiers** at its rally point. The rally defaults to the nearest path point and can
  be moved anywhere on the path within **2.6 u** of the pad (click; keyboard: select, **R**, arrows step
  along the path, Enter).
- **Engage radius** 1.4 u around the rally. An idle soldier picks the nearest blockable ground enemy inside
  it that is not yet held, walks to it (2.2 u/s), and engages at 0.4 u.
- **Holding**: a soldier holds **one** enemy (Paladins two while above 50% HP, R12; the Treant three). A held enemy stops and fights
  back. If every enemy in reach is held, spare soldiers gang up on the held one with the lowest HP (they add
  damage, not holding).
- Enemies beyond the holding capacity walk past. The readable rule: "each soldier stops one".
- Soldiers return to the rally when nothing is in reach, and regenerate 10% max HP per second after 2 s out
  of combat.
- A dead soldier respawns at the Barracks after 10 / 9 / 8 s (L1/L2/L3) and walks to the rally.
- Enemy melee is physical unless stated (acolyte, warlock: magic) and goes through the soldier's armour or
  ward.

### 7.2 Who cannot be blocked

| Enemy | Rule |
| --- | --- |
| Flyers (bat, drake) | never, unless Grounded |
| Shade | only while revealed |
| Juggernaut | walks through; knocks each soldier it touches back 1 u for 25 damage |
| Frost Colossus | unblockable; stomps soldiers (9.9) |
| Sand Wyrm | only while surfaced, and it shoves rather than stops (9.9) |
| Pack-Lord | blockable, but slips like a runner, and Leap breaks every hold (9.9) |
| Runner | blockable, but **slips**: keeps 50% speed for 0.5 s after engagement |

### 7.3 Why block

Blocking is the kill-box verb: held enemies stand still inside splash, cones and auras, and lobbed shells
never miss a held target. Soldiers never cost lives; they lose their own HP. A Barracks with no damage tower
around it is a delay, not a defence: soldier damage stays modest so it wants partners.

---

## 8. Towers

### 8.1 Cost curve and power curve

All towers follow one curve on a base cost `c`:

| Purchase | Cost | Cumulative | Power index | Power per 100 gold |
| --- | --- | --- | --- | --- |
| L1 | c | 1.0c | 1.0 | 1.00 |
| L2 | 1.1c | 2.1c | 1.65 | 0.79 |
| L3 | 1.6c | 3.7c | 2.5 | 0.68 |
| Specialisation | 2.4c | 6.1c | 4.0 + mechanic | 0.66 + mechanic |

"Power index" is the content writer's target for damage output (or equivalent utility) relative to L1.
Raw output per gold falls as you stack; stacking buys (a) the **spec mechanic**, (b) power on a **scarce
good pad** (a bend, a kill box, an aura cluster), at the risk that a sapper, a Colossus stomp or the
Tyrant's breath turns off a 600-gold pad. Spreading is efficient, stacking is focused: the decision is real
on every map because pads are limited (9-14) and gold is not enough to max more than about a third of them.

Base costs: Archer 70, Barracks 70, Beacon 90, War Banner 90, Mage 100, Frost 100, Alchemist 100, Pyre 100,
Thornwood 100, Ballista 120, Bombard 125, Storm 125. Treasury's specialisation costs 1.8c, not 2.4c (R11).

**Discounts** (R3): every discount and surcharge (Thrifty, Veteran, Overseer, Siege Engine, Mason's Seal,
Requisition, Cold Hands, Rust) adds into one `cost` pool per purchase, floored at -50%. Veteran and Siege
Engine build at L2 for L1 plus half of L2; Overseer takes 40% off L3. A free purchase (Spare Planks,
Drillmaster) pays whatever is left after the pool. **The 5th and 6th blueprint each add +5% to every L1
cost** (R18).

Build takes 0.6 s (tower inactive), an upgrade 0.4 s, a sell 0.3 s; the pad shows scaffolding meanwhile.

### 8.2 Overview

| # | Tower | Damage | Reach | Role | Shines against | Weak against |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Archer | phys, single | air+ground | cheap fast DPS, anti-air | runners, bats, acolytes | brutes, swarms |
| 2 | Barracks | phys melee | ground | blocking, kill box | runners, footman floods | juggernaut, flyers, brutes (cleave) |
| 3 | Mage | magic, single | air+ground | armour breaker | brutes, drakes, shieldbearers | acolytes, swarms |
| 4 | Bombard | phys splash | ground | wave clear | swarms, splitters, healer balls | runners (dodge), flyers, heavy armour |
| 5 | Frost Spire | magic + chill | air+ground | control, enabler | rushes, bats, anything fast | bosses, Pyre stretches |
| 6 | Alchemist | magic + oil | ground | slow zone, shred/oil setup | groups, runners, warded columns (Acid) | flyers, lone elites |
| 7 | Pyre | fire cone + burn | ground | unresisted area | armoured + warded blobs, held enemies | flyers, act-4 natives, frost |
| 8 | Storm Spire | magic chain | air+ground | groups, shields | shield walls, bat swarms, chilled groups | lone heavy targets, acolytes |
| 9 | Beacon | none (support) | air+ground | reveal, mark, crit | shades, bosses (focus) | nothing on its own |
| 10 | War Banner | none (support) | aura | attack-speed core | cluster maps | spread-out maps |
| 11 | Ballista | phys pierce, slow | air+ground | long range, big targets | brutes, drakes, elites | swarms, splitters |
| 12 | Thornwood | phys aura + root | ground | zone, stealth-proof, lockdown | shades, swarmlings, held clumps | flyers, juggernaut |

### 8.3 Per-tower stats and specialisations

Stats per level as L1 / L2 / L3. `int` = attack interval in seconds. DPS is single target before resist.

#### 1. Archer (70 / 80 / 110, spec 170)

- Range 3.4 / 3.6 / 3.8. Dmg 8 / 12 / 17 phys. Int 0.7 / 0.65 / 0.6 → 11 / 18 / 28 dps. Crit 5%.
- Identity: the honest workhorse. Cheapest air answer; its fast hits carry crits and marks best. Weak to
  armour (8 into medium armour = 4.4).

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Marksmen** | range 4.8, 46 dmg, int 1.15, crit 20% x2.5, pierce 30%, default Strongest | **Deadeye**: crits on Marked enemies deal x3.5 | the sniper; the Beacon's best friend; drakes and elites |
| **Volley** | range 3.8, 3 arrows of 9 at 3 different targets (spare arrows hit again at half damage), int 0.6 | **Arrow Rain** every 5th attack: 8 arrows x 12 phys over 1 s in r 1.2 at the densest point in range (air and ground), at most 3 per enemy | swarms, bats, splitter children |

#### 2. Barracks (70 / 80 / 110, spec 170)

- 3 soldiers. HP 60 / 90 / 130. Armour 0 / 15 / 30. Dmg 5 / 8 / 12 per 1.0 s. Respawn 10 / 9 / 8 s.
- Identity: the only way to stop a ground unit for free. Low damage on purpose (7.3).

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Paladins** | HP 240, armour 45, ward 30, dmg 16 / 1.0 s | each holds **2 above 50% HP**, 1 below (R12); **Lay on Hands**: once per life, at <30% HP heal to full; 15% max HP/s out of combat | the wall: brutes and floods stop here |
| **Blademasters** | HP 160, armour 25, dmg 16 / 0.8 s, crit 10% | 30% dodge vs melee; **Whirl** every 4 s: 30 phys to all within 0.9 u + 1 shred | blockers who kill; the shred feeds archers |

#### 3. Mage (100 / 110 / 160, spec 240)

- Range 3.2 / 3.3 / 3.5. Dmg 24 / 38 / 54 magic. Int 1.5 / 1.4 / 1.3 → 16 / 27 / 42 dps.
- Identity: the armour answer that also hits air. Slow bolt (10 u/s), so the overkill guard matters most
  here. Countered by acolytes.

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Arcanist** | range 3.8, 70 dmg, int 1.3 | bolt **chains 2 jumps** (1.8 u, -25% each: 70/53/39); every 4th bolt an **Arcane Burst**: 50 magic r 1.0 at the first target | armoured groups |
| **Hexer** | range 3.6, 60 dmg, int 1.2, default Strongest | applies **Hex** 5 s (+25% taken, no healing, shields halved, **taken cap +150%**); every 3rd bolt hexes all within 1.2 u; **Curse Spread**: a hexed enemy dying passes hex to the 2 nearest within 1.5 u | the force multiplier; kills healer balls; the one tower that lifts the taken cap |

#### 4. Bombard (125 / 140 / 200, spec 300)

- Ground only. Range 3.0 / 3.2 / 3.4. Dmg 28 / 44 / 66 phys in r 1.0 / 1.1 / 1.2 (100% at centre, linear to
  50% at the edge). Int 2.6 / 2.5 / 2.4. Lobbed, flight 1.0 s.
- Identity: wave clear. Misses runners and anything that changes speed mid-flight; perfect on held, rooted
  or frozen enemies. Heavy armour cuts it hard.

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Mortar** | range 4.6, 120 dmg r 1.4, int 3.2, flight 1.4 s | **Crater**: 3 s, 30% slow in r 1.0 | long-range wave clear from a back pad |
| **Shrapnel** | range 3.4, 56 dmg r 1.1, int 2.0 | each hit adds **2 shred**; splits into 4 bomblets (18 phys r 0.6, +1 shred) scattered within 1.2 u; its own shred cap is 10 (R12) | the armour stripper; sets up every physical tower |

#### 5. Frost Spire (100 / 110 / 160, spec 240)

- Air+ground. Range 3.0 / 3.1 / 3.3. Dmg 5 / 8 / 12 magic. Chill 18 / 22 / 26 per hit. Int 1.0 / 0.9 / 0.8.
- Identity: control and the enabler. Low damage; wins by time and by what it sets up.

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Glacier** | range 3.3, bolts as L3 | **Nova** every 3.5 s: 35 chill + 30 magic to everything within 2.4 u of the tower (air and stealthed too); its freezes last 2.0 s | zone control; holds a whole bend; stealth-proof |
| **Shatter** | 20 dmg, chill 40, int 0.8 | its freezes make **Brittle** (+50% physical taken, freeze + 1 s); a Brittle enemy that dies **shatters**: 25% of its max HP as pure in r 1.2 + 30 chill (chains, at most 4 links; Endless Winter lifts the limit) | turns physical towers into killers |

#### 6. Alchemist (100 / 110 / 160, spec 240)

- Ground only. Range 3.0 / 3.1 / 3.3. Flask 15 / 24 / 36 magic r 0.9; int 2.4 / 2.2 / 2.0; lobbed, flight
  0.8 s. Leaves an oil puddle (r 0.9) for 4 / 5 / 6 s; max 3 puddles per tower (oldest goes).
- Identity: the slow zone and the setup for fire. Low damage alone; needs its spec or a partner.

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Acid** | puddles last 7 s | acid: 15 magic dps, 1 **shred** and 1 **corrode** per second inside (cap 10 each from acid) | strips armour **and** ward; the only ward answer besides physical damage |
| **Naphtha** | as L3 | its oil ignites into an **explosion** (90 fire r 1.4) + a fire patch 4 s at 25 dps; every **4th flask is a firebomb** that lights its own puddle | self-sufficient fire; huge with Pyre |

#### 7. Pyre (100 / 110 / 160, spec 240)

- Ground only. Range 2.2 / 2.3 / 2.4. A 70° flame cone toward its target, ticking every 0.2 s: 10 / 16 / 25
  fire dps to every ground enemy in the cone + burn 5 / 8 / 12 dps for 3 s. Ignites oil.
- Identity: unresisted damage at point blank. Best where soldiers hold enemies in front of it. Range, frost
  and act 4 are its prices.

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Inferno** | range 2.6, cone 36 dps, burn 18 dps 4 s, default Strongest | **Heat**: +15% per second on the primary target held continuously, up to +120%; resets on retarget | the melter for bosses, brutes, juggernauts |
| **Firestorm** | range 3.8, no cone | every 2.5 s hurls 3 fireballs at 3 targets (**air too, at 50%**, R12): 40 fire r 0.8 + burn 10 dps 4 s; burning ground 3 s at 15 dps (ignites oil) | the wide burner; Pyre's air and stealth answer |

#### 8. Storm Spire (125 / 140 / 200, spec 300)

- Air+ground. Range 3.0 / 3.1 / 3.3. Dmg 30 / 44 / 62 magic, chains to 2 / 3 / 4 targets (jump 1.6 u, -25% per
  jump), int 1.7 / 1.6 / 1.5. Instant.
- **x3 vs shields.** **Conductive**: against chilled or frozen targets +30% damage, and jumps from them reach
  2.4 u.
- Identity: groups and shields. Poor single-target value.

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Tempest** | 64 dmg, **6 jumps** (7 targets), int 1.3 | **Static Field** every 4 s: 50 magic to every flyer within 3.5 u | air swarms and floods |
| **Overload** | 84 dmg, 3 jumps (4 targets), int 1.6 | each hit adds a **Charge** (5 s); 3 charges → **stun** 1.5 s (boss 0.4) and a discharge of 40 magic r 1.0 | the lockdown; stops a push cold |

#### 9. Beacon (90 / 100 / 145, spec 215)

- No damage. Radius 3.0 / 3.2 / 3.4. **Reveals** stealth in radius. **Marks** the strongest unmarked enemy in
  radius every 3.0 / 2.5 / 2.0 s for 5 s: +20% crit chance against, +8 / 12 / 15% taken.
- Identity: the answer to shades, and a team buff that grows with crits and focus.

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Lighthouse** | radius 3.8 | towers on pads within 3.0 u get **+15% range** and **+10% crit chance**; a beam sweeps the radius every 3 s and marks everything it crosses | the cluster supporter; best at a bend with 3-4 pads |
| **Hunter's Mark** | radius 3.6 | marks **3** at a time (elites and bosses first), +30% taken; when a marked enemy dies the mark jumps at once to the nearest unmarked in radius; a kill on a marked enemy pays **+2 gold** (x bountyMul) | boss focus and economy |

#### 10. War Banner (90 / 100 / 145, spec 215)

- No damage. Aura 2.6 u pad to pad. Towers in it, and soldiers whose rally is in it: **+10 / 14 / 18% attack
  speed**. Banners never stack: each tower takes the best banner in reach.
- Identity: the placement puzzle. Worth it on maps with a tight cluster of 3+ pads; the generator guarantees
  two (10.3).

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **War Drums** | aura 2.8 | **+25% attack speed and +15% damage dealt**; soldiers in aura +25% damage and double regen | the cluster's engine |
| **Treasury** (spec cost 1.8c = 160) | aura 2.6 | +18% attack speed; kills by towers in its aura give **+25% bounty**; **+1 crown per wave that starts while it stands**, paid after the battle outside the leftover cap (R11; Treasuries do not stack) | the greedy pick: battle gold now, crowns for the run |

#### 11. Ballista (120 / 130 / 190, spec 290)

- Air+ground. Range 4.4 / 4.7 / 5.0. Dmg 50 / 80 / 115 phys, **pierce 50%**. Int 2.6 / 2.5 / 2.4. Bolt 22 u/s.
  Default Strongest.
- Identity: long reach and the heavy hitter. Wastes damage on swarms (the overkill guard only partly helps).

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Harpoon** | range 5.0, 170 dmg, int 2.6 | every 3rd shot **pulls** the target 2.5 u back along its path; a flyer is **Grounded** 4 s; juggernauts and bosses get a 60% slow for 1 s instead | control of single big threats; drakes into kill boxes |
| **Siege Bolt** | range 5.6, int 3.2 | the bolt flies the full range in a line through its target, hitting everything (air and ground) for **130 phys ignoring all armour** | straightaways; armoured columns |

#### 12. Thornwood Grove (100 / 110 / 160, spec 240)

- Ground only. Aura r 2.0 / 2.1 / 2.2: thorns 6 / 10 / 15 phys dps to every ground enemy inside (tick 0.5 s).
  Every 6 / 5.5 / 5 s **roots** the First root-able enemy in the aura for 1.2 / 1.4 / 1.6 s.
- Identity: needs no target, so it hits shades and never misses. Low single-target damage; multiplies
  everything that likes stillness.

| Spec | Stats | Mechanic | Identity |
| --- | --- | --- | --- |
| **Bramble** | radius 2.6, 22 dps | 20% slow inside; 1 shred per 2 s inside; roots **3** enemies every 5 s for 1.6 s | the denial zone |
| **Ancient Treant** | aura as L3 | summons a **Treant**: HP 800, armour 35, holds **3**, slam every 2 s 50 phys r 1.0, 2%/s regen out of combat, respawn 15 s, rally radius 2.2 | a heavy blocker without a Barracks |

### 8.4 The synergy web

Strength: **S** changes how a battle goes (+60% or more over the same gold without it), **A** clearly worth
building for (+25-60%), **B** nice when it happens. Every synergy has its own event, which the surface turns
into a distinct effect plus a one-time codex toast ("Oil and fire: ignite!"). The player finds it by seeing
it, not by reading.

| Name | Pieces | Strength | Why it works | How you notice |
| --- | --- | --- | --- | --- |
| **Shatterline** | Frost Shatter + any physical (Archer, Ballista, Bombard, Blademasters) | S | brittle +50% phys; kills shatter into neighbours | ice-crack bursts, chained chimes rising in pitch |
| **Wildfire** | Alchemist (Naphtha most) + Pyre / Firestorm / Meteor / Firebomb | S | ignite 60 + burn + puddles that chain into fire | orange flash on oiled enemies, puddle turns to flame |
| **Deadeye** | Beacon + Marksmen | S | +20% crit chance and x3.5 crits on marked | big gold crit numbers with a crack |
| **The Curse** | Hexer + everything | A | +25% to all types; heals and shields fail | purple enemies, heal rings fizzle |
| **Kill Box** | Barracks / Treant + Bombard / Pyre / Thornwood | A-S | held enemies never dodge shells and stand in cones | clumps stopped in fire |
| **Sunder** | Shrapnel / Acid / Blademasters / Bramble + physical | A | 30 armour off a heavy brute is +86% physical | cracked-armour icon, numbers jump |
| **Conductor** | Frost + Storm | A | +30% lightning, longer jumps from chilled enemies | arcs reach farther, turn blue-white |
| **Overcharge** | Storm vs Shieldbearers, the Colossus's ice and the Lich's Bone Ward | S (situational) | x3 to shield points | shields pop in a glass burst |
| **Grounded** | Harpoon + ground towers / soldiers | A | drakes fall into Bombards, Pyres and blockers | drake crashes, dust ring |
| **Pinned** | Thornwood / Overload / any freeze + Bombard / Mortar | A | lobbed shells never miss a still target | root vines, then a direct-hit thud |
| **Second Pass** | Harpoon + Pyre / Thornwood / puddles | B | the pulled enemy walks through your zones again | pull streak across the field |
| **Drumline** | War Drums inside a 3-4 pad cluster | A | +25% speed and +15% damage to every tower there; with Field Forge a second banner adds on top | drum pulse on each buffed tower |
| **Bounty Hunt** | Hunter's Mark + Treasury | B | +2 gold per marked kill on top of +25% bounty | coins flip over kills |
| **Crack the Ward** | Acid + Mage / Storm | A | corrode is the only way to beat warded acolytes with magic | rune glow dims |

**Anti-synergy** (deliberate, visible): **fire and ice cancel** (5.3). A Pyre beside a Frost Spire on the same
bend wastes both; a Pyre at the entry and Frost at the exit is fine. The codex teaches it the first time a fire
hit thaws a frozen enemy (`thaw`, a steam puff).

### 8.5 Dead-pick and dominant-pick risks

| Tower | Risk | Prevention |
| --- | --- | --- |
| Archer | dead late (armour) | Marksmen pierce and crits; Sunder makes it scale; bats and runners keep it wanted every act |
| Barracks | dominant early (free blocking) | low soldier damage; brutes cleave, juggernauts walk through, flyers skip it |
| Mage | dominant (magic + air) | acolytes from act 1 wave 5; ward tiers in every act; slow bolt |
| Bombard | dead in air waves | ground-only is visible in the preview; Mortar's range earns a back pad |
| Frost | dead on boss maps | Shatter turns it into damage; Glacier still controls escorts; Numb works on most bosses; act 4 trait favours it |
| Alchemist | dead without fire | Naphtha lights itself every 4th flask; Acid is the only ward strip in the game |
| Pyre | dominant (unresisted area) | short range, ground only, fire/ice conflict, burn does not stack, act-4 fireproofing |
| Storm | dead vs lone targets | Overload stun; shields from act 1 wave 6; conductive bonus with frost |
| Beacon | dead (no damage) | the only stealth answer that needs no aim; marks lift every tower; Hunter's Mark pays gold |
| War Banner | dead on spread maps; dominant if stackable | the generator guarantees clusters; banners never stack (Field Forge, a keystone, is the one exception) |
| Ballista | dominant vs bosses | slow fire, overkill on swarms, splitters punish alpha, Wyrm's burrow windows favour it but Colossus armour is not ignored fully (50%) |
| Thornwood | dead vs air | air waves are previewed; root, shades and the Treant give it a ground job every act |

The bot reports per tower: pick rate when offered, win rate when owned, share of total damage when built. A
tower above 1.4x or below 0.6x the mean on two of the three is a balance bug.

---

## 9. Enemies

### 9.1 Roster

Act 1 base stats (`HP x hpMul` in later acts). Silhouette and name = role in every act (R32); each act recolours
it (art doc, content 4.3). `freezeAt`: chill needed to freeze.

| Role | HP | Speed | Armour | Ward | Threat | Leak | Melee (dmg / int) | freezeAt | Trait |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Footman | 60 | 1.1 | 0 | 0 | 1 | 1 | 5 / 1.0 | 100 | baseline |
| Runner | 35 | 2.0 | 0 | 0 | 0.8 | 1 | 3 / 0.8 | 100 | slips soldiers 0.5 s |
| Brute | 240 | 0.7 | 45 | 0 | 3 | 2 | 20 / 1.5, cleaves 2 soldiers | 150 | heavy |
| Acolyte | 90 | 0.95 | 0 | 45 | 2 | 2 | 6 / 1.0 magic | 100 | warded |
| Shieldbearer | 150 | 0.8 | 25 | 0 | 3 | 2 | 8 / 1.2 | 150 | shields allies r 1.6 |
| Shaman | 100 | 0.9 | 0 | 25 | 3 | 2 | 4 / 1.0 | 100 | heals 8% max HP in r 2.0 every 4 s (itself at half) |
| Splitter | 110 | 0.8 | 0 | 0 | 3 | 2 | 6 / 1.0 | 100 | dies → 2 slimes (40 HP, 1.1) → each 2 slimelets (12 HP, 1.4) |
| Shade | 70 | 1.3 | 0 | 25 | 2 | 2 | 8 / 0.8 | 100 | stealth |
| Swarmling | 14 | 1.5 | 0 | 0 | 0.3 | 1 | 2 / 0.6 | 60 | clumps of up to 16; 20 / 28 / 36 / 36 a wave by act |
| Sapper | 110 | 1.2 | 25 | 0 | 3 | 2 | 6 / 1.0 | 100 | disables a tower (9.2) |
| Bat | 22 | 1.6 air | 0 | 0 | 0.6 | 1 | none | 60 | flyer swarm; caps as swarmlings, 10 on act I floors 2-3 (R2) |
| Drake | 420 | 0.8 air | 25 | 25 | 6 | 2 | none | 150 | big flyer |
| Juggernaut (elite) | 1500 | 0.6 | 65 | 0 | 15 | 3 | knocks soldiers aside | 250 | unblockable; immune to root, pull, stun |
| Warlock (elite) | 950 | 0.75 | 0 | 65 | 14 | 3 | 15 / 1.2 magic | 250 | summons (9.2) |
| Matron (elite) | 1200 | 0.6 | 25 | 25 | 14 | 3 | 12 / 1.0 | 250 | births swarmlings (9.2) |

Bounty = `round(threat * 5 * bountyMul)`; slimes 2 gold, slimelets 1, Risen 1. **Summons** (Risen, Matron births,
boss adds) pay nothing once the last wave has spawned (R10). Melee against soldiers is x act (content 4.1). Flyers
follow the **air route** (10.4), never fight, are never blocked.

### 9.2 Role mechanics

- **Sapper**: when its path position passes within 2.0 u of a built pad, it stops and plants a charge for
  **1.2 s** (fuse spark, `sapper_plant`). If it is alive, not blocked and not stunned at the end, the tower is
  **disabled 6 s** (grey, smoke). It picks the most-invested tower in reach; once per sapper. Punishes putting all
  gold on one pad.
- **Warlock**: every 7 s stops and channels 1.5 s (rune circle), then raises 3 **Risen** (footman stats x0.7,
  threat 0, 1 gold until the last wave has spawned). Any hard CC during the channel cancels it and resets the
  timer. Teaches "stun the caster".
- **Matron**: every 4 s births 2 swarmlings at her side; on death bursts 8. Teaches killing her away from the exit.
- **Shaman**: the heal pulse is a visible green ring; hexed allies are skipped (a broken ring on them).
- **Shieldbearer**: grants every 8 s (5.10). Its own big shield is cosmetic.
- **Splitter**: children spawn at the parent's path position with ±0.3 u spread and keep its statuses except
  Frozen and Marked.

### 9.3 Counter table

| Role | Counters (what beats it) | Anti-counter (what it punishes) |
| --- | --- | --- |
| Footman | everything | nothing; the baseline |
| Runner | soldiers, Archer, Frost, oil, Overload | Bombard/Mortar (shells miss), Ballista, slow attackers |
| Brute | Mage, Ballista, Pyre, shred, Hexer | Archer, Volley, soldiers (cleave) |
| Acolyte | Archer, Bombard, Ballista, Pyre, Acid corrode | Mage, Storm, Frost damage |
| Shieldbearer | Storm, Hexer, focus it first (Strongest, Hunter's Mark) | many small hits (Volley, Thornwood) |
| Shaman | Hexer, burst (Marksmen, Ballista), Mortar from range | slow DoT builds, spread-out low damage |
| Splitter | splash, chains, Volley, Thornwood, Pyre | Marksmen, Ballista, Siege Bolt (alpha wasted) |
| Shade | Beacon, any area (Thornwood, Glacier, puddles, Firestorm) | single-target defences with no reveal; soldiers |
| Swarmling | Volley, Tempest, Bombard, Pyre, Thornwood | slow single-target (Ballista, Marksmen, Mage) |
| Sapper | soldiers (blocked = no plant), burst, Overload | one maxed tower carrying a lane |
| Bat | Volley, Tempest, Archer, Frost, Firestorm | ground-only towers, Barracks |
| Drake | Ballista (Harpoon grounds it), Mage, Marksmen | ground-only towers, chains (spread too thin) |
| Juggernaut | Inferno, Ballista, Mage, Hexer, shred | Barracks, roots, pull, stun builds |
| Warlock | stun the channel (Overload, Judgement), physical (Archer, Ballista) | magic-heavy builds |
| Matron | Mortar from range, area near the exit | single-target defences |

### 9.4 Act traits

Each act's natives carry one rule (on the battle roster and in the codex):

| Act | Trait | Effect | Intent |
| --- | --- | --- | --- |
| 1 Meadow | none | | learn the base rules |
| 2 Desert | **Sun-hardened** | brutes and shieldbearers one armour tier up (brute heavy 65, shieldbearer medium 45) | physical builds must find Mage, shred or pierce |
| 3 Peaks | **Cold-blooded** | chill gained -25%; fire taken +20% | Frost weaker, Pyre's act |
| 4 Citadel | **Fireproof** | fireproof 25% on all natives (Tyrant 30%, R15); chill gained +25% | Pyre weaker, Frost's act; Dragonglass answers it |

### 9.5 Waves: archetypes and generation

A wave is built from its threat budget `T(w)` in three steps, all with the `waves` RNG:

1. **Pick an archetype** from the act's weighted table (the battle's **theme** triples two of them, R24):
   never the same as the previous wave, never one whose core role is not yet unlocked.
2. **Fill**: spend `T` on the archetype's role weights (largest-remainder rounding of counts), at least the
   archetype's core count, under the small-body caps.
3. **Order into groups**: each group is one role, spawned at its spacing; each group starts 2 s after the
   previous one's last unit; spacing scales down to fit 10 s (min 0.25 s), then the gaps (min 1.5 s); a wave
   the floors can't fit takes longer.

content.md 6.1-6.5 is the exact algorithm and its test fixtures.

**Unlocks** (earliest wave, by act and floor: content.md 6.2): act 1 F1 has footman w1, runner w2, brute w3,
swarmlings only inside Rush from w4, acolyte w5, and no flyers; F2 adds bats w4 and shieldbearers w6; F3 and the
boss add shamans w7. Act 2 adds splitter, shade, sapper and drake by floor. Acts 3-4 send everything from wave 1.

The first time a role appears in a run it comes as a small **intro group** (up to 4 units) so its rule is seen
alone.

**Archetypes**:

| Archetype | Core | Weights | Spacing | From | Tests |
| --- | --- | --- | --- | --- | --- |
| **March** | footmen | footman 70, runner 15, brute 15 | 0.8 s | A1 w1 | basic coverage |
| **Rush** | runners | runner 60, swarmling 30, footman 10 | 0.35 s | A1 w2 | slows, blockers, fast towers |
| **Armoured push** | 2+ brutes | brute 45, shieldbearer 20, footman 35 | 1.0 s | A1 w3 | magic, shred, pierce |
| **Swarm** | 12+ swarmlings | swarmling 70, runner 15, footman 15 | 0.25 s | A1 w3 | area damage |
| **Air swarm** | 6+ bats | bat 75, footman 25 (ground decoys) | 0.4 s | A1 w4 | air reach, air-route coverage |
| **Warded column** | 3+ acolytes | acolyte 55, footman 30, shaman 15 | 0.9 s | A1 w5 | physical, fire |
| **Shield wall** | 2+ shieldbearers | shieldbearer 30, brute 35, footman 35, tight clump | 0.9 s | A1 w6 | Storm, Hexer, focus |
| **Healer ball** | 2+ shamans | shaman 25, acolyte 25, footman 50, clumped | 0.6 s | A1 w7 | Hexer, burst, splash |
| **Slime flood** | 3+ splitters | splitter 60, swarmling 40 | 1.0 s | A2 | splash after the split |
| **Stealth raid** | 4+ shades | shade 60, sapper 25, runner 15 | 0.9 s | A2 | reveal, area |
| **Siege** | 2+ sappers | sapper 35, brute 35, shieldbearer 30 | 1.0 s | A2 | blocking, spreading |
| **Sky raid** | 1+ drake | drake 50, bat 50 | 1.2 s | A2 | big air |
| **Two fronts** | two groups on different spawns or branches | two other archetypes at 50% each | as theirs | A2, merge or fork maps | covering both lanes |
| **Grand assault** | last wave only | three archetypes at one third each, interleaved | 0.6 s | last wave of normal and elite battles | everything |

Per-act archetype weights are the content writer's table. Intent: act 1 is March / Rush / Armoured / Swarm heavy
with one Air swarm per battle (none in battle 1). From act 2 every battle has at least one wave that leans on each
of armour, ward and air, and at least one of stealth or shields. No battle is solvable by one damage type, and the
battle roster (9.6) says which tests are coming.

### 9.6 Telegraphing

- **Battle roster** (Setup, and on hover over the wave counter): every role the battle will send, with the act trait
  and the battle's **theme** ("Raiders: rush and swarm", R24; also shown on its map node). Planning before the first
  tower.
- **Next-wave preview**, always visible in the HUD's top band (R29) as a strip of up to 6 icons, larger on hover or
  focus of the skull: one icon per group in spawn order with a count and **heart pips for its leak cost**, plus
  trait badges: **wings** (air), **eye** (stealth), **plate**
  (armoured), **rune** (warded), **dome** (shields), **cross** (healer), **crown** (elite, with its affix icons),
  **skull** (boss). A bar shows the wave's threat against the battle's biggest wave. (Seer's Foresight shows two
  waves; a hook from `run-meta.md`.)
- **Lane arrows**: the skull appears at every spawn the next wave uses; on fork maps the branch arrow lights for
  groups sent down it.
- **Air route**: when the next wave has flyers, the air route draws as a faint dotted line for the countdown.
- **New** badge on any role not yet seen this run.
- **Elite warning**: a horn and a crown banner when a wave with an elite starts.
- A wave never contains anything not in its preview (splits and summons belong to their parent's icon).

### 9.7 Elites

Elites appear in elite nodes (section 3) and, with a 30% chance shown on the node, in the last wave of act 3-4
normal battles on floors 4-5 (content 4.4). From act 2 they carry **affixes** (act 2: 1, act 3: 1, act 4: 2;
ascension 6: at least 2 from act 1), rolled with the `waves` RNG and shown in the preview and on the elite's bar.
One affix list serves elites and ascension 3's wave affix (R32):

| Affix | Effect | Answer |
| --- | --- | --- |
| Hasted | +40% speed (on an A3 wave +20%) | slows, pull |
| Plated / Runed | +1 armour / ward tier | the other damage type |
| Vengeful | on death disables the nearest tower 4 s (elite only) | kill it away from your core |
| Regenerating | 2% max HP/s when not hit for 2 s (elite only) | steady damage |
| Warleader | allies within 2 u +20% speed (elite only) | kill order, focus |
| Brood | drops 2 footmen at every 25% HP lost (elite only) | area |
| Many | the wave's budget x1.30 (A3 wave only) | area, economy |

An elite node's relic is paid only if every elite of the battle died (R5).

### 9.8 Bosses: shared rules

- Slows at half strength; stun x0.25 duration, then the shared 1 s hard-CC immunity (R9); immune to root and pull
  (Harpoon gives 60% slow 1 s instead); a full chill meter gives Numb (every boss, the Colossus at 800).
- Hex, mark, shred, burn and crits work fully; the damage-taken cap applies.
- **Leaks loop** (R1): a boss at our gate costs 10 lives and re-enters at its horde gate with its HP and phase,
  statuses cleared, +20% speed per lap (`boss_lap`). The battle ends only when it dies; then everything left on
  the map flees. Leak-cost modifiers and Phoenix Feather never apply to boss or elite leaks.
- Its adds are summons: no bounty once the boss wave has spawned (R10).
- Every ability has a **telegraph** of at least 1.5 s at 1x: a ground ring or line in a warning colour, a wind-up
  pose, and a `boss_telegraph` event naming the ability. Telegraphs cannot be interrupted, so stun builds cannot
  cheese a boss and the player always sees what is coming.
- **Phases** change at HP thresholds. At each threshold the boss is **invulnerable 1.0 s** while it roars
  (`boss_phase`, music shift); damage that tick is discarded.
- A boss bar in the HUD's top band (R29) shows phase notches and the lap count.

### 9.9 The seven bosses

Acts 1-3 each roll one of two bosses at the act start, shown on the map from the first second (R21); act 4 is
always the Ember Tyrant. HP is final (includes `hpMul`); content.md 5 has every number, line and escort.

#### Gorrak the Warlord (act 1). Tests: blockers, single target, area

HP 5,000, armour 30, ward 0, speed 0.45. Blockable (melee 60 / 1.5 s, hits 2 soldiers).

| Phase | HP | Abilities |
| --- | --- | --- |
| 1 | 100-66% | **War Cry** every 12 s (axe raised 1.5 s, red ring r 3.0): allies in the ring +50% speed for 4 s and their slows cleared |
| 2 | 66-33% | War Cry continues. **Muster** every 14 s (plants a banner, 2 s): 4 footmen + 2 runners appear at the banner |
| 3 | <33% | **Charge** every 10 s (scrapes the ground 1.5 s; an arrow shows 4 u ahead on the path): runs 4 u at 3 u/s, unblockable, knocks soldiers aside for 40 |

Answers: soldiers hold him in phases 1-2; War Cry rewards slows spread over the path rather than one choke; Muster
wants splash; Charge wants damage behind the soldiers, not only at them.

#### The Sand Wyrm (act 2). Tests: burst windows, physical over magic, coverage

HP 9,000, armour 0, ward 45, speed 0.6. Blockable only while surfaced, and then it shoves: a held Wyrm keeps moving
at 50% and pushes the soldier along.

| Phase | HP | Abilities |
| --- | --- | --- |
| 1 | 100-50% | **Burrow** every 15 s: dives (1.5 s dust spiral) and travels 6 s underground at 1.2 u/s, untargetable and unhittable; a sand ripple shows its path and a ring marks the surfacing point 2 s ahead. Burrowing **clears all its statuses**. **Erupt** on surfacing: towers within 1.5 u of the point disabled 3 s, soldiers thrown 1 u |
| 2 | <50% | Burrow every 12 s; each surfacing also spits 2 **Sandlings** (act 2 slimes, 56 HP). **Sandstorm** every 20 s (sky darkens 2 s): tower range -20% for 6 s |

Answers: high-alpha towers (Marksmen, Ballista, Mortar) cash the surfaced windows; the ward pushes toward physical;
status clearing punishes slow hex/DoT setups; the visible surfacing ring rewards a Meteor or Siege Bolt timed on it.

#### The Frost Colossus (act 3). Tests: armour, shields, placement

HP 16,000, armour 55, ward 25, speed 0.35. Unblockable. Numbs at 800 chill (R15).

| Phase | HP | Abilities |
| --- | --- | --- |
| 1 | 100-60% | **Stomp** every 10 s (foot raised 2 s, icy ring r 2.4): towers in the ring frozen (disabled) 4 s; soldiers in it frozen 4 s and take 60 |
| 2 | 60-25% | Stomp continues. **Ice Armour**: a 2,500 shield forms (2 s frosting) and regrows to full 20 s after it breaks. Lightning x3 and fire x2 against it |
| 3 | <25% | speed 0.5; every Stomp sheds 3 **ice shards** (swarmling bodies, 30 x hpMul HP, cannot be frozen) |

Answers: shred, pierce or magic for the armour; Storm or Pyre for the ice armour; pads more than 2.4 u from the
path keep firing through stomps (the generator guarantees some, 10.3); phase 3 wants area.

#### The Ember Tyrant (act 4, final). Tests: everything, air reach above all

HP 26,000, armour 30, ward 30, fireproof 30% (R15), speed 0.5. Blockable while walking (melee 120 / 2 s).

| Phase | HP | Abilities |
| --- | --- | --- |
| 1 | 100-66% | **Flame Breath** every 11 s (head rears 1.5 s, cone 3 u x 60° toward the densest group of towers): towers in the cone disabled 3 s, soldiers in it die |
| 2 | 66-33% | **Takes Wing**: a flyer for 15 s, following the air route at 1.2 u/s; only air reach hits it; drops 2 **Ember Drakes** (act drakes at half HP) on take-off. Lands (shadow and ring 2 s ahead) **at most 6 u along the path past its take-off point** (R7) and walks again; Flame Breath continues while it walks; repeats every 30 s |
| 3 | <33% | **Molten**: armour and ward drop to 0 (fireproof stays); speed 0.65; every 8 s spawns 2 ember runners; Flame Breath every 8 s |

Answers: phase 1 rewards spreading towers so one breath does not take a whole cluster; phase 2 is the run's final
air check (a ground-only war table loses here, and the act-4 battle rosters say so from the first battle); phase 3
is a damage race the whole build joins.

#### The Hive Queen (act 1, alternative to Gorrak). Tests: air reach, area, coverage ahead

HP 5,000, armour 25, ward 25, speed 0.45 (phase 3: 0.6). Matron body at boss size; blockable (melee 40 / 1.5 s).

| Phase | HP | Abilities |
| --- | --- | --- |
| 1 | 100-60% | **Brood** every 9 s (sack swells 1.5 s): 4 swarmlings and 2 bats at her side |
| 2 | 60-30% | Brood continues. **Buried Brood** every 14 s (three mounds rise 4, 6 and 8 u ahead on the road, 2 s): each bursts into 3 Broodlings |
| 3 | <30% | Brood every 6 s with 3 bats; Buried Brood every 10 s; speed 0.6 |

Answers: air reach from the first minute (act 1's air lesson), area for the brood, towers that cover the road ahead of
the kill box.

#### The Lich (act 2, alternative to the Wyrm). Tests: physical, shields, kill position

HP 8,500, armour 0, ward 65, speed 0.5. Warlock body at boss size; blockable (melee 35 magic / 1.2 s).

| Phase | HP | Abilities |
| --- | --- | --- |
| 1 | 100-60% | **Raise Dead** every 10 s (staff raised 1.5 s, violet ring r 3.0): enemies that died in the ring in the last 10 s rise as Risen, at most 8 |
| 2 | 60-30% | Raise Dead every 8 s. **Bone Ward**: a 2,000 shield (2 s), regrowing 16 s after it breaks; lightning x3, a hex halves it |
| 3 | <30% | **Grave Tide**: ward 45, no more Bone Ward; Raise Dead every 6 s in r 4.0, at most 12, its Risen 30% faster |

Answers: physical over magic, Storm and Hexer for the shield, and killing waves away from it (or fast) so the ring finds
nothing to raise.

#### The Pack-Lord (act 3, alternative to the Colossus). Tests: spread slows, area, depth

HP 14,000, armour 25, ward 25, speed 0.7 (phase 3: 0.9). Runner body at XL boss size; blockable but slips (melee 70 /
1.0 s, cleaves 2 soldiers).

| Phase | HP | Abilities |
| --- | --- | --- |
| 1 | 100-60% | **Howl** every 12 s (head raised 1.5 s, ring r 3.5): allies in it +40% speed 5 s, slows and chill cleared; 4 Pups join |
| 2 | 60-30% | Howl continues. **Leap** every 10 s (crouch 1.5 s; arrow and landing ring 5 u ahead): 5 u along the path, unblockable in the air; 50 to soldiers where it lands; every hold breaks |
| 3 | <30% | **Frenzy**: speed 0.9, Howl every 8 s with 6 Pups, Leap every 7 s |

Answers: slows spread along the road rather than one choke, area for pups, damage deep along the path, little from
soldiers.

---

## 10. Map generation

Maps are generated per battle with the `map` RNG. Every map passes these constraints; failures reroll (max 50
tries, then a hand-made fallback per act and lane layout).

### 10.1 Path

| Constraint | Value | Intent |
| --- | --- | --- |
| Length (spawn to exit, per lane) | act 1: 48-58 u; act 2: 46-56; act 3: 44-54; act 4: 42-52 | longer is easier; a footman walks it in 40-50 s |
| Shape | polyline with segments ≥ 2 u, turns 45-180°, 4-8 bends, rounded corners | |
| Self-distance | ≥ 2.2 u between non-adjacent segments | readability |
| Edges | spawn and exit on the playfield edge, ≥ 6 u apart | |
| Signature bend | exactly 1-2 bends where one pad covers both legs (hairpin, U-turn) | the "best pad" fight |
| Long straight | at least one straight ≥ 7 u | Siege Bolt, Mortar lines |

### 10.2 Lanes

| Layout | Acts | Description |
| --- | --- | --- |
| **Single** | all (act 1: 70%) | one spawn, one exit |
| **Merge** | 1 (30%), 2+ | two spawns; lanes join at 40-60% of the path |
| **Fork** | 2+ | one spawn; the path splits for 8-14 u and rejoins; groups alternate branches by group index (Two fronts assigns them) |
| **Twin** (later, R34) | 3-4 | two spawns, two exits, no merge; total path ≤ 1.7x a single lane; pads between the lanes reach both. Not in v1: acts 3-4 use single, merge and fork |

"First" uses remaining distance to that enemy's own exit, so it works across lanes.

### 10.3 Pads

| Rule | Value |
| --- | --- |
| Count | act 1: 9-11, act 2: 10-12, act 3: 11-13, act 4: 12-14 (relic hook: +1-2) |
| Size | pad 1.6 u across, tower base 1.4 u (R4) |
| Distance to the path's centre line | ≥ 1.3 u |
| Spacing | ≥ 2.0 u centre to centre |
| **Coverage score** | path length (all lanes) within 3.2 u of the pad |
| Score mix | 2-3 "prime" (≥ 10 u, at bends), about half "good" (6-10 u), 2-3 "back" (3-6 u, ≥ 2.6 u from the path) |
| Clusters | ≥ 2 clusters of ≥ 3 pads all within 2.8 u of one pad (banner, beacon, lighthouse puzzles) |
| Exit guard | ≥ 2 pads cover the last 8 u of each lane |
| Entry gap | no pad covers the first 4 u after a spawn (enemies are seen before they are hit) |
| Coverage floor | union of all pads' 3.2 u coverage ≥ 75% of path length |
| No god pad | no pad covers more than 16 u |
| Air route | ≥ 3 pads within 3.4 u of the air route, ≥ 1 of them prime |
| Stomp-safe | act 3: ≥ 3 pads at ≥ 2.6 u from the path |
| **High ground** (R25) | 1 pad per map (2 from act 3), chosen from the "good" tier (never the best pad): raised, +15% range (`range` pool) |
| **Rubble** (ascension 7) | 1 prime pad per map (seeded) is rubble until 60 gold clears it (0.6 s, any time) |

Placement: sample candidates on a 0.5 u grid off the path, score coverage, then pick greedily under the mix and
spacing rules (seeded tie-breaks). Bends score highest by themselves because the path curves around them.

### 10.4 Air route

Flyers fly a smoothed line from spawn to exit that cuts the bends: the path's points with every bend's inner half
dropped, smoothed once at map generation, ending at 65-80% of the ground path's length. Air defence wants pads near
that chord, not the hairpin: a different question from the ground one.

### 10.5 Interesting and fair

- **Interesting**: one contested prime pad, a cluster that wants a banner, a straight that wants a Siege Bolt, a back
  pad that wants a Mortar, a high-ground pad worth bending a plan for, an air route that misses the obvious spots.
- **Fair**: the bot plays a fixed reference build (Archer, Mage, Barracks, Bombard on sensible pads, greedy upgrades)
  on each candidate against the act's median waves; maps more than 1.5 standard deviations from the act's mean leak
  count are rerolled. The map RNG never reads the player's war table.

---

## 11. Commander spells

`run-meta.md` fixes which commander has which spell; this is the mechanics catalogue for those ten (content.md 7.2
has the final numbers). Rules for all:

- Damage scales with `spellMul` (spells have no gold upgrades). Boons and relics hook in additively (Echo Stone
  recasts the first damage spell at 60% or refunds half a non-damage spell's cooldown; Sun Disc doubles the
  cooldown rate).
- Circle spells hit flyers for 50% of their damage; their slows, oil and roots never touch flyers (R2).
- Each battle starts with both spells **50% charged**. No casting in Setup.
- Cooldowns run on sim time (they scale with game speed, never the wall clock). **Calling early shortens both
  cooldowns by the seconds skipped.**
- Targeted spells: Q/W enters aim mode (reticle with a ghost of the area); click or Enter casts, Esc or right-click
  cancels. Keyboard: arrows move the reticle along the path in 1 u steps, Tab jumps lanes. Instant spells cast on
  the key.
- Balance target: one spell over a battle is worth **60-80% of an L2 tower's output**; more in a pinch (burst,
  timing), less on average. No spell answers a role permanently.

| Spell | Commander | Target | Effect | Cooldown |
| --- | --- | --- | --- | --- |
| **Reinforcements** | Marshal Q | path point | 2 soldiers (HP 90, armour 15, dmg 8 / 1.0 s, HP and dmg x spellMul) drop and hold for 10 s; normal blocking rules | 18 s |
| **Meteor** | Marshal W | circle r 1.4 | after a 1 s warning circle, 220 fire (x spellMul) in r 1.4 and burn 20 dps 3 s; ignites oil | 40 s |
| **Firebomb** | Alchemist Q | circle r 1.4 | lays an oil puddle (6 s) and lights it at once: ignites everyone inside (60 fire + burn each) and leaves a fire patch; base 80 fire (x spellMul) | 25 s |
| **Tar Pit** | Alchemist W | circle r 2.0 | a pool for 6 s: 50% slow inside (a slow, max rule), Oiled while inside; lightable | 40 s |
| **Stillness** | Seer Q | instant, global | every enemy is **Frozen** 3 s (ignores freezeAt, respects Thawing and the hard-CC immunity; elites 1.5 s; bosses Numb 3 s, the Colossus too). Fire still thaws, and Shatter brittle applies only if a Shatter spire hits them | 60 s |
| **Judgement** | Seer W | auto: enemy with the most HP | 350 pure (x spellMul) + stun 1 s (bosses 0.25 s); interrupts a warlock channel | 30 s |
| **Requisition** | Quartermaster Q | a tower | the tower gains its next level (not a specialisation) for 50% of that upgrade's price (`cost` -50%, R11) | 30 s |
| **Rally** | Quartermaster W | instant | all towers and soldiers +40% attack speed for 8 s (adds over banners; cap applies) | 40 s |
| **Barrier** | Warden Q | path point | a root wall across the path for 4 s: blocks every ground enemy (it holds any number); juggernauts and bosses break it after 1 s | 35 s |
| **Bramble Surge** | Warden W | circle r 2.2 | roots every ground enemy inside for 2 s (respects root immunity; juggernauts and bosses get a 50% slow 2 s) and 30 phys (x spellMul) | 40 s |

Stillness is the strongest single effect in the list; its 60 s cooldown and the fire/ice rule are its price, and it
makes the Seer's Shatter and Storm (Conductor) draft strong, as `run-meta.md` intends.

### 11.1 War supplies (R20)

Two consumable slots, keys **E** and **D**; each supply is used once and its slot empties. They work in Setup and
while paused (unlike spells), aim like spells (circle, path point, auto or instant) and fire `supply_used`. Damage
is x `spellMul`; circle supplies hit flyers at 50% like spells. The ten kinds and their numbers are content.md
11.10: Oil Barrel (a puddle r 1.2), Frost Flask (Frozen 2 s in r 1.5), Gold Cache (+60 x gold), Spike Trap (60 phys to
the next 8 that pass), War Horn (+30% attack speed 8 s, `aspd`), Mason's Kit (ends every disable), Flare (reveal all
10 s), Heavy Bolt (300 pure to the strongest), Bell (stun all 1.5 s, bosses 0.4 s), Lifeblood (+2 lives).

---

## 12. Sim events (game-feel hooks)

The sim appends plain records to `battle.events` each tick; the surface drains them (`architecture.md`). The sim never
waits on effects: hitstop, shake and slow motion are surface-only and never change sim timing. Every event carries
`tick`, `pos` (x, y in u) and the ids involved, so the surface never looks up a dead entity.

| Event | Payload | Suggested feel |
| --- | --- | --- |
| `wave_start` | wave, calledEarly, bonus, interest, income | horn, coin counter tick |
| `wave_spawned` | wave, countdown ticks | skull returns with its timer |
| `spawn` | enemy, role, lane | |
| `shoot` | tower, kind, target | muzzle flash, per-tower sound |
| `hit` | target, amount, type, crit, shieldAbsorbed | number in the type's colour |
| `crit` | amount, mult, marked | big gold number; a x3.5 Deadeye gets a crack and a 2-frame hitstop |
| `kill` | enemy, role, by, bounty, overkill, threat | coin pop; **hitstop 2-3 frames when threat ≥ 3 or overkill ≥ its max HP** |
| `split` | parent, children | squelch |
| `leak` | enemy, livesLost, livesLeft | red edge flash, heavy drum; tremor at ≥ 2 lives |
| `lives_low` | livesLeft ≤ 5 | music layer change |
| `chill` / `freeze` / `thaw` / `numb` | enemy, source | ice crust, crack-in, steam on thaw |
| `shatter` | enemy, chainIndex, damage | glass burst, pitch rises with chain index; hitstop at chain ≥ 3 |
| `ignite` | enemy, puddleLit | whoomp, orange flash |
| `explode` | radius, source (Naphtha, Meteor, shell) | camera bump, scorch decal |
| `burn_tick` | enemy, amount (batched per 0.5 s) | embers; damage shown as one sum per second |
| `shield_up` / `shield_break` | enemy, byLightning | glass pop, bigger for lightning |
| `hex` / `mark` | enemy | purple sigil / white ring |
| `stun` / `root` | enemy | stars / vines |
| `pull` / `grounded` | enemy | rope streak / crash dust |
| `block` / `soldier_down` / `soldier_respawn` | soldier, enemy | clash, fall, march-in |
| `heal_pulse` | shaman, healed, refused | green ring, broken ring on hexed |
| `sapper_plant` / `tower_disabled` / `tower_enabled` | tower, ticks | fuse spark, smoke |
| `summon` | caster, ids | rune circle |
| `build` / `upgrade` / `specialise` / `sell` | pad, tower, level | scaffolding, hammer, a chord on specialise |
| `synergy_first` | synergy name | one-time codex toast |
| `spell_cast` / `spell_ready` | spell, target | spell-specific; ready chime |
| `boss_spawn` | boss | music change, name banner |
| `boss_telegraph` | boss, ability, area, ticksUntil | warning ring or line, a sound per ability |
| `boss_ability` | boss, ability, towersHit, soldiersHit | big impact, shake |
| `boss_phase` | boss, phase | roar, 1 s surface slow motion, music intensifies |
| `pressure` | 0..1, every 15 ticks | adaptive music |
| `supply_used` | supply, area | the supply's own effect (art 5.8) |
| `boss_lap` | boss, lap | horde gate flares, boss bar lap pip, horn |
| `victory` / `defeat` | battle stats | slow-motion finish |

`pressure` = sum over living enemies of `threat * (1 - remaining / pathLength)^2`, divided by the current wave's
budget, clamped to 0..1 and smoothed over 1 s. The music gets one number.

---

## 13. Speed, pausing and determinism

### 13.1 Fixed step and commands

- One tick = 1/30 s. State advances only through `step()`. No `Date`, `performance.now` or `Math.random` in `game/`.
- **Speed**: F cycles 1x / 2x / 3x = 1 / 2 / 3 ticks per 1/30 s of real time. The surface's accumulator caps at 6 ticks
  per frame and drops time after a stall instead of spiralling. Speed is a surface setting, not sim state.
- **Pause** (P / Esc): the surface stops calling `step()`. Commands still apply.
- **Commands** (build, upgrade, specialise, sell, rally, target mode, spell cast, supply use, clear rubble, accept
  the ghost layout, call early) are queued with the tick
  they apply on and applied at the start of that tick, in queue order. While paused the sim applies queued commands
  without advancing the tick, so building while paused is instant and still deterministic.
- A battle is reproduced exactly by `(runSeed, battleIndex, run snapshot: war table, boons, relics, commander, lives,
  command log)`. Replays and the bot use this.

### 13.2 RNG

- The seeded `Rng` in `game/rng.ts`, integer state.
- Separate **streams** seeded from `hash(runSeed, battleIndex, streamName)`: `map`, `waves`, `combat` (crits, Volley and
  Firestorm target picks, Arrow Rain spots, bomblet spots), `cosmetic` (lateral spawn offsets, never read by rules). A
  change in how many crits roll never reshuffles the map or the waves.
- Fixed draw order: entities iterate by ascending id, in the tick order below.

### 13.3 Float safety

- Rules use only `+ - * /` and `Math.sqrt` (IEEE-exact on every engine). **No `Math.sin`, `cos`, `atan2`, `pow`, `exp` in
  rules**: cones test a dot product against a precomputed constant (`cos 35°` written as a literal), falloff is linear,
  the air route is smoothed with a fixed polynomial at map generation.
- Path positions are stored as distance `s` along a polyline; world positions derive from `s`.
- Timers are integer ticks; percent stats are integers; HP and damage are floats shown with `ceil`.

### 13.4 Tick order

```
1. apply queued commands
2. spawners (wave groups, summons, splits queued last tick)
3. statuses: durations, DoT ticks, chill decay, immunity windows, puddles and patches
4. enemies: move (after slows and CC), plant, channel, heal, shield auras, boss abilities
5. soldiers: acquire, move, attack; enemy melee against soldiers
6. towers: cooldowns, target (mode, overkill guard), fire
7. projectiles: move, resolve hits (formula 4.3, statuses), area effects
8. deaths: bounty, queue splits and summons, shatter and ignite chains (breadth-first, ascending id)
9. leaks, lives, victory/defeat
10. wave timer, call-early window; on wave start: interest, then income, then bonus
11. pressure
```

### 13.5 What the bot checks (systems side)

- Battle length at 1x 2:00-3:15 for a bot that never calls early (setup excluded).
- New-player bot dies in act 1-2 in most runs; a competent bot wins around run 3-8 of meta progression.
- Per-tower pick / win / damage share within 0.6x-1.4x of the mean (8.5).
- Every archetype wave is beaten by at least 4 different two-tower pairs; none is beaten by only one tower type.
- Shatterline, Wildfire and Deadeye each add 40-100% to their pair's output over the same gold without the synergy;
  above 120% is a bug.
- Every map passes 10.3; reference-build leak variance per act inside its band.

---

## 14. Changes and additions to the brief

| What | Brief | This doc | Why |
| --- | --- | --- | --- |
| Target-mode hotkey | not listed | **T** cycles First / Strongest / Last on the selected tower; also a chip in the radial menu | Marksmen, Ballista and Hexer need it, and it must work from the keyboard |
| Rally hotkey | not listed | **R** on a selected Barracks or Treant, arrows step, Enter confirms | full keyboard play |
| Call early | anytime | only after the current wave has finished spawning | stops Space spam stacking waves; waves stay readable |
| Fire | "fire (burn)" | fire ignores armour and ward; only fireproofing reduces it; fire and ice cancel | gives fire an identity and a visible price |
| Pure | listed | only from shatter bursts, Judgement and the Heavy Bolt supply | rare so it stays exciting |
| Leak values | 1-3, bosses 10 | 1 small, 2 medium, 3 elites, 10 bosses, per role | as the brief, made exact |
| Act traits | not in brief | one rule per act | Frost and Pyre each get an act to shine and one to struggle |
| Elite affixes | not in brief | small list from act 2 | elites stay fresh over a run; an ascension hook |
| Sell refund | not specified | 100% in Setup, 70% after, none in the last wave; X twice to confirm | free experimenting before wave 1, no mid-battle trick |
| Spell scaling | not specified | x `spellMul` | spells have no gold upgrades and would fall off |
| Battle roster | not in brief | every role in the battle shown in Setup | planning before the first tower, and fairness without reading the war table |
| No flyers in battle 1 | not in brief | first air wave is battle 2, wave 4 at the earliest | `run-meta.md` starts two commanders with no air reach |
| Boss leaks | a boss leak costs 10 | 10 lives, and the boss laps (+20% speed) until it dies (R1) | a leaked boss must not be a win |
| Hard CC | not specified | one shared 1 s immunity after any stun, root, freeze or pull (R9) | no perma-lock from two CC towers |
| War supplies | not in brief | two one-use slots, E and D (R20) | a small in-battle choice that the run feeds |

Settled by the lead (DESIGN.md, Revision 1): Firestorm keeps air at 50% (R12); Treasury and Requisition were
reworked (R11) and Ledger keeps its 20-crown cap; every boon names its pool in content.md 0.1, and no boon
multiplies outside the pools.
