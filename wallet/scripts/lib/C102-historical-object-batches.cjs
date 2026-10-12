// Decode actual archive BatchGetObjects bytes; no synthetic GetObject frame or wallet reader.
const assert=require('node:assert/strict');
const {GrpcTypes}=require('rtd-typescript/grpc');
const {bcs,TypeTagSerializer}=require('rtd-typescript/bcs');
const {normalizeStructTag}=require('rtd-typescript/utils');
const parser=require('./C88-post-write-bytes.cjs');
const mask=['object_id','version','digest','owner','object_type','bcs','contents','previous_transaction','has_public_transfer'];
function batch(frame,native){
 assert.equal(frame.status,200);assert.equal(frame.url,'http://127.0.0.1:42012/archive/rtd.rpc.v2.LedgerService/BatchGetObjects');
 assert(['source','existingTarget','newTarget'].includes(frame.role));
 const request=GrpcTypes.BatchGetObjectsRequest.fromBinary(parser.grpcBody(frame.requestBase64,false));
 const response=GrpcTypes.BatchGetObjectsResponse.fromBinary(parser.grpcBody(frame.responseBase64,true));
 assert(request.requests.length>0&&request.requests.length<=20);assert.deepEqual(request.readMask?.paths.slice().sort(),mask.slice().sort());assert.equal(response.objects.length,request.requests.length);
 return request.requests.map((selector,index)=>{
  assert(native.has(selector.objectId));assert(typeof selector.version==='bigint'&&selector.version>=0n&&selector.version<=0xffffffffffffffffn);
  const entry=response.objects[index];assert.equal(entry.result.oneofKind,'object');const object=entry.result.object,n=native.get(selector.objectId);
  assert(object&&object.objectId===selector.objectId);assert.equal(String(selector.version),n.version);assert.equal(String(object.version),String(selector.version));
  assert(object.bcs?.value?.length&&object.contents?.value?.length);const parsed=parser.canonical(bcs.Object,object.bcs.value);
  assert.equal(parser.typed('Object',object.bcs.value),object.digest);assert.equal(parsed.data.$kind,'Move');assert.equal(parsed.data.Move.type.$kind,'Other');
  const type=normalizeStructTag(TypeTagSerializer.tagToString({struct:parsed.data.Move.type.Other}));assert.equal(type,normalizeStructTag(object.objectType));assert.equal(parsed.data.Move.version,String(object.version));
  assert.deepEqual(Buffer.from(parsed.data.Move.contents),Buffer.from(object.contents.value));assert.equal(bcs.Address.parse(Buffer.from(parsed.data.Move.contents).subarray(0,32)),selector.objectId);
  assert(object.owner);const rawOwner=object.owner.kind===GrpcTypes.Owner_OwnerKind.ADDRESS?{AddressOwner:object.owner.address}:object.owner.kind===GrpcTypes.Owner_OwnerKind.OBJECT?{ObjectOwner:object.owner.address}:null;assert(rawOwner);
  assert.deepEqual(Buffer.from(bcs.Owner.serialize(parsed.owner).toBytes()),Buffer.from(bcs.Owner.serialize(rawOwner).toBytes()));assert.equal(parsed.previousTransaction,object.previousTransaction);
  assert.equal(object.digest,n.digest);assert.equal(type,n.type);assert.deepEqual(parsed.owner,n.owner);assert.equal(object.previousTransaction,n.previousTransaction);
  assert.deepEqual(Buffer.from(object.bcs.value),n.objectBcs);assert.deepEqual(Buffer.from(object.contents.value),n.content);
  assert.equal(object.hasPublicTransfer,parsed.data.Move.hasPublicTransfer);
  return{role:frame.role,objectId:selector.objectId,version:n.version,digest:n.digest,method:'BatchGetObjects',canonicalObjectBcs:true};
 });
}
module.exports={batch};
