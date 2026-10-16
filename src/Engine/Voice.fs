/// Which voice narrates, and what stops narration before any work when the choice cannot be carried out.
///
/// The voice comes from the first of these that applies: a `script.json` with a "provider" field; else the project's
/// <repo>/.codebase-video/voice.json; else `script.json`'s own Kokoro fields. `"voice": null` in `script.json` is a
/// silent clip whatever `voice.json` says. Keys come only from the environment, and a command's text only from the
/// user's own <tool home>/voices.json: a project's `voice.json` names a command, it cannot define one.
module Voice

open Fable.Core
open Fable.Core.JsInterop
open System
open System.Text.RegularExpressions
open FsToolkit.ErrorHandling
open Node

/// Who speaks.
type Provider =
    | Kokoro
    | ElevenLabs
    | OpenAI
    /// the region comes from AZURE_SPEECH_REGION
    | Azure of region: string
    | Google
    /// a command the user defined in voices.json: its name and its text
    | Command of name: string * command: string

/// The voice settings of a video, before the speed is known.
type Choice =
    { Provider: Provider
      Name: string
      Model: string option
      Instructions: string option
      /// a phrase's language code to its voice name and language; a cloud voice with no "voices" entry says the
      /// phrase with the main voice, and the code stands for the language
      Others: Map<string, string * string> }

/// A voice ready to speak: a choice with the video's language and pacing.
type Voice =
    { Provider: Provider
      Name: string
      Model: string option
      Instructions: string option
      Lang: string
      Speed: float }

/// Why a voice could not be used; each case carries the values its message names.
type Failure =
    /// the provider's key (or Azure's region) is not set or empty
    | KeyMissing of provider: string * variable: string
    /// a setting is wrong or missing
    | SettingsBad of why: string
    /// the service answered with an error
    | Refused of provider: string * status: int * message: string
    /// the request failed twice (network, timeout)
    | Unreachable of provider: string * message: string
    /// the command exited non-zero, timed out, or wrote no file
    | CommandFailed of name: string * code: int * stderr: string

/// The exit code of a failure (2 for a missing key, else 1) and the lines it prints on stderr.
let describe (failure: Failure) : int * string list =
    match failure with
    | KeyMissing(provider, variable) ->
        2,
        [ $"{provider} needs {variable} in the environment (a key is never read from a file): set it, then run again." ]
    | SettingsBad why -> 1, [ why ]
    | Refused(provider, status, message) -> 1, [ $"{provider} refused the request ({status}): {message}" ]
    | Unreachable(provider, message) -> 1, [ $"{provider} could not be reached: {message}" ]
    | CommandFailed(name, code, stderr) ->
        1, [ $"command {name} failed (exit {code}): {stderr}" ]

/// The provider's name as the messages say it.
let providerName (provider: Provider) : string =
    match provider with
    | Kokoro -> "Kokoro"
    | ElevenLabs -> "ElevenLabs"
    | OpenAI -> "OpenAI"
    | Azure _ -> "Azure"
    | Google -> "Google"
    | Command(name, _) -> $"command {name}"

[<Emit("typeof $0")>]
let private jsTypeof (o: obj) : string = jsNative

[<Emit("Object.entries($0 || {})")>]
let private entries (o: obj) : (string * obj)[] = jsNative

[<Emit("($0 != null && Object.hasOwn($0, $1))")>]
let private has (o: obj) (key: string) : bool = jsNative

/// A string field, when it is a non-empty string.
let private text (o: obj) (key: string) : string option =
    if not (isNull o) && jsTypeof o?(key) = "string" && (unbox<string> o?(key)) <> "" then Some(unbox<string> o?(key))
    else None

/// <repo>/.codebase-video/voice.json for a workspace <repo>/.codebase-video/<name>, parsed, when it exists.
let private projectSettings (ws: string) : Result<obj option, Failure> =
    let file = join [ dirname (resolve ws); "voice.json" ]
    if not (exists file) then
        Ok None
    else
        try
            Ok(Some(readJson file))
        with e ->
            Error(SettingsBad $"{file} is not valid JSON: fix it or delete it ({e.Message})")

