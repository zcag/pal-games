// Pass 2 (art.md 2.2): one fullscreen triangle writes the G-buffer for every tile on screen:
// back walls, solid rock with its bevel lip, undiggable plates, ores and finds from the stamp atlas,
// hazards' tells and dashed rims, the crack overlay, the too-hard hatch, scanner outlines, lava,
// the Lift column, grass on the surface and back-wall decor.
//
// G0 = albedo (sRGB) + layer/8 · G1 = emissive (sRGB) + HDR/8 · G2 = normal xy, flags/255, ao.
import { DETAIL } from "./look.ts";
import { HEAD, LIB } from "./glsl.ts";

/** G2 flag bits read by the resolve (index.ts mirrors them). */
export const GF = { GLINT: 1, NEEDLIT: 2, DARKONLY: 4, UNLIT: 8, SELFLIT: 16, TRANSLUCENT: 32 } as const;

const D = Object.entries(DETAIL).map(([k, v]) => `const int D_${k} = ${v};`).join("\n");

export const TERRAIN_FS = HEAD + LIB + D + `
layout(location = 0) out vec4 g0;
layout(location = 1) out vec4 g1;
layout(location = 2) out vec4 g2;
uniform usampler2D tA, tB, stampT;
uniform sampler2D matT, findT;
uniform ivec2 org;
uniform int artH;
uniform float time, beat;
uniform ivec3 dig;           // x, y, dir (0 left, 1 right, 2 down); y < -100 = none
uniform float digP;
uniform vec2 pod;
uniform int drillB;          // log-encoded drill power x 2.5 (content.ts hardness byte scale)
uniform int liftX, liftDepth;
uniform int typical[10];
uniform vec4 scan;           // x, y, radius (tiles), age (s); age < 0 = none
uniform vec4 tells[8];       // x, y, k 0..1, kind (1 fuse, 2 spore charge, 3 arc charge, 4 arc fire, 5 false floor)
uniform vec4 tells2[8];      // second point (arcs)
uniform int nTells;
uniform vec2 camC;          // view centre, world art px (parallax)
uniform vec2 seedW;         // the Seed, world art px
uniform vec4 kiln;          // the Kiln's rect in tiles (x, y, w, h); w = 0 when none near
uniform int planet; 
uniform vec2 rockGrade[10];  // per biome: saturation, value of plain diggable rock (review 2 #3, #8, #9)
         // 0 Vell, 1 Cinder (slot 3 is the Ash hollows), 2 Ferrum (slot 2 is the Banded deeps)
uniform int segEnd[7];
uniform vec3 segCol[7];

const int GLINT = 1, NEEDLIT = 2, DARKONLY = 4, UNLIT = 8, SELFLIT = 16, TRANSL = 32;
const uint F_LIFT = 32u, F_SCANNED = 4u, F_STRUCT = 16u;

uvec4 TA(ivec2 t){ if (t.y < -SKYR) return uvec4(0u); return texelFetch(tA, ivec2(clamp(t.x, 0, WC - 1), min(t.y, HR - 1) + SKYR), 0); }
uvec4 TB(ivec2 t){ if (t.y < -SKYR) return uvec4(0u); return texelFetch(tB, ivec2(clamp(t.x, 0, WC - 1), min(t.y, HR - 1) + SKYR), 0); }
vec4 MT(int row, uint id){ return texelFetch(matT, ivec2(int(id), row), 0); }
vec4 FT(int row, uint id){ return texelFetch(findT, ivec2(int(id), row), 0); }
int B8(float v){ return int(v * 255.0 + 0.5); }
int KIND(uint id){ return id == 0u ? 0 : B8(MT(6, id).g); }
bool LIFT(ivec2 t){ return t.y >= 0 && ((TB(t).r & F_LIFT) != 0u || (t.x == liftX && t.y < liftDepth)); }
bool SOLID(ivec2 t){ if (t.x < 0 || t.x >= WC) return true; int k = KIND(TA(t).r); return k == 1 || k == 2; }
vec3 PAL(uint m, int i){ return MT(clamp(i, 0, 3), m).rgb; }

// Output accumulators.
vec3 alb; float layer; vec3 emi; float emiK; vec2 nrm; int flags; float ao;
void setEmi(vec3 c, float k){ if (k > emiK) { emi = c; emiK = k; } }

// ---------------------------------------------------------------- shapes
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
/** Voronoi on a jittered grid: x = F1, y = F2, z = cell hash. */
vec3 voro(vec2 p, float cell, int s){
  vec2 g = floor(p / cell); float f1 = 1e9, f2 = 1e9, id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    ivec2 c = ivec2(g) + ivec2(i, j) + ivec2(4096);
    vec2 pt = (vec2(c - ivec2(4096)) + vec2(h2(c, s), h2(c, s + 1)) * 0.8 + 0.1) * cell;
    float d = length(p - pt);
    if (d < f1) { f2 = f1; f1 = d; id = h2(c, s + 2); } else if (d < f2) f2 = d;
  }
  return vec3(f1, f2, id);
}
/** A 1 px wandering thread: true on the line. */
/** Branching veins: some edges of a jittered Voronoi net, gated by low-frequency noise. */
bool veins(ivec2 q, float cell, float gate, int s){
  vec2 p = vec2(q) + vec2(vnoise(vec2(q) * 0.15, s + 3), vnoise(vec2(q) * 0.15 + 9.0, s + 3)) * 3.0;
  vec3 v = voro(p, cell, s);
  if (v.y - v.x > 1.0) return false;
  return vnoise(vec2(q) * (1.4 / cell), s + 7) > gate;
}

// ---------------------------------------------------------------- material detail (art.md 3.1)
// idx: palette band 0..3 (dark, base, base2, light); col overrides when set (alpha 1).
void detail(int det, uint m, ivec2 q, ivec2 lp, ivec2 t, inout int idx, inout vec4 col, bool dense){
  vec4 a1 = MT(4, m), a2 = MT(5, m);
  float e1 = a1.a * 4.0, e2 = a2.a * 4.0;
  float hp = h2(q, 31);
  if (det == D_PEBBLES) {
    ivec2 c = q >> 1;
    if (h2(c, 7) > 0.985) col = vec4(((q.x & 1) == 0 && (q.y & 1) == 0) ? a1.rgb * 1.15 : a1.rgb, 1.0);
    ivec2 rc = ivec2(q.x, (q.y + (q.x * 3 & 7)) >> 2);
    if (h2(rc, 11) > 0.993) col = vec4(a2.rgb * 0.85, 1.0);
  } else if (det == D_STREAKS) {
    int off = int(vnoise(vec2(float(q.x) * 0.05, float(q.y >> 3)), 3) * 6.0);
    if ((q.y + off) % 5 == 0 && vnoise(vec2(q) * vec2(0.12, 1.0), 5) > 0.35) idx = max(idx - 1, 0);
    if (dense && h2(q, 9) > 0.97) col = vec4(a1.rgb, 1.0);
  } else if (det == D_GRAVEL) {
    ivec2 c = q / 3, l = q - c * 3;
    float hc = h2(c, 13);
    if (hc > 0.8 && l.x < 2 && l.y < 2) idx = l.y == 0 ? 3 : (hc > 0.9 ? 2 : 1);
    else if (hc > 0.8 && l.y == 2 && l.x < 2) idx = 0;
  } else if (det == D_GRAIN) {
    if (hp > 0.82) idx = min(idx + 1, 3); else if (hp < 0.12) idx = max(idx - 1, 0);
    if (e1 > 0.0 && h2(q, 77) > 0.99) col = vec4(a1.rgb, 1.0);
  } else if (det == D_LAYERS) {
    int off = int(fbm3(vec2(float(q.x) * 0.03, float(q.y) * 0.02), 5) * 14.0);
    int per = 5 + int(vnoise(vec2(float(q.y) * 0.08, 1.0), 6) * 3.0);
    int k = (q.y + off) % per;
    bool run = vnoise(vec2(float(q.x) * 0.09, float(q.y + off)), 8) > 0.35;
    if (k == 0 && run) idx = max(idx - 1, 0); else if (k == 1 && run && idx < 3) idx += 1;
    if (a1.a == 0.0 && a1.r > 0.9 && k == 1) col = vec4(mix(PAL(m, idx), a1.rgb, 0.35), 1.0);
  } else if (det == D_PITS) {
    ivec2 c = q >> 1;
    if (h2(c, 17) > 0.955) idx = 0;
    if (e1 > 0.0 && h2(q, 78) > 0.992) col = vec4(a1.rgb, 1.0);
  } else if (det == D_SPECKLE) {
    if (hp > 0.94) col = vec4(a1.rgb, 1.0); else if (hp < 0.06) col = vec4(a2.rgb, 1.0);
  } else if (det == D_PLANKS) {
    int row = q.y >> 2, ly = q.y & 3;
    int jx = (q.x + row * 7 + int(h2(ivec2(row, 0), 19) * 16.0)) & 15;
    idx = ly == 3 || jx == 0 ? 0 : (h2(ivec2(row, q.x >> 3), 23) > 0.5 ? 2 : 1);
    if (ly == 0 && jx != 0) idx = min(idx + 1, 3);
    if (jx == 2 && ly == 1) col = vec4(a1.rgb, 1.0);
  } else if (det == D_CHUNKS) {
    vec3 v = voro(vec2(q), 3.5, 41);
    idx = v.y - v.x < 0.9 ? 0 : (v.z > 0.66 ? 3 : v.z > 0.3 ? 2 : 1);
    if (idx != 0 && v.y - v.x < 1.6 && hp > 0.5) idx = 1;
  } else if (det == D_FLECKS) {
    if (hp > 0.993) col = vec4(mix(PAL(m, 3), a1.rgb, 0.5), 1.0);
  } else if (det == D_CELLS) {
    vec2 p = vec2(q) / 6.0, gi = floor(p);
    float f1 = 9.0, f2 = 9.0, idc = 0.0;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      ivec2 c = ivec2(gi) + ivec2(i, j) + 4096;
      vec2 pt = vec2(c - 4096) + vec2(h2(c, 29), h2(c, 30)) * 0.8 + 0.1;
      vec2 dd = abs(p - pt); float d = max(dd.x, dd.y * 1.3);
      if (d < f1) { f2 = f1; f1 = d; idc = h2(c, 31); } else if (d < f2) f2 = d;
    }
    bool seam = (f2 - f1) * 6.0 < 1.0;
    idx = seam ? 0 : (idc > 0.6 ? 2 : idc > 0.2 ? 1 : 3);
    if (!seam && (f2 - f1) * 6.0 < 2.0 && idc > 0.4) idx = min(idx + 1, 3);
  } else if (det == D_CRYSTAL) {
    // Crystal lining: long angular facets, the lit edge of each a bright line.
    vec3 v = voro(vec2(q) * vec2(1.0, 0.55) + vec2(float(q.y) * 0.35, 0.0), 6.0, 43);
    float edge = v.y - v.x;
    idx = v.z > 0.66 ? 2 : v.z > 0.25 ? 1 : 0;
    if (edge < 0.7) idx = v.z > 0.5 ? 3 : 0;
    if (edge < 0.7 && v.z > 0.85) setEmi(s2l(a1.rgb), e1 * 0.45);
    if (edge < 0.7 && h2(q >> 1, 44) > 0.8) { setEmi(vec3(1.0), 1.6 * (0.6 + 0.4 * sin(time * 2.0 + v.z * 30.0))); flags |= GLINT; }   // facets catch the lamp
    if (idx == 3 && edge >= 0.7) idx = 2;   // the rim one value step down, sparkle stays on edges
    col = vec4(PAL(m, idx) * 0.75, 1.0);   // review 3 #7: the pale lining a quarter down, so it never outshines the pod
  } else if (det == D_THREADS) {
    idx = idx > 1 ? 1 : idx;
    if (veins(q, 7.0, 0.45, 47)) col = vec4(a1.rgb, 1.0); else if (veins(q + ivec2(3, 5), 4.0, 0.7, 53)) col = vec4(mix(PAL(m, 1), a1.rgb, 0.5), 1.0);
  } else if (det == D_ROOTVEIN) {
    if (veins(q, 15.0, 0.64, 59)) col = vec4(mix(PAL(m, 2), a1.rgb, 0.7), 1.0);
  } else if (det == D_MOSS) {
    if (hp > 0.92) col = vec4(a1.rgb, 1.0);
  } else if (det == D_FIBRES) {
    float fx = vnoise(vec2(float(q.x) * 0.5, float(q.y) * 0.04), 61);
    idx = fx > 0.62 ? 3 : fx > 0.45 ? 2 : fx > 0.3 ? 1 : 0;
  } else if (det == D_PORES) {
    ivec2 c = q / 3, l = q - c * 3;
    if (h2(c, 67) > 0.9) { if (l.x < 2 && l.y < 2) idx = 0; else if (l.y == 2 && l.x < 2) idx = 3; }
  } else if (det == D_HEX) {
    // Columnar basalt seen end-on: a hex lattice, lit on the upper-left of each column, rare ember cracks.
    vec2 p = vec2(q) / 7.0;
    vec2 r = vec2(1.0, 1.7320508);
    vec2 a = mod(p, r) - r * 0.5, b = mod(p - r * 0.5, r) - r * 0.5;
    vec2 g = dot(a, a) < dot(b, b) ? a : b;
    vec2 id = p - g;
    float he = max(abs(g.x) * 0.866 + abs(g.y) * 0.5, abs(g.y));
    bool border = he > 0.44;
    float hc = h2(ivec2(floor(id * 4.0 + 100.0)), 71);
    idx = border ? 0 : (hc > 0.55 ? 2 : 1);
    if (!border && g.x + g.y < -0.3) idx = min(idx + 1, 3);
    if (veins(q, 30.0, 0.7, 75)) { col = vec4(0.36, 0.14, 0.07, 1.0); setEmi(vec3(0.7, 0.2, 0.06), 0.22 + 0.06 * sin(time * 0.9 + float(q.x) * 0.05)); }
  } else if (det == D_FACETS) {
    vec3 v = voro(vec2(q) * vec2(1.0, 0.7), 7.0, 79);
    idx = v.z > 0.6 ? 2 : v.z > 0.25 ? 1 : 0;
    if (v.y - v.x < 0.8) idx = v.z > 0.5 ? 3 : 0;
    if (v.y - v.x < 0.8 && v.z > 0.93) col = vec4(mix(PAL(m, 3), a1.rgb, 0.5), 1.0);
  } else if (det == D_CRACKNET) {
    vec3 v = voro(vec2(q), 5.0, 83);
    if (v.y - v.x < 0.7) { col = vec4(a1.rgb * 0.8, 1.0); setEmi(s2l(a1.rgb), e1 * (0.75 + 0.25 * sin(time * 2.0 + v.z * 9.0))); }
  } else if (det == D_BRICK) {
    int row = q.y >> 2, off = (row & 1) * 4;
    bool mortar = (q.y & 3) == 0 || ((q.x + off) & 7) == 0;
    ivec2 bc = ivec2((q.x + off) >> 3, row);
    float hb = h2(bc, 89);
    idx = mortar ? 0 : (hb > 0.6 ? 2 : 1);
    if (!mortar && (q.y & 3) == 1) idx = min(idx + 1, 3);
    if (!mortar && hb > 0.86 && ((q.x + off) & 7) == 4 && (q.y & 3) >= 2) idx = 0;
  } else if (det == D_INLAY) {
    if (q.y % 7 == 0) idx = 0; else if (q.y % 7 == 1) idx = min(idx + 1, 3);
    if (q.x % 11 == 0 && q.y % 7 > 2) idx = max(idx - 1, 0);
  } else if (det == D_SEAL) {
    vec2 d = vec2(lp) - 7.5; float r = length(d);
    if (r < 7.2) {
      idx = r > 5.6 ? 1 : (r < 2.2 ? 3 : 2);
      if (abs(r - 6.0) < 0.75) col = vec4(a1.rgb, 1.0);
      if (abs(r - 3.0) < 0.5) idx = 0;
      if (r < 1.5) col = vec4(a1.rgb * 0.8, 1.0);
    }
  } else if (det == D_SWIRL) {
    vec2 p = vec2(q) * 0.08; p += vec2(vnoise(p * 1.3, 97), vnoise(p * 1.3 + 7.0, 97)) * 2.2;
    float s = fract(p.x * 1.5 + p.y * 0.6);
    // Fleshy compressed bands, broad and quiet (review 3 #3: the contour noise cut).
    idx = s < 0.07 ? 0 : s < 0.62 ? 1 : 2;
  } else if (det == D_GLASS) {
    // Dark red glass: facets lit on their upper-left edge, an inner glow in some facets that beats.
    vec3 v = voro(vec2(q) * vec2(1.0, 1.3), 8.0, 101);
    idx = v.z > 0.7 ? 1 : 0;
    float edge = v.y - v.x;
    if (edge < 0.9) idx = v.z > 0.5 ? 3 : 2;
    float g = 0.3 + 0.6 * beat;

  } else if (det == D_GOLDVEIN) {
    if (veins(q, 16.0, 0.82, 103)) { col = vec4(mix(PAL(m, 2), a1.rgb, 0.6), 1.0); setEmi(s2l(a1.rgb), e1 * 0.5 * (0.5 + 0.5 * beat)); }
  } else if (det == D_BARK) {
    float b = vnoise(vec2(q) * vec2(0.4, 0.06), 107) + float(q.x) * 0.06;
    float s = fract(b * 3.0);
    idx = s < 0.25 ? 0 : s < 0.6 ? 1 : 2;
    if (s > 0.9) col = vec4(a1.rgb, 1.0);
  } else if (det == D_STRIPES) {
    float s = fract(float(q.y) / 6.0 + vnoise(vec2(q) * 0.04, 109) * 0.8);
    if (s < 0.35) col = vec4(mix(PAL(m, idx), a1.rgb, 0.7), 1.0);
    if (hp > 0.985) col = vec4(a2.rgb, 1.0);
  } else if (det == D_WAXY) {
    float w = vnoise(vec2(q) * vec2(0.05, 0.11), 117);
    idx = w < 0.35 ? 0 : w < 0.6 ? 1 : w < 0.75 ? 2 : 3;
    if (abs(w - 0.68) < 0.012) idx = 3;
  } else if (det == D_CAP) {
    float sp = vnoise(vec2(q) * 0.3, 113);
    idx = lp.y < 3 ? 3 : lp.y > 11 ? 0 : (sp > 0.55 ? 2 : 1);
    if (lp.y > 12 && (q.x & 1) == 0) idx = 0;
    float br = 0.65 + 0.35 * sin(time * 1.2 + float(t.x) * 1.7);
    if (sp > 0.66 && lp.y < 11) { col = vec4(a1.rgb * 0.8, 1.0); setEmi(s2l(a1.rgb), e1 * 0.6 * br); }
    else if (lp.y < 11) setEmi(s2l(PAL(m, 2)), e1 * 0.18 * br);
  }
  if (dense) {
    // art.md 3.2: compression laminae, glints that only the lamp shows.
    int off = int(vnoise(vec2(float(q.x) * 0.06, float(q.y >> 4)), 211) * 3.0);
    if ((q.y + off) % 4 == 0) idx = max(idx - 1, 0);
    if (h2(q, 223) > 0.975) idx = 3;
  }
}

// ---------------------------------------------------------------- undiggable (art.md 3.5)
// One language for rock you cannot dig, in every biome (visual review #2): a riveted, bevelled plate of cool
// desaturated slate behind a heavy dark outline, a faint crosshatch on its face, never an ore. Each biome only tints it.
bool gBolt;
vec3 undigPlate(uint m, uint tm, ivec2 q, ivec2 lp, bool nL, bool nR, bool nU, bool nD, out vec2 n){
  // Value tied to the biome's own rock (review 3 #5): two steps darker than it, cool and desaturated, so it never
  // matches air and never vanishes into blue or purple rock. Bolts and the top bevel are a fixed steel-white.
  vec3 host = PAL(tm, 1);
  float hl = dot(host, vec3(0.299, 0.587, 0.114));
  float v = clamp(hl * 0.62, 0.17, 0.3);
  vec3 face = vec3(0.92, 0.97, 1.08) * v, lo = face * 0.55;
  vec3 hi = vec3(0.78, 0.84, 0.92), steel = vec3(0.86, 0.9, 0.95);
  n = vec2(0.0); gBolt = false;
  int dl = nL ? 99 : lp.x, dr = nR ? 99 : 15 - lp.x, du = nU ? 99 : lp.y, dd = nD ? 99 : 15 - lp.y;
  if (min(min(dl, dr), min(du, dd)) < 1) return vec3(0.02, 0.022, 0.03);            // heavy outline
  vec3 c = face;
  if (du == 1) { c = hi; n = vec2(0.0, -0.7); }                                      // light bevelled top edge
  else if (dl == 1) { c = mix(face, hi, 0.5); n = vec2(-0.6, 0.0); }
  else if (dd == 1 || dr == 1) { c = lo; n = vec2(dr == 1 ? 0.6 : 0.0, dd == 1 ? 0.6 : 0.0); }
  else {
    if (((q.x + q.y) & 3) == 0) c = face * 0.88;                                     // hatch
    if ((nL && lp.x == 0) || (nU && lp.y == 0)) c = lo;
    // steel-white corner bolts, 2x2 with a dark underside
    ivec2 b = ivec2(lp.x == 3 || lp.x == 4 || lp.x == 11 || lp.x == 12 ? 1 : 0, lp.y == 3 || lp.y == 4 || lp.y == 11 || lp.y == 12 ? 1 : 0);
    if (b.x == 1 && b.y == 1 && (lp.x < 8) == (lp.y < 8)) { c = (lp.y == 4 || lp.y == 12) && (lp.x == 4 || lp.x == 12) ? steel * 0.55 : steel; gBolt = true; }
  }
  return c;
}

// ---------------------------------------------------------------- finds (art.md 3.3, 3.4)
/** Draw a find stamp over the tile. kindOut: 0 ore, 1 jackpot, 2 artifact, 3 cache. */
bool drawFind(uint f, ivec2 t, ivec2 lp, uint host, int bio, bool scanned, bool rich, float scanK){
  vec4 r6 = FT(6, f);
  int cell = B8(r6.r) + B8(r6.g) * 256, kind = B8(r6.b), fx = B8(r6.a);
  ivec2 tq = t + ivec2(64);
  if (kind == 0) {
    int copies = min(3, 1 + bio / 2);
    cell += (copies - 1) * 4 + int(hashu(uvec3(uvec2(tq), 5u)) & 3u);
  }
  int s = int(texelFetch(stampT, ivec2((cell & 31) * 16 + lp.x, (cell >> 5) * 16 + lp.y), 0).r);
  if (s == 0) return false;
  vec3 base = FT(0, f).rgb, light = FT(1, f).rgb, glint = FT(2, f).rgb;
  vec4 glow = FT(7, f);
  float gk = glow.a * 4.0;
  vec3 c;
  bool object = kind != 0;
  if (s == 1) c = object ? vec3(0.043, 0.051, 0.071) : PAL(host, 0) * 0.3;
  else if (s == 2) c = base;
  else if (s == 3) c = light;
  else if (s == 4) c = mix(light, glint, 0.7);   // the specular pixel, always (review 2 #3)
  else if (s == 5) c = FT(3, f).rgb;
  else if (s == 6) c = FT(4, f).rgb;
  else c = FT(5, f).rgb;
  float th = time + h2(tq, 9) * 50.0;
  // Special ores.
  if ((fx & 1) != 0 && s == 3) { // Moonstone: the core drifts 1 px every 0.5 s
    int k = int(floor(th * 2.0)) & 3;
    c = (k == (lp.x + lp.y) % 4) ? glint : light;
  }
  if ((fx & 2) != 0 && s == 5) c = vec3(0.078, 0.063, 0.11);  // Voidstone centre
  if ((fx & 4) != 0 && (s == 3 || s == 4)) gk *= 0.45 + 0.55 * beat;  // Heartstone beats
  if ((fx & 8) != 0 && s == 3) {  // Seedglass: prismatic, 6 steps in 3 s
    float hstep = floor(fract(th / 3.0 + float(lp.x + lp.y) * 0.06) * 6.0) / 6.0;
    vec3 pr = clamp(abs(fract(hstep + vec3(0.0, 0.333, 0.667)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
    c = mix(light, pr, 0.45);
  }
  if (s >= 2 && !object) { float cl = dot(c, vec3(0.299, 0.587, 0.114)); c = clamp(mix(vec3(cl), c, 1.55) * (s == 3 ? 1.18 : 1.05), 0.0, 1.0); }
  // A near-white specular pixel on the upper-left of every lump (review 3 #4, #6).
  if (s == 3 && !object) {
    int ul = int(texelFetch(stampT, ivec2((cell & 31) * 16 + max(lp.x - 1, 0), (cell >> 5) * 16 + max(lp.y - 1, 0)), 0).r);
    int u = int(texelFetch(stampT, ivec2((cell & 31) * 16 + lp.x, (cell >> 5) * 16 + max(lp.y - 1, 0)), 0).r);
    if (ul <= 1 && u <= 1) { c = mix(c, vec3(0.97, 0.97, 1.0), 0.75); setEmi(vec3(1.0), 0.25); flags |= GLINT; }
  }   // ore above its host (review 2 #3)
  alb = c;
  if (s >= 2 || object) layer = 4.0;
  nrm = s == 3 ? vec2(-0.25, -0.35) : vec2(0.0);
  if (s == 3 && gk == 0.0) { setEmi(s2l(light), 0.3); flags |= NEEDLIT; }
  // Glow on light px only (and the emissive accent).
  if (gk > 0.0 && s == 3) setEmi(s2l(glow.rgb), gk * 0.55);
  if (s == 6 && gk > 0.0) setEmi(s2l(c), gk);
  // Glint: one px flashes to glint HDR 2.2 for 60 ms every 2-5 s, only in lamp light (resolve gates it).
  if (s == 4) {
    float per = 2.0 + 3.0 * h2(tq, 21);
    if (fract(th / per) * per < 0.06 + (kind == 2 ? 0.25 : 0.0)) { setEmi(s2l(glint), kind == 2 ? 1.5 : 2.2); flags |= GLINT; }
  }
  // Scanner: outline px in base at HDR 0.35 where it is dark; the ping doubles it.
  if (scanned && s == 1) {
    // Rich pocket (R10): a 2 px diagonal highlight sweeps the vein's outlines every 2.5 s.
    vec2 wq = vec2(t * 16 + lp);
    float sweep = rich && fract(time / 2.5 - (wq.x + wq.y) / 96.0) < 0.04 ? 1.0 : 0.0;
    setEmi(s2l(object ? light : base), 0.35 * (1.0 + scanK) * (1.0 + 0.6 * sweep) + 0.6 * sweep); flags |= DARKONLY; layer = 4.0;
  }
  return true;
}

void jackpotFx(ivec2 t, ivec2 lp, uint f){
  // Four 1 px dots orbit the tile at 1 rev / 3 s; a cross sparkle every 1.2 s.
  vec2 c = vec2(7.5);
  for (int k = 0; k < 4; k++) {
    float a = time * 6.2832 / 3.0 + float(k) * 1.5708;
    ivec2 d = ivec2(floor(c + vec2(cos(a), sin(a)) * 7.0 + 0.5));
    if (d == lp) { alb = vec3(1.0, 0.91, 0.56); setEmi(vec3(1.0, 0.8, 0.3), 1.6); layer = 4.0; }
  }
  float ph = fract(time / 1.2 + h2(t + 64, 3));
  if (ph < 0.12) {
    ivec2 sp = ivec2(4) + ivec2(int(h2(t + 64, int(time / 1.2)) * 8.0), int(h2(t + 64, int(time / 1.2) + 7) * 8.0));
    ivec2 d = abs(lp - sp);
    if ((d.x == 0 && d.y <= 2) || (d.y == 0 && d.x <= 2)) { setEmi(vec3(1.0, 0.95, 0.8), 1.3 * (1.0 - ph / 0.12)); layer = 4.0; }
  }
}

// ---------------------------------------------------------------- hazards (art.md 3.6)
bool rim(ivec2 lp){ return lp.x == 0 || lp.y == 0 || lp.x == 15 || lp.y == 15; }
int perim(ivec2 lp){ if (lp.y == 0) return lp.x; if (lp.x == 15) return 15 + lp.y; if (lp.y == 15) return 45 - lp.x; return 60 - lp.y; }
// Hazard warning built into the tile (review 2 #4): a pulsing warm rim on the faces that meet air, and a small
// engraved warning triangle in the corner. Seen in lamp light, or always once scanned.
bool gOL, gOR, gOU, gOD;
const vec3 WARN = vec3(1.0, 0.62, 0.18);
void dashedRim(ivec2 lp, bool scanned){
  float pulse = 0.55 + 0.45 * sin(time * 5.0);
  bool face = (gOL && lp.x == 1) || (gOR && lp.x == 14) || (gOU && lp.y == 1) || (gOD && lp.y == 14);
  // the glyph: a 5 px triangle with a 1 px mark, top-left
  ivec2 g = lp - ivec2(2, 2);
  bool tri = g.y >= 0 && g.y < 5 && abs(g.x - 2) <= g.y / 2 + (g.y == 4 ? 1 : 0) && (abs(g.x - 2) == g.y / 2 + (g.y == 4 ? 1 : 0) || g.y == 4);
  bool mark = g.x == 2 && (g.y == 1 || g.y == 2);
  if (face) { alb = mix(alb, WARN, 0.6); setEmi(s2l(WARN), 0.9 * pulse); layer = 5.0; if (!scanned) flags |= NEEDLIT; }
  if (tri || mark) { alb = tri ? WARN * 0.8 : vec3(0.1); setEmi(s2l(WARN), tri ? 0.7 * pulse + 0.2 : 0.0); layer = 5.0; if (!scanned) flags |= NEEDLIT; }
}
float tellK(ivec2 t, float kind){
  for (int i = 0; i < 8; i++) { if (i >= nTells) break; vec4 v = tells[i]; if (v.w == kind && ivec2(floor(v.xy)) == t) return v.z; }
  return -1.0;
}
void hazard(int hz, ivec2 t, ivec2 lp, ivec2 q, uint host, bool scanned){
  if (hz == 1) { // gas: hairline yellow-green cracks + seep; the fuse swells green and draws a closing ring
    float fk = tellK(t, 1.0);
    bool crack = seg(vec2(lp), vec2(3.0, 2.0 + h2(t, 5) * 4.0), vec2(9.0, 8.0)) < 0.55 || seg(vec2(lp), vec2(9.0, 8.0), vec2(12.0, 13.0 - h2(t, 6) * 3.0)) < 0.55 || seg(vec2(lp), vec2(9.0, 8.0), vec2(13.0, 5.0)) < 0.5;
    bool crack2 = seg(vec2(lp), vec2(3.0, 2.0 + h2(t, 5) * 4.0) + vec2(1.0, 0.0), vec2(10.0, 8.0)) < 0.55;
    float br = 0.75 + 0.25 * sin(time * 2.5 + h2(t, 9) * 6.0);
    if (crack || crack2) { alb = vec3(0.85, 1.0, 0.25); setEmi(vec3(0.62, 1.0, 0.05), (0.9 + max(fk, 0.0) * 1.6) * br); layer = 5.0; }
    else if (length(vec2(lp) - vec2(9.0, 8.0)) < 3.0) { alb = mix(alb, vec3(0.5, 0.65, 0.1), 0.5); setEmi(vec3(0.4, 0.7, 0.05), 0.35 * br); layer = 5.0; }
    if (fk >= 0.0) {
      float rr = mix(11.0, 0.5, fk), d = length(vec2(lp) - 7.5);
      if (abs(d - rr) < 0.6) { alb = vec3(0.8, 1.0, 0.4); setEmi(vec3(0.6, 1.0, 0.2), 2.0); layer = 5.0; }
      setEmi(vec3(0.5, 0.9, 0.15), fk * 1.2 * (0.6 + 0.4 * sin(time * 30.0)));
    }
    dashedRim(lp, scanned);
  } else if (hz == 2) { // spore vent: a swollen puffball that breathes; brightens before a release
    float ch = tellK(t, 2.0);
    float br = sin(time * 3.1416) * 0.5 + 0.5;
    vec2 d = (vec2(lp) - vec2(7.5, 9.0)) / vec2(6.5 + br, 5.5 + br);
    float r = length(d);
    if (r < 1.0) {
      int pi = r > 0.8 ? 0 : (d.y < -0.3 ? 3 : (d.x + d.y < 0.0 ? 2 : 1));
      vec3 cs[4] = vec3[4](vec3(0.22, 0.27, 0.18), vec3(0.42, 0.52, 0.34), vec3(0.55, 0.66, 0.44), vec3(0.72, 0.85, 0.6));
      alb = cs[pi]; layer = 5.0;
      if (h2(q >> 1, 7) > 0.82 && r < 0.8) { alb = vec3(0.85, 1.0, 0.45); setEmi(vec3(0.6, 1.0, 0.2), 0.7 + 0.4 * sin(time * 3.1416)); }
      if (r < 0.25 && d.y < 0.0) { alb = vec3(0.1, 0.12, 0.08); }
      if (ch >= 0.0) setEmi(vec3(0.72, 0.94, 0.63), 0.9 * ch);
      nrm = d * 0.6;
    }
    dashedRim(lp, scanned);
  } else if (hz == 3) { // arc pylon post 6x12 with an emitter tip
    if (lp.x >= 5 && lp.x <= 10 && lp.y >= 3) {
      alb = lp.x == 5 ? vec3(0.55, 0.6, 0.66) : (lp.x == 10 ? vec3(0.2, 0.22, 0.26) : vec3(0.36, 0.38, 0.44));
      if (lp.y % 4 == 0) alb *= 0.7;
      layer = 5.0;
      if (lp.y <= 5) {
        float ch = max(tellK(t, 3.0), 0.0) + max(tellK(t, 4.0), 0.0) * 2.0;
        alb = vec3(0.54, 0.78, 1.0); setEmi(vec3(0.54, 0.78, 1.0), 0.6 + ch * 1.2); layer = 5.0;
      }
    }
    dashedRim(lp, scanned);
  } else if (hz == 4) { // false floor: Sower brick with a faint seam; it cracks in two stages under the pod
    float k = tellK(t, 5.0);
    if (lp.y == 7 && (lp.x + int(h2(t, 2) * 3.0)) % 16 > 1) alb *= 0.7;
    if (k > 0.0) { bool cr = seg(vec2(lp), vec2(2.0, 1.0), vec2(8.0, 9.0)) < 0.6 || (k > 0.5 && seg(vec2(lp), vec2(8.0, 9.0), vec2(14.0, 3.0)) < 0.6); if (cr) alb *= 0.3; }
    dashedRim(lp, scanned);
  } else if (hz == 5) { // lava pocket below: orange bleed in the cracks of this tile
    bool crack = seg(vec2(lp), vec2(2.0, 15.0), vec2(6.0, 9.0)) < 0.55 || seg(vec2(lp), vec2(6.0, 9.0), vec2(5.0, 4.0)) < 0.5 || seg(vec2(lp), vec2(6.0, 9.0), vec2(11.0, 12.0)) < 0.5 || seg(vec2(lp), vec2(11.0, 12.0), vec2(13.0, 15.0)) < 0.5;
    if (crack) { alb = vec3(0.6, 0.2, 0.05); setEmi(vec3(1.0, 0.15, 0.01), 0.5 * (0.8 + 0.2 * sin(time * 2.0))); layer = 5.0; }
    dashedRim(lp, scanned);
  }
}

// ---------------------------------------------------------------- cracks (art.md 3.7)
float crackMask(ivec2 t, ivec2 lp, int dir, float p, bool dense){
  if (p < 0.15) return 0.0;
  float stage = p < 0.4 ? 1.0 : p < 0.65 ? 2.0 : p < 0.85 ? 3.0 : 4.0;
  float len = stage * 4.0;
  vec2 P = vec2(lp) + 0.5;
  float best = 99.0;
  for (int k = 0; k < 3; k++) {
    float hk = h2(t + 64, 300 + k);
    vec2 a = dir == 0 ? vec2(15.5, 3.0 + hk * 10.0) : dir == 1 ? vec2(0.5, 3.0 + hk * 10.0) : vec2(3.0 + hk * 10.0, 0.5);
    vec2 fwd = dir == 0 ? vec2(-1.0, 0.0) : dir == 1 ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec2 side = vec2(-fwd.y, fwd.x);
    float walked = 0.0;
    for (int s = 0; s < 4; s++) {
      float stepL = 3.0 + h2(t + 64, 310 + k * 7 + s) * 2.0;
      if (walked >= len) break;
      vec2 b = a + fwd * stepL + side * (h2(t + 64, 330 + k * 7 + s) - 0.5) * 5.0;
      best = min(best, seg(P, a, b));
      if (s == 1 && stage > 1.0) { vec2 fk = b + side * (h2(t + 64, 350 + k) > 0.5 ? 3.0 : -3.0) + fwd * 2.0; best = min(best, seg(P, b, fk)); }
      walked += stepL; a = b;
    }
  }
  return best < 0.6 ? 1.0 : (best < 1.4 ? 0.5 : 0.0);
}

// ---------------------------------------------------------------- the Lift column (art.md 7.4)
void liftColumn(ivec2 t, ivec2 lp, ivec2 q){
  // Steel plates, a bolt every 8 px, rails at 1-2 and 13-14, paired lamps every 4 rows.
  vec3 pl[4] = vec3[4](vec3(0.133, 0.157, 0.18), vec3(0.165, 0.188, 0.22), vec3(0.204, 0.227, 0.267), vec3(0.243, 0.275, 0.314));
  int pi = (q.y & 7) == 0 ? 0 : ((q.y >> 3) & 1) == 0 ? 1 : 2;
  alb = pl[pi]; layer = 1.0;
  if ((q.y & 7) == 4 && (lp.x == 4 || lp.x == 11)) alb = pl[3];
  if (lp.x == 0 || lp.x == 15) alb = pl[0];
  if (lp.x == 1 || lp.x == 2 || lp.x == 13 || lp.x == 14) {
    alb = (lp.x == 1 || lp.x == 13) ? vec3(0.604, 0.643, 0.706) : vec3(0.416, 0.447, 0.502);
    nrm = vec2(lp.x == 1 || lp.x == 13 ? -0.5 : 0.3, 0.0);
  }
  int seg_ = 0;
  for (int i = 0; i < 7; i++) if (t.y >= segEnd[i]) seg_ = i + 1;
  seg_ = min(seg_, 6);
  vec3 lc = segCol[seg_];
  if ((t.y & 3) == 1 && lp.y >= 7 && lp.y <= 8 && (lp.x == 1 || lp.x == 2 || lp.x == 13 || lp.x == 14)) {
    alb = lc; setEmi(s2l(lc), 1.3);
  }
  // Stations at each segment end: a gate frame with chevrons and a green ready lamp.
  bool station = false;
  for (int i = 0; i < 7; i++) if (t.y == segEnd[i] - 1 && segEnd[i] <= liftDepth) station = true;
  if (station && lp.y >= 13) {
    bool yb = (((q.x + q.y) >> 1) & 1) == 0;
    alb = yb ? vec3(1.0, 0.847, 0.44) : vec3(0.1); nrm = vec2(0.0, -0.4);
    if (lp.y == 13) alb *= 0.8;
  }
  if (station && lp.y == 10 && (lp.x == 7 || lp.x == 8)) { alb = vec3(0.35, 0.85, 0.54); setEmi(vec3(0.1, 0.7, 0.25), 1.3); }
  // The head: a bumper beam and a floodlight pointing down.
  if (t.y == liftDepth - 1) {
    if (lp.y >= 14) { bool yb = ((q.x >> 1) & 1) == 0; alb = yb ? vec3(1.0, 0.847, 0.44) : vec3(0.08); layer = 1.0; }
    if (lp.y == 12 && lp.x >= 6 && lp.x <= 9) { alb = vec3(1.0, 0.97, 0.9); setEmi(vec3(1.0, 0.95, 0.85), 1.0); }
  }
}


// ---------------------------------------------------------------- the parallax background (visual review #6)
// Two layers per biome behind natural caves, under ~35 % brightness, self-lit (they carry the biome's mood, not the lamp).
// Returns linear colour to emit. p0/p1: far and near layer coordinates.
float hcol(float x, int s){ return h2(ivec2(int(floor(x)) + 4096, 7), s); }
bool dith(float v, vec2 p){ return v > bayer4(ivec2(p)); }
// Linear tones for backdrops: far, mid dark, mid, mid light (all well under the darkest rock).
vec3 tone4(vec3 hue, int k){ float v[4] = float[4](0.005, 0.009, 0.015, 0.024); return hue * v[k]; }
/** A faceted crystal: hexagonal prism with a point; facets left lit, middle, right dark, a glowing core line. */
int crystalAt(vec2 p, float cx, float base, float w, float h, out float glow){
  glow = 0.0;
  float up = base - p.y, dx = p.x - cx;
  float tip = w * 0.9;
  if (up < 0.0 || up > h + tip) return -1;
  float hw = up > h ? w * (1.0 - (up - h) / tip) : w;
  if (abs(dx) > hw) return -1;
  if (abs(dx) < 1.0 && up < h) glow = 1.0;
  return dx < -hw * 0.35 ? 3 : dx > hw * 0.35 ? 1 : 2;
}
vec3 background(int bio, vec2 wp, float y){
  vec2 pf = floor(wp - floor(camC * 0.8)) + vec2(floor(time * 1.5), 0.0);   // far plane, slow drift
  vec2 pm = floor(wp - floor(camC * 0.55));                                   // mid plane
  vec3 c = vec3(0.0);
  if (bio == 0) {
    vec3 hu = vec3(1.0, 0.62, 0.38);
    c = tone4(hu, 0);
    if (dith(vnoise(vec2(pf.x * 0.006, pf.y * 0.045), 1401) * 1.4 - 0.25, pf)) c = tone4(hu, 1);
    // roots: 3 px, lit on the left
    float cx = floor(pm.x / 52.0), hx = hcol(cx, 1402);
    float rx = (cx + 0.3 + hx * 0.4) * 52.0 + sin(pm.y * 0.07 + hx * 9.0) * 4.0;
    float top = floor(pm.y / 170.0) * 170.0, len = 50.0 + hx * 100.0, k = 1.0 - (pm.y - top) / len;
    float d = pm.x - rx, wdt = 1.0 + 2.0 * k;
    if (hx > 0.3 && k > 0.0 && abs(d) <= wdt) c = d < -wdt + 1.0 ? tone4(hu, 3) : tone4(hu, 2);
    // buried stones
    vec3 v = voro(pm, 22.0, 1404);
    if (v.z > 0.85 && v.x < 5.0) c = v.x < 1.5 ? tone4(vec3(0.9), 3) : tone4(vec3(0.85, 0.8, 0.75), 2);
  } else if (bio == 1) {
    vec3 hu = vec3(0.7, 0.78, 1.0), wood = vec3(1.0, 0.62, 0.32);
    c = tone4(hu, 0);
    if (dith(vnoise(pf * 0.025, 1411) * 1.3 - 0.2, pf)) c = tone4(hu, 1);
    // timbered shafts: posts and caps, 3 tones
    vec2 g = mod(pm, vec2(84.0, 64.0)), gi = floor(pm / vec2(84.0, 64.0));
    float hc = h2(ivec2(gi) + 4096, 1412);
    if (hc > 0.35) {
      if (g.x < 5.0 && g.y > 6.0) c = g.x < 1.0 ? tone4(wood, 3) : g.x > 3.0 ? tone4(wood, 1) : tone4(wood, 2);
      if (g.y < 6.0 && g.x < 58.0) c = g.y < 1.0 ? tone4(wood, 3) : g.y > 4.0 ? tone4(wood, 1) : tone4(wood, 2);
      if (g.x > 52.0 && g.x < 57.0 && g.y > 6.0) c = g.x < 53.0 ? tone4(wood, 3) : tone4(wood, 1);
      if (hc > 0.8) { float dd = length(g - vec2(28.0, 12.0)); if (dd < 1.6) c = vec3(0.5, 0.3, 0.1); else c += vec3(0.02, 0.011, 0.004) * smoothstep(14.0, 2.0, dd); }
    }
  } else if (bio == 2) {
    vec3 te = vec3(0.45, 0.9, 1.0), vi = vec3(0.75, 0.55, 1.0);
    c = tone4(vec3(0.6, 0.6, 1.0), 0);
    // far: dithered spires
    float fx = floor(pf.x / 60.0), fh = hcol(fx, 1421), fb = floor(pf.y / 230.0) * 230.0 + 230.0;
    float fu = fb - pf.y, fw = 14.0 * (0.5 + fh) * (1.0 - fu / (90.0 + fh * 120.0));
    if (fu > 0.0 && abs(pf.x - (fx + 0.5) * 60.0) < fw && dith(0.55, pf)) c = tone4(fh > 0.5 ? te : vi, 1);
    // mid: faceted crystals
    float cx = floor(pm.x / 48.0), hx = hcol(cx, 1422);
    float glow;
    int f = crystalAt(pm, (cx + 0.5) * 48.0 + (hx - 0.5) * 10.0, floor(pm.y / 200.0) * 200.0 + 200.0, 6.0 + hx * 6.0, 30.0 + hx * 70.0, glow);
    if (hx > 0.3 && f >= 0) { vec3 hu = hx > 0.65 ? te : vi; c = tone4(hu, f); if (glow > 0.0) c = hu * 0.02 * (0.7 + 0.3 * sin(time + hx * 9.0)); }
    ivec2 sp = ivec2(floor(pm / 3.0)) + 4096;
    if (h2(sp, 1425) > 0.997) c += te * 0.03 * max(0.0, sin(time * 1.5 + h2(sp, 1426) * 30.0));
  } else if (bio == 3) {
    vec3 hu = vec3(0.5, 1.0, 0.85), li = vec3(0.7, 0.6, 1.0);
    c = tone4(hu, 0);
    // far: dithered mushrooms
    float fx = floor(pf.x / 90.0), fh = hcol(fx, 1431), fb = floor(pf.y / 210.0) * 210.0 + 210.0;
    float fu = fb - pf.y, fd = pf.x - (fx + 0.5) * 90.0, fH = 60.0 + fh * 60.0;
    if ((fu > 0.0 && fu < fH && abs(fd) < 4.0) || length(vec2(fd, (fu - fH) * 2.0)) < 24.0 + fh * 14.0 && fu > fH - 4.0) { if (dith(0.5, pf)) c = tone4(hu, 1); }
    // mid: mushroom with a lit cap, spots and gills, a fibrous stem
    float w = 120.0, cx = floor(pm.x / w), hx = hcol(cx, 1432);
    float base = floor(pm.y / 220.0) * 220.0 + 220.0, h = 60.0 + hx * 80.0, mx = (cx + 0.5) * w;
    float up = base - pm.y, dx = pm.x - mx, capR = 22.0 + hx * 20.0;
    vec3 gl = hx > 0.5 ? hu : li;
    if (hx > 0.25) {
      if (up > 0.0 && up < h && abs(dx) < 5.0) c = dx < -3.0 ? tone4(vec3(0.8, 0.75, 1.0), 3) : (int(pm.y) % 5 == 0 ? tone4(vec3(0.8, 0.75, 1.0), 1) : tone4(vec3(0.8, 0.75, 1.0), 2));
      vec2 cd = vec2(dx, (up - h) * 2.0);
      if (length(cd) < capR && up > h - 4.0) {
        bool under = up < h + 1.0;
        c = under ? ((int(pm.x) & 1) == 0 ? tone4(gl, 0) : gl * 0.012 * (0.7 + 0.3 * sin(time * 0.8 + hx * 7.0))) : (length(cd - vec2(-capR * 0.3, capR * 0.5)) < capR * 0.45 ? tone4(gl, 3) : tone4(gl, 2));
        if (!under && vnoise(pm * 0.2, 1434) > 0.72) c = gl * 0.016;
      }
    }
    ivec2 sp = ivec2(floor((pm + vec2(0.0, time * 6.0)) / 2.0)) + 4096;
    if (h2(sp, 1435) > 0.997) c += gl * 0.02;
  } else if (bio == 4) {
    vec3 hu = vec3(1.0, 0.45, 0.25);
    c = tone4(hu, 0) + vec3(0.003, 0.0006, 0.0) * smoothstep(0.0, 150.0, mod(pf.y, 240.0));
    if (dith(vnoise(pf * 0.02, 1441) * 1.2 - 0.2, pf)) c = tone4(vec3(0.6, 0.5, 0.5), 1);
    // mid: lavafalls with a white core, orange sides, a dark lip
    float w = 140.0, cx = floor(pm.x / w), hx = hcol(cx, 1442);
    float mx = (cx + 0.5) * w + (hx - 0.5) * 40.0, d = abs(pm.x - mx);
    if (hx > 0.5 && d < 4.0) {
      float f = fract(pm.y * 0.03 - time * 0.4 + hx);
      c = d < 1.0 ? vec3(0.09, 0.05, 0.015) : d < 3.0 ? mix(vec3(0.05, 0.012, 0.0), vec3(0.08, 0.025, 0.004), step(0.5, f)) : vec3(0.012, 0.003, 0.0);
    }
  } else if (bio == 5) {
    vec3 hu = vec3(0.6, 1.0, 0.85), st = vec3(0.85, 1.0, 0.9);
    c = tone4(hu, 0);
    // far: dithered colossal columns
    vec2 gf = mod(pf, vec2(150.0, 200.0));
    if (gf.x < 24.0 && dith(0.5, pf)) c = tone4(hu, 1);
    // mid: arches, 3 tones, lit on top
    vec2 g = mod(pm, vec2(120.0, 160.0));
    float ax = g.x - 69.0, ay = g.y - 40.0, ar = length(vec2(ax, ay * 1.3));
    bool col = g.x < 16.0 && g.y > 40.0;
    if (col) c = g.x < 2.0 ? tone4(st, 3) : g.x > 13.0 ? tone4(st, 1) : tone4(st, 2);
    if (abs(ar - 46.0) < 6.0 && ay < 0.0) c = ar > 50.0 ? tone4(st, 3) : ar < 42.0 ? tone4(st, 1) : tone4(st, 2);
    // carved friezes: inset panels with blocky relief figures, a different scale from any text
    vec2 fp = mod(pm + vec2(0.0, 60.0), vec2(56.0, 160.0)), fi = floor((pm + vec2(0.0, 60.0)) / vec2(56.0, 160.0));
    if (fp.x > 4.0 && fp.x < 52.0 && fp.y > 4.0 && fp.y < 28.0 && h2(ivec2(fi) + 4096, 1452) > 0.45) {
      vec2 l = fp - vec2(4.0, 4.0);
      c = tone4(st, 1);
      if (l.x < 1.0 || l.y < 1.0) c = tone4(st, 0);
      if (l.x > 46.0 || l.y > 22.0) c = tone4(st, 3);
      int fig = int(l.x) / 12; vec2 fl = mod(l, vec2(12.0, 24.0));
      bool body = abs(fl.x - 6.0) < 2.0 && fl.y > 9.0 && fl.y < 20.0, head = length(fl - vec2(6.0, 6.0)) < 2.5;
      bool arm = abs(fl.y - 12.0) < 1.0 && abs(fl.x - 6.0) < 5.0 && (fig & 1) == 0;
      if (body || head || arm) {
        float near = smoothstep(200.0, 50.0, length(wp - pod * 16.0));   // reliefs answer the pod
        c = mix(tone4(st, 3), hu * 0.03, 0.35 + 0.65 * near);
      }
    }
  } else {
    vec3 hu = vec3(1.0, 0.45, 0.4);
    vec2 d = wp - seedW;
    float r = length(d), a = atan(d.y, d.x);
    c = tone4(vec3(1.0, 0.6, 0.8), 0);
    float far = abs(sin(a * 13.0 + sin(log(r + 1.0) * 4.0) * 0.8));
    if (far < 0.15 && dith(0.5, pf)) c = tone4(hu, 1);
    // mid: root tendrils converging on the Seed, 2 tones, pulsing
    vec2 dm = pm - (seedW - floor(camC * 0.55));
    float rm = length(dm), am = atan(dm.y, dm.x);
    float root = abs(sin(am * 7.0 + sin(rm * 0.025) * 0.9));
    float wdt = 0.05 + 0.1 * smoothstep(500.0, 80.0, rm);
    if (root < wdt) c = root < wdt * 0.4 ? hu * 0.008 * (0.5 + 0.5 * beat) : tone4(hu, 1);
    if (r < 330.0) {
      // Stepped, dithered glow rings round the Seed (review #7, #16): pixel bands, not a blur.
      float g = clamp(1.0 - (r - 70.0) / 120.0, 0.0, 1.0);
      float gb = floor(g * 4.0 + bayer4(ivec2(wp)) * 0.9) / 4.0;
      c += vec3(0.26, 0.16, 0.07) * gb * gb * (0.75 + 0.25 * beat);
    }
  }
  return c;
}

// ---------------------------------------------------------------- back walls and decor (art.md 2.2, 4)
void backWall(ivec2 t, ivec2 lp, ivec2 q, uint back, int bio, bool sL, bool sR, bool sU, bool sD){
  uint m = back != 0u ? back : uint(typical[clamp(bio, 0, 9)]);
  float n = fbm3(vec2(q) * 0.05, int(m) * 7 + 3);
  int idx = n < 0.4 ? 0 : n < 0.55 ? 1 : 2;
  vec3 c = PAL(m, idx);
  // value x0.42, saturation x0.6
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 0.6) * 0.42;
  int det = B8(MT(6, m).r);
  if (det == D_BRICK) { int row = q.y >> 2, off = (row & 1) * 4; if ((q.y & 3) == 0 || ((q.x + off) & 7) == 0) c *= 0.7; }
  if (det == D_PLANKS && (q.y & 3) == 3) c *= 0.75;
  alb = c; layer = 1.0;
  bool dug = (TB(t).r & 1u) != 0u;
  if (dug) { emi = vec3(0.004, 0.0055, 0.009); emiK = 1.0; }   // a faint cool tint: empty never reads as rock (review 3 #1)
  if (!dug) { alb *= 0.6; flags |= 64; vec3 bgc = background(bio == 7 ? 3 : bio == 8 ? 2 : bio, vec2(q - 8192) + 0.5, float(t.y)); emi = bgc; emiK = 1.0; }
  // The Kiln (review 2 #15): a fire-lit furnace hall. Soot darkens upward, chains hang from the roof,
  // a hearth of glowing coals and firebrick burns at the floor's centre.
  if (kiln.z > 0.0 && float(t.x) >= kiln.x && float(t.x) < kiln.x + kiln.z && float(t.y) >= kiln.y && float(t.y) < kiln.y + kiln.w) {
    emi = vec3(0.0); emiK = 0.0; flags &= ~64;
    vec2 kp = vec2(q - 8192) + 0.5 - kiln.xy * 16.0, ks = kiln.zw * 16.0;
    float hy = ks.y - 16.0 - kp.y, hx = abs(kp.x - ks.x * 0.5);   // height above the hall floor
    int row = q.y >> 2, off = (row & 1) * 4;
    bool mortar = (q.y & 3) == 0 || ((q.x + off) & 7) == 0;
    alb = (mortar ? vec3(0.09, 0.06, 0.05) : vec3(0.22, 0.13, 0.09)) * mix(1.0, 0.35, smoothstep(ks.y * 0.4, 0.0, kp.y));
    float heat = smoothstep(ks.x * 0.5, 0.0, hx) * smoothstep(ks.y * 0.7, 0.0, hy) * 0.8;
    if (heat > 0.0 && !mortar) setEmi(vec3(1.0, 0.32, 0.06), heat * 0.7 * (0.85 + 0.15 * sin(time * 3.0 + kp.x * 0.3)));
    // the hearth: an arch of firebrick round a bed of coals
    if (hy < 22.0 && hx < 26.0) {
      float ar = length(vec2(kp.x - ks.x * 0.5, (hy - 2.0) * 1.2));
      if (ar > 22.0 && ar < 26.0) { alb = mortar ? vec3(0.15, 0.06, 0.03) : vec3(0.45, 0.16, 0.07); setEmi(vec3(1.0, 0.3, 0.05), 0.5); }
      else if (ar <= 22.0) {
        float fl = vnoise(vec2(kp.x * 0.25, kp.y * 0.12 + time * 2.5), 1501);
        float hb = floor(clamp((1.0 - hy / 22.0) * 0.8 + fl * 0.6, 0.0, 1.0) * 3.0 + bayer4(q) * 0.7) / 3.0;
        vec3 fc = hb > 0.9 ? vec3(1.0, 0.92, 0.6) : hb > 0.6 ? vec3(1.0, 0.6, 0.15) : hb > 0.3 ? vec3(0.85, 0.25, 0.05) : vec3(0.25, 0.06, 0.02);
        alb = fc * 0.5; setEmi(fc, 0.4 + hb * 2.0);
      }
    }
    // chains from the roof
    float cx = mod(kp.x, 40.0);
    if (abs(cx - 20.0) < 1.0 && kp.y < ks.y * 0.55 && ((q.y >> 1) & 1) == (abs(cx - 20.0) < 0.5 ? 0 : 1)) alb = vec3(0.12, 0.1, 0.1);
    layer = 1.0; ao = 1.0; flags |= 128; return;
  }
  // AO along edges that touch rock
  // A soft inner shadow on the air side of every rock face (review 2 #1).
  float a = 1.0, ao4[4] = float[4](0.45, 0.62, 0.78, 0.9);
  if (sL && lp.x < 4) a = min(a, ao4[lp.x]);
  if (sR && lp.x > 11) a = min(a, ao4[15 - lp.x]);
  if (sU && lp.y < 4) a = min(a, ao4[lp.y]);
  if (sD && lp.y > 11) a = min(a, ao4[15 - lp.y]);
  ao = a; alb *= a;
  // Decor: one item per tile at most, by hash (decorAt in grids.ts mirrors the lit ones).
  ivec2 tq = t + ivec2(64);
  float hd = h3(ivec3(tq, 900));
  if (bio == 0 && sU && hd < 0.35) { // roots hang from the ceiling
    int rx = 2 + int(h3(ivec3(tq, 901)) * 12.0), rl = 3 + int(h3(ivec3(tq, 902)) * 8.0);
    int wob = (lp.y / 3) & 1;
    if (lp.x == rx + wob && lp.y < rl) { alb = vec3(0.46, 0.38, 0.22) * 0.6; layer = 1.0; }
  }
  if (bio == 1 && sU && hd < 0.07) { // a lantern on a hook (lit; grids.ts places its light)
    if (lp.x == 7 && lp.y < 3) alb = vec3(0.2);
    if (lp.x >= 6 && lp.x <= 8 && lp.y >= 3 && lp.y <= 6) { alb = vec3(1.0, 0.7, 0.36); setEmi(vec3(1.0, 0.55, 0.2), lp.y == 3 ? 0.5 : 1.3); }
  } else if (bio == 1 && sU && hd < 0.4 && (t.x & 3) == 0) { // timber frame: a post and a cap beam
    if (lp.y < 3) alb = vec3(0.34, 0.22, 0.11) * (lp.y == 2 ? 0.7 : 1.0);
  }
  if (bio == 1 && (sL || sR) && hd > 0.93 && lp.y > 6 && lp.y < 12) { // chalk tally marks
    int lx = sL ? lp.x - 3 : 12 - lp.x;
    if (lx >= 0 && lx < 8 && (lx % 2 == 0 || (lp.y == 9 && lx < 7))) alb = vec3(0.32, 0.31, 0.3);
  }
  if (bio == 2 && planet != 2 && (sD || sU) && hd < 0.4) { // crystal shards on floor/ceiling, re-emitting faintly
    int sx = 2 + int(h3(ivec3(tq, 911)) * 10.0);
    int dy = sD ? 15 - lp.y : lp.y;
    int dx = lp.x - sx;
    int hgt = 3 + int(h3(ivec3(tq, 912)) * 5.0);
    if ((dx >= 0 && dx < 2 && dy < hgt) || (dx == 2 && dy < hgt - 2) || (dx == -1 && dy < hgt - 3)) {
      vec3 cc = h3(ivec3(tq, 913)) > 0.5 ? vec3(0.5, 0.91, 1.0) : vec3(0.77, 0.55, 1.0);
      alb = cc * (dx == 0 ? 0.55 : 0.4); setEmi(s2l(cc), 0.35); layer = 1.0;
    }
  }
  if (planet == 1 && bio == 3) { // Ash hollows: embers glow in the ash floor
    if (sD && lp.y > 13 && h3(ivec3(tq.x * 16 + lp.x, tq.y, 961)) > 0.9) { alb = vec3(0.6, 0.2, 0.05); setEmi(vec3(1.0, 0.25, 0.03), 0.5 + 0.4 * sin(time * 2.0 + float(lp.x))); }
  } else if (bio == 3 && sD && hd < 0.45) { // glowcaps on the floor, breathing (grids.ts lights them)
    int sx = 3 + int(h3(ivec3(tq, 921)) * 9.0);
    int hgt = 3 + int(h3(ivec3(tq, 922)) * 4.0);
    int dy = 15 - lp.y, dx = lp.x - sx;
    float ci = h3(ivec3(tq, 923));
    vec3 cc = ci < 0.6 ? vec3(0.36, 1.0, 0.78) : ci < 0.85 ? vec3(0.62, 0.5, 1.0) : vec3(1.0, 0.85, 0.29);
    float br = 0.6 + 0.4 * sin(time * 6.2832 / (4.0 + 3.0 * h3(ivec3(tq, 924))) + ci * 20.0);
    if (dx == 0 && dy < hgt) { alb = vec3(0.55, 0.5, 0.6) * 0.5; layer = 1.0; }
    if (dy == hgt && abs(dx) <= 2 || dy == hgt + 1 && abs(dx) <= 1) { alb = cc * 0.6; setEmi(s2l(cc), 0.8 * br); layer = 1.0; }
  }
  if (bio == 4 && hd > 0.965 && !sD && !sU) { // lava falls far back: a slow glowing streak
    int sx = 4 + int(h3(ivec3(tq, 931)) * 8.0);
    if (abs(lp.x - sx) < 2) { float f = fract(float(q.y) * 0.08 - time * 0.4 + float(lp.x) * 0.3); vec3 cc = vec3(1.0, 0.4, 0.1); alb = cc * 0.3; setEmi(s2l(cc), 0.2 + 0.3 * f); }
  }
}

// ---------------------------------------------------------------- lava (art.md 3.6)
void lavaPx(ivec2 q, ivec2 lp, ivec2 t, uint m, bool surf, float level){
  // Depth below the lake's surface, in tiles (up to 3 tiles of lava above this one).
  int above = 0;
  for (int k = 1; k <= 3; k++) { if (KIND(TA(t - ivec2(0, k)).r) == 3) above++; else break; }
  float top = surf ? 16.0 * (1.0 - level) : 0.0;
  float depth = float(above) + (float(lp.y) - top) / 16.0;
  vec2 p = vec2(q) * 0.045 + vec2(time * 0.12, 0.0);
  float flow = fbm3(p + vec2(vnoise(p * 1.3 + time * 0.05, 161) * 1.5, 0.0), 167);
  // Stepped bands (review #16): white-hot skin, yellow, orange, deep red with depth.
  float heat = clamp(1.0 - depth / 2.6 + (flow - 0.5) * 0.35, 0.0, 1.0);
  float hb = floor(heat * 4.0 + bayer4(q) * 0.6) / 4.0;
  vec3 c = hb > 0.9 ? vec3(1.0, 0.94, 0.62) : hb > 0.6 ? vec3(1.0, 0.72, 0.25) : hb > 0.35 ? vec3(1.0, 0.42, 0.1) : hb > 0.1 ? vec3(0.75, 0.18, 0.04) : vec3(0.42, 0.07, 0.02);
  float e = hb > 0.9 ? 2.2 : hb > 0.6 ? 1.6 : hb > 0.35 ? 1.1 : hb > 0.1 ? 0.7 : 0.45;
  alb = c * 0.5; layer = 5.0; setEmi(s2l(c), e);
  // Few, large crust islands drifting on the upper part of the lake.
  if (depth < 1.6) {
    vec3 v = voro(vec2(q) * vec2(1.0, 1.6) + vec2(time * 2.5, 0.0), 22.0, 171);
    if (v.z > 0.8 && v.y - v.x > 2.5) {
      bool rimPx = v.y - v.x < 4.0;
      alb = rimPx ? vec3(0.5, 0.15, 0.04) : vec3(0.13, 0.05, 0.03);
      emi = s2l(rimPx ? vec3(1.0, 0.4, 0.1) : vec3(0.3, 0.06, 0.02)); emiK = rimPx ? 1.0 : 0.2;
    }
  }
  if (surf && lp.y <= int(top) + 1) { emi = s2l(vec3(1.0, 0.97, 0.8)); emiK = 2.4; alb = vec3(1.0, 0.95, 0.75); }
  flags |= UNLIT;
}

void main(){
  ivec2 ap = ivec2(gl_FragCoord.xy); ap.y = artH - 1 - ap.y;
  ivec2 wp = org + ap;
  ivec2 q = wp + ivec2(8192);
  ivec2 t = (q >> 4) - ivec2(512);
  ivec2 lp = q & 15;
  alb = vec3(0.0); layer = 0.0; emi = vec3(0.0); emiK = 0.0; nrm = vec2(0.0); flags = 0; ao = 1.0;
  uvec4 A = TA(t), B = TB(t);
  int bio = int(B.g);
  bool lift = LIFT(t);
  int kind = KIND(A.r);
  bool scanned = (B.r & F_SCANNED) != 0u;
  float scanK = 0.0;
  if (scan.w >= 0.0) { float d = length(vec2(t) + 0.5 - scan.xy); float pass = scan.w - d / 25.0; if (d < scan.z && pass >= 0.0 && pass < 1.2) scanK = 1.0 - pass / 1.2; }
  bool solid = kind == 1 || kind == 2;
  bool openPx = !solid;
  if (lift) { liftColumn(t, lp, q); }
  else {
    // Neighbours.
    bool sL = SOLID(t + ivec2(-1, 0)), sR = SOLID(t + ivec2(1, 0)), sU = SOLID(t + ivec2(0, -1)), sD = SOLID(t + ivec2(0, 1));
    if (t.y < 0) sU = sU && t.y > -SKYR;
    bool lL = LIFT(t + ivec2(-1, 0)), lR = LIFT(t + ivec2(1, 0));
    if (kind == 3) {
      // Lava, possibly part-filled from the bottom.
      float level = float(B.b) / 255.0; if (B.b == 0u) level = 1.0;
      int top = int(16.0 * (1.0 - level));
      bool surf = KIND(TA(t + ivec2(0, -1)).r) != 3;
      int wob = surf ? int(floor(sin(float(q.x) * 0.7 + time * 3.0) * 0.8 + 0.5)) : 0;
      if (lp.y >= top + wob) { lavaPx(q, lp, t, A.r, surf, level); openPx = false; }
      else openPx = true;
    } else if (solid) {
      bool und = kind == 2;
      int det = B8(MT(6, A.r).r), fl = B8(MT(6, A.r).b);
      bool dense = (fl & 1) != 0, cache = (fl & 8) != 0;
      uint m = cache ? (A.a != 0u && A.a != A.r ? A.a : uint(typical[clamp(bio, 0, 9)])) : A.r;
      if (cache) det = B8(MT(6, m).r);
      // Objects that do not fill their tile: pylons, the Seed (a sprite), loose boulders, geyser vents.
      bool shaped = false;
      vec2 c0 = vec2(lp) + 0.5 - vec2(8.0, 8.5);
      if (det == D_SEEDT) { openPx = true; shaped = true; }
      else if (det == D_PYLON) { shaped = true; openPx = !(lp.x >= 5 && lp.x <= 10 && lp.y >= 3); }
      else if (det == D_BOULDER) { shaped = true; openPx = length(c0 * vec2(1.0, 1.05)) > 7.0; }
      else if (det == D_CAP) {
        bool cl = TA(t + ivec2(-1, 0)).r == A.r, cr = TA(t + ivec2(1, 0)).r == A.r, cu = TA(t + ivec2(0, -1)).r == A.r;
        vec2 e = vec2(cl ? 99.0 : float(lp.x), cr ? 99.0 : float(15 - lp.x));
        float ex = min(e.x, e.y);
        if (!cu && ex < 5.0) { shaped = true; float dx = 5.0 - ex; openPx = float(lp.y) < dx * dx * 0.28 || (lp.y > 12 && ex < 2.0); if (!openPx) { int idx = lp.y < 3 ? 3 : 1; vec4 col = vec4(0.0); detail(det, A.r, q, lp, t, idx, col, false); alb = col.a > 0.0 ? col.rgb : PAL(A.r, idx); layer = 2.0; nrm = vec2(e.x < e.y ? -0.5 : 0.5, -0.4); } }
      }
      else if (det == D_VENT) { shaped = true; int hw = 6 - (16 - lp.y) / 3; openPx = !(lp.y >= 8 && abs(lp.x - 8) <= hw); }
      bool oL = !sL && !lL, oR = !sR && !lR, oU = !sU, oD = !sD;
      gOL = oL; gOR = oR; gOU = oU; gOD = oD;
      // Corner cuts: open corners are chiselled (rounder for boulders).
      // Rounded air corners (review 2 #10): a 4 px radius where two open faces meet.
      vec2 lc = vec2(lp) + 0.5;
      float cr = und ? 0.0 : 4.0;
      bool cutPx = (oL && oU && lc.x < cr && lc.y < cr && length(vec2(cr) - lc) > cr) || (oR && oU && lc.x > 16.0 - cr && lc.y < cr && length(vec2(16.0 - cr, cr) - lc) > cr)
                || (oL && oD && lc.x < cr && lc.y > 16.0 - cr && length(vec2(cr, 16.0 - cr) - lc) > cr) || (oR && oD && lc.x > 16.0 - cr && lc.y > 16.0 - cr && length(vec2(16.0 - cr) - lc) > cr);
      if (cutPx && !shaped) openPx = true;
      else if (shaped) {
        if (!openPx) {
          if (det == D_PYLON) hazard(3, t, lp, q, m, scanned);
          else if (det == D_BOULDER) {
            float r = length(c0 * vec2(1.0, 1.05));
            int k = r > 5.4 ? 0 : (c0.x + c0.y < -3.0 ? 3 : c0.x + c0.y < 2.0 ? 2 : 1);
            if (seg(vec2(lp) + 0.5, vec2(6.0, 4.0), vec2(9.0, 8.5)) < 0.6 || seg(vec2(lp) + 0.5, vec2(9.0, 8.5), vec2(8.0, 11.0)) < 0.6) k = 0;
            alb = PAL(m, k); layer = 5.0; nrm = normalize(c0 + 0.001) * min(1.0, r / 7.0) * 0.8;
            if (r > 6.0) { alb = mix(alb, WARN, 0.55); setEmi(s2l(WARN), 0.8 * (0.55 + 0.45 * sin(time * 5.0))); if (!scanned) flags |= NEEDLIT; }
          } else if (det == D_VENT) {
            alb = PAL(m, lp.y > 13 ? 1 : 0); layer = 5.0;
            if (lp.y >= 9 && abs(float(lp.x) - 7.5) < 1.6) { vec3 cc = MT(4, m).rgb; alb = cc; setEmi(s2l(cc), 0.8 + 0.6 * max(tellK(t, 6.0), 0.0) * 3.0); }
            if (abs(lp.x - 8) == 6 - (16 - lp.y) / 3 && lp.y >= 8) { alb = mix(alb, WARN, 0.6); setEmi(s2l(WARN), 0.8 * (0.55 + 0.45 * sin(time * 5.0))); }
                      }
        }
      }
      else {
        openPx = false;
        // Edge distance to the nearest open face and which side it is.
        int e = 99, side = -1;
        if (oL && lp.x < e) { e = lp.x; side = 0; }
        if (oU && lp.y < e) { e = lp.y; side = 2; }
        if (oR && 15 - lp.x < e) { e = 15 - lp.x; side = 1; }
        if (oD && 15 - lp.y < e) { e = 15 - lp.y; side = 3; }
        bool dUL = !SOLID(t + ivec2(-1, -1)) && !oL && !oU, dUR = !SOLID(t + ivec2(1, -1)) && !oR && !oU;
        bool dDL = !SOLID(t + ivec2(-1, 1)) && !oL && !oD, dDR = !SOLID(t + ivec2(1, 1)) && !oR && !oD;
        if (dUL && max(lp.x, lp.y) < e) { e = max(lp.x, lp.y); side = 2; }
        if (dUR && max(15 - lp.x, lp.y) < e) { e = max(15 - lp.x, lp.y); side = 2; }
        if (dDL && max(lp.x, 15 - lp.y) < e) { e = max(lp.x, 15 - lp.y); side = 3; }
        if (dDR && max(15 - lp.x, 15 - lp.y) < e) { e = max(15 - lp.x, 15 - lp.y); side = 3; }
        if (!und) {
          if (oL && oU && lc.x < 4.0 && lc.y < 4.0) { e = int(4.0 - length(vec2(4.0) - lc)); side = 2; }
          if (oR && oU && lc.x > 12.0 && lc.y < 4.0) { e = int(4.0 - length(vec2(12.0, 4.0) - lc)); side = 2; }
          if (oL && oD && lc.x < 4.0 && lc.y > 12.0) { e = int(4.0 - length(vec2(4.0, 12.0) - lc)); side = 3; }
          if (oR && oD && lc.x > 12.0 && lc.y > 12.0) { e = int(4.0 - length(vec2(12.0) - lc)); side = 3; }
        }
        // Body: world-space fbm in 4 bands.
        float v = fbm3(vec2(q) * (dense ? 0.15 : 0.11), int(m) * 13);
        int idx = v < 0.3 ? 0 : v < 0.55 ? 1 : v < 0.69 ? 2 : 3;
        // Topsoil (review 3 #9): a few broad strata with clean value steps, dithered only where two bands meet.
        if (bio == 0 && !und && !dense && !cache) {
          float sy = float(q.y) + vnoise(vec2(float(q.x) * 0.012, 3.0), 1601) * 28.0;
          float bw = 52.0, fb = sy / bw;
          int band = int(floor(fb));
          float fr = fract(fb);
          if (fr < 0.06 && bayer4(q) > fr / 0.06) band -= 1;
          int bi = int(hashu(uvec3(uint(band + 64), 1602u, 0u)) % 3u);
          idx = bi == 0 ? 1 : bi == 1 ? 2 : 1;
          if (vnoise(vec2(q) * 0.06, 1603) > 0.72) idx = bi == 1 ? 1 : 2;
        }
        vec4 col = vec4(0.0);
        if (!und) detail(det, m, q, lp, t, idx, col, dense);
        if (bio == 0 && col.a > 0.0 && !und) col.rgb = mix(PAL(m, idx), col.rgb, 0.45);   // small, low-contrast life in the dirt
        // Dense rock is the biome's rock, tougher: its own laminae over the typical palette, never near-black (review 2 #2).
        uint pm = dense ? uint(typical[clamp(bio, 0, 9)]) : m;
        // Dithered transitions into a different neighbouring rock (review 2 #10).
        if (!und && !dense && !cache) {
          float bq = bayer4(q);
          uint mL = TA(t + ivec2(-1, 0)).r, mR = TA(t + ivec2(1, 0)).r, mU = TA(t + ivec2(0, -1)).r, mD = TA(t + ivec2(0, 1)).r;
          // 8 px of dithered blend into a different neighbour, so rock variants never form a quilt (review 3 #4).
          float wob = vnoise(vec2(q) * 0.15, 981) * 4.0;
          if (lp.x < 8 && mL != m && KIND(mL) == 1 && (B8(MT(6, mL).b) & 9) == 0 && bq < (8.0 - float(lp.x) + wob - 2.0) / 16.0) pm = mL;
          else if (lp.x > 7 && mR != m && KIND(mR) == 1 && (B8(MT(6, mR).b) & 9) == 0 && bq < (float(lp.x) - 7.0 + wob - 2.0) / 16.0) pm = mR;
          else if (lp.y < 8 && mU != m && KIND(mU) == 1 && (B8(MT(6, mU).b) & 9) == 0 && bq < (8.0 - float(lp.y) + wob - 2.0) / 16.0) pm = mU;
          else if (lp.y > 7 && mD != m && KIND(mD) == 1 && (B8(MT(6, mD).b) & 9) == 0 && bq < (float(lp.y) - 7.0 + wob - 2.0) / 16.0) pm = mD;
        }
        alb = col.a > 0.0 ? col.rgb : PAL(pm, idx);
        // Calm the body: lit rock reads as one material, not camouflage.
        if (!und && col.a == 0.0) alb = mix(PAL(pm, 1), alb, 0.62);
        if (dense && col.a == 0.0) { alb *= 0.9; if (seg(vec2(lp), vec2(2.0, 3.0 + h2(t, 41) * 6.0), vec2(13.0, 6.0 + h2(t, 42) * 6.0)) < 0.5) alb = PAL(pm, 0); }
        if (det == D_GLASS) { float gl0 = dot(alb, vec3(0.299, 0.587, 0.114)); alb = mix(vec3(gl0), alb, 0.42) * vec3(1.05, 0.92, 0.95); }
        // The Seed's roots reach up through the core's rock, thicker and brighter toward the chamber (review 2 #7).
        if (bio == 6 && !dense && !cache) {
          float deep = smoothstep(690.0, 760.0, float(t.y));
          vec2 dv = vec2(q - 8192) - seedW;
          float ra = atan(dv.y, dv.x), rr = length(dv);
          // Few thick roots (review 3 #3): px distance to one of 6 wandering spokes, a slow amber pulse travelling down them.
          float wob = sin(rr * 0.011 + ra * 2.0) * 0.18 + (vnoise(vec2(q) * 0.02, 991) - 0.5) * 0.25;
          float sp = abs(sin((ra + wob) * 3.0)) / 3.0 * rr;
          float wdt = 2.0 + 3.0 * deep;
          if (sp < wdt && dv.y < 120.0) {
            float k = sp / wdt;
            alb = k > 0.6 ? vec3(0.2, 0.1, 0.075) : vec3(0.13, 0.055, 0.045);
            if (k < 0.35) {
              float pulse = fract(rr / 360.0 + time * 0.14);
              float band = smoothstep(0.0, 0.06, pulse) * (1.0 - smoothstep(0.06, 0.2, pulse));
              setEmi(vec3(1.0, 0.6, 0.25), (0.06 + 0.12 * deep) + band * (0.35 + 0.4 * deep));
            }
            col.a = 1.0;
          }
        }
        // Strata that run across tiles, and the biome's rock grade (desaturated, never an ore's hue).
        if (!und) {
          alb *= 0.93 + 0.1 * vnoise(vec2(float(q.x) * 0.012, float(q.y) * 0.11), 977);
          vec2 rg = rockGrade[clamp(bio, 0, 9)];
          float gl = dot(alb, vec3(0.299, 0.587, 0.114));
          if (emiK == 0.0) alb = mix(vec3(gl), alb, rg.x) * rg.y;
          if (det == D_HEX && emiK == 0.0) alb *= 1.0;   // basalt: near-black, its seams glow
        }
        if (und) {
          bool nL = KIND(TA(t + ivec2(-1, 0)).r) == 2, nR = KIND(TA(t + ivec2(1, 0)).r) == 2, nU = KIND(TA(t + ivec2(0, -1)).r) == 2, nD = KIND(TA(t + ivec2(0, 1)).r) == 2;
          if (t.x <= 0) nL = true; if (t.x >= WC - 1) nR = true;
          vec2 un; alb = undigPlate(m, uint(typical[clamp(bio, 0, 9)]), q, lp, nL, nR, nU, nD, un); nrm = un;
          if (gBolt) setEmi(vec3(0.7, 0.75, 0.8), 0.18);
        }
        layer = und ? 3.0 : 2.0;
        if (planet == 1 && bio == 0 && !und) alb *= vec3(0.42, 0.38, 0.36);
        if (planet == 2 && !und) { float l = dot(alb, vec3(0.299, 0.587, 0.114)); alb = mix(vec3(l), alb, 0.85) * vec3(1.06, 0.97, 0.9); }

        if (det == D_CRYSTAL || det == D_GLASS) flags |= TRANSL;
        // Bevel: the lip that says "dig here"; undiggable gets a hard outline instead.
        bool core = bio == 6;
        if (und) {
          if (alb.r < 0.04) flags |= UNLIT;
        } else {
          bool lightSide = side == 0 || side == 2;
          bool loose = (fl & 4) != 0;
          // Autotiled faces (review 2 #1): a 1 px dark outline on every open face, then a lit lip on top faces, shade below.
          vec3 dk = PAL(pm, 0) * 0.42, lt = mix(PAL(pm, 3), vec3(1.0), 0.12);
          // ...and a lit 1 px rim on EVERY face that meets air (review 3 #1): brightest on top, still clearly lit below.
          if (e == 0) alb = dk;
          else if (e == 1) alb = side == 2 ? lt : side == 3 ? mix(PAL(pm, 2), lt, 0.35) : mix(PAL(pm, 2), lt, 0.6);
          else if (e == 2 && side == 2) alb = PAL(pm, 2);

          // Grass on the surface row.
          if (t.y == 0 && oU && bio == 0 && lp.y < 2 + int(h2(ivec2(q.x, 3), 5) * 2.0)) alb = lp.y == 0 || h2(q, 4) > 0.6 ? vec3(0.561, 0.784, 0.353) : vec3(0.373, 0.62, 0.227);
        }
        if (e < 3 && side >= 0 && !und) {
          vec2 dirs[4] = vec2[4](vec2(-1.0, 0.0), vec2(1.0, 0.0), vec2(0.0, -1.0), vec2(0.0, 1.0));
          nrm = dirs[side] * (0.75 * (1.0 - float(e) / 3.0));
        }
        // Lining where the Lift column cut clean.
        if ((lL && lp.x == 0) || (lR && lp.x == 15)) { alb = vec3(0.243, 0.275, 0.314); nrm = vec2(0.0); }
        // Finds: ores, jackpots, artifacts (find layer), caches (material).
        uint f = A.g;
        if (cache) f = uint(B8(MT(7, A.r).g));
        if (f != 0u && !und) {
          drawFind(f, t, lp, m, bio, scanned, (B.r & 64u) != 0u, scanK);
          if (B8(FT(6, f).b) == 1) jackpotFx(t, lp, f);
        }
        // Hazards.
        if (A.b != 0u) hazard(int(A.b), t, lp, q, m, scanned);
        // The dig: cracks from the contact edge, dense resists.
        if (t == dig.xy && digP > 0.0) {
          float cm = crackMask(t, lp, dig.z, digP, dense);
          if (cm >= 1.0) alb *= dense ? 0.15 : 0.25; else if (cm > 0.0 && lp.y > 0) alb = mix(alb, PAL(m, 3), 0.35);
        }
        // Too hard (D11): within 2 tiles of the pod, a sparse dot hatch on rock the drill cannot dig.
        if (!und && length(vec2(t) + 0.5 - pod) < 2.6) {
          int hb = B8(MT(7, A.r).r) + (A.g != 0u ? 4 : 0);
          if (hb > drillB && (q.x & 3) == 0 && (q.y & 3) == 0) alb *= 0.65;
        }
      }
    }
    if (openPx && !lift) {
      if (t.y < 0) {
        // Sky: grass blades lean over the surface row; the sky itself is drawn behind.
        if (t.y == -1 && lp.y >= 13 && SOLID(t + ivec2(0, 1)) && int(TB(t + ivec2(0, 1)).g) == 0) {
          int sway = int(floor(sin(time * 1.3 + float(q.x) * 0.4) * 0.6 + 0.5));
          ivec2 bq = ivec2(q.x - (lp.y == 13 ? sway : 0), 0);
          float hb = h2(bq, 15);
          int hgt = hb > 0.8 ? 3 : hb > 0.5 ? 2 : hb > 0.25 ? 1 : 0;
          if (15 - lp.y < hgt) { alb = hb > 0.7 ? vec3(0.561, 0.784, 0.353) : vec3(0.373, 0.62, 0.227); layer = 2.0; nrm = vec2(0.0, -0.3); }
        }
      } else backWall(t, lp, q, A.a, bio, sL, sR, sU, sD);
    }
  }
  g0 = vec4(clamp(alb, 0.0, 1.0), layer / 8.0);
  g1 = vec4(l2s(emi), clamp(emiK / 8.0, 0.0, 1.0));
  g2 = vec4(nrm * 0.5 + 0.5, float(flags) / 255.0, ao);
}`;
