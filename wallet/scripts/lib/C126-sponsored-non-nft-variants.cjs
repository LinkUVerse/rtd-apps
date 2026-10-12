// Construct only the declared non-NFT sponsor delta; original requests remain unchanged.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Transaction}=require('rtd-typescript/transactions'),{bcs}=require('rtd-typescript/bcs');
const original=require('./C117-non-nft-validity-audit.cjs');
const inventoryFile=path.resolve(__dirname,'../../migrationToGRpcOrGraphQLDoc/workLog/20261009-C126-non-nft-sponsor-inventory-02.json');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function inventory(){const p=JSON.parse(fs.readFileSync(inventoryFile));assert(p.passed&&p.nativeReadRequests===10&&p.executeRequests===0&&p.faucetRequests===0&&p.nftBusinessRequests===0);for(const[f,h]of Object.entries(p.inputsSha256))assert.equal(sha(f),h);assert.notEqual(p.sender,p.sponsor);return p;}
async function prepare(prepared,kind){
 const p=inventory(),source=original.requireNonNft(prepared,kind,p.sender),data=structuredClone(source),pt=data.V1.kind.ProgrammableTransaction;
 const sender=p.selected.find(r=>r.role==='sender'),sponsor=p.selected.find(r=>r.role==='sponsor');assert(sender.owner===p.sender&&sponsor.owner===p.sponsor);
 const ref=c=>({objectId:c.objectId,version:String(c.version),digest:c.digest});
 if(kind!=='withdraw'){
  assert.equal(pt.commands[0].$kind,'SplitCoins');assert.deepEqual(pt.commands[0].SplitCoins.coin,{$kind:'GasCoin',GasCoin:true});
  assert.equal(JSON.stringify(pt).match(/"\$kind":"GasCoin"/g).length,1);
  const index=pt.inputs.length;pt.inputs.push({$kind:'Object',Object:{$kind:'ImmOrOwnedObject',ImmOrOwnedObject:ref(sender.coin)}});
  pt.commands[0].SplitCoins.coin={$kind:'Input',Input:index};
 }
 assert(!JSON.stringify(pt).includes('GasCoin'));data.V1.gasData.owner=p.sponsor;data.V1.gasData.payment=[ref(sponsor.coin)];data.V1.gasData.budget='100000000';
 const bytes=Buffer.from(bcs.TransactionData.serialize(data).toBytes()),tx=Transaction.from(bytes),bytesBase64=bytes.toString('base64');
 assert.deepEqual(bcs.TransactionData.parse(bytes),data);assert.equal(Buffer.from(await Transaction.from(await tx.toJSON()).build()).toString('base64'),bytesBase64);
 return {...prepared,bytesBase64,digest:await tx.getDigest(),gasBudget:'100000000',sponsorContract:{inventoryFile,inventorySha256:sha(inventoryFile),sender:p.sender,sponsor:p.sponsor,sourceDigest:prepared.digest,sourceBytesBase64:prepared.bytesBase64,senderCoin:ref(sender.coin),sponsorCoin:ref(sponsor.coin)}};
}
module.exports={prepare,inventory,inventoryFile};
