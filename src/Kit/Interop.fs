/// JS semantics the kit relies on, spelled out once. Scene modules call the kit from plain JS, so its option
/// objects arrive with fields missing (undefined), null, 0 or "" and the kit must treat each exactly as the JS
/// original did:
///   - a field the original read with `??` or `!= null` is an F# `option` (Fable erases it to the raw value, and
///     `defaultArg` / `Option.isSome` test `!= null`, which is what `??` does);
///   - a field the original tested for truthiness (`o.sub ? ... : ""`) is a plain type read with `truthy`;
///   - a default parameter (`function f(a, b = 0.6)`) applies only when the argument is undefined: `orUndef`.
module Interop

open Fable.Core
open Fable.Core.JsInterop
open Browser.Types
open Browser

/// `throw new Error(msg)`: a real JS Error, as the original threw (Fable's failwith throws its own Exception
/// class, which is not an Error, so an uncaught one would reach the renderer as a different page error).
[<Emit("(() => { throw new Error($0); })()")>]
let fail (_msg: string) : 'a = jsNative

/// JS truthiness: false for undefined, null, false, 0, NaN and "".
[<Emit("!!($0)")>]
let truthy (_x: 'a) : bool = jsNative

/// `x == null` (null or undefined).
[<Emit("($0 == null)")>]
let isNil (_x: 'a) : bool = jsNative

/// A JS default parameter: `d` only when `x` is undefined (null stays null).
[<Emit("($0 === undefined ? $1 : $0)")>]
let orUndef (_x: 'a) (_d: 'a) : 'a = jsNative

/// `a ?? b`, for fields that are not typed as options.
[<Emit("($0 ?? $1)")>]
let ifNil (_a: 'a) (_b: 'a) : 'a = jsNative

/// `a || b`.
[<Emit("($0 || $1)")>]
let jsOr (_a: 'a) (_b: 'a) : 'a = jsNative

/// `String(x)`: how JS turns a value into text (template literals and style assignment do the same).
[<Emit("String($0)")>]
let jsStr (_x: obj) : string = jsNative

/// JS Math.round (half up), not .NET's banker's rounding.
[<Emit("Math.round($0)")>]
let round (_x: float) : float = jsNative

[<Emit("$0.toFixed($1)")>]
let toFixed (_x: float) (_digits: int) : string = jsNative

[<Emit("Math.sign($0)")>]
let sign (_x: float) : float = jsNative

[<Emit("Math.hypot($0, $1)")>]
let hypot (_x: float) (_y: float) : float = jsNative

[<Emit("Infinity")>]
let infinity: float = jsNative

/// Array.prototype.at: a negative index counts from the end; out of range is undefined.
[<Emit("$0.at($1)")>]
let at (_xs: 'a[]) (_i: obj) : 'a = jsNative

[<Emit("Array.isArray($0)")>]
let isArray (_x: obj) : bool = jsNative

[<Emit("typeof $0 === \"number\"")>]
let isNumber (_x: obj) : bool = jsNative

[<Emit("Number($0)")>]
let toNumber (_x: obj) : float = jsNative

/// Object.keys / Object.entries / Object.values, in JS property order (integer-like keys first).
[<Emit("Object.keys($0)")>]
let keys (_o: obj) : string[] = jsNative

[<Emit("Object.entries($0)")>]
let entries (_o: obj) : (string * 'a)[] = jsNative

[<Emit("Object.values($0)")>]
let values (_o: obj) : 'a[] = jsNative

/// `JSON.stringify(x)`, for error messages that quote a value.
[<Emit("JSON.stringify($0)")>]
let stringify (_x: obj) : string = jsNative

/// An empty plain JS object used as a string-keyed table (keeps JS key order and lookup rules).
[<Emit("{}")>]
let table<'a> () : obj = jsNative

[<Emit("$0[$1]")>]
let get<'a> (_o: obj) (_key: obj) : 'a = jsNative

[<Emit("$0[$1] = $2")>]
let put (_o: obj) (_key: obj) (_v: obj) : unit = jsNative

/// A global (window.X) read and write, for the names the page shares with classic scripts and modules.
[<Emit("window[$0]")>]
let globalGet<'a> (_name: string) : 'a = jsNative

[<Emit("window[$0] = $1")>]
let globalSet (_name: string) (_v: obj) : unit = jsNative

/// A JS RegExp, used directly where the original relied on `lastIndex` and `exec`.
type RegExpMatch =
    [<Emit("$0[$1]")>]
    abstract Item: int -> string
    abstract index: int

type RegExp =
    abstract lastIndex: int with get, set
    abstract exec: string -> RegExpMatch
    abstract test: string -> bool

[<Emit("new RegExp($0, $1)")>]
let regExp (_pattern: string) (_flags: string) : RegExp = jsNative

/// `str.match(re)`: the match array or null.
[<Emit("$0.match($1)")>]
let strMatch (_s: string) (_re: RegExp) : RegExpMatch = jsNative

/// The inline style properties the kit sets (Fable.Browser.Dom leaves `style` to Fable.Browser.Css). A number
/// is assigned with `el.style?opacity <- p`, which converts it exactly as the JS original's assignment did.
type Style =
    abstract cssText: string with get, set
    abstract opacity: string with get, set
    abstract visibility: string with get, set
    abstract transform: string with get, set
    abstract transformOrigin: string with get, set
    abstract left: string with get, set
    abstract right: string with get, set
    abstract top: string with get, set
    abstract width: string with get, set
    abstract height: string with get, set
    abstract textAlign: string with get, set
    abstract color: string with get, set
    abstract background: string with get, set
    abstract borderColor: string with get, set
    abstract gap: string with get, set
    abstract fontSize: string with get, set
    abstract fontWeight: string with get, set
    abstract lineHeight: string with get, set
    abstract gridTemplateColumns: string with get, set
    abstract setProperty: name: string * value: string -> unit

type HTMLElement with
    member inline el.style: Style = el?style

let svgNs = "http://www.w3.org/2000/svg"
let createSvg (tag: string) : Element = document.createElementNS (svgNs, tag)
