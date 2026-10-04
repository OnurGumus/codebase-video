
import { eprint, copyFile, rename, mkdirp, writeText, mtime, fileSize, exists, runCapture, fs, readDir, run as run_1, hasCommand, remove, join, readJson } from "./Node.js";
import { indexed, length, forAll, contains, singleton, append, cons, filter, sort, map, tail, head, isEmpty, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { split, join as join_1, concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { write } from "./Chapters.js";
import { stringHash, disposeSafe, getEnumerator, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { singleton as singleton_1, append as append_1, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
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

export function run(ws, args) {
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
            if (!wholeFrames(ws, 30)) {
                console.log("timing.json is from an older engine (scenes do not end on whole frames): run narrate again, and later narration fixes will render only what they change");
            }
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
            const pr = isEmpty(jobs) ? (Promise.resolve(0)) : ranges(ws, 30, jobs);
            return pr.then((code) => {
                let args_1, args_2, args_3, args_4;
                if (code !== 0) {
                    return code | 0;
                }
                else {
                    const out = (ext_4) => join(ofArray([ws, "out", `${name}.${ext_4}`]));
                    const joined = (ext_5) => ofArray(["-f", "concat", "-safe", "0", "-i", concatList(dir, ext_5, 30, segments)]);
                    const audio = ofArray(["-i", join(ofArray([ws, "build", "narration.wav"])), "-map", "0:v", "-map", "1:a", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:v", "copy"]);
                    return sequence(append(lossless ? singleton((args_1 = append(joined("mkv"), ofArray(["-c", "copy", join(ofArray([ws, "build", "frames.mkv"]))])), () => (ffmpeg(args_1, undefined) | 0))) : ofArray([(args_2 = append(joined("mp4"), append(audio, ofArray(["-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", out("mp4")]))), () => (ffmpeg(args_2, undefined) | 0)), (args_3 = append(joined("webm"), append(audio, ofArray(["-c:a", "libopus", "-b:a", "96k", "-shortest", out("webm")]))), () => (ffmpeg(args_3, undefined) | 0)), (args_4 = ofArray(["-ss", patternInput[1], "-i", out("mp4"), "-frames:v", "1", "-q:v", "3", out("jpg")]), () => (ffmpeg(args_4, undefined) | 0)), () => {
                        copyFile(join(ofArray([ws, "build", "captions.vtt"])), out("vtt"));
                        return 0;
                    }, () => (chaptersFor(ws, name) | 0)]), append(singleton(() => {
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
                    }), lossless ? singleton(() => (run$0027("ls", ofArray(["-la", join(ofArray([ws, "build", "frames.mkv"]))])) | 0)) : singleton(() => (list(join(ofArray([ws, "out"])), name) | 0))))) | 0;
                }
            });
        }
        else {
            eprint("no Chrome found: set CHROME to the browser\'s executable");
            return Promise.resolve(2);
        }
    }
    else {
        eprint(concat("video: unknown option ", head(matchValue), " (options: --full, --lossless)"));
        return Promise.resolve(2);
    }
}

