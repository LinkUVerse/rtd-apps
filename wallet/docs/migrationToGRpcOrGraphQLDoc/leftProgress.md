# 剩余工作量

更新时间：2026-10-12 17:59:00 +0800（北京时间）。

最后五项内部：**45/45 个子包完成；0 个未收口；剩余 0.0%**。

本轮原有27个未收口子包：**已完成 27 个；仍有 0 个；剩余 0.0%**。此口径固定原基线，不因拆分或重排改变分母。

基线为 C271 的 45 个子包，其中 18 个已完成、27 个未收口。子包等权统计，不是工时估算；部分完成仍保留为未收口。每个子包的“验收剩余”采用 0%／100% 二值：0% 表示该包全部必需条件及证据成立，100% 表示尚未完整收口，不代表内部毫无进展。真实数据回放百分比单独记录，不能替代业务验收。

唯一状态源为 [子包清单](./remainingFiveWorkPackages.json)。每完成一个子包，更新其状态、证据和清单汇总，再执行 `python3 scripts/update-migration-progress.py`，同时生成本文及[总体进度](./totalProgress.md)。父项只有完整通过才更新 [Task.md](./Task.md) 和细分验收依据。

## 五项剩余比例

| 父项 | 完成／总数 | 未收口 | 内部剩余 |
| --- | ---: | ---: | ---: |
| QA-A15 名称完整验收 | 8/8 | 0 | 0.0% |
| QA-A17 网络换代与数据生命周期 | 10/10 | 0 | 0.0% |
| QA-A20 完整故障与冷启动 | 7/7 | 0 | 0.0% |
| REL-02 全部真实业务流量 | 12/12 | 0 | 0.0% |
| REL-05 完整交付终验 | 8/8 | 0 | 0.0% |

## 历史基线与收口状态

C271 现场基线：发布水位 1,006,768，待发布上界 1,482,841；新质押和 NFT 转移分别位于 1,988,842／2,001,906。固定重放范围 0..709569 的 41 条持久管线最低为 458,532，数据覆盖 64.62%。这些是有时间边界的观测，当前状态以最新工作日志为准。

1. 原0..709569全部重放、完整持久数据/WAL和归档重建已通过。
2. 当前Chrome完整换代、迟到结果、保留数据与仅归档恢复均已通过。
3. 逐文档/RPC/页面、98项/A01–A22、当前运行和临时资源清理完整通过。

2026-10-11 主人已授权必要时重置本任务 dev 链及归档索引。重置前核实范围并保留原钱包账户、待定交易 journal 和必要故障证据；若确认是 rtd／rtd-archive-service 逻辑缺陷，必须修复相应源码。不能用清库掩盖缺陷，也不能把较小新环境的通过记录冒充原 0..709569 全量回放完成。环境启动和合约部署使用 link-u-smart-contract 的脚本，RTD 服务使用指定仓库最新源码 debug 产物。

原分析与慢因：[C271 盘点](./workLog/20261011-C271-five-parent-breakdown.md)。后续实施：[C272 工作日志](./workLog/20261011-C272-left-progress-and-environment.md)。

最新实施状态：

- 原98/98及最后五项45/45完整通过；原27未收口子包全部完成，剩余0%。
- C363完整持久/WAL及仅归档重建通过；C364逐98/A01–A22合同审核通过。
- C365完成13容器/6主进程及1worker的精确正常清理，数据卷和G3/G4及共享中间件保留。
- C366清理后当前源码/debug/构建、实际业务和普通C51余额/发送页面复核通过；C362仍为安装版本。
- 完整交付说明见workLog/20261012-C367-complete-delivery.md；历史失败、原pending和明确不支持范围均保留。

## QA-A15 名称完整验收

| 子包 | 验收内容 | 状态 | 验收剩余 | 证据／待办 |
| --- | --- | --- | ---: | --- |
| QA-A15.1 | 当前名称入口启用、错误提示及普通地址回退 | 完成 | 0% | [证据](./20261011-C241-name-feedback-and-enablement.md) |
| QA-A15.2 | 名称索引记录与当前 Fullnode 不一致时拒绝，保留当前新鲜度校验 | 完成 | 0% | [证据](./workLog/20261012-C278-name-address-approval.md) |
| QA-A15.3 | 当前正式窗口名称正向解析 | 完成 | 0% | [证据](./workLog/20261011-C277-current-name-validation.md) |
| QA-A15.4 | 当前默认反向解析、显示名与地址区分 | 完成 | 0% | [证据](./workLog/20261012-C278-name-address-approval.md) |
| QA-A15.5 | 真实缺失名称与过期名称分支 | 完成 | 0% | [证据](./workLog/20261011-C277-current-name-validation.md) |
| QA-A15.6 | 真实改名、续期后的解析变化 | 完成 | 0% | [证据](./workLog/20261012-C278-name-address-approval.md) |
| QA-A15.7 | registry错链/变更在当前完整链路中的拒绝 | 完成 | 0% | [证据](./workLog/20261012-C279-name-completion.md) |
| QA-A15.8 | 名称显示、最终收款地址与模拟/签名字节联验及汇总 | 完成 | 0% | [证据](./workLog/20261012-C278-name-address-approval.md) |

