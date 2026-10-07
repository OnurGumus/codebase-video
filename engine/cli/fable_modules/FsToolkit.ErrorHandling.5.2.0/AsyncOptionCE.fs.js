
import { class_type } from "../fable-library-js.5.19.0/Reflection.js";
import { singleton } from "../fable-library-js.5.19.0/AsyncBuilder.js";
import { value as value_2, some } from "../fable-library-js.5.19.0/Option.js";

export class AsyncOptionCE_AsyncOptionBuilder {
    constructor() {
    }
}

export function AsyncOptionCE_AsyncOptionBuilder_$reflection() {
    return class_type("FsToolkit.ErrorHandling.AsyncOptionCE.AsyncOptionBuilder", undefined, AsyncOptionCE_AsyncOptionBuilder);
}

export function AsyncOptionCE_AsyncOptionBuilder_$ctor() {
    return new AsyncOptionCE_AsyncOptionBuilder();
}

export function AsyncOptionCE_AsyncOptionBuilder__While_78DDE493(this$, guard, computation) {
    if (!guard()) {
        return singleton.Return(some(undefined));
    }
    else {
        return singleton.Bind(computation, (x) => {
            if (x == null) {
                return singleton.Return(undefined);
            }
            else {
                value_2(x);
                return AsyncOptionCE_AsyncOptionBuilder__While_78DDE493(this$, guard, computation);
            }
        });
    }
}

export const AsyncOptionCE_asyncOption = AsyncOptionCE_AsyncOptionBuilder_$ctor();

