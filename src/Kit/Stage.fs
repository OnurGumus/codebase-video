/// Timeline runtime for lesson animations (port of engine/stage.js): window.Stage. A clip page loads
/// build/timing.js (written by the narrate step), then engine/web/Main.js, which installs this as window.Stage.
///
/// render(t) must draw the whole frame from t alone: the renderer seeks to arbitrary times,
/// in parallel pages, out of order. So no CSS transitions or animations, no timers, no
/// Date.now(), no requestAnimationFrame, and no state carried from one call to the next.
///
/// Timing comes from the narration, not from constants: Stage.cue("scene", i) is the moment
/// sentence i of that scene starts being spoken, so a re-voiced line moves its visuals with it.
module Stage

open Fable.Core
open Fable.Core.JsInterop
open Browser.Types
open Browser
open Interop

// ── The timing the narrate step writes (build/timing.js sets window.TIMING) ─────────────────────────────

/// A voice part of a sentence (a {fr:...} phrase or the narration around it), timed exactly.
type Part =
    abstract text: string
    abstract spoken: string
    abstract start: float
    abstract ``end``: float

type Sentence =
    inherit Part
    abstract parts: Part[]

type Break =
    abstract kind: string
    abstract start: float
    abstract ``end``: float

/// A toast placed on a scene in script.json: { kind, at, text, dur }.
type ToastSpec =
    abstract kind: string
    abstract at: string
    abstract text: string
    abstract dur: float option

type Scene =
    abstract id: string
    abstract start: float
    abstract ``end``: float
    abstract sentences: Sentence[]
    abstract chapter: string
    abstract recap: string[]
    abstract toasts: ToastSpec[]
    abstract breaks: Break[]

type Card =
    abstract course: string
    abstract lesson: string
    abstract sub: string

type Timing =
    abstract scenes: Scene[]
    abstract duration: float
    abstract voiced: bool
    abstract card: Card

/// A time spec (see time): seconds, "scene", "scene#2", "scene|word", or [spec, offset].
type Spec = obj

/// An easing curve: 0..1 progress in, eased 0..1 out.
type Easing = float -> float

type Ease =
    { linear: Easing
      out: Easing
      ``in``: Easing
      inOut: Easing
      back: Easing }

// ── Pure helpers ─────────────────────────────────────────────────────────────────────────────────────────

let clamp (v: float) (a: float) (b: float) = System.Math.Min(b, System.Math.Max(a, v))
let clamp01 v = clamp v 0.0 1.0
let lerp (a: float) (b: float) (p: float) = a + (b - a) * p

let ease =
    { linear = fun p -> p
      out = fun p -> 1.0 - (1.0 - p) ** 3.0
      ``in`` = fun p -> p * p * p
      inOut = fun p -> if p < 0.5 then 4.0 * p * p * p else 1.0 - (-2.0 * p + 2.0) ** 3.0 / 2.0
      back =
        fun p ->
            let c = 1.70158
            1.0 + (c + 1.0) * (p - 1.0) ** 3.0 + c * (p - 1.0) ** 2.0 }

/// Eased 0..1 progress of a move that starts at t0 and lasts dur seconds.
let prog (t: float) (t0: float) (dur: float) (e: Easing) = e (clamp01 ((t - t0) / dur))

/// prog with the default curve, ease.inOut.
let progIO t t0 dur = prog t t0 dur ease.inOut

/// 0..1 visibility: fades in at t0, out at t1 (t1 = Infinity: stays).
let within (t: float) (t0: float) (t1: float) (fade: float) =
    let up = clamp01 ((t - t0) / fade)
    let down = if t1 = infinity then 1.0 else clamp01 ((t1 - t) / fade)
    System.Math.Min(up, down)

/// Set opacity plus an optional rise: show el p 0 "" fades in; show el p 24 "" also slides up 24px.
let show (el: HTMLElement) (p: float) (rise: float) (extra: string) =
    el.style?opacity <- p
    el.style.visibility <- if p <= 0.001 then "hidden" else "visible"
    el.style.transform <- $"translateY({(1.0 - p) * rise}px) {extra}".Trim()

