
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { forAll, length, truncate, zip as zip_1, append as append_1, fold, collect as collect_1, mapIndexed, indexed, filter, map as map_1, tail, head, isEmpty, singleton, cons, foldBack, ofArray, empty } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { collect, singleton as singleton_1, append, map, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { packageInstalled, Py_round, Py_roundInt, Py_str, Py_truthy } from "./Narrate.js";
import { cut, Step_$reflection, Scene, Break, Sentence } from "./Shared/Steps.js";
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { round, createObj, disposeSafe, getEnumerator, int32ToString, equals } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { replace, substring, concat, join, padLeft } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { Record, Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { option_type, float64_type, record_type, bool_type, union_type, int32_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { mkdirp, remove, writeText, readJson, resolve, writeBytes, requireFromHome, readBytes, run as run_1, mtime, exists, eprint, engineDir, join as join_1 } from "./Node.js";
import { ServeFor, startServer, shots, fromJs, toFixed } from "./Render.js";
import { traverseResultM } from "./fable_modules/FsToolkit.ErrorHandling.5.2.0/List.fs.js";
import { fromContinuations, ignore } from "./fable_modules/fable-library-js.5.19.0/Async.js";
import { match } from "./fable_modules/fable-library-js.5.19.0/RegExp.js";
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

class Failure extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["UnknownOption", "SlideWriterMissing", "RenderFailed", "NoVideo", "ClipFailed"];
    }
    static SlideWriterMissing = new Failure(1, []);
}

function Failure_$reflection() {
    return union_type("Present.Failure", [], Failure, () => [[["Item", string_type]], [], [["exitCode", int32_type]], [["reason", string_type]], [["slide", int32_type]]]);
}

class Options extends Record {
    constructor(Serve, Clips) {
        super();
        this.Serve = Serve;
        this.Clips = Clips;
    }
}

function Options_$reflection() {
    return record_type("Present.Options", [], Options, () => [["Serve", bool_type], ["Clips", bool_type]]);
}

function optionsOf(args) {
    return fold((acc, arg_1) => {
        const input_1 = acc;
        if (input_1.tag === 1) {
            return new FSharpResult$2(/* Error */ 1, [input_1.fields[0]]);
        }
        else {
            const options = input_1.fields[0];
            const arg = arg_1;
            switch (arg) {
                case "--serve":
                    return new FSharpResult$2(/* Ok */ 0, [new Options(true, options.Clips)]);
                case "--clips":
                    return new FSharpResult$2(/* Ok */ 0, [new Options(options.Serve, true)]);
                default:
                    return new FSharpResult$2(/* Error */ 1, [new Failure(/* UnknownOption */ 0, [arg])]);
            }
        }
    }, new FSharpResult$2(/* Ok */ 0, [new Options(false, false)]), args);
}

function exitCode(name, failure) {
    const cv = join_1(ofArray([engineDir, "cli", "Cv.js"]));
    switch (failure.tag) {
        case 1: {
            eprint(`no ${name}.pptx: the slide writer is not installed yet. Run: node ${cv} setup`);
            return 2;
        }
        case 2:
            return failure.fields[0] | 0;
        case 3: {
            eprint(concat("--clips cuts each slide\'s clip from the video, and there is none: ", failure.fields[0]));
            return 2;
        }
        case 4: {
            eprint(`ffmpeg could not cut the clip of slide ${failure.fields[0]}`);
            return 1;
        }
        default: {
            eprint(concat("present: no option ", failure.fields[0], " (there are --serve and --clips)"));
            return 2;
        }
    }
}

class Clip extends Record {
    constructor(Video, Cover, Seconds) {
        super();
        this.Video = Video;
        this.Cover = Cover;
        this.Seconds = Seconds;
    }
}

function Clip_$reflection() {
    return record_type("Present.Clip", [], Clip, () => [["Video", string_type], ["Cover", string_type], ["Seconds", float64_type]]);
}

class Slide extends Record {
    constructor(Number$, Step, Still, Clip) {
        super();
        this.Number = (Number$ | 0);
        this.Step = Step;
        this.Still = Still;
        this.Clip = Clip;
    }
}

function Slide_$reflection() {
    return record_type("Present.Slide", [], Slide, () => [["Number", int32_type], ["Step", Step_$reflection()], ["Still", string_type], ["Clip", option_type(Clip_$reflection())]]);
}

const SHORTEST_CLIP = 0.2;

function silent(ws, name) {
    const mp4 = join_1(ofArray([ws, "out", concat(name, ".mp4")]));
    const out = join_1(ofArray([ws, "out", concat(name, ".silent.mp4")]));
    if (!exists(mp4)) {
        return new FSharpResult$2(/* Error */ 1, [concat("no ", name, ".mp4 in out/ yet: run the video step first")]);
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

function ffmpeg(args) {
    return run_1("ffmpeg", append_1(ofArray(["-hide_banner", "-loglevel", "error", "-y"]), args)) === 0;
}

function clipOf(video, from, slide) {
    const stem = substring(slide.Still, 0, slide.Still.lastIndexOf("."));
    const clip = new Clip(stem + ".mp4", stem + "-cover.png", slide.Step.Hold - from);
    if (clip.Seconds < SHORTEST_CLIP) {
        return new FSharpResult$2(/* Ok */ 0, [slide]);
    }
    else if (ffmpeg(append_1(ofArray(["-ss", toFixed(3, from), "-i", video, "-t", toFixed(3, clip.Seconds)]), append_1(ofArray(["-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]), singleton(clip.Video)))) && ffmpeg(ofArray(["-i", clip.Video, "-frames:v", "1", clip.Cover]))) {
        return new FSharpResult$2(/* Ok */ 0, [new Slide(slide.Number, slide.Step, slide.Still, clip)]);
    }
    else {
        return new FSharpResult$2(/* Error */ 1, [new Failure(/* ClipFailed */ 4, [slide.Number])]);
    }
}

function withClips(video, slides) {
    let list_1;
    return traverseResultM((tupledArg) => clipOf(video, tupledArg[0], tupledArg[1]), zip_1(cons(0, (list_1 = map_1((s) => s.Step.Hold, slides), truncate(length(slides) - 1, list_1))), slides));
}

function dataUri(png) {
    return "data:image/png;base64," + (readBytes(png).toString("base64"));
}

function pptx(title, slides, out) {
    const lib = requireFromHome("pptxgenjs");
    const deck = new (Operators_IsNull(lib.default) ? lib : lib.default)();
    deck.layout = "LAYOUT_16x9";
    deck.title = title;
    const fill = ofArray([["x", 0], ["y", 0], ["w", 10], ["h", 5.625]]);
    const enumerator = getEnumerator(runs((s) => s.Step.Chapter, slides));
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
                    const s_1 = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    const slide = deck.addSlide({
                        sectionTitle: section,
                    });
                    slide.background = {
                        color: "0F1420",
                    };
                    const matchValue = s_1.Clip;
                    if (matchValue == null) {
                        slide.addImage(createObj(append_1(singleton(["path", s_1.Still]), fill)));
                    }
                    else {
                        const clip = matchValue;
                        slide.addMedia(createObj(append_1(ofArray([["type", "video"], ["path", clip.Video], ["cover", dataUri(clip.Cover)]]), fill)));
                    }
                    if (s_1.Step.Text !== "") {
                        slide.addNotes(s_1.Step.Text);
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
    return ignore(fromJs(deck.writeFile({
        fileName: out,
    })));
}

function $007CVideoShape$007C_$007C(xml) {
    const m = match(/<p:cNvPr id="(\d+)"(?:(?!<p:cNvPr )[\s\S])*?<a:videoFile/gu, xml);
    if (m != null) {
        return m[1] || "";
    }
    else {
        return undefined;
    }
}

function autoplayTiming(shape, seconds) {
    return (((((("<p:timing><p:tnLst><p:par><p:cTn id=\"1\" dur=\"indefinite\" restart=\"never\" nodeType=\"tmRoot\"><p:childTnLst><p:seq concurrent=\"1\" nextAc=\"seek\"><p:cTn id=\"2\" dur=\"indefinite\" nodeType=\"mainSeq\"><p:childTnLst><p:par><p:cTn id=\"3\" fill=\"hold\"><p:stCondLst><p:cond delay=\"indefinite\"/><p:cond evt=\"onBegin\" delay=\"0\"><p:tn val=\"2\"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id=\"4\" fill=\"hold\"><p:stCondLst><p:cond delay=\"0\"/></p:stCondLst><p:childTnLst><p:par><p:cTn id=\"5\" presetID=\"1\" presetClass=\"mediacall\" presetSubtype=\"0\" fill=\"hold\" nodeType=\"afterEffect\"><p:stCondLst><p:cond delay=\"0\"/></p:stCondLst><p:childTnLst><p:cmd type=\"call\" cmd=\"playFrom(0.0)\"><p:cBhvr>" + (`<p:cTn id="6" dur="${~~round(seconds * 1000)}" fill="hold"/><p:tgtEl><p:spTgt spid="${shape}"/></p:tgtEl></p:cBhvr></p:cmd>`)) + "</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn>") + "<p:prevCondLst><p:cond evt=\"onPrev\" delay=\"0\"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>") + "<p:nextCondLst><p:cond evt=\"onNext\" delay=\"0\"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>") + "<p:video><p:cMediaNode vol=\"80000\"><p:cTn id=\"7\" fill=\"hold\" display=\"0\"><p:stCondLst><p:cond delay=\"indefinite\"/>") + concat("</p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid=\"", shape, "\"/></p:tgtEl></p:cMediaNode></p:video>")) + "</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>";
}

function withAutoplay(seconds, xml) {
    const activePatternResult = $007CVideoShape$007C_$007C(xml);
    if (activePatternResult != null) {
        const shape = activePatternResult;
        return replace(xml, "</p:clrMapOvr></p:sld>", ("</p:clrMapOvr>" + autoplayTiming(shape, seconds)) + "</p:sld>");
    }
    else {
        return xml;
    }
}

function autoplay(file, slides) {
    return singleton_2.Delay(() => {
        const zipLib = requireFromHome("jszip");
        return singleton_2.Bind(fromJs(zipLib.loadAsync(readBytes(file))), (_arg) => {
            const zip = _arg;
            return singleton_2.Combine(singleton_2.For(slides, (_arg_1) => {
                const s = _arg_1;
                const matchValue = s.Clip;
                if (matchValue == null) {
                    return singleton_2.Zero();
                }
                else {
                    const clip = matchValue;
                    const path = `ppt/slides/slide${s.Number}.xml`;
                    return singleton_2.Bind(fromJs((zip.file(path)).async("string")), (_arg_2) => {
                        zip.file(path, withAutoplay(clip.Seconds, _arg_2));
                        return singleton_2.Zero();
                    });
                }
            }), singleton_2.Delay(() => singleton_2.Bind(fromJs(zip.generateAsync({
                type: "nodebuffer",
                compression: "DEFLATE",
            })), (_arg_3) => {
                writeBytes(file, _arg_3);
                return singleton_2.Zero();
            })));
        });
    });
}

function slideWriter() {
    if (forAll(packageInstalled, ofArray(["pptxgenjs", "jszip"]))) {
        return new FSharpResult$2(/* Ok */ 0, [undefined]);
    }
    else {
        return new FSharpResult$2(/* Error */ 1, [Failure.SlideWriterMissing]);
    }
}

function shoot(ws, slides) {
    const input = shots(ws, toList(delay(() => map((s) => [s.Step.Hold, s.Still], slides))));
    return singleton_2.Bind(input, (x$0027) => {
        let value;
        const _arg = x$0027 | 0;
        value = ((_arg === 0) ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [new Failure(/* RenderFailed */ 2, [_arg])])));
        return singleton_2.Return(value);
    });
}

function serve(ws) {
    return singleton_2.Delay(() => singleton_2.Bind(startServer(ws, ServeFor.ForRender), (_arg) => {
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
    const ws_1 = resolve(ws);
    const timing = readJson(join_1(ofArray([ws_1, "build", "timing.json"])));
    const name = timing.name;
    const title = Operators_IsNull(timing.title) ? name : timing.title;
    const scenes = scenesOf(timing);
    const out = (ext) => join_1(ofArray([ws_1, "out", `${name}.${ext}`]));
    const dir = join_1(ofArray([ws_1, "build", "present"]));
    const stills = mapIndexed((i, step) => (new Slide(i + 1, step, join_1(ofArray([dir, concat("slide-", padLeft(int32ToString(i + 1), 3, "0"), ".jpg")])), undefined)), cut(timing.duration, scenes));
    const input_46 = singleton_2.Delay(() => {
        let asyncResult_6;
        const value_1 = optionsOf(args);
        asyncResult_6 = singleton_2.Return(value_1);
        return singleton_2.Bind(asyncResult_6, (input_1_9) => {
            const input_44 = input_1_9;
            if (input_44.tag === 1) {
                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_44.fields[0]]));
            }
            else {
                const options = input_44.fields[0];
                writeText(out("script.md"), script(title, map_1((s) => s.Step, stills)));
                written(out("script.md"));
                writeText(out("srt"), srt(scenes));
                written(out("srt"));
                const video = silent(ws_1, name);
                const input_1 = video;
                if (input_1.tag === 1) {
                    eprint(concat("no silent copy: ", input_1.fields[0]));
                }
                else {
                    console.log(input_1.fields[0]);
                }
                let asyncResult_5;
                const value_1_1 = slideWriter();
                asyncResult_5 = singleton_2.Return(value_1_1);
                return singleton_2.Bind(asyncResult_5, (input_1_8) => {
                    const input_41 = input_1_8;
                    if (input_41.tag === 1) {
                        return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_41.fields[0]]));
                    }
                    else {
                        let asyncResult_4;
                        let value_1_2;
                        if (options.Clips) {
                            let input_5;
                            const input_3 = video;
                            input_5 = ((input_3.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_3.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [input_3.fields[0]])));
                            value_1_2 = ((input_5.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* NoVideo */ 3, [input_5.fields[0]])])) : (new FSharpResult$2(/* Ok */ 0, [input_5.fields[0]])));
                        }
                        else {
                            value_1_2 = (new FSharpResult$2(/* Ok */ 0, [undefined]));
                        }
                        asyncResult_4 = singleton_2.Return(value_1_2);
                        return singleton_2.Bind(asyncResult_4, (input_1_7) => {
                            const input_38 = input_1_7;
                            if (input_38.tag === 1) {
                                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_38.fields[0]]));
                            }
                            else {
                                remove(dir);
                                mkdirp(dir);
                                const asyncResult_3 = shoot(ws_1, stills);
                                return singleton_2.Bind(asyncResult_3, (input_1_6) => {
                                    let input_7;
                                    const input_35 = input_1_6;
                                    if (input_35.tag === 1) {
                                        return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_35.fields[0]]));
                                    }
                                    else {
                                        let asyncResult_2;
                                        const value_1_3 = defaultArg((input_7 = input_38.fields[0], (input_7 == null) ? undefined : withClips(input_7, stills)), new FSharpResult$2(/* Ok */ 0, [stills]));
                                        asyncResult_2 = singleton_2.Return(value_1_3);
                                        return singleton_2.Bind(asyncResult_2, (input_1_5) => {
                                            const input_32 = input_1_5;
                                            if (input_32.tag === 1) {
                                                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_32.fields[0]]));
                                            }
                                            else {
                                                const slides = input_32.fields[0];
                                                let asyncResult_1;
                                                const input_8 = pptx(title, slides, out("pptx"));
                                                asyncResult_1 = singleton_2.Bind(input_8, (x$0027) => singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [x$0027])));
                                                return singleton_2.Bind(asyncResult_1, (input_1_4) => {
                                                    const input_29 = input_1_4;
                                                    if (input_29.tag === 1) {
                                                        return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_29.fields[0]]));
                                                    }
                                                    else {
                                                        let computation1;
                                                        if (options.Clips) {
                                                            let x_3;
                                                            const input_11 = autoplay(out("pptx"), slides);
                                                            x_3 = singleton_2.Bind(input_11, (x$0027_1) => singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [x$0027_1])));
                                                            computation1 = singleton_2.Bind(x_3, (x$0027_2) => {
                                                                let value_10;
                                                                const input_15 = x$0027_2;
                                                                value_10 = ((input_15.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_15.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [undefined])));
                                                                return singleton_2.Return(value_10);
                                                            });
                                                        }
                                                        else {
                                                            const value_12 = ResultCE_ResultBuilder__Zero(ResultCE_result);
                                                            computation1 = singleton_2.Return(value_12);
                                                        }
                                                        const computation2 = singleton_2.Delay(() => {
                                                            const clips = length(filter((s_1) => (s_1.Clip != null), slides)) | 0;
                                                            console.log(`${out("pptx")}   (${length(slides)} slides${options.Clips ? (`, ${clips} with clips`) : ""})`);
                                                            if (options.Serve) {
                                                                let x_5;
                                                                const input_18 = serve(ws_1);
                                                                x_5 = singleton_2.Bind(input_18, (x$0027_3) => singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [x$0027_3])));
                                                                return singleton_2.Bind(x_5, (x$0027_4) => {
                                                                    let value_15;
                                                                    const input_22 = x$0027_4;
                                                                    value_15 = ((input_22.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_22.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [undefined])));
                                                                    return singleton_2.Return(value_15);
                                                                });
                                                            }
                                                            else {
                                                                const value_17 = ResultCE_ResultBuilder__Zero(ResultCE_result);
                                                                return singleton_2.Return(value_17);
                                                            }
                                                        });
                                                        return singleton_2.Bind(computation1, (input_1_3) => {
                                                            const input_26 = input_1_3;
                                                            if (input_26.tag === 1) {
                                                                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_26.fields[0]]));
                                                            }
                                                            else {
                                                                return computation2;
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });
    return singleton_2.Bind(input_46, (x$0027_5) => {
        let value_32;
        const _arg_8 = x$0027_5;
        value_32 = ((_arg_8.tag === 1) ? exitCode(name, _arg_8.fields[0]) : 0);
        return singleton_2.Return(value_32);
    });
}

