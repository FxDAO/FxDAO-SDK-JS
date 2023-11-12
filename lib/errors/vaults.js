"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultsErrors = void 0;
exports.VaultsErrors = {
    500: `There was an unexpected error, please contact support (Code: Vaults-500)`,
    10000: `Core state has already been set (Code: Vaults-10000)`,
    20000: `Vaults info has not started (Code: Vaults-20000)`,
    20001: `There are no vaults (Code: Vaults-20001)`,
    30000: `Invalid min debt amount (Code: Vaults-30000)`,
    40000: `Opening collateral ratio is invalid (Code: Vaults-40000)`,
    50000: `Vault doesn't exist (Code: Vaults-50000)`,
    50001: `User already has a vault with this denomination (Code: Vaults-50001)`,
    50002: `User vault index is invalid (Code: Vaults-50002)`,
    50003: `User vault can't be liquidated (Code: Vaults-50003)`,
    50004: `Invalid prev vault index (Code: Vaults-50004)`,
    50005: `Prev vault cant be none (Code: Vaults-50005)`,
    50006: `Prev vault doesn't exist (Code: Vaults-50006)`,
    50007: `The next index of the prev vault is lower than the new vault index (Code: Vaults-50007)`,
    50008: `The next index of the prev vault is invalid (Code: Vaults-50008)`,
    50009: `Index provided is not the one saved (Code: Vaults-50009)`,
    50010: `Next prev vault should be none (Code: Vaults-50010)`,
    50011: `Not enough vaults to liquidate (Code: Vaults-50011)`,
    60000: `Deposit amount is more than the total debt (Code: Vaults-60000)`,
    70000: `Collateral rate is under the minimum allowed (Code: Vaults-70000)`,
    80000: `Not enough funds to redeem (Code: Vaults-80000)`,
    90000: `Currency is already created (Code: Vaults-90000)`,
    90001: `Currency doesnt exist (Code: Vaults-90001)`,
    90002: `Currency is inactive (Code: Vaults-90002)`,
};
