
import { toString, Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { option_type, float64_type, obj_type, record_type, int32_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { indexed, tryFind, last as last_2, empty, tail as tail_1, head as head_1, isEmpty, cons, reverse, filter, singleton as singleton_1, map as map_1, sort, contains, append, exists, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { contains as contains_1, tryFind as tryFind_1, fold, map, item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { join as join_1, substring, split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { FSharpSet__Contains, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { createObj, defaultOf, stringHash, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { readDir, isDir, walk, engineDir, toJson, sha1Hex, readText, exists as exists_1, readJson, sha1File, fileSize, join, extname } from "./Node.js";
import { toArray, map as map_3, empty as empty_1, singleton, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { Array_distinct, List_groupBy, List_distinct } from "./fable_modules/fable-library-js.5.19.0/Seq2.js";
import { min, max } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { FSharpMap__TryFind, exists as exists_2, map as map_2, FSharpMap__get_Item, FSharpMap__ContainsKey, ofArray as ofArray_1, ofList } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { some, toNullable, value as value_1, defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { rangeDouble } from "./fable_modules/fable-library-js.5.19.0/Range.js";

/**
 * One scene's stretch of the video.
 */
export class Segment extends Record {
    constructor(Id, Key, First, End, Input) {
        super();
        this.Id = Id;
        this.Key = Key;
        this.First = (First | 0);
        this.End = (End | 0);
        this.Input = Input;
    }
}

export function Segment_$reflection() {
    return record_type("Segments.Segment", [], Segment, () => [["Id", string_type], ["Key", string_type], ["First", int32_type], ["End", int32_type], ["Input", string_type]]);
}

const VERSION = 2;

function names(text, id) {
    const quotes = ofArray(["\"", "\'", "`"]);
    const spec = exists((q) => exists((e) => (text.indexOf((q + id) + e) >= 0), append(quotes, ofArray(["|", "#"]))), quotes);
    const built = (id.indexOf("-") >= 0) && exists((q_1) => (text.indexOf((q_1 + item(0, split(id, ["-"], undefined, 0))) + "-") >= 0), quotes);
    if (spec) {
        return true;
    }
    else {
        return built;
    }
}

const loadable = ofSeq([".html", ".js", ".mjs", ".css", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".woff", ".woff2", ".ttf", ".otf"], {
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
});

function isText(file) {
    return contains(extname(file), ofArray([".html", ".js", ".mjs", ".css", ".svg"]), {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    });
}

function shifted(rel, v) {
    if ((v == null)) {
        return defaultOf();
    }
    else if (Array.isArray(v)) {
        return map((v_1) => shifted(rel, v_1), v);
    }
    else if ((typeof v) === "object") {
        return createObj(toList(delay(() => collect((k) => singleton([k, shiftedField(rel, k, v[k])]), Object.keys(v)))));
    }
    else {
        return v;
    }
}

function shiftedField(rel, k, x) {
    if (((k === "start") ? true : (k === "end")) && ((typeof x) === "number")) {
        return rel(x);
    }
    else {
        return shifted(rel, x);
    }
}

function prefix(id) {
    return item(0, split(id, ["-"], undefined, 0));
}

class Chapter extends Record {
    constructor(Title, Path, Start, End, Talk) {
        super();
        this.Title = Title;
        this.Path = Path;
        this.Start = Start;
        this.End = End;
        this.Talk = Talk;
    }
}

function Chapter_$reflection() {
    return record_type("Segments.Chapter", [], Chapter, () => [["Title", obj_type], ["Path", obj_type], ["Start", float64_type], ["End", float64_type], ["Talk", option_type(float64_type)]]);
}

class Run extends Record {
    constructor(Start, End) {
        super();
        this.Start = Start;
        this.End = End;
    }
}

function Run_$reflection() {
    return record_type("Segments.Run", [], Run, () => [["Start", float64_type], ["End", float64_type]]);
}

function hashFiles(dir, files) {
    return createObj(toList(delay(() => collect((f) => {
        const p = join(ofArray([dir, f]));
        return singleton([f, `${fileSize(p)} ${sha1File(p)}`]);
    }, files))));
}

/**
 * Do the scenes of build/timing.json start and end on whole frames (narrated by this engine)?
 */
export function wholeFrames(ws, fps) {
    const timing = readJson(join(ofArray([ws, "build", "timing.json"])));
    const whole = (x) => (Math.abs((x * fps) - (Math.round(x * fps))) < 1E-06);
    if (whole(timing.duration)) {
        const array = timing.scenes;
        return array.every((s) => {
            if (whole(s.start)) {
                return whole(s.end);
            }
            else {
                return false;
            }
        });
    }
    else {
        return false;
    }
}

/**
 * The segments of the workspace's video, in order. `fps` is the frame rate, `size` the frame size,
 * `browser` and `encoder` identify what draws and what encodes.
 */
export function plan(ws, fps, size, browser, encoder) {
    const timing = readJson(join(ofArray([ws, "build", "timing.json"])));
    const scenes = timing.scenes;
    const duration = timing.duration;
    const startOf = (s) => s.start;
    const endOf = (s_1) => s_1.end;
    const idOf = (s_2) => toString(s_2.id);
    const aligned = wholeFrames(ws, fps);
    const frameOf = (x) => (~~Math.ceil((x * fps) - 1E-06) | 0);
    const total = frameOf(duration) | 0;
    const clipHtml = exists_1(join(ofArray([ws, "clip.html"]))) ? readText(join(ofArray([ws, "clip.html"]))) : "";
    const long = clipHtml.indexOf("id=\"modules\"") >= 0;
    const standardScripts = ((((clipHtml.match(/<script\b/g) || []).length) === 2) && (clipHtml.indexOf("src=\"build/timing.js\"") >= 0)) && (clipHtml.indexOf("/engine/web/Main.js") >= 0);
    const engine = sha1Hex(toJson(hashFiles(engineDir, sort(List_distinct(append(map_1((f) => ("web/" + f), walk(join(ofArray([engineDir, "web"])))), append(singleton_1("stage.css"), filter((f_1) => {
        if (exists_1(join(ofArray([engineDir, f_1])))) {
            return !isDir(join(ofArray([engineDir, f_1])));
        }
        else {
            return false;
        }
    }, ofArray(Array.from(clipHtml.matchAll(/\/engine\/([^"'\s)>?#]+)/g), (m) => m[1]))))), {
        Equals: (x_1, y) => (x_1 === y),
        GetHashCode: (x_1) => (stringHash(x_1) | 0),
    }), {
        Compare: (x_2, y_1) => (comparePrimitives(x_2, y_1) | 0),
    }))));
    const runList = map_1((tupledArg_1) => [tupledArg_1[0], map_1((tuple_2) => tuple_2[1], tupledArg_1[1])], List_groupBy((tuple_1) => tuple_1[0], reverse(fold((tupledArg, s_3) => {
        const acc = tupledArg[0];
        const prev = tupledArg[1];
        const id = idOf(s_3);
        if ((id.endsWith("-why") ? true : (id === "title")) ? true : (!!s_3.recap)) {
            return [acc, undefined];
        }
        else {
            const k = prefix(id);
            const sentences = s_3.sentences;
            const first = (sentences.length > 0) ? item(0, sentences).start : startOf(s_3);
            let matchResult, last_1, older_1, p_1;
            if (prev != null) {
                if (!isEmpty(acc)) {
                    if (prev === k) {
                        matchResult = 0;
                        last_1 = head_1(acc)[1];
                        older_1 = tail_1(acc);
                        p_1 = prev;
                    }
                    else {
                        matchResult = 1;
                    }
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
                    return [cons([k, new Run(last_1.Start, endOf(s_3))], older_1), prev];
                default:
                    return [cons([k, new Run(max(startOf(s_3), first - 0.45), endOf(s_3))], acc), k];
            }
        }
    }, [empty(), undefined], scenes)[0]), {
        Equals: (x_3, y_2) => (x_3 === y_2),
        GetHashCode: (x_3) => (stringHash(x_3) | 0),
    }));
    const runs = ofList(runList, {
        Compare: (x_4, y_3) => (comparePrimitives(x_4, y_3) | 0),
    });
    const texts = ofArray_1(map((p_2) => {
        let f_2;
        return [p_2, (f_2 = join(ofArray([ws, p_2 + ".js"])), exists_1(f_2) ? readText(f_2) : undefined)];
    }, Array_distinct(map((arg) => prefix(idOf(arg)), scenes), {
        Equals: (x_5, y_4) => (x_5 === y_4),
        GetHashCode: (x_5) => (stringHash(x_5) | 0),
    })), {
        Compare: (x_6, y_5) => (comparePrimitives(x_6, y_5) | 0),
    });
    const rootFiles = sort(filter((f_3) => {
        if (!isDir(join(ofArray([ws, f_3]))) && FSharpSet__Contains(loadable, extname(f_3).toLocaleLowerCase())) {
            if (!(f_3.endsWith(".js") && FSharpMap__ContainsKey(runs, substring(f_3, 0, f_3.length - 3)))) {
                return true;
            }
            else {
                return clipHtml.indexOf(f_3) >= 0;
            }
        }
        else {
            return false;
        }
    }, readDir(ws)), {
        Compare: (x_7, y_6) => (comparePrimitives(x_7, y_6) | 0),
    });
    const rootHashes = hashFiles(ws, rootFiles);
    const rootText = join_1("\n", map_1((f_4) => readText(join(ofArray([ws, f_4]))), filter(isText, rootFiles)));
    const pageModules = createObj(toList(delay(() => collect((k_3) => {
        let text;
        const matchValue_1 = FSharpMap__get_Item(texts, k_3);
        let matchResult_1, text_1;
        if (matchValue_1 != null) {
            if ((text = matchValue_1, /\b(document|window)(\.[A-Za-z_$]|\[)|\bglobalThis\b/.test(text))) {
                matchResult_1 = 0;
                text_1 = matchValue_1;
            }
            else {
                matchResult_1 = 1;
            }
        }
        else {
            matchResult_1 = 1;
        }
        switch (matchResult_1) {
            case 0:
                return singleton([k_3, sha1Hex(text_1)]);
            default: {
                return empty_1();
            }
        }
    }, sort(map_1((tuple_3) => tuple_3[0], runList), {
        Compare: (x_8, y_7) => (comparePrimitives(x_8, y_7) | 0),
    })))));
    const folders = sort(filter((d) => {
        if (((isDir(join(ofArray([ws, d]))) && (d !== "build")) && (d !== "out")) && (d !== "node_modules")) {
            return !d.startsWith(".");
        }
        else {
            return false;
        }
    }, readDir(ws)), {
        Compare: (x_9, y_8) => (comparePrimitives(x_9, y_8) | 0),
    });
    const sources = map_2((_arg, text_2) => ((((defaultArg(text_2, "") + "\n") + clipHtml) + "\n") + rootText), texts);
    const folderHashes = ofList(map_1((d_2) => [d_2, hashFiles(join(ofArray([ws, d_2])), walk(join(ofArray([ws, d_2]))))], filter((d_1) => exists_2((_arg_1, src) => (src.indexOf(d_1) >= 0), sources), folders)), {
        Compare: (x_10, y_9) => (comparePrimitives(x_10, y_9) | 0),
    });
    let chapters;
    const groups_1 = map_1(reverse, reverse(fold((groups, s_4) => {
        const id_2 = idOf(s_4);
        if (id_2.endsWith("-why")) {
            return cons(singleton_1(s_4), groups);
        }
        else {
            let matchResult_2, g_1, older_3;
            if (!isEmpty(groups)) {
                if ((id_2 !== "outro") && (prefix(id_2) !== "outro")) {
                    matchResult_2 = 0;
                    g_1 = head_1(groups);
                    older_3 = tail_1(groups);
                }
                else {
                    matchResult_2 = 1;
                }
            }
            else {
                matchResult_2 = 1;
            }
            switch (matchResult_2) {
                case 0:
                    return cons(cons(s_4, g_1), older_3);
                default:
                    return groups;
            }
        }
    }, empty(), scenes)));
    chapters = toList(delay(() => map_3((g_2) => {
        let matchValue_2, content, sentences_1;
        const head = head_1(g_2);
        const finish = endOf(last_2(g_2));
        return new Chapter((!!head.chapter) ? head.chapter : head.id, (!!head.path) ? head.path : defaultOf(), startOf(head), finish, (matchValue_2 = tryFind((s_5) => !idOf(s_5).endsWith("-why"), g_2), (matchValue_2 == null) ? finish : ((content = value_1(matchValue_2), (sentences_1 = content.sentences, (sentences_1.length > 0) ? item(0, sentences_1).start : undefined)))));
    }, groups_1)));
    const titleScene = tryFind_1((s_6) => (idOf(s_6) === "title"), scenes);
    const outro = tryFind_1((s_7) => (prefix(idOf(s_7)) === "outro"), scenes);
    return toList(delay(() => collect((k_4) => {
        let option_1;
        const s_9 = item(k_4, scenes);
        const id_3 = idOf(s_9);
        const matchValue_3 = startOf(s_9);
        const s1 = endOf(s_9);
        const s0 = matchValue_3;
        const first_1 = ((k_4 === 0) ? 0 : frameOf(s0)) | 0;
        const finish_1 = ((k_4 === (scenes.length - 1)) ? total : frameOf(startOf(item(k_4 + 1, scenes)))) | 0;
        const origin = aligned ? s0 : 0;
        const rel = (x_11) => (Math.round((x_11 - origin) * 1000000));
        const far = (x_12) => {
            if (!aligned) {
                return rel(x_12);
            }
            else if (x_12 < (s0 - 3)) {
                return "before";
            }
            else if (x_12 > (s1 + 3)) {
                return "after";
            }
            else {
                return rel(x_12);
            }
        };
        const sceneAt = (i) => shifted(rel, item(i, scenes));
        const p_3 = prefix(id_3);
        const text_3 = FSharpMap__get_Item(texts, p_3);
        let whole;
        if (!long ? true : !standardScripts) {
            whole = true;
        }
        else if (text_3 == null) {
            whole = false;
        }
        else {
            const t = text_3;
            whole = (/TIMING|\.timing\b|DURATION|\.scenes\b/.test(t));
        }
        let before;
        const from = min(defaultArg(tryFind((j) => {
            let s_8;
            return (endOf(item(j, scenes)) + ((s_8 = item(j, scenes), 1 + fold(max, 0, map((d_3) => {
                if ((typeof d_3.dur) === "number") {
                    return d_3.dur;
                }
                else {
                    return 3.2;
                }
            }, (Array.isArray(s_8.toasts)) ? s_8.toasts : [], Float64Array))))) > s0;
        }, toList(rangeDouble(0, 1, k_4 - 1))), k_4 - 1), k_4 - 1) | 0;
        before = toArray(delay(() => map_3(sceneAt, rangeDouble(max(0, from), 1, k_4 - 1))));
        const after = toArray(delay(() => collect((j_2) => (((j_2 === (k_4 + 1)) ? true : (startOf(item(j_2, scenes)) < (s1 + 1))) ? singleton(sceneAt(j_2)) : empty_1()), rangeDouble(k_4 + 1, 1, scenes.length - 1))));
        const referenced = toArray(delay(() => collect((j_3) => {
            const other = idOf(item(j_3, scenes));
            return ((j_3 !== k_4) && ((prefix(other) === p_3) ? true : ((text_3 == null) ? false : names(text_3, other)))) ? singleton(sceneAt(j_3)) : empty_1();
        }, rangeDouble(0, 1, scenes.length - 1))));
        let moduleRuns;
        const matchValue_5 = FSharpMap__TryFind(runs, p_3);
        if (matchValue_5 == null) {
            moduleRuns = [];
        }
        else {
            const rs_1 = matchValue_5;
            moduleRuns = toArray(delay(() => map_3((r) => ({
                start: rel(r.Start),
                end: rel(r.End),
                holds: r.End >= (duration - 0.05),
            }), rs_1)));
        }
        const chapterList = toArray(delay(() => collect((matchValue_6) => {
            let matchValue_7;
            const c = matchValue_6[1];
            return singleton((aligned && (c.End <= s0)) ? "done" : ((aligned && (c.Start >= s1)) ? "todo" : {
                n: matchValue_6[0] + 1,
                title: c.Title,
                path: c.Path,
                start: rel(c.Start),
                end: rel(c.End),
                talk: (matchValue_7 = c.Talk, (matchValue_7 == null) ? defaultOf() : rel(matchValue_7)),
            }));
        }, indexed(chapters))));
        const marked = (j_4) => {
            if ((j_4 >= 0) && (j_4 < scenes.length)) {
                if (!!item(j_4, scenes).path) {
                    return true;
                }
                else {
                    return !!item(j_4, scenes).inside;
                }
            }
            else {
                return false;
            }
        };
        let showsMap;
        if (!!timing.map) {
            if (marked(k_4) ? true : marked(k_4 - 1)) {
                showsMap = true;
            }
            else if (text_3 == null) {
                showsMap = false;
            }
            else {
                const t_3 = text_3;
                showsMap = (t_3.indexOf(".map(") >= 0);
            }
        }
        else {
            showsMap = false;
        }
        const chapterPath = toNullable((option_1 = tryFind((c_1) => {
            if (c_1.Start <= s0) {
                return s0 < c_1.End;
            }
            else {
                return false;
            }
        }, chapters), (option_1 != null) ? some(option_1.Path) : undefined));
        let title;
        if (titleScene != null) {
            const t_4 = value_1(titleScene);
            const gone = aligned && (endOf(t_4) < (s0 - 3));
            title = {
                end: far(endOf(t_4)),
                scene: gone ? defaultOf() : shifted(rel, t_4),
            };
        }
        else {
            title = defaultOf();
        }
        const assets = createObj(toList(delay(() => collect((d_4) => ((FSharpMap__get_Item(sources, p_3).indexOf(d_4) >= 0) ? singleton([d_4, FSharpMap__get_Item(folderHashes, d_4)]) : empty_1()), folders))));
        let wholeTiming;
        if (!whole) {
            wholeTiming = defaultOf();
        }
        else {
            const fields = toList(delay(() => collect((k_5) => {
                const x_13 = timing[k_5];
                return singleton([k_5, (k_5 === "duration") ? rel(duration) : ((k_5 === "poster") ? (((typeof x_13) === "number") ? rel(x_13) : shiftedField(rel, k_5, x_13)) : shiftedField(rel, k_5, x_13))]);
            }, Object.keys(timing))));
            wholeTiming = createObj(contains_1("duration", Object.keys(timing), {
                Equals: (x_14, y_10) => (x_14 === y_10),
                GetHashCode: (x_14) => (stringHash(x_14) | 0),
            }) ? fields : append(fields, singleton_1(["duration", rel(duration)])));
        }
        const input = toJson({
            version: VERSION,
            fps: fps,
            size: size,
            browser: browser,
            encoder: encoder,
            engine: engine,
            clip: sha1Hex(clipHtml),
            files: rootHashes,
            pageModules: pageModules,
            assets: assets,
            aligned: aligned,
            frames: aligned ? (finish_1 - first_1) : (new Int32Array([first_1, finish_1])),
            voiced: timing.voiced,
            card: ((timing.card == null)) ? defaultOf() : timing.card,
            captions: ((timing.captions == null)) ? false : timing.captions,
            scene: sceneAt(k_4),
            before: before,
            after: after,
            module: (text_3 == null) ? "missing" : sha1Hex(text_3),
            moduleScenes: referenced,
            runs: moduleRuns,
            chapters: chapterList,
            map: showsMap ? timing.map : defaultOf(),
            kind: ((timing.kind == null)) ? defaultOf() : timing.kind,
            chapterPath: showsMap ? chapterPath : defaultOf(),
            zero: far(0),
            title: title,
            firstChapter: isEmpty(chapters) ? defaultOf() : far(head_1(chapters).Start),
            outro: (outro == null) ? defaultOf() : far(startOf(value_1(outro))),
            duration: far(duration),
            timing: wholeTiming,
        });
        return (finish_1 > first_1) ? singleton(new Segment(id_3, sha1Hex(input), first_1, finish_1, input)) : empty_1();
    }, rangeDouble(0, 1, scenes.length - 1))));
}

