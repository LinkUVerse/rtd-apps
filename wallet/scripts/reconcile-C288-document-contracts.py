#!/usr/bin/env python3
"""Apply reviewed, scoped documentation corrections while preserving originals."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json

W = Path(__file__).resolve().parents[1]
R = W.parents[1]
D = W / 'migrationToGRpcOrGraphQLDoc'
A = R / 'rtd-archive-service/docs/wallet'
L = D / 'workLog'
B = L / '20261012-C288-document-originals'
changes = {}


def edit(p, old, new):
    content = changes.get(p, p.read_text())
    assert content.count(old) == 1, (p, old, content.count(old))
    changes[p] = content.replace(old, new)


def paired(merged, original, old, new):
    for p in [D / merged, A / original]:
        edit(p, old, new)


paired('02-选型决策与源码基线.md', '01-选型决策与源码基线.md',
       '## 1. 当前证据', '## 1. 2026-10-02 源码评估快照')
paired('02-选型决策与源码基线.md', '01-选型决策与源码基线.md',
       '### 1.1 已经拥有的资产', '### 1.1 初始评估曾记录的资产')
paired('02-选型决策与源码基线.md', '01-选型决策与源码基线.md',
       '这些是**源码存在**的证据，并非本次逐项实际测试通过。',
       '这些是 2026-10-02 评估快照中的源码记录；其中 archive*.ts／transactionRecovery*.ts 局部实现后来已撤销，不能用此清单证明现行文件存在或已验收。现行实现位于 wallet/src/shared/rpc，包括 account-history-reader、execution-journal 和 execution-coordinator，实际版本与普通 Chrome 证据见钱包 C281／C280 工作日志。')
paired('02-选型决策与源码基线.md', '01-选型决策与源码基线.md',
       '5. 固定一个开发分支，只运行一套新数据层。历史基准以 tag／归档只读保存，不运行第二个节点服务组合。',
       '5. 保持单一活动钱包实现与明确的当前试用网络。历史源码基准只读保存；网络换代、旧 pending 隔离、完整回放等验收确需另一套链／数据层时，按独立目录、端口、H0／generation 和资源清单隔离，记录保留原因，验收后清理失去用途的环境。不能仅按进程同名杀掉必要的对照服务。')

for merged, original in [('03-端点职责与浏览器接入架构.md','02-端点职责与浏览器接入架构.md')]:
    paired(merged, original,
           '日期：2026-10-02。下文的浏览器入口为待实施设计；现有服务原生接口验收见架构 workLog。',
           '初版设计日期：2026-10-02。正文规定端点合同；带日期的部署观察只代表对应时点。现行 C278 钱包的四类入口与普通 Chrome 验收见钱包 C281／C280 工作日志，当前地址见合并方案第 14 章。')
    paired(merged, original,
           '| 归档 KV | RtdGrpcClient + 浏览器 gRPC-Web | 已验的是原生 HTTP/2 gRPC；无 GrpcWebLayer | 新增 gRPC-Web→原生 gRPC 协议桥接入口，再进行 Chrome 验收 |',
           '| 归档 KV | RtdGrpcClient + 浏览器 gRPC-Web | KV 保持原生 HTTP/2 gRPC；受控协议桥接已提供浏览器入口 | C281／C280 有实际 Chrome 和恢复证据；不得将内部 native host:port 填成浏览器 URL |')
    paired(merged, original,
           '它们只是当前 dev 观察，发布前必须重新读运行时绑定。',
           '它们只是 2026-10-02 的 dev 观察，不能用于启动当前 G4；发布前必须读取当前运行时绑定。')

paired('04-SDK契约与功能迁移矩阵.md','03-SDK契约与功能迁移矩阵.md',
       '质押与赎回合约调用继续使用同链系统包，签名执行统一走 04。',
       '质押与赎回合约调用继续使用同链系统包，签名执行统一遵循合并方案第 05 章。')
paired('05-交易签名执行与恢复.md','04-交易签名执行与恢复.md',
       '本轮重新读取 WalletSigner、BackgroundServiceSigner 与 WalletStandardInterface。当前基线没有 transactionRecovery.ts 或 transactionRecoveryBrowser.ts；需要从零实现并验证以下恢复合同。',
       '2026-10-03 初始盘点读取了当时的 WalletSigner、BackgroundServiceSigner 与 WalletStandardInterface，基线没有 transactionRecovery.ts 或 transactionRecoveryBrowser.ts。现行恢复已由 wallet/src/shared/rpc/execution-journal.ts、execution-journal-browser.ts、execution-coordinator.ts 等实现；以下约束继续有效，完整签名恢复状态见 C190，当前 G4 冷恢复及原 pending 保留见 C280。')

paired('07-落地批次与验收清单.md','06-落地批次与验收清单.md',
       '日期：2026-10-02。本文所有实施项当前均为**待执行**。本轮只完成设计文档，不勾选钱包编码、浏览器接入或生产部署。',
       '初版设计日期：2026-10-02。W00–W07 是工作分组与验收门槛，当前完成计数唯一依据钱包 Task.md 的 98 项及 totalProgress.md；本章历史“待执行”记录不覆盖后续实证，也不代表生产部署已验收。')
paired('07-落地批次与验收清单.md','06-落地批次与验收清单.md',
       'W02，端到端需W04–04', 'W02，端到端需W03–04')
old = '''- [ ] W00：已提交／归档的基准同时含未提交与未跟踪源码；版本／文件哈希／功能期望保存，秘密与运行时数据排除。
- [ ] W02：配置校验、三入口真实身份、归档浏览器桥接、可信门禁、权限／TLS与流均有Chrome证据；新入口已持久到dev部署。
- [ ] W03：wallet与受影响core消费者能构建；发布没有旧包导出假兼容；客户端与Hook按完整网络隔离。
- [ ] W04：真实成功／失败／未知提交、跨窗口互斥、worker恢复和Wallet Standard新效果映射通过，journal升级可恢复。
- [ ] W05：资产与名称矩阵通过，GraphQL落后不会归零，gas与发送前验证使用Fullnode当前数据。
- [ ] W06：发送／收支历史语义区分、归档旧详情、动态字段／Kiosk、质押／APY及多epoch分支通过。
- [ ] W07：全部基础功能、边界、故障恢复、dev重建、保留数据冷启动和Chrome真实回归闭合。
- [ ] W08：生产bundle审计／抓包无JSON-RPC、同链配置／可回滚发布、观测与运维说明齐备，所有例外有明确范围。'''
new = old.replace('- [ ] ', '- ').replace('W02：','W01：').replace('W03：','W02：').replace('W04：','W03：').replace('W05：','W04：').replace('W06：','W05：').replace('W07：','W06：').replace('W08：','W07：')
paired('07-落地批次与验收清单.md','06-落地批次与验收清单.md', old, new)

edit(D/'01-冲突裁决与实施基线.md', '## 3. 当前实施基线与完整性', '## 3. 2026-10-03 初始实施基线与合并完整性')
edit(D/'01-冲突裁决与实施基线.md', '当前 apps HEAD 为 8568344，工作区业务源码无这些文件；', '2026-10-03 初始 apps HEAD 为 8568344，当时工作区业务源码无这些文件；')
edit(D/'01-冲突裁决与实施基线.md', '当前安装 typescript SDK 为 2.31.3、Kiosk 为 1.4.13，源码仍旧 RPC。', '2026-10-03 安装快照为 typescript SDK 2.31.3、Kiosk 1.4.13，当时钱包源码仍用旧 RPC。')
edit(D/'09-协议选型与官方规范.md',
     '本钱包资产页固定 GraphQL 一致快照；交易与事件历史固定 GraphQL；官方两者顶层 API 可用，复杂历史条件与组合展示优先 GraphQL',
     '本钱包资产页用原生 GraphQL 一致快照，账户活动用独立 accountHistoryUrl 扩展，事件／标准筛选用原生 GraphQL；各自核验覆盖，不能混为同一 SDL')
edit(D/'09-协议选型与官方规范.md',
     '旧 JSON-RPC 客户端可作为短期过渡；其最终退出计划应根据 RTD 的实际节点和网关发布节奏制定。',
     '本钱包发布路径已选定无 JSON-RPC fallback，故障时暂停相关能力并保留 journal。官网允许其他应用渐进保留旧客户端的建议，不构成本钱包重新启用旧协议的授权；RTD 全网服务停用仍由各业务迁移情况独立决定。')
edit(D/'11-数据服务拓扑与历史保留.md',
     '按已核验的覆盖范围切到归档 gRPC；现阶段只能在旧版原生历史 JSON-RPC 已索引范围内暂用兼容路径。',
     '按已核验覆盖显式读取归档 gRPC；本钱包无 JSON-RPC 兼容回退。下文旧 rtd-indexer 端点仅是 2026-09-24 的独立系统观察。')
edit(D/'12-前端迁移实施方案.md',
     '| 过渡期尚未迁移的旧方法                                                           | 隔离在 `RtdJsonRpcClient` 适配层                                           | 明确仍开启的 RTD JSON-RPC 入口                                          | 仅用于阶段性迁移；停用门槛是调用点与验收全部完成，不能把旧接口当长期生产依赖。                    |',
     '| Mobile 等其他应用的阶段性旧方法（不适用于本钱包） | 如采用渐进迁移，应独立隔离旧客户端 | 由对应应用验证其旧 RTD 入口 | 本钱包无旧协议适配／fallback；本轮不据此启用 Mobile 或停掉其他业务仍依赖的服务。 |')
edit(D/'12-前端迁移实施方案.md', '## 4. Chrome 钱包与 `rtd-apps/core` 的迁移顺序',
     '## 4. Chrome 钱包与 `rtd-apps/core` 的迁移顺序\n\n以下四项是初版迁移要求；“仍指向／仍导入”描述 2026-09-24 源码快照。现行 C278 已完成自有 Provider、SDK 和全部 RPC 迁移，当前代码及实际请求来源由 C281 核对；不能把这些历史缺口当成现行缺陷。账户活动使用独立 accountHistoryUrl，不以原生 sender／affected 列表替代其合同。')
edit(D/'13-验收矩阵与落地次序.md', 'GraphQL `chainIdentifier`', 'GraphQL `checkpoint(sequenceNumber: 0).digest`')
edit(D/'13-验收矩阵与落地次序.md', '请求 `chainIdentifier`、`serviceConfig`', '请求 `checkpoint(sequenceNumber: 0){digest}`、`serviceConfig`')
edit(D/'13-验收矩阵与落地次序.md',
     '使用保存的同一签名和 digest 查证；未知状态不创建第二笔付款；链 ID 不一致拒绝广播',
     '钱包按持久原 digest／链身份只读查证，不持久化可重放 signed payload；Mobile 原订单状态机另按其合同；未知不创建第二笔付款')

# Date every chapter's evidence boundary; historical staged progress remains intact.
for p in sorted(D.glob('[0-9][0-9]-*.md')):
    if p.name.startswith('14-'):
        continue
    content=changes.get(p,p.read_text())
    heading,rest=content.split('\n',1)
    scope=('本章 2026-09-24 的源码／安装／运行观察保留为历史；Mobile／生产运维建议不属于本次钱包 dev 完成计数。' if int(p.name[:2])>=9 else '初始源码评估和带日期实施记录保留其原始时点；设计约束继续有效，历史“待实现／未完成”不覆盖后续验收。')
    changes[p]=heading+'\n\n> 2026-10-12 语义核对：'+scope+' 当前构建与真实业务来源见 [C281](./workLog/20261012-C281-business-traffic-completion.md)，当前环境及未收口合同见 [第 14 章](./14-开发验收包安装与回归说明.md)／[剩余工作量](./leftProgress.md)。\n'+rest

assert not B.exists()
B.mkdir()
manifest=[]
for p,new in changes.items():
    old=p.read_bytes()
    destination=B/('archive-' if p.is_relative_to(A) else 'wallet-')
    destination=destination.with_name(destination.name+p.name)
    destination.write_bytes(old)
    p.write_text(new)
    manifest.append({'path':str(p),'before':str(destination),'beforeSha256':hashlib.sha256(old).hexdigest(),'afterSha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(L/'20261012-C288-document-edits-01.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'scope':'Reviewed temporal, endpoint, work-package numbering and recovery contract corrections; full REL-05.4 semantic audit still pending.','completeSemanticAcceptance':False,'files':manifest},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'updated':len(changes),'originalsPreserved':True,'parentCompletion':False}))
