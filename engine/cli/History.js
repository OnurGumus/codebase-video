
import { toString, Record, FSharpException } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { record_type, list_type, tuple_type, int32_type, bool_type, string_type, class_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { difference, toList as toList_1, ofArray as ofArray_1, ofList, empty as empty_1, FSharpSet__Contains, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { int32ToString, disposeSafe, getEnumerator, compareArrays, createObj, stringHash, equals, defaultOf, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { truncate as truncate_1, singleton as singleton_1, toArray, length, sortBy, sumBy, filter, exists as exists_1, map, collect as collect_1, contains, empty as empty_2, head as head_1, tail, isEmpty, append, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { eprint, dirname, toJsonIndented, writeText, mkdirp, childProcess, readJson, exists, join as join_1, runCapture } from "./Node.js";
import { printf, toConsole, concat, join, split, substring, replace } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { map as map_1, item, last as last_1, equalsWith, truncate } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { value as value_1 } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { empty, singleton, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { op_UnaryNegation_Int32, parse } from "./fable_modules/fable-library-js.5.19.0/Int32.js";
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
    const patternInput = runCapture("git", append(ofArray(["-C", repo]), args));
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

function resolveSince(repo, given, until) {
    const first = () => last_1(split(gitOut(repo, ofArray(["rev-list", "--max-parents=0", until])), ["\n"], undefined, 0));
    const before = (date) => gitOut(repo, ofArray(["rev-list", "-1", concat("--before=", date, " 23:59:59"), until]));
    if (given == null) {
        let recorded;
        const file = join_1(ofArray([repo, ".codebase-video", "progress.json"]));
        if (exists(file)) {
            const last = readJson(file).until;
            recorded = (((last == null)) ? undefined : commitOf(repo, toString(last.commit)));
        }
        else {
            recorded = undefined;
        }
        if (recorded == null) {
            let tagBefore;
            const matchValue_2 = git(repo, ofArray(["describe", "--tags", "--abbrev=0", until]));
            if (matchValue_2[0] === 0) {
                if (!equals(commitOf(repo, matchValue_2[1]), until)) {
                    tagBefore = matchValue_2[1];
                }
                else {
                    const matchValue_3 = git(repo, ofArray(["describe", "--tags", "--abbrev=0", until + "^"]));
                    tagBefore = ((matchValue_3[0] === 0) ? matchValue_3[1] : undefined);
                }
            }
            else {
                tagBefore = undefined;
            }
            if (tagBefore == null) {
                const date_1 = new Date(Date.parse(dateOf(repo, until) + 'T00:00:00Z') - 30 * 86400000).toISOString().slice(0, 10);
                const matchValue_4 = before(date_1);
                if (matchValue_4 === "") {
                    if (isShallow(repo)) {
                        return stop(concat("history: this clone is shallow and does not reach 30 days back; ", SHALLOW_HINT));
                    }
                    else {
                        return [first(), "the first commit", "first commit"];
                    }
                }
                else {
                    return [matchValue_4, date_1, "30 days"];
                }
            }
            else {
                const tag_3 = tagBefore;
                return [value_1(commitOf(repo, tag_3)), tag_3, "latest tag"];
            }
        }
        else {
            const sha_2 = recorded;
            return [sha_2, shortOf(repo, sha_2), "last video"];
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
                return [first(), reference_1, "first commit"];
            }
        }
        else {
            return [matchValue, reference_1, "given"];
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
            return [matchValue_1, reference_2, "given"];
        }
    }
}

function readCommits(repo, since, until) {
    const out = gitOut(repo, ofArray(["log", "--reverse", "-M", "--numstat", "--format=%x01%h%x02%cs%x02%an%x02%P%x02%s%x02%b%x03", concat(since, "..", until)]));
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
                    return singleton([newPath(path), n(added), n(removed)]);
                }
                else {
                    return empty();
                }
            }, split(substring(chunk, cut + 1), ["\n"], undefined, 0))));
            return singleton(new Commit(item(0, head), item(1, head), item(2, head), item(3, head).trim().indexOf(" ") >= 0, item(4, head), item(5, head).trim(), files));
        }
        else {
            return empty();
        }
    }, split(out, ["\u0001"], undefined, 0))));
}

