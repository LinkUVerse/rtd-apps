// Actual forward/reverse pages and exact historical versions; no simulation or execution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {toBase64,normalizeRtdAddress} from 'rtd-typescript/utils';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {DYNAMIC_FIELD_SELECTION,decodeDynamicField} from '../src/shared/rpc/dynamic-fields';
import {WalletArchiveObjectReader,ArchiveObjectItemError} from '../src/shared/rpc/archive-object-reader';

async function main(){
 const [profileFile,parent,output]=process.argv.slice(2),session=new WalletReadSession(validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8'))));
 const requests:any[]=[],fetchProof:typeof fetch=async(input,init)=>{const url=String(input);assert(['127.0.0.1','localhost'].includes(new URL(url).hostname));assert(!/\/(SimulateTransaction|ExecuteTransaction)$/.test(url));const response=await fetch(input,init);requests.push({url,status:response.status,request:typeof init?.body==='string'?init.body:null,responseBase64:Buffer.from(await response.clone().arrayBuffer()).toString('base64')});return response};
 try{
  const reader=await WalletAssetReader.open(session,{fetch:fetchProof,timeoutMs:30000}),listed=await reader.dynamicFields(parent);assert(listed.value.length>=2);assert.deepEqual(new Set(listed.value.map(f=>f.$kind)),new Set(['DynamicField','DynamicObject']));
  const pages:any[]=[];
  const traverse=async(reverse:boolean)=>{
   let cursor:string|null=null;const all:any[]=[],seen=new Set<string>();
   for(let page=0;page<32;page++){
    const data:any=await reader.snapshot.read({selection:`address(address: $parent) { address dynamicFields(${reverse?'last: 1, before':'first: 1, after'}: $cursor) { pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { ${DYNAMIC_FIELD_SELECTION} } } }`,variableDefinitions:'$parent: RtdAddress!, $cursor: String',variables:{parent,cursor}});
    assert.equal(data.address.address,normalizeRtdAddress(parent));const connection=data.address.dynamicFields;assert(Array.isArray(connection.nodes));const decoded=connection.nodes.map((n:any)=>decodeDynamicField(parent,n));
    for(const f of decoded){assert(!seen.has(f.fieldId));seen.add(f.fieldId)}if(reverse)all.unshift(...decoded);else all.push(...decoded);
    const info=connection.pageInfo,more=reverse?info.hasPreviousPage:info.hasNextPage;assert.equal(typeof more,'boolean');pages.push({reverse,page,cursor,info,ids:decoded.map((f:any)=>f.fieldId)});
    if(!more)return all;const next=reverse?info.startCursor:info.endCursor;assert.equal(typeof next,'string');assert(next&&next!==cursor);cursor=next;
   }throw new Error('bounded dynamic page budget exceeded');
  };
  const forward=await traverse(false),backward=await traverse(true);assert.deepEqual(forward,backward);assert.deepEqual(forward,listed.value);assert(pages.filter(p=>!p.reverse).length>=2&&pages.filter(p=>p.reverse).length>=2);
  const fields:any[]=[];for(const f of listed.value){const point=await reader.dynamicField(parent,f.name,f.$kind);assert.deepEqual(point.value,f);assert.equal(point.snapshot.cacheKey,listed.snapshot.cacheKey);fields.push({fieldId:f.fieldId,kind:f.$kind,name:{type:f.name.type,bcs:toBase64(f.name.bcs)},valueType:f.valueType,valueBcs:toBase64(f.value.bcs),childId:f.$kind==='DynamicObject'?f.childId:null})}
  const missingName={type:'u64',bcs:new Uint8Array(8).fill(255)};for(const kind of ['DynamicField','DynamicObject'] as const){const missing=await reader.dynamicField(parent,missingName,kind);assert.equal(missing.value,null)}
  const childFields=listed.value.filter(f=>f.$kind==='DynamicObject'),children=await reader.objects(childFields.map(f=>f.childId)),history:any[]=[];
  const archive=new WalletArchiveObjectReader(session,{fetch:fetchProof});for(let i=0;i<childFields.length;i++){
   const f=childFields[i],object=children.value[i];assert(!(object instanceof Error));assert.equal(object.owner.$kind,'ObjectOwner');assert.equal(object.owner.$kind==='ObjectOwner'?object.owner.ObjectOwner:null,f.fieldId);assert.equal(object.type,f.valueType);assert.equal(toBase64(object.content),toBase64(f.value.bcs));
   const historical=await archive.objects([{objectId:f.childId,version:object.version},{objectId:f.childId,version:'0'},{objectId:f.childId,version:object.version}]);assert.equal(historical.values.length,3);assert(historical.values[1] instanceof ArchiveObjectItemError);assert(!(historical.values[0] instanceof Error)&&!(historical.values[2] instanceof Error));assert.equal(toBase64(historical.values[0].content),toBase64(object.content));assert.equal(toBase64(historical.values[2].content),toBase64(object.content));assert.deepEqual(historical.values[0].owner,object.owner);
   history.push({objectId:object.objectId,version:object.version,owner:object.owner,type:object.type,display:object.display,contentSha256:createHash('sha256').update(object.content).digest('hex'),archiveCoverage:historical.coverage,missingVersionCode:(historical.values[1] as ArchiveObjectItemError).code,duplicatesPreserved:true});
  }
  await reader.snapshot.revalidate();const result={passed:true,observedAt:new Date().toISOString(),parent,snapshot:listed.snapshot,fields,pages,history,requests,simulations:0,signatures:0,executions:0,missingNames:2,inputsSha256:Object.fromEntries([__filename,profileFile].map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),scope:'Actual production reader on one admitted GraphQL snapshot; forward/reverse multi-pages, both field kinds, canonical name/value BCS and point/list equality, real child owner/type/UID, exact archive version and duplicate/missing slots. Historical indexed ownership is not current Fullnode ownership after later transfers, no Chrome UI/whole QA06 claim.'};writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,checkpoint:reader.proof.checkpoint,fields:fields.length,pages:pages.length,history:history.length,requests:requests.length}));
 }finally{session.close()}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'dynamic field matrix failed');process.exitCode=1});
