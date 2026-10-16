
import { read, write, concat as concat_3, trim as trim_1, roundHalfEven } from "./Wav.js";
import { max, isNegativeInfinity, isPositiveInfinity, parse } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { toConsole, concat as concat_1, trim, padLeft, printf, toText, join, substring, padRight, replace, split as split_1 } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { concat as concat_2, truncate, fold as fold_1, choose, reverse as reverse_1, mapIndexed as mapIndexed_1, map as map_1, item, equalsWith } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { createObj, equals, round, disposeSafe, getEnumerator, Lazy, Exception, comparePrimitives, int32ToString, defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { op_UnaryNegation_Int32, parse as parse_1 } from "./fable_modules/fable-library-js.5.19.0/Int32.js";
import { exists as exists_2, empty as empty_1, singleton as singleton_1, collect, append as append_1, delay, toList, map } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { toString, Record, Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { option_type, float32_type, class_type, lambda_type, array_type, uint8_type, unit_type, obj_type, record_type, int32_type, union_type, tuple_type, list_type, string_type, float64_type, bool_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { tryPick, iterate, sumBy, last as last_2, tryFind, item as item_1, length, indexed, sort, concat, unzip, exists as exists_1, singleton, append, filter, empty, head, tail as tail_1, cons, fold, reverse, mapIndexed, toArray, mapFold, isEmpty, map as map_2, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { toArray as toArray_1, defaultArg, some, value as value_19 } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { FSharpSet__Contains, empty as empty_3, FSharpSet__get_Count, FSharpSet__get_IsEmpty, FSharpSet__Add, toList as toList_1, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { mkdirp, parseJson, readText, resolve, closingOnError, writeText, rename, toJson, sha1Hex, readJson, dirname, requireFromHome, deliver, url, fromJs, nodeModule, engineDir, toolHome, join as join_1, exists } from "./Node.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { FSharpMap__Remove, FSharpMap__Add, empty as empty_2, FSharpMap__TryFind, FSharpMap__ContainsKey, ofArray as ofArray_1, ofList } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { singleton as singleton_2 } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";
import { post, postAndAsyncReply, receive, start as start_1 } from "./fable_modules/fable-library-js.5.19.0/MailboxProcessor.js";
import * as node$003Aworker_threads from "node:worker_threads";
import { Choice, check, choose as choose_1, Provider, providerName, pieceKey, Voice, Choice_$reflection, describe as describe_1, Failure_$reflection as Failure_$reflection_1 } from "./Voice.js";
import { load as load_1, apply, Glossary_$reflection } from "./Glossary.js";
import { ResultCE_result, ResultCE_ResultBuilder__Zero } from "./fable_modules/FsToolkit.ErrorHandling.5.2.0/ResultCE.fs.js";
import { speak as speak_1 } from "./VoiceCloud.js";
import { ResultCE_result as ResultCE_result_1, ResultCE_ResultBuilder__Zero as ResultCE_ResultBuilder__Zero_1 } from "./fable_modules/FsToolkit.ErrorHandling.5.2.0/ResultCE.fs.js";
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
    return value_19(group(m, 0));
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
        const mark = (ENDS_SENTENCE.test(value_19(group(tupledArg[1], 2)))) ? "\u0001" : "\u0000";
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
    }, empty(), map_2((raw_1) => (raw_1.replace(SHIELDED, (...a) => ((m_2) => item(parse_1(value_19(group(m_2, 1)), 511, false, 32), shielded))(a))).trim(), filter((raw) => (raw.trim() !== ""), ofArray((join("", marked) + patternInput[1]).split(SENTENCE_SPLIT))))));
}

/**
 * The silences a sentence asks for after it: [("pause", 1.5); ("think", 4.0)].
 */
export function breaks(s) {
    return toList(delay(() => map((m) => {
        let matchValue;
        const kind = value_19(group(m, 1));
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
    const s_1 = (((s.replace(REST, '')).replace(BREAK, '')).replace(PRONOUNCE, (...a) => ((m) => value_19(group(m, 1)))(a))).replace(FOREIGN, (...a) => ((m_1) => value_19(group(m_1, 2)))(a));
    return s_1.trim();
}

export function spoken(s) {
    return (((s.replace(REST, '')).replace(BREAK, '')).replace(PRONOUNCE, (...a) => ((m) => value_19(group(m, 2)))(a))).trim();
}

/**
 * What the listener hears, as plain text: spoken forms, and {code:...} phrases without their braces.
 * Stage (src/Kit/Stage.fs) times words against this (Stage.word), so "86,400" is found where "eighty-six thousand" is said.
 */
export function heard(s) {
    return spoken(s).replace(FOREIGN, (...a) => ((m) => value_19(group(m, 2)))(a));
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
        return append_1((before !== "") ? singleton_1([undefined, before]) : empty_1(), delay(() => singleton_1([group(m, 1), value_19(group(m, 2))])));
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
 * The setup hint as the error when a package is missing from the tool home.
 */
export function requirePackages(names) {
    if (exists_1((arg) => !packageInstalled(arg), names)) {
        return new FSharpResult$2(/* Error */ 1, [setupHint()]);
    }
    else {
        return new FSharpResult$2(/* Ok */ 0, [undefined]);
    }
}

function importFromHome(name) {
    const req = nodeModule.createRequire(join_1(ofArray([toolHome, "node", "package.json"])));
    const resolved = req.resolve(name);
    return fromJs(import((url.pathToFileURL(resolved)).href));
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
    constructor(worker, heap, voices) {
        super();
        this.worker = worker;
        this.heap = heap;
        this.voices = voices;
    }
}

function Espeak_$reflection() {
    return record_type("Narrate.Espeak", [], Espeak, () => [["worker", obj_type], ["heap", lambda_type(unit_type, array_type(uint8_type))], ["voices", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [string_type, string_type])]]);
}

class EspeakState extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["NotLoaded", "Loaded", "LoadFailed"];
    }
    static NotLoaded = new EspeakState(0, []);
}

function EspeakState_$reflection() {
    return union_type("Narrate.EspeakState", [], EspeakState, () => [[], [["Item1", Espeak_$reflection()], ["voice", string_type]], [["Item", class_type("System.Exception")]]]);
}

class EspeakMsg extends Union {
    constructor(text, lang, Item3) {
        super();
        this.tag = 0;
        this.fields = [text, lang, Item3];
    }
    cases() {
        return ["Phonemize"];
    }
}

function EspeakMsg_$reflection() {
    return union_type("Narrate.EspeakMsg", [], EspeakMsg, () => [[["text", string_type], ["lang", string_type], ["Item3", class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [union_type("Microsoft.FSharp.Core.FSharpResult`2", [string_type, class_type("System.Exception")], FSharpResult$2, () => [[["ResultValue", string_type]], [["ErrorValue", class_type("System.Exception")]]])])]]]);
}

function load() {
    return singleton_2.Delay(() => singleton_2.TryWith(singleton_2.Delay(() => singleton_2.Bind(importFromHome("@echogarden/espeak-ng-emscripten"), (_arg) => singleton_2.Bind(fromJs(_arg.default()), (_arg_1) => {
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
        return singleton_2.Return(new EspeakState(/* Loaded */ 1, [new Espeak(worker, () => instance.HEAPU8, voices), ""]));
    }))), (_arg_2) => singleton_2.Return(new EspeakState(/* LoadFailed */ 2, [_arg_2]))));
}

function nulAt(heap, start) {
    const go = (e_mut) => {
        go:
        while (true) {
            const e = e_mut;
            if (item(e, heap) !== 0) {
                e_mut = ((e + 1) | 0);
                continue go;
            }
            else {
                return e | 0;
            }
            break;
        }
    };
    return go(start) | 0;
}

function textToPhonemes(es, line) {
    let array;
    const ptr = (es.worker.text_to_phonemes(line, 1)).ptr | 0;
    const heap = es.heap();
    return join(" ", (array = split_1(new TextDecoder().decode(heap.subarray(ptr, nulAt(heap, ptr))), [" | "], undefined, 0), array.filter((c) => (c !== ""))));
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

function phonemesOf(es, text) {
    let array_4;
    let lines;
    const array_1 = map_1((l) => trim(l, "\n"), split_1(trim(text.trim(), "\n"), ["\n"], undefined, 0));
    lines = array_1.filter((l_1) => (l_1.trim() !== ""));
    let patternInput;
    const tupledArg = unzip(ofArray(mapIndexed_1((num_1, line) => preserveLine(line, num_1), lines)));
    patternInput = [filter((c_1) => (c_1 !== ""), concat(tupledArg[0])), concat(tupledArg[1])];
    const phonemized = map_2((arg) => postprocessLine(textToPhonemes(es, arg)), patternInput[0]);
    const joined = (lines.length === 0) ? "" : join("\n", restore(phonemized, patternInput[1]));
    return join("", (array_4 = (Array.from(joined)), array_4.filter((key) => FSharpMap__ContainsKey(VOCAB, key)))).trim();
}

function attempt(f) {
    try {
        return new FSharpResult$2(/* Ok */ 0, [f()]);
    }
    catch (e) {
        return new FSharpResult$2(/* Error */ 1, [e]);
    }
}

function speak(es, voice, text, lang) {
    const matchValue = attempt(() => FSharpMap__TryFind(es.voices, lang));
    if (matchValue.tag === 0) {
        if (matchValue.fields[0] != null) {
            const id = matchValue.fields[0];
            const matchValue_1 = attempt(() => {
                if (voice !== id) {
                    es.worker.set_voice(id);
                }
            });
            if (matchValue_1.tag === 0) {
                return [id, attempt(() => phonemesOf(es, text))];
            }
            else {
                return [voice, new FSharpResult$2(/* Error */ 1, [matchValue_1.fields[0]])];
            }
        }
        else {
            return [voice, new FSharpResult$2(/* Error */ 1, [new Exception(concat_1("language \"", lang, "\" is not supported by the espeak backend"))])];
        }
    }
    else {
        return [voice, new FSharpResult$2(/* Error */ 1, [matchValue.fields[0]])];
    }
}

function handleEspeak(state, text, lang) {
    return singleton_2.Delay(() => {
        switch (state.tag) {
            case 2:
                return singleton_2.Return([state, new FSharpResult$2(/* Error */ 1, [state.fields[0]])]);
            case 1: {
                const es = state.fields[0];
                return singleton_2.TryWith(singleton_2.Delay(() => {
                    const patternInput = speak(es, state.fields[1], text, lang);
                    return singleton_2.Return([new EspeakState(/* Loaded */ 1, [es, patternInput[0]]), patternInput[1]]);
                }), (_arg_1) => singleton_2.Return([state, new FSharpResult$2(/* Error */ 1, [_arg_1])]));
            }
            default:
                return singleton_2.Bind(load(), (_arg) => singleton_2.ReturnFrom(handleEspeak(_arg, text, lang)));
        }
    });
}

const espeakAgent = start_1((inbox) => {
    const loop = (state) => singleton_2.Delay(() => singleton_2.Bind(receive(inbox), (_arg) => singleton_2.Bind(handleEspeak(state, _arg.fields[0], _arg.fields[1]), (_arg_1) => {
        deliver(singleton(() => {
            _arg.fields[2].reply(_arg_1[1]);
        }));
        return singleton_2.ReturnFrom(loop(_arg_1[0]));
    })));
    return loop(EspeakState.NotLoaded);
});

/**
 * Tokenizer.phonemize of kokoro-onnx: the phonemes of a text in a language ("en-us", "fr-fr"). Raises what went
 * wrong: the module's failed load, a language eSpeak does not know, or eSpeak's own error.
 */
export function phonemize(text, lang) {
    return singleton_2.Delay(() => singleton_2.Bind(postAndAsyncReply(espeakAgent, (reply) => (new EspeakMsg(text, lang, reply))), (_arg) => ((_arg.tag === 1) ? singleton_2.Return((() => {
        throw _arg.fields[0];
    })()) : singleton_2.Return(_arg.fields[0]))));
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
        const pretrained = kokoro.KokoroTTS.from_pretrained(MODEL, {
            dtype: DTYPE,
            device: "cpu",
        });
        return pretrained.then((tts) => [tts, transformers.Tensor]);
    });
    const agent = start_1((inbox) => {
        const loop = () => singleton_2.Delay(() => singleton_2.Bind(receive(inbox), (_arg_4) => {
            let msg;
            return singleton_2.Bind((msg = _arg_4, singleton_2.Delay(() => singleton_2.TryWith(singleton_2.Delay(() => singleton_2.Bind(fromJs(model.Value), (_arg) => {
                const input = new _arg[1]('int64', BigInt64Array.from(msg.ids, BigInt), [1, msg.ids.length]);
                return singleton_2.Bind(fromJs(_arg[0].generate_from_ids(input, {
                    voice: msg.voice,
                    speed: msg.speed,
                })), (_arg_1) => {
                    const samples = _arg_1.audio;
                    port.postMessage({
                        id: msg.id,
                        audio: samples,
                    }, [samples.buffer]);
                    return singleton_2.Zero();
                });
            })), (_arg_2) => singleton_2.TryWith(singleton_2.Delay(() => {
                port.postMessage({
                    id: msg.id,
                    error: toString(_arg_2),
                });
                return singleton_2.Zero();
            }), (_arg_3) => {
                void Promise.reject(_arg_3);
                return singleton_2.Zero();
            })))), () => singleton_2.ReturnFrom(loop()));
        }));
        return loop();
    });
    return port.on("message", ((msg_2) => {
        post(agent, msg_2);
    }));
}

if ((!workerThreads.isMainThread && !Operators_IsNull(workerThreads.workerData)) && (workerThreads.workerData.kokoro === true)) {
    serveVoice();
}

class VoiceMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Generate", "Reply", "Crashed", "Stop"];
    }
}

