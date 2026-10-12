# 2026-10-04 非原生混合资金实际钱包执行

任务：RPC-04／TRY-02／TRY-03增量；共同快照、非原生发送表单及完整试用继续待验收。

## 原链与一次性边界

沿用原mixed-execution-browser-01的同一账户0x1cedd5e3a0e54992fcf62656b0ec9b69aa0a93aca99e2d404a1fc77bac23b126，仅在原RTD交易HR27Xmrhd2KPsN4YDCbJzsBYkmcpnnf3NN1m2kW5rEUd成功且全部相关管理员／目标pending原摘要实查成功后进入新准备。rtd源码HEAD49a05a0de323b45a49d067a855c419e98d071afc、diff／变更文件与两debug二进制均匹配当前证明；节点PID72736、H0=3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj。

代币WMIG为0x94d0592fc90479aa2c999a7ba34596031159244779ae0ba608196d14995fbf17::migration_coin::MIGRATION_COIN，6decimals。原种子447hWGinSMrYFCf9eeAvKa2X1kFb6j9W4g5R1L1kSnBy未补发。发送前Coin与地址各1000000，RTD为498990120纯地址资金；收款管理地址0x11e90d26087af15981c5e7d0739ce58886755f1ac83ebaeb1f7c643b87e5f614。

scripts/test-mixed-token-execution.cjs默认只读恢复，唯一--execute运行要求marker不存在、旧journal仅原native成功记录、实链完整资金、原debug与同H0成立；准备完成后fsync独占记录mixed-token-attempt-01.json，再点击一次实际Approve。既有marker始终阻止再次执行模式；本轮之后仅允许原摘要恢复。

## 实际路径与结果

本地modern dApp使用生产addressFundedTransfer，真实live Coin 0x8052fc9591a5e0f89ad530a33c295128796b419c6e1635c9876f945eec8f6010 v28（余额1000000）加1000000地址提款。正式批准指令为redeem_funds、MergeCoins、SplitCoins、向收款人TransferObjects、向发送人返还change；发送1500000。RTD gas payment=[]，price1000，budget3489144，最终bytes包含Validity约束。先前地址gas模拟修复与本轮现代预览快照修复在真实扩展生效。

实际worker与磁盘ad6bd1c74ee9c6694efba03785a28b773c048cdf8b564b229e6bd2ee99fd2c06相等。worker观察到3次模拟、1次ExecuteTransaction；钱包digest **6mTumr6izYKqyxrRyTzEwuzgqjj5SbTEL84kLfkmqhnK**成功、Ledger checkpoint **409864**。journal初始执行回执checkpoint=null，不能改写成广播时已确定checkpoint。

原摘要新鲜读取验证：原批准bytes与Ledger bcs逐字节相等；Ed25519签名验出原sender；effects BCS与journal逐字节相等且同digest成功。代币balanceChanges接收+1500000、发送-1500000；RTD只由发送者承担净gas **2489144**，没有把WMIG当gas或从代币扣费。

| 账户资金 | 执行前 | 执行后 |
| --- | --- | --- |
| 发送者WMIG总额 | 2000000 | 500000 |
| 发送者WMIG Coin | 1000000 | 500000 |
| 发送者WMIG地址 | 1000000 | 0 |
| 接收者WMIG总额 | 0 | 1500000 |
| 发送者RTD地址 | 498990120 | 496500976 |

## 失败记录和只读补验

原执行脚本在实际dApp已返回成功且journal成功后，错误地要求默认输出含balanceChanges，报告TypeError/filter。该日志20261004-mixed-token-execution-modern.log exit1原样保留，不能把整次runner记为通过。catch的currentWorkerTraffic明确记录1广播／3模拟；旧顶层计数尚未收集而为0，不能据此宣称未执行。

没有重复批准。第一次独立恢复又因Ledger getTransaction漏请求bcs:true导致harness失败，0模拟0广播，20261004-mixed-token-recovery.log保留；补齐明确可选字段后20261004-mixed-token-recovery-full-fields.log及final.log均exit0、0模拟0广播。默认dApp结果包含固定bytes／签名／effects，不强求可选balanceChanges；独立Ledger请求effects／balanceChanges／transaction／bcs全部字段。原dApp返回全文在首次harness错误前没有持久保存，dappReturnPersisted=false，不能宣称该次原始返回全字段已有可复核原文。

整浏览器关闭后同一profile冷启动，账户锁定、恰好原native与新token两条成功journal保持，恢复只查原digest；未重置profile。原native恢复工具已严格认可这两个已记录摘要，并在余额校验中扣除新token实际gas；20261004-native-and-token-journals-recovery.log独立通过0模拟0广播，不忽略额外journal。final只读验证后将原marker状态更新为confirmed-success，并关联独占保存的恢复证据。

公开证明20261004-mixed-token-execution-evidence.json；私有批准bytes与执行材料留在runtime/mixed-execution-browser-01，不写入公开日志或Git文档。scripts/test-mixed-token-execution.cjs只读模式以及test-retained-mixed-execution.cjs可继续复查，禁止重跑--execute、旧2RTD准备／种子部署目录。

## 编码与剩余验证

共享预览入口修复后6文件121项及完整130文件1406项通过，wallet tsc、Webpack和四入口审计通过；modern demo3文件15项及Vite通过。详见20261004-modern-preview-snapshot.md。

当前共识链原摘要／资金验证通过不代表资产列表追平。恢复后的实际WalletAssetReader共同快照仍拒绝、账户历史仍拒绝，失败日志20261004-token-assets-post-execution.log和20261004-account-history-cold-recovery.log保留。此次是modern dApp进入真实钱包批准的WMIG转账，不是钱包非原生发送金额表单／metadata完整验收；混合发送全部实际UI、新助记词账户注资发送等剩余清单保持开放。总体48/98、trial_ready=false。
