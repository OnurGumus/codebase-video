You are writing the TEACHING DOCUMENT for a narrated video that teaches a codebase. The video will say nothing that this
document does not say, so it must be true, specific and grounded in the code. Do not edit anything in the repository.

**Repository:** {{REPO}}
**What the video teaches:** {{SUBJECT}}
**The goal** (what a viewer can do after watching; everything in this document serves it): {{GOAL}}
**Audience:** {{AUDIENCE}}
**Output:** {{WS}}/build/lesson.md

Explore before you write: the README and docs, the build files (package.json, *.csproj, pyproject, go.mod, Cargo.toml,
Makefile ...), the entry points, the directory layout, the tests (they show intended behaviour), and the git history for
the files that matter (`git log --oneline -- <path>`). Trace the flows the goal needs by reading the actual call
chain, file by file, not by guessing from names.

**Focus.** This is not a survey of the repository: it is the path to the goal, with what a newcomer needs on the way.
Explore widely, then write narrowly. A feature, idea or convention the goal's path does not pass through goes in the
last section's list, not in a section of its own, however central it is to the codebase. Each section below is as
long as the goal needs it to be, and a section the goal does not need is one line.

**Structure** (Markdown, `##` sections; the video follows them as chapters):
1. `## What this is and why it exists`: the problem it solves, who calls it, the 3-5 words a newcomer must know (defined).
   Short: a paragraph or two.
2. `## The ideas it builds on`: the general concepts the goal's path relies on (for example event sourcing, an
   aggregate, the actor model, a message queue, dependency injection, a reducer), each defined in general terms first,
   then how THIS codebase maps it onto its own parts (which type or module plays which role, with citations), and
   which later section first needs it. Only ideas a later section needs; a newcomer who knows none of them should
   understand the rest of the document after this section.
3. `## The map`: the main parts and how they depend on each other (which module calls which; where data lives); the
   directory layout that matters, and what to ignore. End the section with two lists the video's map is drawn from:
   `Parts:` the 2 to 7 main parts, each with a short name (12 characters at most), its kind (a caller, an entry
   point, an internal module, a data store, an external service ...) and a citation; and `Connections:` each pair
   that talks, as `A -> B: verb` in the direction the call or the data really goes, with a citation.
4. `## The core mechanism`: the one idea (two at most) the goal rests on: the thing a
   curious developer, told what the code does, asks next: "but how does that actually happen?" (for a renderer, how a
   time becomes a pixel; for an event-sourced service, how a command becomes stored state; for a compiler, how a node
   becomes an instruction). Name it in one sentence. Then follow ONE concrete example all the way down, with its
   real values at every step, through the real functions, layer by layer, until it reaches something the reader
   already knows (a value written to the screen, a row in a table, a byte on the wire). Do not stop at the function
   that sounds like the answer: open what it calls, down to the small helpers a tour would skip, because the bottom
   layer is where the question is answered. Show each layer's code. Close the section with a table of the example's
   values at three or four inputs or moments (the input, each intermediate value, what finally comes out).
5. One `##` section per flow the goal follows (one or two for a tour, three to five for a deep dive), each traced end
   to end: the entry point, every hop in order, the data that moves, the decision points, where errors go, where it
   ends. Together they reach the goal: a viewer who has followed them can do what the goal says. Show the real code
   at each important hop. Where a flow passes through the core mechanism, point back to that section instead of
   repeating it.
6. `## Conventions and gotchas`: the patterns and traps met on the goal's path (naming, error handling,
   configuration, tests), each shown with an example from the code. Not the ones met only elsewhere.
7. `## Where to start`: how to build and run it, run the tests, and two or three concrete first exercises on the
   goal's path ("add a field to X: touch A, B, C") whose answers the document gives.
8. `## Beyond this video`: the features, flows and ideas you found that the goal does not need, one line each with a
   citation (for example "Sagas coordinate several aggregates (src/Saga.fs:1-40)"). The video names them as left
   for later; it never teaches them.

**Rules (the video inherits every mistake you make):**
- Every factual sentence ends with its source: `(src/http/client.ts:42-58)`. A claim you inferred rather than read is
  marked `(inferred)`; prefer reading until you can cite.
- Code blocks are copied VERBATIM from the repo with a caption line `` `path/to/file.ts:42-58` ``; trim only by whole
  lines and mark each cut with a comment line (`// …`, `# …`). Never invent, rename or "simplify" code.
- Names, signatures, defaults, config keys, error messages, commands: exactly as the code has them.
- Describe what the code DOES, not what its names suggest: read the function bodies.
- If something is ambiguous or looks like a bug, say so plainly in a `> Note:` line; do not paper over it.
- Plain language: define each term at first use; no marketing; about {{DOC}} in total.
- Teach the stable design, not the state of this checkout: no unreleased version numbers, no "the samples use the
  published package but the source is newer", no in-progress branches or uncommitted work, unless the subject asks
  for them. They go stale and confuse a viewer.
- No secrets: never copy keys, tokens, passwords, internal hostnames or customer data into the document, even if they
  are in the repo; write `<redacted>` and mention it in your report.

When done, report: the sections with their line ranges, how each one serves the goal, the core mechanism you
chose, why it is the core, and the
layer its trace ends on, the flows you chose and why, every `(inferred)` claim, every
`> Note:` you wrote, anything you redacted, and what you deliberately left out.
