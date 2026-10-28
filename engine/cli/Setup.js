
import { iterate, exists as exists_1, map, singleton as singleton_1, tryFind, filter, toArray as toArray_1, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { eprint, writeText, readText, exists, join as join_1, runCapture, hasCommand, toolHome, mkdirp, platform, childProcess, fs, env, toJsonIndented } from "./Node.js";
import { compareArrays, createObj } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { isEmpty, append, singleton, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { toArray } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { browserPaths } from "./Render.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { printf, toConsole, concat, join, split } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { parse } from "./fable_modules/fable-library-js.5.19.0/Int32.js";
import { item } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { requirePackages, selfTest, downloadModel, modelDir, modelProblem, modelState, packageInstalled } from "./Narrate.js";
import { ResultCE_result, ResultCE_ResultBuilder__Zero } from "./fable_modules/FsToolkit.ErrorHandling.5.2.0/ResultCE.fs.js";
import { singleton as singleton_2 } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";

const dependencies = ofArray([["puppeteer-core", "^25.12.0"], ["kokoro-js", "1.2.1"], ["@echogarden/espeak-ng-emscripten", "0.3.5"], ["pptxgenjs", "4.0.1"], ["jszip", "3.10.1"]]);

const core = ofArray(["puppeteer-core", "kokoro-js", "@echogarden/espeak-ng-emscripten"]);

function packageJson() {
    return toJsonIndented({
        name: "codebase-video-engine",
        private: true,
        type: "module",
        description: "Renders and voices narrated videos for engine/cli/Cv.js (installed by its setup step).",
        dependencies: createObj(toList(delay(() => collect((matchValue) => singleton([matchValue[0], matchValue[1]]), dependencies)))),
    }, 2) + "\n";
}

function chromeCandidates() {
    return toList(delay(() => append(ofArray(toArray(env("CHROME"))), delay(() => browserPaths))));
}

function executable(p) {
    try {
        fs.accessSync(p, fs.constants.X_OK);
        return true;
    }
    catch (matchValue) {
        return false;
    }
}

function runIn(dir, cmd, args) {
    const r = childProcess.spawnSync(cmd, toArray_1(args), {
        cwd: dir,
        stdio: "inherit",
        shell: platform === "win32",
    });
    if (Operators_IsNull(r.error)) {
        return r.status | 0;
    }
    else {
        return 127;
    }
}

const minimumNode = [22, 12];

function nodeVersion() {
    const parts = split((process).versions.node, ["."], undefined, 0);
    return [parse(item(0, parts), 511, false, 32), parse(item(1, parts), 511, false, 32)];
}

/**
 * Checks the system tools and installs the packages as `run` is called, before the Async starts; a check that fails
 * ends setup with the lines that say what is missing and status 2. Then fetches the model and voices a word. Returns
 * an exit code. (An exception in the checks, e.g. a tool home that cannot be made, is thrown from `run` itself.)
 */
export function run() {
    mkdirp(toolHome);
    const missing = filter((arg) => !hasCommand(arg), ofArray(["node", "npm", "ffmpeg"]));
    const minor = minimumNode[1] | 0;
    const major = minimumNode[0] | 0;
    let prepared;
    let input_10;
    const value_1 = compareArrays(nodeVersion(), minimumNode) >= 0;
    const error = ofArray([`Node.js ${(process).versions.node} is too old: the engine needs Node.js ${major}.${minor} or newer`, "  macOS:  brew install node   (or brew upgrade node)", "  other systems:  the LTS release from https://nodejs.org"]);
    input_10 = (value_1 ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [error])));
    if (input_10.tag === 1) {
        prepared = (new FSharpResult$2(/* Error */ 1, [input_10.fields[0]]));
    }
    else {
        let input_8;
        const error_2 = ofArray(["missing system tools: " + join(" ", missing), "  macOS:  brew install node ffmpeg", `  Debian/Ubuntu:  sudo apt install ffmpeg; Node.js ${major}.${minor} or newer (with npm) from https://nodejs.org`]);
        input_8 = (isEmpty(missing) ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [error_2])));
        if (input_8.tag === 1) {
            prepared = (new FSharpResult$2(/* Error */ 1, [input_8.fields[0]]));
        }
        else {
            const patternInput = runCapture("ffmpeg", ofArray(["-hide_banner", "-encoders"]));
            let input_6;
            const matchValue = tryFind((codec) => !(patternInput[1].indexOf(codec) >= 0), ofArray(["libx264", "libvpx-vp9", "libopus"]));
            input_6 = ((matchValue == null) ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [singleton_1(concat("ffmpeg lacks the ", matchValue, " encoder"))])));
            if (input_6.tag === 1) {
                prepared = (new FSharpResult$2(/* Error */ 1, [input_6.fields[0]]));
            }
            else {
                let input_4;
                const option_1 = tryFind((c) => {
                    if (c !== "") {
                        return executable(c);
                    }
                    else {
                        return false;
                    }
                }, chromeCandidates());
                input_4 = ((option_1 == null) ? (new FSharpResult$2(/* Error */ 1, [singleton_1("no Chrome, Chromium, Edge or Brave found: install one, or set CHROME to its executable")])) : (new FSharpResult$2(/* Ok */ 0, [option_1])));
                if (input_4.tag === 1) {
                    prepared = (new FSharpResult$2(/* Error */ 1, [input_4.fields[0]]));
                }
                else {
                    const nodeDir = join_1(ofArray([toolHome, "node"]));
                    mkdirp(nodeDir);
                    const manifest = join_1(ofArray([nodeDir, "package.json"]));
                    const wanted = packageJson();
                    const stale = !exists(manifest) ? true : (readText(manifest) !== wanted);
                    const names = map((tuple) => tuple[0], dependencies);
                    let input_2;
                    if (stale ? true : exists_1((arg_1) => !packageInstalled(arg_1), names)) {
                        const arg_2 = "installing " + join(", ", names);
                        toConsole(printf("%s"))(arg_2);
                        writeText(manifest, wanted);
                        const input = (runIn(nodeDir, "npm", ofArray(["install", "--silent", "--no-audit", "--no-fund"])) !== 0) ? (new FSharpResult$2(/* Error */ 1, [singleton_1(concat("npm install failed in ", nodeDir))])) : (new FSharpResult$2(/* Ok */ 0, [undefined]));
                        input_2 = ((input.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [undefined])));
                    }
                    else {
                        input_2 = ResultCE_ResultBuilder__Zero(ResultCE_result);
                    }
                    prepared = ((input_2.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_2.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [input_4.fields[0]])));
                }
            }
        }
    }
    if (prepared.tag === 0) {
        return singleton_2.Delay(() => {
            let matchValue_1, state, arg_3, arg_4;
            return singleton_2.Combine((matchValue_1 = modelState(), (matchValue_1.tag === 0) ? (singleton_2.Zero()) : ((state = matchValue_1, singleton_2.Combine((state.tag === 2) ? (((arg_3 = concat(modelProblem(state), ". Downloading it again"), toConsole(printf("%s"))(arg_3)), singleton_2.Zero())) : (((arg_4 = concat("downloading the Kokoro model (about 330 MB) into ", modelDir()), toConsole(printf("%s"))(arg_4)), singleton_2.Zero())), singleton_2.Delay(() => singleton_2.Bind(downloadModel(), () => singleton_2.Bind(selfTest(), () => singleton_2.Return(undefined)))))))), singleton_2.Delay(() => {
                toConsole(printf("%s"))(`ready: voice, renderer and encoder are set up in ${toolHome} (browser: ${prepared.fields[0]})`);
                return singleton_2.Return(0);
            }));
        });
    }
    else {
        iterate((s) => {
            eprint(s);
        }, prepared.fields[0]);
        return singleton_2.Return(2);
    }
}

/**
 * The setup hint when the tool home is not ready (every step but `present` needs these packages).
 */
export function requireReady() {
    return requirePackages(core);
}

