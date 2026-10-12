// Actual wallet history admission against an explicitly selected dev account API.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAccountHistoryReader} from '../src/shared/rpc/account-history-reader';
async function main(){
 const [profileFile,endpoint,owner,output]=process.argv.slice(2);
 assert.equal(new URL(endpoint).hostname,'127.0.0.1');
 const raw=JSON.parse(readFileSync(profileFile,'utf8'));
 const session=new WalletReadSession(validateNetworkProfile({...raw,endpoints:{...raw.endpoints,accountHistoryUrl:endpoint}}));
 try{
  const result=await new WalletAccountHistoryReader(session,{timeoutMs:60000}).read(owner);
  assert(result.checkpointLo<=result.checkpointHi);
  assert.equal(result.coverage.allAccountActivityCertified,false);
  writeFileSync(output,JSON.stringify({verifiedAt:new Date().toISOString(),result,scope:'Actual wallet reader and private account API over certified prefix; no browser or continuous-history acceptance'},(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({checkpointLo:result.checkpointLo,checkpointHi:result.checkpointHi,transactions:result.transactions.length,coverage:result.coverage}));
 }finally{session.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
