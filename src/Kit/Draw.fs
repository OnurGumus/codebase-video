/// What the kit's drawings share: tones, small DOM helpers, and the geometry of an arrow between two boxes.
/// K.flow (Kit.fs) and the shared map (Map.fs) both draw boxes joined by arrows, and must draw them the same way.
module Draw

open Fable.Core.JsInterop
open Browser.Types
open Browser
open Interop
open Stage

let private TONE =
    createObj
        [ "accent" ==> "var(--accent)"
          "good" ==> "var(--good)"
          "bad" ==> "var(--bad)"
          "warn" ==> "var(--warn)"
          "violet" ==> "var(--violet)"
          "pink" ==> "var(--pink)"
          "cyan" ==> "var(--cyan)"
          "muted" ==> "var(--muted)"
          "ink" ==> "var(--ink)"
          "faint" ==> "var(--faint)" ]

let tone (name: string) : string = if truthy name then jsOr (get<string> TONE name) name else ""

let esc (s: obj) = (jsStr s).Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")

let mk (parent: HTMLElement) (tag: string) (cls: string) (html: obj) (style: string) : HTMLElement =
    let d = document.createElement (jsOr tag "div")
    if truthy cls then d.className <- cls
    if not (isNil html) then d?innerHTML <- html
    if truthy style then d.style.cssText <- style
    parent?append (d)
    d

type Box = { x: float; y: float; w: float; h: float }

type Point = { x: float; y: float }

let centre (b: Box) : Point = { x = b.x + b.w / 2.0; y = b.y + b.h / 2.0 }

/// An arrowhead: how far it reaches back along its line, and how wide it is.
let HEAD_L, HEAD_W = 28.0, 26.0

/// Where an end meets a box side that starts at `start` and is `size` long: `pos` 0..1 along it, or the
/// centre when the edge does not say.
let along (start: float) (size: float) (centre: float) (pos: float option) : float =
    match pos with
    | Some f -> start + size * clamp01 f
    | None -> centre

/// An arrow from box `a` to box `b`: the path's `d`, the `points` of the arrowhead at each end asked for ("start",
/// "end"), where its label goes and how the label is shifted off the line, whether it leaves sideways (`horiz`), and
/// the distance between the two sides it joins (`span`).
type Route =
    { d: string
      heads: (string * string)[]
      label: Point
      labelTransform: string
      horiz: bool
      span: float }

/// Routes an arrow between the nearest sides of two boxes. `lane` shifts it sideways (two edges between the same
/// boxes run side by side); `fromPos` / `toPos` move an end along its side. The line stops short of each arrowed end
/// so the head's tip, not the line's cap, touches the box.
let route (a: Box) (b: Box) (lane: float) (fromPos: float option) (toPos: float option) (ends: string[]) : Route =
    let ca, cb = centre a, centre b
    let dx, dy = cb.x - ca.x, cb.y - ca.y
    let horiz = abs dx * a.h > abs dy * a.w
    let p1, p2 =
        if horiz then
            { x = (if dx > 0.0 then a.x + a.w else a.x); y = along a.y a.h ca.y fromPos + lane },
            { x = (if dx > 0.0 then b.x else b.x + b.w); y = along b.y b.h cb.y toPos + lane }
        else
            { x = along a.x a.w ca.x fromPos + lane; y = (if dy > 0.0 then a.y + a.h else a.y) },
            { x = along b.x b.w cb.x toPos + lane; y = (if dy > 0.0 then b.y else b.y + b.h) }
    let curved = horiz
    // Direction of travel where the line meets each box: along x for the curve, along the line otherwise.
    let len = jsOr (hypot (p2.x - p1.x) (p2.y - p1.y)) 1.0
    let dirEnd =
        if curved then { x = sign (p2.x - p1.x); y = 0.0 }
        else { x = (p2.x - p1.x) / len; y = (p2.y - p1.y) / len }
    let dirStart = { x = -dirEnd.x; y = -dirEnd.y }
    let mutable q1, q2 = p1, p2
    let heads =
        [| for en in ends ->
               let isEnd = en = "end"
               let tip, u = (if isEnd then p2 else p1), (if isEnd then dirEnd else dirStart)
               let q = { x = tip.x - u.x * HEAD_L; y = tip.y - u.y * HEAD_L }
               if isEnd then q2 <- q else q1 <- q
               let bx, by, nx, ny = tip.x - u.x * HEAD_L, tip.y - u.y * HEAD_L, -u.y * HEAD_W / 2.0, u.x * HEAD_W / 2.0
               en, $"{tip.x},{tip.y} {bx + nx},{by + ny} {bx - nx},{by - ny}" |]
    let mx = (q1.x + q2.x) / 2.0
    { d =
        (if curved then $"M{q1.x},{q1.y} C{mx},{q1.y} {mx},{q2.y} {q2.x},{q2.y}"
         else $"M{q1.x},{q1.y} L{q2.x},{q2.y}")
      heads = heads
      label = { x = (p1.x + p2.x) / 2.0; y = (p1.y + p2.y) / 2.0 }
      // The label sits on the outside of its lane: above/left of the upper/left lane, below/right of the other.
      labelTransform =
        (if horiz then (if lane > 0.0 then "translate(-50%, 25%)" else "translate(-50%, -125%)")
         else (if lane < 0.0 then "translate(calc(-100% - 18px), -50%)" else "translate(18px, -50%)"))
      horiz = horiz
      span = len }
