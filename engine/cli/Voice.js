
import { toString, Record, Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { int32_type, float64_type, record_type, class_type, tuple_type, option_type, union_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { map as map_1, empty as empty_1, exists as exists_1, tryFind, ofArray, singleton } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { split, substring, concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { toJson, sha1Hex, fileSize, childProcess, runCapture, remove, fs, os, env, toolHome, readJson, exists, resolve, dirname, join } from "./Node.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { orElse, defaultArg, value as value_5, some } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { ofArray as ofArray_1 } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { map, tryLast, choose as choose_1 } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { defaultOf as defaultOf_1, createObj, int32ToString, disposeSafe, getEnumerator, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { traverseResultM } from "./fable_modules/FsToolkit.ErrorHandling.5.2.0/List.fs.js";
import { collect, empty, singleton as singleton_1, append, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { ResultCE_result, ResultCE_ResultBuilder__Zero } from "./fable_modules/FsToolkit.ErrorHandling.5.2.0/ResultCE.fs.js";
import { defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { read } from "./Wav.js";
import { replace } from "./fable_modules/fable-library-js.5.19.0/RegExp.js";
import { parse } from "./fable_modules/fable-library-js.5.19.0/Double.js";
import { fromContinuations } from "./fable_modules/fable-library-js.5.19.0/Async.js";
import { op_UnaryNegation_Int32 } from "./fable_modules/fable-library-js.5.19.0/Int32.js";
import { singleton as singleton_2 } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";

/**
 * Who speaks.
 */
export class Provider extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Kokoro", "ElevenLabs", "OpenAI", "Azure", "Google", "Command"];
    }
    static Kokoro = new Provider(0, []);
    static ElevenLabs = new Provider(1, []);
    static OpenAI = new Provider(2, []);
    static Google = new Provider(4, []);
}

export function Provider_$reflection() {
    return union_type("Voice.Provider", [], Provider, () => [[], [], [], [["region", string_type]], [], [["name", string_type], ["command", string_type]]]);
}

/**
 * The voice settings of a video, before the speed is known.
 */
export class Choice extends Record {
    constructor(Provider, Name, Model, Instructions, Others) {
        super();
        this.Provider = Provider;
        this.Name = Name;
        this.Model = Model;
        this.Instructions = Instructions;
        this.Others = Others;
    }
}

export function Choice_$reflection() {
    return record_type("Voice.Choice", [], Choice, () => [["Provider", Provider_$reflection()], ["Name", string_type], ["Model", option_type(string_type)], ["Instructions", option_type(string_type)], ["Others", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [string_type, tuple_type(string_type, string_type)])]]);
}

/**
 * A voice ready to speak: a choice with the video's language and pacing.
 */
export class Voice extends Record {
    constructor(Provider, Name, Model, Instructions, Lang, Speed) {
        super();
        this.Provider = Provider;
        this.Name = Name;
        this.Model = Model;
        this.Instructions = Instructions;
        this.Lang = Lang;
        this.Speed = Speed;
    }
}

export function Voice_$reflection() {
    return record_type("Voice.Voice", [], Voice, () => [["Provider", Provider_$reflection()], ["Name", string_type], ["Model", option_type(string_type)], ["Instructions", option_type(string_type)], ["Lang", string_type], ["Speed", float64_type]]);
}

/**
 * Why a voice could not be used; each case carries the values its message names.
 */
export class Failure extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["KeyMissing", "SettingsBad", "Refused", "Unreachable", "CommandFailed"];
    }
}

export function Failure_$reflection() {
    return union_type("Voice.Failure", [], Failure, () => [[["provider", string_type], ["variable", string_type]], [["why", string_type]], [["provider", string_type], ["status", int32_type], ["message", string_type]], [["provider", string_type], ["message", string_type]], [["name", string_type], ["code", int32_type], ["stderr", string_type]]]);
}

/**
 * The exit code of a failure (2 for a missing key, else 1) and the lines it prints on stderr.
 */