/// Reveal an SVG path by length: draw(path, p).
let draw (path: Element) (p: float) =
    let len: float = path?getTotalLength ()
    path?style?strokeDasharray <- $"{len}"
    path?style?strokeDashoffset <- $"{len * (1.0 - clamp01 p)}"

/// Characters of text typed out by p.
let typed (text: string) (p: float) : string = text?slice (0, round (float text.Length * clamp01 p))

let query (sel: string) : HTMLElement =
    let el = document.querySelector sel
    if isNull el then fail $"no element {sel}"
    el :?> HTMLElement

// ── Lookups in the timing ────────────────────────────────────────────────────────────────────────────────

let timing: Timing =
    let t = globalGet<Timing> "TIMING"
    if not (truthy t) then fail "build/timing.js is missing - run: node engine/cli/Cv.js <clip> narrate"
    t

let private byId: obj =
    let o = table ()
    for s in timing.scenes do put o s.id s
    o

let scene (id: string) : Scene =
    let s = get<Scene> byId id
    if not (truthy s) then
        let have = keys byId |> String.concat ", "
        fail $"no scene \"{id}\" in script.json (have: {have})"
    s

/// Start of sentence i in scene id; i may be negative to count from the end.
let cue (id: string) (i: float) : float =
    let s = (scene id).sentences
    let k = if i < 0.0 then float s.Length + i else i
    let sentence = get<Sentence> s k
    if not (truthy sentence) then fail $"scene \"{id}\" has {s.Length} sentence(s), asked for {jsStr i}"
    sentence.start

/// Start of part k of sentence i: a {fr:...} phrase or the narration around it.
let part (id: string) (i: obj) (k: obj) : float =
    let s = at (scene id).sentences i
    let p = if truthy s && truthy s.parts then at s.parts k else unbox null
    if not (truthy p) then fail $"scene \"{id}\" sentence {jsStr i} has no part {jsStr k}"
    p.start

// ── Word timing ──────────────────────────────────────────────────────────────────────────────────────────
// Kokoro gives no word timestamps, so a word's time is interpolated inside its sentence (or inside its
// voice part, which is timed exactly) by characters of what is HEARD: "86,400" is read "eighty-six
// thousand four hundred", so it is found and weighted as spoken. Punctuation adds a little, because the
// voice pauses there.
let private pause (c: char) =
    match c with
    | ',' -> 4.0
    | ';' | ':' | '—' | '–' -> 6.0
    | '.' | '?' | '!' -> 8.0
    | _ -> 0.0

let private weight (text: string) (upto: int) =
    let mutable w = 0.0
    for k in 0 .. upto - 1 do
        w <- w + 1.0 + pause text.[k]
    w

let private heardOf (u: Part) = ifNil (ifNil u.spoken u.text) ""

/// Where a phrase falls in one voice unit (a sentence or one of its parts): the occurrences of `want` in
/// order, each with its time.
let private occurrences (field: string) (want: string) (atEnd: bool) (u: Part) =
    let text = if field = "spoken" then heardOf u else jsOr u.text ""
    let low: string = text?toLowerCase ()
    let total = jsOr (weight text text.Length) 1.0
    let timeAt pos =
        let idx = if atEnd then pos + want.Length else pos
        lerp u.start u.``end`` (weight text idx / total)
    Seq.unfold
        (fun from ->
            let pos: int = low?indexOf (want, from)
            if pos >= 0 then Some(pos, pos + 1) else None)
        0
    |> Seq.map timeAt

/// When a phrase is spoken, in seconds.
///   word("g1-signals", "five signals")             first occurrence anywhere in the scene
///   word("g1-signals", "thirty", { sentence: 1 })  only in sentence 1
///   word(id, "the", { nth: 2 })                    the second occurrence
///   word(id, "gigabits", { end: true })            when the phrase finishes
/// Matching is case-insensitive, on the spoken text first and the caption text second. Throws when the
/// phrase is not there, so a re-worded line fails loudly instead of drifting.
let word (id: string) (needle: obj) (sentence: obj) (nth: float) (atEnd: bool) : float =
    let sc = scene id
    let want: string = (jsStr needle)?toLowerCase ()
    let picked =
        if isNil sentence then sc.sentences
        else [| at sc.sentences sentence |] |> Array.filter truthy
    let units (s: Sentence) : Part[] =
        if truthy s.parts && s.parts.Length > 1 then s.parts else [| s |]
    let found =
        [ "spoken"; "text" ]
        |> Seq.tryPick (fun field ->
            // The count runs across the scene's sentences; `++count < nth` skips until the nth one.
            picked
            |> Seq.collect units
            |> Seq.collect (occurrences field want atEnd)
            |> Seq.indexed
            |> Seq.tryFind (fun (n, _) -> not (float (n + 1) < nth))
            |> Option.map snd)
    match found with
    | Some t -> t
    | None ->
        let where = if isNil sentence then "" else $" sentence {jsStr sentence}"
        fail $"\"{jsStr needle}\" is not spoken in scene \"{id}\"{where}"

