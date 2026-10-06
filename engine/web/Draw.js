
import { replace } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { bool_type, array_type, tuple_type, string_type, record_type, float64_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { clamp01 } from "./Stage.js";
import { map, delay, toArray } from "./fable_modules/fable-library-js.5.19.0/Seq.js";

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

export function tone(name) {
    if (!!(name)) {
        return ((TONE[name]) || name);
    }
    else {
        return "";
    }
}

export function esc(s) {
    return replace(replace(replace(String(s), "&", "&amp;"), "<", "&lt;"), ">", "&gt;");
}

export function mk(parent, tag, cls, html, style) {
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

export class Box extends Record {
    constructor(x, y, w, h) {
        super();
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
}

export function Box_$reflection() {
    return record_type("Draw.Box", [], Box, () => [["x", float64_type], ["y", float64_type], ["w", float64_type], ["h", float64_type]]);
}

export class Point extends Record {
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
}

export function Point_$reflection() {
    return record_type("Draw.Point", [], Point, () => [["x", float64_type], ["y", float64_type]]);
}

export function centre(b) {
    return new Point(b.x + (b.w / 2), b.y + (b.h / 2));
}

export const patternInput$004043 = [28, 26];

export const HEAD_W = patternInput$004043[1];

export const HEAD_L = patternInput$004043[0];

/**
 * Where an end meets a box side that starts at `start` and is `size` long: `pos` 0..1 along it, or the
 * centre when the edge does not say.
 */
export function along(start, size, centre_1, pos) {
    if (pos == null) {
        return centre_1;
    }
    else {
        return start + (size * clamp01(pos));
    }
}

/**
 * An arrow from box `a` to box `b`: the path's `d`, the `points` of the arrowhead at each end asked for ("start",
 * "end"), where its label goes and how the label is shifted off the line, whether it leaves sideways (`horiz`), and
 * the distance between the two sides it joins (`span`).
 */
export class Route extends Record {
    constructor(d, heads, label, labelTransform, horiz, span) {
        super();
        this.d = d;
        this.heads = heads;
        this.label = label;
        this.labelTransform = labelTransform;
        this.horiz = horiz;
        this.span = span;
    }
}

export function Route_$reflection() {
    return record_type("Draw.Route", [], Route, () => [["d", string_type], ["heads", array_type(tuple_type(string_type, string_type))], ["label", Point_$reflection()], ["labelTransform", string_type], ["horiz", bool_type], ["span", float64_type]]);
}

/**
 * Routes an arrow between the nearest sides of two boxes. `lane` shifts it sideways (two edges between the same
 * boxes run side by side); `fromPos` / `toPos` move an end along its side. The line stops short of each arrowed end
 * so the head's tip, not the line's cap, touches the box.
 */
export function route(a, b, lane, fromPos, toPos, ends) {
    const matchValue = centre(a);
    const cb = centre(b);
    const ca = matchValue;
    const dy = cb.y - ca.y;
    const dx = cb.x - ca.x;
    const horiz = (Math.abs(dx) * a.h) > (Math.abs(dy) * a.w);
    const patternInput_2 = horiz ? [new Point((dx > 0) ? (a.x + a.w) : a.x, along(a.y, a.h, ca.y, fromPos) + lane), new Point((dx > 0) ? b.x : (b.x + b.w), along(b.y, b.h, cb.y, toPos) + lane)] : [new Point(along(a.x, a.w, ca.x, fromPos) + lane, (dy > 0) ? (a.y + a.h) : a.y), new Point(along(b.x, b.w, cb.x, toPos) + lane, (dy > 0) ? b.y : (b.y + b.h))];
    const p2 = patternInput_2[1];
    const p1 = patternInput_2[0];
    const curved = horiz;
    const len = ((Math.hypot((p2.x - p1.x), (p2.y - p1.y))) || 1);
    const dirEnd = curved ? (new Point(Math.sign(p2.x - p1.x), 0)) : (new Point((p2.x - p1.x) / len, (p2.y - p1.y) / len));
    const dirStart = new Point(-dirEnd.x, -dirEnd.y);
    let q2 = p2;
    let q1 = p1;
    const heads = toArray(delay(() => map((en) => {
        const isEnd = en === "end";
        const matchValue_4 = isEnd ? p2 : p1;
        const u = isEnd ? dirEnd : dirStart;
        const tip = matchValue_4;
        const q = new Point(tip.x - (u.x * HEAD_L), tip.y - (u.y * HEAD_L));
        if (isEnd) {
            q2 = q;
        }
        else {
            q1 = q;
        }
        const ny = (u.x * HEAD_W) / 2;
        const nx = (-u.y * HEAD_W) / 2;
        const by = tip.y - (u.y * HEAD_L);
        const bx = tip.x - (u.x * HEAD_L);
        return [en, `${tip.x},${tip.y} ${bx + nx},${by + ny} ${bx - nx},${by - ny}`];
    }, ends)));
    const mx = (q1.x + q2.x) / 2;
    return new Route(curved ? (`M${q1.x},${q1.y} C${mx},${q1.y} ${mx},${q2.y} ${q2.x},${q2.y}`) : (`M${q1.x},${q1.y} L${q2.x},${q2.y}`), heads, new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2), horiz ? ((lane > 0) ? "translate(-50%, 25%)" : "translate(-50%, -125%)") : ((lane < 0) ? "translate(calc(-100% - 18px), -50%)" : "translate(18px, -50%)"), horiz, len);
}

