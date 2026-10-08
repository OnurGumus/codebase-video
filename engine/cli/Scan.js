
import { Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { union_type, class_type, list_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { postAndAsyncReply, post, receive, start } from "./fable_modules/fable-library-js.5.19.0/MailboxProcessor.js";
import { singleton } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";
import { iterate, length, filter, toArray, ofArray, tryItem, empty, cons, reverse } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { eprint, toJson, writeText, join, requireFromHome, resolve } from "./Node.js";
import { toFixed, fromJs, findChrome, ServeFor, startServer } from "./Render.js";
import { min } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { concat } from "./fable_modules/fable-library-js.5.19.0/String.js";

const itemsAt = "(t) => {\n    window.render(t);\n    window.__ids ??= new WeakMap(); window.__n ??= 0;\n    const id = (e) => { if (!window.__ids.has(e)) window.__ids.set(e, ++window.__n); return window.__ids.get(e); };\n    const opacity = (el) => {\n      let op = 1;\n      for (let e = el; e && e.id !== \"stage\"; e = e.parentElement) {\n        const cs = getComputedStyle(e);\n        if (cs.display === \"none\" || cs.visibility === \"hidden\") return 0;\n        op *= parseFloat(cs.opacity);\n      }\n      return op;\n    };\n    const layer = (el) => { let r = el; while (r.parentElement && r.parentElement.id !== \"modules\" && r.parentElement.id !== \"stage\") r = r.parentElement; return r.id || r.className; };\n    const res = [], seen = new Set();\n    const walker = document.createTreeWalker(document.getElementById(\"stage\"), NodeFilter.SHOW_TEXT);\n    while (walker.nextNode()) {\n      const el = walker.currentNode.parentElement;\n      if (!walker.currentNode.textContent.trim() || seen.has(el)) continue;\n      seen.add(el);\n      const op = opacity(el);\n      if (op < 0.05) continue;\n      const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect();\n      const path = []; for (let a = el; a && a.id !== \"stage\"; a = a.parentElement) path.push(id(a));\n      res.push({ id: id(el), path: path.join(\"/\"), txt: el.textContent.trim().slice(0, 90), op: +op.toFixed(2),\n        x: Math.round(r.left), y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(el),\n        ...(el.closest(\".k-packet\") ? { pk: 1 } : {}) });\n    }\n    // Boxes (code cards, diagram nodes, tables): text may sit inside them, but must not straddle their border.\n    for (const box of document.querySelectorAll(\"#modules .k-code, #modules .k-node, #modules .k-table\")) {\n      const op = opacity(box), r = box.getBoundingClientRect();\n      if (op < 0.05 || r.width < 2) continue;\n      res.push({ id: id(box), path: \"box\", txt: `BOX[${box.className}]`, op: +op.toFixed(2), x: Math.round(r.left),\n        y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(box), box: 1 });\n    }\n    for (const svg of document.querySelectorAll(\"#modules svg\")) {\n      if (svg.parentElement.closest(\"svg\")) continue;\n      const op = opacity(svg), r = svg.getBoundingClientRect();\n      if (op < 0.05 || r.width < 2) continue;\n      const fills = [...new Set([...svg.querySelectorAll(\"[fill]\")].map((x) => x.getAttribute(\"fill\")))].slice(0, 6).join(\",\");\n      res.push({ id: id(svg), path: \"svg\", txt: `SVG[${fills}]`, op: +op.toFixed(2), x: Math.round(r.left), y: Math.round(r.top),\n        r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(svg), svg: 1 });\n    }\n    return res;\n  }";

class LogMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Line", "Lines"];
    }
}

function LogMsg_$reflection() {
    return union_type("Scan.LogMsg", [], LogMsg, () => [[["Item", string_type]], [["Item", class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [list_type(string_type)])]]]);
}