/// A time from a compact spec, for the kit and for modules:
///   12.5              seconds
///   "g1-vague"        the scene's first sentence
///   "g1-vague#2"      sentence 2
///   "g1-vague|drive"  the word "drive" (| and nth: "g1-vague|the|2"; end of phrase: "g1-vague|drive$")
///   ["g1-vague|drive", 0.3]   plus an offset in seconds
let rec time (spec: Spec) : float =
    if isNumber spec then unbox spec
    elif isArray spec then
        let a: obj[] = unbox spec
        time (get<obj> a 0) + jsOr (get<float> a 1) 0.0
    else
        let s = jsStr spec
        if s.Contains "|" then
            let bits: string[] = s?split ("|")
            let phrase = bits.[1]
            let n = get<string> bits 2
            let atEnd: bool = phrase?endsWith ("$")
            word bits.[0] (if atEnd then phrase?slice (0, -1) else phrase) null (if truthy n then toNumber n else 1.0) atEnd
        else
            let bits: string[] = s?split ("#")
            let i = get<string> bits 1
            cue bits.[0] (if truthy i then toNumber i else 0.0)

// ── Captions and playback ────────────────────────────────────────────────────────────────────────────────

/// Burned-in captions from the narration. Silent clips need them; narrated ones may opt in.
let mutable private captionsOn = not timing.voiced || truthy (timing?captions)

let setCaptions (on: bool) = captionsOn <- on

let private captions (t: float) =
    let box =
        match document.getElementById "captions" with
        | null ->
            let b = document.createElement "div"
            b.id <- "captions"
            document.getElementById("stage")?append (b)
            b
        | b -> b
    let mutable text = ""
    if captionsOn then
        for s in timing.scenes do
            for c in s.sentences do
                if t >= c.start && t < c.``end`` + 0.25 then text <- c.text
    if box?dataset?text <> text then
        box?dataset?text <- text
        box.innerHTML <- ""
        if truthy text then
            let span = document.createElement "span"
            span.textContent <- text
            box?append (span)

[<Emit("new Audio($0)")>]
let private audio (_src: string) : obj = jsNative

[<Emit("new URLSearchParams(location.search)")>]
let private searchParams () : obj = jsNative

[<Emit("performance.now()")>]
let private now () : float = jsNative

[<Emit("requestAnimationFrame($0)")>]
let private requestFrame (_f: float -> unit) : unit = jsNative

// ── Presenting: ?present ─────────────────────────────────────────────────────────────────────────────────
// The video as a click-through deck, for someone who gives it in their own voice: a step per sentence (the
// steps of src/Shared/Steps.fs, the same the `present` step makes slides of). A step plays from where the last
// one held to a moment just after its sentence, then holds, so every transition between sentences plays and
// each hold shows what its sentence said. Unlike render(t), the deck runs on the real clock.

/// What the presenter can ask for.
type private Command =
    | Next
    | Back
    | First
    | Last
    | Replay
    | ToggleNotes
    | SpeakerNotes
    | FullScreen

/// The command a key asks for: arrows, space and Enter, and the Page keys a presentation clicker sends.
let private (|Command|_|) (key: string) : Command option =
    match key with
    | "ArrowRight" | "ArrowDown" | "PageDown" | " " | "Enter" -> Some Next
    | "ArrowLeft" | "ArrowUp" | "PageUp" | "Backspace" -> Some Back
    | "Home" -> Some First
    | "End" -> Some Last
    | "r" | "R" -> Some Replay
    | "n" | "N" -> Some ToggleNotes
    | "s" | "S" -> Some SpeakerNotes
    | "f" | "F" -> Some FullScreen
    | _ -> None

