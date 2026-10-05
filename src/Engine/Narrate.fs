/// Voices a video's script.json with Kokoro and times every sentence. Port of engine/narrate.py.
///
///   node engine/cli/Cv.js <workspace> narrate
///
/// Writes <workspace>/build/:
///   narration.wav   the whole soundtrack, silence included (24 kHz mono, 16-bit)
///                   every scene is padded with silence (under 1/30 s) to end on a whole frame at 30 fps, so a scene
///                   covers exactly the frames [start*30, end*30) and the soundtrack is exactly `duration` long
///   timing.js       window.TIMING for the kit (src/Kit/Stage.fs): scene, sentence and part start/end times (timing.json: the same, indented)
///                   scene starts and ends are whole frames; times inside a scene are its start plus whole
///                   milliseconds (see timeAt)
///   captions.vtt    one cue per sentence
///   phonemes.txt    every phrase in a second language with the phonemes it was spoken with
///
/// The voice is Kokoro-82M v1.0 run by kokoro-js (fp32 on the CPU), with the model in <tool home>/models; the phonemes
/// come from eSpeak NG (the full build in @echogarden/espeak-ng-emscripten), called the way kokoro-onnx called it
/// through Python's phonemizer. `setup` installs both into the tool home. Each piece of speech is synthesized on its
/// own and cached by its text and voice, so re-voicing one edited line does not redo the rest.
///
/// script.json:
///   {
///     "name": "rag-decomp-bridge-drift",         file stem on the server: [A-Za-z0-9][A-Za-z0-9_-]*
///     "title": "Entity drift at the bridge",     caption under the player
///     "voice": "af_heart", "lang": "en-us",      Kokoro voice and language; "voice": null for a silent clip
///     "speed": 1.0,
///     "poster": "drift",                         scene whose last sentence is the poster frame (default: the 2nd)
///     "voices": {"fr": {"voice": "ff_siwis", "lang": "fr-fr"}},    optional: voices for {code:...} phrases
///     "pronounce": {"trois heures et quart": "tʁwˈaz ˈœʁ e kˈaʁ"},  optional: exact phonemes for a phrase
///     "scenes": [
///       {"id": "ask", "say": "Two sentences. Spoken in order.", "lead": 0.5, "pad": 0.9},
///       {"id": "end", "say": "", "hold": 2.0}
///     ]
///   A scene may also carry "chapter": "Title" (long videos: on the chapter's "-why" bridge scene), and
///   "toasts": [{"kind": "tricky", "at": "the tricky part"}] - small pop-up badges the long-video frame shows
///   on that phrase (kinds and optional "text"/"dur": see TOASTS in src/Kit/Kit.fs).
///   Long videos open with a scene "title" and a top-level "card": {"course": "...", "lesson": "...", "sub": "..."}:
///   the frame draws the card while that scene plays, so the viewer knows the course and lesson first.
///   }
///
/// In "say":
///   [shown](spoken)   captions one text and speaks another: "[0.802](zero point eight oh two)".
///   {fr:six euros}    speaks that phrase with the "fr" voice, inside or instead of a sentence:
///                     "Before a vowel, it links as a z: {fr:six euros}."
///   [pause] [pause 2] silence after the sentence it follows (default 1.5 s): room for a point to land.
///   [think] [think 8] a question's silence (default 8 s); the long-video frame shows a "pause and think"
///                     countdown during it. Put either after the sentence's end punctuation.
/// A scene may carry "recap": ["line", ...] (long videos: a chapter's closing "So far" card, one line
/// appearing per sentence; give it "hold" for a quiet moment after).
/// A "pronounce" entry replaces the phonemizer for a phrase that matches it exactly (any voice). Use it
/// where the phonemizer is wrong, after checking phonemes.txt against what the lesson teaches.
module Narrate

open Fable.Core
open Fable.Core.JsInterop
open Node

// Python compatibility ------------------------------------------------------------------------------------------
// The outputs are read by agents and diffed against the Python engine's, so numbers and JSON are written the way
// Python wrote them: round() and format() round half to even, floats keep their ".0", json.dumps puts spaces
// after "," and ":".

