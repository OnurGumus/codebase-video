/// The presenter export: node engine/cli/Cv.js <ws> present [--serve]
/// For someone who gives the video in their own voice, in files most tools open. Writes <ws>/out/:
///   <name>.pptx         one slide per sentence: the picture once the sentence has been said, the sentence as the
///                       slide's speaker note, the chapters as sections (PowerPoint, Keynote, Google Slides, LibreOffice)
///   <name>.script.md    the narration to read aloud: the chapters, each sentence with its slide and its time in the
///                       video, and the pauses
///   <name>.srt          the narration as subtitles, one per sentence, for a video editor
///   <name>.silent.mp4   the video without its sound, to record a voice over (only when out/<name>.mp4 exists)
/// --serve then serves the click-through deck, clip.html?present (src/Kit/Stage.fs), until Ctrl+C.
/// The slides are the steps of src/Shared/Steps.fs, the same the deck plays.
module Present

open Fable.Core
open Fable.Core.JsInterop
open FsToolkit.ErrorHandling
open Node
open Steps

// Reading the timing ---------------------------------------------------------------------------------------------

let private items (o: obj) : obj list = if isNull o then [] else List.ofArray (unbox<obj[]> o)

/// build/timing.json's scenes as the records Steps cuts.
let private scenesOf (timing: obj) : Scene list =
    [ for sc in items timing?scenes ->
          { Ends = sc?``end``
            Chapter = if Narrate.Py.truthy sc?chapter then Some(Narrate.Py.str sc?chapter) else None
            Sentences = [ for s in items sc?sentences -> { Start = s?start; End = s?``end``; Text = s?text } ]
            Breaks =
              [ for b in items sc?breaks ->
                    { Sentence = b?sentence; Kind = b?kind; Seconds = (b?``end``: float) - (b?start: float) } ] } ]

// The files ------------------------------------------------------------------------------------------------------

let private chapterName = Option.defaultValue "Introduction"

