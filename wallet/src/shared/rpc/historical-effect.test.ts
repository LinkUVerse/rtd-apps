import { expect, it, vi } from 'vitest';
import type { WalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import type { WalletObjectEffect } from 'rtd-apps-core/src/rpc/transaction-view';
import { readHistoricalEffect } from './historical-effect';
const effect: WalletObjectEffect = { objectId:'id', objectType:null, operation:'Created', inputOwner:null, outputOwner:null, outputState:'ObjectWrite', version:'7', objectDigest:'digest' };
function fixture() {
 const object = {objectId:'id',version:'7',digest:'digest'};
 const read=vi.fn().mockResolvedValue({bindingKey:'chain',values:[object],coverage:{lower:'0',upper:'10'}});
 return {object,read,rpc:{bindingKey:'chain',readHistoricalObjects:read} as unknown as WalletRpc};
}
it('requests the effects version and accepts only the matching digest',async()=>{
 const f=fixture(),signal=new AbortController().signal;
 expect(await readHistoricalEffect(f.rpc,effect,signal)).toBe(f.object);
 expect(f.read).toHaveBeenCalledExactlyOnceWith([{objectId:'id',version:'7'}],signal);
});
it.each(['objectId','version','digest'])('rejects mismatched %s',async field=>{
 const f=fixture();f.read.mockResolvedValue({bindingKey:'chain',values:[{...f.object,[field]:'different'}]});
 await expect(readHistoricalEffect(f.rpc,effect,new AbortController().signal)).rejects.toThrow();
});
it('rejects foreign bindings, absent slots and item errors',async()=>{
 for(const result of [{bindingKey:'other',values:[]},{bindingKey:'chain',values:[]},{bindingKey:'chain',values:[new Error('not found')]}]){
  const f=fixture();f.read.mockResolvedValue(result);await expect(readHistoricalEffect(f.rpc,effect,new AbortController().signal)).rejects.toThrow();
 }
});
it('never requests latest for a deletion, missing version or missing digest',async()=>{
 for(const change of [{...effect,outputState:'NotExist' as const},{...effect,version:null},{...effect,objectDigest:null}]){
  const f=fixture();await expect(readHistoricalEffect(f.rpc,change,new AbortController().signal)).rejects.toThrow();expect(f.read).not.toHaveBeenCalled();
 }
});
it('rejects a late result after cancellation',async()=>{
 const f=fixture(),controller=new AbortController();f.read.mockImplementation(async()=>{controller.abort();return {bindingKey:'chain',values:[f.object]};});
 await expect(readHistoricalEffect(f.rpc,effect,controller.signal)).rejects.toThrow();
});
