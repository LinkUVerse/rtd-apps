// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const assert = require('node:assert/strict');
const { expect } = require('@playwright/test');
const { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc');
const { toBase58 } = require('rtd-typescript/utils');
const { journal } = require('./test-dapp-execution.cjs');
const H0 = '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj';

module.exports = async ({context, demo, extensionPage, setStage}) => {
  const worker = context.serviceWorkers()[0], before = await journal(extensionPage);
  assert.equal(before.length, 0, 'Disposable public sign-only profile must have no journal');
  const wrong = toBase58(new Uint8Array(32).fill(9)), payloads = {};
  for (const [role, baseUrl] of [['fullnode','http://127.0.0.1:39400'],['archive','https://127.0.0.1:39603/archive']]) {
    const client = new RtdGrpcClient({network:'localnet',baseUrl,format:'binary',mvr:{url:''}});
    const {response} = await client.ledgerService.getServiceInfo({}, {abort:AbortSignal.timeout(10000)});
    assert.equal(response.chainId,H0); response.chainId=wrong;
    const message=GrpcTypes.GetServiceInfoResponse.toBinary(response), header=Buffer.alloc(5);header.writeUInt32BE(message.length,1);
    const trailers=Buffer.from('grpc-status: 0\r\n'), trailerHeader=Buffer.alloc(5);trailerHeader[0]=128;trailerHeader.writeUInt32BE(trailers.length,1);
    payloads[role]=Array.from(Buffer.concat([header,message,trailerHeader,trailers]));
  }
  const cases = [];
  for (const role of ['fullnode','graphql','archive']) {
    let popup;
    await worker.evaluate(({role,payloads,H0,wrong})=>{
      const original=globalThis.fetch;
      globalThis.__restoreTransactionIdentity=()=>{globalThis.fetch=original;delete globalThis.__restoreTransactionIdentity;};
      const state=globalThis.__transactionIdentity={role,faultRole:role==='archive'?undefined:role,replacements:0,simulations:0,dispatches:0,requests:[]};
      globalThis.fetch=async(input,init)=>{
        const url=input instanceof Request?input.url:String(input);
        if(/\/ExecuteTransaction(?:$|\?)/.test(url)){state.dispatches++;throw new Error('Identity sign-only fault forbids execution');}
        if(/\/SimulateTransaction(?:$|\?)/.test(url))state.simulations++;
        let endpoint;
        if(/\/GetServiceInfo(?:$|\?)/.test(url))endpoint=url.startsWith('http://127.0.0.1:39400/')?'fullnode':url.startsWith('https://127.0.0.1:39603/archive/')?'archive':undefined;
        if(url==='https://127.0.0.1:39600/graphql'&&JSON.parse(String(init?.body)).query==='query WalletGenesisIdentity { checkpoint(sequenceNumber: 0) { digest } }')endpoint='graphql';
        const response=await original(input,init);
        if(endpoint){
          const item={role:endpoint,status:response.status,actualSameChain:false,injected:false};state.requests.push(item);
          if(response.status!==200)throw new Error('Actual identity not available for fault proof');
          if(endpoint==='graphql'){
            const body=await response.clone().json();item.actualSameChain=body.data?.checkpoint?.digest===H0&&!body.errors?.length;
          }else item.actualSameChain=new TextDecoder().decode(await response.clone().arrayBuffer()).includes(H0);
          if(!item.actualSameChain)throw new Error('Actual identity differs before injection');
          if(state.faultRole===endpoint){
            item.injected=true;state.replacements++;
            const value=endpoint==='graphql'?JSON.stringify({data:{checkpoint:{digest:wrong}}}):new Uint8Array(payloads[endpoint]);
            return new Response(value,{status:200,headers:response.headers});
          }
        }
        return response;
      };
    },{role,payloads,H0,wrong});
    try {
      setStage(`identity fault ${role}: ${role==='archive'?'after healthy preview':'before preparation'}`);
      const opened=context.waitForEvent('page',{timeout:20000});opened.catch(()=>{});
      await demo.getByRole('button',{name:'Sign transaction',exact:true}).click();
      popup=await opened; const approve=popup.getByRole('button',{name:/^(批准|Approve)$/});
      let previewDigest, simulationsBeforeApproval=0;
      if(role==='archive'){
        await expect(approve).toBeEnabled({timeout:60000});
        previewDigest=(await popup.getByText(/^(交易摘要|Transaction digest):/).innerText()).split(':').pop().trim();
        simulationsBeforeApproval=await worker.evaluate(()=>globalThis.__transactionIdentity.simulations);
        assert(simulationsBeforeApproval>=2);
        await worker.evaluate(()=>{globalThis.__transactionIdentity.faultRole='archive';});
        await approve.click();
        await expect(demo.getByRole('alert')).toContainText('不同链',{timeout:60000});
      }else{
        await expect(popup.getByText(/^(网络费用估算失败|Gas estimation failed)$/).first()).toBeVisible({timeout:60000});
        // Loading hides the label from the accessibility tree; retain the exact approval label in DOM.
        const failedApproval=popup.locator('button').filter({has:popup.locator('.nova-button__label').filter({hasText:/^(批准|Approve)$/})});
        await expect(failedApproval).toHaveCount(1);
        await expect(failedApproval).toBeDisabled();
        assert.equal(await popup.getByText(/^(交易摘要|Transaction digest):/).count(),0);
        await popup.getByRole('button',{name:/^(拒绝|Reject)$/}).click();
        await expect(demo.getByRole('alert')).toContainText(/reject/i);
      }
      assert.equal(await demo.getByTestId('action-result').count(),0);
      const fault=await worker.evaluate(()=>globalThis.__transactionIdentity);
      assert(fault.replacements>0);assert.equal(fault.dispatches,0);
      assert.equal(fault.simulations,simulationsBeforeApproval,'Wrong chain must precede any new simulation/signing');
      assert(fault.requests.every(r=>r.status===200&&r.actualSameChain));
      assert.deepEqual(await journal(extensionPage),before);
      cases.push({role,passed:true,previewDigest,simulationsBeforeApproval,fault,returnedSignature:false,journalUnchanged:true});
    }catch(error){
      let ui;
      if(popup&&!popup.isClosed()){
        const text=await popup.locator('body').innerText();
        ui={route:new URL(popup.url()).hash,gasFailure:/网络费用估算失败|Gas estimation failed/.test(text),reactBoundary:/出现错误|Something went wrong/.test(text),buttons:await popup.getByRole('button').allTextContents()};
        const prefix=process.env.RTD_TEST_IDENTITY_FAILURE_PREFIX;
        if(prefix){const path=require('node:path'),fs=require('node:fs');const file=path.resolve(`${prefix}-${role}.png`);assert.equal(path.dirname(file),path.resolve(__dirname,'../../migrationToGRpcOrGraphQLDoc/workLog'));assert(!fs.existsSync(file));await popup.screenshot({path:file});ui.failureScreenshot=file;}
      }
      console.error(JSON.stringify({identityFaultFailed:role,errorType:error.name,messageFirstLine:String(error.message).split('\n')[0].slice(0,250),ui,fault:await worker.evaluate(()=>globalThis.__transactionIdentity)}));
      throw error;
    }finally{await worker.evaluate(()=>globalThis.__restoreTransactionIdentity());}
  }
  return {passed:true,cases,dispatches:0,journalUnchanged:true,
    scope:'Current real extension public-account sign-only: actual responses checked before explicitly injected wrong-chain bodies in current worker fetch. Fullnode/GraphQL fail before preparation; Archive changes after healthy preview and fails at sign approval before any new simulation or signature. No on-chain execution, durable/global reset or normal CA acceptance.'};
};
