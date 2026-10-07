/// The facts of a commit range, for a progress video: node engine/cli/Cv.js <workspace> history [--done].
///
/// A progress video says how a repository changed between two points. Every number in it comes from here, read
/// from git by a program, so that no agent ever counts. Reads <workspace>/brief.json:
///   repo      absolute path of the repository
///   since     where the range starts: a tag, a commit or a date (2026-09-01). Optional: without it, where the
///             last progress video of this repository ended (<repo>/.codebase-video/progress.json), else the
///             latest tag before `until`, else 30 days before `until`
///   until     where it ends (default HEAD)
///   focus     a list; author names are written only when it holds "people"
///   ignore    globs of paths to leave out of the numbers, on top of lock files and what .gitattributes marks
///             linguist-generated
/// and writes <workspace>/build/history.json and history.md (the same facts, for agents to read).
///
/// `history --done` records where this video ended, in <repo>/.codebase-video/progress.json, so that the next one
/// starts there.
///
/// Every git command here only reads. A number about "work" (commits, lines added and removed, files changed per
/// area) is a sum over the commits of the range; "added", "deleted" and "renamed" compare the two ends.
module History

open Fable.Core
open Fable.Core.JsInterop
open Node

[<Emit("new RegExp($0, $1)")>]
let private regex (pattern: string) (flags: string) : obj = jsNative

[<Emit("$1.test($0)")>]
let private matches (s: string) (rx: obj) : bool = jsNative

[<Emit("$0.replace(/[.+^${}()|[\\]\\\\]/g, '\\\\$&')")>]
let private escapeRx (s: string) : string = jsNative

[<Emit("Array.isArray($0)")>]
let private isArray (o: obj) : bool = jsNative

[<Emit("($0 == null)")>]
let private isNil (o: obj) : bool = jsNative

/// Stops the step with a message that says what to do.
exception private Stop of string

let private stop (msg: string) : 'a = raise (Stop msg)

/// How many commits are listed in full before the list is cut down to the ones that stand out.
let private LIST_ALL = 300
/// A commit that touches more files than this stands out.
let private WIDE = 20
let private TOP_FILES = 20

/// Folders whose children are areas of their own ("src/Kit", not "src").
let private ROOTS = set [ "src"; "lib"; "app"; "apps"; "packages"; "services"; "cmd"; "internal"; "pkg" ]

let private LOCKS = [ "*.lock"; "**/*.lock"; "package-lock.json"; "**/package-lock.json"; "pnpm-lock.yaml"; "**/pnpm-lock.yaml" ]

type private Commit =
    { Id: string
      Date: string
      Author: string
      Merge: bool
      Subject: string
      Body: string
      /// (path after any rename, lines added, lines removed)
      Files: (string * int * int) list }

/// git in the repository: its exit code and what it printed, trimmed.
let private git (repo: string) (args: string list) : int * string =
    let code, out, _ = runCapture "git" ([ "-C"; repo ] @ args)
    code, out.Trim()

let private gitOut (repo: string) (args: string list) : string = snd (git repo args)

/// A glob as a regular expression over a whole path: ** crosses folders, * and ? do not.
let private globRx (glob: string) : obj =
    let body =
        (escapeRx glob).Replace("**/", "\u0001").Replace("**", "\u0002").Replace("*", "[^/]*").Replace("?", "[^/]")
            .Replace("\u0001", "(?:.*/)?").Replace("\u0002", ".*")
    regex ("^" + body + "$") ""

/// "src/a/{base.txt => core.txt}" and "old.txt => new.txt", as numstat prints a rename: the new path.
let private newPath (shown: string) : string =
    let brace = shown.IndexOf "{"
    let arrow = shown.IndexOf " => "
    if arrow < 0 then shown
    elif brace >= 0 && shown.IndexOf("}", arrow) > arrow then
        let close = shown.IndexOf("}", arrow)
        (shown.Substring(0, brace) + shown.Substring(arrow + 4, close - arrow - 4) + shown.Substring(close + 1)).Replace("//", "/")
    else shown.Substring(arrow + 4)

/// The area a path belongs to: its first folder, or its first two under a source root; "(root)" for a file at the top.
let private areaOf (path: string) : string =
    match path.Split '/' |> Array.toList with
    | [ _ ] -> "(root)"
    | first :: second :: _ :: _ when ROOTS.Contains first -> first + "/" + second
    | first :: _ -> first
    | [] -> "(root)"

