/// Render + encode (mp4, webm, poster, captions, chapters). Port of the video() and chapters_for() steps of build.sh.
/// Output goes to <ws>/out/<name>.{mp4,webm,jpg,vtt} (+ .chapters.vtt for long videos).
module Video

open Fable.Core
open Fable.Core.JsInterop
open Node

/// name and poster time from build/timing.json.
let private timingOf (ws: string) : string * string =
    let timing = readJson (join [ ws; "build"; "timing.json" ])
    timing?name, string (timing?poster: float)

/// Long videos publish their chapters as <name>.chapters.vtt; short clips have none (Chapters.write returns 3).
let private chaptersFor (ws: string) (name: string) : int =
    let vtt = join [ ws; "out"; $"{name}.chapters.vtt" ]
    match Chapters.write (join [ ws; "build"; "timing.json" ]) vtt with
    | 0 -> 0
    | 3 ->
        remove vtt
        0
    | _ -> 1

/// The "chapters" step: (re)write out/<name>.chapters.vtt from timing.json, no render.
let chapters (ws: string) : int = chaptersFor ws (fst (timingOf ws))

/// Runs the steps in order and stops at the first that fails, returning its code (build.sh ran under set -e).
let rec private sequence (steps: (unit -> int) list) : int =
    match steps with
    | [] -> 0
    | step :: rest ->
        match step () with
        | 0 -> sequence rest
        | code -> code

/// The finished files, as `ls -la` shows them.
let private list (outDir: string) (name: string) : int =
    let files =
        readDir outDir |> List.filter (fun f -> f.StartsWith(name + ".")) |> List.sort |> List.map (fun f -> join [ outDir; f ])
    if hasCommand "ls" then run "ls" ("-la" :: files)
    else
        for f in files do
            JS.console.log $"""{fs?statSync(f)?size}  {f}"""
        0

let run (ws: string) : JS.Promise<int> =
    Render.run ws "video" [ "30" ]
    |> Promise.map (fun code ->
        if code <> 0 then code
        else
            let name, poster = timingOf ws
            let frames = join [ ws; "build"; "frames.mkv" ]
            let out ext = join [ ws; "out"; $"{name}.{ext}" ]
            // Speech normalised to -16 LUFS, the usual level for spoken web video, so clips match each other.
            let audio =
                [ "-i"; join [ ws; "build"; "narration.wav" ]; "-map"; "0:v"; "-map"; "1:a"
                  "-af"; "loudnorm=I=-16:TP=-1.5:LRA=11"; "-ar"; "48000" ]
            let ffmpeg args = fun () -> Node.run "ffmpeg" ([ "-hide_banner"; "-loglevel"; "error"; "-y" ] @ args)
            sequence
                [ ffmpeg (
                      [ "-i"; frames ] @ audio
                      @ [ "-c:v"; "libx264"; "-profile:v"; "high"; "-preset"; "slow"; "-crf"; "22"; "-pix_fmt"; "yuv420p"
                          "-tune"; "animation"; "-c:a"; "aac"; "-b:a"; "128k"; "-movflags"; "+faststart"; "-shortest"
                          out "mp4" ]
                  )
                  ffmpeg (
                      [ "-i"; frames ] @ audio
                      @ [ "-c:v"; "libvpx-vp9"; "-crf"; "34"; "-b:v"; "0"; "-row-mt"; "1"; "-deadline"; "good"
                          "-cpu-used"; "2"; "-pix_fmt"; "yuv420p"; "-c:a"; "libopus"; "-b:a"; "96k"; "-shortest"
                          out "webm" ]
                  )
                  ffmpeg [ "-ss"; poster; "-i"; frames; "-frames:v"; "1"; "-q:v"; "3"; out "jpg" ]
                  fun () ->
                      copyFile (join [ ws; "build"; "captions.vtt" ]) (out "vtt")
                      0
                  fun () -> chaptersFor ws name
                  fun () ->
                      remove frames
                      0
                  fun () -> list (join [ ws; "out" ]) name ])
