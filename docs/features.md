# What codebase-video can do

Everything the plugin offers, in one place. For how the work is done and checked, see
[how it works](how-it-works.md); for running it without questions, see [CI](ci.md).

## Two kinds of video

**A teaching video** (the usual kind) explains how a codebase works. It can tour the whole project, or follow one
flow ("how a request reaches the database"). You choose the length:

| Length | The video is | It covers |
|---|---|---|
| `short` | 3 to 5 minutes | an overview |
| `tour` (the default) | 6 to 10 minutes | 2 or 3 paths through the code |
| `deep` | 20 to 28 minutes | 4 to 6 paths |

Before it starts, Claude lists the project's core features and asks which belong in the video, who will watch it,
and which part should go deepest. A tour never silently leaves out a core feature: it says which ones it skips.

**A progress video** shows how a project changed between a past tag, commit or date and now, for someone who
follows the project but does not read its code every day. You choose what to bring out:

- `shipped`: what is new for users;
- `effort`: where the work went;
- `goals`: progress against a goals or roadmap file you give it;
- `people`: who committed in which area. Off unless you ask for it by name; without it, no one is named anywhere.

Every number in a progress video is read from git by a program, and the fact-checker compares each claim with the
code that changed, not with the commit message. The next progress video of the same project starts where the last
one ended. It reports what changed; it does not judge whether the team is on track unless you give it goals.

## What is in a video

- An introduction that says what you will be able to do after watching.
- Chapters, each following one real path through the code.
- The real code on screen, copied exactly with its own indentation, and the line being discussed lit up. It is
  coloured for F#, C#, JavaScript, TypeScript, Python, SQL, JSON, YAML, Bash, Nix and Dockerfiles; other languages
  are shown in one colour.
- One map of the project's main parts for the whole video. A chapter that follows a path opens on the map with that
  path lit, and a scene about the inside of one part zooms into that part. A progress video marks parts as new or
  changed.
- Diagrams drawn on the words that describe them: boxes and arrows that follow the real calls, sequence diagrams of
  who calls whom in what order, tables, bars, timelines, counters and numbered steps.
- The core mechanism followed to the bottom with one worked example and real values, shown happening on screen.
- A recap after each chapter, and in longer videos a few "pause and think" questions that show the question, not
  the answer.
- A natural voice that runs on your computer, with technical terms said properly ("JSON" as "jason", "C#" as
  "C sharp"; several hundred terms are built in).
- Captions as a separate file, and chapter markers. Captions can also be drawn into the picture.

## Checked before you see it

Each step is done by one helper agent and checked by a fresh one that has not seen its reasoning:

1. the teaching document, with a file and line reference behind every statement, is checked against the code;
2. the script is checked against the document;
3. the pictures are checked against the script and the code;
4. a last pass looks at the whole video four times per second.

A program checks what a program can: every picture appears on the words that say it, no text is on screen for less
than 3 seconds, nothing overlaps or leaves the frame, no number appears that the document does not contain, and no
page failed to draw. Every run ends with a report (`out/REPORT.md`): the settings used, the chapters, what each check
found and fixed, and anything left unverified.

## Ways to use it

- **Preview first.** Get the checked document and the narration to listen to, without pictures. It is much quicker
  and cheaper, and if you like it, the full video carries on from there without redoing anything.
- **Change it afterwards.** Tell Claude what to change ("chapter 2 is too fast"). Only the scenes the change
  touches are drawn again: about a minute for a changed picture or sentence, not the whole render.
- **Give it hints.** Say them when you ask, or put the ones for every video of a project in
  `.codebase-video/hints.md`: your team's terms, what to leave out, the usual audience. Claude offers to save a hint
  that sounds like a standing rule.
- **Teach it your words.** A project's own pronunciations go in `.codebase-video/glossary.json`, and win over the
  built-in ones. Claude adds a term when you say it sounded wrong, and only the scenes that say it are voiced again.
- **Present it yourself.** Ask for "a deck to present it myself". You get a PowerPoint file (one slide per sentence,
  the sentence as its speaker note, a section per chapter; Keynote, Google Slides and LibreOffice open it too), the
  script with a timestamp on each line, subtitles (`.srt`) and the video without its sound.
  - Slides that move: each slide plays its part of the animation as it opens (PowerPoint and Keynote; other apps
    show a still).
  - The click-through version: the animated video in your browser, where each click plays the next step and waits,
    with speaker notes in a second window.
- **Put it in your README.** A short video is kept under GitHub's 10 MB limit, and its first frame is drawn as a
  thumbnail with the title, a play button and the length. Ask for captions in the picture, since GitHub's player
  starts muted.
- **Run it from CI.** With flags and `--yes`, it asks nothing and takes the defaults, for example a progress video
  on each release or once a week. See [ci.md](ci.md).

The settings you can give, in words or as flags:

| Flag | What it sets | Default |
|---|---|---|
| `--kind teach\|progress` | which kind of video | `teach` |
| `--repo <path>` | the repository | the current folder |
| `--name <name>` | the name of the video and its folder | from the subject or the range |
| `--length short\|tour\|deep` | the length | `tour`; `short` for progress |
| `--audience "<who>"` | who will watch | a developer joining the team |
| `--captions` | captions drawn into the picture | off |
| `--since`, `--until` | progress: the range (a tag, commit or date) | from where the last progress video ended, else the latest tag, else 30 days back; until now |
| `--focus` | progress: `shipped`, `effort`, `goals`, `people` | `shipped,effort` |
| `--goals <file>` | progress: the goals to compare with | none |
| `--ignore "<glob>"` | progress: paths left out of the numbers | lock files and generated files |
| `--yes` | ask nothing, take the defaults | off |

## What you get

In your project, in `.codebase-video/<name>/out/` (git ignores the folder):

| File | What it is |
|---|---|
| `<name>.mp4` | the video, 1920x1080 |
| `<name>.webm` | the same video, smaller, for the web |
| `<name>.jpg` | a poster image |
| `<name>.vtt` | captions |
| `<name>.chapters.vtt` | chapter markers |
| `REPORT.md` | what was made, what the checks found, what is left |
| `<name>.pptx`, `.script.md`, `.srt`, `.silent.mp4` | when you ask to present it yourself |

Your code is not changed.

## What it needs, and what stays on your computer

- [Node.js](https://nodejs.org) 22.12 or newer, [ffmpeg](https://ffmpeg.org) with the x264, VP9 and Opus encoders,
  and Google Chrome or Chromium. The first run checks for all three and says how to install what is missing.
- About 800 MB downloaded once, the first time: mostly the voice.
- The voice, the drawing and the video files stay on your computer; nothing is uploaded. Your code is read by
  Claude Code, as in any Claude Code session. Claude is told to keep passwords and keys out of the video.
- The video shows your code: share it only with people who may see the code.

How long it takes and how much of your Claude plan it uses: see the
[README](../README.md#how-long-does-it-take-and-what-does-it-cost).

## Limits

- The checks are careful, not a proof. If something looks wrong, the teaching document next to the video names the
  file and line to look at.
- Only a short video fits in a GitHub README; host a longer one elsewhere and link to it.
- Drawing the video takes about one and a half times its length, and the computer must stay awake meanwhile.
- A progress video says what changed and what the commit messages claim; it does not grade the team.

## The engine's commands

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
