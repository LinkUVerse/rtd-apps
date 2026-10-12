// Read-only current owned-object/filter/classification evidence through the saved profile.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { groupCollectibles, directlyOwnedAsset } from '../src/shared/rpc/nft-assets';
import { filterOwnedAssets } from 'rtd-apps-core/src/rpc/asset-hooks';

async function main() {
  const [profileFile, output, ...owners] = process.argv.slice(2);
  assert(owners.length > 0);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  const original = globalThis.fetch, paths: string[] = [];
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, '127.0.0.1');
    assert(url.pathname === '/graphql' || url.pathname.endsWith('/GetServiceInfo'));
    paths.push(url.href);
    return original(input, init);
  };
  const session = new WalletReadSession(profile);
  try {
    const reader = await WalletAssetReader.open(session, { timeoutMs: 30000 });
    const rows = [];
    for (const owner of owners) {
      const result = await reader.ownedObjects(owner);
      assert(result.value.length > 0, 'Fixture owner must have nonempty owned objects');
      assert(result.value.every(object => directlyOwnedAsset(object, owner)));
      assert.equal(new Set(result.value.map(object => object.objectId)).size, result.value.length);
      const collectible = filterOwnedAssets(result.value, { excludeTypes: ['0x2::coin::Coin'] });
      assert(collectible.length > 0);
      const target = collectible[0];
      const selected = filterOwnedAssets(result.value, { includeTypes: [target.type], excludeTypes: ['0x2::coin::Coin'] });
      assert(selected.length > 0 && selected.every(object => object.type === target.type));
      const excluded = filterOwnedAssets(result.value, { includeTypes: [target.type], excludeTypes: [target.type] });
      assert.equal(excluded.length, 0);
      const groups = groupCollectibles(collectible, [target.objectId], profile.packages);
      assert.equal(groups.hidden.length, 1);
      assert.equal(groups.hidden[0].objectId, target.objectId);
      assert(![...groups.visual, ...groups.other].some(object => object.objectId === target.objectId));
      assert.equal(groups.visual.length + groups.other.length + groups.hidden.length, collectible.length);
      const featured = groupCollectibles(collectible, [], profile.packages, [target.type]);
      assert(featured.visual.some(object => object.objectId === target.objectId));
      rows.push({owner, proof:result.snapshot, owned:result.value.map(object => ({id:object.objectId, type:object.type, version:object.version, owner:object.owner})),
        collectibleCount:collectible.length, selectedCount:selected.length, hiddenId:target.objectId,
        groups:{visual:groups.visual.length,other:groups.other.length,hidden:groups.hidden.length}});
    }
    writeFileSync(output, JSON.stringify({observedAt:new Date().toISOString(), h0:profile.expectedGenesisDigest, proof:reader.proof, rows, paths, dispatches:0,
      scope:'Actual admitted GraphQL owned-object collection plus production filters and collectible classification. No forced multi-page, display-specific, signing or Chrome acceptance.'},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({checkpoint:reader.proof.checkpoint,owners:rows.map(row=>({owner:row.owner,count:row.owned.length,groups:row.groups})),dispatches:0}));
  } finally {session.close(); globalThis.fetch = original;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
