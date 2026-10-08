
import { read, write, concat as concat_3, trim as trim_1, roundHalfEven } from "./Wav.js";
import { max, isNegativeInfinity, isPositiveInfinity, parse } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { toConsole, trim, concat, padLeft, printf, toText, join, substring, padRight, replace, split as split_1 } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { concat as concat_2, truncate, fold as fold_1, choose, reverse as reverse_1, mapIndexed as mapIndexed_1, map as map_1, item, equalsWith } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { round, disposeSafe, getEnumerator, Lazy, Exception, comparePrimitives, int32ToString, defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { op_UnaryNegation_Int32, parse as parse_1 } from "./fable_modules/fable-library-js.5.19.0/Int32.js";
import { empty as empty_1, singleton as singleton_1, collect, append as append_1, delay, toList, map } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { FSharpRef, toString, Record, Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { float32_type, class_type, lambda_type, array_type, uint8_type, unit_type, obj_type, record_type, int32_type, union_type, tuple_type, list_type, string_type, float64_type, bool_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { sumBy, last as last_2, tryFind, item as item_1, indexed, length, sort, ofSeq as ofSeq_1, concat as concat_1, unzip, exists as exists_1, singleton, append, filter, empty, head, tail as tail_1, cons, fold, reverse, mapIndexed, toArray, mapFold, isEmpty, map as map_2, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { writeText, rename, sha1Hex, toJson, mkdirp, parseJson, readText, resolve as resolve_1, readJson, dirname, requireFromHome, url, nodeModule, engineDir, toolHome, join as join_1, exists, exit, eprint } from "./Node.js";
import { defaultArg, some, value as value_8 } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { toList as toList_1, FSharpSet__Contains, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { empty as empty_2, FSharpMap__ContainsKey, FSharpMap__TryFind, ofArray as ofArray_1, ofList } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { PromiseBuilder__For_1565554B, PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "./fable_modules/Fable.Promise.3.2.1/Promise.fs.js";
import { promise } from "./fable_modules/Fable.Promise.3.2.1/PromiseImpl.fs.js";
import * as node$003Aworker_threads from "node:worker_threads";
import { tryGetValue } from "./fable_modules/fable-library-js.5.19.0/MapUtil.js";
import { apply, load } from "./Glossary.js";
import { rangeDouble } from "./fable_modules/fable-library-js.5.19.0/Range.js";

/**
 * round(x) to an integer, half to even.
 */
export function Py_roundInt(x) {
    return ~~roundHalfEven(x) | 0;
}

/**
 * x with `digits` decimals as Python's f"{x:.{digits}f}" writes it: correctly rounded, exact ties to even
 * (JS toFixed sends exact ties away from zero). An exact tie has at most digits+1 fractional bits, so it is
 * found by scaling with a power of two, which is exact.
 */
export function Py_toFixed(x, digits) {
    let arg1__1;
    const p = x * ((arg1__1 = (digits + 1), Math.pow(2, arg1__1)));
    if ((Number.isInteger(p)) && ((Math.abs(p) % 2) === 1)) {
        const scaled = x * Math.pow(10, digits);
        const lo = Math.floor(scaled);
        const even = ((lo % 2) === 0) ? lo : (lo + 1);
        return (even / Math.pow(10, digits)).toFixed(digits);
    }
    else {
        return x.toFixed(digits);
    }
}

/**
 * round(x, digits): the double nearest to the correctly rounded decimal.
 */
export function Py_round(x, digits) {
    return parse(Py_toFixed(x, digits));
}

/**
 * repr(x) for a float: shortest round-trip digits, ".0" on whole numbers, exponent outside 1e-4 <= |x| < 1e16.
 */
export function Py_floatRepr(x) {
    if (Number.isNaN(x)) {
        return "NaN";
    }
    else if (isPositiveInfinity(x)) {
        return "Infinity";
    }
    else if (isNegativeInfinity(x)) {
        return "-Infinity";
    }
    else {
        const e = x.toExponential();
        let patternInput;
        const matchValue = split_1(e, ["e"], undefined, 0);
        if (!equalsWith((x_1, y) => (x_1 === y), matchValue, defaultOf()) && (matchValue.length === 2)) {
            const x_2 = item(1, matchValue);
            patternInput = [item(0, matchValue), parse_1(x_2, 511, false, 32)];
        }
        else {
            patternInput = [e, 0];
        }
        const mant = patternInput[0];
        const exp = patternInput[1] | 0;
        const sign = mant.startsWith("-") ? "-" : "";
        const digits = replace(replace(mant, "-", ""), ".", "");
        if ((exp >= -4) && (exp < 16)) {
            if (exp >= 0) {
                const whole = padRight(digits, exp + 1, "0");
                const intPart = substring(whole, 0, exp + 1);
                const frac = substring(whole, exp + 1);
                return ((sign + intPart) + ".") + ((frac === "") ? "0" : frac);
            }
            else {
                return ((sign + "0.") + (Array((op_UnaryNegation_Int32(exp) - 1) + 1).join("0"))) + digits;
            }
        }
        else {
            const m_1 = (digits.length > 1) ? ((substring(digits, 0, 1) + ".") + substring(digits, 1)) : digits;
            const ex = int32ToString(Math.abs(exp));
            return (((sign + m_1) + "e") + ((exp < 0) ? "-" : "+")) + ((ex.length < 2) ? ("0" + ex) : ex);
        }
    }
}

/**
 * repr() of a string: single quotes unless the text holds one and no double quote.
 */
export function Py_strRepr(s) {
    const q = ((s.indexOf("\'") >= 0) && !(s.indexOf("\"") >= 0)) ? "\"" : "\'";
    return (q + join("", map((c) => {
        let c_2;
        switch (c) {
            case "\t":
                return "\\t";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\\":
                return "\\\\";
            default:
                if (c === q) {
                    return "\\" + q;
                }
                else if ((c_2 = c, (~~c_2.charCodeAt(0) < 32) ? true : (~~c_2.charCodeAt(0) === 127))) {
                    const arg = ~~c.charCodeAt(0) | 0;
                    return toText(printf("\\x%02x"))(arg);
                }
                else {
                    return c;
                }
        }
    }, s.split("")))) + q;
}

/**
 * A JSON value as Python's json module holds it: ints and floats are told apart, objects keep their key order.
 */
export class Py_Json extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Null", "Bool", "Int", "Float", "Str", "List", "Obj"];
    }
    static Null = new Py_Json(0, []);
}

export function Py_Json_$reflection() {
    return union_type("Narrate.Py.Json", [], Py_Json, () => [[], [["Item", bool_type]], [["Item", float64_type]], [["Item", float64_type]], [["Item", string_type]], [["Item", list_type(Py_Json_$reflection())]], [["Item", list_type(tuple_type(string_type, Py_Json_$reflection()))]]]);
}

/**
 * A parsed JSON value (from parseMarked or JSON.parse) as Json.
 */
export function Py_ofJs(v) {
    if (Operators_IsNull(v)) {
        return Py_Json.Null;
    }
    else {
        const matchValue = typeof v;
        switch (matchValue) {
            case "boolean":
                return new Py_Json(/* Bool */ 1, [v]);
            case "number": {
                const x = v;
                if (Number.isInteger(x)) {
                    return new Py_Json(/* Int */ 2, [x]);
                }
                else {
                    return new Py_Json(/* Float */ 3, [x]);
                }
            }
            case "string":
                return new Py_Json(/* Str */ 4, [v]);
            default:
                if (Array.isArray(v)) {
                    return new Py_Json(/* List */ 5, [ofArray(map_1(Py_ofJs, v))]);
                }
                else {
                    const matchValue_1 = Object.keys(v);
                    let matchResult, ks;
                    if (!equalsWith((x_1, y) => (x_1 === y), matchValue_1, defaultOf()) && (matchValue_1.length === 1)) {
                        if (item(0, matchValue_1) === "__py_float__") {
                            matchResult = 0;
                        }
                        else {
                            matchResult = 1;
                            ks = matchValue_1;
                        }
                    }
                    else {
                        matchResult = 1;
                        ks = matchValue_1;
                    }
                    switch (matchResult) {
                        case 0: {
                            item(0, matchValue_1);
                            return new Py_Json(/* Float */ 3, [v.__py_float__]);
                        }
                        default:
                            return new Py_Json(/* Obj */ 6, [ofArray(map_1((k_2) => [k_2, Py_ofJs(v[k_2])], ks))]);
                    }
                }
        }
    }
}

function Py_number(j) {
    switch (j.tag) {
        case 2: {
            const x = j.fields[0];
            if (Math.abs(x) < 1E+21) {
                return x.toFixed(0);
            }
            else {
                return Py_floatRepr(x);
            }
        }
        case 3:
            return Py_floatRepr(j.fields[0]);
        default:
            return "";
    }
}

/**
 * json.dumps(j, ensure_ascii=False): ", " and ": " separators.
 */
export function Py_dumps(j) {
    let matchResult, b, s, xs, kvs;
    switch (j.tag) {
        case 2:
        case 3: {
            matchResult = 2;
            break;
        }
        case 1: {
            matchResult = 1;
            b = j.fields[0];
            break;
        }
        case 4: {
            matchResult = 3;
            s = j.fields[0];
            break;
        }
        case 5: {
            if (isEmpty(j.fields[0])) {
                matchResult = 4;
            }
            else {
                matchResult = 6;
                xs = j.fields[0];
            }
            break;
        }
        case 6: {
            if (isEmpty(j.fields[0])) {
                matchResult = 5;
            }
            else {
                matchResult = 7;
                kvs = j.fields[0];
            }
            break;
        }
        default:
            matchResult = 0;
    }
    switch (matchResult) {
        case 0:
            return "null";
        case 1:
            if (b) {
                return "true";
            }
            else {
                return "false";
            }
        case 2:
            return Py_number(j);
        case 3:
            return JSON.stringify(s);
        case 4:
            return "[]";
        case 5:
            return "{}";
        case 6:
            return ("[" + join(", ", map_2(Py_dumps, xs))) + "]";
        default:
            return ("{" + join(", ", map_2((tupledArg) => (((JSON.stringify(tupledArg[0])) + ": ") + Py_dumps(tupledArg[1])), kvs))) + "}";
    }
}

/**
 * json.dumps(j, indent=n, ensure_ascii=False).
 */
export function Py_dumpsIndented(n, j) {
    const go = (level, j_1) => {
        const pad = (l) => ("\n" + (Array((n * l) + 1).join(" ")));
        let matchResult, xs, kvs;
        switch (j_1.tag) {
            case 5: {
                if (isEmpty(j_1.fields[0])) {
                    matchResult = 0;
                }
                else {
                    matchResult = 1;
                    xs = j_1.fields[0];
                }
                break;
            }
            case 6: {
                if (isEmpty(j_1.fields[0])) {
                    matchResult = 0;
                }
                else {
                    matchResult = 2;
                    kvs = j_1.fields[0];
                }
                break;
            }
            default:
                matchResult = 3;
        }
        switch (matchResult) {
            case 0:
                return Py_dumps(j_1);
            case 1:
                return (("[" + join(",", map_2((x) => (pad(level + 1) + go(level + 1, x)), xs))) + pad(level)) + "]";
            case 2:
                return (("{" + join(",", map_2((tupledArg) => (((pad(level + 1) + (JSON.stringify(tupledArg[0]))) + ": ") + go(level + 1, tupledArg[1])), kvs))) + pad(level)) + "}";
            default:
                return Py_dumps(j_1);
        }
    };
    return go(0, j);
}

/**
 * repr() of a parsed JSON value, for messages.
 */
export function Py_repr(v) {
    const matchValue = Py_ofJs(v);
    switch (matchValue.tag) {
        case 0:
            return "None";
        case 1:
            if (matchValue.fields[0]) {
                return "True";
            }
            else {
                return "False";
            }
        case 4:
            return Py_strRepr(matchValue.fields[0]);
        default:
            return Py_dumps(matchValue);
    }
}

/**
 * str() of a parsed JSON value.
 */
export function Py_str(v) {
    const matchValue = Py_ofJs(v);
    if (matchValue.tag === 4) {
        return matchValue.fields[0];
    }
    else {
        return Py_repr(v);
    }
}

/**
 * Python truthiness of a parsed JSON value: null, false, 0, "", [] and {} are false.
 */
export function Py_truthy(v) {
    const matchValue = Py_ofJs(v);
    let matchResult, x;
    switch (matchValue.tag) {
        case 1: {
            matchResult = 1;
            break;
        }
        case 2: {
            matchResult = 2;
            x = matchValue.fields[0];
            break;
        }
        case 3: {
            matchResult = 2;
            x = matchValue.fields[0];
            break;
        }
        case 4: {
            matchResult = 3;
            break;
        }
        case 5: {
            matchResult = 4;
            break;
        }
        case 6: {
            matchResult = 5;
            break;
        }
        default:
            matchResult = 0;
    }
    switch (matchResult) {
        case 0:
            return false;
        case 1:
            return matchValue.fields[0];
        case 2:
            return x !== 0;
        case 3:
            return matchValue.fields[0] !== "";
        case 4:
            return !isEmpty(matchValue.fields[0]);
        default:
            return !isEmpty(matchValue.fields[0]);
    }
}

function fail(message) {
    eprint(message);
    return exit(1);
}

function group(m, i) {
    const g = m[i];
    if (Operators_IsNull(g)) {
        return undefined;
    }
    else {
        return g;
    }
}

function group0(m) {
    return value_8(group(m, 0));
}

function matchIndex(m) {
    return m.index | 0;
}

const FRAME = ~~(24000 / 30);

function timeAt(frame, pos) {
    return ((200 * frame) + (6 * Py_roundInt(((pos - (frame * FRAME)) * 1000) / 24000))) / 6000;
}

const GAP = 0.42;

const PART_GAP = 0.12;

const KOKORO_LANGS = ofSeq(["en-us", "en-gb", "fr-fr", "es", "it", "ja", "pt-br", "cmn", "hi"], {
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
});

const PRONOUNCE = new RegExp("\\[([^\\]]+)\\]\\(([^)]+)\\)", "g");

const FOREIGN = new RegExp("\\{([a-z]{2,3}):([^{}]+)\\}", "g");

const BREAK = new RegExp("\\s*\\[(pause|think)(?:\\s+(\\d+(?:\\.\\d+)?))?\\]", "g");

function breakDefault(kind) {
    if (kind === "pause") {
        return 1.5;
    }
    else {
        return 8;
    }
}

const REST = new RegExp("\\s*\\[rest(?:\\s+(\\d+(?:\\.\\d+)?))?\\]", "g");

const REST_DEFAULT = 0.35;

const NAME_PATTERN = "\\A[A-Za-z0-9][A-Za-z0-9_-]*\\Z";

const NAME = new RegExp("^[A-Za-z0-9][A-Za-z0-9_-]*$", "");

const ENDS_SENTENCE = new RegExp("[.!?]\\s*$", "");

const SENTENCE_SPLIT = new RegExp("(?<=[.!?\\x01])\\s+(?=[\"\'“A-Z0-9\\[\\x00])", "g");

const SHIELDED = new RegExp("\\x00(\\d+)[\\x00\\x01]", "g");

const LEADING_BREAKS = new RegExp("^(?:\\[(?:pause|think)(?:\\s+[\\d.]+)?\\]\\s*)+", "");

function cut(re, text) {
    const patternInput = mapFold((pos, m) => {
        const i = matchIndex(m) | 0;
        return [[substring(text, pos, i - pos), m], (i + group0(m).length) | 0];
    }, 0, ofArray(Array.from(text.matchAll(re))));
    return [patternInput[0], substring(text, patternInput[1])];
}

export function sentences(say) {
    const patternInput = cut(FOREIGN, say.trim());
    const found = patternInput[0];
    const shielded = toArray(map_2((arg) => group0(arg[1]), found));
    const marked = mapIndexed((n, tupledArg) => {
        const mark = (ENDS_SENTENCE.test(value_8(group(tupledArg[1], 2)))) ? "\u0001" : "\u0000";
        return ((tupledArg[0] + "\u0000") + int32ToString(n)) + mark;
    }, found);
    return reverse(fold((sofar, p) => {
        const m_3 = LEADING_BREAKS.exec(p);
        let matchResult, before_2, last_1;
        if (!isEmpty(sofar)) {
            if (!Operators_IsNull(m_3)) {
                matchResult = 0;
                before_2 = tail_1(sofar);
                last_1 = head(sofar);
            }
            else {
                matchResult = 1;
            }
        }
        else {
            matchResult = 1;
        }
        switch (matchResult) {
            case 0: {
                const p_1 = substring(p, group0(m_3).length).trim();
                const sofar_1 = cons((last_1 + " ") + group0(m_3).trim(), before_2);
                if (p_1 !== "") {
                    return cons(p_1, sofar_1);
                }
                else {
                    return sofar_1;
                }
            }
            default:
                if (p !== "") {
                    return cons(p, sofar);
                }
                else {
                    return sofar;
                }
        }
    }, empty(), map_2((raw_1) => (raw_1.replace(SHIELDED, (...a) => ((m_2) => item(parse_1(value_8(group(m_2, 1)), 511, false, 32), shielded))(a))).trim(), filter((raw) => (raw.trim() !== ""), ofArray((join("", marked) + patternInput[1]).split(SENTENCE_SPLIT))))));
}

/**
 * The silences a sentence asks for after it: [("pause", 1.5); ("think", 4.0)].
 */
export function breaks(s) {
    return toList(delay(() => map((m) => {
        let matchValue;
        const kind = value_8(group(m, 1));
        return [kind, (matchValue = group(m, 2), (matchValue == null) ? breakDefault(kind) : parse(matchValue))];
    }, Array.from(s.matchAll(BREAK)))));
}

/**
 * A sentence as the stretches between its [rest] marks, each with the silence that follows it (0 after the last).
 */
export function rests(s) {
    const patternInput = cut(REST, s);
    return append(map_2((tupledArg) => {
        let matchValue;
        return [tupledArg[0], (matchValue = group(tupledArg[1], 1), (matchValue == null) ? REST_DEFAULT : parse(matchValue))];
    }, patternInput[0]), singleton([patternInput[1], 0]));
}

export function shown(s) {
    const s_1 = (((s.replace(REST, '')).replace(BREAK, '')).replace(PRONOUNCE, (...a) => ((m) => value_8(group(m, 1)))(a))).replace(FOREIGN, (...a) => ((m_1) => value_8(group(m_1, 2)))(a));
    return s_1.trim();
}

export function spoken(s) {
    return (((s.replace(REST, '')).replace(BREAK, '')).replace(PRONOUNCE, (...a) => ((m) => value_8(group(m, 2)))(a))).trim();
}

/**
 * What the listener hears, as plain text: spoken forms, and {code:...} phrases without their braces.
 * Stage (src/Kit/Stage.fs) times words against this (Stage.word), so "86,400" is found where "eighty-six thousand" is said.
 */
export function heard(s) {
    return spoken(s).replace(FOREIGN, (...a) => ((m) => value_8(group(m, 2)))(a));
}

const LETTER_A = new RegExp("(?<![\\p{L}\\p{N}_\'’])A(?![\\p{L}\\p{N}_\'’])", "gu");

const SENTENCE_OPEN = new RegExp("(?:^|[.!?:;]\\s+|[\"“(]\\s*)$", "");

const NEXT_LETTER = new RegExp("^\\s+[A-Z](?:\'s|s)?(?![A-Za-z])", "");

/**
 * The text as sent to an English voice: letter "A" spelled so that it is said as a letter.
 */
export function voiced(text) {
    return text.replace(LETTER_A, (...a) => ((m) => {
        const start = item(m.length - 2, m) | 0;
        return (!(SENTENCE_OPEN.test(substring(text, 0, start))) ? true : (NEXT_LETTER.test(substring(text, start + 1)))) ? "eigh" : "A";
    })(a));
}

const WORD_CHAR = new RegExp("[\\p{L}\\p{N}_]", "u");

/**
 * (code or None, text) runs of a sentence: main-voice text and {code:...} phrases in order.
 */
export function pieces(sentence) {
    const patternInput = cut(FOREIGN, sentence);
    const tail = patternInput[1];
    return map_2((tupledArg_1) => [tupledArg_1[0], tupledArg_1[1].trim()], filter((tupledArg) => (WORD_CHAR.test(tupledArg[1])), toList(delay(() => append_1(collect((matchValue) => {
        const m = matchValue[1];
        const before = matchValue[0];
        return append_1((before !== "") ? singleton_1([undefined, before]) : empty_1(), delay(() => singleton_1([group(m, 1), value_8(group(m, 2))])));
    }, patternInput[0]), delay(() => ((tail !== "") ? singleton_1([undefined, tail]) : empty_1())))))));
}

/**
 * Silent clips hold each caption long enough to read: about 2.5 words a second, never under 2 s.
 */
export function readingTime(text) {
    return max(2, ((text.split(/\s+/).filter(w => w).length) / 2.5) + 0.8);
}

export function vttTime(t) {
    const h = Math.floor(t / 3600);
    const rem = t % 3600;
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return (((padLeft(int32ToString(~~h), 2, "0") + ":") + padLeft(int32ToString(~~m), 2, "0")) + ":") + padLeft(Py_toFixed(s, 3), 6, "0");
}

export const voicePackages = ofArray(["kokoro-js", "@echogarden/espeak-ng-emscripten"]);

export function packageInstalled(name) {
    return exists(join_1(ofArray([toolHome, "node", "node_modules", name, "package.json"])));
}

export function setupHint() {
    return `the tool is not set up yet: run: node ${join_1(ofArray([engineDir, "cli", "Cv.js"]))} setup (installs the Kokoro voice and puppeteer-core into ${toolHome})`;
}

/**
 * Exits 2 with the setup hint when a package is missing from the tool home.
 */
export function requirePackages(names) {
    if (exists_1((arg) => !packageInstalled(arg), names)) {
        eprint(setupHint());
        exit(2);
    }
}

function importFromHome(name) {
    const req = nodeModule.createRequire(join_1(ofArray([toolHome, "node", "package.json"])));
    const resolved = req.resolve(name);
    return import((url.pathToFileURL(resolved)).href);
}

const VOCAB = ofList(ofArray([[";", 1], [":", 2], [",", 3], [".", 4], ["!", 5], ["?", 6], ["—", 9], ["…", 10], ["\"", 11], ["(", 12], [")", 13], ["“", 14], ["”", 15], [" ", 16], ["̃", 17], ["ʣ", 18], ["ʥ", 19], ["ʦ", 20], ["ʨ", 21], ["ᵝ", 22], ["ꭧ", 23], ["A", 24], ["I", 25], ["O", 31], ["Q", 33], ["S", 35], ["T", 36], ["W", 39], ["Y", 41], ["ᵊ", 42], ["a", 43], ["b", 44], ["c", 45], ["d", 46], ["e", 47], ["f", 48], ["h", 50], ["i", 51], ["j", 52], ["k", 53], ["l", 54], ["m", 55], ["n", 56], ["o", 57], ["p", 58], ["q", 59], ["r", 60], ["s", 61], ["t", 62], ["u", 63], ["v", 64], ["w", 65], ["x", 66], ["y", 67], ["z", 68], ["ɑ", 69], ["ɐ", 70], ["ɒ", 71], ["æ", 72], ["β", 75], ["ɔ", 76], ["ɕ", 77], ["ç", 78], ["ɖ", 80], ["ð", 81], ["ʤ", 82], ["ə", 83], ["ɚ", 85], ["ɛ", 86], ["ɜ", 87], ["ɟ", 90], ["ɡ", 92], ["ɥ", 99], ["ɨ", 101], ["ɪ", 102], ["ʝ", 103], ["ɯ", 110], ["ɰ", 111], ["ŋ", 112], ["ɳ", 113], ["ɲ", 114], ["ɴ", 115], ["ø", 116], ["ɸ", 118], ["θ", 119], ["œ", 120], ["ɹ", 123], ["ɾ", 125], ["ɻ", 126], ["ʁ", 128], ["ɽ", 129], ["ʂ", 130], ["ʃ", 131], ["ʈ", 132], ["ʧ", 133], ["ʊ", 135], ["ʋ", 136], ["ʌ", 138], ["ɣ", 139], ["ɤ", 140], ["χ", 142], ["ʎ", 143], ["ʒ", 147], ["ʔ", 148], ["ˈ", 156], ["ˌ", 157], ["ː", 158], ["ʰ", 162], ["ʲ", 164], ["↓", 169], ["→", 171], ["↗", 172], ["↘", 173], ["ᵻ", 177]]), {
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
});

const MARKS = ";:,.!?¡¿—…\"«»“”(){}[]";

const MARKS_RE = new RegExp((("(\\s*[" + replace(replace(MARKS, "[", "\\["), "]", "\\]")) + "]+\\s*)+"), "g");

class MarkPosition extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Begin", "Inner", "End", "Alone"];
    }
    static Begin = new MarkPosition(0, []);
    static Inner = new MarkPosition(1, []);
    static End = new MarkPosition(2, []);
    static Alone = new MarkPosition(3, []);
}

function MarkPosition_$reflection() {
    return union_type("Narrate.MarkPosition", [], MarkPosition, () => [[], [], [], []]);
}

class Mark extends Record {
    constructor(line, mark, position) {
        super();
        this.line = (line | 0);
        this.mark = mark;
        this.position = position;
    }
}

function Mark_$reflection() {
    return record_type("Narrate.Mark", [], Mark, () => [["line", int32_type], ["mark", string_type], ["position", MarkPosition_$reflection()]]);
}

function preserveLine(line, num_1) {
    const matches = map_1(group0, Array.from(line.matchAll(MARKS_RE)));
    if (matches.length === 0) {
        return [singleton(line), empty()];
    }
    else if ((matches.length === 1) && (item(0, matches) === line)) {
        return [empty(), singleton(new Mark(num_1, line, MarkPosition.Alone))];
    }
    else {
        const last = (matches.length - 1) | 0;
        const marks = ofArray(mapIndexed_1((i, m_1) => (new Mark(num_1, m_1, ((i === 0) && line.startsWith(m_1)) ? MarkPosition.Begin : (((i === last) && line.endsWith(m_1)) ? MarkPosition.End : MarkPosition.Inner))), matches));
        const patternInput = mapFold((rest, mk) => {
            const split = split_1(rest, [mk.mark], undefined, 0);
            return [item(0, split), join(mk.mark, split.slice(1, split.length))];
        }, line, marks);
        return [append(patternInput[0], singleton(patternInput[1])), marks];
    }
}

function restore(text, marks) {
    const go = (out_mut, text_1_mut, marks_1_mut, pos_mut) => {
        go:
        while (true) {
            const out = out_mut, text_1 = text_1_mut, marks_1 = marks_1_mut, pos = pos_mut;
            if (!isEmpty(text_1)) {
                if (!isEmpty(marks_1)) {
                    if (head(marks_1).line === pos) {
                        const t0_2 = head(text_1).endsWith(" ") ? substring(head(text_1), 0, head(text_1).length - 1) : head(text_1);
                        const space = head(marks_1).mark.endsWith(" ") ? "" : " ";
                        const matchValue_1 = head(marks_1).position;
                        switch (matchValue_1.tag) {
                            case 2: {
                                out_mut = cons((t0_2 + head(marks_1).mark) + space, out);
                                text_1_mut = tail_1(text_1);
                                marks_1_mut = tail_1(marks_1);
                                pos_mut = (pos + 1);
                                continue go;
                            }
                            case 3: {
                                out_mut = cons(head(marks_1).mark + space, out);
                                text_1_mut = cons(t0_2, tail_1(text_1));
                                marks_1_mut = tail_1(marks_1);
                                pos_mut = (pos + 1);
                                continue go;
                            }
                            case 1:
                                if (!isEmpty(tail_1(text_1))) {
                                    out_mut = out;
                                    text_1_mut = cons((t0_2 + head(marks_1).mark) + head(tail_1(text_1)), tail_1(tail_1(text_1)));
                                    marks_1_mut = tail_1(marks_1);
                                    pos_mut = pos;
                                    continue go;
                                }
                                else {
                                    out_mut = out;
                                    text_1_mut = singleton(t0_2 + head(marks_1).mark);
                                    marks_1_mut = tail_1(marks_1);
                                    pos_mut = pos;
                                    continue go;
                                }
                            default: {
                                out_mut = out;
                                text_1_mut = cons(head(marks_1).mark + t0_2, tail_1(text_1));
                                marks_1_mut = tail_1(marks_1);
                                pos_mut = pos;
                                continue go;
                            }
                        }
                    }
                    else {
                        out_mut = cons(head(text_1), out);
                        text_1_mut = tail_1(text_1);
                        marks_1_mut = marks_1;
                        pos_mut = (pos + 1);
                        continue go;
                    }
                }
                else {
                    return append(reverse(map_2((l) => {
                        if (l.endsWith(" ")) {
                            return l;
                        }
                        else {
                            return l + " ";
                        }
                    }, text_1)), out);
                }
            }
            else if (isEmpty(marks_1)) {
                return out;
            }
            else {
                return cons(join("", map_2((m_1) => m_1.mark, marks_1)), out);
            }
            break;
        }
    };
    return reverse(go(empty(), text, marks, 0));
}

class Espeak extends Record {
    constructor(worker, heap, voices, current) {
        super();
        this.worker = worker;
        this.heap = heap;
        this.voices = voices;
        this.current = current;
    }
}

function Espeak_$reflection() {
    return record_type("Narrate.Espeak", [], Espeak, () => [["worker", obj_type], ["heap", lambda_type(unit_type, array_type(uint8_type))], ["voices", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [string_type, string_type])], ["current", string_type]]);
}

let espeakLoaded = undefined;

function espeak() {
    if (espeakLoaded == null) {
        const p_1 = PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (importFromHome("@echogarden/espeak-ng-emscripten").then((_arg) => ((_arg.default()).then((_arg_1) => {
            const instance = _arg_1;
            const worker = new instance.eSpeakNGWorker();
            const voices = ofArray_1(reverse_1(choose((v) => {
                const langs = v.languages;
                if (langs.length > 0) {
                    return [toString(item(0, langs).name), toString(v.identifier)];
                }
                else {
                    return undefined;
                }
            }, worker.list_voices())), {
                Compare: (x, y) => (comparePrimitives(x, y) | 0),
            });
            return Promise.resolve(new Espeak(worker, () => instance.HEAPU8, voices, ""));
        }))))));
        espeakLoaded = p_1;
        return p_1;
    }
    else {
        return espeakLoaded;
    }
}

