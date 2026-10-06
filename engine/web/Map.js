
import { Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { bool_type, unit_type, class_type, record_type, option_type, tuple_type, lambda_type, float64_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { route, tone, esc, mk, Box_$reflection, Box } from "./Draw.js";
import { lerp, show, clamp01, timing } from "./Stage.js";
import { defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { createSvg } from "./Interop.js";
import { item, map } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { min } from "./fable_modules/fable-library-js.5.19.0/Double.js";

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

export const patternInput$004056 = [1.2, 1];

export const ZOOM_OUT = patternInput$004056[1];

export const ZOOM_IN = patternInput$004056[0];

export const patternInput$004058$002D1 = [60, 240, 450, 253, 96];

export const Y0 = patternInput$004058$002D1[1];

const X0 = patternInput$004058$002D1[0];

export const CELL_W = patternInput$004058$002D1[2];

export const CELL_H = patternInput$004058$002D1[3];

export const BOX_H = patternInput$004058$002D1[4];

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
    constructor(p, tone, icon, cx, cy, el, box) {
        super();
        this.p = p;
        this.tone = tone;
        this.icon = icon;
        this.cx = cx;
        this.cy = cy;
        this.el = el;
        this.box = box;
    }
}

function PartEl_$reflection() {
    return record_type("Map.PartEl", [], PartEl, () => [["p", class_type("Map.MapPart")], ["tone", string_type], ["icon", string_type], ["cx", float64_type], ["cy", float64_type], ["el", class_type("Browser.Types.HTMLElement", undefined)], ["box", Box_$reflection()]]);
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
        const part = new PartEl(p, tone(kind.tone), icon, cx, cy, el, new Box(cx, cy - (BOX_H / 2), 0, BOX_H));
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
            for (let idx_1 = 0; idx_1 <= (edges.length - 1); idx_1++) {
                const g = item(idx_1, edges);
                const matchValue_4 = part_1(g.e.from).box;
                const b = part_1(g.e.to).box;
                const a = matchValue_4;
                const r = route(a, b, 0, undefined, undefined, ["end"], part_1(g.e.from).p.col !== part_1(g.e.to).p.col);
                g.path.setAttribute("d", r.d);
                g.head.setAttribute("points", item(0, r.heads)[1]);
                g.label.style.left = (`${r.label.x}px`);
                g.label.style.top = (`${r.label.y}px`);
                g.label.style.transform = r.labelTransform;
                const gap = ((a.x + a.w) <= b.x) ? (b.x - (a.x + a.w)) : (a.x - (b.x + b.w));
                const level = part_1(g.e.from).p.row === part_1(g.e.to).p.row;
                g.fits = (!r.horiz ? true : (level && ((g.label.offsetWidth + 40) <= gap)));
                if (!g.fits && (!!(g.e.label))) {
                    console.log(`map: label ${JSON.stringify(g.e.label)} on ${g.e.from} -> ${g.e.to} does not fit, not drawn`);
                }
            }
            laidOut = true;
        }
        let patternInput_3;
        const matchValue_6 = s.zoom;
        let matchResult, id_2, z_1;
        if (matchValue_6 != null) {
            if ((matchValue_6[0], matchValue_6[1] > 0)) {
                matchResult = 0;
                id_2 = matchValue_6[0];
                z_1 = matchValue_6[1];
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
                patternInput_3 = [id_2, clamp01(z_1)];
                break;
            }
            default:
                patternInput_3 = ["", 0];
        }
        const zoomed = patternInput_3[0];
        const z_2 = patternInput_3[1];
        const others = 1 - clamp01(z_2 * 1.8);
        for (let idx_2 = 0; idx_2 <= (parts.length - 1); idx_2++) {
            const q_1 = item(idx_2, parts);
            const l = clamp01(s.lit(q_1.p.id));
            show(q_1.el, (clamp01(s.vis(q_1.p.id)) * ((q_1.p.id === zoomed) ? 0 : others)) * lerp(DIM, 1, l), 0, "translateX(-50%)");
            q_1.el.style.borderColor = (`color-mix(in srgb, ${q_1.tone} ${l * 100}%, var(--border))`);
            q_1.el.style.color = (`color-mix(in srgb, ${q_1.tone} ${l * 100}%, var(--ink))`);
        }
        for (let idx_3 = 0; idx_3 <= (edges.length - 1); idx_3++) {
            const g_1 = item(idx_3, edges);
            const l_1 = clamp01(s.edgeLit(g_1.e.from, g_1.e.to));
            const v_1 = min(clamp01(s.vis(g_1.e.from)), clamp01(s.vis(g_1.e.to))) * others;
            const stroke = `color-mix(in srgb, var(--ink) ${l_1 * 100}%, var(--faint))`;
            g_1.path.style.opacity = (v_1 * lerp(DIM, 1, l_1));
            g_1.path.style.stroke = stroke;
            g_1.head.style.opacity = (v_1 * lerp(DIM, 1, l_1));
            g_1.head.style.fill = stroke;
            g_1.label.style.opacity = (g_1.fits ? (v_1 * lerp(DIM, 1, l_1)) : 0);
        }
        const on = (z_2 > 0) ? "block" : "none";
        bound.style.display = on;
        tag.style.display = on;
        if (z_2 > 0) {
            const q_2 = part_1(zoomed);
            const b_1 = q_2.box;
            bound.style.left = (`${lerp(b_1.x, BOUND.x, z_2)}px`);
            bound.style.top = (`${lerp(b_1.y, BOUND.y, z_2)}px`);
            bound.style.width = (`${lerp(b_1.w, BOUND.w, z_2)}px`);
            bound.style.height = (`${lerp(b_1.h, BOUND.h, z_2)}px`);
            bound.style.border = ((z_2 < 0.2) ? concat("3px solid ", q_2.tone) : concat("4px dashed color-mix(in srgb, ", q_2.tone, " 70%, transparent)"));
            bound.style.background = (`color-mix(in srgb, var(--card) ${(1 - clamp01(z_2 * 2)) * 100}%, transparent)`);
            if (tagged !== zoomed) {
                tagged = zoomed;
                tag.innerHTML = concat(q_2.icon, esc(q_2.p.label));
            }
            const tw = tag.offsetWidth;
            tag.style.left = (`${lerp(q_2.cx, TAG_RIGHT - (tw / 2), z_2)}px`);
            tag.style.top = (`${lerp(q_2.cy, BOUND.y, z_2)}px`);
            tag.style.color = q_2.tone;
            tag.style.background = (`color-mix(in srgb, var(--bg) ${clamp01(z_2 * 2) * 100}%, transparent)`);
        }
    });
}

