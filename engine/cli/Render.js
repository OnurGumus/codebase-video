
import { parallel, fromContinuations, awaitPromise } from "./fable_modules/fable-library-js.5.19.0/Async.js";
import { toArray, choose, reverse, chunkBySize, iterateIndexed, indexed, iterate, filter as filter_1, collect as collect_1, length, truncate, mapIndexed, append, exists as exists_1, map, empty, cons, tail, head, isEmpty, singleton as singleton_1, tryFind, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { requireFromHome, childProcess, readDir, remove, eprint, run as run_1, writeBytes, extname, fsp, sep as sep_3, join, engineDir, http, resolve, exists, env } from "./Node.js";
import { Record, Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { tuple_type, obj_type, option_type, list_type, int32_type, float64_type, class_type, bool_type, record_type, lambda_type, unit_type, string_type, union_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { empty as empty_2, FSharpMap__Add, FSharpMap__Remove, FSharpMap__TryFind, tryFind as tryFind_1, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { int32ToString, Exception, disposeSafe, getEnumerator, equals, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { singleton } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";
import { padLeft, join as join_1, split, concat, substring } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { post, postAndAsyncReply, receive, start as start_1 } from "./fable_modules/fable-library-js.5.19.0/MailboxProcessor.js";
import { item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { empty as empty_1, singleton as singleton_2, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { rangeDouble } from "./fable_modules/fable-library-js.5.19.0/Range.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { isDigit } from "./fable_modules/fable-library-js.5.19.0/Char.js";

export function toFixed(digits, x) {
    return x.toFixed(digits);
}

export function awaitJs(p) {
    return p;
}

/**
 * What a JS library's promise resolves to, as an Async.
 */
export function fromJs(p) {
    return awaitPromise(awaitJs(p));
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
    return singleton.Delay(() => {
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
        return singleton.ReturnFrom(fromContinuations((tupledArg) => {
            server.listen(0, "127.0.0.1", (() => {
                tupledArg[0](new Server(`http://127.0.0.1:${(server.address()).port}/clip.html`, () => {
                    server.close();
                }));
            }));
        }));
    });
}

const renderAt = (0, eval)('(' + "(t) => window.render(t)" + ')');

const labelled = "(t, label) => {\n        window.render(t);\n        let tag = document.getElementById(\"sheet-label\");\n        if (!tag) {\n          tag = document.createElement(\"div\");\n          tag.id = \"sheet-label\";\n          tag.style.cssText = \"position:fixed;left:0;right:0;top:0;z-index:99;padding:6px 14px;background:#000d;color:#ffd84d;font:600 34px/1.25 monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\";\n          document.body.append(tag);\n        }\n        tag.textContent = label;\n      }";

const imagesLoaded = "() => Promise.all(Array.from(document.images, (img) =>\n        (img.complete ? Promise.resolve() : new Promise((ok) => {\n          img.addEventListener(\"load\", ok, { once: true });\n          img.addEventListener(\"error\", ok, { once: true });\n        })).then(() => img.decode().catch(() => {})))).then(() => true)";

function deliver(answers) {
    const enumerator = getEnumerator(answers);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const answer = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            try {
                answer();
            }
            catch (matchValue) {
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

class PageMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["PageError", "IsFailed"];
    }
    static PageError = new PageMsg(0, []);
}

function PageMsg_$reflection() {
    return union_type("Render.PageMsg", [], PageMsg, () => [[], [["Item", class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [bool_type])]]]);
}

class Session {
    constructor(browser, url) {
        this.browser = browser;
        this.url = url;
        this.errors = start_1((inbox) => {
            const loop = (failed) => singleton.Delay(() => singleton.Bind(receive(inbox), (_arg) => {
                if (_arg.tag === 1) {
                    deliver(singleton_1(() => {
                        _arg.fields[0].reply(failed);
                    }));
                    return singleton.ReturnFrom(loop(failed));
                }
                else {
                    return singleton.ReturnFrom(loop(true));
                }
            }));
            return loop(false);
        });
    }
}

function Session_$reflection() {
    return class_type("Render.Session", undefined, Session);
}

function Session_$ctor_Z6861C5C0(browser, url) {
    return new Session(browser, url);
}

function Session__IsFailed(_) {
    return singleton.Delay(() => singleton.ReturnFrom(postAndAsyncReply(_.errors, (Item) => (new PageMsg(/* IsFailed */ 1, [Item])))));
}

function Session__OpenPage(_) {
    return singleton.Delay(() => singleton.Bind(fromJs(_.browser.newPage()), (_arg) => {
        const page = _arg;
        page.on("pageerror", ((e) => {
            post(_.errors, PageMsg.PageError);
            console.error("page error:", e.message);
        }));
        page.on("console", ((m) => {
            console.log("page:", (m.text()));
        }));
        return singleton.Bind(fromJs(page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        })), () => singleton.Bind(fromJs(page.goto(_.url, {
            waitUntil: "load",
        })), () => singleton.Bind(fromJs(page.evaluate((0, eval)('(' + "() => window.ready" + ')'))), () => singleton.Bind(fromJs(page.evaluate((0, eval)('(' + imagesLoaded + ')'))), () => singleton.Return(page)))));
    }));
}

function frame(page, t) {
    return singleton.Delay(() => singleton.Bind(fromJs(page.evaluate(renderAt, t)), () => singleton.ReturnFrom(fromJs(page.screenshot({
        type: "png",
        optimizeForSpeed: true,
    })))));
}

function evalIn(page, source) {
    return fromJs(page.evaluate((0, eval)('(' + source + ')')));
}

function mapA(step, items) {
    return singleton.Delay(() => (!isEmpty(items) ? singleton.Bind(step(head(items)), (_arg) => singleton.Bind(mapA(step, tail(items)), (_arg_1) => singleton.Return(cons(_arg, _arg_1)))) : singleton.Return(empty())));
}

function stills(ws, first, args) {
    return singleton.Delay(() => singleton.Bind(isEmpty(args) ? singleton.Delay(() => singleton.Bind(evalIn(first, "() => window.TIMING.poster"), (_arg) => singleton.Return(singleton_1(_arg)))) : singleton.Return(map((s) => (Number(s)), args)), (_arg_1) => singleton.For(_arg_1, (_arg_2) => {
        const t = _arg_2;
        const file = join(ofArray([ws, "build", concat("still-", toFixed(2, t), ".png")]));
        return singleton.Bind(frame(first, t), (_arg_3) => {
            writeBytes(file, _arg_3);
            console.log(file);
            return singleton.Zero();
        });
    })));
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
                return singleton_2(new Beat(t, `${toFixed(1, t)}s  ${id}[${i}]  ${text}`));
            }, rangeDouble(0, 1, sentences.length - 1));
        }
        else {
            return empty_1();
        }
    }, scenes)));
    const duration = timing.duration;
    if (isEmpty(only)) {
        return append(sentenceBeats, singleton_1(new Beat(duration - 0.05, concat(toFixed(1, duration), "s  end"))));
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
    return singleton.Delay(() => singleton.Bind(evalIn(first, "() => window.TIMING"), (_arg) => {
        const only = filter_1((a) => (a !== ""), args);
        const tag = isEmpty(only) ? "" : (join_1("-", only) + "-");
        const beats = beatsOf(_arg, only);
        if (isEmpty(beats)) {
            eprint(concat("no scenes match ", join_1(" ", only)));
            return singleton.Return(2);
        }
        else {
            const build = join(ofArray([ws, "build"]));
            return singleton.Combine(!isEmpty(only) ? ((iterate((f) => {
                if (f.startsWith(concat("sheet-", tag)) ? true : f.startsWith(concat("beat-", tag))) {
                    remove(join(ofArray([build, f])));
                }
            }, readDir(build)), singleton.Zero())) : singleton.Zero(), singleton.Delay(() => singleton.Bind(mapA((tupledArg) => {
                const b = tupledArg[1];
                return singleton.Delay(() => singleton.Bind(fromJs(first.evaluate(((0, eval)('(' + labelled + ')')), b.T, b.Label)), () => {
                    const file = join(ofArray([build, concat("beat-", tag, padLeft(int32ToString(tupledArg[0]), 2, "0"), ".png")]));
                    return singleton.Bind(fromJs(first.screenshot({
                        type: "png",
                    })), (_arg_2) => {
                        writeBytes(file, _arg_2);
                        return singleton.Return(file);
                    });
                }));
            }, indexed(beats)), (_arg_3) => {
                iterateIndexed((n, group) => {
                    const out = join(ofArray([build, `sheet-${tag}${n + 1}.png`]));
                    writeSheet(out, group);
                    console.log(out);
                }, chunkBySize(6, _arg_3));
                return singleton.Return(0);
            })));
        }
    }));
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

class WriterMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Take", "Frame", "Finish"];
    }
}

