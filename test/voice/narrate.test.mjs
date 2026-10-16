// `narrate` end to end with a cloud voice (the fake server, an empty tool home: no Kokoro), and Kokoro unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { start } from "./fake-server.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const fixture = path.join(import.meta.dirname, "fixture", "script.json");
const KEYS = ["ELEVENLABS_API_KEY", "OPENAI_API_KEY", "AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION", "GOOGLE_API_KEY"];
const OPENAI = { provider: "openai", voice: "coral" };

/** A fresh <tmp>/repo/.codebase-video/ws with the fixture, an empty tool home, and voice.json when given. */
const workspace = (voiceJson) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-narrate-"));
  const project = path.join(tmp, "repo", ".codebase-video");
  const ws = path.join(project, "ws");
  fs.mkdirSync(ws, { recursive: true });
  fs.mkdirSync(path.join(tmp, "home"));
  fs.copyFileSync(fixture, path.join(ws, "script.json"));
  if (voiceJson) fs.writeFileSync(path.join(project, "voice.json"), JSON.stringify(voiceJson));
  return { ws, home: path.join(tmp, "home") };
};

/** `node <engine>/engine/cli/Cv.js <ws> narrate`, without blocking the event loop the fake server needs. */
const narrate = (ws, env, engine = root) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(engine, "engine", "cli", "Cv.js"), ws, "narrate"], { env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });

/** The environment without any key, with these variables set. */
const envWith = (vars) => {
  const env = { ...process.env };
  for (const k of KEYS) delete env[k];
  return { ...env, ...vars };
};

/** Narrates the fixture with OpenAI against the fake server in `mode`; `runs` narrations in the same workspace. */
const cloud = async ({ mode = "ok", key = "test-key", runs = 1 } = {}) => {
  const { ws, home } = workspace(OPENAI);
  const server = await start(mode);
  const vars = { CODEBASE_VIDEO_HOME: home, CODEBASE_VIDEO_OPENAI_URL: server.url };
  const env = envWith(key ? { ...vars, OPENAI_API_KEY: key } : vars);
  try {
    const results = [];
    for (let i = 0; i < runs; i++) {
      const before = server.requests.length;
      if (i > 0) fs.rmSync(path.join(ws, "build", "timing.json"));
      const r = await narrate(ws, env);
      results.push({ ...r, requests: server.requests.slice(before) });
    }
    return { ws, results };
  } finally {
    await server.close();
  }
};

const inputs = (requests) => requests.map((r) => JSON.parse(r.body.toString("utf8")).input);
const timing = (ws) => JSON.parse(fs.readFileSync(path.join(ws, "build", "timing.json"), "utf8"));
const lastLine = (s) => s.trimEnd().split("\n").at(-1);
const near = (a, b, label) => assert.ok(Math.abs(a - b) < 0.01, `${label}: ${a} is not about ${b}`);

test("a cloud voice narrates without Kokoro installed", async () => {
  const { ws, results: [r] } = await cloud();
  assert.equal(r.code, 0, r.stderr);
  for (const f of ["timing.json", "narration.wav"]) assert.ok(fs.existsSync(path.join(ws, "build", f)), f);
  // the fake audio is 0.5 s; the second sentence has three parts with 0.12 s between them
  const [one, two, three] = timing(ws).scenes[0].sentences;
  near(one.end - one.start, 0.5, "first sentence");
  near(two.end - two.start, 3 * 0.5 + 2 * 0.12, "second sentence");
  near(three.end - three.start, 0.5, "third sentence");
  assert.equal(r.requests.length, 5);
});

test("the summary line", async () => {
  const { results: [r] } = await cloud();
  const n = inputs(r.requests).reduce((sum, t) => sum + t.length, 0);
  const sent = `${n.toLocaleString("en-US")} characters in ${r.requests.length} requests`;
  const said = `voice: OpenAI gpt-4o-mini-tts, ${sent}, 0 pieces from the cache`;
  assert.equal(lastLine(r.stdout), said);
});

test("the pin is reported", async () => {
  const { results: [r] } = await cloud();
  assert.ok(r.stdout.includes("1 pinned pronunciation(s) not used by OpenAI: the text is sent as written"), r.stdout);
});

test("a second run sends nothing", async () => {
  const { results: [first, second] } = await cloud({ runs: 2 });
  assert.equal(first.code, 0, first.stderr);
  assert.equal(second.code, 0, second.stderr);
  assert.equal(second.requests.length, 0);
  const cached = `${first.requests.length} pieces from the cache`;
  assert.equal(lastLine(second.stdout), `voice: OpenAI gpt-4o-mini-tts, 0 characters in 0 requests, ${cached}`);
});

test("the empty scene sends nothing", async () => {
  const { results: [r] } = await cloud();
  assert.equal(r.code, 0, r.stderr);
  for (const t of inputs(r.requests)) assert.ok(t.trim() !== "", JSON.stringify(t));
});

test("phonemes.txt", async () => {
  const { ws, results: [r] } = await cloud();
  assert.equal(r.code, 0, r.stderr);
  const lines = fs.readFileSync(path.join(ws, "build", "phonemes.txt"), "utf8").trimEnd().split("\n");
  const french = lines.map((l) => l.split("\t")).filter((c) => c[1] === "fr");
  assert.deepEqual(french, [["one[1]", "fr", "une phrase", "-", "provider"]]);
});

