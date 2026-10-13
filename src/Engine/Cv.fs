/// The engine's one command (replaces build.sh and setup.sh):
///   node engine/cli/Cv.js setup                      one-time: voice model, browser driver, system checks
///   node engine/cli/Cv.js <ws> narrate               voice script.json -> build/narration.wav, timing.js/json, captions.vtt
///   node engine/cli/Cv.js <ws> check [--lesson f]    cue phrases, script problems, numbers the document never states
///   node engine/cli/Cv.js <ws> stills [t...]         still frames -> build/still-<t>.png (default: the poster frame)
///   node engine/cli/Cv.js <ws> sheet [keys...]       a labelled still per sentence, six per build/sheet[-keys]-<n>.png
///   node engine/cli/Cv.js <ws> serve                 preview URL with narration
///   node engine/cli/Cv.js <ws> new-long              copy templates/long/clip.html into the workspace
///   node engine/cli/Cv.js <ws> chapters              (re)write out/<name>.chapters.vtt from timing.json
///   node engine/cli/Cv.js <ws> video [--full]        render and encode -> out/<name>.{mp4,webm,jpg,vtt}; scenes that did
///                                                    not change are reused from build/segments (--full: none are)
///   node engine/cli/Cv.js <ws> all                   narrate, then video
///   node engine/cli/Cv.js <ws> present [--clips] [--serve]
///                                                    for presenting in your own voice: out/<name>.pptx (a slide per
///                                                    sentence, the sentence as its speaker note), .script.md, .srt,
///                                                    .silent.mp4; --clips: each slide plays its animation;
///                                                    --serve also serves the click-through deck
///   node engine/cli/Cv.js <ws> history [--done]      progress videos: the facts of the commit range -> build/history.md,
///                                                    history.json; --done records where this video ended
///   node engine/cli/Cv.js <ws> scan [t0 t1 step]     DOM scan every 0.25 s -> build/scan.json
///   node engine/cli/Cv.js <ws> report [mode]         findings from the scan (all|short|overlap|empty|...)
///   node engine/cli/Cv.js <ws> fill                  fill the brief templates from <ws>/brief.json -> <ws>/build/brief-*.txt
///   node engine/cli/Cv.js <ws> fix [file] [--apply]  apply a lesson-fixes JSON to build/lesson.md (dry run without --apply)
module Cv

open Fable.Core
open FsToolkit.ErrorHandling
open Node

/// Why a command could not start, or new-long would not write.
type CliFailure =
    /// no step, or one the engine does not have
    | Usage
    /// the workspace directory does not exist
    | NoWorkspace of path: string
    /// a step that needs setup, before setup has run; the hint says how to run it
    | NotSetUp of hint: string
    /// a clip.html that loads the old kit and is not the long-video template, so it cannot be upgraded
    | OldKit
    /// new-long, and the workspace has its clip.html already
    | ClipExists of path: string

/// The exit code of a CliFailure and the lines it prints on stderr.
let private describeCli (failure: CliFailure) : int * string list =
    match failure with
    | Usage ->
        2,
        [ "usage: node engine/cli/Cv.js setup | <workspace> narrate|check|stills|sheet|serve|new-long|chapters|video|all|present|scan|report|fill|fix|history [...]" ]
    | NoWorkspace path -> 2, [ $"no such workspace: {path}" ]
    | NotSetUp hint -> 2, [ hint ]
    | OldKit ->
        2,
        [ "clip.html loads /engine/stage-kit.js, which is gone: load build/timing.js, then <script type=\"module\" src=\"/engine/web/Main.js\">, and put your own script in a type=\"module\" script after it" ]
    | ClipExists path -> 1, [ $"{path} exists; not overwriting" ]

/// Why a command ended early, whichever part found it.
type Failure =
    | Cli of CliFailure
    | Narrate of Narrate.Failure
    | History of History.Failure
    | Present of Present.Failure

/// The exit code of a failure and the lines it prints on stderr.
let describe (failure: Failure) : int * string list =
    match failure with
    | Cli f -> describeCli f
    | Narrate f -> Narrate.describe f
    | History f -> History.describe f
    | Present f -> Present.describe f

/// Runs a step to its end, then ends with its code; an Error prints its lines and exits with its code; an exception
/// is printed and exits with 1. The engine's one Async.StartAsPromise, and the one caller of process.exit: every
/// step below is an Async. A step that returns Ok (whatever its code) only sets process.exitCode: the process ends by
/// itself once the event loop is empty, so stdout reaches a slow pipe whole and V8 is torn down before its threads are
/// joined (process.exit joins them first and, rarely, hangs there for good: nodejs/node#64274). An Error exits at once,
/// because a failure in the middle of voicing leaves the voice Worker running; so does an exception, which can also
/// leave Chrome or the page server running.
let finish (step: Async<Result<int, Failure>>) : unit =
    (Async.StartAsPromise step)
        .``then``(fun outcome ->
            match outcome with
            | Ok code -> setExitCode code
            | Error failure ->
                let code, lines = describe failure
                lines |> List.iter eprint
                exit code)
        .catch(fun e ->
            eprint (string e)
            exit 1)
    |> ignore

/// The narration, unless build/timing.json is there already. Narrate.run is called here, at once, so that it reads
/// script.json before anything runs (a bad one throws from `run` itself).
let ensureTiming (ws: string) : Async<Result<unit, Narrate.Failure>> =
    if exists (join [ ws; "build"; "timing.json" ]) then AsyncResult.ok () else Narrate.run ws