/// Consecutive runs of items with the same key, in order: the chapters of a list of steps.
let private runs (key: 'a -> 'k) (items: 'a list) : ('k * 'a list) list when 'k: equality =
    List.foldBack
        (fun x acc ->
            match acc with
            | (k, xs) :: rest when k = key x -> (k, x :: xs) :: rest
            | _ -> (key x, [ x ]) :: acc)
        items
        []

let private minutes (t: float) =
    let s = int (floor t)
    $"""{s / 60}:{(string (s % 60)).PadLeft(2, '0')}"""

let private srtStamp (t: float) =
    let ms = Narrate.Py.roundInt (t * 1000.0)
    let two (n: int) = (string n).PadLeft(2, '0')
    $"{two (ms / 3600000)}:{two (ms / 60000 % 60)}:{two (ms / 1000 % 60)},{(string (ms % 1000)).PadLeft(3, '0')}"

/// The narration to read aloud, a sentence a line with its slide number and its time in the video.
let private script (title: string) (steps: Step list) : string =
    let pauses (s: Step) =
        match s.Pauses with
        | [] -> ""
        | ps ->
            let said = ps |> List.map (fun (kind, seconds) -> $"{kind} {string (Narrate.Py.round seconds 1)} s")
            $""" *({String.concat ", " said})*"""
    [ yield $"# {title}"
      yield ""
      yield "The narration, one sentence a line: its slide in the deck, then the time it starts in the video. Pauses are where the video waits."
      for chapter, lines in steps |> List.indexed |> List.filter (fun (_, s) -> s.Text <> "") |> runs (fun (_, s) -> s.Chapter) do
          yield ""
          yield $"## {chapterName chapter}"
          yield ""
          for n, s in lines -> $"**{n + 1}** `{minutes s.Start}` {s.Text}{pauses s}  " ]
    |> String.concat "\n"
    |> fun text -> text + "\n"

/// The narration as SubRip subtitles: a cue per sentence.
let private srt (scenes: Scene list) : string =
    scenes
    |> List.collect (fun sc -> sc.Sentences)
    |> List.mapi (fun i s -> $"{i + 1}\n{srtStamp s.Start} --> {srtStamp s.End}\n{s.Text}\n")
    |> String.concat "\n"

/// The video without its sound, copied from out/<name>.mp4 when that is newer; Error says why there is none.
let private silent (ws: string) (name: string) : Result<string, string> =
    let mp4 = join [ ws; "out"; $"{name}.mp4" ]
    let out = join [ ws; "out"; $"{name}.silent.mp4" ]
    if not (exists mp4) then Error $"no {name}.mp4 in out/ yet, so no silent copy: run the video step first"
    elif exists out && mtime out >= mtime mp4 then Ok out
    elif run "ffmpeg" [ "-hide_banner"; "-loglevel"; "error"; "-y"; "-i"; mp4; "-map"; "0:v"; "-c"; "copy"; "-movflags"; "+faststart"; out ] = 0 then Ok out
    else Error "ffmpeg could not copy the video without its sound"

/// The deck: a slide per step, its picture filling the slide and its sentence as the speaker note; a section per
/// chapter, so the slide sorter shows the chapters.
let private pptx (title: string) (slides: (string * Step) list) (out: string) : Async<unit> =
    let lib: obj = requireFromHome "pptxgenjs"
    let deck: obj = createNew (if isNull lib?``default`` then lib else lib?``default``) ()
    deck?layout <- "LAYOUT_16x9" // 10 x 5.625 inches, the frame's 16:9
    deck?title <- title
    for chapter, inChapter in slides |> runs (fun (_, s) -> s.Chapter) do
        let section = chapterName chapter
        deck?addSection (createObj [ "title" ==> section ]) |> ignore
        for file, step in inChapter do
            let slide: obj = deck?addSlide (createObj [ "sectionTitle" ==> section ])
            slide?background <- createObj [ "color" ==> "0F1420" ]
            slide?addImage (createObj [ "path" ==> file; "x" ==> 0; "y" ==> 0; "w" ==> 10; "h" ==> 5.625 ]) |> ignore
            if step.Text <> "" then slide?addNotes (step.Text) |> ignore
    let saved: JS.Promise<obj> = Render.awaitJs (deck?writeFile (createObj [ "fileName" ==> out ]))
    saved |> Async.AwaitPromise |> Async.Ignore

// The step --------------------------------------------------------------------------------------------------------

/// Why the export stopped short of the deck.
type private Failure =
    /// the slide pictures could not be drawn; the renderer has said why
    | RenderFailed of exitCode: int
    /// a tool home set up before pptxgenjs was added
    | SlideWriterMissing

let private exitCode (name: string) (failure: Failure) : int =
    match failure with
    | RenderFailed code -> code
    | SlideWriterMissing ->
        let cv = join [ engineDir; "cli"; "Cv.js" ]
        eprint $"no {name}.pptx: the slide writer is not installed yet. Run: node {cv} setup"
        2

let private slideWriter () : Result<unit, Failure> =
    if Narrate.packageInstalled "pptxgenjs" then Ok() else Error SlideWriterMissing

/// Draws each slide's picture at its step's hold.
let private shoot (ws: string) (slides: (string * Step) list) : Async<Result<unit, Failure>> =
    Render.shots ws [ for file, s in slides -> s.Hold, file ]
    |> Async.AwaitPromise
    |> Async.map (function
        | 0 -> Ok()
        | code -> Error(RenderFailed code))

/// Serves the click-through deck until Ctrl+C: never returns.
let private serve (ws: string) : Async<unit> =
    async {
        let! server = Render.startServer ws Render.ForRender |> Async.AwaitPromise
        JS.console.log $"{server.Url}?present   click-through deck: → or click next, ← back, S speaker notes, N notes on the slide, F full screen"
        JS.console.log "Ctrl+C to stop."
        return! Async.FromContinuations(fun _ -> ())
    }

let private written (file: string) : unit = JS.console.log file

let run (ws: string) (args: string list) : JS.Promise<int> =
    let ws = resolve ws
    let timing = readJson (join [ ws; "build"; "timing.json" ])
    let name: string = timing?name
    let title: string = if isNull timing?title then name else timing?title
    let scenes = scenesOf timing
    let steps = cut timing?duration scenes
    let out ext = join [ ws; "out"; $"{name}.{ext}" ]
    let dir = join [ ws; "build"; "present" ]
    let slides = steps |> List.mapi (fun i s -> join [ dir; $"""slide-{(string (i + 1)).PadLeft(3, '0')}.jpg""" ], s)

    asyncResult {
        writeText (out "script.md") (script title steps)
        written (out "script.md")
        writeText (out "srt") (srt scenes)
        written (out "srt")
        silent ws name |> Result.either written eprint

        do! slideWriter ()
        remove dir
        mkdirp dir
        do! shoot ws slides
        do! pptx title slides (out "pptx")
        JS.console.log $"""{out "pptx"}   ({slides.Length} slides)"""
        if args |> List.contains "--serve" then do! serve ws
    }
    |> Async.map (function
        | Ok() -> 0
        | Error failure -> exitCode name failure)
    |> Async.StartAsPromise