function VoiceMsg_$reflection() {
    return union_type("Narrate.VoiceMsg", [], VoiceMsg, () => [[["Item1", array_type(int32_type)], ["Item2", string_type], ["Item3", float64_type], ["Item4", class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [union_type("Microsoft.FSharp.Core.FSharpResult`2", [array_type(float32_type), string_type], FSharpResult$2, () => [[["ResultValue", array_type(float32_type)]], [["ErrorValue", string_type]]])])]], [["id", int32_type], ["Item2", union_type("Microsoft.FSharp.Core.FSharpResult`2", [array_type(float32_type), string_type], FSharpResult$2, () => [[["ResultValue", array_type(float32_type)]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [unit_type])]]]);
}

class VoiceState extends Record {
    constructor(Worker$, Next, Pending) {
        super();
        this.Worker = Worker$;
        this.Next = (Next | 0);
        this.Pending = Pending;
    }
}

function VoiceState_$reflection() {
    return record_type("Narrate.VoiceState", [], VoiceState, () => [["Worker", option_type(obj_type)], ["Next", int32_type], ["Pending", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [int32_type, class_type("Microsoft.FSharp.Control.FSharpAsyncReplyChannel`1", [union_type("Microsoft.FSharp.Core.FSharpResult`2", [array_type(float32_type), string_type], FSharpResult$2, () => [[["ResultValue", array_type(float32_type)]], [["ErrorValue", string_type]]])])])]]);
}