const TRAILER = new RegExp("^\\s*(?:co-authored-by|signed-off-by|reviewed-by|acked-by|tested-by|reported-by|suggested-by|helped-by|authored-by|cc)\\s*:.*$", "gim");

const EMAIL = new RegExp("<?[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+>?", "g");

function unnamed(message) {
    return ((message.replace(TRAILER, "")).replace(EMAIL, "")).trim();
}

function generated(repo, paths) {
    if (isEmpty(paths)) {
        return empty_1({
            Compare: (x, y) => (comparePrimitives(x, y) | 0),
        });
    }
    else {
        const r = childProcess.spawnSync("git", ["-C", repo, "check-attr", "linguist-generated", "--stdin"], {
            encoding: "utf8",
            input: join("\n", paths),
            maxBuffer: 1 << 28,
        });
        const out = ((r.stdout == null)) ? "" : r.stdout;
        return ofList(toList(delay(() => collect((line) => {
            const mark = line.lastIndexOf(": linguist-generated: ") | 0;
            return ((mark > 0) && ((substring(line, mark + 22).trim() === "true") ? true : (substring(line, mark + 22).trim() === "set"))) ? singleton(substring(line, 0, mark)) : empty();
        }, split(out, ["\n"], undefined, 0)))), {
            Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
        });
    }
}

function strings(o) {
    if (Array.isArray(o)) {
        return ofArray(o);
    }
    else {
        return empty_2();
    }
}

function count(n, one) {
    if (n === 1) {
        return concat("1 ", one);
    }
    else {
        return `${n} ${one}s`;
    }
}

