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
    let b2j = System.Collections.Generic.Dictionary<string, ResizeArray<int>>()
    b |> Array.iteri (fun i elt ->
        match b2j.TryGetValue elt with
        | true, l -> l.Add i
        | _ -> b2j.[elt] <- ResizeArray [ i ])
    if b.Length >= 200 then
        let ntest = b.Length / 100 + 1
        for elt in [ for kv in b2j do if kv.Value.Count > ntest then kv.Key ] do
            b2j.Remove elt |> ignore

    let findLongestMatch alo ahi blo bhi =
        let mutable besti, bestj, bestsize = alo, blo, 0
        let mutable j2len = System.Collections.Generic.Dictionary<int, int>()
        for i in alo .. ahi - 1 do
            let newj2len = System.Collections.Generic.Dictionary<int, int>()
            match b2j.TryGetValue a.[i] with
            | true, js ->
                let mutable stop = false
                for j in js do
                    if not stop && j >= blo then
                        if j >= bhi then stop <- true
                        else
                            let k = (match j2len.TryGetValue(j - 1) with | true, v -> v | _ -> 0) + 1
                            newj2len.[j] <- k
                            if k > bestsize then
                                besti <- i - k + 1
                                bestj <- j - k + 1
                                bestsize <- k
            | _ -> ()
            j2len <- newj2len
        // No junk, so only the non-junk extensions apply (popular lines may extend a match).
        while besti > alo && bestj > blo && a.[besti - 1] = b.[bestj - 1] do
            besti <- besti - 1
            bestj <- bestj - 1
            bestsize <- bestsize + 1
        while besti + bestsize < ahi && bestj + bestsize < bhi && a.[besti + bestsize] = b.[bestj + bestsize] do
            bestsize <- bestsize + 1
        besti, bestj, bestsize

    let inA = Array.create a.Length true
    let inB = Array.create b.Length true
    let queue = System.Collections.Generic.Stack<int * int * int * int>()
    queue.Push((0, a.Length, 0, b.Length))
    while queue.Count > 0 do
        let alo, ahi, blo, bhi = queue.Pop()
        let i, j, k = findLongestMatch alo ahi blo bhi
        if k > 0 then
            for d in 0 .. k - 1 do
                inA.[i + d] <- false
                inB.[j + d] <- false
            if alo < i && blo < j then queue.Push((alo, i, blo, j))
            if i + k < ahi && j + k < bhi then queue.Push((i + k, ahi, j + k, bhi))
    inA, inB

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
            let mutable n = 1
            while exists (backup n) do
                n <- n + 1
            writeText (backup n) before
            writeText doc after
            Py.print $"applied; the previous text is build/lesson.before-{n}.md"
        else
            Py.print "dry run: nothing written (add --apply)"
        Py.flush ()
        0
