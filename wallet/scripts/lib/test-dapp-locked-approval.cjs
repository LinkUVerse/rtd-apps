const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
module.exports=async({context,demo,extensionPage,command,accountId,unlockPopup,key,setStage})=>{
 const locked=async()=>{const response=await command('getStoredEntities',{type:'accounts'});return response.args.entities.find(account=>account.id===accountId).isLocked;};
 const approvals=()=>extensionPage.evaluate(async()=>Object.keys((await chrome.storage.local.get('transactions')).transactions??{}));
 const checks=[];
 for(const action of ['message','sign','execute']){
  setStage(`locked ${action}: lock before request`);
  assert.equal((await command('lockAccountSourceOrAccount',{id:accountId})).type,'done');assert.equal(await locked(),true);
  const opening=context.waitForEvent('page',{timeout:20000});opening.catch(()=>{});
  await demo.getByRole('button',{name:action==='message'?'Sign message':`Start cancellable ${action}`,exact:true}).click();
  const popup=await opening;await popup.waitForURL(/#\/dapp\/approve\//);
  setStage(`locked ${action}: unlock button`);
  await popup.getByRole('button',{name:/^(解锁后批准|Unlock to Approve|解锁账户|Unlock Account)$/}).click();
  setStage(`locked ${action}: password modal`);
  await unlockPopup(popup);
  await expect.poll(locked).toBe(false);
  assert.equal(popup.isClosed(),false);await expect.poll(approvals).toHaveLength(1);
  if(action==='message'){
   setStage('locked message: sign after actual UI unlock');
   await popup.getByRole('button',{name:/^(签名|Sign)$/}).click();
   await demo.getByTestId('action-result').waitFor();
   const signed=JSON.parse(await demo.getByTestId('action-result').innerText());
   const message=new TextEncoder().encode('Test message');
   assert.deepEqual(Buffer.from(signed.bytes,'base64'),Buffer.from(message));
   assert.equal(await key.getPublicKey().verifyPersonalMessage(message,signed.signature),true);
  }else{
   setStage(`locked ${action}: cancel without approving transaction`);
   await demo.getByRole('button',{name:'Cancel transaction request',exact:true}).click();
   await expect(demo.getByRole('alert')).toBeVisible();
  }
  await expect.poll(()=>popup.isClosed()).toBe(true);await expect.poll(approvals).toHaveLength(0);
  checks.push(`${action}: locked account unlocks in approval UI without losing request${action==='message'?'; subsequent message signature verifies':'; caller cancellation closes request without transaction approval'}`);
 }
 return {passed:true,checks,transactionApprovalClicks:0};
};
