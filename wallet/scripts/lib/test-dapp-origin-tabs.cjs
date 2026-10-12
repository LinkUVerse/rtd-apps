const assert=require('node:assert/strict');
const http=require('node:http');
const {expect}=require('@playwright/test');
async function request(page,payload){
 return page.evaluate(payload=>new Promise((resolve,reject)=>{
  const id=crypto.randomUUID();
  const listener=event=>{if(event.source!==window||event.data?.target!=='rtd_in-page'||event.data.payload?.id!==id)return;clearTimeout(timer);window.removeEventListener('message',listener);resolve(event.data.payload.payload);};
  const timer=setTimeout(()=>{window.removeEventListener('message',listener);reject(new Error('bridge timeout'));},10000);
  window.addEventListener('message',listener);window.postMessage({target:'rtd_content-script',payload:{id,payload}});
 }),payload);
}
async function snapshot(page){await page.getByRole('button',{name:'Inspect wallet authorization',exact:true}).click();return JSON.parse(await page.getByTestId('wallet-authorization').innerText());}
module.exports=async({context,demo,extensionPage,server,key,setStage})=>{
 const origin=new URL(demo.url()).origin;
 const foreignServer=http.createServer(server.listeners('request')[0]);
 await new Promise(resolve=>foreignServer.listen(0,'127.0.0.1',resolve));
 const a=await context.newPage(),b=await context.newPage(),foreign=await context.newPage();
 const approvals=()=>extensionPage.evaluate(async()=> (await chrome.storage.local.get('transactions')).transactions??{});
 try{
  setStage('same-origin tabs restore authorization');
  for(const tab of [a,b]){
   await tab.goto(origin);await expect.poll(()=>snapshot(tab)).toContain(key.toRtdAddress());
   await tab.getByRole('button',{name:'Connect',exact:true}).click();await tab.getByTestId('accounts-list').waitFor();
  }
  setStage('different origin cannot borrow authorization');
  await foreign.goto(`http://127.0.0.1:${foreignServer.address().port}`);
  const denied=await request(foreign,{type:'get-account',origin});
  assert.equal(denied.error,true);assert.match(denied.message,/required permissions/);assert.deepEqual(await snapshot(foreign),[]);
  let unauthorizedPopups=0;const count=()=>{unauthorizedPopups++;};context.on('page',count);
  try{
   const signed=await request(foreign,{type:'sign-message-request',origin,args:{accountAddress:key.toRtdAddress(),message:Buffer.from('Test message').toString('base64'),chain:'rtd:localnet'}});
   assert.equal(signed.error,true);assert.match(signed.message,/required permissions/);assert.equal(unauthorizedPopups,0);
  }finally{context.off('page',count);}
  const disconnected=await request(foreign,{type:'disconnect-app',origin});assert.equal(disconnected.type,'done');
  assert.equal(await extensionPage.evaluate(async origin=>!!(await chrome.storage.local.get('permissions')).permissions?.[origin],origin),true);
  setStage('capture original port request');
  await a.evaluate(()=>window.addEventListener('message',event=>{if(event.source===window&&event.data?.target==='rtd_content-script'&&event.data.payload?.payload?.type==='sign-transaction-request')window.__ownRequest=event.data.payload.id;}));
  const first=context.waitForEvent('page',{timeout:20000});first.catch(()=>{});
  await a.getByRole('button',{name:'Start cancellable sign',exact:true}).click();const popupA=await first;
  await popupA.waitForURL(/#\/dapp\/approve\//);const approvalA=new URL(popupA.url()).hash.split('/').pop();
  await expect.poll(async()=>!!(await approvals())[approvalA]).toBe(true);
  const ownRequest=await a.evaluate(()=>window.__ownRequest);assert.equal(typeof ownRequest,'string');
  setStage('same-origin sibling cannot cancel another port');
  await b.evaluate(requestId=>window.postMessage({target:'rtd_content-script',payload:{id:crypto.randomUUID(),payload:{type:'cancel-transaction-request',requestId}}}),ownRequest);
  assert.equal((await request(b,{type:'get-network'})).type,'set-network');
  assert.equal(popupA.isClosed(),false);assert((await approvals())[approvalA]);
  setStage('sibling owns only its own approval cancellation');
  const second=context.waitForEvent('page',{timeout:20000});second.catch(()=>{});
  await b.getByRole('button',{name:'Start cancellable sign',exact:true}).click();const popupB=await second;
  await popupB.waitForURL(/#\/dapp\/approve\//);
  await expect.poll(async()=>Object.keys(await approvals()).length).toBe(2);
  await b.getByRole('button',{name:'Cancel transaction request',exact:true}).click();
  await expect.poll(()=>popupB.isClosed()).toBe(true);assert.equal(popupA.isClosed(),false);
  await expect.poll(async()=>Object.keys(await approvals())).toEqual([approvalA]);
  setStage('navigation disconnect closes original approval');
  await a.goto('about:blank');await expect.poll(()=>popupA.isClosed()).toBe(true);
  await expect.poll(async()=>Object.keys(await approvals()).length).toBe(0);
  return {passed:true,checks:['same-origin tabs restore prior account','foreign origin cannot read or sign with forged origin','foreign disconnect cannot revoke authorized origin','same-origin sibling cannot cancel another port request','own cancellation closes only own approval','navigation disconnect closes remaining approval'],transactionApprovalClicks:0};
 }finally{
  for(const tab of [a,b,foreign])await tab.close();
  foreignServer.closeAllConnections();await new Promise(resolve=>foreignServer.close(resolve));
 }
};
