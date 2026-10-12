# NET-09 现代 dApp Kit 示例与安装闭环

日期：2026-10-04。NET-09 的清单、lock、解析、Webpack 与 modern demo 编码／构建验证完成；真实扩展交易另归 TX／TRY。

## 权威依据与实现

[官方 dApp Kit 迁移说明](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/dapp-kit)明确拆分 core／React，使用 createDAppKit、DAppKitProvider 和动作方法。本次还核对只读 RTD SDK 的 `packages/dapp-kit/packages/dapp-kit-core/src/core/actions/sign-and-execute-transaction.ts`：优先调用现代 Wallet Standard 签名执行功能，并解码钱包返回的原始 transaction／effects；demo 不自行绕过钱包广播。

钱包 devDependencies 增加 `rtd-dapp-kit-core` 1.6.30、`rtd-dapp-kit-react` 2.1.32 的本地 file 来源；root overrides 指向真实嵌套目录。扩展内部没有接入 Kit。demo 使用 Kit 连接、切换账户、断开、签名、执行及 personal message；保留错误账户开关，通过现代 Wallet Standard 直接送至钱包，避免只测试 Kit 本地账户登记表。结果／错误可见，操作期间禁止重复点击。

必须显式提供 `VITE_RTD_NETWORK` 和 `VITE_RTD_GRPC_URL`；不默认公共节点，不自动连接，不注入 Slush／burner。仅允许 HTTPS 或回环 HTTP，不允许 URL 用户凭证和 fragment。地址必须是真实浏览器 gRPC-Web 服务，native gRPC 端口不等价。无配置时显示配置要求。custom 的 unknown 名称不代替钱包完整 H0 身份核验。说明见 `wallet/tests/demo-app/README.md`。

## 依赖与验证

- [冻结安装](./20261004-modern-kit-install.log)最终退出 0，2m13.6s；35 项包，网络超时由原进程重试成功。使用 `--filter rtd-wallet... --frozen-lockfile --ignore-scripts`。初始目录拼写错误日志与安装未完成时过早执行检查的失败日志均保留，后续检查在安装完成后重跑。
- [锁文件核对](../evidence/20261004-modern-kit-lock-audit.json)：其他应用 importers 与 wallet 原有选择均保持，仅增加两个 modern Kit devDependencies。脚本按白名单更新 SDK／Kit／Slush／window-wallet 共享依赖记录，保留旧 Kit 记录，没有把其他应用变成空目录包。正式锁文件 SHA256：`e8749b7355efa452a4af4e0de14b98d02ef5f522c8e6d0411182b9d75fc02dff`。
- [完整类型检查](./20261004-modern-kit-types-verified.log)退出 0。
- [Kit 接入测试](./20261004-modern-kit-tests-complete.log)：3 项通过；覆盖配置拒绝、连接／现代签名／现代执行原始 BCS 结果解析／消息／断开、无连接拒绝；断言没有旧 feature 调用和 fetch。使用公开确定性 fixture，不能视为实链签名执行。
- [钱包完整测试](./20261004-modern-kit-wallet-tests.log)：87 文件／976 项通过。
- [demo 构建](./20261004-modern-kit-demo-build-complete.log)通过，包含体积提示；[扩展生产构建](./20261004-modern-kit-extension-build.log)43230 ms 通过，3 项既有体积／性能警告。
- 真实 Chrome 153.0.8010.12：[无配置提示](../evidence/20261004-modern-demo-unconfigured.json)、[配置后渲染与未连接拒绝](../evidence/20261004-modern-demo-configured.json)均通过，无 pageerror、无外部请求。配置后构建使用 example.test 占位且无请求，不代表可用服务。
- [demo sourcemap 审计](../evidence/20261004-modern-demo-bundle.json)：212 个源模块，无 SDK JSON-RPC／旧 Kit 模块。

## 范围

以上验证在隔离安装副本完成，源码／清单／锁文件已同步正式仓库；正式 node_modules 尚未重装，不能声称正式工作目录已有现代 Kit 安装产物。其他应用兼容性在 NET-10；全部安装脚本／空缓存重建不在本次证据范围。旧 Playwright 环境仍需改为用户指定部署脚本，真实钱包连接／审批／交易／恢复和公开发布门禁没有因此通过。NET-09 勾选，总体 18/98，可试用仍否。
