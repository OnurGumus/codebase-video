
import { writeText, readJson, readText, resolve, exists, join, path } from "./Node.js";
import { zip, setItem, item, fill, iterateIndexed } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { stringHash, disposeSafe, getEnumerator, defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { tryGetValue } from "./fable_modules/fable-library-js.5.19.0/MapUtil.js";
import { FSharpRef } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { empty, singleton, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { Stack$1__Pop, Stack$1__get_Count, Stack$1__Push_2B595, Stack$1_$ctor } from "./fable_modules/fable-library-js.5.19.0/System.Collections.Generic.js";
import { split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { head, ofArray, isEmpty, filter, contains } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { Py_fail, Py_flush, Py_len, Py_print, Py_get, Py_str, Py_count } from "./Check.js";

function isAbsolutePath(p) {
    return path.isAbsolute(p);
}

function unmatched(a, b) {
    const b2j = new Map([]);
    iterateIndexed((i, elt) => {
        let matchValue;
        let outArg = defaultOf();
        matchValue = [tryGetValue(b2j, elt, new FSharpRef(() => outArg, (v) => {
            outArg = v;
        })), outArg];
        if (matchValue[0]) {
            void (matchValue[1].push(i));
        }
        else {
            b2j.set(elt, [i]);
        }
    }, b);
    if (b.length >= 200) {
        const ntest = (~~(b.length / 100) + 1) | 0;
        const enumerator = getEnumerator(toList(delay(() => collect((kv) => ((kv[1].length > ntest) ? singleton(kv[0]) : empty()), b2j))));
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const elt_1 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                b2j.delete(elt_1);
            }
        }
        finally {
            disposeSafe(enumerator);
        }
    }
    const inA = fill(new Array(a.length), 0, a.length, true);
    const inB = fill(new Array(b.length), 0, b.length, true);
    const queue = Stack$1_$ctor();
    Stack$1__Push_2B595(queue, [0, a.length, 0, b.length]);
    while (Stack$1__get_Count(queue) > 0) {
        const patternInput_1 = Stack$1__Pop(queue);
        const blo_1 = patternInput_1[2] | 0;
        const bhi_1 = patternInput_1[3] | 0;
        const alo_1 = patternInput_1[0] | 0;
        const ahi_1 = patternInput_1[1] | 0;
        let patternInput_2;
        const alo = alo_1 | 0;
        const ahi = ahi_1 | 0;
        const blo = blo_1 | 0;
        const bhi = bhi_1 | 0;
        let bestsize = 0;
        let bestj = blo;
        let besti = alo;
        let j2len = new Map([]);
        for (let i_1 = alo; i_1 <= (ahi - 1); i_1++) {
            const newj2len = new Map([]);
            let matchValue_2;
            let outArg_1 = defaultOf();
            matchValue_2 = [tryGetValue(b2j, item(i_1, a), new FSharpRef(() => outArg_1, (v_1) => {
                outArg_1 = v_1;
            })), outArg_1];
            if (matchValue_2[0]) {
                let stop = false;
                let enumerator_1 = getEnumerator(matchValue_2[1]);
                try {
                    while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                        let matchValue_3, outArg_2;
                        const j = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]() | 0;
                        if (!stop && (j >= blo)) {
                            if (j >= bhi) {
                                stop = true;
                            }
                            else {
                                const k = (((matchValue_3 = ((outArg_2 = 0, [tryGetValue(j2len, j - 1, new FSharpRef(() => (outArg_2 | 0), (v_2) => {
                                    outArg_2 = (v_2 | 0);
                                })), outArg_2])), matchValue_3[0] ? matchValue_3[1] : 0)) + 1) | 0;
                                newj2len.set(j, k);
                                if (k > bestsize) {
                                    besti = (((i_1 - k) + 1) | 0);
                                    bestj = (((j - k) + 1) | 0);
                                    bestsize = (k | 0);
                                }
                            }
                        }
                    }
                }
                finally {
                    disposeSafe(enumerator_1);
                }
            }
            j2len = newj2len;
        }
        while (((besti > alo) && (bestj > blo)) && (item(besti - 1, a) === item(bestj - 1, b))) {
            besti = ((besti - 1) | 0);
            bestj = ((bestj - 1) | 0);
            bestsize = ((bestsize + 1) | 0);
        }
        while ((((besti + bestsize) < ahi) && ((bestj + bestsize) < bhi)) && (item(besti + bestsize, a) === item(bestj + bestsize, b))) {
            bestsize = ((bestsize + 1) | 0);
        }
        patternInput_2 = [besti, bestj, bestsize];
        const k_1 = patternInput_2[2] | 0;
        const j_1 = patternInput_2[1] | 0;
        const i_2 = patternInput_2[0] | 0;
        if (k_1 > 0) {
            for (let d = 0; d <= (k_1 - 1); d++) {
                setItem(inA, i_2 + d, false);
                setItem(inB, j_1 + d, false);
            }
            if ((alo_1 < i_2) && (blo_1 < j_1)) {
                Stack$1__Push_2B595(queue, [alo_1, i_2, blo_1, j_1]);
            }
            if (((i_2 + k_1) < ahi_1) && ((j_1 + k_1) < bhi_1)) {
                Stack$1__Push_2B595(queue, [i_2 + k_1, ahi_1, j_1 + k_1, bhi_1]);
            }
        }
    }
    return [inA, inB];
}

