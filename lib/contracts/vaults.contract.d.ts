import { Address, Contract, Memo, Server } from 'soroban-client';
import { DefaultContractParams, DefaultContractTransactionGenerationResponse, Denomination, u128, u32, UpdateVaultOperationType } from '../interfaces';
import { VaultsTypes } from '../interfaces/vaults';
export declare class VaultsContract {
    private readonly globalParams;
    constructor(params: DefaultContractParams);
    get server(): Server;
    get contract(): Contract;
    calculateDepositRatio(params: {
        currencyRate: string;
        collateral: string;
        debt: string;
    }): Promise<bigint>;
    setPriceRate(params: {
        sourceAccount: string;
        denomination: Denomination;
        rate: u128;
        memo?: Memo;
    }): Promise<DefaultContractTransactionGenerationResponse>;
    newVault(params: {
        caller: string;
        initialDebt: u128;
        collateralAmount: u128;
        denomination: Denomination;
        memo?: Memo;
    }): Promise<DefaultContractTransactionGenerationResponse>;
    updateVault(params: {
        operationType: UpdateVaultOperationType;
        caller: string;
        amount: u128;
        denomination: Denomination;
        memo?: Memo;
    }): Promise<DefaultContractTransactionGenerationResponse>;
    redeem(params: {
        caller: string;
        denomination: Denomination;
        memo?: Memo;
    }): Promise<DefaultContractTransactionGenerationResponse>;
    liquidate(params: {
        caller: string;
        denomination: Denomination;
        totalVaults: number;
        memo?: Memo;
    }): Promise<DefaultContractTransactionGenerationResponse>;
    getVaultsInfo(params: {
        denomination: Denomination;
    }): Promise<VaultsTypes['VaultsInfo']>;
    findPrevVaultKey(params: {
        account: Address;
        targetIndex: u128;
        denomination: Denomination;
    }): Promise<VaultsTypes['OptionalVaultKey']>;
    getVault(params: {
        user: string;
        denomination: Denomination;
    }): Promise<VaultsTypes['Vault']>;
    getVaults(params: {
        prevKey?: VaultsTypes['OptionalVaultKey'];
        denomination: Denomination;
        total: u32;
        onlyToLiquidate: boolean;
        memo?: Memo;
    }): Promise<Array<VaultsTypes['Vault']>>;
}
export declare enum FindPrevVaultKeyType {
    new_vault = 0,
    update_vault = 1,
    remove_vault = 2
}
//# sourceMappingURL=vaults.contract.d.ts.map