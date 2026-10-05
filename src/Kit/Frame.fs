/// The frame of a long lesson video (port of the inline script that templates/long/clip.html used to carry).
/// Everything on screen is drawn by modules: a module owns the scenes whose ids start with its key
/// ("g1-vague" belongs to g1), lives in <key>.js next to clip.html (Kit.module("g1", K => ...)), and shows
/// only while its scenes play. The frame adds what every long video shares: a title card as each chapter
/// starts (the chapter is a "<key>-why" scene with "chapter": "Title" in script.json; its bridge line is
/// spoken over the card), a chapter label at the top, and a progress bar split into chapters. "intro" and
/// "outro" are modules too. The opening scene "title" has no module: the frame shows the course and lesson
/// from script.json's "card". A scene's "toasts" pop up in the band above the content, top right, on their
/// phrase; [think] silences and "recap" scenes are drawn by Kit.frameBreaks.
module Frame

open Fable.Core
open Fable.Core.JsInterop
open Browser.Types
open Browser
open Interop
open Stage

type Chapter =
    { title: string
      scenes: ResizeArray<Scene>
      mutable n: int
      mutable start: float
      mutable ``end``: float
      mutable talk: float }

type Run = { start: float; mutable ``end``: float }

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
        let card =
            match current with
            | Some c -> within t c.start (c.talk - 0.25) 0.35
            | None -> 0.0
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
