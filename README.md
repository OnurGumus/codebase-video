# codebase-video

**Ask Claude Code for a video about your code. Get a narrated video that explains it.**

https://github.com/user-attachments/assets/0b4e12d4-ce36-48db-9532-be7eb61ad430

*This video was made by the plugin, about the plugin.*

## What is it?

A plugin for [Claude Code](https://claude.com/claude-code). You point it at a folder of code. It reads the code
and makes a video in which a voice explains how the code works, with diagrams and the real code on screen.

People use it to:

- help a new teammate understand a project;
- understand a project somebody else wrote;
- explain one part of a big system.

## How do I use it?

**1. Install three things** (if you do not have them yet):

- [Node.js](https://nodejs.org) (version 18 or newer)
- [ffmpeg](https://ffmpeg.org)
- Google Chrome

On a Mac: `brew install node ffmpeg`

**2. Add the plugin.** Type these two lines in Claude Code:

```
/plugin marketplace add OnurGumus/codebase-video
/plugin install codebase-video@codebase-video
```

**3. Ask for a video.** Open Claude Code in the folder with your code and type:

```
/codebase-video
```

Claude asks what the video should cover, how long it should be, and who will watch it. Then it does the work.
You do not need to stay and watch.

## What do I get?

A video file (`.mp4`) with captions, saved inside your project in a folder called `.codebase-video`.

Your code is not changed. Git ignores that folder, so nothing is committed by accident.

## How long does it take?

You pick the length of the video:

| You ask for | The video is | Making it takes about |
|---|---|---|
| short | 3 to 5 minutes | under an hour |
| tour (the usual choice) | 6 to 10 minutes | an hour or more |
| deep | 20 to 28 minutes | several hours |

These times are rough. A longer video also uses more of your Claude plan.

**Not sure yet?** Ask for a preview first. You get the checked write-up of your code and the narration to listen
to, without the pictures. It is much quicker, and if you like it, Claude carries on from there to the full video.

The first time, the plugin downloads a voice (about 800 MB). This happens only once.

## Is what the video says correct?

That is what most of the work goes into. Before anything is drawn, Claude writes down what it learned and notes
the exact file and line behind every statement. Then a second Claude, which has not seen the first one's work,
checks each statement against your code. The script and the pictures are checked the same way.

More detail: [how it works](docs/how-it-works.md).

## Is my code private?

- The video is made on your own computer. It is not uploaded anywhere.
- Claude Code reads your code, the same as whenever you use Claude Code.
- Claude is told to keep passwords and keys out of the video, and checks for them.
- The video shows your code. Share it only with people who may see the code.

## Common questions

**Which programming languages work?** All of them. Claude reads whatever is in the folder. Code on screen is
coloured for F#, C#, JavaScript, TypeScript, Python, SQL, JSON, YAML, Bash, Nix and Dockerfiles; other languages
are shown in one colour.

**Can I change the video afterwards?** Yes. Tell Claude what to change, for example "chapter 2 is too fast".

**Do I need Python or .NET?** No.

**Does the voice need an account or a key?** No. The voice runs on your computer.

## Want to help build it?

See [CONTRIBUTING.md](CONTRIBUTING.md). The plugin is written in F#.

## License

MIT. See [LICENSE](LICENSE).
