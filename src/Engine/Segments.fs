/// Splits a video into one segment per scene of build/timing.json and gives each a cache key, so the `video` step
/// renders and encodes only the scenes whose frames can have changed (src/Engine/Video.fs keeps the encoded
/// segments in build/segments/<key>.*).
///
/// A frame is a pure function of its time and the workspace files. The narrate step ends every scene on a whole
/// frame, so scene k is exactly the frames [start*30, end*30) and a frame's time measured from its scene's start
/// does not depend on what comes before the scene. The key is the sha1 of a JSON of everything a frame inside the
/// scene can read, with every time measured from the scene's start:
///   - the frame rate and size, the browser, the encoder settings;
///   - the engine's browser side (engine/web, engine/stage.css, any other /engine/ file clip.html names);
///   - clip.html and the other loadable files next to it; the workspace's folders (assets/...) that the scene's
///     module, clip.html or one of those files names;
///   - the scene's own timing, and its neighbours' (a toast, a [think] countdown or a caption can cross a boundary);
///   - its module file (<prefix>.js), the timing of every scene with the same prefix and of every scene the module's
///     text names (as a quoted id, "p2-video" or "p2-video|word", or by another module's prefix, "p2-"), and when the
///     module is on screen (its runs, as src/Kit/Frame.fs computes them);
///   - the chapters as the frame draws them: how many, which are finished, which are still to come, and the title
///     and times of the ones that touch the scene (the progress bar, the chapter card and the label);
///   - the shared map (timing "map"), when the scene can show it: its own "path" or "inside", those of the scene
///     before it (the opener fades out over the lead of the scene after its bridge), or a module that draws it
///     with K.map; and the "path" of the scene's chapter, which is what is lit;
///   - the title card, and the few times the frame uses from elsewhere in the video (time 0, the end of the title,
///     the first chapter's start, the outro's start, the total duration). Each of those only matters within half a
///     second of itself, so when it is more than 3 s outside the scene it is recorded as "before" or "after".
/// Not in the key: the absolute position of the scene. The renderer draws each frame a microsecond late so that
/// rounding in the last bit, which does depend on the position, cannot decide anything (frameTime in Render.fs).
/// When unsure, the key includes more: a clip that is not a long-video frame, a clip.html with its own scripts, or a
/// module that reads the timing directly gets the whole timing in its key. A wrong reuse would be a silent bug; an
/// unnecessary re-render only costs time.
///
/// A timing.json whose scenes do not start on whole frames (narrated by an older engine) still gets segments, but
/// with absolute times in the keys: a visual fix is still cheap, a narration change re-renders everything after it.
module Segments

open Fable.Core
open Fable.Core.JsInterop
open Node

/// One scene's stretch of the video.
type Segment =
    { Id: string
      /// sha1 of Input
      Key: string
      /// frames [First, End)
      First: int
      End: int
      /// the JSON the key is the hash of (written next to the segment, to see why a scene was rendered again)
      Input: string }

/// Bump when the key's meaning changes, so segments cached by an older engine are not reused.
let private VERSION = 2

[<Emit("typeof $0")>]
let private jsTypeof (o: obj) : string = jsNative

[<Emit("Array.isArray($0)")>]
let private isArray (o: obj) : bool = jsNative

[<Emit("Object.keys($0)")>]
let private keys (o: obj) : string[] = jsNative

[<Emit("!!$0")>]
let private truthy (o: obj) : bool = jsNative

[<Emit("($0 == null)")>]
let private isNil (o: obj) : bool = jsNative

[<Emit("Math.round($0)")>]
let private jsRound (x: float) : float = jsNative

/// Does a module's text name the scene `id`? As a quoted time spec ("id", "id|word", "id#2"), or by building ids
/// of that scene's module from its prefix ("p2-" + name).
let private names (text: string) (id: string) : bool =
    let quotes = [ "\""; "'"; "`" ]
    let spec = quotes |> List.exists (fun q -> (quotes @ [ "|"; "#" ]) |> List.exists (fun e -> text.Contains(q + id + e)))
    let built = id.Contains "-" && quotes |> List.exists (fun q -> text.Contains(q + id.Split('-').[0] + "-"))
    spec || built

[<Emit("/TIMING|\\.timing\\b|DURATION|\\.scenes\\b/.test($0)")>]
let private readsTiming (text: string) : bool = jsNative

[<Emit("/\\b(document|window)(\\.[A-Za-z_$]|\\[)|\\bglobalThis\\b/.test($0)")>]
let private touchesPage (text: string) : bool = jsNative

