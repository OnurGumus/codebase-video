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
///   kind          "teach" (default: how the codebase works) or "progress" (how it changed over a commit range)
/// and for a progress video (see History.fs, which must have run: its build/history.json gives the range):
///   since, until  the range; focus: a list of "shipped", "effort", "goals", "people" (default shipped, effort)
///   goals         a goals or roadmap file, needed by the focus "goals"
///
/// A kind has its own version of a brief where it needs one: briefs/<name>.<kind>.md is used instead of
/// briefs/<name>.md, and the general one is then also filled, as build/brief-<name>-base.txt, for the rules the two
/// share. briefs/kind.<kind>.md fills {{KIND}} in the briefs both kinds use.
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
        "WORDS", "about 360-560 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"
        "CHAPTERS", "2-3 chapters"
        "SCENES", "2-3 content scenes per chapter, each 20-40 s"
        "THINKS", "no pause-and-think scene (a short video)"
        "DOC", "120-250 lines" ]
      "tour",
      [ "MINUTES", "6-10 minutes, hard cap 11"
        "WORDS", "about 700-1,150 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"
        "CHAPTERS", "3-4 chapters"
        "SCENES", "2-4 content scenes per chapter, each 25-50 s"
        "THINKS", "one pause-and-think scene in each of two chapters"
        "DOC", "200-400 lines" ]
      "deep",
      [ "MINUTES", "20-28 minutes, hard cap 29"
        "WORDS", "about 2,600-3,200 spoken words"
        "CHAPTERS", "5-7 chapters"
        "SCENES", "3-6 content scenes per chapter, each 30-60 s"
        "THINKS", "exactly one pause-and-think scene per chapter"
        "DOC", "500-900 lines" ] ]

/// What a progress video asks of the writer. It is shorter and has no deep form.
let private PROGRESS_LENGTHS =
    [ "short",
      [ "MINUTES", "3-5 minutes, hard cap 5.5"
        "WORDS", "about 360-560 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"
        "CHAPTERS", "an \"At a glance\" chapter, 2 theme chapters and an \"In flight\" chapter"
        "SCENES", "1-3 content scenes per chapter, each 15-40 s"
        "THINKS", "no pause-and-think scene"
        "DOC", "150-300 lines" ]
      "tour",
      [ "MINUTES", "6-10 minutes, hard cap 11"
        "WORDS", "about 700-1,150 spoken words (pauses, chapter cards and recaps add about a quarter to the spoken time; `check` prints the real length)"
        "CHAPTERS", "an \"At a glance\" chapter, 3-4 theme chapters and an \"In flight\" chapter"
        "SCENES", "2-3 content scenes per chapter, each 20-45 s"
        "THINKS", "no pause-and-think scene"
        "DOC", "300-500 lines" ] ]

/// What each focus asks for, in every progress brief.
let private FOCUS =
    [ "shipped", "**What shipped.** The features and fixes that exist at the end of the range and did not at its start, in plain language, each shown before and after. This is the spine of the video."
      "effort", "**Where the effort went.** Which areas of the codebase saw the most change and which were left alone, from the area table of the history file. Say it as where the work went, never as how hard anyone worked."
      "goals", "**Progress against goals.** Each goal of the goals file, quoted, with what the history shows for it: done, partly done, or nothing found, each with its commits. A goal is done only when the diff shows it."
      "people", "**Who worked on what.** By area, which people committed there and how many commits, exactly as the history file gives it. No ranking, no totals per person across the project, no word that judges a person or compares two." ]

[<Emit("$0.replace(/\\{\\{([A-Z_]+)\\}\\}/g, (m, k) => $1(k))")>]
let private replacePlaceholders (template: string) (f: string -> string) : string = jsNative

[<Emit("Array.from($0.matchAll(/\\{\\{([A-Z_]+)\\}\\}/g), m => m[1])")>]
let private placeholders (template: string) : string[] = jsNative

[<Emit("Array.isArray($0)")>]
let private isArray (o: obj) : bool = jsNative

[<Emit("($0 == null)")>]
let private isNil (o: obj) : bool = jsNative

