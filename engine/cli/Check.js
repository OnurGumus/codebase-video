
import { readDir, resolve, readText, basename, mtime, exists, readJson, join as join_1, fs } from "./Node.js";
import { concat, split, trimStart, trimEnd, padLeft, replicate, padRight, replace, indexOf, substring, join } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { max as max_1, min as min_1, compare, arrayHash, equalArrays, stringHash, equals, defaultOf, int32ToString, comparePrimitives, disposeSafe, getEnumerator, clear } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { StringBuilder_$ctor_Z721C83C5, StringBuilder__Append_244C7CD6, StringBuilder__Append_Z721C83C5, StringBuilder_$ctor } from "./fable_modules/fable-library-js.5.19.0/System.Text.js";
import { isDigit } from "./fable_modules/fable-library-js.5.19.0/Char.js";
import { Record, toString } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { class_type, int32_type, array_type, option_type, record_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { some, defaultArg, value as value_8 } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { pairwise as pairwise_1, sumBy as sumBy_1, pick, tryPick, iterateIndexed as iterateIndexed_1, last as last_1, setItem, map as map_1, item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { item as item_1, tryFindIndex, sortBy, find, sum, tryFind, truncate, concat as concat_1, append, pairwise, tryPick as tryPick_1, sumBy, exists as exists_1, singleton, collect, zip, toArray, contains, iterateIndexed, length as length_1, ofSeq, filter, map as map_3, sortWith, tail as tail_1, head, isEmpty, reverse, empty, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { truncate as truncate_1, filter as filter_1, delay, toList as toList_1, findIndex, map as map_2 } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { max, parse as parse_1, isInfinity, isNegativeInfinity, isPositiveInfinity, min } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { op_UnaryNegation_Int32, parse } from "./fable_modules/fable-library-js.5.19.0/Int32.js";
import { load as load_1, uses as uses_1, apply } from "./Glossary.js";
import { List_groupBy, List_countBy, List_distinct } from "./fable_modules/fable-library-js.5.19.0/Seq2.js";
import { toList, FSharpSet__Contains, ofSeq as ofSeq_1 } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { addToSet } from "./fable_modules/fable-library-js.5.19.0/MapUtil.js";
import { rangeDouble } from "./fable_modules/fable-library-js.5.19.0/Range.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";

/**
 * Writes all of s to a file descriptor, waiting while a non-blocking pipe is full (EAGAIN).
 */
export function Py_writeFd(fd, s) {
    const buf = Buffer.from(s, 'utf8');
    const len = buf.length | 0;
    let off = 0;
    while (off < len) {
        try {
            const n = (fs.writeSync(fd, buf, off, (len - off))) | 0;
            off = ((off + n) | 0);
        }
        catch (e) {
            if (e.code === "EAGAIN") {
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2);
            }
            else {
                throw e;
            }
        }
    }
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
    const sb = StringBuilder_$ctor();
    const boundary = ((((((("(?:(?<=[" + Py_W) + "])(?![") + Py_W) + "])|(?<![") + Py_W) + "])(?=[") + Py_W) + "]))";
    const nonBoundary = ((((((("(?:(?<=[" + Py_W) + "])(?=[") + Py_W) + "])|(?<![") + Py_W) + "])(?![") + Py_W) + "]))";
    let i = 0;
    let inClass = false;
    while (i < p.length) {
        const c = p[i];
        if ((c === "\\") && ((i + 1) < p.length)) {
            const d = p[i + 1];
            i = ((i + 2) | 0);
            StringBuilder__Append_Z721C83C5(sb, (d === "-") ? (isDigit(d) ? ("\\" + d) : (inClass ? "\\-" : ((Py_syntaxChars.indexOf(d) >= 0) ? ("\\" + d) : d))) : ((d === "A") ? "(?<![\\s\\S])" : ((d === "B") ? nonBoundary : ((d === "D") ? "\\P{Nd}" : ((d === "P") ? ("\\" + d) : ((d === "S") ? (("[^" + Py_S) + "]") : ((d === "W") ? (("[^" + Py_W) + "]") : ((d === "Z") ? "(?![\\s\\S])" : ((d === "b") ? (inClass ? "\\x08" : boundary) : ((d === "d") ? "\\p{Nd}" : ((d === "f") ? ("\\" + d) : ((d === "n") ? ("\\" + d) : ((d === "p") ? ("\\" + d) : ((d === "r") ? ("\\" + d) : ((d === "s") ? (inClass ? Py_S : (("[" + Py_S) + "]")) : ((d === "t") ? ("\\" + d) : ((d === "u") ? ("\\" + d) : ((d === "v") ? ("\\" + d) : ((d === "w") ? (inClass ? Py_W : (("[" + Py_W) + "]")) : ((d === "x") ? ("\\" + d) : (isDigit(d) ? ("\\" + d) : ((Py_syntaxChars.indexOf(d) >= 0) ? ("\\" + d) : d))))))))))))))))))))));
        }
        else if (inClass) {
            if (c === "]") {
                inClass = false;
            }
            StringBuilder__Append_244C7CD6(sb, c);
            i = ((i + 1) | 0);
        }
        else {
            switch (c) {
                case "$": {
                    StringBuilder__Append_Z721C83C5(sb, multiline ? "(?=\\n|(?![\\s\\S]))" : "(?=\\n?(?![\\s\\S]))");
                    break;
                }
                case ".": {
                    StringBuilder__Append_Z721C83C5(sb, "[^\\n]");
                    break;
                }
                case "[": {
                    inClass = true;
                    StringBuilder__Append_244C7CD6(sb, c);
                    if (((i + 1) < p.length) && (p[i + 1] === "^")) {
                        StringBuilder__Append_244C7CD6(sb, "^");
                        i = ((i + 1) | 0);
                    }
                    break;
                }
                case "^": {
                    StringBuilder__Append_Z721C83C5(sb, multiline ? "(?<![^\\n])" : "^");
                    break;
                }
                default:
                    StringBuilder__Append_244C7CD6(sb, c);
            }
            i = ((i + 1) | 0);
        }
    }
    return toString(sb);
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
    return value_8(item(0, m.Groups));
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
    return new Py_M(groups, start, start + value_8(item(0, groups)).length);
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
 * re.sub with a function.
 */
export function Py_sub(r, f, s) {
    const sb = StringBuilder_$ctor();
    let last = 0;
    const enumerator = getEnumerator(Py_finditer(r, s));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const m = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            StringBuilder__Append_Z721C83C5(StringBuilder__Append_Z721C83C5(sb, substring(s, last, m.Start - last)), f(m));
            last = (m.End | 0);
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    return toString(StringBuilder__Append_Z721C83C5(sb, substring(s, last)));
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
        let n = 0;
        let i = indexOf(s, sub, 4);
        while (i >= 0) {
            n = ((n + 1) | 0);
            i = (indexOf(s, sub, 4, i + sub.length) | 0);
        }
        return n | 0;
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
    let i = 0;
    let r = 0;
    while (((r === 0) && (i < x.length)) && (i < y.length)) {
        const cx = (item(i, x).codePointAt(0)) | 0;
        const cy = (item(i, y).codePointAt(0)) | 0;
        r = (comparePrimitives(cx, cy) | 0);
        i = ((i + 1) | 0);
    }
    if (r !== 0) {
        return r | 0;
    }
    else {
        return comparePrimitives(x.length, y.length) | 0;
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
    const kept = substring(ds, 0, q).split("");
    const rest = substring(ds, q);
    if ((rest === "") ? false : ((rest[0] > "5") ? true : ((rest[0] < "5") ? false : ((trimEnd(substring(rest, 1), "0") !== "") ? true : ((q > 0) && (((~~item(q - 1, kept).charCodeAt(0) - ~~"0".charCodeAt(0)) % 2) === 1)))))) {
        let j = q - 1;
        let carry = true;
        while (carry && (j >= 0)) {
            if (item(j, kept) === "9") {
                setItem(kept, j, "0");
                j = ((j - 1) | 0);
            }
            else {
                setItem(kept, j, String.fromCharCode((~~item(j, kept).charCodeAt(0) + 1) & 0xFFFF));
                carry = false;
            }
        }
    }
    return kept.join('');
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
    const sb = StringBuilder_$ctor_Z721C83C5(q);
    const arr = Array.from(s);
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        const ch = item(idx, arr);
        const c = (ch.codePointAt(0)) | 0;
        StringBuilder__Append_Z721C83C5(sb, ((ch === q) ? true : (ch === "\\")) ? ("\\" + ch) : ((c === 9) ? "\\t" : ((c === 10) ? "\\n" : ((c === 13) ? "\\r" : (((c < 32) ? true : (c === 127)) ? ("\\x" + Py_hex(c, 2)) : ((c < 127) ? ch : (((ch !== " ") && Py_fullmatch(Py_unprintable, ch)) ? ((c <= 255) ? ("\\x" + Py_hex(c, 2)) : ((c <= 65535) ? ("\\u" + Py_hex(c, 4)) : ("\\U" + Py_hex(c, 8)))) : ch)))))));
    }
    return toString(StringBuilder__Append_Z721C83C5(sb, q));
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
    const shielded = [];
    const out = [];
    const enumerator = getEnumerator(map_3((arg) => Py_strip(Py_sub(restoreRx, (m_1) => item(parse(Py_M__G_Z524259A4(m_1, 1), 511, false, 32), shielded), arg)), filter((p) => (Py_strip(p) !== ""), Py_split(splitter, Py_sub(FOREIGN, (m) => {
        void (shielded.push(Py_M__get_Value(m)));
        const e = Py_found(shieldEnd, Py_M__G_Z524259A4(m, 2)) ? "\u0001" : "\u0000";
        return ("\u0000" + int32ToString(shielded.length - 1)) + e;
    }, Py_strip(say_1))))));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            let p_2 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const matchValue = Py_matchStart(openingBreaks, p_2);
            let matchResult, m_3;
            if (matchValue != null) {
                if (out.length > 0) {
                    matchResult = 0;
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
                    setItem(out, out.length - 1, (item(out.length - 1, out) + " ") + Py_strip(Py_M__get_Value(m_3)));
                    p_2 = Py_strip(substring(p_2, m_3.End));
                    break;
                }
            }
            if (p_2 !== "") {
                void (out.push(p_2));
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    return ofSeq(out);
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

class Findings extends Record {
    constructor(Errors, Warnings, Read) {
        super();
        this.Errors = Errors;
        this.Warnings = Warnings;
        this.Read = Read;
    }
}

function Findings_$reflection() {
    return record_type("Check.Findings", [], Findings, () => [["Errors", array_type(string_type)], ["Warnings", array_type(string_type)], ["Read", class_type("Fable.Core.JS.Map`2", [string_type, array_type(string_type)])]]);
}

function Findings__err_Z721C83C5(f, s) {
    void (f.Errors.push(s));
}

function Findings__warn_Z721C83C5(f, s) {
    void (f.Warnings.push(s));
}

function idOf(s) {
    return s.id;
}

let glossary = undefined;

function rawSay(s) {
    const matchValue = Py_get(s, "say");
    if (equals(matchValue, defaultOf())) {
        return "";
    }
    else {
        return matchValue;
    }
}

function say(s) {
    if (glossary == null) {
        return rawSay(s);
    }
    else {
        return apply(glossary, rawSay(s));
    }
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

function load(f, clip) {
    const scriptPath = join_1(ofArray([clip, "script.json"]));
    const script = readJson(scriptPath);
    const timingPath = join_1(ofArray([clip, "build", "timing.json"]));
    const timing = exists(timingPath) ? some(readJson(timingPath)) : undefined;
    if ((timing != null) && (mtime(timingPath) < mtime(scriptPath))) {
        Findings__warn_Z721C83C5(f, "build/timing.json is older than script.json: run `node engine/cli/Cv.js <clip> narrate` (cue checks use the old timing)");
    }
    return [script, timing];
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

function checkScript(f, script) {
    const scenes = Py_list(script, "scenes");
    const ids = map_3(idOf, scenes);
    const enumerator = getEnumerator(filter((x_1) => (length_1(filter((y_1) => (x_1 === y_1), ids)) > 1), List_distinct(ids, {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    })));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            Findings__err_Z721C83C5(f, concat("scene id ", Py_reprStr(enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]()), " is used twice"));
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    const enumerator_1 = getEnumerator(scenes);
    try {
        while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
            const s_1 = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const sid = idOf(s_1);
            const say_1 = say(s_1);
            if (!Py_fullmatch(sceneIdRx, sid)) {
                Findings__err_Z721C83C5(f, concat(sid, ": scene ids are lowercase words joined by \'-\' (the part before the first \'-\' names the module)"));
            }
            const enumerator_2 = getEnumerator(Py_finditer(PRONOUNCE, say_1));
            try {
                while (enumerator_2["System.Collections.IEnumerator.MoveNext"]()) {
                    const m = enumerator_2["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    const shownText = Py_M__G_Z524259A4(m, 1);
                    const after = substring(say_1, m.End, min(2, say_1.length - m.End));
                    if (Py_found(endsSentence, shownText) && (Py_matchStart(nextStarts, after + " ") != null)) {
                        Findings__err_Z721C83C5(f, `${sid}: [${shownText}](...) ends a sentence inside the brackets; move the '${last_1(Array.from(shownText))}' outside, or the next sentence merges into this one`);
                    }
                }
            }
            finally {
                disposeSafe(enumerator_2);
            }
            iterateIndexed((i_1, sent) => {
                const enumerator_3 = getEnumerator(Py_finditer(breakLike, sent));
                try {
                    while (enumerator_3["System.Collections.IEnumerator.MoveNext"]()) {
                        const m_1 = enumerator_3["System.Collections.Generic.IEnumerator`1.get_Current"]();
                        if (!Py_fullmatch(breakForm, Py_M__get_Value(m_1))) {
                            Findings__err_Z721C83C5(f, `${sid}[${i_1}]: ${Py_reprStr(Py_M__get_Value(m_1))} is not a break marker ([pause], [pause 2], [think], [think 4], [rest], [rest 0.5]); the voice would read it`);
                        }
                    }
                }
                finally {
                    disposeSafe(enumerator_3);
                }
                const enumerator_4 = getEnumerator(Py_finditer(REST, sent));
                try {
                    while (enumerator_4["System.Collections.IEnumerator.MoveNext"]()) {
                        let secs;
                        const matchValue_2 = Py_M__Group_Z524259A4(enumerator_4["System.Collections.Generic.IEnumerator`1.get_Current"](), 1);
                        let matchResult, secs_1;
                        if (matchValue_2 != null) {
                            if ((secs = matchValue_2, !((0.15 <= parse_1(secs)) && (parse_1(secs) <= 1)))) {
                                matchResult = 0;
                                secs_1 = matchValue_2;
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
                                Findings__warn_Z721C83C5(f, `${sid}[${i_1}]: [rest ${secs_1}] - a rest is 0.15 to 1 s; for a longer silence end the sentence and use [pause]`);
                                break;
                            }
                        }
                    }
                }
                finally {
                    disposeSafe(enumerator_4);
                }
                if (Py_found(restEdge, sent)) {
                    Findings__warn_Z721C83C5(f, `${sid}[${i_1}]: a [rest] goes between two items inside a sentence, not at its start or end`);
                }
                const enumerator_5 = getEnumerator(breaks(sent));
                try {
                    while (enumerator_5["System.Collections.IEnumerator.MoveNext"]()) {
                        const forLoopVar = enumerator_5["System.Collections.Generic.IEnumerator`1.get_Current"]();
                        const secs_2 = forLoopVar[1];
                        if (!((0.5 <= secs_2) && (secs_2 <= 12))) {
                            Findings__warn_Z721C83C5(f, `${sid}[${i_1}]: [${forLoopVar[0]} ${Py_g(secs_2)}] - keep breaks between 0.5 and 12 s`);
                        }
                    }
                }
                finally {
                    disposeSafe(enumerator_5);
                }
                const words = length_1(Py_words(shown(sent))) | 0;
                if (words > 32) {
                    Findings__warn_Z721C83C5(f, `${sid}[${i_1}]: ${words} words in one sentence (one caption); split it`);
                }
                const enumerator_6 = getEnumerator(Py_finditer(readToken, Py_sub(foreignAny, (_arg_2) => "", Py_sub(PRONOUNCE, (_arg_1) => "", Py_sub(REST, (_arg) => "", sent)))));
                try {
                    while (enumerator_6["System.Collections.IEnumerator.MoveNext"]()) {
                        const tok = Py_strip(Py_M__get_Value(enumerator_6["System.Collections.Generic.IEnumerator`1.get_Current"]()));
                        if ((tok !== "") && !Py_fullmatch(smallNumber, tok)) {
                            if (!f.Read.has(tok)) {
                                f.Read.set(tok, []);
                            }
                            void (f.Read.get(tok).push(`${sid}[${i_1}]`));
                        }
                    }
                }
                finally {
                    disposeSafe(enumerator_6);
                }
            }, sentences(say_1));
        }
    }
    finally {
        disposeSafe(enumerator_1);
    }
}

function checkLong(f, clip, script) {
    const scenes = Py_list(script, "scenes");
    const whys = filter((arg) => isWhy(idOf(arg)), scenes);
    if (isEmpty(whys)) {
        return false;
    }
    else {
        const enumerator = getEnumerator(whys);
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const s_1 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                if (!Py_truthy(Py_get(s_1, "chapter"))) {
                    Findings__err_Z721C83C5(f, concat(idOf(s_1), ": a bridge scene needs \"chapter\": \"Title\" (the frame shows it on the title card)"));
                }
            }
        }
        finally {
            disposeSafe(enumerator);
        }
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
        if (((idOf(head(scenes)) !== "title") ? true : !cardHas("course")) ? true : !cardHas("lesson")) {
            Findings__err_Z721C83C5(f, "a long video opens with a scene \"title\" and a top-level \"card\": {\"course\", \"lesson\", \"sub\"}, so the viewer knows the course and lesson before anything else");
        }
        if (!contains("intro", prefixes, {
            Equals: (x, y) => (x === y),
            GetHashCode: (x) => (stringHash(x) | 0),
        })) {
            Findings__warn_Z721C83C5(f, "no intro scene: a long video should open by stating its goal");
        }
        if (!contains("outro", prefixes, {
            Equals: (x_1, y_1) => (x_1 === y_1),
            GetHashCode: (x_1) => (stringHash(x_1) | 0),
        })) {
            Findings__warn_Z721C83C5(f, "no outro scene: a long video should close on its goal");
        }
        const arr = toArray(scenes);
        iterateIndexed_1((k_1, s_3) => {
            if (isWhy(idOf(s_3)) && ((((k_1 + 1) >= arr.length) ? true : isWhy(idOf(item(k_1 + 1, arr)))) ? true : (prefix(idOf(item(k_1 + 1, arr))) === "outro"))) {
                Findings__err_Z721C83C5(f, concat(idOf(s_3), ": chapter has no content scenes"));
            }
        }, arr);
        const enumerator_1 = getEnumerator(List_distinct(map_3((tuple) => tuple[0], filter((tupledArg) => {
            const s_4 = tupledArg[1];
            if (!isWhy(idOf(s_4)) && (idOf(s_4) !== "title")) {
                return !Py_truthy(Py_get(s_4, "recap"));
            }
            else {
                return false;
            }
        }, zip(prefixes, scenes))), {
            Equals: (x_2, y_2) => (x_2 === y_2),
            GetHashCode: (x_2) => (stringHash(x_2) | 0),
        }));
        try {
            while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                const key = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                if (!exists(join_1(ofArray([clip, key + ".js"])))) {
                    Findings__err_Z721C83C5(f, `module ${Py_reprStr(key)} has no ${key}.js`);
                }
            }
        }
        finally {
            disposeSafe(enumerator_1);
        }
        return true;
    }
}

const SPEC = Py_rx("[\"\'`]([a-z0-9]+(?:-[a-z0-9]+)+)(?:\\|([^\"\'`|]+?)(\\$)?(?:\\|(\\d+))?|#(\\d+))?[\"\'`]");

const WORD_CALL = Py_rx("\\bword\\(\\s*[\"\'`]([a-z0-9]+(?:-[a-z0-9]+)+)[\"\'`]\\s*,\\s*[\"\'`]([^\"\'`]+)[\"\'`]");

const SCENE_CONST = Py_rx("(?:\\bconst|\\blet|,)\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*[\"\'`]([a-z0-9]+(?:-[a-z0-9]+)+)[\"\'`]");

const SCENE_REF = Py_rx("\\b([A-Za-z_][A-Za-z0-9_]*)\\s*\\+\\s*[\"\'`]((?:\\||#)[^\"\'`]*)[\"\'`]");

const CUE_CALL = Py_rx("\\b(?:cue|at|part)\\(\\s*[\"\'`]([a-z0-9]+(?:-[a-z0-9]+)+)[\"\'`]\\s*(?:,\\s*(-?\\d+))?");

const toastKinds = ofSeq_1(["idea", "tricky", "remember", "careful", "mistake", "surprise", "remark", "question", "tip"], {
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

function checkCuesWith(f, timing, jsFiles) {
    const scenes = Py_list(timing, "scenes");
    const byId = new Map();
    const enumerator = getEnumerator(scenes);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const s = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            byId.set(idOf(s), s);
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    const nSentences = (sid) => (length_1(sentencesOf(byId.get(sid))) | 0);
    const hasPhrase = (sid_1, phrase, nth) => {
        const units = map_3((u) => [lower(spokenOf(u)), lower(textOf(u))], collect((se) => {
            const matchValue = Py_list(se, "parts");
            if (length_1(matchValue) > 1) {
                return matchValue;
            }
            else {
                return singleton(se);
            }
        }, sentencesOf(byId.get(sid_1))));
        const want = lower(phrase);
        return exists_1((field) => (sumBy((u_1) => (Py_count(field(u_1), want) | 0), units, {
            GetZero: () => 0,
            Add: (x, y) => ((x + y) | 0),
        }) >= nth), ofArray([(tuple) => tuple[0], (tuple_1) => tuple_1[1]]));
    };
    const enumerator_1 = getEnumerator(jsFiles);
    try {
        while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
            const file = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const name = basename(file);
            const names = new Map();
            iterateIndexed((i, line) => {
                const ln = (i + 1) | 0;
                if (!Py_strip(line).startsWith("//")) {
                    const enumerator_2 = getEnumerator(Py_finditer(SCENE_CONST, line));
                    try {
                        while (enumerator_2["System.Collections.IEnumerator.MoveNext"]()) {
                            const d = enumerator_2["System.Collections.Generic.IEnumerator`1.get_Current"]();
                            names.set(Py_M__G_Z524259A4(d, 1), Py_M__G_Z524259A4(d, 2));
                        }
                    }
                    finally {
                        disposeSafe(enumerator_2);
                    }
                    const line_1 = Py_sub(SCENE_REF, (m) => {
                        if (names.has(Py_M__G_Z524259A4(m, 1))) {
                            return (("\"" + names.get(Py_M__G_Z524259A4(m, 1))) + Py_M__G_Z524259A4(m, 2)) + "\"";
                        }
                        else {
                            return Py_M__get_Value(m);
                        }
                    }, line);
                    const enumerator_3 = getEnumerator(Py_finditer(SPEC, line_1));
                    try {
                        while (enumerator_3["System.Collections.IEnumerator.MoveNext"]()) {
                            let nth_1;
                            const m_1 = enumerator_3["System.Collections.Generic.IEnumerator`1.get_Current"]();
                            const sid_2 = Py_M__G_Z524259A4(m_1, 1);
                            const whole = Py_M__get_Value(m_1);
                            if (!((prefix(sid_2) === "k") ? true : ((!byId.has(sid_2) && !(whole.indexOf("|") >= 0)) && !(whole.indexOf("#") >= 0)))) {
                                if (!byId.has(sid_2)) {
                                    Findings__err_Z721C83C5(f, `${name}:${ln}: no scene ${Py_reprStr(sid_2)}`);
                                }
                                else {
                                    const matchValue_1 = Py_M__Group_Z524259A4(m_1, 2);
                                    const matchValue_2 = Py_M__Group_Z524259A4(m_1, 4);
                                    const matchValue_3 = Py_M__Group_Z524259A4(m_1, 5);
                                    let matchResult, nth_2, phrase_2, sent_1;
                                    if (matchValue_1 == null) {
                                        if (matchValue_3 != null) {
                                            if (parse(matchValue_3, 511, false, 32) >= nSentences(sid_2)) {
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
                                    else if ((nth_1 = matchValue_2, !hasPhrase(sid_2, matchValue_1, (nth_1 == null) ? 1 : parse(nth_1, 511, false, 32)))) {
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
                                            Findings__err_Z721C83C5(f, `${name}:${ln}: ${Py_reprStr(phrase_2)} is not spoken in ${sid_2}${times}`);
                                            break;
                                        }
                                        case 2: {
                                            Findings__err_Z721C83C5(f, `${name}:${ln}: ${sid_2} has ${nSentences(sid_2)} sentence(s), asked for #${sent_1}`);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    finally {
                        disposeSafe(enumerator_3);
                    }
                    const enumerator_4 = getEnumerator(Py_finditer(WORD_CALL, line_1));
                    try {
                        while (enumerator_4["System.Collections.IEnumerator.MoveNext"]()) {
                            const m_2 = enumerator_4["System.Collections.Generic.IEnumerator`1.get_Current"]();
                            const sid_3 = Py_M__G_Z524259A4(m_2, 1);
                            const phrase_3 = Py_M__G_Z524259A4(m_2, 2);
                            if (byId.has(sid_3) && !hasPhrase(sid_3, phrase_3, 1)) {
                                Findings__err_Z721C83C5(f, `${name}:${ln}: word(${Py_reprStr(sid_3)}, ${Py_reprStr(phrase_3)}): not spoken there`);
                            }
                            else if (!byId.has(sid_3)) {
                                Findings__err_Z721C83C5(f, `${name}:${ln}: no scene ${Py_reprStr(sid_3)}`);
                            }
                        }
                    }
                    finally {
                        disposeSafe(enumerator_4);
                    }
                    const enumerator_5 = getEnumerator(Py_finditer(CUE_CALL, line_1));
                    try {
                        while (enumerator_5["System.Collections.IEnumerator.MoveNext"]()) {
                            let i_1;
                            const m_3 = enumerator_5["System.Collections.Generic.IEnumerator`1.get_Current"]();
                            const sid_4 = Py_M__G_Z524259A4(m_3, 1);
                            if (!byId.has(sid_4)) {
                                Findings__err_Z721C83C5(f, `${name}:${ln}: no scene ${Py_reprStr(sid_4)}`);
                            }
                            else {
                                const matchValue_7 = Py_M__Group_Z524259A4(m_3, 2);
                                let matchResult_1, i_2;
                                if (matchValue_7 != null) {
                                    if ((i_1 = matchValue_7, (parse(i_1, 511, false, 32) >= nSentences(sid_4)) ? true : (op_UnaryNegation_Int32(parse(i_1, 511, false, 32)) > nSentences(sid_4)))) {
                                        matchResult_1 = 0;
                                        i_2 = matchValue_7;
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
                                        Findings__err_Z721C83C5(f, `${name}:${ln}: ${sid_4} has ${nSentences(sid_4)} sentence(s), asked for ${i_2}`);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    finally {
                        disposeSafe(enumerator_5);
                    }
                }
            }, Py_splitlines(readText(file)));
        }
    }
    finally {
        disposeSafe(enumerator_1);
    }
    const seen = [];
    const enumerator_6 = getEnumerator(scenes);
    try {
        while (enumerator_6["System.Collections.IEnumerator.MoveNext"]()) {
            const s_3 = enumerator_6["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const enumerator_7 = getEnumerator(Py_list(s_3, "toasts"));
            try {
                while (enumerator_7["System.Collections.IEnumerator.MoveNext"]()) {
                    let s_2, at, sents, k, want_1;
                    const d_1 = enumerator_7["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    const kind = Py_get(d_1, "kind");
                    const where = concat(idOf(s_3), " toast ", Py_repr(kind));
                    if (!(Py_isStr(kind) && FSharpSet__Contains(toastKinds, kind))) {
                        Findings__err_Z721C83C5(f, concat(where, ": unknown kind; use one of ", join(", ", Py_sortWith((a, b) => (Py_cmpStr(a, b) | 0), toList(toastKinds)))));
                    }
                    const at_1 = Py_get(d_1, "at");
                    if ((Py_truthy(at_1) && !Py_str(at_1).startsWith("#")) && !hasPhrase(idOf(s_3), Py_str(at_1), 1)) {
                        Findings__err_Z721C83C5(f, `${where}: ${Py_repr(at_1)} is not spoken in ${idOf(s_3)}`);
                    }
                    const text_1 = Py_get(d_1, "text");
                    if (Py_truthy(text_1) && (length_1(Py_words(text_1)) > 5)) {
                        Findings__warn_Z721C83C5(f, concat(where, ": text ", Py_repr(text_1), " is long for a badge; keep it to about 4 words"));
                    }
                    void (seen.push([(s_2 = s_3, (at = at_1, (sents = toArray(sentencesOf(s_2)), (sents.length === 0) ? num(s_2, "start") : ((Py_truthy(at) && Py_str(at).startsWith("#")) ? ((k = (min(parse(substring(Py_str(at), 1), 511, false, 32), sents.length - 1) | 0), num(item((k < 0) ? (k + sents.length) : k, sents), "start"))) : (Py_truthy(at) ? ((want_1 = lower(Py_str(at)), defaultArg(tryPick((se_1) => tryPick_1((text) => {
                        const k_1 = indexOf(text, want_1, 4) | 0;
                        if (k_1 >= 0) {
                            const start = num(se_1, "start");
                            return start + (((num(se_1, "end") - start) * Py_len(substring(text, 0, k_1))) / max(Py_len(text), 1));
                        }
                        else {
                            return undefined;
                        }
                    }, ofArray([lower(spokenOf(se_1)), lower(textOf(se_1))])), sents), num(item(0, sents), "start")))) : num(item(0, sents), "start")))))), kind, where]));
                }
            }
            finally {
                disposeSafe(enumerator_7);
            }
        }
    }
    finally {
        disposeSafe(enumerator_6);
    }
    const seen_1 = Py_sortWith((tupledArg, tupledArg_1) => {
        const c = comparePrimitives(tupledArg[0], tupledArg_1[0]) | 0;
        if (c !== 0) {
            return c | 0;
        }
        else {
            const c_1 = Py_cmpStr(Py_str(tupledArg[1]), Py_str(tupledArg_1[1])) | 0;
            if (c_1 !== 0) {
                return c_1 | 0;
            }
            else {
                return Py_cmpStr(tupledArg[2], tupledArg_1[2]) | 0;
            }
        }
    }, ofSeq(seen));
    const enumerator_8 = getEnumerator(pairwise(seen_1));
    try {
        while (enumerator_8["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator_8["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const b_2 = forLoopVar[1][0];
            const a_2 = forLoopVar[0][0];
            if ((b_2 - a_2) < 6) {
                Findings__warn_Z721C83C5(f, `toasts crowd: ${forLoopVar[0][2]} and ${forLoopVar[1][2]} are ${Py_fmtF(1, b_2 - a_2)} s apart (keep at least 6 s)`);
            }
        }
    }
    finally {
        disposeSafe(enumerator_8);
    }
    if (!isEmpty(seen_1)) {
        Py_print(`toasts: ${join(", ", map_3((tupledArg_5) => (`${tupledArg_5[0]} ${tupledArg_5[1]}`), sortWith((tupledArg_3, tupledArg_4) => (comparePrimitives(tupledArg_4[1], tupledArg_3[1]) | 0), List_countBy((x_1) => x_1, map_3((tupledArg_2) => Py_str(tupledArg_2[1]), seen_1), {
            Equals: (x_2, y_1) => (x_2 === y_1),
            GetHashCode: (x_2) => (stringHash(x_2) | 0),
        }))))} (${length_1(seen_1)} total)`);
    }
}

function checkCues(f, timing, jsFiles) {
    if (timing != null) {
        checkCuesWith(f, value_8(timing), jsFiles);
    }
    else {
        Findings__warn_Z721C83C5(f, "no build/timing.json yet: cue checks skipped (run narrate first)");
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

function checkLesson(f, script, jsFiles, lessonText) {
    const have = new Set([]);
    const enumerator = getEnumerator(Py_finditer(NUM, lessonText));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            addToSet(norm(Py_M__get_Value(enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]())), have);
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    const enumerator_1 = getEnumerator(Py_finditer(shorthand, lessonText));
    try {
        while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
            const m_1 = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
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
            addToSet((Number.isInteger(v)) ? Py_numStr(v, false) : Py_floatRepr(v), have);
        }
    }
    finally {
        disposeSafe(enumerator_1);
    }
    const seen = new Map();
    const note = (n, where) => {
        if (!seen.has(n)) {
            seen.set(n, where);
        }
    };
    const enumerator_2 = getEnumerator(Py_list(script, "scenes"));
    try {
        while (enumerator_2["System.Collections.IEnumerator.MoveNext"]()) {
            const s = enumerator_2["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const enumerator_3 = getEnumerator(Py_finditer(NUM, Py_sub(PRONOUNCE, (m_2) => Py_M__G_Z524259A4(m_2, 1), say(s))));
            try {
                while (enumerator_3["System.Collections.IEnumerator.MoveNext"]()) {
                    note(norm(Py_M__get_Value(enumerator_3["System.Collections.Generic.IEnumerator`1.get_Current"]())), concat("narration ", idOf(s)));
                }
            }
            finally {
                disposeSafe(enumerator_3);
            }
        }
    }
    finally {
        disposeSafe(enumerator_2);
    }
    const enumerator_4 = getEnumerator(jsFiles);
    try {
        while (enumerator_4["System.Collections.IEnumerator.MoveNext"]()) {
            const file = enumerator_4["System.Collections.Generic.IEnumerator`1.get_Current"]();
            iterateIndexed((i, line) => {
                if (!Py_strip(line).startsWith("//")) {
                    const enumerator_5 = getEnumerator(Py_finditer(stringLit, line));
                    try {
                        while (enumerator_5["System.Collections.IEnumerator.MoveNext"]()) {
                            const m_4 = enumerator_5["System.Collections.Generic.IEnumerator`1.get_Current"]();
                            const text = pick((x) => x, m_4.Groups.slice(1, m_4.Groups.length));
                            if (!(((((!Py_found(anyDigit, text) ? true : Py_found(layoutish, text)) ? true : Py_fullmatch(svgPath, text)) ? true : Py_fullmatch(coords, text)) ? true : (text.indexOf("|") >= 0)) ? true : (text.indexOf("${") >= 0))) {
                                const enumerator_6 = getEnumerator(Py_finditer(NUM, text));
                                try {
                                    while (enumerator_6["System.Collections.IEnumerator.MoveNext"]()) {
                                        note(norm(Py_M__get_Value(enumerator_6["System.Collections.Generic.IEnumerator`1.get_Current"]())), `${basename(file)}:${i + 1}`);
                                    }
                                }
                                finally {
                                    disposeSafe(enumerator_6);
                                }
                            }
                        }
                    }
                    finally {
                        disposeSafe(enumerator_5);
                    }
                }
            }, Py_splitlines(readText(file)));
        }
    }
    finally {
        disposeSafe(enumerator_4);
    }
    const small = ofSeq_1(append(toList_1(delay(() => map_2(int32ToString, rangeDouble(0, 1, 12)))), singleton("100")), {
        Compare: (x_1, y) => (comparePrimitives(x_1, y) | 0),
    });
    const enumerator_7 = getEnumerator(Py_sortWith((tupledArg_1, tupledArg_2) => (Py_cmpStr(tupledArg_1[1], tupledArg_2[1]) | 0), ofSeq(filter_1((tupledArg) => {
        const n_2 = tupledArg[0];
        if (!have.has(n_2)) {
            return !FSharpSet__Contains(small, n_2);
        }
        else {
            return false;
        }
    }, seen.entries()))));
    try {
        while (enumerator_7["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator_7["System.Collections.Generic.IEnumerator`1.get_Current"]();
            Findings__warn_Z721C83C5(f, concat(forLoopVar[0], " (", forLoopVar[1], ") does not appear in the lesson; check it is derived from lesson numbers, or drop it"));
        }
    }
    finally {
        disposeSafe(enumerator_7);
    }
}

const CONNECTIVES = ofArray(["so", "therefore", "hence", "that\'s why", "which is why", "this is why", "because", "as a result", "that means", "this means", "which means", "in other words", "but", "however", "on the other hand", "instead", "even so", "whereas", "unlike", "remember", "recall", "as we saw", "earlier", "back in", "you saw", "now", "next", "first", "then", "finally", "in short", "here\'s", "here is", "the tricky part", "the catch", "the key point", "the key idea", "the question is", "notice", "watch", "careful", "surprisingly", "it turns out", "the trap", "a common mistake", "easy to miss", "perhaps", "similarly", "likewise", "after all", "in fact", "as you know", "for example", "for instance", "you might", "imagine", "suppose", "what if"]);

const CONN_RE = Py_rxI(("\\b(" + join("|", map_3(Py_escape, sortWith((a, b) => (comparePrimitives(b.length, a.length) | 0), CONNECTIVES)))) + ")\\b");

const FLOW_MIN = 0.4;

function chapters(scenes, each) {
    const rows = [];
    let chapter = "intro";
    const cur = [];
    const flush = () => {
        void (rows.push([chapter, ofSeq(cur)]));
    };
    const enumerator = getEnumerator(scenes);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            let c;
            const s = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            if (isWhy(idOf(s)) ? true : (prefix(idOf(s)) === "outro")) {
                flush();
                chapter = ((c = Py_get(s, "chapter"), Py_truthy(c) ? Py_str(c) : idOf(s)));
                clear(cur);
            }
            void (cur.push(each(s)));
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    flush();
    return ofSeq(rows);
}

function reportFlow(f, script, longVideo) {
    const used = new Map();
    const rows = filter((tupledArg_1) => (tupledArg_1[1] > 0), map_3((tupledArg) => {
        const l = concat_1(tupledArg[1]);
        return [tupledArg[0], length_1(l), length_1(filter((x) => x, l))];
    }, chapters(Py_list(script, "scenes"), (s) => map_3((sent) => {
        const words = map_3((m) => lower(Py_M__G_Z524259A4(m, 1)), Py_finditer(CONN_RE, shown(sent)));
        const enumerator = getEnumerator(words);
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const w = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                used.set(w, (used.has(w) ? used.get(w) : 0) + 1);
            }
        }
        finally {
            disposeSafe(enumerator);
        }
        return !isEmpty(words);
    }, sentences(say(s))))));
    const matchValue = sumBy((tupledArg_2) => (tupledArg_2[1] | 0), rows, {
        GetZero: () => 0,
        Add: (x_1, y) => ((x_1 + y) | 0),
    }) | 0;
    const totalLinked = sumBy((tupledArg_3) => (tupledArg_3[2] | 0), rows, {
        GetZero: () => 0,
        Add: (x_2, y_1) => ((x_2 + y_1) | 0),
    }) | 0;
    const total = matchValue | 0;
    if (total > 0) {
        Py_print(`flow: ${totalLinked}/${total} sentences link to what came before (${Py_pct(0, totalLinked / total)})`);
        const enumerator_1 = getEnumerator(rows);
        try {
            while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const name_1 = forLoopVar[0];
                const l_2 = forLoopVar[2] | 0;
                const k = forLoopVar[1] | 0;
                if (longVideo) {
                    Py_print(`  ${padLeft(int32ToString(l_2), 3)}/${padRight(int32ToString(k), 3)} ${padLeft(Py_pct(0, l_2 / k), 4)}  ${name_1}`);
                }
                if ((k >= 4) && ((l_2 / k) < FLOW_MIN)) {
                    Findings__warn_Z721C83C5(f, `flow: ${name_1}: only ${l_2} of ${k} sentences link to the one before; add connectives (so, but, remember, the tricky part, ...)`);
                }
            }
        }
        finally {
            disposeSafe(enumerator_1);
        }
        const top = sortWith((tupledArg_4, tupledArg_5) => (comparePrimitives(tupledArg_5[1], tupledArg_4[1]) | 0), ofSeq(used.entries()));
        const enumerator_2 = getEnumerator(truncate(3, top));
        try {
            while (enumerator_2["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar_1 = enumerator_2["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const c = forLoopVar_1[1] | 0;
                if ((c >= 6) && ((c / max(1, totalLinked)) > 0.25)) {
                    Findings__warn_Z721C83C5(f, `flow: '${forLoopVar_1[0]}' opens ${c} of ${totalLinked} linked sentences; vary the connectives`);
                }
            }
        }
        finally {
            disposeSafe(enumerator_2);
        }
        Py_print("  most used: " + join(", ", map_3((tupledArg_6) => (`${tupledArg_6[0]} ${tupledArg_6[1]}`), truncate(8, top))));
    }
}

function reportBreathingWith(f, timing, longVideo) {
    const scenes = Py_list(timing, "scenes");
    const sents = toArray(collect(sentencesOf, scenes));
    if (sents.length >= 2) {
        const start = (x) => num(x, "start");
        const stop = (x_1) => num(x_1, "end");
        const talk = sumBy_1((x_2) => (stop(x_2) - start(x_2)), sents, {
            GetZero: () => 0,
            Add: (x_3, y) => (x_3 + y),
        });
        const dur = num(timing, "duration");
        let longest = 0;
        let runStart = start(item(0, sents));
        let where = item(0, sents);
        const arr = pairwise_1(sents);
        for (let idx = 0; idx <= (arr.length - 1); idx++) {
            const forLoopVar = item(idx, arr);
            const b = forLoopVar[1];
            const a = forLoopVar[0];
            if ((start(b) - stop(a)) >= 1.5) {
                if ((stop(a) - runStart) > longest) {
                    longest = (stop(a) - runStart);
                    where = a;
                }
                runStart = start(b);
            }
        }
        const lastS = last_1(sents);
        if ((stop(lastS) - runStart) > longest) {
            longest = (stop(lastS) - runStart);
            where = lastS;
        }
        const isThink = (b_1) => (b_1.kind === "think");
        const thinks = sumBy((s_1) => (length_1(filter(isThink, Py_list(s_1, "breaks"))) | 0), scenes, {
            GetZero: () => 0,
            Add: (x_4, y_1) => ((x_4 + y_1) | 0),
        }) | 0;
        const recaps = length_1(filter((s_2) => Py_truthy(Py_get(s_2, "recap")), scenes)) | 0;
        Py_print((`breathe: talking ${Py_pct(0, talk / dur)} of ${Py_fmtF(1, dur / 60)} min; longest stretch without a 1.5 s pause `) + (`${Py_fmtF(0, longest)} s (ends ${Py_fmtF(0, stop(where))} s); ${thinks} think, ${recaps} recap`));
        const enumerator = getEnumerator(scenes);
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const s_3 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const recap = Py_get(s_3, "recap");
                const nRecap = (Py_truthy(recap) ? recap.length : 0) | 0;
                const nSent = length_1(sentencesOf(s_3)) | 0;
                if (Py_truthy(recap) && (nRecap > nSent)) {
                    Findings__warn_Z721C83C5(f, (`recap: ${idOf(s_3)} has ${nRecap} lines but ${nSent} sentences; `) + "line i appears on sentence i, so the extra lines arrive late - speak one sentence per line");
                }
            }
        }
        finally {
            disposeSafe(enumerator);
        }
        if (longVideo) {
            if (longest > 45) {
                Findings__warn_Z721C83C5(f, `breathe: ${Py_fmtF(0, longest)} s of talk without a 1.5 s pause (ending at ${Py_fmtF(0, stop(where))} s); add a [pause] after a key point`);
            }
            if ((talk / dur) > 0.82) {
                Findings__warn_Z721C83C5(f, concat("breathe: talking ", Py_pct(0, talk / dur), " of the time; aim for 72-78% with [pause], [think] and recap scenes"));
            }
            let chapter = defaultOf();
            let has = false;
            const enumerator_1 = getEnumerator(append(scenes, singleton({
                id: "outro-end",
                sentences: [],
            })));
            try {
                while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                    const s_4 = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    if (isWhy(idOf(s_4)) ? true : (prefix(idOf(s_4)) === "outro")) {
                        if (Py_truthy(chapter) && !has) {
                            Findings__warn_Z721C83C5(f, concat("breathe: chapter ", Py_repr(chapter), " has no recap scene and no [think]"));
                        }
                        chapter = (isWhy(idOf(s_4)) ? Py_get(s_4, "chapter") : defaultOf());
                        has = false;
                    }
                    has = ((has ? true : Py_truthy(Py_get(s_4, "recap"))) ? true : exists_1(isThink, Py_list(s_4, "breaks")));
                }
            }
            finally {
                disposeSafe(enumerator_1);
            }
        }
    }
}

function reportBreathing(f, timing, longVideo) {
    const option_1 = timing;
    if (option_1 != null) {
        reportBreathingWith(f, value_8(option_1), longVideo);
    }
}

export const lengthCaps = ofArray([["short", 5.5], ["tour", 11], ["deep", 29]]);

function reportDuration(f, clip, timing) {
    const option_1 = timing;
    if (option_1 != null) {
        const minutes = num(value_8(option_1), "duration") / 60;
        Py_print(concat("video:  ", Py_fmtF(1, minutes), " min with pauses, cards and recaps"));
        const briefPath = join_1(ofArray([clip, "brief.json"]));
        if (exists(briefPath)) {
            const length = Py_str(Py_get(readJson(briefPath), "length"));
            const matchValue = tryFind((tupledArg) => (tupledArg[0] === length), lengthCaps);
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
                case 0: {
                    Findings__warn_Z721C83C5(f, `the video runs ${Py_fmtF(1, minutes)} min, over the ${Py_g(cap_1)} min cap of a '${length}' video: cut sentences or a scene`);
                    break;
                }
                case 1: {
                    break;
                }
            }
        }
    }
}

function reportLength(script, longVideo) {
    const rows = filter((tupledArg_1) => (tupledArg_1[1] > 0), map_3((tupledArg) => [tupledArg[0], sum(tupledArg[1], {
        GetZero: () => 0,
        Add: (x, y) => ((x + y) | 0),
    })], chapters(Py_list(script, "scenes"), (s) => (length_1(Py_words(shown(say(s)))) | 0))));
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

export const patternInput$00401029 = [1.2, 1.5];

export const VISIT_TAIL = patternInput$00401029[1];

const VISIT_LEAD = patternInput$00401029[0];

function checkMap(f, script, jsFiles, lesson) {
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
        const enumerator = getEnumerator(scenes);
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const s_3 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                if (hasPath(s_3)) {
                    Findings__err_Z721C83C5(f, concat(idOf(s_3), ": \"path\" needs a top-level \"map\" in script.json"));
                }
                if (!Operators_IsNull(Py_get(s_3, "inside"))) {
                    Findings__err_Z721C83C5(f, concat(idOf(s_3), ": \"inside\" needs a top-level \"map\" in script.json"));
                }
            }
        }
        finally {
            disposeSafe(enumerator);
        }
        const enumerator_1 = getEnumerator(jsFiles);
        try {
            while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                const file = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                if (Py_search(K_MAP, readText(file)) != null) {
                    Findings__err_Z721C83C5(f, concat(basename(file), ": K.map needs a top-level \"map\" in script.json"));
                }
            }
        }
        finally {
            disposeSafe(enumerator_1);
        }
    }
    else {
        const kinds = Py_get(map, "kinds");
        const objects = (what, xs) => {
            iterateIndexed((i, x) => {
                if (!((x !== null && typeof x === 'object' && !Array.isArray(x)))) {
                    Findings__err_Z721C83C5(f, `map: ${what} ${i} is not an object`);
                }
            }, xs);
            return filter((v_3) => ((v_3 !== null && typeof v_3 === 'object' && !Array.isArray(v_3))), xs);
        };
        const parts = objects("part", Py_list(map, "parts"));
        const edges = objects("edge", Py_list(map, "edges"));
        if ((length_1(parts) < 2) ? true : (length_1(parts) > 7)) {
            Findings__err_Z721C83C5(f, `map: ${length_1(parts)} parts; a map has 2 to 7 (more do not fit at a readable size)`);
        }
        if (Py_truthy(kinds)) {
            const arr = Object.keys(kinds);
            for (let idx = 0; idx <= (arr.length - 1); idx++) {
                const k_3 = item(idx, arr);
                const kind = Py_get(kinds, k_3);
                if (!Py_truthy(Py_get(kind, "tone")) ? true : !Py_truthy(Py_get(kind, "icon"))) {
                    Findings__err_Z721C83C5(f, concat("map: kind ", Py_reprStr(k_3), " needs a \"tone\" and an \"icon\""));
                }
            }
        }
        iterateIndexed((i_1, p) => {
            const id = text(p, "id");
            const name = (id === "") ? (`part ${i_1}`) : concat("part ", Py_reprStr(id));
            const enumerator_2 = getEnumerator(["id", "label", "kind"]);
            try {
                while (enumerator_2["System.Collections.IEnumerator.MoveNext"]()) {
                    const k_4 = enumerator_2["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    if (text(p, k_4) === "") {
                        Findings__err_Z721C83C5(f, `map: ${name} has no "${k_4}"`);
                    }
                }
            }
            finally {
                disposeSafe(enumerator_2);
            }
            const kind_1 = text(p, "kind");
            if ((kind_1 !== "") && !(Py_truthy(kinds) && Py_truthy(Py_get(kinds, kind_1)))) {
                Findings__err_Z721C83C5(f, `map: ${name} has kind ${Py_reprStr(kind_1)}, which is not in "kinds"`);
            }
            const enumerator_3 = getEnumerator([["col", 3], ["row", 2]]);
            try {
                while (enumerator_3["System.Collections.IEnumerator.MoveNext"]()) {
                    const forLoopVar = enumerator_3["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    const top = forLoopVar[1] | 0;
                    const k_5 = forLoopVar[0];
                    const v_4 = field(p, k_5);
                    if (Operators_IsNull(v_4)) {
                        Findings__err_Z721C83C5(f, `map: ${name} has no "${k_5}"`);
                    }
                    else if ((!(Number.isInteger(v_4)) ? true : (v_4 < 0)) ? true : (v_4 > top)) {
                        Findings__err_Z721C83C5(f, `map: ${name} has "${k_5}": ${JSON.stringify(v_4)}; the grid's ${k_5}s are 0 to ${top}`);
                    }
                }
            }
            finally {
                disposeSafe(enumerator_3);
            }
            const label = text(p, "label");
            if (Py_len(label) > 12) {
                Findings__err_Z721C83C5(f, `map: the label ${Py_reprStr(label)} of ${name} is ${Py_len(label)} characters; at most 12 fit a box`);
            }
        }, parts);
        const ids = filter((y) => ("" !== y), map_3((p_1) => text(p_1, "id"), parts));
        const enumerator_4 = getEnumerator(List_countBy((x_2) => x_2, ids, {
            Equals: (x_3, y_1) => (x_3 === y_1),
            GetHashCode: (x_3) => (stringHash(x_3) | 0),
        }));
        try {
            while (enumerator_4["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar_1 = enumerator_4["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const n = forLoopVar_1[1] | 0;
                if (n > 1) {
                    Findings__err_Z721C83C5(f, `map: ${n} parts have the id ${Py_reprStr(forLoopVar_1[0])}`);
                }
            }
        }
        finally {
            disposeSafe(enumerator_4);
        }
        const cell = (p_2) => [number(p_2, "col", -1), number(p_2, "row", -1)];
        const enumerator_5 = getEnumerator(List_groupBy(cell, parts, {
            Equals: equalArrays,
            GetHashCode: (x_4) => (arrayHash(x_4) | 0),
        }));
        try {
            while (enumerator_5["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar_2 = enumerator_5["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const row = forLoopVar_2[0][1];
                const ps = forLoopVar_2[1];
                const col = forLoopVar_2[0][0];
                if (((length_1(ps) > 1) && (col >= 0)) && (row >= 0)) {
                    Findings__err_Z721C83C5(f, `map: ${join(" and ", map_3((p_3) => text(p_3, "id"), ps))} share the cell col ${col}, row ${row}`);
                }
            }
        }
        finally {
            disposeSafe(enumerator_5);
        }
        const known = (id_2) => contains(id_2, ids, {
            Equals: (x_5, y_3) => (x_5 === y_3),
            GetHashCode: (x_5) => (stringHash(x_5) | 0),
        });
        const byId = (id_3) => find((p_4) => (text(p_4, "id") === id_3), parts);
        const enumerator_6 = getEnumerator(edges);
        try {
            while (enumerator_6["System.Collections.IEnumerator.MoveNext"]()) {
                const e = enumerator_6["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const matchValue = text(e, "from");
                const b = text(e, "to");
                const a = matchValue;
                const enumerator_7 = getEnumerator([a, b]);
                try {
                    while (enumerator_7["System.Collections.IEnumerator.MoveNext"]()) {
                        const id_4 = enumerator_7["System.Collections.Generic.IEnumerator`1.get_Current"]();
                        if (!known(id_4)) {
                            Findings__err_Z721C83C5(f, concat("map: an edge names ", Py_reprStr(id_4), ", which is not a part"));
                        }
                    }
                }
                finally {
                    disposeSafe(enumerator_7);
                }
                if ((a !== "") && (a === b)) {
                    Findings__err_Z721C83C5(f, concat("map: an edge joins ", a, " to itself"));
                }
                else if (known(a) && known(b)) {
                    const matchValue_2 = cell(byId(a));
                    const matchValue_3 = cell(byId(b));
                    const r2 = matchValue_3[1];
                    const r1 = matchValue_2[1];
                    const c2 = matchValue_3[0];
                    const c1 = matchValue_2[0];
                    const enumerator_8 = getEnumerator(parts);
                    try {
                        while (enumerator_8["System.Collections.IEnumerator.MoveNext"]()) {
                            const p_5 = enumerator_8["System.Collections.Generic.IEnumerator`1.get_Current"]();
                            const patternInput_2 = cell(p_5);
                            const r = patternInput_2[1];
                            const c = patternInput_2[0];
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
                            if (straight ? true : curved) {
                                Findings__warn_Z721C83C5(f, `map: the edge ${a} -> ${b} would cross ${crossed}; move a part, or route the edge through it`);
                            }
                        }
                    }
                    finally {
                        disposeSafe(enumerator_8);
                    }
                }
            }
        }
        finally {
            disposeSafe(enumerator_6);
        }
        const enumerator_9 = getEnumerator(scenes);
        try {
            while (enumerator_9["System.Collections.IEnumerator.MoveNext"]()) {
                const s_4 = enumerator_9["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const sid = idOf(s_4);
                if (hasPath(s_4)) {
                    const path = map_3(Py_str, Py_list(s_4, "path"));
                    if (!isWhy(sid)) {
                        Findings__err_Z721C83C5(f, concat(sid, ": \"path\" belongs on a chapter\'s bridge scene (one ending in -why)"));
                    }
                    if (length_1(path) < 2) {
                        Findings__err_Z721C83C5(f, concat(sid, ": a path names at least 2 parts"));
                    }
                    const enumerator_10 = getEnumerator(path);
                    try {
                        while (enumerator_10["System.Collections.IEnumerator.MoveNext"]()) {
                            const id_5 = enumerator_10["System.Collections.Generic.IEnumerator`1.get_Current"]();
                            if (!known(id_5)) {
                                Findings__err_Z721C83C5(f, concat(sid, ": the path names ", Py_reprStr(id_5), ", which is not a part of the map"));
                            }
                        }
                    }
                    finally {
                        disposeSafe(enumerator_10);
                    }
                    const enumerator_11 = getEnumerator(pairwise(path));
                    try {
                        while (enumerator_11["System.Collections.IEnumerator.MoveNext"]()) {
                            let a_1, b_1;
                            const forLoopVar_3 = enumerator_11["System.Collections.Generic.IEnumerator`1.get_Current"]();
                            const b_2 = forLoopVar_3[1];
                            const a_2 = forLoopVar_3[0];
                            if ((known(a_2) && known(b_2)) && !((a_1 = a_2, (b_1 = b_2, exists_1((e_1) => {
                                if ((text(e_1, "from") === a_1) && (text(e_1, "to") === b_1)) {
                                    return true;
                                }
                                else if (text(e_1, "from") === b_1) {
                                    return text(e_1, "to") === a_1;
                                }
                                else {
                                    return false;
                                }
                            }, edges))))) {
                                Findings__err_Z721C83C5(f, `${sid}: the path goes from ${a_2} to ${b_2}, but the map has no edge between them`);
                            }
                        }
                    }
                    finally {
                        disposeSafe(enumerator_11);
                    }
                }
                const inside = insideOf(s_4);
                if ((inside === "") && !Operators_IsNull(Py_get(s_4, "inside"))) {
                    Findings__err_Z721C83C5(f, concat(sid, ": \"inside\" is the id of one part of the map, as a string"));
                }
                if (inside !== "") {
                    if (!known(inside)) {
                        Findings__err_Z721C83C5(f, concat(sid, ": \"inside\": ", Py_reprStr(inside), " is not a part of the map"));
                    }
                    if (isWhy(sid) ? true : Py_truthy(Py_get(s_4, "recap"))) {
                        Findings__err_Z721C83C5(f, concat(sid, ": \"inside\" cannot be on a bridge or recap scene (the frame draws those; no module is inside anything there)"));
                    }
                }
            }
        }
        finally {
            disposeSafe(enumerator_9);
        }
        const arr_1 = toArray(scenes);
        iterateIndexed_1((k_6, s_5) => {
            const inside_1 = insideOf(s_5);
            if (inside_1 !== "") {
                const first = (k_6 === 0) ? true : (insideOf(item(k_6 - 1, arr_1)) !== inside_1);
                const last = (k_6 === (arr_1.length - 1)) ? true : (insideOf(item(k_6 + 1, arr_1)) !== inside_1);
                const lead = number(s_5, "lead", 0.4);
                const tail = number(s_5, "pad", 0.9) + number(s_5, "hold", 0);
                if (first && (lead < VISIT_LEAD)) {
                    Findings__warn_Z721C83C5(f, `${idOf(s_5)}: the zoom into ${inside_1} takes ${VISIT_LEAD} s; give this scene "lead": ${VISIT_LEAD} or more (it has ${lead})`);
                }
                if ((last && (k_6 < (arr_1.length - 1))) && (tail < VISIT_TAIL)) {
                    Findings__warn_Z721C83C5(f, `${idOf(s_5)}: the zoom out of ${inside_1} needs "pad" plus "hold" of ${VISIT_TAIL} s or more (it has ${tail})`);
                }
            }
        }, arr_1);
        if (!exists_1(hasPath, scenes)) {
            Findings__warn_Z721C83C5(f, "map: no bridge scene has a \"path\", so the map never opens a chapter");
        }
        const option_1 = lesson;
        if (option_1 != null) {
            const doc_1 = lower(option_1);
            const enumerator_12 = getEnumerator(parts);
            try {
                while (enumerator_12["System.Collections.IEnumerator.MoveNext"]()) {
                    const label_1 = text(enumerator_12["System.Collections.Generic.IEnumerator`1.get_Current"](), "label");
                    if ((label_1 !== "") && !(doc_1.indexOf(lower(label_1)) >= 0)) {
                        Findings__warn_Z721C83C5(f, concat("map: the label ", Py_reprStr(label_1), " does not appear in the document"));
                    }
                }
            }
            finally {
                disposeSafe(enumerator_12);
            }
        }
    }
}

function reportGlossary(script) {
    if (glossary != null) {
        const g = glossary;
        const uses = sortBy((tupledArg) => tupledArg[0][0].toLocaleLowerCase(), List_countBy((x) => x, collect((s) => uses_1(g, rawSay(s)), Py_list(script, "scenes")), {
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
}

export function run(ws, args) {
    let option_3;
    const clip = ws;
    let lesson;
    const matchValue = tryFindIndex((y) => ("--lesson" === y), args);
    lesson = ((matchValue == null) ? undefined : resolve(item_1(matchValue + 1, args)));
    const f = new Findings([], [], new Map());
    glossary = load_1(clip);
    const patternInput = load(f, clip);
    const timing = patternInput[1];
    const script = patternInput[0];
    const jsFiles = map_3((n_1) => join_1(ofArray([clip, n_1])), Py_sortWith((a, b) => (Py_cmpStr(a, b) | 0), filter((n) => n.endsWith(".js"), readDir(clip))));
    checkScript(f, script);
    const ok = ofSeq_1(map_3(Py_str, Py_list(script, "readsFine")), {
        Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
    });
    const enumerator = getEnumerator(f.Read.entries());
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const where = forLoopVar[1];
            const tok = forLoopVar[0];
            if (!FSharpSet__Contains(ok, tok)) {
                Findings__warn_Z721C83C5(f, `'${tok}' is read as written (${join(", ", truncate_1(4, where))}${(where.length > 4) ? " …" : ""}): wrap it as [${tok}](how to say it), or list it in "readsFine" once checked by ear`);
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    const longVideo = checkLong(f, clip, script);
    checkCues(f, timing, jsFiles);
    const option_1 = lesson;
    if (option_1 != null) {
        checkLesson(f, script, jsFiles, readText(option_1));
    }
    checkMap(f, script, jsFiles, (option_3 = lesson, (option_3 != null) ? readText(option_3) : undefined));
    reportLength(script, longVideo);
    reportDuration(f, clip, timing);
    reportBreathing(f, timing, longVideo);
    reportFlow(f, script, longVideo);
    reportGlossary(script);
    let enumerator_1 = getEnumerator(f.Warnings);
    try {
        while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
            Py_print(concat("warn   ", enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]()));
        }
    }
    finally {
        disposeSafe(enumerator_1);
    }
    let enumerator_2 = getEnumerator(f.Errors);
    try {
        while (enumerator_2["System.Collections.IEnumerator.MoveNext"]()) {
            Py_print(concat("ERROR  ", enumerator_2["System.Collections.Generic.IEnumerator`1.get_Current"]()));
        }
    }
    finally {
        disposeSafe(enumerator_2);
    }
    Py_print(`${f.Errors.length} error(s), ${f.Warnings.length} warning(s)`);
    Py_flush();
    if (f.Errors.length > 0) {
        return 1;
    }
    else {
        return 0;
    }
}

