const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
module.exports=async({context,demo,extensionPage,command,key,setStage})=>{
 const snapshot=async()=>{await demo.getByRole('button',{name:'Inspect wallet network',exact:true}).click();return JSON.parse(await demo.getByTestId('wallet-network').innerText());};
 const approvals=()=>extensionPage.evaluate(async()=>Object.keys((await chrome.storage.local.get('transactions')).transactions??{}));
 const switchTo=env=>command('@setNetwork',{env,customRpcUrl:null});
 const checks=[];
 try{
  assert.deepEqual((await snapshot()).accounts,[{address:key.toRtdAddress(),chains:['rtd:localnet']}]);
  for(const action of ['sign','execute','message']){
   setStage(`network switch cancels pending ${action}`);
   const opening=context.waitForEvent('page',{timeout:20000});opening.catch(()=>{});
   await demo.getByRole('button',{name:action === 'message' ? 'Sign message' : `Start cancellable ${action}`,exact:true}).click();
   const popup=await opening;await popup.waitForURL(/#\/dapp\/approve\//);
   await expect.poll(approvals).toHaveLength(1);
   setStage(`${action}: set devNet`);
   assert.equal((await switchTo('devNet')).type,'done');
   setStage(`${action}: popup closes after switch`);
   await expect.poll(()=>popup.isClosed()).toBe(true);
   setStage(`${action}: approval record removed`);
   await expect.poll(approvals).toHaveLength(0);
   setStage(`${action}: request rejected`);
   await expect(demo.getByRole('alert')).toBeVisible();
   assert.equal(await demo.getByTestId('action-result').count(),0);
   setStage(`${action}: devNet account event`);
   await expect.poll(async()=>(await snapshot()).accounts?.[0]?.chains).toEqual(['rtd:devnet']);
   const changed=await snapshot();
   assert(changed.events.some(event=>event.accounts?.some(account=>account.chains.includes('rtd:devnet'))));
   await switchTo('local');
   await expect.poll(async()=>(await snapshot()).accounts?.[0]?.chains).toEqual(['rtd:localnet']);
   checks.push(`${action}: switch closes pending approval, clears record, rejects result; events and account chains follow devNet and Local`);
  }
  return {passed:true,checks,transactionApprovalClicks:0,scope:'temporary profile; devNet has no configured service, only local network state/event transition tested'};
 }finally{await switchTo('local');}
};
