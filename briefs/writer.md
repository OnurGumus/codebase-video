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
{"repo", "document"}, `card` {course: the repository name, lesson: the subject, sub: one line}, and `scenes`.

**Structure:**
- `title` (one line naming the subject and the repository), `intro` (the goal: what the viewer will be able to do after
  watching), `intro-path` (preview the steps and say what the video assumes the viewer knows).
- {{CHAPTERS}}, following the document's `##` sections in order (merge short ones). Each chapter has:
  - a bridge scene `kN-why` with `"chapter": "<card title>"`, `"lead": 1.0, "pad": 0.5`, one line on why this comes next;
  - content scenes `<module>-<name>`, where the module key is a letter plus the chapter number (for example `m1-entry`,
    `f2-retry`), {{SCENES}};
  - {{THINKS}}: `<module>-think`, a question, `[think 10]`, then the answer (taken from the document, ideally from its
    exercises);
  - a closing `kN-recap` with three spoken sentences and a `"recap"` list of three short card lines in the same order,
    `"lead": 0.6, "hold": 3.5, "pad": 0.5`.
- `outro` ties back to the intro's goal and names the document's first exercise.
- Target {{MINUTES}}: {{WORDS}}. File paths, identifiers and flags cost several spoken words each. Plan the cut before
  you write: follow one flow end to end rather than skimming all of them, and say in `intro-path` what is left for later.

**Narration rules:**
- Objective first: say where each chapter is going before diving in. Define every term at first use, in a few words.
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
- One caption per sentence: keep sentences under about 30 words. `[pause]` after each key point; about 150 words a minute.
- About one light humour line every two minutes, each adding NO claim and bending none.
- `[shown](spoken)` for anything the voice would mangle or that should appear as code in the caption, e.g.
  `[fetchWithRetry](fetch with retry)`, `[src/http/client.ts](the client file in source slash H T T P)`,
  `[npm test](N P M test)`. Spell acronyms as separate letters in the spoken half (`H T T P`, `A P I`, `J S O N`).
  The shown form must read correctly as a caption; never put a spoken spelling outside the brackets.
- Do not let a pronoun or "its" follow a sentence about a different thing.
- Think scenes: answerable from what was said so far, not given away in the sentences just before, short enough to hold
  by ear, and answered exactly as the document answers it.
- Toasts: about one a minute (at most 24), `"toasts": [{"kind": "...", "at": "<exact spoken phrase in that scene>"}]`.
  Kinds: idea, tricky, remember (only a callback to an earlier chapter), careful (a trap), mistake / surprise / tip
  (only where the document frames it that way).
- Where the document looks wrong or contradicts the code, follow the code, and report it.
- Never narrate the state of the local checkout (versions in flight, local-vs-published mismatches, uncommitted work).

**Process** (from any directory):
- `{{ENGINE}}/build.sh {{WS}} narrate`
- `{{ENGINE}}/build.sh {{WS}} check --lesson {{WS}}/build/lesson.md`

Repeat until `check` shows no warnings and its only errors are "module has no <key>.js". Then re-read the whole script
once against the document, sentence by sentence, and fix anything that goes beyond it.

**Report:** the chapters with module keys and scene ids, the document lines each module draws from, the total length,
each think question with its answer, what you left out, and anything in the document that looks wrong.
