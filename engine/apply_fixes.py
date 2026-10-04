#!/usr/bin/env python3
"""Apply exact-text corrections to the teaching document: apply_fixes.py <workspace> [fixes.json] [--apply]

fixes.json (default <workspace>/build/lesson-fixes.json) is a list of {"old", "new", ...}; each "old" must occur exactly
once at the moment it is applied (fixes apply in order). Without --apply this is a dry run that prints a diff summary.
With --apply the original is kept as build/lesson.before-<n>.md and build/lesson.md is rewritten.
"""
import difflib, json, sys
from pathlib import Path

ws = Path(sys.argv[1])
args = [a for a in sys.argv[2:] if a != "--apply"]
fixes_path = Path(args[0]) if args else ws / "build" / "lesson-fixes.json"
doc = ws / "build" / "lesson.md"
before = after = doc.read_text()
for i, fx in enumerate(json.loads(fixes_path.read_text())):
    n = after.count(fx["old"])
    if n != 1:
        sys.exit(f'fix {i} ({fx.get("id", "?")}): "old" occurs {n} times, expected 1. Nothing written.')
    after = after.replace(fx["old"], fx["new"])
diff = [d for d in difflib.unified_diff(before.split("\n"), after.split("\n"), lineterm="", n=0)
        if d.startswith(("+", "-")) and not d.startswith(("+++", "---"))]
print(f"{len(before)} -> {len(after)} chars; {len(diff)} changed lines")
if "--apply" in sys.argv:
    n = 1
    while (ws / "build" / f"lesson.before-{n}.md").exists():
        n += 1
    (ws / "build" / f"lesson.before-{n}.md").write_text(before)
    doc.write_text(after)
    print(f"applied; the previous text is build/lesson.before-{n}.md")
else:
    print("dry run: nothing written (add --apply)")
