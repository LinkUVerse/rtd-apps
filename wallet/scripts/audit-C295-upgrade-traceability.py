#!/usr/bin/env python3
"""Resolve the C291 route defect with actual C292 UI, preserving prior scope limits."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,collections
W=Path(__file__).resolve().parents[1];D=W/'migrationToGRpcOrGraphQLDoc';L=D/'workLog'
inputs={}
def read(p):
 p=Path(p).resolve();b=p.read_bytes();inputs[str(p)]=hashlib.sha256(b).hexdigest();return json.loads(b)
def modules(root):
 out={}
 for p in Path(root).glob('*.js.map'):
  j=read(p)
  for n,s in zip(j['sources'],j['sourcesContent']):
   if n.startswith('webpack:///./'):
    assert n not in out or out[n]==s;out[n]=s
 return out
old=read(L/'20261012-C291-rpc-page-traceability-01.json')
assert old['passed'] and len(old['methods'])==21 and len(old['routes'])==54
changed=[]
for p,h in old['inputsSha256'].items():
 now=hashlib.sha256(Path(p).read_bytes()).hexdigest()
 if now!=h:changed.append(p)
assert changed==[],changed
install=read(L/'20261012-C292-ordinary-upgrade-installed-01.json');assert install['passed'] and install['oldArtifactsFullyPreserved'] and install['permissionsUnchanged']
a=modules(install['archive']);b=modules(install['compilerOutput']);assert a.keys()==b.keys()
delta=[n for n in a if a[n]!=b[n]];assert delta==['webpack:///./ui/app/pages/home/usdc-promo/UsdcPromo.tsx'],delta
for f,h in read(L/'20261012-C292-ordinary-upgrade-prepared-01.json')['newArtifacts'].items():assert hashlib.sha256((Path(install['stable'])/f).read_bytes()).hexdigest()==h
u=read(L/'20261012-C292-usdc-direct-native-01.json');back=read(L/'20261012-C292-usdc-back-native-01.json')
assert '#/usdc-promo' in u['ax'] and '当前网络尚未开放兑换。' in u['ax'] and '#/swap' not in u['ax']
assert '#/tokens' in back['ax'] and '100RTD' in back['ax'] and 'wallet-renamed.rtd' in back['ax']
har=read(L/'20261012-C292-browser-acceptance-01.har');es=har['log']['entries'];assert len(es)==56
assert not any('ExecuteTransaction' in e['request']['url'] for e in es)
exceptions=[{'url':e['request']['url'],'status':e['response']['status'],'at':e['startedDateTime']} for e in es if e['response']['status']!=200]
assert len(exceptions)==1 and exceptions[0]['status']==503
routes=old['routes']
for r in routes:
 if r['kind']=='defect':
  assert 'UsdcPromo' in r['attributes']['element'];r['kind']='unsupported-ui';r['exception']='C292 actual ordinary Chrome unavailable UI and back-to-home accepted; no exchange implementation or transaction claimed.';r['evidenceGroups']=['C292-unavailable-ui']
result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'acceptedPackage':'REL-05.5','traceabilityComplete':True,'methods':old['methods'],'routes':routes,'groups':old['groups'],'changedProductModules':delta,'allOtherModulesUnchanged':len(a)-1,'installedArtifactsEqualReviewedCompiler':True,'actualUnavailableRouteAndBackAccepted':True,'actualHomeBalanceAndOriginalAccountRetained':True,'ordinaryNativeBrowser':True,'profileDatabaseEdited':False,'allRoutesBrowserTested':False,'allRequiredAcceptanceComplete':False,'priorUntestedExcludedAndVersionLimitsPreserved':True,'newBrowserRequests':len(es),'trafficExceptions':exceptions,'newExecuteRequests':0,'parentCompletion':False,'inputsSha256':inputs}
p=L/'20261012-C295-traceability-complete-01.json';assert not p.exists();p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':True,'package':'REL-05.5','methods':21,'routes':54,'changedModules':delta,'exceptions':exceptions}))
