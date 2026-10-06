
import { comparePrimitives, defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { split, concat, join, replace } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { append, mapIndexed, iterateIndexed, map, item as item_1 } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { play, timing, typed, clamp01, clamp, progIO, api, scene, time, show, ease, lerp, prog, within } from "./Stage.js";
import { FSharpRef, Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { array_type, string_type, record_type, lambda_type, unit_type, float64_type, class_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { FSharpSet__Contains, ofList, ofArray } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { FSharpMap__get_Item, tryFind, ofSeq } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { ofArray as ofArray_1 } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { singleton, collect, delay, toArray, iterateIndexed as iterateIndexed_1, filter, length } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { unwrap, defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { min, max } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { createSvg } from "./Interop.js";

const noTime = defaultOf();

const CSS = "\n.k-abs { position: absolute; }\n.k-title { font-size: 84px; font-weight: 700; letter-spacing: -.035em; line-height: 1.08; }\n.k-big { font-size: 64px; font-weight: 650; letter-spacing: -.02em; line-height: 1.15; }\n.k-text { font-size: 48px; line-height: 1.3; }\n.k-small { font-size: 44px; line-height: 1.3; }\n.k-mono { font-family: var(--mono); font-size: 46px; }\n.k-label { font-size: 44px; font-weight: 700; letter-spacing: .04em; }\n.k-muted { color: var(--muted); }\n.k-heading { font-size: 56px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; }\n.k-heading .k-sub { margin-left: 20px; font-size: 44px; font-weight: 500; color: var(--muted); }\n.k-lines { display: flex; flex-direction: column; }\n.k-line { font-size: 48px; line-height: 1.3; }\n.k-line .k-note { display: block; font-size: 44px; color: var(--muted); margin-top: 2px; }\n.k-line.k-mono-line { font-family: var(--mono); font-size: 46px; white-space: pre; }\n.k-bullet { color: var(--accent); margin-right: 18px; font-weight: 700; }\n.k-strike { position: absolute; left: -6px; right: -6px; top: 52%; height: 5px; border-radius: 3px; background: var(--bad); transform-origin: 0 50%; }\n.k-rel { position: relative; display: inline-block; }\n.k-chips { display: flex; flex-wrap: wrap; gap: 18px; }\n.k-table { display: grid; background: var(--card); border: 3px solid var(--border); border-radius: 22px; padding: 10px 26px 14px; }\n.k-table .k-th { font-size: 44px; font-weight: 700; color: var(--accent); letter-spacing: .03em; padding: 12px 14px 12px 0; border-bottom: 3px solid var(--border); }\n.k-table .k-td { font-size: 44px; line-height: 1.25; padding: 14px 14px 14px 0; border-bottom: 2px solid #ffffff10; }\n.k-bars .k-bar-label { font-size: 48px; font-weight: 650; white-space: nowrap; }\n.k-bars .k-bar-sub { font-size: 44px; color: var(--muted); white-space: nowrap; margin-left: 18px; font-weight: 400; }\n.k-bars .k-bar-track { position: absolute; height: 34px; border-radius: 17px; background: var(--border); opacity: .45; }\n.k-bars .k-bar-fill { position: absolute; height: 34px; border-radius: 17px; transform-origin: 0 50%; }\n.k-bars .k-bar-value { position: absolute; font-size: 52px; font-weight: 750; white-space: nowrap; }\n.k-bars .k-bar-line { position: absolute; width: 0; border-left: 4px dashed var(--muted); }\n.k-seg { position: absolute; height: 110px; border: 3px solid var(--border); border-radius: 14px; background: var(--card);\n  display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }\n.k-seg .k-seg-label { font-size: 44px; line-height: 1.1; white-space: nowrap; color: var(--muted); }\n.k-seg .k-seg-value { font-size: 48px; font-weight: 700; line-height: 1.1; }\n.k-node { position: absolute; background: var(--card); border: 3px solid var(--border); border-radius: 18px; padding: 16px 26px;\n  font-size: 46px; font-weight: 650; text-align: center; white-space: nowrap; }\n.k-node .k-node-sub { display: block; font-size: 44px; font-weight: 400; color: var(--muted); }\n.k-packet { position: absolute; left: 0; top: 0; z-index: 5; box-shadow: 0 8px 24px #0008; }\n.k-edge-label { position: absolute; font-size: 44px; color: var(--muted); white-space: nowrap; background: var(--bg); padding: 2px 14px; border-radius: 12px; }\n.k-node .k-node-icon { margin-right: 14px; }\n.k-actor { height: 96px; display: flex; align-items: center; justify-content: center; }\n.k-seq-label { color: var(--ink); }\n.k-seq-label.k-seq-reply { color: var(--muted); }\n.k-code .k-kw { color: var(--code-kw); } .k-code .k-ty { color: var(--code-type); } .k-code .k-fn { color: var(--code-fn); }\n.k-code .k-str { color: var(--code-str); } .k-code .k-case { color: var(--code-case); } .k-code .k-num { color: var(--code-num); } .k-code .k-com { color: var(--code-com); font-style: italic; }\n.k-code { background: var(--card); border: 3px solid var(--border); border-radius: 22px; padding: 22px 30px; }\n.k-code .k-code-title { font-size: 44px; font-weight: 700; color: var(--accent); margin-bottom: 10px; }\n.k-code .k-cl { font-family: var(--mono); font-size: 44px; line-height: 60px; height: 60px; padding: 0 14px; border-radius: 10px; white-space: pre; }\n.k-board { background: var(--card); border: 3px solid var(--border); border-radius: 22px; padding: 22px 30px; }\n.k-board .k-board-title { font-size: 44px; font-weight: 700; color: var(--accent); margin-bottom: 12px; }\n.k-board .k-br { display: grid; grid-template-columns: auto 1fr; column-gap: 34px; align-items: baseline; margin: 8px 0; }\n.k-board .k-br-label { font-size: 44px; font-weight: 650; white-space: nowrap; }\n.k-board .k-br-text { font-family: var(--mono); font-size: 46px; white-space: pre; }\n.k-board .k-br-result { font-family: var(--mono); font-size: 46px; color: var(--accent); white-space: pre; grid-column: 2; }\n.k-steps { display: flex; gap: 22px; }\n.k-step { font-size: 44px; font-weight: 650; padding: 12px 26px; border-radius: 999px; border: 3px solid var(--border); background: var(--bg2); color: var(--muted); white-space: nowrap; }\n.k-step b { color: var(--accent); margin-right: 12px; }\n.k-counter { font-size: 96px; font-weight: 750; letter-spacing: -.02em; white-space: nowrap; }\n.k-toast { display: flex; align-items: center; gap: 18px; padding: 10px 34px 10px 12px; border-radius: 999px;\n  background: var(--bg2); border: 3px solid var(--tc, var(--accent)); box-shadow: 0 12px 36px #0009;\n  white-space: nowrap; transform-origin: 100% 50%; z-index: 20; }\n.k-toast .k-toast-icon { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center;\n  font-size: 48px; line-height: 1; background: color-mix(in srgb, var(--tc, var(--accent)) 22%, transparent); }\n.k-toast .k-toast-text { font-size: 44px; font-weight: 700; color: var(--tc, var(--accent)); }\n.k-toast .k-ring { width: 64px; height: 64px; margin-left: 6px; }\n.k-toast .k-ring circle { fill: none; stroke-width: 7; }\n.k-recap { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; display: flex; align-items: center; justify-content: center; z-index: 15; }\n.k-recap .k-recap-box { min-width: 1100px; max-width: 1600px; background: var(--card); border: 3px solid var(--border); border-radius: 30px; padding: 44px 60px 50px; }\n.k-recap .k-recap-title { font-size: 44px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); margin-bottom: 18px; }\n.k-recap .k-recap-line { font-size: 56px; font-weight: 600; line-height: 1.3; margin-top: 18px; display: flex; }\n.k-recap .k-recap-line b { color: var(--accent); margin-right: 22px; flex: none; }\n";

function injectCss() {
    if (Operators_IsNull(document.getElementById("stage-kit-css"))) {
        const st = document.createElement("style");
        st.id = "stage-kit-css";
        st.textContent = CSS;
        document.head.append(st);
    }
}

const TONE = {
    accent: "var(--accent)",
    good: "var(--good)",
    bad: "var(--bad)",
    warn: "var(--warn)",
    violet: "var(--violet)",
    pink: "var(--pink)",
    cyan: "var(--cyan)",
    muted: "var(--muted)",
    ink: "var(--ink)",
    faint: "var(--faint)",
};

function tone(name) {
    if (!!(name)) {
        return ((TONE[name]) || name);
    }
    else {
        return "";
    }
}

function esc(s) {
    return replace(replace(replace(String(s), "&", "&amp;"), "<", "&lt;"), ">", "&gt;");
}

function mk(parent, tag, cls, html, style) {
    const d = document.createElement((tag || "div"));
    if (!!(cls)) {
        d.className = cls;
    }
    if (!((html == null))) {
        d.innerHTML = html;
    }
    if (!!(style)) {
        d.style.cssText = style;
    }
    parent.append(d);
    return d;
}

function opts(o) {
    return (o === undefined ? {} : o);
}

function item(xs, i) {
    return xs[i];
}

function firstAt(xs, f) {
    if (xs.length > 0) {
        return f(item_1(0, xs));
    }
    else {
        return noTime;
    }
}

const SENTENCE_REF = new RegExp("^#\\d+$", "");

function vis(t, at, until, fade) {
    return within(t, ((at == null)) ? -(Infinity) : (at - 0.05), ((until == null)) ? (Infinity) : until, fade);
}

function vis$0027(t, at, until) {
    return vis(t, at, until, 0.35);
}

export const TOASTS = {
    idea: {
        icon: "💡",
        text: "Key idea",
        tone: "accent",
    },
    tricky: {
        icon: "🤔",
        text: "The tricky part",
        tone: "warn",
    },
    remember: {
        icon: "🧠",
        text: "Remember",
        tone: "violet",
    },
    careful: {
        icon: "⚠️",
        text: "Be careful",
        tone: "warn",
    },
    mistake: {
        icon: "🚫",
        text: "Common mistake",
        tone: "bad",
    },
    surprise: {
        icon: "😮",
        text: "Surprise",
        tone: "violet",
    },
    remark: {
        icon: "💬",
        text: "Note",
        tone: "muted",
    },
    question: {
        icon: "💭",
        text: "Ask yourself",
        tone: "accent",
    },
    tip: {
        icon: "🔧",
        text: "Pro tip",
        tone: "accent",
    },
};

const TOAST_DUR = 3.2;

class ToastEl extends Record {
    constructor(el, draw) {
        super();
        this.el = el;
        this.draw = draw;
    }
}

function ToastEl_$reflection() {
    return record_type("Kit.ToastEl", [], ToastEl, () => [["el", class_type("Browser.Types.HTMLElement", undefined)], ["draw", lambda_type(float64_type, lambda_type(float64_type, lambda_type(float64_type, unit_type)))]]);
}

function toastEl(parent, kind, text) {
    const k = TOASTS[kind];
    if (!(!!(k))) {
        const kinds = join(", ", Object.keys(TOASTS));
        (() => { throw new Error(concat("toast kind ", String(JSON.stringify(kind)), " is not one of ", kinds)); })();
    }
    const el = mk(parent, "div", "k-toast k-abs", `<span class="k-toast-icon">${k.icon}</span><span class="k-toast-text">${esc((text || k.text))}</span>`, defaultOf());
    el.style.setProperty("--tc", tone(k.tone));
    return new ToastEl(el, (t, at, until) => {
        const v = within(t, at - 0.05, until, 0.3);
        const pop = prog(t, at - 0.05, 0.42, (x) => x);
        const s = (pop < 1) ? (lerp(0.6, 1, ease.out(pop)) + (Math.sin(pop * 3.141592653589793) * 0.06)) : 1;
        show(el, v, 0, concat("scale(", s.toFixed(4), ")"));
    });
}

function words(s) {
    return ofArray(split(s, [" "], undefined, 0), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

const KW = ofSeq([["csharp", words("abstract as async await base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in init int interface internal is lock long namespace new null object operator out override params private protected public readonly record ref required return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile when where while with yield get set")], ["python", words("and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield")], ["javascript", words("async await break case catch class const continue default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while yield")], ["nix", words("let in with import inherit rec if then else assert or true false null")], ["fsharp", words("abstract and as assert async base begin class default delegate do done downcast downto elif else end exception extern false finally fixed for fun function global if in inherit inline interface internal lazy let match member module mutable namespace new not null of open or override private public rec return select sig static struct task then to true try type upcast use val void when while with yield")], ["dockerfile", words("FROM RUN COPY ADD CMD ENTRYPOINT ENV ARG WORKDIR EXPOSE USER LABEL VOLUME")], ["sql", words("select from where insert into values update set delete create table alter drop index on conflict do and or not null is as join left right inner outer group by order having limit returning primary key references begin commit rollback excluded case when then else end")]], {
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
});

const TOKEN = new RegExp("(\\/\\/.*$|--.*$|#.*$)|(@?\\$?\"(?:[^\"\\\\]|\\\\.)*\"(?:u8)?|\'(?:[^\'\\\\]|\\\\.)*\')|(\\b\\d[\\d_]*(?:\\.\\d+)?[fFdDmMlLuU]*\\b)|([A-Za-z_][A-Za-z0-9_]*)", "g");

const NEXT = new RegExp("^\\s*(\\(|<)", "");

const UPPER = new RegExp("^[A-Z]", "");

const HASH_COMMENTS = ofList(ofArray_1(["yaml", "bash", "python", "nix", "dockerfile"]), {
    Compare: (x, y) => (comparePrimitives(x, y) | 0),
});

function inGeneric(s) {
    const t = replace(s, "->", "");
    const count = (c) => (length(filter((y) => (c === y), t.split(""))) | 0);
    return count("<") > count(">");
}

function slice(s, a, b) {
    if (b == null) {
        return s.slice(a);
    }
    else {
        const b_1 = b | 0;
        return s.slice(a, b_1);
    }
}

export function highlight(line, lang) {
    if (!(!!(lang)) ? true : (lang === "plain")) {
        return esc(line);
    }
    else {
        const kw = defaultArg(tryFind(lang, KW), FSharpMap__get_Item(KW, "csharp"));
        const cOrJs = (lang === "csharp") ? true : (lang === "javascript");
        let out = "";
        let last = 0;
        let fin = false;
        TOKEN.lastIndex = 0;
        while (!fin) {
            const m = TOKEN.exec(line);
            if ((m == null)) {
                fin = true;
            }
            else {
                const matchValue = m[0];
                const matchValue_1 = m[1];
                const matchValue_2 = m[2];
                const matchValue_3 = m[3];
                const tok = matchValue;
                const str = matchValue_2;
                const id = m[4];
                const com = matchValue_1;
                const startsWith = (s, p) => (s.startsWith(p));
                if ((((!!(str)) && (lang === "fsharp")) && startsWith(str, "\'")) && (str.length > 4)) {
                    TOKEN.lastIndex = ((m.index + 1) | 0);
                }
                else if ((!!(com)) && (((startsWith(com, "//") && (cOrJs ? true : (lang === "fsharp"))) ? true : (startsWith(com, "--") && (lang === "sql"))) ? true : (startsWith(com, "#") && FSharpSet__Contains(HASH_COMMENTS, lang)))) {
                    out = ((out + esc(slice(line, last, m.index))) + concat("<span class=\"k-com\">", esc(com), "</span>"));
                    last = ((m.index + tok.length) | 0);
                    fin = true;
                }
                else if (!!(com)) {
                    TOKEN.lastIndex = ((m.index + 1) | 0);
                }
                else {
                    let cls;
                    if (!!(str)) {
                        cls = "k-str";
                    }
                    else if (!!(matchValue_3)) {
                        cls = "k-num";
                    }
                    else if (!!(id)) {
                        const next = slice(line, m.index + id.length, undefined).match(NEXT);
                        const call = (!!(next)) && ((next[1]) === "(");
                        const upper = UPPER.test(id);
                        if (FSharpSet__Contains(kw, (lang === "sql") ? (id.toLowerCase()) : id)) {
                            cls = "k-kw";
                        }
                        else if ((cOrJs && call) && upper) {
                            cls = "k-fn";
                        }
                        else if ((lang === "python") && call) {
                            cls = "k-fn";
                        }
                        else if ((lang === "fsharp") && upper) {
                            const before = slice(line, 0, m.index).trimEnd();
                            cls = ((before.endsWith(".")) ? defaultOf() : (call ? "k-fn" : (((before.endsWith(":")) ? true : inGeneric(before)) ? "k-ty" : "k-case")));
                        }
                        else {
                            cls = ((cOrJs && upper) ? "k-ty" : defaultOf());
                        }
                    }
                    else {
                        cls = defaultOf();
                    }
                    out = ((out + esc(slice(line, last, m.index))) + ((!!(cls)) ? (`<span class="${cls}">${esc(tok)}</span>`) : esc(tok)));
                    last = ((m.index + tok.length) | 0);
                }
            }
        }
        return out + esc(slice(line, last, undefined));
    }
}

class SceneCtx extends Record {
    constructor(at, until) {
        super();
        this.at = at;
        this.until = until;
    }
}

function SceneCtx_$reflection() {
    return record_type("Kit.SceneCtx", [], SceneCtx, () => [["at", float64_type], ["until", float64_type]]);
}

class Head extends Record {
    constructor(end, el) {
        super();
        this.end = end;
        this.el = el;
    }
}

function Head_$reflection() {
    return record_type("Kit.Head", [], Head, () => [["end", string_type], ["el", class_type("Browser.Types.Element", undefined)]]);
}

class EdgeState extends Record {
    constructor(e, path, label, heads, at, toneAt, until, lane, len) {
        super();
        this.e = e;
        this.path = path;
        this.label = label;
        this.heads = heads;
        this.at = at;
        this.toneAt = toneAt;
        this.until = until;
        this.lane = lane;
        this.len = len;
    }
}

function EdgeState_$reflection() {
    return record_type("Kit.EdgeState", [], EdgeState, () => [["e", class_type("Kit.FlowEdge")], ["path", class_type("Browser.Types.Element", undefined)], ["label", class_type("Browser.Types.HTMLElement", undefined)], ["heads", array_type(Head_$reflection())], ["at", float64_type], ["toneAt", float64_type], ["until", float64_type], ["lane", float64_type], ["len", float64_type]]);
}

class Box extends Record {
    constructor(x, y, w, h) {
        super();
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
}

function Box_$reflection() {
    return record_type("Kit.Box", [], Box, () => [["x", float64_type], ["y", float64_type], ["w", float64_type], ["h", float64_type]]);
}

class Point extends Record {
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
}

function Point_$reflection() {
    return record_type("Kit.Point", [], Point, () => [["x", float64_type], ["y", float64_type]]);
}

export function kitFor(root) {
    const parts = [];
    const add = (c) => {
        void (parts.push(c));
        return c;
    };
    const host = (o) => {
        let copyOfStruct, copyOfStruct_1;
        if ((!!(o)) && (!!((copyOfStruct = o, copyOfStruct.in)))) {
            return ((copyOfStruct_1 = o, copyOfStruct_1.in)).el;
        }
        else {
            return root;
        }
    };
    const place = (el, o_1) => {
        let copyOfStruct_5, copyOfStruct_6;
        el.classList.add("k-abs");
        let option_1;
        let copyOfStruct_2 = o_1;
        option_1 = copyOfStruct_2.x;
        if (option_1 != null) {
            const x = option_1;
            el.style.left = (`${x}px`);
        }
        let option_3;
        let copyOfStruct_3 = o_1;
        option_3 = copyOfStruct_3.y;
        if (option_3 != null) {
            const y = option_3;
            el.style.top = (`${y}px`);
        }
        let option_5;
        let copyOfStruct_4 = o_1;
        option_5 = copyOfStruct_4.w;
        if (option_5 != null) {
            const w = option_5;
            el.style.width = (`${w}px`);
        }
        if (!!((copyOfStruct_5 = o_1, copyOfStruct_5.align))) {
            el.style.textAlign = ((copyOfStruct_6 = o_1, copyOfStruct_6.align));
        }
    };
    const sceneCtx = new FSharpRef(undefined);
    const T0 = (spec) => {
        if ((spec == null)) {
            return noTime;
        }
        else {
            return time(spec);
        }
    };
    const TAt = (spec_1) => {
        if (!((spec_1 == null))) {
            return T0(spec_1);
        }
        else {
            const matchValue = sceneCtx.contents;
            if (matchValue == null) {
                return noTime;
            }
            else {
                return matchValue.at;
            }
        }
    };
    const TUntil = (spec_2) => {
        if (!((spec_2 == null))) {
            return T0(spec_2);
        }
        else {
            const matchValue_1 = sceneCtx.contents;
            if (matchValue_1 == null) {
                return noTime;
            }
            else {
                return matchValue_1.until;
            }
        }
    };
    const isOn = (toneName, toneAt, t) => {
        if (!!(toneName)) {
            if ((toneAt == null)) {
                return true;
            }
            else {
                return t >= toneAt;
            }
        }
        else {
            return false;
        }
    };
    return {
        root: root,
        scene(id, fn) {
            const s = scene(id);
            const prev = sceneCtx.contents;
            const first = item(s.sentences, 0);
            sceneCtx.contents = (new SceneCtx((!!(first)) ? first.start : s.start, s.end));
            try {
                fn();
            }
            finally {
                sceneCtx.contents = prev;
            }
        },
        t(spec_3) {
            return time(spec_3);
        },
        word(id_1, needle, o_2) {
            return api.word(id_1, needle, unwrap(o_2));
        },
        term(w_1) {
            return concat("<span class=\"k-term\">", esc(w_1), "</span>");
        },
        mono(w_2) {
            return concat("<span style=\"font-family:var(--mono)\">", esc(w_2), "</span>");
        },
        group(o_3) {
            const o_4 = opts(o_3);
            const el_5 = mk(root, "div", "k-abs", defaultOf(), "left:0;top:0;width:1920px;height:1080px");
            const matchValue_2 = TAt(o_4.at);
            const matchValue_3 = TUntil(o_4.until);
            return add({
                el: el_5,
                render: (t_1) => {
                    const p = vis(t_1, matchValue_2, matchValue_3, defaultArg(o_4.fade, 0.4));
                    el_5.style.opacity = p;
                    el_5.style.visibility = ((p <= 0.001) ? "hidden" : "visible");
                },
            });
        },
        text(html, o_5) {
            const o_6 = opts(o_5);
            const el_8 = mk(host(o_6), "div", concat("k-", (o_6.size || "text")), html, defaultOf());
            place(el_8, o_6);
            const matchValue_4 = TAt(o_6.at);
            const matchValue_5 = TUntil(o_6.until);
            const matchValue_6 = T0(o_6.toneAt);
            return add({
                el: el_8,
                render: (t_2) => {
                    show(el_8, vis$0027(t_2, matchValue_4, matchValue_5), defaultArg(o_6.rise, 16), "");
                    el_8.style.color = (isOn(o_6.tone, matchValue_6, t_2) ? tone(o_6.tone) : "");
                },
            });
        },
        heading(text, o_7) {
            const o_8 = opts(o_7);
            const sub = (!!(o_8.sub)) ? concat("<span class=\"k-sub\">", o_8.sub, "</span>") : "";
            const el_10 = mk(host(o_8), "div", "k-heading", concat(String(text), sub), defaultOf());
            place(el_10, ({ ...{
                x: 60,
                y: 130,
            }, ...o_8 }));
            const matchValue_7 = TAt(o_8.at);
            const matchValue_8 = TUntil(o_8.until);
            const subAt = T0(o_8.subAt);
            const sub_1 = el_10.querySelector(".k-sub");
            return add({
                el: el_10,
                render: (t_3) => {
                    show(el_10, vis$0027(t_3, matchValue_7, matchValue_8), 16, "");
                    if (!Operators_IsNull(sub_1)) {
                        sub_1.style.opacity = (((subAt == null)) ? 1 : progIO(t_3, subAt - 0.1, 0.4));
                    }
                },
            });
        },
        lines(items, o_9) {
            const o_10 = opts(o_9);
            const box = mk(host(o_10), "div", "k-lines", defaultOf(), defaultOf());
            place(box, o_10);
            box.style.gap = (`${defaultArg(o_10.gap, 18)}px`);
            const rows = map((it) => {
                const d = ((typeof it) === "string") ? {
                    html: it,
                } : it;
                const line = mk(box, "div", (!!(d.mono)) ? "k-line k-mono-line" : "k-line", defaultOf(), defaultOf());
                const body = mk(line, "span", "k-rel", concat((!!(d.bullet)) ? concat("<span class=\"k-bullet\">", d.bullet, "</span>") : "", String(d.html)), defaultOf());
                const strike = !((d.strikeAt == null)) ? mk(body, "span", "k-strike", defaultOf(), defaultOf()) : defaultOf();
                const note = (!!(d.note)) ? mk(line, "span", "k-note", d.note, defaultOf()) : defaultOf();
                if (!!(o_10.size)) {
                    line.style.fontSize = ((({
                        big: "64px",
                        text: "48px",
                        small: "44px",
                    }[o_10.size]) || o_10.size));
                }
                const at_3 = TAt((d.at ?? o_10.at));
                const noteAt = T0(d.noteAt);
                const toneAt_2 = T0(d.toneAt);
                return {
                    at: at_3,
                    body: body,
                    d: d,
                    line: line,
                    note: note,
                    noteAt: noteAt,
                    strike: strike,
                    strikeAt: T0(d.strikeAt),
                    toneAt: toneAt_2,
                    until: TUntil((d.until ?? o_10.until)),
                };
            }, items);
            return add({
                el: box,
                render: (t_4) => {
                    iterateIndexed((i, r) => {
                        show(r.line, vis$0027(t_4, r.at, r.until), 14, "");
                        if (!!(o_10.dim)) {
                            const next = item(rows, i + 1);
                            const dimP = ((!!(next)) && !((next.at == null))) ? progIO(t_4, next.at, 0.4) : 0;
                            r.line.style.opacity = ((Number(r.line.style.opacity)) * lerp(1, 0.55, dimP));
                        }
                        if (!Operators_IsNull(r.note)) {
                            r.note.style.opacity = (((r.noteAt == null)) ? 1 : progIO(t_4, r.noteAt - 0.1, 0.4));
                        }
                        r.body.style.color = (isOn(r.d.tone, r.toneAt, t_4) ? tone(r.d.tone) : "");
                        if (!Operators_IsNull(r.strike)) {
                            r.strike.style.transform = (`scaleX(${progIO(t_4, r.strikeAt, 0.4)})`);
                        }
                    }, rows);
                },
            });
        },
        chips(items_1, o_11) {
            const o_12 = opts(o_11);
            const box_1 = mk(host(o_12), "div", "k-chips", defaultOf(), defaultOf());
            place(box_1, o_12);
            const option_7 = o_12.gap;
            if (option_7 != null) {
                const g = option_7;
                box_1.style.gap = (`${g}px`);
            }
            const cs = map((it_1) => {
                const d_1 = ((typeof it_1) === "string") ? {
                    text: it_1,
                } : it_1;
                const el_20 = mk(box_1, "div", "chip", esc(d_1.text), defaultOf());
                return {
                    at: TAt((d_1.at ?? o_12.at)),
                    d: d_1,
                    el: el_20,
                    toneAt: T0(d_1.toneAt),
                    until: TUntil((d_1.until ?? o_12.until)),
                };
            }, items_1);
            return add({
                el: box_1,
                render: (t_5) => {
                    for (let idx = 0; idx <= (cs.length - 1); idx++) {
                        const c_3 = item_1(idx, cs);
                        show(c_3.el, vis$0027(t_5, c_3.at, c_3.until), 10, "");
                        c_3.el.className = (isOn(c_3.d.tone, c_3.toneAt, t_5) ? ("chip " + c_3.d.tone) : "chip");
                    }
                },
            });
        },
        table(o_13) {
            const o_14 = opts(o_13);
            const box_2 = mk(host(o_14), "div", "k-table", defaultOf(), defaultOf());
            place(box_2, o_14);
            box_2.style.gridTemplateColumns = join(" ", map((f) => (`${f}fr`), (o_14.widths || map((_arg) => 1, o_14.cols, Float64Array))));
            const heads = map((c_4) => mk(box_2, "div", "k-th", c_4, defaultOf()), o_14.cols);
            const rows_1 = map((r_1) => {
                const matchValue_10 = T0(r_1.at);
                const matchValue_11 = T0(r_1.toneAt);
                const matchValue_12 = T0(r_1.until);
                return {
                    at: matchValue_10,
                    cells: map((c_5) => {
                        if (((typeof c_5) === "string") ? true : ((c_5 == null))) {
                            const el_22 = mk(box_2, "div", "k-td", c_5, defaultOf());
                            return {
                                at: noTime,
                                d: defaultOf(),
                                el: el_22,
                                own: false,
                                toneAt: noTime,
                                until: noTime,
                            };
                        }
                        else {
                            const d_3 = c_5;
                            const el_23 = mk(box_2, "div", "k-td", ((d_3.html == null)) ? esc((d_3.text ?? "")) : d_3.html, defaultOf());
                            const at_6 = T0(d_3.at);
                            const until_5 = T0(d_3.until);
                            return {
                                at: at_6,
                                d: d_3,
                                el: el_23,
                                own: true,
                                toneAt: T0(d_3.toneAt),
                                until: until_5,
                            };
                        }
                    }, r_1.cells),
                    r: r_1,
                    toneAt: matchValue_11,
                    until: matchValue_12,
                };
            }, o_14.rows);
            const matchValue_13 = T0(o_14.at);
            const matchValue_14 = TUntil(o_14.until);
            const headerAt = T0((o_14.headerAt ?? o_14.at));
            return add({
                el: box_2,
                render: (t_6) => {
                    show(box_2, vis$0027(t_6, (matchValue_13 ?? ((headerAt ?? firstAt(rows_1, (r_2) => r_2.at)))), matchValue_14), 16, "");
                    for (let idx_1 = 0; idx_1 <= (heads.length - 1); idx_1++) {
                        const h = item_1(idx_1, heads);
                        h.style.opacity = (((headerAt == null)) ? 1 : progIO(t_6, headerAt - 0.1, 0.4));
                    }
                    iterateIndexed((i_1, row) => {
                        const p_1 = vis$0027(t_6, row.at, row.until);
                        const next_1 = item(rows_1, i_1 + 1);
                        const current = (((!!(o_14.focus)) && !((row.at == null))) && (t_6 >= row.at)) && ((!(!!(next_1)) ? true : ((next_1.at == null))) ? true : (t_6 < next_1.at));
                        iterateIndexed((k, cell) => {
                            const c_6 = cell.el;
                            c_6.style.opacity = (cell.own ? (p_1 * vis$0027(t_6, cell.at, cell.until)) : p_1);
                            c_6.style.color = ((cell.own && isOn(cell.d.tone, cell.toneAt, t_6)) ? tone(cell.d.tone) : (isOn(row.r.tone, row.toneAt, t_6) ? tone(row.r.tone) : ""));
                            c_6.style.fontWeight = (((k === 0) && current) ? "650" : "");
                            c_6.style.background = (current ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "");
                        }, row.cells);
                    }, rows_1);
                },
            });
        },
        bars(o_15) {
            const o_16 = opts(o_15);
            const w_3 = defaultArg(o_16.w, 1760);
            const box_3 = mk(host(o_16), "div", "k-bars k-abs", defaultOf(), `left:${defaultArg(o_16.x, 60)}px;top:${defaultArg(o_16.y, 250)}px;width:${w_3}px`);
            const matchValue_17 = defaultArg(o_16.gap, 150);
            const trackW = w_3 - defaultArg(o_16.valueW, 260);
            const scale = (v) => ((v / o_16.max) * trackW);
            const matchValue_19 = T0(o_16.at);
            const matchValue_20 = TUntil(o_16.until);
            const lineLabel = ((!!(o_16.line)) && (!!(o_16.line.label))) ? mk(box_3, "div", "k-bar-sub k-abs", o_16.line.label, defaultOf()) : defaultOf();
            const rows_2 = mapIndexed((i_2, r_3) => {
                let value_1;
                const top = i_2 * matchValue_17;
                const sub_2 = (!!(r_3.sub)) ? concat("<span class=\"k-bar-sub\">", r_3.sub, "</span>") : "";
                const label = mk(box_3, "div", "k-bar-label k-abs", concat(r_3.label, sub_2), `left:0;top:${top}px`);
                const track = mk(box_3, "div", "k-bar-track", defaultOf(), `left:${0}px;top:${(top + 62) + 8}px;width:${trackW}px`);
                const fill = mk(box_3, "div", "k-bar-fill", defaultOf(), `left:${0}px;top:${(top + 62) + 8}px;width:${trackW}px`);
                const value = mk(box_3, "div", "k-bar-value", "", `top:${(top + 62) - 8}px`);
                const tick = (!!(o_16.line)) ? mk(box_3, "div", "k-bar-line", defaultOf(), `left:${(0 + scale(o_16.line.value)) - 2}px;top:${(top + 62) - 4}px;height:62px`) : defaultOf();
                const steps = append([(value_1 = r_3.value, {
                    at: T0(r_3.at),
                    value: value_1,
                })], map((s_1) => {
                    const value_2 = s_1.value;
                    return {
                        at: T0(s_1.at),
                        value: value_2,
                    };
                }, (r_3.steps || [])));
                return {
                    at: T0(r_3.at),
                    fill: fill,
                    label: label,
                    r: r_3,
                    steps: steps,
                    tick: tick,
                    toneAt: T0(r_3.toneAt),
                    track: track,
                    until: TUntil((r_3.until ?? o_16.until)),
                    value: value,
                };
            }, o_16.rows);
            if (!Operators_IsNull(lineLabel)) {
                lineLabel.style.cssText = (lineLabel.style.cssText + (`;left:${(0 + scale(o_16.line.value)) - 20}px;top:-56px;margin:0`));
            }
            return add({
                el: box_3,
                render: (t_7) => {
                    box_3.style.opacity = vis$0027(t_7, (matchValue_19 ?? firstAt(rows_2, (r_5) => r_5.at)), matchValue_20);
                    if (!Operators_IsNull(lineLabel)) {
                        lineLabel.style.opacity = (((rows_2.length > 0) && !((item_1(0, rows_2).at == null))) ? progIO(t_7, item_1(0, rows_2).at - 0.2, 0.4) : 1);
                    }
                    for (let idx_2 = 0; idx_2 <= (rows_2.length - 1); idx_2++) {
                        let r_4, v_1;
                        const row_1 = item_1(idx_2, rows_2);
                        const p_2 = vis$0027(t_7, row_1.at, row_1.until);
                        const arr = [row_1.label, row_1.track, row_1.fill, row_1.value, row_1.tick];
                        for (let idx_3 = 0; idx_3 <= (arr.length - 1); idx_3++) {
                            const e = item_1(idx_3, arr);
                            if (!Operators_IsNull(e)) {
                                e.style.opacity = p_2;
                            }
                        }
                        let v_2 = 0;
                        iterateIndexed((k_1, s_2) => {
                            const from = (k_1 === 0) ? 0 : item_1(k_1 - 1, row_1.steps).value;
                            if (!((s_2.at == null)) && (t_7 >= s_2.at)) {
                                v_2 = lerp(from, s_2.value, prog(t_7, s_2.at, 0.8, ease.out));
                            }
                        }, row_1.steps);
                        row_1.fill.style.transform = (`scaleX(${clamp(scale(v_2) / ((trackW || 1)), 0, 10)})`);
                        row_1.fill.style.width = (`${trackW}px`);
                        const on = isOn(row_1.r.tone, row_1.toneAt, t_7);
                        row_1.fill.style.background = (on ? tone(row_1.r.tone) : "var(--accent)");
                        row_1.value.style.left = (`${(0 + scale(v_2)) + 22}px`);
                        row_1.value.textContent = ((r_4 = row_1.r, (v_1 = v_2, (!!(r_4.format)) ? r_4.format(v_1) : (`${Math.round(v_1)}`))));
                        row_1.value.style.color = (on ? tone(row_1.r.tone) : "");
                    }
                },
            });
        },
        timeline(o_17) {
            const o_18 = opts(o_17);
            const w_4 = defaultArg(o_18.w, 1500);
            const box_4 = mk(host(o_18), "div", "k-abs", defaultOf(), `left:${defaultArg(o_18.x, 60)}px;top:${defaultArg(o_18.y, 400)}px;width:${w_4}px;height:120px`);
            const matchValue_21 = T0(o_18.at);
            const matchValue_22 = TUntil(o_18.until);
            let x_1 = 0;
            const segs = map((s_3) => {
                const sw = (s_3.value / o_18.total) * w_4;
                const el_39 = mk(box_4, "div", "k-seg", concat((!!(s_3.label)) ? concat("<div class=\"k-seg-label\">", s_3.label, "</div>") : "", "<div class=\"k-seg-value\">", String((s_3.show ?? s_3.value)), "</div>"), `left:${x_1}px;width:${max(sw - 4, 8)}px`);
                x_1 = (x_1 + sw);
                return {
                    at: T0(s_3.at),
                    el: el_39,
                    s: s_3,
                    toneAt: T0(s_3.toneAt),
                };
            }, o_18.segments);
            const sum = (!!(o_18.sum)) ? mk(box_4, "div", "k-big k-abs", o_18.sum.text, `left:${x_1 + 30}px;top:20px;white-space:nowrap`) : defaultOf();
            const sumAt = (!!(o_18.sum)) ? T0(o_18.sum.at) : noTime;
            return add({
                el: box_4,
                render: (t_8) => {
                    box_4.style.opacity = vis$0027(t_8, (matchValue_21 ?? firstAt(segs, (g_1) => g_1.at)), matchValue_22);
                    for (let idx_4 = 0; idx_4 <= (segs.length - 1); idx_4++) {
                        const g_2 = item_1(idx_4, segs);
                        const p_3 = vis(t_8, g_2.at, noTime, 0.3);
                        g_2.el.style.opacity = p_3;
                        g_2.el.style.transform = (`scaleX(${lerp(0.6, 1, p_3)})`);
                        g_2.el.style.transformOrigin = "0 50%";
                        const on_1 = isOn(g_2.s.tone, g_2.toneAt, t_8);
                        g_2.el.style.borderColor = (on_1 ? tone(g_2.s.tone) : "");
                        g_2.el.style.background = (on_1 ? concat("color-mix(in srgb, ", tone(g_2.s.tone), " 16%, var(--card))") : "");
                    }
                    if (!Operators_IsNull(sum)) {
                        show(sum, vis$0027(t_8, sumAt, noTime), 10, "");
                    }
                },
            });
        },
        flow(o_19) {
            const o_20 = opts(o_19);
            const layer = mk(host(o_20), "div", "k-abs", defaultOf(), "left:0;top:0;width:1920px;height:1080px");
            const svg = createSvg("svg");
            svg.setAttribute("class", "layer");
            svg.setAttribute("width", "1920");
            svg.setAttribute("height", "1080");
            layer.append(svg);
            const matchValue_26 = TAt(o_20.at);
            const layerUntil = TUntil(o_20.until);
            const partUntil = (spec_4) => {
                let c_7;
                if (!((spec_4 == null))) {
                    return T0(spec_4);
                }
                else {
                    const matchValue_28 = sceneCtx.contents;
                    let matchResult, c_8;
                    if (matchValue_28 != null) {
                        if ((c_7 = matchValue_28, ((layerUntil == null)) ? true : (layerUntil > c_7.until))) {
                            matchResult = 0;
                            c_8 = matchValue_28;
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
                            return c_8.until;
                        default:
                            return noTime;
                    }
                }
            };
            const along = (start, size, centre, pos) => {
                if (pos == null) {
                    return centre;
                }
                else {
                    return start + (size * clamp01(pos));
                }
            };
            const nodes = {};
            const arr_1 = Object.entries((o_20.nodes || {}));
            for (let idx_5 = 0; idx_5 <= (arr_1.length - 1); idx_5++) {
                const forLoopVar = item_1(idx_5, arr_1);
                const n = forLoopVar[1];
                const icon = (!!(n.icon)) ? concat("<span class=\"k-node-icon\">", n.icon, "</span>") : "";
                const sub_3 = (!!(n.sub)) ? concat("<span class=\"k-node-sub\">", n.sub, "</span>") : "";
                const el_46 = mk(layer, "div", "k-node", concat(icon, n.label, sub_3), `left:${n.x}px;top:${n.y}px`);
                if (!!(n.w)) {
                    el_46.style.width = (`${n.w}px`);
                }
                const at_12 = T0(n.at);
                const toneAt_6 = T0(n.toneAt);
                const dimAt = T0(n.dimAt);
                nodes[forLoopVar[0]] = {
                    at: at_12,
                    dimAt: dimAt,
                    el: el_46,
                    n: n,
                    toneAt: toneAt_6,
                    until: partUntil(n.until),
                };
            }
            const box_5 = (id_3) => {
                const e_1 = (nodes[id_3]).el;
                return new Box(e_1.offsetLeft, e_1.offsetTop, e_1.offsetWidth, e_1.offsetHeight);
            };
            const centre_1 = (b) => (new Point(b.x + (b.w / 2), b.y + (b.h / 2)));
            const edges = map((e_2) => {
                let matchValue_29;
                const path = createSvg("path");
                svg.append(path);
                return new EdgeState(e_2, path, (!!(e_2.label)) ? mk(layer, "div", "k-edge-label", e_2.label, defaultOf()) : defaultOf(), map((en) => {
                    const el_48 = createSvg("polygon");
                    svg.append(el_48);
                    return new Head(en, el_48);
                }, (matchValue_29 = defaultArg(e_2.arrow, "end"), (matchValue_29 === "both") ? ["start", "end"] : ((matchValue_29 === "end") ? ["end"] : []))), T0(e_2.at), T0(e_2.toneAt), partUntil(e_2.until), 0, 0);
            }, (o_20.edges || []));
            const packets = map((p_4) => {
                const el_49 = mk(layer, "div", concat("chip ", (p_4.tone || "accent"), " k-packet"), esc((p_4.label || "")), defaultOf());
                return {
                    at: T0(p_4.at),
                    dur: defaultArg(p_4.dur, 1),
                    el: el_49,
                    p: p_4,
                    until: TUntil(p_4.until),
                };
            }, (o_20.packets || []));
            let laidOut = false;
            return add({
                el: layer,
                render: (t_9) => {
                    if (!laidOut) {
                        const pairs = {};
                        for (let idx_6 = 0; idx_6 <= (edges.length - 1); idx_6++) {
                            const ed = item_1(idx_6, edges);
                            const key = [ed.e.from, ed.e.to].sort().join("\u0000");
                            if (((pairs[key]) == null)) {
                                pairs[key] = [];
                            }
                            void ((pairs[key]).push(ed));
                        }
                        const arr_2 = Object.values(pairs);
                        for (let idx_7 = 0; idx_7 <= (arr_2.length - 1); idx_7++) {
                            const group = item_1(idx_7, arr_2);
                            iterateIndexed_1((k_2, ed_1) => {
                                ed_1.lane = ((k_2 - ((group.length - 1) / 2)) * 40);
                            }, group);
                        }
                        for (let idx_8 = 0; idx_8 <= (edges.length - 1); idx_8++) {
                            const ed_2 = item_1(idx_8, edges);
                            const matchValue_30 = box_5(ed_2.e.from);
                            const b_1 = box_5(ed_2.e.to);
                            const a = matchValue_30;
                            const matchValue_32 = centre_1(a);
                            const cb = centre_1(b_1);
                            const ca = matchValue_32;
                            const dy = cb.y - ca.y;
                            const dx = cb.x - ca.x;
                            const horiz = (Math.abs(dx) * a.h) > (Math.abs(dy) * a.w);
                            const patternInput_13 = horiz ? [new Point((dx > 0) ? (a.x + a.w) : a.x, along(a.y, a.h, ca.y, ed_2.e.fromPos) + ed_2.lane), new Point((dx > 0) ? b_1.x : (b_1.x + b_1.w), along(b_1.y, b_1.h, cb.y, ed_2.e.toPos) + ed_2.lane)] : [new Point(along(a.x, a.w, ca.x, ed_2.e.fromPos) + ed_2.lane, (dy > 0) ? (a.y + a.h) : a.y), new Point(along(b_1.x, b_1.w, cb.x, ed_2.e.toPos) + ed_2.lane, (dy > 0) ? b_1.y : (b_1.y + b_1.h))];
                            const p2 = patternInput_13[1];
                            const p1 = patternInput_13[0];
                            const curved = horiz;
                            const len = ((Math.hypot((p2.x - p1.x), (p2.y - p1.y))) || 1);
                            const dirEnd = curved ? (new Point(Math.sign(p2.x - p1.x), 0)) : (new Point((p2.x - p1.x) / len, (p2.y - p1.y) / len));
                            const dirStart = new Point(-dirEnd.x, -dirEnd.y);
                            let q2 = p2;
                            let q1 = p1;
                            const arr_3 = ed_2.heads;
                            for (let idx_9 = 0; idx_9 <= (arr_3.length - 1); idx_9++) {
                                const hd = item_1(idx_9, arr_3);
                                const isEnd = hd.end === "end";
                                const matchValue_36 = isEnd ? p2 : p1;
                                const u = isEnd ? dirEnd : dirStart;
                                const tip = matchValue_36;
                                const q = new Point(tip.x - (u.x * 28), tip.y - (u.y * 28));
                                if (isEnd) {
                                    q2 = q;
                                }
                                else {
                                    q1 = q;
                                }
                                const ny = (u.x * 26) / 2;
                                const nx = (-u.y * 26) / 2;
                                const by = tip.y - (u.y * 28);
                                const bx = tip.x - (u.x * 28);
                                hd.el.setAttribute("points", `${tip.x},${tip.y} ${bx + nx},${by + ny} ${bx - nx},${by - ny}`);
                            }
                            const mx = (q1.x + q2.x) / 2;
                            const d_4 = curved ? (`M${q1.x},${q1.y} C${mx},${q1.y} ${mx},${q2.y} ${q2.x},${q2.y}`) : (`M${q1.x},${q1.y} L${q2.x},${q2.y}`);
                            ed_2.path.setAttribute("d", d_4);
                            ed_2.path.style.fill = "none";
                            ed_2.path.style.strokeWidth = "5";
                            ed_2.path.style.strokeLinecap = "round";
                            if (!!(ed_2.e.dashed)) {
                                ed_2.path.style.strokeDasharray = "14 12";
                            }
                            if (!Operators_IsNull(ed_2.label)) {
                                ed_2.label.style.left = (`${(p1.x + p2.x) / 2}px`);
                                ed_2.label.style.top = (`${(p1.y + p2.y) / 2}px`);
                                ed_2.label.style.transform = (horiz ? ((ed_2.lane > 0) ? "translate(-50%, 25%)" : "translate(-50%, -125%)") : ((ed_2.lane < 0) ? "translate(calc(-100% - 18px), -50%)" : "translate(18px, -50%)"));
                            }
                            ed_2.len = (ed_2.path.getTotalLength());
                        }
                        laidOut = true;
                    }
                    layer.style.opacity = vis$0027(t_9, matchValue_26, layerUntil);
                    const arr_4 = Object.values(nodes);
                    for (let idx_10 = 0; idx_10 <= (arr_4.length - 1); idx_10++) {
                        const nd_1 = item_1(idx_10, arr_4);
                        const p_5 = vis$0027(t_9, nd_1.at, nd_1.until);
                        show(nd_1.el, p_5, defaultArg(nd_1.n.rise, 12), "");
                        const on_2 = isOn(nd_1.n.tone, nd_1.toneAt, t_9);
                        nd_1.el.style.borderColor = (on_2 ? tone(nd_1.n.tone) : "");
                        nd_1.el.style.color = ((on_2 && !(!!(nd_1.n.fill))) ? tone(nd_1.n.tone) : "");
                        nd_1.el.style.background = ((on_2 && (!!(nd_1.n.fill))) ? concat("color-mix(in srgb, ", tone(nd_1.n.tone), " 24%, var(--card))") : "");
                        if (!((nd_1.dimAt == null))) {
                            nd_1.el.style.opacity = (p_5 * lerp(1, 0.35, progIO(t_9, nd_1.dimAt, 0.4)));
                        }
                    }
                    for (let idx_11 = 0; idx_11 <= (edges.length - 1); idx_11++) {
                        const ed_3 = item_1(idx_11, edges);
                        const p_6 = vis$0027(t_9, ed_3.at, ed_3.until);
                        const drawn = ((ed_3.at == null)) ? 1 : progIO(t_9, ed_3.at, 0.5);
                        ed_3.path.style.opacity = p_6;
                        if (!(!!(ed_3.e.dashed))) {
                            ed_3.path.style.strokeDasharray = (`${ed_3.len}`);
                            ed_3.path.style.strokeDashoffset = (`${ed_3.len * (1 - drawn)}`);
                        }
                        const on_3 = isOn(ed_3.e.tone, ed_3.toneAt, t_9);
                        ed_3.path.style.stroke = (on_3 ? tone(ed_3.e.tone) : "var(--faint)");
                        const arr_5 = ed_3.heads;
                        for (let idx_12 = 0; idx_12 <= (arr_5.length - 1); idx_12++) {
                            const hd_1 = item_1(idx_12, arr_5);
                            hd_1.el.style.fill = ed_3.path.style.stroke;
                            hd_1.el.style.opacity = (p_6 * ((hd_1.end === "start") ? clamp01(drawn * 8) : clamp01((drawn - 0.85) / 0.15)));
                        }
                        if (!Operators_IsNull(ed_3.label)) {
                            ed_3.label.style.opacity = p_6;
                            ed_3.label.style.color = (on_3 ? tone(ed_3.e.tone) : "");
                        }
                    }
                    for (let idx_13 = 0; idx_13 <= (packets.length - 1); idx_13++) {
                        const pk = item_1(idx_13, packets);
                        const matchValue_42 = box_5(pk.p.from);
                        const B = box_5(pk.p.to);
                        const A = matchValue_42;
                        const matchValue_44 = centre_1(A);
                        const cb_1 = centre_1(B);
                        const ca_1 = matchValue_44;
                        const w_5 = pk.el.offsetWidth;
                        const h_1 = pk.el.offsetHeight;
                        let patternInput_20;
                        if ((Math.abs(cb_1.x - ca_1.x) * (A.h + B.h)) >= (Math.abs(cb_1.y - ca_1.y) * (A.w + B.w))) {
                            const right = cb_1.x >= ca_1.x;
                            patternInput_20 = [new Point(right ? (((A.x + A.w) + 14) + (w_5 / 2)) : ((A.x - 14) - (w_5 / 2)), along(A.y, A.h, ca_1.y, pk.p.fromPos)), new Point(right ? ((B.x - 14) - (w_5 / 2)) : (((B.x + B.w) + 14) + (w_5 / 2)), along(B.y, B.h, cb_1.y, pk.p.toPos))];
                        }
                        else {
                            const down = cb_1.y >= ca_1.y;
                            patternInput_20 = [new Point(along(A.x, A.w, ca_1.x, pk.p.fromPos), down ? (((A.y + A.h) + 14) + (h_1 / 2)) : ((A.y - 14) - (h_1 / 2))), new Point(along(B.x, B.w, cb_1.x, pk.p.toPos), down ? ((B.y - 14) - (h_1 / 2)) : (((B.y + B.h) + 14) + (h_1 / 2)))];
                        }
                        const b_2 = patternInput_20[1];
                        const a_1 = patternInput_20[0];
                        const f_2 = prog(t_9, pk.at, pk.dur, ease.inOut);
                        const moving = ((!((pk.at == null)) && (t_9 >= pk.at)) && (t_9 < ((pk.at + pk.dur) + 0.05))) && (((pk.until == null)) ? true : (t_9 < pk.until));
                        const fadeAt = defaultArg(pk.p.fadeAt, 1);
                        const fade = (f_2 > fadeAt) ? (1 - clamp01((f_2 - fadeAt) / ((1 - fadeAt) + 1E-06))) : 1;
                        show(pk.el, moving ? fade : 0, 0, `translate(${lerp(a_1.x, b_2.x, f_2) - (w_5 / 2)}px, ${(lerp(a_1.y, b_2.y, f_2) - (h_1 / 2)) + defaultArg(pk.p.lift, 0)}px)`);
                    }
                },
            });
        },
        sequence(o_21) {
            const o_22 = opts(o_21);
            const matchValue_56 = defaultArg(o_22.x, 60);
            const matchValue_57 = defaultArg(o_22.y, 240);
            const matchValue_58 = defaultArg(o_22.w, 1800);
            const y0 = matchValue_57;
            const gap_1 = defaultArg(o_22.gap, 112);
            const matchValue_60 = (o_22.actors || []);
            const matchValue_61 = (o_22.messages || []);
            const actorOpts = matchValue_60;
            if (actorOpts.length === 0) {
                (() => { throw new Error("sequence: no actors"); })();
            }
            const layer_1 = mk(host(o_22), "div", "k-abs", defaultOf(), "left:0;top:0;width:1920px;height:1080px");
            const svg_1 = createSvg("svg");
            svg_1.setAttribute("class", "layer");
            svg_1.setAttribute("width", "1920");
            svg_1.setAttribute("height", "1080");
            layer_1.append(svg_1);
            const matchValue_62 = TAt(o_22.at);
            const matchValue_63 = TUntil(o_22.until);
            const columns = {};
            iterateIndexed((i_3, a_2) => {
                columns[a_2.id] = (matchValue_56 + ((matchValue_58 * (i_3 + 0.5)) / actorOpts.length));
            }, actorOpts);
            const column = (id_4) => {
                const cx = columns[id_4];
                if ((cx == null)) {
                    const known = join(", ", map((a_3) => a_3.id, actorOpts));
                    (() => { throw new Error(concat("sequence: a message names actor ", JSON.stringify(id_4), ", which is not one of: ", known)); })();
                }
                return cx;
            };
            const lastActor = item(actorOpts, actorOpts.length - 1).id;
            let cursor = (y0 + 96) + 10;
            let latest = noTime;
            const messages = mapIndexed((i_4, m) => {
                const matchValue_64 = column(m.from);
                const b_3 = column(m.to);
                const a_4 = matchValue_64;
                const self = m.from === m.to;
                const bottom = cursor + 70;
                const y_1 = self ? (bottom - 56) : bottom;
                cursor = ((bottom + gap_1) - 70);
                const at_15 = T0(m.at);
                if (!((at_15 == null))) {
                    if (!((latest == null)) && (at_15 < latest)) {
                        (() => { throw new Error(`sequence: message ${i_4} (${JSON.stringify(m.label)}) is timed before the message above it; time runs down the diagram, so list messages in the order they are spoken`); })();
                    }
                    latest = at_15;
                }
                const path_1 = createSvg("path");
                svg_1.append(path_1);
                path_1.style.fill = "none";
                path_1.style.strokeWidth = "5";
                path_1.style.strokeLinecap = "round";
                path_1.style.strokeLinejoin = "round";
                if (!!(m.reply)) {
                    path_1.style.strokeDasharray = "14 12";
                }
                const head = createSvg("polygon");
                svg_1.append(head);
                const label_3 = (!!(m.label)) ? mk(layer_1, "div", (!!(m.reply)) ? "k-edge-label k-seq-label k-seq-reply" : "k-edge-label k-seq-label", m.label, defaultOf()) : defaultOf();
                const side = ((self && (m.from === lastActor)) && (actorOpts.length > 1)) ? -1 : 1;
                const len_1 = ((90 + 56) + 90) - 28;
                if (self) {
                    path_1.setAttribute("d", `M${a_4},${y_1} H${a_4 + (side * 90)} V${bottom} H${a_4 + (side * 28)}`);
                    head.setAttribute("points", `${a_4},${bottom} ${a_4 + (side * 28)},${bottom - (26 / 2)} ${a_4 + (side * 28)},${bottom + (26 / 2)}`);
                }
                if (!Operators_IsNull(label_3)) {
                    if (self) {
                        label_3.style.left = (`${a_4 + (side * (90 + 18))}px`);
                        label_3.style.top = (`${(y_1 + bottom) / 2}px`);
                        label_3.style.transform = ((side > 0) ? "translate(0, -50%)" : "translate(-100%, -50%)");
                    }
                    else {
                        label_3.style.left = (`${(a_4 + b_3) / 2}px`);
                        label_3.style.top = (`${y_1}px`);
                        label_3.style.transform = "translate(-50%, calc(-100% - 10px))";
                    }
                }
                return {
                    a: a_4,
                    at: at_15,
                    b: b_3,
                    head: head,
                    label: label_3,
                    len: len_1,
                    m: m,
                    path: path_1,
                    self: self,
                    toneAt: T0(m.toneAt),
                    y: y_1,
                };
            }, matchValue_61);
            const lifeEnd = (messages.length > 0) ? ((cursor - (gap_1 - 70)) + 24) : ((y0 + 96) + 160);
            if (lifeEnd > 1000) {
                (() => { throw new Error(`sequence: ${messages.length} messages end at y ${Math.round(lifeEnd)}, below the safe area (${1000}): split the exchange across two scenes (about 6 messages fit), or pass a smaller y or gap`); })();
            }
            const actors = map((a_5) => {
                const cx_1 = column(a_5.id);
                const line_1 = createSvg("line");
                svg_1.append(line_1);
                line_1.setAttribute("x1", `${cx_1}`);
                line_1.setAttribute("x2", `${cx_1}`);
                line_1.setAttribute("y1", `${y0 + 96}`);
                line_1.setAttribute("y2", `${lifeEnd}`);
                line_1.style.stroke = "var(--border)";
                line_1.style.strokeWidth = "4";
                line_1.style.strokeDasharray = "4 14";
                const el_66 = mk(layer_1, "div", "k-node k-actor", concat((!!(a_5.icon)) ? concat("<span class=\"k-node-icon\">", a_5.icon, "</span>") : "", a_5.label), `left:${cx_1}px;top:${y0}px`);
                return {
                    a: a_5,
                    at: T0(a_5.at),
                    el: el_66,
                    line: line_1,
                    toneAt: T0(a_5.toneAt),
                };
            }, actorOpts);
            return add({
                el: layer_1,
                render: (t_10) => {
                    layer_1.style.opacity = vis$0027(t_10, matchValue_62, matchValue_63);
                    for (let idx_14 = 0; idx_14 <= (actors.length - 1); idx_14++) {
                        const ac = item_1(idx_14, actors);
                        const p_7 = vis$0027(t_10, ac.at, noTime);
                        show(ac.el, p_7, 12, "translateX(-50%)");
                        ac.line.style.opacity = p_7;
                        const on_4 = isOn(ac.a.tone, ac.toneAt, t_10);
                        ac.el.style.borderColor = (on_4 ? tone(ac.a.tone) : "");
                        ac.el.style.color = ((on_4 && !(!!(ac.a.fill))) ? tone(ac.a.tone) : "");
                        ac.el.style.background = ((on_4 && (!!(ac.a.fill))) ? concat("color-mix(in srgb, ", tone(ac.a.tone), " 24%, var(--card))") : "");
                    }
                    iterateIndexed((i_5, ms) => {
                        const next_2 = item(messages, i_5 + 1);
                        const dimP_1 = (((!!(o_22.dim)) && (!!(next_2))) && !((next_2.at == null))) ? progIO(t_10, next_2.at, 0.4) : 0;
                        const p_8 = vis$0027(t_10, ms.at, noTime) * lerp(1, 0.45, dimP_1);
                        const drawn_1 = ((ms.at == null)) ? 1 : progIO(t_10, ms.at, 0.5);
                        const on_5 = isOn(ms.m.tone, ms.toneAt, t_10);
                        const stroke = on_5 ? tone(ms.m.tone) : ((!!(ms.m.reply)) ? "var(--faint)" : "var(--muted)");
                        ms.path.style.opacity = p_8;
                        ms.path.style.stroke = stroke;
                        ms.head.style.fill = stroke;
                        if (ms.self) {
                            if (!(!!(ms.m.reply))) {
                                ms.path.style.strokeDasharray = (`${ms.len}`);
                                ms.path.style.strokeDashoffset = (`${ms.len * (1 - drawn_1)}`);
                            }
                            ms.head.style.opacity = (p_8 * clamp01((drawn_1 - 0.85) / 0.15));
                        }
                        else {
                            const dir = Math.sign(ms.b - ms.a);
                            const tip_1 = lerp(ms.a, ms.b, drawn_1);
                            const back = tip_1 - (dir * 28);
                            const lineEnd = (dir > 0) ? max(ms.a, back) : min(ms.a, back);
                            ms.path.setAttribute("d", `M${ms.a},${ms.y} L${lineEnd},${ms.y}`);
                            ms.head.setAttribute("points", `${tip_1},${ms.y} ${back},${ms.y - (26 / 2)} ${back},${ms.y + (26 / 2)}`);
                            ms.head.style.opacity = (p_8 * clamp01(drawn_1 * 8));
                        }
                        if (!Operators_IsNull(ms.label)) {
                            ms.label.style.opacity = p_8;
                            ms.label.style.color = (on_5 ? tone(ms.m.tone) : "");
                        }
                    }, messages);
                },
            });
        },
        code(o_23) {
            const o_24 = opts(o_23);
            const card = mk(host(o_24), "div", "k-code", defaultOf(), defaultOf());
            place(card, ({ ...{
                x: 60,
                y: 200,
            }, ...o_24 }));
            if (!!(o_24.title)) {
                mk(card, "div", "k-code-title", o_24.title, defaultOf());
            }
            const lang = defaultArg(o_24.lang, "csharp");
            const ls = map((l) => mk(card, "div", "k-cl", highlight(l, lang), defaultOf()), o_24.lines);
            if (!!(o_24.font)) {
                for (let idx_15 = 0; idx_15 <= (ls.length - 1); idx_15++) {
                    const l_1 = item_1(idx_15, ls);
                    l_1.style.fontSize = (`${o_24.font}px`);
                    const lh = `${Math.round((o_24.font * 60) / 44)}px`;
                    l_1.style.height = lh;
                    l_1.style.lineHeight = lh;
                }
            }
            const glows = map((g_3) => ({
                from: T0(g_3.from),
                g: g_3,
                until: TUntil(g_3.until),
            }), (o_24.glow || []));
            const matchValue_66 = TAt(o_24.at);
            const matchValue_67 = TUntil(o_24.until);
            return add({
                el: card,
                render: (t_11) => {
                    show(card, vis$0027(t_11, matchValue_66, matchValue_67), defaultArg(o_24.slide, 20), "");
                    iterateIndexed((i_6, l_2) => {
                        let p_9 = 0;
                        let colour = "var(--accent)";
                        for (let idx_16 = 0; idx_16 <= (glows.length - 1); idx_16++) {
                            const gl = item_1(idx_16, glows);
                            if (gl.g.line === i_6) {
                                const q_1 = within(t_11, gl.from, (gl.until ?? (Infinity)), 0.25);
                                if (q_1 > p_9) {
                                    p_9 = q_1;
                                    colour = ((tone(gl.g.tone) || colour));
                                }
                            }
                        }
                        l_2.style.background = ((p_9 > 0) ? (`color-mix(in srgb, ${colour} ${Math.round(p_9 * 22)}%, transparent)`) : "");
                    }, ls);
                },
            });
        },
        board(o_25) {
            const o_26 = opts(o_25);
            const card_1 = mk(host(o_26), "div", "k-board", defaultOf(), defaultOf());
            place(card_1, ({ ...{
                w: 1800,
                x: 60,
                y: 200,
            }, ...o_26 }));
            if (!!(o_26.title)) {
                mk(card_1, "div", "k-board-title", o_26.title, defaultOf());
            }
            const rows_3 = map((r_6) => {
                const row_2 = mk(card_1, "div", "k-br", defaultOf(), defaultOf());
                const label_4 = mk(row_2, "div", "k-br-label", (r_6.label || ""), defaultOf());
                const text_1 = mk(row_2, "div", "k-br-text", "", defaultOf());
                const result = (!!(r_6.result)) ? mk(row_2, "div", "k-br-result", esc(r_6.result), defaultOf()) : defaultOf();
                const at_17 = T0(r_6.at);
                const resultAt = T0(r_6.resultAt);
                return {
                    at: at_17,
                    dimAt: T0(r_6.dimAt),
                    label: label_4,
                    r: r_6,
                    result: result,
                    resultAt: resultAt,
                    row: row_2,
                    text: text_1,
                };
            }, o_26.rows);
            const at_18 = T0((o_26.at ?? ((o_26.rows.length > 0) ? item_1(0, o_26.rows).at : defaultOf())));
            const until_11 = TUntil(o_26.until);
            return add({
                el: card_1,
                render: (t_12) => {
                    show(card_1, vis$0027(t_12, at_18, until_11), 16, "");
                    for (let idx_17 = 0; idx_17 <= (rows_3.length - 1); idx_17++) {
                        const r_7 = item_1(idx_17, rows_3);
                        const p_10 = ((r_7.at == null)) ? 1 : progIO(t_12, r_7.at - 0.1, 0.3);
                        r_7.label.style.opacity = p_10;
                        r_7.text.textContent = typed(r_7.r.text, ((r_7.at == null)) ? 1 : prog(t_12, r_7.at, defaultArg(r_7.r.dur, 1.2), ease.linear));
                        if (!Operators_IsNull(r_7.result)) {
                            r_7.result.style.opacity = (((r_7.resultAt == null)) ? p_10 : progIO(t_12, r_7.resultAt - 0.1, 0.4));
                        }
                        r_7.row.style.opacity = (((r_7.dimAt == null)) ? 1 : lerp(1, 0.45, progIO(t_12, r_7.dimAt, 0.4)));
                    }
                },
            });
        },
        steps(labels, o_27) {
            const o_28 = opts(o_27);
            const box_6 = mk(host(o_28), "div", "k-steps", defaultOf(), defaultOf());
            place(box_6, ({ ...{
                x: 60,
                y: 140,
            }, ...o_28 }));
            const els = mapIndexed((i_7, l_3) => mk(box_6, "div", "k-step", `<b>${i_7 + 1}</b>${String(l_3)}`, defaultOf()), labels);
            const ats = map(T0, (o_28.ats || []));
            const atOf = (i_8) => item(ats, i_8);
            const at_19 = T0((o_28.at ?? item(ats, 0)));
            const until_12 = TUntil(o_28.until);
            return add({
                el: box_6,
                render: (t_13) => {
                    show(box_6, vis$0027(t_13, at_19, until_12), 12, "");
                    iterateIndexed((i_9, e_3) => {
                        const ai = atOf(i_9);
                        const reached = !((ai == null)) && (t_13 >= ai);
                        const next_3 = atOf(i_9 + 1);
                        const current_1 = reached && (((i_9 === (els.length - 1)) ? true : ((next_3 == null))) ? true : (t_13 < next_3));
                        e_3.style.borderColor = (current_1 ? "var(--accent)" : "");
                        e_3.style.background = (current_1 ? "var(--accent-dim)" : "");
                        e_3.style.color = (reached ? "var(--ink)" : "");
                        e_3.style.opacity = (reached ? 1 : 0.55);
                    }, els);
                },
            });
        },
        counter(o_29) {
            const o_30 = opts(o_29);
            const el_84 = mk(host(o_30), "div", concat("k-", (o_30.size || "counter")), defaultOf(), defaultOf());
            place(el_84, o_30);
            const matchValue_68 = TAt(o_30.at);
            const matchValue_69 = TUntil(o_30.until);
            const matchValue_70 = T0(o_30.toneAt);
            const at_20 = matchValue_68;
            const fmt_1 = (!!(o_30.format)) ? o_30.format : ((v_3) => ((Math.round(v_3)).toLocaleString("en-US")));
            return add({
                el: el_84,
                render: (t_14) => {
                    show(el_84, vis$0027(t_14, at_20, matchValue_69), 10, "");
                    el_84.textContent = fmt_1(lerp(defaultArg(o_30.from, 0), o_30.to, prog(t_14, at_20, defaultArg(o_30.dur, 1.2), ease.inOut)));
                    el_84.style.color = (isOn(o_30.tone, matchValue_70, t_14) ? tone(o_30.tone) : "");
                },
            });
        },
        toast(kind, o_31) {
            const o_32 = opts(o_31);
            const tt = toastEl(host(o_32), kind, o_32.text);
            tt.el.style.right = (`${defaultArg(o_32.right, 60)}px`);
            const option_9 = o_32.x;
            if (option_9 != null) {
                const x_3 = option_9;
                tt.el.style.left = (`${x_3}px`);
                tt.el.style.right = "";
            }
            tt.el.style.top = (`${defaultArg(o_32.y, 130)}px`);
            const matchValue_71 = TAt(o_32.at);
            const matchValue_72 = TUntil(o_32.until);
            const at_21 = matchValue_71;
            return add({
                el: tt.el,
                render: (t_15) => {
                    tt.draw(t_15, at_21, min((matchValue_72 ?? (Infinity)), at_21 + defaultArg(o_32.dur, TOAST_DUR)));
                },
            });
        },
        custom(build, render) {
            const el_90 = build(root);
            return add({
                el: el_90,
                render: (t_16) => {
                    render(t_16, el_90);
                },
            });
        },
        render(t_17) {
            for (let i_10 = 0; i_10 <= (parts.length - 1); i_10++) {
                item_1(i_10, parts).render(t_17);
            }
        },
    };
}

/**
 * The frame's breathing room for a long video: a "pause and think" countdown during every [think]
 * silence (top right, where toasts go), and each scene's "recap" as a full "So far" card, one line
 * arriving with each sentence, held through the scene's quiet end.
 */
export function frameBreaks(root) {
    const items = [];
    const arr = timing.scenes;
    for (let idx = 0; idx <= (arr.length - 1); idx++) {
        const s = item_1(idx, arr);
        const arr_1 = (s.breaks || []);
        for (let idx_1 = 0; idx_1 <= (arr_1.length - 1); idx_1++) {
            const b = item_1(idx_1, arr_1);
            if (b.kind === "think") {
                const tt = toastEl(root, "question", "Pause and think");
                tt.el.style.right = "60px";
                tt.el.style.top = "14px";
                const svg = createSvg("svg");
                svg.setAttribute("viewBox", "0 0 64 64");
                svg.classList.add("k-ring");
                svg.innerHTML = "<circle cx=\"32\" cy=\"32\" r=\"26\" stroke=\"var(--border)\"/><circle cx=\"32\" cy=\"32\" r=\"26\" stroke=\"var(--accent)\" transform=\"rotate(-90 32 32)\" stroke-dasharray=\"163.4\" stroke-linecap=\"round\"/>";
                tt.el.append(svg);
                const arc = svg.lastChild;
                void (items.push((t) => {
                    tt.draw(t, b.start - 0.1, b.end + 0.3);
                    arc.setAttribute("stroke-dashoffset", (163.4 * clamp01((t - b.start) / (b.end - b.start))).toFixed(2));
                }));
            }
        }
        if ((!!(s.recap)) && (!!(s.recap.length))) {
            const card = mk(root, "div", "k-recap", defaultOf(), defaultOf());
            const box = mk(card, "div", "k-recap-box", defaultOf(), defaultOf());
            mk(box, "div", "k-recap-title", "So far", defaultOf());
            const sent = s.sentences;
            const lines = mapIndexed((i, text) => {
                const el_2 = mk(box, "div", "k-recap-line", concat("<b>✓</b>", esc(text)), defaultOf());
                return {
                    at: ((sent.length > 0) ? item_1(min(i, sent.length - 1), sent).start : s.start) - 0.15,
                    el: el_2,
                };
            }, s.recap);
            const from = (sent.length > 0) ? (item_1(0, sent).start - 0.4) : s.start;
            void (items.push((t_1) => {
                const v = within(t_1, from, s.end - 0.05, 0.4);
                show(card, v, 0, concat("scale(", lerp(0.97, 1, v).toFixed(4), ")"));
                for (let idx_2 = 0; idx_2 <= (lines.length - 1); idx_2++) {
                    const l = item_1(idx_2, lines);
                    show(l.el, progIO(t_1, l.at, 0.35), 14, "");
                }
            }));
        }
    }
    return {
        count: items.length,
        render: (t_2) => {
            for (let i_1 = 0; i_1 <= (items.length - 1); i_1++) {
                item_1(i_1, items)(t_2);
            }
        },
    };
}

/**
 * The frame's toasts for a long video: every scene's "toasts" in the timing, in the band above the
 * content (top right). A toast leaves after its dur, or when the next one arrives.
 */
export function frameToasts(root) {
    let list;
    const _xs = toArray(delay(() => collect((s) => collect((d) => singleton({
        at: time(((d.at == null)) ? s.id : (SENTENCE_REF.test(d.at) ? (s.id + d.at) : concat(s.id, "|", d.at))),
        d: d,
    }), (s.toasts || [])), timing.scenes)));
    list = (_xs.sort((a, b) => a.at - b.at));
    const items = mapIndexed((i, x) => {
        const tt = toastEl(root, x.d.kind, x.d.text);
        tt.el.style.right = "60px";
        tt.el.style.top = "14px";
        return {
            at: x.at,
            tt: tt,
            until: min(((i + 1) < list.length) ? (item_1(i + 1, list).at - 0.1) : (Infinity), x.at + defaultArg(x.d.dur, TOAST_DUR)),
        };
    }, list);
    return {
        count: items.length,
        render: (t) => {
            for (let idx = 0; idx <= (items.length - 1); idx++) {
                const x_1 = item_1(idx, items);
                x_1.tt.draw(t, x_1.at, x_1.until);
            }
        },
    };
}

/**
 * Injects the kit's styles and returns window.Kit.
 */
export function install() {
    injectCss();
    return {
        TOASTS: TOASTS,
        frameToasts(root) {
            return frameToasts(root);
        },
        frameBreaks(root_1) {
            return frameBreaks(root_1);
        },
        kitFor(root_2) {
            return kitFor(root_2);
        },
        module(key, fn) {
            const K = new FSharpRef(undefined);
            if (((window["CH"]) == null)) {
                window["CH"] = {};
            }
            (window["CH"])[key] = {
                build: (root_3) => {
                    const k = kitFor(root_3);
                    K.contents = k;
                    fn(k);
                },
                render: (t) => {
                    const option_1 = K.contents;
                    if (option_1 != null) {
                        const k_1 = option_1;
                        k_1.render(t);
                    }
                },
            };
        },
        clip(fn_1) {
            const K_1 = kitFor(document.getElementById("stage"));
            fn_1(K_1);
            play((t_1) => {
                K_1.render(t_1);
            });
        },
    };
}

