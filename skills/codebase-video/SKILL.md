---
name: codebase-video
description: Make a narrated video about a codebase - one that teaches how it works (or one flow in it), or a progress video that shows what changed since a past commit, tag or date. Explores the repo, writes a document grounded in file:line and commit citations, fact-checks it, then scripts, builds, audits and renders the video locally (Kokoro voice, headless Chrome, ffmpeg). Use when the user asks for a video, walkthrough or onboarding tour of a repository, or for a video of its progress, its changes, or what shipped since a release. Runs without questions when given flags and --yes (for CI).
user-invocable: true
---

# codebase-video

Turns a repository into a narrated, animated teaching video: chapters, code cards with the real code, diagrams of
modules and calls, pause-and-think questions, recaps. The voice, rendering and encoding run on this machine; nothing
is uploaded. The repository is read by Claude Code's agents the same way any Claude Code session reads it.

The quality comes from separating roles and auditing every step with a fresh agent: one agent writes, another checks
against the code, others build the visuals in parallel, others audit them, and a frame-by-frame scan catches what
eyes miss. Each step's brief is a template in `${CLAUDE_PLUGIN_ROOT}/briefs/`, filled per video by the engine's `fill` step.

## Two kinds of video, and flags

- **teach** (the default): how the codebase works. Everything below describes it.
- **progress**: how the codebase changed between a past point and now, for someone following the project. See
  "Progress videos" below for what differs.

The invocation may carry flags; plain words work too ("a progress video since the last release"). A flag given is
never asked about.

| Flag | Meaning | Default |
|---|---|---|
| `--kind teach\|progress` | which kind | `teach` |
| `--repo <path>` | the repository | the current directory |
| `--name <name>` | the workspace and output name, kebab-case | from the subject |
| `--length short\|tour\|deep` | length | `tour` for teach; `short` for progress (which has no `deep`) |
| `--audience "<who>"` | the audience | teach: a developer joining the team; progress: someone following this project's progress who does not read its code every day |
| `--captions` | draw captions into the picture | off |
| `--since <tag, commit or date>` | progress: where the range starts | where the last progress video of this repository ended; else the latest tag; else 30 days back |
| `--until <tag, commit or date>` | progress: where it ends | `HEAD` |
| `--focus shipped,effort,goals,people` | progress: what to bring out | `shipped,effort` |
| `--goals <file>` | progress: a goals or roadmap file; needed by the focus `goals` | none |
| `--ignore "<glob>"` | progress: paths to leave out of the numbers (repeatable) | lock files and generated files |
| `--yes` | never ask: take the default for everything not given | off |

**Asking.** Without `--yes`, ask for what the invocation did not give, in one short exchange, as described below.
With `--yes`, ask nothing at all: take every default, and list each default you took in `out/REPORT.md`. With
`--yes`, a problem that needs a person (the focus `goals` with no goals file, a range with no commits, a missing
tool) stops the run with its message; it never becomes a question. This is how the skill runs in CI
(`docs/ci.md` in the plugin).

**People.** The focus `people` is never on unless asked for by name. Without it the history facts hold no author
names, and no person may be named in the document, the narration or on screen. With it, the video may say which
people committed in which area and how many commits, and nothing else: no ranking, no totals per person, no judgment.

**The run report.** Every run, of either kind, ends by writing `WS/out/REPORT.md`: the kind (and for a progress
video the range); each setting used and whether it was given or a default; the chapters with their start times; what
each audit found and what was fixed; anything left unverified or imperfect; and the output files. Give the user its
path with the video's. In CI it is what a person reads before the video goes to anyone.

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
  - audience (default: "a developer joining the team");
  - which part should go deepest: ask "what are you most curious about?". The default is the codebase's core
    mechanism, which the explorer identifies. Put the answer in `brief.json` `care` ("go deepest on ..."). A video
    that tours everything evenly answers nobody's "but how does it actually work?";
  - optionally a **preview** first (see "Preview" below): the checked document and the narrated script, no
    visuals. Offer it when the user is trying the plugin for the first time or is unsure about the cost.
  Tell them the cost honestly: a tour runs about 12 agent tasks, a deep dive about 30; most of it is auditing.
