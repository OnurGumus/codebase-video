
import { empty } from "../fable-library-js.5.19.0/Seq.js";
import { FSharpResult$2 } from "../fable-library-js.5.19.0/Result.js";
import { Operators_NullArg, Operators_IsNull } from "../fable-library-js.5.19.0/FSharp.Core.js";
import { disposeSafe, getEnumerator, defaultOf } from "../fable-library-js.5.19.0/Util.js";
import { singleton } from "../fable-library-js.5.19.0/AsyncBuilder.js";
import { ArgumentNullException_$ctor_Z721C83C5 } from "../fable-library-js.5.19.0/System.js";
import { value as value_1 } from "../fable-library-js.5.19.0/Option.js";

/**
 * Applies a function to each element of a sequence and returns a single result
 */
export function traverseResultM(f, xs) {
    const state = new FSharpResult$2(/* Ok */ 0, [empty()]);
    const xs_1 = xs;
    if (Operators_IsNull(xs_1)) {
        Operators_NullArg("xs");
    }
    if (state.tag === 0) {
        const oks = Array.from(state.fields[0]);
        let err = defaultOf();
        let ok = true;
        const e_1 = getEnumerator(xs_1);
        try {
            while (ok && e_1["System.Collections.IEnumerator.MoveNext"]()) {
                const matchValue = f(e_1["System.Collections.Generic.IEnumerator`1.get_Current"]());
                if (matchValue.tag === 1) {
                    err = matchValue.fields[0];
                    ok = false;
                }
                else {
                    void (oks.push(matchValue.fields[0]));
                }
            }
            return ok ? (new FSharpResult$2(/* Ok */ 0, [oks.slice()])) : (new FSharpResult$2(/* Error */ 1, [err]));
        }
        finally {
            disposeSafe(e_1);
        }
    }
    else {
        return new FSharpResult$2(/* Error */ 1, [state.fields[0]]);
    }
}

/**
 * Converts a sequence of results into a single result
 */
export function sequenceResultM(xs) {
    return traverseResultM((x) => x, xs);
}

/**
 * Applies a function to each element of a sequence and returns a single result
 */
export function traverseResultA(f, xs) {
    const state = new FSharpResult$2(/* Ok */ 0, [empty()]);
    const f_1 = f;
    const xs_1 = xs;
    if (Operators_IsNull(xs_1)) {
        Operators_NullArg("xs");
    }
    if (state.tag === 0) {
        const oks = Array.from(state.fields[0]);
        const errs_1 = [];
        const enumerator_1 = getEnumerator(xs_1);
        try {
            while (enumerator_1["System.Collections.IEnumerator.MoveNext"]()) {
                const matchValue_1 = f_1(enumerator_1["System.Collections.Generic.IEnumerator`1.get_Current"]());
                if (matchValue_1.tag === 1) {
                    void (errs_1.push(matchValue_1.fields[0]));
                }
                else if (errs_1.length === 0) {
                    void (oks.push(matchValue_1.fields[0]));
                }
            }
        }
        finally {
            disposeSafe(enumerator_1);
        }
        if (errs_1.length === 0) {
            return new FSharpResult$2(/* Ok */ 0, [oks.slice()]);
        }
        else {
            return new FSharpResult$2(/* Error */ 1, [errs_1.slice()]);
        }
    }
    else {
        const errs = Array.from(state.fields[0]);
        const enumerator = getEnumerator(xs_1);
        try {
            while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const matchValue = f_1(enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]());
                if (matchValue.tag === 0) {
                }
                else {
                    void (errs.push(matchValue.fields[0]));
                }
            }
        }
        finally {
            disposeSafe(enumerator);
        }
        return new FSharpResult$2(/* Error */ 1, [errs.slice()]);
    }
}

/**
 * Converts a sequence of results into a single result
 */
export function sequenceResultA(xs) {
    return traverseResultA((x) => x, xs);
}

/**
 * Applies a function to each element of a sequence and returns a single async result
 */
export function traverseAsyncResultM(f, xs) {
    const state = singleton.Delay(() => singleton.Return(new FSharpResult$2(/* Ok */ 0, [empty()])));
    const xs_1 = xs;
    if (Operators_IsNull(xs_1)) {
        Operators_NullArg("xs");
    }
    return singleton.Delay(() => singleton.Bind(state, (_arg) => {
        if (_arg.tag === 0) {
            const oks = Array.from(_arg.fields[0]);
            let err = defaultOf();
            let ok = true;
            return singleton.Using(getEnumerator(xs_1), (_arg_1) => {
                const e_1 = _arg_1;
                return singleton.Combine(singleton.While(() => (ok && e_1["System.Collections.IEnumerator.MoveNext"]()), singleton.Delay(() => singleton.Bind(f(e_1["System.Collections.Generic.IEnumerator`1.get_Current"]()), (_arg_2) => {
                    if (_arg_2.tag === 1) {
                        err = _arg_2.fields[0];
                        ok = false;
                        return singleton.Zero();
                    }
                    else {
                        void (oks.push(_arg_2.fields[0]));
                        return singleton.Zero();
                    }
                }))), singleton.Delay(() => singleton.Return(ok ? (new FSharpResult$2(/* Ok */ 0, [oks.slice()])) : (new FSharpResult$2(/* Error */ 1, [err])))));
            });
        }
        else {
            return singleton.Return(new FSharpResult$2(/* Error */ 1, [_arg.fields[0]]));
        }
    }));
}