module Py =
    [<Emit("Number.isInteger($0)")>]
    let private isInteger (x: float) : bool = jsNative

    [<Emit("$0.toFixed($1)")>]
    let private toFixedJs (x: float) (digits: int) : string = jsNative

    [<Emit("$0.toExponential()")>]
    let private toExponential (x: float) : string = jsNative

    /// round(x) to an integer, half to even.
    let roundInt (x: float) : int = int (Wav.roundHalfEven x)

    /// x with `digits` decimals as Python's f"{x:.{digits}f}" writes it: correctly rounded, exact ties to even
    /// (JS toFixed sends exact ties away from zero). An exact tie has at most digits+1 fractional bits, so it is
    /// found by scaling with a power of two, which is exact.
    let toFixed (x: float) (digits: int) : string =
        let p = x * (2.0 ** float (digits + 1))
        if isInteger p && abs p % 2.0 = 1.0 then
            let scaled = x * (10.0 ** float digits) // a half-integer, exact for a tie
            let lo = floor scaled
            let even = if lo % 2.0 = 0.0 then lo else lo + 1.0
            toFixedJs (even / (10.0 ** float digits)) digits
        else
            toFixedJs x digits

    /// round(x, digits): the double nearest to the correctly rounded decimal.
    let round (x: float) (digits: int) : float = float (toFixed x digits)

    /// repr(x) for a float: shortest round-trip digits, ".0" on whole numbers, exponent outside 1e-4 <= |x| < 1e16.
    let floatRepr (x: float) : string =
        if System.Double.IsNaN x then "NaN"
        elif System.Double.IsPositiveInfinity x then "Infinity"
        elif System.Double.IsNegativeInfinity x then "-Infinity"
        else
            let e = toExponential x
            let mant, exp =
                match e.Split('e') with
                | [| m; x |] -> m, int x
                | _ -> e, 0
            let sign = if mant.StartsWith "-" then "-" else ""
            let digits = mant.Replace("-", "").Replace(".", "")
            if exp >= -4 && exp < 16 then
                if exp >= 0 then
                    let whole = digits.PadRight(exp + 1, '0')
                    let intPart = whole.Substring(0, exp + 1)
                    let frac = whole.Substring(exp + 1)
                    sign + intPart + "." + (if frac = "" then "0" else frac)
                else
                    sign + "0." + System.String('0', -exp - 1) + digits
            else
                let m = if digits.Length > 1 then digits.Substring(0, 1) + "." + digits.Substring 1 else digits
                let ex = string (abs exp)
                sign + m + "e" + (if exp < 0 then "-" else "+") + (if ex.Length < 2 then "0" + ex else ex)

    /// repr() of a string: single quotes unless the text holds one and no double quote.
    let strRepr (s: string) : string =
        let q = if s.Contains "'" && not (s.Contains "\"") then "\"" else "'"
        let body =
            s
            |> Seq.map (fun c ->
                match c with
                | '\\' -> "\\\\"
                | '\n' -> "\\n"
                | '\r' -> "\\r"
                | '\t' -> "\\t"
                | c when string c = q -> "\\" + q
                | c when int c < 0x20 || int c = 0x7f -> sprintf "\\x%02x" (int c)
                | c -> string c)
            |> String.concat ""
        q + body + q

    /// A JSON value as Python's json module holds it: ints and floats are told apart, objects keep their key order.
    type Json =
        | Null
        | Bool of bool
        | Int of float
        | Float of float
        | Str of string
        | List of Json list
        | Obj of (string * Json) list

    [<Emit("JSON.stringify($0)")>]
    let private quote (s: string) : string = jsNative

    [<Emit("typeof $0")>]
    let private jsType (o: obj) : string = jsNative

    [<Emit("Array.isArray($0)")>]
    let private isArray (o: obj) : bool = jsNative

    [<Emit("Object.keys($0)")>]
    let keys (o: obj) : string[] = jsNative

    /// The marker parseMarked puts on numbers written with a "." or an exponent (Python reads those as floats).
    [<Literal>]
    let private FloatMark = "__py_float__"

    /// JSON.parse that keeps Python's int/float distinction: a number written as "2.0" comes back as
    /// {"__py_float__": 2}. Needs the reviver's source text (Node 21+); older Nodes treat whole numbers as ints.
    [<Emit("JSON.parse($0, (k, v, c) => typeof v === 'number' && c && typeof c.source === 'string' && /[.eE]/.test(c.source) ? {__py_float__: v} : v)")>]
    let parseMarked (text: string) : obj = jsNative

    /// A parsed JSON value (from parseMarked or JSON.parse) as Json.
    let rec ofJs (v: obj) : Json =
        if isNull v then Null
        else
            match jsType v with
            | "boolean" -> Bool(unbox v)
            | "number" ->
                let x: float = unbox v
                if isInteger x then Int x else Float x
            | "string" -> Str(unbox v)
            | _ when isArray v -> List(unbox<obj[]> v |> Array.map ofJs |> Array.toList)
            | _ ->
                match keys v with
                | [| k |] when k = FloatMark -> Float(v?(FloatMark))
                | ks -> Obj(ks |> Array.map (fun k -> k, ofJs (v?(k))) |> Array.toList)

    let private number (j: Json) =
        match j with
        | Int x -> if abs x < 1e21 then toFixedJs x 0 else floatRepr x
        | Float x -> floatRepr x
        | _ -> ""

    /// json.dumps(j, ensure_ascii=False): ", " and ": " separators.
    let rec dumps (j: Json) : string =
        match j with
        | Null -> "null"
        | Bool b -> if b then "true" else "false"
        | Int _
        | Float _ -> number j
        | Str s -> quote s
        | List [] -> "[]"
        | Obj [] -> "{}"
        | List xs -> "[" + (xs |> List.map dumps |> String.concat ", ") + "]"
        | Obj kvs -> "{" + (kvs |> List.map (fun (k, v) -> quote k + ": " + dumps v) |> String.concat ", ") + "}"

    /// json.dumps(j, indent=n, ensure_ascii=False).
    let dumpsIndented (n: int) (j: Json) : string =
        let rec go (level: int) (j: Json) =
            let pad l = "\n" + System.String(' ', n * l)
            match j with
            | List []
            | Obj [] -> dumps j
            | List xs -> "[" + (xs |> List.map (fun x -> pad (level + 1) + go (level + 1) x) |> String.concat ",") + pad level + "]"
            | Obj kvs ->
                "{"
                + (kvs |> List.map (fun (k, v) -> pad (level + 1) + quote k + ": " + go (level + 1) v) |> String.concat ",")
                + pad level
                + "}"
            | _ -> dumps j
        go 0 j

    /// repr() of a parsed JSON value, for messages.
    let repr (v: obj) : string =
        match ofJs v with
        | Null -> "None"
        | Bool b -> if b then "True" else "False"
        | Str s -> strRepr s
        | j -> dumps j

    /// str() of a parsed JSON value.
    let str (v: obj) : string =
        match ofJs v with
        | Str s -> s
        | j -> repr v

    /// Python truthiness of a parsed JSON value: null, false, 0, "", [] and {} are false.
    let truthy (v: obj) : bool =
        match ofJs v with
        | Null -> false
        | Bool b -> b
        | Int x
        | Float x -> x <> 0.0
        | Str s -> s <> ""
        | List xs -> not xs.IsEmpty
        | Obj kvs -> not kvs.IsEmpty

    /// len(s.split()): the words of a text.
    [<Emit("$0.split(/\\s+/).filter(w => w).length")>]
    let wordCount (s: string) : int = jsNative

/// sys.exit(message): the message on stderr, exit status 1.
let private fail (message: string) : 'a =
    eprint message
    exit 1

// Regular expressions (JS RegExp, written to match Python's re here) -------------------------------------------

[<Emit("new RegExp($0, $1)")>]
let private regex (pattern: string) (flags: string) : obj = jsNative

/// re.sub with a function: f gets the match array (match, groups...).
[<Emit("$0.replace($1, (...a) => $2(a))")>]
let private subWith (s: string) (re: obj) (f: obj[] -> string) : string = jsNative

[<Emit("$0.replace($1, '')")>]
let private subEmpty (s: string) (re: obj) : string = jsNative

[<Emit("Array.from($0.matchAll($1))")>]
let private matchAll (s: string) (re: obj) : obj[] = jsNative

[<Emit("$0.split($1)")>]
let private splitRe (s: string) (re: obj) : string[] = jsNative

[<Emit("$0.exec($1)")>]
let private exec (re: obj) (s: string) : obj = jsNative

[<Emit("$0.test($1)")>]
let private test (re: obj) (s: string) : bool = jsNative

/// Group i of a match array, or None when it did not take part.
let private group (m: obj) (i: int) : string option =
    let g: obj = m?(i)
    if isNull g then None else Some(unbox g)

let private group0 (m: obj) = (group m 0).Value
let private matchIndex (m: obj) : int = m?index

// Constants and markup ---------------------------------------------------------------------------------------------

