// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Reuse a public, historical dev fixture; no credentials, signing or deployment.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
import {groupCollectibles,collectibleKioskCap,directlyOwnedAsset} from '../src/shared/rpc/nft-assets';
const L='migrationToGRpcOrGraphQLDoc/workLog';
const files=[__filename,`${L}/20261007-positive-C39-direct-display-native-audit-03.json`,'/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json'];
(async()=>{
 const old=JSON.parse(readFileSync(files[1],'utf8')),profile=validateNetworkProfile(JSON.parse(readFileSync(files[2],'utf8')));assert(old.passed);assert.equal(old.h0,profile.expectedGenesisDigest);
 const session=new WalletReadSession(profile),native=new WalletFullnodeReader(session),original=globalThis.fetch.bind(globalThis),calls:any[]=[];
 globalThis.fetch=async(input,init)=>{const url=String(input);assert(url.startsWith('http://127.0.0.1:41750/')||url==='http://127.0.0.1:41957/graphql');assert(!/Execute|Simulate|VerifySignature/.test(url));const r=await original(input,init);calls.push({url,status:r.status,requestBase64:Buffer.from(init?.body as any??'').toString('base64'),responseBase64:Buffer.from(await r.clone().arrayBuffer()).toString('base64')});return r;};
 try{
  const object=await native.object(old.nftId);assert(object&&directlyOwnedAsset(object,old.recipient));
  const snapshot=await WalletAssetReader.open(session),owned=await snapshot.ownedObjects(old.recipient),group=groupCollectibles(owned.value,[],profile.packages),item=group.visual.find(o=>o.objectId===old.nftId);
  assert(item&&!collectibleKioskCap(item,profile.packages));assert(directlyOwnedAsset(item,old.recipient));assert.equal(item.version,object.version);assert.equal(item.digest,object.digest);assert.equal(item.display?.output?.name,'Migration Display V2');assert.equal(item.display?.output?.image_url,'http://127.0.0.1:41718/display-v2.png');
  const result={passed:true,observedAt:new Date().toISOString(),scope:'Current native ownership and admitted Display of existing G3 fixture; not C51 import or hide/restore acceptance',h0:profile.expectedGenesisDigest,owner:old.recipient,objectId:old.nftId,native:object,indexed:item,snapshot:snapshot.proof.checkpoint,hideEligible:true,calls,credentialReads:0,signatures:0,executions:0,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
  writeFileSync(`${L}/20261011-C262-existing-display-01.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,owner:old.recipient,objectId:old.nftId,snapshot:snapshot.proof.checkpoint,hideEligible:true,requests:calls.length}));
 }finally{globalThis.fetch=original;session.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
