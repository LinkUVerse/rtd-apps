# NET-10 共享 core 明确 SDK 合同入口（2026-10-04）

## 已实施

检查 core 现行导出及 explorer 消费者后，确认旧 JSON-RPC 数据结构仍供浏览器应用使用；钱包实际使用独立 rpc 模块。SDK 2.31.3 已将旧 DTO 和传输实现放入 jsonRpc 入口。将 core 的旧 DTO 导入改为明确的 type-only rtd-typescript/jsonRpc，SentryHttpTransport 继承真实导出的 JsonRpcHTTPTransport，Kiosk 旧查询函数类型改为真实 RtdJsonRpcClient。未把旧 DTO 伪装成现代 RtdClientTypes，未向钱包新增旧查询器。

core tsconfig 的 moduleResolution 从 node 改为 bundler，使用当前 SDK 的 package exports；保留 include 全 src，没有排除失败文件或跳过其类型错误。

## 证据

- core 完整类型检查仍失败：原配置74条、原 bundler 对照72条；本次19条。当前日志 20261004-core-explicit-contract-typecheck.log。旧入口缺失导出引起的错误已消除。
- 剩余主要为 rtd-dapp-kit 无法解析（配置指向的本地目录已没有 package.json）、Kiosk 的旧 Network 枚举与 objectOptions 已移除，以及 Kit 缺失造成的隐式 any。尚未修复，不能称 core 构建通过。
- 钱包完整 TypeScript 检查通过：20261004-wallet-after-core-typecheck.log。
- 20261004-core-consumers.json 记录字面量导入：wallet 210处、explorer 54处。此清单包含测试和同模块多处使用，是静态导入位置数量，不是独立消费者数量，也不是完整动态依赖证明。

- 修复后的钱包开发 Webpack 构建成功，四个新入口产物静态审计通过：20261004-core-compat-wallet-webpack.log、20261004-core-compat-built-audit.json。未证明 explorer 构建或浏览器动态请求通过。

## 下一步

继续处理旧 Kit／Kiosk 消费者的真实兼容方案并验证 explorer 构建；不能通过补空声明、any、删除导出或缩小 tsconfig 冒充兼容。NET-10、TRY-01保留未勾选。
