**This is a PROGRESS video**: it shows how the codebase changed over a range of its history, for people who follow
the project and do not read its code every day. The document is about commits as well as code. In addition to
everything else in this brief:
- Numbers (commits, files, lines, days) come from the document, which quotes `build/history.md`. Show a number only
  as the document gives it: never add, round or compare numbers yourself. A number never counts up on screen: the
  numbers it would pass through are not facts. So totals are a K.text (not a K.counter), appearing on their word;
  work per area is K.bars on one scale, one bar per area, in the order the document gives, each row with a `format`
  that shows only the final value (`format: (v) => (v > 10.99 ? "11" : "")`); the tags of the range are a
  K.timeline.
- Whatever the document says is on a branch and not yet published carries a quiet mark saying so wherever it is
  shown, a version number included; nothing unpublished appears beside the word "published", "released" or "shipped".
- The map carries the word "new" or "changed" above the parts that are (the frame draws these badges from
  script.json). Show the whole map once with `K.map`, near the start. A theme chapter opens on the map with that
  theme's parts lit together; the frame draws that too.
- A theme first shows what the project does now (its output, a flow, a sequence), then the code. Where the document
  gives a before and after, show them as two K.code cards in the same place, the old one first, cross-fading
  (`slide: 0` on both), each titled with its file and the commit it is from. Glow the lines that differ.
- Goals, if the video has that chapter: a K.table, one row per goal, its status appearing on the word that says it.
  Here, and only here, verdict colours mark status: good for done, warn for partly done, muted for nothing found.
- People, if the video has that chapter: a K.table of areas and names. No bars, counters or sizes per person, no
  ordering by count, and no name anywhere outside that chapter. If the document has no such section, no person's
  name may appear on screen at all, including in code-card titles and commit lines.
- A commit is shown as its short id in mono. Its message, when quoted, is in quotation marks.
