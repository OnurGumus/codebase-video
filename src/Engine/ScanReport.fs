/// Findings from build/scan.json (made by the scan step), with what the voice is saying at each moment.
///
///   node engine/cli/Cv.js <clip-dir> report [all|short|overlap|empty|headonly|bounds|blink|ending|timeline|at <t>]
///
///   short     text on screen under 3 s (and when it appears relative to its words)
///   overlap   two visible texts (or a text and a drawing) overlapping
///   empty     the module stage holding nothing for 2 s or more
///   headonly  only a heading on the stage for 4 s or more while the narration talks
///   bounds    module content outside x 60-1860, y 240-1000
///   blink     an element that dips below 95% opacity and comes back within 1 s (a swap that blinks or jumps)
///   ending    content fading out on the last frame while other content holds
///   timeline  every element's on/off times with the words being spoken
///   at <t>    everything visible at one moment
///
/// Port of engine/scan_report.py; the output is byte-for-byte the same (it prints Python reprs of the scan's items).
module ScanReport

open Fable.Core
open Fable.Core.JsInterop
open Node
open Check

/// One element of a scanned frame, as scan.json records it.
type private Item = obj

let private PAUSE = function // the kit's word interpolation weights
    | "," -> 4
    | ";" | ":" | "—" | "–" -> 6
    | "." | "?" | "!" -> 8
    | _ -> 0

/// One spoken unit (a sentence, or one voice's part of it): scene, sentence index, start, end, text.
type private Unit =
    { Sid: string
      Index: int
      Start: float
      End: float
      Text: string[]
      /// weight(text, k) for every k: the kit's word interpolation
      Weights: int[] }

let private num (o: obj) (k: string) : float = o?(k)
let private txt (it: Item) : string = it?txt
let private layer (it: Item) : obj = it?layer
let private op (it: Item) = num it "op"
let private isModule (it: Item) = (Py.str (layer it)).StartsWith "mod-"
let private has (it: Item) (k: string) = Py.truthy (Py.get it k)
let private items (f: obj) : Item list = Py.list f "items"
let private t (f: obj) = num f "t"
/// round(x / 30): the rough x position elements are keyed by
let private col (it: Item) = Py.round (num it "x" / 30.0)

/// The stretches of frames for which `held` is true: the time of the stretch's first frame, `start` of that frame, and
/// the time of the first frame after it. A stretch that lasts to the last frame is not reported.
let private stretches (held: obj -> bool) (start: obj -> 'a) (frames: obj[]) : (float * 'a * float) list =
    let rec go (current: (float * 'a) option) (finished: (float * 'a * float) list) (fs: obj list) =
        match fs with
        | [] -> List.rev finished
        | f :: rest ->
            match held f, current with
            | true, None -> go (Some(t f, start f)) finished rest
            | false, Some(t0, x) -> go None ((t0, x, t f) :: finished) rest
            | _ -> go current finished rest
    go None [] (List.ofArray frames)

/// Two items of a frame that overlap, as the overlap report sees them: the items, and the width and height of the
/// overlap, each with whether it prints as a float (min()/max() return the first of equals, and a float there makes
/// it one).
type private Overlap =
    { A: Item
      B: Item
      W: float
      WFloat: bool
      H: float
      HFloat: bool }

