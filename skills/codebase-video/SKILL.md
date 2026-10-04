---
name: codebase-video
description: Make a narrated video that teaches a codebase (or one flow in it) - explore the repo, write a teaching document grounded in file:line citations, fact-check it against the code, then script, build, audit and render the video locally (Kokoro voice, headless Chrome, ffmpeg). Use when the user asks for a video, walkthrough or onboarding tour of a repository.
user-invocable: true
---

# codebase-video

Turns a repository into a narrated, animated teaching video: chapters, code cards with the real code, diagrams of
modules and calls, pause-and-think questions, recaps. The voice, rendering and encoding run on this machine; nothing
is uploaded. The repository is read by Claude Code's agents the same way any Claude Code session reads it.

The quality comes from separating roles and auditing every step with a fresh agent: one agent writes, another checks
against the code, others build the visuals in parallel, others audit them, and a frame-by-frame scan catches what
eyes miss. Each step's brief is a template in `${CLAUDE_PLUGIN_ROOT}/briefs/`, filled per video by the engine's `fill` step.

## Before you start

- Paths: the engine is `${CLAUDE_PLUGIN_ROOT}/engine` (call it ENGINE below). Every engine command is
  `node ENGINE/cli/Cv.js WS <step>` (CV below), run with `CODEBASE_VIDEO_HOME="${CLAUDE_PLUGIN_DATA}"` set, so the
  voice and browser driver live in the plugin's data dir. (The engine is written in F# and compiled to JavaScript by
  Fable; the compiled files ship with the plugin, so only Node is needed to run it.)
- One-time setup (skips finished steps; downloads about 800 MB the first time):
  `CODEBASE_VIDEO_HOME="${CLAUDE_PLUGIN_DATA}" node ${CLAUDE_PLUGIN_ROOT}/engine/cli/Cv.js setup`
  It needs Node 18+, ffmpeg with libx264/libvpx-vp9/libopus, and Chrome or Chromium. If something is missing it says
  how to install it: tell the user and stop.
- Before agreeing the scope, skim the README, docs and top-level source folders and list the codebase's core
  features (e.g. for an event-sourcing library: aggregates, sagas, projections, hosting). Show the list and ask which
  belong in the video; never silently leave out a core feature (say plainly which ones a tour will skip).
