
import { Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { record_type, lambda_type, float64_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { max, min } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { join, concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { equals, defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { collect, indexed, tryFind, tryPick, unfold, map } from "./fable_modules/fable-library-js.5.19.0/Seq.js";

export class Ease extends Record {
    constructor(linear, out, in$, inOut, back) {
        super();
        this.linear = linear;
        this.out = out;
        this.in = in$;
        this.inOut = inOut;
        this.back = back;
    }
}

export function Ease_$reflection() {
    return record_type("Stage.Ease", [], Ease, () => [["linear", lambda_type(float64_type, float64_type)], ["out", lambda_type(float64_type, float64_type)], ["in", lambda_type(float64_type, float64_type)], ["inOut", lambda_type(float64_type, float64_type)], ["back", lambda_type(float64_type, float64_type)]]);
}

export function clamp(v, a, b) {
    return min(b, max(a, v));
}

export function clamp01(v) {
    return clamp(v, 0, 1);
}

export function lerp(a, b, p) {
    return a + ((b - a) * p);
}

export const ease = new Ease((p) => p, (p_1) => {
    let arg0__1;
    return 1 - ((arg0__1 = (1 - p_1), Math.pow(arg0__1, 3)));
}, (p_2) => ((p_2 * p_2) * p_2), (p_3) => {
    let arg0__10;
    return (p_3 < 0.5) ? (((4 * p_3) * p_3) * p_3) : (1 - (((arg0__10 = ((-2 * p_3) + 2), Math.pow(arg0__10, 3))) / 2));
}, (p_4) => {
    let arg0__15, arg0__19;
    return (1 + ((1.70158 + 1) * ((arg0__15 = (p_4 - 1), Math.pow(arg0__15, 3))))) + (1.70158 * ((arg0__19 = (p_4 - 1), Math.pow(arg0__19, 2))));
});

/**
 * Eased 0..1 progress of a move that starts at t0 and lasts dur seconds.
 */
export function prog(t, t0, dur, e) {
    return e(clamp01((t - t0) / dur));
}

/**
 * prog with the default curve, ease.inOut.
 */
export function progIO(t, t0, dur) {
    return prog(t, t0, dur, ease.inOut);
}

/**
 * 0..1 visibility: fades in at t0, out at t1 (t1 = Infinity: stays).
 */
export function within(t, t0, t1, fade) {
    return min(clamp01((t - t0) / fade), (t1 === (Infinity)) ? 1 : clamp01((t1 - t) / fade));
}

/**
 * Set opacity plus an optional rise: show el p 0 "" fades in; show el p 24 "" also slides up 24px.
 */
export function show(el, p, rise, extra) {
    el.style.opacity = p;
    el.style.visibility = ((p <= 0.001) ? "hidden" : "visible");
    el.style.transform = (`translateY(${(1 - p) * rise}px) ${extra}`).trim();
}

/**
 * Reveal an SVG path by length: draw(path, p).
 */
export function draw(path, p) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = (`${len}`);
    path.style.strokeDashoffset = (`${len * (1 - clamp01(p))}`);
}

/**
 * Characters of text typed out by p.
 */
export function typed(text, p) {
    return text.slice(0, (Math.round(text.length * clamp01(p))));
}

export function query(sel) {
    const el = document.querySelector(sel);
    if (Operators_IsNull(el)) {
        (() => { throw new Error(concat("no element ", sel)); })();
    }
    return el;
}

export const timing = (() => {
    const t = window["TIMING"];
    if (!(!!(t))) {
        (() => { throw new Error("build/timing.js is missing - run: node engine/cli/Cv.js <clip> narrate"); })();
    }
    return t;
})();

const byId = (() => {
    const o = {};
    const arr = timing.scenes;
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        const s = item(idx, arr);
        o[s.id] = s;
    }
    return o;
})();

export function scene(id) {
    const s = byId[id];
    if (!(!!(s))) {
        const have = join(", ", Object.keys(byId));
        (() => { throw new Error(`no scene "${id}" in script.json (have: ${have})`); })();
    }
    return s;
}

/**
 * Start of sentence i in scene id; i may be negative to count from the end.
 */
export function cue(id, i) {
    const s = scene(id).sentences;
    const k = (i < 0) ? (s.length + i) : i;
    const sentence = s[k];
    if (!(!!(sentence))) {
        (() => { throw new Error(`scene "${id}" has ${s.length} sentence(s), asked for ${String(i)}`); })();
    }
    return sentence.start;
}

/**
 * Start of part k of sentence i: a {fr:...} phrase or the narration around it.
 */
export function part(id, i, k) {
    const s = scene(id).sentences.at(i);
    const p = ((!!(s)) && (!!(s.parts))) ? (s.parts.at(k)) : defaultOf();
    if (!(!!(p))) {
        (() => { throw new Error(`scene "${id}" sentence ${String(i)} has no part ${String(k)}`); })();
    }
    return p.start;
}

function pause(c) {
    switch (c) {
        case "!":
        case ".":
        case "?":
            return 8;
        case ",":
            return 4;
        case ":":
        case ";":
        case "–":
        case "—":
            return 6;
        default:
            return 0;
    }
}

function weight(text, upto) {
    let w = 0;
    for (let k = 0; k <= (upto - 1); k++) {
        w = ((w + 1) + pause(text[k]));
    }
    return w;
}

function heardOf(u) {
    return (((u.spoken ?? u.text)) ?? "");
}

function occurrences(field, want, atEnd, u) {
    const text = (field === "spoken") ? heardOf(u) : ((u.text || ""));
    const low = text.toLowerCase();
    const total = (weight(text, text.length) || 1);
    return map((pos) => {
        const idx = (atEnd ? (pos + want.length) : pos) | 0;
        return lerp(u.start, u.end, weight(text, idx) / total);
    }, unfold((from) => {
        const pos_1 = (low.indexOf(want, from)) | 0;
        return (pos_1 >= 0) ? [pos_1, pos_1 + 1] : undefined;
    }, 0));
}

/**
 * When a phrase is spoken, in seconds.
 * word("g1-signals", "five signals")             first occurrence anywhere in the scene
 * word("g1-signals", "thirty", { sentence: 1 })  only in sentence 1
 * word(id, "the", { nth: 2 })                    the second occurrence
 * word(id, "gigabits", { end: true })            when the phrase finishes
 * Matching is case-insensitive, on the spoken text first and the caption text second. Throws when the
 * phrase is not there, so a re-worded line fails loudly instead of drifting.
 */
export function word(id, needle, sentence, nth, atEnd) {
    const sc = scene(id);
    const want = (String(needle)).toLowerCase();
    let picked;
    if ((sentence == null)) {
        picked = sc.sentences;
    }
    else {
        const array = [sc.sentences.at(sentence)];
        picked = array.filter((_x) => (!!(_x)));
    }
    const found = tryPick((field) => {
        const option_1 = tryFind((tupledArg) => !((tupledArg[0] + 1) < nth), indexed(collect((u) => occurrences(field, want, atEnd, u), collect((s) => {
            if ((!!(s.parts)) && (s.parts.length > 1)) {
                return s.parts;
            }
            else {
                return [s];
            }
        }, picked))));
        if (option_1 != null) {
            return option_1[1];
        }
        else {
            return undefined;
        }
    }, ["spoken", "text"]);
    if (found == null) {
        const where = ((sentence == null)) ? "" : concat(" sentence ", String(sentence));
        return (() => { throw new Error(`"${String(needle)}" is not spoken in scene "${id}"${where}`); })();
    }
    else {
        return found;
    }
}

/**
 * A time from a compact spec, for the kit and for modules:
 * 12.5              seconds
 * "g1-vague"        the scene's first sentence
 * "g1-vague#2"      sentence 2
 * "g1-vague|drive"  the word "drive" (| and nth: "g1-vague|the|2"; end of phrase: "g1-vague|drive$")
 * ["g1-vague|drive", 0.3]   plus an offset in seconds
 */
export function time(spec) {
    if (typeof spec === "number") {
        return spec;
    }
    else if (Array.isArray(spec)) {
        const a = spec;
        return time(a[0]) + (((a[1]) || 0));
    }
    else {
        const s = String(spec);
        if (s.indexOf("|") >= 0) {
            const bits = s.split("|");
            const phrase = item(1, bits);
            const n = bits[2];
            const atEnd = phrase.endsWith("$");
            return word(item(0, bits), atEnd ? (phrase.slice(0, -1)) : phrase, defaultOf(), (!!(n)) ? (Number(n)) : 1, atEnd);
        }
        else {
            const bits_1 = s.split("#");
            const i = bits_1[1];
            return cue(item(0, bits_1), (!!(i)) ? (Number(i)) : 0);
        }
    }
}

let captionsOn = !timing.voiced;

export function setCaptions(on) {
    captionsOn = on;
}

function captions(t) {
    let box;
    const matchValue = document.getElementById("captions");
    if (equals(matchValue, defaultOf())) {
        const b = document.createElement("div");
        b.id = "captions";
        document.getElementById("stage").append(b);
        box = b;
    }
    else {
        box = matchValue;
    }
    let text = "";
    if (captionsOn) {
        const arr = timing.scenes;
        for (let idx = 0; idx <= (arr.length - 1); idx++) {
            const s = item(idx, arr);
            const arr_1 = s.sentences;
            for (let idx_1 = 0; idx_1 <= (arr_1.length - 1); idx_1++) {
                const c = item(idx_1, arr_1);
                if ((t >= c.start) && (t < (c.end + 0.25))) {
                    text = c.text;
                }
            }
        }
    }
    if (box.dataset.text !== text) {
        box.dataset.text = text;
        box.innerHTML = "";
        if (!!(text)) {
            const span = document.createElement("span");
            span.textContent = text;
            box.append(span);
        }
    }
}

/**
 * Installs the frame: window.DURATION, window.render (render plus captions) and window.ready, which the
 * renderer awaits right after load.
 */
export function play(render) {
    const frame = (t) => {
        render(t);
        captions(t);
    };
    window["DURATION"] = timing.duration;
    window["render"] = frame;
    const ready = document.fonts.ready.then(() => {
        frame(0);
        return true;
    });
    window["ready"] = ready;
    const q = new URLSearchParams(location.search);
    if (q.has("t")) {
        ready.then(() => {
            frame(Number(q.get("t")));
        });
    }
    if (q.has("preview")) {
        ready.then(() => {
            const a = new Audio("build/narration.wav");
            document.body.addEventListener("click", (_arg_1) => {
                (a.play()).catch(() => {
                });
                const t0 = performance.now();
                const tick = (_arg) => {
                    const t_1 = timing.voiced ? a.currentTime : (((performance.now()) - t0) / 1000);
                    frame(min(t_1, timing.duration));
                    if (t_1 < timing.duration) {
                        requestAnimationFrame(tick);
                    }
                };
                tick(0);
            }, {
                once: true,
            });
            document.title = ("click to play - " + document.title);
        });
    }
}

export const api = {
    timing: timing,
    scene(id) {
        return scene(id);
    },
    cue(id_1, i) {
        return cue(id_1, (i === undefined ? 0 : i));
    },
    part(id_2, i_1, k) {
        return part(id_2, i_1, (k === undefined ? 0 : k));
    },
    word(id_3, needle, opts) {
        let o;
        const d_2 = {};
        o = ((opts === undefined ? d_2 : opts));
        return word(id_3, needle, (o.sentence === undefined ? defaultOf() : o.sentence), (o.nth === undefined ? 1 : o.nth), (o.end === undefined ? false : o.end));
    },
    time(spec) {
        return time(spec);
    },
    prog(t, t0, dur, e) {
        return prog(t, t0, (dur === undefined ? 0.6 : dur), (e === undefined ? ease.inOut : e));
    },
    within(t_1, t0_1, t1, fade) {
        let d_5;
        return within(t_1, t0_1, (d_5 = (Infinity), (t1 === undefined ? d_5 : t1)), (fade === undefined ? 0.35 : fade));
    },
    lerp(a, b, p) {
        return lerp(a, b, p);
    },
    clamp(v, a_1, b_1) {
        return clamp(v, (a_1 === undefined ? 0 : a_1), (b_1 === undefined ? 1 : b_1));
    },
    ease: ease,
    $(sel) {
        return query(sel);
    },
    show(el, p_1, rise, extra) {
        show(el, p_1, (rise === undefined ? 0 : rise), (extra === undefined ? "" : extra));
    },
    draw(path, p_2) {
        draw(path, p_2);
    },
    typed(text, p_3) {
        return typed(text, p_3);
    },
    play(render) {
        play(render);
    },
    captions(on) {
        setCaptions(on);
    },
};

