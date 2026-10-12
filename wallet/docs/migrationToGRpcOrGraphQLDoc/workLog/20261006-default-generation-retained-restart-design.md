# QA-A17：隔离默认 dev generation 保留数据重启合同

本批只操作 `dev-20261006-03`，沿用 creation-time 200ms 环境、原 argv、当前源码编译的八个 debug 产物和原 genesis／config／DB。原生产测试链、发布校验器、所有消费者、Docker、profile、keys 和 pending 不参与停止。`dev-20261006-02` 的停滞失败保持，不以本案覆盖。

- [x] R1 独立验证当前 native readiness、精确进程／端口／creation env／源码／八 debug；保存原 runtime、node.pid 和固定 0–205 已认证 checkpoint 字节摘要。
- [x] R2 仅向确认的原隔离 PID55397 发一次 SIGINT，证实两端口释放和真实生产 native reader 返回 RpcError；保持 genesis、config、固定 checkpoint 和 DB 路径。
- [x] R3 使用原 argv、原 creation env 启动 PID36954，证实同 H0／generation、固定 checkpoint 原摘要／完整认证前缀逐字节保持、实际 checkpoint 继续推进。
- [x] R4 [独立恢复审核](./20261006-default-generation-retained-recovery-01.json)通过，额外 0 信号／0 进程；更新隔离 runtime 的当前 PID36954 和 native-only readiness，queryServicesReady 仍为 false。

任何准备验证失败都不发信号；停止后恢复验证失败不标 ready，保留 intent、全部原文件和失败日志。未部署该 generation 的查询／归档／合约，也没有 Chrome 重启验收；R1–R4 单独完成不能勾选整个 QA-A17。

原[整体失败日志](./20261006-default-generation-retained-restart-01.log)和[失败源文件](./20261006-default-generation-retained-restart-failed-01-source.py.txt)保留：新链完成实际恢复后，收尾错误要求旧主链读取已裁剪的 checkpoint205，因此整体失败，临时 ready=false 未被改写为通过。独立恢复审核只读旧主链当前 head1034140，并重新验证新链固定 checkpoint205、完整 206 前缀及 head6783→6823；主链、原 pending／keys／profile、八 debug 和源码保持。新审核证明已恢复状态，没有再次停机或启动，也没有补写旧失败结果。
