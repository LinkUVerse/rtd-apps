const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog'),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const output=process.argv[2];assert(output&&!fs.existsSync(output));const inverses=[];
function derive(oldName,newName,changes){const old=path.join(__dirname,oldName),next=path.join(__dirname,newName);let text=fs.readFileSync(old,'utf8');const deltas=[];
 for(const[fromText,toText,count=1]of changes){assert.equal(text.split(fromText).length-1,count,newName);text=text.split(fromText).join(toText);deltas.push({fromText,toText,count})}
 if(fs.existsSync(next))assert.equal(fs.readFileSync(next,'utf8'),text);else fs.writeFileSync(next,text,{flag:'wx'});let inverse=text;for(const d of [...deltas].reverse()){assert.equal(inverse.split(d.toText).length-1,d.count);inverse=inverse.split(d.toText).join(d.fromText)}assert.equal(inverse,fs.readFileSync(old,'utf8'));inverses.push({old,new:next,deltas});
}
derive('lib/C118-real-non-nft-signing-ui-v3.cjs','lib/C118-single-signature-delivery-diagnostic.cjs',[
 ["assert.deepEqual(forms.map(r => r.kind),['coin','stake','withdraw']);assert.equal(approvals.length,3);","assert.deepEqual(forms.map(r => r.kind),['coin']);assert.equal(approvals.length,1);"],
 ['.filter(v=>v.approvalEnabled)',".filter(v=>v.name==='originalWindow'&&v.approvalEnabled)"],
 ['assert.equal(records.length,12);assert.equal(popupIds.size,12);','assert.equal(records.length,1);assert.equal(popupIds.size,1);'],
 ['signatures:12,executeRequests:0,nftBusinessRequests:0','signatures:1,executeRequests:0,nftBusinessRequests:0,diagnosticOnly:true'],
]);
const oldTest=fs.readFileSync(path.join(__dirname,'test-C118-current-non-nft-signing-ui-v3.cjs'),'utf8'),begin=oldTest.indexOf("  for(const kind of ['coin','stake','withdraw']){"),end=oldTest.indexOf("  stage='normal non-NFT Wallet Standard validity matrix';",begin);assert(begin>0&&end>begin);
derive('test-C118-current-non-nft-signing-ui-v3.cjs','diagnose-C118-single-signature-delivery.cjs',[
 [" let context,page,worker,hook,privateStage=false",' const stageEvents=[],portEvents=[];let stageMonitor;let context,page,worker,hook,privateStage=false'],
 ["  const allowed=new Set(","  await context.addInitScript(require('./lib/C118-signature-delivery-stage-monitor.cjs').observeUiPorts);context.on('page',p=>p.on('console',m=>{const text=m.text();if(text.startsWith('__C118_PORT__:'))portEvents.push(JSON.parse(text.slice(14)))}));for(const p of context.pages())p.on('console',m=>{const text=m.text();if(text.startsWith('__C118_PORT__:'))portEvents.push(JSON.parse(text.slice(14)))});\n  const allowed=new Set("],
 ["  const command=(method,args)=>", "  stageMonitor=await require('./lib/C118-signature-delivery-stage-monitor.cjs').attach(context,worker,build.output,stageEvents);proof.stageMonitor=stageMonitor.evidence;\n  const command=(method,args)=>"],
 [oldTest.slice(begin,end),"  const reusedFile=path.join(logs,'20261008-C118-non-nft-signing-ui-03.json'),reused=read(reusedFile);assert.equal(reused.passed,false);assert(reused.cases.length===3&&reused.cipherBefore.owner===owner);cases.push(reused.cases.find(r=>r.kind==='coin'));proof.reusedPublicPreparation={file:reusedFile,sha256:sha(reusedFile),currentInternalFormsExecuted:false};\n"],
 ["./lib/C118-real-non-nft-signing-ui-v3.cjs","./lib/C118-single-signature-delivery-diagnostic.cjs"],
 ["'lib/C118-real-non-nft-signing-ui-v3.cjs'","'lib/C118-single-signature-delivery-diagnostic.cjs'"],
 ['proof.validityUi.signatures===12','proof.validityUi.signatures===1'],
 ["closing=true;if(context)await context.close();","if(stageMonitor)await stageMonitor.close();proof={...proof,diagnosticOnly:true,actualNonNftWalletStandardSigningAccepted:false,currentC109UnsignedInternalAccepted:false,fullNonNftPhaseAccepted:false,fullNonNftAuthorizationAccepted:false,parentTX01Complete:false,stageEvents,portEvents};closing=true;if(context)await context.close();"],
]);
const monitor=path.join(__dirname,'lib/C118-signature-delivery-stage-monitor.cjs'),q=require(monitor).qualify(process.env.HOME+'/.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C109-20261008-01');
const files=[__filename,monitor,path.join(logs,'20261008-C118-signature-delivery-diagnostic-design.md'),path.join(logs,'20261008-C118-non-nft-signing-ui-03.json'),...inverses.flatMap(x=>[x.old,x.new])];
const result={passed:true,observedAt:new Date().toISOString(),preparedOnly:true,completeSourceInverses:inverses,sourceMappedDiagnosticPoints:q.points,backgroundSha256:q.bundleSha256,mapSha256:q.mapSha256,actualBusinessAccepted:false,signatures:0,executeRequests:0,nftBusinessRequests:0,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(f)]))};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,inverses:inverses.length,points:q.points.length}));
