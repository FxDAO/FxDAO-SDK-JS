import { address, SymbolType, u128, u32, u64 } from './index';

interface CoreStateType {
  admin: address;
  vaults_contract: address;
  treasury_contract: address;
  collateral_asset: address;
  deposit_asset: address;
  denomination_asset: SymbolType;
  min_deposit: u128;
  treasury_share: u32[];
  liquidator_share: u32[];
  governance_token: address;
}

interface CoreStatsType {
  total_deposits: u128;
  lifetime_deposited: u128;
  current_deposited: u128;
  lifetime_profit: u128;
  lifetime_liquidated: u128;
  liquidation_index: u64;
  rewards_factor: u128;
  total_shares: u128;
  share_price: u128;
}

type CoreStorageKeys = ['CoreState'] | ['CoreStats'] | ['LastGovernanceTokenDistribution'];

interface Deposit {
  depositor: address;
  amount: u128;
  last_deposit: u64;
  shares: u128;
  share_price_paid: u128;
  liquidation_index: u64;
}

type DepositsDataKeys = ['Deposit', address] | ['Depositors'];

export interface SafetyPoolTypes {
  CoreStateType: CoreStateType;
  CoreStatsType: CoreStatsType;
  CoreStorageKeys: CoreStorageKeys;
  Deposit: Deposit;
  DepositsDataKeys: DepositsDataKeys;
}
