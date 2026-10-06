You build the visual modules for part of a narrated video that teaches a codebase. Read `{{ENGINE}}/KIT.md` first
(including "Colour by kind", "Toasts" and "Breathing room"), and the gallery module for any component you use
(`{{ENGINE}}/kit/gallery/*.js`, rendered by `{{ENGINE}}/kit/gallery/clip.html`).

The video folder is `{{WS}}/`. The teaching document is `build/lesson.md` there ({{LINES}} lines, "{{SUBJECT}}"),
written from the repository {{REPO}} and fact-checked. Your scenes are the ones whose ids start with your module keys,
in `script.json` (narration) and `build/timing.json` (timing and sentence split). `build/narration-vs-lesson.md` (if it
exists) says per scene what to show, the exact code to show, and what not to show.

**Rules for this video:**
- Every label, number and code line must trace to the document (and through its citation to the code) and agree with
  the narration at that moment. When the document cites `path:lines`, you may open that file in the repository to get
  the code exactly; never invent or "simplify" code, never rename an identifier.
- Time everything by phrase, never seconds: inside a module write `const S = "<scene>"` and cue `S + "|distinctive
  words"` or `S + "#n"` (sentence n, from 0). Cue matching is case-insensitive substring, first match in the scene,
  so use distinctive multi-word phrases and check them against `build/timing.json`. Values appear on the words that
  say them, not earlier.
- Colour by kind, the same across the whole video (every builder uses this mapping): {{COLOURS}}. Verdict colours are
  for verdicts only: good/✓ = the right choice or the fix, bad/✕ = the mistake or an error, warn = caution. Never use
  green as a plain highlight, never accent as plain emphasis. Short arrow labels (1-3 words). Flow edges draw an
  arrowhead at `to`, so `from` → `to` must be the real direction (who calls whom, who writes to what); never skip a hop
  the document has.
- Code cards (K.code): `lang` "fsharp", "csharp" (default), "javascript" (also for TypeScript), "python", "json", "yaml", "bash", "sql" or "plain"
  (use plain for languages the kit cannot highlight). Show the real code with its REAL indentation, trimmed only by
  whole lines with each cut marked by a comment line; if a real line is too wide at 44 px use `font: 40` or `font: 36`
  rather than re-wrapping it. At most about 9 lines on screen. Glow only the line being spoken, accent only, with an
  `until`. Put the file path in the card `title`. Prefer a small diagram over code where the narration talks about
  results.
- Defined terms: when a scene defines a word ("aggregate: one consistency boundary"), write the word as
  `K.term("aggregate")` (and inline code as `K.mono("name")`), so terms stand out from their definitions everywhere.
- Concept scenes: draw the general idea first (e.g. two account boxes, each with its own event list), then the
  mapping onto this codebase's parts (each account box becomes an actor with a mailbox, keyed by its ID), reusing the
  same shapes later in the flow diagrams.
- Intuition scenes (a plain example before the code): draw the example with its real values as a small picture
  (input → function → output), and reuse the same picture's shapes when the code appears, so the viewer can map one
  onto the other.
- Diagrams of modules, calls and data: boxes for components (the file or module name in mono as the label or sub),
  arrows for calls or data flow in their real direction, a packet (`tone: "muted"`) travelling a flow when the
  narration follows a request through it; an arrow never appears before both its boxes.
- Call order (K.sequence): when the narration walks through an exchange step by step (who calls whom, then what comes
  back), draw a sequence diagram instead of a flow: one actor per component, in the order they first take part, each
  with the tone and icon of its kind; one message per call, labelled with the real method, command or event name, on
  the phrase that names it; `reply: true` for what comes back. Only calls the document cites, in the order the code
  makes them; at most 6 messages and about 4 actors per diagram, a longer exchange split across two scenes.
- The frame draws toasts and "Pause and think" countdowns in the band above y 120, the chapter cards and the recap
  cards (`*-why` and `*-recap` are not yours). Keep content inside x 60-1860, y 240-1000.
- Pause-and-think scenes: show the question's facts and the spoken question through the silence, but nothing that IS
  the answer (no answer text, no verdict colour, no highlight on the deciding line). Take a still INSIDE the silence.
- Leave room on screen: about 10-14 words at once outside code, 22 at most, with clear space between groups
  (crowded frames are as hard to follow as rushed talk); text at least 44 px; nothing overlaps or clips; labels
  fit their boxes; never open a scene on an empty stage; no stage holds only its heading for more than about 4 s.
  Nothing on screen for less than about 3 s. When two texts share a spot, each needs its own `until`.
- In-place changes: a DRAWING that changes state in place (a box gaining a label, a diagram gaining a node, a code card
  replaced by the same card with one more line) cross-fades: the old element gets `until: [cue, 0.35]` and BOTH old
  and new get `rise: 0` (K.code: `slide: 0`), because the kit applies the rise on fade-out too. TEXT replaced by
  DIFFERENT text in the same spot must not overlap: plain `until` on the replacement's cue, normal rise.
- The shared map (KIT.md, "The shared map"): the frame draws the chapter openers and the boundary of an `inside`
  scene; you do not. In the chapter that introduces the parts, show them with `K.map` and `reveal`, never a K.flow
  that looks like the map. In a scene with `"inside"` in script.json, draw only what is inside that part, keep the
  heading under about 60 characters, and show nothing before the scene's first sentence (the zoom is playing). A part
  of the map has the same tone and icon wherever your modules draw it.
- Kit notes: captions that replace each other need one K.lines/K.text call each, with `until`; K.code: leave out `w`;
  K.code is about 151 + 60 px per line tall and 26 px per character wide at 44 px; K.heading title+sub is one line
  (under ~75 characters); two K.heading calls in one scene overlap, use a text element for a second heading; K.flow
  node `x` is the box's left edge; when two pairs of edges leave one side of a box, move their ends with `fromPos` /
  `toPos` (never hidden anchor nodes); in a K.table give a cell its own `at` when its value is spoken later than its row.
- If a module fails to build (a cue that is not spoken, a JavaScript error), the page draws every element of it at once
  and the render prints "page error" or "build failed": always read the render output and look at your sheets.

**Check** with `node {{ENGINE}}/cli/Cv.js {{WS}} sheet <your keys>` (only your modules, keys as separate arguments) and
`node {{ENGINE}}/cli/Cv.js {{WS}} check --lesson {{WS}}/build/lesson.md` (other builders' missing modules are expected
errors; yours must produce none). Read every sheet image; use `stills <t>` for moments the sheet misses (always one
inside each think silence). Write ONLY your own module files, each `Kit.module("<key>", K => { ... })`; never edit
script.json, clip.html or other modules. Report briefly: what each scene shows, what you did not re-view after your
last edit, and any doubt about fidelity to the document or the code.
