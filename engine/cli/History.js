
import { toString, Record, FSharpException } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { option_type, record_type, list_type, tuple_type, int32_type, bool_type, string_type, class_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { difference, toList as toList_1, ofArray as ofArray_1, ofList, empty as empty_2, FSharpSet__Contains, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { int32ToString, disposeSafe, getEnumerator, compareArrays, createObj, stringHash, equals, defaultOf, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { tryFind as tryFind_1, truncate as truncate_1, toArray, length, sortBy, sumBy, filter, exists as exists_1, map as map_1, collect as collect_1, contains, singleton, empty, head as head_1, tail, isEmpty, append, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { eprint, dirname, toJsonIndented, writeText, mkdirp, readText, path as path_1, childProcess, readJson, exists, join as join_1, runCapture } from "./Node.js";
import { printf, toConsole, concat, join, split, substring, replace } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { last as last_1, reverse, tryFind, map, item, equalsWith, truncate } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { empty as empty_1, singleton as singleton_1, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { op_UnaryNegation_Int32, parse } from "./fable_modules/fable-library-js.5.19.0/Int32.js";
import { value as value_2, defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { List_groupBy, List_countBy, List_distinctBy, List_distinct } from "./fable_modules/fable-library-js.5.19.0/Seq2.js";

class Stop extends FSharpException {
    constructor(Data0) {
        super();
        this.Data0 = Data0;
    }
}

function Stop_$reflection() {
    return class_type("History.Stop", undefined, Stop, class_type("System.Exception"));
}

function stop(msg) {
    throw new Stop(msg);
}

const LIST_ALL = 300;

const WIDE = 20;

const TOP_FILES = 20;

const ROOTS = ofSeq(["src", "lib", "app", "apps", "packages", "services", "cmd", "internal", "pkg"], {
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
});

const LOCKS = ofArray(["*.lock", "**/*.lock", "package-lock.json", "**/package-lock.json", "pnpm-lock.yaml", "**/pnpm-lock.yaml"]);

class Commit extends Record {
    constructor(Id, Date$, Author, Merge, Subject, Body, Files) {
        super();
        this.Id = Id;
        this.Date = Date$;
        this.Author = Author;
        this.Merge = Merge;
        this.Subject = Subject;
        this.Body = Body;
        this.Files = Files;
    }
}

function Commit_$reflection() {
    return record_type("History.Commit", [], Commit, () => [["Id", string_type], ["Date", string_type], ["Author", string_type], ["Merge", bool_type], ["Subject", string_type], ["Body", string_type], ["Files", list_type(tuple_type(string_type, int32_type, int32_type))]]);
}

function git(repo, args) {
    const patternInput = runCapture("git", append(ofArray(["-c", "core.quotePath=false", "-C", repo]), args));
    return [patternInput[0], patternInput[1].trim()];
}

function gitOut(repo, args) {
    return git(repo, args)[1];
}

function globRx(glob) {
    const body = replace(replace(replace(replace(replace(replace(glob.replace(/[.+^${}()|[\]\\]/g, '\\$&'), "**/", "\u0001"), "**", "\u0002"), "*", "[^/]*"), "?", "[^/]"), "\u0001", "(?:.*/)?"), "\u0002", ".*");
    return new RegExp((("^" + body) + "$"), "");
}

function newPath(shown) {
    const brace = shown.indexOf("{") | 0;
    const arrow = shown.indexOf(" => ") | 0;
    if (arrow < 0) {
        return shown;
    }
    else if ((brace >= 0) && (shown.indexOf("}", arrow) > arrow)) {
        const close = shown.indexOf("}", arrow) | 0;
        return replace((substring(shown, 0, brace) + substring(shown, arrow + 4, (close - arrow) - 4)) + substring(shown, close + 1), "//", "/");
    }
    else {
        return substring(shown, arrow + 4);
    }
}

function areaOf(path) {
    const matchValue = ofArray(split(path, ["/"], undefined, 0));
    let matchResult, first_1, second_1, first_2;
    if (isEmpty(matchValue)) {
        matchResult = 3;
    }
    else if (!isEmpty(tail(matchValue))) {
        if (!isEmpty(tail(tail(matchValue)))) {
            if (FSharpSet__Contains(ROOTS, head_1(matchValue))) {
                matchResult = 1;
                first_1 = head_1(matchValue);
                second_1 = head_1(tail(matchValue));
            }
            else {
                matchResult = 2;
                first_2 = head_1(matchValue);
            }
        }
        else {
            matchResult = 2;
            first_2 = head_1(matchValue);
        }
    }
    else {
        matchResult = 0;
    }
    switch (matchResult) {
        case 0:
            return "(root)";
        case 1:
            return (first_1 + "/") + second_1;
        case 2:
            return first_2;
        default:
            return "(root)";
    }
}

function isDate(s) {
    return (new RegExp("^\\d{4}-\\d{2}-\\d{2}$", "")).test(s);
}

function commitOf(repo, reference) {
    const matchValue = git(repo, ofArray(["rev-parse", "--verify", "--quiet", reference + "^{commit}"]));
    let matchResult;
    if (matchValue[0] === 0) {
        if (matchValue[1] !== "") {
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
            return matchValue[1];
        default:
            return undefined;
    }
}

function shortOf(repo, sha) {
    return gitOut(repo, ofArray(["rev-parse", "--short", sha]));
}

function dateOf(repo, sha) {
    return gitOut(repo, ofArray(["show", "-s", "--format=%cs", sha]));
}

function isShallow(repo) {
    return gitOut(repo, ofArray(["rev-parse", "--is-shallow-repository"])) === "true";
}

const SHALLOW_HINT = "fetch the full history (in GitHub Actions: actions/checkout with fetch-depth: 0)";

function nearTags(repo) {
    let array;
    const matchValue = truncate(5, (array = split(gitOut(repo, ofArray(["tag", "--sort=-creatordate"])), ["\n"], undefined, 0), array.filter((y) => ("" !== y))));
    if (!equalsWith((x_1, y_1) => (x_1 === y_1), matchValue, defaultOf()) && (matchValue.length === 0)) {
        return "the repository has no tags";
    }
    else {
        return "the latest tags are " + join(", ", matchValue);
    }
}

function resolveUntil(repo, reference) {
    if (isDate(reference)) {
        const matchValue = gitOut(repo, ofArray(["rev-list", "-1", concat("--before=", reference, " 23:59:59"), "HEAD"]));
        if (matchValue === "") {
            return stop(concat("history: no commit on or before ", reference));
        }
        else {
            return matchValue;
        }
    }
    else {
        const matchValue_1 = commitOf(repo, reference);
        if (matchValue_1 == null) {
            return stop(concat("history: \"until\" is ", reference, ", which is not a tag, a commit or a date here; ", nearTags(repo)));
        }
        else {
            return matchValue_1;
        }
    }
}

class Start extends Record {
    constructor(Commit, Ref, Was, Notes) {
        super();
        this.Commit = Commit;
        this.Ref = Ref;
        this.Was = Was;
        this.Notes = Notes;
    }
}

function Start_$reflection() {
    return record_type("History.Start", [], Start, () => [["Commit", option_type(string_type)], ["Ref", string_type], ["Was", string_type], ["Notes", list_type(string_type)]]);
}

function resolveSince(repo, given, until) {
    let sha_3;
    const before = (date) => gitOut(repo, ofArray(["rev-list", "-1", concat("--before=", date, " 23:59:59"), until]));
    if (given == null) {
        if (isShallow(repo)) {
            stop(concat("history: this clone is shallow, so the start of the range cannot be chosen from it (a tag or the last video\'s commit may be missing); ", SHALLOW_HINT, ", or pass --since"));
        }
        const file = join_1(ofArray([repo, ".codebase-video", "progress.json"]));
        let patternInput;
        if (!exists(file)) {
            patternInput = [undefined, empty()];
        }
        else {
            const last = readJson(file).until;
            if (((last == null)) ? true : ((last.commit == null))) {
                patternInput = [undefined, empty()];
            }
            else {
                const id = toString(last.commit);
                const matchValue_2 = commitOf(repo, id);
                patternInput = ((matchValue_2 == null) ? [undefined, singleton(`The last progress video is recorded as ending at ${id} (${file}), but this repository has no such commit, so that record was not used.`)] : ((git(repo, ofArray(["merge-base", "--is-ancestor", matchValue_2, until]))[0] === 0) ? ((sha_3 = matchValue_2, [sha_3, empty()])) : stop(`history: the last progress video ended at ${id} (${file}), which is not in the history of this range's end: the branch was rebuilt or this is another branch. Pass --since, or delete that file to start from the latest tag`)));
            }
        }
        const recorded = patternInput[0];
        const notes = patternInput[1];
        if (recorded == null) {
            let tagBefore;
            const matchValue_3 = git(repo, ofArray(["describe", "--tags", "--abbrev=0", until]));
            if (matchValue_3[0] === 0) {
                if (!equals(commitOf(repo, matchValue_3[1]), until)) {
                    tagBefore = matchValue_3[1];
                }
                else {
                    const matchValue_4 = git(repo, ofArray(["describe", "--tags", "--abbrev=0", until + "^"]));
                    tagBefore = ((matchValue_4[0] === 0) ? matchValue_4[1] : undefined);
                }
            }
            else {
                tagBefore = undefined;
            }
            if (tagBefore == null) {
                const date_1 = new Date(Date.parse(dateOf(repo, until) + 'T00:00:00Z') - 30 * 86400000).toISOString().slice(0, 10);
                const matchValue_5 = before(date_1);
                if (matchValue_5 === "") {
                    return new Start(undefined, "the beginning", "whole history", notes);
                }
                else {
                    return new Start(matchValue_5, date_1, "30 days", notes);
                }
            }
            else {
                const tag_3 = tagBefore;
                return new Start(commitOf(repo, tag_3), tag_3, "latest tag", notes);
            }
        }
        else {
            const sha_4 = recorded;
            return new Start(sha_4, shortOf(repo, sha_4), "last video", notes);
        }
    }
    else if (isDate(given)) {
        const reference_1 = given;
        const matchValue = before(reference_1);
        if (matchValue === "") {
            if (isShallow(repo)) {
                return stop(concat("history: this clone is shallow and does not reach ", reference_1, "; ", SHALLOW_HINT));
            }
            else {
                return new Start(undefined, reference_1, "before first commit", empty());
            }
        }
        else {
            return new Start(matchValue, reference_1, "given", empty());
        }
    }
    else {
        const reference_2 = given;
        const matchValue_1 = commitOf(repo, reference_2);
        if (matchValue_1 == null) {
            if (isShallow(repo)) {
                return stop(concat("history: this clone is shallow and does not reach ", reference_2, "; ", SHALLOW_HINT));
            }
            else {
                return stop(concat("history: \"since\" is ", reference_2, ", which is not a tag, a commit or a date here; ", nearTags(repo)));
            }
        }
        else {
            return new Start(matchValue_1, reference_2, "given", empty());
        }
    }
}

function readCommits(repo, range) {
    const out = gitOut(repo, append(ofArray(["log", "--reverse", "-M", "--numstat", "--format=%x01%h%x02%cs%x02%aN%x02%P%x02%s%x02%b%x03"]), range));
    return toList(delay(() => collect((chunk) => {
        if (chunk.trim() !== "") {
            const cut = chunk.indexOf("\u0003") | 0;
            const head = split(substring(chunk, 0, cut), ["\u0002"], undefined, 0);
            const files = toList(delay(() => collect((line) => {
                const matchValue = split(line, ["\t"], undefined, 0);
                if (!equalsWith((x, y) => (x === y), matchValue, defaultOf()) && (matchValue.length === 3)) {
                    const removed = item(1, matchValue);
                    const path = item(2, matchValue);
                    const added = item(0, matchValue);
                    const n = (s) => {
                        if (s === "-") {
                            return 0;
                        }
                        else {
                            return parse(s, 511, false, 32) | 0;
                        }
                    };
                    return singleton_1([newPath(path), n(added), n(removed)]);
                }
                else {
                    return empty_1();
                }
            }, split(substring(chunk, cut + 1), ["\n"], undefined, 0))));
            return singleton_1(new Commit(item(0, head), item(1, head), item(2, head), item(3, head).trim().indexOf(" ") >= 0, item(4, head), item(5, head).trim(), files));
        }
        else {
            return empty_1();
        }
    }, split(out, ["\u0001"], undefined, 0))));
}

const TRAILER = new RegExp("^[ \\t]*(?:[\\w-]+[ -]by|reviewers?|b?cc|authors?|pair(?:ed)?(?:[ -]with)?|thanks(?:[ -]to)?)[ \\t]*:.*$|^[ \\t]*cc[ \\t]+@.*$", "gim");

const EMAIL = new RegExp("<?[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)*\\.[A-Za-z]{2,}\\b>?(?!:)", "g");

const MERGE_PR = new RegExp("^(Merge pull request #\\d+) from \\S+", "");

const MERGE_BRANCH = new RegExp("^Merge (?:remote-tracking )?branch(?:es)? \'.*$", "");

function unnamedBody(body) {
    return ((body.replace(TRAILER, "")).replace(EMAIL, "")).trim();
}

function unnamedSubject(subject) {
    return (((subject.replace(MERGE_PR, "$1")).replace(MERGE_BRANCH, "Merge branch")).replace(EMAIL, "")).trim();
}

function generated(repo, paths) {
    if (isEmpty(paths)) {
        return empty_2({
            Compare: (x, y) => (comparePrimitives(x, y) | 0),
        });
    }
    else {
        const r = childProcess.spawnSync("git", ["-c", "core.quotePath=false", "-C", repo, "check-attr", "linguist-generated", "--stdin"], {
            encoding: "utf8",
            input: join("\n", paths),
            maxBuffer: 1 << 28,
        });
        const out = ((r.stdout == null)) ? "" : r.stdout;
        return ofList(toList(delay(() => collect((line) => {
            const mark = line.lastIndexOf(": linguist-generated: ") | 0;
            return ((mark > 0) && ((substring(line, mark + 22).trim() === "true") ? true : (substring(line, mark + 22).trim() === "set"))) ? singleton_1(substring(line, 0, mark)) : empty_1();
        }, split(out, ["\n"], undefined, 0)))), {
            Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
        });
    }
}

function strings(o) {
    let array_2;
    if (Array.isArray(o)) {
        return ofArray(o);
    }
    else if ((typeof o) === "string") {
        return ofArray((array_2 = map((s) => s.trim(), split(o, [","], undefined, 0)), array_2.filter((y) => ("" !== y))));
    }
    else {
        return empty();
    }
}

const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

function count(n, one) {
    if (n === 1) {
        return concat("1 ", one);
    }
    else {
        return `${n} ${one}s`;
    }
}

function write(ws) {
    let array_1, array_3, matchValue_6, since_6, array_8;
    const brief = readJson(join_1(ofArray([ws, "brief.json"])));
    const repo = ((brief.repo == null)) ? stop("history: brief.json has no \"repo\"") : brief.repo;
    if (git(repo, ofArray(["rev-parse", "--git-dir"]))[0] !== 0) {
        stop(concat("history: ", repo, " is not a git repository"));
    }
    const people = contains("people", strings(brief.focus), {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    });
    const untilRef = ((brief.until == null)) ? "HEAD" : brief.until;
    const until = resolveUntil(repo, untilRef);
    const start = resolveSince(repo, ((brief.since == null)) ? undefined : toString(brief.since), until);
    const sinceWas = start.Was;
    const sinceRef = start.Ref;
    const matchValue_2 = start.Commit;
    let matchResult, since_2, since_3;
    if (matchValue_2 != null) {
        if (matchValue_2 === until) {
            matchResult = 0;
            since_2 = matchValue_2;
        }
        else if (git(repo, ofArray(["merge-base", "--is-ancestor", matchValue_2, until]))[0] !== 0) {
            matchResult = 1;
            since_3 = matchValue_2;
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
            stop(`history: no commits between ${sinceRef} and ${untilRef} (both are ${shortOf(repo, until)}); give an earlier "since"`);
            break;
        }
        case 1: {
            if (isShallow(repo)) {
                stop(concat("history: this clone is shallow and does not reach ", sinceRef, "; ", SHALLOW_HINT));
            }
            stop(`history: ${sinceRef} is not an ancestor of ${untilRef}: the range must run forward in one line of history`);
            break;
        }
    }
    let range;
    const matchValue_3 = start.Commit;
    range = ((matchValue_3 == null) ? singleton(until) : singleton(concat(matchValue_3, "..", until)));
    const since_5 = defaultArg(start.Commit, EMPTY_TREE);
    if (isShallow(repo)) {
        let edge;
        const file = gitOut(repo, ofArray(["rev-parse", "--git-path", "shallow"]));
        const file_1 = (path_1.isAbsolute(file)) ? file : join_1(ofArray([repo, file]));
        edge = (exists(file_1) ? ofArray_1((array_1 = map((l) => l.trim(), split(readText(file_1), ["\n"], undefined, 0)), array_1.filter((y_1) => ("" !== y_1))), {
            Compare: (x_2, y_2) => (comparePrimitives(x_2, y_2) | 0),
        }) : empty_2({
            Compare: (x_3, y_3) => (comparePrimitives(x_3, y_3) | 0),
        }));
        const matchValue_4 = tryFind((value_1) => FSharpSet__Contains(edge, value_1), (array_3 = split(gitOut(repo, append(singleton("rev-list"), range)), ["\n"], undefined, 0), array_3.filter((y_4) => ("" !== y_4))));
        if (matchValue_4 == null) {
            if (start.Commit == null) {
                stop(concat("history: this clone is shallow and does not reach the first commit; ", SHALLOW_HINT));
            }
        }
        else {
            stop(concat("history: this clone is shallow and the range reaches its edge (commit ", shortOf(repo, matchValue_4), " has no parent here), so its numbers would be wrong; ", SHALLOW_HINT));
        }
    }
    const all = readCommits(repo, range);
    if (isEmpty(all)) {
        stop(concat("history: no commits between ", sinceRef, " and ", untilRef));
    }
    const touched = List_distinct(collect_1((c) => map_1((tupledArg) => tupledArg[0], c.Files), all), {
        Equals: (x_5, y_5) => (x_5 === y_5),
        GetHashCode: (x_5) => (stringHash(x_5) | 0),
    });
    const asked = map_1((g) => {
        const g_1 = g.startsWith("./") ? substring(g, 2) : g;
        if (g_1.endsWith("/")) {
            return g_1 + "**";
        }
        else if ((!(g_1.indexOf("*") >= 0) && !(g_1.indexOf("?") >= 0)) && exists_1((p_1) => p_1.startsWith(g_1 + "/"), touched)) {
            return g_1 + "/**";
        }
        else {
            return g_1;
        }
    }, strings(brief.ignore));
    const unmatched = filter((g_2) => !exists_1((p_2) => (globRx(g_2).test(p_2)), touched), asked);
    const globs = map_1(globRx, append(LOCKS, asked));
    const gen = generated(repo, touched);
    const ignored = (path) => {
        if (FSharpSet__Contains(gen, path)) {
            return true;
        }
        else {
            return exists_1((rx) => (rx.test(path)), globs);
        }
    };
    const kept = (c_1) => filter((tupledArg_1) => !ignored(tupledArg_1[0]), c_1.Files);
    const left = collect_1((c_2) => filter((tupledArg_2) => ignored(tupledArg_2[0]), c_2.Files), all);
    const status = toList(delay(() => collect((line) => {
        const matchValue_5 = ofArray(split(line, ["\t"], undefined, 0));
        let matchResult_1, p_7, p_8, a_3, b_3, r_3;
        if (!isEmpty(matchValue_5)) {
            switch (head_1(matchValue_5)) {
                case "A": {
                    if (!isEmpty(tail(matchValue_5))) {
                        if (!isEmpty(tail(tail(matchValue_5)))) {
                            if (isEmpty(tail(tail(tail(matchValue_5))))) {
                                if (head_1(matchValue_5).startsWith("R") && !ignored(head_1(tail(tail(matchValue_5))))) {
                                    matchResult_1 = 2;
                                    a_3 = head_1(tail(matchValue_5));
                                    b_3 = head_1(tail(tail(matchValue_5)));
                                    r_3 = head_1(matchValue_5);
                                }
                                else {
                                    matchResult_1 = 3;
                                }
                            }
                            else {
                                matchResult_1 = 3;
                            }
                        }
                        else if (!ignored(head_1(tail(matchValue_5)))) {
                            matchResult_1 = 0;
                            p_7 = head_1(tail(matchValue_5));
                        }
                        else {
                            matchResult_1 = 3;
                        }
                    }
                    else {
                        matchResult_1 = 3;
                    }
                    break;
                }
                case "D": {
                    if (!isEmpty(tail(matchValue_5))) {
                        if (!isEmpty(tail(tail(matchValue_5)))) {
                            if (isEmpty(tail(tail(tail(matchValue_5))))) {
                                if (head_1(matchValue_5).startsWith("R") && !ignored(head_1(tail(tail(matchValue_5))))) {
                                    matchResult_1 = 2;
                                    a_3 = head_1(tail(matchValue_5));
                                    b_3 = head_1(tail(tail(matchValue_5)));
                                    r_3 = head_1(matchValue_5);
                                }
                                else {
                                    matchResult_1 = 3;
                                }
                            }
                            else {
                                matchResult_1 = 3;
                            }
                        }
                        else if (!ignored(head_1(tail(matchValue_5)))) {
                            matchResult_1 = 1;
                            p_8 = head_1(tail(matchValue_5));
                        }
                        else {
                            matchResult_1 = 3;
                        }
                    }
                    else {
                        matchResult_1 = 3;
                    }
                    break;
                }
                default:
                    if (!isEmpty(tail(matchValue_5))) {
                        if (!isEmpty(tail(tail(matchValue_5)))) {
                            if (isEmpty(tail(tail(tail(matchValue_5))))) {
                                if (head_1(matchValue_5).startsWith("R") && !ignored(head_1(tail(tail(matchValue_5))))) {
                                    matchResult_1 = 2;
                                    a_3 = head_1(tail(matchValue_5));
                                    b_3 = head_1(tail(tail(matchValue_5)));
                                    r_3 = head_1(matchValue_5);
                                }
                                else {
                                    matchResult_1 = 3;
                                }
                            }
                            else {
                                matchResult_1 = 3;
                            }
                        }
                        else {
                            matchResult_1 = 3;
                        }
                    }
                    else {
                        matchResult_1 = 3;
                    }
            }
        }
        else {
            matchResult_1 = 3;
        }
        switch (matchResult_1) {
            case 0:
                return singleton_1(["added", p_7, ""]);
            case 1:
                return singleton_1(["deleted", p_8, ""]);
            case 2:
                return singleton_1(["renamed", b_3, a_3]);
            default: {
                return empty_1();
            }
        }
    }, split(gitOut(repo, ofArray(["diff", "--name-status", "-M", since_5, until])), ["\n"], undefined, 0))));
    const of$0027 = (kind) => filter((tupledArg_3) => (tupledArg_3[0] === kind), status);
    const sum = (files) => [sumBy((tupledArg_4) => (tupledArg_4[1] | 0), files, {
        GetZero: () => 0,
        Add: (x_6, y_6) => ((x_6 + y_6) | 0),
    }), sumBy((tupledArg_5) => (tupledArg_5[2] | 0), files, {
        GetZero: () => 0,
        Add: (x_7, y_7) => ((x_7 + y_7) | 0),
    })];
    const areas = sortBy((a_7) => [op_UnaryNegation_Int32(a_7.commits), a_7.area], map_1((tupledArg_7) => {
        const area = tupledArg_7[0];
        const rows_1 = map_1((tuple_1) => tuple_1[1], tupledArg_7[1]);
        const commits = List_distinctBy((c_5) => c_5.Id, map_1((tupledArg_8) => tupledArg_8[0], rows_1), {
            Equals: (x_9, y_9) => (x_9 === y_9),
            GetHashCode: (x_9) => (stringHash(x_9) | 0),
        });
        const count_1 = (kind_1) => (length(filter((tupledArg_9) => {
            if (tupledArg_9[0] === kind_1) {
                return areaOf(tupledArg_9[1]) === area;
            }
            else {
                return false;
            }
        }, status)) | 0);
        return createObj(append(ofArray([["area", area], ["commits", length(commits)], ["files", length(List_distinct(map_1((tupledArg_10) => tupledArg_10[1], rows_1), {
            Equals: (x_10, y_10) => (x_10 === y_10),
            GetHashCode: (x_10) => (stringHash(x_10) | 0),
        }))], ["added", count_1("added")], ["deleted", count_1("deleted")], ["renamed", count_1("renamed")], ["linesAdded", sumBy((tupledArg_11) => (tupledArg_11[2] | 0), rows_1, {
            GetZero: () => 0,
            Add: (x_11, y_11) => ((x_11 + y_11) | 0),
        })], ["linesRemoved", sumBy((tupledArg_12) => (tupledArg_12[3] | 0), rows_1, {
            GetZero: () => 0,
            Add: (x_12, y_12) => ((x_12 + y_12) | 0),
        })]]), people ? singleton(["people", toArray(map_1((tupledArg_13) => ({
            name: tupledArg_13[0],
            commits: tupledArg_13[1],
        }), sortBy((tuple_2) => tuple_2[0], List_countBy((c_6) => c_6.Author, commits, {
            Equals: (x_13, y_13) => (x_13 === y_13),
            GetHashCode: (x_13) => (stringHash(x_13) | 0),
        }), {
            Compare: (x_14, y_14) => (comparePrimitives(x_14, y_14) | 0),
        })))]) : empty()));
    }, List_groupBy((tuple) => tuple[0], collect_1((c_3) => map_1((tupledArg_6) => {
        const p_9 = tupledArg_6[0];
        return [areaOf(p_9), [c_3, p_9, tupledArg_6[1], tupledArg_6[2]]];
    }, kept(c_3)), all), {
        Equals: (x_8, y_8) => (x_8 === y_8),
        GetHashCode: (x_8) => (stringHash(x_8) | 0),
    })), {
        Compare: (x_15, y_15) => (compareArrays(x_15, y_15) | 0),
    });
    const mostChanged = truncate_1(TOP_FILES, sortBy((tupledArg_18) => [op_UnaryNegation_Int32(tupledArg_18[1]), op_UnaryNegation_Int32(tupledArg_18[2] + tupledArg_18[3]), tupledArg_18[0]], map_1((tupledArg_15) => {
        const rows_2 = tupledArg_15[1];
        return [tupledArg_15[0], length(rows_2), sumBy((tupledArg_16) => (tupledArg_16[1][0] | 0), rows_2, {
            GetZero: () => 0,
            Add: (x_17, y_17) => ((x_17 + y_17) | 0),
        }), sumBy((tupledArg_17) => (tupledArg_17[1][1] | 0), rows_2, {
            GetZero: () => 0,
            Add: (x_18, y_18) => ((x_18 + y_18) | 0),
        })];
    }, List_groupBy((tuple_3) => tuple_3[0], collect_1((c_7) => map_1((tupledArg_14) => [tupledArg_14[0], [tupledArg_14[1], tupledArg_14[2]]], kept(c_7)), all), {
        Equals: (x_16, y_16) => (x_16 === y_16),
        GetHashCode: (x_16) => (stringHash(x_16) | 0),
    })), {
        Compare: (x_19, y_19) => (compareArrays(x_19, y_19) | 0),
    }));
    const tagsOf = (sha_1) => {
        let array_6;
        return ofArray_1((array_6 = split(gitOut(repo, ofArray(["tag", "--merged", sha_1])), ["\n"], undefined, 0), array_6.filter((y_20) => ("" !== y_20))), {
            Compare: (x_21, y_21) => (comparePrimitives(x_21, y_21) | 0),
        });
    };
    const tags = sortBy((tupledArg_19) => [tupledArg_19[2], tupledArg_19[0]], map_1((t) => [t, shortOf(repo, value_2(commitOf(repo, t))), dateOf(repo, value_2(commitOf(repo, t)))], toList_1((matchValue_6 = start.Commit, (matchValue_6 == null) ? tagsOf(until) : ((since_6 = matchValue_6, difference(tagsOf(until), tagsOf(since_6))))))), {
        Compare: (x_22, y_22) => (compareArrays(x_22, y_22) | 0),
    });
    const tagged = ofList(map_1((tupledArg_20) => tupledArg_20[1], tags), {
        Compare: (x_23, y_23) => (comparePrimitives(x_23, y_23) | 0),
    });
    let publishedBranch;
    const matchValue_7 = git(repo, ofArray(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]));
    let matchResult_2;
    if (matchValue_7[0] === 0) {
        if (matchValue_7[1] !== "") {
            matchResult_2 = 0;
        }
        else {
            matchResult_2 = 1;
        }
    }
    else {
        matchResult_2 = 1;
    }
    switch (matchResult_2) {
        case 0: {
            publishedBranch = matchValue_7[1];
            break;
        }
        default:
            publishedBranch = tryFind_1((r_12) => (commitOf(repo, r_12) != null), ofArray(["origin/main", "origin/master"]));
    }
    const unpublished = (publishedBranch == null) ? [] : reverse((array_8 = split(gitOut(repo, append(ofArray(["rev-list", "--abbrev-commit"]), append(range, ofArray(["--not", publishedBranch])))), ["\n"], undefined, 0), array_8.filter((y_24) => ("" !== y_24))));
    const partial = length(all) > LIST_ALL;
    const listed = partial ? filter((c_8) => {
        if (c_8.Merge ? true : FSharpSet__Contains(tagged, c_8.Id)) {
            return true;
        }
        else {
            return length(c_8.Files) > WIDE;
        }
    }, all) : all;
    const saidSubject = (subject) => {
        if (people) {
            return subject;
        }
        else {
            return unnamedSubject(subject);
        }
    };
    const saidBody = (body) => {
        if (people) {
            return body;
        }
        else {
            return unnamedBody(body);
        }
    };
    const sinceCommit = defaultArg(start.Commit, last_1(split(gitOut(repo, ofArray(["rev-list", "--max-parents=0", until])), ["\n"], undefined, 0)));
    const untilDate = dateOf(repo, until);
    const sinceDate = dateOf(repo, sinceCommit);
    const notes = append(start.Notes, append(map_1((g_3) => concat("The brief\'s \"ignore\" entry ", g_3, " matched no file of the range, so it left nothing out. A * does not cross folders; ** does."), unmatched), (publishedBranch == null) ? singleton("Which branch of this repository is the published one could not be determined (it has no remote, or the remote\'s default branch is not known here). Nothing in the range may be called published, released or shipped on the strength of these facts; say only that it is in the range.") : empty()));
    const keptFiles = collect_1(kept, all);
    const patternInput_2 = sum(keptFiles);
    const totalRemoved = patternInput_2[1] | 0;
    const totalAdded = patternInput_2[0] | 0;
    const patternInput_3 = sum(left);
    const leftRemoved = patternInput_3[1] | 0;
    const leftAdded = patternInput_3[0] | 0;
    const pathsOf = (kind_2) => toArray(map_1((tupledArg_22) => tupledArg_22[1], of$0027(kind_2)));
    const json = createObj(append(ofArray([["range", {
        since: {
            ref: sinceRef,
            commit: shortOf(repo, sinceCommit),
            date: sinceDate,
            included: start.Commit == null,
        },
        until: {
            ref: untilRef,
            commit: shortOf(repo, until),
            sha: until,
            date: untilDate,
        },
        sinceWas: sinceWas,
        days: Math.round((Date.parse(untilDate + 'T00:00:00Z') - Date.parse(sinceDate + 'T00:00:00Z')) / 86400000),
        commits: length(all),
    }], ["totals", {
        files: length(List_distinct(map_1((tupledArg_23) => tupledArg_23[0], keptFiles), {
            Equals: (x_25, y_25) => (x_25 === y_25),
            GetHashCode: (x_25) => (stringHash(x_25) | 0),
        })),
        linesAdded: totalAdded,
        linesRemoved: totalRemoved,
    }], ["tags", toArray(map_1((tupledArg_24) => ({
        tag: tupledArg_24[0],
        commit: tupledArg_24[1],
        date: tupledArg_24[2],
    }), tags))], ["published", (publishedBranch == null) ? defaultOf() : {
        branch: publishedBranch,
        missing: unpublished.length,
        commits: unpublished,
    }], ["asked", {
        since: ((brief.since == null)) ? defaultOf() : brief.since,
        until: ((brief.until == null)) ? defaultOf() : brief.until,
        focus: toArray(strings(brief.focus)),
        ignore: toArray(strings(brief.ignore)),
    }], ["notes", toArray(notes)], ["listed", partial ? "partial" : "all"], ["commits", toArray(map_1((c_9) => createObj(append(ofArray([["id", c_9.Id], ["date", c_9.Date], ["subject", saidSubject(c_9.Subject)], ["body", saidBody(c_9.Body)], ["merge", c_9.Merge], ["files", toArray(map_1((tupledArg_21) => tupledArg_21[0], c_9.Files))]]), people ? singleton(["author", c_9.Author]) : empty())), listed))], ["areas", toArray(areas)], ["files", {
        mostChanged: toArray(map_1((tupledArg_25) => ({
            path: tupledArg_25[0],
            commits: tupledArg_25[1],
            linesAdded: tupledArg_25[2],
            linesRemoved: tupledArg_25[3],
        }), mostChanged)),
        added: pathsOf("added"),
        deleted: pathsOf("deleted"),
        renamed: toArray(map_1((tupledArg_26) => ({
            from: tupledArg_26[2],
            to: tupledArg_26[1],
        }), of$0027("renamed"))),
    }], ["ignored", {
        files: toArray(List_distinct(map_1((tupledArg_27) => tupledArg_27[0], left), {
            Equals: (x_26, y_26) => (x_26 === y_26),
            GetHashCode: (x_26) => (stringHash(x_26) | 0),
        })),
        commits: length(filter((c_10) => exists_1((tupledArg_28) => ignored(tupledArg_28[0]), c_10.Files), all)),
        linesAdded: leftAdded,
        linesRemoved: leftRemoved,
    }]]), people ? singleton(["people", toArray(map_1((tupledArg_29) => ({
        name: tupledArg_29[0],
        commits: tupledArg_29[1],
    }), sortBy((tuple_4) => tuple_4[0], List_countBy((c_11) => c_11.Author, all, {
        Equals: (x_27, y_27) => (x_27 === y_27),
        GetHashCode: (x_27) => (stringHash(x_27) | 0),
    }), {
        Compare: (x_28, y_28) => (comparePrimitives(x_28, y_28) | 0),
    })))]) : empty()));
    const build = join_1(ofArray([ws, "build"]));
    mkdirp(build);
    writeText(join_1(ofArray([build, "history.json"])), toJsonIndented(json, 2) + "\n");
    const md = [];
    const line_1 = (s) => {
        void (md.push(s));
    };
    const chosen = (sinceWas === "last video") ? " The start is where the last progress video of this repository ended." : ((sinceWas === "latest tag") ? " No start was given: the range starts at the latest tag." : ((sinceWas === "30 days") ? " No start was given and the repository has no earlier tag: the range starts 30 days back." : ((sinceWas === "before first commit") ? " The start asked for is before the repository\'s first commit: the range is the whole history, the first commit included." : ((sinceWas === "whole history") ? " No start was given, there is no earlier tag, and the repository is younger than 30 days: the range is the whole history, the first commit included." : ""))));
    line_1(concat("# History: ", sinceRef, " to ", untilRef));
    line_1("");
    const matchValue_10 = count(Math.round((Date.parse(untilDate + 'T00:00:00Z') - Date.parse(sinceDate + 'T00:00:00Z')) / 86400000), "day");
    const matchValue_11 = count(length(all), "commit");
    line_1(`From ${sinceRef} (${shortOf(repo, sinceCommit)}, ${sinceDate}) to ${untilRef} (${shortOf(repo, until)}, ${untilDate}): ${matchValue_10}, ${matchValue_11}.${chosen}`);
    const enumerator = getEnumerator(notes);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const note = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            line_1("");
            line_1(note);
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    line_1("");
    line_1("Every number in the video comes from this file or from history.json. Do not count anything yourself.");
    line_1("");
    line_1(`Totals: ${json.totals.files} files changed, ${totalAdded} lines added, ${totalRemoved} lines removed. Lines and files are sums over the range's commits; added, deleted and renamed compare its two ends.`);
    if (!isEmpty(left)) {
        const names = List_distinct(map_1((tupledArg_30) => tupledArg_30[0], left), {
            Equals: (x_29, y_29) => (x_29 === y_29),
            GetHashCode: (x_29) => (stringHash(x_29) | 0),
        });
        line_1("");
        const sample = join(", ", truncate_1(5, names));
        line_1(`Left out of every number above and below (lock files, generated files, the brief's "ignore"): ${length(names)} files, ${leftAdded} lines added, ${leftRemoved} removed, across ${json.ignored.commits} of the commits. For example: ${sample}.`);
    }
    if (publishedBranch == null) {
    }
    else if (unpublished.length > 0) {
        const branch_3 = publishedBranch;
        const ids = join(", ", truncate(40, unpublished));
        const more = (unpublished.length > 40) ? ", ..." : "";
        line_1("");
        line_1(`Not published yet: ${count(unpublished.length, "commit")} of the range ${(unpublished.length === 1) ? "is" : "are"} not on ${branch_3}, the published branch of this repository (${ids}${more}). What only those commits did is in progress on a branch; it has not shipped.`);
    }
    else {
        const branch_4 = publishedBranch;
        line_1("");
        line_1(concat("Every commit of the range is on ", branch_4, ", the published branch of this repository."));
    }
    line_1("");
    line_1("## Tags in the range");
    line_1("");
    if (isEmpty(tags)) {
        line_1("None.");
    }
    else {
        const enumerator_1 = getEnumerator(tags);
        try {
            while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                line_1(`- ${forLoopVar[0]} (${forLoopVar[1]}, ${forLoopVar[2]})`);
            }
        }
        finally {
            disposeSafe(enumerator_1);
        }
    }
    line_1("");
    line_1("## Areas");
    line_1("");
    line_1("| area | commits | files | added | deleted | renamed | lines + | lines - |");
    line_1("|---|---|---|---|---|---|---|---|");
    const enumerator_2 = getEnumerator(areas);
    try {
        while (enumerator_2["System.Collections.IEnumerator.MoveNext"]()) {
            const a_13 = enumerator_2["System.Collections.Generic.IEnumerator`1.get_Current"]();
            line_1(`| ${a_13.area} | ${a_13.commits} | ${a_13.files} | ${a_13.added} | ${a_13.deleted} | ${a_13.renamed} | ${a_13.linesAdded} | ${a_13.linesRemoved} |`);
        }
    }
    finally {
        disposeSafe(enumerator_2);
    }
    if (people) {
        line_1("");
        line_1("## People (written because the focus includes \"people\")");
        line_1("");
        line_1("By area, who committed there and how many commits. No ranking is meant by the order.");
        line_1("");
        const enumerator_3 = getEnumerator(areas);
        try {
            while (enumerator_3["System.Collections.IEnumerator.MoveNext"]()) {
                const a_14 = enumerator_3["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const who = join(", ", map((p_22) => (`${p_22.name} (${p_22.commits})`), a_14.people));
                line_1(`- ${a_14.area}: ${who}`);
            }
        }
        finally {
            disposeSafe(enumerator_3);
        }
    }
    line_1("");
    line_1("## Files");
    line_1("");
    line_1(concat("Most changed (by commits): ", join(", ", map_1((tupledArg_31) => (((tupledArg_31[0] + " (") + int32ToString(tupledArg_31[1])) + ")"), mostChanged)), "."));
    const list_81 = (title, paths) => {
        if (!isEmpty(paths)) {
            line_1("");
            const shown = join(", ", truncate_1(40, paths)) + ((length(paths) > 40) ? ", ..." : "");
            line_1(`${title} (${length(paths)}): ${shown}`);
        }
    };
    list_81("Added", map_1((tupledArg_32) => tupledArg_32[1], of$0027("added")));
    list_81("Deleted", map_1((tupledArg_33) => tupledArg_33[1], of$0027("deleted")));
    list_81("Renamed", map_1((tupledArg_34) => ((tupledArg_34[2] + " -> ") + tupledArg_34[1]), of$0027("renamed")));
    line_1("");
    line_1("## Commits, oldest first");
    line_1("");
    if (partial) {
        line_1(`The range holds ${length(all)} commits. Only the ${length(listed)} that are tagged, are merges or touch more than ${WIDE} files are listed; the rest are in the counts above. Read the others with git when a theme needs them.`);
        line_1("");
    }
    const enumerator_4 = getEnumerator(listed);
    try {
        while (enumerator_4["System.Collections.IEnumerator.MoveNext"]()) {
            const c_12 = enumerator_4["System.Collections.Generic.IEnumerator`1.get_Current"]();
            line_1(`- ${c_12.Id} (${c_12.Date}${people ? concat(", ", c_12.Author) : ""}) ${saidSubject(c_12.Subject)} [${length(c_12.Files)} files]`);
            if (saidBody(c_12.Body) !== "") {
                const arr = split(saidBody(c_12.Body), ["\n"], undefined, 0);
                for (let idx = 0; idx <= (arr.length - 1); idx++) {
                    const b_6 = item(idx, arr);
                    if (b_6.trim() !== "") {
                        line_1(concat("    ", b_6.trimEnd()));
                    }
                }
            }
        }
    }
    finally {
        disposeSafe(enumerator_4);
    }
    writeText(join_1(ofArray([build, "history.md"])), join("\n", md) + "\n");
    const arg_2 = count(length(all), "commit");
    const arg_3 = count(Math.round((Date.parse(untilDate + 'T00:00:00Z') - Date.parse(sinceDate + 'T00:00:00Z')) / 86400000), "day");
    const arg_4 = join_1(ofArray([build, "history.md"]));
    toConsole(printf("history: %s to %s, %s, %s -> %s"))(sinceRef)(untilRef)(arg_2)(arg_3)(arg_4);
    return 0;
}

function done$0027(ws) {
    const file = join_1(ofArray([ws, "build", "history.json"]));
    if (!exists(file)) {
        stop("history --done: build/history.json is missing; run \"history\" first");
    }
    const history = readJson(file);
    const brief = readJson(join_1(ofArray([ws, "brief.json"])));
    const out = join_1(ofArray([brief.repo, ".codebase-video", "progress.json"]));
    mkdirp(dirname(out));
    const until = history.range.until;
    writeText(out, toJsonIndented({
        until: {
            commit: ((until.sha == null)) ? until.commit : until.sha,
            date: until.date,
        },
        video: brief.name,
    }, 2) + "\n");
    const arg = toString(until.commit);
    toConsole(printf("history: the next progress video starts at %s (%s)"))(arg)(out);
    return 0;
}

export function run(ws, args) {
    try {
        let matchResult, other;
        if (isEmpty(args)) {
            matchResult = 1;
        }
        else if (head_1(args) === "--done") {
            if (isEmpty(tail(args))) {
                matchResult = 0;
            }
            else {
                matchResult = 2;
                other = args;
            }
        }
        else {
            matchResult = 2;
            other = args;
        }
        switch (matchResult) {
            case 0:
                return done$0027(ws) | 0;
            case 1:
                return write(ws) | 0;
            default: {
                eprint(concat("history: unknown option ", join(" ", other), " (options: --done)"));
                return 2;
            }
        }
    }
    catch (matchValue) {
        if (matchValue instanceof Stop) {
            eprint(matchValue.Data0);
            return 1;
        }
        else {
            throw matchValue;
        }
    }
}