- Agree the scope with the user in one short exchange (sensible defaults if they do not care):
  - the repository (default: the current directory) and what to teach: the whole repo as a tour, or one flow ("how a
    request reaches the database");
  - length: `short` (3-5 min, an overview or promo), `tour` (6-10 min, default) or `deep` (20-28 min);
  - audience (default: "a developer joining the team").
  Tell them the cost honestly: a tour runs about 12 agent tasks, a deep dive about 30; most of it is auditing.
- Privacy: everything runs locally except the model calls Claude Code already makes. The teaching document must never
  contain secrets, tokens, internal hostnames or customer data (the explore and verify briefs say so); if the repository
  is confidential, remind the user that the finished video shows its code and should be shared accordingly.

## The steps

Workspace: `<repo>/.codebase-video/<name>/` (WS below; `<name>` kebab-case, e.g. `request-flow`). Create
`<repo>/.codebase-video/.gitignore` containing `*` so nothing is committed by accident.

1. **Brief.** Write `WS/brief.json`: `name`, `subject`, `repo` (absolute path), `length`, `audience`, `colours` (the
   drawing table below, adapted to this codebase), and optionally `care` (what to check with special care here: e.g.
   "async ordering", "the retry and timeout defaults") and `visual`. Run `CV fill` (it writes `WS/build/brief-*.txt`;
   re-run it after step 3, so briefs know the doc length).
2. **Explore** (one agent, general-purpose): give it `WS/build/brief-explore.txt`. It writes `WS/build/lesson.md`,
   the teaching document, with a `path:lines` citation on every claim and verbatim code. Read its report.
3. **Verify** (a FRESH agent): `WS/build/brief-verify.txt`. It checks every citation, code block and flow against the
   repository, runs the build or tests where cheap and safe, and writes `build/lesson-fixes.json` and `build/VERIFY.md`.
   Apply: `CV fix` (dry run), then `CV fix --apply` (a second round's file: `CV fix build/lesson-fixes-2.json --apply`).
   For `deep`, run a second fresh verify on the corrected document (one pass only ever finds part of what is wrong).
   Re-run `CV fill`.
4. **Script** (one agent): `CV new-long` (creates clip.html), then give it `brief-writer.txt`. It writes
   `WS/script.json`, narrates and runs `check` until clean.
5. **Narration audit** (a FRESH agent): `brief-narration-audit.txt`. Send its findings to the writer to apply (re-narrate
   and re-check). For `deep`, a second fresh audit on the changed text.
6. **Scene plan** (one agent): ask it to write `WS/build/narration-vs-lesson.md` from the final script and document:
   per scene what must be shown and what must not, cued on exact spoken phrases (checked against `build/timing.json`),
   the EXACT code for every card copied from the repository with real indentation, every think silence's allowed
   content, and a split of the module keys among parallel builders by screen time (2 for a tour, 3-4 for deep).
7. **Build** (parallel agents, one per part): each gets `brief-builder.txt` plus its module keys. Never let two builders
   own the same module.
8. **Visual audit** (fresh agents, one per builder part, in parallel): `brief-visual-audit.txt` plus the part. Route each
   report's fixes to the builder that owns those modules.
9. **Re-audit** (one fresh agent): `brief-reaudit.txt`. It scans the whole video every 0.25 s (`CV scan`, then
   `CV report`) and checks stills. Route fixes to the builders; then look at stills of the changed frames yourself.
10. **Render**: `CV video` (several minutes; the machine must stay awake: on macOS wrap it in
    `caffeinate -is`). Output: `WS/out/<name>.mp4` (+ webm, poster jpg, captions vtt, chapters vtt). Look at a few
    frames of the mp4 (`ffmpeg -ss <t> -i ... -frames:v 1`), then give the user the path, the length, the chapters, what
    the audits caught, and anything left unverified.

Agents: use the general-purpose agent type; the explore, verify and audit steps benefit from the strongest model,
builders do well on a faster one. Give each agent its filled brief by path and nothing it does not need. Agents never
publish anything and never write outside WS (the repository itself is read-only for them).

## Default drawing table (adapt per codebase, put it in brief.json "colours")

- a caller outside the system (a user, a client app, another service) = neutral 👤 or 🌐;
- an entry point (HTTP route, CLI command, public function, event handler) = accent ▶ box, the route or function name
  in mono;
- an internal module, class or file = neutral 📦 box, its path or name as a mono sub;
- a data store (database, cache, queue, file on disk) = cyan 🗄️;
- an external service or API the code calls = violet ☁️;
- configuration and environment = muted ⚙️; tests = muted 🧪;
- a request or message travelling a flow = a muted packet;
- code = K.code cards titled with the file path, real indentation, the spoken line glowing in accent;
- verdict colours only for verdicts: green ✓ the right choice, red ✕ the mistake or an error path the narration calls
  an error, amber a caution.

## Rules that keep the videos right (learned the hard way)

- No new claims: every sentence and label traces to the verified document, and through its citation to the code.
- Code on screen is the repository's own, verbatim, real indentation, cuts marked; never simplified or renamed.
- Arrows point the way calls and data really go; never skip a hop the code has.
- Things appear on the words that say them; nothing under 3 s; no stage holds only a heading for over 4 s.
- Think silences show the question and its facts, never the answer.
- In-place drawing changes cross-fade with `rise: 0` on both elements; text replaced by different text must not overlap.
- A module whose cue is not spoken fails to build and draws everything at once: `check` validates cues; always read
  render output for "page error".
- One audit pass finds only part of the errors; fix passes introduce new ones. Re-audit what changed.
