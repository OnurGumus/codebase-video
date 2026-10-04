
import * as node$003Afs from "node:fs";
import * as promises from "node:fs/promises";
import * as node$003Apath from "node:path";
import * as node$003Aos from "node:os";
import * as node$003Aurl from "node:url";
import * as node$003Acrypto from "node:crypto";
import * as node$003Achild_process from "node:child_process";
import * as node$003Ahttp from "node:http";
import * as node$003Amodule from "node:module";
import { singleton, ofArray, toArray } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { skip } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { defaultOf, uncurry2 } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { toString } from "./fable_modules/fable-library-js.5.19.0/Types.js";

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

export const argv = ofArray(skip(2, (process).argv));

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
    return runCapture((platform === "win32") ? "where" : "which", singleton(cmd))[0] === 0;
}

