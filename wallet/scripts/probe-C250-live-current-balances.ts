// Live read-only production reader; no browser automation, signing or execution.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
const L='migrationToGRpcOrGraphQLDoc/workLog';
const profileFile='/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json';
const owners=['0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c','0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc'];
(async()=>{
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
 const session=new WalletReadSession(profile), captures:unknown[]=[], rounds:unknown[]=[];
 const transport:typeof fetch=async(input,init)=>{
  const url=String(input);assert.match(url,/^http:\/\/127\.0\.0\.1:41750\/rtd\.rpc\.v2\.(LedgerService\/GetServiceInfo|StateService\/(ListBalances|GetBalance))$/);
  const start=performance.now(),response=await fetch(input,init),bytes=new Uint8Array(await response.clone().arrayBuffer());
  captures.push({url,status:response.status,elapsedMs:performance.now()-start,requestBase64:Buffer.from(init!.body as Uint8Array).toString('base64'),responseBase64:Buffer.from(bytes).toString('base64')});return response;
 };
 const reader=new WalletFullnodeReader(session,{fetch:transport});
 try{
  for(let round=0;round<3;round++){
   for(const owner of owners){
    const offset=captures.length,start=performance.now();
    const [a,b]=await Promise.all([reader.balances(owner),reader.balances(owner)]);
    assert.deepEqual(a,b);assert.equal(captures.length-offset,3);
    const rtd=a.find(x=>x.coinType.endsWith('::rtd::RTD'));assert(rtd);
    assert.equal(rtd.balance,owner===owners[0]?'999869964544':'10000000');
    rounds.push({round:round+1,owner,balances:a,requests:3,elapsedMs:performance.now()-start});
   }
  }
 }finally{session.close();}
 const files=[__filename,profileFile,'src/shared/rpc/fullnode-reader.ts','src/shared/rpc/fullnode-read-queue.ts'];
 const proof={passed:true,observedAt:new Date().toISOString(),scope:'Actual current-balance production reader, three rounds/two C51 dev owners; same-session concurrent list reuse, strict H0/protobuf/full-page validation. API proof, not ordinary Chrome acceptance.',rounds,captures,executionRequests:0,signatures:0,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))};
 writeFileSync(`${L}/20261011-C250-live-current-balances-01.json`,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,rounds}));
})().catch(e=>{console.error(e);process.exitCode=1});
