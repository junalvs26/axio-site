#!/usr/bin/env bash
# uso: bash scripts/hf.sh <endpoint> <json-file> <saida-sem-ext>
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
AUTH="Authorization: Key $HF_API_KEY_ID:$HF_API_KEY_SECRET"
resp=$(curl -s -X POST "https://api.higgsfield.ai/$1" -H "$AUTH" -H "Content-Type: application/json" --data @"$2")
echo "$resp" > "$3.submit.json"
url=$(node -e 'const r=JSON.parse(process.argv[1]);if(!r.status_url){console.error(JSON.stringify(r));process.exit(1)}console.log(r.status_url)' "$resp")
while :; do
  s=$(curl -s "$url" -H "$AUTH"); st=$(node -e 'console.log(JSON.parse(process.argv[1]).status)' "$s")
  case "$st" in completed) break;; failed|nsfw|canceled|cancelled) echo "$s"; exit 1;; esac
  sleep 8
done
echo "$s" > "$3.result.json"
node -e 'const r=JSON.parse(process.argv[1]);const u=[];(function w(o){if(o&&typeof o==="object")for(const k in o){if(k==="url"&&typeof o[k]==="string")u.push(o[k]);else w(o[k])}})(r);console.log(u.join("\n"))' "$s" | while read -r u; do
  ext="${u##*.}"; ext="${ext%%\?*}"; n=$((${n:-0}+1)); f="$3${n/#1/}.$ext"; curl -s -o "$f" "$u"; echo "$f"
done