/// Where A and B (two module items of one frame, A first) overlap, when it is worth reporting: text over text, text
/// over part of a drawing, or text straddling a box border. Not two drawings or boxes, not an item and one it sits
/// in, and not text inside its own drawing or box.
let private overlapOf (A: Item) (B: Item) : Overlap option =
    let inside (T: Item) (S: Item) =
        num T "x" >= num S "x" - 2.0 && num T "r" <= num S "r" + 2.0 && num T "y" >= num S "y" - 2.0 && num T "b" <= num S "b" + 2.0
    let shape (it: Item) = has it "svg" || has it "box"
    let shapes = shape A, shape B
    if fst shapes && snd shapes then None
    else
        let pa, pb = (unbox<string> A?path).Split('/'), (unbox<string> B?path).Split('/')
        if Array.contains (Py.str A?id) pb || Array.contains (Py.str B?id) pa then None
        else
            // min()/max() return the first of equals
            let rA, rB, xA, xB = num A "r", num B "r", num A "x", num B "x"
            let r = if rB < rA then rB else rA
            let x = if xB > xA then xB else xA
            let w = r - x
            let bA, bB, yA, yB = num A "b", num B "b", num A "y", num B "y"
            let bb = if bB < bA then bB else bA
            let y = if yB > yA then yB else yA
            let h = bb - y
            let isF v = not (Py.isInteger v)
            if w > 4.0 && h > 6.0 then
                // text inside its own drawing or box is normal; report only text that straddles the edge
                let skip = (fst shapes || snd shapes) && (let T, S = if fst shapes then B, A else A, B in inside T S)
                if skip then None
                else Some { A = A; B = B; W = w; WFloat = isF r || isF x; H = h; HFloat = isF bb || isF y }
            else None

