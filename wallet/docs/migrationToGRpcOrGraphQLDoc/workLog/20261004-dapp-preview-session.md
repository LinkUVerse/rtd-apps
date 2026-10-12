# TX-01／TX-04：dApp 前台会话切换导致准备自竞争

日期：2026-10-04。

## 真实问题与定位

受控失败 Gate 的浏览器调用在尚未批准时完成两次真实模拟，但批准页显示“网络费用估算失败”，无批准按钮，ExecuteTransaction=0。保留了首次热重载 ERR_BLOCKED_BY_CLIENT 和后续 preview／IPC／React 诊断日志，未创建交易尝试标记、未关闭 Gate。

Node 中真实 WalletTransactionReader.prepare 同一 Gate.visit 调用及 prepared wire 编解码均通过。实际扩展 IPC 也收到成功 prepared。只读检查实际 React query error 得到“当前链账户正在签名或恢复，请稍后查看结果”：实际批准页的 StrictMode 重放取消了前台观察者，但 IPC 后台准备仍在运行；重放再次准备，被 PreparationGuard 拒绝。前台 provider 的 readSessionKey 变化及恢复门禁重挂也可能产生同类重复准备。只修改两处查询键仍失败的实际日志已保留，不能将该中间修复标记为浏览器通过。

## 修复

usePreparedTransaction 的 dApp 查询不再绑定前台 readSessionKey；仍绑定完整 profile bindingKey、sender、原始序列化交易、dApp requestId/accountId。后台自身验证读取会话、原始请求、权限及批准令牌。钱包内部入口仍保留前台 readSessionKey 隔离。DappRecoveryGate 同样按后台请求而非前台读取会话隔离。另在 TransactionRequest 的不可变 scope 内以 coalesceDappPreparation 合并正在进行的后台准备；每个观察者前后独立检查 AbortSignal，settled 后清除引用，不缓存已完成批准，不合并签名或执行。没有放宽跨账户执行锁或自动重试提交。

新增真实 React hook 测试，在第一个后台 prepare 尚未返回时替换前台会话，断言只调用一次且未中止；改变请求或网络仍产生独立准备。追加 StrictMode 重放、观察者取消、失败后新准备测试后，43项定向测试通过，完整钱包类型检查通过。测试 dApp 新增仅 localnet＋127.0.0.1＋显式 package/Gate 才可见的 visit 入口，9项 demo 测试与 Vite 构建通过。

误用不存在的 tests/demo-app/tsconfig.json 导致 TS5058 的失败日志保留；之后正确使用钱包根 tsconfig.json（包含 tests）检查通过。

最终Webpack38329ms、Provider与四入口wire审计通过。实际Chrome后台e355c0d81dbf3dc4e2eef83bac004ec6a549dc891124227c5826ab5f78799c5b匹配构建；批准页成功显示准备结果并只批准一次。真实MoveAbort、FailedTransaction和锁定重启恢复通过，详见[TX-06完成核验](./20261004-TX-06-completion.md)。TX-01／TX-04仍有其它范围，不据此勾选；trial_ready=false。
