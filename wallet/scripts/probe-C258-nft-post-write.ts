// Current native ownership and old indexed snapshot are reported independently.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {originByteOwnerToken} from '../src/shared/rpc/originbyte-kiosk';
const L='migrationToGRpcOrGraphQLDoc/workLog';
const files=[__filename,`${L}/20261011-C258-nft-execution-audit-01.json`,`${L}/20261011-C258-nft-intent-01.json`,'/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json'];
(async()=>{
 const evidence=JSON.parse(readFileSync(files[1],'utf8')),intent=JSON.parse(readFileSync(files[2],'utf8')),profile=validateNetworkProfile(JSON.parse(readFileSync(files[3],'utf8')));
 assert(evidence.passed&&evidence.execution.success);assert.equal(profile.expectedGenesisDigest,intent.expectedH0);
 const session=new WalletReadSession(profile),native=new WalletFullnodeReader(session),calls:any[]=[],original=globalThis.fetch.bind(globalThis);
 globalThis.fetch=async(input,init)=>{const url=String(input);assert(['http://127.0.0.1:41750/','http://127.0.0.1:41957/graphql','http://127.0.0.1:41958/'].some(base=>url.startsWith(base)));assert(!/Execute|Simulate|VerifySignature/.test(url));const response=await original(input,init);calls.push({url,status:response.status,requestBase64:Buffer.from(init?.body as any??'').toString('base64'),responseBase64:Buffer.from(await response.clone().arrayBuffer()).toString('base64')});return response;};
 try{
  const expected=evidence.confirmed[0];
  const [nft,wrapper,kiosk,tokenObject]=await Promise.all([expected.nft,expected.wrapper,expected.kiosk,expected.token].map(o=>native.object(o.objectId)));
  for(const [object,change]of [[nft,expected.nft],[wrapper,expected.wrapper],[kiosk,expected.kiosk],[tokenObject,expected.token]]as const){assert(object);assert.equal(object.version,change.outputVersion);assert.equal(object.digest,change.outputDigest);assert.equal(object.previousTransaction,evidence.execution.digest);}
  assert.equal(nft!.owner.$kind,'ObjectOwner');assert.equal((nft!.owner as any).ObjectOwner,wrapper!.objectId);assert.equal((wrapper!.owner as any).ObjectOwner,kiosk!.objectId);
  const token=originByteOwnerToken(tokenObject!,intent.recipient,profile.packages);assert(token);assert.equal(token.kioskId,kiosk!.objectId);assert.equal(token.owner,intent.recipient);
  const balances=await native.balances(intent.sender);const balance=balances.find(b=>b.coinType.endsWith('::rtd::RTD'));assert.equal(balance?.balance,'999989419592');
  const snapshot=await WalletAssetReader.open(session);const beforeKiosks=await snapshot.kiosks(intent.sender),recipientKiosks=await snapshot.kiosks(intent.recipient);
  const oldOwnerStillIndexed=beforeKiosks.value.some(k=>k.items.some(o=>o.objectId===intent.objectId));const newOwnerIndexed=recipientKiosks.value.some(k=>k.items.some(o=>o.objectId===intent.objectId));
  assert(BigInt(snapshot.proof.checkpoint)<BigInt(expected.checkpoint));assert(oldOwnerStillIndexed&&!newOwnerIndexed);
  const report={passed:true,observedAt:new Date().toISOString(),scope:'Current native effect-linked ownership chain and OwnerToken BCS verified; admitted GraphQL snapshot remains older than the write',digest:evidence.execution.digest,checkpoint:expected.checkpoint,nft,wrapper,kiosk,tokenObject,token,balances,indexedCheckpoint:snapshot.proof.checkpoint,oldOwnerStillIndexed,newOwnerIndexed,indexedPostWriteAccepted:false,calls,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))};
  writeFileSync(`${L}/20261011-C258-nft-post-write-01.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,nativeOwner:intent.recipient,kiosk:kiosk!.objectId,balance:balance?.balance,indexedCheckpoint:snapshot.proof.checkpoint,oldOwnerStillIndexed,newOwnerIndexed,requests:calls.length}));
 }finally{globalThis.fetch=original;session.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
