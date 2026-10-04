/// Renders a clip's clip.html frame by frame in headless Chrome (CHROME overrides the browser path). Port of render.mjs.
///   stills 3 12.5 ...  -> build/still-<t>.png, for checking a layout (default: the poster frame)
///   sheet              -> build/sheet-<n>.png: a labelled still for every narrated sentence
///   sheet g1 g2        -> build/sheet-g1-g2-<n>.png: only scenes of those modules (ids "g1-…"),
///                         so builders working on one clip in parallel never touch each other's sheets
///   video [fps]        -> every frame, losslessly into build/frames.mkv
///   serve              -> prints a URL to preview the clip with its narration
/// The clip directory is served as the site root and the engine directory as /engine/, so clip.html loads
/// /engine/web/Main.js wherever the clip lives. Frames render in WORKERS parallel pages (default 4), written in order.
module Render

open Fable.Core
open Fable.Core.JsInterop
open Node

// JS helpers ---------------------------------------------------------------------------------------------------

/// JS Number(): "" is 0, junk is NaN (never throws, unlike `float`).
[<Emit("Number($0)")>]
let jsNumber (s: string) : float = jsNative

let toFixed (digits: int) (x: float) : string = (box x)?toFixed (digits)

/// Code that runs inside the page stays JavaScript: puppeteer sends a function's source text to the browser, so it
/// must not call into Fable's runtime. Indirect eval turns the source into a function whose toString() is that text.
[<Emit("(0, eval)('(' + $0 + ')')")>]
let browserFn (source: string) : obj = jsNative

let awaitJs (p: obj) : JS.Promise<'T> = unbox p

let private stdoutWrite (s: string) : unit = proc?stdout?write (s) |> ignore

/// console.log / console.error with two arguments, printed with a space between (a ParamArray would spread a string).
[<Emit("console.log($0, $1)")>]
let private log2 (a: string) (b: obj) : unit = jsNative

[<Emit("console.error($0, $1)")>]
let private error2 (a: string) (b: obj) : unit = jsNative

// Chrome -------------------------------------------------------------------------------------------------------

let private chromePaths =
    [ "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
      "/usr/bin/google-chrome"
      "/usr/bin/google-chrome-stable"
      "/usr/bin/chromium"
      "/usr/bin/chromium-browser"
      "C:/Program Files/Google/Chrome/Application/chrome.exe" ]

/// CHROME, else the first browser found in the usual places.
let findChrome () : string option =
    match env "CHROME" with
    | Some c -> Some c
    | None -> chromePaths |> List.tryFind exists

// Static server ------------------------------------------------------------------------------------------------

/// Who the server is for. The scan's server (scan.mjs) differs on purpose: it answers 404 for .wav (no audio is
/// needed to scan), knows fewer types, and sends no cache header. Its 404s show up in scan.json's logs, so keep them.
type ServeFor =
    | ForRender
    | ForScan

let private renderTypes =
    Map
        [ ".html", "text/html"
          ".js", "text/javascript"
          ".css", "text/css"
          ".json", "application/json"
          ".wav", "audio/wav"
          ".png", "image/png"
          ".jpg", "image/jpeg"
          ".svg", "image/svg+xml"
          ".woff2", "font/woff2" ]

let private scanTypes =
    Map
        [ ".html", "text/html"
          ".js", "text/javascript"
          ".css", "text/css"
          ".json", "application/json"
          ".png", "image/png"
          ".jpg", "image/jpeg"
          ".svg", "image/svg+xml"
          ".woff2", "font/woff2" ]

[<Emit("decodeURIComponent(new URL($0, 'http://x').pathname)")>]
let private requestPath (reqUrl: string) : string = jsNative

/// A running static server and the clip.html URL it serves.
type Server = { Url: string; Close: unit -> unit }