/// The frame rate of every video. Scenes end on whole frames, so the `video` step can render and cache each
/// scene on its own (src/Engine/Video.fs).
[<Literal>]
let FPS = 30

/// Samples per frame (800).
let private FRAME = Wav.SR / FPS

/// The time of sample `pos` in a scene that starts on frame `frame`: the scene's start plus the offset rounded to a
/// millisecond, as one division of whole numbers. A cached scene must draw the same frames wherever it lands in
/// the video, so a time inside a scene is always the same distance from the scene's start, to the last bit the
/// division allows (the renderer takes care of the bit: see frameTime in Render.fs).
let private timeAt (frame: int) (pos: int) : float =
    let ms = Py.roundInt (float (pos - frame * FRAME) * 1000.0 / float Wav.SR)
    float (200 * frame + 6 * ms) / 6000.0

let private GAP = 0.42 // between sentences in a scene: a breath, so facts do not run into each other
let private PART_GAP = 0.12 // between the voices inside one sentence
let private KOKORO_LANGS = set [ "en-us"; "en-gb"; "fr-fr"; "es"; "it"; "ja"; "pt-br"; "cmn"; "hi" ]
let private PRONOUNCE = regex """\[([^\]]+)\]\(([^)]+)\)""" "g"
let private FOREIGN = regex """\{([a-z]{2,3}):([^{}]+)\}""" "g"
let private BREAK = regex """\s*\[(pause|think)(?:\s+(\d+(?:\.\d+)?))?\]""" "g"
let private breakDefault kind = if kind = "pause" then 1.5 else 8.0
let private NAME_PATTERN = """\A[A-Za-z0-9][A-Za-z0-9_-]*\Z"""
let private NAME = regex "^[A-Za-z0-9][A-Za-z0-9_-]*$" ""

let private ENDS_SENTENCE = regex """[.!?]\s*$""" ""
let private SENTENCE_SPLIT = regex """(?<=[.!?\x01])\s+(?=["'“A-Z0-9\[\x00])""" "g"
let private SHIELDED = regex """\x00(\d+)[\x00\x01]""" "g"
let private LEADING_BREAKS = regex """^(?:\[(?:pause|think)(?:\s+[\d.]+)?\]\s*)+""" ""

let sentences (say: string) : string list =
    // Split after . ! ? when a space and a capital, digit, quote or markup follows; keeps "e.g. the"
    // and "0.802" whole. {code:...} phrases are shielded first, so "{fr:Il est une heure.}" stays one
    // piece. A shielded phrase ends a sentence only when it ends in . ! ? itself (marked \x01): "is
    // {fr:moins le quart} [3:45] or..." is one sentence, "{fr:Il est midi.} Then..." is two.
    let shielded = ResizeArray<string>()
    let text =
        subWith (say.Trim()) FOREIGN (fun m ->
            shielded.Add(group0 m)
            let mark = if test ENDS_SENTENCE (group m 2).Value then "\u0001" else "\u0000"
            "\u0000" + string (shielded.Count - 1) + mark)
    let restore (s: string) = subWith s SHIELDED (fun m -> shielded[int (group m 1).Value])
    let out = ResizeArray<string>()
    for raw in splitRe text SENTENCE_SPLIT do
        if raw.Trim() <> "" then
            let mutable p = (restore raw).Trim()
            // A break marker opening a piece belongs to the sentence before it ("Why? [think 4] Because...").
            let m = exec LEADING_BREAKS p
            if not (isNull m) && out.Count > 0 then
                out[out.Count - 1] <- out[out.Count - 1] + " " + (group0 m).Trim()
                p <- p.Substring((group0 m).Length).Trim()
            if p <> "" then out.Add p
    List.ofSeq out

/// The silences a sentence asks for after it: [("pause", 1.5); ("think", 4.0)].
let breaks (s: string) : (string * float) list =
    [ for m in matchAll s BREAK ->
          let kind = (group m 1).Value
          kind, (match group m 2 with Some secs -> float secs | None -> breakDefault kind) ]

let shown (s: string) : string =
    subWith (subWith (subEmpty s BREAK) PRONOUNCE (fun m -> (group m 1).Value)) FOREIGN (fun m -> (group m 2).Value)
    |> fun s -> s.Trim()

let spoken (s: string) : string =
    (subWith (subEmpty s BREAK) PRONOUNCE (fun m -> (group m 2).Value)).Trim()

/// What the listener hears, as plain text: spoken forms, and {code:...} phrases without their braces.
/// Stage (src/Kit/Stage.fs) times words against this (Stage.word), so "86,400" is found where "eighty-six thousand" is said.
let heard (s: string) : string =
    subWith (spoken s) FOREIGN (fun m -> (group m 2).Value)

// The English phonemizer reads a lone capital "A" as the article ("uh"): "A W S" came out "uh W S" and "zone A is"
// "zone uh is". A capital A that is not opening a sentence is a letter, and so is one that opens a sentence but is
// followed by another single letter ("A P I calls"). Those are sent to the voice as "eigh", which it says as the
// letter. Captions and cue matching keep the original text.
// (Python's \w is Unicode-aware: [\p{L}\p{N}_] here.)
let private LETTER_A = regex """(?<![\p{L}\p{N}_'’])A(?![\p{L}\p{N}_'’])""" "gu"
let private SENTENCE_OPEN = regex """(?:^|[.!?:;]\s+|["“(]\s*)$""" ""
let private NEXT_LETTER = regex """\s+[A-Z](?:'s|s)?(?![A-Za-z])""" "y"

/// The text as sent to an English voice: letter "A" spelled so that it is said as a letter.
let voiced (text: string) : string =
    subWith text LETTER_A (fun m ->
        let start: int = unbox m[m.Length - 2]
        let opening = test SENTENCE_OPEN (text.Substring(0, start))
        NEXT_LETTER?lastIndex <- start + 1
        if not opening || test NEXT_LETTER text then "eigh" else "A")

let private WORD_CHAR = regex """[\p{L}\p{N}_]""" "u"

/// (code or None, text) runs of a sentence: main-voice text and {code:...} phrases in order.
let pieces (sentence: string) : (string option * string) list =
    let out = ResizeArray<string option * string>()
    let mutable pos = 0
    for m in matchAll sentence FOREIGN do
        let i = matchIndex m
        if i > pos then out.Add(None, sentence.Substring(pos, i - pos))
        out.Add(group m 1, (group m 2).Value)
        pos <- i + (group0 m).Length
    if pos < sentence.Length then out.Add(None, sentence.Substring pos)
    // Punctuation left between two phrases ("." after a brace) has nothing to say.
    [ for code, text in out do
          if test WORD_CHAR text then code, text.Trim() ]

