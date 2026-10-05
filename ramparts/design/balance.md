# Ramparts: balance log

Owned by the balance agent. Every tuning change, the evidence for it, and what is still open.
Numbers here override content.md until the lead sweeps the chapters.

## How it is measured

- `game/bot/battle.ts`: a battle bot with knowledge `k` (run-meta 9). It reads only what a player
  sees (map, roster, next-wave skull, the field), thinks every 0.45-0.8 s, acts at most 0.9-2.0 times
  a second, reacts 0.4-1.1 s late (spells land where the clump *was*), and its pad and purchase
  choices carry noise that shrinks with `k`. It values a layout as *lives saved*: for each enemy
  role, the lives it usually puts at stake in a battle of this act/floor (`game/bot/expect.ts`,
  game knowledge, never the battle's hidden waves) times the share of that column's health its
  towers can take (measured rates from `game/bot/thru.ts` x time the column spends in reach).
- `game/bot/run.ts`: the run bot (blessing, path, cards, shop, events, rest, forge, picks) and
  careers (a learning player on one profile, renown and unlocks carrying over).
- `scripts/sim.ts`: the survey (`--quick`, default, `--core`, `--cmds`, `--ks`, `--asc`, `--lifts`,
  `--synergy`). Reports land in `scripts/balance/report-<date>-<mode>.txt`.
- `scripts/sim-trace.ts`: one battle, decision by decision, with the reason for each command.
- `scripts/balance/*`: probes used to find causes (`thru.ts` tower rates, `kcurve.ts` leaks by k,
  `cmd-battles.ts` commander tables, `leakwhy.ts` leaks by archetype/kind, `elites.ts` elites and
  bosses, `actscale.ts` health/gold grids, `tune.sh` content overrides via `TUNE`).

## Bot validation (before any tuning)

Checked with traces and controlled battles:

| Silly behaviour found | Fix |
| --- | --- |
| Built 9 Barracks (soldiers' stream rate taken at face value) | soldiers' kills x0.4 (their in-battle damage per gold is 0.4x mean); holding valued as a kill-box bonus on the towers covering the rally point |
| Barracks on pads with no road in reach | barracks/groves only where a rally point fits |
| Piled ground towers while every bat leaked | value per enemy column with a soft cap, so an uncovered role (air) is worth more than more of what is covered |
| Ignored Beacons against shades | single-target towers count ~0 against unrevealed shades |
| Banked 250 gold for interest while waves grew | no interest banking; only leftover-crown gold once the last wave is out |
| Switched every tower to "strongest" when a boss came, adds leaked | every other single-target tower focuses the boss |
| Took elites whenever above half lives; elites cost more than they paid | elites only above 60% (decent) / 75% (expert) lives |
| Shared a tower's attention across the whole roster | attention is shared only within one wave |

Validation numbers (act I, 30 battles, Marshal table): lives lost 3.4 / 2.2 / 0.1 at k 0.2 / 0.6 / 0.9
(`kcurve.ts`); a mixed six-tower table now beats a mono-tower table in every act (`mono.ts`).

## Root cause of "battles too hard"

Measured with the bot (not guessed):

1. **Enemy health grew faster than gold.** hpMul 1.0/1.4/1.9/2.4 while gold per battle grew
   ~1/1.5/2.2/3.0, and stacking (L3/spec) buys less power per gold. At design numbers an expert
   bot with six towers lost 2 / 23 / 44 / 164 lives per battle in acts I-IV (`actscale.ts`).
2. **Shades leaked no matter how strong the defence** (every shade got through unless a Beacon or
   Grove was on the table): 4-8 lives a battle from act II.
3. **Bats**: 40 / 56 / 102 bats per act II / III / IV battle at threat 0.6.
4. **Elites and bosses** cost 3-4x a battle; act III bosses were beaten 10-35% of the time.
5. **Commanders' kits**: the Marshal's spells were worth ~7 lives a battle in act I
   (5.1 -> 0.3 with spells on); everyone else's 2-5.

## Changes (content numbers; previous in brackets)

| What | Now | Was | Why |
| --- | --- | --- | --- |
| hpMul / spellMul acts I-IV | 1.0 / 1.0 / 1.1 / 1.25 | 1.0 / 1.4 / 1.9 / 2.4 | keeps health per gold of income roughly flat across acts (see 1) |
| bountyMul acts I-IV | 1.0 / 1.45 / 1.6 / 1.75 | 1.0 / 1.1 / 1.2 / 1.3 | same; gold rather than lower health keeps later enemies tougher than act I's |
| act I start gold | 340 | 260 | act I battles were decided by the first 3 towers vs the wave-2 rush; non-Marshal kits lost 8-15 lives |
| runner threat | 1.0 | 0.8 | per threat a runner demanded 1.3x the damage-time of a footman |
| bat threat | 1.0 | 0.6 | fewer, same-health bats (see 3) |
| shade | threat 3, hp 100, leak 1 | 2, 70, 2 | see 2; still a stealth check, no longer a fixed 4-8 lives |
| juggernaut / warlock / matron hp | 900 / 570 / 720 | 1500 / 950 / 1200 | elites cost ~4 lives more than a battle for one relic |
| boss hp | Gorrak 4000, Hive Queen 3400, Wyrm 5200, Lich 6800, Colossus 8000, Pack-Lord 5500, Tyrant 20800 | 5000, 5000, 9000, 8500, 16000, 14000, 26000 | each pair tuned toward equal beat rates; act III bosses were the run wall |
| Bombard damage L1-L3 | 40 / 62 / 92 | 28 / 44 / 66 | half the archer's rate per gold; built in 1% of battles |
| Thornwood thorns L1-L3 | 8 / 13 / 19 | 6 / 10 / 15 | Warden's core tower; below the median rate per gold |
| Reinforcements cooldown | 35 s | 18 s | Marshal spells were worth ~7 lives a battle |
| Meteor damage | 160 | 220 | same |
| Stillness / Judgement cooldown | 35 / 20 s | 60 / 30 s | Seer spells saved ~1 life a battle |
| Requisition / Rally cooldown | 20 / 25 s | 30 / 40 s | Quartermaster |
| Barrier / Bramble Surge cooldown, Surge damage | 20 / 25 s, 60 | 35 / 40 s, 30 | Warden |

Rule fix (game/battle/towers.ts): **a Frost Spire keeps chilling one enemy until it freezes or
leaves reach.** In a column, chill slows the target and the next enemy overtakes it, so "first"
hopped targets on nearly every shot and an L1 spire never froze anything (0 freezes/min against a
footman column, `frost-probe.ts`). With the rule and "last" targeting (experts set it) an L1 spire
freezes 6-8 a minute, as the 18-chill/100-meter numbers intend.

## Open (could not fix inside numbers, or not yet)

- **Expert gap.** The bot's skill ceiling is low: win rate rises from k 0.2 to 0.75 and then flattens
  (k sweep). Expert targets (80/50/15-25) are not met; the decent target is the anchor.
- **Commanders.** Non-Marshal kits are 13-29 points below the Marshal. The Warden (Barracks, Grove,
  Bombard: no air, all physical) loses most runs on act I's boss and bat waves. Swapping its Bombard
  for an Archer measured 11.3 -> 1.3 lives per act I battle (`tables.ts`). A starting-table change is
  a lead decision; recommended.
- **Towers.** Archer carries ~60% of all damage (the Marshal's starter that boons pile onto). Pyre's
  stream rate is 2x the field (`thru.ts`) but it is rarely on the table; watch it with the Alchemist.
  Frost, Alchemist, Banner, Beacon are support whose value the damage-share metrics do not show.
- **Specs.** Several 0/100 splits (Paladins, Hexer, Shrapnel, Treant, Harpoon, Lighthouse, War Drums)
  are partly the bot valuing specs by measured damage only; needs forced-spec battle A/B.
- **Synergies.** The arena test shows Shatterline ~0%, Wildfire <=9%, Deadeye 16-23% lift; brittle
  rarely meets physical hits in a stream. Needs a battle-level synergy test before tuning.
- **Run length** ~60 min estimated vs 30-45: battles run ~3:00-3:10 at 1x and boss fights 4:30-5:00;
  the bot calls early ~1x a battle.

## Session 2 (2026-10-05)

### Step 0: tree made consistent
- Tests that pinned old numbers now read them from content (`ACTS[2].bountyMul`, `SPELL_NUM.meteorDmg`,
  `SPELL_NUM.surgeDmg`): the numbers changed on purpose (table above).
- "bat caps (R2)": 40 seeds per floor instead of 80 and a 20 s limit (map generation got slower in
  87f80f6; the check itself is unchanged).
- Bot act I guard: 16 seeds, >= 10 through. Decent Marshal clears act I 63/80 (79%); every act I
  death in that sample was the Hive Queen (6 seeds were a coin flip: 3/6 on seeds 11-16).

### Warden starting table (lead ruling 1)
- Warden: Barracks, Thornwood, **Archer** (was Bombard). Card line now "Nothing gets through, on foot
  or on the wing." R2's forced air blueprint no longer applies to it (test updated).
- Commanders, decent k0.6 A0, 300 runs each (`sim.ts --cmds`, after the swap): Marshal 35%, Alchemist 17%
  (-18), Seer 23% (-11), Quartermaster 15% (-20), Warden 19% (-15; was 2% before the swap and the
  bounty changes). **Still outside the 8-point band**; starting relics/passives not tuned yet (ran out of time).

### Run length (lead ruling 2)
- `sim.ts` now estimates real minutes as run-meta's time budget does: 0.75 x 1x battle time + 30 s
  setup + 15 s reward per fight, 20 s per rest/camp, 35 s per other node, 30 s per act.
- Decent Marshal win: **~54-55 min** (battles 6.1 x 2:53, elites 3.8 x 3:35, bosses 4.0 x 4:12, 10.3
  other nodes). Over 45. Not yet changed: boss pre-waves 7 -> 5 and a boss-health trim were next.
  Cutting two pre-waves saves ~0.5 min per boss (~2 min a run) by the measured 21 s/wave; the bigger
  items are elites (3.8 per winning run vs the budget's 2.5) and boss fights at 4:12 real.

### Bot model: throughput table (finding, not shipped)
- `scripts/balance/thru.ts` spawned its stream at the gate; since 87f80f6 roads span the board, so
  slow roles reached the reference pad only after the 12 s warm-up and were measured near idle. Fixed
  (spawn just before the pad's stretch; ground and air coverage recorded apart, `acov`, used by
  `towerVec` when present).
- **But the re-measured table made the bot play worse** (core, 200 runs: decent 38 -> 30-34%, expert
  45 -> 31-42%; hybrids and an air weight did not recover it). The bot's other constants were tuned
  against the old table, so `game/bot/thru.ts` stays the old table until the model is recalibrated
  as a whole. Regenerating it with `--write` is a deliberate step, to be A/B'd with `--core`.

### Tower dominance (lead ruling 3): diagnosis only
- `scripts/balance/field.ts` (one tower + Archer + Barracks, act I-III battles, lives 999): the bot
  puts 70-96% of its gold into Archers; the partner towers get 70-350 gold a battle but deal
  1.2-3x the Archer's damage per gold (Mage 1.2-2.4x, Bombard 1.7-2.6x, Pyre 2-3x). As one-tower
  tables with a Barracks, Mage leaks less than Archer (act II 5.8 vs 12.9, act III 13.7 vs 17.1),
  Storm far less (2.3 / 4.1). So the Archer share is mostly **how the bot builds**: it builds the
  cheap Archer first, the Marshal's free first upgrade lands on it, and upgrade bonuses then snowball
  it to Volley. No tower numbers changed yet.

### Synergies (lead ruling 5): battle-level test added, not tuned
- `scripts/balance/synergy-battle.ts`: the pair on two pads sharing road through a real act II
  battle (health x3, no bot), against each alone on the same pad. Shatterline 1-4%, Wildfire -23% /
  1%, Deadeye 25-32%. Causes found: brittle lasts only the freeze + 1 s and physical towers rarely
  target the frozen enemy; Naphtha already lights itself (every 4th flask), and Pyre lighting puddles
  early and burns taking the max (not the sum) make the pair worse than both alone; Deadeye x3.5 on
  ~40% crits of one marked target.

### Not reached this session
Specs A/B (ruling 4), bot ceiling (ruling 6), commander relic/passive tuning, run-length cuts.
