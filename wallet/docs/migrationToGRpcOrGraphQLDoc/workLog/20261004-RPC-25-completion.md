# RPC-25 外部服务支持边界核验

日期：2026-10-04。范围为钱包当前实际支持状态，不宣称第三方远程服务已完成 RTD 对接。

## 变更与合同

- QredoAccount 保留已有记录、账户来源、解锁与远程只读查询；没有本地 signData/canSign 实现。withExecutionAccount 在创建读取会话和交易模拟前拒绝该账户；dApp 准备／交易签名／执行沿用该授权入口，PersonalMessage 另行以 isSigningAccount 校验。
- 删除无调用者的 QredoAPI.createTransaction 和 PostTransactionParams，使共享远程 API 不再暴露签名／广播提交。getWallets、getTransactions、getTransaction 及访问令牌更新保留；远程状态不转换为本地 journal 的执行成功。
- 删除转账页遗留 Qredo 审批弹窗、事件总线和忽略审批特殊异常分支，保留只读查询所需网络名映射。Qredo 账户徽标明确只读，转账页显示支持提示且不启动本地交易恢复。
- 独立提取无副作用的 URL 查询串 helper，避免 Qredo API 通过 shared/utils barrel 拉入 UI hooks 与实验开关初始化。首轮新测试因该依赖的浏览器 getManifest 缺失失败；已通过实际依赖隔离修复，未增加掩盖依赖的 mock。
- Ledger 创建请求／表单／允许路由中不存在实现的分支已清理；法币入口以本地 RTD 验证门槛拒绝远程开关和缓存启用。见 [上一批日志](./20261004-external-support.md)。

## 验证

- 4 个定向测试文件、19 项通过：Qredo GET 列表／详情实际 fetch 行为、无远程创建方法、非签名账户拒绝（模拟／签名／journal／dispatch／lookup 均未执行）、批准页与法币缓存门槛。输出：20261004-qredo-boundary-tests.log。
- 修改后全量钱包 Vitest：93 文件、1013 项通过，输出：20261004-qredo-full-regression.log。
- 完整钱包 tsc --noEmit -p tsconfig.json 退出 0，输出：20261004-qredo-boundary-typecheck.log。
- NODE_ENV=development Webpack 退出 0；四入口 source-map 审计通过，无旧 Kit 或 JSON-RPC requester 命中。输出：20261004-qredo-boundary-webpack.log、20261004-qredo-boundary-built-audit.json。

## 边界

RPC-25 的编码和支持状态核验完成。上述是单元／集成 fixture、类型与构建证据，不是 Qredo 远程在线对接、Ledger 硬件或法币结算验收；当前不支持的交易服务不会标记为可用。Chrome UI 操作、正式 CA 接入与完整试用仍由 TRY／QA 跟踪。
