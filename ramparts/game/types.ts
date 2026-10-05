// THE CONTRACT between game/ (rules) and surface/ (drawing, UI, audio).
// Owned by the lead. Rules agents may ADD fields; renaming or removing one is a
// lead decision, because the renderer, UI, VFX and audio all read these shapes.
// Units: world units u (map is ~32 x 18 u, x right, y down), seconds, ticks at 30 Hz.
// See design/systems.md for every rule these fields carry.

export const HZ = 30;
export const DT = 1 / HZ;

// ---------------------------------------------------------------- ids
export type TowerId =
  | "archer" | "barracks" | "mage" | "bombard" | "frost" | "alchemist"
  | "pyre" | "storm" | "beacon" | "banner" | "ballista" | "thornwood";

export type SpecId =
  | "marksmen" | "volley" | "paladins" | "blademasters" | "arcanist" | "hexer"
  | "mortar" | "shrapnel" | "glacier" | "shatter" | "acid" | "naphtha"
  | "inferno" | "firestorm" | "tempest" | "overload" | "lighthouse" | "huntersmark"
  | "wardrums" | "treasury" | "harpoon" | "siegebolt" | "bramble" | "treant";

export type EnemyId =
  | "footman" | "runner" | "brute" | "acolyte" | "shieldbearer" | "shaman"
  | "splitter" | "slime" | "slimelet" | "shade" | "swarmling" | "sapper"
  | "bat" | "drake" | "juggernaut" | "warlock" | "matron" | "skeleton" | "shard"
  | "risen" | "sandling" | "brood" | "pup" | "ember-runner" | "ember-drake"
  | "gorrak" | "wyrm" | "colossus" | "tyrant" | "hivequeen" | "lich" | "packlord";

export type BossId = "gorrak" | "wyrm" | "colossus" | "tyrant" | "hivequeen" | "lich" | "packlord";
export type SupplyId = "oil-barrel" | "frost-flask" | "gold-cache" | "spike-trap" | "war-horn" | "masons-kit" | "flare" | "heavy-bolt" | "bell" | "lifeblood";
export type CommanderId = "marshal" | "alchemist" | "seer" | "quartermaster" | "warden";
export type SpellId =
  | "reinforcements" | "meteor" | "firebomb" | "tarpit" | "stillness"
  | "judgement" | "requisition" | "rally" | "barrier" | "bramblesurge";
export type RelicId = string;   // content/relics.ts defines the union of literal ids
export type BoonId = string;    // content/boons.ts
export type CurseId = string;   // content/curses.ts
export type EventId = string;   // content/events.ts

export type Act = 1 | 2 | 3 | 4;
export type Theme = "meadow" | "desert" | "peaks" | "citadel";
export const THEMES: Record<Act, Theme> = { 1: "meadow", 2: "desert", 3: "peaks", 4: "citadel" };

export type DamageType = "phys" | "magic" | "fire" | "pure";
export type TargetMode = "first" | "strong" | "last";
export type Rarity = "common" | "uncommon" | "rare" | "boss" | "shop" | "event" | "starter";
export type NodeKind = "battle" | "elite" | "boss" | "event" | "shop" | "forge" | "rest" | "treasure" | "bounty" | "camp";
export type BattleKind = "battle" | "elite" | "boss" | "bounty" | "ambush";

export interface Vec { x: number; y: number }

// ---------------------------------------------------------------- map
/** A route from a spawn to an exit. Ground lanes and air routes share this shape. */
export interface Lane {
  id: number;
  /** Polyline centre points in u; `cum[i]` is the distance from points[0] to points[i]. */
  points: Vec[];
  cum: number[];
  length: number;
  /** Index of the spawn (horde gate) and exit (our gate) this lane uses. */
  spawn: number;
  exit: number;
}

export interface Pad {
  id: number;
  x: number; y: number;
  /** Path length within 3.2 u (coverage). */
  score: number;
  tier: "prime" | "good" | "back";
  /** Extra pad from a relic (drawn slightly differently). */
  bonus?: boolean;
  /** High ground: +15% range (R25). */
  high?: boolean;
  /** Rubble (ascension 7): gold to clear before building; 0/undefined = clear. */
  rubble?: number;
}

