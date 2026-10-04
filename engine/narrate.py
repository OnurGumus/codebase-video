"""Voice a lesson clip's script.json with Kokoro and time every sentence.

Usage: narrate.py <clip-dir>

Writes <clip-dir>/build/:
  narration.wav   the whole soundtrack, silence included (24 kHz mono)
  timing.js       window.TIMING for stage.js: scene, sentence and part start/end times
  captions.vtt    one cue per sentence
  phonemes.txt    every phrase in a second language with the phonemes it was spoken with

Needs a Python with kokoro-onnx and soundfile (KOKORO_PYTHON in build.sh) and the Kokoro model
files (KOKORO_DIR, default ~/.cache/codebase-video/kokoro; setup.sh installs them). Each piece of speech is synthesized on its own
and cached by its text and voice, so re-voicing one edited line does not redo the rest.

script.json:
  {
    "name": "rag-decomp-bridge-drift",         file stem on the server: [A-Za-z0-9][A-Za-z0-9_-]*
    "title": "Entity drift at the bridge",     caption under the player
    "voice": "af_heart", "lang": "en-us",      Kokoro voice and language; "voice": null for a silent clip
    "speed": 1.0,
    "poster": "drift",                         scene whose last sentence is the poster frame (default: the 2nd)
    "voices": {"fr": {"voice": "ff_siwis", "lang": "fr-fr"}},    optional: voices for {code:...} phrases
    "pronounce": {"trois heures et quart": "tʁwˈaz ˈœʁ e kˈaʁ"},  optional: exact phonemes for a phrase
    "scenes": [
      {"id": "ask", "say": "Two sentences. Spoken in order.", "lead": 0.5, "pad": 0.9},
      {"id": "end", "say": "", "hold": 2.0}
    ]
  A scene may also carry "chapter": "Title" (long videos: on the chapter's "-why" bridge scene), and
  "toasts": [{"kind": "tricky", "at": "the tricky part"}] - small pop-up badges the long-video frame shows
  on that phrase (kinds and optional "text"/"dur": see TOASTS in stage-kit.js).
  Long videos open with a scene "title" and a top-level "card": {"course": "...", "lesson": "...", "sub": "..."}:
  the frame draws the card while that scene plays, so the viewer knows the course and lesson first.
  }

In "say":
  [shown](spoken)   captions one text and speaks another: "[0.802](zero point eight oh two)".
  {fr:six euros}    speaks that phrase with the "fr" voice, inside or instead of a sentence:
                    "Before a vowel, it links as a z: {fr:six euros}."
  [pause] [pause 2] silence after the sentence it follows (default 1.5 s): room for a point to land.
  [think] [think 8] a question's silence (default 8 s); the long-video frame shows a "pause and think"
                    countdown during it. Put either after the sentence's end punctuation.
A scene may carry "recap": ["line", ...] (long videos: a chapter's closing "So far" card, one line
appearing per sentence; give it "hold" for a quiet moment after).
A "pronounce" entry replaces the phonemizer for a phrase that matches it exactly (any voice). Use it
where the phonemizer is wrong, after checking phonemes.txt against what the lesson teaches.
"""
import hashlib, json, os, re, sys
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 24000
GAP = 0.3        # between sentences in a scene
PART_GAP = 0.12  # between the voices inside one sentence
KOKORO_LANGS = {"en-us", "en-gb", "fr-fr", "es", "it", "ja", "pt-br", "cmn", "hi"}
PRONOUNCE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
FOREIGN = re.compile(r"\{([a-z]{2,3}):([^{}]+)\}")
BREAK = re.compile(r"\s*\[(pause|think)(?:\s+(\d+(?:\.\d+)?))?\]")
BREAK_DEFAULT = {"pause": 1.5, "think": 8.0}
NAME = re.compile(r"\A[A-Za-z0-9][A-Za-z0-9_-]*\Z")



