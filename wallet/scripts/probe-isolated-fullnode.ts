// Explicit opt-in live probe: creates only a disposable dev faucet recipient.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Ed25519Keypair } from 'rtd-typescript/keypairs/ed25519';
import { requestRtdFromFaucetV2 } from 'rtd-typescript/faucet';
import { RtdGrpcClient } from 'rtd-typescript/grpc';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { sumFaucetCoins } from '../src/ui/app/shared/faucet/sumFaucetCoins';

async function main() {
  const [rpc, faucet, expectedGenesisDigest, output] = process.argv.slice(2);
  assert(rpc && faucet && expectedGenesisDigest && output, 'explicit endpoints, H0 and output required');
  for (const endpoint of [rpc, faucet]) {
    const url = new URL(endpoint);
    assert(url.hostname === '127.0.0.1' && url.protocol === 'http:', 'isolated local dev only');
  }
  const requests: string[] = [];
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    requests.push(url);
    assert(!String(init?.body).includes('"jsonrpc"'), 'JSON-RPC request forbidden in this probe');
    return nativeFetch(input, init);
  };
  const profile = validateNetworkProfile({
    schemaVersion: 2, id: 'isolated-wallet-dev', displayName: '独立钱包开发链',
    sdkNetwork: 'localnet', walletStandardChain: 'rtd:localnet',
    generation: 'dev-20261003-01', revision: 1, expectedGenesisDigest,
    endpoints: { fullnodeGrpcWeb: rpc }, packages: {}, faucetUrl: faucet,
  });
  const session = new WalletReadSession(profile);
  try {
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: rpc, format: 'binary' });
    const { response: info } = await client.ledgerService.getServiceInfo({}, { timeout: 10000 });
    assert.equal(info.chainId, expectedGenesisDigest);
    const { response: genesis } = await client.ledgerService.getCheckpoint({
      checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: 0n },
      readMask: { paths: ['digest', 'sequence_number'] },
    }, { timeout: 10000 });
    assert.equal(genesis.checkpoint?.digest, expectedGenesisDigest);
    const reader = new WalletFullnodeReader(session);
    const recipient = new Ed25519Keypair().toRtdAddress();
    assert.equal((await reader.coins(recipient, RTD_TYPE_ARG)).length, 0);
    const response = await requestRtdFromFaucetV2({ recipient, host: faucet });
    const amount = sumFaucetCoins(response.coins_sent);
    assert(amount > 0n);
    let coins = await reader.coins(recipient, RTD_TYPE_ARG);
    const deadline = Date.now() + 20000;
    while (!coins.length && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      coins = await reader.coins(recipient, RTD_TYPE_ARG);
    }
    assert.equal(coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n), amount);
    for (const coin of coins) assert(await reader.object(coin.objectId));
    const evidence = {
      verifiedAt: new Date().toISOString(), expectedGenesisDigest, rpc, faucet,
      recipient, amount: amount.toString(), coinCount: coins.length,
      checkpoint: await reader.checkpoint(), epoch: await reader.currentEpoch(), requests,
      scope: 'Real SDK binary gRPC-Web H0/genesis; wallet fresh coin/object readers and V2 faucet. No GraphQL/archive, transfer, contracts or extension UI acceptance.',
    };
    writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally { session.close(); globalThis.fetch = nativeFetch; }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
