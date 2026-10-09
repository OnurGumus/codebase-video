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
        // how many bytes the next write took: none when the pipe is full, after a short sleep
        let write (off: int) : int =
            try
                fs?writeSync(fd, buf, off, len - off)
            with e ->
                if (e?code: string) = "EAGAIN" then
                    sleepMs 2
                    0
                else
                    raise e
        let rec from (off: int) = if off < len then from (off + write off)
        from 0

    // The one piece of state left in this file: the process's stdout, as `print` has filled it and `flush` has not yet
    // written it. It is a ResizeArray because `print` (Python's print()) is called all over Check, ScanReport, Fill
    // and ApplyFixes, whose `run`s return an exit code and not their output, and because a run that throws before
    // `flush` writes nothing to stdout, which a write per `print` would change.
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
        let boundary = "(?:(?<=[" + W + "])(?![" + W + "])|(?<![" + W + "])(?=[" + W + "]))"
        let nonBoundary = "(?:(?<=[" + W + "])(?=[" + W + "])|(?<![" + W + "])(?![" + W + "]))"
        // The pattern from index i on, translated piece by piece (latest piece first in `acc`); `inClass` says whether
        // the scan is inside a [...] class.
        let rec scan (i: int) (inClass: bool) (acc: string list) : string list =
            if i >= p.Length then
                acc
            else
                let c = p.[i]
                if c = '\\' && i + 1 < p.Length then
                    let d = p.[i + 1]
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
                    scan (i + 2) inClass (s :: acc)
                elif inClass then
                    scan (i + 1) (c <> ']') (string c :: acc)
                else
                    match c with
                    | '[' when i + 1 < p.Length && p.[i + 1] = '^' -> scan (i + 2) true ("^" :: "[" :: acc)
                    | '[' -> scan (i + 1) true ("[" :: acc)
                    | '.' -> scan (i + 1) false (@"[^\n]" :: acc)
                    | '$' -> scan (i + 1) false ((if multiline then @"(?=\n|(?![\s\S]))" else @"(?=\n?(?![\s\S]))") :: acc)
                    | '^' -> scan (i + 1) false ((if multiline then @"(?<![^\n])" else "^") :: acc)
                    | _ -> scan (i + 1) false (string c :: acc)
        scan 0 false [] |> List.rev |> String.concat ""

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

    /// re.sub with a function that is also given the number of the match (0 for the first).
    let subIndexed (r: Rx) (f: int -> M -> string) (s: string) : string =
        let pieces, last =
            (0, List.indexed (finditer r s))
            ||> List.mapFold (fun last (i, m) -> s.Substring(last, m.Start - last) + f i m, m.End)
        String.concat "" pieces + s.Substring last

    /// re.sub with a function.
    let sub (r: Rx) (f: M -> string) (s: string) : string = subIndexed r (fun _ m -> f m) s

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
            // each match is counted and the search goes on after it
            let rec from (start: int) (n: int) =
                match s.IndexOf(sub, start, System.StringComparison.Ordinal) with
                | -1 -> n
                | i -> from (i + sub.Length) (n + 1)
            from 0 0

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
        let point (cp: string) : int = cp?codePointAt(0)
        // the first code points that differ decide; when one string is the start of the other, the shorter is less
        match Seq.zip x y |> Seq.map (fun (cx, cy) -> compare (point cx) (point cy)) |> Seq.tryFind ((<>) 0) with
        | Some r -> r
        | None -> compare x.Length y.Length

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
        let kept = ds.Substring(0, q)
        let rest = ds.Substring(q)
        let up =
            if rest = "" then false
            elif rest.[0] > '5' then true
            elif rest.[0] < '5' then false
            elif rest.Substring(1).TrimEnd('0') <> "" then true
            else q > 0 && (int kept.[q - 1] - int '0') % 2 = 1
        // add one to the last digit, carrying left (digits come least significant first); a carry out of the
        // first digit is dropped
        let rec carry (digits: char list) : char list =
            match digits with
            | [] -> []
            | '9' :: more -> '0' :: carry more
            | d :: more -> char (int d + 1) :: more
        if up then System.String(kept |> Seq.rev |> Seq.toList |> carry |> List.rev |> List.toArray) else kept

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
        let escaped (ch: string) : string =
            let c: int = ch?codePointAt(0)
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
        q + (codePoints s |> Array.map escaped |> String.concat "") + q

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
/// A rest: a short silence inside a sentence, between the items of a spoken list (Narrate voices each stretch on
/// its own). Default 0.35 s.
let REST = Py.rx @"\s*\[rest(?:\s+(\d+(?:\.\d+)?))?\]"

let private shieldEnd = Py.rx @"[.!?]\s*$"
let private splitter = Py.rx @"(?<=[.!?\x01])\s+(?=[""'“A-Z0-9\[\x00])"
let private restoreRx = Py.rx @"\x00(\d+)[\x00\x01]"
let private openingBreaks = Py.rx @"(?:\[(?:pause|think)(?:\s+[\d.]+)?\]\s*)+"

