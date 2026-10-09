// Each place's own land beside the road (game/content.ts LOCATIONS `land`): how the ground lies and what
// colour it is, what grows and stands on it, and what makes the horizon. Countryside's green fields,
// hedgerows and woods; High Noon's sun-baked plains, wheat, stubble and sunflowers, olive groves and lone
// acacias on rocky low hills; Golden Hour's vineyard hills, cypress lines, terracotta farms and lakes;
// Grey Day's open moor behind dry-stone walls, gorse and tors, the sea off to the right; Night Run's edge
// of a city, blocks and towers with their windows lit, yards and chimneys. World (world.ts) builds the
// road and what every place shares (bridges, signs, lamps, the verge); a place's style adds the rest.
import * as THREE from "./vendor/three.js";
import { worldUV, type Part } from "./env.ts";
import { CHUNK, forestEdge, fieldOff, cellHash, heightAt, hash, fbm, CELL_HASH_GLSL, type Land, type Terrain, type Fields, type Zone, type Put } from "./terrain.ts";
import type { Tone } from "./foliage.ts";
import { vineRow, stoneWall, bale, sheep, crag, building, tank, chimney, halo, lampPool } from "./structures.ts";
import type { LandId } from "../game/content.ts";

/** The models and impostors every place draws from, loaded and baked once (world.ts loadAssets). */
export type Assets = { parts: Record<string, Part[]>; imp: Map<string, Part>; grass: (tone: Tone) => Part; glow: THREE.Texture };

/** Where a placer is: the chunk and side, what the stretch is, and how to put things there. */
export type Spot = {
  r: () => number; z0: number; z1: number; side: number; zone: Zone; seg: number; put: Put;
  X: (e: number) => number; clear: (z: number) => boolean; night: boolean; t: Terrain; half: number; roadHalf: number;
};

type Crop = keyof typeof CROPS;
export type Style = {
  terrain: Omit<Terrain, "seed" | "open">;
  /** Fields: the grid, out to `far` m, and their crops with the share of each (by the cell's value). */
  fields: Fields & { far?: number; crops: [Crop, number][] };
  grass: Tone; verge: number; // the verge's grass, and how much of it
  house: [plaster: number, roof: number]; // the colours of its houses
  lit?: boolean; // street lamps all along the road, not just through towns and round bridges
  /** The ground's shader: the grass recoloured (`base`), soil, a forest's floor and a town's ground, bare slopes. */
  ground: { base?: string; soil: string; forest?: string; town?: string; steep: string; shore?: string };
  kinds(land: Land, a: Assets, night: boolean): void;
  place(s: Spot): void;
};

/** What a field grows, as the ground draws it: `g` the grass there, `lum` its brightness, `soil`, `s` rows along
 *  the road (0..1) and `sz` rows across it, `mid` a mid-sized noise. */
const CROPS = {
  grass: "g * vec3(1.1, 1.12, 0.92)",
  wheat: "lum * vec3(1.65, 1.35, 0.62) * (0.92 + 0.12 * s)",
  soil: "soil * (0.75 + 0.5 * s)",
  young: "mix(soil, g * 1.1, 0.35 + 0.55 * s)",
  hay: "g * vec3(1.18, 1.02, 0.7)",
  ripe: "vec3(0.4, 0.26, 0.07) * d * (0.86 + 0.18 * s) * (0.85 + 0.3 * mid)",
  stubble: "vec3(0.36, 0.3, 0.19) * (0.82 + 0.3 * s) * (0.8 + 0.3 * d)",
  sunflower: "mix(vec3(0.03, 0.05, 0.012), vec3(0.6, 0.38, 0.015) * (0.8 + 0.3 * mid), smoothstep(0.3, 0.5, gn(vW.xz * 1.7) * (0.6 + 0.6 * s)))",
  fallow: "g * vec3(1.08, 1.0, 0.86)",
  vines: "mix(soil * 0.9, g * vec3(0.7, 0.95, 0.5), smoothstep(0.35, 0.75, sz))",
  lavender: "mix(soil, vec3(0.16, 0.085, 0.26) * (0.8 + 0.4 * mid), smoothstep(0.3, 0.7, rows(vW.z + mid, 1.7)))",
  pasture: "vec3(0.085, 0.13, 0.045) * d * (0.9 + 0.2 * big)",
  rough: "g",
  bracken: "vec3(0.16, 0.1, 0.05) * d * (0.85 + 0.3 * mid)",
  yard: "vec3(0.2, 0.2, 0.19) * (0.75 + 0.45 * gn(vW.xz / 3.0))",
  lot: "mix(vec3(0.05, 0.05, 0.055), vec3(0.5), step(0.92, fract(vW.z / 2.6)) * step(2.0, mod(e, 12.0)))",
  gravel: "vec3(0.21, 0.19, 0.16) * (0.7 + 0.6 * gh(floor(vW.xz * 8.0)))",
  scrub: "g * vec3(0.85, 0.9, 0.7)",
};

/** The crop a field cell grows. */
function cropOf(style: Style, h: number): Crop {
  for (const [c, upTo] of style.fields.crops) if (h < upTo) return c;
  return style.fields.crops[style.fields.crops.length - 1][0];
}

// ---------------------------------------------------------------- the ground

/** The grass, never one colour: big and small patches, a mown verge with a gravel strip by the asphalt, fields
 *  in their crops past it, the floor of a forest, a town's ground, earth or rock where the slope is steep, a
 *  shore at the water; each place in its own colours. */