const noWorker = new VoiceState(undefined, 0, empty_2({
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
}));

function startWorker(agent) {
    const worker = new workerThreads.Worker((new url.URL(import.meta.url)), {
        workerData: {
            kokoro: true,
        },
    });
    worker.on("message", ((msg) => {
        post(agent, new VoiceMsg(/* Reply */ 1, [msg.id, Operators_IsNull(msg.error) ? (new FSharpResult$2(/* Ok */ 0, [msg.audio])) : (new FSharpResult$2(/* Error */ 1, [toString(msg.error)]))]));
    }));
    worker.on("error", ((e) => {
        post(agent, new VoiceMsg(/* Crashed */ 2, [toString(e)]));
    }));
    return worker;
}

function failAll(pending, text) {
    return toList(delay(() => collect((matchValue) => singleton_1(() => {
        matchValue[1].reply(new FSharpResult$2(/* Error */ 1, [text]));
    }), pending)));
}

function send(agent, state, ids, voiceName, speed, reply) {
    const matchValue_1 = attempt(() => {
        const matchValue = state.Worker;
        return (matchValue == null) ? startWorker(agent) : value_19(matchValue);
    });
    if (matchValue_1.tag === 0) {
        const worker = matchValue_1.fields[0];
        const id = state.Next | 0;
        const state_1 = new VoiceState(some(worker), (id + 1) | 0, state.Pending);
        const request = {
            id: id,
            ids: ids,
            voice: voiceName,
            speed: speed,
        };
        const matchValue_2 = attempt(() => {
            worker.postMessage(request);
        });
        if (matchValue_2.tag === 1) {
            return [state_1, singleton(() => {
                reply.reply(new FSharpResult$2(/* Error */ 1, [toString(matchValue_2.fields[0])]));
            })];
        }
        else {
            return [new VoiceState(state_1.Worker, state_1.Next, FSharpMap__Add(state_1.Pending, id, reply)), empty()];
        }
    }
    else {
        return [state, singleton(() => {
            reply.reply(new FSharpResult$2(/* Error */ 1, [toString(matchValue_1.fields[0])]));
        })];
    }
}

function handleVoice(agent, state, msg) {
    return singleton_2.Delay(() => singleton_2.TryWith(singleton_2.Delay(() => {
        switch (msg.tag) {
            case 1: {
                const id = msg.fields[0] | 0;
                const matchValue = FSharpMap__TryFind(state.Pending, id);
                if (matchValue == null) {
                    return singleton_2.Return([state, empty()]);
                }
                else {
                    const reply_1 = matchValue;
                    return singleton_2.Return([new VoiceState(state.Worker, state.Next, FSharpMap__Remove(state.Pending, id)), singleton(() => {
                        reply_1.reply(msg.fields[1]);
                    })]);
                }
            }
            case 2:
                return singleton_2.Return([new VoiceState(state.Worker, state.Next, empty_2({
                    Compare: (x, y) => (comparePrimitives(x, y) | 0),
                })), failAll(state.Pending, msg.fields[0])]);
            case 3: {
                const reply_2 = msg.fields[0];
                const matchValue_1 = state.Worker;
                if (matchValue_1 != null) {
                    const worker = value_19(matchValue_1);
                    return singleton_2.Bind(fromJs(worker.terminate()), (_arg) => singleton_2.Return([noWorker, append(failAll(state.Pending, "the voice was released before it answered"), singleton(() => {
                        reply_2.reply(undefined);
                    }))]));
                }
                else {
                    return singleton_2.Return([state, singleton(() => {
                        reply_2.reply(undefined);
                    })]);
                }
            }
            default:
                return singleton_2.Return(send(agent, state, msg.fields[0], msg.fields[1], msg.fields[2], msg.fields[3]));
        }
    }), (_arg_1) => {
        const e = _arg_1;
        switch (msg.tag) {
            case 3:
                return singleton_2.Return([noWorker, append(failAll(state.Pending, toString(e)), singleton(() => {
                    msg.fields[0].reply(undefined);
                }))]);
            case 1:
            case 2:
                return singleton_2.Return([state, empty()]);
            default:
                return singleton_2.Return([state, singleton(() => {
                    msg.fields[3].reply(new FSharpResult$2(/* Error */ 1, [toString(e)]));
                })]);
        }
    }));
}

const voiceAgent = start_1((inbox) => {
    const loop = (state) => singleton_2.Delay(() => singleton_2.Bind(receive(inbox), (_arg) => singleton_2.Bind(handleVoice(inbox, state, _arg), (_arg_1) => {
        deliver(_arg_1[1]);
        return singleton_2.ReturnFrom(loop(_arg_1[0]));
    })));
    return loop(noWorker);
});

function generate(ids, voiceName, speed) {
    return singleton_2.Delay(() => singleton_2.Bind(postAndAsyncReply(voiceAgent, (reply) => (new VoiceMsg(/* Generate */ 0, [ids, voiceName, speed, reply]))), (_arg) => ((_arg.tag === 1) ? singleton_2.Return((() => {
        throw new Exception(_arg.fields[0]);
    })()) : singleton_2.Return(_arg.fields[0]))));
}

/**
 * Stops the model's worker thread, if it was started.
 */
export function release() {
    return singleton_2.Delay(() => singleton_2.ReturnFrom(postAndAsyncReply(voiceAgent, (Item) => (new VoiceMsg(/* Stop */ 3, [Item])))));
}

function voiceFile(name) {
    const req = nodeModule.createRequire(join_1(ofArray([toolHome, "node", "package.json"])));
    return join_1(ofArray([dirname(req.resolve("kokoro-js")), "..", "voices", name + ".bin"]));
}

function foldA(step, state, items) {
    return singleton_2.Delay(() => (!isEmpty(items) ? singleton_2.Bind(step(state, head(items)), (_arg) => singleton_2.ReturnFrom(foldA(step, _arg, tail_1(items)))) : singleton_2.Return(state)));
}

