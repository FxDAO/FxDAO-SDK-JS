import { OptionalVaultKey } from './bindings/vaults';
import { nativeToScVal, xdr } from 'soroban-client';

export function calculateVaultIndex(params: { collateral: bigint; debt: bigint }): bigint {
  return (params.collateral * 1000000000n) / params.debt;
}

export function generateOptionalVaultKeyScVal(vaultKey: OptionalVaultKey): xdr.ScVal {
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
