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

In tokens, the helper agents use roughly 0.4 to 0.5 million for a preview and 1.2 to 1.3 million for a short
video (both measured on small projects), and an estimated 2 to 3 million for a tour and 6 to 8 million for a deep
video.

An "agent task" is one piece of work that Claude Code hands to a helper agent. More tasks means more time and
more of your Claude usage. The final step, drawing and encoding the video, takes roughly one and a half times
the video's length and keeps your computer busy.

That cost is paid once. The engine keeps the finished video as one piece per scene. When something is fixed
afterwards, it draws again only the scenes the fix can change: a changed picture costs the scenes of that
module, a changed sentence costs its chapter. Everything else is reused, and joining the pieces takes seconds.

## What the video contains

- a short introduction that says what you will be able to do after watching;
- a few chapters, each following one real path through the code;
- the actual code on screen, copied exactly, with the line being discussed highlighted (coloured for F#, C#,
  JavaScript and TypeScript, Python, SQL, JSON, YAML, Bash, Nix and Dockerfiles);
- diagrams of the parts and of who calls whom;
- one map of the main parts for the whole video: each chapter that follows a path through the code opens on the map
  with that path lit up, and a scene about the inside of one part zooms into that part's box;
- a recap after each chapter, and in longer videos a few "pause and think" questions.

## Progress videos

The same steps make a second kind of video: how a project changed between a past commit, tag or date and now. A
program first reads the history of that range and writes down the facts (commits, tags, work per area, files added
and removed), and every number in the video comes from there. The document is organised by theme of change, the
fact-checker compares each claim with the diff and not with the commit message, and the map shows which parts are
new or changed. Authors are left out entirely unless you ask for them. With flags and `--yes` it runs from CI
without asking anything; see [ci.md](ci.md).

## The files you get

```
<your repo>/.codebase-video/<video name>/out/
    <video name>.mp4            the video
    <video name>.webm           the same video, smaller, for the web
    <video name>.jpg            a poster image
    <video name>.vtt            captions
    <video name>.chapters.vtt   chapter markers
```

To give the video in your own voice, `present` adds (`node engine/cli/Cv.js <workspace> present`):

```
    <video name>.pptx           a slide per sentence, the sentence as its speaker note, a section per chapter
    <video name>.script.md      the narration to read aloud: each sentence with its slide and its time in the video
    <video name>.srt            the narration as subtitles, for a video editor
    <video name>.silent.mp4     the video without its sound
```

`present --clips` puts a clip on each slide instead of a still: the video from the previous slide's moment to its
own, which plays as the slide opens. PowerPoint and Keynote play it; an app that does not (Google Slides) shows its
first frame. The deck is then about the size of the video.

`present --serve` also serves a click-through version: the animated video in the browser, a step per sentence. Each
click or → plays the next step and holds; S opens the speaker notes in a second window. A slide and a step show the
same moment: just after the sentence has been said, before the scene's content leaves.

## Short videos and GitHub

GitHub plays a video attached to a README only up to 10 MB, and shows the video's first frame before it plays. A
short video is therefore kept under 10 MB (the engine checks the file and, if needed, encodes the picture again to
fit), and its first frame is drawn as a thumbnail: the title, a red border, a play button and the length. Longer
videos do not fit in 10 MB; host them elsewhere and link to them. Captions come as a separate `.vtt` file; with
`"captions": true` in the script they are also drawn into the picture, which helps where the player starts muted. `CODEBASE_VIDEO_SHORT_MAX_MB` changes the limit.

## What runs on your computer

The voice ([Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)), the drawing (your Chrome) and the encoding
(ffmpeg) all run locally, and the video is not uploaded anywhere. Your source code is read by Claude Code, as in
any Claude Code session.

The one-time setup downloads the voice model, the software that runs it, a browser driver, and
[eSpeak NG](https://github.com/espeak-ng/espeak-ng) for pronunciation: about 800 MB. eSpeak NG is licensed under
GPL-3.0; it is downloaded to your machine during setup and is not part of this plugin.

On Linux, ffmpeg must include the `libx264`, `libvpx-vp9` and `libopus` encoders (the usual packages do).
