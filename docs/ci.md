# Making a video from CI

A progress video is a good fit for CI: on each release, or once a week, a job makes a short video of what changed
since the last one. A teaching video can be made the same way. This page says what the job needs and gives an
example for GitHub Actions.

The plugin's skill is what runs the agents, so the job runs Claude Code without a person (`claude -p`) and passes
the skill its flags. With `--yes` the skill never asks a question: it takes the default for everything not given and
lists those defaults in its report.

## What the job needs

- **The full history.** The video covers a range of commits, so the checkout must reach its start. Most CI systems
  fetch only the latest commit; the history step then stops with "this clone is shallow". In GitHub Actions use
  `fetch-depth: 0`.
- **Node.js 18 or later, ffmpeg** (with libx264, libvpx-vp9 and libopus) **and Chrome or Chromium.** The engine's
  `setup` step checks all three and says what is missing.
- **The tool home**, where the voice model and the browser driver are installed (about 800 MB, downloaded once).
  Keep it in the job's cache. The skill uses the plugin's own data folder for it,
  `~/.claude/plugins/data/codebase-video-codebase-video`.
- **Claude Code, the plugin, and a key.** See the next section.
- **Time and budget.** A short progress video is about 9 agent tasks and usually takes 20 to 40 minutes. Run it per
  release or on a schedule, not on every commit.

## The commands

These were checked against Claude Code 2.1.291 (`claude --help`, `claude plugin --help`) and its documentation at
<https://code.claude.com/docs>. Check the documentation for your version; flags change.

Install Claude Code ([setup](https://code.claude.com/docs/en/setup)):

```
curl -fsSL https://claude.ai/install.sh | bash
```

Give it a key ([authentication](https://code.claude.com/docs/en/authentication)): set `ANTHROPIC_API_KEY`, or
`CLAUDE_CODE_OAUTH_TOKEN` for a subscription (made once with `claude setup-token`).

Add this repository as a marketplace and install the plugin from it
([plugins](https://code.claude.com/docs/en/plugins)). The marketplace is named `codebase-video`, so the plugin's id
is `codebase-video@codebase-video`:

```
claude plugin marketplace add OnurGumus/codebase-video
claude plugin install codebase-video@codebase-video
```

Run the skill ([headless mode](https://code.claude.com/docs/en/headless)). `-p` runs one prompt and exits; a prompt
that starts with a skill's name runs that skill with the rest as its arguments:

```
claude -p "/codebase-video:codebase-video --kind progress --since v1.4.0 --focus shipped,effort --yes" \
  --permission-mode dontAsk \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep,Agent,Skill" \
  --max-budget-usd 40 \
  --output-format json
```

- The skill runs shell commands (node, git, ffmpeg), reads the repository, writes inside
  `.codebase-video/`, and starts other agents, so it needs those tools allowed. `dontAsk` refuses anything not on
  the list instead of waiting for an answer nobody will give. Narrow `Bash` to patterns such as `Bash(node *)`,
  `Bash(git *)` and `Bash(ffmpeg *)` if your policy asks for it, and test that the run still finishes.
- `--max-budget-usd` stops a run that goes wrong before it costs more than you meant.
- Leave `--since` out and the range starts where this repository's last progress video ended, which is recorded in
  `.codebase-video/progress.json`. Keep that file between runs (commit it, or cache it) for a job that runs on a
  schedule; the folder's own `.gitignore` ignores everything, so add a line `!progress.json` to commit it.

There is also an official GitHub Action, `anthropics/claude-code-action`, which takes a prompt and can install
plugins ([GitHub Actions](https://code.claude.com/docs/en/github-actions)). Its inputs are described there; the
workflow below uses the command line instead, because that is what was checked.

## What comes out

Everything is in `.codebase-video/<name>/out/`:

- `<name>.mp4` (and `.webm`), the poster image, captions and chapter markers;
- `REPORT.md`: the range, each setting and whether it was given or a default, the chapters, what the audits found
  and fixed, and what was left unverified.

The checked document the video was made from is `.codebase-video/<name>/build/lesson.md`, and the facts read from
git are `build/history.md` beside it.

**Read `REPORT.md` before the video goes to anyone.** Interactively, a person sees the audits' findings as they
come. In CI nobody does; the audits still run and fix what they find, and the report is where the rest is written
down.

## An example workflow

```yaml
name: progress video
on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      since:
        description: "Where the range starts (a tag, a commit or a date). Empty: where the last video ended."
        required: false

jobs:
  video:
    runs-on: ubuntu-latest
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # the whole history: the video covers a range of commits

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: ffmpeg and Chrome
        run: |
          sudo apt-get update
          sudo apt-get install -y ffmpeg
          google-chrome --version   # ubuntu-latest has Chrome; install Chromium here if your runner does not

      - name: The tool home (voice model, browser driver)
        uses: actions/cache@v4
        with:
          path: ~/.claude/plugins/data/codebase-video-codebase-video
          key: codebase-video-home-v1

      - name: Claude Code and the plugin
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          curl -fsSL https://claude.ai/install.sh | bash
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
          export PATH="$HOME/.local/bin:$PATH"
          claude plugin marketplace add OnurGumus/codebase-video
          claude plugin install codebase-video@codebase-video

      - name: Make the video
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          SINCE="${{ github.event.inputs.since }}"
          claude -p "/codebase-video:codebase-video --kind progress ${SINCE:+--since $SINCE} --focus shipped,effort --length short --yes" \
            --permission-mode dontAsk \
            --allowedTools "Bash,Read,Write,Edit,Glob,Grep,Agent,Skill" \
            --max-budget-usd 40 \
            --output-format json | tee claude-run.json

      - name: Keep the video and its report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: progress-video
          path: |
            .codebase-video/*/out/
            .codebase-video/*/build/lesson.md
            .codebase-video/*/build/history.md
            claude-run.json
```

This workflow has not been run on a hosted runner by the plugin's author. The commands in it were each checked
locally; treat the first run as a test, and expect to adjust the tool installation for your runner.

## When it stops

With `--yes` the run stops, with a message, instead of asking:

| Message starts | What to do |
|---|---|
| `history: this clone is shallow` | fetch the full history (`fetch-depth: 0`) |
| `history: no commits between` | the range is empty: nothing changed since the last video, or `--since` is too late |
| `history: "since" is ...` | the tag, commit or date does not exist in this repository |
| `the focus "goals" needs "goals"` | pass `--goals <file>` or drop `goals` from `--focus` |
| a tool is missing | `setup` names it; install it in an earlier step |
