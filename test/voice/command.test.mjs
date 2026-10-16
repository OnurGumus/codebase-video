import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-command-"));
const home = path.join(tmp, "home");
const ws = path.join(tmp, "repo", ".codebase-video", "ws");
fs.mkdirSync(home, { recursive: true });
fs.mkdirSync(ws, { recursive: true });
process.env.CODEBASE_VIDEO_HOME = home;
const root = path.resolve(import.meta.dirname, "..", "..");
const lib = path.join(root, "engine", "cli", "fable_modules", "fable-library-js.5.19.0", "Async.js");
const { startAsPromise } = await import(pathToFileURL(lib).href);
const V = await import(pathToFileURL(path.join(root, "engine", "cli", "Voice.js")).href);

beforeEach(() => {
  delete process.env.CODEBASE_VIDEO_VOICE_TIMEOUT;
});

const ok = (r) => { assert.equal(r.tag, 0, JSON.stringify(r)); return r.fields[0]; };
const bad = (r) => { assert.equal(r.tag, 1, JSON.stringify(r)); return r.fields[0]; };
const FF = "ffmpeg -nostdin -v error -f lavfi -i sine=frequency=440:sample_rate=44100:duration=0.5";

/** A Voice that runs `command` (named "mine"), made through the module's own `choose`. */
const voiceFor = (command, { name = "v", speed = 1.0, provider = "command" } = {}) => {
  fs.writeFileSync(path.join(home, "voices.json"), JSON.stringify({ commands: { mine: command, other: command } }));
  const c = ok(V.choose(ws, { provider, voice: name, command: "mine" }));
  return new V.Voice(c.Provider, c.Name, c.Model, c.Instructions, "en", speed);
};
const speak = (voice, text = "Hello there.") => V.speakCommand(voice, text);
const run = (voice, text) => startAsPromise(speak(voice, text));

test("a command's WAV becomes 24 kHz mono", async () => {
  const s = ok(await run(voiceFor(`${FF} -ac 2 {out}`)));
  assert.ok(Math.abs(s.length - 12000) <= 120, `got ${s.length}`);
});

test("an AIFF is converted too", async () => {
  const s = ok(await run(voiceFor(`${FF} -ac 2 {out}.aiff && mv {out}.aiff {out}`)));
  assert.ok(Math.abs(s.length - 12000) <= 120, `got ${s.length}`);
});

test("the text arrives on stdin as UTF-8", async () => {
  const dump = path.join(tmp, "stdin.txt");
  const text = "Café — 東京 ✓";
  ok(await run(voiceFor(`cat > ${dump}; ${FF} {out}`), text));
  assert.deepEqual(fs.readFileSync(dump), Buffer.from(text, "utf8"));
});

test("a plain voice and lang reach the command as they are", async () => {
  const dump = path.join(tmp, "plain.txt");
  const command = `printf '[%s][%s]' {voice} {lang} > ${dump}; ${FF} {out}`;
  for (const value of ["en-us", "fr_FR", "v1.2", "en+f3", "Samantha"]) {
    voiceFor(command);
    const c = ok(V.choose(ws, { provider: "command", command: "mine", voice: value, lang: value }));
    ok(V.check(c, 1.0));
    ok(await run(new V.Voice(c.Provider, c.Name, c.Model, c.Instructions, value, 1.0)));
    assert.equal(fs.readFileSync(dump, "utf8"), `[${value}][${value}]`, value);
  }
  // an empty or absent voice is still fine: CV_VOICE is ""
  for (const spec of [{ voice: "" }, {}]) {
    const c = ok(V.choose(ws, { provider: "command", command: "mine", ...spec }));
    assert.equal(c.Name, "", JSON.stringify(spec));
  }
});

/** The described lines of a failure, as one text. */
const said = (f) => Array.from(V.describe(f)[1]).join("\n");