/// Split after . ! ? when a space and a capital, digit, quote or markup follows; keeps "e.g. the"
/// and "0.802" whole. {code:...} phrases are shielded first, so "{fr:Il est une heure.}" stays one
/// piece. A shielded phrase ends a sentence only when it ends in . ! ? itself (marked \x01): "is
/// {fr:moins le quart} [3:45] or..." is one sentence, "{fr:Il est midi.} Then..." is two.
let sentences (say: string) : string list =
    let stripped = Py.strip say
    // the shielded phrases, in order: piece i is replaced by a marker that holds i
    let shielded = Py.finditer FOREIGN stripped |> List.map (fun m -> m.Value) |> List.toArray
    let shield (i: int) (m: Py.M) =
        let e = if Py.found shieldEnd (m.G 2) then "\u0001" else "\u0000"
        "\u0000" + string i + e
    let text = Py.subIndexed FOREIGN shield stripped
    let parts = Py.split splitter text
    let restore s = Py.sub restoreRx (fun m -> shielded.[int (m.G 1)]) s
    // A break marker opening a piece belongs to the sentence before it ("Why? [think 4] Because...").
    let add (found: string list) (p: string) : string list =
        match Py.matchStart openingBreaks p, found with
        | Some m, last :: before ->
            let p = Py.strip (p.Substring m.End)
            let found = (last + " " + Py.strip m.Value) :: before
            if p <> "" then p :: found else found
        | _ -> if p <> "" then p :: found else found
    parts
    |> List.filter (fun p -> Py.strip p <> "")
    |> List.map (restore >> Py.strip)
    |> List.fold add []
    |> List.rev

/// The silences a sentence asks for after it: [("pause", 1.5), ("think", 4.0)].
let breaks (s: string) : (string * float) list =
    Py.finditer BREAK s
    |> List.map (fun m ->
        let kind = m.G 1
        kind, (match m.Group 2 with Some n -> float n | None -> breakDefault kind))

let shown (s: string) : string =
    s
    |> Py.sub REST (fun _ -> "")
    |> Py.sub BREAK (fun _ -> "")
    |> Py.sub PRONOUNCE (fun m -> m.G 1)
    |> Py.sub FOREIGN (fun m -> m.G 2)
    |> Py.strip

// ── the run's findings ───────────────────────────────────────────────────────────────────────────────────────

let private WPS = 2.4

/// One thing a check found. Every check returns its findings in the order it found them, `run` joins them in the
/// order the checks run, and prints the warnings, then the errors, each in that order.
type private Finding =
    | Error of string
    | Warning of string

/// A scene of script.json or timing.json, still as JSON (fields read with Py.get, absent ones are None).
type private Json = obj

let private idOf (s: Json) : string = s?id
let private rawSay (s: Json) : string = match Py.get s "say" with null -> "" | v -> unbox v
/// A scene's text as narrate will voice it, with the glossary's terms already in their [shown](spoken) form.
let private say (glossary: Glossary.Glossary) (s: Json) : string = Glossary.apply glossary (rawSay s)
let private prefix (sid: string) = sid.Split('-').[0]
let private isWhy (sid: string) = sid.EndsWith "-why"
let private sentencesOf (s: Json) : Json list = Py.list s "sentences"

let private load (clip: string) : Finding list * Json * Json option =
    let scriptPath = join [ clip; "script.json" ]
    let script = readJson scriptPath
    let timingPath = join [ clip; "build"; "timing.json" ]
    let timing = if exists timingPath then Some(readJson timingPath) else None
    let stale =
        if timing.IsSome && mtime timingPath < mtime scriptPath then
            [ Warning "build/timing.json is older than script.json: run `node engine/cli/Cv.js <clip> narrate` (cue checks use the old timing)" ]
        else []
    stale, script, timing

// ── script ───────────────────────────────────────────────────────────────────────────────────────────────────

let private sceneIdRx = Py.rx @"[a-z0-9]+(-[a-z0-9]+)*"
let private endsSentence = Py.rx @"[.!?]$"
let private nextStarts = Py.rx @"\s+[A-Z\""'“\[0-9]"
let private breakLike = Py.rx @"\[(?:pause|think|rest)[^\]]*\](?!\()"
let private breakForm = Py.rx @"\[(pause|think|rest)(\s+\d+(\.\d+)?)?\]"
let private restEdge = Py.rx @"^\s*\[rest[^\]]*\]|\[rest[^\]]*\]\s*(?:\[(?:pause|think)[^\]]*\]\s*)*$"
let private foreignAny = Py.rx @"\{[a-z]{2,3}:[^{}]+\}"
let private readToken =
    Py.rx @"\d[\d,.]*\s*(?:%|×|x\b|ms\b|µs\b|ns\b|GB|TB|PB|MB|KB|Gbps|Mbps|k\b|M\b|B\b)?|[×÷≈→%/]|\b[A-Z]{2,}\b"
let private smallNumber = Py.rx @"\d{1,2}"

/// One sentence of a scene: its findings, and the tokens the voice reads as written there (token, where).
let private checkSentence (sid: string) (i: int) (sent: string) : Finding list * (string * string) list =
    let findings =
        [ for m in Py.finditer breakLike sent do
              if not (Py.fullmatch breakForm m.Value) then
                  yield Error $"{sid}[{i}]: {Py.reprStr m.Value} is not a break marker ([pause], [pause 2], [think], [think 4], [rest], [rest 0.5]); the voice would read it"
          for m in Py.finditer REST sent do
              match m.Group 1 with
              | Some secs when not (0.15 <= float secs && float secs <= 1.0) ->
                  yield Warning $"{sid}[{i}]: [rest {secs}] - a rest is 0.15 to 1 s; for a longer silence end the sentence and use [pause]"
              | _ -> ()
          if Py.found restEdge sent then
              yield Warning $"{sid}[{i}]: a [rest] goes between two items inside a sentence, not at its start or end"
          for kind, secs in breaks sent do
              if not (0.5 <= secs && secs <= 12.0) then
                  yield Warning $"{sid}[{i}]: [{kind} {Py.g secs}] - keep breaks between 0.5 and 12 s"
          let words = (Py.words (shown sent)).Length
          if words > 32 then
              yield Warning $"{sid}[{i}]: {words} words in one sentence (one caption); split it" ]
    // what the voice reads as written
    let plain = sent |> Py.sub REST (fun _ -> "") |> Py.sub PRONOUNCE (fun _ -> "") |> Py.sub foreignAny (fun _ -> "")
    let tokens =
        [ for m in Py.finditer readToken plain do
              let tok = Py.strip m.Value
              // small plain numbers read fine
              if tok <> "" && not (Py.fullmatch smallNumber tok) then
                  yield tok, $"{sid}[{i}]" ]
    findings, tokens