type private Report(clip: string) =
    let scan = readJson (join [ clip; "build"; "scan.json" ])
    let timing = readJson (join [ clip; "build"; "timing.json" ])
    let frames = Py.list scan "frames" |> List.toArray
    let step = match Py.get scan "step" with null -> 0.25 | s -> unbox<float> s

    let units =
        [| for s in Py.list timing "scenes" do
               let sents = Py.list s "sentences"
               for i, se in List.indexed sents do
                   let parts = Py.list se "parts"
                   for u in (if parts.Length > 1 then parts else [ se ]) do
                       let text: string =
                           let sp = Py.get u "spoken"
                           if Py.truthy sp then unbox sp else unbox (Py.get u "text")
                       let cps = Py.codePoints text
                       { Sid = s?id
                         Index = i
                         Start = num u "start"
                         End = num u "end"
                         Text = cps
                         Weights = cps |> Array.scan (fun w c -> w + 1 + PAUSE c) 0 } |]

    let sceneStarts = Py.list timing "scenes" |> List.map (fun s -> num s "start") |> List.sort

    // Presence: an element at 15% opacity or more counts as on screen (a dimmed node is still there). Elements are
    // keyed by their text and rough x position, so a swap to an identical-looking copy (e.g. a struck "17") is one
    // element.
    let PRESENT = 0.15

    /// Every element that was on screen, in the order it first appeared: its key, the element as last seen, and the
    /// stretches it was on screen for (first time, last time), earliest first.
    let entries: (string * Item * (float * float) list) list =
        frames
        |> Array.toList
        |> List.collect (fun f ->
            items f
            |> List.filter (fun it -> not (op it < PRESENT || has it "svg" || has it "box" || has it "pk"))
            |> List.map (fun it -> toJson [| box (Py.take 60 (txt it)); box (col it); layer it |], it)
            |> List.distinctBy fst // an element counts once per frame, even if two copies share a key
            |> List.map (fun (k, it) -> k, t f, it))
        |> List.groupBy (fun (k, _, _) -> k) // first-seen order of the keys
        |> List.map (fun (k, hits) ->
            let _, _, last = List.last hits
            let ivs =
                hits
                |> List.fold
                    (fun ivs (_, time, _) ->
                        match ivs with
                        | (a, b) :: rest when abs (b - (time - step)) < 1e-6 -> (a, time) :: rest
                        | _ -> (time, time) :: ivs)
                    []
            k, last, List.rev ivs)

    let slice (cps: string[]) (a: int) (b: int) =
        let b = min b cps.Length
        if a >= b then "" else System.String.Join("", cps.[a .. b - 1])

    let line (s: string) = Py.print s
    let f72 = Py.fixedW 7 2

    member _.Errors =
        Py.list scan "logs"
        |> List.map (fun l -> unbox<string> l)
        |> List.filter (fun l ->
            let low = l.ToLower()
            (low.Contains "error" || low.Contains "failed") && not (l.Contains "Failed to load resource"))

    member _.said(time: float) : string =
        match units |> Array.tryFind (fun u -> u.Start <= time && time <= u.End) with
        | Some u ->
            let total = u.Weights.[u.Text.Length]
            let target = (time - u.Start) / max (u.End - u.Start) 1e-6 * float (if total = 0 then 1 else total)
            // the first position whose weight reaches the target
            let rec reach k = if k < u.Text.Length && float u.Weights.[k] < target then reach (k + 1) else k
            let k = reach 0
            $"{u.Sid}#{u.Index} …{slice u.Text (max 0 (k - 25)) k}|{slice u.Text k (k + 30)}…"
        | None ->
            match units |> Array.filter (fun u -> u.End < time) |> Array.tryLast with
            | Some p -> $"[silence after {p.Sid}#{p.Index}]"
            | None -> "[before speech]"

    member _.nearSceneChange (a: float) (b: float) =
        sceneStarts |> List.exists (fun t0 -> a - step <= t0 && t0 <= b + step)

    member r.short() =
        line "== text on screen under 3 s"
        for _, it, ivs in entries do
            if isModule it then
                for a, b in ivs do
                    if b - a + step < 3.0 then
                        let cut = if r.nearSceneChange b (b + 0.5) then " (cut by a scene change)" else ""
                        line $"{f72 a}-{f72 b} ({Py.fixedW 4 1 (b - a + step)}s){cut} {Py.reprStr (Py.take 60 (txt it))}\n          on: {r.said a}"

    member _.overlap() =
        line "== overlaps (text over text, text over part of a drawing, text straddling a box border)"
        // Every overlapping pair in every frame: (A id, B id), the time, the overlap.
        let hits =
            frames
            |> Array.toList
            |> List.collect (fun f ->
                let its = items f |> List.filter (fun i -> op i >= 0.5 && isModule i && not (has i "pk")) |> List.toArray
                [ for i in 0 .. its.Length - 1 do
                      for j in i + 1 .. its.Length - 1 do
                          match overlapOf its.[i] its.[j] with
                          | Some o -> toJson [| o.A?id; o.B?id |], t f, o
                          | None -> () ])
        // One row per pair, pairs in the order first seen: first time, last time, and the two texts, w and h as first
        // seen (formatted once per pair)
        let values =
            hits
            |> List.groupBy (fun (key, _, _) -> key)
            |> List.map (fun (_, group) ->
                let _, first, o = List.head group
                let _, last, _ = List.last group
                first, last, Py.take 45 (txt o.A), Py.take 45 (txt o.B), Py.numStr o.W o.WFloat, Py.numStr o.H o.HFloat)
        // sorted(found.values()): by first time, last time, the two texts, then w and h
        let byNum (s: string) = float s
        let sorted =
            values
            |> Py.sortWith (fun (a0, a1, a2, a3, a4, a5) (b0, b1, b2, b3, b4, b5) ->
                [ compare a0 b0; compare a1 b1; Py.cmpStr a2 b2; Py.cmpStr a3 b3; compare (byNum a4) (byNum b4); compare (byNum a5) (byNum b5) ]
                |> List.tryFind ((<>) 0)
                |> Option.defaultValue 0)
        for v0, v1, v2, v3, v4, v5 in sorted do
            line $"{f72 v0}-{f72 v1} w{v4} h{v5}  {Py.reprStr v2}  X  {Py.reprStr v3}"

    member r.empty() =
        line "== empty stage for 2 s or more"
        let busy (f: obj) =
            items f
            |> List.filter (fun i ->
                op i >= 0.5 && (isModule i || List.contains (Py.str (layer i)) [ "card"; "titleCard"; "toasts" ] && Py.isStr (layer i)))
        for r0, (), t1 in stretches (fun f -> (busy f).IsEmpty) ignore frames do
            if t1 - r0 >= 2.0 then line $"{f72 r0}-{f72 t1} ({Py.fmtF 1 (t1 - r0)}s) {r.said r0}"

    member r.headonly() =
        line "== heading only for 4 s or more"
        let mods (f: obj) = items f |> List.filter (fun i -> op i >= 0.5 && isModule i)
        let held (f: obj) =
            let mods = mods f
            let content = mods |> List.filter (fun i -> num i "y" >= 215.0)
            let cards =
                items f |> List.filter (fun i -> op i >= 0.5 && Py.isStr (layer i) && List.contains (Py.str (layer i)) [ "card"; "titleCard" ])
            not mods.IsEmpty && content.IsEmpty && cards.IsEmpty
        // the headings on the stage when the stretch starts
        let headings (f: obj) = mods f |> List.map (fun i -> Py.take 40 (txt i))
        for r0, texts, t1 in stretches held headings frames do
            if t1 - r0 >= 4.0 then
                let shown = "[" + (texts |> List.map Py.reprStr |> String.concat ", ") + "]"
                line $"{f72 r0}-{f72 t1} ({Py.fmtF 1 (t1 - r0)}s) {shown}  {r.said r0}"

    member _.bounds() =
        line "== outside x 60-1860 / y 240-1000 (headings sit higher by design)"
        // every element outside the limits in every frame: (id, name), its name, the time, the element
        let hits =
            frames
            |> Array.toList
            |> List.collect (fun f ->
                items f
                |> List.filter (fun it ->
                    not (op it < 0.5 || not (isModule it) || num it "y" < 200.0)
                    && (num it "x" < 58.0 || num it "r" > 1862.0 || num it "b" > 1002.0))
                |> List.map (fun it ->
                    let name = Py.take 50 (txt it)
                    toJson [| it?id; box name |], name, t f, it))
        for _, group in hits |> List.groupBy (fun (k, _, _, _) -> k) do
            let _, name, t0, first = List.head group
            let _, _, t1, _ = List.last group
            let n k = Py.jsonNum (num first k)
            line $"""{f72 t0}-{f72 t1} {Py.reprStr name} x{n "x"} y{n "y"} r{n "r"} b{n "b"}"""

    member r.blink() =
        line "== blinks: an element dipping below 95% and back within 1 s (or jumping position)"
        // Every element of a module in every frame: key, name, the time, (opacity, y).
        let hits =
            frames
            |> Array.toList
            |> List.collect (fun f ->
                items f
                |> List.filter (fun it -> isModule it && not (has it "pk") && not (has it "box"))
                |> List.map (fun it ->
                    let name = Py.take 60 (txt it)
                    toJson [| box name; box (col it) |], name, t f, (op it, (it?y: obj))))
        let ts = frames |> Array.map t
        let n = ts.Length
        let rec advance (cond: int -> bool) (i: int) = if i < n && cond i then advance cond (i + 1) else i
        for _, group in hits |> List.groupBy (fun (k, _, _, _) -> k) do // elements in the order first seen
            let _, name, _, _ = List.head group
            // time -> (opacity, y); the most opaque copy wins when two share a frame, the first of equals
            let series =
                group
                |> List.fold
                    (fun (m: Map<float, float * obj>) (_, _, time, (o, y)) ->
                        match Map.tryFind time m with
                        | Some(prev, _) when not (o > prev) -> m
                        | _ -> Map.add time (o, y) m)
                    Map.empty
            let vals = ts |> Array.map (fun time -> match Map.tryFind time series with Some v -> v | None -> (0.0, (null: obj)))
            // Walks the frames: a stretch at full opacity, then a dip, then back to full within a second.
            let rec walk (i: int) (found: string list) : string list =
                if i >= n then List.rev found
                elif fst vals.[i] >= 0.95 then
                    let j = advance (fun x -> fst vals.[x] >= 0.95) (i + 1)
                    let k2 = advance (fun x -> fst vals.[x] < 0.95 && ts.[x] - ts.[j] <= 1.0) j
                    if j < n && k2 < n && fst vals.[k2] >= 0.95 && ts.[k2] - ts.[j] <= 1.0
                       && not (r.nearSceneChange ts.[j] ts.[k2]) then
                        let low = vals.[j .. k2 - 1] |> Array.map fst |> Array.min
                        let y0, y1 = snd vals.[j - 1], snd vals.[k2]
                        let moved = if Py.isNone y0 || Py.isNone y1 then not (Py.isNone y0 && Py.isNone y1) else unbox<float> y0 <> unbox<float> y1
                        walk j ($"""{f72 ts.[j]}-{f72 ts.[k2]} min {Py.fmtF 2 low}{if moved then " moved" else ""}  {Py.reprStr name}""" :: found)
                    else walk j found
                else walk (i + 1) found
            for l in walk 0 [] do
                line l

    member _.ending() =
        line "== the last frame: content that fades out while other content holds"
        if frames.Length >= 4 then
            let last = frames.[frames.Length - 1]
            let target = t last - 1.0
            // min(): the first frame nearest one second before the end
            let before = frames |> Array.fold (fun best f -> if abs (t f - target) < abs (t best - target) then f else best) frames.[0]
            // each module element of a frame by key, in the order first seen: (key, name, opacity as last seen)
            let opacities (f: obj) =
                items f
                |> List.filter (fun i -> isModule i && not (has i "pk"))
                |> List.map (fun i ->
                    let name = Py.take 60 (txt i)
                    toJson [| box name; box (col i) |], name, op i)
                |> List.groupBy (fun (k, _, _) -> k)
                |> List.map (fun (k, copies) ->
                    let _, name, o = List.last copies
                    k, name, o)
            let now = opacities last
            let holding = now |> List.filter (fun (_, _, v) -> v >= 0.9) |> List.length
            let nowOp = now |> List.map (fun (k, _, v) -> k, v) |> Map.ofList // lookup only
            let nowGet k = defaultArg (Map.tryFind k nowOp) 0.0
            for k, name, v in opacities before do
                if v >= 0.95 && nowGet k < 0.6 && holding > 0 then
                    line $"  {Py.reprStr name} fades to {Py.fmtF 2 (nowGet k)} by {Py.fmtF 2 (t last)} while {holding} other item(s) hold"

    member r.timeline() =
        for _, it, ivs in entries |> List.sortBy (fun (_, _, ivs) -> fst (List.head ivs)) do
            for a, b in ivs do
                line $"{f72 a}-{f72 b} ({Py.fixedW 5 1 (b - a + step)}s) [{Py.str (layer it)}] {Py.reprStr (Py.take 70 (txt it))}\n          on: {r.said a}"

    member r.at(time: float) =
        // min(): the first frame nearest the time
        let f = frames |> Array.fold (fun best f -> if abs (t f - time) < abs (t best - time) then f else best) frames.[0]
        line (Py.jsonNum (t f) + " " + r.said (t f))
        for it in items f do
            line (Py.repr it)

