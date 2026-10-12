#!/usr/bin/env python3
"""Independently verify actual current C28 coin form signing-lock competition evidence."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from datetime import datetime, timezone

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--proof',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
 w=Path(__file__).resolve().parents[1];l=w/'migrationToGRpcOrGraphQLDoc/workLog';bf=l/'20261006-C28-name-production-build-01.json';build=json.loads(bf.read_text());proof=json.loads(a.proof.read_text());core=json.loads((l/'20261006-C28-observation-owner-audit-01.json').read_text())
 assert build['passed'] and core['passed'] and proof['passed'] and proof['source']==build['sourceAfter']
 assert proof['signatureCount']==0 and proof['realSignDataCompleted']==1 and proof['executeRequests']==proof['certificateChanges']==proof['originalSevenProfilesOpened']==0 and proof['blocked']==[]
 for f,h in build['artifacts'].items():assert sha(Path(build['output'])/f)==h
 assert proof['workerSource']['matchesDisk'] and proof['workerSource']['workerSha256']==build['artifacts']['background.js']
 for key in ['uiSource','secondUiSource','dappUiSource']:
  assert proof[key]['matchesDisk']
  for r in proof[key]['loadedBundles']:assert r['matchesDisk'] and r['loadedSha256']==build['artifacts'][r['file']]
 assert proof['signHoldSource']['workerSha256']==build['artifacts']['background.js'] and proof['signHoldSource']['mapSha256']==sha(Path(build['output'])/'background.js.map')
 assert proof['signHoldSource']['module']=='dapp-signing' and proof['signHoldSource']['receiverVerified'] and proof['signHoldSource']['producerSha256']==sha(w/'src/background/dapp-signing.ts')
 assert proof['heldSimulationsBefore']==len(proof['simulations'])==2 and len(proof['records'])==0
 assert proof['journalUnchanged'] and proof['initialJournal']==proof['heldJournal']==proof['finalJournal']
 assert proof['heldJournal']['journal-v2']==proof['heldJournal']['pending-scopes-v2']==[]
 assert any(c['name']=='new profile empty journal and pending' and c['passed'] for c in proof['checks'])
 assert all(c['passed']for c in proof['checks']) and len(proof['checks'])>=22
 assert '当前链账户正在签名或恢复' in proof['coinCompetitionText']
 assert proof['secondPreparationReply']['error'] is True
 layer=proof['dappRefusalLayer'];assert layer in ('network-admission-pending','execution-lock')
 expected='当前查询范围尚有未完成的身份或合同观察' if layer=='network-admission-pending' else '当前链账户正在签名或恢复，请稍后查看结果'
 assert proof['secondPreparationReply']['message']==expected and '网络费用估算失败' in proof['dappCompetitionText']
 clear=proof['beforeReleaseAdmission'];assert clear['owners']==[] and all(r['pending']==r['faults']==[]for r in clear['admission'])
 assert proof['releaseAt']-proof['heldAt']>=31000 and '网络准入记录未通过精确合同' in proof['originalResultError']
 for f,h in proof['inputsSha256'].items():assert sha(f)==h
 code=r'''const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions'),{verifyTransactionSignature}=require('rtd-typescript/verify');(async()=>{const p=JSON.parse(fs.readFileSync(process.argv[1])),r=p.originalApprovedTransaction,bytes=Buffer.from(r.bytesBase64,'base64'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(sha(bytes),r.bytesSha256);assert.equal(await Transaction.from(bytes).getDigest(),r.digest);const tx=Transaction.from(bytes).getData();assert.deepEqual(tx.gasData,r.gasData);assert.equal(tx.sender,tx.gasData.owner);for(const s of p.simulations){assert.equal(s.status,200);assert.equal(s.bytesBase64,r.bytesBase64);const raw=Buffer.from(s.requestBase64,'base64');assert.equal(raw[0],0);const q=GrpcTypes.SimulateTransactionRequest.fromBinary(raw.subarray(5,5+raw.readUInt32BE(1)));assert.equal(q.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);assert.equal(Buffer.from(q.transaction.bcs.value).toString('base64'),r.bytesBase64);const b=Buffer.from(s.responseBase64,'base64');assert.equal(b[0],0);const response=GrpcTypes.SimulateTransactionResponse.fromBinary(b.subarray(5,5+b.readUInt32BE(1)));assert.equal(response.transaction.effects.transactionDigest,r.digest);assert.equal(response.transaction.transaction.digest,r.digest);assert.equal(Buffer.from(response.transaction.transaction.bcs.value).toString('base64'),r.bytesBase64);assert.equal(response.transaction.effects.status.success,true)}const scope=JSON.parse(p.scopeKey);assert.equal(scope[0],2);assert.equal(scope[1],'3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj');assert.equal(scope[2],'dev-20261003-01');assert.equal(scope[3],tx.sender);console.log(JSON.stringify({passed:true,rawFramePairs:2,originalApprovedBytesVerified:true,returnedSignatures:0,exactScope:true}))})().catch(()=>{console.error(JSON.stringify({passed:false,stage:'independent wire/signature/scope verification'}));process.exitCode=1});'''
 wire=subprocess.run(['node','-e',code,str(a.proof.resolve())],cwd=w,capture_output=True,text=True,check=True);native=json.loads(wire.stdout.strip());assert native['passed']
 staking=False
 if 'stakingCompetition' in proof:
  r=proof['stakePreflight'];assert sha(r['file'])==r['sha256'];owned=json.loads(Path(r['file']).read_text());assert owned['passed'] and owned['readonly'] and owned['owner']==r['owner'] and owned['response']['objects'][0]['objectId']==r['objectId'] and owned['response']['objects'][0]['owner']['address']==r['owner']
  assert [row['kind'] for row in proof['stakingCompetition']]==['stake','unstake']
  for row in proof['stakingCompetition']:assert row['nativeScopeUnavailable'] and '当前链账户正在签名或恢复' in row['text']
  staking=True
 files=[a.proof,bf,l/'20261006-C28-observation-owner-audit-01.json',Path(__file__).resolve(),w/'scripts/lib/current-worker-production-sign-hold-verified.cjs',w/'scripts/lib/lifecycle-journal-snapshot.cjs']
 report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':proof['source'],'checks':11,'actualUiAssertions':len(proof['checks']),'wire':native,'signatureCount':0,'realSignDataCompleted':1,'executeRequests':0,'heldAndFinalJournalIndependentlyEqual':True,'initialCompleteJournalEqualityAssertedByActualRunner':True,'initialCompleteJournalRawSnapshotRecorded':True,'secondCoinFormRefused':True,'secondDappRefused':True,'secondDappRefusalLayer':layer,'secondDappLockAccepted':layer=='execution-lock','actualMinimumResultHoldMs':proof['releaseAt']-proof['heldAt'],'parentTx04Complete':False,'stakingRecoveryGateOnlyAccepted':staking,'stakingBusinessPreparationAccepted':False,'inputsSha256':{str(f):sha(f)for f in files},'scope':'Actual current production native same-scope unavailable in both UIs, second real coin form review disabled while original signer holds scope. Different real dApp popup approval disabled and actual backend recognizes either pending observation gate or execution lock. Its specific refusal layer is recorded without attributing a pending refusal to execution lock. Zero delivered signatures; actual original signer completed privately, generic stale/invalid egress refusal after actual hold beyond the 30s maximum lease lifetime. No unique failure cause claimed where concurrent context mutation may also invalidate the lease. Independent original approved bytes/digest and two original formal simulation frame pairs, worker/UI/map bytes and independently equal empty held/final journal snapshots. Initial/held/final complete journal snapshots were all recorded and independently compared. No persistent pending, NFT/Kiosk/staking full entry or parent completion claim.'}
 a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'checks':11,'actualUiAssertions':len(proof['checks'])}))
if __name__=='__main__':main()
