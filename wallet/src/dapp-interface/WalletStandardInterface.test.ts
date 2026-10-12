// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import { RtdWallet } from "./WalletStandardInterface";
const m = vi.hoisted(() => ({ send: vi.fn(), stream: undefined as any }));
vi.mock("_messaging/WindowMessageStream", () => ({
  WindowMessageStream: class {
    messages = m.stream;
    send = m.send;
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  m.stream = new Subject();
});
it("publishes modern transaction and personal message features without deprecated methods", () => {
  const keys = Object.keys(new RtdWallet().features);
  expect(keys).toEqual(
    expect.arrayContaining([
      "rtd:signTransaction",
      "rtd:signAndExecuteTransaction",
      "rtd:signPersonalMessage",
    ]),
  );
  for (const key of [
    "rtd:signTransactionBlock",
    "rtd:signAndExecuteTransactionBlock",
    "rtd:signMessage",
  ])
    expect(keys).not.toContain(key);
});
it("passes chain and source to background and returns the actual local signature directly", async () => {
  const output = {
    bytes: "fixed-bytes",
    signature: "local-signature",
    digest: "digest",
    effects: "effects-bcs",
  };
  m.send.mockImplementation((message) =>
    queueMicrotask(() =>
      m.stream.next({
        id: message.id,
        payload: { type: "execute-transaction-response", result: output },
      }),
    ),
  );
  const result = await new RtdWallet().features[
    "rtd:signAndExecuteTransaction"
  ].signAndExecuteTransaction({
    transaction: { toJSON: async () => "source-json" },
    account: { address: "0x7" },
    chain: "rtd:localnet",
  } as any);
  expect(result).toEqual(output);
  expect(m.send.mock.calls[0][0].payload.transaction).toEqual({
    type: "transaction",
    data: "source-json",
    chain: "rtd:localnet",
    account: "0x7",
  });
});
it("missing effects cannot produce a success response", async () => {
  m.send.mockImplementation((message) =>
    queueMicrotask(() =>
      m.stream.next({
        id: message.id,
        payload: {
          type: "execute-transaction-response",
          result: { bytes: "b", signature: "s", digest: "d" },
        },
      }),
    ),
  );
  await expect(
    new RtdWallet().features[
      "rtd:signAndExecuteTransaction"
    ].signAndExecuteTransaction({
      transaction: { toJSON: async () => "source" },
      account: { address: "0x7" },
      chain: "rtd:localnet",
    } as any),
  ).rejects.toThrow("必要字段");
});
it('preserves account capabilities through network events and defaults missing capabilities to read-only', () => {
  const wallet = new RtdWallet();
  const features = ['rtd:signTransaction', 'rtd:signAndExecuteTransaction', 'rtd:signPersonalMessage'];
  m.stream.next({ payload: { type: 'wallet-status-changed', accounts: [
    { address: '0x7', publicKey: null, nickname: null, features },
    { address: '0x8', publicKey: null, nickname: null, features: [] },
    { address: '0x9', publicKey: null, nickname: null },
  ] } });
  expect(wallet.accounts.map(account => account.features)).toEqual([features, [], []]);
  m.stream.next({ payload: { type: 'wallet-status-changed', network: { env: 'local', customRpcUrl: null } } });
  expect(wallet.accounts.map(account => account.features)).toEqual([features, [], []]);
  expect(wallet.accounts[0].chains).toEqual(['rtd:localnet']);
});
it('forwards the optional personal-message chain to background', async () => {
  m.send.mockImplementation(message => queueMicrotask(() => m.stream.next({id:message.id,payload:{type:'sign-message-request',return:{messageBytes:'AQ==',signature:'s'}}})));
  await new RtdWallet().features['rtd:signPersonalMessage'].signPersonalMessage({message:new Uint8Array([1]),account:{address:'0x7'},chain:'rtd:localnet'} as any);
  expect(m.send.mock.calls[0][0].payload.args).toEqual({message:'AQ==',accountAddress:'0x7',chain:'rtd:localnet'});
});
it('keeps custom account chains discoverable and publishes chain changes without stale custom chains', () => {
  const wallet = new RtdWallet();
  const changed = vi.fn();
  const unsubscribe = wallet.features['standard:events'].on('change', changed);
  const builtins = [...wallet.chains];
  m.stream.next({payload:{type:'wallet-status-changed',network:{env:'customRPC',customRpcUrl:'',walletStandardChain:'rtd:private-a'},accounts:[{address:'0x7',publicKey:null,nickname:null,features:[]}]}});
  expect(wallet.chains).toEqual([...builtins, 'rtd:private-a']);
  expect(wallet.accounts[0].chains.every(chain => wallet.chains.includes(chain))).toBe(true);
  expect(changed.mock.lastCall?.[0]).toMatchObject({chains:wallet.chains,accounts:wallet.accounts});
  m.stream.next({payload:{type:'wallet-status-changed',network:{env:'customRPC',customRpcUrl:'',walletStandardChain:'rtd:private-b'}}});
  expect(wallet.chains).not.toContain('rtd:private-a');
  expect(wallet.chains).toContain('rtd:private-b');
  expect(wallet.accounts[0].chains).toEqual(['rtd:private-b']);
  m.stream.next({payload:{type:'wallet-status-changed',network:{env:'local',customRpcUrl:null}}});
  expect(wallet.chains).toEqual(builtins);
  expect(new Set(wallet.chains).size).toBe(wallet.chains.length);
  unsubscribe();
  const count = changed.mock.calls.length;
  m.stream.next({payload:{type:'wallet-status-changed',accounts:[]}});
  expect(changed).toHaveBeenCalledTimes(count);
});
it.each(['rtd:signTransaction','rtd:signAndExecuteTransaction'] as const)('keeps %s AbortSignal out of wire data and cancels its original request', async feature => {
  const controller=new AbortController(), wallet=new RtdWallet();
  const method=feature==='rtd:signTransaction' ? wallet.features[feature].signTransaction : wallet.features[feature].signAndExecuteTransaction;
  const result=method({transaction:{toJSON:async()=> 'source'},account:{address:'0x7'},chain:'rtd:localnet',signal:controller.signal} as any);
  result.catch(()=>{});
  await vi.waitFor(()=>expect(m.send).toHaveBeenCalledTimes(1));
  const request=m.send.mock.calls[0][0];expect(request.payload.transaction).not.toHaveProperty('signal');
  controller.abort();await expect(result).rejects.toMatchObject({name:'AbortError'});
  expect(m.send.mock.calls[1][0].payload).toEqual({type:'cancel-transaction-request',requestId:request.id});
});
it.each(['rtd:signTransaction','rtd:signAndExecuteTransaction'] as const)('%s rejects missing or malformed accounts without choosing an authorized default', async feature => {
  const wallet=new RtdWallet();
  m.stream.next({payload:{type:'wallet-status-changed',accounts:[{address:'0x7',publicKey:null,nickname:null,features:['rtd:signTransaction','rtd:signAndExecuteTransaction']}]}});
  m.send.mockImplementation(message=>queueMicrotask(()=>m.stream.next({id:message.id,payload:{error:true,code:-1,message:'unexpected background call'}})));
  const method=feature==='rtd:signTransaction'?wallet.features[feature].signTransaction:wallet.features[feature].signAndExecuteTransaction;
  for(const account of [undefined,null,{}, {address:''},{address:7},{address:'not-an-address'}]){
    const toJSON=vi.fn(async()=> 'source');
    await expect(method({transaction:{toJSON},account,chain:'rtd:localnet'} as any)).rejects.toThrow('账户');
    expect(toJSON).not.toHaveBeenCalled();expect(m.send).not.toHaveBeenCalled();
  }
});
it('PersonalMessage rejects missing or malformed account before messaging',async()=>{
 const wallet=new RtdWallet();
 for(const account of [undefined,null,{}, {address:''},{address:7},{address:'not-an-address'}]){
  await expect(wallet.features['rtd:signPersonalMessage'].signPersonalMessage({account,message:new Uint8Array([1])} as any)).rejects.toThrow('账户');
  expect(m.send).not.toHaveBeenCalled();
 }
});

it.each(['rtd:signTransaction','rtd:signAndExecuteTransaction'] as const)('%s requires explicit transaction chain before serialization',async feature=>{
 const wallet=new RtdWallet();const method=feature==='rtd:signTransaction'?wallet.features[feature].signTransaction:wallet.features[feature].signAndExecuteTransaction;
 m.send.mockImplementation(message=>queueMicrotask(()=>m.stream.next({id:message.id,payload:{error:true,code:-1,message:'unexpected background'}})));
 for(const chain of [undefined,null,7,'','sui:localnet','rtd:bad chain']){
  const toJSON=vi.fn(async()=> 'source');
  await expect(method({transaction:{toJSON},account:{address:'0x7'},chain} as any)).rejects.toThrow('交易链');
  expect(toJSON).not.toHaveBeenCalled();expect(m.send).not.toHaveBeenCalled();
 }
});
function accountStatus(accounts:any[]){m.stream.next({payload:{type:'wallet-status-changed',accounts}});}
function existingAccount(){return {address:'0x7',publicKey:null,nickname:null,features:['rtd:signTransaction']};}
function reply(message:any,payload:any){m.stream.next({id:message.id,payload});}
function refreshReplies(allowed=true){
 m.send.mockImplementation(message=>queueMicrotask(()=>{
  if(message.payload.type==='get-network')reply(message,{type:'set-network',network:{env:'local',customRpcUrl:null}});
  else if(message.payload.type==='has-permissions-request')reply(message,{type:'has-permissions-response',result:allowed});
  else if(message.payload.type==='get-account')reply(message,{type:'get-account-response',accounts:[existingAccount()]});
 }));
}
it('registration initialization restores prior authorization without requesting new permission',async()=>{
 const wallet=new RtdWallet();refreshReplies();await wallet.initialize();
 expect(wallet.accounts[0].address).toBe('0x7');expect(wallet.accounts[0].chains).toEqual(['rtd:localnet']);
 expect(m.send.mock.calls.map(([message])=>message.payload.type)).toEqual(['get-network','has-permissions-request','get-account']);
});
it('silent refresh clears stale accounts when permission is no longer granted',async()=>{
 const wallet=new RtdWallet();accountStatus([existingAccount()]);refreshReplies(false);
 const result=await wallet.features['standard:connect'].connect({silent:true});expect(result.accounts).toEqual([]);
});
it('late account response cannot undo a revocation event',async()=>{
 const wallet=new RtdWallet();let held:any;refreshReplies();const respond=m.send.getMockImplementation()!;
 m.send.mockImplementation(message=>message.payload.type==='get-account'?held=message:respond(message));
 const refresh=wallet.features['standard:connect'].connect({silent:true});await vi.waitFor(()=>expect(held).toBeDefined());
 accountStatus([]);reply(held,{type:'get-account-response',accounts:[existingAccount()]});await refresh;expect(wallet.accounts).toEqual([]);
});
it('disconnect waits for background acknowledgment and clears accounts without relying on an event',async()=>{
 const wallet=new RtdWallet();accountStatus([existingAccount()]);let done=false;
 const result=wallet.features['standard:disconnect'].disconnect().then(()=>{done=true;});
 await Promise.resolve();expect(done).toBe(false);expect(wallet.accounts).toHaveLength(1);
 reply(m.send.mock.calls[0][0],{type:'done'});await result;expect(wallet.accounts).toEqual([]);
});
