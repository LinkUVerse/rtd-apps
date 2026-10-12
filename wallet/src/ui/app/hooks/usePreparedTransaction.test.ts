// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, StrictMode, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Transaction } from "rtd-typescript/transactions";
import {
  normalizeRtdAddress as address,
  toBase58,
  toBase64,
} from "rtd-typescript/utils";
import { DappPreparationContext, coalesceDappPreparation } from "./DappPreparationContext";
import { usePreparedTransaction } from "./usePreparedTransaction";
import { useTransactionData } from "./useTransactionData";
const f = vi.hoisted(() => ({
  rpc: {
    state: "configured",
    bindingKey: "binding",
    readSessionKey: "session",
    hasFullnodeSession: true,
    prepareTransaction: vi.fn(),
  },
}));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => f.rpc,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let tx: Transaction,
  host: HTMLDivElement,
  root: ReturnType<typeof createRoot>,
  client: QueryClient,
  sender: string;
let latest: ReturnType<typeof usePreparedTransaction>,
  details: ReturnType<typeof useTransactionData>;
let prepared: any;
function View() {
  latest = usePreparedTransaction(sender, tx);
  details = useTransactionData(sender, tx);
  return h(
    "div",
    {},
    latest.data?.digest ?? (latest.isError ? "error" : "waiting"),
  );
}
async function render() {
  await act(async () =>
    root.render(h(QueryClientProvider, { client }, h(View))),
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}
beforeEach(async () => {
  sender = address("0xb");
  tx = new Transaction();
  tx.setSender(sender);
  tx.setGasOwner(sender);
  tx.setGasPrice("1");
  tx.setGasBudget("1000");
  tx.setGasPayment([
    {
      objectId: address("0xa"),
      version: "9007199254740993",
      digest: toBase58(new Uint8Array(32).fill(1)),
    },
  ]);
  tx.transferObjects([tx.gas], address("0xc"));
  const bytes = await tx.build();
  prepared = {
    bindingKey: "binding",
    readSessionKey: "session",
    sender,
    bytesBase64: toBase64(bytes),
    digest: "digest",
    gasBudget: "1000",
  };
  f.rpc = {
    state: "configured",
    bindingKey: "binding",
    readSessionKey: "session",
    hasFullnodeSession: true,
    prepareTransaction: vi.fn().mockResolvedValue(prepared),
  };
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
});
it("shares one preparation for details and approval, parsing gas only from final bytes", async () => {
  await render();
  expect(f.rpc.prepareTransaction).toHaveBeenCalledTimes(1);
  expect(details.data?.gasData.budget).toBe("1000");
  expect(details.data?.gasData.payment?.[0].version).toBe("9007199254740993");
  expect(details.prepared).toBe(latest.data);
  const query = client.getQueryCache().findAll()[0];
  expect(query.queryKey).toEqual([
    "wallet-transaction-preview",
    "binding",
    "session",
    sender,
    JSON.stringify(tx.getData()),
  ]);
  expect(query.meta).toMatchObject({ skipPersistedCache: true });
  await render();
  expect(f.rpc.prepareTransaction).toHaveBeenCalledTimes(1);
});
it("captures serialized input without mutating or sharing the caller transaction", async () => {
  const original = JSON.stringify(tx.getData());
  await render();
  const clone = f.rpc.prepareTransaction.mock.calls[0][0] as Transaction;
  expect(clone).not.toBe(tx);
  expect(JSON.stringify(clone.getData())).toBe(original);
  clone.setGasBudget("999");
  expect(JSON.stringify(tx.getData())).toBe(original);
  tx.setGasBudget("2000");
  await render();
  expect(f.rpc.prepareTransaction).toHaveBeenCalledTimes(2);
});
it("account and read-session changes get distinct previews and reject mismatched results", async () => {
  await render();
  sender = address("0xd");
  await render();
  expect(latest.isError).toBe(true);
  expect(details.data).toBeUndefined();
  sender = address("0xb");
  f.rpc = {
    ...f.rpc,
    readSessionKey: "new",
    prepareTransaction: vi
      .fn()
      .mockResolvedValue({ ...prepared, readSessionKey: "new" }),
  };
  await render();
  expect(latest.data?.readSessionKey).toBe("new");
});
it("failed refetch removes previous transaction and prepared bytes from consumers", async () => {
  await render();
  f.rpc.prepareTransaction.mockRejectedValue(new Error("chain unavailable"));
  await act(async () => {
    await latest.refetch();
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(latest.data).toBeUndefined();
  expect(details.data).toBeUndefined();
  expect(details.prepared).toBeUndefined();
});
it("closing the old session aborts its query and a late result cannot replace the new preview", async () => {
  let release!: (v: any) => void;
  let signal: AbortSignal | undefined;
  f.rpc.prepareTransaction.mockImplementation((_tx, _owner, s) => {
    signal = s;
    return new Promise((r) => (release = r));
  });
  await render();
  f.rpc = {
    ...f.rpc,
    readSessionKey: "new",
    prepareTransaction: vi.fn().mockResolvedValue({
      ...prepared,
      readSessionKey: "new",
      digest: "new-digest",
    }),
  };
  await render();
  expect(signal?.aborted).toBe(true);
  await act(async () => release(prepared));
  expect(latest.data?.digest).toBe("new-digest");
});
it("a Fullnode session can prepare while GraphQL admission is initializing", async () => {
  f.rpc.state = "initializing";
  await render();
  expect(f.rpc.prepareTransaction).toHaveBeenCalledTimes(1);
  expect(latest.data?.digest).toBe("digest");
});

it("dApp context shares one background preparation and keeps its approval token", async () => {
  const prepare = vi.fn(async () => ({
    ...prepared,
    readSessionKey: "background-session",
    dappApproval: {
      accountId: "a",
      requestId: "r",
      approvalToken: "token",
      expiresAt: Date.now() + 60000,
    },
  }));
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(
          DappPreparationContext.Provider,
          { value: { requestId: "r", accountId: "a", prepare } },
          h(View),
        ),
      ),
    ),
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(prepare).toHaveBeenCalledOnce();
  expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
  expect(latest.data?.dappApproval?.approvalToken).toBe("token");
  expect(details.prepared).toBe(latest.data);
});


it("dApp preparation survives frontend session replacement without duplicate background work", async () => {
  let release!: (value: any) => void;
  let signal!: AbortSignal;
  const prepare = vi.fn((s: AbortSignal) => { signal=s; return new Promise<any>(resolve => {release=resolve;}); });
  let requestId="request-1";
  async function draw() {
    await act(async () => root.render(h(QueryClientProvider,{client},
      h(DappPreparationContext.Provider,{value:{requestId,accountId:"account-1",prepare}},h(View)))));
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});
  }
  await draw();
  f.rpc={...f.rpc,readSessionKey:"frontend-reinitialized"};
  await draw();
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(signal.aborted).toBe(false);
  await act(async()=>{release({...prepared,readSessionKey:"background-only"});await new Promise(resolve=>setTimeout(resolve,10));});
  expect(latest.data?.digest).toBe("digest");
  // A different request still gets independent preparation and cancels its predecessor.
  requestId="request-2";await draw();expect(prepare).toHaveBeenCalledTimes(2);
  f.rpc={...f.rpc,bindingKey:"different-network"};await draw();
  expect(prepare).toHaveBeenCalledTimes(3);
});


