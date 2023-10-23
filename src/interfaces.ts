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
  redeem = 'redeem',
  liquidate = 'liquidate',
}
