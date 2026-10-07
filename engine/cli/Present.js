
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { contains, length, collect as collect_1, mapIndexed, indexed, filter, map as map_1, tail, head, isEmpty, singleton, cons, foldBack, ofArray, empty } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { collect, singleton as singleton_1, append, map, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { packageInstalled, Py_round, Py_roundInt, Py_str, Py_truthy } from "./Narrate.js";
import { cut, Scene, Break, Sentence } from "./Shared/Steps.js";
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { stringHash, disposeSafe, getEnumerator, int32ToString, equals } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { concat, join, padLeft } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { mkdirp, remove, writeText, readJson, resolve, engineDir, eprint, requireFromHome, run as run_1, mtime, exists, join as join_1 } from "./Node.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { startAsPromise, fromContinuations, awaitPromise, ignore } from "./fable_modules/fable-library-js.5.19.0/Async.js";
import { ServeFor, startServer, shots, awaitJs } from "./Render.js";
import { Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { union_type, int32_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { singleton as singleton_2 } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";
import { ResultCE_result, ResultCE_ResultBuilder__Zero } from "./fable_modules/FsToolkit.ErrorHandling.5.2.0/ResultCE.fs.js";

function items(o) {
    if (Operators_IsNull(o)) {
        return empty();
    }
    else {
        return ofArray(o);
    }
}

function scenesOf(timing) {
    return toList(delay(() => map((sc) => (new Scene(sc.end, Py_truthy(sc.chapter) ? Py_str(sc.chapter) : undefined, toList(delay(() => map((s) => (new Sentence(s.start, s.end, s.text)), items(sc.sentences)))), toList(delay(() => map((b) => (new Break(b.sentence, b.kind, b.end - b.start)), items(sc.breaks)))))), items(timing.scenes))));
}

const chapterName = (option) => defaultArg(option, "Introduction");

function runs(key, items_1) {
    return foldBack((x, acc) => {
        let matchResult, k_1, rest_1, xs_1;
        if (!isEmpty(acc)) {
            if (equals(head(acc)[0], key(x))) {
                matchResult = 0;
                k_1 = head(acc)[0];
                rest_1 = tail(acc);
                xs_1 = head(acc)[1];
            }
            else {
                matchResult = 1;
            }
        }
        else {
            matchResult = 1;
        }
        switch (matchResult) {
            case 0:
                return cons([k_1, cons(x, xs_1)], rest_1);
            default:
                return cons([key(x), singleton(x)], acc);
        }
    }, items_1, empty());
}

function minutes(t) {
    const s = ~~Math.floor(t) | 0;
    return `${~~(s / 60)}:${padLeft(int32ToString(s % 60), 2, "0")}`;
}

function srtStamp(t) {
    const ms = Py_roundInt(t * 1000) | 0;
    const two = (n) => padLeft(int32ToString(n), 2, "0");
    return `${two(~~(ms / 3600000))}:${two(~~(ms / 60000) % 60)}:${two(~~(ms / 1000) % 60)},${padLeft(int32ToString(ms % 1000), 3, "0")}`;
}

function script(title, steps) {
    return join("\n", toList(delay(() => append(singleton_1(concat("# ", title)), delay(() => append(singleton_1(""), delay(() => append(singleton_1("The narration, one sentence a line: its slide in the deck, then the time it starts in the video. Pauses are where the video waits."), delay(() => collect((matchValue_1) => append(singleton_1(""), delay(() => append(singleton_1(concat("## ", chapterName(matchValue_1[0]))), delay(() => append(singleton_1(""), delay(() => collect((matchValue_2) => {
        let matchValue;
        const s_1 = matchValue_2[1];
        return singleton_1(`**${matchValue_2[0] + 1}** \`${minutes(s_1.Start)}\` ${s_1.Text}${(matchValue = s_1.Pauses, isEmpty(matchValue) ? "" : concat(" *(", join(", ", map_1((tupledArg) => concat(tupledArg[0], " ", Py_round(tupledArg[1], 1).toString(), " s"), matchValue)), ")*"))}  `);
    }, matchValue_1[1]))))))), runs((tupledArg_2) => tupledArg_2[1].Chapter, filter((tupledArg_1) => (tupledArg_1[1].Text !== ""), indexed(steps))))))))))))) + "\n";
}

function srt(scenes) {
    return join("\n", mapIndexed((i, s) => (`${i + 1}
${srtStamp(s.Start)} --> ${srtStamp(s.End)}
${s.Text}
`), collect_1((sc) => sc.Sentences, scenes)));
}

function silent(ws, name) {
    const mp4 = join_1(ofArray([ws, "out", concat(name, ".mp4")]));
    const out = join_1(ofArray([ws, "out", concat(name, ".silent.mp4")]));
    if (!exists(mp4)) {
        return new FSharpResult$2(/* Error */ 1, [concat("no ", name, ".mp4 in out/ yet, so no silent copy: run the video step first")]);
    }
    else if (exists(out) && (mtime(out) >= mtime(mp4))) {
        return new FSharpResult$2(/* Ok */ 0, [out]);
    }
    else if (run_1("ffmpeg", ofArray(["-hide_banner", "-loglevel", "error", "-y", "-i", mp4, "-map", "0:v", "-c", "copy", "-movflags", "+faststart", out])) === 0) {
        return new FSharpResult$2(/* Ok */ 0, [out]);
    }
    else {
        return new FSharpResult$2(/* Error */ 1, ["ffmpeg could not copy the video without its sound"]);
    }
}

function pptx(title, slides, out) {
    const lib = requireFromHome("pptxgenjs");
    const deck = new (Operators_IsNull(lib.default) ? lib : lib.default)();
    deck.layout = "LAYOUT_16x9";
    deck.title = title;
    const enumerator = getEnumerator(runs((tupledArg) => tupledArg[1].Chapter, slides));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const section = chapterName(forLoopVar[0]);
            deck.addSection({
                title: section,
            });
            const enumerator_1 = getEnumerator(forLoopVar[1]);
            try {
                while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                    const forLoopVar_1 = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    const step = forLoopVar_1[1];
                    const slide = deck.addSlide({
                        sectionTitle: section,
                    });
                    slide.background = {
                        color: "0F1420",
                    };
                    slide.addImage({
                        path: forLoopVar_1[0],
                        x: 0,
                        y: 0,
                        w: 10,
                        h: 5.625,
                    });
                    if (step.Text !== "") {
                        slide.addNotes(step.Text);
                    }
                }
            }
            finally {
                disposeSafe(enumerator_1);
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    return ignore(awaitPromise(awaitJs(deck.writeFile({
        fileName: out,
    }))));
}

class Failure extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["RenderFailed", "SlideWriterMissing"];
    }
    static SlideWriterMissing = new Failure(1, []);
}

function Failure_$reflection() {
    return union_type("Present.Failure", [], Failure, () => [[["exitCode", int32_type]], []]);
}

function exitCode(name, failure) {
    if (failure.tag === 1) {
        eprint(`no ${name}.pptx: the slide writer is not installed yet. Run: node ${join_1(ofArray([engineDir, "cli", "Cv.js"]))} setup`);
        return 2;
    }
    else {
        return failure.fields[0] | 0;
    }
}

function slideWriter() {
    if (packageInstalled("pptxgenjs")) {
        return new FSharpResult$2(/* Ok */ 0, [undefined]);
    }
    else {
        return new FSharpResult$2(/* Error */ 1, [Failure.SlideWriterMissing]);
    }
}

function shoot(ws, slides) {
    const input = awaitPromise(shots(ws, toList(delay(() => collect((matchValue) => singleton_1([matchValue[1].Hold, matchValue[0]]), slides)))));
    return singleton_2.Bind(input, (x$0027) => {
        let value;
        const _arg = x$0027 | 0;
        value = ((_arg === 0) ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [new Failure(/* RenderFailed */ 0, [_arg])])));
        return singleton_2.Return(value);
    });
}

