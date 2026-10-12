# NET-04：持久网络观察与完整能力状态子任务

2026-10-05。上一轮提交后三类已实际通过，属于进展；原supervisor59830本轮重新轮询仍活跃。以archive05／wallet06的2–4节完整合同为准，NET-04及父TX／TRY不缩小范围。本批先实现跨操作／窗口／worker的水位观察及隔离，再继续SDL／package／覆盖与全局状态，不以identity-verified命名ready。

Sui固定c8601468的[GetServiceInfo源码](https://raw.githubusercontent.com/MystenLabs/sui/c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-rpc-api/src/grpc/v2/ledger_service/get_service_info.rs)返回完整genesis digest、latest checkpoint和最低保留水位；generation及钱包持久隔离属于RTD策略，不从上游接口推断已完成重置。首次误用非grpc源码路径得到404，正确固定源码已重新读取。[IndexedDB 3.0](https://w3c.github.io/IndexedDB/#transaction-scheduling)规定重叠readwrite事务的调度与隔离；strict为durability hint，等待事务complete作为API提交屏障，不能宣称本机测试证明物理断电安全。

新独立数据库保存schemaVersion、H0／generation scope、两个原生角色的已观察最高水位和reset-required证据，不保存密码、密钥、签名、批准bytes或交易journal。scope不包含profile别名、revision、账户或URL；同H0／generation既有水位不因换操作／别名／revision而归零，角色水位不互代。显式新generation保留旧记录并建立独立scope。观察只用于安全准入，不扩大旧归档可读范围。

网络探测前读取已提交观察快照，网络结束后在同一readwrite事务中重新读取并核验。低于探测开始时已提交水位才写持久reset-required并在complete后拒绝授权；若只是并发探测晚完成、低于期间提交的新高水位，则拒绝这次迟到准入且保持最高水位，不错误写成全局reset。探测成功只有完整可接受报告才发布原生正观察，临时不可用不清水位。已有隔离、损坏、不可用、写入失败或取消均不能变为签名许可；并发首次写、scope丢失及错误字段需要保守拒绝。先不增加自动修复或清除入口。

后台交易每次authorize在真实身份握手前读取持久记录、结束后提交观察；取消及本地身份仍前后复核。readonly原摘要恢复保持现有授权／H0核验且不借此签名，旧journal不更改。已知错链／不兼容仍优先拒绝，本操作隔离保持；跨操作负面身份、全局读缓存撤值及UI完整capability合同列为后续必需项，不能因持久水位子任务通过关闭NET-04。

| 子任务 | 要求与证明 | 状态 |
| --- | --- | --- |
| CAP1 | 严格schema／scope、原生角色最高水位、并发快照判定、独立IndexedDB strict complete持久提交及隔离 | 待编码 |
| CAP2 | 当前后台交易准入接入；只读恢复保持；损坏／缺库／取消／写失败拒绝；定向与完整类型检查 | 待编码验证 |
| CAP3 | 真实Chromium原生数据库：跨连接／窗口／worker重建、事务abort／损坏、迟到并发非reset、新generation；夹具与实链区分 | 待验证 |
| CAP4 | 稳定Local新构建、AST／四入口闭包、原7与新增四attempt只读核验及当前只签名／持久隔离非提交Chrome | 待验证 |
| CAP5 | 完整SDL／服务能力／coverage／package／registry及accountHistory聚合探测；分角色功能状态，不伪造ready | 后续必需 |
| CAP6 | 全局读与执行缓存撤值、跨操作错链／不兼容负面结论、明确UI ready／degraded／mismatch／reset和受控重新绑定 | 后续必需 |
| CAP7 | 官方来源、双方合同、全部失败证据、Task／workLog／总进度与完整父合同逐项审计 | 持续同步 |

所有新产品变更必须产生自身构建与运行证据，N产物1016／6f9dd283、UI502b1fa0／后台64061534及上一轮AUTH通过是历史稳定基准，不冒充修改后当前产物。受保护RTD／planner／adapter不改、原有界回放不重启／提前resume；原7与新增四attempt不清除／重签／重发。49/98，trial_ready=false，子任务不另计98项。
