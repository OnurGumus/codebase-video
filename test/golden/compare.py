#!/usr/bin/env python3
"""compare.py <label-dir> <current-dir> <unstable.txt> <diff -rq output>

Reads what `diff -rq` found different between two recordings and prints "identical" (exit 0), or each differing
path (exit 1). A path listed in unstable.txt is not a difference by itself: it is compared by the method written
beside it, and counts only when that method finds a difference.

unstable.txt: one entry per line, "<path pattern><TAB><method>"; blank lines and lines starting with # are ignored.
The pattern is relative to the recording's directory and may use * (any characters, also across /). Methods:
  wav-duration     both files are WAV files with the same format and the same length (their bytes may differ)
  strip:<regex>    the files are equal after every match of the (Python) regular expression is removed from both

A step that needed a retry (its .out ends with attempts=2 or more: the browser went away and golden.sh ran the
command again) is a problem of its own: compare names it, whatever else it found, and never prints "identical".

compare.py video4 <recording dir>
Checks the gallery's 4-worker render of a recording against its 1-worker render (gallery.video4.ref.mp4): the same
number of frames, the same audio, and every video frame at least MIN_PSNR (48) dB from its counterpart. Only the
frames whose frame checksums differ are decoded. It prints how many frames differ, the largest difference in any
channel (of 255) and the lowest PSNR, then each frame under the limit with its index; exit 1 when there is one.
compare (the first form) runs this check on the new recording too.

Why PSNR and not "no channel more than 1 of 255 apart": with 4 render pages some frames come out differently from
the 1-worker render by more than 1 level (the largest seen: 48 of 255 in the mp4, 45 in the lossless frames, in thin
antialiased edges; the lowest PSNR 52.3 to 52.8 dB, the median 69 dB). A frame drawn at the wrong time, or without an element,
is below 48 dB.
"""
import fnmatch
import os
import re
import struct
import subprocess
import sys
import tempfile

MIN_PSNR = 48.0  # dB per frame, 4 workers against 1 worker; the lowest seen is 52.3 to 52.8


def wav_format(path):
    """(channels, sample rate, bits, data bytes) of a RIFF/WAVE file."""
    with open(path, "rb") as f:
        data = f.read()
    if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise ValueError("not a WAV file")
    pos, fmt, size = 12, None, None
    while pos + 8 <= len(data):
        tag, n = data[pos:pos + 4], struct.unpack("<I", data[pos + 4:pos + 8])[0]
        body = pos + 8
        if tag == b"fmt ":
            code, channels, rate, _, _, bits = struct.unpack("<HHIIHH", data[body:body + 16])
            fmt = (code, channels, rate, bits)
        elif tag == b"data":
            size = min(n, len(data) - body)
            break
        pos = body + n + (n & 1)
    if fmt is None or size is None:
        raise ValueError("no fmt or data chunk")
    return fmt + (size,)


def same_wav_duration(a, b, _arg):
    return wav_format(a) == wav_format(b)


def same_after_strip(a, b, regex):
    rx = re.compile(regex)
    with open(a, encoding="utf-8", errors="surrogateescape") as fa, open(b, encoding="utf-8", errors="surrogateescape") as fb:
        return rx.sub("", fa.read()) == rx.sub("", fb.read())


METHODS = {"wav-duration": same_wav_duration, "strip": same_after_strip}


def load_unstable(path):
    entries = []
    if os.path.exists(path):
        for raw in open(path, encoding="utf-8"):
            line = raw.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            pattern, _, method = line.partition("\t")
            name, _, arg = method.strip().partition(":")
            if name not in METHODS:
                sys.exit(f"compare.py: {path}: unknown method {method!r} for {pattern!r}")
            entries.append((pattern.strip(), name, arg))
    return entries


# ---- the 4-worker render against the 1-worker render ---------------------------------------------------------