function foldAR(step, state, items) {
    return singleton_2.Delay(() => (!isEmpty(items) ? singleton_2.Bind(step(state, head(items)), (_arg) => ((_arg.tag === 1) ? singleton_2.Return(new FSharpResult$2(/* Error */ 1, [_arg.fields[0]])) : singleton_2.ReturnFrom(foldAR(step, _arg.fields[0], tail_1(items))))) : singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [state]))));
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
    return singleton_2.Delay(() => singleton_2.Combine(!((speed >= 0.5) && (speed <= 2)) ? (((() => {
        throw new Exception("Speed should be between 0.5 and 2.0");
    })(), singleton_2.Zero())) : singleton_2.Zero(), singleton_2.Delay(() => singleton_2.Combine(!exists(voiceFile(voiceName)) ? (((() => {
        throw new Exception(concat_1("Voice ", voiceName, " not found in available voices"));
    })(), singleton_2.Zero())) : singleton_2.Zero(), singleton_2.Delay(() => singleton_2.Bind(foldA((parts, batch) => singleton_2.Delay(() => {
        const ids = choose((key) => FSharpMap__TryFind(VOCAB, key), truncate(MAX_PHONEMES, Array.from(batch)), Int32Array);
        return singleton_2.Bind(generate(concat_2([new Int32Array([0]), ids, new Int32Array([0])], Int32Array), voiceName, speed), (_arg) => singleton_2.Return(cons(trim_1(_arg), parts)));
    }), empty(), splitPhonemes(phonemes)), (_arg_1) => singleton_2.Return(concat_3(reverse(_arg_1)))))))));
}

/**
 * Voices a short phrase end to end (setup's check that the voice works).
 */
export function selfTest() {
    return singleton_2.Delay(() => singleton_2.Bind(phonemize("Ready.", "en-us"), (_arg) => singleton_2.Bind(create(_arg, "af_heart", 1), (_arg_1) => singleton_2.Bind(release(), () => {
        if (_arg_1.length === 0) {
            throw new Exception("the voice produced no audio");
            return singleton_2.Zero();
        }
        else {
            return singleton_2.Zero();
        }
    }))));
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

class Usage extends Record {
    constructor(characters, requests, cached, unpinned) {
        super();
        this.characters = (characters | 0);
        this.requests = (requests | 0);
        this.cached = (cached | 0);
        this.unpinned = unpinned;
    }
}

function Usage_$reflection() {
    return record_type("Narrate.Usage", [], Usage, () => [["characters", int32_type], ["requests", int32_type], ["cached", int32_type], ["unpinned", class_type("Microsoft.FSharp.Collections.FSharpSet`1", [string_type])]]);
}

class Track extends Record {
    constructor(audio, pos, report, usage) {
        super();
        this.audio = audio;
        this.pos = (pos | 0);
        this.report = report;
        this.usage = usage;
    }
}

function Track_$reflection() {
    return record_type("Narrate.Track", [], Track, () => [["audio", list_type(Audio_$reflection())], ["pos", int32_type], ["report", list_type(string_type)], ["usage", Usage_$reflection()]]);
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
    return new Track(cons(piece, t.audio), t.pos + samplesOf(piece), t.report, t.usage);
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
        return value_19(matchValue);
    }
}

function $007CTruthy$007C_$007C(v) {
    let matchResult, x_1;
    if (v != null) {
        if (Py_truthy(value_19(v))) {
            matchResult = 0;
            x_1 = value_19(v);
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
            return some(x_1);
        default:
            return undefined;
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

/**
 * Why narrating stopped: each case carries the values its message names. `describe` gives the exit code and the
 * lines for stderr.
 */
export class Failure extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["VoiceNotInstalled", "BadName", "UnknownLanguage", "UnknownPhraseLanguage", "DuplicateSceneId", "PosterNotFound", "VoiceFailed"];
    }
}

export function Failure_$reflection() {
    return union_type("Narrate.Failure", [], Failure, () => [[["hint", string_type]], [["name", obj_type]], [["lang", obj_type]], [["code", string_type]], [["id", obj_type]], [["id", obj_type]], [["Item", Failure_$reflection_1()]]]);
}

/**
 * The exit code of a failure and the lines it prints on stderr.
 */
export function describe(failure) {
    switch (failure.tag) {
        case 1:
            return [1, singleton(`name ${Py_repr(failure.fields[0])} must match ${NAME_PATTERN} - it becomes the file name on the server`)];
        case 2: {
            const can = join(", ", sort(toList_1(KOKORO_LANGS), {
                Compare: (x, y) => (comparePrimitives(x, y) | 0),
            }));
            return [1, singleton((`Kokoro cannot speak ${Py_repr(failure.fields[0])} (it can: ${can}). `) + "Narrate in the learner\'s language, or set \"voice\": null for a captioned silent clip.")];
        }
        case 3: {
            const code = failure.fields[0];
            return [1, singleton((((("{" + code) + ":...} needs \"voices\": {\"") + code) + "\": {\"voice\": ..., \"lang\": ...}}") + " in script.json")];
        }
        case 4:
            return [1, singleton(concat_1("duplicate scene id ", Py_repr(failure.fields[0])))];
        case 5:
            return [1, singleton(concat_1("poster scene ", Py_repr(failure.fields[0]), " not found"))];
        case 6:
            return describe_1(failure.fields[0]);
        default:
            return [2, singleton(failure.fields[0])];
    }
}

class Settings extends Record {
    constructor(Ws, Script, Marked, Name, Choice, Lang, Speed, Others, Pronounce, Glossary, Build, Cache) {
        super();
        this.Ws = Ws;
        this.Script = Script;
        this.Marked = Marked;
        this.Name = Name;
        this.Choice = Choice;
        this.Lang = Lang;
        this.Speed = Speed;
        this.Others = Others;
        this.Pronounce = Pronounce;
        this.Glossary = Glossary;
        this.Build = Build;
        this.Cache = Cache;
    }
}

function Settings_$reflection() {
    return record_type("Narrate.Settings", [], Settings, () => [["Ws", string_type], ["Script", obj_type], ["Marked", obj_type], ["Name", string_type], ["Choice", option_type(Choice_$reflection())], ["Lang", obj_type], ["Speed", float64_type], ["Others", obj_type], ["Pronounce", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [string_type, obj_type])], ["Glossary", Glossary_$reflection()], ["Build", string_type], ["Cache", string_type]]);
}

function specFor(settings, code) {
    const choice = value_19(settings.Choice);
    const voice = (name, lang) => (new Voice(choice.Provider, name, choice.Model, choice.Instructions, lang, settings.Speed));
    if (code != null) {
        if (choice.Provider.tag === 0) {
            const code_1 = code;
            const matchValue_2 = get$(settings.Others, code_1);
            if (matchValue_2 == null) {
                return new FSharpResult$2(/* Error */ 1, [new Failure(/* UnknownPhraseLanguage */ 3, [code_1])]);
            }
            else {
                const spec = value_19(matchValue_2);
                return new FSharpResult$2(/* Ok */ 0, [voice(spec.voice, spec.lang)]);
            }
        }
        else {
            const code_2 = code;
            const patternInput = defaultArg(FSharpMap__TryFind(choice.Others, code_2), [choice.Name, code_2]);
            return new FSharpResult$2(/* Ok */ 0, [voice(patternInput[0], patternInput[1])]);
        }
    }
    else {
        return new FSharpResult$2(/* Ok */ 0, [voice(choice.Name, settings.Lang)]);
    }
}

