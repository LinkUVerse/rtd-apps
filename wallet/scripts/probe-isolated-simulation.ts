// Read-only chain simulation: uses a public funded address, never signs or submits.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Transaction } from 'rtd-typescript/transactions';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletTransactionReader } from '../src/shared/rpc/transaction-reader';
async function main() {
  const [rpc, expectedGenesisDigest, sender, output] = process.argv.slice(2);
  assert(rpc && expectedGenesisDigest && sender && output);
  const url = new URL(rpc);
  assert(url.hostname === '127.0.0.1' && url.protocol === 'http:');
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const path = String(input instanceof Request ? input.url : input);
    assert(!path.includes('ExecuteTransaction'));
    assert(!String(init?.body).includes('"jsonrpc"'));
    requests.push(path);
    return originalFetch(input, init);
  };
  const session = new WalletReadSession(validateNetworkProfile({ schemaVersion: 2,
    id: 'isolated-wallet-dev', displayName: '独立钱包开发链', sdkNetwork: 'localnet',
    walletStandardChain: 'rtd:localnet', generation: 'dev-20261003-01', revision: 1,
    expectedGenesisDigest, endpoints: { fullnodeGrpcWeb: rpc }, packages: {},
  }));
  try {
    const reader = new WalletTransactionReader(session);
    const tx = new Transaction();
    const coin = tx.splitCoins(tx.gas, [1n]);
    tx.transferObjects([coin], sender);
    const prepared = await reader.prepare(tx, sender);
    assert.equal(prepared.simulation.$kind, 'Transaction');
    const repeat = await reader.simulate(prepared.bytesBase64, sender);
    assert.equal(repeat.$kind, 'Transaction');
    assert.equal(repeat.Transaction?.digest, prepared.digest);
    const evidence = { verifiedAt: new Date().toISOString(), rpc, expectedGenesisDigest,
      sender, digest: prepared.digest, gasBudget: prepared.gasBudget, requests,
      scope: 'Actual WalletTransactionReader prepare + same-byte formal simulate on debug chain; no signing, dispatch, GraphQL or extension acceptance.' };
    writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally { session.close(); globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