/// One scene: its findings, and the tokens its sentences read as written.
let private checkScene (glossary: Glossary.Glossary) (s: Json) : Finding list * (string * string) list =
    let sid, narration = idOf s, say glossary s
    let own =
        [ if not (Py.fullmatch sceneIdRx sid) then
              yield Error $"{sid}: scene ids are lowercase words joined by '-' (the part before the first '-' names the module)"
          for m in Py.finditer PRONOUNCE narration do
              let shownText = m.G 1
              let after = narration.Substring(m.End, min 2 (narration.Length - m.End))
              if Py.found endsSentence shownText && (Py.matchStart nextStarts (after + " ")).IsSome then
                  let last = Array.last (Py.codePoints shownText)
                  yield Error $"{sid}: [{shownText}](...) ends a sentence inside the brackets; move the '{last}' outside, or the next sentence merges into this one" ]
    let sentenceNotes = sentences narration |> List.mapi (checkSentence sid)
    own @ List.collect fst sentenceNotes, List.collect snd sentenceNotes

/// The findings of the script's scenes, and every token the voice reads as written (token, where), in the order the
/// scenes and sentences come.
let private checkScript (glossary: Glossary.Glossary) (script: Json) : Finding list * (string * string) list =
    let scenes = Py.list script "scenes"
    let ids = scenes |> List.map idOf
    let twice =
        [ for i in ids |> List.distinct |> List.filter (fun x -> (ids |> List.filter ((=) x)).Length > 1) ->
              Error $"scene id {Py.reprStr i} is used twice" ]
    let perScene = scenes |> List.map (checkScene glossary)
    twice @ List.collect fst perScene, List.collect snd perScene

// ── long videos ──────────────────────────────────────────────────────────────────────────────────────────────

let private checkLong (clip: string) (script: Json) : bool * Finding list =
    let scenes = Py.list script "scenes"
    let whys = scenes |> List.filter (idOf >> isWhy)
    if whys.IsEmpty then false, []
    else
        let prefixes = scenes |> List.map (idOf >> prefix)
        let card = Py.get script "card"
        let cardHas k = Py.truthy card && Py.truthy (Py.get card k)
        let arr = List.toArray scenes
        let keys =
            List.zip prefixes scenes
            |> List.filter (fun (_, s) -> not (isWhy (idOf s)) && idOf s <> "title" && not (Py.truthy (Py.get s "recap")))
            |> List.map fst
            |> List.distinct
        let findings =
            [ for s in whys do
                  if not (Py.truthy (Py.get s "chapter")) then
                      yield Error $"{idOf s}: a bridge scene needs \"chapter\": \"Title\" (the frame shows it on the title card)"
              if idOf scenes.Head <> "title" || not (cardHas "course") || not (cardHas "lesson") then
                  yield Error "a long video opens with a scene \"title\" and a top-level \"card\": {\"course\", \"lesson\", \"sub\"}, so the viewer knows the course and lesson before anything else"
              if not (List.contains "intro" prefixes) then
                  yield Warning "no intro scene: a long video should open by stating its goal"
              if not (List.contains "outro" prefixes) then
                  yield Warning "no outro scene: a long video should close on its goal"
              for k, s in Array.indexed arr do
                  if isWhy (idOf s)
                     && (k + 1 >= arr.Length || isWhy (idOf arr.[k + 1]) || prefix (idOf arr.[k + 1]) = "outro") then
                      yield Error $"{idOf s}: chapter has no content scenes"
              for key in keys do
                  if not (exists (join [ clip; key + ".js" ])) then
                      yield Error $"module {Py.reprStr key} has no {key}.js" ]
        true, findings

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

