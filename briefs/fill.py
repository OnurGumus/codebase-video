#!/usr/bin/env python3
"""Fill the brief templates for one video: fill.py <workspace>/brief.json. Writes <workspace>/build/brief-<name>.txt.

brief.json (written by the skill in step 1):
  name          video name, kebab-case (the output files are out/<name>.mp4 ...)
  subject       what the video teaches, one line ("How a request flows through ky")
  repo          absolute path of the repository being taught
  length        "short" (3-5 min), "tour" (6-10 min) or "deep" (20-28 min)
  audience      who it is for ("a developer joining the team", "a reviewer", ...)
  colours       the drawing table: what kind of thing gets which colour and icon
  care          what to check with special care in this codebase (optional)
  visual        extra visual checks for this codebase (optional)
The teaching document is <workspace>/build/lesson.md (written in step 2, verified in step 3).
"""
import json, sys
from pathlib import Path

cfg_path = Path(sys.argv[1]).resolve()
ws = cfg_path.parent
cfg = json.loads(cfg_path.read_text())
here = Path(__file__).resolve().parent
lesson = ws / "build" / "lesson.md"
lines = len(lesson.read_text().split("\n")) if lesson.exists() else 0
LENGTHS = {
    "short": {"MINUTES": "3-5 minutes, hard cap 5.5", "WORDS": "about 450-750 spoken words", "CHAPTERS": "2-3 chapters",
              "SCENES": "2-3 content scenes per chapter, each 20-40 s", "THINKS": "no pause-and-think scene (a short video)",
              "DOC": "120-250 lines"},
    "tour": {"MINUTES": "6-10 minutes, hard cap 11", "WORDS": "about 800-1,400 spoken words", "CHAPTERS": "3-4 chapters",
             "SCENES": "2-4 content scenes per chapter, each 25-50 s", "THINKS": "one pause-and-think scene in each of two chapters", "DOC": "200-400 lines"},
    "deep": {"MINUTES": "20-28 minutes, hard cap 29", "WORDS": "about 2,800-3,400 spoken words", "CHAPTERS": "5-7 chapters",
             "SCENES": "3-6 content scenes per chapter, each 30-60 s", "THINKS": "exactly one pause-and-think scene per chapter", "DOC": "500-900 lines"},
}
length = LENGTHS[cfg.get("length", "tour")]
vals = {"WS": str(ws), "ENGINE": str(here.parent / "engine"), "BRIEFS": str(here), "NAME": cfg["name"],
        "SUBJECT": cfg["subject"], "REPO": cfg["repo"], "AUDIENCE": cfg.get("audience", "a developer new to this codebase"),
        "LINES": str(lines), "COLOURS": cfg["colours"], "CARE": cfg.get("care", ""), "VISUAL": cfg.get("visual", ""), **length}
for t in ("explore", "verify", "writer", "narration-audit", "builder", "visual-audit", "reaudit"):
    s = (here / f"{t}.md").read_text()
    for k, v in vals.items():
        s = s.replace("{{" + k + "}}", v)
    assert "{{" not in s, (t, s[s.index("{{"):][:40])
    out = ws / "build" / f"brief-{t}.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(s)
    print(out)