function WriterMsg_$reflection() {
    return union_type("Render.WriterMsg", [], WriterMsg, () => [[["Item", class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [option_type(int32_type)])]], [["index", int32_type], ["png", obj_type], ["Item3", class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [unit_type])]], [["Item", class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [union_type("Microsoft.FSharp.Core.FSharpResult`2", [bool_type, class_type("System.Exception")], FSharpResult$2, () => [[["ResultValue", bool_type]], [["ErrorValue", class_type("System.Exception")]]])])]]]);
}

class Writer extends Record {
    constructor(NextToGive, Next, Waiting, Failed) {
        super();
        this.NextToGive = (NextToGive | 0);
        this.Next = (Next | 0);
        this.Waiting = Waiting;
        this.Failed = Failed;
    }
}

function Writer_$reflection() {
    return record_type("Render.Writer", [], Writer, () => [["NextToGive", int32_type], ["Next", int32_type], ["Waiting", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [int32_type, tuple_type(obj_type, option_type(class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [unit_type])))])], ["Failed", option_type(class_type("System.Exception"))]]);
}

function exitStatus(ff) {
    if (!Operators_IsNull(ff.exitCode)) {
        return ff.exitCode;
    }
    else if (!Operators_IsNull(ff.signalCode)) {
        return 1;
    }
    else {
        return undefined;
    }
}

