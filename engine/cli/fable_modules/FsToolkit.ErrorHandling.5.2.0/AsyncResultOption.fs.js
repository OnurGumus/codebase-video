
import { singleton } from "../fable-library-js.5.19.0/AsyncBuilder.js";
import { FSharpResult$2 } from "../fable-library-js.5.19.0/Result.js";
import { some, value as value_4 } from "../fable-library-js.5.19.0/Option.js";

export function AsyncResultOption_apply(applier, input) {
    return singleton.Bind(applier, (x_3) => singleton.Bind(input, (y_2) => {
        let copyOfStruct, copyOfStruct_1, input1_1, input2_1, x_1, y;
        const value = (copyOfStruct = x_3, (copyOfStruct.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [copyOfStruct.fields[0]])) : ((copyOfStruct_1 = y_2, (copyOfStruct_1.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [copyOfStruct_1.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [(input1_1 = copyOfStruct.fields[0], (input2_1 = copyOfStruct_1.fields[0], (input1_1 != null) ? ((input2_1 != null) ? ((x_1 = input1_1, (y = value_4(input2_1), some(x_1(y))))) : undefined) : undefined))])))));
        return singleton.Return(value);
    }));
}

/**
 * Replaces the wrapped value with unit
 */
export function AsyncResultOption_ignore(value) {
    return singleton.Bind(value, (x$0027) => {
        let input_2;
        let value_2;
        const input_4 = x$0027;
        value_2 = ((input_4.tag === 1) ? (new FSharpResult$2(/* Error */ 1, [input_4.fields[0]])) : (new FSharpResult$2(/* Ok */ 0, [(input_2 = input_4.fields[0], (input_2 == null) ? undefined : some(void value_4(input_2)))])));
        return singleton.Return(value_2);
    });
}

