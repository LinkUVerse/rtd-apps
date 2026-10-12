// Read-only production-reader proof after the single ordinary Chrome withdrawal.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RtdGrpcClient} from 'rtd-typescript/grpc';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
import {WalletStakingSnapshotReader} from '../src/shared/rpc/staking-snapshot-reader';
import {WalletAccountHistoryReader} from '../src/shared/rpc/account-history-reader';

async function main(){
 const [profileFile,nftFile,stakeFile,withdrawFile,output]=process.argv.slice(2);
 const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
 const profile=validateNetworkProfile(read(profileFile)),nft=read(nftFile),stake=read(stakeFile),withdraw=read(withdrawFile);
 assert(nft.passed&&stake.passed&&withdraw.passed);
 const intent=withdraw.intent;assert.equal(profile.expectedGenesisDigest,intent.expectedH0);
 assert.equal(stake.intent.sender,intent.sender);
 const checkpoint=withdraw.confirmed[0].transaction.checkpoint;
 const baseline=nft.balances.find((v:any)=>v.coinType.endsWith('::rtd::RTD'));
 const expectedBalance=BigInt(baseline.balance)+BigInt(stake.execution.balanceDeltaAtomic)+BigInt(withdraw.execution.balanceDeltaAtomic);
 const session=new WalletReadSession(profile),original=globalThis.fetch,frames:any[]=[],steps:any={};let result:any;
 const allowed=new Set(Object.values(profile.endpoints).map(v=>new URL(v!).origin));
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  assert(url.hostname==='127.0.0.1'&&allowed.has(url.origin));assert(!/Execute|Simulate|VerifySignature/.test(url.pathname));
  const row:any={url:url.href,requestBase64:Buffer.from(init?.body as any??'').toString('base64')};frames.push(row);
  try{const response=await original(input,init);row.status=response.status;row.responseBase64=Buffer.from(await response.clone().arrayBuffer()).toString('base64');return response;}
  catch(e:any){row.error={name:e.name,message:e.message};throw e;}
 };
 try{
  const client=new RtdGrpcClient({network:'localnet',baseUrl:profile.endpoints.fullnodeGrpcWeb,format:'binary',mvr:{url:''}});
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,intent.expectedH0);
  const tx=(await client.core.getTransaction({digest:intent.digest,include:{bcs:true,effects:true,transaction:true,balanceChanges:true,events:true}})).Transaction;
  assert(tx?.status.success);assert.equal(tx.checkpoint,checkpoint);assert.equal(Buffer.from(tx.bcs!).toString('base64'),withdraw.bytesBase64);
  steps.originalTransaction=tx;
  const balances=await new WalletFullnodeReader(session).balances(intent.sender);
  assert.equal(balances.find(b=>b.coinType.endsWith('::rtd::RTD'))?.balance,expectedBalance.toString());
  steps.balances=balances;
  const portfolio=await WalletStakingSnapshotReader.read(session,intent.sender);
  assert(BigInt(portfolio.snapshot.checkpoint)>=BigInt(checkpoint),'Index remains before withdrawal');
  assert(!portfolio.value.positions.some(p=>p.objectId===intent.stakeId));
  steps.portfolio=portfolio;
  const history=await new WalletAccountHistoryReader(session,{minimumCheckpoint:checkpoint}).read(intent.sender);
  for(const proof of [stake,withdraw]){
   const row=history.transactions.find(t=>t.digest===proof.intent.digest);assert(row,'Original transaction missing from admitted history');
   assert.equal(row.status,'SUCCESS');assert.equal(String(row.checkpoint),proof.confirmed[0].transaction.checkpoint);
   assert.equal(Buffer.from(row.transaction!.bcs!).toString('base64'),proof.bytesBase64);
  }
  steps.history=history;result={passed:true};
 }catch(e:any){result={passed:false,error:{name:e.name,message:e.message,reason:e.reason}};}
 finally{session.close();globalThis.fetch=original;}
 const inputs=[process.argv[1],profileFile,nftFile,stakeFile,withdrawFile];
 writeFileSync(output,JSON.stringify({...result,observedAt:new Date().toISOString(),expectedBalanceAtomic:expectedBalance.toString(),withdrawalCheckpoint:checkpoint,steps,frames,simulations:0,signatures:0,executions:0,scope:'Original-digest native confirmation, exact post-write balance, complete production staking reader at or after withdrawal, admitted account history containing both original transactions. Browser acceptance separate.',inputsSha256:Object.fromEntries(inputs.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))},(_k,v)=>typeof v==='bigint'?String(v):v instanceof Uint8Array?Buffer.from(v).toString('base64'):v,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({...result,completed:Object.keys(steps),index:steps.portfolio?.snapshot.checkpoint,history:steps.history?.checkpointHi,balance:expectedBalance.toString()}));
 if(!result.passed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
