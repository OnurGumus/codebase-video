
import { Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { class_type, bool_type, obj_type, record_type, array_type, float64_type, int32_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { Py_flush, Py_fail, Py_print, Py_repr, Py_jsonNum, Py_fmtF, Py_isStr, Py_numStr, Py_cmpStr, Py_sortWith, Py_reprStr, Py_fixedW, Py_take, Py_round, Py_list, Py_get, Py_truthy, Py_str } from "./Check.js";
import { sortBy, contains as contains_1, tryFind as tryFind_1, exists, filter, collect as collect_1, fold, last as last_1, map, sort, indexed, singleton as singleton_1, length, toArray, ofArray, empty, reverse, cons, head, tail, isEmpty } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { concat, join as join_1, split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { fold as fold_1, min, map as map_1, item, tryLast, tryFind, scan, contains } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { disposeSafe, getEnumerator, comparePrimitives, defaultOf, equals, stringHash } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { toJson, join, readJson } from "./Node.js";
import { empty as empty_1, toList, singleton, collect, delay, toArray as toArray_1 } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { List_distinctBy, List_groupBy } from "./fable_modules/fable-library-js.5.19.0/Seq2.js";
import { min as min_1, parse, max } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { rangeDouble } from "./fable_modules/fable-library-js.5.19.0/Range.js";
import { ofList, empty as empty_2, add, tryFind as tryFind_2 } from "./fable_modules/fable-library-js.5.19.0/Map.js";

function PAUSE(_arg) {
    switch (_arg) {
        case ",":
            return 4;
        case ";":
        case ":":
        case "—":
        case "–":
            return 6;
        case ".":
        case "?":
        case "!":
            return 8;
        default:
            return 0;
    }
}

class Unit extends Record {
    constructor(Sid, Index, Start, End, Text$, Weights) {
        super();
        this.Sid = Sid;
        this.Index = (Index | 0);
        this.Start = Start;
        this.End = End;
        this.Text = Text$;
        this.Weights = Weights;
    }
}

function Unit_$reflection() {
    return record_type("ScanReport.Unit", [], Unit, () => [["Sid", string_type], ["Index", int32_type], ["Start", float64_type], ["End", float64_type], ["Text", array_type(string_type)], ["Weights", array_type(int32_type)]]);
}

function num(o, k) {
    return o[k];
}

function txt(it) {
    return it.txt;
}

function layer(it) {
    return it.layer;
}

function op(it) {
    return num(it, "op");
}

function isModule(it) {
    return Py_str(layer(it)).startsWith("mod-");
}

function has(it, k) {
    return Py_truthy(Py_get(it, k));
}

function items(f) {
    return Py_list(f, "items");
}

function t(f) {
    return num(f, "t");
}

function col(it) {
    return Py_round(num(it, "x") / 30);
}

function stretches(held, start, frames) {
    const go = (current_mut, finished_mut, fs_mut) => {
        go:
        while (true) {
            const current = current_mut, finished = finished_mut, fs = fs_mut;
            if (!isEmpty(fs)) {
                const rest = tail(fs);
                const f = head(fs);
                const matchValue = held(f);
                let matchResult;
                if (matchValue) {
                    if (current == null) {
                        matchResult = 0;
                    }
                    else {
                        matchResult = 2;
                    }
                }
                else if (current != null) {
                    matchResult = 1;
                }
                else {
                    matchResult = 2;
                }
                switch (matchResult) {
                    case 0: {
                        current_mut = [t(f), start(f)];
                        finished_mut = finished;
                        fs_mut = rest;
                        continue go;
                    }
                    case 1: {
                        current_mut = undefined;
                        finished_mut = cons([current[0], current[1], t(f)], finished);
                        fs_mut = rest;
                        continue go;
                    }
                    default: {
                        current_mut = current;
                        finished_mut = finished;
                        fs_mut = rest;
                        continue go;
                    }
                }
            }
            else {
                return reverse(finished);
            }
            break;
        }
    };
    return go(undefined, empty(), ofArray(frames));
}

class Overlap extends Record {
    constructor(A, B, W, WFloat, H, HFloat) {
        super();
        this.A = A;
        this.B = B;
        this.W = W;
        this.WFloat = WFloat;
        this.H = H;
        this.HFloat = HFloat;
    }
}

function Overlap_$reflection() {
    return record_type("ScanReport.Overlap", [], Overlap, () => [["A", obj_type], ["B", obj_type], ["W", float64_type], ["WFloat", bool_type], ["H", float64_type], ["HFloat", bool_type]]);
}

function overlapOf(A, B) {
    let patternInput_3, T_1, S_1;
    const A_1 = A;
    const B_1 = B;
    const shape = (it) => {
        if (has(it, "svg")) {
            return true;
        }
        else {
            return has(it, "box");
        }
    };
    const shapes = [shape(A_1), shape(B_1)];
    if (shapes[0] && shapes[1]) {
        return undefined;
    }
    else {
        const matchValue = split(A_1.path, ["/"], undefined, 0);
        const matchValue_1 = split(B_1.path, ["/"], undefined, 0);
        if (contains(Py_str(A_1.id), matchValue_1, {
            Equals: (x, y) => (x === y),
            GetHashCode: (x) => (stringHash(x) | 0),
        }) ? true : contains(Py_str(B_1.id), matchValue, {
            Equals: (x_1, y_1) => (x_1 === y_1),
            GetHashCode: (x_1) => (stringHash(x_1) | 0),
        })) {
            return undefined;
        }
        else {
            const matchValue_2 = num(A_1, "r");
            const matchValue_3 = num(B_1, "r");
            const matchValue_4 = num(A_1, "x");
            const xB = num(B_1, "x");
            const xA = matchValue_4;
            const rB = matchValue_3;
            const rA = matchValue_2;
            const r = (rB < rA) ? rB : rA;
            const x_2 = (xB > xA) ? xB : xA;
            const w = r - x_2;
            const matchValue_6 = num(A_1, "b");
            const matchValue_7 = num(B_1, "b");
            const matchValue_8 = num(A_1, "y");
            const yB = num(B_1, "y");
            const yA = matchValue_8;
            const bB = matchValue_7;
            const bA = matchValue_6;
            const bb = (bB < bA) ? bB : bA;
            const y_2 = (yB > yA) ? yB : yA;
            const h = bb - y_2;
            const isF = (v) => !(Number.isInteger(v));
            if ((w > 4) && (h > 6)) {
                if ((shapes[0] ? true : shapes[1]) && ((patternInput_3 = (shapes[0] ? [B_1, A_1] : [A_1, B_1]), (T_1 = patternInput_3[0], (S_1 = patternInput_3[1], (((num(T_1, "x") >= (num(S_1, "x") - 2)) && (num(T_1, "r") <= (num(S_1, "r") + 2))) && (num(T_1, "y") >= (num(S_1, "y") - 2))) && (num(T_1, "b") <= (num(S_1, "b") + 2))))))) {
                    return undefined;
                }
                else {
                    return new Overlap(A_1, B_1, w, isF(r) ? true : isF(x_2), h, isF(bb) ? true : isF(y_2));
                }
            }
            else {
                return undefined;
            }
        }
    }
}

class Report {
    constructor(clip) {
        let matchValue;
        this.scan = readJson(join(ofArray([clip, "build", "scan.json"])));
        const timing = readJson(join(ofArray([clip, "build", "timing.json"])));
        this.frames = toArray(Py_list(this.scan, "frames"));
        this.step = ((matchValue = Py_get(this.scan, "step"), equals(matchValue, defaultOf()) ? 0.25 : matchValue));
        this.units = toArray_1(delay(() => collect((s_1) => collect((matchValue_1) => {
            const se = matchValue_1[1];
            const parts = Py_list(se, "parts");
            return collect((u) => {
                let text;
                const sp = Py_get(u, "spoken");
                text = (Py_truthy(sp) ? sp : Py_get(u, "text"));
                const cps = Array.from(text);
                return singleton(new Unit(s_1.id, matchValue_1[0], num(u, "start"), num(u, "end"), cps, scan((w, c) => (((w + 1) + PAUSE(c)) | 0), 0, cps, Int32Array)));
            }, (length(parts) > 1) ? parts : singleton_1(se));
        }, indexed(Py_list(s_1, "sentences"))), Py_list(timing, "scenes"))));
        this.sceneStarts = sort(map((s_2) => num(s_2, "start"), Py_list(timing, "scenes")), {
            Compare: (x, y) => (comparePrimitives(x, y) | 0),
        });
        this.entries = map((tupledArg_2) => {
            const hits = tupledArg_2[1];
            return [tupledArg_2[0], last_1(hits)[2], reverse(fold((ivs, tupledArg_3) => {
                const time = tupledArg_3[1];
                let matchResult, a_1, b_1, rest_1;
                if (!isEmpty(ivs)) {
                    if (Math.abs(head(ivs)[1] - (time - this.step)) < 1E-06) {
                        matchResult = 0;
                        a_1 = head(ivs)[0];
                        b_1 = head(ivs)[1];
                        rest_1 = tail(ivs);
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
                        return cons([a_1, time], rest_1);
                    default:
                        return cons([time, time], ivs);
                }
            }, empty(), hits))];
        }, List_groupBy((tupledArg_1) => tupledArg_1[0], collect_1((f) => map((tupledArg) => [tupledArg[0], t(f), tupledArg[1]], List_distinctBy((tuple) => tuple[0], map((it_1) => [toJson([Py_take(60, txt(it_1)), col(it_1), layer(it_1)]), it_1], filter((it) => !((((op(it) < 0.15) ? true : has(it, "svg")) ? true : has(it, "box")) ? true : has(it, "pk")), items(f))), {
            Equals: (x_1, y_1) => (x_1 === y_1),
            GetHashCode: (x_1) => (stringHash(x_1) | 0),
        })), ofArray(this.frames)), {
            Equals: (x_2, y_2) => (x_2 === y_2),
            GetHashCode: (x_2) => (stringHash(x_2) | 0),
        }));
        this.f72 = ((x_3) => Py_fixedW(7, 2, x_3));
    }
}

function Report_$reflection() {
    return class_type("ScanReport.Report", undefined, Report);
}

function Report_$ctor_Z721C83C5(clip) {
    return new Report(clip);
}

function Report__get_Errors(_) {
    return filter((l_1) => {
        const low = l_1.toLocaleLowerCase();
        if ((low.indexOf("error") >= 0) ? true : (low.indexOf("failed") >= 0)) {
            return !(l_1.indexOf("Failed to load resource") >= 0);
        }
        else {
            return false;
        }
    }, map((l) => l, Py_list(_.scan, "logs")));
}

function Report__said_5E38073B(_, time) {
    const matchValue = tryFind((u) => {
        if (u.Start <= time) {
            return time <= u.End;
        }
        else {
            return false;
        }
    }, _.units);
    if (matchValue == null) {
        const matchValue_1 = tryLast(_.units.filter((u_2) => (u_2.End < time)));
        if (matchValue_1 == null) {
            return "[before speech]";
        }
        else {
            const p = matchValue_1;
            return `[silence after ${p.Sid}#${p.Index}]`;
        }
    }
    else {
        const u_1 = matchValue;
        const total = item(u_1.Text.length, u_1.Weights) | 0;
        const target = ((time - u_1.Start) / max(u_1.End - u_1.Start, 1E-06)) * ((total === 0) ? 1 : total);
        const reach = (k_mut) => {
            reach:
            while (true) {
                const k = k_mut;
                if ((k < u_1.Text.length) && (item(k, u_1.Weights) < target)) {
                    k_mut = (k + 1);
                    continue reach;
                }
                else {
                    return k | 0;
                }
                break;
            }
        };
        const k_1 = reach(0) | 0;
        return `${u_1.Sid}#${u_1.Index} …${Report__slice(_, u_1.Text, max(0, k_1 - 25), k_1)}|${Report__slice(_, u_1.Text, k_1, k_1 + 30)}…`;
    }
}

function Report__nearSceneChange(_, a, b) {
    return exists((t0) => {
        if ((a - _.step) <= t0) {
            return t0 <= (b + _.step);
        }
        else {
            return false;
        }
    }, _.sceneStarts);
}

function Report__short(r) {
    Report__line_Z721C83C5(r, "== text on screen under 3 s");
    const enumerator = getEnumerator(r.entries);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const it = forLoopVar[1];
            if (isModule(it)) {
                const enumerator_1 = getEnumerator(forLoopVar[2]);
                try {
                    while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                        const forLoopVar_1 = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                        const b = forLoopVar_1[1];
                        const a = forLoopVar_1[0];
                        if (((b - a) + r.step) < 3) {
                            const cut = Report__nearSceneChange(r, b, b + 0.5) ? " (cut by a scene change)" : "";
                            Report__line_Z721C83C5(r, `${r.f72(a)}-${r.f72(b)} (${Py_fixedW(4, 1, (b - a) + r.step)}s)${cut} ${Py_reprStr(Py_take(60, txt(it)))}
          on: ${Report__said_5E38073B(r, a)}`);
                        }
                    }
                }
                finally {
                    disposeSafe(enumerator_1);
                }
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

function Report__overlap(_) {
    Report__line_Z721C83C5(_, "== overlaps (text over text, text over part of a drawing, text straddling a box border)");
    const byNum = parse;
    const enumerator = getEnumerator(Py_sortWith((tupledArg_2, tupledArg_3) => (defaultArg(tryFind_1((y_1) => (0 !== y_1), ofArray([comparePrimitives(tupledArg_2[0], tupledArg_3[0]), comparePrimitives(tupledArg_2[1], tupledArg_3[1]), Py_cmpStr(tupledArg_2[2], tupledArg_3[2]), Py_cmpStr(tupledArg_2[3], tupledArg_3[3]), comparePrimitives(byNum(tupledArg_2[4]), byNum(tupledArg_3[4])), comparePrimitives(byNum(tupledArg_2[5]), byNum(tupledArg_3[5]))])), 0) | 0), map((tupledArg_1) => {
        const group = tupledArg_1[1];
        const patternInput = head(group);
        const o_1 = patternInput[2];
        return [patternInput[1], last_1(group)[1], Py_take(45, txt(o_1.A)), Py_take(45, txt(o_1.B)), Py_numStr(o_1.W, o_1.WFloat), Py_numStr(o_1.H, o_1.HFloat)];
    }, List_groupBy((tupledArg) => tupledArg[0], collect_1((f) => {
        const its = toArray(filter((i) => {
            if ((op(i) >= 0.5) && isModule(i)) {
                return !has(i, "pk");
            }
            else {
                return false;
            }
        }, items(f)));
        return toList(delay(() => collect((i_1) => collect((j) => {
            const matchValue = overlapOf(item(i_1, its), item(j, its));
            if (matchValue == null) {
                return empty_1();
            }
            else {
                const o = matchValue;
                return singleton([toJson([o.A.id, o.B.id]), t(f), o]);
            }
        }, rangeDouble(i_1 + 1, 1, its.length - 1)), rangeDouble(0, 1, its.length - 1))));
    }, ofArray(_.frames)), {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    }))));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            Report__line_Z721C83C5(_, `${_.f72(forLoopVar[0])}-${_.f72(forLoopVar[1])} w${forLoopVar[4]} h${forLoopVar[5]}  ${Py_reprStr(forLoopVar[2])}  X  ${Py_reprStr(forLoopVar[3])}`);
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

function Report__empty(r) {
    Report__line_Z721C83C5(r, "== empty stage for 2 s or more");
    const enumerator = getEnumerator(stretches((f_1) => isEmpty(filter((i) => {
        if (op(i) >= 0.5) {
            if (isModule(i)) {
                return true;
            }
            else if (contains_1(Py_str(layer(i)), ofArray(["card", "titleCard", "toasts"]), {
                Equals: (x, y) => (x === y),
                GetHashCode: (x) => (stringHash(x) | 0),
            })) {
                return Py_isStr(layer(i));
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }, items(f_1))), (value) => {
    }, r.frames));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const t1 = forLoopVar[2];
            const r0 = forLoopVar[0];
            if ((t1 - r0) >= 2) {
                Report__line_Z721C83C5(r, `${r.f72(r0)}-${r.f72(t1)} (${Py_fmtF(1, t1 - r0)}s) ${Report__said_5E38073B(r, r0)}`);
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

function Report__headonly(r) {
    Report__line_Z721C83C5(r, "== heading only for 4 s or more");
    const mods = (f) => filter((i) => {
        if (op(i) >= 0.5) {
            return isModule(i);
        }
        else {
            return false;
        }
    }, items(f));
    const enumerator = getEnumerator(stretches((f_1) => {
        const mods_1 = mods(f_1);
        const content = filter((i_1) => (num(i_1, "y") >= 215), mods_1);
        const cards = filter((i_2) => {
            if ((op(i_2) >= 0.5) && Py_isStr(layer(i_2))) {
                return contains_1(Py_str(layer(i_2)), ofArray(["card", "titleCard"]), {
                    Equals: (x, y) => (x === y),
                    GetHashCode: (x) => (stringHash(x) | 0),
                });
            }
            else {
                return false;
            }
        }, items(f_1));
        if (!isEmpty(mods_1) && isEmpty(content)) {
            return isEmpty(cards);
        }
        else {
            return false;
        }
    }, (f_2) => map((i_3) => Py_take(40, txt(i_3)), mods(f_2)), r.frames));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const t1 = forLoopVar[2];
            const r0 = forLoopVar[0];
            if ((t1 - r0) >= 4) {
                const shown = ("[" + join_1(", ", map(Py_reprStr, forLoopVar[1]))) + "]";
                Report__line_Z721C83C5(r, `${r.f72(r0)}-${r.f72(t1)} (${Py_fmtF(1, t1 - r0)}s) ${shown}  ${Report__said_5E38073B(r, r0)}`);
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

function Report__bounds(_) {
    Report__line_Z721C83C5(_, "== outside x 60-1860 / y 240-1000 (headings sit higher by design)");
    const enumerator = getEnumerator(List_groupBy((tupledArg) => tupledArg[0], collect_1((f) => map((it_1) => {
        const name = Py_take(50, txt(it_1));
        return [toJson([it_1.id, name]), name, t(f), it_1];
    }, filter((it) => {
        if (!(((op(it) < 0.5) ? true : !isModule(it)) ? true : (num(it, "y") < 200))) {
            if ((num(it, "x") < 58) ? true : (num(it, "r") > 1862)) {
                return true;
            }
            else {
                return num(it, "b") > 1002;
            }
        }
        else {
            return false;
        }
    }, items(f))), ofArray(_.frames)), {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    }));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const group = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]()[1];
            const patternInput = head(group);
            const patternInput_1 = last_1(group);
            const n = (k_1) => Py_jsonNum(num(patternInput[3], k_1));
            Report__line_Z721C83C5(_, `${_.f72(patternInput[2])}-${_.f72(patternInput_1[2])} ${Py_reprStr(patternInput[1])} x${n("x")} y${n("y")} r${n("r")} b${n("b")}`);
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

function Report__blink(r) {
    Report__line_Z721C83C5(r, "== blinks: an element dipping below 95% and back within 1 s (or jumping position)");
    const hits = collect_1((f) => map((it_1) => {
        const name = Py_take(60, txt(it_1));
        return [toJson([name, col(it_1)]), name, t(f), [op(it_1), it_1.y]];
    }, filter((it) => {
        if (isModule(it) && !has(it, "pk")) {
            return !has(it, "box");
        }
        else {
            return false;
        }
    }, items(f))), ofArray(r.frames));
    const ts = map_1(t, r.frames, Float64Array);
    const n = ts.length | 0;
    const advance = (cond_mut, i_mut) => {
        advance:
        while (true) {
            const cond = cond_mut, i = i_mut;
            if ((i < n) && cond(i)) {
                cond_mut = cond;
                i_mut = (i + 1);
                continue advance;
            }
            else {
                return i | 0;
            }
            break;
        }
    };
    const enumerator = getEnumerator(List_groupBy((tupledArg) => tupledArg[0], hits, {
        Equals: (x, y) => (x === y),
        GetHashCode: (x) => (stringHash(x) | 0),
    }));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const group = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]()[1];
            const patternInput = head(group);
            const series = fold((m, tupledArg_1) => {
                const time = tupledArg_1[2];
                const _arg_5 = tupledArg_1[3];
                const o = _arg_5[0];
                const matchValue = tryFind_2(time, m);
                let matchResult, prev_1;
                if (matchValue != null) {
                    if (!(o > matchValue[0])) {
                        matchResult = 0;
                        prev_1 = matchValue[0];
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
                        return m;
                    default:
                        return add(time, [o, _arg_5[1]], m);
                }
            }, empty_2({
                Compare: (x_1, y_2) => (comparePrimitives(x_1, y_2) | 0),
            }), group);
            const vals = map_1((time_1) => {
                const matchValue_1 = tryFind_2(time_1, series);
                if (matchValue_1 == null) {
                    return [0, defaultOf()];
                }
                else {
                    return matchValue_1;
                }
            }, ts);
            const walk = (i_1_mut, found_mut) => {
                walk:
                while (true) {
                    const i_1 = i_1_mut, found = found_mut;
                    if (i_1 >= n) {
                        return reverse(found);
                    }
                    else if (item(i_1, vals)[0] >= 0.95) {
                        const j = advance((x_2) => (item(x_2, vals)[0] >= 0.95), i_1 + 1) | 0;
                        const k2 = advance((x_3) => ((item(x_3, vals)[0] < 0.95) && ((item(x_3, ts) - item(j, ts)) <= 1)), j) | 0;
                        if (((((j < n) && (k2 < n)) && (item(k2, vals)[0] >= 0.95)) && ((item(k2, ts) - item(j, ts)) <= 1)) && !Report__nearSceneChange(r, item(j, ts), item(k2, ts))) {
                            const low = min(map_1((tuple) => tuple[0], vals.slice(j, (k2 - 1) + 1), Float64Array), {
                                Compare: (x_4, y_3) => (comparePrimitives(x_4, y_3) | 0),
                            });
                            const matchValue_2 = item(j - 1, vals)[1];
                            const y1 = item(k2, vals)[1];
                            const y0 = matchValue_2;
                            const moved = ((y0 == null) ? true : (y1 == null)) ? !((y0 == null) && (y1 == null)) : (y0 !== y1);
                            i_1_mut = j;
                            found_mut = cons(`${r.f72(item(j, ts))}-${r.f72(item(k2, ts))} min ${Py_fmtF(2, low)}${moved ? " moved" : ""}  ${Py_reprStr(patternInput[1])}`, found);
                            continue walk;
                        }
                        else {
                            i_1_mut = j;
                            found_mut = found;
                            continue walk;
                        }
                    }
                    else {
                        i_1_mut = (i_1 + 1);
                        found_mut = found;
                        continue walk;
                    }
                    break;
                }
            };
            const enumerator_1 = getEnumerator(walk(0, empty()));
            try {
                while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                    Report__line_Z721C83C5(r, enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]());
                }
            }
            finally {
                disposeSafe(enumerator_1);
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

function Report__ending(_) {
    Report__line_Z721C83C5(_, "== the last frame: content that fades out while other content holds");
    if (_.frames.length >= 4) {
        const last = item(_.frames.length - 1, _.frames);
        const target = t(last) - 1;
        const before = fold_1((best, f) => {
            if (Math.abs(t(f) - target) < Math.abs(t(best) - target)) {
                return f;
            }
            else {
                return best;
            }
        }, item(0, _.frames), _.frames);
        const opacities = (f_1) => map((tupledArg_1) => {
            const patternInput = last_1(tupledArg_1[1]);
            return [tupledArg_1[0], patternInput[1], patternInput[2]];
        }, List_groupBy((tupledArg) => tupledArg[0], map((i_1) => {
            const name = Py_take(60, txt(i_1));
            return [toJson([name, col(i_1)]), name, op(i_1)];
        }, filter((i) => {
            if (isModule(i)) {
                return !has(i, "pk");
            }
            else {
                return false;
            }
        }, items(f_1))), {
            Equals: (x, y) => (x === y),
            GetHashCode: (x) => (stringHash(x) | 0),
        }));
        const now = opacities(last);
        const holding = length(filter((tupledArg_2) => (tupledArg_2[2] >= 0.9), now)) | 0;
        const nowOp = ofList(map((tupledArg_3) => [tupledArg_3[0], tupledArg_3[2]], now), {
            Compare: (x_1, y_1) => (comparePrimitives(x_1, y_1) | 0),
        });
        const nowGet = (k_3) => defaultArg(tryFind_2(k_3, nowOp), 0);
        const enumerator = getEnumerator(opacities(before));
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const k_4 = forLoopVar[0];
                if (((forLoopVar[2] >= 0.95) && (nowGet(k_4) < 0.6)) && (holding > 0)) {
                    Report__line_Z721C83C5(_, `  ${Py_reprStr(forLoopVar[1])} fades to ${Py_fmtF(2, nowGet(k_4))} by ${Py_fmtF(2, t(last))} while ${holding} other item(s) hold`);
                }
            }
        }
        finally {
            disposeSafe(enumerator);
        }
    }
}

function Report__timeline(r) {
    const enumerator = getEnumerator(sortBy((tupledArg) => head(tupledArg[2])[0], r.entries, {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    }));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const it = forLoopVar[1];
            const enumerator_1 = getEnumerator(forLoopVar[2]);
            try {
                while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                    const forLoopVar_1 = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    const b = forLoopVar_1[1];
                    const a = forLoopVar_1[0];
                    Report__line_Z721C83C5(r, `${r.f72(a)}-${r.f72(b)} (${Py_fixedW(5, 1, (b - a) + r.step)}s) [${Py_str(layer(it))}] ${Py_reprStr(Py_take(70, txt(it)))}
          on: ${Report__said_5E38073B(r, a)}`);
                }
            }
            finally {
                disposeSafe(enumerator_1);
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

function Report__at_5E38073B(r, time) {
    const f_1 = fold_1((best, f) => {
        if (Math.abs(t(f) - time) < Math.abs(t(best) - time)) {
            return f;
        }
        else {
            return best;
        }
    }, item(0, r.frames), r.frames);
    Report__line_Z721C83C5(r, (Py_jsonNum(t(f_1)) + " ") + Report__said_5E38073B(r, t(f_1)));
    const enumerator = getEnumerator(items(f_1));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            Report__line_Z721C83C5(r, Py_repr(enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]()));
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

export function Report__slice(this$, cps, a, b) {
    const b_1 = min_1(b, cps.length) | 0;
    if (a >= b_1) {
        return "";
    }
    else {
        return join_1("", cps.slice(a, (b_1 - 1) + 1));
    }
}

export function Report__line_Z721C83C5(this$, s) {
    Py_print(s);
}

const modes = ofArray(["short", "overlap", "empty", "headonly", "bounds", "blink", "ending", "timeline"]);

/**
 * args: [mode (default all)] [mode arguments...]; `at` takes a time in seconds.
 */
export function run(ws, args) {
    let tArg, m_1, m_2, m_3;
    const mode = isEmpty(args) ? "all" : head(args);
    let matchResult, tArg_1, m_4;
    if (mode === "at") {
        if (!isEmpty(args)) {
            if (!isEmpty(tail(args))) {
                if ((tArg = head(tail(args)), Number.isNaN(Number(tArg)) ? true : (tArg.trim() === ""))) {
                    matchResult = 1;
                    tArg_1 = head(tail(args));
                }
                else if ((m_1 = mode, ((m_1 !== "at") && (m_1 !== "all")) && !contains_1(m_1, modes, {
                    Equals: (x, y) => (x === y),
                    GetHashCode: (x) => (stringHash(x) | 0),
                }))) {
                    matchResult = 2;
                    m_4 = mode;
                }
                else {
                    matchResult = 3;
                }
            }
            else {
                matchResult = 0;
            }
        }
        else if ((m_2 = mode, ((m_2 !== "at") && (m_2 !== "all")) && !contains_1(m_2, modes, {
            Equals: (x_1, y_1) => (x_1 === y_1),
            GetHashCode: (x_1) => (stringHash(x_1) | 0),
        }))) {
            matchResult = 2;
            m_4 = mode;
        }
        else {
            matchResult = 3;
        }
    }
    else if ((m_3 = mode, ((m_3 !== "at") && (m_3 !== "all")) && !contains_1(m_3, modes, {
        Equals: (x_2, y_2) => (x_2 === y_2),
        GetHashCode: (x_2) => (stringHash(x_2) | 0),
    }))) {
        matchResult = 2;
        m_4 = mode;
    }
    else {
        matchResult = 3;
    }
    switch (matchResult) {
        case 0:
            return Py_fail("usage: report at <seconds>") | 0;
        case 1:
            return Py_fail(concat("report at: not a time: ", Py_reprStr(tArg_1))) | 0;
        case 2:
            return Py_fail(`unknown report mode ${Py_reprStr(m_4)} (all|${join_1("|", modes)}|at <t>)`) | 0;
        default: {
            const r = Report_$ctor_Z721C83C5(ws);
            let matchResult_1, tArg_2;
            switch (mode) {
                case "at": {
                    if (!isEmpty(args)) {
                        if (!isEmpty(tail(args))) {
                            matchResult_1 = 0;
                            tArg_2 = head(tail(args));
                        }
                        else {
                            matchResult_1 = 9;
                        }
                    }
                    else {
                        matchResult_1 = 9;
                    }
                    break;
                }
                case "all": {
                    matchResult_1 = 1;
                    break;
                }
                case "short": {
                    matchResult_1 = 2;
                    break;
                }
                case "overlap": {
                    matchResult_1 = 3;
                    break;
                }
                case "empty": {
                    matchResult_1 = 4;
                    break;
                }
                case "headonly": {
                    matchResult_1 = 5;
                    break;
                }
                case "bounds": {
                    matchResult_1 = 6;
                    break;
                }
                case "blink": {
                    matchResult_1 = 7;
                    break;
                }
                case "ending": {
                    matchResult_1 = 8;
                    break;
                }
                default:
                    matchResult_1 = 9;
            }
            switch (matchResult_1) {
                case 0: {
                    Report__at_5E38073B(r, Number(tArg_2));
                    break;
                }
                case 1: {
                    const errors = Report__get_Errors(r);
                    Py_print(concat("== page errors / failed module builds: ", isEmpty(errors) ? "none" : (("[" + join_1(", ", map(Py_reprStr, errors))) + "]")));
                    Report__short(r);
                    Report__overlap(r);
                    Report__empty(r);
                    Report__headonly(r);
                    Report__bounds(r);
                    Report__blink(r);
                    Report__ending(r);
                    break;
                }
                case 2: {
                    Report__short(r);
                    break;
                }
                case 3: {
                    Report__overlap(r);
                    break;
                }
                case 4: {
                    Report__empty(r);
                    break;
                }
                case 5: {
                    Report__headonly(r);
                    break;
                }
                case 6: {
                    Report__bounds(r);
                    break;
                }
                case 7: {
                    Report__blink(r);
                    break;
                }
                case 8: {
                    Report__ending(r);
                    break;
                }
                case 9: {
                    Report__timeline(r);
                    break;
                }
            }
            Py_flush();
            return 0;
        }
    }
}

