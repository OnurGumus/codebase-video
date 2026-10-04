#!/usr/bin/env python3
"""Findings from build/scan.json (made by scan.mjs), with what the voice is saying at each moment.

  scan_report.py <clip-dir> [all|short|overlap|empty|headonly|bounds|blink|timeline|at <t>]

  short     text on screen under 3 s (and when it appears relative to its words)
  overlap   two visible texts (or a text and a drawing) overlapping
  empty     the module stage holding nothing for 2 s or more
  headonly  only a heading on the stage for 4 s or more while the narration talks
  bounds    module content outside x 60-1860, y 240-1000
  blink     an element that dips below 95% opacity and comes back within 1 s (a swap that blinks or jumps)
  ending    content fading out on the last frame while other content holds
  timeline  every element's on/off times with the words being spoken
  at <t>    everything visible at one moment
"""
import json, sys
from collections import defaultdict
from pathlib import Path

clip = Path(sys.argv[1])
mode = sys.argv[2] if len(sys.argv) > 2 else "all"
scan = json.loads((clip / "build" / "scan.json").read_text())
timing = json.loads((clip / "build" / "timing.json").read_text())
frames, step = scan["frames"], scan.get("step", 0.25)
PAUSE = {",": 4, ";": 6, ":": 6, "—": 6, "–": 6, ".": 8, "?": 8, "!": 8}  # the kit's word interpolation weights


def weight(text, upto):
    return sum(1 + PAUSE.get(c, 0) for c in text[:upto])


units = []
for s in timing["scenes"]:
    for i, se in enumerate(s["sentences"]):
        for u in (se["parts"] if se.get("parts") and len(se["parts"]) > 1 else [se]):
            units.append((s["id"], i, u["start"], u["end"], u.get("spoken") or u.get("text")))


def said(t):
    for sid, i, a, b, text in units:
        if a <= t <= b:
            target = (t - a) / max(b - a, 1e-6) * (weight(text, len(text)) or 1)
            k = 0
            while k < len(text) and weight(text, k) < target:
                k += 1
            return f"{sid}#{i} …{text[max(0, k - 25):k]}|{text[k:k + 30]}…"
    prev = [u for u in units if u[3] < t]
    return f"[silence after {prev[-1][0]}#{prev[-1][1]}]" if prev else "[before speech]"


def is_module(it):
    return str(it["layer"]).startswith("mod-")


# Presence: an element at 15% opacity or more counts as on screen (a dimmed node is still there). Elements are keyed
# by their text and rough x position, so a swap to an identical-looking copy (e.g. a struck "17") is one element.
PRESENT = 0.15
intervals, info = defaultdict(list), {}
for f in frames:
    seen_now = set()
    for it in f["items"]:
        if it["op"] < PRESENT or it.get("svg") or it.get("box") or it.get("pk"):
            continue
        k = (it["txt"][:60], round(it["x"] / 30), it["layer"])
        if k in seen_now:
            continue
        seen_now.add(k)
        info[k] = it
        iv = intervals[k]
        if iv and abs(iv[-1][1] - (f["t"] - step)) < 1e-6:
            iv[-1][1] = f["t"]
        else:
            iv.append([f["t"], f["t"]])

scene_starts = sorted(s["start"] for s in timing["scenes"])
END = timing.get("duration") or (frames[-1]["t"] if frames else 0)


def near_scene_change(a, b):
    return any(a - step <= t0 <= b + step for t0 in scene_starts)


def short():
    print("== text on screen under 3 s")
    for k, iv in intervals.items():
        it = info[k]
        if not is_module(it):
            continue
        for a, b in iv:
            if b - a + step < 3:
                cut = " (cut by a scene change)" if near_scene_change(b, b + 0.5) else ""
                print(f"{a:7.2f}-{b:7.2f} ({b - a + step:4.1f}s){cut} {it['txt'][:60]!r}\n          on: {said(a)}")


def overlap():
    print("== overlaps (text over text, text over part of a drawing, text straddling a box border)")
    found = {}

    def inside(T, S):
        return T["x"] >= S["x"] - 2 and T["r"] <= S["r"] + 2 and T["y"] >= S["y"] - 2 and T["b"] <= S["b"] + 2

    for f in frames:
        its = [i for i in f["items"] if i["op"] >= 0.5 and is_module(i) and not i.get("pk")]
        for i in range(len(its)):
            for j in range(i + 1, len(its)):
                A, B = its[i], its[j]
                shapes = (A.get("svg") or A.get("box"), B.get("svg") or B.get("box"))
                if all(shapes):
                    continue
                pa, pb = A["path"].split("/"), B["path"].split("/")
                if str(A["id"]) in pb or str(B["id"]) in pa:
                    continue
                w = min(A["r"], B["r"]) - max(A["x"], B["x"])
                h = min(A["b"], B["b"]) - max(A["y"], B["y"])
                if w > 4 and h > 6:
                    if any(shapes):
                        # text inside its own drawing or box is normal; report only text that straddles the edge
                        T, S = (B, A) if shapes[0] else (A, B)
                        if inside(T, S):
                            continue
                    found.setdefault((A["id"], B["id"]), [f["t"], f["t"], A["txt"][:45], B["txt"][:45], w, h])[1] = f["t"]
    for v in sorted(found.values()):
        print(f"{v[0]:7.2f}-{v[1]:7.2f} w{v[4]} h{v[5]}  {v[2]!r}  X  {v[3]!r}")


