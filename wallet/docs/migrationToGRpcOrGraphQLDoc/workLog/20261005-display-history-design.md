# 2026-10-05：Display v1 历史发布事件合同与后续编码拆解

推进RPC-03／NET-04；本批完成权威源码核对与实施设计，不声称历史Display服务已实现。现有完整资产／NFT／Chrome测试和共同窗口恢复仍按原优先次序推进。

## 权威结论

[Sui Move合约](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-framework/packages/sui-framework/sources/display.move)将字段编辑与update_version发布分开；[sum_displays](https://github.com/MystenLabs/sui/blob/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-indexer-alt/src/handlers/sum_displays.rs)按checkpoint内交易／事件遍历顺序，以类型保存最后VersionUpdated原事件内容。本地对应文件已逐项检查。官方／本地SHA保留于[来源manifest](../evidence/official/20261005-display-history/manifest.json)。

因此“S之前最后发布的模板”才是与Sui索引语义一致的历史v1结果。只按DisplayCreated ID查历史对象，会把尚未update_version的编辑当成发布；只拿当前sum_displays的ID则会错过S时有效的旧ID；以MAX(display_version)选择会错过新Display ID较低版本。不能将这三种做法作为历史模板修复。

## RTD设计和范围

以下为基于该语义的RTD实现设计，尚未编码：

1. 增量历史表hist_displays保留BCS类型、cp_sequence_number、checkpoint_tx_index、event_index、来源transaction digest、display_id、发布version和原VersionUpdated事件BCS。唯一键为(type,cp,tx_index,event_index)；排序索引为(type ASC,cp DESC,tx_index DESC,event_index DESC)。位置需checked整数转换，版本用INTEGER约束0–65535，不将已有SMALLINT有符号排序当作发布顺序。事件BCS保持链上原文，无协议BCS变化。
2. 有界loader的key为(type,S)，按cp≤S和上述完整顺序取最后一个事件。同类型多Display ID与同cp多事件均由链上位置确定；不在batch中先折叠历史行。保留原sum_displays用于已有消费者，历史新表与coverage使用独立明确合同，不清空或伪造旧当前值。
3. 查询批量SQL须使用真实UNNEST／LATERAL回归和热点／缺失／重复键生产计划，沿用上一批对象版本性能审计方法；单类型字面量EXPLAIN或仅EXPLAIN不得计为执行性能证明。
4. 历史持续写入和补齐必须从指定dev的认证checkpoint来源读取，绑定原H0／genesis／sourceId／generation及提交时writer fencing。连续覆盖从0到S才可把缺行解释为无模板；当前sum_displays高水位不证明新历史表低水位。每个无发布事件的checkpoint也须推进覆盖。不能直接用当前表填充过去checkpoint，或向其它namespace写入。
5. 回放与live写入冲突须证明同键原事件字节一致，冲突内容不同则失败并不推进coverage。coverage在历史行提交后发布；中断／恢复从持久边界继续。当前真实索引／core数据和journal保持。后续schema迁移、触发器／fence注册、回放与服务替换必须由指定合约仓库脚本实施，并核对最新rtd debug来源。
6. 原v1 resolver接收scope的S，使用历史loader；v2继续同S registry优先，root版本界限不能取代S。basis包含模板ID、发布u16版本、来源checkpoint、交易摘要、checkpoint内交易／事件位置和原事件BCS SHA256；SHA字段只表示内容身份，不冒充链上digest或证书。钱包核对basis与请求S／绑定，拒绝未来来源、错误类型／身份和缺历史。v1缺历史不能通过null或当前模板掩盖。
7. availableRange／SDL与NET-04能力合同纳入历史依赖，查询不到连续覆盖时拒绝完整资产准入。正确范围内无发布事件才返回null。开发阶段不剪裁历史；若未来剪裁，必须保留每类型边界前最后事件作为锚点、发布reader下界，并验证跨剪裁后的无更新类型，不能仅删除所有cp<lo。

## 实施和验收子任务

| 子任务 | 工作内容 | 当前证据／状态 |
| --- | --- | --- |
| D1 | 核实发布事件语义、顺序、多ID与对象编辑的区别并对齐双方方案 | 本批官方／本地源码、manifest及相同新段落，已完成 |
| D2 | schema／历史processor／幂等与冲突处理／fencing注册，完整连续coverage及回放脚本 | 未编码；不得用sum_displays当前行冒充历史 |
| D3 | (type,S)批量loader、scope resolver、v1／v2优先和可核验basis | 未编码；需覆盖全量、热点和边界 |
| D4 | 服务能力／覆盖与钱包basis准入，错误及取消预算 | 未编码；保持完整资产失败语义 |
| D5 | 实际PostgreSQL／认证回放／中断恢复／跨S模板／多ID及未发布编辑回归 | 未执行 |
| D6 | 指定源码debug构建、保留原数据部署，实际钱包／Chrome完整display回归 | 未执行，RPC-03／NET-04仍未完成 |

至少包含：S在首次发布前后、同cp多个tx／事件、同类型新Display ID版本重置、同一Display编辑但未发布、相同key重放与冲突拒绝、版本32767／32768／65535、未来事件不可读、重复key／空batch、未知类型的正确null、历史缺口拒绝、v2在S之后创建不得影响旧S、v2在S时有效优先、重启回放与覆盖原子性。实际新版resolver输出与官方当前索引在共同末端checkpoint一致；较早S分别验证原发布内容。

这些子任务附属于现有98项Task，不增加顶层完成勾选。仅设计和权威结论完成不代替生产历史查询、真实回放或页面验收。当前48/98、trial_ready=false。
