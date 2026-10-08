/// The presenter export: node engine/cli/Cv.js <ws> present [--clips] [--serve]
/// For someone who gives the video in their own voice, in files most tools open. Writes <ws>/out/:
///   <name>.pptx         one slide per sentence: the picture once the sentence has been said, the sentence as the
///                       slide's speaker note, the chapters as sections (PowerPoint, Keynote, Google Slides, LibreOffice)
///   <name>.script.md    the narration to read aloud: the chapters, each sentence with its slide and its time in the
///                       video, and the pauses
///   <name>.srt          the narration as subtitles, one per sentence, for a video editor
///   <name>.silent.mp4   the video without its sound, to record a voice over (only when out/<name>.mp4 exists)
/// --clips puts on each slide the clip that leads to it (from the previous slide's moment to its own), which plays as
/// the slide opens: the animation in PowerPoint and Keynote; elsewhere the slide shows the clip's first frame.
/// --serve then serves the click-through deck, clip.html?present (src/Kit/Stage.fs), until Ctrl+C.
/// The slides are the steps of src/Shared/Steps.fs, the same the deck plays.
module Present

open Fable.Core
open Fable.Core.JsInterop
open System.Text.RegularExpressions
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

// What the step can be asked, and how it can fail ----------------------------------------------------------------

/// Why the export stopped.
type private Failure =
    | UnknownOption of string
    /// a tool home set up before the slide writer was added
    | SlideWriterMissing
    /// the slide pictures could not be drawn; the renderer has said why
    | RenderFailed of exitCode: int
    /// --clips without a video to cut them from, and why there is none
    | NoVideo of reason: string
    | ClipFailed of slide: int

/// What `present` was asked for: --serve, --clips.
type private Options = { Serve: bool; Clips: bool }

let private optionsOf (args: string list) : Result<Options, Failure> =
    let add (options: Options) arg =
        match arg with
        | "--serve" -> Ok { options with Serve = true }
        | "--clips" -> Ok { options with Clips = true }
        | other -> Error(UnknownOption other)
    args |> List.fold (fun acc arg -> acc |> Result.bind (fun o -> add o arg)) (Ok { Serve = false; Clips = false })

let private exitCode (name: string) (failure: Failure) : int =
    let cv = join [ engineDir; "cli"; "Cv.js" ]
    match failure with
    | UnknownOption o ->
        eprint $"present: no option {o} (there are --serve and --clips)"
        2
    | SlideWriterMissing ->
        eprint $"no {name}.pptx: the slide writer is not installed yet. Run: node {cv} setup"
        2
    | RenderFailed code -> code
    | NoVideo reason ->
        eprint $"--clips cuts each slide's clip from the video, and there is none: {reason}"
        2
    | ClipFailed n ->
        eprint $"ffmpeg could not cut the clip of slide {n}"
        1

// The slides ------------------------------------------------------------------------------------------------------

/// What moves on a slide (--clips): the video from the previous step's hold to this one's, and its first frame, which
/// the slide shows as it opens, the moment the previous slide ended on.
type private Clip = { Video: string; Cover: string; Seconds: float }

type private Slide = { Number: int; Step: Step; Still: string; Clip: Clip option }

/// A step this short has nothing to play: its slide shows its still.
let private SHORTEST_CLIP = 0.2

/// The video without its sound, copied from out/<name>.mp4 when that is newer; Error says why there is none.
let private silent (ws: string) (name: string) : Result<string, string> =
    let mp4 = join [ ws; "out"; $"{name}.mp4" ]
    let out = join [ ws; "out"; $"{name}.silent.mp4" ]
    if not (exists mp4) then Error $"no {name}.mp4 in out/ yet: run the video step first"
    elif exists out && mtime out >= mtime mp4 then Ok out
    elif run "ffmpeg" [ "-hide_banner"; "-loglevel"; "error"; "-y"; "-i"; mp4; "-map"; "0:v"; "-c"; "copy"; "-movflags"; "+faststart"; out ] = 0 then Ok out
    else Error "ffmpeg could not copy the video without its sound"

let private ffmpeg (args: string list) : bool =
    run "ffmpeg" ([ "-hide_banner"; "-loglevel"; "error"; "-y" ] @ args) = 0

/// Cuts a slide's clip from the video, from `from` to the slide's hold, and takes its first frame as the cover.
let private clipOf (video: string) (from: float) (slide: Slide) : Result<Slide, Failure> =
    let stem = slide.Still.Substring(0, slide.Still.LastIndexOf '.')
    let clip = { Video = stem + ".mp4"; Cover = stem + "-cover.png"; Seconds = slide.Step.Hold - from }
    let encode = [ "-an"; "-c:v"; "libx264"; "-preset"; "veryfast"; "-crf"; "20"; "-pix_fmt"; "yuv420p"; "-movflags"; "+faststart" ]
    if clip.Seconds < SHORTEST_CLIP then Ok slide
    elif ffmpeg ([ "-ss"; Render.toFixed 3 from; "-i"; video; "-t"; Render.toFixed 3 clip.Seconds ] @ encode @ [ clip.Video ])
         && ffmpeg [ "-i"; clip.Video; "-frames:v"; "1"; clip.Cover ] then
        Ok { slide with Clip = Some clip }
    else Error(ClipFailed slide.Number)

