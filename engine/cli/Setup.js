
import { exists as exists_1, map, tryFind, isEmpty, filter, toArray as toArray_1, ofArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { writeText, readText, exists, join as join_1, runCapture, hasCommand, toolHome, mkdirp, exit, eprint, platform, childProcess, fs, env, toJsonIndented } from "./Node.js";
import { disposeSafe, getEnumerator, createObj } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { append, singleton, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { toArray } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { printf, toConsole, concat, join } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { requirePackages, selfTest, modelDir, modelFile, packageInstalled } from "./Narrate.js";
import { PromiseBuilder__Delay_62FBFDE1, PromiseBuilder__Run_212F1D4B } from "./fable_modules/Fable.Promise.3.2.1/Promise.fs.js";
import { promise } from "./fable_modules/Fable.Promise.3.2.1/PromiseImpl.fs.js";

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
    return toList(delay(() => append(ofArray(toArray(env("CHROME"))), delay(() => append(singleton("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), delay(() => append(singleton("/Applications/Chromium.app/Contents/MacOS/Chromium"), delay(() => append(singleton("/usr/bin/google-chrome"), delay(() => append(singleton("/usr/bin/google-chrome-stable"), delay(() => append(singleton("/usr/bin/chromium"), delay(() => singleton("/usr/bin/chromium-browser")))))))))))))));
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

function failWith(message) {
    eprint(message);
    return exit(2);
}

export function run() {
    mkdirp(toolHome);
    const missing = filter((arg) => !hasCommand(arg), ofArray(["node", "npm", "ffmpeg"]));
    if (!isEmpty(missing)) {
        eprint("missing system tools: " + join(" ", missing));
        eprint("  macOS:  brew install node ffmpeg");
        failWith("  Debian/Ubuntu:  sudo apt install nodejs npm ffmpeg");
    }
    const patternInput = runCapture("ffmpeg", ofArray(["-hide_banner", "-encoders"]));
    const enumerator = getEnumerator(["libx264", "libvpx-vp9", "libopus"]);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const codec = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            if (!(patternInput[1].indexOf(codec) >= 0)) {
                failWith(concat("ffmpeg lacks the ", codec, " encoder"));
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
    let chrome;
    const matchValue = tryFind((c) => {
        if (c !== "") {
            return executable(c);
        }
        else {
            return false;
        }
    }, chromeCandidates());
    chrome = ((matchValue == null) ? failWith("no Chrome or Chromium found: install one, or set CHROME to its executable") : matchValue);
    const nodeDir = join_1(ofArray([toolHome, "node"]));
    mkdirp(nodeDir);
    const manifest = join_1(ofArray([nodeDir, "package.json"]));
    const wanted = packageJson();
    const stale = !exists(manifest) ? true : (readText(manifest) !== wanted);
    const names = map((tuple) => tuple[0], dependencies);
    if (stale ? true : exists_1((arg_1) => !packageInstalled(arg_1), names)) {
        const arg_2 = "installing " + join(", ", names);
        toConsole(printf("%s"))(arg_2);
        writeText(manifest, wanted);
        if (runIn(nodeDir, "npm", ofArray(["install", "--silent", "--no-audit", "--no-fund"])) !== 0) {
            failWith(concat("npm install failed in ", nodeDir));
        }
    }
    return PromiseBuilder__Run_212F1D4B(promise, PromiseBuilder__Delay_62FBFDE1(promise, () => {
        let arg_3;
        return (!exists(modelFile()) ? (((arg_3 = concat("downloading the Kokoro model (about 330 MB) into ", modelDir()), toConsole(printf("%s"))(arg_3)), selfTest().then(() => (Promise.resolve(undefined))))) : (Promise.resolve())).then(() => PromiseBuilder__Delay_62FBFDE1(promise, () => {
            toConsole(printf("%s"))(`ready: voice, renderer and encoder are set up in ${toolHome} (browser: ${chrome})`);
            return Promise.resolve(0);
        }));
    }));
}

/**
 * Exits with a hint to run setup when the tool home is not ready.
 */
export function requireReady() {
    requirePackages(core);
}

