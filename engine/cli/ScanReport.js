
import { Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { class_type, record_type, array_type, float64_type, int32_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { Py_flush, Py_fail, Py_print, Py_repr, Py_jsonNum, Py_fmtF, Py_isStr, Py_cmpStr, Py_sortWith, Py_numStr, Py_reprStr, Py_fixedW, Py_take, Py_round, Py_list, Py_get, Py_truthy, Py_str } from "./Check.js";
import { toJson, join, readJson } from "./Node.js";
import { tail, head, sortBy, isEmpty, contains as contains_1, ofSeq, tryFind as tryFind_1, exists, filter, map, sort, indexed, singleton as singleton_1, length, toArray, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { stringHash, disposeSafe, getEnumerator, comparePrimitives, defaultOf, equals } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { filter as filter_1, length as length_1, map as map_1, singleton, collect, delay, toArray as toArray_1 } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { fold, min, map as map_2, contains, tryLast, tryFind, setItem, item, iterateIndexed } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { addToSet } from "./fable_modules/fable-library-js.5.19.0/MapUtil.js";
import { min as min_1, parse, max } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { concat, join as join_1, split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";

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
                const weights = new Int32Array(cps.length + 1);
                iterateIndexed((k, c) => {
                    setItem(weights, k + 1, ((item(k, weights) + 1) + PAUSE(c)) | 0);
                }, cps);
                return singleton(new Unit(s_1.id, matchValue_1[0], num(u, "start"), num(u, "end"), cps, weights));
            }, (length(parts) > 1) ? parts : singleton_1(se));
        }, indexed(Py_list(s_1, "sentences"))), Py_list(timing, "scenes"))));
        this.sceneStarts = sort(map((s_2) => num(s_2, "start"), Py_list(timing, "scenes")), {
            Compare: (x, y) => (comparePrimitives(x, y) | 0),
        });
        this.intervals = (new Map());
        this.info = (new Map());
        const arr = this.frames;
        for (let idx = 0; idx <= (arr.length - 1); idx++) {
            const f = item(idx, arr);
            const seenNow = new Set([]);
            const enumerator = getEnumerator(items(f));
            try {
                while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                    const it = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    if (!((((op(it) < 0.15) ? true : has(it, "svg")) ? true : has(it, "box")) ? true : has(it, "pk"))) {
                        const k_1 = toJson([Py_take(60, txt(it)), col(it), layer(it)]);
                        if (addToSet(k_1, seenNow)) {
                            this.info.set(k_1, it);
                            if (!this.intervals.has(k_1)) {
                                this.intervals.set(k_1, []);
                            }
                            const iv = this.intervals.get(k_1);
                            if ((iv.length > 0) && (Math.abs(item(1, item(iv.length - 1, iv)) - (t(f) - this.step)) < 1E-06)) {
                                item(iv.length - 1, iv)[1] = t(f);
                            }
                            else {
                                void (iv.push(new Float64Array([t(f), t(f)])));
                            }
                        }
                    }
                }
            }
            finally {
                disposeSafe(enumerator);
            }
        }
        this.f72 = ((x_1) => Py_fixedW(7, 2, x_1));
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
    let b;
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
        let k = 0;
        while ((k < u_1.Text.length) && (item(k, u_1.Weights) < target)) {
            k = ((k + 1) | 0);
        }
        return `${u_1.Sid}#${u_1.Index} …${Report__slice(_, u_1.Text, max(0, k - 25), k)}|${(b = ((k + 30) | 0), Report__slice(_, u_1.Text, k, b))}…`;
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
    const enumerator = getEnumerator(r.intervals.entries());
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const it = r.info.get(forLoopVar[0]);
            if (isModule(it)) {
                let enumerator_1 = getEnumerator(forLoopVar[1]);
                try {
                    while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                        const ab = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                        const matchValue = item(0, ab);
                        const b = item(1, ab);
                        const a = matchValue;
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
    const found = new Map();
    const order = [];
    const shape = (it) => {
        if (has(it, "svg")) {
            return true;
        }
        else {
            return has(it, "box");
        }
    };
    const arr = _.frames;
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        const f = item(idx, arr);
        const its = toArray(filter((i) => {
            if ((op(i) >= 0.5) && isModule(i)) {
                return !has(i, "pk");
            }
            else {
                return false;
            }
        }, items(f)));
        for (let i_1 = 0; i_1 <= (its.length - 1); i_1++) {
            for (let j = i_1 + 1; j <= (its.length - 1); j++) {
                let patternInput_4, T_1, S_1;
                const matchValue = item(i_1, its);
                const B = item(j, its);
                const A = matchValue;
                const shapes = [shape(A), shape(B)];
                if (!(shapes[0] && shapes[1])) {
                    const matchValue_2 = split(A.path, ["/"], undefined, 0);
                    const matchValue_3 = split(B.path, ["/"], undefined, 0);
                    if (!(contains(Py_str(A.id), matchValue_3, {
                        Equals: (x, y) => (x === y),
                        GetHashCode: (x) => (stringHash(x) | 0),
                    }) ? true : contains(Py_str(B.id), matchValue_2, {
                        Equals: (x_1, y_1) => (x_1 === y_1),
                        GetHashCode: (x_1) => (stringHash(x_1) | 0),
                    }))) {
                        const matchValue_4 = num(A, "r");
                        const matchValue_5 = num(B, "r");
                        const matchValue_6 = num(A, "x");
                        const xB = num(B, "x");
                        const xA = matchValue_6;
                        const rB = matchValue_5;
                        const rA = matchValue_4;
                        const r = (rB < rA) ? rB : rA;
                        const x_2 = (xB > xA) ? xB : xA;
                        const w = r - x_2;
                        const matchValue_8 = num(A, "b");
                        const matchValue_9 = num(B, "b");
                        const matchValue_10 = num(A, "y");
                        const yB = num(B, "y");
                        const yA = matchValue_10;
                        const bB = matchValue_9;
                        const bA = matchValue_8;
                        const bb = (bB < bA) ? bB : bA;
                        const y_2 = (yB > yA) ? yB : yA;
                        const h = bb - y_2;
                        const isF = (v) => !(Number.isInteger(v));
                        if ((w > 4) && (h > 6)) {
                            if (!((shapes[0] ? true : shapes[1]) && ((patternInput_4 = (shapes[0] ? [B, A] : [A, B]), (T_1 = patternInput_4[0], (S_1 = patternInput_4[1], (((num(T_1, "x") >= (num(S_1, "x") - 2)) && (num(T_1, "r") <= (num(S_1, "r") + 2))) && (num(T_1, "y") >= (num(S_1, "y") - 2))) && (num(T_1, "b") <= (num(S_1, "b") + 2)))))))) {
                                const key = toJson([A.id, B.id]);
                                if (found.has(key)) {
                                    const patternInput_5 = found.get(key);
                                    found.set(key, [patternInput_5[0], t(f), patternInput_5[2], patternInput_5[3], patternInput_5[4], patternInput_5[5]]);
                                }
                                else {
                                    void (order.push(key));
                                    found.set(key, [t(f), t(f), Py_take(45, txt(A)), Py_take(45, txt(B)), Py_numStr(w, isF(r) ? true : isF(x_2)), Py_numStr(h, isF(bb) ? true : isF(y_2))]);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    const byNum = parse;
    const enumerator = getEnumerator(Py_sortWith((tupledArg, tupledArg_1) => (defaultArg(tryFind_1((y_3) => (0 !== y_3), ofArray([comparePrimitives(tupledArg[0], tupledArg_1[0]), comparePrimitives(tupledArg[1], tupledArg_1[1]), Py_cmpStr(tupledArg[2], tupledArg_1[2]), Py_cmpStr(tupledArg[3], tupledArg_1[3]), comparePrimitives(byNum(tupledArg[4]), byNum(tupledArg_1[4])), comparePrimitives(byNum(tupledArg[5]), byNum(tupledArg_1[5]))])), 0) | 0), ofSeq(map_1((key_1) => found.get(key_1), order))));
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
    let run_1 = undefined;
    const arr = r.frames;
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        let r0;
        const f = item(idx, arr);
        if (isEmpty(filter((i) => {
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
        }, items(f)))) {
            run_1 = ((run_1 == null) ? t(f) : run_1);
        }
        else {
            let matchResult, r0_1;
            if (run_1 != null) {
                if ((r0 = run_1, (t(f) - r0) >= 2)) {
                    matchResult = 0;
                    r0_1 = run_1;
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
                    Report__line_Z721C83C5(r, `${r.f72(r0_1)}-${r.f72(t(f))} (${Py_fmtF(1, t(f) - r0_1)}s) ${Report__said_5E38073B(r, r0_1)}`);
                    break;
                }
            }
            run_1 = undefined;
        }
    }
}

function Report__headonly(r) {
    Report__line_Z721C83C5(r, "== heading only for 4 s or more");
    let run_1 = undefined;
    const arr = r.frames;
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        let r0;
        const f = item(idx, arr);
        const mods = filter((i) => {
            if (op(i) >= 0.5) {
                return isModule(i);
            }
            else {
                return false;
            }
        }, items(f));
        const content = filter((i_1) => (num(i_1, "y") >= 215), mods);
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
        }, items(f));
        if ((!isEmpty(mods) && isEmpty(content)) && isEmpty(cards)) {
            if (run_1 == null) {
                run_1 = [t(f), map((i_3) => Py_take(40, txt(i_3)), mods)];
            }
        }
        else {
            let matchResult, r0_1, texts_1;
            if (run_1 != null) {
                if ((run_1[1], (r0 = run_1[0], (t(f) - r0) >= 4))) {
                    matchResult = 0;
                    r0_1 = run_1[0];
                    texts_1 = run_1[1];
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
                    const shown = ("[" + join_1(", ", map(Py_reprStr, texts_1))) + "]";
                    Report__line_Z721C83C5(r, `${r.f72(r0_1)}-${r.f72(t(f))} (${Py_fmtF(1, t(f) - r0_1)}s) ${shown}  ${Report__said_5E38073B(r, r0_1)}`);
                    break;
                }
            }
            run_1 = undefined;
        }
    }
}

function Report__bounds(_) {
    Report__line_Z721C83C5(_, "== outside x 60-1860 / y 240-1000 (headings sit higher by design)");
    const bad = new Map();
    const names = new Map();
    const arr = _.frames;
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        const f = item(idx, arr);
        const enumerator = getEnumerator(items(f));
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const it = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                if (!(((op(it) < 0.5) ? true : !isModule(it)) ? true : (num(it, "y") < 200))) {
                    if (((num(it, "x") < 58) ? true : (num(it, "r") > 1862)) ? true : (num(it, "b") > 1002)) {
                        const name = Py_take(50, txt(it));
                        const k = toJson([it.id, name]);
                        if (!bad.has(k)) {
                            bad.set(k, []);
                            names.set(k, name);
                        }
                        void (bad.get(k).push([t(f), it]));
                    }
                }
            }
        }
        finally {
            disposeSafe(enumerator);
        }
    }
    const enumerator_1 = getEnumerator(bad.entries());
    try {
        while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const v = forLoopVar[1];
            const patternInput = item(0, v);
            const patternInput_1 = item(v.length - 1, v);
            const n = (k_2) => Py_jsonNum(num(patternInput[1], k_2));
            Report__line_Z721C83C5(_, `${_.f72(patternInput[0])}-${_.f72(patternInput_1[0])} ${Py_reprStr(names.get(forLoopVar[0]))} x${n("x")} y${n("y")} r${n("r")} b${n("b")}`);
        }
    }
    finally {
        disposeSafe(enumerator_1);
    }
}