export function describe(failure) {
    switch (failure.tag) {
        case 1:
            return [1, singleton(failure.fields[0])];
        case 2:
            return [1, singleton(`${failure.fields[0]} refused the request (${failure.fields[1]}): ${failure.fields[2]}`)];
        case 3:
            return [1, singleton(concat(failure.fields[0], " could not be reached: ", failure.fields[1]))];
        case 4:
            return [1, singleton(`command ${failure.fields[0]} failed (exit ${failure.fields[1]}): ${failure.fields[2]}`)];
        default:
            return [2, singleton(concat(failure.fields[0], " needs ", failure.fields[1], " in the environment (a key is never read from a file): set it, then run again."))];
    }
}

/**
 * The provider's name as the messages say it.
 */
export function providerName(provider) {
    switch (provider.tag) {
        case 1:
            return "ElevenLabs";
        case 2:
            return "OpenAI";
        case 3:
            return "Azure";
        case 4:
            return "Google";
        case 5:
            return concat("command ", provider.fields[0]);
        default:
            return "Kokoro";
    }
}

function text(o, key) {
    if ((!Operators_IsNull(o) && ((typeof o[key]) === "string")) && (o[key] !== "")) {
        return o[key];
    }
    else {
        return undefined;
    }
}

function projectSettings(ws) {
    const file = join(ofArray([dirname(resolve(ws)), "voice.json"]));
    if (!exists(file)) {
        return new FSharpResult$2(/* Ok */ 0, [undefined]);
    }
    else {
        try {
            return new FSharpResult$2(/* Ok */ 0, [some(readJson(file))]);
        }
        catch (e) {
            return new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, [concat(file, " is not valid JSON: fix it or delete it (", e.message, ")")])]);
        }
    }
}

function commandText(name) {
    const file = join(ofArray([toolHome, "voices.json"]));
    let option_1;
    if (exists(file)) {
        try {
            option_1 = text(readJson(file).commands, name);
        }
        catch (matchValue) {
            option_1 = undefined;
        }
    }
    else {
        option_1 = undefined;
    }
    if (option_1 == null) {
        return new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, [`command ${name} is not defined: add "${name}" under "commands" in ${file}`])]);
    }
    else {
        return new FSharpResult$2(/* Ok */ 0, [option_1]);
    }
}

function $007CNamed$007C_$007C(provider) {
    const matchValue = provider.toLocaleLowerCase();
    let matchResult, p;
    switch (matchValue) {
        case "kokoro": {
            matchResult = 0;
            p = matchValue;
            break;
        }
        case "elevenlabs": {
            matchResult = 0;
            p = matchValue;
            break;
        }
        case "openai": {
            matchResult = 0;
            p = matchValue;
            break;
        }
        case "azure": {
            matchResult = 0;
            p = matchValue;
            break;
        }
        case "google": {
            matchResult = 0;
            p = matchValue;
            break;
        }
        case "command": {
            matchResult = 0;
            p = matchValue;
            break;
        }
        default:
            matchResult = 1;
    }
    switch (matchResult) {
        case 0:
            return p;
        default:
            return undefined;
    }
}

function pick(project, script) {
    const matchValue = text(script, "provider");
    if (matchValue == null) {
        if (project == null) {
            return some(script);
        }
        else {
            return some(value_5(project));
        }
    }
    else {
        return some(script);
    }
}

function others(spec) {
    return ofArray_1(choose_1((tupledArg) => {
        const code = tupledArg[0];
        const v = tupledArg[1];
        const input_1 = text(v, "voice");
        if (input_1 == null) {
            return undefined;
        }
        else {
            return [code, [input_1, defaultArg(text(v, "lang"), code)]];
        }
    }, Object.entries(spec.voices || {})), {
        Compare: (x, y) => (comparePrimitives(x, y) | 0),
    });
}

const shellClasses = ofArray([["$ or `", ofArray(["$", "`"])], ["a quote", ofArray(["\"", "\'"])], ["a backslash", singleton("\\")], ["; & or |", ofArray([";", "&", "|"])], ["< or >", ofArray(["<", ">"])], ["a line break", ofArray(["\n", "\r"])], ["a NUL", singleton(String.fromCharCode(0 & 0xFFFF))]]);

