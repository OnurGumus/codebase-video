"""Check a lesson clip before rendering: the script, its timing, its module code and (optionally) the lesson.

Usage: check.py <clip-dir> [--lesson lesson.md]

Catches, for free, the things audits kept finding by eye:
  script   duplicate or badly formed scene ids; a [shown](spoken) pair whose shown text ends a sentence
           (the splitter cannot see that period, so two sentences merge); sentences too long for one caption;
           digits, symbols and acronyms the voice may misread (not wrapped in [shown](spoken))
  long     (clips with "-why" bridge scenes) every bridge has a "chapter" title; an intro and an outro exist;
           every chapter has content; every module prefix has its <key>.js
  cues     every "scene|phrase", "scene#n" and "scene" time in the module files names a real scene, sentence
           and spoken phrase (the same lookup Stage.word does), so a re-voiced line fails here, not on screen
  lesson   (--lesson) numbers in the narration and in on-screen strings that the lesson never states
  length   words and estimated minutes per chapter (Kokoro af_heart speaks about 2.4 words a second)
  toasts   every scene "toasts" entry names a known kind (stage-kit.js TOASTS) and a phrase spoken in that
           scene; warns when toasts crowd (under 6 s apart) or one kind dominates
  breathe  talk share of the running time and the longest stretch with no pause of 1.5 s or more (long
           videos: warns over 60 s and over 85% talk; a chapter with no recap or think gets a nudge)
  flow     per chapter, the share of sentences that link to the one before (so, but, remember, the tricky
           part, ...); a chapter under FLOW_MIN reads as a list of facts. Also flags one connective overused.

Exit status 1 when there is an error; warnings alone exit 0.
"""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from narrate import sentences, shown, heard, breaks, PRONOUNCE  # noqa: E402  (same splitter and forms as narration)

WPS = 2.4
ERR, WARN = [], []
READ = {}   # token -> where it is read as written
err = ERR.append
warn = WARN.append


def load(clip):
    script = json.loads((clip / "script.json").read_text())
    timing_path = clip / "build" / "timing.json"
    timing = json.loads(timing_path.read_text()) if timing_path.exists() else None
    if timing and (timing_path.stat().st_mtime < (clip / "script.json").stat().st_mtime):
        warn("build/timing.json is older than script.json: run `build.sh <clip> narrate` (cue checks use the old timing)")
    return script, timing


def check_script(script):
    ids = [s["id"] for s in script["scenes"]]
    for i in {x for x in ids if ids.count(x) > 1}:
        err(f"scene id {i!r} is used twice")
    for s in script["scenes"]:
        sid, say = s["id"], s.get("say", "")
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", sid):
            err(f"{sid}: scene ids are lowercase words joined by '-' (the part before the first '-' names the module)")
        for m in PRONOUNCE.finditer(say):
            shown_text = m.group(1)
            after = say[m.end():m.end() + 2]
            if re.search(r"[.!?]$", shown_text) and re.match(r"\s+[A-Z\"'“\[0-9]", after + " "):
                err(f"{sid}: [{shown_text}](...) ends a sentence inside the brackets; move the '{shown_text[-1]}' outside, or the next sentence merges into this one")
        for i, sent in enumerate(sentences(say)):
            for m in re.finditer(r"\[(?:pause|think)[^\]]*\]", sent):
                if not re.fullmatch(r"\[(pause|think)(\s+\d+(\.\d+)?)?\]", m.group(0)):
                    err(f"{sid}[{i}]: {m.group(0)!r} is not a break marker ([pause], [pause 2], [think], [think 4]); the voice would read it")
            for kind, secs in breaks(sent):
                if not 0.5 <= secs <= 12:
                    warn(f"{sid}[{i}]: [{kind} {secs:g}] - keep breaks between 0.5 and 12 s")
            words = len(shown(sent).split())
            if words > 32:
                warn(f"{sid}[{i}]: {words} words in one sentence (one caption); split it")
            plain = PRONOUNCE.sub("", sent)          # what the voice reads as written
            plain = re.sub(r"\{[a-z]{2,3}:[^{}]+\}", "", plain)
            for tok in re.findall(r"\d[\d,.]*\s*(?:%|×|x\b|ms\b|µs\b|ns\b|GB|TB|PB|MB|KB|Gbps|Mbps|k\b|M\b|B\b)?|[×÷≈→%/]|\b[A-Z]{2,}\b", plain):
                tok = tok.strip()
                if not tok:
                    continue
                if re.fullmatch(r"\d{1,2}", tok):
                    continue                          # small plain numbers read fine
                READ.setdefault(tok, []).append(f"{sid}[{i}]")


