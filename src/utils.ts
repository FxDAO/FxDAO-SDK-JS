import { nativeToScVal, scValToNative, xdr, SorobanRpc } from '@stellar/stellar-sdk';
import { VaultsTypes } from './interfaces/vaults';
import { VaultsErrors } from './errors/vaults';

export function calculateVaultIndex(params: { collateral: bigint; debt: bigint }): bigint {
  return (params.collateral * 1000000000n) / params.debt;
}

export function generateOptionalVaultKeyScVal(vaultKey: VaultsTypes['OptionalVaultKey']): xdr.ScVal {
  const struct: xdr.ScVal[] = [];
  struct.push(xdr.ScVal.scvSymbol(vaultKey[0]));

  if (vaultKey[0] === 'Some') {
    struct.push(
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('account'),
          val: nativeToScVal(vaultKey[1].account, { type: 'address' }),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('denomination'),
          val: nativeToScVal(vaultKey[1].denomination, { type: 'symbol' }),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol('index'),
          val: nativeToScVal(vaultKey[1].index, { type: 'u128' }),
        }),
      ])
    );
  }

  return xdr.ScVal.scvVec(struct);
}

export enum ParseErrorType {
  vault,
  safety_pool,
  stable_pool,
  governance,
}

export function parseError(
  type: ParseErrorType,
  response: SorobanRpc.Api.SimulateTransactionErrorResponse
): {
  error: number;
  message: string;
  diagnostic?: string;
} {
  const error: number = errorCodeFromSimulated(response);
  let message: string;

  if (error === 10) {
    message = 'Not enough funds, make sure you have enough funds to complete the process';
  } else {
    switch (type) {
      case ParseErrorType.vault:
        message = VaultsErrors[error] || 'Unhandled error, please contact support (Code: Vault-00)';
        break;

      default:
        message = 'Unhandled error';
        break;
    }
  }

  return {
    error,
    message,
    diagnostic: response.error,
  };
}

export function errorCodeFromSimulated(response: SorobanRpc.Api.SimulateTransactionErrorResponse): number | -1 {
  let errorCode: number;
  try {
    const errorCodeVal = (response as any).events
      .slice(-1)[0]
      .event()
      .body()
      .value()
      .data()
      .value()
      .slice(-1)[0]
      .value();

    errorCode = scValToNative(errorCodeVal);
  } catch (e) {
    errorCode = -1;
  }

  return errorCode;
}
