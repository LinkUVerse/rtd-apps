# TRY-02 普通新建助记词账户的实际扩展验证

## 通过范围

`RTD_TEST_CREATE_MNEMONIC=1` 从实际“添加账户→创建新的助记词账户”进入密码／条款设置，生成随机测试账户。在备份页面点击显隐控件，仅在测试进程内读取助记词并使用 SDK 派生密钥，核对地址与后台实际新建 mnemonic-derived 账户一致；隐藏后词组 DOM 移除，未确认备份时“打开钱包”为 disabled button，勾选确认后才变为可用链接。

随后验证后台锁定、错误密码保持锁定、正确密码解锁、整浏览器重启后的账户 ID／地址保留和默认锁定、重启后再次解锁。实际钱包切换编译 Local profile，通过 GraphQL 读取该随机地址空余额，认证快照 S=84589，digest=6aNCajFx4WEkVA9rHVEivxc99h2BZDGSFVZktdToevUf；HTTP200、无 GraphQL errors、余额条目0。

最终 `20261004-new-mnemonic-lifecycle-retry.log` 退出0，0模拟／0提交。随机助记词和密码均未写入证据，未截图、未输出页面正文；测试结束后删除专用临时浏览器档案，不改已有保留执行档案。本账户未领取资金或发送交易。

## 测试修正与构建范围

首轮 `20261004-new-mnemonic-lifecycle.log` 在备份页失败：测试错误地期待禁用状态为带 aria-disabled 的链接；实际 ButtonOrLink 在禁用时渲染原生 disabled button。按照实际组件修正测试后通过，没有为测试改变产品行为。首轮日志仅记录阶段与错误类型，不含助记词。

本轮只变更测试工具，未重编译业务产物。实际 UI SHA256 `9601f6ee38696c6527d162932030d5777cfc4607e85299e1037aaf5eaa28aa62`，background SHA256 `3a85161e43e83c72be22dc6808dd20feea7b021ad3605c65bf31d7e45263eb10`；启动和重启读取实际 worker 源码与磁盘一致。上一批 38 项／tsc／Webpack 不冒充本轮重新执行。

## 尚未覆盖

这是创建、备份地址一致性及本地加密账户重启验证，不是从助记词导入到另一个钱包的恢复验证。本轮新建账户未注资，未验证该新账户发送；普通导入测试账户的真实币发送证据见 `20261004-background-recovery-coalescing.md`。真实链上失败尚待，模拟失败不能替代。精确 dev SPKI 例外和内置 Local 配置不代表正常 CA／自定义配置通过。TRY-02保持开放，40/98，trial_ready=false。
