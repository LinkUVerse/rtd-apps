// Read-only independent verification of the single ordinary Chrome G4 transfer.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RtdGrpcClient} from 'rtd-typescript/grpc';
import {Transaction} from 'rtd-typescript/transactions';
import {verifyTransactionSignature} from 'rtd-typescript/verify';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';

async function main(){
 const [profileFile,intentFile,output]=process.argv.slice(2);
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
 const intent=JSON.parse(readFileSync(intentFile,'utf8'));
 assert.equal(profile.expectedGenesisDigest,intent.expectedH0);
 const original=globalThis.fetch,calls:any[]=[];
 const origins=new Set(Object.values(profile.endpoints).map(v=>new URL(v!).origin));
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  assert(origins.has(url.origin)&&url.hostname==='127.0.0.1');
  assert(!/Execute|Simulate|VerifySignature/.test(url.pathname));
  assert(!String(init?.body).includes('"jsonrpc"'));
  const response=await original(input,{...init,credentials:'omit',redirect:'error'});
  calls.push({url:url.href,status:response.status,requestBase64:Buffer.from(init?.body as any??'').toString('base64'),responseBase64:Buffer.from(await response.clone().arrayBuffer()).toString('base64')});
  return response;
 };
 const session=new WalletReadSession(profile);
 try{
  const client=new RtdGrpcClient({network:'localnet',baseUrl:profile.endpoints.fullnodeGrpcWeb,format:'binary',mvr:{url:''}});
  const head=(await client.ledgerService.getServiceInfo({})).response;
  assert.equal(head.chainId,intent.expectedH0);
  const result=await client.core.getTransaction({digest:intent.previewDigest,include:{effects:true,transaction:true,bcs:true,objectTypes:true,balanceChanges:true}});
  assert.equal(result.$kind,'Transaction');const tx=result.Transaction!;
  assert(tx.status.success&&tx.checkpoint&&tx.bcs);assert.equal(tx.digest,intent.previewDigest);
  const decoded=Transaction.from(tx.bcs),data=decoded.getData();
  assert.equal(await decoded.getDigest(),intent.previewDigest);
  assert.equal(data.sender,intent.sender);assert.equal(data.gasData.owner,intent.sender);
  assert(BigInt(data.gasData.budget!)<=BigInt(intent.maximumApprovedGasAtomic));
  assert.equal(data.expiration?.Validity?.chain,intent.expectedH0);
  assert.equal(data.commands.length,1);const command=data.commands[0].TransferObjects!;assert(command);
  assert.equal(command.objects.length,1);
  assert.equal(data.inputs[command.objects[0].Input!].Object?.ImmOrOwnedObject?.objectId,intent.objectId);
  assert.equal('0x'+Buffer.from(data.inputs[command.address.Input!].Pure!.bytes,'base64').toString('hex'),intent.recipient);
  assert.equal(tx.signatures.length,1);
  assert.equal((await verifyTransactionSignature(tx.bcs,tx.signatures[0],{address:intent.sender})).toRtdAddress(),intent.sender);
  const native=new WalletFullnodeReader(session),object=await native.object(intent.objectId);
  assert(object);assert.equal(object.previousTransaction,intent.previewDigest);
  assert.equal((object.owner as any).AddressOwner,intent.recipient);
  console.log(JSON.stringify({nativePassed:true,digest:tx.digest,checkpoint:tx.checkpoint,version:object.version,owner:intent.recipient}));
  const reader=await WalletAssetReader.open(session,{minimumCheckpoint:tx.checkpoint});
  const [sender,recipient]=await Promise.all([reader.ownedObjects(intent.sender),reader.ownedObjects(intent.recipient)]);
  assert(!sender.value.some(o=>o.objectId===intent.objectId));
  const indexed=recipient.value.find(o=>o.objectId===intent.objectId);assert(indexed);
  assert.equal(indexed.version,object.version);assert.equal(indexed.digest,object.digest);
  assert.deepEqual(indexed.owner,object.owner);
  const balances=await native.balances(intent.sender);
  const files=[process.argv[1],profileFile,intentFile,'src/shared/rpc/asset-reader.ts','src/shared/rpc/fullnode-reader.ts','src/shared/rpc/graphql-snapshot.ts'];
  const proof={passed:true,observedAt:new Date().toISOString(),h0:intent.expectedH0,digest:intent.previewDigest,checkpoint:tx.checkpoint,transaction:tx,decoded:data,object,indexedCheckpoint:reader.proof.checkpoint,sender,recipient,balances,calls,simulations:0,signatures:0,executeRequests:0,scope:'Original digest and offline signature/BCS verification; current native owner and both indexed lists in one post-write snapshot. Ordinary Chrome reload is separate.',inputsSha256:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))};
  writeFileSync(output,JSON.stringify(proof,(_k,v)=>typeof v==='bigint'?String(v):v instanceof Uint8Array?Buffer.from(v).toString('base64'):v,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,digest:tx.digest,checkpoint:tx.checkpoint,indexedCheckpoint:reader.proof.checkpoint,senderObjects:sender.value.length,recipientObjects:recipient.value.length}));
 }finally{session.close();globalThis.fetch=original;}
}
main().catch(e=>{console.error(e);process.exitCode=1});
