# NET-10／TRY-01：共享 core 客户端注入与构建阻断整改

日期：2026-10-04。

## 问题与变更

共享 core 完整类型检查原有 17 条诊断：13 个旧 Kit import 不可解析、1 个已被新 Kiosk SDK 删除的 objectOptions、3 个 APY 级联隐式 any。钱包已使用 `core/src/rpc` 的领域 hooks，但 Explorer 仍消费 core 根导出的旧 hooks，直接替换成 WalletRpcContext 会破坏其 Provider 合同。

新增 `core/src/rpc/ExplorerRpcContext.ts`，仅为既有 Explorer 消费提供显式注入的 RtdJsonRpcClient／network；core 不构造默认网络客户端。13 处旧 Kit import 改为内部 context hook，系统状态查询按 network 缓存。钱包继续使用 WalletRpcContext，未接入 Explorer context。

Explorer 主 Layout 及五个现有 RtdClientProvider story 均加入 ExplorerRpcBridge，把原 Kit 管理的 client／network 传入 core。旧 Kit 的所有权留在 Explorer。core manifest 和 workspace／core 独立 lock importer 删除旧 Kit 直接依赖，未重新安装依赖；历史 lock snapshots 保留。本轮不证明清洁安装。

删除 Kiosk 查询已废弃的 objectOptions；当前 SDK `query/client-utils.ts/getAllObjects` 的 include 已固定 content、previousTransaction、display，`withObjects: true` 保留。

钱包产物审计新增 ExplorerRpcContext 不可达断言，避免后续通过共享导出把 Explorer 客户端带回钱包。

## 验证

- 共享 core 完整类型检查成功，0 诊断：`20261004-core-injection-typecheck.log`。
- 钱包完整类型检查成功：`20261004-core-injection-wallet-typecheck.log`。
- 新增 2 项注入测试：缺少 Provider 显式失败、原对象 hook 调用所注入客户端、系统状态按网络隔离。`20261004-core-injection-tests.log`。
- 钱包全量 114 文件 1238 项成功：`20261004-core-injection-full-tests.log`。
- 开发版 Webpack 成功，48265 ms：`20261004-core-injection-build.log`。
- 新产物四入口审计成功，Explorer context 不可达：`20261004-core-injection-static-audit.json`。
- Explorer 完整类型检查仍失败：改前 133 条、改后 111 条；分别见 `20261004-core-injection-explorer-before.log`／`20261004-core-injection-explorer-after.log`。去掉诊断行号比较后，新增位置仅为 Bridge 的同一个旧 Kit 模块缺失；未声称 Explorer 构建或 UI 恢复。其余 SDK 导出和旧 Kit 根接入仍归 NET-10。

## 任务边界

TRY-01 的完整钱包／共享 core 类型检查与 Webpack 开发构建门槛完成，予以勾选。NET-10 继续开放：Explorer 旧 Kit 根接入、完整其他消费者回归尚未完成。没有跑生产版构建，没有动态抓包或扩展交互验收。可试用门槛仍未达到；不是迁移总目标完成。

本轮未修改或启动 dev 环境、未发送交易。后续优先继续接口与核心扩展实链验证。
