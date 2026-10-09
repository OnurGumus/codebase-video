
import { Union, Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { union_type, record_type, obj_type, class_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { collect as collect_1, empty as empty_2, cons, reverse, ofArrayWithTail, tail, head, ofArray, fold, isEmpty, sortByDescending, map } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { FSharpMap__get_Item, FSharpMap__TryFind, empty as empty_1, add, remove, toList } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { substring, split, join } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { empty, singleton, collect, delay, toList as toList_1 } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { dirname, engineDir, join as join_1, readText, exists } from "./Node.js";
import { mapIndexed } from "./fable_modules/fable-library-js.5.19.0/Array.js";
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

class Piece extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Plain", "Marked"];
    }
}

function Piece_$reflection() {
    return union_type("Glossary.Piece", [], Piece, () => [[["Item", string_type]], [["Item", string_type]]]);
}

function pieces(say) {
    const walk = (pos_mut, found_mut, cut_mut) => {
        walk:
        while (true) {
            const pos = pos_mut, found = found_mut, cut = cut_mut;
            if (!isEmpty(found)) {
                const len = head(found)[1] | 0;
                const i = head(found)[0] | 0;
                pos_mut = (i + len);
                found_mut = tail(found);
                cut_mut = ofArrayWithTail([new Piece(/* Marked */ 1, [substring(say, i, len)]), new Piece(/* Plain */ 0, [substring(say, pos, i - pos)])], cut);
                continue walk;
            }
            else {
                return reverse(cons(new Piece(/* Plain */ 0, [substring(say, pos)]), cut));
            }
            break;
        }
    };
    return walk(0, ofArray(Array.from(say.matchAll(MARKED), m => [m.index, m[0].length])), empty_2());
}

function scan(g, text) {
    const walk = (pos_mut, found_mut, built_mut, said_mut) => {
        walk:
        while (true) {
            const pos = pos_mut, found = found_mut, built = built_mut, said = said_mut;
            if (!isEmpty(found)) {
                const whole = head(found)[1];
                const name = head(found)[2];
                const i = head(found)[0] | 0;
                const spoken = (Operators_IsNull(name) ? true : ((typeof name) === "undefined")) ? FSharpMap__get_Item(g.Terms, head(found)[3]) : dotted(g, name);
                const patternInput = (spoken === whole) ? [whole, said] : [`[${whole}](${spoken})`, cons([whole, spoken], said)];
                pos_mut = (i + whole.length);
                found_mut = tail(found);
                built_mut = ofArrayWithTail([patternInput[0], substring(text, pos, i - pos)], built);
                said_mut = patternInput[1];
                continue walk;
            }
            else {
                return [join("", reverse(cons(substring(text, pos), built))), reverse(said)];
            }
            break;
        }
    };
    return walk(0, ofArray(Array.from(text.matchAll(g.Finder), m => [m.index, m[0], m[1], m[2]])), empty_2(), empty_2());
}

/**
 * A scene's "say" with every term the glossary knows written as `[term](how it is said)`.
 */
export function apply(g, say) {
    return join("", map((_arg) => {
        if (_arg.tag === 1) {
            return _arg.fields[0];
        }
        else {
            return scan(g, _arg.fields[0])[0];
        }
    }, pieces(say)));
}

/**
 * Every term of a "say" that the glossary will say differently from how it is written, with how.
 */
export function uses(g, say) {
    return collect_1((_arg) => {
        if (_arg.tag === 1) {
            return empty_2();
        }
        else {
            return scan(g, _arg.fields[0])[1];
        }
    }, pieces(say));
}

