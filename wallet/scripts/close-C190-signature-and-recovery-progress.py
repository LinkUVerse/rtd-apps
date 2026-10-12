#!/usr/bin/env python3
# coding: utf-8
"""Close only two original TX parents after the complete final independent report passes."""
from pathlib import Path
import json, hashlib, re, subprocess, sys
from datetime import datetime, timezone
w=Path(__file__).resolve().parent.parent
d=w/'migrationToGRpcOrGraphQLDoc';l=d/'workLog';r=w.parent.parent
p=Path(sys.argv[1]).resolve();q=json.loads(p.read_text())
for k in ['passed','TX01Complete','TX04Complete','allCurrentAuthorizationContractsAccepted','allEightEntryLiveAndDurableRecoveryAccepted','allOriginalEvidenceSha256Held','original98DenominatorHeld','currentEmptyRecoveryFixAccepted','currentExistingPendingColdRecoveryAccepted']:
    assert q[k] is True,k
assert q['signatureAndPersistentRecoveryCompleted']==q['signatureAndPersistentRecoveryTotal']==12
assert q['signatureAndPersistentRecoveryPercent']==100
assert q['ordinaryChromeAccepted'] is False and q['all98Completed'] is False and q['trialReady'] is False
for f,h in q['inputsSha256'].items():assert hashlib.sha256(Path(f).read_bytes()).hexdigest()==h,f
h=hashlib.sha256(p.read_bytes()).hexdigest();backup=l/'20261010-C190-before-final-progress-01';assert not backup.exists();backup.mkdir()
for name in ['Task.md','remainingAcceptanceProgress.json','totalProgress.md']:(backup/name).write_bytes((d/name).read_bytes())
fine=json.loads((d/'remainingAcceptanceProgress.json').read_text())
for parent in fine['parents']:
    if parent['parentId'] in ['TX-01','TX-04']:
        for c in parent['criteria']:
            if not c['accepted']:
                c['accepted']=True;c['evidence']=[{'path':str(p),'sha256':h,'required':{'passed':True,'TX01Complete':True,'TX04Complete':True,'signatureAndPersistentRecoveryCompleted':12,'signatureAndPersistentRecoveryPercent':100,'allOriginalEvidenceSha256Held':True}}]
fine['updatedAt']=datetime.now(timezone.utc).isoformat();(d/'remainingAcceptanceProgress.json').write_text(json.dumps(fine,ensure_ascii=False,indent=2)+'\n')
task=(d/'Task.md').read_text()
replacements={
'TX-01':'最终 bytes／sender／gas／赞助／expiration 固定及重新授权完整通过。[当前完整收口](./workLog/20261010-C190-TX01-TX04-completion.md)：非NFT全合同、六路54参数/282模拟、54实际有效期UI、四路16唯一sender批准/16同byte赞助签名/160旧签篡改拒绝与四单签执行拒绝，原唯一外部赞助NFT回执当前archive双方原签名复核。旧外部执行UI未冒称当前重跑，原转移未重播。',
'TX-04':'同 H0/generation/account 的跨窗口互斥及 pending 禁止再次构建／签名／发送完整通过。[当前八入口M5](./workLog/20261010-C190-TX01-TX04-completion.md)：币／质押／赎回／dApp和四路NFT真实live竞争/冷重启pending，完整原HTTP实体及实际浏览器终态、三私有入口/三store/密文和源映射逐项独立；重复浏览器副本读取失败明确披露，原正文/终态缺失的历史失败仍不接受。'}
for ident,text in replacements.items():
    task,n=re.subn(r'^- \[[ x]\] `'+ident+r'` .*$', '- [x] `'+ident+'` '+text,task,flags=re.M);assert n==1
# Mark only final compositional deliverables; failed historical experiments remain documented failures.
for ident in ['P162-3','P162-4','P162-5','P167-1','P167-2','P167-3','P188-4','P188-5','P191-4']:
    task=task.replace('- [ ] '+ident+'：','- [x] '+ident+'：')