function textToPhonemes(es, line) {
    let array;
    const ptr = (es.worker.text_to_phonemes(line, 1)).ptr | 0;
    const heap = es.heap();
    let e = ptr;
    while (item(e, heap) !== 0) {
        e = ((e + 1) | 0);
    }
    return join(" ", (array = split_1(new TextDecoder().decode(heap.subarray(ptr, e)), [" | "], undefined, 0), array.filter((c) => (c !== ""))));
}

function postprocessLine(line) {
    const line_1 = replace(replace(line.trim(), "\n", " "), "  ", " ");
    const line_2 = (line_1.replace((new RegExp("_+", "g")), (...a) => ((_arg) => "_")(a))).replace((new RegExp("_ ", "g")), (...a) => ((_arg_1) => " ")(a));
    if (line_2 === "") {
        return "";
    }
    else {
        return join("", map_1((w) => (replace(w.trim() + "_", "_", "") + " "), split_1(line_2, [" "], undefined, 0)));
    }
}

/**
 * Tokenizer.phonemize of kokoro-onnx: phonemizer.phonemize(text, lang, preserve_punctuation=True,
 * with_stress=True), then only the symbols in Kokoro's vocabulary.
 */
export function phonemize(text, lang) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (espeak().then((_arg) => {
        let matchValue, id;
        const es = _arg;
        return ((matchValue = FSharpMap__TryFind(es.voices, lang), (matchValue != null) ? ((id = matchValue, (es.current !== id) ? ((void (es.worker.set_voice(id)), (es.current = id, Promise.resolve()))) : (Promise.resolve()))) : (((() => {
            throw new Exception(concat("language \"", lang, "\" is not supported by the espeak backend"));
        })(), Promise.resolve())))).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
            let array_4;
            let lines;
            const array_1 = map_1((l) => trim(l, "\n"), split_1(trim(text.trim(), "\n"), ["\n"], undefined, 0));
            lines = array_1.filter((l_1) => (l_1.trim() !== ""));
            let patternInput;
            const tupledArg = unzip(ofArray(mapIndexed_1((num_1, line) => preserveLine(line, num_1), lines)));
            patternInput = [filter((c_1) => (c_1 !== ""), concat_1(tupledArg[0])), concat_1(tupledArg[1])];
            const phonemized = map_2((arg) => postprocessLine(textToPhonemes(es, arg)), patternInput[0]);
            const joined = (lines.length === 0) ? "" : join("\n", restore(phonemized, patternInput[1]));
            return Promise.resolve(join("", (array_4 = (Array.from(joined)), array_4.filter((key) => FSharpMap__ContainsKey(VOCAB, key)))).trim());
        }));
    }))));
}

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

