/// One-time setup: installs everything the engine needs that is not a system tool, into the tool home
/// (CODEBASE_VIDEO_HOME, default ~/.cache/codebase-video; the plugin passes its persistent data dir).
///   - kokoro-js (the local, offline text-to-speech voice) and the full eSpeak NG it gets phonemes from
///   - the Kokoro v1.0 model (about 330 MB, downloaded once from Hugging Face into <tool home>/models)
///   - puppeteer-core (drives your installed Chrome or Chromium; it does not download a browser)
///   - pptxgenjs and jszip (write the .pptx of the `present` step; only that step needs them)
/// System tools it checks for but does not install: node (18+), npm, ffmpeg (with libx264, libvpx-vp9, libopus) and
/// Chrome or Chromium. Safe to run again: finished steps are skipped. Port of engine/setup.sh (without Python).
module Setup

open Fable.Core
open Fable.Core.JsInterop
open Node

/// The packages setup installs into <tool home>/node, with their versions.
let private dependencies =
    [ "puppeteer-core", "^25.12.0"
      "kokoro-js", "1.2.1"
      "@echogarden/espeak-ng-emscripten", "0.3.5"
      "pptxgenjs", "4.0.1"
      "jszip", "3.10.1" ]

/// What every step but `present` needs: a tool home set up before pptxgenjs was added still renders and voices.
let private core = [ "puppeteer-core"; "kokoro-js"; "@echogarden/espeak-ng-emscripten" ]

let private packageJson () =
    toJsonIndented
        (createObj
            [ "name" ==> "codebase-video-engine"
              "private" ==> true
              "type" ==> "module"
              "description" ==> "Renders and voices narrated videos for engine/cli/Cv.js (installed by its setup step)."
              "dependencies" ==> createObj [ for name, version in dependencies -> name ==> version ] ])
        2
    + "\n"

let private chromeCandidates () =
    [ yield! Option.toList (env "CHROME")
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
      "/usr/bin/google-chrome"
      "/usr/bin/google-chrome-stable"
      "/usr/bin/chromium"
      "/usr/bin/chromium-browser" ]

let private executable (p: string) : bool =
    try
        fs?accessSync(p, fs?constants?X_OK)
        true
    with _ ->
        false

/// Runs a command in a directory with inherited stdio; returns its exit status.
let private runIn (dir: string) (cmd: string) (args: string list) : int =
    let r =
        childProcess?spawnSync(
            cmd,
            List.toArray args,
            createObj [ "cwd" ==> dir; "stdio" ==> "inherit"; "shell" ==> (platform = "win32") ]
        )
    if isNull r?error then (r?status: int) else 127

let private failWith (message: string) : 'a =
    eprint message
    exit 2

let run () : JS.Promise<int> =
    mkdirp toolHome
    let missing = [ "node"; "npm"; "ffmpeg" ] |> List.filter (hasCommand >> not)
    if not missing.IsEmpty then
        eprint ("missing system tools: " + String.concat " " missing)
        eprint "  macOS:  brew install node ffmpeg"
        failWith "  Debian/Ubuntu:  sudo apt install nodejs npm ffmpeg"
    let _, encoders, _ = runCapture "ffmpeg" [ "-hide_banner"; "-encoders" ]
    for codec in [ "libx264"; "libvpx-vp9"; "libopus" ] do
        if not (encoders.Contains codec) then failWith $"ffmpeg lacks the {codec} encoder"
    let chrome =
        match chromeCandidates () |> List.tryFind (fun c -> c <> "" && executable c) with
        | Some c -> c
        | None -> failWith "no Chrome or Chromium found: install one, or set CHROME to its executable"

    let nodeDir = join [ toolHome; "node" ]
    mkdirp nodeDir
    let manifest = join [ nodeDir; "package.json" ]
    let wanted = packageJson ()
    let stale = not (exists manifest) || readText manifest <> wanted
    let names = dependencies |> List.map fst
    if stale || names |> List.exists (Narrate.packageInstalled >> not) then
        printfn "%s" ("installing " + String.concat ", " names)
        writeText manifest wanted
        if runIn nodeDir "npm" [ "install"; "--silent"; "--no-audit"; "--no-fund" ] <> 0 then
            failWith $"npm install failed in {nodeDir}"

    promise {
        // The model, fetched once so the first narrate does not stall; the voices (af_heart and the others) ship
        // inside kokoro-js. Voicing a word checks the whole chain: eSpeak NG, the model and the voice.
        if not (exists (Narrate.modelFile ())) then
            printfn "%s" $"downloading the Kokoro model (about 330 MB) into {Narrate.modelDir ()}"
            do! Narrate.selfTest ()
        printfn "%s" $"ready: voice, renderer and encoder are set up in {toolHome} (browser: {chrome})"
        return 0
    }

/// Exits with a hint to run setup when the tool home is not ready.
let requireReady () : unit =
    Narrate.requirePackages core
