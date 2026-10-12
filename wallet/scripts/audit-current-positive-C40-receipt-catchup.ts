// Independently audit actual C40 original-digest receipt coverage and fresh native receipts.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { RtdGrpcClient } from 'rtd-typescript/grpc';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletExecutionReader } from '../src/shared/rpc/execution-reader';
async function main() {
 const [profileFile, proofFile, output] = process.argv.slice(2);
 assert(output && !existsSync(output));
 const read=(f:string)=>JSON.parse(readFileSync(f,'utf8'));
 const sha=(f:string)=>createHash('sha256').update(readFileSync(f)).digest('hex');
 const p=read(proofFile), profile=validateNetworkProfile(read(profileFile));
 assert(p.passed && p.receipts.length===4 && p.simulations===0 && p.signatures===0 && p.executeRequests===0);
 assert.deepEqual(p.blocked,[]);assert.deepEqual(p.errors,[]);assert.deepEqual(p.responseErrors,[]);
 assert.deepEqual(p.encryptedBefore,p.encryptedAfter);assert.deepEqual(p.initialJournal,p.finalJournal);
 assert.equal(p.initialJournal['journal-v2'].length,1);
 assert.equal(p.initialJournal['journal-v2'][0].digest,'JAxXTwkzygqm3PGUJeEoVcWvXQuT97TdK8nxxyzMao8A');
 assert.equal(p.initialJournal['journal-v2'][0].state,'confirmed-success');
 assert.deepEqual(p.initialJournal['pending-scopes-v2'],[]);
 assert.equal(p.h0,profile.expectedGenesisDigest);assert.equal(p.owner,p.encryptedBefore.address);
 for(const[f,h]of Object.entries(p.inputsSha256))assert.equal(sha(f),h);
 const buildFile=resolve('migrationToGRpcOrGraphQLDoc/workLog/20261007-default-generation-positive-C40-build-01.json'),build=read(buildFile);
 assert.deepEqual(p.source,build.sourceAfter);
 for(const[f,h]of Object.entries(build.artifacts))assert.equal(sha(join(build.output,f)),h);
 assert.equal(p.workerSource.workerSha256,build.artifacts['background.js']);
 for(const row of p.uiSource.loadedBundles)assert.equal(row.loadedSha256,build.artifacts[row.file]);
 assert(p.checks.some((r:any)=>r.label==='normal UI relock original cipher and all three stores held'&&r.passed));
 const dependencies=['Address.balances','Address.dynamicField','Address.dynamicFields','Address.dynamicObjectField','Address.objects','MoveObject.contents','MoveValue.display','Query.checkpoints','Query.coinMetadata','Query.object'].sort();
 const session=new WalletReadSession(profile),execution=new WalletExecutionReader(session),paths:string[]=[],nativeRows:any[]=[];
 const originalFetch=globalThis.fetch;
 globalThis.fetch=(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert(['http://127.0.0.1:41750','http://127.0.0.1:41955'].includes(u.origin));assert(['/GetServiceInfo','/GetTransaction','/GetCheckpoint'].some(m=>u.pathname.endsWith(m)));assert(!String(init?.body).includes('"jsonrpc"'));paths.push(u.href);return originalFetch(input,init)};
 let report:any={passed:false};
 try{
 const native=new RtdGrpcClient({network:profile.sdkNetwork,baseUrl:profile.endpoints.fullnodeGrpcWeb,format:'binary',mvr:{url:''}});
 assert.equal((await native.ledgerService.getServiceInfo({})).response.chainId,p.h0);
 for(const r of p.receipts){
 assert.equal(sha(r.file),r.sha256);const oracle=read(r.file);assert(oracle.passed&&oracle.signatureVerified&&oracle.nativeEffectsMatch);assert.equal(oracle.digest,r.digest);
 const receipt=await execution.lookup(r.digest);assert(receipt&&receipt.success===true);assert.equal(receipt.checkpoint,r.checkpoint);assert.equal(receipt.effectsBase64,oracle.receipt.effectsBase64);
 const key=r.observer.queryKey,cache=JSON.parse(key.at(-3));assert.equal(cache.length,6);assert.equal(key[0],'wallet-receipt-indexing');assert.equal(key.at(-2),r.digest);assert.equal(key.at(-1),r.checkpoint);assert.equal(key[2],cache[0]);assert.equal(JSON.parse(cache[0])[0],key[1]);assert.equal(JSON.parse(key[1])[5],p.h0);
 const S=cache[2],digest=cache[3];assert.equal(r.snapshot.checkpoint,S);assert.equal(r.snapshot.digest,digest);assert.equal(r.observer.status,'success');assert.equal(r.observer.errorName,null);assert.equal(r.observer.data,BigInt(S)>=BigInt(r.checkpoint));assert.equal(r.observer.data,r.expectCovered);
 assert.deepEqual(cache[4].map((d:any)=>d.type+'.'+d.field).sort(),dependencies);assert.deepEqual(cache[4],r.snapshot.dependencies);assert.deepEqual(cache[5],r.snapshot.displayHistory);
 const display=cache[5].coverage;assert.equal(display.genesisDigest,p.h0);assert.equal(display.snapshotCheckpoint,S);assert.equal(display.snapshotCheckpointDigest,digest);assert(BigInt(display.firstCheckpoint)<=BigInt(S)&&BigInt(display.lastCheckpoint)>=BigInt(S));
 const proofRows=p.graphql.filter((q:any)=>q.status===200&&!q.errors&&q.data?.walletGenesis?.digest===p.h0&&String(q.data?.walletSnapshot?.sequenceNumber)===S&&q.data?.walletSnapshot?.digest===digest&&dependencies.every((d:string)=>{const[t,f]=d.split('.');return q.query.includes('type: "'+t+'", field: "'+f+'"')}));
 assert(proofRows.length>0,'Actual response must bind exact complete ten-dependency S/digest');
 for(const q of proofRows){const ranges=Object.values(q.data.serviceConfig) as any[];assert(ranges.length===10&&ranges.every(v=>BigInt(v.first.sequenceNumber)<=BigInt(S)&&BigInt(v.last.sequenceNumber)>=BigInt(S)));}
 assert(r.assetRefreshes.length>0&&r.assetRefreshes.every((q:any)=>q.status===200&&!q.errors&&q.data?.walletSnapshot&&q.data?.walletGenesis?.digest===p.h0));assert(r.journalUnchanged);
 const req={checkpointId:{oneofKind:'sequenceNumber' as const,sequenceNumber:BigInt(S)},readMask:{paths:['sequence_number','digest']}};
 let checkpoint,source='fullnode';try{checkpoint=(await native.ledgerService.getCheckpoint(req)).response.checkpoint;}catch(e:any){assert.equal(e.code,'NOT_FOUND');const archive=new RtdGrpcClient({network:profile.sdkNetwork,baseUrl:profile.endpoints.archiveGrpcWeb!,format:'binary',mvr:{url:''}});assert.equal((await archive.ledgerService.getServiceInfo({})).response.chainId,p.h0);checkpoint=(await archive.ledgerService.getCheckpoint(req)).response.checkpoint;source='archive';}
 assert(checkpoint&&String(checkpoint.sequenceNumber)===S&&checkpoint.digest===digest);
 assert(r.receiptText.includes('交易成功'));assert.equal(r.receiptText.includes('交易已确认，资产数据仍在同步。'),!r.expectCovered);
 nativeRows.push({label:r.label,digest:r.digest,checkpoint:r.checkpoint,snapshotCheckpoint:S,snapshotDigest:digest,snapshotNativeSource:source,indexCovered:r.observer.data,exactTenDependencyResponses:proofRows.length,freshReceiptVerified:true});
 }
 assert.equal((await native.ledgerService.getServiceInfo({})).response.chainId,p.h0);
 for(const[f,h]of Object.entries(p.inputsSha256))assert.equal(sha(f),h);
 report={passed:true,observedAt:new Date().toISOString(),source:p.source,h0:p.h0,owner:p.owner,receipts:nativeRows,fullJournalAndCipherHeld:true,currentWorkerAndUiBytesHeld:true,normalRelockVerified:true,paths,simulations:0,signatures:0,executeRequests:0,inputsSha256:Object.fromEntries([resolve(process.argv[1]),profileFile,proofFile,buildFile].map(f=>[resolve(f),sha(f)])),scope:'Original C40 affected-owner browser receipts, actual QueryObserver and raw complete ten-field snapshot responses, fresh native receipts/effects and checkpoint digests, real refresh, full cipher/journal and normal relock. No injected cache/store state, dispatch, full all-entry acceptance or ordinary HTTPS claim.'};
 }catch(e:any){report={passed:false,errorType:e.name,message:String(e.message).slice(0,1500),nativeRows,paths,simulations:0,signatures:0,executeRequests:0};process.exitCode=1;}finally{globalThis.fetch=originalFetch;session.close();writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:report.passed,receipts:nativeRows.length,executeRequests:0}));}
}
main().catch((e:any)=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,500)}));process.exitCode=1;});
