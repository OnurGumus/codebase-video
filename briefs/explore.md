You are writing the TEACHING DOCUMENT for a narrated video that teaches a codebase. The video will say nothing that this
document does not say, so it must be true, specific and grounded in the code. Do not edit anything in the repository.

**Repository:** {{REPO}}
**What the video teaches:** {{SUBJECT}}
**Audience:** {{AUDIENCE}}
**Output:** {{WS}}/build/lesson.md

Explore before you write: the README and docs, the build files (package.json, *.csproj, pyproject, go.mod, Cargo.toml,
Makefile ...), the entry points, the directory layout, the tests (they show intended behaviour), and the git history for
the files that matter (`git log --oneline -- <path>`). Trace the main flows by reading the actual call chain, file by
file, not by guessing from names.

**Structure** (Markdown, `##` sections; the video follows them as chapters):
1. `## What this is and why it exists`: the problem it solves, who calls it, the 3-5 words a newcomer must know (defined).
2. `## The map`: the main parts and how they depend on each other (which module calls which; where data lives); the
   directory layout that matters, and what to ignore.
3. One `##` section per key flow (two or three flows for a tour, four to six for a deep dive), each traced end to end:
   the entry point, every hop in order, the data that moves, the decision points, where errors go, where it ends.
   Pick the flows a newcomer touches first. Show the real code at each important hop.
4. `## Conventions and gotchas`: patterns the code repeats (naming, error handling, configuration, tests), and the
   traps a newcomer falls into, each shown with an example from the code.
5. `## Where to start`: how to build and run it, run the tests, and two or three concrete first exercises
   ("add a field to X: touch A, B, C") whose answers the document gives.

**Rules (the video inherits every mistake you make):**
- Every factual sentence ends with its source: `(src/http/client.ts:42-58)`. A claim you inferred rather than read is
  marked `(inferred)`; prefer reading until you can cite.
- Code blocks are copied VERBATIM from the repo with a caption line `` `path/to/file.ts:42-58` ``; trim only by whole
  lines and mark each cut with a comment line (`// …`, `# …`). Never invent, rename or "simplify" code.
- Names, signatures, defaults, config keys, error messages, commands: exactly as the code has them.
- Describe what the code DOES, not what its names suggest: read the function bodies.
- If something is ambiguous or looks like a bug, say so plainly in a `> Note:` line; do not paper over it.
- Plain language: define each term at first use; no marketing; about {{DOC}} in total.
- No secrets: never copy keys, tokens, passwords, internal hostnames or customer data into the document, even if they
  are in the repo; write `<redacted>` and mention it in your report.

When done, report: the sections with their line ranges, the flows you chose and why, every `(inferred)` claim, every
`> Note:` you wrote, anything you redacted, and what you deliberately left out.
