// Read-only native balance observation; no transaction creation or submission.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
async function main() {
  const [profileFile, owner, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  assert.equal(new URL(profile.endpoints.fullnodeGrpcWeb).hostname, '127.0.0.1');
  const session = new WalletReadSession(profile);
  try {
    const balance = await new WalletFullnodeReader(session).balance(owner, RTD_TYPE_ARG);
    writeFileSync(output, JSON.stringify({observedAt:new Date().toISOString(),chainId:profile.expectedGenesisDigest,
      owner,balance,scope:'Actual Fullnode balance reader only; no address-balance-funded transaction or UI acceptance'},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify(balance));
  } finally { session.close(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
