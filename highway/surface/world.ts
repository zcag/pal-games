// A place: the sky and its sun, the road for a layout, the guardrails and
// reflector posts, the land and everything on it, and the light at night. It
// follows the player along the road (everything streams or snaps ahead).
import * as THREE from "./vendor/three.js";
import { applySky, surface, worldUV, prop, type Sky, type Part } from "./env.ts";
import { Road } from "./road.ts";
import { edges, RAIL, type Layout } from "../game/layout.ts";
import { Land, CHUNK, SEG, zoneAt, bridgeNear, fbm, type Put, type Terrain } from "./terrain.ts";
import { bake, fuller, grassClump, sprig, type Tone } from "./foliage.ts";
import { overpass, barrierPanel, lampPool, halo, signFace } from "./structures.ts";
import { LANDS, groundMaterial, water, tinted, windows, type Assets, type Style } from "./lands.ts";
import { LOCATIONS, type LandId } from "../game/content.ts";
import { SKY_LOOKS, type SkyLook } from "./skylooks.ts";

const LAMP = 260; // a street lamp's candela, in the night look's units

export class World {
  scene = new THREE.Scene();
  sun = new THREE.DirectionalLight();
  fill = new THREE.HemisphereLight(0x8a9cc0, 0x0c0d10, 0);
  road!: Road;
  land!: Land;
  rails = new THREE.Group();
  look!: SkyLook;
  sky!: Sky;
  lo = 0; hi = 0; // the asphalt's edges
  night = false;
  glow: THREE.Texture;
  lamps: THREE.PointLight[] = []; // at night, real light from the street lamps nearest the car
  water: THREE.Mesh | null = null;
  lit = false; // street lamps all along the road

  constructor(public renderer: THREE.WebGLRenderer) {
    this.scene.add(this.sun, this.sun.target, this.fill);
    // one shadow map over the whole stretch you can make out (~90 m each side, 230 m ahead): its
    // edge is out in the haze, not a line across the road in front of you; 4096 px keeps it ~7 cm a texel
    this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera;
    sc.left = -130; sc.right = 130; sc.top = 150; sc.bottom = -150; sc.near = 1; sc.far = 700;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.05;
    this.glow = glowTexture();
    // before each render of the scene, the land's heavy things culled to its view, and to the shadow's box when
    // it draws the shadow map (Land.cull)
    this.scene.onBeforeRender = (r, _s, camera) => {
      if (!this.land) return;
      const shadow = r.shadowMap.needsUpdate && this.sun.castShadow;
      if (shadow) this.sun.shadow.updateMatrices(this.sun);
      this.land.cull(camera, shadow ? this.sun.shadow.getFrustum() : null);
    };
  }

  /** The place for a sky, an asphalt and a layout; its land by default the one LOCATIONS gives that sky. */
  async build(sky: string, asphaltName: string, layout: Layout, landId: LandId = LOCATIONS.find((l) => l.sky === sky)?.land ?? "country") {
    const look = (this.look = SKY_LOOKS[sky]);
    this.night = !!look.night;
    this.sky?.dispose();
    this.sky = await applySky(this.scene, this.renderer, sky, look.sunAngle);
    this.renderer.toneMappingExposure = look.exposure;
    this.scene.environmentIntensity = look.env ?? 1;
    this.scene.backgroundIntensity = this.night ? 0.6 : 1;
    this.sun.color.copy(this.sky.color);
    this.sun.intensity = this.night ? this.sky.intensity * 0.06 : this.sky.intensity;
    this.sun.castShadow = this.sun.intensity > 0.3;
    this.scene.fog = new THREE.FogExp2(look.fogColor, look.fog);
    this.scene.userData.look = look; // for the finishing (skylooks.ts lookOf)
    // moonlight and the glow of the sky: enough to see the shape of a car at night
    this.fill.intensity = this.night ? 0.55 : 0;

    // the road
    if (this.road) this.scene.remove(this.road.mesh);
    const asphalt = await surface(asphaltName);
    this.road = new Road(layout, { color: asphalt.map, normal: asphalt.normal, rough: asphalt.orm, tile: asphalt.tile * 1.5 });
    this.scene.add(this.road.mesh);
    [this.lo, this.hi] = edges(layout);

    // guardrails and reflector posts
    this.scene.remove(this.rails);
    this.rails = railsFor(this.lo, this.hi);
    this.scene.add(this.rails);

    // the land
    if (this.land) this.scene.remove(this.land.group);
    // a low sun keeps its side of the road mostly open, so its light reaches the asphalt
    const open = !this.night && this.sky.sun.y < 0.3 ? Math.sign(this.sky.sun.x) : 0;
    this.land = await landFor(this.renderer, landId, Math.max(this.hi, -this.lo), asphalt, this.night, open);
    this.lit = !!LANDS[landId].lit;
    this.scene.add(this.land.group);
    // its lakes or the sea, under the sky
    this.water?.removeFromParent();
    const level = this.land.t.water;
    this.water = level === undefined ? null : water(level, this.night ? 0x05070a : 0x12303a);
    if (this.water) this.scene.add(this.water);
    for (const l of this.lamps) l.removeFromParent();
    this.lamps = this.night ? [0, 1, 2, 3].map(() => new THREE.PointLight(0xffc690, 0, 45, 2)) : [];
    if (this.lamps.length) this.scene.add(...this.lamps);
  }