/// Silent clips hold each caption long enough to read: about 2.5 words a second, never under 2 s.
let readingTime (text: string) : float =
    max 2.0 (float (Py.wordCount text) / 2.5 + 0.8)

let vttTime (t: float) : string =
    let h = floor (t / 3600.0)
    let rem = t % 3600.0
    let m = floor (rem / 60.0)
    let s = rem % 60.0
    (string (int h)).PadLeft(2, '0') + ":" + (string (int m)).PadLeft(2, '0') + ":" + (Py.toFixed s 3).PadLeft(6, '0')

// The tool home -------------------------------------------------------------------------------------------------

/// The npm packages the voice needs in <tool home>/node (setup installs them).
let voicePackages = [ "kokoro-js"; "@echogarden/espeak-ng-emscripten" ]

let packageInstalled (name: string) : bool =
    exists (join [ toolHome; "node"; "node_modules"; name; "package.json" ])

let setupHint () : string =
    let cv = join [ engineDir; "cli"; "Cv.js" ]
    $"the tool is not set up yet: run: node {cv} setup (installs the Kokoro voice and puppeteer-core into {toolHome})"

/// Exits 2 with the setup hint when a package is missing from the tool home.
let requirePackages (names: string list) : unit =
    if names |> List.exists (packageInstalled >> not) then
        eprint (setupHint ())
        exit 2

[<Emit("import($0)")>]
let private importDynamic (specifier: string) : JS.Promise<obj> = jsNative

/// import() of an ES-module package installed in the tool home (require() cannot load those on Node 18-20).
let private importFromHome (name: string) : JS.Promise<obj> =
    let req: obj = nodeModule?createRequire(join [ toolHome; "node"; "package.json" ])
    let resolved: string = req?resolve(name)
    importDynamic (url?pathToFileURL(resolved)?href)

// Phonemes ----------------------------------------------------------------------------------------------------
// kokoro-onnx phonemized with Python's phonemizer (espeak backend, preserve_punctuation=True, with_stress=True) on
// eSpeak NG 1.52, then dropped every symbol outside Kokoro's vocabulary. kokoro-js's own phonemizer is an
// English-only eSpeak build that also differs from 1.52 ("stores" comes out stˈoːɹz, not stˈɔːɹz) and normalizes
// numbers itself, so it is not used: phonemize below repeats Python's steps on a full eSpeak NG build, which gives
// the same phonemes for every phrase tested (English, French, Spanish).

/// Kokoro v1.0's vocabulary: phoneme symbol -> token id (kokoro_onnx/config.json, the same as the model's
/// tokenizer.json).
let private VOCAB: Map<string, int> =
    Map.ofList
        [ ";", 1; ":", 2; ",", 3; ".", 4; "!", 5; "?", 6; "—", 9; "…", 10
          "\"", 11; "(", 12; ")", 13; "“", 14; "”", 15; " ", 16; "̃", 17; "ʣ", 18
          "ʥ", 19; "ʦ", 20; "ʨ", 21; "ᵝ", 22; "ꭧ", 23; "A", 24; "I", 25; "O", 31
          "Q", 33; "S", 35; "T", 36; "W", 39; "Y", 41; "ᵊ", 42; "a", 43; "b", 44
          "c", 45; "d", 46; "e", 47; "f", 48; "h", 50; "i", 51; "j", 52; "k", 53
          "l", 54; "m", 55; "n", 56; "o", 57; "p", 58; "q", 59; "r", 60; "s", 61
          "t", 62; "u", 63; "v", 64; "w", 65; "x", 66; "y", 67; "z", 68; "ɑ", 69
          "ɐ", 70; "ɒ", 71; "æ", 72; "β", 75; "ɔ", 76; "ɕ", 77; "ç", 78; "ɖ", 80
          "ð", 81; "ʤ", 82; "ə", 83; "ɚ", 85; "ɛ", 86; "ɜ", 87; "ɟ", 90; "ɡ", 92
          "ɥ", 99; "ɨ", 101; "ɪ", 102; "ʝ", 103; "ɯ", 110; "ɰ", 111; "ŋ", 112; "ɳ", 113
          "ɲ", 114; "ɴ", 115; "ø", 116; "ɸ", 118; "θ", 119; "œ", 120; "ɹ", 123; "ɾ", 125
          "ɻ", 126; "ʁ", 128; "ɽ", 129; "ʂ", 130; "ʃ", 131; "ʈ", 132; "ʧ", 133; "ʊ", 135
          "ʋ", 136; "ʌ", 138; "ɣ", 139; "ɤ", 140; "χ", 142; "ʎ", 143; "ʒ", 147; "ʔ", 148
          "ˈ", 156; "ˌ", 157; "ː", 158; "ʰ", 162; "ʲ", 164; "↓", 169; "→", 171; "↗", 172
          "↘", 173; "ᵻ", 177 ]

/// The code points of a string (Python iterates and slices strings by code point).
[<Emit("Array.from($0)")>]
let private codePoints (s: string) : string[] = jsNative

/// phonemizer's default punctuation marks, and its regex for a run of them with the spaces around.
let private MARKS = ";:,.!?¡¿—…\"«»“”(){}[]"
let private MARKS_RE = regex ("""(\s*[""" + MARKS.Replace("[", "\\[").Replace("]", "\\]") + """]+\s*)+""") "g"

type private MarkPosition =
    | Begin
    | Inner
    | End
    | Alone

type private Mark = { line: int; mark: string; position: MarkPosition }

/// Punctuation._preserve_line: the line cut into chunks at its punctuation, and the marks to put back.
let private preserveLine (line: string) (num: int) : string list * Mark list =
    let matches = matchAll line MARKS_RE |> Array.map group0
    if matches.Length = 0 then [ line ], []
    elif matches.Length = 1 && matches[0] = line then [], [ { line = num; mark = line; position = Alone } ]
    else
        let last = matches.Length - 1
        let marks =
            matches
            |> Array.mapi (fun i m ->
                let position =
                    if i = 0 && line.StartsWith m then Begin
                    elif i = last && line.EndsWith m then End
                    else Inner
                { line = num; mark = m; position = position })
            |> Array.toList
        let rest = ref line
        let chunks =
            [ for mk in marks do
                  let split = rest.Value.Split([| mk.mark |], System.StringSplitOptions.None)
                  yield split[0]
                  rest.Value <- String.concat mk.mark split[1..] ]
        chunks @ [ rest.Value ], marks