function writeFrame(ff, png) {
    return fromContinuations((tupledArg) => {
        const ok = tupledArg[0];
        if ((exitStatus(ff) != null) ? true : (ff.stdin.write(png))) {
            ok();
        }
        else {
            const stdin = ff.stdin;
            const settle = (_arg_2) => {
                stdin.removeListener("drain", settle);
                ff.removeListener("close", settle);
                ok();
            };
            stdin.once("drain", settle);
            ff.once("close", settle);
        }
    });
}

function exitOf(ff) {
    return fromContinuations((tupledArg) => {
        const ok = tupledArg[0];
        const matchValue = exitStatus(ff);
        if (matchValue == null) {
            ff.once("close", ((code_1) => {
                ok(Operators_IsNull(code_1) ? 1 : code_1);
            }));
        }
        else {
            ok(matchValue);
        }
    });
}

function nextInOrder(state_mut, taken_mut) {
    nextInOrder:
    while (true) {
        const state = state_mut, taken = taken_mut;
        const matchValue = FSharpMap__TryFind(state.Waiting, state.Next);
        if (matchValue == null) {
            return [state, reverse(taken)];
        }
        else {
            const png = matchValue[0];
            const owed = matchValue[1];
            state_mut = (new Writer(state.NextToGive, (state.Next + 1) | 0, FSharpMap__Remove(state.Waiting, state.Next), state.Failed));
            taken_mut = cons([state.Next, png, owed], taken);
            continue nextInOrder;
        }
        break;
    }
}

