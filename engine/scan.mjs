// Read-only scan of a clip for the final visual re-audit: renders every `step` seconds and records each visible text
// element and top-level module SVG with its box and effective opacity, plus any page errors, into build/scan.json.
//   node scan.mjs <clip-dir> [t0=0] [t1=end] [step=0.25]
// scan_report.py turns it into findings (short-lived text, overlaps, empty stages, out-of-bounds, blinks).
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const ENGINE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const HOME = process.env.CODEBASE_VIDEO_HOME ?? join(homedir(), ".cache", "codebase-video");
const puppeteer = createRequire(join(HOME, "node", "package.json"))("puppeteer-core");
const [clipArg, t0 = "0", t1 = "1e9", step = "0.25"] = process.argv.slice(2);
if (!clipArg) { console.error("usage: node scan.mjs <clip-dir> [t0] [t1] [step]"); process.exit(2); }
const clip = resolve(clipArg);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const [base, rel] = url.startsWith("/engine/") ? [ENGINE, url.slice(8)] : [clip, url.slice(1)];
  const path = resolve(join(base, rel));
  if (!path.startsWith(base + sep) || path.endsWith(".wav")) { res.writeHead(404).end(); return; }
  let body;
  try { body = await readFile(path); } catch { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const chrome = process.env.CHROME ?? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--font-render-hinting=none"] });
const page = await browser.newPage();
const logs = [];
page.on("console", (m) => logs.push(m.text()));
page.on("pageerror", (e) => logs.push("PAGE ERROR " + e.message));
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(`http://127.0.0.1:${server.address().port}/clip.html`, { waitUntil: "load" });
await page.evaluate(() => window.ready);
const D = await page.evaluate(() => window.DURATION);
const frames = [];
for (let t = Number(t0); t <= Math.min(Number(t1), D); t += Number(step)) {
  frames.push({ t: +t.toFixed(2), items: await page.evaluate((t) => {
    window.render(t);
    window.__ids ??= new WeakMap(); window.__n ??= 0;
    const id = (e) => { if (!window.__ids.has(e)) window.__ids.set(e, ++window.__n); return window.__ids.get(e); };
    const opacity = (el) => {
      let op = 1;
      for (let e = el; e && e.id !== "stage"; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden") return 0;
        op *= parseFloat(cs.opacity);
      }
      return op;
    };
    const layer = (el) => { let r = el; while (r.parentElement && r.parentElement.id !== "modules" && r.parentElement.id !== "stage") r = r.parentElement; return r.id || r.className; };
    const res = [], seen = new Set();
    const walker = document.createTreeWalker(document.getElementById("stage"), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const el = walker.currentNode.parentElement;
      if (!walker.currentNode.textContent.trim() || seen.has(el)) continue;
      seen.add(el);
      const op = opacity(el);
      if (op < 0.05) continue;
      const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect();
      const path = []; for (let a = el; a && a.id !== "stage"; a = a.parentElement) path.push(id(a));
      res.push({ id: id(el), path: path.join("/"), txt: el.textContent.trim().slice(0, 90), op: +op.toFixed(2),
        x: Math.round(r.left), y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(el),
        ...(el.closest(".k-packet") ? { pk: 1 } : {}) });
    }
    // Boxes (code cards, diagram nodes, tables): text may sit inside them, but must not straddle their border.
    for (const box of document.querySelectorAll("#modules .k-code, #modules .k-node, #modules .k-table")) {
      const op = opacity(box), r = box.getBoundingClientRect();
      if (op < 0.05 || r.width < 2) continue;
      res.push({ id: id(box), path: "box", txt: `BOX[${box.className}]`, op: +op.toFixed(2), x: Math.round(r.left),
        y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(box), box: 1 });
    }
    for (const svg of document.querySelectorAll("#modules svg")) {
      if (svg.parentElement.closest("svg")) continue;
      const op = opacity(svg), r = svg.getBoundingClientRect();
      if (op < 0.05 || r.width < 2) continue;
      const fills = [...new Set([...svg.querySelectorAll("[fill]")].map((x) => x.getAttribute("fill")))].slice(0, 6).join(",");
      res.push({ id: id(svg), path: "svg", txt: `SVG[${fills}]`, op: +op.toFixed(2), x: Math.round(r.left), y: Math.round(r.top),
        r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(svg), svg: 1 });
    }
    return res;
  }, t) });
  if (frames.length % 200 === 0) process.stdout.write(`\r${t.toFixed(0)}s / ${D.toFixed(0)}s`);
}
await writeFile(join(clip, "build", "scan.json"), JSON.stringify({ step: Number(step), logs, frames }));
console.log(`\n${frames.length} frames, ${logs.filter((l) => /error|failed/i.test(l) && !/Failed to load resource/.test(l)).length} page errors -> ${join(clip, "build", "scan.json")}`);
for (const l of logs) if (/error|failed/i.test(l) && !/Failed to load resource/.test(l)) console.log("  " + l);
await browser.close(); server.close();
