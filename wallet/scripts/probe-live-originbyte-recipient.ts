// Read-only target-owner validation with the actual Fullnode reader. Never signs or submits.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { Transaction } from 'rtd-typescript/transactions';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { assertApprovedRecipient } from '../src/shared/rpc/approved-recipient';
async function main() {
  const [profilePath, fixturesPath, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profilePath,'utf8')));
  const fixtures = JSON.parse(readFileSync(fixturesPath,'utf8'));
  assert.equal(profile.expectedGenesisDigest, fixtures.expectedGenesisDigest);
  assert(profile.packages.originByte);
  const session = new WalletReadSession(profile), paths: string[] = [];
  const reader = new WalletFullnodeReader(session, { fetch: (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, '127.0.0.1');
    assert(['/GetServiceInfo','/GetObject'].some(method=>url.pathname.endsWith(method)));
    paths.push(url.pathname); return fetch(input,init);
  } });
  try {
    const [target,source] = fixtures.results;
    const sourceObject = await reader.object(source.targetKiosk), targetObject = await reader.object(target.targetKiosk);
    assert(sourceObject?.owner.$kind === 'Shared' && targetObject?.owner.$kind === 'Shared');
    const tx = new Transaction();
    tx.moveCall({target:`${profile.packages.originByte.executionPackage}::ob_kiosk::p2p_transfer`,
      typeArguments:['0x2::coin::Coin<0x2::rtd::RTD>'],
      arguments:[tx.sharedObjectRef({objectId:source.targetKiosk,initialSharedVersion:sourceObject.owner.Shared.initialSharedVersion,mutable:true}),
        tx.sharedObjectRef({objectId:target.targetKiosk,initialSharedVersion:targetObject.owner.Shared.initialSharedVersion,mutable:true}),tx.pure.id(source.nft)]});
    await assertApprovedRecipient(tx.getData(),target.targetOwner,profile.packages,reader.object.bind(reader));
    await assert.rejects(assertApprovedRecipient(tx.getData(),source.targetOwner,profile.packages,reader.object.bind(reader)), /所有者/);
    writeFileSync(output,JSON.stringify({verifiedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,target:target.targetKiosk,
      owner:target.targetOwner,targetVersion:targetObject.version,correctOwnerAccepted:true,wrongOwnerRejected:true,
      paths,dispatches:0,scope:'Actual Fullnode target owner check only; synthetic unsigned command, no NFT type/simulation/name-registry or Chrome acceptance.'},null,2)+'\n',{flag:'wx'});
    console.log('Fullnode target owner accepted; wrong owner rejected; dispatches=0');
  } finally { session.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
