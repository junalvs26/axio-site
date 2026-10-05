#!/usr/bin/env bash
# Converte o master do Google Flow numa versão web para scrub suave.
# Uso: scripts/encode.sh <master.mp4> <cena> <desktop|mobile>
# Ex.:  scripts/encode.sh ~/flow/impact-8k.mp4 impact desktop
set -euo pipefail

master="$1"; scene="$2"; format="$3"
valid="impact awakening city analysis action solution transformation proof final"
[[ " $valid " == *" $scene "* ]] || { echo "cena inválida: $scene ($valid)"; exit 1; }

out="public/scenes/$scene"
mkdir -p "$out"

case "$format" in
  desktop) scale="scale=1920:-2"; crf=23 ;;
  mobile)  scale="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"; crf=24 ;;
  *) echo "formato deve ser desktop ou mobile"; exit 1 ;;
esac

# -g 1: todo quadro é keyframe → o scroll pode pular para qualquer instante sem travar.
ffmpeg -y -loglevel error -i "$master" -an -vf "$scale,fps=30" \
  -c:v libx264 -preset slow -crf "$crf" -g 1 -pix_fmt yuv420p -movflags +faststart \
  "$out/$format.mp4"

if [[ "$format" == "desktop" ]]; then
  ffmpeg -y -loglevel error -i "$out/desktop.mp4" -frames:v 1 -c:v libaom-av1 -still-picture 1 -crf 32 "$out/poster.avif" \
    || ffmpeg -y -loglevel error -i "$out/desktop.mp4" -frames:v 1 "$out/poster.avif"
fi

node scripts/scan-media.mjs
echo "ok → $out/$format.mp4 ($(du -h "$out/$format.mp4" | cut -f1))"