def check_long(clip, script):
    scenes = script["scenes"]
    whys = [s for s in scenes if s["id"].endswith("-why")]
    if not whys:
        return False
    for s in whys:
        if not s.get("chapter"):
            err(f"{s['id']}: a bridge scene needs \"chapter\": \"Title\" (the frame shows it on the title card)")
    prefixes = [s["id"].split("-")[0] for s in scenes]
    if scenes[0]["id"] != "title" or not (script.get("card") or {}).get("course") or not (script.get("card") or {}).get("lesson"):
        err('a long video opens with a scene "title" and a top-level "card": {"course", "lesson", "sub"}, so the viewer knows the course and lesson before anything else')
    if "intro" not in prefixes:
        warn("no intro scene: a long video should open by stating its goal")
    if "outro" not in prefixes:
        warn("no outro scene: a long video should close on its goal")
    for k, s in enumerate(scenes):
        if s["id"].endswith("-why") and (k + 1 >= len(scenes) or scenes[k + 1]["id"].endswith("-why") or scenes[k + 1]["id"].split("-")[0] == "outro"):
            err(f"{s['id']}: chapter has no content scenes")
    for key in dict.fromkeys(p for p, s in zip(prefixes, scenes) if not s["id"].endswith("-why") and s["id"] != "title" and not s.get("recap")):
        if not (clip / f"{key}.js").exists():
            err(f"module {key!r} has no {key}.js")
    return True


# ── cues ────────────────────────────────────────────────────────────────────────────────
SPEC = re.compile(r"""["'`]([a-z0-9]+(?:-[a-z0-9]+)+)(?:\|([^"'`|]+?)(\$)?(?:\|(\d+))?|#(\d+))?["'`]""")
WORD_CALL = re.compile(r"""\bword\(\s*["'`]([a-z0-9]+(?:-[a-z0-9]+)+)["'`]\s*,\s*["'`]([^"'`]+)["'`]""")
SCENE_CONST = re.compile(r"""\bconst\s+S\s*=\s*["'`]([a-z0-9]+(?:-[a-z0-9]+)+)["'`]""")
SCENE_REF = re.compile(r"""\bS\s*\+\s*["'`]((?:\||#)[^"'`]*)["'`]""")
CUE_CALL = re.compile(r"""\b(?:cue|at|part)\(\s*["'`]([a-z0-9]+(?:-[a-z0-9]+)+)["'`]\s*(?:,\s*(-?\d+))?""")


