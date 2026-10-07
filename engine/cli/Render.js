
import { toArray, ofSeq as ofSeq_1, chunkBySize, iterateIndexed, indexed, filter as filter_1, collect as collect_1, length, truncate, mapIndexed, append, exists as exists_1, map, singleton, isEmpty, tryFind, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { requireFromHome, childProcess, remove, readDir, eprint, run as run_1, writeBytes, extname, fsp, sep as sep_3, join, engineDir, http, resolve, exists, env } from "./Node.js";
import { FSharpRef, Record, Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { list_type, int32_type, float64_type, class_type, record_type, lambda_type, unit_type, string_type, union_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { tryFind as tryFind_1, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { disposeSafe, getEnumerator, int32ToString, Exception, equals, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { padLeft, join as join_1, split, concat, substring } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { PromiseBuilder__While_2044D34, PromiseBuilder__For_1565554B, PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "./fable_modules/Fable.Promise.3.2.1/Promise.fs.js";
import { promise } from "./fable_modules/Fable.Promise.3.2.1/PromiseImpl.fs.js";
import { item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { map as map_1, empty, singleton as singleton_1, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { rangeDouble } from "./fable_modules/fable-library-js.5.19.0/Range.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { isDigit } from "./fable_modules/fable-library-js.5.19.0/Char.js";

export function toFixed(digits, x) {
    return x.toFixed(digits);
}

export function awaitJs(p) {
    return p;
}

function stdoutWrite(s) {
    (process).stdout.write(s);
}

const chromePaths = ofArray(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "C:/Program Files/Google/Chrome/Application/chrome.exe"]);

/**
 * CHROME, else the first browser found in the usual places.
 */
export function findChrome() {
    const matchValue = env("CHROME");
    if (matchValue == null) {
        return tryFind(exists, chromePaths);
    }
    else {
        return matchValue;
    }
}

/**
 * Who the server is for. The scan's server (scan.mjs) differs on purpose: it answers 404 for .wav (no audio is
 * needed to scan), knows fewer types, and sends no cache header. Its 404s show up in scan.json's logs, so keep them.
 */
export class ServeFor extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["ForRender", "ForScan"];
    }
    static ForRender = new ServeFor(0, []);
    static ForScan = new ServeFor(1, []);
}

export function ServeFor_$reflection() {
    return union_type("Render.ServeFor", [], ServeFor, () => [[], []]);
}

const renderTypes = ofSeq([[".html", "text/html"], [".js", "text/javascript"], [".css", "text/css"], [".json", "application/json"], [".wav", "audio/wav"], [".png", "image/png"], [".jpg", "image/jpeg"], [".svg", "image/svg+xml"], [".woff2", "font/woff2"]], {
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
});

const scanTypes = ofSeq([[".html", "text/html"], [".js", "text/javascript"], [".css", "text/css"], [".json", "application/json"], [".png", "image/png"], [".jpg", "image/jpeg"], [".svg", "image/svg+xml"], [".woff2", "font/woff2"]], {
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
});

/**
 * A running static server and the clip.html URL it serves.
 */
export class Server extends Record {
    constructor(Url, Close) {
        super();
        this.Url = Url;
        this.Close = Close;
    }
}

export function Server_$reflection() {
    return record_type("Render.Server", [], Server, () => [["Url", string_type], ["Close", lambda_type(unit_type, unit_type)]]);
}

/**
 * Serves the clip directory as the root and the engine directory as /engine/, on a free localhost port.
 */
export function startServer(ws, flavour) {
    const clip = resolve(ws);
    const types = equals(flavour, ServeFor.ForRender) ? renderTypes : scanTypes;
    const server = http.createServer((delegateArg, delegateArg_1) => {
        const res = delegateArg_1;
        const reqUrl = delegateArg.url;
        if (equals(flavour, ServeFor.ForRender) && (reqUrl === "/favicon.ico")) {
            (res.writeHead(204)).end();
        }
        else {
            const url = decodeURIComponent(new URL(reqUrl, 'http://x').pathname);
            const patternInput = url.startsWith("/engine/") ? [engineDir, substring(url, "/engine/".length)] : [clip, substring(url, 1)];
            const baseDir = patternInput[0];
            const file = resolve(join(ofArray([baseDir, patternInput[1]])));
            if (!file.startsWith(baseDir + sep_3)) {
                (res.writeHead(403)).end();
            }
            else if (equals(flavour, ServeFor.ForScan) && file.endsWith(".wav")) {
                (res.writeHead(404)).end();
            }
            else {
                awaitJs(fsp.readFile(file)).then((body) => {
                    const contentType = defaultArg(tryFind_1(extname(file), types), "application/octet-stream");
                    const headers = equals(flavour, ServeFor.ForRender) ? {
                        "content-type": contentType,
                        "cache-control": "no-store",
                    } : {
                        "content-type": contentType,
                    };
                    (res.writeHead(200, headers)).end(body);
                }, (_arg) => {
                    (res.writeHead(404)).end();
                });
            }
        }
    });
    return new Promise((ok, _arg_1) => {
        server.listen(0, "127.0.0.1", (() => {
            ok(new Server(`http://127.0.0.1:${(server.address()).port}/clip.html`, () => {
                server.close();
            }));
        }));
    });
}

const renderAt = (0, eval)('(' + "(t) => window.render(t)" + ')');

const labelled = "(t, label) => {\n        window.render(t);\n        let tag = document.getElementById(\"sheet-label\");\n        if (!tag) {\n          tag = document.createElement(\"div\");\n          tag.id = \"sheet-label\";\n          tag.style.cssText = \"position:fixed;left:0;right:0;top:0;z-index:99;padding:6px 14px;background:#000d;color:#ffd84d;font:600 34px/1.25 monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\";\n          document.body.append(tag);\n        }\n        tag.textContent = label;\n      }";

const imagesLoaded = "() => Promise.all(Array.from(document.images, (img) =>\n        (img.complete ? Promise.resolve() : new Promise((ok) => {\n          img.addEventListener(\"load\", ok, { once: true });\n          img.addEventListener(\"error\", ok, { once: true });\n        })).then(() => img.decode().catch(() => {})))).then(() => true)";

class Session {
    constructor(browser, url) {
        this.browser = browser;
        this.url = url;
        this.failed = false;
    }
}

function Session_$reflection() {
    return class_type("Render.Session", undefined, Session);
}

function Session_$ctor_Z6861C5C0(browser, url) {
    return new Session(browser, url);
}

function Session__get_Failed(_) {
    return _.failed;
}

function Session__OpenPage(_) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (awaitJs(_.browser.newPage()).then((_arg) => {
        const page = _arg;
        page.on("pageerror", ((e) => {
            _.failed = true;
            console.error("page error:", e.message);
        }));
        page.on("console", ((m) => {
            console.log("page:", (m.text()));
        }));
        return awaitJs(page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        })).then(() => (awaitJs(page.goto(_.url, {
            waitUntil: "load",
        })).then(() => (awaitJs(page.evaluate((0, eval)('(' + "() => window.ready" + ')'))).then(() => (awaitJs(page.evaluate((0, eval)('(' + imagesLoaded + ')'))).then(() => (Promise.resolve(page)))))))));
    }))));
}

