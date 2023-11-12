import { SorobanRpc, xdr } from 'soroban-client';
import { VaultsTypes } from './interfaces/vaults';
export declare function calculateVaultIndex(params: {
    collateral: bigint;
    debt: bigint;
}): bigint;
export declare function generateOptionalVaultKeyScVal(vaultKey: VaultsTypes['OptionalVaultKey']): xdr.ScVal;
export declare enum ParseErrorType {
    vault = 0,
    safety_pool = 1,
    stable_pool = 2,
    governance = 3
}
export declare function parseError(type: ParseErrorType, response: SorobanRpc.SimulateTransactionErrorResponse): {
    error: number;
    message: string;
    diagnostic?: string;
};
export declare function errorCodeFromSimulated(response: SorobanRpc.SimulateTransactionErrorResponse): number | -1;
//# sourceMappingURL=utils.d.ts.map