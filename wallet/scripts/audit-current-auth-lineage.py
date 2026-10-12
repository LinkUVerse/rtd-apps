#!/usr/bin/env python3
"""Exact deployed C18 authorization modules inherited by C21, with changed preflight revalidated."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json,re,difflib
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
w=Path(__file__).resolve().parents[1];logs=w/'migrationToGRpcOrGraphQLDoc/workLog';rt=Path.home()/'.local/state/rtd-wallet-migration/dev-20261003-01'
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
oldfile=rt/'indexed-event-c18-before-c19-20261006-01/background.js';newfile=w/'dist/background.js';oldbuild=read(logs/'20261006-terminal-observation-c18-build-01.json');newbuild=read(logs/'20261006-sponsored-execute-dev-build-01.json');qa=read(logs/'20261006-QA-A18-completion-audit-01.json')
assert sha(oldfile)==oldbuild['compiledProfile']['bundles']['background.js']['sha256']==qa['workerSha256'];assert sha(newfile)==newbuild['compiledProfile']['bundles']['background.js']['sha256'];assert oldbuild['passed'] and newbuild['passed'] and qa['passed']
for row in qa['proofs']:assert sha(logs/row['file'])==row['sha256']
def modules(file):
 text=file.read_bytes().decode();matches=list(re.finditer(r'/\*\*\*/ "([^"\n]+)"\r?\n',text));assert len(matches)>1000
 return {m.group(1):text[m.start():matches[i+1].start() if i+1<len(matches) else len(text)] for i,m in enumerate(matches)}
before=modules(oldfile);after=modules(newfile);same={};changed={}
for name,text in after.items():
 if name.startswith(('./background/','./shared/rpc/')):
  (same if before.get(name)==text else changed)[name]=hashlib.sha256(text.encode()).hexdigest()
expected={'./background/dapp-preparation.ts','./shared/rpc/deployment-capabilities.ts','./shared/rpc/identity.ts','./shared/rpc/move-package-capabilities.ts','./shared/rpc/native-service-capabilities.ts','./shared/rpc/read-capability-view.ts','./shared/rpc/transaction-sponsorship.ts'}
assert set(changed)==expected and len(same)==103
required=['background/Transactions.ts','background/Permissions.ts','background/Tabs.ts','background/connections/ContentScriptConnection.ts','background/connections/UiConnection.ts','background/dapp-execution.ts','background/dapp-signing.ts','background/dapp-personal-message.ts','background/dapp-native-context.ts','background/dapp-egress-peer.ts','background/dapp-egress-runtime.ts','background/ui-native-context.ts','background/wallet-context-mutation.ts','background/NetworkEnv.ts','background/accounts/index.ts','background/execution.ts','background/execution-recovery-wakeup.ts','shared/rpc/dapp-request-binding.ts','shared/rpc/dapp-egress-protocol.ts','shared/rpc/dapp-egress-store.ts','shared/rpc/execution-coordinator.ts']
for name in required:assert './'+name in same,name
bridges={}
for name in ['content-script.js','dapp-interface.js','egress-gate.js']:
 old=oldfile.parent/name;new=newfile.parent/name;assert sha(old)==sha(new);bridges[name]=sha(new)
# The inherited claim excludes modified preparation / capability implementations.
# C21 sponsor preparation change is revalidated by the real 88-check matrix, not inferred unchanged.
matrix=read(logs/'20261006-TX-01-authorization-matrix-audit-01.json');assert matrix['passed'] and matrix['actualSignatures']==10 and matrix['actualSponsorSingleSignRejections']==2 and matrix['actualExecuteRequests']==0
verify=read(logs/'20261006-sponsored-execute-verification-01.json');assert verify['passed'] and verify['full']['tests']==2525
report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'historicalProtocolRevision':'C18','currentRevision':'C21','source':{'sha256':newbuild['sourceSha256'],'files':newbuild['sourceFiles']},'oldWorkerSha256':sha(oldfile),'currentDevWorkerSha256':sha(newfile),'exactUnchangedModules':same,'changedModulesRequiringSeparateEvidence':changed,'requiredAuthorizationModules':required,'unchangedBridges':bridges,'historicalQa18ProofsVerified':True,'currentSponsorPreflightRevalidated':True,'currentFullTests':2525,'newChromeRunClaimed':False,'certificateChanges':0,'profilesOpened':0,'executeRequests':0,'proofs':[{'file':str(f),'sha256':sha(f)} for f in [oldfile,newfile,logs/'20261006-QA-A18-completion-audit-01.json',logs/'20261006-sponsored-execute-dev-build-01.json',logs/'20261006-TX-01-authorization-matrix-audit-01.json']], 'inputsSha256':{str(Path(__file__).resolve()):sha(__file__)},'scope':'Exact raw compiled module bytes and three bridge bytes prove unchanged C18 origin/tab/permission/account/chain/events/disconnect producer behavior in current C21 source/build. Modified preparation and service capability paths explicitly excluded and separately revalidated. This is traceable historical evidence inheritance, not a newly run C21 full protocol matrix.'}
a.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'exactUnchangedModules':len(same),'unchangedBridges':len(bridges)}))