/** The command voice "mine" running `command`, with this voice name, built without choose or check. */
const unchecked = (command, name, lang = "en") => {
  const base = voiceFor(command);
  return new V.Voice(base.Provider, name, base.Model, base.Instructions, lang, 1.0);
};

/**
 * Runs the command with a repository voice that tries to touch PWNED: as narrate would (choose, check, then speak),
 * and with speak alone (no choose, no check). True when PWNED was created.
 */
const pwned = async (command) => {
  const marker = path.join(fs.mkdtempSync(path.join(tmp, "probe-")), "PWNED");
  for (const name of [`$(touch ${marker})`, `$(touch\${IFS}${marker})`]) {
    voiceFor(command);
    const c = V.choose(ws, { provider: "command", voice: name, command: "mine" });
    if (c.tag === 0 && V.check(c.fields[0], 1.0).tag === 0) await run(unchecked(command, name));
    await run(unchecked(command, name));
  }
  return fs.existsSync(marker);
};

/** The reviewer's commands: a placeholder inside a double-quoted `sh -c` text, and inside a quoted path. */
const SH_C = (dump) => `sh -c "printf '[%s]' {voice} > ${dump}"; ${FF} {out}`;
const IN_PATH = (dump) => `printf '[%s]' "/My Voices/{voice}.onnx" > ${dump}; ${FF} {out}`;

test("a repository's voice never runs as code, whatever quotes the command has", async () => {
  const dump = path.join(tmp, "probe.txt");
  assert.equal(await pwned(`printf %s "{voice}" > {out}.v; ${FF} {out}`), false, "double quotes");
  assert.equal(await pwned(`printf %s '{voice}' > {out}.v; ${FF} {out}`), false, "single quotes");
  assert.equal(await pwned(`printf %s {voice} > {out}.v; ${FF} {out}`), false, "no quotes");
  assert.equal(await pwned(SH_C(dump)), false, "inside sh -c");
});

test("check refuses a placeholder anywhere inside quotes, or after a backslash", () => {
  const dump = path.join(tmp, "probe.txt");
  const refused = [SH_C(dump), IN_PATH(dump), `say -v "{voice}" -o {out}`, `say -o '{out}'`,
    `say -o "x {out} y"`, `say -o \\{out}`, `say "it's" -v "a \\" {voice}" -o {out}`];
  for (const command of refused) {
    voiceFor(command);
    const c = ok(V.choose(ws, { provider: "command", voice: "v", command: "mine" }));
    const f = bad(V.check(c, 1.0));
    assert.equal(f.name, "SettingsBad", command);
    assert.match(said(f), /outside any quotes/, command);
  }
  const accepted = [`say -o {out}"x"`, `say -v 'Ava' -o {out} --rate "1"`, `say "it's" {voice} -o {out}`,
    `say 'a "b' {voice} -o {out}`, `say "a \\" b" {voice} -o {out}`];
  for (const command of accepted) {
    voiceFor(command);
    ok(V.check(ok(V.choose(ws, { provider: "command", voice: "v", command: "mine" })), 1.0));
  }
});

/** The project's voice.json, written for one call and removed after it. */
const withVoiceJson = (settings, f) => {
  const file = path.join(path.dirname(ws), "voice.json");
  fs.writeFileSync(file, JSON.stringify(settings));
  try { return f(); } finally { fs.rmSync(file); }
};