/// Punctuation.restore with the default separator (words joined by " ", strip=False).
let private restore (text: string list) (marks: Mark list) : string list =
    let out = ResizeArray<string>()
    let rec go (text: string list) (marks: Mark list) (pos: int) =
        match text, marks with
        | [], [] -> ()
        | text, [] ->
            for l in text do
                out.Add(if l.EndsWith " " then l else l + " ")
        | [], marks -> out.Add(marks |> List.map (fun m -> m.mark) |> String.concat "")
        | t0 :: trest, m :: mrest when m.line = pos ->
            let t0 = if t0.EndsWith " " then t0.Substring(0, t0.Length - 1) else t0
            let space = if m.mark.EndsWith " " then "" else " "
            match m.position with
            | Begin -> go ((m.mark + t0) :: trest) mrest pos
            | End ->
                out.Add(t0 + m.mark + space)
                go trest mrest (pos + 1)
            | Alone ->
                out.Add(m.mark + space)
                go (t0 :: trest) mrest (pos + 1)
            | Inner ->
                match trest with
                | [] -> go [ t0 + m.mark ] mrest pos
                | t1 :: trest2 -> go ((t0 + m.mark + t1) :: trest2) mrest pos
        | t0 :: trest, marks ->
            out.Add t0
            go trest marks (pos + 1)
    go text marks 0
    List.ofSeq out

type private Espeak = { worker: obj; heap: unit -> byte[]; voices: Map<string, string>; mutable current: string }

let mutable private espeakLoaded: JS.Promise<Espeak> option = None

/// The eSpeak NG module, loaded once. Voices are picked as phonemizer picked them: the first voice whose main
/// language is the code ("en-us" -> gmw/en-US, "fr-fr" -> roa/fr).
let private espeak () : JS.Promise<Espeak> =
    match espeakLoaded with
    | Some p -> p
    | None ->
        let p =
            promise {
                let! m = importFromHome "@echogarden/espeak-ng-emscripten"
                let! instance = (m?``default``: unit -> JS.Promise<obj>) ()
                let worker = createNew instance?eSpeakNGWorker ()
                let voices =
                    (worker?list_voices(): obj[])
                    |> Array.choose (fun v ->
                        let langs: obj[] = v?languages
                        if langs.Length > 0 then Some(string langs[0]?name, string v?identifier) else None)
                    |> Array.rev // the first voice of a language wins
                    |> Map.ofArray
                return { worker = worker; heap = (fun () -> instance?HEAPU8); voices = voices; current = "" }
            }
        espeakLoaded <- Some p
        p

[<Emit("new TextDecoder().decode($0)")>]
let private utf8 (bytes: byte[]) : string = jsNative

/// espeak_TextToPhonemes over every clause of a line (IPA, "_" between phonemes), joined by " " as phonemizer's
/// wrapper joins them; the emscripten build returns the clauses joined by " | ".
let private textToPhonemes (es: Espeak) (line: string) : string =
    let ptr: int = es.worker?text_to_phonemes(line, 1)?ptr
    let heap = es.heap ()
    let mutable e = ptr
    while heap[e] <> 0uy do
        e <- e + 1
    let raw = utf8 (heap?subarray(ptr, e))
    raw.Split([| " | " |], System.StringSplitOptions.None) |> Array.filter (fun c -> c <> "") |> String.concat " "

/// EspeakBackend._postprocess_line with with_stress=True, no tie and the default separator.
let private postprocessLine (line: string) : string =
    // espeak can split an utterance into several lines because of punctuation, here we merge the lines into a
    // single one
    let line = line.Trim().Replace("\n", " ").Replace("  ", " ")
    // due to a bug in espeak-ng, some additional separators can be added at the end of a word
    let line = subWith (subWith line (regex "_+" "g") (fun _ -> "_")) (regex "_ " "g") (fun _ -> " ")
    if line = "" then ""
    else
        line.Split(' ') |> Array.map (fun w -> (w.Trim() + "_").Replace("_", "") + " ") |> String.concat ""

/// Tokenizer.phonemize of kokoro-onnx: phonemizer.phonemize(text, lang, preserve_punctuation=True,
/// with_stress=True), then only the symbols in Kokoro's vocabulary.
let phonemize (text: string) (lang: string) : JS.Promise<string> =
    promise {
        let! es = espeak ()
        match es.voices.TryFind lang with
        | None -> failwith $"language \"{lang}\" is not supported by the espeak backend"
        | Some id ->
            if es.current <> id then
                es.worker?set_voice(id) |> ignore
                es.current <- id
        let text = text.Trim()
        let lines =
            text.Trim('\n').Split('\n') |> Array.map (fun l -> l.Trim('\n')) |> Array.filter (fun l -> l.Trim() <> "")
        let chunks, marks =
            lines
            |> Array.mapi (fun num line -> preserveLine line num)
            |> Array.toList
            |> List.unzip
            |> fun (c, m) -> List.concat c |> List.filter (fun c -> c <> ""), List.concat m
        let phonemized = chunks |> List.map (textToPhonemes es >> postprocessLine)
        let joined = if lines.Length = 0 then "" else restore phonemized marks |> String.concat "\n"
        return (codePoints joined |> Array.filter VOCAB.ContainsKey |> String.concat "").Trim()
    }

// The voice -----------------------------------------------------------------------------------------------------

let private MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX"
// fp32: kokoro-js's fp16 model gives all-NaN audio on the CPU for about one sentence in seven (17 of the 122 in a
// 14-minute test video), and its fp32 model times speech the same as fp16 does.
let private DTYPE = "fp32"
/// kokoro-onnx's MAX_PHONEME_LENGTH: the model's context, less the two pad tokens.
let private MAX_PHONEMES = 510

/// Where transformers.js keeps the model: <tool home>/models.
let modelDir () = join [ toolHome; "models" ]

/// The model file once it is downloaded.
let modelFile () = join [ modelDir (); "onnx-community"; "Kokoro-82M-v1.0-ONNX"; "onnx"; "model.onnx" ]

// The model runs in a worker thread (this same module, started with workerData {kokoro: true}). onnxruntime-node
// aborts the process ("libc++abi: ... mutex lock failed") when process.exit() is called while it is loaded in the
// main thread, even after the session is disposed, and Cv.js always exits with process.exit().

let private workerThreads: obj = importAll "node:worker_threads"

[<Emit("import.meta.url")>]
let private thisModule: string = jsNative