/// The command text the user defined under `name` in <tool home>/voices.json.
let private commandText (name: string) : Result<string, Failure> =
    let file = join [ toolHome; "voices.json" ]
    let defined =
        if exists file then
            try
                (readJson file)?commands |> fun commands -> text commands name
            with _ ->
                None
        else
            None
    defined
    |> Result.requireSome (SettingsBad $"command {name} is not defined: add \"{name}\" under \"commands\" in {file}")

/// What a "provider" field names; None for a value that is no provider.
let private (|Named|_|) (provider: string) : string option =
    match provider.ToLower() with
    | "kokoro" | "elevenlabs" | "openai" | "azure" | "google" | "command" as p -> Some p
    | _ -> None

/// The voice of a script or of voice.json, the first that applies, and None for a silent clip.
let private pick (project: obj option) (script: obj) : obj option =
    match text script "provider", project with
    | Some _, _ -> Some script
    | None, Some p -> Some p
    | None, None -> Some script

/// "voices": the phrase codes to a voice and a language; a missing language is the code itself.
let private others (spec: obj) : Map<string, string * string> =
    entries spec?voices
    |> Array.choose (fun (code, v) ->
        text v "voice" |> Option.map (fun name -> code, (name, defaultArg (text v "lang") code)))
    |> Map.ofArray

/// The voice settings of the video in workspace `ws`: None for a silent clip.
let choose (ws: string) (script: obj) : Result<Choice option, Failure> =
    result {
        if has script "voice" && isNull script?voice then
            return None
        else
            let! project = projectSettings ws
            let spec = (pick project script).Value
            let provider = defaultArg (text spec "provider") "kokoro"
            let! kind =
                match provider with
                | Named p -> Ok p
                | _ ->
                    let known = "kokoro, elevenlabs, openai, azure, google, command"
                    Error(SettingsBad $"unknown provider \"{provider}\" (voice.json, script.json): use one of {known}")
            let voice = text spec "voice"
            let! name =
                match kind, voice with
                | _, Some v -> Ok v
                | "kokoro", None -> Ok "af_heart"
                | "command", None -> Ok ""
                | _, None -> Error(SettingsBad $"provider \"{kind}\" needs a \"voice\" in voice.json or script.json")
            let! chosen =
                match kind with
                | "elevenlabs" -> Ok ElevenLabs
                | "openai" -> Ok OpenAI
                | "azure" -> Ok(Azure(defaultArg (env "AZURE_SPEECH_REGION") ""))
                | "google" -> Ok Google
                | "command" ->
                    result {
                        let! command =
                            text spec "command"
                            |> Result.requireSome (
                                SettingsBad "provider \"command\" needs a \"command\": a command name from voices.json"
                            )
                        let! body = commandText command
                        return Command(command, body)
                    }
                | _ -> Ok Kokoro
            let model =
                text spec "model"
                |> Option.orElse (
                    match chosen with
                    | ElevenLabs -> Some "eleven_multilingual_v2"
                    | OpenAI -> Some "gpt-4o-mini-tts"
                    | _ -> None
                )
            return
                Some
                    { Provider = chosen
                      Name = name
                      Model = model
                      Instructions = text spec "instructions"
                      Others = others spec }
    }

/// The key (and region) a provider needs, as environment variable names.
let private variables (provider: Provider) : string list =
    match provider with
    | ElevenLabs -> [ "ELEVENLABS_API_KEY" ]
    | OpenAI -> [ "OPENAI_API_KEY" ]
    | Azure _ -> [ "AZURE_SPEECH_KEY"; "AZURE_SPEECH_REGION" ]
    | Google -> [ "GOOGLE_API_KEY" ]
    | Kokoro | Command _ -> []

