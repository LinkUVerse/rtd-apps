// Existing public dev objects only. No keys, simulation, signatures or execution.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
const L='migrationToGRpcOrGraphQLDoc/workLog';
const profileFile='/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json';
const source='0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c';
const target='0xbad0f77037d2352d281607a6237bf559180c85228baf91b7144a5fa021f20456';
const ids=['0x2ac824803bee71042d621ba2502b844b878461fd8834b8f226315b62224d1221','0x529e3f9369b1e96d2d2304d012c99e404bc369ae5a64dc64414fa71ec82a81c0','0x31dcffdbfd35c672165124a5c2242426183a29ec1f939b4d71c3fe7ce05a47cf'];
(async()=>{
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8'))), session=new WalletReadSession(profile);
 const original=globalThis.fetch.bind(globalThis),calls:any[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=String(input);assert(Object.values(profile.endpoints).some(base=>typeof base==='string'&&url.startsWith(base)));
  assert(!/Execute|Simulate|Sign/.test(url));
  const response=await original(input,init);
  calls.push({url,status:response.status,request:typeof init?.body==='string'?init.body:undefined,requestBase64:typeof init?.body!=='string'?Buffer.from(init!.body as Uint8Array).toString('base64'):undefined,responseBase64:Buffer.from(await response.clone().arrayBuffer()).toString('base64')});return response;
 };
 try {
  const native=new WalletFullnodeReader(session),snapshot=await WalletAssetReader.open(session);
  const kiosks=await snapshot.kiosks(source);
  const objects=await Promise.all(ids.map(id=>native.object(id)));
  assert(objects.every(Boolean));
  assert.equal(objects[2]!.owner.$kind,'AddressOwner');
  assert.equal((objects[2]!.owner as {AddressOwner:string}).AddressOwner,target);
  const owned=await snapshot.ownedObjects(target);
  assert(owned.value.some(o=>o.objectId===ids[2]));
  const balance=await native.balances(target);
  const selected=kiosks.value.flatMap(k=>k.items).filter(o=>ids.includes(o.objectId));
  assert.equal(selected.length,2);assert(selected.find(o=>o.objectId===ids[0])!.isLocked);
  assert(selected.find(o=>o.objectId===ids[1])!.listing?.isExclusive);
  const proof={passed:true,observedAt:new Date().toISOString(),scope:'Public existing NFT readiness, fixed asset S and current native ownership; no Chrome positive-transfer acceptance',source,target,snapshot:snapshot.proof.checkpoint,kiosks:kiosks.value,objects,balance,calls,credentialReads:0,simulations:0,signatures:0,executeRequests:0,parentCompletion:false,inputsSha256:Object.fromEntries([__filename,profileFile].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
  writeFileSync(`${L}/20261011-C252-nft-readiness-01.json`,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,target,object:ids[2],balance,requestCount:calls.length,snapshot:snapshot.proof.checkpoint}));
 } finally {globalThis.fetch=original;session.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
