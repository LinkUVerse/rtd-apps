// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Read only actual loaded static scripts. No DOM/runtime evaluation, input,
// account storage, network permission, navigation, debugger pause or signing.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
assert.equal(typeof WebSocket,'function');
const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const startedFile=path.join(logs,'20261010-C207-installed-ordinary-browser-binding-01.json');
const started=JSON.parse(fs.readFileSync(startedFile));assert(started.passed&&started.ordinaryChromeVersion==='154.0.8037.98');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const held=()=>{for(const [f,h]of Object.entries(started.inputsSha256))assert.equal(sha(f),h);assert.equal(cp.execFileSync('ps',['-p',String(started.browserPid),'-o','lstart='],{encoding:'utf8'}).trim(),started.browserBirth);assert.equal(hash(cp.execFileSync('ps',['-ww','-p',String(started.browserPid),'-o','command='],{encoding:'utf8'}).trim()),started.commandSha256);};
const allowed=new Set(['Debugger.enable','Debugger.getScriptSource','Debugger.disable']);
const targets=[],scripts=[];let result;
async function inspect(target){
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Readonly debugger connection timeout')),15000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Readonly debugger connection failed'));},{once:true});});
 let sequence=0;const pending=new Map(),parsed=[];
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Debugger.scriptParsed')parsed.push(m.params);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}});
 const send=(method,params={})=>{assert(allowed.has(method));return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Readonly debugger response timeout'));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});};
 try{
  await send('Debugger.enable');
  const seen=new Set();
  for(const event of parsed){
   if(!event.url.startsWith(started.expectedOrigin+'/'))continue;
   const u=new URL(event.url),name=u.pathname.slice(1);if(!/^[A-Za-z0-9._-]+\.js$/.test(name))continue;
   if(seen.has(name))continue;seen.add(name);
   const file=path.join(started.extensionOutput,name);assert(started.inputsSha256[file]);
   const source=await send('Debugger.getScriptSource',{scriptId:event.scriptId});
   const actual=Buffer.from(source.scriptSource,'utf8');assert.equal(hash(actual),sha(file));assert.equal(actual.length,fs.statSync(file).size);
   scripts.push({targetType:target.type,targetUrl:target.url,url:event.url,artifact:file,bytes:actual.length,sha256:hash(actual)});
  }
  await send('Debugger.disable');
 }finally{ws.close();for(const p of pending.values())clearTimeout(p.timer);}
}
(async()=>{try{
 held();const version=await(await fetch('http://127.0.0.1:41996/json/version')).json();assert.equal(version.Browser,'Chrome/'+started.ordinaryChromeVersion);
 const inventory=await(await fetch('http://127.0.0.1:41996/json/list')).json();
 const own=inventory.filter(t=>t.url.startsWith(started.expectedOrigin+'/')&&['page','service_worker'].includes(t.type));assert(own.some(t=>t.type==='page'));
 for(const t of own){targets.push({type:t.type,url:t.url});await inspect(t);}
 const ui=new Set(scripts.filter(s=>s.targetType==='page').map(s=>path.basename(s.artifact)));
 assert(['ui.js','503.js','957.js'].every(name=>ui.has(name)));
 const worker=scripts.some(s=>s.targetType==='service_worker'&&path.basename(s.artifact)==='background.js');
 held();result={passed:true,observedAt:new Date().toISOString(),ordinaryChromeVersion:started.ordinaryChromeVersion,origin:started.expectedOrigin,targets,scripts,actualUiStaticBytesAccepted:true,actualWorkerStaticBytesAccepted:worker,completeInstalledBytecodeAccepted:worker,allowedProtocolMethods:[...allowed],runtimeOrDomEvaluations:0,uiActions:0,accountOrCredentialReads:0,permissionsChanged:0,signatures:0,executeRequests:0,sourcePins:{[__filename]:sha(__filename),[startedFile]:sha(startedFile)},scope:'Actual owned ordinary-Chrome loaded static UI script source hashes versus reviewed exact build files. Optional live worker inspected only if already present; absent worker is not accepted. Readonly Debugger enable/getScriptSource/disable only, no pause, Runtime/DOM evaluation, browser input/navigation, account storage, credential inspection, application-network invocation or privilege change.'};
 }catch(e){result={passed:false,observedAt:new Date().toISOString(),errorType:e.name,message:String(e.message).slice(0,1000),targets,scripts};process.exitCode=1;}
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,actualUiStaticBytesAccepted:result.actualUiStaticBytesAccepted,actualWorkerStaticBytesAccepted:result.actualWorkerStaticBytesAccepted,message:result.message}));
})();