function plainValues(values) {
    const input_1 = traverseResultM((tupledArg) => {
        const matchValue = tryFind((tupledArg_1) => exists_1((c) => (tupledArg[1].indexOf(c) >= 0), tupledArg_1[1]), shellClasses);
        if (matchValue == null) {
            return new FSharpResult$2(/* Ok */ 0, [undefined]);
        }
        else {
            return new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, [((`the command voice's "${tupledArg[0]}" holds ${matchValue[0]}: a command voice's voice and lang may not hold `) + "$ ` \" \' \\ ; & | < >, CR, LF or NUL, since its command runs in a shell ") + "(voice.json, script.json)"])]);
        }
    }, values);
    if (input_1.tag === 1) {
        return new FSharpResult$2(/* Error */ 1, [input_1.fields[0]]);
    }
    else {
        return new FSharpResult$2(/* Ok */ 0, [void input_1.fields[0]]);
    }
}

/**
 * The voice settings of the video in workspace `ws`: None for a silent clip.
 */
export function choose(ws, script) {
    let activePatternResult, p;
    if (((script != null && Object.hasOwn(script, "voice"))) && Operators_IsNull(script.voice)) {
        return new FSharpResult$2(/* Ok */ 0, [undefined]);
    }
    else {
        const input_13 = projectSettings(ws);
        if (input_13.tag === 1) {
            return new FSharpResult$2(/* Error */ 1, [input_13.fields[0]]);
        }
        else {
            const spec = value_5(pick(input_13.fields[0], script));
            const provider = defaultArg(text(spec, "provider"), "kokoro");
            const input_11 = (activePatternResult = $007CNamed$007C_$007C(provider), (activePatternResult != null) ? ((p = activePatternResult, new FSharpResult$2(/* Ok */ 0, [p]))) : (new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, [concat("unknown provider \"", provider, "\" (voice.json, script.json): use one of ", "kokoro, elevenlabs, openai, azure, google, command")])])));
            if (input_11.tag === 1) {
                return new FSharpResult$2(/* Error */ 1, [input_11.fields[0]]);
            }
            else {
                const kind = input_11.fields[0];
                const voice = text(spec, "voice");
                const input_9 = (voice == null) ? ((kind === "kokoro") ? (new FSharpResult$2(/* Ok */ 0, ["af_heart"])) : ((kind === "command") ? (new FSharpResult$2(/* Ok */ 0, [""])) : (new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, [concat("provider \"", kind, "\" needs a \"voice\" in voice.json or script.json")])])))) : (new FSharpResult$2(/* Ok */ 0, [voice]));
                if (input_9.tag === 1) {
                    return new FSharpResult$2(/* Error */ 1, [input_9.fields[0]]);
                }
                else {
                    const name = input_9.fields[0];
                    let input_7;
                    switch (kind) {
                        case "elevenlabs": {
                            input_7 = (new FSharpResult$2(/* Ok */ 0, [Provider.ElevenLabs]));
                            break;
                        }
                        case "openai": {
                            input_7 = (new FSharpResult$2(/* Ok */ 0, [Provider.OpenAI]));
                            break;
                        }
                        case "azure": {
                            input_7 = (new FSharpResult$2(/* Ok */ 0, [new Provider(/* Azure */ 3, [defaultArg(env("AZURE_SPEECH_REGION"), "")])]));
                            break;
                        }
                        case "google": {
                            input_7 = (new FSharpResult$2(/* Ok */ 0, [Provider.Google]));
                            break;
                        }
                        case "command": {
                            let input_2;
                            const option_1 = text(spec, "command");
                            input_2 = ((option_1 == null) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, ["provider \"command\" needs a \"command\": a command name from voices.json"])])) : (new FSharpResult$2(/* Ok */ 0, [option_1])));
                            if (input_2.tag === 1) {
                                input_7 = (new FSharpResult$2(/* Error */ 1, [input_2.fields[0]]));
                            }
                            else {
                                const command = input_2.fields[0];
                                const input = commandText(command);
                                input_7 = ((input.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [new Provider(/* Command */ 5, [command, input.fields[0]])])));
                            }
                            break;
                        }
                        default:
                            input_7 = (new FSharpResult$2(/* Ok */ 0, [Provider.Kokoro]));
                    }
                    if (input_7.tag === 1) {
                        return new FSharpResult$2(/* Error */ 1, [input_7.fields[0]]);
                    }
                    else {
                        const chosen = input_7.fields[0];
                        const phrases = others(spec);
                        let input_5;
                        if (chosen.tag === 5) {
                            const input_3 = plainValues(toList(delay(() => append(singleton_1(["voice", name]), delay(() => {
                                let matchValue_1;
                                return append((matchValue_1 = text(script, "lang"), (matchValue_1 == null) ? (empty()) : singleton_1(["lang", matchValue_1])), delay(() => collect((matchValue_2) => {
                                    const activePatternResult_1 = matchValue_2;
                                    const code = activePatternResult_1[0];
                                    return append(singleton_1([concat("voices.", code, ".voice"), activePatternResult_1[1][0]]), delay(() => singleton_1([concat("voices.", code, ".lang"), activePatternResult_1[1][1]])));
                                }, phrases)));
                            })))));
                            input_5 = ((input_3.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_3.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [undefined])));
                        }
                        else {
                            input_5 = ResultCE_ResultBuilder__Zero(ResultCE_result);
                        }
                        if (input_5.tag === 1) {
                            return new FSharpResult$2(/* Error */ 1, [input_5.fields[0]]);
                        }
                        else {
                            return new FSharpResult$2(/* Ok */ 0, [new Choice(chosen, name, orElse(text(spec, "model"), (chosen.tag === 1) ? "eleven_multilingual_v2" : ((chosen.tag === 2) ? "gpt-4o-mini-tts" : undefined)), text(spec, "instructions"), phrases)]);
                        }
                    }
                }
            }
        }
    }
}

