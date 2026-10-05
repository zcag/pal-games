// The other passes of art.md 2: light accumulation (base + instanced dynamic lights with soft occlusion),
// resolve, sky and parallax, sprites into the G-buffer, particles, bloom and the final device-res pass.
import { HEAD, LIB } from "./glsl.ts";

const ART = `
uniform ivec2 org; uniform int artH;
ivec2 artPx(){ ivec2 a = ivec2(gl_FragCoord.xy); a.y = artH - 1 - a.y; return a; }
`;

// ---------------------------------------------------------------- light (pass 5)

export const LIGHT_BASE_FS = HEAD + LIB + ART + `
uniform sampler2D g0T, g2T, skyG, emitG, ambT, floorT;
uniform vec3 dayAmb; uniform vec2 podT; uniform float nightK;
uniform vec4 grid;          // origin col, origin row, cols, rows
uniform vec3 sunCol, sunDir; uniform float sunK;
uniform vec3 pulse;         // world row of the band, strength, chamber glow
uniform float time;
out vec4 o;
void main(){
  ivec2 ap = artPx();
  vec2 wp = vec2(org + ap) + 0.5, tp = wp / 16.0;
  ivec2 fp = ivec2(gl_FragCoord.xy);
  vec4 g2 = texelFetch(g2T, fp, 0);
  vec3 amb = texture(ambT, vec2(0.5, (tp.y + float(SKYR)) / float(HR + SKYR))).rgb;
  vec2 gu = (tp - grid.xy) / grid.zw;
  int layer = int(texelFetch(g0T, fp, 0).a * 8.0 + 0.5);
  // Daylight down a shaft hazes the air: back walls take it at 5x (they take a fraction of other light).
  vec3 sk = texture(skyG, gu).rgb;
  vec3 L = amb * (0.6 + 0.4 * g2.a) + sk + texture(emitG, gu).rgb;
  // Daylight (or moonlight) reaches ~8 tiles down from the surface, fading; then the per-biome floor keeps every tile visible.
  if (tp.y > -1.0) L += dayAmb * (1.0 - smoothstep(0.0, 9.0, tp.y)) * (layer == 1 ? 0.6 : 1.0);
  vec3 fl = texture(floorT, vec2(0.5, (max(tp.y, 0.0) + float(SKYR)) / float(HR + SKYR))).rgb;
  // ...easing to 60 % toward the screen edge: darkness is a vignette, not a wall 3 tiles from the pod.
  fl *= 1.0 - 0.4 * smoothstep(5.0, 14.0, length(tp - podT));
  fl *= 1.0 - 0.8 * nightK * (1.0 - smoothstep(2.0, 12.0, tp.y));   // night reaches the first tiles of ground too
  if (layer >= 2 && layer <= 5) L = max(L, fl * (0.8 + 0.2 * g2.a));
  vec2 n = g2.rg * 2.0 - 1.0;
  vec3 N = vec3(n, sqrt(max(0.05, 1.0 - dot(n, n))));
  if (sunK > 0.0) {
    float k = sunK * (1.0 - smoothstep(-1.0, 2.0, tp.y));
    L += sunCol * k * (0.45 + 0.55 * max(dot(N, sunDir), 0.0));
  }
  if (pulse.y > 0.0) {
    float d = abs(wp.y - pulse.x * 16.0);
    L += vec3(1.0, 0.7, 0.36) * 1.5 * pulse.y * (d < 1.5 ? 1.0 : exp(-(d - 1.5) * 0.15) * 0.35);
  }
  L += vec3(1.0, 0.8, 0.55) * pulse.z;
  // The Seed's warmth rises through the core from below (review 3 #3).
  L += vec3(0.5, 0.22, 0.08) * 0.12 * smoothstep(690.0, 770.0, tp.y) * (0.6 + 0.4 * max(0.0, n.y + 0.4));
  // alpha: daylight in open air, as slanted rays that drift slowly (shaft haze).
  float rays = 0.35 + 0.65 * smoothstep(0.35, 0.75, vnoise(vec2(wp.x * 0.07 + wp.y * 0.035, time * 0.08), 1301));
  o = vec4(L, layer == 1 ? lum(sk) * rays : 0.0);
}`;

