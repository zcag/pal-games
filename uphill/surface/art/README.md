# Uphill's landscape layers

The layers behind the road are PWL's, both released as CC0 (public domain;
"Credit as PWL is appreciated"):

- Forest and Dusk: "Seamless HD landscape in parts",
  https://opengameart.org/content/seamless-hd-landscape-in-parts
- Desert: "Seamless desert background in parts",
  https://opengameart.org/content/seamless-desert-background-in-parts

`scripts/art.ts` turns the original parts into the tone masks here
(`<set>-<n>.png`, back to front, and `art.json`); the page recolours them
per look (`surface/looks.ts`).
