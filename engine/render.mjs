// Renders a clip's clip.html frame by frame in headless Chrome (CHROME overrides the browser path).
//   node render.mjs <clip-dir> stills 3 12.5 ...  -> build/still-<t>.png, for checking a layout
//   node render.mjs <clip-dir> sheet              -> build/sheet-<n>.png: a labelled still for every narrated sentence
//   node render.mjs <clip-dir> sheet g1 g2        -> build/sheet-g1-g2-<n>.png: only scenes of those modules (ids "g1-…"),
//                                                    so builders working on one clip in parallel never touch each other's sheets
//   node render.mjs <clip-dir> video [fps]        -> every frame, losslessly into build/frames.mkv
//   node render.mjs <clip-dir> serve              -> prints a URL to preview the clip with its narration
// The clip directory is served as the site root and this engine directory as /engine/, so clip.html loads
// /engine/stage.js wherever the clip lives. Frames render in WORKERS parallel pages (default 4), written in order.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const ENGINE = resolve(fileURLToPath(new URL(".", import.meta.url)));
// puppeteer-core lives in the tool home (setup.sh installs it), so the engine itself can sit in a read-only plugin cache.
const HOME = process.env.CODEBASE_VIDEO_HOME ?? join(homedir(), ".cache", "codebase-video");
const puppeteer = createRequire(join(HOME, "node", "package.json"))("puppeteer-core");
const [clipArg, mode = "video", ...rest] = process.argv.slice(2);
if (!clipArg) {
  console.error("usage: node render.mjs <clip-dir> stills|video|serve [...]");
  process.exit(2);
}
const clip = resolve(clipArg);
const chrome = () => process.env.CHROME ?? [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find((p) => existsSync(p)) ?? (console.error("no Chrome found: set CHROME to the browser's executable"), process.exit(2));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".wav": "audio/wav", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204).end(); return; }
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const [base, rel] = url.startsWith("/engine/") ? [ENGINE, url.slice("/engine/".length)] : [clip, url.slice(1)];
  const path = resolve(join(base, rel));
  if (!path.startsWith(base + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/clip.html`;

if (mode === "serve") {
  console.log(`${url}?preview   (click the page to start; ?t=12.5 freezes one moment)`);
  console.log("Ctrl+C to stop.");
} else {
  const browser = await puppeteer.launch({
    executablePath: chrome(),
    headless: true,
    args: ["--font-render-hinting=none", "--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required"],
  });
  let failed = false;
  async function openPage() {
    const page = await browser.newPage();
    page.on("pageerror", (e) => { failed = true; console.error("page error:", e.message); });
    page.on("console", (m) => console.log("page:", m.text()));
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => window.ready);
    return page;
  }
  async function frame(page, t) {
    await page.evaluate((t) => window.render(t), t);
    return page.screenshot({ type: "png", optimizeForSpeed: true });
  }

  const first = await openPage();
  const duration = await first.evaluate(() => window.DURATION);
  if (mode === "stills") {
    const times = rest.length ? rest.map(Number) : [await first.evaluate(() => window.TIMING.poster)];
    for (const t of times) {
      const file = join(clip, "build", `still-${t.toFixed(2)}.png`);
      await writeFile(file, await frame(first, t));
      console.log(file);
    }
  } else if (mode === "sheet") {
    // One still late in each sentence (after its transitions), labelled, six to a sheet.
    const T = await first.evaluate(() => window.TIMING);
    const only = rest.filter(Boolean);
    const tag = only.length ? `${only.join("-")}-` : "";
    const wanted = (id) => !only.length || only.some((k) => id === k || id.split("-")[0] === k || id.startsWith(`${k}-`));
    const beats = T.scenes.filter((s) => wanted(s.id)).flatMap((s) => s.sentences.map((c, i) =>
      ({ t: c.start + 0.75 * (c.end - c.start), label: `${(c.start + 0.75 * (c.end - c.start)).toFixed(1)}s  ${s.id}[${i}]  ${c.text}` })));
    if (!only.length) beats.push({ t: T.duration - 0.05, label: `${T.duration.toFixed(1)}s  end` });
    if (!beats.length) { console.error(`no scenes match ${only.join(" ")}`); process.exit(2); }
    if (only.length) {
      // Clear this filter's old sheets only; everyone else's stay.
      for (const f of await readdir(join(clip, "build"))) if (f.startsWith(`sheet-${tag}`) || f.startsWith(`beat-${tag}`)) await unlink(join(clip, "build", f));
    }
    const files = [];
    for (const [k, b] of beats.entries()) {
      await first.evaluate((t, label) => {
        window.render(t);
        let tag = document.getElementById("sheet-label");
        if (!tag) {
          tag = document.createElement("div");
          tag.id = "sheet-label";
          tag.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99;padding:6px 14px;background:#000d;color:#ffd84d;font:600 34px/1.25 monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
          document.body.append(tag);
        }
        tag.textContent = label;
      }, b.t, b.label);
      const file = join(clip, "build", `beat-${tag}${String(k).padStart(2, "0")}.png`);
      await writeFile(file, await first.screenshot({ type: "png" }));
      files.push(file);
    }
    for (let n = 0; n * 6 < files.length; n++) {
      const group = files.slice(n * 6, n * 6 + 6);
      while (group.length < 6) group.push(group[group.length - 1]);
      const scaled = group.map((_, i) => `[${i}]scale=960:-1[t${i}]`).join(";");
      const stack = group.map((_, i) => `[t${i}]`).join("") + "xstack=inputs=6:layout=0_0|w0_0|0_h0|w0_h0|0_h0+h0|w0_h0+h0";
      const out = join(clip, "build", `sheet-${tag}${n + 1}.png`);
      await new Promise((ok, fail) => spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...group.flatMap((f) => ["-i", f]),
        "-filter_complex", `${scaled};${stack}`, out], { stdio: "inherit" }).on("close", (c) => (c ? fail(new Error(`ffmpeg ${c}`)) : ok())));
      console.log(out);
    }
  } else {
    const fps = Number(rest[0] ?? 30);
    const total = Math.ceil(duration * fps);
    const workers = [first];
    for (let i = 1; i < Number(process.env.WORKERS ?? 4); i++) workers.push(await openPage());
    const ff = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
      "-c:v", "ffv1", "-pix_fmt", "yuv444p", join(clip, "build", "frames.mkv")], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Map();
    let next = 0, written = 0;
    const start = Date.now();
    async function flush() {
      while (done.has(written)) {
        const buf = done.get(written);
        done.delete(written++);
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      }
    }
    await Promise.all(workers.map(async (page) => {
      while (next < total && !failed) {
        const i = next++;
        done.set(i, await frame(page, i / fps));
        // Keep the reorder buffer bounded: a fast worker waits for the writer to catch up.
        while (i - written > workers.length * 8) await new Promise((r) => setTimeout(r, 5));
        await flush();
        if (i % fps === 0) process.stdout.write(`\r${(i / fps).toFixed(0)}s / ${duration.toFixed(0)}s`);
      }
    }));
    await flush();
    ff.stdin.end();
    await new Promise((r) => ff.on("close", r));
    console.log(`\nrendered ${total} frames in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  }
  await browser.close();
  server.close();
  if (failed) process.exit(1);
}
