# C357：实际 WAL 故障恢复

2026-10-12 在已完成0..709569全量重建的C120/C139隔离栈执行，原G3/G4链、其他容器和卷均未停启。执行前SQL/HBase全量冷后对照及C356浏览器恢复已完成。SQL29表总计53,813,169行，其中业务行53,813,101，其余68行是保留比较的元数据；此前简报中的业务行数不应称作29表总行数。

HBase专用表17条SYNC_WAL标记在故障前实测MemStore 1MiB、StoreFile 0；仅精确ID的RegionServer收到KILL。相同容器/WAL卷恢复后17条值SHA完全相同，MemStore 0、StoreFile 1，日志保留WAL恢复事实。临时表和三个工具容器已删除。

PG专用库建立已提交与在途未提交标记，记录checkpoint redo LSN与后续写入LSN。仅精确ID的PostgreSQL收到SIGQUIT，08:48:32UTC即时停机，08:48:38UTC出现automatic recovery、redo starts/done。恢复后只有已提交标记，未提交值不存在，测试库已删除。没有SIGKILL PG或修改业务表。查询及归档准入恢复成功。

首次前置身份检查发现G3旧runtime没有processIdentity字段，故障尚未执行即停止；失败与源文件保留，修正为核对已声明的rtd binary/start/config后固定当前出生身份，原runtime不改。实际成功见[故障恢复证据](./20261012-C357-wal-fault-recovered-01.json)。

C358开始故障后SQL/HBase/归档SQL/Rocks及两路账户完整比较；不能以17条标记或服务健康代替全部业务数据核对。C354三个完整S3版本清单仍在独立只读扫描，故障未重启MinIO或写归档对象。QA-A17.6尚未收口，父项仍96/98。
