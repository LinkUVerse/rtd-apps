# TX-10 真实模拟期间账户锁定

## 实施与结果

复用实际worker模拟故障注入测试，新增RTD_TEST_DAPP_LOCK_SIMULATION=1模式。分别针对sign-only与execute，在第一条真实SimulateTransaction响应HTTP200已接收且响应体已读完后，受控扣留响应，等待原请求AbortSignal。

经实际UI-background命令锁定账户，两个入口都触发transport abort，reason为StaleWalletSessionError而非TimeoutError。锁定时没有签名结果，未点击交易批准。批准窗口保持，允许点击真实解锁按钮、通过密码弹窗解锁，再由原调用方取消。最终窗口关闭、临时请求清空、无结果。

20261004-dapp-lock-simulation.log退出0，两例passed，整体6次模拟／0次提交。后续正常PersonalMessage验签、拒绝、撤权、浏览器重启账户流程通过。CDP后台源码匹配dist SHA256 6e451aaea41dd3545141e8f0d8d5948cdac89273097cfa9d1183e69ea653c565。

## 证据边界

这是实际node响应受控扣留期间的锁定，不是自然网络故障，也不是密码学签名函数已运行或ExecuteTransaction已派发期间的锁定。6次模拟包含批准流程其它模拟，并不表示6笔执行。未读取或修改保留执行档案。沿用编译Local与精确dev SPKI例外，不代表正常CA验收。

本轮只修改测试脚本，无业务代码／构建变化，沿用上一批1305项测试、tsc、构建与静态审计，不记成重跑。TX-10和提交后恢复矩阵仍未完成，总计40/98。
