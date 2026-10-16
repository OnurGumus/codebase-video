import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
  const name = `it's "x"`;
  ok(await run(voiceFor(`printf %s {voice} > ${dump}; ${FF} {out}`, { name })));
  assert.equal(fs.readFileSync(dump, "utf8"), name);
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