let private KEYS = "→ space or click: next · ←: back · R: replay · S: speaker notes · N: notes on the slide · F: full screen"

/// A step being played: video time From to Until, from clock time Began (ms).
type private Playback = { From: float; Until: float; Began: float }

type private Deck =
    { /// the step on screen; -1: the opening frame, before anything has played
      Current: int
      Playing: Playback option
      /// the notes shown on the slide (N)
      Overlay: bool
      /// the speaker-notes window (S)
      Notes: obj option }

type private Msg =
    | Do of Command
    /// an animation frame of this playback; one of an earlier playback is ignored
    | Tick of Playback

/// The deck after a command (FullScreen and SpeakerNotes act on the page, outside the state).
let private command (steps: Steps.Step[]) (clock: float) (deck: Deck) (c: Command) : Deck =
    let play i =
        { deck with
            Current = i
            Playing = Some { From = (if i = 0 then 0.0 else steps.[i - 1].Hold); Until = steps.[i].Hold; Began = clock } }
    let holdAt i = { deck with Current = i; Playing = None }
    match c with
    | Next when deck.Playing.IsSome -> holdAt deck.Current
    | Next when deck.Current + 1 < steps.Length -> play (deck.Current + 1)
    | Back when deck.Current >= 0 -> holdAt (deck.Current - 1)
    | First -> holdAt -1
    | Last -> holdAt (steps.Length - 1)
    | Replay when deck.Current >= 0 -> play deck.Current
    | ToggleNotes -> { deck with Overlay = not deck.Overlay }
    | _ -> deck

/// Where the video is in a playback at clock time `clock`; None once it has reached its hold.
let private playhead (p: Playback) (clock: float) : float option =
    let t = p.From + (clock - p.Began) / 1000.0
    if t < p.Until then Some t else None

/// What the notes say: where we are, the sentence to say now, and the next one.
let private notesOf (steps: Steps.Step[]) (deck: Deck) : string * string * string =
    let say i =
        if i >= steps.Length then "(the end)"
        elif steps.[i].Text = "" then "(no narration)"
        else steps.[i].Text
    match deck.Current with
    | -1 -> $"{steps.Length} steps", "Press → or click to start.", say 0
    | i ->
        let chapter = steps.[i].Chapter |> Option.map ((+) " · ") |> Option.defaultValue ""
        $"Step {i + 1} of {steps.Length}{chapter}", say i, say (i + 1)

[<Emit("window.open($0, $1, $2)")>]
let private openWindow (_url: string) (_name: string) (_features: string) : obj = jsNative

let private NOTES_PAGE =
    "<style>body{margin:0;padding:28px 36px;background:#0f1420;color:#eef1f7;font:22px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}"
    + "#pos{color:#8ab8ff;font-weight:700;font-size:18px;letter-spacing:.04em}#now{font-size:40px;font-weight:600;margin:18px 0 26px;line-height:1.3}"
    + "#next{color:#a9b3c6;font-size:26px}#next:before{content:'Next: ';color:#5d6a82}#keys{position:fixed;bottom:16px;color:#5d6a82;font-size:16px}</style>"
    + $"""<div id="pos"></div><div id="now"></div><div id="next"></div><div id="keys">{KEYS}</div>"""

let private isOpen (w: obj option) = w |> Option.exists (fun w -> not (w?closed))

/// Calls `post` with the command of each key pressed in a document.
let private listenForKeys (target: obj) (post: Command -> unit) =
    target?addEventListener ("keydown", (fun (e: KeyboardEvent) ->
        match e.key with
        | Command c ->
            e.preventDefault ()
            post c
        | _ -> ()))

/// The speaker-notes window, opened (or brought forward) for a second screen; its keys work too.
let private speakerNotes (current: obj option) (post: Command -> unit) : obj option =
    if isOpen current then
        current |> Option.iter (fun w -> w?focus ())
        current
    else
        match openWindow "" "cv-notes" "width=1000,height=600" with
        | null -> None // blocked
        | w ->
            w?document?title <- "Speaker notes"
            w?document?body?innerHTML <- NOTES_PAGE
            listenForKeys w?document post
            Some w

