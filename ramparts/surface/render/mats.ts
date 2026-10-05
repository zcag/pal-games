// Shared materials. Everything is vertex-coloured MeshStandardMaterial patched in onBeforeCompile:
// wrapped diffuse (soft shadow sides), emissive per vertex (aEmit), cloud shadows, fog only below the
// slab's rim (art 6.3: the playable top is never fogged), and for units a vertex-shader animation by
// part id, a fresnel rim, hit flash, status tints and a stealth dither. Outlines are inverted hulls.
import * as THREE from "../vendor/three.js";

/** Uniforms shared by every material (one object, so one write updates all programs). */
export const U = {
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector2(0.8, 0.35) },
  uCloud: { value: 0.1 },
  uCloudOff: { value: new THREE.Vector2() },
  uFogCol: { value: new THREE.Color("#E6DCC0") },
  uFogTop: { value: -2.2 },
  uFogBot: { value: -15 },
  uFogMax: { value: 0.92 },
  uRimCol: { value: new THREE.Color("#FFF1DA") },
  uRimStr: { value: 0.25 },
  uRes: { value: new THREE.Vector2(720, 390) },
  uOutline: { value: 1.3 },
  uWrap: { value: 0.3 },
  uSway: { value: 1 },
};

const physPars = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
  "float dotNL = saturate( dot( geometryNormal, directLight.direction ) );",
  "float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + uWrap ) / ( 1.0 + uWrap ) );",
);
if (physPars === THREE.ShaderChunk.lights_physical_pars_fragment) console.warn("ramparts: wrap lighting patch did not apply");

const NOISE = /* glsl */ `
float rpHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rpNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(rpHash(i), rpHash(i + vec2(1, 0)), f.x), mix(rpHash(i + vec2(0, 1)), rpHash(i + vec2(1, 1)), f.x), f.y);
}
float rpFbm(vec2 p) { return rpNoise(p) * 0.55 + rpNoise(p * 2.03 + 7.1) * 0.3 + rpNoise(p * 4.1 + 3.3) * 0.15; }
`;

/** Vertex animation for units, by part id (aPart.x) around a pivot (aPart.yzw). Model faces +Z.
 *  Parts: 0 body, 1/2 legs L/R, 3/4 arms L/R, 5 head, 6/7 wings L/R, 8 tail/scarf/hem, 9 orbit, 10 weapon arm (pose), 11 static (no bob).
 *  uMotion: x bob (u), y swing (rad), z style (0 walk, 1 glide, 2 hop, 3 flap, 4 float, 5 crawl), w part-wide sway. */
const ANIM = /* glsl */ `
attribute vec4 aPart;
attribute vec4 iA; // phase, -, flash, chill
attribute vec4 iB; // alpha, hex, burn, pose
uniform vec4 uMotion;
vec3 rpRotX(vec3 p, float a) { float s = sin(a), c = cos(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 rpRotY(vec3 p, float a) { float s = sin(a), c = cos(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 rpRotZ(vec3 p, float a) { float s = sin(a), c = cos(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }
void rpAnim(inout vec3 p, inout vec3 n) {
  float ph = iA.x; int id = int(aPart.x + 0.5); vec3 pv = aPart.yzw;
  float s = sin(ph), st = uMotion.z;
  if (id == 1 || id == 2) { float a = (id == 1 ? s : -s) * uMotion.y; p = pv + rpRotX(p - pv, a); n = rpRotX(n, a); }
  else if (id == 3 || id == 4) { float a = (id == 3 ? -s : s) * uMotion.y * 0.7; p = pv + rpRotX(p - pv, a); n = rpRotX(n, a); }
  else if (id == 5) { float a = sin(ph * 2.0) * 0.06; p = pv + rpRotX(p - pv, a); n = rpRotX(n, a); }
  else if (id == 6 || id == 7) { float a = (id == 6 ? 1.0 : -1.0) * (s * uMotion.y + 0.1); p = pv + rpRotZ(p - pv, a); n = rpRotZ(n, a); }
  else if (id == 8) { float a = sin(ph * 1.3 + (p.z - pv.z) * 3.0) * 0.35 * uMotion.w; p = pv + rpRotY(p - pv, a); n = rpRotY(n, a); }
  else if (id == 9) { float a = ph * 0.25; p = pv + rpRotY(p - pv, a); n = rpRotY(n, a); p.y += sin(ph * 0.5) * 0.04; }
  else if (id == 10) { float a = -iB.w * 2.3 + sin(ph) * uMotion.y * 0.4; p = pv + rpRotX(p - pv, a); n = rpRotX(n, a); }
  if (id != 11) {
    if (st < 0.5) p.y += abs(s) * uMotion.x;
    else if (st < 1.5) { p.x += sin(ph * 0.5) * uMotion.x * (p.y); }
    else if (st < 2.5) { float k = s * 0.14; p.y = p.y * (1.0 + k) + max(0.0, s) * uMotion.x; p.xz *= 1.0 - k * 0.5; }
    else if (st < 3.5) { p.y += sin(ph + 1.2) * uMotion.x; }
    else if (st < 4.5) { p.y += sin(ph * 0.5) * uMotion.x; }
    else { p.y += abs(s) * uMotion.x * 0.5; p.x += sin(ph) * 0.03; }
  }
}
`;