def espeak_config():
    """espeak-ng fails ("Error processing file .../phontab") when the bundled library and data sit under a long path,
    which a plugin's data directory can be, and a symlink does not help (it resolves the real path). So copy them once
    (about 20 MB) to a short real path when the installed path is long."""
    import espeakng_loader, shutil
    from kokoro_onnx.config import EspeakConfig
    lib, data = Path(espeakng_loader.get_library_path()), Path(espeakng_loader.get_data_path())
    if len(str(data)) > 90 and os.name == "posix" and lib.parent == data.parent:
        short = Path(f"/tmp/codebase-video-espeak-{os.getuid()}")
        if not (short / data.name / "phontab").exists() or not (short / lib.name).exists():
            shutil.rmtree(short, ignore_errors=True)
            shutil.copytree(data.parent, short, ignore=shutil.ignore_patterns("__pycache__", "*.py"))
        lib, data = short / lib.name, short / data.name
    return EspeakConfig(lib_path=str(lib), data_path=str(data))

def sentences(say):
    # Split after . ! ? when a space and a capital, digit, quote or markup follows; keeps "e.g. the"
    # and "0.802" whole. {code:...} phrases are shielded first, so "{fr:Il est une heure.}" stays one
    # piece. A shielded phrase ends a sentence only when it ends in . ! ? itself (marked \x01): "is
    # {fr:moins le quart} [3:45] or..." is one sentence, "{fr:Il est midi.} Then..." is two.
    shielded = []
    def shield(m):
        shielded.append(m.group(0))
        end = "\x01" if re.search(r"[.!?]\s*$", m.group(2)) else "\x00"
        return f"\x00{len(shielded) - 1}{end}"
    text = FOREIGN.sub(shield, say.strip())
    parts = re.split(r"(?<=[.!?\x01])\s+(?=[\"'“A-Z0-9\[\x00])", text)
    restore = lambda s: re.sub(r"\x00(\d+)[\x00\x01]", lambda m: shielded[int(m.group(1))], s)
    out = []
    for p in (restore(p).strip() for p in parts if p.strip()):
        # A break marker opening a piece belongs to the sentence before it ("Why? [think 4] Because...").
        m = re.match(r"(?:\[(?:pause|think)(?:\s+[\d.]+)?\]\s*)+", p)
        if m and out:
            out[-1] += " " + m.group(0).strip()
            p = p[m.end():].strip()
        if p:
            out.append(p)
    return out


def breaks(s):
    """The silences a sentence asks for after it: [("pause", 1.5), ("think", 4.0)]."""
    return [(m.group(1), float(m.group(2)) if m.group(2) else BREAK_DEFAULT[m.group(1)]) for m in BREAK.finditer(s)]


def shown(s):
    return FOREIGN.sub(lambda m: m.group(2), PRONOUNCE.sub(lambda m: m.group(1), BREAK.sub("", s))).strip()


def spoken(s):
    return PRONOUNCE.sub(lambda m: m.group(2), BREAK.sub("", s)).strip()


def heard(s):
    """What the listener hears, as plain text: spoken forms, and {code:...} phrases without their braces.
    stage.js times words against this (Stage.word), so "86,400" is found where "eighty-six thousand" is said."""
    return FOREIGN.sub(lambda m: m.group(2), spoken(s))


# The English phonemizer reads a lone capital "A" as the article ("uh"): "A W S" came out "uh W S" and "zone A is"
# "zone uh is". A capital A that is not opening a sentence is a letter, and so is one that opens a sentence but is
# followed by another single letter ("A P I calls"). Those are sent to the voice as "eigh", which it says as the
# letter. Captions and cue matching keep the original text.
_LETTER_A = re.compile(r"(?<![\w'’])A(?![\w'’])")
_SENTENCE_OPEN = re.compile(r"(?:^|[.!?:;]\s+|[\"“(]\s*)$")
_NEXT_LETTER = re.compile(r"\s+[A-Z](?:'s|s)?(?![A-Za-z])")