const DTYPE = "fp32";

const MAX_PHONEMES = 510;

/**
 * Where transformers.js keeps the model: <tool home>/models.
 */
export function modelDir() {
    return join_1(ofArray([toolHome, "models"]));
}

/**
 * The model file once it is downloaded.
 */
export function modelFile() {
    return join_1(ofArray([modelDir(), "onnx-community", "Kokoro-82M-v1.0-ONNX", "onnx", "model.onnx"]));
}

export const workerThreads = node$003Aworker_threads;

function serveVoice() {
    const port = workerThreads.parentPort;
    const model = new Lazy(() => {
        const transformers = requireFromHome("@huggingface/transformers");
        transformers.env.cacheDir = modelDir();
        transformers.env.backends.onnx.logLevel = "error";
        const kokoro = requireFromHome("kokoro-js");
        const pr = kokoro.KokoroTTS.from_pretrained(MODEL, {
            dtype: DTYPE,
            device: "cpu",
        });
        return pr.then((tts) => [tts, transformers.Tensor]);
    });
    const queue = new FSharpRef(Promise.resolve(undefined));
    return port.on("message", ((msg_1) => {
        let pr_2;
        queue.contents = ((pr_2 = queue.contents, pr_2.then(() => {
            const msg = msg_1;
            const pr_1 = PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (model.Value.then((_arg) => {
                const input = new _arg[1]('int64', BigInt64Array.from(msg.ids, BigInt), [1, msg.ids.length]);
                return (_arg[0].generate_from_ids(input, {
                    voice: msg.voice,
                    speed: msg.speed,
                })).then((_arg_1) => {
                    const samples = _arg_1.audio;
                    port.postMessage({
                        id: msg.id,
                        audio: samples,
                    }, [samples.buffer]);
                    return Promise.resolve();
                });
            }))));
            return pr_1.catch((e) => {
                port.postMessage({
                    id: msg.id,
                    error: toString(e),
                });
            });
        })));
    }));
}

