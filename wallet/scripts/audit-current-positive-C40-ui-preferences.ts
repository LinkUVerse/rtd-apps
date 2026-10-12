// Independent current artifact, raw historical Display, native owner and media audit.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { bcs } from 'rtd-typescript/bcs';
import { toBase64 } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
async function main() {
 const [profileFile, output] = process.argv.slice(2); assert(!existsSync(output));
 const dir='migrationToGRpcOrGraphQLDoc/workLog/';
 const read=(f:string)=>JSON.parse(readFileSync(f,'utf8'));
 const sha=(f:string)=>createHash('sha256').update(readFileSync(f)).digest('hex');
 const files=[profileFile,dir+'20261007-C40-ui-preferences-apps-chrome-01.json',dir+'20261007-default-generation-positive-C40-build-01.json',dir+'20261007-default-generation-positive-C40-audit-01.json',dir+'20261006-default-generation-display-bcs-01.json',dir+'20261007-positive-C39-direct-display-native-audit-03.json',dir+'20261007-retired-C39-loopback-cleanup-01.json',dir+'20261007-positive-C40-edge-audit-01.json',dir+'20261007-C40-foundation-audit-01.json',dir+'20261007-C40-unit-results-01.json',dir+'20261007-C40-target-results-05.json'];
 const [profileRaw,p,build,closure,n,transfer,cleanup,edge,foundation,full,target]=files.map(read);
 assert([p,build,closure,n,transfer,cleanup,edge,foundation].every(v=>v.passed));
 assert(full.success&&full.numTotalTests===2637&&full.numPassedTests===2637&&full.numFailedTests===0&&full.testResults.length===186);
 assert(target.success&&target.numTotalTests===10&&target.numPassedTests===10);
 assert.deepEqual(p.source,build.sourceBefore);assert.deepEqual(p.source,build.sourceAfter);
 assert.equal(p.checks.length,32);assert(p.checks.every((v:any)=>v.passed));
 assert.equal(p.executeRequests,0);assert.equal(p.signatures,0);assert.equal(p.simulations.length,0);assert.deepEqual(p.forbidden,[]);assert.deepEqual(p.errors,[]);
 assert.deepEqual(p.initialJournal,{'journal-v2':[],'pending-scopes-v2':[],'metadata-v2':[]});assert.deepEqual(p.finalJournal,p.initialJournal);
 for(const v of [p.workerSource,p.restartWorker])assert.equal(v.workerSha256,build.artifacts['background.js']);
 for(const v of [p.uiSource,p.restartUi]){assert(v.matchesDisk);for(const b of v.loadedBundles)assert.equal(b.loadedSha256,build.artifacts[b.file]);}
 for(const [f,h]of Object.entries(p.inputsSha256))assert.equal(sha(f),h);
 for(const [f,h]of Object.entries(build.artifacts))assert.equal(sha(build.output+'/'+f),h);
 assert.equal(new Set(p.themes.map((v:any)=>v.primary)).size,4);assert.equal(new Set(p.themes.map((v:any)=>v.surface)).size,4);
 assert.deepEqual(p.themes.map((v:any)=>v.theme),['passion','calm','professional','red-thread']);assert.deepEqual(p.themes.map((v:any)=>v.scheme),['light','light','dark','dark']);assert.equal(p.autoLockMinutes,10);
 assert(p.preferenceUi.some((v:any)=>v.locale==='zh-CN'&&v.text.includes('语言')));
 assert(p.supportLinks.length>=3&&p.supportLinks.every((v:any)=>new URL(v.href).protocol==='https:'));assert(p.networkMenuText.includes('Local'));assert(p.logoutDialogText.includes('Cancel'));
 assert(p.appsText.includes('RTD Apps'));assert(p.connectedAppsText.includes('No connected apps'));assert(p.chineseConnectedAppsText.includes('暂无已连接应用'));assert(p.onrampText.includes('Fiat purchases are unavailable'));
 const profile=validateNetworkProfile(profileRaw);assert.equal(p.h0,profile.expectedGenesisDigest);assert.equal(p.generation,profile.generation);
 const pref=JSON.parse(p.preferenceHidden[0].key);assert.deepEqual(pref.slice(0,2),['wallet-hidden-assets',2]);assert.deepEqual(JSON.parse(pref[2]),[p.h0,p.generation]);assert.equal(pref[3],p.owner);
 assert.deepEqual(p.preferenceHidden[0].value,{version:2,ids:[n.nfts[0].id]});assert.deepEqual(p.preferenceRestored,[{key:p.preferenceHidden[0].key,value:{version:2,ids:[]}}]);
 const rows=new Map<string,any>();function visit(v:any){if(Array.isArray(v)){v.forEach(visit);return;}if(!v||typeof v!=='object')return;if(n.nfts.some((x:any)=>x.id===v.address)&&v.contents?.display?.output)rows.set(v.address,v);Object.values(v).forEach(visit);}for(const v of p.graphql){assert(!v.errors);visit(v.data);}assert.equal(rows.size,2);
 const session=new WalletReadSession(profile),reader=new WalletFullnodeReader(session),original=globalThis.fetch,paths:string[]=[];
 globalThis.fetch=(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert(u.origin==='http://127.0.0.1:41750'&&['/GetServiceInfo','/GetObject'].some(s=>u.pathname.endsWith(s))||u.href==='http://127.0.0.1:41718/display-v2.png');paths.push(u.href);return original(input,init);};
 try{
  const layout=bcs.struct('DisplayNFT',{id:bcs.Address,name:bcs.string(),image_url:bcs.string(),serial:bcs.u64()}),template=await reader.object(n.display.id);assert(template);const templateHash=createHash('sha256').update(template.content).digest('hex'),checked=[];
  for(const oracle of n.nfts){const native=await reader.object(oracle.id);assert(native);assert.deepEqual(layout.parse(native.content),oracle.value);const raw=rows.get(oracle.id),display=raw.contents.display,basis=display.basis;assert.equal(raw.contents.bcs,toBase64(layout.serialize(oracle.value).toBytes()));assert.equal(String(raw.version),oracle.version);assert.equal(raw.digest,oracle.digest);assert.equal(display.errors,null);assert.deepEqual(display.output,{name:oracle.value.name,image_url:oracle.value.image_url,description:'RTD local Display V2 migration fixture #'+oracle.value.serial});assert.equal(basis.templateId,template.objectId);assert.equal(String(basis.objectVersion),template.version);assert.equal(basis.objectDigest,template.digest);assert.equal(basis.contentsBcsSha256,templateHash);assert.equal(basis.historyCoverage.genesisDigest,p.h0);assert.equal(basis.historyCoverage.generation,p.generation);assert(basis.snapshotCheckpoint>=68693&&basis.snapshotCheckpoint<198775&&basis.historyCoverage.lastCheckpoint>=basis.snapshotCheckpoint);if(oracle.id===n.nfts[0].id){assert(native.owner.$kind==='AddressOwner'&&native.owner.AddressOwner==='0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7');}else assert(native.owner.$kind==='AddressOwner'&&native.owner.AddressOwner===p.owner);checked.push({id:oracle.id,indexedOriginalBcsAndBasisVerified:true,indexedHistoricalSnapshot:basis.snapshotCheckpoint,currentNativeOwner:native.owner,currentNativeBcsValueVerified:true});}
  const response=await fetch('http://127.0.0.1:41718/display-v2.png');assert.equal(response.status,200);const pngHash=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');assert.equal(pngHash,'d45be1d4c7bbb1614cf23ae0dbf64a92b318dc6c4063001f024b07c46f12bc1e');assert(p.media.complete&&p.media.width===32&&p.media.height===32);
  assert.equal(edge.gates.length,60);assert.equal(edge.graphqlIdentities.length,9);assert.equal(edge.realTlsHandshakes.length,3);assert.equal(foundation.runningCount,28);assert.equal(foundation.healthyCount,14);assert.equal(cleanup.currentContainersPreserved,28);
  writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),source:build.sourceAfter,actualUiChecks:32,currentUiAndWorkerBeforeAndAfterChromeRestartVerified:true,fullTests:2637,targetedTests:10,checkedDisplay:checked,pngHash,completeJournalUnchanged:true,exactScopedHiddenPreferenceAndRestoreVerified:true,cleanupRemoved:1,paths,auditDatabaseWrites:0,auditSimulations:0,auditSignatures:0,auditExecuteRequests:0,inputsSha256:Object.fromEntries([...files,process.argv[1]].map(f=>[f,sha(f)])),scope:'Current C40 real preference/empty-state/lock and complete Chrome restart, raw historical Display output/basis and current native bytes/recipient verified separately. No claim historical source ownership is current. Account cipher baseline was not collected during these 32 checks; cold cipher preservation needs separate evidence. Timer alarm, dApp authorization, normal Chrome HTTPS and complete parent acceptance remain separate.'},null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,uiChecks:32,display:checked.length,auditExecuteRequests:0}));
 }finally{session.close();globalThis.fetch=original;}
}
main().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,300)}));process.exitCode=1});
