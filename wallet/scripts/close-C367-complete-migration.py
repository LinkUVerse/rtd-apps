#!/usr/bin/env python3
"""Publish 98/98 only after original contracts, runtime cleanup and all prior packages pass."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib
import json
import re
import subprocess

W=Path(__file__).resolve().parents[1];D=W/'migrationToGRpcOrGraphQLDoc';L=D/'workLog'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    stamp=datetime.now(timezone.utc).isoformat();pins={}
    def proof(name,**facts):
        p=L/name;j=json.loads(p.read_text());assert j['passed'] and all(j.get(k)==v for k,v in facts.items()),name
        pins[str(p)]=sha(p);return j
    proof('20261012-C363-lifecycle-completion-01.json',fullOriginalLifecycleContractAccepted=True,currentBrowserLifecycleAccepted=True)
    proof('20261012-C364-parent-contracts-complete-01.json',acceptedUnderlying97Contracts=True,
          originalParentContracts=98,qaContracts=22,explicitUnsupportedFeaturesAndHistoricalFailuresPreserved=True)
    runtime=proof('20261012-C366-final-runtime-01.json',releaseRuntimeAndCleanupAccepted=True,
          actualCurrentBusinessUnchanged=True,ordinaryChromeAfterCleanupAccepted=True,installedArtifactsStillExact=True)
    source=proof('20261012-C362-upgrade-completion-01.json',traceabilityComplete=True,validatorSelectionFixAccepted=True)
    proof('20261012-C290-document-contracts-01.json',sourceBodyUnionMatchesMerged=True)
    proof('20261012-C281-business-traffic-01.json')
    assert runtime['walletSource']==source['source']
    task_path=D/'Task.md';task=task_path.read_text()
    rows=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)` (.*)$',task,re.M)
    assert len(rows)==98 and [i for m,i,_ in rows if m!='x']==['REL-05']
    ledger_path=D/'remainingFiveWorkPackages.json';ledger=json.loads(ledger_path.read_text())
    items=[i for p in ledger['parents'] for i in p['items']]
    assert len(items)==45 and [i['id'] for i in items if i['status']!='done']==['REL-05.8']
    fine_path=D/'remainingAcceptanceProgress.json';fine=json.loads(fine_path.read_text())
    for p in fine['parents']:
        if p['parentId']=='REL-05':continue
        for c in p['criteria']:
            assert c['accepted'] and c['evidence']
            for e in c['evidence']:
                assert sha(e['path'])==e['sha256'];j=json.loads(Path(e['path']).read_text())
                assert j['passed'] and all(j.get(k)==v for k,v in e['required'].items())
    before=L/'20261012-C367-task-before-final-status.md'
    with before.open('x') as f:f.write(task)
    pins[str(before)]=sha(before)
    cleanup=runtime['retirement']
    handover=L/'20261012-C367-complete-delivery.md'
    body=f'''# 钱包新 RPC 迁移完整交付

验收时间：{stamp}。原 **98/98** 项、最后五项 **45/45** 子包、原27个剩余子包均已完成，剩余比例 **0%**。

## 当前可试用环境

普通 C51 Chrome 已安装 C362（26.10.12.0），扩展ID `kiahlcbejlgmnbmcggnhagbccojnbkaa`。原四账户和独立profile保留，稳定路径仍为 `dev-20261006-03/certified-positive-production-C46-20261007-01`，目录名不代表当前构建。当前G4 `c51-tls-acceptance` revision4，完整H0为 `BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah`。

| 服务 | 当前入口 |
| --- | --- |
| Fullnode gRPC-Web | http://127.0.0.1:43150 |
| GraphQL | https://127.0.0.1:43210/graphql |
| 归档 gRPC-Web | https://127.0.0.1:43203/archive |
| 账户历史 | https://127.0.0.1:43211/account/graphql |

指定rtd最新源码C347 debug已由C360实际部署至G4；C366在临时环境清理后核验源代码/八种产物、13个当前容器、持续出块、真实余额/资产/历史/质押/名称和原交易读取，普通Chrome首页100 RTD及发送入口通过。C362修复验证者选择被后台刷新清空的问题；269项针对性回归、钱包/core两项类型检查、完整生产构建和依赖闭包通过。

## 完整恢复及清理

原0..709569全部41条持久管线已从归档完成重放。SQL29表53,813,169行、HBase14表83,387,096单元及时间戳、Rocks8列族、归档8表、完整账户事实与三账户9/6/1笔支持历史均已核对。源码中的位图恢复缺陷已修复并验证36行338个成员。

published与副本各795,324版本，staging 1,006,772版本完整核对；恢复时所有body/VersionId已逐一读回，冷启动后逐版本核对size/latest并重读全部元数据。真实HBase未flush WAL与PostgreSQL Immediate Shutdown恢复、全数据故障后比对及历史fence重启持久化通过。全部工作限本机指定dev；不宣称生产跨宿主HA或正式RPO/RTO。

已正常停止并删除 {cleanup['removedContainers']} 个完成使命的恢复临时容器，正常停止 {cleanup['normalStoppedParentProcesses']} 个主进程及账户worker，删除 {len(cleanup['removedImageIds'])} 个确认无使用者的专用镜像；保留 {len(cleanup['retainedVolumeNames'])} 个数据卷和全部bind数据、配置与失败记录。共享镜像按仍有使用者保留。G3用于原H0、默认开发profile和原pending对照，G4用于当前试用；两条链及 `rtd-archive-events-hbase3` 六个中间件保留，无无依据停机。

## 验收边界与后续使用

98项完成指钱包约定的迁移及验收合同。21个旧RPC/54个路由已有逐项来源、版本和例外追溯；不声称54条路由全部重跑真实浏览器。历史失败保留，后继通过注明范围。账户活动仅承诺证书支持类型和窗口。当前兑换不可用；zkLogin签名、Qredo执行、Ledger、法币服务按明确支持状态隔离。

原G3待定摘要按原H0/generation/账户保留并只读恢复，不因G4不存在该摘要而删除、重签或重发。所有后续重启先核对当前身份记录与真实端口，使用指定仓库最新debug和合约部署目录；不重放绑定旧PID/容器ID的历史单次故障脚本。不在文件中保存钱包密码。

证据：[生命周期](./20261012-C363-lifecycle-completion.md)、[98项逐项审核](./20261012-C364-parent-contracts-complete.md)、[最终运行与清理](./20261012-C366-final-runtime-01.json)、[当前源码/页面追溯](./20261012-C362-upgrade-completion-01.json)、[全部实际业务流量](./20261012-C281-business-traffic-completion.md)。
'''
    with handover.open('x') as f:f.write(body)
    pins[str(handover)]=sha(handover)
    guide=D/'14-开发验收包安装与回归说明.md';guide_before=L/'20261012-C367-installation-guide-before-final-status.md'
    guide_text=guide.read_text()
    with guide_before.open('x') as f:f.write(guide_text)
    previous='总体 **96/98**；核心可试用门槛已通过，完整交付仍待 QA-A17 和 REL-05。'
    assert previous in guide_text
    guide_text=guide_text.replace(previous,'总体 **98/98**，最后五项 **45/45**；核心可试用与完整交付门槛均已通过，剩余 **0%**。',1)
    pending='仍待源端对象版本清单终结、归档fence持久复核、最终临时环境清理及98项交付终核，以leftProgress为准。'
    assert pending in guide_text
    guide_text=guide_text.replace(pending,'源端完整版本清单、历史fence真实重启持久、恢复后四入口、临时资源清理及98项终核均已通过，详见[C367最终交付](./workLog/20261012-C367-complete-delivery.md)。',1)
    guide.write_text(guide_text)
    pins[str(guide_before)]=sha(guide_before);pins[str(guide)]=sha(guide)
    result={'passed':True,'at':stamp,'completeOriginal98ContractsAccepted':True,'originalParents':98,
        'allA01A22Accepted':True,'all45AcceptancePackagesAccepted':True,'remainingOriginal27Packages':0,
        'runtimeCleanupAndCurrentBrowserAccepted':True,'explicitScopeLimitationsRetained':True,
        'productionMultiHostHA':False,'allHistoricalTestsRerunToday':False,'committedOrPushed':False,
        'inputsSha256':{**pins,str(Path(__file__)):sha(__file__)}}
    out=L/'20261012-C367-complete-delivery-01.json'
    with out.open('x') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
    target=next(i for i in items if i['id']=='REL-05.8');target.update(status='done',basis='./'+handover.name)
    ledger.setdefault('completionHistory',[]).append({'id':'REL-05.8','at':stamp,
        'summary':'All original 98 contracts, complete lifecycle, current build/runtime/browser and scoped cleanup accepted; no required gap remains.'})
    for p in ledger['parents']:
        p['completed']=sum(i['status']=='done' for i in p['items']);p['remaining']=p['total']-p['completed']
    ledger.update(completedPackages=45,openPackages=0,remainingPackagePercent=0.0,
                  originalCompletedParents=98,parentCompletion=True,observedAt=stamp)
    ledger['currentWork']=['原98/98及最后五项45/45完整通过；原27未收口子包全部完成，剩余0%。',
        'C363完整持久/WAL及仅归档重建通过；C364逐98/A01–A22合同审核通过。',
        'C365完成13容器/6主进程及1worker的精确正常清理，数据卷和G3/G4及共享中间件保留。',
        'C366清理后当前源码/debug/构建、实际业务和普通C51余额/发送页面复核通过；C362仍为安装版本。',
        '完整交付说明见workLog/20261012-C367-complete-delivery.md；历史失败、原pending和明确不支持范围均保留。']
    ledger_path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
    for p in fine['parents']:
        if p['parentId']=='REL-05':
            for c in p['criteria']:
                assert not c['accepted'];c['accepted']=True;c['evidence']=[{'path':str(out),'sha256':sha(out),
                    'required':{'passed':True,'completeOriginal98ContractsAccepted':True,'runtimeCleanupAndCurrentBrowserAccepted':True}}]
    fine['updatedAt']=stamp;fine_path.write_text(json.dumps(fine,ensure_ascii=False,indent=2)+'\n')
    old=next(row for row in task.splitlines() if row.startswith('- [ ] `REL-05`'))
    task=task.replace(old,'- [x] `REL-05` 逐文档、21个旧RPC、54条声明路由、A01–A22与98原项全部必需合同完成审核；当前C362构建/安装、G4最新debug、恢复后业务及普通Chrome、临时资源精确清理均通过。98/98、45/45、原27子包剩余0%；历史失败和明确不支持范围保留。[最终交付](./workLog/20261012-C367-complete-delivery.md)。')
    task='当前完整交付（2026-10-12，C367）：**98/98；QA22/22，REL5/5；最后五项45/45，原27剩余子包全部完成，剩余0%**。[最终交付](./workLog/20261012-C367-complete-delivery.md)、[实时清单](./leftProgress.md)。以下带旧日期的执行状态和失败attempt保留为历史，不代表当前待办。\n\n'+task.replace('当前执行状态（2026-10-12，C356–C360）','历史执行状态（2026-10-12，C356–C360）',1)
    task_path.write_text(task)
    current=L/'current-state.md';current.write_text('## C367 完整交付（2026-10-12）\n\n原98/98、最后五项45/45、原27剩余子包全部完成，剩余0%。C363生命周期、C364全合同、C365精确清理、C366当前G4和普通C51复核全部通过。当前C362 26.10.12.0，首页100 RTD、发送及质押入口可用；原账户/pending和G3/G4/共享中间件保留。[交付说明](./20261012-C367-complete-delivery.md)。\n\n以下是按日期保留的历史状态，旧未完成数字不代表当前进度。\n\n'+current.read_text())
    subprocess.run(['python3',str(W/'scripts/update-migration-progress.py')],check=True)
    actual=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',task_path.read_text(),re.M)
    assert len(actual)==98 and all(m=='x' for m,_ in actual)
    confirmation={'passed':True,'at':datetime.now(timezone.utc).isoformat(),'parents':'98/98','packages':'45/45',
        'remainingPercent':0,'inputsSha256':{str(p):sha(p) for p in [out,task_path,ledger_path,fine_path,D/'leftProgress.md',D/'totalProgress.md']}}
    with (L/'20261012-C367-published-status-01.json').open('x') as f:json.dump(confirmation,f,ensure_ascii=False,indent=2);f.write('\n')
    print('98/98 original parents; 45/45 packages; original 27 remaining: 0%')


if __name__=='__main__':main()
