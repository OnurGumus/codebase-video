/// The shared map of a long video: the system's main parts on a grid, joined by arrows (script.json "map", passed
/// through to window.TIMING.map). It is declared once and drawn in three places, always the same picture: as a flow
/// chapter's opener with that chapter's path lit, around a scene that goes inside one part (the part's box grows
/// into a boundary), both by the frame (Frame.fs), and inside a module by K.map (Kit.fs).
///
/// This file only draws. `build` makes the elements once; `draw` shows them for a State: how visible and how lit
/// each part and edge is, and how far a zoom into one part has gone. It knows nothing of scenes or chapters.
///
/// Parts sit in the cells of a 4 by 3 grid over the module area (x 60-1860, y 240-1000), each an icon and a label
/// in a box 96 px tall. A part is dim (35%, neutral) or lit (its kind's tone). An arrow between two parts of one
/// row or one column is straight; one that changes row and column leaves from the top or bottom of its box, turns
/// once and arrives level. Ends that meet on one side of a box are spread along it. An edge's label is drawn over a
/// level stretch that is long enough for it, or beside an upright arrow.
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
        // How each arrow runs. Two parts of one row are joined side to side ("level"), two of one column top to
        // bottom ("upright"). An arrow that changes row and column makes one turn. By choice it leaves its box
        // from the top or bottom and arrives level at the side that faces where it came from ("down-across"): so
        // it never starts on the side of a box where the arrows of that box's own row arrive, which made it read
        // as a branch of one of them. When a part sits on that way and the other way round is free, it leaves
        // level and arrives from above or below ("across-down"). check warns when neither way is free.
        let occupied = partDefs |> Array.map (fun p -> p.col, p.row) |> Set.ofArray
        let between (x: float) (a: float) (b: float) = x > System.Math.Min(a, b) && x < System.Math.Max(a, b)
        let free (cells: (float * float) list) = cells |> List.forall (fun c -> not (occupied.Contains c))
        let cols = partDefs |> Array.map (fun p -> p.col) |> Array.distinct
        let rows = partDefs |> Array.map (fun p -> p.row) |> Array.distinct
        let ends =
            edges
            |> Array.mapi (fun i g ->
                let a, b = part g.e.from, part g.e.``to``
                let c1, r1, c2, r2 = a.p.col, a.p.row, b.p.col, b.p.row
                let downAcross =
                    [ for r in rows do if between r r1 r2 then c1, r ] @ [ c1, r2 ] @ [ for c in cols do if between c c1 c2 then c, r2 ]
                let acrossDown =
                    [ for c in cols do if between c c1 c2 then c, r1 ] @ [ c2, r1 ] @ [ for r in rows do if between r r1 r2 then c2, r ]
                let mode =
                    if r1 = r2 then "level"
                    elif c1 = c2 then "upright"
                    elif free downAcross || not (free acrossDown) then "down-across"
                    else "across-down"
                let sideways = if b.cx > a.cx then "right", "left" else "left", "right"
                let updown = if b.cy > a.cy then "bottom", "top" else "top", "bottom"
                let fromSide, toSide =
                    match mode with
                    | "level" -> sideways
                    | "upright" -> updown
                    | "down-across" -> fst updown, snd sideways
                    | _ -> fst sideways, snd updown
                {| i = i; g = g; a = a; b = b; mode = mode; fromSide = fromSide; toSide = toSide |})
        // Where on its side an end attaches: alone, the middle; with others, spread along the side in the order
        // of where their other ends are, so that arrows meeting at one side neither share a point nor cross. Two
        // arrows between the same two parts keep their order at both, and so run side by side.
        let along (side: string) (other: PartEl) = if side = "left" || side = "right" then other.cy * 1e5 + other.cx else other.cx * 1e5 + other.cy
        let attached (id: string) (side: string) : (float * int)[] =
            [| for e in ends do
                   if e.g.e.from = id && e.fromSide = side then along side e.b, e.i
                   if e.g.e.``to`` = id && e.toSide = side then along side e.a, e.i |]
            |> Array.sort
        let pos (id: string) (side: string) (other: PartEl) (i: int) : float =
            let all = attached id side
            float (Array.findIndex ((=) (along side other, i)) all + 1) / float (all.Length + 1)
        for e in ends do
            let g, a, b = e.g, e.a.box, e.b.box
            let fromPos, toPos = pos g.e.from e.fromSide e.b e.i, pos g.e.``to`` e.toSide e.a e.i
            // The label of an arrow with a turn goes over its level stretch, from x0 to x1 at height y.
            let overLevel (x0: float) (x1: float) (y: float) =
                g.label.style.left <- $"{(x0 + x1) / 2.0}px"
                g.label.style.top <- $"{y}px"
                g.label.style.transform <- "translate(-50%, -125%)"
                g.fits <- g.label.offsetWidth + 40.0 <= abs (x1 - x0)
            match e.mode with
            | "level" | "upright" ->
                let r = route a b 0.0 (Some fromPos) (Some toPos) [| "end" |] (Some(e.mode = "level"))
                g.path.setAttribute ("d", r.d)
                g.head.setAttribute ("points", snd r.heads.[0])
                g.label.style.left <- $"{r.label.x}px"
                g.label.style.top <- $"{r.label.y}px"
                // The lower of two arrows that run side by side carries its label below its line.
                g.label.style.transform <- if e.mode = "level" && fromPos > 0.5 then "translate(-50%, 25%)" else r.labelTransform
                // A label over a level arrow has the gap between the two boxes to itself, less 20 px each side;
                // beside an upright arrow it has the row.
                let gap = if a.x + a.w <= b.x then b.x - (a.x + a.w) else a.x - (b.x + b.w)
                g.fits <- e.mode = "upright" || g.label.offsetWidth + 40.0 <= gap
            | "down-across" ->
                let sx, sy = a.x + a.w * fromPos, (if e.fromSide = "bottom" then a.y + a.h else a.y)
                let ey = b.y + b.h * toPos
                let dir = if e.toSide = "left" then 1.0 else -1.0
                let tip = if e.toSide = "left" then b.x else b.x + b.w
                let back = tip - dir * HEAD_L
                let down = if ey > sy then 1.0 else -1.0
                let turn = System.Math.Min(60.0, System.Math.Min(abs (back - sx), abs (ey - sy)))
                g.path.setAttribute ("d", $"M{sx},{sy} L{sx},{ey - down * turn} Q{sx},{ey} {sx + dir * turn},{ey} L{back},{ey}")
                g.head.setAttribute ("points", $"{tip},{ey} {back},{ey - HEAD_W / 2.0} {back},{ey + HEAD_W / 2.0}")
                overLevel (sx + dir * turn) back ey
            | _ ->
                let sx, sy = (if e.fromSide = "right" then a.x + a.w else a.x), a.y + a.h * fromPos
                let ex = b.x + b.w * toPos
                let down = if e.toSide = "top" then 1.0 else -1.0
                let tip = if e.toSide = "top" then b.y else b.y + b.h
                let back = tip - down * HEAD_L
                let dir = if ex > sx then 1.0 else -1.0
                let turn = System.Math.Min(60.0, System.Math.Min(abs (ex - sx), abs (back - sy)))
                g.path.setAttribute ("d", $"M{sx},{sy} L{ex - dir * turn},{sy} Q{ex},{sy} {ex},{sy + down * turn} L{ex},{back}")
                g.head.setAttribute ("points", $"{ex},{tip} {ex - HEAD_W / 2.0},{back} {ex + HEAD_W / 2.0},{back}")
                overLevel sx (ex - dir * turn) sy
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
