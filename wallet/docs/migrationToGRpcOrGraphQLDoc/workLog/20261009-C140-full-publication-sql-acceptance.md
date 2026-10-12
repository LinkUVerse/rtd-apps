# C140 非NFT完整发布数据库限定验收

## C140完整发布数据库快照与隔离恢复（非NFT基础设施）

[实际恢复01](./20261009-C140-full-publication-sql-restore-01.json)与[独立02](./20261009-C140-full-publication-sql-independent-02.json)通过：原G3 PG17.10同一个verify-full TLS只读REPEATABLE READ快照导出，pg_dump通过确切源容器本地Unix socket只读使用该snapshot，完整备份8表、全部函数/索引/列/约束/触发器。checkpoint与前缀各795320行，全部1590671行，custom备份117349991字节。包含原尚未正式提交尾部的事实，不宣称795319已发布，C139仍只消费正式0–709569。

恢复至C120既存PG内独立wallet_c140_publication_restore_20261009，没有覆盖根数据库或C139；NOLOGIN owner与只读reader无特权，恢复不带原角色ACL、不清理已有库、不停用触发器。所有8表逐行规范SHA/行数/字节和完整规范DDL一致；reader实际TLS/SELECT-only、全部函数EXECUTE/DB CREATE/TEMP/schema写权限拒绝，C139角色无CONNECT。12项READ WRITE事务下实际ACL拒绝、24范围损坏拒绝通过。原historical admission/fence字段保真，但目标未连接publisher/guard/S3，因此不是可发布的运行授权，也不能复用原含OID/xmin/owner的catalog proof。

原审核01在不存在表的public schema名称解析上因无USAGE权限失败，旧源与失败记录保持；v2只替换为系统catalog不存在性确认，完整逆变换来源另验。不重复备份或分配数据库。原两链、29配置、14健康服务、C120六中间件与C139六消费者/观察者七出生身份保持；0原PG写、S3写、新容器、服务信号、签名、Execute或NFT业务请求。S3版本保真/副本/fence完整恢复、两账户、全量查询比较及冷/WAL仍待；SQL限定验收不折算父项。89/98、细分剩余9.18%、trial_ready=false保持。详见[合同](./20261009-C140-full-publication-sql-snapshot-design.md)及[限定验收](./20261009-C140-full-publication-sql-acceptance.md)。

恢复/审核脚本位于指定link-u-smart-contract/all-in-one-deploy/localDeploy。原备份与独立数据库作为后续恢复输入保留，没有新增可清理的临时容器。备份不是S3版本/全WAL恢复。官方快照与恢复行为依据：[PostgreSQL17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)、[pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html)。
