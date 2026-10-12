// Canonical full Move object validation, including native GasCoin/StakedRtd/Coin discriminants.
const assert=require('./C158-bounded-strict-assert.cjs'),{GrpcTypes}=require('rtd-typescript/grpc');
const parser=require('./C88-post-write-bytes.cjs'),wire=require('./C114-nft-wire-contract-v3.cjs');
function nativeObjects(frames,expectedIds){
 const expected=new Set(expectedIds),objects=new Map();
 for(const frame of frames.filter(f=>f.url.endsWith('/GetObject'))){
  assert.equal(frame.status,200);const request=GrpcTypes.GetObjectRequest.fromBinary(parser.grpcBody(frame.requestBase64,false)),response=GrpcTypes.GetObjectResponse.fromBinary(parser.grpcBody(frame.responseBase64,true));
  assert(response.object&&response.object.objectId===request.objectId);if(!expected.has(request.objectId))continue;assert(!objects.has(request.objectId),'Duplicate native object observation');
  const value=wire.object(response.object);objects.set(request.objectId,{...value,previousTransaction:response.object.previousTransaction});
 }
 assert.deepEqual([...objects.keys()].sort(),[...expected].sort());return objects;
}
module.exports={nativeObjects};
