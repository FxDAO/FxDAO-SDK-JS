import { address, Denomination, u128, u64 } from './index';

interface CoreStateType {
  col_token: address;
  stable_issuer: address;
  admin: address;
  protocol_manager: boolean;
  panic_mode: address;
  treasury: address;
  fee: u128;
  oracle: address;
}

type CoreDataKeys = ['CoreState'];

interface CurrencyType {
  active: boolean;
  contract: address;
  denomination: Denomination;
}

type CurrenciesDataKeys = ['Currency', Denomination];

type OptionalVaultKey = ['None'] | ['Some', VaultKey];

interface VaultsInfo {
  denomination: Denomination;
  lowest_key: OptionalVaultKey;
  min_col_rate: u128;
  min_debt_creation: u128;
  opening_col_rate: u128;
  total_col: u128;
  total_debt: u128;
  total_vaults: u64;
}

interface VaultKey {
  // Note: when using scvaltonative doesn't generate an Address and instead a regular string
  account: address;
  denomination: Denomination;
  index: u128;
}

interface Vault {
  account: address;
  denomination: Denomination;
  index: u128;
  next_key: OptionalVaultKey;
  total_collateral: u128;
  total_debt: u128;
}

interface VaultIndexKey {
  denomination: string;
  user: address;
}

type VaultsDataKeys = ['VaultsInfo', Denomination] | ['Vault', VaultKey] | ['VaultIndex', VaultIndexKey];

export enum FindPrevKeyOperationType {
  new_vault = 'new_vault',
  redeem = 'redeem',
  increase_collateral = 'increase_collateral',
  increase_debt = 'increase_debt',
  pay_debt = 'pay_debt',
}

export interface VaultsTypes {
  CoreStateType: CoreStateType;
  CoreDataKeys: CoreDataKeys;
  CurrencyType: CurrencyType;
  CurrenciesDataKeys: CurrenciesDataKeys;
  OptionalVaultKey: OptionalVaultKey;
  VaultsInfo: VaultsInfo;
  VaultKey: VaultKey;
  Vault: Vault;
  VaultIndexKey: VaultIndexKey;
  VaultsDataKeys: VaultsDataKeys;
}
