# C35 交易Move ABI观察归属与清理

审计当前`assertTransactionMoveAdmission`使用普通begin且fetch缺少实际工作lifetime；取消后安全地保持占位，但新记录无法证明归属来收尾/冷恢复。沿用C34原生机制，独立验证该路径，不扩大身份探测证明。

- [x] M1：仅有authored Move依赖的完整探测使用原ticket recoverable owner/marker；native/opaque-only继续纯本地负面准入检查，不制造ABI观察。
- [x] M2：原fetch/body/cancel纳入同lifetime；取消不给授权，实际结束才收尾自身failed占位，迟到负面/失败提交保留；原无marker票不动。
- [x] M3：真实SDK控制流与原生Chrome当前ABI函数/IDB验证，完整测试/类型/独立生产闭包；无签名/Execute。
- [ ] M4：当前实际钱包全入口取消/冷恢复/竞争与最终执行验收。

审核release pin、完整authored group ABI、当前会话、原批准bytes、最后runIfClear及执行互斥保持。接管原ticket不视为ABI成功，必须完成完整新鲜probe及strict commit，既有负面不得清除。

M1–M3范围证明：25项当前定向、全量2618测试、两套类型、原生Chrome当前函数12项、独立production及完整闭包通过，见`20261006-C35-coding-verification-01.json`。原生测试为独立只读协议夹具及真实IDB/WebLock，确实调用当前ABI函数；native/opaque-only原0请求路径及原ABI/identity负面隔离由既有定向覆盖，不替代M4实链全入口。