test("a command voice's voice and lang are plain words, else choose stops with a SettingsBad naming the field", () => {
  voiceFor(`say {voice} -o {out}`);
  const spec = (o) => ({ provider: "command", command: "mine", voice: "v", ...o });
  const words = ["*", "a b", "-x", "../x", "x/y", "~", "$x", "a;b", "é", "+x", ".x", "_x", "a\nb", "a\rb", "a\u0000b",
    "$(x)", "a`b", "it's", 'a"b', "a\\b", "a|b", "a&b", "a>b", "[a]", "a?", "{a,b}", "a=b", "a#b", "a:b", "a\tb"];
  for (const word of words) {
    const cases = [[{ voice: word }, "voice"], [{ lang: word }, "lang"], [{ voices: { fr: { voice: word } } },
      "voices.fr.voice"], [{ voices: { fr: { voice: "ok", lang: word } } }, "voices.fr.lang"]];
    for (const [fields, field] of cases) {
      const f = bad(V.choose(ws, spec(fields)));
      assert.equal(f.name, "SettingsBad", JSON.stringify(fields));
      const message = said(f);
      assert.ok(message.includes(`"${field}"`), `${JSON.stringify(fields)}: ${message}`);
      assert.match(message, /A-Z, a-z, 0-9 and \. _ \+ -/, JSON.stringify(fields));
      assert.match(message, /spaces or other characters.*voices\.json/, JSON.stringify(fields));
    }
  }
  // a voices entry without a "lang" uses its code as the language, and that is checked too
  assert.match(said(bad(V.choose(ws, spec({ voices: { "f r": { voice: "ok" } } })))), /"voices\.f r\.lang"/);
  // a number or a null is not text: refused, naming the field
  for (const value of [5, null]) {
    const cases = [[{ lang: value }, "lang"], [{ voices: { fr: { voice: value } } }, "voices\\.fr\\.voice"],
      [{ voices: { fr: { voice: "ok", lang: value } } }, "voices\\.fr\\.lang"]];
    for (const [fields, field] of cases) {
      const f = bad(V.choose(ws, spec(fields)));
      assert.equal(f.name, "SettingsBad", JSON.stringify(fields));
      assert.match(said(f), new RegExp(`"${field}".*not text`), JSON.stringify(fields));
    }
    // "voice": null in script.json is a silent clip; in voice.json it is a voice that is not text
    const f = withVoiceJson({ provider: "command", command: "mine", voice: value }, () => bad(V.choose(ws, {})));
    assert.match(said(f), /"voice".*not text/, JSON.stringify(value));
  }
  assert.match(said(bad(V.choose(ws, spec({ voice: 5 })))), /"voice".*not text/);
  // the same rule for a voice.json
  assert.match(said(withVoiceJson({ provider: "command", command: "mine", voice: "a b" }, () => bad(V.choose(ws, {})))),
    /"voice".*A-Z/);
  ok(withVoiceJson({ provider: "command", command: "mine", voice: "Samantha" }, () => V.choose(ws, {})));
  // other providers send the value in a request, not to a shell
  ok(V.choose(ws, { provider: "openai", voice: "it's $x" }));
});

test("a command voice's speed must be a number: {speed} is the engine's own writing of it", async () => {
  const marker = path.join(fs.mkdtempSync(path.join(tmp, "probe-")), "PWNED");
  voiceFor(`true {speed}; ${FF} {out}`);
  const c = ok(V.choose(ws, { provider: "command", command: "mine", voice: "v" }));
  for (const speed of ["*", `$(touch ${marker})`, "1", null]) {
    const f = bad(V.check(c, speed));
    assert.equal(f.name, "SettingsBad", JSON.stringify(speed));
    assert.match(said(f), /"speed".*not a number/, JSON.stringify(speed));
    const spoken = bad(await run(new V.Voice(c.Provider, "v", c.Model, c.Instructions, "en", speed)));
    assert.equal(spoken.name, "SettingsBad", JSON.stringify(speed));
  }
  assert.equal(fs.existsSync(marker), false);
  ok(V.check(c, 1.25));
});