export interface BattleMap {
  seed: number;
  act: Act;
  theme: Theme;
  /** Playable rect size in u. */
  w: number; h: number;
  layout: "single" | "merge" | "fork" | "twin";
  lanes: Lane[];        // ground
  air: Lane[];          // one per spawn, cut corners
  spawns: Vec[];        // horde gates (on the edge)
  exits: Vec[];         // our gates (on the edge)
  pads: Pad[];
  /** Cosmetic hints the renderer may use (never read by rules): water pools, a stream to the edge. */
  water: { x: number; y: number; r: number }[];
}

// ---------------------------------------------------------------- statuses
export interface Statuses {
  slow: number; slowT: number;            // strongest slow fraction 0..0.75 and its ticks left
  chill: number;                          // meter 0..freezeAt
  frozen: number;                         // ticks left
  thaw: number;                           // ticks of chill immunity
  numb: number;                           // ticks
  brittle: number;                        // ticks (shatter spire freeze)
  burnDps: number; burnT: number;
  oiled: number;                          // ticks
  marked: number; markPct: number;        // ticks, taken bonus
  hexed: number; hexPct: number;
  shred: number; corrode: number; shredT: number;
  stun: number; stunImmune: number;
  root: number; rootImmune: number;
  revealed: number;                       // ticks
  charges: number; chargeT: number;       // Overload
  grounded: number;                       // ticks (harpooned flyer)
  warcry: number;                         // ticks of a boss speed buff
}

// ---------------------------------------------------------------- entities
export interface Enemy {
  id: number;
  kind: EnemyId;
  lane: number;          // index into map.lanes, or map.air when `air`
  air: boolean;          // currently a flyer (false while grounded)
  s: number;             // distance along its lane
  x: number; y: number;  // world position (u)
  px: number; py: number;// previous tick's position, for interpolation
  /** Height above ground for drawing (flyers, burrowed wyrm < 0). */
  z: number;
  hp: number; maxHp: number;
  shield: number; maxShield: number;
  armour: number; ward: number; fireproof: number;
  baseSpeed: number;
  /** Effective speed this tick (0 when held/frozen/stunned). */
  speed: number;
  st: Statuses;
  stealth: boolean;
  heldBy: number;        // soldier id, 0 = free
  elite: boolean;
  affixes: string[];
  boss?: BossState;
  /** Spawned this tick (surface plays an entrance). */
  born: number;          // tick
}

export interface BossState {
  id: BossId;
  phase: number;         // 1-based
  /** Ability being telegraphed now, its area and ticks until it lands. */
  tele?: { ability: string; x: number; y: number; r: number; dx?: number; dy?: number; ticks: number; total: number };
  burrowed: boolean;
  flying: boolean;
  invuln: number;        // ticks
  iceShield: number;     // colossus ice armour points
}

export interface Tower {
  id: number;
  pad: number;
  kind: TowerId;
  level: 1 | 2 | 3 | 4;  // 4 = specialised
  spec: SpecId | null;
  mode: TargetMode;
  cooldown: number;      // ticks to next attack
  /** Current aim point (for turning the head toward); target id 0 = idle. */
  target: number; aimX: number; aimY: number;
  building: number;      // ticks of construction left (inactive)
  disabled: number;      // ticks disabled (sapper, stomp, breath, erupt)
  invested: number;      // gold spent (sell value base)
  /** Rally point for barracks / treant (on the path). */
  rally?: Vec;
  /** Attack counter (every Nth attack mechanics), heat ramp, etc. */
  shots: number;
  heat: number;
  stats: { damage: number; kills: number };
}

export type SoldierKind = "soldier" | "paladin" | "blademaster" | "treant" | "reinforcement";
export interface Soldier {
  id: number;
  tower: number;         // owner tower id (0 for spell reinforcements)
  kind: SoldierKind;
  x: number; y: number; px: number; py: number;
  hp: number; maxHp: number;
  state: "idle" | "moving" | "fighting" | "dead";
  target: number;        // enemy id
  respawn: number;       // ticks while dead
  ttl: number;           // reinforcements: ticks left (-1 = permanent)
  /** Slot offset around the rally point. */
  slot: number;
}

export type ProjectileKind =
  | "arrow" | "volley" | "marksman" | "bolt" | "arcane" | "hex" | "shell" | "mortar" | "bomblet"
  | "flask" | "firebomb" | "shard" | "fireball" | "ballista" | "harpoon" | "siege" | "meteor";
