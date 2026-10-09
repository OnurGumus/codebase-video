/// Render + encode (mp4, webm, poster, captions, chapters).
/// Output goes to <ws>/out/<name>.{mp4,webm,jpg,vtt} (+ .chapters.vtt for long videos).
///
/// The video is built from one segment per scene (src/Engine/Segments.fs gives each scene a key from everything its
/// frames can depend on). A scene whose key has a segment in build/segments/ is reused; the others are rendered
/// and encoded, each by one ffmpeg process that writes <key>.mp4 (x264) and <key>.webm (VP9), without sound. The
/// final files are the segments joined without re-encoding, plus the narration. So a fix to one scene costs that
/// scene, and a run with nothing changed takes seconds.
///   video             reuse what is cached
///   video --full      render every scene again
///   video --lossless  for testing the engine: ffv1 segments in build/segments-lossless/, joined into
///                     build/frames.mkv; no mp4 or webm
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
let private run' (cmd: string) (args: string list) : int = if hasCommand cmd then Node.run cmd args else 0

let private list (outDir: string) (name: string) : int =
    let files =
        readDir outDir |> List.filter (fun f -> f.StartsWith(name + ".")) |> List.sort |> List.map (fun f -> join [ outDir; f ])
    if hasCommand "ls" then run "ls" ("-la" :: files)
    else
        for f in files do
            JS.console.log $"""{fs?statSync(f)?size}  {f}"""
        0

let private ffmpeg (args: string list) : unit -> int =
    fun () -> Node.run "ffmpeg" ([ "-hide_banner"; "-loglevel"; "error"; "-y" ] @ args)

// The encoders. A change here changes every segment's key.
let private x264 =
    [ "-c:v"; "libx264"; "-profile:v"; "high"; "-preset"; "slow"; "-crf"; "22"; "-pix_fmt"; "yuv420p"; "-tune"; "animation" ]

let private vp9 =
    [ "-c:v"; "libvpx-vp9"; "-crf"; "34"; "-b:v"; "0"; "-row-mt"; "1"; "-deadline"; "good"; "-cpu-used"; "2"; "-pix_fmt"; "yuv420p" ]

let private ffv1 = [ "-c:v"; "ffv1"; "-pix_fmt"; "yuv444p" ]

/// What draws the frames: the browser's version (or, where it will not say, its file's size and date).
let private browserId (chrome: string) : string =
    match runCapture chrome [ "--version" ] with
    | 0, out, _ when out.Trim() <> "" -> out.Trim()
    | _ -> if exists chrome then $"{chrome} {fileSize chrome} {mtime chrome}" else chrome

[<Emit("$0.toFixed(6)")>]
let private fixed6 (x: float) : string = jsNative

[<Emit("$0.toFixed(1)")>]
let private fixed1 (x: float) : string = jsNative

[<Emit("Math.round($0)")>]
let private jsRound (x: float) : float = jsNative

/// A list for ffmpeg's concat demuxer: the segments in order, each with its exact length (the lengths are
/// differences of rounded running totals, so the rounding never adds up).
let private concatList (dir: string) (ext: string) (fps: int) (segments: Segments.Segment list) : string =
    let micros (frame: int) = jsRound (float frame * 1e6 / float fps)
    let file = join [ dir; $"list-{ext}.txt" ]
    let lines =
        "ffconcat version 1.0"
        :: [ for s in segments do
                 $"file '{s.Key}.{ext}'"
                 $"duration {fixed6 ((micros s.End - micros s.First) / 1e6)}" ]
    writeText file (String.concat "\n" lines + "\n")
    file

/// GitHub plays a video attached to a README or an issue only up to 10 MB, so a `short` video (the length meant for
/// overviews and promos) is kept under that, with a little room to spare. CODEBASE_VIDEO_SHORT_MAX_MB changes the
/// limit (e.g. 100 on a paid GitHub plan).
[<Emit("Number($0)")>]
let private toNumber (s: string) : float = jsNative

