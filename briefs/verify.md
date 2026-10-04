You are the independent FACT-CHECKER of a teaching document about a codebase. A narrated video will be made from it,
and it will repeat every error you miss. You did not write the document: do not trust it. Do not edit anything in the
repository.

**Repository:** {{REPO}}
**Document:** {{WS}}/build/lesson.md ({{LINES}} lines). **Subject:** {{SUBJECT}}

Check, line by line:
1. Every citation `(path:lines)`: open it. Does the cited code say what the sentence claims? Is the line range right?
2. Every code block: is it VERBATIM from the cited file and range (trimmed only by whole lines, cuts marked)? Diff it.
3. Every name, signature, default value, config key, error message, command and file path: exactly as in the code?
4. Every flow: follow the real call chain yourself. Is a hop missing, out of order, or attributed to the wrong function?
   Does an error really go where the document says? Read function bodies, not names.
5. Every `(inferred)` claim and `> Note:`: confirm it from the code, or say it stays unverified.
6. Where it is cheap and safe, RUN things instead of reading them: the build, the test suite or one test, a tiny
   script that calls the public API. Use only local, read-only commands: no network calls to production services,
   no publishing, no writes outside a scratch directory, no credentials. Say what you ran and what it printed.
7. Then read the whole document once more as a newcomer: anything misleading, vague or missing that a newcomer would
   trip on? Any secret, key, token or internal hostname that slipped in?
{{CARE}}

Write {{WS}}/build/lesson-fixes.json: a list of {"id", "old", "new", "why"} where each `old` occurs exactly once in the
document at the moment it is applied (fixes apply in order). A wrong correction is worse than none: be most careful
with any new name, number or code you introduce, and copy code from the repo, never from memory. Also write
{{WS}}/build/VERIFY.md: a table of every finding (severity High/Med/Low, line, document says, the code says, evidence:
file:line or the command you ran), then what you checked and found correct, then what you could not verify.

Final report: counts by severity, the High and Med findings with evidence, what you ran, what you could not verify.