let private reportCues (timing: Json) (jsFiles: string list) : Finding list =
    let scenes = Py.list timing "scenes"
    // A scene by its id, the last scene with that id winning, ids compared as they are in the JSON (strictly: an
    // id can be missing or a number there), not ordered, so no F# Map.
    let byId = scenes |> List.map (fun s -> idOf s, s)
    let sceneOf (sid: string) : Json option = byId |> List.tryFindBack (fun (id, _) -> id = sid) |> Option.map snd
    let hasScene (sid: string) = (sceneOf sid).IsSome
    let nSentences sid = (sentencesOf (sceneOf sid).Value).Length

    let hasPhrase (sid: string) (phrase: string) (nth: int) =
        // As the kit matches (Stage.word): inside one voiced piece of a sentence, when it has several (a foreign
        // phrase, or the stretches between [rest] marks), so a phrase that spans two pieces is not found.
        let units =
            sentencesOf (sceneOf sid).Value
            |> List.collect (fun se ->
                match Py.list se "parts" with
                | parts when parts.Length > 1 -> parts
                | _ -> [ se ])
            |> List.map (fun u -> lower (spokenOf u), lower (textOf u))
        let want = lower phrase
        [ fst; snd ] |> List.exists (fun field -> (units |> List.sumBy (fun u -> Py.count (field u) want)) >= nth)

    /// The cues one line of a module names.
    let lineFindings (name: string) (ln: int) (line: string) : Finding list =
        [ for m in Py.finditer SPEC line do
              let sid = m.G 1
              let whole = m.Value
              // a plain string that merely looks like an id
              if not (prefix sid = "k" || (not (hasScene sid) && not (whole.Contains "|") && not (whole.Contains "#"))) then
                  if not (hasScene sid) then
                      yield Error $"{name}:{ln}: no scene {Py.reprStr sid}"
                  else
                      match m.Group 2, m.Group 4, m.Group 5 with
                      | Some phrase, nth, _ when not (hasPhrase sid phrase (match nth with Some n -> int n | None -> 1)) ->
                          let times = match nth with Some n -> $" {n} times" | None -> ""
                          yield Error $"{name}:{ln}: {Py.reprStr phrase} is not spoken in {sid}{times}"
                      | Some _, _, _ -> ()
                      | None, _, Some sent when int sent >= nSentences sid ->
                          yield Error $"{name}:{ln}: {sid} has {nSentences sid} sentence(s), asked for #{sent}"
                      | _ -> ()
          for m in Py.finditer WORD_CALL line do
              let sid, phrase = m.G 1, m.G 2
              if hasScene sid && not (hasPhrase sid phrase 1) then
                  yield Error $"{name}:{ln}: word({Py.reprStr sid}, {Py.reprStr phrase}): not spoken there"
              elif not (hasScene sid) then
                  yield Error $"{name}:{ln}: no scene {Py.reprStr sid}"
          for m in Py.finditer CUE_CALL line do
              let sid = m.G 1
              if not (hasScene sid) then
                  yield Error $"{name}:{ln}: no scene {Py.reprStr sid}"
              else
                  match m.Group 2 with
                  | Some i when int i >= nSentences sid || -(int i) > nSentences sid ->
                      yield Error $"{name}:{ln}: {sid} has {nSentences sid} sentence(s), asked for {i}"
                  | _ -> () ]

    /// A module file's cues, line by line. `names` holds the `const NAME = "scene-id"` seen so far in the file.
    let fileFindings (file: string) : Finding list =
        let name = basename file
        let perLine, _ =
            (Map.empty, Py.splitlines (readText file) |> List.indexed)
            ||> List.mapFold (fun (names: Map<string, string>) (i, line) ->
                if (Py.strip line).StartsWith "//" then
                    [], names
                else
                    let names = Py.finditer SCENE_CONST line |> List.fold (fun names d -> Map.add (d.G 1) (d.G 2) names) names
                    // `S + "|phrase"` / `S + "#2"` is the same cue as `"<scene>|phrase"`; check it as one.
                    let line =
                        line
                        |> Py.sub SCENE_REF (fun m ->
                            match Map.tryFind (m.G 1) names with
                            | Some sid -> "\"" + sid + m.G 2 + "\""
                            | None -> m.Value)
                    lineFindings name (i + 1) line, names)
        List.concat perLine

    let cues = jsFiles |> List.collect fileFindings

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
    let toasts =
        [ for s in scenes do
              for d in Py.list s "toasts" do
                  let kind = Py.get d "kind"
                  let where = $"{idOf s} toast {Py.repr kind}"
                  let at = Py.get d "at"
                  let text = Py.get d "text"
                  let findings =
                      [ if not (Py.isStr kind && toastKinds.Contains(unbox kind)) then
                            yield Error $"""{where}: unknown kind; use one of {toastKinds |> Set.toList |> Py.sortWith Py.cmpStr |> String.concat ", "}"""
                        if Py.truthy at && not ((Py.str at).StartsWith "#") && not (hasPhrase (idOf s) (Py.str at) 1) then
                            yield Error $"{where}: {Py.repr at} is not spoken in {idOf s}"
                        if Py.truthy text && (Py.words (unbox text)).Length > 5 then
                            yield Warning $"{where}: text {Py.repr text} is long for a badge; keep it to about 4 words" ]
                  yield findings, (toastTime s at, kind, where) ]
    let seen =
        toasts
        |> List.map snd
        |> Py.sortWith (fun (a, ka, wa) (b, kb, wb) ->
            let c = compare a b
            if c <> 0 then c
            else
                let c = Py.cmpStr (Py.str ka) (Py.str kb)
                if c <> 0 then c else Py.cmpStr wa wb)
    // Every pair, in the same scene or not: two badges within 6 s crowd the top band.
    let crowded =
        [ for (a, _, wa), (b, _, wb) in List.pairwise seen do
              if b - a < 6.0 then
                  yield Warning $"toasts crowd: {wa} and {wb} are {Py.fmtF 1 (b - a)} s apart (keep at least 6 s)" ]
    if not seen.IsEmpty then
        // Counter.most_common(): by count, ties in first-seen order
        let counts =
            seen
            |> List.map (fun (_, k, _) -> Py.str k)
            |> List.countBy id
            |> List.sortWith (fun (_, a) (_, b) -> compare b a)
        let listed = counts |> List.map (fun (k, n) -> $"{k} {n}") |> String.concat ", "
        Py.print $"toasts: {listed} ({seen.Length} total)"
    cues @ List.collect fst toasts @ crowded

let private checkCues (timing: Json option) (jsFiles: string list) : Finding list =
    match timing with
    | None -> [ Warning "no build/timing.json yet: cue checks skipped (run narrate first)" ]
    | Some timing -> reportCues timing jsFiles

// ── lesson grounding ─────────────────────────────────────────────────────────────────────────────────────────

let private NUM = Py.rx @"(?<![\w.])\d+(?:[.,]\d+)*"
let private shorthand = Py.rx @"(?<![\w.])(\d+(?:\.\d+)?)\s*([kKMB])(?![a-zA-Z])"
let private stringLit = Py.rx """"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`"""
let private anyDigit = Py.rx @"\d"
let private layoutish = Py.rx @"\d\s*px\b|\b(?:left|top|width|height|margin|padding|translate|scale|rotate|rgba?)\b|#[0-9a-f]{3}"
let private svgPath = Py.rx @"\s*[MLCQZmlcqz][\d\s.,MLCQZmlcqz-]*"
let private coords = Py.rx @"[\d\s.,-]+"

let private norm (n: string) = n.Replace(",", "")

