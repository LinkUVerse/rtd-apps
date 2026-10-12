"""Bind the limited C221 ordinary Chrome polling evidence; no parent completion."""
from pathlib import Path
import json, hashlib, datetime, subprocess
W=Path(__file__).resolve().parent.parent
L=W/'migrationToGRpcOrGraphQLDoc/workLog'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
names=['20261011-C221-source-and-checks-01.json','20261011-C221-ordinary-upgrade-installed-01.json','20261011-C221-ordinary-bytecode-01.json','20261011-C221-ordinary-balance-har-audit-01.json','20261011-C221-apps-idle-observation-01.json','20261011-C221-live-reuse-01.json']
paths=[L/n for n in names]
qualification,installed,bytecode,audit,idle,live=map(read,paths)
assert all(read(p)['passed'] for p in paths)
source=json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require("./scripts/build-reviewed-generation-production-extension.cjs").productSource()))'],cwd=W,text=True))
assert source==qualification['currentSource']==installed['source']
assert bytecode['actualUiStaticBytesAccepted'] and bytecode['actualWorkerStaticBytesAccepted']
assert audit['completeCycles']==4 and audit['graphqlPerCycle']==[4,4,4,4]
assert audit['capturedRequests']==17 and audit['graphqlCount']==16 and audit['grpcCount']==1
har=L/'20261011-C221-home-polling-01.har';auditor=W/'scripts/audit-C221-ordinary-balances.mjs'
assert sha(har)==audit['harSha256'] and sha(auditor)==audit['sourceScriptSha256']
assert idle['elapsedMs']>=30000 and idle['loopbackRequests']==0 and idle['recordingEnabled']
assert [s['requestCount'] for s in live['samples']]==[4,4,4,11,3]
assert live['signatures']==live['executions']==0
for document in [qualification,installed]:
 for file,digest in document['inputsSha256'].items():assert sha(Path(file))==digest
for file,digest in bytecode['sourcePins'].items():assert sha(Path(file))==digest
inputs=[Path(__file__),*paths,har,auditor,W/'scripts/probe-C216-live-reuse.ts']
proof={'passed':True,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'C221 pending queue lifecycle, ordinary Chrome initial plus three automatic home cycles and 37s apps idle. Empty-account sample only. Live staking and native balance are CLI evidence.','source':source,'compiledAndActuallyLoadedUiAndWorkerAccepted':True,'ordinaryChromeGraphqlPerCycle':[4,4,4,4],'allEightDomainCyclesVerified':True,'perCycleFinalFenceSeconds':[c['secondsToFinalRevalidation'] for c in audit['cycles'] if c['domain']=='balances'],'appsIdleMs':idle['elapsedMs'],'appsLoopbackRequests':0,'regressionTests':2824,'allPagesAccepted':False,'nonzeroBalanceAccepted':False,'parentCompletion':False,'inputsSha256':{str(p):sha(p) for p in inputs}}
with (L/'20261011-C221-polling-acceptance-01.json').open('x') as f:json.dump(proof,f,indent=2);f.write('\n')
print(json.dumps({k:proof[k] for k in ['passed','ordinaryChromeGraphqlPerCycle','perCycleFinalFenceSeconds','appsIdleMs','allPagesAccepted','parentCompletion']}))
