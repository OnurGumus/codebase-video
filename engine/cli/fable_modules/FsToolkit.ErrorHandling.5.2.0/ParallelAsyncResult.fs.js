
import { Exception } from "../fable-library-js.5.19.0/Util.js";
import { class_type } from "../fable-library-js.5.19.0/Reflection.js";
import { singleton } from "../fable-library-js.5.19.0/AsyncBuilder.js";

export class InternalHelpers_AsyncResultErrorException$1 extends Exception {
    constructor(value) {
        super();
        this.value = value;
    }
}

export function InternalHelpers_AsyncResultErrorException$1_$reflection(gen0) {
    return class_type("FsToolkit.ErrorHandling.ParallelAsyncResult.InternalHelpers.AsyncResultErrorException`1", [gen0], InternalHelpers_AsyncResultErrorException$1, class_type("System.Exception"));
}

export function InternalHelpers_AsyncResultErrorException$1_$ctor_2B595(value) {
    return new InternalHelpers_AsyncResultErrorException$1(value);
}

export function InternalHelpers_AsyncResultErrorException$1__get_Value(this$) {
    return this$.value;
}

export function InternalHelpers_toBoxedAsync(input) {
    return singleton.Delay(() => singleton.Bind(input, (_arg) => ((_arg.tag === 1) ? singleton.Return((() => {
        throw InternalHelpers_AsyncResultErrorException$1_$ctor_2B595(_arg.fields[0]);
    })()) : singleton.Return(_arg.fields[0]))));
}

