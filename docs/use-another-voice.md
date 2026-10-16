# Use another voice

**You get** the video narrated by a voice you pick instead of Kokoro, the default: a cloud voice (ElevenLabs, OpenAI,
Azure AI Speech, Google Cloud Text-to-Speech) with your own key, or a program on your computer such as Piper or macOS
`say`.

## Steps

1. **Pick a provider.** You need an account and a key for a cloud voice. A program on your computer needs none.

   | Provider | `provider` | Key, in the environment | `voice` is |
   |---|---|---|---|
   | ElevenLabs | `elevenlabs` | `ELEVENLABS_API_KEY` | a voice id (a clone you made in ElevenLabs works) |
   | OpenAI | `openai` | `OPENAI_API_KEY` | `alloy`, `coral`, `cedar` and so on, or a custom voice id |
   | Azure AI Speech | `azure` | `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` | a voice name, such as `en-US-AvaMultilingualNeural` |
   | Google Cloud Text-to-Speech | `google` | `GOOGLE_API_KEY` | a voice name, such as `en-US-Chirp3-HD-Charon` |
   | A program of yours | `command` | none | passed to the program (see below) |

2. **Set the key in the environment** where you start Claude Code, for example
   `export ELEVENLABS_API_KEY=...`. A key is read only from the environment. It is never written to a file, and it
   never appears in a message or a log line. If it is missing, `narrate` stops before any work and names the
   variable.

3. **Ask Claude.** Say which voice, in the same project:

   ```
   use ElevenLabs voice <voice id> for this project
   ```

   Claude tells you that the narration text goes to that service, writes `.codebase-video/voice.json`, and draws
   the video again once, because a new voice changes every sentence. Every later video of the project uses that
   voice. To change one video only, say so: Claude puts the voice in that video's `script.json` instead, and a
   script's `provider` wins over `voice.json`.

4. **Watch it.** With a voice other than Kokoro, `narrate` ends with one more line:

   ```
   voice: ElevenLabs eleven_multilingual_v2, 4,812 characters in 37 requests, 12 pieces from the cache
   ```

## The settings

`voice.json` and a video's `script.json` take the same voice fields. One example for each provider:

```json
{ "provider": "elevenlabs", "voice": "<voice id>", "model": "eleven_multilingual_v2" }
```

```json
{ "provider": "openai", "voice": "coral", "model": "gpt-4o-mini-tts", "instructions": "Calm and clear." }
```

```json
{ "provider": "azure", "voice": "en-US-AvaMultilingualNeural" }
```

```json
{ "provider": "google", "voice": "en-US-Chirp3-HD-Charon" }
```

`model` is optional: ElevenLabs uses `eleven_multilingual_v2` and OpenAI `gpt-4o-mini-tts` if you leave it out.
Azure and Google take no model: a `model` there is ignored.
`instructions` is OpenAI only, and optional (the `tts-1` models do not take it). Azure needs `AZURE_SPEECH_REGION`
(for example `westeurope`) as well as the key. The video's language (`lang`) and pace (`speed`) stay in
`script.json`. They belong to the video, not to the voice.

**One provider voices a whole video.** A phrase said in another language (`{code:...}` in the narration) is voiced
by the same provider. With a multilingual cloud voice you can leave `voices` out and the main voice says the phrase;
to give a phrase its own voice from the same provider, add it:

```json
{ "provider": "elevenlabs", "voice": "<voice id>", "voices": { "fr": { "voice": "<another voice id>" } } }
```

A cloud `voice.json` replaces the Kokoro phrase voices in the script's `voices`.

**Which settings win.** A `script.json` with a `provider` field first, else `voice.json`, else the script's own Kokoro
fields, as before. A script with `"voice": null` stays silent whatever `voice.json` says.

## A program of your own: Piper, macOS `say`

A program that turns text into a sound file is a voice. Its command line is defined in `voices.json` in the tool
home, not in the project. When Claude runs the plugin, the tool home is the plugin's data folder
(`CLAUDE_PLUGIN_DATA`, for example `~/.claude/plugins/data/codebase-video-codebase-video`). When you run the engine
yourself, it is `CODEBASE_VIDEO_HOME` if set, else `~/.cache/codebase-video`:

```json
{ "commands": { "my-piper": "piper --model ~/voices/me.onnx --output_file {out}",
                "mac": "say -v Samantha --data-format=LEF32@24000 -o {out}" } }
```

The project then names the command, and nothing else:

```json
{ "provider": "command", "command": "mac" }
```

