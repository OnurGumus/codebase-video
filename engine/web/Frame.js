
import { toString, Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { bool_type, record_type, float64_type, int32_type, class_type, array_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { pairwise, tryFindIndex, fold, tryFind as tryFind_1, map, item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { concat, split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { ease, clamp01, progIO, show, within, play, lerp, query, timing } from "./Stage.js";
import { tryFind, iterateIndexed } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { uncurry2, defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { min, max } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { ZOOM_OUT, ZOOM_IN, State, build as build_1, definition } from "./Map.js";
import { value as value_1, ofNullable } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { frameBreaks, frameToasts } from "./Kit.js";
import { esc } from "./Draw.js";

export class Chapter extends Record {
    constructor(title, path, scenes, n, start, end, talk) {
        super();
        this.title = title;
        this.path = path;
        this.scenes = scenes;
        this.n = (n | 0);
        this.start = start;
        this.end = end;
        this.talk = talk;
    }
}

export function Chapter_$reflection() {
    return record_type("Frame.Chapter", [], Chapter, () => [["title", string_type], ["path", array_type(string_type)], ["scenes", array_type(class_type("Stage.Scene"))], ["n", int32_type], ["start", float64_type], ["end", float64_type], ["talk", float64_type]]);
}

export class Run extends Record {
    constructor(start, end) {
        super();
        this.start = start;
        this.end = end;
    }
}

export function Run_$reflection() {
    return record_type("Frame.Run", [], Run, () => [["start", float64_type], ["end", float64_type]]);
}

/**
 * Consecutive scenes inside the same part of the shared map.
 */
export class Visit extends Record {
    constructor(part, start, end, fromMap, toMap, last) {
        super();
        this.part = part;
        this.start = start;
        this.end = end;
        this.fromMap = fromMap;
        this.toMap = toMap;
        this.last = last;
    }
}

export function Visit_$reflection() {
    return record_type("Frame.Visit", [], Visit, () => [["part", string_type], ["start", float64_type], ["end", float64_type], ["fromMap", bool_type], ["toMap", bool_type], ["last", bool_type]]);
}

export class Module extends Record {
    constructor(key, runs, root) {
        super();
        this.key = key;
        this.runs = runs;
        this.root = root;
    }
}

export function Module_$reflection() {
    return record_type("Frame.Module", [], Module, () => [["key", string_type], ["runs", array_type(Run_$reflection())], ["root", class_type("Browser.Types.HTMLElement", undefined)]]);
}

function prefix(id) {
    return item(0, split(id, ["-"], undefined, 0));
}

function message(e) {
    return e.message;
}

function ch() {
    return window["CH"];
}

function hooks(key) {
    return ch()[key];
}

export function run() {
    if (!(!!(ch()))) {
        window["CH"] = {};
    }
    const CHAPTERS = [];
    const arr = timing.scenes;
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        const s = item(idx, arr);
        if (s.id.endsWith("-why")) {
            void (CHAPTERS.push(new Chapter((s.chapter || s.id), (Array.isArray(s.path)) ? s.path : [], [s], 0, 0, 0, 0)));
        }
        else if (((CHAPTERS.length > 0) && (s.id !== "outro")) && (prefix(s.id) !== "outro")) {
            void (item(CHAPTERS.length - 1, CHAPTERS).scenes.push(s));
        }
    }
    iterateIndexed((i, c) => {
        let matchValue, firstContent;
        c.n = ((i + 1) | 0);
        c.start = item(0, c.scenes).start;
        c.end = item(c.scenes.length - 1, c.scenes).end;
        c.talk = ((matchValue = tryFind((s_1) => !s_1.id.endsWith("-why"), c.scenes), (matchValue == null) ? c.end : ((firstContent = matchValue, (firstContent.sentences[0]).start))));
    }, CHAPTERS);
    const MODULES = {};
    let prev = defaultOf();
    const arr_1 = timing.scenes;
    for (let idx_1 = 0; idx_1 <= (arr_1.length - 1); idx_1++) {
        const s_2 = item(idx_1, arr_1);
        if ((s_2.id.endsWith("-why") ? true : (s_2.id === "title")) ? true : (!!(s_2.recap))) {
            prev = defaultOf();
        }
        else {
            const k = prefix(s_2.id);
            if (((MODULES[k]) == null)) {
                MODULES[k] = (new Module(k, [], defaultOf()));
            }
            const m = MODULES[k];
            const first = (!!(s_2.sentences.at(0))) ? item(0, s_2.sentences).start : s_2.start;
            if (prev === k) {
                item(m.runs.length - 1, m.runs).end = s_2.end;
            }
            else {
                void (m.runs.push(new Run(max(s_2.start, first - 0.45), s_2.end)));
            }
            prev = k;
        }
    }
    const modules = Object.values(MODULES);
    let MAP;
    const matchValue_1 = definition();
    if (matchValue_1 != null) {
        const def = matchValue_1;
        try {
            const layer = document.createElement("div");
            layer.className = "layer";
            layer.id = "map";
            query("#modules").append(layer);
            const title = document.createElement("div");
            title.className = "k-heading k-abs";
            title.style.cssText = "left:60px;top:130px";
            layer.append(title);
            MAP = {
                layer: layer,
                title: title,
                view: build_1(layer, def),
            };
        }
        catch (e) {
            const msg = message(e);
            console.log(msg.startsWith("map:") ? msg : concat("map: ", msg));
            const option_1 = ofNullable(document.getElementById("map"));
            if (option_1 != null) {
                const el = option_1;
                el.remove();
            }
            MAP = undefined;
        }
    }
    else {
        MAP = undefined;
    }
    const litAt = (c_3, step) => {
        let patternInput;
        const c_2 = c_3;
        const sentences = item(0, c_2.scenes).sentences;
        const t0 = (sentences.length > 0) ? item(0, sentences).start : c_2.start;
        patternInput = [t0, max(t0, min(max(((sentences.length > 0) ? item(sentences.length - 1, sentences).end : c_2.talk) - 0.3, t0 + 0.8), c_2.talk - 1))];
        return lerp(patternInput[0], patternInput[1], step / ((c_3.path.length * 2) - 2));
    };
    const insideOf = (s_3) => {
        if (!!(s_3.inside)) {
            return s_3.inside;
        }
        else {
            return "";
        }
    };
    let VISITS;
    if (MAP == null) {
        VISITS = [];
    }
    else {
        const found = [];
        const n = timing.scenes.length | 0;
        let k_1 = 0;
        while (k_1 < n) {
            const part = insideOf(item(k_1, timing.scenes));
            if (part === "") {
                k_1 = ((k_1 + 1) | 0);
            }
            else {
                let j = k_1;
                while (((j + 1) < n) && (insideOf(item(j + 1, timing.scenes)) === part)) {
                    j = ((j + 1) | 0);
                }
                const before = (k_1 > 0) ? item(k_1 - 1, timing.scenes) : undefined;
                let opened;
                if (before == null) {
                    opened = false;
                }
                else {
                    const b_1 = before;
                    opened = ((insideOf(b_1) !== "") ? true : (b_1.id.endsWith("-why") && (Array.isArray(b_1.path))));
                }
                void (found.push(new Visit(part, item(k_1, timing.scenes).start, item(j, timing.scenes).end, opened, ((j + 1) < n) && (insideOf(item(j + 1, timing.scenes)) !== ""), item(j, timing.scenes).end >= (timing.duration - 0.05))));
                k_1 = ((j + 1) | 0);
            }
        }
        VISITS = found.slice();
    }
    for (let idx_2 = 0; idx_2 <= (modules.length - 1); idx_2++) {
        const m_1 = item(idx_2, modules);
        const d = document.createElement("div");
        d.className = "layer";
        d.id = ("mod-" + m_1.key);
        query("#modules").append(d);
        m_1.root = d;
    }
    if (!!(timing.captions)) {
        const modules_1 = query("#modules");
        modules_1.style.transformOrigin = "60px 120px";
        modules_1.style.transform = "scale(0.86)";
    }
    const bar = query("#bar");
    const SEG = map((_arg) => {
        const s_4 = document.createElement("div");
        s_4.className = "seg";
        s_4.append(document.createElement("i"));
        bar.append(s_4);
        return s_4.firstChild;
    }, CHAPTERS.slice());
    const OUTRO = tryFind_1((s_5) => (prefix(s_5.id) === "outro"), timing.scenes);
    const TITLE = tryFind_1((s_6) => (s_6.id === "title"), timing.scenes);
    if (!!(timing.card)) {
        query("#tcCourse").textContent = ((timing.card.course || ""));
        query("#tcLesson").textContent = ((timing.card.lesson || ""));
        query("#tcSub").textContent = ((timing.card.sub || ""));
    }
    const thumbLabel = ((!!(timing.card)) && (!!(timing.card.thumbnail))) ? toString(timing.card.thumbnail) : "";
    let THUMB;
    if (thumbLabel === "") {
        THUMB = undefined;
    }
    else {
        const el_1 = document.createElement("div");
        el_1.id = "thumb";
        el_1.style.cssText = "position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:50;display:none;pointer-events:none";
        el_1.innerHTML = "<div style=\"position:absolute;left:0;top:0;right:0;bottom:0;border:18px solid #e5383b;box-sizing:border-box\"></div><div style=\"position:absolute;left:855px;top:560px;width:210px;height:210px;border-radius:50%;background:#e5383b;box-shadow:0 18px 60px #000a\"><div style=\"position:absolute;left:78px;top:55px;border-style:solid;border-width:50px 0 50px 82px;border-color:transparent transparent transparent #fff\"></div></div><div id=\"thumbLen\" style=\"position:absolute;right:70px;bottom:60px;font-size:40px;font-weight:650;color:#fff;background:#000a;padding:8px 20px;border-radius:10px\"></div>";
        query("#titleCard").parentElement.append(el_1);
        el_1.querySelector("#thumbLen").textContent = thumbLabel;
        THUMB = el_1;
    }
    let TOASTS;
    try {
        TOASTS = frameToasts(query("#toasts"));
    }
    catch (e_1) {
        console.log(concat("toasts: ", message(e_1)));
        TOASTS = undefined;
    }
    let BREAKS;
    try {
        BREAKS = frameBreaks(query("#toasts"));
    }
    catch (e_2) {
        console.log(concat("breaks: ", message(e_2)));
        BREAKS = undefined;
    }
    let loaded;
    const pr_4 = fold((p, m_4) => (p.then(() => {
        const m_2 = m_4;
        const failed = (e_3) => {
            console.log(concat("module file ", m_2.key, ".js failed to load: ", message(e_3)));
        };
        try {
            let pr_2;
            const pr_1 = fetch(concat(m_2.key, ".js"), { cache: "no-store" });
            pr_2 = (pr_1.then((res) => {
                if (!res.ok) {
                    console.log(`module file ${m_2.key}.js: not written yet (${res.status})`);
                    return Promise.resolve(undefined);
                }
                else {
                    const pr = res.text();
                    return pr.then((code) => {
                        new Function(code + concat("\n//# sourceURL=", m_2.key, ".js"))();
                    });
                }
            }));
            return pr_2.catch(failed);
        }
        catch (e_4) {
            failed(e_4);
            return Promise.resolve(undefined);
        }
    })), Promise.resolve(undefined), modules);
    loaded = (pr_4.then(() => {
        for (let idx_3 = 0; idx_3 <= (modules.length - 1); idx_3++) {
            const m_3 = item(idx_3, modules);
            if (!!(hooks(m_3.key))) {
                try {
                    const h = hooks(m_3.key);
                    if (!((h.build == null))) {
                        h.build(m_3.root);
                    }
                }
                catch (e_5) {
                    console.log(concat("module ", m_3.key, " build failed: ", message(e_5)));
                    ch()[m_3.key] = defaultOf();
                }
            }
        }
    }));
    window["ready"] = (loaded.then(() => {
        play((t_5) => {
            let v_1, t_3, c_4, c_5, v, t_2, c_13, o;
            const withTitle = (TITLE != null) && (!!(timing.card));
            const tc = withTitle ? within(t_5, -1, value_1(TITLE).end - 0.1, 0.4) : 0;
            const thumbOn = (THUMB != null) && (t_5 < 0.02);
            const option_3 = THUMB;
            if (option_3 != null) {
                const el_2 = option_3;
                el_2.style.display = (thumbOn ? "block" : "none");
            }
            const titleCard = query("#titleCard");
            titleCard.style.justifyContent = (thumbOn ? "flex-start" : "");
            titleCard.style.paddingTop = (thumbOn ? "110px" : "");
            titleCard.style.boxSizing = (thumbOn ? "border-box" : "");
            show(titleCard, tc, 0, thumbOn ? "" : (`scale(${lerp(0.97, 1, progIO(t_5, 0, 0.8))})`));
            const lastSentence = withTitle ? (value_1(TITLE).sentences.at(-1)) : defaultOf();
            show(query("#tcSub"), withTitle ? (progIO(t_5, lastSentence.start - 0.2, 0.5) * tc) : 0, 10, "");
            let current = undefined;
            for (let i_3 = 0; i_3 <= (CHAPTERS.length - 1); i_3++) {
                const c_6 = item(i_3, CHAPTERS);
                if ((t_5 >= (c_6.start - 0.001)) && (t_5 < (c_6.end + 0.001))) {
                    current = c_6;
                }
            }
            let opening;
            if (current == null) {
                opening = 0;
            }
            else {
                const c_7 = current;
                opening = within(t_5, c_7.start, c_7.talk - 0.25, 0.35);
            }
            let onMap;
            if (current == null) {
                onMap = false;
            }
            else {
                const c_1 = current;
                onMap = ((MAP != null) && (c_1.path.length >= 2));
            }
            const card = onMap ? 0 : opening;
            const visit = tryFind_1((v_3) => {
                if (t_5 >= (v_3.start - 0.001)) {
                    if (t_5 < (v_3.end - 0.001)) {
                        return true;
                    }
                    else {
                        return v_3.last;
                    }
                }
                else {
                    return false;
                }
            }, VISITS);
            const option_5 = MAP;
            if (option_5 != null) {
                const m_5 = option_5;
                const opener = onMap ? opening : 0;
                show(m_5.layer, max(opener, (visit == null) ? 0 : ((v_1 = visit, (t_3 = t_5, min(v_1.fromMap ? 1 : clamp01((t_3 - v_1.start) / 0.3), (v_1.last ? true : v_1.toMap) ? 1 : (1 - clamp01((t_3 - (v_1.end - 0.3)) / 0.3))))))), 0, "");
                const titled = (visit == null) ? opener : (opener * (1 - clamp01((t_5 - visit.start) / 0.3)));
                show(m_5.title, titled, 0, "");
                let matchResult, c_10;
                if (current != null) {
                    if (titled > 0.001) {
                        matchResult = 0;
                        c_10 = current;
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
                        const html = `<b style="color:var(--accent);margin-right:22px">${c_10.n} / ${CHAPTERS.length}</b>${esc(c_10.title)}`;
                        if (m_5.title.dataset.html !== html) {
                            m_5.title.dataset.html = html;
                            m_5.title.innerHTML = html;
                        }
                        break;
                    }
                }
                let patternInput_1;
                if (current == null) {
                    patternInput_1 = [(_arg_1) => 0, (_arg_2) => ((_arg_3) => 0)];
                }
                else {
                    const c_11 = current;
                    patternInput_1 = [(c_4 = c_11, (id) => {
                        const matchValue_2 = tryFindIndex((y) => (id === y), c_4.path);
                        return (matchValue_2 == null) ? 0 : clamp01((t_5 - litAt(c_4, matchValue_2 * 2)) / 0.4);
                    }), (c_5 = c_11, (a) => ((b) => {
                        const hop = tryFindIndex((tupledArg) => {
                            const x = tupledArg[0];
                            const y_1 = tupledArg[1];
                            if ((x === a) && (y_1 === b)) {
                                return true;
                            }
                            else if (x === b) {
                                return y_1 === a;
                            }
                            else {
                                return false;
                            }
                        }, pairwise(c_5.path));
                        return (hop == null) ? 0 : clamp01((t_5 - litAt(c_5, (hop * 2) + 1)) / 0.4);
                    }))];
                }
                const lit = patternInput_1[0];
                const edge = patternInput_1[1];
                if (visit == null) {
                    if (opener > 0.001) {
                        m_5.view.draw(new State((_arg_5) => 1, lit, uncurry2(edge), undefined));
                    }
                }
                else {
                    const v_6 = visit;
                    m_5.view.draw(new State((_arg_4) => 1, lit, uncurry2(edge), [v_6.part, (v = v_6, (t_2 = t_5, ease.inOut(clamp01((t_2 - v.start) / ZOOM_IN)) * (1 - (v.last ? 0 : ease.inOut(clamp01((t_2 - (v.end - 0.7)) / 0.7))))))]));
                }
            }
            let content;
            if (visit == null) {
                content = 1;
            }
            else {
                const v_2 = visit;
                const t_4 = t_5;
                content = min(clamp01((t_4 - ((v_2.start + ZOOM_IN) - 0.2)) / 0.4), v_2.last ? 1 : (1 - clamp01((t_4 - (v_2.end - ZOOM_OUT)) / 0.3)));
            }
            show(query("#card"), card, 0, `scale(${lerp(0.96, 1, card)})`);
            const option_7 = current;
            if (option_7 != null) {
                const c_12 = option_7;
                query("#cardNum").textContent = (`${c_12.n} / ${CHAPTERS.length}`);
                query("#cardTitle").textContent = c_12.title;
            }
            for (let idx_4 = 0; idx_4 <= (modules.length - 1); idx_4++) {
                let el_3, el_4;
                const m_6 = item(idx_4, modules);
                let p_1 = 0;
                for (let i_4 = 0; i_4 <= (m_6.runs.length - 1); i_4++) {
                    const r = item(i_4, m_6.runs);
                    p_1 = max(p_1, within(t_5, r.start, (r.end >= (timing.duration - 0.05)) ? (Infinity) : (r.end - 0.05), 0.4));
                }
                const p_2 = p_1 * content;
                ((el_3 = m_6.root, el_3.style)).opacity = p_2;
                ((el_4 = m_6.root, el_4.style)).visibility = ((p_2 <= 0.001) ? "hidden" : "visible");
                if ((p_2 > 0.001) && (!!(hooks(m_6.key)))) {
                    try {
                        hooks(m_6.key).render(t_5);
                    }
                    catch (e_6) {
                        console.log(`module ${m_6.key} render(${t_5.toFixed(2)}) failed: ${message(e_6)}`);
                    }
                }
            }
            const lab = query("#label");
            show(lab, (current == null) ? 0 : ((c_13 = current, within(t_5, c_13.talk - 0.3, c_13.end - 0.1, 0.35))), 0, "");
            let html_1;
            if (current == null) {
                html_1 = "";
            }
            else {
                const c_14 = current;
                html_1 = (`<b>${c_14.n} / ${CHAPTERS.length}</b>${c_14.title}`);
            }
            if (lab.dataset.html !== html_1) {
                lab.dataset.html = html_1;
                lab.innerHTML = html_1;
            }
            iterateIndexed((i_5, c_15) => {
                let el_5;
                ((el_5 = item(i_5, SEG), el_5.style)).transform = (`scaleX(${clamp01((t_5 - c_15.start) / (c_15.end - c_15.start))})`);
            }, CHAPTERS);
            bar.style.opacity = ((CHAPTERS.length > 0) ? within(t_5, item(0, CHAPTERS).start - 0.3, (OUTRO == null) ? (Infinity) : ((o = OUTRO, o.start + 0.2)), 0.4) : 0);
            const option_9 = TOASTS;
            if (option_9 != null) {
                option_9.render(t_5);
            }
            const option_11 = BREAKS;
            if (option_11 != null) {
                option_11.render(t_5);
            }
        });
        return window["ready"];
    }));
}

