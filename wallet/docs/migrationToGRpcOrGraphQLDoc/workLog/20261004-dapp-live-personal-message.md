# TRY-03／TX-10 增量：真实扩展连接与 PersonalMessage

2026-10-04。本项推进真实 dApp 链路，不勾选完整 TRY-03／TX-10；交易 sign-only、execute、多窗口与网络切换等仍待验收。

## 发现与修复

1. Modern demo 可构建但实际白屏：钱包 React 19.2.3 与链接 SDK Kit 的 React 19.2.8 同时进入产物，触发 useContext null。demo Vite 增加 react／react-dom dedupe，实际页面恢复；不安装或替换依赖。
2. 真正完成连接后，Kit 拒绝 PersonalMessage，因为 WalletStandardInterface 账户仅声明 signAndExecuteTransaction，尽管钱包全局已声明三项现代能力。后台现在根据账户类型提供 features：mnemonic-derived／imported 提供 signTransaction、signAndExecuteTransaction、signPersonalMessage；Qredo／zkLogin／未知类型不提供签名能力。页面透传该列表，缺失字段按只读处理，网络事件保留能力列表。实际授权检查仍在后台，能力声明不代替权限。
3. demo README 更正 custom profile 的 walletStandardChain 与 Local 的 rtd:localnet，不能再笼统写 custom 一律 unknown。

## 官方对标

- 官方 PersonalMessage action 使用 getAccountFeature 对账户能力和 chain 做校验：[源码](https://github.com/MystenLabs/ts-sdks/blob/main/packages/dapp-kit/packages/dapp-kit-core/src/core/actions/sign-personal-message.ts)。
- Slush 的 ReadonlyWalletAccount 同时列出现代三种签名能力，并明确空列表为只读：[源码](https://github.com/MystenLabs/ts-sdks/blob/main/packages/slush-wallet/src/wallet/index.ts)。
- [官方 action 文档](https://sdk.mystenlabs.com/dapp-kit/actions/sign-personal-message)。
- 本次抓取为 upstream main 快照，非固定 commit；保存 20261004-dapp-official-source-{1,2}.txt 与 URL／SHA256 清单 20261004-dapp-official-sources.json。RTD 使用对应 rtd 命名空间；保留只读账户遵循本项目迁移范围。

## 实际 Chromium 证据

最终日志：`20261004-dapp-live-final.log`，脚本退出 0。Chromium 153.0.8010.12，独立临时 profile、公开确定性 Ed25519 测试密钥；没有使用 deployer 或既有 pending 账户。

- 私钥导入／密码设置走扩展 UI；Local 余额通过实际钱包请求读取 S65163，摘要 H9YTeuEbvtvy3Hy9MpeS6pXieUDkGjkEXFhPKaE5YSN5，0余额。
- 真实本地 HTTP dApp，经风险继续提示、账户连接授权，Kit 得到对应账户。
- 点击 Sign message，经扩展弹窗显示 Test message 和签名批准；返回 bytes 与原消息一致，SDK 使用该账户公钥验证 PersonalMessage 签名成功。日志不输出签名、私钥、密码。
- 第二次消息选择拒绝，dApp 收到 rejection 且无签名结果。
- 伪造账户直接调用现代 Wallet Standard feature，后台返回确定的 required permissions 拒绝；无结果。
- Disconnect 后账户列表消失。随后锁定、错误密码拒绝、正确解锁、整个浏览器重启及再次解锁通过；锁定相关动作为真实 UI-background 命令。
- ExecuteTransaction 请求计数 0。不是交易只签名／交易执行验收，不处理或重发已有 pending。

环境沿用指定源码 debug 的既有服务（上轮已重验哈希，本批没有重启或更换服务）。dist 保持 profile03 revision2 编译到 Local，仅使用精确 dev leaf SPKI 例外；不代表正常 CA 信任或自定义 host permission UI 验收。

UI SHA256：5561a991003452e70c0d4ae978f1bc6a513647e3a4e44225456620b085799147。
Background SHA256：882232de8422aeea4e7211db1a952138c1b6210d0b89fb1fd3f4e30ec64e2157。

## 检查与失败记录

- 定向 3 文件 23 项通过：账户能力、网络事件保留／缺失只读、后台 PersonalMessage（`20261004-dapp-account-features-tests.log`）。
- 全量 116 文件 1246 项通过（`20261004-dapp-account-features-full-tests.log`）。
- 钱包 tsc 退出 0；开发 Webpack 成功 65918ms，带 Local profile；新产物四入口静态审计通过（同前缀 typecheck／build，`20261004-dapp-static-audit.json`）。
- Demo 1 文件 3 项通过、独立 Vite 构建通过（`20261004-dapp-demo-tests.log`、`20261004-dapp-live-demo-build-final.log`）。不是 Explorer 或 production 构建验收。
- 初次 discovery／render 日志记录白屏；连接诊断记录 headless 默认窗口坐标超出屏幕，测试用固定 800×600、0,0 修正；sign-diagnostic 记录账户缺失 PersonalMessage 能力。失败保留，不能覆盖为通过。

复现脚本：`scripts/test-extension-account-lifecycle.cjs` + `scripts/lib/test-dapp-personal-message.cjs`；设置 RTD_TEST_DAPP_DIR 为明确 localnet demo 产物目录、RTD_TEST_LOCAL_PROFILE=1、RTD_TEST_DEV_CERT 为既有 dev leaf。禁止与 RTD_TEST_DEV_KEYSTORE 同用。临时 HTTP 服务和浏览器均清理。

总体仍 36/98，trial_ready=false；本轮优先消除已重现的真实 dApp 阻断，不把部分链路通过计为整个 TRY-03 完成。
