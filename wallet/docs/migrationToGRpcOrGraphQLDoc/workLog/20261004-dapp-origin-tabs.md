# TX-10 真实扩展来源与跨标签页隔离

2026-10-04，实际Chromium测试退出0，TX-10整体仍开放。

新增scripts/lib/test-dapp-origin-tabs.cjs，由RTD_TEST_DAPP_ORIGIN_TABS=1启用。沿用当前构建与独立临时浏览器档案；同一个静态demo服务的两张页面测试同源，另开不同端口HTTP服务形成真实不同origin。没有修改业务代码。

## 实际六项检查

1. 两张同源新页面在点击connect前，Wallet Standard自动恢复此前授权账户。
2. 不同origin通过真实window消息桥发起get-account和sign-message-request，payload内伪造已授权origin；后台按浏览器来源拒绝，错误为required permissions，无签名批准窗口。
3. 不同origin发送disconnect-app并伪造已授权origin，返回done后检查实际storage.local：合法来源权限仍保留。
4. 捕获A页公开发送的原消息ID；同源B页用该ID发cancel-transaction-request，再发送get-network作为同port已处理屏障。A批准窗口及其后台记录均保留，证明取消按连接隔离而非仅按origin或请求ID。
5. B另开自己的交易批准；确认后台同时存在两条记录后，取消B只关闭B窗口并移除B记录，A仍保留。
6. A导航about:blank导致原内容连接断开，A批准窗口关闭，最终批准记录为空。

测试未点击任何交易批准。20261004-dapp-origin-tabs.log：passed=true，4次正式模拟、0次ExecuteTransaction。原正常消息签名、缺账户／缺交易chain拒绝、PersonalMessage可选chain、错链／错误账户拒绝、重载授权和disconnect持久撤权也通过。CDP在两次启动确认worker源码与当前磁盘一致（6ecd54be74ab975e9fe31e749de97c1a50fe2acc1490e2bd7fdb3e5f142a7471）。

使用编译Local和精确SPKI例外，未验正常CA或自定义权限；本轮业务代码未改，不重复全量／构建。之前1297全量、后加4项后台测试等证据范围不扩大。没有领币、部署、重启dev链或触碰保留的四条执行journal。

跨frame、完整网络／账户切换事件和请求期间切换的动态矩阵仍需继续；不能将这六项单独算作全部TX-10或QA-A18完成。总体40/98（40.8%），trial_ready=false。
