import { Networks } from 'soroban-client';

export type u32 = number;
export type u128 = bigint;

export enum Denomination {
  usd = 'usd',
  eur = 'eur',
}

export enum UpdateVaultOperationType {
  increase_collateral = 'increase_collateral',
  increase_debt = 'increase_debt',
  pay_debt = 'pay_debt',
}

export enum FxDAOContract {
  VAULTS = 'VAULTS',
  SAFETY_POOL_USD = 'SAFETY_POOL_USD',
  SAFETY_POOL_EUR = 'SAFETY_POOL_EUR',
  STABLE_POOL_USD = 'STABLE_POOL_USD',
}

export enum FxDAOContractMethods {
  get_vault = 'get_vault',
  get_vaults = 'get_vaults',
  new_vault = 'new_vault',
  get_vaults_info = 'get_vaults_info',
}

export interface FxDAOParams {
  /*
   * Simulation account is an existing account in the selected network, it doesn't need to be a owned account.
   * This account is used to simulate transactions that won't send a transaction (for example when you get the rate of a currency)
   */
  simulationAccount: string;
  contracts: Array<{ id: string; contract: FxDAOContract }>;
  defaultFee: string;
  rpc: string;
  allowHttp?: boolean;
  network: Networks;
}
