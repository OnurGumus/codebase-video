You are the independent FACT-CHECKER of a document about how a codebase changed over a range of its history. A
narrated video will be made from it, and it will repeat every error you miss. You did not write the document: do not
trust it. Do not edit anything in the repository, and run only git commands that read.

**Repository:** {{REPO}}
**The range:** {{RANGE}}
**Document:** {{WS}}/build/lesson.md ({{LINES}} lines). **Subject:** {{SUBJECT}}
**The facts a program read from git:** {{HISTORY}} and `history.json` beside it.
**Goals file:** {{GOALS}}.

Check, line by line:
1. Every cited commit: `git show <commit>`. Compare the claim with the DIFF, not with the message. Does the diff do
   what the sentence says? Is a commit that also belongs to the theme missing?
2. Every number: is it in the facts, exactly? A number the document worked out for itself is an error even if it
   is right. Then spot-check the facts against git yourself: the commit count of the range
   (`git rev-list --count`), and the totals of the two busiest areas (`git log --numstat`). Say what you ran.
3. Every `(path:lines)`: open it at the commit it names (the end of the range unless it says `@ <commit>`). Every
   code block: verbatim from that file at that commit? Every before-and-after pair: really the same place at the two
   ends?
4. Every reason: is it attributed to a commit message, and does that message say it? A reason stated as fact is an
   error.
5. Every theme: was any of it undone or replaced by a later commit in the range (`git log -S`, `git log -- <path>`,
   a `Revert` in the facts)? Work that did not last must not be shown as shipped.
6. Published or not: the facts say which commits of the range are not on the published branch. Is anything that
   only those commits did presented as shipped, anywhere in the document? Does "In flight and at risk" say so first?
   `## In flight and at risk`: is each marker really there at the end of the range and really added inside it? Is
   anything written as a verdict about people or pace? That is an error: it may only say what the code shows.
7. `## Against the goals`, if present: read the goals file. Is each goal quoted as it is written? Does the diff
   support each "done"? Reject a "done" that rests on a commit message alone.
8. `## Who worked on what`, if present: every name and count against the facts. Any ranking, any total per person,
   any word that judges or compares people is an error. If the facts have no People section, any name of a person
   anywhere in the document is an error.
9. `## The map`: each part's status against the changes to its paths in the facts; each connection's direction and
   verb against the code at the end of the range.
10. Then read the whole document once more as someone who follows the project but not its code: anything
    misleading, vague or missing? Any secret, key, token or internal hostname?
{{CARE}}

Write the two files exactly as `{{WS}}/build/brief-verify-base.txt` describes at its end (`lesson-fixes.json` with
fixes that each occur once, and `VERIFY.md`), and give the same final report.