function frame(page, t) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (awaitJs(page.evaluate(renderAt, t)).then(() => (awaitJs(page.screenshot({
        type: "png",
        optimizeForSpeed: true,
    })))))));
}

function evalIn(page, source) {
    return awaitJs(page.evaluate((0, eval)('(' + source + ')')));
}

function stills(ws, first, args) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let pr;
        return (isEmpty(args) ? ((pr = evalIn(first, "() => window.TIMING.poster"), pr.then(singleton))) : (Promise.resolve(map((s) => (Number(s)), args)))).then((_arg) => PromiseBuilder__For_1565554B(promise, _arg, (_arg_1) => {
            const t = _arg_1;
            const file = join(ofArray([ws, "build", concat("still-", toFixed(2, t), ".png")]));
            return frame(first, t).then((_arg_2) => {
                writeBytes(file, _arg_2);
                console.log(file);
                return Promise.resolve();
            });
        }));
    }));
}

class Beat extends Record {
    constructor(T, Label) {
        super();
        this.T = T;
        this.Label = Label;
    }
}

function Beat_$reflection() {
    return record_type("Render.Beat", [], Beat, () => [["T", float64_type], ["Label", string_type]]);
}

function wanted(only, id) {
    if (isEmpty(only)) {
        return true;
    }
    else {
        return exists_1((k) => {
            if ((id === k) ? true : (item(0, split(id, ["-"], undefined, 0)) === k)) {
                return true;
            }
            else {
                return id.startsWith(k + "-");
            }
        }, only);
    }
}

