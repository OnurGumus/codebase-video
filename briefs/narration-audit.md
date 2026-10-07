You are auditing the NARRATION of a video that teaches a codebase, before any visuals are built. Do not edit any file
except the report you write. You did not write this script; be adversarial.

Files (in {{WS}}/):
- `build/lesson.md`: the fact-checked teaching document ("{{SUBJECT}}", {{LINES}} lines) about the repository {{REPO}}.
  Read it in full. It is the source of truth, and every claim in it cites the code (`path:lines`): when a narration
  sentence matters, open the cited file in the repository and check the code itself.
- `script.json`: the narration. Each scene has "say"; `[shown](spoken)` means the caption shows the first part and the
  voice says the second; `[pause]` is a breath; `[think 10]` is 10 s of silence after a question; "toasts" are pop-up
  badges cued on a spoken phrase; `*-recap` scenes have a "recap" list (card lines, one per spoken sentence); `*-why`
  scenes open a chapter.
- `build/timing.json` and `build/captions.vtt`: what was actually voiced.
- {{ENGINE}}/KIT.md, section "Toasts", for what each toast kind means.

The audience: {{AUDIENCE}}.
{{CARE}}

Find, with the scene id and the exact sentence:
A. Claims: anything the document or the code does not support, or that is technically wrong: names, signatures,
   defaults, file paths, call order, what calls what, where errors go. For each gloss the narration adds beyond the
   document, say whether it is correct (check the code) and harmless, or should go.
B. Terms used before they are explained, or never explained.
C. Pause-and-think scenes: answerable from what was said so far? given away just before? answered exactly right? short
   enough to hold by ear?
D. Flow: sentences hard to follow by ear, dangling clauses, a connective implying a causal link that is not there,
   repeated connectives close together, stiff phrasing.
E. Humour lines: any that adds or bends a claim; suggest a replacement. About one every two minutes is wanted.
F. Speech: run `check` and read its "glossary:" list (each technical term and how the voice will say it, from
   {{ENGINE}}/glossary.json and the repository's own `.codebase-video/glossary.json`): flag any term said in a way a
   developer would not say it, a term said two different ways in the video, and a `[shown](spoken)` that spells out
   what the glossary would have said better. Also: `(spoken)` forms the voice will mangle (identifiers, paths, acronyms), a `[shown]` form that would look wrong
   as a caption, spoken spellings outside brackets.
G. Recaps: three spoken sentences match three card lines in order and say only what the chapter covered.
H. Toasts: wrong kind, phrase not spoken in that scene, within 6 s of another, inside a think silence; more than 24.
I. Coverage: does anything the writer cut make a later statement wrong or unsupported?
J. The document itself: anything in it that the code contradicts (quote both).
K. Density: places where facts arrive back to back with no room to take them in: three new facts in a row, a new
   term or number followed at once by another, a subject change without a pause. Say where a `[pause]` belongs, and
   which fact to cut if the video is at its length limit (cut a fact, never a pause). A spoken list of three or
   more things with no `[rest]` between its items (KIT.md, "Breathing room"): say where each one goes.
L. The map (`"map"` at the top of `script.json`; KIT.md, "The shared map"): every part and connection against the
   lists that end the document's `## The map` section and against the code: a part the document does not have, a
   wrong kind, an arrow pointing against the call or the data, a wrong verb. Each bridge scene's `"path"` against the
   order its chapter's flow reaches the parts. Each scene's `"inside"` against what the scene is about.
M. Depth: for each chapter, write the two or three "but how does that actually happen?" questions a curious
   developer would still have after hearing it, and for each say whether a later sentence answers it (quote it) or
   nothing does. An unanswered question about the core mechanism (the document's `## The core mechanism` section)
   is a must-fix: give the sentences that answer it, taken from the document's worked example, and name what to cut
   to make room (a flow or an area, never a pause). Also flag a principle stated without its worked example, a trace
   that stops above the document's last layer, and a core-mechanism chapter with well under a quarter of the video.

For each finding give replacement wording. Keep each scene's sentence count where you can. Rank must-fix / should-fix /
nit. Also list what you checked and found correct. Do not pad. Write the report to `build/audit-narration.md` (or
`build/audit-narration-2.md` if that one exists) and return it in your final message.