The program gets the text on standard input. In its command line, `{out}` is required and is where the audio goes;
`{voice}` (the project's `voice` field), `{lang}` and `{speed}` are optional. Write each placeholder outside any
quotes, as above. Do not put it inside `'...'` or `"..."` (not even a longer quoted text such as `sh -c "..."` or
`"/My Voices/{voice}.onnx"`), and not after a backslash. The engine quotes it itself, so it reaches the program as one
word. A placeholder anywhere inside quotes stops `narrate` with a message that names it. The values are also in the
program's environment as `CV_OUT`, `CV_VOICE`, `CV_LANG` and `CV_SPEED`.
The program must write a file ffmpeg can read to `{out}`, exit with 0, and finish within 120 seconds. Any audio
format ffmpeg reads is fine, and it is converted for you.

A command voice's `voice` and `lang` (in `voice.json`, `script.json` or a `voices` entry) may not contain
`$` `` ` `` `"` `'` `\` `;` `&` `|` `<` `>`, a line break (CR or LF) or a NUL. The command runs in a shell, where
each of these has a meaning. A value with one of them stops `narrate` before any work, with a message that names the
field. Spaces, parentheses and letters in any language are fine.

Commands live outside the repository on purpose: a project can choose among your commands, but a `voice.json` that
comes with a repository cannot run one of its own. A name you have not defined stops `narrate` with a message that
names `voices.json`.

## What a cloud voice costs, and who sees the text

- **Cost.** You pay the service. OpenAI's default model, `gpt-4o-mini-tts`, costs about $0.015 per minute of
  narration (October 2026; `tts-1` is billed by text instead, $15 per million characters), so a short video is about
  5 to 8 cents and a tour 10 to 15 cents. ElevenLabs, Azure and Google bill by the character: see their price pages.
  The Claude tokens a video uses cost far more than its voice. `narrate` prints the characters it sent and how many
  pieces came from the cache. A piece already voiced is never sent again: the same text with the same voice, model,
  language and speed comes from `build/tts-cache`, so a second run sends nothing, and a changed sentence sends only
  that sentence. A new voice voices everything once more.
- **Privacy.** Kokoro, the default, runs on your computer. A cloud voice sends the narration text to that service:
  the sentences, including code names they say aloud, not the code itself. Your code is never sent. Check the
  service's own terms for what it does with the text.
- **A repository's own `voice.json`.** When a project already has `.codebase-video/voice.json`, Claude reads it
  before you agree what the video covers and names its voice then. For a cloud voice it also says that the narration
  text goes to that service and that your own key is used, so you can object before anything is narrated. With
  `--yes` Claude never picks a voice: it uses what `voice.json` or `script.json` says, and the run report
  (`out/REPORT.md`) names the voice and, for a cloud one, that the narration text was sent.

## Which providers were tested

| Provider | Tested |
|---|---|
| Kokoro (default) | yes, unchanged: a project with no voice settings gives the same video as before |
| ElevenLabs | tested against its documentation only, not yet live |
| OpenAI | tested live: `gpt-4o-mini-tts`, voice `coral`, a short video narrated and rendered (2026-10-16) |
| Azure AI Speech | tested against its documentation only, not yet live |
| Google Cloud Text-to-Speech | tested against its documentation only, not yet live |
| Command | tested with macOS `say`: a full 4-minute video narrated and rendered |

"Against its documentation" means the requests were checked against the provider's published API with a local
stand-in server. If a service rejects a request, `narrate` stops and prints the service's own message.

## Tips

- Try one short video before a long one: a cloud voice costs by the character, and the first run voices every
  sentence.
- Pronunciation: the glossary (`.codebase-video/glossary.json`, see [Change a video](change-a-video.md)) rewrites the
  text before any voice gets it, so it works with every provider. Phoneme pins (`pronounce` in `script.json`) are
  Kokoro's only. With another voice they are not used, the text is sent as written, and `narrate` says how many it
  skipped.
- Speed: each service takes a range (ElevenLabs 0.7 to 1.2, OpenAI 0.25 to 4.0, Azure 0.5 to 2.0, Google 0.25 to
  2.0). A `speed` outside it stops before any request and names the range.
- A failed request is tried once more after two seconds. There is no switch to Kokoro: a video in two voices is worse
  than one that stops. What was already voiced stays in the cache, so run it again to carry on.
- To go back to Kokoro, delete `.codebase-video/voice.json`, or ask Claude to. The video is drawn again once.
