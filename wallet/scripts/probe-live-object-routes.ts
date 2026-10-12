// Read-only point lookups through the actual wallet readers and one explicit profile.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { ObjectError } from 'rtd-typescript/client';
import { normalizeRtdAddress } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletArchiveObjectReader } from '../src/shared/rpc/archive-object-reader';
async function main() {
  const [profileFile, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
  for(const endpoint of [profile.endpoints.fullnodeGrpcWeb,profile.endpoints.graphqlUrl,profile.endpoints.archiveGrpcWeb])
    assert(endpoint && new URL(endpoint).hostname === '127.0.0.1');
  const session = new WalletReadSession(profile), paths: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input,init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname,'127.0.0.1'); assert(!url.pathname.endsWith('/ExecuteTransaction'));
    assert(!String(init?.body).includes('"jsonrpc"')); paths.push(url.href); return originalFetch(input,init);
  };
  try {
    const fullnode = new WalletFullnodeReader(session);
    const current = await fullnode.object('0x5');
    assert(current && current.objectId === normalizeRtdAddress('0x5'));
    const absent = await fullnode.object('0xdead'); assert.equal(absent,null);
    const assets = await WalletAssetReader.open(session,{timeoutMs:30000});
    const asset = await assets.objects(['0x5']);
    assert(!(asset.value[0] instanceof Error)); assert.equal(asset.value[0].objectId,current.objectId);
    const missing = await assets.objects(['0xdead']);
    assert(missing.value[0] instanceof ObjectError); assert.equal(missing.value[0].reason,'notFound');
    const historical = await new WalletArchiveObjectReader(session).object({objectId:'0x5',version:'1'});
    assert(!(historical.value instanceof Error)); assert.equal(historical.value.version,'1');
    writeFileSync(output,JSON.stringify({observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,
      current:{id:current.objectId,version:current.version,digest:current.digest,owner:current.owner,type:current.type},
      fullnodeAbsent:absent,snapshot:asset.snapshot,asset:{id:asset.value[0].objectId,version:asset.value[0].version},
      assetAbsentReason:missing.value[0].reason,historical:{selector:historical.selector,version:historical.value.version,digest:historical.value.digest,coverage:historical.coverage},paths,
      scope:'Actual Fullnode current object, admitted GraphQL asset object and archive explicit version. NotFound is current absence only, not proof of deletion or no history. No Chrome UI acceptance.'},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({currentVersion:current.version,assetVersion:asset.value[0].version,historicalVersion:historical.value.version,paths}));
  } finally {globalThis.fetch=originalFetch;session.close();}
}
main().catch(error => {console.error(error instanceof Error ? error.message : 'object probe failed');process.exitCode=1;});
