# 2026-10-05：核心 CLI 最新 debug 受控切换与共同窗口诊断

本批推进 ENV／NET-04／TRY-05 的运行前置；**核心 CLI 已切换并通过原链就绪验证，钱包完整资产与试用仍未通过，Task 保持48/98。** 之前 SQL 恢复记录中的“核心 CLI 尚待切换”是当时状态，由本批证据更新；原失败、构建和重放证据均保留。

## 权威依据和实施守卫

[Sui 固定源码的 start 关闭分支](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui/src/sui_commands.rs#L1264)处理 Ctrl+C 并等待 RPC shutdown；指定 rtd 的对应代码同样处理 Ctrl+C。以此选择 SIGINT 完成原命令退出，未更改 checkpoint interval 或协议配置。官方原文、固定提交和本地源码 SHA 保存在 [官方依据](../evidence/official/20261005-core-debug-shutdown/manifest.json)。

指定合约仓库新增 reload_wallet_core_debug.py，分 prepare／apply／recover-stopped：核对当前 HEAD、diff 和全部变更文件、成功 debug 构建、真实 reader 回归、原 reader-only baseline、rtd-node 字节保持、原 genesis／H0、四份原 YAML、原 ready PID 与启动身份、命令、默认协议环境，以及新鲜原生三笔交易／余额和链头推进。prepare 只保存私有意图；apply 在记录 stop-intent 后发送一次 SIGINT，拒绝强杀、身份变化和不明确的重复启动。

停止阶段守卫看到进程身份在退出过程中改变，返回 Core identity changed during stop；[失败记录](./20261005-core-debug-apply.log)保留。独立观察随后证明 PID3922 已不存在、39400／39423均空闲、operation 尚无 node.log 或 replacement.json。recover-stopped 再核对原 metadata／全部配置／源码／无其它同命令进程／端口后，仅启动一次。未将该观察声称为实际 PID 复用，未重新发送停止信号。

finalize_wallet_debug_resume.py 对本类 reload 增加当前源码／二进制绑定、source-proof 哈希与私有归属、replacement 与 proof 的精确身份、原回执和余额 deep equality、原配置及 Fullnode／faucet端口检查。只有这些条件和同 H0 的真实链头推进全部成立才设置 ready=true。

## 实际产物、数据和链证明

沿用 [SQL 修复后当前八二进制 debug 构建](../evidence/20261005-query-range-debug-build.json)及 [三项真实 PostgreSQL reader 回归](../evidence/20261005-query-range-reader-tests.json)，没有新增 rtd 源码变更。rtd CLI SHA256 为660bf6452682e1328e82b0a532846f82507fcf259cbe108196d8fa0f75a0e8f3；rtd-node 为b9101ac6747b66ca701b930b9f0e999aae69deb9ff6efcde385a68bf20012c7a。完整源绑定见 [本批 core proof](../evidence/20261005-core-debug-current-source-proof.json)。

新增8项切换／完成门禁测试，与既有 resume／interval 守卫合计33项通过：[定向记录](./20261005-core-debug-reload-guards.log)。不运行已禁用的 interval apply；测试不代表钱包 UI 或所有执行链路通过。

替代核心 PID21240，H0保持3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj。15.042秒真实原生采样438627→438698，约4.720 checkpoint/s；种子、原生混合发送和 WMIG 发送三笔原成功回执及当前 Fullnode 余额与切换前逐项一致，0模拟0广播。见 [切换前](./20261005-core-debug-native-before-apply.json)、[切换后](./20261005-core-debug-native-after.json)、[完成记录](./20261005-core-debug-finalize.log)及 [公开结果投影](./20261005-core-debug-current-result.json)。Fullnode和faucet listener均属于新核心 PID；原 YAML／genesis／数据库／journal保持，消费者没有随核心切换重启。ready=true仅对应核心原生条件。

固定组件身份复核中11条当前记录匹配；旧 query-route PID36527不在，不能计入当前组件通过。实际 GraphQL 仍指向既有39602一致存储入口。初次目录名猜测产生的 recordFound=false 记录以及12项（含旧route）的检查全部保留：[初次观察](./20261005-core-debug-consumers-after.json)、[精确目录观察](./20261005-core-debug-components-current.json)。没有为修正诊断而重启服务。

## 持久化水位与共同窗口

旧 stdout last-1MB 只出现一条 loud watermark，不足以判断其它13管线停顿。指定合约仓库新增 inspect_wallet_query_window.py，只读核对 writer／consistent／GraphQL／Ledger原进程及 listener身份，严格核对14条 KV 和4条 consistent 的 watermark_checkpoint_in_db 集合，读取原生 AvailableRange 成功返回的数值 metadata，并复核当前有效 retention 配置。它不会把 latest_processed／内存水位当持久化提交，也不声称 checkpoint 认证、资产准入或试用通过。

首个运行因 macOS Python3.9无tomllib失败，未发查询，保留 [失败记录](./20261005-current-query-window-01.log)；修正为复用原有效配置校验及只读取 retention 数值后实际通过。00:39:50（北京时间）GraphQL Ledger水位171325；原生 consistent范围176712–184248，仍差5387。两侧实际持久化值见 [完整窗口观察](./20261005-current-query-window-02.json)，内部 Ledger gRPC同H0／genesis与高度170392的较早独立查询见 [Ledger证明](./20261005-current-query-ledger-info.json)。时间不同的水位不能混成一个原子快照。

原 retention snapshots=9007199254740992、stride=1，配置哈希保持；这是上限而非预分配。当前一致存储 lower176712是本次启动后可读内存快照起点，重启无法自动恢复较旧内存快照。没有为追赶暂停／重启消费者、回写水位或清数据库。KV已恢复14条持久化推进，后续以实际AvailableRange及生产 WalletAssetReader接纳为共同S证明，不能只由端口或日志推导。

[Sui 固定 WatermarkTask](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt-graphql/src/task/watermark.rs)在 consistent 范围查询失败时不发布新的可读范围；本地 RTD 加入 Ledger服务水位共同求界，仍必须满足一致窗口。官方／本地文件 SHA 见 [范围权威依据](../evidence/official/20261005-core-debug-shutdown/watermark-manifest.json)。不得绕过 FEATURE_UNAVAILABLE／partial 后向页面交付未完整验证的资产。

## 下一步和验收边界

等待并验证实际共同S，随后优先复核当前产物完整 display／OriginByte／资产页面和 Chrome；Display v1按S的历史模板合同仍归 RPC-03／NET-04，正常CA／host权限、写后读追平及其它剩余合同仍待。核心最新debug切换前置已完成，不等于完整环境协议、钱包试用或任何未勾选项完成。48/98（49.0%），trial_ready=false。

## 后续定向核验与只读观察

[3项持久化覆盖回归](./20261005-query-window-durable-guards.log)通过：只有内存／processed水位、缺失或错误管线集合、重复metric样本均拒绝完整恢复结论。三份新／改部署脚本py_compile通过；rtd、rtd-apps、archive和合约仓库git diff --check均通过。双方本批新章节字节一致，13章、14份原文、22项QA与21项线协议追溯及新日志／总进度链接检查通过，见[文档证明](../evidence/20261005-core-debug-document-verification.json)。未追加无关业务代码或重复全量构建。

00:44:29的[后续窗口](./20261005-current-query-window-04.json)仍为下界176712、上界185750，Ledger172827，缺口3885。与00:39:50相比，在279.583秒推进1502个checkpoint；该时段约5.372/s，不能当成稳定吞吐或完成ETA，见[观察差值](./20261005-current-query-window-progress.json)。下界保持，期间未重启消费者。

已启动单次、最多1800秒的当前任务只读观察，每30秒复核原身份、完整持久化metric集合和原生范围，记录[逐次观察](./20261005-query-window-wait-observations.jsonl)及[运行日志](./20261005-query-window-wait.log)。候选交集仅是继续生产reader复核的触发条件，assetAdmissionVerified始终为false；没有自动交易、部署或试用通过结论。观察超时或出错会停止并保留记录，不重跑启动／发送逻辑。
