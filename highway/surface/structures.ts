// What people built beside and over the road, made from boxes here rather
// than shipped as models: the overpass (deck, parapets, piers, and the road
// it carries off across the land), a panel of noise barrier, the faces of the
// gantry's signs, and the glow of street lamps at night (a pool of light on
// the road, a halo at the head).
import * as THREE from "./vendor/three.js";
import type { Part } from "./env.ts";
import { DECK } from "./terrain.ts";

type Box = [x0: number, x1: number, y0: number, y1: number, z0: number, z1: number];

/** Boxes merged into one geometry, textured by projecting along each face's axis (`tile` m a repeat) and darkened underneath, where little light gets. */
function boxes(list: Box[], tile: number, under = 0.4) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  for (const [x0, x1, y0, y1, z0, z1] of list) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const p = g.attributes.position, n = g.attributes.normal, base = pos.length / 3;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = Math.abs(n.getX(i)), ny = n.getY(i), nz = Math.abs(n.getZ(i));
      pos.push(x, y, z); nor.push(n.getX(i), ny, n.getZ(i));
      if (Math.abs(ny) > 0.5) uv.push(x / tile, z / tile); else if (nx > nz) uv.push(z / tile, y / tile); else uv.push(x / tile, y / tile);
      const c = ny < -0.5 ? under : 0.75 + 0.25 * Math.min(1, Math.max(0, y / 3)); // dimmer low down, near the dirt
      col.push(c, c, c);
    }
    for (const i of g.index!.array as Uint16Array) idx.push(i + base);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  return out;
}

/** An overpass across the road (x across, z along ours): a deck from slope top to slope top, parapets, a pier on each verge, and its road running off across the land. */
export function overpass(roadHalf: number, concrete: THREE.MeshStandardMaterial, asphalt: THREE.MeshStandardMaterial): Part[] {
  const L = roadHalf + 3 + 1.8 * DECK + 5, top = DECK, bot = DECK - 1.3, W = 6.2;
  const list: Box[] = [
    [-L, L, bot, top, -W, W], // the deck
    [-L, L, top - 0.45, top - 0.05, -W - 0.25, W + 0.25], // its edge beam, a shadow line along the face
    [-L, L, top, top + 0.95, -W - 0.25, -W + 0.15], [-L, L, top, top + 0.95, W - 0.15, W + 0.25], // parapets
  ];
  for (const s of [-1, 1]) {
    const x = s * (roadHalf + 1.7);
    list.push([x - 0.8, x + 0.8, bot - 0.9, bot, -W + 0.4, W - 0.4]); // the pier cap
    for (const z of [-3.6, 0, 3.6]) list.push([x - 0.45, x + 0.45, -1, bot - 0.9, z - 0.45, z + 0.45]); // columns
    list.push([s * (L - 4) - 0.5, s * (L - 4) + 0.5, bot - 2.5, bot, -W, W]); // the abutment, into the slope
  }
  const deck = boxes(list, 2.5);
  const mat = concrete.clone();
  mat.vertexColors = true;
  // the road it carries, off to the fog either side
  const road = new THREE.PlaneGeometry(900, 7.6).rotateX(-Math.PI / 2);
  const geos = [-1, 1].map((s) => road.clone().translate(s * (L + 448), top - 0.1, 0));
  const strip = new THREE.BufferGeometry();
  strip.setAttribute("position", new THREE.Float32BufferAttribute([...geos[0].attributes.position.array, ...geos[1].attributes.position.array], 3));
  strip.setAttribute("normal", new THREE.Float32BufferAttribute([...geos[0].attributes.normal.array, ...geos[1].attributes.normal.array], 3));
  strip.setIndex([...(geos[0].index!.array as Uint16Array), ...[...(geos[1].index!.array as Uint16Array)].map((i) => i + 4)]);
  return [{ geo: deck, mat }, { geo: strip, mat: asphalt }];
}