function variables(provider) {
    switch (provider.tag) {
        case 2:
            return singleton("OPENAI_API_KEY");
        case 3:
            return ofArray(["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"]);
        case 4:
            return singleton("GOOGLE_API_KEY");
        case 0:
        case 5:
            return empty_1();
        default:
            return singleton("ELEVENLABS_API_KEY");
    }
}

function speedRange(provider) {
    switch (provider.tag) {
        case 2:
            return [0.25, 4, "0.25 to 4.0"];
        case 4:
            return [0.25, 2, "0.25 to 2.0"];
        case 3:
            return [0.5, 2, "0.5 to 2.0"];
        case 0:
        case 5:
            return undefined;
        default:
            return [0.7, 1.2, "0.7 to 1.2"];
    }
}

class Quoting extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Outside", "InSingle", "InDouble"];
    }
    static Outside = new Quoting(0, []);
    static InSingle = new Quoting(1, []);
    static InDouble = new Quoting(2, []);
}

function Quoting_$reflection() {
    return union_type("Voice.Quoting", [], Quoting, () => [[], [], []]);
}

function placeholderAt(body, i) {
    return tryFind((p) => {
        if ((i >= 0) && ((i + p.length) <= body.length)) {
            return substring(body, i, p.length) === p;
        }
        else {
            return false;
        }
    }, ofArray(["{voice}", "{lang}", "{speed}", "{out}"]));
}

