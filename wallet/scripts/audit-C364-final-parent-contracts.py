#!/usr/bin/env python3
"""Final original-contract crosswalk, with runtime acceptance kept separate from static checks."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import sys

W=Path(__file__).resolve().parents[1]; D=W/'migrationToGRpcOrGraphQLDoc'; L=D/'workLog'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    assert sys.argv[1:] in [['preflight'], ['complete']]
    final=sys.argv[1]=='complete'; inputs={}; failures=[]
    task=(D/'Task.md').read_text()
    rows=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)` (.*)$',task,re.M)
    assert len(rows)==98 and len({r[1] for r in rows})==98
    assert len([r for r in rows if r[1].startswith('QA-A')])==22
    # Six initial documentation tasks predate inline links in Task.md.
    supplement={
      **{f'DOC-{i:02}':['workLog/20261012-C290-document-contract-completion.md',
                       'workLog/20261012-C290-document-contracts-01.json'] for i in range(1,4)},
      'DOC-04':['workLog/20261011-C269-release-inventory.md'],
      'DOC-05':['workLog/20261011-C271-five-parent-breakdown.md'],
      'DOC-06':['workLog/20261012-C362-checks-01.json'],
      'NET-01':['workLog/20261003-NET-foundation.md'],
      'NET-02':['workLog/20261003-NET-02-RPC-05-assets.md'],
      'ENV-01':['workLog/20261012-C360-current-runtime-completion.md'],
      'QA-A17':['workLog/20261012-C363-lifecycle-completion.md'] if final else [],
      'REL-05':['workLog/20261012-C290-document-contract-completion.md',
                'workLog/20261012-C362-validator-selection-refresh.md']}
    matrix=[]
    for mark,ident,contract in rows:
        references=re.findall(r'\]\(([^)]+)\)',contract)
        references += re.findall(r'(?<!\./)(?<!\()\bworkLog/[A-Za-z0-9_\-./]+\.(?:md|json)',contract)
        references += supplement.get(ident,[])
        evidence=[]
        for link in dict.fromkeys(references):
            base=link.split('#')[0]
            if not base or re.match('https?://',base):continue
            p=(D/base).resolve()
            if not p.is_file():failures.append({'parent':ident,'missing':str(p)});continue
            digest=sha(p); inputs[str(p)]=digest
            entry={'path':str(p),'sha256':digest}
            if p.suffix=='.json':
                proof=json.loads(p.read_text());entry['declaredPassed']=proof.get('passed')
                # An index or scoped proof does not certify an entire parent by itself.
                entry['scope']=proof.get('scope')
            evidence.append(entry)
        if not evidence and ident!='QA-A17':failures.append({'parent':ident,'noEvidenceEntrypoint':True})
        boundary='历史原版本实测按原日期保留；当前版本适用性由C362的逐模块追溯承接，未宣称全部用例当日重跑。'
        if ident in ('RPC-24','RPC-25'):
            boundary='验收的是显式不支持/只读隔离和移除旧RPC；不宣称zkLogin、Qredo、Ledger或法币外部业务上线。'
        elif ident=='QA-A13':boundary='账户认证窗口和业务范围按证书声明；不宣称全链所有账户活动全集。'
        elif ident=='QA-A16':boundary='真实质押/赎回与算法、夹具/组件矩阵分别留证；不宣称实际触发所有治理状态。'
        elif ident=='QA-A17':boundary='单机指定dev的完整固定历史范围、真实存储故障恢复和普通Chrome换代；不代表生产多机HA。'
        elif ident=='REL-05':boundary='本行自审由REL-05.4/.5/.6及后续.7清理、.8无缺口终结共同闭合，不以索引替代最终交付。'
        matrix.append({'id':ident,'markedComplete':mark=='x','contract':contract,'evidence':evidence,'boundary':boundary})
    def proof(name,**required):
        p=L/name;j=json.loads(p.read_text());assert j.get('passed') is True
        assert all(j.get(k)==v for k,v in required.items()),(name,required)
        inputs[str(p)]=sha(p);return j
    docs=proof('20261012-C290-document-contracts-01.json',sourceBodyUnionMatchesMerged=True,editChainAndOriginalsVerified=True)
    current=proof('20261012-C362-upgrade-completion-01.json',traceabilityComplete=True,actualOrdinaryChromeAccepted=True,
                  priorExplicitExceptionsRetained=True,validatorSelectionFixAccepted=True)
    assert len(current['methods'])==21 and len(current['routes'])==54
    # Chapters 01-13 retain their semantic review; chapter 14 has an explicit current handover update.
    update=proof('20261012-C364-installation-guide-update-01.json',historicalTailUnchanged=True)
    assert sha(update['before'])==update['beforeSha256']
    assert sha(update['after'])==update['afterSha256']
    for row in docs['chapters']:
        if row['number']!=14:assert sha(row['path'])==row['sha256']
    for p,h in docs['inputsSha256'].items():
        if '/docs/wallet/' in p:assert sha(p)==h
    for name in ['20261012-C362-checks-01.json','20261012-default-generation-positive-C362-build-01.json',
                 '20261012-default-generation-positive-C362-closure-01.json',
                 '20261012-C360-current-debug-runtime-01.json','20261012-C281-business-traffic-01.json']:
        proof(name)
    fine=json.loads((D/'remainingAcceptanceProgress.json').read_text())
    criteria=[]
    for p in fine['parents']:
        for c in p['criteria']:
            if c['accepted']:
                assert c['evidence']
                for e in c['evidence']:
                    assert sha(e['path'])==e['sha256'];j=json.loads(Path(e['path']).read_text())
                    assert j.get('passed') is True and all(j.get(k)==v for k,v in e['required'].items())
                    inputs[e['path']]=e['sha256']
            criteria.append({'parent':p['parentId'],'criterion':c['id'],'accepted':c['accepted']})
    open_ids=[i for mark,i,_ in rows if mark!='x']
    if final:
        assert open_ids==['REL-05'],open_ids
        assert all(r['accepted'] for r in criteria if r['parent']!='REL-05')
        proof('20261012-C363-lifecycle-completion-01.json',fullOriginalLifecycleContractAccepted=True,
              currentBrowserLifecycleAccepted=True)
    assert not failures,failures
    result={'passed':True,'at':datetime.now(timezone.utc).isoformat(),'preflightOnly':not final,
        'originalParentContracts':98,'qaContracts':22,'parents':matrix,'openOriginalParents':open_ids,
        'acceptedUnderlying97Contracts':final,'releaseResourceAndFinalStatusStillSeparate':True,
        'criteria':criteria,'methods':21,'routes':54,'currentWalletSource':current['source'],
        'allCasesRerunToday':False,'allRoutesBrowserTested':False,
        'explicitUnsupportedFeaturesAndHistoricalFailuresPreserved':True,
        'parentCompletion':False,'inputsSha256':{**inputs,str(Path(__file__)):sha(__file__)}}
    suffix='complete' if final else 'preflight'
    out=L/f'20261012-C364-parent-contracts-{suffix}-01.json'
    with out.open('x') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
    md=['# C364 原98项／A01–A22终核对照','',
        '每项保留原合同、证据日期与范围。普通Chrome当前版本适用性由C362承接；历史失败不改写，明确不支持功能不计为业务成功。',
        '', '| 原项 | 必需合同摘要 | 证据入口 | 适用边界 |','| --- | --- | --- | --- |']
    for row in matrix:
        title=re.split(r'。|\[',row['contract'])[0].replace('|','／')
        links='、'.join(f'[{Path(e["path"]).stem}]({Path(e["path"]).relative_to(L) if Path(e["path"]).is_relative_to(L) else e["path"]})' for e in row['evidence'])
        md.append(f'| {row["id"]} | {title} | {links} | {row["boundary"]} |')
    with (L/f'20261012-C364-parent-contracts-{suffix}.md').open('x') as f:f.write('\n'.join(md)+'\n')
    print(json.dumps({'passed':True,'preflightOnly':not final,'contracts':98,'qa':22,'open':open_ids}))


if __name__=='__main__':main()
