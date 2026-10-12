# TX-05 完成：单次提交与未知状态守恒

2026-10-04。按Task原范围“单次dispatch，传输／取消／缺失回执／错digest保持未知”逐项核查，完成此项；不因此完成链上失败实测、全入口UI、切网／切账户矩阵或其它TX条目。

## 当前实现核查

- src/shared/rpc/execution-reader.ts 是wallet源码唯一底层 transactionExecutionService.executeTransaction 调用点，只用当前Fullnode入口；不通过session.request读重试路径。session.read本身没有循环／重试，fetch禁止redirect并绑定取消、超时与会话。
- 当前实际解析依赖是 rtd-ts-sdk/packages/typescript/dist/grpc/index.mjs；RTD transport只调用一次上游unary并归一错误。已读安装的 @protobuf-ts/grpcweb-transport 2.11.1 unary实现：一次fetch，失败只拒绝promises，没有自动重发。
- execution-coordinator.execute先核验批准bytes／digest／绑定，互斥内检查既有request和scope pending，再模拟、签名、验签；commitPending事务成功后才调用一次dispatch。pending之后的异常、会话失效、错／缺回执保留pending。commitReceipt失败同样不释放为可重新提交状态。
- 新request遇到同scope pending直接返回原记录，不重新模拟／签名；recover仅lookup原digest并验证、持久化终态，不存在dispatch路径。
- wallet币／NFT／质押经background executeWalletPrepared；dApp经executeDappPrepared，均使用同一协调器。UI消息take(1)，没有发送重试；TanStack默认retry只配置在queries。此为所有编码入口的调用关系，不冒充NFT与赎回真实UI验收。

## 验证证据

本轮5文件101项测试通过：execution-coordinator、execution-reader、background execution、dapp-execution、execution-recovery-wakeup。见20261004-TX-05-audit-tests.log。

其中实际SDK protobuf／gRPC-Web传输与实际reader、协调器联动10例，覆盖传输中断、错误trailer、缺失回执、错误digest、提交期间会话关闭，分别恢复成功／失败；逐例确认ExecuteTransaction线上请求只出现一次，发送前已有pending；新会话新request仍不重发，仅GetTransaction原digest。journal与服务响应为受控fixture，这部分不称实链验收。另覆盖Unavailable不重试、提前取消0提交、durable失败0提交、终结落盘失败后只读恢复等。

真实timeout与caller AbortSignal证据分别保存在20261004-TRY-04-completion.md及[20261004-dapp-abort-verified.md](./20261004-dapp-abort-verified.md)及其原始20261004-dapp-abort-verified-live.log；本轮没有重新发送这些交易。原记录的四笔请求在当前真实扩展worker重启后只读核验全部confirmed-success，锁定账户，0模拟、0提交，退出0；20261004-TX-05-retained-audit.log及其summary.json记录2026-10-04T08:07:14.581Z事实。当前worker绑定background 3a85161e43e83c72be22dc6808dd20feea7b021ad3605c65bf31d7e45263eb10，静态四入口审计也通过，UI仍9601f6ee38696c6527d162932030d5777cfc4607e85299e1037aaf5eaa28aa62。

本轮没有业务代码变化、没有新构建、没有全量测试，不将101项定向测试写成全量验收。保留档案和marker未删除，只读模式不能支持对原失败测试断言的补充推断。TX-06／07／10／11／12与TRY剩余门槛继续独立验收。

## 环境诊断补充

宿主机到发布数据库TLS连接12次中位87.4ms，SELECT1中位6.4ms，记录20261004-guard-pg-connect-diagnostic.json。该连接使用宿主机管理角色，不能等同容器内guard只读连接成本；尚不足以决定加入数据库池，生产guard未改。
