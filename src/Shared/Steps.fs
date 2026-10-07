/// How a video is cut into presentation steps: one per sentence, each holding on a moment once its sentence has
/// been said. A step plays from the previous step's hold to its own. Both the `present` step's slides
/// (src/Engine/Present.fs) and the click-through deck (src/Kit/Stage.fs) compile this file, so a slide and a deck
/// step always show the same frame. Plain F#, no JS: each side maps its timing into these records.
module Steps

type Sentence = { Start: float; End: float; Text: string }

/// A [pause] or [think] silence after sentence `Sentence` of its scene.
type Break = { Sentence: int; Kind: string; Seconds: float }

type Scene =
    { Ends: float
      /// set on a chapter's bridge scene; the chapter runs to the next one
      Chapter: string option
      Sentences: Sentence list
      Breaks: Break list }

type Step =
    { Start: float
      Hold: float
      Text: string
      /// None before the first chapter
      Chapter: string option
      /// the silences after the sentence: (kind, seconds)
      Pauses: (string * float) list }

let private FRAME = 1.0 / 30.0
/// How long after its sentence a step holds: room for what its last words set moving.
let private AFTER = 0.5
/// The kit starts a reveal up to 0.2 s before its cue (a table's rows, src/Kit/Kit.fs), so a sentence holds at least
/// this long before the next one starts, before what the next sentence brings begins to fade in.
let private EARLY = 0.25
/// A scene's content starts to leave this long before the scene ends (a module fades over its last 0.45 s, the
/// title card over 0.5 s), so a scene's last sentence holds no later.
let private LEAVING = 0.6

/// A sentence holds AFTER seconds after it is said, but EARLY before the next one starts; a scene's last sentence
/// holds as it ends, before the scene's content leaves. Never before the sentence starts.
let private holdOf (sceneEnds: float) (s: Sentence) (next: Sentence option) : float =
    let hold =
        match next with
        | Some n -> min (s.End + AFTER) (n.Start - EARLY)
        | None -> min s.End (sceneEnds - LEAVING)
    max hold s.Start

/// The steps of a video; one step on its last frame when nothing is said.
let cut (duration: float) (scenes: Scene list) : Step list =
    let chapters = scenes |> List.scan (fun current sc -> sc.Chapter |> Option.orElse current) None |> List.tail
    let steps =
        List.zip scenes chapters
        |> List.collect (fun (sc, chapter) ->
            sc.Sentences
            |> List.mapi (fun i s ->
                { Start = s.Start
                  Hold = holdOf sc.Ends s (List.tryItem (i + 1) sc.Sentences)
                  Text = s.Text
                  Chapter = chapter
                  Pauses = sc.Breaks |> List.filter (fun b -> b.Sentence = i) |> List.map (fun b -> b.Kind, b.Seconds) }))
    match steps with
    | [] -> [ { Start = 0.0; Hold = duration - FRAME; Text = ""; Chapter = None; Pauses = [] } ]
    | _ -> steps
