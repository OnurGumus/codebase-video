# Contributing

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
| `engine/glossary.json` | how technical terms are said aloud ("JSON" as "jason"); hand-written, read by `src/Engine/Glossary.fs` |
| `engine/kit/gallery` | a small sample video that uses every kit component |
| `docs/` | [how it works](docs/how-it-works.md) |
| branch `gh-pages` | the project page and the promo video (kept off `main` so installs stay small) |

To rebuild after changing the F# code (needs the .NET SDK, version 10 or later):

```
dotnet tool restore
dotnet fsi build.fsx
```

Commit the regenerated `engine/cli` and `engine/web` folders together with your F# change. A check on every push
and pull request rebuilds them and fails if the committed files differ.

Every step of the engine is one command, `node engine/cli/Cv.js <workspace> <step>`, where the step is one of
`narrate`, `check`, `sheet`, `stills`, `scan`, `report`, `video`, `fill` or `fix`. The scenes of each video are
small JavaScript files that call the kit; `engine/KIT.md` describes that API.

`video` renders one segment per scene and caches it in `<workspace>/build/segments/` under a key made from
everything the scene's frames can depend on (`src/Engine/Segments.fs` lists it). If you make a frame depend on
something new, for example a new part of the chapter frame in `src/Kit/Frame.fs`, add it to that key, or a stale
segment will be reused. `video --full` ignores the cache. `video --lossless` writes lossless segments and joins
them into `build/frames.mkv`; its frames must be identical to a `video --full --lossless` run after any change,
which is how to test the key (`ffmpeg -i build/frames.mkv -f framemd5 -`).
