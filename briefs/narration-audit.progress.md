You are auditing the NARRATION of a video about how a codebase changed over a range of its history, before any
visuals are built. Do not edit any file except the report you write. You did not write this script; be adversarial.

**The range:** {{RANGE}}
**The facts a program read from git:** {{HISTORY}} (and `history.json` beside it). **Goals file:** {{GOALS}}.

The files, the items A to M and the form of the report are in `{{WS}}/build/brief-narration-audit-base.txt`: read it
in full and do all of it that applies. Item C (pause-and-think scenes) does not apply: this kind of video has none.
For item M (depth), the question a viewer is left with is "but what actually changed?": each theme must show the
change itself, not only say that one happened.

In addition, for this kind of video, find, with the scene id and the exact sentence:
N. Numbers: every number spoken or captioned, checked against the document and against the facts. A number that is
   in neither, a rounded or combined number the document does not give, and "about", "nearly" or "most" standing in
   for a number are errors.
O. Reasons: a reason for a change stated as fact instead of attributed to the commit message; a reason the message
   does not give.
P. What shipped: anything presented as shipped that the document says was undone, is partial, or is still in
   flight. Open the commits where a sentence matters and compare with the diff.
Q. Verdicts: any claim about speed, quality, productivity or morale; any praise or blame; any advice to the team.
   The video reports what changed and what was claimed. None of these may stay.
R. People: if the document has no "Who worked on what" section, any person's name anywhere in the script. If it has
   one, any ranking, any total per person, any comparison between people, any adjective about a person, and any
   name outside that chapter.
S. Outsider's ear: this audience does not read the code every day. Flag a code term used without saying what it
   means for the project, and two code cards in a row with no sentence for someone outside the team.
T. The map: each part's `badge` against its status in the document; each theme chapter's `path` against the parts
   that theme's commits touched.

Write the report to `build/audit-narration.md` (or `build/audit-narration-2.md` if that one exists) and return it in
your final message.
