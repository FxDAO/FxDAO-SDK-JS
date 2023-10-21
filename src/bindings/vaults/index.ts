import * as SorobanClient from 'soroban-client';
import { ContractSpec, Address } from 'soroban-client';
import { Buffer } from 'buffer';
import { invoke } from './invoke.js';
import type { ResponseTypes, Wallet, ClassOptions } from './method-options.js';
import { Denomination } from '../../interfaces';

export * from './invoke.js';
export * from './method-options.js';

export type u32 = number;
export type i32 = number;
export type u64 = bigint;
export type i64 = bigint;
export type u128 = bigint;
export type i128 = bigint;
export type u256 = bigint;
export type i256 = bigint;
export type Option<T> = T | undefined;
export type Typepoint = bigint;
export type Duration = bigint;
export { Address };

/// Error interface containing the error message
export interface Error_ {
  message: string;
}

export interface Result<T, E extends Error_> {
  unwrap(): T;
  unwrapErr(): E;
  isOk(): boolean;
  isErr(): boolean;
}

export class Ok<T, E extends Error_ = Error_> implements Result<T, E> {
  constructor(readonly value: T) {}
  unwrapErr(): E {
    throw new Error('No error');
  }
  unwrap(): T {
    return this.value;
  }

  isOk(): boolean {
    return true;
  }

  isErr(): boolean {
    return !this.isOk();
  }
}

export class Err<E extends Error_ = Error_> implements Result<any, E> {
  constructor(readonly error: E) {}
  unwrapErr(): E {
    return this.error;
  }
  unwrap(): never {
    throw new Error(this.error.message);
  }

  isOk(): boolean {
    return false;
  }

  isErr(): boolean {
    return !this.isOk();
  }
}

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}

