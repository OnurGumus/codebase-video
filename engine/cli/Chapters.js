
import { Py_str, Py_truthy, Py_roundInt } from "./Narrate.js";
import { replace, concat, join, padLeft } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { int32ToString } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { writeText, readJson } from "./Node.js";
import { append as append_1, empty, singleton, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { zip, singleton as singleton_1, tail, map, append, cons, head, isEmpty } from "./fable_modules/fable-library-js.5.19.0/List.js";

function stamp(t) {
    const ms = Py_roundInt(t * 1000) | 0;
    const two = (n) => padLeft(int32ToString(n), 2, "0");
    return `${two(~~(ms / 3600000))}:${two(~~(ms / 60000) % 60)}:${two(~~(ms / 1000) % 60)}.${padLeft(int32ToString(ms % 1000), 3, "0")}`;
}

/**
 * Writes the chapters file; returns 0, or 3 when the video has no chapters (the caller then removes the file).
 */
export function write(timingJson, outVtt) {
    const timing = readJson(timingJson);
    const marks = toList(delay(() => collect((s) => (Py_truthy(s.chapter) ? singleton([s.start, Py_str(s.chapter)]) : empty()), timing.scenes)));
    if (!isEmpty(marks)) {
        const marks_1 = (head(marks)[0] > 1) ? cons([0, "Introduction"], marks) : marks;
        const ends = append(map((tuple) => tuple[0], tail(marks_1)), singleton_1(timing.duration));
        writeText(outVtt, join("\n", toList(delay(() => append_1(singleton("WEBVTT"), delay(() => append_1(singleton(""), delay(() => collect((matchValue) => append_1(singleton(concat(stamp(matchValue[0][0]), " --> ", stamp(matchValue[1]))), delay(() => append_1(singleton(replace(matchValue[0][1], "-->", "->")), delay(() => singleton(""))))), zip(marks_1, ends))))))))));
        return 0;
    }
    else {
        return 3;
    }
}

