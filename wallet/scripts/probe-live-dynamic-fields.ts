// Read-only list/point agreement on one admitted asset snapshot.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { toBase64 } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
async function main() {
  const [profileFile,parent,output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
  assert.equal(new URL(profile.endpoints.graphqlUrl!).hostname,'127.0.0.1');
  const session = new WalletReadSession(profile);
  try {
    const reader = await WalletAssetReader.open(session,{timeoutMs:30000});
    const list = await reader.dynamicFields(parent);
    assert(list.value.length > 0 && list.value.length <= 30,'fixture must have a bounded nonempty field set');
    const fields = [];
    for (const field of list.value) {
      const point = await reader.dynamicField(parent,field.name,field.$kind);
      assert(point.value); assert.equal(point.value.fieldId,field.fieldId);
      assert.equal(point.value.$kind,field.$kind);
      assert.equal(toBase64(point.value.value.bcs),toBase64(field.value.bcs));
      assert.equal(point.snapshot.cacheKey,list.snapshot.cacheKey);
      if(field.$kind === 'DynamicObject') {
        assert(point.value.$kind === 'DynamicObject'); assert.equal(point.value.childId,field.childId);
      }
      fields.push({fieldId:field.fieldId,kind:field.$kind,name:{type:field.name.type,bcs:toBase64(field.name.bcs)},
        valueType:field.valueType,childId:field.$kind === 'DynamicObject' ? field.childId : null});
    }
    writeFileSync(output,JSON.stringify({observedAt:new Date().toISOString(),parent,snapshot:list.snapshot,fields,
      scope:'Actual wallet GraphQL field list and per-kind point reads on one admitted snapshot; only returned kinds are covered, not absent fixture kinds or Chrome UI.'},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({count:fields.length,kinds:[...new Set(fields.map(f => f.kind))]}));
  } finally {session.close();}
}
main().catch(error=>{console.error(error instanceof Error ? error.message : 'dynamic field probe failed');process.exitCode=1;});