export function groundMaterial(grass: { map: THREE.Texture; normal: THREE.Texture; tile: number }, half: number, id: LandId) {
  const st = LANDS[id], f = st.fields, t = st.terrain, gr = st.ground;
  const mat = new THREE.MeshStandardMaterial({ map: grass.map, normalMap: grass.normal, roughness: 1 });
  mat.normalScale.set(0.6, 0.6);
  const chain = f.crops.map(([c, upTo]) => `if (h < ${upTo.toFixed(3)}) f = ${CROPS[c]};`).join("\n        else ");
  const W = f.w.toFixed(1), L = f.len.toFixed(1);
  worldUV(mat, grass.tile * 2, (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vW, vWN, vZone; attribute vec3 aZone;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normal; vZone = aZone;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 vW, vWN, vZone;
      ${CELL_HASH_GLSL}
      float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(gh(i), gh(i+vec2(1,0)), f.x), mix(gh(i+vec2(0,1)), gh(i+vec2(1,1)), f.x), f.y); }
      float gf(vec2 p){ return gn(p)*0.5 + gn(p*2.1)*0.25 + gn(p*4.3)*0.125; }
      // rows in a field, faded out before they'd shimmer
      float rows(float x, float w){ float f = fwidth(x) / w; return mix(0.5 + 0.5 * sin(x * 6.2832 / w), 0.5, smoothstep(0.15, 0.5, f)); }`).replace("#include <map_fragment>", `#include <map_fragment>
      float e = abs(vW.x) - ${half.toFixed(2)}, side = sign(vW.x);
      float big = gf(vW.xz / 70.0), mid = gf(vW.xz / 14.0 + 7.0);
      vec3 g = diffuseColor.rgb * mix(vec3(0.78), vec3(1.08), big);
      g *= mix(vec3(1.0), vec3(1.18, 1.05, 0.62), smoothstep(0.55, 0.8, mid) * 0.7);
      ${gr.base ? `{ float lum = dot(g, vec3(0.3, 0.55, 0.15)), d = clamp(dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)) / 0.124, 0.4, 1.8); ${gr.base} }` : ""}
      // the mown verge, in the stripes the mower left along it, a little dusty nearest the road
      float verge = 1.0 - smoothstep(10.0, 14.0, e);
      g *= 1.0 + verge * (0.05 + 0.04 * rows(e, 2.4));
      g = mix(g, g * vec3(1.05, 0.98, 0.8) * 0.88, (1.0 - smoothstep(3.0, 7.0, e)) * 0.6);
      vec3 soil = ${gr.soil} * (0.8 + 0.5 * mid);
      // fields: crops in a patchwork, a margin round each
      float fz = vZone.x${f.far ? ` * (1.0 - smoothstep(${(f.far - 25).toFixed(1)}, ${f.far.toFixed(1)}, e))` : ""};
      if (fz > 0.001) {
        float col = floor((e - 22.0) / ${W}), off = side > 0.0 ? 17.0 : 41.0;
        float row = floor((vW.z + off) / ${L});
        float h = cellHash(vec2(col * 7.0 + side * 3.0, row));
        vec2 cell = vec2(e - 22.0 - col * ${W}, vW.z + off - row * ${L});
        float margin = smoothstep(2.0, 4.0, min(min(cell.x, ${W} - cell.x), min(cell.y, ${L} - cell.y)));
        float lum = dot(g, vec3(0.3, 0.55, 0.15)), s = rows(e + mid * 0.6, 0.8), sz = rows(vW.z, 2.6);
        float d = clamp(dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)) / 0.124, 0.4, 1.8); // the texture's detail, about 1
        vec3 f = g;
        ${chain}
        g = mix(g, f, fz * margin);
      }
      // a forest's floor, a town's ground
      ${gr.forest ?? "g = mix(g, g * vec3(0.5, 0.47, 0.38) + vec3(0.02, 0.014, 0.006), vZone.y * 0.9);"}
      ${gr.town ?? "g = mix(g, g * vec3(1.04, 1.12, 0.88), vZone.z * 0.6);"}
      // bare ground on steep slopes
      float steep = 1.0 - smoothstep(0.78, 0.93, normalize(vWN).y);
      if (steep > 0.0) g = mix(g, ${gr.steep} * (0.75 + 0.5 * mid), steep * smoothstep(0.4, 0.65, gf(vW.xz / 5.0)) * 0.8);
      ${t.water !== undefined ? `// the shore, darker where it's wet
      float shore = 1.0 - smoothstep(${(t.water + 0.9).toFixed(2)}, ${(t.water + 2.2).toFixed(2)}, vW.y);
      g = mix(g, ${gr.shore ?? "vec3(0.3, 0.26, 0.19)"} * (0.7 + 0.5 * mid) * mix(1.0, 0.6, 1.0 - smoothstep(${(t.water - 0.5).toFixed(2)}, ${(t.water + 0.9).toFixed(2)}, vW.y)), shore);` : ""}
      // the gravel strip between the asphalt and the grass
      float grav = smoothstep(2.45, 2.65, e) * (1.0 - smoothstep(3.2, 3.7 + mid, e));
      g = mix(g, vec3(0.34, 0.32, 0.29) * (0.65 + 0.7 * gh(floor(vW.xz * 25.0))), grav * 0.9);
      diffuseColor.rgb = g;`);
  });
  mat.customProgramCacheKey = () => `ground-${id}-${half}`;
  return mat;
}

/** Still water to the horizon at the place's water level: lakes and the sea are where the land dips under it. */
export function water(level: number, color: THREE.ColorRepresentation) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.12, metalness: 0 });
  // a slow swell's ripples in the normal, so the sky's reflection breaks up a little
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
      vec2 wq = vWp.xz;
      vec3 wn = normalize(vec3(sin(wq.x * 0.21 + wq.y * 0.13) * 0.012 + sin(wq.x * 0.9 - wq.y * 1.3) * 0.006 + sin(wq.x * 2.3 + wq.y * 1.7) * 0.004, 1.0,
        sin(wq.y * 0.19 - wq.x * 0.07) * 0.012 + sin(wq.y * 1.1 + wq.x * 0.7) * 0.006 + sin(wq.y * 2.9 - wq.x * 1.9) * 0.004));
      normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);`);
  };
  mat.customProgramCacheKey = () => "water";
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000).rotateX(-Math.PI / 2), mat);
  m.position.y = level;
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- what each place's land needs

