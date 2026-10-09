#!/usr/bin/env bash
# golden.sh: the engine's baseline harness. It records everything the command line writes for six fixtures, so a
# refactor that changes any byte of any output is caught.
#
#   golden.sh record  <label> [fixture ...]   run the fixtures, write every output into <golden>/<label>/
#   golden.sh compare <label> [fixture ...]   record into <golden>/current/, then compare with <label>:
#                                             prints "identical", or each differing path; exit 0 or 1
#
# Fixtures (default: all, in this order): gallery progress broken-check bad-voice page-error no-timing
# With a list, only those run (and, for compare, only those are compared); an unknown name is an error.
#
# Use: record a baseline on the commit before a change (golden.sh record base), make the change, build, then
# golden.sh compare base. Record and compare on the same machine with the same tools: the logs hold absolute paths,
# and the frame checksums hold ffmpeg's version. A full run takes about 30 minutes and needs what the engine needs
# (setup done, ffmpeg, Chrome), plus python3 and perl.
#
# Where things are:
#   this folder                 the scripts: golden.sh, compare.py (the comparison), edits.py (the fixed edits some
#                               fixtures make), unstable.txt
#   $GOLDEN_HOME                recordings (<label>/, current/), the workspaces (ws/), state/ and times/
#                               (default ~/.cache/codebase-video-golden)
#   engine/kit/gallery          the source of every fixture except progress
#   $GOLDEN_PROGRESS            the source of the progress fixture: a progress-video workspace (default
#                               .codebase-video/progress-v0-5-2 in the repo, a local workspace that is not committed).
#                               When it is missing, progress is left out of the default fixture list (with a note on
#                               stderr), and naming it is an error.
#   $GOLDEN_REPO                the repo whose engine/cli is run (default: the repo this folder is in)
#
# What a recording holds, in <golden>/<label>/, for each command ("step") of each fixture:
#   <fixture>.<step>.out     stdout, then stderr (the bytes as the command wrote them; a stream that does not end in a
#                            newline is followed by a line `\ No newline at end of stdout` or `... stderr`), then
#                            exit=<code> (exit=timeout after 900 s), then attempts=<n>. Elapsed-time numbers and the
#                            dates of `ls -la` lines are replaced by X. attempts is 1 unless the browser went away
#                            (see "A retry is part of the result" below)
#   <fixture>.<step>.files   every file in the workspace after the step (names only, sorted)
#   <fixture>.<step>.d/      the recorded files the step created or changed (the first step of a fixture records
#                            all that exist): build/timing.json timing.js captions.vtt phonemes.txt narration.wav
#                            brief-*.txt history.json history.md lesson.md scan.json still-*.png sheet-*.png
#                            beat-*.png segments/*.json segments/list-*.txt, out/*.vtt *.chapters.vtt *.script.md
#                            *.srt *.jpg, the workspace's own *.js *.html *.json (an engine write to an input shows),
#                            plus, for out/<name>.mp4, .silent.mp4 and .webm, the frame checksums
#                            (<name>.framemd5, <name>.silent.framemd5, <name>.webm.framemd5) and the .pptx
#                            unzipped without docProps/ (<name>.pptx.d/)
#   <fixture>.render-seconds the wall time of a `video --full` (kept for the speed check; never compared; not written
#                            when the step needed more than one attempt, as it would include the failed one)
# Files in unstable.txt are compared by the method written beside each (see compare.py).
#
# Every engine command runs with WORKERS=1: one render page draws all frames in the same order every time, which makes
# every output byte-for-byte repeatable (with the default 4 pages, which frames a page has drawn before frame N varies
# from run to run, and some frames come out slightly different).
# The one exception is the gallery's extra step video4: `video --full` with WORKERS=4 (the engine's default) on a copy
# of the workspace, so that the parallel scheduling is exercised too. Its files are
#   gallery.video4.out            the log (exact; the sizes of the ls -la lines masked)
#   gallery.video4.ref.mp4        the 1-worker mp4 of the same moment, and .ref.framemd5 (exact)
#   gallery.video4.mp4, .framemd5 the 4-worker mp4 and its frame checksums (NOT in the exact diff)
#   gallery.video4.tolerance      compare.py video4's report (NOT in the exact diff)
#   gallery.video4.render-seconds the wall time (never compared)
# compare.py checks the 4-worker frames against the 1-worker ones: same number of frames, same audio, every frame at
# least 48 dB (PSNR) from its 1-worker counterpart; it names the frames under the limit by index and reports the
# largest per-channel difference. (A limit of 1 of 255 per channel cannot hold: some frames come out up to 48 levels
# different in thin antialiased edges, 933 to 961 of 7106 frames differ at all; the lowest PSNR seen is 52.3 to 52.8 dB.)
#
# A retry is part of the result. When Chrome goes away or hangs mid-run (TargetCloseError, a protocol timeout ...), a
# command is run again, twice at most, so that record can finish on a busy machine. The log kept is the last
# attempt's and ends with attempts=<n>, so a retried step differs from a clean baseline in its .out; `compare` also
# lists every retried step on stdout and exits 1 instead of printing "identical". `record` names retried steps on
# stderr; a baseline should be recorded without any.
#
# After an ffmpeg or Chrome update, record the baseline again: the frame checksum files start with ffmpeg's version,
# and the segment keys (segments/*.json) hold the Chrome version.
#
# Workspaces are fresh copies of their sources, at fixed paths (<golden>/ws/<fixture>), deleted and made again on
# every run, so the absolute paths in the logs are the same from run to run.
set -u