/// Each slide with its clip: the video between the previous slide's hold and its own.
let private withClips (video: string) (slides: Slide list) : Result<Slide list, Failure> =
    let froms = 0.0 :: (slides |> List.map (fun s -> s.Step.Hold) |> List.truncate (slides.Length - 1))
    List.zip froms slides |> List.traverseResultM (fun (from, slide) -> clipOf video from slide)

let private dataUri (png: string) : string = "data:image/png;base64," + (readBytes png)?toString ("base64")

/// The deck: a slide per step, its picture (or its clip) filling the slide and its sentence as the speaker note; a
/// section per chapter, so the slide sorter shows the chapters.
let private pptx (title: string) (slides: Slide list) (out: string) : Async<unit> =
    let lib: obj = requireFromHome "pptxgenjs"
    let deck: obj = createNew (if isNull lib?``default`` then lib else lib?``default``) ()
    deck?layout <- "LAYOUT_16x9" // 10 x 5.625 inches, the frame's 16:9
    deck?title <- title
    let fill = [ "x" ==> 0; "y" ==> 0; "w" ==> 10; "h" ==> 5.625 ]
    for chapter, inChapter in slides |> runs (fun s -> s.Step.Chapter) do
        let section = chapterName chapter
        deck?addSection (createObj [ "title" ==> section ]) |> ignore
        for s in inChapter do
            let slide: obj = deck?addSlide (createObj [ "sectionTitle" ==> section ])
            slide?background <- createObj [ "color" ==> "0F1420" ]
            match s.Clip with
            | Some clip ->
                slide?addMedia (createObj ([ "type" ==> "video"; "path" ==> clip.Video; "cover" ==> dataUri clip.Cover ] @ fill))
                |> ignore
            | None -> slide?addImage (createObj ([ "path" ==> s.Still ] @ fill)) |> ignore
            if s.Step.Text <> "" then slide?addNotes (s.Step.Text) |> ignore
    let saved: Async<obj> = fromJs (deck?writeFile (createObj [ "fileName" ==> out ]))
    saved |> Async.Ignore

// Clips that play by themselves -------------------------------------------------------------------------------------
// pptxgenjs embeds a video that waits for a click. PowerPoint plays it as the slide opens when the slide carries the
// timing it writes for "Start: Automatically", so that timing is added to each slide with a clip.

/// The id of the shape that holds a slide's video, in the slide XML pptxgenjs writes.
let private (|VideoShape|_|) (xml: string) : string option =
    let m = Regex.Match(xml, """<p:cNvPr id="(\d+)"(?:(?!<p:cNvPr )[\s\S])*?<a:videoFile""")
    if m.Success then Some m.Groups.[1].Value else None

/// PowerPoint's timing for a video that starts automatically: the slide's main sequence plays it from its start.
let private autoplayTiming (shape: string) (seconds: float) : string =
    let ms = int (System.Math.Round(seconds * 1000.0))
    "<p:timing><p:tnLst><p:par><p:cTn id=\"1\" dur=\"indefinite\" restart=\"never\" nodeType=\"tmRoot\"><p:childTnLst>"
    + "<p:seq concurrent=\"1\" nextAc=\"seek\"><p:cTn id=\"2\" dur=\"indefinite\" nodeType=\"mainSeq\"><p:childTnLst>"
    + "<p:par><p:cTn id=\"3\" fill=\"hold\"><p:stCondLst><p:cond delay=\"indefinite\"/>"
    + "<p:cond evt=\"onBegin\" delay=\"0\"><p:tn val=\"2\"/></p:cond></p:stCondLst><p:childTnLst>"
    + "<p:par><p:cTn id=\"4\" fill=\"hold\"><p:stCondLst><p:cond delay=\"0\"/></p:stCondLst><p:childTnLst>"
    + "<p:par><p:cTn id=\"5\" presetID=\"1\" presetClass=\"mediacall\" presetSubtype=\"0\" fill=\"hold\" nodeType=\"afterEffect\">"
    + "<p:stCondLst><p:cond delay=\"0\"/></p:stCondLst><p:childTnLst><p:cmd type=\"call\" cmd=\"playFrom(0.0)\"><p:cBhvr>"
    + $"<p:cTn id=\"6\" dur=\"{ms}\" fill=\"hold\"/><p:tgtEl><p:spTgt spid=\"{shape}\"/></p:tgtEl></p:cBhvr></p:cmd>"
    + "</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn>"
    + "<p:prevCondLst><p:cond evt=\"onPrev\" delay=\"0\"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>"
    + "<p:nextCondLst><p:cond evt=\"onNext\" delay=\"0\"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>"
    + "<p:video><p:cMediaNode vol=\"80000\"><p:cTn id=\"7\" fill=\"hold\" display=\"0\"><p:stCondLst><p:cond delay=\"indefinite\"/>"
    + $"</p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid=\"{shape}\"/></p:tgtEl></p:cMediaNode></p:video>"
    + "</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>"

