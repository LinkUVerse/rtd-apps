// Actual wallet reader against the new certified-input query backend.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';

async function main() {
  const [rpc, graphql, h0, owner, output] = process.argv.slice(2);
  for (const endpoint of [rpc, graphql]) assert.equal(new URL(endpoint).hostname, '127.0.0.1');
  const session = new WalletReadSession(validateNetworkProfile({
    schemaVersion: 2, id: 'certified-wallet-dev', displayName: '认证开发查询',
    sdkNetwork: 'localnet', walletStandardChain: 'rtd:localnet',
    generation: 'dev-20261003-01', revision: 1, expectedGenesisDigest: h0,
    endpoints: { fullnodeGrpcWeb: rpc, graphqlUrl: graphql }, packages: {},
  }));
  try {
    const reader = await WalletAssetReader.open(session, { timeoutMs: 30000 });
    const objects = await reader.objects(['0x5']);
    assert.equal(objects.value.length, 1);
    assert(!(objects.value[0] instanceof Error));
    const balances = await reader.balances(owner);
    const owned = await reader.ownedObjects(owner);
    assert(/^\d+$/.test(String(reader.proof.checkpoint)));
    assert(BigInt(reader.proof.checkpoint) <= BigInt(Number.MAX_SAFE_INTEGER));
    const record = { verifiedAt: new Date().toISOString(), proof: reader.proof,
      systemObject: objects.value[0], owner, balances: balances.value, ownedCount: owned.value.length,
      scope: 'Actual wallet common-snapshot reader; certified-input private backend only. No browser or public ingress acceptance.' };
    writeFileSync(output, JSON.stringify(record, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ checkpoint: reader.proof.checkpoint, owned: owned.value.length, passed: true }));
  } finally { session.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
