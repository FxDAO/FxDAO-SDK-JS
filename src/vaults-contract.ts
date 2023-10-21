import {
  Account,
  Contract,
  Server,
  TransactionBuilder,
  xdr,
  nativeToScVal,
  SorobanRpc,
  scValToNative,
  scValToBigInt,
  assembleTransaction,
  Memo,
  Address,
} from 'soroban-client';

import {
  Denomination,
  FxDAOContract,
  FxDAOContractMethods,
  FxDAOParams,
  u128,
  u32,
  UpdateVaultOperationType,
} from './interfaces';
import { VaultsErrors } from './errors';
import isSimulationError = SorobanRpc.isSimulationError;
import { Vault, OptionalVaultKey, VaultKey, VaultsInfo } from './bindings/vaults';
import { calculateVaultIndex, generateOptionalVaultKeyScVal } from './utils';

export class VaultsContract {
  private readonly globalParams: FxDAOParams;

  constructor(params: FxDAOParams) {
    this.globalParams = params;
  }

  get server(): Server {
    return new Server(this.globalParams.rpc, { allowHttp: !!this.globalParams.allowHttp });
  }

  get vaultsContract(): Contract {
    const vaultsContractId = this.globalParams.contracts.find(c => c.contract === FxDAOContract.VAULTS)?.id;

    if (!vaultsContractId) {
      throw new Error(VaultsErrors.NO_CONTRACT_PROVIDED);
    }

    return new Contract(vaultsContractId);
  }

  async calculateDepositRatio(params: { currencyRate: string; collateral: string; debt: string }): Promise<bigint> {
    {
      const currencyRate: xdr.ScVal = nativeToScVal(params.currencyRate, { type: 'u128' });
      const collateral: xdr.ScVal = nativeToScVal(params.collateral, { type: 'u128' });
      const debt: xdr.ScVal = nativeToScVal(params.debt, { type: 'u128' });

      const account = new Account(this.globalParams.simulationAccount, '0');

      const tx = new TransactionBuilder(account, {
        fee: this.globalParams.defaultFee,
        networkPassphrase: this.globalParams.network,
      })
        .addOperation(this.vaultsContract.call('calculate_deposit_ratio', currencyRate, collateral, debt))
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
  }

  async newVault(params: {
    caller: string;
    initialDebt: u128;
    collateralAmount: u128;
    denomination: Denomination;
    memo?: Memo;
  }): Promise<{
    transactionXDR: string;
    preparedTransactionXDR: string;
    simulated: SorobanRpc.SimulateTransactionSuccessResponse;
  }> {
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
        this.vaultsContract.call(
          FxDAOContractMethods.new_vault,
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
      throw new Error(simulated.error);
    }

    const prepared = assembleTransaction(tx, this.globalParams.network, simulated).build();

    return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
  }

  async getVaultsInfo(params: { denomination: Denomination }): Promise<VaultsInfo> {
    const denomination: xdr.ScVal = nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new TransactionBuilder(new Account(this.globalParams.simulationAccount, '0'), {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
    })
      .addOperation(this.vaultsContract.call(FxDAOContractMethods.get_vaults_info, denomination))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw new Error(simulated.error);
    }

    return scValToNative((simulated.result as SorobanRpc.SimulateHostFunctionResult).retval);
  }

  async findPrevVaultKey(params: {
    account: Address;
    targetIndex: u128;
    denomination: Denomination;
    ignorePrevVault?: boolean;

    newPrevKey?: boolean;
  }): Promise<OptionalVaultKey> {
    let found = false;

    let vaultsInfo: VaultsInfo;
    let prevKeyValue: OptionalVaultKey;

    if (!params.ignorePrevVault) {
      vaultsInfo = await this.getVaultsInfo({ denomination: params.denomination });
      prevKeyValue = vaultsInfo.lowest_key;

      if (
        prevKeyValue[0] === 'None' ||
        prevKeyValue[1].account.toString() === params.account.toString() ||
        prevKeyValue[1].index >= params.targetIndex
      ) {
        prevKeyValue = ['None'];
        return prevKeyValue;
      }
    } else {
      prevKeyValue = ['None'];
    }

    while (!found) {
      const vaults: Vault[] = await this.getVaults({
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
        if (vault.index >= params.targetIndex) {
          found = true;
          break;
        }

        // If the vault is the same as ours, we ignore it because it can't be a prev vault
        if (vault.next_key[0] === 'Some' && vault.account.toString() === params.account.toString()) {
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

        /* If is the new key, there are cases where the prev vault is the same vault we are removing even doe there are more vaults
         *
         */
        if (
          params.newPrevKey &&
          vault.next_key[0] === 'Some' &&
          vault.next_key[1].account.toString() === params.account.toString()
        ) {
          continue;
        }

        if (vault.next_key[0] === 'None' || vault.next_key[1].index >= params.targetIndex) {
          found = true;
          break;
        }
      }
    }

    return prevKeyValue;
  }

  async getVault(params: { user: string; denomination: Denomination }): Promise<Vault> {
    const user: xdr.ScVal = nativeToScVal(params.user, { type: 'address' });
    const denomination: xdr.ScVal = nativeToScVal(params.denomination, { type: 'symbol' });

    const tx = new TransactionBuilder(new Account(this.globalParams.simulationAccount, '0'), {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
    })
      .addOperation(this.vaultsContract.call(FxDAOContractMethods.get_vault, user, denomination))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw new Error(simulated.error);
    }

    return scValToNative((simulated.result as SorobanRpc.SimulateHostFunctionResult).retval);
  }

  async getVaults(params: {
    prevKey?: OptionalVaultKey;
    denomination: Denomination;
    total: u32;
    onlyToLiquidate: boolean;
    memo?: Memo;
  }): Promise<Vault[]> {
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
        this.vaultsContract.call(FxDAOContractMethods.get_vaults, prev_key, denomination, total, only_to_liquidate)
      )
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw new Error(simulated.error);
    }

    return scValToNative((simulated.result as SorobanRpc.SimulateHostFunctionResult).retval);
  }

  async updateVault(params: {
    operationType: UpdateVaultOperationType;
    caller: string;
    amount: u128;
    denomination: Denomination;
    memo?: Memo;
  }): Promise<{
    transactionXDR: string;
    preparedTransactionXDR: string;
    simulated: SorobanRpc.SimulateTransactionSuccessResponse;
  }> {
    const currentVault: Vault = await this.getVault({
      denomination: params.denomination,
      user: params.caller,
    });

    const prevKey: OptionalVaultKey = await this.findPrevVaultKey({
      account: new Address(params.caller),
      denomination: currentVault.denomination,
      targetIndex: currentVault.index,
    });

    const vaultKey: VaultKey = {
      account: currentVault.account,
      denomination: currentVault.denomination,
      index: currentVault.index,
    };

    const updatedVault: Vault = {
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

    let newPrevKey: OptionalVaultKey;
    if (updatedVault.index === 0n) {
      newPrevKey = ['None'];
    } else {
      newPrevKey = await this.findPrevVaultKey({
        account: new Address(params.caller),
        denomination: updatedVault.denomination,
        targetIndex: updatedVault.index,
        ignorePrevVault: true,
        newPrevKey: true,
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
      .addOperation(this.vaultsContract.call(params.operationType, prev_key, vault_key, new_prev_key, amount))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (isSimulationError(simulated)) {
      throw new Error(simulated.error);
    }

    const prepared = assembleTransaction(tx, this.globalParams.network, simulated).build();

    return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
  }
}
