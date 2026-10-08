
import * as node$003Afs from "node:fs";
import * as promises from "node:fs/promises";
import * as node$003Apath from "node:path";
import * as node$003Aos from "node:os";
import * as node$003Aurl from "node:url";
import * as node$003Acrypto from "node:crypto";
import * as node$003Achild_process from "node:child_process";
import * as node$003Ahttp from "node:http";
import * as node$003Amodule from "node:module";
import { singleton as singleton_1, sort, tail, isEmpty, empty, ofArray, toArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { singleton, map, collect, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { disposeSafe, getEnumerator, defaultOf, uncurry2, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { toString } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { awaitPromise } from "./fable_modules/fable-library-js.5.19.0/Async.js";

export const fs = node$003Afs;

export const fsp = promises;

export const path = node$003Apath;

export const os = node$003Aos;

export const url = node$003Aurl;

export const crypto = node$003Acrypto;

export const childProcess = node$003Achild_process;

export const http = node$003Ahttp;

export const nodeModule = node$003Amodule;

/**
 * path.join over any number of parts.
 */
export function join(parts) {
    return path.join(...toArray(parts));
}

export function resolve(p) {
    return path.resolve(p);
}

export function dirname(p) {
    return path.dirname(p);
}

export function basename(p) {
    return path.basename(p);
}

export function extname(p) {
    return path.extname(p);
}

export function relative(fromDir, toPath) {
    return path.relative(fromDir, toPath);
}

export const sep = path.sep;

export const engineDir = resolve(url.fileURLToPath(new URL("..", (import.meta.url))));

export const pluginRoot = dirname(engineDir);

export function env(name) {
    const v = (process).env[name];
    if (Operators_IsNull(v) ? true : (v === "")) {
        return undefined;
    }
    else {
        return v;
    }
}

export const argv = (() => {
    const matchValue = ofArray((process).argv);
    let matchResult, rest;
    if (!isEmpty(matchValue)) {
        if (!isEmpty(tail(matchValue))) {
            matchResult = 0;
            rest = tail(tail(matchValue));
        }
        else {
            matchResult = 1;
        }
    }
    else {
        matchResult = 1;
    }
    switch (matchResult) {
        case 0:
            return rest;
        default:
            return empty();
    }
})();

export function exit(code) {
    return (process).exit(code);
}

export function cwd() {
    return (process).cwd();
}

export const homedir = os.homedir();

export const platform = (process).platform;

export function uid() {
    if (platform === "win32") {
        return 0;
    }
    else {
        return ((process).getuid()) | 0;
    }
}

export function eprint(s) {
    console.error(s);
}

export const toolHome = (() => {
    const option_1 = env("CODEBASE_VIDEO_HOME");
    return (option_1 != null) ? option_1 : join(ofArray([homedir, ".cache", "codebase-video"]));
})();

/**
 * require() a package installed in <tool home>/node by `setup`.
 */
export function requireFromHome(name) {
    const req = nodeModule.createRequire(join(ofArray([toolHome, "node", "package.json"])));
    return req(name);
}

export function exists(p) {
    return fs.existsSync(p);
}

export function isDir(p) {
    if (exists(p)) {
        return (fs.statSync(p)).isDirectory();
    }
    else {
        return false;
    }
}

export function readText(p) {
    return fs.readFileSync(p, "utf8");
}

export function writeText(p, s) {
    fs.writeFileSync(p, s);
}

/**
 * A Buffer.
 */
export function readBytes(p) {
    return fs.readFileSync(p);
}

export function writeBytes(p, data) {
    fs.writeFileSync(p, data);
}

export function mkdirp(p) {
    fs.mkdirSync(p, {
        recursive: true,
    });
}

export function remove(p) {
    fs.rmSync(p, {
        force: true,
        recursive: true,
    });
}

export function readDir(p) {
    return ofArray(fs.readdirSync(p));
}

export function copyFile(src, dst) {
    fs.copyFileSync(src, dst);
}

export function copyDir(src, dst) {
    fs.cpSync(src, dst, {
        recursive: true,
    });
}

export function rename(src, dst) {
    fs.renameSync(src, dst);
}

export function mtime(p) {
    return (fs.statSync(p)).mtimeMs;
}

export function fileSize(p) {
    return (fs.statSync(p)).size;
}

/**
 * Every file under a directory, as sorted paths relative to it with "/" between the parts.
 */
export function walk(dir) {
    return toList(delay(() => collect((name) => {
        const p = join(ofArray([dir, name]));
        return isDir(p) ? map((rest) => ((name + "/") + rest), walk(p)) : singleton(name);
    }, sort(readDir(dir), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    }))));
}

export function parseJson(s) {
    return JSON.parse(s);
}

export function readJson(p) {
    return parseJson(readText(p));
}

export function toJson(o) {
    return JSON.stringify(o);
}

export function toJsonIndented(o, indent) {
    return JSON.stringify(o, uncurry2(defaultOf()), indent);
}

export function sha1Hex(s) {
    return ((crypto.createHash("sha1")).update(s, "utf8")).digest("hex");
}

/**
 * sha1 of a file's bytes.
 */
export function sha1File(p) {
    return ((crypto.createHash("sha1")).update(fs.readFileSync(p))).digest("hex");
}

/**
 * Runs a command with inherited stdio and returns its exit status.
 */
export function run(cmd, args) {
    const r = childProcess.spawnSync(cmd, toArray(args), {
        stdio: "inherit",
    });
    if (Operators_IsNull(r.error)) {
        return r.status | 0;
    }
    else {
        return 127;
    }
}

/**
 * Runs a command and returns (status, stdout, stderr).
 */
export function runCapture(cmd, args) {
    const r = childProcess.spawnSync(cmd, toArray(args), {
        encoding: "utf8",
        maxBuffer: 1 << 28,
    });
    if (Operators_IsNull(r.error)) {
        return [r.status, r.stdout, r.stderr];
    }
    else {
        return [127, "", toString(r.error)];
    }
}

/**
 * True when the command is on PATH.
 */
export function hasCommand(cmd) {
    return runCapture((platform === "win32") ? "where" : "which", singleton_1(cmd))[0] === 0;
}

export function awaitJs(p) {
    return p;
}

/**
 * What a JS library's promise resolves to, as an Async. The promise is marked handled at once: the Async attaches
 * its own handlers when it runs, which Fable's trampoline can put off to a later turn, and a rejection in between
 * would otherwise end the process as an uncaught error.
 */
export function fromJs(p) {
    p.catch(() => {});
    return awaitPromise(awaitJs(p));
}

/**
 * Gives each reply an agent owes, after the message is handled and outside any `try` around the handling: a reply
 * runs its caller's continuation at once, up to that caller's next await, so a reply given inside the `try` could
 * come back as the handler's own failure and be answered a second time. What escapes a reply (only a caller whose
 * computation is already over can throw back here) is that caller's, not the agent's: it is dropped, so the agent
 * goes on and the other replies are still given.
 */
export function deliver(answers) {
    const enumerator = getEnumerator(answers);
    try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
            const answer = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
            try {
                answer();
            }
            catch (matchValue) {
            }
        }
    }
    finally {
        disposeSafe(enumerator);
    }
}

