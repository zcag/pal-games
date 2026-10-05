/** The shared id rule (architecture.md): lowercase words joined by "-" from the display name.
 *  "Glass Bones" -> "glass-bones", "Hunter's Whistle" -> "hunters-whistle", "The Ninth Pad" -> "the-ninth-pad". */
export function idOf(name: string): string {
  return name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
