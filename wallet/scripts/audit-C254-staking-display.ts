// Offline verification of native Chrome HAR and UI. Never submits or signs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse,print} from 'graphql';
import {GrpcTypes} from 'rtd-typescript/grpc';
import {estimatedCurrentEpochEnd} from 'rtd-apps-core/src/rpc/staking-view';
import {WalletReadSession} from '../src/shared/rpc/session';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletStakingSnapshotReader} from '../src/shared/rpc/staking-snapshot-reader';
const L='migrationToGRpcOrGraphQLDoc/workLog',files=[__filename];
const read=(p:string)=>{files.push(p);return JSON.parse(readFileSync(p,'utf8'));};
function frame(b:Buffer,type:any,response:boolean){
 assert(b.length>=5&&b[0]===0);const end=5+b.readUInt32BE(1);assert(end<=b.length);
 if(response){assert.equal(b[end],128);assert.equal(end+5+b.readUInt32BE(end+1),b.length);assert.match(b.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);}else assert.equal(end,b.length);
 return type.fromBinary(b.subarray(5,end));
}
async function main(){
 const ui=read(L+'/20261011-C254-native-ui-02.json'),entries=read(L+'/20261011-C254-staking-display-01.har').log.entries;
 const qualifier=read(L+'/20261011-C254-source-and-checks-01.json'),bytes=read(L+'/20261011-C254-ordinary-bytecode-01.json');
 assert(qualifier.passed&&bytes.completeInstalledBytecodeAccepted);
 const profile=validateNetworkProfile(read('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json'));
 const owner='0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c',digest='CQjbs6dkkBJaTKuecr4yh7qnRPPbb6iHnKdSM26k8DqS';
 const counts:Record<string,number>={};let graphql=0,native=0,receipt=0,currentBalances=0;
 for(const e of entries){
  const u=new URL(e.request.url),method=u.pathname.split('/').pop()!;assert.equal(u.hostname,'127.0.0.1');assert.equal(e.request.method,'POST');assert.equal(e.response.status,200);assert(!e._error&&!e.response._error);counts[method]=(counts[method]??0)+1;
  if(method==='graphql'){
   assert.equal(u.href,profile.endpoints.graphqlUrl);const data=JSON.parse(e.response.content.text);assert(!data.errors?.length);const genesis=Object.entries(data.data).filter(([k])=>k.endsWith('walletGenesis'));assert(genesis.length>0);for(const [,v] of genesis)assert.equal((v as any).digest,profile.expectedGenesisDigest);
   for(const [k,v] of Object.entries(data.data))if(k.endsWith('walletSnapshot')){assert.equal((v as any).sequenceNumber,1006768);assert.equal((v as any).digest,'vDk2miAzvCTPXH7St4GZn794RXRNmDmS37mJgvCc9kN');}graphql++;continue;
  }
  assert(['http://127.0.0.1:41750','https://127.0.0.1:41903'].includes(u.origin));assert(['GetServiceInfo','GetBalance','ListBalances','GetTransaction'].includes(method));
  const req=frame(Buffer.from(e.request.postData.text,'latin1'),(GrpcTypes as any)[method+'Request'],false);assert.equal(e.response.content.encoding,'base64');
  const res=frame(Buffer.from(e.response.content.text,'base64'),(GrpcTypes as any)[method+'Response'],true);native++;
  if(method==='GetServiceInfo')assert.equal(res.chainId,profile.expectedGenesisDigest);
  if(method==='GetBalance'){assert.equal(req.owner,owner);assert.equal(res.balance.balance,998867535440n);}
  if(method==='ListBalances'){assert.equal(req.owner,owner);assert(!res.nextPageToken?.length);assert.equal(res.balances.find((b:any)=>b.coinType.endsWith('::rtd::RTD')).balance,998867535440n);currentBalances++;}
  if(method==='GetTransaction'){assert.equal(req.digest,digest);assert.equal(res.transaction.digest,digest);assert(res.transaction.effects.status.success);assert.equal(res.transaction.checkpoint,1988842n);receipt++;}
 }
 assert.equal(entries.length,71);assert.equal(graphql,60);assert.equal(native,11);assert.equal(receipt,1);assert.equal(currentBalances,1);
 const rows=entries.slice(0,11);let used=0;
 globalThis.fetch=async(input,init)=>{
  assert.equal(String(input),profile.endpoints.graphqlUrl);const expected=JSON.parse(rows[used]?.request.postData.text??'null'),actual=JSON.parse(String(init?.body));assert(expected);used++;
  assert.equal(print(parse(expected.query)),print(parse(actual.query)));assert.deepEqual(expected.variables??{},actual.variables??{});
  return new Response(rows[used-1].response.content.text,{status:200,headers:{'content-type':'application/json'}});
 };
 const session=new WalletReadSession(profile);
 try{
  const view=await WalletStakingSnapshotReader.read(session,owner);assert.equal(used,11);assert.equal(view.value.epoch,'2');assert.equal(estimatedCurrentEpochEnd(view.value,Date.parse(ui.stakeForm.at)),null);
  const body=(s:string)=>s.slice(s.indexOf('HTML 内容 RTD Wallet'));
  const form=body(ui.stakeForm.ax);assert(form.includes('轮次信息待更新'));assert(!form.includes('第 3 轮')&&!form.includes('第 4 轮'));
  const receiptUi=body(ui.receiptReady.ax);assert(receiptUi.includes('交易成功')&&receiptUi.includes('第 6 轮')&&receiptUi.includes('第 7 轮'));assert(receiptUi.includes('交易已确认，资产数据仍在同步。'));
  assert(body(ui.home.ax).includes('998.86'));assert(body(ui.accounts.ax).includes('0xd50b…077c')&&body(ui.accounts.ax).includes('0x9d76…e5bc'));
  const proof={passed:true,observedAt:new Date().toISOString(),scope:'C254 ordinary Chrome outdated-epoch display, original receipt, current balance and account retention; no transaction repeated',requests:entries.length,counts,exceptions:[],nativeFramesDecoded:native,stakingReaderFramesReplayed:used,otherGraphqlFramesStructurallyChecked:graphql-used,snapshot:view.snapshot,indexedSystemEpoch:view.value.epoch,ordinaryBrowserFixAccepted:true,withdrawalAccepted:false,liveNetworkRequests:0,signatures:0,executeRequests:0,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
  writeFileSync(L+'/20261011-C254-browser-audit-03.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(proof));
 }finally{session.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
