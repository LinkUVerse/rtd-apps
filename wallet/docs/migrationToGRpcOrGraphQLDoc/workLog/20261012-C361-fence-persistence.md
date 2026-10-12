# C361 历史存储fence持久化实测

在三个完整版本清单均完成后，仅正常停止/启动同一个C120 MinIO容器，数据挂载与配置保持。历史epoch=1及owner的物理元数据SHA前后相同；未重新CAS创建fence，也未导入原发布器或授予新writer。重启后不带fence的写入仍被AccessDenied拒绝，探针对象不存在。

[实际证据](./20261012-C361-fence-persistence-01.json)。本次只重启独立恢复存储，未重启原G3/G4或共享中间件；不把该metadata复核说成再次重扫全bucket，完整冷后版本清单复用C354，body全量验证复用恢复阶段证据。
