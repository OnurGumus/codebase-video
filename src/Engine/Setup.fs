/// One-time setup: installs everything the engine needs that is not a system tool, into the tool home
/// (CODEBASE_VIDEO_HOME, default ~/.cache/codebase-video; the plugin passes its persistent data dir).
///   - kokoro-js (the local, offline text-to-speech voice) and the full eSpeak NG it gets phonemes from
///   - the Kokoro v1.0 model (about 330 MB, downloaded once from Hugging Face into <tool home>/models; checked for
///     its size on every run and its hash after a download, so a download that was stopped is made again)
///   - puppeteer-core (drives your installed browser; it does not download one)
///   - pptxgenjs and jszip (write the .pptx of the `present` step; only that step needs them)
/// System tools it checks for but does not install: node (22.12+), npm, ffmpeg (with libx264, libvpx-vp9, libopus)
/// and a browser built on Chromium (Chrome, Chromium, Edge or Brave; CHROME names any other). Safe to run again:
/// finished steps are skipped. Port of engine/setup.sh (without Python).
module Setup

open Fable.Core
open Fable.Core.JsInterop
open FsToolkit.ErrorHandling
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
    [ yield! Option.toList (env "CHROME"); yield! Render.browserPaths ]

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

/// The oldest Node the engine runs on: puppeteer-core 25 is an ES module, which require() loads from Node 22.12 on
/// (it also says so in its "engines").
let private minimumNode = 22, 12

/// The running Node's version as (major, minor), from process.versions.node ("22.12.0").
let private nodeVersion () : int * int =
    let parts = (proc?versions?node: string).Split('.')
    int parts[0], int parts[1]

/// Checks the system tools and installs the packages as `run` is called, before the Async starts; a check that fails
/// ends setup with the lines that say what is missing and status 2. Then fetches the model and voices a word. Returns
/// an exit code. (An exception in the checks, e.g. a tool home that cannot be made, is thrown from `run` itself.)
let run () : Async<int> =
    mkdirp toolHome
    let missing = [ "node"; "npm"; "ffmpeg" ] |> List.filter (hasCommand >> not)
    let major, minor = minimumNode
    let prepared: Result<string, string list> =
        result {
            do!
                nodeVersion () >= minimumNode
                |> Result.requireTrue
                    [ $"Node.js {proc?versions?node} is too old: the engine needs Node.js {major}.{minor} or newer"
                      "  macOS:  brew install node   (or brew upgrade node)"
                      "  other systems:  the LTS release from https://nodejs.org" ]
            do!
                missing
                |> Result.requireEmpty
                    [ "missing system tools: " + String.concat " " missing
                      "  macOS:  brew install node ffmpeg"
                      $"  Debian/Ubuntu:  sudo apt install ffmpeg; Node.js {major}.{minor} or newer (with npm) from https://nodejs.org" ]
            let _, encoders, _ = runCapture "ffmpeg" [ "-hide_banner"; "-encoders" ]
            do!
                match [ "libx264"; "libvpx-vp9"; "libopus" ] |> List.tryFind (fun codec -> not (encoders.Contains codec)) with
                | Some codec -> Error [ $"ffmpeg lacks the {codec} encoder" ]
                | None -> Ok()
            let! chrome =
                chromeCandidates ()
                |> List.tryFind (fun c -> c <> "" && executable c)
                |> Result.requireSome
                    [ "no Chrome, Chromium, Edge or Brave found: install one, or set CHROME to its executable" ]

            let nodeDir = join [ toolHome; "node" ]
            mkdirp nodeDir
            let manifest = join [ nodeDir; "package.json" ]
            let wanted = packageJson ()
            let stale = not (exists manifest) || readText manifest <> wanted
            let names = dependencies |> List.map fst
            if stale || names |> List.exists (Narrate.packageInstalled >> not) then
                printfn "%s" ("installing " + String.concat ", " names)
                writeText manifest wanted
                do!
                    if runIn nodeDir "npm" [ "install"; "--silent"; "--no-audit"; "--no-fund" ] <> 0 then
                        Error [ $"npm install failed in {nodeDir}" ]
                    else Ok()
            return chrome
        }
    match prepared with
    | Error lines ->
        lines |> List.iter eprint
        async.Return 2
    | Ok chrome ->
        async {
            // The model, fetched once so the first narrate does not stall; the voices (af_heart and the others) ship
            // inside kokoro-js. Its size is checked on every run, so a download that was stopped is made again.
            // Voicing a word checks the whole chain: eSpeak NG, the model and the voice.
            match Narrate.modelState () with
            | Narrate.ModelReady -> ()
            | state ->
                match state with
                | Narrate.ModelIncomplete _ -> printfn "%s" $"{Narrate.modelProblem state}. Downloading it again"
                | _ -> printfn "%s" $"downloading the Kokoro model (about 330 MB) into {Narrate.modelDir ()}"
                do! Narrate.downloadModel ()
                do! Narrate.selfTest ()
            printfn "%s" $"ready: voice, renderer and encoder are set up in {toolHome} (browser: {chrome})"
            return 0
        }

/// The setup hint when the tool home is not ready (every step but `present` needs these packages).
let requireReady () : Result<unit, string> = Narrate.requirePackages core
