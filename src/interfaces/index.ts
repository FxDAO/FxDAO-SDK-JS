import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  Networks,
  scValToBigInt,
  scValToNative,
  SorobanRpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

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

export enum Denomination {
  USD = 'USD',
  EUR = 'EUR',
}

export enum UpdateVaultOperationType {
  increase_collateral = 'increase_collateral',
  increase_debt = 'increase_debt',
  pay_debt = 'pay_debt',
}

export enum FxDAOContracts {
  VAULTS = 'VAULTS',
  SAFETY_POOL_USD = 'SAFETY_POOL_USD',
  SAFETY_POOL_EUR = 'SAFETY_POOL_EUR',
  STABLE_POOL_USD = 'STABLE_POOL_USD',
}

export enum FxDAOVaultsContractMethods {
  get_core_state = 'get_core_state',
  set_currency_rate = 'set_currency_rate',
  get_vault = 'get_vault',
  get_vaults = 'get_vaults',
  new_vault = 'new_vault',
  get_vaults_info = 'get_vaults_info',
  redeem = 'redeem',
  liquidate = 'liquidate',
}

export enum FxDAOSafetyPoolContractMethods {
  get_core_state = 'get_core_state',
  get_core_stats = 'get_core_stats',
  deposit = 'deposit',
  get_deposit = 'get_deposit',
  withdraw = 'withdraw',
  withdraw_col = 'withdraw_col',
  liquidate = 'liquidate',
}

export interface DefaultContractParams {
  /**
   * These are all from the Stellar SDK, import them and pass them to the object.
   * This is done this way because the `@stellar/stellar-sdk` package and its dependencies rely a lot on `instance of` logic,
   * that means that we need to use the same objects everytime we can so we avoid issues in those conditions.
   */
  stellarSDK: {
    Account: typeof Account;
    Address: typeof Address;
    Contract: typeof Contract;
    xdr: typeof xdr;
    TransactionBuilder: typeof TransactionBuilder;
    SorobanRpc: typeof SorobanRpc;
    nativeToScVal: typeof nativeToScVal;
    scValToNative: typeof scValToNative;
    scValToBigInt: typeof scValToBigInt;
  };

  /*
   * Simulation account is an existing account in the selected network, it doesn't need to be a owned account.
   * This account is used to simulate transactions that won't send a transaction (for example when you get the rate of a currency)
   */
  simulationAccount: string;
  contractId: string;
  defaultFee: string;
  rpc: string;
  allowHttp?: boolean;
  network: Networks;
}

export interface DefaultContractTransactionGenerationResponse {
  transactionXDR: string;
  // Check later if we can come back to doing the simulation inside the SDK
  // preparedTransactionXDR: string;
  // simulated: Api.SimulateTransactionSuccessResponse | Api.SimulateTransactionRestoreResponse;
}