function Report__blink(r) {
    Report__line_Z721C83C5(r, "== blinks: an element dipping below 95% and back within 1 s (or jumping position)");
    const series = new Map();
    const names = new Map();
    const arr = r.frames;
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        const f = item(idx, arr);
        const enumerator = getEnumerator(items(f));
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const it = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                if ((isModule(it) && !has(it, "pk")) && !has(it, "box")) {
                    const name = Py_take(60, txt(it));
                    const k = toJson([name, col(it)]);
                    if (!series.has(k)) {
                        series.set(k, new Map());
                        names.set(k, name);
                    }
                    const s_1 = series.get(k);
                    if (!s_1.has(t(f)) ? true : (op(it) > s_1.get(t(f))[0])) {
                        s_1.set(t(f), [op(it), it.y]);
                    }
                }
            }
        }
        finally {
            disposeSafe(enumerator);
        }
    }
    const ts = map_2(t, r.frames, Float64Array);
    const n = ts.length | 0;
    const enumerator_1 = getEnumerator(series.entries());
    try {
        while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const s_2 = forLoopVar[1];
            const vals = map_2((time) => {
                if (s_2.has(time)) {
                    return s_2.get(time);
                }
                else {
                    return [0, defaultOf()];
                }
            }, ts);
            let i = 0;
            while (i < n) {
                if (item(i, vals)[0] >= 0.95) {
                    let j = i + 1;
                    while ((j < n) && (item(j, vals)[0] >= 0.95)) {
                        j = ((j + 1) | 0);
                    }
                    let k2 = j;
                    while (((k2 < n) && (item(k2, vals)[0] < 0.95)) && ((item(k2, ts) - item(j, ts)) <= 1)) {
                        k2 = ((k2 + 1) | 0);
                    }
                    if (((((j < n) && (k2 < n)) && (item(k2, vals)[0] >= 0.95)) && ((item(k2, ts) - item(j, ts)) <= 1)) && !Report__nearSceneChange(r, item(j, ts), item(k2, ts))) {
                        const low = min(map_2((tuple) => tuple[0], vals.slice(j, (k2 - 1) + 1), Float64Array), {
                            Compare: (x, y) => (comparePrimitives(x, y) | 0),
                        });
                        const matchValue = item(j - 1, vals)[1];
                        const y1 = item(k2, vals)[1];
                        const y0 = matchValue;
                        const moved = ((y0 == null) ? true : (y1 == null)) ? !((y0 == null) && (y1 == null)) : (y0 !== y1);
                        Report__line_Z721C83C5(r, `${r.f72(item(j, ts))}-${r.f72(item(k2, ts))} min ${Py_fmtF(2, low)}${moved ? " moved" : ""}  ${Py_reprStr(names.get(forLoopVar[0]))}`);
                    }
                    i = (j | 0);
                }
                else {
                    i = ((i + 1) | 0);
                }
            }
        }
    }
    finally {
        disposeSafe(enumerator_1);
    }
}

