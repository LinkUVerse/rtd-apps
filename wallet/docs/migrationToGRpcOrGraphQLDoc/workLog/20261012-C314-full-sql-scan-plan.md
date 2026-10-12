# C314：修正完整 SQL 核验的扫描计划

C297 已完成 18 张表，交易表读取持续约 90 分钟仍未结束。实际后端 21708 在 FETCH / DataFileRead 中推进，不是死锁。只读 EXPLAIN 显示其游标选择随机 tx_digest 主键 Index Scan，估算总成本 7,118,479；完整消费规划加 128MB 会话 work_mem 自动选择 Seq Scan + Sort，总成本 1,690,346。估算不是吞吐实测。

[PostgreSQL 17 官方说明](https://www.postgresql.org/docs/17/runtime-config-query.html#GUC-CURSOR-TUPLE-FRACTION)：游标默认假设只消费部分结果，`cursor_tuple_fraction=1` 按全部读取优化。本次只调整核验连接，不改数据库全局配置，不强制关闭索引扫描，不影响钱包查询计划。

保留 C297 原源码、intent、18 份完整表摘要及未完成状态；按完整命令和出生时间核验自有扫描进程后停止。C314 重新开启单个 READ ONLY REPEATABLE READ 快照，重新扫描全部 29 表；不是拼接两个快照。原排序键、to_jsonb 字节、行数、列与 SHA 规则保持，18 张已完成表还要逐字段与旧结果一致。每 100,000 行落实际进度，所有表保存 EXPLAIN。完成后再与 C300 原链固定前缀及 C311 控制记录比较，不修改旧 C311 已冻结脚本。

新 helper 在指定部署目录 `capture_wallet_C314_sql.py`，只读角色与 verify-full CA 沿用原身份。没有业务写入、索引修改、容器重启或链信号。开始或局部提速不计 QA-A17.5 完成。

执行记录：首次停止前置检查未通过，未发送信号；因为该次 shell 后续命令未采用失败即停，新 C314 已启动并短时与旧只读扫描并存。随后按原 PID、完整命令、出生时间及 PostgreSQL backend 出生与游标重新核验，只向原 C297 发 SIGTERM。进程退出后数据库 backend 不是同步立即消失，首次立即检查失败；后续实际查到 backend 已退出，保留两项过程异常。旧 18 份摘要均保留，不据此声称旧扫描完成。后继仍采用一个独立新快照，不拼接旧结果。
