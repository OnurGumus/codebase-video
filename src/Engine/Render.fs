/// Renders a clip's clip.html frame by frame in headless Chrome (CHROME overrides the browser path). Port of render.mjs.
///   stills 3 12.5 ...  -> build/still-<t>.png, for checking a layout (default: the poster frame)
///   sheet              -> build/sheet-<n>.png: a labelled still for every narrated sentence
///   sheet g1 g2        -> build/sheet-g1-g2-<n>.png: only scenes of those modules (ids "g1-…"),
///                         so builders working on one clip in parallel never touch each other's sheets
///   serve              -> prints a URL to preview the clip with its narration
/// and `shots` draws given moments to JPEG files for the `present` step's slides (src/Engine/Present.fs);
/// for the `video` step (src/Engine/Video.fs), it renders runs of frames, each piped into its own ffmpeg process
/// (`ranges`): one run per scene that is not in the cache.
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

/// What a JS library's promise resolves to, as an Async.
let private fromJs (p: obj) : Async<'T> = Async.AwaitPromise(awaitJs p)

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
let startServer (ws: string) (flavour: ServeFor) : Async<Server> =
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

    async {
        let server = http?createServer (System.Action<obj, obj>(respond))
        return!
            Async.FromContinuations(fun (ok, _, _) ->
                server?listen (0, "127.0.0.1", (fun () ->
                    ok { Url = $"""http://127.0.0.1:{server?address()?port}/clip.html"""
                         Close = fun () -> server?close () |> ignore }))
                |> ignore)
    }

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

let private imagesLoaded =
    """() => Promise.all(Array.from(document.images, (img) =>
        (img.complete ? Promise.resolve() : new Promise((ok) => {
          img.addEventListener("load", ok, { once: true });
          img.addEventListener("error", ok, { once: true });
        })).then(() => img.decode().catch(() => {})))).then(() => true)"""

/// Gives each answer an agent owes. An answer runs its caller's continuation up to that caller's next await; what
/// escapes from it (only a caller whose computation is already over can throw back here) is not the agent's.
let private deliver (answers: (unit -> unit) list) : unit =
    for answer in answers do
        try
            answer ()
        with _ ->
            ()

/// What the pages tell the session: one of them reported an error; and the question whether any has.
type private PageMsg =
    | PageError
    | IsFailed of AsyncReplyChannel<bool>

/// One headless Chrome with the clip open in as many pages as asked. A page error marks the whole run failed: each
/// page's `pageerror` handler tells a small agent, which holds whether one was seen.
type private Session(browser: obj, url: string) =
    let errors =
        MailboxProcessor<PageMsg>.Start(fun inbox ->
            let rec loop (failed: bool) : Async<unit> =
                async {
                    match! inbox.Receive() with
                    | PageError -> return! loop true
                    | IsFailed reply ->
                        deliver [ fun () -> reply.Reply failed ]
                        return! loop failed
                }
            loop false)

    /// True once any page of the session has reported an error.
    member _.IsFailed() : Async<bool> = async { return! errors.PostAndAsyncReply IsFailed }

    member _.OpenPage() : Async<obj> =
        async {
            let! (page: obj) = fromJs (browser?newPage ())
            page?on ("pageerror", (fun (e: obj) ->
                errors.Post PageError
                error2 "page error:" e?message))
            |> ignore
            page?on ("console", (fun (m: obj) -> log2 "page:" (m?text ())))
            |> ignore
            do! fromJs (page?setViewport (createObj [ "width" ==> 1920; "height" ==> 1080; "deviceScaleFactor" ==> 1 ]))
            do! fromJs (page?goto (url, createObj [ "waitUntil" ==> "load" ]))
            do! fromJs (page?evaluate (browserFn "() => window.ready"))
            // window.ready waits for the fonts, not for pictures a module put on the page. A run of frames may start
            // at any scene, so the first frame drawn can be one that shows them.
            do! fromJs (page?evaluate (browserFn imagesLoaded))
            return page
        }

let private frame (page: obj) (t: float) : Async<obj> =
    async {
        do! fromJs (page?evaluate (renderAt, t))
        return! fromJs (page?screenshot (createObj [ "type" ==> "png"; "optimizeForSpeed" ==> true ]))
    }

let private evalIn (page: obj) (source: string) : Async<'T> = fromJs (page?evaluate (browserFn source))

