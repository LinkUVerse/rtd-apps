# TRY-04 完成：实链超时、窗口关闭、worker 重启后的原摘要恢复

2026-10-04。按原清单“真实 timeout 已上链／popup关闭／worker 重启／同摘要恢复核心验证”完成一条组合实链故障路径。不是全部竞态、切网切账户、进程强杀或全部提交故障矩阵完成。

## 一次提交和受控响应丢失

脚本 `scripts/test-dapp-timeout-recovery.cjs`，初始完整运行日志 `20261004-dapp-timeout-recovery.log`，退出0。复用上轮保留的 dapp-execution-browser-01 Chromium profile、同一测试账户及journal；启动先确认原执行5yEbxH4Ex5GUhQ1LwEWPrvQqcwppJGByLHiiuQUcBL4j已经confirmed-success，且没有其他记录。未新建账户／profile绕过pending，未请求新faucet。

- 新请求 aae6e5e6-b419-4d42-b0d4-2f2b76d647c5，摘要 **4EqnBaAX7Bnb3j1iqnPsaw5efscHEwd2UUCr2ZrSicLN**，仍是demo的一最小单位向自身转账。
- 批准前wx写入私有fault-timeout-01.json，包含原摘要／请求／账户。该marker存在时新提交模式拒绝再次运行，只允许 --recover-only。
- 在实际service worker中注入测试fetch包装：ExecuteTransaction只允许一次，调用原生fetch发送到既有Fullnode并读取真实响应；随后扣留该响应，直到执行reader的原生AbortSignal超时。观测timeoutObserved=true、upstreamResponded=true、HTTP status=200、dispatches=1。
- 为保证可观测pending跨重启，首次提交后的GetTransaction／BatchGetTransactions被暂时注入读取失败（实际记录lookupsBlocked=1）。不伪造NotFound、不修改journal、不替换成功effects。
- 超时后从实际IndexedDB读到原requestId／digest的dispatch-pending，再关闭批准popup、关闭整个浏览器。pending事实在关闭前写入私有marker；没有清除或重写journal。

## 重启恢复

重新打开同一profile，service worker重新加载，测试fetch包装随旧worker销毁。启动／连接wakeups与显式recoverPreparedTransaction均只允许查询原记录，不构建或发送。

实际journal变为confirmed-success，receipt.success=true，source=fullnode，epoch=2，**checkpoint=255912**，摘要和requestId与批准前marker一致。数据库保留原成功记录加本次成功记录，共2条。

整个初始故障运行捕获ExecuteTransaction **1**次、SimulateTransaction **5**次；包含重启阶段的总提交数没有增加。HTTP 200本身不作为链成功证据，最终通过Fullnode回执验证及持久成功记录确认该交易已经上链。

随后再次单独执行 --recover-only（`20261004-dapp-recovery-locked.log`，退出0），明确核对重启账户仍isLocked=true，未解锁即可读取／恢复同摘要终态，**0次模拟、0次提交**。该复核另存fault-timeout-01-readonly.json，不覆盖初始故障过程证据。

## 完成范围与保留状态

- TRY-04核心组合路径完成：真实链执行后响应被扣留触发实际超时，pending持久化，popup关闭，整个浏览器导致worker重启，按原摘要恢复。
- 恢复可能由startup／onConnect wakeup先完成，也可能由显式只读命令完成；不把本测试写成“仅alarm自动恢复”验收。
- 故障是测试脚本对worker fetch的受控注入，不是自然发生的网络故障；节点和交易／journal／批准页都是真实的。
- 没有证明worker被独立强杀在任意指令点的全部崩溃窗口，也未证明切网切账户、NotFound/归档缺口、持久落盘失败及多窗口所有入口矩阵。TX-04／07／12等不因此全部完成。
- 本轮只修改测试脚本／文档，无新业务代码。业务产物仍为上轮UI d22896c9e2db6360793c59b920e12084beb73edf7deb05d891fcd4fb16135102、background cfd3c81ca32f0ea723c84ca8c837f3d20d63d0c5efc651ec108775f815f37910；沿用117文件1253项、钱包tsc、开发构建和四入口审计，不冒充本轮重跑全量。
- 同一指定源码debug环境未更换／重启；编译Local profile03 revision2和精确dev leaf SPKI例外不变，不代表正常CA、custom permission UI、生产环境或人工试用通过。
- 私有profile／账户恢复材料／两个fault证据文件保留，不提交、不打印密码或签名。原deployer pending未触碰。不得删除保留目录重新跑新提交模式。

TRY-04完成后 **38/98（38.8%）**，trial_ready=false。
