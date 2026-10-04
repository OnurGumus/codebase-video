#!/usr/bin/env python3
"""Writes a WebVTT chapters file from a long video's build/timing.json.
  chapters.py <timing.json> <out.vtt>
A chapter is a scene with "chapter": "Title" (the "-why" bridge); it runs to the next one, the last to
the end of the video. The stretch before the first chapter is "Introduction". Videos without chapters
write nothing (exit 3), so callers can skip them. lesson-video.js reads <name>.chapters.vtt."""
import json, sys

def stamp(t):
    ms = round(t * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}.{ms % 1000:03d}"

def main():
    timing = json.load(open(sys.argv[1]))
    marks = [(s["start"], s["chapter"]) for s in timing["scenes"] if s.get("chapter")]
    if not marks:
        sys.exit(3)
    if marks[0][0] > 1:
        marks.insert(0, (0.0, "Introduction"))
    ends = [m[0] for m in marks[1:]] + [timing["duration"]]
    lines = ["WEBVTT", ""]
    for (start, title), end in zip(marks, ends):
        lines += [f"{stamp(start)} --> {stamp(end)}", title.replace("-->", "->"), ""]
    open(sys.argv[2], "w").write("\n".join(lines))

main()
