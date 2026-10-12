# RPC-24完成：zkLogin默认禁用与既有数据保留

日期2026-10-03。按archive主方案03第3.1节（合并04第3.1节）执行“RTD不引入zkLogin业务，默认关闭创建／成功链路，已有开发数据不静默删除”。此前将成功链路列作后续事项过宽，本项纠正为既定范围，不新增业务。

ZkLoginAccount改为只读已有记录适配，canSign=false，createNew／unlock／signData明确拒绝，isLocked始终true。保留factory识别和toUISerialized字段、地址／名称／邮箱／provider／选择状态，不执行数据库删除或重写。创建按钮区域与旧账户解锁入口显示不支持说明；警告弹窗不再建议开启OAuth成功链路，保留已有确认操作。

旧历史探测两处queryTransactionBlocks及OAuth／prover成功流程已从账户类移除。getCurrentEpoch的gRPC残留工具已在前批迁移，现无账户成功流程调用；latest checkpoint入口限制probe此前已迁gRPC。无消费者的shared/rtd-client工厂及BackgroundServiceSigner已移除。其它钱包旧RPC仍单独处理。

证据：新增3项实际账户类测试（创建禁用、只读锁定／不能签名、展示身份保留）和1项React创建入口无OAuth按钮。联合current-epoch／entry-access／RestrictedGuard／消息签名等8文件42/42通过；类型检查91条诊断（前95）。日志20261003-zklogin-disabled-tests.log和typecheck.log。源码搜索相关账户目录及入口guard不再含queryTransactionBlocks/getRtdClient/getLatestRtdSystemState/getLatestCheckpointSequenceNumber。

RPC-24按“残留分类、默认关闭、已有数据保留”勾选；不声明zkLogin新业务、真实Chrome或整个迁移完成。存量记录读取用受控数据库接口测试，真实扩展升级留QA-A01；其它普通钱包核心试用条件仍未满足。