function beatsOf(timing, only) {
    const scenes = timing.scenes;
    const sentenceBeats = toList(delay(() => collect((s) => {
        const id = s.id;
        if (wanted(only, id)) {
            const sentences = s.sentences;
            return collect((i) => {
                const c = item(i, sentences);
                const start = c.start;
                const t = start + (0.75 * (c.end - start));
                const text = c.text;
                return singleton_1(new Beat(t, `${toFixed(1, t)}s  ${id}[${i}]  ${text}`));
            }, rangeDouble(0, 1, sentences.length - 1));
        }
        else {
            return empty();
        }
    }, scenes)));
    const duration = timing.duration;
    if (isEmpty(only)) {
        return append(sentenceBeats, singleton(new Beat(duration - 0.05, concat(toFixed(1, duration), "s  end"))));
    }
    else {
        return sentenceBeats;
    }
}

function writeSheet(out, group) {
    const scaled = join_1(";", mapIndexed((i, _arg) => (`[${i}]scale=960:-1[t${i}]`), group));
    const cells = join_1("|", truncate(length(group), ofArray(["0_0", "w0_0", "0_h0", "w0_h0", "0_h0+h0", "w0_h0+h0"])));
    const filter = (length(group) === 1) ? "[0]scale=960:-1" : concat(scaled, ";", join_1("", mapIndexed((i_1, _arg_1) => (`[t${i_1}]`), group)) + (`xstack=inputs=${length(group)}:layout=${cells}:fill=black`));
    const code = run_1("ffmpeg", append(ofArray(["-hide_banner", "-loglevel", "error", "-y"]), append(collect_1((f) => ofArray(["-i", f]), group), ofArray(["-filter_complex", filter, out])))) | 0;
    if (code !== 0) {
        throw new Exception(`ffmpeg ${code}`);
    }
}

function sheet(ws, first, args) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (evalIn(first, "() => window.TIMING").then((_arg) => {
        const only = filter_1((a) => (a !== ""), args);
        const tag = isEmpty(only) ? "" : (join_1("-", only) + "-");
        const beats = beatsOf(_arg, only);
        if (isEmpty(beats)) {
            eprint(concat("no scenes match ", join_1(" ", only)));
            return Promise.resolve(2);
        }
        else {
            const build = join(ofArray([ws, "build"]));
            return (!isEmpty(only) ? PromiseBuilder__For_1565554B(promise, readDir(build), (_arg_1) => {
                const f = _arg_1;
                if (f.startsWith(concat("sheet-", tag)) ? true : f.startsWith(concat("beat-", tag))) {
                    remove(join(ofArray([build, f])));
                    return Promise.resolve();
                }
                else {
                    return Promise.resolve();
                }
            }) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                const files = [];
                return PromiseBuilder__For_1565554B(promise, indexed(beats), (_arg_2) => {
                    const b = _arg_2[1];
                    return awaitJs(first.evaluate(((0, eval)('(' + labelled + ')')), b.T, b.Label)).then(() => {
                        const file = join(ofArray([build, concat("beat-", tag, padLeft(int32ToString(_arg_2[0]), 2, "0"), ".png")]));
                        return awaitJs(first.screenshot({
                            type: "png",
                        })).then((_arg_4) => {
                            writeBytes(file, _arg_4);
                            void (files.push(file));
                            return Promise.resolve();
                        });
                    });
                }).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                    iterateIndexed((n, group) => {
                        const out = join(ofArray([build, `sheet-${tag}${n + 1}.png`]));
                        writeSheet(out, group);
                        console.log(out);
                    }, chunkBySize(6, ofSeq_1(files)));
                    return Promise.resolve(0);
                }));
            }));
        }
    }))));
}

