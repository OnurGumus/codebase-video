# How codebase-video works

A video that explains code wrongly is worse than no video. So most of the work is checking, and each check is
done by a fresh helper (Claude Code calls these helpers "agents") that has not seen the previous one's reasoning.

1. **Read the code.** One agent explores the repository and writes a teaching document. Every statement in it
   points to the file and lines it came from, and every piece of code is copied exactly.
2. **Check the document against the code.** A second agent opens every one of those references, and runs the
   build or the tests when that is cheap and safe. It writes corrections.
3. **Write the script.** A third agent writes what the voice will say, using only the checked document.
   Another agent then checks the script against the document.
4. **Draw the scenes.** Several agents build the pictures at the same time.
5. **Check the scenes.** Fresh agents compare every scene with the script and the code. A final pass looks at
   the whole video four times per second for text shown too briefly, things overlapping, and empty screens.
6. **Make the video.** A voice reads the script, Chrome draws every frame, and ffmpeg puts them together.

In the videos this was built on, every checking pass found real mistakes, which is why there are so many.

## What a program checks, and what Claude checks

Claude decides what to teach and whether it is true. The engine (the F# program in this repository) produces
the video and checks everything that can be checked mechanically:

- **Before drawing** (`check`): every picture is tied to words that are really spoken; scene names and chapters
  are well formed; no sentence is too long for one caption; numbers and symbols the voice might misread are
  flagged; no number appears that the checked document does not state; the narration has pauses and does not
  read as a list of facts.
- **After drawing** (`scan` and `report`): the whole video is examined four times per second for text on screen
  under 3 seconds, overlaps, empty screens, content outside the frame, blinking, and pages that failed to draw.

Whether an explanation is correct is a judgement, so that part is done by Claude agents reading the code, each
one fresh. It is careful checking, not a proof.

## How much work each length is

| Length | Video | Covers | Work for Claude |
|---|---|---|---|
| `short` | 3 to 5 minutes | an overview | about 10 agent tasks |
| `tour` (the default) | 6 to 10 minutes | 2 or 3 paths through the code | about 12 agent tasks |
| `deep` | 20 to 28 minutes | 4 to 6 paths | about 30 agent tasks |

A **preview** stops once the script has been checked, before any scene is drawn: you get the checked document
and the narrated script (about 4 agent tasks, up to 6 for `deep`), and can continue to the full video later
without redoing them.

An "agent task" is one piece of work that Claude Code hands to a helper agent. More tasks means more time and
more of your Claude usage. The final step, drawing and encoding the video, takes roughly one and a half times
the video's length and keeps your computer busy.

## What the video contains

- a short introduction that says what you will be able to do after watching;
- a few chapters, each following one real path through the code;
- the actual code on screen, copied exactly, with the line being discussed highlighted (coloured for F#, C#,
  JavaScript and TypeScript, Python, SQL, JSON, YAML, Bash, Nix and Dockerfiles);
- diagrams of the parts and of who calls whom;
- a recap after each chapter, and in longer videos a few "pause and think" questions.

## The files you get

```
<your repo>/.codebase-video/<video name>/out/
    <video name>.mp4            the video
    <video name>.webm           the same video, smaller, for the web
    <video name>.jpg            a poster image
    <video name>.vtt            captions
    <video name>.chapters.vtt   chapter markers
```

## What runs on your computer

The voice ([Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)), the drawing (your Chrome) and the encoding
(ffmpeg) all run locally, and the video is not uploaded anywhere. Your source code is read by Claude Code, as in
any Claude Code session.

The one-time setup downloads the voice model, the software that runs it, a browser driver, and
[eSpeak NG](https://github.com/espeak-ng/espeak-ng) for pronunciation: about 800 MB. eSpeak NG is licensed under
GPL-3.0; it is downloaded to your machine during setup and is not part of this plugin.

On Linux, ffmpeg must include the `libx264`, `libvpx-vp9` and `libopus` encoders (the usual packages do).
