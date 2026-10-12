const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
module.exports=async({context,demo,extensionPage,command,accountId,createTestAccount,key,setStage})=>{
 setStage('create isolated second test account');
 const second=await createTestAccount();
 const select=id=>command('switchAccount',{accountID:id});
 const approvals=()=>extensionPage.evaluate(async()=>Object.keys((await chrome.storage.local.get('transactions')).transactions??{}));
 const snapshot=async()=>{await demo.getByRole('button',{name:'Inspect wallet authorization',exact:true}).click();return JSON.parse(await demo.getByTestId('wallet-authorization').innerText());};
 const checks=[];
 try{
  assert.equal((await select(accountId)).type,'done');
  for(const action of ['sign','execute','message']){
   setStage(`account switch cancels ${action} approval`);
   const opening=context.waitForEvent('page',{timeout:20000});opening.catch(()=>{});
   await demo.getByRole('button',{name:action==='message'?'Sign message':`Start cancellable ${action}`,exact:true}).click();
   const popup=await opening;await popup.waitForURL(/#\/dapp\/approve\//);
   await expect.poll(approvals).toHaveLength(1);
   assert.equal((await select(second.id)).type,'done');
   await expect.poll(()=>popup.isClosed()).toBe(true);
   await expect.poll(approvals).toHaveLength(0);
   await expect(demo.getByRole('alert')).toBeVisible();
   assert.equal(await demo.getByTestId('action-result').count(),0);
   assert.deepEqual(await snapshot(),[key.toRtdAddress()]);
   assert.equal((await select(accountId)).type,'done');
   checks.push(`${action}: switching active account closes approval, removes request and rejects result; no implicit permission for second account`);
  }
  setStage('second account cannot sign using first account permission');
  let popups=0;const count=()=>popups++;context.on('page',count);
  try{
   const response=await demo.evaluate(address=>new Promise((resolve,reject)=>{
    const id=crypto.randomUUID();const timer=setTimeout(()=>reject(new Error('bridge timeout')),10000);
    const listener=event=>{if(event.source===window&&event.data?.target==='rtd_in-page'&&event.data.payload?.id===id){clearTimeout(timer);window.removeEventListener('message',listener);resolve(event.data.payload.payload);}};
    window.addEventListener('message',listener);window.postMessage({target:'rtd_content-script',payload:{id,payload:{type:'sign-message-request',args:{accountAddress:address,message:btoa('Test message'),chain:'rtd:localnet'}}}});
   }),second.address);
   assert.equal(response.error,true);assert.match(response.message,/required permissions/);assert.equal(popups,0);
  }finally{context.off('page',count);}
  return {passed:true,checks,secondAccountPermissionRejected:true,transactionApprovalClicks:0};
 }finally{
  await select(accountId);
  assert.equal((await command('removeAccount',{accountID:second.id})).type,'done');
 }
};