const regex = /Error\(Contract, #(\d+)\)/;

function parseError(message: string): Err | undefined {
  const match = message.match(regex);
  if (!match) {
    return undefined;
  }
  if (Errors === undefined) {
    return undefined;
  }
  const i = parseInt(match[1], 10);
  const err = Errors[i];
  if (err) {
    return new Err(err);
  }
  return undefined;
}

export const networks = {
  futurenet: {
    networkPassphrase: 'Test SDF Future Network ; October 2022',
    contractId: 'CCRS74R4Q76U3Y2KBOI4WI7TFSFXS5U7QWVPQLFPPML74BPZXWIYURMV',
  },
} as const;

export interface CoreState {
  admin: Address;
  col_token: Address;
  oracle_admin: Address;
  panic_mode: boolean;
  protocol_manager: Address;
  stable_issuer: Address;
}

export type CoreDataKeys = { tag: 'CoreState'; values: void };

export interface Currency {
  active: boolean;
  contract: Address;
  denomination: string;
  last_update: u64;
  rate: u128;
}

export type CurrenciesDataKeys = { tag: 'Currency'; values: readonly [string] };

export type OptionalVaultKey = ['None'] | ['Some', VaultKey];

export interface VaultsInfo {
  denomination: string;
  lowest_key: OptionalVaultKey;
  min_col_rate: u128;
  min_debt_creation: u128;
  opening_col_rate: u128;
  total_col: u128;
  total_debt: u128;
  total_vaults: u64;
}

export interface VaultKey {
  // Note: when using scvaltonative doesn't generate an Address and instead a regular string
  account: Address;
  denomination: string;
  index: u128;
}

export interface Vault {
  account: Address;
  denomination: Denomination;
  index: u128;
  next_key: OptionalVaultKey;
  total_collateral: u128;
  total_debt: u128;
}

export interface VaultIndexKey {
  denomination: string;
  user: Address;
}

export type VaultsDataKeys =
  | { tag: 'VaultsInfo'; values: readonly [string] }
  | { tag: 'Vault'; values: readonly [VaultKey] }
  | { tag: 'VaultIndex'; values: readonly [VaultIndexKey] };

const Errors: { [x: number]: { message: string } } = {
  500: { message: '' },
  10000: { message: '' },
  20000: { message: '' },
  20001: { message: '' },
  30000: { message: '' },
  40000: { message: '' },
  50000: { message: '' },
  50001: { message: '' },
  50002: { message: '' },
  50003: { message: '' },
  50004: { message: '' },
  50005: { message: '' },
  50006: { message: '' },
  50007: { message: '' },
  50008: { message: '' },
  50009: { message: '' },
  50010: { message: '' },
  50011: { message: '' },
  60000: { message: '' },
  70000: { message: '' },
  80000: { message: '' },
  90000: { message: '' },
  90001: { message: '' },
  90002: { message: '' },
};
//
// export class Contract {
//   spec: ContractSpec;
//   constructor(public readonly options: ClassOptions) {
//     this.spec = new ContractSpec([
//       'AAAAAAAAAAAAAAAEaW5pdAAAAAUAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMb3JhY2xlX2FkbWluAAAAEwAAAAAAAAAQcHJvdG9jb2xfbWFuYWdlcgAAABMAAAAAAAAACWNvbF90b2tlbgAAAAAAABMAAAAAAAAADXN0YWJsZV9pc3N1ZXIAAAAAAAATAAAAAA==',
//       'AAAAAAAAAAAAAAAOZ2V0X2NvcmVfc3RhdGUAAAAAAAAAAAABAAAH0AAAAAlDb3JlU3RhdGUAAAA=',
//       'AAAAAAAAAAAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAA==',
//       'AAAAAAAAAAAAAAAUc2V0X3Byb3RvY29sX21hbmFnZXIAAAABAAAAAAAAAAdhZGRyZXNzAAAAABMAAAAA',
//       'AAAAAAAAAAAAAAAHdXBncmFkZQAAAAABAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAA',
//       'AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAA+0AAAACAAAAEQAAABE=',
//       'AAAAAAAAAAAAAAAPY3JlYXRlX2N1cnJlbmN5AAAAAAIAAAAAAAAADGRlbm9taW5hdGlvbgAAABEAAAAAAAAACGNvbnRyYWN0AAAAEwAAAAA=',
//       'AAAAAAAAAAAAAAAMZ2V0X2N1cnJlbmN5AAAAAQAAAAAAAAAMZGVub21pbmF0aW9uAAAAEQAAAAEAAAfQAAAACEN1cnJlbmN5',
//       'AAAAAAAAAAAAAAARc2V0X2N1cnJlbmN5X3JhdGUAAAAAAAACAAAAAAAAAAxkZW5vbWluYXRpb24AAAARAAAAAAAAAARyYXRlAAAACgAAAAA=',
//       'AAAAAAAAAAAAAAAPdG9nZ2xlX2N1cnJlbmN5AAAAAAIAAAAAAAAADGRlbm9taW5hdGlvbgAAABEAAAAAAAAABmFjdGl2ZQAAAAAAAQAAAAA=',
//       'AAAAAAAAAAAAAAAUc2V0X3ZhdWx0X2NvbmRpdGlvbnMAAAAEAAAAAAAAAAxtaW5fY29sX3JhdGUAAAAKAAAAAAAAABFtaW5fZGVidF9jcmVhdGlvbgAAAAAAAAoAAAAAAAAAEG9wZW5pbmdfY29sX3JhdGUAAAAKAAAAAAAAAAxkZW5vbWluYXRpb24AAAARAAAAAA==',
//       'AAAAAAAAAAAAAAAPZ2V0X3ZhdWx0c19pbmZvAAAAAAEAAAAAAAAADGRlbm9taW5hdGlvbgAAABEAAAABAAAH0AAAAApWYXVsdHNJbmZvAAA=',
//       'AAAAAAAAAAAAAAAXY2FsY3VsYXRlX2RlcG9zaXRfcmF0aW8AAAAAAwAAAAAAAAANY3VycmVuY3lfcmF0ZQAAAAAAAAoAAAAAAAAACmNvbGxhdGVyYWwAAAAAAAoAAAAAAAAABGRlYnQAAAAKAAAAAQAAAAo=',
//       'AAAAAAAAAAAAAAAJbmV3X3ZhdWx0AAAAAAAABQAAAAAAAAAIcHJldl9rZXkAAAfQAAAAEE9wdGlvbmFsVmF1bHRLZXkAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAAMaW5pdGlhbF9kZWJ0AAAACgAAAAAAAAARY29sbGF0ZXJhbF9hbW91bnQAAAAAAAAKAAAAAAAAAAxkZW5vbWluYXRpb24AAAARAAAAAA==',
//       'AAAAAAAAAAAAAAAJZ2V0X3ZhdWx0AAAAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAADGRlbm9taW5hdGlvbgAAABEAAAABAAAH0AAAAAVWYXVsdAAAAA==',
//       'AAAAAAAAAAAAAAASZ2V0X3ZhdWx0X2Zyb21fa2V5AAAAAAABAAAAAAAAAAl2YXVsdF9rZXkAAAAAAAfQAAAACFZhdWx0S2V5AAAAAQAAB9AAAAAFVmF1bHQAAAA=',
//       'AAAAAAAAAAAAAAAKZ2V0X3ZhdWx0cwAAAAAABAAAAAAAAAAIcHJldl9rZXkAAAfQAAAAEE9wdGlvbmFsVmF1bHRLZXkAAAAAAAAADGRlbm9taW5hdGlvbgAAABEAAAAAAAAABXRvdGFsAAAAAAAABAAAAAAAAAARb25seV90b19saXF1aWRhdGUAAAAAAAABAAAAAQAAA+oAAAfQAAAABVZhdWx0AAAA',
//       'AAAAAAAAAAAAAAATaW5jcmVhc2VfY29sbGF0ZXJhbAAAAAAEAAAAAAAAAAhwcmV2X2tleQAAB9AAAAAQT3B0aW9uYWxWYXVsdEtleQAAAAAAAAAJdmF1bHRfa2V5AAAAAAAH0AAAAAhWYXVsdEtleQAAAAAAAAAMbmV3X3ByZXZfa2V5AAAH0AAAABBPcHRpb25hbFZhdWx0S2V5AAAAAAAAAAZhbW91bnQAAAAAAAoAAAAA',
//       'AAAAAAAAAAAAAAANaW5jcmVhc2VfZGVidAAAAAAAAAQAAAAAAAAACHByZXZfa2V5AAAH0AAAABBPcHRpb25hbFZhdWx0S2V5AAAAAAAAAAl2YXVsdF9rZXkAAAAAAAfQAAAACFZhdWx0S2V5AAAAAAAAAAxuZXdfcHJldl9rZXkAAAfQAAAAEE9wdGlvbmFsVmF1bHRLZXkAAAAAAAAABmFtb3VudAAAAAAACgAAAAA=',
//       'AAAAAAAAAAAAAAAIcGF5X2RlYnQAAAAEAAAAAAAAAAhwcmV2X2tleQAAB9AAAAAQT3B0aW9uYWxWYXVsdEtleQAAAAAAAAAJdmF1bHRfa2V5AAAAAAAH0AAAAAhWYXVsdEtleQAAAAAAAAAMbmV3X3ByZXZfa2V5AAAH0AAAABBPcHRpb25hbFZhdWx0S2V5AAAAAAAAAA5kZXBvc2l0X2Ftb3VudAAAAAAACgAAAAA=',
//       'AAAAAAAAAAAAAAAGcmVkZWVtAAAAAAACAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAADGRlbm9taW5hdGlvbgAAABEAAAAA',
//       'AAAAAAAAAAAAAAAJbGlxdWlkYXRlAAAAAAAAAwAAAAAAAAAKbGlxdWlkYXRvcgAAAAAAEwAAAAAAAAAMZGVub21pbmF0aW9uAAAAEQAAAAAAAAAZdG90YWxfdmF1bHRzX3RvX2xpcXVpZGF0ZQAAAAAAAAQAAAABAAAD6gAAB9AAAAAFVmF1bHQAAAA=',
//       'AAAAAQAAAAAAAAAAAAAACUNvcmVTdGF0ZQAAAAAAAAYAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJY29sX3Rva2VuAAAAAAAAEwAAAAAAAAAMb3JhY2xlX2FkbWluAAAAEwAAAAAAAAAKcGFuaWNfbW9kZQAAAAAAAQAAAAAAAAAQcHJvdG9jb2xfbWFuYWdlcgAAABMAAAAAAAAADXN0YWJsZV9pc3N1ZXIAAAAAAAAT',
//       'AAAAAgAAAAAAAAAAAAAADENvcmVEYXRhS2V5cwAAAAEAAAAAAAAAAAAAAAlDb3JlU3RhdGUAAAA=',
//       'AAAAAQAAAAAAAAAAAAAACEN1cnJlbmN5AAAABQAAAAAAAAAGYWN0aXZlAAAAAAABAAAAAAAAAAhjb250cmFjdAAAABMAAAAAAAAADGRlbm9taW5hdGlvbgAAABEAAAAAAAAAC2xhc3RfdXBkYXRlAAAAAAYAAAAAAAAABHJhdGUAAAAK',
//       'AAAAAgAAAAAAAAAAAAAAEkN1cnJlbmNpZXNEYXRhS2V5cwAAAAAAAQAAAAEAAAAAAAAACEN1cnJlbmN5AAAAAQAAABE=',
//       'AAAAAgAAAAAAAAAAAAAAEE9wdGlvbmFsVmF1bHRLZXkAAAACAAAAAAAAAAAAAAAETm9uZQAAAAEAAAAAAAAABFNvbWUAAAABAAAH0AAAAAhWYXVsdEtleQ==',
//       'AAAAAQAAAAAAAAAAAAAAClZhdWx0c0luZm8AAAAAAAgAAAAAAAAADGRlbm9taW5hdGlvbgAAABEAAAAAAAAACmxvd2VzdF9rZXkAAAAAB9AAAAAQT3B0aW9uYWxWYXVsdEtleQAAAAAAAAAMbWluX2NvbF9yYXRlAAAACgAAAAAAAAARbWluX2RlYnRfY3JlYXRpb24AAAAAAAAKAAAAAAAAABBvcGVuaW5nX2NvbF9yYXRlAAAACgAAAAAAAAAJdG90YWxfY29sAAAAAAAACgAAAAAAAAAKdG90YWxfZGVidAAAAAAACgAAAAAAAAAMdG90YWxfdmF1bHRzAAAABg==',
//       'AAAAAQAAAAAAAAAAAAAACFZhdWx0S2V5AAAAAwAAAAAAAAAHYWNjb3VudAAAAAATAAAAAAAAAAxkZW5vbWluYXRpb24AAAARAAAAAAAAAAVpbmRleAAAAAAAAAo=',
//       'AAAAAQAAAAAAAAAAAAAABVZhdWx0AAAAAAAABgAAAAAAAAAHYWNjb3VudAAAAAATAAAAAAAAAAxkZW5vbWluYXRpb24AAAARAAAAAAAAAAVpbmRleAAAAAAAAAoAAAAAAAAACG5leHRfa2V5AAAH0AAAABBPcHRpb25hbFZhdWx0S2V5AAAAAAAAABB0b3RhbF9jb2xsYXRlcmFsAAAACgAAAAAAAAAKdG90YWxfZGVidAAAAAAACg==',
//       'AAAAAQAAAAAAAAAAAAAADVZhdWx0SW5kZXhLZXkAAAAAAAACAAAAAAAAAAxkZW5vbWluYXRpb24AAAARAAAAAAAAAAR1c2VyAAAAEw==',
//       'AAAAAgAAAAAAAAAAAAAADlZhdWx0c0RhdGFLZXlzAAAAAAADAAAAAQAAAFBHZW5lcmFsIGluZm9ybWF0aW9uIGJ5IGN1cnJlbmN5LgpTeW1ib2wgaXMgdGhlIGRlbm9taW5hdGlvbiwgbm90IHRoZSBhc3NldCBjb2RlLgAAAApWYXVsdHNJbmZvAAAAAAABAAAAEQAAAAEAAADSQnkgdXNpbmcgdGhlIGluZGV4IGFuZCBkZW5vbWluYXRpb24gKFZhdWx0S2V5KSB3ZSBjYW4gZ2V0IGEgVmF1bHQsIGFsbCBWYXVsdHMnIGluZGV4ZXMgYXJlIHVuaXF1ZS4KSW4gY2FzZXMgd2hlcmUgdGhlIGluZGV4IChjb2xsYXRlcmFsIC8gZGVidCkgaXMgdGhlIHNhbWUgYXMgb25lIGFscmVhZHkgY3JlYXRlZCwgd2UgYWRkIDEgdG8gaXQgdW50aWwgaXMgdW5pcXVlAAAAAAAFVmF1bHQAAAAAAAABAAAH0AAAAAhWYXVsdEtleQAAAAEAAAC2QnkgdXNpbmcgdGhlIGNvbWJpbmF0aW9uIG9mIHRoZSBkZW5vbWluYXRpb24gYW5kIHRoZSBhZGRyZXNzIChWYXVsdEluZGV4S2V5KSB3ZSBjYW4gZ2V0CnRoZSBpbmRleCBvZiB0aGUgdmF1bHQgc28gdGhlIHVzZXIgZG9lc24ndCBuZWVkIHRvIGtub3cgdGhlIGluZGV4IG9mIGl0cyBvd24gdmF1bHQgYXQgYWxsIHRpbWUAAAAAAApWYXVsdEluZGV4AAAAAAABAAAH0AAAAA1WYXVsdEluZGV4S2V5AAAA',
//       'AAAABAAAAAAAAAAAAAAACFNDRXJyb3JzAAAAGAAAAAAAAAAPVW5leHBlY3RlZEVycm9yAAAAAfQAAAAAAAAADkNvcmVBbHJlYWR5U2V0AAAAACcQAAAAAAAAABdWYXVsdHNJbmZvSGFzTm90U3RhcnRlZAAAAE4gAAAAAAAAABBUaGVyZUFyZU5vVmF1bHRzAABOIQAAAAAAAAAUSW52YWxpZE1pbkRlYnRBbW91bnQAAHUwAAAAAAAAAB1JbnZhbGlkT3BlbmluZ0NvbGxhdGVyYWxSYXRpbwAAAAAAnEAAAAAAAAAAEFZhdWx0RG9lc250RXhpc3QAAMNQAAAAAAAAAB9Vc2VyQWxyZWFkeUhhc0Rlbm9taW5hdGlvblZhdWx0AAAAw1EAAAAAAAAAF1VzZXJWYXVsdEluZGV4SXNJbnZhbGlkAAAAw1IAAAAAAAAAGVVzZXJWYXVsdENhbnRCZUxpcXVpZGF0ZWQAAAAAAMNTAAAAAAAAABVJbnZhbGlkUHJldlZhdWx0SW5kZXgAAAAAAMNUAAAAAAAAABNQcmV2VmF1bHRDYW50QmVOb25lAAAAw1UAAAAAAAAAFFByZXZWYXVsdERvZXNudEV4aXN0AADDVgAAAAAAAAAlUHJldlZhdWx0TmV4dEluZGV4SXNMb3dlclRoYW5OZXdWYXVsdAAAAAAAw1cAAAAAAAAAG1ByZXZWYXVsdE5leHRJbmRleElzSW52YWxpZAAAAMNYAAAAAAAAAB1JbmRleFByb3ZpZGVkSXNOb3RUaGVPbmVTYXZlZAAAAAAAw1kAAAAAAAAAGU5leHRQcmV2VmF1bHRTaG91bGRCZU5vbmUAAAAAAMNaAAAAAAAAABpOb3RFbm91Z2hWYXVsdHNUb0xpcXVpZGF0ZQAAAADDWwAAAAAAAAAgRGVwb3NpdEFtb3VudElzTW9yZVRoYW5Ub3RhbERlYnQAAOpgAAAAAAAAABpDb2xsYXRlcmFsUmF0ZVVuZGVyTWluaW11bQAAAAERcAAAAAAAAAAWTm90RW5vdWdoRnVuZHNUb1JlZGVlbQAAAAE4gAAAAAAAAAAUQ3VycmVuY3lBbHJlYWR5QWRkZWQAAV+QAAAAAAAAABNDdXJyZW5jeURvZXNudEV4aXN0AAABX5EAAAAAAAAAEkN1cnJlbmN5SXNJbmFjdGl2ZQAAAAFfkg==',
//     ]);
//   }
//   async init<R extends ResponseTypes = undefined>(
//     {
//       admin,
//       oracle_admin,
//       protocol_manager,
//       col_token,
//       stable_issuer,
//     }: { admin: Address; oracle_admin: Address; protocol_manager: Address; col_token: Address; stable_issuer: Address },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'init',
//       args: this.spec.funcArgsToScVals('init', { admin, oracle_admin, protocol_manager, col_token, stable_issuer }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async getCoreState<R extends ResponseTypes = undefined>(
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `CoreState`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'get_core_state',
//       args: this.spec.funcArgsToScVals('get_core_state', {}),
//       ...options,
//       ...this.options,
//       parseResultXdr: (xdr): CoreState => {
//         return this.spec.funcResToNative('get_core_state', xdr);
//       },
//     });
//   }
//
//   async setAdmin<R extends ResponseTypes = undefined>(
//     { address }: { address: Address },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'set_admin',
//       args: this.spec.funcArgsToScVals('set_admin', { address }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async setProtocolManager<R extends ResponseTypes = undefined>(
//     { address }: { address: Address },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'set_protocol_manager',
//       args: this.spec.funcArgsToScVals('set_protocol_manager', { address }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async upgrade<R extends ResponseTypes = undefined>(
//     { new_wasm_hash }: { new_wasm_hash: Buffer },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'upgrade',
//       args: this.spec.funcArgsToScVals('upgrade', { new_wasm_hash }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async version<R extends ResponseTypes = undefined>(
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `readonly [string, string]`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'version',
//       args: this.spec.funcArgsToScVals('version', {}),
//       ...options,
//       ...this.options,
//       parseResultXdr: (xdr): readonly [string, string] => {
//         return this.spec.funcResToNative('version', xdr);
//       },
//     });
//   }
//
//   async createCurrency<R extends ResponseTypes = undefined>(
//     { denomination, contract }: { denomination: string; contract: Address },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'create_currency',
//       args: this.spec.funcArgsToScVals('create_currency', { denomination, contract }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async getCurrency<R extends ResponseTypes = undefined>(
//     { denomination }: { denomination: string },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `Currency`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'get_currency',
//       args: this.spec.funcArgsToScVals('get_currency', { denomination }),
//       ...options,
//       ...this.options,
//       parseResultXdr: (xdr): Currency => {
//         return this.spec.funcResToNative('get_currency', xdr);
//       },
//     });
//   }
//
//   async setCurrencyRate<R extends ResponseTypes = undefined>(
//     { denomination, rate }: { denomination: string; rate: u128 },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'set_currency_rate',
//       args: this.spec.funcArgsToScVals('set_currency_rate', { denomination, rate }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async toggleCurrency<R extends ResponseTypes = undefined>(
//     { denomination, active }: { denomination: string; active: boolean },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'toggle_currency',
//       args: this.spec.funcArgsToScVals('toggle_currency', { denomination, active }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async setVaultConditions<R extends ResponseTypes = undefined>(
//     {
//       min_col_rate,
//       min_debt_creation,
//       opening_col_rate,
//       denomination,
//     }: { min_col_rate: u128; min_debt_creation: u128; opening_col_rate: u128; denomination: string },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'set_vault_conditions',
//       args: this.spec.funcArgsToScVals('set_vault_conditions', {
//         min_col_rate,
//         min_debt_creation,
//         opening_col_rate,
//         denomination,
//       }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async getVaultsInfo<R extends ResponseTypes = undefined>(
//     { denomination }: { denomination: string },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `VaultsInfo`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'get_vaults_info',
//       args: this.spec.funcArgsToScVals('get_vaults_info', { denomination }),
//       ...options,
//       ...this.options,
//       parseResultXdr: (xdr): VaultsInfo => {
//         return this.spec.funcResToNative('get_vaults_info', xdr);
//       },
//     });
//   }
//
//   async calculateDepositRatio<R extends ResponseTypes = undefined>(
//     { currency_rate, collateral, debt }: { currency_rate: u128; collateral: u128; debt: u128 },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `u128`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'calculate_deposit_ratio',
//       args: this.spec.funcArgsToScVals('calculate_deposit_ratio', { currency_rate, collateral, debt }),
//       ...options,
//       ...this.options,
//       parseResultXdr: (xdr): u128 => {
//         return this.spec.funcResToNative('calculate_deposit_ratio', xdr);
//       },
//     });
//   }
//
//   async newVault<R extends ResponseTypes = undefined>(
//     {
//       prev_key,
//       caller,
//       initial_debt,
//       collateral_amount,
//       denomination,
//     }: {
//       prev_key: OptionalVaultKey;
//       caller: Address;
//       initial_debt: u128;
//       collateral_amount: u128;
//       denomination: string;
//     },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'new_vault',
//       args: this.spec.funcArgsToScVals('new_vault', {
//         prev_key,
//         caller,
//         initial_debt,
//         collateral_amount,
//         denomination,
//       }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async getVault<R extends ResponseTypes = undefined>(
//     { user, denomination }: { user: Address; denomination: string },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `Vault`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'get_vault',
//       args: this.spec.funcArgsToScVals('get_vault', { user, denomination }),
//       ...options,
//       ...this.options,
//       parseResultXdr: (xdr): Vault => {
//         return this.spec.funcResToNative('get_vault', xdr);
//       },
//     });
//   }
//
//   async getVaultFromKey<R extends ResponseTypes = undefined>(
//     { vault_key }: { vault_key: VaultKey },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `Vault`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'get_vault_from_key',
//       args: this.spec.funcArgsToScVals('get_vault_from_key', { vault_key }),
//       ...options,
//       ...this.options,
//       parseResultXdr: (xdr): Vault => {
//         return this.spec.funcResToNative('get_vault_from_key', xdr);
//       },
//     });
//   }
//
//   async getVaults<R extends ResponseTypes = undefined>(
//     {
//       prev_key,
//       denomination,
//       total,
//       only_to_liquidate,
//     }: { prev_key: OptionalVaultKey; denomination: string; total: u32; only_to_liquidate: boolean },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `Array<Vault>`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'get_vaults',
//       args: this.spec.funcArgsToScVals('get_vaults', { prev_key, denomination, total, only_to_liquidate }),
//       ...options,
//       ...this.options,
//       parseResultXdr: (xdr): Array<Vault> => {
//         return this.spec.funcResToNative('get_vaults', xdr);
//       },
//     });
//   }
//
//   async increaseCollateral<R extends ResponseTypes = undefined>(
//     {
//       prev_key,
//       vault_key,
//       new_prev_key,
//       amount,
//     }: { prev_key: OptionalVaultKey; vault_key: VaultKey; new_prev_key: OptionalVaultKey; amount: u128 },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'increase_collateral',
//       args: this.spec.funcArgsToScVals('increase_collateral', { prev_key, vault_key, new_prev_key, amount }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async increaseDebt<R extends ResponseTypes = undefined>(
//     {
//       prev_key,
//       vault_key,
//       new_prev_key,
//       amount,
//     }: { prev_key: OptionalVaultKey; vault_key: VaultKey; new_prev_key: OptionalVaultKey; amount: u128 },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'increase_debt',
//       args: this.spec.funcArgsToScVals('increase_debt', { prev_key, vault_key, new_prev_key, amount }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async payDebt<R extends ResponseTypes = undefined>(
//     {
//       prev_key,
//       vault_key,
//       new_prev_key,
//       deposit_amount,
//     }: { prev_key: OptionalVaultKey; vault_key: VaultKey; new_prev_key: OptionalVaultKey; deposit_amount: u128 },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'pay_debt',
//       args: this.spec.funcArgsToScVals('pay_debt', { prev_key, vault_key, new_prev_key, deposit_amount }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async redeem<R extends ResponseTypes = undefined>(
//     { caller, denomination }: { caller: Address; denomination: string },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'redeem',
//       args: this.spec.funcArgsToScVals('redeem', { caller, denomination }),
//       ...options,
//       ...this.options,
//       parseResultXdr: () => {},
//     });
//   }
//
//   async liquidate<R extends ResponseTypes = undefined>(
//     {
//       liquidator,
//       denomination,
//       total_vaults_to_liquidate,
//     }: { liquidator: Address; denomination: string; total_vaults_to_liquidate: u32 },
//     options: {
//       /**
//        * The fee to pay for the transaction. Default: 100.
//        */
//       fee?: number;
//       /**
//        * What type of response to return.
//        *
//        *   - `undefined`, the default, parses the returned XDR as `Array<Vault>`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
//        *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
//        *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
//        */
//       responseType?: R;
//       /**
//        * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
//        */
//       secondsToWait?: number;
//     } = {}
//   ) {
//     return await invoke({
//       method: 'liquidate',
//       args: this.spec.funcArgsToScVals('liquidate', { liquidator, denomination, total_vaults_to_liquidate }),
//       ...options,
//       ...this.options,
//       parseResultXdr: (xdr): Array<Vault> => {
//         return this.spec.funcResToNative('liquidate', xdr);
//       },
//     });
//   }
// }
