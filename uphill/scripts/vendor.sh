#!/usr/bin/env bash
# Rebuild game/vendor/planck.js: planck.js (Box2D in JavaScript, MIT) as one
# minified module (the page is served file by file, no bundler, and a bare
# `import "planck"` would not resolve), and its types beside it.
#   uphill/scripts/vendor.sh
set -euo pipefail
cd "$(dirname "$0")/.."
bun install --frozen-lockfile
bun build node_modules/planck/dist/planck.mjs --minify --format esm --outfile game/vendor/planck.js
cp node_modules/planck/dist/planck.d.ts game/vendor/planck.d.ts
{ echo "planck.js $(jq -r .version node_modules/planck/package.json), MIT:"; cat node_modules/planck/LICENSE.txt; } > game/vendor/LICENSE-planck.txt
