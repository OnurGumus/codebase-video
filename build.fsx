// Compiles the engine (src/Engine -> engine/cli) and the kit (src/Kit -> engine/web) with Fable, and makes the
// compiled output committable: Fable writes a .gitignore ("**/*") into each fable_modules folder, but the plugin
// ships the compiled JS, runtime libraries included, so users need only Node.
//   dotnet tool restore
//   dotnet fsi build.fsx
open System.Diagnostics
open System.IO

let run (args: string) =
    let p = Process.Start(ProcessStartInfo("dotnet", args, UseShellExecute = false))
    p.WaitForExit()
    if p.ExitCode <> 0 then failwithf "dotnet %s failed (%d)" args p.ExitCode

let root = __SOURCE_DIRECTORY__

for project, out in [ "src/Engine", "engine/cli"; "src/Kit", "engine/web" ] do
    run $"fable {Path.Combine(root, project)} -o {Path.Combine(root, out)} --noCache"
    let modules = Path.Combine(root, out, "fable_modules")
    for junk in [ ".gitignore"; "project_cracked.json" ] do
        let f = Path.Combine(modules, junk)
        if File.Exists f then File.Delete f

printfn "compiled: engine/cli (node engine/cli/Cv.js) and engine/web (engine/web/Main.js)"
