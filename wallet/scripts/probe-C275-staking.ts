// Current staking reader against the certified G4 service, without signing.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletStakingSnapshotReader} from '../src/shared/rpc/staking-snapshot-reader';
async function main(){
 const [profileFile,owner,output]=process.argv.slice(2);
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8'))),session=new WalletReadSession(profile);
 const original=globalThis.fetch,frames:any[]=[],start=performance.now();let result:any;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input)),began=performance.now();
  assert(url.hostname==='127.0.0.1'&&[43150,43210].includes(Number(url.port)));
  assert(!/Execute|Simulate|VerifySignature/.test(url.pathname));
  const row:any={url:url.href,atMs:began-start,requestBase64:Buffer.from(init?.body as any??'').toString('base64')};frames.push(row);
  try{const response=await original(input,init);row.status=response.status;row.responseBase64=Buffer.from(await response.clone().arrayBuffer()).toString('base64');return response;}
  catch(e:any){row.error={name:e.name,message:e.message};throw e;}
  finally{row.elapsedMs=performance.now()-began;}
 };
 try{result={passed:true,value:await WalletStakingSnapshotReader.read(session,owner)};}
 catch(e:any){result={passed:false,error:{name:e.name,message:e.message,reason:e.reason,stack:e.stack}};}
 finally{session.close();globalThis.fetch=original;}
 writeFileSync(output,JSON.stringify({...result,observedAt:new Date().toISOString(),elapsedMs:performance.now()-start,frames,simulations:0,signatures:0,executions:0},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:result.passed,error:result.error,elapsedMs:performance.now()-start,requests:frames.length,epoch:result.value?.value?.epoch}));
 if(!result.passed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
