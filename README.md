# codebase-video

**Ask Claude Code for a video about your code. Get a narrated video that explains it, checked against the code.**


https://github.com/user-attachments/assets/98c04504-aac9-43aa-afda-cc8d9962a076


*This video was made by the plugin, about the plugin.*

A plugin for [Claude Code](https://claude.com/claude-code). It reads a folder of code and makes a video in which a
voice explains how the code works, with diagrams and the real code on screen. One map of the project's main parts
runs through the video, so you always know where you are.

Use it to help a new teammate into a project, to understand code somebody else wrote, to explain one part of a big
system, or to show what changed since a release.

## Get started

1. **Install three things**, if you do not have them yet: [Node.js](https://nodejs.org) 22.12 or newer,
   [ffmpeg](https://ffmpeg.org) (with the x264, VP9 and Opus encoders; Homebrew's has them), and Google Chrome or
   Chromium. On a Mac: `brew install node ffmpeg`. On Linux, take Node.js from nodejs.org: the one most
   distributions ship is older.
2. **Add the plugin.** In Claude Code, type:
   ```
   /plugin marketplace add OnurGumus/codebase-video
   /plugin install codebase-video@codebase-video
   ```
3. **Ask for a video.** Open Claude Code in your project and type `/codebase-video`.

Claude asks what the video should cover, how long it should be and who will watch it, then does the work. You do not
need to stay. The first time, it checks the three things above and downloads about 800 MB, mostly the voice; that
happens once.

You get an `.mp4` with captions in the `.codebase-video` folder of your project. Your code is not changed, and git
ignores that folder.

## What do you want to do?

| I want to | Read |
|---|---|
| make my first video, or try a cheap preview first | [Your first video](docs/first-video.md) |
| fix or change a video, give standing hints, or fix how a word is said | [Change a video](docs/change-a-video.md) |
| show what changed since a release, a commit or a date | [A progress video](docs/progress-video.md) |
| give the video in my own voice, as slides | [Present it yourself](docs/present-it-yourself.md) |
| put the video in a README | [Share it on GitHub](docs/share-on-github.md) |
| make videos from CI, without questions | [Run it from CI](docs/ci.md) |
| look up a setting, an output file or a command | [Reference](docs/features.md) |
| know how the checking works and what it costs | [How it works](docs/how-it-works.md) |

## Good to know

- **Time.** A short video (3 to 5 minutes) takes under an hour to make, a tour (6 to 10 minutes) an hour or more,
  a deep one (20 to 28 minutes) several hours. That is the computer's time: you can do something else.
- **Cost.** Most of the work is checking, so it is not light: about 1.2 million Claude tokens for a short video, 2
  to 3 million for a tour, and 0.4 to 0.5 million for a preview without pictures.
  [More on cost](docs/how-it-works.md#what-it-costs).
- **Is it correct?** Every statement is checked against your code by a Claude that did not write it, and so are the
  script and the pictures. That is careful checking, not a proof: the write-up beside each video names the file and
  line behind every statement.
- **Is my code private?** The voice, the drawing and the video files stay on your computer; nothing is uploaded.
  Claude Code reads your code as it always does. Claude is told to keep passwords and keys out of the video. The
  video shows your code: share it only with people who may see the code.
- **Which languages?** Any. Code on screen is coloured for F#, C#, JavaScript, TypeScript, Python, SQL, JSON, YAML,
  Bash, Nix and Dockerfiles, and shown in one colour otherwise.
- **Anything else to install?** No Python, no .NET, and no account or key for the voice: it runs on your computer.

## Help build it

See [CONTRIBUTING.md](CONTRIBUTING.md). The plugin is written in F#. MIT license: see [LICENSE](LICENSE).
