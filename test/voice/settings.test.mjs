import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-settings-"));
const home = path.join(tmp, "home");
const project = path.join(tmp, "repo", ".codebase-video");
const ws = path.join(project, "ws");
fs.mkdirSync(home, { recursive: true });
fs.mkdirSync(ws, { recursive: true });
process.env.CODEBASE_VIDEO_HOME = home;
const root = path.resolve(import.meta.dirname, "..", "..");
const V = await import(pathToFileURL(path.join(root, "engine", "cli", "Voice.js")).href);

const KEYS = ["ELEVENLABS_API_KEY", "OPENAI_API_KEY", "AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION", "GOOGLE_API_KEY"];
beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
  fs.rmSync(path.join(project, "voice.json"), { force: true });
  fs.rmSync(path.join(home, "voices.json"), { force: true });
});

const voiceJson = (o) => fs.writeFileSync(path.join(project, "voice.json"), JSON.stringify(o));
const voicesJson = (o) => fs.writeFileSync(path.join(home, "voices.json"), JSON.stringify(o));
const ok = (r) => { assert.equal(r.tag, 0, JSON.stringify(r)); return r.fields[0]; };
const bad = (r) => { assert.equal(r.tag, 1, JSON.stringify(r)); return r.fields[0]; };
const text = (failure) => Array.from(V.describe(failure)[1]).join("\n");
const choose = (script) => ok(V.choose(ws, script));

test("no voice settings -> Kokoro with the script's voice", () => {
  const c = choose({ voice: "af_heart" });
  assert.equal(V.providerName(c.Provider), "Kokoro");
  assert.equal(c.Name, "af_heart");
});

test("voice.json applies when the script names no provider", () => {
  voiceJson({ provider: "openai", voice: "coral" });
  const c = choose({ voice: "af_heart" });
  assert.equal(V.providerName(c.Provider), "OpenAI");
  assert.equal(c.Name, "coral");
  assert.equal(c.Model, "gpt-4o-mini-tts");
});

test("a script with a provider wins", () => {
  voiceJson({ provider: "openai", voice: "coral" });
  const c = choose({ provider: "elevenlabs", voice: "abc" });
  assert.equal(V.providerName(c.Provider), "ElevenLabs");
  assert.equal(c.Name, "abc");
  assert.equal(c.Model, "eleven_multilingual_v2");
});

test("voice null stays silent", () => {
  voiceJson({ provider: "openai", voice: "coral" });
  assert.equal(choose({ voice: null }), undefined);
});

test("a named command is looked up in voices.json", () => {
  voicesJson({ commands: { mine: "echo {out}" } });
  voiceJson({ provider: "command", command: "mine", voice: "v" });
  const c = choose({});
  assert.equal(c.Provider.fields[0], "mine");
  assert.equal(c.Provider.fields[1], "echo {out}");
  assert.equal(V.providerName(c.Provider), "command mine");
});

test("a command name not defined", () => {
  voiceJson({ provider: "command", command: "mine" });
  const t = text(bad(V.choose(ws, {})));
  assert.ok(t.includes(path.join(home, "voices.json")), t);
  assert.ok(t.includes("mine"), t);
});

test("a project cannot give command text", () => {
  voiceJson({ provider: "command", command: "rm -rf ~ {out}" });
  const f = bad(V.choose(ws, {}));
  assert.equal(V.describe(f)[0], 1);
  assert.ok(text(f).includes(path.join(home, "voices.json")));
});

test("unknown provider", () => {
  voiceJson({ provider: "polly", voice: "x" });
  const t = text(bad(V.choose(ws, {})));
  for (const p of ["kokoro", "elevenlabs", "openai", "azure", "google"]) assert.ok(t.includes(p), t);
});

test("missing or empty key", () => {
  voiceJson({ provider: "openai", voice: "coral" });
  const c = choose({});
  for (const v of [undefined, ""]) {
    if (v === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = v;
    const f = bad(V.check(c, 1.0));
    assert.equal(f.tag, 0);
    assert.deepEqual(f.fields, ["OpenAI", "OPENAI_API_KEY"]);
    assert.equal(V.describe(f)[0], 2);
  }
  process.env.OPENAI_API_KEY = "k";
  ok(V.check(c, 1.0));
});

test("azure needs its region", () => {
  voiceJson({ provider: "azure", voice: "en-US-AvaMultilingualNeural" });
  const c = choose({});
  process.env.AZURE_SPEECH_KEY = "k";
  const f = bad(V.check(c, 1.0));
  assert.equal(f.tag, 0);
  assert.deepEqual(f.fields, ["Azure", "AZURE_SPEECH_REGION"]);
  process.env.AZURE_SPEECH_REGION = "westeurope";
  ok(V.check(c, 1.0));
});

test("speed ranges", () => {
  process.env.ELEVENLABS_API_KEY = process.env.OPENAI_API_KEY = process.env.GOOGLE_API_KEY = "k";
  process.env.AZURE_SPEECH_KEY = "k";
  process.env.AZURE_SPEECH_REGION = "r";
  const of = (provider, voice) => { voiceJson({ provider, voice }); return choose({}); };
  const eleven = of("elevenlabs", "a");
  const f = bad(V.check(eleven, 1.3));
  assert.equal(f.tag, 1);
  assert.ok(f.fields[0].includes("0.7 to 1.2"), f.fields[0]);
  ok(V.check(eleven, 1.2));
  const openai = of("openai", "coral");
  ok(V.check(openai, 4.0));
  bad(V.check(openai, 4.1));
  const google = of("google", "g");
  ok(V.check(google, 2.0));
  bad(V.check(google, 2.1));
  const azure = of("azure", "z");
  ok(V.check(azure, 0.5));
  ok(V.check(azure, 2.0));
  bad(V.check(azure, 2.1));
  ok(V.check(choose({ voice: "af_heart" }) && (voiceJson({}), choose({ voice: "af_heart" })), 9.0));
  voicesJson({ commands: { c: "x {out}" } });
  voiceJson({ provider: "command", command: "c" });
  ok(V.check(choose({}), 9.0));
});

test("phrase voices", () => {
  voiceJson({ provider: "elevenlabs", voice: "abc", voices: { fr: { voice: "xyz" } } });
  const c = choose({});
  assert.deepEqual(Array.from(c.Others), [["fr", ["xyz", "fr"]]]);
});
