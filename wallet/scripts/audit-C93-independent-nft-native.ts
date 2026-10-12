// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Native canonical evidence for the new fixture; no original account or dispatch.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { RtdGrpcClient } from 'rtd-typescript/grpc';
import { bcs } from 'rtd-typescript/bcs';
import { Transaction } from 'rtd-typescript/transactions';
import { verifyTransactionSignature } from 'rtd-typescript/verify';
import { normalizeStructTag, deriveDynamicFieldID } from 'rtd-typescript/utils';
import { exactBcs, KIOSK_BCS, KIOSK_CAP_BCS, PERSONAL_CAP_BCS, KIOSK_ITEM_BCS, KIOSK_LISTING_BCS, KIOSK_LOCK_BCS } from '../src/shared/rpc/kiosk-reader';
import { ORIGINBYTE_OWNER_TOKEN_BCS, ORIGINBYTE_EMPTY_KEY_BCS, ORIGINBYTE_TABLE_BCS, ORIGINBYTE_NFT_REF_BCS } from '../src/shared/rpc/originbyte-kiosk';

async function main() {
 const [op, output] = process.argv.slice(2); assert(!existsSync(output));
 const read = (f: string) => JSON.parse(readFileSync(f, 'utf8')), sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
 const intent = read(join(op, 'intent.json')), addresses = read(join(op, 'addresses.json')), binding = read(join(op, 'seed/route-binding.json'));
 const files = ['intent.json', 'prepared.json', 'addresses.json', 'fund/evidence.json', 'inspect/binding.json', 'inspect/policy.json', 'inspect/original-objects.json', 'seed/route-binding.json', ...['seed'].flatMap(s => [s+'/pending.json', s+'/unsigned.json', s+'/simulation.json', s+'/receipt.json', s+'/recovered.json', s+'/evidence.json', s+'/frames.json', s+'/original-objects-after.json'])].map(f => join(op, f));
 const pins = Object.fromEntries([...files, resolve(process.argv[1])].map(f => [f, sha(f)]));
 const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', mvr: { url: '' } });
 const fetch0 = globalThis.fetch, paths: string[] = [];
 globalThis.fetch = (input, init) => { const u = new URL(input instanceof Request ? input.url : String(input));
  assert(u.origin === 'http://127.0.0.1:41750' && ['/GetServiceInfo','/GetTransaction','/BatchGetObjects'].some(p => u.pathname.endsWith(p))); paths.push(u.href); return fetch0(input, init); };
 const identity = async () => assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, intent.h0);
 const nftCodec = bcs.struct('FixtureNFT', { id: bcs.Address, serial: bcs.u64() });
 async function object(id: string) { const o = (await client.core.getObject({ objectId: id, include: { content: true } })).object; assert(o && !(o instanceof Error)); return o; }
 async function field(parent: string, keyType: string, keyCodec: any, key: any, valueType: string, valueCodec: any) {
  const id = deriveDynamicFieldID(parent, keyType, keyCodec.serialize(key).toBytes()), o = await object(id);
  assert.equal(normalizeStructTag(o.type), normalizeStructTag(`0x2::dynamic_field::Field<${keyType},${valueType}>`)); assert.equal(o.owner.ObjectOwner, parent);
  const codec = bcs.struct('Field', { id: bcs.Address, name: keyCodec, value: valueCodec }), decoded: any = exactBcs(codec, o.content!);
  assert.equal(decoded.id, id); assert.deepEqual(decoded.name, key); return { objectId: id, decoded, nativeVersion: o.version, nativeDigest: o.digest };
 }
 try {
  await identity(); const transactions: any[] = []; let seed: any;
  for (const stage of ['seed']) {
   const pending = read(join(op, stage+'/pending.json')), original = read(join(op, stage+'/evidence.json')), bytes = Buffer.from(pending.bytesBase64, 'base64');
   assert(original.passed && original.digest === pending.digest && pending.sender === addresses.source);
   assert.equal(await Transaction.from(bytes).getDigest(), pending.digest); assert.equal((await verifyTransactionSignature(bytes, pending.signature)).toRtdAddress(), addresses.source);
   const data = bcs.TransactionData.parse(bytes); assert.equal(bcs.TransactionData.serialize(data).toBase64(), pending.bytesBase64); assert.equal(data.V1.gasData.owner, addresses.source);
   const native = await client.core.getTransaction({ digest: pending.digest, include: { bcs: true, effects: true, objectTypes: true } });
   assert(native.$kind === 'Transaction' && native.Transaction.status.success && native.Transaction.digest === pending.digest);
   assert.equal(String(native.Transaction.checkpoint), String(original.checkpoint)); assert.equal(Buffer.from(native.Transaction.bcs).toString('base64'), pending.bytesBase64);
   const effects = bcs.TransactionEffects.parse(native.Transaction.effects.bcs); assert.equal(effects.V2!.status.$kind, 'Success'); assert.equal(effects.V2!.transactionDigest, pending.digest);
   assert.equal(bcs.TransactionEffects.serialize(effects).toBase64(), Buffer.from(native.Transaction.effects.bcs).toString('base64'));
   transactions.push({ stage, digest: pending.digest, checkpoint: String(native.Transaction.checkpoint), canonicalBytesAndEffects: true, originalSignatureVerified: true });
   if (stage === 'seed') seed = native.Transaction;
  }
  const nftIds = Object.entries(seed.objectTypes).filter(([,type]) => normalizeStructTag(type as string) === normalizeStructTag(binding.nftType)).map(([id]) => id);
  assert.equal(nftIds.length, 6); const nfts: any[] = [];
  for (const id of nftIds) { const o = await object(id), value = exactBcs(nftCodec, o.content!); assert.equal(value.id, id); nfts.push({ objectId: id, value, owner: o.owner, version: o.version, digest: o.digest }); }
  assert.deepEqual(nfts.map(n => n.value.serial).sort(), ['1','2','3','4','5','6']);
  const idsOf = (type: string) => Object.entries(seed.objectTypes).filter(([,t]) => normalizeStructTag(t as string) === normalizeStructTag(type)).map(([id]) => id);
  const nativeCaps = idsOf('0x2::kiosk::KioskOwnerCap');
  const caps = [];
  for (const id of nativeCaps) {
   try { const o = await object(id); if (o.owner.AddressOwner === addresses.source) caps.push({ object: o, value: exactBcs(KIOSK_CAP_BCS,o.content!) }); }
   catch (e: any) { if (e.reason !== 'notFound') throw e; }
  }
  assert.equal(caps.length, 1); const frameworkCap = caps[0], frameworkId = frameworkCap.value.for;
  const personals = idsOf(binding.personalPackage+'::personal_kiosk::PersonalKioskCap'); assert.equal(personals.length, 1);
  const personal = await object(personals[0]); assert.equal(personal.owner.AddressOwner, addresses.source);
  const personalValue = exactBcs(PERSONAL_CAP_BCS, personal.content!); assert(personalValue.cap && personalValue.id === personal.objectId);
  const personalId = personalValue.cap.for;
  const kiosks = [];
  for (const [kind, id, count] of [['framework',frameworkId,4],['personal',personalId,1]] as const) {
   const o = await object(id), value = exactBcs(KIOSK_BCS,o.content!); assert(o.owner.Shared && value.id === id && value.owner === addresses.source && value.item_count === count); kiosks.push({kind,objectId:id,value,owner:o.owner});
  }
  const wrapperCodec = bcs.struct('Wrapper',{name:KIOSK_ITEM_BCS}), itemFields = [];
  for (const n of nfts) {
   if (n.value.serial === '6') { assert.equal(n.owner.AddressOwner, addresses.source); continue; }
   const parent = n.value.serial === '5' ? personalId : frameworkId;
   const f = await field(parent,'0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>',wrapperCodec,{name:{id:n.objectId}},'0x2::object::ID',bcs.Address);
   assert.equal(f.decoded.value,n.objectId); assert.equal(n.owner.ObjectOwner,f.objectId); itemFields.push(f);
  }
  const n2=nfts.find(n=>n.value.serial==='2'),n3=nfts.find(n=>n.value.serial==='3'),n4=nfts.find(n=>n.value.serial==='4');
  const ordinary=await field(frameworkId,'0x2::kiosk::Listing',KIOSK_LISTING_BCS,{id:n2.objectId,is_exclusive:false},'u64',bcs.u64());assert.equal(ordinary.decoded.value,'1000000');
  const lock=await field(frameworkId,'0x2::kiosk::Lock',KIOSK_LOCK_BCS,{id:n3.objectId},'bool',bcs.bool());assert.equal(lock.decoded.value,true);
  const exclusive=await field(frameworkId,'0x2::kiosk::Listing',KIOSK_LISTING_BCS,{id:n4.objectId,is_exclusive:true},'u64',bcs.u64());assert.equal(exclusive.decoded.value,'1000000');
  const ob=binding.originBytePackage.discoveryPackage, tokens=idsOf(ob+'::ob_kiosk::OwnerToken');assert.equal(tokens.length,2);const originByte:any[]=[];
  for(const id of tokens){
   const o=await object(id),v=exactBcs(ORIGINBYTE_OWNER_TOKEN_BCS,o.content!);assert(v.id===id&&o.owner.AddressOwner===v.owner&&[addresses.source,addresses.existingTarget].includes(v.owner));
   const k=await object(v.kiosk),kv=exactBcs(KIOSK_BCS,k.content!);assert(k.owner.Shared&&kv.id===v.kiosk&&kv.owner===v.owner&&kv.allow_extensions);assert.equal(kv.item_count,v.owner===addresses.source?2:0);
   const cap=await field(v.kiosk,ob+'::ob_kiosk::KioskOwnerCapDfKey',ORIGINBYTE_EMPTY_KEY_BCS,{dummy_field:false},'0x2::kiosk::KioskOwnerCap',KIOSK_CAP_BCS);assert.equal(cap.decoded.value.for,v.kiosk);
   const version=await field(v.kiosk,ob+'::ob_kiosk::VersionDfKey',ORIGINBYTE_EMPTY_KEY_BCS,{dummy_field:false},'u64',bcs.u64());assert.equal(version.decoded.value,'3');
   const table=await field(v.kiosk,ob+'::ob_kiosk::NftRefsDfKey',ORIGINBYTE_EMPTY_KEY_BCS,{dummy_field:false},`0x2::table::Table<0x2::object::ID,${ob}::ob_kiosk::NftRef>`,ORIGINBYTE_TABLE_BCS);assert.equal(table.decoded.value.size,v.owner===addresses.source?'2':'0');
   originByte.push({owner:v.owner,tokenId:id,kioskId:v.kiosk,kiosk:kv,cap,table,version});
  }
  const sourceOb=originByte.find(r=>r.owner===addresses.source), obNfts:any[]=[];
  for(const id of idsOf(binding.oldNftPackage+'::migration_nft::MigrationNFT')){
   const o=await object(id),v=exactBcs(nftCodec,o.content!);assert.equal(v.id,id);
   const f=await field(sourceOb.kioskId,'0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>',wrapperCodec,{name:{id}},'0x2::object::ID',bcs.Address);assert.equal(o.owner.ObjectOwner,f.objectId);assert.equal(f.decoded.value,id);
   const ref=await field(sourceOb.table.decoded.value.id,'0x2::object::ID',bcs.Address,id,ob+'::ob_kiosk::NftRef',ORIGINBYTE_NFT_REF_BCS);assert(!ref.decoded.value.is_exclusively_listed&&ref.decoded.value.auths.contents.length===0);obNfts.push({objectId:id,value:v,owner:o.owner,item:f,ref});
  }
  assert.deepEqual(obNfts.map(n=>n.value.serial).sort(),['1','2']);
  const purchaseIds=idsOf('0x2::kiosk::PurchaseCap<'+binding.nftType+'>');assert.equal(purchaseIds.length,1);
  const purchaseObject=await object(purchaseIds[0]);assert.equal(purchaseObject.owner.AddressOwner,addresses.source);
  const purchaseCodec=bcs.struct('PurchaseCap',{id:bcs.Address,kiosk_id:bcs.Address,item_id:bcs.Address,min_price:bcs.u64()});
  const purchaseValue:any=exactBcs(purchaseCodec,purchaseObject.content!);assert.equal(purchaseValue.id,purchaseObject.objectId);assert.equal(purchaseValue.kiosk_id,frameworkId);assert.equal(purchaseValue.item_id,n4.objectId);assert.equal(purchaseValue.min_price,'1000000');
  const originalBefore=read(join(op,'inspect/original-objects.json')), originalAfter:any[]=[];
  const normalizeObject=(o:any)=>({objectId:o.objectId,version:o.version,digest:o.digest,owner:o.owner,type:normalizeStructTag(o.type),contentBase64:Buffer.from(o.content).toString('base64')});
  for(const row of originalBefore)originalAfter.push(normalizeObject(await object(row.objectId)));
  assert.deepEqual(originalAfter,originalBefore);const policy=read(join(op,'inspect/policy.json'));assert.deepEqual([normalizeObject(await object(policy[0].objectId))],policy);
  await identity(); for(const[f,h]of Object.entries(pins))assert.equal(sha(f),h);
  const report={passed:true,observedAt:new Date().toISOString(),h0:intent.h0,operation:op,addresses,transactions,nfts,kiosks,canonicalCapabilityCount:5,purchaseCap:{objectId:purchaseObject.objectId,value:purchaseValue},original13AndPolicyHeld:true,frameworkCap:{objectId:frameworkCap.object.objectId,value:frameworkCap.value},personalCap:{objectId:personal.objectId,value:personalValue},itemFields,ordinaryListing:ordinary,lock,exclusiveListing:exclusive,originByte,obNfts,paths,simulations:0,signatures:0,executeRequests:0,inputsSha256:pins,indexedAccepted:false,chromeAccepted:false,scope:'Independent single new fixture seed/signature/canonical bytes/effects; all original thirteen objects/policy unchanged, five exact capability bodies, six exact NFT, nonempty4+1 framework/Personal with real Item/Listing/Lock and wrapped cap, direct6, two OriginByte tokens/kiosks/private cap/version/registration table+refs and two items. No current indexed/Chrome transfer or actual take simulation by this native readonly audit.'};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,nfts:8,frameworkItemCount:4,personalItemCount:1,executeRequests:0}));
 }finally{globalThis.fetch=fetch0;}
}
main().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,500)}));process.exitCode=1;});
