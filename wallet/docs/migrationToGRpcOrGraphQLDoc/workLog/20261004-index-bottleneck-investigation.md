# 新夹具索引延迟与账本扫描定位

## 当前证据

- `20261004-index-current.json`：普通索引器 latest_ingested 56869；consistent 48410。指标只是已摄取位置，不能当作 GraphQL 已提交可读上界。
- `20261004-ledger-aggregate-plan.json`：认证发布 committed head 184257，前缀统计仍用 parallel sequential scan；checkpoints_prefix_counts 覆盖索引已存在，未重复建索引。
- `20261004-checkpoint-profile.log`：6 次完整 checkpoint 读取累计 1.382 秒，其中 24 次 ledger_snapshot 累计 0.892 秒。每次完整读取有四次账本快照校验及多次固定版本／双副本校验，瓶颈以 DB 前缀扫描为主。
- `20261004-checkpoint-client-benchmark.json`：只读隔离进程交替 fresh/reuse MinIO 客户端，共16次全部返回同摘要和长度。结果波动明显，未证明客户端复用足以改善追赶，未修改运行中 guard。
- MinIO 官方 API 明确支持同进程多线程共享客户端，不支持跨进程共享：https://github.com/minio/minio-py/blob/master/docs/API.md 。这只支持候选方案合法性，不是本环境性能结论。

## 本轮维护

合约部署仓库新增 `maintain_wallet_publication_statistics.py`。通过现有 foundation/H0 绑定与 scoped PostgreSQL 参数，互斥执行普通 `VACUUM (ANALYZE, TRUNCATE FALSE)`，前后在同一 head 上核验 count/min/max/交易总数；不重置链、数据库、管线水位或认证账本，不使用 FULL。默认只读，显式 --apply 维护。

`20261004-ledger-statistics-maintenance.json`：固定 head 184257，前后前缀统计完全一致；单次 EXPLAIN 执行约 43.127ms → 39.476ms。此差异不足以证明持续改善，不能宣称解决延迟。

`20261004-ledger-plan-comparison.json`：独立只读连接内对照 enable_seqscan on/off，默认52.971/109.444ms，强制索引268.483/134.707ms，索引仅扫描的 heap fetches=0。未全局更改规划器配置，没有依据强推索引。

## 发布者权威状态与后续

`20261004-publisher-current.log`：publisher PID20639 状态 running/healthy；heartbeatAgeSeconds2229 是 working 批次内观测。现场 ps 验证父进程20639及子进程90594均存活，子进程持续36分钟、CPU9.5%；现有实现给单批7200秒预算。最后完成上界184257，不能仅因心跳年龄认定已停止，更不能另起重叠发布者。后续检查该在途批次进展及 committed 前缀审计成本，同时改进下游扫描效率。新 PersonalKiosk 的钱包 GraphQL 转出验收仍未完成。

总体保持33/98，未增加完成勾选。以上性能采样没有绕过任一认证、版本、复制或连续性校验。
