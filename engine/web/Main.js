
import { api } from "./Stage.js";
import { install } from "./Kit.js";
import { Operators_IsNull } from "./fable_modules/fable-library-js.5.19.0/FSharp.Core.js";
import { run } from "./Frame.js";

window["Stage"] = api;

window["Kit"] = install();

if (!Operators_IsNull(document.getElementById("modules"))) {
    run();
}

