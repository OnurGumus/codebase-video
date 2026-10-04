



# codebase-video

**Turn a code repository into a narrated video that teaches it.**

codebase-video is a plugin for [Claude Code](https://claude.com/claude-code). You open a repository, ask for a
video, and get an `.mp4` file: a voice explains how the code works while diagrams and the real source code appear
on screen, chapter by chapter.


https://github.com/user-attachments/assets/0b4e12d4-ce36-48db-9532-be7eb61ad430


Use it to:

- **onboard a teammate** to your codebase without booking a week of meetings;
- **learn someone else's project** faster than by reading it file by file;
- **explain one part** of a system ("how does a request reach the database?") to people who need only that part.

## Quick start

You need [Claude Code](https://claude.com/claude-code), plus three common tools:

| Tool | Why | Install on macOS |
|---|---|---|
| Node.js 18 or later | runs the plugin's engine | `brew install node` |
| ffmpeg | makes the video file | `brew install ffmpeg` |
| Google Chrome or Chromium | draws the frames | you probably have it |

On Linux, ffmpeg must include the `libx264`, `libvpx-vp9` and `libopus` encoders (the usual packages do).

Then, inside Claude Code:

```
/plugin marketplace add OnurGumus/codebase-video
/plugin install codebase-video@codebase-video
```

Go to the repository you want a video about and type:

```
/codebase-video
```

You can also just ask in your own words: "make a video that teaches this codebase".

Claude then asks you three short questions (what to cover, how long, and who will watch), and starts working.
The first run also downloads the voice and a browser driver, about 800 MB, once.

## What you get

A folder with the finished video and its extras:

```
<your repo>/.codebase-video/<video name>/out/
    <video name>.mp4            the video
    <video name>.webm           the same video, smaller, for the web
    <video name>.jpg            a poster image
    <video name>.vtt            captions
    <video name>.chapters.vtt   chapter markers
```

Everything the plugin writes stays inside `.codebase-video/`, which git ignores. Your source files are never
changed.

A typical video has:

- a short introduction that says what you will be able to do after watching;
- a few chapters, each following one real path through the code;
- the actual code on screen, copied exactly, with the line being discussed highlighted;
- diagrams of the parts and of who calls whom;
- a recap after each chapter, and in longer videos a few "pause and think" questions.

## How long, and how much work

You choose a length:

| Length | Video | Covers | Work for Claude |
|---|---|---|---|
| `short` | 3 to 5 minutes | an overview | about 10 agent tasks |
| `tour` (the default) | 6 to 10 minutes | 2 or 3 paths through the code | about 12 agent tasks |
| `deep` | 20 to 28 minutes | 4 to 6 paths | about 30 agent tasks |

An "agent task" is one piece of work that Claude Code hands to a helper agent. More tasks means more time and
more of your Claude usage. A tour can take an hour or more from start to finish; you do not have to watch it
work. The final step, drawing and encoding the video, takes roughly one and a half times the video's length and
keeps your computer busy.

## Why you can trust what the video says

A video that explains code wrongly is worse than no video. So most of the work is checking, and each check is
done by a fresh agent that has not seen the previous agent's reasoning:

1. **Read the code.** One agent explores the repository and writes a teaching document. Every statement in it
   points to the file and lines it came from, and every piece of code is copied exactly.
2. **Check the document against the code.** A second agent opens every one of those references, and runs the
   build or the tests when that is cheap and safe. It writes corrections.
3. **Write the script.** A third agent writes what the voice will say, using only the checked document.
   Another agent then checks the script against the document.
4. **Draw the scenes.** Several agents build the visuals in parallel.
5. **Check the scenes.** Fresh agents compare every scene with the script and the code. A final pass looks at
   the whole video four times per second for text shown too briefly, things overlapping, and empty screens.
6. **Make the video.** A voice reads the script, Chrome draws every frame, and ffmpeg puts them together.

In the videos this was built on, every checking pass found real mistakes, which is why there are so many.

## Privacy

- **The video is made on your computer.** The voice, the drawing and the encoding all run locally. Nothing is
  uploaded.
- **Your code is read by Claude Code**, the same way as in any other Claude Code session on that repository.
- **Secrets are kept out.** The agents are told never to copy passwords, tokens, internal server names or
  customer data into the video, and the checking agent looks for them.
- **The video shows your code.** Share it the way you would share the code itself.

The one-time setup does download things: the voice model
([Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)), the software that runs it, a browser driver, and
[eSpeak NG](https://github.com/espeak-ng/espeak-ng) for pronunciation. eSpeak NG is licensed under GPL-3.0; it
is downloaded to your machine during setup and is not part of this plugin.

## Questions

**Does it work for any programming language?**
Yes. The agents read whatever is in the repository. Code on screen is coloured for F#, C#, JavaScript and
TypeScript, Python, SQL, JSON, YAML, Bash, Nix and Dockerfiles; other languages are shown without colours.

**Can I change the video afterwards?**
Yes. Tell Claude what to change ("chapter 2 goes too fast", "add a chapter on error handling"). It edits the
script or the scenes and makes the video again; unchanged narration is not re-voiced.

**Which voice is it?**
An English text-to-speech voice from the open Kokoro model, running on your machine. No account or API key is
needed for it.

**Do I need Python or .NET?**
No. Only Node.js, ffmpeg and Chrome.

## For contributors

The engine is written in F# and compiled to JavaScript with [Fable](https://fable.io). The compiled files are
committed, which is why users need only Node.js.

| Folder | What is in it |
|---|---|
| `skills/codebase-video/SKILL.md` | the instructions Claude follows: each step, in order |
| `briefs/` | the instructions for each helper agent (explorer, checker, writer, builder, auditor) |
| `src/Engine` | the command-line engine in F#: voice, checks, drawing frames, encoding |
| `src/Kit` | the animation kit in F# that runs in the browser: code cards, diagrams, the chapter frame |
| `engine/cli`, `engine/web` | the compiled JavaScript of the two folders above |
| `engine/KIT.md` | how to draw a scene with the kit |
| `engine/kit/gallery` | a small sample video that uses every kit component |

To rebuild after changing the F# code (needs the .NET SDK, version 10 or later):

```
dotnet tool restore
dotnet fsi build.fsx
```

Commit the regenerated `engine/cli` and `engine/web` folders together with your F# change.

Every step of the engine is one command, `node engine/cli/Cv.js <workspace> <step>`, where the step is one of
`narrate`, `check`, `sheet`, `stills`, `scan`, `report`, `video`, `fill` or `fix`. The scenes of each video are
small JavaScript files that call the kit; `engine/KIT.md` describes that API.

## License

MIT. See [LICENSE](LICENSE).