def check_cues(clip, timing, js_files):
    if not timing:
        warn("no build/timing.json yet: cue checks skipped (run narrate first)")
        return
    by_id = {s["id"]: s for s in timing["scenes"]}

    def spoken_units(s):
        for sent in s["sentences"]:
            yield (sent.get("spoken") or sent["text"]).lower(), sent["text"].lower()

    def has_phrase(sid, phrase, nth):
        s = by_id[sid]
        want = phrase.lower()
        for field in (0, 1):
            count = 0
            for u in spoken_units(s):
                count += u[field].count(want)
            if count >= nth:
                return True
        return False

    for f in js_files:
        src = f.read_text()
        cur = None                                    # the scene id in the nearest `const S = "…"` above
        for ln, line in enumerate(src.splitlines(), 1):
            if line.strip().startswith("//"):
                continue
            if (d := SCENE_CONST.search(line)):
                cur = d.group(1)
            # `S + "|phrase"` / `S + "#2"` is the same cue as `"<scene>|phrase"`; check it as one.
            line = SCENE_REF.sub(lambda m: f'"{cur}{m.group(1)}"' if cur else m.group(0), line)
            for m in SPEC.finditer(line):
                sid, phrase, _end, nth, sent = m.groups()
                if sid.split("-")[0] in ("k",) or (sid not in by_id and "|" not in m.group(0) and "#" not in m.group(0)):
                    continue                          # a plain string that merely looks like an id
                if sid not in by_id:
                    err(f"{f.name}:{ln}: no scene {sid!r}")
                elif phrase and not has_phrase(sid, phrase, int(nth or 1)):
                    err(f"{f.name}:{ln}: {phrase!r} is not spoken in {sid}" + (f" {nth} times" if nth else ""))
                elif sent and int(sent) >= len(by_id[sid]["sentences"]):
                    err(f"{f.name}:{ln}: {sid} has {len(by_id[sid]['sentences'])} sentence(s), asked for #{sent}")
            for m in WORD_CALL.finditer(line):
                sid, phrase = m.groups()
                if sid in by_id and not has_phrase(sid, phrase, 1):
                    err(f"{f.name}:{ln}: word({sid!r}, {phrase!r}): not spoken there")
                elif sid not in by_id:
                    err(f"{f.name}:{ln}: no scene {sid!r}")
            for m in CUE_CALL.finditer(line):
                sid, i = m.groups()
                if sid not in by_id:
                    err(f"{f.name}:{ln}: no scene {sid!r}")
                elif i is not None and (int(i) >= len(by_id[sid]["sentences"]) or -int(i) > len(by_id[sid]["sentences"])):
                    err(f"{f.name}:{ln}: {sid} has {len(by_id[sid]['sentences'])} sentence(s), asked for {i}")


    def toast_time(s, at):
        """When a toast fires: the start of the sentence holding its phrase, plus the phrase's share of that
        sentence (the kit interpolates words the same way, near enough for a 6 s spacing check)."""
        sents = s["sentences"]
        if not sents:
            return s["start"]
        if at and str(at).startswith("#"):
            i = int(str(at)[1:])
            return sents[min(i, len(sents) - 1)]["start"]
        if at:
            want = str(at).lower()
            for se in sents:
                for text in ((se.get("spoken") or se["text"]).lower(), se["text"].lower()):
                    k = text.find(want)
                    if k >= 0:
                        return se["start"] + (se["end"] - se["start"]) * k / max(len(text), 1)
        return sents[0]["start"]

    # Toasts on scenes (script.json "toasts"): known kind, a phrase that is spoken, and not crowded.
    kit = (Path(__file__).parent / "stage-kit.js").read_text()
    kinds = set(re.findall(r"^\s{4}(\w+):\s+\{ icon:", kit, re.M))
    seen = []
    for s in timing["scenes"]:
        for d in s.get("toasts", []):
            where = f"{s['id']} toast {d.get('kind')!r}"
            if d.get("kind") not in kinds:
                err(f"{where}: unknown kind; use one of {', '.join(sorted(kinds))}")
            at = d.get("at")
            if at and not str(at).startswith("#") and not has_phrase(s["id"], at, 1):
                err(f"{where}: {at!r} is not spoken in {s['id']}")
            if d.get("text") and len(d["text"].split()) > 5:
                warn(f"{where}: text {d['text']!r} is long for a badge; keep it to about 4 words")
            seen.append((toast_time(s, at), d.get("kind"), where))
    seen.sort()
    # Every pair, in the same scene or not: two badges within 6 s crowd the top band.
    for (a, _, wa), (b, _, wb) in zip(seen, seen[1:]):
        if b - a < 6:
            warn(f"toasts crowd: {wa} and {wb} are {b - a:.1f} s apart (keep at least 6 s)")
    if seen:
        from collections import Counter
        c = Counter(k for _, k, _ in seen)
        print("toasts: " + ", ".join(f"{k} {n}" for k, n in c.most_common()) + f" ({len(seen)} total)")


# ── lesson grounding ────────────────────────────────────────────────────────────────────
NUM = re.compile(r"(?<![\w.])\d+(?:[.,]\d+)*")


def norm(n):
    return n.replace(",", "")