## QA-A17 网络换代与数据生命周期

| 子包 | 验收内容 | 状态 | 验收剩余 | 证据／待办 |
| --- | --- | --- | ---: | --- |
| QA-A17.1 | 当前Chrome服务URL变更/缺失及恢复 | 完成 | 0% | [证据](./workLog/20261011-C266-network-switch.md) |
| QA-A17.2 | 当前Chrome在途旧响应取消、不回填旧资产 | 完成 | 0% | [证据](./workLog/20261011-C266-network-switch.md) |
| QA-A17.3 | 同H0客户端generation切换、隐藏记录隔离与恢复 | 完成 | 0% | [证据](./workLog/20261011-C270-generation-isolation.md) |
| QA-A17.4 | 0..709569全范围41条持久管线数据重放 | 完成 | 0% | [证据](./workLog/20261012-C295-complete-replay.md) |
| QA-A17.5 | 重放完成后完整数据及两个账户查询结果比对 | 完成 | 0% | [证据](./workLog/20261012-C348-full-data-comparison.md) |
| QA-A17.6 | 完整归档/HBase/SQL/Rocks持久数据与WAL恢复验证 | 完成 | 0% | [证据](./workLog/20261012-C363-complete-wal-01.json) |
| QA-A17.7 | 同host实际换H0及当前Chrome/全服务隔离恢复 | 完成 | 0% | [证据](./workLog/20261012-C296-network-lifecycle-completion.md) |
| QA-A17.8 | 同H0实际后端generation换代及全服务联验 | 完成 | 0% | [证据](./workLog/20261012-C356-backend-generation-completion.md) |
| QA-A17.9 | 只重建归档、保留其他查询数据的完整一致性验收 | 完成 | 0% | [证据](./workLog/20261012-C363-complete-archive-01.json) |
| QA-A17.10 | registry变更、缓存/能力失效与迟到结果完整矩阵 | 完成 | 0% | [证据](./workLog/20261012-C313-lifecycle-completion.md) |

## QA-A20 完整故障与冷启动

| 子包 | 验收内容 | 状态 | 验收剩余 | 证据／待办 |
| --- | --- | --- | ---: | --- |
| QA-A20.1 | 既有单服务故障、不可用与恢复的限定实证 | 完成 | 0% | [证据](./Task.md) |
| QA-A20.2 | 既有有限环境保留数据冷恢复及限定字节/journal比对 | 完成 | 0% | [证据](./workLog/20261009-C151-complete-cold-independent-acceptance.md) |
| QA-A20.3 | 当前完整dev按依赖顺序安全停机与冷启动 | 完成 | 0% | [证据](./workLog/20261012-C280-cold-in-progress.md) |
| QA-A20.4 | 完整环境冷启动前后持久数据/水位核对 | 完成 | 0% | [证据](./workLog/20261012-C280-cold-in-progress.md) |
| QA-A20.5 | Fullnode/GraphQL/archive/account全部入口恢复与真实请求 | 完成 | 0% | [证据](./workLog/20261012-C280-cold-in-progress.md) |
| QA-A20.6 | 当前普通Chrome恢复、原账户及真实pending journal保持 | 完成 | 0% | [证据](./workLog/20261012-C280-browser-identity-recovery-01.json) |
| QA-A20.7 | 冷恢复后核心业务回归及无重复签名/广播的最终审核 | 完成 | 0% | [证据](./workLog/20261012-C280-completion.md) |

## REL-02 全部真实业务流量

