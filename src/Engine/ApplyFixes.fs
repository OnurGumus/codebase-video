/// Apply exact-text corrections to the teaching document:
///   node engine/cli/Cv.js <workspace> fix [fixes.json] [--apply]
///
/// fixes.json (default <workspace>/build/lesson-fixes.json; a relative path is looked up in the workspace first, then
/// in the current directory) is a list of {"old", "new", ...}; each "old" must occur exactly once at the moment it is
/// applied (fixes apply in order). Without --apply this is a dry run that prints a diff summary. With --apply the
/// original is kept as build/lesson.before-<n>.md and build/lesson.md is rewritten.
///
/// Port of engine/apply_fixes.py.
module ApplyFixes

open Fable.Core
open Fable.Core.JsInterop
open Node
open Check

[<Emit("$1 in $0")>]
let private hasKey (o: obj) (k: string) : bool = jsNative

let private isAbsolutePath (p: string) : bool = path?isAbsolute(p)

/// The lines of a and b that difflib.SequenceMatcher (autojunk on, no isjunk) leaves unmatched, as two
/// boolean masks. The changed-line count must equal Python's, so this is its algorithm, not a plain LCS:
/// a line in more than 1% of b (b of 200+ lines) is "popular" and never starts a match.
let private unmatched (a: string[]) (b: string[]) : bool[] * bool[] =
    // Where each line occurs in b, the indices ascending (folding from the end puts each in front of the later ones).
    let b2j: Map<string, int list> =
        (Array.indexed b, Map.empty)
        ||> Array.foldBack (fun (i, elt) m -> m.Add(elt, i :: defaultArg (m.TryFind elt) []))
    let b2j =
        if b.Length >= 200 then
            let ntest = b.Length / 100 + 1
            b2j |> Map.filter (fun _ idxs -> idxs.Length <= ntest)
        else b2j

    // The longest block a[i:i+k] = b[j:j+k] inside a[alo:ahi] and b[blo:bhi] as (i, j, k).
    let findLongestMatch alo ahi blo bhi =
        let step (j2len: Map<int, int>, best: int * int * int) i =
            // The lines of b that equal a[i] and lie inside [blo, bhi): b2j is ascending, so the first at or past bhi
            // ends the scan, and those before blo are skipped.
            let inRange =
                b2j
                |> Map.tryFind a.[i]
                |> Option.defaultValue []
                |> List.takeWhile (fun j -> j < bhi)
                |> List.filter (fun j -> j >= blo)
            ((Map.empty, best), inRange)
            ||> List.fold (fun (newj2len: Map<int, int>, (_, _, bestsize as best)) j ->
                let k = (j2len |> Map.tryFind (j - 1) |> Option.defaultValue 0) + 1
                // Only a strictly longer match replaces the best one, as in Python.
                newj2len.Add(j, k), (if k > bestsize then (i - k + 1, j - k + 1, k) else best))
        let _, best = ((Map.empty, (alo, blo, 0)), [ alo .. ahi - 1 ]) ||> List.fold step
        // No junk, so only the non-junk extensions apply (popular lines may extend a match).
        let rec back (besti, bestj, bestsize) =
            if besti > alo && bestj > blo && a.[besti - 1] = b.[bestj - 1] then
                back (besti - 1, bestj - 1, bestsize + 1)
            else besti, bestj, bestsize
        let rec forward (besti, bestj, bestsize) =
            if besti + bestsize < ahi && bestj + bestsize < bhi && a.[besti + bestsize] = b.[bestj + bestsize] then
                forward (besti, bestj, bestsize + 1)
            else besti, bestj, bestsize
        forward (back best)

    // The longest match of a range, then the same on each side of it (the right side first, as Python's queue does).
    let rec blocks (queue: (int * int * int * int) list) (found: (int * int * int) list) =
        match queue with
        | [] -> found
        | (alo, ahi, blo, bhi) :: rest ->
            match findLongestMatch alo ahi blo bhi with
            | i, j, k when k > 0 ->
                let rest = if alo < i && blo < j then (alo, i, blo, j) :: rest else rest
                let rest = if i + k < ahi && j + k < bhi then (i + k, ahi, j + k, bhi) :: rest else rest
                blocks rest ((i, j, k) :: found)
            | _ -> blocks rest found
    let matched = blocks [ (0, a.Length, 0, b.Length) ] []
    // The lines of one side that no block covers: each block is its start on that side and its size.
    let uncovered (length: int) (starts: (int * int) list) : bool[] =
        let covered = starts |> List.collect (fun (start, k) -> [ start .. start + k - 1 ]) |> Set.ofList
        Array.init length (fun x -> not (covered.Contains x))
    uncovered a.Length (matched |> List.map (fun (i, _, k) -> i, k)),
    uncovered b.Length (matched |> List.map (fun (_, j, k) -> j, k))

/// len([d for d in unified_diff(..., n=0) if d.startswith(("+", "-")) and not d.startswith(("+++", "---"))]):
/// removed lines not starting "--" plus added lines not starting "++".
let private changedLines (before: string) (after: string) : int =
    let a, b = before.Split('\n'), after.Split('\n')
    let delA, addB = unmatched a b
    let count (lines: string[]) (mask: bool[]) (skip: string) =
        Array.zip lines mask |> Array.filter (fun (l, m) -> m && not (l.StartsWith skip)) |> Array.length
    count a delA "--" + count b addB "++"

/// args: [fixes file (default build/lesson-fixes.json)] [--apply]
let run (ws: string) (args: string list) : int =
    let apply = List.contains "--apply" args
    let fixesPath =
        match args |> List.filter ((<>) "--apply") with
        | f :: _ ->
            // A relative path: the workspace first, then the current directory.
            let inWs = join [ ws; f ]
            if not (isAbsolutePath f) && exists inWs then inWs else resolve f
        | [] -> join [ ws; "build"; "lesson-fixes.json" ]
    let doc = join [ ws; "build"; "lesson.md" ]
    let before = readText doc
    let fixes: obj[] = unbox (readJson fixesPath)
    let rec applyAll (i: int) (text: string) : Result<string, string> =
        if i >= fixes.Length then Ok text
        else
            let fx = fixes.[i]
            let old: string = fx?old
            let n = Py.count text old
            if n <> 1 then
                let fid = if hasKey fx "id" then Py.str (Py.get fx "id") else "?"
                Error $"fix {i} ({fid}): \"old\" occurs {n} times, expected 1. Nothing written."
            else
                let by: string = fx?``new``
                // "".replace("", new) is new; that is the only way an empty "old" occurs once
                applyAll (i + 1) (if old = "" then by else Py.replace text old by)
    match applyAll 0 before with
    | Error msg -> Py.fail msg
    | Ok after ->
        Py.print $"{Py.len before} -> {Py.len after} chars; {changedLines before after} changed lines"
        if apply then
            let backup n = join [ ws; "build"; $"lesson.before-{n}.md" ]
            let rec firstFree n = if exists (backup n) then firstFree (n + 1) else n
            let n = firstFree 1
            writeText (backup n) before
            writeText doc after
            Py.print $"applied; the previous text is build/lesson.before-{n}.md"
        else
            Py.print "dry run: nothing written (add --apply)"
        Py.flush ()
        0
