
import { argv, engineDir, copyFile, mkdirp, isDir, resolve, join, exists, exit, eprint } from "./Node.js";
import { toString } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { tail, head, isEmpty, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { run } from "./Narrate.js";
import { requireReady, run as run_1 } from "./Setup.js";
import { printf, toConsole, concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { run as run_2 } from "./Check.js";
import { run as run_3 } from "./Render.js";
import { run as run_4, chapters } from "./Video.js";
import { run as run_5 } from "./Scan.js";
import { run as run_6 } from "./ScanReport.js";
import { run as run_7 } from "./Fill.js";
import { run as run_8 } from "./ApplyFixes.js";

export function usage() {
    eprint("usage: node engine/cli/Cv.js setup | <workspace> narrate|check|stills|sheet|serve|new-long|chapters|video|all|scan|report|fill|fix [...]");
    return exit(2);
}

export function finish(p) {
    const pr_1 = p.then(exit);
    void (pr_1.catch((e) => {
        eprint(toString(e));
        exit(1);
    }));
}

export function ensureTiming(ws) {
    if (exists(join(ofArray([ws, "build", "timing.json"])))) {
        return Promise.resolve(undefined);
    }
    else {
        return run(ws);
    }
}

export function main() {
    let pr, pr_1, pr_2, pr_3, pr_4;
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
            if (((((step !== "narrate") && (step !== "check")) && (step !== "new-long")) && (step !== "fill")) && (step !== "fix")) {
                requireReady();
            }
            switch (step) {
                case "narrate": {
                    finish((pr = run(ws), pr.then(() => 0)));
                    break;
                }
                case "check": {
                    finish(Promise.resolve(run_2(ws, rest)));
                    break;
                }
                case "stills":
                case "sheet":
                case "serve": {
                    finish((pr_1 = ensureTiming(ws), pr_1.then(() => run_3(ws, step, rest))));
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
                    finish(Promise.resolve(chapters(ws)));
                    break;
                }
                case "video": {
                    finish((pr_2 = ensureTiming(ws), pr_2.then(() => run_4(ws))));
                    break;
                }
                case "all": {
                    finish((pr_3 = run(ws), pr_3.then(() => run_4(ws))));
                    break;
                }
                case "scan": {
                    finish((pr_4 = ensureTiming(ws), pr_4.then(() => run_5(ws, rest))));
                    break;
                }
                case "report": {
                    finish(Promise.resolve(run_6(ws, rest)));
                    break;
                }
                case "fill": {
                    finish(Promise.resolve(run_7(ws)));
                    break;
                }
                case "fix": {
                    finish(Promise.resolve(run_8(ws, rest)));
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