function synthKokoro(settings, voice, code, text, where) {
    return singleton_2.Delay(() => {
        const v = voice.Name;
        const l = voice.Lang;
        let phonemes;
        let input_1;
        const option_1 = FSharpMap__TryFind(settings.Pronounce, text.trim());
        input_1 = ((option_1 != null) ? (Py_truthy(value_19(option_1)) ? option_1 : undefined) : undefined);
        phonemes = ((input_1 == null) ? undefined : toString(value_19(input_1)));
        const text_1 = ((phonemes == null) && l.toLocaleLowerCase().startsWith("en")) ? voiced(text) : text;
        let asyncResult_3;
        let input_2;
        if (code == null) {
            input_2 = singleton_2.Return(undefined);
        }
        else {
            const c = code;
            input_2 = singleton_2.Delay(() => {
                let p_1;
                return singleton_2.Bind((phonemes == null) ? phonemize(text_1, l) : ((p_1 = phonemes, singleton_2.Return(p_1))), (_arg) => {
                    const source = (phonemes != null) ? "pinned" : "auto";
                    return singleton_2.Return(`${where}	${c}	${text_1}	${_arg}	${source}`);
                });
            });
        }
        asyncResult_3 = singleton_2.Bind(input_2, (x$0027) => singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [x$0027])));
        return singleton_2.Bind(asyncResult_3, (input_1_4) => {
            const input_21 = input_1_4;
            if (input_21.tag === 1) {
                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_21.fields[0]]));
            }
            else {
                const path = join_1(ofArray([settings.Cache, substring(sha1Hex(toJson(["kokoro-js 1.2.1 fp32", v, l, settings.Speed, defaultArg(phonemes, text_1)])), 0, 16) + ".wav"]));
                let computation1;
                if (!exists(path)) {
                    let asyncResult_1;
                    let input_5;
                    if (phonemes == null) {
                        input_5 = phonemize(text_1, l);
                    }
                    else {
                        const p_2 = phonemes;
                        input_5 = singleton_2.Return(p_2);
                    }
                    asyncResult_1 = singleton_2.Bind(input_5, (x$0027_1) => singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [x$0027_1])));
                    computation1 = singleton_2.Bind(asyncResult_1, (input_1_2) => {
                        const input_15 = input_1_2;
                        if (input_15.tag === 1) {
                            return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_15.fields[0]]));
                        }
                        else {
                            let asyncResult;
                            const input_8 = create(input_15.fields[0], v, settings.Speed);
                            asyncResult = singleton_2.Bind(input_8, (x$0027_2) => singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [x$0027_2])));
                            return singleton_2.Bind(asyncResult, (input_1_1) => {
                                const input_12 = input_1_1;
                                if (input_12.tag === 1) {
                                    return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_12.fields[0]]));
                                }
                                else {
                                    write(path + ".part", input_12.fields[0]);
                                    rename(path + ".part", path);
                                    const value_6 = ResultCE_ResultBuilder__Zero(ResultCE_result);
                                    return singleton_2.Return(value_6);
                                }
                            });
                        }
                    });
                }
                else {
                    const value_11 = ResultCE_ResultBuilder__Zero(ResultCE_result);
                    computation1 = singleton_2.Return(value_11);
                }
                const computation2 = singleton_2.Delay(() => {
                    const value_1_6 = new FSharpResult$2(/* Ok */ 0, [[read(path), input_21.fields[0]]]);
                    return singleton_2.Return(value_1_6);
                });
                return singleton_2.Bind(computation1, (input_1_3) => {
                    const input_18 = input_1_3;
                    if (input_18.tag === 1) {
                        return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_18.fields[0]]));
                    }
                    else {
                        return computation2;
                    }
                });
            }
        });
    });
}

function synthOther(settings, usage, voice, code, text, where) {
    return singleton_2.Delay(() => {
        let usage_1;
        let matchValue;
        const option_1 = FSharpMap__TryFind(settings.Pronounce, text.trim());
        matchValue = ((option_1 != null) ? (Py_truthy(value_19(option_1)) ? option_1 : undefined) : undefined);
        usage_1 = ((matchValue == null) ? usage : (new Usage(usage.characters, usage.requests, usage.cached, FSharpSet__Add(usage.unpinned, text.trim()))));
        let line;
        const input_1 = code;
        line = ((input_1 == null) ? undefined : (`${where}	${input_1}	${text}	-	provider`));
        const path = join_1(ofArray([settings.Cache, pieceKey(voice, text) + ".wav"]));
        if (text.trim() === "") {
            return singleton_2.Return(new FSharpResult$2(/* Ok */ 0, [[new Float32Array(0), line, usage_1]]));
        }
        else if (exists(path)) {
            const value_1_2 = new FSharpResult$2(/* Ok */ 0, [[read(path), line, new Usage(usage_1.characters, usage_1.requests, usage_1.cached + 1, usage_1.unpinned)]]);
            return singleton_2.Return(value_1_2);
        }
        else {
            let x_1;
            const input_2 = speak_1(voice, text);
            x_1 = singleton_2.Bind(input_2, (x$0027) => {
                let value_4;
                const input_4 = x$0027;
                value_4 = ((input_4.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* VoiceFailed */ 6, [input_4.fields[0]])])) : (new FSharpResult$2(/* Ok */ 0, [input_4.fields[0]])));
                return singleton_2.Return(value_4);
            });
            return singleton_2.Bind(x_1, (x$0027_1) => {
                let sent;
                let value_6;
                const input_8 = x$0027_1;
                value_6 = ((input_8.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_8.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [(write(path + ".part", trim_1(input_8.fields[0])), (rename(path + ".part", path), (sent = (new Usage(usage_1.characters + text.length, usage_1.requests + 1, usage_1.cached, usage_1.unpinned)), [read(path), line, sent])))])));
                return singleton_2.Return(value_6);
            });
        }
    });
}

function synth(settings, usage, code, text, where) {
    return singleton_2.Delay(() => {
        let asyncResult_1;
        const value_1 = specFor(settings, code);
        asyncResult_1 = singleton_2.Return(value_1);
        return singleton_2.Bind(asyncResult_1, (input_1_1) => {
            const input_6 = input_1_1;
            if (input_6.tag === 1) {
                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_6.fields[0]]));
            }
            else {
                const voice = input_6.fields[0];
                if (voice.Provider.tag === 0) {
                    const x = synthKokoro(settings, voice, code, text, where);
                    return singleton_2.Bind(x, (x$0027) => {
                        let _arg_1;
                        let value_2;
                        const input_2 = x$0027;
                        value_2 = ((input_2.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_2.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [(_arg_1 = input_2.fields[0], [_arg_1[0], _arg_1[1], usage])])));
                        return singleton_2.Return(value_2);
                    });
                }
                else {
                    return synthOther(settings, usage, voice, code, text, where);
                }
            }
        });
    });
}

