import { Networks, SorobanRpc } from 'soroban-client';
export type u32 = number;
export type i32 = number;
export type u64 = bigint;
export type i64 = bigint;
export type u128 = bigint;
export type i128 = bigint;
export type u256 = bigint;
export type i256 = bigint;
export type Option<T> = T | undefined;
export type Typepoint = bigint;
export type Duration = bigint;
export type address = string;
export type SymbolType = string;
export declare enum Denomination {
    usd = "usd",
    eur = "eur"
}
export declare enum UpdateVaultOperationType {
    increase_collateral = "increase_collateral",
    increase_debt = "increase_debt",
    pay_debt = "pay_debt"
}
export declare enum FxDAOContracts {
    VAULTS = "VAULTS",
    SAFETY_POOL_USD = "SAFETY_POOL_USD",
    SAFETY_POOL_EUR = "SAFETY_POOL_EUR",
    STABLE_POOL_USD = "STABLE_POOL_USD"
}
export declare enum FxDAOVaultsContractMethods {
    set_currency_rate = "set_currency_rate",
    get_vault = "get_vault",
    get_vaults = "get_vaults",
    new_vault = "new_vault",
    get_vaults_info = "get_vaults_info",
    redeem = "redeem",
    liquidate = "liquidate"
}
export declare enum FxDAOSafetyPoolContractMethods {
    get_core_state = "get_core_state",
    get_core_stats = "get_core_stats",
    deposit = "deposit",
    get_deposit = "get_deposit",
    withdraw = "withdraw",
    withdraw_col = "withdraw_col",
    liquidate = "liquidate"
}
export interface DefaultContractParams {
    simulationAccount: string;
    contractId: string;
    defaultFee: string;
    rpc: string;
    allowHttp?: boolean;
    network: Networks;
}
export interface DefaultContractTransactionGenerationResponse {
    transactionXDR: string;
    preparedTransactionXDR: string;
    simulated: SorobanRpc.SimulateTransactionSuccessResponse | SorobanRpc.SimulateTransactionRestoreResponse;
}
//# sourceMappingURL=index.d.ts.map