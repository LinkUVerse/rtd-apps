#!/usr/bin/env python3
"""Independently verify actual current C28 coin/dApp signing-lock competition evidence."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from datetime import datetime, timezone

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--proof',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
 w=Path(__file__).resolve().parents[1];l=w/'migrationToGRpcOrGraphQLDoc/workLog';bf=l/'20261006-C28-name-production-build-01.json';build=json.loads(bf.read_text());proof=json.loads(a.proof.read_text());core=json.loads((l/'20261006-C28-observation-owner-audit-01.json').read_text())
 assert build['passed'] and core['passed'] and proof['passed'] and proof['source']==build['sourceAfter']
 assert proof['signatureCount']==1 and proof['executeRequests']==proof['certificateChanges']==proof['originalSevenProfilesOpened']==0 and proof['blocked']==[]
 for f,h in build['artifacts'].items():assert sha(Path(build['output'])/f)==h
 assert proof['workerSource']['matchesDisk'] and proof['workerSource']['workerSha256']==build['artifacts']['background.js']
 for key in ['uiSource','secondUiSource']:
  assert proof[key]['matchesDisk']
  for r in proof[key]['loadedBundles']:assert r['matchesDisk'] and r['loadedSha256']==build['artifacts'][r['file']]
 assert proof['signHoldSource']['workerSha256']==build['artifacts']['background.js'] and proof['signHoldSource']['mapSha256']==sha(Path(build['output'])/'background.js.map')
 assert proof['signHoldSource']['module']=='dapp-signing' and proof['signHoldSource']['receiverVerified'] and proof['signHoldSource']['producerSha256']==sha(w/'src/background/dapp-signing.ts')
 assert proof['heldSimulationsBefore']==len(proof['simulations'])==2 and len(proof['records'])==1
 assert proof['initialJournal']==proof['heldJournal']==proof['finalJournal']
 assert proof['initialJournal']['journal-v2']==proof['initialJournal']['pending-scopes-v2']==[]
 assert all(c['passed']for c in proof['checks']) and len(proof['checks'])>=24
 assert '当前链账户正在签名或恢复' in proof['coinCompetitionText'] and '网络费用估算失败' in proof['dappCompetitionText']
 assert proof['secondPreparationReply']['error'] is True and proof['secondPreparationReply']['message']=='当前链账户正在签名或恢复，请稍后查看结果'
 assert proof['preparationAttempts'][-1]['reply']==proof['secondPreparationReply']
 for r in proof['preparationAttempts'][:-1]:assert r['reply']['error'] is True and r['reply']['message']=='当前查询范围尚有未完成的身份或合同观察'
 for f,h in proof['inputsSha256'].items():assert sha(f)==h
 code=r'''const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions'),{verifyTransactionSignature}=require('rtd-typescript/verify');(async()=>{const p=JSON.parse(fs.readFileSync(process.argv[1])),r=p.records[0],bytes=Buffer.from(r.bytesBase64,'base64'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(sha(bytes),r.bytesSha256);assert.equal(await Transaction.from(bytes).getDigest(),r.digest);const tx=Transaction.from(bytes).getData(),key=await verifyTransactionSignature(bytes,r.signature);assert.equal(key.toRtdAddress(),tx.sender);assert.deepEqual(tx.gasData,r.gasData);assert.equal(tx.sender,tx.gasData.owner);for(const s of p.simulations){assert.equal(s.status,200);assert.equal(s.bytesBase64,r.bytesBase64);const raw=Buffer.from(s.requestBase64,'base64');assert.equal(raw[0],0);const q=GrpcTypes.SimulateTransactionRequest.fromBinary(raw.subarray(5,5+raw.readUInt32BE(1)));assert.equal(q.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);assert.equal(Buffer.from(q.transaction.bcs.value).toString('base64'),r.bytesBase64);const b=Buffer.from(s.responseBase64,'base64');assert.equal(b[0],0);const response=GrpcTypes.SimulateTransactionResponse.fromBinary(b.subarray(5,5+b.readUInt32BE(1)));assert.equal(response.transaction.digest,r.digest);assert.equal(response.transaction.effects.status.success,true)}const scope=JSON.parse(p.scopeKey);assert.equal(scope[0],2);assert.equal(scope[1],'3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj');assert.equal(scope[2],'dev-20261003-01');assert.equal(scope[3],tx.sender);console.log(JSON.stringify({passed:true,rawFramePairs:2,originalSignatureVerified:true,exactScope:true}))})().catch(()=>{console.error(JSON.stringify({passed:false,stage:'independent wire/signature/scope verification'}));process.exitCode=1});'''
 wire=subprocess.run(['node','-e',code,str(a.proof.resolve())],cwd=w,capture_output=True,text=True,check=True);native=json.loads(wire.stdout.strip());assert native['passed']
 files=[a.proof,bf,l/'20261006-C28-observation-owner-audit-01.json',Path(__file__).resolve(),w/'scripts/lib/current-worker-production-sign-hold-verified.cjs',w/'scripts/lib/lifecycle-journal-snapshot.cjs']
 report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':proof['source'],'checks':11,'actualUiAssertions':len(proof['checks']),'wire':native,'signatureCount':1,'executeRequests':0,'fullJournalUnchanged':True,'secondCoinFormAndDappRefused':True,'parentTx04Complete':False,'inputsSha256':{str(f):sha(f)for f in files},'scope':'Actual current production native same-scope unavailable in both UIs, second real coin form review disabled and different real dApp popup approval disabled. Settled backend preparation specifically reaches execution-lock refusal after any earlier read-admission pending. Independent original signature, two original formal simulation frame pairs, worker/UI/map bytes and unchanged empty complete journal. No persistent pending, NFT/Kiosk/staking full entry or parent completion claim.'}
 a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'checks':11,'actualUiAssertions':len(proof['checks'])}))
if __name__=='__main__':main()
