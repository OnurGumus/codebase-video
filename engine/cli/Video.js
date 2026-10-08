
import { copyFile, mkdirp, eprint, platform, rename, env, writeText, mtime, fileSize, exists, runCapture, fs, readDir, run as run_1, hasCommand, remove, join, readJson } from "./Node.js";
import { indexed, length, forAll, contains, singleton, append, cons, filter, sort, map, tail, head, isEmpty, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { split, join as join_1, concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { write } from "./Chapters.js";
import { stringHash, disposeSafe, getEnumerator, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { singleton as singleton_1, append as append_1, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { toString } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { singleton as singleton_2 } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";
import { ranges, Range$, findChrome } from "./Render.js";
import { wholeFrames, plan } from "./Segments.js";
import { FSharpSet__Contains, ofList } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { item } from "./fable_modules/fable-library-js.5.19.0/Array.js";

function timingOf(ws) {
    const timing = readJson(join(ofArray([ws, "build", "timing.json"])));
    return [timing.name, timing.poster.toString()];
}

function chaptersFor(ws, name) {
    const vtt = join(ofArray([ws, "out", concat(name, ".chapters.vtt")]));
    const matchValue = write(join(ofArray([ws, "build", "timing.json"])), vtt) | 0;
    switch (matchValue) {
        case 0:
            return 0;
        case 3: {
            remove(vtt);
            return 0;
        }
        default:
            return 1;
    }
}

/**
 * The "chapters" step: (re)write out/<name>.chapters.vtt from timing.json, no render.
 */
export function chapters(ws) {
    return chaptersFor(ws, timingOf(ws)[0]) | 0;
}

function sequence(steps_mut) {
    sequence:
    while (true) {
        const steps = steps_mut;
        if (!isEmpty(steps)) {
            const matchValue = head(steps)() | 0;
            if (matchValue === 0) {
                steps_mut = tail(steps);
                continue sequence;
            }
            else {
                return matchValue | 0;
            }
        }
        else {
            return 0;
        }
        break;
    }
}

function run$0027(cmd, args) {
    if (hasCommand(cmd)) {
        return run_1(cmd, args) | 0;
    }
    else {
        return 0;
    }
}

function list(outDir, name) {
    const files = map((f_1) => join(ofArray([outDir, f_1])), sort(filter((f) => f.startsWith(name + "."), readDir(outDir)), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    }));
    if (hasCommand("ls")) {
        return run_1("ls", cons("-la", files)) | 0;
    }
    else {
        const enumerator = getEnumerator(files);
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const f_2 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                console.log(`${(fs.statSync(f_2)).size}  ${f_2}`);
            }
        }
        finally {
            disposeSafe(enumerator);
        }
        return 0;
    }
}

function ffmpeg(args, unitVar) {
    return run_1("ffmpeg", append(ofArray(["-hide_banner", "-loglevel", "error", "-y"]), args)) | 0;
}

const x264 = ofArray(["-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-tune", "animation"]);

const vp9 = ofArray(["-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p"]);

const ffv1 = ofArray(["-c:v", "ffv1", "-pix_fmt", "yuv444p"]);

function browserId(chrome) {
    const matchValue = runCapture(chrome, singleton("--version"));
    let matchResult;
    if (matchValue[0] === 0) {
        if (matchValue[1].trim() !== "") {
            matchResult = 0;
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
            return matchValue[1].trim();
        default:
            if (exists(chrome)) {
                return `${chrome} ${fileSize(chrome)} ${mtime(chrome)}`;
            }
            else {
                return chrome;
            }
    }
}

function concatList(dir, ext, fps, segments) {
    const micros = (frame) => (Math.round((frame * 1000000) / fps));
    const file = join(ofArray([dir, concat("list-", ext, ".txt")]));
    writeText(file, join_1("\n", cons("ffconcat version 1.0", toList(delay(() => collect((s) => append_1(singleton_1(`file '${s.Key}.${ext}'`), delay(() => singleton_1(concat("duration ", ((micros(s.End) - micros(s.First)) / 1000000).toFixed(6))))), segments))))) + "\n");
    return file;
}

const MAX_MB = (() => {
    let s;
    let matchValue;
    const option_1 = env("CODEBASE_VIDEO_SHORT_MAX_MB");
    matchValue = ((option_1 != null) ? ((s = option_1, Number(s))) : undefined);
    let matchResult, mb_1;
    if (matchValue != null) {
        if (matchValue > 0) {
            matchResult = 0;
            mb_1 = matchValue;
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
            return mb_1;
        default:
            return 10;
    }
})();

const ATTACH_LIMIT = (MAX_MB * 1000000) * 0.98;

const AAC_KBPS = 64;

function lengthOf(ws) {
    const brief = join(ofArray([ws, "brief.json"]));
    if (exists(brief)) {
        const v = readJson(brief).length;
        if (Operators_IsNull(v)) {
            return "tour";
        }
        else {
            return toString(v);
        }
    }
    else {
        return "";
    }
}

function fitShort(ws, mp4) {
    let args, args_1;
    const megabytes = (bytes) => ((bytes / 1000000).toFixed(1));
    if (lengthOf(ws) !== "short") {
        return 0;
    }
    else {
        const size = fileSize(mp4);
        if (size <= ATTACH_LIMIT) {
            console.log(`mp4: ${megabytes(size)} MB (a short video is kept under ${MAX_MB} MB; GitHub plays up to 10 MB inline)`);
            return 0;
        }
        else {
            const timing = readJson(join(ofArray([ws, "build", "timing.json"])));
            const seconds = timing.duration;
            const kbps = Math.floor(((((ATTACH_LIMIT * 8) / seconds) / 1000) - AAC_KBPS) - 6);
            const log = join(ofArray([ws, "build", "fit-pass"]));
            const big = join(ofArray([ws, "build", "fit-source.mp4"]));
            const picture = ofArray(["-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-b:v", `${kbps}k`, "-pix_fmt", "yuv420p", "-passlogfile", log]);
            console.log(`mp4: ${megabytes(size)} MB is over the ${MAX_MB} MB a short video may have; encoding the picture again at ${kbps} kbit/s`);
            rename(mp4, big);
            const code = sequence(ofArray([(args = append(ofArray(["-i", big]), append(picture, ofArray(["-pass", "1", "-an", "-f", "null", (platform === "win32") ? "NUL" : "/dev/null"]))), () => (ffmpeg(args, undefined) | 0)), (args_1 = append(ofArray(["-i", big]), append(picture, ofArray(["-pass", "2", "-c:a", "copy", "-movflags", "+faststart", mp4]))), () => (ffmpeg(args_1, undefined) | 0))])) | 0;
            const enumerator = getEnumerator(readDir(join(ofArray([ws, "build"]))));
            try {
                while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                    const f = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    if (f.startsWith("fit-pass")) {
                        remove(join(ofArray([ws, "build", f])));
                    }
                }
            }
            finally {
                disposeSafe(enumerator);
            }
            if (code !== 0) {
                rename(big, mp4);
                return code | 0;
            }
            else {
                remove(big);
                const fitted = fileSize(mp4);
                console.log(concat("mp4: now ", megabytes(fitted), " MB"));
                if (fitted > (MAX_MB * 1000000)) {
                    eprint(`the mp4 is still over ${MAX_MB} MB: shorten the video, or host it elsewhere`);
                }
                return 0;
            }
        }
    }
}

export function run(ws, args) {
    return singleton_2.Delay(() => {
        const full = contains("--full", args, {
            Equals: (x, y) => (x === y),
            GetHashCode: (x) => (stringHash(x) | 0),
        });
        const lossless = contains("--lossless", args, {
            Equals: (x_1, y_1) => (x_1 === y_1),
            GetHashCode: (x_1) => (stringHash(x_1) | 0),
        });
        const matchValue = filter((a) => {
            if (a !== "--full") {
                return a !== "--lossless";
            }
            else {
                return false;
            }
        }, args);
        if (isEmpty(matchValue)) {
            const matchValue_1 = findChrome();
            if (matchValue_1 != null) {
                const chrome = matchValue_1;
                const patternInput = timingOf(ws);
                const name = patternInput[0];
                const exts = lossless ? singleton("mkv") : ofArray(["mp4", "webm"]);
                const encoder = join_1(" ", lossless ? ffv1 : append(x264, vp9));
                const segments = plan(ws, 30, "1920x1080@1", browserId(chrome), encoder);
                const dir = join(ofArray([ws, "build", lossless ? "segments-lossless" : "segments"]));
                mkdirp(dir);
                const file = (key, ext) => join(ofArray([dir, concat(key, ".", ext)]));
                const missing = filter((arg) => !(!full && forAll((ext_1) => exists(file(arg.Key, ext_1)), exts)), segments);
                return singleton_2.Combine(!wholeFrames(ws, 30) ? ((console.log("timing.json is from an older engine (scenes do not end on whole frames): run narrate again, and later narration fixes will render only what they change"), singleton_2.Zero())) : singleton_2.Zero(), singleton_2.Delay(() => {
                    const jobs = toList(delay(() => collect((matchValue_2) => {
                        let temp;
                        const s_1 = matchValue_2[1];
                        return singleton_1((temp = ((ext_2) => file(s_1.Key, "tmp." + ext_2)), new Range$(`[${matchValue_2[0] + 1}/${length(missing)}] ${s_1.Id}`, s_1.First, s_1.End, lossless ? append(ffv1, singleton(temp("mkv"))) : append(ofArray(["-map", "0:v"]), append(x264, append(ofArray([temp("mp4"), "-map", "0:v"]), append(vp9, singleton(temp("webm")))))), () => {
                            const enumerator = getEnumerator(exts);
                            try {
                                while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                                    const ext_3 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                                    rename(temp(ext_3), file(s_1.Key, ext_3));
                                }
                            }
                            finally {
                                disposeSafe(enumerator);
                            }
                            writeText(file(s_1.Key, "json"), s_1.Input);
                        })));
                    }, indexed(missing))));
                    return singleton_2.Bind(isEmpty(jobs) ? singleton_2.Return(0) : ranges(ws, 30, jobs), (_arg) => {
                        let args_1, args_2, args_3, args_4;
                        const code = _arg | 0;
                        if (code !== 0) {
                            return singleton_2.Return(code);
                        }
                        else {
                            const out = (ext_4) => join(ofArray([ws, "out", `${name}.${ext_4}`]));
                            const joined = (ext_5) => ofArray(["-f", "concat", "-safe", "0", "-i", concatList(dir, ext_5, 30, segments)]);
                            const audio = ofArray(["-i", join(ofArray([ws, "build", "narration.wav"])), "-map", "0:v", "-map", "1:a", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:v", "copy"]);
                            const assemble = lossless ? singleton((args_1 = append(joined("mkv"), ofArray(["-c", "copy", join(ofArray([ws, "build", "frames.mkv"]))])), () => (ffmpeg(args_1, undefined) | 0))) : ofArray([(args_2 = append(joined("mp4"), append(audio, ofArray(["-c:a", "aac", "-b:a", `${AAC_KBPS}k`, "-ac", "1", "-movflags", "+faststart", "-shortest", out("mp4")]))), () => (ffmpeg(args_2, undefined) | 0)), () => (fitShort(ws, out("mp4")) | 0), (args_3 = append(joined("webm"), append(audio, ofArray(["-c:a", "libopus", "-b:a", "48k", "-ac", "1", "-shortest", out("webm")]))), () => (ffmpeg(args_3, undefined) | 0)), (args_4 = ofArray(["-ss", patternInput[1], "-i", out("mp4"), "-frames:v", "1", "-q:v", "3", out("jpg")]), () => (ffmpeg(args_4, undefined) | 0)), () => {
                                copyFile(join(ofArray([ws, "build", "captions.vtt"])), out("vtt"));
                                return 0;
                            }, () => (chaptersFor(ws, name) | 0)]);
                            return singleton_2.Return(sequence(append(assemble, append(singleton(() => {
                                const keep = ofList(map((s_2) => s_2.Key, segments), {
                                    Compare: (x_2, y_2) => (comparePrimitives(x_2, y_2) | 0),
                                });
                                const enumerator_1 = getEnumerator(readDir(dir));
                                try {
                                    while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                                        const f = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                                        if (!f.startsWith("list-") && !FSharpSet__Contains(keep, item(0, split(f, ["."], undefined, 0)))) {
                                            remove(join(ofArray([dir, f])));
                                        }
                                    }
                                }
                                finally {
                                    disposeSafe(enumerator_1);
                                }
                                console.log(`segments: ${length(segments) - length(missing)} reused, ${length(missing)} rendered`);
                                return 0;
                            }), lossless ? singleton(() => (run$0027("ls", ofArray(["-la", join(ofArray([ws, "build", "frames.mkv"]))])) | 0)) : singleton(() => (list(join(ofArray([ws, "out"])), name) | 0))))));
                        }
                    });
                }));
            }
            else {
                eprint("no Chrome found: set CHROME to the browser\'s executable");
                return singleton_2.Return(2);
            }
        }
        else {
            eprint(concat("video: unknown option ", head(matchValue), " (options: --full, --lossless)"));
            return singleton_2.Return(2);
        }
    });
}

