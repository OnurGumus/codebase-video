/// Thin bindings to the Node built-ins the engine uses, plus the engine's paths. Everything else (puppeteer-core,
/// kokoro-js) is installed by `setup` into the tool home and loaded with `requireFromHome`, so the engine itself can
/// sit in a read-only plugin cache.
module Node

open Fable.Core
open Fable.Core.JsInterop

let fs: obj = importAll "node:fs"
let fsp: obj = importAll "node:fs/promises"
let path: obj = importAll "node:path"
let os: obj = importAll "node:os"
let url: obj = importAll "node:url"
let crypto: obj = importAll "node:crypto"
let childProcess: obj = importAll "node:child_process"
let http: obj = importAll "node:http"
let nodeModule: obj = importAll "node:module"

[<Emit("process")>]
let proc: obj = jsNative

[<Emit("import.meta.url")>]
let private importMetaUrl: string = jsNative

// Paths --------------------------------------------------------------------------------------------------------

[<Emit("$0.join(...$1)")>]
let private joinArr (p: obj) (parts: string[]) : string = jsNative

/// path.join over any number of parts.
let join (parts: string list) : string = joinArr path (List.toArray parts)
let resolve (p: string) : string = path?resolve(p)
let dirname (p: string) : string = path?dirname(p)
let basename (p: string) : string = path?basename(p)
let extname (p: string) : string = path?extname(p)
let relative (fromDir: string) (toPath: string) : string = path?relative(fromDir, toPath)
let sep: string = path?sep

/// The engine directory (this file compiles to engine/cli/Node.js).
[<Emit("new URL($0, $1)")>]
let private newUrl (rel: string) (baseUrl: string) : obj = jsNative

let engineDir: string = resolve (url?fileURLToPath(newUrl ".." importMetaUrl))
/// The plugin root (engine's parent): briefs/, skills/.
let pluginRoot: string = dirname engineDir

// Process ------------------------------------------------------------------------------------------------------

let env (name: string) : string option =
    let v: string = proc?env?(name)
    if isNull v || v = "" then None else Some v

/// Command-line arguments after `node Cv.js`.
let argv: string list =
    match (proc?argv: string[]) |> Array.toList with
    | _ :: _ :: rest -> rest
    | _ -> []
let exit (code: int) : 'a = proc?exit(code)
let cwd () : string = proc?cwd()
let homedir: string = os?homedir()
let platform: string = proc?platform
let uid () : int = if platform = "win32" then 0 else proc?getuid()
let eprint (s: string) : unit = JS.console.error s

/// The tool home: CODEBASE_VIDEO_HOME (the plugin passes its data dir), default ~/.cache/codebase-video.
let toolHome: string =
    env "CODEBASE_VIDEO_HOME" |> Option.defaultWith (fun () -> join [ homedir; ".cache"; "codebase-video" ])

/// require() a package installed in <tool home>/node by `setup`.
let requireFromHome (name: string) : obj =
    let req: obj = nodeModule?createRequire(join [ toolHome; "node"; "package.json" ])
    req $ name

// Files --------------------------------------------------------------------------------------------------------

let exists (p: string) : bool = fs?existsSync(p)
let isDir (p: string) : bool = exists p && fs?statSync(p)?isDirectory()
let readText (p: string) : string = fs?readFileSync(p, "utf8")
let writeText (p: string) (s: string) : unit = fs?writeFileSync(p, s)
/// A Buffer.
let readBytes (p: string) : obj = fs?readFileSync(p)
let writeBytes (p: string) (data: obj) : unit = fs?writeFileSync(p, data)
let mkdirp (p: string) : unit = fs?mkdirSync(p, createObj [ "recursive" ==> true ]) |> ignore
let remove (p: string) : unit = fs?rmSync(p, createObj [ "force" ==> true; "recursive" ==> true ])
let readDir (p: string) : string list = (fs?readdirSync(p): string[]) |> Array.toList
let copyFile (src: string) (dst: string) : unit = fs?copyFileSync(src, dst)
let copyDir (src: string) (dst: string) : unit = fs?cpSync(src, dst, createObj [ "recursive" ==> true ])
let rename (src: string) (dst: string) : unit = fs?renameSync(src, dst)
let mtime (p: string) : float = fs?statSync(p)?mtimeMs

// JSON ---------------------------------------------------------------------------------------------------------

let parseJson (s: string) : obj = JS.JSON.parse s
let readJson (p: string) : obj = parseJson (readText p)
let toJson (o: obj) : string = JS.JSON.stringify o
let toJsonIndented (o: obj) (indent: int) : string = JS.JSON.stringify(o, unbox null, indent)

// Hashing ------------------------------------------------------------------------------------------------------

let sha1Hex (s: string) : string = crypto?createHash("sha1")?update(s, "utf8")?digest("hex")

// Child processes ----------------------------------------------------------------------------------------------

/// Runs a command with inherited stdio and returns its exit status.
let run (cmd: string) (args: string list) : int =
    let r = childProcess?spawnSync(cmd, List.toArray args, createObj [ "stdio" ==> "inherit" ])
    if isNull r?error then (r?status: int) else 127

/// Runs a command and returns (status, stdout, stderr).
let runCapture (cmd: string) (args: string list) : int * string * string =
    let r =
        childProcess?spawnSync(cmd, List.toArray args, createObj [ "encoding" ==> "utf8"; "maxBuffer" ==> (1 <<< 28) ])
    if isNull r?error then (r?status: int), (r?stdout: string), (r?stderr: string) else 127, "", string r?error

/// True when the command is on PATH.
let hasCommand (cmd: string) : bool =
    let probe = if platform = "win32" then "where" else "which"
    let status, _, _ = runCapture probe [ cmd ]
    status = 0
