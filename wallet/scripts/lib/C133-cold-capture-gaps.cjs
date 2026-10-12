// Fixed-digest recovery and the exact recipient warning; no broad object exception.
const {GrpcTypes}=require('rtd-typescript/grpc');
const parser=require('./C88-post-write-bytes.cjs');
const owner='0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7';
const h0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
function accepted(row,digest){
  if(row.status!==200||row.errorType!=='Error'||row.headers['grpc-status']!=='5')return false;
  const u=new URL(row.url);
  if(u.origin==='http://127.0.0.1:41750'&&row.headers['x-rtd-chain-id']!==h0)return false;
  if(row.url==='http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetObject'){
    if(row.stage!=='actual coin durable pending')return false;
    const req=GrpcTypes.GetObjectRequest.fromBinary(parser.grpcBody(row.requestBase64,false));
    return req.objectId===owner&&JSON.stringify(req.readMask.paths)===JSON.stringify([
      'object_id','version','digest','owner','object_type','bcs','contents','previous_transaction','has_public_transfer']);
  }
  if(!['http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetTransaction',
    'http://127.0.0.1:42012/archive/rtd.rpc.v2.LedgerService/GetTransaction'].includes(row.url))return false;
  return GrpcTypes.GetTransactionRequest.fromBinary(parser.grpcBody(row.requestBase64,false)).digest===digest;
}
module.exports={accepted};
