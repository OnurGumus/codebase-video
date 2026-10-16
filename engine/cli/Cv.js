
import { toString, Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { union_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { printf, toConsole, substring, concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { tail, head, isEmpty, ofArray, iterate, singleton } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { run, describe as describe_1, Failure_$reflection as Failure_$reflection_1 } from "./Narrate.js";
import { run as run_9, describe as describe_2, Failure_$reflection as Failure_$reflection_2 } from "./History.js";
import { run as run_5, describe as describe_3, Failure_$reflection as Failure_$reflection_3 } from "./Present.js";
import { startAsPromise } from "./fable_modules/fable-library-js.5.19.0/Async.js";
import { argv, resolve, engineDir, copyFile, mkdirp, isDir, writeText, readText, join, exists, exitUnlessDone, setExitCode, eprint } from "./Node.js";
import { singleton as singleton_1 } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { run as run_1, requireReady } from "./Setup.js";
import { run as run_2 } from "./Check.js";
import { run as run_3 } from "./Render.js";
import { run as run_4, chapters } from "./Video.js";
import { run as run_6 } from "./Scan.js";
import { run as run_7 } from "./ScanReport.js";
import { run as run_8 } from "./Fill.js";
import { run as run_10 } from "./ApplyFixes.js";

/**
 * Why a command could not start, or new-long would not write.
 */
export class CliFailure extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Usage", "NoWorkspace", "NotSetUp", "OldKit", "ClipExists"];
    }
    static Usage = new CliFailure(0, []);
    static OldKit = new CliFailure(3, []);
}

export function CliFailure_$reflection() {
    return union_type("Cv.CliFailure", [], CliFailure, () => [[], [["path", string_type]], [["hint", string_type]], [], [["path", string_type]]]);
}

function describeCli(failure) {
    switch (failure.tag) {
        case 1:
            return [2, singleton(concat("no such workspace: ", failure.fields[0]))];
        case 2:
            return [2, singleton(failure.fields[0])];
        case 3:
            return [2, singleton("clip.html loads /engine/stage-kit.js, which is gone: load build/timing.js, then <script type=\"module\" src=\"/engine/web/Main.js\">, and put your own script in a type=\"module\" script after it")];
        case 4:
            return [1, singleton(concat(failure.fields[0], " exists; not overwriting"))];
        default:
            return [2, singleton("usage: node engine/cli/Cv.js setup | <workspace> narrate|check|stills|sheet|serve|new-long|chapters|video|all|present|scan|report|fill|fix|history [...]")];
    }
}

/**
 * Why a command ended early, whichever part found it.
 */
export class Failure extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Cli", "Narrate", "History", "Present"];
    }
}

export function Failure_$reflection() {
    return union_type("Cv.Failure", [], Failure, () => [[["Item", CliFailure_$reflection()]], [["Item", Failure_$reflection_1()]], [["Item", Failure_$reflection_2()]], [["Item", Failure_$reflection_3()]]]);
}

/**
 * The exit code of a failure and the lines it prints on stderr.
 */
export function describe(failure) {
    switch (failure.tag) {
        case 1:
            return describe_1(failure.fields[0]);
        case 2:
            return describe_2(failure.fields[0]);
        case 3:
            return describe_3(failure.fields[0]);
        default:
            return describeCli(failure.fields[0]);
    }
}

/**
 * Runs a step to its end, then ends with its code; an Error prints its lines and ends with its code; an exception
 * is printed and ends with 1. The engine's one Async.StartAsPromise, and the one caller of process.exit: every
 * step below is an Async. A step that returns (Ok whatever its code, or Error) only sets process.exitCode: the
 * process ends by itself once the event loop is empty, so stdout reaches a slow pipe whole and V8 is torn down
 * before its threads are joined (process.exit joins them first and, rarely, hangs there for good:
 * nodejs/node#64274). A step leaves nothing running when it returns: Chrome and the page server are closed, and the
 * voice Worker is released, also when voicing fails. An exception can leave any of them running, so it also ends
 * by itself when nothing is left, and with process.exit a second later when something is.
 */
export function finish(step) {
    startAsPromise(step).then((outcome) => {
        if (outcome.tag === 1) {
            const patternInput = describe(outcome.fields[0]);
            iterate((s) => {
                eprint(s);
            }, patternInput[1]);
            setExitCode(patternInput[0]);
        }
        else {
            setExitCode(outcome.fields[0]);
        }
    }).catch((e) => {
        eprint(toString(e));
        exitUnlessDone(1, 1000);
    });
}

