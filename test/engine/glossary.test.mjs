import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "glossary-"));
const project = path.join(tmp, "repo", ".codebase-video");
const ws = path.join(project, "ws");
fs.mkdirSync(ws, { recursive: true });
fs.writeFileSync(path.join(project, "glossary.json"), JSON.stringify({ terms: { "213": "two thirteen" } }));
const root = path.resolve(import.meta.dirname, "..", "..");
const G = await import(pathToFileURL(path.join(root, "engine", "cli", "Glossary.js")).href);
const glossary = G.load(ws);
const say = (text) => G.apply(glossary, text);

test("a term on its own", () => {
  assert.equal(say("Ticket 213 is open."), "Ticket [213](two thirteen) is open.");
});

test("a term after a hyphen inside a word", () => {
  assert.equal(say("Ticket ABC-213 is open."), "Ticket ABC-[213](two thirteen) is open.");
  assert.equal(say("the session-ID field"), "the session-[ID](I D) field");
});

test("a term before a hyphen", () => {
  assert.equal(say("213-ABC"), "[213](two thirteen)-ABC");
});

test("two terms joined by a hyphen", () => {
  assert.equal(say("JSON-213"), "[JSON](jason)-[213](two thirteen)");
});

test("a leading hyphen is a minus sign or a flag, not a join", () => {
  assert.equal(say("It returns -213."), "It returns -213.");
  assert.equal(say("pass --JSON to it"), "pass --JSON to it");
});

test("a term inside a longer word or number is left alone", () => {
  assert.equal(say("ABC213 and 2130"), "ABC213 and 2130");
});