/// Serves the clip directory as the root and the engine directory as /engine/, on a free localhost port.
let startServer (ws: string) (flavour: ServeFor) : JS.Promise<Server> =
    let clip = resolve ws
    let types = if flavour = ForRender then renderTypes else scanTypes

    let respond (req: obj) (res: obj) : unit =
        let reqUrl: string = req?url
        if flavour = ForRender && reqUrl = "/favicon.ico" then
            res?writeHead(204)?``end`` () |> ignore
        else
            let url = requestPath reqUrl
            let baseDir, rel =
                if url.StartsWith "/engine/" then engineDir, url.Substring "/engine/".Length
                else clip, url.Substring 1
            let file = resolve (join [ baseDir; rel ])
            if not (file.StartsWith(baseDir + sep)) then
                res?writeHead(403)?``end`` () |> ignore
            elif flavour = ForScan && file.EndsWith ".wav" then
                res?writeHead(404)?``end`` () |> ignore
            else
                // Read the whole file before writeHead: a failed read after the headers went out used to throw
                // ERR_HTTP_HEADERS_SENT.
                (awaitJs (fsp?readFile (file)): JS.Promise<obj>)
                    .``then``(
                        (fun body ->
                            let contentType = types |> Map.tryFind (extname file) |> Option.defaultValue "application/octet-stream"
                            let headers =
                                if flavour = ForRender then
                                    createObj [ "content-type" ==> contentType; "cache-control" ==> "no-store" ]
                                else
                                    createObj [ "content-type" ==> contentType ]
                            res?writeHead(200, headers)?``end`` (body) |> ignore),
                        (fun _ -> res?writeHead(404)?``end`` () |> ignore)
                    )
                |> ignore

    let server = http?createServer (System.Action<obj, obj>(respond))
    Promise.create (fun ok _ ->
        server?listen (0, "127.0.0.1", (fun () ->
            ok { Url = $"""http://127.0.0.1:{server?address()?port}/clip.html"""
                 Close = fun () -> server?close () |> ignore }))
        |> ignore)

// Pages --------------------------------------------------------------------------------------------------------

let private renderAt = browserFn "(t) => window.render(t)"

let private labelled =
    """(t, label) => {
        window.render(t);
        let tag = document.getElementById("sheet-label");
        if (!tag) {
          tag = document.createElement("div");
          tag.id = "sheet-label";
          tag.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99;padding:6px 14px;background:#000d;color:#ffd84d;font:600 34px/1.25 monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
          document.body.append(tag);
        }
        tag.textContent = label;
      }"""

/// One headless Chrome with the clip open in as many pages as asked. A page error marks the whole run failed.
type private Session(browser: obj, url: string) =
    let mutable failed = false
    member _.Failed = failed

    member _.OpenPage() : JS.Promise<obj> =
        promise {
            let! (page: obj) = awaitJs (browser?newPage ())
            page?on ("pageerror", (fun (e: obj) ->
                failed <- true
                error2 "page error:" e?message))
            |> ignore
            page?on ("console", (fun (m: obj) -> log2 "page:" (m?text ())))
            |> ignore
            do! awaitJs (page?setViewport (createObj [ "width" ==> 1920; "height" ==> 1080; "deviceScaleFactor" ==> 1 ]))
            do! awaitJs (page?goto (url, createObj [ "waitUntil" ==> "load" ]))
            do! awaitJs (page?evaluate (browserFn "() => window.ready"))
            return page
        }

let private frame (page: obj) (t: float) : JS.Promise<obj> =
    promise {
        do! awaitJs (page?evaluate (renderAt, t))
        return! awaitJs (page?screenshot (createObj [ "type" ==> "png"; "optimizeForSpeed" ==> true ]))
    }

let private evalIn (page: obj) (source: string) : JS.Promise<'T> = awaitJs (page?evaluate (browserFn source))

// Modes --------------------------------------------------------------------------------------------------------

let private stills (ws: string) (first: obj) (args: string list) : JS.Promise<unit> =
    promise {
        let! times =
            match args with
            | [] -> evalIn first "() => window.TIMING.poster" |> Promise.map List.singleton
            | _ -> Promise.lift (args |> List.map jsNumber)
        for t in times do
            let file = join [ ws; "build"; $"still-{toFixed 2 t}.png" ]
            let! png = frame first t
            writeBytes file png
            JS.console.log file
    }

/// A sentence's still and its label.
type private Beat = { T: float; Label: string }

