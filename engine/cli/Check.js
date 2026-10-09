
import { readDir, resolve, readText, basename, mtime, exists, readJson, join as join_1, fs } from "./Node.js";
import { concat, split, trimStart, trimEnd, padLeft, replicate, padRight, replace, indexOf, substring, join } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { max as max_1, min as min_1, compare, arrayHash, equalArrays, disposeSafe, getEnumerator, stringHash, equals, defaultOf, int32ToString, comparePrimitives, clear } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { isDigit } from "./fable_modules/fable-library-js.5.19.0/Char.js";
import { choose, item as item_1, tryFindIndex, sortBy, find, sum, tryFind as tryFind_2, truncate, pairwise, tryPick as tryPick_1, concat as concat_1, sumBy, exists as exists_1, tryFindBack, contains, zip as zip_1, collect as collect_1, append as append_1, mapIndexed, length as length_1, singleton, filter, fold, map as map_3, sortWith, toArray, tail as tail_1, head, isEmpty, indexed, mapFold, ofArray, empty, reverse, ofArrayWithTail, cons } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { Union, Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { union_type, int32_type, array_type, option_type, record_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { some, defaultArg, value as value_1 } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { pairwise as pairwise_1, fold as fold_1, sumBy as sumBy_1, pick, tryPick, indexed as indexed_1, last as last_2, map as map_1, item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { empty as empty_1, singleton as singleton_1, collect, append, delay, findIndex, reverse as reverse_1, toList, zip, tryFind, map as map_2 } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { max, parse as parse_1, isInfinity, isNegativeInfinity, isPositiveInfinity, min } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { op_UnaryNegation_Int32, parse } from "./fable_modules/fable-library-js.5.19.0/Int32.js";
import { load as load_1, uses as uses_1, apply } from "./Glossary.js";
import { List_groupBy, List_distinctBy, List_countBy, List_distinct } from "./fable_modules/fable-library-js.5.19.0/Seq2.js";
import { toList as toList_1, FSharpSet__Contains, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { empty as empty_2, tryFind as tryFind_1, add as add_1 } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { rangeDouble } from "./fable_modules/fable-library-js.5.19.0/Range.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";

/**
 * Writes all of s to a file descriptor, waiting while a non-blocking pipe is full (EAGAIN).
 */
export function Py_writeFd(fd, s) {
    const buf = Buffer.from(s, 'utf8');
    const len = buf.length | 0;
    const from = (off_1_mut) => {
        from:
        while (true) {
            const off_1 = off_1_mut;
            let off;
            if (off_1 < len) {
                off_1_mut = (off_1 + ((off = (off_1 | 0), (() => {
                    try {
                        return (fs.writeSync(fd, buf, off, (len - off))) | 0;
                    }
                    catch (e) {
                        if (e.code === "EAGAIN") {
                            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
                            return 0;
                        }
                        else {
                            throw e;
                        }
                    }
                })())));
                continue from;
            }
            break;
        }
    };
    from(0);
}

const Py_outBuf = [];

/**
 * print(): one line to stdout (buffered until flush).
 */
export function Py_print(s) {
    void (Py_outBuf.push(s + "\n"));
}

export function Py_flush() {
    if (Py_outBuf.length > 0) {
        const s = join("", Py_outBuf);
        clear(Py_outBuf);
        Py_writeFd(1, s);
    }
}

/**
 * sys.exit("message"): flush stdout, the message to stderr, status 1.
 */
export function Py_fail(msg) {
    Py_flush();
    Py_writeFd(2, msg + "\n");
    return 1;
}

const Py_W = "\\p{L}\\p{N}_";

const Py_S = "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";

const Py_syntaxChars = "^$\\.*+?()[]{}|/";

function Py_translate(p, multiline) {
    const boundary = ((((((("(?:(?<=[" + Py_W) + "])(?![") + Py_W) + "])|(?<![") + Py_W) + "])(?=[") + Py_W) + "]))";
    const nonBoundary = ((((((("(?:(?<=[" + Py_W) + "])(?=[") + Py_W) + "])|(?<![") + Py_W) + "])(?![") + Py_W) + "]))";
    const scan = (i_mut, inClass_mut, acc_mut) => {
        scan:
        while (true) {
            const i = i_mut, inClass = inClass_mut, acc = acc_mut;
            if (i >= p.length) {
                return acc;
            }
            else {
                const c = p[i];
                if ((c === "\\") && ((i + 1) < p.length)) {
                    const d = p[i + 1];
                    i_mut = (i + 2);
                    inClass_mut = inClass;
                    acc_mut = cons((d === "-") ? (isDigit(d) ? ("\\" + d) : (inClass ? "\\-" : ((Py_syntaxChars.indexOf(d) >= 0) ? ("\\" + d) : d))) : ((d === "A") ? "(?<![\\s\\S])" : ((d === "B") ? nonBoundary : ((d === "D") ? "\\P{Nd}" : ((d === "P") ? ("\\" + d) : ((d === "S") ? (("[^" + Py_S) + "]") : ((d === "W") ? (("[^" + Py_W) + "]") : ((d === "Z") ? "(?![\\s\\S])" : ((d === "b") ? (inClass ? "\\x08" : boundary) : ((d === "d") ? "\\p{Nd}" : ((d === "f") ? ("\\" + d) : ((d === "n") ? ("\\" + d) : ((d === "p") ? ("\\" + d) : ((d === "r") ? ("\\" + d) : ((d === "s") ? (inClass ? Py_S : (("[" + Py_S) + "]")) : ((d === "t") ? ("\\" + d) : ((d === "u") ? ("\\" + d) : ((d === "v") ? ("\\" + d) : ((d === "w") ? (inClass ? Py_W : (("[" + Py_W) + "]")) : ((d === "x") ? ("\\" + d) : (isDigit(d) ? ("\\" + d) : ((Py_syntaxChars.indexOf(d) >= 0) ? ("\\" + d) : d))))))))))))))))))))), acc);
                    continue scan;
                }
                else if (inClass) {
                    i_mut = (i + 1);
                    inClass_mut = (c !== "]");
                    acc_mut = cons(c, acc);
                    continue scan;
                }
                else {
                    switch (c) {
                        case "$": {
                            i_mut = (i + 1);
                            inClass_mut = false;
                            acc_mut = cons(multiline ? "(?=\\n|(?![\\s\\S]))" : "(?=\\n?(?![\\s\\S]))", acc);
                            continue scan;
                        }
                        case ".": {
                            i_mut = (i + 1);
                            inClass_mut = false;
                            acc_mut = cons("[^\\n]", acc);
                            continue scan;
                        }
                        case "[":
                            if (((i + 1) < p.length) && (p[i + 1] === "^")) {
                                i_mut = (i + 2);
                                inClass_mut = true;
                                acc_mut = ofArrayWithTail(["^", "["], acc);
                                continue scan;
                            }
                            else {
                                i_mut = (i + 1);
                                inClass_mut = true;
                                acc_mut = cons("[", acc);
                                continue scan;
                            }
                        case "^": {
                            i_mut = (i + 1);
                            inClass_mut = false;
                            acc_mut = cons(multiline ? "(?<![^\\n])" : "^", acc);
                            continue scan;
                        }
                        default: {
                            i_mut = (i + 1);
                            inClass_mut = false;
                            acc_mut = cons(c, acc);
                            continue scan;
                        }
                    }
                }
            }
            break;
        }
    };
    return join("", reverse(scan(0, false, empty())));
}

export class Py_Rx extends Record {
    constructor(Src, Flags) {
        super();
        this.Src = Src;
        this.Flags = Flags;
    }
}

export function Py_Rx_$reflection() {
    return record_type("Check.Py.Rx", [], Py_Rx, () => [["Src", string_type], ["Flags", string_type]]);
}

export function Py_rx(p) {
    return new Py_Rx(Py_translate(p, false), "u");
}

export function Py_rxI(p) {
    return new Py_Rx(Py_translate(p, false), "ui");
}

/**
 * A match: groups (0 = the whole match; None for a group that did not take part), start and end offsets.
 */
export class Py_M extends Record {
    constructor(Groups, Start, End) {
        super();
        this.Groups = Groups;
        this.Start = (Start | 0);
        this.End = (End | 0);
    }
}

export function Py_M_$reflection() {
    return record_type("Check.Py.M", [], Py_M, () => [["Groups", array_type(option_type(string_type))], ["Start", int32_type], ["End", int32_type]]);
}

export function Py_M__get_Value(m) {
    return value_1(item(0, m.Groups));
}

export function Py_M__Group_Z524259A4(m, n) {
    return item(n, m.Groups);
}

/**
 * m.group(n) or "" (a group that did not take part).
 */
export function Py_M__G_Z524259A4(m, n) {
    return defaultArg(item(n, m.Groups), "");
}

function Py_toM(m) {
    const groups = map_1((g) => {
        if (g == null) {
            return undefined;
        }
        else {
            return g;
        }
    }, m);
    const start = m.index | 0;
    return new Py_M(groups, start, start + value_1(item(0, groups)).length);
}

export function Py_finditer(r, s) {
    return ofArray(map_1(Py_toM, Array.from(s.matchAll(new RegExp(r.Src, (r.Flags + "g"))))));
}

export function Py_search(r, s) {
    const m = (new RegExp(r.Src, r.Flags)).exec(s);
    if (m == null) {
        return undefined;
    }
    else {
        return Py_toM(m);
    }
}

export function Py_found(r, s) {
    return Py_search(r, s) != null;
}

/**
 * re.match: anchored at the start.
 */
export function Py_matchStart(r, s) {
    const m = (new RegExp((("^(?:" + r.Src) + ")"), r.Flags)).exec(s);
    if (m == null) {
        return undefined;
    }
    else {
        return Py_toM(m);
    }
}

export function Py_fullmatch(r, s) {
    return !(((new RegExp((("^(?:" + r.Src) + ")$"), r.Flags)).exec(s)) == null);
}

/**
 * re.sub with a function that is also given the number of the match (0 for the first).
 */
export function Py_subIndexed(r, f, s) {
    const patternInput = mapFold((last, tupledArg) => {
        const m = tupledArg[1];
        return [substring(s, last, m.Start - last) + f(tupledArg[0], m), m.End];
    }, 0, indexed(Py_finditer(r, s)));
    return join("", patternInput[0]) + substring(s, patternInput[1]);
}

/**
 * re.sub with a function.
 */
export function Py_sub(r, f, s) {
    return Py_subIndexed(r, (_arg, m) => f(m), s);
}

export function Py_split(r, s) {
    return ofArray(s.split(new RegExp(r.Src, r.Flags)));
}

/**
 * re.escape for a literal inside a pattern.
 */
export function Py_escape(s) {
    return join("", map_2((c) => {
        if ((Py_syntaxChars.indexOf(c) >= 0) ? true : (c === "-")) {
            return "\\" + c;
        }
        else {
            return c;
        }
    }, s.split("")));
}

const Py_wsRun = Py_rx("\\s+");

const Py_stripRx = Py_rx("^\\s+|\\s+$");

/**
 * str.strip()
 */
export function Py_strip(s) {
    return Py_sub(Py_stripRx, (_arg) => "", s);
}

/**
 * str.split() with no argument: runs of whitespace, no empty pieces.
 */
export function Py_words(s) {
    const t = Py_strip(s);
    if (t === "") {
        return empty();
    }
    else {
        return Py_split(Py_wsRun, t);
    }
}

/**
 * str.splitlines()
 */
export function Py_splitlines(s) {
    const parts = Py_split(Py_rx("\\r\\n|[\\n\\r\\v\\f\\x1c\\x1d\\x1e\\x85\\u2028\\u2029]"), s);
    const matchValue = reverse(parts);
    let matchResult, rest;
    if (!isEmpty(matchValue)) {
        if (head(matchValue) === "") {
            matchResult = 0;
            rest = tail_1(matchValue);
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
            return reverse(rest);
        default:
            return parts;
    }
}

/**
 * len(s): code points.
 */
export function Py_len(s) {
    return (Array.from(s)).length | 0;
}

/**
 * str.count(sub), non-overlapping.
 */
export function Py_count(s, sub) {
    if (sub === "") {
        return (Py_len(s) + 1) | 0;
    }
    else {
        const from = (start_mut, n_mut) => {
            from:
            while (true) {
                const start = start_mut, n = n_mut;
                const matchValue = indexOf(s, sub, 4, start) | 0;
                if (matchValue === -1) {
                    return n | 0;
                }
                else {
                    start_mut = (matchValue + sub.length);
                    n_mut = (n + 1);
                    continue from;
                }
                break;
            }
        };
        return from(0, 0) | 0;
    }
}

/**
 * s[a:b] by code points (Python slice rules for non-negative bounds; b clipped).
 */
export function Py_slice(s, a, b) {
    const cp = Array.from(s);
    const b_1 = min(b, cp.length) | 0;
    if (a >= b_1) {
        return "";
    }
    else {
        return join("", cp.slice(a, (b_1 - 1) + 1));
    }
}

/**
 * s[:n]
 */
export function Py_take(n, s) {
    return Py_slice(s, 0, n);
}

/**
 * Python string ordering (by code point; JS < compares UTF-16 units).
 */
export function Py_cmpStr(a, b) {
    const matchValue = Array.from(a);
    const y = Array.from(b);
    const x = matchValue;
    const point = (cp) => ((cp.codePointAt(0)) | 0);
    const matchValue_2 = tryFind((y_1) => (0 !== y_1), map_2((tupledArg) => (comparePrimitives(point(tupledArg[0]), point(tupledArg[1])) | 0), zip(x, y)));
    if (matchValue_2 == null) {
        return comparePrimitives(x.length, y.length) | 0;
    }
    else {
        return matchValue_2 | 0;
    }
}

/**
 * repr(float): shortest round-trip digits, fixed between 1e-4 and 1e16, ".0" when whole.
 */
export function Py_floatRepr(x) {
    if (Number.isNaN(x)) {
        return "nan";
    }
    else if (isPositiveInfinity(x)) {
        return "inf";
    }
    else if (isNegativeInfinity(x)) {
        return "-inf";
    }
    else if (x === 0) {
        if (Object.is(x, -0) || x < 0) {
            return "-0.0";
        }
        else {
            return "0.0";
        }
    }
    else {
        const e = Math.abs(x).toExponential();
        const k = e.indexOf("e") | 0;
        const digits = replace(substring(e, 0, k), ".", "");
        const exp = parse(substring(e, k + 1), 511, false, 32) | 0;
        const sign = (x < 0) ? "-" : "";
        if ((exp >= -4) && (exp < 16)) {
            if (exp >= 0) {
                return ((sign + substring(padRight(digits, exp + 1, "0"), 0, exp + 1)) + ".") + ((digits.length > (exp + 1)) ? substring(digits, exp + 1) : "0");
            }
            else {
                return ((sign + "0.") + replicate(op_UnaryNegation_Int32(exp) - 1, "0")) + digits;
            }
        }
        else {
            const mant = (digits.length > 1) ? ((substring(digits, 0, 1) + ".") + substring(digits, 1)) : digits;
            const es = int32ToString(Math.abs(exp));
            return (((sign + mant) + "e") + ((exp < 0) ? "-" : "+")) + ((es.length < 2) ? ("0" + es) : es);
        }
    }
}

/**
 * A number as Python would print it: an int prints as an int, a float with repr.
 */
export function Py_numStr(x, isFloat) {
    if (isFloat) {
        return Py_floatRepr(x);
    }
    else {
        return BigInt(x).toString();
    }
}

/**
 * A number read from JSON written by JS (JSON.stringify never writes "1.0"): whole means int.
 */
export function Py_jsonNum(x) {
    return Py_numStr(x, !(Number.isInteger(x)) ? true : (Math.abs(x) >= 1E+21));
}

function Py_exactDigits(x) {
    const patternInput = (() => { const v = new DataView(new ArrayBuffer(8)); v.setFloat64(0, Math.abs(x));
        const hi = v.getUint32(0), ex = (hi >>> 20) & 0x7ff; let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(v.getUint32(4));
        let e = -1074; if (ex !== 0) { m |= 1n << 52n; e = ex - 1075; }
        return e >= 0 ? [(m << BigInt(e)).toString(), 0] : [(m * 5n ** BigInt(-e)).toString(), -e]; })();
    const scale = patternInput[1] | 0;
    const d_1 = padLeft(patternInput[0], scale + 1, "0");
    const intPart = substring(d_1, 0, d_1.length - scale);
    return [("0" + intPart) + padRight(substring(d_1, d_1.length - scale), scale + 30, "0"), intPart.length + 1];
}

function Py_roundAt(ds, q) {
    const kept = substring(ds, 0, q);
    const rest = substring(ds, q);
    const carry = (digits) => {
        if (!isEmpty(digits)) {
            if (head(digits) === "9") {
                return cons("0", carry(tail_1(digits)));
            }
            else {
                return cons(String.fromCharCode((~~head(digits).charCodeAt(0) + 1) & 0xFFFF), tail_1(digits));
            }
        }
        else {
            return empty();
        }
    };
    if ((rest === "") ? false : ((rest[0] > "5") ? true : ((rest[0] < "5") ? false : ((trimEnd(substring(rest, 1), "0") !== "") ? true : ((q > 0) && (((~~kept[q - 1].charCodeAt(0) - ~~"0".charCodeAt(0)) % 2) === 1)))))) {
        return toArray(reverse(carry(toList(reverse_1(kept.split("")))))).join('');
    }
    else {
        return kept;
    }
}

function Py_signOf(x) {
    if (Object.is(x, -0) || x < 0) {
        return "-";
    }
    else {
        return "";
    }
}

/**
 * format(x, ".{n}f")
 */
export function Py_fmtF(n, x) {
    if (Number.isNaN(x)) {
        return "nan";
    }
    else if (isInfinity(x)) {
        if (x > 0) {
            return "inf";
        }
        else {
            return "-inf";
        }
    }
    else {
        const patternInput = Py_exactDigits(x);
        const pt = patternInput[1] | 0;
        const kept = Py_roundAt(patternInput[0], pt + n);
        const intPart = trimStart(substring(kept, 0, pt), "0");
        const intPart_1 = (intPart === "") ? "0" : intPart;
        return (Py_signOf(x) + intPart_1) + ((n > 0) ? ("." + substring(kept, pt)) : "");
    }
}

/**
 * format(x, "{w}.{n}f"): right-aligned in w columns.
 */
export function Py_fixedW(w, n, x) {
    return padLeft(Py_fmtF(n, x), w);
}

/**
 * format(x, ".{n}%")
 */
export function Py_pct(n, x) {
    return Py_fmtF(n, x * 100) + "%";
}

/**
 * format(x, "g"): 6 significant digits, trailing zeros dropped.
 */
export function Py_g(x) {
    if (Number.isNaN(x)) {
        return "nan";
    }
    else if (isInfinity(x)) {
        if (x > 0) {
            return "inf";
        }
        else {
            return "-inf";
        }
    }
    else if (x === 0) {
        return Py_signOf(x) + "0";
    }
    else {
        const patternInput = Py_exactDigits(x);
        const ds = patternInput[0];
        const kept = Py_roundAt(ds, findIndex((c) => (c !== "0"), ds.split("")) + 6);
        const f2 = findIndex((c_1) => (c_1 !== "0"), kept.split("")) | 0;
        const exp = ((patternInput[1] - 1) - f2) | 0;
        const sigd = substring(padRight(substring(kept, f2), 6, "0"), 0, 6);
        if ((exp >= -4) && (exp < 6)) {
            const patternInput_1 = (exp >= 0) ? [substring(sigd, 0, exp + 1), substring(sigd, exp + 1)] : ["0", replicate(op_UnaryNegation_Int32(exp) - 1, "0") + sigd];
            const frac_1 = trimEnd(patternInput_1[1], "0");
            return (Py_signOf(x) + patternInput_1[0]) + ((frac_1 === "") ? "" : ("." + frac_1));
        }
        else {
            const rest = trimEnd(substring(sigd, 1), "0");
            const es = int32ToString(Math.abs(exp));
            return ((((Py_signOf(x) + substring(sigd, 0, 1)) + ((rest === "") ? "" : ("." + rest))) + "e") + ((exp < 0) ? "-" : "+")) + ((es.length < 2) ? ("0" + es) : es);
        }
    }
}

/**
 * round(x) for a float: half to even.
 */
export function Py_round(x) {
    const r = Math.floor(x);
    const d = x - r;
    if (d > 0.5) {
        return r + 1;
    }
    else if (d < 0.5) {
        return r;
    }
    else if ((r % 2) === 0) {
        return r;
    }
    else {
        return r + 1;
    }
}

const Py_unprintable = Py_rx("^[\\p{Cc}\\p{Cf}\\p{Cs}\\p{Co}\\p{Cn}\\p{Zl}\\p{Zp}\\p{Zs}]$");

function Py_hex(n, width) {
    return padLeft(n.toString(16), width, "0");
}

/**
 * repr(str)
 */
export function Py_reprStr(s) {
    const q = ((s.indexOf("\'") >= 0) && !(s.indexOf("\"") >= 0)) ? "\"" : "\'";
    return (q + join("", map_1((ch) => {
        const c = (ch.codePointAt(0)) | 0;
        if ((ch === q) ? true : (ch === "\\")) {
            return "\\" + ch;
        }
        else {
            switch (c) {
                case 9:
                    return "\\t";
                case 10:
                    return "\\n";
                case 13:
                    return "\\r";
                default:
                    if ((c < 32) ? true : (c === 127)) {
                        return "\\x" + Py_hex(c, 2);
                    }
                    else if (c < 127) {
                        return ch;
                    }
                    else if ((ch !== " ") && Py_fullmatch(Py_unprintable, ch)) {
                        if (c <= 255) {
                            return "\\x" + Py_hex(c, 2);
                        }
                        else if (c <= 65535) {
                            return "\\u" + Py_hex(c, 4);
                        }
                        else {
                            return "\\U" + Py_hex(c, 8);
                        }
                    }
                    else {
                        return ch;
                    }
            }
        }
    }, Array.from(s)))) + q;
}

/**
 * repr() of a JSON value (dicts keep their key order).
 */
export function Py_repr(v) {
    if (v == null) {
        return "None";
    }
    else {
        const matchValue = typeof v;
        switch (matchValue) {
            case "string":
                return Py_reprStr(v);
            case "number":
                return Py_jsonNum(v);
            case "boolean":
                if (v) {
                    return "True";
                }
                else {
                    return "False";
                }
            default:
                if (Array.isArray(v)) {
                    return ("[" + join(", ", map_1(Py_repr, v))) + "]";
                }
                else {
                    return ("{" + join(", ", map_1((k) => ((Py_reprStr(k) + ": ") + Py_repr(v[k])), Object.keys(v)))) + "}";
                }
        }
    }
}

export function Py_isStr(v) {
    if (!(v == null)) {
        return (typeof v) === "string";
    }
    else {
        return false;
    }
}

/**
 * str() of a JSON value, as an f-string's {x} prints it.
 */
export function Py_str(v) {
    if (!(v == null) && ((typeof v) === "string")) {
        return v;
    }
    else {
        return Py_repr(v);
    }
}

/**
 * Python truthiness of a JSON value.
 */
export function Py_truthy(v) {
    if (v == null) {
        return false;
    }
    else {
        const matchValue = typeof v;
        switch (matchValue) {
            case "string":
                return v !== "";
            case "number":
                return v !== 0;
            case "boolean":
                return v;
            default:
                if (Array.isArray(v)) {
                    return v.length > 0;
                }
                else {
                    return (Object.keys(v)).length > 0;
                }
        }
    }
}

/**
 * d.get(k): None (null) when absent.
 */
export function Py_get(o, k) {
    const v = o[k];
    if (v == null) {
        return defaultOf();
    }
    else {
        return v;
    }
}

/**
 * d.get(k, []) for a list.
 */
export function Py_list(o, k) {
    const v = o[k];
    if (v == null) {
        return empty();
    }
    else {
        return ofArray(v);
    }
}

/**
 * Sorted, stable (Python's sort is stable too).
 */
export function Py_sortWith(cmp, xs) {
    return sortWith(cmp, xs);
}

export const PRONOUNCE = Py_rx("\\[([^\\]]+)\\]\\(([^)]+)\\)");

export const FOREIGN = Py_rx("\\{([a-z]{2,3}):([^{}]+)\\}");

export const BREAK = Py_rx("\\s*\\[(pause|think)(?:\\s+(\\d+(?:\\.\\d+)?))?\\]");

function breakDefault(_arg) {
    if (_arg === "pause") {
        return 1.5;
    }
    else {
        return 8;
    }
}

export const REST = Py_rx("\\s*\\[rest(?:\\s+(\\d+(?:\\.\\d+)?))?\\]");

const shieldEnd = Py_rx("[.!?]\\s*$");

const splitter = Py_rx("(?<=[.!?\\x01])\\s+(?=[\"\'“A-Z0-9\\[\\x00])");

const restoreRx = Py_rx("\\x00(\\d+)[\\x00\\x01]");

const openingBreaks = Py_rx("(?:\\[(?:pause|think)(?:\\s+[\\d.]+)?\\]\\s*)+");

/**
 * Split after . ! ? when a space and a capital, digit, quote or markup follows; keeps "e.g. the"
 * and "0.802" whole. {code:...} phrases are shielded first, so "{fr:Il est une heure.}" stays one
 * piece. A shielded phrase ends a sentence only when it ends in . ! ? itself (marked \x01): "is
 * {fr:moins le quart} [3:45] or..." is one sentence, "{fr:Il est midi.} Then..." is two.
 */
export function sentences(say_1) {
    const stripped = Py_strip(say_1);
    const shielded = toArray(map_3(Py_M__get_Value, Py_finditer(FOREIGN, stripped)));
    return reverse(fold((found, p) => {
        const matchValue = Py_matchStart(openingBreaks, p);
        let matchResult, before, last, m_3;
        if (matchValue != null) {
            if (!isEmpty(found)) {
                matchResult = 0;
                before = tail_1(found);
                last = head(found);
                m_3 = matchValue;
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
                const p_1 = Py_strip(substring(p, m_3.End));
                const found_1 = cons((last + " ") + Py_strip(Py_M__get_Value(m_3)), before);
                if (p_1 !== "") {
                    return cons(p_1, found_1);
                }
                else {
                    return found_1;
                }
            }
            default:
                if (p !== "") {
                    return cons(p, found);
                }
                else {
                    return found;
                }
        }
    }, empty(), map_3((arg) => Py_strip(Py_sub(restoreRx, (m_2) => item(parse(Py_M__G_Z524259A4(m_2, 1), 511, false, 32), shielded), arg)), filter((p_2) => (Py_strip(p_2) !== ""), Py_split(splitter, Py_subIndexed(FOREIGN, (i, m_1) => {
        const e = Py_found(shieldEnd, Py_M__G_Z524259A4(m_1, 2)) ? "\u0001" : "\u0000";
        return ("\u0000" + int32ToString(i)) + e;
    }, stripped))))));
}

/**
 * The silences a sentence asks for after it: [("pause", 1.5), ("think", 4.0)].
 */
export function breaks(s) {
    return map_3((m) => {
        let matchValue;
        const kind = Py_M__G_Z524259A4(m, 1);
        return [kind, (matchValue = Py_M__Group_Z524259A4(m, 2), (matchValue == null) ? breakDefault(kind) : parse_1(matchValue))];
    }, Py_finditer(BREAK, s));
}

export function shown(s) {
    return Py_strip(Py_sub(FOREIGN, (m_1) => Py_M__G_Z524259A4(m_1, 2), Py_sub(PRONOUNCE, (m) => Py_M__G_Z524259A4(m, 1), Py_sub(BREAK, (_arg_1) => "", Py_sub(REST, (_arg) => "", s)))));
}

const WPS = 2.4;

class Finding extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Error", "Warning"];
    }
}

function Finding_$reflection() {
    return union_type("Check.Finding", [], Finding, () => [[["Item", string_type]], [["Item", string_type]]]);
}

function idOf(s) {
    return s.id;
}

function rawSay(s) {
    const matchValue = Py_get(s, "say");
    if (equals(matchValue, defaultOf())) {
        return "";
    }
    else {
        return matchValue;
    }
}

function say(glossary, s) {
    return apply(glossary, rawSay(s));
}

function prefix(sid) {
    return item(0, split(sid, ["-"], undefined, 0));
}

function isWhy(sid) {
    return sid.endsWith("-why");
}

function sentencesOf(s) {
    return Py_list(s, "sentences");
}

function load(clip) {
    const scriptPath = join_1(ofArray([clip, "script.json"]));
    const script = readJson(scriptPath);
    const timingPath = join_1(ofArray([clip, "build", "timing.json"]));
    const timing = exists(timingPath) ? some(readJson(timingPath)) : undefined;
    return [((timing != null) && (mtime(timingPath) < mtime(scriptPath))) ? singleton(new Finding(/* Warning */ 1, ["build/timing.json is older than script.json: run `node engine/cli/Cv.js <clip> narrate` (cue checks use the old timing)"])) : empty(), script, timing];
}

const sceneIdRx = Py_rx("[a-z0-9]+(-[a-z0-9]+)*");

const endsSentence = Py_rx("[.!?]$");

const nextStarts = Py_rx("\\s+[A-Z\\\"\'“\\[0-9]");

const breakLike = Py_rx("\\[(?:pause|think|rest)[^\\]]*\\](?!\\()");

const breakForm = Py_rx("\\[(pause|think|rest)(\\s+\\d+(\\.\\d+)?)?\\]");

const restEdge = Py_rx("^\\s*\\[rest[^\\]]*\\]|\\[rest[^\\]]*\\]\\s*(?:\\[(?:pause|think)[^\\]]*\\]\\s*)*$");

const foreignAny = Py_rx("\\{[a-z]{2,3}:[^{}]+\\}");

const readToken = Py_rx("\\d[\\d,.]*\\s*(?:%|×|x\\b|ms\\b|µs\\b|ns\\b|GB|TB|PB|MB|KB|Gbps|Mbps|k\\b|M\\b|B\\b)?|[×÷≈→%/]|\\b[A-Z]{2,}\\b");

const smallNumber = Py_rx("\\d{1,2}");

function checkSentence(sid, i, sent) {
    const findings = toList(delay(() => append(collect((m) => (!Py_fullmatch(breakForm, Py_M__get_Value(m)) ? singleton_1(new Finding(/* Error */ 0, [`${sid}[${i}]: ${Py_reprStr(Py_M__get_Value(m))} is not a break marker ([pause], [pause 2], [think], [think 4], [rest], [rest 0.5]); the voice would read it`])) : empty_1()), Py_finditer(breakLike, sent)), delay(() => append(collect((m_1) => {
        let secs;
        const matchValue = Py_M__Group_Z524259A4(m_1, 1);
        let matchResult, secs_1;
        if (matchValue != null) {
            if ((secs = matchValue, !((0.15 <= parse_1(secs)) && (parse_1(secs) <= 1)))) {
                matchResult = 0;
                secs_1 = matchValue;
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
                return singleton_1(new Finding(/* Warning */ 1, [`${sid}[${i}]: [rest ${secs_1}] - a rest is 0.15 to 1 s; for a longer silence end the sentence and use [pause]`]));
            default: {
                return empty_1();
            }
        }
    }, Py_finditer(REST, sent)), delay(() => append(Py_found(restEdge, sent) ? singleton_1(new Finding(/* Warning */ 1, [`${sid}[${i}]: a [rest] goes between two items inside a sentence, not at its start or end`])) : empty_1(), delay(() => append(collect((matchValue_1) => {
        const secs_2 = matchValue_1[1];
        return !((0.5 <= secs_2) && (secs_2 <= 12)) ? singleton_1(new Finding(/* Warning */ 1, [`${sid}[${i}]: [${matchValue_1[0]} ${Py_g(secs_2)}] - keep breaks between 0.5 and 12 s`])) : empty_1();
    }, breaks(sent)), delay(() => {
        const words = length_1(Py_words(shown(sent))) | 0;
        return (words > 32) ? singleton_1(new Finding(/* Warning */ 1, [`${sid}[${i}]: ${words} words in one sentence (one caption); split it`])) : empty_1();
    }))))))))));
    const plain = Py_sub(foreignAny, (_arg_2) => "", Py_sub(PRONOUNCE, (_arg_1) => "", Py_sub(REST, (_arg) => "", sent)));
    return [findings, toList(delay(() => collect((m_2) => {
        const tok = Py_strip(Py_M__get_Value(m_2));
        return ((tok !== "") && !Py_fullmatch(smallNumber, tok)) ? singleton_1([tok, `${sid}[${i}]`]) : empty_1();
    }, Py_finditer(readToken, plain))))];
}

function checkScene(glossary, s) {
    const sid = idOf(s);
    const narration = say(glossary, s);
    const own = toList(delay(() => append(!Py_fullmatch(sceneIdRx, sid) ? singleton_1(new Finding(/* Error */ 0, [concat(sid, ": scene ids are lowercase words joined by \'-\' (the part before the first \'-\' names the module)")])) : empty_1(), delay(() => collect((m) => {
        const shownText = Py_M__G_Z524259A4(m, 1);
        const after = substring(narration, m.End, min(2, narration.length - m.End));
        return (Py_found(endsSentence, shownText) && (Py_matchStart(nextStarts, after + " ") != null)) ? singleton_1(new Finding(/* Error */ 0, [`${sid}: [${shownText}](...) ends a sentence inside the brackets; move the '${last_2(Array.from(shownText))}' outside, or the next sentence merges into this one`])) : empty_1();
    }, Py_finditer(PRONOUNCE, narration))))));
    const sentenceNotes = mapIndexed((i, sent) => checkSentence(sid, i, sent), sentences(narration));
    return [append_1(own, collect_1((tuple) => tuple[0], sentenceNotes)), collect_1((tuple_1) => tuple_1[1], sentenceNotes)];
}

function checkScript(glossary, script) {
    const scenes = Py_list(script, "scenes");
    const ids = map_3(idOf, scenes);
    const twice = toList(delay(() => map_2((i) => (new Finding(/* Error */ 0, [concat("scene id ", Py_reprStr(i), " is used twice")])), filter((x_1) => (length_1(filter((y_1) => (x_1 === y_1), ids)) > 1), List_distinct(ids, {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    })))));
    const perScene = map_3((s_1) => checkScene(glossary, s_1), scenes);
    return [append_1(twice, collect_1((tuple) => tuple[0], perScene)), collect_1((tuple_1) => tuple_1[1], perScene)];
}

function checkLong(clip, script) {
    const scenes = Py_list(script, "scenes");
    const whys = filter((arg) => isWhy(idOf(arg)), scenes);
    if (isEmpty(whys)) {
        return [false, empty()];
    }
    else {
        const prefixes = map_3((arg_1) => prefix(idOf(arg_1)), scenes);
        const card = Py_get(script, "card");
        const cardHas = (k) => {
            if (Py_truthy(card)) {
                return Py_truthy(Py_get(card, k));
            }
            else {
                return false;
            }
        };
        const arr = toArray(scenes);
        const keys = List_distinct(map_3((tuple) => tuple[0], filter((tupledArg) => {
            const s_2 = tupledArg[1];
            if (!isWhy(idOf(s_2)) && (idOf(s_2) !== "title")) {
                return !Py_truthy(Py_get(s_2, "recap"));
            }
            else {
                return false;
            }
        }, zip_1(prefixes, scenes))), {
            Equals: (x, y) => (x === y),
            GetHashCode: (x) => (stringHash(x) | 0),
        });
        return [true, toList(delay(() => append(collect((s_3) => (!Py_truthy(Py_get(s_3, "chapter")) ? singleton_1(new Finding(/* Error */ 0, [concat(idOf(s_3), ": a bridge scene needs \"chapter\": \"Title\" (the frame shows it on the title card)")])) : empty_1()), whys), delay(() => append((((idOf(head(scenes)) !== "title") ? true : !cardHas("course")) ? true : !cardHas("lesson")) ? singleton_1(new Finding(/* Error */ 0, ["a long video opens with a scene \"title\" and a top-level \"card\": {\"course\", \"lesson\", \"sub\"}, so the viewer knows the course and lesson before anything else"])) : empty_1(), delay(() => append(!contains("intro", prefixes, {
            Equals: (x_1, y_1) => (x_1 === y_1),
            GetHashCode: (x_1) => (stringHash(x_1) | 0),
        }) ? singleton_1(new Finding(/* Warning */ 1, ["no intro scene: a long video should open by stating its goal"])) : empty_1(), delay(() => append(!contains("outro", prefixes, {
            Equals: (x_2, y_2) => (x_2 === y_2),
            GetHashCode: (x_2) => (stringHash(x_2) | 0),
        }) ? singleton_1(new Finding(/* Warning */ 1, ["no outro scene: a long video should close on its goal"])) : empty_1(), delay(() => append(collect((matchValue) => {
            const s_4 = matchValue[1];
            const k_1 = matchValue[0] | 0;
            return (isWhy(idOf(s_4)) && ((((k_1 + 1) >= arr.length) ? true : isWhy(idOf(item(k_1 + 1, arr)))) ? true : (prefix(idOf(item(k_1 + 1, arr))) === "outro"))) ? singleton_1(new Finding(/* Error */ 0, [concat(idOf(s_4), ": chapter has no content scenes")])) : empty_1();
        }, indexed_1(arr)), delay(() => collect((key) => (!exists(join_1(ofArray([clip, key + ".js"]))) ? singleton_1(new Finding(/* Error */ 0, [`module ${Py_reprStr(key)} has no ${key}.js`])) : empty_1()), keys)))))))))))))];
    }
}

const SPEC = Py_rx("[\"\'`]([a-z0-9]+(?:-[a-z0-9]+)+)(?:\\|([^\"\'`|]+?)(\\$)?(?:\\|(\\d+))?|#(\\d+))?[\"\'`]");

const WORD_CALL = Py_rx("\\bword\\(\\s*[\"\'`]([a-z0-9]+(?:-[a-z0-9]+)+)[\"\'`]\\s*,\\s*[\"\'`]([^\"\'`]+)[\"\'`]");

const SCENE_CONST = Py_rx("(?:\\bconst|\\blet|,)\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*[\"\'`]([a-z0-9]+(?:-[a-z0-9]+)+)[\"\'`]");

const SCENE_REF = Py_rx("\\b([A-Za-z_][A-Za-z0-9_]*)\\s*\\+\\s*[\"\'`]((?:\\||#)[^\"\'`]*)[\"\'`]");

const CUE_CALL = Py_rx("\\b(?:cue|at|part)\\(\\s*[\"\'`]([a-z0-9]+(?:-[a-z0-9]+)+)[\"\'`]\\s*(?:,\\s*(-?\\d+))?");

const toastKinds = ofSeq(["idea", "tricky", "remember", "careful", "mistake", "surprise", "remark", "question", "tip"], {
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
});

function lower(s) {
    return s.toLocaleLowerCase();
}

function textOf(se) {
    return se.text;
}

function spokenOf(se) {
    const sp = Py_get(se, "spoken");
    if (Py_truthy(sp)) {
        return sp;
    }
    else {
        return textOf(se);
    }
}

function num(o, k) {
    return o[k];
}

function reportCues(timing, jsFiles) {
    const scenes = Py_list(timing, "scenes");
    const byId = map_3((s) => [idOf(s), s], scenes);
    const sceneOf = (sid) => {
        const option_1 = tryFindBack((tupledArg) => (tupledArg[0] === sid), byId);
        if (option_1 != null) {
            return some(option_1[1]);
        }
        else {
            return undefined;
        }
    };
    const hasScene = (sid_1) => (sceneOf(sid_1) != null);
    const nSentences = (sid_2) => (length_1(sentencesOf(value_1(sceneOf(sid_2)))) | 0);
    const hasPhrase = (sid_3, phrase, nth) => {
        const units = map_3((u) => [lower(spokenOf(u)), lower(textOf(u))], collect_1((se) => {
            const matchValue = Py_list(se, "parts");
            if (length_1(matchValue) > 1) {
                return matchValue;
            }
            else {
                return singleton(se);
            }
        }, sentencesOf(value_1(sceneOf(sid_3)))));
        const want = lower(phrase);
        return exists_1((field) => (sumBy((u_1) => (Py_count(field(u_1), want) | 0), units, {
            GetZero: () => 0,
            Add: (x, y) => ((x + y) | 0),
        }) >= nth), ofArray([(tuple_1) => tuple_1[0], (tuple_2) => tuple_2[1]]));
    };
    const cues = collect_1((file) => {
        const name_1 = basename(file);
        return concat_1(mapFold((names, tupledArg_1) => {
            let name, ln, line;
            const line_1 = tupledArg_1[1];
            if (Py_strip(line_1).startsWith("//")) {
                return [empty(), names];
            }
            else {
                const names_2 = fold((names_1, d) => add_1(Py_M__G_Z524259A4(d, 1), Py_M__G_Z524259A4(d, 2), names_1), names, Py_finditer(SCENE_CONST, line_1));
                return [(name = name_1, (ln = ((tupledArg_1[0] + 1) | 0), (line = Py_sub(SCENE_REF, (m_3) => {
                    const matchValue_8 = tryFind_1(Py_M__G_Z524259A4(m_3, 1), names_2);
                    if (matchValue_8 == null) {
                        return Py_M__get_Value(m_3);
                    }
                    else {
                        return (("\"" + matchValue_8) + Py_M__G_Z524259A4(m_3, 2)) + "\"";
                    }
                }, line_1), toList(delay(() => append(collect((m) => {
                    let nth_1;
                    const sid_4 = Py_M__G_Z524259A4(m, 1);
                    const whole = Py_M__get_Value(m);
                    if (!((prefix(sid_4) === "k") ? true : ((!hasScene(sid_4) && !(whole.indexOf("|") >= 0)) && !(whole.indexOf("#") >= 0)))) {
                        if (!hasScene(sid_4)) {
                            return singleton_1(new Finding(/* Error */ 0, [`${name}:${ln}: no scene ${Py_reprStr(sid_4)}`]));
                        }
                        else {
                            const matchValue_1 = Py_M__Group_Z524259A4(m, 2);
                            const matchValue_2 = Py_M__Group_Z524259A4(m, 4);
                            const matchValue_3 = Py_M__Group_Z524259A4(m, 5);
                            let matchResult, nth_2, phrase_2, sent_1;
                            if (matchValue_1 == null) {
                                if (matchValue_3 != null) {
                                    if (parse(matchValue_3, 511, false, 32) >= nSentences(sid_4)) {
                                        matchResult = 2;
                                        sent_1 = matchValue_3;
                                    }
                                    else {
                                        matchResult = 3;
                                    }
                                }
                                else {
                                    matchResult = 3;
                                }
                            }
                            else if ((nth_1 = matchValue_2, !hasPhrase(sid_4, matchValue_1, (nth_1 == null) ? 1 : parse(nth_1, 511, false, 32)))) {
                                matchResult = 0;
                                nth_2 = matchValue_2;
                                phrase_2 = matchValue_1;
                            }
                            else {
                                matchResult = 1;
                            }
                            switch (matchResult) {
                                case 0: {
                                    const times = (nth_2 == null) ? "" : concat(" ", nth_2, " times");
                                    return singleton_1(new Finding(/* Error */ 0, [`${name}:${ln}: ${Py_reprStr(phrase_2)} is not spoken in ${sid_4}${times}`]));
                                }
                                case 1: {
                                    return empty_1();
                                }
                                case 2:
                                    return singleton_1(new Finding(/* Error */ 0, [`${name}:${ln}: ${sid_4} has ${nSentences(sid_4)} sentence(s), asked for #${sent_1}`]));
                                default: {
                                    return empty_1();
                                }
                            }
                        }
                    }
                    else {
                        return empty_1();
                    }
                }, Py_finditer(SPEC, line)), delay(() => append(collect((m_1) => {
                    const sid_5 = Py_M__G_Z524259A4(m_1, 1);
                    const phrase_3 = Py_M__G_Z524259A4(m_1, 2);
                    return (hasScene(sid_5) && !hasPhrase(sid_5, phrase_3, 1)) ? singleton_1(new Finding(/* Error */ 0, [`${name}:${ln}: word(${Py_reprStr(sid_5)}, ${Py_reprStr(phrase_3)}): not spoken there`])) : (!hasScene(sid_5) ? singleton_1(new Finding(/* Error */ 0, [`${name}:${ln}: no scene ${Py_reprStr(sid_5)}`])) : empty_1());
                }, Py_finditer(WORD_CALL, line)), delay(() => collect((m_2) => {
                    let i;
                    const sid_6 = Py_M__G_Z524259A4(m_2, 1);
                    if (!hasScene(sid_6)) {
                        return singleton_1(new Finding(/* Error */ 0, [`${name}:${ln}: no scene ${Py_reprStr(sid_6)}`]));
                    }
                    else {
                        const matchValue_7 = Py_M__Group_Z524259A4(m_2, 2);
                        let matchResult_1, i_1;
                        if (matchValue_7 != null) {
                            if ((i = matchValue_7, (parse(i, 511, false, 32) >= nSentences(sid_6)) ? true : (op_UnaryNegation_Int32(parse(i, 511, false, 32)) > nSentences(sid_6)))) {
                                matchResult_1 = 0;
                                i_1 = matchValue_7;
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
                                return singleton_1(new Finding(/* Error */ 0, [`${name}:${ln}: ${sid_6} has ${nSentences(sid_6)} sentence(s), asked for ${i_1}`]));
                            default: {
                                return empty_1();
                            }
                        }
                    }
                }, Py_finditer(CUE_CALL, line))))))))))), names_2];
            }
        }, empty_2({
            Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
        }), indexed(Py_splitlines(readText(file))))[0]);
    }, jsFiles);
    const toasts = toList(delay(() => collect((s_3) => collect((d_1) => {
        let s_2, at, sents, k, want_1;
        const kind = Py_get(d_1, "kind");
        const where = concat(idOf(s_3), " toast ", Py_repr(kind));
        const at_1 = Py_get(d_1, "at");
        const text_1 = Py_get(d_1, "text");
        return singleton_1([toList(delay(() => append(!(Py_isStr(kind) && FSharpSet__Contains(toastKinds, kind)) ? singleton_1(new Finding(/* Error */ 0, [concat(where, ": unknown kind; use one of ", join(", ", Py_sortWith((a, b) => (Py_cmpStr(a, b) | 0), toList_1(toastKinds))))])) : empty_1(), delay(() => append(((Py_truthy(at_1) && !Py_str(at_1).startsWith("#")) && !hasPhrase(idOf(s_3), Py_str(at_1), 1)) ? singleton_1(new Finding(/* Error */ 0, [`${where}: ${Py_repr(at_1)} is not spoken in ${idOf(s_3)}`])) : empty_1(), delay(() => ((Py_truthy(text_1) && (length_1(Py_words(text_1)) > 5)) ? singleton_1(new Finding(/* Warning */ 1, [concat(where, ": text ", Py_repr(text_1), " is long for a badge; keep it to about 4 words")])) : empty_1()))))))), [(s_2 = s_3, (at = at_1, (sents = toArray(sentencesOf(s_2)), (sents.length === 0) ? num(s_2, "start") : ((Py_truthy(at) && Py_str(at).startsWith("#")) ? ((k = (min(parse(substring(Py_str(at), 1), 511, false, 32), sents.length - 1) | 0), num(item((k < 0) ? (k + sents.length) : k, sents), "start"))) : (Py_truthy(at) ? ((want_1 = lower(Py_str(at)), defaultArg(tryPick((se_1) => tryPick_1((text) => {
            const k_1 = indexOf(text, want_1, 4) | 0;
            if (k_1 >= 0) {
                const start = num(se_1, "start");
                return start + (((num(se_1, "end") - start) * Py_len(substring(text, 0, k_1))) / max(Py_len(text), 1));
            }
            else {
                return undefined;
            }
        }, ofArray([lower(spokenOf(se_1)), lower(textOf(se_1))])), sents), num(item(0, sents), "start")))) : num(item(0, sents), "start")))))), kind, where]]);
    }, Py_list(s_3, "toasts")), scenes)));
    const seen = Py_sortWith((tupledArg_2, tupledArg_3) => {
        const c = comparePrimitives(tupledArg_2[0], tupledArg_3[0]) | 0;
        if (c !== 0) {
            return c | 0;
        }
        else {
            const c_1 = Py_cmpStr(Py_str(tupledArg_2[1]), Py_str(tupledArg_3[1])) | 0;
            if (c_1 !== 0) {
                return c_1 | 0;
            }
            else {
                return Py_cmpStr(tupledArg_2[2], tupledArg_3[2]) | 0;
            }
        }
    }, map_3((tuple_3) => tuple_3[1], toasts));
    const crowded = toList(delay(() => collect((matchValue_11) => {
        const b_2 = matchValue_11[1][0];
        const a_2 = matchValue_11[0][0];
        return ((b_2 - a_2) < 6) ? singleton_1(new Finding(/* Warning */ 1, [`toasts crowd: ${matchValue_11[0][2]} and ${matchValue_11[1][2]} are ${Py_fmtF(1, b_2 - a_2)} s apart (keep at least 6 s)`])) : empty_1();
    }, pairwise(seen))));
    if (!isEmpty(seen)) {
        Py_print(`toasts: ${join(", ", map_3((tupledArg_7) => (`${tupledArg_7[0]} ${tupledArg_7[1]}`), sortWith((tupledArg_5, tupledArg_6) => (comparePrimitives(tupledArg_6[1], tupledArg_5[1]) | 0), List_countBy((x_2) => x_2, map_3((tupledArg_4) => Py_str(tupledArg_4[1]), seen), {
            Equals: (x_3, y_2) => (x_3 === y_2),
            GetHashCode: (x_3) => (stringHash(x_3) | 0),
        }))))} (${length_1(seen)} total)`);
    }
    return append_1(cues, append_1(collect_1((tuple_4) => tuple_4[0], toasts), crowded));
}

function checkCues(timing, jsFiles) {
    if (timing != null) {
        return reportCues(value_1(timing), jsFiles);
    }
    else {
        return singleton(new Finding(/* Warning */ 1, ["no build/timing.json yet: cue checks skipped (run narrate first)"]));
    }
}

const NUM = Py_rx("(?<![\\w.])\\d+(?:[.,]\\d+)*");

const shorthand = Py_rx("(?<![\\w.])(\\d+(?:\\.\\d+)?)\\s*([kKMB])(?![a-zA-Z])");

const stringLit = Py_rx("\"((?:[^\"\\\\]|\\\\.)*)\"|\'((?:[^\'\\\\]|\\\\.)*)\'|`((?:[^`\\\\]|\\\\.)*)`");

const anyDigit = Py_rx("\\d");

const layoutish = Py_rx("\\d\\s*px\\b|\\b(?:left|top|width|height|margin|padding|translate|scale|rotate|rgba?)\\b|#[0-9a-f]{3}");

const svgPath = Py_rx("\\s*[MLCQZmlcqz][\\d\\s.,MLCQZmlcqz-]*");

const coords = Py_rx("[\\d\\s.,-]+");

function norm(n) {
    return replace(n, ",", "");
}

function checkLesson(glossary, script, jsFiles, lessonText) {
    const have = ofSeq(append_1(toList(delay(() => map_2((m) => norm(Py_M__get_Value(m)), Py_finditer(NUM, lessonText)))), toList(delay(() => collect((m_1) => {
        let mult;
        const matchValue = Py_M__G_Z524259A4(m_1, 2);
        switch (matchValue) {
            case "k":
            case "K": {
                mult = 1000;
                break;
            }
            case "M": {
                mult = 1000000;
                break;
            }
            default:
                mult = 1000000000;
        }
        const v = parse_1(Py_M__G_Z524259A4(m_1, 1)) * mult;
        return singleton_1((Number.isInteger(v)) ? Py_numStr(v, false) : Py_floatRepr(v));
    }, Py_finditer(shorthand, lessonText))))), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
    const seen = List_distinctBy((tuple) => tuple[0], append_1(toList(delay(() => collect((s) => map_2((m_2) => [norm(Py_M__get_Value(m_2)), concat("narration ", idOf(s))], Py_finditer(NUM, Py_sub(PRONOUNCE, (m_3) => Py_M__G_Z524259A4(m_3, 1), say(glossary, s)))), Py_list(script, "scenes")))), toList(delay(() => collect((file) => collect((matchValue_1) => {
        const line = matchValue_1[1];
        return !Py_strip(line).startsWith("//") ? collect((m_4) => {
            const text = pick((x_1) => x_1, m_4.Groups.slice(1, m_4.Groups.length));
            return !(((((!Py_found(anyDigit, text) ? true : Py_found(layoutish, text)) ? true : Py_fullmatch(svgPath, text)) ? true : Py_fullmatch(coords, text)) ? true : (text.indexOf("|") >= 0)) ? true : (text.indexOf("${") >= 0)) ? map_2((n) => [norm(Py_M__get_Value(n)), `${basename(file)}:${matchValue_1[0] + 1}`], Py_finditer(NUM, text)) : empty_1();
        }, Py_finditer(stringLit, line)) : empty_1();
    }, indexed(Py_splitlines(readText(file)))), jsFiles)))), {
        Equals: (x_2, y_1) => (x_2 === y_1),
        GetHashCode: (x_2) => (stringHash(x_2) | 0),
    });
    const small = ofSeq(append_1(toList(delay(() => map_2(int32ToString, rangeDouble(0, 1, 12)))), singleton("100")), {
        Compare: (x_3, y_2) => (comparePrimitives(x_3, y_2) | 0),
    });
    return map_3((tupledArg_3) => (new Finding(/* Warning */ 1, [concat(tupledArg_3[0], " (", tupledArg_3[1], ") does not appear in the lesson; check it is derived from lesson numbers, or drop it")])), Py_sortWith((tupledArg_1, tupledArg_2) => (Py_cmpStr(tupledArg_1[1], tupledArg_2[1]) | 0), filter((tupledArg) => {
        const n_1 = tupledArg[0];
        if (!FSharpSet__Contains(have, n_1)) {
            return !FSharpSet__Contains(small, n_1);
        }
        else {
            return false;
        }
    }, seen)));
}

const CONNECTIVES = ofArray(["so", "therefore", "hence", "that\'s why", "which is why", "this is why", "because", "as a result", "that means", "this means", "which means", "in other words", "but", "however", "on the other hand", "instead", "even so", "whereas", "unlike", "remember", "recall", "as we saw", "earlier", "back in", "you saw", "now", "next", "first", "then", "finally", "in short", "here\'s", "here is", "the tricky part", "the catch", "the key point", "the key idea", "the question is", "notice", "watch", "careful", "surprisingly", "it turns out", "the trap", "a common mistake", "easy to miss", "perhaps", "similarly", "likewise", "after all", "in fact", "as you know", "for example", "for instance", "you might", "imagine", "suppose", "what if"]);

const CONN_RE = Py_rxI(("\\b(" + join("|", map_3(Py_escape, sortWith((a, b) => (comparePrimitives(b.length, a.length) | 0), CONNECTIVES)))) + ")\\b");

const FLOW_MIN = 0.4;

function chapters(scenes, each) {
    const patternInput = fold((tupledArg, s_2) => {
        let s, s_1, c;
        const finished = tupledArg[0];
        const name = tupledArg[1];
        const items = tupledArg[2];
        if ((s = s_2, isWhy(idOf(s)) ? true : (prefix(idOf(s)) === "outro"))) {
            return [cons([name, reverse(items)], finished), (s_1 = s_2, (c = Py_get(s_1, "chapter"), Py_truthy(c) ? Py_str(c) : idOf(s_1))), singleton(each(s_2))];
        }
        else {
            return [finished, name, cons(each(s_2), items)];
        }
    }, [empty(), "intro", empty()], scenes);
    return reverse(cons([patternInput[1], reverse(patternInput[2])], patternInput[0]));
}

function reportFlow(glossary, script, longVideo) {
    const perChapter = map_3((tupledArg) => [tupledArg[0], concat_1(tupledArg[1])], chapters(Py_list(script, "scenes"), (s) => map_3((sent) => map_3((m) => lower(Py_M__G_Z524259A4(m, 1)), Py_finditer(CONN_RE, shown(sent))), sentences(say(glossary, s)))));
    const used = List_countBy((x) => x, collect_1((arg) => concat_1(arg[1]), perChapter), {
        Equals: (x_1, y) => (x_1 === y),
        GetHashCode: (x_1) => (stringHash(x_1) | 0),
    });
    const rows = filter((tupledArg_2) => (tupledArg_2[1] > 0), map_3((tupledArg_1) => {
        const opens = tupledArg_1[1];
        return [tupledArg_1[0], length_1(opens), length_1(filter((arg_1) => !isEmpty(arg_1), opens))];
    }, perChapter));
    const matchValue = sumBy((tupledArg_3) => (tupledArg_3[1] | 0), rows, {
        GetZero: () => 0,
        Add: (x_2, y_1) => ((x_2 + y_1) | 0),
    }) | 0;
    const totalLinked = sumBy((tupledArg_4) => (tupledArg_4[2] | 0), rows, {
        GetZero: () => 0,
        Add: (x_3, y_2) => ((x_3 + y_2) | 0),
    }) | 0;
    const total = matchValue | 0;
    if (total === 0) {
        return empty();
    }
    else {
        Py_print(`flow: ${totalLinked}/${total} sentences link to what came before (${Py_pct(0, totalLinked / total)})`);
        if (longVideo) {
            const enumerator = getEnumerator(rows);
            try {
                while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                    const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    const l_1 = forLoopVar[2] | 0;
                    const k = forLoopVar[1] | 0;
                    Py_print(`  ${padLeft(int32ToString(l_1), 3)}/${padRight(int32ToString(k), 3)} ${padLeft(Py_pct(0, l_1 / k), 4)}  ${forLoopVar[0]}`);
                }
            }
            finally {
                disposeSafe(enumerator);
            }
        }
        const top = sortWith((tupledArg_5, tupledArg_6) => (comparePrimitives(tupledArg_6[1], tupledArg_5[1]) | 0), used);
        Py_print("  most used: " + join(", ", map_3((tupledArg_7) => (`${tupledArg_7[0]} ${tupledArg_7[1]}`), truncate(8, top))));
        return toList(delay(() => append(collect((matchValue_2) => {
            const l_2 = matchValue_2[2] | 0;
            const k_1 = matchValue_2[1] | 0;
            return ((k_1 >= 4) && ((l_2 / k_1) < FLOW_MIN)) ? singleton_1(new Finding(/* Warning */ 1, [`flow: ${matchValue_2[0]}: only ${l_2} of ${k_1} sentences link to the one before; add connectives (so, but, remember, the tricky part, ...)`])) : empty_1();
        }, rows), delay(() => collect((matchValue_3) => {
            const c_1 = matchValue_3[1] | 0;
            return ((c_1 >= 6) && ((c_1 / max(1, totalLinked)) > 0.25)) ? singleton_1(new Finding(/* Warning */ 1, [`flow: '${matchValue_3[0]}' opens ${c_1} of ${totalLinked} linked sentences; vary the connectives`])) : empty_1();
        }, truncate(3, top))))));
    }
}

function reportBreathingWith(timing, longVideo) {
    let patternInput_2;
    const scenes = Py_list(timing, "scenes");
    const sents = toArray(collect_1(sentencesOf, scenes));
    if (sents.length < 2) {
        return empty();
    }
    else {
        const start = (x) => num(x, "start");
        const stop = (x_1) => num(x_1, "end");
        const talk = sumBy_1((x_2) => (stop(x_2) - start(x_2)), sents, {
            GetZero: () => 0,
            Add: (x_3, y) => (x_3 + y),
        });
        const dur = num(timing, "duration");
        const patternInput = fold_1((tupledArg, tupledArg_1) => {
            const longest = tupledArg[0];
            const runStart = tupledArg[1];
            const where = tupledArg[2];
            const a = tupledArg_1[0];
            const b = tupledArg_1[1];
            if ((start(b) - stop(a)) >= 1.5) {
                if ((stop(a) - runStart) > longest) {
                    return [stop(a) - runStart, start(b), a];
                }
                else {
                    return [longest, start(b), where];
                }
            }
            else {
                return [longest, runStart, where];
            }
        }, [0, start(item(0, sents)), item(0, sents)], pairwise_1(sents));
        const runStart_1 = patternInput[1];
        const longest_1 = patternInput[0];
        const lastS = last_2(sents);
        const patternInput_1 = ((stop(lastS) - runStart_1) > longest_1) ? [stop(lastS) - runStart_1, lastS] : [longest_1, patternInput[2]];
        const where_2 = patternInput_1[1];
        const longest_2 = patternInput_1[0];
        const isThink = (b_1) => (b_1.kind === "think");
        const thinks = sumBy((s_1) => (length_1(filter(isThink, Py_list(s_1, "breaks"))) | 0), scenes, {
            GetZero: () => 0,
            Add: (x_4, y_1) => ((x_4 + y_1) | 0),
        }) | 0;
        const recaps = length_1(filter((s_2) => Py_truthy(Py_get(s_2, "recap")), scenes)) | 0;
        Py_print((`breathe: talking ${Py_pct(0, talk / dur)} of ${Py_fmtF(1, dur / 60)} min; longest stretch without a 1.5 s pause `) + (`${Py_fmtF(0, longest_2)} s (ends ${Py_fmtF(0, stop(where_2))} s); ${thinks} think, ${recaps} recap`));
        return append_1(toList(delay(() => collect((s_3) => {
            const recap = Py_get(s_3, "recap");
            const nRecap = (Py_truthy(recap) ? recap.length : 0) | 0;
            const nSent = length_1(sentencesOf(s_3)) | 0;
            return (Py_truthy(recap) && (nRecap > nSent)) ? singleton_1(new Finding(/* Warning */ 1, [(`recap: ${idOf(s_3)} has ${nRecap} lines but ${nSent} sentences; `) + "line i appears on sentence i, so the extra lines arrive late - speak one sentence per line"])) : empty_1();
        }, scenes))), !longVideo ? empty() : ((patternInput_2 = mapFold((tupledArg_2, s_4) => {
            const chapter = tupledArg_2[0];
            const has = tupledArg_2[1];
            const helps = Py_truthy(Py_get(s_4, "recap")) ? true : exists_1(isThink, Py_list(s_4, "breaks"));
            if (isWhy(idOf(s_4)) ? true : (prefix(idOf(s_4)) === "outro")) {
                return [(Py_truthy(chapter) && !has) ? singleton(new Finding(/* Warning */ 1, [concat("breathe: chapter ", Py_repr(chapter), " has no recap scene and no [think]")])) : empty(), [isWhy(idOf(s_4)) ? Py_get(s_4, "chapter") : defaultOf(), helps]];
            }
            else {
                return [empty(), [chapter, has ? true : helps]];
            }
        }, [defaultOf(), false], append_1(scenes, singleton({
            id: "outro-end",
            sentences: [],
        }))), toList(delay(() => append((longest_2 > 45) ? singleton_1(new Finding(/* Warning */ 1, [`breathe: ${Py_fmtF(0, longest_2)} s of talk without a 1.5 s pause (ending at ${Py_fmtF(0, stop(where_2))} s); add a [pause] after a key point`])) : empty_1(), delay(() => append(((talk / dur) > 0.82) ? singleton_1(new Finding(/* Warning */ 1, [concat("breathe: talking ", Py_pct(0, talk / dur), " of the time; aim for 72-78% with [pause], [think] and recap scenes")])) : empty_1(), delay(() => concat_1(patternInput_2[0]))))))))));
    }
}

function reportBreathing(timing, longVideo) {
    if (timing == null) {
        return empty();
    }
    else {
        return reportBreathingWith(value_1(timing), longVideo);
    }
}

export const lengthCaps = ofArray([["short", 5.5], ["tour", 11], ["deep", 29]]);

function reportDuration(clip, timing) {
    if (timing != null) {
        const minutes = num(value_1(timing), "duration") / 60;
        Py_print(concat("video:  ", Py_fmtF(1, minutes), " min with pauses, cards and recaps"));
        const briefPath = join_1(ofArray([clip, "brief.json"]));
        if (exists(briefPath)) {
            const length = Py_str(Py_get(readJson(briefPath), "length"));
            const matchValue = tryFind_2((tupledArg) => (tupledArg[0] === length), lengthCaps);
            let matchResult, cap_1;
            if (matchValue != null) {
                if (minutes > matchValue[1]) {
                    matchResult = 0;
                    cap_1 = matchValue[1];
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
                    return singleton(new Finding(/* Warning */ 1, [`the video runs ${Py_fmtF(1, minutes)} min, over the ${Py_g(cap_1)} min cap of a '${length}' video: cut sentences or a scene`]));
                default:
                    return empty();
            }
        }
        else {
            return empty();
        }
    }
    else {
        return empty();
    }
}

function reportLength(glossary, script, longVideo) {
    const rows = filter((tupledArg_1) => (tupledArg_1[1] > 0), map_3((tupledArg) => [tupledArg[0], sum(tupledArg[1], {
        GetZero: () => 0,
        Add: (x, y) => ((x + y) | 0),
    })], chapters(Py_list(script, "scenes"), (s) => (length_1(Py_words(shown(say(glossary, s)))) | 0))));
    const total = sumBy((tuple) => (tuple[1] | 0), rows, {
        GetZero: () => 0,
        Add: (x_1, y_1) => ((x_1 + y_1) | 0),
    }) | 0;
    Py_print(`length: ${total} words ≈ ${Py_fmtF(1, (total / WPS) / 60)} min spoken (plus pauses)`);
    if (longVideo) {
        const enumerator = getEnumerator(rows);
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const w_1 = forLoopVar[1] | 0;
                Py_print(`  ${padLeft(int32ToString(w_1), 5)} words  ≈ ${Py_fixedW(4, 1, (w_1 / WPS) / 60)} min  ${forLoopVar[0]}`);
            }
        }
        finally {
            disposeSafe(enumerator);
        }
    }
}

const K_MAP = Py_rx("\\bK\\.map\\s*\\(");

export const patternInput$00401061 = [1.2, 1.9];

export const VISIT_TAIL = patternInput$00401061[1];

const VISIT_LEAD = patternInput$00401061[0];

function checkMap(script, jsFiles, lesson) {
    const scenes = Py_list(script, "scenes");
    const map = Py_get(script, "map");
    const field = (o, k) => {
        if ((o !== null && typeof o === 'object' && !Array.isArray(o))) {
            return Py_get(o, k);
        }
        else {
            return defaultOf();
        }
    };
    const text = (o_1, k_1) => {
        const v = field(o_1, k_1);
        if (Py_isStr(v)) {
            return Py_str(v);
        }
        else {
            return "";
        }
    };
    const number = (o_2, k_2, d) => {
        const v_1 = field(o_2, k_2);
        if ((typeof v_1 === 'number')) {
            return v_1;
        }
        else {
            return d;
        }
    };
    const hasPath = (s_1) => !Operators_IsNull(Py_get(s_1, "path"));
    const insideOf = (s_2) => text(s_2, "inside");
    if (!Py_truthy(map)) {
        return toList(delay(() => append(collect((s_3) => append(hasPath(s_3) ? singleton_1(new Finding(/* Error */ 0, [concat(idOf(s_3), ": \"path\" needs a top-level \"map\" in script.json")])) : empty_1(), delay(() => (!Operators_IsNull(Py_get(s_3, "inside")) ? singleton_1(new Finding(/* Error */ 0, [concat(idOf(s_3), ": \"inside\" needs a top-level \"map\" in script.json")])) : empty_1()))), scenes), delay(() => collect((file) => ((Py_search(K_MAP, readText(file)) != null) ? singleton_1(new Finding(/* Error */ 0, [concat(basename(file), ": K.map needs a top-level \"map\" in script.json")])) : empty_1()), jsFiles)))));
    }
    else {
        const kinds = Py_get(map, "kinds");
        const notObjects = (what, xs) => toList(delay(() => collect((matchValue) => (!((matchValue[1] !== null && typeof matchValue[1] === 'object' && !Array.isArray(matchValue[1]))) ? singleton_1(new Finding(/* Error */ 0, [`map: ${what} ${matchValue[0]} is not an object`])) : empty_1()), indexed(xs))));
        const rawParts = Py_list(map, "parts");
        const rawEdges = Py_list(map, "edges");
        const parts = filter((v_3) => ((v_3 !== null && typeof v_3 === 'object' && !Array.isArray(v_3))), rawParts);
        const edges = filter((v_4) => ((v_4 !== null && typeof v_4 === 'object' && !Array.isArray(v_4))), rawEdges);
        const ids = filter((y) => ("" !== y), map_3((p) => text(p, "id"), parts));
        const cell = (p_1) => [number(p_1, "col", -1), number(p_1, "row", -1)];
        const known = (id) => contains(id, ids, {
            Equals: (x_2, y_1) => (x_2 === y_1),
            GetHashCode: (x_2) => (stringHash(x_2) | 0),
        });
        const byId = (id_1) => find((p_2) => (text(p_2, "id") === id_1), parts);
        const arr = toArray(scenes);
        return toList(delay(() => append(notObjects("part", rawParts), delay(() => append(notObjects("edge", rawEdges), delay(() => append(((length_1(parts) < 2) ? true : (length_1(parts) > 7)) ? singleton_1(new Finding(/* Error */ 0, [`map: ${length_1(parts)} parts; a map has 2 to 7 (more do not fit at a readable size)`])) : empty_1(), delay(() => append(Py_truthy(kinds) ? collect((k_3) => {
            const kind = Py_get(kinds, k_3);
            return (!Py_truthy(Py_get(kind, "tone")) ? true : !Py_truthy(Py_get(kind, "icon"))) ? singleton_1(new Finding(/* Error */ 0, [concat("map: kind ", Py_reprStr(k_3), " needs a \"tone\" and an \"icon\"")])) : empty_1();
        }, Object.keys(kinds)) : empty_1(), delay(() => append(collect((matchValue_5) => {
            const p_3 = matchValue_5[1];
            const id_2 = text(p_3, "id");
            const name = (id_2 === "") ? (`part ${matchValue_5[0]}`) : concat("part ", Py_reprStr(id_2));
            return append(collect((k_4) => ((text(p_3, k_4) === "") ? singleton_1(new Finding(/* Error */ 0, [`map: ${name} has no "${k_4}"`])) : empty_1()), ["id", "label", "kind"]), delay(() => {
                const kind_1 = text(p_3, "kind");
                return append(((kind_1 !== "") && !(Py_truthy(kinds) && Py_truthy(Py_get(kinds, kind_1)))) ? singleton_1(new Finding(/* Error */ 0, [`map: ${name} has kind ${Py_reprStr(kind_1)}, which is not in "kinds"`])) : empty_1(), delay(() => append(collect((matchValue_6) => {
                    const top = matchValue_6[1] | 0;
                    const k_5 = matchValue_6[0];
                    const v_5 = field(p_3, k_5);
                    return Operators_IsNull(v_5) ? singleton_1(new Finding(/* Error */ 0, [`map: ${name} has no "${k_5}"`])) : (((!(Number.isInteger(v_5)) ? true : (v_5 < 0)) ? true : (v_5 > top)) ? singleton_1(new Finding(/* Error */ 0, [`map: ${name} has "${k_5}": ${JSON.stringify(v_5)}; the grid's ${k_5}s are 0 to ${top}`])) : empty_1());
                }, [["col", 3], ["row", 2]]), delay(() => {
                    const badge = field(p_3, "badge");
                    return append((!Operators_IsNull(badge) && (!Py_isStr(badge) ? true : (Py_len(Py_str(badge)) > 10))) ? singleton_1(new Finding(/* Error */ 0, [concat("map: the badge of ", name, " is a word of at most 10 characters (\"new\", \"changed\")")])) : empty_1(), delay(() => {
                        const label = text(p_3, "label");
                        return (Py_len(label) > 12) ? singleton_1(new Finding(/* Error */ 0, [`map: the label ${Py_reprStr(label)} of ${name} is ${Py_len(label)} characters; at most 12 fit a box`])) : empty_1();
                    }));
                }))));
            }));
        }, indexed(parts)), delay(() => append(collect((matchValue_7) => {
            const n = matchValue_7[1] | 0;
            return (n > 1) ? singleton_1(new Finding(/* Error */ 0, [`map: ${n} parts have the id ${Py_reprStr(matchValue_7[0])}`])) : empty_1();
        }, List_countBy((x_3) => x_3, ids, {
            Equals: (x_4, y_2) => (x_4 === y_2),
            GetHashCode: (x_4) => (stringHash(x_4) | 0),
        })), delay(() => append(collect((matchValue_8) => {
            const row = matchValue_8[0][1];
            const ps = matchValue_8[1];
            const col = matchValue_8[0][0];
            return (((length_1(ps) > 1) && (col >= 0)) && (row >= 0)) ? singleton_1(new Finding(/* Error */ 0, [`map: ${join(" and ", map_3((p_4) => text(p_4, "id"), ps))} share the cell col ${col}, row ${row}`])) : empty_1();
        }, List_groupBy(cell, parts, {
            Equals: equalArrays,
            GetHashCode: (x_5) => (arrayHash(x_5) | 0),
        })), delay(() => append(collect((e_1) => {
            const matchValue_9 = text(e_1, "from");
            const b_1 = text(e_1, "to");
            const a_1 = matchValue_9;
            return append(collect((id_4) => (!known(id_4) ? singleton_1(new Finding(/* Error */ 0, [concat("map: an edge names ", Py_reprStr(id_4), ", which is not a part")])) : empty_1()), [a_1, b_1]), delay(() => {
                if ((a_1 !== "") && (a_1 === b_1)) {
                    return singleton_1(new Finding(/* Error */ 0, [concat("map: an edge joins ", a_1, " to itself")]));
                }
                else if (known(a_1) && known(b_1)) {
                    const matchValue_11 = cell(byId(a_1));
                    const matchValue_12 = cell(byId(b_1));
                    const r2 = matchValue_12[1];
                    const r1 = matchValue_11[1];
                    const c2 = matchValue_12[0];
                    const c1 = matchValue_11[0];
                    return collect((p_5) => {
                        const patternInput_4 = cell(p_5);
                        const r = patternInput_4[1];
                        const c = patternInput_4[0];
                        const between = (x_6, x1, x2) => {
                            if (compare(x_6, min_1((x_7, y_4) => (compare(x_7, y_4) | 0), x1, x2)) > 0) {
                                return compare(x_6, max_1((x_8, y_5) => (compare(x_8, y_5) | 0), x1, x2)) < 0;
                            }
                            else {
                                return false;
                            }
                        };
                        const crossed = text(p_5, "id");
                        const straight = (((r1 === r2) && (r === r1)) && between(c, c1, c2)) ? true : (((c1 === c2) && (c === c1)) && between(r, r1, r2));
                        const onWay = (tupledArg, tupledArg_1) => {
                            const ca = tupledArg[0];
                            const rb = tupledArg[3];
                            const c_1 = tupledArg_1[0];
                            const r_1 = tupledArg_1[1];
                            if (equals(c_1, ca) && between(r_1, tupledArg[1], rb)) {
                                return true;
                            }
                            else if (equals(r_1, rb)) {
                                if (equals(c_1, ca)) {
                                    return true;
                                }
                                else {
                                    return between(c_1, ca, tupledArg[2]);
                                }
                            }
                            else {
                                return false;
                            }
                        };
                        const curved = (((r1 !== r2) && (c1 !== c2)) && onWay([c1, r1, c2, r2], [c, r])) && exists_1((q) => onWay([c2, r2, c1, r1], cell(q)), parts);
                        return (straight ? true : curved) ? singleton_1(new Finding(/* Warning */ 1, [`map: the edge ${a_1} -> ${b_1} would cross ${crossed}; move a part, or route the edge through it`])) : empty_1();
                    }, parts);
                }
                else {
                    return empty_1();
                }
            }));
        }, edges), delay(() => append(collect((s_4) => {
            let path;
            const sid = idOf(s_4);
            return append(hasPath(s_4) ? ((path = map_3(Py_str, Py_list(s_4, "path")), append(!isWhy(sid) ? singleton_1(new Finding(/* Error */ 0, [concat(sid, ": \"path\" belongs on a chapter\'s bridge scene (one ending in -why)")])) : empty_1(), delay(() => append((length_1(path) < 2) ? singleton_1(new Finding(/* Error */ 0, [concat(sid, ": a path names at least 2 parts")])) : empty_1(), delay(() => append(collect((id_5) => (!known(id_5) ? singleton_1(new Finding(/* Error */ 0, [concat(sid, ": the path names ", Py_reprStr(id_5), ", which is not a part of the map")])) : empty_1()), path), delay(() => collect((matchValue_13) => {
                let a, b;
                const b_2 = matchValue_13[1];
                const a_2 = matchValue_13[0];
                return (((known(a_2) && known(b_2)) && !((a = a_2, (b = b_2, exists_1((e) => {
                    if ((text(e, "from") === a) && (text(e, "to") === b)) {
                        return true;
                    }
                    else if (text(e, "from") === b) {
                        return text(e, "to") === a;
                    }
                    else {
                        return false;
                    }
                }, edges))))) && (text(script, "kind") !== "progress")) ? singleton_1(new Finding(/* Error */ 0, [`${sid}: the path goes from ${a_2} to ${b_2}, but the map has no edge between them`])) : empty_1();
            }, pairwise(path)))))))))) : empty_1(), delay(() => {
                const inside = insideOf(s_4);
                return append(((inside === "") && !Operators_IsNull(Py_get(s_4, "inside"))) ? singleton_1(new Finding(/* Error */ 0, [concat(sid, ": \"inside\" is the id of one part of the map, as a string")])) : empty_1(), delay(() => ((inside !== "") ? append(!known(inside) ? singleton_1(new Finding(/* Error */ 0, [concat(sid, ": \"inside\": ", Py_reprStr(inside), " is not a part of the map")])) : empty_1(), delay(() => ((isWhy(sid) ? true : Py_truthy(Py_get(s_4, "recap"))) ? singleton_1(new Finding(/* Error */ 0, [concat(sid, ": \"inside\" cannot be on a bridge or recap scene (the frame draws those; no module is inside anything there)")])) : empty_1()))) : empty_1())));
            }));
        }, scenes), delay(() => append(collect((matchValue_14) => {
            const s_5 = matchValue_14[1];
            const k_6 = matchValue_14[0] | 0;
            const inside_1 = insideOf(s_5);
            if (inside_1 !== "") {
                const first = (k_6 === 0) ? true : (insideOf(item(k_6 - 1, arr)) !== inside_1);
                const last = (k_6 === (arr.length - 1)) ? true : (insideOf(item(k_6 + 1, arr)) !== inside_1);
                const lead = number(s_5, "lead", 0.4);
                const tail = number(s_5, "pad", 0.9) + number(s_5, "hold", 0);
                return append((first && (lead < VISIT_LEAD)) ? singleton_1(new Finding(/* Warning */ 1, [`${idOf(s_5)}: the zoom into ${inside_1} takes ${VISIT_LEAD} s; give this scene "lead": ${VISIT_LEAD} or more (it has ${lead})`])) : empty_1(), delay(() => (((last && (k_6 < (arr.length - 1))) && (tail < VISIT_TAIL)) ? singleton_1(new Finding(/* Warning */ 1, [`${idOf(s_5)}: the zoom out of ${inside_1} needs "pad" plus "hold" of ${VISIT_TAIL} s or more (it has ${tail})`])) : empty_1())));
            }
            else {
                return empty_1();
            }
        }, indexed_1(arr)), delay(() => append(!exists_1(hasPath, scenes) ? singleton_1(new Finding(/* Warning */ 1, ["map: no bridge scene has a \"path\", so the map never opens a chapter"])) : empty_1(), delay(() => {
            const matchValue_15 = lesson;
            if (matchValue_15 == null) {
                return empty_1();
            }
            else {
                const doc_1 = lower(matchValue_15);
                return collect((p_6) => {
                    const label_1 = text(p_6, "label");
                    return ((label_1 !== "") && !(doc_1.indexOf(lower(label_1)) >= 0)) ? singleton_1(new Finding(/* Warning */ 1, [concat("map: the label ", Py_reprStr(label_1), " does not appear in the document")])) : empty_1();
                }, parts);
            }
        }))))))))))))))))))))))));
    }
}

function reportGlossary(glossary, script) {
    const uses = sortBy((tupledArg) => tupledArg[0][0].toLocaleLowerCase(), List_countBy((x) => x, collect_1((s) => uses_1(glossary, rawSay(s)), Py_list(script, "scenes")), {
        Equals: equalArrays,
        GetHashCode: (x_1) => (arrayHash(x_1) | 0),
    }), {
        Compare: (x_2, y_1) => (comparePrimitives(x_2, y_1) | 0),
    });
    if (!isEmpty(uses)) {
        Py_print(`glossary: ${length_1(uses)} term(s) said its way (engine/glossary.json, <repo>/.codebase-video/glossary.json)`);
        const enumerator = getEnumerator(uses);
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const n = forLoopVar[1] | 0;
                Py_print(`  ${forLoopVar[0][0]} -> ${forLoopVar[0][1]}${(n > 1) ? (`  x${n}`) : ""}`);
            }
        }
        finally {
            disposeSafe(enumerator);
        }
    }
}

export function run(ws, args) {
    let option_1;
    const clip = ws;
    let lesson;
    const matchValue = tryFindIndex((y) => ("--lesson" === y), args);
    lesson = ((matchValue == null) ? undefined : resolve(item_1(matchValue + 1, args)));
    const glossary = load_1(clip);
    const patternInput = load(clip);
    const timing = patternInput[2];
    const script = patternInput[1];
    const jsFiles = map_3((n_1) => join_1(ofArray([clip, n_1])), Py_sortWith((a, b) => (Py_cmpStr(a, b) | 0), filter((n) => n.endsWith(".js"), readDir(clip))));
    const patternInput_1 = checkScript(glossary, script);
    const ok = ofSeq(map_3(Py_str, Py_list(script, "readsFine")), {
        Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
    });
    const readAsWritten = toList(delay(() => collect((matchValue_1) => {
        const tok = matchValue_1[0];
        if (!FSharpSet__Contains(ok, tok)) {
            const where = map_3((tuple) => tuple[1], matchValue_1[1]);
            return singleton_1(new Finding(/* Warning */ 1, [`'${tok}' is read as written (${join(", ", truncate(4, where))}${(length_1(where) > 4) ? " …" : ""}): wrap it as [${tok}](how to say it), or list it in "readsFine" once checked by ear`]));
        }
        else {
            return empty_1();
        }
    }, List_groupBy((tuple_1) => tuple_1[0], patternInput_1[1], {
        Equals: (x_2, y_2) => (x_2 === y_2),
        GetHashCode: (x_2) => (stringHash(x_2) | 0),
    }))));
    const patternInput_2 = checkLong(clip, script);
    const longVideo = patternInput_2[0];
    const cueFindings = checkCues(timing, jsFiles);
    const lessonFindings = (lesson == null) ? empty() : checkLesson(glossary, script, jsFiles, readText(lesson));
    const mapFindings = checkMap(script, jsFiles, (option_1 = lesson, (option_1 != null) ? readText(option_1) : undefined));
    reportLength(glossary, script, longVideo);
    const durationFindings = reportDuration(clip, timing);
    const breathingFindings = reportBreathing(timing, longVideo);
    const flowFindings = reportFlow(glossary, script, longVideo);
    reportGlossary(glossary, script);
    const findings = concat_1([patternInput[0], patternInput_1[0], readAsWritten, patternInput_2[1], cueFindings, lessonFindings, mapFindings, durationFindings, breathingFindings, flowFindings]);
    const warnings = choose((_arg) => {
        if (_arg.tag === 0) {
            return undefined;
        }
        else {
            return _arg.fields[0];
        }
    }, findings);
    const errors = choose((_arg_1) => {
        if (_arg_1.tag === 1) {
            return undefined;
        }
        else {
            return _arg_1.fields[0];
        }
    }, findings);
    const enumerator = getEnumerator(warnings);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            Py_print(concat("warn   ", enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]()));
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    const enumerator_1 = getEnumerator(errors);
    try {
        while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
            Py_print(concat("ERROR  ", enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]()));
        }
    }
    finally {
        disposeSafe(enumerator_1);
    }
    Py_print(`${length_1(errors)} error(s), ${length_1(warnings)} warning(s)`);
    Py_flush();
    if (isEmpty(errors)) {
        return 0;
    }
    else {
        return 1;
    }
}

