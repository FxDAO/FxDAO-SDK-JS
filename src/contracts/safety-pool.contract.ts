import {
  address,
  DefaultContractParams,
  DefaultContractTransactionGenerationResponse,
  FxDAOSafetyPoolContractMethods,
  u128,
} from '../interfaces';
import {
  Account,
  Address,
  Contract,
  Memo,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { Server, Api } from '@stellar/stellar-sdk/lib/soroban';
import { SafetyPoolTypes } from '../interfaces/safety-pool';
import { parseError, ParseErrorType } from '../utils';

export class SafetyPoolContract {
  constructor(private readonly globalParams: DefaultContractParams) {}

  get server(): Server {
    return new Server(this.globalParams.rpc, { allowHttp: !!this.globalParams.allowHttp });
  }

  get contract(): Contract {
    return new Contract(this.globalParams.contractId);
  }

  async deposit(params: {
    caller: address;
    amount: u128;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const account: Account = await this.server.getAccount(params.caller);
    const caller: xdr.ScVal = nativeToScVal(account.accountId(), { type: 'address' });
    const amount: xdr.ScVal = nativeToScVal(params.amount, { type: 'u128' });

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(this.contract.call(FxDAOSafetyPoolContractMethods.deposit, caller, amount))
      .build();

    return { transactionXDR: tx.toXDR() };
  }

  async withdraw(params: { caller: address; memo?: Memo }): Promise<DefaultContractTransactionGenerationResponse> {
    const account: Account = await this.server.getAccount(params.caller);
    const caller: xdr.ScVal = nativeToScVal(account.accountId(), { type: 'address' });

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(this.contract.call(FxDAOSafetyPoolContractMethods.withdraw, caller))
      .build();

    return { transactionXDR: tx.toXDR() };
  }

  async withdrawReward(params: {
    caller: address;
    memo?: Memo;
  }): Promise<DefaultContractTransactionGenerationResponse> {
    const account: Account = await this.server.getAccount(params.caller);
    const caller: xdr.ScVal = nativeToScVal(account.accountId(), { type: 'address' });

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(this.contract.call(FxDAOSafetyPoolContractMethods.withdraw_col, caller))
      .build();

    return { transactionXDR: tx.toXDR() };
  }

  async liquidate(params: { caller: address; memo?: Memo }): Promise<DefaultContractTransactionGenerationResponse> {
    const account: Account = await this.server.getAccount(params.caller);
    const caller: xdr.ScVal = nativeToScVal(account.accountId(), { type: 'address' });

    const tx = new TransactionBuilder(account, {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
      memo: params.memo,
    })
      .setTimeout(0)
      .addOperation(this.contract.call(FxDAOSafetyPoolContractMethods.liquidate, caller))
      .build();

    return { transactionXDR: tx.toXDR() };
  }

  // --- Pure View functions

  async getCoreState(): Promise<SafetyPoolTypes['CoreStateType']> {
    const tx = new TransactionBuilder(new Account(this.globalParams.simulationAccount, '0'), {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
    })
      .addOperation(this.contract.call(FxDAOSafetyPoolContractMethods.get_core_state))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (Api.isSimulationError(simulated)) {
      throw parseError(ParseErrorType.safety_pool, simulated);
    }

    const xdrVal: string = (simulated.result as Api.SimulateHostFunctionResult).retval.toXDR('base64');
    const scVal: xdr.ScVal = xdr.ScVal.fromXDR(xdrVal, 'base64');
    return scValToNative(scVal);
  }

  async getCoreStats(): Promise<SafetyPoolTypes['CoreStatsType']> {
    const tx = new TransactionBuilder(new Account(this.globalParams.simulationAccount, '0'), {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
    })
      .addOperation(this.contract.call(FxDAOSafetyPoolContractMethods.get_core_stats))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (Api.isSimulationError(simulated)) {
      throw parseError(ParseErrorType.safety_pool, simulated);
    }

    const xdrVal: string = (simulated.result as Api.SimulateHostFunctionResult).retval.toXDR('base64');
    const scVal: xdr.ScVal = xdr.ScVal.fromXDR(xdrVal, 'base64');
    return scValToNative(scVal);
  }

  async getDeposit(caller: address): Promise<SafetyPoolTypes['Deposit']> {
    const val: xdr.ScVal = new Address(caller).toScVal();

    const tx = new TransactionBuilder(new Account(this.globalParams.simulationAccount, '0'), {
      fee: this.globalParams.defaultFee,
      networkPassphrase: this.globalParams.network,
    })
      .addOperation(this.contract.call(FxDAOSafetyPoolContractMethods.get_deposit, val))
      .setTimeout(0)
      .build();

    const simulated = await this.server.simulateTransaction(tx);

    if (Api.isSimulationError(simulated)) {
      throw parseError(ParseErrorType.safety_pool, simulated);
    }

    const xdrVal: string = (simulated.result as Api.SimulateHostFunctionResult).retval.toXDR('base64');
    const scVal: xdr.ScVal = xdr.ScVal.fromXDR(xdrVal, 'base64');
    return scValToNative(scVal);
  }
}
