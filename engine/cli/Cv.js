
import { argv, engineDir, copyFile, mkdirp, isDir, resolve, writeText, readText, join, exists, exit, eprint } from "./Node.js";
import { startAsPromise } from "./fable_modules/fable-library-js.5.19.0/Async.js";
import { toString } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { singleton } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";
import { tail, head, isEmpty, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { run } from "./Narrate.js";
import { printf, toConsole, concat, substring } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { requireReady, run as run_1 } from "./Setup.js";
import { run as run_2 } from "./Check.js";
import { run as run_3 } from "./Render.js";
import { run as run_4, chapters } from "./Video.js";
import { run as run_5 } from "./Present.js";
import { run as run_6 } from "./Scan.js";
import { run as run_7 } from "./ScanReport.js";
import { run as run_8 } from "./Fill.js";
import { run as run_9 } from "./History.js";
import { run as run_10 } from "./ApplyFixes.js";

export function usage() {
    eprint("usage: node engine/cli/Cv.js setup | <workspace> narrate|check|stills|sheet|serve|new-long|chapters|video|all|present|scan|report|fill|fix|history [...]");
    return exit(2);
}

/**
 * Runs a step to its end, then exits with its code; an exception is printed and exits with 1. The engine's one
 * Async.StartAsPromise: every step below is an Async.
 */
export function finish(step) {
    startAsPromise(step).then(exit).catch((e) => {
        eprint(toString(e));
        return exit(1);
    });
}

function narrated(narration) {
    return singleton.Delay(() => singleton.Bind(narration, (_arg) => {
        if (_arg.tag === 1) {
            eprint(_arg.fields[0]);
            exit(2);
            return singleton.Zero();
        }
        else {
            return singleton.Zero();
        }
    }));
}

export function ensureTiming(ws) {
    if (exists(join(ofArray([ws, "build", "timing.json"])))) {
        return singleton.Return(undefined);
    }
    else {
        return narrated(run(ws));
    }
}

function andThen(next, first) {
    return singleton.Delay(() => singleton.Bind(first, () => singleton.ReturnFrom(next())));
}

/**
 * Workspaces started before the kit moved to F# carry a clip.html that loads /engine/stage.js, /engine/stage-kit.js
 * and the frame as an inline script. A long-video clip.html is the template copied verbatim, so its script block is
 * swapped for the new one (the old file is kept as build/clip.html.old-kit) and nothing else changes.
 */
export function upgradeClip(ws) {
    const clip = join(ofArray([ws, "clip.html"]));
    if (exists(clip)) {
        const html = readText(clip);
        const start = html.indexOf("<script src=\"build/timing.js\"></script>") | 0;
        const stop = html.lastIndexOf("</body>") | 0;
        if (html.indexOf("/engine/stage-kit.js") >= 0) {
            if (((html.indexOf("id=\"modules\"") >= 0) && (start >= 0)) && (stop > start)) {
                writeText(join(ofArray([ws, "build", "clip.html.old-kit"])), html);
                const block = "<!-- The frame (chapters, cards, progress bar, toasts, modules) is engine/web/Main.js, compiled from src/Kit. -->\n<script src=\"build/timing.js\"></script>\n<script type=\"module\" src=\"/engine/web/Main.js\"></script>\n";
                writeText(clip, (substring(html, 0, start) + block) + substring(html, stop));
                eprint("clip.html: upgraded to the F# kit (engine/web/Main.js); the old file is build/clip.html.old-kit");
            }
            else {
                eprint("clip.html loads /engine/stage-kit.js, which is gone: load build/timing.js, then <script type=\"module\" src=\"/engine/web/Main.js\">, and put your own script in a type=\"module\" script after it");
                exit(2);
            }
        }
    }
}

export function main() {
    let matchResult, rest, step, wsArg;
    if (!isEmpty(argv)) {
        if (head(argv) === "setup") {
            if (!isEmpty(tail(argv))) {
                matchResult = 1;
                rest = tail(tail(argv));
                step = head(tail(argv));
                wsArg = head(argv);
            }
            else {
                matchResult = 0;
            }
        }
        else if (!isEmpty(tail(argv))) {
            matchResult = 1;
            rest = tail(tail(argv));
            step = head(tail(argv));
            wsArg = head(argv);
        }
        else {
            matchResult = 2;
        }
    }
    else {
        matchResult = 2;
    }
    switch (matchResult) {
        case 0: {
            finish(run_1());
            break;
        }
        case 1: {
            const ws = resolve(wsArg);
            if (!isDir(ws)) {
                eprint(concat("no such workspace: ", ws));
                exit(2);
            }
            mkdirp(join(ofArray([ws, "build"])));
            mkdirp(join(ofArray([ws, "out"])));
            if ((((((step !== "narrate") && (step !== "check")) && (step !== "new-long")) && (step !== "fill")) && (step !== "fix")) && (step !== "history")) {
                const matchValue = requireReady();
                if (matchValue.tag === 1) {
                    eprint(matchValue.fields[0]);
                    exit(2);
                }
            }
            if (step !== "new-long") {
                upgradeClip(ws);
            }
            switch (step) {
                case "narrate": {
                    finish(andThen(() => singleton.Return(0), narrated(run(ws))));
                    break;
                }
                case "check": {
                    finish(singleton.Return(run_2(ws, rest)));
                    break;
                }
                case "stills":
                case "sheet":
                case "serve": {
                    finish(andThen(() => run_3(ws, step, rest), ensureTiming(ws)));
                    break;
                }
                case "new-long": {
                    const dst = join(ofArray([ws, "clip.html"]));
                    if (exists(dst)) {
                        eprint(concat(dst, " exists; not overwriting"));
                        exit(1);
                    }
                    copyFile(join(ofArray([engineDir, "templates", "long", "clip.html"])), dst);
                    toConsole(printf("%s (write script.json and one <key>.js per module; see KIT.md)"))(dst);
                    exit(0);
                    break;
                }
                case "chapters": {
                    finish(singleton.Return(chapters(ws)));
                    break;
                }
                case "video": {
                    finish(andThen(() => run_4(ws, rest), ensureTiming(ws)));
                    break;
                }
                case "present": {
                    finish(andThen(() => run_5(ws, rest), ensureTiming(ws)));
                    break;
                }
                case "all": {
                    finish(andThen(() => run_4(ws, rest), narrated(run(ws))));
                    break;
                }
                case "scan": {
                    finish(andThen(() => run_6(ws, rest), ensureTiming(ws)));
                    break;
                }
                case "report": {
                    finish(singleton.Return(run_7(ws, rest)));
                    break;
                }
                case "fill": {
                    finish(singleton.Return(run_8(ws)));
                    break;
                }
                case "history": {
                    finish(singleton.Return(run_9(ws, rest)));
                    break;
                }
                case "fix": {
                    finish(singleton.Return(run_10(ws, rest)));
                    break;
                }
                default:
                    usage();
            }
            break;
        }
        case 2: {
            usage();
            break;
        }
    }
}

main();

