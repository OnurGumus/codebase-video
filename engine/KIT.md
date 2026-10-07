# Stage kit: building video modules

Reference for whoever writes the visuals of a video. A working example of every component is
`kit/gallery/` (its `*.js` files are short; read the one you need). The code is F# in `src/Kit/` (`Kit.fs` the
components, `Stage.fs` the timing, `Frame.fs` the long-video frame), compiled to `engine/web/`; `clip.html` loads
`build/timing.js`, then `/engine/web/Main.js`, which sets `window.Stage` and `window.Kit` and runs the frame. Module
files stay plain JavaScript.

## Text styles

- `K.term("aggregate")`: a defined term (bold, in the term colour), e.g. `K.term("aggregate") + ": one consistency
  boundary"`. Use it rather than writing the span by hand (quotes inside quoted strings break a module).
- `K.mono("EventAction")`: inline code in a caption.
- F# code cards colour types (after `:` and inside `<…>`), constructor calls (`PersistEvent(…)`), union cases in
  patterns and values (`Some`, `Open`) and keywords differently; a property after `.` stays ink.

## A module

A long video is `templates/long/clip.html` (copied unchanged) plus one file per module. A module owns
the scenes whose ids start with its key: `g1-vague`, `g1-signals` belong to `g1`, drawn by `g1.js`:

```js
Kit.module("g1", (K) => {
  K.heading("What gets graded", { sub: "judgment", at: "g1-vague", subAt: "g1-signals|judgment" });
  K.lines([
    { html: "the problem is <em>deliberately vague</em>", at: "g1-vague|deliberately vague" },
    { html: "several good answers exist", at: "g1-vague|several good" },
  ], { x: 60, y: 260, dim: true });
});
```

The frame shows the module only while its scenes play, fades it in and out, and adds the chapter card,
chapter label and progress bar. Nothing else is needed: no render function, no styles.

## Times: always from the narration

Every `at`, `until`, `toneAt`, `strikeAt`, `noteAt`, `resultAt`, `from` takes a time spec:

| Spec | Meaning |
|---|---|
| `"g1-vague"` | when the scene's first sentence starts |
| `"g1-vague#2"` | when sentence 2 starts, counting from 0 (the third sentence) |
| `"g1-vague\|deliberately vague"` | when that phrase is spoken |
| `"g1-vague\|the\|2"` | the 2nd time "the" is spoken |
| `"g1-vague\|vague$"` | when the phrase *finishes* |
| `["g1-vague\|vague", 0.3]` | 0.3 s after it |
| `12.5` | seconds (avoid: breaks when a line is re-voiced) |

Phrases are matched on what is **spoken** first (so `"a2-math|thirty-five thousand"` and `"a2-math|35,000"`
both work), case-insensitively. Put an element on the word that names it, a verdict colour on the word
that gives the verdict, never earlier. `check` fails on any phrase that is not in the narration.

## One scene at a time

A module usually has several scenes. Build each inside `K.scene(id, () => { ... })`: its components
then appear when that scene starts (unless given `at`) and leave when it ends (unless given `until`),
so the first scene's text never piles up under the second's. Without it, a component with no `until`
stays until the module leaves the screen.

```js
Kit.module("mk1", (K) => {
  K.scene("mk1-queue", () => {
    K.heading("Mistake 1: treating Kafka as a queue");
    K.lines([{ html: "no visibility timeout", at: "mk1-queue|visibility timeout" }], { x: 60, y: 260 });
  });
  K.scene("mk1-db", () => { K.heading("Mistake 2: treating Kafka as a database"); });
});
```

## The shared map

A long video can declare one map of the system's main parts, once, in `script.json`. The frame then draws it for
you in two places, always the same picture, so the viewer keeps their bearings from chapter to chapter.

