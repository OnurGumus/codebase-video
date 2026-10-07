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
///   node engine/cli/Cv.js <ws> history [--done]      progress videos: the facts of the commit range -> build/history.md,
///                                                    history.json; --done records where this video ended
///   node engine/cli/Cv.js <ws> scan [t0 t1 step]     DOM scan every 0.25 s -> build/scan.json
///   node engine/cli/Cv.js <ws> report [mode]         findings from the scan (all|short|overlap|empty|...)
///   node engine/cli/Cv.js <ws> fill                  fill the brief templates from <ws>/brief.json -> <ws>/build/brief-*.txt
///   node engine/cli/Cv.js <ws> fix [file] [--apply]  apply a lesson-fixes JSON to build/lesson.md (dry run without --apply)
module Cv

open Fable.Core
open Node

let usage () =
    eprint "usage: node engine/cli/Cv.js setup | <workspace> narrate|check|stills|sheet|serve|new-long|chapters|video|all|scan|report|fill|fix|history [...]"
    exit 2

let finish (p: JS.Promise<int>) =
    p
    |> Promise.map (fun code -> exit code)
    |> Promise.catchEnd (fun e ->
        eprint (string e)
        exit 1)

let ensureTiming (ws: string) : JS.Promise<unit> =
    if exists (join [ ws; "build"; "timing.json" ]) then Promise.lift () else Narrate.run ws

/// Workspaces started before the kit moved to F# carry a clip.html that loads /engine/stage.js, /engine/stage-kit.js
/// and the frame as an inline script. A long-video clip.html is the template copied verbatim, so its script block is
/// swapped for the new one (the old file is kept as build/clip.html.old-kit) and nothing else changes.
let upgradeClip (ws: string) =
    let clip = join [ ws; "clip.html" ]
    if exists clip then
        let html = readText clip
        let start = html.IndexOf "<script src=\"build/timing.js\"></script>"
        let stop = html.LastIndexOf "</body>"
        if html.Contains "/engine/stage-kit.js" then
            if html.Contains "id=\"modules\"" && start >= 0 && stop > start then
                writeText (join [ ws; "build"; "clip.html.old-kit" ]) html
                let block =
                    "<!-- The frame (chapters, cards, progress bar, toasts, modules) is engine/web/Main.js, compiled from src/Kit. -->\n"
                    + "<script src=\"build/timing.js\"></script>\n"
                    + "<script type=\"module\" src=\"/engine/web/Main.js\"></script>\n"
                writeText clip (html.Substring(0, start) + block + html.Substring stop)
                eprint "clip.html: upgraded to the F# kit (engine/web/Main.js); the old file is build/clip.html.old-kit"
            else
                eprint "clip.html loads /engine/stage-kit.js, which is gone: load build/timing.js, then <script type=\"module\" src=\"/engine/web/Main.js\">, and put your own script in a type=\"module\" script after it"
                exit 2

let main () =
    match argv with
    | [ "setup" ] -> finish (Setup.run ())
    | wsArg :: step :: rest ->
        let ws = resolve wsArg
        if not (isDir ws) then
            eprint $"no such workspace: {ws}"
            exit 2
        mkdirp (join [ ws; "build" ])
        mkdirp (join [ ws; "out" ])
        if step <> "narrate" && step <> "check" && step <> "new-long" && step <> "fill" && step <> "fix" && step <> "history" then
            Setup.requireReady ()
        if step <> "new-long" then upgradeClip ws
        match step with
        | "narrate" -> finish (Narrate.run ws |> Promise.map (fun () -> 0))
        | "check" -> finish (Promise.lift (Check.run ws rest))
        | "stills" | "sheet" | "serve" -> finish (ensureTiming ws |> Promise.bind (fun () -> Render.run ws step rest))
        | "new-long" ->
            let dst = join [ ws; "clip.html" ]
            if exists dst then
                eprint $"{dst} exists; not overwriting"
                exit 1
            copyFile (join [ engineDir; "templates"; "long"; "clip.html" ]) dst
            printfn "%s (write script.json and one <key>.js per module; see KIT.md)" dst
            exit 0
        | "chapters" -> finish (Promise.lift (Video.chapters ws))
        | "video" -> finish (ensureTiming ws |> Promise.bind (fun () -> Video.run ws rest))
        | "all" -> finish (Narrate.run ws |> Promise.bind (fun () -> Video.run ws rest))
        | "scan" -> finish (ensureTiming ws |> Promise.bind (fun () -> Scan.run ws rest))
        | "report" -> finish (Promise.lift (ScanReport.run ws rest))
        | "fill" -> finish (Promise.lift (Fill.run ws))
        | "history" -> finish (Promise.lift (History.run ws rest))
        | "fix" -> finish (Promise.lift (ApplyFixes.run ws rest))
        | _ -> usage ()
    | _ -> usage ()

main ()