/// Does scene `id` belong to one of the module keys (none: every scene)?
let private wanted (only: string list) (id: string) =
    only.IsEmpty || only |> List.exists (fun k -> id = k || id.Split('-').[0] = k || id.StartsWith(k + "-"))

let private beatsOf (timing: obj) (only: string list) : Beat list =
    let scenes: obj[] = timing?scenes
    let sentenceBeats =
        [ for s in scenes do
              let id: string = s?id
              if wanted only id then
                  let sentences: obj[] = s?sentences
                  for i in 0 .. sentences.Length - 1 do
                      let c = sentences.[i]
                      let start: float = c?start
                      let t = start + 0.75 * ((c?``end``: float) - start)
                      let text: string = c?text
                      { T = t; Label = $"{toFixed 1 t}s  {id}[{i}]  {text}" } ]
    let duration: float = timing?duration
    if only.IsEmpty then sentenceBeats @ [ { T = duration - 0.05; Label = $"{toFixed 1 duration}s  end" } ]
    else sentenceBeats

/// Six stills to a sheet, each scaled to half size, in a 2 x 3 grid; a short last group repeats its last still.
let private writeSheet (out: string) (group: string list) =
    let group = group @ List.replicate (6 - group.Length) (List.last group)
    let scaled = group |> List.mapi (fun i _ -> $"[{i}]scale=960:-1[t{i}]") |> String.concat ";"
    let stack =
        (group |> List.mapi (fun i _ -> $"[t{i}]") |> String.concat "")
        + "xstack=inputs=6:layout=0_0|w0_0|0_h0|w0_h0|0_h0+h0|w0_h0+h0"
    let inputs = group |> List.collect (fun f -> [ "-i"; f ])
    let code =
        run "ffmpeg" ([ "-hide_banner"; "-loglevel"; "error"; "-y" ] @ inputs @ [ "-filter_complex"; $"{scaled};{stack}"; out ])
    if code <> 0 then failwith $"ffmpeg {code}"

/// Returns 2 when no scene matches the keys.
let private sheet (ws: string) (first: obj) (args: string list) : JS.Promise<int> =
    promise {
        // One still late in each sentence (after its transitions), labelled, six to a sheet.
        let! (timing: obj) = evalIn first "() => window.TIMING"
        let only = args |> List.filter (fun a -> a <> "")
        let tag = if only.IsEmpty then "" else (String.concat "-" only) + "-"
        let beats = beatsOf timing only
        if beats.IsEmpty then
            eprint $"""no scenes match {String.concat " " only}"""
            return 2
        else
            let build = join [ ws; "build" ]
            if not only.IsEmpty then
                // Clear this filter's old sheets only; everyone else's stay.
                for f in readDir build do
                    if f.StartsWith $"sheet-{tag}" || f.StartsWith $"beat-{tag}" then remove (join [ build; f ])
            let files = ResizeArray<string>()
            for k, b in List.indexed beats do
                do! awaitJs (first?evaluate (browserFn labelled, b.T, b.Label))
                let file = join [ build; $"""beat-{tag}{(string k).PadLeft(2, '0')}.png""" ]
                let! png = awaitJs (first?screenshot (createObj [ "type" ==> "png" ]))
                writeBytes file png
                files.Add file
            files
            |> List.ofSeq
            |> List.chunkBySize 6
            |> List.iteri (fun n group ->
                let out = join [ build; $"sheet-{tag}{n + 1}.png" ]
                writeSheet out group
                JS.console.log out)
            return 0
    }

