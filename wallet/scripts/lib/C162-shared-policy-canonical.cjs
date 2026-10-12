// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Preserve full canonical object checks while accepting the shared TransferPolicy owner.
const assert=require('./C158-bounded-strict-assert.cjs'),{GrpcTypes}=require('rtd-typescript/grpc'),{bcs,TypeTagSerializer}=require('rtd-typescript/bcs'),{normalizeStructTag}=require('rtd-typescript/utils');
const {grpcBody,canonical,typed}=require('./C88-post-write-bytes.cjs');
function rawOwner(owner){
 assert(owner);
 if(owner.kind===GrpcTypes.Owner_OwnerKind.ADDRESS)return {AddressOwner:owner.address};
 if(owner.kind===GrpcTypes.Owner_OwnerKind.OBJECT)return {ObjectOwner:owner.address};
 if(owner.kind===GrpcTypes.Owner_OwnerKind.SHARED){assert(owner.version>0n);assert(owner.address===undefined||owner.address==='');return {Shared:{initial_shared_version:String(owner.version)}};}
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
  assert.equal(parsed.data.Move.type.$kind,'Other');
  const type=normalizeStructTag(TypeTagSerializer.tagToString({struct:parsed.data.Move.type.Other}));
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