[<Emit("new $0('int64', BigInt64Array.from($1, BigInt), [1, $1.length])")>]
let private idsTensor (tensorClass: obj) (ids: int[]) : obj = jsNative

/// The worker's side: loads kokoro-js and its model on the first request (downloading the model into
/// <tool home>/models the first time), then answers {id, ids, voice, speed} with {id, audio} or {id, error},
/// one request at a time.
let private serveVoice () =
    let port: obj = workerThreads?parentPort
    let model =
        lazy
            (let transformers = requireFromHome "@huggingface/transformers"
             transformers?env?cacheDir <- modelDir ()
             // onnxruntime's warnings (the "UserWarning" lines build.sh filtered out of the Python engine)
             transformers?env?backends?onnx?logLevel <- "error"
             let kokoro = requireFromHome "kokoro-js"
             kokoro?KokoroTTS?from_pretrained(MODEL, createObj [ "dtype" ==> DTYPE; "device" ==> "cpu" ])
             |> Promise.map (fun tts -> tts, transformers?Tensor))
    let queue = ref (Promise.lift ())
    let handle (msg: obj) =
        promise {
            let! tts, tensor = model.Force()
            let input = idsTensor tensor msg?ids
            let! audio = tts?generate_from_ids(input, createObj [ "voice" ==> msg?voice; "speed" ==> msg?speed ])
            let samples: obj = audio?audio
            port?postMessage(createObj [ "id" ==> msg?id; "audio" ==> samples ], [| samples?buffer |])
        }
        |> Promise.catch (fun e -> port?postMessage(createObj [ "id" ==> msg?id; "error" ==> string e ]))
    port?on("message", fun (msg: obj) -> queue.Value <- queue.Value |> Promise.bind (fun () -> handle msg))

do
    if not (workerThreads?isMainThread: bool) && not (isNull workerThreads?workerData) && workerThreads?workerData?kokoro = true then
        serveVoice ()

type private VoiceWorker =
    { worker: obj
      pending: System.Collections.Generic.Dictionary<int, (float32[] -> unit) * (exn -> unit)>
      mutable next: int }

let mutable private voiceWorker: VoiceWorker option = None

let private voice () : VoiceWorker =
    match voiceWorker with
    | Some v -> v
    | None ->
        let worker =
            createNew workerThreads?Worker (createNew url?URL thisModule, createObj [ "workerData" ==> createObj [ "kokoro" ==> true ] ])
        let v = { worker = worker; pending = System.Collections.Generic.Dictionary(); next = 0 }
        worker?on("message", fun (msg: obj) ->
            let id: int = msg?id
            let ok, (resolve, reject) = v.pending.TryGetValue id
            if ok then
                v.pending.Remove id |> ignore
                if isNull msg?error then resolve msg?audio else reject (exn (string msg?error)))
        worker?on("error", fun (e: obj) ->
            for KeyValue(_, (_, reject)) in List.ofSeq v.pending do
                reject (exn (string e))
            v.pending.Clear())
        voiceWorker <- Some v
        v

/// Kokoro's raw audio for token ids (pads included).
let private generate (ids: int[]) (voiceName: string) (speed: float) : JS.Promise<float32[]> =
    let v = voice ()
    Promise.create (fun resolve reject ->
        let id = v.next
        v.next <- id + 1
        v.pending[id] <- (resolve, reject)
        v.worker?postMessage(createObj [ "id" ==> id; "ids" ==> ids; "voice" ==> voiceName; "speed" ==> speed ]))

/// Stops the model's worker thread, if it was started.
let release () : JS.Promise<unit> =
    match voiceWorker with
    | None -> Promise.lift ()
    | Some v ->
        voiceWorker <- None
        v.worker?terminate() |> Promise.map ignore

let private voiceFile (name: string) : string =
    let req: obj = nodeModule?createRequire(join [ toolHome; "node"; "package.json" ])
    let entry: string = req?resolve("kokoro-js")
    join [ dirname entry; ".."; "voices"; name + ".bin" ]

/// Kokoro._split_phonemes: batches of at most MAX_PHONEMES, split at punctuation.
let private splitPhonemes (phonemes: string) : string list =
    let batches = ResizeArray<string>()
    let mutable current = ""
    for raw in splitRe phonemes (regex "([.,!?;])" "") do
        let part = raw.Trim()
        if part <> "" then
            if (codePoints current).Length + (codePoints part).Length + 1 >= MAX_PHONEMES then
                batches.Add(current.Trim())
                current <- part
            elif ".,!?;".Contains part then
                current <- current + part
            else
                if current <> "" then current <- current + " "
                current <- current + part
    if current <> "" then batches.Add(current.Trim())
    List.ofSeq batches

/// Kokoro.create(phonemes, is_phonemes=True): each batch voiced, its silent edges trimmed, the batches joined.
let private create (phonemes: string) (voiceName: string) (speed: float) : JS.Promise<float32[]> =
    promise {
        if not (speed >= 0.5 && speed <= 2.0) then failwith "Speed should be between 0.5 and 2.0"
        if not (exists (voiceFile voiceName)) then failwith $"Voice {voiceName} not found in available voices"
        let parts = ResizeArray<float32[]>()
        for batch in splitPhonemes phonemes do
            let ids =
                codePoints batch
                |> Array.truncate MAX_PHONEMES
                |> Array.choose VOCAB.TryFind
            let! audio = generate (Array.concat [ [| 0 |]; ids; [| 0 |] ]) voiceName speed
            // Trim leading and trailing silence for a more natural sound concatenation
            parts.Add(Wav.trim audio)
        return Wav.concat (List.ofSeq parts)
    }

/// Voices a short phrase end to end (setup's check that the voice works).
let selfTest () : JS.Promise<unit> =
    promise {
        let! ph = phonemize "Ready." "en-us"
        let! samples = create ph "af_heart" 1.0
        do! release ()
        if samples.Length = 0 then failwith "the voice produced no audio"
    }

// Narrate ---------------------------------------------------------------------------------------------------------

/// A stretch of the soundtrack: silence (a number of samples) or speech.
type private Audio =
    | Silence of int
    | Speech of float32[]

type private Part = { text: string; spoken: string; lang: Py.Json; start: float; finish: float }

type private Sentence = { text: string; spoken: string; start: float; finish: float; parts: Part list }

type private Break = { kind: string; sentence: int; start: float; finish: float }

type private Scene =
    { id: obj
      /// the id as written (Python keeps 1.0 apart from 1)
      idJson: Py.Json
      start: float
      finish: float
      sentences: Sentence list
      /// chapter, toasts, breaks and recap, when present, in that order
      extras: (string * Py.Json) list }