/// The steps one after another, each awaited before the next starts; their results in order.
let rec private mapA (step: 'a -> Async<'b>) (items: 'a list) : Async<'b list> =
    async {
        match items with
        | [] -> return []
        | x :: rest ->
            let! y = step x
            let! ys = mapA step rest
            return y :: ys
    }

// Modes --------------------------------------------------------------------------------------------------------

let private stills (ws: string) (first: obj) (args: string list) : Async<unit> =
    async {
        let! times =
            match args with
            | [] ->
                async {
                    let! (poster: float) = evalIn first "() => window.TIMING.poster"
                    return [ poster ]
                }
            | _ -> async.Return(args |> List.map jsNumber)
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

/// Six stills to a sheet, each scaled to half size, in a 2 x 3 grid; a short last group fills only its own cells.
let private writeSheet (out: string) (group: string list) =
    let scaled = group |> List.mapi (fun i _ -> $"[{i}]scale=960:-1[t{i}]") |> String.concat ";"
    let cells = [ "0_0"; "w0_0"; "0_h0"; "w0_h0"; "0_h0+h0"; "w0_h0+h0" ] |> List.truncate group.Length |> String.concat "|"
    let filter =
        if group.Length = 1 then "[0]scale=960:-1" // xstack needs at least two inputs
        else
            let stack = (group |> List.mapi (fun i _ -> $"[t{i}]") |> String.concat "") + $"xstack=inputs={group.Length}:layout={cells}:fill=black"
            $"{scaled};{stack}"
    let inputs = group |> List.collect (fun f -> [ "-i"; f ])
    let code =
        run "ffmpeg" ([ "-hide_banner"; "-loglevel"; "error"; "-y" ] @ inputs @ [ "-filter_complex"; filter; out ])
    if code <> 0 then failwith $"ffmpeg {code}"

/// Returns 2 when no scene matches the keys.
let private sheet (ws: string) (first: obj) (args: string list) : Async<int> =
    async {
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
                readDir build
                |> List.iter (fun f ->
                    if f.StartsWith $"sheet-{tag}" || f.StartsWith $"beat-{tag}" then remove (join [ build; f ]))
            let! files =
                beats
                |> List.indexed
                |> mapA (fun (k, b) ->
                    async {
                        do! fromJs (first?evaluate (browserFn labelled, b.T, b.Label))
                        let file = join [ build; $"""beat-{tag}{(string k).PadLeft(2, '0')}.png""" ]
                        let! png = fromJs (first?screenshot (createObj [ "type" ==> "png" ]))
                        writeBytes file png
                        return file
                    })
            files
            |> List.chunkBySize 6
            |> List.iteri (fun n group ->
                let out = join [ build; $"sheet-{tag}{n + 1}.png" ]
                writeSheet out group
                JS.console.log out)
            return 0
    }

/// Frame i is drawn a microsecond after i / fps. Scenes start and end on whole frames, so a time a scene computes
/// from them ("its end less 0.05 s") can fall exactly on a frame's time, where a rounding error in the last bit,
/// which depends on where the scene sits in the video, would decide a "t >= x" or a rounded number. The microsecond
/// decides it instead, the same way wherever the scene sits; a cached scene then draws the same when it moves.
let private frameTime (fps: float) (i: int) : float = float i / fps + 1e-6

/// A run of frames [First, End) for one ffmpeg process: each frame is drawn at its frameTime and piped in as a PNG.
type Range =
    { Label: string
      First: int
      End: int
      /// ffmpeg's arguments after the piped input: the encoders and the output files
      Output: string list
      /// called when ffmpeg has written its files and exited with 0
      Done: unit -> unit }

/// Renders one run. Pages render frames in parallel; a reorder buffer hands them to ffmpeg in order.
/// False when a page failed or ffmpeg did.
let private renderRange (session: Session) (workers: obj list) (fps: float) (r: Range) : JS.Promise<bool> =
    promise {
        let ff =
            childProcess?spawn (
                "ffmpeg",
                List.toArray ([ "-hide_banner"; "-loglevel"; "error"; "-y"; "-f"; "image2pipe"; "-framerate"; string fps; "-i"; "-" ] @ r.Output),
                createObj [ "stdio" ==> [| "pipe"; "inherit"; "inherit" |] ]
            )
        let exited: int option ref = ref None
        let closed: JS.Promise<unit> =
            Promise.create (fun ok _ ->
                ff?on ("close", (fun (code: obj) ->
                    exited.Value <- Some(if isNull code then 1 else unbox code)
                    ok ()))
                |> ignore)
        // ffmpeg going away early shows as its exit code, not as an unhandled EPIPE.
        ff?stdin?on ("error", (fun (_: obj) -> ())) |> ignore
        let ready = JS.Constructors.Map.Create<int, obj>()
        let next = ref r.First
        let written = ref r.First
        let seconds (frames: int) = toFixed 0 (float frames / fps)
        let flush () =
            promise {
                while ready.has written.Value && exited.Value.IsNone do
                    let buf = ready.get written.Value
                    ready.delete written.Value |> ignore
                    written.Value <- written.Value + 1
                    if not (ff?stdin?write (buf)) then
                        do! Promise.race [ Promise.create (fun ok _ -> ff?stdin?once ("drain", (fun () -> ok ())) |> ignore); closed ]
            }
        let rec work (page: obj) =
            promise {
                // Ruling 3: the session answers in an Async; renderRange becomes one in the next task.
                let! failed = session.IsFailed() |> Async.StartAsPromise
                if next.Value < r.End && not failed && exited.Value.IsNone then
                    let i = next.Value
                    next.Value <- i + 1
                    let! png = frame page (frameTime fps i) |> Async.StartAsPromise
                    ready.set (i, png) |> ignore
                    // Keep the reorder buffer bounded: a fast worker waits for the writer to catch up.
                    while i - written.Value > workers.Length * 8 && exited.Value.IsNone do
                        do! Promise.sleep 5
                    do! flush ()
                    if (i - r.First) % int fps = 0 then
                        stdoutWrite ("\r" + $"{r.Label}  {seconds (i - r.First)}s / {seconds (r.End - r.First)}s  ")
                    return! work page
            }
        let! _ = workers |> Seq.map work |> Promise.all
        do! flush ()
        ff?stdin?``end`` () |> ignore
        do! closed
        let! failed = session.IsFailed() |> Async.StartAsPromise
        let ok = not failed && exited.Value = Some 0 && written.Value = r.End
        if ok then r.Done()
        elif exited.Value <> Some 0 then eprint $"\nffmpeg failed on {r.Label}"
        return ok
    }

// Entry --------------------------------------------------------------------------------------------------------

/// The `sheet` step without keys replaces every unfiltered sheet, so the old beat-<n>.png and sheet-<n>.png go first.
let private clearUnfilteredSheets (ws: string) =
    let build = join [ ws; "build" ]
    for f in readDir build do
        if (f.StartsWith "beat-" || f.StartsWith "sheet-") && f.EndsWith ".png" then
            let rest = f.Substring(f.IndexOf '-' + 1)
            if rest.Length > 0 && System.Char.IsDigit rest.[0] then remove (join [ build; f ])

/// Never completes: serve runs until Ctrl+C.
let private forever () : Async<int> = Async.FromContinuations(fun _ -> ())

/// Opens headless Chrome on the clip and runs `job` with the session and its first page; returns an exit code
/// (1 when a page reported an error).
let private withChrome (clip: string) (job: Session -> obj -> Async<int>) : Async<int> =
    async {
        let! server = startServer clip ForRender
        match findChrome () with
        | None ->
            eprint "no Chrome found: set CHROME to the browser's executable"
            server.Close()
            return 2
        | Some chrome ->
            let puppeteer = requireFromHome "puppeteer-core"
            let! (browser: obj) =
                fromJs (
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
            let! code = job session first
            do! fromJs (browser?close ())
            server.Close()
            let! failed = session.IsFailed()
            return (if code <> 0 then code elif failed then 1 else 0)
    }

/// mode: stills | sheet | serve; returns an exit code.
let run (ws: string) (mode: string) (args: string list) : Async<int> =
    async {
        let clip = resolve ws
        if mode = "sheet" && args.IsEmpty then clearUnfilteredSheets clip
        if mode = "serve" then
            let! server = startServer clip ForRender
            JS.console.log $"{server.Url}?preview   (click the page to start; ?t=12.5 freezes one moment)"
            JS.console.log "Ctrl+C to stop."
            return! forever ()
        else
            return!
                withChrome clip (fun _ first ->
                    match mode with
                    | "stills" ->
                        async {
                            do! stills clip first args
                            return 0
                        }
                    | _ -> sheet clip first args)
    }

/// Draws the frame at each time and writes it as a JPEG to its file (the `present` step's slides); returns an exit code.
let shots (ws: string) (wanted: (float * string) list) : Async<int> =
    withChrome (resolve ws) (fun _ first ->
        async {
            for t, file in wanted do
                do! fromJs (first?evaluate (renderAt, t))
                let! jpg = fromJs (first?screenshot (createObj [ "type" ==> "jpeg"; "quality" ==> 90 ]))
                writeBytes file jpg
            return 0
        })

/// The pages to render on: the first, and more opened one after another until there are as many as asked.
let rec private openPages (session: Session) (count: float) (pages: obj list) : Async<obj list> =
    async {
        if float pages.Length < count then
            let! page = session.OpenPage()
            return! openPages session count (pages @ [ page ])
        else
            return pages
    }

/// Renders the runs one after another and stops at the first that fails: the frames of the runs that finished, and
/// whether every run did.
let rec private renderAll (session: Session) (pages: obj list) (fps: float) (jobs: Range list) (frames: int) : Async<int * bool> =
    async {
        match jobs with
        | [] -> return frames, true
        | job :: rest ->
            let! finished = renderRange session pages fps job |> Async.AwaitPromise
            // the old frame counter wrapped at 32 bits (`| 0`); Fable leaves it out for an argument
            if finished then return! renderAll session pages fps rest ((frames + job.End - job.First) ||| 0)
            else return frames, false
    }

/// Renders the runs one after another, in one Chrome. Stops at the first that fails; returns an exit code.
let ranges (ws: string) (fps: float) (jobs: Range list) : Async<int> =
    withChrome (resolve ws) (fun session first ->
        async {
            let workerCount = env "WORKERS" |> Option.map jsNumber |> Option.defaultValue 4.0
            let! pages = openPages session workerCount [ first ]
            let start = JS.Constructors.Date.now ()
            let! frames, ok = renderAll session pages fps jobs 0
            JS.console.log $"\nrendered {frames} frames in {toFixed 1 ((JS.Constructors.Date.now () - start) / 1000.0)}s"
            return (if ok then 0 else 1)
        })