export interface Projectile {
  id: number;
  kind: ProjectileKind;
  from: number;          // tower id (0 = spell)
  target: number;        // enemy id for homing, 0 for lobbed
  x: number; y: number; z: number;
  px: number; py: number; pz: number;
  sx: number; sy: number;   // start
  tx: number; ty: number;   // aim / landing point
  t: number; dur: number;   // ticks flown / total (lobbed)
  homing: boolean;
}

export type ZoneKind = "oil" | "acid" | "fire" | "crater" | "tar" | "burning" | "barrier" | "bramble" | "spikes";
export interface Zone {
  id: number;
  kind: ZoneKind;
  x: number; y: number; r: number;
  ticks: number; total: number;
  from: number;          // tower id or 0
}

// ---------------------------------------------------------------- waves
export interface WaveGroup {
  kind: EnemyId;
  count: number;
  lane: number;          // ground lane index (flyers use the air route of that lane's spawn)
  spacing: number;       // ticks between units
  delay: number;         // ticks after wave start
  elite?: boolean;
  affixes?: string[];
}
export interface WavePlan {
  index: number;         // 0-based
  archetype: string;
  threat: number;
  groups: WaveGroup[];
  boss?: BossId;
  /** Trait badges for the preview: "air" | "stealth" | "armour" | "ward" | "shield" | "healer" | "elite" | "boss" | "new". */
  badges: string[];
}

// ---------------------------------------------------------------- spells
export interface SpellState {
  id: SpellId;
  key: "Q" | "W";
  cooldown: number;      // ticks remaining
  total: number;         // full cooldown in ticks
  /** "point" spells need a path point, "circle" an area, "instant" none, "auto" picks its own target. */
  aim: "point" | "circle" | "instant" | "auto";
  radius: number;
  casts: number;
}

// ---------------------------------------------------------------- commands
export type Command =
  | { t: "build"; pad: number; tower: TowerId }
  | { t: "upgrade"; tower: number }
  | { t: "specialise"; tower: number; spec: SpecId }
  | { t: "sell"; tower: number }
  | { t: "mode"; tower: number; mode: TargetMode }
  | { t: "rally"; tower: number; x: number; y: number }
  | { t: "call" }                                       // start wave 1 / call the next wave early
  | { t: "cast"; spell: "Q" | "W"; x?: number; y?: number; tower?: number }
  | { t: "supply"; slot: number; x?: number; y?: number }
  | { t: "clear"; pad: number }                         // pay to clear rubble
  | { t: "ghost" };                                     // accept the ghost layout in setup

