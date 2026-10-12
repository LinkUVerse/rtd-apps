// Actual extension-origin browser request. Exact dev leaf SPKI exception, disposable profile.
const {chromium}=require('@playwright/test');
const {readFileSync,writeFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const [certificate,output,graphqlCertificate]=process.argv.slice(2);
 const pub=execFileSync('openssl',['x509','-in',certificate,'-pubkey','-noout']);
 const der=execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub});
 const pin=createHash('sha256').update(der).digest('base64');
 const pins=[pin];
 if(graphqlCertificate){const pub=execFileSync('openssl',['x509','-in',graphqlCertificate,'-pubkey','-noout']);pins.push(createHash('sha256').update(execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub})).digest('base64'));}
 const extension=path.resolve(__dirname,'../dist');
 const context=await chromium.launchPersistentContext('',{headless:process.env.WALLET_PROFILE_HEADED!=='1',executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,`--ignore-certificate-errors-spki-list=${pins.join(",")}`]});
 try{
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const id=new URL(worker.url()).host;assert.equal(id,'iabmfhchcocfljednlcpgnijajedhecc');
 const page=await context.newPage();await page.goto(`chrome-extension://${id}/ui.html`,{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{
  const response=await fetch('https://127.0.0.1:39603/archive/rtd.rpc.v2.LedgerService/GetServiceInfo',{method:'POST',headers:{'content-type':'application/grpc-web+proto','x-grpc-web':'1'},body:new Uint8Array(5)});
  return {status:response.status,bytes:[...new Uint8Array(await response.arrayBuffer())],type:response.headers.get('content-type')};
 });
 assert.equal(result.status,200);const bytes=Buffer.from(result.bytes);assert.equal(bytes[0],0);const size=bytes.readUInt32BE(1);
 const {GrpcTypes}=await import(path.resolve(__dirname,'../../../rtd-ts-sdk/packages/typescript/dist/grpc/index.mjs'));
 const info=GrpcTypes.GetServiceInfoResponse.fromBinary(bytes.subarray(5,5+size));
 assert.equal(info.chainId,'3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj');
 assert.match(bytes.subarray(5+size+5).toString(),/^grpc-status:\s*0\r?$/im);
 const extra=graphqlCertificate?await page.evaluate(async()=>{
  const results={};
  for(const [name,url,init] of [
   ['graphql','https://127.0.0.1:39600/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'{ checkpoint(sequenceNumber: 0) { digest } }'})}],
   ['fullnode','http://127.0.0.1:39400/rtd.rpc.v2.LedgerService/GetServiceInfo',{method:'POST',headers:{'content-type':'application/grpc-web+proto','x-grpc-web':'1'},body:new Uint8Array(5)}]
  ]){try{const r=await fetch(url,init);results[name]={status:r.status,bytes:[...new Uint8Array(await r.arrayBuffer())]};}catch(e){results[name]={error:String(e)}}}
  return results;
 }):undefined;
 if(extra){
  assert.equal(extra.graphql.status,200);assert.equal(JSON.parse(Buffer.from(extra.graphql.bytes).toString()).data.checkpoint.digest,info.chainId);
  assert.equal(extra.fullnode.status,200);const f=Buffer.from(extra.fullnode.bytes);assert.equal(f[0],0);assert.equal(GrpcTypes.GetServiceInfoResponse.fromBinary(f.subarray(5,5+f.readUInt32BE(1))).chainId,info.chainId);
 }
 let permission;
 if(process.env.WALLET_PROFILE_PROBE==='1'){
  await page.evaluate(()=>{const button=document.createElement('button');button.id='probe-permission';button.textContent='Authorize isolated dev probe';button.onclick=()=>{chrome.permissions.request({origins:['http://127.0.0.1/*','https://127.0.0.1/*']}).then(value=>globalThis.probePermission={granted:value},error=>globalThis.probePermission={error:String(error)});};document.body.append(button);});
  await page.locator('#probe-permission').click();
  try{await page.waitForFunction(()=>globalThis.probePermission,{},{timeout:55000});permission=await page.evaluate(()=>globalThis.probePermission);}catch{permission={pending:true};}
 }
 let review;
 if(permission?.granted){
  review=await page.evaluate(async()=>{
   const send=(method,args)=>new Promise((resolve,reject)=>{const port=chrome.runtime.connect({name:'rtd_ui<->background'});const id=crypto.randomUUID();const timer=setTimeout(()=>{port.disconnect();reject(new Error('profile command timed out'))},20000);port.onMessage.addListener(message=>{if(message.id===id){clearTimeout(timer);port.disconnect();resolve(message.payload)}});port.postMessage({id,payload:{type:'method-payload',method,args}})});
   const profile={schemaVersion:2,id:'certified-wallet-dev',displayName:'认证开发链',sdkNetwork:'localnet',walletStandardChain:'rtd:localnet',generation:'dev-20261003-01',revision:1,expectedGenesisDigest:'3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj',endpoints:{fullnodeGrpcWeb:'http://127.0.0.1:39400',graphqlUrl:'https://127.0.0.1:39600/graphql',archiveGrpcWeb:'https://127.0.0.1:39603/archive'},packages:{}};
   const prepared=await send('prepareCustomProfile',{profile});
   if(prepared.method!=='prepareCustomProfileResponse')return {prepared};
   const confirmed=await send('confirmCustomProfile',{token:prepared.args.result.token});
   const saved=await send('getSavedCustomProfile',{});
   return {verifiedRoles:prepared.args.result.verifiedRoles,confirmed,saved};
  });
  assert.deepEqual(review.verifiedRoles,['fullnode','graphql','archive']);assert.equal(review.saved.args.result.expectedGenesisDigest,info.chainId);
 }
 const record={review,permission,extra,browser:context.browser().version(),extensionOrigin:`chrome-extension://${id}`,chainId:info.chainId,height:String(info.checkpointHeight),status:result.status,devLeafSpki:pin,scope:'Actual extension-page CORS and gRPC-Web read with exact dev leaf SPKI exception; no normal CA trust or wallet profile/transaction acceptance'};
 writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,extra:extra?{graphqlStatus:extra.graphql.status,fullnodeStatus:extra.fullnode.status}:undefined},null,2));
 if(process.env.WALLET_PROFILE_PROBE==='1'&&!review?.verifiedRoles)process.exitCode=2;
 }finally{await context.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