/// A slide's XML with its video set to play as the slide opens (the timing goes after p:clrMapOvr); unchanged when
/// the slide has no video.
let private withAutoplay (seconds: float) (xml: string) : string =
    match xml with
    | VideoShape shape -> xml.Replace("</p:clrMapOvr></p:sld>", "</p:clrMapOvr>" + autoplayTiming shape seconds + "</p:sld>")
    | _ -> xml

/// Rewrites the deck so that every slide with a clip plays it as the slide opens.
let private autoplay (file: string) (slides: Slide list) : Async<unit> =
    async {
        let zipLib: obj = requireFromHome "jszip"
        let! (zip: obj) = fromJs (zipLib?loadAsync (readBytes file))
        for s in slides do
            match s.Clip with
            | Some clip ->
                let path = $"ppt/slides/slide{s.Number}.xml"
                let! (xml: string) = fromJs (zip?file(path)?async ("string"))
                zip?file (path, withAutoplay clip.Seconds xml) |> ignore
            | None -> ()
        let! (bytes: obj) = fromJs (zip?generateAsync (createObj [ "type" ==> "nodebuffer"; "compression" ==> "DEFLATE" ]))
        writeBytes file bytes
    }

// The step --------------------------------------------------------------------------------------------------------

let private slideWriter () : Result<unit, Failure> =
    if [ "pptxgenjs"; "jszip" ] |> List.forall Narrate.packageInstalled then Ok() else Error SlideWriterMissing

/// Draws each slide's still at its step's hold.
let private shoot (ws: string) (slides: Slide list) : Async<Result<unit, Failure>> =
    Render.shots ws [ for s in slides -> s.Step.Hold, s.Still ]
    |> Async.map (function
        | 0 -> Ok()
        | code -> Error(RenderFailed code))

/// Serves the click-through deck until Ctrl+C: never returns.
let private serve (ws: string) : Async<unit> =
    async {
        let! server = Render.startServer ws Render.ForRender
        JS.console.log $"{server.Url}?present   click-through deck: → or click next, ← back, S speaker notes, N notes on the slide, F full screen"
        JS.console.log "Ctrl+C to stop."
        return! Async.FromContinuations(fun _ -> ())
    }

let private written (file: string) : unit = JS.console.log file

let run (ws: string) (args: string list) : Async<int> =
    let ws = resolve ws
    let timing = readJson (join [ ws; "build"; "timing.json" ])
    let name: string = timing?name
    let title: string = if isNull timing?title then name else timing?title
    let scenes = scenesOf timing
    let out ext = join [ ws; "out"; $"{name}.{ext}" ]
    let dir = join [ ws; "build"; "present" ]
    let stills =
        cut timing?duration scenes
        |> List.mapi (fun i step ->
            { Number = i + 1
              Step = step
              Still = join [ dir; $"""slide-{(string (i + 1)).PadLeft(3, '0')}.jpg""" ]
              Clip = None })

    asyncResult {
        let! options = optionsOf args
        writeText (out "script.md") (script title (stills |> List.map (fun s -> s.Step)))
        written (out "script.md")
        writeText (out "srt") (srt scenes)
        written (out "srt")
        let video = silent ws name
        video |> Result.either written (fun why -> eprint $"no silent copy: {why}")

        do! slideWriter ()
        let! source = if options.Clips then video |> Result.map Some |> Result.mapError NoVideo else Ok None
        remove dir
        mkdirp dir
        do! shoot ws stills
        let! slides = source |> Option.map (fun v -> withClips v stills) |> Option.defaultValue (Ok stills)
        do! pptx title slides (out "pptx")
        if options.Clips then do! autoplay (out "pptx") slides
        let clips = slides |> List.filter (fun s -> s.Clip.IsSome) |> List.length
        JS.console.log $"""{out "pptx"}   ({slides.Length} slides{(if options.Clips then $", {clips} with clips" else "")})"""
        if options.Serve then do! serve ws
    }
    |> Async.map (function
        | Ok() -> 0
        | Error failure -> exitCode name failure)
