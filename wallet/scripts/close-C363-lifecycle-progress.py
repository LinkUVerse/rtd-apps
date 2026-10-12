#!/usr/bin/env python3
"""Close the original lifecycle parent only after every one of its ten packages passes."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess

W=Path(__file__).resolve().parents[1];D=W/'migrationToGRpcOrGraphQLDoc';L=D/'workLog'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    ledger=json.loads((D/'remainingFiveWorkPackages.json').read_text())
    parent=next(p for p in ledger['parents'] if p['id']=='QA-A17')
    assert len(parent['items'])==10 and all(i['status']=='done' for i in parent['items'])
    required={
        '20261011-C266-qualification-01.json':{'lateUiStayedRejected':True,'originalNetworkFieldsAndPackagesRestored':True},
        '20261011-C270-qualification-01.json':{'oldGenerationHiddenPreserved':True,'newGenerationHiddenEmpty':True,'originalAssetVisibilityRestored':True},
        '20261012-C295-complete-replay-01.json':{'fixedRangeReplayAccepted':True,'allPersistedWatermarksAtFinalCheckpoint':True},
        '20261012-C348-full-data-comparison-01.json':{'completeDataComparisonAccepted':True,'threeAccountBusinessResultsEqual':True},
        '20261012-C363-complete-wal-01.json':{'fullPersistentDataAndWalAccepted':True},
        '20261012-C296-lifecycle-accepted-01.json':{'actualSameUrlFourRoleWrongChainMatrix':True,'currentOriginalProfileRestored':True},
        '20261012-C356-backend-generation-01.json':{'actualBackendGenerationChanged':True,'ordinaryChromeAcceptance':True,'temporaryRouteAndProxyCleaned':True},
        '20261012-C363-complete-archive-01.json':{'archiveOnlyRebuildAccepted':True,'independentlyAdmittedReadOnlyServices':True},
        '20261012-C313-lifecycle-qualified-01.json':{'actualRegistryInvalidationAndRecovery':True,'actualSameUrlWrongH0Roles':4},
        '20261012-C362-upgrade-completion-01.json':{'traceabilityComplete':True,'transactionPreparationAndAuthorizationModulesUnchanged':True},
    }
    pins={}
    for name,facts in required.items():
        p=L/name;r=json.loads(p.read_text());assert r['passed'] and all(r.get(k)==v for k,v in facts.items()),name
        pins[str(p)]=sha(p)
    stamp=datetime.now(timezone.utc).isoformat()
    result={'passed':True,'at':stamp,'parentId':'QA-A17','packages':10,
        'fullOriginalLifecycleContractAccepted':True,'currentBrowserLifecycleAccepted':True,
        'originalScopeAndAllFailedAttemptsRetained':True,'allPhysicalAndBrowserFaultCombinationsRepeated':False,
        'productionMultiHostHA':False,'inputsSha256':{**pins,str(Path(__file__)):sha(__file__)}}
    out=L/'20261012-C363-lifecycle-completion-01.json'
    with out.open('x') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
    fine_path=D/'remainingAcceptanceProgress.json';fine=json.loads(fine_path.read_text())
    for p in fine['parents']:
        if p['parentId']=='QA-A17':
            for c in p['criteria']:
                assert not c['accepted'];c['accepted']=True
                field='fullOriginalLifecycleContractAccepted' if c['id']=='full_lifecycle' else 'currentBrowserLifecycleAccepted'
                c['evidence']=[{'path':str(out),'sha256':sha(out),'required':{'passed':True,field:True}}]
    fine['updatedAt']=stamp;fine_path.write_text(json.dumps(fine,ensure_ascii=False,indent=2)+'\n')
    t=D/'Task.md';text=t.read_text();old=next(row for row in text.splitlines() if row.startswith('- [ ] `QA-A17`'))
    new='- [x] `QA-A17` 网络与dev归零完整收口：URL/registry变动、同host实际换H0、同H0实际后端generation、迟到响应隔离、原0..709569全部41管线与全数据/三账户比较、独立空查询重建、仅归档替换、完整保留数据冷恢复及真实HBase/PG WAL恢复均通过。当前C51原G4配置、四账户与原pending保留；源端/副本全部版本、历史fence持久与恢复后四入口实读通过。[完整证据、历史范围与限制](./workLog/20261012-C363-lifecycle-completion.md)。不宣称生产多机HA或所有故障笛卡尔积均在Chrome重跑。'
    text=text.replace(old,new)
    # Original C104 preparation failed. Retain those unchecked attempts and explicitly link their completed successors.
    marker='## QA-A17／QA-A20：C104 完整重建与冷恢复'
    addition='\n\n2026-10-12 C363完整后继已通过：P104-2–5的实际合同由C120/C139/C348/C353/C356/C357–C363覆盖；P140-3由完整版本/副本/fence与冷WAL及独立只读授权覆盖。下方原C104 attempt保留失败状态，不把原未执行操作改成成功，详见[C363后继收口](./workLog/20261012-C363-lifecycle-completion.md)。'
    assert marker in text;text=text.replace(marker,marker+addition,1);t.write_text(text)
    md=L/'20261012-C363-lifecycle-completion.md';old=md.read_text()
    md.write_text('# C363 数据生命周期最终验收\n\n**已完成：QA-A17 10/10，原父项现97/98。** '+stamp+'。\n\n'
        '完整持久/WAL包和仅归档重建包均通过，恢复后生产reader实际读取及当前普通Chrome换代证据已闭合。'
        '[完整WAL汇总](./20261012-C363-complete-wal-01.json)、[归档恢复汇总](./20261012-C363-complete-archive-01.json)、'
        '[父合同审核](./20261012-C363-lifecycle-completion-01.json)。\n\n以下保留实施前的未完成状态和范围约定：\n\n'+old)
    subprocess.run(['python3',str(W/'scripts/update-migration-progress.py')],check=True)
    print('QA-A17 complete; 97/98 original parents')


if __name__=='__main__':main()
