const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
async function inspect(context,worker,extension=path.resolve(__dirname,'../../dist')){
 const cdp=await context.browser().newBrowserCDPSession();
 try{
  const {targetInfos}=await cdp.send('Target.getTargets');const target=targetInfos.find(t=>t.type==='service_worker'&&t.url===worker.url());
  if(!target)throw new Error('worker target missing');
  const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});
  let id=0,resolveScript;const pending=new Map();const script=new Promise(resolve=>{resolveScript=resolve;});
  cdp.on('Target.receivedMessageFromTarget',event=>{
   if(event.sessionId!==sessionId)return;const m=JSON.parse(event.message);
   if(m.method==='Debugger.scriptParsed'&&m.params.url===worker.url())resolveScript(m.params.scriptId);
   if(m.id&&pending.has(m.id)){const item=pending.get(m.id);clearTimeout(item.timer);pending.delete(m.id);m.error?item.reject(new Error(m.error.message)):item.resolve(m.result);}
  });
  const command=(method,params={})=>new Promise((resolve,reject)=>{
   const request=++id;const timer=setTimeout(()=>{pending.delete(request);reject(new Error('worker debugger '+method+' command timeout'));},method==='Debugger.getScriptSource'?30000:10000);
   pending.set(request,{resolve,reject,timer});cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:request,method,params})}).catch(reject);
  });
  await command('Debugger.enable');
  let timer;const scriptId=await Promise.race([script,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('script lookup timeout')),10000);})]);clearTimeout(timer);
  const {scriptSource}=await command('Debugger.getScriptSource',{scriptId});
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');const disk=fs.readFileSync(path.join(extension,'background.js'),'utf8');
  const result={workerSha256:hash(scriptSource),diskSha256:hash(disk),matchesDisk:scriptSource===disk,workerHasCancellation:scriptSource.includes('cancel-transaction-request'),diskHasCancellation:disk.includes('cancel-transaction-request')};
  await command('Debugger.disable');return result;
 }finally{await cdp.detach();}
}
async function ensure(context,worker,extension=path.resolve(__dirname,'../../dist')){
 const before=await inspect(context,worker,extension);
 if(before.matchesDisk)return {worker,evidence:{before,reloaded:false}};
 const restarted=context.waitForEvent('serviceworker',{predicate:value=>value!==worker,timeout:20000});restarted.catch(()=>{});
 const uiUrl=new URL('ui.html?type=popup',worker.url()).href;
 await worker.evaluate(()=>{setTimeout(()=>chrome.runtime.reload(),0);});
 // A temporary wake surface must use the existing toolbar popup entry.
 // A full query page owns an NC5 observation and must not be closed before it settles.
 const wake=await context.newPage();
 let wakeRetries=0;
 const wakeDeadline=Date.now()+12000;
 for(;;){
  try { await wake.goto(uiUrl,{waitUntil:'domcontentloaded'}); break; }
  catch(error){
   if(/ERR_BLOCKED_BY_CLIENT/.test(error.message)&&Date.now()<wakeDeadline&&!wake.isClosed()){wakeRetries++;await new Promise(resolve=>setTimeout(resolve,250));continue;}
   if(!/ERR_ABORTED|closed/i.test(error.message))throw error;
   break;
  }
 }
 const current=await restarted;const after=await inspect(context,current,extension);
 await wake.close();
 if(!after.matchesDisk)throw new Error('reloaded worker still differs from current bundle');
 return {worker:current,evidence:{before,after,reloaded:true,wakeRetries,wakeSurface:'toolbar-popup'}};
}
module.exports={inspect,ensure};
