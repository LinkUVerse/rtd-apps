// Missing bodies never qualify a signing, simulation, verification or execute frame.
const {parse}=require('graphql');
const h0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
function accepted(row){
  if(row.status!==200||row.errorType!=='Error')return false;
  if(row.url==='http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetTransaction')return row.headers['grpc-status']==='5';
  if(row.stage==='normal existing controlled profile launch'&&row.url==='http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo')return row.headers['x-rtd-chain-id']===h0;
  if(row.duringClosing!==true||row.stage!=='normal relock and unchanged actual chain')return false;
  if(row.url==='http://127.0.0.1:42012/archive/rtd.rpc.v2.LedgerService/GetServiceInfo')return Buffer.from(row.requestBase64,'base64').length===5;
  if(!['http://127.0.0.1:42011/graphql','http://127.0.0.1:42013/account/graphql'].includes(row.url))return false;
  try{const body=JSON.parse(Buffer.from(row.requestBase64,'base64').toString());const tree=parse(body.query);return tree.definitions.every(n=>n.kind==='FragmentDefinition'||n.kind==='OperationDefinition'&&n.operation==='query');}catch{return false;}
}
module.exports={accepted};
