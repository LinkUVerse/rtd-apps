# 两组 RTD／checkpoint blob indexer 的用途核查（2026-10-08）

主人要求先确认是否冗余，再清理已不需要的进程。本次结论：现阶段保留两组；四个进程均为当前 RTD `target/debug` 产物，没有发送停止信号、停止容器或删除数据。

| 环境／用途 | RTD PID | Blob indexer PID | RPC 端口 | 实时 H0 |
| --- | --- | --- | --- | --- |
| dev-20261006-03：当前迁移主链，C46／C48／C93／C95 测试资产及写后索引 | 4736 | 7041 | 41750 | BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4 |
| dev-20261003-01：原链保留，换链／错链及恢复对照环境 | 4803 | 6708 | 39400 | 3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj |

每条链有各自的 genesis、config、checkpoint 数据目录、staging／published bucket 和下游查询栈。Blob indexer 从相应链的 checkpoint 目录摄取并写入相应 staging；它们不是同一链的重复写入者。实际 native GetServiceInfo 返回不同 H0，并与各自绑定文件及 genesis SHA 一致。

两次间隔六秒的真实 metrics 观察：原链 indexer 的水位 gauge 从 1790487 到 1790513，成功提交数从 577656 到 577685；主链从 763193 到 763216，成功提交数从 577704 到 577732。两次端口归属均对应原 PID，完整进程出生／命令摘要保持。此观察只证明当前持续摄取／提交活动，不能代替持久 DB 或正式认证发布验收。

保留原因：原98清单的 QA-A17 尚需真实同 host 换 H0／迟到响应和完整查询／归档生命周期，QA-A20 尚需完整保留数据恢复；原链提供独立 H0 的对照环境，主链继续迁移和索引测试。现有 C98 完整运行准入也明确保护两条原链、25 个消费者以及29容器／14健康检查。不能仅因 basename 相同或原链创建较早，就在当前工作中停止其 RTD 或 indexer。本次没有执行这些完整验收矩阵，也不把用途核查记作父项完成。

阶段结束后，如相关对照测试已经完成，或用明确保留数据停止／恢复方案替代常驻环境，再重新评估原链整套服务；精确核对 PID 出生身份、下游依赖和自然发布边界后清理，不能只按进程名批量 kill。

证据：[native 实时身份](./20261008-dual-rtd-process-native-identities-01.json)、[双次 metrics 与身份](./20261008-dual-rtd-process-indexer-liveness-01.json)、[完整当前运行归属](./20261008-dual-rtd-process-current-ownership-01.json)、[汇总核查](./20261008-dual-rtd-process-retention-audit-01.json)。

本次细分业务验收剩余仍为 **11.63%**；原98父项仍84完成／14开放。


后续实时复核（2026-10-08）：[原生SDK当前只读检查02](./20261008-dual-rtd-process-readonly-current-02.json)再次确认主链41750的checkpoint855993、对照链39400的checkpoint1883368，H0仍不同，四原PID／出生／命令保持，0JSON-RPC／停止信号。C109临时网关已正常退役且[完整原scope独立清理复核](./20261008-C109-current-cleanup-independent-01.json)通过；两组链及indexer保留。上面的84/98／11.63%是该初始核查阶段历史，当前迁移进度为89/98完成、九父开放、剩余9.18%，不能据本次健康检查完成QA-A17或QA-A20。

本次再次复核（2026-10-08，20:20北京时间附近）：[实时身份与双次指标04](./20261008-dual-rtd-process-readonly-current-04.json)通过。主链4736／indexer7041在两次观察中checkpoint898056→898086、成功提交计数712553→712583；对照链4803／indexer6708的checkpoint1925450→1925479、成功提交计数712598→712628。四个原PID的出生及完整启动参数与初始记录一致，监听端口归属及不同H0均重新实测；两组使用不同checkpoint目录和staging bucket。旧链仍有checkpoint adapter、发布器7371、KV／SQL／consistent-store／GraphQL以及账户消费者运行，QA-A17完整换链、QA-A20完整恢复仍开放。因此本次保留两组，0停止信号、0容器创建或删除、0数据写入。原脚本的03输出已存在时在任何网络读取前正确拒绝覆写；另存04脚本仅替换两个输出文件名，保留原03及所有断言。该活动观察不代替正式发布、独立持久数据或业务验收，89/98及剩余9.18%不变。


### 最新实测05：两组均保留（2026-10-08T12:47:23.390Z）

[双次原生身份与完整metrics05](./20261008-dual-rtd-process-readonly-current-05.json)再次通过；dev-20261006-03：RTD 4736／indexer 7041，checkpoint 905531→905560，成功提交 720028→720057；dev-20261003-01：RTD 4803／indexer 6708，checkpoint 1932920→1932947，成功提交 720068→720096。两个H0、genesis及checkpoint/staging绑定保持不同，四原PID出生／启动参数和监听归属均保持。另实时核对旧链adapter6720、发布器7371、KV6738、SQL6753、consistent-store6769、GraphQL6797、账户6836／6867仍在运行。QA-A17完整换链和QA-A20完整恢复仍开放，不能将旧链判为冗余。此次保留两组，0停止信号、0容器／卷清理、0数据库或对象写；活动指标不计正式发布或完整业务通过。后续对照任务完成后再核对归属和依赖，按保留数据方案评估整套旧环境退役。
