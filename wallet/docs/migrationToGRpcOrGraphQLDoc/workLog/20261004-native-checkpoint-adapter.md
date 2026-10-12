# 2026-10-04 原生查询消费者的检查点适配入口

新增指定部署入口 `manage_wallet_checkpoint_adapter.py`，在loopback39591运行当前归档源码的consumer_proxy，将原生HTTP检查点客户端接至私有mTLS guard39590。独立客户端证书不交给原生消费者；适配器也没有S3／PG凭据。仅允许规范checkpoint路径及committed marker；复用现有4并发／128MiB／无重定向／错误空body等约束。

配置绑定当前guard身份、链、端口、Python源码及部署launcher哈希，私有目录／证书manifest验证；启动记录PID及完整进程身份，重复调用只观察已有进程，PID被复用或启动中断时拒绝盲目再次启动。

## 当前证据

- 真实PID51033，本机入口39591，mTLS上游39590。
- 实际HTTP读取0／100返回200，SHA-256与此前PG固定版本认证证据一致。
- 未来高度1000000000返回503空body；任意路径及00非规范序号返回404空body。
- [5项真实请求证据](../evidence/20261004-native-checkpoint-adapter.json)。尚未连接原生indexer／KV／consistent消费者，不能据此认为新查询栈完成。
- 3项私有manifest测试通过，覆盖证书变更、源码变更、manifest缺项、符号链接和公开权限拒绝；见[测试日志](./20261004-native-checkpoint-adapter-tests.log)。

## 发布者实时观察

原PID20639继续工作，子进程存在，未重启。已补取100252个检查点；随后PG观察active、publishedHi100、pendingHi100251，checkpoint ledger行数1070，说明本轮已进入认证后的逐对象发布／副本检查阶段，尚未全量提交。该数字只是采样，不能报告published到100251。详见[进程状态](./20261004-publisher-during-adapter.log)。

下一步接当前源码debug KV／Ledger等消费组件到本机适配器，并使用新的独立HBase数据面。现有旧内部诊断Ledger不作为可信公开入口。总体18/98，ENV／TRY仍未完成。
