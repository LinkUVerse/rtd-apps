# C139持续数据进度与只读吞吐观察

[只读观察01](./20261009-C139-readonly-replay-progress-01.json)实际最低水位734/已覆盖735，随后[归属启动01](./20261009-C139-replay-observer-started-01.json)正常注册自有观察器74586，60秒间隔读取41条完整管线和六个确切消费者/查询进程身份。只观察只读SQL/TLS、固定配置与Display绑定、两组原环境/C120六服务及自有代理运行，零原服务信号或NFT业务。

当前[只读状态](./current-C139-replay-progress.json)持续更新，[totalProgress](../totalProgress.md)新增独立的回放数据量百分比与观测时间；用全部41水位的最低值计算。文档采用临时文件/fsync/原子替换，任务清单与细分账本不由观察器改写。数据水位不计总体验收，原89/98与细分剩余9.18%保持；达到全固定水位也仍须全数据比较、两账户、归档/WAL等合同。

[只读吞吐观察01](./20261009-C139-readonly-throughput-observation-01.json)保存真实EXPLAIN和50条入口样本。一次完整709570行前缀聚合实测199.835ms；该窗口认证请求中位0.540517秒。代码的verify_read链路调用四次ledger_snapshot，保持所有源/副本版本和字节/摘要检查。此观察定位成本，不代表未来持续吞吐或完成时间。

数据库为PostgreSQL17.10，已有两个覆盖索引。首轮比较01导出SUM返回的Decimal失败，部分JSON与失败记录保留；02遗漏context的autocommit=True，事务外SET LOCAL并未生效，四份实际计划全部Seq Scan，已由[独立拒绝01](./20261009-C139-index-comparison-independent-rejection-01.json)明确否定性能结论。PostgreSQL的[SET官方合同](https://www.postgresql.org/docs/17/sql-set.html)说明该设置只在当前事务内有效，事务外无效。

[正确只读比较03](./20261009-C139-readonly-existing-index-comparison-03.json)用实际事务和SHOW开关、退出事务恢复on、真正Index Only Scan验证，并确认四次完整count/min/max/transactions结果相同。默认580.186/545.420ms，强制已有索引688.667/661.032ms；在该有限样本中调整更慢，没有部署。该选择符合[官方查询规划说明](https://www.postgresql.org/docs/17/runtime-config-query.html)：规划开关用于临时比较，不能由未经确认的差异直接认定改善。

本轮没有VACUUM、索引DDL、角色参数修改、数据库重启、原服务中断、认证事实缓存或检查删减。原源码/消费者配置保持。完整回放继续运行；普通Chrome解锁、名称正式757805覆盖、非NFT M5正文/完整来源缺口、物理归档/两账户/冷WAL仍待；全部一期非NFT验收完成后再启动NFT业务专项。
