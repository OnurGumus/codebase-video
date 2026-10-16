import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { start } from "./fake-server.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const lib = path.join(root, "engine", "cli", "fable_modules", "fable-library-js.5.19.0", "Async.js");
const { startAsPromise } = await import(pathToFileURL(lib).href);
const V = await import(pathToFileURL(path.join(root, "engine", "cli", "Voice.js")).href);
const C = await import(pathToFileURL(path.join(root, "engine", "cli", "VoiceCloud.js")).href);

const KEY = "test-key";
for (const v of ["ELEVENLABS_API_KEY", "OPENAI_API_KEY", "AZURE_SPEECH_KEY", "GOOGLE_API_KEY"]) process.env[v] = KEY;
process.env.AZURE_SPEECH_REGION = "westeurope";

const ok = (r) => { assert.equal(r.tag, 0, JSON.stringify(r)); return r.fields[0]; };
const bad = (r) => { assert.equal(r.tag, 1, JSON.stringify(r)); return r.fields[0]; };
const caseOf = (f) => f.cases()[f.tag];
const fieldsOf = (f) => [caseOf(f), ...f.fields];

const URLS = { ElevenLabs: "ELEVENLABS", OpenAI: "OPENAI", Azure: "AZURE", Google: "GOOGLE" };
const setBase = (base) => { for (const p of Object.values(URLS)) process.env[`CODEBASE_VIDEO_${p}_URL`] = base; };

/** A voice: provider is a case name; the Voice record's field order is Provider, Name, Model, Instructions, Lang, Speed. */
const voice = (provider, { name = "abc", model, instructions, lang = "en-us", speed = 1.0 } = {}) => {
  const p = { ElevenLabs: new V.Provider(1, []), OpenAI: new V.Provider(2, []), Azure: new V.Provider(3, ["westeurope"]), Google: new V.Provider(4, []) }[provider];
  return new V.Voice(p, name, model, instructions, lang, speed);
};
const MODELS = { ElevenLabs: "eleven_multilingual_v2", OpenAI: "gpt-4o-mini-tts" };
const withModel = (provider, o = {}) => voice(provider, { model: MODELS[provider], ...o });

const speak = (v, text = "Hello there.") => startAsPromise(C.speak(v, text));
const withServer = async (mode, f) => {
  const s = await start(mode);
  setBase(s.url);
  try { return await f(s); } finally { await s.close(); }
};

test("requestFor: ElevenLabs", async () => {
  await withServer("ok", (s) => {
    const r = C.requestFor(withModel("ElevenLabs"), "Hi");
    assert.equal(r.Url, `${s.url}/v1/text-to-speech/abc?output_format=wav_24000`);
    assert.ok(headerOf(r, "xi-api-key") === KEY);
    assert.deepEqual(JSON.parse(r.Body), { text: "Hi", model_id: "eleven_multilingual_v2", language_code: "en", voice_settings: { speed: 1.0 } });
  });
});

/** The value of a header in a Request (an F# list of tuples). */
const headerOf = (r, name) => [...r.Headers].find(([k]) => k === name)?.[1];

test("requestFor: OpenAI", async () => {
  await withServer("ok", (s) => {
    const r = C.requestFor(withModel("OpenAI", { name: "alloy", speed: 1.5 }), "Hi");
    assert.equal(r.Url, `${s.url}/v1/audio/speech`);
    assert.equal(headerOf(r, "Authorization"), `Bearer ${KEY}`);
    assert.deepEqual(JSON.parse(r.Body), { model: "gpt-4o-mini-tts", input: "Hi", voice: "alloy", response_format: "wav", speed: 1.5 });
    const i = C.requestFor(withModel("OpenAI", { name: "alloy", instructions: "calm" }), "Hi");
    assert.equal(JSON.parse(i.Body).instructions, "calm");
  });
});

test("requestFor: Azure", async () => {
  await withServer("ok", (s) => {
    const r = C.requestFor(voice("Azure", { name: "en-US-JennyNeural", speed: 1.2 }), "Hi");
    assert.equal(r.Url, `${s.url}/cognitiveservices/v1`);
    assert.equal(headerOf(r, "Ocp-Apim-Subscription-Key"), KEY);
    assert.equal(headerOf(r, "Content-Type"), "application/ssml+xml");
    assert.equal(headerOf(r, "X-Microsoft-OutputFormat"), "riff-24khz-16bit-mono-pcm");
    assert.equal(headerOf(r, "User-Agent"), "codebase-video");
    assert.match(r.Body, /xml:lang="en-US"/);
    assert.match(r.Body, /<voice name="en-US-JennyNeural">/);
    assert.match(r.Body, /<prosody rate="\+20%">Hi<\/prosody>/);
  });
  delete process.env.CODEBASE_VIDEO_AZURE_URL;
  assert.equal(C.requestFor(voice("Azure"), "Hi").Url, "https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1");
});

