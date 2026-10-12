// Current certified five-package release: actual snapshot and fresh native agreement, no simulated ownership.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {verifyReviewedDeployment} from '../src/shared/rpc/deployment-contract';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
import {nativeKioskCap,KIOSK_BCS,KIOSK_ITEM_BCS,exactBcs} from '../src/shared/rpc/kiosk-reader';
import {groupCollectibles} from '../src/shared/rpc/nft-assets';
import {deriveDynamicFieldID,toBase64} from 'rtd-typescript/utils';
async function main(){
const[release,output]=process.argv.slice(2);assert.equal(process.argv.length,4);
const read=(f:string)=>JSON.parse(readFileSync(f,'utf8')),sha=(f:string)=>createHash('sha256').update(readFileSync(f)).digest('hex');
const profileFile=join(release,'profile.json'),auditFile=join(release,'audit.json'),declFile=join(release,'declaration.json');
const profile=validateNetworkProfile(read(profileFile),{requireComplete:true}),audit=read(auditFile),json=readFileSync(declFile,'utf8');assert(audit.passed&&profile.revision===4&&audit.packages.length===5);assert.equal(sha(profileFile),audit.profileSha256);assert.equal(sha(declFile),audit.declarationSha256);
await verifyReviewedDeployment(profile,{json,trustedSha256:audit.declarationSha256});
const altered=JSON.parse(json);altered.packages.find((p:any)=>p.storageId===profile.packages.personalKiosk).modules[0].bytecodeSha256='0'.repeat(64);
await assert.rejects(verifyReviewedDeployment(profile,{json:JSON.stringify(altered),trustedSha256:audit.declarationSha256}),{reason:'trust'});
await assert.rejects(verifyReviewedDeployment(validateNetworkProfile({...profile,revision:5}),{json,trustedSha256:audit.declarationSha256}),{reason:'binding'});
const owner='0x11e90d26087af15981c5e7d0739ce58886755f1ac83ebaeb1f7c643b87e5f614',kioskId='0x9c08460e7fbd8d1b723e61b149dbb40c3031125b6aed873fe0e2a27b2001ae97',capId='0x330eac2199354ea2d1bcf3005acb4847d4cd25a1c3de87282547a3f436116153',nftId='0x98ed523f2038dcec7cbcb5cf991efc157af1421800183833567c6a3ff83794d3';
const original=globalThis.fetch,requests:any[]=[],session=new WalletReadSession(profile);let evidence:any={passed:false,observedAt:new Date().toISOString(),requests,signatures:0,simulations:0,executeRequests:0,scope:'Actual certified profile4 snapshot PersonalKiosk holding/contents, exact dynamic-object child field and fresh Fullnode BCS. Pin trust and binding negative controls are local. No UI or transfer acceptance.'};
globalThis.fetch=async(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert.equal(u.hostname,'127.0.0.1');assert(u.pathname==='/graphql'||['/GetServiceInfo','/GetObject'].some(x=>u.pathname.endsWith(x)));assert(!String(init?.body).includes('"jsonrpc"'));const row={url:u.href,status:0};requests.push(row);const r=await original(input,init);row.status=r.status;return r;};
try{
const reader=await WalletAssetReader.open(session,{timeoutMs:30000}),native=new WalletFullnodeReader(session);
assert(reader.proof.checkpoint>=203097);const owned=(await reader.ownedObjects(owner,{pageSize:2})).value,kiosks=(await reader.kiosks(owner)).value;
const personal=kiosks.find(k=>k.kioskId===kioskId);assert(personal?.kind==='framework'&&personal.ownerCap.isPersonal);assert.equal(personal.owner,owner);assert.equal(personal.ownerCap.objectId,capId);assert.equal(personal.items.length,1);
const cap=owned.find(o=>o.objectId===capId),item=personal.items.find(o=>o.objectId===nftId);assert(cap&&item);assert(cap.owner.$kind==='AddressOwner'&&cap.owner.AddressOwner===owner);assert(item.owner.$kind==='ObjectOwner');assert.equal(item.isLocked,false);assert.equal(item.listing,undefined);assert.equal(item.hasPublicTransfer,true);
const decoded=nativeKioskCap(cap,profile.packages);assert(decoded?.isPersonal&&decoded.kioskId===kioskId);
const childField=deriveDynamicFieldID(kioskId,'0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>',KIOSK_ITEM_BCS.serialize({id:nftId}).toBytes());assert.equal(item.owner.ObjectOwner,childField);
const fields=(await reader.dynamicFields(kioskId)).value,field=fields.find(f=>f.fieldId===childField);assert(field?.$kind==='DynamicObject');assert.equal(field.childId,nftId);assert.equal(field.name.type,'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Item');assert.equal(exactBcs(KIOSK_ITEM_BCS,field.name.bcs).id,nftId);assert.equal(toBase64(field.value.bcs),toBase64(item.content));assert.equal(field.valueType,item.type);
const current=[];for(const snapshot of[cap,item,(await reader.objects([kioskId])).value[0]]){assert(!(snapshot instanceof Error));const fresh=await native.object(snapshot.objectId);assert(fresh);assert.equal(fresh.digest,snapshot.digest);assert.equal(fresh.version,snapshot.version);assert.equal(fresh.type,snapshot.type);assert.deepEqual(fresh.owner,snapshot.owner);assert.equal(toBase64(fresh.content),toBase64(snapshot.content));current.push({objectId:fresh.objectId,version:fresh.version,digest:fresh.digest,owner:fresh.owner});if(fresh.objectId===kioskId){const body=exactBcs(KIOSK_BCS,fresh.content);assert.equal(body.item_count,1);assert.equal(body.owner,owner)}}
const visible=groupCollectibles(owned,[],profile.packages),hidden=groupCollectibles(owned,[capId],profile.packages);assert(visible.visual.some(o=>o.objectId===capId));assert(hidden.hidden.some(o=>o.objectId===capId));assert(![...hidden.visual,...hidden.other].some(o=>o.objectId===capId));
await reader.snapshot.revalidate();evidence={...evidence,passed:true,snapshot:reader.proof,owner,kioskId,capId,nftId,decoded,ownedCount:owned.length,kiosks:kiosks.map(k=>({kind:k.kind,kioskId:k.kioskId,items:k.items.length})),current,field:{fieldId:childField,childId:field.childId,name:field.name.type,nameBcsBase64:toBase64(field.name.bcs),valueBcsBase64:toBase64(field.value.bcs),valueType:field.valueType},item:{type:item.type,display:item.display,json:item.json,hasPublicTransfer:item.hasPublicTransfer},negativeTrustRejected:true,negativeBindingRejected:true,classificationOnlyHidden:true,inputsSha256:Object.fromEntries([resolve(__filename),profileFile,auditFile,declFile].map(f=>[f,sha(f)]))};
}catch(e){evidence.failure={name:e instanceof Error?e.name:'unknown',message:e instanceof Error?e.message:String(e)};process.exitCode=1}
finally{session.close();globalThis.fetch=original;writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:evidence.passed,checkpoint:evidence.snapshot?.checkpoint,requests:requests.length,executeRequests:0,failure:evidence.failure}))}}
main().catch(e=>{console.error(e);process.exitCode=1});
