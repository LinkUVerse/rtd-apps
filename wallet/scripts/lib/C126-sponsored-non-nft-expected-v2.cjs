// Independent inverse of the declared sponsor input delta; never imports the generator.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Transaction}=require('rtd-typescript/transactions'),{bcs}=require('rtd-typescript/bcs'),{toBase58}=require('rtd-typescript/utils'),{blake2b}=require('@noble/hashes/blake2.js');
const {GrpcTypes}=require('rtd-typescript/grpc'),original=require('./C117-non-nft-validity-audit.cjs');
const inventoryFile=path.resolve(__dirname,'../../migrationToGRpcOrGraphQLDoc/workLog/20261009-C126-non-nft-sponsor-inventory-02.json');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function selected(){const p=JSON.parse(fs.readFileSync(inventoryFile));assert(p.passed&&!p.privateKeyMaterialRecorded&&p.nativeReadRequests===10);for(const[f,h]of Object.entries(p.inputsSha256))assert.equal(sha(f),h);assert.notEqual(p.sender,p.sponsor);assert.equal(p.rawFrames.length,10);
 const rows={};for(const role of ['sender','sponsor']){const r=p.selected.find(r=>r.role===role);assert(r);const bytes=Buffer.from(r.object.objectBcsBase64,'base64'),o=bcs.Object.parse(bytes);assert.deepEqual(Buffer.from(bcs.Object.serialize(o).toBytes()),bytes);assert.equal(toBase58(blake2b(Buffer.concat([Buffer.from('Object::'),bytes]),{dkLen:32})),r.coin.digest);assert.equal(o.owner.AddressOwner,r.owner);assert.equal(r.object.owner.kind,GrpcTypes.Owner_OwnerKind.ADDRESS);assert.equal(r.object.owner.address,r.owner);assert.equal(r.object.digest,r.coin.digest);assert.equal(r.object.version,String(r.coin.version));const contents=Buffer.from(o.data.Move.contents,'base64');assert.equal(contents.length,40);assert.equal('0x'+contents.subarray(0,32).toString('hex'),r.coin.objectId);assert.equal(contents.readBigUInt64LE(32).toString(),r.coin.balance);assert(BigInt(r.coin.balance)>=100000000n);rows[role]={objectId:r.coin.objectId,version:String(r.coin.version),digest:r.coin.digest};}
 assert.equal(p.selected.find(r=>r.role==='sender').owner,p.sender);assert.equal(p.selected.find(r=>r.role==='sponsor').owner,p.sponsor);return{p,refs:rows};}
async function expected(prepared,kind){
 const {p,refs}=selected(),before=original.requireNonNft(prepared,kind,p.sender),tx=Transaction.from(prepared.bytesBase64);
 if(kind!=='withdraw'){
  const sdk=tx.getData();assert.deepEqual(sdk.commands.map(c=>c.$kind),kind==='coin'?['SplitCoins','TransferObjects']:['SplitCoins','MoveCall']);
  const coin=tx.objectRef(refs.sender);assert.equal(coin.$kind,'Input');assert.equal(coin.Input,sdk.inputs.length);
  const json=JSON.parse(await tx.toJSON());assert.deepEqual(json.commands[0].SplitCoins.coin,{GasCoin:true});json.commands[0].SplitCoins.coin=coin;
  const changed=Transaction.from(JSON.stringify(json));changed.setGasOwner(p.sponsor);changed.setGasPayment([refs.sponsor]);changed.setGasBudget('100000000');
  const bytes=Buffer.from(await changed.build()),d=bcs.TransactionData.parse(bytes),inverse=structuredClone(d);
  assert.deepEqual(inverse.V1.kind.ProgrammableTransaction.inputs.pop(),{$kind:'Object',Object:{$kind:'ImmOrOwnedObject',ImmOrOwnedObject:refs.sender}});
  inverse.V1.kind.ProgrammableTransaction.commands[0].SplitCoins.coin={$kind:'GasCoin',GasCoin:true};inverse.V1.gasData=structuredClone(before.V1.gasData);assert.deepEqual(inverse,before);
  return{...prepared,bytesBase64:bytes.toString('base64'),digest:await changed.getDigest(),gasBudget:'100000000'};
 }
 tx.setGasOwner(p.sponsor);tx.setGasPayment([refs.sponsor]);tx.setGasBudget('100000000');const bytes=Buffer.from(await tx.build()),d=bcs.TransactionData.parse(bytes),inverse=structuredClone(d);inverse.V1.gasData=structuredClone(before.V1.gasData);assert.deepEqual(inverse,before);
 return{...prepared,bytesBase64:bytes.toString('base64'),digest:await tx.getDigest(),gasBudget:'100000000'};
}
module.exports={expected,selected,inventoryFile};
