/// Renders clip.html frame by frame in headless Chrome. Port of engine/render.mjs.
module Render

open Fable.Core

/// mode: stills | sheet | serve | video (video args: [fps]); returns an exit code.
let run (ws: string) (mode: string) (args: string list) : JS.Promise<int> = failwith "Render.run: not ported yet"
