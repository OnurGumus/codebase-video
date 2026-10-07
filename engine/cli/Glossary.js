
import { Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { record_type, obj_type, class_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { ofSeq, ofArray, fold, isEmpty, sortByDescending, map } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { FSharpMap__get_Item, FSharpMap__TryFind, empty as empty_1, add, remove, toList } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { substring, split, join } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { empty, singleton, collect, delay, toList as toList_1 } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { dirname, engineDir, join as join_1, readText, exists } from "./Node.js";
import { addRangeInPlace, mapIndexed } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";

export class Glossary extends Record {
    constructor(Terms, Extensions, Finder) {
        super();
        this.Terms = Terms;
        this.Extensions = Extensions;
        this.Finder = Finder;
    }
}

export function Glossary_$reflection() {
    return record_type("Glossary.Glossary", [], Glossary, () => [["Terms", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [string_type, string_type])], ["Extensions", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [string_type, string_type])], ["Finder", obj_type]]);
}

const MARKED = new RegExp("\\[[^\\]]*\\]\\([^)]*\\)|\\{[a-z]{2,3}:[^{}]+\\}|\\[(?:pause|think|rest)[^\\]]*\\]", "g");

const DOTTED = "[A-Za-z_][A-Za-z0-9_-]*(?:\\.[A-Za-z_][A-Za-z0-9_-]*)+";

function build(terms, extensions) {
    const alternatives = map((s) => (s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')), sortByDescending((t) => (t.length | 0), map((tuple) => tuple[0], toList(terms)), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    }));
    const term = isEmpty(alternatives) ? "(?!)" : join("|", alternatives);
    return new Glossary(terms, extensions, new RegExp((`${"(?<![\\p{L}\\p{N}_/#+-])"}(?:(${DOTTED})|((?<!\\.)${term}))${"(?![\\p{L}\\p{N}_/#+])"}`), "gu"));
}

function stringMap(o) {
    return toList_1(delay(() => collect((matchValue) => {
        const v = matchValue[1];
        return ((typeof v) === "string") ? singleton([matchValue[0], v]) : empty();
    }, Object.entries(o || {}))));
}

/**
 * The engine's glossary with the repository's own laid over it (`ws` is <repo>/.codebase-video/<name>).
 */
export function load(ws) {
    const read = (file) => {
        if (exists(file)) {
            return JSON.parse(readText(file));
        }
        else {
            return {};
        }
    };
    const over = (table, bottom, top) => fold((m, tupledArg) => {
        const k = tupledArg[0];
        const v = tupledArg[1];
        if (v === "") {
            return remove(k, m);
        }
        else {
            return add(k, v, m);
        }
    }, bottom, stringMap(top[table]));
    const own = read(join_1(ofArray([engineDir, "glossary.json"])));
    const repo = read(join_1(ofArray([dirname(ws), "glossary.json"])));
    return build(over("terms", over("terms", empty_1({
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    }), own), repo), over("extensions", over("extensions", empty_1({
        Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
    }), own), repo));
}

function dotted(g, name) {
    const matchValue = FSharpMap__TryFind(g.Terms, name);
    if (matchValue == null) {
        const parts = split(name, ["."], undefined, 0);
        if (parts.every((p) => (p.length === 1))) {
            return name;
        }
        else {
            return join(" dot ", mapIndexed((i, p_1) => {
                const matchValue_1 = FSharpMap__TryFind(g.Terms, p_1);
                if (matchValue_1 == null) {
                    if (i > 0) {
                        return defaultArg(FSharpMap__TryFind(g.Extensions, p_1.toLocaleLowerCase()), p_1);
                    }
                    else {
                        return p_1;
                    }
                }
                else {
                    return matchValue_1;
                }
            }, parts));
        }
    }
    else {
        return matchValue;
    }
}

function found(g, text) {
    const out = [];
    text.replace(g.Finder, (...m) => ((whole, name, term) => {
        const said = (Operators_IsNull(name) ? true : ((typeof name) === "undefined")) ? FSharpMap__get_Item(g.Terms, term) : dotted(g, name);
        if (said !== whole) {
            void (out.push([whole, said]));
        }
        return whole;
    })(m[0], m[1], m[2]));
    return ofSeq(out);
}

function unmarked(say, f) {
    let pos = 0;
    let out = "";
    const rx = MARKED;
    rx.lastIndex = 0;
    let m = rx.exec(say);
    while (!Operators_IsNull(m)) {
        const i = m.index | 0;
        const len = m[0].length | 0;
        out = ((out + f(substring(say, pos, i - pos))) + substring(say, i, len));
        pos = ((i + len) | 0);
        m = (rx.exec(say));
    }
    return out + f(substring(say, pos));
}

/**
 * A scene's "say" with every term the glossary knows written as `[term](how it is said)`.
 */
export function apply(g, say) {
    return unmarked(say, (text) => (text.replace(g.Finder, (...m) => ((whole, name, term) => {
        const said = (Operators_IsNull(name) ? true : ((typeof name) === "undefined")) ? FSharpMap__get_Item(g.Terms, term) : dotted(g, name);
        return (said === whole) ? whole : (`[${whole}](${said})`);
    })(m[0], m[1], m[2]))));
}

/**
 * Every term of a "say" that the glossary will say differently from how it is written, with how.
 */
export function uses(g, say) {
    const out = [];
    unmarked(say, (text) => {
        addRangeInPlace(found(g, text), out);
        return text;
    });
    return ofSeq(out);
}

