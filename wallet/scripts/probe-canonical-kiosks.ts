// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Real production discovery and checks-enabled preparations; never sign or dispatch.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
import {WalletTransactionReader} from '../src/shared/rpc/transaction-reader';
import {prepareNftTransfer} from '../src/shared/rpc/nft-transfer-preparation';
import type {WalletRpc} from 'rtd-apps-core/src/rpc/WalletRpcContext';

async function main(){
  const [runtime,output]=process.argv.slice(2);assert(!existsSync(output));
  const read=(f:string)=>JSON.parse(readFileSync(f,'utf8'));
  const profile=validateNetworkProfile(read(join(runtime,'certified-release/profile.json')),{requireComplete:true});
  const source=read(join(runtime,'fixtures/framework-kiosk/result.json')).sender;
  const ob=read(join(runtime,'fixtures/originbyte-kiosk/result.json'));
  assert.equal(ob.h0,profile.expectedGenesisDigest);
  const session=new WalletReadSession(profile),fullnode=new WalletFullnodeReader(session);
  const results:any[]=[],requests:any[]=[];const original=globalThis.fetch;
  const allowed=new Set(Object.values(profile.endpoints).map(u=>new URL(u!).origin));
  globalThis.fetch=async(input,init)=>{
    const u=new URL(input instanceof Request?input.url:String(input));
    assert(allowed.has(u.origin));assert(!u.pathname.endsWith('/ExecuteTransaction'));
    const response=await original(input,init);requests.push({url:u.href,status:response.status});return response;
  };
  try{
    const reader=await WalletAssetReader.open(session,{minimumCheckpoint:ob.checkpoint,timeoutMs:60000});
    const kiosks=(await reader.kiosks(source)).value;
    assert.equal(kiosks.length,3);
    assert.equal(kiosks.filter(k=>k.kind==='originbyte').length,1);
    assert.equal(kiosks.filter(k=>k.kind==='framework'&&k.ownerCap.isPersonal).length,1);
    const txs=new WalletTransactionReader(session,{timeoutMs:60000});
    const rpc={bindingKey:session.bindingKey,readSessionKey:session.cacheKey,packages:profile.packages,
      readFreshObject:(id:string,signal?:AbortSignal)=>fullnode.object(id,signal),
      openAssetSnapshot:async()=>reader,
      prepareTransaction:(tx:any,owner:string,signal?:AbortSignal)=>txs.prepare(tx,owner,signal)} as unknown as WalletRpc;
    for(const kiosk of kiosks){
      for(const item of kiosk.items){
        const native=await fullnode.object(item.objectId);assert(native);
        assert.equal(item.digest,native.digest);assert.equal(item.version,native.version);
        assert.deepEqual(item.owner,native.owner);assert.deepEqual(item.content,native.content);
        const blocked=item.isLocked||item.listing?.isExclusive;
        const input={sender:source,to:ob.recipient,objectId:item.objectId,objectType:item.type};
        if(blocked){await assert.rejects(()=>prepareNftTransfer(rpc,input),/锁定或独占/);results.push({objectId:item.objectId,blocked:true,passed:true});continue;}
        const prepared=await prepareNftTransfer(rpc,input);
        const route=kiosk.kind==='originbyte'?'originbyte-kiosk':kiosk.ownerCap.isPersonal?'personal-kiosk':'framework-kiosk';
        assert.equal(prepared.route,route);results.push({objectId:item.objectId,route,digest:prepared.digest,passed:true});
      }
    }
    assert.equal(results.length,7);await reader.snapshot.revalidate();
    writeFileSync(output,JSON.stringify({passed:true,h0:profile.expectedGenesisDigest,checkpoint:reader.proof.checkpoint,results,requests,signatures:0,dispatches:0,browserAccepted:false},null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({passed:true,items:results.length,previews:results.filter(r=>r.route).length,denials:results.filter(r=>r.blocked).length}));
  }finally{session.close();globalThis.fetch=original;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
