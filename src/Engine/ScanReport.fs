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
                       let weights = Array.zeroCreate (cps.Length + 1)
                       cps |> Array.iteri (fun k c -> weights.[k + 1] <- weights.[k] + 1 + PAUSE c)
                       { Sid = s?id
                         Index = i
                         Start = num u "start"
                         End = num u "end"
                         Text = cps
                         Weights = weights } |]

    let sceneStarts = Py.list timing "scenes" |> List.map (fun s -> num s "start") |> List.sort

    // Presence: an element at 15% opacity or more counts as on screen (a dimmed node is still there). Elements are
    // keyed by their text and rough x position, so a swap to an identical-looking copy (e.g. a struck "17") is one
    // element.
    let PRESENT = 0.15
    let intervals = JS.Constructors.Map.Create<string, ResizeArray<float[]>>()
    let info = JS.Constructors.Map.Create<string, Item>()

    do
        for f in frames do
            let seenNow = System.Collections.Generic.HashSet<string>()
            for it in items f do
                if not (op it < PRESENT || has it "svg" || has it "box" || has it "pk") then
                    let k = toJson [| box (Py.take 60 (txt it)); box (col it); layer it |]
                    if seenNow.Add k then
                        info.set(k, it) |> ignore
                        if not (intervals.has k) then intervals.set(k, ResizeArray()) |> ignore
                        let iv = intervals.get k
                        if iv.Count > 0 && abs (iv.[iv.Count - 1].[1] - (t f - step)) < 1e-6 then
                            iv.[iv.Count - 1].[1] <- t f
                        else
                            iv.Add [| t f; t f |]

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
            let mutable k = 0
            while k < u.Text.Length && float u.Weights.[k] < target do
                k <- k + 1
            $"{u.Sid}#{u.Index} …{slice u.Text (max 0 (k - 25)) k}|{slice u.Text k (k + 30)}…"
        | None ->
            match units |> Array.filter (fun u -> u.End < time) |> Array.tryLast with
            | Some p -> $"[silence after {p.Sid}#{p.Index}]"
            | None -> "[before speech]"

    member _.nearSceneChange (a: float) (b: float) =
        sceneStarts |> List.exists (fun t0 -> a - step <= t0 && t0 <= b + step)

    member r.short() =
        line "== text on screen under 3 s"
        for k, iv in intervals.entries () do
            let it = info.get k
            if isModule it then
                for ab in iv do
                    let a, b = ab.[0], ab.[1]
                    if b - a + step < 3.0 then
                        let cut = if r.nearSceneChange b (b + 0.5) then " (cut by a scene change)" else ""
                        line $"{f72 a}-{f72 b} ({Py.fixedW 4 1 (b - a + step)}s){cut} {Py.reprStr (Py.take 60 (txt it))}\n          on: {r.said a}"

    member _.overlap() =
        line "== overlaps (text over text, text over part of a drawing, text straddling a box border)"
        // (A id, B id) -> [first t, last t, A text, B text, w, h]
        let found = JS.Constructors.Map.Create<string, float * float * string * string * string * string>()
        let order = ResizeArray<string>()
        let inside (T: Item) (S: Item) =
            num T "x" >= num S "x" - 2.0 && num T "r" <= num S "r" + 2.0 && num T "y" >= num S "y" - 2.0 && num T "b" <= num S "b" + 2.0
        let shape (it: Item) = has it "svg" || has it "box"
        for f in frames do
            let its = items f |> List.filter (fun i -> op i >= 0.5 && isModule i && not (has i "pk")) |> List.toArray
            for i in 0 .. its.Length - 1 do
                for j in i + 1 .. its.Length - 1 do
                    let A, B = its.[i], its.[j]
                    let shapes = shape A, shape B
                    if not (fst shapes && snd shapes) then
                        let pa, pb = (unbox<string> A?path).Split('/'), (unbox<string> B?path).Split('/')
                        if not (Array.contains (Py.str A?id) pb || Array.contains (Py.str B?id) pa) then
                            // min()/max() return the first of equals, and a float there makes w print as a float
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
                                let skip =
                                    (fst shapes || snd shapes)
                                    && (let T, S = if fst shapes then B, A else A, B in inside T S)
                                if not skip then
                                    let key = toJson [| A?id; B?id |]
                                    if found.has key then
                                        let (a, _, ta, tb, ws, hs) = found.get key
                                        found.set(key, (a, t f, ta, tb, ws, hs)) |> ignore
                                    else
                                        order.Add key
                                        found.set(
                                            key,
                                            (t f, t f, Py.take 45 (txt A), Py.take 45 (txt B),
                                             Py.numStr w (isF r || isF x), Py.numStr h (isF bb || isF y))
                                        )
                                        |> ignore
        // sorted(found.values()): by first time, last time, the two texts, then w and h
        let values = order |> Seq.map found.get |> List.ofSeq
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
        let mutable run: float option = None
        for f in frames do
            let busy =
                items f
                |> List.filter (fun i ->
                    op i >= 0.5 && (isModule i || List.contains (Py.str (layer i)) [ "card"; "titleCard"; "toasts" ] && Py.isStr (layer i)))
            if busy.IsEmpty then
                run <- (match run with None -> Some(t f) | r -> r)
            else
                match run with
                | Some r0 when t f - r0 >= 2.0 -> line $"{f72 r0}-{f72 (t f)} ({Py.fmtF 1 (t f - r0)}s) {r.said r0}"
                | _ -> ()
                run <- None

    member r.headonly() =
        line "== heading only for 4 s or more"
        let mutable run: (float * string list) option = None
        for f in frames do
            let mods = items f |> List.filter (fun i -> op i >= 0.5 && isModule i)
            let content = mods |> List.filter (fun i -> num i "y" >= 215.0)
            let cards =
                items f |> List.filter (fun i -> op i >= 0.5 && Py.isStr (layer i) && List.contains (Py.str (layer i)) [ "card"; "titleCard" ])
            if not mods.IsEmpty && content.IsEmpty && cards.IsEmpty then
                if run.IsNone then run <- Some(t f, mods |> List.map (fun i -> Py.take 40 (txt i)))
            else
                match run with
                | Some(r0, texts) when t f - r0 >= 4.0 ->
                    let shown = "[" + (texts |> List.map Py.reprStr |> String.concat ", ") + "]"
                    line $"{f72 r0}-{f72 (t f)} ({Py.fmtF 1 (t f - r0)}s) {shown}  {r.said r0}"
                | _ -> ()
                run <- None

    member _.bounds() =
        line "== outside x 60-1860 / y 240-1000 (headings sit higher by design)"
        let bad = JS.Constructors.Map.Create<string, ResizeArray<float * Item>>()
        let names = JS.Constructors.Map.Create<string, string>()
        for f in frames do
            for it in items f do
                if not (op it < 0.5 || not (isModule it) || num it "y" < 200.0) then
                    if num it "x" < 58.0 || num it "r" > 1862.0 || num it "b" > 1002.0 then
                        let name = Py.take 50 (txt it)
                        let k = toJson [| it?id; box name |]
                        if not (bad.has k) then
                            bad.set(k, ResizeArray()) |> ignore
                            names.set(k, name) |> ignore
                        bad.get(k).Add((t f, it))
        for k, v in bad.entries () do
            let t0, first = v.[0]
            let t1, _ = v.[v.Count - 1]
            let n k = Py.jsonNum (num first k)
            line $"""{f72 t0}-{f72 t1} {Py.reprStr (names.get k)} x{n "x"} y{n "y"} r{n "r"} b{n "b"}"""

    member r.blink() =
        line "== blinks: an element dipping below 95% and back within 1 s (or jumping position)"
        // key -> time -> (opacity, y)
        let series = JS.Constructors.Map.Create<string, JS.Map<float, float * obj>>()
        let names = JS.Constructors.Map.Create<string, string>()
        for f in frames do
            for it in items f do
                if isModule it && not (has it "pk") && not (has it "box") then
                    let name = Py.take 60 (txt it)
                    let k = toJson [| box name; box (col it) |]
                    if not (series.has k) then
                        series.set(k, JS.Constructors.Map.Create()) |> ignore
                        names.set(k, name) |> ignore
                    let s = series.get k
                    if not (s.has (t f)) || op it > fst (s.get (t f)) then
                        s.set(t f, (op it, it?y)) |> ignore
        let ts = frames |> Array.map t
        let n = ts.Length
        for k, s in series.entries () do
            let vals = ts |> Array.map (fun time -> if s.has time then s.get time else (0.0, null))
            let mutable i = 0
            while i < n do
                if fst vals.[i] >= 0.95 then
                    let mutable j = i + 1
                    while j < n && fst vals.[j] >= 0.95 do
                        j <- j + 1
                    let mutable k2 = j
                    while k2 < n && fst vals.[k2] < 0.95 && ts.[k2] - ts.[j] <= 1.0 do
                        k2 <- k2 + 1
                    if j < n && k2 < n && fst vals.[k2] >= 0.95 && ts.[k2] - ts.[j] <= 1.0
                       && not (r.nearSceneChange ts.[j] ts.[k2]) then
                        let low = vals.[j .. k2 - 1] |> Array.map fst |> Array.min
                        let y0, y1 = snd vals.[j - 1], snd vals.[k2]
                        let moved = if Py.isNone y0 || Py.isNone y1 then not (Py.isNone y0 && Py.isNone y1) else unbox<float> y0 <> unbox<float> y1
                        line $"""{f72 ts.[j]}-{f72 ts.[k2]} min {Py.fmtF 2 low}{if moved then " moved" else ""}  {Py.reprStr (names.get k)}"""
                    i <- j
                else
                    i <- i + 1

    member _.ending() =
        line "== the last frame: content that fades out while other content holds"
        if frames.Length >= 4 then
            let last = frames.[frames.Length - 1]
            let target = t last - 1.0
            // min(): the first frame nearest one second before the end
            let before = frames |> Array.fold (fun best f -> if abs (t f - target) < abs (t best - target) then f else best) frames.[0]
            let opacities (f: obj) =
                let m = JS.Constructors.Map.Create<string, float>()
                let names = JS.Constructors.Map.Create<string, string>()
                for i in items f do
                    if isModule i && not (has i "pk") then
                        let name = Py.take 60 (txt i)
                        let k = toJson [| box name; box (col i) |]
                        m.set(k, op i) |> ignore
                        names.set(k, name) |> ignore
                m, names
            let now, _ = opacities last
            let thenOp, thenNames = opacities before
            let holding = now.entries () |> Seq.filter (fun (_, v) -> v >= 0.9) |> Seq.length
            let nowGet k = if now.has k then now.get k else 0.0
            for k, v in thenOp.entries () do
                if v >= 0.95 && nowGet k < 0.6 && holding > 0 then
                    line $"  {Py.reprStr (thenNames.get k)} fades to {Py.fmtF 2 (nowGet k)} by {Py.fmtF 2 (t last)} while {holding} other item(s) hold"

    member r.timeline() =
        let rows = intervals.entries () |> List.ofSeq |> List.sortBy (fun (_, iv) -> iv.[0].[0])
        for k, iv in rows do
            let it = info.get k
            for ab in iv do
                let a, b = ab.[0], ab.[1]
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