def empty():
    print("== empty stage for 2 s or more")
    run = None
    for f in frames:
        busy = [i for i in f["items"] if i["op"] >= 0.5 and (is_module(i) or i["layer"] in ("card", "titleCard", "toasts"))]
        if not busy:
            run = f["t"] if run is None else run
        else:
            if run is not None and f["t"] - run >= 2:
                print(f"{run:7.2f}-{f['t']:7.2f} ({f['t'] - run:.1f}s) {said(run)}")
            run = None


def headonly():
    print("== heading only for 4 s or more")
    run = None
    for f in frames:
        mods = [i for i in f["items"] if i["op"] >= 0.5 and is_module(i)]
        content = [i for i in mods if i["y"] >= 215]
        cards = [i for i in f["items"] if i["op"] >= 0.5 and i["layer"] in ("card", "titleCard")]
        if mods and not content and not cards:
            run = run or (f["t"], [i["txt"][:40] for i in mods])
        else:
            if run and f["t"] - run[0] >= 4:
                print(f"{run[0]:7.2f}-{f['t']:7.2f} ({f['t'] - run[0]:.1f}s) {run[1]}  {said(run[0])}")
            run = None


def bounds():
    print("== outside x 60-1860 / y 240-1000 (headings sit higher by design)")
    bad = {}
    for f in frames:
        for it in f["items"]:
            if it["op"] < 0.5 or not is_module(it) or it["y"] < 200:
                continue
            if it["x"] < 58 or it["r"] > 1862 or it["b"] > 1002:
                bad.setdefault((it["id"], it["txt"][:50]), []).append((f["t"], it["x"], it["y"], it["r"], it["b"]))
    for k, v in bad.items():
        print(f"{v[0][0]:7.2f}-{v[-1][0]:7.2f} {k[1]!r} x{v[0][1]} y{v[0][2]} r{v[0][3]} b{v[0][4]}")


def blink():
    print("== blinks: an element dipping below 95% and back within 1 s (or jumping position)")
    series = defaultdict(dict)
    for f in frames:
        for it in f["items"]:
            if not is_module(it) or it.get("pk") or it.get("box"):
                continue
            k = (it["txt"][:60], round(it["x"] / 30))
            prev = series[k].get(f["t"])
            if prev is None or it["op"] > prev[0]:
                series[k][f["t"]] = (it["op"], it["y"])
    ts = [f["t"] for f in frames]
    for k, s in series.items():
        vals = [s.get(t, (0, None)) for t in ts]
        i = 0
        while i < len(ts):
            if vals[i][0] >= 0.95:
                j = i + 1
                while j < len(ts) and vals[j][0] >= 0.95:
                    j += 1
                k2 = j
                while k2 < len(ts) and vals[k2][0] < 0.95 and ts[k2] - ts[j] <= 1.0:
                    k2 += 1
                if j < len(ts) and k2 < len(ts) and vals[k2][0] >= 0.95 and ts[k2] - ts[j] <= 1.0 \
                        and not near_scene_change(ts[j], ts[k2]):
                    low = min(v[0] for v in vals[j:k2])
                    moved = vals[j - 1][1] != vals[k2][1]
                    print(f"{ts[j]:7.2f}-{ts[k2]:7.2f} min {low:.2f}{' moved' if moved else ''}  {k[0]!r}")
                i = j
            else:
                i += 1


def ending():
    print("== the last frame: content that fades out while other content holds")
    if len(frames) < 4:
        return
    last, before = frames[-1], min(frames, key=lambda f: abs(f["t"] - (frames[-1]["t"] - 1.0)))
    now = {(i["txt"][:60], round(i["x"] / 30)): i["op"] for i in last["items"] if is_module(i) and not i.get("pk")}
    then = {(i["txt"][:60], round(i["x"] / 30)): i["op"] for i in before["items"] if is_module(i) and not i.get("pk")}
    holding = [k for k, v in now.items() if v >= 0.9]
    for k, v in then.items():
        if v >= 0.95 and now.get(k, 0) < 0.6 and holding:
            print(f"  {k[0]!r} fades to {now.get(k, 0):.2f} by {last['t']:.2f} while {len(holding)} other item(s) hold")


def timeline():
    for k, iv in sorted(intervals.items(), key=lambda kv: kv[1][0][0]):
        it = info[k]
        for a, b in iv:
            print(f"{a:7.2f}-{b:7.2f} ({b - a + step:5.1f}s) [{it['layer']}] {it['txt'][:70]!r}\n          on: {said(a)}")


errors = [l for l in scan["logs"] if ("error" in l.lower() or "failed" in l.lower()) and "Failed to load resource" not in l]
if mode == "at":
    t = float(sys.argv[3])
    f = min(frames, key=lambda f: abs(f["t"] - t))
    print(f["t"], said(f["t"]))
    for it in f["items"]:
        print(it)
elif mode == "all":
    print("== page errors / failed module builds:", errors or "none")
    for fn in (short, overlap, empty, headonly, bounds, blink, ending):
        fn()
else:
    {"short": short, "overlap": overlap, "empty": empty, "headonly": headonly, "bounds": bounds, "blink": blink,
     "ending": ending, "timeline": timeline}[mode]()