function voiceScene(settings, markedScenes, track, finished, si, sc) {
    return singleton_2.Delay(() => {
        const id = sc.id;
        let asyncResult;
        const value_1_1 = !exists_1((f) => (toJson(f.id) === toJson(id)), finished) ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [new Failure(/* DuplicateSceneId */ 4, [id])]));
        asyncResult = singleton_2.Return(value_1_1);
        return singleton_2.Bind(asyncResult, (input_1_5) => {
            let input_1, option_1;
            const input_19 = input_1_5;
            if (input_19.tag === 1) {
                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_19.fields[0]]));
            }
            else {
                const startFrame = ~~(track.pos / FRAME) | 0;
                const x_6 = foldAR((tupledArg_2, tupledArg_3) => {
                    const track_6 = tupledArg_2[0];
                    const i_1 = tupledArg_3[0] | 0;
                    const s = tupledArg_3[1];
                    return singleton_2.Delay(() => {
                        const track_7 = (i_1 > 0) ? silence(GAP, track_6) : track_6;
                        const sentenceStart = now(startFrame, track_7);
                        const after = breaks(s);
                        const s_1 = (s.replace(BREAK, '')).trim();
                        const x_4 = foldAR((tupledArg, tupledArg_1) => {
                            const track_2 = tupledArg[0];
                            const _arg_1 = tupledArg_1[1];
                            const text = _arg_1[1];
                            const code = _arg_1[0];
                            return singleton_2.Delay(() => {
                                const track_3 = (tupledArg_1[0] > 0) ? silence(max(tupledArg[2], PART_GAP), track_2) : track_2;
                                const partStart = now(startFrame, track_3);
                                let x_2;
                                if (settings.Choice != null) {
                                    x_2 = singleton_2.Delay(() => {
                                        const where = `${Py_str(id)}[${i_1}]`;
                                        const x = synth(settings, track_3.usage, code, spoken(text), where);
                                        return singleton_2.Bind(x, (x$0027) => {
                                            let _arg_2, usage, line;
                                            let value_7;
                                            const input_3 = x$0027;
                                            value_7 = ((input_3.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_3.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [(_arg_2 = input_3.fields[0], (usage = _arg_2[2], (line = _arg_2[1], lay(new Audio(/* Speech */ 1, [_arg_2[0]]), (line == null) ? (new Track(track_3.audio, track_3.pos, track_3.report, usage)) : (new Track(track_3.audio, track_3.pos, cons(line, track_3.report), usage))))))])));
                                            return singleton_2.Return(value_7);
                                        });
                                    });
                                }
                                else {
                                    const value_1_3 = new FSharpResult$2(/* Ok */ 0, [silence(readingTime(shown(text)), track_3)]);
                                    x_2 = singleton_2.Return(value_1_3);
                                }
                                return singleton_2.Bind(x_2, (x$0027_1) => {
                                    let track_5;
                                    let value_11;
                                    const input_7 = x$0027_1;
                                    value_11 = ((input_7.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_7.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [(track_5 = input_7.fields[0], [track_5, cons(new Part(shown(text), heard(text), (code == null) ? Py_ofJs(settings.Lang) : (new Py_Json(/* Str */ 4, [code])), partStart, now(startFrame, track_5)), tupledArg[1]), _arg_1[2]])])));
                                    return singleton_2.Return(value_11);
                                });
                            });
                        }, [track_7, empty(), 0], indexed(toList(delay(() => collect((matchValue) => {
                            const ps = pieces(matchValue[0]);
                            return collect((matchValue_1) => singleton_1([matchValue_1[1][0], matchValue_1[1][1], (matchValue_1[0] === (length(ps) - 1)) ? matchValue[1] : 0]), indexed(ps));
                        }, rests(s_1))))));
                        return singleton_2.Bind(x_4, (x$0027_2) => {
                            let _arg_4, track_8, line_1, patternInput;
                            let value_13;
                            const input_11 = x$0027_2;
                            value_13 = ((input_11.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_11.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [(_arg_4 = input_11.fields[0], (track_8 = _arg_4[0], (line_1 = (new Sentence(shown(s_1), heard(s_1), sentenceStart, now(startFrame, track_8), reverse(_arg_4[1]))), (patternInput = mapFold((track_9, tupledArg_4) => {
                                const breakStart = now(startFrame, track_9);
                                const track_10 = silence(tupledArg_4[1], track_9);
                                return [new Break(tupledArg_4[0], i_1, breakStart, now(startFrame, track_10)), track_10];
                            }, track_8, after), [patternInput[1], cons(line_1, tupledArg_2[1]), append(reverse(patternInput[0]), tupledArg_2[2])]))))])));
                            return singleton_2.Return(value_13);
                        });
                    });
                }, [silence(getFloat(sc, "lead", 0.4), track), empty(), empty()], indexed(sentences(apply(settings.Glossary, defaultArg((input_1 = ((option_1 = get$(sc, "say"), (option_1 != null) ? (!Operators_IsNull(value_19(option_1)) ? option_1 : undefined) : undefined)), (input_1 == null) ? undefined : value_19(input_1)), "")))));
                return singleton_2.Bind(x_6, (x$0027_3) => {
                    let _arg_5, sceneBreaks_1, lines_1, track_13, over, track_14, endFrame, msc, passthrough, breaksJson;
                    let value_15;
                    const input_15 = x$0027_3;
                    value_15 = ((input_15.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_15.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [(_arg_5 = input_15.fields[0], (sceneBreaks_1 = _arg_5[2], (lines_1 = _arg_5[1], (track_13 = silence(getFloat(sc, "hold", 0) + getFloat(sc, "pad", isEmpty(lines_1) ? 0 : 0.9), _arg_5[0]), (over = ((track_13.pos % FRAME) | 0), (track_14 = (((over !== 0) ? true : (track_13.pos === (startFrame * FRAME))) ? lay(new Audio(/* Silence */ 0, [FRAME - over]), track_13) : track_13), (endFrame = (~~(track_14.pos / FRAME) | 0), (msc = item(si, markedScenes), (passthrough = ((key) => {
                        const matchValue_2 = get$(sc, key);
                        if ($007CTruthy$007C_$007C(matchValue_2) != null) {
                            return singleton([key, Py_ofJs(msc[key])]);
                        }
                        else {
                            return empty();
                        }
                    }), (breaksJson = (isEmpty(sceneBreaks_1) ? empty() : singleton(["breaks", new Py_Json(/* List */ 5, [toList(delay(() => map((b_1) => {
                        const b = b_1;
                        return new Py_Json(/* Obj */ 6, [ofArray([["kind", new Py_Json(/* Str */ 4, [b.kind])], ["sentence", new Py_Json(/* Int */ 2, [b.sentence])], ["start", num(b.start)], ["end", num(b.finish)]])]);
                    }, reverse(sceneBreaks_1))))])])), [track_14, cons(new Scene(id, Py_ofJs(msc.id), startFrame / 30, endFrame / 30, reverse(lines_1), append(passthrough("chapter"), append(passthrough("toasts"), append(breaksJson, append(passthrough("recap"), append(passthrough("path"), passthrough("inside"))))))), finished)]))))))))))])));
                    return singleton_2.Return(value_15);
                });
            }
        });
    });
}

function grouped(n) {
    const go = (s) => {
        if (s.length <= 3) {
            return s;
        }
        else {
            return (go(substring(s, 0, s.length - 3)) + ",") + substring(s, s.length - 3);
        }
    };
    return go(int32ToString(n));
}

function printUsage(choice, usage) {
    let matchValue, matchValue_1, m;
    const said = providerName(choice.Provider);
    if (!FSharpSet__get_IsEmpty(usage.unpinned)) {
        const arg = `${FSharpSet__get_Count(usage.unpinned)} pinned pronunciation(s) not used by ${said}: the text is sent as written`;
        toConsole(printf("%s"))(arg);
    }
    const arg_1 = `voice: ${said}${(matchValue = choice.Provider, (matchValue_1 = choice.Model, (matchValue.tag === 1) ? ((matchValue_1 != null) ? ((m = matchValue_1, " " + m)) : "") : ((matchValue.tag === 2) ? ((matchValue_1 != null) ? ((m = matchValue_1, " " + m)) : "") : "")))}, ${concat_1(grouped(usage.characters), " characters in ", grouped(usage.requests), " requests")}, ${grouped(usage.cached)} pieces from the cache`;
    toConsole(printf("%s"))(arg_1);
}

