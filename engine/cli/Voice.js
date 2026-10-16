
import { Record, Union } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { int32_type, float64_type, record_type, class_type, tuple_type, option_type, union_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { empty, ofArray, singleton } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { concat } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { env, toolHome, readJson, exists, resolve, dirname, join } from "./Node.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";
import { orElse, defaultArg, value as value_3, some } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { ofArray as ofArray_1 } from "./fable_modules/fable-library-js.5.19.0/Map.js";
import { choose as choose_1 } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { disposeSafe, getEnumerator, comparePrimitives } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { defaultOf } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { ResultCE_result, ResultCE_ResultBuilder__Zero } from "./fable_modules/FsToolkit.ErrorHandling.5.2.0/ResultCE.fs.js";

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
            return some(value_3(project));
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

/**
 * The voice settings of the video in workspace `ws`: None for a silent clip.
 */
export function choose(ws, script) {
    let activePatternResult, p, chosen;
    if (((script != null && Object.hasOwn(script, "voice"))) && Operators_IsNull(script.voice)) {
        return new FSharpResult$2(/* Ok */ 0, [undefined]);
    }
    else {
        const input_9 = projectSettings(ws);
        if (input_9.tag === 1) {
            return new FSharpResult$2(/* Error */ 1, [input_9.fields[0]]);
        }
        else {
            const spec = value_3(pick(input_9.fields[0], script));
            const provider = defaultArg(text(spec, "provider"), "kokoro");
            const input_7 = (activePatternResult = $007CNamed$007C_$007C(provider), (activePatternResult != null) ? ((p = activePatternResult, new FSharpResult$2(/* Ok */ 0, [p]))) : (new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, [concat("unknown provider \"", provider, "\" (voice.json, script.json): use one of ", "kokoro, elevenlabs, openai, azure, google, command")])])));
            if (input_7.tag === 1) {
                return new FSharpResult$2(/* Error */ 1, [input_7.fields[0]]);
            }
            else {
                const kind = input_7.fields[0];
                const voice = text(spec, "voice");
                const input_5 = (voice == null) ? ((kind === "kokoro") ? (new FSharpResult$2(/* Ok */ 0, ["af_heart"])) : ((kind === "command") ? (new FSharpResult$2(/* Ok */ 0, [""])) : (new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, [concat("provider \"", kind, "\" needs a \"voice\" in voice.json or script.json")])])))) : (new FSharpResult$2(/* Ok */ 0, [voice]));
                if (input_5.tag === 1) {
                    return new FSharpResult$2(/* Error */ 1, [input_5.fields[0]]);
                }
                else {
                    let input_3;
                    switch (kind) {
                        case "elevenlabs": {
                            input_3 = (new FSharpResult$2(/* Ok */ 0, [Provider.ElevenLabs]));
                            break;
                        }
                        case "openai": {
                            input_3 = (new FSharpResult$2(/* Ok */ 0, [Provider.OpenAI]));
                            break;
                        }
                        case "azure": {
                            input_3 = (new FSharpResult$2(/* Ok */ 0, [new Provider(/* Azure */ 3, [defaultArg(env("AZURE_SPEECH_REGION"), "")])]));
                            break;
                        }
                        case "google": {
                            input_3 = (new FSharpResult$2(/* Ok */ 0, [Provider.Google]));
                            break;
                        }
                        case "command": {
                            let input_2;
                            const option_1 = text(spec, "command");
                            input_2 = ((option_1 == null) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, ["provider \"command\" needs a \"command\": a command name from voices.json"])])) : (new FSharpResult$2(/* Ok */ 0, [option_1])));
                            if (input_2.tag === 1) {
                                input_3 = (new FSharpResult$2(/* Error */ 1, [input_2.fields[0]]));
                            }
                            else {
                                const command = input_2.fields[0];
                                const input = commandText(command);
                                input_3 = ((input.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [new Provider(/* Command */ 5, [command, input.fields[0]])])));
                            }
                            break;
                        }
                        default:
                            input_3 = (new FSharpResult$2(/* Ok */ 0, [Provider.Kokoro]));
                    }
                    if (input_3.tag === 1) {
                        return new FSharpResult$2(/* Error */ 1, [input_3.fields[0]]);
                    }
                    else {
                        return new FSharpResult$2(/* Ok */ 0, [(chosen = input_3.fields[0], new Choice(chosen, input_5.fields[0], orElse(text(spec, "model"), (chosen.tag === 1) ? "eleven_multilingual_v2" : ((chosen.tag === 2) ? "gpt-4o-mini-tts" : undefined)), text(spec, "instructions"), others(spec)))]);
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
            return empty();
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

/**
 * Before any work: the provider's key and the speed it can take.
 */
export function check(choice, speed) {
    let input_5;
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
        input_5 = result_1;
    }
    finally {
        if (!(resource === defaultOf())) {
            let copyOfStruct_1 = resource;
            disposeSafe(copyOfStruct_1);
        }
    }
    if (input_5.tag === 1) {
        return new FSharpResult$2(/* Error */ 1, [input_5.fields[0]]);
    }
    else {
        const matchValue_1 = speedRange(choice.Provider);
        if (matchValue_1 == null) {
            return ResultCE_ResultBuilder__Zero(ResultCE_result);
        }
        else {
            const said = matchValue_1[2];
            const high = matchValue_1[1];
            let input_3;
            const value_1 = (matchValue_1[0] <= speed) && (speed <= high);
            const error_2 = new Failure(/* SettingsBad */ 1, [(`speed ${speed} is not one ${providerName(choice.Provider)} takes (${said}): `) + "change \"speed\" in script.json"]);
            input_3 = (value_1 ? (new FSharpResult$2(/* Ok */ 0, [undefined])) : (new FSharpResult$2(/* Error */ 1, [error_2])));
            if (input_3.tag === 1) {
                return new FSharpResult$2(/* Error */ 1, [input_3.fields[0]]);
            }
            else {
                return new FSharpResult$2(/* Ok */ 0, [undefined]);
            }
        }
    }
}