  /** Follow the player: the road and rails snap ahead, the land streams, the sun's shadow box moves. */
  follow(z: number) {
    this.road.follow(z);
    this.rails.position.z = Math.floor(z / 100) * 100;
    this.land.update(z);
    if (this.water) this.water.position.z = Math.floor(z / 500) * 500;
    // centred ahead of the car, snapped to whole texels so the shadows don't crawl as it moves
    const texel = 260 / 4096, tz = Math.round((z + 95) / texel) * texel;
    this.sun.target.position.set(0, 0, tz);
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.sky.sun, 300);
    // the lamps just behind and ahead of the car light it for real; the pools stand in further off
    if (this.lamps.length) {
      const half = Math.max(this.hi, -this.lo), near: [number, number][] = [];
      for (let c = Math.floor((z - 20) / CHUNK); c <= Math.floor((z + 110) / CHUNK); c++) for (const side of [-1, 1]) for (const lz of lampsAt(c * CHUNK, side, true, this.land.t, this.lit)) if (lz > z - 20 && lz < z + 110) near.push([side, lz]);
      near.sort((a, b) => Math.abs(a[1] - z - 25) - Math.abs(b[1] - z - 25));
      this.lamps.forEach((l, i) => {
        const n = near[i];
        l.intensity = n ? LAMP : 0;
        if (n) l.position.set(n[0] * (half + 0.1), 9.4, n[1]);
      });
    }
  }
}

/** A W-beam guardrail on each side (the real profile, extruded), its posts, and a reflector post every 50 m. */
function railsFor(lo: number, hi: number) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  const p = [[0, 0], [0.03, 0.02], [0.08, 0.04], [0.085, 0.08], [0.03, 0.1], [0.03, 0.2], [0.085, 0.22], [0.08, 0.26], [0.03, 0.28], [0, 0.31]];
  shape.moveTo(0, 0);
  for (const [x, y] of p) shape.lineTo(x, y);
  for (const [x, y] of [...p].reverse()) shape.lineTo(x + 0.004, y);
  const len = 1000;
  const rail = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, steps: 1 }).translate(0, 0.52, -100);
  const railMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 0.85, roughness: 0.38 });
  const postGeo = new THREE.BoxGeometry(0.1, 0.8, 0.15);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x8a8d90, metalness: 0.6, roughness: 0.5 });
  for (const side of [1, -1]) {
    const x = side > 0 ? hi + RAIL + 0.35 : lo - RAIL - 0.35; // where game/drive.ts stops a car's side, and the rail's depth
    const m = new THREE.Mesh(rail, railMat);
    m.scale.x = side; m.position.x = x;
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    const posts = new THREE.InstancedMesh(postGeo, postMat, 250);
    for (let i = 0; i < 250; i++) posts.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x + side * 0.12, 0.4, -100 + i * 4));
    posts.castShadow = true;
    group.add(posts);
  }
  const post = new THREE.BoxGeometry(0.12, 1.0, 0.12).translate(0, 0.5, 0);
  const band = new THREE.BoxGeometry(0.13, 0.12, 0.13).translate(0, 0.86, 0);
  const n = 20;
  const posts = new THREE.InstancedMesh(post, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }), n * 2);
  const bands = new THREE.InstancedMesh(band, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff9a30, emissiveIntensity: 0.4, roughness: 0.3 }), n * 2);
  for (let i = 0; i < n; i++) for (const [k, x] of [[0, hi + RAIL + 1], [1, lo - RAIL - 1]] as const) {
    const mt = new THREE.Matrix4().makeTranslation(x, 0, -100 + i * 50);
    posts.setMatrixAt(i * 2 + k, mt);
    bands.setMatrixAt(i * 2 + k, mt);
  }
  posts.castShadow = true;
  group.add(posts, bands);
  return group;
}