function startWriter(ff, pages, fps, r) {
    const window$ = (pages * 8) | 0;
    const seconds = (frames) => toFixed(0, frames / fps);
    const writeAll = (frames_1) => singleton.Delay(() => {
        let i;
        if (!isEmpty(frames_1)) {
            return singleton.Bind((i = (head(frames_1)[0] | 0), singleton.Delay(() => singleton.Bind(writeFrame(ff, head(frames_1)[1]), () => {
                if (((i - r.First) % ~~fps) === 0) {
                    stdoutWrite("\r" + (`${r.Label}  ${seconds(i - r.First)}s / ${seconds(r.End - r.First)}s  `));
                    return singleton.Zero();
                }
                else {
                    return singleton.Zero();
                }
            }))), () => singleton.ReturnFrom(writeAll(tail(frames_1))));
        }
        else {
            return singleton.Zero();
        }
    });
    return start_1((inbox) => {
        const loop = (state_2) => singleton.Delay(() => singleton.Bind(receive(inbox), (_arg_6) => {
            const msg_2 = _arg_6;
            return singleton.Bind(singleton.Delay(() => singleton.TryWith(singleton.Delay(() => {
                let state, msg;
                return singleton.ReturnFrom((state = state_2, (msg = msg_2, singleton.Delay(() => {
                    const matchValue = state.Failed;
                    switch (msg.tag) {
                        case 1:
                            if (matchValue == null) {
                                const atOnce = (msg.fields[0] - state.Next) <= window$;
                                const patternInput = nextInOrder(new Writer(state.NextToGive, state.Next, FSharpMap__Add(state.Waiting, msg.fields[0], [msg.fields[1], atOnce ? undefined : msg.fields[2]]), state.Failed), empty());
                                const frames_2 = patternInput[1];
                                return singleton.Bind(writeAll(frames_2), () => {
                                    const owed_1 = map((r_1) => (() => {
                                        r_1.reply(undefined);
                                    }), choose((tupledArg) => tupledArg[2], frames_2));
                                    return singleton.Return([patternInput[0], append(atOnce ? singleton_1(() => {
                                        msg.fields[2].reply(undefined);
                                    }) : empty(), owed_1)]);
                                });
                            }
                            else {
                                return singleton.Return([state, singleton_1(() => {
                                    msg.fields[2].reply(undefined);
                                })]);
                            }
                        case 2:
                            if (matchValue == null) {
                                ff.stdin.end();
                                return singleton.Bind(exitOf(ff), (_arg_5) => {
                                    const code = _arg_5 | 0;
                                    return singleton.Combine((code !== 0) ? ((eprint(concat("\nffmpeg failed on ", r.Label)), singleton.Zero())) : singleton.Zero(), singleton.Delay(() => singleton.Return([state, singleton_1(() => {
                                        msg.fields[0].reply(new FSharpResult$2(/* Ok */ 0, [(code === 0) && (state.Next === r.End)]));
                                    })])));
                                });
                            }
                            else {
                                const e = matchValue;
                                return singleton.Return([state, singleton_1(() => {
                                    msg.fields[0].reply(new FSharpResult$2(/* Error */ 1, [e]));
                                })]);
                            }
                        default:
                            return (matchValue == null) ? (((state.NextToGive < r.End) && (exitStatus(ff) == null)) ? singleton.Return([new Writer((state.NextToGive + 1) | 0, state.Next, state.Waiting, state.Failed), singleton_1(() => {
                                msg.fields[0].reply(state.NextToGive);
                            })]) : singleton.Return([state, singleton_1(() => {
                                msg.fields[0].reply(undefined);
                            })])) : singleton.Return([state, singleton_1(() => {
                                msg.fields[0].reply(undefined);
                            })]);
                    }
                }))));
            }), (_arg_7) => {
                let state_1, msg_1, e_1, own, waiting;
                return singleton.Return((state_1 = state_2, (msg_1 = msg_2, (e_1 = _arg_7, (own = ((msg_1.tag === 1) ? (() => {
                    msg_1.fields[2].reply(undefined);
                }) : ((msg_1.tag === 2) ? (() => {
                    msg_1.fields[0].reply(new FSharpResult$2(/* Error */ 1, [e_1]));
                }) : (() => {
                    msg_1.fields[0].reply(undefined);
                }))), (waiting = toList(delay(() => collect((matchValue_2) => {
                    const matchValue_3 = matchValue_2[1][1];
                    if (matchValue_3 == null) {
                        return empty_1();
                    }
                    else {
                        const reply_9 = matchValue_3;
                        return singleton_2(() => {
                            reply_9.reply(undefined);
                        });
                    }
                }, state_1.Waiting))), [new Writer(state_1.NextToGive, state_1.Next, empty_2({
                    Compare: (x, y) => (comparePrimitives(x, y) | 0),
                }), e_1), cons(own, waiting)]))))));
            })), (_arg_8) => {
                deliver(_arg_8[1]);
                return singleton.ReturnFrom(loop(_arg_8[0]));
            });
        }));
        return loop(new Writer(r.First, r.First, empty_2({
            Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
        }), undefined));
    });
}

