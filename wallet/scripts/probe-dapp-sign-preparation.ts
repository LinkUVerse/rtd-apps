// Read-only diagnosis of the exact demo transaction using the wallet's real reader.
import { readFileSync, writeFileSync } from 'node:fs';
import { Transaction } from 'rtd-typescript/transactions';
import { Ed25519Keypair } from 'rtd-typescript/keypairs/ed25519';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletTransactionReader } from '../src/shared/rpc/transaction-reader';
async function main() {
  const [profileFile, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  if (profile.expectedGenesisDigest !== '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj' || profile.endpoints.fullnodeGrpcWeb !== 'http://127.0.0.1:39400') throw new Error('wrong dev profile');
  const sender = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(7)).toRtdAddress();
  const tx = new Transaction(); const [coin] = tx.splitCoins(tx.gas, [1]); tx.transferObjects([coin], sender);
  const session = new WalletReadSession(profile);
  try {
    const result = await new WalletTransactionReader(session).prepare(tx, sender);
    const data = { passed: true, digest: result.digest, gasBudget: result.gasBudget, scope: 'real Fullnode preparation only; no signing or dispatch' };
    writeFileSync(output, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' }); console.log(data);
  } finally { session.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
