/// The shared map of a long video: the system's main parts on a grid, joined by arrows (script.json "map", passed
/// through to window.TIMING.map). It is declared once and drawn in three places, always the same picture: as a flow
/// chapter's opener with that chapter's path lit, around a scene that goes inside one part (the part's box grows
/// into a boundary), both by the frame (Frame.fs), and inside a module by K.map (Kit.fs).
///
/// This file only draws. `build` makes the elements once; `draw` shows them for a State: how visible and how lit
/// each part and edge is, and how far a zoom into one part has gone. It knows nothing of scenes or chapters.
///
/// Parts sit in the cells of a 4 by 3 grid over the module area (x 60-1860, y 240-1000), each an icon and a label
/// in a box 96 px tall. A part is dim (35%, neutral) or lit (its kind's tone). An edge's label is drawn only on an
/// arrow between two parts of one row, when it fits between their boxes, or of one column.
module Map

open Fable.Core
open Fable.Core.JsInterop
open Browser.Types
open Interop
open Stage
open Draw

type MapKind =
    abstract tone: string
    abstract icon: string

type MapPart =
    abstract id: string
    abstract label: string
    abstract kind: string
    abstract col: float
    abstract row: float

type MapEdge =
    abstract from: string
    abstract ``to``: string
    abstract label: string

type MapDef =
    abstract kinds: obj
    abstract parts: MapPart[]
    abstract edges: MapEdge[]

/// What to draw: each part's visibility and litness (0..1) by id, each edge's litness by its two ends, and the part
/// being zoomed into with the zoom's progress (0 = still a box on the map, 1 = the boundary around the scene).
type State =
    { vis: string -> float
      lit: string -> float
      edgeLit: string -> string -> float
      zoom: (string * float) option }

type View = { el: HTMLElement; draw: State -> unit }

/// The boundary a part's box grows into: just outside the module area, so module layouts need not change.
let BOUND: Box = { x = 36.0; y = 218.0; w = 1848.0; h = 804.0 }

/// How long the zoom into a part takes, and how much of a visit's quiet end the way back out takes (seconds): the
/// content fades (0.3), the boundary shrinks to the box (0.7), the whole map is held for a moment (0.2) so the
/// viewer sees where they came out, then it leaves (0.3).
let ZOOM_IN, ZOOM_OUT = 1.2, 1.5

let private X0, Y0, CELL_W, CELL_H, BOX_H = 60.0, 240.0, 450.0, 253.0, 96.0
let private DIM = 0.35
/// Where the tag's right edge sits once the zoom is done: the module area's right edge.
let private TAG_RIGHT = 1860.0

/// The video's map, when its script has one.
let definition () : MapDef option =
    let m: MapDef = timing?map
    if truthy m then Some m else None

type private PartEl =
    { p: MapPart
      tone: string
      icon: string
      cx: float
      cy: float
      el: HTMLElement
      mutable box: Box }

type private EdgeEl =
    { e: MapEdge
      path: Element
      head: Element
      label: HTMLElement
      mutable fits: bool }

[<Emit("console.log($0)")>]
let private log (_msg: string) : unit = jsNative


