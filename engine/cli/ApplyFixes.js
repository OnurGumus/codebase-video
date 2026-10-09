
import { writeText, readJson, readText, resolve, exists, join, path } from "./Node.js";
import { zip, initialize, item, indexed, foldBack } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { tryFind, filter, empty as empty_1, FSharpMap__TryFind, FSharpMap__Add } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { ofArray, contains, map, collect, singleton, takeWhile, filter as filter_1, fold, head, tail, isEmpty, length as length_1, cons, empty } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { stringHash, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { rangeDouble } from "./fable_modules/fable-library-js.5.19.0/Range.js";
import { FSharpSet__Contains, ofList } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { Py_fail, Py_flush, Py_len, Py_print, Py_get, Py_str, Py_count } from "./Check.js";

function isAbsolutePath(p) {
    return path.isAbsolute(p);
}

function unmatched(a, b) {
    const occurrences = foldBack((tupledArg, m) => {
        const elt = tupledArg[1];
        return FSharpMap__Add(m, elt, cons(tupledArg[0], defaultArg(FSharpMap__TryFind(m, elt), empty())));
    }, indexed(b), empty_1({
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    }));
    let b2j;
    if (b.length >= 200) {
        const ntest = (~~(b.length / 100) + 1) | 0;
        b2j = filter((_arg, idxs) => (length_1(idxs) <= ntest), occurrences);
    }
    else {
        b2j = occurrences;
    }
    const blocks = (queue_mut, found_mut) => {
        blocks:
        while (true) {
            const queue = queue_mut, found = found_mut;
            if (!isEmpty(queue)) {
                const rest = tail(queue);
                const blo_1 = head(queue)[2] | 0;
                const bhi_1 = head(queue)[3] | 0;
                const alo_1 = head(queue)[0] | 0;
                const ahi_1 = head(queue)[1] | 0;
                let matchValue;
                const alo = alo_1 | 0;
                const ahi = ahi_1 | 0;
                const blo = blo_1 | 0;
                const bhi = bhi_1 | 0;
                const back = (tupledArg_3_mut) => {
                    back:
                    while (true) {
                        const tupledArg_3 = tupledArg_3_mut;
                        const besti = tupledArg_3[0] | 0;
                        const bestj = tupledArg_3[1] | 0;
                        const bestsize_1 = tupledArg_3[2] | 0;
                        if (((besti > alo) && (bestj > blo)) && (item(besti - 1, a) === item(bestj - 1, b))) {
                            tupledArg_3_mut = [besti - 1, bestj - 1, bestsize_1 + 1];
                            continue back;
                        }
                        else {
                            return [besti, bestj, bestsize_1];
                        }
                        break;
                    }
                };
                const forward = (tupledArg_4_mut) => {
                    forward:
                    while (true) {
                        const tupledArg_4 = tupledArg_4_mut;
                        const besti_1 = tupledArg_4[0] | 0;
                        const bestj_1 = tupledArg_4[1] | 0;
                        const bestsize_2 = tupledArg_4[2] | 0;
                        if ((((besti_1 + bestsize_2) < ahi) && ((bestj_1 + bestsize_2) < bhi)) && (item(besti_1 + bestsize_2, a) === item(bestj_1 + bestsize_2, b))) {
                            tupledArg_4_mut = [besti_1, bestj_1, bestsize_2 + 1];
                            continue forward;
                        }
                        else {
                            return [besti_1, bestj_1, bestsize_2];
                        }
                        break;
                    }
                };
                matchValue = forward(back(fold((tupledArg_1, i_1) => {
                    const inRange = filter_1((j_1) => (j_1 >= blo), takeWhile((j) => (j < bhi), defaultArg(tryFind(item(i_1, a), b2j), empty())));
                    return fold((tupledArg_2, j_2) => {
                        const best_2 = tupledArg_2[1];
                        const k = (defaultArg(tryFind(j_2 - 1, tupledArg_1[0]), 0) + 1) | 0;
                        return [FSharpMap__Add(tupledArg_2[0], j_2, k), (k > best_2[2]) ? [(i_1 - k) + 1, (j_2 - k) + 1, k] : best_2];
                    }, [empty_1({
                        Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
                    }), tupledArg_1[1]], inRange);
                }, [empty_1({
                    Compare: (x_2, y_2) => (comparePrimitives(x_2, y_2) | 0),
                }), [alo, blo, 0]], toList(rangeDouble(alo, 1, ahi - 1)))[1]));
                if (matchValue[2] > 0) {
                    const k_2 = matchValue[2] | 0;
                    const j_4 = matchValue[1] | 0;
                    const i_3 = matchValue[0] | 0;
                    const rest_1 = ((alo_1 < i_3) && (blo_1 < j_4)) ? cons([alo_1, i_3, blo_1, j_4], rest) : rest;
                    queue_mut = ((((i_3 + k_2) < ahi_1) && ((j_4 + k_2) < bhi_1)) ? cons([i_3 + k_2, ahi_1, j_4 + k_2, bhi_1], rest_1) : rest_1);
                    found_mut = cons([i_3, j_4, k_2], found);
                    continue blocks;
                }
                else {
                    queue_mut = rest;
                    found_mut = found;
                    continue blocks;
                }
            }
            else {
                return found;
            }
            break;
        }
    };
    const matched = blocks(singleton([0, a.length, 0, b.length]), empty());
    const uncovered = (length, starts) => {
        const covered = ofList(collect((tupledArg_5) => {
            const start = tupledArg_5[0] | 0;
            return toList(rangeDouble(start, 1, (start + tupledArg_5[1]) - 1));
        }, starts), {
            Compare: (x_3, y_3) => (comparePrimitives(x_3, y_3) | 0),
        });
        return initialize(length, (x_4) => !FSharpSet__Contains(covered, x_4));
    };
    return [uncovered(a.length, map((tupledArg_6) => [tupledArg_6[0], tupledArg_6[2]], matched)), uncovered(b.length, map((tupledArg_7) => [tupledArg_7[1], tupledArg_7[2]], matched))];
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
    const matchValue = filter_1((y_1) => ("--apply" !== y_1), args);
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
            const firstFree = (n_2_mut) => {
                firstFree:
                while (true) {
                    const n_2 = n_2_mut;
                    if (exists(backup(n_2))) {
                        n_2_mut = (n_2 + 1);
                        continue firstFree;
                    }
                    else {
                        return n_2 | 0;
                    }
                    break;
                }
            };
            const n_3 = firstFree(1) | 0;
            writeText(backup(n_3), before);
            writeText(doc, after);
            Py_print(`applied; the previous text is build/lesson.before-${n_3}.md`);
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