let private num x = Py.Float x

let private sceneJson (s: Scene) : Py.Json =
    let part (p: Part) =
        Py.Obj [ "text", Py.Str p.text; "spoken", Py.Str p.spoken; "lang", p.lang; "start", num p.start; "end", num p.finish ]
    let sentence (c: Sentence) =
        Py.Obj
            [ "text", Py.Str c.text
              "spoken", Py.Str c.spoken
              "start", num c.start
              "end", num c.finish
              "parts", Py.List(List.map part c.parts) ]
    Py.Obj(
        [ "id", s.idJson
          "start", num s.start
          "end", num s.finish
          "sentences", Py.List(List.map sentence s.sentences) ]
        @ s.extras
    )

[<Emit("typeof $0")>]
let private jsTypeof (o: obj) : string = jsNative

/// dict.get: None when the key is absent (a null value is Some null).
let private get (o: obj) (key: string) : obj option =
    let v: obj = o?(key)
    if jsTypeof v = "undefined" then None else Some v

let private getFloat (o: obj) (key: string) (fallback: float) : float =
    match get o key with
    | Some v -> float (unbox<float> v)
    | None -> fallback

/// The soundtrack's samples: the speech pieces with their silences between.
let private soundtrack (audio: Audio list) : float32[] =
    let out: float32[] = Array.zeroCreate (audio |> List.sumBy (function Silence n -> n | Speech s -> s.Length))
    let mutable at = 0
    for a in audio do
        match a with
        | Silence n -> at <- at + n
        | Speech s ->
            out?set(s, at) |> ignore
            at <- at + s.Length
    out

[<Emit("Object.assign({}, $0, { thumbnail: $1 })")>]
let private withThumbnail (card: obj) (thumbnail: obj) : obj = jsNative

[<Emit("($0 === undefined || $0 === null)")>]
let private isNil (x: obj) : bool = jsNative

/// The length the workspace's brief asks for ("short", "tour", "deep"), or "" when there is no brief.
let private briefLength (ws: string) : string =
    let brief = join [ ws; "brief.json" ]
    if exists brief then
        let v: obj = (readJson brief)?length
        if isNil v then "tour" else string v
    else ""