function renderRange(session, pages, fps, r) {
    return singleton.Delay(() => {
        const ff = childProcess.spawn("ffmpeg", toArray(append(ofArray(["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", fps.toString(), "-i", "-"]), r.Output)), {
            stdio: ["pipe", "inherit", "inherit"],
        });
        ff.stdin.on("error", ((_arg) => {
        }));
        const writer = startWriter(ff, length(pages), fps, r);
        const draw = (page) => singleton.Delay(() => singleton.Bind(Session__IsFailed(session), (_arg_1) => (!_arg_1 ? singleton.Bind(postAndAsyncReply(writer, (Item) => (new WriterMsg(/* Take */ 0, [Item]))), (_arg_2) => {
            if (_arg_2 == null) {
                return singleton.Zero();
            }
            else {
                const i = _arg_2 | 0;
                return singleton.Bind(frame(page, frameTime(fps, i)), (_arg_3) => singleton.Bind(postAndAsyncReply(writer, (reply) => (new WriterMsg(/* Frame */ 1, [i, _arg_3, reply]))), () => singleton.ReturnFrom(draw(page))));
            }
        }) : singleton.Zero())));
        return singleton.Bind(parallel(map(draw, pages)), (_arg_5) => singleton.Bind(postAndAsyncReply(writer, (Item_1) => (new WriterMsg(/* Finish */ 2, [Item_1]))), (_arg_6) => ((_arg_6.tag === 0) ? singleton.Bind(Session__IsFailed(session), (_arg_7) => {
            const ok = !_arg_7 && _arg_6.fields[0];
            return singleton.Combine(ok ? ((r.Done(), singleton.Zero())) : singleton.Zero(), singleton.Delay(() => singleton.Return(ok)));
        }) : singleton.Return((() => {
            throw _arg_6.fields[0];
        })()))));
    });
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
    return fromContinuations((_arg) => {
    });
}

function withChrome(clip, job) {
    return singleton.Delay(() => singleton.Bind(startServer(clip, ServeFor.ForRender), (_arg) => {
        const server = _arg;
        const matchValue = findChrome();
        if (matchValue != null) {
            const chrome = matchValue;
            const puppeteer = requireFromHome("puppeteer-core");
            return singleton.Bind(fromJs(puppeteer.launch({
                executablePath: chrome,
                headless: true,
                args: ["--font-render-hinting=none", "--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required"],
            })), (_arg_1) => {
                const browser = _arg_1;
                const session = Session_$ctor_Z6861C5C0(browser, server.Url);
                return singleton.Bind(Session__OpenPage(session), (_arg_2) => singleton.Bind(job(session, _arg_2), (_arg_3) => {
                    const code = _arg_3 | 0;
                    return singleton.Bind(fromJs(browser.close()), () => {
                        server.Close();
                        return singleton.Bind(Session__IsFailed(session), (_arg_5) => singleton.Return((code !== 0) ? code : (_arg_5 ? 1 : 0)));
                    });
                }));
            });
        }
        else {
            eprint("no Chrome found: set CHROME to the browser\'s executable");
            server.Close();
            return singleton.Return(2);
        }
    }));
}