let private MAX_MB =
    match env "CODEBASE_VIDEO_SHORT_MAX_MB" |> Option.map toNumber with
    | Some mb when mb > 0.0 -> mb
    | _ -> 10.0

let private ATTACH_LIMIT = MAX_MB * 1e6 * 0.98

/// Speech from a 24 kHz mono voice: 64 kbit/s mono AAC is transparent for it, and at 128 the sound would be half of
/// a short video's size.
let private AAC_KBPS = 64.0

/// The length the workspace's brief asks for ("short", "tour", "deep"), or "" when there is no brief.
let private lengthOf (ws: string) : string =
    let brief = join [ ws; "brief.json" ]
    if exists brief then
        let v: obj = (readJson brief)?length
        if isNull v then "tour" else string v
    else ""

/// When a short video's mp4 is over the limit, encodes its picture again in two passes at the bitrate that fits
/// (the cached segments stay as they are). Returns 0, also when the file was already small enough.
let private fitShort (ws: string) (mp4: string) : int =
    let megabytes (bytes: float) = fixed1 (bytes / 1e6)
    if lengthOf ws <> "short" then 0
    else
        let size = fileSize mp4
        if size <= ATTACH_LIMIT then
            JS.console.log $"mp4: {megabytes size} MB (a short video is kept under {MAX_MB} MB; GitHub plays up to 10 MB inline)"
            0
        else
            let timing = readJson (join [ ws; "build"; "timing.json" ])
            let seconds: float = timing?duration
            let kbps = floor (ATTACH_LIMIT * 8.0 / seconds / 1000.0 - AAC_KBPS - 6.0)
            let log = join [ ws; "build"; "fit-pass" ]
            let big = join [ ws; "build"; "fit-source.mp4" ]
            let picture = [ "-c:v"; "libx264"; "-profile:v"; "high"; "-preset"; "slow"; "-b:v"; $"{kbps}k"; "-pix_fmt"; "yuv420p"; "-passlogfile"; log ]
            JS.console.log $"mp4: {megabytes size} MB is over the {MAX_MB} MB a short video may have; encoding the picture again at {kbps} kbit/s"
            rename mp4 big
            let code =
                sequence
                    [ ffmpeg ([ "-i"; big ] @ picture @ [ "-pass"; "1"; "-an"; "-f"; "null"; (if platform = "win32" then "NUL" else "/dev/null") ])
                      ffmpeg ([ "-i"; big ] @ picture @ [ "-pass"; "2"; "-c:a"; "copy"; "-movflags"; "+faststart"; mp4 ]) ]
            for f in readDir (join [ ws; "build" ]) do
                if f.StartsWith "fit-pass" then remove (join [ ws; "build"; f ])
            if code <> 0 then
                rename big mp4
                code
            else
                remove big
                let fitted = fileSize mp4
                JS.console.log $"mp4: now {megabytes fitted} MB"
                if fitted > MAX_MB * 1e6 then
                    eprint $"the mp4 is still over {MAX_MB} MB: shorten the video, or host it elsewhere"
                0

