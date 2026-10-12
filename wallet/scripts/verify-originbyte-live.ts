// Strict wallet object readers verify controlled deployment results. No GraphQL claim.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { deriveDynamicFieldID, normalizeRtdAddress } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { KIOSK_BCS, KIOSK_ITEM_BCS, exactBcs } from '../src/shared/rpc/kiosk-reader';
import { originByteOwnerToken } from '../src/shared/rpc/originbyte-kiosk';
async function main() {
 const [rpc,h0,pkg,seedFile,existingFile,createFile,output]=process.argv.slice(2);
 assert.equal(new URL(rpc).hostname,'127.0.0.1');
 const read=(file:string)=>{const r=JSON.parse(readFileSync(file,'utf8')); assert.equal(r.expectedGenesisDigest,h0); assert.equal(r.result.effects.status.status,'success'); return r.result;};
 const seed=read(seedFile), existing=read(existingFile), created=read(createFile);
 const sourceNfts=seed.objectChanges.filter((x:any)=>x.type==='created' && x.objectType?.endsWith('::migration_nft::MigrationNFT'));
 assert.equal(sourceNfts.length,2);
 const packages={originByte:{discoveryPackage:pkg,executionPackage:pkg}};
 const session=new WalletReadSession(validateNetworkProfile({schemaVersion:2,id:'isolated-wallet-dev',displayName:'独立钱包开发链',sdkNetwork:'localnet',walletStandardChain:'rtd:localnet',generation:'dev-20261003-01',revision:1,expectedGenesisDigest:h0,endpoints:{fullnodeGrpcWeb:rpc},packages}));
 const evidence:any[]=[];
 try {
  const reader=new WalletFullnodeReader(session);
  for(const [receipt,owner] of [[existing,'0xaaa'],[created,'0xbbb']] as const) {
   const nftChange=receipt.objectChanges.find((x:any)=>sourceNfts.some((n:any)=>n.objectId===x.objectId)); assert(nftChange);
   const targetChange=owner==='0xaaa'?seed.objectChanges.find((x:any)=>x.objectType===`${pkg}::ob_kiosk::OwnerToken` && x.owner?.AddressOwner===normalizeRtdAddress(owner)):receipt.objectChanges.find((x:any)=>x.objectType===`${pkg}::ob_kiosk::OwnerToken`);
   assert(targetChange);
   const tokenObject=await reader.object(targetChange.objectId); assert(tokenObject);
   const token=originByteOwnerToken(tokenObject,normalizeRtdAddress(owner),packages); assert(token);
   const target=await reader.object(token.kioskId); assert(target);
   const content=exactBcs(KIOSK_BCS,target.content);
   assert.equal(content.owner,normalizeRtdAddress(owner)); assert.equal(content.item_count,1);
   const nft=await reader.object(nftChange.objectId); assert(nft);
   const wrapper=deriveDynamicFieldID(token.kioskId,'0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>',KIOSK_ITEM_BCS.serialize({id:nft.objectId}).toBytes());
   assert.deepEqual(nft.owner,{$kind:'ObjectOwner',ObjectOwner:wrapper});
   evidence.push({digest:receipt.digest,nft:nft.objectId,targetKiosk:token.kioskId,targetOwner:content.owner,ownerToken:token.objectId,wrapper,itemCount:content.item_count});
  }
  writeFileSync(output,JSON.stringify({verifiedAt:new Date().toISOString(),expectedGenesisDigest:h0,results:evidence,scope:'Direct ABI execution plus actual wallet Fullnode object/BCS/OwnerToken checks. No GraphQL discovery or extension approval acceptance.'},null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
 } finally {session.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
