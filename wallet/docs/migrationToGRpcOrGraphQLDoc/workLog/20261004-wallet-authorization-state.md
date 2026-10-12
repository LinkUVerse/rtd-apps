# TX-10 授权账户恢复与迟到状态保护

2026-10-04，TX-10部分完成，不代替全部跨tab／origin／切网矩阵。

## 问题与修复

[Sui官方Wallet Standard说明](https://docs.sui.io/onchain-finance/asset-custody/wallets/wallet-standard)要求钱包在加载时恢复已有授权账户，撤销后不继续公布账户。此前实例只在connect时获取账户；无权限时提前return会残留旧账户，迟到get-account还可能覆盖已收到的撤权事件。disconnect发送消息后立即返回，未确认后台权限删除。

注册钱包后调用initialize，以已有权限静默读取网络／账户，不请求新授权。公开账户刷新用本地状态版本与刷新序号保护：更新事件或新刷新使旧响应失效，旧查询不可恢复撤销账户；无权限或当前刷新失败清空账户。事件后补静默读取后台最新状态，避免事件打断初始化后永远漏掉快照。

standard:disconnect等待后台done确认；ContentScriptConnection仅按浏览器提供的origin删除权限，持久删除完成后才回复。页面清空账户并发change；更新的刷新结果不会被较旧disconnect回复覆盖。后台签名／执行权限复核仍独立保留，页面账户列表不是授权凭据。

## 验证

- 2文件20项初步通过：20261004-wallet-authorization-state-tests.log。
- 最终业务修改后全量121文件1297项通过：20261004-wallet-authorization-state-full-tests.log。
- 随后增加后台disconnect等待真实删除Promise／不相信payload origin测试，该文件4项通过：20261004-disconnect-ack-tests.log；这个后加用例不算入之前1297项全量。
- 最终钱包tsc、dev Webpack成功50396ms、新四入口静态审计通过，日志wallet-authorization-state-typecheck-final／build／static-audit。
- Demo构建通过，增加只读查看注册钱包accounts按钮；不自动赋权，仅读取Wallet Standard当前数组。
- 实际扩展20261004-wallet-authorization-state-extension.log退出0：授权后刷新dApp，未点击connect先观察Wallet Standard accounts已有真实账户；再次connect没有新窗口。之后disconnect返回，实际storage.local.permissions中该origin记录不存在；再次刷新accounts为空。消息签名、错链／缺账户／缺交易chain拒绝、可选消息chain、省略时验签、错误账户拒绝仍通过。整轮0模拟／0提交。
- 实际worker源码经CDP在两次启动均与磁盘一致：SHA256 6ecd54be74ab975e9fe31e749de97c1a50fe2acc1490e2bd7fdb3e5f142a7471。UI未变。编译Local与精确SPKI例外，不代表正常CA／自定义权限。

本轮没有签名或提交交易，没有领币／部署／重启dev链，没有改动保留的四条执行journal。实际读取／消息测试使用独立临时档案。TX-09完成状态不变，TX-10／QA-A18仍开放，整体40/98（40.8%），trial_ready=false。
