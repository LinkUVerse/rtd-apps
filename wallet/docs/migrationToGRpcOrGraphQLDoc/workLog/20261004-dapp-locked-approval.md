# TX-10 真实批准页解锁验证

## 实施与证据

新增scripts/lib/test-dapp-locked-approval.cjs及RTD_TEST_DAPP_LOCKED_APPROVAL=1开关。主脚本通过闭包提供密码填表回调，不在日志输出密码。新临时浏览器档案使用公开测试账户，未触碰保留执行档案。

分别在PersonalMessage／sign-only／execute请求前通过实际UI-background命令锁定账户并确认isLocked=true；打开真实批准页面，点击“解锁后批准”或“解锁账户”，在真实密码弹窗填入密码并点击解锁。后台isLocked变为false，批准窗口保持、临时请求仍只有一个。

PersonalMessage随后点击签名，返回bytes匹配Test message且SDK验签通过。sign-only和execute解锁后由调用方取消，窗口关闭、临时记录归零、无交易批准。后续正常消息验签／拒绝／撤权，以及整个浏览器重启后锁定和解锁同样通过。

日志20261004-dapp-locked-approval.log，进程退出0，模拟0／提交0；CDP后台源码匹配当前dist，SHA256 6e451aaea41dd3545141e8f0d8d5948cdac89273097cfa9d1183e69ea653c565。

## 边界

本轮仅新增测试脚本，没有业务代码或构建变更；沿用上一批1305项全量、tsc／构建／静态审计，不记成再次运行。锁定动作和重启后解锁是UI-background命令；批准页解锁是实际按钮和密码表单。未测试批准页错误密码／所有账户类型、签名或提交等待期间锁定，以及提交后切网／切账户恢复。仍使用编译Local和精确dev SPKI例外，不算正常CA验收。TX-10继续开放，总计40/98。