/** A 4 m panel of noise barrier along z, 4 m tall: a concrete plinth, ribbed metal cassettes, a steel post at one end. */
export function barrierPanel(concrete: THREE.MeshStandardMaterial): Part[] {
  const panel = boxes([[-0.08, 0.08, 0.6, 4.2, -2, 2]], 1);
  const uv = panel.attributes.uv as THREE.BufferAttribute, p = panel.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getZ(i) / 4, (p.getY(i) - 0.6) / 3.6);
  const plinth = boxes([[-0.15, 0.15, -0.6, 0.6, -2, 2]], 2);
  const post = boxes([[-0.12, 0.12, 0, 4.35, -2.1, -1.86]], 1);
  const tex = new THREE.CanvasTexture(ribs());
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8;
  const metal = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.3, vertexColors: true });
  const steel = new THREE.MeshStandardMaterial({ color: 0x55595c, roughness: 0.5, metalness: 0.6 });
  const con = concrete.clone(); con.vertexColors = true;
  return [{ geo: panel, mat: metal }, { geo: plinth, mat: con }, { geo: post, mat: steel }];
}

/** The cassettes' face: grey-green, a seam every half metre, fine ribs between, streaks of dirt from the bottom. */
function ribs() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9aa596"; g.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 8) { g.fillStyle = y % 64 === 0 ? "rgba(30,38,34,.45)" : "rgba(255,255,255,.07)"; g.fillRect(0, y, 128, y % 64 === 0 ? 3 : 2); }
  const grime = g.createLinearGradient(0, 256, 0, 150);
  grime.addColorStop(0, "rgba(60,52,40,.45)"); grime.addColorStop(1, "rgba(60,52,40,0)");
  g.fillStyle = grime; g.fillRect(0, 150, 128, 106);
  return c;
}

/** The pool of light a street lamp throws on the road: a flat glow, added to whatever is under it. */
export function lampPool(glow: THREE.Texture, color: THREE.ColorRepresentation): Part {
  const geo = new THREE.PlaneGeometry(13, 24).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: glow, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 });
  // near the car the lamps' real lights (world.ts) take over: the pools fade in from 70 m out
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vNear;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvNear = smoothstep(70.0, 115.0, distance(cameraPosition, (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz));");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vNear;").replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb *= vNear;");
  };
  mat.customProgramCacheKey = () => "lamp-pool";
  return { geo, mat };
}

/** A halo round a lamp's head: a quad that always faces the camera, brightest in the middle, for the bloom to catch. */
export function halo(color: THREE.ColorRepresentation, strength: number): Part {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color).multiplyScalar(strength) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); c.xy += position.xy * length(instanceMatrix[0].xyz); gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform vec3 color; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; float a = exp(-r * r * 9.0) + 0.25 * exp(-r * r * 2.0); gl_FragColor = vec4(color * a * (1.0 - smoothstep(0.8, 1.0, r)), 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return { geo, mat };
}

/** The gantry's two direction signs, white on motorway green, a place ahead (fictional) and how far: drawn once
 *  into the bands the model's uvs give them (rows 256-512 the left panel, 0-256 the right, each upside down). */
export function signFace() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  for (const [top, name, km, lean] of [[256, "Ashford Vale", "51", -0.5], [0, "Northgate", "24", 0]] as const) {
    g.save();
    g.translate(0, top + 256); g.scale(1, -1);
    g.fillStyle = "#0f5a34"; g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = "#f2f4f0"; g.lineWidth = 12; g.strokeRect(16, 16, 992, 224);
    g.fillStyle = "#f2f4f0";
    // the arrow, up or bearing off
    g.save(); g.translate(95, 128); g.rotate(lean);
    g.beginPath(); g.moveTo(0, -80); g.lineTo(52, -14); g.lineTo(18, -14); g.lineTo(18, 80); g.lineTo(-18, 80); g.lineTo(-18, -14); g.lineTo(-52, -14); g.closePath(); g.fill();
    g.restore();
    g.font = "700 104px Overpass, sans-serif"; g.textBaseline = "middle";
    const w = g.measureText(name).width;
    if (w > 640) g.font = `700 ${Math.floor(104 * 640 / w)}px Overpass, sans-serif`;
    g.textAlign = "left"; g.fillText(name, 190, 136);
    g.textAlign = "right"; g.fillText(km, 975, 136);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = false;
  return t;
}

// ---------------------------------------------------------------- what a place's land is made of (lands.ts)

/** A canvas as a repeating texture. */
function canvasTex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function canvas(w: number, h: number, seed: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return { c, g: c.getContext("2d")!, r };
}

