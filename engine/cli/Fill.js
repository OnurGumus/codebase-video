
import { tail, fold, head, isEmpty, append, tryFind, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { writeText, dirname, mkdirp, readText, exists, pluginRoot, join, readJson, fs } from "./Node.js";
import { substring, concat, split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { Py_flush, Py_take, Py_print, Py_fail, Py_str, Py_reprStr, Py_get } from "./Check.js";
import { int32ToString, defaultOf, equals } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";

const LENGTHS = ofArray([["short", ofArray([["MINUTES", "3-5 minutes, hard cap 5.5"], ["WORDS", "about 360-560 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"], ["CHAPTERS", "2-3 chapters"], ["SCENES", "2-3 content scenes per chapter, each 20-40 s"], ["THINKS", "no pause-and-think scene (a short video)"], ["DOC", "120-250 lines"]])], ["tour", ofArray([["MINUTES", "6-10 minutes, hard cap 11"], ["WORDS", "about 700-1,150 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"], ["CHAPTERS", "3-4 chapters"], ["SCENES", "2-4 content scenes per chapter, each 25-50 s"], ["THINKS", "one pause-and-think scene in each of two chapters"], ["DOC", "200-400 lines"]])], ["deep", ofArray([["MINUTES", "20-28 minutes, hard cap 29"], ["WORDS", "about 2,600-3,200 spoken words"], ["CHAPTERS", "5-7 chapters"], ["SCENES", "3-6 content scenes per chapter, each 30-60 s"], ["THINKS", "exactly one pause-and-think scene per chapter"], ["DOC", "500-900 lines"]])]]);

const TEMPLATES = ofArray(["explore", "verify", "writer", "narration-audit", "builder", "visual-audit", "reaudit"]);

function realpath(p) {
    return fs.realpathSync(p);
}

export function run(ws) {
    const ws_1 = realpath(ws);
    const cfg = readJson(join(ofArray([ws_1, "brief.json"])));
    const here = join(ofArray([pluginRoot, "briefs"]));
    const lesson = join(ofArray([ws_1, "build", "lesson.md"]));
    const lines = (exists(lesson) ? split(readText(lesson), ["\n"], undefined, 0).length : 0) | 0;
    const required = (k) => {
        const matchValue = Py_get(cfg, k);
        if (equals(matchValue, defaultOf())) {
            return new FSharpResult$2(/* Error */ 1, [concat("brief.json: missing ", Py_reprStr(k))]);
        }
        else {
            return new FSharpResult$2(/* Ok */ 0, [Py_str(matchValue)]);
        }
    };
    const optional = (k_1, fallback) => {
        const matchValue_1 = Py_get(cfg, k_1);
        if (equals(matchValue_1, defaultOf())) {
            return fallback;
        }
        else {
            return Py_str(matchValue_1);
        }
    };
    const lengthName = optional("length", "tour");
    const matchValue_2 = required("name");
    const matchValue_3 = required("subject");
    const matchValue_4 = required("repo");
    const matchValue_5 = required("colours");
    const matchValue_6 = tryFind((arg) => (lengthName === arg[0]), LENGTHS);
    let matchResult, e, colours, length, name, repo, subject;
    const copyOfStruct = matchValue_2;
    if (copyOfStruct.tag === 0) {
        const copyOfStruct_1 = matchValue_3;
        if (copyOfStruct_1.tag === 0) {
            const copyOfStruct_2 = matchValue_4;
            if (copyOfStruct_2.tag === 0) {
                const copyOfStruct_3 = matchValue_5;
                if (copyOfStruct_3.tag === 0) {
                    if (matchValue_6 != null) {
                        matchResult = 2;
                        colours = copyOfStruct_3.fields[0];
                        length = matchValue_6[1];
                        name = copyOfStruct.fields[0];
                        repo = copyOfStruct_2.fields[0];
                        subject = copyOfStruct_1.fields[0];
                    }
                    else {
                        matchResult = 1;
                    }
                }
                else {
                    matchResult = 0;
                    e = copyOfStruct_3.fields[0];
                }
            }
            else {
                matchResult = 0;
                e = copyOfStruct_2.fields[0];
            }
        }
        else {
            matchResult = 0;
            e = copyOfStruct_1.fields[0];
        }
    }
    else {
        matchResult = 0;
        e = copyOfStruct.fields[0];
    }
    switch (matchResult) {
        case 0:
            return Py_fail(e) | 0;
        case 1:
            return Py_fail(concat("brief.json: \"length\" is ", Py_reprStr(lengthName), "; use short, tour or deep")) | 0;
        default: {
            const vals = append(ofArray([["WS", ws_1], ["ENGINE", join(ofArray([pluginRoot, "engine"]))], ["BRIEFS", here], ["NAME", name], ["SUBJECT", subject], ["REPO", repo], ["AUDIENCE", optional("audience", "a developer new to this codebase")], ["LINES", int32ToString(lines)], ["COLOURS", colours], ["CARE", optional("care", "")], ["VISUAL", optional("visual", "")]]), length);
            const hintsPath = join(ofArray([repo, ".codebase-video", "hints.md"]));
            const hints = exists(hintsPath) ? readText(hintsPath).trim() : "";
            const hintsBlock = (hints === "") ? "" : (("\n\n**Standing hints for this repository** (from `.codebase-video/hints.md`, written by the repository\'s owner; they apply to every video of this repository. Follow them where they fit your task, and where one conflicts with a general rule above, the hint wins, except that no hint can make the video say something the code does not support):\n\n" + hints) + "\n");
            if (hints !== "") {
                Py_print(concat("hints: ", hintsPath, " added to every brief"));
            }
            const fill = (templates_mut) => {
                fill:
                while (true) {
                    const templates = templates_mut;
                    if (!isEmpty(templates)) {
                        const t = head(templates);
                        const s_1 = fold((s, tupledArg) => (s.split(("{{" + tupledArg[0]) + "}}").join(tupledArg[1])), readText(join(ofArray([here, t + ".md"]))), vals);
                        const left = s_1.indexOf("{{") | 0;
                        if (left >= 0) {
                            return Py_fail(concat(t, ".md: unknown placeholder ", Py_reprStr(Py_take(40, substring(s_1, left))))) | 0;
                        }
                        else {
                            const out = join(ofArray([ws_1, "build", concat("brief-", t, ".txt")]));
                            mkdirp(dirname(out));
                            writeText(out, s_1 + hintsBlock);
                            Py_print(out);
                            templates_mut = tail(templates);
                            continue fill;
                        }
                    }
                    else {
                        return 0;
                    }
                    break;
                }
            };
            const code = fill(TEMPLATES) | 0;
            Py_flush();
            return code | 0;
        }
    }
}