/** A house's parts, its plaster and roof in a place's colours. */
export function tinted(house: Part[], plaster: number, roof: number): Part[] {
  return house.map(({ geo, mat }) => {
    if (mat.name !== "plaster" && mat.name !== "roof") return { geo, mat };
    const m = (mat as THREE.MeshStandardMaterial).clone();
    m.color.set(mat.name === "plaster" ? plaster : roof);
    return { geo, mat: m };
  });
}
/** A house's parts with its windows glowing warm. */
export function windows(house: Part[], strength: number): Part[] {
  return house.map(({ geo, mat }) => {
    if (mat.name !== "window" || !strength) return { geo, mat };
    const m = (mat as THREE.MeshStandardMaterial).clone();
    m.emissive.set(0xffb766); m.emissiveIntensity = strength;
    return { geo, mat: m };
  });
}
const I = (a: Assets, n: string) => [a.imp.get(n)!];
/** A crag's stone: the boulder's surface detail in a place's colour. */
const stone = (a: Assets, color: number) => new THREE.MeshStandardMaterial({ color, normalMap: (a.parts.rock_boulder[0].mat as THREE.MeshStandardMaterial).normalMap, roughness: 0.92 });

/** A tree among `kinds` (weights), full near the road or as its impostor. */
function tree(s: Spot, e: number, z: number, kind: string, near = e < 70, scale = 0.75 + s.r() * 0.5) {
  s.put(near ? kind : `i_${kind}`, s.X(e), z, s.r() * 6.28, scale);
}
/** The trees of a kind both ways: the model near (its impostor past 220 m ahead), the impostor alone further out. */
function trees(land: Land, a: Assets, kinds: [string, number, number][]) {
  for (const [t, near, far] of kinds) {
    if (near) land.addKind(t, a.parts[t], near, { far: I(a, t) });
    land.addKind(`i_${t}`, I(a, t), far, { receive: false });
  }
}
/** Far away: woods (or groves) in patches over the hills, which make the horizon. */
function horizon(s: Spot, n: number, cut: number, pick: (k: number) => string, scale = [1.1, 0.8]) {
  for (let i = 0; i < n; i++) {
    const e = 160 + Math.pow(s.r(), 0.8) * 650, z = s.z0 + s.r() * CHUNK, x = s.X(e);
    if (fbm(x / 240 + 9, z / 240) < cut) continue;
    s.put(pick(s.r()), x, z, s.r() * 6.28, scale[0] + s.r() * scale[1]);
  }
}
/** The fields' cells a chunk crosses on its side (out to `far` m), each with its crop. */
function cells(s: Spot, st: Style, far: number) {
  const out: { e0: number; z0: number; z1: number; crop: Crop; row: number }[] = [], f = st.fields, off = fieldOff(s.side);
  for (let col = 0; 22 + col * f.w < far; col++) for (let row = Math.floor((s.z0 + off) / f.len); row * f.len - off < s.z1; row++) {
    const cz = row * f.len - off;
    out.push({ e0: 22 + col * f.w, z0: Math.max(s.z0, cz), z1: Math.min(s.z1, cz + f.len), crop: cropOf(st, cellHash(col * 7 + s.side * 3, row)), row });
  }
  return out;
}
const farm = (s: Spot, house: string, around: (e: number, z: number) => void) => {
  const { r } = s, e = 55 + r() * 70, z = s.z0 + 20 + r() * 80, rot = (r() < 0.5 ? 0 : Math.PI) + (s.side > 0 ? -1 : 1) * Math.PI / 2;
  s.put(s.night && r() < 0.25 ? `${house}_dark` : house, s.X(e), z, rot + (r() - 0.5) * 0.2, 1);
  s.put("barn", s.X(e + 16 + r() * 8), z + (r() - 0.5) * 30, rot, 0.55 + r() * 0.15);
  around(e, z);
};

// ---------------------------------------------------------------- the places