[<Emit("Array.from($0.matchAll(/\\/engine\\/([^\"'\\s)>?#]+)/g), (m) => m[1])")>]
let private engineRefs (html: string) : string[] = jsNative

[<Emit("($0.match(/<script\\b/g) || []).length")>]
let private scriptCount (html: string) : int = jsNative

/// File types the render server knows, plus the usual other things a page loads.
let private loadable =
    set [ ".html"; ".js"; ".mjs"; ".css"; ".png"; ".jpg"; ".jpeg"; ".gif"; ".webp"; ".svg"; ".woff"; ".woff2"; ".ttf"; ".otf" ]

let private isText (file: string) = [ ".html"; ".js"; ".mjs"; ".css"; ".svg" ] |> List.contains (extname file)

/// A copy of a piece of the timing with every "start" and "end" replaced by `rel` of it.
let rec private shifted (rel: float -> obj) (v: obj) : obj =
    if isNil v then null
    elif isArray v then box (unbox<obj[]> v |> Array.map (shifted rel))
    elif jsTypeof v = "object" then
        let o = createObj []
        for k in keys v do
            let x: obj = v?(k)
            o?(k) <- if (k = "start" || k = "end") && jsTypeof x = "number" then rel (unbox x) else shifted rel x
        o
    else v

let private prefix (id: string) = id.Split('-').[0]

/// A chapter as src/Kit/Frame.fs computes it.
type private Chapter = { Title: obj; Path: obj; Start: float; End: float; Talk: float option }

/// What the frame's module layer does with one module: on screen from Start to End, or to the last frame.
type private Run = { Start: float; mutable End: float }

/// name -> "size sha1" for the files under a directory (or just the named files).
let private hashFiles (dir: string) (files: string list) : obj =
    let o = createObj []
    for f in files do
        let p = join [ dir; f ]
        o?(f) <- $"{fileSize p} {sha1File p}"
    o

/// Do the scenes of build/timing.json start and end on whole frames (narrated by this engine)?
let wholeFrames (ws: string) (fps: int) : bool =
    let timing = readJson (join [ ws; "build"; "timing.json" ])
    let whole (x: float) = abs (x * float fps - jsRound (x * float fps)) < 1e-6
    whole timing?duration && (timing?scenes: obj[]) |> Array.forall (fun s -> whole s?start && whole s?``end``)

