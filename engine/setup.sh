#!/usr/bin/env bash
# One-time setup: installs everything the engine needs that is not a system tool, into the tool home
# (CODEBASE_VIDEO_HOME, default ~/.cache/codebase-video; the plugin passes its persistent data dir).
#   - a Python venv with kokoro-onnx (the local, offline text-to-speech voice) and soundfile
#   - the Kokoro v1.0 model files (about 200 MB, downloaded once from the kokoro-onnx GitHub release)
#   - puppeteer-core (drives your installed Chrome or Chromium; it does not download a browser)
# System tools it checks for but does not install: Python 3.10-3.13 (kokoro-onnx does not support 3.14 yet; uv is
# used instead when present), node (18+), npm, ffmpeg (with libx264,
# libvpx-vp9, libopus) and Chrome or Chromium. Safe to run again: finished steps are skipped.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TOOL_HOME="${CODEBASE_VIDEO_HOME:-$HOME/.cache/codebase-video}"
MODELS="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
mkdir -p "$TOOL_HOME"

missing=()
for t in node npm ffmpeg curl; do command -v "$t" >/dev/null || missing+=("$t"); done
if [ ${#missing[@]} -gt 0 ]; then
  echo "missing system tools: ${missing[*]}" >&2
  echo "  macOS:  brew install python node ffmpeg" >&2
  echo "  Debian/Ubuntu:  sudo apt install python3 python3-venv nodejs npm ffmpeg curl" >&2
  exit 2
fi
for codec in libx264 libvpx-vp9 libopus; do
  ffmpeg -hide_banner -encoders 2>/dev/null | grep -q "$codec" || { echo "ffmpeg lacks the $codec encoder" >&2; exit 2; }
done
CHROME_OK=""
for c in "${CHROME:-}" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Chromium.app/Contents/MacOS/Chromium" \
         /usr/bin/google-chrome /usr/bin/google-chrome-stable /usr/bin/chromium /usr/bin/chromium-browser; do
  [ -n "$c" ] && [ -x "$c" ] && { CHROME_OK="$c"; break; }
done
[ -n "$CHROME_OK" ] || { echo "no Chrome or Chromium found: install one, or set CHROME to its executable" >&2; exit 2; }

if [ ! -x "$TOOL_HOME/venv/bin/python" ]; then
  PYTHON=""
  for p in python3.13 python3.12 python3.11 python3.10 python3; do
    command -v "$p" >/dev/null && "$p" -c 'import sys; sys.exit(not (3, 10) <= sys.version_info[:2] <= (3, 13))' 2>/dev/null && { PYTHON="$p"; break; }
  done
  echo "creating the Python venv in $TOOL_HOME/venv"
  if [ -n "$PYTHON" ]; then "$PYTHON" -m venv "$TOOL_HOME/venv"
  elif command -v uv >/dev/null; then uv venv --quiet --seed --python 3.13 "$TOOL_HOME/venv"
  else
    echo "kokoro-onnx needs Python 3.10-3.13. Install one (macOS: brew install python@3.13; or install uv) and re-run." >&2; exit 2
  fi
fi
"$TOOL_HOME/venv/bin/python" -c "import kokoro_onnx, soundfile, numpy" 2>/dev/null || {
  echo "installing kokoro-onnx and soundfile"
  "$TOOL_HOME/venv/bin/python" -m pip install --quiet --upgrade pip
  "$TOOL_HOME/venv/bin/python" -m pip install --quiet "kokoro-onnx==0.5.0" "soundfile>=0.13" "numpy>=2"
}

mkdir -p "$TOOL_HOME/kokoro"
for f in kokoro-v1.0.fp16.onnx voices-v1.0.bin; do
  if [ ! -s "$TOOL_HOME/kokoro/$f" ]; then
    echo "downloading $f"
    curl -fL --retry 3 -o "$TOOL_HOME/kokoro/$f.part" "$MODELS/$f" && mv "$TOOL_HOME/kokoro/$f.part" "$TOOL_HOME/kokoro/$f"
  fi
done

if [ ! -d "$TOOL_HOME/node/node_modules/puppeteer-core" ]; then
  echo "installing puppeteer-core"
  mkdir -p "$TOOL_HOME/node"
  cp "$HERE/package.json" "$TOOL_HOME/node/package.json"
  (cd "$TOOL_HOME/node" && npm install --silent --no-audit --no-fund)
fi

echo "ready: voice, renderer and encoder are set up in $TOOL_HOME (browser: $CHROME_OK)"
