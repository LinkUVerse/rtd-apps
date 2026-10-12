# 认证读取前缀索引：设计与子任务

父任务为D5／D6及NET-11，不另增加98项分母。2026-10-05实际PG17.10、只读TLS观察：认证上界386503、pending457546；每次取块执行四次完整前缀聚合，单次实测40–43ms，历史回放约4.5 checkpoint/s。当前有界回放继续运行，不能跳过genesis或把部分覆盖标为完成。

新增辅助表保存每个checkpoint的累计交易数。每行直接外键引用原表的(scope,sequence,transactions)，另一外键引用前一行的(scope,sequence,total)，行内CHECK保证前驱sequence为当前减一、total为前驱total加transactions；唯一根为0且total=transactions。这是对连续性和精确SUM的归纳证明，不使用跨行CHECK或估算计数。PostgreSQL明确不保证跨行CHECK，支持自引用外键。[PG17约束文档](https://www.postgresql.org/docs/17/ddl-constraints.html)

原表增加用于外键的唯一索引；原行、链头、pending目标、epoch和存储版本保持。独立部署事务锁定原表，核验每个scope的完整0..max及非负transactions，从全表精确SUM初始化辅助表，并与原聚合逐scope比对。之后AFTER INSERT触发器在同一事务生成辅助行；触发失败使原插入回滚。函数使用受信schema和pg_temp结尾的固定search_path，PUBLIC无执行权限，普通publisher不能直接写辅助表。[PG17触发器](https://www.postgresql.org/docs/17/trigger-definition.html)／[SECURITY DEFINER](https://www.postgresql.org/docs/17/sql-createfunction.html)

每次读取仍独立开启只读REPEATABLE READ事务，先持有两表ACCESS SHARE锁；实时验证约束、触发器、函数、权限和对象身份的冻结catalog摘要（含关键catalog行xmin，禁用再启用也拒绝）。辅助表缺行、catalog漂移或配置缺失一律拒绝，不回退到未经验证的累计值。对象存储latest HEAD、固定版本GET、源副本SHA、边界与末验保持原算法。辅助索引没有positive admission缓存；superuser仍属于受信运维边界。

保留adapter冻结的consumer_proxy／checkpoints／visibility原文件和manifest。有版本来源证明的guard镜像只替换visibility中的ledger_snapshot函数体，其余语法树逐项一致；新函数调用独立prefix_ledger模块和镜像内catalog证明。基础镜像层、入口、8个检查名额、adapter6名额及三个消费者各2均保持。DDL安装与镜像切换分别保留原证据；任一步失败不制造回放终态。此项不证明分布式旧writer fencing或钱包Chrome可试用。

| 子任务 | 验证／交付 | 状态 |
| --- | --- | --- |
| P1 | 官方PG资料、真实schema及设计；双方章节对齐 | 已完成并同步双方三组章节 |
| P2 | 辅助表／FK／触发器／实时catalog校验及版本化函数替换 | 已完成；独立schema／prefix_ledger及版本化函数替换 |
| P3 | 独立真实PG：缺口、错误total、删除、rekey、计数变更、回滚、并发、权限、禁用恢复、精确大数；原守卫故障回归 | 已通过26真实PG及12组算法差分、镜像24／主机32项、部署7项 |
| P4 | 指定合约仓库脚本安装辅助DDL；原行及固定prefix不变、逐scope精确对照 | 已安装431328原行前后SHA一致，链状态保持；新旧准确facts相同 |
| P5 | 保留原镜像／配置的guard切换，mTLS／固定版本／未来拒绝及性能对照 | 已通过；首次监听启动失败保留，仅只读终验后通过；12/12、中位0.486→0.302秒 |
| P6 | 同一有界回放连续覆盖观察、原22水位及实际终态；恢复live和资产／Chrome | 执行中；5次连续观察至15581，约8.7 checkpoint/s，原22未变、原PID运行，无终态；live／Chrome待 |
