// Exact ordinary Chrome HAR replay through the production history verifier.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parse,print} from 'graphql';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAccountHistoryReader} from '../src/shared/rpc/account-history-reader';
async function main(){
 const [input,output]=process.argv.slice(2),raw=readFileSync(input),entries=JSON.parse(raw.toString()).log.entries;
 const profile=validateNetworkProfile(JSON.parse(readFileSync('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json','utf8')));
 const owner='0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c';assert.equal(entries.length,10);const reports=[];
 for(let cycle=0;cycle<2;cycle++){
  let n=0;const rows=entries.slice(cycle*5,cycle*5+5);
  const transport:typeof fetch=async(input,init)=>{const e=rows[n++];assert(e);assert.equal(String(input),e.request.url);assert.equal(e.response.status,200);assert(!e._error);
   const actual=JSON.parse(String(init?.body)),expected=JSON.parse(e.request.postData.text);assert.equal(print(parse(actual.query)),print(parse(expected.query)));assert.deepEqual(actual.variables??{},expected.variables??{});
   return new Response(e.response.content.text,{status:200,headers:{'content-type':'application/json'}});};
  const session=new WalletReadSession(profile);try{const view=await new WalletAccountHistoryReader(session,{fetch:transport}).read(owner);assert.equal(n,5);assert.equal(view.transactions.length,9);reports.push({graphql:n,transactions:view.transactions.length,checkpointLo:view.checkpointLo,checkpointHi:view.checkpointHi,checkpointDigest:view.checkpointDigest});}finally{session.close();}
 }
 writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),scope:'Two nonempty ordinary Chrome history cycles replayed by production reader including canonical transaction facts and final coverage fence',cycles:reports,fullAccountHistoryAccepted:false,parentCompletion:false,liveNetworkRequests:0,inputsSha256:{[input]:createHash('sha256').update(raw).digest('hex'),[process.argv[1]]:createHash('sha256').update(readFileSync(process.argv[1])).digest('hex')}},null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,cycles:2,graphqlPerCycle:5,transactions:9}));
}main().catch(e=>{console.error(e);process.exitCode=1;});