/** One instanced quad per dynamic light, additive. L0: x, y (tiles), cone radius, I. L1: rgb, half-angle. L2: dir, omni r, omni I. */
export const LIGHT_VS = `#version 300 es
in vec4 aL0; in vec4 aL1; in vec4 aL2;
uniform ivec2 org; uniform vec2 art;
flat out vec4 v0; flat out vec4 v1; flat out vec4 v2;
void main(){
  int id = gl_VertexID;
  vec2 c = vec2(id == 1 || id == 2 || id == 4 ? 1.0 : 0.0, id == 2 || id == 4 || id == 5 ? 1.0 : 0.0) * 2.0 - 1.0;
  float R = max(aL0.z, aL2.y);
  vec2 p = aL0.xy * 16.0 + c * R * 16.0 - vec2(org);
  gl_Position = vec4(p.x / art.x * 2.0 - 1.0, 1.0 - p.y / art.y * 2.0, 0.0, 1.0);
  v0 = aL0; v1 = aL1; v2 = aL2;
}`;

export const LIGHT_FS = HEAD + LIB + ART + `
uniform sampler2D g2T, densT;
uniform float mu, r0; uniform int maxSteps;
flat in vec4 v0; flat in vec4 v1; flat in vec4 v2;
out vec4 o;
float att(float d, float R){ float w = clamp(1.0 - pow(d / R, 4.0), 0.0, 1.0); w *= w; float q = d / max(r0, R * 0.22); return w / (1.0 + q * q); }
void main(){
  ivec2 ap = artPx();
  vec2 wp = vec2(org + ap) + 0.5;
  vec2 Lp = v0.xy * 16.0;
  vec2 dv = wp - Lp;
  float dpx = length(dv), d = dpx / 16.0;
  float cone = 0.0;
  if (v0.z > 0.0 && d < v0.z) {
    float k = 1.0;
    if (v1.w > 0.0) { vec2 dir = vec2(cos(v2.x), sin(v2.x)); float ca = dot(dir, dv / max(dpx, 1e-3)); k = smoothstep(cos(v1.w + 0.1396), cos(v1.w), ca); if (dpx < 6.0) k = max(k, 0.5); }
    cone = v0.w * att(d, v0.z) * k;
  }
  float omni = v2.y > 0.0 && d < v2.y ? v2.z * att(d, v2.y) : 0.0;
  float I = cone + omni;
  if (I < 1e-4) discard;
  // Soft occlusion: march toward the light through the linear density map.
  int steps = clamp(int(ceil(d * 2.0)), 2, maxSteps);
  float sum = 0.0, sl = dpx / float(steps);
  for (int i = 0; i < 12; i++) {
    if (i >= steps) break;
    float tt = (float(i) + 0.5) / float(steps);
    if (tt * dpx < 2.0) continue;
    vec2 p = mix(wp, Lp, tt) / 16.0;
    sum += texture(densT, vec2(p.x / float(WC), (p.y + float(SKYR)) / float(HR + SKYR))).r * sl;
  }
  float T = exp(-mu * sum);
  vec4 g2 = texelFetch(g2T, ivec2(gl_FragCoord.xy), 0);
  vec2 n = g2.rg * 2.0 - 1.0;
  vec3 N = vec3(n, sqrt(max(0.05, 1.0 - dot(n, n))));
  float ndl = 0.55 + 0.45 * max(dot(N, normalize(vec3(Lp - wp, 12.0))), 0.0);
  o = vec4(v1.rgb * I * T * ndl, 0.0);
}`;

// ---------------------------------------------------------------- resolve (pass 6)