if ((!workerThreads.isMainThread && !Operators_IsNull(workerThreads.workerData)) && (workerThreads.workerData.kokoro === true)) {
    serveVoice();
}

class VoiceWorker extends Record {
    constructor(worker, pending, next) {
        super();
        this.worker = worker;
        this.pending = pending;
        this.next = (next | 0);
    }
}

function VoiceWorker_$reflection() {
    return record_type("Narrate.VoiceWorker", [], VoiceWorker, () => [["worker", obj_type], ["pending", class_type("System.Collections.Generic.Dictionary`2", [int32_type, tuple_type(lambda_type(array_type(float32_type), unit_type), lambda_type(class_type("System.Exception"), unit_type))])], ["next", int32_type]]);
}

let voiceWorker = undefined;

function voice() {
    if (voiceWorker == null) {
        const worker = new workerThreads.Worker((new url.URL(import.meta.url)), {
            workerData: {
                kokoro: true,
            },
        });
        const v_1 = new VoiceWorker(worker, new Map([]), 0);
        worker.on("message", ((msg) => {
            const id = msg.id | 0;
            let patternInput;
            let outArg = defaultOf();
            patternInput = [tryGetValue(v_1.pending, id, new FSharpRef(() => outArg, (v_2) => {
                outArg = v_2;
            })), outArg];
            if (patternInput[0]) {
                v_1.pending.delete(id);
                if (Operators_IsNull(msg.error)) {
                    patternInput[1][0](msg.audio);
                }
                else {
                    patternInput[1][1](new Exception(toString(msg.error)));
                }
            }
        }));
        worker.on("error", ((e) => {
            const enumerator = getEnumerator(ofSeq_1(v_1.pending));
            try {
                while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                    enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]()[1][1](new Exception(toString(e)));
                }
            }
            finally {
                disposeSafe(enumerator);
            }
            v_1.pending.clear();
        }));
        voiceWorker = v_1;
        return v_1;
    }
    else {
        return voiceWorker;
    }
}

