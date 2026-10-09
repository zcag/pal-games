// How each sky is shown: where its sun sits against the road, exposure, fog, and the light at night;
// then how the frame is finished there (looks.ts): the haze that hides the distance and the grade.
export type Grade = {
  haze: number; // haze density at the road, per metre (the fog's colour is the sky's own horizon)
  hazeHeight: number; // metres over which the haze thins with height
  contrast: number; // around mid grey, 1 = none
  saturation: number;
  warmth: number; // white balance: + warmer, - cooler
  lift: [number, number, number]; // added to the shadows
  gain: [number, number, number]; // times the highlights
  bloom: number; // strength
  glow: number; // how much the sun lights the haze toward it
  vignette: number;
};
/** `gloss`: how much car paint mirrors the sky (car.ts setGloss), 1 when unset. `overhead`: a sky with no sun (overcast)
 *  still lights from its bright top: a soft light from high up at this strength, soft-shadowed. `wet`: the road damp,
 *  0..1 (road.ts uWet). `clouds`: how dark the shadows of clouds drifting over the land are (looks.ts). */
export type SkyLook = { sunAngle: number; exposure: number; fog: number; fogColor: number; env?: number; gloss?: number; overhead?: number; wet?: number; clouds?: number; night?: boolean; grade: Grade };

const G: Grade = { haze: 0.0011, hazeHeight: 60, contrast: 1.08, saturation: 1.06, warmth: 0, lift: [0, 0, 0], gain: [1, 1, 1], bloom: 0.12, glow: 1, vignette: 0.2 };
export const SKY_LOOKS: Record<string, SkyLook> = {
  partly_cloudy: { sunAngle: 2.5, exposure: 1.0, fog: 0.0009, fogColor: 0xb4c2cf, grade: { ...G, contrast: 1.14, saturation: 1.12, warmth: 0.03, lift: [0.0, 0.003, 0.008] } },
  clear_midday: { sunAngle: 2.2, exposure: 0.95, fog: 0.0008, fogColor: 0xb9c6d2, grade: { ...G, haze: 0.0009, contrast: 1.12, saturation: 1.08, warmth: 0.01, gain: [1.0, 1.0, 1.02], glow: 0.6 } },
  golden_hour: { sunAngle: 0.9, exposure: 1.25, fog: 0.0016, fogColor: 0xd8b48e, grade: { ...G, haze: 0.0022, contrast: 1.1, saturation: 1.12, warmth: 0.12, lift: [0.006, 0.003, 0.01], gain: [1.04, 0.99, 0.92], bloom: 0.2, glow: 2.5, vignette: 0.26 } },
  // a damp grey day: mist lying low on the land (thick in the dips, gone a little way up), clouds' shadows drifting over
  // the moor, a soft light from overhead so the hills and cars still have shape, the road wet enough to mirror the sky
  overcast: { sunAngle: 0, exposure: 0.76, fog: 0.0015, fogColor: 0xa9adb0, gloss: 0.45, overhead: 1.5, wet: 0.4, clouds: 0.5, grade: { ...G, haze: 0.0032, hazeHeight: 14, contrast: 1.16, saturation: 1.04, warmth: -0.02, lift: [0.0, 0.003, 0.007], bloom: 0.1, glow: 0, vignette: 0.26 } },
  night: { sunAngle: 2.6, exposure: 0.95, fog: 0.0025, fogColor: 0x16141c, env: 0.12, night: true, grade: { ...G, haze: 0.002, hazeHeight: 40, contrast: 1.06, saturation: 0.95, warmth: -0.06, lift: [0.006, 0.011, 0.024], gain: [0.98, 1.0, 1.06], bloom: 0.22, glow: 0, vignette: 0.3 } },
};

/** The look a scene was built with: world.ts's `scene.userData.look` when set, else the one whose fog it has. */
export function lookOf(scene: { userData: Record<string, unknown> }, fogColor?: { getHex(): number }): SkyLook | undefined {
  const own = scene.userData.look as SkyLook | undefined;
  if (own || !fogColor) return own;
  const hex = fogColor.getHex();
  return Object.values(SKY_LOOKS).find((l) => l.fogColor === hex);
}
