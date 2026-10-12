// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
const {journal}=require('./test-dapp-execution.cjs');
module.exports=async({context,demo,extensionPage,command,accountId,unlockAccount,createTestAccount,key,setStage})=>{
 const worker=context.serviceWorkers()[0],before=await journal(extensionPage);assert.equal(before.length,0);
 const all=['sign:lock','execute:lock','sign:network','execute:network','sign:account','execute:account','sign:cancel','execute:cancel'];
 const selected=process.env.RTD_TEST_SIGN_HOLD_CASES?.split(',')??all;assert(selected.length>0&&new Set(selected).size===selected.length&&selected.every(c=>all.includes(c)));
 // Install before setting any breakpoint: even an instrumentation failure cannot submit.
 await worker.evaluate(()=>{
  const original=globalThis.fetch,state=globalThis.__signHoldSafety={dispatchAttempts:0,restored:false};
  globalThis.__restoreSignHoldSafety=()=>{globalThis.fetch=original;state.restored=globalThis.fetch===original;delete globalThis.__restoreSignHoldSafety;};
  globalThis.fetch=async(input,init)=>{
   const url=input instanceof Request?input.url:String(input);
   if(/\/ExecuteTransaction(?:$|\?)/.test(url)){state.dispatchAttempts++;throw new Error('Signing-return matrix never admits a dispatch');}
   return original(input,init);
  };
 });
 const cases=[];let second;
 const savedApprovals=()=>extensionPage.evaluate(async()=>Object.keys((await chrome.storage.local.get('transactions')).transactions??{}).length);
 try{
  for(const entry of selected){
   const [action,event]=entry.split(':');setStage(`actual signing result held ${entry}`);
   await demo.getByLabel('Cancellation stage').selectOption('approval');
   if(event==='account'&&!second)second=await createTestAccount();
   const debug=await require('./current-worker-sign-hold.cjs')(context,worker,action,accountId);
   let installed=false,clicked,popup,invalidated=false,phase='prepare';
   try{
    const opened=context.waitForEvent('page',{timeout:20000});opened.catch(()=>{});
    await demo.getByRole('button',{name:`Start cancellable ${action}`,exact:true}).click();popup=await opened;
    const approve=popup.getByRole('button',{name:/^(批准|Approve)$/});await expect(approve).toBeEnabled({timeout:60000});
    const previewDigest=(await popup.getByText(/^(交易摘要|Transaction digest):/).innerText()).split(':').pop().trim();
    phase='real-signing';const pause=debug.wait();clicked=approve.click();clicked.catch(()=>{});await debug.install(await pause);installed=true;await clicked;
    await expect.poll(()=>worker.evaluate(()=>globalThis.__signReturnHold.responseReady),{timeout:15000}).toBe(true);
    const held=await worker.evaluate(()=>globalThis.__signReturnHold);assert.equal(held.invoked,1);assert.equal(held.signaturePresent,true);assert.equal(held.released,false);assert.equal(held.dispatches,0);
    phase='invalidate';if(event==='lock')assert.equal((await command('lockAccountSourceOrAccount',{id:accountId})).type,'done');
    if(event==='network')assert.equal((await command('@setNetwork',{env:'devNet',customRpcUrl:null})).type,'done');
    if(event==='account')assert.equal((await command('switchAccount',{accountID:second.id})).type,'done');
    if(event==='cancel')await demo.getByRole('button',{name:'Cancel transaction request',exact:true}).click();
    invalidated=true;
    if(event==='network'||event==='account'||event==='cancel')await expect.poll(()=>popup.isClosed()).toBe(true);
    phase='release';await worker.evaluate(()=>globalThis.__releaseSignReturnHold());
    // An execution request may conservatively remain alive before dispatch; cancel that original request.
    phase='close-original-request';if(event==='lock'){
      // Sign-only reports its authorization error and closes itself. Clicking Cancel here
      // races that natural completion and can wait on a button which just became disabled.
      if(action==='execute')await demo.getByRole('button',{name:'Cancel transaction request',exact:true}).click();
      await expect.poll(()=>popup.isClosed(),{timeout:15000}).toBe(true);
    }
    phase='no-result-or-journal';await expect(demo.getByRole('alert')).toBeVisible();assert.equal(await demo.getByTestId('action-result').count(),0);
    await expect.poll(savedApprovals).toBe(0);assert.deepEqual(await journal(extensionPage),before);
    const final=await worker.evaluate(()=>globalThis.__signReturnHold);assert.equal(final.dispatches,0);assert.equal(final.released,true);
    await worker.evaluate(()=>globalThis.__restoreSignReturnHold());
    assert.equal(await worker.evaluate(()=>globalThis.__signReturnHold.restored),true);
    cases.push({entry,passed:true,previewDigest,intentBytesSha256:held.intentBytesSha256,sourceProof:debug.sourceProof,nativeSignCompleted:true,returnedSignature:false,approvalRemoved:true,journalUnchanged:true,dispatches:0,originalMethodsRestored:true});
    console.error(JSON.stringify({signatureHoldCase:entry,passed:true,dispatches:0,originalMethodsRestored:true}));
   }catch(error){
    console.error(JSON.stringify({signatureHoldFailed:entry,phase,errorType:error.name,messageFirstLine:String(error.message).split('\n')[0].slice(0,160),installed,invalidated,popupClosed:popup?.isClosed(),approvals:await savedApprovals().catch(()=>undefined),callerCancelEnabled:await demo.getByRole('button',{name:'Cancel transaction request',exact:true}).isEnabled().catch(()=>undefined),callerAlertCount:await demo.getByRole('alert').count(),callerResultCount:await demo.getByTestId('action-result').count(),state:installed?await worker.evaluate(()=>globalThis.__signReturnHold).catch(()=>undefined):undefined}));throw error;
   }finally{
    // Cancel while the result is held before releasing any cleanup barrier.
    if(installed){
      let safeToRelease=invalidated;
      if(!safeToRelease){
        try{
          await demo.getByRole('button',{name:'Cancel transaction request',exact:true}).click();
          await expect.poll(savedApprovals).toBe(0);
          safeToRelease=true;
        }catch{
          // Keep the real result and dispatch guard held until the caller closes Chrome.
          console.error(JSON.stringify({signatureHoldCleanup:entry,cancellationVerified:false,barrierRetained:true}));
        }
      }
      if(safeToRelease){
        await worker.evaluate(()=>globalThis.__releaseSignReturnHold?.()).catch(()=>{});
        await worker.evaluate(()=>globalThis.__restoreSignReturnHold?.()).catch(()=>{});
      }
    }
    await debug.close();
    if(event==='network')await command('@setNetwork',{env:'local',customRpcUrl:null});
    if(event==='account')await command('switchAccount',{accountID:accountId});
    if(event==='lock'){
      // Call the existing private password closure; never export the password into this helper.
      const reply=await command('getStoredEntities',{type:'accounts'});const account=reply.args.entities.find(a=>a.id===accountId);
      if(account.isLocked)await unlockAccount();
    }
   }
  }
  assert.equal(await worker.evaluate(()=>globalThis.__signHoldSafety.dispatchAttempts),0);
  assert.equal(await savedApprovals(),0);await worker.evaluate(()=>globalThis.__restoreSignHoldSafety());
  assert.equal(await worker.evaluate(()=>globalThis.__signHoldSafety.restored),true);
  return {passed:true,cases,completeSigningReturnMatrix:selected.length===all.length,dispatches:0,matrixSafetyGuardRestored:true,
   scope:'Real account signData finishes; its original result is held privately until lifecycle invalidation, then released only into original authorization code. Not physical hardware delay, post-dispatch or complete TX-10 acceptance.'};
 }finally{
  if(second){await command('switchAccount',{accountID:accountId});await command('removeAccount',{accountID:second.id});}
  // Do not lift the matrix-wide guard while any original request can still continue.
  if(await savedApprovals()===0)await worker.evaluate(()=>globalThis.__restoreSignHoldSafety?.());
 }
};
