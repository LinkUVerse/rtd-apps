# 取消故障定位：保留档案运行旧 service worker

2026-10-04。推进TX-09／TX-10，未勾选整体完成。

## 根因证据

此前实际提交后主动取消失败，磁盘background.js已更新，但保留Chromium档案仍运行旧脚本。新增inspect-extension-worker.cjs通过CDP Debugger.getScriptSource读取**实际执行的**后台脚本，而不是fetch磁盘URL。

20261004-retained-worker-source.json：运行中SHA256 cfd3c81ca32f0ea723c84ca8c837f3d20d63d0c5efc651ec108775f815f37910，与早期prepared-wire构建相同；磁盘SHA256 7ff6153da72044c2ff95cea58c81fe89f2b629ee4ee2538b3c6ad9cd243178b8。实际脚本不含cancel-transaction-request，磁盘脚本包含。因此旧后台无法处理新页面发来的取消请求；此前测试不能当作新版主动取消的验收或失败结论。原失败日志保留。

首次chrome.runtime.reload后等待新worker事件超时（20261004-retained-worker-reload.json），未清理profile／账户／journal。进程终止后再次启动并读取执行源码：20261004-retained-worker-reload-final.json，before.matchesDisk=true，当前脚本已更新且包含取消处理；该次不需再次重载。不能把首次等待超时伪装为成功。

新增scripts/lib/current-extension-worker.cjs做源码对比，不一致则runtime.reload并打开扩展UI唤醒MV3后台，再要求源码一致。已接入保留档案故障测试和普通账户测试启动流程。当前一致路径经真实运行验证；新增“重载后主动唤醒”分支尚未用另一份旧脚本再次强制验证，不能宣称覆盖该分支。

## 当前后台对旧记录的只读恢复

20261004-dapp-abort-current-worker-recovery.log明确先输出运行源码与磁盘一致证据，再锁定账户恢复原摘要tzHhXCPSvrJ95g4u6mWqtdU2cmZm6tULha6Vrq812KT；原成功回执cp267087仍在，三条原journal保留，dispatch0／simulation0，进程退出0。没有重发原交易，fault-abort-01一次性尝试仍禁止初始化。

## 模拟中主动取消实际通过

新增scripts/lib/test-dapp-cancel-simulation.cjs，RTD_TEST_DAPP_CANCEL_SIMULATION=1启用；在新建隔离档案中对两个现代方法分别暂扣首个真实SimulateTransaction响应，不点击批准。调用方取消后实际批准窗口关闭、批准记录0、action-result不存在，fetch信号以StaleWalletSessionError取消而不是TimeoutError。20261004-dapp-cancel-simulation.log通过，进程退出0；整轮6次模拟、0次执行。没有改变签名／提交产物，仅增加测试。精确SPKI例外、编译Local边界仍适用；不代表正常CA／权限或签名中／提交后取消。

## 后续

基于已证明更新的worker对独立新请求验收提交后主动取消，必须先确认全部旧记录已终态，沿用保留profile，批准前写新的不可覆盖尝试记录。绝不能删除旧marker或用新目录重发旧bytes。当前任务39/98（39.8%），trial_ready=false。
