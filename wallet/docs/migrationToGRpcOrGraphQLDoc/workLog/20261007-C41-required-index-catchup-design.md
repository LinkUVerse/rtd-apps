# C41 剩余业务索引前置与有界追赶计划

剩余14父项沿用 Task.md，不另计完成率。直接NFT跨窗口限定子合同已完成，下一重点是其余真实分支和当前名称所依赖的索引前置。不能重发原framework281963或其他历史交易，不能放宽名称初始minimumCheckpoint及结束20checkpoint约束，不能伪造watermark／改变genesis／用新链替换原数据。

- [x] G1 实测当前原28容器／原全部进程与配置、链头及14writer／4consistent自然增量。[32.86秒观察](./20261007-C41-current-catchup-performance-01.json)：head309570；native4.717 cp/s、writer5.661 cp/s（min230289）、consistent5.813 cp/s（min233823）。这只是短时观察，不是稳定吞吐或时限承诺。原有后台自然前进，不能把Up或最小200000完成当作最新业务覆盖。
- [x] G2 从当前authority／三原消费者真实持久范围及source+replica发布范围建立新明确有限目标／可服务区间／原配置与全部原命令pin，仅记录新计划。原200000有限操作保留且不重跑；真实framework281963、当前名称四项覆盖高度各自验收。
- [x] G3 对新区间独立续接原可信quorum状态，校验native body／digest／metadata与source+replica最新版本；仅启动隔离probe，对原SQL27relations及生产对象／全水位等价核验，实际HTTPS／临时scope安全门槛通过后才资格认定。[资格01](./20261007-C41-followup-interval-qualification-01.json)及[独立审核01](./20261007-C41-followup-interval-qualification-independent-01.json)通过；96实际HTTP读取、7越界拒绝、隔离23SQL／4Rocks、27表／5对象等价及4探针退出，不替代生产追赶或当前业务验收。
- [x] G4 若资格通过，按新的明确authority successor计划有限切换原三个消费者、同原数据与配置、安全互斥／原其他22查询／两core／两publisher保护；自然exit后恢复原命令，并独立重新核验完整28环境／3API6循环／真实持久范围。失败按原digest／数据现场分析，不重复未明操作。
- [ ] G5 共同窗口实际覆盖后核验原framework转出与受控收款人、当前名称正向／反向及真实发送目标；剩余Kiosk竞争夹具若前置不足，使用指定localDeploy与当前debug实施另一个明确的新夹具合同，不复用已转出资产为当前持有。所有核心入口、cold与Chrome/TLS仍按14父项原合同推进；只有逐父独立完整验收后才勾选。

计划遵循原archive技术方案、已资格认定interval规则和真实保护authority。G4以[独立前置审核](./20261007-C41-finite-catchup-plan-independent-01.json)的新283000操作推进，原200000操作不重跑；原三个配置保持。当前父计数84/98、trial_ready=false。

[当前G2／G3资格及G4有限追赶](./20261007-C41-followup-interval-progress.md)：G2／G3完成，G4已完成并独立验收，G5当前framework只读补证推进，名称和当前UI仍待。

G4实际[终态](./20261007-C41-finite-catchup-result-01.json)耗时5813.30秒，283000全持久范围达到、writer/indexer自然0、原命令恢复；[独立恢复](./20261007-C41-followup-restored-independent-01.json)、[两套中间件](./20261007-C41-followup-restored-foundation-01.json)及[3API/6循环](./20261007-C41-followup-restored-all-account-01.json)通过。原controller已结束，不重跑。当前C42显式入口注册及清理后28/14另有版本化独立证据。
