/// Which voice narrates, and what stops narration before any work when the choice cannot be carried out.
///
/// The voice comes from the first of these that applies: a `script.json` with a "provider" field; else the project's
/// <repo>/.codebase-video/voice.json; else `script.json`'s own Kokoro fields. `"voice": null` in `script.json` is a
/// silent clip whatever `voice.json` says. Keys come only from the environment, and a command's text only from the
/// user's own <tool home>/voices.json: a project's `voice.json` names a command, it cannot define one.
module Voice

open Fable.Core
open Fable.Core.JsInterop
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
    }
