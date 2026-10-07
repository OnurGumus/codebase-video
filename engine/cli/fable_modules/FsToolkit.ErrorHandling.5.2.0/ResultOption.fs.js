
import { FSharpResult$2 } from "../fable-library-js.5.19.0/Result.js";
import { value } from "../fable-library-js.5.19.0/Option.js";

/**
 * Combines two <c>Result</c> values that contain <c>Option</c> values into a single <c>Result</c> value that contains the tuple of the two values wrapped in an <c>Option</c>, if they are both <c>Some</c>.
 * 
 * Documentation is found here: <href>https://demystifyfp.gitbook.io/fstoolkit-errorhandling/fstoolkit.errorhandling/option/zip</href>
 */
export function zip(left, right) {
    const copyOfStruct = left;
    if (copyOfStruct.tag === 1) {
        return new FSharpResult$2(/* Error */ 1, [copyOfStruct.fields[0]]);
    }
    else {
        const copyOfStruct_1 = right;
        if (copyOfStruct_1.tag === 1) {
            return new FSharpResult$2(/* Error */ 1, [copyOfStruct_1.fields[0]]);
        }
        else {
            let matchResult, x1, x2;
            if (copyOfStruct.fields[0] != null) {
                if (copyOfStruct_1.fields[0] != null) {
                    matchResult = 0;
                    x1 = value(copyOfStruct.fields[0]);
                    x2 = value(copyOfStruct_1.fields[0]);
                }
                else {
                    matchResult = 1;
                }
            }
            else {
                matchResult = 1;
            }
            switch (matchResult) {
                case 0:
                    return new FSharpResult$2(/* Ok */ 0, [[x1, x2]]);
                default:
                    return new FSharpResult$2(/* Ok */ 0, [undefined]);
            }
        }
    }
}

/**
 * Takes two results and returns a tuple of the error pair
 * 
 * Documentation is found here: <href>https://demystifyfp.gitbook.io/fstoolkit-errorhandling/fstoolkit.errorhandling/option/ziperror</href>
 */
export function zipError(left, right) {
    const copyOfStruct = left;
    if (copyOfStruct.tag === 0) {
        return new FSharpResult$2(/* Ok */ 0, [copyOfStruct.fields[0]]);
    }
    else {
        const copyOfStruct_1 = right;
        if (copyOfStruct_1.tag === 0) {
            return new FSharpResult$2(/* Ok */ 0, [copyOfStruct_1.fields[0]]);
        }
        else {
            return new FSharpResult$2(/* Error */ 1, [[copyOfStruct.fields[0], copyOfStruct_1.fields[0]]]);
        }
    }
}

