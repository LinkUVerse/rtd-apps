#!/usr/bin/env python3
"""Complete original TX-10 authorization contract, with explicit historical byte lineage."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,importlib.util,json,re
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
w=Path(__file__).resolve().parents[1];d=w/'migrationToGRpcOrGraphQLDoc';logs=d/'workLog'
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b);h,n=b.source_hash(w)
build=read(logs/'20261006-sponsored-execute-production-build-01.json');assert build['passed'] and build['sourceAfter']=={'sha256':h,'files':n} and n==1108
for f,digest in build['artifacts'].items():assert sha(Path(build['output'])/f)==digest
lineage=read(logs/'20261006-auth-current-lineage-01.json');assert lineage['passed'] and lineage['source']==build['sourceAfter'] and len(lineage['exactUnchangedModules'])==103 and len(lineage['unchangedBridges'])==3 and lineage['historicalQa18ProofsVerified'] and lineage['currentSponsorPreflightRevalidated'] and not lineage['newChromeRunClaimed']
for row in lineage['proofs']:assert sha(row['file'])==row['sha256']
old=read(logs/'20261006-terminal-observation-c18-real-lifecycle-01.json');assert old['passed'] and old['dispatchRequests']==0;protocol=old['dapp'];assert protocol['passed'] and len(protocol['checks'])==10
for key,count in [('originTabs',6),('accountSwitch',3),('networkSwitch',3)]:assert protocol[key]['passed'] and len(protocol[key]['checks'])==count
assert protocol['cancellation']['passed'] and len(protocol['cancellation']['cases'])==6 and all(r['passed'] for r in protocol['cancellation']['cases']);assert protocol['lockedApproval']['passed']
wait=read(logs/'20261006-signature-wait-current-audit-01.json');assert wait['passed'] and wait['source']==build['sourceAfter'] and wait['actualChromeChecks']==104 and wait['actualLifecycleCases']==8 and wait['actualHeldSignatures']==8 and wait['returnedHeldSignatures']==wait['actualExecuteRequests']==0 and wait['actualSignatures']==11 and wait['actualSimulations']==27
assert sha(wait['proofFile'])==wait['proofSha256'];proof=read(wait['proofFile'])
for file,digest in proof['inputsSha256'].items():assert sha(file)==digest
snapshot=read(logs/'20261006-signature-wait-current-02-inputs/manifest.json');assert snapshot['completeRelativePathNames'] and snapshot['syntaxChecksPassed']
for row in snapshot['files']:assert sha(row['source'])==sha(row['snapshot'])==row['sha256']
for row in read(logs/'20261006-signature-wait-current-01-inputs/manifest.json')['files']:assert sha(row['snapshot'])==row['sha256']
failed=read(logs/'20261006-signature-wait-current-01.json');assert not failed['passed'] and failed['signatures']=='not-counted' and failed['executeRequests']==0 and Path(failed['fixture']).exists()
lifecycle=read(logs/'20261006-lifecycle-completion-audit-02.json');assert lifecycle['passed'] and lifecycle['source']==build['sourceAfter'] and lifecycle['tx07ContractComplete'] and lifecycle['tx07MarkedComplete'] and lifecycle['actualOneShotExecutions']==5
for row in lifecycle['proofs']:assert sha(row['file'])==row['sha256']
verify=read(logs/'20261006-sponsored-execute-verification-01.json');assert verify['passed'] and verify['full']=={'files':179,'tests':2525,'exitCode':0} and verify['prodTypesExitCode']==0
parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==len({r[1] for r in parents})==98;status=dict((i,m=='x') for m,i in parents);count=sum(status.values());assert status['TX-07'] and count==(68 if status['TX-10'] else 67)
files=[logs/name for name in ['20261006-auth-current-lineage-01.json','20261006-signature-wait-current-02.json','20261006-signature-wait-current-audit-01.json','20261006-lifecycle-completion-audit-02.json','20261006-TX-10-completion-design.md','20261006-signature-wait-current-01.json','20261006-signature-wait-current-01-inputs/manifest.json','20261006-signature-wait-current-02-inputs/manifest.json']]
report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'currentRevision':'C21','source':build['sourceAfter'],'tx07ContractComplete':True,'tx10ContractComplete':True,'tx10MarkedComplete':status['TX-10'],'parentsComplete':count,'parentsTotal':98,'trialReady':False,'normalChromeHttpsAccepted':False,'actualOneShotExecutions':5,'actualCurrentLifecycleChecks':[115,108,104],'actualCurrentWaitSignatures':11,'actualCurrentHeldSignatures':8,'actualCurrentWaitSimulations':27,'actualCurrentWaitExecuteRequests':0,'historicalC18ProtocolEvidenceInheritedByExactBytes':True,'unchangedAuthorizationModules':103,'unchangedBridges':3,'newC21FullProtocolRunClaimed':False,'certificateChanges':0,'originalProfilesOpened':0,'proofs':[{'file':str(f),'sha256':sha(f)} for f in files],'inputsSha256':{str(Path(__file__).resolve()):sha(__file__)},'scope':'Complete original TX-10 origin/account/chain/request/tab/events/disconnect via explicitly inherited real C18 unchanged producer and bridge bytes plus current C21 preflight / signing-return eight cases / post-dispatch five executions. No new full protocol run or Chrome TLS / assets / QA-A10 all faults / full trial claim.'}
a.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'tx10ContractComplete':True,'parentsComplete':count}))