test("speak alone refuses a voice or lang that is not a plain word; a NUL or a number is a value, not a throw",
  async () => {
    const marker = path.join(fs.mkdtempSync(path.join(tmp, "probe-")), "PWNED");
    const command = SH_C(path.join(tmp, "probe.txt"));
    const values = [[`$(touch\${IFS}${marker})`, "en"], ["v", `$(touch ${marker})`], ["a\u0000b", "en"],
      ["v", "en\u0000"], ["*", "en"], ["v", "*"], ["a b", "en"], ["v", "x/y"], ["v", 5], [5, "en"], ["v", null]];
    for (const [name, lang] of values) {
      const f = bad(await run(unchecked(command, name, lang)));
      assert.equal(f.name, "SettingsBad", JSON.stringify([name, lang]));
    }
    assert.equal(fs.existsSync(marker), false);
  });

/** The re-review's chain: quotes inside comments around a placeholder that sh reads inside "...". */
const COMMENTED = `# tuned for a 12" speaker
sh -c "true --lang {lang}"
# (and a 6" one)
${FF} {out}`;

test("the commented chain: an array lang is refused by choose, a text one by check, and nothing runs", async () => {
  const marker = path.join(fs.mkdtempSync(path.join(tmp, "probe-")), "PWNED");
  const lang = [`$(touch\${IFS}${marker})`];
  voiceFor(COMMENTED);
  const spec = { provider: "command", command: "mine", voice: "v", lang };
  const f = bad(V.choose(ws, spec));
  assert.equal(f.name, "SettingsBad");
  assert.match(said(f), /"lang"/);
  // as narrate would, had choose let it through; then speak alone
  const c = V.choose(ws, spec);
  if (c.tag === 0 && V.check(c.fields[0], 1.0).tag === 0) await run(unchecked(COMMENTED, "v", lang));
  assert.equal(bad(await run(unchecked(COMMENTED, "v", lang))).name, "SettingsBad");
  assert.equal(fs.existsSync(marker), false);
  // with a plain lang, the {lang} inside the nested "..." is still refused by check
  const text = ok(V.choose(ws, { ...spec, lang: "en" }));
  assert.match(said(bad(V.check(text, 1.0))), /\{lang\} inside quotes/);
});

test("a comment's quotes do not count, and a heredoc is refused", () => {
  const checked = (command) => {
    voiceFor(command);
    return V.check(ok(V.choose(ws, { provider: "command", voice: "v", command: "mine" })), 1.0);
  };
  ok(checked(`# a comment with a " quote\nsay -o {out}`));
  ok(checked(`say -v {voice} -o {out} # it's "fine" {lang}`));
  ok(checked(`say -o {out}#x\nsay -o {out}`));
  // a # inside a word is no comment: the quote after it still opens
  assert.match(said(bad(checked(`say a#" {voice} " -o {out}`))), /inside quotes/);
  for (const command of [`cat <<EOF > {out}\nhi\nEOF`, `say -o {out} <<< hi`]) {
    assert.match(said(bad(checked(command))), /heredoc/, command);
  }
});

test("a voice value that is not text is a SettingsBad for a cloud or command voice; Kokoro is unchanged", () => {
  voiceFor(`say -v {voice} -o {out}`);
  const specs = { openai: { provider: "openai", voice: "coral" }, command: { provider: "command", command: "mine",
    voice: "v" } };
  for (const [kind, spec] of Object.entries(specs)) {
    for (const lang of [5, null, {}, ["en"]]) {
      const f = bad(V.choose(ws, { ...spec, lang }));
      assert.equal(f.name, "SettingsBad", `${kind} ${JSON.stringify(lang)}`);
      assert.match(said(f), /"lang".*not text/, `${kind} ${JSON.stringify(lang)}`);
    }
    assert.match(said(bad(V.choose(ws, { ...spec, voice: 5 }))), /"voice".*not text/, kind);
    const phrase = { ...spec, voices: { fr: { voice: "x", lang: 7 } } };
    assert.match(said(bad(V.choose(ws, phrase))), /"voices\.fr\.lang".*not text/, kind);
    assert.match(said(bad(V.choose(ws, { ...spec, voices: { fr: { voice: [] } } }))), /"voices\.fr\.voice"/, kind);
  }
  for (const lang of [5, null, {}, ["en"]]) ok(V.choose(ws, { voice: "af_heart", lang }));
});

