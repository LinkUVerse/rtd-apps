// Independently bind the current complete map and canonical six-route parameter fixtures.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {bcs}=require('rtd-typescript/bcs'),{Transaction}=require('rtd-typescript/transactions'),{toBase64}=require('rtd-typescript/utils');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pins=q=>{for(const[f,h]of Object.entries(q.inputsSha256))assert.equal(sha(f),h)};
function inverse(proof){pins(proof);let text=fs.readFileSync(proof.new,'utf8');assert.equal(sha(proof.old),proof.originalSha256);assert.equal(sha(proof.new),proof.candidateSha256);for(const d of [...proof.deltas].reverse()){assert.equal(text.split(d.toText).length-1,d.count);text=text.split(d.toText).join(d.fromText)}assert.equal(text,fs.readFileSync(proof.old,'utf8'))}
function canonical(encoded){const raw=Buffer.from(encoded,'base64');assert.equal(raw.toString('base64'),encoded);const value=bcs.TransactionData.parse(raw);assert.equal(toBase64(bcs.TransactionData.serialize(value).toBytes()),encoded);return value}
(async()=>{
 const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
 const qFile=path.join(logs,'20261008-C114-nft-parameter-tool-qualified-02.json'),q=read(qFile);
 const toolFile=path.join(logs,'20261008-C114-nft-parameter-tool-prepared-01.json'),jsonFile=path.join(logs,'20261008-C114-qualification-json-boundary-prepared-01.json');
 const oldFile=path.join(logs,'20261007-C48-nft-execution-browser-01.json'),old=read(oldFile);
 const names=['gasBudget','gasPrice','sender','sponsor','expirationNone','expiredEpoch','expirationLargeEpoch','unsupportedTimestamp'];
 const labels=['direct','framework-ordinary','framework-listed','personal','originbyte-existing-target','originbyte-new-target'];
 assert(q.passed&&q.preparedOnly&&q.checkCount===50&&q.historicalSixApprovalsCanonicalVariantsQualified===48);
 assert(q.cdpMockedOnly&&q.sponsorCoinSyntheticQualificationOnly&&!q.actualLoadedBrowserBreakpointAccepted&&!q.actualCurrentInternalNftFormsAccepted&&!q.actualSponsoredExecutionAccepted);
 for(const k of ['profilesOpened','networkRequests','signatures','executeRequests','newContainers','signals'])assert.equal(q[k],0);
 pins(q);inverse(read(toolFile));inverse(read(jsonFile));
 assert.equal(read(path.join(logs,'20261008-C114-nft-parameter-tool-qualified-01.json')).passed,false);
 assert.deepEqual(q.checks.slice(1,49).map(x=>x.name),labels.flatMap(label=>names.map(name=>label+'/'+name)));
 assert(q.checks.every(x=>x.passed));
 const environment=require('./lib/C113-current-nft-environment.cjs'),build=read(environment.buildFile),lineage=require('./lib/C109-product-source-lineage.cjs');
 assert.deepEqual(lineage.validate(read(lineage.qualificationFile).originalSource,environment.buildFile),q.source);environment.validateOrigin();
 const sourceFile=path.join(wallet,'src/shared/rpc/nft-transfer-preparation.ts'),source=fs.readFileSync(sourceFile,'utf8');
 const maps=fs.readdirSync(build.output).filter(f=>f.endsWith('.js.map')).map(file=>({file,map:read(path.join(build.output,file))})).filter(x=>x.map.sources.some(s=>s.endsWith('/shared/rpc/nft-transfer-preparation.ts')));
 assert.equal(maps.length,1);const selected=maps[0],mapFile=path.join(build.output,selected.file),bundleFile=mapFile.slice(0,-4);assert.equal(sha(bundleFile),build.artifacts[path.basename(bundleFile)]);
 const {SourceMapConsumer}=require(path.resolve(__dirname,'../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map'));
 const consumer=new SourceMapConsumer(selected.map),mapSource=consumer.sources.find(s=>s.endsWith('/shared/rpc/nft-transfer-preparation.ts'));assert.equal(consumer.sourceContentFor(mapSource),source);
 const locations={};
 for(const[name,needle,variable]of [['receiver','rpc.simulateTransaction(','rpc'],['prepared','prepared.bytesBase64,','prepared']]){
  const start=source.indexOf('export async function revalidateNftTransfer('),offset=source.indexOf(needle,start);assert(offset>=start);
  const prefix=source.slice(0,offset),original={source:mapSource,line:prefix.split('\n').length,column:prefix.split('\n').at(-1).length};
  const generated=consumer.generatedPositionFor(original),reverse=consumer.originalPositionFor(generated);assert.equal(reverse.name,variable);assert.equal(reverse.source,mapSource);assert.equal(reverse.line,original.line);assert.equal(reverse.column,original.column);
  locations[name]={original,generated,reverse};
 }
 const body=fs.readFileSync(bundleFile,'utf8').split('\n');assert(/^[A-Za-z_$][\w$]*\.simulateTransaction\(/.test(body[locations.receiver.generated.line-1].slice(locations.receiver.generated.column)));assert(/^[A-Za-z_$][\w$]*\.bytesBase64/.test(body[locations.prepared.generated.line-1].slice(locations.prepared.generated.column)));
 const oracleFile=path.join(logs,'20261008-C93-recovered-native-independent-01.json'),oracle=read(oracleFile);
 const options={otherSender:oracle.addresses.sponsor,sponsor:oracle.addresses.sponsor,sponsorCoin:{objectId:'0x'+'7'.repeat(64),version:'1',digest:old.previews[0].transaction.gasData.payment[0].digest}};
 const variants=require('./lib/C114-nft-parameter-variants.cjs');assert.deepEqual(variants.names,names);
 const abis=[];let total=0;
 for(const row of old.previews){
  const base=canonical(row.approval.prepared.bytesBase64),ptb=base.V1.kind.ProgrammableTransaction;
  assert.equal(await Transaction.from(row.approval.prepared.bytesBase64).getDigest(),row.approval.prepared.digest);
  const calls=ptb.commands.flatMap(c=>c.MoveCall?[c.MoveCall]:[]);
  const expected={direct:[],'framework-ordinary':['take'],'framework-listed':['take'],personal:['borrow_val','take','return_val'],'originbyte-existing-target':['p2p_transfer'],'originbyte-new-target':['p2p_transfer_and_create_target_kiosk']}[row.label];assert.deepEqual(calls.map(c=>c.function),expected);
  if(row.label.startsWith('originbyte')){const call=calls[0],argument=call.arguments[1];assert.equal(argument.$kind,'Input');const input=ptb.inputs[argument.Input];if(row.label==='originbyte-existing-target')assert(input.Object?.SharedObject);else assert.equal(input.Pure.bytes,bcs.Address.serialize(row.to).toBase64());abis.push({label:row.label,function:call.function,recipientInputKind:input.$kind})}
  for(const v of await variants.build(row.approval.prepared,options)){
   const expected=structuredClone(base),d=expected.V1;
   if(v.name==='gasBudget')d.gasData.budget=String(BigInt(d.gasData.budget)+1000n);
   else if(v.name==='gasPrice')d.gasData.price=String(BigInt(d.gasData.price)+1n);
   else if(v.name==='sender')d.sender=options.otherSender;
   else if(v.name==='sponsor'){d.gasData.owner=options.sponsor;d.gasData.payment=[options.sponsorCoin]}
   else if(v.name==='expirationNone')d.expiration={$kind:'None',None:true};
   else if(v.name==='expiredEpoch')d.expiration={$kind:'Epoch',Epoch:'0'};
   else if(v.name==='expirationLargeEpoch')d.expiration={$kind:'Epoch',Epoch:'9007199254740993'};
   else d.expiration[d.expiration.$kind].minTimestamp='1';
   const actual=canonical(v.bytesBase64);assert.equal(toBase64(bcs.TransactionData.serialize(expected).toBytes()),v.bytesBase64);assert.equal(await Transaction.from(v.bytesBase64).getDigest(),v.digest);assert.notEqual(v.digest,row.approval.prepared.digest);assert.deepEqual(actual.V1.kind,base.V1.kind);total++;
  }
 }
 assert.equal(total,48);assert.equal(abis.length,2);assert.deepEqual(old.previews.map(x=>x.label),labels);
 const files=[__filename,qFile,toolFile,jsonFile,oldFile,oracleFile,sourceFile,mapFile,bundleFile,environment.buildFile,require.resolve('./lib/C114-nft-parameter-variants.cjs')];
 const report={passed:true,observedAt:new Date().toISOString(),preparedOnly:true,source:q.source,wholeOriginalHelperAndQualifierInversesHeld:true,sourceChecks:50,independentlyCanonicalByteVariants:48,completeCurrentNftProducerAndBundleAndMapHeld:true,mappedProductionLocation:locations,originByteRecipientAbiForms:abis,frameworkOrdinaryAndListedAndPersonalCallsHeld:true,cdpMockedOnly:true,sponsorCoinSyntheticQualificationOnly:true,actualLoadedBrowserBreakpointAccepted:false,actualCurrentInternalNftFormsAccepted:false,actualSponsoredExecutionAccepted:false,profilesOpened:0,networkRequests:0,signatures:0,executeRequests:0,newContainers:0,signals:0,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(f)]))};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,canonicalVariants:48,sourceChecks:50,actualCurrentNftAccepted:false}));
})().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name,message:String(error.message).slice(0,600)}));process.exitCode=1});
