// Diagnostic logpoints only. No variable, approval, response or product source mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const markers=[
 ['src/background/dapp-signing.ts','const args = Object.freeze','sign-enter'],
 ['src/background/dapp-signing.ts','const simulation = await','final-simulation-start'],
 ['src/background/dapp-signing.ts','const claim = await','egress-capture-start'],
 ['src/background/dapp-signing.ts','const signature = await','signature-start'],
 ['src/background/dapp-signing.ts','transactions.sealDappEgress','signature-produced-authorized'],
 ['src/background/dapp-signing.ts','await new WalletExecutionReader','native-verification-start'],
 ['src/background/dapp-signing.ts','await moveAuthorization.authorize();\n          return','native-verification-returned'],
 ['src/background/dapp-signing.ts','return moveAuthorization.runFinal','final-authorization-returned'],
 ['src/background/connections/UiConnection.ts','const result = await signDappPrepared','ui-command-sign-start'],
 ['src/background/connections/UiConnection.ts','this.send(\n          createMessage<MethodPayload<"signDappPreparedResponse">>','ui-command-sign-result'],
 ['src/background/Transactions.ts','await getDappEgressBroker().publish','egress-publish-start'],
 ['src/background/dapp-egress-peer.ts','this.#claims.delete(claim);','broker-publish-enter'],
];
function qualify(extension){
 const source=fs.readFileSync(path.join(extension,'background.js'),'utf8'),raw=fs.readFileSync(path.join(extension,'background.js.map')),
 map=JSON.parse(raw),{SourceMapConsumer}=require(path.resolve(__dirname,'../../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map')),
 consumer=new SourceMapConsumer(map),wallet=path.resolve(__dirname,'../..'),points=[];
 for(const[file,needle,label]of markers){const text=fs.readFileSync(path.join(wallet,file),'utf8'),index=map.sources.findIndex(s=>s.endsWith('/'+file.slice(4)));
  assert(index>=0,file);assert.equal(map.sourcesContent[index],text);assert.equal(text.split(needle).length-1,1,label);
  const before=text.slice(0,text.indexOf(needle)),original={source:consumer.sources[index],line:before.split('\n').length,column:before.split('\n').at(-1).length};
  const generated=consumer.generatedPositionFor({...original,bias:SourceMapConsumer.LEAST_UPPER_BOUND}),reverse=consumer.originalPositionFor(generated);
  assert.equal(reverse.source,original.source,label);assert.equal(reverse.line,original.line,label);assert(generated.line&&Number.isInteger(generated.column));
  points.push({label,file,sourceSha256:sha(text),original,generated,reverse});
 }
 return{loadedSource:source,bundleSha256:sha(source),mapSha256:sha(raw),points};
}
async function attach(context,worker,extension,events){
 const q=qualify(extension),cdp=await context.browser().newBrowserCDPSession(),pending=new Map();let id=0,sessionId,scriptResolve;
 const script=new Promise(r=>scriptResolve=r),breakpoints=[];
 cdp.on('Target.receivedMessageFromTarget',event=>{if(event.sessionId!==sessionId)return;const m=JSON.parse(event.message);
  if(m.method==='Debugger.scriptParsed'&&m.params.url===worker.url())scriptResolve(m.params.scriptId);
  if(m.method==='Runtime.consoleAPICalled'){for(const arg of m.params.args??[]){if(typeof arg.value==='string'&&arg.value.startsWith('__C118_STAGE__:'))events.push({at:new Date().toISOString(),nativeTimestamp:m.params.timestamp,stage:arg.value.slice(15)})}}
  if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}
 });
 const command=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error('Diagnostic CDP timeout: '+method))},30000);pending.set(n,{resolve,reject,timer});cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:n,method,params})}).catch(reject)});
 try{
  const targets=await cdp.send('Target.getTargets'),target=targets.targetInfos.find(t=>t.type==='service_worker'&&t.url===worker.url());assert(target);
  sessionId=(await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false})).sessionId;
  await command('Runtime.enable');await command('Debugger.enable');let timer;
  const scriptId=await Promise.race([script,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Worker diagnostic script absent')),10000))]);clearTimeout(timer);
  assert.equal((await command('Debugger.getScriptSource',{scriptId})).scriptSource,q.loadedSource);
  for(const p of q.points){const location={scriptId,lineNumber:p.generated.line-1,columnNumber:p.generated.column};
   const b=await command('Debugger.setBreakpoint',{location,condition:`(console.info(${JSON.stringify('__C118_STAGE__:'+p.label)}),false)`});breakpoints.push(b.breakpointId);
   const reverse=require(path.resolve(__dirname,'../../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map'));
   const mapped=new reverse.SourceMapConsumer(JSON.parse(fs.readFileSync(path.join(extension,'background.js.map')))).originalPositionFor({line:b.actualLocation.lineNumber+1,column:b.actualLocation.columnNumber});
   assert.equal(mapped.source,p.original.source,p.label);assert.equal(mapped.line,p.original.line,p.label);
   p.actualLocation={lineNumber:b.actualLocation.lineNumber,columnNumber:b.actualLocation.columnNumber};
  }
  const close=async()=>{for(const breakpointId of breakpoints)await command('Debugger.removeBreakpoint',{breakpointId}).catch(()=>{});await command('Debugger.disable').catch(()=>{});await cdp.detach();};
  return{evidence:{bundleSha256:q.bundleSha256,mapSha256:q.mapSha256,points:q.points,actualLoadedMatchesDisk:true,conditionAlwaysFalse:true,valuesModified:false},close};
 }catch(e){await command('Debugger.disable').catch(()=>{});await cdp.detach();throw e}
}
function observeUiPorts(){
 if(location.protocol!=='chrome-extension:'||!globalThis.chrome?.runtime?.connect)return;
 const original=chrome.runtime.connect.bind(chrome.runtime);
 chrome.runtime.connect=(...args)=>{const port=original(...args),tracked=new Map(),send=port.postMessage.bind(port);
  const report=row=>console.info('__C118_PORT__:'+JSON.stringify({...row,at:Date.now(),route:location.hash}));
  port.postMessage=message=>{const method=message?.payload?.method;if(['prepareDappTransaction','signDappPrepared'].includes(method)){tracked.set(message.id,method);report({direction:'request',id:message.id,method})}return send(message)};
  port.onMessage.addListener(message=>{if(!tracked.has(message?.id))return;const p=message.payload;report({direction:'response',id:message.id,requestMethod:tracked.get(message.id),method:p?.method,error:p?.error===true,message:p?.error===true?String(p.message).slice(0,1200):undefined,bytesLength:p?.args?.result?.bytes?.length,signatureLength:p?.args?.result?.signature?.length});});
  port.onDisconnect.addListener(()=>{for(const[id,method]of tracked)report({direction:'disconnect',id,method})});return port;
 };
}
module.exports={qualify,attach,observeUiPorts};
