
import { toString, Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { option_type, float64_type, obj_type, record_type, int32_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { head, isEmpty, indexed, tryFind as tryFind_2, filter, singleton, map as map_1, sort, contains, append, exists, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { fold, tryFind as tryFind_1, map, item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { join as join_1, substring, split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { FSharpSet__Contains, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { createObj, disposeSafe, getEnumerator, defaultOf, stringHash, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { readDir, isDir, walk, engineDir, toJson, sha1Hex, readText, exists as exists_1, readJson, sha1File, fileSize, join, extname } from "./Node.js";
import { List_distinct } from "./fable_modules/fable-library-js.5.19.0/Seq2.js";
import { getItemFromDict } from "./fable_modules/fable-library-js.5.19.0/MapUtil.js";
import { min, max } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { toArray, tryFind, map as map_2, sort as sort_1, empty, singleton as singleton_1, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { some, toNullable, defaultArg, value as value_1 } from "./fable_modules/fable-library-js.5.19.0/Option.js";
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
        const o = {};
        const arr = Object.keys(v);
        for (let idx = 0; idx <= (arr.length - 1); idx++) {
            const k = item(idx, arr);
            const x = v[k];
            o[k] = ((((k === "start") ? true : (k === "end")) && ((typeof x) === "number")) ? rel(x) : shifted(rel, x));
        }
        return o;
    }
    else {
        return v;
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
    const o = {};
    const enumerator = getEnumerator(files);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const f = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const p = join(ofArray([dir, f]));
            o[f] = (`${fileSize(p)} ${sha1File(p)}`);
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    return o;
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
    const engine = sha1Hex(toJson(hashFiles(engineDir, sort(List_distinct(append(map_1((f) => ("web/" + f), walk(join(ofArray([engineDir, "web"])))), append(singleton("stage.css"), filter((f_1) => {
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
    const runs = new Map([]);
    let prev = defaultOf();
    for (let idx = 0; idx <= (scenes.length - 1); idx++) {
        const s_3 = item(idx, scenes);
        const id = idOf(s_3);
        if ((id.endsWith("-why") ? true : (id === "title")) ? true : (!!s_3.recap)) {
            prev = defaultOf();
        }
        else {
            const k = prefix(id);
            if (!runs.has(k)) {
                runs.set(k, []);
            }
            const sentences = s_3.sentences;
            const first = (sentences.length > 0) ? item(0, sentences).start : startOf(s_3);
            if (prev === k) {
                item(getItemFromDict(runs, k).length - 1, getItemFromDict(runs, k)).End = endOf(s_3);
            }
            else {
                void (getItemFromDict(runs, k).push(new Run(max(startOf(s_3), first - 0.45), endOf(s_3))));
            }
            prev = k;
        }
    }
    const moduleText = (k_1) => {
        const f_2 = join(ofArray([ws, k_1 + ".js"]));
        if (exists_1(f_2)) {
            return readText(f_2);
        }
        else {
            return undefined;
        }
    };
    const rootFiles = sort(filter((f_3) => {
        if (!isDir(join(ofArray([ws, f_3]))) && FSharpSet__Contains(loadable, extname(f_3).toLocaleLowerCase())) {
            if (!(f_3.endsWith(".js") && runs.has(substring(f_3, 0, f_3.length - 3)))) {
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
        Compare: (x_3, y_2) => (comparePrimitives(x_3, y_2) | 0),
    });
    const rootHashes = hashFiles(ws, rootFiles);
    const rootText = join_1("\n", map_1((f_4) => readText(join(ofArray([ws, f_4]))), filter(isText, rootFiles)));
    const pageModules = createObj(toList(delay(() => collect((k_2) => {
        let text;
        const matchValue = moduleText(k_2);
        let matchResult, text_1;
        if (matchValue != null) {
            if ((text = matchValue, /\b(document|window)(\.[A-Za-z_$]|\[)|\bglobalThis\b/.test(text))) {
                matchResult = 0;
                text_1 = matchValue;
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
                return singleton_1([k_2, sha1Hex(text_1)]);
            default: {
                return empty();
            }
        }
    }, sort_1(runs.keys(), {
        Compare: (x_4, y_3) => (comparePrimitives(x_4, y_3) | 0),
    })))));
    const folders = sort(filter((d) => {
        if (((isDir(join(ofArray([ws, d]))) && (d !== "build")) && (d !== "out")) && (d !== "node_modules")) {
            return !d.startsWith(".");
        }
        else {
            return false;
        }
    }, readDir(ws)), {
        Compare: (x_5, y_4) => (comparePrimitives(x_5, y_4) | 0),
    });
    let folderHash;
    const cache = new Map([]);
    folderHash = ((d_1) => {
        if (!cache.has(d_1)) {
            cache.set(d_1, hashFiles(join(ofArray([ws, d_1])), walk(join(ofArray([ws, d_1])))));
        }
        return getItemFromDict(cache, d_1);
    });
    let chapters;
    const groups = [];
    for (let idx_1 = 0; idx_1 <= (scenes.length - 1); idx_1++) {
        const s_4 = item(idx_1, scenes);
        const id_1 = idOf(s_4);
        if (id_1.endsWith("-why")) {
            void (groups.push([s_4]));
        }
        else if (((groups.length > 0) && (id_1 !== "outro")) && (prefix(id_1) !== "outro")) {
            void (item(groups.length - 1, groups).push(s_4));
        }
    }
    chapters = toList(delay(() => map_2((g) => {
        let matchValue_1, content, sentences_1;
        const finish = endOf(item(g.length - 1, g));
        return new Chapter((!!item(0, g).chapter) ? item(0, g).chapter : item(0, g).id, (!!item(0, g).path) ? item(0, g).path : defaultOf(), startOf(item(0, g)), finish, (matchValue_1 = tryFind((s_5) => !idOf(s_5).endsWith("-why"), g), (matchValue_1 == null) ? finish : ((content = value_1(matchValue_1), (sentences_1 = content.sentences, (sentences_1.length > 0) ? item(0, sentences_1).start : undefined)))));
    }, groups)));
    const titleScene = tryFind_1((s_6) => (idOf(s_6) === "title"), scenes);
    const outro = tryFind_1((s_7) => (prefix(idOf(s_7)) === "outro"), scenes);
    return toList(delay(() => collect((k_3) => {
        let option_1;
        const s_9 = item(k_3, scenes);
        const id_2 = idOf(s_9);
        const matchValue_2 = startOf(s_9);
        const s1 = endOf(s_9);
        const s0 = matchValue_2;
        const first_1 = ((k_3 === 0) ? 0 : frameOf(s0)) | 0;
        const finish_1 = ((k_3 === (scenes.length - 1)) ? total : frameOf(startOf(item(k_3 + 1, scenes)))) | 0;
        const origin = aligned ? s0 : 0;
        const rel = (x_6) => (Math.round((x_6 - origin) * 1000000));
        const far = (x_7) => {
            if (!aligned) {
                return rel(x_7);
            }
            else if (x_7 < (s0 - 3)) {
                return "before";
            }
            else if (x_7 > (s1 + 3)) {
                return "after";
            }
            else {
                return rel(x_7);
            }
        };
        const sceneAt = (i) => shifted(rel, item(i, scenes));
        const p = prefix(id_2);
        const text_2 = moduleText(p);
        let whole;
        if (!long ? true : !standardScripts) {
            whole = true;
        }
        else if (text_2 == null) {
            whole = false;
        }
        else {
            const t = text_2;
            whole = (/TIMING|\.timing\b|DURATION|\.scenes\b/.test(t));
        }
        let before;
        const from = min(defaultArg(tryFind_2((j) => {
            let s_8;
            return (endOf(item(j, scenes)) + ((s_8 = item(j, scenes), 1 + fold(max, 0, map((d_2) => {
                if ((typeof d_2.dur) === "number") {
                    return d_2.dur;
                }
                else {
                    return 3.2;
                }
            }, (Array.isArray(s_8.toasts)) ? s_8.toasts : [], Float64Array))))) > s0;
        }, toList(rangeDouble(0, 1, k_3 - 1))), k_3 - 1), k_3 - 1) | 0;
        before = toArray(delay(() => map_2(sceneAt, rangeDouble(max(0, from), 1, k_3 - 1))));
        const after = toArray(delay(() => collect((j_2) => (((j_2 === (k_3 + 1)) ? true : (startOf(item(j_2, scenes)) < (s1 + 1))) ? singleton_1(sceneAt(j_2)) : empty()), rangeDouble(k_3 + 1, 1, scenes.length - 1))));
        const referenced = toArray(delay(() => collect((j_3) => {
            const other = idOf(item(j_3, scenes));
            return ((j_3 !== k_3) && ((prefix(other) === p) ? true : ((text_2 == null) ? false : names(text_2, other)))) ? singleton_1(sceneAt(j_3)) : empty();
        }, rangeDouble(0, 1, scenes.length - 1))));
        const moduleRuns = runs.has(p) ? toArray(delay(() => map_2((r) => ({
            start: rel(r.Start),
            end: rel(r.End),
            holds: r.End >= (duration - 0.05),
        }), getItemFromDict(runs, p)))) : [];
        const chapterList = toArray(delay(() => collect((matchValue_4) => {
            let matchValue_5;
            const c = matchValue_4[1];
            return singleton_1((aligned && (c.End <= s0)) ? "done" : ((aligned && (c.Start >= s1)) ? "todo" : {
                n: matchValue_4[0] + 1,
                title: c.Title,
                path: c.Path,
                start: rel(c.Start),
                end: rel(c.End),
                talk: (matchValue_5 = c.Talk, (matchValue_5 == null) ? defaultOf() : rel(matchValue_5)),
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
            if (marked(k_3) ? true : marked(k_3 - 1)) {
                showsMap = true;
            }
            else if (text_2 == null) {
                showsMap = false;
            }
            else {
                const t_3 = text_2;
                showsMap = (t_3.indexOf(".map(") >= 0);
            }
        }
        else {
            showsMap = false;
        }
        const chapterPath = toNullable((option_1 = tryFind_2((c_1) => {
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
        const sources = (((defaultArg(text_2, "") + "\n") + clipHtml) + "\n") + rootText;
        const assets = createObj(toList(delay(() => collect((d_3) => ((sources.indexOf(d_3) >= 0) ? singleton_1([d_3, folderHash(d_3)]) : empty()), folders))));
        let wholeTiming;
        if (!whole) {
            wholeTiming = defaultOf();
        }
        else {
            const o = shifted(rel, timing);
            o.duration = rel(duration);
            if ((typeof timing.poster) === "number") {
                o.poster = rel(timing.poster);
            }
            wholeTiming = o;
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
            scene: sceneAt(k_3),
            before: before,
            after: after,
            module: (text_2 == null) ? "missing" : sha1Hex(text_2),
            moduleScenes: referenced,
            runs: moduleRuns,
            chapters: chapterList,
            map: showsMap ? timing.map : defaultOf(),
            kind: (showsMap && !((timing.kind == null))) ? timing.kind : defaultOf(),
            chapterPath: showsMap ? chapterPath : defaultOf(),
            zero: far(0),
            title: title,
            firstChapter: isEmpty(chapters) ? defaultOf() : far(head(chapters).Start),
            outro: (outro == null) ? defaultOf() : far(startOf(value_1(outro))),
            duration: far(duration),
            timing: wholeTiming,
        });
        return (finish_1 > first_1) ? singleton_1(new Segment(id_2, sha1Hex(input), first_1, finish_1, input)) : empty();
    }, rangeDouble(0, 1, scenes.length - 1))));
}