function misplacedPlaceholder(body) {
    const scan = (i_mut, quoting_mut) => {
        scan:
        while (true) {
            const i = i_mut, quoting = quoting_mut;
            if (i >= body.length) {
                return undefined;
            }
            else {
                const matchValue = body[i];
                const matchValue_1 = placeholderAt(body, i);
                let matchResult, p;
                switch (quoting.tag) {
                    case 2: {
                        if (matchValue_1 != null) {
                            matchResult = 0;
                            p = matchValue_1;
                        }
                        else {
                            switch (matchValue) {
                                case "\"": {
                                    matchResult = 7;
                                    break;
                                }
                                case "\\": {
                                    if (placeholderAt(body, i + 1) != null) {
                                        matchResult = 3;
                                    }
                                    else {
                                        matchResult = 4;
                                    }
                                    break;
                                }
                                default:
                                    matchResult = 8;
                            }
                        }
                        break;
                    }
                    case 0: {
                        switch (matchValue) {
                            case "\"": {
                                matchResult = 6;
                                break;
                            }
                            case "\'": {
                                matchResult = 5;
                                break;
                            }
                            case "\\": {
                                if (placeholderAt(body, i + 1) != null) {
                                    matchResult = 3;
                                }
                                else {
                                    matchResult = 4;
                                }
                                break;
                            }
                            default:
                                matchResult = 8;
                        }
                        break;
                    }
                    default:
                        if (matchValue_1 != null) {
                            matchResult = 0;
                            p = matchValue_1;
                        }
                        else {
                            switch (matchValue) {
                                case "\'": {
                                    matchResult = 1;
                                    break;
                                }
                                default:
                                    matchResult = 2;
                            }
                        }
                }
                switch (matchResult) {
                    case 0:
                        return p;
                    case 1: {
                        i_mut = (i + 1);
                        quoting_mut = Quoting.Outside;
                        continue scan;
                    }
                    case 2: {
                        i_mut = (i + 1);
                        quoting_mut = Quoting.InSingle;
                        continue scan;
                    }
                    case 3:
                        return placeholderAt(body, i + 1);
                    case 4: {
                        i_mut = (i + 2);
                        quoting_mut = quoting;
                        continue scan;
                    }
                    case 5: {
                        i_mut = (i + 1);
                        quoting_mut = Quoting.InSingle;
                        continue scan;
                    }
                    case 6: {
                        i_mut = (i + 1);
                        quoting_mut = Quoting.InDouble;
                        continue scan;
                    }
                    case 7: {
                        i_mut = (i + 1);
                        quoting_mut = Quoting.Outside;
                        continue scan;
                    }
                    default: {
                        i_mut = (i + 1);
                        quoting_mut = quoting;
                        continue scan;
                    }
                }
            }
            break;
        }
    };
    return scan(0, Quoting.Outside);
}

/**
 * Before any work: the provider's key and the speed it can take.
 */
export function check(choice, speed) {
    let input_9;
    let resource;
    let copyOfStruct = variables(choice.Provider);
    resource = getEnumerator(copyOfStruct);
    try {
        const enum$ = resource;
        let doContinue = true;
        let result_1 = new FSharpResult$2(/* Ok */ 0, [undefined]);
        while (doContinue && enum$["System.Collections.IEnumerator.MoveNext"]()) {
            let matchValue;
            const variable = enum$["System.Collections.Generic.IEnumerator`1.get_Current"]();
            let input_2;
            let input_1;
            const option = env(variable);
            const error = new Failure(/* KeyMissing */ 0, [providerName(choice.Provider), variable]);
            const option_1 = option;
            input_1 = ((option_1 == null) ? (new FSharpResult$2(/* Error */ 1, [error])) : (new FSharpResult$2(/* Ok */ 0, [option_1])));
            input_2 = ((input_1.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_1.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [void input_1.fields[0]])));
            matchValue = ((input_2.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_2.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [undefined])));
            if (matchValue.tag === 1) {
                doContinue = false;
                result_1 = (new FSharpResult$2(/* Error */ 1, [matchValue.fields[0]]));
            }
        }
        input_9 = result_1;
    }
    finally {
        if (!(resource === defaultOf())) {
            let copyOfStruct_1 = resource;
            disposeSafe(copyOfStruct_1);
        }
    }
    if (input_9.tag === 1) {
        return new FSharpResult$2(/* Error */ 1, [input_9.fields[0]]);
    }
    else {
        let input_7;
        const matchValue_1 = speedRange(choice.Provider);
        if (matchValue_1 == null) {
            input_7 = ResultCE_ResultBuilder__Zero(ResultCE_result);
        }
        else {
            const said = matchValue_1[2];
            const high = matchValue_1[1];
            let input_3;
            const value_1 = (matchValue_1[0] <= speed) && (speed <= high);
            const error_2 = new Failure(/* SettingsBad */ 1, [(`speed ${speed} is not one ${providerName(choice.Provider)} takes (${said}): `) + "change \"speed\" in script.json"]);
            input_3 = (value_1 ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [error_2])));
            input_7 = ((input_3.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_3.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [undefined])));
        }
        if (input_7.tag === 1) {
            return new FSharpResult$2(/* Error */ 1, [input_7.fields[0]]);
        }
        else {
            const matchValue_2 = choice.Provider;
            if (matchValue_2.tag === 5) {
                const name = matchValue_2.fields[0];
                const body = matchValue_2.fields[1];
                let input_5;
                const value_3 = body.indexOf("{out}") >= 0;
                const error_4 = new Failure(/* SettingsBad */ 1, [concat("command ", name, " never says where its audio goes: put {out} in its text (voices.json)")]);
                input_5 = (value_3 ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [error_4])));
                if (input_5.tag === 1) {
                    return new FSharpResult$2(/* Error */ 1, [input_5.fields[0]]);
                }
                else {
                    const matchValue_3 = misplacedPlaceholder(body);
                    if (matchValue_3 == null) {
                        return ResultCE_ResultBuilder__Zero(ResultCE_result);
                    }
                    else {
                        return new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, [(`command ${name} puts ${matchValue_3} inside quotes or after a backslash: write each placeholder `) + "outside any quotes in its text (voices.json); the engine quotes it itself"])]);
                    }
                }
            }
            else {
                return ResultCE_ResultBuilder__Zero(ResultCE_result);
            }
        }
    }
}

