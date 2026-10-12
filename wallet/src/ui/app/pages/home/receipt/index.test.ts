// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { parseGrpcTransactionResponse } from 'rtd-typescript/grpc';
import type { WalletTransactionDetails } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import type { WalletStoredReceipt } from '_src/shared/rpc/execution-journal';
import { executionFixture, sender } from '../../../../../../tests/unit/rpc/execution-fixtures';
import ReceiptPage from './index';

const m=vi.hoisted(()=>({
  details:{data:undefined as WalletTransactionDetails|null|undefined,isPending:false,isError:false,refetch:vi.fn()},
  stored:{data:null as WalletStoredReceipt|null,refetch:vi.fn()},
  indexing:{data:false},
  activeAddress: '0xb' as string|null, guardLoading:false,
}));
vi.mock('rtd-apps-core/src/rpc/receipt-hooks',()=>({useWalletTransactionDetails:()=>m.details}));
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext',()=>({useWalletRpc:()=>({state:'configured'})}));
vi.mock('_src/ui/app/hooks/useStoredTransactionReceipt',()=>({useStoredTransactionReceipt:()=>m.stored}));
vi.mock('_src/ui/app/hooks/useReceiptIndexing',()=>({useReceiptIndexing:()=>m.indexing}));
vi.mock('_src/ui/app/hooks/useActiveAddress',()=>({useActiveAddress:()=>m.activeAddress}));
vi.mock('_src/ui/app/hooks/useUnlockedGuard',()=>({useUnlockedGuard:()=>m.guardLoading}));
vi.mock('_src/ui/app/i18n',()=>({useI18n:()=>({t:(key:string)=>key})}));
vi.mock('_components/alert',()=>({default:({children}:{children:ReactNode})=>h('div',{role:'alert'},children)}));
vi.mock('_components/loading',()=>({default:({children,loading}:{children:ReactNode;loading:boolean})=>loading?h('div',null,'loading'):children}));
vi.mock('_components/overlay',()=>({default:({children,title}:{children:ReactNode;title:string})=>h('section',null,h('h1',null,title),children)}));
vi.mock('_src/ui/app/components/receipt-card',()=>({ReceiptCard:()=>h('div',{'data-testid':'rich-details'},'rich-details')}));

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>{
  m.details.data=undefined;m.details.isPending=false;m.details.isError=false;
  m.stored.data=null;m.indexing.data=false;m.activeAddress='0xb';m.guardLoading=false;
  m.details.refetch.mockReset();m.stored.refetch.mockReset();
});
async function render(check:(node:HTMLElement)=>Promise<void>|void){
  const tx=await executionFixture();
  const node=document.createElement('div'),root=createRoot(node);
  try{
    await act(async()=>root.render(h(MemoryRouter,{initialEntries:[`/receipt?txdigest=${tx.digest}`],children:h(ReceiptPage)})));
    await check(node);
  }finally{await act(async()=>root.unmount());}
}
it.each([true,false])('详情服务失败时保留已确认终态%s，不改成未知或查询失败交易',async success=>{
  const tx=await executionFixture();
  m.stored.data={bindingKey:'binding',accountAddress:sender,receipt:tx.receipt(success)};
  m.details.isError=true;
  await render(async node=>{
    expect(node.textContent).toContain(success?'receipt.confirmedSuccess':'receipt.confirmedFailure');
    expect(node.textContent).toContain('receipt.detailsUnavailable');
    expect(node.textContent).toContain('receipt.indexingPending');
    expect(node.textContent).not.toContain('receipt.awaitingConfirmation');
    await act(async()=>node.querySelector('button')!.click());
    expect(m.details.refetch).toHaveBeenCalledTimes(1);expect(m.stored.refetch).toHaveBeenCalledTimes(1);
  });
});
it('两处都尚未找到时显示待确认，不显示成功或链上失败',async()=>{
  m.details.data=null;
  await render(node=>{
    expect(node.textContent).toContain('receipt.awaitingConfirmation');
    expect(node.textContent).not.toContain('receipt.confirmedSuccess');
    expect(node.textContent).not.toContain('receipt.confirmedFailure');
  });
});
it('富详情冲突时显示核验错误并撤下详情，保留经核验的本地终态',async()=>{
  const tx=await executionFixture();
  m.stored.data={bindingKey:'binding',accountAddress:sender,receipt:tx.receipt()};
  const parsed=parseGrpcTransactionResponse(tx.result(),{include:{effects:true,transaction:true,bcs:true,balanceChanges:true,objectTypes:true,events:true}});
  m.details.data={bindingKey:'binding',readSessionKey:'session',source:'fullnode',transaction:parsed.Transaction!};
  m.details.data.transaction.epoch='99';
  await render(node=>{
    expect(node.textContent).toContain('receipt.factMismatch');
    expect(node.textContent).toContain('receipt.confirmedSuccess');
    expect(node.querySelector('[data-testid="rich-details"]')).toBeNull();
    expect(node.textContent).not.toContain('receipt.indexingPending');
  });
});

it('冷启动账户仍在加载时保留收据地址，账户就绪后显示原交易',async()=>{
 const tx=await executionFixture();
 m.activeAddress=null;m.guardLoading=true;
 m.stored.data={bindingKey:'binding',accountAddress:sender,receipt:tx.receipt()};
 const node=document.createElement('div'),root=createRoot(node);
 function Location(){const location=useLocation();return h('output',null,location.pathname+location.search);}
 const tree=()=>h(MemoryRouter,{initialEntries:[`/receipt?txdigest=${tx.digest}`]},h(ReceiptPage),h(Location));
 try{
  await act(async()=>root.render(tree()));
  expect(node.querySelector('output')?.textContent).toBe(`/receipt?txdigest=${tx.digest}`);
  expect(node.textContent).toContain('loading');
  m.activeAddress=sender;m.guardLoading=false;
  await act(async()=>root.render(tree()));
  expect(node.querySelector('output')?.textContent).toBe(`/receipt?txdigest=${tx.digest}`);
  expect(node.textContent).toContain('receipt.confirmedSuccess');
 }finally{await act(async()=>root.unmount());}
});
