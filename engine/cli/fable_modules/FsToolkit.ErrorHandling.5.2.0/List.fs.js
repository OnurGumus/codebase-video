
import { append, singleton as singleton_1, empty, reverse, tail, cons, head, isEmpty } from "../fable-library-js.5.19.0/List.js";
import { FSharpResult$2 } from "../fable-library-js.5.19.0/Result.js";
import { singleton } from "../fable-library-js.5.19.0/AsyncBuilder.js";
import { some, value as value_10 } from "../fable-library-js.5.19.0/Option.js";

function traverseResultM$0027(state_mut, f_mut, xs_mut) {
    traverseResultM$0027:
    while (true) {
        const state = state_mut, f = f_mut, xs = xs_mut;
        if (!isEmpty(xs)) {
            let r;
            const input_4 = f(head(xs));
            if (input_4.tag === 1) {
                r = (new FSharpResult$2(/* Error */ 1, [input_4.fields[0]]));
            }
            else {
                const input_2 = state;
                r = ((input_2.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_2.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [cons(input_4.fields[0], input_2.fields[0])])));
            }
            if (r.tag === 1) {
                return r;
            }
            else {
                state_mut = r;
                f_mut = f;
                xs_mut = tail(xs);
                continue traverseResultM$0027;
            }
        }
        else {
            const input_1 = state;
            if (input_1.tag === 1) {
                return new FSharpResult$2(/* Error */ 1, [input_1.fields[0]]);
            }
            else {
                return new FSharpResult$2(/* Ok */ 0, [reverse(input_1.fields[0])]);
            }
        }
        break;
    }
}

function traverseAsyncResultM$0027(state, f, xs) {
    if (!isEmpty(xs)) {
        return singleton.Delay(() => singleton.Bind(singleton.Delay(() => singleton.Bind(state, (input_1_3) => {
            const input_10 = input_1_3;
            if (input_10.tag === 1) {
                return singleton.Return(new FSharpResult$2(/* Error */ 1, [input_10.fields[0]]));
            }
            else {
                const x_2 = f(head(xs));
                return singleton.Bind(x_2, (x$0027_1) => {
                    let value_2;
                    const input_6 = x$0027_1;
                    value_2 = ((input_6.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_6.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [cons(input_6.fields[0], input_10.fields[0])])));
                    return singleton.Return(value_2);
                });
            }
        })), (_arg_2) => {
            const r = _arg_2;
            return (r.tag === 1) ? singleton.Return(r) : singleton.ReturnFrom(traverseAsyncResultM$0027(singleton.Return(r), f, tail(xs)));
        }));
    }
    else {
        return singleton.Bind(state, (x$0027) => {
            let value;
            const input_2 = x$0027;
            value = ((input_2.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_2.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [reverse(input_2.fields[0])])));
            return singleton.Return(value);
        });
    }
}

export function traverseResultM(f, xs) {
    return traverseResultM$0027(new FSharpResult$2(/* Ok */ 0, [empty()]), f, xs);
}

export function sequenceResultM(xs) {
    return traverseResultM((x) => x, xs);
}

export function traverseAsyncResultM(f, xs) {
    return traverseAsyncResultM$0027(singleton.Return(new FSharpResult$2(/* Ok */ 0, [empty()])), f, xs);
}

export function sequenceAsyncResultM(xs) {
    return traverseAsyncResultM((x) => x, xs);
}

function traverseResultA$0027(state_mut, f_mut, xs_mut) {
    traverseResultA$0027:
    while (true) {
        const state = state_mut, f = f_mut, xs = xs_mut;
        if (!isEmpty(xs)) {
            const xs_1 = tail(xs);
            const matchValue = f(head(xs));
            const copyOfStruct = state;
            if (copyOfStruct.tag === 1) {
                const copyOfStruct_1 = matchValue;
                if (copyOfStruct_1.tag === 0) {
                    state_mut = (new FSharpResult$2(/* Error */ 1, [copyOfStruct.fields[0]]));
                    f_mut = f;
                    xs_mut = xs_1;
                    continue traverseResultA$0027;
                }
                else {
                    state_mut = (new FSharpResult$2(/* Error */ 1, [cons(copyOfStruct_1.fields[0], copyOfStruct.fields[0])]));
                    f_mut = f;
                    xs_mut = xs_1;
                    continue traverseResultA$0027;
                }
            }
            else {
                const copyOfStruct_2 = matchValue;
                if (copyOfStruct_2.tag === 1) {
                    state_mut = (new FSharpResult$2(/* Error */ 1, [singleton_1(copyOfStruct_2.fields[0])]));
                    f_mut = f;
                    xs_mut = xs_1;
                    continue traverseResultA$0027;
                }
                else {
                    state_mut = (new FSharpResult$2(/* Ok */ 0, [cons(copyOfStruct_2.fields[0], copyOfStruct.fields[0])]));
                    f_mut = f;
                    xs_mut = xs_1;
                    continue traverseResultA$0027;
                }
            }
        }
        else {
            const input_1 = state;
            if (input_1.tag === 1) {
                return new FSharpResult$2(/* Error */ 1, [reverse(input_1.fields[0])]);
            }
            else {
                return new FSharpResult$2(/* Ok */ 0, [reverse(input_1.fields[0])]);
            }
        }
        break;
    }
}

