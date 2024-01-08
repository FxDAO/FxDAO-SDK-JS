"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorCodeFromSimulated = exports.parseError = exports.ParseErrorType = exports.generateOptionalVaultKeyScVal = exports.calculateVaultIndex = void 0;
const stellar_sdk_1 = require("stellar-sdk");
const vaults_1 = require("./errors/vaults");
const satefy_pool_1 = require("./errors/satefy-pool");
function calculateVaultIndex(params) {
    return (params.collateral * 1000000000n) / params.debt;
}
exports.calculateVaultIndex = calculateVaultIndex;
function generateOptionalVaultKeyScVal(vaultKey) {
    const struct = [];
    struct.push(stellar_sdk_1.xdr.ScVal.scvSymbol(vaultKey[0]));
    if (vaultKey[0] === 'Some') {
        struct.push(stellar_sdk_1.xdr.ScVal.scvMap([
            new stellar_sdk_1.xdr.ScMapEntry({
                key: stellar_sdk_1.xdr.ScVal.scvSymbol('account'),
                val: (0, stellar_sdk_1.nativeToScVal)(vaultKey[1].account, { type: 'address' }),
            }),
            new stellar_sdk_1.xdr.ScMapEntry({
                key: stellar_sdk_1.xdr.ScVal.scvSymbol('denomination'),
                val: (0, stellar_sdk_1.nativeToScVal)(vaultKey[1].denomination, { type: 'symbol' }),
            }),
            new stellar_sdk_1.xdr.ScMapEntry({
                key: stellar_sdk_1.xdr.ScVal.scvSymbol('index'),
                val: (0, stellar_sdk_1.nativeToScVal)(vaultKey[1].index, { type: 'u128' }),
            }),
        ]));
    }
    return stellar_sdk_1.xdr.ScVal.scvVec(struct);
}
exports.generateOptionalVaultKeyScVal = generateOptionalVaultKeyScVal;
var ParseErrorType;
(function (ParseErrorType) {
    ParseErrorType[ParseErrorType["vault"] = 0] = "vault";
    ParseErrorType[ParseErrorType["safety_pool"] = 1] = "safety_pool";
    ParseErrorType[ParseErrorType["stable_pool"] = 2] = "stable_pool";
    ParseErrorType[ParseErrorType["governance"] = 3] = "governance";
})(ParseErrorType = exports.ParseErrorType || (exports.ParseErrorType = {}));
function parseError(type, response) {
    const error = errorCodeFromSimulated(response);
    let message;
    if (error === 10) {
        message = 'Not enough funds, make sure you have enough funds to complete the process';
    }
    else {
        switch (type) {
            case ParseErrorType.vault:
                message = vaults_1.VaultsErrors[error] || 'Unhandled error, please contact support (Code: Vault-00)';
                break;
            case ParseErrorType.safety_pool:
                message = satefy_pool_1.SafetyPoolErrors[error] || 'Unhandled error, please contact support (Code: SafetyPool-00)';
                break;
            default:
                message = 'Unhandled error';
                break;
        }
    }
    return {
        error,
        message,
        diagnostic: response.error,
    };
}
exports.parseError = parseError;
function errorCodeFromSimulated(response) {
    let errorCode;
    try {
        const errorCodeVal = response.events
            .slice(-1)[0]
            .event()
            .body()
            .value()
            .data()
            .value()
            .slice(-1)[0]
            .value();
        errorCode = (0, stellar_sdk_1.scValToNative)(errorCodeVal);
    }
    catch (e) {
        errorCode = -1;
    }
    return errorCode;
}
exports.errorCodeFromSimulated = errorCodeFromSimulated;