test("requestFor: Google", async () => {
  await withServer("ok", (s) => {
    const r = C.requestFor(voice("Google", { name: "en-US-Neural2-A", speed: 0.9 }), "Hi");
    assert.equal(r.Url, `${s.url}/v1/text:synthesize?key=${KEY}`);
    assert.deepEqual(JSON.parse(r.Body), {
      input: { text: "Hi" },
      voice: { languageCode: "en-US", name: "en-US-Neural2-A" },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000, speakingRate: 0.9 },
    });
  });
});

test("SSML escapes the text", async () => {
  await withServer("ok", () => {
    const r = C.requestFor(voice("Azure"), `a < b & "c" 'd'`);
    assert.ok(r.Body.includes("a &lt; b &amp; &quot;c&quot; &apos;d&apos;"), r.Body);
  });
});

test("UTF-8 bodies arrive byte for byte", async () => {
  const text = "Café — 東京 ✓";
  for (const p of ["ElevenLabs", "OpenAI", "Azure", "Google"]) {
    await withServer("ok", async (s) => {
      ok(await speak(withModel(p), text));
      const body = s.requests[0].body.toString("utf8");
      assert.ok(p === "Azure" ? body.includes(text) : JSON.stringify(JSON.parse(body)).includes(text), p);
    });
  }
});

test("speak returns 24 kHz audio from each provider", async () => {
  for (const p of ["ElevenLabs", "OpenAI", "Azure", "Google"]) {
    await withServer("ok", async (s) => {
      const samples = ok(await speak(withModel(p)));
      assert.ok(Math.abs(samples.length - 12000) <= 120, `${p}: ${samples.length}`);
      assert.equal(s.requests.length, 1);
    });
  }
});

test("400 is refused with the service's message, without a retry", async () => {
  await withServer("400", async (s) => {
    assert.deepEqual(fieldsOf(bad(await speak(withModel("ElevenLabs")))), ["Refused", "ElevenLabs", 400, "voice not found"]);
    assert.equal(s.requests.length, 1);
    assert.deepEqual(fieldsOf(bad(await speak(withModel("OpenAI")))), ["Refused", "OpenAI", 400, "voice not found"]);
    assert.deepEqual(fieldsOf(bad(await speak(voice("Google")))), ["Refused", "Google", 400, "voice not found"]);
    assert.deepEqual(fieldsOf(bad(await speak(voice("Azure")))), ["Refused", "Azure", 400, "voice not found"]);
  });
});

test("429 is retried once", async () => {
  await withServer("429-once", async (s) => {
    ok(await speak(withModel("OpenAI")));
    assert.equal(s.requests.length, 2);
  });
});

test("two failures are reported", async () => {
  await withServer("fail-twice", async (s) => {
    const f = bad(await speak(withModel("OpenAI")));
    assert.deepEqual(fieldsOf(f), ["Refused", "OpenAI", 503, "try later"]);
    assert.equal(s.requests.length, 2);
  });
});

test("a server that is down is Unreachable after two attempts", async () => {
  setBase("http://127.0.0.1:9");
  const f = bad(await speak(withModel("ElevenLabs")));
  assert.equal(caseOf(f), "Unreachable");
  assert.equal(f.fields[0], "ElevenLabs");
});

test("a 200 that is not audio is refused", async () => {
  for (const p of ["ElevenLabs", "Google"]) {
    await withServer("html", async () => {
      const f = bad(await speak(withModel(p)));
      assert.equal(caseOf(f), "Refused");
      assert.equal(f.fields[1], 200);
      assert.match(f.fields[2], /not audio/);
    });
  }
});

test("the key never appears in a failure message", async () => {
  const secret = "sk-very-secret-123";
  for (const v of ["ELEVENLABS_API_KEY", "OPENAI_API_KEY", "AZURE_SPEECH_KEY", "GOOGLE_API_KEY"]) process.env[v] = secret;
  try {
    for (const mode of ["400", "fail-twice", "html"]) {
      for (const p of ["ElevenLabs", "OpenAI", "Azure", "Google"]) {
        await withServer(mode, async () => {
          assert.ok(!JSON.stringify(V.describe(bad(await speak(withModel(p))))).includes(secret), `${mode} ${p}`);
        });
      }
    }
    setBase("http://127.0.0.1:9");
    for (const p of ["ElevenLabs", "OpenAI", "Azure", "Google"]) {
      assert.ok(!JSON.stringify(V.describe(bad(await speak(withModel(p))))).includes(secret), `down ${p}`);
    }
  } finally {
    for (const v of ["ELEVENLABS_API_KEY", "OPENAI_API_KEY", "AZURE_SPEECH_KEY", "GOOGLE_API_KEY"]) process.env[v] = KEY;
  }
});

test("Kokoro is never spoken here", async () => {
  const v = new V.Voice(new V.Provider(0, []), "af_heart", undefined, undefined, "en-us", 1.0);
  assert.equal(caseOf(bad(await speak(v))), "SettingsBad");
});