/**
 * Converts a sequence of async results into a single async result
 */
export function sequenceAsyncResultM(xs) {
    return traverseAsyncResultM((x) => x, xs);
}

/**
 * Applies a function to each element of a sequence and returns a single async result
 */
export function traverseAsyncResultA(f, xs) {
    const state = singleton.Delay(() => singleton.Return(new FSharpResult$2(/* Ok */ 0, [empty()])));
    const f_1 = f;
    let xs_1_1;
    const value = xs;
    if (Operators_IsNull(value)) {
        throw ArgumentNullException_$ctor_Z721C83C5("xs");
    }
    else {
        xs_1_1 = value;
    }
    return singleton.Delay(() => singleton.Bind(state, (_arg) => {
        if (_arg.tag === 0) {
            const oks = Array.from(_arg.fields[0]);
            const errs_1 = [];
            return singleton.Combine(singleton.For(xs_1_1, (_arg_3) => singleton.Bind(f_1(_arg_3), (_arg_4) => {
                if (_arg_4.tag === 1) {
                    void (errs_1.push(_arg_4.fields[0]));
                    return singleton.Zero();
                }
                else if (errs_1.length === 0) {
                    void (oks.push(_arg_4.fields[0]));
                    return singleton.Zero();
                }
                else {
                    return singleton.Zero();
                }
            })), singleton.Delay(() => ((errs_1.length === 0) ? singleton.Return(new FSharpResult$2(/* Ok */ 0, [oks.slice()])) : singleton.Return(new FSharpResult$2(/* Error */ 1, [errs_1.slice()])))));
        }
        else {
            const errs = Array.from(_arg.fields[0]);
            return singleton.Combine(singleton.For(xs_1_1, (_arg_1) => singleton.Bind(f_1(_arg_1), (_arg_2) => {
                if (_arg_2.tag === 1) {
                    void (errs.push(_arg_2.fields[0]));
                    return singleton.Zero();
                }
                else {
                    return singleton.Zero();
                }
            })), singleton.Delay(() => singleton.Return(new FSharpResult$2(/* Error */ 1, [errs.slice()]))));
        }
    }));
}

/**
 * Converts a sequence of async results into a single async result
 */
export function sequenceAsyncResultA(xs) {
    return traverseAsyncResultA((x) => x, xs);
}

/**
 * Applies a function to each element of a sequence and returns a single option
 */
export function traverseOptionM(f, xs) {
    const state = empty();
    const xs_1 = xs;
    if (Operators_IsNull(xs_1)) {
        Operators_NullArg("xs");
    }
    if (state != null) {
        const initialValues = state;
        const values = Array.from(initialValues);
        let ok = true;
        const enumerator = getEnumerator(xs_1);
        try {
            while (ok && enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                const matchValue = f(enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]());
                if (matchValue == null) {
                    ok = false;
                }
                else {
                    const value = value_1(matchValue);
                    void (values.push(value));
                }
            }
            return ok ? values.slice() : undefined;
        }
        finally {
            disposeSafe(enumerator);
        }
    }
    else {
        return undefined;
    }
}

/**
 * Converts a sequence of options into a single option
 */
export function sequenceOptionM(xs) {
    return traverseOptionM((x) => x, xs);
}

/**
 * Applies a function to each element of a sequence and returns a single async option
 */
export function traverseAsyncOptionM(f, xs) {
    const state = singleton.Delay(() => singleton.Return(empty()));
    const xs_1 = xs;
    if (Operators_IsNull(xs_1)) {
        Operators_NullArg("xs");
    }
    return singleton.Delay(() => singleton.Bind(state, (_arg) => {
        if (_arg != null) {
            const initialValues = _arg;
            const values = Array.from(initialValues);
            let ok = true;
            return singleton.Using(getEnumerator(xs_1), (_arg_1) => {
                const enumerator = _arg_1;
                return singleton.Combine(singleton.While(() => (ok && enumerator["System.Collections.IEnumerator.MoveNext"]()), singleton.Delay(() => singleton.Bind(f(enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]()), (_arg_2) => {
                    if (_arg_2 == null) {
                        ok = false;
                        return singleton.Zero();
                    }
                    else {
                        const value = value_1(_arg_2);
                        void (values.push(value));
                        return singleton.Zero();
                    }
                }))), singleton.Delay(() => singleton.Return(ok ? values.slice() : undefined)));
            });
        }
        else {
            return singleton.Return(undefined);
        }
    }));
}

/**
 * Converts a sequence of async options into a single async option
 */
export function sequenceAsyncOptionM(xs) {
    return traverseAsyncOptionM((x) => x, xs);
}

