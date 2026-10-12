// Read-only current production classification; never insert browser preferences.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {groupCollectibles,collectibleKioskCap} from '../src/shared/rpc/nft-assets';
const L='migrationToGRpcOrGraphQLDoc/workLog';
const profileFile='/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json';
const owners=['0xbad0f77037d2352d281607a6237bf559180c85228baf91b7144a5fa021f20456','0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c','0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc'];
(async()=>{
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8'))),original=globalThis.fetch.bind(globalThis),calls:any[]=[],samples:any[]=[];
 globalThis.fetch=async(input,init)=>{const url=String(input);assert.equal(url,'http://127.0.0.1:41957/graphql');assert.equal(init?.method,'POST');const r=await original(input,init);calls.push({url,status:r.status,request:String(init?.body),responseBase64:Buffer.from(await r.clone().arrayBuffer()).toString('base64')});return r;};
 try{
  for(const owner of owners){const session=new WalletReadSession(profile);try{const reader=await WalletAssetReader.open(session),objects=await reader.ownedObjects(owner),groups=groupCollectibles(objects.value,[],profile.packages);const eligible=groups.visual.filter(o=>!collectibleKioskCap(o,profile.packages));samples.push({owner,snapshot:reader.proof.checkpoint,objects:objects.value,visual:groups.visual.map(o=>o.objectId),other:groups.other.map(o=>o.objectId),hideEligibleVisual:eligible.map(o=>o.objectId)});}finally{session.close();}}
 }finally{globalThis.fetch=original;}
 assert(samples.every(s=>s.hideEligibleVisual.length===0));
 const files=[__filename,profileFile,'src/ui/app/pages/home/nfts/VisualAssets.tsx','src/ui/app/pages/home/nfts/NonVisualAssets.tsx','src/shared/rpc/nft-assets.ts'];
 const result={passed:true,observedAt:new Date().toISOString(),scope:'Read-only eligibility preflight for three currently imported accounts; no hide/restore acceptance',samples,calls,hiddenAcceptance:false,blocker:'No directly owned Display asset in current admitted snapshots; Kiosk capabilities have no hide entry; nonvisual items have explorer links only',preferenceWrites:0,signatures:0,executions:0,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
 writeFileSync(`${L}/20261011-C260-hidden-preflight-01.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,requests:calls.length,samples:samples.map(({objects,...s})=>s),hiddenAcceptance:false}));
})().catch(e=>{console.error(e);process.exitCode=1});
