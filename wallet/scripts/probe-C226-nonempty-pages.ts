// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Public dev fixture addresses only; no credential access, signing or execution.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletBalanceReader } from '../src/shared/rpc/balance-reader';
import { WalletCoinMetadataReader } from '../src/shared/rpc/coin-metadata-reader';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletAccountHistoryReader } from '../src/shared/rpc/account-history-reader';

async function main() {
  const profileFile = '/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json';
  const fixtureFile = 'migrationToGRpcOrGraphQLDoc/workLog/20261008-C102-full-post-write-positive-02.json';
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  const previous = JSON.parse(readFileSync(fixtureFile, 'utf8'));
  assert(previous.passed && previous.h0 === profile.expectedGenesisDigest);
  const owners = Object.entries(previous.owners).map(([role, row]) => ({ role, address: (row as {address:string}).address }));
  assert.equal(owners.length, 3);
  const original = globalThis.fetch.bind(globalThis), calls: any[] = [], samples: any[] = [];
  globalThis.fetch = async(input, init) => {
    const url = String(input);
    assert(Object.values(profile.endpoints).some(base => typeof base === 'string' && url.startsWith(base)));
    assert.equal(init?.method, 'POST');
    const started = Date.now(), index = calls.length;
    const row: any = { index, url, startedAt: new Date(started).toISOString() };
    calls.push(row);
    if(typeof init?.body === 'string') {
      try { row.request = JSON.parse(init.body); } catch { row.requestBase64 = Buffer.from(init.body).toString('base64'); }
    }
    try {
      const response = await original(input, init);
      row.status = response.status;
      row.headers = Object.fromEntries(response.headers);
      row.responseBase64 = Buffer.from(await response.clone().arrayBuffer()).toString('base64');
      row.milliseconds = Date.now() - started;
      return response;
    } catch(error) { row.error = String(error); row.milliseconds = Date.now() - started; throw error; }
  };
  let passed = true;
  try {
    for(const owner of owners) {
      for(const scenario of ['balances-metadata', 'assets-kiosks', 'history']) {
        const session = new WalletReadSession(profile), start = Date.now(), offset = calls.length;
        try {
          let result: unknown;
          if(scenario === 'balances-metadata') {
            const [balances, metadata] = await Promise.all([
              WalletBalanceReader.read(session, owner.address),
              WalletCoinMetadataReader.read(session, '0x2::rtd::RTD'),
            ]);
            assert.equal(metadata.value?.decimals, 9);
            result = { balances: balances.value, balanceSnapshot: balances.snapshot.checkpoint, metadataSnapshot: metadata.snapshot.checkpoint };
          } else if(scenario === 'assets-kiosks') {
            const reader = await WalletAssetReader.open(session);
            const [objects, kiosks] = await Promise.all([reader.ownedObjects(owner.address), reader.kiosks(owner.address)]);
            result = { snapshot: reader.proof.checkpoint, objects: objects.value.map(o=>({objectId:o.objectId,type:o.type,version:o.version})),
              kiosks: kiosks.value.map(k=>({kioskId:k.kioskId,kind:k.kind,items:k.items.map(i=>({objectId:i.objectId,version:i.version}))})) };
          } else {
            result = await new WalletAccountHistoryReader(session).read(owner.address);
          }
          samples.push({role:owner.role,address:owner.address,scenario,passed:true,milliseconds:Date.now()-start,requestStart:offset,requestCount:calls.length-offset,result});
        } catch(error) {
          passed=false;samples.push({role:owner.role,address:owner.address,scenario,passed:false,milliseconds:Date.now()-start,requestStart:offset,requestCount:calls.length-offset,error:String(error)});
        } finally {session.close();}
      }
    }
  } finally {globalThis.fetch=original;}
  const report={passed,observedAt:new Date().toISOString(),scope:'Current production readers and C51 services with three public existing dev fixture addresses; CLI only, not ordinary Chrome or parent acceptance.',
    h0:profile.expectedGenesisDigest,samples,calls,credentialReads:0,signatures:0,executions:0,
    inputsSha256:Object.fromEntries([profileFile,fixtureFile,process.argv[1]].map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))};
  writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed,samples:samples.map(({result,...row})=>({...row,resultKind:result?typeof result:undefined}))}));
  if(!passed)process.exitCode=1;
}
main().catch(error=>{console.error(String(error));process.exitCode=1;});
