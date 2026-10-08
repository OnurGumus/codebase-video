/// Read-only scan of a clip for the final visual re-audit: renders every `step` seconds and records each visible text
/// element and top-level module SVG with its box and effective opacity, plus any page errors, into build/scan.json.
///   scan [t0=0] [t1=end] [step=0.25]
/// ScanReport turns it into findings (short-lived text, overlaps, empty stages, out-of-bounds, blinks).
/// Port of scan.mjs; build/scan.json is byte-compatible with it.
module Scan

open Fable.Core
open Fable.Core.JsInterop
open Node
open Render

/// What the page reports at time t. Runs in the browser, so it stays JavaScript (see Render.browserFn).
let private itemsAt =
    """(t) => {
    window.render(t);
    window.__ids ??= new WeakMap(); window.__n ??= 0;
    const id = (e) => { if (!window.__ids.has(e)) window.__ids.set(e, ++window.__n); return window.__ids.get(e); };
    const opacity = (el) => {
      let op = 1;
      for (let e = el; e && e.id !== "stage"; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden") return 0;
        op *= parseFloat(cs.opacity);
      }
      return op;
    };
    const layer = (el) => { let r = el; while (r.parentElement && r.parentElement.id !== "modules" && r.parentElement.id !== "stage") r = r.parentElement; return r.id || r.className; };
    const res = [], seen = new Set();
    const walker = document.createTreeWalker(document.getElementById("stage"), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const el = walker.currentNode.parentElement;
      if (!walker.currentNode.textContent.trim() || seen.has(el)) continue;
      seen.add(el);
      const op = opacity(el);
      if (op < 0.05) continue;
      const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect();
      const path = []; for (let a = el; a && a.id !== "stage"; a = a.parentElement) path.push(id(a));
      res.push({ id: id(el), path: path.join("/"), txt: el.textContent.trim().slice(0, 90), op: +op.toFixed(2),
        x: Math.round(r.left), y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(el),
        ...(el.closest(".k-packet") ? { pk: 1 } : {}) });
    }
    // Boxes (code cards, diagram nodes, tables): text may sit inside them, but must not straddle their border.
    for (const box of document.querySelectorAll("#modules .k-code, #modules .k-node, #modules .k-table")) {
      const op = opacity(box), r = box.getBoundingClientRect();
      if (op < 0.05 || r.width < 2) continue;
      res.push({ id: id(box), path: "box", txt: `BOX[${box.className}]`, op: +op.toFixed(2), x: Math.round(r.left),
        y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(box), box: 1 });
    }
    for (const svg of document.querySelectorAll("#modules svg")) {
      if (svg.parentElement.closest("svg")) continue;
      const op = opacity(svg), r = svg.getBoundingClientRect();
      if (op < 0.05 || r.width < 2) continue;
      const fills = [...new Set([...svg.querySelectorAll("[fill]")].map((x) => x.getAttribute("fill")))].slice(0, 6).join(",");
      res.push({ id: id(svg), path: "svg", txt: `SVG[${fills}]`, op: +op.toFixed(2), x: Math.round(r.left), y: Math.round(r.top),
        r: Math.round(r.right), b: Math.round(r.bottom), layer: layer(svg), svg: 1 });
    }
    return res;
  }"""

/// A log line that counts as a page error (a 404 is not one).
[<Emit("/error|failed/i.test($0) && !/Failed to load resource/.test($0)")>]
let private isError (line: string) : bool = jsNative

/// What the page logs, in the order its events come: a console line or a page error; and the question for every line
/// so far.
type private LogMsg =
    | Line of string
    | Lines of AsyncReplyChannel<string list>

/// The page's log: its console and pageerror events post their lines here as they come, at any moment of the scan
/// (the loading page's 404s come before the first sample). Answers with every line so far, in order.
let private startLog () : MailboxProcessor<LogMsg> =
    MailboxProcessor.Start(fun inbox ->
        // newest first
        let rec loop (lines: string list) : Async<unit> =
            async {
                match! inbox.Receive() with
                | Line line -> return! loop (line :: lines)
                | Lines reply ->
                    try
                        reply.Reply(List.rev lines)
                    with _ ->
                        () // the caller's continuation, not the log's
                    return! loop lines
            }
        loop [])

let run (ws: string) (args: string list) : Async<int> =
    let arg n fallback = args |> List.tryItem n |> Option.defaultValue fallback
    let t0, t1, step = jsNumber (arg 0 "0"), jsNumber (arg 1 "1e9"), jsNumber (arg 2 "0.25")
    let clip = resolve ws
    async {
        let! server = startServer clip ForScan
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
                        createObj [ "executablePath" ==> chrome; "headless" ==> true; "args" ==> [| "--font-render-hinting=none" |] ]
                    )
                )
            let! (page: obj) = fromJs (browser?newPage ())
            let log = startLog ()
            page?on ("console", (fun (m: obj) -> log.Post(Line(m?text ())))) |> ignore
            page?on ("pageerror", (fun (e: obj) -> log.Post(Line("PAGE ERROR " + e?message)))) |> ignore
            do! fromJs (page?setViewport (createObj [ "width" ==> 1920; "height" ==> 1080 ]))
            do! fromJs (page?goto (server.Url, createObj [ "waitUntil" ==> "load" ]))
            do! fromJs (page?evaluate (browserFn "() => window.ready"))
            let! (d: float) = fromJs (page?evaluate (browserFn "() => window.DURATION"))
            let scanAt = browserFn itemsAt
            /// The samples from time t on, every `step` seconds to the end: the frames so far (newest first) and
            /// their count.
            let rec sample (t: float) (frames: obj list) (count: int) : Async<obj list * int> =
                async {
                    if t <= min t1 d then
                        let! (items: obj) = fromJs (page?evaluate (scanAt, t))
                        let frames = createObj [ "t" ==> jsNumber (toFixed 2 t); "items" ==> items ] :: frames
                        let count = (count + 1) ||| 0
                        if count % 200 = 0 then proc?stdout?write ("\r" + $"{toFixed 0 t}s / {toFixed 0 d}s") |> ignore
                        return! sample (t + step) frames count
                    else
                        return frames, count
                }
            let! frames, count = sample t0 [] 0
            let! logs = log.PostAndAsyncReply Lines
            let out = join [ clip; "build"; "scan.json" ]
            writeText out (toJson (createObj [ "step" ==> step; "logs" ==> List.toArray logs; "frames" ==> List.toArray (List.rev frames) ]))
            let errors = logs |> List.filter isError
            JS.console.log $"\n{count} frames, {errors.Length} page errors -> {out}"
            errors |> List.iter (fun l -> JS.console.log ("  " + l))
            do! fromJs (browser?close ())
            server.Close()
            return 0
    }
