# C365 恢复临时环境已清理

已按原容器ID/配置/挂载和精确进程出生身份，正常停止并删除13个完成使命的恢复容器，停止6个主进程及1个账户worker，无强杀。保留全部8个named volume和bind数据；1个无使用者的专用wallet helper镜像已删除，共享镜像按实据保留。原G3/G4链、全部范围外容器及rtd-archive-events-hbase3均未改变。

第一次预检因Docker Desktop的/host_mnt映射未转换而停止，发生在任何信号和operation创建之前；原失败和工具版本保留，修正为明确的宿主路径映射后正常完成。

[实际清理证据](./20261012-C365-recovery-retirement-01.json)。清理后G4生产读取和普通Chrome复核由C366单独验收，尚不以清理动作代替完整发布通过。
