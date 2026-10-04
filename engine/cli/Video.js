
import { copyFile, fs, run as run_1, hasCommand, readDir, remove, join, readJson } from "./Node.js";
import { append, singleton, cons, filter, sort, map, tail, head, isEmpty, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { write } from "./Chapters.js";
import { curry2, disposeSafe, getEnumerator, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { run as run_2 } from "./Render.js";

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

export function run(ws) {
    const pr = run_2(ws, "video", singleton("30"));
    return pr.then((code) => {
        if (code !== 0) {
            return code | 0;
        }
        else {
            const patternInput = timingOf(ws);
            const name = patternInput[0];
            const frames = join(ofArray([ws, "build", "frames.mkv"]));
            const out = (ext) => join(ofArray([ws, "out", `${name}.${ext}`]));
            const audio = ofArray(["-i", join(ofArray([ws, "build", "narration.wav"])), "-map", "0:v", "-map", "1:a", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000"]);
            const ffmpeg = (args, unitVar) => (run_1("ffmpeg", append(ofArray(["-hide_banner", "-loglevel", "error", "-y"]), args)) | 0);
            return sequence(ofArray([curry2(ffmpeg)(append(ofArray(["-i", frames]), append(audio, ofArray(["-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-tune", "animation", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", out("mp4")])))), curry2(ffmpeg)(append(ofArray(["-i", frames]), append(audio, ofArray(["-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "96k", "-shortest", out("webm")])))), curry2(ffmpeg)(ofArray(["-ss", patternInput[1], "-i", frames, "-frames:v", "1", "-q:v", "3", out("jpg")])), () => {
                copyFile(join(ofArray([ws, "build", "captions.vtt"])), out("vtt"));
                return 0;
            }, () => (chaptersFor(ws, name) | 0), () => {
                remove(frames);
                return 0;
            }, () => (list(join(ofArray([ws, "out"])), name) | 0)])) | 0;
        }
    });
}

