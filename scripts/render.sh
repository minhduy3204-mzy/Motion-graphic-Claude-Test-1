#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p /tmp/motion-config /tmp/motion-cache out
motion_chromium="${CHROMIUM_PATH:-/usr/bin/chromium}"
motion_raw="out/.motion-intermediate.mp4"
motion_final="out/motion-graphic.mp4"

XDG_CONFIG_HOME=/tmp/motion-config XDG_CACHE_HOME=/tmp/motion-cache \
  ./node_modules/.bin/remotion render src/remotion.tsx StudioMotion "$motion_raw" \
  --codec h264 --crf 18 --concurrency 2 --browser-executable "$motion_chromium" --overwrite

# Chromium's full-range frames can be tagged yuvj420p. Normalize the deliverable
# to limited-range yuv420p for broad social-platform compatibility.
ffmpeg -hide_banner -loglevel error -y -threads 2 -i "$motion_raw" \
  -vf 'scale=in_range=full:out_range=limited,format=yuv420p' \
  -c:v libx264 -threads 2 -preset veryfast -crf 17 -pix_fmt yuv420p \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart -an "$motion_final"
rm -- "$motion_raw"