const BAYER = /* glsl */ `
float rpBayer(vec2 f) {
  ivec2 q = ivec2(mod(f, 4.0));
  int i = q.x + q.y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
`;

export type Kind = "world" | "top" | "foliage" | "unit" | "tower" | "cliff";

interface Opts {
  kind: Kind; rough?: number; metal?: number; side?: THREE.Side; transparent?: boolean; fog?: boolean; cloud?: boolean; extra?: Record<string, THREE.IUniform>;
  /** GLSL hooks: declarations for the fragment, code after the vertex colour is applied (edit diffuseColor; vWorld is the world position), and a cache key. */
  fragHead?: string; fragColor?: string; key?: string;
  /** Vertex hooks: declarations, and code after begin_vertex (edit `transformed`). */
  vertHead?: string; vertBegin?: string;
}

/** The standard lit material for a kind. `extra` uniforms are per-material (towers: tint, flash). */
export function lit(o: Opts): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.92, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide, transparent: o.transparent ?? false });
  const unit = o.kind === "unit", foliage = o.kind === "foliage", fog = o.fog ?? (o.kind === "cliff" || o.kind === "world"), cloud = o.cloud ?? o.kind !== "unit";
  const extra = o.extra ?? {};
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, extra);
    let vs = sh.vertexShader, fs = sh.fragmentShader;
    vs = vs.replace("#include <common>", `#include <common>
attribute float aEmit; varying float vEmit; varying vec3 vWorld;
uniform float uTime; uniform vec2 uWind; uniform float uSway;
${unit ? ANIM + "varying vec4 vIA; varying vec4 vIB;" : ""}
${o.vertHead ?? ""}`);
    if (o.vertBegin) vs = vs.replace("#include <begin_vertex>", `#include <begin_vertex>\n${o.vertBegin}`);
    if (unit) {
      vs = vs.replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
{ vec3 pp = position; rpAnim(pp, objectNormal); }`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
{ vec3 nn = normal; rpAnim(transformed, nn); } vIA = iA; vIB = iB;`);
    }
    if (foliage) {
      vs = vs.replace("#include <begin_vertex>", `#include <begin_vertex>
{
  vec3 base = vec3(0.0);
  #ifdef USE_INSTANCING
  base = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #endif
  float h = abs(transformed.y);
  float ph = uTime * 6.2832 / 2.6 + dot(base.xz, vec2(0.37, 0.21));
  float k = h * h * 0.03 * uSway * (0.7 + 0.3 * sin(ph * 0.37));
  transformed.xz += uWind * (sin(ph) * 0.8 + 0.4) * k;
}`);
    }
    vs = vs.replace("#include <project_vertex>", `#include <project_vertex>
vEmit = aEmit;
{ vec4 wp4 = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wp4 = instanceMatrix * wp4;
#endif
  vWorld = (modelMatrix * wp4).xyz; }`);
    fs = fs.replace("#include <common>", `#include <common>
varying float vEmit; varying vec3 vWorld;
uniform float uTime, uCloud, uFogTop, uFogBot, uFogMax, uRimStr, uWrap; uniform vec2 uCloudOff; uniform vec3 uFogCol, uRimCol;
${Object.keys(extra).filter((k) => !(o.fragHead ?? "").includes(k)).map((k) => `uniform ${glslType(extra[k]!.value)} ${k};`).join("\n")}
${NOISE}${BAYER}
${unit ? "varying vec4 vIA; varying vec4 vIB;" : ""}
${o.fragHead ?? ""}`)
      .replace("#include <lights_physical_pars_fragment>", physPars);
    if (o.fragColor) fs = fs.replace("#include <color_fragment>", `#include <color_fragment>\n${o.fragColor}`);
    if (unit) {
      fs = fs.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
if (vIB.x < 0.99 && rpBayer(gl_FragCoord.xy) > vIB.x) discard;`)
        .replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.27, 0.65, 1.0), vIA.w * 0.35);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.14, 0.075, 0.2), vIB.y * 0.2);
diffuseColor.rgb *= 1.0 - vIB.z * 0.15;`);
    }
    if (o.kind === "tower") {
      fs = fs.replace("#include <color_fragment>", `#include <color_fragment>
{ float g = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(g) * 0.85, uGrey); }`);
    }
    fs = fs.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * vEmit${o.kind === "tower" ? " * (1.0 - uGrey * 0.8)" : ""};
${unit ? "totalEmissiveRadiance += vec3(vIA.z * 0.8);" : ""}
${o.kind === "tower" ? "totalEmissiveRadiance += uFlash;" : ""}
${(o.fragHead ?? "").includes("rpGlow") ? "totalEmissiveRadiance += rpGlow;" : ""}`)
      .replace("#include <opaque_fragment>", `