/// `first` (a narration), then the step `next` makes once `first` is done; a failed narration is the result, and
/// `next` is never made. `first` is made by the caller, before anything runs.
let private andThen
    (next: unit -> Async<Result<int, Failure>>)
    (first: Async<Result<unit, Narrate.Failure>>)
    : Async<Result<int, Failure>> =
    asyncResult {
        do! first |> AsyncResult.mapError Narrate
        return! next ()
    }

/// A step that ends with an exit code of its own.
let private coded (step: Async<int>) : Async<Result<int, Failure>> = step |> Async.map Ok

/// Workspaces started before the kit moved to F# carry a clip.html that loads /engine/stage.js, /engine/stage-kit.js
/// and the frame as an inline script. A long-video clip.html is the template copied verbatim, so its script block is
/// swapped for the new one (the old file is kept as build/clip.html.old-kit) and nothing else changes; the note that
/// it was upgraded is printed as it is. Any other clip.html that loads the old kit is an Error.
let upgradeClip (ws: string) : Result<unit, CliFailure> =
    let clip = join [ ws; "clip.html" ]
    if exists clip then
        let html = readText clip
        let start = html.IndexOf "<script src=\"build/timing.js\"></script>"
        let bodyEnd = html.LastIndexOf "</body>"
        if html.Contains "/engine/stage-kit.js" then
            if html.Contains "id=\"modules\"" && start >= 0 && bodyEnd > start then
                writeText (join [ ws; "build"; "clip.html.old-kit" ]) html
                let block =
                    "<!-- The frame (chapters, cards, progress bar, toasts, modules) is engine/web/Main.js, compiled from src/Kit. -->\n"
                    + "<script src=\"build/timing.js\"></script>\n"
                    + "<script type=\"module\" src=\"/engine/web/Main.js\"></script>\n"
                writeText clip (html.Substring(0, start) + block + html.Substring bodyEnd)
                eprint "clip.html: upgraded to the F# kit (engine/web/Main.js); the old file is build/clip.html.old-kit"
                Ok()
            else
                Error OldKit
        else
            Ok()
    else
        Ok()

/// The steps that run before setup: they need neither the browser driver nor the rest of what setup installs.
let private needsSetup (step: string) : bool =
    match step with
    | "narrate"
    | "check"
    | "new-long"
    | "fill"
    | "fix"
    | "history" -> false
    | _ -> true

/// What every workspace step needs, checked in this order: the workspace, its build/ and out/, setup (for the steps
/// that need it) and an up-to-date clip.html (for all but new-long, which writes one).
let private prepare (ws: string) (step: string) : Result<unit, CliFailure> =
    result {
        do! isDir ws |> Result.requireTrue (NoWorkspace ws)
        mkdirp (join [ ws; "build" ])
        mkdirp (join [ ws; "out" ])
        do! if needsSetup step then Setup.requireReady () |> Result.mapError NotSetUp else Ok()
        do! if step <> "new-long" then upgradeClip ws else Ok()
    }

/// Copies the long-video template into the workspace as its clip.html, unless it has one.
let private newLong (ws: string) : Result<int, CliFailure> =
    let dst = join [ ws; "clip.html" ]
    if exists dst then
        Error(ClipExists dst)
    else
        copyFile (join [ engineDir; "templates"; "long"; "clip.html" ]) dst
        printfn "%s (write script.json and one <key>.js per module; see KIT.md)" dst
        Ok 0

let main () =
    match argv with
    | [ "setup" ] -> finish (coded (Setup.run ()))
    | wsArg :: step :: rest ->
        let ws = resolve wsArg
        match prepare ws step with
        | Error failure -> finish (AsyncResult.error (Cli failure))
        | Ok() ->
            match step with
            | "narrate" -> finish (Narrate.run ws |> andThen (fun () -> AsyncResult.ok 0))
            | "check" -> finish (AsyncResult.ok (Check.run ws rest))
            | "stills"
            | "sheet"
            | "serve" -> finish (ensureTiming ws |> andThen (fun () -> coded (Render.run ws step rest)))
            | "new-long" -> finish (newLong ws |> Result.mapError Cli |> AsyncResult.ofResult)
            | "chapters" -> finish (AsyncResult.ok (Video.chapters ws))
            | "video" -> finish (ensureTiming ws |> andThen (fun () -> coded (Video.run ws rest)))
            | "present" -> finish (ensureTiming ws |> andThen (fun () -> Present.run ws rest |> AsyncResult.mapError Present))
            | "all" -> finish (Narrate.run ws |> andThen (fun () -> coded (Video.run ws rest)))
            | "scan" -> finish (ensureTiming ws |> andThen (fun () -> coded (Scan.run ws rest)))
            | "report" -> finish (AsyncResult.ok (ScanReport.run ws rest))
            | "fill" -> finish (AsyncResult.ok (Fill.run ws))
            | "history" -> finish (History.run ws rest |> Result.mapError History |> AsyncResult.ofResult)
            | "fix" -> finish (AsyncResult.ok (ApplyFixes.run ws rest))
            | _ -> finish (AsyncResult.error (Cli Usage))
    | _ -> finish (AsyncResult.error (Cli Usage))

main ()