def check_lesson(script, js_files, lesson_text):
    have = {norm(n) for n in NUM.findall(lesson_text)}
    # "35k/s", "1.8M", "3B/day": the lesson's shorthand for the numbers a narrator says in full.
    for m in re.finditer(r"(?<![\w.])(\d+(?:\.\d+)?)\s*([kKMB])(?![a-zA-Z])", lesson_text):
        v = float(m.group(1)) * {"k": 1e3, "K": 1e3, "M": 1e6, "B": 1e9}[m.group(2)]
        have.add(str(int(v)) if v == int(v) else str(v))
    seen = {}
    for s in script["scenes"]:
        for n in NUM.findall(PRONOUNCE.sub(lambda m: m.group(1), s.get("say", ""))):
            seen.setdefault(norm(n), f"narration {s['id']}")
    # String literals scanned left to right, so the text between two literals is never read as one.
    strings = re.compile(r'"((?:[^"\\]|\\.)*)"|\'((?:[^\'\\]|\\.)*)\'|`((?:[^`\\]|\\.)*)`')
    for f in js_files:
        for ln, line in enumerate(f.read_text().splitlines(), 1):
            if line.strip().startswith("//"):
                continue
            for m in strings.finditer(line):
                text = next(g for g in m.groups() if g is not None)
                if not re.search(r"\d", text):
                    continue
                if (re.search(r"\d\s*px\b|\b(?:left|top|width|height|margin|padding|translate|scale|rotate|rgba?)\b|#[0-9a-f]{3}", text)
                        or re.fullmatch(r"\s*[MLCQZmlcqz][\d\s.,MLCQZmlcqz-]*", text) or re.fullmatch(r"[\d\s.,-]+", text)
                        or "|" in text or "${" in text):
                    continue                          # layout, SVG paths, bare coordinates, colours, cue specs
                for n in NUM.findall(text):
                    seen.setdefault(norm(n), f"{f.name}:{ln}")
    small = {str(i) for i in range(0, 13)} | {"100"}
    missing = [(n, where) for n, where in seen.items() if n not in have and n not in small]
    for n, where in sorted(missing, key=lambda x: x[1]):
        warn(f"{n} ({where}) does not appear in the lesson; check it is derived from lesson numbers, or drop it")


# Words and phrases that tie a sentence to what came before: cause, contrast, callback, signpost, caution.
CONNECTIVES = [
    "so", "therefore", "hence", "that's why", "which is why", "this is why", "because", "as a result", "that means",
    "this means", "which means", "in other words", "but", "however", "on the other hand", "instead",
    "even so", "whereas", "unlike", "remember", "recall", "as we saw", "earlier", "back in", "you saw",
    "now", "next", "first", "then", "finally", "in short", "here's", "here is", "the tricky part", "the catch",
    "the key point", "the key idea", "the question is", "notice", "watch", "careful", "surprisingly", "it turns out", "the trap",
    "a common mistake", "easy to miss", "perhaps", "similarly", "likewise", "after all", "in fact", "as you know", "for example", "for instance", "you might", "imagine", "suppose", "what if",
]
CONN_RE = re.compile(r"\b(" + "|".join(re.escape(c) for c in sorted(CONNECTIVES, key=len, reverse=True)) + r")\b", re.I)
FLOW_MIN = 0.4      # share of sentences with a connective, per chapter


def report_flow(script, long_video):
    rows, chapter, n, linked, used = [], "intro", 0, 0, {}
    def flush():
        if n:
            rows.append((chapter, n, linked))
    for s in script["scenes"]:
        if s["id"].endswith("-why") or s["id"].split("-")[0] == "outro":
            flush()
            chapter, n, linked = (s.get("chapter") or s["id"]), 0, 0
        for sent in sentences(s.get("say", "")):
            words = [m.group(1).lower() for m in CONN_RE.finditer(shown(sent))]
            n += 1
            linked += bool(words)
            for w in words:
                used[w] = used.get(w, 0) + 1
    flush()
    total, total_linked = sum(r[1] for r in rows), sum(r[2] for r in rows)
    if not total:
        return
    print(f"flow: {total_linked}/{total} sentences link to what came before ({total_linked / total:.0%})")
    for name, k, l in rows:
        if long_video:
            print(f"  {l:3d}/{k:<3d} {l / k:4.0%}  {name}")
        if k >= 4 and l / k < FLOW_MIN:
            warn(f"flow: {name}: only {l} of {k} sentences link to the one before; add connectives (so, but, remember, the tricky part, ...)")
    top = sorted(used.items(), key=lambda x: -x[1])
    for w, c in top[:3]:
        if c >= 6 and c / max(1, total_linked) > 0.25:
            warn(f"flow: '{w}' opens {c} of {total_linked} linked sentences; vary the connectives")
    print("  most used: " + ", ".join(f"{w} {c}" for w, c in top[:8]))