[<Emit("Number($0)")>]
let private toNumber (s: string) : float = jsNative

let private modes = [ "short"; "overlap"; "empty"; "headonly"; "bounds"; "blink"; "ending"; "timeline" ]

/// args: [mode (default all)] [mode arguments...]; `at` takes a time in seconds.
let run (ws: string) (args: string list) : int =
    let mode = match args with m :: _ -> m | [] -> "all"
    match mode, args with
    | "at", [ _ ] -> Py.fail "usage: report at <seconds>"
    | "at", _ :: tArg :: _ when System.Double.IsNaN(toNumber tArg) || tArg.Trim() = "" ->
        Py.fail $"report at: not a time: {Py.reprStr tArg}"
    | m, _ when m <> "at" && m <> "all" && not (List.contains m modes) ->
        Py.fail $"""unknown report mode {Py.reprStr m} (all|{String.concat "|" modes}|at <t>)"""
    | _ ->
        let r = Report(ws)
        match mode, args with
        | "at", _ :: tArg :: _ -> r.at (toNumber tArg)
        | "all", _ ->
            let errors = r.Errors
            let shown = if errors.IsEmpty then "none" else "[" + (errors |> List.map Py.reprStr |> String.concat ", ") + "]"
            Py.print $"== page errors / failed module builds: {shown}"
            r.short ()
            r.overlap ()
            r.empty ()
            r.headonly ()
            r.bounds ()
            r.blink ()
            r.ending ()
        | "short", _ -> r.short ()
        | "overlap", _ -> r.overlap ()
        | "empty", _ -> r.empty ()
        | "headonly", _ -> r.headonly ()
        | "bounds", _ -> r.bounds ()
        | "blink", _ -> r.blink ()
        | "ending", _ -> r.ending ()
        | _ -> r.timeline ()
        Py.flush ()
        0