| 子包 | 验收内容 | 状态 | 验收剩余 | 证据／待办 |
| --- | --- | --- | ---: | --- |
| REL-02.1 | 余额、实际转账与写后当前余额展示 | 完成 | 0% | [证据](./workLog/20261011-C250-current-balances.md) |
| REL-02.2 | 非空活动历史、详情及实际读取帧 | 完成 | 0% | [证据](./20261011-C237-nonempty-browser-acceptance.md) |
| REL-02.3 | 非空资产/Kiosk/NFT详情与锁定/挂单反例 | 完成 | 0% | [证据](./workLog/20261011-C252-nft-current-readiness.md) |
| REL-02.4 | 实际NFT转移与原生所有权/原摘要确认 | 完成 | 0% | [证据](./workLog/20261011-C258-current-nft-transfer.md) |
| REL-02.5 | NFT隐藏/恢复、重载持久化及账户/代次隔离 | 完成 | 0% | [证据](./workLog/20261011-C270-generation-isolation.md) |
| REL-02.6 | dApp连接/拒绝/取消/消息/只签名及一次实际执行 | 完成 | 0% | [证据](./workLog/20261011-C259-current-dapp-execution.md) |
| REL-02.7 | 设置、账户、应用入口及明确不支持状态 | 完成 | 0% | [证据](./workLog/20261011-C243-readonly-pages.md) |
| REL-02.8 | 实际质押、链上确认、收据与当前余额 | 完成 | 0% | [证据](./workLog/20261011-C253-current-staking.md) |
| REL-02.9 | 名称正向等完整真实业务流量 | 完成 | 0% | [证据](./workLog/20261012-C279-name-completion.md) |
| REL-02.10 | NFT转移双方写后索引及页面刷新 | 完成 | 0% | [证据](./workLog/20261011-C275-new-generation-browser.md) |
| REL-02.11 | 新质押仓位入索引、赎回及余额/历史闭环 | 完成 | 0% | [证据](./workLog/20261011-C276-staking-composite-read.md) |
| REL-02.12 | 所有功能三入口流量覆盖、无旧RPC/错误公网访问汇总 | 完成 | 0% | [证据](./workLog/20261012-C281-business-traffic-completion.md) |

## REL-05 完整交付终验

| 子包 | 验收内容 | 状态 | 验收剩余 | 证据／待办 |
| --- | --- | --- | ---: | --- |
| REL-05.1 | 14份合并主方案、原文保留及目录完整性盘点 | 完成 | 0% | [证据](./workLog/20261011-C269-release-inventory.md) |
| REL-05.2 | 21项旧RPC映射与106个当前RPC模块/安装产物一致性盘点 | 完成 | 0% | [证据](./workLog/20261011-C269-release-inventory.md) |
| REL-05.3 | 54个Route声明及98原项/A01–A22证据入口索引 | 完成 | 0% | [证据](./workLog/20261011-C269-release-inventory.md) |
| REL-05.4 | 逐文档内容与当前代码/官方依据的完整语义终验 | 完成 | 0% | [证据](./workLog/20261012-C290-document-contract-completion.md) |
| REL-05.5 | 逐RPC/页面实际证据、版本、例外和来源的完整追溯 | 完成 | 0% | [证据](./workLog/20261012-C362-validator-selection-refresh.md) |
| REL-05.6 | A01–A22与98原项全部必需条件完整审核 | 完成 | 0% | [证据](./workLog/20261012-C364-parent-contracts-complete.md) |
| REL-05.7 | 最终构建/配置/运行范围、临时资源清理与交付说明一致性 | 完成 | 0% | [证据](./workLog/20261012-C366-final-runtime.md) |
| REL-05.8 | 全部必需项无未说明缺口、更新最终交付与100%状态 | 完成 | 0% | [证据](./workLog/20261012-C367-complete-delivery.md) |

## 更新记录

