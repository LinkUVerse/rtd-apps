# dApp取消联动与实链提交后恢复（未全部通过）

2026-10-04，TX-09／TX-10继续打开。

## 编码联动证据

新增dapp-cancellation-integration.test.ts，把ConnectionRequests、真实Transactions批准生命周期、withAuthorizedDappRequest、WalletReadSession和真实执行协调器联动。模拟等待／签名等待期间取消阻止dispatch和pending落盘；dispatch已开始后取消保留pending，新请求不得模拟／签名／提交覆盖原pending，另一个会话只读原摘要分别恢复链成功／链失败。使用实际SDK签名验签，账户权限、浏览器storage、journal Map、网络响应和执行锁仍是测试实现。最终5文件73项通过、钱包tsc通过，日志20261004-dapp-abort-coordinator-final-tests.log及-typecheck.log。业务代码未改，未重复webpack／全量。

## 实际提交后的主动取消：失败，不计通过

扩展脚本test-dapp-timeout-recovery.cjs新增--caller-abort，使用既有保留浏览器档案，先核验原两条confirmed记录。批准前以wx写入fault-abort-01.json，已经存在时只能--recover-only，不能删除目录或尝试标记重跑。

唯一新摘要：tzHhXCPSvrJ95g4u6mWqtdU2cmZm6tULha6Vrq812KT；requestId：187f18b0-ed96-4662-8a96-61d7643c71bc。公开测试账户沿用a0ccc8…2233da。worker故障包装只允许一次ExecuteTransaction，真实节点响应被扣留，调用方点击取消；但日志20261004-dapp-abort-dispatch-live.log显示阶段“caller abort after upstream response”内5秒观察断言失败，进程退出1。

首版脚本对“窗口已关闭”和“transport abort已观察”使用同一阶段名，错误未打印具体行号与故障状态，因此不能判断这两个检查哪一个失败，也不能宣称整体取消通过。未将无证据判断为生产代码缺陷或纯测试超时。已改进脚本分别记录阶段，并在未来失败时保存fault和真实journal安全摘要；本次没有为取得通过另发交易。

## 原摘要只读恢复：通过

执行同脚本--caller-abort --recover-only，日志20261004-dapp-abort-dispatch-recovery.log，退出0。重启后账户仍锁定，原requestId与digest一致，恢复confirmed-success，Fullnode checkpoint267087、epoch2。此次dispatches=0、simulations=0。保留档案当前三条交易记录；fault-abort-01.json仍保留原about-to-approve状态，恢复另写fault-abort-01-readonly.json，禁止删除／初始化重跑。

重要证据边界：该恢复日志尾部scope沿用了过宽的caller-abort描述，它不证明失败运行中popup关闭／transport取消断言通过。此文字已经在脚本后续输出中修正为仅原摘要锁定恢复；历史原日志保留，以本段校正解释。实际证据仅证明该原摘要链成功、重启后可只读恢复，没有重发。

未重启dev链、重部署或领币；沿用已核对源码debug服务及编译Local／精确SPKI例外。继续调查主动取消失败点，正常CA和完整试用仍未通过，进度39/98。

后续已定位保留档案实际运行旧worker（未含取消处理），通过CDP执行源码与磁盘哈希证明；新worker加载及原摘要只读恢复核验见[定位日志](./20261004-worker-cache-cancellation.md)。此前失败不作为新版代码的故障结论，新版提交后主动取消仍待独立验收。
