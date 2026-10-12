#!/usr/bin/env python3
"""Readonly complete QA-A10 contract audit; no new execution or browser mutation."""
from pathlib import Path
from datetime import datetime, timezone
import argparse, hashlib, importlib.util, json, re
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
w=Path(__file__).resolve().parents[1];d=w/'migrationToGRpcOrGraphQLDoc';l=d/'workLog'
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
tracked=set()
def proof(name):
 f=l/name;tracked.add(f);return read(f)
def inputs(r):
 for f,h in r.get('inputsSha256',{}).items():assert sha(f)==h
spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b);h,n=b.source_hash(w)
build=proof('20261006-sponsored-execute-production-build-01.json');assert build['passed'] and build['sourceAfter']=={'sha256':h,'files':n} and n==1108
for f,digest in build['artifacts'].items():assert sha(Path(build['output'])/f)==digest
previous=proof('20261006-auth-completion-audit-02.json');assert previous['passed'] and previous['parentsComplete']==68 and previous['tx07ContractComplete'] and previous['tx10ContractComplete'] and previous['source']==build['sourceAfter']
for row in previous['proofs']:assert sha(row['file'])==row['sha256']
inputs(previous)
verify=proof('20261006-sponsored-execute-verification-01.json');assert verify['passed'] and verify['full']=={'files':179,'tests':2525,'exitCode':0} and verify['prodTypesExitCode']==0
debug=proof('20261006-QA-A10-debug-01.json');assert debug['passed'] and len(debug['debugBinaries'])==8
root=w.parents[1]
for f,digest in debug['debugBinaries'].items():assert sha(root/'rtd/target/debug'/f)==digest
cases=[]
for event,run in [('receipt-abort','02'),('popup','01'),('timeout','01')]:
 name=f'20261006-QA-A10-{event}-{run}';r=proof(name+'.json');audit=proof(f'20261006-QA-A10-{event}-audit-01.json');assert r['passed'] and audit['passed'] and r['checkCount']==len(r['checks'])==audit['actualChromeChecks']==107
 assert r['signatures']==audit['actualSignatures']==4 and r['executeRequests']==r['executions']==audit['actualBrowserExecuteRequests']==1 and r['faucetRequests']==1 and r['simulations']==audit['actualSimulations']==(8 if event=='popup' else 6)
 assert r['certificateChanges']==r['originalProfilesOpened']==0 and r['actualOneShotRecoveryAccepted'] and not r['actualWalletExecutionAccepted']
 assert audit['source']==build['sourceAfter'] and audit['event']==event and audit['proofSha256']==sha(audit['proofFile']) and Path(audit['proofFile'])==l/(name+'.json')
 assert all(audit[k] for k in ['newWorkerLockedPending','oldWorkerActuallyDisposed','freeExecutionLockCannotBypassPending','secondWindowPendingPreparationDenied'])
 assert audit['auditExecuteRequests']==audit['auditSimulations']==audit['auditSignatures']==audit['certificateChanges']==0 and not audit['normalChromeHttpsAccepted']
 assert audit['actualTerminalTransactionAbortVerified']==(event=='receipt-abort') and audit['actualOriginalDeadlineVerified']==(event=='timeout') and audit['beforeAndAfterDispatchPopupCloseVerified']==(event=='popup')
 inputs(r);inputs(audit)
 snapshot=proof(name+'-inputs/manifest.json');assert snapshot['completeRelativePathNames'] and snapshot['syntaxChecksPassed']
 for row in snapshot['files']:assert sha(row['source'])==sha(row['snapshot'])==row['sha256'];tracked.add(Path(row['snapshot']))
 for stage in r['stages']:
  assert stage['observationsSettledBeforeExit'] and stage['workerSource']['matchesDisk'] and stage['uiSource']['matchesDisk'] and stage['workerSource']['workerSha256']==build['artifacts']['background.js']
  for row in stage['uiSource']['loadedBundles']:assert row['loadedSha256']==build['artifacts'][row['file']]
 fixture=Path(r['fixture'])/'lifecycle-0';execution=r['personalMessages'][0]['execution'];assert read(fixture/'confirmed.json')==execution
 for f in fixture.glob('*.json'):tracked.add(f)
 assert execution['terminal']['state']=='confirmed-success' and execution['automaticRecovery'] and execution['nativeEffectsMatch'] and execution['signatureVerified']
 assert execution['digest']==audit['receipt']['digest'] and execution['terminal']['receipt']['effectsBase64']==audit['receipt']['effectsBase64']
 cases.append({'event':event,'checks':107,'signatures':4,'simulations':r['simulations'],'executeRequests':1,'digest':audit['receipt']['digest']})
