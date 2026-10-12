# C297 完整回放数据核对

前置为 C295：G3 原固定范围 0..709569 的 SQL 23、HBase 14、consistent 4 持久管线全部到终点。两个有限写入器自然完成，其他只读服务保留。禁止为生成证据重启已完成写入器或修改原数据。

先只读提取 C139 专属 SQL 全表的确定性行数与摘要，采用同一 REPEATABLE READ READ ONLY 事务和服务端游标，逐表落盘；避免一次将数百万行载入 Python 内存。表按主键排序，无主键才按完整行排序；列结构、排序键与原水位同时记录。连接使用原专属只读角色、verify-full 及原 CA，凭据不进入日志。

后续对全 14 表 HBase 当前逻辑单元格和八个 Rocks CF 做完整摘要与独立规范对照，并完成 token/capability 两账户索引/API。全量快照只是比较输入，不等于比较通过；完整归档物理重建、冷启动/WAL、同 H0 后端 generation 和剩余迟到响应矩阵分别验收。

运行目录限定为原 G3 publication-foundation/C297-full-data-audit-20261012-01。只使用 link-u-smart-contract/localDeploy 中脚本；RTD 仍为已核验当前 debug 产物。本阶段不创建新业务容器，不停 G3/G4 链或发布器，不修改 Chrome 配置。
