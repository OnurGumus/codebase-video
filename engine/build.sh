#!/usr/bin/env bash
# Builds one narrated video from a clip directory holding script.json, clip.html and one <key>.js per module.
#   ./build.sh <clip-dir> narrate        voice script.json -> build/narration.wav, timing.js, captions.vtt
#   ./build.sh <clip-dir> stills [t...]  still frames -> build/still-<t>.png (default: the poster frame)
#   ./build.sh <clip-dir> sheet          a labelled still per narrated sentence, six per build/sheet-<n>.png
#   ./build.sh <clip-dir> sheet g1 g2    the same for the scenes of modules g1 and g2 only (build/sheet-g1-g2-<n>.png)
#   ./build.sh <clip-dir> serve          preview URL with narration
#   ./build.sh <clip-dir> check [--lesson lesson.md]   cue phrases, script problems, numbers the lesson never states
#   ./build.sh <clip-dir> new-long       start a long video: copy templates/long/clip.html into the clip dir
#   ./build.sh <clip-dir> chapters       (re)write out/<name>.chapters.vtt from timing.json, no render
#   ./build.sh <clip-dir> video          render and encode -> out/<name>.{mp4,webm,jpg,vtt}
#   ./build.sh <clip-dir> all            narrate, then video
# Output goes to <clip-dir>/out/<name>.{mp4,webm,jpg,vtt} (+ .chapters.vtt for long videos).
# Needs Node, ffmpeg (libx264, libvpx-vp9, libopus), Google Chrome or Chromium, and the Kokoro voice that setup.sh
# installs into the tool home (CODEBASE_VIDEO_HOME, default ~/.cache/codebase-video).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CLIP="$(cd "$1" && pwd)"
STEP="${2:-all}"
shift 2 || true
TOOL_HOME="${CODEBASE_VIDEO_HOME:-$HOME/.cache/codebase-video}"
PY="${KOKORO_PYTHON:-$TOOL_HOME/venv/bin/python}"
export KOKORO_DIR="${KOKORO_DIR:-$TOOL_HOME/kokoro}"
OUT="$CLIP/out"
mkdir -p "$CLIP/build" "$OUT"
[ -x "$PY" ] && [ -d "$TOOL_HOME/node/node_modules/puppeteer-core" ] || {
  echo "the tool is not set up yet: run $HERE/setup.sh (installs the Kokoro voice and puppeteer-core into $TOOL_HOME)" >&2; exit 2; }

narrate() { "$PY" "$HERE/narrate.py" "$CLIP" 2> >(grep -v -e "UserWarning" -e "warnings.warn" >&2); }

# Long videos publish their chapters as <name>.chapters.vtt (chapters.py); short clips have none.
chapters_for() {
  python3 "$HERE/chapters.py" "$1/build/timing.json" "$OUT/$2.chapters.vtt" || { [ $? -eq 3 ] && rm -f "$OUT/$2.chapters.vtt" || return 1; }
}

video() {
  [ -f "$CLIP/build/timing.json" ] || narrate
  node "$HERE/render.mjs" "$CLIP" video 30
  local name poster
  name=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["name"])' "$CLIP/build/timing.json")
  poster=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["poster"])' "$CLIP/build/timing.json")
  # Speech normalised to -16 LUFS, the usual level for spoken web video, so clips match each other.
  local audio=(-i "$CLIP/build/narration.wav" -map 0:v -map 1:a -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000)
  ffmpeg -hide_banner -loglevel error -y -i "$CLIP/build/frames.mkv" "${audio[@]}" \
      -c:v libx264 -profile:v high -preset slow -crf 22 -pix_fmt yuv420p -tune animation \
      -c:a aac -b:a 128k -movflags +faststart -shortest "$OUT/$name.mp4"
  ffmpeg -hide_banner -loglevel error -y -i "$CLIP/build/frames.mkv" "${audio[@]}" \
      -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p \
      -c:a libopus -b:a 96k -shortest "$OUT/$name.webm"
  ffmpeg -hide_banner -loglevel error -y -ss "$poster" -i "$CLIP/build/frames.mkv" -frames:v 1 -q:v 3 "$OUT/$name.jpg"
  cp "$CLIP/build/captions.vtt" "$OUT/$name.vtt"
  chapters_for "$CLIP" "$name"
  rm -f "$CLIP/build/frames.mkv"
  ls -la "$OUT/$name".*
}

case "$STEP" in
  narrate) narrate ;;
  stills) [ -f "$CLIP/build/timing.json" ] || narrate; node "$HERE/render.mjs" "$CLIP" stills "$@" ;;
  sheet) [ -f "$CLIP/build/timing.json" ] || narrate
         # With module keys (sheet g1 g2) only those scenes are rendered, into sheet-g1-g2-<n>.png, and other sheets are left alone.
         if [ $# -eq 0 ]; then rm -f "$CLIP"/build/beat-[0-9]*.png "$CLIP"/build/sheet-[0-9]*.png; fi
         node "$HERE/render.mjs" "$CLIP" sheet "$@" ;;
  serve) [ -f "$CLIP/build/timing.json" ] || narrate; node "$HERE/render.mjs" "$CLIP" serve ;;
  check) "$PY" "$HERE/check.py" "$CLIP" "$@" ;;
  new-long) [ -e "$CLIP/clip.html" ] && { echo "$CLIP/clip.html exists; not overwriting" >&2; exit 1; }
            cp "$HERE/templates/long/clip.html" "$CLIP/clip.html"; echo "$CLIP/clip.html (write script.json and one <key>.js per module; see KIT.md)" ;;
  video) video ;;
  chapters) chapters_for "$CLIP" "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["name"])' "$CLIP/build/timing.json")" ;;
  all) narrate; video ;;
  *) echo "unknown step $STEP (narrate|check|stills|sheet|serve|new-long|video|all)" >&2; exit 2 ;;
esac
