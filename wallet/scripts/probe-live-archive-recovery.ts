// Read-only exact checkpoint and same-digest archive recovery through actual wallet readers.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletArchiveCheckpointReader } from '../src/shared/rpc/archive-checkpoint-reader';
import { WalletLedgerReader } from '../src/shared/rpc/ledger-reader';
async function main() {
  const [profileFile,digest,checkpoint,output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
  const session = new WalletReadSession(profile), paths: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input,init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname,'127.0.0.1');
    assert(['GetServiceInfo','GetTransaction','GetCheckpoint'].some(method => url.pathname.endsWith('/'+method)));
    paths.push(url.href); return originalFetch(input,init);
  };
  try {
    const reader = new WalletArchiveCheckpointReader(session);
    const byHeight = await reader.checkpoint({sequenceNumber:checkpoint});
    const byDigest = await reader.checkpoint({digest:byHeight.digest});
    assert.equal(byDigest.sequenceNumber,byHeight.sequenceNumber); assert.equal(byDigest.digest,byHeight.digest);
    const ledger = new WalletLedgerReader(session,{timeoutMs:60000});
    const receipt = await ledger.lookup(digest);
    assert(receipt,'original transaction is not yet available');
    assert.equal(receipt.source,'archive'); assert.equal(receipt.digest,digest); assert.equal(receipt.checkpoint,checkpoint);
    const details = await ledger.details(digest);
    assert(details); assert.equal(details.source,'archive'); assert.equal(details.transaction.digest,digest);
    writeFileSync(output,JSON.stringify({observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,
      byHeight,byDigest,receipt,details:{source:details.source,digest:details.transaction.digest,checkpoint:details.transaction.checkpoint,status:details.transaction.status},paths,
      dispatches:0,scope:'Real Fullnode retention-gated same-digest archive lookup/details and explicit checkpoint height/digest references. No independent certificate verification, journal mutation, signing, dispatch or Chrome UI acceptance.'},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({digest,checkpoint,source:receipt.source,success:receipt.success,paths}));
  } finally {globalThis.fetch=originalFetch;session.close();}
}
main().catch(error => {console.error(error instanceof Error ? error.message : 'archive recovery failed');process.exitCode=1;});
