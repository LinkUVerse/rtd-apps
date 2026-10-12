# TX-04／TX-07／TX-12：提交窗口关闭后的持久互斥

日期：2026-10-04。新增原生 Chromium 故障组合验证，未修改生产执行代码、未发送真实链交易。

## 场景与实现

扩展 `scripts/test-execution-journal.cjs`，使用实际 WalletExecutionCoordinator、BrowserExecutionLock、WalletExecutionJournal、WalletReadSession 和原生 IndexedDB／Web Locks。模拟、签名和网络 reader 为测试替身，交易 bytes 来自公开确定性测试 fixture，不使用 dev 账户。

1. 第二页面启动实际协调器，完成 strict pending commit 后停留于不返回的 dispatch。另一页面检查同链同账户锁确实不可取得。
2. 关闭提交页面，让 Chromium 自动释放其 Web Lock。
3. 接替页面更换 profile 别名、revision、端点、requestId、originRef，并提供另一笔合法 bytes／digest。相同完整 H0／generation／账户仍命中旧 pending。
4. 接替页面的模拟、签名、验签、提交计数全部为 0，返回旧摘要。只读恢复仅查询旧摘要，lookup 返回 null 后仍保留旧 pending。

此验证补齐“锁释放”和“持久 pending”之间的组合故障边界；关闭的是网页测试上下文，不是扩展 popup。既有独立 service worker 停止重启测试继续通过，但没有把两个场景冒充完整扩展 worker 实链恢复。

## 验证

- `node --check scripts/test-execution-journal.cjs`：通过。
- `node scripts/test-execution-journal.cjs`：Chromium 153.0.8010.12，14 项通过，见 [原生验证输出](./20261004-closed-owner-journal.log)。
- `node_modules/.bin/vitest run src/shared/rpc/execution-coordinator.test.ts src/background/execution.test.ts src/background/dapp-execution.test.ts src/background/execution-recovery-wakeup.test.ts`：4 文件 68 项通过，见 [定向测试](./20261004-closed-owner-tests.log)。
- `../node_modules/.bin/tsc --noEmit -p ../core/tsconfig.json`：仍失败，17 条诊断，见 [core 输出](./20261004-closed-owner-core-typecheck.log)。13 个旧 Kit 模块缺失、1 个 Kiosk objectOptions 契约错误、3 个 APY 隐式 any。检查 Explorer 源码确认它仍使用这些 core 旧 hooks，因此没有直接把公共 hooks 替换为钱包专用 Provider 或添加类型声明掩盖错误。

## 本轮边界与下一项

Mac 仍锁定，原生可见 Chrome 扩展验收没有继续。五分钟 dApp token 是消费凭据期限，本轮没有无依据将它改成已接受执行的总时限。

TX-04／07／12、TRY-01 保持未完成，总体仍 34/98。本轮仅改测试 harness 与文档，无生产源码变更，因此未重复 SDK／钱包构建。下一步继续解决共享 core 与 Explorer 的旧 Kit 消费契约，并补全扩展实际多窗口／worker 恢复与同链回执验证。