function traverseAsyncResultA$0027(state, f, xs) {
    if (!isEmpty(xs)) {
        const xs_1 = tail(xs);
        return singleton.Delay(() => singleton.Bind(state, (_arg) => singleton.Bind(f(head(xs)), (_arg_1) => {
            const fR = _arg_1;
            const copyOfStruct = _arg;
            if (copyOfStruct.tag === 1) {
                const copyOfStruct_1 = fR;
                return (copyOfStruct_1.tag === 0) ? singleton.ReturnFrom(traverseAsyncResultA$0027(singleton.Return(new FSharpResult$2(/* Error */ 1, [copyOfStruct.fields[0]])), f, xs_1)) : singleton.ReturnFrom(traverseAsyncResultA$0027(singleton.Return(new FSharpResult$2(/* Error */ 1, [cons(copyOfStruct_1.fields[0], copyOfStruct.fields[0])])), f, xs_1));
            }
            else {
                const copyOfStruct_2 = fR;
                return (copyOfStruct_2.tag === 1) ? singleton.ReturnFrom(traverseAsyncResultA$0027(singleton.Return(new FSharpResult$2(/* Error */ 1, [singleton_1(copyOfStruct_2.fields[0])])), f, xs_1)) : singleton.ReturnFrom(traverseAsyncResultA$0027(singleton.Return(new FSharpResult$2(/* Ok */ 0, [cons(copyOfStruct_2.fields[0], copyOfStruct.fields[0])])), f, xs_1));
            }
        })));
    }
    else {
        return singleton.Bind(state, (x$0027) => {
            let value;
            const input_2 = x$0027;
            value = ((input_2.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [reverse(input_2.fields[0])])) : (new FSharpResult$2(/* Ok */ 0, [reverse(input_2.fields[0])])));
            return singleton.Return(value);
        });
    }
}

export function traverseResultA(f, xs) {
    return traverseResultA$0027(new FSharpResult$2(/* Ok */ 0, [empty()]), f, xs);
}

export function sequenceResultA(xs) {
    return traverseResultA((x) => x, xs);
}

function traverseValidationA$0027(state_mut, f_mut, xs_mut) {
    traverseValidationA$0027:
    while (true) {
        const state = state_mut, f = f_mut, xs = xs_mut;
        if (!isEmpty(xs)) {
            const xs_1 = tail(xs);
            const fR = f(head(xs));
            let matchResult, y, ys, errs1, errs2, errs;
            const copyOfStruct = state;
            if (copyOfStruct.tag === 1) {
                const copyOfStruct_1 = fR;
                if (copyOfStruct_1.tag === 0) {
                    matchResult = 2;
                    errs = copyOfStruct.fields[0];
                }
                else {
                    matchResult = 1;
                    errs1 = copyOfStruct.fields[0];
                    errs2 = copyOfStruct_1.fields[0];
                }
            }
            else {
                const copyOfStruct_2 = fR;
                if (copyOfStruct_2.tag === 1) {
                    matchResult = 2;
                    errs = copyOfStruct_2.fields[0];
                }
                else {
                    matchResult = 0;
                    y = copyOfStruct_2.fields[0];
                    ys = copyOfStruct.fields[0];
                }
            }
            switch (matchResult) {
                case 0: {
                    state_mut = (new FSharpResult$2(/* Ok */ 0, [cons(y, ys)]));
                    f_mut = f;
                    xs_mut = xs_1;
                    continue traverseValidationA$0027;
                }
                case 1: {
                    state_mut = (new FSharpResult$2(/* Error */ 1, [append(errs2, errs1)]));
                    f_mut = f;
                    xs_mut = xs_1;
                    continue traverseValidationA$0027;
                }
                default: {
                    state_mut = (new FSharpResult$2(/* Error */ 1, [errs]));
                    f_mut = f;
                    xs_mut = xs_1;
                    continue traverseValidationA$0027;
                }
            }
        }
        else {
            const input_1 = state;
            if (input_1.tag === 1) {
                return new FSharpResult$2(/* Error */ 1, [reverse(input_1.fields[0])]);
            }
            else {
                return new FSharpResult$2(/* Ok */ 0, [reverse(input_1.fields[0])]);
            }
        }
        break;
    }
}

