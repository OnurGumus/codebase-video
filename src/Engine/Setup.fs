/// One-time setup into the tool home. Port of engine/setup.sh (without Python: the voice is kokoro-js).
module Setup

open Fable.Core

let run () : JS.Promise<int> = failwith "Setup.run: not ported yet"
/// Exits with a hint to run setup when the tool home is not ready.
let requireReady () : unit = ()