/** Quads (four corners each, in order round the face) with their uvs and one normal each, as a geometry. */
function quads(list: { p: number[][]; uv: number[][]; n: number[] }[]) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const q of list) {
    const b = pos.length / 3;
    for (let i = 0; i < 4; i++) { pos.push(...q.p[i]); uv.push(...q.uv[i]); nor.push(...q.n); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** A row of vines 12 m along x, trained on wires: a tent of three leafy cards 1.5 m tall (it reads from the road
 *  and from above), the stocks showing under the leaves. */
export function vineRow(): Part {
  const L = 6, H = 1.55, w = 0.42, lo = 0.25, t = 1.6; // half length; the leaves' half width at the foot; uv metres
  const n = Math.SQRT1_2;
  const geo = quads([
    { p: [[-L, lo, w], [L, lo, w], [L, H, w * 0.45], [-L, H, w * 0.45]], uv: [[-L / t, 0], [L / t, 0], [L / t, 0.8], [-L / t, 0.8]], n: [0, n, n] },
    { p: [[L, lo, -w], [-L, lo, -w], [-L, H, -w * 0.45], [L, H, -w * 0.45]], uv: [[L / t, 0], [-L / t, 0], [-L / t, 0.8], [L / t, 0.8]], n: [0, n, -n] },
    { p: [[-L, H, w * 0.45], [L, H, w * 0.45], [L, H + 0.05, -w * 0.45], [-L, H + 0.05, -w * 0.45]], uv: [[-L / t, 0.8], [L / t, 0.8], [L / t, 1], [-L / t, 1]], n: [0, 1, 0] },
  ]);
  const { c, g, r } = canvas(256, 128, 11);
  // the stocks, then leaves thick at the top, thinning to the foot
  for (let x = 8; x < 256; x += 40 + r() * 8) { g.fillStyle = "#4a3a2a"; g.fillRect(x, 70, 5, 58); }
  for (let i = 0; i < 1400; i++) {
    const y = Math.pow(r(), 0.55) * 128, x = r() * 256;
    if (128 - y > 95 && r() < 0.6) continue;
    const l = 0.55 + r() * 0.5, yel = r() < 0.15;
    g.fillStyle = yel ? `rgb(${150 * l | 0},${150 * l | 0},${55 * l | 0})` : `rgb(${(70 + r() * 40) * l | 0},${(105 + r() * 40) * l | 0},${(30 + r() * 20) * l | 0})`;
    g.beginPath(); g.ellipse(x, 128 - y, 4 + r() * 5, 3 + r() * 4, r() * 3, 0, 6.3); g.fill();
  }
  // grapes, dark, low in the leaves
  for (let i = 0; i < 40; i++) { g.fillStyle = "#2c1a33"; g.beginPath(); g.arc(r() * 256, 70 + r() * 25, 2.5, 0, 6.3); g.fill(); }
  const mat = new THREE.MeshStandardMaterial({ map: canvasTex(c), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
  mat.alphaToCoverage = true;
  return { geo, mat };
}

/** A dry-stone wall `2L` m along z (6 m by default), a metre high, battered in toward its cope of upright stones. */
export function stoneWall(L = 3): Part {
  const b = 0.34, tp = 0.2, H = 1.0, t = 1.2;
  const geo = quads([
    { p: [[b, 0, -L], [b, 0, L], [tp, H, L], [tp, H, -L]], uv: [[-L / t, 0], [L / t, 0], [L / t, H / t], [-L / t, H / t]], n: [0.98, 0.14, 0] },
    { p: [[-b, 0, L], [-b, 0, -L], [-tp, H, -L], [-tp, H, L]], uv: [[L / t, 0], [-L / t, 0], [-L / t, H / t], [L / t, H / t]], n: [-0.98, 0.14, 0] },
    { p: [[tp, H, -L], [tp, H, L], [-tp, H + 0.12, L], [-tp, H + 0.12, -L]], uv: [[-L / t, 0.9], [L / t, 0.9], [L / t, 1.1], [-L / t, 1.1]], n: [0, 1, 0] },
  ]);
  const { c, g, r } = canvas(256, 256, 5);
  g.fillStyle = "#2a2a27"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 18 + r() * 10) for (let x = -20; x < 256; x += 22 + r() * 26) {
    const l = 0.55 + r() * 0.45, w = 18 + r() * 24, h = 12 + r() * 9;
    g.fillStyle = `rgb(${135 * l | 0},${134 * l | 0},${124 * l | 0})`;
    g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, (r() - 0.5) * 0.3, 0, 6.3); g.fill();
    if (r() < 0.35) { g.fillStyle = `rgba(${150 + r() * 40 | 0},${150 + r() * 30 | 0},90,0.35)`; g.beginPath(); g.arc(x + r() * w, y + r() * h, 3 + r() * 5, 0, 6.3); g.fill(); } // lichen
  }
  return { geo, mat: new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 0.95 }) };
}