export function traverseValidationA(f, xs) {
    return traverseValidationA$0027(new FSharpResult$2(/* Ok */ 0, [empty()]), f, xs);
}

export function sequenceValidationA(xs) {
    return traverseValidationA((x) => x, xs);
}

export function traverseAsyncResultA(f, xs) {
    return traverseAsyncResultA$0027(singleton.Return(new FSharpResult$2(/* Ok */ 0, [empty()])), f, xs);
}

export function sequenceAsyncResultA(xs) {
    return traverseAsyncResultA((x) => x, xs);
}

function traverseOptionM$0027(state_mut, f_mut, xs_mut) {
    traverseOptionM$0027:
    while (true) {
        const state = state_mut, f = f_mut, xs = xs_mut;
        if (!isEmpty(xs)) {
            let r;
            let matchValue;
            let x_4;
            const opt = f(head(xs));
            x_4 = ((opt == null) ? undefined : some(value_10(opt)));
            if (x_4 == null) {
                matchValue = undefined;
            }
            else {
                const _arg = value_10(x_4);
                let x_2;
                const opt_1 = state;
                x_2 = ((opt_1 == null) ? undefined : opt_1);
                matchValue = ((x_2 == null) ? undefined : cons(_arg, x_2));
            }
            r = ((matchValue == null) ? undefined : matchValue);
            if (r == null) {
                return r;
            }
            else {
                state_mut = r;
                f_mut = f;
                xs_mut = tail(xs);
                continue traverseOptionM$0027;
            }
        }
        else {
            const input_1 = state;
            if (input_1 == null) {
                return undefined;
            }
            else {
                return reverse(input_1);
            }
        }
        break;
    }
}

function traverseAsyncOptionM$0027(state, f, xs) {
    if (!isEmpty(xs)) {
        return singleton.Delay(() => singleton.Bind(singleton.Delay(() => {
            const input_8 = f(head(xs));
            return singleton.Bind(input_8, (x_2) => {
                if (x_2 == null) {
                    return singleton.Return(undefined);
                }
                else {
                    const _arg = value_10(x_2);
                    return singleton.Bind(state, (x_1) => {
                        if (x_1 == null) {
                            return singleton.Return(undefined);
                        }
                        else {
                            const _arg_1 = x_1;
                            return singleton.Return(cons(_arg, _arg_1));
                        }
                    });
                }
            });
        }), (_arg_2) => {
            const o = _arg_2;
            return (o == null) ? singleton.Return(o) : singleton.ReturnFrom(traverseAsyncOptionM$0027(singleton.Return(o), f, tail(xs)));
        }));
    }
    else {
        return singleton.Bind(state, (x$0027) => {
            let value;
            const input_2 = x$0027;
            value = ((input_2 == null) ? undefined : reverse(input_2));
            return singleton.Return(value);
        });
    }
}

/**
 * Applies the given function <paramref name="f"/> to each element in the input list <paramref name="xs"/>,
 * and returns an option containing a list of the results. If any of the function applications return None,
 * the entire result will be None.
 */
export function traverseOptionM(f, xs) {
    return traverseOptionM$0027(empty(), f, xs);
}

/**
 * Applies the monadic function <paramref name="id"/> to each element in the input list <paramref name="xs"/>,
 * and returns the result as an option. If any element in the list is None, the entire result will be None.
 */
export function sequenceOptionM(xs) {
    return traverseOptionM((x) => x, xs);
}

export function traverseAsyncOptionM(f, xs) {
    return traverseAsyncOptionM$0027(singleton.Return(empty()), f, xs);
}

export function sequenceAsyncOptionM(xs) {
    return traverseAsyncOptionM((x) => x, xs);
}