// ---------------------------------------------------------------- the land and what stands on it

/** A model's parts stretched: `w` across, `h` up (an acacia's flat crown, a cypress's column). */
function stretched(parts: Part[], w: number, h: number): Part[] {
  return parts.map(({ geo, mat }) => ({ geo: geo.clone().scale(w, h, w), mat }));
}

/** A tree pressed into an umbrella: its crown (above `from` of its height) squashed to `k` of its depth and
 *  spread `w` times wider the higher it goes, on a bare trunk (an acacia, an umbrella pine). */
function umbrella(parts: Part[], w: number, k: number, from = 0.45): Part[] {
  let H = 0;
  for (const { geo } of parts) { geo.computeBoundingBox(); H = Math.max(H, geo.boundingBox!.max.y); }
  const y0 = H * from;
  return parts.map(({ geo, mat }) => {
    const g = geo.clone(), p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), t = Math.min(1, Math.max(0, (y / H - 0.25) / 0.45)), sx = 1 + (w - 1) * t;
      p.setXYZ(i, p.getX(i) * sx, y > y0 ? y0 + (y - y0) * k : y, p.getZ(i) * sx);
    }
    g.computeVertexNormals();
    return { geo: g, mat };
  });
}

/** The models and impostors, loaded and baked once for every place. */
let assets: Promise<Assets> | null = null;
function loadAssets(renderer: THREE.WebGLRenderer) {
  return (assets ??= (async () => {
    const names = ["tree_oak", "tree_aspen", "tree_pine", "tree_pine_tall", "bush_a", "bush_b", "rock_boulder", "house", "warehouse", "light_pole", "sign_gantry", "sign_speed_limit", "sign_direction", "jersey_barrier"];
    const loaded = await Promise.all(names.map((n) => prop(n)));
    const raw = Object.fromEntries(names.map((n, i) => [n, loaded[i]]));
    // the EZ-Tree crowns are thin: grow every leaf card and set the greens; the aspen and the small bush wear
    // autumn's orange, so they borrow the oak's summer leaves. The south's trees are the same models reshaped:
    // olives low, round and silvery, acacias and umbrella pines spread flat, cypresses drawn up into columns
    const leaf = (raw.tree_oak.find((p) => (p.mat as THREE.MeshStandardMaterial).alphaTest)!.mat as THREE.MeshStandardMaterial).map;
    const parts: Record<string, Part[]> = {
      ...raw,
      oak: fuller(raw.tree_oak, 1.7, 0x9fb27a), aspen: fuller(raw.tree_aspen, 2.1, 0xb4c48a, leaf), pine: fuller(raw.tree_pine, 1.6, 0x7f9a6e), pine_tall: fuller(raw.tree_pine_tall, 1.5, 0x7f9a6e),
      bush: fuller(raw.bush_a, 1.3, 0x9cb07a), bush_b: fuller(raw.bush_b, 1.3, 0xa8b880, leaf),
      olive: fuller(stretched(raw.tree_oak, 0.75, 0.5), 1.7, 0xffffff, sprig("olive")), acacia: fuller(umbrella(raw.tree_oak, 1.9, 0.3), 1.5, 0xa3a866),
      stonepine: fuller(umbrella(raw.tree_pine, 2.2, 0.25, 0.6), 1.9, 0x7d9060), cypress: fuller(stretched(raw.tree_pine_tall, 0.28, 0.85), 1.7, 0x5e7848),
      gorse: fuller(stretched(raw.bush_a, 1.5, 0.7), 1.9, 0xffffff, sprig("gorse")),
    };
    // impostors: each tree, and clusters of them for far away (a few crowns as one quad)
    const one = (p: Part[]) => [{ parts: p }];
    const imp = bake(renderer, [
      ["oak", one(parts.oak)], ["aspen", one(parts.aspen)], ["pine", one(parts.pine)], ["pine_tall", one(parts.pine_tall)],
      ["bush", one(parts.bush)], ["bush_b", one(parts.bush_b)],
      ["c_oak", [{ parts: parts.oak, x: -3.5, s: 0.9 }, { parts: parts.oak, x: 3.2, z: -1.5, rot: 2, s: 1.05 }, { parts: parts.aspen, x: 0.3, z: 2, rot: 1, s: 0.8 }]],
      ["c_pine", [{ parts: parts.pine, x: -3 }, { parts: parts.pine_tall, x: 2.5, z: -2, rot: 1.3, s: 0.8 }, { parts: parts.pine, x: 5.5, z: 1.5, rot: 4, s: 0.85 }, { parts: parts.pine, x: -6, z: 2, rot: 2.5, s: 0.75 }]],
      ["c_mix", [{ parts: parts.oak, x: -4, s: 0.95 }, { parts: parts.pine, x: 1.5, z: -1.5, rot: 1 }, { parts: parts.oak, x: 5, z: 1.5, rot: 3, s: 0.85 }]],
      ["olive", one(parts.olive)], ["acacia", one(parts.acacia)], ["stonepine", one(parts.stonepine)], ["cypress", one(parts.cypress)],
      ["gorse", one(parts.gorse)],
      ["c_olive", [{ parts: parts.olive, x: -5 }, { parts: parts.olive, x: 3, z: -2, rot: 2, s: 0.9 }, { parts: parts.olive, x: 9, z: 1, rot: 4, s: 1.05 }]],
      ["c_acacia", [{ parts: parts.acacia, x: -4, s: 1.1 }, { parts: parts.acacia, x: 6, z: -3, rot: 2, s: 0.8 }]],
      ["c_cypress", [{ parts: parts.cypress, x: -6 }, { parts: parts.cypress, x: -2, rot: 1, s: 1.1 }, { parts: parts.cypress, x: 2, rot: 2, s: 0.95 }, { parts: parts.cypress, x: 6, rot: 3, s: 1.05 }]],
    ]);
    const grass = new Map<Tone, Part>();
    return { parts, imp, grass: (t: Tone) => grass.get(t) ?? grass.set(t, grassClump(t)).get(t)!, glow: glowTexture() };
  })());
}