export const RESOLVE_FS = HEAD + LIB + `
uniform sampler2D g0T, g1T, g2T, lightT;
uniform float floorK[8]; uniform vec3 airK; uniform float backK;
uniform sampler2D floorT; uniform ivec2 org; uniform int artH;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 g0 = texelFetch(g0T, p, 0);
  int layer = int(g0.a * 8.0 + 0.5);
  if (layer == 0) { o = vec4(0.0); return; }
  vec4 g1 = texelFetch(g1T, p, 0), g2 = texelFetch(g2T, p, 0);
  vec4 Lt = texelFetch(lightT, p, 0);
  vec3 L = Lt.rgb;
  int fl = int(g2.b * 255.0 + 0.5);
  vec3 a = s2l(g0.rgb);
  if ((fl & 8) != 0) L = vec3(0.0);
  // Tells and glints answer to real light (lamp, emitters), not to the ambient floor.
  float wy = float(org.y + artH - 1 - p.y) / 16.0;
  vec3 flo = texture(floorT, vec2(0.5, (max(wy, 0.0) + float(SKYR)) / float(HR + SKYR))).rgb;
  float ll = lum(max(L - flo, 0.0));
  // The pod keeps its colours: its light is clamped and only 20 % tinted (review #3).
  if (layer == 6) { float pl = clamp(lum(L), 0.6, 1.25); L = pl * mix(vec3(1.0), L / max(lum(L), 1e-3), 0.2); }
  vec3 e = s2l(g1.rgb) * g1.a * 8.0;
  if ((fl & 1) != 0) e *= smoothstep(0.22, 0.32, ll);
  if ((fl & 2) != 0) e *= smoothstep(0.08, 0.16, ll);
  if ((fl & 4) != 0) e *= 1.0 - smoothstep(0.08, 0.25, ll);
  if ((fl & 32) != 0) e += a * 0.04 * (1.0 + ll);
  // Light falls off in stepped half-stop bands with an ordered dither (review #16): pixel bands, never a smooth blur.
  { float l0 = lum(L); if (l0 > 0.004 && layer != 6) { float st = floor(log2(l0) * 2.5 + 0.2 + bayer4(p) * 0.6) / 2.5; L *= exp2(st) / l0; } }
  // Back walls sit recessed behind the rock face: they take a third of the light (R11 keeps tunnels the darkest
  // thing you act near), while the air in front of them scatters a little of it, so beams and glows read in caves.
  vec3 c = a * L * (layer == 1 ? backK : 1.0) + e;
  if (layer == 1) c += min(L, vec3(1.2)) * airK + vec3(1.0, 0.9, 0.7) * Lt.a * 0.16;
  float fk = floorK[layer];
  if ((fl & 16) != 0) fk = max(fk, 0.55);
  c = max(c, a * fk);
  o = vec4(c, 1.0);
}`;

// ---------------------------------------------------------------- sky (pass 1)