let private checkLesson (glossary: Glossary.Glossary) (script: Json) (jsFiles: string list) (lessonText: string) : Finding list =
    let stated = [ for m in Py.finditer NUM lessonText -> norm m.Value ]
    // "35k/s", "1.8M", "3B/day": the lesson's shorthand for the numbers a narrator says in full.
    let spelledOut =
        [ for m in Py.finditer shorthand lessonText do
              let mult = match m.G 2 with "k" | "K" -> 1e3 | "M" -> 1e6 | _ -> 1e9
              let v = float (m.G 1) * mult
              yield (if Py.isInteger v then Py.numStr v false else Py.floatRepr v) ]
    let have = set (stated @ spelledOut)
    let inNarration =
        [ for s in Py.list script "scenes" do
              for m in Py.finditer NUM (Py.sub PRONOUNCE (fun m -> m.G 1) (say glossary s)) do
                  yield norm m.Value, $"narration {idOf s}" ]
    // String literals scanned left to right, so the text between two literals is never read as one.
    let inModules =
        [ for file in jsFiles do
              for i, line in Py.splitlines (readText file) |> List.indexed do
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
                                  yield norm n.Value, $"{basename file}:{i + 1}" ]
    // each number with the first place it was seen
    let seen = inNarration @ inModules |> List.distinctBy fst
    let small = set ([ for i in 0..12 -> string i ] @ [ "100" ])
    seen
    |> List.filter (fun (n, _) -> not (have.Contains n) && not (small.Contains n))
    |> Py.sortWith (fun (_, a) (_, b) -> Py.cmpStr a b)
    |> List.map (fun (n, where) ->
        Warning $"{n} ({where}) does not appear in the lesson; check it is derived from lesson numbers, or drop it")

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
    let startsChapter (s: Json) = isWhy (idOf s) || prefix (idOf s) = "outro"
    let nameOf (s: Json) = let c = Py.get s "chapter" in if Py.truthy c then Py.str c else idOf s
    // the chapters finished so far (latest first), the open chapter's name and its items (latest first)
    let finished, name, current =
        (([], "intro", []), scenes)
        ||> List.fold (fun (finished, name, items) s ->
            if startsChapter s then (name, List.rev items) :: finished, nameOf s, [ each s ]
            else finished, name, each s :: items)
    List.rev ((name, List.rev current) :: finished)

let private reportFlow (glossary: Glossary.Glossary) (script: Json) (longVideo: bool) : Finding list =
    // per chapter, per scene, per sentence: every connective in it
    let perChapter =
        chapters (Py.list script "scenes") (fun s ->
            sentences (say glossary s)
            |> List.map (fun sent -> Py.finditer CONN_RE (shown sent) |> List.map (fun m -> lower (m.G 1))))
        |> List.map (fun (name, scenes) -> name, List.concat scenes)
    let used = perChapter |> List.collect (snd >> List.concat) |> List.countBy id
    let rows =
        perChapter
        |> List.map (fun (name, opens) -> name, opens.Length, (opens |> List.filter (not << List.isEmpty)).Length)
        |> List.filter (fun (_, n, _) -> n > 0)
    let total, totalLinked = rows |> List.sumBy (fun (_, n, _) -> n), rows |> List.sumBy (fun (_, _, l) -> l)
    if total = 0 then []
    else
        Py.print $"flow: {totalLinked}/{total} sentences link to what came before ({Py.pct 0 (float totalLinked / float total)})"
        if longVideo then
            for name, k, l in rows do
                Py.print $"  {(string l).PadLeft 3}/{(string k).PadRight 3} {(Py.pct 0 (float l / float k)).PadLeft 4}  {name}"
        let top = used |> List.sortWith (fun (_, a) (_, b) -> compare b a)
        Py.print ("  most used: " + (top |> List.truncate 8 |> List.map (fun (w, c) -> $"{w} {c}") |> String.concat ", "))
        [ for name, k, l in rows do
              if k >= 4 && float l / float k < FLOW_MIN then
                  yield Warning $"flow: {name}: only {l} of {k} sentences link to the one before; add connectives (so, but, remember, the tricky part, ...)"
          for w, c in List.truncate 3 top do
              if c >= 6 && float c / float (max 1 totalLinked) > 0.25 then
                  yield Warning $"flow: '{w}' opens {c} of {totalLinked} linked sentences; vary the connectives" ]

// ── breathing room ───────────────────────────────────────────────────────────────────────────────────────────

