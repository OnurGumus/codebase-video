Write the narration script for a video that teaches a codebase. You write ONE file, `script.json`; no visual modules.

**Source of truth:** {{WS}}/build/lesson.md ("{{SUBJECT}}", {{LINES}} lines), a teaching document about the repository
{{REPO}} that was written from the code and independently fact-checked. Read it in full, every line. The narration may
not say anything the document does not say, or say it differently. Every name, signature, default, file path, command
and number must match it exactly. When in doubt, open the cited file in the repository.

**Audience:** {{AUDIENCE}}.

**Read first:** {{ENGINE}}/KIT.md (the whole file; especially "Toasts" and "Breathing room"). The example script
{{ENGINE}}/kit/gallery/script.json shows the format.

**Output:** {{WS}}/script.json with top-level `"name": "{{NAME}}"`, `title`, `"voice": "af_heart"`, `"lang": "en-us"`,
`"speed": 0.87`, `poster` (a scene id whose last frame will make a good still), `readsFine` (a list), `source`
{"repo", "document"}, `card` {course: the repository name, lesson: the subject, sub: one line; leave out `thumbnail` unless you are told to
set it}, and `scenes`.

**Structure:**
- `title` (one line naming the subject and the repository), `intro` (the goal: what the viewer will be able to do after
  watching), `intro-path` (preview the steps and say what the video assumes the viewer knows).
- {{CHAPTERS}}, following the document's `##` sections in order (merge short ones). Each chapter has:
  - a bridge scene `kN-why` with `"chapter": "<card title>"`, `"lead": 1.0, "pad": 0.5`, one line on why this comes next;
  - content scenes `<module>-<name>`, where the module key is a letter plus the chapter number (for example `m1-entry`,
    `f2-retry`), {{SCENES}};
  - pause-and-think scenes: {{THINKS}}. A think scene is `<module>-think`: a question, `[think 10]`, then the answer
    (taken from the document, ideally from its exercises);
  - a closing `kN-recap` with three spoken sentences and a `"recap"` list of three short card lines in the same order,
    `"lead": 0.6, "hold": 3.5, "pad": 0.5`.
- `outro` ties back to the intro's goal and names the document's first exercise.
- The map (KIT.md, "The shared map"): write a top-level `"map"` from the `Parts:` and `Connections:` lists that end the
  document's `## The map` section: the same names, kinds and directions, nothing added. Put the main flow left to
  right along one row. `kinds` gives each kind the tone and icon of this video's colour table: {{COLOURS}}.
  On the bridge scene of each chapter that follows a flow, add `"path"`: the parts that flow touches, in the order it
  reaches them. On each content scene that is about the inside of one part, add `"inside": "<part id>"`; give the
  first scene of such a run `"lead": 1.4` and the last one `"pad": 1.8`. Leave `inside` off scenes that are about how
  parts talk to each other.
- Target {{MINUTES}}: {{WORDS}}. File paths, identifiers and flags cost several spoken words each. Plan the cut before
  you write: follow one flow end to end rather than skimming all of them, and say in `intro-path` what is left for later.
- The chapter on the document's `## The core mechanism` section is the heart of the video: give it about a quarter
  of the running time and keep every layer of its worked example, down to the last one. When the draft runs long,
  cut a whole flow or area and say so in `intro-path`; never thin the core mechanism, and never cut the bottom layer
  of its trace: the small helper where the value is finally computed or written is the answer to the question the
  viewer came with.