/** A round bale of straw, lying on its side. */
export function bale(): Part {
  const geo = new THREE.CylinderGeometry(0.75, 0.75, 1.25, 14, 1).rotateZ(Math.PI / 2).translate(0, 0.72, 0);
  const { c, g, r } = canvas(128, 64, 9);
  g.fillStyle = "#b8974e"; g.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 260; i++) { g.strokeStyle = r() < 0.5 ? "rgba(90,70,30,.35)" : "rgba(235,210,140,.35)"; g.beginPath(); const y = r() * 64, x = r() * 128; g.moveTo(x, y); g.lineTo(x + 6 + r() * 14, y + (r() - 0.5) * 3); g.stroke(); }
  return { geo, mat: new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 1 }) };
}

/** A sheep, in boxes: a woolly body, a dark face and legs. */
export function sheep(): Part[] {
  const wool = boxes([[-0.42, 0.42, 0.42, 1.05, -0.62, 0.62], [-0.36, 0.36, 0.95, 1.12, -0.5, 0.5]], 1, 0.7);
  const dark = boxes([[-0.15, 0.15, 0.7, 1.05, 0.6, 0.98], [-0.32, -0.18, 0, 0.45, 0.35, 0.5], [0.18, 0.32, 0, 0.45, 0.35, 0.5], [-0.32, -0.18, 0, 0.45, -0.5, -0.35], [0.18, 0.32, 0, 0.45, -0.5, -0.35]], 1, 0.7);
  return [{ geo: wool, mat: new THREE.MeshStandardMaterial({ color: 0xe6e2d6, roughness: 1, vertexColors: true }) }, { geo: dark, mat: new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.9, vertexColors: true }) }];
}

/** A crag: a low-poly rock (a lumpy icosahedron), for tors on a hill and rocks in the dry grass, many of them for little. */
export function crag(mat: THREE.MeshStandardMaterial, seed: number): Part {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const n = (x: number, y: number, z: number) => Math.sin(x * 3.1 + seed) * Math.sin(y * 2.7 + seed * 2) * Math.sin(z * 3.7 - seed) * 0.5 + Math.sin(x * 7.3 + z * 5.1 + seed) * 0.12;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + n(x, y, z) * 0.55;
    p.setXYZ(i, x * k * 1.3, Math.max(-0.3, y * k * 0.75) + 0.3, z * k);
  }
  geo.computeVertexNormals();
  return { geo, mat };
}

/** A building's two looks, by day and lit at night: a facade of `bays` x `floors` windows (3.2 m each) in a
 *  repeat of 8 x 8, its windows lit at random (each building turned to a different part of it). */
function facade(wall: string, glass: string, frame: number, seed: number) {
  const { c, g, r } = canvas(512, 512, seed), lit = canvas(512, 512, seed + 1);
  g.fillStyle = wall; g.fillRect(0, 0, 512, 512);
  lit.g.fillStyle = "#000"; lit.g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const x0 = x * 64 + frame, y0 = y * 64 + frame * 1.4, w = 64 - frame * 2, h = 64 - frame * 2.4;
    const sky = g.createLinearGradient(0, y0, 0, y0 + h);
    sky.addColorStop(0, glass); sky.addColorStop(1, "#151a20");
    g.fillStyle = sky; g.fillRect(x0, y0, w, h);
    const k = r();
    if (k < 0.5) {
      const warm = r() < 0.8, l = 0.5 + r() * 0.5;
      lit.g.fillStyle = warm ? `rgb(${255 * l | 0},${190 * l | 0},${110 * l | 0})` : `rgb(${180 * l | 0},${210 * l | 0},${255 * l | 0})`;
      lit.g.fillRect(x0, y0, w, h);
      if (r() < 0.4) { lit.g.fillStyle = "rgba(0,0,0,.55)"; lit.g.fillRect(x0 + w * r() * 0.6, y0, w * 0.35, h); } // a curtain
    }
  }
  return { map: canvasTex(c), lit: canvasTex(lit.c) };
}

