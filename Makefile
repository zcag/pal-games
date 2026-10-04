# pal's games, tested and built against a pal checkout in .pal/ (CI clones
# zcag/pal at main there; `make setup` links ../pal when it is beside this
# one). pal's tools run from it with this repo as the extension repo they
# read (PAL_EXTENSION_REPOS, pal's app/scripts/extension-repos.mjs).
export PAL_EXTENSION_REPOS ?= $(CURDIR)
JOBS := $(shell n=$$(getconf _NPROCESSORS_ONLN); echo $$(( n < 8 ? n : 8 )))
REPORT := $(or $(TMPDIR),/tmp)/pal-games-tests.xml
TSC := .pal/host/node_modules/.bin/tsc
# pal's app tests read every extension pal has (its gallery's Browse is the
# whole registry): this repo and pal-extensions, beside it or in .ext/ (CI).
OTHER := $(firstword $(wildcard .ext/pal-extensions ../pal-extensions))

# .pal, its dependencies, `@zcag/pal` linked to its SDK (what the host links
# into every root too), and each extension's own dependencies.
.PHONY: setup
setup:
	@[ -e .pal ] || { [ -d ../pal/host ] && ln -s ../pal .pal && echo "linked .pal -> ../pal"; } || { echo "no pal checkout: git clone https://github.com/zcag/pal .pal, or keep one beside this repo as ../pal"; exit 1; }
	@[ -d .pal/host/node_modules ] || (cd .pal && bun install --frozen-lockfile)
	@mkdir -p node_modules/@zcag && ln -sfn ../../.pal/sdk node_modules/@zcag/pal
	@for d in */; do if [ -f "$$d/package.json" ] && [ ! -d "$$d/node_modules" ]; then (cd "$$d" && bun install --frozen-lockfile); fi; done

# What CI runs: the typechecks (the extensions, their tests, their surface
# pages), pal's host contract tests (manifests, links, packages, the
# registry-only list, screenshots, synced storage) over this repo, and the
# extensions' own tests; NAMES="snake wordle" runs only theirs. APP=1 adds
# pal's app typecheck and tests, whose gallery reads every manifest here
# (CI sets it when a pal.json changed; needs `npm ci` in .pal/app).
# The host's files run in parallel, and pal's host/test/budget.ts fails one
# over its time budget (.pal/host/test/README.md).
TESTS = $(if $(NAMES),$(foreach n,$(NAMES),$(wildcard $(CURDIR)/test/$(n).test.ts $(CURDIR)/test/$(n)-*.test.ts)),$(wildcard $(CURDIR)/test/*.test.ts))
.PHONY: test
test: setup
	$(TSC) --noEmit -p tsconfig.json
	$(TSC) --noEmit -p tsconfig.surface.json
	$(if $(APP),npm --prefix .pal/sdk run build && cd .pal/app && npx tsc --noEmit && PAL_EXTENSION_REPOS="$(CURDIR)$(if $(OTHER),:$(abspath $(OTHER)))" npx vitest run)
	cd .pal/host && bun test --parallel=$(JOBS) --reporter=junit --reporter-outfile=$(REPORT) test/*.test.ts $(TESTS) && bun test/budget.ts $(REPORT)

# The store screenshots (.pal/docs/design/screenshots.md), both themes:
# `make shots EXT="snake vortex"`, every game with a fixture when EXT is
# empty. pal's gallery renders them, so .pal/app needs `npm ci` once.
.PHONY: shots
shots: setup
	EXT="$(EXT)" DESIGN="$(DESIGN)" .pal/app/scripts/make-shots.sh
