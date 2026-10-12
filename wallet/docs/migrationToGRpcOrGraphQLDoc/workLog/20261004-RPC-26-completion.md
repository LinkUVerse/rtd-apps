# RPC-26：21 个旧方法与间接依赖闭环核查

2026-10-04。按接口编码及依赖闭包验收，不替代 RPC-03／04／11／13／14／22／23 的实链业务、TRY 的可试用门槛或 QA 的完整动态流量验证。

## 逐项落点

下表第一列沿用 08 的旧线协议方法；同名现代 Core 方法不是旧 JSON-RPC 调用。文件均相对 wallet/src/shared/rpc。

| 旧方法 | 当前实现与服务 |
| --- | --- |
| rtd_getObject | asset-reader GraphQL 固定快照对象；fullnode-reader Ledger/GetObject 负责新鲜所有权；archive-object-reader 指定历史版本 |
| rtd_multiGetObjects | asset-reader GraphQL multiGetObjects；逐项 Error 与位置保留，Kiosk 读取通过相同领域接口 |
| rtdx_getOwnedObjects | asset-reader 拥有对象完整分页；core/rpc/asset-hooks 类型筛选，NFT、buynlarge 与 Kiosk 消费新接口 |
| rtdx_getCoins | fullnode-reader State/ListOwnedObjects 按 Coin<T> 读取与完整分页；发送准备器校验引用和金额 |
| rtdx_getAllBalances | asset-reader GraphQL address.balances 同快照完整集合 |
| rtdx_getBalance | asset-reader 固定快照余额展示；Fullnode State/GetBalance 用于发送前新鲜复核 |
| rtdx_getCoinMetadata | asset-reader typed GraphQL 元数据，缺失、依赖失败区分；core/rpc/coin 注入 |
| rtdx_getDynamicFields | asset-reader + dynamic-fields GraphQL 动态字段／动态对象列表和点查，BCS name 与 child 分开 |
| rtd_getTransactionBlock | ledger-reader 新 Ledger/GetTransaction，裁剪证明下按同 digest 查询归档 |
| rtd_executeTransactionBlock | execution-reader TransactionExecutionService/ExecuteTransaction；统一 coordinator 一次 dispatch |
| rtd_dryRunTransactionBlock | transaction-reader SimulateTransaction，最终 BCS、checks ENABLED 与 gas 选择边界校验 |
| rtdx_queryTransactionBlocks | indexed-lists GraphQL transactions 显式 sentAddress；账户收支全集另用 account-history-reader，不冒充等价 ToAddress；zkLogin 旧查询已退出可执行账户链路 |
| rtdx_queryEvents | indexed-lists GraphQL events 显式类型／模块／发送人筛选，空扫描页继续及完整游标检查 |
| rtdx_resolveNameServiceAddress | name-reader 同链 registry、GraphQL 名称数据、期限及 Fullnode 进度复核，发送时重新确认 |
| rtdx_resolveNameServiceNames | name-reader 默认反向名称展示；不虚构旧全部名称列表的无损兼容 |
| rtdx_getLatestRtdSystemState | staking-reader 固定快照当前 0x5 及 inner BCS，组合系统／验证者状态 |
| rtdx_getStakes | staking-reader 全部 StakedRtd、pool、epoch 与汇率组合 StakePosition；无旧 DTO 转发 |
| rtdx_getValidatorsApy | staking-reader／staking-rates 历史汇率算法，样本、safe mode 与未知覆盖合同 |
| rtd_getLatestCheckpointSequenceNumber | fullnode-reader 经 H0 验证的 Ledger/GetServiceInfo.checkpointHeight；不新增 JSON-RPC |
| rtdx_getReferenceGasPrice | 私有 RtdGrpcClient 的 Core 读取 Ledger/GetEpoch.reference_gas_price，构建器仅接收该客户端 |
| rtd_getNormalizedMoveFunction | 同一 gRPC Core 的 MovePackageService/GetFunction；MVR URL 禁用，链包地址显式配置 |

## 构建器与 Kiosk 间接请求

transaction-reader 的 tx.build 仅收到私有 RtdGrpcClient，其 transport 绑定 profile Fullnode 入口、共享读取预算、64 次解析上限、AbortSignal、deadline 与前后 H0 复核。模拟客户端禁止除 SimulateTransaction 外的执行方法，禁止 streaming；执行使用单独的 execution-reader。SDK getReferenceGasPrice／getMoveFunction 源码分别落到 GetEpoch／GetFunction。此核查不声称每个构建都必然触发二者。

kiosk-reader 只使用新领域 AssetReader 和 KioskOwnerCap 类型导入；framework／PersonalKiosk 转移按已核对 ABI 组装显式 package Move 调用，最终走统一 Fullnode 准备器。没有额外 KioskClient 或隐藏的旧 HTTP 客户端。OriginByte 分支通过 originbyte-kiosk／originbyte-transfer 和同一准备器，未借用 Sui 默认 package。RPC-22 的实链非空发现与钱包转出仍未验收。

## 当前产物与扫描范围

新增 scripts/audit-wallet-wire-closure.cjs，从 08 主表／附录提取并断言 21／18、39 个互异方法，同时检查 Sui 拼写。对四个 emitted source map 的 AST 扫描旧方法字符串、静态模板、jsonrpc 对象属性和旧客户端导入，并输出 SDK／共享 core／应用模块清单及 JS、map 哈希。未把动态字符串分析或活流量当成已经证明。

- ui 1995 个模块，background 1018，content-script 58，dapp-interface 82；39 个方法字面量命中均为 0。
- ui／background 各发现一个 @metamask/utils/dist/json.cjs。逐项核对为协议结构校验 schema，包含 jsonrpc 属性但没有 RTD 方法或 fetch／XHR／WebSocket 调用；按精确模块路径和内容哈希记账，不把它当网络迁移残留，也不放行其它模块的相同属性。
- 旧 Provider／Kit／requester 四入口审计通过；实际安装 SDK 2.31.3 及依赖范围检查通过。
- 本轮没有重建业务产物。当前 UI SHA 为 1206db6d3bc6cba25418de38c5d2e476e6f4a41e20aa397086ddfe168b63cacf，background 为 d11c911981cc817408cea3374cf534728429b801dd46c3ef86d6eca0f092acc0，与上次读取错误修复构建一致。
- 18 个旧 SDK 未用方法仍保留文档附录，不新增对应业务接口；现代 gRPC/GetCheckpoint 等同语义调用不改变旧 JSON-RPC 范围计数。

## 验证与完成边界

扫描工具 4 项测试通过，验证旧字符串／模板命中、注释与 Move 名称排除、协议属性发现和解析失败拒绝。12 文件 353 项领域测试通过，覆盖资产、动态字段、Fullnode、近期／归档交易、模拟／执行、索引列表、名称、质押、Kiosk、NFT 准备和 OriginByte。

证据：20261004-wire-closure-tool-tests.log、20261004-wire-closure-domain-tests.log、20261004-wire-closure-ast.json、20261004-wire-closure-provider.json、20261004-wire-closure-installed-sdk.json。本项编码／闭包核查完成；不表示当前 GraphQL 重启恢复窗口已结束，不表示所有功能或完整迁移目标完成。
