#!/usr/bin/env python3
"""Close the permission/TLS/UI-worker/demo requirement with separately scoped real evidence."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,socket
W=Path(__file__).resolve().parent.parent
L=W/'migrationToGRpcOrGraphQLDoc/workLog'
F=Path.home()/'.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
inputs={}
def proof(name,requirements):
 p=L/name;x=json.loads(p.read_text());assert x.get('passed') is True
 for k,v in requirements.items():assert x.get(k)==v,(name,k)
 for file,digest in x.get('inputsSha256',{}).items():assert sha(file)==digest,file
 inputs[str(p)]=sha(p);return x
proof('20261010-C205-permission-tls-matrix-01.json',{'ordinaryPermissionTlsMatrixAccepted':True,'c203AmbiguousAllowClickCounted':False})
proof('20261010-C205-env-completion-01.json',{'ordinaryThreeEntriesCompletion':True,'parentCompletion':True,'permissionRestored':True,'parentId':'ENV-07','fullGenesisChecked':True,'workerSuccessfulBodies':3})
proof('20261010-C212-demo-cors-audit-01.json',{'ordinaryChromeNativeHarAccepted':True,'privateApprovedWebOriginAccepted':True,'privateUnapprovedWebOriginRejected':True,'temporaryOriginRemovedAndBrowserRejectionAccepted':True,'noNewProxy':True,'noOriginOverrideInPage':True,'credentialsAndCookies':0,'signatures':0,'executeRequests':0})
installed=proof('20261010-C210-ordinary-upgrade-installed-01.json',{'oldArtifactsFullyPreserved':True,'newInstalledArtifactsEqualCompilerOutput':True,'permissionsUnchanged':True})
proof('20261010-C210-ordinary-bytecode-01.json',{'actualUiStaticBytesAccepted':True,'actualWorkerStaticBytesAccepted':True,'completeInstalledBytecodeAccepted':True,'permissionsChanged':0})
prepared=proof('20261010-C210-ordinary-upgrade-prepared-01.json',{'manifestUnchanged':True,'profileAndCompleteReleaseAuthorityUnchanged':True})
for file,digest in prepared['newArtifacts'].items():assert sha(Path(installed['stable'])/file)==digest
browser=proof('20261010-C210-installed-ordinary-browser-binding-01.json',{'profileDatabaseReadOrEdited':False})
command=subprocess.check_output(['ps','-ww','-p',str(browser['browserPid']),'-o','command='],text=True).strip()
assert hashlib.sha256(command.encode()).hexdigest()==browser['commandSha256']
assert subprocess.check_output(['ps','-p',str(browser['browserPid']),'-o','lstart='],text=True).strip()==browser['browserBirth']
with socket.socket() as s:assert s.connect_ex(('127.0.0.1',41960))!=0
assert subprocess.run(['ps','-p','40669','-o','pid='],capture_output=True).returncode!=0
restored=F/'C212-exact-demo-origin-20261010-02/restored.json'
r=json.loads(restored.read_text());assert r['passed'] and r['originalWhitelistRestored'] and r['containerUnchanged']
for p,h in r['inputsSha256'].items():assert sha(p)==h
inputs[str(restored)]=sha(restored);inputs[str(Path(__file__))]=sha(__file__)
report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'parentId':'QA-A19','parentCompletion':True,
 'ordinaryPermissionTlsMatrixAccepted':True,'ordinaryUiWorkerCustomNetworkAccepted':True,'demoWebCorsPositiveNegativeAndRestorationAccepted':True,
 'scope':'Existing C51 wallet dev edges; explicit exact demo Origin temporarily admitted, actual ordinary Chrome native HAR positive/negative/restored. Direct private HTTPS negative evidence remains C205; this is not a claim of public access to mTLS upstreams.',
 'ordinaryChromePid':browser['browserPid'],'ordinaryChromeVersion':browser['ordinaryChromeVersion'],'installedWallet':'C210','C211Installed':False,
 'temporaryOriginRemoved':True,'temporaryStaticProcessStopped':True,'temporaryPortClosed':True,'newContainers':0,'otherParentsCompleted':False,'inputsSha256':inputs}
p=L/'20261010-C212-QA-A19-completion-01.json'
with p.open('x') as f:json.dump(report,f,indent=2)
p.chmod(0o600)
print(json.dumps({'passed':True,'parentId':'QA-A19','parentCompletion':True,'C211Installed':False}))
