# TRY-03／TX-01 增量：实际扩展交易只签名与跨进程字节修复

2026-10-04。上一轮连接／PersonalMessage 完成后，继续验证交易 sign-only。完整 TRY-03 仍未完成，execute 与持久恢复另验；本轮不勾选。

## 真实链路暴露的问题与整改

1. Node 的同一交易准备成功，但实际扩展后台抛出 `Failed to execute 'fetch' on 'WorkerGlobalScope': Illegal invocation`。WalletTransactionReader 将原生 fetch 存为私有字段后当实例方法调用，导致接收对象成为 reader。构造时将默认原生 fetch 绑定 globalThis；注入测试 transport 保持原合同。新增原生接收对象约束测试先失败，修复后通过。
2. 修复 fetch 后批准页出现 `First argument to DataView constructor must be an ArrayBuffer`。后台准备返回包含 effects／transaction／commandResults BCS 的 Uint8Array，经 Chrome runtime JSON 传输后丢失字节类型，页面 receiptObjectEffects 无法解析。
3. 新增 PreparedTransactionWire：准备结果其余字符串字段保持原样，simulation 单独编码为 JSON 字符串，字节用保留标签的规范 Base64 表示；UI 收到后严格恢复 Uint8Array，拒绝畸形标签、非规范编码、未知 simulation kind 和超限消息。只在 prepareDappTransactionResponse 边界编码／解码，后台批准凭据和固定 bytes 不经过 UI 重建。原始未编码旧响应拒绝处理，需整体重载扩展产物。
4. 新增 JSON 往返、真实模拟结果经过字节编码后仍能解析 effects、BackgroundClient 解码及 fetch 接收对象回归测试。Chrome 官方明确其消息使用 JSON 而非 structured clone：[消息序列化文档](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#serialization)。

## 环境与资金

- 重新核对指定 rtd HEAD、tracked binary diff、rtd／rtd-node debug SHA，全部匹配既有构建证据：`20261004-dapp-sign-debug-recheck.json`。既有环境没有重启或换二进制，没有重新部署合约。
- 使用前一轮公开确定性 Ed25519 测试账户 0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da。核对 Fullnode H0 后仅请求一次本地 V2 faucet；先以 wx 写入尝试记录，响应已保存 `20261004-dapp-sign-faucet.json`。faucet 资金交易为 7xG16m94MytifBP265jWGwjgqfRt61wJEZXXdiFkadGu。
- 没有导入 deployer 或其他已有 pending 账户，没有更换 journal 绕过 pending。返回交易签名不落盘、不输出，不执行。
- 仍为 profile03 revision2 编译 Local 与精确 dev leaf SPKI 例外。正常 CA、自定义 host permission 未验。

## 最终实际扩展结果

`20261004-dapp-sign-only-wire.log`，退出 0，Chromium 153.0.8010.12。

- 实际私钥导入／密码设置、连接风险提示和账户授权。
- dApp 通过 modern Kit 请求 Sign transaction，扩展显示正式模拟预览，批准按钮启用后点击批准。
- 批准页显示摘要与返回 bytes 重算摘要一致：4JWEnPbmzCZrxhaWQbPuX4ndajyVKjGzR6BxhujuXGue。
- 返回 bytes 的 TransactionData Intent 签名用该账户公钥验证成功；sender 一致，命令为 SplitCoins／TransferObjects，gas budget 5988000。
- 捕获 5 次 SimulateTransaction、0 次 ExecuteTransaction。faucet 的外部资金交易不属于钱包 dispatch；不能写成本轮链上完全无交易。
- PersonalMessage 批准验签、用户拒绝无结果、伪造账户被后台权限拒绝、Disconnect，以及浏览器重启后账户锁定／重新解锁均通过。
- 本轮 GraphQL S66554 对该账户仍返回0余额；Fullnode 已有 faucet Coin，实际只签名准备成功。这验证准备链路使用实时 Fullnode，未将滞后 GraphQL 余额当成签名资金准入。

UI SHA256：d22896c9e2db6360793c59b920e12084beb73edf7deb05d891fcd4fb16135102。
Background SHA256：cfd3c81ca32f0ea723c84ca8c837f3d20d63d0c5efc651ec108775f815f37910。

## 验证与证据边界

- 最终全量117文件1253项：`20261004-prepared-wire-full-tests-final.log`；钱包类型检查退出0：`20261004-prepared-wire-typecheck-final.log`。
- 最终业务代码开发版 Webpack成功54573ms，Local配置保留：`20261004-prepared-wire-build.log`；新四入口静态审计通过：`20261004-prepared-wire-static-audit.json`。随后仅新增／修改测试及测试脚本、文档，无业务代码变化。
- `20261004-dapp-direct-preparation.json` 是 Node 实际 Fullnode 只读准备，不能替代扩展证据。
- `20261004-dapp-sign-only.log`／`-diagnostic.log` 保留 fetch 失败；`-fixed.log` 保留 DataView失败；`20261004-worker-fetch-before.log` 保留回归测试先失败。首次 prepared-wire 全量有1项旧 bridge fixture 不符合新wire合同，更新为 JSON编码夹具后最终全量通过；失败日志保留。
- 实际交易 execute／超时恢复／赞助／混合资金完整矩阵仍待。TRY-03、TX-01保持未勾选，总体36/98，trial_ready=false。
