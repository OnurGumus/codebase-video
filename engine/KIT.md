# Stage kit: building video modules

Reference for whoever writes the visuals of a video. A working example of every component is
`kit/gallery/` (its `*.js` files are short; read the one you need). The code is `stage-kit.js`.

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
that gives the verdict, never earlier. `check.py` fails on any phrase that is not in the narration.

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
- `K.bars({ max, line: { value, label }, rows: [{ label, sub, value, at, steps: [{ value, at }], tone,
  toneAt, format }], x, y, w, gap })` - bars on one scale, a dashed capacity tick, values that count and move.
- `K.timeline({ total, segments: [{ label, value, show, at, tone, toneAt }], sum: { text, at }, x, y, w })`
- `K.flow({ nodes: { id: { label, sub, icon, x, y, w, at, tone, fill, toneAt, dimAt } }, edges: [{ from, to,
  at, label, dashed, tone, toneAt, arrow }], packets: [{ from, to, at, dur, label, tone, fadeAt, lift }] })` - boxes
  (`icon`: an emoji before the label; `fill: true` tints the box in its tone), arrows drawn on their word with an
  optional short `label` (a verb: "writes", "fetches"), packets that travel (`fadeAt: 0.6` = lost 60% of the way;
  `lift` offsets a return lane). Every edge gets an arrowhead at `to` (`arrow: "both"` or `"none"` to change it),
  so `from` → `to` must be the real direction: who sends, writes or calls whom. Label the edge with that verb.
  Two edges between the same two boxes (e.g. data one way, demand or an ack the other) are drawn in two lanes
  40 px apart, with each label on its own side, so draw both instead of one long edge that jumps over a box.
- `K.code({ title, lines, lang, glow: [{ line, from, until, tone }], x, y })` - syntax-highlighted
  (`lang`: "csharp" default, "javascript", "python" (also for Bazel BUILD files), "nix", "dockerfile", "sql", "json", "yaml", "bash", "plain"); `glow` lights a line's background.
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
- `[think]` / `[think 4]` after a question: silence (4 s by default) with a "Pause and think" countdown
  in the top band. The answer follows in the next sentence. About one per chapter.
- A **recap scene** closes each chapter: id `<key>-recap`, `"recap": ["line", "line", "line"]` (2-3
  short lines, the chapter's takeaways), a `say` that speaks them one sentence per line, and
  `"hold": 2.5` for a quiet moment. The frame draws a full "So far" card; it needs no module file.

`check` prints talk share and the longest stretch without a 1.5 s pause, and warns over 60 s, over
85% talk, and for a chapter with neither a recap nor a think. Aim for 75-80% talk.

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
build.sh <clip> sheet g1 g2          # labelled stills for your modules only: build/sheet-g1-g2-<n>.png
build.sh <clip> stills 214.5 215.2   # exact moments (mid-transition)
build.sh <clip> check --lesson <lesson.md>     # cue phrases, script problems, numbers not in the source document
```

Read every sheet. Never run `sheet` without module keys while others build in the same clip.