function startLog() {
    return start((inbox) => {
        const loop = (lines) => singleton.Delay(() => singleton.Bind(receive(inbox), (_arg) => ((_arg.tag === 1) ? singleton.Combine(singleton.TryWith(singleton.Delay(() => {
            _arg.fields[0].reply(reverse(lines));
            return singleton.Zero();
        }), (_arg_1) => {
            return singleton.Zero();
        }), singleton.Delay(() => singleton.ReturnFrom(loop(lines)))) : singleton.ReturnFrom(loop(cons(_arg.fields[0], lines))))));
        return loop(empty());
    });
}

export function run(ws, args) {
    const arg = (n, fallback) => defaultArg(tryItem(n, args), fallback);
    const matchValue = Number(arg(0, "0"));
    const matchValue_1 = Number(arg(1, "1e9"));
    const step = Number(arg(2, "0.25"));
    const clip = resolve(ws);
    return singleton.Delay(() => singleton.Bind(startServer(clip, ServeFor.ForScan), (_arg) => {
        const server = _arg;
        const matchValue_3 = findChrome();
        if (matchValue_3 != null) {
            const chrome = matchValue_3;
            const puppeteer = requireFromHome("puppeteer-core");
            return singleton.Bind(fromJs(puppeteer.launch({
                executablePath: chrome,
                headless: true,
                args: ["--font-render-hinting=none"],
            })), (_arg_1) => {
                const browser = _arg_1;
                return singleton.Bind(fromJs(browser.newPage()), (_arg_2) => {
                    const page = _arg_2;
                    const log = startLog();
                    page.on("console", ((m) => {
                        post(log, new LogMsg(/* Line */ 0, [m.text()]));
                    }));
                    page.on("pageerror", ((e) => {
                        post(log, new LogMsg(/* Line */ 0, ["PAGE ERROR " + e.message]));
                    }));
                    return singleton.Bind(fromJs(page.setViewport({
                        width: 1920,
                        height: 1080,
                    })), () => singleton.Bind(fromJs(page.goto(server.Url, {
                        waitUntil: "load",
                    })), () => singleton.Bind(fromJs(page.evaluate((0, eval)('(' + "() => window.ready" + ')'))), () => singleton.Bind(fromJs(page.evaluate((0, eval)('(' + "() => window.DURATION" + ')'))), (_arg_6) => {
                        const d = _arg_6;
                        const scanAt = (0, eval)('(' + itemsAt + ')');
                        const sample = (t, frames, count) => singleton.Delay(() => ((t <= min(matchValue_1, d)) ? singleton.Bind(fromJs(page.evaluate(scanAt, t)), (_arg_7) => {
                            const frames_1 = cons({
                                t: Number(toFixed(2, t)),
                                items: _arg_7,
                            }, frames);
                            const count_1 = ((count + 1) | 0) | 0;
                            return singleton.Combine(((count_1 % 200) === 0) ? ((void ((process).stdout.write("\r" + concat(toFixed(0, t), "s / ", toFixed(0, d), "s"))), singleton.Zero())) : singleton.Zero(), singleton.Delay(() => singleton.ReturnFrom(sample(t + step, frames_1, count_1))));
                        }) : singleton.Return([frames, count])));
                        return singleton.Bind(sample(matchValue, empty(), 0), (_arg_8) => singleton.Bind(postAndAsyncReply(log, (Item) => (new LogMsg(/* Lines */ 1, [Item]))), (_arg_9) => {
                            const logs = _arg_9;
                            const out = join(ofArray([clip, "build", "scan.json"]));
                            writeText(out, toJson({
                                step: step,
                                logs: toArray(logs),
                                frames: toArray(reverse(_arg_8[0])),
                            }));
                            const errors = filter((line) => (/error|failed/i.test(line) && !/Failed to load resource/.test(line)), logs);
                            console.log(`
${_arg_8[1]} frames, ${length(errors)} page errors -> ${out}`);
                            iterate((l) => {
                                console.log("  " + l);
                            }, errors);
                            return singleton.Bind(fromJs(browser.close()), () => {
                                server.Close();
                                return singleton.Return(0);
                            });
                        }));
                    }))));
                });
            });
        }
        else {
            eprint("no Chrome found: set CHROME to the browser\'s executable");
            server.Close();
            return singleton.Return(2);
        }
    }));
}