```json
"map": {
  "kinds": { "entry": { "tone": "accent", "icon": "▶" }, "store": { "tone": "cyan", "icon": "🗄️" } },
  "parts": [ { "id": "endpoint", "label": "Endpoint", "kind": "entry", "col": 0, "row": 1 },
             { "id": "journal",  "label": "Journal",  "kind": "store", "col": 1, "row": 1 } ],
  "edges": [ { "from": "endpoint", "to": "journal", "label": "appends" } ]
}
```

- `kinds` is the video's colour-by-kind table in a form the kit can read: a tone and an icon for each kind of part.
- `parts`: 2 to 7 of them, each with a `label` of at most 12 characters and a cell on a grid of 4 columns (`col` 0-3)
  by 3 rows (`row` 0-2). Lay the main flow out left to right along one row; put what it branches to above and below.
- A part may carry `"badge"`: one word of at most 10 characters ("new", "changed"), drawn beside its box wherever
  the map is shown. It is for a video about how the code changed.
- `edges`: `from` → `to` is the real direction, `label` a verb. An arrow between two parts of one row or one column
  is straight. An arrow that changes row and column makes one turn: it leaves its box from the top or bottom and
  arrives level, or, when a part is in that way, leaves level and arrives from above or below; `check` warns when
  a part is in both ways. Arrows that meet on one side of a box are spread along it. The verb is drawn over an
  arrow's level stretch when it fits (about 6 characters between neighbouring boxes of a row, about 8 on an arrow
  with a turn between neighbouring columns), or beside an upright arrow; the render output names each label that
  was left out. Keep verbs to one short word.

**A chapter's path.** On a chapter's bridge scene, `"path": ["endpoint", "journal"]` replaces the plain chapter card
with the map: the chapter's number and title at the top, every part dim, and the path's parts and edges lighting up
in order while the bridge line is spoken. Consecutive parts of a path must be joined by an edge. A bridge scene
without `path` keeps the plain card.

**Inside a part.** On a content scene, `"inside": "journal"` draws the scene inside that part. Over the scene's lead
the map returns, the part's box grows into a dashed boundary around the content area, and its icon and label become a
tag at the top right. Consecutive scenes inside the same part are one visit: the boundary holds for all of them, and
shrinks back to the box at the end of the last. The module draws its content exactly as usual and never draws a
boundary of its own.

- The first scene of a visit needs `"lead": 1.4` (1.2 at least): nothing of the module is shown during the zoom.
- The last scene needs `"pad": 1.8` (`pad` plus `hold` of 1.5 s at least), for the way back out: the content fades,
  the boundary shrinks to the box, and the whole map is held for a moment before the next scene.
- In an `inside` scene keep the heading under about 60 characters, so the row's right end is free for the tag.
- Not on a bridge or recap scene. A think scene may be inside.

**In a module.** `K.map({ reveal: { endpoint: "m3-parts|the endpoint", journal: "m3-parts|a journal" } })` draws the
same map inside a module, for the chapter that introduces it: a part named in `reveal` appears on its cue, the others
with the component, an edge once both its parts have. It takes `at`, `until` and `in`, and nothing about positions,
labels or colours. Never redraw the map by hand with `K.flow`.

**A video about change.** With `"kind": "progress"` at the top of `script.json`, a chapter is a theme and its
`path` is the parts that theme touched: they need not be joined by edges, and they light up together, with no arrow
lit.

`check` verifies the map, every path and every visit before anything is drawn.

## Components

All take `at` (appear), `until` (leave), `in: group` (parent). Positions are stage pixels on 1920x1080;
stay inside x 60-1860, y 120-1010 (the frame owns the rest). Tones: `accent violet pink cyan` for kinds of
thing, `good bad warn` for verdicts, `muted ink` for text.

- `K.heading(text, { sub, at, subAt })` - top left (60, 130). Title and sub are one line that never wraps:
  keep title plus sub under about 75 characters (check the sheet).