/** A building w x d x h metres (standing on y 0, centred): its walls in a facade, a flat roof with a plant room. */
export function building(w: number, d: number, h: number, look: { wall: string; glass: string; frame: number; seed: number; roof: number }, night: boolean): Part[] {
  const F = 3.2 * 8, X = w / 2, Z = d / 2;
  const walls = quads([
    { p: [[-X, 0, Z], [X, 0, Z], [X, h, Z], [-X, h, Z]], uv: [[0, 0], [w / F, 0], [w / F, h / F], [0, h / F]], n: [0, 0, 1] },
    { p: [[X, 0, -Z], [-X, 0, -Z], [-X, h, -Z], [X, h, -Z]], uv: [[0, 0], [w / F, 0], [w / F, h / F], [0, h / F]], n: [0, 0, -1] },
    { p: [[X, 0, Z], [X, 0, -Z], [X, h, -Z], [X, h, Z]], uv: [[0, 0], [d / F, 0], [d / F, h / F], [0, h / F]], n: [1, 0, 0] },
    { p: [[-X, 0, -Z], [-X, 0, Z], [-X, h, Z], [-X, h, -Z]], uv: [[0, 0], [d / F, 0], [d / F, h / F], [0, h / F]], n: [-1, 0, 0] },
  ]);
  const { map, lit } = facade(look.wall, look.glass, look.frame, look.seed);
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.6, metalness: 0.1, emissive: 0xffffff, emissiveMap: lit, emissiveIntensity: night ? 2.2 : 0 });
  // each building shows a different stretch of the repeat, whole windows over
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
      #ifdef USE_INSTANCING
      vec2 bOff = floor(fract(sin(instanceMatrix[3].xz * vec2(0.173, 0.291)) * 4375.85) * 8.0) / 8.0;
      vMapUv += bOff;
      #ifdef USE_EMISSIVEMAP
      vEmissiveMapUv += bOff;
      #endif
      #endif`);
  };
  mat.customProgramCacheKey = () => "building";
  const roof = boxes([[-X, X, h - 0.2, h + 0.6, -Z, -Z + 0.3], [-X, X, h - 0.2, h + 0.6, Z - 0.3, Z], [-X, -X + 0.3, h - 0.2, h + 0.6, -Z, Z], [X - 0.3, X, h - 0.2, h + 0.6, -Z, Z], [-X, X, h - 0.3, h - 0.1, -Z, Z],
    [-X * 0.4, X * 0.2, h, h + 2.6, -Z * 0.4, Z * 0.3]], 3, 0.6);
  const top = new THREE.MeshStandardMaterial({ color: look.roof, roughness: 0.9, vertexColors: true });
  return [{ geo: walls, mat }, { geo: roof, mat: top }];
}

/** A storage tank, white, with a ladder's shadow down its side. */
export function tank(): Part {
  const geo = new THREE.CylinderGeometry(6, 6, 9, 22).translate(0, 4.5, 0);
  const cap = new THREE.ConeGeometry(6.05, 1.4, 22).translate(0, 9.7, 0);
  return { geo: mergeTwo(geo, cap), mat: new THREE.MeshStandardMaterial({ color: 0xd9dbd8, roughness: 0.55, metalness: 0.2 }) };
}

/** A factory chimney, 42 m, in red and white bands near the top. */
export function chimney(): Part {
  const geo = new THREE.CylinderGeometry(1.1, 1.9, 42, 14, 1, true).translate(0, 21, 0);
  const { c, g } = canvas(16, 128, 3);
  g.fillStyle = "#9c968c"; g.fillRect(0, 0, 16, 128);
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "#e9e6e0" : "#b8352b"; g.fillRect(0, i * 8, 16, 8); }
  const t = canvasTex(c); t.wrapT = THREE.ClampToEdgeWrapping;
  return { geo, mat: new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }) };
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const ai = a.index!.array, bi = b.index!.array, n = a.attributes.position.count, out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const x = a.attributes[k].array as Float32Array, y = b.attributes[k].array as Float32Array, m = new Float32Array(x.length + y.length);
    m.set(x); m.set(y, x.length);
    out.setAttribute(k, new THREE.BufferAttribute(m, a.attributes[k].itemSize));
  }
  out.setIndex([...ai, ...[...bi].map((i) => i + n)]);
  return out;
}