test("a missing key stops before any work", async () => {
  const { ws, results: [r] } = await cloud({ key: null });
  assert.equal(r.code, 2);
  assert.ok(r.stderr.includes("OPENAI_API_KEY"), r.stderr);
  assert.equal(r.requests.length, 0);
  // Cv makes build/ (and out/) for every workspace step: nothing is in it, not even the tts-cache folder
  assert.deepEqual(fs.readdirSync(path.join(ws, "build")), []);
});

test("a refused request stops the run", async () => {
  const { ws, results: [r] } = await cloud({ mode: "400" });
  assert.equal(r.code, 1);
  assert.ok(r.stderr.includes("voice not found"), r.stderr);
  assert.ok(!fs.existsSync(path.join(ws, "build", "timing.json")));
});

test("the summary names no model for Azure or Google, whose requests send none", async () => {
  const { ws, home } = workspace({ provider: "azure", voice: "en-US-AvaMultilingualNeural", model: "ignored" });
  const server = await start("ok");
  try {
    const env = envWith({
      CODEBASE_VIDEO_HOME: home,
      CODEBASE_VIDEO_AZURE_URL: server.url,
      AZURE_SPEECH_KEY: "test-key",
      AZURE_SPEECH_REGION: "westeurope",
    });
    const r = await narrate(ws, env);
    assert.equal(r.code, 0, r.stderr);
    assert.match(lastLine(r.stdout), /^voice: Azure, [\d,]+ characters in 5 requests, 0 pieces from the cache$/);
  } finally {
    await server.close();
  }
});

/** Narrates with this voice.json and environment; the run must fail with exit 1 and leave no timing.json. */
const fails = async (voiceJson, vars, home = null) => {
  const w = workspace(voiceJson);
  if (home) fs.writeFileSync(path.join(w.home, "voices.json"), JSON.stringify(home));
  const r = await narrate(w.ws, envWith({ CODEBASE_VIDEO_HOME: w.home, ...vars }));
  assert.equal(r.code, 1, r.stderr);
  assert.ok(!fs.existsSync(path.join(w.ws, "build", "timing.json")), "timing.json was written");
  return r;
};

test("an unknown provider stops the run", async () => {
  const r = await fails({ provider: "nope", voice: "x" }, {});
  assert.ok(r.stderr.includes('unknown provider "nope"'), r.stderr);
});

test("a service that cannot be reached stops the run", async () => {
  const r = await fails(OPENAI, { OPENAI_API_KEY: "test-key", CODEBASE_VIDEO_OPENAI_URL: "http://127.0.0.1:9" });
  assert.ok(r.stderr.includes("OpenAI could not be reached"), r.stderr);
});

test("a command that fails stops the run with its stderr", async () => {
  const commands = { commands: { broken: "echo broken voice >&2; exit 1 # {out}" } };
  const r = await fails({ provider: "command", command: "broken" }, {}, commands);
  assert.ok(r.stderr.includes("command broken failed (exit 1): broken voice"), r.stderr);
});

test("a lang that is not text stops the run, with no TypeError", async () => {
  const { ws, home } = workspace(OPENAI);
  const file = path.join(ws, "script.json");
  fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, "utf8")), lang: 5 }));
  const vars = { CODEBASE_VIDEO_HOME: home, OPENAI_API_KEY: "test-key", CODEBASE_VIDEO_OPENAI_URL: "http://127.0.0.1:9" };
  const env = envWith(vars);
  const r = await narrate(ws, env);
  assert.equal(r.code, 1, r.stderr);
  assert.ok(r.stderr.includes('"lang"') && !r.stderr.includes("TypeError"), r.stderr);
  assert.ok(!fs.existsSync(path.join(ws, "build", "timing.json")));
});

const kokoroHome = path.join(os.homedir(), ".cache", "codebase-video");
const kokoroMissing = !fs.existsSync(path.join(kokoroHome, "node", "node_modules", "kokoro-js"));

test("Kokoro is unchanged", { skip: kokoroMissing && "Kokoro is not set up in ~/.cache/codebase-video" }, async () => {
  const main = fs.mkdtempSync(path.join(os.tmpdir(), "voice-main-"));
  execFileSync("sh", ["-c", `git -C "${root}" archive main engine | tar -x -C "${main}"`]);
  const { ws } = workspace(null);
  const env = envWith({ CODEBASE_VIDEO_HOME: kokoroHome });
  const build = path.join(ws, "build");
  const outcome = async (engine) => {
    fs.rmSync(build, { recursive: true, force: true });
    const r = await narrate(ws, env, engine);
    const read = (f) => fs.readFileSync(path.join(build, f));
    return {
      code: r.code,
      stdout: r.stdout,
      stderr: r.stderr.replaceAll(engine, "ENGINE"),
      files: ["timing.json", "narration.wav", "captions.vtt", "phonemes.txt"].map(read),
      cache: fs.readdirSync(path.join(build, "tts-cache")).sort(),
    };
  };
  const before = await outcome(main);
  const after = await outcome(root);
  assert.equal(before.code, 0, before.stderr);
  assert.deepEqual(after, before);
});
