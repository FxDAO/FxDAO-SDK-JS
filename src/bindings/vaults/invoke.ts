import * as SorobanClient from 'soroban-client';
import { SorobanRpc } from 'soroban-client';
import type { Account, Memo, MemoType, Operation, Transaction, xdr } from 'soroban-client';
import type { ClassOptions, MethodOptions, ResponseTypes, Wallet } from './method-options.js';

export type Tx = Transaction<Memo<MemoType>, Operation[]>;
async function getAccount(publicKey: string, server: SorobanClient.Server): Promise<Account | null> {
  return await server.getAccount(publicKey);
}

export class NotImplementedError extends Error {}

type Simulation = SorobanRpc.SimulateTransactionResponse;
type SendTx = SorobanRpc.SendTransactionResponse;
type GetTx = SorobanRpc.GetTransactionResponse;

// defined this way so typeahead shows full union, not named alias
let someRpcResponse: Simulation | SendTx | GetTx;
type SomeRpcResponse = typeof someRpcResponse;

type InvokeArgs<R extends ResponseTypes, T = string> = MethodOptions<R> &
  ClassOptions & {
    method: string;
    args?: any[];
    parseResultXdr: (xdr: string | xdr.ScVal) => T;
  };

/**
 * Invoke a method on the test_custom_types contract.
 *
 * Uses Freighter to determine the current user and if necessary sign the transaction.
 *
 * @returns {T}, by default, the parsed XDR from either the simulation or the full transaction. If `simulateOnly` or `fullRpcResponse` are true, returns either the full simulation or the result of sending/getting the transaction to/from the ledger.
 */
export async function invoke<R extends ResponseTypes, T = string>({
  method,
  args = [],
  fee = 100,
  responseType,
  parseResultXdr,
  secondsToWait = 10,
  rpcUrl,
  networkPassphrase,
  contractId,
  publicKey,
}: InvokeArgs<R, T>): Promise<{
  tx: SorobanClient.Transaction;
  simulated: SorobanRpc.SimulateTransactionSuccessResponse;
}> {
  const parse = parseResultXdr;
  const server = new SorobanClient.Server(rpcUrl, {
    allowHttp: true,
  });
  const account = await getAccount(publicKey, server);

  if (!account) {
    throw new Error("Account doesn't exist");
  }

  const contract = new SorobanClient.Contract(contractId);

  const tx = new SorobanClient.TransactionBuilder(account, {
    fee: fee.toString(10),
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();
  const simulated = await server.simulateTransaction(tx);

  if (SorobanRpc.isSimulationError(simulated)) {
    throw new Error(simulated.error);
  } else {
    return { tx, simulated };
  }
}
