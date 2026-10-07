/// The frame of a long lesson video (port of the inline script that templates/long/clip.html used to carry).
/// Everything on screen is drawn by modules: a module owns the scenes whose ids start with its key
/// ("g1-vague" belongs to g1), lives in <key>.js next to clip.html (Kit.module("g1", K => ...)), and shows
/// only while its scenes play. The frame adds what every long video shares: a title card as each chapter
/// starts (the chapter is a "<key>-why" scene with "chapter": "Title" in script.json; its bridge line is
/// spoken over the card), a chapter label at the top, and a progress bar split into chapters. "intro" and
/// "outro" are modules too. The opening scene "title" has no module: the frame shows the course and lesson
/// from script.json's "card". A scene's "toasts" pop up in the band above the content, top right, on their
/// phrase; [think] silences and "recap" scenes are drawn by Kit.frameBreaks.
/// A video with a shared map (script.json "map", drawn by Map.fs) opens each chapter whose bridge scene has a "path"
/// on the map instead of the plain card: the chapter's number and title at the top, the map dim, and the parts and
/// edges of the path lighting up in order while the bridge line is spoken. A scene with "inside": "<part>" is drawn
/// inside that part: over the scene's lead the map returns and the part's box grows into a boundary around the
/// module's content, which holds for every consecutive scene inside the same part (a visit) and shrinks back to the
/// box at the visit's end.
module Frame

open Fable.Core
open Fable.Core.JsInterop
open Browser.Types
open Browser
open Interop
open Stage

type Chapter =
    { title: string
      /// the parts of the shared map this chapter's flow touches, in order (its bridge scene's "path"), or none
      path: string[]
      scenes: ResizeArray<Scene>
      mutable n: int
      mutable start: float
      mutable ``end``: float
      mutable talk: float }

type Run = { start: float; mutable ``end``: float }

/// Consecutive scenes inside the same part of the shared map.
type Visit =
    { part: string
      start: float
      ``end``: float
      /// the scene before it was a visit too, or the bridge of a chapter that opens on the map: the map is already up
      fromMap: bool
      /// the scene after it is a visit to another part: the map stays up
      toMap: bool
      /// it runs to the video's last frame: no zoom out, the video ends inside the part
      last: bool }

type Module =
    { key: string
      runs: ResizeArray<Run>
      mutable root: HTMLElement }

/// What Kit.module puts in window.CH[key].
type ModuleHooks =
    abstract render: t: float -> unit

let private prefix (id: string) = id.Split('-').[0]

[<Emit("fetch($0, { cache: \"no-store\" })")>]
let private fetchNoStore (_url: string) : JS.Promise<obj> = jsNative

[<Emit("new Function($0)()")>]
let private runScript (_code: string) : unit = jsNative

[<Emit("console.log($0)")>]
let private log (_msg: string) : unit = jsNative

let private message (e: exn) : string = e?message

let private ch () = globalGet<obj> "CH"
let private hooks (key: string) : ModuleHooks = get (ch ()) key

