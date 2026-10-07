/// WAV encoding and decoding (24 kHz mono float samples <-> 16-bit PCM), and the silence trim Kokoro's pieces get.
/// Owner: narrate.
module Wav

open Fable.Core
open Fable.Core.JsInterop

/// Kokoro's sample rate.
[<Literal>]
let SR = 24000

/// Round half to even: C's lrint in the default rounding mode, and Python's round().
let roundHalfEven (x: float) : float =
    let f = floor x
    let d = x - f
    if d > 0.5 then f + 1.0
    elif d < 0.5 then f
    elif f % 2.0 = 0.0 then f
    else f + 1.0

[<Emit("Buffer.alloc($0)")>]
let private bufferAlloc (n: int) : obj = jsNative

[<Emit("Buffer.concat($0)")>]
let private bufferConcat (parts: obj[]) : obj = jsNative

[<Emit("Buffer.from($0.buffer, $0.byteOffset, $0.byteLength)")>]
let private bufferOf (a: int16[]) : obj = jsNative

/// An aligned copy of `count` little-endian 16-bit samples starting at byte `offset`.
[<Emit("new Int16Array($0.buffer.slice($0.byteOffset + $1, $0.byteOffset + $1 + $2 * 2))")>]
let private int16Copy (buf: obj) (offset: int) (count: int) : int16[] = jsNative

/// 16-bit PCM mono WAV bytes (a Buffer) for float samples, converted exactly as the Python engine's soundfile
/// (libsndfile 1.2.2) wrote floats to PCM_16: scaled by 32768, rounded down, clipped to the 16-bit range (measured
/// sample for sample on random and ramp signals).
let encode (samples: float32[]) : obj =
    let n = samples.Length
    let pcm: int16[] = Array.zeroCreate n
    for i in 0 .. n - 1 do
        let v = floor (float samples[i] * 32768.0)
        pcm[i] <- int16 (max -32768.0 (min 32767.0 v))
    let dataBytes = n * 2
    let h = bufferAlloc 44
    h?write("RIFF", 0, "ascii") |> ignore
    h?writeUInt32LE(36 + dataBytes, 4) |> ignore
    h?write("WAVEfmt ", 8, "ascii") |> ignore
    h?writeUInt32LE(16, 16) |> ignore // fmt chunk size
    h?writeUInt16LE(1, 20) |> ignore // PCM
    h?writeUInt16LE(1, 22) |> ignore // mono
    h?writeUInt32LE(SR, 24) |> ignore
    h?writeUInt32LE(SR * 2, 28) |> ignore // bytes per second
    h?writeUInt16LE(2, 32) |> ignore // block align
    h?writeUInt16LE(16, 34) |> ignore // bits per sample
    h?write("data", 36, "ascii") |> ignore
    h?writeUInt32LE(dataBytes, 40) |> ignore
    bufferConcat [| h; bufferOf pcm |]

/// Float samples from 16-bit PCM mono WAV bytes, scaled by 1/32768 as soundfile reads them.
let decode (buf: obj) : float32[] =
    let ascii (o: int) : string = buf?toString("ascii", o, o + 4)
    let total: int = buf?length
    if total < 12 || ascii 0 <> "RIFF" || ascii 8 <> "WAVE" then failwith "not a WAV file"
    // walk the chunks from `off`, carrying whether the fmt chunk said 16-bit PCM mono
    let rec walk (off: int) (pcm16: bool) : float32[] option =
        if off + 8 > total then
            None
        else
            let id = ascii off
            let size: int = buf?readUInt32LE(off + 4)
            let next = off + 8 + size + size % 2
            if id = "fmt " then
                let format: int = buf?readUInt16LE(off + 8)
                let channels: int = buf?readUInt16LE(off + 10)
                let bits: int = buf?readUInt16LE(off + 22)
                walk next (format = 1 && channels = 1 && bits = 16)
            elif id = "data" then
                if not pcm16 then failwith "only 16-bit PCM mono WAV files are supported"
                let n = (min size (total - off - 8)) / 2
                let pcm = int16Copy buf (off + 8) n
                let out: float32[] = Array.zeroCreate n
                for i in 0 .. n - 1 do
                    out[i] <- float32 (float pcm[i] / 32768.0)
                Some out
            else
                walk next pcm16
    match walk 12 false with
    | Some r -> r
    | None -> failwith "WAV file has no data chunk"

let read (path: string) : float32[] = decode (Node.readBytes path)
let write (path: string) (samples: float32[]) : unit = Node.writeBytes path (encode samples)

/// The samples of several pieces, one after another.
let concat (pieces: float32[] list) : float32[] =
    let out: float32[] = Array.zeroCreate (pieces |> List.sumBy (fun p -> p.Length))
    pieces
    |> List.fold
        (fun at p ->
            out?set(p, at) |> ignore
            at + p.Length)
        0
    |> ignore
    out

/// Leading and trailing silence cut off, exactly as kokoro-onnx did to every generated piece with librosa's
/// effects.trim (vendored in kokoro_onnx/trim.py) at its defaults: top_db 60, ref = the loudest frame,
/// frame_length 2048, hop_length 512. Frames are centred (frame_length/2 zeros padded at both ends); a frame is silent
/// when its RMS is 60 dB or more below the loudest frame's. The kept span runs from the first loud frame's start to
/// the last loud frame's end (frame index * hop). Without this the pieces keep Kokoro's silent edges and every
/// timing drifts.
let trim (y: float32[]) : float32[] =
    let frameLength, hop, topDb = 2048, 512, 60.0
    let n = y.Length
    let pad = frameLength / 2
    let frames = 1 + (n + 2 * pad - frameLength) / hop
    let rms =
        Array.init frames (fun f ->
            let first = f * hop - pad
            let mutable s = 0.0 // a sample loop: a local accumulator is clearest
            for i in max 0 first .. min (n - 1) (first + frameLength - 1) do
                let v = float y[i]
                s <- s + v * v
            sqrt (s / float frameLength))
    // amplitude_to_db(rms, ref=np.max): power_to_db(rms**2, ref=max**2, amin=1e-10)
    let db (power: float) = 10.0 * log10 (max 1e-10 power)
    let peak = Array.max rms
    let refDb = db (peak * peak)
    let loud = rms |> Array.map (fun r -> db (r * r) - refDb > -topDb)
    match Array.tryFindIndex id loud, Array.tryFindIndexBack id loud with
    | Some a, Some b -> Array.sub y (a * hop) (min n ((b + 1) * hop) - a * hop)
    | _ -> [||]
