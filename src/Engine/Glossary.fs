/// How technical terms are said aloud. A script writes "JSON", "C#" or "Render.fs" as they are spelled; the voice
/// should say "jason", "C sharp" and "render dot F S", and the caption should still show the term as written.
/// `apply` rewrites a scene's "say" so that it does: every term it knows becomes the script's own
/// `[shown](spoken)` form, which narrate, check and the captions already understand.
///
/// The words come from engine/glossary.json ("terms" and "extensions"), with a repository's own
/// <repo>/.codebase-video/glossary.json laid over it: its entries win, and an empty string leaves a term as written.
///
///   - A term is matched as a whole word, in its exact case, longest first ("ASP.NET" before ".NET").
///   - A dotted name (Render.fs, window.render, el.style.color) is said with "dot" for each dot, and each part by
///     "terms", else by "extensions" (the part in lower case), else as written. Not when every part is one letter
///     ("e.g."), and not next to a slash: a path is the writer's to spell.
///   - What the script already marked is left alone: `[shown](spoken)`, `{fr:...}`, `[pause]`, `[think]`, `[rest]`.
module Glossary

open Fable.Core
open Fable.Core.JsInterop
open Node

type Glossary =
    { Terms: Map<string, string>
      Extensions: Map<string, string>
      /// one regular expression for everything `apply` looks for, or null when there are no terms
      Finder: obj }

[<Emit("JSON.parse($0)")>]
let private parseJson (text: string) : obj = jsNative

[<Emit("Object.entries($0 || {})")>]
let private entries (o: obj) : (string * obj)[] = jsNative

[<Emit("$0.replace(/[.*+?^${}()|[\\]\\\\\\/]/g, '\\\\$&')")>]
let private escapeRx (s: string) : string = jsNative

[<Emit("new RegExp($0, $1)")>]
let private regex (pattern: string) (flags: string) : obj = jsNative

/// Every match of `rx` (a global expression) in `text`: where it starts, the whole match, and its first two groups
/// (undefined when a group did not take part).
[<Emit("Array.from($0.matchAll($1), m => [m.index, m[0], m[1], m[2]])")>]
let private finds (text: string) (rx: obj) : (int * string * string * string)[] = jsNative

/// Where each match of `rx` (a global expression) in `text` starts and how long it is.
[<Emit("Array.from($0.matchAll($1), m => [m.index, m[0].length])")>]
let private spans (text: string) (rx: obj) : (int * int)[] = jsNative

/// What a script has already marked, which the glossary must not look inside.
let private MARKED = regex """\[[^\]]*\]\([^)]*\)|\{[a-z]{2,3}:[^{}]+\}|\[(?:pause|think|rest)[^\]]*\]""" "g"

let private DOTTED = """[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)+"""

let private build (terms: Map<string, string>) (extensions: Map<string, string>) : Glossary =
    // Longest first, so "ASP.NET" is found before ".NET" and "APIs" before "API".
    let alternatives =
        terms
        |> Map.toList
        |> List.map fst
        |> List.sortByDescending (fun t -> t.Length)
        |> List.map escapeRx
    // Group 1 is a dotted name, group 2 a term. Neither may touch a letter, a digit or a slash on either side; a
    // term may be followed by a dot (the end of a sentence), a dotted name was tried first.
    let before, after = """(?<![\p{L}\p{N}_/#+-])""", """(?![\p{L}\p{N}_/#+])"""
    let term = if alternatives.IsEmpty then "(?!)" else String.concat "|" alternatives
    { Terms = terms
      Extensions = extensions
      Finder = regex $"{before}(?:({DOTTED})|((?<!\\.){term})){after}" "gu" }

let private stringMap (o: obj) : (string * string) list =
    [ for k, v in entries o do
          if jsTypeof v = "string" then k, unbox<string> v ]

/// The engine's glossary with the repository's own laid over it (`ws` is <repo>/.codebase-video/<name>).
let load (ws: string) : Glossary =
    let read (file: string) : obj = if exists file then parseJson (readText file) else createEmpty
    let over (table: string) (bottom: Map<string, string>) (top: obj) =
        (bottom, stringMap (top?(table)))
        ||> List.fold (fun m (k, v) -> if v = "" then Map.remove k m else Map.add k v m)
    let own = read (join [ engineDir; "glossary.json" ])
    let repo = read (join [ dirname ws; "glossary.json" ])
    build (over "terms" (over "terms" Map.empty own) repo) (over "extensions" (over "extensions" Map.empty own) repo)

/// How a dotted name is said: "dot" for each dot, each part by the glossary where it knows it.
let private dotted (g: Glossary) (name: string) : string =
    match g.Terms.TryFind name with
    | Some said -> said
    | None ->
        let parts = name.Split '.'
        if parts |> Array.forall (fun p -> p.Length = 1) then name
        else
            parts
            |> Array.mapi (fun i p ->
                match g.Terms.TryFind p with
                | Some said -> said
                | None when i > 0 -> defaultArg (g.Extensions.TryFind(p.ToLower())) p
                | None -> p)
            |> String.concat " dot "

/// A stretch of a "say": the script's own mark, which the glossary leaves alone, or the words between marks.
type private Piece =
    | Plain of string
    | Marked of string

/// A "say" cut into the stretches between the script's own marks and the marks themselves, in order.
let private pieces (say: string) : Piece list =
    let rec walk (pos: int) (found: (int * int) list) (cut: Piece list) =
        match found with
        | [] -> List.rev (Plain (say.Substring pos) :: cut)
        | (i, len) :: rest ->
            walk (i + len) rest (Marked (say.Substring(i, len)) :: Plain (say.Substring(pos, i - pos)) :: cut)
    walk 0 (List.ofArray (spans say MARKED)) []

/// `text` (which holds no marks) with every term the glossary knows written as `[term](how it is said)`, and each
/// term the glossary says differently from how it is written, with how, in the order they come.
let private scan (g: Glossary) (text: string) : string * (string * string) list =
    let rec walk (pos: int) (found: (int * string * string * string) list) (built: string list) said =
        match found with
        | [] -> String.concat "" (List.rev (text.Substring pos :: built)), List.rev said
        | (i, whole, name, term) :: rest ->
            let spoken = if isNull name || jsTypeof name = "undefined" then g.Terms.[term] else dotted g name
            let shown, said' = if spoken = whole then whole, said else $"[{whole}]({spoken})", (whole, spoken) :: said
            walk (i + whole.Length) rest (shown :: text.Substring(pos, i - pos) :: built) said'
    walk 0 (List.ofArray (finds text g.Finder)) [] []

/// A scene's "say" with every term the glossary knows written as `[term](how it is said)`.
let apply (g: Glossary) (say: string) : string =
    pieces say
    |> List.map (function
        | Plain text -> fst (scan g text)
        | Marked mark -> mark)
    |> String.concat ""

/// Every term of a "say" that the glossary will say differently from how it is written, with how.
let uses (g: Glossary) (say: string) : (string * string) list =
    pieces say
    |> List.collect (function
        | Plain text -> snd (scan g text)
        | Marked _ -> [])