/**
 * The narration, unless build/timing.json is there already. Narrate.run is called here, at once, so that it reads
 * script.json before anything runs (a bad one throws from `run` itself).
 */
export function ensureTiming(ws) {
    if (exists(join(ofArray([ws, "build", "timing.json"])))) {
        return singleton_1.Return(new FSharpResult$2(/* Ok */ 0, [undefined]));
    }
    else {
        return run(ws);
    }
}

function andThen(next, first) {
    return singleton_1.Delay(() => {
        const asyncResult_1 = singleton_1.Bind(first, (x$0027) => {
            let value;
            const input_2 = x$0027;
            value = ((input_2.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* Narrate */ 1, [input_2.fields[0]])])) : (new FSharpResult$2(/* Ok */ 0, [input_2.fields[0]])));
            return singleton_1.Return(value);
        });
        return singleton_1.Bind(asyncResult_1, (input_1_2) => {
            const input_6 = input_1_2;
            if (input_6.tag === 1) {
                return singleton_1.Return(new FSharpResult$2(/* Error */ 1, [input_6.fields[0]]));
            }
            else {
                return next();
            }
        });
    });
}

function coded(step) {
    return singleton_1.Bind(step, (x$0027) => singleton_1.Return(new FSharpResult$2(/* Ok */ 0, [x$0027])));
}

/**
 * Workspaces started before the kit moved to F# carry a clip.html that loads /engine/stage.js, /engine/stage-kit.js
 * and the frame as an inline script. A long-video clip.html is the template copied verbatim, so its script block is
 * swapped for the new one (the old file is kept as build/clip.html.old-kit) and nothing else changes; the note that
 * it was upgraded is printed as it is. Any other clip.html that loads the old kit is an Error.
 */
export function upgradeClip(ws) {
    const clip = join(ofArray([ws, "clip.html"]));
    if (exists(clip)) {
        const html = readText(clip);
        const start = html.indexOf("<script src=\"build/timing.js\"></script>") | 0;
        const bodyEnd = html.lastIndexOf("</body>") | 0;
        if (html.indexOf("/engine/stage-kit.js") >= 0) {
            if (((html.indexOf("id=\"modules\"") >= 0) && (start >= 0)) && (bodyEnd > start)) {
                writeText(join(ofArray([ws, "build", "clip.html.old-kit"])), html);
                const block = "<!-- The frame (chapters, cards, progress bar, toasts, modules) is engine/web/Main.js, compiled from src/Kit. -->\n<script src=\"build/timing.js\"></script>\n<script type=\"module\" src=\"/engine/web/Main.js\"></script>\n";
                writeText(clip, (substring(html, 0, start) + block) + substring(html, bodyEnd));
                eprint("clip.html: upgraded to the F# kit (engine/web/Main.js); the old file is build/clip.html.old-kit");
                return new FSharpResult$2(/* Ok */ 0, [undefined]);
            }
            else {
                return new FSharpResult$2(/* Error */ 1, [CliFailure.OldKit]);
            }
        }
        else {
            return new FSharpResult$2(/* Ok */ 0, [undefined]);
        }
    }
    else {
        return new FSharpResult$2(/* Ok */ 0, [undefined]);
    }
}

function needsSetup(step) {
    switch (step) {
        case "narrate":
        case "check":
        case "new-long":
        case "fill":
        case "fix":
        case "history":
            return false;
        default:
            return true;
    }
}

function prepare(ws, step) {
    const input_6 = isDir(ws) ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [new CliFailure(/* NoWorkspace */ 1, [ws])]));
    if (input_6.tag === 1) {
        return new FSharpResult$2(/* Error */ 1, [input_6.fields[0]]);
    }
    else {
        mkdirp(join(ofArray([ws, "build"])));
        mkdirp(join(ofArray([ws, "out"])));
        let input_4;
        if (needsSetup(step)) {
            const input_1 = requireReady();
            input_4 = ((input_1.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [new CliFailure(/* NotSetUp */ 2, [input_1.fields[0]])])) : (new FSharpResult$2(/* Ok */ 0, [input_1.fields[0]])));
        }
        else {
            input_4 = (new FSharpResult$2(/* Ok */ 0, [undefined]));
        }
        if (input_4.tag === 1) {
            return new FSharpResult$2(/* Error */ 1, [input_4.fields[0]]);
        }
        else {
            const input_2 = (step !== "new-long") ? upgradeClip(ws) : (new FSharpResult$2(/* Ok */ 0, [undefined]));
            if (input_2.tag === 1) {
                return new FSharpResult$2(/* Error */ 1, [input_2.fields[0]]);
            }
            else {
                return new FSharpResult$2(/* Ok */ 0, [undefined]);
            }
        }
    }
}