function generate(ids, voiceName, speed) {
    const v = voice();
    return new Promise((resolve, reject) => {
        const id = v.next | 0;
        v.next = ((id + 1) | 0);
        v.pending.set(id, [resolve, reject]);
        v.worker.postMessage({
            id: id,
            ids: ids,
            voice: voiceName,
            speed: speed,
        });
    });
}

/**
 * Stops the model's worker thread, if it was started.
 */
export function release() {
    if (voiceWorker != null) {
        const v = voiceWorker;
        voiceWorker = undefined;
        const pr = v.worker.terminate();
        return pr.then((value) => {
        });
    }
    else {
        return Promise.resolve(undefined);
    }
}

function voiceFile(name) {
    const req = nodeModule.createRequire(join_1(ofArray([toolHome, "node", "package.json"])));
    return join_1(ofArray([dirname(req.resolve("kokoro-js")), "..", "voices", name + ".bin"]));
}

function foldP(step, state, items) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (!isEmpty(items) ? (step(state, head(items)).then((_arg) => (foldP(step, _arg, tail_1(items))))) : (Promise.resolve(state)))));
}

function splitPhonemes(phonemes) {
    let array_1;
    const patternInput = fold_1((tupledArg, part_1) => {
        const batches = tupledArg[0];
        const current = tupledArg[1];
        if ((((Array.from(current)).length + (Array.from(part_1)).length) + 1) >= MAX_PHONEMES) {
            return [cons(current.trim(), batches), part_1];
        }
        else if (".,!?;".indexOf(part_1) >= 0) {
            return [batches, current + part_1];
        }
        else {
            return [batches, ((current !== "") ? (current + " ") : current) + part_1];
        }
    }, [empty(), ""], (array_1 = map_1((raw) => raw.trim(), phonemes.split(new RegExp("([.,!?;])", ""))), array_1.filter((part) => (part !== ""))));
    const current_1 = patternInput[1];
    const batches_1 = patternInput[0];
    return reverse((current_1 !== "") ? cons(current_1.trim(), batches_1) : batches_1);
}

