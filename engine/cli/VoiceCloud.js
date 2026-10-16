
import { toString, Union, Record } from "./fable_modules/fable-library-js.5.19.0/Types.js";
import { union_type, obj_type, int32_type, record_type, list_type, tuple_type, string_type } from "./fable_modules/fable-library-js.5.19.0/Reflection.js";
import { value as value_1, some, defaultArg } from "./fable_modules/fable-library-js.5.19.0/Option.js";
import { writeBytes, join as join_1, remove, parseJson, fromJs, toJson, env } from "./Node.js";
import { substring, replace, join, split, trimEnd } from "./fable_modules/fable-library-js.5.19.0/String.js";
import { escapeDataString, int32ToString, round, defaultOf, createObj } from "./fable_modules/fable-library-js.5.19.0/Util.js";
import { tryPick, append as append_1, filter, fold, empty as empty_1, singleton as singleton_1, ofArray, map } from "./fable_modules/fable-library-js.5.19.0/List.js";
import { item, equalsWith } from "./fable_modules/fable-library-js.5.19.0/Array.js";
import { collect, empty, singleton, append, delay, toList } from "./fable_modules/fable-library-js.5.19.0/Seq.js";
import { singleton as singleton_2 } from "./fable_modules/fable-library-js.5.19.0/AsyncBuilder.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { sleep } from "./fable_modules/fable-library-js.5.19.0/Async.js";
import { providerName, speakCommand, Failure, samplesOf, tempDir } from "./Voice.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.5.19.0/Result.js";

/**
 * A request ready to send: where, with which headers, and the body (text, sent as UTF-8).
 */
export class Request extends Record {
    constructor(Url, Headers, Body) {
        super();
        this.Url = Url;
        this.Headers = Headers;
        this.Body = Body;
    }
}

export function Request_$reflection() {
    return record_type("VoiceCloud.Request", [], Request, () => [["Url", string_type], ["Headers", list_type(tuple_type(string_type, string_type))], ["Body", string_type]]);
}

function setting(name) {
    return defaultArg(env(name), "");
}

function baseUrl(variable, real) {
    return trimEnd(defaultArg(env(variable), real), "/");
}

function json(fields) {
    return toJson(createObj(map((tupledArg) => [tupledArg[0], tupledArg[1]], fields)));
}

function langCode(regional, lang) {
    const matchValue = split(lang, ["-"], undefined, 0);
    if (!equalsWith((x, y) => (x === y), matchValue, defaultOf()) && (matchValue.length === 1)) {
        const language = item(0, matchValue);
        return language.toLocaleLowerCase();
    }
    else if (regional) {
        const parts_1 = matchValue;
        return (item(0, parts_1).toLocaleLowerCase() + "-") + join("-", parts_1.slice(1, parts_1.length)).toLocaleUpperCase();
    }
    else {
        return item(0, matchValue).toLocaleLowerCase();
    }
}

function xmlEscape(s) {
    return replace(replace(replace(replace(replace(s, "&", "&amp;"), "<", "&lt;"), ">", "&gt;"), "\"", "&quot;"), "\'", "&apos;");
}

function rate(speed) {
    const percent = ~~round((speed - 1) * 100) | 0;
    return (((percent >= 0) ? "+" : "") + int32ToString(percent)) + "%";
}

/**
 * The request for a cloud voice saying the text (the table of the design's "The requests"). A Kokoro or command
 * voice has no request: it gets an empty one.
 */
