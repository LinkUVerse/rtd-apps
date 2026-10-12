# NET-06／TRY-02／TRY-05：编译 Local profile 与真实扩展余额读取

日期：2026-10-04。

## 指定环境复核

`20261004-trial-debug-recheck.json`：RTD 当前 HEAD、完整 tracked diff SHA-256、rtd／rtd-node debug 二进制 SHA-256 均匹配用户指定源码构建证据。未启动替代节点、未重建链、未发交易或重试 pending。

使用指定合约仓库脚本此前生成的 profile03 revision2，实际钱包 reader 从认证 GraphQL 获取 S62270 的拥有对象，见 `20261004-trial-assets-live.json`／`.log`。该读取再次验证同链 H0；不是全量服务运行健康审计。

## 构建路径修复

Webpack dotenv 原先未启用 systemvars，命令行 WALLET_NETWORK_PROFILES 会被 `.env.defaults` 中的 `{}` 覆盖。现在开启 `systemvars: true`，让构建进程环境值优先于文件默认值。此行为也适用于其他被源码引用的环境变量；不能把秘密放进会被浏览器源码引用的配置。未打印进程完整环境或将其写入日志。

构建时只在进程环境传入 `{local: profile03}`，没有修改 `.env` 或将端点硬编码入生产源码。当前 dist 是含该 Local profile 的开发产物，不是先前默认未配置的产物，来源及配置哈希记录在 `20261004-trial-build-profile.json`。

## 实际扩展证据

`test-extension-account-lifecycle.cjs` 新增可选 Local profile 模式：真实 UI 导入公开测试私钥和设置密码后，通过实际 UI-background set-network 消息切换 Local；观察由生产页面产生的 balances 请求，检查 HTTP 200、无非空 errors、快照、返回地址与测试 SDK 地址相同、balances.nodes 是数组。

最终 `20261004-trial-extension-assets.log`：Chromium 153.0.8010.12，快照 S62524，digest `EnWr8EgGZpKwhZNorTxsFqkWLCCoD4eX9hNWxc5ZKAqP`，0 条余额。随后锁定／错误密码拒绝／正确解锁／完整浏览器重启锁定／再次解锁全部通过，无页面错误。输出记录 UI 与 background bundle SHA-256。

首次响应断言把空 errors 数组误判为失败；保留 `20261004-trial-extension-assets-before-response-check.log`，最终改为检查不存在非空 errors，并增强地址和快照核验。

## 验证与边界

- `20261004-trial-profile-build.log`：开发版 Webpack 成功，45528 ms。
- `20261004-trial-profile-static-audit.json`：最新四入口静态审计通过。
- `20261004-trial-profile-tests.log`：profile 定向回归 2 文件 43 项通过。
- 测试脚本语法检查通过。

这里只使用编译时审定 profile 和精确开发证书 SPKI 例外，没有绕过生产代码的身份／快照校验。它不证明正常 CA 信任、自定义网络权限弹窗或自定义配置保存；这些仍归 ENV-07／QA-A19。0 余额不证明有资产账户显示、发送、分页、dApp 授权或链上恢复。没有本轮新部署或链上写入。TRY-02／05 保持未完成，总进度不变。

下一步：在保留现有 pending 的前提下，接入有资产的受控 dev 账户，推进普通发送和 dApp 实际扩展验证。