function write(ws) {
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
    const patternInput = resolveSince(repo, ((brief.since == null)) ? undefined : toString(brief.since), until);
    const sinceWas = patternInput[2];
    const sinceRef = patternInput[1];
    const since = patternInput[0];
    if (since === until) {
        stop(`history: no commits between ${sinceRef} and ${untilRef} (both are ${shortOf(repo, until)}); give an earlier "since"`);
    }
    if (git(repo, ofArray(["merge-base", "--is-ancestor", since, until]))[0] !== 0) {
        if (isShallow(repo)) {
            stop(concat("history: this clone is shallow and does not reach ", sinceRef, "; ", SHALLOW_HINT));
        }
        stop(`history: ${sinceRef} is not an ancestor of ${untilRef}: the range must run forward in one line of history`);
    }
    const all = readCommits(repo, since, until);
    if (isEmpty(all)) {
        stop(concat("history: no commits between ", sinceRef, " and ", untilRef));
    }
    const touched = List_distinct(collect_1((c) => map((tupledArg) => tupledArg[0], c.Files), all), {
        Equals: (x_1, y_1) => (x_1 === y_1),
        GetHashCode: (x_1) => (stringHash(x_1) | 0),
    });
    const globs = map(globRx, append(LOCKS, strings(brief.ignore)));
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
        const matchValue = ofArray(split(line, ["\t"], undefined, 0));
        let matchResult, p_5, p_6, a_3, b_3, r_3;
        if (!isEmpty(matchValue)) {
            switch (head_1(matchValue)) {
                case "A": {
                    if (!isEmpty(tail(matchValue))) {
                        if (!isEmpty(tail(tail(matchValue)))) {
                            if (isEmpty(tail(tail(tail(matchValue))))) {
                                if (head_1(matchValue).startsWith("R") && !ignored(head_1(tail(tail(matchValue))))) {
                                    matchResult = 2;
                                    a_3 = head_1(tail(matchValue));
                                    b_3 = head_1(tail(tail(matchValue)));
                                    r_3 = head_1(matchValue);
                                }
                                else {
                                    matchResult = 3;
                                }
                            }
                            else {
                                matchResult = 3;
                            }
                        }
                        else if (!ignored(head_1(tail(matchValue)))) {
                            matchResult = 0;
                            p_5 = head_1(tail(matchValue));
                        }
                        else {
                            matchResult = 3;
                        }
                    }
                    else {
                        matchResult = 3;
                    }
                    break;
                }
                case "D": {
                    if (!isEmpty(tail(matchValue))) {
                        if (!isEmpty(tail(tail(matchValue)))) {
                            if (isEmpty(tail(tail(tail(matchValue))))) {
                                if (head_1(matchValue).startsWith("R") && !ignored(head_1(tail(tail(matchValue))))) {
                                    matchResult = 2;
                                    a_3 = head_1(tail(matchValue));
                                    b_3 = head_1(tail(tail(matchValue)));
                                    r_3 = head_1(matchValue);
                                }
                                else {
                                    matchResult = 3;
                                }
                            }
                            else {
                                matchResult = 3;
                            }
                        }
                        else if (!ignored(head_1(tail(matchValue)))) {
                            matchResult = 1;
                            p_6 = head_1(tail(matchValue));
                        }
                        else {
                            matchResult = 3;
                        }
                    }
                    else {
                        matchResult = 3;
                    }
                    break;
                }
                default:
                    if (!isEmpty(tail(matchValue))) {
                        if (!isEmpty(tail(tail(matchValue)))) {
                            if (isEmpty(tail(tail(tail(matchValue))))) {
                                if (head_1(matchValue).startsWith("R") && !ignored(head_1(tail(tail(matchValue))))) {
                                    matchResult = 2;
                                    a_3 = head_1(tail(matchValue));
                                    b_3 = head_1(tail(tail(matchValue)));
                                    r_3 = head_1(matchValue);
                                }
                                else {
                                    matchResult = 3;
                                }
                            }
                            else {
                                matchResult = 3;
                            }
                        }
                        else {
                            matchResult = 3;
                        }
                    }
                    else {
                        matchResult = 3;
                    }
            }
        }
        else {
            matchResult = 3;
        }
        switch (matchResult) {
            case 0:
                return singleton(["added", p_5, ""]);
            case 1:
                return singleton(["deleted", p_6, ""]);
            case 2:
                return singleton(["renamed", b_3, a_3]);
            default: {
                return empty();
            }
        }
    }, split(gitOut(repo, ofArray(["diff", "--name-status", "-M", since, until])), ["\n"], undefined, 0))));
    const of$0027 = (kind) => filter((tupledArg_3) => (tupledArg_3[0] === kind), status);
    const sum = (files) => [sumBy((tupledArg_4) => (tupledArg_4[1] | 0), files, {
        GetZero: () => 0,
        Add: (x_2, y_2) => ((x_2 + y_2) | 0),
    }), sumBy((tupledArg_5) => (tupledArg_5[2] | 0), files, {
        GetZero: () => 0,
        Add: (x_3, y_3) => ((x_3 + y_3) | 0),
    })];
    const areas = sortBy((a_7) => [op_UnaryNegation_Int32(a_7.commits), a_7.area], map((tupledArg_7) => {
        const area = tupledArg_7[0];
        const rows_1 = map((tuple_1) => tuple_1[1], tupledArg_7[1]);
        const commits = List_distinctBy((c_5) => c_5.Id, map((tupledArg_8) => tupledArg_8[0], rows_1), {
            Equals: (x_5, y_5) => (x_5 === y_5),
            GetHashCode: (x_5) => (stringHash(x_5) | 0),
        });
        const count_1 = (kind_1) => (length(filter((tupledArg_9) => {
            if (tupledArg_9[0] === kind_1) {
                return areaOf(tupledArg_9[1]) === area;
            }
            else {
                return false;
            }
        }, status)) | 0);
        return createObj(append(ofArray([["area", area], ["commits", length(commits)], ["files", length(List_distinct(map((tupledArg_10) => tupledArg_10[1], rows_1), {
            Equals: (x_6, y_6) => (x_6 === y_6),
            GetHashCode: (x_6) => (stringHash(x_6) | 0),
        }))], ["added", count_1("added")], ["deleted", count_1("deleted")], ["renamed", count_1("renamed")], ["linesAdded", sumBy((tupledArg_11) => (tupledArg_11[2] | 0), rows_1, {
            GetZero: () => 0,
            Add: (x_7, y_7) => ((x_7 + y_7) | 0),
        })], ["linesRemoved", sumBy((tupledArg_12) => (tupledArg_12[3] | 0), rows_1, {
            GetZero: () => 0,
            Add: (x_8, y_8) => ((x_8 + y_8) | 0),
        })]]), people ? singleton_1(["people", toArray(map((tupledArg_13) => ({
            name: tupledArg_13[0],
            commits: tupledArg_13[1],
        }), sortBy((tuple_2) => tuple_2[0], List_countBy((c_6) => c_6.Author, commits, {
            Equals: (x_9, y_9) => (x_9 === y_9),
            GetHashCode: (x_9) => (stringHash(x_9) | 0),
        }), {
            Compare: (x_10, y_10) => (comparePrimitives(x_10, y_10) | 0),
        })))]) : empty_2()));
    }, List_groupBy((tuple) => tuple[0], collect_1((c_3) => map((tupledArg_6) => {
        const p_7 = tupledArg_6[0];
        return [areaOf(p_7), [c_3, p_7, tupledArg_6[1], tupledArg_6[2]]];
    }, kept(c_3)), all), {
        Equals: (x_4, y_4) => (x_4 === y_4),
        GetHashCode: (x_4) => (stringHash(x_4) | 0),
    })), {
        Compare: (x_11, y_11) => (compareArrays(x_11, y_11) | 0),
    });
    const mostChanged = truncate_1(TOP_FILES, sortBy((tupledArg_18) => [op_UnaryNegation_Int32(tupledArg_18[1]), op_UnaryNegation_Int32(tupledArg_18[2] + tupledArg_18[3]), tupledArg_18[0]], map((tupledArg_15) => {
        const rows_2 = tupledArg_15[1];
        return [tupledArg_15[0], length(rows_2), sumBy((tupledArg_16) => (tupledArg_16[1][0] | 0), rows_2, {
            GetZero: () => 0,
            Add: (x_13, y_13) => ((x_13 + y_13) | 0),
        }), sumBy((tupledArg_17) => (tupledArg_17[1][1] | 0), rows_2, {
            GetZero: () => 0,
            Add: (x_14, y_14) => ((x_14 + y_14) | 0),
        })];
    }, List_groupBy((tuple_3) => tuple_3[0], collect_1((c_7) => map((tupledArg_14) => [tupledArg_14[0], [tupledArg_14[1], tupledArg_14[2]]], kept(c_7)), all), {
        Equals: (x_12, y_12) => (x_12 === y_12),
        GetHashCode: (x_12) => (stringHash(x_12) | 0),
    })), {
        Compare: (x_15, y_15) => (compareArrays(x_15, y_15) | 0),
    }));
    const tagsOf = (sha) => {
        let array_1;
        return ofArray_1((array_1 = split(gitOut(repo, ofArray(["tag", "--merged", sha])), ["\n"], undefined, 0), array_1.filter((y_16) => ("" !== y_16))), {
            Compare: (x_17, y_17) => (comparePrimitives(x_17, y_17) | 0),
        });
    };
    const tags = sortBy((tupledArg_19) => [tupledArg_19[2], tupledArg_19[0]], map((t) => [t, shortOf(repo, value_1(commitOf(repo, t))), dateOf(repo, value_1(commitOf(repo, t)))], toList_1(difference(tagsOf(until), tagsOf(since)))), {
        Compare: (x_18, y_18) => (compareArrays(x_18, y_18) | 0),
    });
    const tagged = ofList(map((tupledArg_20) => tupledArg_20[1], tags), {
        Compare: (x_19, y_19) => (comparePrimitives(x_19, y_19) | 0),
    });
    const partial = length(all) > LIST_ALL;
    const listed = partial ? filter((c_8) => {
        if (c_8.Merge ? true : FSharpSet__Contains(tagged, c_8.Id)) {
            return true;
        }
        else {
            return length(c_8.Files) > WIDE;
        }
    }, all) : all;
    const said = (message) => {
        if (people) {
            return message;
        }
        else {
            return unnamed(message);
        }
    };
    const untilDate = dateOf(repo, until);
    const sinceDate = dateOf(repo, since);
    const keptFiles = collect_1(kept, all);
    const patternInput_2 = sum(keptFiles);
    const totalRemoved = patternInput_2[1] | 0;
    const totalAdded = patternInput_2[0] | 0;
    const patternInput_3 = sum(left);
    const leftRemoved = patternInput_3[1] | 0;
    const leftAdded = patternInput_3[0] | 0;
    const pathsOf = (kind_2) => toArray(map((tupledArg_22) => tupledArg_22[1], of$0027(kind_2)));
    const json = createObj(append(ofArray([["range", {
        since: {
            ref: sinceRef,
            commit: shortOf(repo, since),
            date: sinceDate,
        },
        until: {
            ref: untilRef,
            commit: shortOf(repo, until),
            date: untilDate,
        },
        sinceWas: sinceWas,
        days: Math.round((Date.parse(untilDate + 'T00:00:00Z') - Date.parse(sinceDate + 'T00:00:00Z')) / 86400000),
        commits: length(all),
    }], ["totals", {
        files: length(List_distinct(map((tupledArg_23) => tupledArg_23[0], keptFiles), {
            Equals: (x_20, y_20) => (x_20 === y_20),
            GetHashCode: (x_20) => (stringHash(x_20) | 0),
        })),
        linesAdded: totalAdded,
        linesRemoved: totalRemoved,
    }], ["tags", toArray(map((tupledArg_24) => ({
        tag: tupledArg_24[0],
        commit: tupledArg_24[1],
        date: tupledArg_24[2],
    }), tags))], ["listed", partial ? "partial" : "all"], ["commits", toArray(map((c_9) => createObj(append(ofArray([["id", c_9.Id], ["date", c_9.Date], ["subject", said(c_9.Subject)], ["body", said(c_9.Body)], ["merge", c_9.Merge], ["files", toArray(map((tupledArg_21) => tupledArg_21[0], c_9.Files))]]), people ? singleton_1(["author", c_9.Author]) : empty_2())), listed))], ["areas", toArray(areas)], ["files", {
        mostChanged: toArray(map((tupledArg_25) => ({
            path: tupledArg_25[0],
            commits: tupledArg_25[1],
            linesAdded: tupledArg_25[2],
            linesRemoved: tupledArg_25[3],
        }), mostChanged)),
        added: pathsOf("added"),
        deleted: pathsOf("deleted"),
        renamed: toArray(map((tupledArg_26) => ({
            from: tupledArg_26[2],
            to: tupledArg_26[1],
        }), of$0027("renamed"))),
    }], ["ignored", {
        files: toArray(List_distinct(map((tupledArg_27) => tupledArg_27[0], left), {
            Equals: (x_21, y_21) => (x_21 === y_21),
            GetHashCode: (x_21) => (stringHash(x_21) | 0),
        })),
        commits: length(filter((c_10) => exists_1((tupledArg_28) => ignored(tupledArg_28[0]), c_10.Files), all)),
        linesAdded: leftAdded,
        linesRemoved: leftRemoved,
    }]]), people ? singleton_1(["people", toArray(map((tupledArg_29) => ({
        name: tupledArg_29[0],
        commits: tupledArg_29[1],
    }), sortBy((tuple_4) => tuple_4[0], List_countBy((c_11) => c_11.Author, all, {
        Equals: (x_22, y_22) => (x_22 === y_22),
        GetHashCode: (x_22) => (stringHash(x_22) | 0),
    }), {
        Compare: (x_23, y_23) => (comparePrimitives(x_23, y_23) | 0),
    })))]) : empty_2()));
    const build = join_1(ofArray([ws, "build"]));
    mkdirp(build);
    writeText(join_1(ofArray([build, "history.json"])), toJsonIndented(json, 2) + "\n");
    const md = [];
    const line_1 = (s) => {
        void (md.push(s));
    };
    const chosen = (sinceWas === "last video") ? " The start is where the last progress video of this repository ended." : ((sinceWas === "latest tag") ? " No start was given: the range starts at the latest tag." : ((sinceWas === "30 days") ? " No start was given and the repository has no earlier tag: the range starts 30 days back." : ((sinceWas === "first commit") ? " The start asked for is before the repository\'s first commit: the range starts at the first commit." : "")));
    line_1(concat("# History: ", sinceRef, " to ", untilRef));
    line_1("");
    const matchValue_3 = count(Math.round((Date.parse(untilDate + 'T00:00:00Z') - Date.parse(sinceDate + 'T00:00:00Z')) / 86400000), "day");
    const matchValue_4 = count(length(all), "commit");
    line_1(`From ${sinceRef} (${shortOf(repo, since)}, ${sinceDate}) to ${untilRef} (${shortOf(repo, until)}, ${untilDate}): ${matchValue_3}, ${matchValue_4}.${chosen}`);
    line_1("");
    line_1("Every number in the video comes from this file or from history.json. Do not count anything yourself.");
    line_1("");
    line_1(`Totals: ${json.totals.files} files changed, ${totalAdded} lines added, ${totalRemoved} lines removed. Lines and files are sums over the range's commits; added, deleted and renamed compare its two ends.`);
    if (!isEmpty(left)) {
        const names = List_distinct(map((tupledArg_30) => tupledArg_30[0], left), {
            Equals: (x_24, y_24) => (x_24 === y_24),
            GetHashCode: (x_24) => (stringHash(x_24) | 0),
        });
        line_1("");
        const sample = join(", ", truncate_1(5, names));
        line_1(`Left out of every number above and below (lock files, generated files, the brief's "ignore"): ${length(names)} files, ${leftAdded} lines added, ${leftRemoved} removed, across ${json.ignored.commits} of the commits. For example: ${sample}.`);
    }
    line_1("");
    line_1("## Tags in the range");
    line_1("");
    if (isEmpty(tags)) {
        line_1("None.");
    }
    else {
        const enumerator = getEnumerator(tags);
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                line_1(`- ${forLoopVar[0]} (${forLoopVar[1]}, ${forLoopVar[2]})`);
            }
        }
        finally {
            disposeSafe(enumerator);
        }
    }
    line_1("");
    line_1("## Areas");
    line_1("");
    line_1("| area | commits | files | added | deleted | renamed | lines + | lines - |");
    line_1("|---|---|---|---|---|---|---|---|");
    const enumerator_1 = getEnumerator(areas);
    try {
        while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
            const a_13 = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
            line_1(`| ${a_13.area} | ${a_13.commits} | ${a_13.files} | ${a_13.added} | ${a_13.deleted} | ${a_13.renamed} | ${a_13.linesAdded} | ${a_13.linesRemoved} |`);
        }
    }
    finally {
        disposeSafe(enumerator_1);
    }
    if (people) {
        line_1("");
        line_1("## People (written because the focus includes \"people\")");
        line_1("");
        line_1("By area, who committed there and how many commits. No ranking is meant by the order.");
        line_1("");
        const enumerator_2 = getEnumerator(areas);
        try {
            while (enumerator_2["System.Collections.IEnumerator.MoveNext"]()) {
                const a_14 = enumerator_2["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const who = join(", ", map_1((p_20) => (`${p_20.name} (${p_20.commits})`), a_14.people));
                line_1(`- ${a_14.area}: ${who}`);
            }
        }
        finally {
            disposeSafe(enumerator_2);
        }
    }
    line_1("");
    line_1("## Files");
    line_1("");
    line_1(concat("Most changed (by commits): ", join(", ", map((tupledArg_31) => (((tupledArg_31[0] + " (") + int32ToString(tupledArg_31[1])) + ")"), mostChanged)), "."));
    const list_73 = (title, paths) => {
        if (!isEmpty(paths)) {
            line_1("");
            const shown = join(", ", truncate_1(40, paths)) + ((length(paths) > 40) ? ", ..." : "");
            line_1(`${title} (${length(paths)}): ${shown}`);
        }
    };
    list_73("Added", map((tupledArg_32) => tupledArg_32[1], of$0027("added")));
    list_73("Deleted", map((tupledArg_33) => tupledArg_33[1], of$0027("deleted")));
    list_73("Renamed", map((tupledArg_34) => ((tupledArg_34[2] + " -> ") + tupledArg_34[1]), of$0027("renamed")));
    line_1("");
    line_1("## Commits, oldest first");
    line_1("");
    if (partial) {
        line_1(`The range holds ${length(all)} commits. Only the ${length(listed)} that are tagged, are merges or touch more than ${WIDE} files are listed; the rest are in the counts above. Read the others with git when a theme needs them.`);
        line_1("");
    }
    const enumerator_3 = getEnumerator(listed);
    try {
        while (enumerator_3["System.Collections.IEnumerator.MoveNext"]()) {
            const c_12 = enumerator_3["System.Collections.Generic.IEnumerator`1.get_Current"]();
            line_1(`- ${c_12.Id} (${c_12.Date}${people ? concat(", ", c_12.Author) : ""}) ${said(c_12.Subject)} [${length(c_12.Files)} files]`);
            if (said(c_12.Body) !== "") {
                const arr = split(said(c_12.Body), ["\n"], undefined, 0);
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
        disposeSafe(enumerator_3);
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
            commit: until.commit,
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

