
import { tail, head, isEmpty, append, empty, map as map_1, tryFind, contains, find, exists as exists_1, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { basename, writeText, dirname, mkdirp, path, readText, exists, pluginRoot, join, readJson, fs } from "./Node.js";
import { join as join_1, concat, split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { Py_flush, Py_print, Py_fail, Py_str, Py_reprStr, Py_get } from "./Check.js";
import { comparePrimitives, int32ToString, stringHash, defaultOf, equals } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { tryFind as tryFind_1, map } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { toString } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { FSharpSet__Contains, ofList } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { FSharpMap__get_Item, ofList as ofList_1 } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { singleton, append as append_1, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";

const LENGTHS = ofArray([["short", ofArray([["MINUTES", "3-5 minutes, hard cap 5.5"], ["WORDS", "about 360-560 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"], ["CHAPTERS", "2-3 chapters"], ["SCENES", "2-3 content scenes per chapter, each 20-40 s"], ["THINKS", "no pause-and-think scene (a short video)"], ["DOC", "120-250 lines"]])], ["tour", ofArray([["MINUTES", "6-10 minutes, hard cap 11"], ["WORDS", "about 700-1,150 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"], ["CHAPTERS", "3-4 chapters"], ["SCENES", "2-4 content scenes per chapter, each 25-50 s"], ["THINKS", "one pause-and-think scene in each of two chapters"], ["DOC", "200-400 lines"]])], ["deep", ofArray([["MINUTES", "20-28 minutes, hard cap 29"], ["WORDS", "about 2,600-3,200 spoken words"], ["CHAPTERS", "5-7 chapters"], ["SCENES", "3-6 content scenes per chapter, each 30-60 s"], ["THINKS", "exactly one pause-and-think scene per chapter"], ["DOC", "500-900 lines"]])]]);

const PROGRESS_LENGTHS = ofArray([["short", ofArray([["MINUTES", "3-5 minutes, hard cap 5.5"], ["WORDS", "about 360-560 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"], ["CHAPTERS", "an \"At a glance\" chapter, 2-3 theme chapters and an \"In flight\" chapter"], ["SCENES", "1-3 content scenes per chapter, each 15-40 s"], ["THINKS", "no pause-and-think scene"], ["DOC", "150-300 lines"]])], ["tour", ofArray([["MINUTES", "6-10 minutes, hard cap 11"], ["WORDS", "about 700-1,150 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"], ["CHAPTERS", "an \"At a glance\" chapter, 4-6 theme chapters and an \"In flight\" chapter"], ["SCENES", "2-3 content scenes per chapter, each 20-45 s"], ["THINKS", "no pause-and-think scene"], ["DOC", "300-500 lines"]])]]);

const FOCUS = ofArray([["shipped", "**What shipped.** The features and fixes that exist at the end of the range and did not at its start, in plain language, each shown before and after. This is the spine of the video."], ["effort", "**Where the effort went.** Which areas of the codebase saw the most change and which were left alone, from the area table of the history file. Say it as where the work went, never as how hard anyone worked."], ["goals", "**Progress against goals.** Each goal of the goals file, quoted, with what the history shows for it: done, partly done, or nothing found, each with its commits. A goal is done only when the diff shows it."], ["people", "**Who worked on what.** By area, which people committed there and how many commits, exactly as the history file gives it. No ranking, no totals per person across the project, no word that judges a person or compares two."]]);

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
    const kind = optional("kind", "teach");
    const progress = kind === "progress";
    const lengthName = optional("length", progress ? "short" : "tour");
    const lengths = progress ? PROGRESS_LENGTHS : LENGTHS;
    let focus;
    const matchValue_2 = Py_get(cfg, "focus");
    focus = (equals(matchValue_2, defaultOf()) ? ofArray(["shipped", "effort"]) : ((Array.isArray(matchValue_2)) ? ofArray(matchValue_2) : ofArray(map((s) => s.trim(), split(Py_str(matchValue_2), [","], undefined, 0)))));
    const historyPath = join(ofArray([ws_1, "build", "history.json"]));
    const goals = optional("goals", "");
    const goalsPath = (goals === "") ? "" : (path.resolve(optional("repo", ws_1), goals));
    const problem = ((kind !== "teach") && (kind !== "progress")) ? concat("brief.json: \"kind\" is ", Py_reprStr(kind), "; use teach or progress") : (!progress ? undefined : (!exists(historyPath) ? "fill: run \"history\" first (build/history.json is missing)" : (exists_1((f) => !exists_1((arg) => (f === arg[0]), FOCUS), focus) ? concat("brief.json: \"focus\" holds ", Py_reprStr(find((f_1) => !exists_1((arg_1) => (f_1 === arg_1[0]), FOCUS), focus)), "; use shipped, effort, goals, people") : ((contains("goals", focus, {
        Equals: (x, y_2) => (x === y_2),
        GetHashCode: (x) => (stringHash(x) | 0),
    }) && (goals === "")) ? "brief.json: the focus \"goals\" needs \"goals\": the path of a goals or roadmap file" : ((contains("goals", focus, {
        Equals: (x_1, y_3) => (x_1 === y_3),
        GetHashCode: (x_1) => (stringHash(x_1) | 0),
    }) && !exists(goalsPath)) ? concat("brief.json: the goals file ", goalsPath, " does not exist") : undefined)))));
    const matchValue_3 = required("name");
    const matchValue_4 = required("subject");
    const matchValue_5 = required("repo");
    const matchValue_6 = required("colours");
    const matchValue_7 = tryFind((arg_2) => (lengthName === arg_2[0]), lengths);
    let matchResult, e, e_1, colours, length, name, repo, subject;
    if (problem == null) {
        const copyOfStruct = matchValue_3;
        if (copyOfStruct.tag === 0) {
            const copyOfStruct_1 = matchValue_4;
            if (copyOfStruct_1.tag === 0) {
                const copyOfStruct_2 = matchValue_5;
                if (copyOfStruct_2.tag === 0) {
                    const copyOfStruct_3 = matchValue_6;
                    if (copyOfStruct_3.tag === 0) {
                        if (matchValue_7 != null) {
                            matchResult = 3;
                            colours = copyOfStruct_3.fields[0];
                            length = matchValue_7[1];
                            name = copyOfStruct.fields[0];
                            repo = copyOfStruct_2.fields[0];
                            subject = copyOfStruct_1.fields[0];
                        }
                        else {
                            matchResult = 2;
                        }
                    }
                    else {
                        matchResult = 1;
                        e_1 = copyOfStruct_3.fields[0];
                    }
                }
                else {
                    matchResult = 1;
                    e_1 = copyOfStruct_2.fields[0];
                }
            }
            else {
                matchResult = 1;
                e_1 = copyOfStruct_1.fields[0];
            }
        }
        else {
            matchResult = 1;
            e_1 = copyOfStruct.fields[0];
        }
    }
    else {
        matchResult = 0;
        e = problem;
    }
    switch (matchResult) {
        case 0:
            return Py_fail(e) | 0;
        case 1:
            return Py_fail(e_1) | 0;
        case 2: {
            const allowed = join_1(", ", map_1((tuple_3) => tuple_3[0], lengths));
            return Py_fail(`brief.json: "length" is ${Py_reprStr(lengthName)}; for a ${kind} video use one of: ${allowed}`) | 0;
        }
        default: {
            let range;
            if (!progress) {
                range = empty();
            }
            else {
                const h = readJson(historyPath).range;
                const point = (p) => (`${p.ref} (${p.commit}, ${p.date})`);
                let how;
                const matchValue_9 = toString(h.sinceWas);
                how = ((matchValue_9 === "last video") ? " The start is where the last progress video of this repository ended." : ((matchValue_9 === "latest tag") ? " No start was given, so the range starts at the latest tag." : ((matchValue_9 === "30 days") ? " No start was given and there is no earlier tag, so the range starts 30 days back." : ((matchValue_9 === "first commit") ? " The start asked for is before the first commit, so the range starts at the first commit." : ""))));
                range = ofArray([["SINCE", point(h.since)], ["UNTIL", point(h.until)], ["RANGE", `from ${point(h.since)} to ${point(h.until)}: ${h.days} days, ${h.commits} commits.${how}`], ["HISTORY", join(ofArray([ws_1, "build", "history.md"]))], ["GOALS", (goalsPath === "") ? "no goals file was given" : goalsPath], ["FOCUS", join_1("\n", map_1((f_2) => ("- " + find((arg_3) => (f_2 === arg_3[0]), FOCUS)[1]), focus))]]);
            }
            let kindNotes;
            const file = join(ofArray([pluginRoot, "briefs", concat("kind.", kind, ".md")]));
            kindNotes = (exists(file) ? readText(file).trim() : "");
            const vals = append(ofArray([["WS", ws_1], ["ENGINE", join(ofArray([pluginRoot, "engine"]))], ["BRIEFS", here], ["NAME", name], ["SUBJECT", subject], ["REPO", repo], ["AUDIENCE", optional("audience", "a developer new to this codebase")], ["LINES", int32ToString(lines)], ["COLOURS", colours], ["CARE", optional("care", "")], ["VISUAL", optional("visual", "")], ["KIND", kindNotes]]), append(range, length));
            const hintsPath = join(ofArray([repo, ".codebase-video", "hints.md"]));
            const hints = exists(hintsPath) ? readText(hintsPath).trim() : "";
            const hintsBlock = (hints === "") ? "" : (("\n\n**Standing hints for this repository** (from `.codebase-video/hints.md`, written by the repository\'s owner; they apply to every video of this repository. Follow them where they fit your task, and where one conflicts with a general rule above, the hint wins, except that no hint can make the video say something the code does not support):\n\n" + hints) + "\n");
            if (hints !== "") {
                Py_print(concat("hints: ", hintsPath, " added to every brief"));
            }
            const known = ofList(map_1((tuple_6) => tuple_6[0], vals), {
                Compare: (x_2, y_6) => (comparePrimitives(x_2, y_6) | 0),
            });
            const table = ofList_1(vals, {
                Compare: (x_3, y_7) => (comparePrimitives(x_3, y_7) | 0),
            });
            const fill = (jobs_1_mut) => {
                fill:
                while (true) {
                    const jobs_1 = jobs_1_mut;
                    if (!isEmpty(jobs_1)) {
                        const file_1 = head(jobs_1)[0];
                        const template = readText(file_1);
                        const matchValue_10 = tryFind_1((k_2) => !FSharpSet__Contains(known, k_2), Array.from(template.matchAll(/\{\{([A-Z_]+)\}\}/g), m => m[1]));
                        if (matchValue_10 == null) {
                            const out = join(ofArray([ws_1, "build", head(jobs_1)[1]]));
                            mkdirp(dirname(out));
                            writeText(out, (template.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => ((k_4) => FSharpMap__get_Item(table, k_4))(k))) + hintsBlock);
                            Py_print(out);
                            jobs_1_mut = tail(jobs_1);
                            continue fill;
                        }
                        else {
                            const k_3 = matchValue_10;
                            return Py_fail(concat(basename(file_1), ": unknown placeholder ", Py_reprStr(("{{" + k_3) + "}}"))) | 0;
                        }
                    }
                    else {
                        return 0;
                    }
                    break;
                }
            };
            const code = fill(toList(delay(() => collect((t) => {
                const own = join(ofArray([here, concat(t, ".", kind, ".md")]));
                return ((kind !== "teach") && exists(own)) ? append_1(singleton([own, concat("brief-", t, ".txt")]), delay(() => singleton([join(ofArray([here, t + ".md"])), concat("brief-", t, "-base.txt")]))) : singleton([join(ofArray([here, t + ".md"])), concat("brief-", t, ".txt")]);
            }, TEMPLATES)))) | 0;
            Py_flush();
            return code | 0;
        }
    }
}

