#!/usr/bin/env bash
# Rebuild game/vendor/planck.js: planck.js (Box2D in JavaScript, MIT) as one
# minified module (the page is served file by file, no bundler, and a bare
# `import "planck"` would not resolve there). Keep game/vendor/planck.d.ts in
# step: it is the package's own dist/planck.d.ts.
#   chip/scripts/vendor.sh
set -euo pipefail
cd "$(dirname "$0")/.."
bun install --frozen-lockfile 2>/dev/null || bun install
bun build scripts/vendor-entry.js --minify --format esm --outfile game/vendor/planck.js
cp node_modules/planck/dist/planck.d.ts game/vendor/planck.d.ts
cp node_modules/planck/LICENSE.txt game/vendor/LICENSE-planck.txt
