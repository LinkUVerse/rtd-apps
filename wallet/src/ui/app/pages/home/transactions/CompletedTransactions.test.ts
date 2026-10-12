// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {act,createElement as h,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,expect,it,vi} from 'vitest';
import type {WalletAccountHistory} from 'rtd-apps-core/src/rpc/WalletRpcContext';
import type {WalletReadAdmissionView} from 'rtd-apps-core/src/rpc/read-admission';
import {historyFixture} from '../../../../../../tests/unit/rpc/history-fixtures';
import {sender} from '../../../../../../tests/unit/rpc/execution-fixtures';
import {CompletedTransactions} from './CompletedTransactions';

const m=vi.hoisted(()=>({history:undefined as WalletAccountHistory|undefined,error:null as Error|null,address:'',state:'configured',isPending:false,readAdmission:undefined as WalletReadAdmissionView|undefined}));
vi.mock('_hooks',()=>({useQueryTransactionsByAddress:()=>({data:m.history,error:m.error,isPending:m.isPending})}));
vi.mock('_src/ui/app/hooks/useActiveAddress',()=>({useActiveAddress:()=>m.address}));
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext',()=>({useWalletRpc:()=>({state:m.state,message:'unconfigured',readAdmission:m.readAdmission})}));
vi.mock('_app/i18n',()=>({useI18n:()=>({t:(key:string,vars?:Record<string,string>)=>key+(vars?JSON.stringify(vars):'')})}));
vi.mock('_components/alert',()=>({default:({children}:{children:ReactNode})=>h('div',{role:'alert'},children)}));
vi.mock('_components/loading',()=>({default:({children,loading}:{children:ReactNode,loading:boolean})=>loading?h('div',{role:'status'},'loading'):children}));
vi.mock('_components/error-boundary',()=>({ErrorBoundary:({children}:{children:ReactNode})=>children}));
vi.mock('_components/transactions-card/NoActivityCard',()=>({NoActivityCard:({message}:{message:string})=>h('div',null,message)}));
vi.mock('_app/shared/date-card',()=>({DateCard:()=>h('time',null,'timestamp')}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>{m.history=undefined;m.error=null;m.address=sender;m.state='configured';m.isPending=false;m.readAdmission=undefined;});
async function render(check:(node:HTMLElement)=>void){
  const node=document.createElement('div'),root=createRoot(node);
  try{
    await act(async()=>root.render(h(MemoryRouter,{children:h(CompletedTransactions)})));
    check(node);
  }finally{await act(async()=>root.unmount());}
}
it('展示经reader准入的窗口与覆盖限制，交易卡保留真实sender和摘要详情链接',async()=>{
  const fixture=await historyFixture();
  m.history=await fixture.reader.read(sender);
  await render(node=>{
    expect(node.textContent).toContain('activity.window');
    expect(node.textContent).toContain('activity.limited');
    expect(node.textContent).toContain('activity.sender');
    expect(node.textContent).toContain('receipt.transaction');
    expect(node.querySelector('a')?.getAttribute('href')).toBe(`/receipt?txdigest=${m.history!.transactions[0].digest}`);
    expect(node.textContent).not.toContain('activity.windowEmpty');
  });
});
it('刷新失败不展示缓存中的历史记录或空窗口结论',async()=>{
  const fixture=await historyFixture();m.history=await fixture.reader.read(sender);
  m.error=new Error('coverage unavailable');
  await render(node=>{
    expect(node.textContent).toBe('查询失败，请稍后重新查询');
    expect(node.textContent).not.toContain('coverage unavailable');
    expect(node.querySelector('a')).toBeNull();
  });
});
it('成功空集合只表示当前受支持窗口为空，继续显示覆盖限制',async()=>{
  const fixture=await historyFixture();const history=await fixture.reader.read(sender);
  m.history={...history,transactions:[],totalTransactions:0};
  await render(node=>{
    expect(node.textContent).toContain('activity.windowEmpty');
    expect(node.textContent).toContain('activity.limited');
    expect(node.textContent).toContain('activity.window');
    expect(node.querySelector('a')).toBeNull();
  });
});
it.each(['checking','observed','unavailable'] as const)('history被%s准入阻断时说明原因，不无限loading或展示旧历史',async(phase)=>{
  const fixture=await historyFixture();m.history=await fixture.reader.read(sender);
  m.isPending=true;
  m.readAdmission={phase,blocked:['history'],keys:{} as WalletReadAdmissionView['keys']};
  await render(node=>{
    expect(node.querySelector('[role="alert"]')?.textContent).toBe('activity.admissionBlocked');
    expect(node.textContent).not.toContain('loading');
    expect(node.textContent).not.toContain('activity.windowEmpty');
    expect(node.textContent).not.toContain('activity.window');
    expect(node.querySelector('a')).toBeNull();
  });
});
it('其他读取被阻断不影响已准入历史窗口',async()=>{
  const fixture=await historyFixture();m.history=await fixture.reader.read(sender);
  m.readAdmission={phase:'observed',blocked:['balances'],keys:{} as WalletReadAdmissionView['keys']};
  await render(node=>{
    expect(node.textContent).toContain('activity.window');
    expect(node.textContent).toContain('activity.limited');
    expect(node.textContent).not.toContain('activity.admissionBlocked');
  });
});
