Write the narration script for a video about how a codebase CHANGED over a range of its history. You write ONE file,
`script.json`; no visual modules.

**Source of truth:** {{WS}}/build/lesson.md ("{{SUBJECT}}", {{LINES}} lines), a document about the repository {{REPO}}
over the range {{RANGE}} It was written from the commits and the code and independently fact-checked. Read it in
full, every line. The narration may not say anything the document does not say, or say it differently.

**Audience:** {{AUDIENCE}}. They follow the project; most do not read its code every day. Say what changed for the
project's users and for the people who build on it, then show the code that did it. Never more than one code card in
a row without saying what it means for someone outside the team.

**What to bring out** (the focus chosen for this video):
{{FOCUS}}

**The general rules** are in `{{WS}}/build/brief-writer-base.txt`: read it in full. Its sections "Read first",
"Output", "Narration rules" and "Process" apply to this video as written (the script format, the map format, rests,
pauses, the glossary, toasts, the commands to run). Its "Structure" does not apply; this one does. Also put
`"kind": "progress"` at the top level of `script.json`.

**Structure:**
- `title` (one line: the project and the range in words, for example "from version 0.5 on October 4 to today"),
  `intro` (what the viewer will know at the end: what shipped, where the work went, what is still open).
- A chapter "At a glance" from the document's section of that name: the range and its totals, then where the work
  went by area. Speak only the few numbers that matter and round none of them.
- One chapter per theme of the document, in its order. Each has a bridge scene `kN-why` with `"chapter"`, and
  content scenes: what the project does now that it did not; then how, with the code that matters; and where the
  document gives a before and after, both. Say each reason as the document does: "the commit message says ...".
- A chapter "In flight" from the document's "In flight and at risk": what is unfinished or fragile, as the document
  states it. No verdict on pace or on people, and no advice.
- A chapter for the goals and one for who worked on what, ONLY if the document has those sections. For the people
  chapter: areas and names as the document lists them, said once each, with no comparison between people.
- Each chapter closes with a `kN-recap` as in the base brief. `outro`: the one thing to look at next.
- No pause-and-think scenes. Target {{MINUTES}}: {{WORDS}}. {{CHAPTERS}}, {{SCENES}}.

**The map:** write the top-level `"map"` from the `Parts:` and `Connections:` lists that end the document, as the
base brief says. In addition, for each part whose status in the document is `new` or `changed`, set
`"badge": "new"` or `"badge": "changed"`. On each theme chapter's bridge scene set `"path"` to the parts that theme
touched: for a progress video they need not be joined by arrows, and they light up together. Use `"inside"` on a
scene only when it is about the inside of one part.

**Numbers:** every number you speak or caption is in the document, and through it in the facts. Do not add two of
them, compare them as a percentage, or turn one into "almost half" unless the document does.

**People:** unless the document has a "Who worked on what" section, no person is named anywhere in the script.

**Report:** as the base brief asks, and also: each number spoken, with the document line it comes from.