def report_breathing(script, timing, long_video):
    if not timing:
        return
    sents = [x for s in timing["scenes"] for x in s["sentences"]]
    if len(sents) < 2:
        return
    talk = sum(x["end"] - x["start"] for x in sents)
    dur = timing["duration"]
    longest, run_start, where = 0.0, sents[0]["start"], sents[0]
    for a, b in zip(sents, sents[1:]):
        if b["start"] - a["end"] >= 1.5:
            if a["end"] - run_start > longest:
                longest, where = a["end"] - run_start, a
            run_start = b["start"]
    if sents[-1]["end"] - run_start > longest:
        longest, where = sents[-1]["end"] - run_start, sents[-1]
    thinks = sum(1 for s in timing["scenes"] for b in s.get("breaks", []) if b["kind"] == "think")
    recaps = sum(1 for s in timing["scenes"] if s.get("recap"))
    print(f"breathe: talking {talk / dur:.0%} of {dur / 60:.1f} min; longest stretch without a 1.5 s pause "
          f"{longest:.0f} s (ends {where['end']:.0f} s); {thinks} think, {recaps} recap")
    for s in timing["scenes"]:
        if s.get("recap") and len(s["recap"]) > len(s.get("sentences", [])):
            warn(f"recap: {s['id']} has {len(s['recap'])} lines but {len(s.get('sentences', []))} sentences; "
                 "line i appears on sentence i, so the extra lines arrive late - speak one sentence per line")
    if long_video:
        if longest > 60:
            warn(f"breathe: {longest:.0f} s of talk without a 1.5 s pause (ending at {where['end']:.0f} s); add a [pause] after a key point")
        if talk / dur > 0.85:
            warn(f"breathe: talking {talk / dur:.0%} of the time; aim for 75-80% with [pause], [think] and recap scenes")
        chapter, has = None, False
        for s in timing["scenes"] + [{"id": "outro-end", "sentences": []}]:
            if s["id"].endswith("-why") or s["id"].split("-")[0] == "outro":
                if chapter and not has:
                    warn(f"breathe: chapter {chapter!r} has no recap scene and no [think]")
                chapter, has = (s.get("chapter") if s["id"].endswith("-why") else None), False
            has = has or bool(s.get("recap")) or any(b["kind"] == "think" for b in s.get("breaks", []))


def report_length(script, long_video):
    rows, chapter, words = [], "intro", 0
    def flush():
        if words:
            rows.append((chapter, words))
    for s in script["scenes"]:
        if s["id"].endswith("-why") or s["id"].split("-")[0] == "outro":
            flush()
            chapter, words = (s.get("chapter") or s["id"]), 0
        words += len(shown(s.get("say", "")).split())
    flush()
    total = sum(w for _, w in rows)
    print(f"length: {total} words ≈ {total / WPS / 60:.1f} min spoken (plus pauses)")
    if long_video:
        for name, w in rows:
            print(f"  {w:5d} words  ≈ {w / WPS / 60:4.1f} min  {name}")


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    clip = Path(args[0]).resolve()
    lesson = Path(args[args.index("--lesson") + 1]) if "--lesson" in args else None
    script, timing = load(clip)
    js_files = sorted(p for p in clip.glob("*.js"))
    check_script(script)
    ok = set(script.get("readsFine", []))   # tokens checked by ear and fine as written, e.g. ["CPU", "PDF"]
    for tok, where in READ.items():
        if tok not in ok:
            warn(f"'{tok}' is read as written ({', '.join(where[:4])}{' …' if len(where) > 4 else ''}): wrap it as [{tok}](how to say it), or list it in \"readsFine\" once checked by ear")
    long_video = check_long(clip, script)
    check_cues(clip, timing, js_files)
    if lesson:
        check_lesson(script, js_files, lesson.read_text())
    report_length(script, long_video)
    report_breathing(script, timing, long_video)
    report_flow(script, long_video)
    for w in WARN:
        print(f"warn   {w}")
    for e in ERR:
        print(f"ERROR  {e}")
    print(f"{len(ERR)} error(s), {len(WARN)} warning(s)")
    sys.exit(1 if ERR else 0)


if __name__ == "__main__":
    main()