def read_framemd5(path):
    """{stream kind: [checksum, ...]} in file order; 'video' and 'audio'."""
    kinds, frames = {}, {}
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = re.match(r"#media_type (\d+): (\w+)", line)
            if m:
                kinds[int(m.group(1))] = m.group(2)
                continue
            if line.startswith("#") or not re.match(r"\d+,", line):
                continue
            parts = [p.strip() for p in line.split(",")]
            frames.setdefault(kinds.get(int(parts[0]), "stream" + parts[0]), []).append(parts[-1])
    return frames


def ranges(indexes):
    """[3,4,5,9] -> [(3,5),(9,9)]"""
    out = []
    for i in indexes:
        if out and i == out[-1][1] + 1:
            out[-1] = (out[-1][0], i)
        else:
            out.append((i, i))
    return out


def frame_stats(ref, other, indexes):
    """{frame index: (largest difference in any channel, PSNR in dB)} for the given frames, decoding only those."""
    if not indexes:
        return {}
    expr = "+".join(f"between(n\\,{a}\\,{b})" for a, b in ranges(indexes))
    with tempfile.TemporaryDirectory() as tmp:
        stats = os.path.join(tmp, "psnr.txt")
        graph = (f"[0:v]select='{expr}'[a];[1:v]select='{expr}'[b];[a]split[a1][a2];[b]split[b1][b2];"
                 "[a1][b1]blend=all_mode=difference,signalstats,metadata=print:file=-[o1];"
                 f"[a2][b2]psnr=stats_file={stats}[o2]")
        run = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-i", ref, "-i", other,
                              "-filter_complex", graph, "-map", "[o1]", "-fps_mode", "passthrough", "-f", "null", "-",
                              "-map", "[o2]", "-fps_mode", "passthrough", "-f", "null", "-"],
                             capture_output=True, text=True)
        if run.returncode != 0:
            raise ValueError("ffmpeg failed: " + run.stderr.strip()[:300])
        worst, k, seen = {}, -1, 0
        for line in run.stdout.splitlines():
            m = re.match(r"frame:(\d+)", line)
            if m:
                k = int(m.group(1))
                seen += 1
                continue
            m = re.match(r"lavfi\.signalstats\.([YUV])MAX=(\d+)", line)
            if m and 0 <= k < len(indexes):
                worst[indexes[k]] = max(worst.get(indexes[k], 0), int(m.group(2)))
        psnr = []
        with open(stats, encoding="utf-8") as f:
            for line in f:
                m = re.search(r"psnr_avg:(\S+)", line)
                if m:
                    psnr.append(float(m.group(1)))
    if seen != len(indexes) or len(psnr) != len(indexes):
        raise ValueError(f"expected {len(indexes)} decoded frames, got {seen} (signalstats) and {len(psnr)} (psnr)")
    return {i: (worst.get(i, 0), psnr[k]) for k, i in enumerate(indexes)}


def check_video4(rec):
    """(lines to print, problems) for the recording's 4-worker render."""
    ref, other = os.path.join(rec, "gallery.video4.ref.mp4"), os.path.join(rec, "gallery.video4.mp4")
    md5_ref = os.path.join(rec, "gallery.video4.ref.framemd5")
    md5_other = os.path.join(rec, "gallery.video4.framemd5")
    missing = [os.path.basename(p) for p in (ref, other, md5_ref, md5_other) if not os.path.exists(p)]
    if missing:
        return [], [f"gallery.video4: missing {', '.join(missing)} (the 4-worker render failed?)"]
    a, b = read_framemd5(md5_ref), read_framemd5(md5_other)
    problems = []
    if len(a.get("video", [])) != len(b.get("video", [])):
        problems.append(f"gallery.video4: {len(b.get('video', []))} frames, the 1-worker render has {len(a.get('video', []))}")
        return [], problems
    if a.get("audio") != b.get("audio"):
        problems.append("gallery.video4: the audio frames differ from the 1-worker render")
    differing = [i for i, (x, y) in enumerate(zip(a["video"], b["video"])) if x != y]
    try:
        stats = frame_stats(ref, other, differing)
    except ValueError as err:
        return [], problems + [f"gallery.video4: {err}"]
    peak = max((d for d, _ in stats.values()), default=0)
    over_one = sum(1 for d, _ in stats.values() if d > 1)
    lowest = min((p for _, p in stats.values()), default=float("inf"))
    lines = [f"gallery.video4: {len(a['video'])} frames, {len(differing)} differ in frame checksum from the 1-worker render "
             f"({over_one} of them by more than 1 level), largest difference in any channel {peak} of 255, "
             f"lowest PSNR {lowest:.1f} dB (limit {MIN_PSNR:g})"]
    for i in differing:
        d, p = stats[i]
        if p < MIN_PSNR:
            problems.append(f"gallery.video4: frame {i} is {p:.1f} dB from the 1-worker frame (limit {MIN_PSNR:g}), "
                            f"largest difference in a channel {d} of 255")
    return lines, problems