**Narration rules:**
- Objective first: say where each chapter is going before diving in. Define every term at first use, in a few words.
- Show it happen: a principle is not an explanation. Each time the narration states how something works ("a frame is
  a pure function of time", "state is rebuilt from its events"), the next sentences walk the document's worked
  example through it with its real values, one step a sentence, to the last step the document gives ("at twelve
  point one seconds the progress is zero point three, so the opacity written to the element is zero point three").
  A viewer who asks "but how does that actually happen?" should hear the answer before the chapter ends.
- Concepts before mechanics: introduce the general ideas the code builds on (the document's "ideas it builds on"
  section) in general terms first, then say how this codebase maps them onto its parts, before any code or diagram
  that relies on them. Never let a configuration or registration card (e.g. a call that registers an aggregate)
  appear before the viewer knows what it registers.
- Intuition before code: before the first code card of a core idea (the functions a user writes, a key class, a
  protocol), walk one plain, concrete example through it in words (real values from the document, e.g. "an account
  holds 100; withdraw 30 arrives; ... now it holds 70"), so the viewer knows what the code is for before reading it.
  A newcomer should never meet a function's code before knowing what goes in and what comes out.
- Teacher-like connectives linking most sentences (so, therefore, that means, but, instead, for example, notice, here is,
  next, then, finally, the tricky part, recall...), varied, never implying a causal link that is not there. The `check`
  flow line must be at least 40% in every chapter.
- One caption per sentence: keep sentences under about 30 words; about 150 words a minute while speaking.
- Give the viewer room. People cannot take in facts that arrive back to back, so space them: a `[pause]` after every
  key point, after each new term and after each number that matters; a `[pause 2]` where the subject changes inside
  a scene; never three new facts in a row without a pause, and no stretch of talk over about 30 s without one. One
  idea per sentence. When a sentence lists three or more things, put a `[rest]` after each comma of the list
  ("the endpoint, [rest] the saga, [rest] and the journal"): each item then gets its own beat, and a builder can
  show each one on its word. The `check` breathe line should show 72-78% talk; it warns over 82%, and over 45 s without a
  pause. If the video runs long, cut a fact, not a pause.
- About one light humour line every two minutes, each adding NO claim and bending none.
- Technical terms: write them plainly, as they are spelled (`JSON`, `C#`, `.NET`, `S3`, `Render.fs`, `window.render`).
  The engine's glossary ({{ENGINE}}/glossary.json, and this repository's own `.codebase-video/glossary.json` over it
  when there is one) says each the way people do ("jason", "C sharp", "dot net", "S three", "Render dot F S") and
  the caption shows it as you wrote it. `check` lists every term the glossary handled ("glossary: ...") and warns
  about a capitalised term it does not know ("is read as written"): for that one, and for anything else the voice
  would mangle or that should appear as code in the caption, use `[shown](spoken)`, e.g.
  `[fetchWithRetry](fetch with retry)`, `[src/http/client.ts](the client file in source slash H T T P)`,
  `[XKCD](X K C D)`. A path with slashes is always yours to wrap. In a spoken half you write yourself, say a term
  the way the glossary does (read its entries), and spell an acronym people spell as separate letters (`X K C D`).
  The shown form must read correctly as a caption; never put a spoken spelling outside the brackets.
- Do not let a pronoun or "its" follow a sentence about a different thing.
- Think scenes: answerable from what was said so far, not given away in the sentences just before, short enough to hold
  by ear, and answered exactly as the document answers it.
- Toasts: about one a minute (at most 24), `"toasts": [{"kind": "...", "at": "<exact spoken phrase in that scene>"}]`.
  Kinds: idea, tricky, remember (only a callback to an earlier chapter), careful (a trap), mistake / surprise / tip / remark / question
  (only where the document frames it that way).
- Where the document looks wrong or contradicts the code, follow the code, and report it.
- Never narrate the state of the local checkout (versions in flight, local-vs-published mismatches, uncommitted work).

**Process** (from any directory):
- `node {{ENGINE}}/cli/Cv.js {{WS}} narrate`
- `node {{ENGINE}}/cli/Cv.js {{WS}} check --lesson {{WS}}/build/lesson.md`

Repeat until `check` shows no warnings and its only errors are "module has no <key>.js" (one per module key,
`intro` and `outro` included: builders write those files later). Then re-read the whole script
once against the document, sentence by sentence, and fix anything that goes beyond it.

**Report:** the chapters with module keys and scene ids, the document lines each module draws from, the total length,
each think question with its answer, what you left out, and anything in the document that looks wrong.