/// The speed range a provider takes, as its lowest, highest and how the message says it; None when unchecked.
let private speedRange (provider: Provider) : (float * float * string) option =
    match provider with
    | ElevenLabs -> Some(0.7, 1.2, "0.7 to 1.2")
    | OpenAI -> Some(0.25, 4.0, "0.25 to 4.0")
    | Google -> Some(0.25, 2.0, "0.25 to 2.0")
    | Azure _ -> Some(0.5, 2.0, "0.5 to 2.0")
    | Kokoro | Command _ -> None

/// Before any work: the provider's key and the speed it can take.
let check (choice: Choice) (speed: float) : Result<unit, Failure> =
    result {
        for variable in variables choice.Provider do
            do!
                env variable
                |> Result.requireSome (KeyMissing(providerName choice.Provider, variable))
                |> Result.map ignore
        match speedRange choice.Provider with
        | Some(low, high, said) ->
            do!
                (low <= speed && speed <= high)
                |> Result.requireTrue (
                    SettingsBad
                        ($"speed {speed} is not one {providerName choice.Provider} takes ({said}): "
                         + "change \"speed\" in script.json")
                )
        | None -> ()
        match choice.Provider with
        | Command(name, body) ->
            do!
                body.Contains "{out}"
                |> Result.requireTrue (
                    SettingsBad $"command {name} never says where its audio goes: put {{out}} in its text (voices.json)"
                )
        | _ -> ()
    }

// Audio conversion and the command provider -------------------------------------------------------------------

/// The last non-empty line of a text.
let private lastLine (s: string) : string =
    s.Split('\n')
    |> Array.map (fun l -> l.Trim())
    |> Array.filter (fun l -> l <> "")
    |> Array.tryLast
    |> Option.defaultValue ""

/// A fresh empty directory under the system temp directory.
let private tempDir () : string =
    let root: string = os?tmpdir ()
    fs?mkdtempSync (join [ root; "cv-voice-" ])

/// The samples of any audio file ffmpeg reads, as 24 kHz mono floats (ffmpeg converts it to the 16-bit PCM mono WAV
/// that `Wav.read` takes); the error is ffmpeg's last line.
let samplesOf (file: string) : Result<float32[], string> =
    let dir = tempDir ()
    try
        let wav = join [ dir; "audio.wav" ]
        let args =
            [ "-nostdin"; "-v"; "error"; "-y"; "-i"; file; "-ac"; "1"; "-ar"; string Wav.SR; "-c:a"; "pcm_s16le"; wav ]
        match runCapture "ffmpeg" args with
        | 0, _, _ ->
            try
                Ok(Wav.read wav)
            with e ->
                Error e.Message
        | 127, _, _ -> Error "ffmpeg is not installed or not on PATH"
        | _, _, err -> Error(lastLine err)
    finally
        remove dir

/// The command's text with each placeholder replaced, in one pass, by its value in single quotes for `sh`.
let private fill (body: string) (values: Map<string, string>) : string =
    let quoted (v: string) = "'" + v.Replace("'", "'\\''") + "'"
    Regex.Replace(body, @"\{(voice|lang|speed|out)\}", MatchEvaluator(fun m -> quoted values[m.Groups[1].Value]))

/// Seconds a command may run: 120, or CODEBASE_VIDEO_VOICE_TIMEOUT (it exists so a test need not wait that long).
let private commandTimeout () : float =
    env "CODEBASE_VIDEO_VOICE_TIMEOUT"
    |> Option.map float
    |> Option.filter (fun s -> not (Double.IsNaN s) && s > 0.0)
    |> Option.defaultValue 120.0

[<Emit("setTimeout($0, $1)")>]
let private startTimer (f: unit -> unit) (ms: float) : obj = jsNative

[<Emit("clearTimeout($0)")>]
let private stopTimer (t: obj) : unit = jsNative