// ---------------------------------------------------------------- events (sim -> surface)
interface E0 { tick: number; x: number; y: number }
export type BattleEvent = E0 & (
  | { e: "wave_start"; wave: number; early: boolean; bonus: number; interest: number; income: number }
  | { e: "wave_spawned"; wave: number; countdown: number }
  | { e: "spawn"; id: number; kind: EnemyId; lane: number }
  | { e: "shoot"; tower: number; kind: TowerId; spec: SpecId | null; target: number; tx: number; ty: number }
  | { e: "hit"; target: number; amount: number; type: DamageType; crit: boolean; mult: number; shield: number; big: boolean; tower: number }
  | { e: "kill"; id: number; kind: EnemyId; by: number; bounty: number; overkill: number; threat: number; elite: boolean; boss: boolean }
  | { e: "split"; parent: number; children: number[] }
  | { e: "leak"; id: number; kind: EnemyId; lives: number; left: number }
  | { e: "lives_low"; left: number }
  | { e: "chill" | "freeze" | "thaw" | "numb"; id: number }
  | { e: "shatter"; id: number; chain: number; damage: number; r: number }
  | { e: "ignite"; id: number; puddle: boolean }
  | { e: "explode"; r: number; source: string; damage: number }
  | { e: "burn_tick"; id: number; amount: number }
  | { e: "shield_up" | "shield_break"; id: number; lightning: boolean }
  | { e: "hex" | "mark" | "stun" | "root" | "pull" | "grounded" | "reveal"; id: number }
  | { e: "chain"; tower: number; ids: number[]; pts: Vec[] }            // lightning path, for drawing
  | { e: "cone"; tower: number; dx: number; dy: number; r: number }     // flame puff, for drawing
  | { e: "nova"; tower: number; r: number }
  | { e: "aura_pulse"; tower: number; r: number }
  | { e: "block"; soldier: number; id: number }
  | { e: "soldier_down" | "soldier_respawn"; soldier: number }
  | { e: "heal_pulse"; id: number; r: number; healed: number; refused: number }
  | { e: "sapper_plant"; id: number; tower: number }
  | { e: "tower_disabled" | "tower_enabled"; tower: number; ticks: number }
  | { e: "summon"; id: number; ids: number[] }
  | { e: "build" | "upgrade" | "specialise" | "sell"; tower: number; pad: number; kind: TowerId; level: number; gold: number }
  | { e: "deny"; reason: string }
  | { e: "synergy_first"; name: string }
  | { e: "spell_cast"; spell: SpellId; r: number }
  | { e: "spell_ready"; spell: SpellId }
  | { e: "gold"; amount: number; reason: string }
  | { e: "boss_spawn"; id: number; boss: BossId }
  | { e: "boss_telegraph"; id: number; boss: BossId; ability: string; r: number; ticks: number }
  | { e: "boss_ability"; id: number; boss: BossId; ability: string; r: number; towers: number[]; soldiers: number[] }
  | { e: "boss_phase"; id: number; boss: BossId; phase: number }
  | { e: "pressure"; value: number }
  | { e: "supply_used"; supply: SupplyId; r: number }
  | { e: "boss_lap"; id: number; boss: BossId; lap: number }
  | { e: "victory" | "defeat" }
);
export type EventName = BattleEvent["e"];

// ---------------------------------------------------------------- battle
export type BattlePhase = "setup" | "running" | "won" | "lost";

/** Everything a battle needs from the run (snapshot at battle start; the battle never mutates the run). */
export interface Loadout {
  commander: CommanderId;
  towers: TowerId[];                 // war table order = keys 1-6
  boons: BoonId[];
  tempered: BoonId[];
  relics: RelicId[];
  curses: CurseId[];
  lives: number; maxLives: number;
  ascension: number;
  supplies: (SupplyId | null)[];     // 2 slots (E, D)
  perks: string[];
  /** Last battle's built towers by pad tier/order, for the ghost layout (R13). */
  ghost?: { tower: TowerId; level: number; spec: SpecId | null; tier: Pad["tier"]; rank: number }[];
  /** Run-1 tutorial tweaks (R13): 6 waves, 320 gold. */
  firstBattle?: boolean;
  /** Universal boons: the tower each one was taken for ("veteran" -> "archer"). Run rules. */
  boonOn?: Record<BoonId, TowerId>;
  /** Enemy roles already met this run (intro groups, "new" badges); absent = guessed from act/floor. */
  seen?: EnemyId[];
}

export interface Battle {
  seed: number;
  act: Act;
  kind: BattleKind;
  floor: number;                     // floor within the act (1-based), feeds difficulty
  map: BattleMap;
  loadout: Loadout;
  tick: number;
  phase: BattlePhase;
  gold: number;
  lives: number;                     // run lives, live during the battle
  waves: WavePlan[];
  /** Index of the next wave to start (0 before wave 1). */
  next: number;
  /** Ticks until the next wave starts by itself (-1 while a wave is spawning or in setup). */
  countdown: number;
  enemies: Enemy[];
  towers: Tower[];
  soldiers: Soldier[];
  projectiles: Projectile[];
  zones: Zone[];
  spells: SpellState[];
  /** Appended during step(); the surface drains it. */
  events: BattleEvent[];
  pressure: number;                  // 0..1, adaptive music
  stats: BattleStats;
  /** Named battle theme (R24), shown in the HUD/roster. */
  theme?: string;
  /** Every role this battle will send (setup roster) and the act trait line. */
  roster: EnemyId[];
  /** Bounty condition, if any, and whether it still holds. */
  bounty?: { id: string; ok: boolean };
  /** War supply slots (E, D) as they stand in this battle; used ones are null. */
  supplies?: (SupplyId | null)[];
}

