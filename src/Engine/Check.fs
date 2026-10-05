/// Check a lesson clip before rendering: the script, its timing, its module code and (optionally) the lesson.
///
/// Usage: node engine/cli/Cv.js <clip-dir> check [--lesson lesson.md]
///
/// Catches, for free, the things audits kept finding by eye:
///   script   duplicate or badly formed scene ids; a [shown](spoken) pair whose shown text ends a sentence
///            (the splitter cannot see that period, so two sentences merge); sentences too long for one caption;
///            digits, symbols and acronyms the voice may misread (not wrapped in [shown](spoken))
///   long     (clips with "-why" bridge scenes) every bridge has a "chapter" title; an intro and an outro exist;
///            every chapter has content; every module prefix has its <key>.js
///   cues     every "scene|phrase", "scene#n" and "scene" time in the module files names a real scene, sentence
///            and spoken phrase (the same lookup Stage.word does), so a re-voiced line fails here, not on screen
///   lesson   (--lesson) numbers in the narration and in on-screen strings that the lesson never states
///   length   words and estimated minutes per chapter (Kokoro af_heart speaks about 2.4 words a second)
///   toasts   every scene "toasts" entry names a known kind (the kit's TOASTS) and a phrase spoken in that
///            scene; warns when toasts crowd (under 6 s apart) or one kind dominates
///   breathe  talk share of the running time and the longest stretch with no pause of 1.5 s or more (long
///            videos: warns over 45 s and over 82% talk; a chapter with no recap or think gets a nudge)
///   flow     per chapter, the share of sentences that link to the one before (so, but, remember, the tricky
///            part, ...); a chapter under FLOW_MIN reads as a list of facts. Also flags one connective overused.
///
/// Exit status 1 when there is an error; warnings alone exit 0.
///
/// Port of engine/check.py. The output is byte-for-byte what the Python printed, so this file also carries `Py`:
/// the few Python behaviours the report depends on (regex semantics, repr, float formatting, sorting, splitlines),
/// shared with ScanReport, ApplyFixes and Fill.
module Check

open Fable.Core
open Fable.Core.JsInterop
open Node

