# 当前后台实际提交后主动取消与恢复通过

2026-10-04。补齐此前旧worker导致失效的动态验收；本项不等于全部TX-09／TX-10完成。

## 唯一新尝试与前置

执行test-dapp-timeout-recovery.cjs --verified-caller-abort。沿用原保留档案，先核验原三条journal均confirmed-success；旧fault-abort-01的只读恢复证据也必须passed。运行中worker通过CDP源码验证，与磁盘background.js SHA256 7ff6153da72044c2ff95cea58c81fe89f2b629ee4ee2538b3c6ad9cd243178b8完全一致，重启后再次验证一致。

新一次性标记fault-abort-current-worker-01.json在批准前wx写入；已存在时只能--verified-caller-abort --recover-only。它是旧三笔均终态后从当前状态准备的新请求，绝非旧pending或旧bytes重发。

## 实际证据

20261004-dapp-abort-verified-live.log进程退出0、passed=true：

- digest：CDaQEspaBbXHQxDiG9R6GzYmfX6eAB4yYa7X1CubRvHC。
- requestId：6ddcfbd4-4f5e-459a-b631-775dd5a5509e。
- 真实ExecuteTransaction仅1次；节点HTTP200响应已收到并被测试包装暂扣。
- 页面调用方AbortSignal取消，页面返回取消错误且无签名结果，批准窗口自动关闭；transport观察到abortObserved=true、timeoutObserved=false，明确不是20秒超时触发。
- 真实IndexedDB在重启前保留同digest的dispatch-pending。浏览器／worker整个关闭后重启，新worker源码仍与磁盘一致。
- 账户保持锁定，通过原摘要只读恢复confirmed-success；Fullnode checkpoint270250，epoch2。最终四条原journal记录保留，整轮dispatch1、simulation5，没有再次签名／提交原摘要。

测试包装未伪造成功回执：先消耗真实节点响应，再等待取消；恢复从真实Fullnode重新读取。该场景是受控响应扣留，不声称自然故障、链回滚或取消能撤销已上链交易。正常CA／自定义网络权限仍不在范围，继续使用精确dev SPKI与编译Local。未重启dev链或部署、领币。

## 关联审计

相关5文件33项回归通过：20261004-modern-contract-audit-tests.log。命令里另列dapp-execution-result.test.ts实际不存在，Vitest执行的是日志列出的5文件，不冒称6文件覆盖。业务代码未改，未重复全量／构建。

重新核对官方[Wallet Builders迁移说明](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/wallet-builders)及[现代execute源定义](https://github.com/MystenLabs/ts-sdks/blob/main/packages/wallet-standard/src/features/suiSignAndExecuteTransaction.ts)：公开输出仍为bytes、signature、digest、effects，effects来自新API的BCS，execute继承signTransaction输入。当前源码审计另发现两个交易入口仍有account缺省时使用第一个账户的旧适配器fallback，而现代输入要求显式account。下一步移除该回退并验证缺失账户不进入批准；TX-09／10继续保留未完成。

当前进度39/98（39.8%），trial_ready=false。所有旧失败日志及四笔执行journal／标记均保留。
