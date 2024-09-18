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
import { Account, Address, Contract, Memo, xdr } from '@stellar/stellar-sdk';
import { SorobanRpc } from '@stellar/stellar-sdk';

export class VaultsContract {
  constructor(public globalParams: DefaultContractParams) {}

  get server(): SorobanRpc.Server {
    return new this.globalParams.stellarSDK.SorobanRpc.Server(this.globalParams.rpc, {
      allowHttp: !!this.globalParams.allowHttp,
    });
  }

  get contract(): Contract {
    return new this.globalParams.stellarSDK.Contract(this.globalParams.contractId);
  }

  async calculateDepositRatio(params: { currencyRate: string; collateral: string; debt: string }): Promise<bigint> {
    const currencyRate: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.currencyRate, { type: 'u128' });
    const collateral: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.collateral, { type: 'u128' });
    const debt: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.debt, { type: 'u128' });

    const account = new this.globalParams.stellarSDK.Account(this.globalParams.simulationAccount, '0');

    const tx = new this.globalParams.stellarSDK.TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
    })
      .addOperation(this.contract.call('calculate_deposit_ratio', currencyRate, collateral, debt))
      .setTimeout(210)
      .build();

    const responseValue: xdr.ScVal = await this.server.simulateTransaction(tx).then(response => {
      if (this.globalParams.stellarSDK.SorobanRpc.Api.isSimulationError(response)) throw response.error;
      if (!response.result) throw new Error();

      return this.globalParams.stellarSDK.xdr.ScVal.fromXDR(response.result.retval.toXDR());
    });

    return this.globalParams.stellarSDK.scValToBigInt(responseValue);
  }

  async setPriceRate(params: {
    sourceAccount: string;
    denomination: Denomination;
    rate: u128;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const account = await this.server.getAccount(params.sourceAccount);
    const rate: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.rate, { type: 'u128' });
    const denomination: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new this.globalParams.stellarSDK.TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(this.contract.call(FxDAOVaultsContractMethods.set_currency_rate, denomination, rate))
      .build();

    return { transactionXDR: tx.toXDR() };
  }

  async newVault(params: {
    caller: string;
    initialDebt: u128;
    collateralAmount: u128;
    denomination: Denomination;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const prevKey = await this.findPrevVaultKey({
      account: new this.globalParams.stellarSDK.Address(params.caller),
      denomination: params.denomination,
      targetIndex: (params.collateralAmount * 1000000000n) / params.initialDebt,
    });

    const account = await this.server.getAccount(params.caller);
    const prev_key: xdr.ScVal = generateOptionalVaultKeyScVal(prevKey);
    const caller: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(account.accountId(), { type: 'address' });
    const initial_debt: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.initialDebt, { type: 'u128' });
    const collateral_amount: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.collateralAmount, {
      type: 'u128',
    });
    const denomination: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new this.globalParams.stellarSDK.TransactionBuilder(account, {
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

    return { transactionXDR: tx.toXDR() };
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
      account: new this.globalParams.stellarSDK.Address(params.caller),
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
        account: new this.globalParams.stellarSDK.Address(params.caller),
        denomination: updatedVault.denomination,
        targetIndex: updatedVault.index,
        ignoreSameAccount: true,
      });
    }

    const prev_key: xdr.ScVal = generateOptionalVaultKeyScVal(prevKey);
    const vault_key: xdr.ScVal = this.globalParams.stellarSDK.xdr.ScVal.scvMap([
      new this.globalParams.stellarSDK.xdr.ScMapEntry({
        key: this.globalParams.stellarSDK.xdr.ScVal.scvSymbol('account'),
        val: this.globalParams.stellarSDK.nativeToScVal(vaultKey.account, { type: 'address' }),
      }),
      new this.globalParams.stellarSDK.xdr.ScMapEntry({
        key: this.globalParams.stellarSDK.xdr.ScVal.scvSymbol('denomination'),
        val: this.globalParams.stellarSDK.xdr.ScVal.scvSymbol(vaultKey.denomination),
      }),
      new this.globalParams.stellarSDK.xdr.ScMapEntry({
        key: this.globalParams.stellarSDK.xdr.ScVal.scvSymbol('index'),
        val: this.globalParams.stellarSDK.nativeToScVal(vaultKey.index, { type: 'u128' }),
      }),
    ]);
    const new_prev_key: xdr.ScVal = generateOptionalVaultKeyScVal(newPrevKey);
    const amount: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.amount, { type: 'u128' });

    const account = await this.server.getAccount(params.caller);
    const tx = new this.globalParams.stellarSDK.TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .addOperation(this.contract.call(params.operationType, prev_key, vault_key, new_prev_key, amount))
      .setTimeout(0)
      .build();

    return { transactionXDR: tx.toXDR() };
  }

  async redeem(params: {
    caller: string;
    denomination: Denomination;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const account = await this.server.getAccount(params.caller);
    const caller: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(account.accountId(), { type: 'address' });
    const denomination: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new this.globalParams.stellarSDK.TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(this.contract.call(FxDAOVaultsContractMethods.redeem, caller, denomination))
      .build();

    return { transactionXDR: tx.toXDR() };
  }

  async liquidate(params: {
    caller: string;
    denomination: Denomination;
    totalVaults: number;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const account: Account = await this.server.getAccount(params.caller);
    const liquidator: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(account.accountId(), { type: 'address' });
    const denomination: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.denomination, { type: 'symbol' });
    const total_vaults_to_liquidate: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.totalVaults, {
      type: 'u32',
    });

    const tx = new this.globalParams.stellarSDK.TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(
        this.contract.call(FxDAOVaultsContractMethods.liquidate, liquidator, denomination, total_vaults_to_liquidate)
      )
      .build();

    return { transactionXDR: tx.toXDR() };
  }

  // --- Pure View functions

  async getVaultsInfo(params: { denomination: Denomination }): Promise<VaultsTypes['VaultsInfo']> {
    const denomination: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new this.globalParams.stellarSDK.TransactionBuilder(
      new this.globalParams.stellarSDK.Account(this.globalParams.simulationAccount, '0'),
      {
        fee: this.globalParams.defaultFee,
        networkPassphrase: this.globalParams.network,
      }
    )
      .addOperation(this.contract.call(FxDAOVaultsContractMethods.get_vaults_info, denomination))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (this.globalParams.stellarSDK.SorobanRpc.Api.isSimulationError(simulated))
      throw parseError(ParseErrorType.vault, simulated);
    if (!simulated.result) throw new Error('');

    const xdrVal: string = simulated.result.retval.toXDR('base64');
    const scVal: xdr.ScVal = this.globalParams.stellarSDK.xdr.ScVal.fromXDR(xdrVal, 'base64');
    return this.globalParams.stellarSDK.scValToNative(scVal);
  }

  async findPrevVaultKey(params: {
    account: Address;
    targetIndex: u128;
    denomination: Denomination;
    ignoreSameAccount?: boolean;
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
      const lowestVault: VaultsTypes['Vault'] = await this.getVault({
        user: vaultsInfo.lowest_key[1].account,
        denomination: params.denomination,
      });

      if (
        vaultsInfo.lowest_key[1].index === params.targetIndex &&
        (lowestVault.next_key[0] === 'None' || lowestVault.next_key[1]?.index > params.targetIndex)
      ) {
        return ['None'];
      }

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
          (vault.next_key[1].account === params.account.toString() && !params.ignoreSameAccount)
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
    const user: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.user, { type: 'address' });
    const denomination: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new this.globalParams.stellarSDK.TransactionBuilder(
      new this.globalParams.stellarSDK.Account(this.globalParams.simulationAccount, '0'),
      {
        fee: this.globalParams.defaultFee,
        networkPassphrase: this.globalParams.network,
      }
    )
      .addOperation(this.contract.call(FxDAOVaultsContractMethods.get_vault, user, denomination))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (this.globalParams.stellarSDK.SorobanRpc.Api.isSimulationError(simulated))
      throw parseError(ParseErrorType.vault, simulated);
    if (!simulated.result) throw new Error('');

    const xdrVal: string = simulated.result.retval.toXDR('base64');
    const scVal: xdr.ScVal = this.globalParams.stellarSDK.xdr.ScVal.fromXDR(xdrVal, 'base64');
    return this.globalParams.stellarSDK.scValToNative(scVal);
  }

  async getVaults(params: {
    prevKey?: VaultsTypes['OptionalVaultKey'];
    denomination: Denomination;
    total: u32;
    onlyToLiquidate: boolean;
    memo?: Memo;
  }): Promise<Array<VaultsTypes['Vault']>> {
    const prev_key: xdr.ScVal = generateOptionalVaultKeyScVal(params.prevKey || ['None']);
    const denomination: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.denomination, { type: 'symbol' });
    const total: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.total, { type: 'u32' });
    const only_to_liquidate: xdr.ScVal = this.globalParams.stellarSDK.nativeToScVal(params.onlyToLiquidate, {
      type: 'bool',
    });
    const account: Account = new this.globalParams.stellarSDK.Account(this.globalParams.simulationAccount, '0');

    const tx = new this.globalParams.stellarSDK.TransactionBuilder(account, {
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

    if (this.globalParams.stellarSDK.SorobanRpc.Api.isSimulationError(simulated))
      throw parseError(ParseErrorType.vault, simulated);
    if (!simulated.result) throw new Error('');

    // We do this in order to avoid wierd errors with libraries sharing the Stellar SDK
    const xdrVal: string = simulated.result.retval.toXDR('base64');
    const scVal: xdr.ScVal = this.globalParams.stellarSDK.xdr.ScVal.fromXDR(xdrVal, 'base64');
    return this.globalParams.stellarSDK.scValToNative(scVal);
  }
}

export enum FindPrevVaultKeyType {
  new_vault,
  update_vault,
  remove_vault,
}