- `K.text(html, { size: title|big|text|small|mono|label, x, y, w, align, tone, toneAt })`
- `K.lines(items, { x, y, w, gap, dim, size })` - item: string or `{ html, at, note, noteAt, tone, toneAt,
  strikeAt, bullet, mono }`. `dim` fades earlier lines as each new one arrives. Lines stack: a row not yet
  shown still keeps its space, so captions that should *replace* each other in one spot need one `K.lines`
  call each at the same x/y, each with an `until` where the next one starts.
- `K.chips(items, { x, y, w, gap })` - item: `{ text, at, tone, toneAt }`. `text` is plain text (escaped), so write
  emoji and symbols as literal characters, not HTML entities.
- `K.table({ cols, widths, rows: [{ cells, at, tone, toneAt }], focus, headerAt, x, y, w })` - `focus` The card appears at `at`, else at `headerAt`, else with its first row. `focus` follows row index and `at` order, so do not use it when rows are narrated out of order.
  highlights the row being spoken.
  A cell is a string, which appears with its row, or `{ html, at, until, tone, toneAt }` (`text` instead of `html`
  for plain text, escaped like a chip): such a cell waits inside its row for its own `at`, so a number is not on
  screen before it is spoken. A cell is never seen before its row; its `tone` wins over the row's.
  `["Small", { html: "1,000", at: "tb-cells|one thousand" }, { text: "$5", at: "tb-cells|five dollars", tone: "good" }]`
- `K.bars({ max, line: { value, label }, rows: [{ label, sub, value, at, steps: [{ value, at }], tone,
  toneAt, format }], x, y, w, gap })` - bars on one scale, a dashed capacity tick, values that count and move.
- `K.timeline({ total, segments: [{ label, value, show, at, tone, toneAt }], sum: { text, at }, x, y, w })`
- `K.flow({ nodes: { id: { label, sub, icon, x, y, w, at, tone, fill, toneAt, dimAt, until, rise } }, edges: [{ from, to,
  at, label, dashed, tone, toneAt, arrow, fromPos, toPos }], packets: [{ from, to, at, dur, label, tone, fadeAt, lift,
  fromPos, toPos }] })` - boxes
  (`icon`: an emoji before the label; `fill: true` tints the box in its tone), arrows drawn on their word with an
  optional short `label` (a verb: "writes", "fetches"), packets that travel (`fadeAt: 0.6` = lost 60% of the way;
  `lift` offsets a return lane). Every edge gets an arrowhead at `to` (`arrow: "both"` or `"none"` to change it),
  so `from` → `to` must be the real direction: who sends, writes or calls whom. Label the edge with that verb.
  Two edges between the same two boxes (e.g. data one way, demand or an ack the other) are drawn in two lanes
  40 px apart, with each label on its own side, so draw both instead of one long edge that jumps over a box.
  An edge starts and ends at the centre of the box side it meets. `fromPos` and `toPos` move an end along that
  side: a fraction from 0 to 1, left to right on a top or bottom side, top to bottom on a left or right side;
  0.5, or leaving it out, is the centre. They are positions, not times. Use them when two pairs of edges leave
  the same side of one box and would cross or stack their labels: `{ from: "saga", to: "journal", fromPos: 0.25 }`
  and `{ from: "saga", to: "pubsub", fromPos: 0.75 }` leave the saga's bottom side a quarter and three quarters
  of the way along. The kit still picks the side, from the two boxes' centres. The 40 px lanes are added on top,
  so for a pair to stay parallel the edge back swaps the two values (`{ from: "journal", to: "saga", toPos: 0.25 }`).
  Stay between about 0.15 and 0.85, clear of the rounded corners. Between two boxes of different shapes placed
  diagonally, the edge out and the edge back can pick different sides (as they always could): read the sheet.
  A packet takes the same two fields, to travel beside such an edge. Do not add hidden nodes to act as anchors.
  A node or edge with no `until` leaves with the flow, at the same rate as text beside it; give one its own
  `until` only to remove it earlier.
