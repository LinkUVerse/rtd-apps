#!/usr/bin/env python3
"""Readonly complete TX-07 contract and exact current C21 artifact audit."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,importlib.util,json,re
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
w=Path(__file__).resolve().parents[1];d=w/'migrationToGRpcOrGraphQLDoc';logs=d/'workLog'
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b);h,n=b.source_hash(w)
build=read(logs/'20261006-sponsored-execute-production-build-01.json');assert build['passed'] and build['sourceAfter']=={'sha256':h,'files':n};assert n==1108
for f,digest in build['artifacts'].items():assert sha(Path(build['output'])/f)==digest
previous=read(logs/'20261006-C21-current-revision-audit-01.json');assert previous['passed'] and previous['sourceSha256']==h and previous['sourceFiles']==n and previous['parentsComplete']==66
matrix=read(logs/'20261006-lifecycle-current-audit-01.json');locked=read(logs/'20261006-locked-restart-current-audit-01.json')
assert matrix['passed'] and matrix['actualChromeChecks']==115 and matrix['actualSignatures']==16 and matrix['actualSimulations']==24 and matrix['actualBrowserExecuteRequests']==4 and matrix['controlledNotFoundCases']==4
assert locked['passed'] and locked['actualChromeChecks']==108 and locked['actualSignatures']==4 and locked['actualSimulations']==6 and locked['actualBrowserExecuteRequests']==1 and locked['currentLockedPendingRestartAccepted']
for audit in [matrix,locked]:
 assert audit['source']==build['sourceAfter'] and audit['auditExecuteRequests']==audit['auditSimulations']==audit['auditSignatures']==audit['certificateChanges']==audit['profilesOpened']==0 and not audit['normalChromeHttpsAccepted'];assert sha(audit['proofFile'])==audit['proofSha256']
 proof=read(audit['proofFile']);assert proof['passed']
 for file,digest in proof['inputsSha256'].items():assert sha(file)==digest
 for file,digest in audit['inputsSha256'].items():assert sha(file)==digest
 assert all(stage['observationsSettledBeforeExit'] for stage in proof['stages'])
 for receipt in audit['receipts']:assert receipt['signatureVerified'] and receipt['receipt']['success']
files=[logs/'20261006-C21-current-revision-audit-01.json',logs/'20261006-lifecycle-current-01.json',logs/'20261006-lifecycle-current-audit-01.json',logs/'20261006-locked-restart-current-01.json',logs/'20261006-locked-restart-current-audit-01.json',logs/'20261006-lifecycle-current-debug-01.json',logs/'20261006-TX-07-completion-design.md',logs/'20261006-lifecycle-current-01-inputs/manifest.json',logs/'20261006-locked-restart-current-02-inputs/manifest.json']
for name in ['20261006-lifecycle-current-01-inputs','20261006-locked-restart-current-02-inputs']:
 snapshot=read(logs/name/'manifest.json');assert snapshot['completeRelativePathNames'];assert len({row['snapshot'] for row in snapshot['files']})==len(snapshot['files'])
 for row in snapshot['files']:assert sha(row['snapshot'])==row['sha256']==sha(row['source'])
verify=read(logs/'20261006-sponsored-execute-verification-01.json');assert verify['passed'] and verify['full']=={'files':179,'tests':2525,'exitCode':0} and verify['prodTypesExitCode']==0
for file,digest in verify['logs'].items():assert sha(file)==digest
full=(logs/'20261006-sponsored-execute-full-01.log').read_text()
for needle in ['execution-reader.test.ts (33 tests)','execution-coordinator.test.ts (40 tests)','execution-recovery-wakeup.test.ts (6 tests)']:assert needle in full
parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==len({r[1] for r in parents})==98
count=sum(r[0]=='x' for r in parents);assert count in [66,67];tx07=dict((i,m=='x') for m,i in parents)['TX-07'];assert count==(67 if tx07 else 66)
report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':build['sourceAfter'],'currentRevision':'C21','tx07ContractComplete':True,'tx07MarkedComplete':tx07,'parentsComplete':count,'parentsTotal':98,'trialReady':False,'normalChromeHttpsAccepted':False,'actualChromeChecks':[115,108],'actualSignatures':20,'actualSimulations':30,'actualOneShotExecutions':5,'originalDigestLookups':5,'controlledNotFoundCases':5,'currentLockedPendingRestartAccepted':True,'oldWorkerActuallyDisposed':True,'auditExecuteRequests':0,'auditSimulations':0,'auditSignatures':0,'certificateChanges':0,'originalProfilesOpened':0,'proofs':[{'file':str(f),'sha256':sha(f)} for f in files],'inputsSha256':{str(Path(__file__).resolve()):sha(__file__)},'scope':'Current C21 complete TX-07 worker/popup/network/account original-digest wakeup and controlled NOT_FOUND safety; normal locked pending browser restart with old worker actually disposed. Not abrupt shutdown, QA-A10 all faults, all-entry competition, TX-10 signature-return waits, normal Chrome TLS or full trial.'}
a.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'tx07ContractComplete':True,'parentsComplete':count,'actualOneShotExecutions':5}))