SRC=$(cd "$(dirname "$0")" && pwd -P)
REPO=${GOLDEN_REPO:-$(cd "$SRC/../.." && pwd -P)}
GOLDEN=${GOLDEN_HOME:-$HOME/.cache/codebase-video-golden}
CV=$REPO/engine/cli/Cv.js
GALLERY=$REPO/engine/kit/gallery
PROGRESS=${GOLDEN_PROGRESS:-$REPO/.codebase-video/progress-v0-5-2}
WS=$GOLDEN/ws
STATE=$GOLDEN/state
LIMIT=900
ALL_FIXTURES="gallery progress broken-check bad-voice page-error no-timing"

die() { echo "golden.sh: $*" >&2; exit 2; }

usage() {
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

# The default fixture list: all of them, without progress when its workspace is not on this machine.
default_fixtures() {
  if [ -f "$PROGRESS/script.json" ]; then
    echo "$ALL_FIXTURES"
  else
    echo "golden.sh: no progress workspace at $PROGRESS (set GOLDEN_PROGRESS); leaving the progress fixture out" >&2
    echo "$ALL_FIXTURES" | sed 's/ progress / /'
  fi
}

now() { perl -MTime::HiRes=time -e 'printf "%.3f\n", time'; }

# ---- the log of one command ---------------------------------------------------------------------------------

# Elapsed time becomes X; so do the dates of ls -la lines (the video step lists its files).
normalise() {
  sed -E \
    -e 's/(rendered [0-9]+ frames in )[0-9.]+s/\1Xs/' \
    -e '/^[-dl][-rwxsStT@+.]{9,}/ s/ (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) +[0-9]+ +([0-9]{2}:[0-9]{2}|[0-9]{4}) / X /' \
    -e '/^[-dl][-rwxsStT@+.]{9,}/ s/ [0-9]+ (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([0-9]{2}:[0-9]{2}|[0-9]{4}) / X /'
}

# the sizes of the ls -la lines (after normalise has replaced their dates by X)
mask_sizes() {
  sed -E '/^[-dl][-rwxsStT@+.]{9,}/ s/ [0-9]+ +X / SIZE X /'
}

# One stream of a command as recorded: its bytes, with elapsed times and ls dates replaced (and the sizes masked when
# MASK_SIZES=1), and when the last byte is not a newline, a line saying so, so that the .out stays readable and a
# change in that last byte is not hidden.
emit_stream() { # file stream-name
  [ -s "$1" ] || return 0
  if [ "${MASK_SIZES:-0}" = 1 ]; then normalise < "$1" | mask_sizes; else normalise < "$1"; fi
  if [ "$(tail -c 1 "$1" | od -An -c | tr -d ' ')" != '\n' ]; then
    echo
    echo "\\ No newline at end of $2"
  fi
}

# ---- what is recorded ---------------------------------------------------------------------------------------

# The recorded files of a workspace, relative to it.
recorded() {
  (
    cd "$1" || exit 0
    for f in build/timing.json build/timing.js build/captions.vtt build/phonemes.txt build/narration.wav \
             build/history.json build/history.md build/lesson.md build/scan.json build/narration-vs-lesson.md \
             build/clip.html.old-kit; do
      [ -f "$f" ] && echo "$f"
    done
    find . -maxdepth 1 -type f \( -name '*.js' -o -name '*.html' -o -name '*.json' \) | sed 's|^\./||'
    [ -d build ] && find build -maxdepth 1 -type f \
      \( -name 'brief-*.txt' -o -name 'still-*.png' -o -name 'sheet-*.png' -o -name 'beat-*.png' \)
    [ -d build/segments ] && find build/segments -maxdepth 1 -type f \( -name '*.json' -o -name 'list-*.txt' \)
    [ -d out ] && find out -maxdepth 1 -type f \
      \( -name '*.vtt' -o -name '*.script.md' -o -name '*.srt' -o -name '*.jpg' \)
  ) | LC_ALL=C sort -u
}

sha_of() { shasum -a 256 "$1" | cut -d' ' -f1; }

# Frame checksums of one video, memoised by the file's checksum (decoding takes a while).
framemd5() { # fixture video-file out-file
  local st=$STATE/$1 key
  key=$(sha_of "$2")
  mkdir -p "$st/framemd5"
  if [ ! -f "$st/framemd5/$key" ]; then
    # ffmpeg's complaints about the file (e.g. a bad Opus packet at the end of a webm) are part of the record, with
    # the memory addresses they print replaced
    ffmpeg -nostdin -hide_banner -loglevel error -i "$2" -f framemd5 - > "$st/framemd5/$key.tmp" 2> "$st/framemd5/$key.err"
    sed -E -e 's/0x[0-9a-fA-F]+/0xADDR/g' -e 's/^/ffmpeg: /' "$st/framemd5/$key.err" >> "$st/framemd5/$key.tmp"
    mv "$st/framemd5/$key.tmp" "$st/framemd5/$key"
    rm -f "$st/framemd5/$key.err"
  fi
  cp "$st/framemd5/$key" "$3"
}

# The derived records of a workspace go into $STATE/<fixture>/derived/.
derive() { # fixture
  local fx=$1 ws=$WS/$1 st=$STATE/$1 f name
  rm -rf "$st/derived"
  mkdir -p "$st/derived"
  [ -d "$ws/out" ] || return 0
  for f in "$ws"/out/*.mp4; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .mp4)
    framemd5 "$fx" "$f" "$st/derived/$name.framemd5"
  done
  for f in "$ws"/out/*.webm; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    framemd5 "$fx" "$f" "$st/derived/$name.framemd5"
  done
  for f in "$ws"/out/*.pptx; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .pptx)
    unzip -q -o "$f" -x 'docProps/*' -d "$st/derived/$name.pptx.d" 2>&1 | head -5
  done
}

# After a step: its file list, and the recorded files that are new or changed since the step before.
snapshot() { # fixture step
  local fx=$1 step=$2 ws=$WS/$1 st=$STATE/$1 base=$REC/$1.$2 line p src
  (cd "$ws" && find . -type f | sed 's|^\./||' | LC_ALL=C sort) > "$base.files"
  recorded "$ws" > "$st/list"
  derive "$fx"
  {
    if [ -s "$st/list" ]; then (cd "$ws" && tr '\n' '\0' < "$st/list" | xargs -0 shasum -a 256); fi
    (cd "$st/derived" && find . -type f | sed 's|^\./||' | LC_ALL=C sort | tr '\n' '\0' | xargs -0 shasum -a 256)
  } | LC_ALL=C sort > "$st/manifest.new"
  [ -f "$st/manifest" ] || : > "$st/manifest"
  comm -13 "$st/manifest" "$st/manifest.new" | while IFS= read -r line; do
    p=${line#*  }
    if [ -f "$st/derived/$p" ]; then src=$st/derived/$p; else src=$ws/$p; fi
    mkdir -p "$base.d/$(dirname "$p")"
    cp "$src" "$base.d/$p"
  done
  mv "$st/manifest.new" "$st/manifest"
}

# ---- running ------------------------------------------------------------------------------------------------

# cv <workspace dir> <log name> <workers> <Cv.js arguments after the workspace...>: runs one command with WORKERS=<workers>
# and writes $REC/<log name>.out. Sets STEP_SECONDS and STEP_ATTEMPTS. MASK_SIZES=1 also masks the sizes of the ls -la
# lines.
cv() {
  local dir=$1 name=$2 workers=$3 ws code t0 t1
  ws=$WS/$dir
  shift 3
  local so=$STATE/stdout se=$STATE/stderr
  mkdir -p "$STATE"
  echo "  $name: $* (WORKERS=$workers)" >&2
  t0=$(now)
  local attempt=1
  while :; do
    (cd "$REPO" && WORKERS=$workers perl -e 'alarm shift; exec @ARGV' "$LIMIT" node "$CV" "$ws" "$@") > "$so" 2> "$se" < /dev/null
    code=$?
    # Chrome itself going away or hanging mid-run (the browser crashed, the machine slept or was too busy to answer in
    # time) is not the engine's output, so such a run is made again, twice at most. The page errors and failures the
    # fixtures provoke on purpose are not matched. A retry is recorded (attempts=<n>) and compare fails on it.
    if [ "$code" -ne 0 ] && [ "$code" -ne 142 ] && [ "$attempt" -lt 3 ] \
       && cat "$so" "$se" | grep -q -E 'TargetCloseError|Target closed|Session closed|Browser has disconnected|Connection closed|ProtocolError: .* timed out'; then
      echo "  $name: the browser went away; run again (attempt $((attempt + 1)))" >&2
      echo "$name: browser went away on attempt $attempt, run again" >> "$TIMES"
      attempt=$((attempt + 1))
      continue
    fi
    break
  done
  t1=$(now)
  STEP_ATTEMPTS=$attempt
  {
    emit_stream "$so" stdout
    emit_stream "$se" stderr
    if [ "$code" -eq 142 ]; then echo "exit=timeout"; else echo "exit=$code"; fi
    echo "attempts=$attempt"
  } > "$REC/$name.out"
  STEP_SECONDS=$(echo "$t1 $t0" | awk '{printf "%.1f", $1 - $2}')
  echo "$name $STEP_SECONDS s exit=$code attempts=$attempt" >> "$TIMES"
}

# save_seconds <file>: the wall time of the step just run, for the speed check; not when it needed a retry, as the
# time would include the failed attempt
save_seconds() {
  if [ "$STEP_ATTEMPTS" -eq 1 ]; then
    echo "$STEP_SECONDS" > "$1"
  else
    rm -f "$1"
    echo "  no $(basename "$1"): the step needed $STEP_ATTEMPTS attempts" >&2
  fi
}

# step <fixture> <step> <Cv.js arguments after the workspace...>: runs one command (one render page: WORKERS=1, so
# that every frame is drawn the same way every time), writes its log, snapshots.
step() {
  local fx=$1 label=$2
  shift 2
  cv "$fx" "$fx.$label" 1 "$@"
  snapshot "$fx" "$label"
}

# The gallery's video again with 4 render pages (the engine's default), on a copy of the workspace so that nothing
# else is disturbed. Pages that take frames in a different order draw some frames differently (mostly by 1 level of
# 255, in places by tens, in thin antialiased edges), so this render is not compared exactly: gallery.video4.mp4 and
# .framemd5 are left out of the exact diff, and compare.py checks every frame against the 1-worker render
# (gallery.video4.ref.mp4), see above. gallery.video4.out is exact (sizes masked).
video4() {
  local src=$WS/gallery dst=$WS/gallery4
  rm -rf "${dst:?}"
  cp -R "$src" "$dst"
  rm -rf "$dst/out" "$dst/build/segments"
  cp "$src/out/kit-gallery.mp4" "$REC/gallery.video4.ref.mp4"
  framemd5 gallery "$src/out/kit-gallery.mp4" "$REC/gallery.video4.ref.framemd5"
  MASK_SIZES=1 cv gallery4 gallery.video4 4 video --full
  save_seconds "$REC/gallery.video4.render-seconds"
  if [ -f "$dst/out/kit-gallery.mp4" ]; then
    cp "$dst/out/kit-gallery.mp4" "$REC/gallery.video4.mp4"
    framemd5 gallery "$dst/out/kit-gallery.mp4" "$REC/gallery.video4.framemd5"
    python3 "$SRC/compare.py" video4 "$REC" > "$REC/gallery.video4.tolerance" 2>&1
    sed 's/^/  /' "$REC/gallery.video4.tolerance" >&2
  fi
}

# prep <fixture> <source dir>: a fresh workspace at its fixed path
prep() {
  [ -f "$2/script.json" ] || die "no workspace at $2 for the $1 fixture"
  rm -rf "${WS:?}/$1" "${STATE:?}/$1"
  mkdir -p "$WS" "$STATE/$1"
  cp -R "$2" "$WS/$1"
  rm -rf "$WS/$1/build/tts-cache" "$WS/$1/build/segments"
}

edit() { python3 "$SRC/edits.py" "$1" "$WS/$2" || die "edit $1 failed"; }

# ---- the fixtures -------------------------------------------------------------------------------------------

fixture_gallery() {
  prep gallery "$GALLERY"
  step gallery narrate narrate
  step gallery narrate-warm narrate
  step gallery check check
  step gallery stills stills 3 12.5
  step gallery sheet sheet
  step gallery video-full video --full
  save_seconds "$REC/gallery.render-seconds"
  video4
  step gallery video video
  step gallery scan scan
  step gallery report report all
  step gallery present present --clips
  step gallery chapters chapters
  edit narrate-edit gallery
  step gallery narrate-edit narrate
}

fixture_progress() {
  prep progress "$PROGRESS"
  step progress narrate narrate
  # check resolves --lesson against the current directory (the repo root), so the path is absolute
  step progress check check --lesson "$WS/progress/build/lesson.md"
  step progress fill fill
  step progress history history
  cp "$WS/progress/build/lesson.before-1.md" "$WS/progress/build/lesson.md"
  step progress fix fix build/lesson-fixes.json
  step progress video-full video --full
  save_seconds "$REC/progress.render-seconds"
  step progress present present --clips
}

fixture_broken_check() {
  prep broken-check "$GALLERY"
  edit broken-check broken-check
  step broken-check check check
}

fixture_bad_voice() {
  prep bad-voice "$GALLERY"
  edit bad-voice bad-voice
  step bad-voice narrate narrate
}

fixture_page_error() {
  prep page-error "$GALLERY"
  edit page-error page-error
  step page-error video video --full
}

fixture_no_timing() {
  prep no-timing "$GALLERY"
  rm -rf "$WS/no-timing/build"
  step no-timing stills stills 3
  step no-timing present present --bogus
}

# ---- record and compare -------------------------------------------------------------------------------------

# record <label> [fixture ...]
record() {
  local label=$1 fx
  shift
  local fixtures=${*:-$(default_fixtures)}
  for fx in $fixtures; do
    case " $ALL_FIXTURES " in *" $fx "*) ;; *) die "unknown fixture: $fx (fixtures: $ALL_FIXTURES)" ;; esac
  done
  [ -f "$CV" ] || die "no $CV: build the engine first (dotnet fsi build.fsx)"
  REC=$GOLDEN/$label
  rm -rf "$REC"
  mkdir -p "$REC" "$GOLDEN/times"
  TIMES=$GOLDEN/times/$label.txt
  : > "$TIMES"
  local t0 t1
  t0=$(now)
  # the fixtures run in their canonical order whatever order they were named in
  for fx in $ALL_FIXTURES; do
    case " $fixtures " in *" $fx "*) ;; *) continue ;; esac
    echo "fixture $fx" >&2
    "fixture_$(echo "$fx" | tr - _)"
  done
  t1=$(now)
  local retried
  retried=$(cd "$REC" && grep -l -E '^attempts=([2-9]|[0-9]{2,})$' ./*.out 2>/dev/null | sed 's|^\./||; s|\.out$||' | tr '\n' ' ')
  if [ -n "$retried" ]; then echo "record $label: steps that needed a retry: $retried" | tee -a "$TIMES" >&2; fi
  echo "record $label: $(echo "$t1 $t0" | awk '{printf "%.0f", $1 - $2}') s" | tee -a "$TIMES" >&2
}

# compare <label> [fixture ...]: exit 0 when identical, else 1
compare() {
  local label=$1 fx
  shift
  local fixtures=${*:-$(default_fixtures)}
  [ -d "$GOLDEN/$label" ] || die "no recording $label: run golden.sh record $label first"
  [ "$label" != current ] || die "current is where compare records; name another label"
  record current $fixtures || exit $?
  local excludes=()
  for fx in $ALL_FIXTURES; do
    case " $fixtures " in *" $fx "*) ;; *) excludes+=(-x "$fx.*") ;; esac
  done
  excludes+=(-x '*.render-seconds' -x 'gallery.video4.mp4' -x 'gallery.video4.framemd5' -x 'gallery.video4.tolerance')
  diff -rq "${excludes[@]}" "$GOLDEN/$label" "$GOLDEN/current" > "$GOLDEN/times/compare.diff"
  local status=$?
  # 0: no difference, 1: differences; anything else is diff failing, and its output is not to be trusted
  [ "$status" -le 1 ] || die "diff failed with status $status; nothing was compared"
  python3 "$SRC/compare.py" "$GOLDEN/$label" "$GOLDEN/current" "$SRC/unstable.txt" "$GOLDEN/times/compare.diff"
}

case "${1:-}" in
  record)  [ $# -ge 2 ] || usage; shift; record "$@" ;;
  compare) [ $# -ge 2 ] || usage; shift; compare "$@" ;;
  *) usage ;;
esac
