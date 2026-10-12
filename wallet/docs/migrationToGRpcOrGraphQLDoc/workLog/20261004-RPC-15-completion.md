# RPC-15 完成核验：正式模拟、gas 和预览模型

2026-10-04。本项按接口编码／页面接入范围验收；资金模式和NFT／质押业务执行各归RPC-04／13／22，完整授权矩阵归TX，不扩大本项结论。

## 逐项证据

| 原要求 | 当前实现与核验 |
| --- | --- |
| 替代旧dryRun | wallet/src及可达core调用已迁移；源搜索无dryRunTransactionBlock／devInspectTransactionBlock调用。钱包没有采用跳过检查的inspection来放行交易。 |
| 解析依赖与gas | WalletTransactionReader私有SDK gRPC resolver；解析响应要求明确成功、epoch、sender、gas owner／price／budget／payment；复制Transaction数据而不复制可执行插件。 |
| 最终正式模拟 | build完成后仅以最终BCS调用SimulateTransaction，checks=ENABLED、doGasSelection=false、readMask transaction／command_outputs；单独simulate也不重建gas。 |
| 结果合同 | 原生transaction bytes逐字节、本地digest、effects digest/status/epoch/gas/BCS重编码、结构化transaction重编码均核对；允许官方模拟响应省略外层digest，但不放松effects和最终bytes绑定。prepare拒绝FailedTransaction，独立simulate保留失败联合类型，模拟失败不能当已提交链失败。 |
| 会话和错误 | 绑定H0／readSession／sender，前后链身份核验；deadline和signal贯穿SDK内部读取，内部unary有界，status/trailer仍生效；迟到和切会话结果拒绝。 |
| 币发送 | SendTokenForm→prepareCoinTransfer→领域prepare；预览后revalidateCoinTransfer只对批准bytes模拟，不重新选币或替换批准。 |
| NFT | TransferNFTForm→prepareNftTransfer；所有权／引用准备后同一领域prepare，确认revalidateNftTransfer检查同bytes和会话。路由业务实链验收仍归RPC-22／23。 |
| 质押 | StakingCard→prepareStaking→prepare；revalidateStaking复核同bytes和sender。活跃仓位／奖励实链范围仍归RPC-11／13。 |
| dApp预检 | 后台prepareDappTransaction保存固定bytes批准凭据；DappPreparationContext使GasFees、SimulationPreview、TransactionDetails消费共享结果；失败或过期批准不可提交。 |
| Chrome消息边界 | PreparedTransactionWire把simulation的Uint8Array以规范Base64编码，UI恢复后解析effects，修复实际DataView崩溃；默认fetch绑定globalThis，修复实际worker Illegal invocation。 |
| 实际链路 | TRY-03实际扩展只签名／execute均显示预览摘要且与返回bytes相同，验签和effects通过；TRY-04同链超时／重启原摘要恢复另有证据。 |

## 权威对标

[Sui JSON-RPC迁移指南](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration)将dryRun映射为simulateTransaction；devInspect的checksEnabled:false属于跳过检查的inspection，不能用于付款批准。该区分与双方现有方案一致。

[官方模拟源码](https://raw.githubusercontent.com/MystenLabs/sui/main/crates/sui-rpc-api/src/grpc/v2/transaction_execution_service/simulate/mod.rs)对已给BCS不做缺字段解析；do_gas_selection与checks共同控制gas选择，响应按mask生成transaction／command_outputs。本钱包显式固定最终bytes并关闭重新选gas，是批准一致性要求，不把SDK构建时的初始模拟当成最终批准。

此次main快照保存为20261004-RPC-15-official-simulate.rs及URL／SHA256清单20261004-RPC-15-official-source.json；不是固定commit，也不假定最新Sui协议功能已经部署到本地RTD。

## 验证结果

- 11文件185项定向通过，退出0：`20261004-RPC-15-audit-tests.log`。涵盖reader、三类准备器、wire、共享hook、预览／有效期／批准页及后台准备和只签名。
- 重新运行当前产物四入口静态审计通过：`20261004-RPC-15-static-audit.json`。静态审计不是动态全流量证明。
- 当前业务代码未变；完整117文件1253项、tsc、开发构建沿用20261004-prepared-wire最终日志，不称本批重跑。
- 实际扩展：[TRY-03](./20261004-TRY-03-completion.md)、[TRY-04](./20261004-TRY-04-completion.md)。这两项不替代全部NFT／混合资金／赞助和权限故障矩阵。

本轮同时修正双方交易文档中仍将TRY-03／04写成未验的历史状态；保留原阶段事实并明确新证据覆盖范围。RPC-15勾选，总体39/98，trial_ready=false。