let private isDate (s: string) = matches s (regex @"^\d{4}-\d{2}-\d{2}$" "")

let private commitOf (repo: string) (reference: string) : string option =
    match git repo [ "rev-parse"; "--verify"; "--quiet"; reference + "^{commit}" ] with
    | 0, sha when sha <> "" -> Some sha
    | _ -> None

let private shortOf (repo: string) (sha: string) : string = gitOut repo [ "rev-parse"; "--short"; sha ]
let private dateOf (repo: string) (sha: string) : string = gitOut repo [ "show"; "-s"; "--format=%cs"; sha ]

let private isShallow (repo: string) : bool = gitOut repo [ "rev-parse"; "--is-shallow-repository" ] = "true"

let private SHALLOW_HINT = "fetch the full history (in GitHub Actions: actions/checkout with fetch-depth: 0)"

/// The nearest tags, newest first, for a message about a reference that was not found.
let private nearTags (repo: string) : string =
    match (gitOut repo [ "tag"; "--sort=-creatordate" ]).Split '\n' |> Array.filter ((<>) "") |> Array.truncate 5 with
    | [||] -> "the repository has no tags"
    | tags -> "the latest tags are " + String.concat ", " tags

/// Days from one yyyy-mm-dd to another.
[<Emit("Math.round((Date.parse($1 + 'T00:00:00Z') - Date.parse($0 + 'T00:00:00Z')) / 86400000)")>]
let private daysBetween (a: string) (b: string) : int = jsNative

[<Emit("new Date(Date.parse($0 + 'T00:00:00Z') - $1 * 86400000).toISOString().slice(0, 10)")>]
let private daysBefore (date: string) (days: int) : string = jsNative

/// Where the range ends: the commit of `until`.
let private resolveUntil (repo: string) (reference: string) : string =
    if isDate reference then
        match gitOut repo [ "rev-list"; "-1"; $"--before={reference} 23:59:59"; "HEAD" ] with
        | "" -> stop $"history: no commit on or before {reference}"
        | sha -> sha
    else
        match commitOf repo reference with
        | Some sha -> sha
        | None -> stop $"history: \"until\" is {reference}, which is not a tag, a commit or a date here; {nearTags repo}"

/// Where the range starts, and how that was chosen.
let private resolveSince (repo: string) (given: string option) (until: string) : string * string * string =
    let first () = (gitOut repo [ "rev-list"; "--max-parents=0"; until ]).Split('\n') |> Array.last
    let before (date: string) = gitOut repo [ "rev-list"; "-1"; $"--before={date} 23:59:59"; until ]
    match given with
    | Some reference when isDate reference ->
        match before reference with
        | "" when isShallow repo -> stop $"history: this clone is shallow and does not reach {reference}; {SHALLOW_HINT}"
        | "" -> first (), reference, "first commit"
        | sha -> sha, reference, "given"
    | Some reference ->
        match commitOf repo reference with
        | Some sha -> sha, reference, "given"
        | None when isShallow repo -> stop $"history: this clone is shallow and does not reach {reference}; {SHALLOW_HINT}"
        | None -> stop $"history: \"since\" is {reference}, which is not a tag, a commit or a date here; {nearTags repo}"
    | None ->
        let recorded =
            let file = join [ repo; ".codebase-video"; "progress.json" ]
            if exists file then
                let last: obj = (readJson file)?until
                if isNil last then None else commitOf repo (string last?commit)
            else None
        match recorded with
        | Some sha -> sha, shortOf repo sha, "last video"
        | None ->
            // The latest tag before `until`: not a tag that sits on `until` itself, which would leave nothing.
            let tagBefore =
                match git repo [ "describe"; "--tags"; "--abbrev=0"; until ] with
                | 0, tag when commitOf repo tag <> Some until -> Some tag
                | 0, _ ->
                    match git repo [ "describe"; "--tags"; "--abbrev=0"; until + "^" ] with
                    | 0, tag -> Some tag
                    | _ -> None
                | _ -> None
            match tagBefore with
            | Some tag -> (commitOf repo tag).Value, tag, "latest tag"
            | None ->
                let date = daysBefore (dateOf repo until) 30
                match before date with
                | "" when isShallow repo -> stop $"history: this clone is shallow and does not reach 30 days back; {SHALLOW_HINT}"
                | "" -> first (), "the first commit", "first commit"
                | sha -> sha, date, "30 days"