export const SKY_FS = HEAD + LIB + ART + `
uniform vec3 zen, hor, sunC, moonC, cloudDay, fogC;
uniform vec2 sunP, moonP;   // art buffer px
uniform float sunK, moonK, starK, night, time, camX, fogK, moonPh, shoot;
uniform vec3 mtn0, mtn1, mtn2, ridge;
uniform vec2 art;
out vec4 o;
float ridgeH(float x, float s, float h){ return h * (0.35 + 0.65 * fbm3(vec2(x * 0.011, 0.5), int(s))) + h * 0.25 * vnoise(vec2(x * 0.06, 1.5), int(s) + 9); }
void main(){
  ivec2 ap = artPx();
  vec2 wp = vec2(org + ap);
  float alt = clamp(-wp.y / 224.0, 0.0, 1.0);
  float y = pow(alt, 0.6);
  float qy = clamp(floor(y * 12.0 + bayer4(ap) - 0.25) / 12.0, 0.0, 1.0);
  vec3 c = mix(hor, zen, qy);
  float skyL = lum(c);
  // Stars (screen-fixed, a little parallax), twinkling; 1 in 40 is 2x2 and tinted.
  if (starK > 0.0) {
    ivec2 sp = ap + ivec2(int(camX * 1.2), 0) + ivec2(512);
    ivec2 big = sp >> 1;
    float hs = h2(sp, 1001), hb = h2(big, 1003);
    float vis = starK * smoothstep(0.1, 0.02, skyL) * smoothstep(0.0, 0.25, alt);
    if (hs > 0.997) c += vec3(0.9, 0.92, 1.0) * vis * (0.6 + 0.4 * sin(time * (1.0 + 3.0 * h2(sp, 1002)) + hs * 90.0)) * 1.6;
    else if (hb > 0.99925) c += (h2(big, 1004) > 0.5 ? vec3(1.0, 0.82, 0.63) : vec3(0.63, 0.78, 1.0)) * vis * 2.0;
    // a shooting star
    if (shoot > 0.0) {
      vec2 s0 = vec2(float(int(h2(ivec2(int(time / 60.0), 3), 1009) * 300.0)) + 40.0, 30.0);
      vec2 head = s0 + vec2(1.0, 0.45) * shoot * 140.0;
      vec2 dd = vec2(ap) - head; float along = -dot(dd, normalize(vec2(1.0, 0.45)));
      float across = abs(dot(dd, normalize(vec2(-0.45, 1.0))));
      if (across < 0.7 && along > 0.0 && along < 14.0) c += vec3(1.0) * (1.0 - along / 14.0) * 2.0 * vis * (1.0 - shoot);
    }
  }
  // Moon: 8 px disc with 2 craters and a phase; sun: 12 px disc HDR 4 and a halo.
  vec2 dm = vec2(ap) + 0.5 - moonP;
  if (moonK > 0.0) {
    float r = length(dm);
    c += moonC * moonK * 0.25 * exp(-r / 10.0);
    if (r < 4.2) {
      float lit = step(moonPh * 8.4 - 4.2, dm.x * (moonPh > 0.5 ? -1.0 : 1.0) + 0.0);
      vec3 mc = moonC * 1.2 * moonK;
      if (ivec2(floor(dm)) == ivec2(1, -2) || ivec2(floor(dm)) == ivec2(-2, 1)) mc *= 0.7;
      c = mix(c, mc, mix(0.25, 1.0, lit));
    }
  }
  vec2 ds = vec2(ap) + 0.5 - sunP;
  if (sunK > 0.0) {
    float r = length(ds);
    c += sunC * sunK * (0.55 * exp(-r / 14.0) + 0.25 * exp(-r / 50.0));
    if (r < 6.2) c = sunC * (r < 4.5 ? 5.0 : 3.2) * sunK + c * 0.2;
  }
  // Clouds: two thresholded fbm layers, drifting 2 and 4 art px/s; lit on top by the sun, a 2 px shade underneath.
  for (int k = 0; k < 2; k++) {
    float spd = k == 0 ? 2.0 : 4.0, par = k == 0 ? 0.08 : 0.16;
    float band = k == 0 ? 160.0 : 110.0, thick = k == 0 ? 22.0 : 16.0;
    vec2 p = vec2(float(ap.x) + camX * 16.0 * par + time * spd, -wp.y);
    vec2 sc = vec2(0.018, 0.05) * (k == 0 ? 1.0 : 1.3);
    float shape = 1.0 - abs(-wp.y - band) / thick;
    float n = fbm3(p * sc, 1100 + k * 7) + shape * 0.35;
    float nUp = fbm3((p + vec2(0.0, 2.0)) * sc, 1100 + k * 7) + (1.0 - abs(-wp.y + 2.0 - band) / thick) * 0.35;
    float nDn = fbm3((p - vec2(0.0, 2.0)) * sc, 1100 + k * 7) + (1.0 - abs(-wp.y - 2.0 - band) / thick) * 0.35;
    if (n > 0.78) {
      vec3 base = mix(mix(vec3(1.0), hor, 0.45), vec3(0.035, 0.04, 0.075), night);
      vec3 lit = mix(base, sunC * 1.4 + hor * 0.2, (1.0 - night) * 0.65);
      vec3 cc = base;
      if (nDn <= 0.78) cc = lit;                 // the top edge catches the sun
      else if (nUp <= 0.78) cc = base * 0.72;    // the underside
      c = mix(c, cc, k == 0 ? 0.8 : 0.95);
    }
  }
  // The horizon glows under a low sun.
  if (sunK > 0.0) {
    float lowSun = 1.0 - smoothstep(10.0, 90.0, -(sunP.y + float(org.y)));
    float dx = abs(float(ap.x) - sunP.x);
    c += sunC * lowSun * 0.9 * exp(-dx / 90.0) * exp(-max(0.0, -wp.y) / 40.0);
  }
  // Distant mesas: flat-topped, stepped, the farthest parallax plane (review 2 #14).
  {
    float x = float(ap.x) + camX * 16.0 * 0.07 + 917.0;
    float cell = floor(x / 140.0), lx = mod(x, 140.0), hc = h2(ivec2(int(cell) + 4096, 3), 1250);
    float w = 60.0 + hc * 60.0, h = 52.0 + hc * 34.0;
    float side = min(lx, w - lx);
    float mh = lx < w ? (side < 10.0 ? h * (side / 10.0) * 0.6 + h * 0.4 * step(4.0, side) : h - (side > 25.0 && hc > 0.6 ? 6.0 : 0.0)) : 0.0;
    if (-wp.y < mh) { c = mix(mtn0, hor, 0.35); if (-wp.y > mh - 1.0) c = mix(c, ridge, 0.35); }
  }
  // The Seed's glow on the horizon at night, below the town: a faint warm dome (review 2 #14).
  c += vec3(1.0, 0.6, 0.3) * 0.06 * night * exp(-max(0.0, -wp.y) / 30.0) * exp(-abs(float(ap.x) - 0.5 * float(int(art.x))) / 160.0);
  // Birds by day: small V shapes drifting across.
  if (night < 0.5) for (int k = 0; k < 5; k++) {
    float bx = mod(time * (6.0 + float(k)) + float(k) * 97.0, art.x + 60.0) - 30.0, by = 30.0 + float(k) * 9.0 + sin(time * 0.7 + float(k)) * 4.0;
    vec2 d = vec2(ap) - vec2(bx, by);
    float flap = mod(floor(time * 4.0 + float(k)), 2.0);
    if (abs(d.y + (flap > 0.5 ? abs(d.x) * 0.5 : -abs(d.x) * 0.3)) < 0.6 && abs(d.x) < 2.5) c = mix(c, vec3(0.04, 0.05, 0.07), 0.8);
  }
  // Three parallax mountain layers.
  vec3 ms[3] = vec3[3](mtn0, mtn1, mtn2);
  float pars[3] = float[3](0.15, 0.3, 0.5), hs[3] = float[3](40.0, 28.0, 18.0);
  for (int k = 0; k < 3; k++) {
    float x = float(ap.x) + camX * 16.0 * pars[k] + float(k) * 333.0;
    float h = ridgeH(x, float(1200 + k * 11), hs[k]) + (k == 0 ? 10.0 : 0.0);
    if (-wp.y < h) {
      c = ms[k];
      if (k == 2 && -wp.y > h - 1.0) c = mix(ms[k], ridge, 0.6);
      if (k == 1 && -wp.y > h - 1.0) c = mix(ms[k], ridge, 0.25);
    }
  }
  c = mix(c, fogC, fogK);
  o = vec4(c, 1.0);
}`;

