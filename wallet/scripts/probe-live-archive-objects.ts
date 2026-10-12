// Explicit historical versions through the configured archive entry; no latest fallback.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletArchiveObjectReader, ArchiveObjectItemError } from '../src/shared/rpc/archive-object-reader';
async function main() {
  const [profileFile, objectId, version, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
  const endpoint = profile.endpoints.archiveGrpcWeb;
  assert(endpoint && new URL(endpoint).hostname === '127.0.0.1');
  const session = new WalletReadSession(profile), paths: string[] = [];
  try {
    const reader = new WalletArchiveObjectReader(session, {fetch: async(input,init) => {
      assert(String(input).startsWith(endpoint+'/')); paths.push(String(input)); return fetch(input,init);
    }});
    const selectors = Array.from({length:23},(_,i) => ({objectId:i===1 || i===21 ? '0xdead' : objectId, version}));
    const result = await reader.objects(selectors);
    assert.equal(result.values.length,selectors.length);
    const values = result.values.map((value,i) => {
      if (i===1 || i===21) {
        assert(value instanceof ArchiveObjectItemError); assert.equal(value.code,5);
        assert.equal(value.selector.objectId,result.selectors[i].objectId);
        return {errorCode:value.code,selector:value.selector};
      }
      assert(!(value instanceof Error), 'known historical object must be available');
      assert.equal(value.objectId,result.selectors[i].objectId); assert.equal(value.version,version);
      return {objectId:value.objectId,version:value.version,digest:value.digest};
    });
    writeFileSync(output,JSON.stringify({observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,
      coverage:result.coverage,selectors:result.selectors,values,paths,
      scope:'Actual archive reader via configured browser-protocol endpoint; 23 explicit-version slots across two batches, duplicates and per-item notFound. Not Chrome UI acceptance.'},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({coverage:result.coverage,slots:values.length,paths}));
  } finally {session.close();}
}
main().catch(error => {console.error(error instanceof Error ? error.message : 'archive probe failed');process.exitCode=1;});
