// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Hold delivery of a real account signing result; never export key material or the signature.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');

module.exports=async(context,worker,action,accountId,extension)=>{
 const cdp=await context.browser().newBrowserCDPSession(),pending=new Map();let sequence=0,scriptId,paused,resolvePause,pauseTimer,breakpointId,operation='attach';
 const parsed=new Promise(resolve=>{scriptId=resolve});
 const {targetInfos}=await cdp.send('Target.getTargets');const target=targetInfos.find(t=>t.type==='service_worker'&&t.url===worker.url());assert(target);
 const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});
 const command=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Worker debugger ${method} timed out`));},method==='Debugger.getScriptSource'?30000:10000);
  pending.set(id,{resolve,reject,timer});cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method,params})}).catch(reject);
 });
 cdp.on('Target.receivedMessageFromTarget',event=>{
  if(event.sessionId!==sessionId)return;const message=JSON.parse(event.message);
  if(message.method==='Debugger.scriptParsed'&&message.params.url===worker.url())scriptId(message.params.scriptId);
  if(message.method==='Debugger.paused'){paused=message.params;resolvePause?.(paused);}
  if(message.method==='Debugger.resumed')paused=undefined;
  if(message.id&&pending.has(message.id)){const p=pending.get(message.id);clearTimeout(p.timer);pending.delete(message.id);message.error?p.reject(new Error(message.error.message)):p.resolve(message.result);}
 });
 try{
  operation='enable';await command('Debugger.enable');
  operation='find-main-script';
  const id=await Promise.race([parsed,new Promise((_,reject)=>{pauseTimer=setTimeout(()=>reject(new Error('Current worker script absent')),10000)})]);clearTimeout(pauseTimer);
  operation='verify-main-script';const {scriptSource}=await command('Debugger.getScriptSource',{scriptId:id}),disk=fs.readFileSync(path.join(extension,'background.js'),'utf8');assert.equal(scriptSource,disk);
  const moduleName=action==='sign'?'dapp-signing':'dapp-execution',mapFile=path.join(extension,'background.js.map'),mapBytes=fs.readFileSync(mapFile),map=JSON.parse(mapBytes),dependency=path.resolve(__dirname,'../../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map'),{SourceMapConsumer}=require(dependency),consumer=new SourceMapConsumer(map),mapSource=consumer.sources.find(s=>s.endsWith('/background/'+moduleName+'.ts'));assert(mapSource,'Exact producer map source required');
  const producer=consumer.sourceContentFor(mapSource),sourceFile=path.resolve(__dirname,'../../src/background/'+moduleName+'.ts');assert.equal(producer,fs.readFileSync(sourceFile,'utf8'));const offset=producer.indexOf('account.signData(');assert(offset>=0&&producer.indexOf('account.signData(',offset+1)===-1);
  const before=producer.slice(0,offset),originalLocation={source:mapSource,line:before.split('\n').length,column:before.split('\n').at(-1).length},mapped=consumer.generatedPositionFor(originalLocation);assert(mapped.line&&Number.isInteger(mapped.column));const mappedBack=consumer.originalPositionFor(mapped);assert.equal(mappedBack.source,mapSource);assert.equal(mappedBack.line,originalLocation.line);assert.equal(mappedBack.column,originalLocation.column);assert.equal(mappedBack.name,'account');
  const lineNumber=mapped.line-1,receiverColumn=mapped.column,lineText=scriptSource.split('\n')[lineNumber],receiver=/^([A-Za-z_$][\w$]*)\.signData\(/.exec(lineText.slice(receiverColumn));assert(receiver,'Generated leaf must be the verified account.signData call');const receiverName=receiver[1],columnNumber=receiverColumn+receiverName.length+1,propertySource=consumer.originalPositionFor({line:mapped.line,column:columnNumber});assert.equal(propertySource.source,mapSource);assert.equal(propertySource.line,originalLocation.line);assert.equal(propertySource.name,'signData');
  operation='set-actual-signing-breakpoint';const result=await command('Debugger.setBreakpoint',{location:{scriptId:id,lineNumber,columnNumber}});breakpointId=result.breakpointId;assert.equal(result.actualLocation.lineNumber,lineNumber);assert.equal(result.actualLocation.columnNumber,columnNumber);
  return {
   sourceProof:{workerSha256:crypto.createHash('sha256').update(scriptSource).digest('hex'),matchesDisk:true,module:moduleName,zeroBasedLine:lineNumber,zeroBasedColumn:columnNumber,receiverColumn,mapSha256:crypto.createHash('sha256').update(mapBytes).digest('hex'),producerSha256:crypto.createHash('sha256').update(producer).digest('hex'),originalLocation,receiverVerified:true,dependencySha256:crypto.createHash('sha256').update(fs.readFileSync(require.resolve(dependency))).digest('hex')},
   wait:()=>new Promise((resolve,reject)=>{if(paused)return resolve(paused);resolvePause=resolve;pauseTimer=setTimeout(()=>reject(new Error('Actual signing call did not pause')),60000)}),
   install:async pause=>{
    clearTimeout(pauseTimer);assert(pause.hitBreakpoints.includes(breakpointId));
    // Nothing from the call frame is returned apart from a boolean. The real account stays private.
    const expression=`((account)=>{
      if(account.id!==${JSON.stringify(accountId)})throw new Error('Different signing account');
      const own=Object.prototype.hasOwnProperty.call(account,'signData'),original=account.signData,originalFetch=globalThis.fetch;
      let release;const hold=new Promise(resolve=>{release=resolve});
      const state=globalThis.__signReturnHold={invoked:0,responseReady:false,signaturePresent:false,released:false,dispatches:0,restored:false};
      globalThis.__releaseSignReturnHold=()=>{state.released=true;release();};
      globalThis.__restoreSignReturnHold=()=>{if(own)account.signData=original;else delete account.signData;globalThis.fetch=originalFetch;state.restored=account.signData===original&&globalThis.fetch===originalFetch;delete globalThis.__releaseSignReturnHold;delete globalThis.__restoreSignReturnHold;};
      globalThis.fetch=async(input,init)=>{const url=input instanceof Request?input.url:String(input);if(/\\/ExecuteTransaction(?:$|\\?)/.test(url)){state.dispatches++;throw new Error('Signature waiting probe forbids dispatch');}return originalFetch(input,init);};
      account.signData=async function(intent){
        state.invoked++;if(!(intent instanceof Uint8Array)||intent.length<=3||intent[0]!==0||intent[1]!==0||intent[2]!==0)throw new Error('Not actual TransactionData intent');
        const signed=await original.call(this,intent);state.signaturePresent=typeof signed==='string'&&signed.length>0;
        state.intentBytesSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',intent.subarray(3)))).map(x=>x.toString(16).padStart(2,'0')).join('');
        state.responseReady=true;await hold;return signed;
      };
      return true;
    })(${receiverName})`;
    const result=await command('Debugger.evaluateOnCallFrame',{callFrameId:pause.callFrames[0].callFrameId,expression,returnByValue:true});assert(!result.exceptionDetails&&result.result.value===true);
    await command('Debugger.removeBreakpoint',{breakpointId});breakpointId=undefined;await command('Debugger.resume');
   },
   close:async()=>{
    clearTimeout(pauseTimer);
    if(breakpointId)await command('Debugger.removeBreakpoint',{breakpointId}).catch(()=>{});
    if(paused)await command('Debugger.resume').catch(()=>{});
    await command('Debugger.disable').catch(()=>{});await cdp.detach();
   },
  };
 }catch(error){
  console.error(JSON.stringify({signHoldDebuggerSetupFailed:true,operation,errorType:error.name,messageFirstLine:String(error.message).split('\n')[0].slice(0,160)}));
  clearTimeout(pauseTimer);if(breakpointId)await command('Debugger.removeBreakpoint',{breakpointId}).catch(()=>{});if(paused)await command('Debugger.resume').catch(()=>{});await command('Debugger.disable').catch(()=>{});await cdp.detach();throw error;
 }
};