let private reportBreathingWith (timing: Json) (longVideo: bool) : Finding list =
    let scenes = Py.list timing "scenes"
    let sents = scenes |> List.collect sentencesOf |> List.toArray
    if sents.Length < 2 then []
    else
        let start (x: Json) = num x "start"
        let stop (x: Json) = num x "end"
        let talk = sents |> Array.sumBy (fun x -> stop x - start x)
        let dur = num timing "duration"
        // The longest stretch of talk without a pause of 1.5 s or more: how long, and the sentence it ends on. A
        // stretch ends where the next sentence starts 1.5 s or more after this one.
        let longest, runStart, where =
            ((0.0, start sents.[0], sents.[0]), Array.pairwise sents)
            ||> Array.fold (fun (longest, runStart, where) (a, b) ->
                if start b - stop a >= 1.5 then
                    if stop a - runStart > longest then stop a - runStart, start b, a else longest, start b, where
                else longest, runStart, where)
        let lastS = Array.last sents
        let longest, where = if stop lastS - runStart > longest then stop lastS - runStart, lastS else longest, where
        let isThink (b: Json) = (b?kind: string) = "think"
        let thinks = scenes |> List.sumBy (fun s -> Py.list s "breaks" |> List.filter isThink |> List.length)
        let recaps = scenes |> List.filter (fun s -> Py.truthy (Py.get s "recap")) |> List.length
        Py.print (
            $"breathe: talking {Py.pct 0 (talk / dur)} of {Py.fmtF 1 (dur / 60.0)} min; longest stretch without a 1.5 s pause "
            + $"{Py.fmtF 0 longest} s (ends {Py.fmtF 0 (stop where)} s); {thinks} think, {recaps} recap"
        )
        let lateRecaps =
            [ for s in scenes do
                  let recap = Py.get s "recap"
                  let nRecap = if Py.truthy recap then (unbox<obj[]> recap).Length else 0
                  let nSent = (sentencesOf s).Length
                  if Py.truthy recap && nRecap > nSent then
                      yield Warning (
                          $"recap: {idOf s} has {nRecap} lines but {nSent} sentences; "
                          + "line i appears on sentence i, so the extra lines arrive late - speak one sentence per line"
                      ) ]
        let longVideoNudges =
            if not longVideo then []
            else
                // A bridge opens a chapter and the outro closes the last one (an empty scene after the end stands in
                // for it). Walk the scenes with the open chapter's title and whether it has had a recap or a think.
                let nudges, _ =
                    (((null: obj), false), scenes @ [ createObj [ "id" ==> "outro-end"; "sentences" ==> [||] ] ])
                    ||> List.mapFold (fun (chapter: obj, has: bool) s ->
                        let helps = Py.truthy (Py.get s "recap") || (Py.list s "breaks" |> List.exists isThink)
                        if isWhy (idOf s) || prefix (idOf s) = "outro" then
                            let nudge =
                                if Py.truthy chapter && not has then
                                    [ Warning $"breathe: chapter {Py.repr chapter} has no recap scene and no [think]" ]
                                else []
                            nudge, ((if isWhy (idOf s) then Py.get s "chapter" else null), helps)
                        else [], (chapter, has || helps))
                [ if longest > 45.0 then
                      yield Warning $"breathe: {Py.fmtF 0 longest} s of talk without a 1.5 s pause (ending at {Py.fmtF 0 (stop where)} s); add a [pause] after a key point"
                  if talk / dur > 0.82 then
                      yield Warning $"breathe: talking {Py.pct 0 (talk / dur)} of the time; aim for 72-78%% with [pause], [think] and recap scenes"
                  yield! List.concat nudges ]
        lateRecaps @ longVideoNudges

let private reportBreathing (timing: Json option) (longVideo: bool) : Finding list =
    match timing with
    | Some t -> reportBreathingWith t longVideo
    | None -> []

// ── length ───────────────────────────────────────────────────────────────────────────────────────────────────

/// The hard cap of each length, in minutes (the writer brief states the same caps: Fill.LENGTHS).
let lengthCaps = [ "short", 5.5; "tour", 11.0; "deep", 29.0 ]

/// The real running time (narration plus pauses, cards and recap holds) against the cap of the length that
/// <workspace>/brief.json asks for. Words alone under-count: a video runs at about 2.15 words a second overall.
let private reportDuration (clip: string) (timing: Json option) : Finding list =
    match timing with
    | None -> []
    | Some t ->
        let minutes = num t "duration" / 60.0
        Py.print $"video:  {Py.fmtF 1 minutes} min with pauses, cards and recaps"
        let briefPath = join [ clip; "brief.json" ]
        if exists briefPath then
            let length = Py.str (Py.get (readJson briefPath) "length")
            match List.tryFind (fun (name, _) -> name = length) lengthCaps with
            | Some(_, cap) when minutes > cap ->
                [ Warning $"the video runs {Py.fmtF 1 minutes} min, over the {Py.g cap} min cap of a '{length}' video: cut sentences or a scene" ]
            | _ -> []
        else []

let private reportLength (glossary: Glossary.Glossary) (script: Json) (longVideo: bool) =
    let rows =
        chapters (Py.list script "scenes") (fun s -> (Py.words (shown (say glossary s))).Length)
        |> List.map (fun (name, ws) -> name, List.sum ws)
        |> List.filter (fun (_, w) -> w > 0)
    let total = rows |> List.sumBy snd
    Py.print $"length: {total} words ≈ {Py.fmtF 1 (float total / WPS / 60.0)} min spoken (plus pauses)"
    if longVideo then
        for name, w in rows do
            Py.print $"  {(string w).PadLeft 5} words  ≈ {Py.fixedW 4 1 (float w / WPS / 60.0)} min  {name}"

// ── the shared map ───────────────────────────────────────────────────────────────────────────────────────────

let private K_MAP = Py.rx @"\bK\.map\s*\("

[<Emit("(typeof $0 === 'number')")>]
let private isNumber (v: obj) : bool = jsNative

[<Emit("Number.isInteger($0)")>]
let private isInteger (v: obj) : bool = jsNative

[<Emit("Object.keys($0)")>]
let private keysOf (o: obj) : string[] = jsNative

[<Emit("JSON.stringify($0)")>]
let private jsonOf (v: obj) : string = jsNative

[<Emit("($0 !== null && typeof $0 === 'object' && !Array.isArray($0))")>]
let private isObject (v: obj) : bool = jsNative

/// The zoom into a part and back out of it (ZOOM_IN in src/Kit/Map.fs, and the quiet end a zoom out needs).
let private VISIT_LEAD, VISIT_TAIL = 1.2, 1.9