export interface BattleStats {
  leaked: number; livesLost: number; kills: number;
  goldEarned: number; calledEarly: number; spellsCast: number; sold: number;
  damageBy: Partial<Record<TowerId, number>>;
  biggestHit: number; maxPads: number; maxGold: number;
  /** Treasury crowns earned (R11: +1 per wave each Treasury stood through, outside the leftover cap). */
  treasuryCrowns?: number;
  /** Phoenix Feather was used up in this battle. */
  phoenix?: boolean;
}

// ---------------------------------------------------------------- run
export interface MapNode {
  id: number;
  floor: number;        // 1-based within act
  lane: number;         // 0..3 row
  kind: NodeKind;
  next: number[];       // node ids on the next floor
  /** Pre-rolled details visible on the map (elite kind, bounty condition, boss). */
  info?: {
    elite?: EnemyId; bounty?: string; boss?: BossId; roles?: EnemyId[]; theme?: string; revealed?: NodeKind;
    /** Run rules: elite affixes, the theme's two archetype ids (R24), a fixed node's name (act IV), A10's champion. */
    affixes?: string[]; archetypes?: string[]; name?: string; champion?: boolean;
  };
  visited?: boolean;
}
export interface ActMap { act: Act; nodes: MapNode[]; boss: BossId }

export type Card =
  | { kind: "blueprint"; tower: TowerId; rarity: Rarity }
  | { kind: "boon"; boon: BoonId; tower: TowerId | null; rarity: Rarity }
  | { kind: "relic"; relic: RelicId; rarity: Rarity }
  | { kind: "supply"; supply: SupplyId; rarity: Rarity };

export interface RunState {
  seed: number;
  commander: CommanderId;
  ascension: number;
  act: Act;
  map: ActMap;
  /** Current node id (-1 at the act start, before the first pick). */
  at: number;
  floor: number;
  loadout: Loadout;                  // the war table
  crowns: number;
  /** What the run is waiting for the player to do. */
  screen: RunScreen;
  history: { act: Act; node: number; kind: NodeKind; leaked: number; lost?: number; won?: boolean }[];
  stats: RunStats;
  pity: number;
  seenEvents: EventId[];
  battleIndex: number;
  over?: { won: boolean; act: Act; floor: number; by?: string; boss?: BossId; bossHpLeft?: number; livesShort?: number };
  /** Run rules' own book-keeping (game/run). The surface reads what it needs through choices() and summary(). */
  book?: RunBook;
}

/** Run-layer book-keeping (owned by the run rules). */
export interface RunBook {
  firstRun: boolean;
  seeded: boolean;
  /** What the profile had unlocked when the run started (locked content is never offered). */
  unlocked: { towers: TowerId[]; relics: RelicId[]; events: EventId[] };
  /** Events the codex has seen before this run (unseen ones weigh 2x). */
  codexEvents: EventId[];
  /** Bosses the codex had met before this run (first meeting pays renown). */
  codexBosses: BossId[];
  /** Commanders that had won before this run (first win pays renown). */
  codexWins: CommanderId[];
  /** Perks switched on for this run. */
  perks: string[];
  /** Saved Rng states, one stream per system. */
  streams: Record<string, number>;
  /** All four act maps (the current act's live copy is run.map). */
  maps: ActMap[];
  /** Screens queued behind the current one. */
  after: RunScreen[];
  /** Sub-screens raised by the action being resolved (internal; empty between actions). */
  pending: RunScreen[];
  lifts: number;
  /** ? node pity points. */
  unknown: { battle: number; shop: number; treasure: number };
  revealedNext: boolean;
  /** HP % applied to the next boss (the Bard: -10). */
  bossHp: number;
  /** Refugees: the next battle has 2 fewer waves and no card reward. */
  walk: boolean;
  rerolls: number;
  banishes: number;
  banished: string[];
  /** Avalanche Pass: the nodes you may move to instead of the next floor. */
  leap: number[];
  lastDamage: Partial<Record<TowerId, number>>;
  seen: { boons: BoonId[]; relics: RelicId[]; towers: TowerId[] };
  /** "event-id/choice-id" taken this run (codex). */
  choices: string[];
  floors: number;
  bounties: number;
  elitesWon: number;
  bossesMet: BossId[];
  bossesWon: BossId[];
  /** Lives lost in act I (renown: none lost). */
  lostAct1: number;
  /** Highlights for the summary. */
  best: { kills: number; killsAt: string; crowns: number; closest: number; perfectBosses: BossId[] };
  /** Blessing: a rare relic choice was offered (R27). */
  blessingRare: boolean;
  /** Card reward screens built so far (the first one has R2/R13 rules). */
  rewards: number;
  /** The Ford: gold added to the next battle's start. */
  nextGold: number;
  /** R13: Glass Bones taken without a Frost Spire puts the Frost Spire in slot B of the next reward. */
  promised: TowerId | null;
}

