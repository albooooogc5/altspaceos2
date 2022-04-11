"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBooleanOption = exports.getParameterLastValue = void 0;
// Get the last of potentially multiple values of a parameter in an MRE parameter set
function getParameterLastValue(params, name, dflValue = '') {
    const value = params[name];
    if (typeof (value) === 'string') {
        return value;
    }
    else if (Array.isArray(value)) {
        return value[value.length - 1];
    }
    return dflValue;
}
exports.getParameterLastValue = getParameterLastValue;
// Get the value of a boolean parameter whose value can be 'y' or 'n'
function getBooleanOption(params, name, dfl = false) {
    const assumeIfNotGiven = dfl ? 'y' : 'n';
    return (getParameterLastValue(params, name, assumeIfNotGiven)[0].toLowerCase() == 'y');
}
exports.getBooleanOption = getBooleanOption;
//# sourceMappingURL=parameter-set-util.js.map