# TX-10 切账户批准生命周期

## 修复

批准生命周期原先只监听网络／连接／调用方取消，切账户在签名阶段才被发现。现Transactions.requestApproval在异步初始化前监听accountsChanged和activeAccountChanged，取消旧批准、撤销准备令牌、删除临时请求并关闭窗口，finally注销监听；持久journal保留。

不在批准等待阶段因accountStatusChanged一概取消：批准页支持用户先解锁再签名。真正进入准备／签名／执行的会话仍监听状态变更，并在签名前后核验当前账户／selected／isLocked和来源权限。新测试确保单独解锁状态通知不关闭尚未批准请求。

## 验证

- 首轮定向2文件23项通过，但第一轮全量有2失败，日志account-approval-full-tests.log保留。并发模拟窗口关闭测试在关闭observable订阅之前发射事件，导致超时和遗留请求污染后续测试。改为等待两个Subject.observed再关闭，不延长超时或放宽业务断言。
- 最终全量122文件1305项通过；钱包完整tsc退出0；Local profile revision2 dev构建59013ms成功；四入口静态审计通过。证据前缀20261004-account-approval-*，以final后缀为最终结果。
- 真实Chromium在新临时档案创建第二个公开测试账户（三十二字节8），不资助、不提交。sign-only／execute／PersonalMessage三种待批准请求切到第二账户后，窗口关闭、临时记录删除、调用拒绝且无结果。dApp授权账户仍只有第一账户，第二账户直接请求消息签名被后台权限拒绝且不弹窗。
- 测试切回原账户并删除临时第二账户，随后正常消息签名／拒绝／撤权／整浏览器重启通过。日志20261004-dapp-account-switch.log退出0。后台CDP源码和磁盘一致SHA256 6e451aaea41dd3545141e8f0d8d5948cdac89273097cfa9d1183e69ea653c565。

## 边界

第二账户导入、切换和删除通过实际扩展UI-background命令，不冒充按钮操作验收。测试未批准交易、未产生提交；精确dev SPKI例外不是正常CA验收。已有保留执行档案／journal未触碰。尚未验证提交后的切网／切账户恢复、所有锁定／解锁UI场景，TX-10保持开放，总体40/98。
