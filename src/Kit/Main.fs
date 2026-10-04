/// Entry (engine/web/Main.js): installs window.Stage and window.Kit, the API scene modules call, then runs
/// the long-video frame when the page is one. A clip page loads it as a module script after the classic
/// build/timing.js:
///   <script src="build/timing.js"></script>
///   <script type="module" src="/engine/web/Main.js"></script>
/// Module scripts run after the page is parsed and before "load", so window.ready exists when the renderer
/// asks for it. The long frame is recognised by its #modules layer.
module Main

open Browser
open Interop

globalSet "Stage" Stage.api
globalSet "Kit" (Kit.install ())
if not (isNull (document.getElementById "modules")) then Frame.run ()
