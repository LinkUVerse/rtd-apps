// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { TypeTagSerializer } from 'rtd-typescript/bcs';
import { normalizeRtdAddress, toBase58, toBase64 } from 'rtd-typescript/utils';
import { snapshotFixture } from '../../../tests/unit/rpc/fixtures';
import { WalletIndexedLists } from './indexed-lists';
import { WalletEventBcs } from './event-envelope';

const address = normalizeRtdAddress('0xb');
const type = '0x3::validator_set::ValidatorEpochInfoEventV2';
const options = { lower: 1, upper: 10, order: 'ascending' as const };
const digest = (n: number) => toBase58(new Uint8Array(32).fill(n));
function tx(n: number) {
  return { digest: digest(n), sender: {address}, effects: {checkpoint:{sequenceNumber:n}} };
}
function event(n: number) {
  const tag = TypeTagSerializer.parseFromStr(type, true);
  if (!('struct' in tag)) throw new Error('fixture type');
  const raw = {packageId: normalizeRtdAddress('0x3'), module:'validator_set', sender:address,
    type:tag.struct, contents:new Uint8Array([n])};
  return {sequenceNumber:0, eventBcs:toBase64(WalletEventBcs.serialize(raw).toBytes()),
    sender:{address}, transaction:tx(n), transactionModule:{package:{address:raw.packageId},name:raw.module},
    contents:{type:{repr:type},bcs:toBase64(raw.contents)}};
}
function page(nodes: unknown[], next: boolean, cursor: string | null) {
  return { nodes, pageInfo:{hasNextPage:next,hasPreviousPage:next,startCursor:cursor,endCursor:cursor} };
}
describe('原生GraphQL显式筛选与完整分页', () => {
  it.each(['ascending','descending'] as const)('发送记录%s正确选择方向，跨空扫描页，不沿用旧cursor', async order => {
    const f = snapshotFixture({read: request => ({transactions: request.variables.cursor === null
      ? page([],true,'next') : page([tx(2),tx(3)],false,null)})});
    const result = await new WalletIndexedLists(f.session,f.fetch).sentTransactions(address,{...options,order});
    expect(result.value.map(item=>item.checkpoint)).toEqual(order==='ascending'?[2,3]:[3,2]);
    expect(result.verification).toBe('index-reference');
    expect(result.filter).toEqual({sentAddress:address,afterCheckpoint:0,beforeCheckpoint:11});
    const reads=f.requests.filter(request=>request.query.includes('WalletSnapshotRead'));
    expect(reads).toHaveLength(2);
    expect(reads[0].query).toContain(order==='ascending'?'first: 50, after':'last: 50, before');
    expect(f.requests[0].query).toContain('sentAddress');
  });
  it('类型事件使用原生BCS核验，checkpoint窗口、事件序号和模块保留', async () => {
    const f=snapshotFixture({read:()=>({events:page([event(2)],false,null)})});
    const result=await new WalletIndexedLists(f.session,f.fetch).events({type},options);
    expect(result.value[0]).toMatchObject({transactionDigest:digest(2),sequenceNumber:0,checkpoint:2,
      sender:address,module:'validator_set',contents:new Uint8Array([2])});
    expect(f.requests[0].query).toContain('"type"');
    expect(result.snapshot.checkpoint).toBe('10');
  });
  it.each(['0x3','0x3::validator_set'])('包／模块过滤%s不混用事件类型过滤', async module => {
    const f=snapshotFixture({read:()=>({events:page([event(2)],false,null)})});
    const result=await new WalletIndexedLists(f.session,f.fetch).events({module},options);
    expect(result.value).toHaveLength(1);
    expect(result.filter).not.toHaveProperty('type');
  });
  it.each(['zero-null','zero-address','nonzero-null','missing'] as const)('原生事件sender %s仅按完整BCS零地址接受空值', async mode => {
    const node: any = event(2);
    if(mode === 'zero-null' || mode === 'zero-address') {
      const raw = WalletEventBcs.parse(Uint8Array.from(atob(node.eventBcs), c => c.charCodeAt(0)));
      node.eventBcs = toBase64(WalletEventBcs.serialize({...raw,sender:normalizeRtdAddress('0x0')}).toBytes());
      node.sender = mode === 'zero-null' ? null : {address:normalizeRtdAddress('0x0')};
    } else if(mode === 'nonzero-null') node.sender = null;
    else delete node.sender;
    const f=snapshotFixture({read:()=>({events:page([node],false,null)})});
    const call=new WalletIndexedLists(f.session,f.fetch).events({type},options);
    if(mode.startsWith('zero-')) expect((await call).value[0].sender).toBe(normalizeRtdAddress('0x0'));
    else await expect(call).rejects.toThrow();
  });
  it.each(['duplicate','cursor','budget','sender','window','order','partial','range'] as const)(
    '发送记录%s错误整批拒绝', async reason => {
      const f=snapshotFixture({
        range:()=>({first:reason==='range'?2:0,last:10}),
        read:request=>({transactions: reason==='duplicate'?page([tx(2),tx(2)],false,null):
          reason==='cursor'||reason==='budget'?page([],true,'same'):
          reason==='sender'?page([{...tx(2),sender:{address:'0xc'}}],false,null):
          reason==='window'?page([tx(0)],false,null):
          reason==='order'?page([tx(3),tx(2)],false,null):page([tx(2)],false,null)}),
        alter:(response,request)=>reason==='partial'&&request.query.includes('WalletSnapshotRead')
          ? {...response,errors:[{message:'SCAN_LIMIT'}]}:response,
      });
      await expect(new WalletIndexedLists(f.session,f.fetch).sentTransactions(address,
        {...options,maxPages:reason==='budget'?1:256})).rejects.toThrow();
    });
  it.each(['contents','sender','type','module','trailing','missing'] as const)('事件%s不一致拒绝', async reason=>{
    const node=event(2);
    if(reason==='contents')node.contents.bcs=toBase64(new Uint8Array([9]));
    if(reason==='sender')node.sender.address=normalizeRtdAddress('0xc');
    if(reason==='type')node.contents.type.repr='0x3::other::Event';
    if(reason==='module')node.transactionModule.name='other';
    if(reason==='trailing')node.eventBcs=toBase64(new Uint8Array([...Uint8Array.from(atob(node.eventBcs),c=>c.charCodeAt(0)),0]));
    if(reason==='missing')node.eventBcs='';
    const f=snapshotFixture({read:()=>({events:page([node],false,null)})});
    await expect(new WalletIndexedLists(f.session,f.fetch).events({type},options)).rejects.toThrow();
  });
  it.each(['ascending','descending'] as const)('同一交易事件%s序号乱序拒绝',async order=>{
    const first=event(2), second={...event(2),sequenceNumber:1};
    const f=snapshotFixture({read:()=>({events:page([second,first],false,null)})});
    await expect(new WalletIndexedLists(f.session,f.fetch).events({type},{...options,order})).rejects.toThrow();
  });
  it('取消不发起请求；错误模块与类型组合不自动扩大查询',async()=>{
    const f=snapshotFixture(), reader=new WalletIndexedLists(f.session,f.fetch);
    const controller=new AbortController();controller.abort();
    await expect(reader.sentTransactions(address,{...options,signal:controller.signal})).rejects.toThrow();
    expect(()=>reader.events({module:'0x3',type} as never,options)).toThrow();
    expect(f.requests).toHaveLength(0);
  });
});