function newLong(ws) {
    const dst = join(ofArray([ws, "clip.html"]));
    if (exists(dst)) {
        return new FSharpResult$2(/* Error */ 1, [new CliFailure(/* ClipExists */ 4, [dst])]);
    }
    else {
        copyFile(join(ofArray([engineDir, "templates", "long", "clip.html"])), dst);
        toConsole(printf("%s (write script.json and one <key>.js per module; see KIT.md)"))(dst);
        return new FSharpResult$2(/* Ok */ 0, [0]);
    }
}

export function main() {
    let value_1_4, x_1, input_1, value_1_7, value_1_10, value_1_12, x_5, input_8, value_1_15;
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
            finish(coded(run_1()));
            break;
        }
        case 1: {
            const ws = resolve(wsArg);
            const matchValue = prepare(ws, step);
            if (matchValue.tag === 0) {
                switch (step) {
                    case "narrate": {
                        finish(andThen(() => singleton_1.Return(new FSharpResult$2(/* Ok */ 0, [0])), run(ws)));
                        break;
                    }
                    case "check": {
                        finish((value_1_4 = (new FSharpResult$2(/* Ok */ 0, [run_2(ws, rest)])), singleton_1.Return(value_1_4)));
                        break;
                    }
                    case "stills":
                    case "sheet":
                    case "serve": {
                        finish(andThen(() => coded(run_3(ws, step, rest)), ensureTiming(ws)));
                        break;
                    }
                    case "new-long": {
                        finish((x_1 = ((input_1 = newLong(ws), (input_1.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* Cli */ 0, [input_1.fields[0]])])) : (new FSharpResult$2(/* Ok */ 0, [input_1.fields[0]])))), singleton_1.Return(x_1)));
                        break;
                    }
                    case "chapters": {
                        finish((value_1_7 = (new FSharpResult$2(/* Ok */ 0, [chapters(ws)])), singleton_1.Return(value_1_7)));
                        break;
                    }
                    case "video": {
                        finish(andThen(() => coded(run_4(ws, rest)), ensureTiming(ws)));
                        break;
                    }
                    case "present": {
                        finish(andThen(() => {
                            const input_2 = run_5(ws, rest);
                            return singleton_1.Bind(input_2, (x$0027) => {
                                let value_10;
                                const input_4 = x$0027;
                                value_10 = ((input_4.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* Present */ 3, [input_4.fields[0]])])) : (new FSharpResult$2(/* Ok */ 0, [input_4.fields[0]])));
                                return singleton_1.Return(value_10);
                            });
                        }, ensureTiming(ws)));
                        break;
                    }
                    case "all": {
                        finish(andThen(() => coded(run_4(ws, rest)), run(ws)));
                        break;
                    }
                    case "scan": {
                        finish(andThen(() => coded(run_6(ws, rest)), ensureTiming(ws)));
                        break;
                    }
                    case "report": {
                        finish((value_1_10 = (new FSharpResult$2(/* Ok */ 0, [run_7(ws, rest)])), singleton_1.Return(value_1_10)));
                        break;
                    }
                    case "fill": {
                        finish((value_1_12 = (new FSharpResult$2(/* Ok */ 0, [run_8(ws)])), singleton_1.Return(value_1_12)));
                        break;
                    }
                    case "history": {
                        finish((x_5 = ((input_8 = run_9(ws, rest), (input_8.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* History */ 2, [input_8.fields[0]])])) : (new FSharpResult$2(/* Ok */ 0, [input_8.fields[0]])))), singleton_1.Return(x_5)));
                        break;
                    }
                    case "fix": {
                        finish((value_1_15 = (new FSharpResult$2(/* Ok */ 0, [run_10(ws, rest)])), singleton_1.Return(value_1_15)));
                        break;
                    }
                    default:
                        finish(singleton_1.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* Cli */ 0, [CliFailure.Usage])])));
                }
            }
            else {
                finish(singleton_1.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* Cli */ 0, [matchValue.fields[0]])])));
            }
            break;
        }
        case 2: {
            finish(singleton_1.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* Cli */ 0, [CliFailure.Usage])])));
            break;
        }
    }
}

main();