/** Rolling land around the road in the place's style (lands.ts), bridges and gantries over the road, lamps at night. */
async function landFor(renderer: THREE.WebGLRenderer, id: LandId, half: number, asphalt: { map: THREE.Texture; normal: THREE.Texture; orm: THREE.Texture; tile: number }, night: boolean, open: number) {
  const [a, grass] = await Promise.all([loadAssets(renderer), surface("grass")]);
  const st = LANDS[id], parts = a.parts;
  const roadHalf = half + 2.5;
  const land = new Land({ ...st.terrain, seed: 3, open }, roadHalf, half, groundMaterial(grass, half, id), placer(st, half, night));
  land.addKind("grass", [a.grass(st.grass)], 2600, { shadow: false });
  // buildings; at night most windows are lit
  const concrete = parts.jersey_barrier[0].mat as THREE.MeshStandardMaterial;
  for (const t of [concrete.map, concrete.normalMap, concrete.roughnessMap, concrete.aoMap]) if (t) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const house = tinted(parts.house, ...st.house);
  land.addKind("house", windows(house, night ? 1.6 : 0), 16);
  land.addKind("house_dark", house, 8);
  land.addKind("warehouse", parts.warehouse, id === "city" ? 14 : 3);
  land.addKind("barn", parts.warehouse, 2);
  // over and beside the road
  const cross = new THREE.MeshStandardMaterial({ map: asphalt.map, normalMap: asphalt.normal, roughnessMap: asphalt.orm, color: 0xd8d8d8 });
  worldUV(cross, asphalt.tile * 1.5);
  land.addKind("bridge", overpass(roadHalf, concrete, cross), 1);
  await document.fonts?.load("700 100px Overpass").catch(() => undefined); // the signs' lettering
  const face = signFace();
  land.addKind("sign_limit", parts.sign_speed_limit, 1);
  land.addKind("sign_dir", parts.sign_direction, 1);
  land.addKind("gantry", parts.sign_gantry.map(({ geo, mat }) => (mat.name === "sign_face" ? { geo, mat: Object.assign((mat as THREE.MeshStandardMaterial).clone(), { map: face }) } : { geo, mat })), 1);
  land.addKind("barrier", barrierPanel(concrete), 64);
  const pole = parts.light_pole.map(({ geo, mat }) => {
    const m = (mat as THREE.MeshStandardMaterial).clone();
    if (m.emissiveIntensity > 0 && m.emissive.getHex()) m.emissiveIntensity = night ? 6 : 0;
    return { geo, mat: m };
  });
  land.addKind("pole", pole, 12);
  if (night) {
    land.addKind("pool", [lampPool(a.glow, new THREE.Color(0xffc68a).multiplyScalar(0.32))], 12, { shadow: false, receive: false });
    land.addKind("halo", [halo(0xffd2a0, 1.6)], 12, { shadow: false, receive: false });
  }
  st.kinds(land, a, night);
  return land;
}