- C271：建立 45 个子包基线，18 完成／27 未收口；原父项 93/98。
- C272：创建本文件并纳入统一进度生成，记录已授权的 dev 重置及源码修复边界。
- 2026-10-11T16:07:49.445475+00:00：QA-A15.3 收口；C277 production resolver, native object/clock verification and ordinary Chrome HAR/UI accepted; remaining name UI/transaction work stays open.
- 2026-10-11T16:07:49.730056+00:00：QA-A15.5 收口；C277 production resolver, native object/clock verification and ordinary Chrome HAR/UI accepted; remaining name UI/transaction work stays open.
- 2026-10-11T16:15:29.847746+00:00：QA-A15.8 收口；C278 native UI final address, exact successful simulation/signature bytes and one confirmed name transfer at checkpoint 4594.
- 2026-10-11T16:16:02.097300+00:00：QA-A15.4 收口；C278 ordinary Chrome account list shows current default name separately from real address; explorer keeps full address.
- 2026-10-11T16:23:40.071140+00:00：QA-A15.6 收口；One renewal at 4614 and rename at 4699, stale-field rejection, current readers and real Chrome before/after accepted.
- 2026-10-11T16:33:02.710131+00:00：QA-A15.7 收口；C279 wrong-H0 preflight and wrong-registry ordinary Chrome rejection, original profile restoration and 269-frame audit accepted; no new execution.
- 2026-10-11T16:33:27.899300+00:00：REL-02.9 收口；Reuse the completed QA-A15 current G4 real name flow, original transaction, mutations, negative configuration and Chrome traces; no duplicate transaction.
- 2026-10-11T17:14:19.549268+00:00：REL-02.12 收口；25 ordinary Chrome HARs, 3918 unique frames, all four API surfaces, six original executions and explicit C278 source applicability independently audited; no new transaction.
- 2026-10-11T17:21:08.930465+00:00：QA-A20.4 收口；Current G4 all-off and same-container recovery completed; full SQL/HBase/Rocks/archive version inventories and original checkpoint hashes identical before and after.
- 2026-10-11T17:21:59.640980+00:00：QA-A20.3 收口；Current complete G4 retained-data cold startup and actual four-surface production reads accepted; 72 successful captured reads, unchanged two-account business results and progressing native query watermarks.
- 2026-10-11T17:21:59.860080+00:00：QA-A20.5 收口；Current complete G4 retained-data cold startup and actual four-surface production reads accepted; 72 successful captured reads, unchanged two-account business results and progressing native query watermarks.
- 2026-10-11T17:25:02.478661+00:00：QA-A20.6 收口；Ordinary C51 extension background/UI reload, same original four accounts and authorized unlock accepted; all three journal stores exactly match before full backend cold recovery, including original G3 pending.
- 2026-10-11T17:32:27.445932+00:00：QA-A20.7 收口；Complete current G4 cold data/API recovery and ordinary C51 core UI regression accepted; original journal/pending retained, 670 actual HAR requests with explicit exceptions and zero new transaction requests. Guard source defect fixed and deployed.
- 2026-10-11T18:33:41.564122+00:00：REL-05.4 收口；14 current document contracts reviewed, seven source bodies aligned, 618 local links valid, originals/edit chain and 649 prior source/evidence hashes verified; runtime and final release scopes stay open.
- 2026-10-12T00:22:48.837117+00:00：QA-A17.4 收口；C295 directly verified all 41 persisted SQL/HBase/Rocks watermarks equal final checkpoint 709569 under original G3; whole range replay complete.
- 2026-10-12T00:26:26.519719+00:00：REL-05.5 收口；C295 complete 21-method and 54-route version/evidence/exception traceability; C292 installed artifacts and actual unavailable route/back/home accepted.
- 2026-10-12T00:35:09.362900+00:00：QA-A17.7 收口；C296 current C292 Chrome actual same-URL G3/G4 four-role rejection and recovery accepted; original profile restored and temporary proxy stopped.
- 2026-10-12T02:08:30.637363+00:00：QA-A17.10 收口；C313 current C292 four actual delayed-read roles, current 105 lifecycle tests and applicable registry/cache/H0 evidence accepted; 26 HAR exceptions separately retained and temporary proxy cleaned.
- 2026-10-12T05:06:48.252031+00:00：QA-A17.5 收口；Complete SQL/HBase/Rocks and three-account comparison passed; primary bitmap source fix, 36-row/338-member conditional repair and full-prefix membership recheck passed.
- 2026-10-12T08:43:46.997997+00:00：QA-A17.8 收口；Actual independent same-H0 read backends, 89 production requests and 462 exact-byte browser/proxy requests accepted; original profile, accounts and pending retained; temporary route/proxy removed.
- 2026-10-12T09:49:08.325327+00:00：QA-A17.6 收口；Complete source/stage/replica versions, nine-container cold recovery, real HBase/PG WAL faults and all ten full persisted comparisons passed; historical body proofs explicitly reused.
- 2026-10-12T09:52:07.687172+00:00：QA-A17.9 收口；Full archive versions/bytes/replica, restored ledger guard, historical fence restart and 89 actual production reads across four surfaces passed; preserved query stores and independently admitted read-only backends.
- 2026-10-12T09:52:26.188490+00:00：REL-05.6 收口；Original 98 contracts and A01–A22 individually mapped and reviewed; all 97 underlying parents and their acceptance criteria passed. Final resource/runtime and publication packages remain separate.
- 2026-10-12T09:57:22.495555+00:00：REL-05.7 收口；Current C347 debug/source and C362 installed artifacts qualified; 13 temporary containers, 6 parent processes, 1 worker and 1 unused helper image retired, 8 volumes retained. G4 progressing, 76 business reads and ordinary C51 homepage/send passed after cleanup.
- 2026-10-12T09:57:23.198159+00:00：REL-05.8 收口；All original 98 contracts, complete lifecycle, current build/runtime/browser and scoped cleanup accepted; no required gap remains.
