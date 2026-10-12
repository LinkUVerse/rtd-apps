# 传输升级后的消费者启动绑定同步

日期：2026-10-04。

## 已完成操作

在用户指定合约部署仓库新增 reconcile_wallet_adapter_bindings.py，默认只读预检，显式 --apply 才写入。核验 guard-adapter-rebind-01 旧配置与原 manifest、当前适配器 inspected 配置、guard-transport-upgrade-02 已通过的测试日志摘要及覆盖层证据、原镜像 visibility.py 内容、当前选中 guard 镜像、最新 RTD 来源与 debug 二进制摘要。

只允许 codeSha256.visibility.py 从已记录旧值变为已验证新值；端点、端口、H0、证书、launcher 与其它模块任何差异均拒绝。query 与 KV 原绑定必须精确引用旧 config SHA。

获取 adapter／query／KV 三处生命周期锁，检查四个实际进程身份；创建独占私有备份目录 consumer-adapter-binding-reconcile-01 并 fsync 保存原文件后，只更新：

- native-query-stack/binding.json 的 adapterSha256。
- native-kv-stack/binding.json 的 adapterConfigSha256。
- native-kv-stack/manifest.json 中 binding.json 的摘要。

配置摘要从74e8975e51f850a5a3ebf69d970fd816020f25585281e790ba88aab33449439c同步到35ba9910e60f1620ee850c096f7071a0926bb67a36c15c2be9f82878a7848714。每个文件原子替换，操作目录记录 backed-up／complete；这三份文件不是一个跨文件原子事务，若中断必须依据保留备份与阶段检查恢复，不重放或覆盖旧操作目录。

## 验证

- 4 项守卫测试通过：仅允许已验证模块差异，拒绝额外链／端点／启动器变化，拒绝错误证据，绑定要求精确旧摘要且不修改其它字段。最初从错误 cwd 导入 unittest 失败，切到实际脚本目录执行通过，非代码失败。
- preflight.json 为只读计划；applied.json 确认实际 applied=true；旧私有文件留在 runtime，不复制含潜在敏感上下文的文件进仓库。
- after.json：query／KV 当前 debug 来源与新适配器摘要均匹配，三消费者身份仍匹配原 PID30615／65784／65614；适配器 PID58074 在写入前后均未变化。
- 独立 launcher-preflight.json：按原启动器构造完整 query／KV binding 字典逐项等值，原 query 配置与 KV manifest 全部核验通过。没有调用数据库 provision、compose up 或启动／停止进程，不将此结论写成已重启验收。
- 更新后最低观察水位：{'native-query-stack/indexer': 164490, 'native-query-stack/consistent': 102551, 'native-kv-stack/writer': 102521}。仍未覆盖 PersonalKiosk203097。

没有改变消费者并发、guard／adapter容量、节点、数据库、合约或 checkpoint 数据；不声称吞吐提高。下一步继续评估6个adapter permits与一致的2／2／2消费者预算，并在实施后验证原进程退出、来源绑定及真实水位前进。总体42/98，trial_ready=false。
