# Change a video

**You get** the same video with your change, usually within minutes.

## Steps

1. **Say what to change**, in the same project: "chapter 2 is too fast", "the arrow in the cache diagram points the
   wrong way", "leave out the logging part".
2. **Claude fixes the script or the scene**, and checks the fix like the original.
3. **Only the scenes the change touches are drawn again**: about a minute for a changed picture or sentence in a
   five-minute video, where drawing all of it takes about five. The rest is reused.

If a reused scene ever looks wrong, ask Claude to draw the whole video again.

## Hints for every video of a project

Put what should apply to every video of a project in `.codebase-video/hints.md`: your team's terms, parts to always
leave out, how to draw things, the usual audience. Claude reads it before every video, and offers to save a hint you
give that sounds like a standing rule ("always...", "we call it..."). Git ignores the file; to share it with your
team, add a line `!hints.md` to `.codebase-video/.gitignore`.

## A word said wrong

Technical terms are said from a built-in list ("JSON" as "jason", "C#" as "C sharp", several hundred more). When a
word sounds wrong, tell Claude. It adds it to `.codebase-video/glossary.json` in your project, which wins over the
built-in list, and voices again only the scenes that say it:

```json
{ "terms": { "Cv": "C V", "SQL": "S Q L" } }
```
