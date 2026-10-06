/// A component kit for lesson animations (port of engine/stage-kit.js): window.Kit. The patterns every clip
/// kept rebuilding by hand (a heading, lines that arrive with the words, chips, tables, bars against a
/// capacity line, a stacked timeline, boxes with arrows and moving packets, a sequence diagram, a code card, a
/// whiteboard, a step strip), each timed by the narration and drawn purely from t. Styles are injected once, by install().
///
/// A module (long videos, see templates/long/clip.html) is written as
///
///   Kit.module("g1", (K) => {
///     K.heading("What gets graded", { at: "g1-vague" });
///     K.lines([{ html: "judgment", at: "g1-signals|judgment" }], { x: 60, y: 260 });
///   });
///
/// and a one-off clip can do the same with Kit.clip(render => ...) (see kit/gallery). Times are anything
/// Stage.time accepts: seconds, "scene", "scene#2", "scene|word", ["scene|word", 0.3]. Positions are stage
/// pixels (1920x1080); keep x 60-1860 and, in long videos, y 120-1010. Tones: accent, good, bad, warn,
/// violet, muted, ink. Every component takes { at, until } (appear, disappear) and { in: group }.
///
/// Toasts are small pop-up badges that mark a moment the narration flags: 💡 a key idea, 🤔 the tricky
/// part, 🧠 a callback. The kinds are fixed (Kit.TOASTS) so a mark means the same thing all video long.
/// K.toast(kind, { at, text }) in a module; in long videos, usually "toasts" on a scene in script.json.
///
/// The option objects come from JS modules; Interop.fs says how their missing fields are read. A resolved
/// time that may be absent (`Time`) is null, as in the original: JS arithmetic reads null as 0, and a few
/// components rely on that (a glow with no `from` lights from 0 s, a counter with no `at` counts from 0 s).
module Kit

open System
open Fable.Core
open Fable.Core.JsInterop
open Browser.Types
open Browser
open Interop
open Stage
open Draw

// ── Option objects (the JS API) ──────────────────────────────────────────────────────────────────────────

/// A resolved time in seconds, or null when the spec was absent.
type Time = float

let private noTime: Time = unbox null

/// What every component returns (and what K.group's `in` takes): its element and its render function.
type Comp = {| el: HTMLElement; render: float -> unit |}

/// Fields every component reads: { at, until, in } and place()'s { x, y, w, align }.
type Opts =
    abstract at: Spec
    abstract until: Spec
    abstract ``in``: Comp
    abstract x: float option
    abstract y: float option
    abstract w: float option
    abstract align: string

type GroupOpts =
    inherit Opts
    abstract fade: float option

type TextOpts =
    inherit Opts
    abstract size: string
    abstract rise: float option
    abstract tone: string
    abstract toneAt: Spec

type HeadingOpts =
    inherit Opts
    abstract sub: string
    abstract subAt: Spec

type LineItem =
    abstract html: obj
    abstract at: Spec
    abstract until: Spec
    abstract note: string
    abstract noteAt: Spec
    abstract tone: string
    abstract toneAt: Spec
    abstract strikeAt: Spec
    abstract bullet: string
    abstract mono: bool

type LinesOpts =
    inherit Opts
    abstract gap: float option
    abstract dim: bool
    abstract size: string

type ChipItem =
    abstract text: obj
    abstract at: Spec
    abstract until: Spec
    abstract tone: string
    abstract toneAt: Spec

type ChipsOpts =
    inherit Opts
    abstract gap: float option

/// A table cell with its own time: { html | text, at, until, tone, toneAt }. A plain string is a cell that
/// appears with its row.
type TableCell =
    abstract html: obj
    abstract text: obj
    abstract at: Spec
    abstract until: Spec
    abstract tone: string
    abstract toneAt: Spec

type TableRow =
    abstract cells: obj[]
    abstract at: Spec
    abstract until: Spec
    abstract tone: string
    abstract toneAt: Spec

type TableOpts =
    inherit Opts
    abstract cols: string[]
    abstract widths: float[]
    abstract rows: TableRow[]
    abstract headerAt: Spec
    abstract focus: bool

type BarStep =
    abstract value: float
    abstract at: Spec

type BarRow =
    abstract label: string
    abstract sub: string
    abstract value: float
    abstract at: Spec
    abstract until: Spec
    abstract steps: BarStep[]
    abstract tone: string
    abstract toneAt: Spec
    abstract format: (float -> obj)

type BarLine =
    abstract value: float
    abstract label: string

type BarsOpts =
    inherit Opts
    abstract max: float
    abstract line: BarLine
    abstract gap: float option
    abstract valueW: float option
    abstract rows: BarRow[]

type Segment =
    abstract label: string
    abstract value: float
    abstract show: obj
    abstract at: Spec
    abstract tone: string
    abstract toneAt: Spec

type Sum =
    abstract text: string
    abstract at: Spec

type TimelineOpts =
    inherit Opts
    abstract total: float
    abstract segments: Segment[]
    abstract sum: Sum

type FlowNode =
    abstract label: string
    abstract sub: string
    abstract icon: string
    abstract x: float
    abstract y: float
    abstract w: float
    abstract at: Spec
    abstract until: Spec
    abstract tone: string
    abstract fill: bool
    abstract toneAt: Spec
    abstract dimAt: Spec
    abstract rise: float option

type FlowEdge =
    abstract from: string
    abstract ``to``: string
    abstract at: Spec
    abstract until: Spec
    abstract label: string
    abstract dashed: bool
    abstract tone: string
    abstract toneAt: Spec
    abstract arrow: string option
    abstract fromPos: float option
    abstract toPos: float option

type Packet =
    abstract from: string
    abstract ``to``: string
    abstract at: Spec
    abstract until: Spec
    abstract dur: float option
    abstract label: string
    abstract tone: string
    abstract fadeAt: float option
    abstract lift: float option
    abstract fromPos: float option
    abstract toPos: float option

type FlowOpts =
    inherit Opts
    abstract nodes: obj
    abstract edges: FlowEdge[]
    abstract packets: Packet[]

type SeqActor =
    abstract id: string
    abstract label: string
    abstract icon: string
    abstract at: Spec
    abstract tone: string
    abstract fill: bool
    abstract toneAt: Spec

type SeqMessage =
    abstract from: string
    abstract ``to``: string
    abstract label: string
    abstract at: Spec
    abstract reply: bool
    abstract tone: string
    abstract toneAt: Spec

type SequenceOpts =
    inherit Opts
    abstract actors: SeqActor[]
    abstract messages: SeqMessage[]
    abstract gap: float option
    abstract dim: bool

type Glow =
    abstract line: int
    abstract from: Spec
    abstract until: Spec
    abstract tone: string

type CodeOpts =
    inherit Opts
    abstract title: string
    abstract lines: string[]
    abstract lang: string option
    abstract glow: Glow[]
    abstract font: float
    abstract slide: float option

type BoardRow =
    abstract label: string
    abstract text: string
    abstract at: Spec
    abstract dur: float option
    abstract result: string
    abstract resultAt: Spec
    abstract dimAt: Spec

type BoardOpts =
    inherit Opts
    abstract title: string
    abstract rows: BoardRow[]

type StepsOpts =
    inherit Opts
    abstract ats: Spec[]

type CounterOpts =
    inherit Opts
    abstract size: string
    abstract from: float option
    abstract ``to``: float
    abstract dur: float option
    abstract format: (float -> obj)
    abstract tone: string
    abstract toneAt: Spec

type ToastOpts =
    inherit Opts
    abstract text: string
    abstract right: float option
    abstract dur: float option

/// The kit bound to one root element: what a module's (K) => { ... } receives.
type IKit =
    abstract root: HTMLElement
    abstract scene: id: string * fn: (unit -> unit) -> unit
    abstract t: spec: Spec -> float
    abstract word: id: string * needle: obj * ?opts: WordOpts -> float
    abstract term: w: obj -> string
    abstract mono: w: obj -> string
    abstract group: ?o: GroupOpts -> Comp
    abstract text: html: obj * ?o: TextOpts -> Comp
    abstract heading: text: obj * ?o: HeadingOpts -> Comp
    abstract lines: items: obj[] * ?o: LinesOpts -> Comp
    abstract chips: items: obj[] * ?o: ChipsOpts -> Comp
    abstract table: ?o: TableOpts -> Comp
    abstract bars: ?o: BarsOpts -> Comp
    abstract timeline: ?o: TimelineOpts -> Comp
    abstract flow: ?o: FlowOpts -> Comp
    abstract sequence: ?o: SequenceOpts -> Comp
    abstract code: ?o: CodeOpts -> Comp
    abstract board: ?o: BoardOpts -> Comp
    abstract steps: labels: obj[] * ?o: StepsOpts -> Comp
    abstract counter: ?o: CounterOpts -> Comp
    abstract toast: kind: string * ?o: ToastOpts -> Comp
    abstract custom: build: Func<HTMLElement, HTMLElement> * render: Func<float, HTMLElement, unit> -> Comp
    abstract render: t: float -> unit

/// What Kit.frameToasts and Kit.frameBreaks return.
type FrameLayer = {| count: int; render: float -> unit |}

