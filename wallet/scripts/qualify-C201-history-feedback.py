# coding: utf-8
"""Audit the complete product delta; old installed evidence remains historical."""
from pathlib import Path
import json, hashlib, datetime
W=Path(__file__).resolve().parent.parent
R=W.parent.parent
L=W/'migrationToGRpcOrGraphQLDoc/workLog'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
beforef=L/'20261010-C188-before-empty-recovery-fix-01.json'
lineagef=L/'20261010-C188-production-source-independent-01.json'
before,lineage=read(beforef),read(lineagef)
rows=read(Path(before['productManifest']))
for f in lineage['changed']: rows[f]=lineage['inputsSha256'][str(R/f)]
assert hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()==lineage['currentSource']['sha256']
newrows={}
for root in (W/'src',W/'configs',R/'rtd-apps/core/src',R/'rtd-ts-sdk/packages/typescript/src'):
    for p in root.rglob('*'):
        if p.is_file():newrows[str(p.relative_to(R))]=sha(p)
for p in (W/'package.json',W/'webpack.config.ts',R/'rtd-apps/pnpm-lock.yaml'):newrows[str(p.relative_to(R))]=sha(p)
changed=sorted(k for k,v in rows.items() if newrows.get(k)!=v)
expected=['rtd-apps/wallet/src/ui/app/i18n/messages/en.ts','rtd-apps/wallet/src/ui/app/i18n/messages/zh-CN.ts','rtd-apps/wallet/src/ui/app/pages/home/transactions/CompletedTransactions.test.ts','rtd-apps/wallet/src/ui/app/pages/home/transactions/CompletedTransactions.tsx']
assert changed==expected and set(rows)==set(newrows)
inserts={expected[0]:['  "activity.admissionBlocked":\n    "Activity reads have not passed network verification. Check the network status; transaction history cannot be confirmed yet.",\n'],expected[1]:['  "activity.admissionBlocked":\n    "交易活动读取尚未通过网络校验，请核对网络状态。暂时无法确认历史记录。",\n'],expected[3]:['import { walletReadAllowed } from "rtd-apps-core/src/rpc/read-admission";\n','  if (!walletReadAllowed(rpc, "history"))\n    return <Alert>{t("activity.admissionBlocked")}</Alert>;\n']}
for f,parts in inserts.items():
    s=(R/f).read_text()
    for part in parts:
        assert s.count(part)==1
        s=s.replace(part,'')
    assert hashlib.sha256(s.encode()).hexdigest()==rows[f]
bf=L/'20261010-default-generation-positive-C201-build-01.json'
cf=L/'20261010-default-generation-positive-C201-closure-01.json'
oldf=L/'20261010-default-generation-positive-C198-build-01.json'
b,c,old=read(bf),read(cf),read(oldf)
source={'sha256':hashlib.sha256(json.dumps(newrows,sort_keys=True).encode()).hexdigest(),'files':len(newrows)}
assert b['passed'] and c['passed'] and b['sourceBefore']==b['sourceAfter']==c['source']==source
for f,h in c['inputsSha256'].items():assert sha(Path(f))==h
oldmap=read(Path(old['output'])/'background.js.map')
newmap=read(Path(b['output'])/'background.js.map')
assert len(oldmap['sources'])==len(set(oldmap['sources']))
assert len(newmap['sources'])==len(set(newmap['sources']))
assert dict(zip(oldmap['sources'],oldmap['sourcesContent']))==dict(zip(newmap['sources'],newmap['sourcesContent']))
assert b['profileSha256']==old['profileSha256'] and b['reviewedRelease']['registrySha256']==old['reviewedRelease']['registrySha256']
assert read(Path(b['output'])/'manifest.json')==read(Path(old['output'])/'manifest.json')
checks=[]
for name in ['production-typecheck','rpc-typecheck']:
    p=L/('20261010-C201-'+name+'-01.log')
    assert p.read_text()==''
    checks.append({'name':name,'exitCode':0,'log':str(p),'sha256':sha(p)})
red=L/'20261010-C201-history-feedback-reproduction-01.log'
green=L/'20261010-C201-history-feedback-regression-01.log'
assert '3 failed | 4 passed (7)' in red.read_text()
assert 'Tests  53 passed (53)' in green.read_text()
checks.append({'name':'history regression','exitCode':0,'tests':53,'files':4,'log':str(green),'sha256':sha(green)})
inputs=[Path(__file__),beforef,lineagef,Path(before['productManifest']),bf,cf,oldf,red,green,*[Path(x['log']) for x in checks],*[R/f for f in changed]]
r={'passed':True,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'originalSource':lineage['currentSource'],'currentSource':source,'changed':changed,'unchangedOriginalProductFiles':len(rows)-len(changed),'exactProductionInsertionInverseAccepted':True,'backgroundSourceMapModuleSetAndContentsUnchanged':True,'backgroundModuleCount':len(newmap['sources']),'compiledBackgroundBytesUnchanged':b['artifacts']['background.js']==old['artifacts']['background.js'],'profileRegistryAndManifestUnchanged':True,'checks':checks,'currentBrowserFixAccepted':False,'parentCompletion':False,'inputsSha256':{str(p):sha(p) for p in inputs}}
o=L/'20261010-C201-source-and-checks-01.json'
assert not o.exists()
o.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:r[k] for k in ['passed','unchangedOriginalProductFiles','backgroundModuleCount','currentSource']}))
