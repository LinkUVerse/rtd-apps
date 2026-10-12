# C66：自然超时、无准备对象时保留pending的交接评估

原C44/C64交接要求pending为空，保持原方案与五个封存实现。日志已经实际记录三次waiting_timeout，第三次保留正式486334／pending553728。原八并发前缀审查的诊断曾记录164864／486335、2611秒；该记录已陈旧，不能声称本轮审查进度或据此终止当前子进程。当前工作中的父子均不发送信号。

存在应单独验证的恢复边界：`publisher-loop-dev.py`捕获`TimeoutExpired`前，`run_owned`已经结束并回收其独立子进程组；随后写waiting_timeout，按原15秒间隔进入下一轮。`checkpoint-publisher-dev.py`在pending非空时要求through精确等于pending_hi，并使用原pending_staging_watermark_version；已有证书、完整前缀／命名空间审查、对象版本／摘要、活动epoch、发布准入和副本检查都重新执行。交接不应清空或改写pending，也不能将它记作已提交。

[PostgreSQL官方锁文档](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS)说明会话级advisory lock在会话结束后释放，且可在pg_locks中观察。本项目仍须实际读取精确chain/bucket的锁状态；进程消失或timeout文字本身不作为锁释放证明。只读检查不能调用pg_try_advisory_lock或更改准入。

拟增加的边界仅限：原父PID／birth／命令精确保持，action为新鲜waiting_timeout，子进程为空；正式发布达到原门、epoch／准入保持；pending_hi严格高于published_hi，唯一staging watermark固定版本存在，pending的published／advisory版本为空；未提交对象行数为零，精确publication advisory lock数为零。冻结父进程后的完整fresh TLS marker／replica与SQL复核必须保持相同正式边界、pending和固定版本及零锁／零准备行；任何变化恢复父进程并拒绝。只停止已排空父进程，不对working父子、进程组或链发送终止。

候选继续使用已审核C50 loop／16审查与16 hydration、新的独立runtime、原解释器和deployment。全过程保留原pending553728，下一轮从pending恢复；原源码、八debug、钱包、原数据和原五实现不改。C64必须先自然结束并独立确认0attempt／0信号／无交接阶段，避免并行控制器。只准备、测试和只读观察时不记安装；实际authority、推进、524022七覆盖和全部钱包父合同分别验收。

- C66-1：权威恢复语义与当前实际阶段／锁／pending的只读审核。
- C66-2：独立政策和完整before／after控制器，原100项拒绝合同保持，新增pending版本／锁／prepared／timeout／竞态拒绝；当前working观察必须拒绝，0实际信号。
- C66-3：C64自然终态后才允许唯一有界观察；出现完整新门才一次交接，新authority和选择器有独立审核。
- C66-4：后继实际恢复同pending、正式推进和七覆盖，完成真实查询／页面之后才审父项。
