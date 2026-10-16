# Your first video

**You get** a narrated video that teaches a codebase, with captions and chapters, and a report of what was checked.

## Steps

1. **Ask.** Open Claude Code in your project and type `/codebase-video`. You can say what you want straight away:

   ```
   /codebase-video a tour of how a request reaches the database, for a new backend developer
   ```

2. **Answer a few questions.** Claude lists the project's core features and asks which belong in the video, then
   asks what you did not already say:
   - what to cover: the whole project, or one flow;
   - how long (below; a tour if you do not mind);
   - who will watch (a developer joining the team, if you do not mind);
   - what you are most curious about: that part goes deepest.

   A video never silently leaves out a core feature: Claude says which ones it skips.

3. **Let it work.** Claude writes a document about your code with the file and line behind every statement, has a
   fresh Claude check it, writes and checks the script, draws and checks the scenes, and renders the video. Keep the
   computer awake while it renders.

4. **Watch it.** Claude gives you the video, its chapters, what the checks caught, and anything left unverified.

| Length | The video is | It covers | Making it takes about |
|---|---|---|---|
| `short` | 3 to 5 minutes | an overview | under an hour |
| `tour` (the default) | 6 to 10 minutes | 2 or 3 paths through the code | an hour or more |
| `deep` | 20 to 28 minutes | 4 to 6 paths | several hours |

## Try a preview first

Not sure yet? Ask for a preview. Claude stops once the script has been checked, before anything is drawn: you get
the checked document and the narration to listen to, without pictures. It is much quicker and cheaper, and if you
like it, Claude carries on to the full video without redoing anything.

## Where the files are

Everything is in `.codebase-video/<name>/` inside your project:

| File | What it is |
|---|---|
| `out/<name>.mp4` | the video (also `.webm`, a poster `.jpg`, captions `.vtt` and chapters `.chapters.vtt`) |
| `out/REPORT.md` | the settings used, the chapters, what each check found and fixed, what is left |
| `build/lesson.md` | the checked document the video was made from, with the file and line behind every statement |

## Tips

- Give hints when you ask: what to leave out, what to check extra carefully, what your team calls things. For hints
  that apply to every video of the project, see [Change a video](change-a-video.md).
- If something looks wrong, `build/lesson.md` names the file and line to look at, and you can ask for a fix.
- If the first run says a tool is missing, it also says how to install it.