let run () =
    if not (truthy (ch ())) then globalSet "CH" (createEmpty<obj>)
    let T = timing

    // Chapters: a bridge scene ("k3-why", with "chapter": "Title") and everything up to the next bridge or the
    // outro. The card holds through the bridge; the chapter "talks" from its first content sentence.
    let CHAPTERS = ResizeArray<Chapter>()
    for s in T.scenes do
        if s.id.EndsWith "-why" then
            CHAPTERS.Add
                { title = jsOr s.chapter s.id
                  path = (if isArray (s?path) then s?path else [||])
                  scenes = ResizeArray [ s ]
                  n = 0
                  start = 0.0
                  ``end`` = 0.0
                  talk = 0.0 }
        elif CHAPTERS.Count > 0 && s.id <> "outro" && prefix s.id <> "outro" then
            CHAPTERS.[CHAPTERS.Count - 1].scenes.Add s
    CHAPTERS
    |> Seq.iteri (fun i c ->
        c.n <- i + 1
        c.start <- c.scenes.[0].start
        c.``end`` <- c.scenes.[c.scenes.Count - 1].``end``
        c.talk <-
            match c.scenes |> Seq.tryFind (fun s -> not (s.id.EndsWith "-why")) with
            | Some firstContent -> (get<Sentence> firstContent.sentences 0).start
            | None -> c.``end``)

    // Modules: every scene prefix except bridges. A module is on screen during each run of its consecutive
    // scenes, from just before its first sentence to the end of the run.
    let MODULES = table ()
    let mutable prev = null
    for s in T.scenes do
        if s.id.EndsWith "-why" || s.id = "title" || truthy s.recap then prev <- null
        else
            let k = prefix s.id
            if isNil (get<Module> MODULES k) then put MODULES k { key = k; runs = ResizeArray(); root = null }
            let m = get<Module> MODULES k
            let first = if truthy (at s.sentences 0) then s.sentences.[0].start else s.start
            if prev = k then m.runs.[m.runs.Count - 1].``end`` <- s.``end``
            else m.runs.Add { start = System.Math.Max(s.start, first - 0.45); ``end`` = s.``end`` }
            prev <- k
    let modules: Module[] = values MODULES

    // The shared map: a layer under the modules, inside #modules so that it is scaled with them when captions are
    // drawn into the picture. A definition the map cannot draw is reported and the plain chapter cards are shown.
    let MAP =
        match Map.definition () with
        | None -> None
        | Some def ->
            try
                let layer = document.createElement "div"
                layer.className <- "layer"
                layer.id <- "map"
                (query "#modules")?append (layer)
                let title = document.createElement "div"
                title.className <- "k-heading k-abs"
                title?style?cssText <- "left:60px;top:130px"
                layer?append (title)
                Some {| layer = layer; title = title; view = Map.build layer def |}
            with e ->
                let msg = message e
                log (if msg.StartsWith "map:" then msg else $"map: {msg}")
                (document.getElementById "map") |> Option.ofObj |> Option.iter (fun el -> el?remove ())
                None
    /// Does this chapter open on the map?
    let opensOnMap (c: Chapter) = MAP.IsSome && c.path.Length >= 2
    /// When each part and edge of a chapter's path lights up: part, edge, part, ... spread from the start of the
    /// bridge line to just before its end, and always done before the opener starts to fade.
    let pathTimes (c: Chapter) : float * float =
        let sentences = c.scenes.[0].sentences
        let t0 = if sentences.Length > 0 then sentences.[0].start else c.start
        let spoken = if sentences.Length > 0 then sentences.[sentences.Length - 1].``end`` else c.talk
        // The opener starts to fade 0.6 s before the chapter talks, a part takes 0.4 s to light, and the whole path
        // should be seen lit for a moment: so the last one starts 1.3 s before.
        t0, System.Math.Max(t0, System.Math.Min(System.Math.Max(spoken - 0.3, t0 + 0.8), c.talk - 1.3))
    // A progress video's chapter is a theme, not a flow: its path names the parts the theme touched, which need
    // not be joined by arrows. They light together as the bridge line starts, and no arrow lights.
    let themed: bool = string (T?kind) = "progress"
    let litAt (c: Chapter) (step: int) : float =
        let t0, t1 = pathTimes c
        lerp t0 t1 (float step / float (c.path.Length * 2 - 2))
    /// How lit a part is at t in chapter c: the path's parts light in order, the rest stay dim.
    let partLit (c: Chapter) (t: float) (id: string) : float =
        match c.path |> Array.tryFindIndex ((=) id) with
        | Some _ when themed -> clamp01 ((t - fst (pathTimes c)) / 0.4)
        | Some i -> clamp01 ((t - litAt c (i * 2)) / 0.4)
        | None -> 0.0
    let edgeLit (c: Chapter) (t: float) (a: string) (b: string) : float =
        let hop =
            c.path
            |> Array.pairwise
            |> Array.tryFindIndex (fun (x, y) -> (x = a && y = b) || (x = b && y = a))
        match hop with
        | Some _ when themed -> 0.0
        | Some i -> clamp01 ((t - litAt c (i * 2 + 1)) / 0.4)
        | None -> 0.0

    // Visits: maximal runs of consecutive scenes with the same "inside".
    // A scene whose "inside" does not name a part (check reports it) is drawn as an ordinary scene.
    let partIds = match Map.definition () with Some def -> def.parts |> Array.map (fun p -> p.id) | None -> [||]
    let insideOf (s: Scene) : string =
        let part: obj = s?inside
        if isNil part then ""
        elif jsTypeof part = "string" && Array.contains (unbox<string> part) partIds then unbox part
        else
            log $"map: scene {s.id} is inside {stringify part}, which is not a part of the map; drawn without a boundary"
            ""
    let INSIDE = T.scenes |> Array.map insideOf
    let VISITS =
        if MAP.IsNone then [||]
        else
            let found = ResizeArray<Visit>()
            let n = T.scenes.Length
            let mutable k = 0
            while k < n do
                let part = INSIDE.[k]
                if part = "" then k <- k + 1
                else
                    let mutable j = k
                    while j + 1 < n && INSIDE.[j + 1] = part do
                        j <- j + 1
                    let opened =
                        k > 0
                        && (INSIDE.[k - 1] <> ""
                            || (T.scenes.[k - 1].id.EndsWith "-why" && isArray (T.scenes.[k - 1]?path)))
                    found.Add
                        { part = part
                          start = T.scenes.[k].start
                          ``end`` = T.scenes.[j].``end``
                          fromMap = opened
                          toMap = j + 1 < n && INSIDE.[j + 1] <> ""
                          last = T.scenes.[j].``end`` >= T.duration - 0.05 }
                    k <- j + 1
            found.ToArray()
    /// How far the zoom into a visit's part has gone at t: in over its first ZOOM_IN seconds; back out over 0.7 s
    /// once the module's content has faded, done 0.5 s before the visit ends so the map is seen whole before the
    /// next scene; never out when the video ends there.
    let zoomOf (v: Visit) (t: float) : float =
        let zin = ease.inOut (clamp01 ((t - v.start) / Map.ZOOM_IN))
        let zout = if v.last then 0.0 else ease.inOut (clamp01 ((t - (v.``end`` - Map.ZOOM_OUT + 0.3)) / 0.7))
        zin * (1.0 - zout)
    /// How visible the map layer is during a visit: at once when the map is already up, else a short fade each way.
    let visitShown (v: Visit) (t: float) : float =
        let up = if v.fromMap then 1.0 else clamp01 ((t - v.start) / 0.3)
        let down = if v.last || v.toMap then 1.0 else 1.0 - clamp01 ((t - (v.``end`` - 0.3)) / 0.3)
        System.Math.Min(up, down)
    /// What a module's content is multiplied by during a visit: it waits for the zoom in, and leaves before the
    /// zoom out.
    /// Content that is on screen across the visit's start (not scoped to a scene) first fades out, over the same
    /// 0.3 s the map fades in.
    let contentShown (v: Visit) (t: float) : float =
        let before = if v.fromMap then 0.0 else 1.0 - clamp01 ((t - v.start) / 0.3)
        let up = clamp01 ((t - (v.start + Map.ZOOM_IN - 0.2)) / 0.4)
        let down = if v.last then 1.0 else 1.0 - clamp01 ((t - (v.``end`` - Map.ZOOM_OUT)) / 0.3)
        System.Math.Min(System.Math.Max(before, up), down)
    /// ... and after a visit that ends on an ordinary scene, content returns over 0.3 s instead of cutting in.
    let contentAfter (t: float) : float =
        match VISITS |> Array.tryFind (fun v -> not v.toMap && not v.last && t >= v.``end`` - 0.001 && t < v.``end`` + 0.3) with
        | Some v -> clamp01 ((t - v.``end``) / 0.3)
        | None -> 1.0

    for m in modules do
        let d = document.createElement "div"
        d.className <- "layer"
        d.id <- "mod-" + m.key
        (query "#modules")?append (d)
        m.root <- d

    // Captions drawn into the picture take the lowest band, and scenes are laid out down to y 1000. So with captions
    // on, the scenes are drawn a little smaller, from the top-left corner of their area: their left edge and the
    // heading stay where they are, and their bottom edge ends above the captions.
    if truthy (T?captions) then
        let modules = query "#modules"
        modules?style?transformOrigin <- "60px 120px"
        modules?style?transform <- "scale(0.86)"

    let bar = query "#bar"
    let SEG =
        CHAPTERS.ToArray()
        |> Array.map (fun _ ->
            let s = document.createElement "div"
            s.className <- "seg"
            s?append (document.createElement "i")
            bar?append (s)
            s.firstChild :?> HTMLElement)
    let OUTRO = T.scenes |> Array.tryFind (fun s -> prefix s.id = "outro")
    let TITLE = T.scenes |> Array.tryFind (fun s -> s.id = "title")
    if truthy T.card then
        (query "#tcCourse").textContent <- jsOr T.card.course ""
        (query "#tcLesson").textContent <- jsOr T.card.lesson ""
        (query "#tcSub").textContent <- jsOr T.card.sub ""

    // The thumbnail: players show a video's first frame before it plays, so frame 0 can be drawn as one (the title
    // moved up, a red border, a play button, the length). narrate puts the length in card.thumbnail when it is wanted.
    let thumbLabel: string = if truthy T.card && truthy (T.card?thumbnail) then string (T.card?thumbnail) else ""
    let THUMB =
        if thumbLabel = "" then None
        else
            let el = document.createElement "div"
            el.id <- "thumb"
            el?style?cssText <- "position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:50;display:none;pointer-events:none"
            el.innerHTML <-
                "<div style=\"position:absolute;left:0;top:0;right:0;bottom:0;border:18px solid #e5383b;box-sizing:border-box\"></div>"
                + "<div style=\"position:absolute;left:855px;top:560px;width:210px;height:210px;border-radius:50%;background:#e5383b;box-shadow:0 18px 60px #000a\">"
                + "<div style=\"position:absolute;left:78px;top:55px;border-style:solid;border-width:50px 0 50px 82px;border-color:transparent transparent transparent #fff\"></div></div>"
                + "<div id=\"thumbLen\" style=\"position:absolute;right:70px;bottom:60px;font-size:40px;font-weight:650;color:#fff;background:#000a;padding:8px 20px;border-radius:10px\"></div>"
            (query "#titleCard").parentElement?append (el)
            (el.querySelector "#thumbLen").textContent <- thumbLabel
            Some el

    // Each module file loads on its own: one that is missing or throws is reported and left blank, and the
    // rest still render (the renderer aborts on any uncaught page error).
    let TOASTS =
        try Some(Kit.frameToasts (query "#toasts"))
        with e ->
            log $"toasts: {message e}"
            None
    let BREAKS =
        try Some(Kit.frameBreaks (query "#toasts"))
        with e ->
            log $"breaks: {message e}"
            None

    let loadFile (m: Module) : JS.Promise<unit> =
        let failed (e: exn) = log $"module file {m.key}.js failed to load: {message e}"
        try
            fetchNoStore $"{m.key}.js"
            |> Promise.bind (fun res ->
                if not res?ok then
                    log $"module file {m.key}.js: not written yet ({res?status})"
                    Promise.lift ()
                else
                    res?text ()
                    |> Promise.map (fun (code: string) -> runScript (code + $"\n//# sourceURL={m.key}.js")))
            |> Promise.catch failed
        with e ->
            failed e
            Promise.lift ()
    let build () =
        for m in modules do
            if truthy (hooks m.key) then
                try
                    // A method call, as `CH[key].build?.(root)` was: a hand-written module may use `this`.
                    let h = hooks m.key
                    if not (isNil h?build) then h?build (m.root)
                with e ->
                    log $"module {m.key} build failed: {message e}"
                    put (ch ()) m.key null
    let loaded =
        (Promise.lift (), modules)
        ||> Array.fold (fun p m -> p |> Promise.bind (fun () -> loadFile m))
        |> Promise.map build

    let render (t: float) =
        // The opening title card: course, lesson, and one line on what the lesson is for.
        let withTitle = TITLE.IsSome && truthy T.card
        // No fade-in: the card is fully there on frame 0, because players show the first frame as the thumbnail.
        let tc = if withTitle then within t -1.0 (TITLE.Value.``end`` - 0.1) 0.4 else 0.0
        // Frame 0 only (frames are drawn a microsecond after their time): the title sits above the play button.
        let thumbOn = THUMB.IsSome && t < 0.02
        THUMB |> Option.iter (fun el -> el?style?display <- (if thumbOn then "block" else "none"))
        let titleCard = query "#titleCard"
        titleCard?style?justifyContent <- (if thumbOn then "flex-start" else "")
        titleCard?style?paddingTop <- (if thumbOn then "110px" else "")
        titleCard?style?boxSizing <- (if thumbOn then "border-box" else "")
        show titleCard tc 0.0 (if thumbOn then "" else $"scale({lerp 0.97 1.0 (progIO t 0.0 0.8)})")
        let lastSentence = if withTitle then at TITLE.Value.sentences (box -1) else Unchecked.defaultof<_>
        show (query "#tcSub") (if withTitle then progIO t (lastSentence.start - 0.2) 0.5 * tc else 0.0) 10.0 ""
        let mutable current = None
        for i in 0 .. CHAPTERS.Count - 1 do
            let c = CHAPTERS.[i]
            if t >= c.start - 0.001 && t < c.``end`` + 0.001 then current <- Some c
        // A chapter opens on its card, or on the shared map when its bridge scene has a path across it.
        let opening =
            match current with
            | Some c -> within t c.start (c.talk - 0.25) 0.35
            | None -> 0.0
        let onMap = match current with Some c -> opensOnMap c | None -> false
        let card = if onMap then 0.0 else opening
        let visit = VISITS |> Array.tryFind (fun v -> t >= v.start - 0.001 && (t < v.``end`` - 0.001 || v.last))
        MAP
        |> Option.iter (fun m ->
            let opener = if onMap then opening else 0.0
            let visiting = match visit with Some v -> visitShown v t | None -> 0.0
            show m.layer (System.Math.Max(opener, visiting)) 0.0 ""
            // The chapter's number and title belong to the opener: they leave as a zoom begins.
            let titled = match visit with Some v -> opener * (1.0 - clamp01 ((t - v.start) / 0.3)) | None -> opener
            show m.title titled 0.0 ""
            match current with
            | Some c when titled > 0.001 ->
                let html = $"<b style=\"color:var(--accent);margin-right:22px\">{c.n} / {CHAPTERS.Count}</b>{Draw.esc c.title}"
                if m.title?dataset?html <> html then
                    m.title?dataset?html <- html
                    m.title.innerHTML <- html
            | _ -> ()
            let lit, edge =
                match current with
                | Some c -> partLit c t, edgeLit c t
                | None -> (fun _ -> 0.0), (fun _ _ -> 0.0)
            match visit with
            | Some v -> m.view.draw { vis = (fun _ -> 1.0); lit = lit; edgeLit = edge; zoom = Some(v.part, zoomOf v t) }
            | None when opener > 0.001 -> m.view.draw { vis = (fun _ -> 1.0); lit = lit; edgeLit = edge; zoom = None }
            | None -> ())
        let content = match visit with Some v -> contentShown v t | None -> contentAfter t
        show (query "#card") card 0.0 $"scale({lerp 0.96 1.0 card})"
        current
        |> Option.iter (fun c ->
            (query "#cardNum").textContent <- $"{c.n} / {CHAPTERS.Count}"
            (query "#cardTitle").textContent <- c.title)
        for m in modules do
            let mutable p = 0.0
            // The last run holds to the final frame, so the video does not end on an empty stage.
            for i in 0 .. m.runs.Count - 1 do
                let r = m.runs.[i]
                p <- System.Math.Max(p, within t r.start (if r.``end`` >= T.duration - 0.05 then infinity else r.``end`` - 0.05) 0.4)
            let p = p * content
            m.root.style?opacity <- p
            m.root.style.visibility <- if p <= 0.001 then "hidden" else "visible"
            if p > 0.001 && truthy (hooks m.key) then
                try
                    (hooks m.key).render t
                with e ->
                    log $"module {m.key} render({toFixed t 2}) failed: {message e}"
        let lab = query "#label"
        show lab (match current with Some c -> within t (c.talk - 0.3) (c.``end`` - 0.1) 0.35 | None -> 0.0) 0.0 ""
        let html =
            match current with
            | Some c -> $"<b>{c.n} / {CHAPTERS.Count}</b>{c.title}"
            | None -> ""
        if lab?dataset?html <> html then
            lab?dataset?html <- html
            lab.innerHTML <- html
        CHAPTERS |> Seq.iteri (fun i c -> SEG.[i].style.transform <- $"scaleX({clamp01 ((t - c.start) / (c.``end`` - c.start))})")
        bar.style?opacity <-
            if CHAPTERS.Count > 0 then
                within t (CHAPTERS.[0].start - 0.3) (match OUTRO with Some o -> o.start + 0.2 | None -> infinity) 0.4
            else 0.0
        TOASTS |> Option.iter (fun x -> x.render t)
        BREAKS |> Option.iter (fun x -> x.render t)

    // The renderer awaits window.ready right after load, so it must exist now; Stage.play replaces it with its
    // own promise, which this one resolves to.
    globalSet
        "ready"
        (loaded
         |> Promise.bind (fun () ->
             play render
             globalGet<JS.Promise<bool>> "ready"))