def voiced(text):
    """The text as sent to an English voice: letter "A" spelled so that it is said as a letter."""
    def fix(m):
        opening = _SENTENCE_OPEN.search(text[:m.start()]) is not None
        return "eigh" if (not opening or _NEXT_LETTER.match(text, m.end())) else "A"
    return _LETTER_A.sub(fix, text)


def pieces(sentence):
    """(code or None, text) runs of a sentence: main-voice text and {code:...} phrases in order."""
    out, pos = [], 0
    for m in FOREIGN.finditer(sentence):
        if m.start() > pos:
            out.append((None, sentence[pos:m.start()]))
        out.append((m.group(1), m.group(2)))
        pos = m.end()
    if pos < len(sentence):
        out.append((None, sentence[pos:]))
    # Punctuation left between two phrases ("." after a brace) has nothing to say.
    return [(code, text.strip()) for code, text in out if re.search(r"[\w]", text)]


def reading_time(text):
    # Silent clips hold each caption long enough to read: about 2.5 words a second, never under 2 s.
    return max(2.0, len(text.split()) / 2.5 + 0.8)


def vtt_time(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def main():
    clip = Path(sys.argv[1]).resolve()
    script = json.loads((clip / "script.json").read_text())
    name = script["name"]
    if not NAME.match(name):
        sys.exit(f"name {name!r} must match {NAME.pattern} - it becomes the file name on the server")
    voice = script.get("voice", "af_heart")
    lang = script.get("lang", "en-us")
    speed = float(script.get("speed", 1.0))
    others = script.get("voices", {})
    pronounce = {k.strip(): v for k, v in script.get("pronounce", {}).items()}
    for code, spec in [(None, {"voice": voice, "lang": lang})] + list(others.items()):
        if spec.get("voice") and spec.get("lang") not in KOKORO_LANGS:
            sys.exit(f"Kokoro cannot speak {spec.get('lang')!r} (it can: {', '.join(sorted(KOKORO_LANGS))}). "
                     f'Narrate in the learner\'s language, or set "voice": null for a captioned silent clip.')

    build = clip / "build"
    cache = build / "tts-cache"
    cache.mkdir(parents=True, exist_ok=True)

    kokoro = tokenizer = None
    if voice:
        import kokoro_onnx
        from kokoro_onnx.tokenizer import Tokenizer
        model_dir = Path(os.environ.get("KOKORO_DIR", Path.home() / ".cache/codebase-video/kokoro"))
        espeak = espeak_config()
        kokoro = kokoro_onnx.Kokoro(str(model_dir / "kokoro-v1.0.fp16.onnx"), str(model_dir / "voices-v1.0.bin"), espeak_config=espeak)
        tokenizer = Tokenizer(espeak_config=espeak)

    def spec_for(code):
        if code is None:
            return voice, lang
        if code not in others:
            sys.exit(f'{{{code}:...}} needs "voices": {{"{code}": {{"voice": ..., "lang": ...}}}} in script.json')
        return others[code]["voice"], others[code]["lang"]

    report = []

    def synth(code, text, where):
        v, l = spec_for(code)
        phonemes = pronounce.get(text.strip())
        if not phonemes and l.lower().startswith("en"):
            text = voiced(text)
        if code is not None:
            report.append(f"{where}\t{code}\t{text}\t{phonemes or tokenizer.phonemize(text, lang=l)}\t{'pinned' if phonemes else 'auto'}")
        key = hashlib.sha1(json.dumps([v, l, speed, phonemes or text]).encode()).hexdigest()[:16]
        path = cache / f"{key}.wav"
        if not path.exists():
            if phonemes:
                samples, sr = kokoro.create(phonemes, voice=v, speed=speed, lang=l, is_phonemes=True)
            else:
                samples, sr = kokoro.create(text, voice=v, speed=speed, lang=l)
            assert sr == SR, sr
            sf.write(path, samples, SR)
        samples, _ = sf.read(path, dtype="float32")
        return samples

    audio, t, scenes, seen = [], 0.0, [], set()

    def silence(seconds):
        nonlocal t
        audio.append(np.zeros(int(round(seconds * SR)), dtype=np.float32))
        t += seconds

    for sc in script["scenes"]:
        if sc["id"] in seen:
            sys.exit(f"duplicate scene id {sc['id']!r}")
        seen.add(sc["id"])
        start = t
        silence(float(sc.get("lead", 0.4)))
        lines = []
        scene_breaks = []
        for i, s in enumerate(sentences(sc.get("say", ""))):
            if i:
                silence(GAP)
            begin, parts = t, []
            after = breaks(s)
            s = BREAK.sub("", s).strip()
            for k, (code, text) in enumerate(pieces(s)):
                if k:
                    silence(PART_GAP)
                part_start = t
                if voice:
                    samples = synth(code, spoken(text), f"{sc['id']}[{i}]")
                    audio.append(samples)
                    t += len(samples) / SR
                else:
                    silence(reading_time(shown(text)))
                parts.append({"text": shown(text), "spoken": heard(text), "lang": code or lang,
                              "start": round(part_start, 3), "end": round(t, 3)})
            lines.append({"text": shown(s), "spoken": heard(s), "start": round(begin, 3), "end": round(t, 3), "parts": parts})
            for kind, secs in after:
                scene_breaks.append({"kind": kind, "sentence": i, "start": round(t, 3), "end": round(t + secs, 3)})
                silence(secs)
        silence(float(sc.get("hold", 0.0)) + float(sc.get("pad", 0.9 if lines else 0.0)))
        scene = {"id": sc["id"], "start": round(start, 3), "end": round(t, 3), "sentences": lines}
        if sc.get("chapter"):
            scene["chapter"] = sc["chapter"]   # a long video's chapter title, on its "-why" bridge scene
        if sc.get("toasts"):
            scene["toasts"] = sc["toasts"]     # pop-up badges ("kind", "at" phrase), drawn by the frame
        if scene_breaks:
            scene["breaks"] = scene_breaks     # [pause]/[think] silences; the frame counts down a think
        if sc.get("recap"):
            scene["recap"] = sc["recap"]       # a chapter's closing "So far" lines
        scenes.append(scene)

    duration = round(t, 3)
    sf.write(build / "narration.wav", np.concatenate(audio), SR)

    poster_scene = script.get("poster") or (scenes[1]["id"] if len(scenes) > 1 else scenes[0]["id"])
    ps = next((s for s in scenes if s["id"] == poster_scene), None)
    if ps is None:
        sys.exit(f"poster scene {poster_scene!r} not found")
    poster = ps["sentences"][-1]["end"] if ps["sentences"] else ps["end"] - 0.1

    timing = {"name": name, "title": script.get("title", ""), "voiced": bool(voice), "duration": duration,
              "poster": round(poster, 3), "scenes": scenes}
    if script.get("card"):
        timing["card"] = script["card"]   # long videos: {"course", "lesson", "sub"} for the opening title card
    (build / "timing.json").write_text(json.dumps(timing, indent=2, ensure_ascii=False))
    (build / "timing.js").write_text("window.TIMING = " + json.dumps(timing, ensure_ascii=False) + ";\n")

    cues = ["WEBVTT", ""]
    for s in scenes:
        for c in s["sentences"]:
            cues += [f"{vtt_time(c['start'])} --> {vtt_time(c['end'])}", c["text"], ""]
    (build / "captions.vtt").write_text("\n".join(cues))
    (build / "phonemes.txt").write_text(
        "where\tvoice\tphrase\tphonemes\tsource\n" + "\n".join(report) + ("\n" if report else ""))

    words = sum(len(c["text"].split()) for s in scenes for c in s["sentences"])
    print(f"{name}: {duration:.1f}s, {len(scenes)} scenes, {words} words, poster at {poster:.1f}s")
    for s in scenes:
        print(f"  {s['id']:<14} {s['start']:6.1f} - {s['end']:6.1f}  ({len(s['sentences'])} sentences)")
    if report:
        print(f"  {len(report)} phrase(s) in another voice - check build/phonemes.txt against the lesson")


if __name__ == "__main__":
    main()
