import { bcs } from 'rtd-typescript/bcs';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { normalizeRtdAddress, toBase58 } from 'rtd-typescript/utils';
import { expect, it, vi } from 'vitest';
import { WalletArchiveObjectReader, ArchiveObjectItemError } from './archive-object-reader';
import { freshObjectDigest } from './fresh-object';
import { WalletReadSession } from './session';
import { validateNetworkProfile } from './profile';
import { profileFixture } from './profile-fixture';
import { grpcResponse } from '../../../tests/unit/rpc/execution-fixtures';
const id=normalizeRtdAddress('0xa'), previous=toBase58(new Uint8Array(32).fill(7));
const bytes=bcs.Object.serialize({data:{Package:{id,version:'7',moduleMap:new Map(),typeOriginTable:[],linkageTable:new Map()}},owner:{Immutable:null},previousTransaction:previous,storageRebate:'0'}).toBytes();
const object=GrpcTypes.Object.create({objectId:id,version:7n,digest:freshObjectDigest(bytes),bcs:{value:bytes},owner:{kind:GrpcTypes.Owner_OwnerKind.IMMUTABLE},objectType:'package',previousTransaction:previous});
function setup(mode='ok') {
 const session=new WalletReadSession(validateNetworkProfile(profileFixture())); let infos=0;
 const fetch=vi.fn<typeof globalThis.fetch>(async(url,init)=>{
  expect(String(url).startsWith(session.profile.endpoints.archiveGrpcWeb!)).toBe(true);
  expect(init?.redirect).toBe('error'); expect(init?.credentials).toBe('omit');
  const headers=new Headers(init?.headers);expect(headers.has('x-rtd-visible-checkpoint')).toBe(false);
  const method=String(url).split('/').at(-1);
  if(method==='GetServiceInfo') {infos++;return grpcResponse(GrpcTypes.GetServiceInfoResponse.toBinary(GrpcTypes.GetServiceInfoResponse.create({chainId:mode==='wrong-chain'?previous:session.profile.expectedGenesisDigest,checkpointHeight:mode==='regress'&&infos===2?9n:10n,lowestAvailableCheckpointObjects:mode==='no-bound'?undefined:0n})));}
  expect(method).toBe('BatchGetObjects');
  const request=GrpcTypes.BatchGetObjectsRequest.fromBinary(new Uint8Array(await new Response(init?.body).arrayBuffer()).subarray(5));
  expect(request.requests.every(r=>r.version===7n)).toBe(true);
  const objects=request.requests.map(r=>r.objectId===id?{result:{oneofKind:'object' as const,object:{...object,...(mode==='wrong-version'?{version:8n}:{}),...(mode==='bad-bcs'?{bcs:{value:new Uint8Array([0])}}:{})}}}:{result:{oneofKind:'error' as const,error:{code:mode==='bad-code'?0:5,message:'missing',details:[]}}});
  if(mode==='short')objects.pop();
  return grpcResponse(GrpcTypes.BatchGetObjectsResponse.toBinary({objects}));
 });
 return {reader:new WalletArchiveObjectReader(session,{fetch}),fetch};
}
it('preserves exact versions, duplicates and individual errors across batches',async()=>{
 const f=setup();const selectors=Array.from({length:43},(_,i)=>({objectId:i===1||i===40?'0xc':id,version:'7'}));
 const result=await f.reader.objects(selectors);expect(result.values).toHaveLength(43);
 result.values.forEach((o,i)=>{if(i===1||i===40){expect(o).toBeInstanceOf(ArchiveObjectItemError);expect(o).toMatchObject({code:5,selector:{version:'7',objectId:normalizeRtdAddress('0xc')}});}else expect(o).toMatchObject({version:'7',objectId:id});});
 expect(f.fetch).toHaveBeenCalledTimes(5);
});
it.each(['wrong-chain','regress','no-bound','short','wrong-version','bad-bcs','bad-code'])('rejects %s without returning a partial array',async mode=>{
 await expect(setup(mode).reader.objects([{objectId:id,version:'7'},{objectId:'0xc',version:'7'}])).rejects.toThrow();
});
it('rejects unspecified/latest/noncanonical versions before network access',async()=>{
 for(const value of [undefined,7,'','latest','01','-1','18446744073709551616']){
  const f=setup();await expect(f.reader.objects([{objectId:id,version:value as string}])).rejects.toThrow();expect(f.fetch).not.toHaveBeenCalled();
 }
});
