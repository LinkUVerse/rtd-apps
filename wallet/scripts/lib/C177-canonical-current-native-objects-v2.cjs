// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Full canonical Move object and requested protobuf fields; optional masked-out rebate is not synthesized.
const assert=require('./C158-bounded-strict-assert.cjs'),{GrpcTypes}=require('rtd-typescript/grpc'),{bcs,TypeTagSerializer}=require('rtd-typescript/bcs'),{normalizeStructTag}=require('rtd-typescript/utils');
const {grpcBody,canonical,typed}=require('./C88-post-write-bytes.cjs');
function rawOwner(owner){
 assert(owner);
 if(owner.kind===GrpcTypes.Owner_OwnerKind.ADDRESS)return {AddressOwner:owner.address};
 if(owner.kind===GrpcTypes.Owner_OwnerKind.OBJECT)return {ObjectOwner:owner.address};
 if(owner.kind===GrpcTypes.Owner_OwnerKind.SHARED){assert(owner.version>0n);assert(owner.address===undefined||owner.address==='');return {Shared:{initialSharedVersion:String(owner.version)}};}
 assert.fail('Controlled NFT has an unexpected native owner kind');
}
function nativeObjects(frames,expectedIds){
 const expected=new Set(expectedIds),objects=new Map();
 for(const frame of frames.filter(f=>f.url.endsWith('/GetObject'))){
  assert.equal(frame.status,200);
  const request=GrpcTypes.GetObjectRequest.fromBinary(grpcBody(frame.requestBase64,false));
  const response=GrpcTypes.GetObjectResponse.fromBinary(grpcBody(frame.responseBase64,true));
  assert(response.object&&response.object.objectId===request.objectId);
  if(!expected.has(request.objectId))continue;
  assert(!objects.has(request.objectId),'Duplicate native object observation');
  const object=response.object;assert(object.bcs?.value?.length&&object.contents?.value?.length);
  const parsed=canonical(bcs.Object,object.bcs.value);
  assert.equal(typed('Object',object.bcs.value),object.digest);assert.equal(parsed.data.$kind,'Move');
  const moveType=parsed.data.Move.type;let label;if(moveType.$kind==='Other')label=TypeTagSerializer.tagToString({struct:moveType.Other});else if(moveType.$kind==='GasCoin')label='0x2::coin::Coin<0x2::rtd::RTD>';else if(moveType.$kind==='StakedRtd')label='0x3::staking_pool::StakedRtd';else{assert.equal(moveType.$kind,'Coin');label='0x2::coin::Coin<'+TypeTagSerializer.tagToString(moveType.Coin)+'>';}const type=normalizeStructTag(label);
  const masks=request.readMask?.paths??[];if(masks.includes('*')||masks.includes('storage_rebate')){assert.notEqual(object.storageRebate,undefined);assert.equal(String(object.storageRebate),String(parsed.storageRebate));}else if(object.storageRebate!==undefined)assert.equal(String(object.storageRebate),String(parsed.storageRebate));
  assert.equal(type,normalizeStructTag(object.objectType));
  assert.equal(parsed.data.Move.version,String(object.version));
  assert.deepEqual(Buffer.from(parsed.data.Move.contents),Buffer.from(object.contents.value));
  assert.equal(bcs.Address.parse(Buffer.from(parsed.data.Move.contents).subarray(0,32)),request.objectId);
  assert.deepEqual(Buffer.from(bcs.Owner.serialize(parsed.owner).toBytes()),Buffer.from(bcs.Owner.serialize(rawOwner(object.owner)).toBytes()));
  assert.equal(parsed.previousTransaction,object.previousTransaction);
  objects.set(request.objectId,{objectId:object.objectId,version:String(object.version),digest:object.digest,
   type,owner:parsed.owner,content:Buffer.from(object.contents.value),objectBcs:Buffer.from(object.bcs.value),previousTransaction:object.previousTransaction});
 }
 assert.deepEqual([...objects.keys()].sort(),[...expected].sort());return objects;
}
module.exports={nativeObjects};
