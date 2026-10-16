/// The cloud voices: ElevenLabs, OpenAI, Azure and Google. Each is one HTTPS request for 24 kHz WAV (Google's reply
/// wraps it in base64), retried once after 2 s on a network error, a 429 or a 5xx. The key is read from the
/// environment when the request is built and appears in no message, log line or file.
module VoiceCloud

open Fable.Core
open Fable.Core.JsInterop
open System
open FsToolkit.ErrorHandling
open Node
open Voice

/// A request ready to send: where, with which headers, and the body (text, sent as UTF-8).
type Request =
    { Url: string
      Headers: (string * string) list
      Body: string }

/// The environment variable `name`, or "" when it is not set.
let private setting (name: string) : string = env name |> Option.defaultValue ""

/// The base URL: the override in `variable` when set (for the tests' fake servers), else the real one.
let private baseUrl (variable: string) (real: string) : string =
    (env variable |> Option.defaultValue real).TrimEnd('/')

/// A JSON object from its fields.
let private json (fields: (string * obj) list) : string =
    toJson (createObj (fields |> List.map (fun (k, v) -> k ==> v)))

/// The language code a provider takes: ElevenLabs wants the bare language (`en`), Azure and Google the region
/// form (`en-US`); a code with no region stays as it is.
let private langCode (regional: bool) (lang: string) : string =
    match lang.Split('-') with
    | [| language |] -> language.ToLower()
    | parts when regional -> parts[0].ToLower() + "-" + String.Join("-", parts[1..]).ToUpper()
    | parts -> parts[0].ToLower()

/// Text safe inside SSML, attribute values included.
let private xmlEscape (s: string) : string =
    s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;").Replace("'", "&apos;")

/// The prosody rate for a speed: a signed whole percentage (1.2 is "+20%").
let private rate (speed: float) : string =
    let percent = int (Math.Round((speed - 1.0) * 100.0))
    (if percent >= 0 then "+" else "") + string percent + "%"

/// The request for a cloud voice saying the text (the table of the design's "The requests"). A Kokoro or command
/// voice has no request: it gets an empty one.
let requestFor (voice: Voice) (input: string) : Request =
    let jsonType = "Content-Type", "application/json"
    match voice.Provider with
    | ElevenLabs ->
        let root = baseUrl "CODEBASE_VIDEO_ELEVENLABS_URL" "https://api.elevenlabs.io"
        { Url = root + "/v1/text-to-speech/" + Uri.EscapeDataString voice.Name + "?output_format=wav_24000"
          Headers = [ "xi-api-key", setting "ELEVENLABS_API_KEY"; jsonType ]
          Body =
            json
                [ "text", box input
                  "model_id", box (defaultArg voice.Model "eleven_multilingual_v2")
                  "language_code", box (langCode false voice.Lang)
                  "voice_settings", box (createObj [ "speed" ==> voice.Speed ]) ] }
    | OpenAI ->
        let root = baseUrl "CODEBASE_VIDEO_OPENAI_URL" "https://api.openai.com"
        { Url = root + "/v1/audio/speech"
          Headers = [ "Authorization", "Bearer " + setting "OPENAI_API_KEY"; jsonType ]
          Body =
            json
                [ yield "model", box (defaultArg voice.Model "gpt-4o-mini-tts")
                  yield "input", box input
                  yield "voice", box voice.Name
                  match voice.Instructions with
                  | Some i -> yield "instructions", box i
                  | None -> ()
                  yield "response_format", box "wav"
                  yield "speed", box voice.Speed ] }
    | Azure region ->
        let root = baseUrl "CODEBASE_VIDEO_AZURE_URL" ("https://" + region + ".tts.speech.microsoft.com")
        let lang = xmlEscape (langCode true voice.Lang)
        { Url = root + "/cognitiveservices/v1"
          Headers =
            [ "Ocp-Apim-Subscription-Key", setting "AZURE_SPEECH_KEY"
              "Content-Type", "application/ssml+xml"
              "X-Microsoft-OutputFormat", "riff-24khz-16bit-mono-pcm"
              "User-Agent", "codebase-video" ]
          Body =
            "<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xml:lang=\"" + lang + "\">"
            + "<voice name=\"" + xmlEscape voice.Name + "\"><prosody rate=\"" + rate voice.Speed + "\">"
            + xmlEscape input + "</prosody></voice></speak>" }
    | Google ->
        let root = baseUrl "CODEBASE_VIDEO_GOOGLE_URL" "https://texttospeech.googleapis.com"
        let audio =
            createObj [ "audioEncoding" ==> "LINEAR16"; "sampleRateHertz" ==> 24000; "speakingRate" ==> voice.Speed ]
        let spoken = createObj [ "languageCode" ==> langCode true voice.Lang; "name" ==> voice.Name ]
        { Url = root + "/v1/text:synthesize?key=" + Uri.EscapeDataString(setting "GOOGLE_API_KEY")
          Headers = [ jsonType ]
          Body = json [ "input", box (createObj [ "text" ==> input ]); "voice", box spoken; "audioConfig", box audio ] }
    | Kokoro
    | Command _ -> { Url = ""; Headers = []; Body = "" }

// Sending -----------------------------------------------------------------------------------------------------

