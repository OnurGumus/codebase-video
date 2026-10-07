
import { class_type } from "../fable-library-js.5.19.0/Reflection.js";
import { FSharpResult$2 } from "../fable-library-js.5.19.0/Result.js";

export class ResultCE_ResultBuilder {
    constructor() {
    }
}

export function ResultCE_ResultBuilder_$reflection() {
    return class_type("FsToolkit.ErrorHandling.ResultCE.ResultBuilder", undefined, ResultCE_ResultBuilder);
}

export function ResultCE_ResultBuilder_$ctor() {
    return new ResultCE_ResultBuilder();
}

export function ResultCE_ResultBuilder__Zero(this$) {
    return new FSharpResult$2(/* Ok */ 0, [undefined]);
}

export const ResultCE_result = ResultCE_ResultBuilder_$ctor();