function writeOutputs(settings, track, scenes) {
    let p, ps_1, ps_2, matchValue_2, matchValue_3, matchValue_4, activePatternResult_1, c, asked, on, total, label, matchValue_5, activePatternResult_2, k, matchValue_6, activePatternResult_3, m;
    const duration = ~~(track.pos / FRAME) / 30;
    write(join_1(ofArray([settings.Build, "narration.wav"])), soundtrack(reverse(track.audio)));
    let posterId;
    const matchValue = get$(settings.Script, "poster");
    const activePatternResult = $007CTruthy$007C_$007C(matchValue);
    posterId = ((activePatternResult != null) ? ((p = value_19(activePatternResult), p)) : ((length(scenes) > 1) ? item_1(1, scenes) : item_1(0, scenes)).id);
    let input_3;
    const matchValue_1 = tryFind((s) => (toJson(s.id) === toJson(posterId)), scenes);
    input_3 = ((matchValue_1 != null) ? (isEmpty(matchValue_1.sentences) ? ((ps_1 = matchValue_1, new FSharpResult$2(/* Ok */ 0, [ps_1.finish - 0.1]))) : ((ps_2 = matchValue_1, new FSharpResult$2(/* Ok */ 0, [last_2(ps_2.sentences).finish])))) : (new FSharpResult$2(/* Error */ 1, [new Failure(/* PosterNotFound */ 5, [posterId])])));
    if (input_3.tag === 1) {
        return new FSharpResult$2(/* Error */ 1, [input_3.fields[0]]);
    }
    else {
        const poster = input_3.fields[0];
        const timing = new Py_Json(/* Obj */ 6, [append(ofArray([["name", new Py_Json(/* Str */ 4, [settings.Name])], ["title", (matchValue_2 = get$(settings.Script, "title"), (matchValue_2 == null) ? (new Py_Json(/* Str */ 4, [""])) : Py_ofJs(value_19(matchValue_2)))], ["voiced", new Py_Json(/* Bool */ 1, [settings.Choice != null])], ["captions", new Py_Json(/* Bool */ 1, [(matchValue_3 = get$(settings.Script, "captions"), (matchValue_3 == null) ? false : Py_truthy(value_19(matchValue_3)))])], ["duration", num(duration)], ["poster", num(Py_round(poster, 3))], ["scenes", new Py_Json(/* List */ 5, [map_2(sceneJson, scenes)])]]), append((matchValue_4 = get$(settings.Script, "card"), (activePatternResult_1 = $007CTruthy$007C_$007C(matchValue_4), (activePatternResult_1 != null) ? ((c = value_19(activePatternResult_1), (asked = c.thumbnail, (on = (((asked === undefined || asked === null)) ? (briefLength(settings.Ws) === "short") : Py_truthy(asked)), (total = (~~round(duration) | 0), (label = (`${~~(total / 60)}:${padLeft(int32ToString(total % 60), 2, "0")}`), singleton(["card", Py_ofJs(Object.assign({}, settings.Marked.card, { thumbnail: (on && label) }))]))))))) : empty())), append((matchValue_5 = get$(settings.Script, "kind"), (activePatternResult_2 = $007CTruthy$007C_$007C(matchValue_5), (activePatternResult_2 != null) ? ((k = value_19(activePatternResult_2), singleton(["kind", Py_ofJs(k)]))) : empty())), (matchValue_6 = get$(settings.Script, "map"), (activePatternResult_3 = $007CTruthy$007C_$007C(matchValue_6), (activePatternResult_3 != null) ? ((m = value_19(activePatternResult_3), singleton(["map", Py_ofJs(m)]))) : empty())))))]);
        writeText(join_1(ofArray([settings.Build, "timing.json"])), Py_dumpsIndented(2, timing));
        writeText(join_1(ofArray([settings.Build, "timing.js"])), ("window.TIMING = " + Py_dumps(timing)) + ";\n");
        const cues = toList(delay(() => append_1(singleton_1("WEBVTT"), delay(() => append_1(singleton_1(""), delay(() => collect((s_2) => collect((c_1) => append_1(singleton_1(concat_1(vttTime(c_1.start), " --> ", vttTime(c_1.finish))), delay(() => append_1(singleton_1(c_1.text), delay(() => singleton_1(""))))), s_2.sentences), scenes)))))));
        writeText(join_1(ofArray([settings.Build, "captions.vtt"])), join("\n", cues));
        writeText(join_1(ofArray([settings.Build, "phonemes.txt"])), ("where\tvoice\tphrase\tphonemes\tsource\n" + join("\n", reverse(track.report))) + (isEmpty(track.report) ? "" : "\n"));
        const words = sumBy((s_3) => (sumBy((c_2) => ((c_2.text.split(/\s+/).filter(w => w).length) | 0), s_3.sentences, {
            GetZero: () => 0,
            Add: (x, y) => ((x + y) | 0),
        }) | 0), scenes, {
            GetZero: () => 0,
            Add: (x_1, y_1) => ((x_1 + y_1) | 0),
        }) | 0;
        const at = Py_toFixed(poster, 1);
        const arg = `${settings.Name}: ${Py_toFixed(duration, 1)}s, ${length(scenes)} scenes, ${words} words, poster at ${at}s`;
        toConsole(printf("%s"))(arg);
        iterate((s_4) => {
            const times = concat_1(padLeft(Py_toFixed(s_4.start, 1), 6), " - ", padLeft(Py_toFixed(s_4.finish, 1), 6));
            const arg_1 = `  ${padRight(Py_str(s_4.id), 14)} ${times}  (${length(s_4.sentences)} sentences)`;
            toConsole(printf("%s"))(arg_1);
        }, scenes);
        let input_1;
        if (!isEmpty(track.report)) {
            const arg_2 = `  ${length(track.report)} phrase(s) in another voice - check build/phonemes.txt against the lesson`;
            toConsole(printf("%s"))(arg_2);
            input_1 = ResultCE_ResultBuilder__Zero_1(ResultCE_result_1);
        }
        else {
            input_1 = ResultCE_ResultBuilder__Zero_1(ResultCE_result_1);
        }
        if (input_1.tag === 1) {
            return new FSharpResult$2(/* Error */ 1, [input_1.fields[0]]);
        }
        else {
            const matchValue_7 = settings.Choice;
            let matchResult, choice_1;
            if (matchValue_7 != null) {
                if (!equals(matchValue_7.Provider, Provider.Kokoro)) {
                    matchResult = 0;
                    choice_1 = matchValue_7;
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
                    printUsage(choice_1, track.usage);
                    return ResultCE_ResultBuilder__Zero_1(ResultCE_result_1);
                }
                default: {
                    return ResultCE_ResultBuilder__Zero_1(ResultCE_result_1);
                }
            }
        }
    }
}