export function requestFor(voice, input) {
    const jsonType = ["Content-Type", "application/json"];
    const matchValue = voice.Provider;
    switch (matchValue.tag) {
        case 2:
            return new Request(baseUrl("CODEBASE_VIDEO_OPENAI_URL", "https://api.openai.com") + "/v1/audio/speech", ofArray([["Authorization", "Bearer " + setting("OPENAI_API_KEY")], jsonType]), json(toList(delay(() => append(singleton(["model", defaultArg(voice.Model, "gpt-4o-mini-tts")]), delay(() => append(singleton(["input", input]), delay(() => append(singleton(["voice", voice.Name]), delay(() => {
                let matchValue_1;
                return append((matchValue_1 = voice.Instructions, (matchValue_1 == null) ? (empty()) : singleton(["instructions", matchValue_1])), delay(() => append(singleton(["response_format", "wav"]), delay(() => singleton(["speed", voice.Speed])))));
            }))))))))));
        case 3: {
            const root_2 = baseUrl("CODEBASE_VIDEO_AZURE_URL", ("https://" + matchValue.fields[0]) + ".tts.speech.microsoft.com");
            const lang = xmlEscape(langCode(true, voice.Lang));
            return new Request(root_2 + "/cognitiveservices/v1", ofArray([["Ocp-Apim-Subscription-Key", setting("AZURE_SPEECH_KEY")], ["Content-Type", "application/ssml+xml"], ["X-Microsoft-OutputFormat", "riff-24khz-16bit-mono-pcm"], ["User-Agent", "codebase-video"]]), (((((((("<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xml:lang=\"" + lang) + "\">") + "<voice name=\"") + xmlEscape(voice.Name)) + "\"><prosody rate=\"") + rate(voice.Speed)) + "\">") + xmlEscape(input)) + "</prosody></voice></speak>");
        }
        case 4: {
            const root_3 = baseUrl("CODEBASE_VIDEO_GOOGLE_URL", "https://texttospeech.googleapis.com");
            const audio = {
                audioEncoding: "LINEAR16",
                sampleRateHertz: 24000,
                speakingRate: voice.Speed,
            };
            const spoken = {
                languageCode: langCode(true, voice.Lang),
                name: voice.Name,
            };
            return new Request((root_3 + "/v1/text:synthesize?key=") + escapeDataString(setting("GOOGLE_API_KEY")), singleton_1(jsonType), json(ofArray([["input", {
                text: input,
            }], ["voice", spoken], ["audioConfig", audio]])));
        }
        case 0:
        case 5:
            return new Request("", empty_1(), "");
        default:
            return new Request(((baseUrl("CODEBASE_VIDEO_ELEVENLABS_URL", "https://api.elevenlabs.io") + "/v1/text-to-speech/") + escapeDataString(voice.Name)) + "?output_format=wav_24000", ofArray([["xi-api-key", setting("ELEVENLABS_API_KEY")], jsonType]), json(ofArray([["text", input], ["model_id", defaultArg(voice.Model, "eleven_multilingual_v2")], ["language_code", langCode(false, voice.Lang)], ["voice_settings", {
                speed: voice.Speed,
            }]])));
    }
}

class Reply extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Got", "Down"];
    }
}

function Reply_$reflection() {
    return union_type("VoiceCloud.Reply", [], Reply, () => [[["status", int32_type], ["bytes", obj_type]], [["message", string_type]]]);
}

function scrub(secrets, message) {
    return fold((m, s_1) => replace(replace(m, s_1, "***"), escapeDataString(s_1), "***"), message, filter((s) => (s !== ""), secrets));
}

function secretsOf(request) {
    return append_1(toList(delay(() => collect((matchValue) => singleton(replace(matchValue[1], "Bearer ", "")), request.Headers))), singleton_1(setting("GOOGLE_API_KEY")));
}

function send(request) {
    return singleton_2.Delay(() => singleton_2.TryWith(singleton_2.Delay(() => {
        const headers = createObj(map((tupledArg) => [tupledArg[0], tupledArg[1]], request.Headers));
        return singleton_2.Bind(fromJs(fetch(request.Url, { method: 'POST', headers: headers, body: request.Body, signal: AbortSignal.timeout(120000) })
    .then(async r => ({ status: r.status, bytes: Buffer.from(await r.arrayBuffer()) }))), (_arg) => {
            const r = _arg;
            return singleton_2.Return(new Reply(/* Got */ 0, [r.status, r.bytes]));
        });
    }), (_arg_1) => {
        const e = _arg_1;
        const cause = e.cause;
        const why = Operators_IsNull(cause) ? e.message : (((e.message + " (") + toString(cause.message)) + ")");
        return singleton_2.Return(new Reply(/* Down */ 1, [why]));
    }));
}

