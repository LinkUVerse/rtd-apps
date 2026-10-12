# 保留实时证明的 catalog SQL 合并 C1–C5

精确前缀采用实时 schema/constraint/trigger/role/index/function catalog proof，每次 snapshot 原锁加六查询，共7往返；当前每次 checkpoint 多次fresh snapshot。仅把六组原字段/顺序合并为一个jsonb SQL，加原 ACCESS SHARE 锁共2往返，不缓存facts/认证/TLS/权限，也不改DB对象或frozen catalog proof。PG OID在json中默认字符串，必须显式转bigint恢复原psycopg数字规范，hash保持相同。

- [x] C1：隔离源码候选04，只有catalog_fingerprint AST改变、其余全部AST相同；actual readonly PG八组交错对照catalog hash与原frozen证明完全相同、exact snapshot一致。实际中位39.65→31.45ms仅是该只读函数测量，不当作端到端加速。早期六/七计数、autocommit重复、OID JSON类型不同的准备失败保持，未部署。
- [x] C2：真实临时PostgreSQL26条约束/篡改/差分套件通过，原测试代码不改，测试开始前显式注入已SHA固定候选module，原源与候选SHA分别记录；临时DB/roles实际清理，不触碰live DDL。
- [x] C3：FROM current immutable16名额image，只有prefix_ledger.py候选0444变化，七image文件逐字节审核；实际host34、native0/100/latest与TLS读证明。
- [x] C4：仅新guard compatible image revision；fresh认证/consumer12/全部原生/两publisher/原scope/keys/pending/数据保持，无consumer重启。
- [ ] C5：真实吞吐与持续水位后验、NFT目标覆盖按实际记录，收益不足继续明确不足；不得跳过任何实时认证或把未覆盖项勾选。

实际 build-01/apply-01 均通过。当前 image `sha256:3402e6e82447354d54e2c070e6c2adeaf137a26986833ca2fb5d57db484c712c`，revision `8860d7b3-dabb-4e2c-affe-d84cd6e032e8`；guard16/adapter12、consumer重启0、原scope信号0，live fresh认证证明67667。C5持续水位/吞吐另验，未计入父任务完成。
