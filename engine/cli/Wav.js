
import { getSubArray, tryFindIndexBack, tryFindIndex, map, max as max_1, initialize, setItem, item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { min, max } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { comparePrimitives, disposeSafe, getEnumerator, Exception } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { writeBytes, readBytes } from "./Node.js";
import { sumBy } from "./fable_modules/fable-library-js.5.19.0/List.js";

/**
 * Round half to even: C's lrint in the default rounding mode, and Python's round().
 */
export function roundHalfEven(x) {
    const f = Math.floor(x);
    const d = x - f;
    if (d > 0.5) {
        return f + 1;
    }
    else if (d < 0.5) {
        return f;
    }
    else if ((f % 2) === 0) {
        return f;
    }
    else {
        return f + 1;
    }
}

/**
 * 16-bit PCM mono WAV bytes (a Buffer) for float samples, converted exactly as the Python engine's soundfile
 * (libsndfile 1.2.2) wrote floats to PCM_16: scaled by 32768, rounded down, clipped to the 16-bit range (measured
 * sample for sample on random and ramp signals).
 */
export function encode(samples) {
    const n = samples.length | 0;
    const pcm = new Int16Array(n);
    for (let i = 0; i <= (n - 1); i++) {
        const v = Math.floor(item(i, samples) * 32768);
        setItem(pcm, i, ((max(-32768, min(32767, v)) + 0x8000 & 0xFFFF) - 0x8000) | 0);
    }
    const dataBytes = (n * 2) | 0;
    const h = Buffer.alloc(44);
    h.write("RIFF", 0, "ascii");
    h.writeUInt32LE((36 + dataBytes), 4);
    h.write("WAVEfmt ", 8, "ascii");
    h.writeUInt32LE(16, 16);
    h.writeUInt16LE(1, 20);
    h.writeUInt16LE(1, 22);
    h.writeUInt32LE(24000, 24);
    h.writeUInt32LE((24000 * 2), 28);
    h.writeUInt16LE(2, 32);
    h.writeUInt16LE(16, 34);
    h.write("data", 36, "ascii");
    h.writeUInt32LE(dataBytes, 40);
    return Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)]);
}

/**
 * Float samples from 16-bit PCM mono WAV bytes, scaled by 1/32768 as soundfile reads them.
 */
export function decode(buf) {
    const ascii = (o) => (buf.toString("ascii", o, (o + 4)));
    const total = buf.length | 0;
    if (((total < 12) ? true : (ascii(0) !== "RIFF")) ? true : (ascii(8) !== "WAVE")) {
        throw new Exception("not a WAV file");
    }
    let off = 12;
    let pcm16 = false;
    let result = undefined;
    while ((result == null) && ((off + 8) <= total)) {
        const id = ascii(off);
        const size = (buf.readUInt32LE(off + 4)) | 0;
        switch (id) {
            case "fmt ": {
                const format = (buf.readUInt16LE(off + 8)) | 0;
                const channels = (buf.readUInt16LE(off + 10)) | 0;
                const bits = (buf.readUInt16LE(off + 22)) | 0;
                pcm16 = (((format === 1) && (channels === 1)) && (bits === 16));
                break;
            }
            case "data": {
                if (!pcm16) {
                    throw new Exception("only 16-bit PCM mono WAV files are supported");
                }
                const n = ~~(min(size, (total - off) - 8) / 2) | 0;
                const pcm = new Int16Array(buf.buffer.slice(buf.byteOffset + (off + 8), buf.byteOffset + (off + 8) + n * 2));
                const out = new Float32Array(n);
                for (let i = 0; i <= (n - 1); i++) {
                    setItem(out, i, item(i, pcm) / 32768);
                }
                result = out;
                break;
            }
            default:
                undefined;
        }
        off = ((((off + 8) + size) + (size % 2)) | 0);
    }
    if (result == null) {
        throw new Exception("WAV file has no data chunk");
    }
    else {
        return result;
    }
}

export function read(path) {
    return decode(readBytes(path));
}

export function write(path, samples) {
    writeBytes(path, encode(samples));
}

/**
 * The samples of several pieces, one after another.
 */
export function concat(pieces) {
    const out = new Float32Array(sumBy((p) => (p.length | 0), pieces, {
        GetZero: () => 0,
        Add: (x, y) => ((x + y) | 0),
    }));
    let at = 0;
    const enumerator = getEnumerator(pieces);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const p_1 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            out.set(p_1, at);
            at = ((at + p_1.length) | 0);
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    return out;
}

/**
 * Leading and trailing silence cut off, exactly as kokoro-onnx did to every generated piece with librosa's
 * effects.trim (vendored in kokoro_onnx/trim.py) at its defaults: top_db 60, ref = the loudest frame,
 * frame_length 2048, hop_length 512. Frames are centred (frame_length/2 zeros padded at both ends); a frame is silent
 * when its RMS is 60 dB or more below the loudest frame's. The kept span runs from the first loud frame's start to
 * the last loud frame's end (frame index * hop). Without this the pieces keep Kokoro's silent edges and every
 * timing drifts.
 */
export function trim(y) {
    const n = y.length | 0;
    const pad = ~~(2048 / 2) | 0;
    const rms = initialize(1 + ~~(((n + (2 * pad)) - 2048) / 512), (f) => {
        const first = ((f * 512) - pad) | 0;
        let s = 0;
        for (let i = max(0, first); i <= min(n - 1, (first + 2048) - 1); i++) {
            const v = item(i, y);
            s = (s + (v * v));
        }
        return Math.sqrt(s / 2048);
    }, Float64Array);
    const db = (power) => (10 * Math.log10(max(1E-10, power)));
    const peak = max_1(rms, {
        Compare: (x, y_1) => (comparePrimitives(x, y_1) | 0),
    });
    const refDb = db(peak * peak);
    const loud = map((r) => ((db(r * r) - refDb) > -60), rms);
    const matchValue_3 = tryFindIndex((x_1) => x_1, loud);
    const matchValue_4 = tryFindIndexBack((x_2) => x_2, loud);
    let matchResult, a, b;
    if (matchValue_3 != null) {
        if (matchValue_4 != null) {
            matchResult = 0;
            a = matchValue_3;
            b = matchValue_4;
        }
        else {
            matchResult = 1;
        }
    }
    else {
        matchResult = 1;
    }
    switch (matchResult) {
        case 0:
            return getSubArray(y, a * 512, min(n, (b + 1) * 512) - (a * 512));
        default:
            return new Float32Array([]);
    }
}