- Pronunciation: the engine says technical terms from a glossary (`ENGINE/glossary.json`: "JSON" as "jason", "C#"
  as "C sharp", "Render.fs" as "Render dot F S", several hundred terms including common .NET, AWS and Azure
  names). A repository's own terms and the owner's preferences go in `<repo>/.codebase-video/glossary.json`, the
  same shape (`{"terms": {"Cv": "C V", "SQL": "S Q L"}}`; an empty string means "as written"); it wins over the
  engine's. When the user says a term sounded wrong, add it there, re-run `CV narrate` and `CV video` (only the
  scenes that say it are voiced and drawn again), and offer to add a term of general use to the engine's file.
- Standing hints: if `<repo>/.codebase-video/hints.md` exists, read it before agreeing the scope and tell the user
  in one line that it applies; `CV fill` adds it to every agent's brief. It holds what the owner wants in every video
  of this repository: terms to use or avoid, what to leave out, how to draw things, who the usual audience is. When
  the user gives a hint that sounds standing ("always...", "never...", "we call it..."), offer to save it there. The
  folder's `.gitignore` keeps the file out of git; to share it with a team, add a line `!hints.md` to
  `<repo>/.codebase-video/.gitignore`.
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
4. **Script** (one agent): `CV new-long` (creates clip.html), then give it `brief-writer.txt`. It also writes the
   video's map of the main parts into the script (a chapter then opens on the map with its path lit, and a scene
   about the inside of one part is drawn inside that part's box; `check` verifies all of it). It writes
   `WS/script.json`, narrates and runs `check` until clean.
5. **Narration audit** (a FRESH agent): `brief-narration-audit.txt`. Send its findings to the writer to apply (re-narrate
   and re-check). For `deep`, a second fresh audit on the changed text.
