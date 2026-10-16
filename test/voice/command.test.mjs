import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";

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

test("placeholders are shell-quoted", async () => {
  const dump = path.join(tmp, "voice.txt");
  // spaces, a glob and a tilde stay as they are (quotes are refused in a command voice's value: see below)
  const name = "My Voice (2) * ~ é";
  ok(await run(voiceFor(`printf %s {voice} > ${dump}; ${FF} {out}`, { name })));
  assert.equal(fs.readFileSync(dump, "utf8"), name);
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

test("a placeholder outside quotes is one word: no argument injection", async () => {
  const dump = path.join(tmp, "words.txt");
  ok(await run(voiceFor(`printf '[%s]' {voice} > ${dump}; ${FF} {out}`, { name: "a --extra-opt b" })));
  assert.equal(fs.readFileSync(dump, "utf8"), "[a --extra-opt b]");
});

test("a command voice's voice and lang may hold no shell characters", () => {
  voiceFor(`say {voice} -o {out}`);
  const spec = (o) => ({ provider: "command", command: "mine", voice: "v", ...o });
  const cases = [
    [{ voice: "$(x)" }, /"voice".*\$ or `/],
    [{ voice: "a`b" }, /"voice".*\$ or `/],
    [{ voice: `it's` }, /"voice".*a quote/],
    [{ voice: `a"b` }, /"voice".*a quote/],
    [{ voice: "a\\b" }, /"voice".*a backslash/],
    [{ voice: "a;b" }, /"voice".*; & or \|/],
    [{ voice: "a&b" }, /"voice".*; & or \|/],
    [{ voice: "a|b" }, /"voice".*; & or \|/],
    [{ voice: "a>b" }, /"voice".*< or >/],
    [{ voice: "a<b" }, /"voice".*< or >/],
    [{ voice: "a\nb" }, /"voice".*a line break/],
    [{ voice: "a\rb" }, /"voice".*a line break/],
    [{ voice: "a\u0000b" }, /"voice".*a NUL/],
    [{ lang: "en;x" }, /"lang".*; & or \|/],
    [{ voices: { fr: { voice: "a|b" } } }, /"voices\.fr\.voice".*; & or \|/],
    [{ voices: { fr: { voice: "ok", lang: "fr$x" } } }, /"voices\.fr\.lang".*\$ or `/],
  ];
  for (const [fields, message] of cases) {
    const f = bad(V.choose(ws, spec(fields)));
    assert.equal(f.name, "SettingsBad", JSON.stringify(fields));
    assert.match(said(f), message, JSON.stringify(fields));
  }
  // what a voice name or language needs is still fine
  ok(V.choose(ws, spec({ voice: "en_US-lessac-medium (2) é.onnx", lang: "en-us" })));
  // other providers send the value in a request, not to a shell
  ok(V.choose(ws, { provider: "openai", voice: "it's $x" }));
});

test("speak alone refuses a shell character in the voice or lang, and a NUL is a value, not a throw", async () => {
  const marker = path.join(fs.mkdtempSync(path.join(tmp, "probe-")), "PWNED");
  const command = SH_C(path.join(tmp, "probe.txt"));
  for (const [name, lang] of [[`$(touch\${IFS}${marker})`, "en"], ["v", `$(touch ${marker})`], ["a\u0000b", "en"],
    ["v", "en\u0000"]]) {
    const f = bad(await run(unchecked(command, name, lang)));
    assert.equal(f.name, "SettingsBad", JSON.stringify([name, lang]));
  }
  assert.equal(fs.existsSync(marker), false);
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
