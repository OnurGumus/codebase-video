
import { Union, Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { obj_type, bool_type, option_type, int32_type, union_type, record_type, lambda_type, float64_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { max, min } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { join, concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { disposeSafe, getEnumerator, equals, defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { delay, toList, exists, collect, indexed, tryFind, tryPick, unfold, map } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { some, value as value_4, toArray, defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { cut, Scene, Sentence } from "./Shared/Steps.js";
import { toArray as toArray_1, empty } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { receive, post as post_1, start as start_1 } from "./fable_modules/fable-library-js.5.19.0/MailboxProcessor.js";
import { singleton } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";

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

let captionsOn = !timing.voiced ? true : (!!(timing.captions));

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

class Command extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Next", "Back", "First", "Last", "Replay", "ToggleNotes", "SpeakerNotes", "FullScreen"];
    }
    static Next = new Command(0, []);
    static Back = new Command(1, []);
    static First = new Command(2, []);
    static Last = new Command(3, []);
    static Replay = new Command(4, []);
    static ToggleNotes = new Command(5, []);
    static SpeakerNotes = new Command(6, []);
    static FullScreen = new Command(7, []);
}

function Command_$reflection() {
    return union_type("Stage.Command", [], Command, () => [[], [], [], [], [], [], [], []]);
}

function $007CCommand$007C_$007C(key) {
    switch (key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
        case "Enter":
            return Command.Next;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
        case "Backspace":
            return Command.Back;
        case "Home":
            return Command.First;
        case "End":
            return Command.Last;
        case "r":
        case "R":
            return Command.Replay;
        case "n":
        case "N":
            return Command.ToggleNotes;
        case "s":
        case "S":
            return Command.SpeakerNotes;
        case "f":
        case "F":
            return Command.FullScreen;
        default:
            return undefined;
    }
}

const KEYS = "→ space or click: next · ←: back · R: replay · S: speaker notes · N: notes on the slide · F: full screen";

class Playback extends Record {
    constructor(From, Until, Began) {
        super();
        this.From = From;
        this.Until = Until;
        this.Began = Began;
    }
}

function Playback_$reflection() {
    return record_type("Stage.Playback", [], Playback, () => [["From", float64_type], ["Until", float64_type], ["Began", float64_type]]);
}

class Deck extends Record {
    constructor(Current, Playing, Overlay, Notes) {
        super();
        this.Current = (Current | 0);
        this.Playing = Playing;
        this.Overlay = Overlay;
        this.Notes = Notes;
    }
}

function Deck_$reflection() {
    return record_type("Stage.Deck", [], Deck, () => [["Current", int32_type], ["Playing", option_type(Playback_$reflection())], ["Overlay", bool_type], ["Notes", option_type(obj_type)]]);
}

class Msg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Do", "Tick"];
    }
}

function Msg_$reflection() {
    return union_type("Stage.Msg", [], Msg, () => [[["Item", Command_$reflection()]], [["Item", Playback_$reflection()]]]);
}

function command(steps, clock, deck, c) {
    const play_1 = (i) => (new Deck(i, new Playback((i === 0) ? 0 : item(i - 1, steps).Hold, item(i, steps).Hold, clock), deck.Overlay, deck.Notes));
    const holdAt = (i_1) => (new Deck(i_1, undefined, deck.Overlay, deck.Notes));
    let matchResult;
    switch (c.tag) {
        case 0: {
            if (deck.Playing != null) {
                matchResult = 0;
            }
            else if ((deck.Current + 1) < steps.length) {
                matchResult = 1;
            }
            else {
                matchResult = 7;
            }
            break;
        }
        case 1: {
            if (deck.Current >= 0) {
                matchResult = 2;
            }
            else {
                matchResult = 7;
            }
            break;
        }
        case 2: {
            matchResult = 3;
            break;
        }
        case 3: {
            matchResult = 4;
            break;
        }
        case 4: {
            if (deck.Current >= 0) {
                matchResult = 5;
            }
            else {
                matchResult = 7;
            }
            break;
        }
        case 5: {
            matchResult = 6;
            break;
        }
        default:
            matchResult = 7;
    }
    switch (matchResult) {
        case 0:
            return holdAt(deck.Current);
        case 1:
            return play_1(deck.Current + 1);
        case 2:
            return holdAt(deck.Current - 1);
        case 3:
            return holdAt(-1);
        case 4:
            return holdAt(steps.length - 1);
        case 5:
            return play_1(deck.Current);
        case 6:
            return new Deck(deck.Current, deck.Playing, !deck.Overlay, deck.Notes);
        default:
            return deck;
    }
}

function playhead(p, clock) {
    const t = p.From + ((clock - p.Began) / 1000);
    if (t < p.Until) {
        return t;
    }
    else {
        return undefined;
    }
}

function notesOf(steps, deck) {
    let option_1;
    const say = (i) => {
        if (i >= steps.length) {
            return "(the end)";
        }
        else if (item(i, steps).Text === "") {
            return "(no narration)";
        }
        else {
            return item(i, steps).Text;
        }
    };
    const matchValue = deck.Current | 0;
    if (matchValue === -1) {
        return [`${steps.length} steps`, "Press → or click to start.", say(0)];
    }
    else {
        const i_1 = matchValue | 0;
        const chapter = defaultArg((option_1 = item(i_1, steps).Chapter, (option_1 != null) ? (" · " + option_1) : undefined), "");
        return [`Step ${i_1 + 1} of ${steps.length}${chapter}`, say(i_1), say(i_1 + 1)];
    }
}

const NOTES_PAGE = "<style>body{margin:0;padding:28px 36px;background:#0f1420;color:#eef1f7;font:22px/1.4 -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif}#pos{color:#8ab8ff;font-weight:700;font-size:18px;letter-spacing:.04em}#now{font-size:40px;font-weight:600;margin:18px 0 26px;line-height:1.3}#next{color:#a9b3c6;font-size:26px}#next:before{content:\'Next: \';color:#5d6a82}#keys{position:fixed;bottom:16px;color:#5d6a82;font-size:16px}</style>" + concat("<div id=\"pos\"></div><div id=\"now\"></div><div id=\"next\"></div><div id=\"keys\">", KEYS, "</div>");

function isOpen(w) {
    return exists((w_1) => !w_1.closed, toArray(w));
}

function listenForKeys(target, post) {
    return target.addEventListener("keydown", ((e) => {
        const matchValue = e.key;
        const activePatternResult = $007CCommand$007C_$007C(matchValue);
        if (activePatternResult != null) {
            const c = activePatternResult;
            e.preventDefault();
            post(c);
        }
    }));
}

function speakerNotes(current, post) {
    if (isOpen(current)) {
        const option_1 = current;
        if (option_1 != null) {
            const w = value_4(option_1);
            w.focus();
        }
        return current;
    }
    else {
        const matchValue = window.open("", "cv-notes", "width=1000,height=600");
        if (equals(matchValue, defaultOf())) {
            return undefined;
        }
        else {
            const w_1 = matchValue;
            w_1.document.title = "Speaker notes";
            w_1.document.body.innerHTML = NOTES_PAGE;
            listenForKeys(w_1.document, post);
            return some(w_1);
        }
    }
}

function toggleFullScreen() {
    if (!!(document.fullscreenElement)) {
        document.exitFullscreen();
    }
    else {
        document.documentElement.requestFullscreen();
    }
}

function fitToWindow() {
    let el_3;
    const stage = document.getElementById("stage");
    const enumerator = getEnumerator([document.documentElement, document.body]);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const el = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            el.style.width = "100vw";
            el.style.height = "100vh";
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    ((el_3 = document.body, el_3.style)).background = "#000";
    stage.style.transformOrigin = "0 0";
    const fit = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const s = min(w / 1920, h / 1080);
        stage.style.transform = (`translate(${(w - (1920 * s)) / 2}px, ${(h - (1080 * s)) / 2}px) scale(${s})`);
    };
    fit();
    window.addEventListener("resize", (_arg) => {
        fit();
    });
}

