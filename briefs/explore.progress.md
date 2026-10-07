You are writing the DOCUMENT for a narrated video about how a codebase CHANGED over a range of its history. The video
will say nothing that this document does not say, so it must be true, specific and grounded in the commits and the
code. Do not edit anything in the repository, and run only git commands that read (log, show, diff, blame, ls-tree).

**Repository:** {{REPO}}
**The range:** {{RANGE}}
**What the video is about:** {{SUBJECT}}
**Audience:** {{AUDIENCE}}. They follow the project; most do not read its code every day. Outcomes first, code second.
**Output:** {{WS}}/build/lesson.md

**The facts.** A program has already read the history and written {{HISTORY}} (and `history.json` beside it): the
commits of the range, its tags, the work per area, the files added, deleted and renamed, the most changed files, and
what was left out of the numbers. Read it in full first. Every number you write must be one of its numbers, quoted
exactly. Never count commits, files or lines yourself, and never estimate ("about a dozen").

**What to bring out** (the focus chosen for this video):
{{FOCUS}}

Goals file: {{GOALS}}.

Then read the range yourself. It starts at {{SINCE}} and ends at {{UNTIL}}; its commits are listed in the facts.
Open the commits that matter with
`git show <commit>`, compare the two ends with `git diff`, and read the code as it is at the end of the range. A
commit message says what its author meant; the diff says what happened. Where they differ, the diff is right.

**Structure** (Markdown, `##` sections; the video follows them as chapters):
1. `## Where it stood`: what the project was at the start of the range, in a few sentences, from the code at that
   commit (`git show <commit>:<path>`, `git ls-tree`).
2. `## At a glance`: the range and its totals, and where the work went by area. Every number from the facts.
3. One `##` section per THEME of change ({{CHAPTERS}} in all; the themes are the middle ones). A theme is something a
   person following the project would recognise: a feature, a fix that changed behaviour, a rework. Not a commit, not
   a folder. For each theme:
   - what the project does now that it did not before, in plain language;
   - the commits that did it;
   - the code as it is at the end of the range, at the one or two places that matter;
   - where behaviour changed, the code before and after (the same lines at both ends);
   - why, as the commit messages say it: always "the commit message says ...", never as your own statement.
   Leave out a theme that a later commit in the range undid: work that did not last has not shipped. If it is worth
   telling, tell it as tried and withdrawn.
4. `## In flight and at risk`: what the code shows as unfinished or fragile at the end of the range: markers added
   in the range (TODO, FIXME, a skipped test, a feature switched off), an area with much change and no change to its
   tests. Each with its evidence. These are observations, not verdicts: say what is there, not what it means about
   anyone.
5. `## Against the goals`, ONLY if the focus includes progress against goals: each goal of the goals file, quoted,
   and what the history shows for it: done, partly done, or nothing found, each with its commits. "Done" needs a diff
   that does it.
6. `## Who worked on what`, ONLY if the focus includes people (the facts then have a People section; if they have
   none, people are not part of this video and no name may appear anywhere in the document): by area, the names and
   commit counts exactly as the facts give them. No ranking, no total per person, no adjective about a person.
7. `## The map`: the 2 to 7 main parts of the system as it is at the end of the range, and how they connect. End
   with the two lists the video's map is drawn from: `Parts:` each with a short name (12 characters at most), its
   kind, the paths it covers, its status over the range (`new`: its paths did not exist at the start; `changed`:
   the facts show commits in its paths; `same`), and a citation; and `Connections:` each pair that talks, as
   `A -> B: verb`, in the direction the call or the data really goes, with a citation.

**Citations** (the video inherits every mistake you make):
- A claim about the code ends with `(path:lines)`, at the end of the range unless you write `(path:lines @ <commit>)`.
- A claim about what changed ends with its commits: `(commit 60739ec)` or `(commits 60739ec, 87279a0)`.
- A number ends with `(history)`.
- A reason is attributed: "the commit message says ...".
- A claim you inferred rather than read is marked `(inferred)`; prefer reading until you can cite.

The other rules of a teaching document apply as they are written in `{{WS}}/build/brief-explore-base.txt` under
"Rules": code blocks verbatim with a caption line, names exactly as the code has them, plain language, a `> Note:`
for anything ambiguous, no secrets. Its "Structure" does not apply; this one does. About {{DOC}} in total.

When done, report: the sections with their line ranges, the themes you chose and what you left out and why, anything
in the range that was undone later, every `(inferred)` claim and `> Note:`, anything you redacted, and any number you
wanted and the facts did not have.