function retryable(reply) {
    if (reply.tag === 0) {
        const status = reply.fields[0] | 0;
        if (status === 429) {
            return true;
        }
        else {
            return status >= 500;
        }
    }
    else {
        return true;
    }
}

function deliver(request) {
    return singleton_2.Delay(() => singleton_2.Bind(send(request), (_arg) => {
        const first = _arg;
        return retryable(first) ? singleton_2.Bind(sleep(2000), () => singleton_2.ReturnFrom(send(request))) : singleton_2.Return(first);
    }));
}

function messageOf(body) {
    const said = defaultArg((() => {
        try {
            const o = parseJson(body);
            const detail = o.detail;
            const error = o.error;
            return tryPick((v) => {
                if (typeof v === 'string' && v !== '') {
                    return v;
                }
                else {
                    return undefined;
                }
            }, ofArray([Operators_IsNull(detail) ? defaultOf() : detail.message, Operators_IsNull(detail) ? defaultOf() : detail, Operators_IsNull(error) ? defaultOf() : error.message]));
        }
        catch (matchValue) {
            return undefined;
        }
    })(), body);
    if (said.length > 300) {
        return substring(said, 0, 300);
    }
    else {
        return said;
    }
}

function audioBytes(provider, bytes) {
    if (provider.tag === 4) {
        try {
            const content = parseJson(bytes.toString('utf8')).audioContent;
            return (typeof content === 'string' && content !== '') ? some(Buffer.from(content, 'base64')) : undefined;
        }
        catch (matchValue) {
            return undefined;
        }
    }
    else {
        return some(bytes);
    }
}

function convert(name, bytes) {
    if (bytes != null) {
        const data = value_1(bytes);
        const dir = tempDir();
        try {
            const file = join_1(ofArray([dir, "reply.audio"]));
            writeBytes(file, data);
            const input_1 = samplesOf(file);
            return (input_1.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [new Failure(/* Refused */ 2, [name, 200, "the reply was not audio: " + input_1.fields[0]])])) : (new FSharpResult$2(/* Ok */ 0, [input_1.fields[0]]));
        }
        finally {
            remove(dir);
        }
    }
    else {
        return new FSharpResult$2(/* Error */ 1, [new Failure(/* Refused */ 2, [name, 200, "the reply was not audio: no audioContent in it"])]);
    }
}

/**
 * The voice's text spoken by its provider: the samples at 24 kHz mono, or why not. Never called for Kokoro.
 */
export function speak(voice, input) {
    const matchValue = voice.Provider;
    switch (matchValue.tag) {
        case 5:
            return speakCommand(voice, input);
        case 0:
            return singleton_2.Delay(() => singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* SettingsBad */ 1, ["Kokoro is spoken by the Kokoro worker, not by a cloud service"])])));
        default: {
            const provider = matchValue;
            return singleton_2.Delay(() => {
                const name = providerName(provider);
                const request = requestFor(voice, input);
                const secrets = secretsOf(request);
                return singleton_2.Bind(deliver(request), (_arg) => {
                    let status;
                    return (_arg.tag === 0) ? (((status = (_arg.fields[0] | 0), (status >= 200) && (status < 300))) ? singleton_2.Return(convert(name, audioBytes(provider, _arg.fields[1]))) : singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* Refused */ 2, [name, _arg.fields[0], scrub(secrets, messageOf(_arg.fields[1].toString('utf8')))])]))) : singleton_2.Return(new FSharpResult$2(/* Error */ 1, [new Failure(/* Unreachable */ 3, [name, scrub(secrets, _arg.fields[0])])]));
                });
            });
        }
    }
}

