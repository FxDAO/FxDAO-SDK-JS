import { address, DefaultContractParams, DefaultContractTransactionGenerationResponse, u128 } from '../interfaces';
import { Contract, Memo, Server } from 'soroban-client';
import { SafetyPoolTypes } from '../interfaces/safety-pool';
export declare class SafetyPoolContract {
    private readonly globalParams;
    constructor(globalParams: DefaultContractParams);
    get server(): Server;
    get contract(): Contract;
    deposit(params: {
        caller: address;
        amount: u128;
        memo?: Memo;
    }): Promise<DefaultContractTransactionGenerationResponse>;
    withdraw(params: {
        caller: address;
        memo?: Memo;
    }): Promise<DefaultContractTransactionGenerationResponse>;
    withdrawReward(params: {
        caller: address;
        memo?: Memo;
    }): Promise<DefaultContractTransactionGenerationResponse>;
    liquidate(params: {
        caller: address;
        memo?: Memo;
    }): Promise<DefaultContractTransactionGenerationResponse>;
    getCoreState(): Promise<SafetyPoolTypes['CoreStateType']>;
    getCoreStats(): Promise<SafetyPoolTypes['CoreStatsType']>;
    getDeposit(caller: address): Promise<SafetyPoolTypes['Deposit']>;
}
//# sourceMappingURL=safety-pool.contract.d.ts.map