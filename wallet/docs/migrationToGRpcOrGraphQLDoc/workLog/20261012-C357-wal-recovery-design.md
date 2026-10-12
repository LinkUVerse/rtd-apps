# C357：本机 dev 的实际 WAL 恢复验收

范围仅为已完成完整重放、C353冷恢复的C120/C139独立重建栈。原G3/G4链与现用G4钱包、rtd-archive-events-hbase3不在故障注入范围内。先完成正在运行的C354只读快照和C356浏览器换代，再进入停机窗口；准备、编译不表示故障已经执行。

HBase在新建且唯一的`wallet_c357_wal_probe`临时表写入同步WAL标记，必须实际确认MemStore非空且StoreFile为0；随后仅中止已核对ID的C120 RegionServer，使未flush的数据从保留的本机WAL卷恢复。恢复后逐行核对原值、保存日志中的WAL恢复事实，并核验14张业务表仍与完整基准相同。临时表和工具容器在验收完成后清理。

PostgreSQL仅在同C120集群的专用测试库写入已提交标记并保持一条未提交事务，使用官方定义的Immediate Shutdown路径触发重放；恢复后已提交值必须存在、未提交值必须不存在，查询/账户/归档库的数据及入口必须恢复。不以正常停机、同步写入或健康检查代替WAL恢复。

依据：[Apache HBase WAL说明](https://hbase.apache.org/docs/architecture/regionserver/)说明未flush MemStore在RegionServer故障后依赖WAL恢复；[PostgreSQL 17停机文档](https://www.postgresql.org/docs/17/server-shutdown.html)说明SIGQUIT触发下次启动WAL重放，并提示不要直接SIGKILL PostgreSQL主进程。本次只证明授权的单机dev恢复，不声称跨宿主故障域、生产HA或生产RPO/RTO。

2026-10-12 16:48实施前补充：C354 SQL/HBase全量扫描和C356浏览器已完成并恢复原G4。三个S3版本清单是独立只读列表，故障不涉及MinIO/归档桶写入或重启；经依赖确认可与仅PG/RegionServer故障并行，无需等待S3清单。实际执行先保存精确容器/卷及原链身份，再创建唯一专用标记表/库；全量业务校验仍必须在故障后重新通过。