/// window.Kit.
type IKitApi =
    abstract TOASTS: obj
    abstract frameToasts: root: HTMLElement -> FrameLayer
    abstract frameBreaks: root: HTMLElement -> FrameLayer
    abstract kitFor: root: HTMLElement -> IKit
    abstract ``module``: key: string * fn: (IKit -> unit) -> unit
    abstract clip: fn: (IKit -> unit) -> unit

// ── Styles ───────────────────────────────────────────────────────────────────────────────────────────────

let private CSS =
    """
.k-abs { position: absolute; }
.k-title { font-size: 84px; font-weight: 700; letter-spacing: -.035em; line-height: 1.08; }
.k-big { font-size: 64px; font-weight: 650; letter-spacing: -.02em; line-height: 1.15; }
.k-text { font-size: 48px; line-height: 1.3; }
.k-small { font-size: 44px; line-height: 1.3; }
.k-mono { font-family: var(--mono); font-size: 46px; }
.k-label { font-size: 44px; font-weight: 700; letter-spacing: .04em; }
.k-muted { color: var(--muted); }
.k-heading { font-size: 56px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; }
.k-heading .k-sub { margin-left: 20px; font-size: 44px; font-weight: 500; color: var(--muted); }
.k-lines { display: flex; flex-direction: column; }
.k-line { font-size: 48px; line-height: 1.3; }
.k-line .k-note { display: block; font-size: 44px; color: var(--muted); margin-top: 2px; }
.k-line.k-mono-line { font-family: var(--mono); font-size: 46px; white-space: pre; }
.k-bullet { color: var(--accent); margin-right: 18px; font-weight: 700; }
.k-strike { position: absolute; left: -6px; right: -6px; top: 52%; height: 5px; border-radius: 3px; background: var(--bad); transform-origin: 0 50%; }
.k-rel { position: relative; display: inline-block; }
.k-chips { display: flex; flex-wrap: wrap; gap: 18px; }
.k-table { display: grid; background: var(--card); border: 3px solid var(--border); border-radius: 22px; padding: 10px 26px 14px; }
.k-table .k-th { font-size: 44px; font-weight: 700; color: var(--accent); letter-spacing: .03em; padding: 12px 14px 12px 0; border-bottom: 3px solid var(--border); }
.k-table .k-td { font-size: 44px; line-height: 1.25; padding: 14px 14px 14px 0; border-bottom: 2px solid #ffffff10; }
.k-bars .k-bar-label { font-size: 48px; font-weight: 650; white-space: nowrap; }
.k-bars .k-bar-sub { font-size: 44px; color: var(--muted); white-space: nowrap; margin-left: 18px; font-weight: 400; }
.k-bars .k-bar-track { position: absolute; height: 34px; border-radius: 17px; background: var(--border); opacity: .45; }
.k-bars .k-bar-fill { position: absolute; height: 34px; border-radius: 17px; transform-origin: 0 50%; }
.k-bars .k-bar-value { position: absolute; font-size: 52px; font-weight: 750; white-space: nowrap; }
.k-bars .k-bar-line { position: absolute; width: 0; border-left: 4px dashed var(--muted); }
.k-seg { position: absolute; height: 110px; border: 3px solid var(--border); border-radius: 14px; background: var(--card);
  display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
.k-seg .k-seg-label { font-size: 44px; line-height: 1.1; white-space: nowrap; color: var(--muted); }
.k-seg .k-seg-value { font-size: 48px; font-weight: 700; line-height: 1.1; }
.k-node { position: absolute; background: var(--card); border: 3px solid var(--border); border-radius: 18px; padding: 16px 26px;
  font-size: 46px; font-weight: 650; text-align: center; white-space: nowrap; }
.k-node .k-node-sub { display: block; font-size: 44px; font-weight: 400; color: var(--muted); }
.k-packet { position: absolute; left: 0; top: 0; z-index: 5; box-shadow: 0 8px 24px #0008; }
.k-edge-label { position: absolute; font-size: 44px; color: var(--muted); white-space: nowrap; background: var(--bg); padding: 2px 14px; border-radius: 12px; }
.k-node .k-node-icon { margin-right: 14px; }
.k-actor { height: 96px; display: flex; align-items: center; justify-content: center; }
.k-seq-label { color: var(--ink); }
.k-seq-label.k-seq-reply { color: var(--muted); }
.k-code .k-kw { color: var(--code-kw); } .k-code .k-ty { color: var(--code-type); } .k-code .k-fn { color: var(--code-fn); }
.k-code .k-str { color: var(--code-str); } .k-code .k-case { color: var(--code-case); } .k-code .k-num { color: var(--code-num); } .k-code .k-com { color: var(--code-com); font-style: italic; }
.k-code { background: var(--card); border: 3px solid var(--border); border-radius: 22px; padding: 22px 30px; }
.k-code .k-code-title { font-size: 44px; font-weight: 700; color: var(--accent); margin-bottom: 10px; }
.k-code .k-cl { font-family: var(--mono); font-size: 44px; line-height: 60px; height: 60px; padding: 0 14px; border-radius: 10px; white-space: pre; }
.k-board { background: var(--card); border: 3px solid var(--border); border-radius: 22px; padding: 22px 30px; }
.k-board .k-board-title { font-size: 44px; font-weight: 700; color: var(--accent); margin-bottom: 12px; }
.k-board .k-br { display: grid; grid-template-columns: auto 1fr; column-gap: 34px; align-items: baseline; margin: 8px 0; }
.k-board .k-br-label { font-size: 44px; font-weight: 650; white-space: nowrap; }
.k-board .k-br-text { font-family: var(--mono); font-size: 46px; white-space: pre; }
.k-board .k-br-result { font-family: var(--mono); font-size: 46px; color: var(--accent); white-space: pre; grid-column: 2; }
.k-steps { display: flex; gap: 22px; }
.k-step { font-size: 44px; font-weight: 650; padding: 12px 26px; border-radius: 999px; border: 3px solid var(--border); background: var(--bg2); color: var(--muted); white-space: nowrap; }
.k-step b { color: var(--accent); margin-right: 12px; }
.k-counter { font-size: 96px; font-weight: 750; letter-spacing: -.02em; white-space: nowrap; }
.k-toast { display: flex; align-items: center; gap: 18px; padding: 10px 34px 10px 12px; border-radius: 999px;
  background: var(--bg2); border: 3px solid var(--tc, var(--accent)); box-shadow: 0 12px 36px #0009;
  white-space: nowrap; transform-origin: 100% 50%; z-index: 20; }
.k-toast .k-toast-icon { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 48px; line-height: 1; background: color-mix(in srgb, var(--tc, var(--accent)) 22%, transparent); }
.k-toast .k-toast-text { font-size: 44px; font-weight: 700; color: var(--tc, var(--accent)); }
.k-toast .k-ring { width: 64px; height: 64px; margin-left: 6px; }
.k-toast .k-ring circle { fill: none; stroke-width: 7; }
.k-recap { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; display: flex; align-items: center; justify-content: center; z-index: 15; }
.k-recap .k-recap-box { min-width: 1100px; max-width: 1600px; background: var(--card); border: 3px solid var(--border); border-radius: 30px; padding: 44px 60px 50px; }
.k-recap .k-recap-title { font-size: 44px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); margin-bottom: 18px; }
.k-recap .k-recap-line { font-size: 56px; font-weight: 600; line-height: 1.3; margin-top: 18px; display: flex; }
.k-recap .k-recap-line b { color: var(--accent); margin-right: 22px; flex: none; }
"""

let private injectCss () =
    if isNull (document.getElementById "stage-kit-css") then
        let st = document.createElement "style"
        st.id <- "stage-kit-css"
        st.textContent <- CSS
        document.head?append (st)

// ── Small helpers ────────────────────────────────────────────────────────────────────────────────────────