/** The street lamps of a chunk on one side (their z): through towns, round every bridge, and at night along more of the road (all of it in a city). */
function lampsAt(z0: number, side: number, night: boolean, t: Terrain, lit = false) {
  const zb = bridgeNear(z0 + CHUNK / 2), out: number[] = [];
  const on = lit || zoneAt(z0, side, t) === "town" || Math.abs(z0 + 60 - zb) < 260 || (night && (z0 < 900 || fbm(z0 / 900, 4.2) > 0.5)); // a night run leaves the city's lights
  if (on) for (let z = z0 + (side > 0 ? 0 : 22); z < z0 + CHUNK; z += 44) if (Math.abs(z - zb) > 9 && Math.abs(z + 6 - zb) > 9) out.push(z);
  return out;
}

/** Where everything stands, chunk by chunk, from the plan in terrain.ts: what every place has here, the rest the place's style's. */
function placer(st: Style, half: number, night: boolean) {
  return function (this: Land, r: () => number, z0: number, put: Put) {
    const z1 = z0 + CHUNK, zb = bridgeNear(z0 + CHUNK / 2), bridge = zb >= z0 && zb < z1;
    const clear = (z: number) => Math.abs(z - zb) > 9;
    if (bridge) put("bridge", 0, zb, 0, 1, 0);
    // signs, turned to face the traffic: a gantry every half kilometre away from bridges, the limit on the verge
    // now and then, where the road goes before each bridge
    const chunk = Math.round(z0 / CHUNK);
    if (chunk % 4 === 1 && Math.abs(z0 + 60 - zb) > 300) put("gantry", 0, z0 + 60, Math.PI, (half + 2.6) / 9.4, 0);
    if (chunk % 7 === 3) put("sign_limit", -(half + 3.3), z0 + 30, Math.PI, 1.1);
    if (zb - 400 >= z0 && zb - 400 < z1) put("sign_dir", -(half + 4.2), zb - 400, Math.PI, 1.3);
    for (const side of [-1, 1]) {
      const zone = zoneAt(z0, side, this.t), X = (e: number) => side * (half + e);
      // the verge: short tufts in the mown strip, longer grass beyond
      for (let i = 0; i < 700 * st.verge; i++) {
        const e = 3.5 + Math.pow(r(), 1.4) * 14, z = z0 + r() * CHUNK;
        if ((zone === "town" && e < 4.5) || fbm(e / 7 + side * 5, z / 7) < 0.42 + r() * 0.12) continue; // in patches, not sprinkled
        put("grass", X(e), z, r() * 6.28, e < 8 ? 0.25 + r() * 0.25 : 0.45 + r() * 0.55);
      }
      st.place({ r, z0, z1, side, zone, seg: Math.floor(z0 / SEG), put, X, clear, night, t: this.t, half, roadHalf: this.roadHalf });
      // street lamps, their light on the road at night
      for (const z of lampsAt(z0, side, night, this.t, st.lit)) {
        put("pole", X(2.9), z, -side * Math.PI / 2, 1);
        if (night) {
          put("pool", X(0.4), z, 0, 1, 0.03);
          put("halo", X(0.1), z, 0, 1.1, 9.75);
        }
      }
    }
  };
}

/** A soft round glow, for the light pools of headlights. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
