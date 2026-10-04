# codebase-video

A [Claude Code](https://claude.com/claude-code) plugin that turns a repository into a narrated, animated video that
teaches it: what the system is, a map of its parts, one or more flows traced end to end with the real code on screen,
the conventions and traps, and where to start. Chapters, pause-and-think questions and recaps included.

Point it at your own codebase to onboard a teammate, or at someone else's to learn it.

## How it works

The video is only as good as what it says, so most of the work is checking:

1. **Explore**: an agent reads the code and writes a teaching document where every claim cites `path:lines` and every
   code block is copied verbatim.
2. **Verify**: a fresh agent checks every citation, code block and flow against the code, runs the build or tests
   where that is cheap and safe, and writes exact corrections.
3. **Script**: an agent writes the narration from the verified document only; two fresh agents audit it.
4. **Build**: parallel agents draw the scenes with a small animation kit (code cards with real indentation, module and
   call diagrams, packets travelling a flow, timelines, tables).
5. **Audit**: fresh agents check every scene against the document and the voice; a final pass scans the whole video
   every 0.25 s for text shown too briefly, overlaps, empty stages and blinks.
6. **Render**: headless Chrome draws every frame, a local text-to-speech voice ([Kokoro](https://github.com/thewh1teagle/kokoro-onnx))
   narrates, ffmpeg encodes. You get `out/<name>.mp4` (plus webm, poster, captions and chapters).

Nothing is uploaded: the voice, rendering and encoding run on your machine. The code is read by Claude Code's agents,
exactly as in any Claude Code session on that repository.

## Install

```
/plugin marketplace add OnurGumus/codebase-video
/plugin install codebase-video@codebase-video
```

Then, in the repository you want to teach: `/codebase-video` (or just ask for "a video that teaches this codebase").
The first run installs the voice model (about 200 MB) and a browser driver into the plugin's data folder.

Requirements: Python 3.10-3.13 (or [uv](https://github.com/astral-sh/uv)), Node 18+, ffmpeg with libx264, libvpx-vp9
and libopus, and Google Chrome or Chromium. On macOS: `brew install python@3.13 node ffmpeg`.

## What it costs

Two lengths:

| | length | agent tasks (roughly) |
|---|---|---|
| `tour` (default) | 6-10 minutes, 2-3 flows | about 12 |
| `deep` | 20-28 minutes, 4-6 flows | about 30 |

Most of the tasks are audits. That is deliberate: in the videos this pipeline was built on, every single audit pass found
real errors, and every fix pass introduced a few new ones.

## Privacy

The teaching document is told never to copy secrets, tokens, internal hostnames or customer data, and the verifier
checks for them. The finished video shows your code, so share it the way you would share the code.

## Layout

- `skills/codebase-video/SKILL.md`: the orchestration (what each step does, in order).
- `briefs/`: one template per agent role, filled per video by `fill.py`.
- `engine/`: the renderer. `build.sh <workspace> narrate|check|sheet|stills|scan|report|video`; `KIT.md` documents the
  animation kit; `kit/gallery/` shows every component.

## License

MIT, see [LICENSE](LICENSE).