function overlayBox() {
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:0;right:0;bottom:0;padding:14px 28px;background:#000c;color:#eef1f7;font:26px/1.35 -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;white-space:pre-line";
    document.body.appendChild(box);
    return box;
}

function stepScenes() {
    return toList(delay(() => map((sc) => (new Scene(sc.end, (!!(sc.chapter)) ? sc.chapter : undefined, toList(delay(() => map((s) => (new Sentence(s.start, s.end, s.text)), (!!(sc.sentences)) ? sc.sentences : []))), empty())), timing.scenes)));
}

function present(frame) {
    const steps = toArray_1(cut(timing.duration, stepScenes()));
    setCaptions(false);
    document.title = ("presenting - " + document.title);
    fitToWindow();
    const overlay = overlayBox();
    const show_1 = (deck) => {
        if (deck.Playing == null) {
            frame((deck.Current < 0) ? 0 : item(deck.Current, steps).Hold);
        }
        const patternInput = notesOf(steps, deck);
        const now = patternInput[1];
        const next = patternInput[2];
        overlay.style.display = (((deck.Current < 0) ? true : deck.Overlay) ? "block" : "none");
        overlay.textContent = ((deck.Current < 0) ? concat(now, "\n", KEYS) : concat(now, "\nNext: ", next));
        if (isOpen(deck.Notes)) {
            const d = value_4(deck.Notes).document;
            (d.getElementById("pos")).textContent = patternInput[0];
            (d.getElementById("now")).textContent = now;
            (d.getElementById("next")).textContent = next;
        }
    };
    const agent = start_1((inbox) => {
        const tickLater = (p) => {
            requestAnimationFrame((_arg) => {
                post_1(inbox, new Msg(/* Tick */ 1, [p]));
            });
        };
        const loop = (deck_2) => singleton.Delay(() => singleton.Bind(receive(inbox), (_arg_1) => {
            let matchValue_1, p_5;
            const msg = _arg_1;
            let next_1;
            if (msg.tag === 1) {
                if (equals(deck_2.Playing, msg.fields[0])) {
                    const p_1 = msg.fields[0];
                    const deck_1 = deck_2;
                    const matchValue = playhead(p_1, performance.now());
                    if (matchValue == null) {
                        next_1 = (new Deck(deck_1.Current, undefined, deck_1.Overlay, deck_1.Notes));
                    }
                    else {
                        frame(matchValue);
                        tickLater(p_1);
                        next_1 = deck_1;
                    }
                }
                else {
                    next_1 = deck_2;
                }
            }
            else {
                switch (msg.fields[0].tag) {
                    case 7: {
                        toggleFullScreen();
                        next_1 = deck_2;
                        break;
                    }
                    case 6: {
                        next_1 = (new Deck(deck_2.Current, deck_2.Playing, deck_2.Overlay, speakerNotes(deck_2.Notes, (c) => {
                            post_1(inbox, new Msg(/* Do */ 0, [c]));
                        })));
                        break;
                    }
                    default:
                        next_1 = command(steps, performance.now(), deck_2, msg.fields[0]);
                }
            }
            return singleton.Combine((matchValue_1 = next_1.Playing, (msg.tag === 0) ? ((matchValue_1 != null) ? ((!equals(next_1.Playing, deck_2.Playing)) ? ((p_5 = matchValue_1, (tickLater(p_5), singleton.Zero()))) : (singleton.Zero())) : (singleton.Zero())) : (singleton.Zero())), singleton.Delay(() => singleton.Combine(!equals(next_1, deck_2) ? ((show_1(next_1), singleton.Zero())) : singleton.Zero(), singleton.Delay(() => singleton.ReturnFrom(loop(next_1))))));
        }));
        const start = new Deck(-1, undefined, false, undefined);
        show_1(start);
        return loop(start);
    });
    listenForKeys(document, (c_2) => {
        post_1(agent, new Msg(/* Do */ 0, [c_2]));
    });
    document.body.addEventListener("click", (_arg_2) => {
        post_1(agent, new Msg(/* Do */ 0, [Command.Next]));
    });
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
    if (q.has("present")) {
        ready.then(() => {
            present(frame);
        });
    }
    else if (q.has("preview")) {
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

