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

let run (ws: string) (args: string list) : JS.Promise<int> =
    let arg n fallback = args |> List.tryItem n |> Option.defaultValue fallback
    let t0, t1, step = jsNumber (arg 0 "0"), jsNumber (arg 1 "1e9"), jsNumber (arg 2 "0.25")
    let clip = resolve ws
    promise {
        let! server = startServer clip ForScan
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
                        createObj [ "executablePath" ==> chrome; "headless" ==> true; "args" ==> [| "--font-render-hinting=none" |] ]
                    )
                )
            let! (page: obj) = awaitJs (browser?newPage ())
            let logs = ResizeArray<string>()
            page?on ("console", (fun (m: obj) -> logs.Add(m?text ()))) |> ignore
            page?on ("pageerror", (fun (e: obj) -> logs.Add("PAGE ERROR " + e?message))) |> ignore
            do! awaitJs (page?setViewport (createObj [ "width" ==> 1920; "height" ==> 1080 ]))
            do! awaitJs (page?goto (server.Url, createObj [ "waitUntil" ==> "load" ]))
            do! awaitJs (page?evaluate (browserFn "() => window.ready"))
            let! (d: float) = awaitJs (page?evaluate (browserFn "() => window.DURATION"))
            let frames = ResizeArray<obj>()
            let scanAt = browserFn itemsAt
            let t = ref t0
            while t.Value <= min t1 d do
                let now = t.Value
                let! (items: obj) = awaitJs (page?evaluate (scanAt, now))
                frames.Add(createObj [ "t" ==> jsNumber (toFixed 2 now); "items" ==> items ])
                if frames.Count % 200 = 0 then proc?stdout?write ("\r" + $"{toFixed 0 now}s / {toFixed 0 d}s") |> ignore
                t.Value <- now + step
            let out = join [ clip; "build"; "scan.json" ]
            writeText out (toJson (createObj [ "step" ==> step; "logs" ==> logs; "frames" ==> frames ]))
            let errors = logs |> Seq.filter isError |> List.ofSeq
            JS.console.log $"\n{frames.Count} frames, {errors.Length} page errors -> {out}"
            for l in errors do
                JS.console.log ("  " + l)
            do! awaitJs (browser?close ())
            server.Close()
            return 0
    }
