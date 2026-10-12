# C127恢复中间件额外运行变化

原29容器的四HBase事件与C127全部准入证明仍各自有效。独立核对C120额外六恢复中间件时，原StartedAt严格门再次拒绝；只读完整六容器确认C120 HBase master及RegionServer也在18:46:37–38UTC重启一次，所有原完整Config/HostConfig/Mounts/镜像/ID保持，六healthy、其余四运行未变。合计三组HBase有六个运行变化，原因未确认。本任务0原服务信号。

原observer拒绝/源码保留，[六当前观察](./20261009-C127-six-foundation-current-observation-01.json)只接受当前健康与配置、不是完整数据/WAL/cold恢复。C126清理的原全局冻结快照在这些重启后取得，已对全部其他容器完整配置及运行比较通过；未以旧StartedAt宣称C120运行保持。后续全归档重建需固定这两个额外运行事件并实际检查协议/数据，不改旧门或操作未知服务。