def attempts(out_path):
    """The attempts=<n> line that ends a step's .out, or None when it has none."""
    with open(out_path, encoding="utf-8", errors="replace") as f:
        m = re.search(r"^attempts=(\d+)\n?\Z", f.read(), re.M)
    return int(m.group(1)) if m else None


def retried_steps(rec, who):
    """(problems, notes): steps of the recording whose .out records more than one attempt, or no attempts line."""
    problems, notes = [], []
    for name in sorted(os.listdir(rec)):
        if not name.endswith(".out"):
            continue
        n = attempts(os.path.join(rec, name))
        step = name[:-4]
        if n is None:
            problems.append(f"{step}: no attempts= line in {who}'s log")
        elif n > 1:
            problems.append(f"{step}: retried, {n} attempts in {who} (the browser went away); not a clean run")
    return problems, notes


def main(label_dir, current_dir, unstable_path, diff_path):
    unstable = load_unstable(unstable_path)
    problems = []
    for line in open(diff_path, encoding="utf-8", errors="replace"):
        line = line.rstrip("\n")
        m = re.fullmatch(r"Files (.+) and (.+) differ", line)
        if m:
            rel = os.path.relpath(m.group(1), label_dir)
            kind = "differs"
        else:
            m = re.fullmatch(r"Only in (.+): (.+)", line)
            if not m:
                problems.append(f"unreadable diff line: {line}")
                continue
            where = os.path.join(m.group(1), m.group(2))
            if where.startswith(label_dir + os.sep):
                rel, kind = os.path.relpath(where, label_dir), "only in the baseline"
            else:
                rel, kind = os.path.relpath(where, current_dir), "only in the new run"
        entry = next((e for e in unstable if fnmatch.fnmatchcase(rel, e[0])), None)
        if entry and kind == "differs":
            _, name, arg = entry
            try:
                if METHODS[name](os.path.join(label_dir, rel), os.path.join(current_dir, rel), arg):
                    continue
            except (OSError, ValueError) as err:
                problems.append(f"{rel}: {name}: {err}")
                continue
            problems.append(f"{rel}: differs ({name})")
        else:
            problems.append(f"{rel}: {kind}")
    found, _ = retried_steps(current_dir, "the new run")
    problems += found
    baseline, _ = retried_steps(label_dir, "the baseline")
    for line in baseline:
        print("note: " + line, file=sys.stderr)
    if os.path.exists(os.path.join(current_dir, "gallery.video4.mp4")) or os.path.exists(os.path.join(current_dir, "gallery.video4.out")):
        lines, found = check_video4(current_dir)
        for line in lines:
            print(line, file=sys.stderr)
        problems += found
    if problems:
        print("\n".join(problems))
        return 1
    print("identical")
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "video4":
        out, found = check_video4(sys.argv[2])
        print("\n".join(out + found))
        sys.exit(1 if found else 0)
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    sys.exit(main(*sys.argv[1:]))