function lastLine(s) {
    let array_1;
    return defaultArg(tryLast((array_1 = map((l) => l.trim(), split(s, ["\n"], undefined, 0)), array_1.filter((l_1) => (l_1 !== "")))), "");
}

/**
 * A fresh empty directory under the system temp directory.
 */
export function tempDir() {
    const root = os.tmpdir();
    return fs.mkdtempSync(join(ofArray([root, "cv-voice-"])));
}

/**
 * The samples of any audio file ffmpeg reads, as 24 kHz mono floats (ffmpeg converts it to the 16-bit PCM mono WAV
 * that `Wav.read` takes); the error is ffmpeg's last line.
 */
export function samplesOf(file) {
    const dir = tempDir();
    try {
        const wav = join(ofArray([dir, "audio.wav"]));
        const matchValue = runCapture("ffmpeg", ofArray(["-nostdin", "-v", "error", "-y", "-i", file, "-ac", "1", "-ar", int32ToString(24000), "-c:a", "pcm_s16le", wav]));
        switch (matchValue[0]) {
            case 0:
                try {
                    return new FSharpResult$2(/* Ok */ 0, [read(wav)]);
                }
                catch (e) {
                    return new FSharpResult$2(/* Error */ 1, [e.message]);
                }
            case 127:
                return new FSharpResult$2(/* Error */ 1, ["ffmpeg is not installed or not on PATH"]);
            default:
                return new FSharpResult$2(/* Error */ 1, [lastLine(matchValue[2])]);
        }
    }
    finally {
        remove(dir);
    }
}

function fill(body) {
    return replace(body, "\\{(voice|lang|speed|out)\\}", (delegateArg) => (("\"$CV_" + (delegateArg[1] || "").toLocaleUpperCase()) + "\""));
}

function commandTimeout() {
    let option_1, input_1, s;
    return defaultArg((option_1 = ((input_1 = env("CODEBASE_VIDEO_VOICE_TIMEOUT"), (input_1 == null) ? undefined : parse(input_1))), (option_1 != null) ? (((s = option_1, !Number.isNaN(s) && (s > 0))) ? option_1 : undefined) : undefined), 120);
}

class Ended extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Exited", "TimedOut"];
    }
}

function Ended_$reflection() {
    return union_type("Voice.Ended", [], Ended, () => [[["code", int32_type], ["stderr", string_type]], [["seconds", float64_type], ["stderr", string_type]]]);
}

