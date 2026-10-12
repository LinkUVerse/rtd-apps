# TX-10 切网取消批准窗口与账户事件

## 问题与修复

真实扩展测试发现：执行 session 已监听切网，但未批准请求的窗口生命周期只监听 caller abort／port disconnect。Local 请求尚未批准时切到 devNet，旧批准窗口没有关闭。Transactions.requestApproval 现在在任何异步创建之前监听 NetworkEnv.changed，取消整个批准生命周期；finally 注销监听、撤销准备令牌、删除临时请求并关闭窗口。持久执行 journal 不删除。

测试 demo 增加 standard:events 观察器，显式读取 ReadonlyWalletAccount 的 address／chains getter。主浏览器脚本传入已有 UI-background set-network 命令，独立 network-switch helper 覆盖 sign-only／execute／PersonalMessage 三个入口。

## 验证

- 定向2文件20项通过，包括初始化 profile 查询未返回时切网、不生成迟到批准窗口，以及已有批准窗口关闭／清理／监听注销。
- 全量121文件1300项通过：20261004-network-approval-full-tests.log。
- 钱包完整 tsc 退出0：20261004-network-approval-typecheck.log。
- 保留 Local profile revision2 的 dev Webpack 构建成功（68850ms），新产物四入口静态审计通过。
- 实际 Chromium 三个入口 Local→devNet→Local：批准窗口关闭、临时请求清空、调用返回拒绝且无签名结果、账户 chains 与 change 事件同步；之后正常 PersonalMessage、断开撤权和浏览器重启账户流程通过。
- 最终日志20261004-dapp-network-switch-final.log，进程退出0，模拟0／提交0，未点击交易批准。CDP实际后台源码与磁盘一致，SHA256 a962022a43d34d77a08ba5f5921a81f9aac100ae73f0d6ee1052070b9fc87ca5。

## 失败证据与边界

保留初轮20261004-dapp-network-switch.log和diagnostic.log（旧窗口不关闭）；修复后的fixed.log在事件JSON观察阶段TypeError，原因是测试对getter账户直接序列化，已显式投影字段后重跑，不能把失败批算通过。

测试使用新临时浏览器档案与编译Local配置，devNet未配置服务，只验证本地切网状态及取消；仍使用精确dev SPKI例外，未验正常CA。未触碰保留执行档案／journal，未重发任何旧摘要。此批不代表提交后切网恢复、切账户或iframe矩阵完成。TX-10继续开放，总计40/98。
