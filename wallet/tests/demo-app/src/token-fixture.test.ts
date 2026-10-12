import { expect, it } from 'vitest';
import { normalizeRtdAddress } from 'rtd-typescript/utils';
import { tokenFixtureTransaction } from './token-fixture';
const sender=normalizeRtdAddress('0xa'),to=normalizeRtdAddress('0xb'),coin=normalizeRtdAddress('0xc');
const type=`${normalizeRtdAddress('0xd')}::migration_coin::MIGRATION_COIN`;
const params=new URLSearchParams({tokenType:type,tokenCoin:coin,tokenVersion:'7',tokenDigest:'11111111111111111111111111111111',tokenRecipient:to});
const url=()=>new URL('http://127.0.0.1:5181/?'+params);
it('ordinary demo has no token action',()=>expect(tokenFixtureTransaction(new URL('http://127.0.0.1/'),'localnet',sender)).toBeNull());
it('uses the production withdrawal, live coin merge, amount split and returned change',()=>{
 const data=tokenFixtureTransaction(url(),'localnet',sender)!.getData();
 expect(data.commands.map(item=>item.$kind)).toEqual(['MoveCall','MergeCoins','SplitCoins','TransferObjects','TransferObjects']);
 expect(data.commands[0]).toMatchObject({MoveCall:{module:'coin',function:'redeem_funds',typeArguments:[type]}});
 expect(data.inputs).toContainEqual(expect.objectContaining({Object:expect.objectContaining({ImmOrOwnedObject:{objectId:coin,version:'7',digest:params.get('tokenDigest')}})}));
 expect(data.gasData.payment).toBeNull();
});
it.each(['https://example.test/','http://localhost/','https://127.0.0.1/'])('rejects origin %s',origin=>expect(()=>tokenFixtureTransaction(new URL(origin+'?'+params),'localnet',sender)).toThrow());
it('rejects incomplete, native and invalid bindings or other networks',()=>{
 expect(()=>tokenFixtureTransaction(url(),'mainnet',sender)).toThrow();
 for(const [name,value]of [['tokenCoin','bad'],['tokenVersion','0'],['tokenVersion','18446744073709551616'],['tokenDigest','bad'],['tokenType','0x2::rtd::RTD']] as const){
  const current=url();current.searchParams.set(name,value);expect(()=>tokenFixtureTransaction(current,'localnet',sender)).toThrow();
 }
 const current=url();current.searchParams.delete('tokenRecipient');expect(()=>tokenFixtureTransaction(current,'localnet',sender)).toThrow();
});