// ---------------------------------------------------------------- sprites (passes 3-4)

/** Instanced sprite quads into the G-buffer. aDst: art-buffer px rect; aSrc: atlas px rect; aA: flip, layer, emis, palette mode;
 *  aB: tint rgb, tint amount; aC: palette id, flags or, alpha cut, unused. */
export const SPRITE_VS = `#version 300 es
in vec4 aDst; in vec4 aSrc; in vec4 aA; in vec4 aB; in vec4 aC;
uniform vec2 art;
out vec2 vUv; flat out vec4 vA; flat out vec4 vB; flat out vec4 vC;
void main(){
  int id = gl_VertexID;
  vec2 c = vec2(id == 1 || id == 2 || id == 4 ? 1.0 : 0.0, id == 2 || id == 4 || id == 5 ? 1.0 : 0.0);
  vec2 p = aDst.xy + c * aDst.zw;
  gl_Position = vec4(p.x / art.x * 2.0 - 1.0, 1.0 - p.y / art.y * 2.0, 0.0, 1.0);
  vUv = aSrc.xy + vec2(aA.x > 0.5 ? 1.0 - c.x : c.x, c.y) * aSrc.zw;
  vA = aA; vB = aB; vC = aC;
}`;

export const SPRITE_FS = HEAD + LIB + `
layout(location = 0) out vec4 g0;
layout(location = 1) out vec4 g1;
layout(location = 2) out vec4 g2;
uniform sampler2D albT, emiT, nrmT, matT, findT;
uniform float night, time;
in vec2 vUv; flat in vec4 vA; flat in vec4 vB; flat in vec4 vC;
void main(){
  ivec2 ip = ivec2(floor(vUv));
  vec4 a = texelFetch(albT, ip, 0);
  if (a.a < 0.5) discard;
  vec4 e = texelFetch(emiT, ip, 0), n = texelFetch(nrmT, ip, 0);
  vec3 col = a.rgb;
  int pm = int(vA.w + 0.5), pid = int(vC.x + 0.5);
  if (pm > 0) {
    int idx = int(a.r * 255.0 + 0.5);
    if (idx >= 8) col = vec3(0.043, 0.051, 0.071);
    else col = pm == 1 ? texelFetch(matT, ivec2(pid, min(idx, 3)), 0).rgb : texelFetch(findT, ivec2(pid, min(idx, 5)), 0).rgb;
  }
  int nflags = int(n.a * 255.0 + 0.5);
  if ((nflags & 8) == 0) col = mix(col, vB.rgb, min(vB.a, min(vB.r, min(vB.g, vB.b)) > 0.9 ? 0.2 : 0.3));   // hit tints never erase the pod or its outline
  int grp = int(n.b * 255.0 + 0.5);
  float ek = e.a * 8.0;
  if (grp == 1) ek *= night;
  else if (grp == 2) ek *= vA.z;
  else if (grp == 3) { int wid = int(a.a * 255.0 + 0.5) - 128; float per = 20.0 + 40.0 * h2(ivec2(wid, 7), 3); float fl = h2(ivec2(wid, int(time / per)), 11); ek *= night * (fl > 0.15 ? 1.0 : 0.0); }
  int flags = int(n.a * 255.0 + 0.5) | int(vC.y + 0.5);
  vec2 nn = n.rg * 2.0 - 1.0;
  if (vA.x > 0.5) nn.x = -nn.x;
  g0 = vec4(col, vA.y / 8.0);
  g1 = vec4(e.rgb, clamp(ek / 8.0, 0.0, 1.0));
  g2 = vec4(nn * 0.5 + 0.5, float(flags) / 255.0, 1.0);
}`;

