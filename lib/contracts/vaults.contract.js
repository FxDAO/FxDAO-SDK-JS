"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindPrevVaultKeyType = exports.VaultsContract = void 0;
const stellar_sdk_1 = require("stellar-sdk");
const soroban_1 = require("stellar-sdk/lib/soroban");
const interfaces_1 = require("../interfaces");
const utils_1 = require("../utils");
class VaultsContract {
    constructor(params) {
        this.globalParams = params;
    }
    get server() {
        return new soroban_1.Server(this.globalParams.rpc, { allowHttp: !!this.globalParams.allowHttp });
    }
    get contract() {
        return new stellar_sdk_1.Contract(this.globalParams.contractId);
    }
    async calculateDepositRatio(params) {
        const currencyRate = (0, stellar_sdk_1.nativeToScVal)(params.currencyRate, { type: 'u128' });
        const collateral = (0, stellar_sdk_1.nativeToScVal)(params.collateral, { type: 'u128' });
        const debt = (0, stellar_sdk_1.nativeToScVal)(params.debt, { type: 'u128' });
        const account = new stellar_sdk_1.Account(this.globalParams.simulationAccount, '0');
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
        })
            .addOperation(this.contract.call('calculate_deposit_ratio', currencyRate, collateral, debt))
            .setTimeout(210)
            .build();
        const responseValue = await this.server.simulateTransaction(tx).then(response => {
            if ('error' in response && response.error)
                throw response.error;
            return stellar_sdk_1.xdr.ScVal.fromXDR(response.result.retval.toXDR());
        });
        return (0, stellar_sdk_1.scValToBigInt)(responseValue);
    }
    async setPriceRate(params) {
        const account = await this.server.getAccount(params.sourceAccount);
        const rate = (0, stellar_sdk_1.nativeToScVal)(params.rate, { type: 'u128' });
        const denomination = (0, stellar_sdk_1.nativeToScVal)(params.denomination, { type: 'symbol' });
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .setTimeout(0)
            .addOperation(this.contract.call(interfaces_1.FxDAOVaultsContractMethods.set_currency_rate, denomination, rate))
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.vault, simulated);
        }
        const prepared = (0, soroban_1.assembleTransaction)(tx, simulated).build();
        return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
    }
    async newVault(params) {
        const prevKey = await this.findPrevVaultKey({
            account: new stellar_sdk_1.Address(params.caller),
            denomination: params.denomination,
            targetIndex: (params.collateralAmount * 1000000000n) / params.initialDebt,
        });
        const account = await this.server.getAccount(params.caller);
        const prev_key = (0, utils_1.generateOptionalVaultKeyScVal)(prevKey);
        const caller = (0, stellar_sdk_1.nativeToScVal)(account.accountId(), { type: 'address' });
        const initial_debt = (0, stellar_sdk_1.nativeToScVal)(params.initialDebt, { type: 'u128' });
        const collateral_amount = (0, stellar_sdk_1.nativeToScVal)(params.collateralAmount, { type: 'u128' });
        const denomination = (0, stellar_sdk_1.nativeToScVal)(params.denomination, { type: 'symbol' });
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .setTimeout(0)
            .addOperation(this.contract.call(interfaces_1.FxDAOVaultsContractMethods.new_vault, prev_key, caller, initial_debt, collateral_amount, denomination))
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.vault, simulated);
        }
        const prepared = (0, soroban_1.assembleTransaction)(tx, simulated).build();
        return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
    }
    async updateVault(params) {
        const currentVault = await this.getVault({
            denomination: params.denomination,
            user: params.caller,
        });
        const prevKey = await this.findPrevVaultKey({
            account: new stellar_sdk_1.Address(params.caller),
            denomination: currentVault.denomination,
            targetIndex: currentVault.index,
        });
        const vaultKey = {
            account: currentVault.account,
            denomination: currentVault.denomination,
            index: currentVault.index,
        };
        const updatedVault = {
            account: currentVault.account,
            denomination: currentVault.denomination,
            index: currentVault.index,
            next_key: currentVault.next_key,
            total_collateral: currentVault.total_collateral,
            total_debt: currentVault.total_debt,
        };
        switch (params.operationType) {
            case interfaces_1.UpdateVaultOperationType.increase_collateral:
                updatedVault.total_collateral += params.amount;
                updatedVault.index = (0, utils_1.calculateVaultIndex)({
                    debt: updatedVault.total_debt,
                    collateral: updatedVault.total_collateral,
                });
                break;
            case interfaces_1.UpdateVaultOperationType.increase_debt:
                updatedVault.total_debt += params.amount;
                updatedVault.index = (0, utils_1.calculateVaultIndex)({
                    debt: updatedVault.total_debt,
                    collateral: updatedVault.total_collateral,
                });
                break;
            case interfaces_1.UpdateVaultOperationType.pay_debt:
                updatedVault.total_debt -= params.amount;
                updatedVault.index =
                    updatedVault.total_debt > 0n
                        ? (0, utils_1.calculateVaultIndex)({
                            debt: updatedVault.total_debt,
                            collateral: updatedVault.total_collateral,
                        })
                        : 0n;
                break;
            default:
                throw new Error(`Operation type "${params.operationType}" is not supported`);
        }
        let newPrevKey;
        if (updatedVault.index === 0n) {
            newPrevKey = ['None'];
        }
        else {
            newPrevKey = await this.findPrevVaultKey({
                account: new stellar_sdk_1.Address(params.caller),
                denomination: updatedVault.denomination,
                targetIndex: updatedVault.index,
            });
        }
        const prev_key = (0, utils_1.generateOptionalVaultKeyScVal)(prevKey);
        const vault_key = stellar_sdk_1.xdr.ScVal.scvMap([
            new stellar_sdk_1.xdr.ScMapEntry({
                key: stellar_sdk_1.xdr.ScVal.scvSymbol('account'),
                val: (0, stellar_sdk_1.nativeToScVal)(vaultKey.account, { type: 'address' }),
            }),
            new stellar_sdk_1.xdr.ScMapEntry({
                key: stellar_sdk_1.xdr.ScVal.scvSymbol('denomination'),
                val: stellar_sdk_1.xdr.ScVal.scvSymbol(vaultKey.denomination),
            }),
            new stellar_sdk_1.xdr.ScMapEntry({
                key: stellar_sdk_1.xdr.ScVal.scvSymbol('index'),
                val: (0, stellar_sdk_1.nativeToScVal)(vaultKey.index, { type: 'u128' }),
            }),
        ]);
        const new_prev_key = (0, utils_1.generateOptionalVaultKeyScVal)(newPrevKey);
        const amount = (0, stellar_sdk_1.nativeToScVal)(params.amount, { type: 'u128' });
        const account = await this.server.getAccount(params.caller);
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .addOperation(this.contract.call(params.operationType, prev_key, vault_key, new_prev_key, amount))
            .setTimeout(0)
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.vault, simulated);
        }
        const prepared = (0, soroban_1.assembleTransaction)(tx, simulated).build();
        return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
    }
    async redeem(params) {
        const account = await this.server.getAccount(params.caller);
        const caller = (0, stellar_sdk_1.nativeToScVal)(account.accountId(), { type: 'address' });
        const denomination = (0, stellar_sdk_1.nativeToScVal)(params.denomination, { type: 'symbol' });
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .setTimeout(0)
            .addOperation(this.contract.call(interfaces_1.FxDAOVaultsContractMethods.redeem, caller, denomination))
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.vault, simulated);
        }
        const prepared = (0, soroban_1.assembleTransaction)(tx, simulated).build();
        return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
    }
    async liquidate(params) {
        const account = await this.server.getAccount(params.caller);
        const liquidator = (0, stellar_sdk_1.nativeToScVal)(account.accountId(), { type: 'address' });
        const denomination = (0, stellar_sdk_1.nativeToScVal)(params.denomination, { type: 'symbol' });
        const total_vaults_to_liquidate = (0, stellar_sdk_1.nativeToScVal)(params.totalVaults, { type: 'u32' });
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .setTimeout(0)
            .addOperation(this.contract.call(interfaces_1.FxDAOVaultsContractMethods.liquidate, liquidator, denomination, total_vaults_to_liquidate))
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.vault, simulated);
        }
        const prepared = (0, soroban_1.assembleTransaction)(tx, simulated).build();
        return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
    }
    // --- Pure View functions
    async getVaultsInfo(params) {
        const denomination = (0, stellar_sdk_1.nativeToScVal)(params.denomination, { type: 'symbol' });
        const tx = new stellar_sdk_1.TransactionBuilder(new stellar_sdk_1.Account(this.globalParams.simulationAccount, '0'), {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
        })
            .addOperation(this.contract.call(interfaces_1.FxDAOVaultsContractMethods.get_vaults_info, denomination))
            .setTimeout(0)
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.vault, simulated);
        }
        return (0, stellar_sdk_1.scValToNative)(simulated.result.retval);
    }
    async findPrevVaultKey(params) {
        const vaultsInfo = await this.getVaultsInfo({ denomination: params.denomination });
        let prevKeyValue;
        /**
         * There are four cases when using the lowest key:
         * - If the lowest key is "None" it means there is no Vault created
         * - If the index of the lowest key is higher than the index we are looking for it means this new vault will be the new lowest key
         * - If the lowest key is owned by the account and it has the same index, we return none since this account if going to still be the lowest key
         */
        if (vaultsInfo.lowest_key[0] === 'None' ||
            vaultsInfo.lowest_key[1].index > params.targetIndex ||
            (vaultsInfo.lowest_key[1].index === params.targetIndex &&
                vaultsInfo.lowest_key[1].account === params.account.toString())) {
            return ['None'];
        }
        if (vaultsInfo.lowest_key[1].account !== params.account.toString()) {
            if (vaultsInfo.lowest_key[1].index === params.targetIndex) {
                return ['None'];
            }
            const lowestVault = await this.getVault({
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
        }
        else {
            prevKeyValue = ['None'];
        }
        let found = false;
        while (!found) {
            const vaults = await this.getVaults({
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
                if (vault.next_key[0] === 'None' ||
                    vault.next_key[1].index >= params.targetIndex ||
                    vault.next_key[1].account === params.account.toString()) {
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
    async getVault(params) {
        const user = (0, stellar_sdk_1.nativeToScVal)(params.user, { type: 'address' });
        const denomination = (0, stellar_sdk_1.nativeToScVal)(params.denomination, { type: 'symbol' });
        const tx = new stellar_sdk_1.TransactionBuilder(new stellar_sdk_1.Account(this.globalParams.simulationAccount, '0'), {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
        })
            .addOperation(this.contract.call(interfaces_1.FxDAOVaultsContractMethods.get_vault, user, denomination))
            .setTimeout(0)
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.vault, simulated);
        }
        return (0, stellar_sdk_1.scValToNative)(simulated.result.retval);
    }
    async getVaults(params) {
        const prev_key = (0, utils_1.generateOptionalVaultKeyScVal)(params.prevKey || ['None']);
        const denomination = (0, stellar_sdk_1.nativeToScVal)(params.denomination, { type: 'symbol' });
        const total = (0, stellar_sdk_1.nativeToScVal)(params.total, { type: 'u32' });
        const only_to_liquidate = (0, stellar_sdk_1.nativeToScVal)(params.onlyToLiquidate, { type: 'bool' });
        const account = new stellar_sdk_1.Account(this.globalParams.simulationAccount, '0');
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .setTimeout(0)
            .addOperation(this.contract.call(interfaces_1.FxDAOVaultsContractMethods.get_vaults, prev_key, denomination, total, only_to_liquidate))
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.vault, simulated);
        }
        return (0, stellar_sdk_1.scValToNative)(simulated.result.retval);
    }
}
exports.VaultsContract = VaultsContract;
var FindPrevVaultKeyType;
(function (FindPrevVaultKeyType) {
    FindPrevVaultKeyType[FindPrevVaultKeyType["new_vault"] = 0] = "new_vault";
    FindPrevVaultKeyType[FindPrevVaultKeyType["update_vault"] = 1] = "update_vault";
    FindPrevVaultKeyType[FindPrevVaultKeyType["remove_vault"] = 2] = "remove_vault";
})(FindPrevVaultKeyType = exports.FindPrevVaultKeyType || (exports.FindPrevVaultKeyType = {}));
