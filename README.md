# codebase-video

**Ask Claude Code for a video about your code. Get a narrated video that explains it.**

Every statement in the video is checked against your code before the video is made.

https://github.com/user-attachments/assets/7a73076f-512c-4933-a95a-1e6dc175ff20

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

## How long does it take, and what does it cost?

You pick the length of the video:

| You ask for | The video is | Making it takes about |
|---|---|---|
| short | 3 to 5 minutes | under an hour |
| tour (the usual choice) | 6 to 10 minutes | an hour or more |
| deep | 20 to 28 minutes | several hours |

These times are rough, and it is the computer's time, not yours: you can do something else meanwhile.

**How much of my Claude plan does it use?** It is not light, because most of the work is checking. The helper
agents use roughly:

| What you ask for | Claude tokens | How we know |
|---|---|---|
| a preview (the checked write-up and the narration, no pictures) | about 0.4 to 0.5 million | measured |
| a short video | about 1.2 to 1.3 million | measured |
| a tour | about 2 to 3 million | estimate |
| a deep video | about 6 to 8 million | estimate |

The measured rows come from two small projects. The estimates are worked out from the number of agents each
length needs and how much each one reads; adding one chapter to an existing tour used about 1.5 million, which
fits. Three things move these numbers: a bigger project costs more, because there is more to read and check;
every round of fixes after a check adds some; and the main Claude session adds some on top.

Most of the tokens are Claude reading your code and its own drafts. Drawing and encoding the video happen on your
computer and use no tokens.

**Not sure yet?** Ask for a preview first. You get the checked write-up of your code and the narration to listen
to, without the pictures. It is much quicker and cheaper, and if you like it, Claude carries on from there to the
full video without redoing anything.

**Changing a video afterwards is quick.** Only the scenes that changed are drawn again: about a minute for a
changed picture or sentence in a five-minute video, where drawing the whole video takes about five.

The first time, the plugin downloads a voice (about 800 MB). This happens only once.

## Is what the video says correct?

A video that explains code wrongly is worse than no video, so that is what most of the work goes into. Before anything is drawn, Claude writes down what it learned and notes
the exact file and line behind every statement. Then a second Claude, which has not seen the first one's work,
checks each statement against your code. The script and the pictures are checked the same way.

Here is what the checks caught while making the five-minute video at the top of this page:

| Check | What it caught |
|---|---|
| The write-up, checked against the code | 9 corrections |
| The script, checked against the write-up | 2 sentences that would mislead a listener, 10 smaller wording fixes |
| The pictures, checked against the script and the code | 1 misleading label, 3 smaller fixes |
| The last scan of the whole video | nothing left to fix |

Two kinds of checking are at work. A program checks what a program can: that every picture appears on the words
that describe it, that nothing overlaps or flashes by too fast, that no number is shown that the write-up does
not contain. Whether an explanation is *right* is checked by Claude, against the code, by a Claude that did not
write it. That is careful checking, not a proof: if something in a video looks wrong, the write-up next to it
tells you the file and line to look at.

More detail: [how it works](docs/how-it-works.md).

## Is my code private?

- The voice, the drawing and the video files stay on your computer. The video is not uploaded anywhere.
- Your source code is read by Claude Code, the same as whenever you use Claude Code. The plugin does not make
  your code more private than Claude Code already is.
- Claude is told to keep passwords and keys out of the video, and checks for them.
- The video shows your code. Share it only with people who may see the code.

## Common questions

**Which programming languages work?** All of them. Claude reads whatever is in the folder. Code on screen is
coloured for F#, C#, JavaScript, TypeScript, Python, SQL, JSON, YAML, Bash, Nix and Dockerfiles; other languages
are shown in one colour.

**Can I change the video afterwards?** Yes. Tell Claude what to change, for example "chapter 2 is too fast". Only
the scenes that changed are drawn again, so a small fix takes about a minute, not the whole render.

**Can I give it hints?** Yes. Say them when you ask: what to cover, what to leave out, who will watch, what to check
extra carefully. For hints that should apply to every video of a project (your team's terms, parts to always
skip), put them in a file named `.codebase-video/hints.md` in that project. Claude will offer to save them for you.

**Can I put the video in my README?** Yes, a short one. GitHub plays a video inside a README only up to 10 MB, so
short videos are kept under that, and their first frame is drawn as a thumbnail with a play button, like the one
at the top of this page. Edit your README on github.com and drag the `.mp4` into the editor.

**Do I need Python or .NET?** No.

**Does the voice need an account or a key?** No. The voice runs on your computer.

## Want to help build it?

See [CONTRIBUTING.md](CONTRIBUTING.md). The plugin is written in F#.

## License

MIT. See [LICENSE](LICENSE).