/// Every frame through ffmpeg into a lossless build/frames.mkv. Pages render frames in parallel; a reorder
/// buffer hands them to ffmpeg in order.
let private video (ws: string) (session: Session) (first: obj) (args: string list) : JS.Promise<unit> =
    promise {
        let! (duration: float) = evalIn first "() => window.DURATION"
        let fps = match args with a :: _ -> jsNumber a | [] -> 30.0
        let total = int (ceil (duration * fps))
        let workerCount = env "WORKERS" |> Option.map jsNumber |> Option.defaultValue 4.0
        let workers = ResizeArray [ first ]
        while float workers.Count < workerCount do
            let! page = session.OpenPage()
            workers.Add page
        let ff =
            childProcess?spawn (
                "ffmpeg",
                [| "-hide_banner"; "-loglevel"; "error"; "-y"; "-f"; "image2pipe"; "-framerate"; string fps; "-i"; "-"
                   "-c:v"; "ffv1"; "-pix_fmt"; "yuv444p"; join [ ws; "build"; "frames.mkv" ] |],
                createObj [ "stdio" ==> [| "pipe"; "inherit"; "inherit" |] ]
            )
        let ready = JS.Constructors.Map.Create<int, obj>()
        let next = ref 0
        let written = ref 0
        let start = JS.Constructors.Date.now ()
        let flush () =
            promise {
                while ready.has written.Value do
                    let buf = ready.get written.Value
                    ready.delete written.Value |> ignore
                    written.Value <- written.Value + 1
                    if not (ff?stdin?write (buf)) then
                        do! Promise.create (fun ok _ -> ff?stdin?once ("drain", (fun () -> ok ())) |> ignore)
            }
        let work (page: obj) =
            promise {
                while next.Value < total && not session.Failed do
                    let i = next.Value
                    next.Value <- i + 1
                    let! png = frame page (float i / fps)
                    ready.set (i, png) |> ignore
                    // Keep the reorder buffer bounded: a fast worker waits for the writer to catch up.
                    while i - written.Value > workers.Count * 8 do
                        do! Promise.sleep 5
                    do! flush ()
                    if float i % fps = 0.0 then stdoutWrite ("\r" + $"{toFixed 0 (float i / fps)}s / {toFixed 0 duration}s")
            }
        let! _ = workers |> Seq.map work |> Promise.all
        do! flush ()
        ff?stdin?``end`` () |> ignore
        do! Promise.create (fun ok _ -> ff?on ("close", (fun () -> ok ())) |> ignore)
        JS.console.log $"\nrendered {total} frames in {toFixed 1 ((JS.Constructors.Date.now () - start) / 1000.0)}s"
    }

// Entry --------------------------------------------------------------------------------------------------------

/// The `sheet` step without keys replaces every unfiltered sheet, so the old beat-<n>.png and sheet-<n>.png go first.
let private clearUnfilteredSheets (ws: string) =
    let build = join [ ws; "build" ]
    for f in readDir build do
        if (f.StartsWith "beat-" || f.StartsWith "sheet-") && f.EndsWith ".png" then
            let rest = f.Substring(f.IndexOf '-' + 1)
            if rest.Length > 0 && System.Char.IsDigit rest.[0] then remove (join [ build; f ])

/// Never resolves: serve runs until Ctrl+C.
let private forever () : JS.Promise<int> = Promise.create (fun _ _ -> ())

/// mode: stills | sheet | serve | video (video args: [fps]); returns an exit code.
let run (ws: string) (mode: string) (args: string list) : JS.Promise<int> =
    promise {
        let clip = resolve ws
        if mode = "sheet" && args.IsEmpty then clearUnfilteredSheets clip
        let! server = startServer clip ForRender
        if mode = "serve" then
            JS.console.log $"{server.Url}?preview   (click the page to start; ?t=12.5 freezes one moment)"
            JS.console.log "Ctrl+C to stop."
            return! forever ()
        else
            match findChrome () with
            | None ->
                eprint "no Chrome found: set CHROME to the browser's executable"
                server.Close()
                return 2
            | Some chrome ->
                let puppeteer = requireFromHome "puppeteer-core"
                let! (browser: obj) =
                    awaitJs (
                        puppeteer?launch (
                            createObj
                                [ "executablePath" ==> chrome
                                  "headless" ==> true
                                  "args"
                                  ==> [| "--font-render-hinting=none"
                                         "--force-color-profile=srgb"
                                         "--autoplay-policy=no-user-gesture-required" |] ]
                        )
                    )
                let session = Session(browser, server.Url)
                let! first = session.OpenPage()
                let! code =
                    match mode with
                    | "stills" -> stills clip first args |> Promise.map (fun () -> 0)
                    | "sheet" -> sheet clip first args
                    | _ -> video clip session first args |> Promise.map (fun () -> 0)
                do! awaitJs (browser?close ())
                server.Close()
                return (if code <> 0 then code elif session.Failed then 1 else 0)
    }