function spawnText(command, vars, input, seconds) {
    return fromContinuations((tupledArg) => {
        const ok = tupledArg[0];
        const options = {
            shell: true,
            detached: true,
            stdio: ["pipe", "ignore", "pipe"],
            env: Object.assign({}, process.env, createObj(map_1((tupledArg_1) => [tupledArg_1[0], tupledArg_1[1]], vars))),
        };
        let matchValue;
        try {
            matchValue = (new FSharpResult$2(/* Ok */ 0, [childProcess.spawn(command, options)]));
        }
        catch (e) {
            matchValue = (new FSharpResult$2(/* Error */ 1, [e.message]));
        }
        if (matchValue.tag === 0) {
            const child = matchValue.fields[0];
            let err = "";
            let settled = false;
            let timer = defaultOf_1();
            const tail = () => {
                if (err.length > 300) {
                    return substring(err, err.length - 300);
                }
                else {
                    return err;
                }
            };
            const settle = (ended) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    ok(ended);
                }
            };
            child.stderr.on("data", ((chunk) => {
                err = (err + toString(chunk.toString("utf8")));
            }));
            child.stdin.on("error", ((_arg_2) => {
            }));
            child.on("error", ((e_1) => {
                settle(new Ended(/* Exited */ 0, [127, toString(e_1.message)]));
            }));
            child.on("close", ((code) => {
                settle(new Ended(/* Exited */ 0, [Operators_IsNull(code) ? 1 : code, tail().trim()]));
            }));
            timer = (setTimeout((() => {
                try {
                    (process).kill(op_UnaryNegation_Int32(child.pid), "SIGKILL");
                }
                catch (matchValue_1) {
                }
                settle(new Ended(/* TimedOut */ 1, [seconds, tail().trim()]));
            }), (seconds * 1000)));
            child.stdin.end(input, "utf8");
        }
        else {
            ok(new Ended(/* Exited */ 0, [127, matchValue.fields[0]]));
        }
    });
}

/**
 * The voice's text spoken by its command: the samples at 24 kHz mono, or why not. The command runs once per call,
 * with the text on stdin, the values in CV_VOICE, CV_LANG, CV_SPEED and CV_OUT, and `{out}` a fresh .wav path (the
 * file may hold any audio ffmpeg reads).
 */
export function speakCommand(voice, input) {
    return singleton_2.Delay(() => {
        const matchValue = voice.Provider;
        const matchValue_1 = plainValues(ofArray([["voice", voice.Name], ["lang", voice.Lang]]));
        if (matchValue.tag === 5) {
            const copyOfStruct = matchValue_1;
            if (copyOfStruct.tag === 0) {
                const dir = tempDir();
                return singleton_2.TryFinally(singleton_2.Delay(() => {
                    const out = join(ofArray([dir, "voice.wav"]));
                    const vars = ofArray([["CV_VOICE", voice.Name], ["CV_LANG", voice.Lang], ["CV_SPEED", voice.Speed.toString()], ["CV_OUT", out]]);
                    const seconds = commandTimeout();
                    return singleton_2.Bind(spawnText(fill(matchValue.fields[1]), vars, input, seconds), (_arg) => {
                        let input_2;
                        return (_arg.tag === 0) ? ((_arg.fields[0] !== 0) ? singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* CommandFailed */ 4, [matchValue.fields[0], _arg.fields[0], _arg.fields[1]])])) : ((!exists(out) ? true : (fileSize(out) === 0)) ? singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* CommandFailed */ 4, [matchValue.fields[0], 0, "no audio was written: the command did not create {out}"])])) : singleton_2.Return((input_2 = samplesOf(out), (input_2.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* CommandFailed */ 4, [matchValue.fields[0], 0, input_2.fields[0]])])) : (new FSharpResult$2(/* Ok */ 0, [input_2.fields[0]])))))) : singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* CommandFailed */ 4, [matchValue.fields[0], 1, (`timed out after ${_arg.fields[0]} s. ${_arg.fields[1]}`).trim()])]));
                    });
                }), () => {
                    remove(dir);
                });
            }
            else {
                return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [copyOfStruct.fields[0]]));
            }
        }
        else {
            return singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, [concat(providerName(matchValue), " is not a command voice")])]));
        }
    });
}

function tag(provider) {
    if (provider.tag === 5) {
        return "command";
    }
    else {
        return providerName(provider).toLocaleLowerCase();
    }
}

/**
 * The cache key of a piece of a non-Kokoro voice: 16 hex of the SHA-1 of everything that changes the sound.
 */
export function pieceKey(voice, input) {
    let command;
    const matchValue = voice.Provider;
    command = ((matchValue.tag === 5) ? matchValue.fields[1] : "");
    return substring(sha1Hex(toJson(["cv-voice 1", tag(voice.Provider), defaultArg(voice.Model, defaultOf_1()), voice.Name, voice.Lang, voice.Speed, defaultArg(voice.Instructions, defaultOf_1()), command, input])), 0, 16);
}

