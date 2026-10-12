# C41 环境续检与确认退役容器清理

[当前恢复审核03](./20261007-interval-live-independent-audit-restored-C41-03.json)通过：28迁移容器／14healthy，原27容器及明确C41 stateless edge后继、原两链／两publisher／25查询账户原命令、原3配置／6归档元数据保持；14 HBase／23 SQL／4 Rocks持久读取核验，水位最小值226635／230171／230175，原有限200000导入已自然完成并恢复原命令，无有限／replay残留。该水位是观察值，不冒充framework281963或名称当前高度验收。

[账户07](./20261007-postboot2-all-account-audit-07.json)三API／六循环、自然提交及sealed SQL／原始公开checkpoint、错误H0／future／spoof拒绝通过。[清理后foundation02](./20261007-C41-foundation-audit-02.json)两套真实只读TLS SQL／HBase、publication source／replica与原publisher核验仍通过。未新增启动或重启，因为所有当前必需实例均健康。

确认 `rtd-wallet-migration-dev-20261003-01-postgres-failed-bind` 是早期因wrong ownership退出1、未曾成功启动的bootstrap；原恢复元数据明确以不同named volume替代。所有其他容器均未挂载其旧bind目录。只执行一次对精确ID的非force docker rm，不带-v；先保存完整原metadata与bind目录文件指纹，原目录／卷／镜像／替代PostgreSQL／services.json均保留。[独立闭环03](./20261007-retired-failed-bind-cleanup-independent-03.json)确认原global全部容器名字／状态只减少该失败实例、全部97运行实例保持、28迁移／14healthy和绑定数据指纹保持；未再次删除。

[失败01](./20261007-retired-failed-bind-cleanup-failure-01.json)发生在只读log核验：Docker stderr未合并，断言失败前0删除。[失败02](./20261007-retired-failed-bind-cleanup-02.json)发生在该一次删除后的image ls原始顺序比较；Docker image清单三次读取集合相同但顺序可变，未重建未保存的删除前image集合。独立闭环03明确这一限制；实际删除命令没有删卷／镜像／数据参数，全部失败工具与现场保留。

[当前全Docker清单02](./20261007-restored-global-docker-inventory-C41-02.json)：111总／97running／14exited；本阶段确认退役1，累计32。余下exited不自动等于废弃，已完成的HBase／S3初始化容器、原卷式PostgreSQL及其他项目实例保留。未prune，未删任何卷／镜像／数据。本阶段不关闭98个父合同中的业务验收。
