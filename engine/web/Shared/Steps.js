
import { Record } from "../fable_modules/fable-library-js.5.19.0/Types.js";
import { tuple_type, list_type, option_type, int32_type, record_type, string_type, float64_type } from "../fable_modules/fable-library-js.5.19.0/Reflection.js";
import { min, max } from "../fable_modules/fable-library-js.5.19.0/Double.js";
import { singleton, empty, isEmpty, scan, tail, zip, filter, map, tryItem, mapIndexed, collect } from "../fable_modules/fable-library-js.5.19.0/List.js";
import { orElse } from "../fable_modules/fable-library-js.5.19.0/Option.js";

export class Sentence extends Record {
    constructor(Start, End, Text$) {
        super();
        this.Start = Start;
        this.End = End;
        this.Text = Text$;
    }
}

export function Sentence_$reflection() {
    return record_type("Steps.Sentence", [], Sentence, () => [["Start", float64_type], ["End", float64_type], ["Text", string_type]]);
}

/**
 * A [pause] or [think] silence after sentence `Sentence` of its scene.
 */
export class Break extends Record {
    constructor(Sentence, Kind, Seconds) {
        super();
        this.Sentence = (Sentence | 0);
        this.Kind = Kind;
        this.Seconds = Seconds;
    }
}

export function Break_$reflection() {
    return record_type("Steps.Break", [], Break, () => [["Sentence", int32_type], ["Kind", string_type], ["Seconds", float64_type]]);
}

export class Scene extends Record {
    constructor(Ends, Chapter, Sentences, Breaks) {
        super();
        this.Ends = Ends;
        this.Chapter = Chapter;
        this.Sentences = Sentences;
        this.Breaks = Breaks;
    }
}

export function Scene_$reflection() {
    return record_type("Steps.Scene", [], Scene, () => [["Ends", float64_type], ["Chapter", option_type(string_type)], ["Sentences", list_type(Sentence_$reflection())], ["Breaks", list_type(Break_$reflection())]]);
}

export class Step extends Record {
    constructor(Start, Hold, Text$, Chapter, Pauses) {
        super();
        this.Start = Start;
        this.Hold = Hold;
        this.Text = Text$;
        this.Chapter = Chapter;
        this.Pauses = Pauses;
    }
}

export function Step_$reflection() {
    return record_type("Steps.Step", [], Step, () => [["Start", float64_type], ["Hold", float64_type], ["Text", string_type], ["Chapter", option_type(string_type)], ["Pauses", list_type(tuple_type(string_type, float64_type))]]);
}

const FRAME = 1 / 30;

const AFTER = 0.5;

const EARLY = 0.25;

const LEAVING = 0.6;

function holdOf(sceneEnds, s, next) {
    return max((next == null) ? min(s.End, sceneEnds - LEAVING) : min(s.End + AFTER, next.Start - EARLY), s.Start);
}

/**
 * The steps of a video; one step on its last frame when nothing is said.
 */
export function cut(duration, scenes) {
    const steps = collect((tupledArg) => {
        const sc_1 = tupledArg[0];
        return mapIndexed((i, s) => (new Step(s.Start, holdOf(sc_1.Ends, s, tryItem(i + 1, sc_1.Sentences)), s.Text, tupledArg[1], map((b_1) => [b_1.Kind, b_1.Seconds], filter((b) => (b.Sentence === i), sc_1.Breaks)))), sc_1.Sentences);
    }, zip(scenes, tail(scan((current, sc) => orElse(sc.Chapter, current), undefined, scenes))));
    if (isEmpty(steps)) {
        return singleton(new Step(0, duration - FRAME, "", undefined, empty()));
    }
    else {
        return steps;
    }
}