test("a command text that spawn refuses (a NUL) is a CommandFailed, not a throw", async () => {
  const f = bad(await run(voiceFor("echo a\u0000b {out}")));
  assert.equal(f.name, "CommandFailed");
  assert.equal(f.fields[1], 127);
});

test("the values reach the command as CV_VOICE, CV_LANG, CV_SPEED and CV_OUT", async () => {
  const dump = path.join(tmp, "env.txt");
  const command = `printf '%s|%s|%s|%s' "$CV_VOICE" "$CV_LANG" "$CV_SPEED" "$CV_OUT" > ${dump}; ${FF} {out}`;
  ok(await run(voiceFor(command, { name: "Ava", speed: 1.1 })));
  const [voice, lang, speed, out] = fs.readFileSync(dump, "utf8").split("|");
  assert.deepEqual([voice, lang, speed], ["Ava", "en", "1.1"]);
  assert.match(out, /voice\.wav$/);
});

test("exit 1 is a CommandFailed with its stderr", async () => {
  const f = bad(await run(voiceFor("echo nope >&2; exit 1")));
  assert.equal(f.name, "CommandFailed");
  assert.deepEqual([f.fields[0], f.fields[1], f.fields[2]], ["mine", 1, "nope"]);
});

test("no file written is a CommandFailed", async () => {
  const f = bad(await run(voiceFor("true")));
  assert.match(f.fields[2], /no audio was written/);
});

test("a command without {out} is rejected by check", () => {
  const v = voiceFor("echo hi");
  const c = ok(V.choose(ws, { provider: "command", voice: "v", command: "mine" }));
  const f = bad(V.check(c, 1.0));
  assert.match(Array.from(V.describe(f)[1]).join("\n"), /\{out\}/);
  assert.ok(v);
});

test("a command running too long times out", async () => {
  process.env.CODEBASE_VIDEO_VOICE_TIMEOUT = "1";
  const t0 = Date.now();
  const f = bad(await run(voiceFor("sleep 200")));
  assert.match(f.fields[2], /timed out/);
  assert.ok(Date.now() - t0 < 10000);
});

test("macOS say gives audio", { skip: process.platform !== "darwin" }, async () => {
  const s = ok(await run(voiceFor("say --data-format=LEF32@24000 -o {out}")));
  assert.ok(s.length > 1000);
});

test("pieceKey differs by provider, voice, speed and command text, not by command name", () => {
  const a = voiceFor("echo {out}");
  const key = V.pieceKey(a, "Hi");
  assert.match(key, /^[0-9a-f]{16}$/);
  // the key's JSON starts with its version, so a later change to a request or the conversion can bump it
  const parts = ["cv-voice 1", "command", null, "v", "en", 1, null, "echo {out}", "Hi"];
  assert.equal(key, crypto.createHash("sha1").update(JSON.stringify(parts)).digest("hex").slice(0, 16));
  assert.equal(V.pieceKey(a, "Hi"), key);
  assert.notEqual(V.pieceKey(a, "Ho"), key);
  assert.notEqual(V.pieceKey(voiceFor("echo {out}", { name: "w" }), "Hi"), key);
  assert.notEqual(V.pieceKey(voiceFor("echo {out}", { speed: 1.1 }), "Hi"), key);
  assert.notEqual(V.pieceKey(voiceFor("echo {out} x"), "Hi"), key);
  const openai = new V.Voice(new V.Provider(2), "v", undefined, undefined, "en", 1.0);
  assert.notEqual(V.pieceKey(openai, "Hi"), key);
  // same text under another command name: same key
  voiceFor("echo {out}");
  const c = ok(V.choose(ws, { provider: "command", voice: "v", command: "other" }));
  assert.equal(V.pieceKey(new V.Voice(c.Provider, "v", c.Model, c.Instructions, "en", 1.0), "Hi"), key);
});

