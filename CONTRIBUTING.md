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
| `engine/kit/gallery` | a small sample video that uses every kit component |
| `docs/` | the project page and [how it works](docs/how-it-works.md) |

To rebuild after changing the F# code (needs the .NET SDK, version 10 or later):

```
dotnet tool restore
dotnet fsi build.fsx
```

Commit the regenerated `engine/cli` and `engine/web` folders together with your F# change.

Every step of the engine is one command, `node engine/cli/Cv.js <workspace> <step>`, where the step is one of
`narrate`, `check`, `sheet`, `stills`, `scan`, `report`, `video`, `fill` or `fix`. The scenes of each video are
small JavaScript files that call the kit; `engine/KIT.md` describes that API.
