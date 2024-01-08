"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyPoolContract = void 0;
const interfaces_1 = require("../interfaces");
const stellar_sdk_1 = require("stellar-sdk");
const soroban_1 = require("stellar-sdk/lib/soroban");
const utils_1 = require("../utils");
class SafetyPoolContract {
    constructor(globalParams) {
        this.globalParams = globalParams;
    }
    get server() {
        return new soroban_1.Server(this.globalParams.rpc, { allowHttp: !!this.globalParams.allowHttp });
    }
    get contract() {
        return new stellar_sdk_1.Contract(this.globalParams.contractId);
    }
    async deposit(params) {
        const account = await this.server.getAccount(params.caller);
        const caller = (0, stellar_sdk_1.nativeToScVal)(account.accountId(), { type: 'address' });
        const amount = (0, stellar_sdk_1.nativeToScVal)(params.amount, { type: 'u128' });
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .setTimeout(0)
            .addOperation(this.contract.call(interfaces_1.FxDAOSafetyPoolContractMethods.deposit, caller, amount))
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.safety_pool, simulated);
        }
        const prepared = (0, soroban_1.assembleTransaction)(tx, simulated).build();
        return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
    }
    async withdraw(params) {
        const account = await this.server.getAccount(params.caller);
        const caller = (0, stellar_sdk_1.nativeToScVal)(account.accountId(), { type: 'address' });
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .setTimeout(0)
            .addOperation(this.contract.call(interfaces_1.FxDAOSafetyPoolContractMethods.withdraw, caller))
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.safety_pool, simulated);
        }
        const prepared = (0, soroban_1.assembleTransaction)(tx, simulated).build();
        return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
    }
    async withdrawReward(params) {
        const account = await this.server.getAccount(params.caller);
        const caller = (0, stellar_sdk_1.nativeToScVal)(account.accountId(), { type: 'address' });
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .setTimeout(0)
            .addOperation(this.contract.call(interfaces_1.FxDAOSafetyPoolContractMethods.withdraw_col, caller))
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.safety_pool, simulated);
        }
        const prepared = (0, soroban_1.assembleTransaction)(tx, simulated).build();
        return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
    }
    async liquidate(params) {
        const account = await this.server.getAccount(params.caller);
        const caller = (0, stellar_sdk_1.nativeToScVal)(account.accountId(), { type: 'address' });
        const tx = new stellar_sdk_1.TransactionBuilder(account, {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
            memo: params.memo,
        })
            .setTimeout(0)
            .addOperation(this.contract.call(interfaces_1.FxDAOSafetyPoolContractMethods.liquidate, caller))
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.safety_pool, simulated);
        }
        const prepared = (0, soroban_1.assembleTransaction)(tx, simulated).build();
        return { transactionXDR: tx.toXDR(), simulated, preparedTransactionXDR: prepared.toXDR() };
    }
    // --- Pure View functions
    async getCoreState() {
        const tx = new stellar_sdk_1.TransactionBuilder(new stellar_sdk_1.Account(this.globalParams.simulationAccount, '0'), {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
        })
            .addOperation(this.contract.call(interfaces_1.FxDAOSafetyPoolContractMethods.get_core_state))
            .setTimeout(0)
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.safety_pool, simulated);
        }
        return (0, stellar_sdk_1.scValToNative)(simulated.result.retval);
    }
    async getCoreStats() {
        const tx = new stellar_sdk_1.TransactionBuilder(new stellar_sdk_1.Account(this.globalParams.simulationAccount, '0'), {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
        })
            .addOperation(this.contract.call(interfaces_1.FxDAOSafetyPoolContractMethods.get_core_stats))
            .setTimeout(0)
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.safety_pool, simulated);
        }
        return (0, stellar_sdk_1.scValToNative)(simulated.result.retval);
    }
    async getDeposit(caller) {
        const val = new stellar_sdk_1.Address(caller).toScVal();
        const tx = new stellar_sdk_1.TransactionBuilder(new stellar_sdk_1.Account(this.globalParams.simulationAccount, '0'), {
            fee: this.globalParams.defaultFee,
            networkPassphrase: this.globalParams.network,
        })
            .addOperation(this.contract.call(interfaces_1.FxDAOSafetyPoolContractMethods.get_deposit, val))
            .setTimeout(0)
            .build();
        const simulated = await this.server.simulateTransaction(tx);
        if (soroban_1.Api.isSimulationError(simulated)) {
            throw (0, utils_1.parseError)(utils_1.ParseErrorType.safety_pool, simulated);
        }
        return (0, stellar_sdk_1.scValToNative)(simulated.result.retval);
    }
}
exports.SafetyPoolContract = SafetyPoolContract;
