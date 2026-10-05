// Every colour the fx use, from design/art.md, as linear rgb. Intensities (bloom) are applied
// where drawn: projectile cores 2-4, lightning 4 (the cap), flash cores 3 for 120 ms.
import type { BossId, DamageType, SpellId, SupplyId, Theme, TowerId } from "../../../game/types.ts";
import { rgb, type RGB } from "./gl/common.ts";

export const K = {
  white: rgb(0xffffff), warm: rgb(0xfff4d6), gold: rgb(0xffd36b), goldDeep: rgb(0xb88a2e), amber: rgb(0xe6b85c),
  ourBlue: rgb(0x3f78d6), ourGold: rgb(0xe3b655), cloth: rgb(0xf1eadb),
  ink: rgb(0x1c1512), track: rgb(0x1a1414), hp: rgb(0xe5483b), chip: rgb(0xffd27a), shield: rgb(0xbff6ff),
  steel: rgb(0xb7c0cc), ward: rgb(0xa472ff), elite: rgb(0xe8c15a), soldierHp: rgb(0x5fc46a),
  ice: rgb(0xcff1ff), iceCore: rgb(0xe4f7ff), frost: rgb(0x86dbff), frostDeep: rgb(0x5ab8e8), chill: rgb(0x8fd3ff),
  fire: rgb(0xff8a2a), fireCore: rgb(0xffd27a), fireHot: rgb(0xffe6a0), fireDeep: rgb(0xff4a1e), fireball: rgb(0xffb347), fireDark: rgb(0xc2401c),
  smoke: rgb(0x3a3230), smokeLight: rgb(0x8a817a), dust: rgb(0xb8a888), scorch: rgb(0x2a221e), char: rgb(0x1e1816),
  violet: rgb(0x8e6cf2), violetCore: rgb(0xc8b8ff), hex: rgb(0xb26bff), hexDark: rgb(0x3a2a4e), hexTint: rgb(0x6a4e7c),
  oil: rgb(0x2a2320), oilHi: rgb(0x8c7a68), acid: rgb(0xb6f24a), acidDeep: rgb(0x6f9a2a), acidFlask: rgb(0xa6e04a), glass: rgb(0xe8ffd0),
  storm: rgb(0x7fa2ff), stormCore: rgb(0xeef3ff), overload: rgb(0xd8c8ff),
  heal: rgb(0x5fd08a), stun: rgb(0xffe45c), mark: rgb(0xffd36b), root: rgb(0x5a4632), thorn: rgb(0xc7e07a), moss: rgb(0x4fae5c),
  leak: rgb(0xff4a3a), danger: rgb(0xc0201a), warn: rgb(0xe2752f), tar: rgb(0x1c1612), tarHi: rgb(0x4a3a2a),
  steelDark: rgb(0x5c6168), iron: rgb(0x4a4e55), shaft: rgb(0x8a6a48), stone: rgb(0xa9a08f), invalid: rgb(0x8a5a5a), ring: rgb(0xfff6e2),
};

export const DMG: Record<DamageType, RGB> = { phys: rgb(0xfff6e8), magic: rgb(0xcda8ff), fire: rgb(0xffb15a), pure: rgb(0xffffff) };
export const DMG_CSS: Record<DamageType, string> = { phys: "#FFF6E8", magic: "#CDA8FF", fire: "#FFB15A", pure: "#FFFFFF" };
/** Hit-spark colours (art 5.3): physical white, magic violet, fire orange, pure white-gold. */
export const SPARK: Record<DamageType, RGB> = { phys: rgb(0xfff4e0), magic: rgb(0xb894ff), fire: rgb(0xff9a3a), pure: rgb(0xfff0b0) };

export const ACCENT: Record<TowerId, RGB> = {
  archer: rgb(0xe6b85c), barracks: rgb(0x4a86e0), mage: rgb(0x8e6cf2), bombard: rgb(0xe2752f), frost: rgb(0x86dbff), alchemist: rgb(0xa6e04a),
  pyre: rgb(0xff5a2a), storm: rgb(0x7fa2ff), beacon: rgb(0xffe6a0), banner: rgb(0xd94a5e), ballista: rgb(0xb7c2cc), thornwood: rgb(0x4fae5c),
};
export const SPEC: Record<string, RGB> = {
  marksmen: rgb(0xffd36b), volley: rgb(0xff9a3a), paladins: rgb(0xf4ead2), blademasters: rgb(0xb8323a), arcanist: rgb(0x9fb8ff), hexer: rgb(0xb26bff),
  mortar: rgb(0xe2752f), shrapnel: rgb(0xb7c0cc), glacier: rgb(0xbfeeff), shatter: rgb(0xd8f4ff), acid: rgb(0xb6f24a), naphtha: rgb(0xff8a2a),
  inferno: rgb(0xff4a1e), firestorm: rgb(0x7fd0ff), tempest: rgb(0x7fa2ff), overload: rgb(0xd8c8ff), lighthouse: rgb(0xfff1c9), huntersmark: rgb(0xffd36b),
  wardrums: rgb(0xd94a5e), treasury: rgb(0xffd36b), harpoon: rgb(0xb7c2cc), siegebolt: rgb(0xd8dde2), bramble: rgb(0xb0406a), treant: rgb(0x4fae5c),
};

/** Enemy key colour per act (kill wisps, chunks). */
export const KEY: Record<Theme, RGB> = { meadow: rgb(0xc2502e), desert: rgb(0x2e8c86), peaks: rgb(0xb8323a), citadel: rgb(0xe2d6c0) };
export const BODY: Record<Theme, RGB> = { meadow: rgb(0x2e2622), desert: rgb(0x2e2622), peaks: rgb(0x2e2622), citadel: rgb(0x1e1a1c) };

/** Boss telegraph colours (warning colours, one per boss). */
export const BOSS: Record<BossId, RGB> = {
  gorrak: rgb(0xd8452e), wyrm: rgb(0x3fd0c0), colossus: rgb(0x48b4ff), tyrant: rgb(0xff7a2a),
  hivequeen: rgb(0xc8e04a), lich: rgb(0xb26bff), packlord: rgb(0xe0604a),
};

/** One colour per spell (art 5.8: each spell keeps one colour). */
export const SPELL: Record<SpellId, RGB> = {
  reinforcements: rgb(0x3f78d6), meteor: rgb(0xff7a2a), firebomb: rgb(0xff8a2a), tarpit: rgb(0x6a5440), stillness: rgb(0xbfeeff),
  judgement: rgb(0xffe6a0), requisition: rgb(0xffd36b), rally: rgb(0xffd36b), barrier: rgb(0x8a6a48), bramblesurge: rgb(0x4fae5c),
};
export const SUPPLY: Record<SupplyId, RGB> = {
  "oil-barrel": rgb(0x2a2320), "frost-flask": rgb(0x86dbff), "gold-cache": rgb(0xffd36b), "spike-trap": rgb(0xb7c0cc), "war-horn": rgb(0xd94a5e),
  "masons-kit": rgb(0xe3b655), flare: rgb(0xffd36b), "heavy-bolt": rgb(0xd8dde2), bell: rgb(0xffe6a0), lifeblood: rgb(0xff4a5a),
};