let private toggleFullScreen () =
    if truthy document?fullscreenElement then document?exitFullscreen () |> ignore
    else document.documentElement?requestFullscreen () |> ignore

/// Fits the 1920 x 1080 stage to the window, now and on every resize.
let private fitToWindow () =
    let stage = document.getElementById "stage"
    for el in [ document.documentElement; document.body ] do
        el.style.width <- "100vw"
        el.style.height <- "100vh"
    document.body.style.background <- "#000"
    stage?style?transformOrigin <- "0 0"
    let fit () =
        let w, h = window.innerWidth, window.innerHeight
        let s = System.Math.Min(w / 1920.0, h / 1080.0)
        stage?style?transform <- $"translate({(w - 1920.0 * s) / 2.0}px, {(h - 1080.0 * s) / 2.0}px) scale({s})"
    fit ()
    window.addEventListener ("resize", (fun _ -> fit ()))

/// The notes on the slide (N), for rehearsing on one screen.
let private overlayBox () : HTMLElement =
    let box = document.createElement "div"
    box?style?cssText <-
        "position:fixed;left:0;right:0;bottom:0;padding:14px 28px;background:#000c;color:#eef1f7;"
        + "font:26px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;white-space:pre-line"
    document.body.appendChild box |> ignore
    box

/// The timing's scenes as the records Steps cuts.
let private stepScenes () : Steps.Scene list =
    [ for sc in timing.scenes ->
          { Steps.Scene.Ends = sc.``end``
            Chapter = if truthy sc.chapter then Some sc.chapter else None
            Sentences =
              [ for s in (if truthy sc.sentences then sc.sentences else [||]) ->
                    ({ Start = s.start; End = s.``end``; Text = s.text }: Steps.Sentence) ]
            Breaks = [] } ]

/// Plays the clip as a deck. One agent owns the deck's state: keys, clicks and animation frames are messages to it,
/// so they are handled one at a time, in order.
let private present (frame: float -> unit) =
    let steps = Steps.cut timing.duration (stepScenes ()) |> List.toArray
    setCaptions false
    document.title <- "presenting - " + document.title
    fitToWindow ()
    let overlay = overlayBox ()

    /// Puts a deck on screen: the frame when it holds, and the notes.
    let show (deck: Deck) =
        if deck.Playing.IsNone then frame (if deck.Current < 0 then 0.0 else steps.[deck.Current].Hold)
        let pos, now, next = notesOf steps deck
        overlay?style?display <- if deck.Current < 0 || deck.Overlay then "block" else "none"
        overlay.textContent <- if deck.Current < 0 then $"{now}\n{KEYS}" else $"{now}\nNext: {next}"
        if isOpen deck.Notes then
            let d = deck.Notes.Value?document
            d?getElementById("pos")?textContent <- pos
            d?getElementById("now")?textContent <- now
            d?getElementById("next")?textContent <- next

    let agent =
        MailboxProcessor.Start(fun inbox ->
            let post c = inbox.Post(Do c)
            let tickLater p = requestFrame (fun _ -> inbox.Post(Tick p))
            /// Draws the playback's next frame, or ends it at its hold.
            let advance (p: Playback) (deck: Deck) =
                match playhead p (now ()) with
                | Some t ->
                    frame t
                    tickLater p
                    deck
                | None -> { deck with Playing = None }
            let rec loop (deck: Deck) =
                async {
                    let! msg = inbox.Receive()
                    let next =
                        match msg with
                        | Do FullScreen ->
                            toggleFullScreen ()
                            deck
                        | Do SpeakerNotes -> { deck with Notes = speakerNotes deck.Notes post }
                        | Do c -> command steps (now ()) deck c
                        | Tick p when deck.Playing = Some p -> advance p deck
                        | Tick _ -> deck
                    match msg, next.Playing with
                    | Do _, Some p when next.Playing <> deck.Playing -> tickLater p // a playback starts
                    | _ -> ()
                    if next <> deck then show next
                    return! loop next
                }
            let start = { Current = -1; Playing = None; Overlay = false; Notes = None }
            show start
            loop start)

    listenForKeys (box document) (fun c -> agent.Post(Do c))
    document.body.addEventListener ("click", (fun _ -> agent.Post(Do Next)))