/// The shared map (script.json "map"), each chapter's "path" across it and each scene's "inside": the frame draws
/// them (src/Kit/Map.fs, src/Kit/Frame.fs), so everything it relies on is checked here first.
let private checkMap (script: Json) (jsFiles: string list) (lesson: string option) : Finding list =
    let scenes = Py.list script "scenes"
    let map = Py.get script "map"
    let field (o: Json) (k: string) : obj = if isObject o then Py.get o k else null
    let text (o: Json) (k: string) = let v = field o k in if Py.isStr v then Py.str v else ""
    let number (o: Json) (k: string) (d: float) = let v = field o k in if isNumber v then unbox<float> v else d
    let pathOf (s: Json) = Py.list s "path" |> List.map Py.str
    let hasPath (s: Json) = not (isNull (Py.get s "path"))
    let insideOf (s: Json) = text s "inside"
    if not (Py.truthy map) then
        [ for s in scenes do
              if hasPath s then yield Error $"{idOf s}: \"path\" needs a top-level \"map\" in script.json"
              if not (isNull (Py.get s "inside")) then yield Error $"{idOf s}: \"inside\" needs a top-level \"map\" in script.json"
          for file in jsFiles do
              if (Py.search K_MAP (readText file)).IsSome then
                  yield Error $"{basename file}: K.map needs a top-level \"map\" in script.json" ]
    else
        let kinds = Py.get map "kinds"
        // An entry that is not an object (a null left by a stray comma) is reported and then left out.
        let notObjects (what: string) (xs: obj list) : Finding list =
            [ for i, x in List.indexed xs do
                  if not (isObject x) then yield Error $"map: {what} {i} is not an object" ]
        let rawParts, rawEdges = Py.list map "parts", Py.list map "edges"
        let parts, edges = List.filter isObject rawParts, List.filter isObject rawEdges
        let ids = parts |> List.map (fun p -> text p "id") |> List.filter ((<>) "")
        let cell (p: Json) = number p "col" -1.0, number p "row" -1.0
        let known (id: string) = List.contains id ids
        let byId (id: string) = parts |> List.find (fun p -> text p "id" = id)
        let joined a b = edges |> List.exists (fun e -> (text e "from" = a && text e "to" = b) || (text e "from" = b && text e "to" = a))
        let arr = List.toArray scenes
        [ yield! notObjects "part" rawParts
          yield! notObjects "edge" rawEdges
          if parts.Length < 2 || parts.Length > 7 then
              yield Error $"map: {parts.Length} parts; a map has 2 to 7 (more do not fit at a readable size)"
          if Py.truthy kinds then
              for k in keysOf kinds do
                  let kind = Py.get kinds k
                  if not (Py.truthy (Py.get kind "tone")) || not (Py.truthy (Py.get kind "icon")) then
                      yield Error $"map: kind {Py.reprStr k} needs a \"tone\" and an \"icon\""
          for i, p in List.indexed parts do
              let id = text p "id"
              let name = if id = "" then $"part {i}" else $"part {Py.reprStr id}"
              for k in [ "id"; "label"; "kind" ] do
                  if text p k = "" then yield Error $"map: {name} has no \"{k}\""
              let kind = text p "kind"
              if kind <> "" && not (Py.truthy kinds && Py.truthy (Py.get kinds kind)) then
                  yield Error $"map: {name} has kind {Py.reprStr kind}, which is not in \"kinds\""
              for k, top in [ "col", 3; "row", 2 ] do
                  let v = field p k
                  if isNull v then yield Error $"map: {name} has no \"{k}\""
                  elif not (isInteger v) || unbox<float> v < 0.0 || unbox<float> v > float top then
                      yield Error $"map: {name} has \"{k}\": {jsonOf v}; the grid's {k}s are 0 to {top}"
              let badge = field p "badge"
              if not (isNull badge) && (not (Py.isStr badge) || Py.len (Py.str badge) > 10) then
                  yield Error $"map: the badge of {name} is a word of at most 10 characters (\"new\", \"changed\")"
              let label = text p "label"
              if Py.len label > 12 then
                  yield Error $"map: the label {Py.reprStr label} of {name} is {Py.len label} characters; at most 12 fit a box"
          for id, n in List.countBy id ids do
              if n > 1 then yield Error $"map: {n} parts have the id {Py.reprStr id}"
          for (col, row), ps in parts |> List.groupBy cell do
              if ps.Length > 1 && col >= 0.0 && row >= 0.0 then
                  let names = ps |> List.map (fun p -> text p "id") |> String.concat " and "
                  yield Error $"map: {names} share the cell col {col}, row {row}"
          for e in edges do
              let a, b = text e "from", text e "to"
              for id in [ a; b ] do
                  if not (known id) then yield Error $"map: an edge names {Py.reprStr id}, which is not a part"
              if a <> "" && a = b then yield Error $"map: an edge joins {a} to itself"
              elif known a && known b then
                  // An arrow between two parts of one row or column is a straight line: a part in a cell between
                  // them would sit on it.
                  // An arrow that changes row and column makes one turn (src/Kit/Map.fs): down or up its own column
                  // and then level along the row it arrives in, or, when a part is on that way, level along its
                  // own row and then down or up the column it arrives in. Only when a part is on both ways is
                  // there no way round.
                  let (c1, r1), (c2, r2) = cell (byId a), cell (byId b)
                  for p in parts do
                      let c, r = cell p
                      let between x x1 x2 = x > min x1 x2 && x < max x1 x2
                      let crossed = text p "id"
                      let straight = (r1 = r2 && r = r1 && between c c1 c2) || (c1 = c2 && c = c1 && between r r1 r2)
                      let onWay (ca, ra, cb, rb) (c, r) = (c = ca && between r ra rb) || (r = rb && (c = ca || between c ca cb))
                      let blocked way = parts |> List.exists (fun q -> onWay way (cell q))
                      let curved =
                          r1 <> r2 && c1 <> c2
                          && onWay (c1, r1, c2, r2) (c, r)
                          // the other way round is the same shape seen from the far end
                          && blocked (c2, r2, c1, r1)
                      if straight || curved then
                          yield Warning $"map: the edge {a} -> {b} would cross {crossed}; move a part, or route the edge through it"
          for s in scenes do
              let sid = idOf s
              if hasPath s then
                  let path = pathOf s
                  if not (isWhy sid) then yield Error $"{sid}: \"path\" belongs on a chapter's bridge scene (one ending in -why)"
                  if path.Length < 2 then yield Error $"{sid}: a path names at least 2 parts"
                  for id in path do
                      if not (known id) then yield Error $"{sid}: the path names {Py.reprStr id}, which is not a part of the map"
                  for a, b in List.pairwise path do
                      // not in a progress video: there a chapter is a theme, and its path the parts it touched
                      if known a && known b && not (joined a b) && text script "kind" <> "progress" then
                          yield Error $"{sid}: the path goes from {a} to {b}, but the map has no edge between them"
              let inside = insideOf s
              if inside = "" && not (isNull (Py.get s "inside")) then
                  yield Error $"{sid}: \"inside\" is the id of one part of the map, as a string"
              if inside <> "" then
                  if not (known inside) then yield Error $"{sid}: \"inside\": {Py.reprStr inside} is not a part of the map"
                  if isWhy sid || Py.truthy (Py.get s "recap") then
                      yield Error $"{sid}: \"inside\" cannot be on a bridge or recap scene (the frame draws those; no module is inside anything there)"
          // A visit: consecutive scenes inside the same part. The zoom in plays in the first one's lead, the zoom out
          // in the quiet end of the last one.
          for k, s in Array.indexed arr do
              let inside = insideOf s
              if inside <> "" then
                  let first = k = 0 || insideOf arr.[k - 1] <> inside
                  let last = k = arr.Length - 1 || insideOf arr.[k + 1] <> inside
                  let lead = number s "lead" 0.4
                  let tail = number s "pad" 0.9 + number s "hold" 0.0
                  if first && lead < VISIT_LEAD then
                      yield Warning $"{idOf s}: the zoom into {inside} takes {VISIT_LEAD} s; give this scene \"lead\": {VISIT_LEAD} or more (it has {lead})"
                  if last && k < arr.Length - 1 && tail < VISIT_TAIL then
                      yield Warning $"{idOf s}: the zoom out of {inside} needs \"pad\" plus \"hold\" of {VISIT_TAIL} s or more (it has {tail})"
          if not (scenes |> List.exists hasPath) then
              yield Warning "map: no bridge scene has a \"path\", so the map never opens a chapter"
          match lesson with
          | Some doc ->
              let doc = lower doc
              for p in parts do
                  let label = text p "label"
                  if label <> "" && not (doc.Contains(lower label)) then
                      yield Warning $"map: the label {Py.reprStr label} does not appear in the document"
          | None -> () ]