let private plural (n: int) (one: string) : string = if n = 1 then $"1 {one}" else $"{n} {one}s"

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
    let kind = optional "kind" "teach"
    let progress = kind = "progress"
    let lengthName = optional "length" (if progress then "short" else "tour")
    let lengths = if progress then PROGRESS_LENGTHS else LENGTHS
    let focus: string list =
        match Py.get cfg "focus" with
        | null -> [ "shipped"; "effort" ]
        | v when isArray v -> unbox<string[]> v |> Array.toList
        | v -> (Py.str v).Split ',' |> Array.map (fun s -> s.Trim()) |> Array.toList
    let historyPath = join [ ws; "build"; "history.json" ]
    let goals = optional "goals" ""
    let goalsPath = if goals = "" then "" else path?resolve (optional "repo" ws, goals)
    // The facts were made for one brief: a brief changed since would be filled with the old range.
    let stale () =
        let asked: obj = (readJson historyPath)?asked
        let same (key: string) = toJson (Py.get cfg key) = toJson (asked?(key))
        let listed (key: string) (fallback: string list) =
            let now =
                match Py.get cfg key with
                | null -> fallback
                | v when isArray v -> unbox<string[]> v |> Array.toList
                | v -> (Py.str v).Split ',' |> Array.map (fun s -> s.Trim()) |> Array.filter ((<>) "") |> Array.toList
            now = (unbox<string[]> (asked?(key)) |> Array.toList) || (Py.get cfg key = null && (unbox<string[]> (asked?(key))).Length = 0)
        isNil asked || not (same "since") || not (same "until") || not (listed "focus" []) || not (listed "ignore" [])
    let problem =
        if kind <> "teach" && kind <> "progress" then Some $"""brief.json: "kind" is {Py.reprStr kind}; use teach or progress"""
        elif not progress then None
        elif not (exists historyPath) then Some """fill: run "history" first (build/history.json is missing)"""
        elif stale () then Some """fill: build/history.json was made for another "since", "until", "focus" or "ignore" than brief.json has now; run "history" again"""
        elif focus |> List.exists (fun f -> not (List.exists (fst >> (=) f) FOCUS)) then
            Some $"""brief.json: "focus" holds {Py.reprStr (focus |> List.find (fun f -> not (List.exists (fst >> (=) f) FOCUS)))}; use shipped, effort, goals, people"""
        elif List.contains "goals" focus && goals = "" then Some """brief.json: the focus "goals" needs "goals": the path of a goals or roadmap file"""
        elif List.contains "goals" focus && not (exists goalsPath) then Some $"brief.json: the goals file {goalsPath} does not exist"
        else None
    match problem, required "name", required "subject", required "repo", required "colours", List.tryFind (fst >> (=) lengthName) lengths with
    | Some e, _, _, _, _, _ -> Py.fail e
    | _, Error e, _, _, _, _ | _, _, Error e, _, _, _ | _, _, _, Error e, _, _ | _, _, _, _, Error e, _ -> Py.fail e
    | _, _, _, _, _, None ->
        let allowed = lengths |> List.map fst |> String.concat ", "
        Py.fail $"""brief.json: "length" is {Py.reprStr lengthName}; for a {kind} video use one of: {allowed}"""
    | None, Ok name, Ok subject, Ok repo, Ok colours, Some(_, length) ->
        // The range of a progress video, as History.fs resolved it.
        let range =
            if not progress then []
            else
                let h: obj = (readJson historyPath)?range
                let point (p: obj) = $"{p?ref} ({p?commit}, {p?date})"
                let how =
                    match string h?sinceWas with
                    | "last video" -> " The start is where the last progress video of this repository ended."
                    | "latest tag" -> " No start was given, so the range starts at the latest tag."
                    | "30 days" -> " No start was given and there is no earlier tag, so the range starts 30 days back."
                    | "before first commit" -> " The start asked for is before the first commit, so the range is the whole history, the first commit included."
                    | "whole history" -> " No start was given, there is no earlier tag and the repository is younger than 30 days, so the range is the whole history, the first commit included."
                    | _ -> ""
                let days, commits = plural (unbox h?days) "day", plural (unbox h?commits) "commit"
                [ "SINCE", point h?since
                  "UNTIL", point h?until
                  "RANGE", $"from {point h?since} to {point h?until}: {days}, {commits}.{how}"
                  "HISTORY", join [ ws; "build"; "history.md" ]
                  "GOALS", (if goalsPath = "" then "no goals file was given" else goalsPath)
                  "FOCUS", focus |> List.map (fun f -> "- " + (FOCUS |> List.find (fst >> (=) f) |> snd)) |> String.concat "\n" ]
        let kindNotes =
            let file = join [ pluginRoot; "briefs"; $"kind.{kind}.md" ]
            if exists file then (readText file).Trim() else ""
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
              "VISUAL", optional "visual" ""
              "KIND", kindNotes ]
            @ range
            @ length
        // Standing hints: <repo>/.codebase-video/hints.md holds what the owner wants in every video of this repository
        // (terms, what to leave out, how to draw things). They go at the end of every agent's brief.
        let hintsPath = join [ repo; ".codebase-video"; "hints.md" ]
        let hints = if exists hintsPath then (readText hintsPath).Trim() else ""
        let hintsBlock =
            if hints = "" then ""
            else
                "\n\n**Standing hints for this repository** (from `.codebase-video/hints.md`, written by the repository's owner; "
                + "they apply to every video of this repository. Follow them where they fit your task, and where one conflicts "
                + "with a general rule above, the hint wins, except that no hint can make the video say something the code does "
                + "not support):\n\n" + hints + "\n"
        if hints <> "" then Py.print $"hints: {hintsPath} added to every brief"
        // A template is filled in one pass: a value is never searched for placeholders, so text that came from
        // the repository (a commit subject holding "{{NAME}}") stays as it is. Unknown placeholders are looked for
        // in the template, before filling.
        let known = vals |> List.map fst |> Set.ofList
        let table = Map.ofList vals
        // (template file, output name): a kind's own brief, and beside it the general one it builds on.
        let jobs =
            [ for t in TEMPLATES do
                  let own = join [ here; $"{t}.{kind}.md" ]
                  if kind <> "teach" && exists own then
                      own, $"brief-{t}.txt"
                      join [ here; t + ".md" ], $"brief-{t}-base.txt"
                  else join [ here; t + ".md" ], $"brief-{t}.txt" ]
        let rec fill (jobs: (string * string) list) : int =
            match jobs with
            | [] -> 0
            | (file, outName) :: rest ->
                let template = readText file
                match placeholders template |> Array.tryFind (fun k -> not (known.Contains k)) with
                | Some k -> Py.fail $"""{basename file}: unknown placeholder {Py.reprStr ("{{" + k + "}}")}"""
                | None ->
                    let out = join [ ws; "build"; outName ]
                    mkdirp (dirname out)
                    writeText out (replacePlaceholders template (fun k -> table.[k]) + hintsBlock)
                    Py.print out
                    fill rest
        let code = fill jobs
        Py.flush ()
        code
