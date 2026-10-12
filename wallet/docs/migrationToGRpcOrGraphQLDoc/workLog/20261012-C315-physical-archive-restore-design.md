# C315：冻结发布快照的物理对象恢复

本轮接续 C140 已完成的完整八表 SQL 恢复，补齐物理 S3 对象。复用 C120 独立 MinIO（42533、独立 CA/数据卷），不启动第三条链或新完整中间件。目标在写入前要求原 G3 published bucket 不存在；使用同名 bucket，使 C140 的 VersionId 引用无需改写。目标与原 G3 是不同物理存储，不修改原链、原 bucket、原发布库、C139 查询库或 C302 账户库。

范围为 C140 冻结快照全部 795,320 条已记录 checkpoint 的 published_version 与 SHA，以及四份明确被快照引用的 published metadata。其中正式发布水位只有 709569；709570..795319 是快照保存的未提交尾部，复制它们不构成发布，不提高正式准入。旧 0..709569 已由 C298 正式版本下载并完成批次复核的本地文件直接复用，逐文件重新 SHA 核验；后续文件按旧快照的明确版本从原只读身份读取，不读取 Fullnode。完整物理恢复资格仍依赖 C298 最终复核、C301 原生认证和后续归档运行／复制／fence 验证。

MinIO 的指定 versionId PUT 仅用于空隔离目标，要求返回相同 VersionId，随后以该 VersionId 真实 GET 全字节比对。版本恢复行为同时对照本项目既有 `repair-stage-watermark-dev.py` 及 [MinIO 官方对象选项实现](https://github.com/minio/minio/blob/master/cmd/object-api-options.go)、[PUT 实现](https://github.com/minio/minio/blob/master/cmd/object-handlers.go)；版本／字节是否保持以实际读回为准。恢复操作凭据仅用于此命名目标，不导出到日志，不授予钱包或新外部主体。

每千对象保存可复核映射和真实进度，所有映射的原版本与源 SQL 对应；中断保留目标和记录，不能静默覆盖或删除。目标无 publisher、guard 或业务消费者，原 C140 SQL 历史 active/enabled 字段不是新运行授权。源的旧凭据不会复制到目标，目标没有开放 bucket policy。S3 恢复不等于恢复副本或 fence，也不等于 HBase WAL；这些仍须后续实际验收。

范围澄清：C104 的“从归档重建完整新查询栈”由 C139/C302 等从空目标执行；C271 的“只重建归档、保留其他查询数据”还要求原查询栈继续保留并对替换归档进行联验。两者共同执行，不能将客户端改 generation、保留数据重启或本次复制动作当作全部通过。C315 此阶段不重跑索引，不修改既有进度分母，不勾 QA-A17.6/.9。