${cloud ? "outgoingLight *= 1.0 - uCloud * smoothstep(0.42, 0.78, rpFbm(vWorld.xz * 0.055 + uCloudOff));" : ""}
${unit ? "{ float fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0); outgoingLight += uRimCol * fr * uRimStr; }" : ""}
${fog ? "outgoingLight = mix(outgoingLight, uFogCol, (1.0 - smoothstep(uFogBot, uFogTop, vWorld.y)) * uFogMax);" : ""}
if (any(isnan(outgoingLight))) outgoingLight = vec3(0.0);
outgoingLight = min(outgoingLight, vec3(1.2) + totalEmissiveRadiance);
#include <opaque_fragment>`);
    sh.vertexShader = vs; sh.fragmentShader = fs;
  };
  m.customProgramCacheKey = () => `rp-${o.kind}-${fog}-${cloud}-${Object.keys(extra).join(",")}-${o.key ?? ""}`;
  return m;
}

function glslType(v: unknown) {
  if (typeof v === "number") return "float";
  if ((v as THREE.Color).isColor) return "vec3";
  if ((v as THREE.Vector2).isVector2) return "vec2";
  if ((v as THREE.Vector3).isVector3) return "vec3";
  return "vec4";
}

/** Inverted-hull outline for units: back faces pushed out along the hull normal, screen-constant width. */
export function outlineMaterial(motion: THREE.IUniform, color = "#1C1512", widthScale = 1, alphaFloor = 0.4): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { uOW: { value: widthScale }, uMotion: motion });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
attribute vec3 aHull; uniform vec2 uRes; uniform float uOutline, uOW; varying float vAlpha;
${ANIM}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vec3 hn = aHull; rpAnim(transformed, hn); vAlpha = iB.x;`)
      .replace("#include <project_vertex>", `#include <project_vertex>
{
  vec3 wn = hn;
  #ifdef USE_INSTANCING
  wn = mat3(instanceMatrix) * wn;
  #endif
  vec3 vn = normalize(mat3(modelViewMatrix) * wn);
  vec4 cn = projectionMatrix * vec4(vn, 0.0);
  vec2 d = cn.xy; float l = length(d); d = l > 1e-5 ? d / l : vec2(0.0);
  gl_Position.xy += d * uOutline * uOW * 2.0 / uRes * gl_Position.w;
  gl_Position.z += 0.0004 * gl_Position.w;
}`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying float vAlpha; ${BAYER}`).replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
{ float a = vAlpha < 0.99 ? max(vAlpha, ${alphaFloor.toFixed(2)}) : 1.0; if (a < 0.99 && rpBayer(gl_FragCoord.xy) > a) discard; }`);
  };
  m.customProgramCacheKey = () => `rp-outline-${color}-${widthScale}-${alphaFloor}`;
  return m;
}

/** Shadow depth for animated units. */
export function unitDepthMaterial(motion: THREE.IUniform): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMotion = motion;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${ANIM}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n{ vec3 nn = vec3(0.0, 1.0, 0.0); rpAnim(transformed, nn); }`);
  };
  m.customProgramCacheKey = () => "rp-unit-depth";
  return m;
}

/** Shadow depth for wind-swayed foliage (keeps shadows in step with the crowns). */
export function foliageDepthMaterial(): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime; uniform vec2 uWind; uniform float uSway;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
{ vec3 base = vec3(0.0);
  #ifdef USE_INSTANCING
  base = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #endif
  float h = abs(transformed.y); float ph = uTime * 6.2832 / 2.6 + dot(base.xz, vec2(0.37, 0.21));
  transformed.xz += uWind * (sin(ph) * 0.8 + 0.4) * h * h * 0.03 * uSway; }`);
  };
  m.customProgramCacheKey = () => "rp-foliage-depth";
  return m;
}

/** Unlit vertex-coloured material for the backdrop (silhouettes, clouds); fades to fog by vertex alpha. */
export function backdropMaterial(transparent = false): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent, depthWrite: !transparent, fog: false });
  return m;
}

/** Cloth that waves (banners, pennants): hangs from local x = 0 along +x; phase from the object's position. */
export function flagMaterial(): THREE.MeshStandardMaterial {
  return lit({
    kind: "world", side: THREE.DoubleSide, fog: false, key: "flag",
    vertBegin: `{ float ph = dot(modelMatrix[3].xz, vec2(1.3, 0.7)) * 3.0;
      float k = clamp(transformed.x, 0.0, 2.0);
      transformed.z += sin(transformed.x * 6.0 - uTime * 7.0 + ph) * 0.07 * k + sin(uTime * 2.3 + ph) * 0.05 * k;
      transformed.y += sin(transformed.x * 4.0 - uTime * 5.0 + ph) * 0.02 * k; }`,
  });
}
