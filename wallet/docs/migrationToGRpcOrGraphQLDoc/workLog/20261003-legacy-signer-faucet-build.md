# NET-08／09、RPC-25／26：旧依赖清理与完整构建

日期：2026-10-03。继续既定 Task，未将局部验证记成全部功能验收。

## 变更

修复 useBlockedObjectList 从 core 根入口引入整个旧 hooks 依赖的问题，改用实际使用的 useAppsBackend 独立入口。删除无消费的 WalletSigner／QredoSigner 执行类；Qredo 可选账户／API／事件保留，事件及错误移至 shared/qredo-events，消息结果类型移至 shared/messaging/signed-results。不宣称 Qredo 执行已支持。删除无消费的旧交易金额／收款人／质押识别 helpers 和旧 TransactionSummary 对象卡片，Coin.ts 仅保留实际使用的类型常量。

当前 SDK decodeRtdPrivateKey 返回 scheme，修复字符串私钥导入误读 schema；旧对象 schema 仍须显式 legacySupport。三种密钥算法及旧格式显式开关新增4项测试。

Faucet 从 V1任务轮询迁为 requestRtdFromFaucetV2。当前本地 SDK faucet/faucet.ts 与 rtd/crates/rtd-faucet/src/server.rs 一致：POST /v2/gas，成功响应 status=Success、coins_sent。不再请求已移除的任务状态接口；测试工具同样使用 V2。单币金额须为正安全整数，再以 bigint 精确汇总和展示；缺币或已失精度拒绝成功。mutation key 包含实际 host／recipient，不自动重试发币。现有 API_ENV 到 RTD faucet 地址映射尚未纳入 NetworkProfile，留 NET-06／07继续处理，不能据此宣称自定义网络支持完整。

## 验证与证据

- `20261003-legacy-signer-cleanup-tests.log`：相关7文件47项通过。
- `20261003-faucet-v2-tests.log`：Faucet响应金额9项、真实React hook3项通过，含不回退端点／不重试／实际recipient。
- `20261003-wallet-full-tests.log`：全量 Vitest 74文件821/821通过。
- `20261003-faucet-v2-typecheck.log`：完整 tsconfig 检查退出0，无诊断；此前91条已清零。
- `20261003-modern-wallet-build-dev.log`：开发版Webpack通过。
- `20261003-modern-wallet-build-prod.log`：生产版Webpack通过，3条体积建议警告；background 1.34 MiB、ui.js 3.34 MiB，非运行验收。
- `../evidence/20261003-production-bundle-audit.json`：四个JS入口及source map哈希与静态检查。未发现jsonRpc／dapp-kit模块、旧Signer模块或旧链RPC方法字面量；ui/background中的jsonrpc文本来自@metamask/utils的数据校验工具，不是链请求器。本检查不是所有动态行为的证明。
- `../evidence/20261003-post-signer-inventory.json`：源扫描wallet与共享core。wallet生产命中为新ledgerService.getObject和hasOwnProperty.call；共享core旧hooks仍供其它应用使用，未被该钱包产物加载。保留未消费代码不扩改其它应用。
- `git diff --check`通过。

## 限制与后续

本次未启动dev、未部署合约、未执行Chrome扩展验收或实链转账。NET-09还包含依赖清单／modern demo，RPC-26与REL-01仍需完整清单审计，不勾选。OriginByte、profile配置、dApp原签名恢复／自动唤醒等缺口继续推进。保持14/98完成，当前不可试用。
