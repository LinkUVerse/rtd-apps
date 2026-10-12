# C140 完整发布数据库只读快照与隔离恢复合同

实施顺序遵循一期非NFT优先；本批仅推进完整恢复所需的发布数据库，不运行NFT业务或钱包签名。C139完整查询回放继续。

1. 重新检查原两条链、29配置、14健康服务、全部受保护文件、当前debug来源、C120六服务和C139六消费者出生身份。源为G3真实rtd_archive；目标为C120 PostgreSQL内新的独立数据库，绝不覆盖C139数据库或原根数据库。
2. PostgreSQL 17.10通过verify-full TLS开启READ ONLY REPEATABLE READ事务，导出真实snapshot。pg_dump在同一源容器内经本地Unix socket使用该snapshot，只读备份整个数据库；不导出或恢复全局角色。完整范围包括8张archive_publication表、全部行及全部函数/约束/索引/触发器，不能按709569截断已经写入但尚未正式提交的事实。
3. 同一个snapshot逐表按真实主键排序，流式COPY每行完整row_to_json，计算行数/字节数/SHA256；没有主键或额外未纳入关系即拒绝。规范DDL另比对实际列、约束、索引、非内部触发器、函数及扩展，不能仅靠dump退出码。
4. 独立目标新建NOLOGIN且无superuser/createDB/createRole/replication/bypassRLS的恢复owner及独立只读reader。恢复不使用--clean/--create/--disable-triggers或原角色ACL；同一事务、error-stop、无owner/ACL原样恢复数据，再撤销PUBLIC和reader对函数的EXECUTE、数据库/schema写权限。整个目标未连接任何publisher/guard/S3，原历史enabled/active字段保持原值，数据副本不构成可发布的运行授权。
5. 目标真实只读TLS会话重新计算所有行和DDL，与源快照逐项完全相同；所有表SELECT-only，无schema CREATE、函数EXECUTE、数据库CREATE/TEMP和特权标志。原C139角色对新库无CONNECT，原/其他库和消费者保持。
6. 另一个独立审核器从私有snapshot/dump/restore记录重新核对目标全量数据、dump完整清单、实际权限/身份、原运行范围和输入SHA。失败不删除备份、数据库、角色或旧记录；不能重复分配或覆盖原尝试。

本批不写原PG，不新增或停止容器，不触碰原S3版本/replication/fence，不假设普通PUT能保留VersionId。S3版本保真恢复、恢复后的catalog授权重建、两个账户、全量查询规范比较和冷/WAL仍待实施。89/98及细分账本口径不变，不把本批SQL限定验收计作完整物理归档恢复或父项完成。

官方依据：[pg_dump一致快照与snapshot选项](https://www.postgresql.org/docs/17/app-pgdump.html)、[pg_restore事务及角色/ACL选项](https://www.postgresql.org/docs/17/app-pgrestore.html)、[导出快照生命周期](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION)。原源superuser属于既有受信开发运维边界；恢复代码来源和完整函数定义必须实际冻结核对。