// ---------------------------------------------------------------- particles (pass 7)

/** Reads the shared Particles layout (view.ts): stride 16 floats. */
export const PART_VS = `#version 300 es
in vec2 aPos; in vec2 aLife; in float aSize; in vec4 aCol; in vec2 aHF;
uniform ivec2 org; uniform vec2 art;
out vec4 vCol; flat out float vHdr; flat out int vFl; flat out float vSize;
void main(){
  int fl = int(aHF.y + 0.5);
  float k = aLife.y > 0.0 ? clamp(aLife.x / aLife.y, 0.0, 1.0) : 1.0;
  float size = aSize;
  if ((fl & 16) != 0) size = max(1.0, floor(size * k + 0.5));
  size = max(1.0, floor(size + 0.5));
  vec2 p = floor(aPos * 16.0) - vec2(org) + size * 0.5 - floor(size * 0.5);
  gl_Position = vec4(p.x / art.x * 2.0 - 1.0, 1.0 - p.y / art.y * 2.0, 0.0, 1.0);
  if (aLife.x <= 0.0) gl_Position = vec4(-9.0);
  gl_PointSize = size;
  vCol = aCol; if ((fl & 8) != 0) vCol.a *= k;
  vHdr = aHF.x; vFl = fl; vSize = size;
}`;

export const PART_FS = HEAD + LIB + `
uniform sampler2D g0T, lightT;
in vec4 vCol; flat in float vHdr; flat in int vFl; flat in float vSize;
out vec4 o;
void main(){
  ivec2 fp = ivec2(gl_FragCoord.xy);
  int under = int(texelFetch(g0T, fp, 0).a * 8.0 + 0.5);
  if ((vFl & 4) != 0 && under >= 2 && under <= 5) discard;
  float a = vCol.a;
  if (under == 6) a *= 0.35;   // effects stay behind and dimmer than the pod
  if (vSize > 5.0) { // big soft blobs (clouds): a dithered disc
    float r = length(gl_PointCoord - 0.5) * 2.0;
    a *= clamp(1.0 - r * r, 0.0, 1.0);
    if (a < bayer4(fp) * 0.5) discard;
    a = min(a * 1.5, vCol.a);
  }
  vec3 c = s2l(vCol.rgb);
  if ((vFl & 1) != 0) { o = vec4(c * max(vHdr, 1.0) * a, 0.0); return; }
  vec3 L = texelFetch(lightT, fp, 0).rgb;
  o = vec4(c * (L + vHdr) * a, a);
}`;

// ---------------------------------------------------------------- bloom (pass 8), Vortex's chain

