#!/usr/bin/env bash
# uso: bash scripts/hf-upload.sh <arquivo.png>  → imprime a URL pública
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
r=$(curl -s -X POST https://api.higgsfield.ai/files/generate-upload-url -H "Authorization: Key $HF_API_KEY_ID:$HF_API_KEY_SECRET" -H "Content-Type: application/json" -d '{"content_type":"image/png"}')
args=$(node -e 'const r=JSON.parse(process.argv[1]);const h=r.upload_headers||{"Content-Type":"image/png"};for(const k in h)console.log("-H\n"+k+": "+h[k])' "$r")
mapfile -t H <<< "$args"
up=$(node -e 'console.log(JSON.parse(process.argv[1]).upload_url)' "$r")
curl -s -f -X PUT "$up" "${H[@]}" --data-binary @"$1" >/dev/null
node -e 'console.log(JSON.parse(process.argv[1]).public_url)' "$r"