/// How a command ended: its exit status (1 for a signal, 127 when it could not start) or that it ran out of time,
/// with the last 300 characters of its stderr.
type private Ended =
    | Exited of code: int * stderr: string
    | TimedOut of seconds: float * stderr: string

/// Runs `sh -c` on the command, gives it the text on stdin, and waits for it to end or to run out of time (then the
/// whole process group is killed, or `sleep` would hold the pipes open).
let private spawnText (command: string) (input: string) (seconds: float) : Async<Ended> =
    Async.FromContinuations(fun (ok, _, _) ->
        let child: obj =
            childProcess?spawn (
                command,
                createObj [ "shell" ==> true; "detached" ==> true; "stdio" ==> [| "pipe"; "ignore"; "pipe" |] ]
            )
        let mutable err = ""
        let mutable settled = false
        let mutable timer: obj = null
        let tail () = if err.Length > 300 then err.Substring(err.Length - 300) else err
        let settle (ended: Ended) =
            if not settled then
                settled <- true
                stopTimer timer
                ok ended
        child?stderr?on ("data", (fun (chunk: obj) -> err <- err + string (chunk?toString ("utf8")))) |> ignore
        // a command that does not read its stdin ends before the text is written: that is its business
        child?stdin?on ("error", (fun (_: obj) -> ())) |> ignore
        child?on ("error", (fun (e: obj) -> settle (Exited(127, string e?message)))) |> ignore
        child?on (
            "close",
            (fun (code: obj) -> settle (Exited((if isNull code then 1 else unbox code), (tail ()).Trim())))
        )
        |> ignore
        timer <-
            startTimer
                (fun () ->
                    (try
                        proc?kill (-(unbox<int> child?pid), "SIGKILL")
                     with _ ->
                         ())
                    settle (TimedOut(seconds, (tail ()).Trim())))
                (seconds * 1000.0)
        child?stdin?``end`` (input, "utf8") |> ignore)

/// The voice's text spoken by its command: the samples at 24 kHz mono, or why not. The command runs once per call,
/// with the text on stdin and `{out}` a fresh .wav path (the file may hold any audio ffmpeg reads).
let speakCommand (voice: Voice) (input: string) : Async<Result<float32[], Failure>> =
    async {
        match voice.Provider with
        | Command(name, body) ->
            let dir = tempDir ()
            try
                let out = join [ dir; "voice.wav" ]
                let command =
                    fill
                        body
                        (Map [ "voice", voice.Name
                               "lang", voice.Lang
                               "speed", string voice.Speed
                               "out", out ])
                let seconds = commandTimeout ()
                match! spawnText command input seconds with
                | TimedOut(s, err) -> return Error(CommandFailed(name, 1, $"timed out after {s} s. {err}".Trim()))
                | Exited(code, err) when code <> 0 -> return Error(CommandFailed(name, code, err))
                | Exited _ when not (exists out) || fileSize out = 0.0 ->
                    return Error(CommandFailed(name, 0, "no audio was written: the command did not create {out}"))
                | Exited _ -> return samplesOf out |> Result.mapError (fun why -> CommandFailed(name, 0, why))
            finally
                remove dir
        | other -> return Error(SettingsBad $"{providerName other} is not a command voice")
    }

/// The tag of a provider in a piece's key: a command's name is left out, its text is in the key.
let private tag (provider: Provider) : string =
    match provider with
    | Command _ -> "command"
    | other -> (providerName other).ToLower()

/// The cache key of a piece of a non-Kokoro voice: 16 hex of the SHA-1 of everything that changes the sound.
let pieceKey (voice: Voice) (input: string) : string =
    let command =
        match voice.Provider with
        | Command(_, body) -> body
        | _ -> ""
    let parts: obj[] =
        [| box (tag voice.Provider)
           box (defaultArg voice.Model null)
           box voice.Name
           box voice.Lang
           box voice.Speed
           box (defaultArg voice.Instructions null)
           box command
           box input |]
    (sha1Hex (toJson parts)).Substring(0, 16)