it("StrictMode replay shares pending background preparation but discards cancelled observers", async()=>{
 let release!: (value:any)=>void;
 const operation=vi.fn(()=>new Promise<any>(resolve=>{release=resolve;}));
 const prepare=coalesceDappPreparation(operation);
 const scope={requestId:"r",accountId:"a",prepare};
 await act(async()=>root.render(h(StrictMode,{},h(QueryClientProvider,{client},
  h(DappPreparationContext.Provider,{value:scope},h(View))))));
 expect(operation).toHaveBeenCalledTimes(1);
 await act(async()=>{release({...prepared,readSessionKey:"background"});await new Promise(resolve=>setTimeout(resolve,10));});
 expect(latest.data?.digest).toBe("digest");expect(latest.isError).toBe(false);
});

it("shared preparation retains per-observer cancellation and clears failed requests",async()=>{
 let release!: (value:any)=>void;
 const operation=vi.fn(()=>new Promise<any>(resolve=>{release=resolve;}));
 const prepare=coalesceDappPreparation(operation),first=new AbortController(),second=new AbortController();
 const a=prepare(first.signal),b=prepare(second.signal);const rejected=expect(a).rejects.toThrow();
 first.abort();release("prepared");await rejected;expect(await b).toBe("prepared");
 expect(operation).toHaveBeenCalledTimes(1);
 operation.mockRejectedValueOnce(new Error("failed"));await expect(prepare(second.signal)).rejects.toThrow("failed");
 operation.mockResolvedValueOnce("fresh");expect(await prepare(second.signal)).toBe("fresh");
 expect(operation).toHaveBeenCalledTimes(3);
});