let run (ws: string) : JS.Promise<unit> =
    requirePackages voicePackages
    let clip = resolve ws
    let scriptText = readText (join [ clip; "script.json" ])
    let script = parseJson scriptText
    // The same JSON with Python's int/float distinction, for the values copied into timing.json as they are.
    let marked = Py.parseMarked scriptText
    let name: obj = script?name
    if not (jsTypeof name = "string" && test NAME (unbox name)) then
        fail $"name {Py.repr name} must match {NAME_PATTERN} - it becomes the file name on the server"
    let name: string = unbox name
    let voiceName: string option =
        match get script "voice" with
        | None -> Some "af_heart"
        | Some v when Py.truthy v -> Some(unbox v)
        | Some _ -> None
    let lang: obj = get script "lang" |> Option.defaultValue (box "en-us")
    let speed = getFloat script "speed" 1.0
    let others: obj = get script "voices" |> Option.filter (isNull >> not) |> Option.defaultValue (createObj [])
    let pronounce: Map<string, obj> =
        match get script "pronounce" with
        | Some p when not (isNull p) -> Py.keys p |> Array.map (fun k -> k.Trim(), p?(k)) |> Map.ofArray
        | _ -> Map.empty
    let specs = (box (createObj [ "voice" ==> voiceName; "lang" ==> lang ])) :: [ for k in Py.keys others -> others?(k) ]
    for spec in specs do
        let lang: obj = spec?lang
        if Py.truthy spec?voice && not (jsTypeof lang = "string" && KOKORO_LANGS.Contains(unbox lang)) then
            let can = KOKORO_LANGS |> Set.toList |> List.sort |> String.concat ", "
            fail (
                $"Kokoro cannot speak {Py.repr lang} (it can: {can}). "
                + "Narrate in the learner's language, or set \"voice\": null for a captioned silent clip."
            )

    let build = join [ clip; "build" ]
    let cache = join [ build; "tts-cache" ]
    mkdirp cache

    let specFor (code: string option) : string * string =
        match code with
        | None -> voiceName.Value, unbox lang
        | Some code ->
            match get others code with
            | Some spec -> unbox spec?voice, unbox spec?lang
            | None ->
                fail ("{" + code + ":...} needs \"voices\": {\"" + code + "\": {\"voice\": ..., \"lang\": ...}} in script.json")

    let report = ResizeArray<string>()

    let synth (code: string option) (text: string) (where: string) : JS.Promise<float32[]> =
        promise {
            let v, l = specFor code
            let phonemes =
                pronounce.TryFind(text.Trim()) |> Option.filter Py.truthy |> Option.map (fun p -> string p)
            let text = if phonemes.IsNone && l.ToLower().StartsWith "en" then voiced text else text
            match code with
            | Some c ->
                let! ph =
                    match phonemes with
                    | Some p -> Promise.lift p
                    | None -> phonemize text l
                let source = if phonemes.IsSome then "pinned" else "auto"
                report.Add $"{where}\t{c}\t{text}\t{ph}\t{source}"
            | None -> ()
            // The key names the engine too, so pieces the Python engine (kokoro-onnx, fp16) cached are not mixed in.
            let key =
                (sha1Hex (toJson [| box "kokoro-js 1.2.1 fp32"; box v; box l; box speed; box (defaultArg phonemes text) |]))
                    .Substring(0, 16)
            let path = join [ cache; key + ".wav" ]
            if not (exists path) then
                let! ph =
                    match phonemes with
                    | Some p -> Promise.lift p
                    | None -> phonemize text l
                let! samples = create ph v speed
                Wav.write (path + ".part") samples
                rename (path + ".part") path
            return Wav.read path
        }

    let audio = ResizeArray<Audio>()
    let pos = ref 0 // the samples so far
    let frame = ref 0 // the frame the current scene starts on
    let silence (seconds: float) =
        let n = Py.roundInt (seconds * float Wav.SR)
        audio.Add(Silence n)
        pos.Value <- pos.Value + n
    let now () = timeAt frame.Value pos.Value

    promise {
        let scenes = ResizeArray<Scene>()
        let seen = System.Collections.Generic.HashSet<string>()
        let sceneObjs: obj[] = script?scenes
        let markedScenes: obj[] = marked?scenes
        for si in 0 .. sceneObjs.Length - 1 do
            let sc = sceneObjs[si]
            let id: obj = sc?id
            if not (seen.Add(toJson id)) then fail $"duplicate scene id {Py.repr id}"
            let startFrame = frame.Value
            silence (getFloat sc "lead" 0.4)
            let lines = ResizeArray<Sentence>()
            let sceneBreaks = ResizeArray<Break>()
            let say = get sc "say" |> Option.filter (isNull >> not) |> Option.map unbox<string> |> Option.defaultValue ""
            for i, s in List.indexed (sentences say) do
                if i > 0 then silence GAP
                let sentenceStart = now ()
                let parts = ResizeArray<Part>()
                let after = breaks s
                let s = (subEmpty s BREAK).Trim()
                for k, (code, text) in List.indexed (pieces s) do
                    if k > 0 then silence PART_GAP
                    let partStart = now ()
                    if voiceName.IsSome then
                        let! samples = synth code (spoken text) $"{Py.str id}[{i}]"
                        audio.Add(Speech samples)
                        pos.Value <- pos.Value + samples.Length
                    else
                        silence (readingTime (shown text))
                    parts.Add
                        { Part.text = shown text
                          spoken = heard text
                          lang = (match code with Some c -> Py.Str c | None -> Py.ofJs lang)
                          start = partStart
                          finish = now () }
                lines.Add
                    { Sentence.text = shown s
                      spoken = heard s
                      start = sentenceStart
                      finish = now ()
                      parts = List.ofSeq parts }
                for kind, secs in after do
                    let breakStart = now ()
                    silence secs
                    sceneBreaks.Add { kind = kind; sentence = i; start = breakStart; finish = now () }
            silence (getFloat sc "hold" 0.0 + getFloat sc "pad" (if lines.Count > 0 then 0.9 else 0.0))
            // End on a whole frame (and never on the frame the scene started on).
            let over = pos.Value % FRAME
            if over <> 0 || pos.Value = startFrame * FRAME then
                audio.Add(Silence(FRAME - over))
                pos.Value <- pos.Value + FRAME - over
            frame.Value <- pos.Value / FRAME
            let msc = markedScenes[si]
            let passthrough key =
                match get sc key with
                | Some v when Py.truthy v -> [ key, Py.ofJs msc?(key) ]
                | _ -> []
            let breakJson (b: Break) =
                Py.Obj [ "kind", Py.Str b.kind; "sentence", Py.Int(float b.sentence); "start", num b.start; "end", num b.finish ]
            scenes.Add
                { id = id
                  idJson = Py.ofJs msc?id
                  start = float startFrame / float FPS
                  finish = float frame.Value / float FPS
                  sentences = List.ofSeq lines
                  extras =
                    passthrough "chapter" // a long video's chapter title, on its "-why" bridge scene
                    @ passthrough "toasts" // pop-up badges ("kind", "at" phrase), drawn by the frame
                    @ (if sceneBreaks.Count > 0 then [ "breaks", Py.List [ for b in sceneBreaks -> breakJson b ] ] else []) // [pause]/[think] silences; the frame counts down a think
                    @ passthrough "recap" } // a chapter's closing "So far" lines

        do! release ()
        let duration = float frame.Value / float FPS
        Wav.write (join [ build; "narration.wav" ]) (soundtrack (List.ofSeq audio))

        let scenes = List.ofSeq scenes
        let posterId: obj =
            match get script "poster" with
            | Some p when Py.truthy p -> p
            | _ -> (if scenes.Length > 1 then scenes[1] else scenes[0]).id
        let poster =
            match scenes |> List.tryFind (fun s -> toJson s.id = toJson posterId) with
            | None -> fail $"poster scene {Py.repr posterId} not found"
            | Some ps when ps.sentences.IsEmpty -> ps.finish - 0.1
            | Some ps -> (List.last ps.sentences).finish

        let timing =
            Py.Obj(
                [ "name", Py.Str name
                  "title", (match get script "title" with Some v -> Py.ofJs v | None -> Py.Str "")
                  "voiced", Py.Bool voiceName.IsSome
                  // "captions": true in script.json draws each sentence at the bottom of the picture as it is spoken
                  // (for players that start muted or cannot load the separate .vtt file). Off unless asked for.
                  "captions", Py.Bool (match get script "captions" with Some v -> Py.truthy v | None -> false)
                  "duration", num duration
                  "poster", num (Py.round poster 3)
                  "scenes", Py.List(List.map sceneJson scenes) ]
                @ (match get script "card" with
                   | Some c when Py.truthy c ->
                       // long videos: {"course", "lesson", "sub"} for the opening title card. "thumbnail" becomes the
                       // video's length ("5:08") when the first frame is to be drawn as a thumbnail (title, red
                       // border, play button): asked for with "thumbnail": true, and the default for a short video,
                       // the length meant for a README. false otherwise.
                       let asked: obj = c?thumbnail
                       let on = if isNil asked then briefLength ws = "short" else Py.truthy asked
                       let total = int (System.Math.Round duration)
                       let label = $"{total / 60}:{(string (total % 60)).PadLeft(2, '0')}"
                       [ "card", Py.ofJs (withThumbnail marked?card (if on then box label else box false)) ]
                   | _ -> [])
            )
        writeText (join [ build; "timing.json" ]) (Py.dumpsIndented 2 timing)
        writeText (join [ build; "timing.js" ]) ("window.TIMING = " + Py.dumps timing + ";\n")

        let cues =
            [ yield "WEBVTT"
              yield ""
              for s in scenes do
                  for c in s.sentences do
                      yield $"{vttTime c.start} --> {vttTime c.finish}"
                      yield c.text
                      yield "" ]
        writeText (join [ build; "captions.vtt" ]) (String.concat "\n" cues)
        writeText
            (join [ build; "phonemes.txt" ])
            ("where\tvoice\tphrase\tphonemes\tsource\n"
             + String.concat "\n" report
             + (if report.Count > 0 then "\n" else ""))

        let words = scenes |> List.sumBy (fun s -> s.sentences |> List.sumBy (fun c -> Py.wordCount c.text))
        printfn "%s" $"{name}: {Py.toFixed duration 1}s, {scenes.Length} scenes, {words} words, poster at {Py.toFixed poster 1}s"
        for s in scenes do
            printfn
                "%s"
                $"  {(Py.str s.id).PadRight 14} {(Py.toFixed s.start 1).PadLeft 6} - {(Py.toFixed s.finish 1).PadLeft 6}  ({s.sentences.Length} sentences)"
        if report.Count > 0 then
            printfn "%s" $"  {report.Count} phrase(s) in another voice - check build/phonemes.txt against the lesson"
    }