const country: Style = {
  house: [0xffffff, 0xffffff],
  terrain: { hills: 26 },
  fields: { w: 90, len: 110, crops: [["grass", 0.28], ["wheat", 0.52], ["soil", 0.72], ["young", 0.88], ["hay", 1]] },
  grass: "green", verge: 1,
  ground: { soil: "vec3(0.16, 0.12, 0.085)", steep: "vec3(0.3, 0.24, 0.17)" },
  kinds(land, a) {
    trees(land, a, [["oak", 22, 500], ["aspen", 22, 500], ["pine", 22, 500], ["pine_tall", 22, 500]]);
    for (const c of ["c_oak", "c_pine", "c_mix"]) land.addKind(c, I(a, c), 140, { receive: false });
    land.addKind("bush", I(a, "bush"), 420, { receive: false });
    land.addKind("bush_b", I(a, "bush_b"), 220, { receive: false });
    land.addKind("rock", a.parts.rock_boulder, 6);
  },
  place(s) {
    const { r, z0, z1, side, zone, X, clear, put, night } = s;
    const t = (e: number, z: number, conifer: number, near = true) => {
      const k = r(), kind = k < conifer * 0.75 ? "pine" : k < conifer ? "pine_tall" : k < conifer + (1 - conifer) * 0.7 ? "oak" : "aspen";
      put(near ? kind : `i_${kind}`, X(e), z, r() * 6.28, 0.75 + r() * 0.5);
    };
    if (zone === "forest") {
      const edge = forestEdge(z0, side), conifer = hash(s.seg, side * 3.7) * 0.9;
      // the edge: a wall of full trees with bushes and long grass at their feet
      for (let z = z0 + r() * 4; z < z1; z += 4.5 + r() * 3) if (clear(z)) t(edge + r() * 3, z, conifer);
      for (let i = 0; i < 26; i++) { const z = z0 + r() * CHUNK; if (clear(z)) put(r() < 0.6 ? "bush" : "bush_b", X(edge - 2 + r() * 3), z, r() * 6.28, 0.9 + r() * 0.9); }
      for (let i = 0; i < 160; i++) put("grass", X(edge - 5 + r() * 6), z0 + r() * CHUNK, r() * 6.28, 0.6 + r() * 0.6);
      // the depth of it, as impostors, thinning out up the hills
      for (let e = edge + 5; e < edge + 150; e += 5.5) for (let z = z0 + r() * 3; z < z1; z += 5 + r() * 2.5) {
        if (!clear(z) || r() < (e - edge) / 400) continue;
        t(e + r() * 3, z, conifer, false);
      }
    } else if (zone === "field") {
      // a hedgerow along the first field, its trees standing out of it, and hedges across between fields
      const hedge = (e: number, z: number) => put(r() < 0.7 ? "bush" : "bush_b", X(e + (r() - 0.5) * 1.2), z, r() * 6.28, 1.4 + r() * 0.9);
      for (let z = z0; z < z1; z += 0.9 + r() * 0.6) if (clear(z)) hedge(22, z);
      for (let z = z0 + r() * 20; z < z1; z += 18 + r() * 30) if (clear(z)) t(22 + r(), z, 0.15);
      const off = side > 0 ? 17 : 41, zc = Math.ceil((z0 + off) / 110) * 110 - off; // the fields' rows, as the ground draws them
      if (zc < z1 && clear(zc)) for (let e = 24; e < 112; e += 1.1 + r() * 0.7) hedge(e, zc);
      // lone trees out in the fields
      for (let i = 0; i < 4; i++) { const e = 30 + r() * 80; t(e, z0 + r() * CHUNK, 0.1, e < 70); }
      // a farm: the house, its barn, trees round them
      if (r() < 0.4) farm(s, "house", (e, z) => { for (let i = 0; i < 5; i++) put(r() < 0.5 ? "i_oak" : "c_oak", X(e + (r() - 0.5) * 40), z + (r() - 0.5) * 50, r() * 6.28, 0.8 + r() * 0.4); });
    } else {
      // the edge of a town: a noise barrier, the houses behind it in rows, gardens' trees, a warehouse
      for (let z = z0 + 2; z < z1; z += 4) if (clear(z)) put("barrier", X(3.6), z, 0, 1);
      for (const e of [24, 48, 72]) for (let z = z0 + r() * 10; z < z1; z += 20 + r() * 8) {
        put(night && r() < 0.3 ? "house_dark" : "house", X(e + r() * 4), z, (side > 0 ? -1 : 1) * Math.PI / 2 + (r() < 0.2 ? Math.PI : 0), 0.95 + r() * 0.15);
        if (r() < 0.7) put(r() < 0.6 ? "i_oak" : "i_aspen", X(e + 9 + r() * 4), z + 8 + r() * 4, r() * 6.28, 0.6 + r() * 0.3);
      }
      if (r() < 0.6) put("warehouse", X(110 + r() * 60), z0 + 30 + r() * 60, side * Math.PI / 2, 1);
    }
    if (zone !== "forest") for (let i = 0; i < 6; i++) put("bush", X(9 + r() * 10), z0 + r() * CHUNK, r() * 6.28, 0.7 + r() * 0.6);
    // a boulder or two on the slope
    if (r() < 0.5) put("rock", X(8 + r() * 12), z0 + r() * CHUNK, r() * 6.28, 0.6 + r() * 0.8);
    horizon(s, 110, 0.5, (k) => (k < 0.4 ? "c_mix" : k < 0.7 ? "c_pine" : "c_oak"));
  },
};

