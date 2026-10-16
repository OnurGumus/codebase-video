# A progress video

**You get** a short video of what changed in a project between a past point and now: what shipped, where the work
went and what is still open. It is for someone who follows the project but does not read its code every day.

## Steps

1. **Ask**, with where to start: a tag, a commit or a date.

   ```
   /codebase-video a progress video since v1.4.0
   ```

2. **Answer a few questions**, each with a default: where the range starts (where the last progress video ended,
   else the latest tag, else 30 days back), what to bring out (below), the length (`short`, or `tour`), and a goals
   file if you want progress against goals.
3. **Let it work.** A program reads the history of the range first, and every number in the video is read from git.
   The checker compares each claim with the code that changed, not with the commit message.
4. **Watch it**, with its report, which names the range it covers.

The next progress video of the same project starts where this one ended.

## What it can bring out

| Focus | What it shows |
|---|---|
| `shipped` | what is new for users (on by default) |
| `effort` | where the work went (on by default) |
| `goals` | progress against a goals or roadmap file you give it |
| `people` | who committed in which area, and how many commits |

`people` is off unless you ask for it by name. Without it, no one is named anywhere: not in the document, the
narration or on screen. With it, there is still no ranking, no totals per person and no judgment.

## Tips

- The video reports what changed and what the commit messages claim. It does not judge whether the team is on track,
  unless you give it goals to compare with.
- The project needs its full history from the start of the range; a shallow clone stops with a message.
- To leave paths out of the numbers (lock files and generated files already are), say so, or pass `--ignore "<glob>"`.
- To make one on every release or every week, see [Run it from CI](ci.md).
