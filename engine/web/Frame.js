
import { Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { record_type, float64_type, int32_type, array_type, class_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { fold, tryFind as tryFind_1, map, item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { concat, split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { clamp01, progIO, lerp, show, within, play, query, timing } from "./Stage.js";
import { tryFind, iterateIndexed } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { max } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { frameBreaks, frameToasts } from "./Kit.js";
import { value } from "./fable_modules/fable-library-js.5.19.0/Option.js";

export class Chapter extends Record {
    constructor(title, scenes, n, start, end, talk) {
        super();
        this.title = title;
        this.scenes = scenes;
        this.n = (n | 0);
        this.start = start;
        this.end = end;
        this.talk = talk;
    }
}

export function Chapter_$reflection() {
    return record_type("Frame.Chapter", [], Chapter, () => [["title", string_type], ["scenes", array_type(class_type("Stage.Scene"))], ["n", int32_type], ["start", float64_type], ["end", float64_type], ["talk", float64_type]]);
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
            void (CHAPTERS.push(new Chapter((s.chapter || s.id), [s], 0, 0, 0, 0)));
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
    for (let idx_2 = 0; idx_2 <= (modules.length - 1); idx_2++) {
        const m_1 = item(idx_2, modules);
        const d = document.createElement("div");
        d.className = "layer";
        d.id = ("mod-" + m_1.key);
        query("#modules").append(d);
        m_1.root = d;
    }
    const bar = query("#bar");
    const SEG = map((_arg) => {
        const s_3 = document.createElement("div");
        s_3.className = "seg";
        s_3.append(document.createElement("i"));
        bar.append(s_3);
        return s_3.firstChild;
    }, CHAPTERS.slice());
    const OUTRO = tryFind_1((s_4) => (prefix(s_4.id) === "outro"), timing.scenes);
    const TITLE = tryFind_1((s_5) => (s_5.id === "title"), timing.scenes);
    if (!!(timing.card)) {
        query("#tcCourse").textContent = ((timing.card.course || ""));
        query("#tcLesson").textContent = ((timing.card.lesson || ""));
        query("#tcSub").textContent = ((timing.card.sub || ""));
    }
    let TOASTS;
    try {
        TOASTS = frameToasts(query("#toasts"));
    }
    catch (e) {
        console.log(concat("toasts: ", message(e)));
        TOASTS = undefined;
    }
    let BREAKS;
    try {
        BREAKS = frameBreaks(query("#toasts"));
    }
    catch (e_1) {
        console.log(concat("breaks: ", message(e_1)));
        BREAKS = undefined;
    }
    let loaded;
    const pr_4 = fold((p, m_4) => (p.then(() => {
        const m_2 = m_4;
        const failed = (e_2) => {
            console.log(concat("module file ", m_2.key, ".js failed to load: ", message(e_2)));
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
        catch (e_3) {
            failed(e_3);
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
                catch (e_4) {
                    console.log(concat("module ", m_3.key, " build failed: ", message(e_4)));
                    ch()[m_3.key] = defaultOf();
                }
            }
        }
    }));
    window["ready"] = (loaded.then(() => {
        play((t) => {
            let c_4, o;
            const withTitle = (TITLE != null) && (!!(timing.card));
            const tc = withTitle ? within(t, 0, value(TITLE).end - 0.1, 0.4) : 0;
            show(query("#titleCard"), tc, 0, `scale(${lerp(0.97, 1, progIO(t, 0, 0.8))})`);
            const lastSentence = withTitle ? (value(TITLE).sentences.at(-1)) : defaultOf();
            show(query("#tcSub"), withTitle ? (progIO(t, lastSentence.start - 0.2, 0.5) * tc) : 0, 10, "");
            let current = undefined;
            for (let i_1 = 0; i_1 <= (CHAPTERS.length - 1); i_1++) {
                const c_1 = item(i_1, CHAPTERS);
                if ((t >= (c_1.start - 0.001)) && (t < (c_1.end + 0.001))) {
                    current = c_1;
                }
            }
            let card;
            if (current == null) {
                card = 0;
            }
            else {
                const c_2 = current;
                card = within(t, c_2.start, c_2.talk - 0.25, 0.35);
            }
            show(query("#card"), card, 0, `scale(${lerp(0.96, 1, card)})`);
            const option_1 = current;
            if (option_1 != null) {
                const c_3 = option_1;
                query("#cardNum").textContent = (`${c_3.n} / ${CHAPTERS.length}`);
                query("#cardTitle").textContent = c_3.title;
            }
            for (let idx_4 = 0; idx_4 <= (modules.length - 1); idx_4++) {
                let el, el_1;
                const m_5 = item(idx_4, modules);
                let p_1 = 0;
                for (let i_2 = 0; i_2 <= (m_5.runs.length - 1); i_2++) {
                    const r = item(i_2, m_5.runs);
                    p_1 = max(p_1, within(t, r.start, (r.end >= (timing.duration - 0.05)) ? (Infinity) : (r.end - 0.05), 0.4));
                }
                ((el = m_5.root, el.style)).opacity = p_1;
                ((el_1 = m_5.root, el_1.style)).visibility = ((p_1 <= 0.001) ? "hidden" : "visible");
                if ((p_1 > 0.001) && (!!(hooks(m_5.key)))) {
                    try {
                        hooks(m_5.key).render(t);
                    }
                    catch (e_5) {
                        console.log(`module ${m_5.key} render(${t.toFixed(2)}) failed: ${message(e_5)}`);
                    }
                }
            }
            const lab = query("#label");
            show(lab, (current == null) ? 0 : ((c_4 = current, within(t, c_4.talk - 0.3, c_4.end - 0.1, 0.35))), 0, "");
            let html;
            if (current == null) {
                html = "";
            }
            else {
                const c_5 = current;
                html = (`<b>${c_5.n} / ${CHAPTERS.length}</b>${c_5.title}`);
            }
            if (lab.dataset.html !== html) {
                lab.dataset.html = html;
                lab.innerHTML = html;
            }
            iterateIndexed((i_3, c_6) => {
                let el_2;
                ((el_2 = item(i_3, SEG), el_2.style)).transform = (`scaleX(${clamp01((t - c_6.start) / (c_6.end - c_6.start))})`);
            }, CHAPTERS);
            bar.style.opacity = ((CHAPTERS.length > 0) ? within(t, item(0, CHAPTERS).start - 0.3, (OUTRO == null) ? (Infinity) : ((o = OUTRO, o.start + 0.2)), 0.4) : 0);
            const option_3 = TOASTS;
            if (option_3 != null) {
                option_3.render(t);
            }
            const option_5 = BREAKS;
            if (option_5 != null) {
                option_5.render(t);
            }
        });
        return window["ready"];
    }));
}

