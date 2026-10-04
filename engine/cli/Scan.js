
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { length, ofSeq, ofArray, tryItem } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { eprint, toJson, writeText, join, requireFromHome, resolve } from "./Node.js";
import { PromiseBuilder__For_1565554B, PromiseBuilder__While_2044D34, PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "./fable_modules/Fable.Promise.3.2.1/Promise.fs.js";
import { promise } from "./fable_modules/Fable.Promise.3.2.1/PromiseImpl.fs.js";
import { toFixed, awaitJs, findChrome, ServeFor, startServer } from "./Render.js";
import { FSharpRef } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { min } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { filter } from "./fable_modules/fable-library-js.5.19.0/Seq.js";

const itemsAt = "(t) => {\n    window.render(t);\n    window.__ids ??= new WeakMap(); window.__n ??= 0;\n    const id = (e) => { if (!window.__ids.has(e)) window.__ids.set(e, ++window.__n); return window.__ids.get(e); };\n    const opacity = (el) => {\n      let op = 1;\n      for (let e = el; e && e.id !== \"stage\"; e = e.parentElement) {\n        const cs = getComputedStyle(e);\n        if (cs.display === \"none\" || cs.visibility === \"hidden\") return 0;\n        op *= parseFloat(cs.opacity);\n      }\n      return op;\n    };\n    const layer = (el) => { let r = el; while (r.parentElement && r.parentElement.id !== \"modules\" && r.parentElement.id !== \"stage\") r = r.parentElement; return r.id || r.className; };\n    const res = [], seen = new Set();\n    const walker = document.createTreeWalker(document.getElementById(\"stage\"), NodeFilter.SHOW_TEXT);\n    while (walker.nextNode()) {\n      const el = walker.currentNode.parentElement;\n      if (!walker.currentNode.textContent.trim() || seen.has(el)) continue;\n      seen.add(el);\n      const op = opacity(el);\n      if (op < 0.05) continue;\n      const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect();\n      const path = []; for (let a = el; a && a.id !== \"stage\"; a = a.parentElement) path.push(id(a));\n      res.push({ id: id(el), path: path.join(\"/\"), txt: el.textContent.trim().slice(0, 90), op: +op.toFixed(2),\n        x: Math.round(r.left), y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(el),\n        ...(el.closest(\".k-packet\") ? { pk: 1 } : {}) });\n    }\n    // Boxes (code cards, diagram nodes, tables): text may sit inside them, but must not straddle their border.\n    for (const box of document.querySelectorAll(\"#modules .k-code, #modules .k-node, #modules .k-table\")) {\n      const op = opacity(box), r = box.getBoundingClientRect();\n      if (op < 0.05 || r.width < 2) continue;\n      res.push({ id: id(box), path: \"box\", txt: `BOX[${box.className}]`, op: +op.toFixed(2), x: Math.round(r.left),\n        y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(box), box: 1 });\n    }\n    for (const svg of document.querySelectorAll(\"#modules svg\")) {\n      if (svg.parentElement.closest(\"svg\")) continue;\n      const op = opacity(svg), r = svg.getBoundingClientRect();\n      if (op < 0.05 || r.width < 2) continue;\n      const fills = [...new Set([...svg.querySelectorAll(\"[fill]\")].map((x) => x.getAttribute(\"fill\")))].slice(0, 6).join(\",\");\n      res.push({ id: id(svg), path: \"svg\", txt: `SVG[${fills}]`, op: +op.toFixed(2), x: Math.round(r.left), y: Math.round(r.top),\n        r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(svg), svg: 1 });\n    }\n    return res;\n  }";

export function run(ws, args) {
    const arg = (n, fallback) => defaultArg(tryItem(n, args), fallback);
    const matchValue = Number(arg(0, "0"));
    const matchValue_1 = Number(arg(1, "1e9"));
    const step = Number(arg(2, "0.25"));
    const clip = resolve(ws);
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (startServer(clip, ServeFor.ForScan).then((_arg) => {
        const server = _arg;
        const matchValue_3 = findChrome();
        if (matchValue_3 != null) {
            const chrome = matchValue_3;
            const puppeteer = requireFromHome("puppeteer-core");
            return awaitJs(puppeteer.launch({
                executablePath: chrome,
                headless: true,
                args: ["--font-render-hinting=none"],
            })).then((_arg_1) => {
                const browser = _arg_1;
                return awaitJs(browser.newPage()).then((_arg_2) => {
                    const page = _arg_2;
                    const logs = [];
                    page.on("console", ((m) => {
                        void (logs.push(m.text()));
                    }));
                    page.on("pageerror", ((e) => {
                        void (logs.push("PAGE ERROR " + e.message));
                    }));
                    return awaitJs(page.setViewport({
                        width: 1920,
                        height: 1080,
                    })).then(() => (awaitJs(page.goto(server.Url, {
                        waitUntil: "load",
                    })).then(() => (awaitJs(page.evaluate((0, eval)('(' + "() => window.ready" + ')'))).then(() => (awaitJs(page.evaluate((0, eval)('(' + "() => window.DURATION" + ')'))).then((_arg_6) => {
                        const d = _arg_6;
                        const frames = [];
                        const scanAt = (0, eval)('(' + itemsAt + ')');
                        const t = new FSharpRef(matchValue);
                        return PromiseBuilder__While_2044D34(promise, () => (t.contents <= min(matchValue_1, d)), PromiseBuilder__Delay_62FBFDE1(promise, () => {
                            const now = t.contents;
                            return awaitJs(page.evaluate(scanAt, now)).then((_arg_7) => {
                                void (frames.push({
                                    t: Number(toFixed(2, now)),
                                    items: _arg_7,
                                }));
                                return (((frames.length % 200) === 0) ? ((void ((process).stdout.write("\r" + concat(toFixed(0, now), "s / ", toFixed(0, d), "s"))), Promise.resolve())) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                                    t.contents = (now + step);
                                    return Promise.resolve();
                                }));
                            });
                        })).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                            const out = join(ofArray([clip, "build", "scan.json"]));
                            writeText(out, toJson({
                                step: step,
                                logs: logs,
                                frames: frames,
                            }));
                            const errors = ofSeq(filter((line) => (/error|failed/i.test(line) && !/Failed to load resource/.test(line)), logs));
                            console.log(`
${frames.length} frames, ${length(errors)} page errors -> ${out}`);
                            return PromiseBuilder__For_1565554B(promise, errors, (_arg_8) => {
                                console.log("  " + _arg_8);
                                return Promise.resolve();
                            }).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => (awaitJs(browser.close()).then(() => {
                                server.Close();
                                return Promise.resolve(0);
                            }))));
                        }));
                    })))))));
                });
            });
        }
        else {
            eprint("no Chrome found: set CHROME to the browser\'s executable");
            server.Close();
            return Promise.resolve(2);
        }
    }))));
}

