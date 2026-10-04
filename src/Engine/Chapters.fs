/// out/<name>.chapters.vtt from build/timing.json. Port of engine/chapters.py.
module Chapters

/// Writes the chapters file; returns 0, or 3 when the video has no chapters (the caller then removes the file).
let write (timingJson: string) (outVtt: string) : int = failwith "Chapters.write: not ported yet"