- `K.sequence({ actors: [{ id, label, icon, tone, fill, toneAt, at }], messages: [{ from, to, label, at, reply, tone,
  toneAt }], x, y, w, gap, dim })` - a sequence diagram: who calls whom, in what order. Use it when the narration
  walks through an exchange step by step; use `K.flow` when it describes how parts are connected. Actors stand in a
  row across `w` (default 1800 from x 60), each over a dashed lifeline, in array order; an actor appears with the
  diagram, or on its own `at`. Messages are the rows below, top to bottom in array order, 112 px apart (`gap`): each
  arrow is drawn from `from`'s lifeline to `to`'s on its `at`, with its `label` above it (HTML, like a flow edge's:
  the real method, command or event name, short). `reply: true` dashes the arrow and mutes its label, for a return
  value or an ack. `from` equal to `to` is a call to self, drawn as a small loop beside the lifeline. `dim: true`
  fades each message as the next one arrives. A message has no `until`: it leaves with the diagram.
  Time runs down, so list messages in the order they are spoken; the build fails on a message timed before the one
  above it, on a message that names an actor not in `actors`, and on a diagram that ends below y 1000. Room to plan
  around: 6 messages at the default `y: 240`, and about 4 actors; with 4 actors a label between neighbours has
  about 400 px (some 16 characters). Split a longer exchange across two scenes, repeating the actors.
  No activation bars, notes or `alt` / `loop` frames: say those in the narration, or show the branch as its own diagram.
- `K.map({ reveal: { partId: at }, at, until })` - the video's shared map, see "The shared map" above.
- `K.code({ title, lines, lang, glow: [{ line, from, until, tone }], x, y })` - syntax-highlighted
  (`lang`: "csharp" default, "fsharp", "javascript" (also for TypeScript), "python" (also for Bazel BUILD files), "nix", "dockerfile", "sql", "json", "yaml", "bash", "plain"); `glow` lights a line's background.
  Leave out `w`: a width narrower than the longest line does not wrap or clip, the line runs past the card.
  Two cards side by side rarely fit; show them one after the other. Size to plan around: about 151 + 60 px per line
  tall, and about 26 px per character of the longest line wide.
- `K.board({ title, rows: [{ label, text, at, dur, result, resultAt, dimAt }], x, y, w })` - typed working.
- `K.steps(labels, { ats, x, y })` - a numbered strip; the current step is lit.
- `K.counter({ from, to, at, dur, format, tone, toneAt, x, y })`
- `K.group({ at, until })` - a container; pass `{ in: grp }` to fade several components together.
- `K.custom(buildFn, renderFn)` - anything else, drawn in the same pass: `renderFn(t, el)` must be a pure
  function of t (no timers, transitions, Date or state kept between calls).

## Toasts

Small pop-up badges that flag a moment the narration flags. The kinds are fixed, so a mark means the
same thing all video long:

| kind | badge | use it when the narration says… |
|---|---|---|
| `idea` | 💡 Key idea | the point to take away |
| `tricky` | 🤔 The tricky part | here's where it gets subtle |
| `remember` | 🧠 Remember | a callback to an earlier chapter |
| `careful` | ⚠️ Be careful | a trap to avoid |
| `mistake` | 🚫 Common mistake | the source document's own "Common Mistake" |
| `surprise` | 😮 Surprise | something the source document frames as counterintuitive |
| `remark` | 💬 Note | an aside |
| `question` | 💭 Ask yourself (also the "Pause and think" badge; ❓ rendered red, a verdict colour) | a question put to the viewer |
| `tip` | 🔧 Pro tip | the source document's own "Pro Tip" |

In a long video, put them on scenes in `script.json`; the frame draws them top right, above the
content, on the phrase: `"toasts": [{"kind": "tricky", "at": "the tricky part"}]` (optional `"text"`
of about four words, `"dur"` in seconds, default 3.2; `"at": "#2"` for sentence 2). From a module:
`K.toast("idea", { at: "g1-x|the key", text: "Queues pop, logs point", x, y })`. About one a minute,
never two within 6 s (`check` warns), and only where the words say so. The gallery's last chapter
shows every kind.

