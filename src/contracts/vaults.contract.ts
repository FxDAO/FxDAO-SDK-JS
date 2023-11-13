import {
  Account,
  Address,
  assembleTransaction,
  Contract,
  Memo,
  nativeToScVal,
  scValToBigInt,
  scValToNative,
  Server,
  SorobanRpc,
  TransactionBuilder,
  xdr,
} from 'soroban-client';

import {
  DefaultContractParams,
  DefaultContractTransactionGenerationResponse,
  Denomination,
  FxDAOVaultsContractMethods,
  u128,
  u32,
  UpdateVaultOperationType,
} from '../interfaces';
import { calculateVaultIndex, generateOptionalVaultKeyScVal, parseError, ParseErrorType } from '../utils';
import { VaultsTypes } from '../interfaces/vaults';
import isSimulationError = SorobanRpc.isSimulationError;

export class VaultsContract {
  private readonly globalParams: DefaultContractParams;

  constructor(params: DefaultContractParams) {
    this.globalParams = params;
  }

  get server(): Server {
    return new Server(this.globalParams.rpc, { allowHttp: !!this.globalParams.allowHttp });
  }

  get contract(): Contract {
    return new Contract(this.globalParams.contractId);
  }

  async calculateDepositRatio(params: { currencyRate: string; collateral: string; debt: string }): Promise<bigint> {
    const currencyRate: xdr.ScVal = nativeToScVal(params.currencyRate, { type: 'u128' });
    const collateral: xdr.ScVal = nativeToScVal(params.collateral, { type: 'u128' });
    const debt: xdr.ScVal = nativeToScVal(params.debt, { type: 'u128' });

    const account = new Account(this.globalParams.simulationAccount, '0');

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
    })
      .addOperation(this.contract.call('calculate_deposit_ratio', currencyRate, collateral, debt))
      .setTimeout(210)
      .build();

    const responseValue: xdr.ScVal = await this.server.simulateTransaction(tx).then(response => {
      if ('error' in response && response.error) throw response.error;

      return xdr.ScVal.fromXDR(
        (
          (response as SorobanRpc.SimulateTransactionSuccessResponse).result as SorobanRpc.SimulateHostFunctionResult
        ).retval.toXDR()
      );
    });

    return scValToBigInt(responseValue);
  }

  async setPriceRate(params: {
    sourceAccount: string;
    denomination: Denomination;
    rate: u128;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const account = await this.server.getAccount(params.sourceAccount);
    const rate: xdr.ScVal = nativeToScVal(params.rate, { type: 'u128' });
    const denomination: xdr.ScVal = nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(this.contract.call(FxDAOVaultsContractMethods.set_currency_rate, denomination, rate))
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw parseError(ParseErrorType.vault, simulated);
    }

    const prepared = assembleTransaction(tx, this.globalParams.network, simulated).build();

    return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
  }

  async newVault(params: {
    caller: string;
    initialDebt: u128;
    collateralAmount: u128;
    denomination: Denomination;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const prevKey = await this.findPrevVaultKey({
      account: new Address(params.caller),
      denomination: params.denomination,
      targetIndex: (params.collateralAmount * 1000000000n) / params.initialDebt,
    });

    const account = await this.server.getAccount(params.caller);
    const prev_key: xdr.ScVal = generateOptionalVaultKeyScVal(prevKey);
    const caller: xdr.ScVal = nativeToScVal(account.accountId(), { type: 'address' });
    const initial_debt: xdr.ScVal = nativeToScVal(params.initialDebt, { type: 'u128' });
    const collateral_amount: xdr.ScVal = nativeToScVal(params.collateralAmount, { type: 'u128' });
    const denomination: xdr.ScVal = nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(
        this.contract.call(
          FxDAOVaultsContractMethods.new_vault,
          prev_key,
          caller,
          initial_debt,
          collateral_amount,
          denomination
        )
      )
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw parseError(ParseErrorType.vault, simulated);
    }

    const prepared = assembleTransaction(tx, this.globalParams.network, simulated).build();

    return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
  }

  async updateVault(params: {
    operationType: UpdateVaultOperationType;
    caller: string;
    amount: u128;
    denomination: Denomination;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const currentVault: VaultsTypes['Vault'] = await this.getVault({
      denomination: params.denomination,
      user: params.caller,
    });

    const prevKey: VaultsTypes['OptionalVaultKey'] = await this.findPrevVaultKey({
      account: new Address(params.caller),
      denomination: currentVault.denomination,
      targetIndex: currentVault.index,
    });

    const vaultKey: VaultsTypes['VaultKey'] = {
      account: currentVault.account,
      denomination: currentVault.denomination,
      index: currentVault.index,
    };

    const updatedVault: VaultsTypes['Vault'] = {
      account: currentVault.account,
      denomination: currentVault.denomination,
      index: currentVault.index,
      next_key: currentVault.next_key,
      total_collateral: currentVault.total_collateral,
      total_debt: currentVault.total_debt,
    };

    switch (params.operationType) {
      case UpdateVaultOperationType.increase_collateral:
        updatedVault.total_collateral += params.amount;
        updatedVault.index = calculateVaultIndex({
          debt: updatedVault.total_debt,
          collateral: updatedVault.total_collateral,
        });
        break;

      case UpdateVaultOperationType.increase_debt:
        updatedVault.total_debt += params.amount;
        updatedVault.index = calculateVaultIndex({
          debt: updatedVault.total_debt,
          collateral: updatedVault.total_collateral,
        });
        break;

      case UpdateVaultOperationType.pay_debt:
        updatedVault.total_debt -= params.amount;
        updatedVault.index =
          updatedVault.total_debt > 0n
            ? calculateVaultIndex({
                debt: updatedVault.total_debt,
                collateral: updatedVault.total_collateral,
              })
            : 0n;
        break;

      default:
        throw new Error(`Operation type "${params.operationType}" is not supported`);
    }

    let newPrevKey: VaultsTypes['OptionalVaultKey'];
    if (updatedVault.index === 0n) {
      newPrevKey = ['None'];
    } else {
      newPrevKey = await this.findPrevVaultKey({
        account: new Address(params.caller),
        denomination: updatedVault.denomination,
        targetIndex: updatedVault.index,
      });
    }

    const prev_key: xdr.ScVal = generateOptionalVaultKeyScVal(prevKey);
    const vault_key: xdr.ScVal = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('account'),
        val: nativeToScVal(vaultKey.account, { type: 'address' }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('denomination'),
        val: xdr.ScVal.scvSymbol(vaultKey.denomination),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('index'),
        val: nativeToScVal(vaultKey.index, { type: 'u128' }),
      }),
    ]);
    const new_prev_key: xdr.ScVal = generateOptionalVaultKeyScVal(newPrevKey);
    const amount: xdr.ScVal = nativeToScVal(params.amount, { type: 'u128' });

    const account = await this.server.getAccount(params.caller);
    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .addOperation(this.contract.call(params.operationType, prev_key, vault_key, new_prev_key, amount))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw parseError(ParseErrorType.vault, simulated);
    }

    const prepared = assembleTransaction(tx, this.globalParams.network, simulated).build();

    return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
  }

  async redeem(params: {
    caller: string;
    denomination: Denomination;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const account = await this.server.getAccount(params.caller);
    const caller: xdr.ScVal = nativeToScVal(account.accountId(), { type: 'address' });
    const denomination: xdr.ScVal = nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(this.contract.call(FxDAOVaultsContractMethods.redeem, caller, denomination))
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw parseError(ParseErrorType.vault, simulated);
    }

    const prepared = assembleTransaction(tx, this.globalParams.network, simulated).build();

    return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
  }

  async liquidate(params: {
    caller: string;
    denomination: Denomination;
    totalVaults: number;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const account: Account = await this.server.getAccount(params.caller);
    const liquidator: xdr.ScVal = nativeToScVal(account.accountId(), { type: 'address' });
    const denomination: xdr.ScVal = nativeToScVal(params.denomination, { type: 'symbol' });
    const total_vaults_to_liquidate: xdr.ScVal = nativeToScVal(params.totalVaults, { type: 'u32' });

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(
        this.contract.call(FxDAOVaultsContractMethods.liquidate, liquidator, denomination, total_vaults_to_liquidate)
      )
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw parseError(ParseErrorType.vault, simulated);
    }

    const prepared = assembleTransaction(tx, this.globalParams.network, simulated).build();

    return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
  }

  // --- Pure View functions

  async getVaultsInfo(params: { denomination: Denomination }): Promise<VaultsTypes['VaultsInfo']> {
    const denomination: xdr.ScVal = nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new TransactionBuilder(new Account(this.globalParams.simulationAccount, '0'), {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
    })
      .addOperation(this.contract.call(FxDAOVaultsContractMethods.get_vaults_info, denomination))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw parseError(ParseErrorType.vault, simulated);
    }

    return scValToNative((simulated.result as SorobanRpc.SimulateHostFunctionResult).retval);
  }

  async findPrevVaultKey(params: {
    account: Address;
    targetIndex: u128;
    denomination: Denomination;
  }): Promise<VaultsTypes['OptionalVaultKey']> {
    const vaultsInfo: VaultsTypes['VaultsInfo'] = await this.getVaultsInfo({ denomination: params.denomination });
    let prevKeyValue: VaultsTypes['OptionalVaultKey'];

    /**
     * There are four cases when using the lowest key:
     * - If the lowest key is "None" it means there is no Vault created
     * - If the index of the lowest key is higher than the index we are looking for it means this new vault will be the new lowest key
     * - If the lowest key is owned by the account and it has the same index, we return none since this account if going to still be the lowest key
     */
    if (
      vaultsInfo.lowest_key[0] === 'None' ||
      vaultsInfo.lowest_key[1].index > params.targetIndex ||
      (vaultsInfo.lowest_key[1].index === params.targetIndex &&
        vaultsInfo.lowest_key[1].account === params.account.toString())
    ) {
      return ['None'];
    }

    if (vaultsInfo.lowest_key[1].account !== params.account.toString()) {
      if (vaultsInfo.lowest_key[1].index === params.targetIndex) {
        return ['None'];
      }

      const lowestVault: VaultsTypes['Vault'] = await this.getVault({
        user: vaultsInfo.lowest_key[1].account,
        denomination: params.denomination,
      });

      /**
       * If lowest key has an existing "next_key" value, we check these cases:
       * - if the next key is "None", we return the current lowest as the prevKey
       * - If the next keu index is higher than the target we also return the lowest key
       */
      if (lowestVault.next_key[0] === 'None' || lowestVault.next_key[1].index >= params.targetIndex) {
        return vaultsInfo.lowest_key;
      }

      prevKeyValue = vaultsInfo.lowest_key;
    } else {
      prevKeyValue = ['None'];
    }

    let found = false;
    while (!found) {
      const vaults: Array<VaultsTypes['Vault']> = await this.getVaults({
        onlyToLiquidate: false,
        denomination: params.denomination,
        prevKey: prevKeyValue,
        total: 15,
      });

      if (vaults.length === 0) {
        found = true;
        break;
      }

      for (const vault of vaults) {
        // This shouldn't happen but just in case
        if (prevKeyValue[0] === 'Some' && prevKeyValue[1].account === vault.account) {
          continue;
        }

        // If the vault is the same as ours, we ignore it because it can't be a prev vault
        if (vault.account.toString() === params.account.toString()) {
          continue;
        }

        prevKeyValue = [
          'Some',
          {
            account: vault.account,
            denomination: vault.denomination,
            index: vault.index,
          },
        ];

        if (
          vault.next_key[0] === 'None' ||
          vault.next_key[1].index >= params.targetIndex ||
          vault.next_key[1].account === params.account.toString()
        ) {
          found = true;
          break;
        }
      }

      // If the number of vaults we got is lower than those we requested is because are no more options there.
      if (vaults.length < 15) {
        found = true;
      }
    }

    return prevKeyValue;
  }

  async getVault(params: { user: string; denomination: Denomination }): Promise<VaultsTypes['Vault']> {
    const user: xdr.ScVal = nativeToScVal(params.user, { type: 'address' });
    const denomination: xdr.ScVal = nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new TransactionBuilder(new Account(this.globalParams.simulationAccount, '0'), {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
    })
      .addOperation(this.contract.call(FxDAOVaultsContractMethods.get_vault, user, denomination))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw parseError(ParseErrorType.vault, simulated);
    }

    return scValToNative((simulated.result as SorobanRpc.SimulateHostFunctionResult).retval);
  }

  async getVaults(params: {
    prevKey?: VaultsTypes['OptionalVaultKey'];
    denomination: Denomination;
    total: u32;
    onlyToLiquidate: boolean;
    memo?: Memo;
  }): Promise<Array<VaultsTypes['Vault']>> {
    const prev_key: xdr.ScVal = generateOptionalVaultKeyScVal(params.prevKey || ['None']);
    const denomination: xdr.ScVal = nativeToScVal(params.denomination, { type: 'symbol' });
    const total: xdr.ScVal = nativeToScVal(params.total, { type: 'u32' });
    const only_to_liquidate: xdr.ScVal = nativeToScVal(params.onlyToLiquidate, { type: 'bool' });
    const account: Account = new Account(this.globalParams.simulationAccount, '0');

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(
        this.contract.call(FxDAOVaultsContractMethods.get_vaults, prev_key, denomination, total, only_to_liquidate)
      )
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw parseError(ParseErrorType.vault, simulated);
    }

    return scValToNative((simulated.result as SorobanRpc.SimulateHostFunctionResult).retval);
  }
}

export enum FindPrevVaultKeyType {
  new_vault,
  update_vault,
  remove_vault,
}
