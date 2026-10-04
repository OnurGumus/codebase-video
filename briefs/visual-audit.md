You are auditing ONE part of a narrated video that teaches a codebase. Do not edit any file. You may render extra stills
with `node {{ENGINE}}/cli/Cv.js {{WS}} stills <t...>` and sheets with `node {{ENGINE}}/cli/Cv.js {{WS}} sheet <module keys>`.

The video folder is `{{WS}}/`. The teaching document is `build/lesson.md` ("{{SUBJECT}}", {{LINES}} lines), written from
the repository {{REPO}} and fact-checked; read it in full, since nothing on screen may contradict it, and open the cited
code in the repository whenever a code card or diagram depends on it. The narration (`script.json`) was already audited;
your focus is what is ON SCREEN and how it lines up with the voice, though report any narration error you find.

Read your scenes in `script.json`, your module files, the frame (`clip.html`: title card, chapter cards, toasts and
"Pause and think" countdowns in the top band, recap cards), the timing (`build/timing.json`), `{{ENGINE}}/KIT.md`, and
look at every still in your sheet set. The black label bar on each sheet still hides the top ~50 px; that is labelling.

Find:
1. any on-screen label, number, code line or claim that the document or the code does not support; quote both;
2. code that is not the repository's (beyond trimming by whole lines with marked cuts), re-indented, renamed, or that
   would not parse as shown;
3. visuals that disagree with the narration at the same moment (wrong value, arrow the wrong way, label on the wrong
   box, something shown before its words: compute cue times with the kit's own interpolation, do not guess),
   especially an answer visible during a pause-and-think silence;
4. colour misuse: colour by kind ({{COLOURS}}; code glows accent only) and verdict colours only for verdicts;
5. text a phone viewer cannot read, overlaps, clipped text, labels overflowing boxes, more than ~25 words at once,
   anything on screen for under ~3 s, a stage holding only its heading for over ~4 s;
6. a term shown before the video has explained it;
7. a visual gag that adds or bends a claim;
8. diagrams that teach a false structure: arrow directions against who calls or writes to whom in the code, a missing
   hop, a dependency the code does not have;
9. in-place swaps that blink or jump (a drawing must cross-fade with rise 0 on both elements; text replaced by different
   text must not overlap), and any module drawn all at once (its build failed: look for "page error" in render output).
{{VISUAL}}

For each: time or scene, the exact on-screen text, what is wrong, the fix (file, line, new value). Rank must-fix /
should-fix / nit. Also list what you checked and found correct, and which frames you did not look at. Do not pad.
