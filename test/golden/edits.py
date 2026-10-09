#!/usr/bin/env python3
"""The fixed edits golden.sh makes to its fixture copies: edits.py <kind> <workspace>.

Every edit is an exact text replacement in the file as it ships (it must match exactly once), so the result is the
same on every run. Nothing here is random and nothing reads the clock.

  broken-check  script.json: a scene id used twice, one [pausee], one 40-word sentence, one [rest 3], one unknown
                capitalised term (ZQX), one [think 20]
  bad-voice     script.json: "voice": "xx_nope"
  page-error    tb.js: a K.custom piece whose render throws new Error("golden") (from a timer, so that it is an
                uncaught page error) on the first frame more than 2 s into tb-demo
  narrate-edit  script.json: scene intro's first sentence gets "again" before its final period
"""
import sys
from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    n = text.count(old)
    if n != 1:
        sys.exit(f"edits.py: {path.name}: expected exactly one {old!r}, found {n}")
    path.write_text(text.replace(old, new), encoding="utf-8")


def broken_check(ws: Path) -> None:
    script = ws / "script.json"
    # one scene id used twice: the last scene takes the id of the second
    replace_once(script, '"id": "outro"', '"id": "intro"')
    # one [pausee]
    replace_once(
        script,
        "This gallery shows every piece of the stage kit. Each piece",
        "This gallery shows every piece of the stage kit. [pausee] Each piece",
    )
    # one 40-word sentence (the title scene's only sentence)
    forty = (
        "The stage kit gallery is a long sentence that keeps going without a full stop so that the checker "
        "must count every word and then warn the author that one caption should never run this long on screen today too"
    )
    assert len(forty.split()) == 40, len(forty.split())
    replace_once(script, '"say": "The stage kit gallery."', f'"say": "{forty}."')
    # one [rest 3]
    replace_once(script, "the cache, [rest] the load balancer", "the cache, [rest 3] the load balancer")
    # one unknown capitalised term
    replace_once(script, '"say": "Step one: text, lines and chips."', '"say": "Step one: text, lines and chips, in the ZQX module."')
    # one [think 20]
    replace_once(script, "[think 4]", "[think 20]")


def bad_voice(ws: Path) -> None:
    replace_once(ws / "script.json", '"voice": "af_heart"', '"voice": "xx_nope"')


def page_error(ws: Path) -> None:
    tb = ws / "tb.js"
    replace_once(
        tb,
        '  K.heading("A table", { at: "tb-demo" });\n',
        '  K.heading("A table", { at: "tb-demo" });\n'
        '  K.custom((root) => document.createElement("div"), (t, el) => {\n'
        '    // The frame catches a module\'s render error and only logs it, so the error is thrown from a timer, where\n'
        '    // it is an uncaught page error. Only the first frame more than 2 s into tb-demo throws (a frame is drawn\n'
        '    // at i/30 + 1e-6 s), so the log does not depend on how many frames the parallel pages had drawn when the\n'
        '    // run stopped. (The module is on stage only from tb-demo on, so a bare t > 2 would throw on every frame.)\n'
        '    const s = window.TIMING.scenes.find((x) => x.id === "tb-demo").start;\n'
        '    if (t > s + 2 && t < s + 2 + 1 / 30) setTimeout(() => { throw new Error("golden"); }, 0);\n'
        '  });\n',
    )


def narrate_edit(ws: Path) -> None:
    replace_once(
        ws / "script.json",
        "This gallery shows every piece of the stage kit. Each piece",
        "This gallery shows every piece of the stage kit again. Each piece",
    )


KINDS = {
    "broken-check": broken_check,
    "bad-voice": bad_voice,
    "page-error": page_error,
    "narrate-edit": narrate_edit,
}

if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in KINDS:
        sys.exit(__doc__)
    KINDS[sys.argv[1]](Path(sys.argv[2]))