## Breathing room

A dense video tires the viewer, so give it rests. The first long videos talked 90% of the time, with
nearly two minutes at a stretch and no real pause.

- `[pause]` / `[pause 2]` after a sentence in `say`: silence (1.5 s by default) so a key point lands.
- `[rest]` / `[rest 0.5]` INSIDE a sentence, between the items of a spoken list: a short silence (0.35 s by default,
  0.15 to 1) so the items do not run together: `"a client, [rest] a service, [rest] and a database."` Keep each
  comma before its rest. The sentence stays one caption. Each stretch between rests is voiced on its own, so a cue
  phrase must lie inside one stretch (`"s|a service"`, not `"s|a client, a service"`); `check` says so. Use it in
  every list of three or more things, above all when each item makes something appear.
- `[think]` / `[think 10]` after a question: silence (8 s by default) with a "Pause and think" countdown
  in the top band. The answer follows in the next sentence. About one per chapter.
- A **recap scene** closes each chapter: id `<key>-recap`, `"recap": ["line", "line", "line"]` (2-3
  short lines, the chapter's takeaways), a `say` that speaks them one sentence per line, and
  `"hold": 2.5` for a quiet moment. The frame draws a full "So far" card; it needs no module file.

`check` prints talk share and the longest stretch without a 1.5 s pause, and warns over 45 s, over
82% talk, and for a chapter with neither a recap nor a think. Aim for 72-78% talk: when a video runs
long, cut a fact, not a pause.

## Colour by kind

An all-blue frame reads as one undifferentiated thing (the user's feedback on the first long videos). Give each
*kind of thing* in a video its own colour and icon, the same in every chapter, and keep the verdict colours for
verdicts only. Tones for kinds: `accent` (blue), `violet`, `pink`, `cyan`; verdicts: `good`, `bad`, `warn`.
Decide the mapping once per video (the script writer lists it in the builder brief), for example for Kafka:
producer violet 📤, consumer cyan 📥, broker accent 🖥️, key pink 🔑, topic 📚, partitions neutral. A short label
on an arrow ("writes", "fetches", "hash % 6") often says more than a caption under the diagram.

## Rules that audits enforce

- A verdict is shown when it is spoken, text included: put the outcome in a `note` with `noteAt`, or a
  `tone` with `toneAt`, on the verdict's word. A trace the narration walks through must not show its
  answers before the voice gives them.
- Keep one meaning per mark for the whole video: ✕ and red mean "wrong belief" or "bad outcome", ✓ and
  green "right" or "good outcome". Facts and consequences get a neutral bullet (•, a number) or warn.
  A pitfall that "works" (acknowledged with one copy) is warn, not green.
- When a new statement replaces an old one in the same place, end the old one (`until`) at the new
  one's `at`, or two contradicting lines sit on top of each other.
- Chips escape their text: write → and ≤ as characters, not `&rarr;`. Headings, lines and `text` take
  HTML: write `&lt;T&gt;` for a literal `<T>`. Code in `K.code` must compile as shown (braces included).

- Every label, number and example traces to the source document (build/lesson.md) and agrees with the narration at that moment.
- About 12 words on screen at once; one focal change at a time; things appear as they are named.
- Text is 44px or larger (the kit's sizes all are). Nothing overlaps or leaves the safe area.
- Open each module by showing its subject; the viewer should always know where they are.
- When the narration defines a term, a short muted definition on screen helps.

## Checking your work

```
node engine/cli/Cv.js <clip> sheet g1 g2          # labelled stills for your modules only: build/sheet-g1-g2-<n>.png
node engine/cli/Cv.js <clip> stills 214.5 215.2   # exact moments (mid-transition)
node engine/cli/Cv.js <clip> check --lesson <lesson.md>     # cue phrases, script problems, numbers not in the source document
```

Read every sheet. Never run `sheet` without module keys while others build in the same clip.
