# Reference

What a video contains, every setting, every output file and every engine command. To get something done, start
from the [README](../README.md#what-do-you-want-to-do) instead.

## What is in a video

- An introduction that says what you will be able to do after watching.
- Chapters, each following one real path through the code.
- The real code on screen, copied exactly with its own indentation, the line being discussed lit up.
- One map of the project's main parts for the whole video. A chapter that follows a path opens on the map with that
  path lit, and a scene about the inside of one part zooms into that part. A progress video marks parts as new or
  changed.
- Diagrams drawn on the words that describe them: boxes and arrows that follow the real calls, sequence diagrams of
  who calls whom in what order, tables, bars, timelines, counters and numbered steps.
- The core mechanism followed to the bottom with one worked example and real values, shown happening on screen.
- A recap after each chapter, and in longer videos a few "pause and think" questions that show the question, not
  the answer.
- A natural voice, with technical terms said properly.
- Captions as a separate file, and chapter markers. Captions can also be drawn into the picture.

## Settings

Say them in words when you ask, or give them as flags (`/codebase-video --kind progress --since v1.4.0`). A setting
you give is never asked about.

| Flag | What it sets | Default |
|---|---|---|
| `--kind teach\|progress` | a teaching video, or a [progress video](progress-video.md) | `teach` |
| `--repo <path>` | the repository | the current folder |
| `--name <name>` | the name of the video and its folder | from the subject or the range |
| `--length short\|tour\|deep` | the length | `tour`; `short` for progress, which has no `deep` |
| `--audience "<who>"` | who will watch | a developer joining the team |
| `--captions` | captions drawn into the picture | off |
| `--since`, `--until` | progress: the range (a tag, commit or date) | from where the last progress video ended, else the latest tag, else 30 days back; until now |
| `--focus` | progress: `shipped`, `effort`, `goals`, `people` | `shipped,effort` |
| `--goals <file>` | progress: the goals to compare with | none |
| `--ignore "<glob>"` | progress: paths left out of the numbers | lock files and generated files |
| `--yes` | ask nothing and take the defaults, for [CI](ci.md) | off |

## Output files

In your project, in `.codebase-video/<name>/` (git ignores the folder; your code is not changed):

| File | What it is |
|---|---|
| `out/<name>.mp4` | the video, 1920x1080 |
| `out/<name>.webm` | the same video, smaller, for the web |
| `out/<name>.jpg` | a poster image |
| `out/<name>.vtt` | captions |
| `out/<name>.chapters.vtt` | chapter markers |
| `out/REPORT.md` | the settings used, the chapters, what each check found and fixed, what is left |
| `out/<name>.pptx`, `.script.md`, `.srt`, `.silent.mp4` | when you [present it yourself](present-it-yourself.md) |
| `build/lesson.md` | the checked document, with the file and line behind every statement |
| `build/history.md` | a progress video's facts, read from git |

Your own settings for a project live beside the videos: `.codebase-video/hints.md` and
`.codebase-video/glossary.json` (see [Change a video](change-a-video.md)).

## Requirements

- [Node.js](https://nodejs.org) 22.12 or newer, [ffmpeg](https://ffmpeg.org) with the `libx264`, `libvpx-vp9` and
  `libopus` encoders, and Google Chrome or Chromium. The first run checks all three and says how to install what is
  missing.
- About 800 MB downloaded once, the first time: mostly the voice. See
  [What runs on your computer](how-it-works.md#what-runs-on-your-computer).

## Limits

- The checks are careful, not a proof. If something looks wrong, `build/lesson.md` names the file and line to look
  at.
- Only a short video fits in a GitHub README; host a longer one elsewhere and link to it.
- Drawing the video takes about one and a half times its length, and the computer must stay awake meanwhile.
- A progress video says what changed and what the commit messages claim; it does not grade the team.

## Engine commands

The skill runs these for you; they are listed for the curious and for scripts. Each is
`node engine/cli/Cv.js <workspace> <command>`.

| Command | What it does |
|---|---|
| `setup` | checks Node, ffmpeg and Chrome, and installs the voice and the browser driver (once) |
| `narrate` | voices the script and times every sentence |
| `check` | checks the script and the scenes before anything is drawn |
| `stills`, `sheet` | pictures of chosen moments, or of every module, to look at |
| `serve` | the video in your browser, to watch while working on it |
| `video` | draws and encodes the video, again only the scenes that changed (`--full`: all of them) |
| `scan`, `report` | examines the whole video four times per second, and reports what it found |
| `present` | the deck, the script and the silent video (`--clips`, `--serve`) |
| `history` | the facts of a commit range, for a progress video (`--done` records where it ended) |
| `fill`, `fix`, `new-long`, `chapters`, `all` | the steps the skill uses in between: the agents' briefs, applying the checker's fixes, a new video's page, the chapter markers again (without drawing), and narrate plus video |
