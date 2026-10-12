// Count real private signData entries without invoking, pausing or replacing a signer.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const dependency=path.resolve(__dirname,'../../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map');
const {SourceMapConsumer}=require(dependency);
const modules=['accounts/ImportedAccount','accounts/MnemonicAccount','accounts/zklogin/ZkLoginAccount'];

function conditionFor(key,module,token){
 assert(/^__C143(?:Signer|Fixture)Entries_[0-9a-f]+$/.test(key)&&modules.includes(module)&&typeof token==='string');
 return `(()=>{const state=globalThis[${JSON.stringify(key)}];if(!state||state.token!==${JSON.stringify(token)})throw new Error('Observation missing');state.counts[${JSON.stringify(module)}]++;return false;})()`;
}

function prepare(extension){
 const script=fs.readFileSync(path.join(extension,'background.js'),'utf8'),mapBytes=fs.readFileSync(path.join(extension,'background.js.map'));
 const consumer=new SourceMapConsumer(JSON.parse(mapBytes)),locations=[];
 for(const module of modules){
  const source=consumer.sources.find(value=>value.endsWith('/background/'+module+'.ts'));assert(source);
  const producer=consumer.sourceContentFor(source),file=path.resolve(__dirname,'../../src/background/'+module+'.ts');
  assert.equal(producer,fs.readFileSync(file,'utf8'));
  const definitions=Array.from(producer.matchAll(/async\s+signData\s*\([^)]*\)[^{]*\{/g));assert.equal(definitions.length,1);
  const body=definitions[0].index+definitions[0][0].length,offset=body+producer.slice(body).search(/\S/);
  const preceding=producer.slice(0,offset),line=preceding.split('\n').length,column=preceding.split('\n').at(-1).length;
  const firstLine=producer.split('\n')[line-1];assert(firstLine.trim().startsWith(module.includes('zklogin')?'throw new Error':'const keyPair = await'));
  const candidates=[];
  consumer.eachMapping(value=>{if(value.source===source&&value.originalLine===line)candidates.push(value);});
  assert(candidates.length>0);candidates.sort((a,b)=>a.generatedLine-b.generatedLine||a.generatedColumn-b.generatedColumn);
  const start=candidates[0],last=candidates.at(-1);
  locations.push({module,source,file,producerSha256:hash(producer),originalLine:line,originalColumn:column,
   start:{lineNumber:start.generatedLine-1,columnNumber:start.generatedColumn},
   end:{lineNumber:last.generatedLine-1,columnNumber:last.generatedColumn+1}});
 }
 return{script,consumer,locations,scriptSha256:hash(script),mapSha256:hash(mapBytes),dependencySha256:hash(fs.readFileSync(require.resolve(dependency)))};
}

async function observe(context,worker,extension){
 const source=prepare(extension),cdp=await context.browser().newBrowserCDPSession();
 const {targetInfos}=await cdp.send('Target.getTargets');const target=targetInfos.find(value=>value.type==='service_worker'&&value.url===worker.url());assert(target);
 const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});
 const key='__C143SignerEntries_'+crypto.randomUUID().replaceAll('-',''),token=crypto.randomUUID();
 const pending=new Map(),breakpoints=[],externalPauses=[],externalResumes=[];let next=0,scriptId,invalid=false,closed=false,resolveScript,externalBinding,activeExternalPause;
 const parsed=new Promise(resolve=>{resolveScript=resolve;});
 const command=(method,params={},allowInvalid=false)=>new Promise((resolve,reject)=>{
  if(invalid&&!allowInvalid){reject(new Error('Signer observation target was detached'));return;}
  const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Signer observation command deadline'));},30000);
  pending.set(id,{resolve,reject,timer});
  cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method,params})}).catch(error=>{
   clearTimeout(timer);pending.delete(id);reject(error);
  });
 });
 cdp.on('Target.detachedFromTarget',event=>{if(event.sessionId===sessionId)invalid=true;});
 cdp.on('Target.receivedMessageFromTarget',event=>{
  if(event.sessionId!==sessionId)return;const message=JSON.parse(event.message);
  if(message.method==='Debugger.scriptParsed'&&message.params.url===worker.url())resolveScript(message.params.scriptId);
  if(message.method==='Debugger.paused'){
   const event={reason:message.params.reason,hitBreakpoints:message.params.hitBreakpoints,location:message.params.callFrames?.[0]?.location};
   if(!activeExternalPause&&externalPauses.length===0&&require('./C154-owned-pause-protocol.cjs').authorizedPeerPause(externalBinding,event)){
    activeExternalPause=true;externalPauses.push({...event,observedAt:new Date().toISOString(),registeredOwnerOnlyResume:true});
   }else{invalid=true;command('Debugger.resume',{},true).catch(()=>{});}
  }
  if(message.method==='Debugger.resumed'&&activeExternalPause){externalResumes.push({observedAt:new Date().toISOString(),ownerResumeObserved:true});activeExternalPause=false;}
  if(message.id&&pending.has(message.id)){const item=pending.get(message.id);clearTimeout(item.timer);pending.delete(message.id);message.error?item.reject(new Error('Signer observation protocol error')):item.resolve(message.result);}
 });
 const evaluate=async expression=>{const result=await command('Runtime.evaluate',{expression,returnByValue:true});assert(!result.exceptionDetails);return result.result.value;};
 const same=async()=>{
  assert(!closed&&!invalid);const current=(await cdp.send('Target.getTargets')).targetInfos.find(value=>value.targetId===target.targetId);
  assert(current&&current.type===target.type&&current.url===target.url);
  const currentSource=await command('Debugger.getScriptSource',{scriptId});assert.equal(currentSource.scriptSource,source.script);
  assert.equal(hash(fs.readFileSync(path.join(extension,'background.js'))),source.scriptSha256);
  assert.equal(hash(fs.readFileSync(path.join(extension,'background.js.map'))),source.mapSha256);
 };
 const evidence={observedAt:new Date().toISOString(),targetId:target.targetId,workerUrl:worker.url(),
  workerSha256:source.scriptSha256,mapSha256:source.mapSha256,dependencySha256:source.dependencySha256,locations:[],
  methodsInvokedByObserver:0,sourceEdited:false,accountFunctionsReplaced:false,externalPauses,externalResumes,scope:'Actual three private method entry observation only; not full pending/cold/business acceptance.'};
 const allowExternalPause=async binding=>{
  await same();assert(!externalBinding&&externalPauses.length===0&&!activeExternalPause);
  assert.equal(binding.targetId,target.targetId);assert.equal(binding.workerUrl,worker.url());
  assert.equal(binding.sourceProof.workerSha256,source.scriptSha256);assert(binding.sourceProof.matchesDisk&&binding.sourceProof.receiverVerified);
  assert.equal(binding.sourceProof.module,'dapp-signing');assert.equal(binding.actualLocation.scriptId,scriptId);
  assert.equal(binding.actualLocation.lineNumber,binding.sourceProof.zeroBasedLine);assert.equal(binding.actualLocation.columnNumber,binding.sourceProof.zeroBasedColumn);
  const mapped=source.consumer.originalPositionFor({line:binding.actualLocation.lineNumber+1,column:binding.actualLocation.columnNumber});
  assert.equal(mapped.source,binding.sourceProof.originalLocation.source);assert.equal(mapped.line,binding.sourceProof.originalLocation.line);assert.equal(mapped.name,'signData');
  const producer=source.consumer.sourceContentFor(mapped.source);assert.equal(hash(producer),binding.sourceProof.producerSha256);assert.equal(producer,fs.readFileSync(path.resolve(__dirname,'../../src/background/dapp-signing.ts'),'utf8'));
  assert(typeof binding.breakpointId==='string'&&binding.breakpointId.length>0);
  externalBinding=structuredClone(binding);evidence.permittedExternalPauseOwner=structuredClone(binding);
 };
 let previous=Object.fromEntries(modules.map(module=>[module,0]));
 const snapshot=async label=>{
  await same();const value=await evaluate(`(()=>{const value=globalThis[${JSON.stringify(key)}];if(!value||value.token!==${JSON.stringify(token)})throw new Error('Observation missing');return {counts:{...value.counts},token:value.token};})()`);
  assert.equal(value.token,token);assert.deepEqual(Object.keys(value.counts).sort(),[...modules].sort());
  for(const module of modules){assert(Number.isSafeInteger(value.counts[module])&&value.counts[module]>=previous[module]);}
  previous={...value.counts};return{label,observedAt:new Date().toISOString(),targetId:target.targetId,sourceSha256:source.scriptSha256,counts:{...value.counts},observed:true};
 };
 const close=async()=>{
  if(closed)return;let restored=false;
  try{
   assert(!activeExternalPause);
   if(externalBinding)assert(externalPauses.length===1&&externalResumes.length===1);
   for(const entry of breakpoints)await command('Debugger.removeBreakpoint',{breakpointId:entry.breakpointId},true);
   if(!invalid)restored=await evaluate(`(()=>{const value=globalThis[${JSON.stringify(key)}];if(!value)return true;if(value.token!==${JSON.stringify(token)})return false;return delete globalThis[${JSON.stringify(key)}];})()`);
   await command('Debugger.disable',{},true);
  }finally{closed=true;await cdp.detach();}
  assert(restored&&!invalid);return{ownBreakpointsRemoved:breakpoints.length,ownMemoryStateRemoved:true,sourceEdited:false};
 };
 try{
  await command('Debugger.enable');let timer;
  try{scriptId=await Promise.race([parsed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Current signer script missing')),15000)})]);}finally{clearTimeout(timer);}
  await same();
  assert.equal(await evaluate(`(()=>{const key=${JSON.stringify(key)};if(Object.hasOwn(globalThis,key))return false;Object.defineProperty(globalThis,key,{value:Object.freeze({token:${JSON.stringify(token)},counts:Object.seal(${JSON.stringify(previous)})}),configurable:true,writable:false});return true;})()`),true);
  for(const point of source.locations){
   const available=await command('Debugger.getPossibleBreakpoints',{start:{scriptId,...point.start},end:{scriptId,...point.end},restrictToFunction:true});
   const candidates=available.locations.filter(location=>{
    const original=source.consumer.originalPositionFor({line:location.lineNumber+1,column:location.columnNumber});
    return original.source===point.source&&original.line===point.originalLine;
   });assert(candidates.length>0,'Actual private entry breakpoint missing');
   candidates.sort((a,b)=>a.lineNumber-b.lineNumber||a.columnNumber-b.columnNumber);const location=candidates[0];
   const condition=conditionFor(key,point.module,token);
   const result=await command('Debugger.setBreakpoint',{location:{scriptId,lineNumber:location.lineNumber,columnNumber:location.columnNumber},condition});
   assert.deepEqual(result.actualLocation,{scriptId,lineNumber:location.lineNumber,columnNumber:location.columnNumber});
   breakpoints.push(result);evidence.locations.push({...point,actualLocation:result.actualLocation,breakpointId:result.breakpointId,conditionSha256:hash(condition)});
  }
  const initial=await snapshot('all actual private entry observers installed');assert(Object.values(initial.counts).every(value=>value===0));
  evidence.initial=initial;return{evidence,snapshot,close,allowExternalPause};
 }catch(error){await close().catch(()=>{});throw error;}
}

module.exports={prepare,observe,modules,conditionFor};
