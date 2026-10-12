import { describe, expect, it, vi } from 'vitest';
import { Transaction } from 'rtd-typescript/transactions';
import { normalizeRtdAddress as address, normalizeStructTag } from 'rtd-typescript/utils';
import type { WalletFreshObject } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { assertApprovedRecipient } from './approved-recipient';
import { KIOSK_BCS } from './kiosk-reader';

const recipient = address('0xa'), source = address('0x1'), target = address('0x2');
const packages = { originByte: { discoveryPackage: address('0xc'), executionPackage: address('0xd') } };
function fixture(create = false) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${packages.originByte.executionPackage}::ob_kiosk::${create ? 'p2p_transfer_and_create_target_kiosk' : 'p2p_transfer'}`,
    typeArguments: ['0xe::nft::NFT'],
    arguments: [tx.sharedObjectRef({objectId:source,initialSharedVersion:'1',mutable:true}),
      create ? tx.pure.address(recipient) : tx.sharedObjectRef({objectId:target,initialSharedVersion:'2',mutable:true}), tx.pure.id('0xf')],
  });
  const content = { id:target, profits:{value:'0'},owner:recipient,item_count:0,allow_extensions:true };
  const object = { objectId:target,type:normalizeStructTag('0x2::kiosk::Kiosk'),owner:{$kind:'Shared',Shared:{initialSharedVersion:'2'}},content:KIOSK_BCS.serialize(content).toBytes() } as WalletFreshObject;
  const read = vi.fn().mockResolvedValue(object);
  const check = () => assertApprovedRecipient(tx.getData(),recipient,packages,read);
  return {tx,content,object,read,check};
}
describe('批准OriginByte名称目标', () => {
  it('新建目标仅接受实际地址参数，不读取对象', async () => {
    const f=fixture(true); await f.check(); expect(f.read).not.toHaveBeenCalled();
  });
  it('已有目标必须用Fullnode核对当前Kiosk owner和共享版本', async () => {
    const f=fixture(); await f.check(); expect(f.read).toHaveBeenCalledExactlyOnceWith(target);
  });
  it.each(['owner','extensions','uid','type','version','missing','failure'])('拒绝目标%s改变或读取失败', async reason => {
    const f=fixture();
    if(reason==='owner') f.object.content=KIOSK_BCS.serialize({...f.content,owner:address('0xb')}).toBytes();
    if(reason==='extensions') f.object.content=KIOSK_BCS.serialize({...f.content,allow_extensions:false}).toBytes();
    if(reason==='uid') f.object.content=KIOSK_BCS.serialize({...f.content,id:source}).toBytes();
    if(reason==='type') f.object.type=normalizeStructTag('0x2::other::Kiosk');
    if(reason==='version') f.object.owner={$kind:'Shared',Shared:{initialSharedVersion:'3'}};
    if(reason==='missing') f.read.mockResolvedValue(null);
    if(reason==='failure') f.read.mockRejectedValue(new Error('unavailable'));
    await expect(f.check()).rejects.toThrow();
  });
  it.each(['package','module','function','arguments','typeArguments','mixed'])('拒绝未批准的%s',async reason=>{
    const f=fixture(); const data=f.tx.getData();
    const call=data.commands[0]; if(call.$kind!=='MoveCall')throw new Error();
    if(reason==='package')call.MoveCall.package=packages.originByte.discoveryPackage;
    if(reason==='module')call.MoveCall.module='other';
    if(reason==='function')call.MoveCall.function='other';
    if(reason==='arguments')call.MoveCall.arguments.pop();
    if(reason==='typeArguments')call.MoveCall.typeArguments=[];
    if(reason==='mixed')data.commands.push(data.commands[0]);
    await expect(assertApprovedRecipient(data,recipient,packages,f.read)).rejects.toThrow();
    expect(f.read).not.toHaveBeenCalled();
  });
  it('不能用额外TransferObjects掩盖OriginByte收款路径', async () => {
    const f = fixture(true);
    f.tx.transferObjects([f.tx.gas], recipient);
    await expect(f.check()).rejects.toThrow('混合调用');
    expect(f.read).not.toHaveBeenCalled();
  });
  it('任意未使用Pure地址不能掩盖真实接收者不一致',async()=>{
    const f=fixture(true); f.tx.pure.address(address('0xb'));
    await expect(assertApprovedRecipient(f.tx.getData(),address('0xb'),packages,f.read)).rejects.toThrow();
  });
});