/// Installs the frame: window.DURATION, window.render (render plus captions) and window.ready, which the
/// renderer awaits right after load.
let play (render: float -> unit) =
    let frame (t: float) =
        render t
        captions t
    globalSet "DURATION" timing.duration
    globalSet "render" frame
    let ready: JS.Promise<bool> =
        document?fonts?ready?``then`` (fun () ->
            frame 0.0
            true)
    globalSet "ready" ready

    // ?preview plays the clip in real time with its narration, for a look before rendering.
    // ?t=12.5 freezes on one moment.
    // ?present plays it as a click-through deck (see present).
    let q = searchParams ()
    if q?has ("t") then ready?``then`` (fun () -> frame (toNumber (q?get ("t")))) |> ignore
    if q?has ("present") then ready?``then`` (fun () -> present frame) |> ignore
    elif q?has ("preview") then
        ready?``then`` (fun () ->
            let a = audio "build/narration.wav"
            let start () =
                a?play()?catch (fun () -> ()) |> ignore
                let t0 = now ()
                let rec tick (_: float) =
                    let t = if timing.voiced then a?currentTime else (now () - t0) / 1000.0
                    frame (System.Math.Min(t, timing.duration))
                    if t < timing.duration then requestFrame tick
                tick 0.0
            document.body.addEventListener ("click", (fun _ -> start ()), (!!{| once = true |}: AddEventListenerOptions))
            document.title <- "click to play - " + document.title)
        |> ignore

// ── window.Stage: the JS API modules call ────────────────────────────────────────────────────────────────

/// Options of Stage.word(): { sentence = null, nth = 1, end = false }.
type WordOpts =
    abstract sentence: obj
    abstract nth: float
    abstract ``end``: bool

/// window.Stage. Arguments left out take the JS defaults of the original (a default applies to undefined,
/// not to null), so modules see exactly the same API.
type IStage =
    abstract timing: Timing
    abstract scene: id: string -> Scene
    abstract cue: id: string * ?i: float -> float
    abstract part: id: string * i: obj * ?k: obj -> float
    abstract word: id: string * needle: obj * ?opts: WordOpts -> float
    abstract time: spec: Spec -> float
    abstract prog: t: float * t0: float * ?dur: float * ?e: Easing -> float
    abstract within: t: float * t0: float * ?t1: float * ?fade: float -> float
    abstract lerp: a: float * b: float * p: float -> float
    abstract clamp: v: float * ?a: float * ?b: float -> float
    abstract ease: Ease
    abstract ``$``: sel: string -> HTMLElement
    abstract show: el: HTMLElement * p: float * ?rise: float * ?extra: string -> unit
    abstract draw: path: Element * p: float -> unit
    abstract typed: text: string * p: float -> string
    abstract play: render: (float -> unit) -> unit
    abstract captions: on: bool -> unit

/// The JS default of an optional argument: `d` when the caller left it out (undefined).
let inline private dflt (x: 'a option) (d: 'a) : 'a = orUndef (unbox<'a> x) d

let api: IStage =
    { new IStage with
        member _.timing = timing
        member _.scene id = scene id
        member _.cue(id, i) = cue id (dflt i 0.0)
        member _.part(id, i, k) = part id i (dflt k (box 0))
        member _.word(id, needle, opts) =
            let o = dflt opts (createEmpty<WordOpts>)
            word id needle (orUndef o.sentence null) (orUndef o.nth 1.0) (orUndef o.``end`` false)
        member _.time spec = time spec
        member _.prog(t, t0, dur, e) = prog t t0 (dflt dur 0.6) (dflt e ease.inOut)
        member _.within(t, t0, t1, fade) = within t t0 (dflt t1 infinity) (dflt fade 0.35)
        member _.lerp(a, b, p) = lerp a b p
        member _.clamp(v, a, b) = clamp v (dflt a 0.0) (dflt b 1.0)
        member _.ease = ease
        member _.``$`` sel = query sel
        member _.show(el, p, rise, extra) = show el p (dflt rise 0.0) (dflt extra "")
        member _.draw(path, p) = draw path p
        member _.typed(text, p) = typed text p
        member _.play render = play render
        member _.captions on = setCaptions on }
