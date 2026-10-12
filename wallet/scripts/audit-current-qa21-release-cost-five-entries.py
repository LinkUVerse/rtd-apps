#!/usr/bin/env python3
"""Audit A21 release cleanup, observed traffic and documented budgets; REL-02 owns all business traffic."""
import argparse,hashlib,json,re,subprocess
from pathlib import Path
from datetime import datetime,timezone

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
    w=Path(__file__).resolve().parents[1];l=w/'migrationToGRpcOrGraphQLDoc/workLog';d=l.parent;root=w.parent.parent
    sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest();read=lambda f:json.loads(Path(f).read_text())
    names=['20261006-C28-observation-owner-audit-01.json','20261006-C28-owner-reload-audit-01.json','20261006-C28-name-production-build-01.json','20261006-C28-name-production-audit-01.json','20261006-C28-name-production-chrome-03.json','20261006-C28-current-settings-ui-03.json','20261006-C28-current-owner-restart-04.json','20261006-C28-current-owner-reload-02.json','20261006-QA-A21-current-cost-02.json']
    qualified,reload_audit,build,closure,chrome,settings,restart,reload,cost=[read(l/n)for n in names];source=qualified['source']
    assert all(v['passed']for v in [qualified,reload_audit,build,closure,chrome,settings,restart,reload,cost])
    assert build['sourceBefore']==build['sourceAfter']==closure['source']==cost['source']==source
    assert build['compilationErrors']==0 and closure['inputsUnchanged'] and closure['sourceUnchanged']
    assert len(closure['chunks'])==7 and set(closure['entrypoints'])=={'background','ui','egress-gate','content-script','dapp-interface'}
    for name,h in build['artifacts'].items():assert sha(Path(build['output'])/name)==h
    for row in qualified['proofs']:assert sha(row['file'])==row['sha256']
    manifest=read(qualified['snapshotManifest']);assert manifest['source']==source
    for name,h in manifest['rows'].items():assert sha(root/name)==h
    check="const a=require('./scripts/audit-production-extension.cjs'),b=require('./scripts/audit-name-production-extension.cjs');for(const n of ['inspectModule','flattenModules','methodsFromDoc'])if(a[n].toString()!==b[n].toString())throw Error(n);console.log('equal')"
    assert subprocess.run(['node','-e',check],cwd=w,capture_output=True,text=True,check=True).stdout.strip()=='equal'
    tests=(l/'20261006-QA-A21-production-audit-tests-01.log').read_text();assert 'pass 8' in tests and 'fail 0' in tests
    assert chrome['networkIdentityAccepted'] and len(chrome['identities'])==4 and all(v['status']==200 and v['sameGenesis']for v in chrome['identities'])
    assert chrome['externalRequests']==chrome['forbiddenRequests']==chrome['pageErrorCount']==chrome['certificateChanges']==0
    observed=0
    allowed={'http://127.0.0.1:'+p for p in ['39400','39610','39613','39616']}
    from urllib.parse import urlparse
    for v in [settings,restart,reload,cost]:
        assert v['errors']==v['forbidden']==[] and v['workerSource']['matchesDisk'] and v['workerSource']['workerSha256']==build['artifacts']['background.js']
        for row in v['traffic']:
            if 'origin' in row:origin=row['origin'];path=row['path']
            else:
                u=urlparse(row['url']);origin=u.scheme+'://'+u.netloc;path=u.path
            assert origin in allowed and row['method']=='POST' and not re.search(r'/(ExecuteTransaction|SimulateTransaction)$',path)
            observed+=1
        for f,h in v['inputsSha256'].items():assert sha(f)==h
    assert len(cost['checks'])==5 and all(c['passed']for c in cost['checks'])
    assert len(cost['inventory'])==1 and cost['inventory'][0]['state']=='ENABLED' and cost['inventory'][0]['id']==chrome['actualExtensionId']
    assert cost['observed']['status']==200 and cost['observed']['body']['data']['chainIdentifier']=='3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj'
    assert cost['observed']['body']['data']['serviceConfig']=={'maxQueryDepth':20,'maxQueryNodes':300,'maxOutputNodes':1000000,'maxQueryPayloadSize':5000}
    full=(l/'20261006-C28-full-unit-01.log').read_text();assert '183 passed (183)'in full and '2573 passed (2573)'in full
    for name in ['read-budget.test.ts','read-concurrency.test.ts','grpc-response-budget.test.ts','account-history-reader.test.ts','external-services.test.ts']:assert name in full
    guide=l/'20261006-local-operations-guide.md';text=guide.read_text()
    for value in ['4个原生 Web Locks','等待队列64','64MiB','128MiB','日志、凭据','0600','0700','固定类别']:assert value in text
    assert 'typeof __WALLET_EXTERNAL_SERVICES_ENABLED__'in(w/'src/shared/external-services.ts').read_text()
    assert 'wallet-context-finalization-unconfirmed'in(w/'src/background/wallet-context-mutation.ts').read_text()
    tasks=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(tasks)==98 and sum(m=='x'for m,_ in tasks)==78 and (' ','QA-A21')in tasks
    assert (' ','REL-02')in tasks and (' ','ENV-07')in tasks
    files=[l/n for n in names]+[guide,l/'20261006-QA-A21-production-audit-tests-01.log',l/'20261006-C28-full-unit-01.log',w/'scripts/test-production-extension-audit.cjs',w/'scripts/audit-production-extension.cjs',w/'scripts/audit-name-production-extension.cjs',l/'20261006-QA-A21-current-cost-01.json',Path(__file__).resolve()]
    report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':source,'parent':'QA-A21','requirementsComplete':['Q1','Q2','Q3','Q4','Q5'],'productionModules':closure['moduleCount'],'productionSourceContents':closure['uniqueSourceCount'],'chunks':7,'entrypoints':5,'auditCounterexamples':8,'currentObservedHttpRequests':observed,'singleActiveWalletScope':'fresh isolated task-owned Chrome profile only','allBusinessTrafficAccepted':False,'normalChromeHttpsAccepted':False,'capacitySlaClaim':False,'trialReady':False,'parentsBefore':78,'parentsAfterAuthorizedByThisAudit':79,'inputsSha256':{str(f):sha(f)for f in files},'scope':'A21 current full static release cleanup, bounded observed current production flows, actual native single enabled wallet inventory in isolated task profile, real public budgets and documented limits/private logging/configuration contracts. REL-02 full business traffic, ENV-07 TLS, all NFT/name/hidden flows and final acceptance remain unchecked. Original overrestricted-cost failed proof retained.'}
    a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k]for k in ['passed','parent','currentObservedHttpRequests','parentsAfterAuthorizedByThisAudit']}))

if __name__=='__main__':main()