function Report__ending(_) {
    Report__line_Z721C83C5(_, "== the last frame: content that fades out while other content holds");
    if (_.frames.length >= 4) {
        const last = item(_.frames.length - 1, _.frames);
        const target = t(last) - 1;
        const before = fold((best, f) => {
            if (Math.abs(t(f) - target) < Math.abs(t(best) - target)) {
                return f;
            }
            else {
                return best;
            }
        }, item(0, _.frames), _.frames);
        const opacities = (f_1) => {
            const m = new Map();
            const names = new Map();
            const enumerator = getEnumerator(items(f_1));
            try {
                while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                    const i = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    if (isModule(i) && !has(i, "pk")) {
                        const name = Py_take(60, txt(i));
                        const k = toJson([name, col(i)]);
                        m.set(k, op(i));
                        names.set(k, name);
                    }
                }
            }
            finally {
                disposeSafe(enumerator);
            }
            return [m, names];
        };
        const now = opacities(last)[0];
        const patternInput_1 = opacities(before);
        const holding = length_1(filter_1((tupledArg) => (tupledArg[1] >= 0.9), now.entries())) | 0;
        const nowGet = (k_1) => {
            if (now.has(k_1)) {
                return now.get(k_1);
            }
            else {
                return 0;
            }
        };
        const enumerator_1 = getEnumerator(patternInput_1[0].entries());
        try {
            while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                const forLoopVar = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                const k_2 = forLoopVar[0];
                if (((forLoopVar[1] >= 0.95) && (nowGet(k_2) < 0.6)) && (holding > 0)) {
                    Report__line_Z721C83C5(_, `  ${Py_reprStr(patternInput_1[1].get(k_2))} fades to ${Py_fmtF(2, nowGet(k_2))} by ${Py_fmtF(2, t(last))} while ${holding} other item(s) hold`);
                }
            }
        }
        finally {
            disposeSafe(enumerator_1);
        }
    }
}

function Report__timeline(r) {
    const enumerator = getEnumerator(sortBy((tupledArg) => item(0, item(0, tupledArg[1])), ofSeq(r.intervals.entries()), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    }));
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            const it = r.info.get(forLoopVar[0]);
            let enumerator_1 = getEnumerator(forLoopVar[1]);
            try {
                while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                    const ab = enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                    const matchValue = item(0, ab);
                    const b = item(1, ab);
                    const a = matchValue;
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
    const f_1 = fold((best, f) => {
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