/** What the run hands to battle's newBattle(). */
export interface BattleArgs {
  seed: number;
  act: Act;
  kind: BattleKind;
  floor: number;
  loadout: Loadout;
  boss?: BossId;
  /** Named theme line (R24) and its two archetype ids at x3 weight. */
  theme?: string;
  archetypes?: string[];
  bounty?: string;
  /** An elite on this battle (elite nodes; acts III-IV F4-F5 and the Ash Road 30%). */
  elite?: { kind: EnemyId; affixes: string[] };
  /** HP % on the boss from the run (the Bard's song -10); Dread is in loadout.curses. */
  bossHpPct?: number;
  /** Refugees: this battle has this many fewer waves. */
  fewerWaves?: number;
  /** A10: the boss is the Tyrant's Guard champion. */
  champion?: boolean;
  /** Extra start gold from the run (the Ford's ferryman). */
  gold?: number;
}

/** What battle reports back to the run (finishBattle). */
export interface BattleResult {
  won: boolean;
  livesLeft: number;
  leaked: number;
  goldLeft: number;
  stats: BattleStats;
  bountyOk: boolean;
  elitesKilled: boolean;
  ghost: Loadout["ghost"];
  /** Supply slots after the battle (used ones are null). Omitted = unchanged. */
  supplies?: (SupplyId | null)[];
  /** Phoenix Feather fired during the battle. */
  phoenixUsed?: boolean;
  /** Treasury's crowns (R11), paid outside the leftover cap. */
  treasury?: number;
  /** On a loss to a boss: its HP fraction left (0..1), for the summary. */
  bossHpLeft?: number;
  /** On a loss: lives that would have carried you through, if the battle knows. */
  livesShort?: number;
  ticks?: number;
  /** Most kills in one wave, for highlights. */
  waveKills?: number;
}

export interface PickOption {
  label: string;
  text?: string;
  card?: Card;
  tower?: TowerId;
  boon?: BoonId;
  curse?: CurseId;
  supply?: SupplyId;
  disabled?: string;
}

export interface TallyLine { label: string; crowns?: number; lives?: number }

export type RunScreen =
  | { s: "map" }
  | { s: "battle"; node: number; kind: BattleKind }
  | { s: "reward"; cards: Card[]; crowns: number; skip: number; relics?: RelicId[]; extra?: boolean;
      /** Run rules: the crowns/lives tally shown first, what kind of reward, and whether a relic pick is optional. */
      tally?: TallyLine[]; source?: "battle" | "elite" | "boss" | "ambush" | "bounty" | "bonus" }
  | { s: "shop"; stock: ShopItem[];
      services?: { mend: number | null; lift: number | null; restock: number | null };
      /** Mirage Market: half price; the most expensive thing bought turns to sand on leaving. */
      mirage?: boolean; camp?: boolean }
  | { s: "event"; event: EventId; step: number; note?: string; done?: boolean; data?: number }
  | { s: "forge" }
  | { s: "rest"; options: string[] }
  | { s: "treasure"; relic: RelicId; crowns: number; supply?: SupplyId }
  | { s: "replace"; card: Card; from?: "reward" | "shop" | "gain"; price?: number; index?: number }      // war table full: pick a blueprint to replace
  | { s: "blessing"; options: string[] }
  | { s: "pick"; title: string; text?: string; options: PickOption[]; act: string; data?: Record<string, unknown>; skip?: string }
  | { s: "over" };

export interface ShopItem { card: Card; price: number; sale: boolean; sold: boolean }

export interface RunStats {
  battles: number; elites: number; bosses: number; kills: number; leaked: number;
  damageBy: Partial<Record<TowerId, number>>;
  biggestHit: number; timeTicks: number; crownsEarned: number;
}