it.each(['internal','dapp'])('modern address withdrawal survives %s preview capture and cloning',async(mode)=>{
 const gas=tx.getData().gasData;
 tx=new Transaction();tx.setSender(sender);tx.setGasOwner(sender);tx.setGasPrice(gas.price!);tx.setGasBudget(gas.budget!);tx.setGasPayment(gas.payment!);
 const coin=tx.moveCall({target:'0x2::coin::redeem_funds',typeArguments:['0x2::rtd::RTD'],
  arguments:[tx.withdrawal({amount:9007199254740993n,type:'0x2::rtd::RTD'})]});
 tx.transferObjects([coin],address('0xc'));
 prepared={...prepared,bytesBase64:toBase64(await tx.build())};
 f.rpc.prepareTransaction.mockResolvedValue(prepared);
 const captured=JSON.stringify(tx.getData());
 const prepare=vi.fn(async()=>({...prepared,readSessionKey:'background'}));
 if(mode==='internal')await render();
 else {
  await act(async()=>root.render(h(QueryClientProvider,{client},
   h(DappPreparationContext.Provider,{value:{requestId:'withdrawal',accountId:'a',prepare}},h(View)))));
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});
 }
 expect(latest.isError).toBe(false);expect(latest.data?.digest).toBe('digest');
 expect(details.data?.inputs[0]).toMatchObject({FundsWithdrawal:{reservation:{MaxAmountU64:'9007199254740993'}}});
 const query=client.getQueryCache().findAll()[0];expect(query.queryKey[4]).toBe(captured);
 if(mode==='internal'){
  const clone=f.rpc.prepareTransaction.mock.calls[0][0] as Transaction;
  expect(JSON.stringify(clone.getData())).toBe(captured);clone.setGasBudget('999');expect(JSON.stringify(tx.getData())).toBe(captured);
 }else {expect(prepare).toHaveBeenCalledOnce();expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();}
});

it('modern expiration constraints remain in the immutable preview input',async()=>{
 tx.setExpiration({ValidDuring:{minEpoch:'0',maxEpoch:'9007199254740993',minTimestamp:null,maxTimestamp:null,
  chain:toBase58(new Uint8Array(32).fill(7)),nonce:0}});
 prepared={...prepared,bytesBase64:toBase64(await tx.build())};
 f.rpc.prepareTransaction.mockResolvedValue(prepared);
 await render();
 const clone=f.rpc.prepareTransaction.mock.calls[0][0] as Transaction;
 expect(clone.getData().expiration).toEqual(tx.getData().expiration);
 expect(details.data?.expiration).toEqual(tx.getData().expiration);
});