/// What came back: a status with the body bytes (a Buffer), or why the request never got an answer.
type private Reply =
    | Got of status: int * bytes: obj
    | Down of message: string

/// Milliseconds after which a request that has had no answer is given up.
[<Literal>]
let private TimeoutMs = 120000

/// POSTs the body and resolves to { status, bytes } (a Buffer); rejects on a network error or after the timeout.
[<Emit("fetch($0, { method: 'POST', headers: $1, body: $2, signal: AbortSignal.timeout($3) })
    .then(async r => ({ status: r.status, bytes: Buffer.from(await r.arrayBuffer()) }))")>]
let private post (url: string) (headers: obj) (body: string) (timeoutMs: int) : obj = jsNative

/// Whether a JS value is a non-empty string.
[<Emit("typeof $0 === 'string' && $0 !== ''")>]
let private isText (o: obj) : bool = jsNative

/// The bytes (a Buffer) of base64 text.
[<Emit("Buffer.from($0, 'base64')")>]
let private fromBase64 (s: string) : obj = jsNative

/// A Buffer's bytes read as UTF-8 text.
[<Emit("$0.toString('utf8')")>]
let private utf8 (bytes: obj) : string = jsNative

/// `message` with every occurrence of the key hidden, so that no failure can carry it.
let private scrub (secrets: string list) (message: string) : string =
    secrets
    |> List.filter (fun s -> s <> "")
    |> List.fold (fun (m: string) s -> m.Replace(s, "***").Replace(Uri.EscapeDataString s, "***")) message

/// The keys a failure message must never show.
let private secretsOf (request: Request) : string list =
    [ for (_, v) in request.Headers -> v.Replace("Bearer ", "") ]
    @ [ setting "GOOGLE_API_KEY" ]

/// One request; a network error or timeout is a value.
let private send (request: Request) : Async<Reply> =
    async {
        try
            let headers = createObj (request.Headers |> List.map (fun (k, v) -> k ==> v))
            let! r = fromJs (post request.Url headers request.Body TimeoutMs)
            return Got(r?status, r?bytes)
        with e ->
            let cause: obj = e?cause
            let why = if isNull cause then e.Message else e.Message + " (" + string cause?message + ")"
            return Down why
    }

/// Whether a reply is worth one more try: a network error, a 429 or a 5xx.
let private retryable (reply: Reply) : bool =
    match reply with
    | Down _ -> true
    | Got(status, _) -> status = 429 || status >= 500

/// The request, and once more after 2 s when the first answer was retryable.
let private deliver (request: Request) : Async<Reply> =
    async {
        let! first = send request
        if retryable first then
            do! Async.Sleep 2000
            return! send request
        else
            return first
    }

/// The service's own message in an error body: `detail.message`, `detail` as text, or `error.message`; else the
/// body's first 300 characters. Cut to 300 either way.
let private messageOf (body: string) : string =
    let structured =
        try
            let o = parseJson body
            let detail: obj = o?detail
            let error: obj = o?error
            [ (if isNull detail then null else detail?message)
              (if isNull detail then null else detail)
              (if isNull error then null else error?message) ]
            |> List.tryPick (fun v -> if isText v then Some(unbox<string> v) else None)
        with _ ->
            None
    let said = structured |> Option.defaultValue body
    if said.Length > 300 then said.Substring(0, 300) else said

/// The audio in a reply's body: Google's is base64 inside JSON, the others are the bytes themselves; None when the
/// body is not shaped so.
let private audioBytes (provider: Provider) (bytes: obj) : obj option =
    match provider with
    | Google ->
        try
            let content: obj = (parseJson (utf8 bytes))?audioContent
            if isText content then Some(fromBase64 (unbox<string> content)) else None
        with _ ->
            None
    | _ -> Some bytes

/// The samples of audio bytes, through a temporary file; a body ffmpeg cannot read is a refused 200.
let private convert (name: string) (bytes: obj option) : Result<float32[], Failure> =
    let notAudio (why: string) = Error(Refused(name, 200, "the reply was not audio: " + why))
    match bytes with
    | None -> notAudio "no audioContent in it"
    | Some data ->
        let dir = tempDir ()
        try
            let file = join [ dir; "reply.audio" ]
            writeBytes file data
            samplesOf file |> Result.mapError (fun why -> Refused(name, 200, "the reply was not audio: " + why))
        finally
            remove dir

/// The voice's text spoken by its provider: the samples at 24 kHz mono, or why not. Never called for Kokoro.
let speak (voice: Voice) (input: string) : Async<Result<float32[], Failure>> =
    match voice.Provider with
    | Command _ -> speakCommand voice input
    | Kokoro -> async { return Error(SettingsBad "Kokoro is spoken by the Kokoro worker, not by a cloud service") }
    | provider ->
        async {
            let name = providerName provider
            let request = requestFor voice input
            let secrets = secretsOf request
            match! deliver request with
            | Down why -> return Error(Unreachable(name, scrub secrets why))
            | Got(status, bytes) when status >= 200 && status < 300 ->
                return convert name (audioBytes provider bytes)
            | Got(status, bytes) -> return Error(Refused(name, status, scrub secrets (messageOf (utf8 bytes))))
        }
