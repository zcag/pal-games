// Act looks (art.md 2.x, 6.1, 6.3). Hex is sRGB as it should read on screen; THREE.Color converts to linear.
import type { Theme } from "../../game/types.ts";

export interface Grade { contrast: number; saturation: number; lift: [number, number, number]; gain: [number, number, number]; vignette: number }

export interface Look {
  ground: string; groundA: string; groundB: string;
  road: string; roadEdge: string; kerb: string;
  strata: string[];
  seam?: string;                     // glowing seams (citadel)
  water: { deep: string; shallow: string; foam: string; kind: "water" | "ice" | "lava" | "oasis" };
  foliage: [string, string, string];
  flowers?: string[];
  skyTop: string; skyHorizon: string;
  fog: string;
  sun: { color: string; elev: number; az: number; intensity: number };
  hemi: { sky: string; ground: string; intensity: number };
  key: string;                       // enemy key colour
  body: string;                      // enemy body
  bodyTrim?: string;                 // act 4 bone armour
  rim: { color: string; strength: number };
  grade: Grade;
  exposure: number;
  /** Silhouette layers (near, far) for the backdrop, mixed to fog by the painter. */
  hills: [string, string];
  particles: "pollen" | "sand" | "snow" | "embers" | "title";
}

export const SHARED = {
  blue: "#3F78D6", gold: "#E3B655", cloth: "#F1EADB",
  pad: "#A9A08F", padGroove: "#5E574C", outline: "#1C1512",
  hoverRim: "#FFF1C9", focusGold: "#FFD36B",
};

export const LOOKS: Record<Theme | "title", Look> = {
  meadow: {
    ground: "#8C9E63", groundA: "#7E9458", groundB: "#9AA66E",
    road: "#C2AC80", roadEdge: "#8E7A55", kerb: "#B3AB9A",
    strata: ["#6A5537", "#8C7B66", "#6F665E", "#4E4744"],
    water: { deep: "#4C8AA0", shallow: "#7DB5B8", foam: "#E9F2EC", kind: "water" },
    foliage: ["#4F7A3E", "#6E9549", "#93B060"],
    flowers: ["#E9DCA8", "#D9A2A8", "#C9C3E6"],
    skyTop: "#8FBBD4", skyHorizon: "#F1E4C6", fog: "#E6DCC0",
    sun: { color: "#FFDDB0", elev: 37, az: 135, intensity: 3.2 },
    hemi: { sky: "#B4CFEC", ground: "#6F6B4C", intensity: 1.05 },
    key: "#C2502E", body: "#2E2622", rim: { color: "#FFF1DA", strength: 0.5 },
    grade: { contrast: 1.05, saturation: 1.04, lift: [0, 0.004, 0.008], gain: [1.02, 1.0, 0.97], vignette: 0.18 },
    exposure: 1.0, hills: ["#7E9A6A", "#9FB4BE"], particles: "pollen",
  },
  desert: {
    ground: "#CDA674", groundA: "#B5844C", groundB: "#E0C696",
    road: "#9C9886", roadEdge: "#6E6656", kerb: "#B8B09C",
    strata: ["#C49A68", "#B07A52", "#8A5E44", "#5C4438"],
    water: { deep: "#2F8C8A", shallow: "#69B9A6", foam: "#E8F2E6", kind: "oasis" },
    foliage: ["#5C7A3C", "#7E9450", "#A7A868"],
    skyTop: "#6FA3C8", skyHorizon: "#F3D9B0", fog: "#EBD3AA",
    sun: { color: "#FFD9A6", elev: 42, az: 125, intensity: 3.3 },
    hemi: { sky: "#AFCBEA", ground: "#9E7B55", intensity: 0.95 },
    key: "#2E8C86", body: "#2E2622", rim: { color: "#FFF1DA", strength: 0.5 },
    grade: { contrast: 1.06, saturation: 1.0, lift: [0.006, 0.003, 0], gain: [1.03, 1.0, 0.94], vignette: 0.2 },
    exposure: 1.0, hills: ["#C49A70", "#C8B4A8"], particles: "sand",
  },
  peaks: {
    ground: "#B4C2CB", groundA: "#A2B3C0", groundB: "#C6D1D7",
    road: "#979DA3", roadEdge: "#C9D2D8", kerb: "#8A949C",
    strata: ["#D7E1E6", "#7D8791", "#5D6672", "#3F4552"],
    water: { deep: "#3E6F8A", shallow: "#8EB9CF", foam: "#E4F2F8", kind: "ice" },
    foliage: ["#2F4F44", "#41665A", "#DCE6EA"],
    skyTop: "#7C9CC0", skyHorizon: "#DCE6EE", fog: "#D4DEE6",
    sun: { color: "#FFEAD2", elev: 55, az: 150, intensity: 2.6 },
    hemi: { sky: "#C6D8EC", ground: "#7D8796", intensity: 1.25 },
    key: "#B8323A", body: "#2E2622", rim: { color: "#FFF1DA", strength: 0.5 },
    grade: { contrast: 1.08, saturation: 0.96, lift: [0, 0.004, 0.012], gain: [0.96, 0.98, 1.0], vignette: 0.18 },
    exposure: 1.0, hills: ["#8C9CB0", "#B4C2D2"], particles: "snow",
  },
  citadel: {
    ground: "#27232A", groundA: "#332D33", groundB: "#1F1B21",
    road: "#C4B8A8", roadEdge: "#8C8074", kerb: "#6A5E5A",
    strata: ["#4A3F3E", "#2E2628", "#5A2E22", "#2A2224"], seam: "#FF7A2A",
    water: { deep: "#3A1E18", shallow: "#C2401C", foam: "#FFB347", kind: "lava" },
    foliage: ["#3B3230", "#4E2E2A", "#5A3632"],
    skyTop: "#1E1028", skyHorizon: "#8A2E3E", fog: "#4E2232",
    sun: { color: "#F2B8A4", elev: 34, az: 210, intensity: 2.5 },
    hemi: { sky: "#8E7AA0", ground: "#6A3028", intensity: 1.05 },
    key: "#F0407A", body: "#3A2E38", bodyTrim: "#E8DCC8", rim: { color: "#FFD2B0", strength: 0.6 },
    grade: { contrast: 1.1, saturation: 1.05, lift: [0.01, 0.002, 0.006], gain: [1.0, 0.97, 0.98], vignette: 0.28 },
    exposure: 1.0, hills: ["#2A1820", "#4A2430"], particles: "embers",
  },
  title: {
    ground: "#93A062", groundA: "#86955A", groundB: "#A2A86E",
    road: "#C9AE7E", roadEdge: "#8E7652", kerb: "#B8AC96",
    strata: ["#6E5536", "#937C62", "#76675A", "#4F4540"],
    water: { deep: "#4C7FA0", shallow: "#86B2B4", foam: "#F3EBD8", kind: "water" },
    foliage: ["#52763C", "#759448", "#A2B05E"],
    flowers: ["#F0D9A0", "#E0A2A0", "#CFC3E6"],
    skyTop: "#5E7FB6", skyHorizon: "#F5C08A", fog: "#E7B98C",
    sun: { color: "#FFC98A", elev: 14, az: 130, intensity: 2.8 },
    hemi: { sky: "#B9C8E8", ground: "#6A5A44", intensity: 0.8 },
    key: "#C2502E", body: "#2E2622", rim: { color: "#FFF1DA", strength: 0.5 },
    grade: { contrast: 1.06, saturation: 1.08, lift: [0.006, 0.004, 0.01], gain: [1.05, 1.0, 0.92], vignette: 0.3 },
    exposure: 1.05, hills: ["#7E7A5E", "#9A90A8"], particles: "title",
  },
};

