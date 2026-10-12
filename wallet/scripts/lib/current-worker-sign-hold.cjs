// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Hold delivery of a real account signing result; never export key material or the signature.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');

module.exports=async(context,worker,action,accountId)=>{
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
  operation='verify-main-script';const {scriptSource}=await command('Debugger.getScriptSource',{scriptId:id}),disk=fs.readFileSync('dist/background.js','utf8');assert.equal(scriptSource,disk);
  const moduleName=action==='sign'?'dapp-signing':'dapp-execution',header=`/***/ "./background/${moduleName}.ts"\n`,start=scriptSource.indexOf(header);assert(start>=0,'Current bundle signing module absent');
  const end=scriptSource.indexOf('\n/***/ "',start+header.length);assert(end>start,'Current bundle module boundary absent');
  const needle='account.signData('; // Exact actual signing leaf inside the selected current producer module.
  const offset=scriptSource.indexOf(needle,start);assert(offset>=start&&offset<end,'Signing call must belong to the selected current module');
  const lineNumber=scriptSource.slice(0,offset).split('\n').length-1;
  operation='set-actual-signing-breakpoint';const result=await command('Debugger.setBreakpoint',{location:{scriptId:id,lineNumber}});breakpointId=result.breakpointId;assert.equal(result.actualLocation.lineNumber,lineNumber);
  return {
   sourceProof:{workerSha256:crypto.createHash('sha256').update(scriptSource).digest('hex'),matchesDisk:true,module:moduleName,zeroBasedLine:lineNumber},
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
    })(account)`;
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