// The round-3 review's chains, end to end: `node engine/cli/Cv.js <ws> narrate` in a repository that ships a file
// whose name holds `;`. sh expands an unquoted `*` to that name, so a lang of "*" ran the repository's own code.
const KEYS = ["ELEVENLABS_API_KEY", "OPENAI_API_KEY", "AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION", "GOOGLE_API_KEY"];
const CHAIN_FF = "ffmpeg -nostdin -v error -f lavfi -i sine=frequency=440:sample_rate=44100:duration=0.3";
const CHAINS = {
  // `\` + newline before `#`: sh reads the next line's `#` inside a word, so the scan's "comment" is not one
  A: { command: `${CHAIN_FF} {out}\ntrue \\\n# tuned for a 12" speaker\nsh -c "true --lang {lang}"\n# (and a 6" one)\n`,
    file: "true --lang ;touch PWNED" },
  // quotes inside $( ) within "...": the scan reads {lang} as outside quotes, the nested sh reads the glob's name
  B: { command: `sh -c "true --lang $(echo "{lang}")"; ${CHAIN_FF} {out}\n`, file: "x;touch PWNED" },
};

/** Narrates the fixture in a fresh repository with the user's command `command`, the repository file `file`, and
 * these script.json fields; the run's exit code, its output, and whether the repository's PWNED exists. */
const narrateIn = (command, file, fields) => {
  const T = fs.mkdtempSync(path.join(tmp, "chain-"));
  const repo = path.join(T, "repo");
  const clip = path.join(repo, ".codebase-video", "ws");
  const userHome = path.join(T, "home");
  fs.mkdirSync(clip, { recursive: true });
  fs.mkdirSync(userHome);
  const script = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "fixture", "script.json"), "utf8"));
  fs.writeFileSync(path.join(clip, "script.json"), JSON.stringify({ ...script, ...fields }));
  fs.writeFileSync(path.join(repo, ".codebase-video", "voice.json"),
    JSON.stringify({ provider: "command", command: "mine", voice: "v" }));
  fs.writeFileSync(path.join(userHome, "voices.json"), JSON.stringify({ commands: { mine: command } }));
  fs.writeFileSync(path.join(repo, file), "");
  const env = { ...process.env, CODEBASE_VIDEO_HOME: userHome };
  for (const k of KEYS) delete env[k];
  const r = spawnSync(process.execPath, [path.join(root, "engine", "cli", "Cv.js"), ".codebase-video/ws", "narrate"],
    { cwd: repo, env, encoding: "utf8" });
  return { code: r.status, output: r.stdout + r.stderr, pwned: fs.existsSync(path.join(repo, "PWNED")) };
};

for (const [label, { command, file }] of Object.entries(CHAINS)) {
  test(`chain ${label}: a lang of "*" stops narrate before any work, and the repository's file never runs`, () => {
    const r = narrateIn(command, file, { lang: "*" });
    assert.equal(r.pwned, false, r.output);
    assert.equal(r.code, 1, r.output);
    assert.match(r.output, /"lang".*A-Z, a-z, 0-9/, r.output);
  });
}

test("chain B with a plain lang narrates, and the glob's file never runs", () => {
  const r = narrateIn(CHAINS.B.command, CHAINS.B.file, { lang: "en-us" });
  assert.equal(r.pwned, false, r.output);
  assert.equal(r.code, 0, r.output);
});

test("chain B through {speed}: a speed of \"*\" stops narrate before any work", () => {
  const command = `sh -c "true --rate $(echo "{speed}")"; ${CHAIN_FF} {out}\n`;
  const r = narrateIn(command, CHAINS.B.file, { speed: "*" });
  assert.equal(r.pwned, false, r.output);
  assert.equal(r.code, 1, r.output);
  assert.match(r.output, /"speed".*not a number/, r.output);
});