function serve(ws) {
    return singleton_2.Delay(() => singleton_2.Bind(awaitPromise(startServer(ws, ServeFor.ForRender)), (_arg) => {
        console.log(concat(_arg.Url, "?present   click-through deck: → or click next, ← back, S speaker notes, N notes on the slide, F full screen"));
        console.log("Ctrl+C to stop.");
        return singleton_2.ReturnFrom(fromContinuations((_arg_1) => {
        }));
    }));
}

function written(file) {
    console.log(file);
}

export function run(ws, args) {
    let input_21;
    const ws_1 = resolve(ws);
    const timing = readJson(join_1(ofArray([ws_1, "build", "timing.json"])));
    const name = timing.name;
    const title = Operators_IsNull(timing.title) ? name : timing.title;
    const scenes = scenesOf(timing);
    const steps = cut(timing.duration, scenes);
    const out = (ext) => join_1(ofArray([ws_1, "out", `${name}.${ext}`]));
    const dir = join_1(ofArray([ws_1, "build", "present"]));
    const slides = mapIndexed((i, s) => [join_1(ofArray([dir, concat("slide-", padLeft(int32ToString(i + 1), 3, "0"), ".jpg")])), s], steps);
    return startAsPromise((input_21 = singleton_2.Delay(() => {
        writeText(out("script.md"), script(title, steps));
        written(out("script.md"));
        writeText(out("srt"), srt(scenes));
        written(out("srt"));
        const input_1 = silent(ws_1, name);
        if (input_1.tag === 1) {
            eprint(input_1.fields[0]);
        }
        else {
            console.log(input_1.fields[0]);
        }
        let asyncResult_2;
        const value_1 = slideWriter();
        asyncResult_2 = singleton_2.Return(value_1);
        return singleton_2.Bind(asyncResult_2, (input_1_4) => {
            const input_19 = input_1_4;
            if (input_19.tag === 1) {
                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_19.fields[0]]));
            }
            else {
                remove(dir);
                mkdirp(dir);
                const asyncResult_1 = shoot(ws_1, slides);
                return singleton_2.Bind(asyncResult_1, (input_1_3) => {
                    const input_16 = input_1_3;
                    if (input_16.tag === 1) {
                        return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_16.fields[0]]));
                    }
                    else {
                        let asyncResult;
                        const input_2 = pptx(title, slides, out("pptx"));
                        asyncResult = singleton_2.Bind(input_2, (x$0027) => singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [x$0027])));
                        return singleton_2.Bind(asyncResult, (input_1_2) => {
                            const input_13 = input_1_2;
                            if (input_13.tag === 1) {
                                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_13.fields[0]]));
                            }
                            else {
                                console.log(`${out("pptx")}   (${length(slides)} slides)`);
                                if (contains("--serve", args, {
                                    Equals: (x_1, y) => (x_1 === y),
                                    GetHashCode: (x_1) => (stringHash(x_1) | 0),
                                })) {
                                    let x_2;
                                    const input_5 = serve(ws_1);
                                    x_2 = singleton_2.Bind(input_5, (x$0027_1) => singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [x$0027_1])));
                                    return singleton_2.Bind(x_2, (x$0027_2) => {
                                        let value_7;
                                        const input_9 = x$0027_2;
                                        value_7 = ((input_9.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_9.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [undefined])));
                                        return singleton_2.Return(value_7);
                                    });
                                }
                                else {
                                    const value_9 = ResultCE_ResultBuilder__Zero(ResultCE_result);
                                    return singleton_2.Return(value_9);
                                }
                            }
                        });
                    }
                });
            }
        });
    }), singleton_2.Bind(input_21, (x$0027_3) => {
        let value_16;
        const _arg_4 = x$0027_3;
        value_16 = ((_arg_4.tag === 1) ? exitCode(name, _arg_4.fields[0]) : 0);
        return singleton_2.Return(value_16);
    })));
}

