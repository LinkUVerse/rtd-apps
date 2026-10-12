// Read-only source readers for asset/Kiosk and account-history surfaces.
import { readFileSync, writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletAccountHistoryReader } from '../src/shared/rpc/account-history-reader';

async function main() {
 const profile=validateNetworkProfile(JSON.parse(readFileSync('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json','utf8')));
 const owner='0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc';
 const samples:unknown[]=[];let passed=true;
 const calls:unknown[]=[]; const original=globalThis.fetch.bind(globalThis);
 globalThis.fetch=async(input,init)=>{
   const start=performance.now();const response=await original(input,init);
   const request=typeof init?.body==='string' ? JSON.parse(init.body) : {};
   calls.push({url:String(input),operation:request.query?.match(/query (\w+)/)?.[1],milliseconds:Math.round(performance.now()-start),status:response.status});
   return response;
 };
 for(const scenario of ['assets-and-kiosk','account-history']) {
  const session=new WalletReadSession(profile),start=performance.now();
  try {
   let result:unknown;
   if(scenario==='assets-and-kiosk') {
    const reader=await WalletAssetReader.open(session);
    const [owned,kiosks]=await Promise.all([reader.ownedObjects(owner),reader.kiosks(owner)]);
    result={snapshot:reader.proof.checkpoint,objects:owned.value.length,kiosks:kiosks.value.length};
   } else {const history=await new WalletAccountHistoryReader(session).read(owner);result=history;}
   samples.push({scenario,passed:true,milliseconds:Math.round(performance.now()-start),result});
  }catch(error){passed=false;samples.push({scenario,passed:false,milliseconds:Math.round(performance.now()-start),error:String(error)});}
  finally {session.close();}
 }
 writeFileSync(process.argv[2],JSON.stringify({passed,samples,calls,scope:'CLI source readers, compiled profile, not browser UI or nonempty asset acceptance.',signatures:0,executions:0},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed,samples}));if(!passed)process.exitCode=1;
}
main().catch(error=>{console.error(String(error));process.exitCode=1;});