function frameTime(fps, i) {
    return (i / fps) + 1E-06;
}

/**
 * A run of frames [First, End) for one ffmpeg process: each frame is drawn at its frameTime and piped in as a PNG.
 */
export class Range$ extends Record {
    constructor(Label, First, End, Output, Done) {
        super();
        this.Label = Label;
        this.First = (First | 0);
        this.End = (End | 0);
        this.Output = Output;
        this.Done = Done;
    }
}

export function Range$_$reflection() {
    return record_type("Render.Range", [], Range$, () => [["Label", string_type], ["First", int32_type], ["End", int32_type], ["Output", list_type(string_type)], ["Done", lambda_type(unit_type, unit_type)]]);
}

function renderRange(session, workers, fps, r) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let pr;
        const ff = childProcess.spawn("ffmpeg", toArray(append(ofArray(["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", fps.toString(), "-i", "-"]), r.Output)), {
            stdio: ["pipe", "inherit", "inherit"],
        });
        const exited = new FSharpRef(undefined);
        const closed = new Promise((ok, _arg) => {
            ff.on("close", ((code) => {
                exited.contents = (Operators_IsNull(code) ? 1 : code);
                ok();
            }));
        });
        ff.stdin.on("error", ((_arg_1) => {
        }));
        const ready = new Map();
        const next = new FSharpRef(r.First);
        const written = new FSharpRef(r.First);
        const seconds = (frames) => toFixed(0, frames / fps);
        const flush = () => PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => PromiseBuilder__While_2044D34(promise, () => (ready.has(written.contents) && (exited.contents == null)), PromiseBuilder__Delay_62FBFDE1(promise, () => {
            const buf = ready.get(written.contents);
            ready.delete(written.contents);
            written.contents = ((written.contents + 1) | 0);
            return !(ff.stdin.write(buf)) ? ((Promise.race([new Promise((ok_1, _arg_2) => {
                ff.stdin.once("drain", (() => {
                    ok_1();
                }));
            }), closed])).then(() => (Promise.resolve(undefined)))) : (Promise.resolve());
        }))));
        return ((pr = map_1((page) => PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => PromiseBuilder__While_2044D34(promise, () => (((next.contents < r.End) && !Session__get_Failed(session)) && (exited.contents == null)), PromiseBuilder__Delay_62FBFDE1(promise, () => {
            const i = next.contents | 0;
            next.contents = ((i + 1) | 0);
            return frame(page, frameTime(fps, i)).then((_arg_4) => {
                ready.set(i, _arg_4);
                return PromiseBuilder__While_2044D34(promise, () => (((i - written.contents) > (workers.length * 8)) && (exited.contents == null)), PromiseBuilder__Delay_62FBFDE1(promise, () => ((new Promise(resolve => setTimeout(resolve, 5))).then(() => (Promise.resolve(undefined)))))).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => (flush().then(() => {
                    if (((i - r.First) % ~~fps) === 0) {
                        stdoutWrite("\r" + (`${r.Label}  ${seconds(i - r.First)}s / ${seconds(r.End - r.First)}s  `));
                        return Promise.resolve();
                    }
                    else {
                        return Promise.resolve();
                    }
                }))));
            });
        })))), workers), Promise.all(pr))).then((_arg_7) => (flush().then(() => {
            ff.stdin.end();
            return closed.then(() => {
                const ok_2 = (!Session__get_Failed(session) && equals(exited.contents, 0)) && (written.contents === r.End);
                return (ok_2 ? ((r.Done(), Promise.resolve())) : (!equals(exited.contents, 0) ? ((eprint(concat("\nffmpeg failed on ", r.Label)), Promise.resolve())) : (Promise.resolve()))).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => (Promise.resolve(ok_2))));
            });
        })));
    }));
}