// ── glossary ─────────────────────────────────────────────────────────────────────────────────────────────────

/// What the glossary will say differently from how the script writes it, so a reader of `check` can see each
/// pronunciation that was chosen for them, and how often.
let private reportGlossary (glossary: Glossary.Glossary) (script: Json) =
    let uses =
        Py.list script "scenes"
        |> List.collect (fun s -> Glossary.uses glossary (rawSay s))
        |> List.countBy id
        |> List.sortBy (fun ((term, _), _) -> term.ToLower())
    if not uses.IsEmpty then
        Py.print $"glossary: {uses.Length} term(s) said its way (engine/glossary.json, <repo>/.codebase-video/glossary.json)"
        for (term, said), n in uses do
            let times = if n > 1 then $"  x{n}" else ""
            Py.print $"  {term} -> {said}{times}"

// ── main ─────────────────────────────────────────────────────────────────────────────────────────────────────

let run (ws: string) (args: string list) : int =
    let clip = ws
    let lesson =
        match List.tryFindIndex ((=) "--lesson") args with
        | Some i -> Some(resolve (List.item (i + 1) args))
        | None -> None
    let glossary = Glossary.load clip
    let stale, script, timing = load clip
    let jsFiles =
        readDir clip
        |> List.filter (fun n -> n.EndsWith ".js")
        |> Py.sortWith Py.cmpStr
        |> List.map (fun n -> join [ clip; n ])
    let scriptFindings, tokens = checkScript glossary script
    // tokens checked by ear and fine as written, e.g. ["CPU", "PDF"]
    let ok = Py.list script "readsFine" |> List.map Py.str |> set
    // each token once, in the order it was first read, with every place it was read
    let readAsWritten =
        [ for tok, reads in List.groupBy fst tokens do
              if not (ok.Contains tok) then
                  let where = reads |> List.map snd
                  let shownWhere = where |> List.truncate 4 |> String.concat ", "
                  let more = if where.Length > 4 then " …" else ""
                  yield Warning $"'{tok}' is read as written ({shownWhere}{more}): wrap it as [{tok}](how to say it), or list it in \"readsFine\" once checked by ear" ]
    let longVideo, longFindings = checkLong clip script
    let cueFindings = checkCues timing jsFiles
    let lessonFindings =
        match lesson with
        | Some p -> checkLesson glossary script jsFiles (readText p)
        | None -> []
    let mapFindings = checkMap script jsFiles (lesson |> Option.map readText)
    reportLength glossary script longVideo
    let durationFindings = reportDuration clip timing
    let breathingFindings = reportBreathing timing longVideo
    let flowFindings = reportFlow glossary script longVideo
    reportGlossary glossary script
    // in the order the checks ran
    let findings =
        List.concat
            [ stale; scriptFindings; readAsWritten; longFindings; cueFindings; lessonFindings; mapFindings
              durationFindings; breathingFindings; flowFindings ]
    let warnings = findings |> List.choose (function Warning w -> Some w | Error _ -> None)
    let errors = findings |> List.choose (function Error e -> Some e | Warning _ -> None)
    for w in warnings do Py.print $"warn   {w}"
    for e in errors do Py.print $"ERROR  {e}"
    Py.print $"{errors.Length} error(s), {warnings.Length} warning(s)"
    Py.flush ()
    if errors.IsEmpty then 0 else 1