let run (ws: string) (args: string list) : Async<int> =
    async {
        let full = args |> List.contains "--full"
        let lossless = args |> List.contains "--lossless"
        match args |> List.filter (fun a -> a <> "--full" && a <> "--lossless") with
        | unknown :: _ ->
            eprint $"video: unknown option {unknown} (options: --full, --lossless)"
            return 2
        | [] ->
            match Render.findChrome () with
            | None ->
                eprint "no Chrome found: set CHROME to the browser's executable"
                return 2
            | Some chrome ->
                let fps = Narrate.FPS
                let name, poster = timingOf ws
                let exts = if lossless then [ "mkv" ] else [ "mp4"; "webm" ]
                let encoder = String.concat " " (if lossless then ffv1 else x264 @ vp9)
                let segments = Segments.plan ws fps "1920x1080@1" (browserId chrome) encoder
                let dir = join [ ws; "build"; (if lossless then "segments-lossless" else "segments") ]
                mkdirp dir
                let file (key: string) (ext: string) = join [ dir; $"{key}.{ext}" ]
                let cached (s: Segments.Segment) = not full && exts |> List.forall (fun ext -> exists (file s.Key ext))
                let missing = segments |> List.filter (cached >> not)
                if not (Segments.wholeFrames ws fps) then
                    JS.console.log "timing.json is from an older engine (scenes do not end on whole frames): run narrate again, and later narration fixes will render only what they change"
                let jobs =
                    [ for n, s in List.indexed missing ->
                          // Written under a temporary name and renamed when complete: an interrupted run leaves nothing
                          // that looks like a finished segment.
                          let temp ext = file s.Key ("tmp." + ext)
                          { Render.Range.Label = $"[{n + 1}/{missing.Length}] {s.Id}"
                            Render.Range.First = s.First
                            Render.Range.End = s.End
                            Render.Range.Output =
                              if lossless then ffv1 @ [ temp "mkv" ]
                              else [ "-map"; "0:v" ] @ x264 @ [ temp "mp4"; "-map"; "0:v" ] @ vp9 @ [ temp "webm" ]
                            Render.Range.Done =
                              fun () ->
                                  for ext in exts do
                                      rename (temp ext) (file s.Key ext)
                                  writeText (file s.Key "json") s.Input } ]
                let! code = if jobs.IsEmpty then async.Return 0 else Render.ranges ws (float fps) jobs
                if code <> 0 then
                    return code
                else
                    let out ext = join [ ws; "out"; $"{name}.{ext}" ]
                    let joined ext = [ "-f"; "concat"; "-safe"; "0"; "-i"; concatList dir ext fps segments ]
                    // Speech normalised to -16 LUFS, the usual level for spoken web video, so clips match each other.
                    let audio =
                        [ "-i"; join [ ws; "build"; "narration.wav" ]; "-map"; "0:v"; "-map"; "1:a"
                          "-af"; "loudnorm=I=-16:TP=-1.5:LRA=11"; "-ar"; "48000"; "-c:v"; "copy" ]
                    let assemble =
                        if lossless then
                            [ ffmpeg (joined "mkv" @ [ "-c"; "copy"; join [ ws; "build"; "frames.mkv" ] ]) ]
                        else
                            [ ffmpeg (joined "mp4" @ audio @ [ "-c:a"; "aac"; "-b:a"; $"{AAC_KBPS}k"; "-ac"; "1"; "-movflags"; "+faststart"; "-shortest"; out "mp4" ])
                              (fun () -> fitShort ws (out "mp4"))
                              ffmpeg (joined "webm" @ audio @ [ "-c:a"; "libopus"; "-b:a"; "48k"; "-ac"; "1"; "-shortest"; out "webm" ])
                              ffmpeg [ "-ss"; poster; "-i"; out "mp4"; "-frames:v"; "1"; "-q:v"; "3"; out "jpg" ]
                              fun () ->
                                  copyFile (join [ ws; "build"; "captions.vtt" ]) (out "vtt")
                                  0
                              fun () -> chaptersFor ws name ]
                    let tidy () =
                        // Segments no scene uses any more (and anything an interrupted run left) go, so the cache
                        // holds one video's worth.
                        let keep = segments |> List.map (fun s -> s.Key) |> Set.ofList
                        for f in readDir dir do
                            if not (f.StartsWith "list-") && not (keep.Contains(f.Split('.').[0])) then remove (join [ dir; f ])
                        JS.console.log $"segments: {segments.Length - missing.Length} reused, {missing.Length} rendered"
                        0
                    return
                        sequence (
                            assemble
                            @ [ tidy ]
                            @ (if lossless then [ fun () -> run' "ls" [ "-la"; join [ ws; "build"; "frames.mkv" ] ] ]
                               else [ fun () -> list (join [ ws; "out" ]) name ])
                        )
    }
