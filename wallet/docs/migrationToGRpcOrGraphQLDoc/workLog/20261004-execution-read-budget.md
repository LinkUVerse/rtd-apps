# NET-11：执行辅助读取与网络准入

2026-10-04。以当前代码复核：WalletExecutionReader.lookup/details已经委托WalletLedgerReader，已共享读取预算；本轮补齐前后GetServiceInfo、远程VerifySignature，以及probeEntryAccess和三入口身份准入的SDK单次查询。

读取在同一会话内共享四个运行／64个等待名额，等待受原有超时和取消信号限制。ExecuteTransaction仍是现有一次调用，没有包入重试逻辑或因失败重新提交。提交前身份查询在队列中取消时，实际执行请求不会发出；提交后的不确定状态仍由原有coordinator／journal处理。

## 验证

- `20261004-execution-read-budget-tests.log`：4文件54项通过。新增dispatch、verify、lookup排队取消零fetch；入口探测排队取消不判accessible；队列释放后仅一次ExecuteTransaction，lookup不再提交。
- `20261004-execution-read-budget-consumers.log`：4文件75项通过，覆盖后台执行、dApp执行、PersonalMessage和execution coordinator。
- `20261004-execution-read-budget-typecheck.log`：完整钱包tsc退出0。
- `20261004-execution-read-budget-build.log`：webpack成功，36228ms。
- `20261004-execution-read-budget-static-audit.json`：最终四入口产物静态审计通过。

本轮是8文件129项定向验证，未将前一轮1187项全量结果当成本轮全量。未执行新实链或Chrome验收。双方网络方案、Task与totalProgress同步；统一领域错误分类、跨会话聚合预算和完整网络故障回归仍待核验，NET-11保持未完成，总体34/98。