function narrate(settings) {
    return singleton_2.Delay(() => {
        const sceneObjs = settings.Script.scenes;
        const markedScenes = settings.Marked.scenes;
        const scenes = toList(delay(() => map((si) => [si, item(si, sceneObjs)], rangeDouble(0, 1, sceneObjs.length - 1))));
        const emptyTrack = new Track(empty(), 0, empty(), new Usage(0, 0, 0, empty_3({
            Compare: (x, y) => (comparePrimitives(x, y) | 0),
        })));
        const asyncResult = singleton_2.Delay(() => singleton_2.Bind(closingOnError(release, foldAR((tupledArg, tupledArg_1) => voiceScene(settings, markedScenes, tupledArg[0], tupledArg[1], tupledArg_1[0], tupledArg_1[1]), [emptyTrack, empty()], scenes)), (_arg) => singleton_2.Bind(release(), () => singleton_2.Return(_arg))));
        return singleton_2.Bind(asyncResult, (input_1_1) => {
            const input_6 = input_1_1;
            if (input_6.tag === 1) {
                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [input_6.fields[0]]));
            }
            else {
                const _arg_2 = input_6.fields[0];
                let x_1;
                const value_1 = writeOutputs(settings, _arg_2[0], reverse(_arg_2[1]));
                x_1 = singleton_2.Return(value_1);
                return singleton_2.Bind(x_1, (x$0027) => {
                    let value_2;
                    const input_2 = x$0027;
                    value_2 = ((input_2.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_2.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [undefined])));
                    return singleton_2.Return(value_2);
                });
            }
        });
    });
}

function $007CServerName$007C_$007C(name) {
    if (((typeof name) === "string") && (NAME.test(name))) {
        return name;
    }
    else {
        return undefined;
    }
}

function unspoken(specs) {
    return tryPick((spec) => {
        const lang = spec.lang;
        if (Py_truthy(spec.voice) && !(((typeof lang) === "string") && FSharpSet__Contains(KOKORO_LANGS, lang))) {
            return some(lang);
        }
        else {
            return undefined;
        }
    }, specs);
}

function scriptDecides(clip, script) {
    const provider = script.provider;
    if (((typeof provider) === "string") && (provider !== "")) {
        return true;
    }
    else {
        return !exists(join_1(ofArray([dirname(clip), "voice.json"])));
    }
}

function voicesObject(others) {
    return createObj(toList(delay(() => collect((matchValue) => {
        const activePatternResult = matchValue;
        return singleton_1([activePatternResult[0], {
            voice: activePatternResult[1][0],
            lang: activePatternResult[1][1],
        }]);
    }, others))));
}

function spokenElsewhere(ws) {
    try {
        const matchValue = choose_1(ws, readJson(join_1(ofArray([resolve(ws), "script.json"]))));
        return (matchValue.tag === 1) ? true : ((matchValue.fields[0] == null) ? false : !equals(matchValue.fields[0].Provider, Provider.Kokoro));
    }
    catch (matchValue_1) {
        return false;
    }
}

function chosen(ws, script, speed, voiceName, others) {
    let input_1, c_2, input_3;
    const input_6 = choose_1(ws, script);
    if (input_6.tag === 1) {
        return new FSharpResult$2(/* Error */ 1, [input_6.fields[0]]);
    }
    else {
        const choice = input_6.fields[0];
        const input_4 = defaultArg((input_1 = choice, (input_1 == null) ? undefined : check(input_1, speed)), new FSharpResult$2(/* Ok */ 0, [undefined]));
        if (input_4.tag === 1) {
            return new FSharpResult$2(/* Error */ 1, [input_4.fields[0]]);
        }
        else {
            return new FSharpResult$2(/* Ok */ 0, [(choice != null) ? (equals(choice.Provider, Provider.Kokoro) ? ((c_2 = choice, scriptDecides(resolve(ws), script) ? [(input_3 = voiceName, (input_3 == null) ? undefined : (new Choice(c_2.Provider, input_3, c_2.Model, c_2.Instructions, c_2.Others))), others] : [c_2, voicesObject(c_2.Others)])) : [choice, others]) : [choice, others]]);
        }
    }
}

/**
 * Voices the workspace. Reading and checking script.json and the voice settings happen as `run` is called, before
 * the Async starts: what throws there reaches the caller at once, and a failed check (the Kokoro voice not
 * installed, the name, the chosen voice, a Kokoro language) is the Error the Async returns, before any work is done.
 */
export function run(ws) {
    let v, option_2, input_1;
    const matchValue = requirePackages(voicePackages);
    let matchResult;
    if (matchValue.tag === 1) {
        if (!spokenElsewhere(ws)) {
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
            return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* VoiceNotInstalled */ 0, [matchValue.fields[0]])]));
        default: {
            const clip = resolve(ws);
            const scriptText = readText(join_1(ofArray([clip, "script.json"])));
            const script = parseJson(scriptText);
            const marked = JSON.parse(scriptText, (k, v, c) => typeof v === 'number' && c && typeof c.source === 'string' && /[.eE]/.test(c.source) ? {__py_float__: v} : v);
            const matchValue_1 = script.name;
            const activePatternResult = $007CServerName$007C_$007C(matchValue_1);
            if (activePatternResult != null) {
                const name = activePatternResult;
                let voiceName;
                const matchValue_2 = get$(script, "voice");
                if (matchValue_2 != null) {
                    const activePatternResult_1 = $007CTruthy$007C_$007C(matchValue_2);
                    voiceName = ((activePatternResult_1 != null) ? ((v = value_19(activePatternResult_1), v)) : undefined);
                }
                else {
                    voiceName = "af_heart";
                }
                const lang = defaultArg(get$(script, "lang"), "en-us");
                const speed = getFloat(script, "speed", 1);
                const others = defaultArg((option_2 = get$(script, "voices"), (option_2 != null) ? (!Operators_IsNull(value_19(option_2)) ? option_2 : undefined) : undefined), {});
                let pronounce;
                const matchValue_3 = get$(script, "pronounce");
                let matchResult_1, p_1;
                if (matchValue_3 != null) {
                    if (!Operators_IsNull(value_19(matchValue_3))) {
                        matchResult_1 = 0;
                        p_1 = value_19(matchValue_3);
                    }
                    else {
                        matchResult_1 = 1;
                    }
                }
                else {
                    matchResult_1 = 1;
                }
                switch (matchResult_1) {
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
                const voice = chosen(ws, script, speed, voiceName, others);
                let patternInput;
                const result_1 = voice;
                patternInput = ((result_1.tag === 1) ? [undefined, others] : result_1.fields[0]);
                const others_1 = patternInput[1];
                const choice = patternInput[0];
                const specs = cons({
                    voice: (input_1 = choice, (input_1 == null) ? undefined : input_1.Name),
                    lang: lang,
                }, toList(delay(() => map((k_1) => others_1[k_1], Object.keys(others_1)))));
                const matchValue_4 = unspoken(exists_2((c_1) => !equals(c_1.Provider, Provider.Kokoro), toArray_1(choice)) ? empty() : specs);
                const copyOfStruct = voice;
                if (copyOfStruct.tag === 0) {
                    if (matchValue_4 == null) {
                        const glossary = load_1(clip);
                        const build = join_1(ofArray([clip, "build"]));
                        const cache = join_1(ofArray([build, "tts-cache"]));
                        mkdirp(cache);
                        return narrate(new Settings(ws, script, marked, name, choice, lang, speed, others_1, pronounce, glossary, build, cache));
                    }
                    else {
                        const lang_1 = value_19(matchValue_4);
                        return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* UnknownLanguage */ 2, [lang_1])]));
                    }
                }
                else {
                    return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* VoiceFailed */ 6, [copyOfStruct.fields[0]])]));
                }
            }
            else {
                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* BadName */ 1, [matchValue_1])]));
            }
        }
    }
}

