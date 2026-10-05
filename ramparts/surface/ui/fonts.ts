// The two OFL faces (font/, latin subset only, OFL-*.txt beside them), loaded from the page's own folder.
let loaded: Promise<unknown> | null = null;

/** Registers the faces once; resolves when they can be drawn (screens wait for it before their first frame). */
export function loadFonts(): Promise<unknown> {
  if (loaded) return loaded;
  const faces: [string, string, string][] = [
    ["Cinzel", "cinzel-700", "700"], ["Cinzel", "cinzel-900", "900"],
    ["Nunito Sans", "nunito-sans-600", "600"], ["Nunito Sans", "nunito-sans-800", "800"], ["Nunito Sans", "nunito-sans-900", "900"],
  ];
  loaded = Promise.all(faces.map(([fam, file, w]) => {
    const f = new FontFace(fam, `url(${new URL(`../font/${file}.woff2`, import.meta.url)}) format("woff2")`, { weight: w, display: "block" });
    document.fonts.add(f);
    return f.load().catch(() => null);
  }));
  return loaded;
}
