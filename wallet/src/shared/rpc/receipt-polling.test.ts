// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { toBase58 } from 'rtd-typescript/utils';
import { useWalletTransactionDetails } from 'rtd-apps-core/src/rpc/receipt-hooks';
import { useWalletStoredReceipt } from './stored-receipt-hook';

const m=vi.hoisted(()=>({details:vi.fn(),stored:vi.fn()}));
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext',()=>({useWalletRpc:()=>({
  bindingKey:'binding',readSessionKey:'session',hasFullnodeSession:true,readTransactionDetails:m.details,
})}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.useRealTimers();vi.resetAllMocks();});

it.each(['details','stored'] as const)('%s先未知后持续失败最多自动读取十次，手动刷新仍可用',async kind=>{
  vi.useFakeTimers();
  const read=m[kind];
  read.mockResolvedValueOnce(null).mockRejectedValue(new Error('temporarily unavailable'));
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  const node=document.createElement('div'),root=createRoot(node);
  const digest=toBase58(new Uint8Array(32).fill(1));
  let refresh!:()=>Promise<unknown>;
  function View(){
    const details=useWalletTransactionDetails(kind==='details'?digest:null);
    const stored=useWalletStoredReceipt(kind==='stored'?digest:null,{id:'a',address:'0xb'}, {readStoredReceipt:m.stored});
    const query=kind==='details'?details:stored;
    refresh=()=>query.refetch();
    return h('div',null,query.isError?'unavailable':query.data===null?'unknown':'loading');
  }
  try{
    await act(async()=>root.render(h(QueryClientProvider,{client,children:h(View)})));
    await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
    expect(read).toHaveBeenCalledTimes(1);
    expect(node.textContent).toBe('unknown');
    for(let n=0;n<15;n++)await act(async()=>{await vi.advanceTimersByTimeAsync(2001);});
    expect(read).toHaveBeenCalledTimes(10);
    expect(node.textContent).toBe('unavailable');
    await act(async()=>{await refresh();});
    expect(read).toHaveBeenCalledTimes(11);
    await act(async()=>{await vi.advanceTimersByTimeAsync(20_000);});
    expect(read).toHaveBeenCalledTimes(11);
  }finally{await act(async()=>root.unmount());client.clear();}
});
