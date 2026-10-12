# NET-04／TX-01：后台交易三入口身份授权守卫实施前设计

2026-10-05。前goal轮Q1–Q5为编码／真实Chrome进展；本轮原supervisor session59830确认仍活跃。当前withExecutionAccount.authorize仅复核配置／账户，实际交易reader只核验自己的Fullnode；已配置GraphQL或Archive明确错链不能作为普通降级继续签名。双方06／archive05的2.3规定错链整体停止。先修复后台交易准备／sign-only／execute授权边界，不把本批当NET-04所有UI／SDL／package能力已完成。

复用probeNetworkIdentity原生SDK临时只读三入口探测，每次授权使用新client／实际查询，10秒整体、读并发预算／取消保持；不释放执行client、不发模拟交易探测支持。已知错链／不兼容优先于其它入口不可用，Fullnode未验证不能进入交易授权；Fullnode有效而GraphQL／Archive暂不可用可返回identity-degraded，不将其当完整ready。仅已配置角色必须检查，不猜缺失入口。每次授权前后都重验本地配置／账户，探测等待期间锁定／切换的迟到成功拒绝。

同一后台操作会话记忆Fullnode／Archive已观察最高水位，倒退将该会话隔离为reset-required；已知错链／不兼容／倒退在该会话保持拒绝，不用下一次好响应抹消，不自行清profile、genesis、journal或重新部署。此内存不宣称跨worker／跨操作持久reset检测；全局UI状态、完整capability／SDL／package和生命周期水位仍属NET-04剩余合同。临时不可用不永久污染，下一次需重新探测。

守卫加入后台交易withExecutionAccount授权，涵盖内部币／NFT／质押和dApp固定bytes准备／sign-only／execute。普通本地confirmedReceipt与内部recover signing=false保留不依赖三入口；dApp只读恢复显式选择只读网络模式，仍保持原账户／请求／origin权限授权及实际Ledger同链核验。PersonalMessage独立离线合同保持；不能通过只读模式调用构建／签名／dispatch。

| 子任务 | 合同 | 状态 |
| --- | --- | --- |
| N1 | 官方／本地身份与降级语义、实际后台可绕过错链的前置回归、Task先存 | 待复现 |
| N2 | 共享后台交易身份守卫、会话隔离／水位、等待后本地重验及只读恢复模式 | 待编码 |
| N3 | 原生SDK三入口故障／取消、实际background执行授权及原恢复回归、全量／tsc | 待验证 |
| N4 | 公开TLS实际三入口、稳定Local／AST／闭包、当前后台sign-only与批准前故障零广播、原7journal保持 | 待验证 |
| N5 | 双方网络／执行合同、来源／失败／Task及实时进度同步 | 待同步 |

父NET-04／TX-01／TRY完整验收仍待，49/98、trial_ready=false；原认证回放继续，不修改受保护RTD源、adapter／planner或消费绑定。整体身份验证不是签名执行支持证明；真实模拟与最终bytes合同继续由原准备／执行层执行。
