# How it works

A video that explains code wrongly is worse than no video, so most of the work is checking. Each check is done by a
fresh helper (Claude Code calls these helpers "agents") that has not seen the previous one's reasoning.

## The steps

1. **Read the code.** One agent explores the repository and writes a teaching document. Every statement in it
   points to the file and lines it came from, and every piece of code is copied exactly.
2. **Check the document.** A second agent opens every one of those references, and runs the build or the tests
   when that is cheap and safe. It writes corrections.
3. **Write the script.** A third agent writes what the voice will say, using only the checked document. Another
   checks the script against the document.
4. **Draw the scenes.** Several agents build the pictures at the same time.
5. **Check the scenes.** Fresh agents compare every scene with the script and the code. A final pass looks at the
   whole video four times per second.
6. **Make the video.** A voice reads the script, Chrome draws every frame, and ffmpeg puts them together.

In the videos this was built on, every checking pass found real mistakes. Here is what they caught while making the
five-minute video at the top of the README:

| Check | What it caught |
|---|---|
| the document, against the code | 9 corrections |
| the script, against the document | 2 sentences that would mislead a listener, 10 smaller wording fixes |
| the pictures, against the script and the code | 1 misleading label, 3 smaller fixes |
| the last scan of the whole video | nothing left to fix |

## What a program checks, and what Claude checks

The engine (the F# program in this repository) checks what can be checked mechanically:

- **before drawing** (`check`): every picture is tied to words that are really spoken; no sentence is too long for
  one caption; numbers and symbols the voice might misread are flagged; no number appears that the checked document
  does not state; the narration has pauses and does not read as a list of facts;
- **after drawing** (`scan` and `report`): the whole video, four times per second, for text on screen under 3
  seconds, overlaps, empty screens, content outside the frame, blinking, and pages that failed to draw.

Whether an explanation is right is a judgement, so Claude agents check it against the code, each one fresh. That
is careful checking, not a proof.

## What it costs

| Length | Video | Agent tasks | Claude tokens |
|---|---|---|---|
| preview (no pictures) | the document and the narration | about 4 (6 for `deep`) | about 0.4 to 0.5 million, measured |
| `short` | 3 to 5 minutes | about 10 | about 1.2 to 1.3 million, measured |
| `tour` | 6 to 10 minutes | about 12 | about 2 to 3 million, estimated |
| `deep` | 20 to 28 minutes | about 30 | about 6 to 8 million, estimated |

An agent task is one piece of work Claude Code hands to a helper; more tasks means more time and more of your Claude
usage. The measured rows come from two small projects; the estimates from the number of agents each length needs
and how much each reads (adding one chapter to an existing tour used about 1.5 million, which fits). A bigger
project costs more, each round of fixes adds some, and the main Claude session adds some on top.

Drawing and encoding run on your computer and use no tokens. They take roughly one and a half times the video's
length and keep the computer busy. That is paid once: the finished video is kept as one piece per scene, and a fix
draws again only the scenes it can change. Joining the pieces takes seconds.

## What runs on your computer

The voice ([Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)), the drawing (your Chrome) and the encoding (ffmpeg)
all run locally, and the video is not uploaded anywhere. Your source code is read by Claude Code, as in any Claude
Code session.

The one-time setup downloads the voice model, the software that runs it, a browser driver, and
[eSpeak NG](https://github.com/espeak-ng/espeak-ng) for pronunciation: about 800 MB. eSpeak NG is licensed under
GPL-3.0; it is downloaded to your machine during setup and is not part of this plugin. On Linux, ffmpeg must include
the `libx264`, `libvpx-vp9` and `libopus` encoders (the usual packages do).