function changedLines(before, after) {
    const matchValue = split(before, ["\n"], undefined, 0);
    const b = split(after, ["\n"], undefined, 0);
    const a = matchValue;
    const patternInput_1 = unmatched(a, b);
    const count = (lines, mask, skip) => {
        let array_1;
        const array = zip(lines, mask);
        array_1 = array.filter((tupledArg) => {
            if (tupledArg[1]) {
                return !tupledArg[0].startsWith(skip);
            }
            else {
                return false;
            }
        });
        return array_1.length | 0;
    };
    return (count(a, patternInput_1[0], "--") + count(b, patternInput_1[1], "++")) | 0;
}

/**
 * args: [fixes file (default build/lesson-fixes.json)] [--apply]
 */
export function run(ws, args) {
    const apply = contains("--apply", args, {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    });
    let fixesPath;
    const matchValue = filter((y_1) => ("--apply" !== y_1), args);
    if (isEmpty(matchValue)) {
        fixesPath = join(ofArray([ws, "build", "lesson-fixes.json"]));
    }
    else {
        const f = head(matchValue);
        const inWs = join(ofArray([ws, f]));
        fixesPath = ((!isAbsolutePath(f) && exists(inWs)) ? inWs : resolve(f));
    }
    const doc = join(ofArray([ws, "build", "lesson.md"]));
    const before = readText(doc);
    const fixes = readJson(fixesPath);
    const applyAll = (i_mut, text_mut) => {
        applyAll:
        while (true) {
            const i = i_mut, text = text_mut;
            if (i >= fixes.length) {
                return new FSharpResult$2(/* Ok */ 0, [text]);
            }
            else {
                const fx = item(i, fixes);
                const old = fx.old;
                const n = Py_count(text, old) | 0;
                if (n !== 1) {
                    return new FSharpResult$2(/* Error */ 1, [`fix ${i} (${("id" in fx) ? Py_str(Py_get(fx, "id")) : "?"}): "old" occurs ${n} times, expected 1. Nothing written.`]);
                }
                else {
                    const by = fx.new;
                    i_mut = (i + 1);
                    text_mut = ((old === "") ? by : (text.split(old).join(by)));
                    continue applyAll;
                }
            }
            break;
        }
    };
    const matchValue_1 = applyAll(0, before);
    if (matchValue_1.tag === 0) {
        const after = matchValue_1.fields[0];
        Py_print(`${Py_len(before)} -> ${Py_len(after)} chars; ${changedLines(before, after)} changed lines`);
        if (apply) {
            const backup = (n_1) => join(ofArray([ws, "build", `lesson.before-${n_1}.md`]));
            let n_2 = 1;
            while (exists(backup(n_2))) {
                n_2 = ((n_2 + 1) | 0);
            }
            writeText(backup(n_2), before);
            writeText(doc, after);
            Py_print(`applied; the previous text is build/lesson.before-${n_2}.md`);
        }
        else {
            Py_print("dry run: nothing written (add --apply)");
        }
        Py_flush();
        return 0;
    }
    else {
        return Py_fail(matchValue_1.fields[0]) | 0;
    }
}

