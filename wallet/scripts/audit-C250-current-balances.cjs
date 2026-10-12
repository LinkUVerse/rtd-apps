// Independent saved ordinary Chrome HAR/UI audit. No browser runtime, signing or live network.
const fs=require('node:fs'),crypto=require('node:crypto'),a=require('node:assert/strict');
const {GrpcTypes}=require('rtd-typescript/grpc');
const {parse,Kind}=require('graphql');
const L='migrationToGRpcOrGraphQLDoc/workLog',inputs=[__filename],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const H0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const sender='0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c',recipient='0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc';
const expected={[sender]:'999869964544',[recipient]:'20000000'},type='0x'+'0'.repeat(63)+'2::rtd::RTD';
function read(name){const p=`${L}/${name}`;inputs.push(p);return JSON.parse(fs.readFileSync(p));}
function decode(raw,t,response){a(raw.length>=5&&raw[0]===0);const end=5+raw.readUInt32BE(1);a(end<=raw.length);if(response){a.equal(raw[end],128);a.equal(end+5+raw.readUInt32BE(end+1),raw.length);a.match(raw.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);}else a.equal(end,raw.length);return t.fromBinary(raw.subarray(5,end));}
const ui=read('20261011-C250-native-ui-01.json'),warm=read('20261011-C250-warm-reuse-native-ui-01.json');
const installed=read('20261011-C250-ordinary-bytecode-01.json');a(installed.passed&&installed.actualUiStaticBytesAccepted&&installed.actualWorkerStaticBytesAccepted);
for(const k of ['round1Ready','round2Ready','round3Ready','homeReturn','quickHome'])a.match(ui[k],/文本 999\.86/);
a.match(ui.sendReady,/available 999\.86/);for(const k of ['receiverReady','receiverReloaded'])a.match(ui[k],/文本 0\.02/);
a.match(warm.warmHome,/文本 999\.86/);
const captures=[];
for(const [name,body] of [['complete',read('20261011-C250-current-balances-complete-01.har')],['warm',read('20261011-C250-warm-reuse-01.har')]]){
 const entries=body.log.entries,counts={},infos=[],lists=[],singles=[],logical=[],exceptions=[];
 for(const [index,e]of entries.entries()){
  const url=new URL(e.request.url),method=url.pathname.split('/').pop(),start=Date.parse(e.startedDateTime),end=start+e.time;
  a.equal(url.hostname,'127.0.0.1');a.equal(e.request.method,'POST');a(!e.request.postData.text.includes('"jsonrpc"'));counts[method]=(counts[method]??0)+1;
  if(e.response.status===0){a.equal(method,'graphql');exceptions.push({index,at:e.startedDateTime,method,status:0,reason:'cancelled/incomplete; not success'});continue;}
  a.equal(e.response.status,200);
  if(method==='graphql'){
   a.equal(url.origin,'http://127.0.0.1:41957');const req=JSON.parse(e.request.postData.text),res=JSON.parse(e.response.content.text),op=parse(req.query).definitions[0];a.equal(op.kind,Kind.OPERATION_DEFINITION);a.equal(op.operation,'query');a(!res.errors?.length&&res.data);a(!/balances\s*\(/.test(req.query),'Home must not read indexed balances');
   a(['WalletSnapshotAdmission','WalletSnapshotPin','WalletSnapshotRead','WalletSnapshotRevalidate'].includes(op.name.value));
   const data=res.data,snapshot=data.walletHead??data.walletSnapshot;a(snapshot);a.equal(data.walletGenesis.digest,H0);
   for(const range of Object.values(data.serviceConfig))a(range.first.sequenceNumber<=snapshot.sequenceNumber&&range.last.sequenceNumber>=snapshot.sequenceNumber);
   const metadata=req.query.includes('field: "coinMetadata"');
   if(!metadata){a(req.query.includes('field: "dynamicField"'));a.equal(op.name.value,'WalletSnapshotAdmission');continue;}
   if(op.name.value!=='WalletSnapshotAdmission')a.equal(Number(/walletSnapshot: checkpoint\(sequenceNumber: (\d+)\)/.exec(req.query)[1]),snapshot.sequenceNumber);
   if(op.name.value==='WalletSnapshotRead'){a.equal(req.variables.type,type);a.equal(snapshot.query.coinMetadata.decimals,9);a.equal(snapshot.query.coinMetadata.symbol,'RTD');}
   logical.push({index,start,end,page:e.pageref,operation:op.name.value,checkpoint:snapshot.sequenceNumber,digest:snapshot.digest});continue;
  }
  a.equal(url.origin,'http://127.0.0.1:41750');a(['GetServiceInfo','ListBalances','GetBalance','ListOwnedObjects'].includes(method));
  const req=decode(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[method+'Request'],false);a.equal(e.response.content.encoding,'base64');const res=decode(Buffer.from(e.response.content.text,'base64'),GrpcTypes[method+'Response'],true);
  if(method==='GetServiceInfo'){a.equal(res.chainId,H0);a(res.checkpointHeight>=1977015n);infos.push({index,start,end,height:res.checkpointHeight,page:e.pageref});}
  if(method==='ListBalances'){
   a(Object.hasOwn(expected,req.owner));a.equal(req.pageSize,100);a.equal(req.pageToken,undefined);a.equal(res.nextPageToken,undefined);a.equal(res.balances.length,1);
   const b=res.balances[0];a.equal(b.coinType,type);a.equal(String(b.balance),expected[req.owner]);a.equal((b.coinBalance??0n)+(b.addressBalance??0n),b.balance);
   lists.push({index,start,end,page:e.pageref,owner:req.owner,balance:String(b.balance),coinBalance:String(b.coinBalance??0n),addressBalance:String(b.addressBalance??0n)});
  }
  if(method==='GetBalance'){a.equal(req.owner,sender);a.equal(req.coinType,type);a.equal(String(res.balance.balance),expected[sender]);singles.push({index,start,balance:String(res.balance.balance)});}
  if(method==='ListOwnedObjects'){a.equal(req.owner,sender);a.match(req.objectType,/::coin::Coin<.*::rtd::RTD>/);a.equal(res.nextPageToken,undefined);a(res.objects.length>0);}
 }
 for(const r of lists){const before=infos.filter(i=>i.page===r.page&&i.end<=r.start+2).at(-1),after=infos.find(i=>i.page===r.page&&i.start>=r.end-2);a(before&&after,'Need both native identity frames');a(after.height>=before.height);r.beforeInfoIndex=before.index;r.afterInfoIndex=after.index;}
 const cycles=[],partial=[];let pending=[];
 for(const row of logical){
  if(row.operation==='WalletSnapshotAdmission'){if(pending.length)partial.push(pending);pending=[row];continue;}
  if(!pending.length){partial.push([row]);continue;}
  pending.push(row);
  if(row.operation==='WalletSnapshotRevalidate'){
   a.deepEqual(pending.map(x=>x.operation),['WalletSnapshotAdmission','WalletSnapshotPin','WalletSnapshotRead','WalletSnapshotRevalidate']);a.equal(new Set(pending.map(x=>JSON.stringify([x.checkpoint,x.digest,x.page]))).size,1);
   for(let i=1;i<pending.length;i++)a(pending[i-1].end<=pending[i].start+2);
   cycles.push(pending);pending=[];
  }
 }if(pending.length)partial.push(pending);
 if(name==='complete'){
  a(lists.some(r=>r.owner===recipient));a(singles.length>0);a(cycles.length>0);
  const starts=[ui.round1StartedAt,ui.round2StartedAt,ui.round3StartedAt,ui.sendOpenedAt].map(Date.parse);
  for(let i=0;i<3;i++)a(lists.some(r=>r.owner===sender&&r.start>=starts[i]&&r.end<=starts[i+1]));
 }else{
  a.equal(lists.length,1);
  a.equal(lists.filter(r=>r.start>=Date.parse(warm.warmStartAt)&&r.start<=Date.parse(warm.warmEndAt)).length,0);
  a(lists[0].end<=Date.parse(warm.warmStartAt));a(Date.parse(warm.warmEndAt)-lists[0].end<5000);
 }
 captures.push({name,requests:entries.length,counts,exceptions,lists,singles,completeMetadataCycles:cycles,partialMetadataCycles:partial,nativeFramesVerified:true,nameAdmissionsAreNotNameSuccess:true});
}
const result={passed:true,observedAt:new Date().toISOString(),scope:'Installed C250 ordinary Chrome current funds: three sender reloads, recipient reload/account switch, spend picker and actual fresh-window navigation reuse. All native frames audited; complete metadata cycles checked, cancelled/partial cycles and stale name admissions kept separate.',captures,expectedCurrentAtomic:expected,senderDisplay:'999.86 RTD',recipientDisplay:'0.02 RTD',postWriteHomeAccepted:true,writeTransaction:'DsPidw8nXD3VhpLjWqqz6veYZsKEP6cfqJGTs4yqnHqg',writeEvidence:'20261011-C249-execution-audit-02.json',warmWindowMs:Date.parse(warm.warmEndAt)-Date.parse(warm.warmStartAt),warmAdditionalListBalances:0,executionRequests:0,parentCompletion:false,inputsSha256:Object.fromEntries(inputs.map(p=>[p,sha(fs.readFileSync(p))]))};
fs.writeFileSync(`${L}/20261011-C250-browser-balances-audit-01.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,captures:captures.map(c=>({name:c.name,requests:c.requests,counts:c.counts,cancelled:c.exceptions.length,completeMetadataCycles:c.completeMetadataCycles.length})),warmAdditionalListBalances:0,postWriteHomeAccepted:true}));
