// Shared GLSL: version header, hashes (bit-identical to look.ts `hashu`), value noise, colour helpers.

export const HEAD = `#version 300 es
precision highp float; precision highp int; precision highp usampler2D; precision highp sampler2D;
`;

export const LIB = `
const int SKYR = 14; const int HR = 776; const int WC = 48;
uint hashu(uvec3 v){ uint h = v.x * 374761393u + v.y * 668265263u + v.z * 2246822519u; h = (h ^ (h >> 13u)) * 1274126177u; return h ^ (h >> 16u); }
float h3(ivec3 p){ return float(hashu(uvec3(p))) * (1.0 / 4294967296.0); }
float h2(ivec2 p, int s){ return h3(ivec3(p, s)); }
float vnoise(vec2 p, int s){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  ivec2 q = ivec2(i) + ivec2(4096);
  float a = h2(q, s), b = h2(q + ivec2(1, 0), s), c = h2(q + ivec2(0, 1), s), d = h2(q + ivec2(1, 1), s);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm3(vec2 p, int s){ return vnoise(p, s) * 0.57 + vnoise(p * 2.03, s + 1) * 0.29 + vnoise(p * 4.07, s + 2) * 0.14; }
vec3 s2l(vec3 c){ return c * (c * (c * 0.305306011 + 0.682171111) + 0.012522878); }
vec3 l2s(vec3 c){ c = max(c, 0.0); return max(1.055 * pow(c, vec3(0.416666667)) - 0.055, 0.0); }
float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float bayer4(ivec2 p){ int x = p.x & 3, y = p.y & 3; int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5); return (float(m[y * 4 + x]) + 0.5) / 16.0; }
`;

/** Fullscreen triangle; `uv` 0..1 with y up (GL convention). */
export const FS_VS = `#version 300 es
out vec2 uv;
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