function create(phonemes, voiceName, speed) {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => ((!((speed >= 0.5) && (speed <= 2)) ? (((() => {
        throw new Exception("Speed should be between 0.5 and 2.0");
    })(), Promise.resolve())) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => ((!exists(voiceFile(voiceName)) ? (((() => {
        throw new Exception(concat("Voice ", voiceName, " not found in available voices"));
    })(), Promise.resolve())) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => (foldP((parts, batch) => PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const ids = choose((key) => FSharpMap__TryFind(VOCAB, key), truncate(MAX_PHONEMES, Array.from(batch)), Int32Array);
        return generate(concat_2([new Int32Array([0]), ids, new Int32Array([0])], Int32Array), voiceName, speed).then((_arg) => (Promise.resolve(cons(trim_1(_arg), parts))));
    })), empty(), splitPhonemes(phonemes)).then((_arg_1) => (Promise.resolve(concat_3(reverse(_arg_1))))))))))))));
}

/**
 * Voices a short phrase end to end (setup's check that the voice works).
 */
export function selfTest() {
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => (phonemize("Ready.", "en-us").then((_arg) => (create(_arg, "af_heart", 1).then((_arg_1) => (release().then(() => {
        if (_arg_1.length === 0) {
            throw new Exception("the voice produced no audio");
            return Promise.resolve();
        }
        else {
            return Promise.resolve();
        }
    }))))))));
}

class Audio extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Silence", "Speech"];
    }
}

function Audio_$reflection() {
    return union_type("Narrate.Audio", [], Audio, () => [[["Item", int32_type]], [["Item", array_type(float32_type)]]]);
}

class Part extends Record {
    constructor(text, spoken, lang, start, finish) {
        super();
        this.text = text;
        this.spoken = spoken;
        this.lang = lang;
        this.start = start;
        this.finish = finish;
    }
}

function Part_$reflection() {
    return record_type("Narrate.Part", [], Part, () => [["text", string_type], ["spoken", string_type], ["lang", Py_Json_$reflection()], ["start", float64_type], ["finish", float64_type]]);
}

class Sentence extends Record {
    constructor(text, spoken, start, finish, parts) {
        super();
        this.text = text;
        this.spoken = spoken;
        this.start = start;
        this.finish = finish;
        this.parts = parts;
    }
}

function Sentence_$reflection() {
    return record_type("Narrate.Sentence", [], Sentence, () => [["text", string_type], ["spoken", string_type], ["start", float64_type], ["finish", float64_type], ["parts", list_type(Part_$reflection())]]);
}

class Break extends Record {
    constructor(kind, sentence, start, finish) {
        super();
        this.kind = kind;
        this.sentence = (sentence | 0);
        this.start = start;
        this.finish = finish;
    }
}

function Break_$reflection() {
    return record_type("Narrate.Break", [], Break, () => [["kind", string_type], ["sentence", int32_type], ["start", float64_type], ["finish", float64_type]]);
}

class Scene extends Record {
    constructor(id, idJson, start, finish, sentences, extras) {
        super();
        this.id = id;
        this.idJson = idJson;
        this.start = start;
        this.finish = finish;
        this.sentences = sentences;
        this.extras = extras;
    }
}

function Scene_$reflection() {
    return record_type("Narrate.Scene", [], Scene, () => [["id", obj_type], ["idJson", Py_Json_$reflection()], ["start", float64_type], ["finish", float64_type], ["sentences", list_type(Sentence_$reflection())], ["extras", list_type(tuple_type(string_type, Py_Json_$reflection()))]]);
}

class Track extends Record {
    constructor(audio, pos, report) {
        super();
        this.audio = audio;
        this.pos = (pos | 0);
        this.report = report;
    }
}

function Track_$reflection() {
    return record_type("Narrate.Track", [], Track, () => [["audio", list_type(Audio_$reflection())], ["pos", int32_type], ["report", list_type(string_type)]]);
}

function samplesOf(piece) {
    if (piece.tag === 1) {
        return piece.fields[0].length | 0;
    }
    else {
        return piece.fields[0] | 0;
    }
}

function lay(piece, t) {
    return new Track(cons(piece, t.audio), t.pos + samplesOf(piece), t.report);
}

function silence(seconds, t) {
    return lay(new Audio(/* Silence */ 0, [Py_roundInt(seconds * 24000)]), t);
}

function now(frame, t) {
    return timeAt(frame, t.pos);
}

function num(x) {
    return new Py_Json(/* Float */ 3, [x]);
}

function sceneJson(s) {
    return new Py_Json(/* Obj */ 6, [append(ofArray([["id", s.idJson], ["start", num(s.start)], ["end", num(s.finish)], ["sentences", new Py_Json(/* List */ 5, [map_2((c) => (new Py_Json(/* Obj */ 6, [ofArray([["text", new Py_Json(/* Str */ 4, [c.text])], ["spoken", new Py_Json(/* Str */ 4, [c.spoken])], ["start", num(c.start)], ["end", num(c.finish)], ["parts", new Py_Json(/* List */ 5, [map_2((p) => (new Py_Json(/* Obj */ 6, [ofArray([["text", new Py_Json(/* Str */ 4, [p.text])], ["spoken", new Py_Json(/* Str */ 4, [p.spoken])], ["lang", p.lang], ["start", num(p.start)], ["end", num(p.finish)]])])), c.parts)])]])])), s.sentences)])]]), s.extras)]);
}

function get$(o, key) {
    const v = o[key];
    if ((typeof v) === "undefined") {
        return undefined;
    }
    else {
        return some(v);
    }
}

function getFloat(o, key, fallback) {
    const matchValue = get$(o, key);
    if (matchValue == null) {
        return fallback;
    }
    else {
        return value_8(matchValue);
    }
}