head='最新状态（2026-10-10，C190完整收口）：**91/98；签名授权与持久恢复12/12（100%）**。TX-01/TX-04完整独立通过；其他7父继续，trial_ready=false。[完整事实与来源边界](./workLog/20261010-C190-TX01-TX04-completion.md)。\n\n'
(d/'Task.md').write_text(head+task)
text='''# TX-01 / TX-04 完整完成（2026-10-10）

签名授权与持久恢复达到 **12/12（100%）**。最终依据为 [C190 完整独立报告](./'''+p.name+''')，所有链接输入 SHA 再次逐一核对。TX-04此前已经完成，本次收口TX-01；原98父任务现 **91/98**，其余 7 父项和 trial_ready 尚未完成。

TX-01：C156 完整非 NFT 授权；C163 当前六路 NFT 的 54 参数变化、6 正常收款变化、120 Gas 选择、150 canonical final、12 原生错误（共282模拟）；C164 当前54实际Wallet Standard有效期UI（24正向、6过期、24不支持timestamp、54独立requestId/24token、216反例）；C167 当前四路内部准备、16唯一sender实际批准与16同byte赞助签名、160修改字节后原签名拒绝、四单签执行拒绝、40模拟及16原生签名复核。完整原字节、source/ABI/effects、三私有入口/三store/密文/正常退出均独立成立。C156/C163/C164/C174属于C136的原实测，C167属于C188的新实测，两者以完整源码差异及保留主体审核关联，不改写原报告。

TX-04：C155完整非NFT四入口M5、C165当前四路NFT实际live竞争/释放后准备、C173原实际durable冷恢复、C174八入口全量M5逐项关联。竞争签名/转发Execute为零，原live私有完成签名未交付；冷重启后保持pending，三个私有入口为零，原三store和密文保持。

C170通过当前rtd-archive-service复核原唯一外部赞助NFT交易696489、完整交易/效果及双方原签名，12缺证反例拒绝；没有重播原批准、mint、转移或Execute。原外部执行UI属于旧构建，不声称当前重跑。C167提供当前源码的新批准/双签/执行边界。普通Chrome、正式全dev冷启动/WAL、名称及全98终验等仍归其余父任务。

完整原HTTP实体及实际浏览器终态均必须成立。C182把已关闭授权弹窗在完整头读取阶段发生、实际route.fetch零调用且浏览器requestfailed的只读请求单独保存；这些记录不是成功HTTP实体，完整原始流量/路由/终态/事件及已完成弹窗的归属经独立验证。所有真正转发的请求仍执行原完整正文/头/交付/释放合同，不允许验证或执行请求混入取消。个别浏览器重复响应副本读取失败按C173严格交付关联接受并在独立报告披露，原bodyReadError保留，不填造body。原C162 live缺终态、C165早期容量失败及C166缺原正文均保留失败，未用于完整收口。此次C188修复了空恢复占用签名锁的问题：1122源中仅1个生产文件及2个测试文件变化，生产逆变换确认原锁内pending恢复、execute、签名与准备主体保持。59定向和219完整回归、类型检查、完整产物闭包及源码资格通过；C167使用新构建完整验收。C189新构建对正常升级、重新上锁并通过浏览器UI停用扩展后的独立完整profile副本做全浏览器冷重启，完整采集器就绪后正常启用扩展恢复，仍逐项核对最初产品创建的真实pending，四NFT恢复页面、原三store/密文/三私有入口零、完整原响应与旧digest查询独立通过，未重播原creator。C156/C163/C164/C174等原C136实测按封存源码来源保留，明确不是在C188上重跑；唯一变化的历史输入使用原字节快照和当前源码逆变换关联。C191完成原测试扩展路径正常版本升级，新安装与C188独立编译输出完全相同，旧C136全部产物完整归档并按原SHA映射核对。扩展ID与持久存储namespace保持，manifest/来源策略未修改。业务数据、journal/watermark/fence未修改，无关环境未重启。
'''
completion=l/'20261010-C190-TX01-TX04-completion.md';assert not completion.exists();completion.write_text(text)
state=l/'current-state.md';state.write_text(head+state.read_text())
# The paired acceptance documents retain the archive baseline and identical shared body.
a=d/'07-落地批次与验收清单.md';b=r/'rtd-archive-service/docs/wallet/06-落地批次与验收清单.md'
assert a.read_text().splitlines()[4:]==b.read_text().splitlines()[4:]
addition='\n## C190 签名授权与持久恢复完整收口\n\n主人解除NFT顺序限制后，C136原实测与C188当前1122源构建经完整来源差异审核及新实测汇总，TX-01/04已按完整原合同独立通过，签名授权与持久恢复12/12（100%），总进度91/98，其他七父和trial_ready仍开放。当前六路54参数/282模拟、54实际有效期UI、四路16唯一sender批准/16同byte sponsor签名/160修改字节旧签拒绝、四单签执行拒绝，以及八入口live/durable/M5均有完整来源/字节/原实体/实际终态/私有计数/三store与密文证据。当前archive只读复核原唯一双签NFT成功回执，旧UI未冒称当前重跑，旧批准/交易不重播；重复浏览器副本读取失败严格披露，缺原正文/实际终态的历史失败仍不接受。完整证明见钱包workLog/20261010-C190-TX01-TX04-completion.md及最终独立JSON。\n'
addition+='\nC188空恢复只读候选预查不占执行锁；有pending仍在原锁内重新读取、授权和恢复。C189对原真实pending独立副本正常停用扩展、全浏览器冷重启并在完整采集就绪后正常启用恢复，四NFT页面/三store/密文和零新签名/发送实际独立成立。旧C136来源与C188新来源经逐字节差异审核关联，原UI未冒称重跑。\n'
a.write_text(a.read_text()+addition);b.write_text(b.read_text()+addition)
subprocess.run([sys.executable,str(w/'scripts/update-migration-progress.py')],cwd=w,check=True)
print('仅两个TX父项完整收口；签名授权与持久恢复12/12，总91/98。')