const plains: Style = {
  house: [0xfff8ec, 0xf0b090],
  terrain: { hills: 15, scale: 0.8, rough: 0.45, town: 0.88, forest: 0.66 },
  fields: { w: 120, len: 150, crops: [["ripe", 0.34], ["stubble", 0.58], ["soil", 0.74], ["sunflower", 0.88], ["fallow", 1]] },
  grass: "dry", verge: 0.8,
  ground: {
    // dry grass, bleached gold, bare dusty earth showing through in patches
    base: `g = mix(vec3(0.27, 0.2, 0.08), vec3(0.16, 0.15, 0.065), smoothstep(0.4, 0.75, big)) * d * (0.85 + 0.3 * mid);
      g = mix(g, vec3(0.3, 0.2, 0.11) * (0.75 + 0.5 * mid), smoothstep(0.5, 0.72, gf(vW.xz / 35.0 + 3.0)) * 0.7);`,
    soil: "vec3(0.25, 0.14, 0.065)",
    forest: "g = mix(g, vec3(0.3, 0.2, 0.12) * (0.7 + 0.5 * mid) * (0.8 + 0.3 * rows(vW.z, 8.0)), vZone.y * 0.8);", // an olive grove's tilled earth
    town: "g = mix(g, vec3(0.36, 0.3, 0.22) * (0.75 + 0.4 * mid), vZone.z * 0.6);",
    steep: "vec3(0.42, 0.32, 0.21)",
  },
  kinds(land, a) {
    trees(land, a, [["acacia", 12, 220], ["olive", 50, 900]]);
    for (const c of ["c_acacia", "c_olive"]) land.addKind(c, I(a, c), 90, { receive: false });
    land.addKind("sunflower", [a.grass("sunflower")], 2600, { shadow: false });
    land.addKind("bale", [bale()], 120);
    land.addKind("crag", [crag(stone(a, 0xb3a184), 1.3)], 60);
    land.addKind("crag_b", [crag(stone(a, 0xa08c70), 4.1)], 60);
    land.addKind("rock", a.parts.rock_boulder, 4);
  },
  place(s) {
    const { r, z0, z1, side, zone, X, clear, put, night } = s;
    if (zone === "field") {
      for (const c of cells(s, plains, 260)) {
        const zs = c.z0 + 4, ze = c.z1 - 4, ew = c.e0 + 4, we = plains.fields.w - 8;
        if (ze <= zs) continue;
        // sunflowers near the road, stalk to stalk
        if (c.crop === "sunflower" && c.e0 < 150) for (let i = 0; i < 1100; i++) {
          const e = ew + r() * Math.min(we, 120 - c.e0), z = zs + r() * (ze - zs);
          if (clear(z)) put("sunflower", X(e), z, r() * 6.28, 1.5 + r() * 0.5);
        }
        // the stubble's bales, in loose lines where the baler dropped them
        if (c.crop === "stubble") for (let k = 0; k < 3; k++) {
          const e = ew + 10 + r() * (we - 20), z = zs + r() * (ze - zs);
          for (let j = 0; j < 4; j++) put("bale", X(e + j * (6 + r() * 4)), z + (r() - 0.5) * 6, r() * 6.28, 0.9 + r() * 0.2);
        }
      }
      // lone acacias out on the plain
      for (let i = 0; i < 3; i++) { const e = 30 + r() * 260; tree(s, e, z0 + r() * CHUNK, "acacia", e < 90, 0.9 + r() * 0.5); }
      // a farm: a white house, a barn, a few olives
      if (r() < 0.3) farm(s, "house", (e, z) => {
        for (let i = 0; i < 4; i++) put("i_olive", X(e + (r() - 0.5) * 36), z + (r() - 0.5) * 40, r() * 6.28, 0.8 + r() * 0.4);
        put("c_olive", X(e + 25 + r() * 20), z + (r() - 0.5) * 40, r() * 6.28, 1);
      });
    } else if (zone === "forest") {
      // an olive grove: trees in rows on tilled earth
      const edge = forestEdge(z0, side) + 6;
      for (let e = edge; e < edge + 140; e += 8) for (let z = Math.ceil(z0 / 8) * 8; z < z1; z += 8) if (clear(z) && r() < 0.93) tree(s, e + (r() - 0.5), z + (r() - 0.5), "olive", e < edge + 25, 0.8 + r() * 0.3);
    } else {
      // a hamlet: white houses gathered off the road, a barn, an acacia
      const zc = z0 + 30 + r() * 60, ec = 45 + r() * 40;
      for (let i = 0; i < 9; i++) put(night && r() < 0.3 ? "house_dark" : "house", X(ec + (r() - 0.5) * 50), zc + (r() - 0.5) * 70, (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.3, 0.9 + r() * 0.2);
      put("barn", X(ec + 40), zc + (r() - 0.5) * 40, Math.PI / 2, 0.6);
      for (let i = 0; i < 4; i++) put("i_olive", X(ec + (r() - 0.5) * 60), zc + (r() - 0.5) * 80, r() * 6.28, 0.8 + r() * 0.3);
    }
    // rocks on the slopes and out on the low hills
    if (r() < 0.4) put("rock", X(8 + r() * 12), z0 + r() * CHUNK, r() * 6.28, 0.6 + r() * 0.8);
    for (let i = 0; i < 40; i++) {
      const e = 12 + Math.pow(r(), 0.8) * 420, z = z0 + r() * CHUNK, y = heightAt(s.t, X(e), z, s.roadHalf);
      if (y < 2.5 + r() * 5) continue; // on the hills' shoulders and the tops of the cuttings, in a scatter
      for (let k = 0, n = 1 + Math.floor(r() * 3); k < n; k++) put(r() < 0.5 ? "crag" : "crag_b", X(e + (r() - 0.5) * 6), z + (r() - 0.5) * 6, r() * 6.28, 0.8 + r() * r() * 3.2);
    }
    horizon(s, 70, 0.6, (k) => (k < 0.55 ? "c_acacia" : "c_olive"), [1, 0.6]);
  },
};

const vineyard: Style = {
  house: [0xf0b27a, 0xe89870],
  terrain: { hills: 44, scale: 1.25, rough: 0.08, town: 0.86, forest: 0.6, water: -5, lakes: true },
  fields: { w: 70, len: 80, crops: [["vines", 0.48], ["stubble", 0.62], ["lavender", 0.7], ["pasture", 0.86], ["soil", 1]] },
  grass: "green", verge: 0.9,
  ground: {
    base: "g = mix(g, lum * vec3(1.55, 1.35, 0.7), 0.5);", // late summer: the green going gold
    soil: "vec3(0.3, 0.17, 0.1)",
    steep: "vec3(0.38, 0.22, 0.13)",
    shore: "vec3(0.34, 0.29, 0.2)",
  },
  kinds(land, a) {
    trees(land, a, [["cypress", 24, 600], ["oak", 18, 400], ["stonepine", 10, 160]]);
    for (const c of ["c_cypress", "c_oak", "c_mix"]) land.addKind(c, I(a, c), 120, { receive: false });
    land.addKind("vine", [vineRow()], 760);
    land.addKind("bush", I(a, "bush"), 10, { receive: false });
    land.addKind("rock", a.parts.rock_boulder, 3);
  },
  place(s) {
    const { r, z0, z1, side, zone, X, clear, put, night } = s;
    const f = vineyard.fields;
    if (zone === "field") {
      for (const c of cells(s, vineyard, 240)) {
        // vines in rows across the slope, a track round each field
        if (c.crop === "vines") for (let z = Math.ceil(c.z0 / 2.6) * 2.6; z < c.z1; z += 2.6) {
          const v = z + fieldOff(side) - c.row * f.len;
          if (v < 4 || v > f.len - 4) continue;
          for (let e = c.e0 + 10; e < c.e0 + f.w - 9; e += 12) put("vine", X(e), z, 0, 1);
        }
        // a line of cypresses along the track between fields, now and then
        const zb = c.row * f.len - fieldOff(side);
        if (zb >= z0 && zb < z1 && hash(c.row, c.e0 + side) < 0.35 && clear(zb)) for (let e = c.e0 + 3; e < c.e0 + f.w; e += 6.5) tree(s, e, zb, "cypress", e < 90, 0.9 + r() * 0.25);
      }
      // a farm of terracotta and ochre on its knoll, a cypress avenue to it, umbrella pines
      if (r() < 0.45) farm(s, "house", (e, z) => {
        for (let k = 26; k < e - 4; k += 7) tree(s, k, z + 6, "cypress", k < 90, 0.85 + r() * 0.2);
        for (let i = 0; i < 2; i++) tree(s, e + (r() - 0.5) * 30, z + (r() - 0.5) * 30, "stonepine", false, 0.9 + r() * 0.3);
        put("c_oak", X(e + 20 + r() * 20), z + (r() - 0.5) * 40, r() * 6.28, 1);
      });
      for (let i = 0; i < 2; i++) { const e = 30 + r() * 150; tree(s, e, z0 + r() * CHUNK, "stonepine", e < 80, 0.9 + r() * 0.4); }
    } else if (zone === "forest") {
      // a wood of oaks, cypresses at its edge
      const edge = forestEdge(z0, side);
      for (let z = z0 + r() * 4; z < z1; z += 5 + r() * 3) if (clear(z)) tree(s, edge + r() * 3, z, r() < 0.35 ? "cypress" : "oak", true);
      for (let e = edge + 6; e < edge + 130; e += 6) for (let z = z0 + r() * 3; z < z1; z += 6 + r() * 3) {
        if (!clear(z) || r() < (e - edge) / 350) continue;
        tree(s, e + r() * 3, z, r() < 0.2 ? "cypress" : "oak", false);
      }
    } else {
      // a village on the hill: houses close together, cypresses between
      const zc = z0 + 30 + r() * 60, ec = 50 + r() * 50;
      for (let i = 0; i < 14; i++) put(night && r() < 0.3 ? "house_dark" : "house", X(ec + (r() - 0.5) * 45), zc + (r() - 0.5) * 70, (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2, 0.9 + r() * 0.25);
      for (let i = 0; i < 6; i++) tree(s, ec + (r() - 0.5) * 70, zc + (r() - 0.5) * 90, "cypress", false, 0.9 + r() * 0.3);
    }
    if (r() < 0.4) put("bush", X(9 + r() * 10), z0 + r() * CHUNK, r() * 6.28, 0.7 + r() * 0.6);
    if (r() < 0.3) put("rock", X(8 + r() * 12), z0 + r() * CHUNK, r() * 6.28, 0.6 + r() * 0.8);
    horizon(s, 100, 0.52, (k) => (k < 0.45 ? "c_cypress" : k < 0.8 ? "c_oak" : "c_mix"));
  },
};

const moor: Style = {
  house: [0x9c9a92, 0x6c6c70],
  terrain: { hills: 34, scale: 1.7, rough: 0.2, town: 0.93, forest: 0.74, water: -6, sea: 1 },
  fields: { w: 75, len: 90, far: 97, crops: [["pasture", 0.4], ["rough", 0.75], ["bracken", 1]] },
  grass: "heath", verge: 1.1,
  ground: {
    // moor grass, olive to tawny in big sweeps; heather darker and browner in drifts, bracken a dull rust, bare
    // stone showing through: the colours of a real moor are close together, so no patch shouts
    base: `g = mix(vec3(0.1, 0.122, 0.058), vec3(0.17, 0.158, 0.088), smoothstep(0.35, 0.75, big)) * d;
      g = mix(g, vec3(0.085, 0.07, 0.062) * d, smoothstep(0.45, 0.62, gf(vW.xz / 22.0 + 5.0)) * 0.6);
      g = mix(g, vec3(0.19, 0.12, 0.06) * d, smoothstep(0.55, 0.7, gf(vW.xz / 45.0 + 9.0)) * 0.55);
      g = mix(g, vec3(0.17, 0.17, 0.16) * (0.6 + 0.6 * gn(vW.xz * 1.3)), smoothstep(0.72, 0.82, gf(vW.xz / 12.0 + 2.0)) * 0.6);`,
    soil: "vec3(0.14, 0.12, 0.1)",
    forest: "g = mix(g, vec3(0.1, 0.075, 0.05) * (0.8 + 0.4 * mid), vZone.y * 0.9);", // a plantation's needles
    steep: "vec3(0.27, 0.27, 0.26)",
    shore: "vec3(0.24, 0.23, 0.21)",
  },
  kinds(land, a) {
    trees(land, a, [["pine", 30, 700], ["pine_tall", 20, 400], ["aspen", 4, 30]]);
    land.addKind("c_pine", I(a, "c_pine"), 60, { receive: false });
    land.addKind("gorse", I(a, "gorse"), 320, { receive: false });
    land.addKind("wall", [stoneWall(1.5)], 160);
    land.addKind("sheep", sheep(), 60);
    land.addKind("crag", [crag(stone(a, 0x75746c), 2.2)], 50);
    land.addKind("crag_b", [crag(stone(a, 0x8a877c), 5.7)], 50);
    land.addKind("rock", a.parts.rock_boulder, 4);
  },
  place(s) {
    const { r, z0, z1, side, zone, X, clear, put, night } = s;
    const f = moor.fields, far = f.far!;
    if (zone === "field") {
      // walled fields by the road: dry-stone walls along and across, a gap for a gate now and then. A length is 3 m
      // with its top level, sunk to its lower end and as tall as the slope needs: it follows the hill in small steps
      const wall = (x0: number, za: number, x1: number, zb: number) => {
        const ya = heightAt(s.t, x0, za, s.roadHalf), yb = heightAt(s.t, x1, zb, s.roadHalf), lo = Math.min(ya, yb) - 0.25;
        put("wall", (x0 + x1) / 2, (za + zb) / 2, za === zb ? Math.PI / 2 : 0, 1, lo, Math.max(ya, yb) + 0.85 - lo);
      };
      for (let e = 22; e < far; e += f.w) for (let z = Math.ceil(z0 / 3) * 3 + 1.5; z < z1; z += 3) if (clear(z) && hash(Math.floor(z / 6), e) > 0.04) wall(X(e), z - 1.5, X(e), z + 1.5);
      for (const c of cells(s, moor, far)) {
        const zb = c.row * f.len - fieldOff(side);
        if (zb >= z0 && zb < z1 && clear(zb)) for (let e = c.e0 + 1.5; e < c.e0 + f.w; e += 3) if (hash(Math.floor(e / 6), zb) > 0.05) wall(X(e - 1.5), zb, X(e + 1.5), zb);
        // sheep grazing the pasture, in a loose flock
        if (c.crop === "pasture" && c.z1 - c.z0 > 30) {
          const ec = c.e0 + 15 + r() * (f.w - 30), zc = c.z0 + 10 + r() * (c.z1 - c.z0 - 20);
          for (let i = 0; i < 12; i++) put("sheep", X(ec + (r() - 0.5) * 30), zc + (r() - 0.5) * 24, r() * 6.28, 0.9 + r() * 0.2);
        }
      }
    } else if (zone === "forest") {
      // a plantation: pines in close rows, a hard edge
      const edge = forestEdge(z0, side) + 10;
      for (let e = edge; e < edge + 160; e += 4.5) for (let z = Math.ceil(z0 / 4.5) * 4.5; z < z1; z += 4.5) if (clear(z) && r() < 0.95) tree(s, e + (r() - 0.5) * 1.5, z + (r() - 0.5) * 1.5, r() < 0.7 ? "pine" : "pine_tall", e < edge + 6, 0.85 + r() * 0.3);
    } else {
      // a few grey cottages
      const zc = z0 + 30 + r() * 60, ec = 40 + r() * 40;
      for (let i = 0; i < 5; i++) put(night && r() < 0.3 ? "house_dark" : "house", X(ec + (r() - 0.5) * 40), zc + (r() - 0.5) * 50, (r() < 0.5 ? 0 : Math.PI / 2), 0.9 + r() * 0.2);
    }
    // the open moor: gorse in drifts, tors on the tops, a lone wind-bent tree
    for (let i = 0; i < 160; i++) {
      const e = 6 + Math.pow(r(), 1.5) * 520, z = z0 + r() * CHUNK, x = X(e);
      if ((zone === "field" && e > 24 && e < far && r() < 0.85) || (zone === "forest" && e > forestEdge(z0, side))) continue;
      if (fbm(x / 60 + 3, z / 60) < 0.45) continue;
      put("gorse", x, z, r() * 6.28, 0.8 + r() * 0.9);
    }
    for (let i = 0; i < 30; i++) {
      const e = 30 + Math.pow(r(), 0.8) * 560, z = z0 + r() * CHUNK, y = heightAt(s.t, X(e), z, s.roadHalf);
      if (y < 10 + r() * 6) continue;
      const n = 2 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) put(r() < 0.5 ? "crag" : "crag_b", X(e + (r() - 0.5) * 9), z + (r() - 0.5) * 9, r() * 6.28, 1.5 + r() * 2.8);
    }
    if (r() < 0.5) put("rock", X(8 + r() * 12), z0 + r() * CHUNK, r() * 6.28, 0.6 + r() * 0.8);
    for (let i = 0; i < 5; i++) put(r() < 0.5 ? "crag" : "crag_b", X(5 + r() * 16), z0 + r() * CHUNK, r() * 6.28, 0.4 + r() * 0.7); // stones on the slope
    if (r() < 0.3) tree(s, 40 + r() * 100, z0 + r() * CHUNK, "aspen", false, 0.6 + r() * 0.3);
    horizon(s, 40, 0.72, () => "c_pine", [1, 0.6]);
  },
};

/** A city's buildings: apartment blocks, office towers in glass, dark ones; how big and how they look. */
const BLOCKS = {
  block: { w: 22, d: 12, h: 19.2, look: { wall: "#b9ae9c", glass: "#4a5560", frame: 14, seed: 3, roof: 0x5a5856 } },
  tower: { w: 18, d: 18, h: 38.4, look: { wall: "#56636e", glass: "#7f95a8", frame: 4, seed: 7, roof: 0x3c4044 } },
  office: { w: 26, d: 16, h: 25.6, look: { wall: "#3b3d40", glass: "#5d6a75", frame: 8, seed: 19, roof: 0x2c2d2f } },
};
const city: Style = {
  house: [0xe8e0d0, 0xb0b0b0],
  terrain: { hills: 8, scale: 1, rough: 0.05, city: true },
  lit: true,
  fields: { w: 60, len: 70, crops: [["yard", 0.4], ["lot", 0.7], ["gravel", 0.88], ["scrub", 1]] },
  grass: "green", verge: 0.6,
  ground: {
    base: "g *= vec3(0.86, 0.92, 0.8);",
    soil: "vec3(0.14, 0.12, 0.1)",
    forest: "g = mix(g, g * vec3(1.05, 1.15, 0.9), vZone.y * 0.7);", // a park's lawns
    // a town's ground paved: concrete between the blocks, streets of asphalt between their rows and across every 90 m
    town: `{ float st = min(abs(mod(e - 46.0, 32.0) - 16.0) - 12.5, abs(mod(vW.z, 90.0) - 45.0) - 39.0);
      vec3 pave = vec3(0.17, 0.17, 0.165) * (0.75 + 0.4 * gn(vW.xz / 4.0));
      vec3 road = vec3(0.035, 0.036, 0.04) * (0.85 + 0.3 * mid);
      vec3 tw = mix(pave, road, smoothstep(0.3, 0.6, st));
      g = mix(g, tw, vZone.z * smoothstep(20.0, 24.0, e)); }`,
    steep: "vec3(0.25, 0.22, 0.18)",
  },
  kinds(land, a, night) {
    for (const [k, b] of Object.entries(BLOCKS)) land.addKind(k, building(b.w, b.d, b.h, b.look, night), 110, {});
    trees(land, a, [["oak", 8, 300]]);
    land.addKind("c_oak", I(a, "c_oak"), 30, { receive: false });
    land.addKind("bush", I(a, "bush"), 10, { receive: false });
    land.addKind("tank", [tank()], 12);
    land.addKind("chimney", [chimney()], 4);
    if (night) {
      land.addKind("glow", [halo(0xffb070, 1.3)], 300, { shadow: false, receive: false });
      land.addKind("beacon", [halo(0xff3020, 2.2)], 4, { shadow: false, receive: false });
      land.addKind("street", [lampPool(a.glow, new THREE.Color(0xffc68a).multiplyScalar(0.22))], 40, { shadow: false, receive: false });
    }
  },
  place(s) {
    const { r, z0, z1, side, zone, X, clear, put, night } = s;
    const across = (side > 0 ? -1 : 1) * Math.PI / 2;
    const bld = (kind: keyof typeof BLOCKS, e: number, z: number, tall: number) => put(kind, X(e), z, across + (r() < 0.15 ? Math.PI / 2 : 0), 1, undefined, tall);
    // the blocks in the rows between the streets, never in the street across; past `near` m, towers scattered to
    // the skyline, taller the further out
    const rows = (e0: number, near: number, pick: (e: number) => keyof typeof BLOCKS) => {
      for (let e = 30; e < near; e += 32) if (e > e0 + 20) for (let zb = Math.floor(z0 / 90) * 90; zb < z1; zb += 90) for (const dz of [20, 45, 70]) {
        const z = zb + dz + (r() - 0.5) * 4;
        if (z < z0 || z >= z1 || r() < 0.12) continue;
        bld(pick(e), e + (r() - 0.5) * 3, z, 0.8 + r() * (0.5 + e / 200));
      }
      for (let i = 0; i < 26; i++) {
        const e = Math.max(near, e0) + Math.pow(r(), 0.8) * 700;
        bld(r() < 0.55 ? "tower" : r() < 0.6 ? "office" : "block", e, z0 + r() * CHUNK, 0.9 + r() * (0.8 + e / 260));
      }
    };
    const lights = (e0: number, e1: number) => {
      if (!night) return;
      const y = (e: number, z: number, up: number) => heightAt(s.t, X(e), z, s.roadHalf) + up;
      for (let e = 46; e < e1; e += 32) if (e > e0) for (let z = Math.ceil(z0 / 30) * 30; z < z1; z += 30) {
        put("glow", X(e - 6), z, 0, 1 + e / 120, y(e - 6, z, 7));
        if (e < 200) put("street", X(e - 3), z, 0, 0.8, y(e - 3, z, 0.08));
      }
      for (let z = Math.ceil(z0 / 90) * 90; z < z1; z += 90) for (let e = Math.max(e0, 30); e < e1; e += 28) put("glow", X(e), z + 6, 0, 1 + e / 120, y(e, z + 6, 7));
    };
    if (zone === "town") {
      for (let z = z0 + 2; z < z1; z += 4) if (clear(z)) put("barrier", X(3.6), z, 0, 1);
      for (let z = z0 + r() * 8; z < z1; z += 14 + r() * 8) if (clear(z)) tree(s, 14 + r() * 4, z, "oak", true, 0.6 + r() * 0.25);
      rows(0, 230, (e) => (e < 140 ? (r() < 0.75 ? "block" : "office") : r() < 0.45 ? "tower" : r() < 0.6 ? "office" : "block"));
      lights(0, 700);
    } else if (zone === "field") {
      // the industrial estate: sheds in rows, tanks in a cluster, a chimney with its warning light
      for (let e = 52; e < 230; e += 44) for (let z = z0 + r() * 20; z < z1; z += 46 + r() * 30) put("warehouse", X(e + r() * 6), z, side * Math.PI / 2, 0.8 + r() * 0.3);
      if (r() < 0.6) { const e = 60 + r() * 120, z = z0 + 20 + r() * 80; for (let i = 0; i < 4; i++) put("tank", X(e + (i % 2) * 14), z + Math.floor(i / 2) * 14, 0, 0.8 + r() * 0.3); }
      if (r() < 0.35) { const e = 90 + r() * 140, z = z0 + r() * CHUNK, y = heightAt(s.t, X(e), z, s.roadHalf); put("chimney", X(e), z, 0, 1, y); if (night) put("beacon", X(e), z, 0, 2.2, y + 42.5); }
      rows(240, 240, () => "office");
      if (night) for (let i = 0; i < 10; i++) { const e = 30 + r() * 200, z = z0 + r() * CHUNK; put("glow", X(e), z, 0, 1.4, heightAt(s.t, X(e), z, s.roadHalf) + 9); }
      lights(240, 700);
    } else {
      // a park: trees on its lawns, the city beyond
      for (let e = 20; e < 200; e += 9) for (let z = z0 + r() * 9; z < z1; z += 9 + r() * 9) if (clear(z) && r() < 0.55) tree(s, e, z, "oak", e < 40, 0.7 + r() * 0.4);
      rows(220, 220, () => "block");
      lights(220, 700);
    }
    for (let i = 0; i < 3; i++) put("bush", X(9 + r() * 6), z0 + r() * CHUNK, r() * 6.28, 0.6 + r() * 0.5);
  },
};

export const LANDS: Record<LandId, Style> = { country, plains, vineyard, moor, city };
