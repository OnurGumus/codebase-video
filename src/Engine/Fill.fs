/// Fill the brief templates for one video: node engine/cli/Cv.js <workspace> fill.
/// Reads <workspace>/brief.json and writes <workspace>/build/brief-<name>.txt.
///
/// brief.json (written by the skill in step 1):
///   name          video name, kebab-case (the output files are out/<name>.mp4 ...)
///   subject       what the video teaches, one line ("How a request flows through ky")
///   repo          absolute path of the repository being taught
///   length        "short" (3-5 min), "tour" (6-10 min) or "deep" (20-28 min)
///   audience      who it is for ("a developer joining the team", "a reviewer", ...)
///   colours       the drawing table: what kind of thing gets which colour and icon
///   care          what to check with special care in this codebase (optional)
///   visual        extra visual checks for this codebase (optional)
/// The teaching document is <workspace>/build/lesson.md (written in step 2, verified in step 3).
///
/// Port of briefs/fill.py. The templates stay in <plugin>/briefs/*.md.
module Fill

open Fable.Core
open Fable.Core.JsInterop
open Node
open Check

/// What each length asks of the writer: (placeholder, value), in the order they are filled.
let private LENGTHS =
    [ "short",
      [ "MINUTES", "3-5 minutes, hard cap 5.5"
        "WORDS", "about 380-600 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"
        "CHAPTERS", "2-3 chapters"
        "SCENES", "2-3 content scenes per chapter, each 20-40 s"
        "THINKS", "no pause-and-think scene (a short video)"
        "DOC", "120-250 lines" ]
      "tour",
      [ "MINUTES", "6-10 minutes, hard cap 11"
        "WORDS", "about 750-1,250 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"
        "CHAPTERS", "3-4 chapters"
        "SCENES", "2-4 content scenes per chapter, each 25-50 s"
        "THINKS", "one pause-and-think scene in each of two chapters"
        "DOC", "200-400 lines" ]
      "deep",
      [ "MINUTES", "20-28 minutes, hard cap 29"
        "WORDS", "about 2,800-3,400 spoken words"
        "CHAPTERS", "5-7 chapters"
        "SCENES", "3-6 content scenes per chapter, each 30-60 s"
        "THINKS", "exactly one pause-and-think scene per chapter"
        "DOC", "500-900 lines" ] ]

let private TEMPLATES = [ "explore"; "verify"; "writer"; "narration-audit"; "builder"; "visual-audit"; "reaudit" ]

let private realpath (p: string) : string = fs?realpathSync(p)

let run (ws: string) : int =
    // Path.resolve() in the Python resolved symlinks; so does this.
    let ws = realpath ws
    let cfg = readJson (join [ ws; "brief.json" ])
    let here = join [ pluginRoot; "briefs" ]
    let lesson = join [ ws; "build"; "lesson.md" ]
    let lines = if exists lesson then (readText lesson).Split('\n').Length else 0
    let required (k: string) : Result<string, string> =
        match Py.get cfg k with
        | null -> Error $"brief.json: missing {Py.reprStr k}"
        | v -> Ok(Py.str v)
    let optional (k: string) (fallback: string) = match Py.get cfg k with null -> fallback | v -> Py.str v
    let lengthName = optional "length" "tour"
    match required "name", required "subject", required "repo", required "colours", List.tryFind (fst >> (=) lengthName) LENGTHS with
    | Error e, _, _, _, _ | _, Error e, _, _, _ | _, _, Error e, _, _ | _, _, _, Error e, _ -> Py.fail e
    | _, _, _, _, None -> Py.fail $"""brief.json: "length" is {Py.reprStr lengthName}; use short, tour or deep"""
    | Ok name, Ok subject, Ok repo, Ok colours, Some(_, length) ->
        // The order matters only if a value holds a placeholder itself; it is the Python's order.
        let vals =
            [ "WS", ws
              "ENGINE", join [ pluginRoot; "engine" ]
              "BRIEFS", here
              "NAME", name
              "SUBJECT", subject
              "REPO", repo
              "AUDIENCE", optional "audience" "a developer new to this codebase"
              "LINES", string lines
              "COLOURS", colours
              "CARE", optional "care" ""
              "VISUAL", optional "visual" "" ]
            @ length
        let rec fill (templates: string list) : int =
            match templates with
            | [] -> 0
            | t :: rest ->
                let s = vals |> List.fold (fun (s: string) (k, v) -> Py.replace s ("{{" + k + "}}") v) (readText (join [ here; t + ".md" ]))
                let left = s.IndexOf "{{"
                if left >= 0 then
                    Py.fail $"""{t}.md: unknown placeholder {Py.reprStr (Py.take 40 (s.Substring left))}"""
                else
                    let out = join [ ws; "build"; $"brief-{t}.txt" ]
                    mkdirp (dirname out)
                    writeText out s
                    Py.print out
                    fill rest
        let code = fill TEMPLATES
        Py.flush ()
        code
