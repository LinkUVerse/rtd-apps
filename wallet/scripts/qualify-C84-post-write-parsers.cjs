// Qualify independent byte parsers with previously captured real frames; no network or positive claim.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const parser=require('./audit-C84-nft-post-write-positive.cjs'),{GrpcTypes}=require('rtd-typescript/grpc');
const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const inventoryFile=path.join(logs,'20261007-C48-nft-execution-inventory-01.json');
const originalFile=path.join(logs,'20261007-C48-nft-execution-browser-independent-02.json');
const seedFile=path.join(logs,'20261007-C43-nonempty-kiosk-native-independent-01.json');
let result;
try{
 const inventory=read(inventoryFile),original=read(originalFile),seed=read(seedFile);
 assert(inventory.passed&&inventory.indexedFixtureAccepted&&original.passed&&seed.passed);
 for(const p of [inventory,original,seed])for(const [file,h]of Object.entries(p.inputsSha256))assert.equal(sha(file),h);
 const ids=[...seed.nfts,...seed.obNfts].map(n=>n.objectId);assert.equal(new Set(ids).size,8);
 const oldNative=parser.nativeObjects(inventory.frames,ids);
 const oldGraphql=parser.snapshotObjects(inventory.frames,inventory.snapshot,inventory.h0,oldNative);
 const postNative=parser.nativeObjects(original.supplementalFrames,ids);
 for(const object of original.currentTransferredNFTs){const parsed=postNative.get(object.objectId);assert.equal(parsed.objectBcs.toString('base64'),object.objectBcsBase64);assert.equal(parsed.digest,object.digest);assert.equal(parsed.version,object.version);assert.deepEqual(parsed.owner,object.owner);assert.equal(parsed.previousTransaction,object.previousTransaction);}
 let checks=3;
 function rejected(call){try{call();}catch(e){checks++;return;}throw Error('Corrupted actual evidence accepted');}
 const selected=inventory.frames.filter(f=>f.url.endsWith('/GetObject'));
 rejected(()=>parser.nativeObjects(selected.slice(1),ids));
 rejected(()=>parser.nativeObjects([...selected,selected[0]],ids));
 function changedObject(change){
  const frames=structuredClone(selected),raw=Buffer.from(frames[0].responseBase64,'base64');
  const end=5+raw.readUInt32BE(1),message=GrpcTypes.GetObjectResponse.fromBinary(raw.subarray(5,end));
  change(message.object);const data=Buffer.from(GrpcTypes.GetObjectResponse.toBinary(message));
  const header=Buffer.alloc(5);header.writeUInt32BE(data.length,1);frames[0].responseBase64=Buffer.concat([header,data,raw.subarray(end)]).toString('base64');
  return frames;
 }
 for(const change of [o=>o.digest='11111111111111111111111111111111',o=>o.version+=1n,
  o=>o.owner.address='0x'+'00'.repeat(32),o=>o.previousTransaction='11111111111111111111111111111111',
  o=>o.objectId='0x'+'00'.repeat(32),o=>o.contents.value[32]^=1,o=>o.objectType='0x2::bad::Type']){
  rejected(()=>parser.nativeObjects(changedObject(change),ids));
 }
 for(const cut of [1,5,10]){const frames=structuredClone(selected);frames[0].responseBase64=Buffer.from(frames[0].responseBase64,'base64').subarray(0,-cut).toString('base64');rejected(()=>parser.nativeObjects(frames,ids));}
 rejected(()=>parser.snapshotObjects(inventory.frames,{...inventory.snapshot,checkpoint:String(BigInt(inventory.snapshot.checkpoint)+1n)},inventory.h0,oldNative));
 rejected(()=>parser.snapshotObjects(inventory.frames,{...inventory.snapshot,digest:'wrong'},inventory.h0,oldNative));
 rejected(()=>parser.snapshotObjects(inventory.frames,inventory.snapshot,'wrong',oldNative));
 function changedLeaf(change){
  const frames=structuredClone(inventory.frames);let changed=false;
  function walk(value){if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const v of value)walk(v);return;}
   if(!changed&&ids.includes(value.address)&&value.contents?.bcs&&value.owner&&value.version!==undefined&&value.digest){change(value);changed=true;return;}
   for(const v of Object.values(value))walk(v);
  }
  for(const frame of frames){if(!frame.url.endsWith('/graphql')||frame.status!==200)continue;const body=JSON.parse(Buffer.from(frame.responseBase64,'base64'));walk(body);frame.responseBase64=Buffer.from(JSON.stringify(body)).toString('base64');if(changed)break;}
  assert(changed);return frames;
 }
 for(const change of [o=>o.digest='wrong',o=>o.version='0',o=>o.owner.address.address='0x'+'00'.repeat(32),
  o=>{const b=Buffer.from(o.contents.bcs,'base64');b[32]^=1;o.contents.bcs=b.toString('base64');}]){
  rejected(()=>parser.snapshotObjects(changedLeaf(change),inventory.snapshot,inventory.h0,oldNative));
 }
 const files=[__filename,path.join(__dirname,'audit-C84-nft-post-write-positive.cjs'),inventoryFile,originalFile,seedFile];
 result={passed:true,observedAt:new Date().toISOString(),preparedOnly:true,byteParserChecks:checks,
  actualHistoricalInventoryFrames:inventory.frames.length,actualHistoricalNativeObjects:8,
  actualOriginalTransferredNativeObjects:6,actualHistoricalSameSnapshot:oldGraphql,
  supportedHistoryParserExecuted:false,indexedPostWriteAccepted:false,chromeAccepted:false,parentCompletion:false,
  additionalNetworkRequests:0,additionalSignatures:0,additionalExecutions:0,
  inputsSha256:Object.fromEntries(files.map(f=>[f,sha(f)])),
  scope:'Independent object protobuf/BCS/type digests and GraphQL parser qualification from actual historical 81 frames plus original native post-transfer evidence; 19 corruptions rejected. Current checkpoint524022 positive history/GraphQL/Chrome acceptance remains unexecuted.'};
}catch(e){result={passed:false,observedAt:new Date().toISOString(),errorType:e.name,reason:String(e.message).slice(0,600)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,checks:result.byteParserChecks,errorType:result.errorType,reason:result.reason}));