/**
 * mode: stills | sheet | serve; returns an exit code.
 */
export function run(ws, mode, args) {
    return singleton.Delay(() => {
        const clip = resolve(ws);
        return singleton.Combine(((mode === "sheet") && isEmpty(args)) ? ((clearUnfilteredSheets(clip), singleton.Zero())) : singleton.Zero(), singleton.Delay(() => ((mode === "serve") ? singleton.Bind(startServer(clip, ServeFor.ForRender), (_arg) => {
            console.log(concat(_arg.Url, "?preview   (click the page to start; ?t=12.5 freezes one moment)"));
            console.log("Ctrl+C to stop.");
            return singleton.ReturnFrom(forever());
        }) : singleton.ReturnFrom(withChrome(clip, (_arg_1, first) => ((mode === "stills") ? singleton.Delay(() => singleton.Bind(stills(clip, first, args), () => singleton.Return(0))) : sheet(clip, first, args)))))));
    });
}

/**
 * Draws the frame at each time and writes it as a JPEG to its file (the `present` step's slides); returns an exit code.
 */
export function shots(ws, wanted_1) {
    return withChrome(resolve(ws), (_arg, first) => singleton.Delay(() => singleton.Combine(singleton.For(wanted_1, (_arg_1) => singleton.Bind(fromJs(first.evaluate(renderAt, _arg_1[0])), () => singleton.Bind(fromJs(first.screenshot({
        type: "jpeg",
        quality: 90,
    })), (_arg_3) => {
        writeBytes(_arg_1[1], _arg_3);
        return singleton.Zero();
    }))), singleton.Delay(() => singleton.Return(0)))));
}

function openPages(session, count, pages) {
    return singleton.Delay(() => ((length(pages) < count) ? singleton.Bind(Session__OpenPage(session), (_arg) => singleton.ReturnFrom(openPages(session, count, append(pages, singleton_1(_arg))))) : singleton.Return(pages)));
}

function renderAll(session, pages, fps, jobs, frames) {
    return singleton.Delay(() => {
        if (!isEmpty(jobs)) {
            const job = head(jobs);
            return singleton.Bind(renderRange(session, pages, fps, job), (_arg) => (_arg ? singleton.ReturnFrom(renderAll(session, pages, fps, tail(jobs), ((frames + job.End) - job.First) | 0)) : singleton.Return([frames, false])));
        }
        else {
            return singleton.Return([frames, true]);
        }
    });
}

/**
 * Renders the runs one after another, in one Chrome. Stops at the first that fails; returns an exit code.
 */
export function ranges(ws, fps, jobs) {
    return withChrome(resolve(ws), (session, first) => singleton.Delay(() => {
        let option_1, s;
        const workerCount = defaultArg((option_1 = env("WORKERS"), (option_1 != null) ? ((s = option_1, Number(s))) : undefined), 4);
        return singleton.Bind(openPages(session, workerCount, singleton_1(first)), (_arg) => {
            const start = Date.now();
            return singleton.Bind(renderAll(session, _arg, fps, jobs, 0), (_arg_1) => {
                console.log(`
rendered ${_arg_1[0]} frames in ${toFixed(1, (Date.now() - start) / 1000)}s`);
                return singleton.Return(_arg_1[1] ? 0 : 1);
            });
        });
    }));
}