/// The commits of since..until, oldest first, with the files each touched.
let private readCommits (repo: string) (since: string) (until: string) : Commit list =
    let out =
        gitOut repo
            [ "log"; "--reverse"; "-M"; "--numstat"; "--format=%x01%h%x02%cs%x02%an%x02%P%x02%s%x02%b%x03"; $"{since}..{until}" ]
    [ for chunk in out.Split '\u0001' do
          if chunk.Trim() <> "" then
              let cut = chunk.IndexOf '\u0003'
              let head = chunk.Substring(0, cut).Split '\u0002'
              let files =
                  [ for line in chunk.Substring(cut + 1).Split '\n' do
                        match line.Split '\t' with
                        | [| added; removed; path |] ->
                            // "-" for a binary file: it counts as a file, not as lines
                            let n (s: string) = if s = "-" then 0 else int s
                            newPath path, n added, n removed
                        | _ -> () ]
              { Id = head.[0]
                Date = head.[1]
                Author = head.[2]
                Merge = head.[3].Trim().Contains " "
                Subject = head.[4]
                Body = head.[5].Trim()
                Files = files } ]

/// A commit message without the lines and addresses that name people: sign-offs, co-authors, reviewers, emails.
/// (A name inside the message's own sentences stays; the briefs say not to repeat it.)
let private TRAILER = regex @"^\s*(?:co-authored-by|signed-off-by|reviewed-by|acked-by|tested-by|reported-by|suggested-by|helped-by|authored-by|cc)\s*:.*$" "gim"
let private EMAIL = regex @"<?[\w.+-]+@[\w-]+(?:\.[\w-]+)+>?" "g"

[<Emit("$0.replace($1, $2)")>]
let private replaceAll (s: string) (rx: obj) (by: string) : string = jsNative

let private unnamed (message: string) : string = (replaceAll (replaceAll message TRAILER "") EMAIL "").Trim()

/// Which of these paths .gitattributes marks linguist-generated.
let private generated (repo: string) (paths: string list) : Set<string> =
    if paths.IsEmpty then Set.empty
    else
        let r =
            childProcess?spawnSync (
                "git",
                [| "-C"; repo; "check-attr"; "linguist-generated"; "--stdin" |],
                createObj [ "encoding" ==> "utf8"; "input" ==> String.concat "\n" paths; "maxBuffer" ==> (1 <<< 28) ]
            )
        let out: string = if isNil r?stdout then "" else r?stdout
        [ for line in out.Split '\n' do
              // "path: linguist-generated: true"
              let mark = line.LastIndexOf ": linguist-generated: "
              if mark > 0 && (line.Substring(mark + 22).Trim() = "true" || line.Substring(mark + 22).Trim() = "set") then
                  line.Substring(0, mark) ]
        |> Set.ofList

let private strings (o: obj) : string list = if isArray o then unbox<string[]> o |> Array.toList else []

let private pad (width: int) (s: string) = s.PadRight width

