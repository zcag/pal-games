#!/usr/bin/env bash
# bun scripts/sim.ts --<mode> (default core) with a TUNE built from short args:
#   a2=1.0 (act hpMul and spellMul)  g2=1.3 (bountyMul)  s2=400 (startGold)  bat=1 (bat threat)
#   el=0.9 bo=0.9 (scale elite / boss health)  x='"enemies.shade.hp":90' (raw entries)  n=150  mode=ks
declare -A V
for kv in "$@"; do V[${kv%%=*}]=${kv#*=}; done
j="{"
for a in 1 2 3 4; do x=${V[a$a]}; [ -n "$x" ] && j+="\"acts.$a.hpMul\":$x,\"acts.$a.spellMul\":$x,"; x=${V[g$a]}; [ -n "$x" ] && j+="\"acts.$a.bountyMul\":$x,"; x=${V[s$a]}; [ -n "$x" ] && j+="\"acts.$a.startGold\":$x,"; done
[ -n "${V[bat]}" ] && j+="\"enemies.bat.threat\":${V[bat]},"
# el / bo scale the current elite and boss health (keep these in step with game/content/battle/enemies.ts)
if [ -n "${V[el]}" ]; then for e in juggernaut:900 warlock:570 matron:720; do j+="\"enemies.${e%%:*}.hp\":$(echo "${e#*:}*${V[el]}" | bc),"; done; fi
if [ -n "${V[bo]}" ]; then for e in gorrak:4000 hivequeen:3400 wyrm:5200 lich:6800 colossus:8000 packlord:5500 tyrant:20800; do j+="\"enemies.${e%%:*}.hp\":$(echo "${e#*:}*${V[bo]}" | bc),"; done; fi
[ -n "${V[x]}" ] && j+="${V[x]},"
j="${j%,}}"
TUNE="$j" bun scripts/sim.ts --${V[mode]:-core} --n ${V[n]:-150}
