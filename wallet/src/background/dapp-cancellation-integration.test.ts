// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { Transaction } from 'rtd-typescript/transactions';
import { verifyTransactionSignature } from 'rtd-typescript/verify';
import transactions from './Transactions';
import { ConnectionRequests } from './connection-requests';
import { withAuthorizedDappRequest } from './dapp-preparation';
import { WalletReadSession } from '../shared/rpc/session';
import { WalletExecutionCoordinator } from '../shared/rpc/execution-coordinator';
import type { WalletJournalRecord } from '../shared/rpc/execution-journal';
import { validateNetworkProfile } from '../shared/rpc/profile';
import { profileFixture } from '../shared/rpc/profile-fixture';
import { executionFixture, sender } from '../../tests/unit/rpc/execution-fixtures';
const m=vi.hoisted(()=>({get:vi.fn(),set:vi.fn(),show:vi.fn(),close:vi.fn(),context:vi.fn()}));
vi.mock('webextension-polyfill',()=>({default:{runtime:{getURL:()=> 'chrome-extension://wallet/ui.html'},storage:{local:{get:m.get,set:m.set}}}}));
vi.mock('./Window',()=>({Window:class {show=m.show;close=m.close;}}));
vi.mock('./NetworkEnv',()=>({default:{on:vi.fn(),off:vi.fn(),getActiveNetwork:async()=>({env:'local',customRpcUrl:null})}}));
vi.mock('./Permissions',()=>({default:{hasPermissions:async()=>true}}));
vi.mock('./execution',()=>({withExecutionAccount:(_id:string,op:(context:any)=>unknown)=>op(m.context())}));
let stored:Record<string,any>;
beforeEach(()=>{
 vi.clearAllMocks();stored={};
 vi.stubEnv('WALLET_NETWORK_PROFILES',JSON.stringify({local:profileFixture()}));
 m.get.mockImplementation(async()=>({transactions:structuredClone(stored)}));
 m.set.mockImplementation(async(value)=>{stored=structuredClone(value.transactions);});
 m.show.mockResolvedValue(new Subject());m.close.mockResolvedValue(undefined);
});
afterEach(()=>vi.unstubAllEnvs());
function gate(){let release!:()=>void;const promise=new Promise<void>(resolve=>{release=resolve;});return {promise,release};}
it.each(['simulation','signature','dispatch-success','dispatch-failure'] as const)('real request cancellation reaches coordinator at %s without resubmission',async(stage)=>{
 const tx=await executionFixture(),profile=validateNetworkProfile(profileFixture());
 const session=new WalletReadSession(profile);
 const source=await Transaction.from(tx.bytes).toJSON();
 const connections=new ConnectionRequests(), lease=connections.begin('page-request');
 const disconnect=new Subject();
 const approval=transactions.executeOrSignTransaction({tx:{type:'transaction',data:source,account:sender,chain:profile.walletStandardChain}},
   {origin:'https://dapp.test',onDisconnect:disconnect,originFavIcon:undefined} as any,lease.signal);
 const rejected=expect(approval).rejects.toThrow('取消');
 await vi.waitFor(()=>expect(m.show).toHaveBeenCalledTimes(1));
 const requestId=Object.keys(stored)[0];
 const lifetime=transactions.getRequestSignal(requestId);
 m.context.mockReturnValue({session,account:{address:Promise.resolve(sender)},authorize:async()=>session.assertActive(),authorizeLocal:async()=>session.assertActive()});
 const records=new Map<string,WalletJournalRecord>();
 const journal={
  get:async(id:string)=>records.get(id)??null,
  pending:async(scope:string)=>[...records.values()].find(r=>r.scope===scope&&r.state==='dispatch-pending')??null,
  commitPending:vi.fn(async(record:WalletJournalRecord)=>{records.set(record.id,record);}),
  commitReceipt:vi.fn(async(id:string,receipt:any)=>{const record={...records.get(id)!,receipt,state:receipt.success?'confirmed-success' as const:'confirmed-failure' as const};records.set(id,record);return record;}),
 };
 const entered=gate(), continuation=gate();
 const callbacks={
  simulate:vi.fn(async()=>{if(stage==='simulation'){entered.release();await continuation.promise;}}),
  signData:vi.fn(async()=>{if(stage==='signature'){entered.release();await continuation.promise;}return tx.signed.signature;}),
 };
 const reader={verifySignature:vi.fn(async(_bytes:string,owner:string,signature:string)=>{await verifyTransactionSignature(tx.bytes,signature,{address:owner});}),lookup:vi.fn(async()=>tx.receipt(stage!=='dispatch-failure')),
  dispatch:vi.fn(async()=>{entered.release();await continuation.promise;return tx.receipt(stage!=='dispatch-failure');}),
 };
 const lock={run:async(_scope:string,operation:()=>Promise<any>)=>operation()};
 const input={accountId:'account',accountAddress:sender,requestId,originRef:'https://dapp.test',bindingKey:session.bindingKey,bytesBase64:tx.bytesBase64,digest:tx.digest};
 const operation=withAuthorizedDappRequest({accountId:'account',requestId},async({authorize})=>
   new WalletExecutionCoordinator(session,journal,reader,lock).execute(input,{...callbacks,authorize}));
 operation.catch(()=>{});
 await entered.promise;
 connections.cancel('page-request');await rejected;
 expect(lifetime.aborted).toBe(true);expect(session.signal.aborted).toBe(true);
 expect(stored).toEqual({});expect(m.close).toHaveBeenCalledTimes(1);
 continuation.release();
 if(stage==='simulation'||stage==='signature'){
  await expect(operation).rejects.toThrow();
  expect(reader.dispatch).not.toHaveBeenCalled();expect(journal.commitPending).not.toHaveBeenCalled();
  expect(records.size).toBe(0);expect(callbacks.signData).toHaveBeenCalledTimes(stage==='signature'?1:0);
 }else{
  expect(await operation).toMatchObject({state:'pending',digest:tx.digest});
  expect([...records.values()][0]).toMatchObject({state:'dispatch-pending',digest:tx.digest});
  const fresh=new WalletReadSession(profile);
  const coordinator=new WalletExecutionCoordinator(fresh,journal,reader,lock);
  // Even a fresh approval for another request cannot build/sign/dispatch over this pending.
  const replacement={authorize:vi.fn(async()=>{}),simulate:vi.fn(async()=>{}),signData:vi.fn(async()=>tx.signed.signature)};
  expect(await coordinator.execute({...input,requestId:'replacement'},replacement)).toMatchObject({state:'pending',digest:tx.digest});
  expect(replacement.simulate).not.toHaveBeenCalled();expect(replacement.signData).not.toHaveBeenCalled();
  expect(await coordinator.recover(sender,async()=>{})).toMatchObject({state:'confirmed',receipt:{digest:tx.digest,success:stage==='dispatch-success'}});
  expect(reader.lookup).toHaveBeenCalledWith(tx.digest,expect.anything());
  expect(reader.dispatch).toHaveBeenCalledTimes(1);expect(callbacks.signData).toHaveBeenCalledTimes(1);
  expect([...records.values()][0].state).toBe(stage==='dispatch-success'?'confirmed-success':'confirmed-failure');
  fresh.close();
 }
 lease.finish();session.close();
});
