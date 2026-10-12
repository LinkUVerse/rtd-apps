# NET-11：SDK内部解析与模拟并发预算

2026-10-04。已将WalletTransactionReader传输层unary调用接入WalletReadSession四个运行／64个等待名额，与其他已接入reader共享。内部身份查询、交易解析和正式模拟均受限制，保留原64次RPC操作预算、H0核验、最终固定bytes模拟及取消合同。无execute重试或额外提交。

## 实现

新增budgeted-unary，使用标准UnaryCall封装延迟启动并等待底层整体结果，名额覆盖正文、状态和trailers；各字段Promise均观察拒绝，避免只读取response时出现未处理拒绝。响应头也延迟至完整调用结束才暴露。钱包显式依赖@protobuf-ts/runtime-rpc 2.11.1，与现有SDK所用版本一致；manifest与pnpm锁同步。

`pnpm add --offline --ignore-scripts`移除了本地SDK链接，并重建core依赖链接，初次类型检查／测试因此失败。按当前file依赖manifest恢复钱包5个SDK链接，并将core的rtd-typescript／rtd-kiosk对齐同源，消除两份Transaction私有类型冲突。失败日志保留为`typecheck-before-links`、`tests-before-links`、`typecheck-before-core-alignment`。本轮证明修复后的现有安装；不把本地链接修复冒充新隔离安装验收。安装未下载包，保留原有peer警告。

## 验证

- `20261004-simulation-budget-tests.log`：2文件43项通过。新增六个并行真实SDK prepare峰值4且全部完成、队列占满时关闭会话零fetch。原有模拟失败、gRPC状态、取消、固定bytes和解析验证继续通过。
- `20261004-simulation-budget-full-regression.log`：111文件1187项通过。
- `20261004-simulation-budget-typecheck.log`：完整钱包tsc退出0。
- `20261004-simulation-budget-build.log`：最终webpack成功。
- `20261004-simulation-budget-static-audit.json`：最终四入口产物静态审计通过。
- `20261004-simulation-budget-installed-sdk.json`：现有安装SDK版本范围及实际模块解析审计通过。

以上为本地代码／SDK协议夹具验证，不含新实链或Chrome验收。执行／恢复专用reader、独立准入和跨窗口预算尚待核验，NET-11未勾选；总体34/98，可试用门槛未达到。双方方案及Task、totalProgress已同步。