/** Tower accents (art 4.2) and spec variants (4.3). */
export const ACCENT: Record<string, string> = {
  archer: "#E6B85C", barracks: "#4A86E0", mage: "#8E6CF2", bombard: "#E2752F", frost: "#86DBFF",
  alchemist: "#A6E04A", pyre: "#FF7A2A", storm: "#7FA2FF", beacon: "#FFE6A0", banner: "#D94A5E",
  ballista: "#B7C2CC", thornwood: "#4FAE5C",
  marksmen: "#FFD36B", volley: "#FF9A3A", paladins: "#FFE6A0", blademasters: "#B8323A",
  arcanist: "#9FB8FF", hexer: "#B26BFF", mortar: "#E2752F", shrapnel: "#C8D0D8",
  glacier: "#86DBFF", shatter: "#D8F4FF", acid: "#B6F24A", naphtha: "#FF8A2A",
  inferno: "#FF4A1E", firestorm: "#7FD0FF", tempest: "#9FB8FF", overload: "#D8C8FF",
  lighthouse: "#FFF0C0", huntersmark: "#FFD36B", wardrums: "#D94A5E", treasury: "#FFD36B",
  harpoon: "#B7C2CC", siegebolt: "#C8D0D8", bramble: "#B03A6A", treant: "#4FAE5C",
};

/** Level materials (art 4.1). */
export const MAT = {
  timber: "#8A6A48", thatch: "#B99A62", rope: "#C8B08A",
  rubble: "#9A9286", slate: "#5E6670",
  stone: "#B5AC9C", iron: "#4A4E55", trim: "#E3B655", pennant: "#3F78D6",
  darkWood: "#5E4630", plank: "#A08058",
};