/// The segments of the workspace's video, in order. `fps` is the frame rate, `size` the frame size,
/// `browser` and `encoder` identify what draws and what encodes.
let plan (ws: string) (fps: int) (size: string) (browser: string) (encoder: string) : Segment list =
    let timing = readJson (join [ ws; "build"; "timing.json" ])
    let scenes: obj[] = timing?scenes
    let duration: float = timing?duration
    let ffps = float fps
    let startOf (s: obj) : float = s?start
    let endOf (s: obj) : float = s?``end``
    let idOf (s: obj) : string = string s?id
    let aligned = wholeFrames ws fps
    let frameOf (x: float) = int (ceil (x * ffps - 1e-6))
    let total = frameOf duration

    // The files every scene can load.
    let clipHtml = if exists (join [ ws; "clip.html" ]) then readText (join [ ws; "clip.html" ]) else ""
    let long = clipHtml.Contains "id=\"modules\""
    let standardScripts =
        scriptCount clipHtml = 2 && clipHtml.Contains "src=\"build/timing.js\"" && clipHtml.Contains "/engine/web/Main.js"
    let engineFiles =
        (walk (join [ engineDir; "web" ]) |> List.map (fun f -> "web/" + f))
        @ [ "stage.css" ]
        @ (engineRefs clipHtml |> Array.toList |> List.filter (fun f -> exists (join [ engineDir; f ]) && not (isDir (join [ engineDir; f ]))))
        |> List.distinct
        |> List.sort
    let engine = sha1Hex (toJson (hashFiles engineDir engineFiles))

    // The modules the frame loads (src/Kit/Frame.fs): every scene prefix except bridges, the title and recaps,
    // each on screen during the runs of its consecutive scenes.
    let runs = System.Collections.Generic.Dictionary<string, ResizeArray<Run>>()
    let mutable prev: string = null
    for s in scenes do
        let id = idOf s
        if id.EndsWith "-why" || id = "title" || truthy s?recap then prev <- null
        else
            let k = prefix id
            if not (runs.ContainsKey k) then runs[k] <- ResizeArray()
            let sentences: obj[] = s?sentences
            let first = if sentences.Length > 0 then (sentences[0]?start: float) else startOf s
            if prev = k then runs[k].[runs[k].Count - 1].End <- endOf s
            else runs[k].Add { Start = max (startOf s) (first - 0.45); End = endOf s }
            prev <- k
    let moduleText (k: string) : string option =
        let f = join [ ws; k + ".js" ]
        if exists f then Some(readText f) else None

    // Files next to clip.html that a page could load, other than the module files (those count per scene).
    let rootFiles =
        readDir ws
        |> List.filter (fun f ->
            not (isDir (join [ ws; f ]))
            && loadable.Contains((extname f).ToLower())
            && (not (f.EndsWith ".js" && runs.ContainsKey(f.Substring(0, f.Length - 3))) || clipHtml.Contains f))
        |> List.sort
    let rootHashes = hashFiles ws rootFiles
    let rootText = rootFiles |> List.filter isText |> List.map (fun f -> readText (join [ ws; f ])) |> String.concat "\n"
    // A module that reaches for the page itself can change what other modules' scenes look like.
    let pageModules =
        createObj
            [ for k in runs.Keys |> Seq.sort do
                  match moduleText k with
                  | Some text when touchesPage text -> yield k ==> sha1Hex text
                  | _ -> () ]

    // The workspace's folders (assets/...), hashed when first needed.
    let folders =
        readDir ws
        |> List.filter (fun d -> isDir (join [ ws; d ]) && d <> "build" && d <> "out" && d <> "node_modules" && not (d.StartsWith "."))
        |> List.sort
    let folderHash =
        let cache = System.Collections.Generic.Dictionary<string, obj>()
        fun (d: string) ->
            if not (cache.ContainsKey d) then cache[d] <- hashFiles (join [ ws; d ]) (walk (join [ ws; d ]))
            cache[d]

    // Chapters (src/Kit/Frame.fs): a "-why" bridge and everything up to the next bridge or the outro.
    let chapters =
        let groups = ResizeArray<ResizeArray<obj>>()
        for s in scenes do
            let id = idOf s
            if id.EndsWith "-why" then groups.Add(ResizeArray [ s ])
            elif groups.Count > 0 && id <> "outro" && prefix id <> "outro" then groups[groups.Count - 1].Add s
        [ for g in groups ->
              let finish = endOf g[g.Count - 1]
              { Title = (if truthy g[0]?chapter then g[0]?chapter else g[0]?id)
                Path = (if truthy g[0]?path then g[0]?path else null)
                Start = startOf g[0]
                End = finish
                Talk =
                  match g |> Seq.tryFind (fun s -> not ((idOf s).EndsWith "-why")) with
                  | Some content ->
                      let sentences: obj[] = content?sentences
                      if sentences.Length > 0 then Some(sentences[0]?start: float) else None
                  | None -> Some finish } ]
    let titleScene = scenes |> Array.tryFind (fun s -> idOf s = "title")
    let outro = scenes |> Array.tryFind (fun s -> prefix (idOf s) = "outro")

    // How far past its end a scene can still draw: a caption or a countdown a moment, a toast for its "dur".
    let tail (s: obj) : float =
        let toasts: obj[] = if isArray s?toasts then s?toasts else [||]
        let longest =
            toasts
            |> Array.map (fun d -> if jsTypeof d?dur = "number" then (d?dur: float) else 3.2)
            |> Array.fold max 0.0
        1.0 + longest

    [ for k in 0 .. scenes.Length - 1 do
          let s = scenes[k]
          let id = idOf s
          let s0, s1 = startOf s, endOf s
          let first = if k = 0 then 0 else frameOf s0
          let finish = if k = scenes.Length - 1 then total else frameOf (startOf scenes[k + 1])
          // Times from the scene's start, in whole microseconds (times differ by 1/6000 s or more, so float noise
          // cannot change one). Without whole-frame scenes there is no "from the scene's start": absolute times.
          let origin = if aligned then s0 else 0.0
          let rel (x: float) : obj = box (jsRound ((x - origin) * 1e6))
          let far (x: float) : obj =
              if not aligned then rel x
              elif x < s0 - 3.0 then box "before"
              elif x > s1 + 3.0 then box "after"
              else rel x
          let sceneAt (i: int) = shifted rel scenes[i]

          let p = prefix id
          let text = moduleText p
          let whole = not long || not standardScripts || (match text with Some t -> readsTiming t | None -> false)

          // Neighbours: the scene before and after, every later scene that starts within a second of this one's
          // end, and every earlier scene back to the first one that can still draw here.
          let before =
              let reach = [ 0 .. k - 1 ] |> List.tryFind (fun j -> endOf scenes[j] + tail scenes[j] > s0)
              let from = min (defaultArg reach (k - 1)) (k - 1)
              [| for j in max 0 from .. k - 1 -> sceneAt j |]
          let after =
              [| for j in k + 1 .. scenes.Length - 1 do
                     if j = k + 1 || startOf scenes[j] < s1 + 1.0 then sceneAt j |]

          let referenced =
              [| for j in 0 .. scenes.Length - 1 do
                     let other = idOf scenes[j]
                     if j <> k && (prefix other = p || (match text with Some t -> names t other | None -> false)) then
                         sceneAt j |]
          let moduleRuns =
              if runs.ContainsKey p then
                  [| for r in runs[p] -> createObj [ "start" ==> rel r.Start; "end" ==> rel r.End; "holds" ==> (r.End >= duration - 0.05) ] |]
              else [||]
          // A chapter that ended by the scene's first frame only shows as a full piece of the progress bar (its card and
          // label have faded out by its end); one that starts at the scene's end or later, as an empty piece.
          let chapterList =
              [| for i, c in List.indexed chapters ->
                     if aligned && c.End <= s0 then box "done"
                     elif aligned && c.Start >= s1 then box "todo"
                     else
                         createObj
                             [ "n" ==> i + 1
                               "title" ==> c.Title
                               "path" ==> c.Path
                               "start" ==> rel c.Start
                               "end" ==> rel c.End
                               "talk" ==> (match c.Talk with Some t -> rel t | None -> null) ] |]
          // The shared map is drawn in a scene with a "path" or an "inside", in the scene after one (the opener fades
          // out over the next scene's lead), and wherever a module draws it itself.
          let marked (j: int) = j >= 0 && j < scenes.Length && (truthy scenes[j]?path || truthy scenes[j]?inside)
          let showsMap =
              truthy timing?map
              && (marked k || marked (k - 1) || (match text with Some t -> t.Contains ".map(" | None -> false))
          let chapterPath =
              chapters |> List.tryFind (fun c -> c.Start <= s0 && s0 < c.End) |> Option.map (fun c -> c.Path) |> Option.toObj
          let title =
              match titleScene with
              | None -> null
              | Some t ->
                  let gone = aligned && endOf t < s0 - 3.0
                  createObj [ "end" ==> far (endOf t); "scene" ==> (if gone then null else shifted rel t) ]
          // Everything the page can see of a folder is behind its name.
          let sources = (defaultArg text "") + "\n" + clipHtml + "\n" + rootText
          let assets = createObj [ for d in folders do if sources.Contains d then yield d ==> folderHash d ]
          let wholeTiming =
              if not whole then null
              else
                  let o = shifted rel timing
                  o?duration <- rel duration
                  if jsTypeof timing?poster = "number" then o?poster <- rel timing?poster
                  o

          let input =
              toJson (
                  createObj
                      [ "version" ==> VERSION
                        "fps" ==> fps
                        "size" ==> size
                        "browser" ==> browser
                        "encoder" ==> encoder
                        "engine" ==> engine
                        "clip" ==> sha1Hex clipHtml
                        "files" ==> rootHashes
                        "pageModules" ==> pageModules
                        "assets" ==> assets
                        "aligned" ==> aligned
                        "frames" ==> (if aligned then box (finish - first) else box [| first; finish |])
                        "voiced" ==> timing?voiced
                        "card" ==> (if isNil timing?card then null else timing?card)
                        "captions" ==> (if isNil timing?captions then false else timing?captions)
                        "scene" ==> sceneAt k
                        "before" ==> before
                        "after" ==> after
                        "module" ==> (match text with Some t -> sha1Hex t | None -> "missing")
                        "moduleScenes" ==> referenced
                        "runs" ==> moduleRuns
                        "chapters" ==> chapterList
                        "map" ==> (if showsMap then timing?map else null)
                        // the video's kind: it decides the recap card's mark as well as how the map is lit
                        "kind" ==> (if isNil timing?kind then null else timing?kind)
                        "chapterPath" ==> (if showsMap then chapterPath else null)
                        "zero" ==> far 0.0
                        "title" ==> title
                        "firstChapter" ==> (match chapters with c :: _ -> far c.Start | [] -> null)
                        "outro" ==> (match outro with Some o -> far (startOf o) | None -> null)
                        "duration" ==> far duration
                        "timing" ==> wholeTiming ]
              )
          if finish > first then
              { Id = id; Key = sha1Hex input; First = first; End = finish; Input = input } ]