/// Builds the map's elements in `parent` (a 1920x1080 layer of its own). Throws on a definition it cannot draw;
/// `check` reports those first, with more to say.
let build (parent: HTMLElement) (def: MapDef) : View =
    let partDefs, edgeDefs = jsOr def.parts [||], jsOr def.edges [||]
    if partDefs.Length = 0 then fail "map: no parts"
    let layer = mk parent "div" "k-abs k-map" null "left:0;top:0;width:1920px;height:1080px"
    let svg = createSvg "svg"
    svg.setAttribute ("class", "layer")
    svg.setAttribute ("width", "1920")
    svg.setAttribute ("height", "1080")
    layer?append (svg)
    let byId = table ()
    let parts =
        partDefs
        |> Array.map (fun p ->
            let kind: MapKind = if truthy def.kinds then get def.kinds p.kind else unbox null
            if not (truthy kind) || not (truthy kind.tone) then
                fail $"map: part {stringify p.id} has kind {stringify p.kind}, which has no tone in \"kinds\""
            if not (isNumber p.col) || not (isNumber p.row) then fail $"map: part {stringify p.id} has no cell (col, row)"
            let cx, cy = X0 + CELL_W * (p.col + 0.5), Y0 + CELL_H * (p.row + 0.5)
            let icon = if truthy kind.icon then $"""<span class="k-node-icon">{kind.icon}</span>""" else ""
            let el =
                mk layer "div" "k-node k-actor" $"{icon}{esc p.label}" $"left:{cx}px;top:{cy - BOX_H / 2.0}px;transform:translateX(-50%%)"
            let part =
                { p = p; tone = tone kind.tone; icon = icon; cx = cx; cy = cy; el = el
                  box = { x = cx; y = cy - BOX_H / 2.0; w = 0.0; h = BOX_H } }
            put byId p.id part
            part)
    let part (id: string) : PartEl =
        let p = get<PartEl> byId id
        if isNil p then fail $"map: {stringify id} is not a part"
        p
    let edges =
        edgeDefs
        |> Array.map (fun e ->
            part e.from |> ignore
            part e.``to`` |> ignore
            let path = createSvg "path"
            svg?append (path)
            path?style?fill <- "none"
            path?style?strokeWidth <- "5"
            path?style?strokeLinecap <- "round"
            let head = createSvg "polygon"
            svg?append (head)
            { e = e; path = path; head = head; label = mk layer "div" "k-edge-label" (esc (jsOr e.label "")) null; fits = false })
    let bound = mk layer "div" "k-abs k-map-bound" null "display:none"
    let tag = mk layer "div" "k-abs k-map-tag" null "display:none"
    let mutable laidOut = false
    let mutable tagged = ""
    let layout () =
        // Box widths are only known once the fonts are in, so edges are routed on the first draw that has them.
        for q in parts do
            let w = q.el.offsetWidth
            q.box <- { x = q.cx - w / 2.0; y = q.cy - BOX_H / 2.0; w = w; h = BOX_H }
        for g in edges do
            let a, b = (part g.e.from).box, (part g.e.``to``).box
            // Parts in different columns are joined side to side, so every such arrow reads left to right or
            // right to left and its label has the gap between the columns; parts in one column, top to bottom.
            let r = route a b 0.0 None None [| "end" |] (Some((part g.e.from).p.col <> (part g.e.``to``).p.col))
            g.path.setAttribute ("d", r.d)
            g.head.setAttribute ("points", snd r.heads.[0])
            g.label.style.left <- $"{r.label.x}px"
            g.label.style.top <- $"{r.label.y}px"
            g.label.style.transform <- r.labelTransform
            // A label over a level arrow has the gap between the two boxes to itself, less 20 px each side; beside
            // an upright arrow it has the row. An arrow between two rows and two columns is a steep curve where its
            // label would go, so it carries none.
            let gap = if a.x + a.w <= b.x then b.x - (a.x + a.w) else a.x - (b.x + b.w)
            let level = (part g.e.from).p.row = (part g.e.``to``).p.row
            g.fits <- not r.horiz || (level && g.label.offsetWidth + 40.0 <= gap)
            if not g.fits && truthy g.e.label then
                log $"map: label {stringify g.e.label} on {g.e.from} -> {g.e.``to``} does not fit, not drawn"
        laidOut <- true
    let draw (s: State) =
        if not laidOut && parts.[0].el.offsetWidth > 0.0 then layout ()
        let zoomed, z =
            match s.zoom with
            | Some(id, z) when z > 0.0 -> id, clamp01 z
            | _ -> "", 0.0
        // The parts that are not zoomed into leave in the first half of the zoom.
        let others = 1.0 - clamp01 (z * 1.8)
        for q in parts do
            let l = clamp01 (s.lit q.p.id)
            let v = clamp01 (s.vis q.p.id) * (if q.p.id = zoomed then 0.0 else others)
            show q.el (v * lerp DIM 1.0 l) 0.0 "translateX(-50%)"
            q.el.style.borderColor <- $"color-mix(in srgb, {q.tone} {l * 100.0}%%, var(--border))"
            q.el.style.color <- $"color-mix(in srgb, {q.tone} {l * 100.0}%%, var(--ink))"
        for g in edges do
            let l = clamp01 (s.edgeLit g.e.from g.e.``to``)
            let v = System.Math.Min(clamp01 (s.vis g.e.from), clamp01 (s.vis g.e.``to``)) * others
            let stroke = $"color-mix(in srgb, var(--ink) {l * 100.0}%%, var(--faint))"
            g.path?style?opacity <- v * lerp DIM 1.0 l
            g.path?style?stroke <- stroke
            g.head?style?opacity <- v * lerp DIM 1.0 l
            g.head?style?fill <- stroke
            g.label.style?opacity <- if g.fits then v * lerp DIM 1.0 l else 0.0
        let on = if z > 0.0 then "block" else "none"
        bound?style?display <- on
        tag?style?display <- on
        if z > 0.0 then
            let q = part zoomed
            let b = q.box
            // The box becomes the boundary: it grows, its fill clears, and its border turns dashed once it is
            // clearly no longer a box.
            bound.style.left <- $"{lerp b.x BOUND.x z}px"
            bound.style.top <- $"{lerp b.y BOUND.y z}px"
            bound.style.width <- $"{lerp b.w BOUND.w z}px"
            bound.style.height <- $"{lerp b.h BOUND.h z}px"
            bound?style?border <-
                if z < 0.2 then $"3px solid {q.tone}" else $"4px dashed color-mix(in srgb, {q.tone} 70%%, transparent)"
            bound.style.background <- $"color-mix(in srgb, var(--card) {(1.0 - clamp01 (z * 2.0)) * 100.0}%%, transparent)"
            if tagged <> zoomed then
                tagged <- zoomed
                tag.innerHTML <- $"{q.icon}{esc q.p.label}"
            // The label rides from the box's centre to the boundary's top edge, where it interrupts the dashed line.
            let tw = tag.offsetWidth
            tag.style.left <- $"{lerp q.cx (TAG_RIGHT - tw / 2.0) z}px"
            tag.style.top <- $"{lerp q.cy BOUND.y z}px"
            tag.style.color <- q.tone
            tag.style.background <- $"color-mix(in srgb, var(--bg) {clamp01 (z * 2.0) * 100.0}%%, transparent)"
    { el = layer; draw = draw }
