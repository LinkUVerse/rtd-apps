# 发布账本聚合计划实测（2026-10-04）

## 操作和结果

当前PostgreSQL17.10已存在 checkpoints_prefix_counts 覆盖索引（chain_id,published_bucket,sequence_number INCLUDE transactions），没有新增DDL。先通过既有 link-u-smart-contract/all-in-one-deploy/localDeploy/maintain_wallet_publication_statistics.py 执行普通VACUUM ANALYZE（TRUNCATE FALSE），无FULL／清数据；固定已提交上界266749前后count/min/max/sum完全一致。单次查询57.482→65.692ms，没有提速证据。原始记录：20261004-guard-ledger-maintenance.json。

新增同目录 benchmark_wallet_publication_query.py，只读REPEATABLE READ事务固定同一上界，四组计划交错各7轮，全部逐次对比实际aggregate。诊断参数仅SET LOCAL，事务结束恢复，不修改服务端或guard生产参数。真实中位数：默认75.713ms、串行117.029ms、禁止seqscan以观察覆盖索引59.863ms、串行覆盖索引61.717ms。原始完整计划：20261004-guard-query-plans.json。

## 结论与下一步

覆盖索引方案本次优于默认，但仅一个数据量／负载窗口，不足以将强制计划写入生产。普通维护不能消除瓶颈。保持生产SQL、完整前缀证明及前后发布状态核验不变；下一步检查每次请求数据库连接开销及总体消费并发，不能用缓存认证结果替代这些校验。

依据 [PostgreSQL17覆盖索引文档](https://www.postgresql.org/docs/17/indexes-index-only-scans.html)：索引包含查询列仍取决于MVCC可见性；需要以真实计划和heap fetches验证，不能看到索引存在便宣称索引扫描或性能改善。此轮未执行链交易、未重启链／消费者，不增加任何钱包功能通过项。40/98、trial_ready=false保持。
