
import { Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { bool_type, unit_type, class_type, record_type, option_type, tuple_type, lambda_type, float64_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { HEAD_W, HEAD_L, route, tone, esc, mk, Box_$reflection, Box } from "./Draw.js";
import { lerp, show, clamp01, timing } from "./Stage.js";
import { equalArrays, numberHash, compareArrays, defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { createSvg } from "./Interop.js";
import { findIndex, sort, mapIndexed, item, map } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { FSharpSet__Contains, ofArray } from "./fable_modules/fable-library-js.5.19.0/Set.js";
import { max, min } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { singleton as singleton_1, append, forAll } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { Array_distinct } from "./fable_modules/fable-library-js.5.19.0/Seq2.js";
import { append as append_1, toArray, empty, singleton, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";

/**
 * What to draw: each part's visibility and litness (0..1) by id, each edge's litness by its two ends, and the part
 * being zoomed into with the zoom's progress (0 = still a box on the map, 1 = the boundary around the scene).
 */
export class State extends Record {
    constructor(vis, lit, edgeLit, zoom) {
        super();
        this.vis = vis;
        this.lit = lit;
        this.edgeLit = edgeLit;
        this.zoom = zoom;
    }
}

export function State_$reflection() {
    return record_type("Map.State", [], State, () => [["vis", lambda_type(string_type, float64_type)], ["lit", lambda_type(string_type, float64_type)], ["edgeLit", lambda_type(string_type, lambda_type(string_type, float64_type))], ["zoom", option_type(tuple_type(string_type, float64_type))]]);
}

export class View extends Record {
    constructor(el, draw) {
        super();
        this.el = el;
        this.draw = draw;
    }
}

export function View_$reflection() {
    return record_type("Map.View", [], View, () => [["el", class_type("Browser.Types.HTMLElement", undefined)], ["draw", lambda_type(State_$reflection(), unit_type)]]);
}

export const BOUND = new Box(36, 218, 1848, 804);

export const patternInput$004062 = [1.2, 1.9];

export const ZOOM_OUT = patternInput$004062[1];

export const ZOOM_IN = patternInput$004062[0];

export const patternInput$004064$002D1 = [60, 240, 450, 253, 96];

export const Y0 = patternInput$004064$002D1[1];

const X0 = patternInput$004064$002D1[0];

export const CELL_W = patternInput$004064$002D1[2];

export const CELL_H = patternInput$004064$002D1[3];

export const BOX_H = patternInput$004064$002D1[4];

const DIM = 0.35;

const TAG_RIGHT = 1860;

/**
 * The video's map, when its script has one.
 */
export function definition() {
    const m = timing.map;
    if (!!(m)) {
        return m;
    }
    else {
        return undefined;
    }
}

class PartEl extends Record {
    constructor(p, tone, icon, cx, cy, el, badge, box) {
        super();
        this.p = p;
        this.tone = tone;
        this.icon = icon;
        this.cx = cx;
        this.cy = cy;
        this.el = el;
        this.badge = badge;
        this.box = box;
    }
}

function PartEl_$reflection() {
    return record_type("Map.PartEl", [], PartEl, () => [["p", class_type("Map.MapPart")], ["tone", string_type], ["icon", string_type], ["cx", float64_type], ["cy", float64_type], ["el", class_type("Browser.Types.HTMLElement", undefined)], ["badge", class_type("Browser.Types.HTMLElement", undefined)], ["box", Box_$reflection()]]);
}

class EdgeEl extends Record {
    constructor(e, path, head, label, fits) {
        super();
        this.e = e;
        this.path = path;
        this.head = head;
        this.label = label;
        this.fits = fits;
    }
}

function EdgeEl_$reflection() {
    return record_type("Map.EdgeEl", [], EdgeEl, () => [["e", class_type("Map.MapEdge")], ["path", class_type("Browser.Types.Element", undefined)], ["head", class_type("Browser.Types.Element", undefined)], ["label", class_type("Browser.Types.HTMLElement", undefined)], ["fits", bool_type]]);
}

/**
 * Builds the map's elements in `parent` (a 1920x1080 layer of its own). Throws on a definition it cannot draw;
 * `check` reports those first, with more to say.
 */
export function build(parent, def) {
    const matchValue = (def.parts || []);
    const matchValue_1 = (def.edges || []);
    const partDefs = matchValue;
    if (partDefs.length === 0) {
        (() => { throw new Error("map: no parts"); })();
    }
    const layer = mk(parent, "div", "k-abs k-map", defaultOf(), "left:0;top:0;width:1920px;height:1080px");
    const svg = createSvg("svg");
    svg.setAttribute("class", "layer");
    svg.setAttribute("width", "1920");
    svg.setAttribute("height", "1080");
    layer.append(svg);
    const byId = {};
    const parts = map((p) => {
        const kind = (!!(def.kinds)) ? (def.kinds[p.kind]) : defaultOf();
        if (!(!!(kind)) ? true : !(!!(kind.tone))) {
            (() => { throw new Error(`map: part ${JSON.stringify(p.id)} has kind ${JSON.stringify(p.kind)}, which has no tone in "kinds"`); })();
        }
        if (!(typeof p.col === "number") ? true : !(typeof p.row === "number")) {
            (() => { throw new Error(concat("map: part ", JSON.stringify(p.id), " has no cell (col, row)")); })();
        }
        const matchValue_2 = X0 + (CELL_W * (p.col + 0.5));
        const cy = Y0 + (CELL_H * (p.row + 0.5));
        const cx = matchValue_2;
        const icon = (!!(kind.icon)) ? concat("<span class=\"k-node-icon\">", kind.icon, "</span>") : "";
        const el = mk(layer, "div", "k-node k-actor", concat(icon, esc(p.label)), `left:${cx}px;top:${cy - (BOX_H / 2)}px;transform:translateX(-50%)`);
        const badge = (!!(p.badge)) ? mk(layer, "div", "k-edge-label k-map-badge", esc(p.badge), defaultOf()) : defaultOf();
        const part = new PartEl(p, tone(kind.tone), icon, cx, cy, el, badge, new Box(cx, cy - (BOX_H / 2), 0, BOX_H));
        byId[p.id] = part;
        return part;
    }, partDefs);
    const part_1 = (id) => {
        const p_1 = byId[id];
        if ((p_1 == null)) {
            (() => { throw new Error(concat("map: ", JSON.stringify(id), " is not a part")); })();
        }
        return p_1;
    };
    const edges = map((e) => {
        part_1(e.from);
        part_1(e.to);
        const path = createSvg("path");
        svg.append(path);
        path.style.fill = "none";
        path.style.strokeWidth = "5";
        path.style.strokeLinecap = "round";
        const head = createSvg("polygon");
        svg.append(head);
        return new EdgeEl(e, path, head, mk(layer, "div", "k-edge-label", esc((e.label || "")), defaultOf()), false);
    }, matchValue_1);
    const bound = mk(layer, "div", "k-abs k-map-bound", defaultOf(), "display:none");
    const tag = mk(layer, "div", "k-abs k-map-tag", defaultOf(), "display:none");
    let laidOut = false;
    let tagged = "";
    return new View(layer, (s) => {
        if (!laidOut && (item(0, parts).el.offsetWidth > 0)) {
            for (let idx = 0; idx <= (parts.length - 1); idx++) {
                const q = item(idx, parts);
                const w = q.el.offsetWidth;
                q.box = (new Box(q.cx - (w / 2), q.cy - (BOX_H / 2), w, BOX_H));
            }
            const occupied = ofArray(map((p_2) => [p_2.col, p_2.row], partDefs), {
                Compare: (x, y) => (compareArrays(x, y) | 0),
            });
            const between = (x_1, a, b) => {
                if (x_1 > min(a, b)) {
                    return x_1 < max(a, b);
                }
                else {
                    return false;
                }
            };
            const free = (cells) => forAll((c) => !FSharpSet__Contains(occupied, c), cells);
            const cols = Array_distinct(map((p_3) => p_3.col, partDefs, Float64Array), {
                Equals: (x_2, y_1) => (x_2 === y_1),
                GetHashCode: (x_2) => (numberHash(x_2) | 0),
            });
            const rows = Array_distinct(map((p_4) => p_4.row, partDefs, Float64Array), {
                Equals: (x_3, y_2) => (x_3 === y_2),
                GetHashCode: (x_3) => (numberHash(x_3) | 0),
            });
            const ends = mapIndexed((i, g) => {
                const matchValue_4 = part_1(g.e.from);
                const b_1 = part_1(g.e.to);
                const a_1 = matchValue_4;
                const matchValue_6 = a_1.p.col;
                const matchValue_7 = a_1.p.row;
                const matchValue_8 = b_1.p.col;
                const r2 = b_1.p.row;
                const r1 = matchValue_7;
                const c2 = matchValue_8;
                const c1 = matchValue_6;
                const downAcross = append(toList(delay(() => collect((r) => (between(r, r1, r2) ? singleton([c1, r]) : empty()), rows))), append(singleton_1([c1, r2]), toList(delay(() => collect((c_1) => (between(c_1, c1, c2) ? singleton([c_1, r2]) : empty()), cols)))));
                const acrossDown = append(toList(delay(() => collect((c_2) => (between(c_2, c1, c2) ? singleton([c_2, r1]) : empty()), cols))), append(singleton_1([c2, r1]), toList(delay(() => collect((r_1) => (between(r_1, r1, r2) ? singleton([c2, r_1]) : empty()), rows)))));
                const mode = (r1 === r2) ? "level" : ((c1 === c2) ? "upright" : ((free(downAcross) ? true : !free(acrossDown)) ? "down-across" : "across-down"));
                const sideways = (b_1.cx > a_1.cx) ? ["right", "left"] : ["left", "right"];
                const updown = (b_1.cy > a_1.cy) ? ["bottom", "top"] : ["top", "bottom"];
                const patternInput_4 = (mode === "level") ? sideways : ((mode === "upright") ? updown : ((mode === "down-across") ? [updown[0], sideways[1]] : [sideways[0], updown[1]]));
                return {
                    a: a_1,
                    b: b_1,
                    fromSide: patternInput_4[0],
                    g: g,
                    i: i,
                    mode: mode,
                    toSide: patternInput_4[1],
                };
            }, edges);
            const along = (side, other) => {
                if ((side === "left") ? true : (side === "right")) {
                    return (other.cy * 100000) + other.cx;
                }
                else {
                    return (other.cx * 100000) + other.cy;
                }
            };
            const attached = (id_1, side_1) => sort(toArray(delay(() => collect((e_1) => append_1(((e_1.g.e.from === id_1) && (e_1.fromSide === side_1)) ? singleton([along(side_1, e_1.b), e_1.i]) : empty(), delay(() => (((e_1.g.e.to === id_1) && (e_1.toSide === side_1)) ? singleton([along(side_1, e_1.a), e_1.i]) : empty()))), ends))), {
                Compare: (x_4, y_3) => (compareArrays(x_4, y_3) | 0),
            });
            const pos = (id_2, side_2, other_1, i_1) => {
                let x_5;
                const all = attached(id_2, side_2);
                return (findIndex((x_5 = [along(side_2, other_1), i_1], (y_4) => equalArrays(x_5, y_4)), all) + 1) / (all.length + 1);
            };
            for (let idx_1 = 0; idx_1 <= (ends.length - 1); idx_1++) {
                const e_2 = item(idx_1, ends);
                const matchValue_11 = e_2.a.box;
                const g_1 = e_2.g;
                const b_2 = e_2.b.box;
                const a_2 = matchValue_11;
                const matchValue_13 = pos(g_1.e.from, e_2.fromSide, e_2.b, e_2.i);
                const toPos = pos(g_1.e.to, e_2.toSide, e_2.a, e_2.i);
                const fromPos = matchValue_13;
                const overLevel = (x0, x1, y_5, below) => {
                    g_1.label.style.left = (`${(x0 + x1) / 2}px`);
                    g_1.label.style.top = (`${y_5}px`);
                    g_1.label.style.transform = (below ? "translate(-50%, 25%)" : "translate(-50%, -125%)");
                    g_1.fits = ((g_1.label.offsetWidth + 40) <= Math.abs(x1 - x0));
                };
                const matchValue_15 = e_2.mode;
                switch (matchValue_15) {
                    case "level":
                    case "upright": {
                        const r_2 = route(a_2, b_2, 0, fromPos, toPos, ["end"], e_2.mode === "level");
                        g_1.path.setAttribute("d", r_2.d);
                        g_1.head.setAttribute("points", item(0, r_2.heads)[1]);
                        g_1.label.style.left = (`${r_2.label.x}px`);
                        g_1.label.style.top = (`${r_2.label.y}px`);
                        g_1.label.style.transform = (((e_2.mode === "level") && (fromPos > 0.5)) ? "translate(-50%, 25%)" : r_2.labelTransform);
                        const gap = ((a_2.x + a_2.w) <= b_2.x) ? (b_2.x - (a_2.x + a_2.w)) : (a_2.x - (b_2.x + b_2.w));
                        g_1.fits = ((e_2.mode === "upright") ? true : ((g_1.label.offsetWidth + 40) <= gap));
                        break;
                    }
                    case "down-across": {
                        const matchValue_16 = a_2.x + (a_2.w * fromPos);
                        const sy = (e_2.fromSide === "bottom") ? (a_2.y + a_2.h) : a_2.y;
                        const sx = matchValue_16;
                        const ey = b_2.y + (b_2.h * toPos);
                        const dir = (e_2.toSide === "left") ? 1 : -1;
                        const tip = (e_2.toSide === "left") ? b_2.x : (b_2.x + b_2.w);
                        const back = tip - (dir * HEAD_L);
                        const down = (ey > sy) ? 1 : -1;
                        const turn = min(60, min(Math.abs(back - sx), Math.abs(ey - sy)));
                        g_1.path.setAttribute("d", `M${sx},${sy} L${sx},${ey - (down * turn)} Q${sx},${ey} ${sx + (dir * turn)},${ey} L${back},${ey}`);
                        g_1.head.setAttribute("points", `${tip},${ey} ${back},${ey - (HEAD_W / 2)} ${back},${ey + (HEAD_W / 2)}`);
                        overLevel(sx + (dir * turn), back, ey, toPos > 0.5);
                        break;
                    }
                    default: {
                        const sy_1 = a_2.y + (a_2.h * fromPos);
                        const sx_1 = (e_2.fromSide === "right") ? (a_2.x + a_2.w) : a_2.x;
                        const ex = b_2.x + (b_2.w * toPos);
                        const down_1 = (e_2.toSide === "top") ? 1 : -1;
                        const tip_1 = (e_2.toSide === "top") ? b_2.y : (b_2.y + b_2.h);
                        const back_1 = tip_1 - (down_1 * HEAD_L);
                        const dir_1 = (ex > sx_1) ? 1 : -1;
                        const turn_1 = min(60, min(Math.abs(ex - sx_1), Math.abs(back_1 - sy_1)));
                        g_1.path.setAttribute("d", `M${sx_1},${sy_1} L${ex - (dir_1 * turn_1)},${sy_1} Q${ex},${sy_1} ${ex},${sy_1 + (down_1 * turn_1)} L${ex},${back_1}`);
                        g_1.head.setAttribute("points", `${ex},${tip_1} ${ex - (HEAD_W / 2)},${back_1} ${ex + (HEAD_W / 2)},${back_1}`);
                        overLevel(sx_1, ex - (dir_1 * turn_1), sy_1, fromPos > 0.5);
                    }
                }
                if (!g_1.fits && (!!(g_1.e.label))) {
                    console.log(`map: label ${JSON.stringify(g_1.e.label)} on ${g_1.e.from} -> ${g_1.e.to} does not fit, not drawn`);
                }
            }
            for (let idx_2 = 0; idx_2 <= (parts.length - 1); idx_2++) {
                const q_1 = item(idx_2, parts);
                if (!Operators_IsNull(q_1.badge)) {
                    const meets = (side_3) => (attached(q_1.p.id, side_3).length > 0);
                    const b_3 = q_1.box;
                    if (!meets("top")) {
                        q_1.badge.style.left = (`${q_1.cx}px`);
                        q_1.badge.style.top = (`${b_3.y}px`);
                        q_1.badge.style.transform = "translate(-50%, calc(-100% - 10px))";
                    }
                    else if (!meets("bottom")) {
                        q_1.badge.style.left = (`${q_1.cx}px`);
                        q_1.badge.style.top = (`${b_3.y + b_3.h}px`);
                        q_1.badge.style.transform = "translate(-50%, 10px)";
                    }
                    else {
                        q_1.badge.style.left = (`${b_3.x + 30}px`);
                        q_1.badge.style.top = (`${b_3.y}px`);
                        q_1.badge.style.transform = "translate(-100%, calc(-100% - 10px))";
                    }
                }
            }
            laidOut = true;
        }
        let patternInput_9;
        const matchValue_20 = s.zoom;
        let matchResult, id_4, z_1;
        if (matchValue_20 != null) {
            if ((matchValue_20[0], matchValue_20[1] > 0)) {
                matchResult = 0;
                id_4 = matchValue_20[0];
                z_1 = matchValue_20[1];
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
                patternInput_9 = [id_4, clamp01(z_1)];
                break;
            }
            default:
                patternInput_9 = ["", 0];
        }
        const zoomed = patternInput_9[0];
        const z_2 = patternInput_9[1];
        const others = 1 - clamp01(z_2 * 1.8);
        for (let idx_3 = 0; idx_3 <= (parts.length - 1); idx_3++) {
            const q_2 = item(idx_3, parts);
            const l = clamp01(s.lit(q_2.p.id));
            const v = clamp01(s.vis(q_2.p.id)) * ((q_2.p.id === zoomed) ? 0 : others);
            show(q_2.el, v * lerp(DIM, 1, l), 0, "translateX(-50%)");
            q_2.el.style.borderColor = (`color-mix(in srgb, ${q_2.tone} ${l * 100}%, var(--border))`);
            q_2.el.style.color = (`color-mix(in srgb, ${q_2.tone} ${l * 100}%, var(--ink))`);
            if (!Operators_IsNull(q_2.badge)) {
                const bv = (q_2.p.id === zoomed) ? (clamp01(s.vis(q_2.p.id)) * (1 - clamp01(z_2 * 4))) : v;
                q_2.badge.style.opacity = (bv * lerp(DIM, 1, l));
                q_2.badge.style.color = (`color-mix(in srgb, var(--ink) ${l * 100}%, var(--muted))`);
            }
        }
        for (let idx_4 = 0; idx_4 <= (edges.length - 1); idx_4++) {
            const g_2 = item(idx_4, edges);
            const l_1 = clamp01(s.edgeLit(g_2.e.from, g_2.e.to));
            const v_1 = min(clamp01(s.vis(g_2.e.from)), clamp01(s.vis(g_2.e.to))) * others;
            const stroke = `color-mix(in srgb, var(--ink) ${l_1 * 100}%, var(--faint))`;
            g_2.path.style.opacity = (v_1 * lerp(DIM, 1, l_1));
            g_2.path.style.stroke = stroke;
            g_2.head.style.opacity = (v_1 * lerp(DIM, 1, l_1));
            g_2.head.style.fill = stroke;
            g_2.label.style.opacity = (g_2.fits ? (v_1 * lerp(DIM, 1, l_1)) : 0);
        }
        const on = (z_2 > 0) ? "block" : "none";
        bound.style.display = on;
        tag.style.display = on;
        if (z_2 > 0) {
            const q_3 = part_1(zoomed);
            const b_4 = q_3.box;
            bound.style.left = (`${lerp(b_4.x, BOUND.x, z_2)}px`);
            bound.style.top = (`${lerp(b_4.y, BOUND.y, z_2)}px`);
            bound.style.width = (`${lerp(b_4.w, BOUND.w, z_2)}px`);
            bound.style.height = (`${lerp(b_4.h, BOUND.h, z_2)}px`);
            bound.style.border = ((z_2 < 0.2) ? concat("3px solid ", q_3.tone) : concat("4px dashed color-mix(in srgb, ", q_3.tone, " 70%, transparent)"));
            bound.style.background = (`color-mix(in srgb, var(--card) ${(1 - clamp01(z_2 * 2)) * 100}%, transparent)`);
            if (tagged !== zoomed) {
                tagged = zoomed;
                tag.innerHTML = concat(q_3.icon, esc(q_3.p.label));
            }
            const tw = tag.offsetWidth;
            tag.style.left = (`${lerp(q_3.cx, TAG_RIGHT - (tw / 2), z_2)}px`);
            tag.style.top = (`${lerp(q_3.cy, BOUND.y, z_2)}px`);
            tag.style.color = q_3.tone;
            tag.style.background = (`color-mix(in srgb, var(--bg) ${clamp01(z_2 * 2) * 100}%, transparent)`);
        }
    });
}