/// `{ ...defaults, ...o }`: o's own fields win, even when they hold undefined.
[<Emit("({ ...$0, ...$1 })")>]
let private withDefaults (_defaults: obj) (_o: 'T) : 'T = jsNative

/// The option object a component received, or {} when it was left out.
let private opts (o: 'T option) : 'T = orUndef (unbox<'T> o) (createEmpty<'T>)

/// A JS array's element, or undefined past its end (rows[i + 1]).
let private item (xs: 'a[]) (i: int) : 'a = get<'a> xs i

/// `rows[0] && rows[0].at`: the first element's field, or undefined when there is none.
let private firstAt (xs: 'a[]) (f: 'a -> Time) : Time = if xs.Length > 0 then f xs.[0] else noTime

/// The lane key of an edge: its two ends in JS sort order, either way round.
[<Emit("[$0, $1].sort().join(\"\\u0000\")")>]
let private pairKey (_from: obj) (_to: obj) : string = jsNative

[<Emit("$0.toLocaleString(\"en-US\")")>]
let private toLocale (_v: float) : string = jsNative

/// Sorts in place by `at` with the JS comparator (stable; NaN compares as equal).
[<Emit("$0.sort((a, b) => a.at - b.at)")>]
let private sortByAt (_xs: 'a[]) : 'a[] = jsNative

let private SENTENCE_REF = regExp "^#\\d+$" ""

/// Visibility 0..1 for a component that appears at `at` and leaves at `until`.
let private vis t (at: Time) (until: Time) fade =
    within t (if isNil at then -infinity else at - 0.05) (if isNil until then infinity else until) fade

let private vis' t at until = vis t at until 0.35

// ── Toasts ───────────────────────────────────────────────────────────────────────────────────────────────

// The fixed set of toast kinds: icon, default text, tone. Keep one meaning per kind all video long.
let TOASTS =
    createObj
        [ "idea" ==> {| icon = "💡"; text = "Key idea"; tone = "accent" |}
          "tricky" ==> {| icon = "🤔"; text = "The tricky part"; tone = "warn" |}
          "remember" ==> {| icon = "🧠"; text = "Remember"; tone = "violet" |}
          "careful" ==> {| icon = "⚠️"; text = "Be careful"; tone = "warn" |}
          "mistake" ==> {| icon = "🚫"; text = "Common mistake"; tone = "bad" |}
          "surprise" ==> {| icon = "😮"; text = "Surprise"; tone = "violet" |}
          "remark" ==> {| icon = "💬"; text = "Note"; tone = "muted" |}
          "question" ==> {| icon = "💭"; text = "Ask yourself"; tone = "accent" |}
          "tip" ==> {| icon = "🔧"; text = "Pro tip"; tone = "accent" |} ] // not green: green is a verdict colour

let private TOAST_DUR = 3.2

type private ToastKind = {| icon: string; text: string; tone: string |}

type private ToastEl = { el: HTMLElement; draw: float -> Time -> Time -> unit }

/// Builds one toast element, with a pop-in and fade-out drawn from t.
let private toastEl (parent: HTMLElement) (kind: obj) (text: string) : ToastEl =
    let k = get<ToastKind> TOASTS kind
    if not (truthy k) then
        let kinds = keys TOASTS |> String.concat ", "
        fail $"toast kind {jsStr (stringify kind)} is not one of {kinds}"
    let el =
        mk parent "div" "k-toast k-abs" $"""<span class="k-toast-icon">{k.icon}</span><span class="k-toast-text">{esc (jsOr text k.text)}</span>""" null
    el.style.setProperty ("--tc", tone k.tone)
    { el = el
      draw =
        fun t at until ->
            let v = within t (at - 0.05) until 0.3
            let pop = prog t (at - 0.05) 0.42 id
            let s = if pop < 1.0 then lerp 0.6 1.0 (ease.out pop) + Math.Sin(pop * Math.PI) * 0.06 else 1.0
            show el v 0.0 $"scale({toFixed s 4})" }

// ── Syntax highlighting for K.code: a small tokenizer per language, enough to colour a lesson's excerpt ──

let private words (s: string) = s.Split(' ') |> Set.ofArray

let private KW =
    Map
        [ "csharp",
          words
              "abstract as async await base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in init int interface internal is lock long namespace new null object operator out override params private protected public readonly record ref required return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile when where while with yield get set"
          "python",
          words
              "and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield"
          "javascript",
          words
              "async await break case catch class const continue default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while yield"
          "nix", words "let in with import inherit rec if then else assert or true false null"
          "fsharp",
          words
              "abstract and as assert async base begin class default delegate do done downcast downto elif else end exception extern false finally fixed for fun function global if in inherit inline interface internal lazy let match member module mutable namespace new not null of open or override private public rec return select sig static struct task then to true try type upcast use val void when while with yield"
          "dockerfile", words "FROM RUN COPY ADD CMD ENTRYPOINT ENV ARG WORKDIR EXPOSE USER LABEL VOLUME"
          "sql",
          words
              "select from where insert into values update set delete create table alter drop index on conflict do and or not null is as join left right inner outer group by order having limit returning primary key references begin commit rollback excluded case when then else end" ]

let private TOKEN =
    regExp
        """(\/\/.*$|--.*$|#.*$)|(@?\$?"(?:[^"\\]|\\.)*"(?:u8)?|'(?:[^'\\]|\\.)*')|(\b\d[\d_]*(?:\.\d+)?[fFdDmMlLuU]*\b)|([A-Za-z_][A-Za-z0-9_]*)"""
        "g"

let private NEXT = regExp """^\s*(\(|<)""" ""
let private UPPER = regExp "^[A-Z]" ""
let private HASH_COMMENTS = Set.ofList [ "yaml"; "bash"; "python"; "nix"; "dockerfile" ]

// Inside an unclosed generic argument list, e.g. "Command<Account" (arrows "->" are not brackets).
let private inGeneric (s: string) =
    let t = s.Replace("->", "")
    let count c = t |> Seq.filter ((=) c) |> Seq.length
    count '<' > count '>'

let private slice (s: string) (a: int) (b: int option) : string =
    match b with
    | Some b -> s?slice (a, b)
    | None -> s?slice (a)

let highlight (line: string) (lang: string) : string =
    if not (truthy lang) || lang = "plain" then esc line
    else
        let kw = KW |> Map.tryFind lang |> Option.defaultValue KW.["csharp"]
        let cOrJs = lang = "csharp" || lang = "javascript"
        let mutable out = ""
        let mutable last = 0
        let mutable fin = false
        TOKEN.lastIndex <- 0
        while not fin do
            let m = TOKEN.exec line
            if isNil m then fin <- true
            else
                let tok, com, str, num, id = m.[0], m.[1], m.[2], m.[3], m.[4]
                let startsWith (s: string) (p: string) : bool = s?startsWith (p)
                if truthy str && lang = "fsharp" && startsWith str "'" && str.Length > 4 then
                    TOKEN.lastIndex <- m.index + 1 // 'T generics, not a char
                elif
                    truthy com
                    && ((startsWith com "//" && (cOrJs || lang = "fsharp"))
                        || (startsWith com "--" && lang = "sql")
                        || (startsWith com "#" && HASH_COMMENTS.Contains lang))
                then
                    out <- out + esc (slice line last (Some m.index)) + $"""<span class="k-com">{esc com}</span>"""
                    last <- m.index + tok.Length
                    fin <- true
                elif truthy com then
                    TOKEN.lastIndex <- m.index + 1 // "--" or "#" that is not a comment here
                else
                    let cls =
                        if truthy str then "k-str"
                        elif truthy num then "k-num"
                        elif truthy id then
                            let next = strMatch (slice line (m.index + id.Length) None) NEXT
                            let call = truthy next && next.[1] = "("
                            let upper = UPPER.test id
                            if kw.Contains(if lang = "sql" then id?toLowerCase () else id) then "k-kw"
                            elif cOrJs && call && upper then "k-fn"
                            elif lang = "python" && call then "k-fn"
                            elif lang = "fsharp" && upper then
                                // F#: Type annotations, constructor calls and union cases read differently; a property after "." stays ink.
                                let before: string = (slice line 0 (Some m.index))?trimEnd ()
                                if before?endsWith (".") then null
                                elif call then "k-fn"
                                elif before?endsWith (":") || inGeneric before then "k-ty"
                                else "k-case"
                            elif cOrJs && upper then "k-ty"
                            else null
                        else null
                    out <- out + esc (slice line last (Some m.index)) + (if truthy cls then $"""<span class="{cls}">{esc tok}</span>""" else esc tok)
                    last <- m.index + tok.Length
        out + esc (slice line last None)

// ── One kit bound to one root element. Components register themselves; render(t) draws them all ──────────

type private SceneCtx = { at: Time; until: Time }

type private Head = { ``end``: string; el: Element }

type private EdgeState =
    { e: FlowEdge
      path: Element
      label: HTMLElement
      heads: Head[]
      at: Time
      toneAt: Time
      until: Time
      mutable lane: float
      mutable len: float }

let kitFor (root: HTMLElement) : IKit =
    let parts = ResizeArray<Comp>()
    let add (c: Comp) =
        parts.Add c
        c
    let host (o: #Opts) = if truthy o && truthy o.``in`` then o.``in``.el else root
    let place (el: HTMLElement) (o: #Opts) =
        el.classList.add "k-abs"
        o.x |> Option.iter (fun x -> el.style.left <- $"{x}px")
        o.y |> Option.iter (fun y -> el.style.top <- $"{y}px")
        o.w |> Option.iter (fun w -> el.style.width <- $"{w}px")
        if truthy o.align then el.style.textAlign <- o.align

    // Inside K.scene(id, fn), components default to that scene: they appear when it starts (unless
    // given `at`) and leave when it ends (unless given `until`), so a module's scenes never pile up.
    let sceneCtx: SceneCtx option ref = ref None
    /// A time spec resolved, or null.
    let T0 (spec: Spec) : Time = if isNil spec then noTime else time spec
    /// ... defaulting to the current K.scene's start.
    let TAt (spec: Spec) : Time =
        if not (isNil spec) then T0 spec
        else match sceneCtx.Value with Some c -> c.at | None -> noTime
    /// ... defaulting to the current K.scene's end.
    let TUntil (spec: Spec) : Time =
        if not (isNil spec) then T0 spec
        else match sceneCtx.Value with Some c -> c.until | None -> noTime
    let isOn (toneName: string) (toneAt: Time) t = truthy toneName && (isNil toneAt || t >= toneAt)

    { new IKit with
        member _.root = root

        /// Components made inside fn belong to scene id: default at = its start, until = its end.
        member _.scene(id, fn) =
            let s = scene id
            let prev = sceneCtx.Value
            let first = item s.sentences 0
            sceneCtx.Value <- Some { at = (if truthy first then first.start else s.start); until = s.``end`` }
            try fn () finally sceneCtx.Value <- prev

        member _.t spec = time spec
        member _.word(id, needle, o) = Stage.api.word (id, needle, ?opts = o)

        /// HTML for a defined term, e.g. K.term("aggregate") + ": one consistency boundary".
        member _.term w = $"""<span class="k-term">{esc w}</span>"""

        /// HTML for inline code in a caption, e.g. "returns " + K.mono("EventAction").
        member _.mono w = $"""<span style="font-family:var(--mono)">{esc w}</span>"""

        /// A container that fades as one: pass it to other components as { in: group }.
        member _.group o =
            let o = opts o
            let el = mk root "div" "k-abs" null "left:0;top:0;width:1920px;height:1080px"
            let at, until = TAt o.at, TUntil o.until
            add
                {| el = el
                   render =
                    fun t ->
                        let p = vis t at until (defaultArg o.fade 0.4)
                        el.style?opacity <- p
                        el.style.visibility <- if p <= 0.001 then "hidden" else "visible" |}

        /// Free text. size: title | big | text | small | mono | label.
        member _.text(html, o) =
            let o = opts o
            let el = mk (host o) "div" $"""k-{jsOr o.size "text"}""" html null
            place el o
            let at, until, toneAt = TAt o.at, TUntil o.until, T0 o.toneAt
            add
                {| el = el
                   render =
                    fun t ->
                        show el (vis' t at until) (defaultArg o.rise 16.0) ""
                        el.style.color <- if isOn o.tone toneAt t then tone o.tone else "" |}

        /// The module's heading, top left: K.heading("Title", { sub: "muted note", at, subAt, until }).
        member _.heading(text, o) =
            let o = opts o
            let sub = if truthy o.sub then $"""<span class="k-sub">{o.sub}</span>""" else ""
            let el = mk (host o) "div" "k-heading" $"{jsStr text}{sub}" null
            place el (withDefaults {| x = 60; y = 130 |} o)
            let at, until, subAt = TAt o.at, TUntil o.until, T0 o.subAt
            let sub = el.querySelector ".k-sub" :?> HTMLElement
            add
                {| el = el
                   render =
                    fun t ->
                        show el (vis' t at until) 16.0 ""
                        if not (isNull sub) then
                            sub.style?opacity <- if isNil subAt then 1.0 else progIO t (subAt - 0.1) 0.4 |}

        /// Lines that arrive with the words. items: string or { html, at, note, noteAt, tone, toneAt, strikeAt,
        /// bullet, mono }. Options: x, y, w, gap, dim (earlier lines fade to 55% as new ones arrive), until.
        member _.lines(items, o) =
            let o = opts o
            let box = mk (host o) "div" "k-lines" null null
            place box o
            box.style.gap <- $"{defaultArg o.gap 18.0}px"
            let rows =
                items
                |> Array.map (fun it ->
                    let d: LineItem = if jsTypeof it = "string" then !!(createObj [ "html" ==> it ]) else !!it
                    let line = mk box "div" (if truthy d.mono then "k-line k-mono-line" else "k-line") null null
                    let bullet = if truthy d.bullet then $"""<span class="k-bullet">{d.bullet}</span>""" else ""
                    let body = mk line "span" "k-rel" $"{bullet}{jsStr d.html}" null
                    let strike = if not (isNil d.strikeAt) then mk body "span" "k-strike" null null else null
                    let note = if truthy d.note then mk line "span" "k-note" d.note null else null
                    if truthy o.size then
                        line.style.fontSize <-
                            jsOr (get<string> (createObj [ "big" ==> "64px"; "text" ==> "48px"; "small" ==> "44px" ]) o.size) o.size
                    let at = TAt(ifNil d.at o.at)
                    let noteAt = T0 d.noteAt
                    let toneAt = T0 d.toneAt
                    let strikeAt = T0 d.strikeAt
                    let until = TUntil(ifNil d.until o.until)
                    {| d = d; line = line; body = body; note = note; strike = strike; at = at; noteAt = noteAt; toneAt = toneAt
                       strikeAt = strikeAt; until = until |})
            add
                {| el = box
                   render =
                    fun t ->
                        rows
                        |> Array.iteri (fun i r ->
                            show r.line (vis' t r.at r.until) 14.0 ""
                            if truthy o.dim then
                                let next = item rows (i + 1)
                                let dimP = if truthy next && not (isNil next.at) then progIO t next.at 0.4 else 0.0
                                r.line.style?opacity <- toNumber r.line.style.opacity * lerp 1.0 0.55 dimP
                            if not (isNull r.note) then
                                r.note.style?opacity <- if isNil r.noteAt then 1.0 else progIO t (r.noteAt - 0.1) 0.4
                            r.body.style.color <- if isOn r.d.tone r.toneAt t then tone r.d.tone else ""
                            if not (isNull r.strike) then
                                r.strike.style.transform <- $"scaleX({progIO t r.strikeAt 0.4})") |}

        /// A row of chips: items { text, at, tone, toneAt, until }. Options: x, y, w (wraps), gap, until.
        member _.chips(items, o) =
            let o = opts o
            let box = mk (host o) "div" "k-chips" null null
            place box o
            o.gap |> Option.iter (fun g -> box.style.gap <- $"{g}px")
            let cs =
                items
                |> Array.map (fun it ->
                    let d: ChipItem = if jsTypeof it = "string" then !!(createObj [ "text" ==> it ]) else !!it
                    let el = mk box "div" "chip" (esc d.text) null
                    let at = TAt(ifNil d.at o.at)
                    let toneAt = T0 d.toneAt
                    {| d = d; el = el; at = at; toneAt = toneAt; until = TUntil(ifNil d.until o.until) |})
            add
                {| el = box
                   render =
                    fun t ->
                        for c in cs do
                            show c.el (vis' t c.at c.until) 10.0 ""
                            c.el.className <- if isOn c.d.tone c.toneAt t then "chip " + c.d.tone else "chip" |}

        /// A table: { cols: ["Pressure", "Move", "Price"], widths: [1, 1, 1], rows: [{ cells, at, tone, toneAt }],
        /// headerAt, focus } . focus highlights the newest row while it is being spoken.
        /// A cell is a string (appears with its row) or { html | text, at, until, tone, toneAt }: such a cell waits
        /// for its own `at` inside its row, so a number is not on screen before it is spoken.
        member _.table o =
            let o = opts o
            let box = mk (host o) "div" "k-table" null null
            place box o
            box.style.gridTemplateColumns <-
                jsOr o.widths (o.cols |> Array.map (fun _ -> 1.0)) |> Array.map (fun f -> $"{f}fr") |> String.concat " "
            let heads = o.cols |> Array.map (fun c -> mk box "div" "k-th" c null)
            let rows =
                o.rows
                |> Array.map (fun r ->
                    let at, toneAt, until = T0 r.at, T0 r.toneAt, T0 r.until
                    let cells =
                        r.cells
                        |> Array.map (fun c ->
                            // A string cell is drawn and timed exactly as before; an object cell brings its own times.
                            if jsTypeof c = "string" || isNil c then
                                {| el = mk box "div" "k-td" c null; own = false; d = unbox<TableCell> null; at = noTime
                                   until = noTime; toneAt = noTime |}
                            else
                                let d = unbox<TableCell> c
                                let html: obj = if isNil d.html then (esc (ifNil d.text ("" :> obj)) :> obj) else d.html
                                {| el = mk box "div" "k-td" html null; own = true; d = d; at = T0 d.at; until = T0 d.until
                                   toneAt = T0 d.toneAt |})
                    {| r = r; at = at; toneAt = toneAt; until = until; cells = cells |})
            let at, until, headerAt = T0 o.at, TUntil o.until, T0(ifNil o.headerAt o.at)
            add
                {| el = box
                   render =
                    fun t ->
                        // The card appears at `at`, else with its header (`headerAt`), else with its first row.
                        show box (vis' t (ifNil at (ifNil headerAt (firstAt rows (fun r -> r.at)))) until) 16.0 ""
                        for h in heads do
                            h.style?opacity <- if isNil headerAt then 1.0 else progIO t (headerAt - 0.1) 0.4
                        rows
                        |> Array.iteri (fun i row ->
                            let p = vis' t row.at row.until
                            let next = item rows (i + 1)
                            let current =
                                truthy o.focus && not (isNil row.at) && t >= row.at
                                && (not (truthy next) || isNil next.at || t < next.at)
                            row.cells
                            |> Array.iteri (fun k cell ->
                                let c = cell.el
                                // A cell with its own times is seen only while both its row and it are on.
                                c.style?opacity <- if cell.own then p * vis' t cell.at cell.until else p
                                c.style.color <-
                                    if cell.own && isOn cell.d.tone cell.toneAt t then tone cell.d.tone
                                    elif isOn row.r.tone row.toneAt t then tone row.r.tone
                                    else ""
                                c.style.fontWeight <- if k = 0 && current then "650" else ""
                                c.style.background <- if current then "color-mix(in srgb, var(--accent) 10%, transparent)" else "")) |}

        /// Horizontal bars on one scale: { max, line: { value, label }, labelW, rows: [{ label, sub, value, at,
        /// steps: [{ value, at }], tone, toneAt, format }] }. A bar grows to value at `at`, then moves to each
        /// step's value at its time; its number counts along. line draws a dashed capacity marker.
        member _.bars o =
            let o = opts o
            let w = defaultArg o.w 1760.0
            let box =
                mk (host o) "div" "k-bars k-abs" null $"left:{defaultArg o.x 60.0}px;top:{defaultArg o.y 250.0}px;width:{w}px"
            let labelH, barGap, trackX = 62.0, defaultArg o.gap 150.0, 0.0
            let trackW = w - defaultArg o.valueW 260.0
            let scale v = (v / o.max) * trackW
            let at, until = T0 o.at, TUntil o.until
            let lineLabel =
                if truthy o.line && truthy o.line.label then mk box "div" "k-bar-sub k-abs" o.line.label null else null
            let rows =
                o.rows
                |> Array.mapi (fun i r ->
                    let top = float i * barGap
                    let sub = if truthy r.sub then $"""<span class="k-bar-sub">{r.sub}</span>""" else ""
                    let label = mk box "div" "k-bar-label k-abs" $"{r.label}{sub}" $"left:0;top:{top}px"
                    let track = mk box "div" "k-bar-track" null $"left:{trackX}px;top:{top + labelH + 8.0}px;width:{trackW}px"
                    let fill = mk box "div" "k-bar-fill" null $"left:{trackX}px;top:{top + labelH + 8.0}px;width:{trackW}px"
                    let value = mk box "div" "k-bar-value" "" $"top:{top + labelH - 8.0}px"
                    // The capacity marker is a short dashed tick across each bar, clear of the labels.
                    let tick =
                        if truthy o.line then
                            mk box "div" "k-bar-line" null $"left:{trackX + scale o.line.value - 2.0}px;top:{top + labelH - 4.0}px;height:62px"
                        else null
                    let steps =
                        Array.append
                            [| {| value = r.value; at = T0 r.at |} |]
                            (jsOr r.steps [||] |> Array.map (fun s -> {| value = s.value; at = T0 s.at |}))
                    let at = T0 r.at
                    let toneAt = T0 r.toneAt
                    let until = TUntil(ifNil r.until o.until)
                    {| r = r; label = label; track = track; fill = fill; value = value; tick = tick; steps = steps
                       at = at; toneAt = toneAt; until = until |})
            if not (isNull lineLabel) then
                lineLabel.style.cssText <- lineLabel.style.cssText + $";left:{trackX + scale o.line.value - 20.0}px;top:-56px;margin:0"
            let fmt (r: BarRow) (v: float) : obj = if truthy r.format then r.format v else ($"{round v}" :> obj)
            add
                {| el = box
                   render =
                    fun t ->
                        box.style?opacity <- vis' t (ifNil at (firstAt rows (fun r -> r.at))) until
                        if not (isNull lineLabel) then
                            lineLabel.style?opacity <-
                                if rows.Length > 0 && not (isNil rows.[0].at) then progIO t (rows.[0].at - 0.2) 0.4 else 1.0
                        for row in rows do
                            let p = vis' t row.at row.until
                            for e in [| row.label; row.track; row.fill; row.value; row.tick |] do
                                if not (isNull e) then e.style?opacity <- p
                            let mutable v = 0.0
                            row.steps
                            |> Array.iteri (fun k s ->
                                let from = if k = 0 then 0.0 else row.steps.[k - 1].value
                                if not (isNil s.at) && t >= s.at then v <- lerp from s.value (prog t s.at 0.8 ease.out))
                            row.fill.style.transform <- $"scaleX({clamp (scale v / jsOr trackW 1.0) 0.0 10.0})"
                            row.fill.style.width <- $"{trackW}px"
                            let on = isOn row.r.tone row.toneAt t
                            row.fill.style.background <- if on then tone row.r.tone else "var(--accent)"
                            row.value.style.left <- $"{trackX + scale v + 22.0}px"
                            row.value?textContent <- fmt row.r v
                            row.value.style.color <- if on then tone row.r.tone else "" |}

        /// A stacked timeline, one row: { total, w, segments: [{ label, value, at, tone }], sum: { text, at } }.
        /// Segment widths are proportional to value/total; each appears at its time.
        member _.timeline o =
            let o = opts o
            let w = defaultArg o.w 1500.0
            let box =
                mk (host o) "div" "k-abs" null $"left:{defaultArg o.x 60.0}px;top:{defaultArg o.y 400.0}px;width:{w}px;height:120px"
            let at, until = T0 o.at, TUntil o.until
            let mutable x = 0.0
            let segs =
                o.segments
                |> Array.map (fun s ->
                    let sw = (s.value / o.total) * w
                    let label = if truthy s.label then $"""<div class="k-seg-label">{s.label}</div>""" else ""
                    let el =
                        mk box "div" "k-seg" $"""{label}<div class="k-seg-value">{jsStr (ifNil s.show (s.value :> obj))}</div>""" $"left:{x}px;width:{Math.Max(sw - 4.0, 8.0)}px"
                    x <- x + sw
                    let at = T0 s.at
                    {| s = s; el = el; at = at; toneAt = T0 s.toneAt |})
            let sum = if truthy o.sum then mk box "div" "k-big k-abs" o.sum.text $"left:{x + 30.0}px;top:20px;white-space:nowrap" else null
            let sumAt = if truthy o.sum then T0 o.sum.at else noTime
            add
                {| el = box
                   render =
                    fun t ->
                        box.style?opacity <- vis' t (ifNil at (firstAt segs (fun g -> g.at))) until
                        for g in segs do
                            let p = vis t g.at noTime 0.3
                            g.el.style?opacity <- p
                            g.el.style.transform <- $"scaleX({lerp 0.6 1.0 p})"
                            g.el.style.transformOrigin <- "0 50%"
                            let on = isOn g.s.tone g.toneAt t
                            g.el.style.borderColor <- if on then tone g.s.tone else ""
                            g.el.style.background <- if on then $"color-mix(in srgb, {tone g.s.tone} 16%%, var(--card))" else ""
                        if not (isNull sum) then show sum (vis' t sumAt noTime) 10.0 "" |}

        /// Boxes, arrows and moving packets: { nodes: { id: { label, sub, x, y, at, tone, toneAt, dimAt, until } },
        /// edges: [{ from, to, at, label, dashed, tone, toneAt, until, arrow }], packets: [{ from, to, at, dur, label,
        /// tone, fadeAt (0..1 of the trip, where it fades: a lost reply), until }] }.
        /// Edges run between the nearest sides of two boxes, with an arrowhead at `to` (arrow: "end" default, "both",
        /// "none"); packets travel centre to centre.
        /// `fromPos` / `toPos` (edges and packets) move an end along the side it meets: 0..1, left to right on a top or
        /// bottom side, top to bottom on a left or right side; left out = 0.5, the side's centre.
        member _.flow o =
            let o = opts o
            let LANE = 40.0
            let layer = mk (host o) "div" "k-abs" null "left:0;top:0;width:1920px;height:1080px"
            let svg = createSvg "svg"
            svg.setAttribute ("class", "layer")
            svg.setAttribute ("width", "1920")
            svg.setAttribute ("height", "1080")
            layer?append (svg)
            let layerAt, layerUntil = TAt o.at, TUntil o.until
            // When a node or edge leaves. With its own `until`, then. Without one it leaves with the layer and has no
            // fade of its own: giving it the scene's end as well, which the layer already has, multiplied two fades
            // (p * p), and a diagram left faster than the text beside it. Only in a flow that outlives its scene (an
            // `until` of its own, later than the scene's end) does such a part still leave at the scene's end.
            let partUntil (spec: Spec) : Time =
                if not (isNil spec) then T0 spec
                else
                    match sceneCtx.Value with
                    | Some c when isNil layerUntil || layerUntil > c.until -> c.until
                    | _ -> noTime
            let nodes = table ()
            for (id, n: FlowNode) in entries (jsOr o.nodes (createEmpty)) do
                let icon = if truthy n.icon then $"""<span class="k-node-icon">{n.icon}</span>""" else ""
                let sub = if truthy n.sub then $"""<span class="k-node-sub">{n.sub}</span>""" else ""
                let el = mk layer "div" "k-node" $"{icon}{n.label}{sub}" $"left:{n.x}px;top:{n.y}px"
                if truthy n.w then el.style.width <- $"{n.w}px"
                let at = T0 n.at
                let toneAt = T0 n.toneAt
                let dimAt = T0 n.dimAt
                put nodes id {| n = n; el = el; at = at; toneAt = toneAt; dimAt = dimAt; until = partUntil n.until |}
            let box (id: string) : Box =
                let e: HTMLElement = (get<obj> nodes id)?el
                { x = e.offsetLeft; y = e.offsetTop; w = e.offsetWidth; h = e.offsetHeight }
            let edges =
                jsOr o.edges [||]
                |> Array.map (fun e ->
                    let path = createSvg "path"
                    svg?append (path)
                    let label = if truthy e.label then mk layer "div" "k-edge-label" e.label null else null
                    let ends =
                        match defaultArg e.arrow "end" with
                        | "both" -> [| "start"; "end" |]
                        | "end" -> [| "end" |]
                        | _ -> [||]
                    let heads =
                        ends
                        |> Array.map (fun en ->
                            let el = createSvg "polygon"
                            svg?append (el)
                            { ``end`` = en; el = el })
                    let at = T0 e.at
                    let toneAt = T0 e.toneAt
                    { e = e; path = path; label = label; heads = heads; at = at; toneAt = toneAt; until = partUntil e.until
                      lane = 0.0; len = 0.0 })
            let packets =
                jsOr o.packets [||]
                |> Array.map (fun p ->
                    let el = mk layer "div" $"""chip {jsOr p.tone "accent"} k-packet""" (esc (jsOr p.label "")) null
                    let at = T0 p.at
                    {| p = p; el = el; at = at; dur = defaultArg p.dur 1.0; until = TUntil p.until |})
            let mutable laidOut = false
            let layout () =
                // Box sizes are only known once the fonts are in, so edges are routed on the first render.
                // Edges joining the same two boxes (either way round, e.g. data one way and demand back) get side-by-side
                // lanes LANE px apart, on a fixed screen axis so opposite directions separate the same way every time.
                let pairs = table ()
                for ed in edges do
                    let key = pairKey ed.e.from ed.e.``to``
                    if isNil (get<obj> pairs key) then put pairs key (ResizeArray<EdgeState>())
                    (get<ResizeArray<EdgeState>> pairs key).Add ed
                for group: ResizeArray<EdgeState> in values pairs do
                    group |> Seq.iteri (fun k ed -> ed.lane <- (float k - float (group.Count - 1) / 2.0) * LANE)
                for ed in edges do
                    let r = route (box ed.e.from) (box ed.e.``to``) ed.lane ed.e.fromPos ed.e.toPos (ed.heads |> Array.map (fun hd -> hd.``end``))
                    for hd in ed.heads do
                        hd.el.setAttribute ("points", r.heads |> Array.find (fun (en, _) -> en = hd.``end``) |> snd)
                    ed.path.setAttribute ("d", r.d)
                    ed.path?style?fill <- "none"
                    ed.path?style?strokeWidth <- "5"
                    ed.path?style?strokeLinecap <- "round"
                    if truthy ed.e.dashed then ed.path?style?strokeDasharray <- "14 12"
                    if not (isNull ed.label) then
                        ed.label.style.left <- $"{r.label.x}px"
                        ed.label.style.top <- $"{r.label.y}px"
                        ed.label.style.transform <- r.labelTransform
                    ed.len <- ed.path?getTotalLength ()
                laidOut <- true
            add
                {| el = layer
                   render =
                    fun t ->
                        if not laidOut then layout ()
                        layer.style?opacity <- vis' t layerAt layerUntil
                        for nd in values nodes do
                            let nd: {| n: FlowNode; el: HTMLElement; at: Time; toneAt: Time; dimAt: Time; until: Time |} = nd
                            let p = vis' t nd.at nd.until
                            show nd.el p (defaultArg nd.n.rise 12.0) ""
                            let on = isOn nd.n.tone nd.toneAt t
                            nd.el.style.borderColor <- if on then tone nd.n.tone else ""
                            nd.el.style.color <- if on && not (truthy nd.n.fill) then tone nd.n.tone else ""
                            nd.el.style.background <-
                                if on && truthy nd.n.fill then $"color-mix(in srgb, {tone nd.n.tone} 24%%, var(--card))" else ""
                            if not (isNil nd.dimAt) then nd.el.style?opacity <- p * lerp 1.0 0.35 (progIO t nd.dimAt 0.4)
                        for ed in edges do
                            let p = vis' t ed.at ed.until
                            let drawn = if isNil ed.at then 1.0 else progIO t ed.at 0.5
                            ed.path?style?opacity <- p
                            if not (truthy ed.e.dashed) then
                                ed.path?style?strokeDasharray <- $"{ed.len}"
                                ed.path?style?strokeDashoffset <- $"{ed.len * (1.0 - drawn)}"
                            let on = isOn ed.e.tone ed.toneAt t
                            ed.path?style?stroke <- if on then tone ed.e.tone else "var(--faint)"
                            // A head appears once the line has been drawn to it (the start head with the line's first stroke).
                            for hd in ed.heads do
                                hd.el?style?fill <- ed.path?style?stroke
                                hd.el?style?opacity <-
                                    p * (if hd.``end`` = "start" then clamp01 (drawn * 8.0) else clamp01 ((drawn - 0.85) / 0.15))
                            if not (isNull ed.label) then
                                ed.label.style?opacity <- p
                                ed.label.style.color <- if on then tone ed.e.tone else ""
                        for pk in packets do
                            // A packet travels between the facing edges of its two boxes, never over their labels.
                            let A, B = box pk.p.from, box pk.p.``to``
                            let ca, cb = centre A, centre B
                            let w, h, gap = pk.el.offsetWidth, pk.el.offsetHeight, 14.0
                            let horiz = abs (cb.x - ca.x) * (A.h + B.h) >= abs (cb.y - ca.y) * (A.w + B.w)
                            let a, b =
                                if horiz then
                                    let right = cb.x >= ca.x
                                    { x = (if right then A.x + A.w + gap + w / 2.0 else A.x - gap - w / 2.0)
                                      y = along A.y A.h ca.y pk.p.fromPos },
                                    { x = (if right then B.x - gap - w / 2.0 else B.x + B.w + gap + w / 2.0)
                                      y = along B.y B.h cb.y pk.p.toPos }
                                else
                                    let down = cb.y >= ca.y
                                    { x = along A.x A.w ca.x pk.p.fromPos
                                      y = (if down then A.y + A.h + gap + h / 2.0 else A.y - gap - h / 2.0) },
                                    { x = along B.x B.w cb.x pk.p.toPos
                                      y = (if down then B.y - gap - h / 2.0 else B.y + B.h + gap + h / 2.0) }
                            let f = prog t pk.at pk.dur ease.inOut
                            let moving =
                                not (isNil pk.at) && t >= pk.at && t < pk.at + pk.dur + 0.05 && (isNil pk.until || t < pk.until)
                            let fadeAt = defaultArg pk.p.fadeAt 1.0
                            let fade = if f > fadeAt then 1.0 - clamp01 ((f - fadeAt) / (1.0 - fadeAt + 1e-6)) else 1.0
                            show pk.el (if moving then fade else 0.0) 0.0
                                $"translate({lerp a.x b.x f - w / 2.0}px, {lerp a.y b.y f - h / 2.0 + defaultArg pk.p.lift 0.0}px)" |}

        /// A sequence diagram: { actors: [{ id, label, icon, tone, fill, toneAt, at }], messages: [{ from, to, label, at,
        /// reply, tone, toneAt }], x, y, w, gap, dim }. Actors stand in a row across `w`, each over a dashed lifeline;
        /// messages are rows below them, top to bottom in array order, each an arrow drawn from `from`'s lifeline to
        /// `to`'s on its `at`, with its label above. `reply: true` dashes the arrow and mutes its label; `from` = `to`
        /// is a call to self, drawn as a loop beside the lifeline. `dim` fades a message as the next one arrives.
        /// Everything is placed from the options alone (an actor box is always 96 px tall), so a diagram that would
        /// run below the safe area, a message that names no actor, and a message timed before the one above it all
        /// fail the module's build.
        member _.sequence o =
            let o = opts o
            let BOX_H, LABEL_ROOM, LOOP_W, LOOP_H, SAFE_BOTTOM = 96.0, 70.0, 90.0, 56.0, 1000.0
            let x0, y0, w, gap = defaultArg o.x 60.0, defaultArg o.y 240.0, defaultArg o.w 1800.0, defaultArg o.gap 112.0
            let actorOpts, messageOpts = jsOr o.actors [||], jsOr o.messages [||]
            if actorOpts.Length = 0 then fail "sequence: no actors"
            let layer = mk (host o) "div" "k-abs" null "left:0;top:0;width:1920px;height:1080px"
            let svg = createSvg "svg"
            svg.setAttribute ("class", "layer")
            svg.setAttribute ("width", "1920")
            svg.setAttribute ("height", "1080")
            layer?append (svg)
            let layerAt, layerUntil = TAt o.at, TUntil o.until
            // Where each actor's lifeline is: the centre of its share of the width.
            let columns = table ()
            actorOpts |> Array.iteri (fun i a -> put columns a.id (x0 + w * (float i + 0.5) / float actorOpts.Length))
            let column (id: string) : float =
                let cx = get<float> columns id
                if isNil cx then
                    let known = actorOpts |> Array.map (fun a -> a.id) |> String.concat ", "
                    fail $"sequence: a message names actor {stringify id}, which is not one of: {known}"
                cx
            let lastActor = (item actorOpts (actorOpts.Length - 1)).id
            // Rows, top to bottom, each `gap` tall. A message's `y` is its arrow; a call to self is a loop from `y`
            // down to `bottom`, in the room another row gives its label.
            let mutable cursor = y0 + BOX_H + 10.0
            let mutable latest = noTime
            let messages =
                messageOpts
                |> Array.mapi (fun i m ->
                    let a, b = column m.from, column m.``to``
                    let self = m.from = m.``to``
                    let bottom = cursor + LABEL_ROOM
                    let y = if self then bottom - LOOP_H else bottom
                    cursor <- bottom + gap - LABEL_ROOM
                    let at = T0 m.at
                    if not (isNil at) then
                        if not (isNil latest) && at < latest then
                            fail $"sequence: message {i} ({stringify m.label}) is timed before the message above it; time runs down the diagram, so list messages in the order they are spoken"
                        latest <- at
                    let path = createSvg "path"
                    svg?append (path)
                    path?style?fill <- "none"
                    path?style?strokeWidth <- "5"
                    path?style?strokeLinecap <- "round"
                    path?style?strokeLinejoin <- "round"
                    if truthy m.reply then path?style?strokeDasharray <- "14 12"
                    let head = createSvg "polygon"
                    svg?append (head)
                    let label =
                        if truthy m.label then
                            mk layer "div" (if truthy m.reply then "k-edge-label k-seq-label k-seq-reply" else "k-edge-label k-seq-label") m.label null
                        else null
                    // A loop opens to the right of its lifeline, or to the left under the last actor, where the right
                    // has no room for the label.
                    let side = if self && m.from = lastActor && actorOpts.Length > 1 then -1.0 else 1.0
                    let len = LOOP_W + LOOP_H + LOOP_W - HEAD_L
                    if self then
                        path.setAttribute ("d", $"M{a},{y} H{a + side * LOOP_W} V{bottom} H{a + side * HEAD_L}")
                        head.setAttribute ("points", $"{a},{bottom} {a + side * HEAD_L},{bottom - HEAD_W / 2.0} {a + side * HEAD_L},{bottom + HEAD_W / 2.0}")
                    if not (isNull label) then
                        if self then
                            label.style.left <- $"{a + side * (LOOP_W + 18.0)}px"
                            label.style.top <- $"{(y + bottom) / 2.0}px"
                            label.style.transform <- if side > 0.0 then "translate(0, -50%)" else "translate(-100%, -50%)"
                        else
                            label.style.left <- $"{(a + b) / 2.0}px"
                            label.style.top <- $"{y}px"
                            label.style.transform <- "translate(-50%, calc(-100% - 10px))"
                    {| m = m; a = a; b = b; y = y; self = self; len = len; path = path; head = head; label = label; at = at
                       toneAt = T0 m.toneAt |})
            let lifeEnd = if messages.Length > 0 then cursor - (gap - LABEL_ROOM) + 24.0 else y0 + BOX_H + 160.0
            if lifeEnd > SAFE_BOTTOM then
                fail $"sequence: {messages.Length} messages end at y {round lifeEnd}, below the safe area ({SAFE_BOTTOM}): split the exchange across two scenes (about 6 messages fit), or pass a smaller y or gap"
            let actors =
                actorOpts
                |> Array.map (fun a ->
                    let cx = column a.id
                    let line = createSvg "line"
                    svg?append (line)
                    line.setAttribute ("x1", $"{cx}")
                    line.setAttribute ("x2", $"{cx}")
                    line.setAttribute ("y1", $"{y0 + BOX_H}")
                    line.setAttribute ("y2", $"{lifeEnd}")
                    line?style?stroke <- "var(--border)"
                    line?style?strokeWidth <- "4"
                    line?style?strokeDasharray <- "4 14"
                    let icon = if truthy a.icon then $"""<span class="k-node-icon">{a.icon}</span>""" else ""
                    let el = mk layer "div" "k-node k-actor" $"{icon}{a.label}" $"left:{cx}px;top:{y0}px"
                    {| a = a; el = el; line = line; at = T0 a.at; toneAt = T0 a.toneAt |})
            add
                {| el = layer
                   render =
                    fun t ->
                        layer.style?opacity <- vis' t layerAt layerUntil
                        for ac in actors do
                            let p = vis' t ac.at noTime
                            show ac.el p 12.0 "translateX(-50%)"
                            ac.line?style?opacity <- p
                            let on = isOn ac.a.tone ac.toneAt t
                            ac.el.style.borderColor <- if on then tone ac.a.tone else ""
                            ac.el.style.color <- if on && not (truthy ac.a.fill) then tone ac.a.tone else ""
                            ac.el.style.background <-
                                if on && truthy ac.a.fill then $"color-mix(in srgb, {tone ac.a.tone} 24%%, var(--card))" else ""
                        messages
                        |> Array.iteri (fun i ms ->
                            let next = item messages (i + 1)
                            let dimP = if truthy o.dim && truthy next && not (isNil next.at) then progIO t next.at 0.4 else 0.0
                            let p = vis' t ms.at noTime * lerp 1.0 0.45 dimP
                            let drawn = if isNil ms.at then 1.0 else progIO t ms.at 0.5
                            let on = isOn ms.m.tone ms.toneAt t
                            let stroke = if on then tone ms.m.tone else if truthy ms.m.reply then "var(--faint)" else "var(--muted)"
                            ms.path?style?opacity <- p
                            ms.path?style?stroke <- stroke
                            ms.head?style?fill <- stroke
                            if ms.self then
                                // The loop is revealed along its length; its head arrives with the last of it.
                                if not (truthy ms.m.reply) then
                                    ms.path?style?strokeDasharray <- $"{ms.len}"
                                    ms.path?style?strokeDashoffset <- $"{ms.len * (1.0 - drawn)}"
                                ms.head?style?opacity <- p * clamp01 ((drawn - 0.85) / 0.15)
                            else
                                // The arrow grows from the caller's lifeline, its head leading, so a dashed reply
                                // is drawn the same way as a call.
                                let dir = sign (ms.b - ms.a)
                                let tip = lerp ms.a ms.b drawn
                                let back = tip - dir * HEAD_L
                                let lineEnd = if dir > 0.0 then Math.Max(ms.a, back) else Math.Min(ms.a, back)
                                ms.path.setAttribute ("d", $"M{ms.a},{ms.y} L{lineEnd},{ms.y}")
                                ms.head.setAttribute ("points", $"{tip},{ms.y} {back},{ms.y - HEAD_W / 2.0} {back},{ms.y + HEAD_W / 2.0}")
                                ms.head?style?opacity <- p * clamp01 (drawn * 8.0)
                            if not (isNull ms.label) then
                                ms.label.style?opacity <- p
                                ms.label.style.color <- if on then tone ms.m.tone else "") |}

        /// A code card whose lines glow as they run: { title, lines: [...], glow: [{ line, from, until, tone }] }.
        /// `font` (px, default 44) shrinks the lines so verbatim tool output keeps its real indentation.
        /// `slide: 0` fades in without the 20 px rise: for a card that replaces an identical-looking one in place.
        member _.code o =
            let o = opts o
            let card = mk (host o) "div" "k-code" null null
            place card (withDefaults {| x = 60; y = 200 |} o)
            if truthy o.title then mk card "div" "k-code-title" o.title null |> ignore
            let lang = defaultArg o.lang "csharp"
            let ls = o.lines |> Array.map (fun l -> mk card "div" "k-cl" (highlight l lang) null)
            if truthy o.font then
                for l in ls do
                    l.style.fontSize <- $"{o.font}px"
                    let lh = $"{round (o.font * 60.0 / 44.0)}px"
                    l.style.height <- lh
                    l.style.lineHeight <- lh
            let glows =
                jsOr o.glow [||]
                |> Array.map (fun g ->
                    let from = T0 g.from
                    {| g = g; from = from; until = TUntil g.until |})
            let at, until = TAt o.at, TUntil o.until
            add
                {| el = card
                   render =
                    fun t ->
                        show card (vis' t at until) (defaultArg o.slide 20.0) ""
                        ls
                        |> Array.iteri (fun i l ->
                            let mutable p = 0.0
                            let mutable colour = "var(--accent)"
                            for gl in glows do
                                if gl.g.line = i then
                                    let q = within t gl.from (ifNil gl.until infinity) 0.25
                                    if q > p then
                                        p <- q
                                        colour <- jsOr (tone gl.g.tone) colour
                            l.style.background <-
                                if p > 0.0 then $"color-mix(in srgb, {colour} {round (p * 22.0)}%%, transparent)" else "") |}

        /// A whiteboard of worked lines, typed as they are said: { title, rows: [{ label, text, at, dur, result,
        /// resultAt }] }. `text` types across dur seconds (default 1.2); `result` appears under it at resultAt.
        member _.board o =
            let o = opts o
            let card = mk (host o) "div" "k-board" null null
            place card (withDefaults {| x = 60; y = 200; w = 1800 |} o)
            if truthy o.title then mk card "div" "k-board-title" o.title null |> ignore
            let rows =
                o.rows
                |> Array.map (fun r ->
                    let row = mk card "div" "k-br" null null
                    let label = mk row "div" "k-br-label" (jsOr r.label "") null
                    let text = mk row "div" "k-br-text" "" null
                    let result = if truthy r.result then mk row "div" "k-br-result" (esc r.result) null else null
                    let at = T0 r.at
                    let resultAt = T0 r.resultAt
                    {| r = r; row = row; label = label; text = text; result = result; at = at; resultAt = resultAt; dimAt = T0 r.dimAt |})
            let at = T0(ifNil o.at (if o.rows.Length > 0 then o.rows.[0].at else null))
            let until = TUntil o.until
            add
                {| el = card
                   render =
                    fun t ->
                        show card (vis' t at until) 16.0 ""
                        for r in rows do
                            let p = if isNil r.at then 1.0 else progIO t (r.at - 0.1) 0.3
                            r.label.style?opacity <- p
                            r.text.textContent <- typed r.r.text (if isNil r.at then 1.0 else prog t r.at (defaultArg r.r.dur 1.2) ease.linear)
                            if not (isNull r.result) then
                                r.result.style?opacity <- if isNil r.resultAt then p else progIO t (r.resultAt - 0.1) 0.4
                            r.row.style?opacity <- if isNil r.dimAt then 1.0 else lerp 1.0 0.45 (progIO t r.dimAt 0.4) |}

        /// Numbered steps across the top: K.steps(["Find", "Move", "Price"], { ats: [t1, t2, t3] }).
        member _.steps(labels, o) =
            let o = opts o
            let box = mk (host o) "div" "k-steps" null null
            place box (withDefaults {| x = 60; y = 140 |} o)
            let els = labels |> Array.mapi (fun i l -> mk box "div" "k-step" $"<b>{i + 1}</b>{jsStr l}" null)
            // Kept as obj: an array of floats would become a Float64Array, which turns a missing time (null) into 0.
            let ats: obj[] = jsOr o.ats [||] |> Array.map (fun spec -> T0 spec :> obj)
            let atOf i : Time = unbox (item ats i)
            let at = T0(ifNil o.at (item ats 0))
            let until = TUntil o.until
            add
                {| el = box
                   render =
                    fun t ->
                        show box (vis' t at until) 12.0 ""
                        els
                        |> Array.iteri (fun i e ->
                            let ai = atOf i
                            let reached = not (isNil ai) && t >= ai
                            let next = atOf (i + 1)
                            let current = reached && (i = els.Length - 1 || isNil next || t < next)
                            e.style.borderColor <- if current then "var(--accent)" else ""
                            e.style.background <- if current then "var(--accent-dim)" else ""
                            e.style.color <- if reached then "var(--ink)" else ""
                            e.style?opacity <- if reached then 1.0 else 0.55) |}

        /// A number that counts up: { from, to, at, dur, format: (v) => string, tone, toneAt }.
        member _.counter o =
            let o = opts o
            let el = mk (host o) "div" $"""k-{jsOr o.size "counter"}""" null null
            place el o
            let at, until, toneAt = TAt o.at, TUntil o.until, T0 o.toneAt
            let fmt: float -> obj = if truthy o.format then o.format else fun v -> box (toLocale (round v))
            add
                {| el = el
                   render =
                    fun t ->
                        show el (vis' t at until) 10.0 ""
                        el?textContent <- fmt (lerp (defaultArg o.from 0.0) o.``to`` (prog t at (defaultArg o.dur 1.2) ease.inOut))
                        el.style.color <- if isOn o.tone toneAt t then tone o.tone else "" |}

        /// A pop-up badge on a flagged moment: K.toast("tricky", { at: "g1-x|the tricky part", text?, x, y }).
        /// Default place is the top-right of the content area; it leaves after `dur` s (3.2) or at `until`.
        member _.toast(kind, o) =
            let o = opts o
            let tt = toastEl (host o) (box kind) o.text
            tt.el.style.right <- $"{defaultArg o.right 60.0}px"
            o.x
            |> Option.iter (fun x ->
                tt.el.style.left <- $"{x}px"
                tt.el.style.right <- "")
            tt.el.style.top <- $"{defaultArg o.y 130.0}px"
            let at, until = TAt o.at, TUntil o.until
            add {| el = tt.el; render = fun t -> tt.draw t at (Math.Min(ifNil until infinity, at + defaultArg o.dur TOAST_DUR)) |}

        /// Anything else: K.custom(el => ..., t => ...) keeps a hand-made piece in the same render pass.
        member _.custom(build, render) =
            let el = build.Invoke root
            add {| el = el; render = fun t -> render.Invoke(t, el) |}

        member _.render t =
            for i in 0 .. parts.Count - 1 do
                parts.[i].render t }

// ── The long-video frame's layers ────────────────────────────────────────────────────────────────────────

/// The frame's breathing room for a long video: a "pause and think" countdown during every [think]
/// silence (top right, where toasts go), and each scene's "recap" as a full "So far" card, one line
/// arriving with each sentence, held through the scene's quiet end.
let frameBreaks (root: HTMLElement) : FrameLayer =
    let items = ResizeArray<float -> unit>()
    for s in timing.scenes do
        for b in jsOr s.breaks [||] do
            if b.kind = "think" then
                let tt = toastEl root (box "question") "Pause and think"
                tt.el.style.right <- "60px"
                tt.el.style.top <- "14px"
                let svg = createSvg "svg"
                svg.setAttribute ("viewBox", "0 0 64 64")
                svg.classList.add "k-ring"
                svg.innerHTML <-
                    """<circle cx="32" cy="32" r="26" stroke="var(--border)"/><circle cx="32" cy="32" r="26" stroke="var(--accent)" transform="rotate(-90 32 32)" stroke-dasharray="163.4" stroke-linecap="round"/>"""
                tt.el?append (svg)
                let arc: Element = svg?lastChild
                items.Add(fun t ->
                    tt.draw t (b.start - 0.1) (b.``end`` + 0.3)
                    arc.setAttribute ("stroke-dashoffset", toFixed (163.4 * clamp01 ((t - b.start) / (b.``end`` - b.start))) 2))
        if truthy s.recap && truthy s.recap.Length then
            let card = mk root "div" "k-recap" null null
            let box = mk card "div" "k-recap-box" null null
            mk box "div" "k-recap-title" "So far" null |> ignore
            let sent = s.sentences
            let lines =
                s.recap
                |> Array.mapi (fun i text ->
                    let el = mk box "div" "k-recap-line" $"<b>✓</b>{esc text}" null
                    let cue = if sent.Length > 0 then sent.[Math.Min(i, sent.Length - 1)].start else s.start
                    {| el = el; at = cue - 0.15 |})
            let from = if sent.Length > 0 then sent.[0].start - 0.4 else s.start
            items.Add(fun t ->
                let v = within t from (s.``end`` - 0.05) 0.4
                show card v 0.0 $"scale({toFixed (lerp 0.97 1.0 v) 4})"
                for l in lines do
                    show l.el (progIO t l.at 0.35) 14.0 "")
    {| count = items.Count
       render =
        fun t ->
            for i in 0 .. items.Count - 1 do
                items.[i] t |}

/// The frame's toasts for a long video: every scene's "toasts" in the timing, in the band above the
/// content (top right). A toast leaves after its dur, or when the next one arrives.
let frameToasts (root: HTMLElement) : FrameLayer =
    let list =
        [| for s in timing.scenes do
               for d in jsOr s.toasts [||] do
                   let spec =
                       if isNil d.at then s.id
                       elif SENTENCE_REF.test d.at then s.id + d.at
                       else $"{s.id}|{d.at}"
                   {| d = d; at = time spec |} |]
        |> sortByAt
    let items =
        list
        |> Array.mapi (fun i x ->
            let tt = toastEl root (box x.d.kind) x.d.text
            tt.el.style.right <- "60px"
            tt.el.style.top <- "14px"
            let next = if i + 1 < list.Length then list.[i + 1].at - 0.1 else infinity
            {| tt = tt; at = x.at; until = Math.Min(next, x.at + defaultArg x.d.dur TOAST_DUR) |})
    {| count = items.Length
       render =
        fun t ->
            for x in items do
                x.tt.draw t x.at x.until |}

// ── window.Kit ───────────────────────────────────────────────────────────────────────────────────────────

/// Injects the kit's styles and returns window.Kit.
let install () : IKitApi =
    injectCss ()
    { new IKitApi with
        member _.TOASTS = TOASTS
        member _.frameToasts root = frameToasts root
        member _.frameBreaks root = frameBreaks root
        member _.kitFor root = kitFor root

        /// A long-video module: Kit.module("g1", (K) => { ...components... }).
        member _.``module``(key, fn) =
            let K: IKit option ref = ref None
            if isNil (globalGet<obj> "CH") then globalSet "CH" (createEmpty<obj>)
            put
                (globalGet<obj> "CH")
                key
                {| build =
                    fun (root: HTMLElement) ->
                        let k = kitFor root
                        K.Value <- Some k
                        fn k
                   render = fun (t: float) -> K.Value |> Option.iter (fun k -> k.render t) |}

        /// A one-off clip: Kit.clip((K) => { ... }) builds into #stage and starts Stage.play.
        member _.clip fn =
            let K = kitFor (document.getElementById "stage")
            fn K
            play (fun t -> K.render t) }
