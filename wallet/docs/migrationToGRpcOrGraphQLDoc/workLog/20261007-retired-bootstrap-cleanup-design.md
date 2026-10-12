# 确认结束的原 archive 两个初始化容器清理

执行用户“确认不再使用的临时容器及时清理”要求；不得按exited批量清理。

- [x] B1：精确确认原archive project的hbase-init和s3-init：2026-10-03一次执行exit0、restart=no、只有对应只读脚本bind且无卷／无后台端口；原部署配方和脚本hash保存，原五个常驻HBase／gateway／ZooKeeper／S3实际healthy。其余退出容器保护。
- [x] B2：最新G3第三后继holder／八debug与保护进程、当前28容器／14healthy、全局容器身份／所有卷名／所有镜像ID保持；保存两个已完成任务原inspect和原日志，不打印环境或凭据。
- [x] B3：仅docker rm这两个已结束的精确ID，零force／signal／卷／镜像删除；保存完整前后清单并核验全部剩余身份、挂载文件SHA、常驻运行健康和holder不变。
- [x] B4：独立复核精确两次删除及非目标保护，更新累计确认退役与总进度；原脚本／日志／数据保持，future compose可按原配方重新创建初始化任务，不启动任何新实例。

两个精确名字：`rtd-wallet-migration-archive-20261003-01-hbase-init-1` 与 `rtd-wallet-migration-archive-20261003-01-s3-init-1`。其他skilloom／旧postgres／aion／emoji备份／zhongshuling／knowledge初始化任务均不据停止状态判定退役，不在本操作删除。

实际 [清理01](./20261007-retired-bootstrap-cleanup-01.json) 与 [独立02](./20261007-retired-bootstrap-cleanup-independent-02.json) 均通过：全局111→109，97运行／12退出；其余109完整容器配置／启动身份／挂载字典全部精确、五个原archive resident healthy、当前钱包28／14、第三holder／源debug／卷名与镜像ID保持。仅两个exit0一次性初始化容器删除，0force／signal／卷／镜像删除，原inspect／日志私有保存；累计确认退役39。

保留 [独立失败01](./20261007-retired-bootstrap-cleanup-independent-01.json)：原工具按数组顺序比较Docker Mounts，实际多次inspect返回顺序变化，触发原42行断言。新v2仅对整个mount字典按规范JSON排序比较，全部字段及重复数量仍精确，没有忽略挂载、身份或配置。原失败不是通过，没有重跑删除或重建任务；原清理producer保持一次执行。删除后的 [恢复独立08](./20261007-G3-staking-C43-restored-independent-audit-08.json) 再次实际28运行／14健康、最低353485／354317／354317与原333000后继／共同窗口保持。
