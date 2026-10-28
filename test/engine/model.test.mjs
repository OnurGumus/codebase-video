// The Kokoro model file: how setup and narrate see it, and the checked download that setup makes of it.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "model-"));
process.env.CODEBASE_VIDEO_HOME = path.join(tmp, "home");
const root = path.resolve(import.meta.dirname, "..", "..");
const lib = path.join(root, "engine", "cli", "fable_modules", "fable-library-js.5.19.0", "Async.js");
const { startAsPromise } = await import(pathToFileURL(lib).href);
const N = await import(pathToFileURL(path.join(root, "engine", "cli", "Narrate.js")).href);

const MODEL_BYTES = 325532232;
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

test("no model file -> missing", () => {
  assert.equal(N.modelState().tag, 1);
  assert.match(N.modelProblem(N.modelState()), /is not in/);
});

test("a short model file -> incomplete, with how much of it is there", () => {
  const file = N.modelFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.alloc(1000));
  fs.truncateSync(file, 222_000_000);
  const state = N.modelState();
  assert.equal(state.tag, 2);
  assert.equal(state.fields[0], 222_000_000);
  assert.match(N.modelProblem(state), /incomplete \(222 MB of 326 MB\)/);
});

test("a model file of the full size -> ready", () => {
  fs.truncateSync(N.modelFile(), MODEL_BYTES);
  assert.equal(N.modelState().tag, 0);
  fs.rmSync(N.modelFile());
});

/** A server that answers every request with `body`, or with a body cut short when `cut` is set. */
const serve = (body, cut = false) =>
  new Promise((resolve) => {
    const server = http.createServer((_, res) => {
      res.writeHead(200, { "Content-Length": body.length });
      if (cut) {
        res.write(body.subarray(0, body.length / 2));
        res.socket.destroy();
      } else res.end(body);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

const download = async (server, bytes, hash, dest) => {
  const address = `http://127.0.0.1:${server.address().port}/model.onnx`;
  try {
    await startAsPromise(N.downloadChecked(address, bytes, hash, dest));
  } finally {
    server.close();
  }
};

const BODY = crypto.randomBytes(64 * 1024);

test("a download of the expected size and hash lands at its name", async () => {
  const dest = path.join(tmp, "ok", "model.onnx");
  await download(await serve(BODY), BODY.length, sha256(BODY), dest);
  assert.deepEqual(fs.readFileSync(dest), BODY);
  assert.equal(fs.existsSync(dest + ".part"), false);
});

test("a download of the wrong size leaves nothing", async () => {
  const dest = path.join(tmp, "size", "model.onnx");
  await assert.rejects(download(await serve(BODY), BODY.length + 1, sha256(BODY), dest), /KB of|MB of/);
  assert.equal(fs.existsSync(dest), false);
  assert.equal(fs.existsSync(dest + ".part"), false);
});

test("a download with the wrong hash leaves nothing", async () => {
  const dest = path.join(tmp, "hash", "model.onnx");
  await assert.rejects(download(await serve(BODY), BODY.length, sha256("other"), dest), /SHA-256/);
  assert.equal(fs.existsSync(dest), false);
  assert.equal(fs.existsSync(dest + ".part"), false);
});

test("a download cut short leaves no file at its name", async () => {
  const dest = path.join(tmp, "cut", "model.onnx");
  await assert.rejects(download(await serve(BODY, true), BODY.length, sha256(BODY), dest));
  assert.equal(fs.existsSync(dest), false);
});

test("an existing file at the name is kept until the new download is complete", async () => {
  const dest = path.join(tmp, "replace", "model.onnx");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, "old");
  await assert.rejects(download(await serve(BODY, true), BODY.length, sha256(BODY), dest));
  assert.equal(fs.readFileSync(dest, "utf8"), "old");
  await download(await serve(BODY), BODY.length, sha256(BODY), dest);
  assert.deepEqual(fs.readFileSync(dest), BODY);
});
