import { FindPrevVaultKeyType, VaultsContract } from './vaults.contract';
import {
  Account,
  Address,
  Contract,
  Keypair,
  nativeToScVal,
  Networks,
  scValToBigInt,
  scValToNative,
  SorobanRpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { Denomination, u32 } from '../interfaces';
import { VaultsTypes } from '../interfaces/vaults';

const fakeContract = 'CBPR5TSRYW3ONNKXU6QVURRXC5HMYUZEAXEGDKQ2BYIQN4XYKKYFP6ZD';
const network = Networks.STANDALONE;
const fakeRpc = 'https://rpc.com';
const fakeSimulationAccount = 'GAZ5H54I4O7QF64HBLVWWAPDZ7OYRI3EGMJ27YJGSTBE2L7VQNNEIWZF';

function getVaultsInfoMock(
  lowest_key: VaultsTypes['OptionalVaultKey'],
  total_vaults: bigint = 0n
): VaultsTypes['VaultsInfo'] {
  return {
    denomination: Denomination.USD,
    lowest_key,
    min_col_rate: 11000000n,
    min_debt_creation: 1000000000n,
    opening_col_rate: 11500000n,
    total_col: 0n,
    total_debt: 0n,
    total_vaults,
  };
}

async function getVaultsMock(params: {
  initialVaults: Array<VaultsTypes['Vault']>;
  prevKey?: VaultsTypes['OptionalVaultKey'];
  total: u32;
}): Promise<Array<VaultsTypes['Vault']>> {
  if (!params.prevKey || params.prevKey[0] === 'None') return params.initialVaults;

  const i: number = params.initialVaults.findIndex(
    // @ts-ignore
    v => params.prevKey[1].account === v.account && params.prevKey[1].index === v.index
  );

  return params.initialVaults.slice(i === -1 ? i + 1 : 0);
}

function createTestVaults(
  indexes: bigint[]
): Array<{ vaultKey: VaultsTypes['VaultKey']; vault: VaultsTypes['Vault'] }> {
  return indexes
    .slice()
    .reverse()
    .reduce((all: { vaultKey: VaultsTypes['VaultKey']; vault: VaultsTypes['Vault'] }[], currentVaultIndex: bigint) => {
      const vaultKey: VaultsTypes['VaultKey'] = {
        account: Keypair.random().publicKey(),
        denomination: Denomination.USD,
        index: currentVaultIndex,
      };
      const vault: VaultsTypes['Vault'] = {
        ...vaultKey,
        next_key: all[0] ? ['Some', all[0].vaultKey] : ['None'],
        total_collateral: 0n,
        total_debt: 0n,
      };
      return [{ vaultKey, vault }, ...all];
    }, []);
}

describe('Test VaultsContract class', () => {
  let contract: VaultsContract;

  describe('Test all situations where we need to get the prev_key', () => {
    beforeEach(() => {
      contract = new VaultsContract({
        stellarSDK: {
          xdr,
          TransactionBuilder,
          scValToNative,
          scValToBigInt,
          nativeToScVal,
          Contract,
          Address,
          Account,
          SorobanRpc,
        },
        contractId: fakeContract,
        defaultFee: '100',
        network,
        rpc: fakeRpc,
        simulationAccount: fakeSimulationAccount,
      });
    });

    const testIndex: bigint = 25238235n;
    const testIndexes: bigint[] = [
      17564285714n,
      18571428571n,
      20000000000n,
      32500000000n,
      32500000000n,
      50000000000n,
      60000000000n,
    ];
    const testVaults: Array<{ vaultKey: VaultsTypes['VaultKey']; vault: VaultsTypes['Vault'] }> =
      createTestVaults(testIndexes);

    test('No vault is created', async () => {
      jest.spyOn(contract, 'getVaultsInfo').mockImplementation(() => Promise.resolve(getVaultsInfoMock(['None'])));
      jest.spyOn(contract, 'getVaults').mockImplementation(() => Promise.resolve([]));

      const result: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account: new Address(fakeSimulationAccount),
        denomination: Denomination.USD,
        targetIndex: 1000000n,
      });

      expect(result).toEqual(['None']);
    });

    describe('One vault is created and we are creating a new Vault', () => {
      const testVaultKey: VaultsTypes['VaultKey'] = {
        account: Keypair.random().publicKey(),
        denomination: Denomination.USD,
        index: testIndex,
      };
      const createdVault: VaultsTypes['Vault'] = {
        ...testVaultKey,
        next_key: ['None'],
        total_collateral: 0n,
        total_debt: 0n,
      };

      const params = {
        type: FindPrevVaultKeyType.new_vault,
        account: new Address(Keypair.random().publicKey()),
        denomination: Denomination.USD,
      };

      beforeEach(() => {
        jest
          .spyOn(contract, 'getVaultsInfo')
          .mockImplementation(() => Promise.resolve(getVaultsInfoMock(['Some', testVaultKey])));

        jest
          .spyOn(contract, 'getVaults')
          .mockImplementation(async params => getVaultsMock({ initialVaults: [createdVault], ...params }));
        jest.spyOn(contract, 'getVault').mockImplementation(async () => createdVault);
      });

      test('New vault has a lower index', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: testIndex - 10000n,
        });

        expect(prevKey).toEqual(['None']);
      });

      test('New vault has an equal index', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: testIndex,
        });

        expect(prevKey).toEqual(['None']);
      });

      test('New vault has a higher index', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: testIndex + 10000n,
        });

        expect(prevKey).toEqual(['Some', testVaultKey]);
      });
    });

    describe('Multiple Vaults are created and we are creating a new Vault', () => {
      beforeEach(() => {
        jest
          .spyOn(contract, 'getVaultsInfo')
          .mockImplementation(async () =>
            getVaultsInfoMock(['Some', testVaults[0].vaultKey], BigInt(testVaults.length))
          );

        jest
          .spyOn(contract, 'getVaults')
          .mockImplementation(async params =>
            getVaultsMock({ initialVaults: testVaults.map(item => item.vault), ...params })
          );
        jest.spyOn(contract, 'getVault').mockImplementation(async () => testVaults.slice()[0].vault);
      });

      const params = {
        type: FindPrevVaultKeyType.new_vault,
        account: new Address(Keypair.random().publicKey()),
        denomination: Denomination.USD,
      };

      test('New vault has the lowest index', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: 1000n,
        });

        expect(prevKey).toEqual(['None']);
      });

      test('New vault has equal index to the lowest', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: 17564285714n,
        });

        expect(prevKey).toEqual(['None']);
      });

      test('New vault has higher index than the lowest Vault', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: 18071428571n,
        });

        expect(prevKey).toEqual(['Some', testVaults[0].vaultKey]);
      });

      test('New vault has equal index to second vault', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: 18571428571n,
        });

        expect(prevKey).toEqual(['Some', testVaults[0].vaultKey]);
      });

      test('New vault has higher index than second vault', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: 18871428571n,
        });

        expect(prevKey).toEqual(['Some', testVaults[1].vaultKey]);
      });

      test('New vault has equal index to a vault index that is repeated', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: 32500000000n,
        });

        expect(prevKey).toEqual(['Some', testVaults[2].vaultKey]);
      });

      test('New vault has equal index to second highest vault', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: 50000000000n,
        });

        expect(prevKey).toEqual(['Some', testVaults[4].vaultKey]);
      });

      test('New vault has equal index to highest vault', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: 60000000000n,
        });

        expect(prevKey).toEqual(['Some', testVaults[5].vaultKey]);
      });

      test('New vault has highest index', async () => {
        const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
          ...params,
          targetIndex: 70000000000n,
        });

        expect(prevKey).toEqual(['Some', testVaults[6].vaultKey]);
      });
    });

    describe('Updating a vault situations', () => {
      describe('One vault is created and we are updating the vault', () => {
        const testVaultKey: VaultsTypes['VaultKey'] = {
          account: Keypair.random().publicKey(),
          denomination: Denomination.USD,
          index: testIndex,
        };

        const createdVault: VaultsTypes['Vault'] = {
          ...testVaultKey,
          next_key: ['None'],
          total_collateral: 0n,
          total_debt: 0n,
        };

        const params = {
          type: FindPrevVaultKeyType.update_vault,
          account: new Address(testVaultKey.account),
          denomination: Denomination.USD,
        };

        beforeEach(() => {
          jest
            .spyOn(contract, 'getVaultsInfo')
            .mockImplementation(() => Promise.resolve(getVaultsInfoMock(['Some', testVaultKey])));

          jest.spyOn(contract, 'getVaults').mockImplementation(async () => [createdVault]);
          jest.spyOn(contract, 'getVault').mockImplementation(async () => createdVault);
        });

        test("One vault is updating it's index for a higher one", async () => {
          // We first find the prev_key with the current index
          const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
            ...params,
            targetIndex: testVaultKey.index,
          });

          expect(prevKey).toEqual(['None']);

          // Later we find the prev_key with the updated index
          const newPrevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
            ...params,
            targetIndex: testIndex + 100000n,
          });

          expect(newPrevKey).toEqual(['None']);
        });

        test("One vault is updating it's index for a lower one", async () => {
          const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
            ...params,
            targetIndex: testIndex - 10000n,
          });

          expect(prevKey).toEqual(['None']);

          const newPrevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
            ...params,
            targetIndex: testIndex - 10000n,
          });

          expect(newPrevKey).toEqual(['None']);
        });
      });

      describe('Multiple Vaults are created and we are updating the vault', () => {
        beforeEach(() => {
          jest
            .spyOn(contract, 'getVaultsInfo')
            .mockImplementation(() => Promise.resolve(getVaultsInfoMock(['Some', testVaults[0].vaultKey])));

          jest.spyOn(contract, 'getVaults').mockImplementation(async () => testVaults.map(t => t.vault));
          jest.spyOn(contract, 'getVault').mockImplementation(async () => testVaults.slice()[0].vault);
        });

        test('Update lowest vault to stay at third place', async () => {
          const vaultToUpdate: { vault: VaultsTypes['Vault']; vaultKey: VaultsTypes['VaultKey'] } =
            testVaults.slice()[0];

          const params = {
            type: FindPrevVaultKeyType.update_vault,
            account: new Address(vaultToUpdate.vault.account),
            denomination: Denomination.USD,
          };

          const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
            ...params,
            targetIndex: vaultToUpdate.vaultKey.index,
          });

          expect(prevKey).toEqual(['None']);

          const newPrevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
            ...params,
            targetIndex: 30000000000n,
          });

          expect(newPrevKey).toEqual(['Some', testVaults[2].vaultKey]);
        });

        test('Update second vault to stay at same place', async () => {
          const vaultToUpdate: { vault: VaultsTypes['Vault']; vaultKey: VaultsTypes['VaultKey'] } =
            testVaults.slice()[1];

          const params = {
            type: FindPrevVaultKeyType.update_vault,
            account: new Address(vaultToUpdate.vault.account),
            denomination: Denomination.USD,
          };

          const prevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
            ...params,
            targetIndex: vaultToUpdate.vaultKey.index,
          });

          expect(prevKey).toEqual(['Some', testVaults[0].vaultKey]);

          const newPrevKey: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
            ...params,
            targetIndex: 18161428571n,
          });

          expect(newPrevKey).toEqual(['Some', testVaults[0].vaultKey]);
        });
      });
    });
  });

  describe('Test real word example of paying the debt', () => {
    let contract: VaultsContract;
    const testIndexes: bigint[] = [14962500000n, 14962500000n, 15597272727n, 33310367980n];
    const testVaults: Array<{ vaultKey: VaultsTypes['VaultKey']; vault: VaultsTypes['Vault'] }> =
      createTestVaults(testIndexes);

    beforeEach(() => {
      contract = new VaultsContract({
        stellarSDK: {
          xdr,
          TransactionBuilder,
          scValToNative,
          scValToBigInt,
          nativeToScVal,
          Contract,
          Address,
          Account,
          SorobanRpc,
        },
        contractId: fakeContract,
        defaultFee: '100',
        network,
        rpc: fakeRpc,
        simulationAccount: fakeSimulationAccount,
      });

      jest
        .spyOn(contract, 'getVaultsInfo')
        .mockImplementation(() => Promise.resolve(getVaultsInfoMock(['Some', testVaults[0].vaultKey])));

      jest.spyOn(contract, 'getVaults').mockImplementation(async () => testVaults.map(t => t.vault));
    });

    test('should correctly get the prev_key 1', async () => {
      const testIndex: bigint = 113172823219n;

      jest.spyOn(contract, 'getVault').mockImplementation(async () => testVaults.slice()[2].vault);

      const result: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account: new Address(testVaults[2].vault.account),
        denomination: Denomination.USD,
        targetIndex: testIndex,
        // We ignore the same account because we are simulating the moment we are paying the debt and the index goes to the max amount
        ignoreSameAccount: true,
      });

      expect(result[1]?.index).toBe(testIndexes[3]);
    });

    test('should correctly get the prev_key 2', async () => {
      const testIndex: bigint = 14962400000n;

      jest.spyOn(contract, 'getVault').mockImplementation(async () => testVaults.slice()[0].vault);

      const result: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account: new Address(testVaults[0].vault.account),
        denomination: Denomination.USD,
        targetIndex: testIndex,
        // We ignore the same account because we are simulating the moment we are paying the debt and the index goes to the max amount
        ignoreSameAccount: true,
      });

      expect(result[0]).toBe('None');
    });

    test('should correctly get the prev_key 3', async () => {
      const testIndex: bigint = 33310367981n;

      jest.spyOn(contract, 'getVault').mockImplementation(async () => testVaults.slice()[0].vault);

      const result: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account: new Address(testVaults[0].vault.account),
        denomination: Denomination.USD,
        targetIndex: testIndex,
        // We ignore the same account because we are simulating the moment we are paying the debt and the index goes to the max amount
        ignoreSameAccount: true,
      });

      expect(result[1]?.index).toBe(testIndexes[3]);
    });

    test('should correctly get the prev_key 4', async () => {
      const testIndex: bigint = 33310367970n;

      jest.spyOn(contract, 'getVault').mockImplementation(async () => testVaults.slice()[0].vault);

      const result: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account: new Address(testVaults[0].vault.account),
        denomination: Denomination.USD,
        targetIndex: testIndex,
        // We ignore the same account because we are simulating the moment we are paying the debt and the index goes to the max amount
        ignoreSameAccount: true,
      });

      expect(result[1]?.index).toBe(testIndexes[2]);
    });

    test('should correctly get the prev_key 5', async () => {
      const testIndex: bigint = 14962500000n;

      jest.spyOn(contract, 'getVault').mockImplementation(async () => testVaults.slice()[2].vault);

      const result: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account: new Address(testVaults[2].vault.account),
        denomination: Denomination.USD,
        targetIndex: testIndex,
        // We ignore the same account because we are simulating the moment we are paying the debt and the index goes to the max amount
        ignoreSameAccount: true,
      });

      expect(result[0]).toBe('None');
    });

    test('should correctly get the prev_key 6', async () => {
      const testIndex: bigint = 15597272728n;

      jest.spyOn(contract, 'getVault').mockImplementation(async () => testVaults.slice()[2].vault);

      const result: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account: new Address(testVaults[2].vault.account),
        denomination: Denomination.USD,
        targetIndex: testIndex,
        // We ignore the same account because we are simulating the moment we are paying the debt and the index goes to the max amount
        ignoreSameAccount: true,
      });

      expect(result[1]?.index).toBe(testIndexes[1]);
    });
  });

  describe('', () => {
    let contract: VaultsContract;
    const testIndexes: bigint[] = [
      149625000n,
      149625000n,
      151620000n,
      157605000n,
      266000000n,
      299748750n,
      333103680n,
      1134634591n,
    ];

    const testVaults: Array<{ vaultKey: VaultsTypes['VaultKey']; vault: VaultsTypes['Vault'] }> =
      createTestVaults(testIndexes);

    beforeEach(() => {
      contract = new VaultsContract({
        stellarSDK: {
          xdr,
          TransactionBuilder,
          scValToNative,
          scValToBigInt,
          nativeToScVal,
          Contract,
          Address,
          Account,
          SorobanRpc,
        },
        contractId: fakeContract,
        defaultFee: '100',
        network,
        rpc: fakeRpc,
        simulationAccount: fakeSimulationAccount,
      });

      jest
        .spyOn(contract, 'getVaultsInfo')
        .mockImplementation(() => Promise.resolve(getVaultsInfoMock(['Some', testVaults[0].vaultKey])));

      jest.spyOn(contract, 'getVaults').mockImplementation(async () => testVaults.map(t => t.vault));
    });

    test('should correctly get the prev_key 1', async () => {
      const testIndex: bigint = 166250000n;
      const account: Address = new Address(testVaults[1].vault.account);
      const vault = testVaults.slice()[1].vault;
      const expectedPrevVault = testVaults[0].vault;
      const expectedNewPrevVault = testVaults[3].vault;

      jest
        .spyOn(contract, 'getVault')
        .mockImplementation(async ({ user }) => testVaults.find(tv => tv.vault.account === user)!.vault);

      const result: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account,
        denomination: Denomination.USD,
        targetIndex: vault.index,
      });

      expect(result[1]?.index).toBe(expectedPrevVault.index);
      expect(result[1]?.account).toBe(expectedPrevVault.account);

      const result1: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account,
        denomination: Denomination.USD,
        targetIndex: testIndex,
        // We ignore the same account because we are simulating the moment we are paying the debt and the index goes to the max amount
        ignoreSameAccount: true,
      });

      expect(result1[1]?.index).toBe(expectedNewPrevVault.index);
      expect(result1[1]?.account).toBe(expectedNewPrevVault.account);
    });

    test('should correctly get the prev_key 2', async () => {
      const testIndex: bigint = 299748740n;
      const account: Address = new Address(testVaults[5].vault.account);
      const vault = testVaults.slice()[5].vault;
      const expectedPrevVault = testVaults[4].vault;
      const expectedNewPrevVault = testVaults[4].vault;

      jest
        .spyOn(contract, 'getVault')
        .mockImplementation(async ({ user }) => testVaults.find(tv => tv.vault.account === user)!.vault);

      const result: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account,
        denomination: Denomination.USD,
        targetIndex: vault.index,
      });

      expect(result[1]?.index).toBe(expectedPrevVault.index);
      expect(result[1]?.account).toBe(expectedPrevVault.account);

      const result1: VaultsTypes['OptionalVaultKey'] = await contract.findPrevVaultKey({
        account,
        denomination: Denomination.USD,
        targetIndex: testIndex,
        // We ignore the same account because we are simulating the moment we are paying the debt and the index goes to the max amount
        ignoreSameAccount: true,
      });

      expect(result1[1]?.index).toBe(expectedNewPrevVault.index);
      expect(result1[1]?.account).toBe(expectedNewPrevVault.account);
    });
  });
});