export const PREFILTER_FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o; uniform sampler2D src; uniform vec2 texel; uniform float threshold;
void main(){
  vec3 c = vec3(0.0);
  c += texture(src, uv + texel * vec2(-0.5, -0.5)).rgb; c += texture(src, uv + texel * vec2(0.5, -0.5)).rgb;
  c += texture(src, uv + texel * vec2(-0.5, 0.5)).rgb; c += texture(src, uv + texel * vec2(0.5, 0.5)).rgb;
  c *= 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - threshold + 0.5, 0.0, 1.0); soft = soft * soft * 0.5;
  float w = max(soft, br - threshold) / max(br, 1e-4);
  o = vec4(min(c * w, vec3(64.0)), 1.0);
}`;
export const DOWN_FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o; uniform sampler2D src; uniform vec2 texel;
void main(){
  vec3 c = texture(src, uv).rgb * 4.0;
  c += texture(src, uv + texel * vec2(-1.0, -1.0)).rgb; c += texture(src, uv + texel * vec2(1.0, -1.0)).rgb;
  c += texture(src, uv + texel * vec2(-1.0, 1.0)).rgb; c += texture(src, uv + texel * vec2(1.0, 1.0)).rgb;
  o = vec4(c / 8.0, 1.0);
}`;
export const UP_FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o; uniform sampler2D src; uniform vec2 texel; uniform float gain;
void main(){
  vec3 c = vec3(0.0);
  c += texture(src, uv + texel * vec2(-2.0, 0.0)).rgb; c += texture(src, uv + texel * vec2(2.0, 0.0)).rgb;
  c += texture(src, uv + texel * vec2(0.0, -2.0)).rgb; c += texture(src, uv + texel * vec2(0.0, 2.0)).rgb;
  c += texture(src, uv + texel * vec2(-1.0, -1.0)).rgb * 2.0; c += texture(src, uv + texel * vec2(1.0, -1.0)).rgb * 2.0;
  c += texture(src, uv + texel * vec2(-1.0, 1.0)).rgb * 2.0; c += texture(src, uv + texel * vec2(1.0, 1.0)).rgb * 2.0;
  o = vec4(c / 12.0 * gain, 1.0);
}`;

/** Mean log luminance (exposure adaptation): one tap per 4x4 block of the scene. */
export const LUM_FS = HEAD + LIB + `
in vec2 uv; out vec4 o; uniform sampler2D src;
void main(){ vec3 c = texture(src, uv).rgb; o = vec4(log(max(lum(c), 1e-4)), 0.0, 0.0, 1.0); }`;
export const ADAPT_FS = `#version 300 es
precision highp float;
out vec4 o; uniform sampler2D src; uniform float lod;
void main(){ o = vec4(textureLod(src, vec2(0.5), lod).r, 0.0, 0.0, 1.0); }`;

// ---------------------------------------------------------------- final (pass 9)

export const FINAL_FS = HEAD + LIB + `
uniform sampler2D scene, bloom, g0T, g1T, g2T, adaptT, raysT;
uniform vec4 capK;  // soft caps (display L) for back wall, diggable, undiggable; knee slope
uniform vec2 dev, art; uniform float S; uniform vec2 off;
uniform float exposure, bloomK, haze, aberr, flash, wash, dim, vpulse, time, adaptK, keyL;
uniform vec3 flashC, fogC, liftC, gainC, shadowC, highC;
uniform vec2 podA, seedA; uniform float raysK;
uniform int debug;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float aces1(float x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 fetchS(ivec2 a){ a = clamp(a, ivec2(0), ivec2(art) - 1); return texelFetch(scene, ivec2(a.x, int(art.y) - 1 - a.y), 0).rgb; }
vec3 tone(vec3 c){
  float y = lum(c), ym = aces1(y);
  vec3 c1 = c * (ym / max(y, 1e-4)), c2 = aces(c);
  return mix(c1, c2, 0.25);
}
vec3 grade(vec3 c){
  c = l2s(c);
  c = liftC + c * (gainC - liftC);
  float l = lum(c);
  vec3 tint = mix(shadowC, highC, smoothstep(0.25, 0.6, l));
  float tl = max(lum(tint), 1e-3);
  float w = 0.15 * (1.0 - smoothstep(0.25, 0.3, l) * (1.0 - smoothstep(0.55, 0.6, l)));
  return mix(c, tint * (l / tl), w);
}
void main(){
  vec2 d = vec2(gl_FragCoord.x, dev.y - gl_FragCoord.y);
  vec2 a = 1.0 + (floor(d) + off) / S;
  float distPod = length(a - podA) / 16.0;
  float hz = haze * smoothstep(1.5, 3.0, distPod);
  ivec2 ai = ivec2(floor(a));
  ai.x += int(floor(sin(float(ai.y) * 0.55 + time * 3.1) * hz + 0.5));
  vec3 c;
  if (aberr > 0.01) { int sh = max(1, int(aberr + 0.5)); c = vec3(fetchS(ai + ivec2(sh, 0)).r, fetchS(ai).g, fetchS(ai - ivec2(sh, 0)).b); }
  else c = fetchS(ai);
  ivec2 gq = ivec2(clamp(ai.x, 0, int(art.x) - 1), int(art.y) - 1 - clamp(ai.y, 0, int(art.y) - 1));
  int lay = int(texelFetch(g0T, gq, 0).a * 8.0 + 0.5);
  bool podPx = lay == 6;
  // The value contract (review 2 #1, #5): open space stays well under the darkest rock, lit rock under the ores.
  // Applied to the scene before bloom, so nothing glows its way back over the line; open space caps emissive too.
  {
    int gfl = int(texelFetch(g2T, gq, 0).b * 255.0 + 0.5);
    bool backdrop = (gfl & 64) != 0;
    float cap = lay == 1 ? (backdrop ? capK.x * 1.45 : capK.x) : lay == 2 ? capK.y : lay == 3 ? capK.z : 9.0;
    bool emis = texelFetch(g1T, gq, 0).a >= 0.01;
    if ((gfl & 128) != 0) cap = 9.0;   // set pieces' fire is exempt
    if (cap < 9.0 && (!emis || lay == 1)) {
      float l = lum(grade(tone(c * exposure)));
      if (l > cap) c *= pow((cap + (l - cap) * (emis ? 0.35 : capK.w)) / l, 2.2);
    }
  }
  vec2 bu = vec2(a.x / art.x, 1.0 - a.y / art.y);
  c += texture(bloom, bu).rgb * bloomK * (podPx ? 0.08 : 1.0);   // glow never washes over the pod (review #3)
  if (raysK > 0.0 && lay <= 1) {   // god-rays live behind the tiles (review #7)
    vec2 st = (seedA - a) * (0.6 / 12.0); vec2 s = a; float dec = 1.0; vec3 acc = vec3(0.0);
    for (int i = 0; i < 12; i++) { s += st; acc += texture(raysT, vec2(s.x / art.x, 1.0 - s.y / art.y)).rgb * dec; dec *= 0.9; }
    c += acc * raysK / 12.0;
  }
  float ex = exposure;
  if (adaptK > 0.0) { float m = exp(texelFetch(adaptT, ivec2(0), 0).r); ex *= clamp(keyL / max(m, 1e-4), 0.66, 1.5) * adaptK + (1.0 - adaptK); }
  c = tone(c * ex);
  c = grade(c);
  // Vignette centred on the pod, pulled toward the fog.
  vec2 uv = d / dev, pu = podA / art;
  float asp = dev.x / dev.y;
  float v = smoothstep(0.45, 1.1, length((uv - pu) * vec2(asp, 1.0)));
  c = c * (1.0 - 0.35 * v);
  c = mix(c, l2s(fogC), 0.25 * v);
  c = mix(c, vec3(0.75, 0.05, 0.04), vpulse * smoothstep(0.3, 1.0, v + 0.3) * 0.55);
  c += flash * flashC;
  c = mix(c, vec3(1.0), clamp(wash, 0.0, 1.0));
  float l = lum(c);
  c = mix(c, vec3(l), 0.5 * dim) * (1.0 - 0.4 * dim);
  if (debug == 1) {
    int layer = int(texelFetch(g0T, ivec2(ai.x, int(art.y) - 1 - ai.y), 0).a * 8.0 + 0.5);
    vec3 lc[8] = vec3[8](vec3(0.1, 0.15, 0.35), vec3(0.15), vec3(0.65, 0.45, 0.25), vec3(0.3, 0.3, 0.5), vec3(1.0, 0.85, 0.2), vec3(1.0, 0.2, 0.2), vec3(0.3, 1.0, 0.4), vec3(1.0, 0.4, 1.0));
    c = lc[layer];
  } else if (debug == 2) {
    float s = 0.0;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec3 cc = fetchS(ai + ivec2(i, j)) * exposure;
      s += lum(grade(tone(cc)));
    }
    c = vec3(s / 9.0);
  }
  c += (bayer4(ivec2(gl_FragCoord.xy)) - 0.5) / 255.0;
  o = vec4(c, 1.0);
}`;