6. **Scene plan** (one agent): ask it to write `WS/build/narration-vs-lesson.md` from the final script and document:
   per scene what must be shown and what must not, cued on exact spoken phrases (checked against `build/timing.json`),
   the EXACT code for every card copied from the repository with real indentation, every think silence's allowed
   content, a "watch it happen" scene for the core mechanism (the thing itself changing on screen with the worked
   example's values beside it, each value cued on the word that says it), and a split of the module keys among
   parallel builders by screen time (2 for a tour, 3-4 for deep).
7. **Build** (parallel agents, one per part): each gets `brief-builder.txt` plus its module keys. Never let two builders
   own the same module.
8. **Visual audit** (fresh agents, one per builder part, in parallel): `brief-visual-audit.txt` plus the part. Route each
   report's fixes to the builder that owns those modules.
9. **Re-audit** (one fresh agent): `brief-reaudit.txt`. It scans the whole video every 0.25 s (`CV scan`, then
   `CV report`) and checks stills. Route fixes to the builders; then look at stills of the changed frames yourself.
10. **Render**: `CV video` (several minutes the first time; the machine must stay awake: on macOS wrap it in
    `caffeinate -is`). Output: `WS/out/<name>.mp4` (+ webm, poster jpg, captions vtt, chapters vtt). Look at a few
    frames of the mp4 (`ffmpeg -ss <t> -i ... -frames:v 1`), write `WS/out/REPORT.md` (see "The run report"), then give
    the user the path, the length, the chapters, what the audits caught, and anything left unverified.
    A fix after the render is cheap: the video is kept as one piece per scene in `WS/build/segments/`, and `CV video`
    draws again only the scenes that changed (a module fix: that module's scenes; a narration fix, after
    `CV narrate`: that chapter). The rest is reused and the files are joined in seconds. The last line says how many
    scenes were reused. `CV video --full` draws everything again; use it only if a reused scene looks wrong.

## Progress videos

A progress video follows the same steps with these differences. Workspace as for any video.

1. **Brief.** `brief.json` also has `"kind": "progress"`, and `since`, `until`, `focus`, `goals`, `ignore` where
   given (leave `since` out to get its default). `subject` says the range in words ("What changed in <repo> since
   version 0.5"). `colours` as for any video.
2. **History** (no agent): `CV history`. It resolves the range and writes `WS/build/history.md` and `history.json`:
   the commits, tags, work per area, files added, deleted and renamed. Every number in the video comes from there.
   If it fails, it says why (a reference that does not exist, no commits in the range, a shallow clone): in an
   interactive run tell the user and ask for the missing piece; with `--yes` stop. Then `CV fill`.
3. **Explore**, **verify**, **script**, **narration audit**: as steps 2 to 5 above, each with its filled brief. For
   these four the brief is a progress brief that builds on the general one (`brief-<name>-base.txt` beside it), and
   says so. The explorer reads the facts and the commits, never counts, and attributes every reason to a commit
   message. The fact-checker compares each claim with the diff, not the message.
4. **Scene plan**, **build**, **visual audit**, **re-audit**, **render**: as steps 6 to 10. One builder for a `short`
   video. The builder's and auditors' briefs carry the picture rules for this kind (counters, bars and a timeline
   for the overview; the map with "new" and "changed" badges; before and after as two code cards).
5. **Record it**: after a successful render, `CV history --done`. The next progress video of this repository then
   starts where this one ended.
6. Write `WS/out/REPORT.md` and give the user the video, the report and the range it covers.

A short progress video is about 9 agent tasks. Tell the user that a progress video reports what changed and what the
commit messages claim; it does not judge whether the team is on track unless given a goals file to compare with.

## Sharing on GitHub (short videos)

GitHub plays a video attached to a README or an issue only up to 10 MB, and shows its first frame as the thumbnail.
So for a `short` video the engine keeps the mp4 under 10 MB (it says the size at the end of `CV video`, and encodes
the picture again if it is over), and draws the first frame as a thumbnail: the title, a red border, a play button
and the length. For a `tour` or `deep` video the thumbnail is off; set `"thumbnail": true` inside the script's `card`
when the user wants it, or `false` in a short video's `card` when they do not. A longer video will not fit in 10 MB:
tell the user to host it elsewhere (a release asset, a project page, a video site) and link it.
Captions are a separate file (`WS/out/<name>.vtt`) and are not drawn into the picture. GitHub's player cannot load
that file and starts muted, so offer captions in the picture for a video meant for a README: set `"captions": true`
at the top level of `script.json`, narrate again, and each sentence is shown at the bottom as it is spoken. Leave it
off otherwise; it covers the lowest part of the scene.
To attach the video, the user edits the README on github.com and drags `WS/out/<name>.mp4` into the editor; a link
to a file in the repository does not play.

## Preview (cheap first look)

A preview stops once the script has been checked (after step 5, the narration audit), before any scene is drawn:
no builders, no visual audits, no render. That is about 4 agent tasks, or up to 6 for `deep`, which runs a second
verify and a second narration audit. Give
the user: `WS/build/lesson.md` (the checked teaching document), `WS/script.json` (what the voice will say, with
its chapters), and `WS/build/narration.wav` plus `WS/build/captions.vtt` (the narration to listen to). Say plainly
that there are no pictures yet. If they like it, continue from step 6 in the same workspace: nothing is redone.

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

The writer turns this table into `map.kinds` in `script.json` (a tone and an icon per kind), which is what the frame
uses for the parts of the shared map; builders use the same table for everything else.

## Rules that keep the videos right (learned the hard way)

- No new claims: every sentence and label traces to the verified document, and through its citation to the code.
- Depth before breadth: the core mechanism is followed to its bottom layer with one worked example and real values,
  and shown happening on screen. A principle alone is not an explanation. When the video runs long, cut an area,
  never the bottom of the core mechanism (the first engine-internals video cut the three helpers that turn a time
  into an opacity, and left the viewer's main question unanswered).
- Code on screen is the repository's own, verbatim, real indentation, cuts marked; never simplified or renamed.
- Arrows point the way calls and data really go; never skip a hop the code has.
- Things appear on the words that say them; nothing under 3 s; no stage holds only a heading for over 4 s.
- Think silences show the question and its facts, never the answer.
- In-place drawing changes cross-fade with `rise: 0` on both elements; text replaced by different text must not overlap.
- A module whose cue is not spoken fails to build and draws everything at once: `check` validates cues; always read
  render output for "page error".
- One audit pass finds only part of the errors; fix passes introduce new ones. Re-audit what changed.
