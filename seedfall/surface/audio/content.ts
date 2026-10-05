// What the audio needs from the world's content tables (src/game/content/world.ts, owned by the world agent),
// passed in by the lead so this module never imports the rules. Missing entries degrade to sensible sounds.
import type { Find, Material } from "../../game/types.ts";

export type Family = "soft" | "wet" | "grit" | "hard" | "glass" | "squish" | "rumble" | "chisel" | "hum";
const FAMILIES = new Set<Family>(["soft", "wet", "grit", "hard", "glass", "squish", "rumble", "chisel", "hum"]);

export interface AudioContent {
  materials: readonly (Material | undefined)[] | Record<number, Material>;
  finds: readonly (Find | undefined)[] | Record<number, Find>;
}

export interface FindInfo { kind: "ore" | "jackpot" | "artifact"; tier: number; biome: number; key: string }

export class Lookup {
  private mats = new Map<number, Material>();
  private finds = new Map<number, Find>();

  set(c?: AudioContent) {
    this.mats.clear(); this.finds.clear();
    if (!c) return;
    for (const m of Object.values(c.materials)) if (m) this.mats.set(m.id, m);
    for (const f of Object.values(c.finds)) if (f) this.finds.set(f.id, f);
  }

  mat(id: number) { return this.mats.get(id); }

  family(id: number): Family {
    const m = this.mats.get(id);
    if (!m) return "grit";
    if (FAMILIES.has(m.sound as Family)) return m.sound as Family;
    return m.kind === "soil" || m.kind === "loose" ? "soft" : m.kind === "special" ? "hum" : "grit";
  }
  /** Hard families get the +2 dB break. */
  hard(id: number) { const f = this.family(id); return f === "hard" || f === "rumble" || f === "hum"; }
  kind(id: number) { return this.mats.get(id)?.kind ?? (id === 0 ? "air" : "rock"); }
  /** Crystal clusters for the wind chimes: the glowing lining and geodes, not every glassy rock. */
  crystal(id: number) { const m = this.mats.get(id); return !!m && (/lining|geode|cluster/i.test(m.key) || (m.sound === "glass" && !!m.glow)); }

  find(id: number): FindInfo | null {
    if (!id) return null;
    const f = this.finds.get(id);
    if (!f) return { kind: "ore", tier: 1, biome: 0, key: String(id) };
    return { kind: f.kind, tier: f.tier, biome: f.biome, key: f.key };
  }
}
