# TX-06：成功／失败终态与持久失败恢复完成

日期：2026-10-04。范围是严格终态回执验证、原子journal提交与原摘要保守恢复；完整故障、网络切换、所有NFT／coin入口与试用条件仍按其余任务验收。

## 合同核查

- WalletExecutionReader只派发原批准bytes一次；validateTransactionReceipt核验原交易摘要、bytes、签名、proto effects与原生BCS的status／digest／epoch／gas等一致性。success=false且effects有效为终结链失败，不是传输异常。
- WalletExecutionCoordinator在dispatch之前落盘dispatch-pending。回执验证失败／网络未知保持pending；成功或失败回执进入同一commitReceipt。commitReceipt在一个原生事务中写confirmed-success／confirmed-failure并释放pending scope，等待transaction complete；写入失败继续保留pending。
- recover只查询原摘要；NOT_FOUND、身份不符、回执不兼容及存储失败均不能解释为“未执行”，不能重新签名或发送。
- 既有真实原币／质押／dApp成功journal已验证；本轮补齐新的实际扩展链失败和重启后的终态保留。此前16场景原生IndexedDB故障harness已验证：put成功后transaction.abort时两种终态均回滚，重新打开仍pending，去掉故障只lookup原摘要恢复。参见20261004-receipt-atomic-abort.md；不将harness当作物理断电或真实链故障。

## 指定dev环境与一次真实失败

仍为当前本地rtd源码编译的debug进程，H0为3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj。关闭夹具前，link-u-smart-contract/all-in-one-deploy/localDeploy/close_wallet_failure_fixture.mjs再次核对源码HEAD／diff／changedFiles、debug CLI摘要、运行PID及同链身份，检查管理账户此前所有pending均有匹配成功回执。

保留原dapp-execution-browser-01，先审计4笔已知confirmed-success；没有使用旧deployer未决账户或删除journal。浏览器批准前fsync一次性attempt标记并复算固定BCS摘要。

1. 实际扩展完成准备及最终模拟，共3次SimulateTransaction。仅在dispatch-pending已落盘、最终模拟通过后的原ExecuteTransaction发出前暂停fetch；不修改请求或模拟响应。
2. 独立管理账户在30秒新鲜arming证据约束下关闭Gate；管理交易GseqxhRErUfyYATbtLxUJwk3uKoK8zsomh8w4H4HWDB8一次派发，成功于checkpoint390789。
3. 放行原钱包请求，钱包派发计数1，未超时、未重试。钱包digest为d4kE2koaXQ829UWnhXd8exWawWa37zEuzCfA7WLdkRC；checkpoint390790，epoch2，effects V2为MoveAbort，execution_gate::visit，EClosed=1。
4. 现代dApp真实返回FailedTransaction，success=false、digest和bytes与批准一致；扩展journal为confirmed-failure。
5. 关闭整个浏览器再启动同一profile，账户保持锁定；5条journal保留，旧4条success、新1条failure。恢复只查询原摘要，不重新批准。
6. 再独立运行--recover-only复核：0模拟、0派发。真实WalletExecutionReader／WalletFullnodeReader只读复核两个摘要和Gate BCS：closed=true、visits=0，证明失败调用没有提交状态变更。

浏览器使用受控证书SPKI例外，本项不替代原生CA／host权限矩阵。立即执行收据checkpoint允许null；后续真实Ledger查询已返回390790，不伪造或改写旧journal回执。

## 准备页面竞态修复及证据

本次实测暴露并修复StrictMode观察者重放与前台读取会话变化导致的重复后台准备／执行锁自竞争。见20261004-dapp-preview-session.md。两次仅查询键修复的未通过日志均保留，最终同scope合并进行中的准备后实际批准页和失败链路通过；签名／执行没有合并。

- 43项准备／恢复门禁／授权／guard测试通过。
- 78项reader／coordinator／stored-receipt／后台执行测试通过（4文件；命令中不存在的dapp-recovery.test.ts不计为执行）。
- demo 9项测试、Vite构建，完整wallet tsc、Webpack38329ms及Provider／四入口wire静态审计通过。
- 当前UI SHA256 a3451338bd8c51188ea239657de2d31bf93b2ff47571a97a0088e50e26a4c13d；后台e355c0d81dbf3dc4e2eef83bac004ec6a549dc891124227c5826ab5f78799c5b。实际worker通过CDP逐字节与构建核验，重启前后均匹配。

原始证据：20261004-failed-execution-chrome-coalesced-cold.log、chrome-readonly.log、failed-execution-readonly.json/.log、TX-06-tests.log、dapp-preview-coalescing-*。受控暂停与一次性标记由scripts/test-dapp-failed-execution.cjs执行；原摘要追加复核由scripts/probe-wallet-failed-execution.ts执行。既有marker存在时只允许--recover-only，禁止重跑默认批准路径；Gate已关闭，不重新发布以掩盖结果。

TX-06按以上合同完成；RPC-14／TRY-02等其余完整范围未因此自动完成。总体47/98，trial_ready=false。