/// Reads the range and writes build/history.json and build/history.md.
let private write (ws: string) : int =
    let brief = readJson (join [ ws; "brief.json" ])
    let repo: string = if isNil brief?repo then stop "history: brief.json has no \"repo\"" else brief?repo
    if fst (git repo [ "rev-parse"; "--git-dir" ]) <> 0 then stop $"history: {repo} is not a git repository"
    let people = strings brief?focus |> List.contains "people"
    let untilRef: string = if isNil brief?until then "HEAD" else brief?until
    let until = resolveUntil repo untilRef
    let since, sinceRef, sinceWas = resolveSince repo (if isNil brief?since then None else Some(string brief?since)) until
    if since = until then
        stop $"history: no commits between {sinceRef} and {untilRef} (both are {shortOf repo until}); give an earlier \"since\""
    if fst (git repo [ "merge-base"; "--is-ancestor"; since; until ]) <> 0 then
        if isShallow repo then stop $"history: this clone is shallow and does not reach {sinceRef}; {SHALLOW_HINT}"
        stop $"history: {sinceRef} is not an ancestor of {untilRef}: the range must run forward in one line of history"
    let all = readCommits repo since until
    if all.IsEmpty then stop $"history: no commits between {sinceRef} and {untilRef}"

    // What is left out of the numbers: lock files, generated files, and the brief's own globs.
    let touched = all |> List.collect (fun c -> c.Files |> List.map (fun (p, _, _) -> p)) |> List.distinct
    let globs = (LOCKS @ strings brief?ignore) |> List.map globRx
    let gen = generated repo touched
    let ignored (path: string) = gen.Contains path || globs |> List.exists (matches path)
    let kept (c: Commit) = c.Files |> List.filter (fun (p, _, _) -> not (ignored p))
    let left = all |> List.collect (fun c -> c.Files |> List.filter (fun (p, _, _) -> ignored p))

    // The two ends compared: what exists now that did not, what is gone, what moved.
    let status =
        [ for line in (gitOut repo [ "diff"; "--name-status"; "-M"; since; until ]).Split '\n' do
              match line.Split '\t' |> Array.toList with
              | [ "A"; p ] when not (ignored p) -> "added", p, ""
              | [ "D"; p ] when not (ignored p) -> "deleted", p, ""
              | [ r; a; b ] when r.StartsWith "R" && not (ignored b) -> "renamed", b, a
              | _ -> () ]
    let of' kind = status |> List.filter (fun (k, _, _) -> k = kind)

    let sum (files: (string * int * int) list) = files |> List.sumBy (fun (_, a, _) -> a), files |> List.sumBy (fun (_, _, r) -> r)
    let areas =
        all
        |> List.collect (fun c -> kept c |> List.map (fun (p, a, r) -> areaOf p, (c, p, a, r)))
        |> List.groupBy fst
        |> List.map (fun (area, rows) ->
            let rows = rows |> List.map snd
            let commits = rows |> List.map (fun (c, _, _, _) -> c) |> List.distinctBy (fun c -> c.Id)
            let count kind = status |> List.filter (fun (k, p, _) -> k = kind && areaOf p = area) |> List.length
            createObj
                ([ "area" ==> area
                   "commits" ==> commits.Length
                   "files" ==> (rows |> List.map (fun (_, p, _, _) -> p) |> List.distinct |> List.length)
                   "added" ==> count "added"
                   "deleted" ==> count "deleted"
                   "renamed" ==> count "renamed"
                   "linesAdded" ==> (rows |> List.sumBy (fun (_, _, a, _) -> a))
                   "linesRemoved" ==> (rows |> List.sumBy (fun (_, _, _, r) -> r)) ]
                 @ (if people then
                        [ "people"
                          ==> (commits
                               |> List.countBy (fun c -> c.Author)
                               |> List.sortBy fst // by name: the order must not read as a ranking
                               |> List.map (fun (name, n) -> createObj [ "name" ==> name; "commits" ==> n ])
                               |> List.toArray) ]
                    else [])))
        |> List.sortBy (fun a -> -(a?commits: int), (a?area: string))
    let mostChanged =
        all
        |> List.collect (fun c -> kept c |> List.map (fun (p, a, r) -> p, (a, r)))
        |> List.groupBy fst
        |> List.map (fun (p, rows) -> p, rows.Length, rows |> List.sumBy (fun (_, (a, _)) -> a), rows |> List.sumBy (fun (_, (_, r)) -> r))
        |> List.sortBy (fun (p, n, a, r) -> -n, -(a + r), p)
        |> List.truncate TOP_FILES

    // Tags reached by `until` and not by `since`.
    let tagsOf (sha: string) = (gitOut repo [ "tag"; "--merged"; sha ]).Split '\n' |> Array.filter ((<>) "") |> Set.ofArray
    let tags =
        Set.difference (tagsOf until) (tagsOf since)
        |> Set.toList
        |> List.map (fun t -> t, shortOf repo (commitOf repo t).Value, dateOf repo (commitOf repo t).Value)
        |> List.sortBy (fun (t, _, d) -> d, t)
    let tagged = tags |> List.map (fun (_, id, _) -> id) |> Set.ofList

    // A long range lists only the commits that stand out; the rest are in the counts.
    let partial = all.Length > LIST_ALL
    let listed = if partial then all |> List.filter (fun c -> c.Merge || tagged.Contains c.Id || c.Files.Length > WIDE) else all
    let said (message: string) = if people then message else unnamed message
    let commitJson (c: Commit) =
        createObj
            ([ "id" ==> c.Id; "date" ==> c.Date; "subject" ==> said c.Subject; "body" ==> said c.Body; "merge" ==> c.Merge
               "files" ==> (c.Files |> List.map (fun (p, _, _) -> p) |> List.toArray) ]
             @ (if people then [ "author" ==> c.Author ] else []))
    let untilDate, sinceDate = dateOf repo until, dateOf repo since
    let keptFiles = all |> List.collect kept
    let totalAdded, totalRemoved = sum keptFiles
    let leftAdded, leftRemoved = sum left
    let pathsOf kind = of' kind |> List.map (fun (_, p, _) -> p) |> List.toArray
    let json =
        createObj
            ([ "range"
               ==> createObj
                       [ "since" ==> createObj [ "ref" ==> sinceRef; "commit" ==> shortOf repo since; "date" ==> sinceDate ]
                         "until" ==> createObj [ "ref" ==> untilRef; "commit" ==> shortOf repo until; "date" ==> untilDate ]
                         "sinceWas" ==> sinceWas
                         "days" ==> daysBetween sinceDate untilDate
                         "commits" ==> all.Length ]
               "totals"
               ==> createObj
                       [ "files" ==> (keptFiles |> List.map (fun (p, _, _) -> p) |> List.distinct |> List.length)
                         "linesAdded" ==> totalAdded
                         "linesRemoved" ==> totalRemoved ]
               "tags" ==> (tags |> List.map (fun (t, id, d) -> createObj [ "tag" ==> t; "commit" ==> id; "date" ==> d ]) |> List.toArray)
               "listed" ==> (if partial then "partial" else "all")
               "commits" ==> (listed |> List.map commitJson |> List.toArray)
               "areas" ==> List.toArray areas
               "files"
               ==> createObj
                       [ "mostChanged"
                         ==> (mostChanged
                              |> List.map (fun (p, n, a, r) ->
                                  createObj [ "path" ==> p; "commits" ==> n; "linesAdded" ==> a; "linesRemoved" ==> r ])
                              |> List.toArray)
                         "added" ==> pathsOf "added"
                         "deleted" ==> pathsOf "deleted"
                         "renamed"
                         ==> (of' "renamed" |> List.map (fun (_, b, a) -> createObj [ "from" ==> a; "to" ==> b ]) |> List.toArray) ]
               "ignored"
               ==> createObj
                       [ "files" ==> (left |> List.map (fun (p, _, _) -> p) |> List.distinct |> List.toArray)
                         "commits" ==> (all |> List.filter (fun c -> c.Files |> List.exists (fun (p, _, _) -> ignored p)) |> List.length)
                         "linesAdded" ==> leftAdded
                         "linesRemoved" ==> leftRemoved ] ]
             @ (if people then
                    [ "people"
                      ==> (all
                           |> List.countBy (fun c -> c.Author)
                           |> List.sortBy fst
                           |> List.map (fun (name, n) -> createObj [ "name" ==> name; "commits" ==> n ])
                           |> List.toArray) ]
                else []))
    let build = join [ ws; "build" ]
    mkdirp build
    writeText (join [ build; "history.json" ]) (toJsonIndented json 2 + "\n")

    // The same facts, to read.
    let md = ResizeArray<string>()
    let line (s: string) = md.Add s
    let chosen =
        match sinceWas with
        | "last video" -> " The start is where the last progress video of this repository ended."
        | "latest tag" -> " No start was given: the range starts at the latest tag."
        | "30 days" -> " No start was given and the repository has no earlier tag: the range starts 30 days back."
        | "first commit" -> " The start asked for is before the repository's first commit: the range starts at the first commit."
        | _ -> ""
    line $"# History: {sinceRef} to {untilRef}"
    line ""
    line $"From {sinceRef} ({shortOf repo since}, {sinceDate}) to {untilRef} ({shortOf repo until}, {untilDate}): {daysBetween sinceDate untilDate} days, {all.Length} commits.{chosen}"
    line ""
    line "Every number in the video comes from this file or from history.json. Do not count anything yourself."
    line ""
    line $"Totals: {json?totals?files} files changed, {totalAdded} lines added, {totalRemoved} lines removed. Lines and files are sums over the range's commits; added, deleted and renamed compare its two ends."
    if not left.IsEmpty then
        let names = left |> List.map (fun (p, _, _) -> p) |> List.distinct
        line ""
        let sample = names |> List.truncate 5 |> String.concat ", "
        line $"Left out of every number above and below (lock files, generated files, the brief's \"ignore\"): {names.Length} files, {leftAdded} lines added, {leftRemoved} removed, across {json?ignored?commits} of the commits. For example: {sample}."
    line ""
    line "## Tags in the range"
    line ""
    if tags.IsEmpty then line "None." else for t, id, d in tags do line $"- {t} ({id}, {d})"
    line ""
    line "## Areas"
    line ""
    line "| area | commits | files | added | deleted | renamed | lines + | lines - |"
    line "|---|---|---|---|---|---|---|---|"
    for a in areas do
        line $"| {a?area} | {a?commits} | {a?files} | {a?added} | {a?deleted} | {a?renamed} | {a?linesAdded} | {a?linesRemoved} |"
    if people then
        line ""
        line "## People (written because the focus includes \"people\")"
        line ""
        line "By area, who committed there and how many commits. No ranking is meant by the order."
        line ""
        for a in areas do
            let who = (a?people: obj[]) |> Array.map (fun p -> $"{p?name} ({p?commits})") |> String.concat ", "
            line $"- {a?area}: {who}"
    line ""
    line "## Files"
    line ""
    let top = mostChanged |> List.map (fun (p, n, _, _) -> p + " (" + string n + ")") |> String.concat ", "
    line $"Most changed (by commits): {top}."
    let list (title: string) (paths: string list) =
        if not paths.IsEmpty then
            line ""
            let shown = (paths |> List.truncate 40 |> String.concat ", ") + (if paths.Length > 40 then ", ..." else "")
            line $"{title} ({paths.Length}): {shown}"
    list "Added" (of' "added" |> List.map (fun (_, p, _) -> p))
    list "Deleted" (of' "deleted" |> List.map (fun (_, p, _) -> p))
    list "Renamed" (of' "renamed" |> List.map (fun (_, b, a) -> a + " -> " + b))
    line ""
    line "## Commits, oldest first"
    line ""
    if partial then
        line $"The range holds {all.Length} commits. Only the {listed.Length} that are tagged, are merges or touch more than {WIDE} files are listed; the rest are in the counts above. Read the others with git when a theme needs them."
        line ""
    for c in listed do
        let who = if people then $", {c.Author}" else ""
        line $"- {c.Id} ({c.Date}{who}) {said c.Subject} [{c.Files.Length} files]"
        if said c.Body <> "" then
            for b in (said c.Body).Split '\n' do
                if b.Trim() <> "" then line $"    {b.TrimEnd()}"
    writeText (join [ build; "history.md" ]) (String.concat "\n" md + "\n")
    printfn "history: %s to %s, %d commits, %d days -> %s" sinceRef untilRef all.Length (daysBetween sinceDate untilDate) (join [ build; "history.md" ])
    0

/// Records where this video ended, for the next one's default start.
let private done' (ws: string) : int =
    let file = join [ ws; "build"; "history.json" ]
    if not (exists file) then stop "history --done: build/history.json is missing; run \"history\" first"
    let history = readJson file
    let brief = readJson (join [ ws; "brief.json" ])
    let repo: string = brief?repo
    let out = join [ repo; ".codebase-video"; "progress.json" ]
    mkdirp (dirname out)
    let until: obj = history?range?until
    writeText out (toJsonIndented (createObj [ "until" ==> createObj [ "commit" ==> until?commit; "date" ==> until?date ]; "video" ==> brief?name ]) 2 + "\n")
    printfn "history: the next progress video starts at %s (%s)" (string until?commit) out
    0

let run (ws: string) (args: string list) : int =
    try
        match args with
        | [ "--done" ] -> done' ws
        | [] -> write ws
        | other ->
            let given = String.concat " " other
            eprint $"history: unknown option {given} (options: --done)"
            2
    with Stop msg ->
        eprint msg
        1