assert len({r['digest'] for r in cases})==3
failed=proof('20261006-QA-A10-receipt-abort-01.json');assert not failed['passed'] and failed['signatures']=='not-counted' and failed['executeRequests']==1 and Path(failed['fixture']).exists()
snapshot=proof('20261006-QA-A10-receipt-abort-01-inputs/manifest.json')
for row in snapshot['files']:assert sha(row['snapshot'])==row['sha256'];tracked.add(Path(row['snapshot']))
for f in (Path(failed['fixture'])/'lifecycle-0').glob('*.json'):tracked.add(f)
native=proof('20261006-QA-A10-retained-abort-native-01.json');recovery=proof('20261006-QA-A10-retained-abort-recovery-01.json');inputs(native);inputs(recovery)
assert native['passed'] and recovery['passed'] and native['initialWholeRunPassed']==recovery['initialWholeRunPassed']==False and native['initialSignatures']==recovery['initialSignatures']=='not-counted'
assert native['nativeOriginalBcsSignatureEffectsVerified'] and native['originalStrictTerminalAbortVerified'] and native['originalPendingRecorded'] and not native['originalPendingClearedByAudit']
assert native['proofSha256']==sha(native['proofFile'])==recovery['failedProofSha256'] and recovery['nativeAuditSha256']==sha(recovery['nativeAuditFile'])
assert recovery['originalFailedProfileRecovered'] and recovery['allAccountsRemainLocked'] and recovery['encryptedSourceUnchanged'] and recovery['observationsSettledBeforeExit'] and recovery['digest']==native['digest']
assert recovery['executeRequests']==recovery['simulations']==recovery['signatures']==recovery['faucetRequests']==recovery['certificateChanges']==recovery['originalSevenProfilesOpened']==0
assert recovery['workerSource']['before']['workerSha256']==build['artifacts']['background.js']
parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==len({r[1] for r in parents})==98;status={i:m=='x' for m,i in parents};count=sum(status.values());assert status['TX-07'] and status['TX-10'] and count==(69 if status['QA-A10'] else 68)
tracked.add(l/'20261006-QA-A10-current-design.md')
report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'currentRevision':'C21','source':build['sourceAfter'],'qa10ContractComplete':True,'qa10MarkedComplete':status['QA-A10'],'parentsComplete':count,'parentsTotal':98,'trialReady':False,'normalChromeHttpsAccepted':False,'cases':cases,'actualCurrentChecks':321,'actualCurrentSignatures':12,'actualCurrentSimulations':20,'actualCurrentOneShotExecutions':3,'failedFirstWholeRunPreserved':True,'failedFirstSignatures':'not-counted','failedFirstActualExecuteRequests':1,'failedFirstOriginalProfileRecovered':True,'retainedRecoveryNewExecuteRequests':0,'certificateChanges':0,'originalSevenProfilesOpened':0,'physicalPowerLossClaimed':False,'independentWorkerHardKillClaimed':False,'proofs':[{'file':str(f),'sha256':sha(f)} for f in sorted(tracked)],'inputsSha256':{str(Path(__file__).resolve()):sha(__file__)},'scope':'Complete original QA-A10: before/after dispatch popup closure, original reader deadline despite real chain success, strict native terminal IDB abort, old worker disposal/new locked worker, free Web Lock plus second window blocked by durable pending, independent original BCS/signature/effects and original failed profile recovery. Normal context closure verified; no physical power loss, independent hard kill or normal Chrome HTTPS/trial claim.'}
a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'qa10ContractComplete':True,'parentsComplete':count,'checks':321}))