function soundtrack(audio) {
    const patternInput = mapFold((at, piece) => [[at, piece], (at + samplesOf(piece)) | 0], 0, audio);
    const out = new Float32Array(patternInput[1]);
    const enumerator = getEnumerator(patternInput[0]);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const piece_1 = forLoopVar[1];
            if (piece_1.tag === 1) {
                out.set(piece_1.fields[0], forLoopVar[0]);
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    return out;
}

function briefLength(ws) {
    const brief = join_1(ofArray([ws, "brief.json"]));
    if (exists(brief)) {
        const v = readJson(brief).length;
        if ((v === undefined || v === null)) {
            return "tour";
        }
        else {
            return toString(v);
        }
    }
    else {
        return "";
    }
}

export function run(ws) {
    let v_1, option_2;
    requirePackages(voicePackages);
    const clip = resolve_1(ws);
    const scriptText = readText(join_1(ofArray([clip, "script.json"])));
    const script = parseJson(scriptText);
    const marked = JSON.parse(scriptText, (k, v, c) => typeof v === 'number' && c && typeof c.source === 'string' && /[.eE]/.test(c.source) ? {__py_float__: v} : v);
    const name = script.name;
    if (!(((typeof name) === "string") && (NAME.test(name)))) {
        fail(`name ${Py_repr(name)} must match ${NAME_PATTERN} - it becomes the file name on the server`);
    }
    const name_1 = name;
    let voiceName;
    const matchValue = get$(script, "voice");
    voiceName = ((matchValue != null) ? (Py_truthy(value_8(matchValue)) ? ((v_1 = value_8(matchValue), v_1)) : undefined) : "af_heart");
    const lang = defaultArg(get$(script, "lang"), "en-us");
    const speed = getFloat(script, "speed", 1);
    const others = defaultArg((option_2 = get$(script, "voices"), (option_2 != null) ? (!Operators_IsNull(value_8(option_2)) ? option_2 : undefined) : undefined), {});
    let pronounce;
    const matchValue_1 = get$(script, "pronounce");
    let matchResult, p_1;
    if (matchValue_1 != null) {
        if (!Operators_IsNull(value_8(matchValue_1))) {
            matchResult = 0;
            p_1 = value_8(matchValue_1);
        }
        else {
            matchResult = 1;
        }
    }
    else {
        matchResult = 1;
    }
    switch (matchResult) {
        case 0: {
            pronounce = ofArray_1(map_1((k) => [k.trim(), p_1[k]], Object.keys(p_1)), {
                Compare: (x, y) => (comparePrimitives(x, y) | 0),
            });
            break;
        }
        default:
            pronounce = empty_2({
                Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
            });
    }
    const enumerator = getEnumerator(cons({
        voice: voiceName,
        lang: lang,
    }, toList(delay(() => map((k_1) => others[k_1], Object.keys(others))))));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const spec = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const lang_1 = spec.lang;
            if (Py_truthy(spec.voice) && !(((typeof lang_1) === "string") && FSharpSet__Contains(KOKORO_LANGS, lang_1))) {
                const can = join(", ", sort(toList_1(KOKORO_LANGS), {
                    Compare: (x_2, y_2) => (comparePrimitives(x_2, y_2) | 0),
                }));
                fail((`Kokoro cannot speak ${Py_repr(lang_1)} (it can: ${can}). `) + "Narrate in the learner\'s language, or set \"voice\": null for a captioned silent clip.");
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    const glossary = load(clip);
    const build = join_1(ofArray([clip, "build"]));
    const cache = join_1(ofArray([build, "tts-cache"]));
    mkdirp(cache);
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        const sceneObjs = script.scenes;
        const markedScenes_1 = marked.scenes;
        return foldP((tupledArg, tupledArg_1) => {
            const track = tupledArg[0];
            const finished = tupledArg[1];
            const sc = tupledArg_1[1];
            return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                const id = sc.id;
                return (exists_1((f) => (toJson(f.id) === toJson(id)), finished) ? ((fail(concat("duplicate scene id ", Py_repr(id))), Promise.resolve())) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                    let option_11, option_9;
                    const startFrame = ~~(track.pos / FRAME) | 0;
                    const track_1 = silence(getFloat(sc, "lead", 0.4), track);
                    const say_1 = apply(glossary, defaultArg((option_11 = ((option_9 = get$(sc, "say"), (option_9 != null) ? (!Operators_IsNull(value_8(option_9)) ? option_9 : undefined) : undefined)), (option_11 != null) ? value_8(option_11) : undefined), ""));
                    return foldP((tupledArg_4, tupledArg_5) => {
                        const track_6 = tupledArg_4[0];
                        const i_1 = tupledArg_5[0] | 0;
                        const s = tupledArg_5[1];
                        return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                            const track_7 = (i_1 > 0) ? silence(GAP, track_6) : track_6;
                            const sentenceStart = now(startFrame, track_7);
                            const after = breaks(s);
                            const s_1 = (s.replace(BREAK, '')).trim();
                            const voicedPieces = toList(delay(() => collect((matchValue_3) => {
                                const ps = pieces(matchValue_3[0]);
                                return collect((matchValue_4) => singleton_1([matchValue_4[1][0], matchValue_4[1][1], (matchValue_4[0] === (length(ps) - 1)) ? matchValue_3[1] : 0]), indexed(ps));
                            }, rests(s_1))));
                            return foldP((tupledArg_2, tupledArg_3) => {
                                const track_2 = tupledArg_2[0];
                                const _arg_4 = tupledArg_3[1];
                                const text_2 = _arg_4[1];
                                const code_3 = _arg_4[0];
                                return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                                    const track_3 = (tupledArg_3[0] > 0) ? silence(max(tupledArg_2[2], PART_GAP), track_2) : track_2;
                                    const partStart = now(startFrame, track_3);
                                    return ((voiceName != null) ? PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                                        let code_2, text, where;
                                        return ((code_2 = code_3, (text = spoken(text_2), (where = (`${Py_str(id)}[${i_1}]`), PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                                            let c;
                                            let patternInput;
                                            const code = code_2;
                                            if (code != null) {
                                                const code_1 = code;
                                                const matchValue_2 = get$(others, code_1);
                                                if (matchValue_2 == null) {
                                                    patternInput = fail(((("{" + code_1) + ":...} needs \"voices\": {\"") + code_1) + "\": {\"voice\": ..., \"lang\": ...}} in script.json");
                                                }
                                                else {
                                                    const spec_1 = value_8(matchValue_2);
                                                    patternInput = [spec_1.voice, spec_1.lang];
                                                }
                                            }
                                            else {
                                                patternInput = [value_8(voiceName), lang];
                                            }
                                            const v_2 = patternInput[0];
                                            const l = patternInput[1];
                                            let phonemes;
                                            let option_7;
                                            const option_5 = FSharpMap__TryFind(pronounce, text.trim());
                                            option_7 = ((option_5 != null) ? (Py_truthy(value_8(option_5)) ? option_5 : undefined) : undefined);
                                            phonemes = ((option_7 != null) ? toString(value_8(option_7)) : undefined);
                                            const text_1 = ((phonemes == null) && l.toLocaleLowerCase().startsWith("en")) ? voiced(text) : text;
                                            return ((code_2 == null) ? (Promise.resolve(undefined)) : ((c = code_2, PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
                                                let p_3;
                                                return ((phonemes == null) ? phonemize(text_1, l) : ((p_3 = phonemes, Promise.resolve(p_3)))).then((_arg) => {
                                                    const source = (phonemes != null) ? "pinned" : "auto";
                                                    return Promise.resolve(`${where}	${c}	${text_1}	${_arg}	${source}`);
                                                });
                                            }))))).then((_arg_1) => {
                                                let p_4;
                                                const path = join_1(ofArray([cache, substring(sha1Hex(toJson(["kokoro-js 1.2.1 fp32", v_2, l, speed, defaultArg(phonemes, text_1)])), 0, 16) + ".wav"]));
                                                return (!exists(path) ? (((phonemes == null) ? phonemize(text_1, l) : ((p_4 = phonemes, Promise.resolve(p_4)))).then((_arg_2) => (create(_arg_2, v_2, speed).then((_arg_3) => {
                                                    write(path + ".part", _arg_3);
                                                    rename(path + ".part", path);
                                                    return Promise.resolve();
                                                })))) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => (Promise.resolve([read(path), _arg_1]))));
                                            });
                                        })))))).then((_arg_5) => {
                                            const line_1 = _arg_5[1];
                                            const track_4 = (line_1 == null) ? track_3 : (new Track(track_3.audio, track_3.pos, cons(line_1, track_3.report)));
                                            return Promise.resolve(lay(new Audio(/* Speech */ 1, [_arg_5[0]]), track_4));
                                        });
                                    })) : (Promise.resolve(silence(readingTime(shown(text_2)), track_3)))).then((_arg_6) => {
                                        const track_5 = _arg_6;
                                        const part = new Part(shown(text_2), heard(text_2), (code_3 == null) ? Py_ofJs(lang) : (new Py_Json(/* Str */ 4, [code_3])), partStart, now(startFrame, track_5));
                                        return Promise.resolve([track_5, cons(part, tupledArg_2[1]), _arg_4[2]]);
                                    });
                                }));
                            }, [track_7, empty(), 0], indexed(voicedPieces)).then((_arg_7) => {
                                const track_8 = _arg_7[0];
                                const line_2 = new Sentence(shown(s_1), heard(s_1), sentenceStart, now(startFrame, track_8), reverse(_arg_7[1]));
                                const patternInput_1 = mapFold((track_9, tupledArg_6) => {
                                    const breakStart = now(startFrame, track_9);
                                    const track_10 = silence(tupledArg_6[1], track_9);
                                    return [new Break(tupledArg_6[0], i_1, breakStart, now(startFrame, track_10)), track_10];
                                }, track_8, after);
                                return Promise.resolve([patternInput_1[1], cons(line_2, tupledArg_4[1]), append(reverse(patternInput_1[0]), tupledArg_4[2])]);
                            });
                        }));
                    }, [track_1, empty(), empty()], indexed(sentences(say_1))).then((_arg_8) => {
                        const sceneBreaks_1 = _arg_8[2];
                        const lines_1 = _arg_8[1];
                        const track_13 = silence(getFloat(sc, "hold", 0) + getFloat(sc, "pad", isEmpty(lines_1) ? 0 : 0.9), _arg_8[0]);
                        const over = (track_13.pos % FRAME) | 0;
                        const track_14 = ((over !== 0) ? true : (track_13.pos === (startFrame * FRAME))) ? lay(new Audio(/* Silence */ 0, [FRAME - over]), track_13) : track_13;
                        const endFrame = ~~(track_14.pos / FRAME) | 0;
                        const msc = item(tupledArg_1[0], markedScenes_1);
                        const passthrough = (key_1) => {
                            const matchValue_5 = get$(sc, key_1);
                            let matchResult_1, v_5;
                            if (matchValue_5 != null) {
                                if (Py_truthy(value_8(matchValue_5))) {
                                    matchResult_1 = 0;
                                    v_5 = value_8(matchValue_5);
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
                                    return singleton([key_1, Py_ofJs(msc[key_1])]);
                                default:
                                    return empty();
                            }
                        };
                        const timed = new Scene(id, Py_ofJs(msc.id), startFrame / 30, endFrame / 30, reverse(lines_1), append(passthrough("chapter"), append(passthrough("toasts"), append(isEmpty(sceneBreaks_1) ? empty() : singleton(["breaks", new Py_Json(/* List */ 5, [toList(delay(() => map((b_1) => {
                            const b = b_1;
                            return new Py_Json(/* Obj */ 6, [ofArray([["kind", new Py_Json(/* Str */ 4, [b.kind])], ["sentence", new Py_Json(/* Int */ 2, [b.sentence])], ["start", num(b.start)], ["end", num(b.finish)]])]);
                        }, reverse(sceneBreaks_1))))])]), append(passthrough("recap"), append(passthrough("path"), passthrough("inside")))))));
                        return Promise.resolve([track_14, cons(timed, finished)]);
                    });
                }));
            }));
        }, [new Track(empty(), 0, empty()), empty()], toList(delay(() => map((si_1) => [si_1, item(si_1, sceneObjs)], rangeDouble(0, 1, sceneObjs.length - 1))))).then((_arg_9) => {
            const track_15 = _arg_9[0];
            return release().then(() => {
                let ps_2, ps_3, matchValue_8, matchValue_9, matchValue_10, c_3, asked, on, total, label, matchValue_11, k_4, matchValue_12, m_1;
                const duration = ~~(track_15.pos / FRAME) / 30;
                write(join_1(ofArray([build, "narration.wav"])), soundtrack(reverse(track_15.audio)));
                const scenes = reverse(_arg_9[1]);
                let posterId;
                const matchValue_6 = get$(script, "poster");
                let matchResult_2, p_6;
                if (matchValue_6 != null) {
                    if (Py_truthy(value_8(matchValue_6))) {
                        matchResult_2 = 0;
                        p_6 = value_8(matchValue_6);
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
                        posterId = p_6;
                        break;
                    }
                    default:
                        posterId = ((length(scenes) > 1) ? item_1(1, scenes) : item_1(0, scenes)).id;
                }
                let poster;
                const matchValue_7 = tryFind((s_2) => (toJson(s_2.id) === toJson(posterId)), scenes);
                poster = ((matchValue_7 != null) ? (isEmpty(matchValue_7.sentences) ? ((ps_2 = matchValue_7, ps_2.finish - 0.1)) : ((ps_3 = matchValue_7, last_2(ps_3.sentences).finish))) : fail(concat("poster scene ", Py_repr(posterId), " not found")));
                const timing = new Py_Json(/* Obj */ 6, [append(ofArray([["name", new Py_Json(/* Str */ 4, [name_1])], ["title", (matchValue_8 = get$(script, "title"), (matchValue_8 == null) ? (new Py_Json(/* Str */ 4, [""])) : Py_ofJs(value_8(matchValue_8)))], ["voiced", new Py_Json(/* Bool */ 1, [voiceName != null])], ["captions", new Py_Json(/* Bool */ 1, [(matchValue_9 = get$(script, "captions"), (matchValue_9 == null) ? false : Py_truthy(value_8(matchValue_9)))])], ["duration", num(duration)], ["poster", num(Py_round(poster, 3))], ["scenes", new Py_Json(/* List */ 5, [map_2(sceneJson, scenes)])]]), append((matchValue_10 = get$(script, "card"), (matchValue_10 != null) ? (Py_truthy(value_8(matchValue_10)) ? ((c_3 = value_8(matchValue_10), (asked = c_3.thumbnail, (on = (((asked === undefined || asked === null)) ? (briefLength(ws) === "short") : Py_truthy(asked)), (total = (~~round(duration) | 0), (label = (`${~~(total / 60)}:${padLeft(int32ToString(total % 60), 2, "0")}`), singleton(["card", Py_ofJs(Object.assign({}, marked.card, { thumbnail: (on && label) }))]))))))) : empty()) : empty()), append((matchValue_11 = get$(script, "kind"), (matchValue_11 != null) ? (Py_truthy(value_8(matchValue_11)) ? ((k_4 = value_8(matchValue_11), singleton(["kind", Py_ofJs(k_4)]))) : empty()) : empty()), (matchValue_12 = get$(script, "map"), (matchValue_12 != null) ? (Py_truthy(value_8(matchValue_12)) ? ((m_1 = value_8(matchValue_12), singleton(["map", Py_ofJs(m_1)]))) : empty()) : empty()))))]);
                writeText(join_1(ofArray([build, "timing.json"])), Py_dumpsIndented(2, timing));
                writeText(join_1(ofArray([build, "timing.js"])), ("window.TIMING = " + Py_dumps(timing)) + ";\n");
                const cues = toList(delay(() => append_1(singleton_1("WEBVTT"), delay(() => append_1(singleton_1(""), delay(() => collect((s_4) => collect((c_4) => append_1(singleton_1(concat(vttTime(c_4.start), " --> ", vttTime(c_4.finish))), delay(() => append_1(singleton_1(c_4.text), delay(() => singleton_1(""))))), s_4.sentences), scenes)))))));
                writeText(join_1(ofArray([build, "captions.vtt"])), join("\n", cues));
                writeText(join_1(ofArray([build, "phonemes.txt"])), ("where\tvoice\tphrase\tphonemes\tsource\n" + join("\n", reverse(track_15.report))) + (isEmpty(track_15.report) ? "" : "\n"));
                const words = sumBy((s_5) => (sumBy((c_5) => ((c_5.text.split(/\s+/).filter(w => w).length) | 0), s_5.sentences, {
                    GetZero: () => 0,
                    Add: (x_3, y_3) => ((x_3 + y_3) | 0),
                }) | 0), scenes, {
                    GetZero: () => 0,
                    Add: (x_4, y_4) => ((x_4 + y_4) | 0),
                }) | 0;
                const arg_2 = `${name_1}: ${Py_toFixed(duration, 1)}s, ${length(scenes)} scenes, ${words} words, poster at ${Py_toFixed(poster, 1)}s`;
                toConsole(printf("%s"))(arg_2);
                return PromiseBuilder__For_1565554B(promise, scenes, (_arg_11) => {
                    const s_6 = _arg_11;
                    const arg_3 = `  ${padRight(Py_str(s_6.id), 14)} ${padLeft(Py_toFixed(s_6.start, 1), 6)} - ${padLeft(Py_toFixed(s_6.finish, 1), 6)}  (${length(s_6.sentences)} sentences)`;
                    toConsole(printf("%s"))(arg_3);
                    return Promise.resolve();
                }).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
                    if (!isEmpty(track_15.report)) {
                        const arg_4 = `  ${length(track_15.report)} phrase(s) in another voice - check build/phonemes.txt against the lesson`;
                        toConsole(printf("%s"))(arg_4);
                        return Promise.resolve();
                    }
                    else {
                        return Promise.resolve();
                    }
                }));
            });
        });
    }));
}