function clearUnfilteredSheets(ws) {
    const build = join(ofArray([ws, "build"]));
    const enumerator = getEnumerator(readDir(build));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const f = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            if ((f.startsWith("beat-") ? true : f.startsWith("sheet-")) && f.endsWith(".png")) {
                const rest = substring(f, f.indexOf("-") + 1);
                if ((rest.length > 0) && isDigit(rest[0])) {
                    remove(join(ofArray([build, f])));
                }
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

function forever() {
    return new Promise((_arg, _arg_1) => {
    });
}

function withChrome(clip, job) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (startServer(clip, ServeFor.ForRender).then((_arg) => {
        const server = _arg;
        const matchValue = findChrome();
        if (matchValue != null) {
            const chrome = matchValue;
            const puppeteer = requireFromHome("puppeteer-core");
            return awaitJs(puppeteer.launch({
                executablePath: chrome,
                headless: true,
                args: ["--font-render-hinting=none", "--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required"],
            })).then((_arg_1) => {
                const browser = _arg_1;
                const session = Session_$ctor_Z6861C5C0(browser, server.Url);
                return Session__OpenPage(session).then((_arg_2) => (job(session, _arg_2).then((_arg_3) => {
                    const code = _arg_3 | 0;
                    return awaitJs(browser.close()).then(() => {
                        server.Close();
                        return Promise.resolve((code !== 0) ? code : (Session__get_Failed(session) ? 1 : 0));
                    });
                })));
            });
        }
        else {
            eprint("no Chrome found: set CHROME to the browser\'s executable");
            server.Close();
            return Promise.resolve(2);
        }
    }))));
}

/**
 * mode: stills | sheet | serve; returns an exit code.
 */
export function run(ws, mode, args) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const clip = resolve(ws);
        return (((mode === "sheet") && isEmpty(args)) ? ((clearUnfilteredSheets(clip), Promise.resolve())) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => ((mode === "serve") ? (startServer(clip, ServeFor.ForRender).then((_arg) => {
            console.log(concat(_arg.Url, "?preview   (click the page to start; ?t=12.5 freezes one moment)"));
            console.log("Ctrl+C to stop.");
            return forever();
        })) : (withChrome(clip, (_arg_1, first) => {
            if (mode === "stills") {
                const pr = stills(clip, first, args);
                return pr.then(() => 0);
            }
            else {
                return sheet(clip, first, args);
            }
        })))));
    }));
}

/**
 * Draws the frame at each time and writes it as a JPEG to its file (the `present` step's slides); returns an exit code.
 */
export function shots(ws, wanted_1) {
    return withChrome(resolve(ws), (_arg, first) => PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (PromiseBuilder__For_1565554B(promise, wanted_1, (_arg_1) => (awaitJs(first.evaluate(renderAt, _arg_1[0])).then(() => (awaitJs(first.screenshot({
        type: "jpeg",
        quality: 90,
    })).then((_arg_3) => {
        writeBytes(_arg_1[1], _arg_3);
        return Promise.resolve();
    }))))).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => (Promise.resolve(0))))))));
}

/**
 * Renders the runs one after another, in one Chrome. Stops at the first that fails; returns an exit code.
 */
export function ranges(ws, fps, jobs) {
    return withChrome(resolve(ws), (session, first) => PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let option_1, s;
        const workerCount = defaultArg((option_1 = env("WORKERS"), (option_1 != null) ? ((s = option_1, Number(s))) : undefined), 4);
        const workers = [first];
        return PromiseBuilder__While_2044D34(promise, () => (workers.length < workerCount), PromiseBuilder__Delay_62FBFDE1(promise, () => (Session__OpenPage(session).then((_arg) => {
            void (workers.push(_arg));
            return Promise.resolve();
        })))).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
            const start = Date.now();
            const ok = new FSharpRef(true);
            const frames = new FSharpRef(0);
            return PromiseBuilder__For_1565554B(promise, jobs, (_arg_1) => {
                const job = _arg_1;
                return ok.contents ? (renderRange(session, workers, fps, job).then((_arg_2) => {
                    const finished = _arg_2;
                    ok.contents = finished;
                    if (finished) {
                        frames.contents = (((frames.contents + job.End) - job.First) | 0);
                        return Promise.resolve();
                    }
                    else {
                        return Promise.resolve();
                    }
                })) : (Promise.resolve());
            }).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                console.log(`
rendered ${frames.contents} frames in ${toFixed(1, (Date.now() - start) / 1000)}s`);
                return Promise.resolve(ok.contents ? 0 : 1);
            }));
        }));
    })));
}

