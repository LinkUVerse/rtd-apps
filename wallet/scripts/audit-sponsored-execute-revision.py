#!/usr/bin/env python3
"""Readonly C21 lineage / artifacts / tests / current bounded browser proofs."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,importlib.util,json,re
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--matrix-audit',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
w=Path(__file__).resolve().parents[1];d=w/'migrationToGRpcOrGraphQLDoc';logs=d/'workLog';read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b);h,n=b.source_hash(w)
build=read(logs/'20261006-sponsored-execute-production-build-01.json');assert build['passed'] and build['sourceUnchanged'] and build['sourceAfter']=={'sha256':h,'files':n};assert n==1108
before=read(logs/'20261006-sponsored-execute-c20-before/manifest.json');rows={}
for root in (w/'src',w/'configs',w.parent/'core/src',w.parent.parent/'rtd-ts-sdk/packages/typescript/src'):
 for f in root.rglob('*'):
  if f.is_file():rows[str(f.relative_to(w.parent.parent))]=sha(f)
for f in (w/'package.json',w/'webpack.config.ts',w.parent/'pnpm-lock.yaml'):rows[str(f.relative_to(w.parent.parent))]=sha(f)
for row in before['preservedSources']:
 assert sha(row['saved'])==row['sha256'];rows[str((w/row['file']).relative_to(w.parent.parent))]=row['sha256']
for name in before['newFiles']:del rows[str((w/name).relative_to(w.parent.parent))]
assert len(rows)==before['sourceFiles']==1106;assert hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()==before['sourceSha256']=='7aa9ed8d71bf404b115b7475f4f85e274cbf980c19c447fed416763951aaa46f'
for f,hash_ in build['artifacts'].items():assert sha(Path(build['output'])/f)==hash_
audit=read(logs/'20261006-sponsored-execute-production-audit-01.json');assert audit['passed'] and audit['source']==build['sourceAfter']
for file,hash_ in audit['inputsSha256'].items():assert sha(file)==hash_
old=read(logs/'20261006-native-retention-production-build-01.json')
for file,hash_ in old['artifacts'].items():assert sha(Path(old['output'])/file)==hash_
old_package=read(logs/'20261006-C20-package-01.json');assert sha(old_package['zip'])==old_package['zipSha256']
verify=read(logs/'20261006-sponsored-execute-verification-01.json');assert verify['passed'] and verify['full']=={'files':179,'tests':2525,'exitCode':0} and verify['prodTypesExitCode']==0
for file,hash_ in verify['logs'].items():assert sha(file)==hash_
assert re.search(r'Test Files\s+179 passed', (logs/'20261006-sponsored-execute-full-01.log').read_text());assert re.search(r'Tests\s+2525 passed',(logs/'20261006-sponsored-execute-full-01.log').read_text());assert not (logs/'20261006-sponsored-execute-types-01.log').read_text().strip()
dev=read(logs/'20261006-sponsored-execute-dev-build-01.json');assert dev['passed'] and dev['sourceSha256']==h and dev['sourceFiles']==n
for file,row in dev['compiledProfile']['bundles'].items():assert sha(w/'dist'/file)==row['sha256']
package=read(logs/'20261006-C21-package-01.json');assert package['passed'] and package['memberCount']==36 and sha(package['zip'])==package['zipSha256']
for file,hash_ in package['members'].items():assert sha(Path(package['output'])/file)==hash_
chrome=read(logs/'20261006-C21-package-readonly-01.json');assert chrome['passed'] and chrome['certificateMode']=='normal-ca' and not chrome['networkIdentityAccepted'];assert chrome['externalRequests']==chrome['forbiddenRequests']==chrome['pageErrorCount']==0;assert chrome['workerSource']['matchesDisk'] and chrome['workerSource']['workerSha256']==package['members']['background.js']
for row in chrome['uiSource']['loadedBundles']:assert row['matchesDisk'] and row['loadedSha256']==package['members'][row['file']]
matrix=read(a.matrix_audit);assert matrix['passed'] and matrix['actualSignatures']==10 and matrix['actualSponsorSingleSignRejections']==2 and matrix['actualExecuteRequests']==0 and matrix['source']==build['sourceAfter'];assert sha(matrix['proofFile'])==matrix['proofSha256']
parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==98 and sum(row[0]=='x' for row in parents)==66
report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'currentRevision':'C21','sourceSha256':h,'sourceFiles':n,'reconstructedC20Sha256':before['sourceSha256'],'c20CandidateAndZipPreserved':True,'parentsComplete':66,'parentsTotal':98,'trialReady':False,'normalChromeHttpsAccepted':False,'fullTestFiles':179,'fullTests':2525,'actualChromeAuthorizationMatrixAccepted':True,'actualSignatures':10,'actualSponsorSingleSignRejections':2,'actualExecuteRequests':0,'packageZip':package['zip'],'packageZipSha256':package['zipSha256'],'proofs':[{'file':str(f.resolve()),'sha256':sha(f)} for f in [logs/'20261006-sponsored-execute-production-build-01.json',logs/'20261006-sponsored-execute-production-audit-01.json',logs/'20261006-sponsored-execute-dev-build-01.json',logs/'20261006-sponsored-execute-verification-01.json',logs/'20261006-C21-package-01.json',logs/'20261006-C21-package-readonly-01.json',a.matrix_audit]],'scope':'Current C21 source / builds / bounded sign-only and sponsor pre-approval refusal / normal-CA startup / old C20 preserved. C20 success executions and QA-A09 receipts remain historical; no current C21 success dispatch, internal all-entry acceptance, TLS or 98-task completion by this report.'};a.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'sourceFiles':n,'parentsComplete':66,'trialReady':False}))
