/// Writes a WebVTT chapters file from a long video's build/timing.json. Port of engine/chapters.py.
/// A chapter is a scene with "chapter": "Title" (the "-why" bridge); it runs to the next one, the last to
/// the end of the video. The stretch before the first chapter is "Introduction". Videos without chapters
/// write nothing (3), so callers can skip them. lesson-video.js reads <name>.chapters.vtt.
module Chapters

open Fable.Core.JsInterop
open Node

let private stamp (t: float) : string =
    let ms = Narrate.Py.roundInt (t * 1000.0)
    let two (n: int) = (string n).PadLeft(2, '0')
    $"{two (ms / 3600000)}:{two (ms / 60000 % 60)}:{two (ms / 1000 % 60)}.{(string (ms % 1000)).PadLeft(3, '0')}"

/// Writes the chapters file; returns 0, or 3 when the video has no chapters (the caller then removes the file).
let write (timingJson: string) (outVtt: string) : int =
    let timing = readJson timingJson
    let marks =
        [ for s in (timing?scenes: obj[]) do
              if Narrate.Py.truthy s?chapter then (s?start: float), Narrate.Py.str s?chapter ]
    match marks with
    | [] -> 3
    | (first, _) :: _ ->
        let marks = if first > 1.0 then (0.0, "Introduction") :: marks else marks
        let ends = (marks |> List.tail |> List.map fst) @ [ timing?duration ]
        let lines =
            [ yield "WEBVTT"
              yield ""
              for (start, title), finish in List.zip marks ends do
                  yield $"{stamp start} --> {stamp finish}"
                  yield title.Replace("-->", "->")
                  yield "" ]
        writeText outVtt (String.concat "\n" lines)
        0