/// Python behaviours the ported tools must reproduce exactly, because agents diff and grep their output.
module Py =

    // ── output ─────────────────────────────────────────────────────────────────────────────────────────────
    // Output is buffered and written with writeSync at the end: Cv.js calls process.exit right after a step, and
    // on macOS an async write to a pipe (a long `report timeline`) would be cut off by that exit.

    [<Emit("Buffer.from($0, 'utf8')")>]
    let private utf8 (s: string) : obj = jsNative

    [<Emit("Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, $0)")>]
    let private sleepMs (ms: int) : unit = jsNative

    /// Writes all of s to a file descriptor, waiting while a non-blocking pipe is full (EAGAIN).
    let writeFd (fd: int) (s: string) : unit =
        let buf = utf8 s
        let len: int = buf?length
        let mutable off = 0
        while off < len do
            try
                let n: int = fs?writeSync(fd, buf, off, len - off)
                off <- off + n
            with e ->
                if (e?code: string) = "EAGAIN" then sleepMs 2 else raise e

    let private outBuf = ResizeArray<string>()

    /// print(): one line to stdout (buffered until flush).
    let print (s: string) : unit = outBuf.Add(s + "\n")

    let flush () : unit =
        if outBuf.Count > 0 then
            let s = System.String.Join("", outBuf)
            outBuf.Clear()
            writeFd 1 s

    /// sys.exit("message"): flush stdout, the message to stderr, status 1.
    let fail (msg: string) : int =
        flush ()
        writeFd 2 (msg + "\n")
        1

    // ── regex ──────────────────────────────────────────────────────────────────────────────────────────────
    // Patterns are written in Python syntax and translated to a JS RegExp with the u flag, so that \w, \d, \s, \b,
    // `.` and `$` mean what they meant in Python 3 (Unicode letters and digits, Python's whitespace set, `.` not
    // matching a newline, `$` also before a final newline).

    let private W = @"\p{L}\p{N}_"
    let private S = @"\t\n\v\f\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000"
    let private syntaxChars = @"^$\.*+?()[]{}|/"

    let private translate (p: string) (multiline: bool) : string =
        let sb = System.Text.StringBuilder()
        let boundary = "(?:(?<=[" + W + "])(?![" + W + "])|(?<![" + W + "])(?=[" + W + "]))"
        let nonBoundary = "(?:(?<=[" + W + "])(?=[" + W + "])|(?<![" + W + "])(?![" + W + "]))"
        let mutable i = 0
        let mutable inClass = false
        while i < p.Length do
            let c = p.[i]
            if c = '\\' && i + 1 < p.Length then
                let d = p.[i + 1]
                i <- i + 2
                let s =
                    match d with
                    | 'w' -> if inClass then W else "[" + W + "]"
                    | 'W' -> "[^" + W + "]"
                    | 'd' -> @"\p{Nd}"
                    | 'D' -> @"\P{Nd}"
                    | 's' -> if inClass then S else "[" + S + "]"
                    | 'S' -> "[^" + S + "]"
                    | 'b' -> if inClass then @"\x08" else boundary
                    | 'B' -> nonBoundary
                    | 'A' -> @"(?<![\s\S])"
                    | 'Z' -> @"(?![\s\S])"
                    | 'x' | 'u' | 'n' | 't' | 'r' | 'f' | 'v' | 'p' | 'P' -> "\\" + string d
                    | _ when System.Char.IsDigit d -> "\\" + string d
                    | '-' when inClass -> @"\-"
                    | _ when syntaxChars.IndexOf d >= 0 -> "\\" + string d
                    | _ -> string d // an identity escape the u flag would reject: the character itself
                sb.Append(s) |> ignore
            elif inClass then
                if c = ']' then inClass <- false
                sb.Append(c) |> ignore
                i <- i + 1
            else
                match c with
                | '[' ->
                    inClass <- true
                    sb.Append(c) |> ignore
                    if i + 1 < p.Length && p.[i + 1] = '^' then
                        sb.Append('^') |> ignore
                        i <- i + 1
                | '.' -> sb.Append(@"[^\n]") |> ignore
                | '$' -> sb.Append(if multiline then @"(?=\n|(?![\s\S]))" else @"(?=\n?(?![\s\S]))") |> ignore
                | '^' -> sb.Append(if multiline then @"(?<![^\n])" else "^") |> ignore
                | _ -> sb.Append(c) |> ignore
                i <- i + 1
        sb.ToString()

    type Rx = { Src: string; Flags: string }

    let rx (p: string) : Rx = { Src = translate p false; Flags = "u" }
    let rxI (p: string) : Rx = { Src = translate p false; Flags = "ui" }

    [<Emit("new RegExp($0, $1)")>]
    let private mk (src: string) (flags: string) : obj = jsNative

    [<Emit("Array.from($0.matchAll($1))")>]
    let private matchAll (s: string) (r: obj) : obj[] = jsNative

    [<Emit("$1.exec($0)")>]
    let private exec (s: string) (r: obj) : obj = jsNative

    [<Emit("$0 == null")>]
    let isNone (x: obj) : bool = jsNative

    /// A match: groups (0 = the whole match; None for a group that did not take part), start and end offsets.
    type M =
        { Groups: string option[]
          Start: int
          End: int }

        member m.Value = m.Groups.[0].Value
        member m.Group(n: int) = m.Groups.[n]
        /// m.group(n) or "" (a group that did not take part).
        member m.G(n: int) = defaultArg m.Groups.[n] ""

    let private toM (m: obj) : M =
        let arr: obj[] = unbox m
        let groups = arr |> Array.map (fun g -> if isNone g then None else Some(unbox<string> g))
        let start: int = m?index
        { Groups = groups
          Start = start
          End = start + groups.[0].Value.Length }

    let finditer (r: Rx) (s: string) : M list =
        matchAll s (mk r.Src (r.Flags + "g")) |> Array.map toM |> Array.toList

    let search (r: Rx) (s: string) : M option =
        let m = exec s (mk r.Src r.Flags)
        if isNone m then None else Some(toM m)

    let found (r: Rx) (s: string) : bool = (search r s).IsSome

    /// re.match: anchored at the start.
    let matchStart (r: Rx) (s: string) : M option =
        let m = exec s (mk ("^(?:" + r.Src + ")") r.Flags)
        if isNone m then None else Some(toM m)

    let fullmatch (r: Rx) (s: string) : bool =
        not (isNone (exec s (mk ("^(?:" + r.Src + ")$") r.Flags)))

    /// re.sub with a function.
    let sub (r: Rx) (f: M -> string) (s: string) : string =
        let sb = System.Text.StringBuilder()
        let mutable last = 0
        for m in finditer r s do
            sb.Append(s.Substring(last, m.Start - last)).Append(f m) |> ignore
            last <- m.End
        sb.Append(s.Substring(last)).ToString()

    [<Emit("$0.split($1)")>]
    let private jsSplit (s: string) (r: obj) : string[] = jsNative

    let split (r: Rx) (s: string) : string list = jsSplit s (mk r.Src r.Flags) |> Array.toList

    /// re.escape for a literal inside a pattern.
    let escape (s: string) : string =
        s |> Seq.map (fun c -> if syntaxChars.IndexOf c >= 0 || c = '-' then "\\" + string c else string c) |> String.concat ""

    // ── strings ────────────────────────────────────────────────────────────────────────────────────────────

    let private wsRun = rx @"\s+"
    let private stripRx = rx @"^\s+|\s+$"

    /// str.strip()
    let strip (s: string) : string = sub stripRx (fun _ -> "") s

    /// str.split() with no argument: runs of whitespace, no empty pieces.
    let words (s: string) : string list =
        let t = strip s
        if t = "" then [] else split wsRun t

    /// str.splitlines()
    let splitlines (s: string) : string list =
        let parts = split (rx @"\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]") s
        match List.rev parts with
        | "" :: rest -> List.rev rest
        | _ -> parts

    [<Emit("Array.from($0)")>]
    let codePoints (s: string) : string[] = jsNative

    /// len(s): code points.
    let len (s: string) : int = (codePoints s).Length

    /// str.count(sub), non-overlapping.
    let count (s: string) (sub: string) : int =
        if sub = "" then len s + 1
        else
            let mutable n = 0
            let mutable i = s.IndexOf(sub, System.StringComparison.Ordinal)
            while i >= 0 do
                n <- n + 1
                i <- s.IndexOf(sub, i + sub.Length, System.StringComparison.Ordinal)
            n

    /// str.replace(old, new): every occurrence.
    [<Emit("$0.split($1).join($2)")>]
    let replace (s: string) (old: string) (by: string) : string = jsNative

    /// s[a:b] by code points (Python slice rules for non-negative bounds; b clipped).
    let slice (s: string) (a: int) (b: int) : string =
        let cp = codePoints s
        let b = min b cp.Length
        if a >= b then "" else System.String.Join("", cp.[a .. b - 1])

    /// s[:n]
    let take (n: int) (s: string) : string = slice s 0 n

    /// Python string ordering (by code point; JS < compares UTF-16 units).
    let cmpStr (a: string) (b: string) : int =
        let x, y = codePoints a, codePoints b
        let mutable i = 0
        let mutable r = 0
        while r = 0 && i < x.Length && i < y.Length do
            let cx: int = x.[i]?codePointAt(0)
            let cy: int = y.[i]?codePointAt(0)
            r <- compare cx cy
            i <- i + 1
        if r <> 0 then r else compare x.Length y.Length

    // ── numbers ────────────────────────────────────────────────────────────────────────────────────────────

    [<Emit("Number.isInteger($0)")>]
    let isInteger (x: float) : bool = jsNative

    [<Emit("Object.is($0, -0) || $0 < 0")>]
    let private negative (x: float) : bool = jsNative

    [<Emit("BigInt($0).toString()")>]
    let private bigIntString (x: float) : string = jsNative

    [<Emit("$0.toExponential()")>]
    let private toExponential (x: float) : string = jsNative

    /// repr(float): shortest round-trip digits, fixed between 1e-4 and 1e16, ".0" when whole.
    let floatRepr (x: float) : string =
        if System.Double.IsNaN x then "nan"
        elif System.Double.IsPositiveInfinity x then "inf"
        elif System.Double.IsNegativeInfinity x then "-inf"
        elif x = 0.0 then (if negative x then "-0.0" else "0.0")
        else
            let e = toExponential (abs x)
            let k = e.IndexOf 'e'
            let digits = e.Substring(0, k).Replace(".", "")
            let exp = int (e.Substring(k + 1))
            let sign = if x < 0.0 then "-" else ""
            if exp >= -4 && exp < 16 then
                if exp >= 0 then
                    let intPart = digits.PadRight(exp + 1, '0').Substring(0, exp + 1)
                    let frac = if digits.Length > exp + 1 then digits.Substring(exp + 1) else "0"
                    sign + intPart + "." + frac
                else
                    sign + "0." + String.replicate (-exp - 1) "0" + digits
            else
                let mant = if digits.Length > 1 then digits.Substring(0, 1) + "." + digits.Substring(1) else digits
                let es = string (abs exp)
                sign + mant + "e" + (if exp < 0 then "-" else "+") + (if es.Length < 2 then "0" + es else es)

    /// A number as Python would print it: an int prints as an int, a float with repr.
    let numStr (x: float) (isFloat: bool) : string =
        if isFloat then floatRepr x else bigIntString x

    /// A number read from JSON written by JS (JSON.stringify never writes "1.0"): whole means int.
    let jsonNum (x: float) : string = numStr x (not (isInteger x) || abs x >= 1e21)

    /// |x| exactly as digits D and a scale s: |x| = D / 10^s (a double is m * 2^e, and m * 2^-k = m * 5^k / 10^k).
    [<Emit("""(() => { const v = new DataView(new ArrayBuffer(8)); v.setFloat64(0, Math.abs($0));
        const hi = v.getUint32(0), ex = (hi >>> 20) & 0x7ff; let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(v.getUint32(4));
        let e = -1074; if (ex !== 0) { m |= 1n << 52n; e = ex - 1075; }
        return e >= 0 ? [(m << BigInt(e)).toString(), 0] : [(m * 5n ** BigInt(-e)).toString(), -e]; })()""")>]
    let private exactParts (x: float) : string * int = jsNative

    /// The exact decimal digits of |x| as "0" + integer digits + fraction digits (at least 30), and the point's
    /// index. Rounding these half to even is what Python's float formatting does.
    let private exactDigits (x: float) : string * int =
        let d, scale = exactParts x
        let d = d.PadLeft(scale + 1, '0')
        let intPart, frac = d.Substring(0, d.Length - scale), d.Substring(d.Length - scale)
        "0" + intPart + frac.PadRight(scale + 30, '0'), intPart.Length + 1

    /// Keep ds[0..q-1], rounding half to even on the rest. The result has q digits (the leading pad absorbs a carry).
    let private roundAt (ds: string) (q: int) : string =
        let kept = ds.Substring(0, q).ToCharArray()
        let rest = ds.Substring(q)
        let up =
            if rest = "" then false
            elif rest.[0] > '5' then true
            elif rest.[0] < '5' then false
            elif rest.Substring(1).TrimEnd('0') <> "" then true
            else q > 0 && (int kept.[q - 1] - int '0') % 2 = 1
        if up then
            let mutable j = q - 1
            let mutable carry = true
            while carry && j >= 0 do
                if kept.[j] = '9' then
                    kept.[j] <- '0'
                    j <- j - 1
                else
                    kept.[j] <- char (int kept.[j] + 1)
                    carry <- false
        System.String(kept)

    let private signOf (x: float) = if negative x then "-" else ""

    /// format(x, ".{n}f")
    let fmtF (n: int) (x: float) : string =
        if System.Double.IsNaN x then "nan"
        elif System.Double.IsInfinity x then (if x > 0.0 then "inf" else "-inf")
        else
            let ds, pt = exactDigits x
            let kept = roundAt ds (pt + n)
            let intPart = kept.Substring(0, pt).TrimStart('0')
            let intPart = if intPart = "" then "0" else intPart
            signOf x + intPart + (if n > 0 then "." + kept.Substring(pt) else "")

    /// format(x, "{w}.{n}f"): right-aligned in w columns.
    let fixedW (w: int) (n: int) (x: float) : string = (fmtF n x).PadLeft(w)

    /// format(x, ".{n}%")
    let pct (n: int) (x: float) : string = fmtF n (x * 100.0) + "%"

    /// format(x, "g"): 6 significant digits, trailing zeros dropped.
    let g (x: float) : string =
        let p = 6
        if System.Double.IsNaN x then "nan"
        elif System.Double.IsInfinity x then (if x > 0.0 then "inf" else "-inf")
        elif x = 0.0 then signOf x + "0"
        else
            let ds, pt = exactDigits x
            let first = ds |> Seq.findIndex (fun c -> c <> '0')
            let kept = roundAt ds (first + p)
            let f2 = kept |> Seq.findIndex (fun c -> c <> '0')
            let exp = pt - 1 - f2
            let sigd = kept.Substring(f2).PadRight(p, '0').Substring(0, p)
            if exp >= -4 && exp < p then
                let intPart, frac =
                    if exp >= 0 then sigd.Substring(0, exp + 1), sigd.Substring(exp + 1)
                    else "0", String.replicate (-exp - 1) "0" + sigd
                let frac = frac.TrimEnd('0')
                signOf x + intPart + (if frac = "" then "" else "." + frac)
            else
                let rest = sigd.Substring(1).TrimEnd('0')
                let es = string (abs exp)
                signOf x + sigd.Substring(0, 1) + (if rest = "" then "" else "." + rest) + "e"
                + (if exp < 0 then "-" else "+") + (if es.Length < 2 then "0" + es else es)

    /// round(x) for a float: half to even.
    let round (x: float) : float =
        let r = floor x
        let d = x - r
        if d > 0.5 then r + 1.0
        elif d < 0.5 then r
        elif r % 2.0 = 0.0 then r
        else r + 1.0

    // ── values ─────────────────────────────────────────────────────────────────────────────────────────────

    [<Emit("typeof $0")>]
    let private typeOf (x: obj) : string = jsNative

    [<Emit("Array.isArray($0)")>]
    let private isArray (x: obj) : bool = jsNative

    [<Emit("Object.keys($0)")>]
    let private keys (x: obj) : string[] = jsNative

    let private unprintable =
        rx @"^[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]$"

    let private hex (n: int) (width: int) : string = (n?toString(16): string).PadLeft(width, '0')

    /// repr(str)
    let reprStr (s: string) : string =
        let q = if s.Contains "'" && not (s.Contains "\"") then "\"" else "'"
        let sb = System.Text.StringBuilder(q)
        for ch in codePoints s do
            let c: int = ch?codePointAt(0)
            let piece =
                if ch = q || ch = "\\" then "\\" + ch
                elif c = 9 then "\\t"
                elif c = 10 then "\\n"
                elif c = 13 then "\\r"
                elif c < 32 || c = 0x7f then "\\x" + hex c 2
                elif c < 0x7f then ch
                elif ch <> " " && fullmatch unprintable ch then
                    if c <= 0xff then "\\x" + hex c 2
                    elif c <= 0xffff then "\\u" + hex c 4
                    else "\\U" + hex c 8
                else ch
            sb.Append(piece) |> ignore
        sb.Append(q).ToString()

    /// repr() of a JSON value (dicts keep their key order).
    let rec repr (v: obj) : string =
        if isNone v then "None"
        else
            match typeOf v with
            | "string" -> reprStr (unbox v)
            | "number" -> jsonNum (unbox v)
            | "boolean" -> if unbox v then "True" else "False"
            | _ when isArray v -> "[" + (unbox<obj[]> v |> Array.map repr |> String.concat ", ") + "]"
            | _ -> "{" + (keys v |> Array.map (fun k -> reprStr k + ": " + repr (v?(k))) |> String.concat ", ") + "}"

    let isStr (v: obj) : bool = not (isNone v) && typeOf v = "string"

    /// str() of a JSON value, as an f-string's {x} prints it.
    let str (v: obj) : string =
        if not (isNone v) && typeOf v = "string" then unbox v else repr v

    /// Python truthiness of a JSON value.
    let truthy (v: obj) : bool =
        if isNone v then false
        else
            match typeOf v with
            | "string" -> (unbox<string> v) <> ""
            | "number" -> (unbox<float> v) <> 0.0
            | "boolean" -> unbox v
            | _ when isArray v -> (unbox<obj[]> v).Length > 0
            | _ -> (keys v).Length > 0

    /// d.get(k): None (null) when absent.
    let get (o: obj) (k: string) : obj =
        let v = o?(k)
        if isNone v then null else v

    /// d.get(k, []) for a list.
    let list (o: obj) (k: string) : obj list =
        let v = o?(k)
        if isNone v then [] else unbox<obj[]> v |> Array.toList

    /// Sorted, stable (Python's sort is stable too).
    let sortWith (cmp: 'a -> 'a -> int) (xs: 'a list) : 'a list = List.sortWith cmp xs

// ── the narration's text forms (same splitter and forms as Narrate) ─────────────────────────────────────────

let PRONOUNCE = Py.rx @"\[([^\]]+)\]\(([^)]+)\)"
let FOREIGN = Py.rx @"\{([a-z]{2,3}):([^{}]+)\}"
let BREAK = Py.rx @"\s*\[(pause|think)(?:\s+(\d+(?:\.\d+)?))?\]"
let private breakDefault = function
    | "pause" -> 1.5
    | _ -> 8.0

let private shieldEnd = Py.rx @"[.!?]\s*$"
let private splitter = Py.rx @"(?<=[.!?\x01])\s+(?=[""'“A-Z0-9\[\x00])"
let private restoreRx = Py.rx @"\x00(\d+)[\x00\x01]"
let private openingBreaks = Py.rx @"(?:\[(?:pause|think)(?:\s+[\d.]+)?\]\s*)+"

/// Split after . ! ? when a space and a capital, digit, quote or markup follows; keeps "e.g. the"
/// and "0.802" whole. {code:...} phrases are shielded first, so "{fr:Il est une heure.}" stays one
/// piece. A shielded phrase ends a sentence only when it ends in . ! ? itself (marked \x01): "is
/// {fr:moins le quart} [3:45] or..." is one sentence, "{fr:Il est midi.} Then..." is two.
let sentences (say: string) : string list =
    let shielded = ResizeArray<string>()
    let shield (m: Py.M) =
        shielded.Add m.Value
        let e = if Py.found shieldEnd (m.G 2) then "\u0001" else "\u0000"
        "\u0000" + string (shielded.Count - 1) + e
    let text = Py.sub FOREIGN shield (Py.strip say)
    let parts = Py.split splitter text
    let restore s = Py.sub restoreRx (fun m -> shielded.[int (m.G 1)]) s
    let out = ResizeArray<string>()
    for p in parts |> List.filter (fun p -> Py.strip p <> "") |> List.map (restore >> Py.strip) do
        let mutable p = p
        // A break marker opening a piece belongs to the sentence before it ("Why? [think 4] Because...").
        match Py.matchStart openingBreaks p with
        | Some m when out.Count > 0 ->
            out.[out.Count - 1] <- out.[out.Count - 1] + " " + Py.strip m.Value
            p <- Py.strip (p.Substring m.End)
        | _ -> ()
        if p <> "" then out.Add p
    List.ofSeq out

/// The silences a sentence asks for after it: [("pause", 1.5), ("think", 4.0)].
let breaks (s: string) : (string * float) list =
    Py.finditer BREAK s
    |> List.map (fun m ->
        let kind = m.G 1
        kind, (match m.Group 2 with Some n -> float n | None -> breakDefault kind))

let shown (s: string) : string =
    s
    |> Py.sub BREAK (fun _ -> "")
    |> Py.sub PRONOUNCE (fun m -> m.G 1)
    |> Py.sub FOREIGN (fun m -> m.G 2)
    |> Py.strip

// ── the run's findings ───────────────────────────────────────────────────────────────────────────────────────

let private WPS = 2.4

type private Findings =
    { Errors: ResizeArray<string>
      Warnings: ResizeArray<string>
      /// token -> where it is read as written
      Read: JS.Map<string, ResizeArray<string>> }

    member f.err(s: string) = f.Errors.Add s
    member f.warn(s: string) = f.Warnings.Add s

/// A scene of script.json or timing.json, still as JSON (fields read with Py.get, absent ones are None).
type private Json = obj

let private idOf (s: Json) : string = s?id
let private say (s: Json) : string = match Py.get s "say" with null -> "" | v -> unbox v
let private prefix (sid: string) = sid.Split('-').[0]
let private isWhy (sid: string) = sid.EndsWith "-why"
let private sentencesOf (s: Json) : Json list = Py.list s "sentences"

let private load (f: Findings) (clip: string) : Json * Json option =
    let scriptPath = join [ clip; "script.json" ]
    let script = readJson scriptPath
    let timingPath = join [ clip; "build"; "timing.json" ]
    let timing = if exists timingPath then Some(readJson timingPath) else None
    if timing.IsSome && mtime timingPath < mtime scriptPath then
        f.warn "build/timing.json is older than script.json: run `node engine/cli/Cv.js <clip> narrate` (cue checks use the old timing)"
    script, timing

// ── script ───────────────────────────────────────────────────────────────────────────────────────────────────

let private sceneIdRx = Py.rx @"[a-z0-9]+(-[a-z0-9]+)*"
let private endsSentence = Py.rx @"[.!?]$"
let private nextStarts = Py.rx @"\s+[A-Z\""'“\[0-9]"
let private breakLike = Py.rx @"\[(?:pause|think)[^\]]*\]"
let private breakForm = Py.rx @"\[(pause|think)(\s+\d+(\.\d+)?)?\]"
let private foreignAny = Py.rx @"\{[a-z]{2,3}:[^{}]+\}"
let private readToken =
    Py.rx @"\d[\d,.]*\s*(?:%|×|x\b|ms\b|µs\b|ns\b|GB|TB|PB|MB|KB|Gbps|Mbps|k\b|M\b|B\b)?|[×÷≈→%/]|\b[A-Z]{2,}\b"
let private smallNumber = Py.rx @"\d{1,2}"

let private checkScript (f: Findings) (script: Json) =
    let scenes = Py.list script "scenes"
    let ids = scenes |> List.map idOf
    for i in ids |> List.distinct |> List.filter (fun x -> (ids |> List.filter ((=) x)).Length > 1) do
        f.err $"scene id {Py.reprStr i} is used twice"
    for s in scenes do
        let sid, say = idOf s, say s
        if not (Py.fullmatch sceneIdRx sid) then
            f.err $"{sid}: scene ids are lowercase words joined by '-' (the part before the first '-' names the module)"
        for m in Py.finditer PRONOUNCE say do
            let shownText = m.G 1
            let after = say.Substring(m.End, min 2 (say.Length - m.End))
            if Py.found endsSentence shownText && (Py.matchStart nextStarts (after + " ")).IsSome then
                let last = Array.last (Py.codePoints shownText)
                f.err $"{sid}: [{shownText}](...) ends a sentence inside the brackets; move the '{last}' outside, or the next sentence merges into this one"
        sentences say
        |> List.iteri (fun i sent ->
            for m in Py.finditer breakLike sent do
                if not (Py.fullmatch breakForm m.Value) then
                    f.err $"{sid}[{i}]: {Py.reprStr m.Value} is not a break marker ([pause], [pause 2], [think], [think 4]); the voice would read it"
            for kind, secs in breaks sent do
                if not (0.5 <= secs && secs <= 12.0) then
                    f.warn $"{sid}[{i}]: [{kind} {Py.g secs}] - keep breaks between 0.5 and 12 s"
            let words = (Py.words (shown sent)).Length
            if words > 32 then
                f.warn $"{sid}[{i}]: {words} words in one sentence (one caption); split it"
            // what the voice reads as written
            let plain = sent |> Py.sub PRONOUNCE (fun _ -> "") |> Py.sub foreignAny (fun _ -> "")
            for m in Py.finditer readToken plain do
                let tok = Py.strip m.Value
                // small plain numbers read fine
                if tok <> "" && not (Py.fullmatch smallNumber tok) then
                    if not (f.Read.has tok) then f.Read.set(tok, ResizeArray()) |> ignore
                    f.Read.get(tok).Add $"{sid}[{i}]")

// ── long videos ──────────────────────────────────────────────────────────────────────────────────────────────

let private checkLong (f: Findings) (clip: string) (script: Json) : bool =
    let scenes = Py.list script "scenes"
    let whys = scenes |> List.filter (idOf >> isWhy)
    if whys.IsEmpty then false
    else
        for s in whys do
            if not (Py.truthy (Py.get s "chapter")) then
                f.err $"{idOf s}: a bridge scene needs \"chapter\": \"Title\" (the frame shows it on the title card)"
        let prefixes = scenes |> List.map (idOf >> prefix)
        let card = Py.get script "card"
        let cardHas k = Py.truthy card && Py.truthy (Py.get card k)
        if idOf scenes.Head <> "title" || not (cardHas "course") || not (cardHas "lesson") then
            f.err "a long video opens with a scene \"title\" and a top-level \"card\": {\"course\", \"lesson\", \"sub\"}, so the viewer knows the course and lesson before anything else"
        if not (List.contains "intro" prefixes) then
            f.warn "no intro scene: a long video should open by stating its goal"
        if not (List.contains "outro" prefixes) then
            f.warn "no outro scene: a long video should close on its goal"
        let arr = List.toArray scenes
        arr
        |> Array.iteri (fun k s ->
            if isWhy (idOf s)
               && (k + 1 >= arr.Length || isWhy (idOf arr.[k + 1]) || prefix (idOf arr.[k + 1]) = "outro") then
                f.err $"{idOf s}: chapter has no content scenes")
        let keys =
            List.zip prefixes scenes
            |> List.filter (fun (_, s) -> not (isWhy (idOf s)) && idOf s <> "title" && not (Py.truthy (Py.get s "recap")))
            |> List.map fst
            |> List.distinct
        for key in keys do
            if not (exists (join [ clip; key + ".js" ])) then
                f.err $"module {Py.reprStr key} has no {key}.js"
        true

// ── cues ─────────────────────────────────────────────────────────────────────────────────────────────────────

let private SPEC = Py.rx @"[""'`]([a-z0-9]+(?:-[a-z0-9]+)+)(?:\|([^""'`|]+?)(\$)?(?:\|(\d+))?|#(\d+))?[""'`]"
let private WORD_CALL = Py.rx @"\bword\(\s*[""'`]([a-z0-9]+(?:-[a-z0-9]+)+)[""'`]\s*,\s*[""'`]([^""'`]+)[""'`]"
// Any `const NAME = "scene-id"`, also `const A = "…", B = "…"` (S, DEC, REP ...) and its uses `NAME + "|phrase"` / `NAME + "#2"`.
let private SCENE_CONST = Py.rx @"(?:\bconst|\blet|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*[""'`]([a-z0-9]+(?:-[a-z0-9]+)+)[""'`]"
let private SCENE_REF = Py.rx @"\b([A-Za-z_][A-Za-z0-9_]*)\s*\+\s*[""'`]((?:\||#)[^""'`]*)[""'`]"
let private CUE_CALL = Py.rx @"\b(?:cue|at|part)\(\s*[""'`]([a-z0-9]+(?:-[a-z0-9]+)+)[""'`]\s*(?:,\s*(-?\d+))?"

/// The toast kinds the kit knows (TOASTS in the kit, formerly stage-kit.js); keep the two lists in step.
let private toastKinds = set [ "idea"; "tricky"; "remember"; "careful"; "mistake"; "surprise"; "remark"; "question"; "tip" ]

let private lower (s: string) = s.ToLower()
let private textOf (se: Json) : string = se?text
let private spokenOf (se: Json) : string =
    let sp = Py.get se "spoken"
    if Py.truthy sp then unbox sp else textOf se
let private num (o: Json) (k: string) : float = o?(k)

let private checkCuesWith (f: Findings) (timing: Json) (jsFiles: string list) =
    let scenes = Py.list timing "scenes"
    let byId = JS.Constructors.Map.Create<string, Json>()
    for s in scenes do byId.set(idOf s, s) |> ignore
    let nSentences sid = (sentencesOf (byId.get sid)).Length

    let hasPhrase (sid: string) (phrase: string) (nth: int) =
        let units = sentencesOf (byId.get sid) |> List.map (fun se -> lower (spokenOf se), lower (textOf se))
        let want = lower phrase
        [ fst; snd ] |> List.exists (fun field -> (units |> List.sumBy (fun u -> Py.count (field u) want)) >= nth)

    for file in jsFiles do
        let name = basename file
        let names = JS.Constructors.Map.Create<string, string>() // const NAME = "scene-id" seen so far in this file
        Py.splitlines (readText file)
        |> List.iteri (fun i line ->
            let ln = i + 1
            if not ((Py.strip line).StartsWith "//") then
                for d in Py.finditer SCENE_CONST line do
                    names.set(d.G 1, d.G 2) |> ignore
                // `S + "|phrase"` / `S + "#2"` is the same cue as `"<scene>|phrase"`; check it as one.
                let line =
                    line |> Py.sub SCENE_REF (fun m -> if names.has (m.G 1) then "\"" + names.get (m.G 1) + m.G 2 + "\"" else m.Value)
                for m in Py.finditer SPEC line do
                    let sid = m.G 1
                    let whole = m.Value
                    // a plain string that merely looks like an id
                    if not (prefix sid = "k" || (not (byId.has sid) && not (whole.Contains "|") && not (whole.Contains "#"))) then
                        if not (byId.has sid) then
                            f.err $"{name}:{ln}: no scene {Py.reprStr sid}"
                        else
                            match m.Group 2, m.Group 4, m.Group 5 with
                            | Some phrase, nth, _ when not (hasPhrase sid phrase (match nth with Some n -> int n | None -> 1)) ->
                                let times = match nth with Some n -> $" {n} times" | None -> ""
                                f.err $"{name}:{ln}: {Py.reprStr phrase} is not spoken in {sid}{times}"
                            | Some _, _, _ -> ()
                            | None, _, Some sent when int sent >= nSentences sid ->
                                f.err $"{name}:{ln}: {sid} has {nSentences sid} sentence(s), asked for #{sent}"
                            | _ -> ()
                for m in Py.finditer WORD_CALL line do
                    let sid, phrase = m.G 1, m.G 2
                    if byId.has sid && not (hasPhrase sid phrase 1) then
                        f.err $"{name}:{ln}: word({Py.reprStr sid}, {Py.reprStr phrase}): not spoken there"
                    elif not (byId.has sid) then
                        f.err $"{name}:{ln}: no scene {Py.reprStr sid}"
                for m in Py.finditer CUE_CALL line do
                    let sid = m.G 1
                    if not (byId.has sid) then
                        f.err $"{name}:{ln}: no scene {Py.reprStr sid}"
                    else
                        match m.Group 2 with
                        | Some i when int i >= nSentences sid || -(int i) > nSentences sid ->
                            f.err $"{name}:{ln}: {sid} has {nSentences sid} sentence(s), asked for {i}"
                        | _ -> ())

    /// When a toast fires: the start of the sentence holding its phrase, plus the phrase's share of that
    /// sentence (the kit interpolates words the same way, near enough for a 6 s spacing check).
    let toastTime (s: Json) (at: obj) : float =
        let sents = sentencesOf s |> List.toArray
        if sents.Length = 0 then num s "start"
        elif Py.truthy at && (Py.str at).StartsWith "#" then
            let i = int ((Py.str at).Substring 1)
            let k = min i (sents.Length - 1)
            num sents.[if k < 0 then k + sents.Length else k] "start"
        elif Py.truthy at then
            let want = lower (Py.str at)
            let hit =
                sents
                |> Array.tryPick (fun se ->
                    [ lower (spokenOf se); lower (textOf se) ]
                    |> List.tryPick (fun text ->
                        let k = text.IndexOf(want, System.StringComparison.Ordinal)
                        if k >= 0 then
                            let start, stop = num se "start", num se "end"
                            Some(start + (stop - start) * float (Py.len (text.Substring(0, k))) / float (max (Py.len text) 1))
                        else None))
            defaultArg hit (num sents.[0] "start")
        else num sents.[0] "start"

    // Toasts on scenes (script.json "toasts"): known kind, a phrase that is spoken, and not crowded.
    let seen = ResizeArray<float * obj * string>()
    for s in scenes do
        for d in Py.list s "toasts" do
            let kind = Py.get d "kind"
            let where = $"{idOf s} toast {Py.repr kind}"
            if not (Py.isStr kind && toastKinds.Contains(unbox kind)) then
                f.err $"""{where}: unknown kind; use one of {toastKinds |> Set.toList |> Py.sortWith Py.cmpStr |> String.concat ", "}"""
            let at = Py.get d "at"
            if Py.truthy at && not ((Py.str at).StartsWith "#") && not (hasPhrase (idOf s) (Py.str at) 1) then
                f.err $"{where}: {Py.repr at} is not spoken in {idOf s}"
            let text = Py.get d "text"
            if Py.truthy text && (Py.words (unbox text)).Length > 5 then
                f.warn $"{where}: text {Py.repr text} is long for a badge; keep it to about 4 words"
            seen.Add((toastTime s at, kind, where))
    let seen =
        seen
        |> List.ofSeq
        |> Py.sortWith (fun (a, ka, wa) (b, kb, wb) ->
            let c = compare a b
            if c <> 0 then c
            else
                let c = Py.cmpStr (Py.str ka) (Py.str kb)
                if c <> 0 then c else Py.cmpStr wa wb)
    // Every pair, in the same scene or not: two badges within 6 s crowd the top band.
    for (a, _, wa), (b, _, wb) in List.pairwise seen do
        if b - a < 6.0 then
            f.warn $"toasts crowd: {wa} and {wb} are {Py.fmtF 1 (b - a)} s apart (keep at least 6 s)"
    if not seen.IsEmpty then
        // Counter.most_common(): by count, ties in first-seen order
        let counts =
            seen
            |> List.map (fun (_, k, _) -> Py.str k)
            |> List.countBy id
            |> List.sortWith (fun (_, a) (_, b) -> compare b a)
        let listed = counts |> List.map (fun (k, n) -> $"{k} {n}") |> String.concat ", "
        Py.print $"toasts: {listed} ({seen.Length} total)"

let private checkCues (f: Findings) (timing: Json option) (jsFiles: string list) =
    match timing with
    | None -> f.warn "no build/timing.json yet: cue checks skipped (run narrate first)"
    | Some timing -> checkCuesWith f timing jsFiles

// ── lesson grounding ─────────────────────────────────────────────────────────────────────────────────────────

let private NUM = Py.rx @"(?<![\w.])\d+(?:[.,]\d+)*"
let private shorthand = Py.rx @"(?<![\w.])(\d+(?:\.\d+)?)\s*([kKMB])(?![a-zA-Z])"
let private stringLit = Py.rx """"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`"""
let private anyDigit = Py.rx @"\d"
let private layoutish = Py.rx @"\d\s*px\b|\b(?:left|top|width|height|margin|padding|translate|scale|rotate|rgba?)\b|#[0-9a-f]{3}"
let private svgPath = Py.rx @"\s*[MLCQZmlcqz][\d\s.,MLCQZmlcqz-]*"
let private coords = Py.rx @"[\d\s.,-]+"

let private norm (n: string) = n.Replace(",", "")

let private checkLesson (f: Findings) (script: Json) (jsFiles: string list) (lessonText: string) =
    let have = System.Collections.Generic.HashSet<string>()
    for m in Py.finditer NUM lessonText do have.Add(norm m.Value) |> ignore
    // "35k/s", "1.8M", "3B/day": the lesson's shorthand for the numbers a narrator says in full.
    for m in Py.finditer shorthand lessonText do
        let mult = match m.G 2 with "k" | "K" -> 1e3 | "M" -> 1e6 | _ -> 1e9
        let v = float (m.G 1) * mult
        have.Add(if Py.isInteger v then Py.numStr v false else Py.floatRepr v) |> ignore
    let seen = JS.Constructors.Map.Create<string, string>()
    let note n where = if not (seen.has n) then seen.set(n, where) |> ignore
    for s in Py.list script "scenes" do
        for m in Py.finditer NUM (Py.sub PRONOUNCE (fun m -> m.G 1) (say s)) do
            note (norm m.Value) $"narration {idOf s}"
    // String literals scanned left to right, so the text between two literals is never read as one.
    for file in jsFiles do
        Py.splitlines (readText file)
        |> List.iteri (fun i line ->
            if not ((Py.strip line).StartsWith "//") then
                for m in Py.finditer stringLit line do
                    let text = m.Groups.[1..] |> Array.pick id
                    // layout, SVG paths, bare coordinates, colours, cue specs
                    let skip =
                        not (Py.found anyDigit text)
                        || Py.found layoutish text || Py.fullmatch svgPath text || Py.fullmatch coords text
                        || text.Contains "|" || text.Contains "${"
                    if not skip then
                        for n in Py.finditer NUM text do
                            note (norm n.Value) $"{basename file}:{i + 1}")
    let small = set ([ for i in 0..12 -> string i ] @ [ "100" ])
    let missing =
        seen.entries ()
        |> Seq.filter (fun (n, _) -> not (have.Contains n) && not (small.Contains n))
        |> List.ofSeq
        |> Py.sortWith (fun (_, a) (_, b) -> Py.cmpStr a b)
    for n, where in missing do
        f.warn $"{n} ({where}) does not appear in the lesson; check it is derived from lesson numbers, or drop it"

// ── flow ─────────────────────────────────────────────────────────────────────────────────────────────────────

/// Words and phrases that tie a sentence to what came before: cause, contrast, callback, signpost, caution.
let private CONNECTIVES =
    [ "so"; "therefore"; "hence"; "that's why"; "which is why"; "this is why"; "because"; "as a result"; "that means"
      "this means"; "which means"; "in other words"; "but"; "however"; "on the other hand"; "instead"
      "even so"; "whereas"; "unlike"; "remember"; "recall"; "as we saw"; "earlier"; "back in"; "you saw"
      "now"; "next"; "first"; "then"; "finally"; "in short"; "here's"; "here is"; "the tricky part"; "the catch"
      "the key point"; "the key idea"; "the question is"; "notice"; "watch"; "careful"; "surprisingly"; "it turns out"; "the trap"
      "a common mistake"; "easy to miss"; "perhaps"; "similarly"; "likewise"; "after all"; "in fact"; "as you know"; "for example"; "for instance"; "you might"; "imagine"; "suppose"; "what if" ]

let private CONN_RE =
    let alts = CONNECTIVES |> List.sortWith (fun a b -> compare b.Length a.Length) |> List.map Py.escape |> String.concat "|"
    Py.rxI (@"\b(" + alts + @")\b")

/// share of sentences with a connective, per chapter
let private FLOW_MIN = 0.4

/// The scenes in chapters: a "-why" bridge or the outro starts a new one; scenes before the first are "intro".
let private chapters (scenes: Json list) (each: Json -> 'a) : (string * 'a list) list =
    let rows = ResizeArray<string * 'a list>()
    let mutable chapter = "intro"
    let cur = ResizeArray<'a>()
    let flush () = rows.Add((chapter, List.ofSeq cur))
    for s in scenes do
        if isWhy (idOf s) || prefix (idOf s) = "outro" then
            flush ()
            chapter <- (let c = Py.get s "chapter" in if Py.truthy c then Py.str c else idOf s)
            cur.Clear()
        cur.Add(each s)
    flush ()
    List.ofSeq rows

let private reportFlow (f: Findings) (script: Json) (longVideo: bool) =
    let used = JS.Constructors.Map.Create<string, int>()
    let rows =
        chapters (Py.list script "scenes") (fun s ->
            sentences (say s)
            |> List.map (fun sent ->
                let words = Py.finditer CONN_RE (shown sent) |> List.map (fun m -> lower (m.G 1))
                for w in words do used.set(w, (if used.has w then used.get w else 0) + 1) |> ignore
                not words.IsEmpty))
        |> List.map (fun (name, linked) -> let l = List.concat linked in name, l.Length, (l |> List.filter id).Length)
        |> List.filter (fun (_, n, _) -> n > 0)
    let total, totalLinked = rows |> List.sumBy (fun (_, n, _) -> n), rows |> List.sumBy (fun (_, _, l) -> l)
    if total > 0 then
        Py.print $"flow: {totalLinked}/{total} sentences link to what came before ({Py.pct 0 (float totalLinked / float total)})"
        for name, k, l in rows do
            if longVideo then
                Py.print $"  {(string l).PadLeft 3}/{(string k).PadRight 3} {(Py.pct 0 (float l / float k)).PadLeft 4}  {name}"
            if k >= 4 && float l / float k < FLOW_MIN then
                f.warn $"flow: {name}: only {l} of {k} sentences link to the one before; add connectives (so, but, remember, the tricky part, ...)"
        let top = used.entries () |> List.ofSeq |> List.sortWith (fun (_, a) (_, b) -> compare b a)
        for w, c in List.truncate 3 top do
            if c >= 6 && float c / float (max 1 totalLinked) > 0.25 then
                f.warn $"flow: '{w}' opens {c} of {totalLinked} linked sentences; vary the connectives"
        Py.print ("  most used: " + (top |> List.truncate 8 |> List.map (fun (w, c) -> $"{w} {c}") |> String.concat ", "))

// ── breathing room ───────────────────────────────────────────────────────────────────────────────────────────

let private reportBreathingWith (f: Findings) (timing: Json) (longVideo: bool) =
    let scenes = Py.list timing "scenes"
    let sents = scenes |> List.collect sentencesOf |> List.toArray
    if sents.Length >= 2 then
        let start (x: Json) = num x "start"
        let stop (x: Json) = num x "end"
        let talk = sents |> Array.sumBy (fun x -> stop x - start x)
        let dur = num timing "duration"
        let mutable longest = 0.0
        let mutable runStart = start sents.[0]
        let mutable where = sents.[0]
        for a, b in Array.pairwise sents do
            if start b - stop a >= 1.5 then
                if stop a - runStart > longest then
                    longest <- stop a - runStart
                    where <- a
                runStart <- start b
        let lastS = Array.last sents
        if stop lastS - runStart > longest then
            longest <- stop lastS - runStart
            where <- lastS
        let isThink (b: Json) = (b?kind: string) = "think"
        let thinks = scenes |> List.sumBy (fun s -> Py.list s "breaks" |> List.filter isThink |> List.length)
        let recaps = scenes |> List.filter (fun s -> Py.truthy (Py.get s "recap")) |> List.length
        Py.print (
            $"breathe: talking {Py.pct 0 (talk / dur)} of {Py.fmtF 1 (dur / 60.0)} min; longest stretch without a 1.5 s pause "
            + $"{Py.fmtF 0 longest} s (ends {Py.fmtF 0 (stop where)} s); {thinks} think, {recaps} recap"
        )
        for s in scenes do
            let recap = Py.get s "recap"
            let nRecap = if Py.truthy recap then (unbox<obj[]> recap).Length else 0
            let nSent = (sentencesOf s).Length
            if Py.truthy recap && nRecap > nSent then
                f.warn (
                    $"recap: {idOf s} has {nRecap} lines but {nSent} sentences; "
                    + "line i appears on sentence i, so the extra lines arrive late - speak one sentence per line"
                )
        if longVideo then
            if longest > 45.0 then
                f.warn $"breathe: {Py.fmtF 0 longest} s of talk without a 1.5 s pause (ending at {Py.fmtF 0 (stop where)} s); add a [pause] after a key point"
            if talk / dur > 0.82 then
                f.warn $"breathe: talking {Py.pct 0 (talk / dur)} of the time; aim for 72-78%% with [pause], [think] and recap scenes"
            let mutable chapter: obj = null
            let mutable has = false
            for s in scenes @ [ createObj [ "id" ==> "outro-end"; "sentences" ==> [||] ] ] do
                if isWhy (idOf s) || prefix (idOf s) = "outro" then
                    if Py.truthy chapter && not has then
                        f.warn $"breathe: chapter {Py.repr chapter} has no recap scene and no [think]"
                    chapter <- (if isWhy (idOf s) then Py.get s "chapter" else null)
                    has <- false
                has <- has || Py.truthy (Py.get s "recap") || (Py.list s "breaks" |> List.exists isThink)

let private reportBreathing (f: Findings) (timing: Json option) (longVideo: bool) =
    timing |> Option.iter (fun t -> reportBreathingWith f t longVideo)

// ── length ───────────────────────────────────────────────────────────────────────────────────────────────────

/// The hard cap of each length, in minutes (the writer brief states the same caps: Fill.LENGTHS).
let lengthCaps = [ "short", 5.5; "tour", 11.0; "deep", 29.0 ]

/// The real running time (narration plus pauses, cards and recap holds) against the cap of the length that
/// <workspace>/brief.json asks for. Words alone under-count: a video runs at about 2.15 words a second overall.
let private reportDuration (f: Findings) (clip: string) (timing: Json option) =
    timing
    |> Option.iter (fun t ->
        let minutes = num t "duration" / 60.0
        Py.print $"video:  {Py.fmtF 1 minutes} min with pauses, cards and recaps"
        let briefPath = join [ clip; "brief.json" ]
        if exists briefPath then
            let length = Py.str (Py.get (readJson briefPath) "length")
            match List.tryFind (fun (name, _) -> name = length) lengthCaps with
            | Some(_, cap) when minutes > cap ->
                f.warn $"the video runs {Py.fmtF 1 minutes} min, over the {Py.g cap} min cap of a '{length}' video: cut sentences or a scene"
            | _ -> ())

let private reportLength (script: Json) (longVideo: bool) =
    let rows =
        chapters (Py.list script "scenes") (fun s -> (Py.words (shown (say s))).Length)
        |> List.map (fun (name, ws) -> name, List.sum ws)
        |> List.filter (fun (_, w) -> w > 0)
    let total = rows |> List.sumBy snd
    Py.print $"length: {total} words ≈ {Py.fmtF 1 (float total / WPS / 60.0)} min spoken (plus pauses)"
    if longVideo then
        for name, w in rows do
            Py.print $"  {(string w).PadLeft 5} words  ≈ {Py.fixedW 4 1 (float w / WPS / 60.0)} min  {name}"

// ── main ─────────────────────────────────────────────────────────────────────────────────────────────────────

let run (ws: string) (args: string list) : int =
    let clip = ws
    let lesson =
        match List.tryFindIndex ((=) "--lesson") args with
        | Some i -> Some(resolve (List.item (i + 1) args))
        | None -> None
    let f =
        { Errors = ResizeArray()
          Warnings = ResizeArray()
          Read = JS.Constructors.Map.Create() }
    let script, timing = load f clip
    let jsFiles =
        readDir clip
        |> List.filter (fun n -> n.EndsWith ".js")
        |> Py.sortWith Py.cmpStr
        |> List.map (fun n -> join [ clip; n ])
    checkScript f script
    // tokens checked by ear and fine as written, e.g. ["CPU", "PDF"]
    let ok = Py.list script "readsFine" |> List.map Py.str |> set
    for tok, where in f.Read.entries () do
        if not (ok.Contains tok) then
            let shownWhere = where |> Seq.truncate 4 |> String.concat ", "
            let more = if where.Count > 4 then " …" else ""
            f.warn $"'{tok}' is read as written ({shownWhere}{more}): wrap it as [{tok}](how to say it), or list it in \"readsFine\" once checked by ear"
    let longVideo = checkLong f clip script
    checkCues f timing jsFiles
    lesson |> Option.iter (fun p -> checkLesson f script jsFiles (readText p))
    reportLength script longVideo
    reportDuration f clip timing
    reportBreathing f timing longVideo
    reportFlow f script longVideo
    for w in f.Warnings do Py.print $"warn   {w}"
    for e in f.Errors do Py.print $"ERROR  {e}"
    Py.print $"{f.Errors.Count} error(s), {f.Warnings.Count} warning(s)"
    Py.flush ()
    if f.Errors.Count > 0 then 1 else 0
